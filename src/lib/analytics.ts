// ── GA4 Analytics Helpers ─────────────────────────────────────────────────────
// 사용법: import { trackSignUp } from '../lib/analytics'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

/** 회원가입 완료 시점 */
export function trackSignUp() {
  gtag('event', 'sign_up')
}

/** Step 1 진입 시점 */
export function trackCheckerStart() {
  gtag('event', 'checker_start')
}

/** Step 2 도달 시점 (검수 결과 화면) */
export function trackCheckerResultView(violationCount: number) {
  gtag('event', 'checker_result_view', { violation_count: violationCount })
}

/** 결제 시작 시점 */
export function trackBeginCheckout(
  value: number,
  currency: string,
  serviceType: string,
) {
  gtag('event', 'begin_checkout', { value, currency, service_type: serviceType })
}

/** 결제 완료 시점 */
export function trackPurchase(
  transactionId: string,
  value: number,
  currency: string,
) {
  gtag('event', 'purchase', { transaction_id: transactionId, value, currency })
}
