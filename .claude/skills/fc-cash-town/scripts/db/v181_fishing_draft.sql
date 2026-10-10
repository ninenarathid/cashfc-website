-- Draft: the expansion’s fishing portion. Run after v180.
begin;
do $guard$ begin
  if md5(replace(pg_get_functiondef('town_cast(text,integer,integer,boolean,text)'::regprocedure), chr(13), '')) not in ('b9fe7df5b8929f86c181f6f6262f2ed3','7e96291062661a138f36dcd6466fb263') then raise exception 'Definition changed: town_cast; rebuild expansion'; end if;
  if md5(replace(pg_get_functiondef('town_strike(integer)'::regprocedure), chr(13), '')) not in ('9df045c04905f6e032c3e6ae53499ad3','20e078799a86df01b5edf597b205f1f3') then raise exception 'Definition changed: town_strike; rebuild expansion'; end if;
  if md5(replace(pg_get_functiondef('town.strike_two(uuid,jsonb,jsonb,integer,boolean,jsonb,bigint)'::regprocedure), chr(13), '')) not in ('f978a61476b94145c2d7e19f8a4f4ac6','3cd2785e8210a171e7d5ad6401756b7a') then raise exception 'Definition changed: town.strike_two; rebuild expansion'; end if;
  if md5(replace(pg_get_functiondef('town_land(text,jsonb)'::regprocedure), chr(13), '')) not in ('3aba44d5c2708cf163cc2706ebf04d04','132cd470392b9446bbcdc466cc4f5d17') then raise exception 'Definition changed: town_land; rebuild expansion'; end if;
  if md5(replace(pg_get_functiondef('town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)'::regprocedure), chr(13), '')) not in ('ab1f0ca5cc9c9d087bb74f78806b62ab','bdba7cc3867e4af1eff269b7be6ea436') then raise exception 'Definition changed: town.land_one; rebuild expansion'; end if;
end $guard$;
create or replace function town.line_count(p_purse jsonb)
returns integer language sql stable set search_path = '' as $$
  select case when r is null then 0 else case when r->>'item' = 'rod' then 1 else 2 end + case when town.gift_works(p_purse, 'thingRod') then 1 else 0 end end
    from (select town.rod_of(p_purse) r) q
$$;
revoke all on function town.line_count(jsonb) from public, anon, authenticated;
CREATE OR REPLACE FUNCTION public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
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
  odds := case when star then town.star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top())
    else town.odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky')) end;
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
      'bait', bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', bait, count_, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true, 'lines', count_) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'others'->0->>'what') else '{}'::jsonb end));
end;
$function$;

CREATE OR REPLACE FUNCTION public.town_strike(p_reaction integer DEFAULT NULL::integer)
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
  how text;
  landed jsonb;
  spent boolean := town.stamina_of(purse, now_) <= 0;
  play jsonb;
  -- ── the older tools (v174): the forged rod, what it carries, and the purse a late strike leaves ──
  rod_ jsonb;
  fx_ jsonb;
  gold_ jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or line->'struck_at' <> 'null'::jsonb then return town.answer(me, town.no('none')); end if;
  play := jsonb_build_object('place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'claims', jsonb_build_object('rain', line->'rain', 'reaction', p_reaction));
  how := case
    when now_ < (line->>'bites_at')::bigint - (cat->'slack'->>'early')::bigint then 'early'
    when now_ > (line->>'bites_at')::bigint + floor(town.strike_window(purse, now_) * 1000)::bigint + (cat->'slack'->>'late')::bigint then 'missed'
    end;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's goldStrike, asked only of a strike that was struck (a bite let go by says no reaction) ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    if how = 'missed' and p_reaction is not null then
      gold_ := town.gold_strike(purse, rod_, fx_, now_ - (line->>'bites_at')::bigint - (cat->'slack'->>'late')::bigint, now_);
      if gold_ is not null then purse := gold_; how := null; end if;
    end if;
  end if;
  -- ── the older tools (v174): its end ──
  if how is not null then
    delete from public.town_lines where member_id = me;
    -- (of a line that told what was on its way, a strike too soon and a bite let go by are a line taken up)
    if coalesce((line->>'told')::boolean, false) then perform town.keep_purse(me, town.took_up(purse, now_)); end if;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  -- (a rod of two lines: both are hooked by the one strike)
  if line ? 'two' or line ? 'others' then return town.answer(me, town.strike_two(me, purse, line, p_reaction, spent, play, now_)); end if;
  fish := town.cat('fish')->(line->>'what');
  if fish is null then
    landed := town.land_catch(purse, line->>'what', 0);
    perform town.keep_purse(me, landed->'purse');
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', true, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', 'landed', 'kept', landed->'kept', 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
  end if;
  -- a fight costs its stamina whatever comes of it
  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));
  -- ── the older tools (v174): the same with a forged rod ──
  if rod_ is not null then perform town.keep_purse(me, town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, now_), rod_, fx_, line->>'what', now_)); end if;
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false)
    || case when line ? 'harder' then jsonb_build_object('harder', line->'harder') else '{}'::jsonb end);
end;
$function$;

CREATE OR REPLACE FUNCTION town.strike_two(p_member uuid, p_purse jsonb, p_line jsonb, p_reaction integer, p_spent boolean, p_play jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  purse jsonb := p_purse;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size')) || coalesce(p_line->'others', jsonb_build_array(p_line->'two'));
  thing jsonb;
  fish jsonb;
  landed jsonb;
  told jsonb := '[]'::jsonb;
  onhook jsonb := '[]'::jsonb;
  i integer;
  -- ── the older tools (v174): the forged rod, read once, and what it carries ──
  rod_ jsonb := town.rod_held(p_purse);
  fx_ jsonb;
begin
  if rod_ is not null then fx_ := town.rod_fx(rod_); end if;
  for i in 0..jsonb_array_length(things) - 1 loop
    thing := things->i;
    fish := town.cat('fish')->(thing->>'what');
    if fish is null then
      landed := town.land_catch(purse, thing->>'what', 0);
      purse := landed->'purse';
      perform town.record(p_member, 'fishing', true, 0, p_spent, town.buff_of(p_purse, p_now),
        p_play || jsonb_build_object('what', thing->'what', 'size', 0, 'how', 'landed', 'kept', landed->'kept', 'record', false, 'pair', i));
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
    else
      -- ── the older tools (v174): a fight's stamina with a forged rod; with any other, the line as it was ──
      if rod_ is not null then
        purse := town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, p_now), rod_, fx_, thing->>'what', p_now);
      else
      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);
      end if;
      onhook := onhook || jsonb_build_array(thing);
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', thing->'size', 'landed', false));
    end if;
  end loop;
  perform town.keep_purse(p_member, purse);
  if jsonb_array_length(onhook) = 0 then
    delete from public.town_lines where member_id = p_member;
  else
    update public.town_lines set doc = (p_line - 'two' - 'others')
        || jsonb_build_object('what', onhook->0->'what', 'size', onhook->0->'size', 'struck_at', p_now, 'reaction', p_reaction, 'spent', p_spent, 'paired', true)
        || case when jsonb_array_length(onhook) > 1 then jsonb_build_object('others', (select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(onhook) with ordinality e(v, ord) where e.ord > 1)) else '{}'::jsonb end, updated_at = now()
     where member_id = p_member;
  end if;
  return jsonb_build_object('ok', true, 'hooked', true, 'what', told->0->'what', 'size', told->0->'size',
    'landed', jsonb_array_length(onhook) = 0, 'kept', told->0->'kept', 'pair', told)
    || case when p_line ? 'harder' then jsonb_build_object('harder', p_line->'harder') else '{}'::jsonb end;
end;
$function$;

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
          * coalesce((line->>'rod')::double precision, 1::double precision)
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
        perform town.keep_purse(me, drove->'purse');
        update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'again', true), updated_at = now() where member_id = me;
        perform town.note(me, 'gift_use', 'famOtter', 1, 0, jsonb_build_object('left', drove->'left', 'what', line->'what', 'how', how));
        return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', line->'what', 'kept', false, 'record', false, 'back', false, 'again', true));
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
$function$;

CREATE OR REPLACE FUNCTION town.land_one(p_member uuid, p_purse jsonb, p_line jsonb, p_how text, p_fight jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  cat jsonb := town.cat('fishing');
  which_ integer := case when coalesce(p_fight->>'which','0') ~ '^[0-2]$' then coalesce(p_fight->>'which','0')::integer else -1 end;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size')) || coalesce(p_line->'others', jsonb_build_array(p_line->'two'));
  mine jsonb := things->which_;
  others jsonb;
  fish jsonb := town.cat('fish')->(mine->>'what');
  how text := p_how;
  took bigint := p_now - (p_line->>'struck_at')::bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  if which_ < 0 or which_ >= jsonb_array_length(things) then return town.no('none'); end if;
  select jsonb_agg(e.v order by e.ord) into others from jsonb_array_elements(things) with ordinality e(v,ord) where e.ord - 1 <> which_;
  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))
      -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
      * coalesce((p_line->>'rod')::double precision, 1::double precision)
      or took > (cat->>'longest')::bigint * 1000) then
    how := 'slipped';
    suspect := true;
  end if;
  if how = 'landed' then
    landed := town.land_catch(p_purse, mine->>'what', (mine->>'size')::double precision);
    perform town.keep_purse(p_member, landed->'purse');
  elsif not suspect then
    back := town.back_bait(case when how = 'snapped' then town.lose_bait(p_purse, p_line->>'bait') else p_purse end, p_line->>'bait');
    perform town.keep_purse(p_member, back);
  end if;
  update public.town_lines set doc = (p_line - 'two' - 'others') || jsonb_build_object('what', others->0->'what', 'size', others->0->'size') || case when jsonb_array_length(others) > 1 then jsonb_build_object('others', (select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(others) with ordinality e(v,ord) where e.ord > 1)) else '{}'::jsonb end, updated_at = now() where member_id = p_member;
  perform town.record(p_member, 'fishing', how = 'landed', took / 1000.0, coalesce((p_line->>'spent')::boolean, false), town.buff_of(p_purse, p_now), jsonb_build_object(
    'how', how, 'place', case when (p_line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(p_line->'x', p_line->'y'),
    'bait', p_line->'bait', 'hour', p_line->'hour', 'what', mine->'what', 'size', mine->'size', 'wait', p_line->'wait',
    'nibbles', jsonb_array_length(p_line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect, 'pair', which_,
    'claims', jsonb_build_object('rain', p_line->'rain', 'reaction', p_line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return jsonb_build_object('ok', true, 'how', how, 'what', mine->'what', 'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);
end;
$function$;

notify pgrst, 'reload schema';
commit;
