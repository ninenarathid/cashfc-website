-- v188: forest traces, selected plant parts and shared recovery after uprooting.
-- Run after v187 and the matching site. Safe to run twice; inventories and coins are preserved.
-- Roots rest a site from its NEXT turn so current shares remain available to friends.
begin;
do $guard$ begin if town.cat('insect_garden') is null then raise exception 'Run v187 first'; end if; if md5(replace(pg_get_functiondef('public.town_gather(integer,integer,integer,jsonb)'::regprocedure),chr(13),'')) not in ('0ccfefef782e0b845f20a077024f7991','e2cab894733949fc4bba6c3dd4d5487b') then raise exception 'Definition changed: public.town_gather(integer,integer,integer,jsonb); rebuild v188 on current text'; end if;
if md5(replace(pg_get_functiondef('town.wild_holds(integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('bc5232e8d2a44af35f11747ee6903bae','a0172511c2c779fd2b16cabeda840a09') then raise exception 'Definition changed: town.wild_holds(integer,bigint,jsonb,text); rebuild v188 on current text'; end if; end $guard$;
update public.town_catalog set data=data || $forage${"forestLichen":{"kind":"wild","tier":2,"stack":20,"pays":5},"fragrantPetal":{"kind":"wild","tier":2,"stack":20,"pays":6},"flowerBulb":{"kind":"wild","tier":2,"stack":20,"pays":11},"bambooSheath":{"kind":"wild","tier":2,"stack":20,"pays":5},"fernTip":{"kind":"wild","tier":2,"stack":20,"pays":7},"wildMedicRoot":{"kind":"wild","tier":3,"stack":20,"pays":14},"berryPip":{"kind":"wild","tier":2,"stack":20,"pays":10},"mushroomSpores":{"kind":"wild","tier":2,"stack":20,"pays":9},"lichenSalt":{"kind":"staple","tier":2,"stack":20,"pays":12},"petalDye":{"kind":"goods","tier":2,"stack":20,"pays":16},"bulbPowder":{"kind":"staple","tier":2,"stack":20,"pays":19},"driedFern":{"kind":"staple","tier":2,"stack":20,"pays":17},"rootExtract":{"kind":"staple","tier":3,"stack":20,"pays":24},"berrySeedOil":{"kind":"staple","tier":2,"stack":20,"pays":22},"sporeCulture":{"kind":"staple","tier":2,"stack":20,"pays":23},"traceLens":{"kind":"tool","tier":2,"stack":1,"pays":30},"pruningKnife":{"kind":"tool","tier":2,"stack":1,"pays":26},"rootSpade":{"kind":"tool","tier":2,"stack":1,"pays":31},"seedSieve":{"kind":"tool","tier":2,"stack":1,"pays":27},"specimenPress":{"kind":"tool","tier":2,"stack":1,"pays":28},"forageBasket":{"kind":"tool","tier":2,"stack":1,"pays":32},"fernRice":{"kind":"dish","tier":2,"stack":20,"pays":25},"rootStew":{"kind":"dish","tier":3,"stack":20,"pays":32},"petalBiscuit":{"kind":"dish","tier":2,"stack":20,"pays":27},"sporeNoodles":{"kind":"dish","tier":2,"stack":20,"pays":29},"scrollFernRice":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollRootStew":{"kind":"scroll","tier":3,"stack":20,"pays":12},"scrollPetalBiscuit":{"kind":"scroll","tier":2,"stack":20,"pays":12},"scrollSporeNoodles":{"kind":"scroll","tier":2,"stack":20,"pays":12}}$forage$::jsonb,updated_at=now() where key='items';
update public.town_catalog set data=data || $forage${"lichenSalt":{"needs":[["forestLichen",2],["salt",1]],"in":["mortar"],"gives":2},"petalDye":{"needs":[["fragrantPetal",3],["oil",1]],"in":["pot"],"gives":2},"bulbPowder":{"needs":[["flowerBulb",2]],"in":["mortar"],"gives":2},"driedFern":{"needs":[["fernTip",3],["bambooSheath",1]],"in":["pan"],"gives":2},"rootExtract":{"needs":[["wildMedicRoot",2],["sugar",1]],"in":["pot"],"gives":2},"berrySeedOil":{"needs":[["berryPip",3]],"in":["mortar"],"gives":2},"sporeCulture":{"needs":[["mushroomSpores",2],["rice",1]],"in":["jar"],"gives":2}}$forage$::jsonb,updated_at=now() where key='makes';
update public.town_catalog set data=data || $forage${"fernRice":{"stamina":28,"buff":"traces","recipe":{"needs":[["fernTip",2],["rice",2],["lichenSalt",1]],"in":["pot"],"serves":3,"cooks":1}},"rootStew":{"stamina":36,"buff":"traces","recipe":{"needs":[["rootExtract",1],["lotusRootBed",1],["lichenSalt",1]],"in":["pot"],"serves":3,"cooks":1}},"petalBiscuit":{"stamina":30,"buff":"traces","recipe":{"needs":[["bulbPowder",1],["flour",2],["fragrantPetal",1]],"in":["pan"],"serves":3,"cooks":1}},"sporeNoodles":{"stamina":32,"buff":"traces","recipe":{"needs":[["sporeCulture",1],["noodle",1],["driedFern",1]],"in":["pot"],"serves":3,"cooks":1}}}$forage$::jsonb,updated_at=now() where key='dishes';
update public.town_catalog set data=data || $forage${"scrollFernRice":"fernRice","scrollRootStew":"rootStew","scrollPetalBiscuit":"petalBiscuit","scrollSporeNoodles":"sporeNoodles"}$forage$::jsonb,updated_at=now() where key='scrolls';
update public.town_catalog set data=jsonb_set(data,'{buffs}',coalesce(data #> '{buffs}','{}'::jsonb) || $forage${"traces":1}$forage$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{steps}',coalesce(data #> '{steps}','{}'::jsonb) || $forage${"traces":[1,1,1,1]}$forage$::jsonb),updated_at=now() where key='stamina';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($forage$["lichenSalt","petalDye","bulbPowder","driedFern","rootExtract","berrySeedOil","sporeCulture","fernRice","rootStew","petalBiscuit","sporeNoodles"]$forage$::jsonb) with ordinality a(v,ord) where not (data #> '{recipes}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{needs}',coalesce(data #> '{needs}','{}'::jsonb) || $forage${"lichenSalt":{"forestLichen":2,"salt":1},"petalDye":{"fragrantPetal":3,"oil":1},"bulbPowder":{"flowerBulb":2},"driedFern":{"bambooSheath":1,"fernTip":3},"rootExtract":{"sugar":1,"wildMedicRoot":2},"berrySeedOil":{"berryPip":3},"sporeCulture":{"mushroomSpores":2,"rice":1},"fernRice":{"fernTip":2,"lichenSalt":1,"rice":2},"rootStew":{"lichenSalt":1,"lotusRootBed":1,"rootExtract":1},"petalBiscuit":{"bulbPowder":1,"flour":2,"fragrantPetal":1},"sporeNoodles":{"driedFern":1,"noodle":1,"sporeCulture":1}}$forage$::jsonb),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{bowled}',coalesce(data #> '{bowled}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($forage$["fernRice","rootStew","petalBiscuit","sporeNoodles"]$forage$::jsonb) with ordinality a(v,ord) where not (data #> '{bowled}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='cooking';
update public.town_catalog set data=jsonb_set(data,'{ids}',coalesce(data #> '{ids}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements($forage$[["fernRice",0],["petalBiscuit",12],["sporeNoodles",12],["lichenSalt",0],["petalDye",9],["bulbPowder",0],["driedFern",0],["berrySeedOil",0],["sporeCulture",0],["rootStew",55],["rootExtract",15]]$forage$::jsonb) with ordinality a(v,ord) where not (data #> '{ids}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='hints';
update public.town_catalog set data=jsonb_set(data,'{kitchen,pot}',coalesce(data #> '{kitchen,pot}','{}'::jsonb) || $forage${"lichenSalt":1,"petalDye":1,"bulbPowder":1,"driedFern":1,"rootExtract":1,"berrySeedOil":1,"sporeCulture":1,"fernRice":3,"rootStew":3,"petalBiscuit":3,"sporeNoodles":3}$forage$::jsonb),updated_at=now() where key='work';
update public.town_catalog set data=jsonb_set(data,'{recipes}',coalesce(data #> '{recipes}','{}'::jsonb) || $forage${"traceLens":{"needs":[["crystalLens",1],["carvingBlank",1]],"fee":30},"pruningKnife":{"needs":[["oreIron",2],["splitPlank",1],["petalDye",1]],"fee":26},"rootSpade":{"needs":[["oreIron",2],["heartwood",1],["berrySeedOil",1]],"fee":31},"seedSieve":{"needs":[["bambooSheath",3],["rootTwine",1]],"fee":27},"specimenPress":{"needs":[["splitPlank",2],["petalDye",1],["silkenCord",1]],"fee":28},"forageBasket":{"needs":[["bambooSheath",4],["silkenCord",2],["beeswax",1]],"fee":32}}$forage$::jsonb),updated_at=now() where key='workshop';
insert into public.town_catalog(key,data) values('forest_parts',$forage${"parts":{"leaves":{"leaf":"forestLichen"},"flowers":{"leaf":"fragrantPetal","root":"flowerBulb"},"bamboo":{"leaf":"bambooSheath"},"greens":{"leaf":"fernTip","root":"wildMedicRoot"},"berries":{"leaf":"berryPip"},"mushrooms":{"leaf":"mushroomSpores"}},"leaf":2,"root":1,"restMinutes":30,"spadeMinutes":15,"bonus":1}$forage$::jsonb) on conflict(key) do update set data=excluded.data,updated_at=now();
create table if not exists public.town_forest_rest (
 spot integer primary key check(spot>=0),begins bigint not null,ends bigint not null check(ends>begins)
);
alter table public.town_forest_rest enable row level security;
revoke all on public.town_forest_rest from public,anon,authenticated;
-- Only the serialized gathering RPC writes this shared ecological state.


create or replace function town.gather_part(p_purse jsonb,p_spot integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_wrong double precision,p_now bigint,p_part text,p_with text,p_lost boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 f jsonb:=town.cat('forest'); k jsonb:=town.cat('forest_parts'); spot jsonb:=town.wild_place(f,p_spot);
 rule jsonb:=town.wild_rule(f,spot->>0); item text; protected boolean; forgiven integer;
 n integer; book jsonb:=coalesce(p_purse->'forestPartsBook','[]'::jsonb); entry text; next_ bigint;
 rest jsonb;
begin
 if p_has is null or p_has='null'::jsonb or spot is null then return town.no('none'); end if;
 if coalesce(p_mine,false) then return town.no('had'); end if;
 if coalesce(p_taken,0)>=(rule->>'shares')::integer then return town.no('bare'); end if;
 if p_x is null or p_y is null or greatest(abs(p_x-(spot->>1)::integer),abs(p_y-(spot->>2)::integer))>town.wild_reach(p_purse,rule->>'how',p_now) then return town.no('far'); end if;
 if p_part is null or p_part not in ('leaf','root') or town.wild_secret(f,p_spot) or p_with is not null or coalesce(p_lost,false) then return town.no('none'); end if;
 item:=k->'parts'->(spot->>0)->>p_part;
 if item is null then return town.no('none'); end if;
 if p_part='root' and town.held(p_purse->'bag','rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool'); end if;
 protected:=p_part='leaf' and town.held(p_purse->'bag','pruningKnife')>0
   or item='forestLichen' and town.held(p_purse->'bag','specimenPress')>0
   or item in ('berryPip','mushroomSpores') and town.held(p_purse->'bag','seedSieve')>0;
 forgiven:=case when town.held(p_purse->'bag','forageBasket')>0 then 1 else 0 end;
 n:=greatest(1,(k->>p_part)::integer+case when protected then (k->>'bonus')::integer else 0 end-greatest(0,floor(coalesce(p_misses,0)+coalesce(p_wrong,0))::integer-forgiven));
 if town.room(p_purse->'bag',item)<n then return town.no('full'); end if;
 entry:=(spot->>0)||':'||p_part||':'||item;
 if not book ? entry then book:=book||to_jsonb(entry); end if;
 if p_part='root' then
  next_:=((p_has->>'turn')::bigint+1)*(rule->>'every')::bigint*60000-floor(town.roll('phase',p_spot)*(rule->>'every')::double precision)::bigint*60000;
  rest:=jsonb_build_object('from',next_,'until',next_+60000*case when town.held(p_purse->'bag','rootSpade')>0 then (k->>'spadeMinutes')::bigint else (k->>'restMinutes')::bigint end);
 end if;
 return jsonb_build_object('ok',true,'got',jsonb_build_array(jsonb_build_array(item,n)),
   'purse',town.spend(p_purse,(rule->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(p_purse->'bag',item,n),'forestPartsBook',book))
   ||case when rest is not null then jsonb_build_object('rest',rest) else '{}'::jsonb end;
end $$;
revoke all on function town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean) from public,anon,authenticated;

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
  perform 1 from public.town_purses pp where pp.member_id=me for update;
  purse:=town.purse_of(me,true);
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  if went->>'part' is not null and went->>'part'<>'whole' then
    did:=town.gather_part(purse,p_spot,has,(t->>'n')::integer,(t->>'mine')::boolean,town.hand_of(purse),p_x,p_y,misses,wrong,now_,went->>'part',with_,lost_);
  else
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  end if;
  if (did->>'ok')::boolean then
    if did ? 'rest' then
      insert into public.town_forest_rest(spot,begins,ends) values(p_spot,(did->'rest'->>'from')::bigint,(did->'rest'->>'until')::bigint)
        on conflict on constraint town_forest_rest_pkey do update set begins=case when town_forest_rest.ends<=now_ then excluded.begins else least(town_forest_rest.begins,excluded.begins) end,ends=greatest(town_forest_rest.ends,excluded.ends);
    end if;
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', did->'got'->0->>0, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
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
$function$
;
CREATE OR REPLACE FUNCTION town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := coalesce(f->'spots'->p_spot, f->'secret'->'spots'->(p_spot - jsonb_array_length(f->'spots')));
  kind jsonb := coalesce(f->'kinds'->(spot->>0), f->'secret'->'kinds'->(spot->>0));
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  finds jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick jsonb := null;
  i integer;
  lo integer;
  hi integer;
begin
  if exists(select 1 from public.town_forest_rest r where r.spot=p_spot and r.begins<=p_now and p_now<r.ends) then return null; end if;
  if p_spot is null or p_spot < 0 or spot is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('phase', p_spot) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision then return null; end if;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    fits := fits || town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':what', p_spot, turn) * total;
  for i in 0..jsonb_array_length(finds) - 1 loop
    if fits[i + 1] then
      pick := finds->i;
      left_ := left_ - (pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  lo := (pick->'n'->>0)::int;
  hi := (pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
    'until', (turn + 1) * every - phase);
end;
$function$
;
notify pgrst,'reload schema';
commit;
-- Expected: shared recovery state has RLS and no member or anonymous write access.
select relrowsecurity from pg_class where oid='public.town_forest_rest'::regclass;
select has_table_privilege('authenticated','public.town_forest_rest','INSERT') as member_write;
select data from public.town_catalog where key='forest_parts';
