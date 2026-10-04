import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ─── Design Tokens (Landing.tsx 동일) ────────────────────────────────────────
const HERITAGE = '#002D72'
const BREATH   = '#0CA4F9'
const INK      = '#0A0A0B'
const SOFT_INK = 'rgba(10,10,11,0.65)'
const HAIRLINE = 'rgba(10,10,11,0.12)'
const FONT_KR  = "Pretendard, 'Pretendard Variable', system-ui, -apple-system, sans-serif"
const FONT_EN  = 'Inter, system-ui, sans-serif'

const LS_LIFETIME_URL    = 'https://krkkorea.lemonsqueezy.com/checkout/buy/dba849bf-3cf7-4921-957d-f4c58477f246?checkout[discount_code]=KRKLIFE50'
const LS_LIFETIME_COUPON = 'KRKLIFE50'

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
          <h2 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 8, letterSpacing: '-0.02em' }}>
            감사해요!
          </h2>
          <p style={{ fontSize: 14, color: SOFT_INK, marginBottom: 32, lineHeight: 1.6 }}>
            소중한 의견이 KRK CHECKER를<br />더 좋게 만들어요 💚
          </p>

          <div style={{
            background: '#F5F9FF',
            border: `1.5px solid ${HERITAGE}22`,
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: HERITAGE, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              약속드린 50% 평생 할인 코드예요
            </div>
            <div style={{
              fontFamily: FONT_EN,
              fontSize: 'clamp(16px, 5vw, 28px)',
              fontWeight: 800,
              color: HERITAGE,
              letterSpacing: '0.04em',
              marginBottom: 12,
              overflowWrap: 'break-word',
              wordBreak: 'break-all',
            }}>
              {LS_LIFETIME_COUPON}
            </div>
            <div style={{ fontSize: 12.5, color: SOFT_INK, lineHeight: 1.6, marginBottom: 16 }}>
              아래 버튼으로 바로 결제하면<br />
              쿠폰이 자동 적용돼요.
            </div>
            <a
              href={LS_LIFETIME_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '100%', height: 44,
                background: HERITAGE, color: '#fff',
                borderRadius: 10, fontSize: 13.5, fontWeight: 600,
                textDecoration: 'none', fontFamily: FONT_KR,
              }}
            >
              50% 할인 적용하고 결제하기 →
            </a>
          </div>

          <p style={{ fontSize: 12.5, color: 'rgba(10,10,11,0.4)', lineHeight: 1.6 }}>
            KRK CHECKER가 더 좋아질 수 있도록<br />
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
          <h1 style={{ fontSize: 18, fontWeight: 700, color: INK, letterSpacing: '-0.02em', marginBottom: 6 }}>
            3분 베타 후기 설문
          </h1>
          <p style={{ fontSize: 13, color: SOFT_INK, lineHeight: 1.6 }}>
            솔직한 의견이 KRK를 만들어요<br />
            제출 즉시 50% 평생 할인 코드 드려요 🎁
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup label="1. KRK CHECKER를 동료 제조사에게 추천할 가능성은?" error={errors.npsScore}>
            <NpsButtons value={npsScore} onChange={setNpsScore} />
            {npsScore !== null && (
              <p style={{ fontSize: 12, color: SOFT_INK, marginTop: 8, textAlign: 'center' }}>
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
                    border: `1.5px solid ${interviewOk === opt.value ? BREATH : HAIRLINE}`,
                    borderRadius: 10,
                    background: interviewOk === opt.value ? '#E6F6FF' : '#fff',
                    color: interviewOk === opt.value ? BREATH : INK,
                    fontSize: 13.5, fontWeight: interviewOk === opt.value ? 600 : 400,
                    cursor: 'pointer', fontFamily: FONT_KR, transition: 'all 0.15s',
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="연락처 (선택 — 인터뷰 연락용)">
            <input type="text" value={contact} onChange={e => setContact(e.target.value)}
              placeholder="이메일 또는 카톡 ID" style={inputStyle(false)} />
          </FieldGroup>

          <button type="submit" disabled={submitting} style={{
            width: '100%', height: 52,
            background: submitting ? 'rgba(0,45,114,0.5)' : HERITAGE,
            color: '#fff', borderRadius: 10, fontSize: 14.5, fontWeight: 600,
            border: 'none', cursor: submitting ? 'not-allowed' : 'pointer',
            fontFamily: FONT_KR, marginTop: 4, transition: 'background 0.2s',
          }}>
            {submitting ? '제출 중...' : '설문 제출하고 할인 코드 받기'}
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
        <span style={{ fontSize: 11, color: SOFT_INK }}>전혀 아님 (0)</span>
        <span style={{ fontSize: 11, color: SOFT_INK }}>적극 추천 (10)</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" onClick={() => onChange(i)} style={{
            flex: 1, aspectRatio: '1', minWidth: 0,
            border: `1.5px solid ${value === i ? HERITAGE : HAIRLINE}`,
            borderRadius: 8,
            background: value === i ? HERITAGE : '#fff',
            color: value === i ? '#fff' : INK,
            fontSize: 12, fontWeight: value === i ? 700 : 400,
            cursor: 'pointer', fontFamily: FONT_EN, transition: 'all 0.12s',
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
      minHeight: '100svh', background: '#FAFAFA', fontFamily: FONT_KR, color: INK,
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '80px 20px 60px',
    }}>
      <div style={{
        width: '100%', maxWidth: 480, background: '#fff', borderRadius: 20,
        padding: '36px 32px', border: `1px solid ${HAIRLINE}`,
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
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: INK, marginBottom: 10 }}>
        {label}
      </label>
      {children}
      {error && <p style={{ fontSize: 12, color: '#E53E3E', marginTop: 6 }}>{error}</p>}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', height: 46, padding: '0 14px',
    border: `1.5px solid ${hasError ? '#E53E3E' : HAIRLINE}`,
    borderRadius: 10, fontSize: 13.5, color: INK,
    background: '#fff', fontFamily: FONT_KR, outline: 'none', boxSizing: 'border-box',
  }
}
