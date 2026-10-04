export interface CreatorIngredient {
  id: string
  name: string
  weight: string       // string for controlled input
  origin: string       // 원산지 (R19 의무: 배합비율 상위 원재료·제품명 표시 원재료)
  isAllergen: boolean
  isComposite: boolean
}

export interface CreatorData {
  // Step 1 — 제품 정보
  productName:  string
  categories:   string[]                                      // v3: 다중선택 (foodCategory 대체)
  businessType: '식품제조가공업' | '즉판가공업' | ''          // v3: 사업자 유형
  facilityType: '단독' | '공유' | ''                          // A-8: 영업 시설 유형 (시행규칙 별표2)
  totalWeight:  string
  unit:         'g' | 'mL'
  manufacturer:        string
  manufacturerAddress: string   // P1-001: 제조원 소재지 (도로명 주소)
  reportNumberStatus:  'none_or_needed' | 'exists' | '' // P1-002: 품목보고번호 보유 상태
  reportNumber:        string   // P1-002: 품목보고번호
  labelClaim:          string   // P1-003: 라벨 표시/광고 문구 (R12/R20 검토용)
  storage:      string
  expiryDate:   string   // ISO 날짜 (YYYY-MM-DD)

  // Step 2 — 원재료 + 포장재
  packagingMaterials: string[]                                  // v4: 분리배출 R15/R16/R17 판별용
  ingredients:        CreatorIngredient[]
  detectedAllergens:  { id: string; name: string }[]
  detectedComposites: { ingredientName: string; matchedKeyword: string; hint: string }[]

  // Step 3 — 영양성분
  nutritionExempted:  boolean
  hasNutritionClaim:  boolean   // P1-005: Q3 영양강조표시 여부 (R20 연동)
  servingSize:  string
  servingUnit:  'g' | 'mL'
  calories:     string
  totalCarbs:   string
  sugar:        string
  totalFat:     string
  saturatedFat: string
  transFat:     string
  cholesterol:  string
  protein:      string
  sodium:       string
}

export const INITIAL_DATA: CreatorData = {
  productName:  '',
  categories:   [],
  businessType: '',
  facilityType: '',
  totalWeight:  '',
  unit:         'g',
  manufacturer:        '',
  manufacturerAddress: '',
  reportNumberStatus:  '',
  reportNumber:        '',
  labelClaim:          '',
  storage:      '',
  expiryDate:   '',
  packagingMaterials: [],
  ingredients:        [],
  detectedAllergens:  [],
  detectedComposites: [],
  nutritionExempted:  false,
  hasNutritionClaim:  false,
  servingSize:  '',
  servingUnit:  'g',
  calories:     '',
  totalCarbs:   '',
  sugar:        '',
  totalFat:     '',
  saturatedFat: '',
  transFat:     '0',
  cholesterol:  '',
  protein:      '',
  sodium:       '',
}

export interface StepProps {
  data: CreatorData
  onChange: (partial: Partial<CreatorData>) => void
}

/** Step 1 필수 항목 완성 여부 (v3) */
export function isStep1Complete(data: CreatorData): boolean {
  return (
    data.productName.trim()  !== '' &&
    data.categories.length   >  0  &&
    data.businessType        !== '' &&
    data.facilityType        !== '' &&
    data.totalWeight.trim()  !== '' && parseFloat(data.totalWeight) > 0 &&
    data.manufacturer.trim() !== '' &&
    data.storage             !== '' &&
    data.expiryDate          !== ''
  )
}

/** Step 2 원재료 최소 입력 여부 */
export function isStep2Complete(data: CreatorData): boolean {
  return data.ingredients.some(ingredient =>
    ingredient.name.trim() !== '' &&
    ingredient.weight.trim() !== '' &&
    parseFloat(ingredient.weight) > 0
  )
}
