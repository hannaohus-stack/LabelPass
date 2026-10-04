/**
 * 결과 (시안 app_result_v1.0) — 결제 완료 · 항목별 결과 · 파일 받기 · 표시사항 텍스트 / 결제 실패
 * 수정본 재검토 카드 · 영수증 버튼은 기능 준비 전까지 숨김
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/lp/AppHeader'
import type { Ingredient } from '../utils/parsing'
import { analyzeRegulations, type Metadata } from './ReviewResult'
import type { CreatorData } from './creator/types'
import { TEST_MODE } from './Payment'
import { recordPayment } from '../lib/supabase'
import { CATEGORY_OFFICIAL } from '../utils/tierUtils'
import { trackPurchase } from '../lib/analytics'
import {
  PAYMENT_STATE_KEY, SERVICE, countResults, fmtDate, kindOf, readSession, saveReviewOnce, whyText,
  type PaymentState, type ResultKind, type ServiceType,
} from '../lib/review'

const RECYCLING_FILE_MAP: Record<string, string> = {
  '페트(PET)': '/recycling/plastic-pet.svg',
  '고밀도 폴리에틸렌(HDPE)': '/recycling/plastic-hdpe.svg',
  '폴리염화비닐(PVC)': '/recycling/plastic-other.svg',
  '저밀도 폴리에틸렌(LDPE)': '/recycling/plastic-ldpe.svg',
  '폴리프로필렌(PP)': '/recycling/plastic-pp.svg',
  '폴리스티렌(PS)': '/recycling/plastic-ps.svg',
  '기타 플라스틱': '/recycling/plastic-other.svg',
  '유리': '/recycling/glass.svg',
  '철': '/recycling/can-steel.svg',
  '알루미늄': '/recycling/can-aluminum.svg',
  '종이팩': '/recycling/paper-pack.svg',
  '멸균팩': '/recycling/paper-pack2.svg',
  '도포·첩합류(빨간)': '/recycling/laminated-red.svg',
  '도포·첩합류(검정)': '/recycling/laminated-black.svg',
  '골판지': '/recycling/paper.svg',
  '일반 종이': '/recycling/paper.svg',
  '비닐류': '/recycling/vinyl-ldpe.svg',
  '스티로폼': '/recycling/plastic-ps.svg',
}


function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

function safeFilenamePart(value: string): string {
  return (value || 'product').replace(/[\s/\\]/g, '_')
}

// ZIP 내부 파일명용 ASCII slug — 한글 제거, 영문/숫자만 유지
// 정책: 고객-facing 개별 파일명은 한글 유지, ZIP 내부는 ASCII 호환
const MATERIAL_SLUG: Record<string, string> = {
  '유리': 'glass', '철': 'steel', '알루미늄': 'aluminum',
  '종이팩': 'paper-pack', '멸균팩': 'aseptic-pack',
  '골판지': 'cardboard', '일반 종이': 'paper', '비닐류': 'vinyl',
  '스티로폼': 'styrofoam', '기타 플라스틱': 'plastic-other',
  '도포·첩합류(빨간)': 'laminated-red', '도포·첩합류(검정)': 'laminated-black',
}

function toZipSlug(value: string): string {
  if (MATERIAL_SLUG[value]) return MATERIAL_SLUG[value]
  const paren = value.match(/\(([A-Za-z0-9-]+)\)/)
  if (paren) return paren[1].toLowerCase()
  const ascii = value.replace(/[^\x00-\x7F]+/g, '').trim().toLowerCase()
    .replace(/[\s_/\\()]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return ascii || 'file'
}

function createLabelPngBlob(data: CreatorData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const size = 3000
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      reject(new Error('Canvas를 생성할 수 없습니다.'))
      return
    }

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = '#0A0A0B'
    ctx.lineWidth = 10
    ctx.strokeRect(180, 180, size - 360, size - 360)

    ctx.fillStyle = '#002D72'
    ctx.fillRect(180, 180, size - 360, 260)

    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 72px system-ui, sans-serif'
    ctx.fillText('LABELPASS', 260, 340)

    ctx.fillStyle = '#0A0A0B'
    ctx.font = '700 190px system-ui, sans-serif'
    wrapCanvasText(ctx, data.productName || '제품명', 260, 760, size - 520, 220)

    ctx.font = '500 76px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(10,10,11,0.62)'
    ctx.fillText(`내용량 ${data.totalWeight || '-'}${data.unit || ''}`, 260, 1450)

    ctx.font = '500 58px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(10,10,11,0.52)'
    ctx.fillText((data.categories ?? []).join(' · ') || '식품 유형', 260, 1580)

    ctx.strokeStyle = 'rgba(10,10,11,0.18)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(260, 1760)
    ctx.lineTo(size - 260, 1760)
    ctx.stroke()

    ctx.font = '500 54px system-ui, sans-serif'
    ctx.fillStyle = '#0A0A0B'
    wrapCanvasText(
      ctx,
      data.ingredients.map(item => item.weight ? `${item.name} ${item.weight}g` : item.name).join(', ') || '원재료명 및 함량',
      260,
      1900,
      size - 520,
      82,
      5,
    )

    ctx.font = '500 48px system-ui, sans-serif'
    ctx.fillStyle = 'rgba(10,10,11,0.55)'
    ctx.fillText(`제조원 ${data.manufacturer || '-'}`, 260, 2600)
    ctx.fillText('본 이미지는 라벨패스 라벨 PNG 미리보기 산출물입니다.', 260, 2700)

    canvas.toBlob(blob => {
      if (blob) resolve(blob)
      else reject(new Error('PNG 파일을 생성할 수 없습니다.'))
    }, 'image/png')
  })
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
): void {
  const chars = Array.from(text)
  let line = ''
  let lines = 0

  for (const char of chars) {
    const testLine = line + char
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y)
      y += lineHeight
      lines += 1
      line = char
      if (lines >= maxLines - 1) break
    } else {
      line = testLine
    }
  }

  if (line && lines < maxLines) ctx.fillText(line, x, y)
}

function toCreatorData(ingredients: Ingredient[], metadata: Metadata): CreatorData {
  const expiryDate = metadata.expiryDays
    ? new Date(Date.now() + parseInt(metadata.expiryDays) * 86_400_000).toISOString().slice(0, 10)
    : ''

  return {
    productName: metadata.productName,
    categories: metadata.categories ?? [],
    businessType: (metadata.businessType as CreatorData['businessType']) || '',
    facilityType: (metadata.facilityType as CreatorData['facilityType']) || '',
    totalWeight: metadata.totalWeight,
    unit: metadata.unit === 'kg' ? 'g' : metadata.unit === 'L' ? 'mL' : metadata.unit,
    manufacturer: metadata.manufacturer,
    manufacturerAddress: metadata.manufacturerAddress ?? '',
    reportNumberStatus: metadata.reportNumberStatus ?? '',
    reportNumber: metadata.reportNumber ?? '',
    labelClaim: metadata.labelClaim ?? '',
    storage: metadata.storage,
    expiryDate,
    packagingMaterials: metadata.packagingMaterials ?? [],
    ingredients: ingredients.map(ing => ({
      id: ing.id,
      name: ing.name,
      origin: ing.origin ?? '',
      weight: ing.weight > 0 ? String(ing.weight) : '',
      isAllergen: ing.isAllergen,
      isComposite: ing.isComposite,
    })),
    detectedAllergens: [],
    detectedComposites: [],
    nutritionExempted: true,
    hasNutritionClaim: metadata.hasNutritionClaim ?? false,
    servingSize: '',
    servingUnit: 'g',
    calories: '',
    totalCarbs: '',
    sugar: '',
    totalFat: '',
    saturatedFat: '',
    transFat: '0',
    cholesterol: '',
    protein: '',
    sodium: '',
  }
}

// ─── 화면: 결과 (시안 app_result_v1.0) ────────────────────────────────────────

type CompleteState = PaymentState & {
  success?: boolean
  errorMessage?: string
  /** 마이페이지에서 다시 연 경우 — 저장·결제 기록을 다시 남기지 않음 */
  fromRecord?: boolean
  paidAt?: string
}

type Filter = 'all' | ResultKind
const TAG: Record<ResultKind, { cls: string; label: string }> = {
  need: { cls: 't-r', label: '수정 필요' },
  warn: { cls: 't-a', label: '확인 권장' },
  ok:   { cls: 't-g', label: '기준 충족' },
}

const DL_ICON = <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>

function copyText(value: string): Promise<boolean> {
  return navigator.clipboard.writeText(value).then(() => true).catch(() => {
    try {
      const el = document.createElement('textarea')
      el.value = value
      el.style.cssText = 'position:fixed;top:0;left:0;opacity:0;'
      document.body.appendChild(el)
      el.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(el)
      return ok
    } catch { return false }
  })
}

function labelText(m: Metadata, cd: CreatorData, ingredients: Ingredient[]): string {
  const sorted = [...ingredients].sort((a, b) => (b.weight || 0) - (a.weight || 0))
  const total = sorted.reduce((s, i) => s + (i.weight || 0), 0)
  const ing = sorted.map(i => {
    const pct = total > 0 && i === sorted[0] ? ` ${((i.weight / total) * 100).toFixed(1)}%` : ''
    return `${i.name}${i.origin ? `(${i.origin})` : ''}${pct}`
  }).join(', ')
  const allergens = cd.detectedAllergens?.length
    ? cd.detectedAllergens.map(a => a.name)
    : ingredients.filter(i => i.isAllergen).map(i => i.name)
  return [
    `제품명: ${m.productName}`,
    (m.categories ?? []).length ? `식품유형: ${(m.categories ?? []).map(c => CATEGORY_OFFICIAL[c] ?? c).join(', ')}` : '',
    m.totalWeight ? `내용량: ${m.totalWeight}${m.unit}` : '',
    ing ? `원재료명: ${ing}` : '',
    allergens.length ? `알레르기 유발물질: ${allergens.join(', ')} 함유` : '',
    cd.expiryDate ? `소비기한: ${cd.expiryDate.replace(/-/g, '.')}까지` : '',
    m.storage ? `보관방법: ${m.storage}` : '',
    m.manufacturer ? `제조원: ${m.manufacturer}${m.manufacturerAddress ? ` / ${m.manufacturerAddress}` : ''}` : '',
    m.reportNumber ? `품목보고번호: ${m.reportNumber}` : '',
  ].filter(Boolean).join('\n')
}

export default function PaymentComplete() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const paidRedirect = params.get('paid') === '1'
  const isFail = location.pathname.endsWith('/payment/fail') || params.get('paid') === '0'

  const routeState = location.state as CompleteState | null
  const [stored] = useState(() => readSession<PaymentState>(PAYMENT_STATE_KEY))
  const state: CompleteState | null = routeState ?? (stored ? { ...stored, success: paidRedirect && !isFail } : null)

  const results = useMemo(
    () => (state?.ingredients && state?.metadata ? analyzeRegulations(state.ingredients, state.metadata) : []),
    [state?.ingredients, state?.metadata],
  )
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const service: ServiceType = state?.service === 'basic' ? 'basic' : 'pro'
  const success = Boolean(state?.success) && !isFail

  useEffect(() => {
    if (!state || !success || state.fromRecord) return
    const realPayment = paidRedirect && !TEST_MODE
    saveReviewOnce(state, results, service, { paidAt: new Date().toISOString(), testMode: !realPayment })
    if (realPayment && state.reviewId) {
      trackPurchase(state.reviewId, SERVICE[service].price, 'KRW')
      recordPayment({ orderId: state.reviewId, amount: SERVICE[service].price, tier: SERVICE[service].tier, productName: state.metadata.productName })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.reviewId, success])

  if (!state?.ingredients || !state?.metadata) return <Navigate to="/dashboard" replace />

  const { ingredients, metadata } = state
  const reviewState = { ingredients, metadata, creatorData: state.creatorData, reviewId: state.reviewId, reviewedAt: state.reviewedAt }

  if (!success) {
    return (
      <div className="lp">
        <AppHeader mode="flow" current={3} />
        <main className="lp-page">
          <div className="lp-rs-fail">
            <div className="ck"><svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17" /></svg></div>
            <h1>결제를 완료하지 못했어요</h1>
            <p>{state.errorMessage || '결제창이 닫혔거나 승인이 거절됐어요. 결제된 금액은 없어요.'}<br />입력한 내용과 검토 결과는 그대로 남아 있어요.</p>
            <div className="acts">
              <button type="button" className="lp-btn lp-btn-blue" onClick={() => navigate('/payment', { state: { ...reviewState, service } })}>다시 결제하기</button>
              <button type="button" className="lp-btn lp-btn-line" onClick={() => navigate('/review', { state: reviewState })}>검토 결과로 돌아가기</button>
            </div>
            <small>계속 실패하면 <a href="/contact">문의</a>로 알려 주세요.</small>
          </div>
        </main>
      </div>
    )
  }

  const isPro = service === 'pro'
  const creatorData = state.creatorData ?? toCreatorData(ingredients, metadata)
  const paidTier = SERVICE[service].tier
  const counts = countResults(results)
  const issues = results.filter(r => r.status !== 'pass')
  const okItems = results.filter(r => r.status === 'pass')
  const firstIssue = issues[0]?.id
  const isOpen = (id: string) => open[id] ?? id === firstIssue
  const text = labelText(metadata, creatorData, ingredients)
  const paidAt = state.paidAt ?? new Date().toISOString()
  const keepUntil = new Date(new Date(paidAt).getTime() + 365 * 86_400_000).toISOString()

  const flash = (key: string) => { setCopied(key); setTimeout(() => setCopied(null), 1500) }
  const run = (key: string, fn: () => Promise<void>) => async () => {
    if (busy) return
    setBusy(key)
    try { await fn() } catch (e) {
      console.error('[PaymentComplete] 파일 생성 실패', key, e)
      alert('파일을 만드는 중 문제가 생겼어요. 다시 시도해 주세요.')
    } finally { setBusy(null) }
  }

  const dlLabelPDF = async () => { const { generateLabelPDF } = await import('../utils/generateLabelPDF'); await generateLabelPDF(creatorData) }
  const dlLabelPNG = async () => { downloadBlob(await createLabelPngBlob(creatorData), `LabelPass_라벨_${safeFilenamePart(metadata.productName)}.png`) }
  const dlReport = async () => { const { generateCertPDF } = await import('../utils/generateCertPDF'); await generateCertPDF(creatorData, paidTier) }
  const dlGuide = async () => { const { generateReportPDF } = await import('../utils/generateReportPDF'); await generateReportPDF(creatorData, paidTier) }
  const materials = (metadata.packagingMaterials ?? []).filter(mat => RECYCLING_FILE_MAP[mat])
  const dlRecycling = async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    await Promise.all(materials.map(async mat => {
      const res = await fetch(RECYCLING_FILE_MAP[mat])
      zip.file(`recycling_${toZipSlug(mat)}.svg`, await res.text())
    }))
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `LabelPass_분리배출마크_${safeFilenamePart(metadata.productName)}.zip`)
  }
  const dlAll = async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const safeName = safeFilenamePart(metadata.productName)
    const slug = safeName.replace(/[^\x00-\x7F]/g, '').replace(/^[-_]+|[-_]+$/g, '').toLowerCase() || 'product'
    const { createLabelPDFArtifact } = await import('../utils/generateLabelPDF')
    zip.file(`01_label_${slug}_${dateStr}.pdf`, (await createLabelPDFArtifact(creatorData)).blob)
    zip.file(`02_label_${slug}_${dateStr}.png`, await createLabelPngBlob(creatorData))
    zip.file(`03_label-text_${slug}.txt`, text)
    if (isPro) {
      const { createReportPDFArtifact } = await import('../utils/generateReportPDF')
      const { createCertPDFArtifact } = await import('../utils/generateCertPDF')
      zip.file(`04_review-report_${slug}_${dateStr}.pdf`, (await createCertPDFArtifact(creatorData, paidTier)).blob)
      zip.file(`05_report-guide_${slug}_${dateStr}.pdf`, (await createReportPDFArtifact(creatorData, paidTier)).blob)
      await Promise.all(materials.map(async mat => {
        const res = await fetch(RECYCLING_FILE_MAP[mat])
        zip.file(`recycling/recycling_${toZipSlug(mat)}.svg`, await res.text())
      }))
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `LabelPass_${isPro ? '전문' : '기본'}_${safeName}_${dateStr}.zip`)
  }

  const files: { key: string; i: string; t: string; s: string; fn: () => Promise<void>; pro?: boolean; off?: boolean }[] = [
    { key: 'pdf', i: 'PDF', t: '라벨 PDF', s: '인쇄용 · 디자이너 전달', fn: dlLabelPDF },
    { key: 'png', i: 'PNG', t: '라벨 PNG', s: '고해상도 이미지', fn: dlLabelPNG },
    { key: 'report', i: '리포트', t: '검토 리포트 PDF', s: `${results.length}개 항목 결과 · 근거 법령`, fn: dlReport, pro: true },
    { key: 'guide', i: '신고', t: '정부24 신고 가이드', s: '품목제조보고 입력 순서', fn: dlGuide, pro: true },
    {
      key: 'zip', i: 'ZIP', t: '분리배출 마크',
      s: materials.length ? `${materials.slice(0, 2).join(' · ')}${materials.length > 2 ? ` 외 ${materials.length - 2}` : ''} 도안` : '포장재 재질을 고르지 않았어요',
      fn: dlRecycling, pro: true, off: materials.length === 0,
    },
  ]

  const filters: { k: Filter; label: string; n: number }[] = [
    { k: 'all', label: '전체', n: results.length },
    { k: 'need', label: '수정 필요', n: counts.need },
    { k: 'warn', label: '확인 권장', n: counts.warn },
    { k: 'ok', label: '기준 충족', n: counts.ok },
  ]

  return (
    <div className="lp">
      <AppHeader mode="flow" current={4} />
      <main className="lp-page lp-page-pb">
        <div className="lp-rs-done">
          <div className="ck"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></div>
          <div>
            <h1>{state.fromRecord ? '검토 결과' : '결제가 완료됐어요'} · {SERVICE[service].name}</h1>
            <p>{[metadata.productName, state.reviewId, fmtDate(paidAt), `${fmtDate(keepUntil)}까지 마이페이지 보관`].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="acts">
            <Link className="lp-btn lp-btn-line lp-btn-sm" to="/dashboard">마이페이지</Link>
          </div>
        </div>

        <div className="lp-rs-grid">
          <div>
            <section className="lp-card" aria-labelledby="rs-h">
              <div className="lp-card-h">
                <h2 id="rs-h">항목별 검토 결과</h2>
                <div className="lp-flt" role="group" aria-label="결과 필터">
                  {filters.map(f => (
                    <button key={f.k} type="button" className={filter === f.k ? 'on' : ''} aria-pressed={filter === f.k} onClick={() => setFilter(f.k)}>
                      {f.label} {f.n}
                    </button>
                  ))}
                </div>
              </div>

              {issues.filter(r => filter === 'all' || filter === kindOf(r)).map(r => {
                const k = kindOf(r)
                const o = isOpen(r.id)
                const why = whyText(r.detail)
                return (
                  <div key={r.id} className={`lp-rs-it${o ? ' open' : ''}`}>
                    <button type="button" className="h" aria-expanded={o} onClick={() => setOpen(p => ({ ...p, [r.id]: !o }))}>
                      <span className="no">{String(results.indexOf(r) + 1).padStart(2, '0')}</span>
                      <span className={`lp-tag ${TAG[k].cls}`}>{TAG[k].label}</span>
                      <span className="t">{r.title}</span>
                      <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                    </button>
                    {o && (
                      <div className="b">
                        {why && <div className="row"><b>왜 확인이 필요한가요</b><p>{why}</p></div>}
                        {isPro ? (
                          <>
                            <div className="row"><b>이렇게 고치세요</b><p>{r.suggestion}</p></div>
                            <div className="row"><b>근거 · 참고</b>
                              <div className="law"><span>{r.regulation}</span>{r.penaltyRange && <span>과태료 참고 {r.penaltyRange}</span>}</div>
                            </div>
                          </>
                        ) : (
                          <div className="row lock">🔒 수정 방법 · 근거 법령 · 과태료는 전문 서비스에서 제공돼요.</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {(filter === 'all' || filter === 'ok') && okItems.length > 0 && (
                <details className="lp-rs-ok" open>
                  <summary><span className="lp-tag t-g">기준 충족</span>{okItems.length}개 항목은 입력한 정보 기준으로 기준을 충족했어요</summary>
                  <ul>{okItems.map(r => <li key={r.id}>{r.title}</li>)}</ul>
                </details>
              )}
              {filter !== 'all' && filter !== 'ok' && issues.every(r => kindOf(r) !== filter) && (
                <p className="lp-desc" style={{ margin: '8px 0 0' }}>해당하는 항목이 없어요.</p>
              )}
            </section>
            <div className="lp-notice">
              <span>ⓘ</span>
              <span>검토 결과는 입력한 정보를 바탕으로 한 <b>자율 점검 참고 자료</b>이며, 법적 적합성을 보증하지 않습니다. 과태료는 법령상 범위를 참고로 안내한 것이에요.</span>
            </div>
          </div>

          <aside className="lp-rs-side">
            <section className="lp-card" aria-labelledby="rs-dl">
              <div className="lp-card-h"><h2 id="rs-dl">파일 받기</h2></div>
              {files.filter(f => isPro || !f.pro).map(f => (
                <div key={f.key} className={`lp-dl${f.off ? ' off' : ''}`}>
                  <i>{f.i}</i>
                  <span>{f.t}<small>{f.s}</small></span>
                  <button type="button" aria-label={`${f.t} 받기`} disabled={f.off || busy !== null} onClick={run(f.key, f.fn)}>
                    {busy === f.key ? <span className="lp-spin" /> : DL_ICON}
                  </button>
                </div>
              ))}
              <button type="button" className="lp-btn lp-btn-blue lp-btn-block lp-rs-all" disabled={busy !== null} onClick={run('all', dlAll)}>
                {busy === 'all' ? <span className="lp-spin" /> : '전체 한 번에 받기 (ZIP)'}
              </button>
            </section>
            <section className="lp-card lp-rs-txt" aria-labelledby="rs-tx">
              <div className="lp-card-h">
                <h2 id="rs-tx">표시사항 텍스트</h2>
                <button type="button" className="lp-copy" onClick={() => copyText(text).then(ok => ok && flash('all'))}>
                  {copied === 'all' ? '복사됨 ✓' : '전체 복사'}
                </button>
              </div>
              <textarea readOnly value={text} aria-label="표시사항 텍스트" />
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
