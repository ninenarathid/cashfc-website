-- v194: five private equipment bonds, discovered through play.
-- Requires v180-v182 and v184-v185; preserves their gameplay and catalog. Safe to run twice.
-- Run with the matching site. No purse, inventory, progression or catalog is reset.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('public.town_fell_begin(integer,integer,integer)'::regprocedure),chr(13),'')) not in ('87b9be12c4cb26b1791d207e552393da','f38a589d8d33e220993697e1eb9900ae') then raise exception 'Definition changed: public.town_fell_begin(integer,integer,integer); rebuild v194'; end if;
 if md5(replace(pg_get_functiondef('public.town_cast(text,integer,integer,boolean,text,text)'::regprocedure),chr(13),'')) not in ('43e396a78173bea1c4406e3f8fb6bf6d','ddd0a5998b1091461dc17145471260bf') then raise exception 'Definition changed: public.town_cast(text,integer,integer,boolean,text,text); rebuild v194'; end if;
 if md5(replace(pg_get_functiondef('public.town_land(text,jsonb)'::regprocedure),chr(13),'')) not in ('132cd470392b9446bbcdc466cc4f5d17','d0b5bc730adc5b150f66c488b566beef') then raise exception 'Definition changed: public.town_land(text,jsonb); rebuild v194'; end if;
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('a2ef7add086def9ec8327cdbd2704bc9','262943f3a771355a561ca2c58c368e8b') then raise exception 'Definition changed: town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v194'; end if;
end $guard$;

create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$
 select $json$[{"key":"SC13","version":1,"cue":"water","requires":["charmFloat","charmLine","famOtter"],"pool":"rescue","cap":3,"name":{"th":"สายใยพากลับ","en":"A thread home"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 35% ใช้ร่วมกับสิทธิ์ช่วยของนาก รวมกับชุดทุ่น–นากวันละ 3 ครั้ง","en":"The otter brings a lost fish 35% closer. Uses an otter rescue and shares three daily uses with the float–otter bond."}},{"key":"SC01","version":1,"cue":"water","requires":["charmFloat","famOtter"],"pool":"rescue","cap":3,"name":{"th":"นากจำทางน้ำ","en":"The otter remembers"},"does":{"th":"นากพาปลากลับมาใกล้ฝั่งขึ้น 20% ยังต้องสู้อีกรอบ ใช้ร่วมกับสิทธิ์ช่วยของนาก วันละ 3 ครั้ง","en":"The otter brings a lost fish 20% closer. Fight it again; uses an otter rescue, three times a day."}},{"key":"SC02","version":1,"cue":"wood","requires":["charmEchoAxe","famWoodpecker"],"pool":"notch","name":{"th":"จังหวะของเนื้อไม้","en":"The grain's rhythm"},"does":{"th":"ก่อนลงขวาน นกชี้รอยบากที่อ่านผิดให้แก้หนึ่งจุดต่อต้น อ่านที่เหลือและเล่นเกมเอง ไม่ซ้อนข้อมูลที่เครื่องมือบอกอยู่แล้ว","en":"Before chopping, the bird points out one unread, incorrect notch per trunk. Read the rest and play the game; existing tool hints take precedence."}},{"key":"SC03","version":1,"cue":"echo","requires":["charmMinerLamp","famBat"],"pool":"cavity","name":{"th":"แสงฟังโพรง","en":"Light hears hollows"},"does":{"th":"ก่อนเล่นแนวแร่ ค้างคาวสะท้อนตำแหน่งหินแข็งบนกระดานให้เห็น ไม่เพิ่มแร่หรือเฉลยสีผลึก ไม่ซ้อนเลนส์โพรง","en":"Before working a vein, the bat reveals hard pockets on its board. No extra ore or crystal colors; cavity lenses take precedence."}},{"key":"SC11","version":1,"cue":"echo","requires":["charmMinerLamp","famWoodpecker"],"pool":"echo","name":{"th":"เพลงใต้หิน","en":"A song under stone"},"does":{"th":"นกเคาะให้ฟังแนวสะท้อนก่อนเลือกแร่หรือผลึก ผู้เล่นเลือกและขุดเอง ไม่ซ้อนเครื่องมือหรือบัฟฟังชั้นหิน","en":"The bird taps the echo direction before choosing ore or crystal. Choose and mine yourself; existing echo tools and buffs take precedence."}}]$json$::jsonb
$rules$;
create or replace function town.combo_loadout(p jsonb) returns text language sql stable set search_path='' as $$
 select replace(jsonb_build_array(coalesce((select jsonb_agg(v order by v) from jsonb_array_elements(g->'charms') v),'[]'::jsonb),g->'familiar')::text,', ', ',') from (select town.gifts_of(p) g) q
$$;
create or replace function town.combo_match(p jsonb,r jsonb) returns boolean language sql stable set search_path='' as $$
 select jsonb_array_length(r->'requires') between 2 and 3
 and jsonb_array_length(r->'requires')=(select count(distinct id) from jsonb_array_elements_text(r->'requires') id)
 and not exists(select 1 from jsonb_array_elements_text(r->'requires') id where not town.gift_works(p,id) or coalesce(town.cat('gifts')->'gifts'->id->>'kind','') not in ('charm','familiar'))
$$;
create or replace function town.combo_cue(p jsonb,c text) returns text language sql stable set search_path='' as $$
 select r->>'cue' from jsonb_array_elements(town.combo_rules()) r where town.combo_match(p,r) and
 (c='wear' or c='wood' and r->>'key'='SC02' or c='cavity' and r->>'key'='SC03' or c='echo' and r->>'key'='SC11') limit 1
$$;
create or replace function town.combo_grant(p jsonb,k text,a text,t bigint,e jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare r jsonb; s jsonb:=coalesce(p->'combos','{}'::jsonb); found jsonb:=coalesce(s->'found','[]'::jsonb); used jsonb:=coalesce(s->'used','{}'::jsonb); acts jsonb:=coalesce(s->'actions','{}'::jsonb); old jsonb:=acts->a; fresh boolean; d bigint:=floor((t+7200000)::numeric/86400000); n integer; pool text;
begin
 select v into r from jsonb_array_elements(town.combo_rules()) v where v->>'key'=k;
 if r is null or a is null or length(a)<1 or length(a)>180 or not town.combo_match(p,r) then return town.no('none'); end if;
 if old is not null then return case when old->>'key'=k then jsonb_build_object('ok',true,'purse',p,'effect',(old-'key'-'at')||jsonb_build_object('fresh',false)) else town.no('none') end; end if;
 pool:=r->>'pool'; n:=case when (used->pool->>'day')::bigint=d then coalesce((used->pool->>'n')::integer,0) else 0 end;
 if r ? 'cap' and n >= (r->>'cap')::integer then return town.no('none'); end if;
 fresh:=not exists(select 1 from jsonb_array_elements(found) v where v->>'key'=k);
 if fresh then found:=found||jsonb_build_array((r-'pool'-'cap')||jsonb_build_object('at',t)); end if;
 if r ? 'cap' then used:=used||jsonb_build_object(pool,jsonb_build_object('day',d,'n',n+1)); end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into acts from (select key,value from jsonb_each(acts) where t-(value->>'at')::bigint<86400000 order by (value->>'at')::bigint desc,key limit 63) q;
 acts:=acts||jsonb_build_object(a,e||jsonb_build_object('key',k,'cue',r->>'cue','at',t));
 s:=jsonb_build_object('found',found,'used',used,'actions',acts,'last',jsonb_build_object('key',k,'cue',r->>'cue','action',a,'at',t,'fresh',fresh));
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('combos',s),'effect',e||jsonb_build_object('cue',r->>'cue','fresh',fresh));
end $$;
create or replace function town.combo_rescue(p jsonb,a text,t bigint,l text) returns jsonb language plpgsql stable set search_path='' as $$
declare k text;
begin
 if l is distinct from town.combo_loadout(p) then return town.no('none'); end if;
 k:=case when town.gift_works(p,'charmLine') then 'SC13' else 'SC01' end;
 return town.combo_grant(p,k,a,t,jsonb_build_object('resume',case when k='SC13' then 0.35 else 0.20 end));
end $$;
revoke all on function town.combo_rules(),town.combo_loadout(jsonb),town.combo_match(jsonb,jsonb),town.combo_cue(jsonb,text),town.combo_grant(jsonb,text,text,bigint,jsonb),town.combo_rescue(jsonb,text,bigint,text) from public,anon,authenticated;

create or replace function public.town_combo(p_context text,p_input jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.member(); t bigint:=town.now_ms(); p jsonb; grove jsonb; target jsonb; a text; k text; e jsonb; did jsonb; tree integer; i integer; side integer; hints integer;
begin
 if p_context not in ('wear','wood','cavity','echo') or p_context is null then return town.answer(me,town.no('none')); end if;
 -- Grove before purse, matching the felling deeds' lock order.
 if p_context='wood' then grove:=town.thing('grove',true); end if;
 p:=town.purse_of(me,true);
 if p_context='wear' then return town.answer(me,jsonb_build_object('ok',true,'cue',town.combo_cue(p,'wear'))); end if;
 if p_context='wood' then
  target:=grove->'goes'->(me::text);
  if target is null or t<(target->>'at')::bigint or t-(target->>'at')::bigint>45000 then return town.answer(me,town.no('none')); end if;
  if jsonb_typeof(p_input->'notches') is distinct from 'array' then return town.answer(me,town.no('none')); end if;
  if jsonb_array_length(p_input->'notches')<>3 or exists(select 1 from jsonb_array_elements(p_input->'notches') v where v not in ('-1'::jsonb,'1'::jsonb)) then return town.answer(me,town.no('none')); end if;
  tree:=(target->>'comboTree')::integer; hints:=coalesce((target->>'comboHints')::integer,0); k:='SC02';
  a:='wood:'||(target->>'at')||':'||tree;
  if p->'combos'->'actions' ? a then e:=(p->'combos'->'actions'->a)-'key'-'cue'-'at';
  else
   for i in 0..2 loop
    side:=case when ((abs(tree)::bigint % 16)>>i)&1=1 then 1 else -1 end;
    if i>=hints and (p_input->'notches'->>i)::integer<>side then e:=jsonb_build_object('index',i,'side',side); exit; end if;
   end loop;
  end if;
 else
  target:=p->'mine'->'vein';
  if jsonb_typeof(target) is distinct from 'object' or not (target ? 'geology') then return town.answer(me,town.no('none')); end if;
  a:='vein:'||(target->>'f')||':'||(target->>'rock')||':'||(target->>'turn')||':'||(target->>'seed')||':'||coalesce(target->>'again','false');
  if p_context='cavity' and not coalesce((target->'geology'->>'cavities')::boolean,false) then k:='SC03'; e:=jsonb_build_object('cavities',true);
  elsif p_context='echo' and not coalesce((target->'geology'->>'hint')::boolean,false) then k:='SC11'; e:=jsonb_build_object('echo',case when abs((target->>'seed')::bigint)%2=1 then 1 else -1 end); end if;
 end if;
 if e is null or target->>'comboLoadout' is distinct from town.combo_loadout(p) then return town.answer(me,town.no('none')); end if;
 did:=town.combo_grant(p,k,a,t,e);
 if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
 return town.answer(me,did-'purse');
end $$;
revoke all on function public.town_combo(text,jsonb) from public,anon,authenticated;
grant execute on function public.town_combo(text,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.town_fell_begin(p_tree integer, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  -- (the grove is held: of two who walk up to one tree at one moment, the second finds it held)
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, false);
  did := town.fell_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text);
  if (did->>'ok')::boolean then
    grove := town.fell_opened(grove, me::text, did->'trees', now_);
    grove:=jsonb_set(grove,array['goes',me::text],(grove->'goes'->(me::text))||jsonb_build_object('comboLoadout',town.combo_loadout(purse),'comboTree',p_tree,'comboHints',did->'ask'->'grain'->'hints'));
    perform town.keep_thing('grove', grove);
  end if;
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return town.answer(me, (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$function$
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
CREATE OR REPLACE FUNCTION public.town_land(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
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
          * coalesce((line->>'rod')::double precision, 1::double precision) * (1-coalesce((line->>'comboResume')::double precision,0))
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
;
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
      'comboLoadout',town.combo_loadout(p_purse),'geology', town.geology_mods(p_purse,now_),
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
notify pgrst,'reload schema';
commit;
select has_function_privilege('anon','public.town_combo(text,jsonb)','EXECUTE') as anon_combo,
has_function_privilege('authenticated','public.town_combo(text,jsonb)','EXECUTE') as member_combo,
has_function_privilege('authenticated','town.combo_rules()','EXECUTE') as private_recipes;
