-- v320 — a party finder event, scored from the board
--
-- Run this once in the Supabase SQL editor, after v319. Running it again is
-- safe.
--
-- The owner asked (2026-11-05) for the "CASH PARTY FINDER" event: members put
-- up a party on the finder, go, and prove it with a picture (the last room,
-- the chest, or 15 minutes and more in a practice room; an unsynced dungeon
-- counts only from level 80). A run is a point for everybody in the party,
-- ten a day at most, and two for a helper when one of the FC's listed new
-- players is in it. Prizes: most points, most days played, and a lucky draw
-- among the people who put the rooms up.
--
-- Almost everything is already on the board: who was confirmed in each party,
-- what it was, when, whether the lead said it went well, the group photos
-- (v75) and the pictures in its conversation. What the board cannot know is
-- whether a picture proves anything. That is Aqua's to say, and this is where
-- she says it, with the settings of the event beside it.
--
-- Two tables, admins only, every command. Nothing here is a member's to read
-- or write: the points are worked out on Aqua's page from what the board
-- already lets an admin read, so a member's run is never stored twice.
--
--   pf_events          one row an event: its window, which kinds of party
--                      count, the caps, the new-player list and the draw.
--   pf_event_reviews   one row an event and a party: ok or no.
--
-- created_by, reviewed_by and the times are pinned by triggers, so a row says
-- truthfully which admin judged what and when.

/* ── the event ───────────────────────────────────────────────────────────── */

create table if not exists public.pf_events (
  id               bigint generated always as identity primary key,
  title            text not null check (char_length(title) between 1 and 120),
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  -- Party kinds that count (lib/party.ts ContentKind). Checked against the
  -- known names so a typo cannot quietly count nothing.
  kinds            text[] not null default
                     '{dungeon,legacy,roulette,extreme,savage,ultimate,alliance,chaotic,criterion,treasure,field}',
  daily_cap        int  not null default 10 check (daily_cap between 1 and 100),
  helper_points    int  not null default 2  check (helper_points between 1 and 10),
  unsync_min_level int  not null default 80 check (unsync_min_level between 1 and 200),
  practice_minutes int  not null default 15 check (practice_minutes between 1 and 600),
  -- Whether only FC members may win. Everybody is scored and shown either way;
  -- this decides who the prizes are drawn from.
  fc_only          boolean not null default true,
  -- The FC's new players whose helpers score double: character ids.
  newbies          bigint[] not null default '{}',
  draw_count       int  not null default 10 check (draw_count between 1 and 100),
  -- The lucky draw once made: {at, pool: [ids], winners: [ids]}. Kept so a
  -- draw is made once and can be read back, not quietly made again.
  draw             jsonb,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint pf_events_window check (ends_at > starts_at),
  constraint pf_events_newbies_cap check (cardinality(newbies) <= 500),
  constraint pf_events_kinds_known check (
    cardinality(kinds) between 1 and 20
    and kinds <@ array['extreme','savage','ultimate','alliance','chaotic',
                       'treasure','fate','hunt','criterion','pvp','community',
                       'field','dungeon','mentor','roulette','legacy','other']::text[]
  ),
  constraint pf_events_draw_size check (draw is null or pg_column_size(draw) <= 65536)
);

create index if not exists pf_events_newest on public.pf_events (starts_at desc);

/* ── Aqua's word on each party ───────────────────────────────────────────── */

create table if not exists public.pf_event_reviews (
  event_id    bigint not null references public.pf_events (id) on delete cascade,
  party_id    bigint not null references public.party_posts (id) on delete cascade,
  verdict     text   not null check (verdict in ('ok', 'no')),
  note        text   check (note is null or char_length(note) <= 300),
  reviewed_by uuid   references auth.users (id) on delete set null,
  reviewed_at timestamptz not null default now(),
  primary key (event_id, party_id)
);

create index if not exists pf_event_reviews_party on public.pf_event_reviews (party_id);

/* ── who may: admins, and nobody else ────────────────────────────────────── */

alter table public.pf_events        enable row level security;
alter table public.pf_event_reviews enable row level security;

drop policy if exists pf_events_read on public.pf_events;
create policy pf_events_read on public.pf_events
  for select to authenticated using ((select public.is_admin()));
drop policy if exists pf_events_add on public.pf_events;
create policy pf_events_add on public.pf_events
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists pf_events_edit on public.pf_events;
create policy pf_events_edit on public.pf_events
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists pf_events_drop on public.pf_events;
create policy pf_events_drop on public.pf_events
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists pf_event_reviews_read on public.pf_event_reviews;
create policy pf_event_reviews_read on public.pf_event_reviews
  for select to authenticated using ((select public.is_admin()));
drop policy if exists pf_event_reviews_add on public.pf_event_reviews;
create policy pf_event_reviews_add on public.pf_event_reviews
  for insert to authenticated with check ((select public.is_admin()));
drop policy if exists pf_event_reviews_edit on public.pf_event_reviews;
create policy pf_event_reviews_edit on public.pf_event_reviews
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists pf_event_reviews_drop on public.pf_event_reviews;
create policy pf_event_reviews_drop on public.pf_event_reviews
  for delete to authenticated using ((select public.is_admin()));

-- v85: nothing is written by somebody the FC cannot name. Admins pass anyway;
-- kept so a later grant cannot open a hole, and so db-audit finds all three.
drop policy if exists pf_events_named_write on public.pf_events;
create policy pf_events_named_write on public.pf_events
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));
drop policy if exists pf_events_named_edit on public.pf_events;
create policy pf_events_named_edit on public.pf_events
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));
drop policy if exists pf_events_named_drop on public.pf_events;
create policy pf_events_named_drop on public.pf_events
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists pf_event_reviews_named_write on public.pf_event_reviews;
create policy pf_event_reviews_named_write on public.pf_event_reviews
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));
drop policy if exists pf_event_reviews_named_edit on public.pf_event_reviews;
create policy pf_event_reviews_named_edit on public.pf_event_reviews
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));
drop policy if exists pf_event_reviews_named_drop on public.pf_event_reviews;
create policy pf_event_reviews_named_drop on public.pf_event_reviews
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

-- Supabase gave anon and authenticated ALL on both tables when they were made.
revoke all on public.pf_events        from anon, authenticated;
revoke all on public.pf_event_reviews from anon, authenticated;
grant select, delete on public.pf_events to authenticated;
grant insert (title, starts_at, ends_at, kinds, daily_cap, helper_points,
              unsync_min_level, practice_minutes, fc_only, newbies, draw_count, draw)
  on public.pf_events to authenticated;
grant update (title, starts_at, ends_at, kinds, daily_cap, helper_points,
              unsync_min_level, practice_minutes, fc_only, newbies, draw_count, draw)
  on public.pf_events to authenticated;
grant select, delete on public.pf_event_reviews to authenticated;
grant insert (event_id, party_id, verdict, note) on public.pf_event_reviews to authenticated;
-- event_id and party_id too, because an upsert sets every column it sends;
-- the trigger below puts them back, so a review never moves.
grant update (event_id, party_id, verdict, note) on public.pf_event_reviews to authenticated;

/* ── who and when, said by the database ──────────────────────────────────── */

-- Invoker: these only stamp, and auth.uid() is the caller's either way.
create or replace function public.pf_events_kept()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists pf_events_kept on public.pf_events;
create trigger pf_events_kept
  before insert or update on public.pf_events
  for each row execute function public.pf_events_kept();

create or replace function public.pf_event_reviews_kept()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' then
    new.event_id := old.event_id;
    new.party_id := old.party_id;
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

drop trigger if exists pf_event_reviews_kept on public.pf_event_reviews;
create trigger pf_event_reviews_kept
  before insert or update on public.pf_event_reviews
  for each row execute function public.pf_event_reviews_kept();

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select table_name, row_security_enabled
  from (select c.relname as table_name, c.relrowsecurity as row_security_enabled
          from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname in ('pf_events', 'pf_event_reviews')) x
 order by 1;
--  pf_event_reviews | true
--  pf_events        | true

select count(*) from pg_policies
 where schemaname = 'public' and tablename in ('pf_events', 'pf_event_reviews');
--  14

select grantee, table_name, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public' and table_name in ('pf_events', 'pf_event_reviews')
   and grantee in ('anon', 'authenticated')
 order by 1, 2, 3;
--  authenticated | pf_event_reviews | DELETE
--  authenticated | pf_event_reviews | SELECT
--  authenticated | pf_events        | DELETE
--  authenticated | pf_events        | SELECT
--  (insert and update are column grants, which this view does not list)

──────────────────────────────────────────────────────────────────────────── */
