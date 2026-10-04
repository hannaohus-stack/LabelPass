import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const OG_IMAGE = 'https://checker.krk.team/og/guide-label.png'
const CANONICAL = 'https://checker.krk.team/guide/label'

export default function GuideLabel() {
  return (
    <>
      <Helmet>
        <title>식품 라벨 작성 가이드 2026 | KRK Checker</title>
        <meta name="description" content="잼·장류·소스 1인 제조사 라벨 작성 가이드. 알레르기 22품목, 원재료명 순서, 영양성분 표시 규정." />
        <link rel="canonical" href={CANONICAL} />
        {/* Open Graph */}
        <meta property="og:type"         content="article" />
        <meta property="og:url"          content={CANONICAL} />
        <meta property="og:title"        content="식품 라벨 작성 가이드 2026 | KRK Checker" />
        <meta property="og:description"  content="잼·장류·소스 1인 제조사 라벨 작성 가이드. 알레르기 22품목, 원재료명 순서, 영양성분 표시 규정." />
        <meta property="og:image"        content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale"       content="ko_KR" />
        <meta property="og:site_name"    content="KRK Checker" />
        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="식품 라벨 작성 가이드 2026 | KRK Checker" />
        <meta name="twitter:description" content="잼·장류·소스 1인 제조사 라벨 작성 가이드. 알레르기 22품목, 원재료명 순서, 영양성분 표시 규정." />
        <meta name="twitter:image"       content={OG_IMAGE} />
      </Helmet>

      {/* TODO: 가이드 페이지 콘텐츠 (Sprint 이후 구현) */}
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>식품 라벨 작성 가이드 2026</h1>
        <p style={{ color: '#666' }}>콘텐츠 준비 중입니다.</p>
        <Link to="/" style={{ marginTop: '2rem', color: '#002D72' }}>← 홈으로</Link>
      </main>
    </>
  )
}
