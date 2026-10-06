-- v153, the fishing deck's part: the gifts of its second to sixth ranks, and the game made harder to match.
-- Tried on top of v153.shared.sql (try-line.mjs); the rules are lib/town/fishing.ts again, held to it by the cases
-- of lib/town/db-vectors-gifts-fishing.test.ts. Safe to run twice.

-- ─── The rules ───────────────────────────────────────────────────────────

-- The otter (famOtter, the second rank): a fish that got away in the fight is driven back for one more fight
-- (lib/town/fishing's driveBack): a line snapped or a hook slipped, once to a line, and counted so many times to a
-- meal's hours.
create or replace function town.drive_back(p_purse jsonb, p_how text, p_again boolean, p_now bigint)
returns jsonb language sql stable
as $$
  select case when coalesce(p_again, false) or p_how is null or p_how not in ('snapped', 'slipped') then town.no('none')
    else town.gift_use(p_purse, 'famOtter', p_now) end
$$;

-- What may take a bait, without the fish of some tiers (lib/town/fishing's sift): each share of what is left, of
-- what is left. (What is no fish is of no tier, and stays.)
create or replace function town.sift(p_odds jsonb, p_tiers text[])
returns jsonb language plpgsql stable
as $$
declare
  fish jsonb := town.cat('fish');
  o jsonb;
  kept jsonb := '[]'::jsonb;
  total double precision := 0;
  left_ jsonb := '[]'::jsonb;
begin
  for o in select t.e from jsonb_array_elements(p_odds) with ordinality as t(e, ord) order by t.ord loop
    continue when fish->(o->>'what')->>'tier' = any(coalesce(p_tiers, '{}'::text[]));
    kept := kept || jsonb_build_array(o);
    total := total + (o->>'p')::double precision;
  end loop;
  for o in select t.e from jsonb_array_elements(kept) with ordinality as t(e, ord) order by t.ord loop
    left_ := left_ || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision / total));
  end loop;
  return left_;
end;
$$;

-- So many of a bait put on hooks at once (lib/town/fishing's hookBaits): a rod of two lines takes two. As
-- town.hook_bait is for one.
create or replace function town.hook_baits(p_purse jsonb, p_bait text, p_n integer)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  n integer := greatest(1, coalesce(p_n, 1));
begin
  if not exists (select 1 from jsonb_array_elements_text(cat->'rods') r where town.held(p_purse->'bag', r) > 0) then return town.no('tool'); end if;
  if not cat->'baits' ? p_bait or town.held(p_purse->'bag', p_bait) < n then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse',
    case when cat->'kept' ? p_bait then p_purse else p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, n)) end);
end;
$$;

-- A line dropped, from what may take it however that was reckoned (lib/town/fishing's castFrom): town.cast_line's
-- own body (v122's), with the odds handed to it.
create or replace function town.cast_from(p_odds jsonb, p_rnd double precision[])
returns jsonb language plpgsql stable
as $$
declare
  odds jsonb := p_odds;
  n integer := jsonb_array_length(odds);
  apart integer := (town.cat('fishing')->>'apart')::int;
  k integer := 2;
  r double precision := p_rnd[1];
  what text := odds->(n - 1)->>'what';
  fish jsonb;
  span jsonb;
  wait integer;
  many integer := 0;
  nibbles integer[] := '{}';
  at_ integer;
  big double precision;
  size double precision := 0;
  i integer;
begin
  for i in 0..n - 1 loop
    if r < (odds->i->>'p')::double precision then what := odds->i->>'what'; exit; end if;
    r := r - (odds->i->>'p')::double precision;
  end loop;
  fish := town.cat('fish')->what;
  span := coalesce(fish->'wait', town.cat('flotsam')->what->'wait');
  wait := floor((span->>0)::double precision + ((span->>1)::double precision - (span->>0)::double precision) * p_rnd[k] + 0.5::double precision)::int;
  k := k + 1;
  -- a fish may nibble once or twice first; what is no fish only drifts onto the hook
  if fish is not null then
    many := case when p_rnd[k] < 0.3 then 0 when p_rnd[k] < 0.75 then 1 else 2 end;
    k := k + 1;
  end if;
  for i in 1..many loop
    at_ := floor((0.25::double precision + 0.6::double precision * p_rnd[k]) * wait + 0.5::double precision)::int;
    k := k + 1;
    if at_ >= apart and wait - at_ >= apart and not exists (select 1 from unnest(nibbles) x where abs(x - at_) < apart) then
      nibbles := nibbles || at_;
    end if;
  end loop;
  -- most are small: the roll is multiplied by itself
  if fish is not null then
    big := p_rnd[k];
    size := floor(((fish->'size'->>0)::double precision + ((fish->'size'->>1)::double precision - (fish->'size'->>0)::double precision) * (big * big)) * 10 + 0.5::double precision)
      / 10::double precision;
  end if;
  return jsonb_build_object('what', what, 'wait', wait, 'size', size,
    'nibbles', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(nibbles) x));
end;
$$;

-- town.cast_line(...): v122's, its body now town.cast_from's: it hands that a bait's own odds.
CREATE OR REPLACE FUNCTION town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  return town.cast_from(town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs, p_luck), p_rnd);
end;
$function$;

-- ─── A rod of two lines (thingRod, the third rank) ───────────────────────

-- The strike of a rod of two lines: each of the two is hooked by it. What is no fish comes in at once, as ever; a
-- fish is to be fought, and its fight is paid for, each its own. With one fish on, the line is a line as any other
-- from here; with two, the second waits in `two` (town.land_one ends them one at a time).
create or replace function town.strike_two(p_member uuid, p_purse jsonb, p_line jsonb, p_reaction integer, p_spent boolean, p_play jsonb, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  purse jsonb := p_purse;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size'), p_line->'two');
  thing jsonb;
  fish jsonb;
  landed jsonb;
  told jsonb := '[]'::jsonb;
  onhook jsonb := '[]'::jsonb;
  i integer;
begin
  for i in 0..1 loop
    thing := things->i;
    fish := town.cat('fish')->(thing->>'what');
    if fish is null then
      landed := town.land_catch(purse, thing->>'what', 0);
      purse := landed->'purse';
      perform town.record(p_member, 'fishing', true, 0, p_spent, town.buff_of(p_purse, p_now),
        p_play || jsonb_build_object('what', thing->'what', 'size', 0, 'how', 'landed', 'kept', landed->'kept', 'record', false, 'pair', i));
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
    else
      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);
      onhook := onhook || jsonb_build_array(thing);
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', thing->'size', 'landed', false));
    end if;
  end loop;
  perform town.keep_purse(p_member, purse);
  if jsonb_array_length(onhook) = 0 then
    delete from public.town_lines where member_id = p_member;
  else
    update public.town_lines set doc = (p_line - 'two')
        || jsonb_build_object('what', onhook->0->'what', 'size', onhook->0->'size', 'struck_at', p_now, 'reaction', p_reaction, 'spent', p_spent, 'paired', true)
        || case when jsonb_array_length(onhook) = 2 then jsonb_build_object('two', onhook->1) else '{}'::jsonb end, updated_at = now()
     where member_id = p_member;
  end if;
  return jsonb_build_object('ok', true, 'hooked', true, 'what', told->0->'what', 'size', told->0->'size',
    'landed', jsonb_array_length(onhook) = 0, 'kept', told->0->'kept', 'pair', told);
end;
$$;

-- One of two fish still on a rod of two lines has ended (the page says which: the first, or `which` 1 for the
-- second): landed, or lost, as town_land ends any fish, and written down as a go of its own. The other is on still:
-- the line is a line as any other from here, with that fish.
create or replace function town.land_one(p_member uuid, p_purse jsonb, p_line jsonb, p_how text, p_fight jsonb, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  cat jsonb := town.cat('fishing');
  second boolean := coalesce(p_fight->>'which', '0') = '1';
  first jsonb := jsonb_build_object('what', p_line->'what', 'size', p_line->'size');
  mine jsonb := case when second then p_line->'two' else first end;
  other jsonb := case when second then first else p_line->'two' end;
  fish jsonb := town.cat('fish')->(mine->>'what');
  how text := p_how;
  took bigint := p_now - (p_line->>'struck_at')::bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  if how = 'landed' and (took < floor((fish->>'line')::double precision / (cat->>'reel')::double precision * (cat->>'least')::double precision * 1000)
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
  update public.town_lines set doc = (p_line - 'two') || jsonb_build_object('what', other->'what', 'size', other->'size'), updated_at = now() where member_id = p_member;
  perform town.record(p_member, 'fishing', how = 'landed', took / 1000.0, coalesce((p_line->>'spent')::boolean, false), town.buff_of(p_purse, p_now), jsonb_build_object(
    'how', how, 'place', case when (p_line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(p_line->'x', p_line->'y'),
    'bait', p_line->'bait', 'hour', p_line->'hour', 'what', mine->'what', 'size', mine->'size', 'wait', p_line->'wait',
    'nibbles', jsonb_array_length(p_line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect, 'pair', case when second then 1 else 0 end,
    'claims', jsonb_build_object('rain', p_line->'rain', 'reaction', p_line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return jsonb_build_object('ok', true, 'how', how, 'what', mine->'what', 'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);
end;
$$;

-- ─── What a member does ──────────────────────────────────────────────────

-- public.town_cast: v152's, and how the line is dropped (p_how: 'pair' for a rod of two lines). The argument is
-- new, so the function of four arguments goes: a page from before names four, and is answered by this one.
drop function if exists public.town_cast(text, integer, integer, boolean);
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text)
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
  odds jsonb;
  two jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  -- (a rod of two lines is its owner's to drop)
  if p_how is not null and (p_how <> 'pair' or not town.gift_works(purse, 'thingRod')) then return town.answer(me, town.no('none')); end if;
  did := case when pair then town.hook_baits(purse, p_bait, 2) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  odds := town.odds(p_bait, hour, town.raining(now_), town.has_buff(purse, now_, 'lucky'), not deep::boolean, signs, town.buff_by(purse, now_, 'lucky'));
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
    line := line || jsonb_build_object('two', jsonb_build_object('what', two->'what', 'size', two->'size'));
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, case when pair then 2 else 1 end, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'two'->>'what') else '{}'::jsonb end));
end;
$function$;
revoke execute on function public.town_cast(text, integer, integer, boolean, text) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean, text) to authenticated;

-- public.town_strike(p_reaction integer): v120's, and a rod of two lines (town.strike_two).
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
  if how is not null then
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  -- (a rod of two lines: both are hooked by the one strike)
  if line ? 'two' then return town.answer(me, town.strike_two(me, purse, line, p_reaction, spent, play, now_)); end if;
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
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false));
end;
$function$;

-- public.town_land(p_how text, p_fight jsonb): v152's, the otter, and a rod of two lines (town.land_one).
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
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  -- (two fish still on a rod of two lines: one of them has ended, and the other is on still)
  if line ? 'two' and line->'struck_at' <> 'null'::jsonb and how <> 'left' then return town.answer(me, town.land_one(me, purse, line, how, p_fight, now_)); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    if how = 'landed' and (took < floor((fish->>'line')::double precision / (cat->>'reel')::double precision * (cat->>'least')::double precision * 1000)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
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
    'back', back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')));
end;
$function$;

revoke execute on all functions in schema town from public, anon, authenticated;
