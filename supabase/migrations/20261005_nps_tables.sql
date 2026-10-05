-- 2026-10-05 LabelPass 베타 — NPS 설문 메일 예약 큐 + 설문 응답 테이블 (없으면 생성, 여러 번 실행해도 안전)
-- beta-apply 가 신청 직후 nps_email_queue 에 "3일 뒤 발송" 행을 넣고, send-nps-emails(pg_cron)가 읽어 간다.

create table if not exists public.nps_email_queue (
  id             uuid primary key default gen_random_uuid(),
  email          text not null,
  application_id uuid references public.beta_applications(id) on delete cascade,
  send_at        timestamptz not null,
  sent           boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists nps_email_queue_due_idx on public.nps_email_queue (send_at) where sent = false;
-- 쓰기·읽기는 service role(Edge Function)만. 정책을 만들지 않으면 anon/authenticated 는 접근 불가.
alter table public.nps_email_queue enable row level security;

create table if not exists public.beta_nps (
  id           uuid primary key default gen_random_uuid(),
  nps_score    int  not null check (nps_score between 0 and 10),
  best_feature text,
  worst_point  text,
  interview_ok boolean,
  contact      text,
  created_at   timestamptz not null default now()
);
alter table public.beta_nps enable row level security;
-- 설문 페이지(/beta/nps)가 로그인 없이 제출하므로 insert 만 허용 (조회·수정·삭제 불가)
drop policy if exists beta_nps_insert_anon on public.beta_nps;
create policy beta_nps_insert_anon on public.beta_nps for insert to anon, authenticated with check (true);
