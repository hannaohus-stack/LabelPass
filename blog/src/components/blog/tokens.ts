// tokens.ts — KRK Checker Design Tokens
// Source of truth for colors, typography, and spacing used across the blog.

export const colors = {
  // Brand
  heritage: '#002D72',      // Primary brand dark blue
  breath:   '#0CA4F9',      // Primary brand accent blue

  // Ink (text)
  ink:      '#0A0A0B',      // Primary text
  ink2:     'rgba(10,10,11,0.65)',  // Secondary text
  ink3:     'rgba(10,10,11,0.45)',  // Tertiary / placeholder
  ink4:     'rgba(10,10,11,0.30)',  // Disabled / divider label

  // Surfaces
  paper:    '#FFFFFF',
  surface:  '#F4F4F5',      // Light gray surface (TOC bg, code bg)
  tint:     '#F6F9FD',      // Soft Breath tint (callout bg, summary box)
  tint2:    '#EFF5FB',      // Deeper tint

  // Rules / borders
  rule:     'rgba(10,10,11,0.10)',   // Default hairline
  ruleS:    'rgba(10,10,11,0.18)',   // Strong hairline
} as const;

export const fonts = {
  kr: 'Pretendard, "Pretendard Variable", system-ui, -apple-system, sans-serif',
  en: 'Inter, system-ui, sans-serif',
} as const;

export const radius = {
  pill: 100,
  sm:   4,
  md:   8,
} as const;

export const shadow = {
  float: '0 4px 20px rgba(10,10,11,0.22)',  // Floating CTA pill
  card:  '0 1px 4px rgba(10,10,11,0.08)',
} as const;

// Thumbnail aspect ratio used across all blog card images
export const thumbAspectRatio = '4 / 3';  // 800×600 recommended source size
