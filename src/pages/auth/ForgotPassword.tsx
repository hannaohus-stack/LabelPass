import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Send } from 'lucide-react'
import AuthShell from './AuthShell'
import { AuthField, AuthSubmitBtn, AuthErrorBanner } from './AuthComponents'
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
      setEmailErr('올바른 이메일 주소를 입력해주세요.')
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
      <AuthShell crumb="이메일 발송 · SENT" crumbColor="#002D72">
        <div className="flex flex-col gap-5">
          <div className="flex justify-center">
            <Send size={44} className="text-heritage-500" />
          </div>
          <div className="text-center">
            <h1 className="font-kr font-semibold text-[20px] text-ink tracking-[-0.018em]">재설정 이메일을 보냈습니다.</h1>
            <p className="font-en text-[13px] text-[rgba(10,10,11,0.5)] mt-1">{email}</p>
          </div>
          <div className="flex flex-col gap-3">
            {['받은편지함에서 krk.team 발송 이메일을 확인하세요.','이메일 내 링크를 클릭해 새 비밀번호를 설정하세요.','링크는 24시간 동안 유효합니다.']
              .map((t, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="font-en text-[11px] font-bold text-heritage-500 flex-shrink-0 mt-0.5 tabular-nums">0{i+1}</span>
                  <p className="font-kr text-[13px] text-[rgba(10,10,11,0.65)] leading-[1.55]">{t}</p>
                </div>
              ))}
          </div>
          <button onClick={sendReset} disabled={countdown > 0 || loading}
            className="font-kr text-[13px] text-center underline"
            style={{ color: countdown > 0 ? 'rgba(10,10,11,0.35)' : '#002D72', cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}>
            {countdown > 0 ? `재발송 (${countdown}초 후 가능)` : '이메일 다시 보내기'}
          </button>
          <div className="border-t border-[rgba(10,10,11,0.08)] pt-4">
            <Link to="/login" className="font-kr text-[13px] text-[rgba(10,10,11,0.5)] hover:text-ink underline flex justify-center">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </AuthShell>
    )
  }

  // ── 요청 패널
  return (
    <AuthShell crumb="비밀번호 찾기 · RESET">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <h1 className="font-kr font-semibold text-[22px] text-ink tracking-[-0.018em]">비밀번호 찾기</h1>
          <p className="font-kr text-[13px] text-[rgba(10,10,11,0.55)] mt-1">
            가입한 이메일로 재설정 링크를 보내드립니다.
          </p>
        </div>
        <AuthErrorBanner msg={serverErr} />
        <AuthField label="이메일" type="email" placeholder="이메일 주소를 입력해주세요"
          value={email} onChange={v => { setEmail(v); setEmailErr('') }}
          error={emailErr} autoComplete="email" />
        <AuthSubmitBtn label="재설정 이메일 보내기" loading={loading} />
        <div className="border-t border-[rgba(10,10,11,0.08)] pt-4">
          <Link to="/login" className="font-kr text-[13px] text-[rgba(10,10,11,0.5)] hover:text-ink underline flex justify-center">
            로그인으로 돌아가기
          </Link>
        </div>
      </form>
    </AuthShell>
  )
}
