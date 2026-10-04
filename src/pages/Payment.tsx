import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AlertCircle, Check, ChevronLeft, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react'
import LogoLockup from '../components/LogoLockup'
import type { Ingredient } from '../utils/parsing'
import type { Metadata } from './ReviewResult'
import type { CreatorData } from './creator/types'
import type { ServiceTier } from '../utils/tierUtils'

type ServiceType = 'basic' | 'pro'

// ─── Lemon Squeezy Variant IDs (공개 OK — API Key 아님) ───────────────────────
const LS_VARIANT: Record<ServiceType, string> = {
  basic: import.meta.env.VITE_LS_BASIC_VARIANT_ID as string,
  pro:   import.meta.env.VITE_LS_PRO_VARIANT_ID   as string,
}

// ─── Supabase Edge Function URL ───────────────────────────────────────────────
const LS_CHECKOUT_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemonsqueezy-checkout`

const SERVICES: Record<ServiceType, {
  eyebrow: string
  name: string
  price: number
  files: { name: string; use: string }[]
  copyItems: string[]
}> = {
  basic: {
    eyebrow: 'Basic Label Package',
    name: '기본 라벨 패키지',
    price: 9900,
    files: [
      { name: '라벨 PDF', use: '인쇄용 · A4' },
      { name: '라벨 PNG', use: '웹 · 스마트스토어 / 3000x3000' },
    ],
    copyItems: ['원재료명 · 함량', '알레르기 유발물질', '제품명 · 영문'],
  },
  pro: {
    eyebrow: 'Professional Guide',
    name: '전문 수정 가이드',
    price: 19900,
    files: [
      { name: '라벨 PDF', use: '인쇄용 · A4' },
      { name: '라벨 PNG', use: '웹 · 스마트스토어' },
      { name: '품목제조보고 입력 가이드', use: '정부24 참고용' },
      { name: 'krk 라벨 검토 리포트', use: '자율 점검 기록' },
      { name: '분리배출 마크 ZIP', use: '환경부 공식 도안' },
    ],
    copyItems: ['원재료명 · 함량', '알레르기 유발물질', '식품유형', '제품명 · 영문'],
  },
}

const fmtKRW = (value: number) => value.toLocaleString('ko-KR')
const serviceToTier = (service: ServiceType): ServiceTier => service === 'basic' ? 'tier1' : 'tier2'

function normalizeService(state: NonNullable<PaymentRouteState>): ServiceType {
  if (state.service === 'basic' || state.service === 'pro') return state.service
  if (state.returnTier === 'tier1') return 'basic'
  return 'pro'
}

type PaymentRouteState = {
  ingredients?: Ingredient[]
  metadata?: Metadata
  service?: ServiceType
  returnTier?: ServiceTier
  creatorData?: CreatorData
} | null

// ─── Header ──────────────────────────────────────────────────────────────────
function Header({ onBack }: { onBack: () => void }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-[rgba(10,10,11,0.1)] bg-white/75 px-5 py-4 backdrop-blur-[18px] md:px-12">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 font-en text-[12px] text-[rgba(10,10,11,0.5)] transition-colors hover:text-ink"
        >
          <ChevronLeft size={14} />
          Review
        </button>
        <LogoLockup />
        <div className="flex items-center gap-2 font-en text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.42)]">
          <ShieldCheck size={13} />
          Checkout
        </div>
      </div>
    </nav>
  )
}

// ─── OrderSummary ─────────────────────────────────────────────────────────────
function OrderSummary({
  metadata,
  service,
}: {
  metadata: Metadata
  service: ServiceType
}) {
  const cfg = SERVICES[service]
  return (
    <section className="border border-[rgba(10,10,11,0.1)] bg-white">
      <div className="border-b border-[rgba(10,10,11,0.08)] px-5 py-5">
        <div className="font-en text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.38)]">
          {cfg.eyebrow}
        </div>
        <h2 className="mt-1 font-kr text-[18px] font-semibold text-ink">{cfg.name}</h2>
        <p className="mt-2 font-kr text-[12px] leading-[1.6] text-[rgba(10,10,11,0.5)]">
          {metadata.productName || '제품명 미입력'} · {(metadata.categories ?? []).join(', ') || '카테고리 미선택'}
        </p>
      </div>

      <div className="border-b border-[rgba(10,10,11,0.08)] px-5 py-4">
        <div className="mb-3 font-en text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.35)]">
          포함 내역
        </div>
        <div className="flex flex-col gap-2.5">
          {cfg.files.map(file => (
            <div key={file.name} className="flex items-start gap-2.5">
              <Check size={13} className="mt-[2px] flex-shrink-0 text-heritage-500" strokeWidth={2.5} />
              <div>
                <div className="font-kr text-[13px] font-medium text-ink">{file.name}</div>
                <div className="font-kr text-[11px] text-[rgba(10,10,11,0.43)]">{file.use}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        <div className="flex items-end justify-between gap-4">
          <span className="font-kr text-[13px] text-[rgba(10,10,11,0.48)]">결제 금액</span>
          <span className="font-en text-[32px] font-bold leading-none tracking-normal text-heritage-500 tabular-nums">
            {fmtKRW(cfg.price)}<span className="ml-1 font-kr text-[14px] font-medium text-[rgba(10,10,11,0.45)]">원</span>
          </span>
        </div>
        <p className="mt-2 font-kr text-[11px] text-[rgba(10,10,11,0.36)]">1회 발급 · 부가세 포함</p>
      </div>
    </section>
  )
}

// ─── TEST MODE: 결제 스킵 (테스트 시에만 true) ────────────────────────────────
const TEST_MODE = true

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()

  const [paying, setPaying] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const state = location.state as PaymentRouteState
  if (!state?.ingredients || !state?.metadata) return <Navigate to="/" replace />

  const { ingredients, metadata, creatorData } = state
  const service = normalizeService(state)
  const tier    = serviceToTier(service)
  const cfg     = SERVICES[service]

  // ── 결제 핸들러 ─────────────────────────────────────────────────────────────
  const handlePay = async () => {
    if (paying) return
    setPaying(true)
    setError(null)

    // TEST_MODE: 결제 스킵 → PaymentComplete로 직행
    if (TEST_MODE) {
      navigate('/payment/complete', {
        replace: true,
        state: { ingredients, metadata, service, tier, creatorData, success: true },
      })
      return
    }

    try {
      const res = await fetch(LS_CHECKOUT_FN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          variantId: LS_VARIANT[service],
          userId: null,
          redirectUrl: `${window.location.origin}/payment/complete`,
        }),
      })

      if (!res.ok) throw new Error('checkout_failed')
      const { checkoutUrl } = await res.json()

      // sessionStorage 보존 (redirect 복귀 후 사용)
      sessionStorage.setItem(
        'krk_payment_state',
        JSON.stringify({ ingredients, metadata, service, tier, creatorData }),
      )

      window.location.href = checkoutUrl
    } catch (e) {
      console.error('[LemonSqueezy] 결제 요청 실패', e)
      setError('결제 페이지를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F4F5]">
      <Header onBack={() => navigate(-1)} />

      <main className="mx-auto max-w-[1180px] px-5 py-8 md:px-8 md:py-12">
        <header className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-en text-[11px] font-semibold uppercase tracking-[0.16em] text-[rgba(10,10,11,0.38)]">
              결제 · CHECKOUT
            </div>
            <h1 className="mt-2 font-kr text-[26px] font-semibold tracking-[-0.018em] text-ink md:text-[34px]">
              결제하고 파일 받기
            </h1>
            <p className="mt-2 font-kr text-[13px] leading-[1.7] text-[rgba(10,10,11,0.55)]">
              결제 완료 즉시 파일이 준비됩니다. 입력한 제품 정보는 다운로드 화면까지 이어집니다.
            </p>
          </div>
          <div className="flex items-center gap-2 border border-[rgba(10,10,11,0.08)] bg-white px-3 py-2 font-en text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgba(10,10,11,0.42)]">
            <LockKeyhole size={13} className="text-heritage-500" />
            SSL · Lemon Squeezy
          </div>
        </header>

        <div className="grid grid-cols-1 gap-7 md:grid-cols-[1fr_1.05fr]">
          <OrderSummary metadata={metadata} service={service} />

          <section className="border border-[rgba(10,10,11,0.1)] bg-white">
            <div className="border-b border-[rgba(10,10,11,0.08)] px-5 py-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-heritage-500" />
                <h2 className="font-kr text-[15px] font-semibold text-ink">결제 수단</h2>
              </div>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">
              {error && (
                <div className="flex items-start gap-2 border border-[#B30000] bg-[rgba(179,0,0,0.04)] px-4 py-3">
                  <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-[#B30000]" />
                  <p className="font-kr text-[12px] text-[#B30000]">{error}</p>
                </div>
              )}

              {/* 결제 플로우 안내 */}
              <div className="border border-[rgba(10,10,11,0.09)] bg-[#F8F8F8] p-6">
                <p className="mb-5 font-en text-[10px] font-semibold uppercase tracking-[0.14em] text-[rgba(10,10,11,0.35)]">
                  결제 진행 방식
                </p>

                {/* Step flow */}
                <div className="flex items-start justify-between gap-2">
                  {[
                    { icon: '🔒', step: 'STEP 1', text: '아래 버튼\n클릭' },
                    { icon: '💳', step: 'STEP 2', text: '보안 결제창\n이동 후 결제' },
                    { icon: '📦', step: 'STEP 3', text: '파일 자동\n준비 완료' },
                  ].map((s, i) => (
                    <div key={s.step} className="flex flex-1 items-start gap-2">
                      <div className="flex flex-1 flex-col items-center gap-2 text-center">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(0,45,114,0.15)] bg-[rgba(0,45,114,0.05)] text-[20px]">
                          {s.icon}
                        </div>
                        <span className="font-en text-[9px] font-bold tracking-[0.1em] text-heritage-500">
                          {s.step}
                        </span>
                        <span className="whitespace-pre-line font-kr text-[11px] leading-[1.5] text-[rgba(10,10,11,0.55)]">
                          {s.text}
                        </span>
                      </div>
                      {i < 2 && (
                        <span className="mt-5 flex-shrink-0 text-[14px] text-[rgba(10,10,11,0.2)]">›</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* 결제 수단 배지 */}
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {['Visa', 'Mastercard', 'Apple Pay', 'Google Pay'].map(m => (
                    <span
                      key={m}
                      className="rounded border border-[rgba(10,10,11,0.1)] bg-white px-3 py-1 font-en text-[11px] font-medium text-[rgba(10,10,11,0.45)]"
                    >
                      {m}
                    </span>
                  ))}
                </div>

                {/* 보안 배지 */}
                <div className="mt-4 flex items-center justify-center gap-1.5 rounded bg-[rgba(0,45,114,0.05)] px-4 py-2.5 text-center">
                  <LockKeyhole size={12} className="flex-shrink-0 text-heritage-500" />
                  <span className="font-kr text-[11px] text-[rgba(0,45,114,0.75)]">
                    SSL 보안 결제 · Lemon Squeezy 제공 · 결제 후 자동으로 돌아옵니다
                  </span>
                </div>
              </div>

              <button
                onClick={handlePay}
                disabled={paying}
                className="btn-heritage mt-1 flex h-14 w-full items-center justify-center gap-2 text-[14px] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {paying ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  `${fmtKRW(cfg.price)}원 결제하기`
                )}
              </button>

              <p className="text-center font-kr text-[11px] leading-[1.65] text-[rgba(10,10,11,0.36)]">
                SSL 보안 결제 · 결제 완료 즉시 다운로드 화면으로 이동합니다.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
