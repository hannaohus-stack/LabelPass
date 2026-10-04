import { useMemo, useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, AlertCircle,
  ChevronDown, ChevronUp, RotateCcw, Edit3, Lock,
} from 'lucide-react'
import LogoLockup from '../components/LogoLockup'
import type { Ingredient } from '../utils/parsing'
import type { ServiceTier } from '../utils/tierUtils'
import type { CreatorData } from './creator/types'
import { TIER_1_PRICE, TIER_2_PRICE, fmtKRW } from '../utils/tierUtils'
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
type StatusFilter = 'all' | 'violation' | 'warn' | 'pass'
type ServiceType = 'basic' | 'pro'
type ResultKind = 'need' | 'warn' | 'ok'

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
    // [KRK-LAW] 카테고리 4 - 자원재활용법 제14조 + 환경부 고시 2024-170호
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
    // [KRK-LAW] 카테고리 5 - 농수산물의 원산지 표시 등에 관한 법률 + 시행규칙 별표 1
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
    // [KRK-LAW] 카테고리 2 - 식품등의 표시기준 (식약처) 영양강조표시 조항
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

function riskLevel(violations: number, warnings: number): { label: string; color: string } {
  if (violations >= 3)                      return { label: '고위험',  color: '#B30000' }
  if (violations >= 1 || warnings >= 8)     return { label: '주의',    color: '#F0A500' }
  return                                           { label: '양호',    color: '#002D72' }
}

// ─── 상수 ─────────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG = {
  red:    { full: 'HIGH', bg: '#FFE6E6', color: '#B30000' },
  yellow: { full: 'MID',  bg: '#FFF3DC', color: '#8A5A00' },
}

const STATUS_CONFIG: Record<RiskStatus, {
  label: string
  badgeClass: string
  borderColor: string
  rowBg: string
  icon: React.ReactNode
}> = {
  violation: {
    label: '위반',
    badgeClass: 'badge-risk',
    borderColor: '#B30000',
    rowBg: '#FFFAFA',
    icon: <AlertTriangle size={10} />,
  },
  warn: {
    label: '경고',
    badgeClass: 'badge-warn',
    borderColor: '#F0A500',
    rowBg: '#FFFDF5',
    icon: <AlertCircle size={10} />,
  },
  pass: {
    label: '통과',
    badgeClass: 'badge-pass',
    borderColor: '#002D72',
    rowBg: '#EAF6FE',
    icon: <CheckCircle2 size={10} />,
  },
}

// ─── 법규 행 ──────────────────────────────────────────────────────────────────

function RegulationRow({
  result,
  expanded,
  onToggle,
  locked,
}: {
  result: RegulationResult
  expanded: boolean
  onToggle: () => void
  locked?: boolean
}) {
  const sev  = SEVERITY_CONFIG[result.severity]
  const stat = STATUS_CONFIG[result.status]
  const showPenalty = result.status === 'violation' || result.status === 'warn'
  const blurClass = locked ? 'select-none' : ''

  return (
    <div
      className="border-b border-[rgba(10,10,11,0.07)]"
      style={{ borderLeft: `3px solid ${stat.borderColor}` }}
    >
      {/* 헤더 행 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={{ background: expanded ? stat.rowBg : undefined }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = stat.rowBg }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = expanded ? stat.rowBg : '' }}
      >
        {/* 번호 */}
        <span className="font-en text-[11px] text-[rgba(10,10,11,0.28)] w-8 flex-shrink-0 text-right tabular-nums">
          {result.id}
        </span>

        {/* 심각도 칩 */}
        <span
          className="font-en text-[9px] font-bold tracking-[0.12em] px-1.5 py-[3px] flex-shrink-0 w-[44px] text-center"
          style={{ background: sev.bg, color: sev.color }}
        >
          {sev.full}
        </span>

        {/* 항목명 */}
        <span className="font-kr text-[13px] font-medium text-ink flex-1 text-left leading-none">
          {result.title}
        </span>

        {/* 과태료 */}
        {showPenalty && (
          <span className="font-en text-[11px] text-[rgba(10,10,11,0.38)] flex-shrink-0 hidden sm:block tabular-nums">
            {result.penaltyRange}
          </span>
        )}

        {/* 상태 배지 */}
        <span className={`${stat.badgeClass} flex-shrink-0`}>
          {stat.icon}
          {stat.label}
        </span>

        {/* 토글 */}
        <span className="text-[rgba(10,10,11,0.28)] flex-shrink-0 ml-1">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* 확장 패널 */}
      {expanded && (
        <div
          className={`pl-12 pr-4 pb-4 flex flex-col gap-3 border-t border-[rgba(10,10,11,0.06)] ${blurClass}`}
          style={{ background: stat.rowBg }}
        >
          {/* 감지 내역 — 항상 표시 */}
          <div className="pt-3">
            <p className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.32)] uppercase tracking-[0.1em] mb-1">
              감지 내역
            </p>
            <p className="font-kr text-[12px] text-[rgba(10,10,11,0.7)] leading-[1.65]">
              {result.detail}
            </p>
          </div>

          {/* 관련 법규 — 항상 표시 */}
          <div>
            <p className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.32)] uppercase tracking-[0.1em] mb-1">
              관련 법규
            </p>
            <p className="font-kr text-[12px] text-[rgba(10,10,11,0.5)]">{result.regulation}</p>
          </div>

          {/* 권고사항 — Tier 1: 블러 / Tier 2: 전체 표시 */}
          {result.status !== 'pass' && (
            <div className="relative bg-white border border-[rgba(10,10,11,0.08)] px-3 py-2.5 overflow-hidden">
              <p className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.32)] uppercase tracking-[0.1em] mb-1">
                조치 권고
              </p>
              <p
                className="font-kr text-[12px] text-[rgba(10,10,11,0.7)] leading-[1.65]"
                style={locked ? { filter: 'blur(4px)', userSelect: 'none' } : {}}
              >
                {result.suggestion}
              </p>
              {locked && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                  <Lock size={12} className="text-[rgba(10,10,11,0.35)] mr-1" />
                  <span className="font-kr text-[11px] text-[rgba(10,10,11,0.45)]">전문에서 확인</span>
                </div>
              )}
            </div>
          )}

          {/* 과태료 범위 — Tier 1: 블러 / Tier 2: 표시 */}
          {showPenalty && (
            <div className="relative flex items-center gap-2">
              <span
                className="font-en text-[11px] px-2 py-[3px]"
                style={{
                  background: result.status === 'violation' ? '#FFE6E6' : '#FFF3DC',
                  color:      result.status === 'violation' ? '#B30000' : '#8A5A00',
                  filter:     locked ? 'blur(4px)' : 'none',
                  userSelect: locked ? 'none' : 'auto',
                }}
              >
                {result.penaltyRange}
              </span>
              {locked && (
                <span className="font-kr text-[10px] text-[rgba(10,10,11,0.4)] flex items-center gap-1">
                  <Lock size={10} /> 과태료 금액 잠김
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── 페이지 컴포넌트 ────────────────────────────────────────────────────────────

export function LegacyReviewResult() {
  const navigate  = useNavigate()
  const location  = useLocation()

  // 라우터 state 가드 — 직접 접근 시 홈으로
  const state = location.state as {
    ingredients: Ingredient[]
    metadata: Metadata
    serviceTier?: ServiceTier
    fromCreator?: boolean   // CREATOR Step5에서 진입 시 — 결제 블록 숨기고 돌아가기 버튼 표시
    creatorData?: CreatorData  // 영양성분·알레르겐 전달용 (PDF 실데이터 연결)
  } | null
  if (!state?.ingredients || !state?.metadata) return <Navigate to="/" replace />

  const { ingredients, metadata } = state
  const fromCreator = state.fromCreator ?? false
  const serviceTier: ServiceTier = state.serviceTier ?? 'tier1'
  const isTier2 = serviceTier === 'tier2'

  const results   = useMemo(() => analyzeRegulations(ingredients, metadata), [ingredients, metadata])
  const [filter,  setFilter]    = useState<StatusFilter>('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [selectedTier, setSelectedTier] = useState<ServiceTier>('tier1')

  const counts = {
    violation: results.filter(r => r.status === 'violation').length,
    warn:      results.filter(r => r.status === 'warn').length,
    pass:      results.filter(r => r.status === 'pass').length,
  }

  const level = riskLevel(counts.violation, counts.warn)

  const maxPenaltyMw = results
    .filter(r => r.status === 'violation' || r.status === 'warn')
    .reduce((sum, r) => sum + parseMaxPenaltyMw(r.penaltyRange), 0)

  const filterCounts: Record<StatusFilter, number> = {
    all: results.length, violation: counts.violation, warn: counts.warn, pass: counts.pass,
  }

  const filtered = filter === 'all' ? results : results.filter(r => r.status === filter)
  const toggle   = (id: string) => setExpanded(prev => (prev === id ? null : id))

  return (
    <div className="min-h-screen bg-white">

      {/* ── 네비게이션 ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-16 py-[18px] bg-white/80 backdrop-blur-[18px] border-b border-[rgba(10,10,11,0.08)]">
        <button
          onClick={() => navigate('/')}
          className="flex items-baseline gap-[5px] hover:opacity-70 transition-opacity"
        >
          <LogoLockup />
        </button>
        {/* 라우트 스텝 표시 */}
        <div className="hidden md:flex items-center gap-0 font-en text-[11px] tracking-[0.1em] uppercase">
          {[
            { label: '원재료 입력', done: true },
            { label: '법규 검토',   done: false, active: true },
            { label: '내보내기',    done: false },
          ].map((s, i, arr) => (
            <div key={s.label} className="flex items-center">
              <div className={`flex items-center gap-2 ${s.active ? 'text-ink' : s.done ? 'text-breath-500' : 'text-[rgba(10,10,11,0.3)]'}`}>
                <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold border ${
                  s.done   ? 'bg-breath-500 border-breath-500 text-white' :
                  s.active ? 'bg-ink border-ink text-white' :
                  'border-[rgba(10,10,11,0.2)]'}`}>
                  {s.done ? '✓' : i + 1}
                </span>
                <span>{s.label}</span>
              </div>
              {i < arr.length - 1 && <span className="mx-4 text-[rgba(10,10,11,0.2)]">—</span>}
            </div>
          ))}
        </div>
        <div className="font-en text-[11px] text-[rgba(10,10,11,0.35)] tracking-[0.08em]">MVP v1</div>
      </nav>

      {/* ── 본문 ─────────────────────────────────────────────────────────────── */}
      <main className="pt-[72px] min-h-screen flex flex-col">
        <div className="flex-1 max-w-[760px] mx-auto w-full px-6 md:px-0 py-12 md:py-16">

          {/* 섹션 헤더 */}
          <div className="mb-10 pb-5 border-b border-[rgba(10,10,11,0.1)]">
            <div className="font-en text-[11px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.16em] mb-2">
              02 — 법규 검토
            </div>
            <h1 className="font-en font-medium text-[clamp(24px,3.5vw,36px)] tracking-[-0.02em] leading-[1.1]">
              {metadata.productName || '제품'}<br />법규 검토 결과
            </h1>
          </div>

          <div className="flex flex-col gap-8">

            {/* 리스크 요약 */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-5 py-4 border"
                style={{ borderColor: level.color, borderLeftWidth: 4, background: level.color + '08' }}>
                <div>
                  <span className="font-en text-[11px] font-bold tracking-[0.12em] uppercase" style={{ color: level.color }}>
                    RISK LEVEL
                  </span>
                  <p className="font-kr font-semibold text-[20px] mt-0.5" style={{ color: level.color }}>{level.label}</p>
                </div>
                <div className="text-right">
                  <p className="font-en text-[11px] text-[rgba(10,10,11,0.4)] mb-0.5">검토 항목</p>
                  <p className="font-en font-bold text-[24px] text-ink tabular-nums">{results.length}개</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="border border-[#B30000] px-4 py-3.5 bg-[#FFE6E6]">
                  <div className="font-en font-bold text-[36px] text-[#B30000] leading-none tabular-nums">{counts.violation}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertTriangle size={11} className="text-[#B30000]" />
                    <span className="font-kr text-[12px] text-[rgba(10,10,11,0.65)]">위반</span>
                  </div>
                </div>
                <div className="border border-[#F0A500] px-4 py-3.5 bg-[#FFF3DC]">
                  <div className="font-en font-bold text-[36px] text-[#8A5A00] leading-none tabular-nums">{counts.warn}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <AlertCircle size={11} className="text-[#8A5A00]" />
                    <span className="font-kr text-[12px] text-[rgba(10,10,11,0.65)]">경고</span>
                  </div>
                </div>
                <div className="border border-heritage-500 px-4 py-3.5 bg-[#EAF6FE]">
                  <div className="font-en font-bold text-[36px] text-heritage-500 leading-none tabular-nums">{counts.pass}</div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle2 size={11} className="text-heritage-500" />
                    <span className="font-kr text-[12px] text-[rgba(10,10,11,0.65)]">통과</span>
                  </div>
                </div>
              </div>

              {maxPenaltyMw > 0 && (
                <div className="flex items-start gap-3 px-4 py-3 border border-[#B30000] bg-[#FFF8F8]" style={{ borderLeftWidth: 4 }}>
                  <AlertTriangle size={14} className="text-[#B30000] flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-en font-semibold text-[13px] text-[#B30000]">
                      예상 최대 과태료 {maxPenaltyMw.toLocaleString()}만원
                    </span>
                    <p className="font-kr text-[12px] text-[rgba(10,10,11,0.5)] mt-0.5 leading-[1.6]">
                      위반·경고 항목 과태료 최대값 합산 기준 · 실제 처분은 위반 횟수·규모에 따라 다름
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ── B-6: 위반·경고 요약 배너 (2-line compact) ─────────────── */}
            {(counts.violation > 0 || counts.warn > 0) && (
              <div className="border border-[rgba(10,10,11,0.1)] divide-y divide-[rgba(10,10,11,0.07)]">
                {counts.violation > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF5F5]" style={{ borderLeft: '3px solid #B30000' }}>
                    <AlertTriangle size={13} className="text-[#B30000] flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="font-en text-[12px] font-bold text-[#B30000] flex-shrink-0">
                        위반 {counts.violation}건
                      </span>
                      <span className="font-kr text-[11px] text-[rgba(10,10,11,0.5)] truncate">
                        {results.filter(r => r.status === 'violation').map(r => r.title).join(' · ')}
                      </span>
                    </div>
                  </div>
                )}
                {counts.warn > 0 && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[#FFFBF0]" style={{ borderLeft: '3px solid #F0A500' }}>
                    <AlertCircle size={13} className="text-[#8A5A00] flex-shrink-0" />
                    <div className="flex-1 min-w-0 flex items-baseline gap-2">
                      <span className="font-en text-[12px] font-bold text-[#8A5A00] flex-shrink-0">
                        경고 {counts.warn}건
                      </span>
                      <span className="font-kr text-[11px] text-[rgba(10,10,11,0.5)] truncate">
                        {results.filter(r => r.status === 'warn').map(r => r.title).join(' · ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 필터 탭 */}
            <div className="flex gap-0 border-b border-[rgba(10,10,11,0.1)]">
              {([
                { key: 'all'       as StatusFilter, label: '전체' },
                { key: 'violation' as StatusFilter, label: '위반' },
                { key: 'warn'      as StatusFilter, label: '경고' },
                { key: 'pass'      as StatusFilter, label: '통과' },
              ]).map(({ key, label }) => {
                const active = filter === key
                const dot = key === 'violation' ? '#B30000' : key === 'warn' ? '#F0A500' : key === 'pass' ? '#002D72' : undefined
                return (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`flex items-center gap-2 font-en text-[11px] font-semibold tracking-[0.08em] px-4 py-2.5 uppercase transition-colors border-b-[2px] -mb-px ${
                      active ? 'text-ink border-ink' : 'text-[rgba(10,10,11,0.35)] border-transparent hover:text-[rgba(10,10,11,0.65)]'
                    }`}>
                    {dot && <span className="w-1.5 h-1.5 flex-shrink-0" style={{ background: active ? dot : 'rgba(10,10,11,0.2)', borderRadius: '50%' }} />}
                    {label}
                    <span className="font-normal opacity-55 ml-0.5">({filterCounts[key]})</span>
                  </button>
                )
              })}
            </div>

            {/* 법규 목록 */}
            <div className="border border-[rgba(10,10,11,0.1)] border-b-0">
              {filtered.length === 0
                ? <div className="flex items-center justify-center py-12">
                    <p className="font-kr text-[13px] text-[rgba(10,10,11,0.4)]">해당 항목이 없습니다.</p>
                  </div>
                : filtered.map(r => (
                    <RegulationRow
                      key={r.id}
                      result={r}
                      expanded={expanded === r.id}
                      onToggle={() => toggle(r.id)}
                      locked={!isTier2 && r.status !== 'pass'}
                    />
                  ))
              }
            </div>

            {/* ── 섹션 3: 디자인 규격 안내 (Tier 1/2 모두 표시) ──────────────── */}
            <div className="border border-[rgba(10,10,11,0.1)] bg-[rgba(10,10,11,0.015)]">
              <div className="px-5 py-3 border-b border-[rgba(10,10,11,0.07)] flex items-center justify-between">
                <div className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.12em]">
                  03 — 라벨 디자인 규격
                </div>
                <span className="font-kr text-[10px] text-[rgba(10,10,11,0.35)]">참고용 안내</span>
              </div>
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">
                {[
                  { title: '제품명 글자 크기',   desc: '주표시면 면적에 따라 최소 12pt 이상 (식품표시기준 제6조)' },
                  { title: '원재료명 글자 크기', desc: '최소 8pt 이상, 알레르기 유발 원료 굵게(볼드) 표시 필수' },
                  { title: '영양성분표 위치',   desc: '주표시면 외 측면 또는 후면, 표의 형태로 기재' },
                  { title: '소비기한 표시 위치', desc: '주표시면 또는 잘 보이는 위치, 도트 인쇄 병행 권장' },
                  { title: '분리배출 마크 크기', desc: '가로·세로 각 8mm 이상, 주표시면 외 표시 가능' },
                  { title: '제조업소 표시',      desc: '제조업소명 + 소재지 + 신고번호 3개 항목 모두 필수' },
                ].map(({ title, desc }) => (
                  <div key={title} className="flex flex-col gap-0.5">
                    <span className="font-kr font-semibold text-ink">{title}</span>
                    <span className="font-kr text-[rgba(10,10,11,0.55)] leading-[1.5]">{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── 분리배출 마크 (Tier 2 전용) ──────────────────────────────── */}
            {isTier2 && (metadata.packagingMaterials?.length ?? 0) > 0 && (
              <div className="border border-[rgba(10,10,11,0.1)]">
                <div className="px-5 py-3 border-b border-[rgba(10,10,11,0.07)] flex items-center justify-between">
                  <div className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.12em]">
                    분리배출 마크
                  </div>
                  <span className="font-kr text-[10px] text-[rgba(10,10,11,0.4)]">환경부 고시 2024-170호</span>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-4">
                  {(metadata.packagingMaterials ?? []).map(mat => {
                    // [KRK-LAW] 카테고리 4 - 환경부 고시 2024-170호
                    // ⚠️ 아래 SVG는 placeholder — 실제 배포 시 한국환경공단 공식 도안으로 교체 필수
                    const fileMap: Record<string, string> = {
                      '페트(PET)':              '/recycling/plastic-pet.svg',
                      '고밀도 폴리에틸렌(HDPE)': '/recycling/plastic-pe.svg',
                      '폴리염화비닐(PVC)':       '/recycling/plastic-pe.svg',
                      '저밀도 폴리에틸렌(LDPE)': '/recycling/plastic-pe.svg',
                      '폴리프로필렌(PP)':        '/recycling/plastic-pp.svg',
                      '폴리스티렌(PS)':          '/recycling/plastic-ps.svg',
                      '기타 플라스틱':           '/recycling/plastic-pe.svg',
                      '유리':                   '/recycling/glass.svg',
                      '철':                     '/recycling/can-steel.svg',
                      '알루미늄':               '/recycling/can-aluminum.svg',
                      '종이팩':                 '/recycling/paper.svg',
                      '골판지':                 '/recycling/paper.svg',
                      '일반 종이':              '/recycling/paper.svg',
                      '비닐류':                 '/recycling/vinyl.svg',
                      '스티로폼':               '/recycling/plastic-ps.svg',
                    }
                    const src = fileMap[mat]
                    if (!src) return null
                    return (
                      <div key={mat} className="flex flex-col items-center gap-1.5">
                        <img src={src} alt={mat} className="w-14 h-14 border border-[rgba(10,10,11,0.08)]" />
                        <span className="font-kr text-[10px] text-[rgba(10,10,11,0.5)]">{mat}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 pb-4">
                  <p className="font-kr text-[11px] text-[rgba(10,10,11,0.4)] leading-[1.6]">
                    위 이미지는 참고용 placeholder입니다.
                    공식 마크는 <strong>한국환경공단 분리배출표시 시스템</strong>에서 다운로드하세요.
                  </p>
                </div>
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="flex flex-col gap-3 pt-2">

              {/* ── CREATOR 진입 시: 결제 블록 대신 돌아가기 버튼 ──────────── */}
              {fromCreator && (
                <button
                  onClick={() => navigate(-1)}
                  className="w-full flex items-center justify-center gap-2 h-12 font-kr font-semibold text-[14px] bg-ink text-white hover:bg-[rgba(10,10,11,0.8)] transition-colors"
                >
                  ← 라벨 미리보기로 돌아가기
                </button>
              )}

              {/* ── B-5: 서비스 선택 UI (CHECK 플로우 전용) ───────────────── */}
              {!fromCreator && (<>
              <div className="border border-[rgba(10,10,11,0.12)] flex flex-col gap-0">
                {/* 헤더 */}
                <div className="px-5 py-3.5 border-b border-[rgba(10,10,11,0.08)]">
                  <p className="font-en text-[10px] font-semibold text-[rgba(10,10,11,0.35)] uppercase tracking-[0.12em]">
                    상품 선택
                  </p>
                  <p className="font-kr text-[13px] text-ink mt-0.5">
                    필요한 산출물 범위에 맞춰 선택하세요.
                  </p>
                </div>

                {/* 티어 카드 */}
                <div className="grid grid-cols-2 gap-0 divide-x divide-[rgba(10,10,11,0.08)]">
                  {/* 기본 */}
                  <button
                    type="button"
                    onClick={() => setSelectedTier('tier1')}
                    className={`flex flex-col gap-2 px-4 py-4 text-left transition-colors select-none
                      ${selectedTier === 'tier1'
                        ? 'bg-ink text-white'
                        : 'bg-white text-ink hover:bg-[rgba(10,10,11,0.02)]'
                      }`}
                  >
                    <div>
                      <p className={`font-en text-[10px] font-semibold uppercase tracking-[0.1em] mb-0.5
                        ${selectedTier === 'tier1' ? 'text-white/60' : 'text-[rgba(10,10,11,0.4)]'}`}>
                        기본 라벨 패키지
                      </p>
                      <div className="flex items-baseline gap-0.5">
                        <span className="font-en text-[22px] font-semibold tabular-nums leading-none">
                          {fmtKRW(TIER_1_PRICE)}
                        </span>
                        <span className={`font-kr text-[12px] ${selectedTier === 'tier1' ? 'text-white/60' : 'text-[rgba(10,10,11,0.45)]'}`}>원</span>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {['라벨 PDF', '기본 신호등 결과', '표시사항 텍스트'].map(f => (
                        <li key={f} className="flex items-center gap-1.5">
                          <CheckCircle2 size={11} className={`flex-shrink-0 ${selectedTier === 'tier1' ? 'text-white/70' : 'text-[rgba(10,10,11,0.35)]'}`} />
                          <span className={`font-kr text-[11px] leading-tight ${selectedTier === 'tier1' ? 'text-white/80' : 'text-[rgba(10,10,11,0.55)]'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>

                  {/* 전문 — 비선택 시에도 heritage 강조 유지 */}
                  <button
                    type="button"
                    onClick={() => setSelectedTier('tier2')}
                    className={`flex flex-col gap-2 px-4 py-4 text-left transition-colors select-none relative
                      ${selectedTier === 'tier2'
                        ? 'bg-heritage-500 text-white'
                        : 'bg-[rgba(0,45,114,0.04)] text-ink hover:bg-[rgba(0,45,114,0.08)]'
                      }`}
                  >
                    {/* 추천 뱃지 */}
                    <span className={`absolute top-3 right-3 font-en text-[9px] font-bold px-1.5 py-0.5 uppercase tracking-[0.08em]
                      ${selectedTier === 'tier2' ? 'bg-white/20 text-white' : 'bg-heritage-500 text-white'}`}>
                      추천
                    </span>
                    <div>
                      <p className={`font-en text-[10px] font-semibold uppercase tracking-[0.1em] mb-0.5
                        ${selectedTier === 'tier2' ? 'text-white/60' : 'text-heritage-500'}`}>
                        전문 수정 가이드
                      </p>
                      <div className="flex items-baseline gap-0.5">
                        <span className={`font-en text-[22px] font-semibold tabular-nums leading-none
                          ${selectedTier === 'tier2' ? 'text-white' : 'text-heritage-500'}`}>
                          {fmtKRW(TIER_2_PRICE)}
                        </span>
                        <span className={`font-kr text-[12px] ${selectedTier === 'tier2' ? 'text-white/60' : 'text-heritage-500/70'}`}>원</span>
                      </div>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {['항목별 수정 방법', '표시 기준 출처', '과태료/행정처분 참고', '신고 입력 가이드'].map(f => (
                        <li key={f} className="flex items-center gap-1.5">
                          <CheckCircle2 size={11} className={`flex-shrink-0 ${selectedTier === 'tier2' ? 'text-white/70' : 'text-heritage-500/70'}`} />
                          <span className={`font-kr text-[11px] leading-tight ${selectedTier === 'tier2' ? 'text-white/80' : 'text-heritage-500/80'}`}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                </div>

                {/* 결제 버튼 */}
                <div className="px-5 py-4 border-t border-[rgba(10,10,11,0.08)] flex flex-col gap-2">
                  <button
                    onClick={() =>
                      navigate('/payment', {
                        state: { ingredients, metadata, returnTier: selectedTier, creatorData: state.creatorData },
                      })
                    }
                    className={`w-full flex items-center justify-center gap-2 h-12 font-kr font-semibold text-[14px] transition-colors
                      ${selectedTier === 'tier2'
                        ? 'bg-heritage-500 text-white hover:bg-[#001F5A]'
                        : 'bg-ink text-white hover:bg-[rgba(10,10,11,0.8)]'
                      }`}
                  >
                    <Lock size={14} />
                    {selectedTier === 'tier2' ? '상세 수정 가이드 받기' : '기본 라벨 패키지 받기'} — {fmtKRW(selectedTier === 'tier2' ? TIER_2_PRICE : TIER_1_PRICE)}원
                  </button>
                  <p className="font-kr text-[11px] text-[rgba(10,10,11,0.35)] text-center leading-[1.5]">
                    결제 후 선택한 산출물을 바로 확인하고 다운로드할 수 있어요.
                  </p>
                </div>
              </div>

              {/* Creator 연결 CTA */}
              <button
                onClick={() =>
                  navigate('/creator', {
                    state: { prefill: toCreatorPrefill(ingredients, metadata) },
                  })
                }
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Edit3 size={14} />
                Creator에서 라벨 수정하기
              </button>

              {/* Secondary 버튼 */}
              <div className="flex items-center">
                <button onClick={() => navigate('/', { replace: true })} className="btn-ghost flex items-center gap-2">
                  <RotateCcw size={14} />
                  홈으로
                </button>
              </div>

              </>)}

            </div>

          </div>
        </div>

        {/* 하단 면책 문구 */}
        <footer className="border-t border-[rgba(10,10,11,0.06)] px-6 py-5 text-center">
          <p className="font-en text-[11px] text-[rgba(10,10,11,0.3)] leading-[1.6]">
            krk.team이 제공하는 검토 결과 및 과태료 금액은 참고용 정보이며, 법적 효력이 없습니다.
            정확한 법규 해석은 관할 지자체 또는 식약처에 문의하세요.
          </p>
        </footer>
      </main>
    </div>
  )
}

interface BResultItem {
  id: string
  kind: ResultKind
  title: string
  desc: string
  locked: boolean
}

interface BResultCounts {
  need: number
  warn: number
  ok: number
}

function toResultItems(results: RegulationResult[]): BResultItem[] {
  return results.map(r => ({
    id: r.id,
    kind: r.status === 'violation' ? 'need' : r.status === 'warn' ? 'warn' : 'ok',
    title: r.title,
    desc: r.detail,
    locked: r.status !== 'pass',
  }))
}

function StickyNavB() {
  const navigate = useNavigate()
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 md:px-14 py-[16px] bg-white/80 backdrop-blur-[18px] border-b border-[rgba(10,10,11,0.08)]">
      <button onClick={() => navigate('/')} className="flex items-baseline gap-[5px] hover:opacity-70 transition-opacity">
        <LogoLockup />
      </button>
      <span className="hidden sm:block font-en text-[11px] font-semibold text-[rgba(10,10,11,0.4)] uppercase tracking-[0.16em]">
        Free Review Result
      </span>
      <span className="font-en text-[11px] text-[rgba(10,10,11,0.4)] uppercase tracking-[0.08em]">
        krk.team/review
      </span>
    </nav>
  )
}

function FlowBreadcrumbB() {
  const steps: Array<{ n: number; label: string; state: 'done' | 'active' | 'inactive' }> = [
    { n: 1, label: '정보 입력', state: 'done' },
    { n: 2, label: '라벨 미리보기', state: 'done' },
    { n: 3, label: '무료 검토 결과', state: 'active' },
    { n: 4, label: '상세 수정 가이드', state: 'inactive' },
    { n: 5, label: '다운로드', state: 'inactive' },
  ]

  return (
    <div className="overflow-x-auto pb-3">
      <div className="min-w-[760px] flex items-center font-en text-[11px] font-semibold uppercase tracking-[0.08em]">
        {steps.map((step, idx) => (
          <div key={step.n} className="flex items-center">
            <div className={`flex items-center gap-2 whitespace-nowrap ${step.state === 'inactive' ? 'text-[rgba(10,10,11,0.4)]' : 'text-heritage-500'}`}>
              <span className={`w-[26px] h-[26px] rounded-full flex items-center justify-center border text-[11px] ${
                step.state === 'done'
                  ? 'border-heritage-500 text-heritage-500 bg-white'
                  : step.state === 'active'
                    ? 'border-heritage-500 bg-heritage-500 text-white'
                    : 'border-[rgba(10,10,11,0.2)] text-[rgba(10,10,11,0.4)] bg-white'
              }`}>
                {step.state === 'done' ? <CheckCircle2 size={13} /> : step.n}
              </span>
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && <span className="block w-10 h-px bg-[rgba(10,10,11,0.15)] mx-4" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreInlineB({ n, label, color, dark, divider }: {
  n: number
  label: string
  color: string
  dark: boolean
  divider?: boolean
}) {
  return (
    <div className={divider ? 'pl-5 border-l' : ''} style={{ borderColor: divider ? (dark ? 'rgba(255,255,255,0.16)' : 'rgba(10,10,11,0.08)') : undefined }}>
      <div className="font-en text-[38px] font-bold leading-none tracking-[-0.025em] tabular-nums" style={{ color }}>{n}</div>
      <div className="mt-2 font-kr text-[12px]" style={{ color: dark ? 'rgba(255,255,255,0.7)' : 'rgba(10,10,11,0.65)' }}>{label}</div>
    </div>
  )
}

function HeroB({ counts, metadata, onBackToCreator }: {
  counts: BResultCounts
  metadata: Metadata
  onBackToCreator: () => void
}) {
  const hasViolations = counts.need > 0
  const hasIssues = counts.need + counts.warn > 0
  const h1 = hasViolations
    ? '판매 전 확인이 필요한 항목이 발견됐어요.'
    : hasIssues
      ? '몇 가지만 보완하면 판매 준비가 끝나요.'
      : '입력하신 라벨이 기준에 맞는지 정리했어요.'

  return (
    <section
      className="px-[22px] py-[24px] md:px-[36px] md:py-[36px] border mb-4"
      style={{
        background: hasViolations ? '#1a1d24' : '#fff',
        borderColor: hasViolations ? '#1a1d24' : 'rgba(10,10,11,0.08)',
        color: hasViolations ? '#fff' : '#0A0A0B',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
        <div className="max-w-[720px]">
          <div className="font-en text-[11px] font-bold uppercase tracking-[0.16em] mb-4" style={{ color: hasViolations ? 'rgba(255,255,255,0.7)' : '#002D72' }}>
            {hasViolations ? 'Action Required · 무료 검토 결과' : '무료 검토 결과'}
          </div>
          <h1 className="font-kr text-[26px] md:text-[44px] font-bold leading-[1.1] tracking-[-0.02em]">{h1}</h1>
          <p className="mt-4 font-kr text-[13.5px] md:text-[15px] leading-[1.7]" style={{ color: hasViolations ? 'rgba(255,255,255,0.68)' : 'rgba(10,10,11,0.62)' }}>
            {metadata.productName || '입력한 제품'}의 라벨 미리보기를 기준으로, 판매 전 확인해야 할 표시 기준을 먼저 정리했습니다.
          </p>
        </div>
        <button
          onClick={onBackToCreator}
          className="self-start md:self-end font-kr text-[12.5px] font-medium pb-px border-b"
          style={{ color: hasViolations ? '#fff' : '#002D72', borderColor: hasViolations ? 'rgba(255,255,255,0.4)' : '#0CA4F9' }}
        >
          ← 입력 수정하기
        </button>
      </div>
      <div className="mt-8 pt-6 grid grid-cols-3 gap-4" style={{ borderTop: `1px solid ${hasViolations ? 'rgba(255,255,255,0.16)' : 'rgba(10,10,11,0.08)'}` }}>
        <ScoreInlineB n={counts.need} label="필수 확인" color={hasViolations ? '#FF8A8A' : '#B30000'} dark={hasViolations} />
        <ScoreInlineB n={counts.warn} label="보완 권장" color={hasViolations ? '#FFD78B' : '#8A5A00'} dark={hasViolations} divider />
        <ScoreInlineB n={counts.ok} label="기준 충족" color={hasViolations ? '#0CA4F9' : '#002D72'} dark={hasViolations} divider />
      </div>
    </section>
  )
}

function ViolationsCalloutB({ violations, hasLockedDetails }: { violations: BResultItem[]; hasLockedDetails: boolean }) {
  if (violations.length === 0) return null
  return (
    <div className="bg-white border border-[rgba(10,10,11,0.08)] px-6 py-[18px] mb-4" style={{ borderLeft: '3px solid #B30000' }}>
      <div className="font-en text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#B30000] mb-[10px]">
        판매 전 필수 확인 — {violations.length}건
      </div>
      {violations.map(v => (
        <div key={v.id} className="flex items-baseline gap-[10px] py-1.5 border-t border-dashed border-[rgba(10,10,11,0.08)]">
          <span className="font-en text-[11px] font-semibold text-[#B30000] min-w-[32px]">{v.id}</span>
          <span className="text-[14px] font-semibold text-ink tracking-[-0.01em] flex-1">{v.title}</span>
          <span className="text-[11.5px] text-[rgba(10,10,11,0.4)] whitespace-nowrap">수정 문구 잠김</span>
        </div>
      ))}
      {hasLockedDetails && (
        <div className="mt-3 pt-3 border-t border-[rgba(10,10,11,0.08)] flex items-start gap-2 text-[12px] text-[rgba(10,10,11,0.55)] leading-[1.6]">
          <AlertTriangle size={13} className="text-[#B30000] mt-0.5 flex-shrink-0" />
          <span>수정 방법, 기준 출처, 과태료/행정처분 참고 정보는 상세 수정 가이드에서 확인할 수 있어요.</span>
        </div>
      )}
    </div>
  )
}

function SectionHeaderB({ title, count, kind }: { title: string; count: number; kind: ResultKind }) {
  const color = kind === 'need' ? '#B30000' : kind === 'warn' ? '#8A5A00' : '#002D72'
  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b border-[rgba(10,10,11,0.08)]">
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <h3 className="m-0 text-[13.5px] font-semibold tracking-[-0.005em]">{title}</h3>
        <span className="font-en text-[11px] font-semibold text-[rgba(10,10,11,0.4)]">{String(count).padStart(2, '0')}</span>
      </div>
    </div>
  )
}

const B_BADGE_MAP: Record<ResultKind, { bg: string; text: string }> = {
  need: { bg: '#FFE6E6', text: '#B30000' },
  warn: { bg: '#FFF3DC', text: '#8A5A00' },
  ok: { bg: '#EAF6FE', text: '#00255E' },
}

function BadgeB({ kind, children }: { kind: ResultKind; children: React.ReactNode }) {
  const s = B_BADGE_MAP[kind]
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-kr text-[11px] font-medium tracking-[-0.005em] whitespace-nowrap" style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.text }} />
      {children}
    </span>
  )
}

function ResultItemCompactB({ item }: { item: BResultItem }) {
  const badgeLabel = item.kind === 'need' ? '필수 확인' : item.kind === 'warn' ? '보완 권장' : '기준 충족'
  return (
    <article className="flex items-center gap-3.5 px-5 py-3.5 border-b border-[rgba(10,10,11,0.08)] flex-wrap">
      <div className="flex-shrink-0"><BadgeB kind={item.kind}>{badgeLabel}</BadgeB></div>
      <div className="flex-1 min-w-[200px]">
        <h3 className="m-0 mb-0.5 text-[15px] font-semibold tracking-[-0.01em]">{item.title}</h3>
        <p className="m-0 text-[13px] text-[rgba(10,10,11,0.65)] leading-[1.5] whitespace-pre-line">{item.desc}</p>
      </div>
      {item.locked && (
        <div className="flex-shrink-0 flex items-center gap-[5px] text-[11.5px] text-heritage-500 font-medium whitespace-nowrap">
          <Lock size={12} className="text-heritage-500" />
          수정 문구 잠김
        </div>
      )}
    </article>
  )
}

function PackageTabB({ active, onClick, label, price, recommended }: {
  active: boolean
  onClick: () => void
  label: string
  price: string
  recommended?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className="text-left px-4 py-3.5"
      style={{
        background: active ? (recommended ? '#002D72' : '#0A0A0B') : 'transparent',
        color: active ? '#fff' : '#0A0A0B',
        borderRight: !recommended ? '1px solid rgba(10,10,11,0.08)' : 'none',
      }}
    >
      <div className="flex items-center justify-between gap-1.5 text-[12.5px] font-semibold tracking-[-0.005em]">
        <span>{label}</span>
        {recommended && (
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.06em] px-[5px] py-0.5" style={{ background: active ? 'rgba(255,255,255,0.16)' : '#EAF6FE', color: active ? '#fff' : '#002D72' }}>
            추천
          </span>
        )}
      </div>
      <div className="mt-1 font-en text-[14px] font-bold tracking-[-0.01em]" style={{ opacity: active ? 1 : 0.7 }}>
        {price}<span className="font-kr text-[11px] ml-0.5 font-medium">원</span>
      </div>
    </button>
  )
}

function IntegratedPackageCardB({ ingredients, metadata, creatorData }: {
  ingredients: Ingredient[]
  metadata: Metadata
  creatorData?: CreatorData
}) {
  const [service, setService] = useState<ServiceType>('pro')
  const navigate = useNavigate()
  const meta = service === 'pro'
    ? {
        eyebrow: 'Professional Guide · Recommended',
        title: '전문 수정 가이드',
        price: fmtKRW(TIER_2_PRICE),
        bullets: ['항목별 수정 방법 + 표시 기준 출처', '과태료 · 행정처분 참고 정보', '신고 입력 가이드 + 라벨 검토 리포트', '분리배출 마크 ZIP + 라벨 PDF/PNG'],
        cta: '상세 수정 가이드 받기',
        ctaColor: '#002D72',
      }
    : {
        eyebrow: 'Basic Label Package',
        title: '기본 라벨 패키지',
        price: fmtKRW(TIER_1_PRICE),
        bullets: ['라벨 PDF · 인쇄용', '라벨 PNG · 고해상도', '항목별 텍스트 복사'],
        cta: '기본 라벨 패키지 받기',
        ctaColor: '#0CA4F9',
      }

  return (
    <aside className="lg:sticky lg:top-[88px] border border-heritage-500 bg-white self-start">
      <div className="grid grid-cols-2 border-b border-[rgba(10,10,11,0.08)]">
        <PackageTabB active={service === 'basic'} onClick={() => setService('basic')} label="기본" price={fmtKRW(TIER_1_PRICE)} />
        <PackageTabB active={service === 'pro'} onClick={() => setService('pro')} label="전문" price={fmtKRW(TIER_2_PRICE)} recommended />
      </div>
      <div className="p-[22px]">
        <div className={`font-en text-[10px] font-bold uppercase tracking-[0.14em] mb-2 ${service === 'pro' ? 'text-heritage-500' : 'text-[rgba(10,10,11,0.4)]'}`}>{meta.eyebrow}</div>
        <h3 className="m-0 text-[20px] font-semibold tracking-[-0.01em]">{meta.title}</h3>
        <div className="mt-2.5 text-heritage-500 leading-none">
          <span className="font-en text-[36px] font-bold tracking-[-0.025em]">{meta.price}</span>
          <span className="ml-1 font-kr text-[14px] font-medium text-[rgba(10,10,11,0.4)]">원</span>
        </div>
        <ul className="grid gap-[9px] my-[18px] p-0 list-none">
          {meta.bullets.map(b => (
            <li key={b} className="flex gap-2.5 text-[12.5px] text-[rgba(10,10,11,0.65)] leading-[1.55]">
              <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" style={{ color: meta.ctaColor }} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => navigate('/payment', { state: { ingredients, metadata, service, creatorData } })}
          className="w-full h-12 flex items-center justify-center gap-2 font-kr text-[13.5px] font-semibold text-white"
          style={{ background: meta.ctaColor }}
        >
          {meta.cta}
        </button>
        <div className="mt-3.5 pt-3 border-t border-[rgba(10,10,11,0.08)] text-[11px] text-[rgba(10,10,11,0.4)] leading-[1.5]">
          KRK 검토 결과는 자율 점검 참고 자료이며, 식약처 공식 인증이 아닙니다.
        </div>
      </div>
    </aside>
  )
}

function ResultsPanelB({ violations, warns, okItems, counts }: {
  violations: BResultItem[]
  warns: BResultItem[]
  okItems: BResultItem[]
  counts: BResultCounts
}) {
  const [showOk, setShowOk] = useState(false)
  return (
    <div>
      {violations.length > 0 && (
        <div className="bg-white border border-[rgba(10,10,11,0.08)] mb-3.5">
          <SectionHeaderB title="필수 확인" count={violations.length} kind="need" />
          {violations.map(it => <ResultItemCompactB key={it.id} item={it} />)}
        </div>
      )}
      {warns.length > 0 && (
        <div className="bg-white border border-[rgba(10,10,11,0.08)] mb-3.5">
          <SectionHeaderB title="보완 권장" count={warns.length} kind="warn" />
          {warns.map(it => <ResultItemCompactB key={it.id} item={it} />)}
        </div>
      )}
      <div className="bg-white border border-[rgba(10,10,11,0.08)]">
        <div className="px-5 py-4 flex items-center justify-between gap-3.5 flex-wrap">
          <div className="flex items-center gap-3">
            <BadgeB kind="ok">기준 충족 {counts.ok}</BadgeB>
            <span className="text-[13px] text-[rgba(10,10,11,0.65)]">표시 기준을 충족한 항목입니다.</span>
          </div>
          <button onClick={() => setShowOk(v => !v)} className="text-[12.5px] text-heritage-500 font-medium border-b border-breath-500 pb-px">
            {showOk ? '접기' : '전체 보기'} →
          </button>
        </div>
        {showOk && okItems.map(it => <ResultItemCompactB key={it.id} item={it} />)}
      </div>
    </div>
  )
}

function NoticePanelB() {
  return (
    <div className="mt-6 p-[18px] border border-[rgba(10,10,11,0.08)] bg-white">
      <h3 className="m-0 mb-2 text-[13.5px] font-semibold tracking-[-0.005em]">중요 안내</h3>
      <p className="m-0 text-[12px] text-[rgba(10,10,11,0.65)] leading-[1.6]">
        KRK의 검토 결과는 입력한 정보를 기준으로 한 자율 점검 참고 자료이며, 식약처 또는 관할 기관의 공식 인증이 아닙니다.
      </p>
    </div>
  )
}

export default function ReviewResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as {
    ingredients: Ingredient[]
    metadata: Metadata
    serviceTier?: ServiceTier
    service?: ServiceType
    fromCreator?: boolean
    creatorData?: CreatorData
  } | null
  if (!state?.ingredients || !state?.metadata) return <Navigate to="/" replace />

  const { ingredients, metadata, creatorData } = state
  const fromCreator = state.fromCreator ?? false
  const results = useMemo(() => analyzeRegulations(ingredients, metadata), [ingredients, metadata])
  const items = useMemo(() => toResultItems(results), [results])
  const counts = useMemo<BResultCounts>(() => ({
    need: items.filter(i => i.kind === 'need').length,
    warn: items.filter(i => i.kind === 'warn').length,
    ok: items.filter(i => i.kind === 'ok').length,
  }), [items])
  const violations = items.filter(i => i.kind === 'need')
  const warns = items.filter(i => i.kind === 'warn')
  const okItems = items.filter(i => i.kind === 'ok')
  const hasLockedDetails = results.some(r => r.status !== 'pass' && parseMaxPenaltyMw(r.penaltyRange) > 0)

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <StickyNavB />
      <main className="pt-[72px]">
        <div className="max-w-[1140px] mx-auto px-5 md:px-14 py-9">
          <FlowBreadcrumbB />
          <HeroB counts={counts} metadata={metadata} onBackToCreator={() => navigate('/creator')} />
          <ViolationsCalloutB violations={violations} hasLockedDetails={hasLockedDetails} />
          <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <ResultsPanelB violations={violations} warns={warns} okItems={okItems} counts={counts} />
            {fromCreator ? (
              <button onClick={() => navigate(-1)} className="w-full h-12 bg-ink text-white font-semibold text-[14px]">
                ← 라벨 미리보기로 돌아가기
              </button>
            ) : (
              <IntegratedPackageCardB ingredients={ingredients} metadata={metadata} creatorData={creatorData} />
            )}
          </section>
          <NoticePanelB />
        </div>
      </main>
    </div>
  )
}
