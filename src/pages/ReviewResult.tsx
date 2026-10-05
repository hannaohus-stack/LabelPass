import { Fragment as Frag, useEffect, useMemo, useState } from 'react'
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
import { detectAllergens } from '../utils/allergenChecker'
import { LEGAL_ALLERGEN_IDS } from '../utils/data/allergens'
import { usedInProductName } from '../utils/productName'

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
  sanction: string             // 제재 참고 (시행규칙 별표 7 등 확인된 것만, 없으면 빈 문자열)
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

  // 제품명에 쓴 원재료 (함량 표시 대상 — R04)
  const totalGram = ingredients.reduce((sum, i) => sum + i.weight, 0)
  const namedInProduct = ingredients.filter(i => usedInProductName(metadata.productName, i.name))

  // 알레르기: 법정 19종류와 자율 표시(법정 아님)를 나눈다. 직접 알레르기로 표시한 원재료는 법정 대상으로 본다.
  const detectedAll = new Map<string, { id: string; name: string }>()
  for (const ing of ingredients) for (const a of detectAllergens(ing.name)) detectedAll.set(a.id, a)
  const manualAllergens = ingredients.filter(i => i.isAllergen && detectAllergens(i.name).length === 0).map(i => i.name)
  const legalAllergens = [...new Set([
    ...[...detectedAll.values()].filter(a => LEGAL_ALLERGEN_IDS.has(a.id)).map(a => a.name),
    ...manualAllergens,
  ])]
  const voluntaryAllergens = [...detectedAll.values()].filter(a => !LEGAL_ALLERGEN_IDS.has(a.id)).map(a => a.name)

  const map: Record<string, { status: RiskStatus; detail: string }> = {
    R01: metadata.productName.trim()
      ? { status: 'pass',      detail: `제품명 "${metadata.productName}"을(를) 확인했어요.` }
      : { status: 'violation', detail: '제품명이 입력되지 않았어요. 라벨에 꼭 있어야 하는 항목이에요.' },

    R02: metadata.totalWeight.trim()
      ? { status: 'pass',      detail: `내용량 ${metadata.totalWeight}${metadata.unit}을(를) 확인했어요.` }
      : { status: 'violation', detail: '내용량이 입력되지 않았어요. 숫자와 단위(g/mL)를 함께 적어야 해요.' },

    R03: !allWeights
      ? { status: 'warn',        detail: '원재료 중량이 없어서 순서를 자동으로 확인할 수 없어요. 많이 쓴 순서대로 적었는지 직접 확인해 주세요.' }
      : isSorted
        ? { status: 'pass',      detail: '원재료가 많이 쓴 순서대로 정렬돼 있어요.' }
        : { status: 'violation', detail: '원재료 순서가 많이 쓴 순서와 달라요. 순서를 다시 정리해야 해요.' },

    // 제품명에 원재료 이름이 들어갈 때만 해당 — 표시사항 시트와 같은 기준(usedInProductName)
    R04: namedInProduct.length > 0
      ? {
          status: 'warn',
          detail: `제품명에 쓴 원재료 ${namedInProduct.map(i => `"${i.name}"`).join(', ')}의 함량(%)을 라벨에 적어야 해요.` +
            (totalGram > 0 ? `\n입력한 배합 기준으로는 ${namedInProduct.map(i => `${i.name} ${(i.weight / totalGram * 100).toFixed(1)}%`).join(', ')}예요.` : ''),
        }
      : { status: 'pass', detail: '제품명에 원재료 이름이 들어 있지 않아 함량 표시 대상이 아니에요. 제품명을 바꾸면 다시 확인해 주세요.' },

    R05: (() => {
      const sharedKitchen = metadata.facilityType === '공유'
      const sharedNote = sharedKitchen
        ? '\n공유주방을 쓰고 있어요. 알레르기 원료를 쓰는 다른 제품과 같은 설비를 쓴다면 "이 제품은 ○○을 사용한 제품과 같은 제조 시설에서 제조하고 있습니다" 같은 혼입 우려 문구를 적어야 해요.'
        : ''
      const voluntaryNote = voluntaryAllergens.length > 0
        ? `\n법에서 정한 표시 대상은 아니지만 자율로 적을 수 있는 물질: ${voluntaryAllergens.join(', ')}`
        : ''
      if (legalAllergens.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `${legalAllergens.join(', ')} 등 법에서 정한 알레르기 유발물질 ${legalAllergens.length}가지가 있어요. 원재료명과 따로 알레르기 표시란에 적어야 해요.${voluntaryNote}${sharedNote}`,
        }
      }
      if (sharedKitchen) {
        return {
          status: 'warn' as RiskStatus,
          detail: `직접 쓴 알레르기 유발물질은 감지되지 않았어요.${voluntaryNote}${sharedNote}`,
        }
      }
      return {
        status: 'pass' as RiskStatus,
        detail: `법에서 정한 알레르기 유발물질이 감지되지 않았어요.${voluntaryNote}`,
      }
    })(),

    R06: composites.length > 0
      ? { status: 'warn',  detail: `${composites.map(c => c.name).join(', ')} 등 복합원재료 ${composites.length}개가 있어요. 괄호 안에 구성 원재료를 많이 쓴 순서대로 적어야 해요.` }
      : { status: 'pass',  detail: '복합원재료가 감지되지 않았어요.' },

    R07: metadata.expiryDays.trim()
      ? { status: 'pass',      detail: `소비기한 ${metadata.expiryDays}일 기준으로 확인했어요. 라벨에는 "YYYY.MM.DD까지" 형식으로 적어요.` }
      : { status: 'violation', detail: '소비기한이 입력되지 않았어요. 2024년 1월 1일부터 유통기한 대신 소비기한을 표시해야 해요.' },

    R08: metadata.storage.trim()
      ? { status: 'pass',  detail: `보관방법 "${metadata.storage}"을(를) 확인했어요. 개봉 후 보관방법도 들어 있는지 확인해 주세요.` }
      : { status: 'warn',  detail: '보관방법이 입력되지 않았어요. 개봉 전·후 보관 조건을 모두 적어요.' },

    // 영양표시 대상: 시행규칙 별표 4 — 즉석판매제조·가공업이 직접 만들거나 덜어 파는 식품은 제외,
    // 시행일은 2022년 매출 120억 원 초과 2026.1.1 / 120억 원 이하 2028.1.1, 포장 주표시면 30㎠ 이하 제외
    R09: metadata.businessType === '즉판가공업'
      ? { status: 'pass', detail: '즉석판매제조·가공업이 직접 만들거나 덜어 파는 식품은 영양표시 대상에서 제외돼요.' }
      : {
          status: 'warn',
          detail: '영양표시 대상 식품이면 영양성분표가 필요해요. 시행일은 영업소 매출에 따라 달라요: 2022년 매출이 120억 원을 넘으면 2026년 1월 1일부터, 120억 원 이하이면 2028년 1월 1일부터예요. 포장 주표시면 면적이 30㎠ 이하이면 대상에서 제외돼요.',
        },

    // TBD(한나 결정 대기): 즉석판매제조·가공업은 품목보고번호 판정에서 제외할지 — 확정 전까지 기존 판정 유지
    R10: (() => {
      if (!metadata.manufacturer.trim()) {
        return { status: 'violation' as RiskStatus, detail: '영업소 명칭이 입력되지 않았어요. 소재지(도로명 주소)와 품목보고번호도 함께 적어야 해요.' }
      }
      const missing: string[] = []
      if (!metadata.manufacturerAddress?.trim()) missing.push('소재지(도로명 주소)')
      const hasReportNumber = Boolean(metadata.reportNumber?.trim())
      const reportNumberNeeded = metadata.reportNumberStatus === 'none_or_needed'
      if (!hasReportNumber && !reportNumberNeeded) missing.push('품목보고번호')
      if (missing.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `영업소 "${metadata.manufacturer}"을(를) 확인했어요. 입력되지 않은 항목: ${missing.join(', ')}`,
        }
      }
      if (reportNumberNeeded) {
        return {
          status: 'warn' as RiskStatus,
          detail: `영업소 "${metadata.manufacturer}"을(를) 확인했어요. 품목보고번호는 아직 없거나 신청이 필요한 상태예요.\n판매용 라벨에는 품목제조보고 후 받은 번호를 넣어야 해요.`,
        }
      }
      return {
        status: 'pass' as RiskStatus,
        detail: `영업소 "${metadata.manufacturer}" / 소재지 "${metadata.manufacturerAddress}" / 품목보고번호 "${metadata.reportNumber}"을(를) 확인했어요.`,
      }
    })(),

    R11: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length > 0) {
        return {
          status: 'pass' as RiskStatus,
          detail: `포장재질 [${pm.join(', ')}]을(를) 선택했어요. 라벨에 선택한 재질명을 정확히 적고, 용기와 뚜껑의 재질이 다르면 각각 적어요.`,
        }
      }
      return {
        status: 'warn' as RiskStatus,
        detail: '포장재질이 선택되지 않았어요. 용기·뚜껑 재질을 직접 확인하고 라벨에 적어요.',
      }
    })(),

    // 부당 표시·광고 문구 — 법 제8조제1항 · 시행규칙 별표 7
    // '수정 필요': 확인된 유형(질병 효능 암시 · 의약품 오인 · 사용하지 못하는 용어)만. 나머지는 '확인 권장'.
    R12: (() => {
      const targets = [
        metadata.productName,
        metadata.labelClaim ?? '',
        ...ingredients.map(i => i.name),
      ].join(' ')
      const CONFIRMED = ['치료', '항암', '암 예방', '당뇨', '고혈압', '혈당 강하', '질병 예방', '약효', '이온수', '생명수', '약수']
      const SOFT = ['유기농', '천연', '무첨가', '다이어트', '자연산']
      const hit = CONFIRMED.filter(kw => targets.includes(kw))
      if (hit.length > 0) {
        return {
          status: 'violation' as RiskStatus,
          detail: `"${hit.join('", "')}" 표현이 감지됐어요. 병을 낫게 하거나 예방한다는 뜻으로 읽히거나 사용하지 못하는 용어예요. 라벨에서 빼야 해요.`,
        }
      }
      const soft = SOFT.filter(kw => targets.includes(kw))
      if (soft.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `"${soft.join('", "')}" 표현이 감지됐어요. 인증이나 근거가 있어야 쓸 수 있는 표현일 수 있어요. 근거가 없다면 빼고, 있다면 증빙을 확인해 주세요.`,
        }
      }
      return { status: 'pass' as RiskStatus, detail: '질병 효능이나 과장으로 읽힐 표현이 제품명·원재료·라벨 문구에서 감지되지 않았어요.' }
    })(),

    // ─── R15~R17: 분리배출 표시 ───────────────────────────────────────────────
    // 자원의 절약과 재활용촉진에 관한 법률 제14조 · 분리배출 표시에 관한 지침(환경부고시 제2024-170호)
    R15: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: '포장재질이 선택되지 않아 분리배출 표시를 확인할 수 없어요. 입력 단계에서 포장재질을 선택하면 맞는 도안을 안내해요.',
        }
      }
      return {
        status: 'warn' as RiskStatus,
        detail: `선택한 포장재 [${pm.join(', ')}]에 맞는 분리배출 표시가 필요해요.\n전문 서비스의 분리배출 마크 ZIP에서 재질별 도안(SVG·PNG)을 받을 수 있어요.`,
      }
    })(),

    R16: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return { status: 'warn' as RiskStatus, detail: '포장재질이 입력되지 않아 이 항목은 건너뛰었어요.' }
      }
      // 플라스틱 계열: PET, HDPE, PVC, LDPE, PP, PS, 기타플라스틱, 비닐류
      const PLASTIC_MATERIALS = ['페트(PET)', '고밀도 폴리에틸렌(HDPE)', '폴리염화비닐(PVC)', '저밀도 폴리에틸렌(LDPE)', '폴리프로필렌(PP)', '폴리스티렌(PS)', '기타 플라스틱', '비닐류']
      const plastics = pm.filter(m => PLASTIC_MATERIALS.includes(m))
      if (plastics.length > 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: `플라스틱 계열 포장재(${plastics.join(', ')})를 쓰고 있어요. 분리배출 도안에 PET·HDPE·PP·PS 같은 구체적인 재질 글자가 들어 있어야 해요.`,
        }
      }
      return { status: 'pass' as RiskStatus, detail: '플라스틱 계열 포장재가 없어 이 항목은 해당 없어요.' }
    })(),

    R17: (() => {
      const pm = metadata.packagingMaterials ?? []
      if (pm.length === 0) {
        return { status: 'warn' as RiskStatus, detail: '포장재질이 입력되지 않아 이 항목은 건너뛰었어요.' }
      }
      if (pm.length > 1) {
        return {
          status: 'warn' as RiskStatus,
          detail: `포장재가 여러 가지예요(${pm.join(', ')}). 따로 분리되는 포장재마다 분리배출 표시를 해야 해요.`,
        }
      }
      return { status: 'pass' as RiskStatus, detail: '포장재가 한 가지라 분리배출 표시 1개면 돼요.' }
    })(),

    // ─── R19: 원료 원산지 표시 ────────────────────────────────────────────────
    // 농수산물의 원산지 표시 등에 관한 법률 제5조 · 시행령 제3조 (생활법령정보 안내 기준)
    // 표시 대상: 한 가지 원료가 98% 이상이면 그 원료 / 두 가지 합이 98% 이상이면 2순위까지 / 그 밖에는 상위 3순위까지
    // 제외: 물, 식품첨가물, 주정, 당류
    R19: (() => {
      const isExcluded = (name: string) =>
        name === '물' || ['정제수', '식품첨가물', '주정', '당류', '설탕', '포도당', '과당', '올리고당', '물엿'].some(ex => name.includes(ex))

      if (totalGram === 0) {
        return {
          status: 'warn' as RiskStatus,
          detail: '원재료 함량 정보가 없어 원산지를 표시해야 하는 원료를 자동으로 확인할 수 없어요. 배합비율이 높은 원료의 원산지를 굵게 적어 주세요.',
        }
      }

      const ranked = ingredients
        .filter(i => !isExcluded(i.name))
        .map(i => ({ ing: i, pct: (i.weight / totalGram) * 100 }))
        .sort((a, b) => b.pct - a.pct)

      if (ranked.length === 0) {
        return { status: 'pass' as RiskStatus, detail: '원산지를 표시해야 하는 원료가 없어요.' }
      }

      const THRESHOLD = 98
      const required =
        ranked[0].pct >= THRESHOLD ? ranked.slice(0, 1)
          : ranked.length >= 2 && ranked[0].pct + ranked[1].pct >= THRESHOLD ? ranked.slice(0, 2)
            : ranked.slice(0, 3)

      const missingOrigin = required.filter(r => !r.ing.origin || r.ing.origin.trim() === '')
      if (missingOrigin.length === 0) {
        return {
          status: 'pass' as RiskStatus,
          detail: `원산지를 표시해야 하는 원료의 원산지가 입력돼 있어요.\n대상 원료: ${required.map(r => `${r.ing.name}(${r.ing.origin})`).join(', ')}\n라벨에는 굵은 글씨로 적어요.`,
        }
      }
      return {
        status: 'warn' as RiskStatus,
        detail: `원산지를 표시해야 하는 원료인데 원산지가 입력되지 않았어요.\n대상 원료: ${required.map(r => `${r.ing.name} (${r.pct.toFixed(1)}%)`).join(', ')}\n입력한 단계에서 해당 원료의 원산지(국산·미국산 등)를 적고, 라벨에는 굵은 글씨로 표시해요.`,
      }
    })(),

    // ─── R20: 영양강조표시 감지 ────────────────────────────────────────────────
    // 감지 대상: 제품명 + 원재료명 + 라벨 표시 문구
    R20: (() => {
      const NUTRITION_NOTE = '영양강조표시를 쓰려면 영양성분 표시가 함께 필요해요. 열량·나트륨·탄수화물·당류·지방·트랜스지방·포화지방·콜레스테롤·단백질 9가지를 표시해요.'
      if (metadata.hasNutritionClaim) {
        return { status: 'warn' as RiskStatus, detail: `영양강조표시를 쓴다고 입력했어요. ${NUTRITION_NOTE}` }
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
        ? { status: 'warn' as RiskStatus, detail: `영양강조 표현이 감지됐어요: "${found.join('", "')}". ${NUTRITION_NOTE}` }
        : { status: 'pass' as RiskStatus, detail: '영양강조 표현(무가당·저칼로리·고단백 등)이 제품명·원재료·라벨 문구에서 감지되지 않았어요.' }
    })(),
  }

  return (regulationsData as unknown as Omit<RegulationResult, 'status' | 'detail'>[]).map(reg => ({
    ...reg,
    severity: reg.severity as 'red' | 'yellow',
    ...(map[reg.id] ?? { status: 'warn' as RiskStatus, detail: '' }),
  }))
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
    items: [<b key="b">기본 전체 포함</b>, '수정 방법 · 근거 법령 · 제재 참고', '검토 리포트 PDF', '신고 준비 가이드 · 분리배출 마크'],
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
