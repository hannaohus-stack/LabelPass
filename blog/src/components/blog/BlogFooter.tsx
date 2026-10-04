// BlogFooter.tsx — KRK Blog Footer
// Style source: krk-checker-dev/src/pages/Landing.tsx > LandingFooter()

import React from 'react';
import type { BlogFooterProps } from './types';

const FONT_EN = 'Inter, system-ui, sans-serif';

export default function BlogFooter({ device }: BlogFooterProps) {
  const isD = device === 'desktop';
  const linkStyle: React.CSSProperties = {
    color: 'rgba(255,255,255,0.50)',
    textDecoration: 'none',
    fontSize: 13,
    lineHeight: 1,
  };
  const colTitleStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: '0.18em',
    textTransform: 'uppercase' as const,
    marginBottom: 18,
    fontFamily: FONT_EN,
  };

  return (
    <footer style={{ background: '#0F0F12' }}>

      {/* 링크 3컬럼 */}
      <div className="krk-footer-top" style={{
        maxWidth: 1240,
        margin: '0 auto',
      }}>
        {isD ? (
          <div className="krk-footer-cols" style={{ display: 'grid', gap: 0 }}>
            <div />
            <div className="krk-footer-colsinner" style={{ display: 'grid' }}>
              <div>
                <div style={colTitleStyle}>서비스</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <a href="https://checker.krk.team/#pricing" style={linkStyle}>가격</a>
                  <a href="https://checker.krk.team/faq" style={linkStyle}>FAQ</a>
                  <a href="https://checker.krk.team/guide/label" style={linkStyle}>사용방법</a>
                </div>
              </div>
              <div>
                <div style={colTitleStyle}>법적고지</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <a href="https://checker.krk.team/terms" style={linkStyle}>이용약관</a>
                  <a href="https://checker.krk.team/privacy" style={linkStyle}>개인정보처리방침</a>
                </div>
              </div>
              <div>
                <div style={colTitleStyle}>문의 · 채널</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <a href="mailto:hello@krk.team" style={linkStyle}>hello@krk.team</a>
                  <a href="https://krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>krk Studio</a>
                  <a href="https://instagram.com/krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>인스타그램</a>
                  <a href="https://blog.naver.com/krk" target="_blank" rel="noopener noreferrer" style={linkStyle}>블로그</a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
            <div>
              <div style={colTitleStyle}>서비스</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="https://checker.krk.team/#pricing" style={linkStyle}>가격</a>
                <a href="https://checker.krk.team/faq" style={linkStyle}>FAQ</a>
                <a href="https://checker.krk.team/guide/label" style={linkStyle}>사용방법</a>
              </div>
            </div>
            <div>
              <div style={colTitleStyle}>법적고지</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="https://checker.krk.team/terms" style={linkStyle}>이용약관</a>
                <a href="https://checker.krk.team/privacy" style={linkStyle}>개인정보처리방침</a>
              </div>
            </div>
            <div>
              <div style={colTitleStyle}>문의 · 채널</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a href="mailto:hello@krk.team" style={linkStyle}>hello@krk.team</a>
                <a href="https://krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>krk Studio</a>
                <a href="https://instagram.com/krk.studio" target="_blank" rel="noopener noreferrer" style={linkStyle}>인스타그램</a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 빅 로고 + 카피라이트 */}
      <div className="krk-footer-bottom" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 40,
      }}>
        <img
          src="/krk-checker-logo.png"
          alt="KRK Checker"
          style={{ height: 52, opacity: 0.85, filter: 'brightness(0) invert(1)' }}
        />
        <div style={{
          marginTop: 8,
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          letterSpacing: '0.06em',
        }}>
          © 2026 KRK · All rights reserved
        </div>
      </div>

    </footer>
  );
}
