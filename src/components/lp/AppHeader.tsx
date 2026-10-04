/**
 * AppHeader — 라벨패스 앱 공통 헤더 (시안 app_*_v1.0)
 * - flow: 검사 진행 화면 (① 입력 ② 검토 결과 ③ 결제 ④ 결과)
 * - account: 마이페이지 (내 검사 · 결제 내역 · 계정 설정)
 */
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/useAuth'
import { supabase } from '../../lib/supabase'

const FLOW = ['입력', '검토 결과', '결제', '결과']

type Props =
  | { mode: 'flow'; current: 1 | 2 | 3 | 4 }
  | { mode: 'account'; active?: 'jobs' | 'payments' | 'settings' }

export default function AppHeader(props: Props) {
  const { session } = useAuth()
  const navigate = useNavigate()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <header className="lp-ah">
      <div className="lp-ah-in">
        <a className="lp-ah-logo" href="/" aria-label="라벨패스 홈">
          <img src="/site/LabelPass_Logo_Primary_Blue_v1.0.svg" alt="LabelPass 라벨패스" />
        </a>

        {props.mode === 'flow' ? (
          <nav className="lp-flow" aria-label="진행 단계">
            <ol>
              {FLOW.map((label, i) => {
                const n = i + 1
                const state = n < props.current ? 'done' : n === props.current ? 'cur' : ''
                return (
                  <li key={label} className={state} aria-current={state === 'cur' ? 'step' : undefined}>
                    <span className="n">{state === 'done' ? '✓' : n}</span>
                    <span className="t">{label}</span>
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : (
          <nav className="lp-ah-nav" aria-label="계정 메뉴">
            <Link to="/dashboard" className={props.active !== 'payments' && props.active !== 'settings' ? 'on' : ''}
              aria-current={props.active !== 'payments' && props.active !== 'settings' ? 'page' : undefined}>내 검사</Link>
            <Link to="/dashboard#payments" className={props.active === 'payments' ? 'on' : ''}>결제 내역</Link>
            <Link to="/dashboard#account" className={props.active === 'settings' ? 'on' : ''}>계정 설정</Link>
          </nav>
        )}

        <div className="lp-ah-util">
          {session ? (
            <>
              {props.mode === 'flow' && <Link to="/dashboard" className="lp-hide-m">마이페이지</Link>}
              <button type="button" onClick={logout} className={props.mode === 'account' ? 'lp-hide-m' : ''}>로그아웃</button>
              {props.mode === 'account' && (
                <Link to="/creator" className="lp-btn lp-btn-blue lp-btn-sm">+ 새 검사</Link>
              )}
            </>
          ) : (
            <Link to="/login">로그인</Link>
          )}
        </div>
      </div>
    </header>
  )
}
