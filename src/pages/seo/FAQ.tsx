import { Helmet } from 'react-helmet-async'
import { Link } from 'react-router-dom'

const OG_IMAGE = 'https://checker.krk.team/og/faq.png'
const CANONICAL = 'https://checker.krk.team/faq'

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: '식품제조가공업과 즉석판매제조가공업 차이가 뭔가요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '식품제조가공업은 도매·위탁·마켓컬리 입점이 가능하지만, 즉석판매제조가공업은 본인 직접 판매만 가능합니다.',
      },
    },
    {
      '@type': 'Question',
      name: '라벨 검토 결과는 어떻게 나오나요?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: '16개 항목의 신호등(통과/주의/위반) 결과와 함께 위반 시 수정 방법, 과태료 정보를 제공합니다.',
      },
    },
  ],
}

export default function FAQ() {
  return (
    <>
      <Helmet>
        <title>자주 묻는 질문 | KRK Checker</title>
        <meta name="description" content="라벨 검토·신고·환불 FAQ. 식품제조가공업과 즉석판매제조가공업 차이 안내." />
        <link rel="canonical" href={CANONICAL} />
        {/* Open Graph */}
        <meta property="og:type"         content="website" />
        <meta property="og:url"          content={CANONICAL} />
        <meta property="og:title"        content="자주 묻는 질문 | KRK Checker" />
        <meta property="og:description"  content="라벨 검토·신고·환불 FAQ. 식품제조가공업과 즉석판매제조가공업 차이 안내." />
        <meta property="og:image"        content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale"       content="ko_KR" />
        <meta property="og:site_name"    content="KRK Checker" />
        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="자주 묻는 질문 | KRK Checker" />
        <meta name="twitter:description" content="라벨 검토·신고·환불 FAQ. 식품제조가공업과 즉석판매제조가공업 차이 안내." />
        <meta name="twitter:image"       content={OG_IMAGE} />
        {/* Schema.org: FAQPage */}
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      {/* TODO: FAQ 페이지 콘텐츠 (Sprint 이후 구현) */}
      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>자주 묻는 질문</h1>
        <p style={{ color: '#666' }}>콘텐츠 준비 중입니다.</p>
        <Link to="/" style={{ marginTop: '2rem', color: '#002D72' }}>← 홈으로</Link>
      </main>
    </>
  )
}
