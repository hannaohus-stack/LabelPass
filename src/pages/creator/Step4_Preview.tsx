import { AlertTriangle, CheckCircle2, ChevronRight, Info } from 'lucide-react'
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

const kindStyle: Record<IssueKind, { bg: string; border: string; text: string; label: string }> = {
  error: { bg: '#FFF8F8', border: '#B30000', text: '#B30000', label: '수정 필요' },
  warn: { bg: '#FFF8EB', border: '#B07A1A', text: '#8A5A00', label: '확인 권장' },
  info: { bg: '#EAF6FE', border: '#0CA4F9', text: '#002D72', label: '참고' },
}

function dateDisplay(value: string) {
  return value ? value.replace(/-/g, '.') + ' 까지' : 'YYYY.MM.DD 까지'
}

function buildIssues(data: CreatorData): Issue[] {
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
    issues.push({ id: 'ingredients', kind: 'error', title: '원재료 없음', desc: '원재료명 및 함량 순서 검토를 위해 1개 이상 입력해야 합니다.', stepIdx: 2, stepLabel: '원재료' })
  }

  const totalWeight = parseFloat(data.totalWeight)
  const ingredientTotal = data.ingredients.reduce((sum, ing) => sum + (parseFloat(ing.weight) || 0), 0)
  if (data.ingredients.length > 0 && totalWeight > 0 && ingredientTotal > totalWeight + 0.5) {
    issues.push({ id: 'overWeight', kind: 'warn', title: '원재료 합계 확인', desc: '원재료 중량 합계가 제품 내용량보다 큽니다. 입력값 확인을 권장합니다.', stepIdx: 2, stepLabel: '원재료' })
  }

  const sorted = [...data.ingredients].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const ordered = data.ingredients.every((ing, index) => ing.id === sorted[index]?.id)
  if (data.ingredients.length > 1 && !ordered) {
    issues.push({ id: 'order', kind: 'warn', title: '원재료 순서 확인', desc: '라벨 원재료는 일반적으로 함량이 많은 순서대로 표시합니다.', stepIdx: 2, stepLabel: '원재료' })
  }

  if ((data.packagingMaterials ?? []).length === 0) {
    issues.push({ id: 'packaging', kind: 'info', title: '포장재 재질 미선택', desc: '분리배출 마크 제공을 위해 포장재 재질 선택을 권장합니다.', stepIdx: 2, stepLabel: '원재료' })
  }

  if (!data.nutritionExempted) {
    const hasNutrition = NUTR_ROWS.some(row => data[row.key] && data[row.key] !== '0')
    if (!hasNutrition) {
      issues.push({ id: 'nutrition', kind: 'warn', title: '영양성분 입력 확인', desc: '면제 대상이 아니라면 영양성분 수치 입력이 필요합니다.', stepIdx: 3, stepLabel: '영양성분' })
    }
  }

  return issues
}

function FrontLabel({ data }: { data: CreatorData }) {
  return (
    <section className="min-h-[420px] border-2 border-ink bg-white p-5">
      <div className="mb-7 flex items-center justify-between border-b-2 border-ink pb-3">
        <span className="bg-heritage-500 px-3 py-1.5 font-kr text-[11px] font-semibold text-white">
          {(data.categories[0] || '식품유형').toUpperCase()}
        </span>
        <span className="font-en text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(10,10,11,0.38)]">Front</span>
      </div>

      <div className="flex min-h-[300px] flex-col justify-between">
        <div>
          <h3 className="font-kr text-[34px] font-bold leading-[1.05] tracking-normal text-ink">
            {data.productName || '제품명'}
          </h3>
          <p className="mt-2 font-en text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.42)]">
            KRK CHECKER LABEL PREVIEW
          </p>
        </div>

        <div className="my-8 aspect-[1.45/1] border border-[rgba(10,10,11,0.16)] bg-[repeating-linear-gradient(135deg,rgba(10,10,11,0.04)_0,rgba(10,10,11,0.04)_8px,rgba(10,10,11,0.02)_8px,rgba(10,10,11,0.02)_16px)]" />

        <div className="flex items-end justify-between border-t-2 border-ink pt-4">
          <div>
            <p className="font-kr text-[11px] text-[rgba(10,10,11,0.48)]">내용량</p>
            <p className="font-en text-[22px] font-bold text-ink tabular-nums">
              {data.totalWeight || '-'}{data.unit}
            </p>
          </div>
          <p className="max-w-[150px] text-right font-kr text-[11px] leading-[1.5] text-[rgba(10,10,11,0.45)]">
            본 이미지는 입력값 기반 미리보기입니다.
          </p>
        </div>
      </div>
    </section>
  )
}

function BackLabel({ data }: { data: CreatorData }) {
  const sorted = [...data.ingredients].sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))
  const totalIngredientWeight = sorted.reduce((sum, ing) => sum + (parseFloat(ing.weight) || 0), 0)
  const allergens = sorted.filter(ing => ing.isAllergen)
  const nutritionRows = NUTR_ROWS.filter(row => data[row.key] && data[row.key] !== '0')

  return (
    <section className="min-h-[420px] border-2 border-ink bg-white p-5">
      <div className="mb-4 flex items-center justify-between border-b-2 border-ink pb-3">
        <div>
          <h3 className="font-kr text-[18px] font-bold text-ink">{data.productName || '제품명'}</h3>
          <p className="font-en text-[11px] text-[rgba(10,10,11,0.45)]">{data.totalWeight || '-'}{data.unit}</p>
        </div>
        <span className="font-en text-[10px] font-semibold uppercase tracking-[0.18em] text-[rgba(10,10,11,0.38)]">Back</span>
      </div>

      <div className="flex flex-col gap-3 font-kr text-[11px] leading-[1.65] text-ink">
        <div>
          <p className="mb-1 font-semibold">원재료명</p>
          <p>
            {sorted.length > 0 ? sorted.map((ing, index) => {
              const pct = totalIngredientWeight > 0
                ? ` ${((parseFloat(ing.weight) || 0) / totalIngredientWeight * 100).toFixed(1)}%`
                : ''
              return (
                <span key={ing.id}>
                  {index > 0 && ', '}
                  <strong className={ing.isAllergen ? 'text-[#B30000]' : ''}>{ing.name || '원재료'}</strong>{pct}
                </span>
              )
            }) : <span className="text-[rgba(10,10,11,0.35)]">원재료를 입력해주세요.</span>}
          </p>
        </div>

        <div className="border border-heritage-500 px-3 py-2">
          <p className="font-semibold text-heritage-500">알레르기 표시</p>
          <p className="text-[rgba(10,10,11,0.65)]">
            {allergens.length > 0 ? `${allergens.map(a => a.name).join(', ')} 함유` : '해당 없음'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="font-semibold">소비기한</p>
            <p>{dateDisplay(data.expiryDate)}</p>
          </div>
          <div>
            <p className="font-semibold">보관방법</p>
            <p>{data.storage || '보관방법 입력 필요'}</p>
          </div>
        </div>

        {data.nutritionExempted ? (
          <div className="border border-[rgba(10,10,11,0.14)] bg-[rgba(10,10,11,0.02)] px-3 py-2">
            <p className="font-semibold">영양성분</p>
            <p className="text-[rgba(10,10,11,0.55)]">소규모 제조업 면제 적용</p>
          </div>
        ) : (
          <div className="border border-ink">
            <div className="bg-ink px-3 py-1 text-center font-semibold text-white">영양성분표</div>
            {nutritionRows.length > 0 ? nutritionRows.map(row => (
              <div key={row.key} className="flex justify-between border-b border-[rgba(10,10,11,0.08)] px-3 py-1 last:border-0">
                <span className={row.indent ? 'pl-3 text-[rgba(10,10,11,0.6)]' : 'font-semibold'}>{row.label}</span>
                <span className="font-en tabular-nums">{data[row.key]}{row.unit}</span>
              </div>
            )) : (
              <div className="px-3 py-2 text-[rgba(10,10,11,0.45)]">입력된 영양성분이 없습니다.</div>
            )}
          </div>
        )}

        <div className="grid grid-cols-[1fr_82px] gap-3 border-t-2 border-ink pt-3">
          <div>
            <p><strong>제조원</strong> {data.manufacturer || '제조원 입력 필요'}</p>
            <p><strong>포장재질</strong> {(data.packagingMaterials ?? []).join(', ') || '미선택'}</p>
          </div>
          <div className="flex h-[54px] items-center justify-center bg-[repeating-linear-gradient(90deg,#0A0A0B_0,#0A0A0B_2px,#fff_2px,#fff_5px)]" />
        </div>
      </div>
    </section>
  )
}

function IssueCard({ issue, onGoToStep }: { issue: Issue; onGoToStep: (step: number) => void }) {
  const style = kindStyle[issue.kind]
  return (
    <div className="border px-3 py-3" style={{ background: style.bg, borderColor: style.border }}>
      <div className="flex items-start gap-2">
        {issue.kind === 'error'
          ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.text }} />
          : issue.kind === 'warn'
            ? <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.text }} />
            : <Info size={14} className="mt-0.5 flex-shrink-0" style={{ color: style.text }} />
        }
        <div className="min-w-0 flex-1">
          <div className="font-kr text-[13px] font-semibold" style={{ color: style.text }}>{issue.title}</div>
          <p className="mt-1 font-kr text-[11px] leading-[1.55] text-[rgba(10,10,11,0.55)]">{issue.desc}</p>
          <button
            onClick={() => onGoToStep(issue.stepIdx)}
            className="mt-2 flex items-center gap-1 font-kr text-[11px] font-semibold"
            style={{ color: style.text }}
          >
            Step {issue.stepIdx} {issue.stepLabel} 수정
            <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Step4_Preview({
  data,
  onGoToStep,
}: {
  data: CreatorData
  onGoToStep: (step: number) => void
}) {
  const issues = buildIssues(data)
  const errorCount = issues.filter(issue => issue.kind === 'error').length
  const warnCount = issues.filter(issue => issue.kind === 'warn').length
  const passCount = Math.max(0, 7 - errorCount)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FrontLabel data={data} />
          <BackLabel data={data} />
        </div>

        <aside className="flex flex-col gap-4">
          <section className="border border-[rgba(10,10,11,0.1)] bg-white p-4">
            <div className="font-en text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.38)]">
              Preview Check
            </div>
            <h3 className="mt-1 font-kr text-[16px] font-semibold text-ink">라벨 미리보기 상태</h3>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="border border-[#B30000]/20 bg-[#FFF8F8] px-2 py-3 text-center">
                <div className="font-en text-[22px] font-bold text-[#B30000]">{errorCount}</div>
                <div className="font-kr text-[10px] text-[#B30000]">수정 필요</div>
              </div>
              <div className="border border-[#B07A1A]/20 bg-[#FFF8EB] px-2 py-3 text-center">
                <div className="font-en text-[22px] font-bold text-[#8A5A00]">{warnCount}</div>
                <div className="font-kr text-[10px] text-[#8A5A00]">확인 권장</div>
              </div>
              <div className="border border-[#15803D]/20 bg-[#F0FDF4] px-2 py-3 text-center">
                <div className="font-en text-[22px] font-bold text-[#15803D]">{passCount}</div>
                <div className="font-kr text-[10px] text-[#15803D]">확인 완료</div>
              </div>
            </div>

            <p className="mt-4 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.5)]">
              이 화면은 입력값을 실제 라벨 구조로 정리한 미리보기입니다. 판매 전 확인해야 할 표시 기준은 다음 무료 검토 결과에서 확인합니다.
            </p>
          </section>

          {issues.length > 0 ? (
            <section className="flex flex-col gap-2">
              {issues.map(issue => <IssueCard key={issue.id} issue={issue} onGoToStep={onGoToStep} />)}
            </section>
          ) : (
            <section className="border border-[#15803D]/24 bg-[#F0FDF4] p-4">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#15803D]" />
                <div>
                  <h3 className="font-kr text-[14px] font-semibold text-[#15803D]">필수 입력 항목 확인 완료</h3>
                  <p className="mt-1 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.55)]">
                    무료 검토 결과에서 판매 전 보완 기준을 이어서 확인하세요.
                  </p>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>

      <p className="font-kr text-[11px] leading-[1.7] text-[rgba(10,10,11,0.36)]">
        미리보기 라벨은 화면 확인용입니다. 인쇄용 PDF 라벨은 결제 완료 후 선택한 패키지 기준으로 생성됩니다.
      </p>
    </div>
  )
}

export function hasBlockingPreviewIssues(data: CreatorData): boolean {
  return buildIssues(data).some(issue => issue.kind === 'error')
}
