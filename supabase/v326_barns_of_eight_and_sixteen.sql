-- v326 — barns of eight and sixteen, their things handed over in parts, and a lighter look at the pasture
--
-- Run this once in the Supabase SQL editor, after v325. Running it again is safe: it changes nothing more. Its code goes
-- out first (a page before it knows only the barns of 2 and 4, and keeps to them; one after it offers 8 and 16 only
-- once a look has said this file has run: the look's `stages`).
--
-- The owner, 2026-11-10: "ช่วยเพิ่มการอัพเกรด คอกสัตว์ จาก max 4 ตัว เพิ่มเป็น 8 และ 16 … ใช้ของเยอะระดับนึงด้วย คนจะได้ทำกันยากหน่อย";
-- of the prices laid before him (Codex's), OK; no upkeep (measured two weeks after); and of the two ways mocked for where
-- the animals live, "ข ดีกว่า ทำเลย": a yard fenced behind the barn (the page's: lib/town/pasture; the database knows
-- only the room). lib/town/animals and lib/town/animal-act are the page's twins, case for case:
--
--   * The catalog's `animals.knobs.barns.stages` is four stages, each a room, its coins and the things it takes
--     (`needs`: [item, n] pairs): 2 (500 coins, 20 logs, 8 stone tiles) and 4 (1,000, 40, 12) as they were; 8 (3,000
--     coins, 200 logs, 100 timber, 40 stone tiles, 30 iron) and 16 (15,000, 400, 200, 100, 60 and 40 yarn), these two
--     `parts`: their things take more of a bag than it holds (16's, 22 of 25 slots), so they are handed over in parts.
--     Only that key of the row is written: the farm switch of v323 keeps its egg spots and wagon stop there.
--   * `town_animals` takes a step more, 'deliver' ("ส่งของ"): towards the barn's next stage when it is paid in parts,
--     whatever the bag holds of each thing still owed, and the coins still owed (the herd's credit first, then the
--     purse); the barn grows the moment the last part is in. What is handed over is kept on the herd (`parts`, by the
--     stage's room), so nothing is lost if the barn is taken back; a barn taken back keeps every built stage paid in
--     parts as handed over (its coins go to the credit, as every stage's always did), so a barn had again grows back to
--     it for the coins alone. 'enlarge' (paid at once) refuses a stage paid in parts ('stage'); 'barn' and 'enlarge'
--     read the stage's `needs` where they read `logs` and `stone`. Steps stay one at a time under the pasture's lock,
--     and a retried request answers the first answer: a part is never handed over twice, and no stage is skipped (a
--     part goes only towards the next stage).
--   * A look takes no lock and writes nothing (unless the warm bottle's moment is still to be written, which it does
--     under the lock as before): it waits for no step. And it is lighter: another member's animals that I may not care
--     for come without their round strips, their round and their rearing (what only their owner's cards and the
--     carer's panel read; the map draws none of it), and it says the barn's stages (`stages`).
--   * A herd told to another is told without its `parts`, as without its credit.
--
-- What it writes: that key of the catalog row; town.animal_world and town.animal_herd_told written again whole; six new
-- rules (town.animal_has_all, _take_all, _needs_doc, _parts_of, _owed_none, _parts_kept); public.town_animals from its
-- live text but for the lines below (each must be there exactly once, or the file stops and changes nothing). No table
-- changes, and no row of a member's: what is had stays as it is (rooms of 2 and 4, credits, purses).

begin;
set local statement_timeout = '60s';
set local lock_timeout = '5s';

do $guard$ begin
  if to_regprocedure('public.town_animals(jsonb,text)') is null or to_regprocedure('town.animal_world(uuid)') is null
     or to_regprocedure('town.animal_herd_told(jsonb,uuid,uuid)') is null or to_regprocedure('town.animal_next_stage(integer,jsonb)') is null
     or to_regprocedure('town.animal_stages_paid(integer,jsonb)') is null or to_regclass('public.town_pasture') is null
    then raise exception 'v326: run v291 (the pasture) first'; end if;
  if to_regprocedure('town.special_strip(jsonb,jsonb,double precision,double precision)') is null and to_regprocedure('town.roam_hash(text)') is null
    then raise exception 'v326: run v324 (the specials) first'; end if;
  if to_regprocedure('town.matched_odds(text,integer)') is null and not exists (select 1 from pg_proc where proname = 'matched_odds')
    then raise exception 'v326: run v325 (what the specials are for) first'; end if;
end $guard$;

-- ── 1. The catalog: the barn's four stages ──────────────────────────────────────────────────────────────────────────
update public.town_catalog set data = jsonb_set(data, '{knobs,barns,stages}',
    $v326$[{"room":2,"coins":500,"needs":[["log",20],["stoneTile",8]]},{"room":4,"coins":1000,"needs":[["log",40],["stoneTile",12]]},{"room":8,"coins":3000,"needs":[["log",200],["timber",100],["stoneTile",40],["oreIron",30]],"parts":true},{"room":16,"coins":15000,"needs":[["log",400],["timber",200],["stoneTile",100],["oreIron",60],["yarn",40]],"parts":true}]$v326$::jsonb),
  updated_at = now()
  where key = 'animals' and data #> '{knobs,barns,stages}' is distinct from
    $v326$[{"room":2,"coins":500,"needs":[["log",20],["stoneTile",8]]},{"room":4,"coins":1000,"needs":[["log",40],["stoneTile",12]]},{"room":8,"coins":3000,"needs":[["log",200],["timber",100],["stoneTile",40],["oreIron",30]],"parts":true},{"room":16,"coins":15000,"needs":[["log",400],["timber",200],["stoneTile",100],["oreIron",60],["yarn",40]],"parts":true}]$v326$::jsonb;

-- ── 2. A stage's things (lib/town/animal-act's hasAll, takeAll, needsDoc; lib/town/animals' partsOf, owedOf, partsKept) ──
-- Whether a bag holds every thing a stage takes.
create or replace function town.animal_has_all(p_bag jsonb, p_stage jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(bool_and(town.held(p_bag, x->>0) >= (x->>1)::integer), true) from jsonb_array_elements(coalesce(p_stage->'needs', '[]'::jsonb)) x
$$;
-- The bag with every thing a stage takes taken from it (the lowest grade first, as town.take does).
create or replace function town.animal_take_all(p_bag jsonb, p_stage jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare bag jsonb := p_bag; x jsonb;
begin
  for x in select e from jsonb_array_elements(coalesce(p_stage->'needs', '[]'::jsonb)) e loop
    bag := town.take(bag, x->>0, (x->>1)::integer);
  end loop;
  return bag;
end $$;
-- A stage's things as one object (for a deed, and for a stage built and kept).
create or replace function town.animal_needs_doc(p_stage jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(x->>0, (x->>1)::integer), '{}'::jsonb) from jsonb_array_elements(coalesce(p_stage->'needs', '[]'::jsonb)) x
$$;
-- What a herd has handed over towards a stage (by its room), made sound: numbers above none.
create or replace function town.animal_parts_of(p_herd jsonb, p_room integer)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(p_herd->'parts'->(p_room::text)) = 'object' then p_herd->'parts'->(p_room::text) else '{}'::jsonb end) e
   where jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric > 0
$$;
-- Whether nothing more is owed of a stage after what was handed over.
create or replace function town.animal_owed_none(p_stage jsonb, p_got jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce((p_got->>'coins')::numeric, 0) >= (p_stage->>'coins')::numeric
     and coalesce((select bool_and(coalesce((p_got->>(x->>0))::numeric, 0) >= (x->>1)::numeric) from jsonb_array_elements(coalesce(p_stage->'needs', '[]'::jsonb)) x), true)
$$;
-- A herd's parts after its barn is taken back: every built stage paid in parts kept as handed over, its things whole
-- (its coins go to the credit), what was being handed over towards one not built as it was; as `{"parts": …}`, or
-- nothing when there are none.
create or replace function town.animal_parts_kept(p_herd jsonb, p_k jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select case when kept = '{}'::jsonb then '{}'::jsonb else jsonb_build_object('parts', kept) end
    from (select coalesce(case when jsonb_typeof(p_herd->'parts') = 'object' then p_herd->'parts' end, '{}'::jsonb)
      || coalesce((select jsonb_object_agg(s->>'room', town.animal_needs_doc(s)) from jsonb_array_elements(p_k->'knobs'->'barns'->'stages') s
                    where coalesce((s->>'parts')::boolean, false) and (s->>'room')::integer <= coalesce((p_herd->>'room')::integer, 0)), '{}'::jsonb) as kept) x
$$;

-- ── 3. What a page is told: a herd without its parts to others; the look lighter, and the stages ─────────────────────
create or replace function town.animal_herd_told(p_h jsonb, p_owner uuid, p_me uuid)
returns jsonb language sql stable set search_path = '' as $$
  select (case when p_owner = p_me then p_h else p_h - 'credit' - 'parts' end) || jsonb_build_object('bottle', town.animal_bottle(p_owner))
$$;
create or replace function town.animal_world(p_me uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    -- (another's animal I may not care for: without what only its owner's cards and a carer's panel read)
    'animals', coalesce((select jsonb_agg(case when a.owner = p_me or coalesce(c.may, false) then a.a else a.a - 'strips' - 'round' - 'rearing' end order by a.id)
      from public.town_animals a
      left join lateral (select (h.h->>'care' = 'anybody' or (h.h->>'care' = 'named' and coalesce(h.h->'carers' ? p_me::text, false))) as may
                           from public.town_herds h where h.owner = a.owner) c on true), '[]'::jsonb),
    'herds', coalesce((select jsonb_agg(town.animal_herd_told(h.h, h.owner, p_me)) from public.town_herds h), '[]'::jsonb),
    'found', p.found, 'specials', p.specials, 'spells', p.spells, 'wagons', p.wagons,
    'offers', town.animal_mine(p.offers, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'offerHours')::double precision),
    'asks', town.animal_mine(p.asks, p_me, town.now_ms()::double precision, (town.cat('animals')->'knobs'->>'askHours')::double precision), 'whole', true,
    'stages', town.cat('animals')->'knobs'->'barns'->'stages')
    from public.town_pasture p where p.one
$$;

-- ── 4. public.town_animals: its live text, but for these ───────────────────────────────────────────────────────────
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    -- (the step's own words)
    ['public.town_animals(jsonb,text)', '  spc jsonb; strip_ jsonb; sn integer; chance_ double precision; ograd jsonb; obyg integer[]; first_sp boolean := false; found_sp jsonb;',
     '  spc jsonb; strip_ jsonb; sn integer; chance_ double precision; ograd jsonb; obyg integer[]; first_sp boolean := false; found_sp jsonb;
  -- (v326: a stage handed over in parts)
  pt_need jsonb; pt_got jsonb; pt_after jsonb; pt_gave jsonb; pt_parts jsonb; pt_owed integer; pt_n integer; pt_done boolean;'],
    -- (a look waits for no step: it writes nothing, unless the warm bottle's moment is still to be written)
    ['public.town_animals(jsonb,text)', '  -- (the pasture''s lock first: a second call of the same request waits for the first, and then finds its answer)
  select * into pas from public.town_pasture where one for update;',
     '  -- (v326: a look takes no lock and writes nothing, so it waits for no step; but for the warm bottle''s moment, which a
  -- look writes under the lock as any step does, below)
  if act = ''look'' and not (jsonb_typeof(town.animal_herd(me)->''bottleAt'') is distinct from ''number''
       and exists (select 1 from public.town_herds x where x.owner = me)
       and coalesce(town.gifts_of(town.purse_of(me, false))->''had'' ? (k->''gifts''->>''bottle''), false)) then
    return town.answer(me, jsonb_build_object(''ok'', true, ''world'', town.animal_world(me)));
  end if;
  -- (the pasture''s lock first: a second call of the same request waits for the first, and then finds its answer)
  select * into pas from public.town_pasture where one for update;'],
    -- ('barn': its first stage's things)
    ['public.town_animals(jsonb,text)', '    if town.held(purse->''bag'', ''log'') < (r->>''logs'')::integer or town.held(purse->''bag'', ''stoneTile'') < (r->>''stone'')::integer then
      return town.answer(me, town.no(''nothing'')); end if;
    if id2 is not null then',
     '    if not town.animal_has_all(purse->''bag'', r) then return town.answer(me, town.no(''nothing'')); end if;
    if id2 is not null then'],
    -- (a barn taken back: what its owner handed over towards a stage paid in parts, built or not, kept on their herd)
    ['public.town_animals(jsonb,text)', '      hold_h := hold_h || jsonb_build_object(''barn'', null, ''credit'', coalesce((hold_h->>''credit'')::integer, 0) + town.animal_stages_paid(coalesce((hold_h->>''room'')::integer, 0), k),',
     '      hold_h := hold_h || town.animal_parts_kept(hold_h, k);
      hold_h := hold_h || jsonb_build_object(''barn'', null, ''credit'', coalesce((hold_h->>''credit'')::integer, 0) + town.animal_stages_paid(coalesce((hold_h->>''room'')::integer, 0), k),'],
    ['public.town_animals(jsonb,text)', '    purse := purse || jsonb_build_object(''coins'', (purse->>''coins'')::integer - coins_,
      ''bag'', town.take(town.take(purse->''bag'', ''log'', (r->>''logs'')::integer), ''stoneTile'', (r->>''stone'')::integer));
    notes := notes || jsonb_build_array(jsonb_build_array(''animal_barn'', 1, null, 0,
      jsonb_build_object(''barn'', n_, ''logs'', (r->>''logs'')::integer, ''stone'', (r->>''stone'')::integer), -coins_));',
     '    purse := purse || jsonb_build_object(''coins'', (purse->>''coins'')::integer - coins_, ''bag'', town.animal_take_all(purse->''bag'', r));
    notes := notes || jsonb_build_array(jsonb_build_array(''animal_barn'', 1, null, 0,
      jsonb_build_object(''barn'', n_, ''things'', town.animal_needs_doc(r)), -coins_));'],
    -- ('enlarge': a stage paid at once, of its things; one paid in parts is delivered)
    ['public.town_animals(jsonb,text)', '    r := town.animal_next_stage(coalesce((herd->>''room'')::integer, 0), k);
    if r is null then return town.answer(me, town.no(''full'')); end if;
    price := (r->>''coins'')::integer;',
     '    r := town.animal_next_stage(coalesce((herd->>''room'')::integer, 0), k);
    if r is null then return town.answer(me, town.no(''full'')); end if;
    if coalesce((r->>''parts'')::boolean, false) then return town.answer(me, town.no(''stage'')); end if;
    price := (r->>''coins'')::integer;'],
    ['public.town_animals(jsonb,text)', '    if town.held(purse->''bag'', ''log'') < (r->>''logs'')::integer or town.held(purse->''bag'', ''stoneTile'') < (r->>''stone'')::integer then
      return town.answer(me, town.no(''nothing'')); end if;
    herd := herd || jsonb_build_object(''room'', (r->>''room'')::integer, ''credit'', credit_ - (price - coins_));
    purse := purse || jsonb_build_object(''coins'', (purse->>''coins'')::integer - coins_,
      ''bag'', town.take(town.take(purse->''bag'', ''log'', (r->>''logs'')::integer), ''stoneTile'', (r->>''stone'')::integer));
    notes := notes || jsonb_build_array(jsonb_build_array(''animal_enlarge'', (r->>''room'')::integer, null, 0,
      jsonb_build_object(''barn'', (herd->>''barn'')::integer, ''logs'', (r->>''logs'')::integer, ''stone'', (r->>''stone'')::integer), -coins_));',
     '    if not town.animal_has_all(purse->''bag'', r) then return town.answer(me, town.no(''nothing'')); end if;
    herd := herd || jsonb_build_object(''room'', (r->>''room'')::integer, ''credit'', credit_ - (price - coins_));
    purse := purse || jsonb_build_object(''coins'', (purse->>''coins'')::integer - coins_, ''bag'', town.animal_take_all(purse->''bag'', r));
    notes := notes || jsonb_build_array(jsonb_build_array(''animal_enlarge'', (r->>''room'')::integer, null, 0,
      jsonb_build_object(''barn'', (herd->>''barn'')::integer, ''things'', town.animal_needs_doc(r)), -coins_));'],
    -- ('deliver', new: towards the next stage when it is paid in parts)
    ['public.town_animals(jsonb,text)', '  elsif act = ''buy'' then',
     '  elsif act = ''deliver'' then
    -- (v326) towards my barn''s next stage when it is paid in parts ("ส่งของ"): whatever my bag holds of each thing still
    -- owed, and the coins still owed (my credit first, then my purse); the barn grows the moment the last part is in.
    -- What is handed over is the herd''s (`parts`, by the stage''s room), kept if the barn is taken back.
    if herd->>''barn'' is null then return town.answer(me, town.no(''barn'')); end if;
    r := town.animal_next_stage(coalesce((herd->>''room'')::integer, 0), k);
    if r is null then return town.answer(me, town.no(''full'')); end if;
    if not coalesce((r->>''parts'')::boolean, false) then return town.answer(me, town.no(''stage'')); end if;
    pt_got := town.animal_parts_of(herd, (r->>''room'')::integer);
    pt_owed := greatest(0, (r->>''coins'')::integer - coalesce((pt_got->>''coins'')::integer, 0));
    credit_ := least(greatest(0, coalesce((herd->>''credit'')::integer, 0)), pt_owed);
    coins_ := least(greatest(0, (purse->>''coins'')::integer), pt_owed - credit_);
    pt_gave := ''{}''::jsonb; bag := purse->''bag'';
    for pt_need in select x from jsonb_array_elements(r->''needs'') x loop
      pt_n := least(greatest(0, (pt_need->>1)::integer - coalesce((pt_got->>(pt_need->>0))::integer, 0)), town.held(bag, pt_need->>0));
      if pt_n > 0 then pt_gave := pt_gave || jsonb_build_object(pt_need->>0, pt_n); bag := town.take(bag, pt_need->>0, pt_n); end if;
    end loop;
    if credit_ + coins_ <= 0 and pt_gave = ''{}''::jsonb then return town.answer(me, town.no(''nothing'')); end if;
    pt_after := pt_got || coalesce((select jsonb_object_agg(e.key, coalesce((pt_got->>e.key)::integer, 0) + (e.value #>> ''{}'')::integer) from jsonb_each(pt_gave) e), ''{}''::jsonb)
      || case when credit_ + coins_ > 0 then jsonb_build_object(''coins'', coalesce((pt_got->>''coins'')::integer, 0) + credit_ + coins_) else ''{}''::jsonb end;
    pt_done := town.animal_owed_none(r, pt_after);
    pt_parts := coalesce(case when jsonb_typeof(herd->''parts'') = ''object'' then herd->''parts'' end, ''{}''::jsonb) - (r->>''room'');
    if not pt_done then pt_parts := pt_parts || jsonb_build_object(r->>''room'', pt_after); end if;
    herd := (herd - ''parts'') || jsonb_build_object(''credit'', coalesce((herd->>''credit'')::integer, 0) - credit_,
        ''room'', case when pt_done then (r->>''room'')::integer else coalesce((herd->>''room'')::integer, 0) end)
      || case when pt_parts = ''{}''::jsonb then ''{}''::jsonb else jsonb_build_object(''parts'', pt_parts) end;
    purse := purse || jsonb_build_object(''coins'', (purse->>''coins'')::integer - coins_, ''bag'', bag);
    got := jsonb_build_object(''gave'', case when credit_ + coins_ > 0 then jsonb_build_object(''coins'', credit_ + coins_) else ''{}''::jsonb end || pt_gave)
      || case when pt_done then jsonb_build_object(''grew'', (r->>''room'')::integer) else ''{}''::jsonb end;
    notes := notes || jsonb_build_array(jsonb_build_array(''animal_deliver'', (r->>''room'')::integer, null, 0,
      jsonb_build_object(''barn'', (herd->>''barn'')::integer, ''credit'', credit_, ''things'', pt_gave, ''done'', pt_done), -coins_));
    if pt_done then notes := notes || jsonb_build_array(jsonb_build_array(''animal_enlarge'', (r->>''room'')::integer, null, 0,
      jsonb_build_object(''barn'', (herd->>''barn'')::integer, ''parts'', true), 0)); end if;

  elsif act = ''buy'' then']
  ] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v326: % has % of [%], not 1: rebuild v326', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

-- ── 5. Who may call what: the rules are no browser's ───────────────────────────────────────────────────────────────
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_animals(jsonb, text) from public, anon;
grant execute on function public.town_animals(jsonb, text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select jsonb_array_length(data #> '{knobs,barns,stages}') as stages,
--          data #> '{knobs,barns,stages,2,room}' as third, data #> '{knobs,barns,stages,3,parts}' as parts,
--          data ? 'specials' as specials_kept
--     from public.town_catalog where key = 'animals';
--   -- 4 | 8 | true | true
--
--   select position('''deliver''' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) > 0 as deliver,
--          position('animal_has_all' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) > 0 as needs,
--          position('''logs''' in pg_get_functiondef('public.town_animals(jsonb,text)'::regprocedure)) = 0 as no_logs,
--          position('''stages''' in pg_get_functiondef('town.animal_world(uuid)'::regprocedure)) > 0 as told;
--   -- true | true | true | true
--
--   select count(*) filter (where (h.h->>'room')::integer = 2) as at_two, count(*) filter (where (h.h->>'room')::integer = 4) as at_four,
--          count(*) filter (where h.h ? 'parts') as with_parts
--     from public.town_herds h;
--   -- the rooms as they were (13 at four, 2 at two on 2026-11-10) | 0
--
--   select has_function_privilege('authenticated', 'public.town_animals(jsonb, text)', 'execute') as member,
--          has_function_privilege('anon', 'public.town_animals(jsonb, text)', 'execute') as anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what was handed over towards 8 and 16, by the day (counts and sums only)
--   select date_trunc('day', d.at) as day, d.n as stage, count(*) as parts, count(distinct d.member_id) as members,
--          sum(-d.coins) as coins, count(*) filter (where (d.doc->>'done')::boolean) as built
--     from public.town_deeds d where d.what = 'animal_deliver' group by 1, 2 order by 1 desc, 2;
--
--   -- barns by room now
--   select (h.h->>'room')::integer as room, count(*) from public.town_herds h where h.h->>'barn' is not null group by 1 order by 1;
