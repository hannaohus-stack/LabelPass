import { lazy, Suspense } from 'react'
import type React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { useAuth } from './lib/useAuth'

const Landing = lazy(() => import('./pages/Landing'))
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
const Privacy = lazy(() => import('./pages/Privacy'))
const Terms = lazy(() => import('./pages/Terms'))
const Pricing = lazy(() => import('./pages/seo/Pricing'))
const GuideLabelPage = lazy(() => import('./pages/seo/GuideLabel'))
const GuideRejection = lazy(() => import('./pages/seo/GuideRejection'))
const FAQ = lazy(() => import('./pages/seo/FAQ'))
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
        <Route path="/" element={<Landing />} />

        {/* 법적 페이지 (공개) */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms"   element={<Terms />} />

        {/* SEO 공개 페이지 */}
        <Route path="/pricing"          element={<Pricing />} />
        <Route path="/guide/label"      element={<GuideLabelPage />} />
        <Route path="/guide/rejection"  element={<GuideRejection />} />
        <Route path="/faq"              element={<FAQ />} />

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
    </HelmetProvider>
  )
}
