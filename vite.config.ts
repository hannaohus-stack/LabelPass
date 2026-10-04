import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import Sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    Sitemap({
      hostname: 'https://checker.krk.team',
      dynamicRoutes: ['/', '/pricing', '/guide/label', '/guide/rejection', '/faq'],
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main:              'index.html',
        pricing:           'pricing.html',
        'guide-label':     'guide-label.html',
        'guide-rejection': 'guide-rejection.html',
        faq:               'faq.html',
      },
    },
  },
})
