import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthField, AuthSubmitBtn, KakaoBtn, AuthDivider, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/useAuth'

export default function Signup() {
  const navigate = useNavigate()
  const { session, loading: authLoading } = useAuth()

  const [email,   setEmail]   = useState('')
  const [pw,      setPw]      = useState('')
  const [pwConf,  setPwConf]  = useState('')
  const [terms,   setTerms]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverErr, setServerErr] = useState('')

  const [errors, setErrors] = useState({ email: '', pw: '', pwConf: '', terms: '' })

  if (!authLoading && session) return <Navigate to="/dashboard" replace />

  const validate = () => {
    const e = { email: '', pw: '', pwConf: '', terms: '' }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = '올바른 이메일 주소를 입력해주세요.'
    if (pw.length < 8) e.pw = '비밀번호는 8자 이상이어야 합니다.'
    if (pw !== pwConf)  e.pwConf = '비밀번호가 일치하지 않습니다.'
    if (!terms)         e.terms = '필수 약관에 동의해주세요.'
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setServerErr('')
    if (!validate()) return
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password: pw })
    setLoading(false)
    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setErrors(p => ({ ...p, email: '이미 사용 중인 이메일입니다.' }))
      } else {
        setServerErr(error.message)
      }
      return
    }
    // 이메일 인증 ON → verify-email 화면
    // 이메일 인증 OFF → 세션 즉시 발급 → 대시보드로 바로 이동
    if (data.session) {
      navigate('/dashboard')
    } else {
      navigate('/verify-email', { state: { email } })
    }
  }

  return (
    <AuthShell crumb="회원가입 · SIGN UP">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">

        <div>
          <h1 className="font-kr font-semibold text-[22px] text-ink tracking-[-0.018em]">회원가입</h1>
          <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1">krk check를 시작해보세요.</p>
        </div>

        <KakaoBtn />
        <AuthDivider />

        <AuthErrorBanner msg={serverErr} />

        <AuthField label="이메일" type="email" placeholder="이메일 주소를 입력해주세요"
          value={email} onChange={v => { setEmail(v); setErrors(p => ({...p, email:''})) }}
          error={errors.email} autoComplete="email" />

        <AuthField label="비밀번호" type="password" placeholder="8자 이상의 비밀번호"
          value={pw} onChange={v => { setPw(v); setErrors(p => ({...p, pw:''})) }}
          error={errors.pw} autoComplete="new-password" />

        <AuthField label="비밀번호 확인" type="password" placeholder="비밀번호 확인"
          value={pwConf} onChange={v => { setPwConf(v); setErrors(p => ({...p, pwConf:''})) }}
          error={errors.pwConf} autoComplete="new-password" />

        {/* 약관 동의 */}
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input type="checkbox" checked={terms} onChange={e => { setTerms(e.target.checked); setErrors(p => ({...p, terms:''})) }}
              className="w-4 h-4 cursor-pointer" style={{ accentColor: '#002D72' }} />
            <span className="font-kr text-[13px] text-ink">필수 약관에 동의합니다</span>
          </label>
          {errors.terms && (
            <p className="font-kr text-[12px] pl-6" style={{ color: '#E5484D' }}>{errors.terms}</p>
          )}
        </div>

        <AuthSubmitBtn label="회원가입" loading={loading} />

        <p className="font-kr text-[13px] text-center text-[rgba(10,10,11,0.5)]">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="font-medium text-ink hover:underline">로그인</Link>
        </p>
      </form>
    </AuthShell>
  )
}
