import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthTitle, AuthStatus, AuthField, AuthSubmitBtn, AuthErrorBanner } from './AuthComponents'
import { supabase } from '../../lib/supabase'

type Panel = 'request' | 'sent'

export default function ForgotPassword() {
  const [panel,   setPanel]   = useState<Panel>('request')
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [serverErr, setServerErr] = useState('')
  const [emailErr,  setEmailErr]  = useState('')
  const [countdown, setCountdown] = useState(0)

  const validate = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailErr('이메일 주소를 확인해 주세요.')
      return false
    }
    setEmailErr('')
    return true
  }

  const sendReset = async () => {
    if (!validate() || loading || countdown > 0) return
    setLoading(true)
    setServerErr('')
    const redirectTo = `${window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    setLoading(false)
    if (error) {
      setServerErr(error.message)
      return
    }
    setPanel('sent')
    startCooldown()
  }

  const startCooldown = () => {
    setCountdown(30)
    const iv = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(iv); return 0 } return c - 1 })
    }, 1000)
  }

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); sendReset() }

  // ── 성공 패널
  if (panel === 'sent') {
    return (
      <AuthShell>
        <AuthStatus tone="blue" icon="mail" kicker="RESET PASSWORD" title="재설정 메일을 보냈어요" sub={email}
          steps={['받은편지함에서 라벨패스가 보낸 메일을 열어 주세요.', '메일 안의 링크를 눌러 새 비밀번호를 정해 주세요.', '링크는 24시간 동안 쓸 수 있어요.']}>
          <button type="button" onClick={sendReset} disabled={countdown > 0 || loading} className="lp-btn lp-btn-line lp-btn-block">
            {countdown > 0 ? `${countdown}초 후 다시 보낼 수 있어요` : '메일 다시 보내기'}
          </button>
          <p className="lp-switch" style={{ marginTop: 8 }}><Link to="/login">로그인으로 돌아가기</Link></p>
        </AuthStatus>
      </AuthShell>
    )
  }

  // ── 요청 패널
  return (
    <AuthShell>
      <AuthTitle kicker="RESET PASSWORD" title="비밀번호 찾기" sub="가입한 이메일로 재설정 링크를 보내드려요." />
      <form onSubmit={handleSubmit} noValidate style={{ marginTop: 32 }}>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="이메일" type="email" placeholder="name@company.com"
          value={email} onChange={v => { setEmail(v); setEmailErr('') }}
          error={emailErr} autoComplete="email" />
        <AuthSubmitBtn label="재설정 메일 보내기" loading={loading} />
      </form>
      <p className="lp-switch"><Link to="/login">로그인으로 돌아가기</Link></p>
    </AuthShell>
  )
}
