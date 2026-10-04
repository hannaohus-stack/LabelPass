import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

/**
 * 현재 Supabase 세션 반환.
 * - loading: true → 세션 확인 중
 * - session: null  → 미인증
 * - session: Session → 인증됨
 */
export function useAuth() {
  const [session, setSession]   = useState<Session | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    // onAuthStateChange가 INITIAL_SESSION 이벤트로 첫 발화할 때 loading 해제.
    // getSession()을 먼저 쓰면 OAuth hash 파싱 전에 null을 반환해
    // ProtectedRoute가 /login으로 튕기는 race condition이 발생함.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { session, loading }
}
