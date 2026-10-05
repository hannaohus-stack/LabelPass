import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { trackBetaLead } from '../../lib/analytics'

// ─── Design Tokens (홈 labelpass.kr 동일) ────────────────────────────────────
const BLUE     = '#3358EE'
const BLUE_50  = '#EEF2FF'
const NAVY     = '#182136'
const INK_2    = '#4B5873'
const INK_3    = '#8A94A8'
const LINE     = '#E4E8F0'
const SOFT     = '#F4F6FB'
const RED      = '#E0413A'
const FONT_KR  = "'Pretendard Variable', Pretendard, system-ui, -apple-system, sans-serif"

// 정원 — 화면 문구용. 실제 판정은 Edge Function beta-apply 의 BETA_CAP(기본 30)이 한다.
const BETA_CAP = 30

// ─── 이메일 validation (RFC 5322 기본) ───────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CHANNEL_OPTIONS = [
  { value: '스마트스토어', label: '스마트스토어' },
  { value: '자사몰',       label: '자사몰 (카페24·아임웹 등)' },
  { value: '입점몰',       label: '쿠팡·마켓컬리 등 입점몰' },
  { value: '오프라인',     label: '오프라인 매장·납품' },
  { value: '판매전',       label: '아직 판매 전이에요' },
]

const CATEGORY_OPTIONS = [
  { value: '간편식냉동냉장',   label: '간편식·냉동·냉장식품' },
  { value: '떡디저트베이커리', label: '떡·디저트·베이커리' },
  { value: '잼소스장',         label: '잼·소스·장류' },
  { value: '기타',             label: '기타 (직접 입력)' },
]

// 베타 대상 구분 — 완제품 재판매 셀러는 이번 베타 대상이 아님(서버가 쿠폰 없이 안내 화면으로 처리)
const PRODUCTION_OPTIONS = [
  { value: '자체제조',     label: '직접 만들어요 (자체 제조)' },
  { value: 'OEM',          label: '위탁 생산해요 (OEM)' },
  { value: '완제품재판매', label: '만들어진 제품을 받아 팔아요 (재판매)' },
  { value: '준비중',       label: '아직 준비 중이에요' },
]

type Step = 'form' | 'success' | 'closed' | 'ineligible'

interface Coupon { code: string; checkoutUrl: string; expiresAt: string | null }

// ─── 광고 유입 정보(UTM) — 메타 광고 소재별 성과 추적용 ──────────────────────
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'] as const
const UTM_STORE = 'lp_beta_utm'

function readUtm(): Record<string, string> {
  const fresh: Record<string, string> = {}
  try {
    const q = new URLSearchParams(window.location.search)
    for (const k of UTM_KEYS) {
      const v = q.get(k)
      if (v) fresh[k] = v.slice(0, 100)
    }
  } catch { /* noop */ }
  try {
    if (Object.keys(fresh).length) { sessionStorage.setItem(UTM_STORE, JSON.stringify(fresh)); return fresh }
    const saved = sessionStorage.getItem(UTM_STORE)
    return saved ? (JSON.parse(saved) as Record<string, string>) : {}
  } catch { return fresh }
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// ─── BetaApply ────────────────────────────────────────────────────────────────
export default function BetaApply() {
  const navigate = useNavigate()

  const [channel, setChannel]               = useState('')
  const [category, setCategory]             = useState('')
  const [categoryEtc, setCategoryEtc]       = useState('')
  const [productionType, setProductionType] = useState('')
  const [painPoint, setPainPoint]           = useState('')
  const [email, setEmail]                   = useState('')
  const [consent, setConsent]               = useState(false)
  const [website, setWebsite]               = useState('') // 허니팟 — 사람은 비워둠
  const [errors, setErrors]                 = useState<Record<string, string>>({})
  const [submitError, setSubmitError]       = useState('')
  const [coupon, setCoupon]                 = useState<Coupon | null>(null)
  const [step, setStep]                     = useState<Step>('form')
  const [submitting, setSubmitting]         = useState(false)

  // 광고 클릭으로 들어온 UTM을 첫 화면에서 저장해 둔다 (이동·새로고침해도 유지)
  useEffect(() => { readUtm() }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!channel)                 e.channel         = '판매 채널을 선택해주세요'
    if (!category)                e.category        = '카테고리를 선택해주세요'
    else if (category === '기타' && !categoryEtc.trim()) e.category = '어떤 식품인지 직접 입력해주세요'
    if (!productionType)          e.productionType  = '제품 생산 방식을 선택해주세요'
    if (!painPoint.trim())        e.painPoint       = '라벨에서 답답한 점을 입력해주세요'
    if (!email.trim())            e.email           = '이메일 주소를 입력해주세요'
    else if (!EMAIL_RE.test(email.trim())) e.email  = '올바른 이메일 형식으로 입력해주세요'
    if (!consent)                 e.consent         = '개인정보 수집·이용에 동의해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !validate()) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const u = readUtm()
      // 정원·중복·대상 판정, 일회용 쿠폰 발급, NPS 메일 예약은 모두 서버(Edge Function)에서 처리
      const { data, error } = await supabase.functions.invoke('beta-apply', {
        body: {
          business_type:   channel,
          category:        category === '기타' ? `기타:${categoryEtc.trim().slice(0, 24)}` : category,
          production_type: productionType,
          pain_point:      painPoint.trim(),
          email:           email.trim(),
          consent,
          website,
          utm: {
            source:   u.utm_source,
            medium:   u.utm_medium,
            campaign: u.utm_campaign,
            content:  u.utm_content,
          },
        },
      })

      if (error) {
        let code = ''
        try {
          const res = (error as { context?: Response }).context
          code = (await res?.json?.())?.error ?? ''
        } catch { /* noop */ }
        setSubmitError(
          code === 'coupon_failed'
            ? '신청은 접수됐지만 쿠폰 발급이 지연되고 있어요. 같은 이메일로 버튼을 한 번 더 눌러주세요.'
            : code === 'invalid'
              ? '입력 내용을 다시 확인해주세요.'
              : '일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.'
        )
        return
      }

      if (data?.status === 'ineligible') { setStep('ineligible'); return }
      if (data?.status === 'waitlist')   { setStep('closed');     return }
      if (data?.coupon) {
        trackBetaLead(data.coupon)
        setCoupon({ code: data.coupon, checkoutUrl: data.checkoutUrl, expiresAt: data.expiresAt ?? null })
        setStep('success')
        return
      }
      setSubmitError('일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } catch (err) {
      console.error('[BetaApply] 제출 오류:', err)
      setSubmitError('일시적인 오류가 발생했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── 성공 화면 ───────────────────────────────────────────────────────────
  if (step === 'success' && coupon) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: '-0.02em' }}>
            베타 파트너로 등록되었어요!
          </h2>
          <p style={{ fontSize: 14, color: INK_2, marginBottom: 32, lineHeight: 1.6 }}>
            라벨 검토 무료 체험을 열어드려요.
          </p>

          {/* 쿠폰 박스 — 신청자별 일회용 코드 */}
          <div style={{
            background: BLUE_50,
            border: `1.5px solid ${BLUE}33`,
            borderRadius: 14,
            padding: '24px 28px',
            marginBottom: 24,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: BLUE, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>
              내 쿠폰 코드 (1회용)
            </div>
            <div style={{
              fontFamily: FONT_KR,
              fontSize: 26,
              fontWeight: 800,
              color: BLUE,
              letterSpacing: '0.04em',
              marginBottom: 12,
              wordBreak: 'break-all',
            }}>
              {coupon.code}
            </div>
            <div style={{ fontSize: 13, color: INK_2, lineHeight: 1.6, marginBottom: 20 }}>
              신청하신 분만 쓸 수 있는 코드로, <strong>한 번만</strong> 사용할 수 있어요.
              {coupon.expiresAt && <> 유효기간은 <strong>{formatDate(coupon.expiresAt)}</strong>까지예요.</>}
              <br />아래 버튼을 누르면 자동 적용됩니다.
            </div>
            <a
              href={coupon.checkoutUrl}
              style={{
                display: 'block',
                height: 52, lineHeight: '52px',
                background: BLUE,
                color: '#fff',
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
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
            background: SOFT,
            border: `1px solid ${LINE}`,
            borderRadius: 12,
            padding: '16px 20px',
            textAlign: 'left',
          }}>
            <p style={{ fontSize: 13, color: NAVY, lineHeight: 1.7, margin: 0 }}>
              📧 <strong>3일 뒤</strong> 이메일로 짧은 설문 링크를 보내드려요.<br />
              이용 후 간단한 사용후기를 남겨주시면, 정식 출시 후 <strong>50% 평생 할인 코드</strong>를 드릴게요 🙏
            </p>
          </div>
        </div>
      </Shell>
    )
  }

  // ─── 대상 외 화면 (완제품 재판매) ─────────────────────────────────────────
  if (step === 'ineligible') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🙏</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: '-0.02em' }}>
            이번 베타는 직접 만드는 분이 대상이에요
          </h2>
          <p style={{ fontSize: 14, color: INK_2, marginBottom: 32, lineHeight: 1.6 }}>
            자체 제조 또는 OEM 위탁 생산으로 라벨 표시사항을 직접 준비하는 브랜드를 먼저 모시고 있어요.
            남겨주신 내용은 다음 모집 때 참고할게요.
          </p>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: `1.5px solid ${LINE}`,
              borderRadius: 12,
              padding: '0 24px', height: 48,
              fontSize: 13,
              color: INK_2,
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

  // ─── 마감 화면 ───────────────────────────────────────────────────────────
  if (step === 'closed') {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: '40px 8px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>😔</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: '-0.02em' }}>
            {BETA_CAP}명 정원이 마감되었어요
          </h2>
          <p style={{ fontSize: 14, color: INK_2, marginBottom: 32, lineHeight: 1.6 }}>
            자리가 나면 알려드릴게요.
          </p>

          <div style={{
            background: SOFT,
            border: `1px solid ${LINE}`,
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 28,
            textAlign: 'left',
          }}>
            <div style={{ fontSize: 13, color: NAVY, fontWeight: 600, marginBottom: 4 }}>
              대기 등록 완료
            </div>
            <div style={{ fontSize: 13, color: INK_2, lineHeight: 1.6 }}>
              <strong>{email}</strong>으로<br />
              자리가 생기면 가장 먼저 알려드릴게요.
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'transparent',
              border: `1.5px solid ${LINE}`,
              borderRadius: 12,
              padding: '0 24px', height: 48,
              fontSize: 13,
              color: INK_2,
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
          <div style={{
            display: 'inline-block', padding: '6px 12px', borderRadius: 999,
            background: BLUE_50, color: BLUE, fontSize: 12.5, fontWeight: 700, marginBottom: 14,
          }}>
            선착순 {BETA_CAP}명 · 라벨 검토 무료 체험
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, letterSpacing: '-0.03em', marginBottom: 8, lineHeight: 1.35 }}>
            출시 전, 라벨부터<br />확인하세요
          </h1>
          <p style={{ fontSize: 14, color: INK_2, lineHeight: 1.6 }}>
            5가지 질문에 답하면 무료 체험 쿠폰을 바로 드려요
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup label="1. 지금 어디서 판매하세요? (판매 예정 포함)" error={errors.channel}>
            <RadioGroup options={CHANNEL_OPTIONS} value={channel} onChange={setChannel} />
          </FieldGroup>

          <FieldGroup label="2. 어떤 식품인가요?" error={errors.category}>
            <RadioGroup options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
            {category === '기타' && (
              <input
                type="text"
                value={categoryEtc}
                onChange={e => setCategoryEtc(e.target.value)}
                placeholder="예: 커피, 차, 건강식품"
                maxLength={24}
                style={{ ...inputStyle(false), marginTop: 8 }}
              />
            )}
          </FieldGroup>

          <FieldGroup label="3. 제품은 어떻게 만드나요?" error={errors.productionType}>
            <RadioGroup options={PRODUCTION_OPTIONS} value={productionType} onChange={setProductionType} />
          </FieldGroup>

          <FieldGroup label="4. 지금 라벨 만들 때 가장 답답한 점" error={errors.painPoint}>
            <input
              type="text"
              value={painPoint}
              onChange={e => setPainPoint(e.target.value)}
              placeholder="예: 성분 표기 순서를 어떻게 해야 할지 몰라요"
              maxLength={500}
              style={inputStyle(!!errors.painPoint)}
            />
          </FieldGroup>

          <FieldGroup label="5. 이메일 주소" error={errors.email}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="hello@example.com"
              style={inputStyle(!!errors.email)}
              inputMode="email"
              autoComplete="email"
            />
            <p style={{ fontSize: 11.5, color: INK_3, marginTop: 5 }}>
              쿠폰은 신청 직후 화면에 바로 나와요. 3일 뒤 설문 링크를 보내드려요.
            </p>
          </FieldGroup>

          {/* 허니팟 — 화면 밖. 봇만 채움 */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          />

          {/* 개인정보 동의 (필수) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 12.5, color: NAVY, lineHeight: 1.6 }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ marginTop: 3, width: 16, height: 16, accentColor: BLUE, flexShrink: 0 }}
              />
              <span>
                <strong>[필수]</strong> 개인정보 수집·이용에 동의합니다. (항목: 이메일·응답 내용 / 목적: 베타 운영, 쿠폰 발급, 설문 안내){' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: BLUE, textDecoration: 'underline' }}>
                  개인정보처리방침
                </a>
              </span>
            </label>
            {errors.consent && <p style={{ fontSize: 12, color: RED, marginTop: 6 }}>{errors.consent}</p>}
            <p style={{ fontSize: 11.5, color: INK_3, marginTop: 8, lineHeight: 1.6 }}>
              무료 팩을 이용한 뒤 남기신 후기는 광고 표시 기준에 따라 ‘무료 제공 후 작성’ 표기와 함께 활용될 수 있어요.
            </p>
          </div>

          {submitError && (
            <p role="alert" style={{ fontSize: 13, color: RED, marginBottom: 12, lineHeight: 1.6 }}>{submitError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: 52,
              background: submitting ? 'rgba(51,88,238,0.5)' : BLUE,
              color: '#fff',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              border: 'none',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: FONT_KR,
              marginTop: 8,
              transition: 'background 0.2s',
            }}
          >
            {submitting ? '신청 중...' : '베타 참여 신청'}
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
      background: SOFT,
      fontFamily: FONT_KR,
      color: NAVY,
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
        padding: '36px 28px',
        border: `1px solid ${LINE}`,
        boxShadow: '0 8px 32px rgba(24,33,54,0.06)',
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
            border: `1.5px solid ${value === opt.value ? BLUE : LINE}`,
            borderRadius: 12,
            cursor: 'pointer',
            fontSize: 14,
            color: value === opt.value ? BLUE : NAVY,
            fontWeight: value === opt.value ? 700 : 500,
            background: value === opt.value ? BLUE_50 : '#fff',
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
            border: `2px solid ${value === opt.value ? BLUE : LINE}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {value === opt.value && (
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: BLUE, display: 'block' }} />
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
    width: '100%', height: 48, padding: '0 14px',
    border: `1.5px solid ${hasError ? RED : LINE}`,
    borderRadius: 12, fontSize: 14, color: NAVY,
    background: '#fff', fontFamily: FONT_KR,
    outline: 'none', boxSizing: 'border-box',
  }
}
