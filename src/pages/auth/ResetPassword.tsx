import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import AuthShell from './AuthShell'
import { AuthField, AuthSubmitBtn, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'

type Panel = 'reset' | 'success' | 'expired'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [panel,    setPanel]    = useState<Panel>('reset')
  const [pw,       setPw]       = useState('')
  const [pwConf,   setPwConf]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [errors, setErrors] = useState({ pw: '', pwConf: '' })

  const validate = () => {
    const e = { pw: '', pwConf: '' }
    if (pw.length < 8) e.pw = '비밀번호는 8자 이상이어야 합니다.'
    if (pw !== pwConf)  e.pwConf = '비밀번호가 일치하지 않습니다.'
    setErrors(e)
    return !Object.values(e).some(Boolean)
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setServerErr('')
    if (!validate()) return
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setLoading(false)
    if (error) {
      if (error.message.toLowerCase().includes('expired') || error.message.toLowerCase().includes('invalid')) {
        setPanel('expired')
      } else {
        setServerErr(error.message)
      }
      return
    }
    setPanel('success')
  }

  // ── 성공 패널
  if (panel === 'success') {
    return (
      <AuthShell crumb="변경 완료 · SUCCESS" crumbColor="#00AA41">
        <div className="flex flex-col gap-5 text-center">
          <div className="flex justify-center">
            <CheckCircle2 size={44} style={{ color: '#00AA41' }} />
          </div>
          <div>
            <h1 className="font-kr font-semibold text-[20px] text-ink tracking-[-0.018em]">비밀번호가 변경됐습니다.</h1>
            <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1 leading-[1.55]">
              새 비밀번호로 로그인해주세요.
            </p>
          </div>
          <button onClick={() => navigate('/login')} className="btn-heritage w-full h-[46px] text-[14px]">
            로그인하기
          </button>
        </div>
      </AuthShell>
    )
  }

  // ── 만료 패널
  if (panel === 'expired') {
    return (
      <AuthShell crumb="링크 만료 · EXPIRED" crumbColor="#B07A1A">
        <div className="flex flex-col gap-5 text-center">
          <div className="flex justify-center">
            <AlertTriangle size={44} style={{ color: '#B07A1A' }} />
          </div>
          <div>
            <h1 className="font-kr font-semibold text-[20px] text-ink tracking-[-0.018em]">링크가 만료됐습니다.</h1>
            <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1 leading-[1.55]">
              비밀번호 재설정 링크는 24시간 동안만 유효합니다.
            </p>
          </div>
          <Link to="/forgot-password" className="btn-heritage w-full h-[46px] text-[14px] flex items-center justify-center">
            이메일 다시 받기
          </Link>
          <Link to="/login" className="font-kr text-[13px] text-[rgba(10,10,11,0.5)] hover:text-ink underline">
            로그인으로 돌아가기
          </Link>
        </div>
      </AuthShell>
    )
  }

  // ── 재설정 폼
  return (
    <AuthShell crumb="비밀번호 재설정 · RESET">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <h1 className="font-kr font-semibold text-[22px] text-ink tracking-[-0.018em]">새 비밀번호 설정</h1>
          <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1">8자 이상의 새 비밀번호를 입력해주세요.</p>
        </div>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="새 비밀번호" type="password" placeholder="새 비밀번호 (8자 이상)"
          value={pw} onChange={v => { setPw(v); setErrors(p => ({...p, pw:''})) }}
          error={errors.pw} autoComplete="new-password" />
        <AuthField label="비밀번호 확인" type="password" placeholder="비밀번호 확인"
          value={pwConf} onChange={v => { setPwConf(v); setErrors(p => ({...p, pwConf:''})) }}
          error={errors.pwConf} autoComplete="new-password" />
        <AuthSubmitBtn label="비밀번호 변경" loading={loading} />
        <div className="border-t border-[rgba(10,10,11,0.08)] pt-4">
          <Link to="/login" className="font-kr text-[13px] text-[rgba(10,10,11,0.5)] hover:text-ink underline flex justify-center">
            로그인으로 돌아가기
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
