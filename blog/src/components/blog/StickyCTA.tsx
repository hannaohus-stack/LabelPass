// StickyCTA.tsx — Scroll-aware sticky CTA
// Desktop: progress bar + CTA button (sticky top, below nav)
// Mobile: floating pill (sticky bottom, fades in after 300px scroll)

import React, { useEffect, useState } from 'react';
import { colors, fonts, shadow } from './tokens';

interface StickyCTAProps {
  device: 'desktop' | 'mobile';
  /** px offset from top to clear the sticky nav (desktop only). Default 57. */
  navHeight?: number;
}

export default function StickyCTA({ device, navHeight = 57 }: StickyCTAProps) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
      setProgress(pct);
      setVisible(scrollTop > 300);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (device === 'desktop') {
    return (
      <div style={{
        position: 'fixed',
        top: navHeight,
        left: 0, right: 0,
        zIndex: 19,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.rule}`,
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '10px 32px',
        boxSizing: 'border-box',
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? 'auto' : 'none',
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
      }}>
        <div style={{ flex: 1, height: 3, background: colors.surface, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: colors.breath,
            transition: 'width 0.1s linear',
          }} />
        </div>
        <a href="https://checker.krk.team" style={{
          padding: '7px 14px', background: colors.ink, color: '#fff',
          fontFamily: fonts.kr, fontSize: 12.5, fontWeight: 600,
          textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          KRK Checker 시작하기 →
        </a>
      </div>
    );
  }

  // Mobile: floating pill
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 0, right: 0,
      zIndex: 50, display: 'flex', justifyContent: 'center',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.3s ease, transform 0.3s ease',
    }}>
      <a href="https://checker.krk.team" style={{
        pointerEvents: 'all',
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '14px 24px', background: colors.ink, color: '#fff',
        borderRadius: 100, boxShadow: shadow.float,
        fontFamily: fonts.kr, fontSize: 14, fontWeight: 600,
        textDecoration: 'none', whiteSpace: 'nowrap',
      }}>
        이 기준, 내 라벨에 적용해볼까요?
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 22, height: 22, background: 'rgba(255,255,255,0.18)',
          borderRadius: '50%', fontSize: 12,
        }}>→</span>
      </a>
    </div>
  );
}
