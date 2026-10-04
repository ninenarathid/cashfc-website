-- v119 — a plant dug out
--
-- Run this once in the Supabase SQL editor, after v118. Running it again is
-- safe.
--
-- Why. The owner, 2026-10-04: "ช่วยทำให้สามารถใช้จอบ ขุดเอาพืชที่ไม่ต้องการออกได้ ทั้งพืชที่
-- ปกติ และพืชที่ตายแล้ว ไม่ต้องเล่นมินิเกม แต่ต้องกด ยืนยันก่อนว่าจะเอาออกจริง ใช้ได้เฉพาะเจ้าของ
-- แปลงผัก." Until now a plant, once sown, could only be picked: one that was
-- sown by mistake, or a tree nobody wanted any more, stood in its plot for
-- good. And a plant that had died was anybody's to pull up, in anybody's
-- bed (v118), for the compost it leaves.
--
-- Now a hoe in the hand digs a plant out of a plot: one that has died
-- (`pull`, as before: it leaves compost if there is room) and one that
-- lives (`uproot`: it leaves nothing, not even when it is ripe). Both are
-- the bed's owner's alone; in a bed that is nobody's (never sown, or left
-- too long) they are anybody's, as picking is there. Clearing weeds and
-- tilling stay anybody's in anybody's bed, as v118 made them. The cost is
-- what pulling up always cost (`farming.costs.pull`): no row of the catalog
-- is touched.
--
-- No game: the page asks a second time instead, and that asking cannot be
-- seen from here. So a LIVING plant goes only when the call says it is
-- meant: `town_tend` takes a fourth word, `p_sure`, false unless given.
-- Nothing that does not give it can dig a living plant out:
--
--   - a page built before this never gives it (and never offered a hoe a
--     living plant), so no tab left open can do it by accident;
--   - a page that thinks a plant dead, when a friend has cured it a moment
--     ago, asked about a dead one and does not give it: it is told `sure`,
--     with the plot as it truly stands, and nothing is done.
--
-- A dead plant needs no word: dead is dead whoever looks.
--
-- What changes, function by function:
--
--   - `town.deed_for` is v118's word for word but for the hoe's line;
--   - `town.hoe` is v110's less its dead plant: it clears and tills;
--   - `town.uproot` is new: the digging out, by somebody who may;
--   - `town.tend` and `public.town_tend` are v110's word for word but for
--     the word passed down. Each has one more argument, so the old ones are
--     dropped first: two functions of one name, one of them with a default,
--     are two that a call with three arguments cannot be told between.

/* ── which deed a hand does: v118's, with the hoe's line changed ─────────── */

-- deedFor(): what the thing in the hand can do to a plot now, if anything.
-- In somebody else's bed only the helping deeds: the hoe's on bare ground
-- (clearing, tilling), watering, feeding, curing. Never sowing, never
-- picking, never digging a plant out, dead (`pull`) or living (`uproot`).
create or replace function town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
returns text language plpgsql stable
as $$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$$;

/* ── the hoe on bare ground: v110's, less the dead plant ─────────────────── */

-- hoe(): clear a plot of weeds, or till cleared ground. A plot with a plant
-- in it is not the hoe's to clear: that is uproot(). (`p_key` is taken as
-- it always was, and no longer read.)
create or replace function town.hoe(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
begin
  if coalesce(town.tool_of(p_hand), '') <> 'hoe' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  if p_plot->>'soil' = 'wild' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'clear')::double precision, p_now));
  end if;
  if p_plot->>'soil' = 'cleared' then
    return jsonb_build_object('ok', true, 'plot', '{"soil": "tilled", "plant": null}'::jsonb, 'purse', town.spend(p_purse, (f->'costs'->>'till')::double precision, p_now));
  end if;
  return town.no('soil');
end;
$$;

/* ── a plant dug out ─────────────────────────────────────────────────────── */

-- uproot(): dig the plant out of a plot, with a hoe in the hand, by somebody
-- who may. The ground is left cleared. One that has died leaves compost, if
-- there is room for it; one that lives leaves nothing, and goes only when
-- `p_sure` says a living one is meant.
create or replace function town.uproot(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_sure boolean, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  left_ text := f->>'pulled';
  dead boolean;
  room boolean;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'hoe' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if coalesce(p_plot->'plant', 'null'::jsonb) = 'null'::jsonb then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  dead := (town.see(p_key, p_plot, p_now)->>'dead')::boolean;
  if not dead and not coalesce(p_sure, false) then return town.no('sure'); end if;
  room := dead and town.room(p_purse->'bag', left_) > 0;
  return jsonb_build_object('ok', true, 'plot', '{"soil": "cleared", "plant": null}'::jsonb,
    'purse', town.spend(p_purse, (f->'costs'->>'pull')::double precision, p_now)
      || jsonb_build_object('bag', case when room then town.put(p_purse->'bag', left_, 1) else p_purse->'bag' end),
    'got', case when room then jsonb_build_array(jsonb_build_array(left_, 1)) else '[]'::jsonb end);
end;
$$;

/* ── tending: v110's, with the word passed down ──────────────────────────── */

drop function if exists town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint);

-- tend(): do to a plot what the thing in the hand does, with the bed's
-- keeping. `p_others` is how many other plots of the bed have a plant, and
-- `p_holds` how many other beds are this member's now. Whoever sows first
-- in a free bed owns it (unless they hold as many as one may); its owner's
-- every deed there counts as tending it; when its last plant goes, the day
-- it may stand empty begins. A bed that has lapsed is nobody's: no `bed` is
-- given back, and its keeping is dropped. `p_sure`: a living plant is meant
-- to be dug out.
create or replace function town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean default false)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
begin
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  return jsonb_build_object('ok', true, 'deed', deed, 'purse', did->'purse', 'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end;
end;
$$;

drop function if exists public.town_tend(integer, integer, jsonb);

-- Do to a plot what the thing in my hand does: clear it, till it, dig its
-- plant out, sow it, water it, feed it, cure it, pick it. `p_timing` is the
-- browser's own account of the hoe's game (hits, misses, seconds), kept
-- with the play; its misses, within bounds, cost a little more stamina.
-- `p_sure` is the page's word that it has asked a second time and a living
-- plant is meant: without it only a dead one is dug out.
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null, p_sure boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  end if;
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses);
end;
$$;

-- The rules are no browser's to call; the deed is a member's.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from public, anon;
grant execute on function public.town_tend(integer, integer, jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select p.proname, pg_get_function_identity_arguments(p.oid) as args,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace and p.proname = 'town_tend';
--   -- one row: town_tend | p_x integer, p_y integer, p_timing jsonb, p_sure boolean | f | t
--
--   select p.proname, p.pronargs as args, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p
--    where p.pronamespace = 'town'::regnamespace and p.proname in ('deed_for', 'hoe', 'tend', 'uproot')
--    order by p.proname;
--   -- deed_for | 6 | f
--   -- hoe      | 5 | f
--   -- tend     | 9 | f
--   -- uproot   | 7 | f
--
--   with plot as (
--     select jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'a', 'crop', 'kangkong',
--       'sown', town.now_ms(), 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 86400000,
--       'cured', 0, 'picked', 0, 'pickedAt', 0)) as p)
--   select town.deed_for('1,1', p, 'hoe', 'a', town.now_ms(), 'a') as mine,
--          town.deed_for('1,1', p, 'hoe', 'b', town.now_ms(), 'a') as theirs,
--          town.deed_for('1,1', p, 'hoe', 'b', town.now_ms(), null) as nobodys,
--          town.deed_for('1,1', '{"soil": "wild", "plant": null}', 'hoe', 'b', town.now_ms(), 'a') as weeds
--     from plot;
--   -- uproot | (null) | uproot | clear
