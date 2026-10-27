-- v310 — the village's book of fish
-- Run this once in the Supabase SQL editor, after v309. Running it again is safe and changes nothing more.
--
-- The owner, 2026-10-27: "อยากให้เพิ่มสมุดปลาด้วย". The bag's book of fish (components/town/TownFishBook) shows each kind
-- the village has landed, who landed the first of it and who the biggest, and each giant landed together (v309) with
-- the angler's and the netter's names. lib/town/fish-book is the page's twin: `noteFish` (the first stays the first;
-- the biggest is replaced only by a bigger, so of two the same the earlier stays) and `giantRecords` (each giant's
-- biggest landed hook, the earlier of two the same).
--
-- What changes:
--   * public.town_fish_book: a row a kind of fish, its first and its biggest, each with who, their name then, and
--     when. Nobody reads or writes it but the functions below.
--   * It is written as a landing is written down: every fish landed is a row of public.town_plays (game 'fishing',
--     won, `doc.how` 'landed', `doc.what` and the line's own `doc.size`, as the database drew it), from a line by
--     itself (town.land_v258) and from each line of a rod of two or three (town.land_one) alike. A trigger after that
--     insert notes it, in the landing's own transaction, so town_land is not touched. Only what is a fish (the
--     catalog's `fish`, as the strike tells a fish from what is not): the first of a kind whatever its length, the
--     biggest only of a length over nothing, as noteFish.
--   * Everything landed before this file is noted by the same rules, the earliest first. The names of those are the
--     names members go by today: what they were called on the day was never kept.
--   * public.town_fish_book(): the book as lib/town/fish-book's FishBook has it, `{fish: {id: {first, best?: [size,
--     name]}}, giants: [{id, size, weight, angler, netter}]}`, the giants from v309's public.town_giant_hooks.
-- A member's name is as the town shows it to others (v309's town.giant_name).

begin;
set local statement_timeout = '120s';
set local lock_timeout = '10s';

do $guard$ begin
  if to_regclass('public.town_giant_hooks') is null or to_regprocedure('town.giant_name(uuid)') is null or to_regprocedure('town.giant_rules()') is null then
    raise exception 'v310: run v309 first';
  end if;
  if to_regclass('public.town_plays') is null or to_regprocedure('town.cat(text)') is null then
    raise exception 'v310: the town''s plays and catalog are missing';
  end if;
end $guard$;

-- ── 1. The book ───────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.town_fish_book (
  species text primary key,
  first_member uuid references public.profiles (id) on delete set null,
  first_name text not null default '',
  first_at timestamptz not null,
  best_size double precision check (best_size is null or best_size > 0),
  best_member uuid references public.profiles (id) on delete set null,
  best_name text,
  best_at timestamptz,
  check ((best_size is null) = (best_at is null))
);
alter table public.town_fish_book enable row level security;
revoke all on public.town_fish_book from public, anon, authenticated;

-- ── 2. A fish landed, noted ───────────────────────────────────────────────────────────────────────────────────────────
-- (noteFish: a kind not in the book has its first; a length over the biggest yet, strictly, is the biggest)
create or replace function town.fish_book_note() returns trigger
language plpgsql set search_path = '' as $$
declare
  id_ text := new.doc->>'what';
  size_ double precision := case when jsonb_typeof(new.doc->'size') = 'number' then (new.doc->>'size')::double precision end;
  name_ text;
begin
  if id_ is null or not coalesce(town.cat('fish') ? id_, false) then return null; end if;
  if not coalesce(size_ > 0, false) then size_ := null; end if;
  name_ := town.giant_name(new.member_id);
  insert into public.town_fish_book as b (species, first_member, first_name, first_at, best_size, best_member, best_name, best_at)
  values (id_, new.member_id, name_, new.at, size_, case when size_ is not null then new.member_id end, case when size_ is not null then name_ end, case when size_ is not null then new.at end)
  on conflict (species) do update
    set best_size = excluded.best_size, best_member = excluded.best_member, best_name = excluded.best_name, best_at = excluded.best_at
    where excluded.best_size is not null and (b.best_size is null or excluded.best_size > b.best_size);
  return null;
end $$;
revoke all on function town.fish_book_note() from public, anon, authenticated;

-- (no landing is written down while the book is begun: one that came between the reading below and the trigger would
-- be in neither; the landings wait the few moments this takes, as v255's announcements did)
lock table public.town_plays in share row exclusive mode;
drop trigger if exists town_plays_fish_book on public.town_plays;
create trigger town_plays_fish_book after insert on public.town_plays
  for each row when (new.game = 'fishing' and new.won and new.doc->>'how' = 'landed') execute function town.fish_book_note();

-- ── 3. What was landed before ─────────────────────────────────────────────────────────────────────────────────────────
-- (the same rules over every landing there is, in the order they were landed: of each kind the first, and the biggest
-- with the earliest of those the same length. The names are today's: nobody's name on the day was kept. A kind in the
-- book already, on a run of this file again, is left as the trigger has kept it)
insert into public.town_fish_book (species, first_member, first_name, first_at, best_size, best_member, best_name, best_at)
with c as (select town.cat('fish') as fish),
landed as (
  select p.id, p.member_id, p.at, p.doc->>'what' as species,
         case when jsonb_typeof(p.doc->'size') = 'number' and (p.doc->>'size')::double precision > 0 then (p.doc->>'size')::double precision end as size
    from public.town_plays p, c
   where p.game = 'fishing' and p.won and p.doc->>'how' = 'landed' and c.fish ? (p.doc->>'what')),
firsts as (select distinct on (l.species) l.species, l.member_id, l.at from landed l order by l.species, l.at, l.id),
bests as (select distinct on (l.species) l.species, l.member_id, l.at, l.size from landed l where l.size is not null order by l.species, l.size desc, l.at, l.id)
select f.species, f.member_id, town.giant_name(f.member_id), f.at, b.size, b.member_id, case when b.species is not null then town.giant_name(b.member_id) end, b.at
  from firsts f left join bests b on b.species = f.species
on conflict (species) do nothing;

-- ── 4. The book, as the page reads it ─────────────────────────────────────────────────────────────────────────────────
-- (giantRecords: of each giant landed, by a netter, the biggest, the earlier of two the same; in the order each was
-- first landed)
create or replace function public.town_fish_book()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object(
    'fish', coalesce((select jsonb_object_agg(b.species, jsonb_build_object('first', b.first_name)
              || case when b.best_size is not null then jsonb_build_object('best', jsonb_build_array(b.best_size, coalesce(b.best_name, ''))) else '{}'::jsonb end)
            from public.town_fish_book b), '{}'::jsonb),
    'giants', coalesce((select jsonb_agg(jsonb_build_object('id', g.giant, 'size', g.size, 'weight', g.weight, 'angler', g.angler, 'netter', g.netter) order by g.first_end, g.giant)
            from (select distinct on (h.doc->>'giant') h.doc->>'giant' as giant, h.doc->'size' as size, h.doc->'weight' as weight,
                         coalesce(h.doc->>'byName', '') as angler, coalesce(h.doc->>'netterName', '') as netter,
                         min((h.doc->>'end')::bigint) over (partition by h.doc->>'giant') as first_end
                    from public.town_giant_hooks h
                   where h.doc->>'how' = 'landed' and coalesce(h.doc->>'netter', '') <> ''
                     and exists (select 1 from jsonb_array_elements(town.giant_rules()->'rows') r where r->>'id' = h.doc->>'giant')
                   order by h.doc->>'giant', (h.doc->>'size')::numeric desc, (h.doc->>'end')::bigint, h.id) g), '[]'::jsonb));
end $$;
revoke all on function public.town_fish_book() from public, anon, authenticated;
grant execute on function public.town_fish_book() to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select tgname from pg_trigger where tgrelid = 'public.town_plays'::regclass and tgname = 'town_plays_fish_book';
--                                -- town_plays_fish_book
--   select count(*) kinds, count(best_size) with_biggest from public.town_fish_book;
--                                -- as many kinds as the village has landed; nearly all of them with a biggest
--   select count(distinct p.doc->>'what') from public.town_plays p, (select town.cat('fish') f) c
--    where p.game = 'fishing' and p.won and p.doc->>'how' = 'landed' and c.f ? (p.doc->>'what');
--                                -- the same number of kinds
--   select has_function_privilege('anon', 'public.town_fish_book()', 'EXECUTE') as anon_may,
--          has_table_privilege('authenticated', 'public.town_fish_book', 'SELECT') as members_read;
--                                -- false, false
