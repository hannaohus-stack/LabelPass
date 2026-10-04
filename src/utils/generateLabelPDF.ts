// generateLabelPDF.ts — PDF ① 식품 라벨 (v5)
// 다운로드 파일명: KRK_라벨_{productName}_{YYYYMMDD}.pdf
// A4 1장 — 전면 라벨(좌) + 후면 라벨(우) 나란히, 크롭 마크 포함
// v5: 법규 GAP 수정 — 열량병기(GAP1), 1399 독립표시(GAP4), 인쇄단위 pt/mm(GAP5), packagingMaterials(GAP6)

import type { CreatorData } from '../pages/creator/types'
import { CATEGORY_OFFICIAL } from './tierUtils'
import {
  addWrappedText,
  createCanvasPdfArtifact,
  createPdfDoc,
  createRasterPdfArtifact,
  downloadPdfArtifact,
  drawBusinessBadge,
  drawCropMarks,
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
const HERITAGE = '#002D72'
const INK      = '#0A0A0B'
const FAINT    = 'rgba(10,10,11,0.45)'
const HAIRLINE = 'rgba(10,10,11,0.12)'
const RULE     = 'rgba(10,10,11,0.15)'
const SYS_WARN = '#B07A1A'

// ─── GAP 6: 포장재 재활용 마크 맵 (식품등의 표시기준 별표 7) ──────────────────────
const RECYCLING_FILE_MAP: Record<string, string> = {
  '페트(PET)':              '/recycling/plastic-pet.svg',
  '고밀도 폴리에틸렌(HDPE)':  '/recycling/plastic-hdpe.svg',
  '폴리염화비닐(PVC)':        '/recycling/plastic-other.svg',
  '저밀도 폴리에틸렌(LDPE)':  '/recycling/plastic-ldpe.svg',
  '폴리프로필렌(PP)':         '/recycling/plastic-pp.svg',
  '폴리스티렌(PS)':           '/recycling/plastic-ps.svg',
  '기타 플라스틱':             '/recycling/plastic-other.svg',
  '유리':                    '/recycling/glass.svg',
  '철':                     '/recycling/can-steel.svg',
  '알루미늄':                 '/recycling/can-aluminum.svg',
  '종이팩':                  '/recycling/paper-pack.svg',
  '멸균팩':                  '/recycling/paper-pack2.svg',
  '도포·첩합류(빨간)':        '/recycling/laminated-red.svg',
  '도포·첩합류(검정)':        '/recycling/laminated-black.svg',
  '골판지':                  '/recycling/paper.svg',
  '일반 종이':               '/recycling/paper.svg',
  '비닐류':                  '/recycling/vinyl-ldpe.svg',
  '스티로폼':                '/recycling/plastic-ps.svg',
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

/** 크롭 마크 SVG (라벨 모서리) */
const CROP_MARKS = `
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:visible;" xmlns="http://www.w3.org/2000/svg">
    <!-- 좌상 -->
    <line x1="-8" y1="0"  x2="-2" y2="0"  stroke="${RULE}" stroke-width="0.5"/>
    <line x1="0"  y1="-8" x2="0"  y2="-2" stroke="${RULE}" stroke-width="0.5"/>
    <!-- 우상 -->
    <line x1="100%" y1="0"  x2="calc(100% + 8px)" y2="0"  stroke="${RULE}" stroke-width="0.5" transform="translate(2,0)"/>
    <line x1="100%" y1="-8" x2="100%"              y2="-2" stroke="${RULE}" stroke-width="0.5"/>
    <!-- 좌하 -->
    <line x1="-8" y1="100%" x2="-2" y2="100%"              stroke="${RULE}" stroke-width="0.5"/>
    <line x1="0"  y1="100%" x2="0"  y2="calc(100% + 8px)" stroke="${RULE}" stroke-width="0.5" transform="translate(0,2)"/>
    <!-- 우하 -->
    <line x1="100%" y1="100%" x2="calc(100% + 8px)" y2="100%" stroke="${RULE}" stroke-width="0.5" transform="translate(2,0)"/>
    <line x1="100%" y1="100%" x2="100%" y2="calc(100% + 8px)" stroke="${RULE}" stroke-width="0.5" transform="translate(0,2)"/>
  </svg>`

/** 바코드 바 (EAN-13 모의) */
const BARCODE_BARS = (() => {
  const widths = [2,1,3,1,2,2,1,3,1,1,2,1,3,2,1,2,1,3,1,2,1,2,3,1,2,1,1,2,3,1,2,1]
  return widths.map((w, i) =>
    `<div style="width:${w}px;height:100%;background:${i%2===0 ? INK : 'transparent'};flex-shrink:0;"></div>`
  ).join('')
})()

/** 재활용 마크 — GAP6: imgSrc 지원 (없으면 원형 화살표 fallback) */
const recycleMark = (label: string, imgSrc?: string) => `
  <div style="display:flex;flex-direction:column;align-items:center;gap:0.5mm;">
    ${imgSrc
      ? `<img src="${imgSrc}" alt="${label}" style="width:5mm;height:5mm;object-fit:contain;" />`
      : `<div style="width:5mm;height:5mm;border:0.4mm solid ${INK};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:6pt;font-weight:700;">↻</div>`
    }
    <span style="font-size:5pt;font-weight:600;letter-spacing:0.04em;">${label}</span>
  </div>`

// ─── 전면 라벨 HTML ────────────────────────────────────────────────────────────

function buildFrontLabel(data: CreatorData, isBeta: boolean): string {
  const officialCategory = data.categories.length > 0
    ? CATEGORY_OFFICIAL[data.categories[0]] ?? data.categories[0]
    : '식품'

  // GAP 1: 내용량에 열량 병기 (식품등의 표시기준 제5조 ①항)
  // 영양성분 면제 사업장은 열량 미기입 → 병기 생략
  const weightDisplay = (() => {
    const weight = `${data.totalWeight || '—'} ${data.unit}`
    if (!data.nutritionExempted && data.calories) {
      return `${weight}&nbsp;<span style="font-size:10pt;font-weight:500;color:${FAINT};">(${data.calories}kcal)</span>`
    }
    return weight
  })()

  return `
  <div style="position:relative;width:80mm;height:115mm;border:0.25mm solid ${RULE};
    padding:6mm 5mm;box-sizing:border-box;background:#fff;
    display:flex;flex-direction:column;font-family:'Pretendard Variable',Pretendard,sans-serif;color:${INK};">
    ${CROP_MARKS}

    <!-- Brand strip + 베타 마크 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2mm;">
      <div style="font-family:Inter,system-ui,sans-serif;font-size:7pt;letter-spacing:0.22em;text-transform:uppercase;color:${FAINT};">
        ${(data.manufacturer || 'MANUFACTURER').toUpperCase()}
      </div>
      ${isBeta ? `<span style="font-family:Inter,system-ui,sans-serif;font-size:7pt;font-weight:600;letter-spacing:0.12em;color:${SYS_WARN};padding:0.5mm 1.5mm;border:0.25mm solid ${SYS_WARN};">BETA</span>` : ''}
    </div>

    <!-- 식품유형 배지 (Heritage 배경) -->
    <div style="display:inline-flex;align-self:flex-start;padding:0.8mm 2.5mm;
      background:${HERITAGE};color:#fff;font-size:8pt;font-weight:600;
      letter-spacing:0.06em;margin-bottom:4mm;">
      식품유형 · ${officialCategory}
    </div>

    <!-- 제품명 -->
    <h1 style="margin:0;font-size:25pt;font-weight:700;line-height:1.05;
      letter-spacing:-0.02em;color:${INK};word-break:keep-all;">
      ${data.productName || '제품명'}
    </h1>
    <div style="font-family:Inter,system-ui,sans-serif;font-size:8pt;font-weight:400;
      letter-spacing:0.14em;text-transform:uppercase;color:${FAINT};margin-top:1.5mm;margin-bottom:4mm;">
      FOOD PRODUCT
    </div>

    <!-- 이미지 플레이스홀더 -->
    <div style="flex:1;background:repeating-linear-gradient(135deg,rgba(0,45,114,0.05) 0 6px,rgba(0,45,114,0.08) 6px 12px);
      border:0.25mm solid ${HAIRLINE};display:flex;align-items:center;justify-content:center;
      font-family:'JetBrains Mono',ui-monospace,monospace;font-size:7pt;
      color:rgba(0,45,114,0.4);letter-spacing:0.04em;margin-bottom:3mm;">
      product shot
    </div>

    <!-- 내용량 (GAP 1: 열량 병기) -->
    <div style="display:flex;justify-content:space-between;align-items:baseline;
      padding-top:2.5mm;border-top:0.25mm solid ${HAIRLINE};">
      <span style="font-size:7pt;letter-spacing:0.16em;text-transform:uppercase;color:${FAINT};">
        내용량 / NET WT
      </span>
      <span style="font-family:Inter,system-ui,sans-serif;font-weight:600;font-size:14pt;letter-spacing:-0.01em;">
        ${weightDisplay}
      </span>
    </div>
  </div>`
}

// ─── 후면 라벨 HTML ────────────────────────────────────────────────────────────

function buildBackLabel(data: CreatorData, appOrigin: string): string {
  // 원재료 정렬 + 퍼센트 계산
  const totalW = data.ingredients.reduce((s, i) => s + (parseFloat(i.weight) || 0), 0)
  const sortedIngs = [...data.ingredients].sort((a, b) => (parseFloat(b.weight)||0) - (parseFloat(a.weight)||0))

  const allergenNames = new Set(
    (data.detectedAllergens ?? []).map(a => a.name)
  )
  // ingredient 이름이 알레르겐이면 bold
  const ingredientHtml = sortedIngs.map((ing, i) => {
    const pct  = totalW > 0 ? `(${((parseFloat(ing.weight)||0)/totalW*100).toFixed(1)}%)` : ''
    const text = `${ing.name}${pct}`
    const bold = ing.isAllergen || allergenNames.has(ing.name)
    return `<span style="${bold ? `font-weight:700;` : ''}">${text}</span>${i < sortedIngs.length-1 ? '<span style="color:'+FAINT+';">, </span>' : ''}`
  }).join('')

  // 알레르겐 경고 박스
  const allergens = [...new Set([
    ...sortedIngs.filter(i => i.isAllergen).map(i => i.name),
    ...(data.detectedAllergens ?? []).map(a => a.name),
  ])]
  const allergenBoxHtml = allergens.length > 0 ? `
    <div style="margin:1.5mm 0;padding:1.5mm 2mm;border:0.4mm solid ${HERITAGE};
      background:rgba(0,45,114,0.04);display:flex;gap:2mm;align-items:flex-start;">
      <span style="font-weight:700;color:${HERITAGE};font-size:8pt;line-height:1;flex-shrink:0;">⚠</span>
      <div>
        <div style="font-weight:700;color:${HERITAGE};font-size:7pt;letter-spacing:0.08em;
          text-transform:uppercase;margin-bottom:0.5mm;">알레르기 유발물질</div>
        <div style="font-weight:700;color:${INK};font-size:8pt;">
          ${allergens.join(' · ')} 함유
        </div>
        <div style="color:${FAINT};font-size:7pt;margin-top:0.5mm;">
          같은 제조시설에서 우유·대두를 사용한 제품 생산
        </div>
      </div>
    </div>` : ''

  // 영양성분 섹션
  const nutritionHtml = data.nutritionExempted
    ? `<div style="margin:1.5mm 0;padding:1.5mm 2mm;border:0.25mm dashed ${HAIRLINE};
        background:rgba(10,10,11,0.02);font-size:7pt;color:${FAINT};line-height:1.5;">
        <b style="color:${INK};font-weight:600;">소규모 제조업 면제 적용</b><br/>
        식품등의 표시기준에 따라 영양성분 표시가 면제되는 사업장입니다.
      </div>`
    : (() => {
        const rows = [
          { k: '열량',     v: data.calories   ? `${data.calories}kcal`  : '—' },
          { k: '탄수화물', v: data.totalCarbs  ? `${data.totalCarbs}g`   : '—' },
          { k: '└ 당류',  v: data.sugar       ? `${data.sugar}g`        : '—' },
          { k: '단백질',   v: data.protein     ? `${data.protein}g`      : '—' },
          { k: '지방',     v: data.totalFat    ? `${data.totalFat}g`     : '—' },
          { k: '나트륨',   v: data.sodium      ? `${data.sodium}mg`      : '—' },
        ]
        const hasAny = rows.some(r => r.v !== '—')
        if (!hasAny) return `<div style="margin:1.5mm 0;color:${FAINT};font-size:7pt;">영양성분 정보 없음</div>`
        return `
          <div style="margin:1.5mm 0;">
            <div style="font-size:6pt;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;
              color:${FAINT};margin-bottom:0.8mm;">영양성분 / 1회 제공량 기준</div>
            <table style="width:100%;border-collapse:collapse;font-size:7pt;">
              <tbody>
                ${rows.map(r => `
                  <tr style="border-bottom:0.25mm solid ${HAIRLINE};">
                    <td style="padding:0.7mm 0;">${r.k}</td>
                    <td style="padding:0.7mm 0;text-align:right;font-family:Inter,system-ui,sans-serif;font-weight:500;">${r.v}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
            <div style="font-size:6pt;color:${FAINT};margin-top:0.8mm;">
              ※ 1일 영양성분 기준치에 대한 비율
            </div>
          </div>`
      })()

  const row = (label: string, value: string) => `
    <div style="display:flex;gap:1.5mm;padding:1mm 0;border-bottom:0.25mm solid ${HAIRLINE};font-size:8pt;">
      <div style="width:14mm;flex-shrink:0;font-weight:600;color:${FAINT};letter-spacing:0.04em;">${label}</div>
      <div style="flex:1;color:${INK};line-height:1.4;">${value}</div>
    </div>`

  // GAP 6: packagingMaterials 기반 재활용 마크 생성
  // appOrigin은 생성 시점의 window.location.origin (앱 서버 URL)
  const materials = data.packagingMaterials ?? []
  const recycleMarksHtml = materials.length > 0
    ? materials.map(m => {
        const svgPath = RECYCLING_FILE_MAP[m]
        const imgSrc  = svgPath ? `${appOrigin}${svgPath}` : undefined
        return recycleMark(m, imgSrc)
      }).join('')
    : recycleMark('재활용') // fallback: 포장재 미입력

  return `
  <div style="position:relative;width:80mm;height:115mm;border:0.25mm solid ${RULE};
    padding:4mm 3.7mm;box-sizing:border-box;background:#fff;
    display:flex;flex-direction:column;
    font-family:'Pretendard Variable',Pretendard,sans-serif;color:${INK};font-size:8pt;line-height:1.45;">
    ${CROP_MARKS}

    <!-- 헤더 -->
    <div style="display:flex;justify-content:space-between;align-items:baseline;
      padding-bottom:1.5mm;margin-bottom:2mm;border-bottom:0.25mm solid ${RULE};">
      <div style="font-weight:700;font-size:8pt;letter-spacing:-0.01em;">
        ${data.productName || '제품명'} · ${data.totalWeight || '—'}${data.unit}
      </div>
      <div style="font-size:6pt;color:${FAINT};letter-spacing:0.12em;text-transform:uppercase;">
        표시사항 / BACK
      </div>
    </div>

    <!-- 원재료명 -->
    ${row('원재료명 및 함량', `<span style="font-size:7pt;line-height:1.55;">${ingredientHtml || '—'}</span>`)}

    <!-- 알레르기 경고 -->
    ${allergenBoxHtml}

    <!-- 소비기한 / 보관방법 -->
    ${row('소비기한', data.expiryDate ? `${data.expiryDate.replace(/-/g,'.')} 까지` : '—')}
    ${row('보관방법', data.storage || '—')}

    <!-- 영양성분 -->
    ${nutritionHtml}

    <!-- 제조원 -->
    ${row('제조원', data.manufacturer || '—')}
    ${row('반품/교환', '구입처 또는 제조원에 문의')}

    <!-- GAP 4: 부정·불량식품 신고 1399 — 독립 의무 표시 (식품표시법 제10조) -->
    <div style="margin:1mm 0;padding:1mm 2mm;
      background:rgba(0,45,114,0.03);border:0.25mm solid rgba(0,45,114,0.15);
      display:flex;align-items:center;gap:2mm;">
      <span style="font-size:7pt;font-weight:600;color:${INK};letter-spacing:0.02em;">부정·불량식품 신고</span>
      <span style="font-family:Inter,system-ui,sans-serif;font-size:10pt;font-weight:700;
        color:${HERITAGE};letter-spacing:0.04em;">1399</span>
    </div>

    <!-- 하단: 바코드 + 재활용 마크 (GAP 6) -->
    <div style="margin-top:auto;padding-top:1.5mm;border-top:0.25mm solid ${HAIRLINE};
      display:flex;justify-content:space-between;align-items:flex-end;gap:2mm;">
      <div>
        <div style="display:flex;align-items:flex-end;height:6mm;gap:0;">
          ${BARCODE_BARS}
        </div>
        <div style="font-family:Inter,system-ui,sans-serif;font-size:6pt;letter-spacing:0.18em;margin-top:0.5mm;">
          8 809123 456789
        </div>
      </div>
      <div style="display:flex;gap:1.5mm;flex-wrap:wrap;max-width:20mm;justify-content:flex-end;">
        ${recycleMarksHtml}
      </div>
    </div>
  </div>`
}

// ─── 메인 함수 ─────────────────────────────────────────────────────────────────

// HTML 기반 라벨 시안은 참고용으로 남겨두고, 실제 다운로드는 아래 jsPDF 바이너리 생성 함수를 사용합니다.
void buildFrontLabel
void buildBackLabel

export async function createLabelPDFArtifact(data: CreatorData): Promise<DownloadablePdfArtifact> {
  const dateStr    = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const safeName   = safePdfName(data.productName)
  const filename   = `KRK_라벨_${safeName}_${dateStr}.pdf`
  const officialLabelCategory = data.categories.length > 0
    ? CATEGORY_OFFICIAL[data.categories[0]] ?? data.categories[0]
    : '식품'
  const labelTotalIngredientWeight = data.ingredients.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
  const labelIngredients = data.ingredients
    .slice()
    .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
    .map(item => {
      const pct = labelTotalIngredientWeight > 0 && item.weight
        ? ` ${(parseFloat(item.weight) / labelTotalIngredientWeight * 100).toFixed(1)}%`
        : item.weight
        ? ` ${item.weight}g`
        : ''
      return `${item.name}${pct}`
    })
    .join(', ') || '—'
  const labelAllergens = Array.from(new Set([
    ...data.ingredients.filter(item => item.isAllergen).map(item => item.name),
    ...data.detectedAllergens.map(item => item.name),
  ]))
  const labelNutrition = data.nutritionExempted
    ? '소규모 제조업 영양성분 표시 면제 적용'
    : [
        data.calories && `열량 ${data.calories}kcal`,
        data.totalCarbs && `탄수화물 ${data.totalCarbs}g`,
        data.sugar && `당류 ${data.sugar}g`,
        data.totalFat && `지방 ${data.totalFat}g`,
        data.saturatedFat && `포화지방 ${data.saturatedFat}g`,
        data.transFat && `트랜스지방 ${data.transFat}g`,
        data.cholesterol && `콜레스테롤 ${data.cholesterol}mg`,
        data.protein && `단백질 ${data.protein}g`,
        data.sodium && `나트륨 ${data.sodium}mg`,
      ].filter(Boolean).join(' · ') || '—'
  const crop = '<span style="position:absolute;width:18px;height:18px;border-color:#9A9AA0;"></span>'

  return createCanvasPdfArtifact(filename, ctx => {
    ctx.fillStyle = HERITAGE
    ctx.fillRect(0, 0, 794, 68)
    ctx.fillStyle = '#fff'
    ctx.font = '700 15px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('KRK CHECKER · PDF-01', 54, 42)
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(new Date().toLocaleDateString('ko-KR'), 650, 42)

    ctx.fillStyle = INK
    ctx.font = '700 24px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`식품 라벨 인쇄용 · ${data.productName || '제품명'}`, 54, 112)
    ctx.fillStyle = '#77777B'
    ctx.font = '12px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('전면 라벨과 후면 라벨을 A4 한 장에 배치했습니다. 인쇄 시 실제 크기 100% 옵션을 사용하세요.', 54, 132)
    ctx.strokeStyle = INK
    ctx.strokeRect(610, 92, 130, 34)
    ctx.fillStyle = HERITAGE
    ctx.beginPath()
    ctx.arc(626, 109, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = INK
    ctx.font = '12px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(data.businessType || '사업자 유형', 638, 114)

    const frontX = 58
    const labelY = 192
    const labelW = 302
    const labelH = 435
    const backX = 432
    const cropMarks = (x: number, y: number, w: number, h: number) => {
      ctx.strokeStyle = '#9A9AA0'
      ctx.lineWidth = 1
      ;[[x - 18, y, x - 8, y], [x, y - 18, x, y - 8], [x + w + 8, y, x + w + 18, y], [x + w, y - 18, x + w, y - 8], [x - 18, y + h, x - 8, y + h], [x, y + h + 8, x, y + h + 18], [x + w + 8, y + h, x + w + 18, y + h], [x + w, y + h + 8, x + w, y + h + 18]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      })
    }
    cropMarks(frontX, labelY, labelW, labelH)
    cropMarks(backX, labelY, labelW, labelH)
    ctx.strokeStyle = INK
    ctx.strokeRect(frontX, labelY, labelW, labelH)
    ctx.strokeRect(backX, labelY, labelW, labelH)

    ctx.fillStyle = '#77777B'
    ctx.font = '10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText((data.manufacturer || 'MANUFACTURER').toUpperCase(), frontX + 20, labelY + 30)
    ctx.fillText('KRK · PDF-01', frontX + 210, labelY + 30)
    ctx.fillStyle = HERITAGE
    ctx.fillRect(frontX + 20, labelY + 50, 150, 26)
    ctx.fillStyle = '#fff'
    ctx.font = '700 11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`식품유형 · ${officialLabelCategory}`, frontX + 30, labelY + 68)
    ctx.fillStyle = INK
    ctx.font = '700 36px "Apple SD Gothic Neo", system-ui'
    drawCanvasText(ctx, data.productName || '제품명', frontX + 20, labelY + 126, 252, 42, 2)
    ctx.fillStyle = '#77777B'
    ctx.font = '11px system-ui'
    ctx.fillText('FOOD PRODUCT', frontX + 20, labelY + 212)
    ctx.fillStyle = '#F4F7FB'
    ctx.fillRect(frontX + 20, labelY + 240, 262, 90)
    ctx.strokeStyle = '#D9D9DE'
    ctx.strokeRect(frontX + 20, labelY + 240, 262, 90)
    ctx.fillStyle = '#6F86A6'
    ctx.font = '11px system-ui'
    ctx.fillText('PRODUCT SHOT', frontX + 105, labelY + 292)
    ctx.strokeStyle = '#D9D9DE'
    ctx.beginPath()
    ctx.moveTo(frontX + 20, labelY + 360)
    ctx.lineTo(frontX + 282, labelY + 360)
    ctx.stroke()
    ctx.fillStyle = '#77777B'
    ctx.font = '10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('내용량 · 열량', frontX + 20, labelY + 394)
    ctx.fillStyle = INK
    ctx.font = '700 20px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`${data.totalWeight || '—'}${data.unit}${!data.nutritionExempted && data.calories ? ` (${data.calories}kcal)` : ''}`, frontX + 138, labelY + 394)

    ctx.fillStyle = INK
    ctx.font = '700 12px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(`${data.productName || '제품명'} · ${data.totalWeight || '—'}${data.unit}`, backX + 18, labelY + 28)
    ctx.fillStyle = '#77777B'
    ctx.font = '10px system-ui'
    ctx.fillText('BACK', backX + 250, labelY + 28)
    ctx.strokeStyle = '#D9D9DE'
    ctx.beginPath()
    ctx.moveTo(backX + 18, labelY + 42)
    ctx.lineTo(backX + 284, labelY + 42)
    ctx.stroke()
    ctx.fillStyle = '#77777B'
    ctx.font = '700 10px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('원재료명 및 함량', backX + 18, labelY + 62)
    ctx.fillStyle = INK
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    let y = drawCanvasText(ctx, labelIngredients, backX + 18, labelY + 82, 266, 17, 3)
    ctx.strokeStyle = HERITAGE
    ctx.fillStyle = 'rgba(0,45,114,.04)'
    ctx.fillRect(backX + 18, y + 6, 266, 54)
    ctx.strokeRect(backX + 18, y + 6, 266, 54)
    ctx.fillStyle = HERITAGE
    ctx.font = '700 11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('알레르기 유발물질', backX + 30, y + 28)
    ctx.fillStyle = INK
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText(labelAllergens.length ? `${labelAllergens.join(', ')} 함유` : '해당 없음', backX + 30, y + 46)
    y += 82
    const infoRow = (label: string, value: string, maxLines = 1) => {
      ctx.fillStyle = '#77777B'
      ctx.font = '700 10px "Apple SD Gothic Neo", system-ui'
      ctx.fillText(label, backX + 18, y)
      ctx.fillStyle = INK
      ctx.font = '10.5px "Apple SD Gothic Neo", system-ui'
      y = drawCanvasText(ctx, value, backX + 78, y, 204, 15, maxLines) + 5
    }
    infoRow('소비기한', data.expiryDate || '별도 표기')
    infoRow('보관방법', data.storage || '—', 2)
    infoRow('영양성분', labelNutrition, 2)
    infoRow('제조원', data.manufacturer || '—')
    infoRow('제조유형', data.businessType || '—')
    ctx.fillStyle = INK
    ctx.fillRect(backX + 18, labelY + 348, 266, 34)
    ctx.fillStyle = '#fff'
    ctx.font = '700 11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('부정·불량식품 신고는 국번 없이', backX + 30, labelY + 370)
    ctx.font = '800 16px system-ui'
    ctx.fillText('1399', backX + 242, labelY + 370)
    ctx.fillStyle = INK
    for (let i = 0; i < 32; i += 2) ctx.fillRect(backX + 20 + i * 3, labelY + 394, i % 4 === 0 ? 4 : 2, 30)
    ctx.fillStyle = '#77777B'
    ctx.font = '9px system-ui'
    ctx.fillText('8 809123 456789', backX + 20, labelY + 436)

    ctx.fillStyle = '#77777B'
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('전면 / FRONT', frontX, 670)
    ctx.fillText('후면 / BACK', backX, 670)
    ctx.strokeStyle = '#D9D9DE'
    ctx.beginPath()
    ctx.moveTo(54, 734)
    ctx.lineTo(740, 734)
    ctx.stroke()
    ctx.fillStyle = INK
    ctx.font = '700 12px "Apple SD Gothic Neo", system-ui'
    ctx.fillText('인쇄 안내', 54, 764)
    ctx.fillText('부착 안내', 280, 764)
    ctx.fillText('법적 고지', 506, 764)
    ctx.fillStyle = '#77777B'
    ctx.font = '11px "Apple SD Gothic Neo", system-ui'
    drawCanvasText(ctx, 'PDF를 실제 크기 100%로 출력한 뒤 크롭 마크 기준으로 재단하세요.', 54, 788, 180, 17, 3)
    drawCanvasText(ctx, '용기 재질과 냉장/상온 환경에서 라벨 번짐 여부를 확인하세요.', 280, 788, 180, 17, 3)
    drawCanvasText(ctx, '본 라벨은 입력값 기반 자동 생성 초안이며, 최종 표시는 사업자가 확인해야 합니다.', 506, 788, 190, 17, 3)
    ctx.fillText('식품 라벨 인쇄용 · 표시 기준 참고 산출물', 54, 1032)
    ctx.fillText('krk.team', 680, 1032)
  })

  const html = `
    <section style="width:794px;height:1123px;box-sizing:border-box;background:#fff;color:${INK};
      font-family:Pretendard,'Apple SD Gothic Neo',system-ui,sans-serif;padding:0;">
      <div style="height:68px;background:${HERITAGE};color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 54px;box-sizing:border-box;">
        <div style="font-size:15px;font-weight:700;letter-spacing:0.08em;">KRK CHECKER · PDF-01</div>
        <div style="font-size:11px;opacity:.8;">${new Date().toLocaleDateString('ko-KR')}</div>
      </div>
      <div style="padding:34px 54px 0;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;">
          <div>
            <div style="font-size:24px;font-weight:700;letter-spacing:-.02em;">식품 라벨 인쇄용 · ${data.productName || '제품명'}</div>
            <div style="margin-top:8px;font-size:12px;color:${FAINT};">전면 라벨과 후면 라벨을 A4 한 장에 배치했습니다. 인쇄 시 실제 크기 100% 옵션을 사용하세요.</div>
          </div>
          <div style="border:1px solid ${INK};padding:8px 14px;font-size:12px;min-width:118px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${HERITAGE};margin-right:8px;"></span>${data.businessType || '사업자 유형'}
          </div>
        </div>
        <div style="display:flex;gap:40px;justify-content:center;align-items:flex-start;">
          <div style="position:relative;width:302px;height:435px;border:1px solid ${INK};box-sizing:border-box;padding:22px 20px;background:#fff;">
            ${crop}<span style="position:absolute;left:-16px;top:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;left:-1px;top:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;right:-16px;top:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;right:-1px;top:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;left:-16px;bottom:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;left:-1px;bottom:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;right:-16px;bottom:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;right:-1px;bottom:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <div style="display:flex;justify-content:space-between;font-size:10px;color:${FAINT};letter-spacing:.18em;text-transform:uppercase;">
              <span>${escapePdfHtml(data.manufacturer || 'MANUFACTURER')}</span><span>KRK · PDF-01</span>
            </div>
            <div style="display:inline-block;background:${HERITAGE};color:#fff;font-size:11px;font-weight:700;padding:5px 10px;margin-top:18px;">식품유형 · ${escapePdfHtml(officialLabelCategory)}</div>
            <h2 style="font-size:36px;line-height:1.1;letter-spacing:-.03em;margin:24px 0 8px;word-break:keep-all;">${escapePdfHtml(data.productName || '제품명')}</h2>
            <div style="font-size:11px;letter-spacing:.14em;color:${FAINT};">FOOD PRODUCT</div>
            <div style="height:90px;border:1px solid ${HAIRLINE};background:repeating-linear-gradient(135deg,rgba(0,45,114,.05) 0 8px,rgba(0,45,114,.09) 8px 16px);display:flex;align-items:center;justify-content:center;color:#6F86A6;font-size:11px;letter-spacing:.12em;margin-top:24px;">PRODUCT SHOT</div>
            <div style="border-top:1px solid ${HAIRLINE};margin-top:28px;padding-top:15px;display:flex;justify-content:space-between;align-items:flex-end;">
              <span style="font-size:10px;color:${FAINT};letter-spacing:.14em;">내용량 · 열량</span>
              <strong style="font-size:20px;">${escapePdfHtml(data.totalWeight || '—')}${escapePdfHtml(data.unit)}${!data.nutritionExempted && data.calories ? ` (${escapePdfHtml(data.calories)}kcal)` : ''}</strong>
            </div>
          </div>
          <div style="position:relative;width:302px;height:435px;border:1px solid ${INK};box-sizing:border-box;padding:18px 18px;background:#fff;font-size:11px;line-height:1.45;">
            <span style="position:absolute;left:-16px;top:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;left:-1px;top:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;right:-16px;top:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;right:-1px;top:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;left:-16px;bottom:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;left:-1px;bottom:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <span style="position:absolute;right:-16px;bottom:-1px;width:10px;border-top:1px solid #9A9AA0;"></span><span style="position:absolute;right:-1px;bottom:-16px;height:10px;border-left:1px solid #9A9AA0;"></span>
            <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:8px;"><span>${escapePdfHtml(data.productName || '제품명')} · ${escapePdfHtml(data.totalWeight || '—')}${escapePdfHtml(data.unit)}</span><span style="color:${FAINT};font-size:10px;">BACK</span></div>
            <div style="border-top:1px solid ${HAIRLINE};padding-top:9px;"><b style="display:block;color:${FAINT};font-size:10px;margin-bottom:4px;">원재료명 및 함량</b>${escapePdfHtml(labelIngredients)}</div>
            <div style="border:1px solid ${HERITAGE};background:rgba(0,45,114,.04);padding:9px 10px;margin-top:10px;"><b style="display:block;color:${HERITAGE};font-size:11px;">알레르기 유발물질</b><span>${escapePdfHtml(labelAllergens.length ? `${labelAllergens.join(', ')} 함유` : '해당 없음')}</span></div>
            <div style="display:grid;grid-template-columns:58px 1fr;gap:6px 10px;border-top:1px solid ${HAIRLINE};margin-top:10px;padding-top:9px;">
              <b style="color:${FAINT};font-size:10px;">소비기한</b><span>${escapePdfHtml(data.expiryDate || '별도 표기')}</span>
              <b style="color:${FAINT};font-size:10px;">보관방법</b><span>${escapePdfHtml(data.storage || '—')}</span>
              <b style="color:${FAINT};font-size:10px;">영양성분</b><span>${escapePdfHtml(labelNutrition)}</span>
              <b style="color:${FAINT};font-size:10px;">제조원</b><span>${escapePdfHtml(data.manufacturer || '—')}</span>
              <b style="color:${FAINT};font-size:10px;">제조유형</b><span>${escapePdfHtml(data.businessType || '—')}</span>
            </div>
            <div style="background:${INK};color:#fff;margin-top:12px;padding:8px 10px;display:flex;justify-content:space-between;font-weight:700;"><span>부정·불량식품 신고는 국번 없이</span><span>1399</span></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:10px;">
              <div><div style="height:30px;width:118px;background:repeating-linear-gradient(90deg,#000 0 2px,transparent 2px 5px,#000 5px 6px,transparent 6px 9px);"></div><div style="font-size:9px;color:${FAINT};letter-spacing:.12em;">8 809123 456789</div></div>
              <div style="display:flex;gap:8px;color:${FAINT};font-size:9px;text-align:center;"><span style="display:block;width:34px;height:34px;border:1px dashed ${HAIRLINE};"></span><span style="display:block;width:34px;height:34px;border:1px dashed ${HAIRLINE};"></span></div>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:40px;justify-content:center;margin-top:12px;font-size:11px;color:${FAINT};letter-spacing:.08em;">
          <div style="width:80mm;">전면 / FRONT</div>
          <div style="width:80mm;">후면 / BACK</div>
        </div>
        <div style="border-top:1px solid ${HAIRLINE};margin-top:40px;padding-top:22px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px;font-size:11px;line-height:1.65;color:${FAINT};">
          <div><b style="display:block;color:${INK};font-size:12px;margin-bottom:4px;">인쇄 안내</b>PDF를 실제 크기 100%로 출력한 뒤 크롭 마크 기준으로 재단하세요.</div>
          <div><b style="display:block;color:${INK};font-size:12px;margin-bottom:4px;">부착 안내</b>용기 재질과 냉장/상온 환경에서 라벨 번짐 여부를 확인하세요.</div>
          <div><b style="display:block;color:${INK};font-size:12px;margin-bottom:4px;">법적 고지</b>본 라벨은 입력값 기반 자동 생성 초안이며, 최종 표시는 사업자가 확인해야 합니다.</div>
        </div>
        <div style="border-top:1px solid ${HAIRLINE};margin-top:42px;padding-top:12px;display:flex;justify-content:space-between;font-size:10px;color:${FAINT};">
          <span>식품 라벨 인쇄용 · 표시 기준 참고 산출물</span><span>krk.team</span>
        </div>
      </div>
    </section>`

  return createRasterPdfArtifact(html, filename)

  const doc = await createPdfDoc()
  const officialCategory = data.categories.length > 0
    ? CATEGORY_OFFICIAL[data.categories[0]] ?? data.categories[0]
    : '식품'
  const totalIngredientWeight = data.ingredients.reduce((sum, item) => sum + (parseFloat(item.weight) || 0), 0)
  const ingredients = data.ingredients
    .slice()
    .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
    .map(item => {
      const pct = totalIngredientWeight > 0 && item.weight
        ? ` ${(parseFloat(item.weight) / totalIngredientWeight * 100).toFixed(1)}%`
        : item.weight
        ? ` ${item.weight}g`
        : ''
      return `${item.name}${pct}`
    })
    .join(', ') || '—'
  const allergens = Array.from(new Set([
    ...data.ingredients.filter(item => item.isAllergen).map(item => item.name),
    ...data.detectedAllergens.map(item => item.name),
  ]))
  const nutrition = data.nutritionExempted
    ? '소규모 제조업 영양성분 표시 면제 적용'
    : [
        data.calories && `열량 ${data.calories}kcal`,
        data.totalCarbs && `탄수화물 ${data.totalCarbs}g`,
        data.sugar && `당류 ${data.sugar}g`,
        data.totalFat && `지방 ${data.totalFat}g`,
        data.protein && `단백질 ${data.protein}g`,
        data.sodium && `나트륨 ${data.sodium}mg`,
      ].filter(Boolean).join(' · ') || '—'

  drawPdfHeader(doc, 'PDF-01 식품 라벨', new Date().toLocaleDateString('ko-KR'))

  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(16)
  doc.text(`식품 라벨 인쇄용 · ${data.productName || '제품명'}`, 14, 32)
  doc.setFontSize(9)
  doc.setTextColor(PDF_COLORS.faint)
  doc.text('전면 라벨과 후면 라벨을 A4 한 장에 배치했습니다. 인쇄 시 실제 크기 옵션을 사용하세요.', 14, 39)
  drawBusinessBadge(doc, data.businessType || '사업자 유형', 156, 28, 40)

  const frontX = 16
  const frontY = 52
  const frontW = 76
  const frontH = 104
  const backX = 116
  const backY = 52
  const backW = 78
  const backH = 105

  drawCropMarks(doc, frontX, frontY, frontW, frontH)
  drawCropMarks(doc, backX, backY, backW, backH)
  doc.setDrawColor(PDF_COLORS.ink)
  doc.rect(frontX, frontY, frontW, frontH)
  doc.rect(backX, backY, backW, backH)

  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(6.5)
  doc.text((data.manufacturer || 'MANUFACTURER').toUpperCase(), frontX + 5, frontY + 7)
  doc.text('KRK · PDF-01', frontX + frontW - 31, frontY + 7)
  doc.setFillColor(PDF_COLORS.heritage)
  doc.rect(frontX + 5, frontY + 12, 45, 7, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.text(`식품유형 · ${officialCategory}`, frontX + 7, frontY + 16.7)
  doc.setTextColor(PDF_COLORS.ink)
  addWrappedText(doc, data.productName || '제품명', frontX + 5, frontY + 31, frontW - 10, 8.6, { maxLines: 3, size: 20 })
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(7)
  doc.text('FOOD PRODUCT', frontX + 5, frontY + 57)
  doc.setDrawColor('#E2E7EF')
  doc.setFillColor('#F4F7FB')
  doc.rect(frontX + 5, frontY + 63, frontW - 10, 20, 'FD')
  doc.setTextColor('#6F86A6')
  doc.setFontSize(7)
  doc.text('PRODUCT SHOT', frontX + 23, frontY + 75)
  doc.setDrawColor(PDF_COLORS.hairline)
  doc.line(frontX + 5, frontY + 90, frontX + frontW - 5, frontY + 90)
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(6.5)
  doc.text('내용량 · 열량', frontX + 5, frontY + 98)
  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(11.5)
  doc.text(`${data.totalWeight || '—'}${data.unit}${!data.nutritionExempted && data.calories ? ` (${data.calories}kcal)` : ''}`, frontX + 42, frontY + 98)

  doc.setTextColor(PDF_COLORS.ink)
  doc.setFontSize(8.5)
  doc.text(`${data.productName || '제품명'} · ${data.totalWeight || '—'}${data.unit}`, backX + 5, backY + 8)
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(6.5)
  doc.text('BACK', backX + backW - 16, backY + 8)
  doc.setDrawColor(PDF_COLORS.hairline)
  doc.line(backX + 5, backY + 11.5, backX + backW - 5, backY + 11.5)

  let y = backY + 18
  doc.setFontSize(7)
  doc.setTextColor(PDF_COLORS.faint)
  doc.text('원재료명 및 함량', backX + 5, y)
  y = addWrappedText(doc, ingredients, backX + 5, y + 4.5, backW - 10, 3.8, { size: 7.2, maxLines: 4, color: PDF_COLORS.ink })

  y += 2
  doc.setDrawColor(PDF_COLORS.heritage)
  doc.setFillColor('#F5F8FC')
  doc.rect(backX + 5, y, backW - 10, 12, 'FD')
  doc.setFontSize(8)
  doc.setTextColor(allergens.length ? PDF_COLORS.heritage : PDF_COLORS.ink)
  doc.text('알레르기 유발물질', backX + 8, y + 5)
  doc.setFontSize(7)
  doc.setTextColor(PDF_COLORS.ink)
  doc.text(allergens.length ? `${allergens.join(', ')} 함유` : '해당 없음', backX + 8, y + 9.2)

  y += 17
  const row = (label: string, value: string, maxLines = 1) => {
    doc.setTextColor(PDF_COLORS.faint)
    doc.setFontSize(6.6)
    doc.text(label, backX + 5, y)
    y = addWrappedText(doc, value, backX + 22, y, backW - 27, 3.5, { size: 6.8, maxLines, color: PDF_COLORS.ink })
    doc.setDrawColor(PDF_COLORS.hairline)
    doc.line(backX + 5, y + 0.5, backX + backW - 5, y + 0.5)
    y += 4
  }
  row('소비기한', data.expiryDate || '별도 표기')
  row('보관방법', data.storage || '—', 2)
  row('영양성분', nutrition, 2)
  row('제조원', data.manufacturer || '—', 2)
  row('제조 유형', data.businessType || '—')

  doc.setFillColor(10, 10, 11)
  doc.rect(backX + 5, backY + backH - 25, backW - 10, 8, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7.2)
  doc.text('부정·불량식품 신고는 국번 없이', backX + 8, backY + backH - 19.8)
  doc.setFontSize(9)
  doc.text('1399', backX + backW - 22, backY + backH - 19.8)

  const barX = backX + 7
  const barY = backY + backH - 13
  doc.setFillColor(PDF_COLORS.ink)
  Array.from({ length: 26 }).forEach((_, index) => {
    if (index % 2 === 0) doc.rect(barX + index * 1.2, barY, index % 4 === 0 ? 0.8 : 0.45, 7, 'F')
  })
  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(6)
  doc.text('8 809123 456789', barX, barY + 10)
  doc.setDrawColor(PDF_COLORS.hairline)
  doc.rect(backX + backW - 30, barY, 9, 9)
  doc.rect(backX + backW - 18, barY, 9, 9)
  doc.setFontSize(5.5)
  doc.text('분리배출', backX + backW - 30, barY + 12)
  doc.text('재활용', backX + backW - 17, barY + 12)

  doc.setTextColor(PDF_COLORS.faint)
  doc.setFontSize(7)
  doc.text('전면 / FRONT', frontX, 166)
  doc.text('후면 / BACK', backX, 166)
  doc.text(`포장재질: ${(data.packagingMaterials ?? []).join(', ') || '—'}`, 14, 181)
  doc.text('인쇄 안내: PDF를 실제 크기 100%로 출력한 뒤 크롭 마크 기준으로 재단하세요.', 14, 197)
  doc.text('부착 안내: 최종 라벨은 용기 재질과 냉장/상온 환경에서 번짐 여부를 확인하세요.', 14, 207)
  doc.text('법적 고지: 본 라벨은 입력값 기반 자동 생성 초안이며, 최종 표시는 사업자가 확인해야 합니다.', 14, 217)
  drawPdfFooter(doc, '식품 라벨 인쇄용 · 표시 기준 참고 산출물')

  return saveDocAsArtifact(doc, filename)
}

export async function generateLabelPDF(data: CreatorData): Promise<void> {
  downloadPdfArtifact(await createLabelPDFArtifact(data))
}
