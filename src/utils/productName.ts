/** 제품명에 원재료 이름이 들어 있는지 (띄어쓰기 무시) — 제품명에 쓴 원재료는 함량(%)을 표시해야 한다 */
export function usedInProductName(productName: string, ingredientName: string): boolean {
  const compact = (s: string) => s.replace(/\s/g, '')
  const name = compact(ingredientName)
  return name.length > 0 && compact(productName).includes(name)
}
