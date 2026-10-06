-- v153, the farming line's gifts (lib/town/farm.ts, under "the gifts of the farming line"; lib/town/gifts.ts has
-- each gift's own number). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
--   * The enchanted hoe (a charm, worn): a bed's row at a swing. `town_row(x, y, marks, timing)` is ONE deed: told
--     how each plot's beat went, it does each plot whose beat was hit as `town_tend` would have done it by itself
--     (`town.tend`, as it is), from the plot stood on outwards, and leaves each whose beat was missed. Each plot done
--     is written down as its own go at farming (`town_plays`, which the lines of work count), and the row whole as
--     one line of `town_deeds` (`row`).
--   * The spellbound seed pouch (a thing, had): the same deed sows every plot of the row that is ready for a seed,
--     for five seeds where seven plots would take seven (`town.pouch_seeds`), each plot written down as its own
--     sowing (`sow`, which earns no points, as ever).
--   * The crescent sickle (a charm, worn): the same deed picks every ripe plant of the row its wearer swung at, in
--     their own bed, each as `town.pick` picks it by hand; one cut well gives one more (the catalog's gifts row: the
--     sickle's number), where the bag has room. Each plant is written down as its own picking (`pick`, which earns
--     its points on the farming line as ever), with how it was cut.
--   * The hourglass of seasons (a thing, had): turned over one bed of its owner's (`town_hourglass(x, y)`, once a
--     day: the catalog's count), everything growing there grows so many times as fast (its number) for so many hours
--     (`farming.gifted.glass`, new in the catalog's row). Each plant of the bed remembers the turning (`fast`, a
--     list of moments in the plant's own document), and the clocks growth is reckoned by count it: `town.grown`
--     (v118's), `town.growing` (v110's) and `town.pest_at` (v147's) are written again, each as it ran but for the
--     hourglass's term (`town.quick_ms`, which is nothing for a plant no hourglass was turned over: such a plant is
--     as it always was, to the millisecond). Written down as one line (`hourglass`: how many plants).
--   * The mandrake sprout (a familiar, following): it sings as its member picks a plant for what would be the last
--     time, and that plant bears once more, any crop (so many plants a day: the catalog's count). The plant keeps
--     that (`more`, in its own document), waits its kind's own while to bear again, or, of a kind picked only once,
--     a part of its hours (`farming.gifted.encore`), and is picked once more. `town.pick` (v110's) is written again
--     for the song, and `town.growing` and `town.pest_at` (above) know of the bearing more. A plant never sung to
--     has no such mark and is as it always was.
--   * The garden gnome (a familiar, following) waters its member's whole bed at once: no water out of a can, no
--     stamina, what a plain can adds; a bed rests so many minutes between two of its rounds (the catalog's gifts row:
--     the gnome's number), kept in the purse (`gnomed`). `town_gnome(x, y)`; written down as one line (`gnome`:
--     how many plants). It began as a weeder counted ten times to a meal's hours (v152): that count is gone from the
--     catalog's row, and `town_gift_use('famGnome')` answers that there is nothing to use.

-- The growth an hourglass of seasons has added to a plant between two moments, in milliseconds (lib/town/farm's
-- quickMs): for every stretch it ran over the plant's bed, the part of it between them, so many times over again
-- (three times as fast is twice more). Nothing, for a plant no hourglass was turned over.
create or replace function town.quick_ms(p_plant jsonb, p_from bigint, p_to bigint)
returns double precision language sql stable
as $$
  select case when jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0 then
      coalesce((select sum(greatest(0, least(p_to::numeric, (f.at #>> '{}')::numeric + k.span) - greatest(p_from::numeric, (f.at #>> '{}')::numeric)))
                  from jsonb_array_elements(p_plant->'fast') as f(at) where jsonb_typeof(f.at) = 'number'), 0)::double precision * (k.by - 1::double precision)
    else 0::double precision end
    from (select (town.cat('farming')->'gifted'->'glass'->>'hours')::numeric * 3600000 as span,
                 (town.cat('gifts')->'gifts'->'thingHourglass'->>'by')::double precision as by) k
$$;

-- How many bearings more than its kind a plant has (lib/town/farm's moreOf): none, but for one the mandrake sang to.
create or replace function town.more_of(p_plant jsonb)
returns integer language sql immutable
as $$ select case when jsonb_typeof(p_plant->'more') = 'number' and (p_plant->>'more')::numeric > 0 then floor((p_plant->>'more')::numeric)::integer else 0 end $$;

-- The hours a plant has grown by a moment (v118's, with what an hourglass turned over its bed did).
create or replace function town.grown(p_plant jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + town.wet_ms(p.sown, p_now)::double precision * (w.f->>'adds')::double precision / (w.f->>'every')::double precision
      + town.quick_ms(p_plant, p.sown, p_now)) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$$;

-- Where a plant is in its growing, pests left out (v110's; one that was picked and bears again waits by the clock,
-- and by the hourglass with it).
create or replace function town.growing(p_plant jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  -- (a plant the mandrake sang to has a bearing more than its kind, and waits for it as one that bears again waits)
  select case when m.more > 0 and m.picked >= m.picks and m.picked < m.picks + m.more
      then jsonb_build_object('stage', case when m.since >= m.encore then 5 else 4 end, 'ripe', m.since >= m.encore, 'spent', false)
      else town.growth(p_plant->>'crop', town.grown(p_plant, p_now), m.picked, m.since) end
    from (
      select (p_plant->>'picked')::int as picked, town.more_of(p_plant) as more, (c.crop->>'picks')::int as picks,
             coalesce((c.crop->>'again')::double precision, (c.crop->>'hours')::double precision * (town.cat('farming')->'gifted'->>'encore')::double precision) as encore,
             ((p_now - (p_plant->>'pickedAt')::bigint)::double precision
               + case when (p_plant->>'picked')::int > 0 then town.quick_ms(p_plant, (p_plant->>'pickedAt')::bigint, p_now) else 0::double precision end) / 3600000::double precision as since
        from (select town.cat('crops')->(p_plant->>'crop') as crop) c
    ) m
$$;

-- When a pest struck a plant, if one has and it has not been cured since (v147's, with the hourglass in what is
-- ripe: a ripe plant is safe).
create or replace function town.pest_at(p_key text, p_plant jsonb, p_now bigint)
returns bigint language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
  -- (whether an hourglass was ever turned over it: its term is asked for only then)
  quick boolean := coalesce(jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0, false);
  -- (the bearing more of a plant the mandrake sang to, and the hours it waits for it)
  more integer := town.more_of(p_plant);
  encore double precision := coalesce((c->>'again')::double precision, (c->>'hours')::double precision * (f->'gifted'->>'encore')::double precision);
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks + more then false
        when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore
        when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every
          + case when quick then town.quick_ms(p_plant, sown, t) else 0::double precision end) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then return t; end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$$;

-- Pick a ripe plant into the bag (v110's, with the mandrake's song: picked for what would be the last time by a
-- member the mandrake follows, with a song left to the day, the plant is not spent: it bears once more).
create or replace function town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
begin
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(mine->'bag', p->>'crop', n)));
end;
$$;

-- The hourglass turned over a bed (lib/town/farm's glassTurn). p_plots: every plot of the bed that is kept, by its
-- key; p_owner: whose the bed is now. Gives the purse with the day's turning counted, the plots it quickened as they
-- now are (each plant that lives remembers the turning), which those are, and until when the sand runs.
create or replace function town.glass_turn(p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('farming')->'gifted'->'glass';
  span numeric := (k->>'hours')::numeric * 3600000;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  live text[];
  used jsonb;
  key text;
  p jsonb;
  fast jsonb;
  next jsonb := '{}'::jsonb;
begin
  if not town.gift_works(p_purse, 'thingHourglass') then return town.no('none'); end if;
  if town.used_of(p_purse, 'thingHourglass', p_now) >= (town.cat('gifts')->'uses'->'thingHourglass'->>'n')::integer then return town.no('spent'); end if;
  if p_owner is distinct from p_me then return town.no('theirs'); end if;
  select coalesce(array_agg(e.key order by split_part(e.key, ',', 2)::int, split_part(e.key, ',', 1)::int), '{}'::text[]) into live
    from jsonb_each(plots) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (town.see(e.key, e.value, p_now)->>'dead')::boolean;
  -- (while the sand still runs over a plant of the bed it is not turned again)
  if exists (
    select 1 from unnest(live) as l(key_),
           jsonb_array_elements(case when jsonb_typeof(plots->l.key_->'plant'->'fast') = 'array' then plots->l.key_->'plant'->'fast' else '[]'::jsonb end) as f(at)
     where jsonb_typeof(f.at) = 'number' and (f.at #>> '{}')::numeric <= p_now and p_now < (f.at #>> '{}')::numeric + span) then return town.no('running'); end if;
  -- (it is turned for what is still on its way: a bed of plants that only wait to be picked has nothing to gain)
  if not exists (select 1 from unnest(live) as l(key_) where not (town.see(l.key_, plots->l.key_, p_now)->>'ripe')::boolean) then return town.no('soil'); end if;
  used := town.gift_use(p_purse, 'thingHourglass', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  foreach key in array live loop
    p := plots->key->'plant';
    -- (the turnings it remembers, this one last: the newest so many)
    select coalesce(jsonb_agg(q.at order by q.ord), '[]'::jsonb) into fast
      from (
        select t.at, t.ord
          from (select f.at, f.ord from jsonb_array_elements(case when jsonb_typeof(p->'fast') = 'array' then p->'fast' else '[]'::jsonb end) with ordinality as f(at, ord)
                 where jsonb_typeof(f.at) = 'number'
                union all select to_jsonb(p_now), 9223372036854775807) t
         order by t.ord desc limit (k->>'kept')::int
      ) q;
    next := next || jsonb_build_object(key, (plots->key) || jsonb_build_object('plant', p || jsonb_build_object('fast', fast)));
  end loop;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'plots', next, 'quickened', to_jsonb(live), 'until', p_now + span::bigint);
end;
$$;

-- Turn my hourglass over the bed I stand in. One at a time in a bed, as every deed there.
create or replace function public.town_hourglass(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  bed jsonb;
  owner text;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.glass_turn(bed, purse, me::text, now_, owner);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'hourglass', null, jsonb_array_length(did->'quickened'), 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n, 'until', did->'until'));
  for k in select jsonb_array_elements_text(did->'quickened') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  return town.answer(me, did);
end;
$$;
revoke execute on function public.town_hourglass(integer, integer) from public, anon;
grant execute on function public.town_hourglass(integer, integer) to authenticated;

-- The row of its bed a plot is in: the bed's plots that share its y, as their keys from one end to the other
-- (lib/town/world's rowOf); none, off the beds.
create or replace function town.row_keys(p_x integer, p_y integer)
returns jsonb language sql stable
as $$
  select coalesce((
    select jsonb_agg(((b.at->>0)::int + i)::text || ',' || p_y::text order by i)
      from (select town.cat('farming') as f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord), generate_series(0, (c.f->>'side')::int - 1) i
     where b.ord - 1 = town.bed_of(p_x, p_y)), '[]'::jsonb)
$$;

-- The seeds the pouch takes for so many plots of a row of p_side (lib/town/farm's pouchSeeds): its number for a
-- whole row, in that measure for fewer plots, never more than the plots. And how many plots so many seeds reach.
create or replace function town.pouch_seeds(p_plots integer, p_side integer)
returns integer language sql stable
as $$ select least(p_plots, ceil(p_plots::numeric * (town.cat('gifts')->'gifts'->'thingPouch'->>'by')::numeric / p_side)::integer) $$;
create or replace function town.pouch_plots(p_seeds integer, p_side integer)
returns integer language sql stable
as $$ select coalesce(max(m), 0)::integer from generate_series(1, p_side) m where town.pouch_seeds(m, p_side) <= p_seeds $$;

-- What a gift of the farming line would do to the row from the plot stood on, if anything (lib/town/farm's rowFor):
-- which work, and the plots it would do it to, the one stood on first and then outwards (of two as near, the one
-- further left). p_keys: the row's plots; p_plots: those of them that are kept (one that is not is weeds).
create or replace function town.row_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  x0 integer;
  deed text;
  row_ jsonb;
  hoes boolean;
  sows boolean;
  reaps boolean;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) then return null; end if;
  deed := town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner);
  if deed is null then return null; end if;
  hoes := deed in ('clear', 'till') and town.wearing(p_purse, 'charmHoe');
  sows := deed = 'sow' and town.gift_works(p_purse, 'thingPouch');
  -- (the sickle is for its wearer's own beds: not somebody else's, nor one that is nobody's)
  reaps := deed = 'pick' and p_owner is not distinct from p_me and town.wearing(p_purse, 'charmSickle');
  if not hoes and not sows and not reaps then return null; end if;
  x0 := split_part(p_at, ',', 1)::integer;
  -- (the pouch sows as many plots as the seeds in the bag reach, the nearest first)
  select jsonb_agg(q.key_ order by q.far, q.x) into row_
    from (
      select k.key_, abs(split_part(k.key_, ',', 1)::integer - x0) as far, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed
       order by far, x
       limit case when sows then town.pouch_plots(town.held(p_purse->'bag', hand), jsonb_array_length(p_keys)) end
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return null; end if;
  return jsonb_build_object('deed', deed, 'plots', row_);
end;
$$;

-- A row's deed, whole (lib/town/farm's rowTend). p_marks: how each plot's beat went, by its key (a plot it says
-- nothing of was not in the game, and is left). p_rest: how many plots of the bed outside this row have a plant;
-- p_holds: how many other beds are p_me's. Gives the purse, the plots that changed and the bed's keeping as they
-- are afterwards, and each plot done in the order it was done.
create or replace function town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
returns jsonb language plpgsql stable
as $$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', case when reaps then coalesce((select jsonb_agg(jsonb_build_array(q.crop, q.total) order by q.at)
          from (select t.e->>'crop' as crop, sum((t.e->>'n')::integer) as total, min(t.ord) as at from jsonb_array_elements(each) with ordinality as t(e, ord) group by 1) q), '[]'::jsonb)
        else '[]'::jsonb end)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$$;

-- The garden gnome sent down a bed (lib/town/farm's gnomeWater). p_plots: every plot of the bed that is kept, by its
-- key; p_owner: whose the bed is now. Gives the purse (which remembers the round and is otherwise as it was), the
-- plots it watered as they now are, and which those are, down the bed a row at a time.
create or replace function town.gnome_water(p_bed integer, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  rest double precision := case when town.gift_works(p_purse, 'famGnome') then (town.cat('gifts')->'gifts'->'famGnome'->>'by')::double precision * 60000 else 0 end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  rounds jsonb := case when jsonb_typeof(p_purse->'gnomed') = 'object' then p_purse->'gnomed' else '{}'::jsonb end;
  kept jsonb;
  keys text[];
  k text;
  p jsonb;
  next jsonb := '{}'::jsonb;
begin
  if not (rest > 0) then return town.no('none'); end if;
  if p_owner is distinct from p_me then return town.no('theirs'); end if;
  -- (a bed rests between two of its rounds, whatever has dried meanwhile)
  if jsonb_typeof(rounds->(p_bed::text)) = 'number' and p_now - (rounds->>(p_bed::text))::numeric < rest then return town.no('wet'); end if;
  select array_agg(e.key order by split_part(e.key, ',', 2)::int, split_part(e.key, ',', 1)::int) into keys
    from jsonb_each(plots) e where town.deed_for(e.key, e.value, 'can', '', p_now, null) = 'water';
  if keys is null then
    return town.no(case when exists (
      select 1 from jsonb_each(plots) e, lateral (select town.see(e.key, e.value, p_now) as s) z
       where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (z.s->>'dead')::boolean and (z.s->>'wet')::boolean) then 'wet' else 'soil' end);
  end if;
  foreach k in array keys loop
    p := plots->k->'plant';
    next := next || jsonb_build_object(k, (plots->k) || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + (f->'water'->>'adds')::double precision * 60000::double precision)));
  end loop;
  -- (only rounds that still count are kept)
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into kept
    from jsonb_each(rounds) e where jsonb_typeof(e.value) = 'number' and p_now - (e.value #>> '{}')::numeric < rest;
  return jsonb_build_object('ok', true, 'watered', to_jsonb(keys), 'plots', next,
    'purse', p_purse || jsonb_build_object('gnomed', kept || jsonb_build_object(p_bed::text, p_now)));
end;
$$;

-- Send the gnome that follows me down the bed I stand in. One at a time in a bed, as every deed there.
create or replace function public.town_gnome(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  bed jsonb;
  owner text;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.gnome_water(bed_n, bed, purse, me::text, now_, owner);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  -- (one line for the round: the gnome's water is nobody's and the plants its member's own, so the well's book and
  -- the lines of work have nothing to count of it, plant by plant)
  perform town.note(me, 'gnome', null, jsonb_array_length(did->'watered'), 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n));
  for k in select jsonb_array_elements_text(did->'watered') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  -- (the plots as they are kept: with what the heat and the well's water added, if they did)
  return town.answer(me, did - 'plots') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n and did->'watered' ? (p.x::text || ',' || p.y::text)));
end;
$$;
revoke execute on function public.town_gnome(integer, integer) from public, anon;
grant execute on function public.town_gnome(integer, integer) to authenticated;

-- A row at a time: what a gift of the farming line does to the whole row of the bed from the plot stood on, with
-- the thing in the hand. One deed, one at a time in a bed (as every deed there).
create or replace function public.town_row(p_x integer, p_y integer, p_marks jsonb default null, p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  end loop;
  if n > 0 then
    perform town.keep_purse(me, did->'purse');
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$$;
revoke execute on function public.town_row(integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.town_row(integer, integer, jsonb, jsonb) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
