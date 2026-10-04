import { useEffect, useState } from 'react'
import type React from 'react'
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
  { id: 'sales', question: '연 매출액이 120억 원 미만인가요?' },
  { id: 'claim', question: '저칼로리 · 무가당 같은 영양강조 표시가 없나요?' },
  { id: 'type', question: '건강기능식품 · 특수영양식품이 아닌가요?' },
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
  const [manualInput, setManualInput] = useState(hasNutritionData(data))

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

  const set = (key: keyof CreatorData) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ [key]: event.target.value })

  const handleBlur = (key: NutrientKey) => () => {
    if (data[key].trim() === '') onChange({ [key]: '0' })
  }

  const showInput = manualInput || hasNutritionData(data) || (answered && !allYes)

  return (
    <div>
      <div className="lp-card lp-diag">
        <h2>영양성분 표시 면제 확인</h2>
        <p className="lp-desc">세 가지 모두 '예'라면 영양성분 표시를 생략할 수 있어요. (식품등의 표시기준)</p>
        {QUESTIONS.map(item => (
          <div className="lp-q" key={item.id}>
            <span>{item.question}</span>
            <div className="lp-seg" role="radiogroup" aria-label={item.question}>
              {(['yes', 'no'] as const).map(value => (
                <button key={value} type="button" role="radio" aria-checked={answers[item.id] === value}
                  className={answers[item.id] === value ? 'on' : ''}
                  onClick={() => setAnswers(prev => ({ ...prev, [item.id]: value }))}>
                  {value === 'yes' ? '예' : '아니오'}
                </button>
              ))}
            </div>
          </div>
        ))}
        {answered && (allYes ? (
          <div className="lp-callout green"><span>✓</span><span><b>면제 대상일 가능성이 높아요.</b> 라벨에는 영양성분표 없이 정리돼요. 최종 판단은 관할 지자체 · 식약처 기준을 확인해 주세요.</span></div>
        ) : (
          <div className="lp-callout amber"><span>⚠</span><span><b>영양성분 표시가 필요해요.</b> 아래에 9가지 영양성분 값을 입력해 주세요.</span></div>
        ))}
        {!answered && !showInput && (
          <p className="lp-help" style={{ marginTop: 14 }}>
            면제 대상이 아닌 걸 이미 알고 있다면{' '}
            <button type="button" onClick={() => setManualInput(true)} style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'underline' }}>바로 입력하기</button>
          </p>
        )}
      </div>

      {showInput && (
        <div className="lp-card">
          <h2>영양성분</h2>
          <p className="lp-desc">시험성적서나 영양성분 계산값을 옮겨 적어 주세요. 숫자만 입력할 수 있어요.</p>
          <div className="lp-fl">
            <label className="lp-lb" htmlFor="n-sv">1회 제공량 · 기준량</label>
            <div className="lp-unit">
              <input id="n-sv" className="lp-in" type="number" min="0" step="any" inputMode="decimal" placeholder="0"
                value={data.servingSize} onChange={set('servingSize')} onKeyDown={blockNonNumeric}
                onBlur={() => { if (data.servingSize.trim() === '') onChange({ servingSize: '0' }) }} />
              <div className="lp-seg sm" role="radiogroup" aria-label="단위">
                {(['g', 'mL'] as const).map(u => (
                  <button key={u} type="button" role="radio" aria-checked={data.servingUnit === u} className={data.servingUnit === u ? 'on' : ''} onClick={() => onChange({ servingUnit: u })}>{u}</button>
                ))}
              </div>
            </div>
          </div>
          <table className="lp-nut">
            <tbody>
              {NUTRIENTS.map(item => (
                <tr key={item.key} className={item.indent ? 'ind' : undefined}>
                  <td><label htmlFor={`n-${item.key}`}>{item.label}</label></td>
                  <td><input id={`n-${item.key}`} className="lp-in" type="number" min="0" step="any" inputMode="decimal" placeholder="0"
                    value={data[item.key]} onChange={set(item.key)} onBlur={handleBlur(item.key)} onKeyDown={blockNonNumeric} /></td>
                  <td className="u">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
