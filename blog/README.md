# 라벨패스 블로그 (Astro)

라벨패스 사이트의 `/blog`. 루트에서 `npm run build`를 실행하면 앱 빌드 뒤에 이 블로그가 `dist/blog`로 빌드돼요.

## 글 추가

- `src/content/blog/<주소>.mdx` 파일 1개 = 글 1개 (파일 이름이 글 주소)
- 필수: `title` · `summary` · `cat`(guide · question · check · law) · `date` · `thumbTitle`(줄바꿈은 `\n`)
- 이미지는 `public/images/blog/`에 두고 `/blog/images/blog/파일명`으로 연결

## 구조

```
src/
├── content/blog/   글(mdx)
├── layouts/        공통 레이아웃 (메뉴 · 푸터 · 분석 코드)
├── components/site 썸네일 · 카드
├── lib/posts.ts    카테고리 · 정렬
└── pages/          /blog · /blog/category/[cat] · /blog/[slug]
```

## 로컬 확인

```bash
npm install
npm run dev   # http://localhost:4321/blog
```
