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
