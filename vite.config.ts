import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://labelpass.kr',
      dynamicRoutes: ['/', '/service', '/pricing', '/contact'],
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
