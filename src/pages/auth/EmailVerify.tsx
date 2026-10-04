import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthShell from './AuthShell'
import { AuthStatus } from './AuthComponents'
import { supabase } from '../../lib/supabase'

type State = 'pending' | 'resent' | 'error'

export default function EmailVerify() {
  const { state } = useLocation()
  const email = (state as { email?: string } | null)?.email ?? ''

  const [status,    setStatus]    = useState<State>('pending')
  const [loading,   setLoading]   = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleResend = async () => {
    if (!email || loading || countdown > 0) return
    setLoading(true)
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    setLoading(false)
    if (error) { setStatus('error'); return }
    setStatus('resent')
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(interval); return 0 } return c - 1 })
    }, 1000)
  }

  return (
    <AuthShell>
      <AuthStatus
        tone={status === 'resent' ? 'green' : status === 'error' ? 'red' : 'blue'}
        icon={status === 'error' ? 'alert' : status === 'resent' ? 'check' : 'mail'}
        kicker="VERIFY EMAIL"
        title={status === 'resent' ? '인증 메일을 다시 보냈어요' : status === 'error' ? '다시 보내지 못했어요' : '이메일을 확인해 주세요'}
        sub={email ? `${email} 로 인증 링크를 보냈어요.` : '가입한 이메일로 인증 링크를 보냈어요.'}
        steps={status === 'error' ? undefined : ['받은편지함에서 라벨패스가 보낸 메일을 열어 주세요.', '메일 안의 인증 링크를 눌러 주세요.', '인증이 끝나면 자동으로 로그인돼요.']}
      >
        {email && status !== 'error' && (
          <button type="button" onClick={handleResend} disabled={loading || countdown > 0} className="lp-btn lp-btn-line lp-btn-block">
            {loading ? '보내는 중…' : countdown > 0 ? `${countdown}초 후 다시 보낼 수 있어요` : '인증 메일 다시 받기'}
          </button>
        )}
        <p className="lp-note" style={{ marginTop: 6 }}>메일이 안 보이면 스팸함도 확인해 주세요. · <Link to="/login" style={{ textDecoration: 'underline' }}>로그인으로</Link></p>
      </AuthStatus>
    </AuthShell>
  )
}
