-- v153, the helpers' line's gifts (lib/town/helping.ts; lib/town/farm.ts under "the gifts of the helpers' line";
-- lib/town/gifts.ts has each gift's own number). Tried on top of v153.shared.sql and v153.farming.sql (try-line.mjs):
-- the helpers' line is work done in somebody else's bed, so it stands on the farm's rules as the farming line left
-- them. The file for supabase/ is put together from every line's.
--
--   * The gardener's gloves (a charm, worn): work for somebody else takes NO stamina (it took half: the catalog's
--     gifts row has the gloves' number, what is left to pay, at 0; `town.gloved` and `town.eased` are as they ran,
--     and a half left owing in a purse from before stays there, never asked for). And a row of somebody else's
--     plants is watered at one long pour: `town_longpour(x, y, marks, timing)` is ONE deed. Told which plants the
--     water reached (the page's game), it waters each of them as `town_tend` would have by itself (`town.tend`),
--     from the row's head, and leaves the rest. Each plant is written down as its own watering (`water`, with whose
--     plant it was: what the well's book, the thanks and the helpers' line read), and the pour whole as one line
--     (`longpour`).
--   * The garden fae anklet (a charm, worn): another's plant its wearer waters grows so many times as much from that
--     watering (its number), and more (`farming.helping.anklet.top`) from the twentieth of a run of them with no
--     more than eight seconds between two. The run is kept in the purse (`chime`); `town.tend` (v151's) is written
--     again to count it and to say how many times over the watering is (`times`, only where it is more than once:
--     nobody without the anklet gets an answer that differs). The plot `town.tend` answers with is as any watering
--     leaves it: whoever keeps it makes it the more (`town.poured_as`), with the heat and the well's water, never to
--     more than `farming.helping.most` times what the watering added where a gift has a hand in it. `town_tend`
--     (v145's) is written again to keep a watering so, and v133's trigger on `town_plots` (`town.plot_heat`) to
--     leave alone a watering that was reckoned already: the plant says so (`pour`: whose its last watering with a
--     can was, when, what it added before anything made it the more, and how many times over it was kept in all).
--     Every watering with a can leaves that mark now, whoever waters and with whatever gifts: growth by it is as it
--     always was for somebody with no gift.

-- Whether work on a plot is work for somebody else (lib/town/farm's theirsAt): in a bed that is another's, or on a
-- plant another sowed.
create or replace function town.theirs_at(p_plot jsonb, p_owner text, p_me text)
returns boolean language sql immutable
as $$
  select (p_owner is not null and p_owner <> p_me)
      or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and coalesce(p_plot->'plant'->>'by' <> p_me, false))
$$;

-- The run of waterings a purse keeps, as it stands at a moment (lib/town/helping's runOf): none, once the gap has
-- passed, or of what is kept wrongly.
create or replace function town.run_of(p_purse jsonb, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  k jsonb := p_purse->'chime';
begin
  if k is null or jsonb_typeof(k) <> 'object' or jsonb_typeof(k->'n') is distinct from 'number' or jsonb_typeof(k->'at') is distinct from 'number' then return 0; end if;
  if not ((k->>'n')::numeric >= 1) or p_now < (k->>'at')::numeric
     or p_now - (k->>'at')::numeric > (town.cat('farming')->'helping'->'anklet'->>'gap')::numeric * 1000 then return 0; end if;
  return floor((k->>'n')::numeric)::integer;
end;
$$;

-- A watering of somebody else's plant by whoever wears the anklet (lib/town/helping's chime): the purse with the run
-- one longer, and how many times over the watering is. Without the anklet: the purse as it is, and once.
create or replace function town.chime(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  a jsonb := town.cat('farming')->'helping'->'anklet';
  n integer;
begin
  if not town.wearing(p_purse, 'charmAnklet') then return jsonb_build_object('purse', p_purse, 'times', 1); end if;
  n := least(9999, town.run_of(p_purse, p_now) + 1);
  return jsonb_build_object('purse', p_purse || jsonb_build_object('chime', jsonb_build_object('n', n, 'at', p_now)),
    'times', case when n >= (a->>'run')::integer then a->'top' else town.cat('gifts')->'gifts'->'charmAnklet'->'by' end);
end;
$$;

-- A purse whose run is not the shorter for a long pour that was so many seconds in the pouring (lib/town/helping's
-- bridged): the run's last moment is put that much later, never past now. What the page says of its seconds is
-- believed up to the catalog's `long`.
create or replace function town.bridged(p_purse jsonb, p_secs double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := p_purse->'chime';
begin
  if not coalesce(p_secs > 0, false) or k is null or jsonb_typeof(k) <> 'object' or jsonb_typeof(k->'n') is distinct from 'number' or jsonb_typeof(k->'at') is distinct from 'number'
     or not town.wearing(p_purse, 'charmAnklet') then return p_purse; end if;
  return p_purse || jsonb_build_object('chime', jsonb_build_object('n', k->'n',
    'at', least(p_now::numeric, (k->>'at')::numeric + floor((least(p_secs, (town.cat('farming')->'helping'->'anklet'->>'long')::double precision) * 1000)::numeric))));
end;
$$;

-- Tend a plot (v151's, with the anklet: somebody else's plant watered by its wearer lengthens the run, and the
-- answer says how many times over the watering is).
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
  theirs boolean;
  rung jsonb;
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
  theirs := (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me);
  -- (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the watering so many times over)
  rung := jsonb_build_object('purse', case when theirs then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end, 'times', 1);
  if deed = 'water' and theirs then rung := town.chime(rung->'purse', p_now); end if;
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', rung->'purse',
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end
    || case when (rung->>'times')::numeric > 1 then jsonb_build_object('times', rung->'times') else '{}'::jsonb end;
end;
$$;

-- The plots the long pour of the gardener's gloves would water from the plot stood on (lib/town/farm's pourFor):
-- every plant of the row that is somebody else's and that the can in the hand could water now, from the row's head
-- as far as the water in the can reaches. None: there is no row to pour along.
create or replace function town.pour_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  reach integer;
  row_ jsonb;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) or not town.wearing(p_purse, 'charmGloves') then return '[]'::jsonb; end if;
  if not town.theirs_at(p_plots->p_at, p_owner, p_me)
     or town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner) is distinct from 'water' then return '[]'::jsonb; end if;
  -- (each plant takes a watering out of the can, as ever: but under the fountain's blessing, which spares the can)
  reach := case when town.has_buff(p_purse, p_now, 'spring') then jsonb_array_length(p_keys)
    else floor((select coalesce(sum(coalesce((s.v->>'water')::numeric, 0)), 0) from jsonb_array_elements(p_purse->'bag') as s(v) where s.v->>'item' = hand))::integer end;
  select jsonb_agg(q.key_ order by q.x) into row_
    from (
      select k.key_, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.theirs_at(p_plots->k.key_, p_owner, p_me)
         and town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = 'water'
       order by x
       limit greatest(0, reach)
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return '[]'::jsonb; end if;
  return row_;
end;
$$;

-- The long pour, whole (lib/town/farm's pourRow). p_marks: which plants the water reached, by their keys (a plot it
-- says nothing of is left). p_rest: how many plots of the bed outside this row have a plant; p_holds: how many other
-- beds are p_me's; p_secs: how long the pour took, as the page says. Gives the purse, the plots watered and the bed's
-- keeping as they are afterwards, and each plant watered in the order it was reached, with how many times over the
-- gifts of whoever poured make its watering.
create or replace function town.pour_row(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb, p_secs double precision default 0)
returns jsonb language plpgsql stable
as $$
declare
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  row_ jsonb;
  state jsonb := '{}'::jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb;
  key text;
  did jsonb;
  others integer;
begin
  if jsonb_typeof(p_keys) is distinct from 'array' then return town.no('none'); end if;
  row_ := town.pour_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if jsonb_array_length(row_) = 0 then return town.no('none'); end if;
  mine := town.bridged(p_purse, p_secs, p_now);
  for key in select t.key_ from jsonb_array_elements_text(row_) with ordinality as t(key_, ord) order by t.ord loop
    continue when marks->key is distinct from 'true'::jsonb;
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plots->key, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> 'water' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', plots->key->'plant'->'crop', 'times', coalesce(did->'times', '1'::jsonb)));
  end loop;
  return jsonb_build_object('ok', true, 'purse', mine, 'plots', state, 'each', each)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end;
end;
$$;

-- A plot as it is kept after a watering with a can (lib/town/helping's pouredAs), written at p_now over what it
-- was: what the watering added is made the more by the gifts of whoever watered (p_times) and by the heat and the
-- well's water (p_hot, p_kind), never to more than the catalog's `most` times where a gift has a hand in it; under
-- the moon's water the plant is kept from pests, as ever; and the plant remembers the watering (`pour`). What is no
-- watering is given back as it is.
create or replace function town.poured_as(p_was jsonb, p_next jsonb, p_now bigint, p_hot boolean, p_kind text, p_by text, p_times double precision default 1, p_worn boolean default false)
returns jsonb language plpgsql stable
as $$
declare
  a jsonb := coalesce(p_was->'plant', 'null'::jsonb);
  b jsonb := coalesce(p_next->'plant', 'null'::jsonb);
  k jsonb := town.cat('waters');
  base double precision;
  more double precision;
  x double precision;
  hours double precision;
begin
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' then return p_next; end if;
  if (a->'sown') is distinct from (b->'sown') or (b->>'watered')::numeric <> p_now or (a->>'watered')::numeric >= p_now then return p_next; end if;
  base := (b->>'boost')::double precision - (a->>'boost')::double precision;
  if not coalesce(base > 0, false) then return p_next; end if;
  more := (case when coalesce(p_hot, false) then (town.cat('heat')->>'by')::double precision else 0 end) + coalesce((k->'adds'->>p_kind)::double precision, 0);
  x := case when coalesce(p_times, 1) > 1
    then greatest(1 + more, least((town.cat('farming')->'helping'->>'most')::double precision, p_times * (1 + more))) else 1 + more end;
  hours := coalesce((k->'guards'->>p_kind)::double precision, 0);
  return p_next || jsonb_build_object('plant', b || jsonb_build_object(
    -- (with no gift in it the sum is the heat's own: what was added, and so much of it again)
    'boost', case when coalesce(p_times, 1) > 1 then to_jsonb((a->>'boost')::double precision + base * x)
                  when more <> 0 then to_jsonb((b->>'boost')::double precision + base * more) else b->'boost' end,
    'guard', case when hours > 0 then to_jsonb(greatest((b->>'guard')::bigint, p_now + (hours * 3600000)::bigint)) else b->'guard' end,
    'pour', jsonb_build_object('by', p_by, 'at', p_now, 'base', base, 'x', x) || case when coalesce(p_worn, false) then '{"worn": true}'::jsonb else '{}'::jsonb end));
end;
$$;

-- The nature the well's water has at a moment, if it has one (lib/town/waters): its word, for `town.poured_as`.
create or replace function town.well_kind(p_now bigint)
returns text language sql stable set search_path = public
as $$ select case when jsonb_typeof(w.doc) = 'object' then w.doc->>'kind' end from (select town.well_water_told(p_now) as doc) w $$;

-- The heat and the well's water, as a plot is kept (v133's trigger on town_plots). A watering that whoever watered
-- has reckoned already (v153: `town.poured_as`, the plant's `pour` is of this very moment) is left as it is; any
-- other (a bucket over a bed, the gnome's can) is made the more here, as it always was.
create or replace function town.plot_heat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  added double precision;
  more double precision := 0;
  w jsonb;
  k jsonb;
  hours double precision;
begin
  begin
    if new.plant is not null and old.plant is not null and jsonb_typeof(new.plant) = 'object' and jsonb_typeof(old.plant) = 'object'
       and (new.plant->>'sown') = (old.plant->>'sown')
       and (new.plant->>'watered')::bigint = new.changed and (old.plant->>'watered')::bigint < new.changed
       and (new.plant->'pour'->>'at') is distinct from new.changed::text then
      added := (new.plant->>'boost')::double precision - (old.plant->>'boost')::double precision;
      if added > 0 then
        if town.hot(new.changed) then more := more + (town.cat('heat')->>'by')::double precision; end if;
        w := town.well_water_told(new.changed);
        if jsonb_typeof(w) = 'object' then
          k := town.cat('waters');
          more := more + coalesce((k->'adds'->>(w->>'kind'))::double precision, 0);
          hours := coalesce((k->'guards'->>(w->>'kind'))::double precision, 0);
          if hours > 0 then
            new.plant := new.plant || jsonb_build_object('guard', greatest((new.plant->>'guard')::bigint, new.changed + (hours * 3600000)::bigint));
          end if;
        end if;
        if more > 0 then
          new.plant := new.plant || jsonb_build_object('boost', (new.plant->>'boost')::double precision + added * more);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'the heat and the well''s water missed plot %,%: %', new.x, new.y, sqlerrm;
  end;
  return new;
end;
$$;

-- Do to the plot I stand on what the thing in my hand does (v145's, with a watering kept as `town.poured_as` keeps
-- it: the gifts of whoever waters, the heat and the well's water in one sum under their bound, and the plant's own
-- mark of it).
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
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), false));
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
revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from public, anon;
grant execute on function public.town_tend(integer, integer, jsonb, boolean) to authenticated;

-- One long pour along the row of somebody else's bed I stand in, with the can in my hand. One deed, one at a time in
-- a bed (as every deed there).
create or replace function public.town_longpour(p_x integer, p_y integer, p_marks jsonb default null, p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  hand text := town.hand_of(purse);
  -- what the browser says of its game: which plants the water reached, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  was jsonb;
  v_x integer;
  v_y integer;
  hot boolean := town.hot(now_);
  kind text := town.well_kind(now_);
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
  did := town.pour_row(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks, coalesce((claims->>'secs')::double precision, 0));
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the pour, whole: how many plants it watered, and how the browser said its game went
  perform town.note(me, 'longpour', hand, n, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'marks', marks, 'claims', claims));
  -- and each plant watered, its own deed: written down as town_tend writes a watering, so that each is read as one
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    was := plots->(e->>'key')->'plant';
    perform town.note(me, 'water', e->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'row', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
    -- (kept with what my gifts, the heat and the well's water make of the watering, under their bound)
    update public.town_plots p
       set plant = town.poured_as(plots->(e->>'key'), did->'plots'->(e->>'key'), now_, hot, kind, me::text, (e->>'times')::double precision, false)->'plant', changed = now_
     where p.x = v_x and p.y = v_y;
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
  -- (the plots as they are kept: with what my gifts, the heat and the well's water made of each watering)
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)),
         'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                     from public.town_plots p where p.bed = bed_n and did->'plots' ? (p.x::text || ',' || p.y::text)));
end;
$$;
revoke execute on function public.town_longpour(integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.town_longpour(integer, integer, jsonb, jsonb) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
