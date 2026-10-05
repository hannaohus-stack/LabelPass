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
  /** 전문 서비스 여부 — 분리배출 도안 안내 문구가 등급별로 달라진다 */
  isPro?: boolean
}

/** 항목 상태: 입력됨 / 확인 필요(빠졌거나 확인할 것) / 선택(안 넣어도 되는 항목) */
export type SheetStatus = '입력됨' | '확인 필요' | '선택'

export interface SheetRow {
  k: string
  v: string
  /** 값 아래 작은 안내 */
  sub?: string
  missing?: boolean
  status: SheetStatus
}

export interface SheetNutritionRow {
  k: string
  /** 1회 제공량당 함량(숫자) — 미입력이면 빈 문자열 */
  num: string
  unit: string
  /** 화면·PDF용 표기 (예: "45 kcal") */
  v: string
  missing: boolean
  /** 1일 영양성분 기준치 (기준치가 없는 열량·트랜스지방은 null) */
  std: number | null
  /** 기준치 대비 % (정수) */
  pct: number | null
  /** 총 내용량당 함량 (1회 제공량·내용량 단위가 같을 때만) */
  perTotal: number | null
}

export interface SheetIngredient {
  no: number
  name: string
  weight: number
  origin: string
  allergen: boolean
}

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
  nutrition: { exempt: boolean; serving: string; servingAmount: number; totalAmount: number; rows: SheetNutritionRow[] }
  ingredients: SheetIngredient[]
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

/** 1일 영양성분 기준치 — 식품 등의 표시·광고에 관한 법률 시행규칙 [별표 5] (2020.9.9 개정). 열량·트랜스지방은 기준치 없음 */
export const NUTRIENT_STANDARD: Record<string, number> = {
  '나트륨': 2000, '탄수화물': 324, '당류': 100, '지방': 54, '포화지방': 15, '콜레스테롤': 300, '단백질': 55,
}

export function buildSheetModel(data: CreatorData, ctx: SheetCtx = {}): SheetModel {
  const sorted = [...data.ingredients]
    .filter(i => i.name.trim())
    .sort((a, b) => num(b.weight) - num(a.weight))
  const total = sorted.reduce((s, i) => s + num(i.weight), 0)

  // 알레르기 유발물질: 자동 감지 결과가 있으면 그것을, 없으면 직접 표시한 원재료를 쓴다 (화면 복사 텍스트와 같은 기준)
  const detected = (data.detectedAllergens ?? []).map(a => a.name)
  const allergens = [...new Set(detected.length ? detected : sorted.filter(i => i.isAllergen).map(i => i.name))]

  // 원재료명: 배합비율 순. 함량(%)은 원재료를 제품명 또는 제품명의 일부로 쓴 경우에만 표시한다 (식품 등의 표시기준 제4조 제8호)
  const inProductName = (name: string) => !!name.trim() && data.productName.replace(/\s/g, '').includes(name.replace(/\s/g, ''))
  const ingredientText = sorted.map(i => {
    const pct = total > 0 && inProductName(i.name) ? ` ${(num(i.weight) / total * 100).toFixed(1)}%` : ''
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

  const reportRow: Omit<SheetRow, 'status'> = data.reportNumber
    ? { k: '품목보고번호', v: data.reportNumber }
    : data.reportNumberStatus === 'exists'
      ? { k: '품목보고번호', v: '', sub: '보유로 입력했지만 번호가 없어요. 신고증의 번호를 넣어 주세요.' }
      : data.businessType === '즉판가공업'
        ? { k: '품목보고번호', v: '해당 없음', sub: '즉석판매제조·가공업은 품목제조보고 대상이 아니에요.' }
        : { k: '품목보고번호', v: '', sub: '품목제조보고 후 발급되는 번호를 표시해요.' }

  // 총 내용량당 함량은 1회 제공량과 내용량의 단위가 같을 때만 계산한다
  const servingAmount = num(data.servingSize)
  const totalAmount = num(data.totalWeight)
  const sameUnit = !!data.servingUnit && data.servingUnit === data.unit
  const scale = servingAmount > 0 && totalAmount > 0 && sameUnit ? totalAmount / servingAmount : null
  const nutRow = (k: string, raw: string, unit: string): SheetNutritionRow => {
    const n = raw === '' ? null : parseFloat(raw)
    const has = n !== null && !Number.isNaN(n)
    const std = NUTRIENT_STANDARD[k] ?? null
    return {
      k, unit,
      num: has ? String(n) : '',
      v: has ? `${n} ${unit}` : '',
      missing: !has,
      std,
      pct: has && std ? Math.round((n as number) / std * 100) : null,
      perTotal: has && scale ? Math.round((n as number) * scale * 10) / 10 : null,
    }
  }
  const nutritionRows: SheetNutritionRow[] = data.nutritionExempted ? [] : [
    nutRow('열량', data.calories, 'kcal'),
    nutRow('나트륨', data.sodium, 'mg'),
    nutRow('탄수화물', data.totalCarbs, 'g'),
    nutRow('당류', data.sugar, 'g'),
    nutRow('지방', data.totalFat, 'g'),
    nutRow('트랜스지방', data.transFat, 'g'),
    nutRow('포화지방', data.saturatedFat, 'g'),
    nutRow('콜레스테롤', data.cholesterol, 'mg'),
    nutRow('단백질', data.protein, 'g'),
  ]
  const serving = data.servingSize ? `1회 제공량 ${data.servingSize}${data.servingUnit}` : ''

  const materials = data.packagingMaterials ?? []

  // 상태: 값이 있으면 입력됨, 비었으면 확인 필요(선택 항목은 '선택')
  const mk = (r: Omit<SheetRow, 'status'>, opts: { optional?: boolean; check?: boolean } = {}): SheetRow => ({
    ...r,
    status: !r.v || r.missing || opts.check ? (opts.optional && !r.v ? '선택' : '확인 필요') : '입력됨',
  })
  const pro = ctx.isPro === true
  const rows: SheetRow[] = [
    mk({ k: '제품명', v: data.productName }),
    mk({ k: '식품유형', v: foodType }),
    mk({ k: '내용량', v: amount }),
    mk({ k: '원재료명', v: ingredientText, sub: sorted.length ? (sorted.some(i => inProductName(i.name)) ? '배합비율 높은 순 · 제품명에 쓴 원재료는 함량(%)을 함께 적었어요' : '배합비율 높은 순 · 제품명에 쓴 원재료가 있으면 그 함량(%)을 함께 표시해야 해요') : undefined }),
    mk({ k: '알레르기 유발물질', v: allergens.length ? `${allergens.join(', ')} 함유` : '', sub: allergens.length ? '원재료명과 별도로 알아보기 쉽게 표시해요' : '입력한 원재료에서는 알레르기 유발물질이 감지되지 않았어요. 원재료를 직접 한 번 더 확인해 주세요.', missing: allergens.length === 0 }),
    mk({ k: '원산지', v: originText, sub: originMissing.length ? `원산지 미입력: ${originMissing.join(', ')}` : undefined }, { check: originMissing.length > 0 }),
    mk({ k: '소비기한', v: expiry }),
    mk({ k: '보관방법', v: data.storage }),
    mk({ k: '제조원', v: data.manufacturer }),
    mk({ k: '제조원 소재지', v: data.manufacturerAddress }),
    mk(reportRow, { check: !data.reportNumber && data.reportNumberStatus === 'exists' }),
    mk({ k: '영업 형태', v: [businessLabel, facilityLabel].filter(Boolean).join(' · ') }),
    mk({
      k: '포장재질 · 분리배출', v: materials.join(', '),
      sub: materials.length ? (pro ? '재질별 분리배출 표시 도안은 ZIP의 06_분리배출마크 폴더(svg · png)에 있어요' : '재질별 분리배출 표시 도안은 전문 서비스에서 받을 수 있어요') : undefined,
    }),
    mk({ k: '표시 · 광고 문구', v: data.labelClaim, sub: data.labelClaim ? undefined : '라벨에 넣을 강조 문구가 있으면 검토 입력에 추가해 주세요' }, { optional: true }),
    // 입력받지 않은 값은 채워 넣지 않는다 — 반품·교환 장소는 영업자가 정해서 직접 적는다
    mk({ k: '반품 · 교환', v: '', sub: '반품·교환 장소를 정했다면 직접 적어 주세요. 입력받은 내용이 없어 비워 뒀어요.' }, { optional: true }),
    mk({
      k: '부정 · 불량식품 신고', v: '국번 없이 1399',
      sub: data.businessType === '즉판가공업'
        ? '소비자 안전 표시사항으로 안내되는 문구예요. 진열상자·표지판에 게시하면 제품별 표시를 생략할 수 있지만, 택배·배송으로 파는 제품은 생략할 수 없어요.'
        : '소비자 안전 표시사항으로 안내되는 문구예요.',
    }),
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
    nutrition: { exempt: data.nutritionExempted, serving, servingAmount, totalAmount, rows: nutritionRows },
    ingredients: sorted.map((i, idx) => ({ no: idx + 1, name: i.name, weight: num(i.weight), origin: i.origin ?? '', allergen: !!i.isAllergen })),
    allergens, materials, copyText,
  }
}
