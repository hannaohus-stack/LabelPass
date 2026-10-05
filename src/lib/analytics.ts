// ── GA4 Analytics Helpers ─────────────────────────────────────────────────────
// 사용법: import { trackSignUp } from '../lib/analytics'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    dataLayer: unknown[]
    fbq?: (...args: unknown[]) => void
  }
}

function gtag(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args)
  }
}

// ── Meta Pixel ────────────────────────────────────────────────────────────────
// 베이스 코드(PageView)는 app.html · 정적 페이지 <head>에서 로드.
// 여기서는 퍼널 이벤트 2개(CompleteRegistration · Purchase)만, 성공 확정 후 1회씩.
// 개인정보(이메일·이름·전화·사업자번호·라벨 내용)는 파라미터에 넣지 않는다.
function fbq(...args: unknown[]) {
  if (typeof window !== 'undefined' && typeof window.fbq === 'function') {
    window.fbq(...args)
  }
}

/** 같은 키로는 한 번만 실행 (새로고침·재진입 중복 방지). localStorage 불가 시 1회는 허용 */
function once(key: string, fn: () => void) {
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch { /* 저장 불가 시 그대로 진행 */ }
  fn()
}

/** 가입 성공 직후 1회 (사용자당 1회) */
export function trackCompleteRegistration(userId?: string) {
  once(`lp_fbq_cr_${userId ?? 'anon'}`, () => fbq('track', 'CompleteRegistration'))
}

// 베타 신청(설문) 완료 — Meta 광고 전환(Lead). 신청당 1회
export function trackBetaLead(applicationKey: string) {
  once(`lp_fbq_lead_${applicationKey}`, () => fbq('track', 'Lead'))
}

/** 결제 확정 직후 1회 (주문당 1회). value=부가세 포함 결제금액(숫자), currency='KRW' */
export function trackPurchaseMeta(value: number, orderId: string) {
  once(`lp_fbq_pur_${orderId}`, () => fbq('track', 'Purchase', { value, currency: 'KRW' }))
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
