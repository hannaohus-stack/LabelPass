// BlogNav.tsx — KRK Checker Blog Navigation Bar
// Sticky top nav with logo, optional desktop links, and CTA button.
// Design reference: blog-list.jsx > BlogNav

import React, { useEffect, useState } from 'react';
import { colors, fonts } from './tokens';
import type { BlogNavProps } from './types';

export default function BlogNav({ device, scope = 'blog', showProgress = false }: BlogNavProps & { showProgress?: boolean }) {
  const isDesktop = device === 'desktop';
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!showProgress) return;
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [showProgress]);

  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderBottom: `1px solid ${colors.rule}`,
        boxSizing: 'border-box',
      }}
    >
      {/* Inner container — max-width 1240px */}
      <div className="krk-nav-inner" style={{
        maxWidth: 1240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}>

      {/* Logo + Desktop nav links */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: isDesktop ? 28 : 0,
        }}
      >
        <a href="/" aria-label="KRK Checker 홈">
          <img
            src="/krk-checker-logo.png"
            alt="KRK Checker"
            style={{ height: isDesktop ? 20 : 16, width: 'auto', display: 'block' }}
          />
        </a>

        {isDesktop && (
          <div
            style={{
              display: 'flex',
              gap: 24,
              fontFamily: fonts.kr,
              fontSize: 13,
              color: colors.ink2,
            }}
          >
            <a
              href="/blog"
              style={{
                color: scope === 'blog' ? colors.ink : 'inherit',
                textDecoration: 'none',
                fontWeight: scope === 'blog' ? 600 : 400,
              }}
            >
              블로그
            </a>
          </div>
        )}
      </div>

      {/* CTA Button */}
      <a
        href="https://checker.krk.team"
        style={{
          padding: isDesktop ? '10px 18px' : '8px 14px',
          background: colors.ink,
          color: '#fff',
          border: 'none',
          borderRadius: 0,
          fontFamily: fonts.kr,
          fontSize: isDesktop ? 13 : 12,
          fontWeight: 600,
          letterSpacing: '-0.005em',
          cursor: 'pointer',
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        라벨 검토 시작하기
      </a>

      </div>{/* /inner container */}

      {/* Bottom line: progress bar on article pages, accent line otherwise */}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 2,
        background: colors.rule,
        pointerEvents: 'none',
      }}>
        {showProgress ? (
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: colors.breath,
            transition: 'width 0.1s linear',
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, transparent, rgba(12,164,249,0.42), transparent)',
          }} />
        )}
      </div>
    </nav>
  );
}
