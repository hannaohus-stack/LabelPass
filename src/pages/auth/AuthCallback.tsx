/**
 * OAuth 콜백 처리 페이지
 * Supabase PKCE 코드 교환 완료 후 /dashboard 또는 /login으로 이동
 */
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { takeRememberedNext } from '../../lib/next'

export default function AuthCallback() {
  const navigate  = useNavigate()
  const navigated = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (navigated.current) return
      if (session) {
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
