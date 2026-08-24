-- ============================================================
-- FC Member Board — Supabase schema (run once in the SQL Editor)
-- ============================================================

-- ─── Member profiles (tied to the logged-in Discord account) ─────────────
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  discord_username text,
  discord_avatar   text,
  character_id     bigint unique,          -- claimed character (Lodestone id)
  character_name   text,
  bio              text check (char_length(bio) <= 200),
  favorite_job     text check (char_length(favorite_job) <= 8),
  accent_color     text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  is_admin         boolean not null default false,
  updated_at       timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ─── helper: is the current user an admin? ───────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Everyone can read profiles (they are shown on the board)
create policy "profiles: read for everyone"
  on public.profiles for select using (true);

-- Owners edit their own row; admins edit anyone (e.g. to release a wrong claim)
create policy "profiles: owner update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles: admin update"
  on public.profiles for update
  using (public.is_admin());

-- Stop members granting themselves is_admin: restrict the columns a normal role may write
revoke insert, update on table public.profiles from anon, authenticated;
grant update (character_id, character_name, bio, favorite_job,
              accent_color, discord_username, discord_avatar, updated_at)
  on table public.profiles to authenticated;

-- ─── Create the profile row automatically on first login ─────────────────
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

-- ─── Per-character overrides (admin control over the board) ──────────────
create table public.member_overrides (
  character_id bigint primary key,
  hidden       boolean not null default false,  -- hide from the board
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

-- ─── FC announcements (posted by admins, shown on the home page) ─────────
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
-- After logging in with Discord for the first time, make yourself an admin
-- with this statement (swap in your own Discord name):
--
--   update public.profiles set is_admin = true
--   where discord_username = 'yourDiscordName';
--
-- To look up the name first: select id, discord_username from public.profiles;
-- ============================================================
