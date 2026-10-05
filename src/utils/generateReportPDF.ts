/**
 * 품목제조보고 · 영업신고 입력 가이드 — PDF (결과물 디자인 v1, 2026-10-05)
 *
 * - 사업자 유형별 신고 절차(전체 단계) + 신고서에 옮겨 적을 입력 항목 표
 * - 입력한 제조원 소재지 · 품목보고번호를 그대로 반영. 수집하지 않는 항목(연락처)만 "직접 입력"
 * - 번호는 화면과 같은 검토번호(reviewId)
 * 파일명: LabelPass_신고입력가이드_{제품명}_{YYYYMMDD}.pdf (한국 시간)
 *
 * ※ 화면의 결과물 이름("정부24 신고 가이드")과 신고처 표기는 법규 확인 후 따로 정한다 (Backlog).
 */
import type { CreatorData } from '../pages/creator/types'
import type { ServiceTier } from './tierUtils'
import { buildSheetModel, type SheetCtx } from './labelSheet'
import {
  C, PdfWriter, createPdfDoc, downloadPdfArtifact, kstDate, kstStamp, safePdfName, saveDocAsArtifact,
  type DownloadablePdfArtifact,
} from './pdfCore'

interface BizGuide {
  title: string
  law: string
  portal: string
  steps: string[]
  note: string
}

const BUSINESS_GUIDE: Record<string, BizGuide> = {
  '식품제조가공업': {
    title:  '식품제조·가공업 품목제조보고',
    law:    '식품위생법 제37조, 동법 시행규칙 제45조',
    portal: '정부24(gov.kr) 또는 식품안전나라(foodsafetykorea.go.kr)',
    steps: [
      '관할 시·군·구청에 식품제조·가공업 영업신고(또는 등록)가 되어 있는지 확인해요.',
      '정부24(gov.kr) 또는 식품안전나라(foodsafetykorea.go.kr)에 접속해요.',
      '"품목제조보고"를 검색해 온라인 보고서 작성 화면을 열어요.',
      '아래 입력 항목 표의 내용을 순서대로 옮겨 적고 제출해요.',
      '품목보고번호가 발급되면 라벨의 품목보고번호 칸에 적어요.',
    ],
    note: '품목제조보고는 신제품을 내놓기 전에 하고, 원재료·배합비·포장재가 바뀌면 변경 보고를 해요.',
  },
  '즉판가공업': {
    title:  '즉석판매제조·가공업 영업신고',
    law:    '식품위생법 제37조 제4항, 동법 시행규칙 제42조',
    portal: '관할 시·군·구청 위생 담당 부서 또는 정부24(gov.kr)',
    steps: [
      '관할 시·군·구청 위생 담당 부서를 방문하거나 정부24에서 온라인으로 신청해요.',
      '즉석판매제조·가공업 영업신고서(별지 제37호 서식)를 작성해요.',
      '시설 기준을 확인해요. 제조·가공과 판매가 같은 장소에서 이뤄지는 것이 원칙이에요.',
      '품목제조보고는 하지 않아요. 대신 자체 품질 관리 기록을 남겨 두는 것을 권해요.',
      '신고증을 받으면 영업장에 게시해요.',
    ],
    note: '즉석판매제조·가공업은 제조 현장에서 직접 판매하는 것이 원칙이에요. 택배·온라인 판매를 계획한다면 영업 유형을 다시 확인해 주세요.',
  },
}

const FOOTER = '이 가이드는 입력한 내용을 신고서 항목에 맞춰 정리한 참고 자료입니다. 신고 절차와 서식은 기관 안내가 우선하며, 법적 효력이 없습니다.'

export async function createReportPDFArtifact(data: CreatorData, _tier: ServiceTier = 'tier2', ctx: SheetCtx = {}): Promise<DownloadablePdfArtifact> {
  const m = buildSheetModel(data, ctx)
  const filename = `LabelPass_신고입력가이드_${safePdfName(m.productName)}_${kstStamp()}.pdf`
  const guide = BUSINESS_GUIDE[data.businessType] ?? null

  const sortedIng = [...data.ingredients].filter(i => i.name.trim()).sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const totalW = sortedIng.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0)
  const ingredientRows = sortedIng.map(i => {
    const wgt = parseFloat(i.weight) || 0
    return [i.name, i.origin || '미입력', wgt ? `${wgt}${data.unit}` : '미입력', totalW > 0 ? `${(wgt / totalW * 100).toFixed(1)}%` : '—']
  })

  const nutrition = m.nutrition.exempt
    ? '영양성분 표시 생략(면제 선택) — 면제 대상인지 확인 필요'
    : m.nutrition.rows.filter(r => !r.missing).map(r => `${r.k} ${r.v}`).join(', ') || ''

  const reportNo = data.reportNumber
    ? data.reportNumber
    : data.businessType === '즉판가공업' ? '해당 없음' : ''
  const reportSub = data.reportNumber ? undefined
    : data.businessType === '즉판가공업' ? '즉석판매제조·가공업은 품목제조보고 대상이 아니에요'
      : data.reportNumberStatus === 'exists' ? '보유로 입력했지만 번호가 없어요. 신고증의 번호를 적어 주세요' : '보고 후 발급되는 번호를 적어요'

  const doc = await createPdfDoc()
  const w = new PdfWriter(doc, {
    header: '신고 입력 가이드',
    headerRight: m.reviewId ? `검토번호 ${m.reviewId}` : undefined,
    footer: FOOTER,
  })

  w.title(guide ? `${guide.title} 입력 가이드` : '신고 입력 가이드',
    [m.productName, m.businessLabel, m.reviewId && `검토번호 ${m.reviewId}`, `작성 ${kstDate(m.reviewedAt)}`].filter(Boolean).join('  ·  '))

  w.note('라벨 검토에 입력한 내용을 신고서 항목 순서로 정리했어요. 신고 화면을 열어 두고 아래 표를 보며 옮겨 적으면 돼요. "미입력"과 "직접 입력"은 신고 전에 채워야 하는 칸이에요.', {
    bg: C.infoBg, border: '#C9D6EE', color: C.info, size: 8.6,
  })

  // ── 절차 ──
  w.section('신고 절차', guide ? m.businessLabel : '사업자 유형 미입력')
  if (guide) {
    w.kv([
      { k: '신고 유형', v: guide.title },
      { k: '근거', v: guide.law },
      { k: '신고 창구', v: guide.portal },
    ], { labelW: 30 })
    w.steps(guide.steps)
    w.note(guide.note, { title: '주의', bg: C.warnBg, border: '#E8D29A', color: C.warn, size: 8.6 })
  } else {
    w.text('사업자 유형을 입력하면 유형에 맞는 신고 절차가 표시돼요.', { size: 9, color: C.faint, after: 2 })
  }

  // ── 입력 항목 ──
  w.section('신고서 입력 항목', '검토 입력 기준')
  w.kv([
    { k: '품목명(제품명)', v: m.productName },
    { k: '식품유형', v: m.foodType, sub: data.categories.length ? `선택 카테고리: ${data.categories.join(', ')}` : undefined },
    { k: '영업 형태', v: [m.businessLabel, m.facilityLabel].filter(Boolean).join(' · ') },
    { k: '내용량', v: m.amount },
    { k: '소비기한', v: data.expiryDate ? `${data.expiryDate.replace(/-/g, '.')}까지` : '', sub: '신고서에는 소비기한 설정 근거(설정 사유서 등)를 함께 요구할 수 있어요' },
    { k: '보관방법', v: data.storage },
    { k: '영양성분', v: nutrition },
    { k: '포장재질', v: m.materials.join(', ') },
    { k: '제조업소명', v: data.manufacturer },
    { k: '제조업소 소재지', v: data.manufacturerAddress },
    { k: '품목보고번호', v: reportNo, sub: reportSub },
    { k: '연락처', v: '직접 입력', sub: '라벨 검토에서는 연락처를 받지 않아요' },
  ], { labelW: 36 })

  w.section('원재료명 및 배합비', sortedIng.length ? `${sortedIng.length}개 · 배합비율 높은 순` : '')
  if (ingredientRows.length) {
    w.table(['원재료명', '원산지', '투입량', '배합비'], ingredientRows, [w.contentW - 40 - 30 - 24, 40, 30, 24], { align: ['left', 'left', 'right', 'right'] })
    w.text('배합비는 입력한 투입량 기준으로 계산했어요. 신고서의 배합비 합계가 100%가 되도록 확인해 주세요.', { size: 8, color: C.faint, after: 1 })
  } else {
    w.text('입력된 원재료가 없어요.', { size: 9, color: C.faint, after: 2 })
  }

  w.section('신고 전에 확인할 것', '')
  w.bullets([
    '영업신고(또는 등록)가 먼저 되어 있어야 품목제조보고를 할 수 있어요.',
    '제조업소명·소재지는 영업신고증에 적힌 대로 똑같이 적어 주세요.',
    '원재료명은 식품공전 명칭으로, 복합원재료는 구성 원재료까지 적어야 할 수 있어요.',
    '절차와 서식은 바뀔 수 있어요. 제출 전에 신고 화면의 안내를 다시 확인해 주세요.',
  ], { size: 8.6, color: C.faint })

  return saveDocAsArtifact(w.finish(), filename)
}

export async function generateReportPDF(data: CreatorData, tier: ServiceTier = 'tier2', ctx: SheetCtx = {}): Promise<void> {
  downloadPdfArtifact(await createReportPDFArtifact(data, tier, ctx))
}
