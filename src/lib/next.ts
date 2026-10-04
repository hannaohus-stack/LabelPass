/**
 * 로그인 후 돌아갈 주소(next) 처리
 * - 같은 사이트 안의 경로만 허용 (/로 시작, //·백슬래시 금지)
 * - 카카오 로그인은 외부로 나갔다 돌아오므로 sessionStorage에 잠시 보관
 */
const NEXT_KEY = 'lp_auth_next'
/** 검사 입력 완료 후 로그인 전에 보관하는 검토 결과 진입 데이터 */
export const PENDING_REVIEW_KEY = 'lp_pending_review'

export function safeNext(raw: string | null | undefined): string | null {
  if (!raw) return null
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return null
  return raw
}

export function rememberNext(next: string | null) {
  try {
    if (next) sessionStorage.setItem(NEXT_KEY, next)
    else sessionStorage.removeItem(NEXT_KEY)
  } catch { /* 저장 실패는 무시 */ }
}

export function takeRememberedNext(): string | null {
  try {
    const v = sessionStorage.getItem(NEXT_KEY)
    sessionStorage.removeItem(NEXT_KEY)
    return safeNext(v)
  } catch { return null }
}

export function readPendingReview<T>(): T | null {
  try {
    const raw = sessionStorage.getItem(PENDING_REVIEW_KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch { return null }
}
