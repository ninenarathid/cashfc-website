-- v153, the farming line's gifts (lib/town/farm.ts, under "the gifts of the farming line"; lib/town/gifts.ts has
-- each gift's own number). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
--   * The enchanted hoe (a charm, worn): a bed's row at a swing. `town_row(x, y, marks, timing)` is ONE deed: told
--     how each plot's beat went, it does each plot whose beat was hit as `town_tend` would have done it by itself
--     (`town.tend`, as it is), from the plot stood on outwards, and leaves each whose beat was missed. Each plot done
--     is written down as its own go at farming (`town_plays`, which the lines of work count), and the row whole as
--     one line of `town_deeds` (`row`).

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
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) then return null; end if;
  deed := town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner);
  if deed is null or not (deed in ('clear', 'till') and town.wearing(p_purse, 'charmHoe')) then return null; end if;
  x0 := split_part(p_at, ',', 1)::integer;
  select jsonb_agg(k.key_ order by abs(split_part(k.key_, ',', 1)::integer - x0), split_part(k.key_, ',', 1)::integer) into row_
    from jsonb_array_elements_text(p_keys) as k(key_)
   where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed;
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
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone)
    continue when marks->key is distinct from 'true'::jsonb;
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
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
  end loop;
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each, 'got', '[]'::jsonb)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end;
end;
$$;

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
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
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
