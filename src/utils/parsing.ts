import ingredientsData from './data/ingredients.json'
import allergensData from './data/allergens.json'

export interface Ingredient {
  id: string
  name: string
  rawName: string          // OCR에서 추출된 원래 텍스트
  weight: number           // gram
  origin: string           // 원산지 (R19 의무)
  suggestedName: string    // 식약처 공식 원료명 추천
  isComposite: boolean     // 복합원재료 여부
  isAllergen: boolean      // 알레르기 유발물질 여부
  matchConfidence: number  // 자동완성 매칭 신뢰도 0~1
}

// 복합원재료 키워드 목록
const COMPOSITE_KEYWORDS = [
  '된장', '고추장', '쌈장', '간장', '청국장', '막장',
  '케첩', '마요네즈', '드레싱', '소스',
  '잼', '마멀레이드', '주스', '스프',
  '치즈', '요거트', '버터', '크림',
  '분말스프', '시즈닝', '양념',
  '빵가루', '크루통', '시리얼',
  '초콜릿', '가나슈', '크림치즈',
  '햄', '소시지', '베이컨',
]

// 문자열 유사도 계산 (레벤슈타인 기반 간략화)
function similarity(a: string, b: string): number {
  a = a.replace(/\s/g, '').toLowerCase()
  b = b.replace(/\s/g, '').toLowerCase()
  if (a === b) return 1
  if (a.includes(b) || b.includes(a)) return 0.9
  let matches = 0
  for (const ch of a) if (b.includes(ch)) matches++
  return matches / Math.max(a.length, b.length)
}

// 식약처 공식 원료명에서 가장 가까운 이름 찾기
export function findNearestMatch(name: string): { name: string; confidence: number } {
  const candidates = ingredientsData.ingredients
  let best = candidates[0]
  let bestScore = 0
  for (const c of candidates) {
    const score = similarity(name, c)
    if (score > bestScore) { bestScore = score; best = c }
  }
  return { name: best, confidence: bestScore }
}

// 원재료 이름이 알레르기 유발물질인지 확인
export function checkAllergen(name: string): boolean {
  const normalized = name.replace(/\s/g, '').toLowerCase()
  return allergensData.allergens.some(a =>
    normalized.includes(a.replace(/\s/g, '').toLowerCase())
  )
}

// OCR 텍스트 → 원재료 구조화 파이프라인
export function parseOcrText(ocrText: string): Ingredient[] {
  const lines = ocrText.split('\n').filter(l => l.trim())
  const ingredients: Ingredient[] = []

  for (const line of lines) {
    // 패턴 1: "원재료명 123g" or "원재료명 123.4"
    const pattern1 = line.match(/^(.+?)\s+([\d.]+)\s*g?$/)
    // 패턴 2: "원재료명 | 123" or "원재료명  123"
    const pattern2 = line.match(/^(.+?)[\s|]+\s*([\d.]+)/)

    const match = pattern1 || pattern2
    if (!match) continue

    const rawName = match[1].trim()
    const weight = parseFloat(match[2])
    if (!rawName || isNaN(weight) || weight <= 0) continue

    const { name: suggestedName, confidence: matchConfidence } = findNearestMatch(rawName)
    const isComposite = COMPOSITE_KEYWORDS.some(kw =>
      rawName.includes(kw) || suggestedName.includes(kw)
    )

    ingredients.push({
      id: crypto.randomUUID(),
      name: matchConfidence > 0.75 ? suggestedName : rawName,
      rawName,
      weight,
      origin: '',
      suggestedName,
      isComposite,
      isAllergen: checkAllergen(rawName) || checkAllergen(suggestedName),
      matchConfidence,
    })
  }

  // 함량순 정렬 (내림차순)
  return ingredients.sort((a, b) => b.weight - a.weight)
}

// 배합비율 계산
export function calculateRatios(
  ingredients: Ingredient[]
): Array<Ingredient & { percentage: string }> {
  const total = ingredients.reduce((sum, i) => sum + i.weight, 0)
  if (total === 0) return ingredients.map(i => ({ ...i, percentage: '0.00' }))
  return ingredients.map(i => ({
    ...i,
    percentage: ((i.weight / total) * 100).toFixed(2),
  }))
}
