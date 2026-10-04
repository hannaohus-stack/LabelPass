import { lazy, Suspense } from 'react'
import type React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { useAuth } from './lib/useAuth'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const ReviewResult = lazy(() => import('./pages/ReviewResult'))
const LabelExport = lazy(() => import('./pages/LabelExport'))
const Creator = lazy(() => import('./pages/creator/Creator'))
const Payment = lazy(() => import('./pages/Payment'))
const PaymentComplete = lazy(() => import('./pages/PaymentComplete'))
const Login = lazy(() => import('./pages/auth/Login'))
const Signup = lazy(() => import('./pages/auth/Signup'))
const EmailVerify = lazy(() => import('./pages/auth/EmailVerify'))
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'))
const AuthCallback = lazy(() => import('./pages/auth/AuthCallback'))
const BetaApply = lazy(() => import('./pages/beta/BetaApply'))
const BetaNps = lazy(() => import('./pages/beta/BetaNps'))

// ─── ProtectedRoute ────────────────────────────────────────────────────────────
const DEV_BYPASS = false

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (DEV_BYPASS) return <>{children}</>

  // 세션 확인 중 — 빈 화면 (flash 방지)
  if (loading) return null

  // 미인증 → 로그인
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}


// ─── 정적 마케팅 페이지로 이동 ────────────────────────────────────────────────
// / · /service · /pricing · /contact 는 public/ 의 정적 HTML (vercel.json rewrites).
// 앱 안에서 이 주소로 이동하면 전체 새로고침으로 정적 페이지를 불러온다.
function HardNav({ to }: { to: string }) {
  if (import.meta.env.DEV) {
    return <div style={{ padding: 40 }}>개발 모드: 정적 페이지 <a href={to}>{to}</a> 는 vercel 배포에서 확인하세요.</div>
  }
  window.location.replace(to)
  return null
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <Suspense fallback={null}>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login"            element={<Login />} />
        <Route path="/signup"           element={<Signup />} />
        <Route path="/verify-email"     element={<EmailVerify />} />
        <Route path="/forgot-password"  element={<ForgotPassword />} />
        <Route path="/reset-password"   element={<ResetPassword />} />
        <Route path="/auth/callback"    element={<AuthCallback />} />

        {/* 랜딩 (공개) */}
        <Route path="/" element={<HardNav to="/" />} />

        {/* 법적 페이지 (공개) */}
        <Route path="/privacy" element={<HardNav to="/#privacy" />} />
        <Route path="/terms"   element={<HardNav to="/#terms" />} />
        <Route path="/refund"  element={<HardNav to="/#refund" />} />

        {/* SEO 공개 페이지 */}
        <Route path="/pricing"          element={<HardNav to="/pricing" />} />
        <Route path="/service"          element={<HardNav to="/service" />} />
        <Route path="/contact"          element={<HardNav to="/contact" />} />
        <Route path="/blog/*"           element={<HardNav to={window.location.pathname} />} />
        <Route path="/guide/label"      element={<HardNav to="/blog/category/guide" />} />
        <Route path="/guide/rejection"  element={<HardNav to="/blog" />} />
        <Route path="/faq"              element={<HardNav to="/pricing#faq" />} />

        {/* 베타 이벤트 (공개, 비로그인 제출 가능) */}
        <Route path="/beta"     element={<BetaApply />} />
        <Route path="/beta/nps" element={<BetaNps />} />

        {/* 보호된 라우트 */}
        <Route path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/creator"
          element={<ProtectedRoute><Creator /></ProtectedRoute>} />
        <Route path="/review"
          element={<ProtectedRoute><ReviewResult /></ProtectedRoute>} />
        <Route path="/export"
          element={<ProtectedRoute><LabelExport /></ProtectedRoute>} />
        <Route path="/payment"
          element={<ProtectedRoute><Payment /></ProtectedRoute>} />
        <Route path="/payment/complete"
          element={<ProtectedRoute><PaymentComplete /></ProtectedRoute>} />
        {/* Toss 결제 실패 redirect URL */}
        <Route path="/payment/fail"
          element={<ProtectedRoute><PaymentComplete /></ProtectedRoute>} />

        {/* 404 → 홈 */}
        <Route path="*" element={<HardNav to="/" />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </HelmetProvider>
  )
}
