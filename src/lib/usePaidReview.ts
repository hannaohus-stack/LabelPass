/**
 * 이미 결제한 검토인지 확인 — 검토번호(reviewId) 기준
 * - 같은 브라우저: 결제 완료 때 남긴 표시(sessionStorage)
 * - 로그인 사용자: 서버 검토 기록(label_reviews status=paid)
 * 뒤로 가기로 검토 결과·결제 화면에 다시 들어와도 같은 검토를 두 번 결제하지 않게 한다.
 */
import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import type { ServiceType } from './review'

export interface PaidInfo { service: ServiceType; paidAt?: string }
const key = (id: string) => `lp_paid_${id}`

export function readPaid(reviewId?: string): PaidInfo | null {
  if (!reviewId) return null
  try { const raw = sessionStorage.getItem(key(reviewId)); return raw ? (JSON.parse(raw) as PaidInfo) : null } catch { return null }
}

export function markPaid(reviewId: string | undefined, info: PaidInfo): void {
  if (!reviewId) return
  try { sessionStorage.setItem(key(reviewId), JSON.stringify(info)) } catch { /* 무시 */ }
}

export async function fetchPaidReview(reviewId: string): Promise<PaidInfo | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { data } = await supabase
      .from('label_reviews')
      .select('tier, metadata')
      .eq('status', 'paid')
      .eq('metadata->>reviewId', reviewId)
      .limit(1)
    const row = data?.[0] as { tier?: string; metadata?: { paidAt?: string } | null } | undefined
    if (!row) return null
    const info: PaidInfo = { service: row.tier === 'tier1' ? 'basic' : 'pro', paidAt: row.metadata?.paidAt }
    markPaid(reviewId, info)
    return info
  } catch { return null }
}

export function usePaidReview(reviewId?: string): PaidInfo | null {
  const [paid, setPaid] = useState<PaidInfo | null>(() => readPaid(reviewId))
  useEffect(() => {
    setPaid(readPaid(reviewId))
    if (!reviewId) return
    let alive = true
    fetchPaidReview(reviewId).then(p => { if (alive && p) setPaid(p) })
    return () => { alive = false }
  }, [reviewId])
  return paid
}
