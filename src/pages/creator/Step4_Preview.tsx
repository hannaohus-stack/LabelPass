import type React from 'react'
import { Fragment as Frag } from 'react'
import type { CreatorData } from './types'

type IssueKind = 'error' | 'warn' | 'info'

type Issue = {
  id: string
  kind: IssueKind
  title: string
  desc: string
  stepIdx: number
  stepLabel: string
}

type NutrKey = 'calories' | 'totalCarbs' | 'sugar' | 'protein' | 'totalFat' | 'sodium'

const NUTR_ROWS: { key: NutrKey; label: string; unit: string; indent?: boolean }[] = [
  { key: 'calories', label: '열량', unit: 'kcal' },
  { key: 'totalCarbs', label: '탄수화물', unit: 'g' },
  { key: 'sugar', label: '당류', unit: 'g', indent: true },
  { key: 'protein', label: '단백질', unit: 'g' },
  { key: 'totalFat', label: '지방', unit: 'g' },
  { key: 'sodium', label: '나트륨', unit: 'mg' },
]

export function buildIssues(data: CreatorData): Issue[] {
  const issues: Issue[] = []
  if (!data.productName.trim()) {
    issues.push({ id: 'productName', kind: 'error', title: '제품명 누락', desc: '전면 라벨과 일괄표시면에 들어갈 제품명을 입력해야 합니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (data.categories.length === 0) {
    issues.push({ id: 'category', kind: 'error', title: '식품유형 누락', desc: '표시 기준 검토와 라벨 식품유형 표기를 위해 카테고리를 선택해야 합니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (!data.totalWeight.trim() || parseFloat(data.totalWeight) <= 0) {
    issues.push({ id: 'weight', kind: 'error', title: '내용량 누락', desc: '내용량은 제품 표시의 필수 항목입니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (!data.manufacturer.trim()) {
    issues.push({ id: 'manufacturer', kind: 'error', title: '제조원 누락', desc: '제조업소명과 소재지/신고번호 병기 여부 확인이 필요합니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (!data.storage) {
    issues.push({ id: 'storage', kind: 'error', title: '보관방법 누락', desc: '개봉 전후 보관조건을 라벨에 표시할 수 있어야 합니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (!data.expiryDate) {
    issues.push({ id: 'expiry', kind: 'error', title: '소비기한 누락', desc: '소비기한은 판매 전 라벨에 반드시 정리되어야 합니다.', stepIdx: 1, stepLabel: '제품 정보' })
  }
  if (data.ingredients.length === 0) {
    issues.push({ id: 'ingredients', kind: 'error', title: '원재료 없음', desc: '원재료명 및 함량 순서 검토를 위해 1개 이상 입력해야 합니다.', stepIdx: 2, stepLabel: '원재료 · 포장재' })
  }

  const totalWeight = parseFloat(data.totalWeight)
  const ingredientTotal = data.ingredients.reduce((sum, ing) => sum + (parseFloat(ing.weight) || 0), 0)
  if (data.ingredients.length > 0 && totalWeight > 0 && ingredientTotal > totalWeight + 0.5) {
    issues.push({ id: 'overWeight', kind: 'warn', title: '원재료 합계 확인', desc: '원재료 중량 합계가 제품 내용량보다 큽니다. 입력값 확인을 권장합니다.', stepIdx: 2, stepLabel: '원재료 · 포장재' })
  }

  const sorted = [...data.ingredients].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const ordered = data.ingredients.every((ing, index) => ing.id === sorted[index]?.id)
  if (data.ingredients.length > 1 && !ordered) {
    issues.push({ id: 'order', kind: 'warn', title: '원재료 순서 확인', desc: '라벨 원재료는 일반적으로 함량이 많은 순서대로 표시합니다.', stepIdx: 2, stepLabel: '원재료 · 포장재' })
  }

  if ((data.packagingMaterials ?? []).length === 0) {
    issues.push({ id: 'packaging', kind: 'info', title: '포장재 재질 미선택', desc: '분리배출 마크 제공을 위해 포장재 재질 선택을 권장합니다.', stepIdx: 2, stepLabel: '원재료 · 포장재' })
  }

  if (!data.nutritionExempted) {
    const hasNutrition = NUTR_ROWS.some(row => data[row.key] && data[row.key] !== '0')
    if (!hasNutrition) {
      issues.push({ id: 'nutrition', kind: 'warn', title: '영양성분 입력 확인', desc: '면제 대상이 아니라면 영양성분 수치 입력이 필요합니다.', stepIdx: 3, stepLabel: '영양성분' })
    }
  }

  return issues
}

const TONE: Record<IssueKind, string> = { error: 'red', warn: 'amber', info: '' }

export default function Step4_Preview({
  data,
  onGoToStep,
}: {
  data: CreatorData
  onGoToStep: (step: number) => void
}) {
  const issues = buildIssues(data)
  const sorted = [...data.ingredients].filter(i => i.name.trim())
    .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const allergens = data.detectedAllergens?.length ? data.detectedAllergens.map(a => a.name) : sorted.filter(i => i.isAllergen).map(i => i.name)
  const nutrFilled = NUTR_ROWS.filter(r => data[r.key] && data[r.key] !== '0').length
  const issuesOf = (step: number) => issues.filter(i => i.stepIdx === step)
  const dash = '—'

  const Issues = ({ step }: { step: number }) => (
    <>
      {issuesOf(step).map(issue => (
        <div key={issue.id} className={`lp-callout ${TONE[issue.kind]}`}>
          <span>{issue.kind === 'info' ? 'ⓘ' : '⚠'}</span>
          <span><b>{issue.title}</b> — {issue.desc}{issue.kind === 'error' && ' 이 항목을 채워야 검토를 시작할 수 있어요.'}</span>
        </div>
      ))}
    </>
  )

  const Sec = ({ step, title, rows }: { step: number; title: string; rows: [string, React.ReactNode][] }) => (
    <div className="lp-chk-sec">
      <div className="hd"><h3>{title}</h3><button type="button" className="edit" onClick={() => onGoToStep(step)}>수정</button></div>
      <dl className="lp-kv">{rows.map(([k, v]) => <Frag key={k}><dt>{k}</dt><dd>{v || dash}</dd></Frag>)}</dl>
      <Issues step={step} />
    </div>
  )

  return (
    <div className="lp-card">
      <h2>입력 내용 확인</h2>
      <p className="lp-desc">검토는 이 내용 그대로 진행돼요. 고칠 곳이 있으면 '수정'을 눌러 주세요.</p>
      <Sec step={1} title="제품 정보" rows={[
        ['제품명', [data.productName, data.categories.join(', '), data.totalWeight && `${data.totalWeight}${data.unit}`].filter(Boolean).join(' · ')],
        ['영업', [data.businessType === '즉판가공업' ? '즉석판매제조 · 가공업' : data.businessType === '식품제조가공업' ? '식품제조 · 가공업' : '', data.facilityType && `${data.facilityType} 주방`].filter(Boolean).join(' · ')],
        ['제조원', [data.manufacturer, data.manufacturerAddress].filter(Boolean).join(' · ')],
        ['보관 · 소비기한', [data.storage, data.expiryDate && data.expiryDate.replace(/-/g, '.')].filter(Boolean).join(' · ')],
        ['강조 문구', data.labelClaim],
      ]} />
      <Sec step={2} title="원재료 · 포장재" rows={[
        ['원재료', sorted.map(i => i.origin ? `${i.name}(${i.origin})` : i.name).join(', ')],
        ['알레르기', allergens.length ? allergens.join(', ') : sorted.length ? '해당 없음' : ''],
        ['포장재', (data.packagingMaterials ?? []).join(', ')],
      ]} />
      <Sec step={3} title="영양성분" rows={[
        ['표시', data.nutritionExempted ? '면제 적용' : nutrFilled ? '표시 필요 · 입력됨' : ''],
        ['1회 제공량', data.servingSize && data.servingSize !== '0' ? `${data.servingSize}${data.servingUnit}${data.calories ? ` · ${data.calories}kcal` : ''}` : ''],
      ]} />
      {issues.length === 0 && (
        <div className="lp-callout green"><span>✓</span><span><b>필수 입력 항목을 모두 채웠어요.</b> 다음 단계에서 17개 항목 무료 검토를 시작해요.</span></div>
      )}
    </div>
  )
}

export function hasBlockingPreviewIssues(data: CreatorData): boolean {
  return buildIssues(data).some(issue => issue.kind === 'error')
}
