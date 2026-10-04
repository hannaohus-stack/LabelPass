/**
 * 인증 페이지 공통 컴포넌트
 * - AuthField: 라벨 + 인풋 + 에러 메시지
 * - KakaoBtn: 카카오 로그인 버튼 (UI only)
 * - AuthDivider: OR 구분선
 */
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'

// ─── 인풋 필드 ─────────────────────────────────────────────────────────────────

interface FieldProps {
  label: string
  type?: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  error?: string
  autoComplete?: string
  disabled?: boolean
}

export function AuthField({
  label, type = 'text', placeholder, value, onChange, error, autoComplete, disabled,
}: FieldProps) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType  = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-kr text-[13px] font-medium text-ink">{label}</label>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          className="w-full h-[46px] px-[14px] bg-white font-kr text-[14px] text-ink outline-none transition-all
            border"
          style={{
            borderColor: error ? '#E5484D' : 'rgba(10,10,11,0.14)',
            borderWidth: error ? '1.5px' : '1px',
          }}
          onFocus={e => {
            if (!error) e.currentTarget.style.borderColor = '#0CA4F9'
            if (!error) e.currentTarget.style.borderWidth = '1.5px'
          }}
          onBlur={e => {
            if (!error) e.currentTarget.style.borderColor = 'rgba(10,10,11,0.14)'
            if (!error) e.currentTarget.style.borderWidth = '1px'
          }}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[rgba(10,10,11,0.4)] hover:text-ink transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1 font-kr text-[12px]" style={{ color: '#E5484D' }}>
          <AlertCircle size={12} className="flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── 제출 버튼 ─────────────────────────────────────────────────────────────────

export function AuthSubmitBtn({
  label,
  loading,
  disabled,
}: {
  label: string
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="submit"
      disabled={loading || disabled}
      className="w-full h-[46px] font-kr font-semibold text-[14px] text-white transition-colors
        flex items-center justify-center gap-2"
      style={{
        background: loading || disabled ? 'rgba(10,10,11,0.18)' : '#002D72',
        cursor: loading || disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {loading ? (
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {label}
    </button>
  )
}

// ─── 카카오 버튼 ───────────────────────────────────────────────────────────────

export function KakaoBtn() {
  const handleKakao = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Kakao OAuth error:', error)
      alert(error.message)
    }
  }

  return (
    <button
      type="button"
      onClick={handleKakao}
      className="w-full h-[46px] flex items-center justify-center gap-2 font-kr font-semibold text-[14px]
        transition-opacity hover:opacity-90"
      style={{ background: '#FEE500', color: '#000' }}
    >
      {/* 카카오 로고 SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path fillRule="evenodd" clipRule="evenodd"
          d="M9 0.9C4.473 0.9 0.9 3.716 0.9 7.2c0 2.27 1.497 4.266 3.77 5.393l-.963 3.6c-.085.315.297.566.567.366l4.338-2.912A10.2 10.2 0 009 13.5c4.527 0 8.1-2.816 8.1-6.3C17.1 3.716 13.527.9 9 .9z"
          fill="#000000"
          fillOpacity="0.85"
        />
      </svg>
      카카오로 시작하기
    </button>
  )
}

// ─── OR 구분선 ──────────────────────────────────────────────────────────────────

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[rgba(10,10,11,0.1)]" />
      <span className="font-en text-[11px] font-medium text-[rgba(10,10,11,0.35)] tracking-[0.08em]">OR</span>
      <div className="flex-1 h-px bg-[rgba(10,10,11,0.1)]" />
    </div>
  )
}

// ─── 전체 오류 배너 ─────────────────────────────────────────────────────────────

export function AuthErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 border" style={{ background: 'rgba(229,72,77,0.06)', borderColor: '#E5484D' }}>
      <AlertCircle size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#E5484D' }} />
      <p className="font-kr text-[12px] leading-[1.55]" style={{ color: '#B30000' }}>{msg}</p>
    </div>
  )
}
