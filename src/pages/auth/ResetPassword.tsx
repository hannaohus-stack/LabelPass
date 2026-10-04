import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthTitle, AuthStatus, AuthField, AuthSubmitBtn, AuthErrorBanner } from './AuthComponents'
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
    if (pw.length < 8) e.pw = '비밀번호는 8자 이상이어야 해요.'
    if (pw !== pwConf)  e.pwConf = '비밀번호가 일치하지 않아요.'
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
      <AuthShell>
        <AuthStatus tone="green" icon="check" kicker="DONE" title="비밀번호를 바꿨어요" sub="새 비밀번호로 로그인해 주세요.">
          <button type="button" onClick={() => navigate('/login')} className="lp-btn lp-btn-blue lp-btn-block">로그인하기</button>
        </AuthStatus>
      </AuthShell>
    )
  }

  // ── 만료 패널
  if (panel === 'expired') {
    return (
      <AuthShell>
        <AuthStatus tone="amber" icon="alert" kicker="LINK EXPIRED" title="링크가 만료됐어요" sub="비밀번호 재설정 링크는 24시간 동안만 쓸 수 있어요.">
          <Link to="/forgot-password" className="lp-btn lp-btn-blue lp-btn-block">메일 다시 받기</Link>
          <p className="lp-switch" style={{ marginTop: 8 }}><Link to="/login">로그인으로 돌아가기</Link></p>
        </AuthStatus>
      </AuthShell>
    )
  }

  // ── 재설정 폼
  return (
    <AuthShell>
      <AuthTitle kicker="RESET PASSWORD" title="새 비밀번호 설정" sub="8자 이상의 새 비밀번호를 입력해 주세요." />
      <form onSubmit={handleSubmit} noValidate style={{ marginTop: 32 }}>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="새 비밀번호" type="password" placeholder="8자 이상"
          value={pw} onChange={v => { setPw(v); setErrors(p => ({ ...p, pw: '' })) }}
          error={errors.pw} autoComplete="new-password" />
        <AuthField label="비밀번호 확인" type="password" placeholder="비밀번호를 한 번 더 입력"
          value={pwConf} onChange={v => { setPwConf(v); setErrors(p => ({ ...p, pwConf: '' })) }}
          error={errors.pwConf} autoComplete="new-password" />
        <AuthSubmitBtn label="비밀번호 변경" loading={loading} />
      </form>
      <p className="lp-switch"><Link to="/login">로그인으로 돌아가기</Link></p>
    </AuthShell>
  )
}
