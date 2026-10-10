-- v184: reading the grain, selecting a trunk's parts, and 25 useful woodcutting items.
-- Run after v180-v182 and the matching site deploy. v183 may already have run. Safe to run twice.
-- Full definitions preserve tree ownership, echo groups, lost games, stamina and atomic bag capacity.
begin;
do $guard$ begin
 if town.cat('fishing')->'waters' is null or town.cat('workshop') is null then raise exception 'Run v180 through v182 first'; end if;
 if md5(replace(pg_get_functiondef('town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text)'::regprocedure),chr(13),'')) not in ('30c97869e73f3d7991db272664e96a3e','9b778831c3d4913abb5d0dd47e1e743a') then raise exception 'Definition changed: town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text); rebuild v184'; end if;
 if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('437e9721b0731a89faca53af0ca7c179','8a0bccd51542b30a8a3eb60828244f8a') then raise exception 'Definition changed: town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v184'; end if;
 if md5(replace(pg_get_functiondef('public.town_fell(jsonb,integer,integer)'::regprocedure),chr(13),'')) not in ('c4853d9feebfb2d13d458c73c432c757','fced0fe5bb0693aee26aa362c9071a82') then raise exception 'Definition changed: public.town_fell(jsonb,integer,integer); rebuild v184'; end if;
end $guard$;
update public.town_catalog set data=data || $wood${"knottedWood":{"kind":"wood","tier":2,"stack":20,"pays":3},"straightWood":{"kind":"wood","tier":2,"stack":20,"pays":5},"heartwood":{"kind":"wood","tier":3,"stack":20,"pays":8},"pineBark":{"kind":"wood","tier":2,"stack":20,"pays":2},"pinePitch":{"kind":"wood","tier":2,"stack":20,"pays":4},"pineNut":{"kind":"wood","tier":2,"stack":20,"pays":4},"rootFiber":{"kind":"wood","tier":2,"stack":20,"pays":3},"cedarSliver":{"kind":"wood","tier":3,"stack":20,"pays":12},"splitPlank":{"kind":"goods","tier":2,"stack":20,"pays":5},"carvingBlank":{"kind":"goods","tier":2,"stack":20,"pays":7},"pitchSeal":{"kind":"goods","tier":2,"stack":20,"pays":6},"sapSyrup":{"kind":"goods","tier":2,"stack":20,"pays":6},"pineNutFlour":{"kind":"goods","tier":2,"stack":20,"pays":5},"rootTwine":{"kind":"goods","tier":2,"stack":20,"pays":6},"woodOil":{"kind":"goods","tier":2,"stack":20,"pays":8},"notchGauge":{"kind":"tool","tier":2,"stack":1,"pays":24},"grainLens":{"kind":"tool","tier":2,"stack":1,"pays":40},"fellingWedge":{"kind":"tool","tier":2,"stack":1,"pays":26},"barkKnife":{"kind":"tool","tier":2,"stack":1,"pays":25},"sapTap":{"kind":"tool","tier":2,"stack":1,"pays":25},"braceStake":{"kind":"tool","tier":2,"stack":1,"pays":30},"pineNutRice":{"kind":"dish","tier":2,"stack":20,"pays":18},"cedarBroth":{"kind":"dish","tier":3,"stack":20,"pays":24},"pineNutCake":{"kind":"dish","tier":2,"stack":20,"pays":20},"sapGlazedFish":{"kind":"dish","tier":2,"stack":20,"pays":22},"scrollPineNutRice":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollCedarBroth":{"kind":"scroll","tier":3,"stack":1,"pays":12},"scrollPineNutCake":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollSapGlazedFish":{"kind":"scroll","tier":2,"stack":1,"pays":12}}$wood$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data || $wood${"scrollPineNutRice":"pineNutRice","scrollCedarBroth":"cedarBroth","scrollPineNutCake":"pineNutCake","scrollSapGlazedFish":"sapGlazedFish"}$wood$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=data || $wood${"splitPlank":{"needs":[["straightWood",1]],"in":["cleaver"],"gives":2},"carvingBlank":{"needs":[["heartwood",1],["woodOil",1]],"in":["cleaver"],"gives":2},"pitchSeal":{"needs":[["pinePitch",2],["charcoal",1]],"in":["pot"],"gives":3},"sapSyrup":{"needs":[["pineNut",1],["sugar",2]],"in":["pot"],"gives":2},"pineNutFlour":{"needs":[["pineNut",3]],"in":["mortar"],"gives":2},"rootTwine":{"needs":[["rootFiber",3]],"in":[],"gives":2},"woodOil":{"needs":[["pineNut",2],["oil",1],["pineBark",1]],"in":["mortar"],"gives":2}}$wood$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data || $wood${"pineNutRice":{"stamina":24,"buff":"grain","recipe":{"needs":[["pineNut",2],["rice",2],["salt",1]],"in":["pot"],"serves":3,"cooks":1}},"cedarBroth":{"stamina":34,"buff":"grain","recipe":{"needs":[["cedarSliver",1],["brookFillet",1],["rosemary",1],["salt",1]],"in":["pot"],"serves":4,"cooks":1}},"pineNutCake":{"stamina":28,"buff":"grain","recipe":{"needs":[["pineNutFlour",2],["egg",1],["sapSyrup",1]],"in":["pan"],"serves":3,"cooks":1}},"sapGlazedFish":{"stamina":30,"buff":"hearty","recipe":{"needs":[["sapSyrup",1],["creekDace",2],["salt",1]],"in":["grill"],"serves":2,"cooks":1}}}$wood$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data #> '{buffs}','{}'::jsonb) || $wood${"grain":1}$wood$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data #> '{steps}','{}'::jsonb) || $wood${"grain":[1,1,1,1]}$wood$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($wood$["splitPlank","carvingBlank","pitchSeal","sapSyrup","pineNutFlour","rootTwine","woodOil","pineNutRice","cedarBroth","pineNutCake","sapGlazedFish"]$wood$::jsonb) with ordinality a(v,ord) where not (data #> '{recipes}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data #> '{needs}','{}'::jsonb) || $wood${"splitPlank":{"straightWood":1},"carvingBlank":{"heartwood":1,"woodOil":1},"pitchSeal":{"charcoal":1,"pinePitch":2},"sapSyrup":{"pineNut":1,"sugar":2},"pineNutFlour":{"pineNut":3},"rootTwine":{"rootFiber":3},"woodOil":{"oil":1,"pineBark":1,"pineNut":2},"pineNutRice":{"pineNut":2,"rice":2,"salt":1},"cedarBroth":{"brookFillet":1,"cedarSliver":1,"rosemary":1,"salt":1},"pineNutCake":{"egg":1,"pineNutFlour":2,"sapSyrup":1},"sapGlazedFish":{"creekDace":2,"salt":1,"sapSyrup":1}}$wood$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data #> '{bowled}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($wood$["pineNutRice","cedarBroth","pineNutCake","sapGlazedFish"]$wood$::jsonb) with ordinality a(v,ord) where not (data #> '{bowled}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{putIn,also}',coalesce(data #> '{putIn,also}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($wood$["straightWood","heartwood","pineBark","pinePitch","pineNut","rootFiber","cedarSliver"]$wood$::jsonb) with ordinality a(v,ord) where not (data #> '{putIn,also}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data #> '{ids}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($wood$[["pineNutRice",0],["pineNutCake",15],["sapGlazedFish",15],["splitPlank",0],["carvingBlank",9],["pitchSeal",0],["sapSyrup",15],["pineNutFlour",0],["rootTwine",0],["woodOil",9],["cedarBroth",0]]$wood$::jsonb) with ordinality a(v,ord) where not (data #> '{ids}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data #> '{kitchen,pot}','{}'::jsonb) || $wood${"splitPlank":1,"carvingBlank":1,"pitchSeal":1,"sapSyrup":1,"pineNutFlour":1,"rootTwine":1,"woodOil":1,"pineNutRice":3,"cedarBroth":4,"pineNutCake":3,"sapGlazedFish":2}$wood$::jsonb),updated_at=now() where key='work';
insert into public.town_catalog(key,data) values('woodcutting',$wood${"version":1,"quality":{"rough":1,"clear":2,"heart":2},"hints":{"notchGauge":1,"grainLens":3},"parts":{"barkKnife":2,"sapTap":2},"brace":1}$wood$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','{}'::jsonb) || $wood${"notchGauge":{"needs":[["splitPlank",2],["oreCopper",1]],"fee":24},"grainLens":{"needs":[["carvingBlank",2],["oreSilver",2],["cedarSliver",1]],"fee":40},"fellingWedge":{"needs":[["oreIron",2],["knottedWood",2],["pitchSeal",1]],"fee":26},"barkKnife":{"needs":[["oreIron",2],["splitPlank",1],["rootTwine",1]],"fee":25},"sapTap":{"needs":[["oreCopper",2],["pineBark",2],["pitchSeal",1]],"fee":25},"braceStake":{"needs":[["carvingBlank",2],["rootTwine",2]],"fee":30}}$wood$::jsonb),updated_at=now() where key='workshop';
create or replace function town.wood_choice(p_choice jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
 if jsonb_typeof(p_choice) is distinct from 'object' or jsonb_typeof(p_choice->'notches') is distinct from 'array' then return false; end if;
 return coalesce(jsonb_array_length(p_choice->'notches') = 3
   and p_choice->'notches'->0 in ('-1'::jsonb,'1'::jsonb) and p_choice->'notches'->1 in ('-1'::jsonb,'1'::jsonb) and p_choice->'notches'->2 in ('-1'::jsonb,'1'::jsonb)
   and p_choice->'direction' in ('-1'::jsonb,'1'::jsonb) and p_choice->>'part' in ('wood','bark','sap','seed','root'),false);
end $$;
create or replace function town.wood_mods(p_purse jsonb,p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('hints',greatest(case when town.has_buff(p_purse,p_now,'grain') then 3 else 0 end,
   case when town.held(p_purse->'bag','grainLens') > 0 then (k->'hints'->>'grainLens')::integer when town.held(p_purse->'bag','notchGauge') > 0 then (k->'hints'->>'notchGauge')::integer else 0 end),
   'direction',town.held(p_purse->'bag','fellingWedge') > 0,'buffered',town.held(p_purse->'bag','braceStake') > 0) from (select town.cat('woodcutting') k) q
$$;
create or replace function town.wood_quality(p_tree integer,p_choice jsonb,p_misses numeric,p_purse jsonb,p_now bigint)
returns text language sql stable set search_path = '' as $$
 select case when hits = 4 and misses = 0 then 'heart' when hits >= 3 and misses <= 1 then 'clear' else 'rough' end from (
   select (select count(*) from generate_series(0,3) i where (case when i=3 then p_choice->>'direction' else p_choice->'notches'->>i end)::integer = case when ((abs(p_tree)::bigint % 16) >> i) & 1 = 1 then 1 else -1 end) hits,
     greatest(0,p_misses-case when town.held(p_purse->'bag','braceStake') > 0 then (town.cat('woodcutting')->>'brace')::integer else 0 end) misses
 ) q
$$;
create or replace function town.wood_yield(p_elder boolean,p_part text,p_quality text,p_purse jsonb)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_array(jsonb_build_array(
   case p_part when 'wood' then case when p_elder then 'cedarSliver' when p_quality='heart' then 'heartwood' when p_quality='clear' then 'straightWood' else 'knottedWood' end when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,
   case p_part when 'wood' then case when p_elder then 1 else (k->'quality'->>p_quality)::integer end when 'bark' then case when town.held(p_purse->'bag','barkKnife') > 0 then (k->'parts'->>'barkKnife')::integer else 1 end when 'sap' then case when town.held(p_purse->'bag','sapTap') > 0 then (k->'parts'->>'sapTap')::integer else 1 end else case when p_quality='rough' then 1 else 2 end end)) from (select town.cat('woodcutting') k) q
$$;
revoke all on function town.wood_choice(jsonb),town.wood_mods(jsonb,bigint),town.wood_quality(integer,jsonb,numeric,jsonb,bigint),town.wood_yield(boolean,text,text,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.fell_begin(p_purse jsonb, p_grove jsonb, p_tree integer, p_x integer, p_y integer, p_now bigint, p_seed bigint, p_me text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
  trunk jsonb;
  knobs jsonb;
  spent_ boolean;
begin
  if t is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, t);
  if refused is not null then return town.no(refused); end if;
  if town.tree_held(p_grove, p_tree, p_now, p_me) then return town.no('held'); end if;
  if not town.tree_grown(p_grove, t, p_now) then return town.no('stump'); end if;
  grp := town.fell_group(p_purse, p_grove, t, axe, p_now, p_me);
  if town.stow_all(p_purse, town.fell_most(axe, grp)) is null then return town.no('full'); end if;
  trunk := town.fell_trunk(axe, p_grove, grp);
  knobs := town.tree_knobs(trunk->'t');
  spent_ := town.stamina_of(p_purse, p_now) <= 0;
  return jsonb_build_object('ok', true,
    'trees', (select jsonb_agg((g.v->>0)::integer order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
    'elder', town.tree_elder(t),
    'ask', jsonb_build_object(
      'trees', (select jsonb_agg(jsonb_build_object('id', (g.v->>0)::integer, 'girth', town.tree_girth(g.v), 'timber', town.tree_bears(g.v)) order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
      'chops', (trunk->>'chops')::integer, 'seed', town.fell_seed(p_seed, p_tree), 'girth', town.tree_girth(trunk->'t'), 'family', knobs->'family',
      'ahead', case when town.tree_elder(t) and town.tool_has(axe, 'axElder') then (town.cat('mining')->>'all')::double precision else town.axe_ahead(axe) end,
      'pace', town.axe_pace(axe) * case when spent_ then (knobs->>'spent')::double precision else (knobs->>'pace')::double precision end,
      'spared', town.gem_by(axe, 'water', k->'axe'->'gems'->'water'->'spared') + case when town.gift_works(p_purse, 'famWoodpecker') then (k->>'pecks')::double precision else 0 end,
      'grain', town.wood_mods(p_purse, p_now) || jsonb_build_object('tree',p_tree),
      'spent', spent_));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
  quality_ text;
begin
  if p_went ? 'grain' and (not town.wood_choice(p_went->'grain') or jsonb_typeof(p_went->'misses') is distinct from 'number') then return town.no('none'); end if;
  if p_went ? 'grain' and ((p_went->>'misses')::numeric <> floor((p_went->>'misses')::numeric) or (p_went->>'misses')::numeric not between 0 and 1000) then return town.no('none'); end if;
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- ── v172: there is no plain way any more: a tree is felled at its board ──
  if plain_ then return town.no('board'); end if;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  -- ── v173: and so does every other tree: a go that is lost fells nothing, gives nothing and costs no stamina ──
  if not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  if board_ and p_went ? 'grain' then quality_ := town.wood_quality((first_->>0)::integer,p_went->'grain',misses,p_purse,p_now); end if;
  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by', axe) else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every', axe) then logs := logs + town.opt_n('axDust', 'more', axe); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by', axe); timber := timber * town.opt_n('axDouble', 'by', axe);
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in', axe) then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_by(axe, 'earth', k->'axe'->'gems'->'earth'->'stamina'), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    if quality_ is not null then got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse); end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when quality_ is not null then jsonb_build_object('quality',quality_) else '{}'::jsonb end
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_fell(p_went jsonb, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  k jsonb := town.cat('trees');
  said jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  -- (no trunk has more segments than the stoutest takes with a plain axe, so no go has more misses)
  most integer := greatest((k->>'elderChops')::integer, (select max((g.v->>'chops')::integer) from jsonb_array_elements(k->'girths') g(v)));
  went jsonb;
  grove jsonb;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  bracer uuid;
  luck jsonb := '[]'::jsonb;
  r1 double precision;
  r2 double precision;
  r3 double precision;
  r4 double precision;
  r5 double precision;
  r6 double precision;
  i integer;
  spent_ boolean;
  did jsonb;
  f jsonb;
  paid jsonb;
  -- ── the forge's great fire (v174): its row, where this call holds it ──
  fire_ jsonb;
begin
  if jsonb_typeof(said->'tree') is distinct from 'number' or p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if (said->>'tree')::numeric <> floor((said->>'tree')::numeric) or abs((said->>'tree')::numeric) > 100000 then return town.answer(me, town.no('none')); end if;
  -- what the browser says of its go is kept as this and no more: the tree, three yeses, the misses and the seconds
  went := jsonb_build_object('tree', (said->>'tree')::numeric::integer,
      'through', coalesce(said->'through' = 'true'::jsonb, false), 'plain', coalesce(said->'plain' = 'true'::jsonb, false),
      'one', coalesce(said->'one' = 'true'::jsonb, false), 'twice', coalesce(said->'twice' = 'true'::jsonb, false),
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest(floor((said->>'misses')::numeric), 0), most) else 0 end)
    || case when jsonb_typeof(said->'secs') = 'number' then jsonb_build_object('secs', least(greatest((said->>'secs')::double precision, 0), 3600)) else '{}'::jsonb end;
  -- Grain is judged by the private rule, before any village or purse write.
  if said ? 'grain' then
    if not town.wood_choice(said->'grain') or jsonb_typeof(said->'misses') is distinct from 'number' then return town.answer(me,town.no('none')); end if;
    if (said->>'misses')::numeric <> floor((said->>'misses')::numeric) or (said->>'misses')::numeric not between 0 and 1000 then return town.answer(me,town.no('none')); end if;
    went := went || jsonb_build_object('grain',said->'grain');
  end if;
  -- the village's row first
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  -- whoever braces the trunk of my go has a purse to be paid into: it is held with mine, the lesser id first
  -- ── the forge's great fire (v174): the village's row, held after the grove and before any purse, and only while its tinder can be found by me ──
  if town.fire_wants('tinder', me, now_) then fire_ := town.fire_kept(true); end if;
  -- ── the forge's great fire (v174): its end ──
  go_ := grove->'goes'->(me::text);
  if jsonb_typeof(go_->'braced') = 'string' then
    if go_->>'braced' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      if go_->>'braced' <> me::text then
        if town.is_member((go_->>'braced')::uuid) then bracer := (go_->>'braced')::uuid; end if;
      end if;
    end if;
  end if;
  if bracer is not null and bracer < me then theirs := town.purse_of(bracer, true); end if;
  purse := town.purse_of(me, true);
  if bracer is not null and bracer > me then theirs := town.purse_of(bracer, true); end if;
  spent_ := town.stamina_of(purse, now_) <= 0;
  -- a set of numbers of chance for each tree a go may fell, drawn here and never sent: in the order the code draws them
  for i in 1..(k->'echo'->>'trees')::integer loop
    r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random(); r6 := random();
    luck := luck || jsonb_build_array(jsonb_build_object('dark', r1, 'scent', r2, 'which', r3, 'chain', r4, 'keep', r5, 'kind', r6));
  end loop;
  did := town.fell(purse, grove, me::text, went, p_x, p_y, now_, luck,
    (select coalesce(nullif(coalesce(p.character_name, p.display_name, p.discord_username, ''), ''), me::text) from public.profiles p where p.id = me));
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
  end if;
  perform town.keep_purse(me, did->'purse');
  perform town.keep_thing('grove', did->'grove');
  -- ── the forge's great fire (v174): a tree felled may be the village's tinder, kept under the name of whoever felled it ──
  if fire_ is not null and jsonb_array_length(did->'felled') > 0 then
    did := did || town.fire_find(fire_, 'tinder', me, now_);
  end if;
  -- ── the forge's great fire (v174): its end ──
  -- the friend at the trunk: a log into their own purse, where there is room for one
  if did->>'braced' is not null and theirs is not null and (did->>'braced') = bracer::text then
    paid := town.brace_pay(theirs);
    perform town.keep_purse(bracer, paid->'purse');
    perform town.note(bracer, 'brace', did->'felled'->0->>'kind', coalesce((paid->'got'->0->>1)::numeric, 0), 0,
      jsonb_build_object('tree', did->'felled'->0->'id', 'feller', me));
  end if;
  for f, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(did->'felled') with ordinality e(v, ord) order by e.ord loop
    perform town.note(me, 'fell', f->>'kind', 1, 0,
      jsonb_build_object('tree', f->'id', 'misses', f->'misses', 'girth', f->'girth', 'timber', f->'timber') || case when f ? 'quality' then jsonb_build_object('quality',f->'quality','part',went->'grain'->'part') else '{}'::jsonb end
      || case when (did->>'plain')::boolean then '{"how": "plain"}'::jsonb when (did->>'one')::boolean then '{"how": "one"}'::jsonb else '{}'::jsonb end
      || case when f ? 'keepsake' then jsonb_build_object('keepsake', f->'keepsake') else '{}'::jsonb end
      || case when i = 0 and did->>'braced' is not null then jsonb_build_object('braced', did->>'braced') else '{}'::jsonb end
      -- (and what only this record can say of it: the tile stood on, what the tree gave, how long the hand says it
      -- played, whether it was played with no stamina, and what the axe's own did)
      || jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'got', f->'got', 'secs', coalesce(went->'secs', '0'::jsonb), 'spent', spent_)
      || case when (f->>'twice')::boolean then '{"twice": true}'::jsonb else '{}'::jsonb end
      || case when (f->>'free')::boolean then '{"free": true}'::jsonb else '{}'::jsonb end
      || case when f->'chained' <> 'null'::jsonb then jsonb_build_object('chained', f->'chained') else '{}'::jsonb end);
  end loop;
  -- (the keepsakes found are told as `keeps`: `found`, in an answer of the game's, is the list of what the village has
  -- found, which a page keeps whole from whatever answer brings it)
  return town.answer(me, (did - 'grove' - 'found') || jsonb_build_object('keeps', did->'found', 'trees', town.trees_told(did->'grove', did->'purse', now_)));
end;
$function$
;
notify pgrst,'reload schema';
commit;
-- Expected: 25 new woodcutting items; the helper is private. No existing purse is changed by installation.
select data from public.town_catalog where key='woodcutting';
select has_function_privilege('authenticated','town.wood_yield(boolean,text,text,jsonb)','EXECUTE') as helper; -- false
