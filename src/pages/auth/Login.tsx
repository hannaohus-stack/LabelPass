import { useState } from 'react'
import { Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthTitle, GateBanner, AuthField, AuthSubmitBtn, KakaoBtn, AuthDivider, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'
import { safeNext } from '../../lib/next'

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { session, loading: authLoading } = useAuth()
  const next = safeNext(params.get('next'))
  const gate = params.get('gate') === '1'
  const qs = next ? `?next=${encodeURIComponent(next)}${gate ? '&gate=1' : ''}` : ''

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [loading, setLoading] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [errors, setErrors] = useState({ email: '', pw: '' })

  // 이미 로그인된 경우 돌아갈 곳(없으면 마이페이지)으로
  if (!authLoading && session) return <Navigate to={next ?? '/dashboard'} replace />

  const validate = () => {
    const e = { email: '', pw: '' }
    if (!email.trim()) e.email = '이메일을 입력해 주세요.'
    if (!pw.trim())    e.pw    = '비밀번호를 입력해 주세요.'
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setServerErr('')
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    if (error) {
      setServerErr('이메일 또는 비밀번호가 일치하지 않아요.')
      return
    }
    navigate(next ?? '/dashboard', { replace: true })
  }

  return (
    <AuthShell>
      {gate && <GateBanner />}
      <AuthTitle kicker="LOGIN" title="로그인" sub="라벨패스에 오신 것을 환영합니다." />
      <KakaoBtn next={next} />
      <AuthDivider text="또는 이메일로 로그인" />
      <form onSubmit={handleSubmit} noValidate>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="이메일" type="email" placeholder="name@company.com"
          value={email} onChange={v => { setEmail(v); setErrors(p => ({ ...p, email: '' })); setServerErr('') }}
          error={errors.email} autoComplete="email" />
        <AuthField label="비밀번호" type="password" placeholder="비밀번호"
          value={pw} onChange={v => { setPw(v); setErrors(p => ({ ...p, pw: '' })); setServerErr('') }}
          error={errors.pw} autoComplete="current-password" />
        <div className="lp-row-r"><Link to="/forgot-password">비밀번호를 잊으셨나요?</Link></div>
        <AuthSubmitBtn label="로그인" loading={loading} />
      </form>
      <p className="lp-switch">아직 계정이 없나요?<Link to={`/signup${qs}`}>회원가입</Link></p>
    </AuthShell>
  )
}
