import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Mail, CheckCircle2, AlertTriangle } from 'lucide-react'
import AuthShell from './AuthShell'
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
    // 30초 쿨다운
    setCountdown(30)
    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(interval); return 0 }
        return c - 1
      })
    }, 1000)
  }

  return (
    <AuthShell
      crumb={status === 'resent' ? '재발송 완료 · RESENT' : '이메일 인증 · VERIFY'}
      crumbColor={status === 'resent' ? '#00AA41' : '#002D72'}
    >
      <div className="flex flex-col gap-5">

        {/* 아이콘 */}
        <div className="flex justify-center">
          {status === 'resent'
            ? <CheckCircle2 size={44} style={{ color: '#00AA41' }} />
            : status === 'error'
              ? <AlertTriangle size={44} style={{ color: '#E5484D' }} />
              : <Mail size={44} className="text-heritage-500" />}
        </div>

        {/* 제목 */}
        <div className="text-center">
          <h1 className="font-kr font-semibold text-[20px] text-ink tracking-[-0.018em]">
            {status === 'resent' ? '인증 이메일을 다시 보냈습니다.'
             : status === 'error' ? '재발송에 실패했습니다.'
             : '이메일을 확인해주세요.'}
          </h1>
          {email && (
            <p className="font-en text-[13px] text-[rgba(10,10,11,0.5)] mt-1">{email}</p>
          )}
        </div>

        {/* 안내 단계 */}
        {status !== 'error' && (
          <div className="flex flex-col gap-3">
            {[
              '받은편지함에서 krk.team 발송 이메일을 확인하세요.',
              '이메일 내 인증 링크를 클릭하세요.',
              '인증 완료 후 로그인이 가능합니다.',
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="font-en text-[11px] font-bold text-heritage-500 flex-shrink-0 mt-0.5 tabular-nums">
                  0{i + 1}
                </span>
                <p className="font-kr text-[13px] text-[rgba(10,10,11,0.65)] leading-[1.55]">{text}</p>
              </div>
            ))}
          </div>
        )}

        {/* 재발송 버튼 */}
        {email && status !== 'error' && (
          <button
            onClick={handleResend}
            disabled={loading || countdown > 0}
            className="font-kr text-[13px] text-center underline transition-colors"
            style={{ color: countdown > 0 ? 'rgba(10,10,11,0.35)' : '#002D72', cursor: countdown > 0 ? 'not-allowed' : 'pointer' }}
          >
            {loading ? '재발송 중...'
              : countdown > 0 ? `재발송 (${countdown}초 후 가능)`
              : '인증 이메일 다시 받기'}
          </button>
        )}

        <div className="border-t border-[rgba(10,10,11,0.08)] pt-4">
          <Link to="/login" className="font-kr text-[13px] text-[rgba(10,10,11,0.5)] hover:text-ink underline flex justify-center">
            로그인 화면으로 돌아가기
          </Link>
        </div>
      </div>
    </AuthShell>
  )
}
