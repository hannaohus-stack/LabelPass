-- 2026-10-04 적용 완료 (Supabase MCP). 기록용 사본.
create table if not exists public.contact_inquiries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company text not null check (char_length(company) between 1 and 100),
  name text not null check (char_length(name) between 1 and 50),
  tel text not null check (char_length(tel) between 9 and 30),
  email text not null check (char_length(email) between 5 and 200),
  partner_type text not null check (char_length(partner_type) <= 50),
  volume text check (char_length(volume) <= 50),
  message text check (char_length(message) <= 3000),
  source_url text check (char_length(source_url) <= 300),
  status text not null default '신규' check (status in ('신규','연락함','진행중','완료','보류'))
);
comment on table public.contact_inquiries is 'LabelPass 도입문의(/contact) — Edge Function contact-submit(service role)만 쓰기. 클라이언트 직접 접근 정책 없음.';
alter table public.contact_inquiries enable row level security;
create index if not exists contact_inquiries_created_at_idx on public.contact_inquiries (created_at desc);
