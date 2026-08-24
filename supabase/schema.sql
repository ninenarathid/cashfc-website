-- ============================================================
-- FC Member Board — Supabase schema (รันครั้งเดียวใน SQL Editor)
-- ============================================================

-- ─── โปรไฟล์สมาชิก (ผูกกับบัญชี Discord ที่ login) ───────────
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  discord_username text,
  discord_avatar   text,
  character_id     bigint unique,          -- ตัวละครที่ claim (id จาก Lodestone)
  character_name   text,
  bio              text check (char_length(bio) <= 200),
  favorite_job     text check (char_length(favorite_job) <= 8),
  accent_color     text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  is_admin         boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ─── helper: ผู้ใช้ปัจจุบันเป็นแอดมินไหม ─────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ทุกคนอ่านโปรไฟล์ได้ (เอาไปโชว์บนกระดาน)
create policy "profiles: read for everyone"
  on public.profiles for select using (true);

-- เจ้าของแก้ของตัวเองได้ / แอดมินแก้ของใครก็ได้ (เช่น ปลด claim ผิดคน)
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin update"
  on public.profiles for update
  using (public.is_admin());

-- กันสมาชิกตั้ง is_admin ให้ตัวเอง: จำกัดคอลัมน์ที่ role ปกติแก้ได้
revoke insert, update on table public.profiles from anon, authenticated;
grant update (character_id, character_name, bio, favorite_job,
              accent_color, discord_username, discord_avatar, updated_at)
  on table public.profiles to authenticated;

-- ─── สร้างแถวโปรไฟล์อัตโนมัติเมื่อมีคน login ครั้งแรก ─────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, discord_username, discord_avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name',
             new.raw_user_meta_data ->> 'name',
             new.raw_user_meta_data ->> 'user_name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── ข้อมูล override รายตัวละคร (แอดมินคุมกระดาน) ────────────
create table public.member_overrides (
  character_id bigint primary key,
  hidden       boolean not null default false,  -- ซ่อนจากกระดาน
  note         text check (char_length(note) <= 200),
  updated_at   timestamptz not null default now()
);

alter table public.member_overrides enable row level security;

create policy "overrides: read for everyone"
  on public.member_overrides for select using (true);

create policy "overrides: admin write"
  on public.member_overrides for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── ประกาศจาก FC (แอดมินโพสต์ หน้าแรกแสดง) ─────────────────
create table public.announcements (
  id         bigint generated always as identity primary key,
  title      text not null check (char_length(title) <= 120),
  body       text check (char_length(body) <= 2000),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.announcements enable row level security;

create policy "announcements: read for everyone"
  on public.announcements for select using (true);

create policy "announcements: admin write"
  on public.announcements for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- หลังจาก login ด้วย Discord ครั้งแรก ให้ตั้งตัวเองเป็นแอดมิน
-- ด้วยคำสั่งนี้ (แก้ชื่อเป็น Discord ของคุณ):
--
--   update public.profiles set is_admin = true
--   where discord_username = 'ชื่อDiscordของคุณ';
--
-- หรือดู id ก่อนด้วย: select id, discord_username from public.profiles;
-- ============================================================
