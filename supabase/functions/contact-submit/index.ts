// contact-submit — LabelPass 도입문의(/contact) 저장
// 정적 페이지에서 키 없이 호출 → 서버(service role)에서 검증 후 contact_inquiries 에 1행 저장.
// verify_jwt = false (공개 폼). 대신 허용 출처 · 입력 검증 · 허니팟으로 막는다.
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = [
  /^https:\/\/(www\.)?labelpass\.kr$/,
  /^https:\/\/labelpass(-[a-z0-9-]+)?\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];
const TYPES = ['라벨 디자이너', '브랜딩 에이전시', '인쇄소', '공유주방', '창업보육 · 교육기관', '기타'];

function cors(origin: string | null) {
  const ok = !!origin && ALLOWED.some((r) => r.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'https://labelpass.kr',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    Vary: 'Origin',
  };
}
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const h = cors(origin);
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  if (!origin || !ALLOWED.some((r) => r.test(origin))) return json({ ok: false, error: 'origin' }, 403);

  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return json({ ok: false, error: 'body' }, 400); }
  if (s(b.website, 100)) return json({ ok: true }); // 허니팟: 봇이면 저장 없이 성공처럼 응답

  const row = {
    company: s(b.company, 100), name: s(b.name, 50), tel: s(b.tel, 30), email: s(b.email, 200),
    partner_type: s(b.type, 50), volume: s(b.volume, 50) || null, message: s(b.message, 3000) || null,
    source_url: s(b.source_url, 300) || null,
  };
  const bad =
    !row.company || !row.name || !/^[0-9\-\s+]{9,}$/.test(row.tel) ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email) || !TYPES.includes(row.partner_type) || b.agree !== true;
  if (bad) return json({ ok: false, error: 'invalid' }, 422);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.from('contact_inquiries').insert(row);
  if (error) { console.error('[contact-submit]', error.message); return json({ ok: false, error: 'db' }, 500); }
  return json({ ok: true });
});
