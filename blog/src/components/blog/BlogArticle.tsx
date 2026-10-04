// BlogArticle.tsx — KRK Checker Blog Article Detail Page
// Design reference: blog-article.jsx > BlogArticleA
// Usage: <BlogArticle article={ARTICLES[0]} device="mobile" />

import React from 'react';
import { colors, fonts, shadow } from './tokens';
import { ARTICLES, catLabel } from './data';
import type { BlogArticleProps } from './types';
import type { Article } from './types';
import Thumb from './Thumb';
import BlogNav from './BlogNav';
import BlogFooter from './BlogFooter';

// ─── Article Summary Box ──────────────────────────────────────
function ArticleSummaryBox({ device }: { device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  const points = [
    { bold: '의무 표시사항 9가지', rest: ' — 누락하면 출시 후 회수·폐기 대상이 될 수 있습니다.' },
    { bold: '소비기한 전환·식품유형 오기재', rest: ' 등 작은 브랜드에서 자주 하는 실수를 정리했습니다.' },
    { bold: 'KRK Checker', rest: '로 9가지 항목을 자동 점검하는 흐름을 소개합니다.' },
  ];
  return (
    <div style={{ background: colors.tint, border: `1px solid rgba(12,164,249,0.15)`, padding: isD ? '22px 26px' : '16px 18px', marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: fonts.kr, fontSize: isD ? 13 : 12.5, fontWeight: 700, color: colors.heritage, marginBottom: 12 }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <rect x="1" y="1" width="12" height="12" rx="1.5" stroke={colors.heritage} strokeWidth="1.2" fill="none"/>
          <path d="M4 5h6M4 7.5h4.5" stroke={colors.heritage} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        이 글을 읽으면 알 수 있어요
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
        {points.map((p, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontFamily: fonts.kr, fontSize: isD ? 14 : 13.5, lineHeight: 1.6, color: colors.ink }}>
            <span style={{ color: colors.heritage, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>•</span>
            <span><strong style={{ fontWeight: 700 }}>{p.bold}</strong>{p.rest}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Table of Contents ────────────────────────────────────────
function ArticleTOC({ device }: { device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  const items = [
    { num: '1', title: '9가지 의무 표시사항 — 법규 근거' },
    { num: '2', title: '실무 적용 기준' },
    { num: '3', title: '자주 하는 실수' },
    { num: '4', title: '요약 + 체크리스트' },
  ];
  return (
    <div style={{ background: 'transparent', border: `1px solid ${colors.rule}`, padding: isD ? '24px 28px' : '18px 18px', marginBottom: 28, display: 'inline-block', minWidth: isD ? 260 : 220, boxSizing: 'border-box' as const }}>
      <div style={{ fontFamily: fonts.en, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: colors.ink, marginBottom: 14 }}>Contents</div>
      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((item) => (
          <li key={item.num} style={{ display: 'flex', alignItems: 'baseline', gap: 12, fontFamily: fonts.kr, fontSize: isD ? 14 : 13, color: colors.ink2 }}>
            <span style={{ fontFamily: fonts.en, fontSize: 10.5, fontWeight: 700, color: colors.heritage, flexShrink: 0, minWidth: 20 }}>{item.num}</span>
            <a href={`#h-${item.num}`} style={{ color: 'inherit', textDecoration: 'none' }}>{item.title}</a>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ─── Sticky CTA ───────────────────────────────────────────────
function StickyCTA({ device }: { device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  if (isD) {
    return (
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${colors.rule}`, display: 'flex', alignItems: 'center', gap: 16, padding: '10px 32px', boxSizing: 'border-box' as const }}>
        <div style={{ flex: 1, height: 3, background: colors.surface, position: 'relative', overflow: 'hidden' }}>
          {/* TODO: update width dynamically based on scroll position */}
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '0%', background: colors.breath }} id="article-progress" />
        </div>
        <a href="/" style={{ padding: '7px 14px', background: colors.ink, color: '#fff', fontFamily: fonts.kr, fontSize: 12.5, fontWeight: 600, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
          KRK Checker 시작하기 →
        </a>
      </div>
    );
  }
  return (
    <div style={{ position: 'sticky', bottom: 24, zIndex: 50, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
      <a href="/" style={{ pointerEvents: 'all', display: 'inline-flex', alignItems: 'center', gap: 10, padding: '14px 24px', background: colors.ink, color: '#fff', borderRadius: 100, boxShadow: shadow.float, fontFamily: fonts.kr, fontSize: 14, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
        이 기준, 내 라벨에 적용해볼까요?
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, background: 'rgba(255,255,255,0.18)', borderRadius: '50%', fontSize: 12 }}>→</span>
      </a>
    </div>
  );
}

// ─── Article Body ─────────────────────────────────────────────
function ArticleBody({ device }: { device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  const para: React.CSSProperties = { fontFamily: fonts.kr, fontSize: isD ? 16 : 15, lineHeight: 1.75, color: colors.ink, letterSpacing: '-0.01em', margin: '0 0 16px', textWrap: 'pretty' as never };
  const h2: React.CSSProperties = { fontFamily: fonts.kr, fontSize: isD ? 22 : 19, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.025em', color: colors.ink, margin: isD ? '44px 0 14px' : '32px 0 10px', display: 'flex', alignItems: 'baseline', gap: 14 };
  const h2num: React.CSSProperties = { fontFamily: fonts.en, fontWeight: 600, fontSize: isD ? 14 : 12, color: colors.heritage, letterSpacing: '0.04em', flexShrink: 0 };
  const h3: React.CSSProperties = { fontFamily: fonts.kr, fontSize: isD ? 18 : 16, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.02em', color: colors.ink, margin: '28px 0 10px' };

  const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', margin: '8px 0 28px', fontFamily: fonts.kr, fontSize: isD ? 14 : 13, color: colors.ink };
  const th: React.CSSProperties = { textAlign: 'left', fontWeight: 600, padding: isD ? '14px 16px' : '10px 12px', borderBottom: `1px solid ${colors.ruleS}`, background: colors.surface };
  const td: React.CSSProperties = { padding: isD ? '14px 16px' : '10px 12px', borderBottom: `1px solid ${colors.rule}`, color: colors.ink2, verticalAlign: 'top' };

  const callout = (kind: 'tip' | 'warn' | 'disclaimer', body: React.ReactNode) => {
    if (kind === 'disclaimer') {
      return <div style={{ background: colors.surface, border: `1px solid ${colors.rule}`, borderRadius: 6, padding: isD ? '16px 20px' : '14px 16px', margin: '32px 0 0', fontFamily: fonts.kr, fontSize: isD ? 13 : 12.5, lineHeight: 1.65, color: colors.ink2 }}>{body}</div>;
    }
    const isWarn = kind === 'warn';
    return (
      <div style={{ background: isWarn ? '#FFF7E8' : colors.tint, border: `1px solid ${isWarn ? 'rgba(217,141,38,0.2)' : 'rgba(12,164,249,0.2)'}`, borderLeft: `3px solid ${isWarn ? '#D98D26' : colors.breath}`, borderRadius: '0 6px 6px 0', padding: isD ? '20px 24px' : '16px 20px', margin: '24px 0 28px', fontFamily: fonts.kr, fontSize: isD ? 14.5 : 13.5, lineHeight: 1.7, color: colors.ink }}>
        <div style={{ fontFamily: fonts.en, fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: isWarn ? '#9F6612' : colors.heritage, marginBottom: 6 }}>{isWarn ? '주의 — 면책' : '놓치기 쉬운 부분'}</div>
        {body}
      </div>
    );
  };

  const tableRows: [string, string][] = [
    ['제품명', '브랜드명과 별도 기재'],
    ['식품유형', '식품공전 기준 분류명 사용'],
    ['영업소 명칭·소재지', '자사 기준, 위탁 제조 시 혼동 주의'],
    ['소비기한 (또는 유통기한)', '소비기한 전환 여부 확인 필요'],
    ['내용량', '실제 중량 기준, 건조 제품은 건조 후 중량'],
    ['원재료명', '함량순 기재, 알레르기 표시 포함'],
    ['영양성분', '강조 표시 사용 시 의무 대상'],
    ['보관방법', '냉장·냉동·실온 등 구체 조건 명시'],
    ['반품·교환 장소', '판매자 또는 제조사 연락처 포함'],
  ];

  const checkItems = ['제품명 (브랜드명과 별도 기재)', '식품유형 (식품공전 기준 확인)', '영업소 명칭·소재지 (자사 기준)', '소비기한 또는 유통기한 (현재 적용 기준 확인)', '내용량 (실제 중량 기준)', '원재료명 (함량순 + 알레르기 표시)', '영양성분 (강조표시 사용 시 필수)', '보관방법 (구체적 조건)', '반품·교환 장소'];

  return (
    <div>
      <p style={para}>식품을 판매하려면 라벨에 반드시 표기해야 하는 항목이 있습니다. 빠뜨리면 출시 후 회수·폐기까지 이어질 수 있으며, 작은 브랜드일수록 사전에 확인하기 어렵습니다.</p>
      <p style={para}>식품표시광고법과 식약처 고시(2024-66호)를 기준으로 9가지 의무 표시사항을 정리했습니다.</p>

      <h2 id="h-1" style={h2}><span style={h2num}>1</span><span>9가지 의무 표시사항 — 법규 근거</span></h2>
      <p style={para}>식품표시광고법 시행규칙 별표4에 따라 아래 9가지를 반드시 라벨에 표시해야 합니다.</p>
      <table style={tableStyle}>
        <thead><tr><th style={{ ...th, width: '38%' }}>항목</th><th style={th}>핵심 주의사항</th></tr></thead>
        <tbody>{tableRows.map(([item, note], i) => (
          <tr key={i}><td style={{ ...td, color: colors.ink, fontWeight: 500 }}>{item}</td><td style={td}>{note}</td></tr>
        ))}</tbody>
      </table>

      <h2 id="h-2" style={h2}><span style={h2num}>2</span><span>실무 적용 기준</span></h2>
      <p style={para}>제품명과 브랜드명을 구분하는 것이 현장에서 가장 자주 빠지는 부분입니다. '제주 감귤 음료'가 제품명이라면, 브랜드명은 그 위 또는 아래에 별도로 표기합니다.</p>
      <p style={para}>2023년 1월부터 소비기한 표시제가 시행됐습니다. 품목별 전환 일정이 다르므로, 품목제조보고 시 담당자에게 현재 기준을 반드시 확인하세요.</p>
      <p style={para}>위탁 제조 브랜드는 영업소 소재지를 자사 기준으로 기재해야 합니다. 제조사 주소를 그대로 쓰는 실수가 자주 발생합니다.</p>

      <h2 id="h-3" style={h2}><span style={h2num}>3</span><span>자주 하는 실수</span></h2>
      <h3 style={h3}>① 식품유형 오기재</h3>
      <p style={para}>소비자 인지와 법적 분류가 다를 수 있습니다. 예: 그래놀라를 '시리얼류'가 아닌 '기타 가공식품'으로 분류해야 하는 경우가 있습니다. 품목제조보고 전 반드시 확인이 필요합니다.</p>
      <h3 style={h3}>② 영양성분표 누락</h3>
      <p style={para}>'저칼로리', '무가당', '고단백' 등 강조 표시를 사용하면 영양성분표 기재가 의무가 됩니다. 강조 표시 없이 판매하는 경우에도 일부 품목은 의무 대상입니다.</p>
      <h3 style={h3}>③ 반품·교환 장소 생략</h3>
      <p style={para}>온라인 판매 브랜드에서 자주 누락됩니다. 전화번호 또는 이메일 주소 중 하나는 반드시 포함해야 합니다.</p>

      <h2 id="h-4" style={h2}><span style={h2num}>4</span><span>요약 + 체크리스트</span></h2>
      <ul style={{ margin: '0 0 28px', padding: '22px 24px', listStyle: 'none', background: colors.paper, border: `1px solid ${colors.rule}`, borderRadius: 8 }}>
        {checkItems.map((item, i) => (
          <li key={i} style={{ position: 'relative', paddingLeft: 28, paddingTop: 8, paddingBottom: 8, fontFamily: fonts.kr, fontSize: isD ? 14.5 : 13.5, lineHeight: 1.65, color: colors.ink, borderBottom: i < checkItems.length - 1 ? `1px dashed ${colors.rule}` : 'none' }}>
            <span style={{ position: 'absolute', left: 0, top: 9, color: colors.heritage, fontWeight: 700, fontSize: 14 }}>✓</span>
            {item}
          </li>
        ))}
      </ul>
      {callout('disclaimer', '⚠️ 이 글은 식품표시광고법 기준 정리이며, 개별 제품에 대한 법률 자문이 아닙니다. 판매 전 자율 점검을 돕기 위한 참고용입니다.')}
    </div>
  );
}

// ─── Article CTA ─────────────────────────────────────────────
function ArticleCTA({ device }: { device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: colors.tint, border: `1px solid rgba(12,164,249,0.22)`, padding: isD ? '40px 44px' : '28px 24px', margin: isD ? '72px 0 0' : '48px 0 0' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(60% 120% at 92% 8%, rgba(12,164,249,0.12), transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontFamily: fonts.kr, fontWeight: 700, fontSize: isD ? 26 : 20, lineHeight: 1.25, letterSpacing: '-0.03em', color: colors.heritage, marginBottom: isD ? 12 : 10 }}>
          라벨 점검이 필요하다면, 직접 입력해보세요
        </div>
        <div style={{ fontFamily: fonts.kr, fontSize: isD ? 14.5 : 13, lineHeight: 1.6, color: colors.ink2, maxWidth: 460, marginBottom: isD ? 24 : 18 }}>
          회원가입 없이 제품 정보를 입력하면 내 라벨에 맞는 검토 결과를 확인할 수 있어요. 결과는 자율 점검 참고용입니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: isD ? 12 : 8 }}>
          <a href="/" style={{ fontFamily: fonts.kr, fontSize: isD ? 14 : 13, fontWeight: 700, color: '#fff', background: colors.heritage, padding: isD ? '12px 22px' : '10px 18px', textDecoration: 'none' }}>
            라벨 검토 시작하기
          </a>
          <a href="/pricing" style={{ fontFamily: fonts.kr, fontSize: isD ? 13.5 : 12.5, fontWeight: 600, color: colors.heritage, padding: isD ? '11px 18px' : '9px 14px', border: `1px solid rgba(12,164,249,0.22)`, background: colors.paper, textDecoration: 'none' }}>
            요금 안내 보기 →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Related Articles ─────────────────────────────────────────
function RelatedArticles({ device, currentId }: { device: 'desktop' | 'mobile'; currentId: string }) {
  const isD = device === 'desktop';
  const items = ARTICLES.filter((a) => a.id !== currentId).slice(0, 3);
  return (
    <div style={{ padding: isD ? '88px 0 0' : '64px 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: isD ? 32 : 22, paddingBottom: 14, borderBottom: `1px solid ${colors.rule}` }}>
        <div style={{ fontFamily: fonts.kr, fontSize: isD ? 20 : 17, fontWeight: 700, letterSpacing: '-0.022em', color: colors.ink }}>관련 글</div>
        <a href="/blog" style={{ fontFamily: fonts.kr, fontSize: 12, color: colors.ink3, textDecoration: 'none' }}>전체 보기 →</a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isD ? 'repeat(3, 1fr)' : '1fr', gap: isD ? 24 : 28 }}>
        {items.map((art) => (
          <Link key={art.id} href={`/blog/${art.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Thumb kind={art.thumb} tone="light" />
            <div style={{ fontFamily: fonts.kr, fontSize: 11.5, color: colors.ink3, marginTop: 2 }}>{catLabel(art.cat)}</div>
            <div style={{ fontFamily: fonts.kr, fontSize: isD ? 15.5 : 14.5, fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.015em', color: colors.ink }}>{art.title}</div>
            <div style={{ fontFamily: fonts.kr, fontSize: 11.5, color: colors.ink3 }}>{art.time}분 · 기준 {art.src[0]}</div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
/**
 * Blog article detail page.
 * Place at: app/blog/[slug]/page.tsx → <BlogArticle article={article} device="desktop" />
 */
export default function BlogArticle({ device, article }: BlogArticleProps) {
  const isD = device === 'desktop';
  const art: Article = article ?? ARTICLES[0];

  return (
    <div style={{ background: '#fff', minHeight: '100%', display: 'flex', flexDirection: 'column', paddingTop: isD ? 70 : 56, fontFamily: fonts.kr }}>
      <BlogNav device={device} scope="blog" />
      <StickyCTA device={device} />

      {/* Article Header */}
      <div style={{ maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: isD ? '64px 32px 20px' : '24px 22px 12px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', background: colors.surface, fontFamily: fonts.kr, fontSize: 11.5, color: colors.ink2, marginBottom: 24 }}>
          <span style={{ width: 5, height: 5, background: colors.breath, borderRadius: '50%' }} />
          {catLabel(art.cat)}
        </div>
        <h1 style={{ fontFamily: fonts.kr, fontSize: isD ? 42 : 26, fontWeight: 700, letterSpacing: '-0.03em', color: colors.ink, lineHeight: 1.25, margin: '0 0 18px' }}>{art.title}</h1>
        <p style={{ fontFamily: fonts.kr, fontSize: isD ? 16 : 14, color: colors.ink2, lineHeight: 1.6, maxWidth: 580, margin: '0 auto 28px' }}>{art.summary}</p>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontFamily: fonts.kr, fontSize: 12, color: colors.ink3, flexWrap: 'wrap', justifyContent: 'center' }}>
          <span>{art.date}</span>
          <span style={{ color: colors.ink4 }}>·</span>
          <span>{art.time}분 읽기</span>
          <span style={{ color: colors.ink4 }}>·</span>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            {art.src.map((s) => (
              <span key={s} style={{ padding: '3px 10px', background: colors.tint, border: `1px solid rgba(12,164,249,0.18)`, borderRadius: 999, fontSize: 11.5, color: colors.heritage, fontWeight: 500 }}>{s}</span>
            ))}
          </span>
        </div>
      </div>

      {/* Hero Image */}
      <div style={{ maxWidth: 920, margin: '16px auto 0', width: '100%', boxSizing: 'border-box', padding: isD ? '0 32px' : '0 22px' }}>
        <div style={{ border: `1px solid ${colors.rule}` }}>
          {/* Replace with Next.js <Image> in production */}
          <Thumb kind={art.thumb} tone="light" />
        </div>
      </div>

      {/* Body */}
      <article style={{ maxWidth: 720, margin: '0 auto', width: '100%', boxSizing: 'border-box', padding: isD ? '48px 32px 0' : '30px 22px 0' }}>
        <ArticleSummaryBox device={device} />
        <ArticleTOC device={device} />
        <ArticleBody device={device} />
        <ArticleCTA device={device} />

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: isD ? 48 : 32, paddingTop: isD ? 32 : 24, borderTop: `1px solid ${colors.rule}` }}>
          <a href="/blog" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isD ? '10px 16px' : '9px 14px', border: `1px solid ${colors.ruleS}`, fontFamily: fonts.kr, fontSize: isD ? 13 : 12.5, color: colors.ink, textDecoration: 'none' }}>
            ← 목록으로
          </a>
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: isD ? '10px 16px' : '9px 14px', border: `1px solid ${colors.ruleS}`, background: '#fff', fontFamily: fonts.kr, fontSize: isD ? 13 : 12.5, color: colors.ink, cursor: 'pointer' }}>
            공유하기
          </button>
        </div>

        <RelatedArticles device={device} currentId={art.id} />
      </article>

      <div style={{ height: isD ? 96 : 56 }} />
      <StickyCTA device={device} />
      <BlogFooter device={device} />
    </div>
  );
}
