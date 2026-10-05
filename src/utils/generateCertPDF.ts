/**
 * 라벨 검토 리포트 — PDF (결과물 디자인 v1, 2026-10-05)
 *
 * - 17개 항목을 모두 싣는다 (내용이 길면 여러 장).
 * - 전문: 항목마다 수정 방법 · 근거 · 과태료 참고. 기본: 결과와 사유만.
 * - 번호는 화면과 같은 검토번호(reviewId)를 쓴다. 결과(results)도 화면에서 계산한 것을 그대로 받는다.
 * 파일명: LabelPass_검토리포트_{제품명}_{YYYYMMDD}.pdf (한국 시간)
 */
import type { CreatorData } from '../pages/creator/types'
import type { RegulationResult } from '../pages/ReviewResult'
import type { ServiceTier } from './tierUtils'
import { buildSheetModel, type SheetCtx } from './labelSheet'
import {
  C, PdfWriter, STATUS, createPdfDoc, downloadPdfArtifact, kstDateTime, kstStamp, safePdfName, saveDocAsArtifact,
  type DownloadablePdfArtifact, type StatusKey,
} from './pdfCore'

export interface ReportCtx extends SheetCtx {
  /** 화면과 같은 결과. 없으면 입력으로 다시 계산한다 */
  results?: RegulationResult[]
}

const FOOTER = '라벨패스 검토 리포트는 입력한 내용을 기준으로 한 사업자 자율 점검 기록입니다. 행정기관의 판단이나 법적 효력을 대신하지 않으며, 최종 표시 책임은 영업자에게 있습니다.'

/** "왜 확인이 필요한가요" 본문 — 근거·과태료·수정방법 줄은 따로 보여주므로 뺀다 */
function why(detail: string): string {
  return (detail || '').split('\n').filter(l => !/^\s*(근거|과태료|수정방법)\s*:/.test(l)).join('\n').trim()
}

async function computeResults(data: CreatorData): Promise<RegulationResult[]> {
  const { analyzeRegulations } = await import('../pages/ReviewResult')
  return analyzeRegulations(
    data.ingredients.map(i => ({
      id: i.id, name: i.name, origin: i.origin ?? '', rawName: i.name, weight: parseFloat(i.weight) || 0,
      suggestedName: i.name, isComposite: i.isComposite, isAllergen: i.isAllergen, matchConfidence: 1,
    })),
    {
      productName: data.productName, totalWeight: data.totalWeight, unit: data.unit, expiryDays: '', storage: data.storage,
      manufacturer: data.manufacturer, manufacturerAddress: data.manufacturerAddress, reportNumberStatus: data.reportNumberStatus,
      reportNumber: data.reportNumber, labelClaim: data.labelClaim, hasNutritionClaim: data.hasNutritionClaim,
      packagingMaterials: data.packagingMaterials, categories: data.categories, businessType: data.businessType || undefined,
      facilityType: data.facilityType || undefined,
    },
  )
}

export async function createCertPDFArtifact(data: CreatorData, tier: ServiceTier = 'tier2', ctx: ReportCtx = {}): Promise<DownloadablePdfArtifact> {
  const isPro = tier === 'tier2'
  const m = buildSheetModel(data, ctx)
  const results = ctx.results ?? await computeResults(data)
  const filename = `LabelPass_검토리포트_${safePdfName(m.productName)}_${kstStamp()}.pdf`
  const counts = {
    violation: results.filter(r => r.status === 'violation').length,
    warn: results.filter(r => r.status === 'warn').length,
    pass: results.filter(r => r.status === 'pass').length,
  }
  const idOf = new Map(results.map((r, i) => [r.id, String(i + 1).padStart(2, '0')]))

  const doc = await createPdfDoc()
  const w = new PdfWriter(doc, {
    header: '라벨 검토 리포트',
    headerRight: m.reviewId ? `검토번호 ${m.reviewId}` : undefined,
    footer: FOOTER,
  })

  // ── 표지 영역 ──
  w.title('라벨 검토 리포트', `사업자 자율 점검 기록 · ${isPro ? '전문' : '기본'} 서비스 · 법적 효력 없음`)
  w.kv([
    { k: '제품명', v: m.productName },
    { k: '식품유형 · 내용량', v: [m.foodType, m.amount].filter(Boolean).join(' · ') },
    { k: '영업 형태', v: [m.businessLabel, m.facilityLabel].filter(Boolean).join(' · ') },
    { k: '검토번호', v: m.reviewId ?? '', missing: !m.reviewId },
    { k: '검토 일시', v: kstDateTime(m.reviewedAt) },
    { k: '검토 기준', v: `${results.length}개 항목 자동 검토 (식품 등의 표시·광고에 관한 법률 · 식품등의 표시기준 등, 검토 시점 기준)` },
  ], { labelW: 36 })

  w.section('검토 결과 요약', `${results.length}개 항목`)
  w.tiles([
    { n: counts.violation, label: STATUS.violation.label, color: STATUS.violation.color, bg: STATUS.violation.bg },
    { n: counts.warn, label: STATUS.warn.label, color: STATUS.warn.color, bg: STATUS.warn.bg },
    { n: counts.pass, label: STATUS.pass.label, color: STATUS.pass.color, bg: STATUS.pass.bg },
  ])
  w.text(
    counts.violation > 0
      ? `수정 필요 ${counts.violation}건은 라벨을 쓰기 전에 고쳐야 하는 항목이에요. 확인 권장 ${counts.warn}건은 입력 내용으로는 판단이 갈리는 항목이라 직접 확인이 필요해요.`
      : counts.warn > 0
        ? `수정 필요 항목은 없어요. 확인 권장 ${counts.warn}건은 입력 내용으로는 판단이 갈리는 항목이라 직접 확인이 필요해요.`
        : '입력한 내용 기준으로 모든 항목이 기준을 충족했어요. 실제 라벨 시안에 옮긴 뒤 다시 한번 확인해 주세요.',
    { size: 9, color: C.text, after: 1 },
  )

  // ── 전체 항목 표 ──
  w.section('항목별 결과', '전체')
  const order: StatusKey[] = ['violation', 'warn', 'pass']
  w.table(
    ['번호', '검토 항목', '결과'],
    results.map(r => [idOf.get(r.id) ?? '', r.title, STATUS[r.status as StatusKey].label]),
    [14, w.contentW - 14 - 26, 26],
    {
      align: ['center', 'left', 'center'], boldCols: [2],
      color: (t, col) => col === 2 ? (Object.values(STATUS).find(s => s.label === t)?.color) : col === 0 ? C.muted : undefined,
    },
  )

  // ── 항목 상세 ──
  const issues = results.filter(r => r.status !== 'pass').sort((a, b) => order.indexOf(a.status as StatusKey) - order.indexOf(b.status as StatusKey))
  w.section(isPro ? '수정 필요 · 확인 권장 항목 상세' : '수정 필요 · 확인 권장 항목', isPro ? '왜 · 어떻게 · 근거' : '사유')
  if (issues.length === 0) {
    w.text('상세히 볼 항목이 없어요.', { size: 9, color: C.faint, after: 2 })
  }
  for (const r of issues) {
    const s = STATUS[r.status as StatusKey]
    const reason = why(r.detail)
    // 제목 줄 (번호 · 배지 · 제목) — 제목 줄과 첫 문단은 같은 장에
    w.ensure(22)
    w.space(1.5)
    const y0 = w.y
    doc.setFont('LabelPassSans', 'bold'); doc.setFontSize(8.5); doc.setTextColor(C.muted)
    doc.text(idOf.get(r.id) ?? '', w.ml, y0 + 3.4)
    const bw = w.statusBadge(r.status as StatusKey, w.ml + 8, y0 - 0.4)
    doc.setFont('LabelPassSans', 'bold'); doc.setFontSize(10.5); doc.setTextColor(C.ink)
    const titleLines = w.wrap(r.title, w.contentW - 8 - bw - 4, 10.5, true)
    titleLines.forEach((l, i) => doc.text(l, w.ml + 8 + bw + 3, y0 + 3.6 + i * 5.2))
    w.y = y0 + Math.max(5.5, titleLines.length * 5.2) + 1.5
    doc.setDrawColor(s.color); doc.setLineWidth(0.6)
    doc.line(w.ml, w.y, w.ml + 10, w.y)
    w.y += 2.2

    if (reason) {
      w.text('왜 확인이 필요한가요', { size: 8, bold: true, color: C.faint, after: 0.3, keep: 10 })
      w.text(reason, { size: 9, after: 1.6 })
    }
    if (isPro) {
      if (r.suggestion) {
        w.text('이렇게 고치세요', { size: 8, bold: true, color: C.blue, after: 0.3, keep: 10 })
        w.text(r.suggestion, { size: 9, after: 1.6 })
      }
      if (r.recommendedLabelText) {
        w.text('권장 표시 문구', { size: 8, bold: true, color: C.blue, after: 0.3, keep: 12 })
        w.note(r.recommendedLabelText, { size: 8.8, color: C.ink })
      }
      const basis = [r.regulation || r.legalBasis, r.penaltyRange && `과태료 참고: ${r.penaltyRange}`].filter(Boolean) as string[]
      if (basis.length) {
        w.text('근거 · 참고', { size: 8, bold: true, color: C.faint, after: 0.3, keep: 10 })
        w.bullets(basis, { size: 8.5, color: C.faint })
        w.space(1.6)
      }
    }
    w.rule()
  }
  if (!isPro) {
    w.note('수정 방법 · 권장 표시 문구 · 근거 법령 · 과태료 참고는 전문 서비스(19,900원)에서 제공해요. 마이페이지에서 같은 제품으로 전문 서비스를 받을 수 있어요.', {
      bg: C.paper, border: C.line, color: C.faint, size: 8.6,
    })
  }

  // ── 기준 충족 항목 ──
  const passed = results.filter(r => r.status === 'pass')
  if (passed.length) {
    w.section('기준 충족 항목', `${passed.length}개`)
    w.table(
      ['번호', '검토 항목', '확인한 내용'],
      passed.map(r => [idOf.get(r.id) ?? '', r.title, why(r.detail) || r.condition || '']),
      [14, 58, w.contentW - 72],
      { align: ['center', 'left', 'left'], size: 8.3, color: (_t, col) => col === 0 ? C.muted : undefined },
    )
  }

  // ── 안내 ──
  w.section('이 리포트를 볼 때', '')
  w.bullets([
    '검토는 입력한 내용만을 대상으로 해요. 실제 라벨 시안의 글자 크기·배치·색은 포함되지 않아요.',
    '법령과 고시는 바뀔 수 있어요. 리포트의 근거는 검토 시점 기준이에요.',
    '과태료 금액은 참고용 범위이며, 위반 횟수와 사안에 따라 달라져요.',
    '판단이 어려운 항목은 관할 시·군·구 위생 담당 부서나 식품안전나라(foodsafetykorea.go.kr)에서 확인해 주세요.',
  ], { size: 8.6, color: C.faint })

  return saveDocAsArtifact(w.finish(), filename)
}

export async function generateCertPDF(data: CreatorData, tier: ServiceTier = 'tier2', ctx: ReportCtx = {}): Promise<void> {
  downloadPdfArtifact(await createCertPDFArtifact(data, tier, ctx))
}
