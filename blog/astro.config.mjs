import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

// 라벨패스 블로그 — 메인 앱과 같은 도메인의 /blog 아래로 빌드된다.
// 루트 `npm run build`가 vite build 후 이 빌드를 실행해 ../dist/blog 에 결과를 넣는다.
export default defineConfig({
  integrations: [mdx()],
  output: 'static',
  site: 'https://labelpass.kr',
  base: '/blog',
  outDir: '../dist/blog',
  trailingSlash: 'ignore',
  build: { format: 'directory', assets: '_astro' },
});
