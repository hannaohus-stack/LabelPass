/**
 * pdfCore — 라벨패스 결과물 PDF 공통 엔진 (텍스트 PDF · v2)
 *
 * - 글자를 이미지가 아니라 텍스트로 넣는다 → 글자 선택·검색 가능, 인쇄 선명.
 * - 한글 폰트: public/fonts/LabelPassSans-{Regular,Bold}.ttf
 *   (Noto Sans CJK KR을 한글 11,172자 + 라틴 + 기호만 남기고 TrueType으로 변환한 서브셋, SIL OFL)
 * - 머리글(파란 띠) · 바닥글(면책 + 쪽번호) · 자동 페이지 넘김 · 표 · 배지 · 메모 상자를 제공한다.
 *
 * 좌표 단위는 mm (A4 세로 210 × 297).
 */
import { jsPDF } from 'jspdf'

export type DownloadablePdfArtifact = { filename: string; blob: Blob }

export const FONT = 'LabelPassSans'

/** 색상 토큰 — 앱 화면(app.css)의 신호등 색과 같은 계열 */
export const C = {
  blue:   '#002D72',
  ink:    '#0A0A0B',
  text:   '#26262B',
  faint:  '#6B6B72',
  muted:  '#A3A3A8',
  line:   '#D9D9DE',
  paper:  '#F4F5F7',
  white:  '#FFFFFF',
  need:   '#B30000', needBg: '#FFF3F3',
  warn:   '#8A6400', warnBg: '#FFF7E3',
  ok:     '#1E7A3A', okBg:   '#EEF8F0',
  info:   '#1F4E9A', infoBg: '#EEF3FC',
} as const

/** 결과 명칭 — 화면 · 리포트 · 가이드 공통 (수정 필요 / 확인 권장 / 기준 충족) */
export const STATUS = {
  violation: { label: '수정 필요', color: C.need, bg: C.needBg },
  warn:      { label: '확인 권장', color: C.warn, bg: C.warnBg },
  pass:      { label: '기준 충족', color: C.ok,   bg: C.okBg },
} as const
export type StatusKey = keyof typeof STATUS

// ─── 날짜 (한국 시간) ───────────────────────────────────────────────────────────

const KST = 'Asia/Seoul'
function kstParts(d: Date) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return { y: get('year'), m: get('month'), d: get('day'), hh: get('hour').replace('24', '00'), mm: get('minute') }
}
/** 파일명용 YYYYMMDD (한국 시간) */
export function kstStamp(d: Date = new Date()): string {
  const { y, m, d: dd } = kstParts(d)
  return `${y}${m}${dd}`
}
/** 표시용 YYYY.MM.DD (한국 시간) */
export function kstDate(d: Date | string = new Date()): string {
  const { y, m, d: dd } = kstParts(typeof d === 'string' ? new Date(d) : d)
  return `${y}.${m}.${dd}`
}
/** 표시용 YYYY.MM.DD HH:mm (한국 시간) */
export function kstDateTime(d: Date | string = new Date()): string {
  const { y, m, d: dd, hh, mm } = kstParts(typeof d === 'string' ? new Date(d) : d)
  return `${y}.${m}.${dd} ${hh}:${mm}`
}

/** 파일 이름에 쓸 수 있게 정리 (한글 유지, 경로 문자만 치환) */
export function safePdfName(value: string): string {
  return (value || '제품').trim().replace(/[\s/\\:*?"<>|]+/g, '_').slice(0, 40)
}

// ─── 폰트 로드 ───────────────────────────────────────────────────────────────

let fontsPromise: Promise<{ regular: string; bold: string }> | null = null

async function fetchBase64(url: string): Promise<string> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`PDF font load failed: ${url}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function loadFonts() {
  if (!fontsPromise) {
    const base = import.meta.env.BASE_URL || '/'
    fontsPromise = Promise.all([
      fetchBase64(`${base}fonts/LabelPassSans-Regular.ttf`),
      fetchBase64(`${base}fonts/LabelPassSans-Bold.ttf`),
    ]).then(([regular, bold]) => ({ regular, bold }))
    fontsPromise.catch(() => { fontsPromise = null })
  }
  return fontsPromise
}

export async function createPdfDoc(): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const f = await loadFonts()
  doc.addFileToVFS('LabelPassSans-Regular.ttf', f.regular)
  doc.addFont('LabelPassSans-Regular.ttf', FONT, 'normal')
  doc.addFileToVFS('LabelPassSans-Bold.ttf', f.bold)
  doc.addFont('LabelPassSans-Bold.ttf', FONT, 'bold')
  doc.setFont(FONT, 'normal')
  return doc
}

export function saveDocAsArtifact(doc: jsPDF, filename: string): DownloadablePdfArtifact {
  return { filename, blob: doc.output('blob') }
}

export function downloadPdfArtifact({ filename, blob }: DownloadablePdfArtifact): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 5_000)
}

// ─── 페이지 작성기 ───────────────────────────────────────────────────────────

export interface TextOpts {
  size?: number
  bold?: boolean
  color?: string
  /** 줄 간격 배수 (기본 1.5) */
  lh?: number
  x?: number
  width?: number
  align?: 'left' | 'right' | 'center'
  /** 글 아래 여백(mm) */
  after?: number
  /** 이 글 뒤에 적어도 이만큼(mm) 같은 장에 남아 있어야 함 (제목 줄이 홀로 남지 않게) */
  keep?: number
}

export interface WriterOpts {
  /** 머리글 띠 왼쪽 글 ("표시사항 시트" 등) */
  header: string
  /** 머리글 띠 오른쪽 글 (검토번호 · 날짜) */
  headerRight?: string
  /** 바닥글 왼쪽 글 (면책 문구) */
  footer: string
}

const PT = 0.3528 // 1pt = 0.3528mm

/**
 * 위에서 아래로 써 내려가는 작성기. 공간이 모자라면 자동으로 다음 장을 만든다.
 * 모든 그리기 함수는 쓰고 난 뒤의 y를 돌려주지 않고 내부 커서(this.y)를 움직인다.
 */
export class PdfWriter {
  readonly pageW = 210
  readonly pageH = 297
  readonly ml = 16
  readonly mr = 16
  readonly top = 27
  readonly bottom = 270
  y = this.top
  private pageNo = 1

  constructor(readonly doc: jsPDF, private readonly opts: WriterOpts) {
    this.drawHeader()
  }

  get contentW() { return this.pageW - this.ml - this.mr }
  get right() { return this.pageW - this.mr }
  get remaining() { return this.bottom - this.y }

  // ── 글꼴 상태 ──
  private setFont(size: number, bold = false, color: string = C.text) {
    this.doc.setFont(FONT, bold ? 'bold' : 'normal')
    this.doc.setFontSize(size)
    this.doc.setTextColor(color)
  }
  private lineH(size: number, lh = 1.5) { return size * PT * lh }

  /** 글자 폭 (mm) — 현재 글꼴 크기 기준 */
  measure(text: string, size: number, bold = false): number {
    this.setFont(size, bold)
    return this.doc.getTextWidth(text)
  }

  /** 한글 친화 줄바꿈: 띄어쓰기 단위로 넣고, 한 단어가 폭을 넘으면 글자 단위로 끊는다 */
  wrap(text: string, width: number, size: number, bold = false): string[] {
    this.setFont(size, bold)
    const tw = (s: string) => this.doc.getTextWidth(s)
    const out: string[] = []
    for (const para of String(text ?? '').split('\n')) {
      if (para.trim() === '') { out.push(''); continue }
      let line = ''
      for (const word of para.split(' ')) {
        const cand = line ? `${line} ${word}` : word
        if (tw(cand) <= width) { line = cand; continue }
        if (line) out.push(line)
        if (tw(word) <= width) { line = word; continue }
        let cur = ''
        for (const ch of word) {
          if (tw(cur + ch) <= width) cur += ch
          else { out.push(cur); cur = ch }
        }
        line = cur
      }
      out.push(line)
    }
    return out
  }

  // ── 페이지 ──
  private drawHeader() {
    const { doc } = this
    doc.setFillColor(C.blue)
    doc.rect(0, 0, this.pageW, 16, 'F')
    this.setFont(9.5, true, C.white)
    doc.text('LABELPASS', this.ml, 10.3)
    const w = doc.getTextWidth('LABELPASS')
    this.setFont(9, false, '#C9D6EE')
    doc.text(`·  ${this.opts.header}`, this.ml + w + 2, 10.3)
    if (this.opts.headerRight) {
      this.setFont(8, false, '#C9D6EE')
      doc.text(this.opts.headerRight, this.right, 10.3, { align: 'right' })
    }
  }

  newPage() {
    this.doc.addPage()
    this.pageNo += 1
    this.y = this.top
    this.drawHeader()
  }

  /** h(mm)만큼 들어갈 자리가 없으면 다음 장으로 */
  ensure(h: number) {
    if (this.y + h > this.bottom) this.newPage()
  }

  space(h: number) { this.y += h }

  // ── 글 ──
  /** 문단 — 줄바꿈·페이지 넘김 처리. 쓴 높이를 돌려준다 */
  text(text: string, o: TextOpts = {}): number {
    const size = o.size ?? 9.5
    const lh = this.lineH(size, o.lh)
    const x = o.x ?? this.ml
    const width = o.width ?? (this.right - x)
    const lines = this.wrap(text, width, size, o.bold)
    if (o.keep) this.ensure(lh + o.keep)
    const start = this.y
    let used = 0
    for (const line of lines) {
      this.ensure(lh)
      if (this.y === this.top && used > 0) { /* 새 장 */ }
      this.setFont(size, o.bold, o.color ?? C.text)
      const tx = o.align === 'right' ? x + width : o.align === 'center' ? x + width / 2 : x
      this.doc.text(line, tx, this.y + size * PT * 0.95, { align: o.align ?? 'left' })
      this.y += lh
      used += lh
    }
    this.y += o.after ?? 0
    return this.y - start
  }

  /** 섹션 제목 (작은 파란 글 + 밑줄) */
  section(title: string, sub?: string) {
    this.ensure(30)
    this.space(2)
    this.setFont(10.5, true, C.blue)
    this.doc.text(title, this.ml, this.y + 3.6)
    if (sub) {
      const w = this.doc.getTextWidth(title)
      this.setFont(8, false, C.faint)
      this.doc.text(sub, this.ml + w + 2.5, this.y + 3.6)
    }
    this.y += 6
    this.doc.setDrawColor(C.line)
    this.doc.setLineWidth(0.25)
    this.doc.line(this.ml, this.y, this.right, this.y)
    this.y += 3
  }

  /** 큰 제목 영역 (문서 제목 + 부제) */
  title(main: string, sub?: string) {
    this.text(main, { size: 18, bold: true, color: C.ink, lh: 1.25, after: 1 })
    if (sub) this.text(sub, { size: 9, color: C.faint, after: 2 })
  }

  rule(color: string = C.line) {
    this.ensure(2)
    this.doc.setDrawColor(color)
    this.doc.setLineWidth(0.25)
    this.doc.line(this.ml, this.y, this.right, this.y)
    this.y += 2
  }

  // ── 배지 ──
  /** 둥근 배지. 그린 폭(mm)을 돌려준다. y는 배지 윗변 */
  badge(label: string, x: number, y: number, color: string, bg: string, size = 7.5): number {
    this.setFont(size, true, color)
    const w = this.doc.getTextWidth(label) + 4
    const h = size * PT + 2.6
    this.doc.setFillColor(bg)
    this.doc.setDrawColor(color)
    this.doc.setLineWidth(0.2)
    this.doc.roundedRect(x, y, w, h, 1, 1, 'FD')
    this.doc.text(label, x + 2, y + h - 1.6)
    return w
  }

  statusBadge(status: StatusKey, x: number, y: number, size = 7.5): number {
    const s = STATUS[status]
    return this.badge(s.label, x, y, s.color, s.bg, size)
  }

  // ── 표 ──
  /**
   * 이름 · 값 표. 한 줄(행)은 쪼개지 않고 통째로 다음 장으로 넘긴다.
   * value가 ''이면 "미입력"을 흐리게 쓴다.
   */
  kv(rows: Array<{ k: string; v: string; sub?: string; missing?: boolean }>, o: { labelW?: number; size?: number } = {}) {
    const labelW = o.labelW ?? 38
    const size = o.size ?? 9
    const lh = this.lineH(size, 1.45)
    const vx = this.ml + labelW + 3
    const vw = this.right - vx - 3
    const pad = 2.2
    for (const r of rows) {
      const missing = r.missing ?? (r.v === '' || r.v == null)
      const value = missing ? '미입력' : r.v
      const lines = this.wrap(value, vw, size)
      const subLines = r.sub ? this.wrap(r.sub, vw, 7.5) : []
      const h = pad * 2 + lines.length * lh + (subLines.length ? subLines.length * this.lineH(7.5, 1.4) + 0.8 : 0)
      this.ensure(h)
      const y0 = this.y
      this.doc.setFillColor(C.paper)
      this.doc.rect(this.ml, y0, labelW, h, 'F')
      this.doc.setDrawColor(C.line)
      this.doc.setLineWidth(0.2)
      this.doc.rect(this.ml, y0, this.contentW, h)
      this.setFont(size - 0.5, true, C.faint)
      this.doc.text(this.wrap(r.k, labelW - 4, size - 0.5, true), this.ml + 2, y0 + pad + size * PT * 0.95)
      this.setFont(size, false, missing ? C.muted : C.ink)
      let ty = y0 + pad + size * PT * 0.95
      for (const line of lines) { this.doc.text(line, vx, ty); ty += lh }
      if (subLines.length) {
        this.setFont(7.5, false, C.faint)
        ty += 0.8 - lh + this.lineH(7.5, 1.4)
        for (const line of subLines) { this.doc.text(line, vx, ty); ty += this.lineH(7.5, 1.4) }
      }
      this.y = y0 + h
    }
    this.y += 2
  }

  /**
   * 열이 여러 개인 표. widths 합 = contentW. 머리 행은 장이 넘어가면 다시 그린다.
   */
  table(head: string[], rows: string[][], widths: number[], o: { size?: number; align?: Array<'left' | 'right' | 'center'>; color?: (text: string, col: number) => string | undefined; boldCols?: number[] } = {}) {
    const size = o.size ?? 8.5
    const lh = this.lineH(size, 1.4)
    const pad = 1.8
    const drawHead = () => {
      const h = this.lineH(size, 1.4) + pad * 2
      this.ensure(h + lh * 2)
      this.doc.setFillColor(C.paper)
      this.doc.rect(this.ml, this.y, this.contentW, h, 'F')
      this.doc.setDrawColor(C.line)
      this.doc.rect(this.ml, this.y, this.contentW, h)
      let x = this.ml
      head.forEach((hd, i) => {
        this.setFont(size - 0.5, true, C.faint)
        const a = o.align?.[i] ?? 'left'
        const tx = a === 'right' ? x + widths[i] - 2 : a === 'center' ? x + widths[i] / 2 : x + 2
        this.doc.text(hd, tx, this.y + pad + size * PT * 0.95, { align: a })
        x += widths[i]
      })
      this.y += h
    }
    drawHead()
    for (const row of rows) {
      const cells = row.map((c, i) => this.wrap(c, widths[i] - 4, size))
      const n = Math.max(...cells.map(c => c.length), 1)
      const h = n * lh + pad * 2
      if (this.y + h > this.bottom) { this.newPage(); drawHead() }
      this.doc.setDrawColor(C.line)
      this.doc.setLineWidth(0.2)
      this.doc.rect(this.ml, this.y, this.contentW, h)
      let x = this.ml
      cells.forEach((lines, i) => {
        if (i > 0) this.doc.line(x, this.y, x, this.y + h)
        this.setFont(size, o.boldCols?.includes(i) ?? false, o.color?.(row[i], i) ?? C.ink)
        const a = o.align?.[i] ?? 'left'
        const tx = a === 'right' ? x + widths[i] - 2 : a === 'center' ? x + widths[i] / 2 : x + 2
        let ty = this.y + pad + size * PT * 0.95
        for (const line of lines) { this.doc.text(line, tx, ty, { align: a }); ty += lh }
        x += widths[i]
      })
      this.y += h
    }
    this.y += 2
  }

  // ── 상자 ──
  /** 색 상자 안의 글 (제목 선택). 한 상자는 쪼개지 않는다 (너무 길면 다음 장) */
  note(body: string, o: { title?: string; color?: string; bg?: string; border?: string; size?: number } = {}) {
    const size = o.size ?? 8.8
    const color = o.color ?? C.text
    const pad = 3
    const w = this.contentW - pad * 2
    const titleLines = o.title ? this.wrap(o.title, w, size, true) : []
    const bodyLines = this.wrap(body, w, size)
    const lhT = this.lineH(size, 1.4)
    const lhB = this.lineH(size, 1.5)
    const h = pad * 2 + titleLines.length * lhT + (titleLines.length ? 1 : 0) + bodyLines.length * lhB
    this.ensure(Math.min(h, this.bottom - this.top))
    const y0 = this.y
    this.doc.setFillColor(o.bg ?? C.paper)
    this.doc.setDrawColor(o.border ?? C.line)
    this.doc.setLineWidth(0.25)
    this.doc.roundedRect(this.ml, y0, this.contentW, h, 1.2, 1.2, 'FD')
    let ty = y0 + pad + size * PT * 0.95
    if (titleLines.length) {
      this.setFont(size, true, o.color ?? C.ink)
      for (const l of titleLines) { this.doc.text(l, this.ml + pad, ty); ty += lhT }
      ty += 1
    }
    this.setFont(size, false, color)
    for (const l of bodyLines) {
      if (ty > this.bottom) break
      this.doc.text(l, this.ml + pad, ty); ty += lhB
    }
    this.y = y0 + h + 2.5
  }

  /** 숫자 타일 3개 (요약) */
  tiles(items: Array<{ n: number | string; label: string; color: string; bg: string }>) {
    const gap = 3
    const w = (this.contentW - gap * (items.length - 1)) / items.length
    const h = 17
    this.ensure(h + 3)
    items.forEach((it, i) => {
      const x = this.ml + i * (w + gap)
      this.doc.setFillColor(it.bg)
      this.doc.setDrawColor(it.bg)
      this.doc.roundedRect(x, this.y, w, h, 1.5, 1.5, 'FD')
      this.setFont(16, true, it.color)
      this.doc.text(String(it.n), x + 4, this.y + 10.5)
      const nw = this.doc.getTextWidth(String(it.n))
      this.setFont(8.5, true, it.color)
      this.doc.text(it.label, x + 4 + nw + 2.5, this.y + 10.5)
    })
    this.y += h + 3
  }

  /** 글머리표 목록 */
  bullets(items: string[], o: { size?: number; color?: string; marker?: string } = {}) {
    const size = o.size ?? 9
    for (const it of items) {
      const lh = this.lineH(size, 1.5)
      const lines = this.wrap(it, this.contentW - 6, size)
      this.ensure(lh)
      this.setFont(size, false, o.color ?? C.text)
      this.doc.text(o.marker ?? '•', this.ml + 1, this.y + size * PT * 0.95)
      for (const line of lines) {
        this.ensure(lh)
        this.setFont(size, false, o.color ?? C.text)
        this.doc.text(line, this.ml + 6, this.y + size * PT * 0.95)
        this.y += lh
      }
    }
  }

  /** 번호 단계 목록 (①②③… 대신 숫자 원) */
  steps(items: string[], o: { size?: number } = {}) {
    const size = o.size ?? 9.2
    const lh = this.lineH(size, 1.5)
    items.forEach((raw, i) => {
      const text = raw.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '').replace(/^\d+[.)]\s*/, '')
      const lines = this.wrap(text, this.contentW - 11, size)
      const h = Math.max(lh, lines.length * lh)
      this.ensure(h + 1.5)
      const cy = this.y + 2.6
      this.doc.setFillColor(C.blue)
      this.doc.circle(this.ml + 3, cy, 2.6, 'F')
      this.setFont(7.5, true, C.white)
      this.doc.text(String(i + 1), this.ml + 3, cy + 0.95, { align: 'center' })
      this.setFont(size, false, C.text)
      let ty = this.y + size * PT * 0.95
      for (const line of lines) { this.doc.text(line, this.ml + 9, ty); ty += lh }
      this.y += h + 1.5
    })
  }

  // ── 마무리 ──
  /** 모든 장에 바닥글(면책 + 쪽번호)을 넣고 문서를 돌려준다 */
  finish(): jsPDF {
    const total = this.doc.getNumberOfPages()
    for (let i = 1; i <= total; i++) {
      this.doc.setPage(i)
      this.doc.setDrawColor(C.line)
      this.doc.setLineWidth(0.25)
      this.doc.line(this.ml, 277, this.right, 277)
      this.setFont(7.2, false, C.faint)
      const lines = this.wrap(this.opts.footer, this.contentW - 30, 7.2)
      lines.slice(0, 2).forEach((l, k) => this.doc.text(l, this.ml, 281.5 + k * 3.6))
      this.setFont(7.2, false, C.faint)
      this.doc.text(`labelpass.kr  ·  ${i} / ${total}`, this.right, 281.5, { align: 'right' })
    }
    this.doc.setPage(total)
    return this.doc
  }
}
