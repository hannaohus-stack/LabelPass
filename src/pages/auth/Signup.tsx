import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthTitle, GateBanner, AuthField, AuthSubmitBtn, KakaoBtn, AuthDivider, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { safeNext, rememberNext } from '../../lib/next'
import { trackCompleteRegistration } from '../../lib/analytics'

const BoxIcon = () => (
  <span className="lp-bx"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg></span>
)

export default function Signup() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading: authLoading } = useAuth()
  const next = safeNext(params.get('next'))
  const gate = params.get('gate') === '1'
  const qs = next ? `?next=${encodeURIComponent(next)}${gate ? '&gate=1' : ''}` : ''

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [pwConf,  setPwConf]  = useState('')
  const [agTerms, setAgTerms] = useState(false)
  const [agPriv,  setAgPriv]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [errors, setErrors] = useState({ email: '', pw: '', pwConf: '', terms: '' })

  if (!authLoading && session) return <Navigate to={next ?? '/dashboard'} replace />

  const allAgreed = agTerms && agPriv
  const setAll = (v: boolean) => { setAgTerms(v); setAgPriv(v); setErrors(p => ({ ...p, terms: '' })) }

  const validate = () => {
    const e = { email: '', pw: '', pwConf: '', terms: '' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '이메일 주소를 확인해 주세요.'
    if (pw.length < 8) e.pw = '비밀번호는 8자 이상이어야 해요.'
    if (pw !== pwConf)  e.pwConf = '비밀번호가 일치하지 않아요.'
    if (!allAgreed)     e.terms = '필수 약관에 동의해 주세요.'
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerErr('')
    if (!validate()) return
    setLoading(true)
    const emailRedirectTo = `${window.location.origin}/auth/callback`
    const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { emailRedirectTo } })
    setLoading(false)
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setErrors(p => ({ ...p, email: '이미 가입된 이메일이에요. 로그인해 주세요.' }))
      } else {
        setServerErr(error.message)
      }
      return
    }
    // 가입 성공 확정 → Meta Pixel CompleteRegistration (사용자당 1회)
    if (data.user) trackCompleteRegistration(data.user.id)
    // 이메일 인증 OFF → 바로 로그인 상태 / ON → 인증 안내 화면
    if (data.session) navigate(next ?? '/dashboard', { replace: true })
    else { rememberNext(next); navigate('/verify-email', { state: { email } }) }
  }

  return (
    <AuthShell>
      {gate && <GateBanner />}
      <AuthTitle kicker="SIGN UP" title="회원가입" sub="가입하고 무료 검토 결과를 확인하세요." />
      <KakaoBtn next={next} />
      <AuthDivider text="또는 이메일로 가입" />
      <form onSubmit={handleSubmit} noValidate>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="이메일" type="email" placeholder="name@company.com"
          value={email} onChange={v => { setEmail(v); setErrors(p => ({ ...p, email: '' })) }}
          error={errors.email} autoComplete="email" />
        <AuthField label="비밀번호" type="password" placeholder="8자 이상"
          value={pw} onChange={v => { setPw(v); setErrors(p => ({ ...p, pw: '' })) }}
          error={errors.pw} hint="영문 · 숫자를 섞어 8자 이상" autoComplete="new-password" />
        <AuthField label="비밀번호 확인" type="password" placeholder="비밀번호를 한 번 더 입력"
          value={pwConf} onChange={v => { setPwConf(v); setErrors(p => ({ ...p, pwConf: '' })) }}
          error={errors.pwConf} autoComplete="new-password" />

        <div className={`lp-agree${errors.terms ? ' bad' : ''}`} role="group" aria-label="약관 동의">
          <label className="lp-ag all"><input type="checkbox" checked={allAgreed} onChange={e => setAll(e.target.checked)} /><BoxIcon />전체 동의</label>
          <label className="lp-ag"><input type="checkbox" checked={agTerms} onChange={e => { setAgTerms(e.target.checked); setErrors(p => ({ ...p, terms: '' })) }} /><BoxIcon />
            <span><span className="lp-req" style={{ fontWeight: 700 }}>[필수]</span> 이용약관</span>
            <a className="view" href="/terms">보기</a></label>
          <label className="lp-ag"><input type="checkbox" checked={agPriv} onChange={e => { setAgPriv(e.target.checked); setErrors(p => ({ ...p, terms: '' })) }} /><BoxIcon />
            <span><span className="lp-req" style={{ fontWeight: 700 }}>[필수]</span> 개인정보 수집 · 이용</span>
            <a className="view" href="/privacy">보기</a></label>
        </div>
        {errors.terms && <p className="lp-err" style={{ margin: '-12px 0 16px' }}>{errors.terms}</p>}

        <AuthSubmitBtn label="가입하기" loading={loading} disabled={!allAgreed} />
      </form>
      <p className="lp-switch">이미 계정이 있나요?<Link to={`/login${qs}`}>로그인</Link></p>
      <p className="lp-note">가입 후 이메일 인증 링크를 보내드려요.</p>
    </AuthShell>
  )
}
