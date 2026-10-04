import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// 환경변수 없을 때 더미값 — DEV_BYPASS 모드에서 크래시 방지용
// TODO: 실제 Supabase 연동 전 .env.local에 키 추가 후 더미값 제거
const DEV_URL = 'https://placeholder.supabase.co'
const DEV_KEY = 'placeholder-anon-key'

const IS_DEV = !supabaseUrl || supabaseUrl === DEV_URL

if (IS_DEV) {
  console.warn('[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 환경변수가 없습니다. DEV 더미값으로 실행 중.')
}

export const supabase = createClient(
  supabaseUrl || DEV_URL,
  supabaseKey || DEV_KEY
)

// ─── payments 테이블 기록 ────────────────────────────────────────────────────
/**
 * 결제 완료 시 payments 테이블에 기록 (기본/전문 공통)
 *
 * Supabase SQL (최초 1회 실행):
 * CREATE TABLE payments (
 *   id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
 *   user_id     uuid REFERENCES auth.users(id),
 *   order_id    text NOT NULL,
 *   payment_key text,
 *   amount      integer NOT NULL,
 *   tier        text NOT NULL,
 *   product_name text,
 *   created_at  timestamptz DEFAULT now()
 * );
 */
export interface PaymentRecord {
  orderId:     string
  paymentKey?: string
  amount:      number
  tier:        'tier1' | 'tier2'
  productName?: string
}

export async function recordPayment(record: PaymentRecord): Promise<void> {
  // DEV 모드에서는 기록 스킵 (더미 Supabase로 실제 insert 불가)
  if (IS_DEV) {
    console.info('[supabase] DEV 모드 — payments 기록 스킵:', record)
    return
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('payments')
    .insert({
      user_id:      user?.id ?? null,
      order_id:     record.orderId,
      payment_key:  record.paymentKey ?? null,
      amount:       record.amount,
      tier:         record.tier,
      product_name: record.productName ?? null,
    })

  if (error) {
    console.error('[supabase] payments 기록 실패:', error.message)
    // 기록 실패는 사용자 경험을 막지 않음 — silent fail
  }
}

// ─── label_reviews 테이블 ────────────────────────────────────────────────────
export interface LabelReviewRecord {
  productName:  string
  categories:   string[]
  tier:         string
  status:       'reviewed' | 'paid'
  amount:       number
  metadata?:    Record<string, unknown>
  ingredients?: unknown[]
  results?:     unknown[]
}

export async function saveLabelReview(record: LabelReviewRecord): Promise<void> {
  if (IS_DEV) {
    console.info('[supabase] DEV 모드 — label_reviews 기록 스킵:', record)
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.warn('[supabase] 비로그인 상태 — label_reviews 기록 스킵')
    return
  }

  const { error } = await supabase
    .from('label_reviews')
    .insert({
      user_id:      user.id,
      product_name: record.productName,
      categories:   record.categories,
      tier:         record.tier,
      status:       record.status,
      amount:       record.amount,
      metadata:     record.metadata    ?? {},
      ingredients:  record.ingredients ?? [],
      results:      record.results     ?? [],
    })

  if (error) {
    console.error('[supabase] label_reviews 기록 실패:', error.message)
  }
}

export interface LabelReviewRow {
  id:           string
  product_name: string
  categories:   string[]
  tier:         string
  status:       string
  amount:       number
  created_at:   string
  metadata:     Record<string, unknown> | null
  ingredients:  unknown[] | null
  results:      unknown[] | null
}

export async function getLabelReviews(): Promise<LabelReviewRow[]> {
  if (IS_DEV) return []

  const { data, error } = await supabase
    .from('label_reviews')
    .select('id, product_name, categories, tier, status, amount, created_at, metadata, ingredients, results')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('[supabase] label_reviews 조회 실패:', error.message)
    return []
  }

  return (data ?? []) as LabelReviewRow[]
}
