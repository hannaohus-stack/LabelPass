// ─── Tier 유틸리티 (기본 · 전문) ─────────────────────────────────────────────
// 서비스 깊이 기반 Tier 1 / Tier 2 (v3 카테고리 기반 Tier S/A/B 폐기)

export const TIER_1_PRICE = 9_900    // Tier 1: 기본 검토, 모든 카테고리
export const TIER_2_PRICE = 19_900   // Tier 2: 전문 레포트, 모든 카테고리

export type ServiceTier = 'tier1' | 'tier2'

/** 전체 카테고리 목록 (UI 렌더 순서 고정 — 카테고리 선택 UI에 계속 사용) */
export const ALL_CATEGORIES = [
  '잼류',
  '소스류',
  '장류',
  '떡류',
  '디저트/베이커리',
  '차/음료',
  '건강식품(일반)',
] as const

/** 식약처 공식 분류명 매핑 (PDF 보고서용) */
export const CATEGORY_OFFICIAL: Record<string, string> = {
  '잼류':           '잼류',
  '소스류':         '소스류',
  '장류':           '장류',
  '떡류':           '떡류',
  '디저트/베이커리': '과자류 및 빵 또는 떡류',
  '차/음료':        '음료류',
  '건강식품(일반)':  '기타식품류',
}

/** '기타(직접 입력)'는 categories에 '기타:<입력값>'으로 저장한다 (베타 신청 폼과 같은 형식) */
export const OTHER_PREFIX = '기타:'
export const isOtherCategory = (c: string) => c.startsWith(OTHER_PREFIX)

/** 화면 표시용 이름: '기타:커피' → '커피', '디저트/베이커리' → '디저트 · 베이커리' */
export const categoryText = (c: string) =>
  isOtherCategory(c) ? (c.slice(OTHER_PREFIX.length).trim() || '기타') : c.replace(/\//g, ' · ')

/** 라벨 식품유형용 이름: 공식 분류명이 있으면 그것, 기타는 입력값 그대로 */
export const officialCategory = (c: string) => CATEGORY_OFFICIAL[c] ?? categoryText(c)

/** 원화 포맷 (쉼표 구분) */
export const fmtKRW = (n: number) => n.toLocaleString('ko-KR')
