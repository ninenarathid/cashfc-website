-- v185: echoes, mineral seams, intact crystals and 25 useful mining items.
-- Run after v184 and the matching site. Safe to run twice. No existing purse is reset.
-- The same bounded vein account pays both sides of the choice. Crystals replace gem fragments.
begin;
do $guard$ begin
 if town.cat('woodcutting') is null then raise exception 'Run v184 first'; end if;
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('93d960c38fe65e521b6d174e3bca06b2','a2ef7add086def9ec8327cdbd2704bc9') then raise exception 'Definition changed: town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v185'; end if;
 if md5(replace(pg_get_functiondef('town.vein_end(jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('30b5185af22470749daba4ba3803910f','14ca7f971e623c71060a699a5365994a') then raise exception 'Definition changed: town.vein_end(jsonb,jsonb,bigint); rebuild v185'; end if;
 if md5(replace(pg_get_functiondef('public.town_vein(jsonb)'::regprocedure),chr(13),'')) not in ('2356a1a407b19e08592c4f2550b0284f','6b87dafc7c2a77d100e0807e7542cbe3') then raise exception 'Definition changed: public.town_vein(jsonb); rebuild v185'; end if;
end $guard$;
update public.town_catalog set data=data || $geo${"slateLayer":{"kind":"mineral","tier":2,"stack":20,"pays":3},"clayPocket":{"kind":"mineral","tier":2,"stack":20,"pays":3},"quartzCore":{"kind":"mineral","tier":2,"stack":20,"pays":6},"pyriteCluster":{"kind":"mineral","tier":2,"stack":20,"pays":5},"copperNodule":{"kind":"mineral","tier":2,"stack":20,"pays":7},"ironNodule":{"kind":"mineral","tier":2,"stack":20,"pays":8},"silverNodule":{"kind":"mineral","tier":3,"stack":20,"pays":12},"mineralSalt":{"kind":"staple","tier":2,"stack":20,"pays":4},"wholeGeode":{"kind":"mineral","tier":3,"stack":20,"pays":15},"stoneTile":{"kind":"goods","tier":2,"stack":20,"pays":6},"crystalLens":{"kind":"goods","tier":2,"stack":20,"pays":8},"sparkPowder":{"kind":"goods","tier":2,"stack":20,"pays":6},"copperBlank":{"kind":"goods","tier":2,"stack":20,"pays":9},"steelPlate":{"kind":"goods","tier":2,"stack":20,"pays":10},"geodeDisplay":{"kind":"goods","tier":3,"stack":20,"pays":22},"echoHammer":{"kind":"tool","tier":2,"stack":1,"pays":25},"cavityLens":{"kind":"tool","tier":2,"stack":1,"pays":28},"crystalWrap":{"kind":"tool","tier":2,"stack":1,"pays":22},"oreSieve":{"kind":"tool","tier":2,"stack":1,"pays":26},"seamChisel":{"kind":"tool","tier":2,"stack":1,"pays":27},"surveyCord":{"kind":"tool","tier":2,"stack":1,"pays":24},"minerRice":{"kind":"dish","tier":2,"stack":20,"pays":18},"caveStew":{"kind":"dish","tier":2,"stack":20,"pays":22},"saltRoast":{"kind":"dish","tier":2,"stack":20,"pays":24},"seamCake":{"kind":"dish","tier":2,"stack":20,"pays":20},"scrollMinerRice":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollCaveStew":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollSaltRoast":{"kind":"scroll","tier":2,"stack":1,"pays":12},"scrollSeamCake":{"kind":"scroll","tier":2,"stack":1,"pays":12}}$geo$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data || $geo${"scrollMinerRice":"minerRice","scrollCaveStew":"caveStew","scrollSaltRoast":"saltRoast","scrollSeamCake":"seamCake"}$geo$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=data || $geo${"stoneTile":{"needs":[["slateLayer",2],["clayPocket",1]],"in":[],"gives":2},"crystalLens":{"needs":[["quartzCore",2]],"in":["mortar"],"gives":1},"sparkPowder":{"needs":[["pyriteCluster",2]],"in":["mortar"],"gives":3},"copperBlank":{"needs":[["copperNodule",2],["charcoal",1]],"in":["grill"],"gives":2},"steelPlate":{"needs":[["ironNodule",2],["charcoal",2]],"in":["grill"],"gives":2},"geodeDisplay":{"needs":[["wholeGeode",1],["silverNodule",1],["carvingBlank",1]],"in":[],"gives":1}}$geo$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data || $geo${"minerRice":{"stamina":24,"buff":"layers","recipe":{"needs":[["mineralSalt",1],["rice",2]],"in":["pot"],"serves":3,"cooks":1}},"caveStew":{"stamina":30,"buff":"layers","recipe":{"needs":[["mineralSalt",1],["shiitake",2],["wildYam",1]],"in":["pot"],"serves":3,"cooks":1}},"saltRoast":{"stamina":28,"buff":"hearty","recipe":{"needs":[["mineralSalt",2],["creekDace",2]],"in":["grill"],"serves":3,"cooks":1}},"seamCake":{"stamina":24,"buff":"layers","recipe":{"needs":[["mineralSalt",1],["flour",2],["egg",1]],"in":["pan"],"serves":3,"cooks":1}}}$geo$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data #> '{buffs}','{}'::jsonb) || $geo${"layers":1}$geo$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data #> '{steps}','{}'::jsonb) || $geo${"layers":[1,1,1,1]}$geo$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($geo$["stoneTile","crystalLens","sparkPowder","copperBlank","steelPlate","geodeDisplay","minerRice","caveStew","saltRoast","seamCake"]$geo$::jsonb) with ordinality a(v,ord) where not (data #> '{recipes}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data #> '{needs}','{}'::jsonb) || $geo${"stoneTile":{"clayPocket":1,"slateLayer":2},"crystalLens":{"quartzCore":2},"sparkPowder":{"pyriteCluster":2},"copperBlank":{"charcoal":1,"copperNodule":2},"steelPlate":{"charcoal":2,"ironNodule":2},"geodeDisplay":{"carvingBlank":1,"silverNodule":1,"wholeGeode":1},"minerRice":{"mineralSalt":1,"rice":2},"caveStew":{"mineralSalt":1,"shiitake":2,"wildYam":1},"saltRoast":{"creekDace":2,"mineralSalt":2},"seamCake":{"egg":1,"flour":2,"mineralSalt":1}}$geo$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data #> '{bowled}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($geo$["minerRice","caveStew","saltRoast","seamCake"]$geo$::jsonb) with ordinality a(v,ord) where not (data #> '{bowled}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{putIn,also}',coalesce(data #> '{putIn,also}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($geo$["slateLayer","clayPocket","quartzCore","pyriteCluster","copperNodule","ironNodule","silverNodule","mineralSalt","wholeGeode"]$geo$::jsonb) with ordinality a(v,ord) where not (data #> '{putIn,also}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data #> '{ids}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($geo$[["minerRice",0],["caveStew",0],["saltRoast",0],["seamCake",12],["stoneTile",0],["crystalLens",0],["sparkPowder",0],["copperBlank",0],["steelPlate",0],["geodeDisplay",9]]$geo$::jsonb) with ordinality a(v,ord) where not (data #> '{ids}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data #> '{kitchen,pot}','{}'::jsonb) || $geo${"stoneTile":1,"crystalLens":1,"sparkPowder":1,"copperBlank":1,"steelPlate":1,"geodeDisplay":1,"minerRice":3,"caveStew":3,"saltRoast":3,"seamCake":3}$geo$::jsonb),updated_at=now() where key='work';
insert into public.town_catalog(key,data) values('geology',$geo${"version":1,"ore":2,"sieve":1,"crystal":1,"quartz":1}$geo$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','{}'::jsonb) || $geo${"echoHammer":{"needs":[["copperBlank",2],["timber",1]],"fee":25},"cavityLens":{"needs":[["crystalLens",1],["copperBlank",1]],"fee":28},"crystalWrap":{"needs":[["silkCocoon",4],["rootTwine",1]],"fee":22},"oreSieve":{"needs":[["steelPlate",2],["rootTwine",1]],"fee":26},"seamChisel":{"needs":[["steelPlate",2],["sparkPowder",1]],"fee":27},"surveyCord":{"needs":[["rootTwine",2],["copperBlank",1]],"fee":24}}$geo$::jsonb),updated_at=now() where key='workshop';
create or replace function town.rock_choice(p_choice jsonb)
returns boolean language sql immutable set search_path = '' as $$
 select coalesce(jsonb_typeof(p_choice)='object' and p_choice->'echo' in ('-1'::jsonb,'1'::jsonb) and p_choice->>'focus' in ('ore','crystal'),false)
$$;
create or replace function town.geology_mods(p_purse jsonb,p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('hint',town.has_buff(p_purse,p_now,'layers') or town.held(p_purse->'bag','echoHammer')>0,'cavities',town.held(p_purse->'bag','cavityLens')>0,'preserve',town.held(p_purse->'bag','crystalWrap')>0,'sieve',town.held(p_purse->'bag','oreSieve')>0,'chisel',town.held(p_purse->'bag','seamChisel')>0,'cord',town.held(p_purse->'bag','surveyCord')>0)
$$;
create or replace function town.geological_yield(p_vein jsonb,p_choice jsonb,p_ore numeric,p_gems integer,p_purse jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
 k jsonb := town.cat('geology');
 correct boolean := (p_choice->>'echo')::integer = case when abs((p_vein->>'seed')::numeric) % 2 = 1 then 1 else -1 end;
 pool jsonb := case when (p_vein->>'f')::integer < 11 then '["slateLayer","clayPocket","mineralSalt","pyriteCluster"]'::jsonb when (p_vein->>'f')::integer < 21 then '["copperNodule","ironNodule","mineralSalt","pyriteCluster"]'::jsonb else '["silverNodule","ironNodule","copperNodule","pyriteCluster"]'::jsonb end;
 got jsonb := '[]'::jsonb;
begin
 if p_ore+p_gems <= 0 then return got; end if;
 if p_choice->>'focus'='crystal' then
  return case when p_gems>0 and coalesce(p_vein->'gem','null'::jsonb)<>'null'::jsonb and correct then jsonb_build_array(jsonb_build_array('wholeGeode',(k->>'crystal')::integer+case when town.held(p_purse->'bag','crystalWrap')>0 then 1 else 0 end)) else got end;
 end if;
 if p_ore>0 then got:=jsonb_build_array(jsonb_build_array(pool->>((abs((p_vein->>'seed')::numeric) % 4)::integer),(case when correct then (k->>'ore')::integer else 1 end)+case when town.held(p_purse->'bag','oreSieve')>0 then (k->>'sieve')::integer else 0 end)); end if;
 if correct and (town.held(p_purse->'bag','seamChisel')>0 or town.held(p_purse->'bag','surveyCord')>0) then got:=got || jsonb_build_array(jsonb_build_array('quartzCore',(k->>'quartz')::integer)); end if;
 return got;
end $$;
revoke all on function town.rock_choice(jsonb),town.geology_mods(jsonb,bigint),town.geological_yield(jsonb,jsonb,numeric,integer,jsonb) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_rock->>0)::integer;
  here integer := (p_go->>'crystal')::integer;
  touch double precision := (m->>'touch')::double precision;
  pick jsonb := case when p_own then town.mine_pick(p_purse) else town.mine_any_pick(p_purse) end;
  opts jsonb := town.tool_mods(pick)->'opts';
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  spent boolean := town.stamina_of(p_purse, now_) <= 0;
  veins double precision := town.mine_veins(pick);
  holds jsonb := town.mine_holds_by(p_word, floor_, rock_, turn_, p_go->'today', veins);
  breaks jsonb;                 -- [{rock: [id, x, y, look], holds}, …]: the rock struck first
  r jsonb;
  b jsonb;
  h jsonb;
  chance double precision;
  chained integer;
  got_ jsonb := '[]'::jsonb;
  each_ jsonb := '[]'::jsonb;
  moss jsonb := '[]'::jsonb;
  gone jsonb;
  loose jsonb;
  ore_ text := town.mine_ore(floor_);
  crumb integer := (kept->>'crumb')::integer;
  shards double precision;
  by_ double precision;
  way_ integer;
  shattered boolean := false;
  vein_ jsonb := 'null'::jsonb;
  stowed jsonb;
  after_ jsonb;
  cost double precision := 0;
  owed double precision := (kept->>'owed')::double precision;
  fresh_ jsonb;
  eased_ jsonb;
  used jsonb;
  had_ double precision;
  key_ text := floor_::text || ':' || turn_::text;
  paid jsonb;
begin
  if holds->>'kind' = 'vein' and kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;

  -- which rocks break: the one struck; by `pkQuake`, plain rocks about the member; and by the roll of `:chain`, now and
  -- then a neighbour. (Never a rock somebody else has begun: that one is theirs.)
  breaks := jsonb_build_array(jsonb_build_object('rock', p_rock, 'holds', holds));
  if p_quake then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when (r->>0)::integer = rock_ or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, town.opt_n('pkQuake', 'reach', pick));
      h := town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word);
      if h is not null then breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', h)); end if;
    end loop;
  end if;
  chance := town.gem_by(pick, 'lightning', m->'pick'->'gems'->'lightning'->'chain');
  if chance > 0 and town.roll(p_word || ':chain', floor_, rock_, turn_) < chance then
    -- (the nearest plain rock that touches it and still stands; of two as near, the lesser number)
    r := (select x.v from jsonb_array_elements(p_go->'rocks') x(v)
           where town.cave_stands(p_go->'cave', (x.v->>0)::integer, now_, here)
             and not exists (select 1 from jsonb_array_elements(breaks) q(v) where q.v->'rock'->>0 = x.v->>0)
             and town.mine_near((p_rock->>1)::numeric, (p_rock->>2)::numeric, (x.v->>1)::integer, (x.v->>2)::integer, touch)
             and town.mine_plain_at(p_go, (x.v->>0)::integer, p_struck->>'first', veins, p_word) is not null
           order by ((x.v->>1)::integer - (p_rock->>1)::integer) * ((x.v->>1)::integer - (p_rock->>1)::integer) + ((x.v->>2)::integer - (p_rock->>2)::integer) * ((x.v->>2)::integer - (p_rock->>2)::integer), (x.v->>0)::integer
           limit 1);
    if r is not null then
      breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word)));
      chained := (r->>0)::integer;
    end if;
  end if;

  -- what they leave
  for b in select x.v from jsonb_array_elements(breaks) with ordinality x(v, ord) order by x.ord loop
    got_ := town.mine_add(got_, 'stone', (m->>'stone')::double precision);
    h := b->'holds';
    shards := 0;
    if h->>'kind' in ('stone', 'way') then
      shards := (h->>'shards')::double precision;
      if h->>'kind' = 'way' then
        way_ := (b->'rock'->>0)::integer;
      elsif opts ? 'pkCrumb' then
        crumb := crumb + 1;
        if crumb >= town.opt_n('pkCrumb', 'every', pick) then crumb := 0; shards := shards + town.opt_n('pkCrumb', 'more', pick); end if;
      end if;
      if h->>'kind' = 'stone' and coalesce((h->>'moss')::boolean, false) then moss := moss || jsonb_build_array((b->'rock'->>0)::integer); end if;
      got_ := town.mine_add(got_, ore_, shards);
    elsif h->>'kind' = 'crystal' then
      shattered := true;
      by_ := case when opts ? 'pkGleam' then town.opt_n('pkGleam', 'by', pick) else 1 end;
      shards := ceil((m->'crystal'->>'shards')::double precision * by_);
      got_ := town.mine_add(got_, m->'ores'->-1->>'shard', shards);
      got_ := town.mine_add(got_, town.cat('forge')->'gems'->(p_go->>'element')->>'chip', ceil((m->'crystal'->>'chips')::double precision * by_));
    end if;
    each_ := each_ || jsonb_build_array(jsonb_build_object('rock', (b->'rock'->>0)::integer, 'kind', h->>'kind', 'shards', shards));
  end loop;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;

  -- what it costs: a point a go, by `pkFresh`'s count and `pick.gems.earth.stamina` (a share kept exact over time)
  after_ := stowed;
  fresh_ := case when opts ? 'pkFresh' then town.use_power(after_, pick, 'pkFresh', now_) end;
  if fresh_ is not null and (fresh_->>'ok')::boolean then
    after_ := fresh_->'purse';
  else
    had_ := town.stamina_of(after_, now_);
    eased_ := town.eased(after_, town.spend(after_, (m->>'stamina')::double precision, now_), now_,
      1::double precision - town.gem_by(pick, 'earth', m->'pick'->'gems'->'earth'->'stamina'), owed);
    cost := had_ - town.stamina_of(eased_->'purse', now_);
    after_ := eased_->'purse';
    owed := (eased_->>'owed')::double precision;
  end if;
  if p_quake then
    used := town.use_power(after_, pick, 'pkQuake', now_);
    if (used->>'ok')::boolean then after_ := used->'purse'; end if;
  end if;
  if holds->>'kind' = 'vein' then
    -- the vein is the member's from here: played with the pick as it is now, and with the stamina left after the rock
    vein_ := jsonb_build_object('f', floor_, 'rock', rock_, 'turn', turn_, 'seed', holds->'seed',
      'gem', case when (holds->>'gem')::boolean then p_go->'element' else 'null'::jsonb end,
      'geology', town.geology_mods(p_purse,now_),
      'mods', town.vein_mods(pick, town.stamina_of(after_, now_) <= 0),
      'more', case when (holds->>'gem')::boolean and opts ? 'pkCutter' then town.opt_n('pkCutter', 'more', pick) else 0 end);
    had_ := town.stamina_of(after_, now_);
    after_ := town.spend(after_, (m->'vein'->>'stamina')::double precision, now_);
    cost := cost + (had_ - town.stamina_of(after_, now_));
  end if;

  -- what is loosened: the rocks that touch one that broke, and still stand
  gone := (select jsonb_agg((x.v->'rock'->>0)::integer order by x.ord) from jsonb_array_elements(breaks) with ordinality x(v, ord));
  loose := coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(case when kept->'loose'->>'k' = key_ then kept->'loose'->'ids' else '[]'::jsonb end) with ordinality i(v, ord)
                      where not exists (select 1 from jsonb_array_elements(gone) g(v) where g.v = i.v)), '[]'::jsonb);
  if opts ? 'pkLoose' then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(gone || loose) g(v) where (g.v #>> '{}')::numeric = (r->>0)::numeric)
        or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not exists (select 1 from jsonb_array_elements(breaks) q(v)
                        where town.mine_near((q.v->'rock'->>1)::numeric, (q.v->'rock'->>2)::numeric, (r->>1)::integer, (r->>2)::integer, touch));
      loose := loose || jsonb_build_array((r->>0)::integer);
    end loop;
    loose := coalesce((select jsonb_agg(i.v order by (i.v #>> '{}')::numeric) from jsonb_array_elements(loose) i(v)), '[]'::jsonb);
  end if;
  -- (broken for them by somebody else: their page is to say so once, with what it left and who it was)
  paid := case when p_own then kept->'paid' else jsonb_build_object('at', now_, 'f', floor_, 'rock', rock_, 'got', got_, 'way', way_ is not null, 'crystal', shattered,
    'vein', vein_ <> 'null'::jsonb, 'by', coalesce(p_go->>'name', '')) end;
  -- (a rock that opens no vein leaves the vein that is open as it is: whoever struck a rock first and has opened a
  -- vein elsewhere since is paid for the rock when somebody else breaks it, and their vein is theirs to play still.
  -- A rock that does open one never comes here with one open: it is refused at the top, and waits)
  after_ := after_ || jsonb_build_object('mine', kept || jsonb_build_object('owed', owed, 'crumb', crumb, 'loose', jsonb_build_object('k', key_, 'ids', loose),
    'vein', case when vein_ <> 'null'::jsonb then vein_ else kept->'vein' end,
    'last', case when p_own then to_jsonb(now_) else kept->'last' end, 'paid', paid));
  return jsonb_build_object('ok', true, 'done', true, 'purse', after_, 'struck', p_struck, 'broke', gone, 'chained', chained, 'got', got_, 'way', way_, 'vein', vein_,
    'crystal', shattered, 'loose', loose, 'cost', cost, 'spent', spent, 'each', each_, 'moss', moss);
end;
$function$
;
CREATE OR REPLACE FUNCTION town.vein_end(p_purse jsonb, p_go jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if p_go ? 'geology' and not town.rock_choice(p_go->'geology') then return town.no('none'); end if;
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null and coalesce(p_go->'geology'->>'focus','ore') <> 'crystal' then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  pick := town.mine_pick(p_purse);
  twin := case when jsonb_array_length(got_) > 0 and not twice and pick is not null then town.use_power(p_purse, pick, 'pkTwin', p_now) end;
  if coalesce((twin->>'ok')::boolean, false) then
    select jsonb_agg(jsonb_build_array(g.v->>0, (g.v->>1)::numeric * town.opt_n('pkTwin', 'times', pick)) order by g.ord) into got_
      from jsonb_array_elements(got_) with ordinality g(v, ord);
  end if;
  if p_go ? 'geology' then got_ := got_ || town.geological_yield(vein_,p_go->'geology',ore,jsonb_array_length(p_go->'gems'),p_purse); end if;
  stowed := town.stow_all(case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else p_purse end, got_);
  if stowed is null then return town.no('full'); end if;
  after_ := stowed;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', false, 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      'null'::jsonb)));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.town_vein(p_go jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  -- (what is no account, or too long to be one, is none)
  said jsonb := town.claims(p_go);
  did jsonb := town.vein_end(purse, said, now_);
  vein_ jsonb := town.mine_of(purse)->'vein';
  ore_ text;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    ore_ := town.mine_ore((vein_->>'f')::integer);
    perform town.note(me, 'vein', case when exists (select 1 from jsonb_array_elements(did->'got') g(v) where g.v->>0 = ore_) then ore_ end, (did->>'passed')::numeric, 0,
      jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'strikes', said->'strikes', 'struck', did->'struck', 'passed', did->'passed', 'of', did->'of')
      || case when (vein_->'mods'->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || coalesce((select jsonb_build_object('chip', g.v->0) from jsonb_array_elements(did->'got') with ordinality g(v, ord) where g.v->>0 <> ore_ order by g.ord limit 1), '{}'::jsonb)
      || case when vein_->'gem' <> 'null'::jsonb then jsonb_build_object('gem', vein_->'gem') else '{}'::jsonb end
      || case when coalesce((vein_->>'again')::boolean, false) then '{"again": true}'::jsonb else '{}'::jsonb end
      || case when said ? 'geology' then jsonb_build_object('geology',said->'geology') else '{}'::jsonb end
      || jsonb_build_object('said', jsonb_build_object('ore', said->'ore', 'gems', said->'gems', 'seed', vein_->'seed', 'mods', vein_->'mods', 'more', vein_->'more')));
    return town.answer(me, jsonb_build_object('ok', true, 'got', did->'got', 'passed', did->'passed', 'of', did->'of', 'again', did->'again', 'caveMine', town.cave_own(did->'purse', now_)));
  end if;
  if did->>'why' = 'odd' then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'vein_odd', null, 0, 0, jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'how', did->'how', 'said', said,
      'seed', vein_->'seed', 'gem', vein_->'gem', 'mods', vein_->'mods', 'more', vein_->'more'));
    return town.answer(me, town.no('odd') || jsonb_build_object('caveMine', town.cave_own(did->'purse', now_)));
  end if;
  return town.answer(me, did || jsonb_build_object('caveMine', town.cave_own(purse, now_)));
end;
$function$
;
notify pgrst,'reload schema';
commit;
-- Expected: the geological knobs, and no member access to the reward helper.
select data from public.town_catalog where key='geology';
select has_function_privilege('authenticated','town.geological_yield(jsonb,jsonb,numeric,integer,jsonb)','EXECUTE') as helper; -- false
