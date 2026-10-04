import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

// ─── Design Tokens (Landing.tsx 동일) ────────────────────────────────────────
const HERITAGE = '#002D72'
const INK      = '#0A0A0B'
const SOFT_INK = 'rgba(10,10,11,0.65)'
const FAINT    = 'rgba(10,10,11,0.40)'
const HAIRLINE = 'rgba(10,10,11,0.12)'
const FONT_KR  = "Pretendard, 'Pretendard Variable', system-ui, -apple-system, sans-serif"
const FONT_EN  = 'Inter, system-ui, sans-serif'

// ─── Lemon Squeezy 체크아웃 URL ──────────────────────────────────────────────
const LS_CHECKOUT_URL = 'https://krkkorea.lemonsqueezy.com/checkout/buy/dba849bf-3cf7-4921-957d-f4c58477f246?checkout[discount_code]=KRKBETA'

// ─── 이메일 validation (RFC 5322 기본) ───────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const BUSINESS_OPTIONS = [
  { value: '식품제조가공',      label: '식품제조·가공업' },
  { value: '즉석판매제조가공',  label: '즉석판매제조·가공업' },
  { value: '준비중기타',        label: '준비 중·기타' },
]

const CATEGORY_OPTIONS = [
  { value: '잼소스장',         label: '잼·소스·장류' },
  { value: '떡디저트베이커리', label: '떡·디저트·베이커리' },
  { value: '차음료건강식품',   label: '차·음료·건강식품' },
  { value: '기타',             label: '기타' },
]

type Step = 'form' | 'success' | 'closed'

// ─── BetaApply ────────────────────────────────────────────────────────────────
export default function BetaApply() {
  const navigate = useNavigate()

  const [businessType, setBusinessType] = useState('')
  const [category, setCategory]         = useState('')
  const [painPoint, setPainPoint]       = useState('')
  const [email, setEmail]               = useState('')
  const [errors, setErrors]             = useState<Record<string, string>>({})
  const [step, setStep]                 = useState<Step>('form')
  const [submitting, setSubmitting]     = useState(false)

  function validate() {
    const e: Record<string, string> = {}
    if (!businessType)            e.businessType = '업종을 선택해주세요'
    if (!category)                e.category     = '카테고리를 선택해주세요'
    if (!painPoint.trim())        e.painPoint    = '라벨에서 답답한 점을 입력해주세요'
    if (!email.trim())            e.email        = '이메일 주소를 입력해주세요'
    else if (!EMAIL_RE.test(email.trim())) e.email = '올바른 이메일 형식으로 입력해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      // 1. INSERT (정식 신청)
      const { data: inserted, error: insertError } = await supabase
        .from('beta_applications')
        .insert({
          business_type: businessType,
          category,
          pain_point:    painPoint.trim(),
          contact:       email.trim(),
          is_waitlist:   false,
          coupon_issued: false,
        })
        .select('id')
        .single()

      if (insertError) throw insertError

      // 2. is_waitlist=false 인 row 수 카운트
      const { count, error: countError } = await supabase
        .from('beta_applications')
        .select('id', { count: 'exact', head: true })
        .eq('is_waitlist', false)

      const currentCount = countError ? 0 : (count ?? 0)

      if (currentCount <= 20) {
        // 3. coupon_issued 업데이트
        await supabase
          .from('beta_applications')
          .update({ coupon_issued: true })
          .eq('id', inserted.id)

        // 4. NPS 이메일 예약 Edge Function 호출
        try {
          await supabase.functions.invoke('schedule-nps-email', {
            body: {
              email:          email.trim(),
              application_id: inserted.id,
            },
          })
        } catch (fnErr) {
          // Edge Function 실패는 silent — 쿠폰 노출은 막지 않음
          console.warn('[BetaApply] schedule-nps-email 호출 실패:', fnErr)
        }

        setStep('success')
      } else {
        // 5. 대기자로 UPDATE
        await supabase
          .from('beta_applications')
          .update({ is_waitlist: true })
          .eq('id', inserted.id)

        setStep('closed')
      }
    } catch (err) {
      console.error('[BetaApply] 제출 오류:', err)
      setStep('success') // 오류 시 안전하게 성공 화면으로
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 성공 화면 ───────────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 8, letterSpacing: '-0.02em' }}>
            베타 파트너로 등록되었어요!
          </h2>
          <p style={{ fontSize: 14, color: SOFT_INK, marginBottom: 32, lineHeight: 1.6 }}>
            전문 기능(19,900원 상당)을 무료로 열어드려요.
          </p>

          {/* 쿠폰 박스 */}
          <div style={{
            background: '#F5F9FF',
            border: `1.5px solid ${HERITAGE}22`,
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: HERITAGE, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              쿠폰 코드
            </div>
            <div style={{
              fontFamily: FONT_EN,
              fontSize: 28,
              fontWeight: 800,
              color: HERITAGE,
              letterSpacing: '0.04em',
              marginBottom: 16,
            }}>
              KRKBETA
            </div>
            <div style={{ fontSize: 13, color: SOFT_INK, lineHeight: 1.6, marginBottom: 20 }}>
              또는 아래 버튼을 누르면 자동 적용됩니다.
            </div>
            <a
              href={LS_CHECKOUT_URL}
              style={{
                display: 'block',
                padding: '14px 0',
                background: HERITAGE,
                color: '#fff',
                borderRadius: 10,
                fontSize: 14.5,
                fontWeight: 600,
                textAlign: 'center',
                textDecoration: 'none',
                fontFamily: FONT_KR,
              }}
            >
              무료로 시작하기 →
            </a>
          </div>

          {/* NPS 예고 */}
          <div style={{
            background: '#FFFBF0',
            border: '1px solid rgba(255,180,0,0.2)',
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 13, color: INK, lineHeight: 1.7, margin: 0 }}>
              📧 <strong>3일 뒤</strong> 이메일로 짧은 설문 링크를 보내드려요.<br />
              설문 완료 시 정식 출시 후 <strong>50% 평생 할인 코드</strong>를 드릴게요 🙏
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  // ─── 마감 화면 ───────────────────────────────────────────────────────────
  if (step === 'closed') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😔</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: INK, marginBottom: 8, letterSpacing: '-0.02em' }}>
            20명 정원이 마감되었어요
          </h2>
          <p style={{ fontSize: 14, color: SOFT_INK, marginBottom: 32, lineHeight: 1.6 }}>
            자리가 나면 알려드릴게요.
          </p>

          <div style={{
            background: '#FAFAFA',
            border: `1px solid ${HAIRLINE}`,
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, color: INK, fontWeight: 600, marginBottom: 4 }}>
              대기 등록 완료
            </div>
            <div style={{ fontSize: 13, color: SOFT_INK, lineHeight: 1.6 }}>
              <strong>{email}</strong>으로<br />
              자리가 생기면 가장 먼저 알려드릴게요.
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: `1.5px solid ${HAIRLINE}`,
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 13,
              color: SOFT_INK,
              cursor: 'pointer',
              fontFamily: FONT_KR,
            }}
          >
            홈으로 돌아가기
          </button>
        </div>
      </Shell>
    )
  }

  // ─── 설문 폼 ─────────────────────────────────────────────────────────────
  return (
    <Shell>
      <div>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>🍋</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: INK, letterSpacing: '-0.02em', marginBottom: 6 }}>
            20명 한정 무료 베타 신청
          </h1>
          <p style={{ fontSize: 13, color: SOFT_INK, lineHeight: 1.6 }}>
            전문 기능까지 0원 · 4가지 질문만 있어요
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup label="1. 업종" error={errors.businessType}>
            <RadioGroup options={BUSINESS_OPTIONS} value={businessType} onChange={setBusinessType} />
          </FieldGroup>

          <FieldGroup label="2. 취급 카테고리" error={errors.category}>
            <RadioGroup options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
          </FieldGroup>

          <FieldGroup label="3. 지금 라벨 만들 때 가장 답답한 점" error={errors.painPoint}>
            <input
              type="text"
              value={painPoint}
              onChange={e => setPainPoint(e.target.value)}
              placeholder="예: 성분 표기 순서를 어떻게 해야 할지 몰라요"
              style={inputStyle(!!errors.painPoint)}
            />
          </FieldGroup>

          <FieldGroup label="4. 이메일 주소" error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@example.com"
              style={inputStyle(!!errors.email)}
              inputMode="email"
              autoComplete="email"
            />
            <p style={{ fontSize: 11.5, color: FAINT, marginTop: 5 }}>
              3일 뒤 NPS 설문 링크를 보내드려요
            </p>
          </FieldGroup>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 52,
              background: submitting ? 'rgba(0,45,114,0.5)' : HERITAGE,
              color: '#fff',
              borderRadius: 10,
              fontSize: 14.5,
              fontWeight: 600,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: FONT_KR,
              marginTop: 8,
              transition: 'background 0.2s',
            }}
          >
            {submitting ? '신청 중...' : '베타 신청하기'}
          </button>
        </form>
      </div>
    </Shell>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100svh',
      background: '#FAFAFA',
      fontFamily: FONT_KR,
      color: INK,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      padding: '80px 20px 60px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 480,
        background: '#fff',
        borderRadius: 20,
        padding: '36px 32px',
        border: `1px solid ${HAIRLINE}`,
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

function RadioGroup({ options, value, onChange }: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map(opt => (
        <label
          key={opt.value}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '11px 14px',
            border: `1.5px solid ${value === opt.value ? HERITAGE : HAIRLINE}`,
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13.5,
            color: value === opt.value ? HERITAGE : INK,
            fontWeight: value === opt.value ? 600 : 400,
            background: value === opt.value ? '#F5F9FF' : '#fff',
            transition: 'all 0.15s',
          }}
        >
          <input
            type="radio"
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            style={{ display: 'none' }}
          />
          <span style={{
            width: 16, height: 16, borderRadius: '50%',
            border: `2px solid ${value === opt.value ? HERITAGE : HAIRLINE}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {value === opt.value && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: HERITAGE, display: 'block' }} />
            )}
          </span>
          {opt.label}
        </label>
      ))}
    </div>
  )
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%', height: 46, padding: '0 14px',
    border: `1.5px solid ${hasError ? '#E53E3E' : HAIRLINE}`,
    borderRadius: 10, fontSize: 13.5, color: INK,
    background: '#fff', fontFamily: FONT_KR,
    outline: 'none', boxSizing: 'border-box',
  }
}
