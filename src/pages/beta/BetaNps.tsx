import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ─── Design Tokens (홈 labelpass.kr 동일) ────────────────────────────────────
const BLUE     = '#3358EE'
const BLUE_50  = '#EEF2FF'
const NAVY     = '#182136'
const INK_2    = '#4B5873'
const LINE     = '#E4E8F0'
const SOFT     = '#F4F6FB'
const RED      = '#E0413A'
const FONT_KR  = "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"

type Step = 'form' | 'done'

export default function BetaNps() {
  const [npsScore, setNpsScore]       = useState<number | null>(null)
  const [bestFeature, setBestFeature] = useState('')
  const [worstPoint, setWorstPoint]   = useState('')
  const [interviewOk, setInterviewOk] = useState<boolean | null>(null)
  const [contact, setContact]         = useState('')
  const [errors, setErrors]           = useState<Record<string, string>>({})
  const [step, setStep]               = useState<Step>('form')
  const [submitting, setSubmitting]   = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (npsScore === null)    e.npsScore    = '점수를 선택해주세요'
    if (interviewOk === null) e.interviewOk = '선택해주세요'
    const mail = contact.trim()
    if (interviewOk === true && !mail) e.contact = '인터뷰 연락을 위해 이메일을 입력해주세요'
    else if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) e.contact = '올바른 이메일 형식으로 입력해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      const { error } = await supabase
        .from('beta_nps')
        .insert({
          nps_score:    npsScore,
          best_feature: bestFeature.trim() || null,
          worst_point:  worstPoint.trim() || null,
          interview_ok: interviewOk,
          contact:      contact.trim() || null,
        })

      if (error) throw error
      setStep('done')
    } catch (err) {
      console.error('[BetaNps] 제출 오류:', err)
      setStep('done')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 완료 화면 ────────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>💚</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: '-0.02em' }}>
            감사해요!
          </h2>
          <p style={{ fontSize: 14, color: INK_2, marginBottom: 32, lineHeight: 1.6 }}>
            소중한 의견이 라벨패스를<br />더 좋게 만들어요 💚
          </p>

          <p style={{ fontSize: 12.5, color: '#8A94A8', lineHeight: 1.6 }}>
            라벨패스가 더 좋아질 수 있도록<br />
            함께해주셔서 감사합니다 ☺️
          </p>
        </div>
      </Shell>
    )
  }

  // ─── 설문 폼 ──────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 22, marginBottom: 10 }}>📋</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: NAVY, letterSpacing: '-0.02em', marginBottom: 6 }}>
            3분 베타 후기 설문
          </h1>
          <p style={{ fontSize: 13, color: INK_2, lineHeight: 1.6 }}>
            솔직한 의견이 라벨패스를 만들어요
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup label="1. 라벨패스를 주변 식품 사업자에게 추천하고 싶은 정도는?" error={errors.npsScore}>
            <NpsButtons value={npsScore} onChange={setNpsScore} />
            {npsScore !== null && (
              <p style={{ fontSize: 12, color: INK_2, marginTop: 8, textAlign: 'center' }}>
                {npsScore <= 6 ? '개선이 필요한 점을 꼭 알려주세요' :
                 npsScore <= 8 ? '좋아요! 더 좋게 만들어볼게요' :
                 '감사해요! 어떤 점이 도움됐는지 알려주세요 😊'}
              </p>
            )}
          </FieldGroup>

          <FieldGroup label="2. 가장 도움 된 기능은? (선택)">
            <input type="text" value={bestFeature} onChange={e => setBestFeature(e.target.value)}
              placeholder="예: 알레르기 항목 자동 체크" style={inputStyle(false)} />
          </FieldGroup>

          <FieldGroup label="3. 가장 아쉬운 점은? (선택)">
            <input type="text" value={worstPoint} onChange={e => setWorstPoint(e.target.value)}
              placeholder="예: 카테고리가 더 많았으면 좋겠어요" style={inputStyle(false)} />
          </FieldGroup>

          <FieldGroup label="4. 15분 화상 인터뷰 가능하신가요? (사례 드려요)" error={errors.interviewOk}>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ value: true, label: '네, 가능해요' }, { value: false, label: '어려워요' }].map(opt => (
                <button key={String(opt.value)} type="button" onClick={() => setInterviewOk(opt.value)}
                  style={{
                    flex: 1, padding: '12px 0',
                    border: `1.5px solid ${interviewOk === opt.value ? BLUE : LINE}`,
                    borderRadius: 10,
                    background: interviewOk === opt.value ? BLUE_50 : '#fff',
                    color: interviewOk === opt.value ? BLUE : NAVY,
                    fontSize: 13.5, fontWeight: interviewOk === opt.value ? 600 : 400,
                    cursor: 'pointer', fontFamily: FONT_KR, transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="이메일 (인터뷰 가능하신 분은 필수)" error={errors.contact}>
            <input type="email" value={contact} onChange={e => setContact(e.target.value)}
              placeholder="hello@example.com" inputMode="email" autoComplete="email"
              style={inputStyle(!!errors.contact)} />
          </FieldGroup>

          <button type="submit" disabled={submitting} style={{
            width: '100%', height: 52,
            background: submitting ? 'rgba(51,88,238,0.5)' : BLUE,
            color: '#fff', borderRadius: 10, fontSize: 14.5, fontWeight: 600,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT_KR, marginTop: 4, transition: 'background 0.2s',
          }}>
            {submitting ? '제출 중...' : '설문 제출하기'}
          </button>
        </form>
      </div>
    </Shell>
  )
}

function NpsButtons({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: INK_2 }}>전혀 아님 (0)</span>
        <span style={{ fontSize: 11, color: INK_2 }}>적극 추천 (10)</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" onClick={() => onChange(i)} style={{
            flex: 1, aspectRatio: '1', minWidth: 0,
            border: `1.5px solid ${value === i ? BLUE : LINE}`,
            borderRadius: 8,
            background: value === i ? BLUE : '#fff',
            color: value === i ? '#fff' : NAVY,
            fontSize: 12, fontWeight: value === i ? 700 : 400,
            cursor: 'pointer', fontFamily: FONT_KR, transition: 'all 0.12s',
          }}>
            {i}
          </button>
        ))}
      </div>
    </div>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100svh', background: SOFT, fontFamily: FONT_KR, color: NAVY,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '80px 20px 60px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20,
        padding: '36px 32px', border: `1px solid ${LINE}`,
        boxShadow: '0 4px 32px rgba(0,0,0,0.06)',
      }}>
        {children}
      </div>
    </div>
  )
}

function FieldGroup({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: NAVY, marginBottom: 10 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: RED, marginTop: 6 }}>{error}</p>}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', height: 46, padding: '0 14px',
    border: `1.5px solid ${hasError ? RED : LINE}`,
    borderRadius: 10, fontSize: 13.5, color: NAVY,
    background: '#fff', fontFamily: FONT_KR, outline: 'none', boxSizing: 'border-box',
  }
}
