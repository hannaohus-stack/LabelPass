/**
 * OAuth 콜백 처리 페이지
 * Supabase PKCE 코드 교환 완료 후 /dashboard 또는 /login으로 이동
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { takeRememberedNext } from '../../lib/next'
import { trackCompleteRegistration } from '../../lib/analytics'

export default function AuthCallback() {
  const navigate  = useNavigate()
  const navigated = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (navigated.current) return
      if (session) {
        // 신규 가입(카카오·이메일 인증)만 CompleteRegistration — 재로그인 제외.
        // 가입 직후(생성 10분 이내)인 사용자만, 사용자당 1회. 이메일 가입은 Signup.tsx에서 이미 1회 처리됨(중복 방지됨).
        const createdAt = session.user?.created_at ? new Date(session.user.created_at).getTime() : 0
        if (createdAt && Date.now() - createdAt < 10 * 60 * 1000) {
          trackCompleteRegistration(session.user.id)
        }
        // 세션 확인 즉시 돌아갈 곳(없으면 마이페이지)으로
        navigated.current = true
        navigate(takeRememberedNext() ?? '/dashboard', { replace: true })
      }
      // session 없으면 기다림 — PKCE 코드 교환 완료 후 SIGNED_IN 발화 대기
    })

    // 10초 fallback: 코드 교환 실패 시 로그인으로
    const timeout = setTimeout(() => {
      if (!navigated.current) {
        navigated.current = true
        navigate('/login', { replace: true })
      }
    }, 10000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div className="lp" style={{ display: 'grid', placeItems: 'center', color: 'var(--blue)' }}>
      <span className="lp-spin" style={{ width: 28, height: 28 }} aria-label="로그인 처리 중" />
    </div>
  )
}
