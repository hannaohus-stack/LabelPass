import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// 라벨패스 블로그
// - 독립 배포(blog.labelpass.kr): blog/vercel.json 이 BLOG_STANDALONE=1 로 빌드 → base '/', outDir 'dist'
// - 기존 방식(labelpass.kr/blog): 루트 `npm run build` 가 ../dist/blog 로 빌드 (도메인 전환 전까지 유지)
const standalone = process.env.BLOG_STANDALONE === '1';

export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: standalone ? 'https://blog.labelpass.kr' : 'https://labelpass.kr',
  base: standalone ? '/' : '/blog',
  outDir: standalone ? './dist' : '../dist/blog',
  trailingSlash: 'ignore',
  build: { format: 'directory', assets: '_astro' },
});
