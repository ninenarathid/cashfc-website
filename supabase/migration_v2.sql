-- ============================================================
-- Migration v2 — รันหลัง schema.sql (SQL Editor รันครั้งเดียว)
-- เพิ่ม: timeline_posts, kudos (popoto), site_settings,
--        คอลัมน์โปรไฟล์ใหม่ (lfg, banner), สิทธิ์ซ่อนตัวเอง
-- ============================================================

-- ─── โพสต์ timeline ของ FC (แอดมินเพิ่มเอง) ─────────────────
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

-- ─── popoto kudos 🥔 (ส่งได้วันละ 1 ครั้ง/ผู้รับ) ─────────────
create table public.kudos (
  id                    bigint generated always as identity primary key,
  sender_id             uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null,
  day                   date not null default current_date,
  created_at            timestamptz not null default now(),
  unique (sender_id, receiver_character_id, day)   -- กันสแปมที่ระดับ DB
);
alter table public.kudos enable row level security;
create policy "kudos: read for everyone"
  on public.kudos for select using (true);
create policy "kudos: send as yourself"
  on public.kudos for insert
  with check (auth.uid() = sender_id);

-- ─── การตั้งค่าเว็บ (discord id / invite ฯลฯ) ────────────────
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

-- ─── โปรไฟล์: สถานะ "กำลังหา" + แบนเนอร์หน้าโปรไฟล์ ─────────
alter table public.profiles
  add column lfg text[] not null default '{}',
  add column banner text;
grant update (lfg, banner) on table public.profiles to authenticated;

-- ─── สมาชิกซ่อน "ตัวเอง" จากกระดานได้ (ต้อง claim ก่อน) ──────
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
