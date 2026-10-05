import { Fragment as Frag, useEffect, useMemo, useState } from 'react'
import { isOtherCategory } from '../utils/tierUtils'
import type React from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import AppHeader from '../components/lp/AppHeader'
import { readPendingReview } from '../lib/next'
import {
  PAYMENT_STATE_KEY, SERVICE, countResults, ensureReviewId, fmtDate, productParts, saveReviewOnce, won, writeSession,
  type PaymentState, type ReviewState, type ServiceType,
} from '../lib/review'
import { trackBeginCheckout, trackCheckerResultView } from '../lib/analytics'
import type { Ingredient } from '../utils/parsing'
import regulationsData from '../utils/data/regulations.json'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface Metadata {
  productName: string
  totalWeight: string
  unit: 'g' | 'mL' | 'kg' | 'L'
  expiryDays: string
  storage: string
  manufacturer: string
  manufacturerAddress?: string    // P1-001: 제조원 소재지
  reportNumberStatus?: 'none_or_needed' | 'exists' | '' // P1-002: 품목보고번호 보유 상태
  reportNumber?:        string    // P1-002: 품목보고번호
  labelClaim?:          string    // P1-003: 라벨 표시/광고 문구 (R12/R20 검토용)
  hasNutritionClaim?:   boolean   // P1-005: 영양강조표시 직접 선언 여부 (R20 연동)
  packagingMaterials?: string[]   // v4: 분리배출 마크 판별용 (선택)
  categories?:   string[]         // v5: 식품 카테고리 (라벨 PDF · 복사 항목용)
  businessType?: string           // v5: 사업자 유형 (신고 가이드 분기용)
  facilityType?: '단독' | '공유'  // A-8: 영업 시설 유형 (공유주방 혼입 경고용)
}

type RiskStatus = 'violation' | 'warn' | 'pass'

export interface RegulationResult {
  id: string                   // "R01" ~ "R20" (R13/R14/R18 미구현)
  title: string
  severity: 'red' | 'yellow'
  condition: string
  penaltyRange: string
  regulation: string
  suggestion: string
  status: RiskStatus
  detail: string
  currentValue?: string
  issueReason?: string
  fixInstruction?: string
  recommendedLabelText?: string
  actionItems?: string[]
  legalBasis?: string
}

// ─── 분석 로직 ─────────────────────────────────────────────────────────────────

export function analyzeRegulations(
  ingredients: Ingredient[],
  metadata: Metadata,
): RegulationResult[] {
  const allergens  = ingredients.filter(i => i.isAllergen)
  const composites = ingredients.filter(i => i.isComposite)
  const allWeights = ingredients.length > 0 && ingredients.every(i => i.weight > 0)
  const isSorted   = allWeights &&
    ingredients.every((ing, idx) => idx === 0 || ingredients[idx - 1].weight >= ing.weight)

  const map: Record<string, { status: RiskStatus; detail: string }> = {
    R01: metadata.productName.trim()
      ? { status: 'pass',      detail: `제품명 "${metadata.productName}" 확인.` }
      : { status: 'violation', detail: '제품명이 입력되지 않았습니다. 라벨 필수 기재 항목입니다.' },

    R02: metadata.totalWeight.trim()
      ? { status: 'pass',      detail: `내용량 ${metadata.totalWeight}${metadata.unit} 확인.` }
      : { status: 'violation', detail: '내용량이 입력되지 않았습니다. 숫자와 단위(g/mL)를 함께 표시해야 합니다.' },

    R03: !allWeights
      ? { status: 'warn',        detail: '중량 정보 없이 원재료 순서를 자동 검증할 수 없습니다. 함량 내림차순 정렬을 직접 확인하세요.' }
      : isSorted
        ? { status: 'pass',      detail: '원재료가 함량 내림차순으로 올바르게 정렬되어 있습니다.' }
        : { status: 'violation', detail: '원재료 순서가 함량 기준 내림차순과 일치하지 않습니다. 재정렬이 필요합니다.' },

    R04: { status: 'warn', detail: '제품명에 특정 원재료(예: 딸기잼 → 딸기)가 포함된 경우 해당 원재료 함량(%)을 표시해야 합니다. 직접 확인하세요.' },

    R05: (() => {
      const sharedKitchen = metadata.facilityType === '공유'
      if (allergens.length > 0) {
        const base = `${allergens.map(a => a.name).join(', ')} 등 ${allergens.length}개 알레르기 유발 원료 감지. 별도 구분하여 명시 필요.`
        const extra = sharedKitchen
          ? '\n⚠️ 공유주방 사용 감지 — 타 제품 알레르기 원료 혼입 가능성을 라벨에 추가 표시 권장. (식품위생법 시행규칙 별표2)'
          : ''
        return { status: 'warn' as RiskStatus, detail: base + extra }
      }
      if (sharedKitchen) {
        return {
          status: 'warn' as RiskStatus,
          detail: '직접 사용한 알레르기 유발 원료는 감지되지 않았습니다.\n⚠️ 공유주방 사용 감지 — 타 제품 원료 혼입 가능성이 있으므로 라벨에 "본 제품은 ○○을 사용한 제품과 같은 제조 시설에서 만들어졌습니다" 등의 표시를 권장합니다. (식품위생법 시행규칙 별표2)',
        }
      }
      return { status: 'pass' as RiskStatus, detail: '알레르기 유발 원료가 감지되지 않았습니다.' }
    })(),

    R06: composites.length > 0
      ? { status: 'warn',  detail: `${composites.map(c => c.name).join(', ')} 등 ${composites.length}개 복합원재료 감지. 괄호 안에 구성 원재료를 함량 순으로 표시해야 합니다.` }
      : { status: 'pass',  detail: '복합원재료가 감지되지 않았습니다.' },

    R07: metadata.expiryDays.trim()
      ? { status: 'pass',      detail: `소비기한 ${metadata.expiryDays}일 기준 확인. 라벨에는 'YYYY.MM.DD 까지' 형식으로 표시하세요.` }
      : { status: 'violation', detail: '소비기한이 입력되지 않았습니다. 2023년부터 유통기한 대신 소비기한 표시가 의무입니다.' },

    R08: metadata.storage.trim()
      ? { status: 'pass',  detail: `보관방법 "${metadata.storage}" 확인. 개봉 후 보관방법도 포함되어 있는지 확인하세요.` }
      : { status: 'warn',  detail: '보관방법이 입력되지 않았습니다. 개봉 전·후 보관조건을 모두 표시하세요.' },

    R09: { status: 'warn', detail: '영양성분표 의무 여부는 사업 규모에 따라 다릅니다. 연매출 120억 원 미만 사업장은 면제 가능합니다 (2026년 현행 기준, 단계제 적용). 의무 대상은 열량·탄수화물·당류·단백질·지방·포화지방·트랜스지방·콜레스테롤·나트륨 9개 항목을 표시해야 합니다.' },

    R10: (() => {
      if (!metadata.manufacturer.trim()) {
        return { status: 'violation' as RiskStatus, detail: '제조업소명이 입력되지 않았습니다. 소재지(도로명 주소)·품목보고번호를 함께 표시해야 합니다.' }
      }
      const missing: string[] = []
      if (!metadata.manufacturerAddress?.trim()) missing.push('소재지(도로명 주소)')
      const hasReportNumber = Boolean(metadata.reportNumber?.trim())
      const reportNumberNeeded = metadata.reportNumberStatus === 'none_or_needed'
      if (!hasReportNumber && !reportNumberNeeded) missing.push('품목보고번호')
      if (missing.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `제조업소 "${metadata.manufacturer}" 확인. 미입력 항목: ${missing.join(', ')}\n근거: 식품등의 표시기준 제3조 제6항 — 제조업소명·소재지·품목보고번호 모두 필수`,
        }
      }
      if (reportNumberNeeded) {
        return {
          status: 'warn' as RiskStatus,
          detail: `제조업소 "${metadata.manufacturer}" 확인. 품목보고번호는 없음/신청 필요 상태입니다.\n최종 판매 라벨에는 품목제조보고 후 발급 번호를 반영해야 합니다.`,
        }
      }
      return {
        status: 'pass' as RiskStatus,
        detail: `제조업소 "${metadata.manufacturer}" / 소재지 "${metadata.manufacturerAddress}" / 품목보고번호 "${metadata.reportNumber}" 확인.`,
      }
    })(),

    R11: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length > 0) {
        return {
          status: 'pass' as RiskStatus,
          detail: `포장재질 선택 확인: [${pm.join(', ')}]\n라벨에 선택하신 재질명을 정확히 표시하세요. 용기·뚜껑이 다른 재질인 경우 각각 표기해야 합니다.\n근거: 식품등의 표시기준 제3조`,
        }
      }
      return {
        status: 'warn' as RiskStatus,
        detail: 'Step 2에서 포장재질이 선택되지 않았습니다. 용기·뚜껑 각각의 재질을 직접 확인하고 라벨에 표시하세요.\n근거: 식품등의 표시기준 제3조',
      }
    })(),

    R12: (() => {
      // 제품명 + 원재료명 + 라벨 표시 문구에서 금지 키워드 자동 감지
      const BANNED = ['천연', '유기농', '무첨가', '다이어트', '저칼로리', '자연산']
      const targets = [
        metadata.productName,
        metadata.labelClaim ?? '',
        ...ingredients.map(i => i.name),
      ].join(' ')
      const found = BANNED.filter(kw => targets.includes(kw))
      return found.length > 0
        ? { status: 'violation', detail: `금지 표현 감지: "${found.join('", "')}" — 인증 없이 사용 불가. 즉시 제거하거나 인증 취득 후 표시하세요.` }
        : { status: 'pass',      detail: '금지 표현(천연, 유기농, 무첨가, 다이어트 등)이 제품명·원재료·라벨 문구에서 감지되지 않았습니다.' }
    })(),

    // ─── v4 신규 항목 ──────────────────────────────────────────────────────

    // ─── R15~R17: 분리배출 마크 ───────────────────────────────────────────────
    // [LAW] 카테고리 4 - 자원재활용법 제14조 + 환경부 고시 2024-170호
    // 과태료: 최대 300만원
    R15: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: '분리배출 마크 표시 여부 확인 필요\n근거: 자원의 절약과 재활용 촉진에 관한 법률 제14조 + 환경부 고시 2024-170호\n과태료: 최대 300만원\n수정방법: 포장재 재질을 입력 단계에서 선택하면 맞는 마크를 자동으로 제공합니다.',
        }
      }
      return {
        status: 'warn' as RiskStatus,
        detail: `선택하신 [${pm.join(', ')}]에 맞는 분리배출 마크 표시가 필요합니다.\n근거: 환경부 고시 2024-170호\n수정방법: 전문 수정 가이드에서 해당 재질 분리배출 마크(환경부 공식 도안 SVG)를 제공합니다.`,
      }
    })(),

    R16: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return { status: 'warn' as RiskStatus, detail: '포장재 재질이 입력되지 않아 재질 표기 검토를 건너뜁니다.' }
      }
      // 플라스틱 계열: PET, HDPE, PVC, LDPE, PP, PS, 기타플라스틱, 비닐류
      const PLASTIC_MATERIALS = ['페트(PET)', '고밀도 폴리에틸렌(HDPE)', '폴리염화비닐(PVC)', '저밀도 폴리에틸렌(LDPE)', '폴리프로필렌(PP)', '폴리스티렌(PS)', '기타 플라스틱', '비닐류']
      const plastics = pm.filter(m => PLASTIC_MATERIALS.includes(m))
      if (plastics.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `플라스틱 계열 포장재(${plastics.join(', ')}) 사용 감지. 분리배출 마크 내에 구체적 재질명(PET·HDPE·PP·PS 등)을 정확히 표기해야 합니다.\n근거: 환경부 고시 2024-170호`,
        }
      }
      return { status: 'pass' as RiskStatus, detail: '플라스틱 계열 포장재가 없어 재질 상세 표기 항목은 해당 없습니다.' }
    })(),

    R17: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return { status: 'warn' as RiskStatus, detail: '포장재 재질이 입력되지 않아 다중 포장재 검토를 건너뜁니다.' }
      }
      if (pm.length > 1) {
        return {
          status: 'warn' as RiskStatus,
          detail: `복수 포장재 감지(${pm.join(', ')}). 재질이 다른 각 포장재에 대해 별도의 분리배출 마크를 각각 표시해야 합니다.\n근거: 환경부 고시 2024-170호`,
        }
      }
      return { status: 'pass' as RiskStatus, detail: '단일 재질 포장재입니다. 해당 재질 분리배출 마크 1종을 표시하세요.' }
    })(),

    // ─── R19: 원산지 표시 강화 ────────────────────────────────────────────────
    // [LAW] 카테고리 5 - 농수산물의 원산지 표시 등에 관한 법률 + 시행규칙 별표 1
    // 과태료: 최대 1,000만원
    // 기준: 배합비율 98% 이상인 원료(1~2개)에 원산지 표시 + 볼드체 의무
    // 제외 원료: 물, 정제수, 식품첨가물, 주정, 당류, 설탕, 포도당
    R19: (() => {
      const ORIGIN_EXCLUDED = ['물', '정제수', '식품첨가물', '주정', '당류', '설탕', '포도당', '과당', '올리고당']

      const totalWeight = ingredients.reduce((s, i) => s + i.weight, 0)
      if (totalWeight === 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: '원재료 함량 정보가 없어 원산지 표시 의무 여부를 자동 확인할 수 없습니다. 배합비율 98% 이상 원료에 원산지(볼드체)를 표시하세요.\n근거: 농수산물의 원산지 표시 등에 관한 법률 + 시행규칙 별표 1\n과태료: 최대 1,000만원',
        }
      }

      // 제외 원료 필터링 후 배합비율 계산
      const filtered = ingredients
        .filter(i => !ORIGIN_EXCLUDED.some(ex => i.name.includes(ex)))
        .map(i => ({ name: i.name, pct: (i.weight / totalWeight) * 100 }))
        .sort((a, b) => b.pct - a.pct)

      if (filtered.length === 0) {
        return { status: 'pass' as RiskStatus, detail: '원산지 표시 의무 대상 원료가 없습니다.' }
      }

      // 1순위 원료 단독 98% 이상
      const THRESHOLD = 98
      const required: string[] = []
      if (filtered[0].pct >= THRESHOLD) {
        required.push(`${filtered[0].name} (${filtered[0].pct.toFixed(1)}%)`)
      } else if (filtered.length >= 2 && filtered[0].pct + filtered[1].pct >= THRESHOLD) {
        // 상위 두 원료 합계 98% 이상
        required.push(`${filtered[0].name} (${filtered[0].pct.toFixed(1)}%)`)
        required.push(`${filtered[1].name} (${filtered[1].pct.toFixed(1)}%)`)
      }

      if (required.length > 0) {
        // 원산지 입력 여부 확인
        const requiredNames = required.map(r => r.split(' (')[0])
        const originFilled = requiredNames.every(rName => {
          const ing = ingredients.find(i => i.name === rName)
          return ing && ing.origin && ing.origin.trim() !== ''
        })
        if (originFilled) {
          return {
            status: 'pass' as RiskStatus,
            detail: `원산지 표시 대상 원료의 원산지가 입력되었습니다.\n대상 원료: ${requiredNames.map(n => {
              const ing = ingredients.find(i => i.name === n)
              return `${n}(${ing?.origin ?? ''})`
            }).join(', ')}\n라벨 출력 시 굵은 글씨(볼드체)로 표시하세요.`,
          }
        }
        return {
          status: 'warn' as RiskStatus,
          detail: `원산지 표시 의무 대상 감지 — 원산지 미입력\n대상 원료: ${required.join(', ')}\n근거: 농수산물의 원산지 표시 등에 관한 법률 + 시행규칙 별표 1\n과태료: 최대 1,000만원\n수정방법: Step 2에서 해당 원료의 원산지(국산·미국산 등)를 입력하고, 라벨에 굵은 글씨(볼드체)로 표시하세요.`,
        }
      }

      return {
        status: 'pass' as RiskStatus,
        detail: `배합비율 98% 기준 초과 원료가 없습니다. 원산지 표시 의무 자동 발생 해당 없음.\n(제외 원료: ${ORIGIN_EXCLUDED.join(', ')} 등)`,
      }
    })(),

    // ─── R20: 영양강조표시 자동 감지 ──────────────────────────────────────────
    // [LAW] 카테고리 2 - 식품등의 표시기준 (식약처) 영양강조표시 조항
    // 감지 대상: 제품명(A-1) + 원재료명(A-2) + 라벨 표시 문구(A-3, P1-005)
    R20: (() => {
      // P1-005: Step3 자가진단 Q2에서 영양강조표시 있다고 명시한 경우 즉시 warn
      if (metadata.hasNutritionClaim) {
        return {
          status: 'warn' as RiskStatus,
          detail: '영양강조표시 사용 신고됨 — 영양표시 의무 발생.\n근거: 식품등의 표시기준 (식약처)\n영양강조표시 사용 시 연매출 120억 이하 면제 적용 불가. 열량·탄수화물·당류·단백질·지방·포화지방·트랜스지방·콜레스테롤·나트륨 9개 영양성분 표시가 필요합니다.',
        }
      }
      const NUTRITION_CLAIM_KEYWORDS = [
        // 열량/지방
        '저칼로리', '저열량', '무칼로리', '무열량', '칼로리프리',
        '저지방', '무지방', '저포화지방', '무포화지방',
        '저트랜스지방', '무트랜스지방',
        // 당류
        '무가당', '무설탕', '설탕무첨가', '무첨가당', '슈가프리', 'sugar free',
        '저당', '저당류',
        // 단백질/영양소
        '고단백', '단백질 함유', '고칼슘', '칼슘 풍부',
        '고섬유', '식이섬유 풍부', '고철분', '철분 함유',
        // 나트륨/기타
        '저나트륨', '저염', '무나트륨',
        '고오메가', '오메가3 함유',
      ]
      const targets = [
        metadata.productName,
        metadata.labelClaim ?? '',
        ...ingredients.map(i => i.name),
      ].join(' ')
      const found = NUTRITION_CLAIM_KEYWORDS.filter(kw =>
        targets.toLowerCase().includes(kw.toLowerCase())
      )
      return found.length > 0
        ? {
            status: 'warn' as RiskStatus,
            detail: `영양강조표시 감지: "${found.join('", "')}" — 영양표시 의무 발생.\n근거: 식품등의 표시기준 (식약처)\n영양강조표시 사용 시 연매출 120억 이하 면제 적용 불가. 열량·탄수화물·당류·단백질·지방·포화지방·트랜스지방·콜레스테롤·나트륨 9개 영양성분 표시가 필요합니다.`,
          }
        : { status: 'pass' as RiskStatus, detail: '영양강조표시 표현(무가당·저칼로리·고단백 등)이 제품명·원재료·라벨 문구에서 감지되지 않았습니다.' }
    })(),
  }

  return (regulationsData as unknown as Omit<RegulationResult, 'status' | 'detail'>[]).map(reg => ({
    ...reg,
    severity: reg.severity as 'red' | 'yellow',
    ...(map[reg.id] ?? { status: 'warn' as RiskStatus, detail: '' }),
  }))
}

export function parseMaxPenaltyMw(penaltyRange: string): number {
  const nums = penaltyRange.match(/\d+/g)?.map(Number) ?? []
  return nums.length > 0 ? Math.max(...nums) : 0
}

// Checker 분석 데이터 → Creator 사전 입력 형식 변환
export function toCreatorPrefill(ingredients: Ingredient[], metadata: Metadata) {
  // expiryDays(일수) → expiryDate(YYYY-MM-DD) 변환
  let expiryDate = ''
  if (metadata.expiryDays) {
    const days = parseInt(metadata.expiryDays)
    if (!isNaN(days) && days > 0) {
      const d = new Date()
      d.setDate(d.getDate() + days)
      expiryDate = d.toISOString().slice(0, 10)
    }
  }

  // 'kg'|'L' → CreatorData의 'g'|'mL'|'개' 근사 매핑
  const unitMap: Record<string, 'g' | 'mL' | '개'> = {
    g: 'g', mL: 'mL', kg: 'g', L: 'mL',
  }

  return {
    productName:  metadata.productName,
    totalWeight:  metadata.totalWeight,
    unit:         unitMap[metadata.unit] ?? 'g',
    manufacturer: metadata.manufacturer,
    storage:      metadata.storage,
    expiryDate,
    ingredients:  ingredients.map(ing => ({
      id:          ing.id,
      name:        ing.name,
      weight:      String(ing.weight),
      origin:      ing.origin ?? '',
      isAllergen:  ing.isAllergen,
      isComposite: ing.isComposite,
    })),
  }
}

// ─── 화면: 무료 검토 결과 + 서비스 선택 (시안 app_review_v1.0) ─────────────────

const LOCK_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
)

const SVC_FEATURES: Record<ServiceType, { forWho: string; items: React.ReactNode[] }> = {
  basic: {
    forWho: '문제가 없거나 직접 고칠 수 있을 때',
    items: [<>17개 <b>항목별 결과</b></>, '표시사항 시트 PDF · PNG', '표시사항 텍스트 복사', '마이페이지 1년 보관'],
  },
  pro: {
    forWho: '수정 · 확인 항목이 있거나 신고 · 입점을 준비할 때',
    items: [<b key="b">기본 전체 포함</b>, '수정 방법 · 근거 법령 · 과태료', '검토 리포트 PDF', '신고 준비 가이드 · 분리배출 마크'],
  },
}

export default function ReviewResult() {
  const navigate = useNavigate()
  const location = useLocation()
  // 로그인 직후(결과 전 로그인)에는 location.state가 없으므로 보관해 둔 입력을 사용
  const raw = (location.state ?? readPendingReview()) as ReviewState | null
  const state = useMemo(() => (raw?.ingredients && raw?.metadata ? ensureReviewId(raw) : null), [raw])

  const results = useMemo(
    () => (state ? analyzeRegulations(state.ingredients, state.metadata) : []),
    [state],
  )
  const counts = countResults(results)
  const [service, setService] = useState<ServiceType>(() => (counts.need + counts.warn === 0 ? 'basic' : 'pro'))

  useEffect(() => {
    if (!state) return
    trackCheckerResultView(counts.need)
    saveReviewOnce(state, results, 'free')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.reviewId])

  useEffect(() => {
    if (location.hash === '#svc') document.getElementById('svc')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

  if (!state) return <Navigate to="/creator" replace />
  const { metadata } = state
  const total = results.length

  const title = counts.need > 0
    ? '판매 전에 확인이 필요한 항목이 있어요'
    : counts.warn > 0
      ? '몇 가지 항목은 한 번 더 확인해 주세요'
      : '입력한 정보 기준으로 모두 기준을 충족했어요'
  const lead = `${total}개 표시 항목을 검토했어요. ` + (
    counts.need > 0 && counts.warn > 0 ? `${counts.need}개 항목은 라벨을 고쳐야 하고, ${counts.warn}개는 확인을 권장해요.`
    : counts.need > 0 ? `${counts.need}개 항목은 라벨을 고쳐야 해요.`
    : counts.warn > 0 ? `${counts.warn}개 항목은 확인을 권장해요.`
    : '판매 전 최종 라벨과 한 번 더 대조해 주세요.'
  )

  const pct = (n: number) => `${((n / Math.max(total, 1)) * 100).toFixed(1)}%`
  const pick = SERVICE[service]

  const goPay = () => {
    trackBeginCheckout(pick.price, 'KRW', service)
    const payState: PaymentState = { ...state, service }
    writeSession(PAYMENT_STATE_KEY, payState)
    navigate('/payment', { state: payState })
  }
  const editInput = () => {
    navigate('/creator', { state: state.creatorData ? { prefill: state.creatorData, startStep: 4 } : undefined })
  }

  return (
    <div className="lp">
      <AppHeader mode="flow" current={2} />
      <main className="lp-page lp-page-pb lp-rv-page-m">
        <section className="lp-rv-hero" aria-labelledby="rv-h1">
          <div className="top">
            <div>
              <div className="lp-prod">
                <b>{metadata.productName || '이름 없는 제품'}</b>
                {productParts(metadata).map(p => <Frag key={p}><i />{p}</Frag>)}
              </div>
              <h1 id="rv-h1">{title}</h1>
              <p>{lead}</p>
            </div>
            <button type="button" className="lp-btn lp-btn-line lp-btn-sm" onClick={editInput}>✎ 입력 수정하기</button>
          </div>
          <div className="lp-rv-cnt">
            <div className="c-r"><b>{counts.need}</b><span>수정 필요</span><small>라벨을 고쳐야 해요</small></div>
            <div className="c-a"><b>{counts.warn}</b><span>확인 권장</span><small>한 번 더 확인해 주세요</small></div>
            <div className="c-g"><b>{counts.ok}</b><span>기준 충족</span><small>입력한 정보 기준</small></div>
            <div className="c-t">
              <span>검토한 항목 <b>{total}개</b></span>
              <div className="bar" aria-hidden="true">
                <i style={{ width: pct(counts.need), background: 'var(--red)' }} />
                <i style={{ width: pct(counts.warn), background: '#F0B429' }} />
                <i style={{ width: pct(counts.ok), background: 'var(--green)' }} />
              </div>
            </div>
          </div>
          <div className="lp-rv-meta">
            <span>검토번호 {state.reviewId}</span>
            <span>검토일 {fmtDate(state.reviewedAt)}</span>
            <span>기준: 식품표시광고법 · 식품등의 표시기준 · 원산지표시법 · 자원재활용법</span>
          </div>
        </section>

        <div className="lp-rv-grid">
          <div>
            <section className="lp-card" aria-labelledby="rv-items">
              <h2 id="rv-items">항목별 검토 결과</h2>
              <p className="lp-desc">어떤 항목이 왜 문제인지는 기본 · 전문 서비스에서 확인할 수 있어요.</p>
              <div className="lp-rv-items">
                {results.map((r, i) => (
                  <div key={r.id} className="it">
                    <span className="no">{String(i + 1).padStart(2, '0')}</span>
                    <span>{r.title}</span>
                    <span className="st" aria-label="결제 후 공개"><i /></span>
                  </div>
                ))}
                <div className="lock">
                  <div className="ic">{LOCK_ICON}</div>
                  <b>항목별 결과는 결제 후 열려요</b>
                  <p>어느 항목이 '수정 필요'인지, 무엇을 어떻게 고치면 되는지 확인하세요.</p>
                </div>
              </div>
            </section>
            {(metadata.categories ?? []).some(isOtherCategory) && (
              <div className="lp-notice">
                <span>ⓘ</span>
                <span>식품유형을 <b>기타</b>로 입력해 공통 17개 항목 기준으로 검토했어요. 이 유형에만 해당하는 전용 표시 기준은 반영되지 않았을 수 있어요.</span>
              </div>
            )}
            <div className="lp-notice">
              <span>ⓘ</span>
              <span>검토 결과는 입력한 정보를 바탕으로 한 <b>자율 점검 참고 자료</b>이며, 식약처 등 관할 기관의 공식 인증이나 법적 적합성 보증이 아닙니다.</span>
            </div>
          </div>

          <aside className="lp-rv-svc" id="svc" aria-labelledby="rv-svc">
            <div className="lp-card">
              <h2 id="rv-svc">서비스 선택</h2>
              <p className="lp-desc">이 제품 1건 기준 · 한 번만 결제해요</p>
              {counts.need + counts.warn > 0 && (
                <div className="lp-rv-rec">
                  <span>💡</span>
                  <span>
                    <b>{counts.need > 0 ? '수정 필요 항목이 있어요.' : '확인 권장 항목이 있어요.'}</b>{' '}
                    고치는 방법과 근거 법령이 함께 필요하다면 전문을 추천해요.
                  </span>
                </div>
              )}
              {(['basic', 'pro'] as const).map(s => (
                <label key={s} className={`lp-rv-opt${service === s ? ' on' : ''}`}>
                  <input type="radio" name="svc" checked={service === s} onChange={() => setService(s)} />
                  <div className="h">
                    <span className="rd" />
                    <b>{SERVICE[s].name}</b>
                    {s === 'pro' && <span className="lp-badge">추천</span>}
                    <span className="price">{won(SERVICE[s].price)}<small>원</small></span>
                  </div>
                  <p className="for">{SVC_FEATURES[s].forWho}</p>
                  <ul>{SVC_FEATURES[s].items.map((it, k) => <li key={k}>{it}</li>)}</ul>
                </label>
              ))}
              <button type="button" className="lp-btn lp-btn-blue lp-btn-block lp-rv-pay" onClick={goPay}>
                {pick.name} {won(pick.price)}원 결제하기
              </button>
              <p className="lp-rv-note">구독 없음 · 결제 전 <a href="/#refund">환불 안내</a>를 확인해 주세요</p>
              <a className="lp-rv-more" href="/pricing" target="_blank" rel="noopener">무료 · 기본 · 전문 한눈에 비교 →</a>
            </div>
          </aside>
        </div>
      </main>

      <div className="lp-mbar">
        <span>선택한 서비스<b>{pick.name} {won(pick.price)}원</b></span>
        <button type="button" className="lp-btn lp-btn-blue" onClick={goPay}>결제하기</button>
      </div>
    </div>
  )
}
