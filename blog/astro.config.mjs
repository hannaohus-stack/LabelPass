import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx(), react()],
  output: 'static', // or 'server' for SSR
  site: 'https://blog.krk.team',
});
