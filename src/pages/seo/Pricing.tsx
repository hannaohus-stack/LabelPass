import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const OG_IMAGE = 'https://checker.krk.team/og/pricing.png'
const CANONICAL = 'https://checker.krk.team/pricing'

export default function Pricing() {
  return (
    <>
      <Helmet>
        <title>요금제 | 기본 9,900원·전문 19,900원 | KRK Checker</title>
        <meta name="description" content="기본 9,900원(PDF+PNG+텍스트), 전문 19,900원(리포트+분리배출마크+정부24 가이드)." />
        <link rel="canonical" href={CANONICAL} />
        {/* Open Graph */}
        <meta property="og:type"         content="website" />
        <meta property="og:url"          content={CANONICAL} />
        <meta property="og:title"        content="요금제 | 기본 9,900원·전문 19,900원 | KRK Checker" />
        <meta property="og:description"  content="기본 9,900원(PDF+PNG+텍스트), 전문 19,900원(리포트+분리배출마크+정부24 가이드)." />
        <meta property="og:image"        content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale"       content="ko_KR" />
        <meta property="og:site_name"    content="KRK Checker" />
        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="요금제 | 기본 9,900원·전문 19,900원 | KRK Checker" />
        <meta name="twitter:description" content="기본 9,900원(PDF+PNG+텍스트), 전문 19,900원(리포트+분리배출마크+정부24 가이드)." />
        <meta name="twitter:image"       content={OG_IMAGE} />
      </Helmet>

      {/* TODO: 요금제 페이지 콘텐츠 (Sprint 이후 구현) */}
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>요금제</h1>
        <p style={{ color: '#666' }}>콘텐츠 준비 중입니다.</p>
        <Link to="/" style={{ marginTop: '2rem', color: '#002D72' }}>← 홈으로</Link>
      </main>
    </>
  )
}
