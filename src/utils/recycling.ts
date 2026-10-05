/** 포장재 재질 → 분리배출 표시 도안 파일 (public/recycling) */
export const RECYCLING_FILE_MAP: Record<string, string> = {
  '페트(PET)':              '/recycling/plastic-pet.svg',
  '고밀도 폴리에틸렌(HDPE)': '/recycling/plastic-hdpe.svg',
  '폴리염화비닐(PVC)':       '/recycling/plastic-other.svg',
  '저밀도 폴리에틸렌(LDPE)': '/recycling/plastic-ldpe.svg',
  '폴리프로필렌(PP)':        '/recycling/plastic-pp.svg',
  '폴리스티렌(PS)':          '/recycling/plastic-ps.svg',
  '기타 플라스틱':            '/recycling/plastic-other.svg',
  '유리':                   '/recycling/glass.svg',
  '철':                    '/recycling/can-steel.svg',
  '알루미늄':                '/recycling/can-aluminum.svg',
  '종이팩':                 '/recycling/paper-pack.svg',
  '멸균팩':                 '/recycling/paper-pack2.svg',
  '도포·첩합류(빨간)':       '/recycling/laminated-red.svg',
  '도포·첩합류(검정)':       '/recycling/laminated-black.svg',
  '골판지':                 '/recycling/paper.svg',
  '일반 종이':              '/recycling/paper.svg',
  '비닐류':                 '/recycling/vinyl-ldpe.svg',
  '스티로폼':               '/recycling/plastic-ps.svg',
}

/** ZIP 안 도안 파일 이름용 영문 이름 (압축 도구 호환) */
const MATERIAL_SLUG: Record<string, string> = {
  '유리': 'glass', '철': 'steel', '알루미늄': 'aluminum',
  '종이팩': 'paper-pack', '멸균팩': 'aseptic-pack',
  '골판지': 'cardboard', '일반 종이': 'paper', '비닐류': 'vinyl',
  '스티로폼': 'styrofoam', '기타 플라스틱': 'plastic-other',
  '도포·첩합류(빨간)': 'laminated-red', '도포·첩합류(검정)': 'laminated-black',
}

export function materialSlug(value: string): string {
  if (MATERIAL_SLUG[value]) return MATERIAL_SLUG[value]
  const paren = value.match(/\(([A-Za-z0-9-]+)\)/)
  if (paren) return paren[1].toLowerCase()
  const ascii = value.replace(/[^\x00-\x7F]+/g, '').trim().toLowerCase()
    .replace(/[\s_/\\()]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return ascii || 'material'
}

/** 인쇄 전달용 PNG 한 변 길이(px) */
export const RECYCLING_PNG_SIZE = 2000

/** SVG 텍스트 → 투명 배경 PNG (긴 변 기준 size px) */
export async function svgToPngBlob(svgText: string, size = RECYCLING_PNG_SIZE): Promise<Blob> {
  const vb = svgText.match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/)
  const ratio = vb ? Number(vb[1]) / Number(vb[2]) : 1
  const w = ratio >= 1 ? size : Math.round(size * ratio)
  const h = ratio >= 1 ? Math.round(size / ratio) : size
  const url = URL.createObjectURL(new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG 변환 실패'))), 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** ZIP의 prefix 아래 svg/ · png/ 폴더에 분리배출마크를 함께 담는다 */
export async function addRecyclingMarks(
  zip: { file: (path: string, data: string | Blob) => unknown },
  prefix: string,
  materials: string[],
) {
  await Promise.all(materials.map(async mat => {
    const svg = await (await fetch(RECYCLING_FILE_MAP[mat])).text()
    const name = `분리배출마크_${materialSlug(mat)}`
    zip.file(`${prefix}svg/${name}.svg`, svg)
    zip.file(`${prefix}png/${name}.png`, await svgToPngBlob(svg))
  }))
}
