import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useAuth } from '../lib/useAuth'

const OG_IMAGE  = 'https://checker.krk.team/og/default.png'
const CANONICAL = 'https://checker.krk.team/'

const softwareAppSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KRK Checker',
  alternateName: '케이알케이 체커',
  description: '1인 식품 제조사를 위한 식품 라벨 자동 검토 서비스. 16개 항목 신호등 검토.',
  url: 'https://checker.krk.team',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Any (Web-based)',
  inLanguage: 'ko-KR',
  offers: [
    { '@type': 'Offer', name: '기본', price: '9900', priceCurrency: 'KRW' },
    { '@type': 'Offer', name: '전문', price: '19900', priceCurrency: 'KRW' },
  ],
  provider: {
    '@type': 'Organization',
    name: '주식회사 맛차차',
    url: 'https://krk.team',
  },
}

// ─── Design Tokens ────────────────────────────────────────────────────────────
const HERITAGE = '#002D72'
const BREATH   = '#0CA4F9'
const INK      = '#0A0A0B'
const SOFT_INK = 'rgba(10,10,11,0.65)'
const FAINT    = 'rgba(10,10,11,0.55)'
const MUTED    = 'rgba(10,10,11,0.40)'
const HAIRLINE = 'rgba(10,10,11,0.12)'
const STUDIO   = '#FAFAFA'

const FONT_KR = "Pretendard, 'Pretendard Variable', system-ui, -apple-system, sans-serif"
const FONT_EN = 'Inter, system-ui, sans-serif'

// ─── Data ─────────────────────────────────────────────────────────────────────
const WHY_CARDS = [
  { num: '01', title: '원재료명 표기 누락',       desc: '표기 순서·함량 기준 미충족으로 반려' },
  { num: '02', title: '알레르기 표시 오류',        desc: '의무 표시 누락 시 즉각 행정처분 대상' },
  { num: '03', title: '영양성분 계산 혼선',        desc: '기준치 오류·단위 혼동으로 수정 반복' },
  { num: '04', title: '표시광고 문구 리스크',      desc: '효능·효과 암시 문구가 광고법 위반 유발' },
  { num: '05', title: '식품유형 분류 오류',        desc: '유형 잘못 선택 시 기준 자체가 달라짐' },
  { num: '06', title: '보관방법 기재 누락',        desc: '소비기한과 연동된 필수 기재 사항' },
  { num: '07', title: '제조원 정보 정리 부족',     desc: '주소·영업허가 번호 등 필수 항목 누락' },
  { num: '08', title: '디자인 전달용 구조 부재',   desc: '정리된 표시사항 없이 디자이너에게 전달' },
]

const HOW_STEPS = [
  { step: '01', title: '제품 기본 정보 입력',    desc: '제품명, 식품유형, 용량, 판매 방식 등 라벨 생성에 필요한 기본 정보를 정리합니다.' },
  { step: '02', title: '원재료·영양성분 입력',   desc: '원재료, 알레르기, 영양성분을 구조화해 표시사항 초안의 기반을 만듭니다.' },
  { step: '03', title: '자동 검토 리포트 확인',  desc: '누락, 주의, 확인 필요 항목을 리포트 형태로 확인합니다.' },
  { step: '04', title: '라벨 초안 내보내기',     desc: '내부 검토와 패키지 디자인 전달에 활용할 수 있도록 결과를 정리합니다.' },
]

const WHO_LIST = [
  { title: '첫 식품 제품 출시 브랜드',         desc: '라벨 구성 자체가 낯선 초기 브랜드' },
  { title: 'OEM / 소량 생산 팀',              desc: '제조사 전달 전 표시사항을 정리해야 하는 팀' },
  { title: '스마트스토어 판매자',              desc: '출시 전 기본 표시사항 확인이 필요한 판매자' },
  { title: '패키지 디자이너 협업 팀',          desc: '디자인에 들어갈 표시 정보를 명확히 전달해야 하는 브랜드' },
  { title: '브랜딩 스튜디오 / 컨설턴트',       desc: '식품 클라이언트의 출시 준비를 구조화해야 하는 파트너' },
]

const REVIEWS = [
  { stars: 5, title: '출시 전 불안감이 사라졌어요',        quote: '잼 6종 라벨을 직접 만들 때 막막했는데, 표시 항목이 자동으로 정리돼서 한결 수월했어요.',                            brand: '쿡하우스',  author: '김**', meta: '잼류 · 식품제조가공업' },
  { stars: 5, title: '정부24 신고도 한 번에',             quote: '신고 입력 가이드 덕분에 헤매지 않고 처음에 바로 통과했습니다.',                                                    brand: '바이탈랩',  author: '박**', meta: '건강기능식품 · 즉판가공업' },
  { stars: 5, title: '알레르기 누락을 잡아줬어요',         quote: '뒷면 라벨까지 신경 쓸 줄 몰랐는데, 알레르기 표기 위치까지 짚어줘서 안심됐어요.',                                   brand: '유자공방',  author: '이**', meta: '소스류 · 식품제조가공업' },
  { stars: 5, title: '디자이너한테 바로 넘길 수 있었어요', quote: '표시사항이 정리된 PDF로 나오니까 디자이너한테 설명 없이 바로 전달할 수 있었어요.',                                  brand: '모모베이크', author: '최**', meta: '베이커리 · 즉판가공업' },
  { stars: 5, title: '처음 출시인데 혼자 끝냈습니다',      quote: '라벨 규정을 몰라서 걱정했는데, 입력하다 보니 어떤 항목이 왜 필요한지 자연스럽게 이해됐어요.',                       brand: '한모금',    author: '장**', meta: '음료류 · 식품제조가공업' },
  { stars: 5, title: '원재료 순서 문제를 몰랐는데',        quote: '원재료 함량 순 정렬이 자동으로 되는 게 정말 편했어요. 직접 했으면 분명 틀렸을 것 같아요.',                         brand: '소담장',    author: '오**', meta: '장류 · 식품제조가공업' },
]


// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
  @keyframes floatIn {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes floatBob {
    0%, 100% { transform: translateY(-50%); }
    50%       { transform: translateY(calc(-50% - 12px)); }
  }

  @keyframes floatBobSmall {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }

  @keyframes floatBtn {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-7px); }
  }
  .krk-studio-btn-float {
    animation: floatBtn 2.8s ease-in-out infinite;
  }

  /* Pro card animated border */
  @keyframes rotateBorder {
    0%   { background-position: 0% 50%; }
    50%  { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }
  .krk-pro-card {
    background:
      linear-gradient(#fff, #fff) padding-box,
      linear-gradient(270deg, #002D72, #0CA4F9, #7DD3FC, #0CA4F9, #002D72) border-box;
    background-size: 300% 300%;
    border: 2px solid transparent;
    animation: rotateBorder 4s ease infinite;
  }

  /* Section scroll reveal */
  .krk-sec-observe {
    opacity: 0;
    transform: translateY(36px);
    transition: opacity 0.7s cubic-bezier(0.25,0.46,0.45,0.94),
                transform 0.7s cubic-bezier(0.25,0.46,0.45,0.94);
  }
  .krk-sec-observe.is-visible {
    opacity: 1;
    transform: translateY(0);
  }

  @keyframes shimmer {
    0%   { transform: translateX(-120%) skewX(-20deg); }
    100% { transform: translateX(320%)  skewX(-20deg); }
  }
  .krk-cta-shimmer {
    position: relative;
    overflow: hidden;
  }
  .krk-cta-shimmer::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 35%; height: 100%;
    background: linear-gradient(
      to right,
      rgba(255,255,255,0)    0%,
      rgba(255,255,255,0.22) 50%,
      rgba(255,255,255,0)    100%
    );
    animation: shimmer 2.6s ease-in-out infinite;
    animation-delay: 0.8s;
    pointer-events: none;
  }

  .krk-result-card-float {
    animation: floatBob 2.6s ease-in-out infinite;
  }
  .krk-result-card-mobile {
    animation: floatBobSmall 2.6s ease-in-out infinite;
  }
  .krk-hero-desktop { display: block; }
  .krk-hero-mobile  { display: none; }

  .krk-top-banner {
    position: fixed;
    top: 16px; left: 0; right: 0; margin: 0 auto;
    z-index: 200;
    width: calc(100% - 40px); max-width: 800px;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 9999px;
    padding: 10px 10px 10px 22px;
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    color: #1A1A1A; font-size: 13px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.08);
    animation: floatIn 0.8s 0.1s ease-out both;
  }

  .krk-hero-bubble {
    position: absolute;
    z-index: 20;
    background: #fff;
    border: 1px solid rgba(0,0,0,0.08);
    border-radius: 18px;
    padding: 14px 16px;
    color: #1A1A1A; font-size: 14px; font-weight: 500;
    display: inline-flex; align-items: center; gap: 10px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.1);
    animation: floatIn 0.8s ease-out both;
  }

  .krk-cat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 14px;
  }
  .krk-how-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-top: 60px;
  }
  .krk-who-list {
    display: grid;
    gap: 0;
    margin-top: 60px;
  }

  .krk-price-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 60px;
  }
  .krk-review-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
    margin-top: 40px;
  }
  .krk-studio-bg-desktop {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; height: 100%; object-fit: cover; z-index: 0;
  }
  .krk-studio-bg-mobile {
    display: none;
  }
  .krk-studio-content {
    position: absolute; inset: 0; z-index: 2;
    display: flex; flex-direction: column;
    align-items: center; justify-content: space-between;
    padding: 60px 40px;
    text-align: center;
  }
  .krk-cta-strip {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .krk-studio-bottom {
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .krk-footer-inner {
    max-width: 1240px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; flex-wrap: wrap;
  }
  .krk-footer-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 40px;
    padding-bottom: 48px;
  }

  .krk-sec    { padding: 120px 40px; }
  .krk-sec-sm { padding: 40px; }

  .krk-banner-cta-mobile { display: none; }

  @media (max-width: 860px) {
    .krk-top-banner { top: 12px; width: calc(100% - 24px); max-width: calc(100% - 24px); font-size: 11.5px; padding: 10px 14px; gap: 8px; }
    .krk-hero-bubble { display: none; }
    .krk-hero-desktop { display: none; }
    .krk-hero-mobile  { display: flex; }
    .krk-banner-desc  { display: none; }
    .krk-banner-cta-desktop { display: none !important; }
    .krk-banner-cta-mobile  { display: flex !important; }
    .krk-cat-grid { grid-template-columns: repeat(2, 1fr); }
    .krk-how-grid { grid-template-columns: 1fr; }
    .krk-price-grid { grid-template-columns: 1fr; }
    .krk-review-grid { grid-template-columns: 1fr; }
    .krk-studio-bg-desktop { display: block; }
    .krk-studio-bg-mobile { display: none; }
    .krk-studio-content { position: absolute; padding: 40px 20px; }
    .krk-sec { padding: 60px 20px; }
    .krk-sec-sm { padding: 28px 20px; }
    .krk-footer-inner { flex-direction: column; align-items: flex-start; }
    .krk-footer-grid { grid-template-columns: 1fr 1fr; gap: 28px; }
  }
`

// ─── Components ───────────────────────────────────────────────────────────────

function TopBanner({ onBetaCTA }: { onBetaCTA: () => void }) {
  const btnStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: INK, border: 'none',
    borderRadius: 9999, padding: '8px 18px',
    fontSize: 12, fontWeight: 500, color: '#fff',
    cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: FONT_KR,
  }
  return (
    <div className="krk-top-banner">
      {/* Brand logo */}
      <img src="/krk-checker-logo.png" alt="KRK Checker" style={{ height: 16, flexShrink: 0, marginRight: 8 }} />
      {/* Spacer */}
      <div style={{ flex: 1 }} />
      {/* Desktop: 멘트 + 베타 버튼 */}
      <div className="krk-banner-cta-desktop" style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <span className="krk-banner-desc" style={{ color: SOFT_INK, fontWeight: 500, letterSpacing: '-0.005em', whiteSpace: 'nowrap' }}>
          식약처 기준으로 라벨 생성이 필요하신가요?
        </span>
        <button type="button" onClick={onBetaCTA} style={btnStyle}>
          🍋 20명 한정 무료 베타 신청
        </button>
      </div>
      {/* Mobile CTA — 베타 신청 */}
      <div className="krk-banner-cta-mobile" style={{ alignItems: 'center', flexShrink: 0 }}>
        <button type="button" onClick={onBetaCTA} style={btnStyle}>
          🍋 20명 한정 무료 베타 신청
        </button>
      </div>
    </div>
  )
}

function HeroSection({ onCTA }: { onCTA: () => void }) {
  return (
    <>
    {/* ── Desktop Hero ─────────────────────────────────────────────── */}
    <section className="krk-hero-desktop" style={{ position: 'relative', minHeight: '100svh', overflow: 'hidden', background: '#F5F4EE' }}>

      {/* Background image */}
      <img src="/krk-hero-bg.png" alt="" aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', objectFit: 'cover', zIndex: 0,
      }} />

      {/* CTA 버튼 — 중앙, 화면 50% 지점 (모바일: krk-hero-cta-block으로 상단 재배치) */}
      <div className="krk-hero-cta-block" style={{
        position: 'absolute', zIndex: 10,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
      }}>
        <button
          type="button"
          onClick={onCTA}
          className="krk-cta-shimmer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: INK,
            color: '#fff', padding: '8px 12px 8px 32px',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            border: 'none',
            cursor: 'pointer', fontFamily: FONT_KR,
          }}
        >
          KRK 시작하기
          <span style={{
            width: 34, height: 34,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 9,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>

      {/* 검토 결과 카드 — 오른쪽 44%, 둥둥 float */}
      <div className="krk-result-card-float" style={{
        position: 'absolute', zIndex: 10,
        top: '44%', right: '5%',
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 18,
        padding: '18px 20px',
        width: 260,
        display: 'flex', flexDirection: 'column',
        gap: 14,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTED, fontFamily: FONT_EN }}>
          검토 결과
        </div>
        <div style={{ display: 'flex', gap: 16, width: '100%' }}>
          {[
            { icon: '✅', label: '통과', count: 14, color: '#16a34a' },
            { icon: '⚠️', label: '주의', count: 1,  color: '#d97706' },
            { icon: '❌', label: '위반', count: 1,  color: '#dc2626' },
          ].map(item => (
            <div key={item.label} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 2 }}>{item.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: item.color, fontFamily: FONT_EN }}>{item.count}</div>
              <div style={{ fontSize: 11, color: MUTED, fontFamily: FONT_KR }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['알레르기 2종', '표시 누락'].map(badge => (
            <span key={badge} style={{
              fontSize: 11, color: '#b91c1c',
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)',
              borderRadius: 6, padding: '3px 8px', fontFamily: FONT_KR,
            }}>{badge}</span>
          ))}
        </div>
      </div>

      {/* 타이틀 + 서브 — 하단 중앙 */}
      <div style={{
        position: 'absolute', zIndex: 10,
        bottom: '6%', left: '50%',
        transform: 'translateX(-50%)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}>
        <h1 style={{
          fontSize: 'clamp(26px, 3.8vw, 42px)',
          fontWeight: 900, color: INK,
          lineHeight: 1.2, letterSpacing: '-0.03em',
          margin: '0 0 6px', wordBreak: 'keep-all',
        }}>
          라벨도, 브랜드의 일부니까
        </h1>
        <p style={{ fontSize: 14, color: SOFT_INK, margin: 0, fontWeight: 400, lineHeight: 1.5 }}>
          스몰 식품 브랜드를 위한 라벨 검토 시스템
        </p>
      </div>
    </section>

    {/* ── Mobile Hero ──────────────────────────────────────────────── */}
    <section className="krk-hero-mobile" style={{
      position: 'relative',
      minHeight: '100svh',
      overflow: 'hidden',
      background: '#F5F4EE',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '116px 28px 0',
      textAlign: 'center',
    }}>
      {/* 배경 이미지 */}
      <img src="/krk-hero-bg-mobile.png" alt="" aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', zIndex: 0,
      }} />
      {/* 오버레이 — 상단 타이틀/버튼 가독성 확보 */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1,
        background: 'linear-gradient(to bottom, rgba(245,244,238,0.72) 0%, rgba(245,244,238,0.55) 55%, rgba(245,244,238,0.10) 100%)',
      }} />

      {/* 콘텐츠 (상단 고정) */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>

        {/* 라벨 pill 배지 */}
        <div style={{
          display: 'inline-flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 9999,
          padding: '5px 14px',
          fontSize: 11, fontWeight: 600,
          color: HERITAGE,
          letterSpacing: '-0.01em',
          marginBottom: 14,
        }}>
          식약처 기준 · 라벨 자동 검토
        </div>

        {/* 타이틀 */}
        <h1 style={{
          fontSize: 30, fontWeight: 900, color: INK,
          lineHeight: 1.2, letterSpacing: '-0.03em',
          margin: '0 0 10px', wordBreak: 'keep-all',
        }}>
          라벨도,<br />브랜드의 일부니까
        </h1>

        {/* 서브타이틀 */}
        <p style={{ fontSize: 13, color: SOFT_INK, margin: '0 0 28px', fontWeight: 400, lineHeight: 1.5 }}>
          스몰 식품 브랜드를 위한 라벨 검토 시스템
        </p>

        {/* CTA 버튼 */}
        <button
          type="button"
          onClick={onCTA}
          className="krk-cta-shimmer"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: INK, color: '#fff',
            padding: '10px 12px 10px 20px',
            borderRadius: 14, fontSize: 15, fontWeight: 700,
            border: 'none', cursor: 'pointer', fontFamily: FONT_KR,
            width: 'auto',
          }}
        >
          KRK 시작하기
          <span style={{
            width: 30, height: 30,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 9,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

      </div>

      {/* 검토결과 카드 — 하단 absolute 고정 (애니메이션 wrapper 분리) */}
      <div style={{
        position: 'absolute', zIndex: 3,
        bottom: 36, left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 56px)', maxWidth: 300,
      }}>
        <div className="krk-result-card-mobile" style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 14,
          padding: '10px 14px',
          display: 'flex', flexDirection: 'column',
          gap: 7,
          boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        }}>
          {/* 통계 — 가로 1행 */}
          <div style={{ display: 'flex', gap: 0, width: '100%' }}>
            {[
              { icon: '✅', label: '통과', count: 14, color: '#16a34a' },
              { icon: '⚠️', label: '주의', count: 1,  color: '#d97706' },
              { icon: '❌', label: '위반', count: 1,  color: '#dc2626' },
            ].map((item, i) => (
              <div key={item.label} style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                borderRight: i < 2 ? `1px solid ${HAIRLINE}` : 'none',
                padding: '3px 0',
              }}>
                <span style={{ fontSize: 13 }}>{item.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: item.color, fontFamily: FONT_EN }}>{item.count}</span>
                <span style={{ fontSize: 10, color: MUTED, fontFamily: FONT_KR }}>{item.label}</span>
              </div>
            ))}
          </div>
          {/* 배지 */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['알레르기 2종', '표시 누락'].map(badge => (
              <span key={badge} style={{
                fontSize: 10, color: '#b91c1c',
                background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)',
                borderRadius: 5, padding: '2px 6px', fontFamily: FONT_KR,
              }}>{badge}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
    </>
  )
}

function WhyImportantSection() {
  return (
    <section className="krk-sec krk-sec-observe" style={{ background: '#F6F6F4' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 16 }}>
          중요한 이유
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, wordBreak: 'keep-all' }}>
          식품 라벨은 작게 보이지만,<br />출시 리스크는 작지 않습니다.
        </h2>
        <p style={{ margin: '0 0 60px', fontSize: 15, color: SOFT_INK, lineHeight: 1.65, wordBreak: 'keep-all', maxWidth: 640 }}>
          원재료명, 알레르기 표시, 영양성분, 소비기한, 보관방법, 표시광고 문구까지.<br />작은 누락 하나가 수정, 반려, 클레임, 신뢰 하락으로 이어질 수 있습니다.
        </p>
        <div className="krk-cat-grid">
          {WHY_CARDS.map((c) => (
            <div
              key={c.num}
              style={{ padding: '28px 24px', border: `1px solid ${HAIRLINE}`, borderRadius: 16, background: '#fff', transition: 'all 0.3s', cursor: 'default' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = BREATH; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 12px 32px rgba(12,164,249,0.08)' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = HAIRLINE; el.style.transform = 'none'; el.style.boxShadow = 'none' }}
            >
              <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', marginBottom: 10 }}>{c.num}</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.3, wordBreak: 'keep-all' }}>{c.title}</div>
              <div style={{ fontSize: 13, color: FAINT, lineHeight: 1.55, wordBreak: 'keep-all' }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorksSection() {
  return (
    <section className="krk-sec krk-sec-observe" style={{ background: '#F6F6F4' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 16 }}>
          작동 방식
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, wordBreak: 'keep-all' }}>
          입력부터 검토까지,<br />출시 전 확인 과정을 짧게.
        </h2>
        <div className="krk-how-grid">
          {HOW_STEPS.map((s) => (
            <div
              key={s.step}
              style={{ padding: '32px 28px', border: `1px solid ${HAIRLINE}`, borderRadius: 16, background: '#fff' }}
            >
              <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 16 }}>
                Step {s.step}
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 12, lineHeight: 1.3, wordBreak: 'keep-all' }}>{s.title}</div>
              <p style={{ margin: 0, fontSize: 14, color: SOFT_INK, lineHeight: 1.65, wordBreak: 'keep-all' }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhoIsItForSection() {
  return (
    <section className="krk-sec krk-sec-observe" style={{ background: '#F6F6F4' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 16 }}>
          사용 대상
        </div>
        <h2 style={{ margin: '0 0 16px', fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.2, wordBreak: 'keep-all' }}>
          처음 출시하는 브랜드부터,<br />빠르게 검토해야 하는 팀까지.
        </h2>
        <p style={{ margin: '0 0 0', fontSize: 15, color: SOFT_INK, lineHeight: 1.65, wordBreak: 'keep-all', maxWidth: 580 }}>
          라벨을 직접 만들기 어렵거나, 검토 비용과 시간을 줄이고 싶은 식품 브랜드에게 적합합니다.
        </p>
        <div className="krk-who-list">
          {WHO_LIST.map((w, i) => (
            <div
              key={w.title}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 24,
                padding: '28px 0',
                borderBottom: i < WHO_LIST.length - 1 ? `1px solid ${HAIRLINE}` : 'none',
                borderTop: i === 0 ? `1px solid ${HAIRLINE}` : 'none',
                marginTop: i === 0 ? 60 : 0,
              }}
            >
              <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: '0.1em', minWidth: 28, paddingTop: 3 }}>
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 6, wordBreak: 'keep-all' }}>{w.title}</div>
                <div style={{ fontSize: 14, color: FAINT, lineHeight: 1.55, wordBreak: 'keep-all' }}>{w.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function PricingSection({ onCTA }: { onCTA: () => void }) {
  const basic = ['라벨 PDF · 인쇄용', '라벨 PNG · 고해상도', '항목별 텍스트 복사', '기본 신호등 결과']
  const pro   = ['항목별 수정 방법 + 기준 출처', '과태료 · 행정처분 참고', '신고 입력 가이드 + 라벨 검토 리포트', '분리배출 마크 ZIP + 라벨 PDF/PNG']

  return (
    <section id="pricing" className="krk-sec krk-sec-observe" style={{ background: '#fff' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: MUTED, marginBottom: 16 }}>
          Pricing
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, wordBreak: 'keep-all' }}>
          필요한 만큼만,<br />한 번 결제하세요
        </h2>
        <div className="krk-price-grid">

          {/* Basic */}
          <div style={{ border: `1px solid ${HAIRLINE}`, borderRadius: 20, padding: '36px 32px', background: '#fff', position: 'relative' }}>
            <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: 14 }}>Basic Label Package</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>기본 라벨 패키지</div>
            <div style={{ marginTop: 20, color: HERITAGE, lineHeight: 1 }}>
              <span style={{ fontFamily: FONT_EN, fontSize: 52, fontWeight: 700, letterSpacing: '-0.025em' }}>9,900</span>
              <span style={{ marginLeft: 6, fontSize: 17, fontWeight: 500, color: FAINT }}>원</span>
            </div>
            <p style={{ margin: '18px 0 26px', fontSize: 14, color: SOFT_INK, lineHeight: 1.55 }}>라벨 PDF·PNG와 기본 검토 결과만 필요할 때</p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12, marginBottom: 28 }}>
              {basic.map(i => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: SOFT_INK, lineHeight: 1.5, alignItems: 'flex-start' }}>
                  <span style={{ color: BREATH, fontWeight: 700, flexShrink: 0 }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <button type="button" onClick={onCTA} style={{ width: '100%', height: 52, background: BREATH, color: '#fff', borderRadius: 10, fontSize: 14.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: FONT_KR }}>
              기본 패키지 받기
            </button>
          </div>

          {/* Pro */}
          <div className="krk-pro-card" style={{ borderRadius: 20, padding: '36px 32px', position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, right: 24, transform: 'translateY(-50%)', background: HERITAGE, color: '#fff', padding: '6px 14px', borderRadius: 4, fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              Recommended
            </div>
            <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 14 }}>Professional Guide</div>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>전문 수정 가이드</div>
            <div style={{ marginTop: 20, color: HERITAGE, lineHeight: 1 }}>
              <span style={{ fontFamily: FONT_EN, fontSize: 52, fontWeight: 700, letterSpacing: '-0.025em' }}>19,900</span>
              <span style={{ marginLeft: 6, fontSize: 17, fontWeight: 500, color: FAINT }}>원</span>
            </div>
            <p style={{ margin: '18px 0 26px', fontSize: 14, color: SOFT_INK, lineHeight: 1.55 }}>판매 전 보완 기준까지 확인해야 할 때</p>
            <ul style={{ listStyle: 'none', display: 'grid', gap: 12, marginBottom: 28 }}>
              {pro.map(i => (
                <li key={i} style={{ display: 'flex', gap: 10, fontSize: 14, color: SOFT_INK, lineHeight: 1.5, alignItems: 'flex-start' }}>
                  <span style={{ color: HERITAGE, fontWeight: 700, flexShrink: 0 }}>✓</span>{i}
                </li>
              ))}
            </ul>
            <button type="button" onClick={onCTA} style={{ width: '100%', height: 52, background: HERITAGE, color: '#fff', borderRadius: 10, fontSize: 14.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: FONT_KR }}>
              전문 가이드 받기
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}

function ReviewsSection({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="krk-sec krk-sec-observe" style={{ background: STUDIO }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div style={{ fontFamily: FONT_EN, fontSize: 11, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: HERITAGE, marginBottom: 16 }}>
          From Founders
        </div>
        <h2 style={{ margin: 0, fontSize: 'clamp(32px, 4.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15, wordBreak: 'keep-all' }}>
          스몰 식품 브랜드들이<br />이렇게 쓰고 있어요
        </h2>
        <div className="krk-review-grid">
          {REVIEWS.map((r) => (
            <div key={r.brand} style={{ padding: '24px 22px', border: `1px solid ${HAIRLINE}`, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 10, background: '#fff' }}>
              {/* 별점 */}
              <div style={{ color: '#F59E0B', fontSize: 13, letterSpacing: '0.15em' }}>
                {'★'.repeat(r.stars)}
              </div>
              {/* 제목 */}
              <div style={{ fontSize: 14.5, fontWeight: 700, color: INK, letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                {r.title}
              </div>
              {/* 본문 */}
              <div style={{ fontSize: 13.5, color: SOFT_INK, lineHeight: 1.65, wordBreak: 'keep-all', flex: 1 }}>
                {r.quote}
              </div>
              {/* 구분선 + 작성자 */}
              <div style={{ borderTop: `1px solid ${HAIRLINE}`, paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: INK }}>{r.brand} {r.author}</div>
                  <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{r.meta}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: HERITAGE, background: 'rgba(0,45,114,0.07)', borderRadius: 4, padding: '3px 8px', whiteSpace: 'nowrap', fontFamily: FONT_EN, letterSpacing: '0.04em' }}>
                  VERIFIED
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="krk-cta-strip" style={{ marginTop: 56, padding: '28px 32px', background: INK, color: '#fff', borderRadius: 16 }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em', marginBottom: 4 }}>라벨 정리를 지금 시작하세요</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>제품 정보 입력 → 라벨 미리보기 → 무료 검토 결과까지 3분</div>
          </div>
          <button type="button" onClick={onCTA} style={{ padding: '14px 24px', background: '#fff', color: INK, borderRadius: 6, fontSize: 13.5, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: FONT_KR }}>
            3분 만에 시작하기 →
          </button>
        </div>
      </div>
    </section>
  )
}

function StudioSection() {
  return (
    <section id="studio" className="krk-sec-observe" style={{ position: 'relative', overflow: 'hidden', minHeight: 520, background: '#F5F4EE' }}>
      {/* Desktop full-background image */}
      <img
        src="/krk-studio-bg.jpeg"
        alt=""
        aria-hidden="true"
        className="krk-studio-bg-desktop"
      />
      {/* Mobile top image */}
      <img
        src="/krk-studio-bg.jpeg"
        alt="KRK Studio 포트폴리오"
        className="krk-studio-bg-mobile"
      />
      {/* Content — top center label/title/sub/tags, bottom center button */}
      <div className="krk-studio-content">
        {/* 상단 중앙 */}
        <div>
          <div style={{
            fontFamily: FONT_EN, fontSize: 11, fontWeight: 700,
            letterSpacing: '0.22em', textTransform: 'uppercase',
            color: INK, marginBottom: 12,
          }}>KRK STUDIO</div>
          <h2 style={{
            margin: '0 0 12px',
            fontSize: 'clamp(26px, 3.5vw, 42px)',
            fontWeight: 700, letterSpacing: '-0.03em',
            lineHeight: 1.15, color: INK,
            whiteSpace: 'nowrap',
          }}>
            제품을 브랜드로 만드는 일
          </h2>
          <p style={{
            margin: '0 0 16px', fontSize: 15,
            color: SOFT_INK, lineHeight: 1.65,
          }}>
            식품 브랜딩 · 패키지 디자인 · 제품 사진. 출시 이후를 설계합니다.
          </p>
          {/* 태그 — 서브 텍스트 바로 아래 */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['브랜딩', '패키지', '사진'].map(tag => (
              <span key={tag} style={{
                fontSize: 11, color: SOFT_INK,
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 6, padding: '4px 10px',
                fontFamily: FONT_KR,
              }}>{tag}</span>
            ))}
          </div>
        </div>
        {/* 하단 중앙 — 버튼 */}
        <a
          href="https://krk.studio"
          target="_blank"
          rel="noopener noreferrer"
          className="krk-studio-btn-float"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 18px',
            borderRadius: 12,
            fontSize: 12, fontWeight: 600,
            color: INK, textDecoration: 'none',
            fontFamily: FONT_KR,
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid rgba(0,0,0,0.10)',
          }}
        >
          포트폴리오 보러가기 →
        </a>
      </div>
    </section>
  )
}

function LandingFooter() {
  const linkStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.50)', textDecoration: 'none', fontSize: 13, lineHeight: 1 }
  const colTitleStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 18, fontFamily: FONT_EN }
  return (
    <footer style={{ background: '#0F0F12' }}>

      {/* Section B — 링크 (왼쪽 20% 빈 공간, 오른쪽 80% 3단) */}
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 40px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 4fr', gap: 0 }}>
          <div /> {/* 왼쪽 20% 빈 공간 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            <div>
              <div style={colTitleStyle}>서비스</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="#pricing" style={linkStyle}>가격</a>
                <a href="/faq"     style={linkStyle}>FAQ</a>
                <a href="/guide"   style={linkStyle}>사용방법</a>
              </div>
            </div>
            <div>
              <div style={colTitleStyle}>법적고지</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="/terms"   style={linkStyle}>이용약관</a>
                <a href="/privacy" style={linkStyle}>개인정보처리방침</a>
              </div>
            </div>
            <div>
              <div style={colTitleStyle}>문의 · 채널</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="mailto:hello@krk.team"                        style={linkStyle}>hello@krk.team</a>
                <a href="https://krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>krk Studio</a>
                <a href="https://instagram.com/krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>인스타그램</a>
                <a href="https://blog.naver.com/krk" target="_blank" rel="noopener noreferrer" style={linkStyle}>블로그</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section D — 빅 로고 + 카피라이트 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 40px 0', marginTop: 40 }}>
        <img src="/krk-checker-logo-white.png" alt="KRK Checker" style={{ height: 52, opacity: 0.85 }} />
        <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.06em' }}>
          © 2026 KRK · All rights reserved
        </div>
      </div>

    </footer>
  )
}

// ─── Landing (default export) ─────────────────────────────────────────────────
export default function Landing() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const handleCTA     = () => navigate(session ? '/creator' : '/signup')
  const handleBetaCTA = () => navigate('/beta')

  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>('.krk-sec-observe')
    const io = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          io.unobserve(e.target)
        }
      }),
      { threshold: 0.07 }
    )
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <>
      <Helmet>
        <title>식품 라벨 자동 검토 | 식약처 기준 신호등 검토 | KRK Checker</title>
        <meta name="description" content="1인 식품 제조사를 위한 라벨 자동 검토. 16개 항목 신호등 검토, 9,900원부터. 잼·장류·소스 등 5개 카테고리 지원." />
        <link rel="canonical" href={CANONICAL} />
        {/* Open Graph */}
        <meta property="og:type"         content="website" />
        <meta property="og:url"          content={CANONICAL} />
        <meta property="og:title"        content="식품 라벨 자동 검토 | 식약처 기준 신호등 검토 | KRK Checker" />
        <meta property="og:description"  content="1인 식품 제조사를 위한 라벨 자동 검토. 16개 항목 신호등 검토, 9,900원부터. 잼·장류·소스 등 5개 카테고리 지원." />
        <meta property="og:image"        content={OG_IMAGE} />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale"       content="ko_KR" />
        <meta property="og:site_name"    content="KRK Checker" />
        {/* Twitter Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="식품 라벨 자동 검토 | 식약처 기준 신호등 검토 | KRK Checker" />
        <meta name="twitter:description" content="1인 식품 제조사를 위한 라벨 자동 검토. 16개 항목 신호등 검토, 9,900원부터." />
        <meta name="twitter:image"       content={OG_IMAGE} />
        {/* Schema.org: SoftwareApplication */}
        <script type="application/ld+json">
          {JSON.stringify(softwareAppSchema)}
        </script>
      </Helmet>
      <div style={{ fontFamily: FONT_KR, color: INK, background: '#fff' }}>
        <style>{CSS}</style>
        <TopBanner onBetaCTA={handleBetaCTA} />
        <HeroSection onCTA={handleCTA} />
        <WhyImportantSection />
        <HowItWorksSection />
        <WhoIsItForSection />
        <PricingSection onCTA={handleCTA} />
        <ReviewsSection onCTA={handleCTA} />
        <StudioSection />
        <LandingFooter />
      </div>
    </>
  )
}
