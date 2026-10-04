import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthField, AuthSubmitBtn, KakaoBtn, AuthDivider, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

export default function Login() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [loading, setLoading] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [errors, setErrors] = useState({ email: '', pw: '' })

  // 이미 로그인된 경우 대시보드로
  if (!authLoading && session) return <Navigate to="/dashboard" replace />

  const validate = () => {
    const e = { email: '', pw: '' }
    if (!email.trim()) e.email = '이메일을 입력해주세요.'
    if (!pw.trim())    e.pw    = '비밀번호를 입력해주세요.'
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
      setServerErr('이메일 또는 비밀번호가 일치하지 않습니다.')
      return
    }
    navigate('/dashboard')
  }

  return (
    <AuthShell crumb="로그인 · SIGN IN">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        <div>
          <h1 className="font-kr font-semibold text-[22px] text-ink tracking-[-0.018em]">로그인</h1>
          <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1">krk check에 오신 것을 환영합니다.</p>
        </div>

        <KakaoBtn />
        <AuthDivider />

        <AuthErrorBanner msg={serverErr} />

        <AuthField label="이메일" type="email" placeholder="이메일 주소를 입력해주세요"
          value={email} onChange={v => { setEmail(v); setErrors(p => ({...p, email:''})); setServerErr('') }}
          error={errors.email} autoComplete="email" />

        <div className="flex flex-col gap-1.5">
          <AuthField label="비밀번호" type="password" placeholder="비밀번호"
            value={pw} onChange={v => { setPw(v); setErrors(p => ({...p, pw:''})); setServerErr('') }}
            error={errors.pw} autoComplete="current-password" />
          <div className="flex justify-end">
            <Link to="/forgot-password" className="font-kr text-[12px] text-[rgba(10,10,11,0.5)] hover:text-ink underline">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </div>

        <AuthSubmitBtn label="로그인" loading={loading} />

        <p className="font-kr text-[13px] text-center text-[rgba(10,10,11,0.5)]">
          계정이 없으신가요?{' '}
          <Link to="/signup" className="font-medium text-ink hover:underline">회원가입</Link>
        </p>
      </form>
    </AuthShell>
  )
}
