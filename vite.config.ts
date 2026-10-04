import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'
// @ts-expect-error — @types/node 미설치 (빌드 시 Node에서 정상 동작)
import { readdirSync } from 'node:fs'

// 블로그(Astro, blog/)는 루트 build 마지막에 dist/blog 로 빌드된다 — 사이트맵에 글 주소 포함
const blogRoutes = ['/blog', ...['guide', 'question', 'check', 'law'].map((c) => `/blog/category/${c}`),
  ...readdirSync('blog/src/content/blog').filter((f: string) => f.endsWith('.mdx')).map((f: string) => `/blog/${f.replace(/\.mdx$/, '')}`)]

export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://checker.krk.team',
      dynamicRoutes: ['/', '/service', '/pricing', '/contact', ...blogRoutes],
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        // index.html · service.html · pricing.html · contact.html = public/ 정적 마케팅 페이지 (빌드 대상 아님)
        main: 'app.html',
      },
    },
  },
})
