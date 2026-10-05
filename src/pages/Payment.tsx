/**
 * 결제 (시안 app_payment_v1.0) — 주문 내용 확인 · 환불 고지 동의 · Lemon Squeezy 결제창 이동
 */
import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AppHeader from '../components/lp/AppHeader'
import { PAYMENT_STATE_KEY, SERVICE, readSession, won, writeSession, type PaymentState, type ServiceType } from '../lib/review'

// ─── Lemon Squeezy Variant IDs (공개 OK — API Key 아님) ───────────────────────
const LS_VARIANT: Record<ServiceType, string> = {
  basic: import.meta.env.VITE_LS_BASIC_VARIANT_ID as string,
  pro:   import.meta.env.VITE_LS_PRO_VARIANT_ID   as string,
}
const LS_CHECKOUT_FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lemonsqueezy-checkout`

// ─── TEST MODE: 결제창 없이 결과 화면으로 (Live 전환 시 false) ────────────────
export const TEST_MODE = true

const INCLUDES: Record<ServiceType, { i: string; t: string; s: string }[]> = {
  basic: [
    { i: '17', t: '항목별 검토 결과', s: '수정 필요 · 확인 권장 항목 공개' },
    { i: 'PDF', t: '표시사항 시트 PDF · PNG · 텍스트', s: '항목별 정리 · 디자이너 전달용' },
    { i: '1년', t: '마이페이지 보관', s: '언제든 다시 받기' },
  ],
  pro: [
    { i: '17', t: '항목별 검토 결과', s: '수정 필요 · 확인 권장 항목 공개' },
    { i: '법령', t: '수정 방법 · 근거 법령 · 과태료', s: '항목마다 바로 고칠 수 있게' },
    { i: 'PDF', t: '표시사항 시트 PDF · PNG · 텍스트', s: '항목별 정리 · 디자이너 전달용' },
    { i: '리포트', t: '검토 리포트 PDF', s: '17개 항목 · 수정 방법 · 근거 · 과태료 참고' },
    { i: '신고', t: '신고 준비 가이드 PDF', s: '신고 절차 · 준비 서류 · 입력 항목 · 관련 링크' },
    { i: 'ZIP', t: '분리배출 마크', s: '재질별 도안 파일' },
    { i: '1년', t: '마이페이지 보관', s: '언제든 다시 받기' },
  ],
}

export default function Payment() {
  const navigate = useNavigate()
  const location = useLocation()
  const [agreed, setAgreed] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const state = (location.state ?? readSession<PaymentState>(PAYMENT_STATE_KEY)) as PaymentState | null
  if (!state?.ingredients || !state?.metadata) return <Navigate to="/creator" replace />

  const service: ServiceType = state.service === 'basic' ? 'basic' : 'pro'
  const cfg = SERVICE[service]
  const m = state.metadata
  const back = () => navigate('/review', { state })

  const handlePay = async () => {
    if (paying || !agreed) return
    setPaying(true)
    setError(null)
    writeSession(PAYMENT_STATE_KEY, { ...state, service })

    if (TEST_MODE) {
      navigate('/payment/complete', { replace: true, state: { ...state, service, success: true } })
      return
    }

    try {
      const res = await fetch(LS_CHECKOUT_FN, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          variantId: LS_VARIANT[service],
          userId: null,
          // 결제가 끝나야만 이 주소로 돌아옴 → paid=1로 완료 화면 판별
          redirectUrl: `${window.location.origin}/payment/complete?paid=1`,
        }),
      })
      if (!res.ok) throw new Error('checkout_failed')
      const { checkoutUrl } = await res.json()
      window.location.href = checkoutUrl
    } catch (e) {
      console.error('[LemonSqueezy] 결제 요청 실패', e)
      setError('결제창을 열지 못했어요. 잠시 후 다시 시도해 주세요.')
      setPaying(false)
    }
  }

  return (
    <div className="lp">
      <AppHeader mode="flow" current={3} />
      <main className="lp-page lp-page-pb">
        <button type="button" className="lp-back" onClick={back}>← 검토 결과로 돌아가기</button>
        <div className="lp-py-ph">
          <h1 className="lp-h1">결제하고 결과 받기</h1>
          <p className="lp-sub">결제가 끝나면 바로 항목별 결과와 파일을 받을 수 있어요.</p>
        </div>

        <div className="lp-py-grid">
          <div>
            <section className="lp-card" aria-labelledby="py-order">
              <h2 id="py-order">주문 내용</h2>
              <div className="lp-py-prod">
                <div className="thumb" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="M8 3h8l-1 4H9z" /><rect x="6" y="7" width="12" height="14" rx="3" /><path d="M9 13h6M9 16h4" /></svg>
                </div>
                <div>
                  <b>{m.productName || '이름 없는 제품'}</b>
                  <span>{[(m.categories ?? []).map(c => c.replace(/\//g, ' · ')).join(', '), m.totalWeight && `${m.totalWeight}${m.unit}`, state.reviewId && `검토번호 ${state.reviewId}`].filter(Boolean).join(' · ')}</span>
                </div>
              </div>
              <div className="lp-py-svc">
                <span className="nm">{cfg.name}{service === 'pro' && <span className="lp-badge">추천</span>}</span>
                <Link to="/review#svc" state={state}>서비스 변경</Link>
              </div>
              <ul className="lp-py-inc">
                {INCLUDES[service].map(x => (
                  <li key={x.t}><i>{x.i}</i><span>{x.t}<small>{x.s}</small></span></li>
                ))}
              </ul>
            </section>
            <section className="lp-card" aria-labelledby="py-how">
              <h2 id="py-how">결제는 이렇게 진행돼요</h2>
              <div className="lp-py-how">
                <div><b>1</b><span>결제 버튼을 누르면 보안 결제창으로 이동해요</span></div>
                <div><b>2</b><span>카드 또는 간편결제로 결제해요</span></div>
                <div><b>3</b><span>자동으로 돌아와 결과와 파일이 열려요</span></div>
              </div>
            </section>
          </div>

          <aside className="lp-py-box" aria-labelledby="py-pay">
            <h2 id="py-pay">결제 금액</h2>
            <div className="ln"><span>{cfg.name} 서비스 · 1제품</span><span>{won(cfg.price)}원</span></div>
            <div className="ln tot"><span>총 결제 금액</span><b>{won(cfg.price)}<small>원</small></b></div>
            <div className="vat">1회 결제 · 구독 없음</div>
            {/* 결제 전 환불 고지 (전자상거래법 제17조 제2항 — 디지털 콘텐츠 청약철회 제한 사전 안내) */}
            <div className="rf">
              <h3>결제 전 환불 안내</h3>
              <ul>
                <li>결제 후 7일 이내, 결과 · 파일을 <b>열람하거나 내려받지 않았다면 전액 환불</b>돼요.</li>
                <li>결과물은 결제 즉시 제공되는 디지털 콘텐츠라, <b>열람 · 다운로드 후에는 환불이 제한</b>돼요.</li>
              </ul>
              <label className="lp-check">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span className="lp-bx"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
                <span>위 내용과 <a href="/#refund" target="_blank" rel="noopener">환불정책</a>을 확인했어요 <span className="lp-req-t">(필수)</span></span>
              </label>
            </div>
            {error && <div className="lp-alert">{error}</div>}
            <button type="button" className="lp-btn lp-btn-blue lp-btn-block lp-py-pay" disabled={!agreed || paying} onClick={handlePay}>
              {paying ? <span className="lp-spin" /> : (
                <>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
                  {won(cfg.price)}원 결제하기
                </>
              )}
            </button>
            <p className="hint">{agreed ? '결제창으로 이동해요 · 결제 후 자동으로 돌아와요' : '환불 안내에 동의하면 결제할 수 있어요'}</p>
            <div className="methods"><span>신용 · 체크카드</span><span>Apple Pay</span><span>Google Pay</span></div>
            <div className="secure">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /></svg>
              SSL 보안 결제 · Lemon Squeezy 결제창
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
