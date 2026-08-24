-- ============================================================
-- Migration v2 — run after schema.sql (once, in the SQL Editor)
-- Adds: timeline_posts, kudos (popoto), site_settings,
--       new profile columns (lfg, banner), self-hide permission
-- ============================================================

-- ─── FC timeline posts (written by admins) ───────────────────────────────
create table public.timeline_posts (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) <= 120),
  body       text check (char_length(body) <= 1000),
  url        text,
  posted_at  date not null default current_date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.timeline_posts enable row level security;
create policy "timeline: read for everyone"
  on public.timeline_posts for select using (true);
create policy "timeline: admin write"
  on public.timeline_posts for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── popoto kudos 🥔 (one per recipient per day) ─────────────────────────
create table public.kudos (
  id                    bigint generated always as identity primary key,
  sender_id             uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null,
  day                   date not null default current_date,
  created_at            timestamptz not null default now(),
  unique (sender_id, receiver_character_id, day)   -- anti-spam enforced by the DB
);
alter table public.kudos enable row level security;
create policy "kudos: read for everyone"
  on public.kudos for select using (true);
create policy "kudos: send as yourself"
  on public.kudos for insert
  with check (auth.uid() = sender_id);

-- ─── Site settings (discord id / invite / etc.) ──────────────────────────
create table public.site_settings (
  key        text primary key,
  value      text,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
create policy "settings: read for everyone"
  on public.site_settings for select using (true);
create policy "settings: admin write"
  on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- ─── Profiles: "looking for" status + profile banner ─────────────────────
alter table public.profiles
  add column lfg text[] not null default '{}',
  add column banner text;
grant update (lfg, banner) on table public.profiles to authenticated;

-- ─── Members can hide themselves from the board (must claim first) ───────
create policy "overrides: owner self-manage"
  on public.member_overrides for all
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.character_id = member_overrides.character_id))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.character_id = member_overrides.character_id));
