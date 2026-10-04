// types.ts — KRK Checker Blog Type Definitions

export type ThumbKind =
  | 'grid' | 'orbit' | 'arc' | 'bars' | 'tri'
  | 'split' | 'frame' | 'dual' | 'doc' | 'screen';

export type CategoryId =
  | 'all' | 'label' | 'ingredient' | 'packaging'
  | 'filing' | 'cases' | 'updates';

export interface Category {
  id: CategoryId;
  ko: string;  // Korean label shown in UI
  en: string;  // English label (for eyebrow / en-only contexts)
}

export interface Article {
  id: string;           // Unique slug, e.g. 'a01'
  num: string;          // Display number, e.g. '01'
  cat: CategoryId;
  title: string;
  summary: string;      // One-sentence summary shown in list cards
  time: number;         // Estimated reading time in minutes
  src: string[];        // Legal source references, e.g. ['식품표시광고법']
  date: string;         // Display date, e.g. '2026.05.24'
  featured?: boolean;   // If true, shown in Featured slot at top of list
  thumb: ThumbKind;     // Which abstract thumbnail to render
  image?: string;       // Real image path e.g. '/images/blog/slug-thumb.png'
}

// ─── Component Props ─────────────────────────────────────────

export interface BlogNavProps {
  /** 'mobile' constrains to single-line logo + CTA only */
  device: 'desktop' | 'mobile';
  /** Highlights the matching nav link */
  scope?: 'blog' | 'landing';
}

export interface BlogFooterProps {
  device: 'desktop' | 'mobile';
}

export interface ThumbProps {
  kind?: ThumbKind;
  /** 'light' for card backgrounds, 'dark' for Heritage hero bands */
  tone?: 'light' | 'dark';
}

export interface ArticleCardProps {
  art: Article;
  device: 'desktop' | 'mobile';
  /** 'A' = clean Toss-leaning, 'B' = editorial heritage */
  variant?: 'A' | 'B';
  /** compact hides the summary paragraph */
  compact?: boolean;
}

export interface BlogListProps {
  device: 'desktop' | 'mobile';
  articles: Article[];
  variant?: 'A' | 'B';
}

export interface BlogArticleProps {
  device: 'desktop' | 'mobile';
  /** 'A' = centered narrow column (default), 'B' = left-aligned + sticky TOC */
  variant?: 'A' | 'B';
  /** Article data to render. Defaults to first article if omitted. */
  article?: Article;
}

export interface ArticleTOCItem {
  num: string;
  title: string;
}

export interface ArticleSummaryPoint {
  bold: string;
  rest: string;
}
