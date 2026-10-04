// generateCertPDF.ts — PDF ③ 라벨 검토 리포트 (v5)
// 파일명: KRK_라벨검토리포트_{productName}_{YYYYMMDD}.pdf
// v5 변경: 서비스별 상세 안내 분기, suggestion + penaltyRange 출력, 검토번호 D-2-7 연결

import type { CreatorData } from '../pages/creator/types'
import type { ServiceTier } from './tierUtils'
import { analyzeRegulations } from '../pages/ReviewResult'
import type { Metadata } from '../pages/ReviewResult'
import { generateReviewId } from './generateReviewId'
import {
  addWrappedText,
  createCanvasPdfArtifact,
  createPdfDoc,
  createRasterPdfArtifact,
  downloadPdfArtifact,
  drawBusinessBadge,
  drawPdfFooter,
  drawPdfHeader,
  drawCanvasText,
  escapePdfHtml,
  PDF_COLORS,
  safePdfName,
  saveDocAsArtifact,
  type DownloadablePdfArtifact,
} from './pdfCore'

// ─── 색상 토큰 ─────────────────────────────────────────────────────────────────
const HERITAGE  = '#002D72'
const PRN_PASS  = '#1A6B3A'
const PRN_WARN  = '#8A5A00'
const PRN_VIOL  = '#B30000'

/**
 * PDF ③ — 라벨 검토 리포트 (사업자 자율 점검 기록)
 *
 * @param data     CreatorData
 * @param tier     'tier1' | 'tier2' — 전문 수정 가이드에서 suggestion/penaltyRange 출력
 */
export async function createCertPDFArtifact(data: CreatorData, tier: ServiceTier = 'tier2'): Promise<DownloadablePdfArtifact> {
  const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeName  = safePdfName(data.productName)
  const filename  = `KRK_라벨검토리포트_${safeName}_${dateStr}.pdf`
  const reviewId  = generateReviewId()
  const isTier2   = tier === 'tier2'

  // CreatorData → Metadata 변환
  const metadata: Metadata = {
    productName:       data.productName,
    totalWeight:       data.totalWeight,
    unit:              data.unit as 'g' | 'mL' | 'kg' | 'L',
    expiryDays:        '',
    storage:           data.storage,
    manufacturer:      data.manufacturer,
    packagingMaterials: data.packagingMaterials,
    categories:        data.categories,
    businessType:      data.businessType || undefined,
    facilityType:      data.facilityType || undefined,
  }

  const ingredients = data.ingredients.map(ing => ({
    id:              ing.id,
    name:            ing.name,
    origin:          ing.origin ?? '',
    rawName:         ing.name,
    weight:          parseFloat(ing.weight) || 0,
    suggestedName:   ing.name,
    isComposite:     ing.isComposite,
    isAllergen:      ing.isAllergen,
    matchConfidence: 1.0,
  }))

  const results = analyzeRegulations(ingredients, metadata)
  const counts  = {
    violation: results.filter(r => r.status === 'violation').length,
    warn:      results.filter(r => r.status === 'warn').length,
    pass:      results.filter(r => r.status === 'pass').length,
  }

  const summaryText =
    counts.violation > 0
      ? `위반 ${counts.violation}건 · 경고 ${counts.warn}건 · 통과 ${counts.pass}건`
      : counts.warn > 0
      ? `경고 ${counts.warn}건 · 통과 ${counts.pass}건`
      : `${results.length}건 전체 통과`

  const today = new Date().toLocaleString('ko-KR')
  const businessLabel = data.businessType === '즉판가공업' ? '즉석판매제조·가공업' : data.businessType
  const summaryBg = counts.violation > 0 ? PDF_COLORS.violBg : counts.warn > 0 ? PDF_COLORS.warnBg : PDF_COLORS.passBg
  const summaryColor = counts.violation > 0 ? PRN_VIOL : counts.warn > 0 ? PRN_WARN : PRN_PASS

  return createCanvasPdfArtifact(filename, ctx => {
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.fillRect(0, 0, 794, 68)
    ctx.fillStyle = '#fff'
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('KRK CHECKER · PDF-03 · 자율 점검 기록', 54, 42)
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(today.slice(0, 12), 650, 42)

    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '12px system-ui'
    ctx.fillText('LABEL REVIEW REPORT — SELF-AUDIT RECORD', 54, 104)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '700 31px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('krk 라벨 검토 리포트', 54, 162)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '14px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('사업자 자율 점검 기록', 54, 198)
    ctx.strokeStyle = PDF_COLORS.heritage
    ctx.strokeRect(570, 104, 170, 66)
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.font = '700 10px system-ui'
    ctx.fillText('RECORD ID', 590, 128)
    ctx.font = '700 13px system-ui'
    ctx.fillText(reviewId, 590, 154)

    ctx.strokeStyle = PDF_COLORS.alert
    ctx.fillStyle = PDF_COLORS.alertBg
    ctx.fillRect(54, 218, 686, 118)
    ctx.strokeRect(54, 218, 686, 118)
    ctx.fillStyle = PDF_COLORS.alert
    ctx.fillRect(54, 218, 6, 118)
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('중요 안내 — 반드시 읽어주세요', 78, 254)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '12px "Apple SD Gothic Neo", system-ui'
    drawCanvasText(ctx, '본 리포트는 krk.team 시스템이 입력된 정보를 기준으로 정리한 자율 점검 참고 자료입니다.', 78, 282, 630, 18, 2)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('1. 공식 인증서가 아닙니다.     2. 법적 효력이 없습니다.', 78, 314)
    ctx.fillText('3. 최종 책임은 사업자에게 있습니다.     4. 판매 전 재검토가 필요합니다.', 78, 330)

    ctx.fillStyle = PDF_COLORS.paper
    ctx.fillRect(54, 372, 686, 92)
    ctx.strokeStyle = PDF_COLORS.hairline
    ctx.strokeRect(54, 372, 686, 92)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('제품명', 78, 400)
    ctx.fillText('작성 일시', 78, 440)
    ctx.fillText('사업장 유형', 420, 400)
    ctx.fillText('제공 서비스', 420, 440)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '700 13px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(data.productName || '—', 130, 400)
    ctx.fillText(today, 130, 440)
    ctx.fillText(businessLabel || '사업자 유형', 510, 400)
    ctx.fillText(isTier2 ? '전문 수정 가이드' : '기본 라벨 패키지', 510, 440)

    ctx.strokeStyle = summaryColor
    ctx.fillStyle = summaryBg
    ctx.fillRect(54, 500, 686, 82)
    ctx.strokeRect(54, 500, 686, 82)
    ctx.fillStyle = summaryColor
    ctx.font = '700 12px system-ui'
    ctx.fillText('자율 점검 결과 / Summary', 78, 532)
    ctx.font = '800 20px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(summaryText, 78, 562)
    ctx.font = '700 11px system-ui'
    ctx.fillText(`${counts.pass} PASS · ${counts.warn} WARN · ${counts.violation} CHECK`, 570, 562)

    ctx.fillStyle = PDF_COLORS.heritage
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`점검 항목 결과 · 총 ${results.length}건`, 54, 632)
    let y = 660
    results.slice(0, 10).forEach((result, index) => {
      const color = result.status === 'pass' ? PRN_PASS : result.status === 'warn' ? PRN_WARN : PRN_VIOL
      const fill = result.status === 'pass' ? PDF_COLORS.passBg : result.status === 'warn' ? PDF_COLORS.warnBg : PDF_COLORS.violBg
      const x = index % 2 === 0 ? 54 : 405
      if (index > 0 && index % 2 === 0) y += 72
      ctx.fillStyle = fill
      ctx.fillRect(x, y, 335, 58)
      ctx.strokeStyle = PDF_COLORS.hairline
      ctx.strokeRect(x, y, 335, 58)
      ctx.fillStyle = color
      ctx.font = '700 10px "Apple SD Gothic Neo", system-ui'
      ctx.fillText(result.status === 'pass' ? '기준 충족' : result.status === 'warn' ? '보완 권장' : '필수 확인', x + 14, y + 22)
      ctx.fillStyle = PDF_COLORS.ink
      ctx.font = '700 12px "Apple SD Gothic Neo", system-ui'
      drawCanvasText(ctx, `R${String(index + 1).padStart(2, '0')} · ${result.title}`, x + 14, y + 42, 220, 14, 1)
      ctx.fillStyle = PDF_COLORS.faint
      ctx.font = '9px "Apple SD Gothic Neo", system-ui'
      drawCanvasText(ctx, result.regulation || result.id, x + 230, y + 42, 90, 12, 1)
    })
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`krk 라벨 검토 리포트 — 사업자 자율 점검 기록 (법적 효력 없음) · ${reviewId}`, 54, 1032)
    ctx.fillText('krk.team', 680, 1032)
  })

  const resultRows = results.map((result, index) => {
    const color = result.status === 'pass' ? PRN_PASS : result.status === 'warn' ? PRN_WARN : PRN_VIOL
    const fill = result.status === 'pass' ? PDF_COLORS.passBg : result.status === 'warn' ? PDF_COLORS.warnBg : PDF_COLORS.violBg
    const label = result.status === 'pass' ? '기준 충족' : result.status === 'warn' ? '보완 권장' : '필수 확인'
    const detail = result.status !== 'pass'
      ? `<div style="margin-top:5px;color:${PDF_COLORS.faint};font-size:10px;line-height:1.45;">${escapePdfHtml(result.detail)}</div>`
      : ''
    const suggestion = result.status !== 'pass' && isTier2 && result.suggestion
      ? `<div style="margin-top:4px;color:${PDF_COLORS.heritage};font-size:10px;line-height:1.45;">수정 방법: ${escapePdfHtml(result.suggestion)}</div>`
      : result.status !== 'pass' && !isTier2
      ? `<div style="margin-top:4px;color:${PDF_COLORS.faint};font-size:10px;">수정 방법 및 과태료는 전문 수정 가이드에서 확인 가능합니다.</div>`
      : ''
    return `
      <div style="border:1px solid ${PDF_COLORS.hairline};background:${fill};padding:9px 11px;break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
          <div>
            <div style="font-size:10px;color:${color};font-weight:700;">${label}</div>
            <div style="margin-top:3px;font-size:12px;font-weight:700;color:${PDF_COLORS.ink};">R${String(index + 1).padStart(2, '0')} · ${escapePdfHtml(result.title)}</div>
          </div>
          <div style="font-size:9px;color:${PDF_COLORS.faint};text-align:right;">${escapePdfHtml(result.regulation || result.id)}</div>
        </div>
        ${detail}
        ${suggestion}
      </div>`
  }).join('')

  const html = `
    <section style="width:794px;height:1123px;overflow:hidden;box-sizing:border-box;background:#fff;color:${PDF_COLORS.ink};
      font-family:Pretendard,'Apple SD Gothic Neo',system-ui,sans-serif;padding:0;">
      <div style="height:68px;background:${PDF_COLORS.heritage};color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 54px;box-sizing:border-box;">
        <div style="font-size:15px;font-weight:700;letter-spacing:0.08em;">KRK CHECKER · PDF-03 · 자율 점검 기록</div>
        <div style="font-size:11px;opacity:.8;">${escapePdfHtml(today.slice(0, 12))}</div>
      </div>
      <div style="padding:34px 54px 0;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;gap:24px;align-items:flex-start;margin-bottom:22px;">
          <div>
            <div style="font-size:12px;letter-spacing:.08em;color:${PDF_COLORS.faint};">LABEL REVIEW REPORT — SELF-AUDIT RECORD</div>
            <h1 style="margin:8px 0 4px;font-size:31px;letter-spacing:-.025em;">krk 라벨 검토 리포트</h1>
            <div style="font-size:14px;color:${PDF_COLORS.faint};">사업자 자율 점검 기록</div>
          </div>
          <div style="border:1px solid ${PDF_COLORS.heritage};padding:12px 14px;min-width:164px;">
            <div style="font-size:10px;color:${PDF_COLORS.heritage};font-weight:700;">RECORD ID</div>
            <div style="font-size:13px;color:${PDF_COLORS.heritage};font-weight:700;margin-top:5px;">${escapePdfHtml(reviewId)}</div>
          </div>
        </div>
        <div style="border:2px solid ${PDF_COLORS.alert};border-left-width:6px;background:${PDF_COLORS.alertBg};padding:16px 18px;margin-bottom:18px;">
          <div style="font-weight:700;font-size:15px;color:${PDF_COLORS.alert};margin-bottom:8px;">중요 안내 — 반드시 읽어주세요</div>
          <div style="font-size:12px;line-height:1.65;">본 리포트는 krk.team 시스템이 입력된 정보를 기준으로 정리한 자율 점검 참고 자료입니다.</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;margin-top:10px;font-size:11.5px;color:${PDF_COLORS.faint};">
            <div>1. 공식 인증서가 아닙니다.</div><div>2. 법적 효력이 없습니다.</div>
            <div>3. 최종 책임은 사업자에게 있습니다.</div><div>4. 판매 전 재검토가 필요합니다.</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid ${PDF_COLORS.hairline};background:${PDF_COLORS.paper};margin-bottom:18px;">
          <div style="padding:12px 16px;border-right:1px solid ${PDF_COLORS.hairline};border-bottom:1px solid ${PDF_COLORS.hairline};"><span style="display:block;font-size:10px;color:${PDF_COLORS.faint};margin-bottom:4px;">제품명</span><b>${escapePdfHtml(data.productName || '—')}</b></div>
          <div style="padding:12px 16px;border-bottom:1px solid ${PDF_COLORS.hairline};"><span style="display:block;font-size:10px;color:${PDF_COLORS.faint};margin-bottom:4px;">작성 일시</span><b>${escapePdfHtml(today)}</b></div>
          <div style="padding:12px 16px;border-right:1px solid ${PDF_COLORS.hairline};"><span style="display:block;font-size:10px;color:${PDF_COLORS.faint};margin-bottom:4px;">사업장 유형</span><b>${escapePdfHtml(businessLabel || '사업자 유형')}</b></div>
          <div style="padding:12px 16px;"><span style="display:block;font-size:10px;color:${PDF_COLORS.faint};margin-bottom:4px;">제공 서비스</span><b>${isTier2 ? '전문 수정 가이드' : '기본 라벨 패키지'}</b></div>
        </div>
        <div style="border:1px solid ${summaryColor};background:${summaryBg};padding:15px 18px;margin-bottom:18px;">
          <div style="font-size:12px;color:${summaryColor};font-weight:700;">자율 점검 결과 / Summary</div>
          <div style="margin-top:7px;display:flex;justify-content:space-between;align-items:flex-end;">
            <div style="font-size:20px;color:${summaryColor};font-weight:800;">${escapePdfHtml(summaryText)}</div>
            <div style="font-size:11px;color:${summaryColor};font-weight:700;">${counts.pass} PASS · ${counts.warn} WARN · ${counts.violation} CHECK</div>
          </div>
        </div>
        <div style="font-size:15px;font-weight:700;color:${PDF_COLORS.heritage};margin-bottom:10px;">점검 항목 결과 · 총 ${results.length}건</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px;">${resultRows}</div>
        <div style="border-top:1px solid ${PDF_COLORS.hairline};padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:${PDF_COLORS.faint};">
          <span>krk 라벨 검토 리포트 — 사업자 자율 점검 기록 (법적 효력 없음) · ${escapePdfHtml(reviewId)}</span><span>krk.team</span>
        </div>
      </div>
    </section>`

  return createRasterPdfArtifact(html, filename)

  const doc = await createPdfDoc()

  drawPdfHeader(doc, 'PDF-03 · 자율 점검 기록', today.slice(0, 12))
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(8)
  doc.text('LABEL REVIEW REPORT — SELF-AUDIT RECORD', 14, 33)
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(21)
  doc.text('krk 라벨 검토 리포트', 14, 45)
  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.faint)
  doc.text('사업자 자율 점검 기록', 14, 53)
  doc.setDrawColor(PDF_COLORS.heritage)
  doc.setFillColor(255, 255, 255)
  doc.rect(145, 34, 51, 16, 'D')
  doc.setTextColor(PDF_COLORS.heritage)
  doc.setFontSize(7)
  doc.text('RECORD ID', 149, 40)
  doc.setFontSize(9)
  doc.text(reviewId, 149, 47)

  doc.setDrawColor(PDF_COLORS.alert)
  doc.setFillColor(PDF_COLORS.alertBg)
  doc.rect(14, 64, 182, 42, 'FD')
  doc.setFillColor(PDF_COLORS.alert)
  doc.rect(14, 64, 1.4, 42, 'F')
  doc.setTextColor(PDF_COLORS.alert)
  doc.setFontSize(10)
  doc.text('중요 안내 — 반드시 읽어주세요', 19, 74)
  doc.setTextColor(PDF_COLORS.ink)
  addWrappedText(
    doc,
    '본 리포트는 krk.team 시스템이 입력된 정보를 기준으로 정리한 자율 점검 참고 자료입니다.',
    19,
    83,
    172,
    4.5,
    { size: 8.2, color: PDF_COLORS.ink, maxLines: 2 },
  )
  doc.setFontSize(7.5)
  doc.setTextColor(PDF_COLORS.faint)
  doc.text('1. 공식 인증서가 아닙니다.     2. 법적 효력이 없습니다.', 19, 94)
  doc.text('3. 최종 책임은 사업자에게 있습니다.     4. 판매 전 재검토가 필요합니다.', 19, 101)

  doc.setDrawColor(PDF_COLORS.hairline)
  doc.setFillColor(PDF_COLORS.paper)
  doc.rect(14, 116, 182, 28, 'FD')
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(7.8)
  doc.text('제품명', 20, 126)
  doc.text('작성 일시', 20, 137)
  doc.text('사업장 유형', 106, 126)
  doc.text('제공 서비스', 106, 137)
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(9)
  doc.text(data.productName || '—', 42, 126)
  doc.text(today, 42, 137)
  drawBusinessBadge(doc, businessLabel || '사업자 유형', 132, 121, 42)
  doc.text(isTier2 ? '전문 수정 가이드' : '기본 라벨 패키지', 132, 137)

  doc.setDrawColor(summaryColor)
  doc.setFillColor(summaryBg)
  doc.rect(14, 154, 182, 24, 'FD')
  doc.setTextColor(summaryColor)
  doc.setFontSize(9)
  doc.text('자율 점검 결과 / Summary', 20, 164)
  doc.setFontSize(13)
  doc.text(summaryText, 20, 172)
  doc.setFontSize(8)
  doc.text(`${counts.pass} PASS · ${counts.warn} WARN · ${counts.violation} CHECK`, 138, 172)

  doc.setTextColor(PDF_COLORS.heritage)
  doc.setFontSize(10.5)
  doc.text(`점검 항목 결과 · 총 ${results.length}건`, 14, 194)

  let y = 202
  results.forEach((result, index) => {
    if (y > 250) {
      doc.addPage()
      drawPdfHeader(doc, 'PDF-03 · 자율 점검 기록 · 계속', today.slice(0, 12))
      doc.setTextColor(PDF_COLORS.heritage)
      doc.setFontSize(10.5)
      doc.text('점검 항목 결과 · 계속', 14, 34)
      y = 44
    }

    const color = result.status === 'pass' ? PRN_PASS : result.status === 'warn' ? PRN_WARN : PRN_VIOL
    const fill = result.status === 'pass' ? PDF_COLORS.passBg : result.status === 'warn' ? PDF_COLORS.warnBg : PDF_COLORS.violBg
    doc.setDrawColor(PDF_COLORS.hairline)
    doc.setFillColor(fill)
    doc.rect(14, y, 182, 20, 'FD')
    doc.setTextColor(color)
    doc.setFontSize(8)
    doc.text(result.status === 'pass' ? '기준 충족' : result.status === 'warn' ? '보완 권장' : '필수 확인', 18, y + 7)
    doc.setTextColor(PDF_COLORS.ink)
    doc.setFontSize(9.5)
    doc.text(`R${String(index + 1).padStart(2, '0')} · ${result.title}`, 18, y + 14)
    doc.setFontSize(7.5)
    doc.setTextColor(PDF_COLORS.faint)
    doc.text(result.regulation || result.id, 126, y + 14)
    y += 25

    if (result.status !== 'pass') {
      y = addWrappedText(doc, result.detail, 18, y, 170, 4.5, { size: 8, color: PDF_COLORS.ink, maxLines: 4 })
      if (isTier2 && result.suggestion) {
        y = addWrappedText(doc, `수정 방법: ${result.suggestion}`, 18, y + 2, 170, 4.5, { size: 8, color: HERITAGE, maxLines: 4 })
      } else if (!isTier2) {
        y = addWrappedText(doc, '수정 방법 및 과태료는 전문 수정 가이드에서 확인 가능합니다.', 18, y + 2, 170, 4.5, { size: 8, color: '#777777', maxLines: 2 })
      }
      if (isTier2 && result.penaltyRange) {
        y = addWrappedText(doc, `과태료: ${result.penaltyRange}`, 18, y + 2, 170, 4.5, { size: 8, color: PRN_VIOL, maxLines: 2 })
      }
      y += 5
    }
  })

  drawPdfFooter(doc, `krk 라벨 검토 리포트 — 사업자 자율 점검 기록 (법적 효력 없음) · ${reviewId}`)
  return saveDocAsArtifact(doc, filename)
}

export async function generateCertPDF(data: CreatorData, tier: ServiceTier = 'tier2'): Promise<void> {
  downloadPdfArtifact(await createCertPDFArtifact(data, tier))
}
