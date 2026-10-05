/**
 * 표시사항 시트 — PDF (결과물 디자인 v1, 2026-10-05)
 *
 * 입력한 표시사항을 항목별로 정리한 확인용 시트. 인쇄용 라벨이 아니다.
 * 텍스트 PDF (글자 선택·검색 가능), A4 세로, 내용이 길면 다음 장.
 * 엑셀 버전은 generateLabelXlsx.ts. (PNG는 v2에서 삭제)
 * 파일명: LabelPass_표시사항시트_{제품명}_{YYYYMMDD}.pdf (한국 시간)
 */
import type { CreatorData } from '../pages/creator/types'
import { buildSheetModel, type SheetCtx, type SheetModel } from './labelSheet'
import {
  C, PdfWriter, createPdfDoc, downloadPdfArtifact, kstDate, kstStamp, safePdfName, saveDocAsArtifact,
  type DownloadablePdfArtifact,
} from './pdfCore'

const FOOTER = '이 시트는 입력한 내용을 표시 항목별로 정리한 확인용 자료입니다. 실제 표시 내용과 적법성은 영업자가 최종 확인해야 하며, 법적 효력이 없습니다.'

function metaLine(m: SheetModel): string {
  return [m.foodType, m.amount, m.businessLabel, m.reviewId && `검토번호 ${m.reviewId}`, `작성 ${kstDate(m.reviewedAt)}`]
    .filter(Boolean).join('  ·  ')
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function createLabelPDFArtifact(data: CreatorData, ctx: SheetCtx = {}): Promise<DownloadablePdfArtifact> {
  const m = buildSheetModel(data, ctx)
  const filename = `LabelPass_표시사항시트_${safePdfName(m.productName)}_${kstStamp()}.pdf`
  const doc = await createPdfDoc()
  const w = new PdfWriter(doc, {
    header: '표시사항 시트',
    headerRight: m.reviewId ? `검토번호 ${m.reviewId}` : undefined,
    footer: FOOTER,
  })

  w.title(m.productName || '이름 없는 제품', metaLine(m))
  w.note('입력한 내용을 표시 항목별로 정리했어요. 디자이너·인쇄소에 이 시트와 아래 텍스트를 함께 전달하면 표시사항을 빠짐없이 옮길 수 있어요. "미입력" 항목은 라벨에 넣기 전에 채워 주세요.', {
    bg: C.infoBg, border: '#C9D6EE', color: C.info, size: 8.6,
  })

  w.section('표시사항', '항목별 정리')
  w.kv(m.rows, { labelW: 40 })

  w.section('영양성분', m.nutrition.exempt ? '표시 생략(면제 선택)' : (m.nutrition.serving || '1회 제공량 미입력'))
  if (m.nutrition.exempt) {
    w.text('영양성분 표시를 생략하는 것으로 입력했어요. 면제 대상인지는 영업 형태와 매출 기준으로 확인해 주세요.', { size: 9, color: C.faint, after: 2 })
  } else {
    const rows = m.nutrition.rows.map(r => [r.k, r.missing ? '미입력' : r.v, r.pct !== null ? `${r.pct}%` : '-'])
    const rest = (w.contentW - 60) / 2
    w.table(['영양성분', m.nutrition.serving ? `${m.nutrition.serving}당` : '값', '기준치 대비'], rows, [60, rest, rest], { align: ['left', 'right', 'right'] })
    w.text('기준치 대비 %는 1일 영양성분 기준치(식품 등의 표시·광고에 관한 법률 시행규칙 별표 5) 기준이에요. 열량과 트랜스지방은 기준치가 없어 표시하지 않아요.', { size: 8, color: C.faint, after: 1 })
  }

  w.section('복사용 표시사항 텍스트', '라벨 원고로 바로 붙여 넣기')
  w.note(m.copyText, { size: 8.8, color: C.ink })

  return saveDocAsArtifact(w.finish(), filename)
}

export async function generateLabelPDF(data: CreatorData, ctx: SheetCtx = {}): Promise<void> {
  downloadPdfArtifact(await createLabelPDFArtifact(data, ctx))
}
