# KRK Checker Blog — Astro Project

## 시작하기

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # 정적 빌드
npm run preview   # 빌드 결과 미리보기
```

## 구조

```
blog-krk/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── krk-checker-logo.png
└── src/
    ├── layouts/
    │   └── Layout.astro          # 공통 HTML 래퍼 (폰트, meta)
    ├── pages/
    │   ├── index.astro           # /blog 리다이렉트
    │   ├── blog/
    │   │   ├── index.astro       # /blog — 리스트 페이지
    │   │   └── [slug].astro      # /blog/a01 — 상세 페이지
    └── components/blog/
        ├── index.ts              # re-export 진입점
        ├── tokens.ts             # 디자인 토큰
        ├── types.ts              # TypeScript 타입
        ├── data.ts               # 아티클 데이터
        ├── BlogNav.tsx           # 네비게이션 바
        ├── BlogFooter.tsx        # 푸터
        ├── Thumb.tsx             # 썸네일 플레이스홀더
        ├── BlogList.tsx          # 블로그 리스트 컴포넌트
        └── BlogArticle.tsx       # 블로그 상세 컴포넌트
```

## 라우팅

| URL | 파일 | 설명 |
|-----|------|------|
| `/blog` | `pages/blog/index.astro` | 아티클 리스트 |
| `/blog/a01` | `pages/blog/[slug].astro` | 아티클 상세 |

## 새 아티클 추가

`src/components/blog/data.ts`의 `ARTICLES` 배열에 항목 추가:

```ts
{
  id: 'a11',           // URL slug → /blog/a11
  num: '11',
  cat: 'label',        // 카테고리 ID
  title: '아티클 제목',
  summary: '한 줄 요약',
  time: 5,             // 예상 읽기 시간 (분)
  src: ['식품표시광고법'],
  date: '2026.06.01',
  thumb: 'grid',       // 썸네일 종류
}
```

## 프로덕션 이미지 교체

`Thumb.tsx`의 SVG 플레이스홀더를 실제 이미지로 교체:

```tsx
// Before (placeholder)
<Thumb kind={art.thumb} tone="light" />

// After (real image)
<img src={`/images/blog/${art.id}-thumb.jpg`} alt={art.title} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />
```

권장 이미지 크기: **800×600px** (4:3 비율)

## Sticky CTA 스크롤 연동

`BlogArticle.tsx`의 `StickyCTA` 데스크탑 버전에 progress bar가 있습니다.  
실제 스크롤 연동은 아래 코드를 추가하세요:

```tsx
useEffect(() => {
  const handler = () => {
    const el = document.getElementById('article-progress');
    if (!el) return;
    const pct = Math.min(100, (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    el.style.width = pct + '%';
  };
  window.addEventListener('scroll', handler, { passive: true });
  return () => window.removeEventListener('scroll', handler);
}, []);
```

## 링크 교체

현재 모든 CTA 링크는 `/`로 설정되어 있습니다.  
프로덕션 적용 전 실제 URL로 교체하세요:

| 현재 | 교체값 |
|------|--------|
| `href="/"` (CTA) | `https://checker.krk.team` |
| `href="/pricing"` | 실제 요금 페이지 URL |
