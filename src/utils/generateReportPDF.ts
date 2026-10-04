// generateReportPDF.ts — PDF ② 정부24 신고 입력 가이드 (v5)
// 파일명: KRK_신고입력가이드_{productName}_{YYYYMMDD}.pdf
// v5 변경: tier 파라미터 추가, 사업자 유형 분기(D-2-6), packagingMaterials 연결, 검토번호 연결

import type { CreatorData } from '../pages/creator/types'
import type { ServiceTier } from './tierUtils'
import { CATEGORY_OFFICIAL } from './tierUtils'
import { generateReviewId } from './generateReviewId'
import {
  addWrappedText,
  createCanvasPdfArtifact,
  createPdfDoc,
  createRasterPdfArtifact,
  downloadPdfArtifact,
  drawBusinessBadge,
  drawKeyValueRows,
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
// ─── 사업자 유형별 신고 절차 안내 ─────────────────────────────────────────────

interface BizGuide {
  title:   string   // 신고 유형명
  law:     string   // 근거 법조문
  portal:  string   // 신고 포털
  steps:   string[] // 신고 절차
  note:    string   // 주의 사항
}

const BUSINESS_GUIDE: Record<string, BizGuide> = {
  '식품제조가공업': {
    title:  '식품제조·가공업 품목제조보고',
    law:    '식품위생법 제37조, 동법 시행규칙 제45조',
    portal: 'https://www.gov.kr → 식품제조가공업 품목제조보고',
    steps: [
      '① 관할 시·군·구청에 식품제조·가공업 영업신고 완료 확인',
      '② 정부24(gov.kr) 또는 식품안전나라(foodsafetykorea.go.kr) 접속',
      '③ "품목제조보고" 검색 → 제조 신고서 온라인 작성',
      '④ 아래 표 항목 입력 후 제출',
      '⑤ 신고번호 발급 확인 (영업장 게시 의무)',
    ],
    note: '품목제조보고는 신제품 출시 전 또는 원재료 변경 시마다 새로 보고해야 합니다.',
  },
  '즉판가공업': {
    title:  '즉석판매제조·가공업 영업신고',
    law:    '식품위생법 제37조 제4항, 동법 시행규칙 제42조',
    portal: 'https://www.gov.kr → 즉석판매제조가공업 영업신고',
    steps: [
      '① 관할 시·군·구청 위생과 방문 또는 정부24 온라인 신청',
      '② 즉석판매제조·가공업 영업신고서 작성 (별지 제37호 서식)',
      '③ 시설 기준 확인 (소분·가공·판매 동일 장소 원칙)',
      '④ 품목제조보고는 불필요 — 단, 자체 품질 관리 기록 유지 권고',
      '⑤ 신고증 수령 후 영업장 게시',
    ],
    note: '즉판가공업은 제조 현장에서 직접 판매가 원칙입니다. 택배·온라인 판매는 별도 영업 유형 검토 필요.',
  },
}

/**
 * PDF ② — 정부24 신고 입력 가이드
 *
 * @param data   CreatorData
 * @param tier   'tier1' | 'tier2'
 */
export async function createReportPDFArtifact(data: CreatorData, _tier: ServiceTier = 'tier2'): Promise<DownloadablePdfArtifact> {
  const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeName  = safePdfName(data.productName)
  const filename  = `KRK_신고입력가이드_${safeName}_${dateStr}.pdf`
  const reviewId  = generateReviewId()

  const officialCategory = data.categories.length > 0
    ? CATEGORY_OFFICIAL[data.categories[0]] ?? data.categories[0]
    : '—'

  // 포장재질: packagingMaterials 연결 (없으면 직접 입력 안내)
  const packagingDisplay = (data.packagingMaterials?.length ?? 0) > 0
    ? data.packagingMaterials!.join(', ')
    : '— (포장재 정보를 직접 입력해주세요)'

  // 원재료명
  const totalW = data.ingredients.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0)
  const ingredientDisplay = data.ingredients.length > 0
    ? [...data.ingredients]
        .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
        .map(i => {
          const pct = totalW > 0 ? `(${((parseFloat(i.weight) || 0) / totalW * 100).toFixed(1)}%)` : ''
          return `${i.name}${pct}`
        })
        .join(', ')
    : '—'

  // 영양성분
  const nutritionDisplay = data.nutritionExempted
    ? '소규모 제조업 면제 (식품등의 표시기준 제5조)'
    : [
        data.calories   && `열량 ${data.calories}kcal`,
        data.totalCarbs && `탄수화물 ${data.totalCarbs}g`,
        data.protein    && `단백질 ${data.protein}g`,
        data.totalFat   && `지방 ${data.totalFat}g`,
        data.sodium     && `나트륨 ${data.sodium}mg`,
      ].filter(Boolean).join(', ') || '—'

  // 입력 항목 테이블
  const tableRows: [string, string][] = [
    ['품목명 (제품명)',      data.productName   || '—'],
    ['선택 카테고리',        data.categories.join(', ') || '—'],
    ['식약처 공식 분류명',   officialCategory],
    ['사업자 유형',          data.businessType  || '—'],
    ['내용량',              data.totalWeight ? `${data.totalWeight}${data.unit}` : '—'],
    ['원재료명 및 배합비',   ingredientDisplay],
    ['소비기한',            data.expiryDate ? data.expiryDate.replace(/-/g, '.') + ' 까지' : '—'],
    ['보관방법',            data.storage       || '—'],
    ['영양성분',            nutritionDisplay],
    ['포장재질',            packagingDisplay],
    ['제조업소명',          data.manufacturer  || '—'],
    ['제조업소 소재지',      '— (직접 입력)'],
    ['신고번호',            '— (신고 후 기재)'],
    ['연락처',              '— (직접 입력)'],
  ]

  const guide = BUSINESS_GUIDE[data.businessType] ?? null
  const businessLabel = data.businessType === '즉판가공업' ? '즉석판매제조·가공업' : data.businessType

  return createCanvasPdfArtifact(filename, ctx => {
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.fillRect(0, 0, 794, 68)
    ctx.fillStyle = '#fff'
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('KRK CHECKER · PDF-02 입력 가이드', 54, 42)
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(new Date().toLocaleDateString('ko-KR'), 655, 42)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '12px system-ui'
    ctx.fillText('SELF-INPUT GUIDE · 정부24 / 식품안전나라 신고 화면 입력 참고용', 175, 110)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '700 29px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('품목제조보고 입력 가이드', 250, 150)
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.fillRect(368, 170, 58, 2)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '12px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`가이드 번호 ${reviewId} · 작성일 ${new Date().toLocaleDateString('ko-KR')}`, 54, 210)
    ctx.strokeStyle = PDF_COLORS.ink
    ctx.strokeRect(600, 190, 140, 34)
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.beginPath()
    ctx.arc(618, 207, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = PDF_COLORS.ink
    ctx.fillText(businessLabel || '사업자 유형', 630, 212)

    ctx.strokeStyle = PDF_COLORS.heritage
    ctx.fillStyle = PDF_COLORS.guide
    ctx.fillRect(54, 246, 686, 92)
    ctx.strokeRect(54, 246, 686, 92)
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.fillRect(54, 246, 5, 92)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('입력 가이드 안내', 76, 278)
    ctx.font = '12.5px "Apple SD Gothic Neo", system-ui'
    drawCanvasText(ctx, '본 문서는 입력된 정보를 바탕으로 품목제조보고 화면에 옮겨 적을 항목을 정리한 참고 가이드입니다. 실제 신고는 사업자가 정부24 또는 식품안전나라에서 직접 진행해야 합니다.', 76, 306, 630, 18, 2)

    ctx.fillStyle = PDF_COLORS.heritage
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('입력 항목', 54, 378)
    let y = 400
    tableRows.forEach(([label, value]) => {
      const rowH = 38
      ctx.fillStyle = PDF_COLORS.paper
      ctx.fillRect(54, y, 190, rowH)
      ctx.strokeStyle = PDF_COLORS.hairline
      ctx.strokeRect(54, y, 686, rowH)
      ctx.fillStyle = PDF_COLORS.faint
      ctx.font = '700 12px "Apple SD Gothic Neo", system-ui'
      ctx.fillText(label, 68, y + 24)
      ctx.fillStyle = PDF_COLORS.ink
      ctx.font = '12px "Apple SD Gothic Neo", system-ui'
      drawCanvasText(ctx, value, 260, y + 24, 454, 15, 1)
      y += rowH
    })
    y += 30
    ctx.fillStyle = PDF_COLORS.heritage
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(guide ? `${businessLabel} 신고 절차 안내` : '신고 절차 안내', 54, y)
    y += 30
    ctx.strokeStyle = PDF_COLORS.hairline
    ctx.strokeRect(54, y - 18, 686, 126)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '700 14px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(guide?.title || '맞춤 신고 절차', 76, y + 8)
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    drawCanvasText(ctx, `근거: ${guide?.law || '—'} · 신고 포털: ${guide?.portal || '—'}`, 76, y + 30, 630, 15, 2)
    ctx.fillStyle = PDF_COLORS.ink
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ;(guide?.steps || ['사업자 유형을 입력하면 맞춤 신고 절차 안내가 표시됩니다.']).slice(0, 4).forEach((step, index) => {
      ctx.fillText(step, 76, y + 62 + index * 16)
    })
    ctx.fillStyle = PDF_COLORS.faint
    ctx.font = '10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('본 가이드는 krk.team 자동 작성 참고 자료입니다. 실제 신고는 정부24(gov.kr)에서 직접 진행하세요.', 54, 1032)
    ctx.fillText('krk.team', 680, 1032)
  })

  const rowHtml = tableRows.map(([label, value]) => `
    <tr>
      <th style="width:190px;background:#F7F7F8;color:${PDF_COLORS.faint};text-align:left;font-size:12px;font-weight:600;padding:10px 14px;border:1px solid ${PDF_COLORS.hairline};">${escapePdfHtml(label)}</th>
      <td style="font-size:13px;line-height:1.55;padding:10px 14px;border:1px solid ${PDF_COLORS.hairline};">${escapePdfHtml(value)}</td>
    </tr>`).join('')
  const stepsHtml = guide
    ? guide.steps.map(step => `<li style="margin:0 0 6px;">${escapePdfHtml(step)}</li>`).join('')
    : '<li>사업자 유형을 입력하면 맞춤 신고 절차 안내가 표시됩니다.</li>'
  const html = `
    <section style="width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:${PDF_COLORS.ink};
      font-family:Pretendard,'Apple SD Gothic Neo',system-ui,sans-serif;padding:0;">
      <div style="height:68px;background:${PDF_COLORS.heritage};color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 54px;box-sizing:border-box;">
        <div style="font-size:15px;font-weight:700;letter-spacing:0.08em;">KRK CHECKER · PDF-02 입력 가이드</div>
        <div style="font-size:11px;opacity:.8;">${escapePdfHtml(new Date().toLocaleDateString('ko-KR'))}</div>
      </div>
      <div style="padding:34px 54px 0;box-sizing:border-box;">
        <div style="text-align:center;color:${PDF_COLORS.faint};font-size:12px;letter-spacing:.08em;">SELF-INPUT GUIDE · 정부24 / 식품안전나라 신고 화면 입력 참고용</div>
        <h1 style="text-align:center;margin:10px 0 8px;font-size:29px;letter-spacing:-.025em;">품목제조보고 입력 가이드</h1>
        <div style="width:58px;height:2px;background:${PDF_COLORS.heritage};margin:0 auto 26px;"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;font-size:12px;color:${PDF_COLORS.faint};">
          <div>가이드 번호 <b style="color:${PDF_COLORS.ink};">${escapePdfHtml(reviewId)}</b> · 작성일 ${escapePdfHtml(new Date().toLocaleDateString('ko-KR'))}</div>
          <div style="border:1px solid ${PDF_COLORS.ink};padding:7px 12px;color:${PDF_COLORS.ink};"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${PDF_COLORS.heritage};margin-right:8px;"></span>${escapePdfHtml(businessLabel || '사업자 유형')}</div>
        </div>
        <div style="border:1px solid ${PDF_COLORS.heritage};border-left:5px solid ${PDF_COLORS.heritage};background:${PDF_COLORS.guide};padding:18px 20px;margin-bottom:22px;">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px;">입력 가이드 안내</div>
          <div style="font-size:12.5px;line-height:1.75;">본 문서는 입력된 정보를 바탕으로 품목제조보고 화면에 옮겨 적을 항목을 정리한 참고 가이드입니다. 실제 신고는 사업자가 정부24 또는 식품안전나라에서 직접 진행해야 합니다.</div>
          <div style="margin-top:8px;font-size:12px;color:#8A5A00;">공식 서식 또는 제출 완료 문서가 아닙니다.</div>
        </div>
        <div style="font-size:15px;font-weight:700;color:${PDF_COLORS.heritage};margin-bottom:10px;">입력 항목</div>
        <table style="width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:22px;">${rowHtml}</table>
        <div style="font-size:15px;font-weight:700;color:${PDF_COLORS.heritage};margin-bottom:10px;">${escapePdfHtml(guide ? `${businessLabel} 신고 절차 안내` : '신고 절차 안내')}</div>
        <div style="border:1px solid ${PDF_COLORS.hairline};padding:16px 18px;margin-bottom:18px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${escapePdfHtml(guide?.title || '맞춤 신고 절차')}</div>
          <div style="font-size:12px;color:${PDF_COLORS.faint};margin-bottom:10px;">근거: ${escapePdfHtml(guide?.law || '—')} · 신고 포털: ${escapePdfHtml(guide?.portal || '—')}</div>
          <ol style="margin:0;padding-left:20px;font-size:12.5px;line-height:1.55;">${stepsHtml}</ol>
          ${guide ? `<div style="margin-top:10px;font-size:12px;color:#8A5A00;">주의: ${escapePdfHtml(guide.note)}</div>` : ''}
        </div>
        <div style="background:${PDF_COLORS.paper};border:1px solid ${PDF_COLORS.hairline};padding:14px 16px;font-size:11.5px;line-height:1.65;color:${PDF_COLORS.faint};">
          위 표의 내용은 식품위생법 제37조 및 동법 시행규칙 관련 신고 화면 입력을 돕기 위한 참고 자료입니다. 관할 지자체 요청 항목은 별도로 확인하세요.
        </div>
        <div style="border-top:1px solid ${PDF_COLORS.hairline};margin-top:26px;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:${PDF_COLORS.faint};">
          <span>본 가이드는 krk.team 자동 작성 참고 자료입니다. 실제 신고는 정부24(gov.kr)에서 직접 진행하세요.</span><span>krk.team</span>
        </div>
      </div>
    </section>`

  return createRasterPdfArtifact(html, filename)

  const doc = await createPdfDoc()
  const today = new Date().toLocaleDateString('ko-KR')

  drawPdfHeader(doc, 'PDF-02 입력 가이드', today)

  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(8)
  doc.text('SELF-INPUT GUIDE · 정부24 / 식품안전나라 신고 화면 입력 참고용', 46, 31)
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(20)
  doc.text('품목제조보고 입력 가이드', 68, 42)
  doc.setFillColor(PDF_COLORS.heritage)
  doc.rect(91, 48, 28, 1.3, 'F')

  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(8.5)
  doc.text(`가이드 번호 ${reviewId}`, 14, 61)
  doc.text(`작성일 ${today}`, 78, 61)
  drawBusinessBadge(doc, businessLabel || '사업자 유형', 154, 55, 42)

  doc.setDrawColor(PDF_COLORS.heritage)
  doc.setFillColor(PDF_COLORS.guide)
  doc.rect(14, 70, 182, 32, 'FD')
  doc.setFillColor(PDF_COLORS.heritage)
  doc.rect(14, 70, 1.4, 32, 'F')
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(10.5)
  doc.text('입력 가이드 안내', 19, 80)
  addWrappedText(
    doc,
    '본 문서는 입력된 정보를 바탕으로 품목제조보고 화면에 옮겨 적을 항목을 정리한 참고 가이드입니다. 실제 신고는 사업자가 정부24 또는 식품안전나라에서 직접 진행해야 합니다.',
    19,
    88,
    170,
    4.5,
    { size: 8.2, color: PDF_COLORS.ink, maxLines: 3 },
  )
  doc.setTextColor('#8A5A00')
  doc.setFontSize(7.8)
  doc.text('공식 서식 또는 제출 완료 문서가 아닙니다.', 19, 98)

  doc.setTextColor(PDF_COLORS.heritage)
  doc.setFontSize(10)
  doc.text('입력 항목', 14, 116)
  let y = drawKeyValueRows(doc, tableRows, 14, 122, 182, 48)

  if (y > 222) {
    doc.addPage()
    drawPdfHeader(doc, 'PDF-02 입력 가이드 · 계속', today)
    y = 32
  } else {
    y += 10
  }

  doc.setFontSize(10)
  doc.setTextColor(PDF_COLORS.heritage)
  doc.text(guide ? `${businessLabel} 신고 절차 안내` : '신고 절차 안내', 14, y)
  y += 8
  doc.setTextColor(PDF_COLORS.ink)
  if (guide) {
    doc.setFontSize(11)
    doc.text(guide.title, 14, y)
    y += 6
    y = addWrappedText(doc, `근거: ${guide.law}`, 14, y, 180, 5, { size: 8.5, color: '#66666A' })
    y = addWrappedText(doc, `신고 포털: ${guide.portal}`, 14, y + 2, 180, 5, { size: 8.5 })
    y += 2
    guide.steps.forEach(step => {
      y = addWrappedText(doc, step, 14, y, 180, 5, { size: 8.5 })
    })
    y = addWrappedText(doc, `주의: ${guide.note}`, 14, y + 4, 180, 5, { size: 8.5, color: '#8A5A00' })
  } else {
    y = addWrappedText(doc, '사업자 유형을 입력하면 맞춤 신고 절차 안내가 표시됩니다.', 14, y, 180, 5, { size: 9 })
  }

  if (y > 240) {
    doc.addPage()
    drawPdfHeader(doc, 'PDF-02 입력 가이드 · 법적 안내', today)
    y = 34
  } else {
    y += 10
  }
  doc.setDrawColor(PDF_COLORS.hairline)
  doc.setFillColor(PDF_COLORS.paper)
  doc.rect(14, y, 182, 20, 'FD')
  addWrappedText(
    doc,
    '위 표의 내용은 식품위생법 제37조 및 동법 시행규칙 관련 신고 화면 입력을 돕기 위한 참고 자료입니다. 관할 지자체 요청 항목은 별도로 확인하세요.',
    19,
    y + 8,
    172,
    4.5,
    { size: 8, color: PDF_COLORS.faint, maxLines: 3 },
  )

  drawPdfFooter(doc, '본 가이드는 krk.team 자동 작성 참고 자료입니다. 실제 신고는 정부24(gov.kr)에서 직접 진행하세요.')
  return saveDocAsArtifact(doc, filename)
}

export async function generateReportPDF(data: CreatorData, tier: ServiceTier = 'tier2'): Promise<void> {
  downloadPdfArtifact(await createReportPDFArtifact(data, tier))
}
