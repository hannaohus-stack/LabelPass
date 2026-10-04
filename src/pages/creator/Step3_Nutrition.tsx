import { useEffect, useState } from 'react'
import type React from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Rocket } from 'lucide-react'
import type { CreatorData, StepProps } from './types'

type NutrientKey = 'calories' | 'totalCarbs' | 'sugar' | 'protein' | 'totalFat' | 'saturatedFat' | 'transFat' | 'cholesterol' | 'sodium'
type Answer = 'yes' | 'no' | null

// 식품등의 표시기준 의무 9개 항목 (2024년 개정)
const NUTRIENTS: { key: NutrientKey; label: string; unit: string; indent?: boolean }[] = [
  { key: 'calories',     label: '열량',       unit: 'kcal' },
  { key: 'totalCarbs',   label: '탄수화물',   unit: 'g' },
  { key: 'sugar',        label: '당류',       unit: 'g', indent: true },
  { key: 'protein',      label: '단백질',     unit: 'g' },
  { key: 'totalFat',     label: '지방',       unit: 'g' },
  { key: 'saturatedFat', label: '포화지방',   unit: 'g', indent: true },
  { key: 'transFat',     label: '트랜스지방', unit: 'g', indent: true },
  { key: 'cholesterol',  label: '콜레스테롤', unit: 'mg', indent: true },
  { key: 'sodium',       label: '나트륨',     unit: 'mg' },
]

const QUESTIONS = [
  { id: 'sales', question: '연 매출액이 120억 원 미만인가요? (2026년 현행 기준)' },
  { id: 'claim', question: '제품에 영양강조표시(저칼로리·무가당 등)가 없나요?' },
  { id: 'type', question: '건강기능식품 또는 특수영양식품이 아닌가요?' },
] as const

type Answers = Record<typeof QUESTIONS[number]['id'], Answer>

const INITIAL_ANSWERS: Answers = {
  sales: null,
  claim: null,
  type: null,
}

const blockNonNumeric = (event: React.KeyboardEvent<HTMLInputElement>) => {
  if (['e', 'E', '+', '-'].includes(event.key)) event.preventDefault()
}

const hasNutritionData = (data: CreatorData) =>
  NUTRIENTS.some(item => data[item.key] && data[item.key] !== '0')

export default function Step3_Nutrition({ data, onChange }: StepProps) {
  const [answers, setAnswers] = useState<Answers>(() => INITIAL_ANSWERS)
  const [expanded, setExpanded] = useState(false)
  const [manualInput, setManualInput] = useState(hasNutritionData(data))
  const [showToast, setShowToast] = useState(false)

  const answered = Object.values(answers).every(answer => answer !== null)
  const allYes = answered && Object.values(answers).every(answer => answer === 'yes')

  useEffect(() => {
    if (!answered) return
    if (allYes) {
      onChange({ nutritionExempted: true })
    } else {
      onChange({ nutritionExempted: false })
    }
  }, [answered, allYes])

  // P1-005: Q2(claim) 답변을 hasNutritionClaim으로 전달 (R20 Free Review 연동)
  useEffect(() => {
    if (answers.claim === null) return
    onChange({ hasNutritionClaim: answers.claim === 'no' })
  }, [answers.claim])

  useEffect(() => {
    if (!showToast) return
    const timer = setTimeout(() => setShowToast(false), 2400)
    return () => clearTimeout(timer)
  }, [showToast])

  const set = (key: keyof CreatorData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: event.target.value })

  const handleBlur = (key: NutrientKey) => () => {
    if (data[key].trim() === '') onChange({ [key]: '0' })
  }

  return (
    <div className="flex flex-col gap-6">
      {showToast && (
        <div className="fixed left-1/2 top-20 z-[70] flex -translate-x-1/2 items-center gap-2.5 bg-ink px-5 py-3 font-kr text-[13px] text-white shadow-xl">
          <Rocket size={14} />
          자동 계산 기능은 v1.5에 추가될 예정입니다.
        </div>
      )}

      <section className="border border-[rgba(10,10,11,0.1)] bg-white">
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left ${
            expanded ? 'border-l-[3px] border-l-heritage-500' : 'border-l-[3px] border-l-[#B07A1A] bg-[#FFF8E1]'
          }`}
        >
          <div className="flex items-start gap-3">
            <Lightbulb size={17} className="mt-0.5 flex-shrink-0 text-[#B07A1A]" />
            <div>
              <h2 className="font-kr text-[14px] font-semibold text-ink">
                {expanded ? `면제 자가진단 · ${Object.values(answers).filter(Boolean).length}/3` : '면제 대상인지 확인하세요'}
              </h2>
              <p className="mt-1 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.5)]">
                {expanded
                  ? '4개 질문으로 면제 가능성을 확인합니다.'
                  : '3개 질문으로 빠르게 진단합니다. 식품등의 표시기준 제5조 (2024년 개정)'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 font-kr text-[12px] font-semibold text-[#8A5A00]">
            {expanded ? '접기' : '진단 시작'}
            {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
          </span>
        </button>

        {expanded && (
          <div className="border-t border-[rgba(10,10,11,0.08)] px-5 py-5">
            <div className="grid grid-cols-1 gap-4">
              {QUESTIONS.map(item => (
                <div key={item.id} className="grid grid-cols-1 gap-2 border-b border-[rgba(10,10,11,0.06)] pb-4 last:border-0 last:pb-0 md:grid-cols-[1fr_180px] md:items-center">
                  <p className="font-kr text-[13px] leading-[1.6] text-ink">{item.question}</p>
                  <div className="grid grid-cols-2 border border-[rgba(10,10,11,0.16)]">
                    {(['yes', 'no'] as const).map(value => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAnswers(prev => ({ ...prev, [item.id]: value }))}
                        className={`h-10 border-l first:border-l-0 border-[rgba(10,10,11,0.12)] font-kr text-[13px] transition-colors ${
                          answers[item.id] === value
                            ? value === 'yes' ? 'bg-heritage-500 text-white' : 'bg-[#B30000] text-white'
                            : 'bg-white text-[rgba(10,10,11,0.55)] hover:bg-[rgba(10,10,11,0.03)]'
                        }`}
                      >
                        {value === 'yes' ? '예' : '아니오'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {answered && (
              <div className={`mt-5 border px-4 py-3.5 ${
                allYes ? 'border-[#15803d]/30 bg-[#f0fdf4]' : 'border-[#B30000]/25 bg-[#FFF8F8]'
              }`}>
                <div className="flex items-start gap-2">
                  {allYes
                    ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-[#15803d]" />
                    : <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[#B30000]" />
                  }
                  <div>
                    <h3 className={`font-kr text-[13px] font-semibold ${allYes ? 'text-[#15803d]' : 'text-[#B30000]'}`}>
                      {allYes ? '면제 대상일 가능성이 높습니다.' : '영양성분 직접 입력이 필요할 수 있습니다.'}
                    </h3>
                    <p className="mt-1 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.55)]">
                      {allYes
                        ? '라벨 미리보기에는 소규모 제조업 면제 적용으로 표시됩니다. 최종 판단은 관할 지자체 또는 식약처 기준을 확인하세요.'
                        : '아래 영양성분표에 분석 수치를 입력하세요.'
                      }
                    </p>
                    {!allYes && (
                      <button
                        type="button"
                        onClick={() => setManualInput(true)}
                        className="mt-3 inline-flex h-9 items-center justify-center bg-heritage-500 px-4 font-kr text-[12px] font-semibold text-white"
                      >
                        직접 입력하기
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {data.nutritionExempted && allYes && (
        <section className="border border-[#15803d]/30 bg-[#f0fdf4] px-4 py-3.5">
          <div className="flex items-start gap-3">
            <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[#15803d]" />
            <div>
              <h3 className="font-kr text-[14px] font-semibold text-[#15803d]">소규모 제조업 면제 적용</h3>
              <p className="mt-1 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.55)]">
                이 상태로 다음 단계에서 라벨 미리보기를 확인할 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {(manualInput || hasNutritionData(data)) && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <span className="font-en text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(10,10,11,0.35)]">영양성분 직접 입력</span>
            <button
              type="button"
              onClick={() => setShowToast(true)}
              className="flex items-center gap-1.5 border border-[rgba(10,10,11,0.15)] px-3 py-1.5 font-kr text-[11px] text-[rgba(10,10,11,0.48)] transition-colors hover:border-ink hover:text-ink"
            >
              <Rocket size={11} />
              자동 계산
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
            <div>
              <label className="mb-1.5 block font-en text-[11px] font-semibold uppercase tracking-[0.08em] text-[rgba(10,10,11,0.45)]">1회 제공량</label>
              <div className="flex">
                <input
                  className="input-field flex-1 text-right tabular-nums"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={data.servingSize}
                  onChange={set('servingSize')}
                  onBlur={() => { if (data.servingSize.trim() === '') onChange({ servingSize: '0' }) }}
                  onKeyDown={blockNonNumeric}
                />
                <select className="input-field w-[76px] border-l-0" value={data.servingUnit} onChange={set('servingUnit')}>
                  <option value="g">g</option>
                  <option value="mL">mL</option>
                </select>
              </div>
            </div>

            <div className="border border-[rgba(10,10,11,0.12)] bg-white">
              <div className="bg-ink px-4 py-2.5 text-center text-white">
                <span className="font-kr text-[13px] font-bold tracking-[0.06em]">영양성분표</span>
                {data.servingSize && data.servingSize !== '0' && (
                  <span className="ml-3 font-en text-[11px] text-white/60 tabular-nums">1회 {data.servingSize}{data.servingUnit} 기준</span>
                )}
              </div>

              {NUTRIENTS.map((item, index) => {
                const isCalories = item.key === 'calories'
                return (
                  <div
                    key={item.key}
                    className={`flex items-center border-b border-[rgba(10,10,11,0.08)] last:border-b-0 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-[rgba(10,10,11,0.015)]'
                    } ${isCalories ? 'border-b-[2px] border-b-[rgba(10,10,11,0.15)]' : ''}`}
                  >
                    <div className={`flex-1 py-2.5 ${item.indent ? 'pl-8' : 'pl-4'}`}>
                      <span className={`font-kr text-[13px] ${
                        isCalories ? 'font-bold text-ink' : item.indent ? 'text-[rgba(10,10,11,0.55)]' : 'font-medium text-ink'
                      }`}>
                        {item.indent && <span className="mr-1.5 text-[11px] text-[rgba(10,10,11,0.3)]">└</span>}
                        {item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 py-1.5 pr-4">
                      <input
                        className={`border border-[rgba(10,10,11,0.15)] bg-white px-3 text-right font-en text-[13px] tabular-nums outline-none transition-colors focus:border-breath-500 focus:ring-[3px] focus:ring-breath-500/15 ${
                          isCalories ? 'h-10 w-[100px] font-bold' : 'h-9 w-[88px]'
                        }`}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        value={data[item.key]}
                        onChange={set(item.key)}
                        onBlur={handleBlur(item.key)}
                        onKeyDown={blockNonNumeric}
                      />
                      <span className="w-[32px] flex-shrink-0 text-right font-en text-[12px] text-[rgba(10,10,11,0.45)]">{item.unit}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="border border-[rgba(10,10,11,0.07)] bg-[rgba(10,10,11,0.02)] px-4 py-3">
            <p className="font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.5)]">
              숫자만 입력 가능합니다. 수치는 공인시험기관 분석 결과 기준으로 입력하세요.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
