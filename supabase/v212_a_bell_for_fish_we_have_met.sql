-- v212: target a known nonlegendary fish within the unchanged eligible cast pool.
-- Run after v211 with the matching site. Rerunnable; no free bait or automatic claims.
-- Two calls/day, three eligible casts/call, thirty-minute expiry. Stardust preserves charges.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('public.town_reward(uuid,jsonb)'::regprocedure),chr(13),'')) not in ('96ea55e2038e9d6da64588aaca70c682','b503a689b15d869ccb91d8c2ad56c739') then raise exception 'Action changed: rebuild v212 on current text';end if;
 if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('ddd0a5998b1091461dc17145471260bf','3c5a58198bd036c47eb5c8ba63ae01fe') then raise exception 'Action changed: rebuild v212 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'{"thingSchoolBell":{"kind":"thing","line":"fishing","rank":7,"by":1}}'::jsonb),'{uses}',data->'uses'||'{"thingSchoolBell":{"n":2,"per":"day"}}'::jsonb) where key='gifts';
create or replace function town.reward_school_start(p jsonb,fish_ text,odds_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare active_ jsonb:=p->'professionRewards'->'school';used jsonb;school_ jsonb;
begin
 if not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->fish_ is null or town.cat('fish')->fish_->>'tier'='legend'
  or coalesce((p->'best'->>fish_)::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 if coalesce(active_,'null'::jsonb)<>'null'::jsonb and (active_->>'left')::integer>0 and (active_->>'until')::bigint>t then return town.no('none');end if;
 used:=town.gift_use(p,'thingSchoolBell',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 school_:=jsonb_build_object('fish',fish_,'left',3,'until',t+1800000);
 return jsonb_build_object('ok',true,'school',school_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_)));
end $$;
create or replace function town.reward_school_weights(p jsonb,odds_ jsonb,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare school_ jsonb:=p->'professionRewards'->'school';weighted_ jsonb;total_ double precision;
begin
 if coalesce(star_,false) or coalesce(school_,'null'::jsonb)='null'::jsonb or (school_->>'left')::integer<1 or t>=(school_->>'until')::bigint or not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->(school_->>'fish') is null or town.cat('fish')->(school_->>'fish')->>'tier'='legend'
  or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=school_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision*case when o->>'what'=school_->>'fish' then 3 else 1 end) order by ord) into weighted_ from jsonb_array_elements(odds_) with ordinality a(o,ord);
 select sum((o->>'p')::double precision) into total_ from jsonb_array_elements(weighted_) o;
 if total_ is null or total_<=0 then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision/total_) order by ord) into weighted_ from jsonb_array_elements(weighted_) with ordinality a(o,ord);
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_||jsonb_build_object('left',(school_->>'left')::integer-1))),'odds',weighted_);
end $$;
-- Identical regular-cast habitat/sky/sign/pattern/wariness/forged-rod filters; no full pool is returned to the player.
create or replace function town.reward_school_pool(p jsonb,me uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;deep_ jsonb:=town.cat('fishing')->'places'->(x::text||','||y::text);water_ jsonb:=town.cat('fishing')->'waters'->(x::text||','||y::text);
 habitat_ text:=coalesce(water_->>'habitat','town');current_ text:=coalesce(input->>'current',water_->>'current','eddy');bait_ text:=input->>'bait';sg jsonb:=town.cat('fishing')->'signs';signs_ text[];under_ jsonb;odds_ jsonb;pattern_ jsonb;rod_ jsonb;
begin
 if deep_ is null or current_ not in ('eddy','run','shelter') or (habitat_='town' and current_<>'eddy') or (habitat_='pool' and current_='run') or town.hook_bait(p,bait_)->'ok' is distinct from 'true'::jsonb then return '[]'::jsonb;end if;
 signs_:=town.signs_of(t,town.stamina_of(p,t)<=0,(select count(*)::integer from public.town_lines l where l.member_id<>me and (l.doc->>'cast_at')::bigint>t-(sg->>'lately')::bigint*1000),town.wet_ms(t-(sg->>'after')::bigint*60000,t),town.raining(t));
 under_:=town.under_orb(town.orb_of(p,t),extract(hour from to_timestamp(t/1000.0) at time zone 'Asia/Bangkok')::integer,town.raining(t),signs_);
 odds_:=town.river_odds(bait_,(under_->>'hour')::integer,(under_->>'rain')::boolean,town.has_buff(p,t,'lucky'),not deep_::boolean,array(select jsonb_array_elements_text(under_->'signs')),town.buff_by(p,t,'lucky'),habitat_,current_);
 pattern_:=town.river_pattern(p,bait_,x,y,current_,t);if habitat_<>'town' then odds_:=town.river_pattern_odds(odds_,(pattern_->>'n')::integer);end if;
 if town.is_wary(p,t) then odds_:=town.sift(odds_,array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')));end if;
 rod_:=town.rod_held(p);if rod_ is not null then odds_:=town.rarer(odds_,(town.rod_fx(rod_)->>'rare')::double precision);end if;
 return odds_;
end $$;
revoke all on function town.reward_school_start(jsonb,text,jsonb,bigint),town.reward_school_weights(jsonb,jsonb,boolean,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.town_reward(p_request uuid, p_input jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=town.far_member();t bigint:=town.now_ms();p jsonb;old town.reward_receipts%rowtype;did jsonb;f integer;x integer;y integer;c jsonb;g jsonb;
begin
 if p_request is null or jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text)>4096 or p_input->>'action' is null
   or p_input->>'action' not in ('scan','extractBegin','extractEnd','process','trailBegin','trailStage','trailEnd','trailCancel','resourceBegin','resourceEnd','resourceCancel','schoolStart') or jsonb_typeof(p_input->'at') is distinct from 'array' or jsonb_array_length(p_input->'at')<>2 then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from jsonb_array_elements(p_input->'at') v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or abs((v::text)::numeric)>10000) then return town.answer(me,town.no('none'));end if;
 x:=(p_input->'at'->>0)::integer;y:=(p_input->'at'->>1)::integer;
 if p_input->>'action'='scan' then
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
 p:=town.purse_of(me,true);
 select * into old from town.reward_receipts where member_id=me and request=p_request;
 if found then if old.command is distinct from p_input then return town.answer(me,town.no('none'));end if;return town.answer(me,old.reply);end if;
 if p_input->>'action'='scan' then
  g:=town.mine_go(me,f,null,x,y,null,false,c,t);did:=town.reward_scan(p,g,p_input->>'mineral',t);
 elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 elsif p_input->>'action' in ('trailBegin','trailStage','trailEnd','trailCancel') then did:=town.reward_trail(p,p_request,p_input,t);elsif p_input->>'action' in ('resourceBegin','resourceEnd','resourceCancel') then did:=town.reward_resource(p,p_request,p_input,t);elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);else did:=town.reward_extract(p,p_request,p_input,t);end if;
 if did->'ok'='true'::jsonb then
  perform town.keep_purse(me,did->'purse');
  delete from town.reward_receipts where member_id=me and at_ms<t-604800000;
  insert into town.reward_receipts(member_id,request,command,reply,at_ms) values(me,p_request,p_input,did-'purse',t);
 end if;
 return town.answer(me,did-'purse');
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
  purse jsonb := town.purse_of(me, true);
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
  sky text := town.orb_of(purse, now_);
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
  school_ jsonb;
begin
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
  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
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
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_school_weights(jsonb,jsonb,boolean,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'thingSchoolBell') as v212_verified;
