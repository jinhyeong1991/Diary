-- My-Local-Pulse Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run 하세요.

-- 1) 접속 허용 명단 (여기에 있는 이메일만 데이터를 읽고 쓸 수 있음)
create table if not exists public.team_allowlist (
  email text primary key,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_allowlist
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.team_allowlist
    where lower(email) = lower(auth.jwt() ->> 'email') and is_admin
  );
$$;

-- 2) 직원 프로필 (팀 화면에 표시되는 이름·색상)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text not null default '',
  color text not null default '#007AFF',
  updated_at timestamptz not null default now()
);

-- 3) 각자 데이터 (user-storage / schedule-storage / memo-storage)
create table if not exists public.user_data (
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null check (key in ('user-storage', 'schedule-storage', 'memo-storage')),
  data jsonb not null,
  device_id text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before insert or update on public.user_data
  for each row execute function public.touch_updated_at();

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before insert or update on public.profiles
  for each row execute function public.touch_updated_at();

-- 프로젝트 생성 시 'Automatically expose new tables'를 껐어도 앱이 접근할 수 있도록 명시 (실제 허용 범위는 아래 RLS가 결정)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.team_allowlist, public.profiles, public.user_data to authenticated;

-- 4) 접근 권한 (RLS)
alter table public.team_allowlist enable row level security;
alter table public.profiles enable row level security;
alter table public.user_data enable row level security;

drop policy if exists allowlist_read on public.team_allowlist;
create policy allowlist_read on public.team_allowlist
  for select using (public.is_member());

drop policy if exists allowlist_admin_write on public.team_allowlist;
create policy allowlist_admin_write on public.team_allowlist
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles
  for select using (public.is_member());

drop policy if exists profiles_write_own on public.profiles;
create policy profiles_write_own on public.profiles
  for all using (id = auth.uid() and public.is_member())
  with check (id = auth.uid() and public.is_member());

-- 내 데이터는 전부 보기, 다른 직원은 일정(schedule-storage)만 보기. 메모는 본인만.
drop policy if exists user_data_read on public.user_data;
create policy user_data_read on public.user_data
  for select using (
    public.is_member()
    and (user_id = auth.uid() or key = 'schedule-storage')
  );

drop policy if exists user_data_write_own on public.user_data;
create policy user_data_write_own on public.user_data
  for all using (user_id = auth.uid() and public.is_member())
  with check (user_id = auth.uid() and public.is_member());

-- 5) 실시간 반영
do $$
begin
  alter publication supabase_realtime add table public.user_data;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- 6) 관리자(본인) 등록 — 아래 이메일을 본인 이메일로 바꿔서 실행
-- insert into public.team_allowlist (email, is_admin) values ('me@example.com', true);
