-- v322: the village's farm book (2026-11-07). Run after v309 (town.giant_name); v321 need not have run. Safe to run twice.
-- The site code goes with it (lib/town/farm-book, components/town/TownFarmBook, the keeper's gardenFinds); either may go
-- first: before this file the page counts each member's own finds alone, after it the village's.
--
-- The owner, 2026-11-07: "ช่วยทำ สมุดปลุกผัดให้หน่อย มีข้อมูลผักทั้งหมด รายละเอียดเฉพาะที่ค้นพบแล้ว รวมถึง คู่ผักด้วย
-- ไม่งั้นคนเล่นหากันไม่เจอ", and of his two choices: found by anybody in the village counts (as the books of fish and insects),
-- and a page not found yet shows its shape in shadow and one parent (the page's own rule, lib/town/farm-book).
--
--   * public.town_garden_book: each crossing's child somebody has found, and who first (the name as town.giant_name gives it
--     on the day). Nobody reads or writes it but the functions here.
--   * A trigger on public.town_purses notes a child the first time any member's `gardenBook` holds it (every way a child is
--     found adds it there: the pick's crossing, the helpers' skies), on an update of the purse whose `gardenBook` changed, or
--     a purse made with one. Only a crop of the catalog is noted.
--   * What was found before: every child some purse holds now. Its finder: the one v255's town news told (kind 'cross',
--     every garden crossing's first since v255); failing that, the first member of those who hold it to have had its seed
--     or the crop in a deed (a hybrid's seed comes from its crossing alone), at that deed's time; failing that, the book's
--     "somebody" (name ''), at this run.
--   * public.town_garden_book(): { crop: first finder's name } for members.
begin;
set local statement_timeout = '120s';
set local lock_timeout = '5s';
do $guard$ begin
  if to_regprocedure('town.giant_name(uuid)') is null then raise exception 'Run v309 before v322'; end if;
  if to_regclass('public.town_purses') is null or to_regclass('public.town_deeds') is null then raise exception 'v322 needs town_purses and town_deeds'; end if;
  if to_regclass('public.town_announcements') is null then raise exception 'Run v255 before v322'; end if;
end $guard$;

-- ── 1. The book ───────────────────────────────────────────────────────────────────────────────────────────────────────
create table if not exists public.town_garden_book (
  crop text primary key,
  first_member uuid references public.profiles (id) on delete set null,
  first_name text not null default '',
  first_at timestamptz not null default now()
);
alter table public.town_garden_book enable row level security;
revoke all on public.town_garden_book from public, anon, authenticated;

-- ── 2. A child found, noted ───────────────────────────────────────────────────────────────────────────────────────────
create or replace function town.garden_book_note() returns trigger
language plpgsql set search_path = '' as $$
declare
  crops_ jsonb := town.cat('crops');
  c text;
  name_ text;
begin
  for c in
    select jsonb_array_elements_text(case when jsonb_typeof(new.doc->'gardenBook') = 'array' then new.doc->'gardenBook' else '[]'::jsonb end)
    except
    select jsonb_array_elements_text(case when tg_op = 'UPDATE' and jsonb_typeof(old.doc->'gardenBook') = 'array' then old.doc->'gardenBook' else '[]'::jsonb end)
  loop
    continue when not coalesce(crops_ ? c, false) or exists (select 1 from public.town_garden_book b where b.crop = c);
    if name_ is null then name_ := coalesce(town.giant_name(new.member_id), ''); end if;
    insert into public.town_garden_book (crop, first_member, first_name, first_at) values (c, new.member_id, name_, now())
    on conflict (crop) do nothing;
  end loop;
  return null;
end $$;
revoke all on function town.garden_book_note() from public, anon, authenticated;

-- (no purse is written while the book is begun: a child found between the reading below and the trigger would be in
-- neither; the purses wait the moments this takes)
lock table public.town_purses in share row exclusive mode;
drop trigger if exists town_purses_garden_book on public.town_purses;
create trigger town_purses_garden_book after update of doc on public.town_purses
  for each row when (new.doc->'gardenBook' is distinct from old.doc->'gardenBook') execute function town.garden_book_note();
drop trigger if exists town_purses_garden_book_new on public.town_purses;
create trigger town_purses_garden_book_new after insert on public.town_purses
  for each row when (jsonb_typeof(new.doc->'gardenBook') = 'array') execute function town.garden_book_note();

-- ── 3. What was found before ──────────────────────────────────────────────────────────────────────────────────────────
-- (a child in the book already, on a run of this file again, is left as the trigger has kept it)
insert into public.town_garden_book (crop, first_member, first_name, first_at)
with crops as (select town.cat('crops') as c),
known as (
  select distinct g.crop, p.member_id
    from public.town_purses p
   cross join lateral jsonb_array_elements_text(case when jsonb_typeof(p.doc->'gardenBook') = 'array' then p.doc->'gardenBook' else '[]'::jsonb end) g(crop), crops
   where crops.c ? g.crop),
firsts as (
  select distinct on (k.crop) k.crop, d.member_id, d.at
    from known k
   cross join crops
    join public.town_deeds d on d.member_id = k.member_id and d.thing in (k.crop, crops.c->k.crop->>'seed')
   order by k.crop, d.at),
-- (v255's town news told every garden crossing's first finder by name since it was installed: that comes first)
told as (
  select distinct on (a.subject) a.subject as crop, a.member_id, a.name, a.at
    from public.town_announcements a
   where a.kind = 'cross'
   order by a.subject, a.at, a.id)
select k.crop, coalesce(t.member_id, f.member_id),
       case when t.crop is not null then t.name when f.member_id is not null then coalesce(town.giant_name(f.member_id), '') else '' end,
       coalesce(t.at, f.at, now())
  from (select distinct crop from known) k left join told t on t.crop = k.crop left join firsts f on f.crop = k.crop
on conflict (crop) do nothing;

-- ── 4. The book, as the page reads it ─────────────────────────────────────────────────────────────────────────────────
create or replace function public.town_garden_book()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(b.crop, b.first_name), '{}'::jsonb) from public.town_garden_book b
$$;
revoke all on function public.town_garden_book() from public, anon, authenticated;
grant execute on function public.town_garden_book() to authenticated;

commit;

-- What it should say afterwards:
--   select count(*) from public.town_garden_book;                              -- the children found so far (9 kinds on 2026-11-07)
--   select crop, first_name, first_at from public.town_garden_book order by first_at;
--   select tgname from pg_trigger where tgrelid = 'public.town_purses'::regclass and tgname like 'town_purses_garden_book%';  -- two
