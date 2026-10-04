// generateReviewId.ts — 검토번호 자동 발급 (D-2-7)
// 형식: LP-YYYYMMDD-XXXX (XXXX = 4자리 랜덤 대문자+숫자)

/**
 * LP-YYYYMMDD-XXXX 형식 검토번호 생성
 * @example "LP-20261004-A3F9"
 */
export function generateReviewId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const chars   = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  // 헷갈리는 문자 제외 (I, O, 0, 1)
  const suffix  = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  return `LP-${dateStr}-${suffix}`
}
