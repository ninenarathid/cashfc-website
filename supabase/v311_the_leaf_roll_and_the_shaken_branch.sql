-- v311 — the leaf roll and the shaken branch
-- Run this once in the Supabase SQL editor, after v310. Running it again is safe and changes nothing more.
--
-- The owner, 2026-10-27, to the plan both AIs made ("แมลงที่มี mechanic ใหม่ๆ ในการหา") and to the species lists ("OK
-- แล้ว"): twenty-one insects found two new ways, never at a haunt and never drawn to a good garden. lib/town/board-insects
-- is the page's twin, word for word in its numbers (BOARD, the eighteen spots, the twenty-one of lib/town/board-insect-rows).
--
-- What changes:
--   * The catalog: a `boards` row (BOARD, the spots, the rows and their weights, as lib/town/catalog writes it), and the
--     twenty-one merged into the rows they belong to, entry by entry and never a row written over: `items` (each a bag
--     item), `insects` (`bugs`, with no haunt and no weight, and `order`), `work` (`insects`, their points),
--     `insect_garden` (visitors, pollinators, predators), `quality` (the pollinators' `skies`, the soil workers of the
--     insect house). A good garden draws what the `insects` row's `garden.draws` says, which has none of them, so it
--     still draws none of them (town.bug_at: v267's good garden is unchanged).
--   * What a spot holds in a turn (town.board_held, lib/town/board-insects' heldAt): turns of half an hour; a quarter of
--     them hold an insect, by town.roll (lib/town/farm's roll), the place, the tree and the Bangkok hour of the turn's
--     first moment, a common one weighing three times a rare one; a branch drops two.
--   * The leaf roll (public.town_board_roll): opened near its bush (openRoll), and what was in it cupped by whoever is
--     first in its turn, not sooner than four seconds after opening it (takeRoll).
--   * The shaken branch (public.town_board_shake): called at a tree (callShake), the town called for somebody to hold
--     the sheet (three calls, a minute apart, 120 letters, each the town's news: town_announcements' kind 'shake', its
--     `to` the shake and the tree; callForHolder), the sheet held (joinShake), the catch said by the holder
--     (endShake), and each of the two has one of what it caught (claimShake).
--   * An insect had so is in the bag at once, with its one stamina (spent as v307's giant pull spends it: never
--     refused for want of it), refused only when the bag has no room for it; it is a net's insect on the insects'
--     line (the owner, 2026-10-28: "ควรได้แต้มทั้งคู่": the 'net' deed town_net writes, the same rule: a common one 3, a
--     rare one 8, the work row's `insects`, and the first of each kind ten more); and the first of its kind is written
--     in the village's insect book as a net's catch is (town_net: the `bugs` thing).
--   * public.town_boards_now: the spots' turns and the shakes of this turn and the one before.
--   * The announcements' reader of the pages from before v309 (town_announcements_v299) leaves out the shakes' calls
--     as it leaves out the giants'.
-- Every row is held while a deed is judged (each spot by an advisory lock, as the beds are), so that two takes of one
-- roll or two calls at one tree cannot both be had.

begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';

do $guard$ begin
  if to_regprocedure('public.town_announcements_v309(bigint,text)') is null or to_regprocedure('town.giant_words(text)') is null
     or to_regprocedure('town.giant_name(uuid)') is null or to_regprocedure('town.giant_rules()') is null then
    raise exception 'v311: run v309 first';
  end if;
  if to_regprocedure('public.town_fish_book()') is null then raise exception 'v311: run v310 first'; end if;
  if to_regprocedure('town.roll(text,bigint[])') is null or to_regprocedure('town.spend(jsonb,double precision,bigint)') is null
     or to_regprocedure('town.thing(text,boolean)') is null or to_regprocedure('town.keep_thing(text,jsonb)') is null then
    raise exception 'v311: the town''s own functions are missing';
  end if;
  if (select count(*) from public.town_catalog c where c.key in ('items', 'insects', 'work', 'insect_garden', 'quality')) <> 5
     or (select jsonb_typeof(c.data->'house') from public.town_catalog c where c.key = 'quality') is distinct from 'object' then
    raise exception 'v311: the catalog''s rows it merges into are missing (v265 for the insect house)';
  end if;
end $guard$;

-- ── 1. The catalog ────────────────────────────────────────────────────────────────────────────────────────────────────
-- <catalog:v311> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('boards', $town${
    "turn": 1800000,
    "occupied": 0.25,
    "reach": 2,
    "seams": 4,
    "startle": 1500,
    "unrollMin": 4000,
    "call": 180000,
    "shake": 30000,
    "shakeMin": 5000,
    "drops": 2,
    "spots": [{"id":0,"board":"roll","x":62,"y":7,"place":"town"},{"id":1,"board":"roll","x":27,"y":16,"place":"town"},{"id":2,"board":"roll","x":44,"y":30,"place":"town"},{"id":3,"board":"roll","x":60,"y":7,"place":"town"},{"id":4,"board":"roll","x":56,"y":72,"place":"town"},{"id":5,"board":"roll","x":42,"y":64,"place":"town"},{"id":6,"board":"roll","x":6,"y":13,"place":"town"},{"id":7,"board":"roll","x":46,"y":17,"place":"town"},{"id":8,"board":"roll","x":25,"y":43,"place":"town"},{"id":9,"board":"roll","x":205,"y":180,"place":"forest"},{"id":10,"board":"roll","x":212,"y":176,"place":"forest"},{"id":11,"board":"roll","x":163,"y":180,"place":"forest"},{"id":12,"board":"shake","x":19,"y":31,"place":"town","tree":"cherry"},{"id":13,"board":"shake","x":48,"y":57,"place":"town","tree":"cherry"},{"id":14,"board":"shake","x":23,"y":5,"place":"town","tree":"cedar"},{"id":15,"board":"shake","x":4,"y":77,"place":"town","tree":"cedar"},{"id":16,"board":"shake","x":204,"y":170,"place":"forest","tree":"oak"},{"id":17,"board":"shake","x":200,"y":164,"place":"forest","tree":"oak"}],
    "rows": [{"id":"crimsonRollerWeevil","board":"roll","place":"town","trees":null,"hours":[[5,13]],"rare":false},{"id":"giraffeNeckWeevil","board":"roll","place":"forest","trees":null,"hours":[[7,16]],"rare":false},{"id":"jadeRollerWeevil","board":"roll","place":"town","trees":null,"hours":[[11,19]],"rare":false},{"id":"hazelCigarWeevil","board":"roll","place":"forest","trees":null,"hours":[[13,19]],"rare":false},{"id":"amberLeafroller","board":"roll","place":"town","trees":null,"hours":[[16,23]],"rare":false},{"id":"rosefoldMoth","board":"roll","place":"town","trees":null,"hours":[[16,23]],"rare":false},{"id":"silverfoldMoth","board":"roll","place":"town","trees":null,"hours":[[19,24],[0,3]],"rare":false},{"id":"copperfoldMoth","board":"roll","place":"forest","trees":null,"hours":[[19,24],[0,3]],"rare":false},{"id":"inkspotLeaftier","board":"roll","place":"town","trees":null,"hours":[[23,24],[0,5]],"rare":false},{"id":"lanternfoldMoth","board":"roll","place":"forest","trees":null,"hours":[[23,24],[0,7]],"rare":false},{"id":"dewfoldMoth","board":"roll","place":"town","trees":null,"hours":[[3,7]],"rare":true},{"id":"mistrollWeevil","board":"roll","place":"forest","trees":null,"hours":[[3,7]],"rare":true},{"id":"checkeredBarkBeetle","board":"shake","place":null,"trees":null,"hours":[[16,21]],"rare":false},{"id":"twigLacewing","board":"shake","place":null,"trees":null,"hours":[[16,21]],"rare":false},{"id":"blossomChafer","board":"shake","place":null,"trees":["cherry"],"hours":[[16,19]],"rare":false},{"id":"thornTreehopper","board":"shake","place":null,"trees":null,"hours":[[16,23]],"rare":false},{"id":"cedarLonghorn","board":"shake","place":null,"trees":["cedar"],"hours":[[16,23]],"rare":false},{"id":"barkAssassinBug","board":"shake","place":null,"trees":null,"hours":[[19,24],[0,1]],"rare":false},{"id":"mossStickInsect","board":"shake","place":null,"trees":null,"hours":[[19,24],[0,3]],"rare":false},{"id":"lanternWeevil","board":"shake","place":null,"trees":null,"hours":[[21,24],[0,3]],"rare":false},{"id":"ghostBarkMantis","board":"shake","place":null,"trees":null,"hours":[[23,24],[0,3]],"rare":true}],
    "weight": {"common":3,"rare":1}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v311>

-- (a list with what it has not of another, in that one's order, after its own)
create or replace function town.list_with(p_list jsonb, p_more jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(p_list, '[]'::jsonb) || coalesce((select jsonb_agg(m.x order by m.n) from jsonb_array_elements(p_more) with ordinality m(x, n)
                                                     where not coalesce(p_list, '[]'::jsonb) @> jsonb_build_array(m.x)), '[]'::jsonb)
$$;
revoke all on function town.list_with(jsonb, jsonb) from public, anon, authenticated;

-- (the twenty-one, as lib/town/catalog's catalogOf() has them in each row)
with v as (select
  '{"crimsonRollerWeevil":{"kind":"bug","tier":2,"stack":20,"pays":3},"giraffeNeckWeevil":{"kind":"bug","tier":2,"stack":20,"pays":5},"jadeRollerWeevil":{"kind":"bug","tier":2,"stack":20,"pays":3},"hazelCigarWeevil":{"kind":"bug","tier":2,"stack":20,"pays":4},"amberLeafroller":{"kind":"bug","tier":2,"stack":20,"pays":3},"rosefoldMoth":{"kind":"bug","tier":2,"stack":20,"pays":4},"silverfoldMoth":{"kind":"bug","tier":2,"stack":20,"pays":3},"copperfoldMoth":{"kind":"bug","tier":2,"stack":20,"pays":4},"inkspotLeaftier":{"kind":"bug","tier":2,"stack":20,"pays":5},"lanternfoldMoth":{"kind":"bug","tier":2,"stack":20,"pays":5},"dewfoldMoth":{"kind":"bug","tier":3,"stack":10,"pays":8},"mistrollWeevil":{"kind":"bug","tier":3,"stack":10,"pays":8},"checkeredBarkBeetle":{"kind":"bug","tier":2,"stack":20,"pays":4},"twigLacewing":{"kind":"bug","tier":2,"stack":20,"pays":4},"blossomChafer":{"kind":"bug","tier":2,"stack":20,"pays":5},"thornTreehopper":{"kind":"bug","tier":2,"stack":20,"pays":4},"cedarLonghorn":{"kind":"bug","tier":2,"stack":20,"pays":5},"barkAssassinBug":{"kind":"bug","tier":2,"stack":20,"pays":5},"mossStickInsect":{"kind":"bug","tier":2,"stack":20,"pays":5},"lanternWeevil":{"kind":"bug","tier":2,"stack":20,"pays":5},"ghostBarkMantis":{"kind":"bug","tier":3,"stack":10,"pays":6}}'::jsonb as items,
  '{"crimsonRollerWeevil":3,"giraffeNeckWeevil":3,"jadeRollerWeevil":3,"hazelCigarWeevil":3,"amberLeafroller":3,"rosefoldMoth":3,"silverfoldMoth":3,"copperfoldMoth":3,"inkspotLeaftier":3,"lanternfoldMoth":3,"dewfoldMoth":8,"mistrollWeevil":8,"checkeredBarkBeetle":3,"twigLacewing":3,"blossomChafer":3,"thornTreehopper":3,"cedarLonghorn":3,"barkAssassinBug":3,"mossStickInsect":3,"lanternWeevil":3,"ghostBarkMantis":8}'::jsonb as work,
  '{"crimsonRollerWeevil":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[5,13]]},"giraffeNeckWeevil":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[7,16]]},"jadeRollerWeevil":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[11,19]]},"hazelCigarWeevil":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[13,19]]},"amberLeafroller":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,23]]},"rosefoldMoth":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,23]]},"silverfoldMoth":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[19,24],[0,3]]},"copperfoldMoth":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[19,24],[0,3]]},"inkspotLeaftier":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[23,24],[0,5]]},"lanternfoldMoth":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[23,24],[0,7]]},"dewfoldMoth":{"habit":"look","at":[],"weight":5,"n":[1,1],"cost":1,"hours":[[3,7]]},"mistrollWeevil":{"habit":"look","at":[],"weight":5,"n":[1,1],"cost":1,"hours":[[3,7]]},"checkeredBarkBeetle":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,21]]},"twigLacewing":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,21]]},"blossomChafer":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,19]]},"thornTreehopper":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,23]]},"cedarLonghorn":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[16,23]]},"barkAssassinBug":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[19,24],[0,1]]},"mossStickInsect":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[19,24],[0,3]]},"lanternWeevil":{"habit":"look","at":[],"weight":60,"n":[1,1],"cost":1,"hours":[[21,24],[0,3]]},"ghostBarkMantis":{"habit":"look","at":[],"weight":5,"n":[1,1],"cost":1,"hours":[[23,24],[0,3]]}}'::jsonb as bugs,
  '["crimsonRollerWeevil","giraffeNeckWeevil","jadeRollerWeevil","hazelCigarWeevil","amberLeafroller","rosefoldMoth","silverfoldMoth","copperfoldMoth","inkspotLeaftier","lanternfoldMoth","dewfoldMoth","mistrollWeevil","checkeredBarkBeetle","twigLacewing","blossomChafer","thornTreehopper","cedarLonghorn","barkAssassinBug","mossStickInsect","lanternWeevil","ghostBarkMantis"]'::jsonb as ord,
  '["crimsonRollerWeevil","giraffeNeckWeevil","jadeRollerWeevil","hazelCigarWeevil","amberLeafroller","rosefoldMoth","silverfoldMoth","copperfoldMoth","inkspotLeaftier","lanternfoldMoth","dewfoldMoth","mistrollWeevil","checkeredBarkBeetle","twigLacewing","blossomChafer","thornTreehopper","cedarLonghorn","barkAssassinBug","mossStickInsect","lanternWeevil","ghostBarkMantis"]'::jsonb as visitors,
  '["amberLeafroller","rosefoldMoth","silverfoldMoth","copperfoldMoth","inkspotLeaftier","lanternfoldMoth","dewfoldMoth","blossomChafer","thornTreehopper"]'::jsonb as pollinators,
  '["twigLacewing","barkAssassinBug","ghostBarkMantis"]'::jsonb as predators,
  '{"amberLeafroller":"moon","rosefoldMoth":"moon","silverfoldMoth":"moon","copperfoldMoth":"moon","inkspotLeaftier":"moon","lanternfoldMoth":"moon","dewfoldMoth":"mist","blossomChafer":"sun","thornTreehopper":"sun"}'::jsonb as skies,
  '["crimsonRollerWeevil","giraffeNeckWeevil","jadeRollerWeevil","hazelCigarWeevil","mistrollWeevil","checkeredBarkBeetle","cedarLonghorn","mossStickInsect","lanternWeevil"]'::jsonb as soil),
merged as (
  select c.key, case c.key
      when 'items' then c.data || v.items
      when 'work' then jsonb_set(c.data, '{insects}', coalesce(c.data->'insects', '{}'::jsonb) || v.work)
      when 'insects' then jsonb_set(jsonb_set(c.data, '{bugs}', coalesce(c.data->'bugs', '{}'::jsonb) || v.bugs), '{order}', town.list_with(c.data->'order', v.ord))
      when 'insect_garden' then jsonb_set(jsonb_set(jsonb_set(c.data, '{visitors}', town.list_with(c.data->'visitors', v.visitors)),
        '{pollinators}', town.list_with(c.data->'pollinators', v.pollinators)), '{predators}', town.list_with(c.data->'predators', v.predators))
      when 'quality' then jsonb_set(jsonb_set(c.data, '{skies}', coalesce(c.data->'skies', '{}'::jsonb) || v.skies),
        '{house,soilWorkers}', town.list_with(c.data->'house'->'soilWorkers', v.soil))
    end as data
    from public.town_catalog c, v
   where c.key in ('items', 'work', 'insects', 'insect_garden', 'quality'))
update public.town_catalog c set data = m.data, updated_at = now()
  from merged m
 where c.key = m.key and c.data is distinct from m.data;

-- ── 2. What a spot holds in a turn (heldAt) ───────────────────────────────────────────────────────────────────────────
-- (none, or one insect a roll and `drops` a branch: whether it holds any by the roll of `boardon`; who may be out by the
-- spot's board, place and tree and the Bangkok hour of the turn's first moment, fractions too (outAt); which, each by
-- the roll of `boardwho`, a common one weighing `weight.common` and a rare one `weight.rare`)
create or replace function town.board_held(p_spot integer, p_turn bigint)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  b jsonb := town.cat('boards');
  s jsonb;
  h double precision;
  out_ jsonb;
  all_ double precision := 0;
  at_ double precision;
  o jsonb;
  pick text;
  held jsonb := '[]'::jsonb;
  k integer;
begin
  if b is null or p_spot is null or p_spot < 0 or p_turn is null then return '[]'::jsonb; end if;
  s := b->'spots'->p_spot;
  if s is null then return '[]'::jsonb; end if;
  if town.roll('boardon', p_spot::bigint, p_turn) >= (b->>'occupied')::double precision then return '[]'::jsonb; end if;
  h := ((((p_turn * (b->>'turn')::bigint + 25200000) % 86400000) + 86400000) % 86400000)::double precision / 3600000;
  select coalesce(jsonb_agg(jsonb_build_object('id', r.v->>'id', 'w', case when (r.v->>'rare')::boolean then b->'weight'->'rare' else b->'weight'->'common' end) order by r.n), '[]'::jsonb)
    into out_
    from jsonb_array_elements(b->'rows') with ordinality r(v, n)
   where r.v->>'board' = s->>'board'
     and (jsonb_typeof(r.v->'place') is distinct from 'string' or r.v->>'place' = s->>'place')
     and (jsonb_typeof(r.v->'trees') is distinct from 'array' or (s->>'tree' is not null and r.v->'trees' ? (s->>'tree')))
     and exists (select 1 from jsonb_array_elements(r.v->'hours') x where h >= (x->>0)::double precision and h < (x->>1)::double precision);
  if jsonb_array_length(out_) = 0 then return '[]'::jsonb; end if;
  for o in select x from jsonb_array_elements(out_) with ordinality a(x, n) order by n loop all_ := all_ + (o->>'w')::double precision; end loop;
  for k in 0 .. (case when s->>'board' = 'roll' then 1 else (b->>'drops')::integer end) - 1 loop
    at_ := town.roll('boardwho', p_spot::bigint, p_turn, k::bigint) * all_;
    pick := out_->-1->>'id';
    for o in select x from jsonb_array_elements(out_) with ordinality a(x, n) order by n loop
      if at_ < (o->>'w')::double precision then pick := o->>'id'; exit; end if;
      at_ := at_ - (o->>'w')::double precision;
    end loop;
    held := held || to_jsonb(pick);
  end loop;
  return held;
end $$;

-- (nearSpot: within the board's reach of the spot, the farther way of the two counted)
create or replace function town.board_near(p_spot jsonb, p_x integer, p_y integer)
returns boolean language sql stable set search_path = '' as $$
  select p_spot is not null and p_x is not null and p_y is not null
     and greatest(abs(p_x - (p_spot->>'x')::numeric), abs(p_y - (p_spot->>'y')::numeric)) <= (town.cat('boards')->>'reach')::numeric
$$;

-- An insect had from a board: into my bag with its one stamina (lib/town/trial's boardGot: never refused for want of
-- it); a net's insect on the insects' line (the 'net' deed town_net writes, counted by the deeds' trigger through
-- town.work_counts_of by the work row's `insects`: a common one 3, a rare one 8, the first of each kind ten more); and
-- the first of its kind written in the village's insect book as a net's catch writes it (town_net)
create or replace function town.board_got(p_member uuid, p_purse jsonb, p_bug text, p_now bigint, p_doc jsonb default '{}'::jsonb)
returns void language plpgsql set search_path = '' as $$
declare
  book jsonb;
begin
  perform town.keep_purse(p_member, town.spend(p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', p_bug, 1)), 1::double precision, p_now));
  perform town.note(p_member, 'net', p_bug, 1, 0, coalesce(p_doc, '{}'::jsonb));
  book := town.thing('bugs', true);
  if not book ? p_bug then
    perform town.keep_thing('bugs', book || jsonb_build_object(p_bug, jsonb_build_object('by', p_member, 'at', p_now, 'name',
      (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_member))));
  end if;
end $$;
revoke all on function town.board_held(integer, bigint), town.board_near(jsonb, integer, integer), town.board_got(uuid, jsonb, text, bigint, jsonb) from public, anon, authenticated;

-- ── 3. The turns and the shakes ───────────────────────────────────────────────────────────────────────────────────────
-- (a spot's turn as it is kept, SpotTurn: who opened its roll when, each their own, and who took what it held)
create table if not exists public.town_board_turns (
  spot integer not null check (spot >= 0),
  turn bigint not null,
  opened jsonb not null default '{}'::jsonb check (jsonb_typeof(opened) = 'object'),
  taken uuid references public.profiles (id) on delete set null,
  primary key (spot, turn)
);
create index if not exists town_board_turns_turn on public.town_board_turns (turn);
-- (a shake: `doc` is the Shake as the page reads it; `spot`, `turn` and `at` are its doc's, to find it by)
create table if not exists public.town_board_shakes (
  id text primary key check (id ~ '^s[0-9a-f]{15}$'),
  spot integer not null,
  turn bigint not null,
  by_id uuid not null references public.profiles (id) on delete cascade,
  at bigint not null,
  doc jsonb not null check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);
create index if not exists town_board_shakes_spot on public.town_board_shakes (spot, turn, at desc);
create index if not exists town_board_shakes_turn on public.town_board_shakes (turn);
alter table public.town_board_turns enable row level security;
alter table public.town_board_shakes enable row level security;
revoke all on public.town_board_turns, public.town_board_shakes from public, anon, authenticated;

-- ── 4. The leaf roll: openRoll and takeRoll ───────────────────────────────────────────────────────────────────────────
create or replace function public.town_board_roll(p_action text, p_spot integer, p_x integer default null, p_y integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  me_ text := me::text;
  now_ bigint := town.now_ms();
  b jsonb := town.cat('boards');
  s jsonb;
  turn_ bigint;
  held_ text;
  t jsonb;
  purse_ jsonb;
  opened_ bigint;
begin
  if p_action is null or p_action not in ('open', 'take') then return town.answer(me, town.no('none')); end if;
  s := case when p_spot is not null and p_spot >= 0 then b->'spots'->p_spot end;
  if s is null or s->>'board' is distinct from 'roll' then return town.answer(me, town.no('none')); end if;
  -- (my purse held first, then the spot, as every deed holds them)
  if p_action = 'take' then purse_ := town.purse_of(me, true); end if;
  perform pg_advisory_xact_lock(hashtext('town.board'), p_spot);
  turn_ := now_ / (b->>'turn')::bigint;
  held_ := town.board_held(p_spot, turn_)->>0;
  select jsonb_build_object('spot', bt.spot, 'turn', bt.turn, 'opened', bt.opened, 'taken', bt.taken) into t
    from public.town_board_turns bt where bt.spot = p_spot and bt.turn = turn_;
  if p_action = 'open' then
    if held_ is null then return town.answer(me, town.no('none')); end if;
    t := coalesce(t, jsonb_build_object('spot', p_spot, 'turn', turn_, 'opened', '{}'::jsonb, 'taken', null));
    if t->>'taken' is not null then return town.answer(me, town.no('taken')); end if;
    if not town.board_near(s, p_x, p_y) then return town.answer(me, town.no('far')); end if;
    t := t || jsonb_build_object('opened', (t->'opened') || jsonb_build_object(me_, coalesce(t->'opened'->me_, to_jsonb(now_))));
    insert into public.town_board_turns as bt (spot, turn, opened) values (p_spot, turn_, t->'opened')
      on conflict (spot, turn) do update set opened = excluded.opened;
    return town.answer(me, jsonb_build_object('ok', true, 'turn', t, 'held', held_));
  end if;
  -- take
  if held_ is null or t is null then return town.answer(me, town.no('none')); end if;
  if t->>'taken' is not null then return town.answer(me, town.no('taken')); end if;
  if not town.board_near(s, p_x, p_y) then return town.answer(me, town.no('far')); end if;
  opened_ := (t->'opened'->>me_)::bigint;
  if opened_ is null or now_ - opened_ < (b->>'unrollMin')::bigint then return town.answer(me, town.no('soon')); end if;
  if town.room(purse_->'bag', held_) < 1 then return town.answer(me, town.no('full')); end if;
  t := t || jsonb_build_object('taken', me_);
  update public.town_board_turns bt set taken = me where bt.spot = p_spot and bt.turn = turn_;
  perform town.board_got(me, purse_, held_, now_, jsonb_build_object('board', 'roll', 'spot', p_spot, 'turn', turn_));
  return town.answer(me, jsonb_build_object('ok', true, 'turn', t, 'got', held_));
end $$;
revoke all on function public.town_board_roll(text, integer, integer, integer) from public, anon, authenticated;
grant execute on function public.town_board_roll(text, integer, integer, integer) to authenticated;

-- ── 5. The shaken branch: callShake, callForHolder, joinShake, endShake, claimShake ───────────────────────────────────
-- (the shake a deed is of: the one named, at that tree; with none named, the latest called at the tree this turn)
create or replace function public.town_board_shake(p_action text, p_spot integer, p_id text default null, p_x integer default null, p_y integer default null,
  p_caught numeric default null, p_text text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  me_ text := me::text;
  now_ bigint := town.now_ms();
  b jsonb := town.cat('boards');
  r jsonb := town.giant_rules();
  s jsonb;
  turn_ bigint;
  live jsonb;
  sh jsonb;
  purse_ jsonb;
  held_ jsonb;
  got_ text;
  words_ text;
  id_ text;
  key_ text;
  n_ integer;
begin
  if p_action is null or p_action not in ('call', 'text', 'join', 'end', 'claim') then return town.answer(me, town.no('none')); end if;
  s := case when p_spot is not null and p_spot >= 0 then b->'spots'->p_spot end;
  if s is not null and s->>'board' is distinct from 'shake' then s := null; end if;
  if p_action = 'claim' then purse_ := town.purse_of(me, true); end if;
  perform pg_advisory_xact_lock(hashtext('town.board'), coalesce(p_spot, -1));
  turn_ := now_ / (b->>'turn')::bigint;
  if s is not null then
    -- (a call is weighed against the tree's own latest shake of the turn, whatever id came with it: an unknown id must
    -- not make a tree that gave its insects give again)
    if p_id is not null and p_action <> 'call' then
      select bs.doc into live from public.town_board_shakes bs where bs.id = p_id and bs.spot = p_spot for update;
    else
      select bs.doc into live from public.town_board_shakes bs where bs.spot = p_spot and bs.turn = turn_ order by bs.at desc, bs.id desc limit 1 for update;
    end if;
  end if;

  if p_action = 'call' then
    if s is null or jsonb_array_length(town.board_held(p_spot, turn_)) = 0 then return town.answer(me, town.no('none')); end if;
    -- (a shake under way keeps the tree till its time is up, a call till it runs out: one begun and never ended, its
    -- page gone, frees the tree again)
    if live is not null and (live->>'turn')::bigint = turn_ and ((live->>'caught')::integer > 0
         or ((live->>'end')::bigint = 0 and case when (live->>'go')::bigint > 0 then now_ <= (live->>'go')::bigint + (b->>'shake')::bigint + 5000
                                                 else now_ < (live->>'at')::bigint + (b->>'call')::bigint end)) then
      return town.answer(me, town.no(case when (live->>'caught')::integer > 0 then 'taken' else 'busy' end));
    end if;
    if not town.board_near(s, p_x, p_y) then return town.answer(me, town.no('far')); end if;
    id_ := 's' || substr(md5(me_ || ':' || now_::text || ':' || random()::text), 1, 15);
    sh := jsonb_build_object('id', id_, 'spot', p_spot, 'turn', turn_, 'by', me_, 'byName', town.giant_name(me), 'at', now_,
      'holder', null, 'holderName', null, 'go', 0, 'end', 0, 'caught', 0, 'claimed', '[]'::jsonb, 'calls', '[]'::jsonb);
    insert into public.town_board_shakes (id, spot, turn, by_id, at, doc) values (id_, p_spot, turn_, me, now_, sh);
    return town.answer(me, jsonb_build_object('ok', true, 'shake', sh));
  elsif p_action = 'text' then
    if live is null or (live->>'go')::bigint > 0 or (live->>'end')::bigint > 0 or now_ >= (live->>'at')::bigint + (b->>'call')::bigint then
      return town.answer(me, town.no('late'));
    end if;
    if me_ is distinct from live->>'by' then return town.answer(me, town.no('theirs')); end if;
    n_ := jsonb_array_length(live->'calls');
    if n_ >= (r->>'calls')::integer then return town.answer(me, town.no('many')); end if;
    if n_ > 0 and now_ - (live->'calls'->>(n_ - 1))::bigint < (r->>'callGap')::bigint then return town.answer(me, town.no('soon')); end if;
    words_ := town.giant_words(p_text);
    if words_ is null then return town.answer(me, town.no(case when town.giant_line(p_text) <> '' then 'long' else 'empty' end)); end if;
    sh := live || jsonb_build_object('calls', live->'calls' || to_jsonb(now_));
    -- (the town's news, as a giant's call is: the shaker's name and face, the words, the way to the tree)
    key_ := 'shake:' || (live->>'id') || ':' || (n_ + 1);
    perform town.announce(me, 'shake', words_, 0, key_, false);
    update public.town_announcements a set toward = jsonb_build_object('hook', live->>'id', 'x', s->'x', 'y', s->'y') where a.event_key = key_;
  elsif p_action = 'join' then
    if s is null or live is null or (live->>'end')::bigint > 0 or (live->>'go')::bigint > 0
       or now_ >= (live->>'at')::bigint + (b->>'call')::bigint or turn_ <> (live->>'turn')::bigint then
      return town.answer(me, town.no('late'));
    end if;
    if live->>'by' = me_ then return town.answer(me, town.no('self')); end if;
    if not town.board_near(s, p_x, p_y) then return town.answer(me, town.no('far')); end if;
    sh := live || jsonb_build_object('holder', me_, 'holderName', town.giant_name(me), 'go', now_);
  elsif p_action = 'end' then
    if live is null or (live->>'go')::bigint = 0 or (live->>'end')::bigint > 0 then return town.answer(me, town.no('late')); end if;
    if me_ is distinct from live->>'holder' then return town.answer(me, town.no('theirs')); end if;
    if now_ - (live->>'go')::bigint < (b->>'shakeMin')::bigint then return town.answer(me, town.no('soon')); end if;
    if now_ > (live->>'go')::bigint + (b->>'shake')::bigint + 5000 then return town.answer(me, town.no('late')); end if;
    sh := live || jsonb_build_object('end', now_, 'caught', case when p_caught is null or p_caught = 'NaN'::numeric then 0
      else greatest(0::numeric, least((b->>'drops')::numeric, floor(p_caught)))::integer end);
  else
    -- claim: each of the two, one of what the sheet caught (the shaker the first, the holder the second, or the first)
    if s is null or live is null or (live->>'end')::bigint = 0 or (live->>'caught')::integer < 1 then return town.answer(me, town.no('none')); end if;
    if me_ is distinct from live->>'by' and me_ is distinct from live->>'holder' then return town.answer(me, town.no('theirs')); end if;
    if live->'claimed' ? me_ then return town.answer(me, town.no('taken')); end if;
    held_ := town.board_held((live->>'spot')::integer, (live->>'turn')::bigint);
    got_ := case when me_ = live->>'by' then held_->>0 else held_->>(least((live->>'caught')::integer, jsonb_array_length(held_)) - 1) end;
    if got_ is null then return town.answer(me, town.no('none')); end if;
    if town.room(purse_->'bag', got_) < 1 then return town.answer(me, town.no('full')); end if;
    sh := live || jsonb_build_object('claimed', live->'claimed' || to_jsonb(me_));
    perform town.board_got(me, purse_, got_, now_, jsonb_build_object('board', 'shake', 'spot', p_spot, 'shake', live->>'id'));
  end if;

  update public.town_board_shakes bs set doc = sh, updated_at = now() where bs.id = live->>'id';
  return town.answer(me, jsonb_build_object('ok', true, 'shake', sh)
    || case when words_ is not null then jsonb_build_object('words', words_) else '{}'::jsonb end
    || case when got_ is not null then jsonb_build_object('got', got_) else '{}'::jsonb end);
end $$;
revoke all on function public.town_board_shake(text, integer, text, integer, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.town_board_shake(text, integer, text, integer, integer, numeric, text) to authenticated;

-- ── 6. The boards now: this turn's and the one before ─────────────────────────────────────────────────────────────────
create or replace function public.town_boards_now()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := town.member();
  turn_ bigint := town.now_ms() / (town.cat('boards')->>'turn')::bigint;
begin
  return jsonb_build_object(
    'turns', coalesce((select jsonb_agg(jsonb_build_object('spot', t.spot, 'turn', t.turn, 'opened', t.opened, 'taken', t.taken) order by t.turn, t.spot)
                         from public.town_board_turns t where t.turn >= turn_ - 1), '[]'::jsonb),
    'shakes', coalesce((select jsonb_agg(s.doc order by s.at, s.id) from public.town_board_shakes s where s.turn >= turn_ - 1), '[]'::jsonb));
end $$;
revoke all on function public.town_boards_now() from public, anon, authenticated;
grant execute on function public.town_boards_now() to authenticated;

-- ── 7. A shake's call is the town's news ──────────────────────────────────────────────────────────────────────────────
alter table public.town_announcements drop constraint if exists town_announcements_kind_check;
alter table public.town_announcements add constraint town_announcements_kind_check
  check (kind in ('forge', 'rank', 'legend', 'forest', 'recipe', 'cross', 'depth', 'bridge', 'lamps', 'admin', 'casino', 'giant', 'shake'));
alter table public.town_announcements drop constraint if exists town_announcements_toward_check;
alter table public.town_announcements add constraint town_announcements_toward_check
  check (toward is null or (kind in ('giant', 'shake') and jsonb_typeof(toward) = 'object'));
-- (v309's reader has every kind; the pages from before it, which ask v299's, have no words for a giant's call or a shake's)
create or replace function public.town_announcements_v299(p_after bigint default null, p_look text default null) returns jsonb
language sql security definer set search_path = '' as $$
  select p.page || jsonb_build_object('events', coalesce((select jsonb_agg(e.value order by e.ord)
    from jsonb_array_elements(p.page -> 'events') with ordinality e(value, ord) where e.value ->> 'kind' not in ('giant', 'shake')), '[]'::jsonb))
  from (select public.town_announcements_v309(p_after, p_look) as page) p
$$;
revoke all on function public.town_announcements_v299(bigint, text) from public, anon, authenticated;
grant execute on function public.town_announcements_v299(bigint, text) to authenticated;

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select jsonb_array_length(data->'spots') spots, jsonb_array_length(data->'rows') insects from public.town_catalog where key = 'boards';
--                                -- 18, 21
--   select count(*) from public.town_catalog c, jsonb_each(c.data) e where c.key = 'items' and e.key in
--     (select r->>'id' from public.town_catalog b, jsonb_array_elements(b.data->'rows') r where b.key = 'boards');
--                                -- 21
--   select town.board_held(0, (extract(epoch from now()) * 1000)::bigint / 1800000);
--                                -- [] most turns, or the insect in the roll
--   select has_function_privilege('anon', 'public.town_board_roll(text,integer,integer,integer)', 'EXECUTE') as anon_roll,
--          has_function_privilege('anon', 'public.town_board_shake(text,integer,text,integer,integer,numeric,text)', 'EXECUTE') as anon_shake,
--          has_table_privilege('authenticated', 'public.town_board_turns', 'SELECT') as members_read;
--                                -- false, false, false
--   (a day on) select count(*) filter (where taken is not null) taken, count(*) from public.town_board_turns;
--              select doc->>'caught' caught, count(*) from public.town_board_shakes group by 1;
