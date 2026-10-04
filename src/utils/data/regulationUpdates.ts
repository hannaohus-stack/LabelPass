export interface RegulationUpdate {
  id: string
  title: string
  summary: string
  detail: string
  sourceName: string
  sourceVersion: string
  effectiveDate: string
  publishedAt: string
  severity: 'info' | 'warning' | 'critical'
  impactedRules: string[]
  impactedCategories: string[] | 'all'
  isActive: boolean
  reviewRequired: boolean
}

export const REGULATION_UPDATES: RegulationUpdate[] = [
  {
    id: 'food-label-ssot-2026-05-28',
    title: '식약처 규정 업데이트',
    summary: '식품등의 표시기준 기준일과 검토 항목 정합성 업데이트가 필요합니다.',
    detail: [
      '식품등의 표시기준 고시 버전, 검토 항목 수, 기준일, 면책 문구를 문서와 코드에서 통일하는 작업이 등록되었습니다.',
      '기존 작업물 중 제조업소 정보(R10), 부당 표시·광고(R12), 영양강조표시(R20)에 해당하는 항목은 재검토를 권장합니다.',
      '이 알림은 베타 v0 notice이며, 정식 단계에서는 사용자별 읽음/스누즈 상태를 서버에 저장할 예정입니다.',
    ].join('\n'),
    sourceName: '식품등의 표시기준',
    sourceVersion: '식약처 고시 기준 SSOT 갱신',
    effectiveDate: '2026-05-28',
    publishedAt: '2026-05-29',
    severity: 'warning',
    impactedRules: ['R10', 'R12', 'R20'],
    impactedCategories: 'all',
    isActive: true,
    reviewRequired: true,
  },
]

export function getActiveRegulationUpdate(): RegulationUpdate | null {
  return REGULATION_UPDATES.find(update => update.isActive) ?? null
}
