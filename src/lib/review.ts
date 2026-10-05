/**
 * 검토 → 결제 → 결과 → 마이페이지 공통 도우미 (앱 UI v1.0 2차)
 * - 검토 1건 = 검토번호(reviewId) 1개. 무료 결과와 결제 기록을 이 번호로 묶는다.
 */
import type { Ingredient } from '../utils/parsing'
import type { Metadata, RegulationResult } from '../pages/ReviewResult'
import type { CreatorData } from '../pages/creator/types'
import { TIER_1_PRICE, TIER_2_PRICE, categoryText } from '../utils/tierUtils'
import { generateReviewId } from '../utils/generateReviewId'
import { PENDING_REVIEW_KEY } from './next'
import { supabase } from './supabase'

export type ServiceType = 'basic' | 'pro'

export interface ReviewState {
  ingredients: Ingredient[]
  metadata: Metadata
  creatorData?: CreatorData
  reviewId?: string
  reviewedAt?: string
}

export interface PaymentState extends ReviewState {
  service: ServiceType
}

/** 결제창(외부)에 다녀오는 동안 보관 */
export const PAYMENT_STATE_KEY = 'lp_payment_state'

export const SERVICE: Record<ServiceType, { name: string; price: number; tier: 'tier1' | 'tier2' }> = {
  basic: { name: '기본', price: TIER_1_PRICE, tier: 'tier1' },
  pro:   { name: '전문', price: TIER_2_PRICE, tier: 'tier2' },
}

export const won = (n: number) => n.toLocaleString('ko-KR')

/** 검토번호·검토일이 없으면 붙이고, 로그인 후 복원용 보관본도 갱신 */
export function ensureReviewId<T extends ReviewState>(state: T): T {
  if (state.reviewId && state.reviewedAt) return state
  const next = { ...state, reviewId: state.reviewId ?? generateReviewId(), reviewedAt: state.reviewedAt ?? new Date().toISOString() }
  try { sessionStorage.setItem(PENDING_REVIEW_KEY, JSON.stringify(next)) } catch { /* 무시 */ }
  return next
}

export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}

export function writeSession(key: string, value: unknown) {
  try { sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* 무시 */ }
}

export type ResultKind = 'need' | 'warn' | 'ok'
export const kindOf = (r: Pick<RegulationResult, 'status'>): ResultKind =>
  r.status === 'violation' ? 'need' : r.status === 'warn' ? 'warn' : 'ok'

export function countResults(results: Pick<RegulationResult, 'status'>[]) {
  return {
    need: results.filter(r => r.status === 'violation').length,
    warn: results.filter(r => r.status === 'warn').length,
    ok:   results.filter(r => r.status === 'pass').length,
  }
}

/** '왜 문제인가요' 표시용 — 근거·과태료·수정방법 줄은 전문 영역이라 뺀다 */
export function whyText(detail: string): string {
  return detail
    .split('\n')
    .filter(line => !/^\s*(근거|과태료|수정방법)\s*:/.test(line))
    .join('\n')
    .trim()
}

const BIZ: Record<string, string> = { '식품제조가공업': '식품제조 · 가공업', '즉판가공업': '즉석판매제조 · 가공업' }

/** 제품 한 줄 요약: 제품명 · 카테고리 · 내용량 · 영업 */
export function productParts(m: Metadata): string[] {
  return [
    (m.categories ?? []).map(categoryText).join(', '),
    m.totalWeight ? `${m.totalWeight}${m.unit}` : '',
    m.businessType ? (BIZ[m.businessType] ?? m.businessType) : '',
  ].filter(Boolean)
}

export const fmtDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 검토 기록 저장 — 같은 검토번호 + 같은 상태는 한 번만 저장
 * (label_reviews는 수정 권한이 없어 무료 결과와 결제 기록을 각각 한 행으로 남김)
 */
export async function saveReviewOnce(
  state: ReviewState,
  results: Pick<RegulationResult, 'id' | 'status'>[],
  kind: 'free' | ServiceType,
  extra: Record<string, unknown> = {},
): Promise<void> {
  if (!state.reviewId) return
  const status = kind === 'free' ? 'reviewed' : 'paid'
  const flag = `lp_saved_${state.reviewId}_${status}`
  try { if (sessionStorage.getItem(flag)) return } catch { /* 무시 */ }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: existing } = await supabase
    .from('label_reviews')
    .select('id')
    .eq('status', status)
    .eq('metadata->>reviewId', state.reviewId)
    .limit(1)
  if (existing && existing.length > 0) {
    try { sessionStorage.setItem(flag, '1') } catch { /* 무시 */ }
    return
  }

  const { error } = await supabase.from('label_reviews').insert({
    user_id: user.id,
    product_name: state.metadata.productName || '이름 없는 제품',
    categories: state.metadata.categories ?? [],
    tier: kind === 'free' ? 'free' : SERVICE[kind].tier,
    status,
    amount: kind === 'free' ? 0 : SERVICE[kind].price,
    metadata: {
      ...state.metadata,
      reviewId: state.reviewId,
      reviewedAt: state.reviewedAt,
      creatorData: state.creatorData ?? null,
      ...extra,
    },
    ingredients: state.ingredients ?? [],
    results: results.map(r => ({ id: r.id, status: r.status })),
  })
  if (error) {
    console.error('[review] 기록 저장 실패:', error.message)
    return
  }
  try { sessionStorage.setItem(flag, '1') } catch { /* 무시 */ }
}
