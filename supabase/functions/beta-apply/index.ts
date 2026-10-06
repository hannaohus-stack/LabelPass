// beta-apply — LabelPass 베타 신청 접수 + 신청자별 일회용 쿠폰 발급
// 흐름: 검증 → DB RPC beta_apply(정원·중복·대상 판정) → Lemon Squeezy 할인코드 1개 생성(max_redemptions=1) → 저장 → NPS 메일 예약
// verify_jwt = false (공개 폼). 대신 허용 출처 · 입력 검증 · 허니팟 · 동의 필수.
//
// 배포: supabase functions deploy beta-apply --no-verify-jwt
// Secrets (supabase secrets set):
//   LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID          (기존 lemonsqueezy-checkout 과 동일)
//   LEMONSQUEEZY_BETA_VARIANT_ID   (권장) 쿠폰을 적용할 상품 variant ID — 없으면 스토어 전 상품에 쓸 수 있는 코드가 됨
//   LEMONSQUEEZY_BETA_CHECKOUT_URL (선택) 기본값: 기존 베타 체크아웃 링크(코드 파라미터 제외)
//   BETA_CAP                       (선택) 정원, 기본 30
//   BETA_DISCOUNT_PERCENT          (선택) 할인율, 기본 100
//   BETA_COUPON_DAYS               (선택) 유효기간(일), 기본 14
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = [
  /^https:\/\/(www\.)?labelpass\.kr$/,
  /^https:\/\/labelpass(-[a-z0-9-]+)?\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
];
// business_type 컬럼에는 '판매 채널'을 저장한다 (컬럼명 유지 — 마이그레이션 불필요)
const BUSINESS = ['스마트스토어', '자사몰', '입점몰', '오프라인', '판매전'];
const CATEGORY = ['간편식냉동냉장', '떡디저트베이커리', '잼소스장'];
// 기타는 '기타:직접입력' 형태 (최대 30자)
const isCategoryOk = (c: string) => CATEGORY.includes(c) || (c.startsWith('기타:') && c.length > 3);
const PRODUCTION = ['자체제조', 'OEM', '완제품재판매', '준비중'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_CHECKOUT = 'https://krkkorea.lemonsqueezy.com/checkout/buy/dba849bf-3cf7-4921-957d-f4c58477f246';

function cors(origin: string | null) {
  const ok = !!origin && ALLOWED.some((r) => r.test(origin));
  return {
    'Access-Control-Allow-Origin': ok ? origin! : 'https://labelpass.kr',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
}
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (name: string, fallback: number) => {
  const n = Number(Deno.env.get(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

// 헷갈리는 문자(0/O, 1/I) 제외. Lemon Squeezy 코드는 영문 대문자+숫자만 사용.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return 'LPB' + Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

async function createLsDiscount(appId: string, expiresAt: Date): Promise<string> {
  const apiKey = Deno.env.get('LEMONSQUEEZY_API_KEY');
  const storeId = Deno.env.get('LEMONSQUEEZY_STORE_ID');
  if (!apiKey || !storeId) throw new Error('ls_env_missing');
  const variantId = Deno.env.get('LEMONSQUEEZY_BETA_VARIANT_ID');
  const percent = num('BETA_DISCOUNT_PERCENT', 100);

  // 코드 충돌(드물게) 대비 최대 3회 재시도
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = randomCode();
    const relationships: Record<string, unknown> = {
      store: { data: { type: 'stores', id: String(storeId) } },
    };
    if (variantId) relationships.variants = { data: [{ type: 'variants', id: String(variantId) }] };

    const res = await fetch('https://api.lemonsqueezy.com/v1/discounts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'discounts',
          attributes: {
            name: `LabelPass Beta ${appId.slice(0, 8)}`,
            code,
            amount: percent,
            amount_type: 'percent',
            duration: 'once',
            is_limited_to_products: !!variantId,
            is_limited_redemptions: true,
            max_redemptions: 1,
            expires_at: expiresAt.toISOString(),
          },
          relationships,
        },
      }),
    });
    if (res.ok) return code;
    const body = await res.text();
    console.error('[beta-apply] LS discount error', res.status, body);
    if (res.status !== 422) break; // 422(코드 중복 등)만 재시도
  }
  throw new Error('ls_discount_failed');
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
  if (s(b.website, 100)) return json({ ok: true, status: 'accepted', coupon: null }); // 허니팟

  const email = s(b.email, 200);
  const input = {
    business_type: s(b.business_type, 30),
    category: s(b.category, 30),
    production_type: s(b.production_type, 30),
    pain_point: s(b.pain_point, 500),
  };
  if (!BUSINESS.includes(input.business_type) || !isCategoryOk(input.category) ||
      !PRODUCTION.includes(input.production_type) || !input.pain_point || !EMAIL_RE.test(email)) {
    return json({ ok: false, error: 'invalid' }, 400);
  }
  if (b.consent !== true) return json({ ok: false, error: 'consent' }, 400);

  const utm = (b.utm ?? {}) as Record<string, unknown>;
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const cap = num('BETA_CAP', 30);

  const { data, error } = await supabase.rpc('beta_apply', {
    p_business_type: input.business_type,
    p_category: input.category,
    p_production_type: input.production_type,
    p_pain_point: input.pain_point,
    p_contact: email,
    p_utm_source: s(utm.source, 100) || null,
    p_utm_medium: s(utm.medium, 100) || null,
    p_utm_campaign: s(utm.campaign, 100) || null,
    p_utm_content: s(utm.content, 100) || null,
    p_cap: cap,
  });
  if (error || !data?.[0]) {
    console.error('[beta-apply] rpc error', error?.message);
    return json({ ok: false, error: 'server' }, 500);
  }
  const r = data[0] as { status: string; application_id: string; coupon_code: string | null; coupon_expires_at: string | null };

  // 대상 외 / 대기자 — 쿠폰 없음
  if (r.status === 'ineligible' || r.status === 'waitlist') return json({ ok: true, status: r.status, coupon: null });

  // 자체 쿠폰: LS 체크아웃 대신 앱 내부(/creator)로 유도. 코드는 결제 화면에서 검증·소진된다.
  const appBase = (origin && ALLOWED.some((r) => r.test(origin))) ? origin : 'https://labelpass.kr';
  const withCode = (code: string) => `${appBase}/creator?coupon=${encodeURIComponent(code)}`;

  // 이미 발급된 코드가 있는 중복 신청 → 같은 코드를 다시 보여준다 (새 코드 발급 금지)
  if (r.status === 'duplicate' && r.coupon_code) {
    return json({ ok: true, status: 'duplicate', coupon: r.coupon_code, checkoutUrl: withCode(r.coupon_code), expiresAt: r.coupon_expires_at });
  }

  // 신규 접수(accepted) 또는 발급 실패 후 재신청(duplicate, 코드 없음) → 코드 발급
  try {
    const expiresAt = new Date(Date.now() + num('BETA_COUPON_DAYS', 14) * 86400_000);
    // 자체 발급 코드 (LS API 미사용). 결제 화면에서 redeem-coupon 으로 검증·1회 소진.
    const code = randomCode();
    const { error: upErr } = await supabase.from('beta_applications')
      .update({ coupon_code: code, coupon_issued: true, coupon_expires_at: expiresAt.toISOString() })
      .eq('id', r.application_id);
    if (upErr) console.error('[beta-apply] coupon save error', upErr.message);

    // 3일 뒤 NPS 설문 메일 예약 (best-effort, 실패해도 쿠폰 노출은 막지 않음)
    // (코드를 새로 만든 경우에만 도달 → 신청당 1회만 예약됨)
    const { error: qErr } = await supabase.from('nps_email_queue').insert({
      email, application_id: r.application_id,
      send_at: new Date(Date.now() + 3 * 86400_000).toISOString(), sent: false,
    });
    if (qErr) console.error('[beta-apply] nps queue error', qErr.message);
    return json({ ok: true, status: 'accepted', coupon: code, checkoutUrl: withCode(code), expiresAt: expiresAt.toISOString() });
  } catch (e) {
    console.error('[beta-apply] coupon issue failed', e);
    // 신청은 저장됨. 같은 이메일로 다시 신청하면 코드 발급을 재시도한다.
    return json({ ok: false, error: 'coupon_failed', retry: true }, 502);
  }
});
