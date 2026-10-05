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
import { RECYCLING_FILE_MAP, addRecyclingMarks } from '../utils/recycling'
import { buildSheetModel } from '../utils/labelSheet'
import { kstStamp, safePdfName } from '../utils/pdfCore'
import { trackPurchase, trackPurchaseMeta } from '../lib/analytics'
import {
  PAYMENT_STATE_KEY, SERVICE, countResults, fmtDate, kindOf, readSession, saveReviewOnce, whyText,
  type PaymentState, type ResultKind, type ServiceType,
} from '../lib/review'


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
      // Meta Pixel Purchase — 결제 확정 후 주문당 1회 (부가세 포함 결제금액)
      trackPurchaseMeta(SERVICE[service].price, state.reviewId)
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
  /** 결과물 공통 맥락 — 검토번호·검토일을 모든 파일에 같이 넣는다 */
  const ctx = { reviewId: state.reviewId, reviewedAt: state.reviewedAt, results, isPro }
  const text = buildSheetModel(creatorData, ctx).copyText
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

  const dlLabelPDF = async () => { const { generateLabelPDF } = await import('../utils/generateLabelPDF'); await generateLabelPDF(creatorData, ctx) }
  const dlLabelXlsx = async () => { const { createLabelXlsxBlob, labelXlsxFilename } = await import('../utils/generateLabelXlsx'); downloadBlob(await createLabelXlsxBlob(creatorData, ctx), labelXlsxFilename(creatorData)) }
  const dlReport = async () => { const { generateCertPDF } = await import('../utils/generateCertPDF'); await generateCertPDF(creatorData, paidTier, ctx) }
  const dlGuide = async () => { const { generateReportPDF } = await import('../utils/generateReportPDF'); await generateReportPDF(creatorData, paidTier, ctx) }
  const materials = (metadata.packagingMaterials ?? []).filter(mat => RECYCLING_FILE_MAP[mat])
  const safeName = safePdfName(metadata.productName)
  const dlRecycling = async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    await addRecyclingMarks(zip, '', materials)
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `LabelPass_분리배출마크_${safeName}_${kstStamp()}.zip`)
  }
  const dlAll = async () => {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    const stamp = kstStamp()
    const { createLabelPDFArtifact } = await import('../utils/generateLabelPDF')
    const { createLabelXlsxBlob } = await import('../utils/generateLabelXlsx')
    zip.file(`01_표시사항시트_${safeName}_${stamp}.pdf`, (await createLabelPDFArtifact(creatorData, ctx)).blob)
    zip.file(`02_표시사항시트_${safeName}_${stamp}.xlsx`, await createLabelXlsxBlob(creatorData, ctx))
    zip.file(`03_표시사항텍스트_${safeName}.txt`, text)
    if (isPro) {
      const { createReportPDFArtifact } = await import('../utils/generateReportPDF')
      const { createCertPDFArtifact } = await import('../utils/generateCertPDF')
      zip.file(`04_검토리포트_${safeName}_${stamp}.pdf`, (await createCertPDFArtifact(creatorData, paidTier, ctx)).blob)
      zip.file(`05_신고준비가이드_${safeName}_${stamp}.pdf`, (await createReportPDFArtifact(creatorData, paidTier, ctx)).blob)
      await addRecyclingMarks(zip, '06_분리배출마크/', materials)
    }
    downloadBlob(await zip.generateAsync({ type: 'blob' }), `LabelPass_${isPro ? '전문' : '기본'}_${safeName}_${stamp}.zip`)
  }

  const files: { key: string; i: string; t: string; s: string; fn: () => Promise<void>; pro?: boolean; off?: boolean }[] = [
    { key: 'pdf', i: 'PDF', t: '표시사항 시트 PDF', s: '항목별 정리 · 디자이너 전달용', fn: dlLabelPDF },
    { key: 'xlsx', i: '엑셀', t: '표시사항 시트 엑셀', s: '표시사항 · 영양성분 · 배합비 · 디자이너 전달용', fn: dlLabelXlsx },
    { key: 'report', i: '리포트', t: '검토 리포트 PDF', s: `${results.length}개 항목 결과 · 수정 방법 · 근거`, fn: dlReport, pro: true },
    { key: 'guide', i: '신고', t: '신고 준비 가이드 PDF', s: '신고 절차 · 준비 서류 · 입력 항목 · 관련 링크', fn: dlGuide, pro: true },
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
