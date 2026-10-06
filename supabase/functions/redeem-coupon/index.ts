// redeem-coupon — LabelPass 베타 자체 쿠폰 사용(검증·1회 소진)
// 흐름: 코드 수신 → RPC beta_redeem_coupon(원자적 소진) → ok면 tier 반환
// verify_jwt = false (공개). 허용 출처 + 입력 검증으로 보호.
//
// 배포: supabase functions deploy redeem-coupon --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = [
  /^https:\/\/(www\.)?labelpass\.kr$/,
  /^https:\/\/labelpass(-[a-z0-9-]+)?\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];

function cors(origin: string | null) {
  const ok = !!origin && ALLOWED.some((r) => r.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'https://labelpass.kr',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

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
  const code = typeof b.code === 'string' ? b.code.trim().slice(0, 32) : '';
  if (!code) return json({ ok: false, error: 'invalid' }, 400);

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.rpc('beta_redeem_coupon', { p_code: code });
  if (error || !data?.[0]) {
    console.error('[redeem-coupon] rpc error', error?.message);
    return json({ ok: false, error: 'server' }, 500);
  }
  const r = data[0] as { status: string; tier: string | null };
  if (r.status === 'ok') return json({ ok: true, tier: r.tier ?? 'pro' });
  // not_found | used | expired | ineligible → 사용 불가
  return json({ ok: false, error: r.status }, 200);
});
