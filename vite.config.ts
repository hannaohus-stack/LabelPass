import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://checker.krk.team',
      dynamicRoutes: ['/', '/service', '/pricing', '/contact', '/guide/label', '/guide/rejection'],
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        // index.html · service.html · pricing.html · contact.html = public/ 정적 마케팅 페이지 (빌드 대상 아님)
        main:              'app.html',
        'guide-label':     'guide-label.html',
        'guide-rejection': 'guide-rejection.html',
      },
    },
  },
})
