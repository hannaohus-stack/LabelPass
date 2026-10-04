import { CATS, getPosts } from '../lib/posts';

export async function GET({ site }: { site: URL }) {
  const posts = await getPosts();
  const origin = String(site).replace(/\/$/, '');
  const urls = [
    '/',
    ...CATS.map((c) => `/category/${c.k}`),
    ...posts.map((p) => `/${p.slug}`),
  ];
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${origin}${base}${u === '/' ? '' : u}</loc></url>`)
    .join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
