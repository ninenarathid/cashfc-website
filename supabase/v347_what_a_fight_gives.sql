-- v347 — what a fight gives
--
-- Run this once in the Supabase SQL editor, after v346. Running it again is
-- safe.
--
-- The owner, 2026-11-25: a guide should also say what the fight gives — the
-- token and how many a clear drops, the weapons it buys and their item level,
-- what they look like, the rare mount and what that looks like.
--
-- One row per reward of a guide:
--
--   kind      token | weapon | mount | minion | orchestrion | accessory | other
--   name      the item's name as the English client shows it
--   ilvl      its item level, where it has one
--   say       how to get it and what it is for, in Thai; say_en in English
--   icon      the game's own icon, kept in the guides bucket (a path, never a
--             URL, as for every picture here)
--   pics      up to four pictures of it, with a caption each (the same shape,
--             and the same check, as a step's reference pictures)
--   pieces    for a set of things — one weapon per job — up to forty
--             {name, job, icon}, each icon a path in the bucket
--
-- And what it asks before you can go in, at the top of the guide (the same
-- day): the level, the average item level, how many players, the time limit,
-- and how to unlock it (unlock / unlock_en), as columns of the guide.
--
-- Read and written exactly as guide_steps: anybody reads the rewards of a
-- published guide, admins read the drafts', only admins write, and the
-- verified-character trio stands guard as on every table a browser writes.

/* ── what a fight asks before you go in ───────────────────────────────────── */

alter table public.guides add column if not exists req_level smallint
  check (req_level is null or req_level between 1 and 100);
alter table public.guides add column if not exists req_ilvl smallint
  check (req_ilvl is null or req_ilvl between 1 and 999);
alter table public.guides add column if not exists req_party smallint
  check (req_party is null or req_party between 1 and 48);
alter table public.guides add column if not exists req_minutes smallint
  check (req_minutes is null or req_minutes between 1 and 240);
alter table public.guides add column if not exists unlock text
  check (unlock is null or char_length(unlock) <= 600);
alter table public.guides add column if not exists unlock_en text
  check (unlock_en is null or char_length(unlock_en) <= 600);

grant insert (req_level, req_ilvl, req_party, req_minutes, unlock, unlock_en)
  on public.guides to authenticated;
grant update (req_level, req_ilvl, req_party, req_minutes, unlock, unlock_en)
  on public.guides to authenticated;

/* ── what a set's pieces may hold ─────────────────────────────────────────────────── */

create or replace function public.guide_pieces_ok(s jsonb)
returns boolean
language sql
immutable
as $fn$
  select s is not null
     and jsonb_typeof(s) = 'array'
     and jsonb_array_length(s) <= 40
     and not exists (
       select 1
         from jsonb_array_elements(s) as e(v)
        where jsonb_typeof(e.v) <> 'object'
           or exists (select 1 from jsonb_object_keys(e.v) as k(name)
                       where k.name not in ('name', 'job', 'icon'))
           or jsonb_typeof(e.v -> 'name') is distinct from 'string'
           or char_length(e.v ->> 'name') not between 1 and 80
           or (e.v ? 'job' and (jsonb_typeof(e.v -> 'job') <> 'string'
                                or char_length(e.v ->> 'job') > 20))
           or (e.v ? 'icon' and (jsonb_typeof(e.v -> 'icon') <> 'string'
                                 or (e.v ->> 'icon') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'))
     );
$fn$;

/* ── the rewards ─────────────────────────────────────────────────────────── */

create table if not exists public.guide_rewards (
  id          bigint generated always as identity primary key,
  guide_id    bigint not null references public.guides (id) on delete cascade,
  sort        integer not null default 0,
  kind        text not null default 'other'
                check (kind in ('token', 'weapon', 'mount', 'minion', 'orchestrion', 'accessory', 'other')),
  name        text not null check (char_length(name) between 1 and 80),
  ilvl        smallint check (ilvl is null or ilvl between 1 and 999),
  say         text check (say is null or char_length(say) <= 1000),
  say_en      text check (say_en is null or char_length(say_en) <= 1000),
  icon        text check (icon is null or (
                char_length(icon) <= 120
                and icon ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$')),
  pics        jsonb not null default '[]'::jsonb
                check (pg_column_size(pics) <= 4000 and public.guide_refs_ok(pics)),
  pieces      jsonb not null default '[]'::jsonb
                check (pg_column_size(pieces) <= 12000 and public.guide_pieces_ok(pieces)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists guide_rewards_of on public.guide_rewards (guide_id, sort);

alter table public.guide_rewards enable row level security;

drop policy if exists guide_rewards_read on public.guide_rewards;
create policy guide_rewards_read on public.guide_rewards
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.guides g
                where g.id = guide_rewards.guide_id and g.published)
  );

drop policy if exists guide_rewards_add on public.guide_rewards;
create policy guide_rewards_add on public.guide_rewards
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists guide_rewards_edit on public.guide_rewards;
create policy guide_rewards_edit on public.guide_rewards
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists guide_rewards_drop on public.guide_rewards;
create policy guide_rewards_drop on public.guide_rewards
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists guide_rewards_named_write on public.guide_rewards;
create policy guide_rewards_named_write on public.guide_rewards
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_rewards_named_edit on public.guide_rewards;
create policy guide_rewards_named_edit on public.guide_rewards
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_rewards_named_drop on public.guide_rewards;
create policy guide_rewards_named_drop on public.guide_rewards
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

revoke all on public.guide_rewards from anon, authenticated;
grant select on public.guide_rewards to anon, authenticated;
grant insert (guide_id, sort, kind, name, ilvl, say, say_en, icon, pics, pieces)
  on public.guide_rewards to authenticated;
grant update (sort, kind, name, ilvl, say, say_en, icon, pics, pieces)
  on public.guide_rewards to authenticated;
grant delete on public.guide_rewards to authenticated;

drop trigger if exists guide_rewards_touched on public.guide_rewards;
create trigger guide_rewards_touched
  before update on public.guide_rewards
  for each row execute function public.guides_touched();

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select count(*) as policies from pg_policies
 where schemaname = 'public' and tablename = 'guide_rewards';
--  7

select public.guide_pieces_ok('[{"name": "Falchion of Naught", "job": "PLD"}]') as fine,
       public.guide_pieces_ok('[{"name": "x", "icon": "https://evil.example/a.png"}]') as url_icon;
--  true | false

select count(*) as rewards from public.guide_rewards;
--  0 (until a guide is given its rewards)

select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'guides'
   and column_name in ('req_level', 'req_ilvl', 'req_party', 'req_minutes', 'unlock', 'unlock_en')
 order by 1;
--  req_ilvl, req_level, req_minutes, req_party, unlock, unlock_en (six rows)
*/
