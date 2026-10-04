// BlogList.tsx — KRK Checker Blog List Page
// Design reference: blog-list.jsx > BlogListA
// Usage: <BlogList device="desktop" />

'use client'; // Next.js App Router
import React, { useState } from 'react';
import { colors, fonts } from './tokens';
import { CATEGORIES, ARTICLES, catLabel } from './data';
import type { BlogListProps, ArticleCardProps } from './types';
import type { Article } from './types';
import Thumb from './Thumb';
import BlogNav from './BlogNav';
import BlogFooter from './BlogFooter';

// ─── Category Tabs ────────────────────────────────────────────
function CategoryTabs({ device, active, onSelect }: {
  device: 'desktop' | 'mobile';
  active: string;
  onSelect: (id: string) => void;
}) {
  const isD = device === 'desktop';
  return (
    <div className="krk-cattabs" style={{
      display: 'flex', alignItems: 'center',
      whiteSpace: 'nowrap', WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
    }}>
      {CATEGORIES.map((c) => {
        const on = c.id === active;
        return (
          <button key={c.id} type="button" onClick={() => onSelect(c.id)} style={{
            background: 'transparent', border: 'none', cursor: 'pointer', padding: '0 0 2px',
            fontFamily: fonts.kr, fontSize: isD ? 15 : 13.5,
            fontWeight: on ? 600 : 400,
            color: on ? colors.ink : colors.ink3,
            borderBottom: `2px solid ${on ? colors.ink : 'transparent'}`,
            letterSpacing: '-0.01em',
          }}>
            {c.ko}
          </button>
        );
      })}
    </div>
  );
}

// ─── Article Card ─────────────────────────────────────────────
export function ArticleCard({ art, device, compact = false }: ArticleCardProps) {
  const isD = device === 'desktop';
  return (
    <a href={`/blog/${art.id}`} style={{ display: 'flex', flexDirection: 'column', gap: isD ? 14 : 12, textDecoration: 'none', color: 'inherit' }}>
      <div style={{ overflow: 'hidden' }}>
        {art.image
          ? <img src={art.image} alt={art.title} style={{ width: '100%', display: 'block' }} />
          : <Thumb kind={art.thumb} tone="light" />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '4px 0 8px' }}>
        <div style={{ fontFamily: fonts.kr, fontSize: 11.5, fontWeight: 500, color: colors.ink3, display: 'flex', alignItems: 'center', gap: 8 }}>
          {catLabel(art.cat)}
        </div>
        <div style={{ fontFamily: fonts.kr, fontSize: compact ? (isD ? 16 : 15) : (isD ? 17.5 : 16), fontWeight: 600, lineHeight: 1.4, color: colors.ink, letterSpacing: '-0.015em' }}>
          {art.title}
        </div>
        {!compact && (
          <div style={{ fontFamily: fonts.kr, fontSize: isD ? 13.5 : 12.5, color: colors.ink2, lineHeight: 1.55, letterSpacing: '-0.01em', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
            {art.summary}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, fontFamily: fonts.kr, fontSize: 11.5, color: colors.ink3 }}>
          <span>{art.time}분</span>
          <span style={{ color: colors.ink4 }}>·</span>
          <span>기준 {art.src[0]}</span>
        </div>
      </div>
    </a>
  );
}

// ─── Featured Article Card ────────────────────────────────────
function FeaturedCard({ art, device }: { art: Article; device: 'desktop' | 'mobile' }) {
  const isD = device === 'desktop';
  if (!isD) {
    return (
      <a href={`/blog/${art.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 14, textDecoration: 'none', color: 'inherit' }}>
        {art.image
          ? <img src={art.image} alt={art.title} style={{ width: '100%', display: 'block' }} />
          : <Thumb kind={art.thumb} tone="light" />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 4px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11.5, fontFamily: fonts.kr, color: colors.ink3 }}>
            <span style={{ padding: '3px 8px', background: colors.tint, color: colors.heritage, fontWeight: 600 }}>Featured</span>
            <span>{catLabel(art.cat)}</span>
          </div>
          <div style={{ fontFamily: fonts.kr, fontSize: 19, fontWeight: 700, lineHeight: 1.35, letterSpacing: '-0.02em', color: colors.ink }}>{art.title}</div>
          <div style={{ fontFamily: fonts.kr, fontSize: 13, color: colors.ink2, lineHeight: 1.55 }}>{art.summary}</div>
        </div>
      </a>
    );
  }
  return (
    <a href={`/blog/${art.id}`} className="krk-featured" style={{ display: 'grid', gap: 0, textDecoration: 'none', color: 'inherit', border: `1px solid ${colors.rule}` }}>
      <div className="krk-featured__img" style={{ display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
        {art.image
          ? <img src={art.image} alt={art.title} style={{ width: '100%', display: 'block', objectFit: 'cover' }} />
          : <Thumb kind={art.thumb} tone="light" />}
      </div>
      <div className="krk-featured__body" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: fonts.kr, fontSize: 11.5, color: colors.ink3 }}>
            <span style={{ padding: '4px 10px', background: colors.heritage, color: '#fff', fontWeight: 600, fontFamily: fonts.en, fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>FEATURED</span>
            <span>{catLabel(art.cat)}</span>
          </div>
          <div className="krk-featured__title" style={{ fontFamily: fonts.kr, fontWeight: 700, lineHeight: 1.28, letterSpacing: '-0.025em', color: colors.ink }}>{art.title}</div>
          <div style={{ fontFamily: fonts.kr, fontSize: 15, color: colors.ink2, lineHeight: 1.65, letterSpacing: '-0.01em' }}>{art.summary}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 18, borderTop: `1px solid ${colors.rule}`, fontFamily: fonts.kr, fontSize: 12, color: colors.ink3 }}>
          <span>{art.date}</span>
          <span style={{ color: colors.ink4 }}>·</span>
          <span>{art.time}분</span>
          <span style={{ marginLeft: 'auto', color: colors.ink, fontWeight: 600 }}>읽어보기 →</span>
        </div>
      </div>
    </a>
  );
}

// ─── Main Component ───────────────────────────────────────────
/**
 * Blog list page component.
 * Place at: app/blog/page.tsx → <BlogList device="desktop" />
 * Use CSS media queries or server-side UA detection for `device` prop.
 */
export default function BlogList({ device, articles }: BlogListProps) {
  const isD = device === 'desktop';
  const [active, setActive] = useState('all');
  const list = articles && articles.length > 0 ? articles : ARTICLES;
  const featured = list[0];
  const rest = list.slice(1).filter((a) => active === 'all' || a.cat === active);

  return (
    <div style={{ background: '#fff', minHeight: '100%', display: 'flex', flexDirection: 'column', fontFamily: fonts.kr }}>
      <BlogNav device={device} scope="blog" />

      {/* Page Header */}
      <div className="krk-list-head" style={{ maxWidth: 1240, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ fontFamily: fonts.en, fontSize: isD ? 20 : 14, fontWeight: 700, letterSpacing: '-0.028em', textTransform: 'uppercase' as const, color: colors.ink, lineHeight: 1.1 }}>BLOG</div>
      </div>

      {/* Featured */}
      <div className="krk-list-featured" style={{ maxWidth: 1240, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        <FeaturedCard art={featured} device={device} />
      </div>

      {/* Category Bar (sticky) */}
      <div style={{ borderTop: `1px solid ${colors.rule}`, borderBottom: `1px solid ${colors.rule}`, background: '#fff', position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="krk-list-catbar" style={{ maxWidth: 1240, margin: '0 auto', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <CategoryTabs device={device} active={active} onSelect={setActive} />
        </div>
      </div>

      {/* Article Grid */}
      <div className="krk-list-grid" style={{
        maxWidth: 1240, margin: '0 auto', width: '100%', boxSizing: 'border-box',
        display: 'grid',
      }}>
        {rest.map((art) => <ArticleCard key={art.id} art={art} device={device} compact />)}
      </div>

      <BlogFooter device={device} />
    </div>
  );
}
