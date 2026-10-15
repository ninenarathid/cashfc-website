-- v258: appendix A reward fixes. Deploy with the matching client after v255 or later.
-- No hosted data is changed by the builder. Transactional and safe to rerun.
begin;
set local statement_timeout='30s';set local lock_timeout='5s';
do $guard$ begin
if md5(replace(pg_get_functiondef('town.reward_scan(jsonb,jsonb,text,bigint)'::regprocedure),chr(13),'')) not in ('260ac8e68e3c0188a5445bf8ce452c4b','d38339833e4d343a3d6af5abe24470a4') then raise exception 'Definition moved: rebuild v258 (town.reward_scan(jsonb,jsonb,text,bigint))';end if;
if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('dc29a26fcb2a46458c7ef97dd5858190','e330aa9d72efde95d2b67ab8b5b8dc7f') then raise exception 'Definition moved: rebuild v258 (public.town_cast(text,integer,integer,boolean,text,text))';end if;
if md5(replace(pg_get_functiondef('town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint)'::regprocedure),chr(13),'')) not in ('2072293e23dc8daa4c88aa5e375c6f5d','a54e212c1dd474a08a70452aeedea119') then raise exception 'Definition moved: rebuild v258 (town.reward_dragon_draw(jsonb,jsonb,text,text,jsonb,boolean,boolean,bigint))';end if;
if md5(replace(pg_get_functiondef('town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('5ade93ad20338a1396fa1e19757082f8','51aa7a31f929ec2e6bdba104ca4225a5') then raise exception 'Definition moved: rebuild v258 (town.reward_nursery(jsonb,jsonb,uuid,jsonb,bigint,bigint))';end if;
if md5(replace(pg_get_functiondef('town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint)'::regprocedure),chr(13),'')) not in ('9a6023ba9fdde581a14e4801406e6636','f877e73636ac31c162a1ef30ebe77937') then raise exception 'Definition moved: rebuild v258 (town.reward_core(jsonb,uuid,uuid,jsonb,bigint,bigint))';end if;
if md5(replace(pg_get_functiondef('town.reward_resource_recipe(text,text)'::regprocedure),chr(13),'')) not in ('4903fe164cc2ed2f3a0ba96e6c42037d','fde0f119e24e489b8206854ec55154ca') then raise exception 'Definition moved: rebuild v258 (town.reward_resource_recipe(text,text))';end if;
if md5(replace(pg_get_functiondef('town.reward_boat(jsonb,jsonb,uuid,jsonb,bigint,boolean,boolean)'::regprocedure),chr(13),'')) not in ('449cbf374404c89bbef1fade6e161307','14dc066e6ad2aec221294a8fdb891371') then raise exception 'Definition moved: rebuild v258 (town.reward_boat(jsonb,jsonb,uuid,jsonb,bigint,boolean,boolean))';end if;
if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('da65115f0bc9ee3e136e00642a0938c0','67ee720a67b3fb44c34876995849db8f') then raise exception 'Definition moved: rebuild v258 (public.town_reward(uuid,jsonb))';end if;
if md5(replace(pg_get_functiondef('town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text)'::regprocedure),chr(13),'')) not in ('7d2894b4ee2b1fb4414ffa88b1193ff7','deca8fc0ac9118ba9fe72b222bab5fcc') then raise exception 'Definition moved: rebuild v258 (town.fell_group_v220(jsonb,jsonb,jsonb,jsonb,bigint,text))';end if;
if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('9f41e70934faa755877ff00ae80d7b99','8f2f3a7d3ccad8f1961488b3cbccfe49') then raise exception 'Definition moved: rebuild v258 (town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text))';end if;
if md5(replace(pg_get_functiondef('public.town_fell(jsonb,integer,integer)'::regprocedure),chr(13),'')) not in ('fced0fe5bb0693aee26aa362c9071a82','c16c6c2cc5657753c4731725ff95a56d') then raise exception 'Definition moved: rebuild v258 (public.town_fell(jsonb,integer,integer))';end if;
if md5(replace(pg_get_functiondef('town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('94629243c9601371e7c172a679411199','c09130408a942e7d6e98b4fb6d90bb24') then raise exception 'Definition moved: rebuild v258 (town.reward_arena(jsonb,jsonb,uuid,bigint,jsonb,bigint))';end if;
if md5(replace(pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure),chr(13),'')) not in ('fe1db164ccae7995ee5fe6941dfe220d','c81faabb4e8c8b82cf477c7dcaec4024') then raise exception 'Definition moved: rebuild v258 (town_land)';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(data,'{uses}',data->'uses'||'{"charmEchoAxe":{"n":5,"per":"day"},"thingBeetleRing":{"n":5,"per":"day"}}'::jsonb) where key='gifts';
CREATE OR REPLACE FUNCTION town.reward_scan(p jsonb, g jsonb, mineral text, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare r jsonb;f jsonb;chosen jsonb;dist integer;best integer;dx integer;dy integer;used jsonb;ore text;gem text;
begin
 if not town.gift_works(p,'thingOreCompass') or not town.reward_minerals(p) ? mineral then return town.no('none');end if;
 if g->'at' is null or g->'at'='null'::jsonb then return town.no('far');end if;
 used:=town.gift_use(p,'thingOreCompass',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 ore:=town.mine_ore((g->>'floor')::integer);gem:=town.cat('forge')->'gems'->(g->>'element')->>'chip';
 for r in select v from jsonb_array_elements(g->'rocks') a(v) order by (v->>0)::integer loop
  if not town.cave_stands(g->'cave',(r->>0)::integer,t,(g->>'crystal')::integer) then continue;end if;
  f:=town.mine_holds(town.mine_word(),(g->>'floor')::integer,(r->>0)::integer,town.mine_turn(t),g->'today',town.mine_pick(p));
  if not (f->>'kind'='vein' and mineral=case when f->'gem'='true'::jsonb then gem else ore end
    or f->>'kind'='stone' and (f->>'shards')::numeric>0 and mineral=ore) then continue;end if;
  dist:=greatest(abs((r->>1)::integer-(g->'at'->>0)::integer),abs((r->>2)::integer-(g->'at'->>1)::integer));
  if best is null or dist<best then chosen:=r;best:=dist;end if;
 end loop;
 if chosen is null then return jsonb_build_object('ok',true,'purse',used->'purse','left',used->'left');end if;

 dx:=sign((chosen->>1)::integer-(g->'at'->>0)::integer);dy:=sign((chosen->>2)::integer-(g->'at'->>1)::integer);
 return jsonb_build_object('ok',true,'purse',town.reward_learn(used->'purse','[]'::jsonb),'left',used->'left','distance',case when best<=4 then 'near' when best<=10 then 'mid' else 'far' end,
  'direction',case when dy<0 then case when dx<0 then 'NW' when dx>0 then 'NE' else 'N' end when dy>0 then case when dx<0 then 'SW' when dx>0 then 'SE' else 'S' end when dx<0 then 'W' when dx>0 then 'E' else 'here' end);
end $function$
;
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  count_ integer;
  others jsonb := '[]'::jsonb;
  i integer;
  sky text;
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;dragon_ jsonb;boat_ jsonb;boatwater_ jsonb;
begin
  select b.doc into boat_ from town.reward_boats b where (b.doc->>'until')::bigint>now_ and (b.owner=me or b.doc->>'guest'=me::text) order by b.owner limit 1 for update;
  purse:=town.purse_of(me,true);sky:=town.orb_of(purse,now_);
  if boat_ is not null then
   boatwater_:=town.boat_water(boat_,p_x,p_y,now_);if boatwater_ is null then return town.answer(me,town.no('far'));end if;
   deep:='true'::jsonb;water:=boatwater_;habitat:=water->>'habitat';current_:=coalesce(p_current,water->>'current');
  end if;
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair then town.line_count(purse) else 1 end;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and count_ >= 2) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, count_) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.river_star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top(), habitat, current_)
    else town.river_odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky'), habitat, current_) end;
  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  dragon_:=town.reward_dragon_draw(did->'purse',odds,bait,current_,jsonb_build_array(p_x,p_y),pair,star,now_);
  did:=did||jsonb_build_object('purse',dragon_->'purse');odds:=dragon_->'odds';
  school_ := town.reward_school_weights(did->'purse', odds, star or pair, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    for i in 2..count_ loop
      two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
      others := others || jsonb_build_array(jsonb_build_object('what', two->'what', 'size',
        case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
    end loop;
    line := line || jsonb_build_object('others', others);
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'comboLoadout',town.combo_loadout(purse),'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$
;
CREATE OR REPLACE FUNCTION town.reward_dragon_draw(p jsonb, odds_ jsonb, bait_ text, current_ text, at_ jsonb, pair_ boolean, star_ boolean, t bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare call_ jsonb:=p->'professionRewards'->'dragon';weighted_ jsonb;total_ double precision;begin
 if coalesce(call_,'null'::jsonb)='null'::jsonb or (call_->>'until')::bigint<=t or not town.gift_works(p,'famRiverDragon') or pair_ or star_ or call_->>'bait' is distinct from bait_ or call_->>'current' is distinct from current_ or call_->'at' is distinct from at_ or town.cat('fish')->(call_->>'fish')->>'tier' is distinct from 'legend' or coalesce((p->'best'->>(call_->>'fish'))::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=call_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision*case when o->>'what'=call_->>'fish' then 5 else 1 end) order by ord) into weighted_ from jsonb_array_elements(odds_) with ordinality a(o,ord);
 select sum((o->>'p')::double precision) into total_ from jsonb_array_elements(weighted_) o;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision/total_) order by ord) into weighted_ from jsonb_array_elements(weighted_) with ordinality a(o,ord);
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('dragon',null)),'odds',weighted_);
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_nursery(p jsonb, input jsonb, request uuid, known_ jsonb, t bigint, seed_ bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'nursery';at_ jsonb:=input->'at';used_ jsonb;node_ jsonb;challenge_ jsonb;next_ integer;game_ text;part_ text;expected_ jsonb:='[]'::jsonb;target_ numeric;won_ boolean:=true;got_ jsonb:='[]'::jsonb;i integer;kind_ text;item_ text;n_ integer;after_ jsonb;completed_ boolean;allowed_ boolean;
begin
 select coalesce(jsonb_agg(k order by ord),'[]'::jsonb) into known_ from jsonb_array_elements_text('["pine","ironwood","moonwood","elder"]'::jsonb) with ordinality q(k,ord) where known_ ? k or coalesce(state_->'treeKinds','[]'::jsonb) ? k or k='pine' and town.held(p->'bag','pineNut')>0;
 if input->>'action'='nurseryLook' then if not town.gift_works(p,'thingTinyForest') then return town.no('none');end if;return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('treeKinds',known_)));end if;
 if input->>'action'='nurseryCancel' then
  if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',null)),'nursery',null);
 end if;
 if not town.gift_works(p,'thingTinyForest') or town.axe_of(p) is null then return town.no('none');end if;
 select exists(select 1 from jsonb_array_elements(town.cat('rewards')->'nurseryBoxes') b where (at_->>0)::integer>=(b->>0)::integer and (at_->>1)::integer>=(b->>1)::integer and (at_->>0)::integer<(b->>0)::integer+(b->>2)::integer and (at_->>1)::integer<(b->>1)::integer+(b->>3)::integer) into allowed_;
 if not allowed_ then return town.no('far');end if;
 if input->>'action'='nurseryBegin' then
  if coalesce(run_,'null'::jsonb)<>'null'::jsonb or jsonb_typeof(input->'kinds') is distinct from 'array' or jsonb_array_length(input->'kinds')<>3 or exists(select 1 from jsonb_array_elements(input->'kinds') k where jsonb_typeof(k)<>'string' or not known_ ? (k#>>'{}')) or town.held(p->'bag','pineNut')<3 or exists(select 1 from jsonb_array_elements(p->'bag') s where s->>'item'='pineNut' and (s-'item'-'n')<>'{}'::jsonb) then return town.no('none');end if;
  seed_:=coalesce(seed_,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingTinyForest',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'at',at_,'kinds',input->'kinds','seed',seed_,'next',0,'began',t,'part',null,'challenge',null);
  after_:=used_->'purse'||jsonb_build_object('bag',town.take(p->'bag','pineNut',3),'professionRewards',state_||jsonb_build_object('nursery',run_));
  return jsonb_build_object('ok',true,'purse',after_,'nursery',run_,'left',used_->'left');
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'nursery' is distinct from run_->>'id' then return town.no('none');end if;
 if greatest(abs((at_->>0)::integer-(run_->'at'->>0)::integer),abs((at_->>1)::integer-(run_->'at'->>1)::integer))>2 then return town.no('far');end if;
 if input->>'action'='nurseryStage' then
  part_:=input->>'part';if part_ is null or part_ not in ('wood','bark','sap','seed','root') or run_->>'part' is not null and part_<>run_->>'part' then return town.no('none');end if;
  challenge_:=run_->'challenge';if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint then challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);end if;
  run_:=run_||jsonb_build_object('part',part_,'challenge',challenge_);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_);
 end if;
 challenge_:=run_->'challenge';part_:=run_->>'part';
 if input->>'action'<>'nurseryEnd' or part_ is null or coalesce(challenge_,'null'::jsonb)='null'::jsonb or input->>'challenge' is distinct from challenge_->>'id' or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 next_:=(run_->>'next')::integer;game_:=(array['memory','order','timing'])[next_+1];seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
 for i in 0..2 loop seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;expected_:=expected_||jsonb_build_array(case when game_='timing' then target_ else mod(floor(target_*100),3) end);end loop;
 if game_='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when game_='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when game_='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 if won_ then
  kind_:=run_->'kinds'->>next_;item_:=case part_ when 'wood' then case when kind_='elder' then 'cedarSliver' else 'heartwood' end when 'sap' then 'pinePitch' when 'bark' then 'pineBark' when 'seed' then 'pineNut' else 'rootFiber' end;n_:=case when kind_='elder' and part_='wood' then 1 else 2 end;
  got_:=jsonb_build_array(jsonb_build_array(item_,n_));
 end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=next_=2;run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+1,'part','null'::jsonb,'challenge',null) end;
 return jsonb_build_object('ok',true,'purse',town.spend(after_,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('nursery',run_)),'nursery',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end);
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_core(p jsonb, me uuid, request uuid, input jsonb, t bigint, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'core';room_ jsonb;challenge_ jsonb;
 f integer;at_ jsonb:=input->'at';seed_ bigint;used_ jsonb;known_ jsonb;chips_ jsonb;route_ text;mineral_ text;game_ text;
 node_ jsonb;expected_ jsonb:='[]'::jsonb;target_ numeric;i integer;won_ boolean:=true;got_ jsonb:='[]'::jsonb;
 cost_ integer;n_ integer;next_ integer;after_ jsonb;completed_ boolean;
begin
 if input->>'action'='coreBegin' then
  if jsonb_typeof(input->'floor') is distinct from 'number' or (input->>'floor')::numeric<>floor((input->>'floor')::numeric) or (input->>'floor')::numeric not between 1 and 30 then return town.no('none');end if;
  f:=(input->>'floor')::integer;
  if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null or coalesce(run_,'null'::jsonb)<>'null'::jsonb or not (
   coalesce(state_->'visited','[]'::jsonb) @> jsonb_build_array(f) or town.mine_of(p)->'rests' @> jsonb_build_array(f)
   or exists(select 1 from public.town_deeds d where d.member_id=me and d.what in ('mine','crystal','vein','hew') and d.n>0 and d.doc->>'floor'=f::text)) then return town.no('none');end if;
  if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
  seed_:=coalesce(p_seed,floor(random()*4294967296)::bigint);if seed_ not between 0 and 4294967295 then return town.no('none');end if;
  used_:=town.gift_use(p,'thingCoreSpade',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  run_:=jsonb_build_object('id',request,'floor',f,'seed',seed_,'began',t,'next',0,'known',town.reward_minerals(p),'room',null);
  after_:=town.reward_visit(used_->'purse',f);
  return jsonb_build_object('ok',true,'core',run_,'left',used_->'left','purse',after_||jsonb_build_object('professionRewards',after_->'professionRewards'||jsonb_build_object('core',run_)));
 end if;
 if coalesce(run_,'null'::jsonb)='null'::jsonb or run_->>'id' is distinct from input->>'core' then return town.no('none');end if;
 if input->>'action'='coreCancel' then return jsonb_build_object('ok',true,'core',null,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',null)));end if;
 if not town.gift_works(p,'thingCoreSpade') or town.mine_pick(p) is null then return town.no('none');end if;
 f:=(run_->>'floor')::integer;next_:=(run_->>'next')::integer;known_:=run_->'known';room_:=run_->'room';
 if not coalesce(town.cave_floor_tile(town.cave_laid(town.day_of(t),f),f,(at_->>0)::integer,(at_->>1)::integer),false) then return town.no('far');end if;
 select coalesce(jsonb_agg(to_jsonb(g.value->>'chip') order by m.ord),'[]'::jsonb) into chips_
  from jsonb_array_elements_text(town.cat('forge')->'elements') with ordinality m(id,ord)
  join lateral (select town.cat('forge')->'gems'->m.id value) g on true where known_ ? (g.value->>'chip');
 if input->>'action'='coreRoom' then
  route_:=input->>'route';
  if route_ is null or route_ not in ('ore','crystal','safe') or route_='ore' and not known_ ? town.mine_ore(f)
   or route_='crystal' and jsonb_array_length(chips_)=0 or coalesce(room_,'null'::jsonb)<>'null'::jsonb and room_->>'route'<>route_ then return town.no('none');end if;
  seed_:=((run_->>'seed')::bigint+next_*7919)%4294967296;
  if coalesce(room_,'null'::jsonb)='null'::jsonb then
   mineral_:=case route_ when 'ore' then town.mine_ore(f) when 'crystal' then chips_->>((seed_%jsonb_array_length(chips_))::integer) else 'stone' end;
   game_:=case route_ when 'ore' then 'timing' when 'crystal' then 'order' else 'memory' end;
   room_:=jsonb_build_object('route',route_,'mineral',mineral_,'node',jsonb_build_object('at',at_,'seed',seed_,'game',game_),'challenge',null);
  end if;
  challenge_:=room_->'challenge';
  if coalesce(challenge_,'null'::jsonb)='null'::jsonb or t>(challenge_->>'until')::bigint or room_->'node'->'at' is distinct from at_ then
   challenge_:=jsonb_build_object('id',request,'began',t,'until',t+90000);
   room_:=jsonb_set(room_,'{node,at}',at_);
  end if;
  room_:=room_||jsonb_build_object('challenge',challenge_);run_:=run_||jsonb_build_object('room',room_);
  return jsonb_build_object('ok',true,'core',run_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('core',run_)));
 end if;
 challenge_:=room_->'challenge';node_:=room_->'node';
 if input->>'action'<>'coreEnd' or coalesce(challenge_,'null'::jsonb)='null'::jsonb or challenge_->>'id' is distinct from input->>'challenge'
  or t<(challenge_->>'began')::bigint+2400 or t>(challenge_->>'until')::bigint then return town.no('none');end if;
 if node_->'at' is distinct from at_ then return town.no('far');end if;
 seed_:=(node_->>'seed')::bigint;
 for i in 0..2 loop
  seed_:=(seed_*1664525+1013904223)%4294967296;target_:=0.2+(seed_%61)::numeric/100;
  expected_:=expected_||jsonb_build_array(case when node_->>'game'='timing' then target_ else mod(floor(target_*100),3) end);
 end loop;
 if node_->>'game'='memory' then expected_:=jsonb_build_array(expected_->0);end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>jsonb_array_length(expected_) then return town.no('none');end if;
 for i in 0..jsonb_array_length(expected_)-1 loop
  if jsonb_typeof(input->'answers'->i)<>'number' or (input->'answers'->>i)::numeric not between 0 and (case when node_->>'game'='timing' then 1 else 2 end) then return town.no('none');end if;
  if (case when node_->>'game'='timing' then abs((expected_->>i)::numeric-(input->'answers'->>i)::numeric)>0.09 else (expected_->>i)::numeric<>(input->'answers'->>i)::numeric end) then won_:=false;end if;
 end loop;
 cost_:=case room_->>'route' when 'crystal' then 4 when 'ore' then 3 else 2 end;n_:=case when room_->>'route'='crystal' then 4 else 8 end;
 if won_ then got_:=jsonb_build_array(jsonb_build_array(room_->>'mineral',n_));end if;
 after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;
 completed_:=next_=2;
 run_:=case when completed_ then 'null'::jsonb else run_||jsonb_build_object('next',next_+1,'room','null'::jsonb) end;
 return jsonb_build_object('ok',true,'core',run_,'got',got_,'completed',completed_,'passed',case when won_ then jsonb_array_length(expected_) else 0 end,
  'purse',town.spend(after_,cost_,t)||jsonb_build_object('professionRewards',coalesce(after_->'professionRewards','{}'::jsonb)||jsonb_build_object('core',run_)));
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_resource_recipe(kind_ text, key_ text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare gems text[]:=array['gemRuby','gemSapphire','gemAquamarine','gemAmber','gemTopaz','gemEmerald','gemDiamond','gemOnyx'];chips text[]:=array['chipRuby','chipSapphire','chipAquamarine','chipAmber','chipTopaz','chipEmerald','chipDiamond','chipOnyx'];parts text[];
begin
 if kind_='hive' and key_ in ('honey','wax') then return jsonb_build_object('needs','[["fragrantPetal",5]]'::jsonb,'got',jsonb_build_array(jsonb_build_array(case when key_='honey' then 'gardenHoney' else 'beeswax' end,2)));end if;
 if kind_='repair' and key_=any(chips) then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(key_,2),jsonb_build_array('quartzCore',1),jsonb_build_array('rootTwine',1)),'got','[["wholeGeode",1]]'::jsonb);end if;
 if kind_='color' then
  parts:=string_to_array(key_,':');
  if array_length(parts,1)=3 and parts[1]=any(gems) and parts[2]=any(gems) and parts[3]=any(gems) and parts[3] not in ('gemDiamond','gemOnyx') and parts[1]<>parts[2] then return jsonb_build_object('needs',jsonb_build_array(jsonb_build_array(parts[1],1),jsonb_build_array(parts[2],1),jsonb_build_array('sparkPowder',1)),'got',jsonb_build_array(jsonb_build_array(parts[3],1)));end if;
 end if;
 return null;
end $function$
;
CREATE OR REPLACE FUNCTION town.reward_boat(p jsonb, input jsonb, me uuid, old_ jsonb, t bigint, aboard boolean, busy boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare cmd jsonb:=input->'boat';a text:=cmd->>'action';r jsonb;boat_ jsonb;station_ integer;pos_ jsonb;to_ integer;duration_ bigint;membership_ jsonb;out_ jsonb:=p;
begin
 if jsonb_typeof(cmd) is distinct from 'object' or a is null or a not in ('launch','open','join','depart','return','leave') then return town.no('none');end if;
 if a='launch' then
  if jsonb_typeof(cmd->'site') is distinct from 'number' or (cmd->>'site')::numeric<>floor((cmd->>'site')::numeric) or (cmd->>'site')::numeric not between 0 and 1 then return town.no('far');end if;
  r:=town.cat('rewards')->'boatRoutes'->((cmd->>'site')::integer);if input->'at' is distinct from r->'dock' then return town.no('far');end if;
  if not town.gift_works(p,'thingLotusBoat') or cmd->>'owner' is not null and cmd->>'owner'<>me::text then return town.no('none');end if;
  if aboard or (old_->>'until')::bigint>t or busy then return town.no('spent');end if;
  boat_:=jsonb_build_object('owner',me,'guest',null,'site',cmd->'site','station',0,'open',false,'until',t+1800000,'trip',null);
  out_:=town.spend(p,2::double precision,t);
 else
  if old_ is null or (old_->>'until')::bigint<=t then return town.no('none');end if;
  r:=town.cat('rewards')->'boatRoutes'->((old_->>'site')::integer);if r is null then return town.no('none');end if;
  station_:=(old_->>'station')::integer;
  if (old_->'trip'->>'arrives')::bigint>t then return town.no('spent');end if;
  pos_:=case when station_=0 then r->'dock' else r->'anchor' end;if input->'at' is distinct from pos_ then return town.no('far');end if;
  boat_:=old_;
  if a='join' then
   if old_->>'owner'=me::text or station_<>0 or old_->'open' is distinct from 'true'::jsonb or coalesce(old_->'guest','null'::jsonb)<>'null'::jsonb or aboard or busy then return town.no('none');end if;
   boat_:=old_||jsonb_build_object('guest',me,'open',false);
  else
   if old_->>'owner'<>me::text and old_->>'guest' is distinct from me::text then return town.no('none');end if;
   if a='open' then
    if old_->>'owner'<>me::text or station_<>0 or jsonb_typeof(cmd->'open') is distinct from 'boolean' then return town.no('none');end if;
    return jsonb_build_object('ok',true,'purse',p,'boat',old_||jsonb_build_object('open',cmd->'open'));
   elsif a='leave' then
    if station_<>0 then return town.no('far');end if;
    boat_:=case when old_->>'owner'=me::text then old_||jsonb_build_object('until',t,'open',false) else old_||jsonb_build_object('guest',null) end;
   else
    to_:=case when a='depart' then 1 else 0 end;
    if station_=to_ or old_->>'owner'<>me::text or busy then return town.no('spent');end if;
    duration_:=ceil(sqrt(power((r->'dock'->>0)::numeric-(r->'anchor'->>0)::numeric,2)+power((r->'dock'->>1)::numeric-(r->'anchor'->>1)::numeric,2))/3.5*1000)::bigint;
    boat_:=old_||jsonb_build_object('station',to_,'open',false,'trip',jsonb_build_object('from',station_,'to',to_,'at',t,'arrives',t+duration_))||case when to_=0 then jsonb_build_object('until',t+duration_) else '{}'::jsonb end;
   end if;
  end if;
 end if;
 membership_:=case when a='leave' then 'null'::jsonb else jsonb_build_object('owner',boat_->'owner','until',boat_->'until') end;
 return jsonb_build_object('ok',true,'purse',out_||jsonb_build_object('professionRewards',coalesce(out_->'professionRewards','{}'::jsonb)||jsonb_build_object('boat',membership_)),'boat',boat_);
end $function$
;
CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;grove_ jsonb;trace_ jsonb;relay_ jsonb;bed_ jsonb;bedn_ integer;cooldown_ bigint;key_ text;spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;bridge_ jsonb;boat_ jsonb;boatowner_ uuid;rescuetarget_ uuid;rescuetheirs_ jsonb;held_ uuid;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart','liftAnchor','liftRide','coreBegin','coreRoom','coreEnd','coreCancel','dominoPreview','relayPlace','relaySend','relayTake','conduitBegin','conduitEnd','conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent','nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel','bridgeBuild','boat','dragonBegin','arenaLook','arenaBegin','arenaEnd','arenaCancel','lanternLook','lanternLight','crownLook','crownBegin','crownCall','crownCancel','picnicPlace','picnicEat','kitchenBegin','kitchenEnd','kitchenCancel','flavorTune','giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply','beanBegin','beanStage','beanEnd','beanCancel','helpMend','reviveBegin','reviveEnd','reviveCancel','campFlag','rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel','rainCareBegin','rainCareEnd','rainCareCancel','gardenRetryBegin','gardenRetryEnd','rowContinueBegin','rowContinueEnd','rootExtractBegin','rootExtractEnd','rootExtractCancel') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action' in ('scan','liftAnchor','liftRide') then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 0 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('none'));end if;
  f:=(p_input->>'floor')::integer;
  if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;
  -- Same world-row-before-purse order as town_mine. This is one requested scan, not a new polling reader.
  c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 if p_input->>'action'='process' and p_input->>'kind'='mineral' then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 1 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('far'));end if;
  f:=(p_input->>'floor')::integer;if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd','rootExtractBegin','rootExtractEnd','rootExtractCancel') then grove_:=town.grove_tidied(coalesce(town.thing('grove',true),'{"down":{},"half":[]}'::jsonb),t);end if;
 if p_input->>'action' in ('springPlace','springDraw') then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 4 then return town.answer(me,town.no('far'));end if;
  select doc into spring_ from town.reward_springs where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='bridgeBuild' then
  if jsonb_typeof(p_input->'site') is distinct from 'number' or (p_input->>'site')::numeric<>floor((p_input->>'site')::numeric) or (p_input->>'site')::numeric not between 0 and 1 then return town.answer(me,town.no('far'));end if;
  select doc into bridge_ from town.reward_bridges where site=(p_input->>'site')::integer for update;
 end if;
 if p_input->>'action'='boat' then
  if p_input->'boat'->>'owner' is not null and p_input->'boat'->>'owner'!~ '^[0-9a-fA-F-]{36}$' then return town.answer(me,town.no('none'));end if;
  boatowner_:=coalesce((p_input->'boat'->>'owner')::uuid,me);
  if p_input->'boat'->>'action'='launch' and boatowner_=me then insert into town.reward_boats(owner,doc) values(me,jsonb_build_object('until',0)) on conflict do nothing;end if;
  select doc into boat_ from town.reward_boats where owner=boatowner_ for update;
 end if;
 if p_input->>'action' in ('rescueBegin','rescueEnd') then
  if p_input->>'target' is null or p_input->>'target'!~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then return town.answer(me,town.no('none'));end if;
  rescuetarget_:=(p_input->>'target')::uuid;
  for held_ in select pp.member_id from public.town_purses pp where pp.member_id in(me,rescuetarget_) order by pp.member_id for update loop null;end loop;
 end if;
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input?'campMiss' then did:=town.camp_retry(p,p_input,t);if did->'ok' is distinct from 'true'::jsonb then return town.answer(me,did);end if;p:=did->'purse';end if;
 if p_input->>'action' in ('rootExtractBegin','rootExtractEnd','rootExtractCancel') then did:=town.reward_root_extract(p,p_input,p_request,t,floor(random()*4294967296)::bigint,grove_);if did->'ok'='true'::jsonb and p_input->>'action'='rootExtractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'rootSource'->>'tree')::integer,'root',t));end if;
 elsif p_input->>'action' in ('rowContinueBegin','rowContinueEnd') then did:=town.reward_row_continue(p,p_input,p_request,t,me);
 elsif p_input->>'action' in ('gardenRetryBegin','gardenRetryEnd') then did:=town.reward_garden_retry(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me);
 elsif p_input->>'action' in ('rainCareBegin','rainCareEnd','rainCareCancel') then did:=town.reward_rain_care(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me);
 elsif p_input->>'action' in ('rescueLook','rescueAsk','rescueBegin','rescueEnd','rescueCancel') then
  if rescuetarget_=me then rescuetheirs_:=p;elsif exists(select 1 from public.town_purses pp where pp.member_id=rescuetarget_) then rescuetheirs_:=town.purse_of(rescuetarget_,true);end if;
  did:=town.reward_rescue(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me,rescuetarget_,rescuetheirs_);
  if did->'ok'='true'::jsonb and did?'targetPurse' then perform town.keep_purse(rescuetarget_,did->'targetPurse');did:=did-'targetPurse';end if;
 elsif p_input->>'action'='campFlag' then did:=town.reward_camp_flag(p,p_input,me,t);
 elsif p_input->>'action' in ('helpMend','reviveBegin','reviveEnd','reviveCancel') then
  did:=town.reward_help_garden(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me);
 elsif p_input->>'action' in ('beanBegin','beanStage','beanEnd','beanCancel') then
 did:=town.reward_bean(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me::text,town.garden_plots(x::text||','||y::text)->(x::text||','||y::text));
 elsif p_input->>'action' in ('giantBegin','giantEnd','giantCancel','gardenBrush','pollenCollect','pollenApply') then
  did:=town.reward_garden(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me);
 elsif p_input->>'action' in ('kitchenBegin','kitchenEnd','kitchenCancel','flavorTune') then
  did:=town.reward_kitchen(p,p_input,p_request,t,floor(random()*4294967296)::bigint,me);
 elsif p_input->>'action' in ('picnicPlace','picnicEat') then
  did:=town.reward_picnic(p,p_input,me,t);
 elsif p_input->>'action' in ('crownLook','crownBegin','crownCall','crownCancel') then
  did:=town.reward_crown(p,p_input,p_request,t);
 elsif p_input->>'action' in ('lanternLook','lanternLight') then
  did:=town.reward_lantern(p,p_input,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0),'[]'::jsonb));
 elsif p_input->>'action' in ('arenaLook','arenaBegin','arenaEnd','arenaCancel') then
  did:=town.reward_arena(p,p_input,p_request,t,coalesce((select jsonb_agg(distinct d.thing) from public.town_deeds d where d.member_id=me and d.what='net' and d.n>0 and town.cat('rewards')->'ringBeetles' ? d.thing),'[]'::jsonb));
 elsif p_input->>'action'='boat' then
  did:=town.reward_boat(p,p_input,me,boat_,t,exists(select 1 from town.reward_boats b where (b.doc->>'until')::bigint>t and (b.owner=me or b.doc->>'guest'=me::text)),town.boat_busy(me,t) or town.boat_busy(boatowner_,t) or town.boat_busy((boat_->>'guest')::uuid,t));
  if did->'ok'='true'::jsonb then update town.reward_boats set doc=did->'boat' where owner=boatowner_;end if;
 elsif p_input->>'action'='bridgeBuild' then
  did:=town.reward_bridge(p,p_input,p_request,me,bridge_,t);
  if did->'ok'='true'::jsonb then update town.reward_bridges set doc=did->'bridge' where site=(p_input->>'site')::integer;end if;
 elsif p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then
  did:=town.reward_spring(p,p_input,p_request,me,spring_,t);
  if did->'ok'='true'::jsonb then
   update town.reward_springs set doc=did->'spring' where site=(p_input->>'site')::integer;
   if p_input->>'action'='springDraw' then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;
 elsif p_input->>'action' in ('conduitBegin','conduitEnd','conduitCancel') then
  bedn_:=town.bed_of(x,y);if bedn_<0 then return town.answer(me,town.no('far'));end if;
  -- Preserve the existing farm RPC lock order: purse, then the bed advisory lock.
  perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where q.bed=bedn_;
  select until_ms into cooldown_ from town.reward_conduits where bed=bedn_;
  did:=town.reward_conduit(p,p_input,p_request,bed_,coalesce(cooldown_,0),t);
  if did->'ok'='true'::jsonb and p_input->>'action'='conduitEnd' and (did->>'used')::integer>0 then
   insert into town.reward_conduits values(bedn_,(did->>'cooldown')::bigint) on conflict(bed) do update set until_ms=excluded.until_ms;
   perform town.note(me,'ditch',town.hand_of(p),(did->>'used')::numeric,0,jsonb_build_object('tile',p_input->'at','bed',bedn_,'plants',jsonb_array_length(did->'watered')));
   for key_ in select jsonb_array_elements_text(did->'watered') loop
    update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;
    perform town.note(me,'water',bed_->key_->'plant'->>'crop',1,0,jsonb_build_object('tile',jsonb_build_array(split_part(key_,',',1)::integer,split_part(key_,',',2)::integer),'with',town.hand_of(p),'ditch',true)||case when bed_->key_->'plant'->>'by'<>me::text then jsonb_build_object('whose',bed_->key_->'plant'->>'by') else '{}'::jsonb end);
   end loop;
   update public.town_beds b set tended=t where b.bed=bedn_ and b.member_id=me and town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),true,t)=me::text;
  end if;
  did:=did-'plots'-'cooldown';
 elsif p_input->>'action' in ('relayPlace','relaySend','relayTake') then
  select jsonb_build_object('hands',to_jsonb(l.hands),'kind',l.kind) into trace_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_relay(p,p_input,t,coalesce(trace_,'{}'::jsonb));
  if did->'ok'='true'::jsonb and p_input->>'action'='relayTake' then
   relay_:=p->'professionRewards'->'relay';
   delete from public.town_line_water l where l.member_id=me and l.item=relay_->>'item';
   if (relay_->>'water')::integer>0 then
    insert into public.town_line_water(member_id,item,hands,kind) values(me,relay_->>'item',array(select h::uuid from jsonb_array_elements_text(coalesce(relay_->'hands','[]'::jsonb)) h),relay_->>'kind');
   end if;
  end if;
 elsif p_input->>'action'='dominoPreview' then did:=town.reward_domino_preview(p,grove_,me::text,p_input,t);
 elsif p_input->>'action' in ('liftAnchor','liftRide') then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;
  did:=town.reward_lift(p,me,p_request,p_input,t);
 elsif p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='dragonBegin' then did:=town.reward_dragon_begin(p,me,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);elsif p_input->>'action' in ('coreBegin','coreRoom','coreEnd','coreCancel') then did:=town.reward_core(p,me,p_request,p_input,t);
 elsif p_input->>'action' in ('nurseryLook','nurseryBegin','nurseryStage','nurseryEnd','nurseryCancel') then
  did:=town.reward_nursery(p,p_input,p_request,(select coalesce(jsonb_agg(distinct d.thing),'[]'::jsonb) from public.town_deeds d where d.member_id=me and d.what='fell' and d.n>0 and d.thing in ('pine','ironwood','moonwood','elder')),t);
 elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;
 if did->'ok'='true'::jsonb then
  did:=jsonb_set(did,'{purse}',town.remember_rescue(p,did->'purse',p_input->>'action',p_request,t,coalesce(did->'beanPassed'='false'::jsonb or did->'kitchenPassed'='false'::jsonb,false)));
 perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
end $function$
;
CREATE OR REPLACE FUNCTION town.fell_group_v220(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint, p_me text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') or town.used_of(p_purse,'charmEchoAxe',p_now)>=5 then '[]'::jsonb else
    coalesce((select jsonb_agg(s.v order by s.far_, s.id) from (
      select w.v, town.tree_apart(w.v, p_first) as far_, (w.v->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') w(v)
       where (w.v->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w.v) and town.tree_apart(w.v, p_first) <= (c.k->'echo'->>'reach')::integer
         and town.axe_bites(p_axe, w.v) is null and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$function$
;
CREATE OR REPLACE FUNCTION town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare go_ jsonb:=p_grove->'goes'->p_me;domino_ boolean;did jsonb;used_ jsonb;
begin
 if not coalesce((p_went->>'one')::boolean,false) and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree' and go_ ? 'comboLoadout' and go_->>'comboLoadout' is distinct from town.combo_loadout(p_purse) then return town.no('none');end if;
 domino_:=coalesce(go_ ? 'domino' and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree',false);
 if domino_ and (coalesce((p_went->>'one')::boolean,false) or not town.gift_works(p_purse,'charmDomino') or town.used_of(p_purse,'charmDomino',p_now)>=3) then return town.no('none');end if;
 did:=town.fell_v220(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmDomino',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 if not domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmEchoAxe',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return town.combo_root_source(p_purse,did,p_went,jsonb_build_array(p_x,p_y),p_now,p_grove,p_me);
end $function$
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
  for i in 1..greatest(3,(k->'echo'->>'trees')::integer) loop
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
CREATE OR REPLACE FUNCTION town.reward_arena(p jsonb, input jsonb, request uuid, t bigint, known_ jsonb, p_seed bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare a text:=input->>'action';state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);run_ jsonb:=state_->'arena';beetles_ jsonb:=town.cat('rewards')->'ringBeetles';seed_ bigint:=coalesce(p_seed,floor(random()*4294967296)::bigint);bug_ text:=input->>'bug';round_ integer;attack_ integer;mark_ numeric;score_ integer:=0;answer_ jsonb;book_ jsonb;
begin
 if not town.gift_works(p,'thingBeetleRing') then return town.no('none');end if;
 if a='arenaLook' then return jsonb_build_object('ok',true,'purse',p,'knownBeetles',coalesce((select jsonb_agg(b order by ord) from jsonb_array_elements(beetles_) with ordinality v(b,ord) where known_ ? (b#>>'{}') and town.held(p->'bag',b#>>'{}')>0),'[]'::jsonb));end if;
 if a='arenaCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null)),'arena',null);end if;
 if a='arenaBegin' then
  if (run_->>'until')::bigint>t or bug_ is null or not beetles_ ? bug_ or not known_ ? bug_ or town.held(p->'bag',bug_)<1 or seed_ not between 0 and 4294967295 then return town.no('none');end if;
  run_:=jsonb_build_object('id',request,'bug',bug_,'opponent',beetles_->(seed_%jsonb_array_length(beetles_))::integer,'seed',seed_,'at',input->'at','began',t,'until',t+120000);
  return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',run_)),'arena',run_);
 end if;
 if a<>'arenaEnd' or coalesce(run_,'null'::jsonb)='null'::jsonb or input->>'run' is distinct from run_->>'id' or t>(run_->>'until')::bigint or t<(run_->>'began')::bigint+6000 or town.held(p->'bag',run_->>'bug')<1 then return town.no('none');end if;
 if input->'at' is distinct from run_->'at' then return town.no('far');end if;
 if jsonb_typeof(input->'answers') is distinct from 'array' or jsonb_array_length(input->'answers')<>3 then return town.no('none');end if;
 seed_:=(run_->>'seed')::bigint;
 for round_ in 0..2 loop
  answer_:=input->'answers'->round_;
  if jsonb_typeof(answer_->'stance') is distinct from 'number' or (answer_->>'stance')::numeric<>floor((answer_->>'stance')::numeric) or (answer_->>'stance')::numeric not between 0 and 2 or jsonb_typeof(answer_->'mark') is distinct from 'number' or (answer_->>'mark')::numeric not between 0 and 1 then return town.no('none');end if;
  seed_:=(seed_*1664525+1013904223)%4294967296;mark_:=.2+(seed_%61)::numeric/100;attack_:=mod(round(mark_*100),3)::integer;
  if (answer_->>'stance')::integer=(attack_+1)%3 and abs((answer_->>'mark')::numeric-mark_)<=.1 then score_:=score_+1;end if;
 end loop;
 if score_=3 then
  declare prize_ jsonb;begin
   prize_:=town.gift_use(p,'thingBeetleRing',t);
   if prize_->'ok'='true'::jsonb then p:=prize_->'purse';p:=p||jsonb_build_object('coins',(p->>'coins')::numeric+12);end if;
  end;
 end if;
 book_:=coalesce(state_->'arenaBook','{}'::jsonb)||jsonb_build_object(run_->>'bug',greatest(coalesce((state_->'arenaBook'->>(run_->>'bug'))::integer,0),score_));
 return jsonb_build_object('ok',true,'purse',town.spend(p,1::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('arena',null,'arenaBook',book_)),'arena',null,'arenaScore',score_);
end $function$
;
do $copy$ begin if to_regprocedure('town.land_v258(text,jsonb)') is null then execute $definition$CREATE OR REPLACE FUNCTION town.land_v258(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
  drove jsonb;
  bond jsonb;
  -- ── the older tools (v174): the forged rod, the purse with a bait left in it, and whether one was ──
  rod_ jsonb;
  baited_ jsonb;
  kept_ boolean := false;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  -- (two fish still on a rod of two lines: one of them has ended, and the other is on still)
  if (line ? 'two' or line ? 'others') and line->'struck_at' <> 'null'::jsonb and how <> 'left' then return town.answer(me, town.land_one(me, purse, line, how, p_fight, now_)); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
    perform town.keep_purse(me, town.took_up(purse, now_));
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    -- (by how much harder the fish was for this member; and a legend takes its bouts, but for one the otter drove back, which is fought once more)
    if how = 'landed' and (took < town.least_ms(line->>'what', coalesce((line->>'harder')::double precision, 1),
          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)
          -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
          * coalesce((line->>'rod')::double precision, 1::double precision) * (1-coalesce((line->>'comboResume')::double precision,0)) * case when (line->'powerInfo'->(line->'powerOrder'->>0)->>'used')::boolean then .8 else 1 end
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
      -- ── the older tools (v174): lib/town/fishing's baitKept; the number of chance is drawn only with a forged rod ──
      if fish is not null and cat->'baits' ? (line->>'bait') then
        rod_ := town.rod_held(purse);
        if rod_ is not null then
          if random() < (town.rod_fx(rod_)->>'keeps')::double precision then
            baited_ := town.back_bait(landed->'purse', line->>'bait');
            kept_ := town.held(baited_->'bag', line->>'bait') > town.held(landed->'purse'->'bag', line->>'bait');
            perform town.keep_purse(me, baited_);
          end if;
        end if;
      end if;
      -- ── the older tools (v174): its end ──
    elsif how in ('snapped', 'slipped') and not suspect then
      -- (the otter drives it back, once to a line: the line stays out with its fish on, to be fought again from now,
      -- and nothing is lost or written down of the go yet)
      drove := town.drive_back(purse, how, coalesce((line->>'again')::boolean, false), now_);
      if (drove->>'ok')::boolean then
        bond:=town.combo_rescue(drove->'purse','fish:'||(line->>'cast_at'),now_,line->>'comboLoadout');
        if coalesce((bond->>'ok')::boolean,false) then
          drove:=drove||jsonb_build_object('purse',bond->'purse');
          line:=line||jsonb_build_object('comboResume',bond->'effect'->'resume');
        end if;
        perform town.keep_purse(me, drove->'purse');
        update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'again', true), updated_at = now() where member_id = me;
        perform town.note(me, 'gift_use', 'famOtter', 1, 0, jsonb_build_object('left', drove->'left', 'what', line->'what', 'how', how));
        return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', line->'what', 'kept', false, 'record', false, 'back', false, 'again', true) || case when coalesce((bond->>'ok')::boolean,false) then jsonb_build_object('combo',bond->'effect') else '{}'::jsonb end);
      end if;
      back := town.back_bait(case when how = 'snapped' then town.lose_bait(purse, line->>'bait') else purse end, line->>'bait');
      perform town.keep_purse(me, back);
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record',
    -- ── the older tools (v174): or lib/town/fishing's baitKept said so ──
    'back', (back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')) or kept_));
end;
$function$
$definition$;end if;end $copy$;
create or replace function public.town_land(p_how text,p_fight jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare me uuid:=town.member();request_ uuid;command_ jsonb;old_ town.reward_receipts%rowtype;did_ jsonb;reply_ jsonb;
 begin
  if p_fight->>'request' is null then return town.land_v258(p_how,p_fight);end if;
  if p_fight->>'request' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return town.answer(me,town.no('none'));end if;
  request_:=(p_fight->>'request')::uuid;
  command_:=jsonb_build_object('action','fishLand','how',p_how,'fightHash',md5(p_fight::text));
  perform town.purse_of(me,true);
  select * into old_ from town.reward_receipts where member_id=me and request=request_;
  if found then
   if old_.command is distinct from command_ then return town.answer(me,town.no('none'));end if;
   return town.answer(me,old_.reply);
  end if;
  did_:=town.land_v258(p_how,p_fight);
  if did_->'ok'='true'::jsonb then
   select jsonb_object_agg(key,value) into reply_ from jsonb_each(did_) where key in ('ok','how','what','kept','record','back','again','more','combo');
   delete from town.reward_receipts where member_id=me and at_ms<town.now_ms()-604800000;
   insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,request_,command_,reply_,town.now_ms());
  end if;
  return did_;
 end $$;
 revoke all on function town.land_v258(text,jsonb) from public,anon,authenticated;
 revoke all on function public.town_land(text,jsonb) from public,anon;
 grant execute on function public.town_land(text,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
