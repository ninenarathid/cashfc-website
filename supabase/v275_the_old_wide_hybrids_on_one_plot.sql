-- v275: the hybrids sown over several plots before v269 made one-plot plants now (2026-10-17).
-- Run after v274. Safe to run twice (the second finds none). No site code is needed before it (the page that draws
-- them small and moves one-plot plants is live; lib/town/farm's yieldOf reads `oldPlots`, pushed with this file).
--
-- The owner, asked whether the old ones should be made one-plot too: "แก้ให้หมดเลย". Each hybrid (and fig) still
-- standing on several plots, not a giant:
--   * its other plots are free tilled soil at once;
--   * it stands on its root plot alone (`footprint` its own key), and keeps `oldPlots`, how many it stood on, so that
--     what a picking gives is as it was (town.yield_of times `oldPlots`, as it was times its footprint) until it is done;
--   * the enchanted hoe may move it as any one-plot plant;
--   * its bed's companion gifts are worked out with the new layout, as town.quality_keep does at a change of the bed:
--     each plant's round so far settled with what it had, its gift from now on the new one.
-- Each bed is taken under its advisory lock, as a tend takes it.
begin;
set local statement_timeout='60s';
set local lock_timeout='10s';
do $$ begin
 if to_regprocedure('town.stow_harvest(jsonb,text,jsonb)') is null then raise exception 'Run v274 before v275'; end if;
-- <guards:v275>
 if md5(replace(pg_get_functiondef('town.yield_of(text,jsonb,text)'::regprocedure),chr(13),'')) not in ('900a9b5ba4aa6f908f5ad3eb577dda0b','aa5025962d31db5e0448ac955c066b18') then raise exception 'Definition changed: town.yield_of(text,jsonb,text); rebuild v275'; end if;
-- </guards:v275>
end $$;

-- What a picking gives (lib/town/farm's yieldOf): times the plots a plant stood on, `oldPlots` once it was made one-plot
CREATE OR REPLACE FUNCTION town.yield_of(p_key text, p_plant jsonb, p_hand text)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  -- v273: rolled by the plot it was sown at, should the enchanted hoe have moved it (town.home_of)
  select (((c.crop->'yield'->>0)::int
    + floor(town.roll(town.home_of(p_key, p_plant), (p_plant->>'sown')::bigint, (p_plant->>'picked')::bigint)
        * ((c.crop->'yield'->>1)::int - (c.crop->'yield'->>0)::int + 1)::double precision)::int)
    -- v269: a plant sown over several plots before they became one-plot plants gives for each of them (a giant is
    -- counted where it is picked); v275: `oldPlots` once it stands on one
    * case when p_plant->'giant' is distinct from 'true'::jsonb
        then greatest(1, coalesce((p_plant->>'oldPlots')::int, case when jsonb_typeof(p_plant->'footprint') = 'array' then jsonb_array_length(p_plant->'footprint') end, 1)) else 1 end
    + case when p_hand is not null
            and p_hand = c.f->'blades'->>(case when (c.crop->>'picks')::int >= (c.f->>'tree')::int then 'tree' else 'plant' end) then 1 else 0 end)::integer
    from (select town.cat('crops')->(p_plant->>'crop') as crop, town.cat('farming') as f) c
$function$;
-- (the function written over keeps the grants it had)

do $$
declare
  beds_ integer[];
  b integer;
  r record;
  o record;
  now_ bigint := town.now_ms();
  plots_ jsonb;
  gift jsonb;
  q jsonb;
  okey text;
begin
  select coalesce(array_agg(distinct t.bed order by t.bed), '{}') into beds_ from public.town_plots t
   where jsonb_typeof(t.plant) = 'object' and t.plant->'giant' is distinct from 'true'::jsonb
     and jsonb_typeof(t.plant->'footprint') = 'array' and jsonb_array_length(t.plant->'footprint') > 1
     and t.plant->>'root' = t.x::text || ',' || t.y::text;
  -- each bed under its lock, as a tend takes it (in one order, so that no two wait on each other)
  foreach b in array beds_ loop perform pg_advisory_xact_lock(hashtext('town.bed'), b); end loop;
  for r in select t.x, t.y, t.bed, t.plant from public.town_plots t
     where jsonb_typeof(t.plant) = 'object' and t.plant->'giant' is distinct from 'true'::jsonb
       and jsonb_typeof(t.plant->'footprint') = 'array' and jsonb_array_length(t.plant->'footprint') > 1
       and t.plant->>'root' = t.x::text || ',' || t.y::text
     order by t.bed, t.x, t.y loop
    -- its other plots: free tilled soil (only those that are its own)
    update public.town_plots p set plant = null, soil = 'tilled', changed = now_
     where p.bed = r.bed and not (p.x = r.x and p.y = r.y) and (r.plant->'footprint') ? (p.x::text || ',' || p.y::text)
       and p.plant->>'root' = r.x::text || ',' || r.y::text;
    -- itself on its root alone, with the plots it gives for
    update public.town_plots p set plant = r.plant || jsonb_build_object('footprint', jsonb_build_array(r.x::text || ',' || r.y::text),
        'oldPlots', jsonb_array_length(r.plant->'footprint')), changed = now_
     where p.x = r.x and p.y = r.y;
  end loop;
  -- each bed's gifts with its new layout, as town.quality_keep works them out at a change of the bed
  foreach b in array beds_ loop
    select coalesce(jsonb_object_agg(t.x::text || ',' || t.y::text, jsonb_build_object('soil', t.soil, 'plant', t.plant)
        || case when t.house is not null then jsonb_build_object('house', t.house) else '{}'::jsonb end), '{}'::jsonb)
      into plots_ from public.town_plots t where t.bed = b;
    for o in select t.x, t.y, t.plant from public.town_plots t
       where t.bed = b and t.plant is not null and t.plant <> 'null'::jsonb
         and (t.plant->>'root' is null or t.plant->>'root' = t.x::text || ',' || t.y::text)
       order by t.x, t.y loop
      okey := o.x::text || ',' || o.y::text;
      gift := town.quality_bed_gift(okey, plots_);
      continue when gift is not distinct from case when jsonb_typeof(o.plant->'q'->'bed') = 'object' then o.plant->'q'->'bed' end;
      q := town.quality_settled(o.plant, now_) - 'bed';
      update public.town_plots set plant = plant || jsonb_build_object('q', q || case when gift is null then '{}'::jsonb else jsonb_build_object('bed', gift) end)
       where x = o.x and y = o.y;
    end loop;
  end loop;
  raise notice 'v275: % beds, plants made one-plot', coalesce(array_length(beds_, 1), 0);
end $$;

commit;

-- What it should say afterwards:
--   select count(*) from public.town_plots t where jsonb_typeof(t.plant) = 'object' and t.plant->'giant' is distinct from 'true'::jsonb
--      and jsonb_array_length(coalesce(t.plant->'footprint', '[]'::jsonb)) > 1;                       -- 0
--   select count(*) from public.town_plots where plant ? 'oldPlots';                                     -- the plants made one-plot (44 on 2026-10-17)
