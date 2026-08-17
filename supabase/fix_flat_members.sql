-- ============================================================
--  Fix flat_members so it works WITHOUT Supabase Auth
--  Run this in Supabase → SQL Editor → Run
-- ============================================================

-- Drop the old table and recreate with user_id as TEXT (matching app-generated IDs like 'rmswq4daf')
drop table if exists flat_members cascade;

create table flat_members (
  flat_id      uuid references flats(id) on delete cascade,
  user_id      text not null,              -- TEXT because frontend IDs are 'r...' strings, not UUIDs
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

-- RLS: anon can read and write
alter table flat_members enable row level security;

drop policy if exists "anon read members"   on flat_members;
drop policy if exists "anon insert members" on flat_members;
drop policy if exists "anon update members" on flat_members;
drop policy if exists "anon delete members" on flat_members;

create policy "anon read members"   on flat_members for select using (true);
create policy "anon insert members" on flat_members for insert with check (true);
create policy "anon update members" on flat_members for update using (true);
create policy "anon delete members" on flat_members for delete using (true);
