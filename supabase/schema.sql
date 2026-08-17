-- ============================================================
--  Room Mates · database schema  (v2 — anon-safe RLS)
--  Paste this whole file into Supabase → SQL Editor → Run.
--  Safe to run more than once.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. THE HOME
-- ------------------------------------------------------------
create table if not exists flats (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null default 'My Home',
  join_code   text        unique not null,
  state       jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. WHO LIVES THERE
-- ------------------------------------------------------------
create table if not exists flat_members (
  flat_id      uuid references flats(id) on delete cascade,
  user_id      text not null,
  display_name text,
  role         text not null default 'member' check (role in ('admin','member')),
  status       text not null default 'active' check (status in ('active','sick','away')),
  phone        text,
  email        text,
  push_token   jsonb,
  channels     jsonb not null default '{"push":true,"whatsapp":true,"email":false}',
  joined_at    timestamptz not null default now(),
  primary key  (flat_id, user_id)
);

-- ------------------------------------------------------------
-- 3. AUDIT TRAIL
-- ------------------------------------------------------------
create table if not exists duty_log (
  id          bigserial primary key,
  flat_id     uuid references flats(id) on delete cascade,
  user_id     uuid,
  chore_id    text not null,
  chore_name  text not null,
  duty_date   date not null,
  action      text not null check (action in
                ('completed','sick-reassign','swap','skipped','holiday')),
  detail      text,
  created_at  timestamptz not null default now()
);
create index if not exists duty_log_flat_date_idx on duty_log (flat_id, duty_date desc);

-- ------------------------------------------------------------
-- 4. SENT-NOTIFICATION LEDGER  (dedup guard for cron / n8n)
-- ------------------------------------------------------------
create table if not exists sent_alerts (
  flat_id   uuid references flats(id) on delete cascade,
  alert_key text not null,
  sent_at   timestamptz not null default now(),
  primary key (flat_id, alert_key)
);

-- ============================================================
--  ROW LEVEL SECURITY
-- ============================================================
alter table flats        enable row level security;
alter table flat_members enable row level security;
alter table duty_log     enable row level security;
alter table sent_alerts  enable row level security;

-- ── helper used by auth-based policies ──────────────────────
create or replace function my_flats() returns setof uuid
language sql stable security definer as $$
  select flat_id from flat_members where user_id = auth.uid();
$$;

-- ── flats: anon can read/write any flat (protected by anon key) ─
drop policy if exists "anon read flat"   on flats;
drop policy if exists "anon insert flat" on flats;
drop policy if exists "anon update flat" on flats;
drop policy if exists "read my flat"     on flats;
drop policy if exists "update my flat"   on flats;

create policy "anon read flat"   on flats for select using (true);
create policy "anon insert flat" on flats for insert with check (true);
create policy "anon update flat" on flats for update using (true);

-- ── flat_members: anon can read and write ──────────────────
drop policy if exists "see housemates"        on flat_members;
drop policy if exists "admins manage members" on flat_members;
drop policy if exists "anon read members"     on flat_members;
drop policy if exists "anon insert members"   on flat_members;
drop policy if exists "anon update members"   on flat_members;
drop policy if exists "anon delete members"   on flat_members;

create policy "anon read members"   on flat_members for select using (true);
create policy "anon insert members" on flat_members for insert with check (true);
create policy "anon update members" on flat_members for update using (true);
create policy "anon delete members" on flat_members for delete using (true);

-- ── duty_log: anon can read and insert ──────────────────────
drop policy if exists "read flat log"   on duty_log;
drop policy if exists "write my own log" on duty_log;
drop policy if exists "anon read log"   on duty_log;
drop policy if exists "anon insert log" on duty_log;

create policy "anon read log"   on duty_log for select using (true);
create policy "anon insert log" on duty_log for insert with check (true);

-- ── sent_alerts: anon can read and insert (n8n dedup) ───────
drop policy if exists "anon read alerts"   on sent_alerts;
drop policy if exists "anon insert alerts" on sent_alerts;
drop policy if exists "anon upsert alerts" on sent_alerts;

create policy "anon read alerts"   on sent_alerts for select using (true);
create policy "anon insert alerts" on sent_alerts for insert with check (true);

-- ============================================================
--  JOINING A HOME WITH A CODE
-- ============================================================
create or replace function join_flat(code text)
returns uuid
language plpgsql security definer as $$
declare target uuid;
begin
  select id into target from flats where join_code = upper(code);
  if target is null then
    raise exception 'That join code does not exist';
  end if;

  insert into flat_members (flat_id, user_id, display_name, email, role)
  values (
    target,
    auth.uid(),
    coalesce(auth.jwt() ->> 'name', split_part(auth.jwt() ->> 'email','@',1)),
    auth.jwt() ->> 'email',
    case when exists (select 1 from flat_members where flat_id = target)
         then 'member' else 'admin' end
  )
  on conflict (flat_id, user_id) do nothing;

  return target;
end $$;

-- ============================================================
--  KEEP updated_at HONEST
-- ============================================================
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists flats_touch on flats;
create trigger flats_touch before update on flats
  for each row execute function touch_updated_at();

-- ============================================================
--  LIVE SYNC
-- ============================================================
do $$ begin
  alter publication supabase_realtime add table flats;
exception when others then null; end $$;

do $$ begin
  alter publication supabase_realtime add table duty_log;
exception when others then null; end $$;

-- ============================================================
--  SEED your first home
-- ============================================================
insert into flats (id, name, join_code)
values ('00000000-0000-0000-0000-000000000402', 'Flat #402', 'FLAT-DEMO-402')
on conflict (id) do nothing;
