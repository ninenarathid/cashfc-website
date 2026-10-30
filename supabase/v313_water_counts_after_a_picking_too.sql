-- v313 — water counts after a picking too, a dark can that is felt, a fire that spreads
-- Run this once in the Supabase SQL editor, after v312 and after the page that goes with it is live. Running it again is safe.
--
-- A member showed the owner (2026-10-30) a dark gem in a watering can apparently doing nothing: garlic went from 72% to
-- 73% with it and without it. It was working: +7 added 40.5 minutes where a plain can adds 30, on a crop of 60 hours,
-- and the panel floored the percent. Looking for the same in the other tools found two states that really gave nothing.
-- The owner's words: of a watering in a plant's later rounds "ควรเร่งโตด้วย"; of the fire hoe "แก้เลย"; of the panel's
-- decimal "ได้เลย"; of the gem "มันเป้นของหายาก เพิ่มมาแค่ 0.x คนเล่นอาจจะ เสียใจ".
--
-- 1. A plant in a later round waited by the clock and the hourglass alone, so a watering, the gnome, the bell, rain and
--    a dark gem all did nothing there (41 of the 62 crops bear again). It now counts what has been added to `boost`
--    since its last picking, and rain since then at the watering's rate, as a first round does. Rain counts because a
--    plant cannot be watered while it rains: without it a wet hour would be slower than a dry one. Fertiliser stays out
--    of it. What it counts is never more than twice the time since the picking, so the owner's cap for a tool
--    ("มากสุดแค่ x3 พอ") holds however powers pile up: what is over is not lost, the plant has it as the hours go by. A
--    picking keeps `boostAt`, the boost as it stood. A plant in a later round today is given a `boostAt` with the rain
--    it has had since its picking in it as well, so nothing jumps forward and it gains only from what comes from now on.
-- 2. The catalog's dark can: a watering is 75, 82.5 or 90 minutes (a gem at +7, at +10, a matching pair at +10) in the
--    place of 40.5, 46.5 or 52.5, the pair being 3 times a plain can's, the cap again. It uses one watering of the can,
--    as any can does. On garlic, 60 hours, what the gem adds to a watering goes from 0.29 of a percent to 1.25, 1.46, 1.67.
-- 3. A plot wants 3 hits, so fire at +7 already brings it to 1, and +10 or a pair gave nothing more. From +10 the fire
--    now also spreads: 15% (a pair 25%) that the nearest plot of the row that wants the same deed has it too, by the very
--    rule lightning uses (town.beside reads `next`), free of stamina and of a game. +7 is as it was.
--
-- Written as patches of each function's live text, exact once, or nothing is done. The page's twins: lib/town/farm's
-- regrowMs, growing and pick; lib/town/quality-plant's progressOf; lib/town/forged's OLD_FX and hoeFx.
begin;
set local statement_timeout='60s';set local lock_timeout='5s';
do $guard$ begin
  if to_regprocedure('town.growing(jsonb,bigint)') is null or to_regprocedure('town.quality_progress(jsonb,bigint)') is null
     or to_regprocedure('town.pest_at(text,jsonb,bigint)') is null or to_regprocedure('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)') is null
     or to_regprocedure('town.hoe_fx(jsonb)') is null or to_regprocedure('town.wet_ms(bigint,bigint)') is null
    then raise exception 'v313: run the farm''s migrations first'; end if;
end $guard$;

-- ── 1. What water has added to a plant since its last picking, in milliseconds (lib/town/farm's regrowMs) ──
-- (first what rain has added since the picking, as town.grown counts rain)
create or replace function town.regrow_rain_ms(p_plant jsonb, p_now bigint)
returns double precision language sql stable set search_path='' as $$
 select (case when p_plant->'moist'='true'::jsonb then greatest(0,p_now-k.since)::double precision
     else (town.wet_ms(k.since,p_now)
       +case when p_plant->'localRain' is null then 0
         else greatest(0,l.b-l.a-town.wet_ms(l.a,l.b)) end)::double precision end)
    *(w.f->>'adds')::double precision/(w.f->>'every')::double precision
 from (select (p_plant->>'pickedAt')::bigint since) k
 cross join lateral (select greatest(k.since,(p_plant->'localRain'->>'from')::bigint) a,least(p_now,(p_plant->'localRain'->>'until')::bigint) b) l
 cross join (select town.cat('farming')->'water' f) w
$$;
create or replace function town.regrow_ms(p_plant jsonb, p_now bigint)
returns double precision language sql stable set search_path='' as $$
 select case when coalesce((p_plant->>'picked')::integer,0)<=0 or jsonb_typeof(p_plant->'boostAt') is distinct from 'number' then 0::double precision
  else least(((town.cat('forge')->'forge'->>'cap')::double precision-1::double precision)*greatest(0,p_now-(p_plant->>'pickedAt')::bigint)::double precision,
   greatest(0::double precision,(p_plant->>'boost')::double precision-(p_plant->>'boostAt')::double precision+town.regrow_rain_ms(p_plant,p_now))) end
$$;
revoke all on function town.regrow_rain_ms(jsonb,bigint), town.regrow_ms(jsonb,bigint) from public, anon, authenticated;

-- ── 2. The wait, the Quality round, the pests' "a ripe plant is safe", the picking and the hoe: their live text, but for these ──
do $$
declare c text[]; d text; n integer; o text; nw text;
begin
  foreach c slice 1 in array array[
    ['town.growing(jsonb,bigint)',
     'then town.quick_ms(p_plant, (p_plant->>''pickedAt'')::bigint, p_now) else 0::double precision end) / 3600000::double precision as since',
     'then town.quick_ms(p_plant, (p_plant->>''pickedAt'')::bigint, p_now) + town.regrow_ms(p_plant, p_now) else 0::double precision end) / 3600000::double precision as since'],
    ['town.quality_progress(jsonb,bigint)',
     'else (p_t-(p_plant->>''pickedAt'')::bigint+town.quick_ms(p_plant,(p_plant->>''pickedAt'')::bigint,p_t))::double precision/3600000::double precision',
     'else (p_t-(p_plant->>''pickedAt'')::bigint+town.quick_ms(p_plant,(p_plant->>''pickedAt'')::bigint,p_t)+town.regrow_ms(p_plant,p_t))::double precision/3600000::double precision'],
    ['town.pest_at(text,jsonb,bigint)',
     'when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore',
     'when picked >= picks then ((t - picked_at)::double precision + town.regrow_ms(p_plant, t)
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore'],
    ['town.pest_at(text,jsonb,bigint)',
     'when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again',
     'when picked > 0 then again is not null and ((t - picked_at)::double precision + town.regrow_ms(p_plant, t)
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again'],
    ['town.pick(text,jsonb,jsonb,boolean,text,bigint,text)',
     'jsonb_build_object(''picked'', picked, ''pickedAt'', p_now, ''watered'', 0)',
     'jsonb_build_object(''picked'', picked, ''pickedAt'', p_now, ''watered'', 0, ''boostAt'', p->''boost'')'],
    ['town.hoe_fx(jsonb)',
     '''next'', town.fx_gem(m, ''lightning'', o->''lightning''->''chance''),',
     '''next'', case when town.fx_gem(m, ''fire'', o->''fire''->''hoe''->''spread'') > 0 then 1::double precision - (1::double precision - town.fx_gem(m, ''lightning'', o->''lightning''->''chance'')) * (1::double precision - town.fx_gem(m, ''fire'', o->''fire''->''hoe''->''spread'')) else town.fx_gem(m, ''lightning'', o->''lightning''->''chance'') end,']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (the file may come with CR at its line ends: the texts compared without them)
    o := replace(c[2], chr(13), ''); nw := replace(c[3], chr(13), '');
    -- (made already, on a run before)
    continue when position(nw in d) > 0;
    n := (length(d) - length(replace(d, o, ''))) / length(o);
    if n = 1 then execute replace(d, o, nw);
    else raise exception 'v313: % has % of [%], not 1: rebuild v313', c[1], n, left(c[2], 60); end if;
  end loop;
end $$;

-- ── 3. The numbers: only these two entries of the row ──
update public.town_catalog set data=jsonb_set(jsonb_set(data,'{old,dark,can,more}','[1.5,1.75,2,2]'::jsonb,true),'{old,fire,hoe,spread}','[0,0.15,0.25,0.35]'::jsonb,true),updated_at=now()
 where key='forge' and (data#>'{old,dark,can,more}' is distinct from '[1.5,1.75,2,2]'::jsonb or data#>'{old,fire,hoe,spread}' is distinct from '[0,0.15,0.25,0.35]'::jsonb);

-- ── 4. A plant in a later round today begins counting from now: its `boostAt` holds the rain it has had since its picking as well.
-- `changed` stays, so town_quality_keep settles no further than it has, by the rules as they were for it (it has no `boostAt` then) ──
update public.town_plots set plant=plant||jsonb_build_object('boostAt',(plant->>'boost')::double precision+town.regrow_rain_ms(plant,town.now_ms()))
 where plant is not null and plant<>'null'::jsonb and coalesce((plant->>'picked')::integer,0)>0 and not plant?'boostAt';

notify pgrst, 'reload schema';
commit;

-- What it should say afterwards (read only):
--   select position('regrow_ms' in pg_get_functiondef('town.growing(jsonb,bigint)'::regprocedure)) > 0 as wait,
--          position('regrow_ms' in pg_get_functiondef('town.quality_progress(jsonb,bigint)'::regprocedure)) > 0 as round,
--          position('regrow_ms' in pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure)) > 0 as pests,
--          position('boostAt' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as pick,
--          position('spread' in pg_get_functiondef('town.hoe_fx(jsonb)'::regprocedure)) > 0 as hoe,
--          has_function_privilege('anon', 'town.regrow_ms(jsonb,bigint)', 'EXECUTE') as anon_may;
--   → true, true, true, true, true, false
--   select data#>'{old,dark,can,more}' as dark, data#>'{old,fire,hoe,spread}' as spread from public.town_catalog where key = 'forge';
--   → [1.5, 1.75, 2, 2], [0, 0.15, 0.25, 0.35]
--   select count(*) as without from public.town_plots where plant is not null and plant <> 'null'::jsonb and coalesce((plant->>'picked')::integer, 0) > 0 and not plant ? 'boostAt';
--   → 0
