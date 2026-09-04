-- ─── Custom badges (made by admins, given to members) ────────────────────
--
-- Two tables rather than one row per award, because a badge given to twenty
-- people is one thing given twenty times: renaming it or changing its colour
-- should be one edit, and "who else has this?" should be a question the data
-- can answer.

create table public.badges (
  id          bigint generated always as identity primary key,
  -- The Thai text and the English text, the same pair announcements use: the
  -- base column is what the badge says, and the _en column is the English
  -- version shown only when the reader has the site in English. An unfilled
  -- _en falls back rather than blanking, so a badge is never nameless.
  label       text not null check (char_length(label) between 1 and 32),
  label_en    text check (char_length(label_en) <= 32),
  description text check (char_length(description) <= 160),
  description_en text check (char_length(description_en) <= 160),
  -- A PNG an admin uploaded, in the post-images bucket. Optional: a badge is
  -- its words first, and one with no picture is a plain plaque rather than a
  -- broken one.
  icon_url    text,
  -- A key from BADGE_COLORS in lib/badge-colors.ts, not a hex value: the
  -- palette is chosen once, against this theme, and a free-text colour is how
  -- a board ends up with a badge nobody can read.
  color       text not null default 'gold' check (char_length(color) <= 16),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.member_badges (
  badge_id     bigint not null references public.badges (id) on delete cascade,
  -- The Lodestone character id, the same key member_overrides uses. Not a
  -- profile id: a badge belongs to the character on the board, whether or not
  -- the person behind it has ever logged in.
  character_id bigint not null,
  -- Why this one got it, where the badge itself is general ("Raid lead" the
  -- badge, "Cleared FRU first" the reason).
  note         text check (char_length(note) <= 120),
  awarded_by   uuid references public.profiles (id) on delete set null,
  awarded_at   timestamptz not null default now(),
  primary key (badge_id, character_id)
);

-- Every page that shows badges asks by character, so that is the index.
create index member_badges_character_idx on public.member_badges (character_id);

alter table public.badges enable row level security;
alter table public.member_badges enable row level security;

create policy "badges: read for everyone"
  on public.badges for select using (true);

create policy "badges: admin write"
  on public.badges for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "member badges: read for everyone"
  on public.member_badges for select using (true);

create policy "member badges: admin write"
  on public.member_badges for all
  using (public.is_admin())
  with check (public.is_admin());

-- ─── One badge to look at ────────────────────────────────────────────────
-- So the member page and the board have something on them the moment this
-- runs. Delete it from the admin screen once you have seen it — the Badges
-- tab will show it with a Delete button, like any other.

with new_badge as (
  insert into public.badges (label, label_en, description, description_en, color)
  values ('เรดเดอร์ยอดเยี่ยม', 'Best Raider',
          'ผ่าน Ultimate และเคลียร์ tier ปัจจุบันครบ',
          'Cleared an Ultimate and the whole current tier',
          'gold')
  returning id
)
insert into public.member_badges (badge_id, character_id, note)
select id, 5644067, 'FRU + M9S-M12S' from new_badge;
