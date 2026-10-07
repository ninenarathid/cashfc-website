-- v154 — the squirrel fetches twenty times to a meal's hours
--
-- Run this once in the Supabase SQL editor, after v153 (it stops at its first line without v153's squirrel).
-- Running it again is safe. **Run it after the site's own code for it is live**: a page with the code and a database
-- without this file is as before (the squirrel fetches with no count: nothing is counted, so the page has nothing to
-- stop at); a page from before the code, left open, does not know of the count: past it, its squirrel still goes
-- for what lies within a tile of its member, which is then picked up by hand, for its stamina. Such a page should be
-- loaded again.
--
-- Why. The owner, 2026-10-07, the morning the gifts of ranks 1 to 6 went out, of the squirrel that fetched what
-- lies on the forest's ground for no stamina and with no end:
--
--   "กระรอกเก็บของ มีรจำกัดต่อวันไหม"   (it had none)
--   "กระรอกมีเพดานต่อวันเท่าไหร่ดี ?"   (thirty to a meal's hours were put to him)
--   "ขอ 20 พอ"
--
-- So the squirrel is a counted gift, as the piglet is: twenty fetches to a meal's hours (the catalog's `gifts` row,
-- `uses.famSquirrel`), counted in the purse by v152's own count (`town.used_of`, `town.gift_use`). A fetch is one
-- place's heap picked up, however many things it gave. With a fetch left, all is as v153 had it: from two tiles off,
-- for no stamina. With none left, what lies on the ground is picked up by hand, as by anybody: from a tile off and
-- for its stamina, until the next meal's hours. Its catching of two of the fruit missed at a shaken tree is the
-- page's own and is not counted.
--
-- What it does:
--
--   * `town.wild_fetches`, `town.wild_reach` and `town.wild_cost` take the moment (a third word; their forms of
--     two are dropped): a squirrel fetches only while it has a fetch left of these hours.
--   * `town.gather` (v153's, the same thirteen words) asks them with the moment, and counts a fetch when the thing
--     is in the bag: three lines changed and a block of five more, nothing else.
--   * `public.town_gather` (v153's) asks `town.wild_fetches` with the moment for the deed's `by`, and writes how
--     many fetches are left beside it (`left`): one line changed, one more.
--
-- No table, no column, no coins. One catalog row is written over: `gifts` (one count more).

do $$ begin
  if to_regprocedure('town.wild_fetches(jsonb, text)') is null and to_regprocedure('town.wild_fetches(jsonb, text, bigint)') is null then
    raise exception 'v154 needs v153: run supabase/v153 first';
  end if;
end $$;

-- ─── The catalog's row ─────────────────────────────────────────────────────
-- <catalog:v154> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "uses": {"thingSpoon":{"n":3,"per":"day"},"famSprite":{"n":3,"per":"meal"},"thingSpice":{"n":1,"per":"day"},"thingFlame":{"n":3,"per":"day"},"charmRing":{"n":3,"per":"day"},"thingDust":{"n":5,"per":"day"},"famOtter":{"n":10,"per":"meal"},"thingOrb":{"n":1,"per":"day"},"thingBait":{"n":3,"per":"day"},"famSquirrel":{"n":20,"per":"meal"},"famPiglet":{"n":10,"per":"meal"},"thingMap":{"n":3,"per":"day"},"thingNectar":{"n":10,"per":"day"},"thingFlute":{"n":1,"per":"span","ms":300000},"thingHourglass":{"n":1,"per":"day"},"famMandrake":{"n":7,"per":"day"}},
    "harder": {"from":4,"by":0.08},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":0.5},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":90},"thingBasket":{"kind":"thing","line":"kitchen","rank":2,"by":12},"thingSpoon":{"kind":"thing","line":"kitchen","rank":3,"by":1},"famSprite":{"kind":"familiar","line":"kitchen","rank":4,"by":1},"thingSpice":{"kind":"thing","line":"kitchen","rank":5,"by":4},"thingFlame":{"kind":"thing","line":"kitchen","rank":6,"by":1},"charmAnklet":{"kind":"charm","line":"helpers","rank":2,"by":2},"charmBell":{"kind":"charm","line":"helpers","rank":3,"by":2},"charmRing":{"kind":"charm","line":"helpers","rank":4,"by":30},"thingDust":{"kind":"thing","line":"helpers","rank":5,"by":12},"charmGuard":{"kind":"charm","line":"helpers","rank":6,"by":2},"famOtter":{"kind":"familiar","line":"fishing","rank":2,"by":1},"thingRod":{"kind":"thing","line":"fishing","rank":3,"by":0.75},"charmLine":{"kind":"charm","line":"fishing","rank":4,"by":3},"thingOrb":{"kind":"thing","line":"fishing","rank":5,"by":2},"thingBait":{"kind":"thing","line":"fishing","rank":6,"by":1},"famPiglet":{"kind":"familiar","line":"forest","rank":3,"by":1},"charmFirefly":{"kind":"charm","line":"forest","rank":4,"by":1},"thingMap":{"kind":"thing","line":"forest","rank":5,"by":1},"famStag":{"kind":"familiar","line":"forest","rank":6,"by":2},"thingNectar":{"kind":"thing","line":"insects","rank":3,"by":1},"charmWind":{"kind":"charm","line":"insects","rank":4,"by":1},"thingFlute":{"kind":"thing","line":"insects","rank":5,"by":15},"charmCloak":{"kind":"charm","line":"insects","rank":6,"by":3},"thingPouch":{"kind":"thing","line":"farming","rank":3,"by":5},"charmSickle":{"kind":"charm","line":"farming","rank":4,"by":1},"thingHourglass":{"kind":"thing","line":"farming","rank":5,"by":3},"famMandrake":{"kind":"familiar","line":"farming","rank":6,"by":1},"thingFlask":{"kind":"thing","line":"well","rank":4,"by":30},"famFrog":{"kind":"familiar","line":"well","rank":5,"by":45},"thingMoon":{"kind":"thing","line":"well","rank":6,"by":3}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v154>

-- ─── The rules ─────────────────────────────────────────────────────────────

-- Whether a squirrel fetches a kind of place's thing for somebody now (lib/town/forest's fetches): what is picked up
-- with no game, while it follows them and has a fetch left of its count to these hours.
create or replace function town.wild_fetches(p_purse jsonb, p_how text, p_now bigint)
returns boolean language sql stable
as $$
  select coalesce(p_how = 'pick' and town.gift_works(p_purse, 'famSquirrel')
    and town.used_of(p_purse, 'famSquirrel', p_now) < (town.cat('gifts')->'uses'->'famSquirrel'->>'n')::integer, false)
$$;

-- How far somebody reaches a kind of place from now, in tiles (lib/town/forest's reachOf): a tile; as far as their
-- squirrel fetches, while it does; or, whatever the place, as far as is reached from a moss stag's back.
create or replace function town.wild_reach(p_purse jsonb, p_how text, p_now bigint)
returns integer language sql stable
as $$
  select case when town.wild_fetches(p_purse, p_how, p_now) then (town.cat('forest')->>'squirrel')::integer
    when town.gift_works(p_purse, 'famStag') then (town.cat('forest')->>'stag')::integer
    else (town.cat('forest')->>'reach')::integer end
$$;

-- The stamina a gathering of a kind of place costs somebody now (lib/town/forest's costFor): its own; none of theirs
-- when the squirrel fetches it.
create or replace function town.wild_cost(p_purse jsonb, p_kind jsonb, p_now bigint)
returns double precision language sql stable
as $$ select case when town.wild_fetches(p_purse, p_kind->>'how', p_now) then 0 else (p_kind->>'cost')::double precision end $$;

-- town.gather: v153's, written whole from its text. Changed: how far one reaches and what it costs are asked with the
-- moment (two lines), and what the squirrel fetched is one of its fetches of these hours, counted when the thing is in
-- the bag (the block before the last statement).
CREATE OR REPLACE FUNCTION town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_with text DEFAULT NULL::text, p_lost boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('forest');
  spot jsonb := town.wild_place(f, p_spot);
  kind jsonb := town.wild_rule(f, spot->>0);
  bag jsonb := p_purse->'bag';
  item text := p_has->>'item';
  n integer;
  wrong integer := 0;
  piglet boolean := coalesce(kind->>'how' = 'dig' and p_with = 'famPiglet', false);
  mine jsonb := p_purse;
  used jsonb;
  secret boolean := town.wild_secret(f, p_spot);
  found jsonb := case when jsonb_typeof(p_purse->'forest'->'secrets') = 'array' then p_purse->'forest'->'secrets' else '[]'::jsonb end;
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null or (secret and not town.wearing(p_purse, 'charmFirefly')) then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > town.wild_reach(p_purse, kind->>'how', p_now) then return town.no('far'); end if;
  if secret then
    if coalesce(p_lost, false) or floor(coalesce(p_misses, 0)) > 0 or floor(coalesce(p_wrong, 0)) > 0 then
      return jsonb_build_object('ok', true, 'lost', true, 'got', '[]'::jsonb, 'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now));
    end if;
    n := (p_has->>'n')::int;
    if town.room(bag, item) < n then return town.no('full'); end if;
    if not found @> to_jsonb(p_spot) then
      select jsonb_agg(e.v order by e.v) into found from (select x.v::int as v from jsonb_array_elements_text(found) x(v) union select p_spot) e;
    end if;
    return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(item, n)),
      'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now) || jsonb_build_object('bag', town.put(bag, item, n),
        'forest', case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end || jsonb_build_object('secrets', found)));
  end if;
  if piglet then
    used := town.gift_use(p_purse, 'famPiglet', p_now);
    if not (used->>'ok')::boolean then return used; end if;
    mine := used->'purse';
  elsif kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int)
    + case when piglet then (town.cat('gifts')->'gifts'->'famPiglet'->>'by')::int else 0 end;
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  -- (fetched by the squirrel: one of its fetches of these hours)
  if town.wild_fetches(p_purse, kind->>'how', p_now) then
    used := town.gift_use(mine, 'famSquirrel', p_now);
    if (used->>'ok')::boolean then mine := used->'purse'; end if;
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(mine, town.wild_cost(p_purse, kind, p_now), p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$function$;

-- public.town_gather: v153's, written whole from its text. Changed: whether it was the squirrel that fetched the thing
-- is asked with the moment, and the deed says how many fetches these hours have left (the deed's `by` line, and one more).
CREATE OR REPLACE FUNCTION public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  with_ text := case when jsonb_typeof(went->'with') = 'string' then went->>'with' end;
  lost_ boolean := coalesce(case when jsonb_typeof(went->'lost') = 'boolean' then (went->>'lost')::boolean end, false);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', town.wild_rule(f, spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, town.wild_rule(f, spot->>0)->>'how', now_) then jsonb_build_object('by', 'famSquirrel', 'left',
                (town.cat('gifts')->'uses'->'famSquirrel'->>'n')::integer - town.used_of(did->'purse', 'famSquirrel', now_))
              when with_ = 'famPiglet' and town.wild_rule(f, spot->>0)->>'how' = 'dig' and not town.wild_secret(f, p_spot) then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end
      || case when town.wild_secret(f, p_spot) then jsonb_build_object('secret', true) else '{}'::jsonb end);
    end if;
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$;

-- (the forms of two words: nothing calls them now)
drop function if exists town.wild_fetches(jsonb, text);
drop function if exists town.wild_reach(jsonb, text);
drop function if exists town.wild_cost(jsonb, jsonb);

revoke execute on function public.town_gather(integer, integer, integer, jsonb) from public, anon;
grant execute on function public.town_gather(integer, integer, integer, jsonb) to authenticated;

-- ─── Nobody calls a rule of schema town ────────────────────────────────────
revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select data->'uses'->'famSquirrel' as squirrel, (select count(*) from jsonb_object_keys(data->'uses')) as counted from public.town_catalog where key = 'gifts';
--   -- {"n": 20, "per": "meal"} | 16
--
--   select to_regprocedure('town.wild_fetches(jsonb, text)') is null and to_regprocedure('town.wild_reach(jsonb, text)') is null
--            and to_regprocedure('town.wild_cost(jsonb, jsonb)') is null as old_gone,
--          to_regprocedure('town.wild_fetches(jsonb, text, bigint)') is not null and to_regprocedure('town.wild_reach(jsonb, text, bigint)') is not null
--            and to_regprocedure('town.wild_cost(jsonb, jsonb, bigint)') is not null as new_there;
--   -- true | true
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what the squirrels fetched, a member and a meal's hours at a time, and who came to the end of the count
--   select d.member_id, (d.at at time zone 'Asia/Bangkok')::date as day, count(*) as fetches, sum(d.n) as things, min((d.doc->>'left')::int) as least_left
--     from public.town_deeds d where d.what = 'gather' and d.doc->>'by' = 'famSquirrel' and d.at > now() - interval '3 days'
--    group by 1, 2 order by 3 desc limit 40;
