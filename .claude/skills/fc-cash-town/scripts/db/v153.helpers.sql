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
--   * The duet bell (a charm, worn): two members watering in the same bed within ten seconds of each other
--     (`farming.helping.bell`), and both waterings count double: what each added is added once more (`town.ring`,
--     under the same bound), each of somebody else's plants is a watering's worth more on the helpers' line, and
--     each of the two has two stamina back a plant, of no more than so many plants a day (`town.belled`; kept in the
--     purse, `rung`). One bell is enough for the two: it rings when either wears it in a bed that is not their own;
--     the friend may be anybody else who waters there, the bed's owner too. It is judged for both purses in the one
--     call of whoever waters second (`town.bell_rung`, from `town_tend` and `town_longpour`): the friend's plants,
--     purse and points are written there, and both are told (`aided`, in each one's own purse) and written down
--     (`bell`, a line of the deeds each). So that two who ring at once never wait on each other, the purses of
--     whoever watered in the bed within the ten seconds are held with the caller's own, in the order of their ids,
--     BEFORE the bed is: `town_tend` no longer holds its caller's purse as it is declared. `town.work_counts_of`
--     (v149's) is written again to count a `bell`.
--   * The ring of shared strength (a charm, worn): `town_ring(to, far)` gives a friend standing near thirty stamina
--     (its number) and takes half of that from its wearer (`farming.helping.ring.part`), three times a day (the
--     catalog's count). Never above the friend's full gauge: what would be over is not given and not paid for.
--     Refused to a wearer who has not what it costs, to a friend who is not of the town or not near (how near is the
--     page's to say, `far`: the database knows where nobody stands, and holds to what it is told), or whose gauge is
--     full. Both purses are held in the order of their ids and judged in the one call; the friend is told (`aided`);
--     written down for both (`ring`, `ring_had`).

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

-- The duet bell, as a bed is kept after a watering (lib/town/helping's ring). p_bed: every plot of the bed as it
-- now is, the plots just watered among them; p_watered: the plots p_me watered at this moment; p_wears: whether p_me
-- wears the bell in a bed that is not their own; p_may: the friends whose purses are held (null: everybody). Gives
-- the plots it made the more as they now are, which of them are p_me's own waterings, each friend's that it doubled
-- now by who they are, and every friend it rang with (`near`); or null, when no bell rings.
create or replace function town.ring(p_bed jsonb, p_watered jsonb, p_me text, p_wears boolean, p_now bigint, p_may jsonb default null)
returns jsonb language plpgsql stable
as $$
declare
  h jsonb := town.cat('farming')->'helping';
  within numeric := (h->'bell'->>'within')::numeric * 1000;
  twice double precision := (town.cat('gifts')->'gifts'->'charmBell'->>'by')::double precision;
  most double precision := (h->>'most')::double precision;
  bed jsonb := case when jsonb_typeof(p_bed) = 'object' then p_bed else '{}'::jsonb end;
  fresh jsonb;
  mine text[];
  theirs text[];
  plots jsonb := '{}'::jsonb;
  pals jsonb := '{}'::jsonb;
  k text;
  p jsonb;
  m jsonb;
  x double precision;
begin
  -- every plant of the bed watered with a can within the ten seconds: its plot, and what it remembers of the watering
  select coalesce(jsonb_object_agg(q.key, q.pour), '{}'::jsonb) into fresh
    from (
      select e.key, e.value->'plant'->'pour' as pour,
             case when jsonb_typeof(e.value->'plant'->'pour'->'at') = 'number' then (e.value->'plant'->'pour'->>'at')::numeric end as at
        from jsonb_each(bed) e
       where jsonb_typeof(e.value->'plant'->'pour') = 'object' and (e.value->'plant'->'pour'->'at') = (e.value->'plant'->'watered')
    ) q
   where p_now >= q.at and p_now - q.at <= within;
  select array_agg(w.key_ order by split_part(w.key_, ',', 1)::int, split_part(w.key_, ',', 2)::int) into mine
    from jsonb_array_elements_text(case when jsonb_typeof(p_watered) = 'array' then p_watered else '[]'::jsonb end) as w(key_)
   where fresh ? w.key_ and fresh->w.key_->>'by' = p_me and (fresh->w.key_->'bell') is distinct from 'true'::jsonb;
  if mine is null then return null; end if;
  select array_agg(e.key order by split_part(e.key, ',', 1)::int, split_part(e.key, ',', 2)::int) into theirs
    from jsonb_each(fresh) e
   where e.value->>'by' <> p_me and (p_may is null or jsonb_typeof(p_may) <> 'array' or p_may ? (e.value->>'by'));
  if theirs is null or not (coalesce(p_wears, false) or exists (select 1 from unnest(theirs) as t(key_) where fresh->t.key_->'worn' = 'true'::jsonb)) then return null; end if;
  foreach k in array mine || theirs loop
    m := fresh->k;
    -- (a friend's watering a bell has rung for already is not doubled again: it only says that the friend is there)
    continue when m->>'by' <> p_me and m->'bell' = 'true'::jsonb;
    p := bed->k->'plant';
    x := greatest((m->>'x')::double precision, least(most, (m->>'x')::double precision * twice));
    plots := plots || jsonb_build_object(k, (bed->k) || jsonb_build_object('plant', p || jsonb_build_object(
      'boost', (p->>'boost')::double precision + (m->>'base')::double precision * (x - (m->>'x')::double precision),
      'pour', m || jsonb_build_object('x', x, 'bell', true))));
    if m->>'by' <> p_me then pals := pals || jsonb_build_object(m->>'by', coalesce(pals->(m->>'by'), '[]'::jsonb) || to_jsonb(k)); end if;
  end loop;
  return jsonb_build_object('plots', plots, 'mine', to_jsonb(mine), 'pals', pals,
    'near', (select coalesce(jsonb_agg(q.by_ order by q.by_ collate "C"), '[]'::jsonb) from (select distinct fresh->t.key_->>'by' as by_ from unnest(theirs) as t(key_)) q));
end;
$$;

-- What the bell gives back to somebody for so many of their plants it rang over (lib/town/helping's belled): so much
-- stamina a plant, never above the full gauge, and of no more plants in a day than the catalog's bound. Gives the
-- purse, and how much it had back.
create or replace function town.belled(p_purse jsonb, p_plants double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  b jsonb := town.cat('farming')->'helping'->'bell';
  day_ integer := town.day_of(p_now);
  k jsonb := p_purse->'rung';
  had double precision := 0;
  n double precision;
  left_ double precision := town.stamina_of(p_purse, p_now);
  back double precision;
begin
  if k is not null and jsonb_typeof(k) = 'object' and jsonb_typeof(k->'day') = 'number' and jsonb_typeof(k->'n') = 'number' then
    if (k->>'day')::numeric = day_ and (k->>'n')::numeric > 0 then had := floor((k->>'n')::double precision); end if;
  end if;
  n := greatest(0, least(floor(coalesce(p_plants, 0)), (b->>'plants')::double precision - had));
  back := least(n * (b->>'back')::double precision, greatest(0, (town.cat('stamina')->>'max')::double precision - left_));
  if not coalesce(back > 0, false) then return jsonb_build_object('purse', p_purse, 'back', 0); end if;
  return jsonb_build_object('back', back, 'purse', p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', day_, 'left', left_ + back),
    'rung', jsonb_build_object('day', day_, 'n', had + ceil(back / (b->>'back')::double precision))));
end;
$$;

-- A purse told of one more thing a friend's gift did for its member (lib/town/helping's aided): the newest so many
-- are kept, for the page to tell of once.
create or replace function town.aided(p_purse jsonb, p_aid jsonb)
returns jsonb language sql stable
as $$
  select p_purse || jsonb_build_object('aided', (
    select coalesce(jsonb_agg(q.a order by q.ord), '[]'::jsonb)
      from (
        select t.a, t.ord
          from (select e.a, e.ord from jsonb_array_elements(case when jsonb_typeof(p_purse->'aided') = 'array' then p_purse->'aided' else '[]'::jsonb end) with ordinality as e(a, ord)
                 where jsonb_typeof(e.a) = 'object' and jsonb_typeof(e.a->'at') = 'number'
                union all select p_aid, 9223372036854775807) t
         order by t.ord desc limit (town.cat('farming')->'helping'->>'told')::int
      ) q))
$$;

-- Whoever else watered a plant of a bed with a can within the bell's seconds: the friends a watering there now may
-- ring with. Read before the bed is held: their purses are held first.
create or replace function town.bell_pals(p_bed integer, p_me uuid, p_now bigint)
returns uuid[] language sql stable set search_path = public
as $$
  select coalesce(array_agg(distinct q.by_::uuid), '{}'::uuid[])
    from (
      select p.plant->'pour'->>'by' as by_
        from public.town_plots p
       where p.bed = p_bed and jsonb_typeof(p.plant->'pour') = 'object'
         and case when jsonb_typeof(p.plant->'pour'->'at') = 'number' then (p.plant->'pour'->>'at')::numeric end
               >= p_now - (town.cat('farming')->'helping'->'bell'->>'within')::numeric * 1000
    ) q
   where q.by_ ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and q.by_ <> p_me::text
$$;

-- The duet bell after a watering of p_me's in a bed, kept: p_mine is the plots just watered, by their keys, as
-- `town.poured_as` kept them (not written yet); p_purse the purse as the watering left it; p_pals the friends whose
-- purses are held. When it rings: the friends' plants are written as they now are, each friend's purse has its
-- stamina back and is told, both are written down (`bell`: for how many of somebody else's plants, which the
-- helpers' line counts), and what is the caller's to keep is given back: its own plots as they now are, its purse,
-- and what to answer (`bell`: with whom, how many plants, how much stamina back). Null: no bell rang.
create or replace function town.bell_rung(p_me uuid, p_bed integer, p_mine jsonb, p_purse jsonb, p_wears boolean, p_pals uuid[], p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  bed jsonb;
  rang jsonb;
  mine jsonb;
  theirs jsonb;
  pal record;
  k text;
  mates jsonb;
  called text;
begin
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into bed
    from public.town_plots p where p.bed = p_bed;
  rang := town.ring(bed || p_mine, (select coalesce(jsonb_agg(e.key), '[]'::jsonb) from jsonb_each(p_mine) e), p_me::text, p_wears, p_now,
    (select coalesce(jsonb_agg(u.id::text), '[]'::jsonb) from unnest(p_pals) as u(id)));
  if rang is null then return null; end if;
  mates := rang->'near';
  mine := town.belled(p_purse, jsonb_array_length(rang->'mine'), p_now);
  select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') into called from public.profiles pr where pr.id = p_me;
  for pal in select e.key::uuid as id, e.value as keys from jsonb_each(rang->'pals') e order by e.key loop
    for k in select jsonb_array_elements_text(pal.keys) loop
      update public.town_plots p set plant = rang->'plots'->k->'plant', changed = p_now
       where p.x = split_part(k, ',', 1)::integer and p.y = split_part(k, ',', 2)::integer;
    end loop;
    theirs := town.belled(town.purse_of(pal.id, true), jsonb_array_length(pal.keys), p_now);
    perform town.keep_purse(pal.id, town.aided(theirs->'purse', jsonb_build_object('what', 'bell', 'by', p_me::text, 'name', coalesce(called, ''),
      'n', jsonb_array_length(pal.keys), 'at', p_now, 'back', theirs->'back')));
    perform town.note(pal.id, 'bell', null,
      (select count(*) from jsonb_array_elements_text(pal.keys) as t(key_) where bed->t.key_->'plant'->>'by' <> pal.id::text), 0,
      jsonb_build_object('bed', p_bed, 'with', jsonb_build_array(p_me::text), 'plants', jsonb_array_length(pal.keys), 'back', theirs->'back'));
  end loop;
  perform town.note(p_me, 'bell', null,
    (select count(*) from jsonb_array_elements_text(rang->'mine') as t(key_) where (bed || p_mine)->t.key_->'plant'->>'by' <> p_me::text), 0,
    jsonb_build_object('bed', p_bed, 'with', mates, 'plants', jsonb_array_length(rang->'mine'), 'back', mine->'back'));
  return jsonb_build_object(
    'plots', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(rang->'plots') e where p_mine ? e.key),
    'purse', town.aided(mine->'purse', jsonb_build_object('what', 'bell', 'by', mates->>0,
      'name', coalesce((select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') from public.profiles pr where pr.id::text = mates->>0), ''),
      'n', jsonb_array_length(rang->'mine'), 'at', p_now, 'back', mine->'back')),
    'bell', jsonb_build_object('with', mates, 'plants', jsonb_array_length(rang->'mine'), 'back', mine->'back'));
end;
$$;

-- What something done counts for, on every line it counts on (v149's, with a duet bell that rang: each of somebody
-- else's plants it rang over for whoever it is written down for is a watering's worth more on the helpers' line).
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
returns jsonb language plpgsql stable
as $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  return '[]'::jsonb;
end;
$$;

-- Do to the plot I stand on what the thing in my hand does (v145's, with a watering kept as `town.poured_as` keeps
-- it: the gifts of whoever waters, the heat and the well's water in one sum under their bound, and the plant's own
-- mark of it; and with the duet bell: the purses of whoever watered in the bed within its seconds are held with the
-- caller's, in the order of their ids, before the bed is, and a watering is rung with theirs).
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null, p_sure boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
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
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
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
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
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
  purse jsonb;
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  hand text;
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
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  kept jsonb := '{}'::jsonb;
  after jsonb;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  hand := town.hand_of(purse);
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
  wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
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
    kept := kept || jsonb_build_object(e->>'key', town.poured_as(plots->(e->>'key'), did->'plots'->(e->>'key'), now_, hot, kind, me::text, (e->>'times')::double precision, wears));
  end loop;
  after := did->'purse';
  if n > 0 then
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, kept, after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      kept := kept || (rang->'plots');
    end if;
    for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
      update public.town_plots p set plant = kept->(e->>'key')->'plant', changed = now_
       where p.x = split_part(e->>'key', ',', 1)::integer and p.y = split_part(e->>'key', ',', 2)::integer;
    end loop;
    perform town.keep_purse(me, after);
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
    || case when rang is not null then jsonb_build_object('bell', rang->'bell') else '{}'::jsonb end
    || jsonb_build_object('key', key, 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)),
         'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                     from public.town_plots p where p.bed = bed_n and did->'plots' ? (p.x::text || ',' || p.y::text)));
end;
$$;
revoke execute on function public.town_longpour(integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.town_longpour(integer, integer, jsonb, jsonb) to authenticated;

-- The ring of shared strength (lib/town/helping's share): p_mine gives p_theirs so much stamina (the ring's number,
-- or what their gauge has room for, if that is less) and pays a part of what was given. p_far: how many tiles off
-- the friend stands, as the page says (nothing that keeps the game knows where anybody stands). Gives both purses
-- (the wearer's with the day's use counted, the friend's told who gave it), what was given and paid, and how many
-- uses the day has left; or why not.
create or replace function town.share(p_mine jsonb, p_theirs jsonb, p_me text, p_name text, p_far double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  r jsonb := town.cat('farming')->'helping'->'ring';
  day_ integer := town.day_of(p_now);
  has double precision;
  gave double precision;
  paid double precision;
  left_ double precision;
  used jsonb;
begin
  if not town.gift_works(p_mine, 'charmRing') then return town.no('none'); end if;
  if town.used_of(p_mine, 'charmRing', p_now) >= (town.cat('gifts')->'uses'->'charmRing'->>'n')::integer then return town.no('spent'); end if;
  if not coalesce(p_far >= 0 and p_far <= (r->>'reach')::double precision, false) then return town.no('far'); end if;
  has := town.stamina_of(p_theirs, p_now);
  gave := least((town.cat('gifts')->'gifts'->'charmRing'->>'by')::double precision, (town.cat('stamina')->>'max')::double precision - has);
  if not coalesce(gave > 0, false) then return town.no('full'); end if;
  paid := gave * (r->>'part')::double precision;
  left_ := town.stamina_of(p_mine, p_now);
  if left_ < paid then return town.no('weak'); end if;
  used := town.gift_use(p_mine, 'charmRing', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  return jsonb_build_object('ok', true, 'gave', gave, 'paid', paid, 'left', used->'left',
    'mine', (used->'purse') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_ - paid)),
    'theirs', town.aided(p_theirs || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', has + gave)),
      jsonb_build_object('what', 'ring', 'by', p_me, 'name', p_name, 'n', gave, 'at', p_now)));
end;
$$;

-- Give somebody standing near stamina of mine, with the ring I wear. Judged for both purses in the one call, and
-- written down for both (`ring`, mine; `ring_had`, theirs).
create or replace function public.town_ring(p_to uuid, p_far double precision default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
  called text;
begin
  -- (somebody who is of the town and has a purse there: a proved character, or an admin)
  if p_to is null or p_to = me or not exists (
       select 1 from public.town_purses pp join public.profiles p on p.id = pp.member_id
        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who give to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') into called from public.profiles pr where pr.id = me;
  did := town.share(mine, theirs, me::text, coalesce(called, ''), p_far, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'mine');
    perform town.keep_purse(p_to, did->'theirs');
    perform town.note(me, 'ring', null, (did->>'gave')::numeric, 0, jsonb_build_object('to', p_to, 'paid', did->'paid', 'far', p_far));
    perform town.note(p_to, 'ring_had', null, (did->>'gave')::numeric, 0, jsonb_build_object('by', me));
  end if;
  return town.answer(me, did - 'mine' - 'theirs');
end;
$$;
revoke execute on function public.town_ring(uuid, double precision) from public, anon;
grant execute on function public.town_ring(uuid, double precision) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
