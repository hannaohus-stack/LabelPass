import { jsPDF } from 'jspdf'

export type DownloadablePdfArtifact = {
  filename: string
  blob: Blob
}

const FONT_NAME = 'NotoSansGothic'
let fontPromise: Promise<string> | null = null

export const PDF_COLORS = {
  heritage: '#002D72',
  ink: '#0A0A0B',
  faint: '#77777B',
  muted: '#A0A0A5',
  hairline: '#D9D9DE',
  paper: '#F7F7F8',
  guide: '#FFF8E1',
  alert: '#B30000',
  alertBg: '#FFF5F5',
  pass: '#006400',
  passBg: '#F3FAF3',
  warn: '#B8860B',
  warnBg: '#FFF9EC',
  viol: '#B30000',
  violBg: '#FFF5F5',
} as const

async function loadFontBase64(): Promise<string> {
  if (!fontPromise) {
    const base = import.meta.env.BASE_URL || '/'
    fontPromise = fetch(`${base}fonts/NotoSansGothic-Regular.ttf`)
      .then(response => {
        if (!response.ok) throw new Error('PDF font load failed')
        return response.arrayBuffer()
      })
      .then(buffer => {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        const chunkSize = 0x8000
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
        }
        return btoa(binary)
      })
  }
  return fontPromise
}

export async function createPdfDoc(): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const fontBase64 = await loadFontBase64()
  doc.addFileToVFS('NotoSansGothic-Regular.ttf', fontBase64)
  doc.addFont('NotoSansGothic-Regular.ttf', FONT_NAME, 'normal')
  doc.setFont(FONT_NAME, 'normal')
  return doc
}

export function saveDocAsArtifact(doc: jsPDF, filename: string): DownloadablePdfArtifact {
  return { filename, blob: doc.output('blob') }
}

export async function createRasterPdfArtifact(html: string, filename: string): Promise<DownloadablePdfArtifact> {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="794" height="1123">
      <foreignObject width="794" height="1123">
        <div xmlns="http://www.w3.org/1999/xhtml">${html}</div>
      </foreignObject>
    </svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const image = await loadImage(url)
    const canvas = document.createElement('canvas')
    canvas.width = 1588
    canvas.height = 2246
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('PDF canvas context unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
    doc.addImage(canvas.toDataURL('image/jpeg', 0.90), 'JPEG', 0, 0, 210, 297)
    return saveDocAsArtifact(doc, filename)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createCanvasPdfArtifact(
  filename: string,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Promise<DownloadablePdfArtifact> {
  const canvas = document.createElement('canvas')
  canvas.width = 1588
  canvas.height = 2246
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('PDF canvas context unavailable')
  ctx.scale(2, 2)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, 794, 1123)
  draw(ctx)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  doc.addImage(canvas.toDataURL('image/jpeg', 0.90), 'JPEG', 0, 0, 210, 297)
  return saveDocAsArtifact(doc, filename)
}

export function drawCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 99,
): number {
  const chars = Array.from(text || '—')
  const lines: string[] = []
  let current = ''
  chars.forEach(char => {
    const next = current + char
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current)
      current = char.trimStart()
    } else {
      current = next
    }
  })
  if (current) lines.push(current)
  lines.slice(0, maxLines).forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight))
  return y + Math.min(lines.length, maxLines) * lineHeight
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('PDF SVG render failed'))
    image.src = url
  })
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

export function safePdfName(value: string): string {
  return (value || '제품').replace(/[\s/\\]/g, '_')
}

export function escapePdfHtml(value: string | number | undefined | null): string {
  return String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function addWrappedText(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options: { maxLines?: number; size?: number; color?: string } = {},
): number {
  if (options.size) doc.setFontSize(options.size)
  if (options.color) doc.setTextColor(options.color)
  const fontSize = options.size ?? 9
  const maxChars = Math.max(8, Math.floor(maxWidth / Math.max(1.6, fontSize * 0.42)))
  const lines = wrapByCharacterCount(text || '—', maxChars)
  const visible = typeof options.maxLines === 'number' ? lines.slice(0, options.maxLines) : lines
  doc.text(visible, x, y)
  return y + visible.length * lineHeight
}

export function drawKeyValueRows(
  doc: jsPDF,
  rows: Array<[string, string]>,
  x: number,
  y: number,
  width: number,
  labelWidth = 42,
): number {
  doc.setDrawColor(230, 230, 232)
  rows.forEach(([label, value]) => {
    const lines = wrapByCharacterCount(value || '—', Math.max(10, Math.floor((width - labelWidth - 8) / 2.7)))
    const rowHeight = Math.max(10, lines.length * 5 + 5)
    doc.setFillColor(247, 247, 248)
    doc.rect(x, y, labelWidth, rowHeight, 'F')
    doc.rect(x, y, width, rowHeight)
    doc.setFontSize(8.5)
    doc.setTextColor(90, 90, 94)
    doc.text(label, x + 3, y + 6)
    doc.setFontSize(9)
    doc.setTextColor(10, 10, 11)
    doc.text(lines, x + labelWidth + 4, y + 6)
    y += rowHeight
  })
  return y
}

export function drawPdfHeader(doc: jsPDF, label: string, dateLabel?: string): void {
  doc.setFillColor(PDF_COLORS.heritage)
  doc.rect(0, 0, 210, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10.5)
  doc.text(`KRK CHECKER · ${label}`, 14, 11.5)
  if (dateLabel) {
    doc.setFontSize(7.5)
    doc.text(dateLabel, 168, 11.5)
  }
}

export function drawPdfFooter(doc: jsPDF, left: string, right = 'krk.team'): void {
  doc.setDrawColor(PDF_COLORS.hairline)
  doc.line(14, 274, 196, 274)
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(7.5)
  doc.text(left, 14, 282)
  doc.text(right, 176, 282)
}

export function drawBusinessBadge(doc: jsPDF, value: string, x: number, y: number, width = 36): void {
  doc.setDrawColor(PDF_COLORS.ink)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(x, y, width, 8, 1.2, 1.2, 'FD')
  doc.setFillColor(PDF_COLORS.heritage)
  doc.circle(x + 4, y + 4, 1.3, 'F')
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(7.5)
  doc.text(value || '사업자 유형', x + 7, y + 5.4)
}

export function drawCropMarks(doc: jsPDF, x: number, y: number, width: number, height: number): void {
  const len = 4
  const gap = 1.3
  doc.setDrawColor(120, 120, 124)
  doc.setLineWidth(0.18)
  doc.line(x - gap - len, y, x - gap, y)
  doc.line(x, y - gap - len, x, y - gap)
  doc.line(x + width + gap, y, x + width + gap + len, y)
  doc.line(x + width, y - gap - len, x + width, y - gap)
  doc.line(x - gap - len, y + height, x - gap, y + height)
  doc.line(x, y + height + gap, x, y + height + gap + len)
  doc.line(x + width + gap, y + height, x + width + gap + len, y + height)
  doc.line(x + width, y + height + gap, x + width, y + height + gap + len)
  doc.setLineWidth(0.2)
}

function wrapByCharacterCount(text: string, maxChars: number): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim()
  if (!normalized) return ['—']
  const lines: string[] = []
  let current = ''

  for (const char of Array.from(normalized)) {
    if (current.length >= maxChars && char !== ' ') {
      lines.push(current)
      current = char
    } else {
      current += char
    }
  }

  if (current) lines.push(current)
  return lines
}
