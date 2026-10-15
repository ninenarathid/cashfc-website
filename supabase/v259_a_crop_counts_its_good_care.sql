-- v259: a crop counts the care it is given (the farm's Quality, first part).
-- Run after v258 and with the matching site code. Safe to run twice.
--
-- The owner, 2026-10-15: "Quality ต้องใช้งานได้จริง ไม่ใช่แค่ show", and Quality told as a range a lucky pick lands high
-- in. The whole design is the artifact https://claude.ai/artifact/6jR6hbg7pHtGmfa3vQHFJC; the rules are
-- lib/town/quality.ts and lib/town/quality-plant.ts, which these functions follow line for line.
--
-- What this file does: every plant keeps its present round's Quality as it grows (`plant.q`: the last settle, how
-- much growing has been counted, and each bar's covered growing). A trigger on town_plots settles a plant's round as
-- it stood BEFORE any change to it, so a new watering or a new guard never rewrites the past, whatever path wrote the
-- plot (a tend, a row, the gnome, an insect, moon water, a cloud). A picked plant starts a new round. Weighed by the
-- plant's own growing, so nothing counts once it is ripe. Hand work covers half a bar: a watering 26 hours, rain and
-- 12 hours after, a damp furrow, compost, the brush this round, a guard or a pollinator until they run out.
-- Nothing is paid or graded yet (the next part does that); the page reads `q` to show the bars and the range.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $$ begin
 if to_regprocedure('town.grown(jsonb,bigint)') is null or to_regprocedure('town.quick_ms(jsonb,bigint,bigint)') is null then raise exception 'town.grown and town.quick_ms are missing: run the farm migrations first'; end if;
 if to_regclass('public.town_plots') is null or to_regclass('public.town_weather') is null then raise exception 'town_plots or town_weather is missing'; end if;
end $$;

-- <catalog:v259> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('quality', $town${
    "bar": 25,
    "spread": 30,
    "narrowest": 20,
    "narrow": 10,
    "fennel": 10,
    "launch": 1791997200000,
    "hand": {"water":93600000,"afterRain":43200000,"level":0.5},
    "encore": 0.5
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v259>

-- A fresh round, from a moment.
create or replace function town.quality_fresh(p_at bigint)
returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('at',p_at,'span',0,'area',jsonb_build_array(0,0,0,0),'nar',jsonb_build_array(0,0,0))
$$;

-- When the plant's present round began: its sowing, or its last picking for one that bears again.
create or replace function town.quality_round_start(p_plant jsonb)
returns bigint language sql immutable set search_path='' as $$
 select case when coalesce((p_plant->>'picked')::integer,0)>0 then (p_plant->>'pickedAt')::bigint else (p_plant->>'sown')::bigint end
$$;

-- The part of its present round a plant has grown by a moment, 0 to 1 (lib/town/quality-plant's progressOf).
create or replace function town.quality_progress(p_plant jsonb, p_t bigint)
returns double precision language sql stable set search_path='' as $$
 select least(1::double precision, greatest(0::double precision, case
  when coalesce((p_plant->>'picked')::integer,0)=0 then town.grown(p_plant,p_t)/(c->>'hours')::double precision
  else (p_t-(p_plant->>'pickedAt')::bigint+town.quick_ms(p_plant,(p_plant->>'pickedAt')::bigint,p_t))::double precision/3600000::double precision
   -- (a bearing after the first waits the crop's own while; one the mandrake sang to, the same: lib/town/farm's encoreHours)
   /coalesce((c->>'again')::double precision,(c->>'hours')::double precision*(town.cat('quality')->>'encore')::double precision)
 end))
 from (select town.cat('crops')->(p_plant->>'crop') c) k
$$;

-- The stretches of rain between two moments, neighbouring wet quarter-hours joined (lib/town/weather's rainsOf).
create or replace function town.quality_rains(p_from bigint, p_to bigint)
returns table(r_from bigint, r_to bigint) language sql stable set search_path='' as $$
 select min(s.slot)*900000, (max(s.slot)+1)*900000
   from (select w.slot, w.slot-row_number() over (order by w.slot) as grp
           from public.town_weather w
          where p_to>p_from and w.slot>=floor(p_from::numeric/900000)::bigint and w.slot*900000<p_to and town.wet_sky(w.sky)) s
  group by s.grp
$$;

-- What the plant's own record covers between two moments, half a bar each (lib/town/quality-plant's handCovers).
-- A guard, a pollinator and `wetUntil` are kept only as their end, so they count from the round's last settle.
create or replace function town.quality_covers(p_plant jsonb, p_from bigint, p_to bigint)
returns table(role text, lvl double precision, c_from bigint, c_to bigint) language sql stable set search_path='' as $$
 with h as (select (town.cat('quality')->'hand'->>'level')::double precision lv, (town.cat('quality')->'hand'->>'water')::bigint wa,
                   (town.cat('quality')->'hand'->>'afterRain')::bigint ar, 9007199254740991::bigint e)
 select 'water', h.lv, (p_plant->>'watered')::bigint, (p_plant->>'watered')::bigint+h.wa from h where coalesce((p_plant->>'watered')::bigint,0)>0
 union all select 'water', h.lv, (p_plant->>'sown')::bigint, h.e from h where p_plant->'moist'='true'::jsonb
 union all select 'water', h.lv, r.r_from, r.r_to+h.ar from h, town.quality_rains(p_from-h.ar,p_to) r
 union all select 'water', h.lv, (p_plant->'localRain'->>'from')::bigint, (p_plant->'localRain'->>'until')::bigint+h.ar from h where jsonb_typeof(p_plant->'localRain')='object'
 union all select 'water', h.lv, p_from, (p_plant->>'wetUntil')::bigint from h where jsonb_typeof(p_plant->'wetUntil')='number'
 union all select 'soil', h.lv, (p_plant->>'compost')::bigint, h.e from h where jsonb_typeof(p_plant->'compost')='number'
 union all select 'pollen', h.lv, (p_plant->>'brushed')::bigint, h.e from h where jsonb_typeof(p_plant->'brushed')='number' and (p_plant->>'brushed')::bigint>=town.quality_round_start(p_plant)
 union all select 'pollen', h.lv, p_from, (p_plant->>'pollenUntil')::bigint from h where jsonb_typeof(p_plant->'pollenUntil')='number'
 union all select 'guard', h.lv, p_from, (p_plant->>'guard')::bigint from h where coalesce((p_plant->>'guard')::bigint,0)>0
$$;

-- Count a round's growing from its last settle to a moment (lib/town/quality's accrue): in each stretch between two
-- changes, each bar's best cover times the growing done in it.
create or replace function town.quality_accrue(p_q jsonb, p_to bigint, p_plant jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 at_ bigint:=(p_q->>'at')::bigint; span_ double precision:=(p_q->>'span')::double precision;
 area double precision[]:=array[(p_q->'area'->>0)::double precision,(p_q->'area'->>1)::double precision,(p_q->'area'->>2)::double precision,(p_q->'area'->>3)::double precision];
 roles text[]:=array['soil','water','pollen','guard']; covs jsonb; cuts bigint[]; prog double precision[]; i integer; k integer;
 mid double precision; grew double precision; best double precision;
begin
 if p_to<=at_ then return p_q; end if;
 select coalesce(jsonb_agg(jsonb_build_array(c.role,c.lvl,c.c_from,c.c_to)),'[]'::jsonb) into covs from town.quality_covers(p_plant,at_,p_to) c;
 select array_agg(t order by t) into cuts from (
  select at_ t union select p_to union select (e->>2)::bigint from jsonb_array_elements(covs) e union select (e->>3)::bigint from jsonb_array_elements(covs) e
 ) x where t>=at_ and t<=p_to;
 select array_agg(town.quality_progress(p_plant,t) order by n) into prog from unnest(cuts) with ordinality u(t,n);
 for i in 1..array_length(cuts,1)-1 loop
  grew:=greatest(0::double precision,prog[i+1]-prog[i]);
  continue when grew=0;
  span_:=span_+grew; mid:=(cuts[i]::double precision+cuts[i+1]::double precision)/2;
  for k in 1..4 loop
   select coalesce(max((e->>1)::double precision),0) into best from jsonb_array_elements(covs) e
    where e->>0=roles[k] and (e->>2)::double precision<=mid and mid<(e->>3)::double precision;
   area[k]:=area[k]+least(1::double precision,best)*grew;
  end loop;
 end loop;
 return jsonb_build_object('at',p_to,'span',span_,'area',to_jsonb(area),'nar',coalesce(p_q->'nar',jsonb_build_array(0,0,0)));
end $$;

-- A plant's round settled to a moment; nothing counts before the catalog's launch (lib/town/quality-plant's settled).
create or replace function town.quality_settled(p_plant jsonb, p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare q jsonb:=p_plant->'q';
begin
 if q is null or jsonb_typeof(q)<>'object' then q:=town.quality_fresh(greatest((town.cat('quality')->>'launch')::bigint,town.quality_round_start(p_plant))); end if;
 if p_now>(q->>'at')::bigint then return town.quality_accrue(q,p_now,p_plant); end if;
 return q;
end $$;

-- Before a plant changes, settle its round as it stood (lib/town/quality-plant's syncQuality). Only the root of a
-- plant on several plots keeps it (v186's town_garden_spread copies the root to the rest after); another planting in
-- its place starts afresh; a pick starts a new round.
create or replace function town.quality_keep()
returns trigger language plpgsql set search_path='' as $$
declare was jsonb:=old.plant; p jsonb:=new.plant; now_ bigint;
begin
 if p is null or p='null'::jsonb or was is null or was='null'::jsonb or was=p then return new; end if;
 if p->>'root' is not null and p->>'root'<>new.x::text||','||new.y::text then return new; end if;
 if was->>'sown' is distinct from p->>'sown' or was->>'crop' is distinct from p->>'crop' or was->>'by' is distinct from p->>'by' then return new; end if;
 now_:=coalesce(new.changed,town.now_ms());
 new.plant:=p || jsonb_build_object('q',case
  when coalesce((p->>'picked')::integer,0)>coalesce((was->>'picked')::integer,0) then town.quality_fresh(greatest((town.cat('quality')->>'launch')::bigint,now_))
  else town.quality_settled(was,now_) end);
 return new;
end $$;

revoke all on function town.quality_fresh(bigint),town.quality_round_start(jsonb),town.quality_progress(jsonb,bigint),town.quality_rains(bigint,bigint),
 town.quality_covers(jsonb,bigint,bigint),town.quality_accrue(jsonb,bigint,jsonb),town.quality_settled(jsonb,bigint),town.quality_keep() from public,anon,authenticated;
drop trigger if exists town_quality_keep on public.town_plots;
create trigger town_quality_keep before update of plant on public.town_plots for each row execute function town.quality_keep();

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select key from public.town_catalog where key='quality';                                  -- one row: quality
--   select tgname from pg_trigger where tgrelid='public.town_plots'::regclass and not tgisinternal order by 1;
--                                                                                            -- town_garden_spread, town_quality_keep
--   select has_function_privilege('authenticated','town.quality_settled(jsonb,bigint)','EXECUTE');  -- false
