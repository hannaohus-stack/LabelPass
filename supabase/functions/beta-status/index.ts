// beta-status — 베타 모집 현황(남은 자리 수) 공개 조회. 홈의 상단 띠·팝업이 사용한다.
// 개인정보는 반환하지 않는다 (cap, remaining 숫자만). verify_jwt = false (공개 조회).
// 배포: supabase functions deploy beta-status --no-verify-jwt
// Secrets: BETA_CAP (선택, 기본 30)
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}

Deno.serve(async (req) => {
  const h = cors(req.headers.get('origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: h });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...h, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' },
    });

  const capEnv = Number(Deno.env.get('BETA_CAP'));
  const cap = Number.isFinite(capEnv) && capEnv > 0 ? capEnv : 30;

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  // beta_apply RPC 와 같은 기준: 대상(eligible)이면서 대기자가 아닌 신청
  const { count, error } = await supabase
    .from('beta_applications')
    .select('id', { count: 'exact', head: true })
    .eq('eligible', true)
    .eq('is_waitlist', false);
  if (error || count === null) {
    console.error('[beta-status] count error', error?.message);
    return json({ ok: false }, 500);
  }
  return json({ ok: true, cap, remaining: Math.max(0, cap - count) });
});
