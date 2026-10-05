/**
 * 표시사항 시트 — PDF · PNG (결과물 디자인 v1, 2026-10-05)
 *
 * 입력한 표시사항을 항목별로 정리한 확인용 시트. 인쇄용 라벨이 아니다.
 * - PDF: 텍스트 PDF (글자 선택·검색 가능), A4 세로, 내용이 길면 다음 장
 * - PNG: 같은 내용을 HTML로 그려 고해상도 이미지로 저장 (디자이너 전달·메신저 공유용)
 * 파일명: LabelPass_표시사항시트_{제품명}_{YYYYMMDD}.pdf / .png (한국 시간)
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
    const rows = m.nutrition.rows.map(r => [r.k, r.missing ? '미입력' : r.v])
    w.table(['영양성분', m.nutrition.serving ? `${m.nutrition.serving}당` : '값'], rows, [60, w.contentW - 60], { align: ['left', 'right'] })
    w.text('1일 영양성분 기준치에 대한 비율(%)은 라벨 디자인 단계에서 기준치표에 맞춰 넣어 주세요.', { size: 8, color: C.faint, after: 1 })
  }

  w.section('복사용 표시사항 텍스트', '라벨 원고로 바로 붙여 넣기')
  w.note(m.copyText, { size: 8.8, color: C.ink })

  return saveDocAsArtifact(w.finish(), filename)
}

export async function generateLabelPDF(data: CreatorData, ctx: SheetCtx = {}): Promise<void> {
  downloadPdfArtifact(await createLabelPDFArtifact(data, ctx))
}

// ─── PNG ──────────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function sheetHtml(m: SheetModel): string {
  const row = (k: string, v: string, sub?: string, missing?: boolean) => `
    <tr>
      <th>${esc(k)}</th>
      <td><div class="${missing ? 'miss' : ''}">${esc(missing ? '미입력' : v)}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ''}</td>
    </tr>`
  const rows = m.rows.map(r => row(r.k, r.v, r.sub, r.missing ?? !r.v)).join('')
  const nut = m.nutrition.exempt
    ? `<p class="sub">영양성분 표시 생략(면제 선택)</p>`
    : `<table class="nut"><tr><th>영양성분</th><th class="r">${esc(m.nutrition.serving ? `${m.nutrition.serving}당` : '값')}</th></tr>
       ${m.nutrition.rows.map(r => `<tr><td>${esc(r.k)}</td><td class="r ${r.missing ? 'miss' : ''}">${esc(r.missing ? '미입력' : r.v)}</td></tr>`).join('')}</table>`
  return `
  <div class="lps">
    <style>
      .lps{width:1000px;box-sizing:border-box;background:#fff;color:#26262B;font-family:"Pretendard Variable",Pretendard,"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif;font-size:15px;line-height:1.5;word-break:keep-all}
      .lps .band{background:#002D72;color:#fff;padding:14px 36px;font-weight:700;letter-spacing:.04em;font-size:14px;display:flex;justify-content:space-between}
      .lps .band span{color:#C9D6EE;font-weight:400;margin-left:8px}
      .lps .body{padding:28px 36px 30px}
      .lps h1{margin:0 0 4px;font-size:30px;line-height:1.25;color:#0A0A0B}
      .lps .meta{color:#6B6B72;font-size:13px;margin:0 0 18px}
      .lps h2{margin:22px 0 8px;font-size:16px;color:#002D72;padding-bottom:6px;border-bottom:1px solid #D9D9DE}
      .lps h2 small{color:#6B6B72;font-weight:400;font-size:12px;margin-left:8px}
      .lps table{width:100%;border-collapse:collapse;font-size:14.5px}
      .lps th,.lps td{border:1px solid #D9D9DE;padding:8px 10px;vertical-align:top;text-align:left}
      .lps th{width:170px;background:#F4F5F7;color:#6B6B72;font-weight:700;font-size:13.5px}
      .lps .sub{color:#6B6B72;font-size:12px;margin-top:3px}
      .lps .miss{color:#A3A3A8}
      .lps .nut th,.lps .nut td{width:auto}
      .lps .r{text-align:right}
      .lps .copy{white-space:pre-wrap;background:#F4F5F7;border:1px solid #D9D9DE;border-radius:6px;padding:14px 16px;font-size:14px;color:#0A0A0B}
      .lps .foot{margin-top:22px;padding-top:10px;border-top:1px solid #D9D9DE;color:#6B6B72;font-size:11.5px;display:flex;justify-content:space-between;gap:24px}
    </style>
    <div class="band"><div>LABELPASS<span>· 표시사항 시트</span></div><div>${m.reviewId ? `검토번호 ${esc(m.reviewId)}` : ''}</div></div>
    <div class="body">
      <h1>${esc(m.productName || '이름 없는 제품')}</h1>
      <p class="meta">${esc(metaLine(m))}</p>
      <h2>표시사항<small>항목별 정리</small></h2>
      <table>${rows}</table>
      <h2>영양성분<small>${esc(m.nutrition.exempt ? '표시 생략(면제 선택)' : (m.nutrition.serving || '1회 제공량 미입력'))}</small></h2>
      ${nut}
      <h2>복사용 표시사항 텍스트<small>라벨 원고로 바로 붙여 넣기</small></h2>
      <div class="copy">${esc(m.copyText)}</div>
      <div class="foot"><div>${esc(FOOTER)}</div><div>labelpass.kr</div></div>
    </div>
  </div>`
}

/** 표시사항 시트 PNG (가로 3000px, 세로는 내용에 따라) */
export async function createLabelPngBlob(data: CreatorData, ctx: SheetCtx = {}): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas')
  const m = buildSheetModel(data, ctx)
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;background:#fff;z-index:-1;'
  host.innerHTML = sheetHtml(m)
  document.body.appendChild(host)
  try {
    await (document.fonts?.ready ?? Promise.resolve())
    const canvas = await html2canvas(host.firstElementChild as HTMLElement, { scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false })
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG 생성 실패'))), 'image/png'))
  } finally {
    document.body.removeChild(host)
  }
}

export function labelPngFilename(data: CreatorData): string {
  return `LabelPass_표시사항시트_${safePdfName(data.productName)}_${kstStamp()}.png`
}
