/**
 * 표시사항 시트 — 엑셀 (결과물 디자인 v2, 2026-10-05)
 *
 * PDF와 같은 모델(labelSheet)을 쓰되, 디자이너·인쇄소가 값을 가져다 쓰거나 메모를 남길 수 있게 만든다.
 * 시트: ①표시사항 ②영양성분 ③원재료·배합비. 비율·기준치·합계는 엑셀 수식이라 숫자를 고치면 다시 계산된다.
 * 파일명: LabelPass_표시사항시트_{제품명}_{YYYYMMDD}.xlsx (한국 시간)
 */
import type { Workbook, Worksheet, Fill, Border, Alignment } from 'exceljs'
import type { CreatorData } from '../pages/creator/types'
import { buildSheetModel, type SheetCtx, type SheetModel } from './labelSheet'
import { kstDate, kstStamp, safePdfName } from './pdfCore'

const FOOTER = '이 시트는 입력한 내용을 표시 항목별로 정리한 확인용 자료입니다. 실제 표시 내용과 적법성은 영업자가 최종 확인해야 하며, 법적 효력이 없습니다.'
const FONT = 'Arial'
const NAVY = 'FF002D72'

const fill = (argb: string): Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } })
const thin = { style: 'thin' as const, color: { argb: 'FFD9D9DE' } }
const BOX: Partial<Border> = { top: thin, left: thin, bottom: thin, right: thin }
const WRAP: Partial<Alignment> = { wrapText: true, vertical: 'top' }

function head(ws: Worksheet, rowNo: number, cols: string[]) {
  const row = ws.getRow(rowNo)
  cols.forEach((c, i) => {
    const cell = row.getCell(i + 1)
    cell.value = c
    cell.font = { name: FONT, bold: true, size: 10, color: { argb: 'FFFFFFFF' } }
    cell.fill = fill(NAVY)
    cell.border = BOX
    cell.alignment = { vertical: 'middle', wrapText: true }
  })
  row.height = 22
}

function title(ws: Worksheet, m: SheetModel, name: string, note: string) {
  ws.getCell('A1').value = `${name} — ${m.productName || '이름 없는 제품'}`
  ws.getCell('A1').font = { name: FONT, bold: true, size: 14 }
  ws.getCell('A2').value = note
  ws.getCell('A2').font = { name: FONT, size: 9, color: { argb: 'FF6B6B72' } }
}

function body(cell: { font?: unknown; border?: unknown; alignment?: unknown }, o: { bold?: boolean; input?: boolean; muted?: boolean } = {}) {
  cell.font = { name: FONT, size: 10, bold: o.bold, color: { argb: o.input ? 'FF0000FF' : o.muted ? 'FF6B6B72' : 'FF26262B' } }
  cell.border = BOX
  cell.alignment = WRAP
}

function sheetLabelRows(wb: Workbook, m: SheetModel, ctx: SheetCtx) {
  const ws = wb.addWorksheet('①표시사항')
  title(ws, m, '표시사항 시트', '입력한 내용을 항목별로 정리한 확인용 시트입니다. 법적 적합 여부를 보증하지 않습니다.')
  ws.getCell('A3').value = [m.foodType, m.amount, m.businessLabel, m.reviewId && `검토번호 ${m.reviewId}`, `작성 ${kstDate(ctx.reviewedAt)}`].filter(Boolean).join('  ·  ')
  ws.getCell('A3').font = { name: FONT, size: 9, color: { argb: 'FF6B6B72' } }

  head(ws, 5, ['항목', '표시 내용', '상태', '확인할 점 / 안내', '디자이너·인쇄소 메모'])
  let r = 6
  for (const row of m.rows) {
    const vals = [row.k, row.v, row.status, row.sub ?? '', '']
    vals.forEach((v, i) => {
      const cell = ws.getRow(r).getCell(i + 1)
      cell.value = v
      body(cell, { bold: i === 0, muted: i === 3 })
      if (row.status === '확인 필요') cell.fill = fill('FFFFF2CC')
    })
    r++
  }
  r++
  ws.getCell(r, 1).value = '복사용 표시사항 텍스트'
  ws.getCell(r, 1).font = { name: FONT, bold: true, size: 10 }
  r++
  ws.mergeCells(r, 1, r, 5)
  const copy = ws.getCell(r, 1)
  copy.value = m.copyText
  copy.font = { name: FONT, size: 10 }
  copy.alignment = WRAP
  copy.border = BOX
  ws.getRow(r).height = Math.max(60, (m.copyText.split('\n').length + 1) * 15)
  r += 2
  ws.mergeCells(r, 1, r, 5)
  ws.getCell(r, 1).value = FOOTER
  ws.getCell(r, 1).font = { name: FONT, size: 9, color: { argb: 'FF6B6B72' } }
  ws.getCell(r, 1).alignment = WRAP
  ws.getRow(r).height = 28

  ;[20, 42, 10, 46, 28].forEach((w, i) => { ws.getColumn(i + 1).width = w })
  ws.views = [{ state: 'frozen', ySplit: 5 }]
}

function sheetNutrition(wb: Workbook, m: SheetModel) {
  const ws = wb.addWorksheet('②영양성분')
  title(ws, m, '영양성분', m.nutrition.exempt
    ? '영양성분 표시를 생략(면제 선택)한 제품이에요. 면제 대상인지는 영업 형태와 매출 기준으로 확인해 주세요.'
    : '파란색 숫자는 입력값이에요. 기준치 대비 %와 총 내용량당 함량은 수식으로 계산돼요.')
  if (m.nutrition.exempt) {
    ws.getColumn(1).width = 100
    return
  }

  head(ws, 4, ['영양성분', m.nutrition.serving ? `${m.nutrition.serving}당 함량` : '1회 제공량당 함량', '단위', '1일 영양성분 기준치', '기준치 대비 %', '총 내용량당 함량', '상태'])
  ws.getCell('I4').value = '총 내용량'
  ws.getCell('I5').value = '1회 제공량'
  ws.getCell('J4').value = m.nutrition.totalAmount || null
  ws.getCell('J5').value = m.nutrition.servingAmount || null
  for (const c of ['I4', 'I5']) ws.getCell(c).font = { name: FONT, size: 10, bold: true }
  for (const c of ['J4', 'J5']) ws.getCell(c).font = { name: FONT, size: 10, color: { argb: 'FF0000FF' } }

  let r = 5
  for (const n of m.nutrition.rows) {
    const row = ws.getRow(r)
    row.getCell(1).value = n.k
    row.getCell(2).value = n.num === '' ? null : Number(n.num)
    row.getCell(3).value = n.unit
    row.getCell(4).value = n.std ?? '-'
    row.getCell(5).value = n.std
      ? { formula: `IF(ISNUMBER(B${r}),ROUND(B${r}/D${r},2),"-")`, result: n.pct !== null ? n.pct / 100 : '-' }
      : '-'
    row.getCell(5).numFmt = '0%'
    // 단위가 달라 총 내용량당 함량을 계산할 수 없으면 빈칸으로 둔다
    const canScale = n.perTotal !== null
    row.getCell(6).value = canScale
      ? { formula: `IF(AND(ISNUMBER(B${r}),ISNUMBER($J$4),ISNUMBER($J$5)),ROUND(B${r}*$J$4/$J$5,1),"")`, result: n.perTotal as number }
      : ''
    row.getCell(7).value = n.missing ? '확인 필요' : '입력됨'
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c)
      body(cell, { bold: c === 1, input: c === 2 || c === 4 })
      cell.alignment = { vertical: 'top', horizontal: c === 1 || c === 3 || c === 7 ? 'left' : 'right' }
      if (n.missing) cell.fill = fill('FFFFF2CC')
    }
    r++
  }
  r++
  ws.mergeCells(r, 1, r, 7)
  ws.getCell(r, 1).value = '기준치: 식품 등의 표시·광고에 관한 법률 시행규칙 [별표 5] 1일 영양성분 기준치(2020.9.9 개정). 열량과 트랜스지방은 기준치가 없어 %를 표시하지 않아요. 총 내용량당 함량은 1회 제공량과 내용량의 단위가 같을 때만 계산돼요.'
  ws.getCell(r, 1).font = { name: FONT, size: 9, color: { argb: 'FF6B6B72' } }
  ws.getCell(r, 1).alignment = WRAP
  ws.getRow(r).height = 40
  ;[16, 20, 8, 20, 14, 18, 10, 3, 12, 8].forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

function sheetIngredients(wb: Workbook, m: SheetModel) {
  const ws = wb.addWorksheet('③원재료·배합비')
  title(ws, m, '원재료·배합비', '배합비는 제조자 내부 정보일 수 있어요. 인쇄소·디자이너에게는 이 시트를 빼고 전달하는 것을 권장해요.')
  head(ws, 4, ['순번', '원재료명', '배합량(g)', '비율(%)', '원산지', '알레르기', '비고'])
  const first = 5
  const last = first + Math.max(m.ingredients.length, 1) - 1
  const total = m.ingredients.reduce((s, i) => s + i.weight, 0)
  let r = first
  for (const ing of m.ingredients) {
    const row = ws.getRow(r)
    row.getCell(1).value = ing.no
    row.getCell(2).value = ing.name
    row.getCell(3).value = ing.weight
    row.getCell(4).value = { formula: `IF($C$${last + 1}>0,ROUND(C${r}/$C$${last + 1}*100,1),"")`, result: total > 0 ? Math.round(ing.weight / total * 1000) / 10 : '' }
    row.getCell(4).numFmt = '0.0'
    row.getCell(5).value = ing.origin || '미입력'
    row.getCell(6).value = ing.allergen ? '○' : '-'
    row.getCell(7).value = ''
    for (let c = 1; c <= 7; c++) {
      const cell = row.getCell(c)
      body(cell, { input: c === 3 })
      if (c === 5 && !ing.origin) cell.fill = fill('FFFFF2CC')
    }
    r++
  }
  const sum = ws.getRow(last + 1)
  sum.getCell(2).value = '합계'
  sum.getCell(3).value = { formula: `SUM(C${first}:C${last})`, result: total }
  sum.getCell(4).value = { formula: `SUM(D${first}:D${last})`, result: total > 0 ? 100 : 0 }
  sum.getCell(4).numFmt = '0.0'
  for (let c = 1; c <= 7; c++) body(sum.getCell(c), { bold: true })
  ws.getCell(last + 3, 1).value = '원재료명은 ①시트에 배합비율 높은 순으로 들어가요. 여기서는 순서와 비율만 확인하세요.'
  ws.getCell(last + 3, 1).font = { name: FONT, size: 9, color: { argb: 'FF6B6B72' } }
  ;[6, 18, 12, 10, 14, 10, 24].forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

export async function createLabelXlsxBlob(data: CreatorData, ctx: SheetCtx = {}): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const m = buildSheetModel(data, ctx)
  const wb = new ExcelJS.Workbook()
  wb.creator = 'LabelPass'
  wb.created = new Date()
  wb.calcProperties.fullCalcOnLoad = true
  sheetLabelRows(wb, m, ctx)
  sheetNutrition(wb, m)
  sheetIngredients(wb, m)
  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function labelXlsxFilename(data: CreatorData): string {
  return `LabelPass_표시사항시트_${safePdfName(data.productName)}_${kstStamp()}.xlsx`
}
