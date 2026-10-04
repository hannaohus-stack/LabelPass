// Thumb.tsx — KRK Checker Blog Abstract Thumbnail
// Renders a 4:3 aspect-ratio abstract SVG illustration for each article.
// Replace with real images in production by swapping the <div> for a Next.js <Image>.
// Design reference: blog-data.jsx > Thumb + ThumbMark

import React from 'react';
import { colors } from './tokens';
import type { ThumbProps } from './types';

const LIGHT_PALETTE = { a: '#DCE9F4', b: '#BBD3E8', c: '#9DD6FB', d: '#3AB2FA', e: '#002D72' };
const DARK_PALETTE  = { a: '#001D4A', b: '#002D72', c: '#0CA4F9', d: '#9DD6FB', e: '#FFFFFF' };

interface MarkProps {
  kind: string;
  stroke: string;
  accent: string;
  tone: 'light' | 'dark';
}

function ThumbMark({ kind, stroke, accent, tone }: MarkProps) {
  const common = { stroke, strokeWidth: 1.2, fill: 'none', strokeLinecap: 'square' as const };
  const fill   = { fill: accent, opacity: tone === 'dark' ? 0.9 : 0.85 };
  const fillSoft = { fill: tone === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,45,114,0.08)' };

  return (
    <svg viewBox="0 0 200 150" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      {kind === 'grid' && (
        <g>
          {[0,1,2].flatMap(r => [0,1,2].map(c => (
            <rect key={`${r}-${c}`} x={62 + c*26} y={37 + r*26} width="22" height="22" {...common} />
          )))}
          <rect x={62} y={37} width="22" height="22" {...fill} />
          <rect x={114} y={89} width="22" height="22" {...fill} opacity={0.45} />
        </g>
      )}
      {kind === 'orbit' && (
        <g>
          <ellipse cx="100" cy="75" rx="60" ry="22" {...common} />
          <ellipse cx="100" cy="75" rx="44" ry="16" {...common} />
          <ellipse cx="100" cy="75" rx="26" ry="9"  {...common} />
          <circle cx="100" cy="75" r="3"   {...fill} />
          <circle cx="160" cy="75" r="2.5" {...fill} />
          <circle cx="40"  cy="75" r="2.5" {...fill} opacity={0.5} />
        </g>
      )}
      {kind === 'arc' && (
        <g>
          {Array.from({length: 11}).map((_, i) => {
            const a = (Math.PI / 10) * i;
            const x1 = 100 + Math.cos(Math.PI + a) * 40, y1 = 115 + Math.sin(Math.PI + a) * 40;
            const x2 = 100 + Math.cos(Math.PI + a) * 56, y2 = 115 + Math.sin(Math.PI + a) * 56;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} {...common}
              opacity={i === 3 ? 1 : 0.45}
              stroke={i === 3 ? accent : stroke} strokeWidth={i === 3 ? 2 : 1} />;
          })}
          <path d="M 44 115 A 56 56 0 0 1 156 115" {...common} />
        </g>
      )}
      {kind === 'bars' && (
        <g>
          {[44, 28, 56, 36, 68].map((h, i) => (
            <rect key={i} x={50 + i*22} y={110 - h} width="14" height={h} {...common} />
          ))}
          <rect x="94" y={110 - 56} width="14" height="56" {...fill} />
          <line x1="40" y1="110" x2="160" y2="110" {...common} />
        </g>
      )}
      {kind === 'tri' && (
        <g>
          <polygon points="100,40 140,110 60,110" {...common} />
          <polygon points="100,48 130,102 70,102"  {...fillSoft} />
          <circle cx="100" cy="75" r="2.5" {...fill} />
        </g>
      )}
      {kind === 'split' && (
        <g>
          <rect x="68" y="32" width="64" height="38" {...common} />
          <rect x="60" y="74" width="80" height="42" {...common} />
          <line x1="60" y1="74" x2="140" y2="74" {...common} strokeDasharray="3 3" />
          <rect x="60" y="74" width="80" height="42" {...fillSoft} />
        </g>
      )}
      {kind === 'frame' && (
        <g>
          <rect x="44" y="36" width="112" height="78" {...common} />
          <rect x="44" y="36" width="112" height="14" {...fill} />
          <line x1="56" y1="62" x2="144" y2="62" {...common} />
          <line x1="56" y1="72" x2="124" y2="72" {...common} />
          <line x1="56" y1="82" x2="138" y2="82" {...common} />
        </g>
      )}
      {kind === 'dual' && (
        <g>
          <rect x="44" y="34" width="50" height="82" {...common} />
          <rect x="106" y="34" width="50" height="82" {...common} />
          <line x1="52" y1="50" x2="86" y2="50" {...common} />
          <line x1="52" y1="62" x2="86" y2="62" {...common} />
          <line x1="114" y1="50" x2="148" y2="50" {...common} />
          <line x1="114" y1="62" x2="148" y2="62" {...common} />
          <rect x="44" y="34" width="50" height="10" {...fill} />
          <rect x="106" y="34" width="50" height="10" {...fillSoft} />
        </g>
      )}
      {kind === 'doc' && (
        <g>
          <rect x="62" y="28" width="76" height="98" {...common} />
          {[44, 56, 68, 80, 92, 104].map((y, i) => (
            <g key={y}>
              <rect x="70" y={y} width="6" height="6" {...common} />
              <line x1="80" y1={y+3} x2="130" y2={y+3} {...common} opacity={0.5} />
              {i < 3 && <path d={`M 71 ${y+3} L 73 ${y+5} L 75 ${y+1}`} stroke={accent} strokeWidth={1.4} fill="none" />}
            </g>
          ))}
        </g>
      )}
      {kind === 'screen' && (
        <g>
          <rect x="68" y="22" width="64" height="106" rx="4" {...common} />
          <rect x="74" y="32" width="52" height="6" {...fill} />
          <line x1="74" y1="46" x2="116" y2="46" {...common} />
          <line x1="74" y1="54" x2="126" y2="54" {...common} />
          <line x1="74" y1="62" x2="110" y2="62" {...common} />
          <rect x="74" y="78" width="52" height="18" {...fillSoft} />
          <rect x="78" y="84" width="32" height="6"  {...fill} />
        </g>
      )}
    </svg>
  );
}

/**
 * Thumbnail placeholder — replace with Next.js <Image> in production.
 * Aspect ratio: 4:3 (source image: 800×600px recommended).
 */
export default function Thumb({ kind = 'grid', tone = 'light' }: ThumbProps) {
  const p = tone === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
  const bg = tone === 'dark'
    ? `radial-gradient(120% 90% at 30% 30%, ${p.b} 0%, ${p.a} 60%, #000B1F 100%)`
    : `radial-gradient(120% 90% at 30% 30%, #FFF 0%, ${p.a} 45%, ${p.b} 100%)`;
  const stroke = tone === 'dark' ? p.d : p.e;
  const accent = tone === 'dark' ? p.c : p.d;

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '4/3',
      background: bg, overflow: 'hidden',
      borderBottom: `1px solid ${tone === 'dark' ? 'rgba(255,255,255,0.06)' : colors.rule}`,
    }}>
      <ThumbMark kind={kind ?? 'grid'} stroke={stroke} accent={accent} tone={tone} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(60% 60% at 50% 45%, rgba(255,255,255,0.18), transparent 70%)',
        pointerEvents: 'none',
      }}/>
    </div>
  );
}
