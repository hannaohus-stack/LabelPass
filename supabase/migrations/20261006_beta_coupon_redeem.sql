-- 2026-10-06 LabelPass 베타 — 자체 쿠폰 사용(검증·소진) 추가
-- 배경: Lemon Squeezy 승인 지연 → LS 체크아웃 대신 앱 내부에서 쿠폰을 검증해 전문(pro) 결과물을 무료 제공.
--       발행은 기존 beta-apply(코드 생성·저장) 그대로. 여기서는 '사용(1회 소진)'만 추가한다.
-- ⚠️ Supabase SQL Editor 또는 MCP로 1회 실행 (여러 번 실행해도 안전: if not exists / create or replace).

-- 1) 사용 추적 컬럼
alter table public.beta_applications
  add column if not exists coupon_used        boolean not null default false,
  add column if not exists coupon_redeemed_at timestamptz;

-- 2) 쿠폰 사용 RPC — 단일 UPDATE로 원자적 소진 (동시 중복 사용 방지)
--    status: ok | not_found | used | expired | ineligible
create or replace function public.beta_redeem_coupon(p_code text)
returns table (status text, tier text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_id   uuid;
  v_row  public.beta_applications%rowtype;
begin
  if v_code = '' then
    return query select 'not_found'::text, null::text; return;
  end if;

  -- 유효한 코드만 원자적으로 소진
  update public.beta_applications
     set coupon_used = true, coupon_redeemed_at = now()
   where upper(btrim(coupon_code)) = v_code
     and coupon_issued
     and eligible
     and not coupon_used
     and (coupon_expires_at is null or coupon_expires_at > now())
   returning id into v_id;

  if v_id is not null then
    return query select 'ok'::text, 'pro'::text; return;
  end if;

  -- 실패 사유 판별 (메시지용)
  select * into v_row from public.beta_applications
   where upper(btrim(coupon_code)) = v_code limit 1;
  if not found then
    return query select 'not_found'::text, null::text;
  elsif v_row.coupon_used then
    return query select 'used'::text, null::text;
  elsif v_row.coupon_expires_at is not null and v_row.coupon_expires_at <= now() then
    return query select 'expired'::text, null::text;
  elsif not v_row.eligible or not v_row.coupon_issued then
    return query select 'ineligible'::text, null::text;
  else
    return query select 'not_found'::text, null::text;
  end if;
end $$;

revoke all on function public.beta_redeem_coupon(text) from public, anon, authenticated;
grant execute on function public.beta_redeem_coupon(text) to service_role;

comment on function public.beta_redeem_coupon(text) is '베타 쿠폰 1회 사용. Edge Function redeem-coupon(service role)만 호출. 성공 시 coupon_used=true.';
