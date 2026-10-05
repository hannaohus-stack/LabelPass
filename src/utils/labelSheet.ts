/**
 * labelSheet — "표시사항 시트" 공통 모델
 * 입력(CreatorData)을 표시 항목별로 정리한다. PDF · PNG · 복사용 텍스트가 모두 이 모델을 쓴다.
 *
 * 역할 정의(2026-10-05): 인쇄용 라벨이 아니라, 입력한 표시사항을 항목별로 확인하고
 * 디자이너·인쇄소에 전달하기 위한 확인용 시트.
 */
import type { CreatorData } from '../pages/creator/types'
import { CATEGORY_OFFICIAL } from './tierUtils'

export interface SheetCtx {
  reviewId?: string
  reviewedAt?: string
}

export interface SheetRow {
  k: string
  v: string
  /** 값 아래 작은 안내 */
  sub?: string
  missing?: boolean
}

export interface SheetNutritionRow { k: string; v: string; missing: boolean }

export interface SheetModel {
  productName: string
  /** 식약처 식품유형 (선택 카테고리 → 공식 분류명) */
  foodType: string
  categories: string[]
  businessLabel: string
  facilityLabel: string
  amount: string
  reviewId?: string
  reviewedAt?: string
  rows: SheetRow[]
  nutrition: { exempt: boolean; serving: string; rows: SheetNutritionRow[] }
  allergens: string[]
  materials: string[]
  /** 복사용 표시사항 텍스트 */
  copyText: string
}

export const BIZ_LABEL: Record<string, string> = {
  '식품제조가공업': '식품제조·가공업',
  '즉판가공업': '즉석판매제조·가공업',
}

const num = (v: string) => parseFloat(v) || 0

export function buildSheetModel(data: CreatorData, ctx: SheetCtx = {}): SheetModel {
  const sorted = [...data.ingredients]
    .filter(i => i.name.trim())
    .sort((a, b) => num(b.weight) - num(a.weight))
  const total = sorted.reduce((s, i) => s + num(i.weight), 0)

  // 알레르기 유발물질: 자동 감지 결과가 있으면 그것을, 없으면 직접 표시한 원재료를 쓴다 (화면 복사 텍스트와 같은 기준)
  const detected = (data.detectedAllergens ?? []).map(a => a.name)
  const allergens = [...new Set(detected.length ? detected : sorted.filter(i => i.isAllergen).map(i => i.name))]

  // 원재료명: 배합비율 순. 함량은 상위 1개만 표시 (제품명 사용 원재료 등은 별도 확인)
  const ingredientText = sorted.map((i, idx) => {
    const pct = total > 0 && idx === 0 ? ` ${(num(i.weight) / total * 100).toFixed(1)}%` : ''
    return `${i.name}${i.origin ? `(${i.origin})` : ''}${pct}`
  }).join(', ')

  const originText = sorted.filter(i => i.origin).map(i => `${i.name}: ${i.origin}`).join(' · ')
  const originMissing = sorted.filter(i => !i.origin).map(i => i.name)

  const foodType = data.categories.length
    ? data.categories.map(c => CATEGORY_OFFICIAL[c] ?? c).join(', ')
    : ''
  const amount = data.totalWeight ? `${data.totalWeight}${data.unit}` : ''
  const expiry = data.expiryDate ? `${data.expiryDate.replace(/-/g, '.')}까지` : ''
  const businessLabel = data.businessType ? (BIZ_LABEL[data.businessType] ?? data.businessType) : ''
  const facilityLabel = data.facilityType === '공유' ? '공유 시설' : data.facilityType === '단독' ? '단독 시설' : ''

  const reportRow: SheetRow = data.reportNumber
    ? { k: '품목보고번호', v: data.reportNumber }
    : data.reportNumberStatus === 'exists'
      ? { k: '품목보고번호', v: '', sub: '보유로 입력했지만 번호가 없어요. 신고증의 번호를 넣어 주세요.' }
      : data.businessType === '즉판가공업'
        ? { k: '품목보고번호', v: '해당 없음', sub: '즉석판매제조·가공업은 품목제조보고 대상이 아니에요.' }
        : { k: '품목보고번호', v: '', sub: '품목제조보고 후 발급되는 번호를 표시해요.' }

  const nutritionRows: SheetNutritionRow[] = data.nutritionExempted ? [] : [
    { k: '열량', v: data.calories ? `${data.calories} kcal` : '', missing: !data.calories },
    { k: '나트륨', v: data.sodium ? `${data.sodium} mg` : '', missing: !data.sodium },
    { k: '탄수화물', v: data.totalCarbs ? `${data.totalCarbs} g` : '', missing: !data.totalCarbs },
    { k: '당류', v: data.sugar ? `${data.sugar} g` : '', missing: !data.sugar },
    { k: '지방', v: data.totalFat ? `${data.totalFat} g` : '', missing: !data.totalFat },
    { k: '트랜스지방', v: data.transFat !== '' ? `${data.transFat} g` : '', missing: data.transFat === '' },
    { k: '포화지방', v: data.saturatedFat ? `${data.saturatedFat} g` : '', missing: !data.saturatedFat },
    { k: '콜레스테롤', v: data.cholesterol ? `${data.cholesterol} mg` : '', missing: !data.cholesterol },
    { k: '단백질', v: data.protein ? `${data.protein} g` : '', missing: !data.protein },
  ]
  const serving = data.servingSize ? `1회 제공량 ${data.servingSize}${data.servingUnit}` : ''

  const materials = data.packagingMaterials ?? []

  const rows: SheetRow[] = [
    { k: '제품명', v: data.productName },
    { k: '식품유형', v: foodType, sub: data.categories.length ? `선택 카테고리: ${data.categories.join(', ')}` : undefined },
    { k: '내용량', v: amount },
    { k: '원재료명', v: ingredientText, sub: sorted.length ? '배합비율 높은 순 · 함량은 상위 1개 원재료 기준으로 적었어요' : undefined },
    { k: '알레르기 유발물질', v: allergens.length ? `${allergens.join(', ')} 함유` : '', sub: allergens.length ? '원재료명과 별도로 알아보기 쉽게 표시해요' : '감지된 알레르기 유발물질이 없어요. 원재료를 다시 확인해 주세요.', missing: allergens.length === 0 },
    { k: '원산지', v: originText, sub: originMissing.length ? `원산지 미입력: ${originMissing.join(', ')}` : undefined },
    { k: '소비기한', v: expiry },
    { k: '보관방법', v: data.storage },
    { k: '제조원', v: data.manufacturer },
    { k: '제조원 소재지', v: data.manufacturerAddress },
    reportRow,
    { k: '영업 형태', v: [businessLabel, facilityLabel].filter(Boolean).join(' · ') },
    { k: '포장재질 · 분리배출', v: materials.join(', '), sub: materials.length ? '재질별 분리배출 표시 도안은 전문 서비스의 ZIP으로 받을 수 있어요' : undefined },
    { k: '표시 · 광고 문구', v: data.labelClaim, sub: data.labelClaim ? undefined : '라벨에 넣을 강조 문구가 있으면 검토 입력에 추가해 주세요' },
    { k: '반품 · 교환', v: '구입처 또는 제조원', sub: '반품·교환 장소는 영업자가 정한 곳으로 바꿔 적어 주세요' },
    { k: '부정 · 불량식품 신고', v: '국번 없이 1399' },
  ]

  const nutritionText = data.nutritionExempted
    ? '영양성분 표시 생략(면제 선택)'
    : nutritionRows.filter(r => !r.missing).map(r => `${r.k} ${r.v}`).join(', ')

  const copyText = [
    `제품명: ${data.productName}`,
    foodType && `식품유형: ${foodType}`,
    amount && `내용량: ${amount}`,
    ingredientText && `원재료명: ${ingredientText}`,
    allergens.length ? `알레르기 유발물질: ${allergens.join(', ')} 함유` : '',
    expiry && `소비기한: ${expiry}`,
    data.storage && `보관방법: ${data.storage}`,
    data.manufacturer && `제조원: ${data.manufacturer}${data.manufacturerAddress ? ` / ${data.manufacturerAddress}` : ''}`,
    data.reportNumber && `품목보고번호: ${data.reportNumber}`,
    materials.length ? `포장재질: ${materials.join(', ')}` : '',
    nutritionText && `영양성분: ${serving ? `${serving}당 ` : ''}${nutritionText}`,
    '부정·불량식품 신고: 국번 없이 1399',
  ].filter(Boolean).join('\n')

  return {
    productName: data.productName,
    foodType, categories: data.categories, businessLabel, facilityLabel, amount,
    reviewId: ctx.reviewId, reviewedAt: ctx.reviewedAt,
    rows,
    nutrition: { exempt: data.nutritionExempted, serving, rows: nutritionRows },
    allergens, materials, copyText,
  }
}
