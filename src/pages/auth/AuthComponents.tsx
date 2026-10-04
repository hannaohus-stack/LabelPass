/**
 * 인증 화면 공통 컴포넌트 (시안 app_auth_v1.0)
 */
import type React from 'react'
import { useState, useId } from 'react'
import { supabase } from '../../lib/supabase'
import { rememberNext } from '../../lib/next'

// ─── 제목 ──────────────────────────────────────────────────────────────────────
export function AuthTitle({ kicker, title, sub }: { kicker: string; title: string; sub?: string }) {
  return (
    <>
      <div className="lp-kicker">{kicker}</div>
      <h1 className="lp-h1">{title}</h1>
      {sub && <p className="lp-sub">{sub}</p>}
    </>
  )
}

// ─── 결과 보기 전 로그인 안내 ───────────────────────────────────────────────────
export function GateBanner() {
  return (
    <div className="lp-gate" role="status">
      <div className="ic"><svg viewBox="0 0 24 24"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg></div>
      <div><b>입력 완료 · 검토 결과가 준비됐어요</b><span>로그인하면 바로 결과를 볼 수 있어요. 입력한 내용은 그대로 이어집니다.</span></div>
    </div>
  )
}

// ─── 인풋 필드 ─────────────────────────────────────────────────────────────────
interface FieldProps {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete?: string
  disabled?: boolean
}

export function AuthField({ label, type = 'text', placeholder, value, onChange, error, hint, autoComplete, disabled }: FieldProps) {
  const [showPw, setShowPw] = useState(false)
  const id = useId()
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="lp-fl">
      <label className="lp-lb" htmlFor={id}>{label}</label>
      <div className={isPassword ? 'lp-pw' : undefined}>
        <input
          id={id}
          className={`lp-in${error ? ' bad' : ''}`}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-e` : undefined}
        />
        {isPassword && (
          <button type="button" className="lp-eye" onClick={() => setShowPw(p => !p)} aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
              {showPw && <path d="M4 4l16 16" />}
            </svg>
          </button>
        )}
      </div>
      {error ? <p className="lp-err" id={`${id}-e`}>{error}</p> : hint ? <p className="lp-help">{hint}</p> : null}
    </div>
  )
}

// ─── 제출 버튼 ─────────────────────────────────────────────────────────────────
export function AuthSubmitBtn({ label, loading, disabled }: { label: string; loading?: boolean; disabled?: boolean }) {
  return (
    <button type="submit" disabled={loading || disabled} className="lp-btn lp-btn-blue lp-btn-block" style={{ height: 54 }}>
      {loading && <span className="lp-spin" aria-hidden="true" />}
      {label}
    </button>
  )
}

// ─── 카카오 버튼 ───────────────────────────────────────────────────────────────
export function KakaoBtn({ next }: { next?: string | null }) {
  const handleKakao = async () => {
    rememberNext(next ?? null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      console.error('Kakao OAuth error:', error)
      alert(error.message)
    }
  }

  return (
    <button type="button" onClick={handleKakao} className="lp-btn lp-btn-kakao lp-btn-block" style={{ height: 54, marginTop: 32 }}>
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#191600" d="M12 4.5c-4.7 0-8.5 3-8.5 6.6 0 2.3 1.5 4.3 3.8 5.5l-.8 3.2 3.6-2.3c.6.1 1.2.2 1.9.2 4.7 0 8.5-3 8.5-6.6S16.7 4.5 12 4.5z" /></svg>
      카카오로 3초 만에 시작하기
    </button>
  )
}

// ─── 구분선 ────────────────────────────────────────────────────────────────────
export function AuthDivider({ text = '또는 이메일로 로그인' }: { text?: string }) {
  return <div className="lp-or">{text}</div>
}

// ─── 전체 오류 배너 ─────────────────────────────────────────────────────────────
export function AuthErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null
  return <div className="lp-alert" role="alert"><span aria-hidden="true">!</span><span>{msg}</span></div>
}

// ─── 상태 안내 패널 (인증 메일 · 재설정 완료 등) ─────────────────────────────────
type Tone = 'blue' | 'green' | 'amber' | 'red'
const TONE: Record<Tone, [string, string]> = {
  blue: ['var(--blue-50)', 'var(--blue)'], green: ['var(--green-50)', 'var(--green)'],
  amber: ['var(--amber-50)', 'var(--amber)'], red: ['var(--red-50)', 'var(--red)'],
}
const ICON: Record<string, string> = {
  mail: 'M4 6h16v12H4z M4 7l8 6 8-6',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  alert: 'M12 8v5 M12 16.5v.5 M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
}
export function AuthStatus({ tone, icon, kicker, title, sub, steps, children }: {
  tone: Tone; icon: 'mail' | 'check' | 'alert'; kicker: string; title: string; sub?: string; steps?: string[]; children?: React.ReactNode
}) {
  const [bg, fg] = TONE[tone]
  return (
    <div>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: bg, display: 'grid', placeItems: 'center', marginBottom: 20 }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          {ICON[icon].split(' M').map((d, i) => <path key={i} d={i ? 'M' + d : d} />)}
        </svg>
      </div>
      <AuthTitle kicker={kicker} title={title} sub={sub} />
      {steps && (
        <ol style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 10 }}>
          {steps.map((t, i) => (
            <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--soft)', borderRadius: 12, padding: '12px 14px', fontSize: 15, color: 'var(--ink-2)' }}>
              <b style={{ color: 'var(--blue)', fontSize: 13, marginTop: 2 }}>{i + 1}</b>{t}
            </li>
          ))}
        </ol>
      )}
      <div style={{ marginTop: 24, display: 'grid', gap: 10 }}>{children}</div>
    </div>
  )
}
