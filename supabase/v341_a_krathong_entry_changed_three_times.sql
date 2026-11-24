-- v341: a krathong entry may be changed three times (Cash Town, Loy Krathong)
--
-- The owner, 2026-11-24: "ช่วยทำให้คนส่งประกวดกระทงสามารถแก้ไข design ได้สูงสุด 3 ครั้ง เปลี่ยนได้หมด ดีไซน์ ชื่อ สี
-- หาของใหม่ เพิ่มจากที่เคยส่งไปแล้วก็พอ".
--
-- 1. town_krathongs.edits: how many times an entry has been changed (0 for every krathong made so far).
-- 2. rules.edits_max = 3, a row he may change (the game reads 3).
-- 3. public.town_krathong_edit(festival, design, name, request): my entry changed whole, parts, payments, colours and
--    name, while entries are open (the `make` window; a krathong made only to float is no entry and is not changed),
--    edits_max times. It is paid for with only what goes beyond everything already paid for it (`paid`, kept since
--    v336 and now added to): a part changed back costs nothing. Nothing is given back. The votes it has keep.
-- 4. town.krathong_view says `edits` and `paid` (the stall works out what a change would cost).
-- The code's twins: lib/town/krathong's EDITS_MAX and extraCost; lib/town/krathong-trial's edit. Needs v336 and v339.
-- Runs twice without harm.

begin;
do $$ begin
  if to_regprocedure('public.town_festival_draw(integer)') is null then raise exception 'Run v339 before v341'; end if;
end $$;

alter table public.town_krathongs add column if not exists edits integer not null default 0;

update public.town_festivals set rules = rules || jsonb_build_object('edits_max', 3)
 where slug = 'loykrathong' and year = 2026 and not (rules ? 'edits_max');

create or replace function town.krathong_view(k public.town_krathongs) returns jsonb
language sql stable set search_path to '' as $$
  select jsonb_build_object('id', k.id, 'name', k.name, 'design', k.design, 'entered', k.entered,
    'made', (extract(epoch from k.made_at) * 1000)::bigint,
    'floated', case when k.floated_at is null then null else (extract(epoch from k.floated_at) * 1000)::bigint end,
    'edits', k.edits, 'paid', k.paid)
$$;

create or replace function public.town_krathong_edit(p_festival integer, p_design jsonb, p_name text, p_request uuid) returns jsonb
language plpgsql security definer set search_path to '' as $$
declare
  me uuid := town.member();
  f public.town_festivals%rowtype;
  k public.town_krathongs%rowtype;
  new_design jsonb;
  need jsonb;
  extra jsonb := '{}'::jsonb;
  new_paid jsonb;
  nm text;
  purse jsonb;
  bag jsonb;
  item text;
  n integer;
begin
  if p_request is null then return town.answer(me, town.no('none')); end if;
  select * into f from public.town_festivals where id = p_festival and published;
  if not found then return town.answer(me, town.no('none')); end if;
  -- the purse is held first, as town_krathong_make holds it: two sends at once wait for each other here
  perform town.purse_of(me, true);
  perform 1 from public.town_purses p where p.member_id = me for update;
  select * into k from public.town_krathongs where festival = f.id and member_id = me for update;
  if not found then return town.answer(me, town.no('none')); end if;
  if k.request = p_request then return town.answer(me, jsonb_build_object('ok', true, 'repeated', true, 'krathong', town.krathong_view(k))); end if;
  if not k.entered or not town.festival_open(f.windows, 'make', town.festival_now()) then return town.answer(me, town.no('closed')); end if;
  if k.edits >= coalesce((f.rules->>'edits_max')::int, 3) then return town.answer(me, town.no('edits')); end if;
  nm := town.krathong_line(p_name, 24);
  if nm is null then return town.answer(me, town.no('name')); end if;
  new_design := town.krathong_design(f.rules->'parts', p_design, coalesce((f.rules->>'max_trims')::int, 3));
  if new_design is null then return town.answer(me, town.no('design')); end if;
  need := town.krathong_cost(f.rules->'parts', new_design);
  -- only what goes beyond everything paid for it so far
  for item, n in select key, value::int from jsonb_each_text(need) loop
    n := n - coalesce((k.paid->>item)::int, 0);
    if n > 0 then extra := extra || jsonb_build_object(item, n); end if;
  end loop;
  purse := town.purse_of(me, true);
  bag := purse->'bag';
  for item, n in select key, value::int from jsonb_each_text(extra) loop
    if town.held(bag, item) < n then return town.answer(me, town.no('short') || jsonb_build_object('item', item, 'need', n)); end if;
  end loop;
  new_paid := k.paid;
  for item, n in select key, value::int from jsonb_each_text(extra) loop
    bag := town.take(bag, item, n);
    new_paid := new_paid || jsonb_build_object(item, coalesce((new_paid->>item)::int, 0) + n);
  end loop;
  if extra <> '{}'::jsonb then perform town.keep_purse(me, jsonb_set(purse, '{bag}', bag)); end if;
  update public.town_krathongs set design = new_design, name = nm, paid = new_paid, edits = k.edits + 1, request = p_request
   where id = k.id returning * into k;
  perform town.note(me, 'krathong_edit', f.slug, 1, 0, jsonb_build_object('edits', k.edits, 'paid', extra));
  return town.answer(me, jsonb_build_object('ok', true, 'krathong', town.krathong_view(k)));
end;
$$;
revoke all on function public.town_krathong_edit(integer, jsonb, text, uuid) from public, anon;
grant execute on function public.town_krathong_edit(integer, jsonb, text, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

-- Afterwards (each should say what is written beside it):
-- select rules->>'edits_max' from public.town_festivals where id = 1;                                    -- 3
-- select count(*) filter (where edits <> 0) from public.town_krathongs;                                 -- 0
-- select has_function_privilege('anon', 'public.town_krathong_edit(integer, jsonb, text, uuid)', 'execute');  -- f
