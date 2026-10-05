-- 2026-10-05 LabelPass 베타 — 신청자별 일회용 쿠폰 / 정원 30 / 중복 방지 / 대상 구분 / UTM / 동의
-- ⚠️ 아직 적용 전. Supabase SQL Editor 또는 MCP로 1회 실행 (여러 번 실행해도 안전: if not exists).
-- 신청 처리는 Edge Function beta-apply(service role)만 한다. 클라이언트 직접 insert/update 는 막는다.

-- 1) beta_applications 컬럼 추가 (기존 컬럼: id, business_type, category, pain_point, contact, is_waitlist, coupon_issued)
alter table public.beta_applications
  add column if not exists production_type    text,         -- 자체제조 / OEM / 완제품재판매 / 준비중
  add column if not exists eligible           boolean not null default true,  -- false = 완제품 재판매 등 대상 외 (정원·쿠폰 제외)
  add column if not exists coupon_code        text,         -- 신청자별 일회용 코드 (Lemon Squeezy 발급)
  add column if not exists coupon_expires_at  timestamptz,
  add column if not exists consent_at         timestamptz,  -- 개인정보 수집·이용 동의 시각
  add column if not exists utm_source         text,
  add column if not exists utm_medium         text,
  add column if not exists utm_campaign       text,
  add column if not exists utm_content        text,         -- 소재 구분 (A1/A2/B1/B2)
  add column if not exists created_at         timestamptz not null default now();

create index if not exists beta_applications_created_at_idx on public.beta_applications (created_at desc);
create index if not exists beta_applications_utm_content_idx on public.beta_applications (utm_content);

-- 2) 이메일 중복 방지 (대소문자·공백 무시). 기존 중복 행이 있으면 건너뛰고 NOTICE만 남긴다.
do $$
begin
  create unique index if not exists beta_applications_contact_uniq
    on public.beta_applications (lower(btrim(contact)));
exception when unique_violation then
  raise notice '기존 데이터에 중복 이메일이 있어 unique 인덱스를 만들지 못했습니다. 중복 정리 후 다시 실행하세요. (함수 내 중복 검사는 그대로 동작)';
end $$;

-- 3) 클라이언트 직접 접근 차단 (RLS 켜고 정책 제거). 쓰기는 service role(Edge Function)만.
alter table public.beta_applications enable row level security;
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'beta_applications' loop
    execute format('drop policy %I on public.beta_applications', p.policyname);
  end loop;
end $$;

-- 4) 신청 접수 RPC — 정원/중복을 한 트랜잭션에서 잠그고 판정 (동시 신청 경합 방지)
--    status: accepted | waitlist | ineligible | duplicate
create or replace function public.beta_apply(
  p_business_type   text,
  p_category        text,
  p_production_type text,
  p_pain_point      text,
  p_contact         text,
  p_utm_source      text,
  p_utm_medium      text,
  p_utm_campaign    text,
  p_utm_content     text,
  p_cap             int default 30
) returns table (status text, application_id uuid, coupon_code text, coupon_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email    text := lower(btrim(p_contact));
  v_existing public.beta_applications%rowtype;
  v_count    int;
  v_eligible boolean := p_production_type in ('자체제조', 'OEM', '준비중');
  v_waitlist boolean := false;
  v_id       uuid;
begin
  perform pg_advisory_xact_lock(hashtext('beta_apply'));   -- 신청 직렬화

  select * into v_existing from public.beta_applications
   where lower(btrim(contact)) = v_email limit 1;
  if found then
    return query select 'duplicate'::text, v_existing.id, v_existing.coupon_code, v_existing.coupon_expires_at;
    return;
  end if;

  if v_eligible then
    select count(*) into v_count from public.beta_applications
     where eligible and not is_waitlist;
    v_waitlist := v_count >= p_cap;
  end if;

  insert into public.beta_applications
    (business_type, category, production_type, pain_point, contact,
     eligible, is_waitlist, coupon_issued, consent_at,
     utm_source, utm_medium, utm_campaign, utm_content)
  values
    (p_business_type, p_category, p_production_type, p_pain_point, btrim(p_contact),
     v_eligible, v_waitlist, false, now(),
     p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content)
  returning id into v_id;

  return query select
    (case when not v_eligible then 'ineligible' when v_waitlist then 'waitlist' else 'accepted' end)::text,
    v_id, null::text, null::timestamptz;
end $$;

revoke all on function public.beta_apply(text,text,text,text,text,text,text,text,text,int) from public, anon, authenticated;
grant execute on function public.beta_apply(text,text,text,text,text,text,text,text,text,int) to service_role;

-- 5) 쿠폰 발급 기록 RPC 불필요 — Edge Function이 service role로 직접 update 한다.
comment on column public.beta_applications.coupon_code is '신청자별 일회용 코드(Lemon Squeezy discount, max_redemptions=1). 공용 코드 KRKBETA 폐기.';
