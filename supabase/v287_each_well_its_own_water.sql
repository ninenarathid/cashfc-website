-- v287: each of the farm's two wells keeps its own water (the owner, 2026-10-19, after v284 made the second well
-- one water with the first: "ช่วยทำให้ น้ำแต่ละบ่อ มีน้ำแยกกัน ตอนนี้ ผมเอาน้ำออก 1 ครั้งมัน 98/100 ทั้งสองบ่อ";
-- and of the waters' natures, asked: "แยกตามบ่อ").
--
-- Run after v284. Safe to run twice. Either order with the page: a page loaded before reads the first well's water as
-- the one it knows; the page of this change reads both (`wells`, `wellWaters`), and before this has run takes the one
-- water for both, as it was.
--
-- What it is:
--   * each well its own level: the first's is `town_things.well`, as it was; the second's `well_south`, new, empty
--     (all the water there is was carried to the one well before it was two);
--   * each well its own nature: `well_water` the first's, as it was; `well_water_south` the second's;
--   * the well's book of who carried what water (`town_well_water`) knows which well a lot is in (`well`; every lot
--     there is is the first's): a can filled at a well is of that well's oldest water;
--   * a deed at a well is done to the well whose tiles the doer stands on (`town.well_by`); a plant watered takes the
--     nature of the well nearest it (`town.well_of`): the first half's the first well's, the southern half's the second's;
--   * pages are told both: `wells` (levels) and `wellWaters` (natures), beside `well` and `wellWater` as they were.
-- The functions changed are changed in their live text, each replacement so many times and no more (or, run again,
-- already made): town_chore, town_moon_pour, town_stream, town.well_seen, town_farm, town.plot_heat, town_tend,
-- town_longpour, town.reward_help_garden, town_well, town_well_ranks.
begin;
set local statement_timeout = '60s';
set local lock_timeout = '10s';
do $$ begin
  if to_regprocedure('town.at_well(integer,integer)') is null then raise exception 'Run v284 before v287'; end if;
  if jsonb_array_length(coalesce(town.cat('farming')->'wells', '[]'::jsonb)) <> 2 then raise exception 'v287: the catalog has not two wells'; end if;
end $$;

-- ── 1. Where each well's water is kept ────────────────────────────────────────────────────────────────────────────────
insert into public.town_things (key, doc) values ('well_south', '0'::jsonb), ('well_water_south', 'null'::jsonb) on conflict (key) do nothing;
alter table public.town_well_water add column if not exists well smallint not null default 0;
create index if not exists town_well_water_well on public.town_well_water (well, id);

-- The well whose tiles a tile is, by its number (0 the first), or null: one of the eight about it.
create or replace function town.well_by(p_x integer, p_y integer)
returns integer language sql stable set search_path = '' as $$
  select (w.o - 1)::integer
    from jsonb_array_elements(coalesce(town.cat('farming')->'wells', jsonb_build_array(town.cat('farming')->'wellAt'))) with ordinality w(t, o)
   where p_x is not null and p_y is not null and jsonb_typeof(w.t) = 'array'
     and greatest(abs(p_x - (w.t->>0)::integer), abs(p_y - (w.t->>1)::integer)) = 1
   order by w.o limit 1
$$;
-- The well nearest a tile, by its number: whose nature a plant watered there takes (lib/town/world's wellOf).
create or replace function town.well_of(p_x integer, p_y integer)
returns integer language sql stable set search_path = '' as $$
  select coalesce((
    select (w.o - 1)::integer
      from jsonb_array_elements(coalesce(town.cat('farming')->'wells', jsonb_build_array(town.cat('farming')->'wellAt'))) with ordinality w(t, o)
     where p_x is not null and p_y is not null and jsonb_typeof(w.t) = 'array'
     order by (p_x - (w.t->>0)::integer) ^ 2 + (p_y - (w.t->>1)::integer) ^ 2, w.o limit 1), 0)
$$;
-- Where a well's level and its water's nature are kept (town_things' keys).
create or replace function town.well_key(p_well integer)
returns text language sql immutable set search_path = '' as $$ select case when p_well = 1 then 'well_south' else 'well' end $$;
create or replace function town.well_water_key(p_well integer)
returns text language sql immutable set search_path = '' as $$ select case when p_well = 1 then 'well_water_south' else 'well_water' end $$;
-- A well's water's nature while it lasts (town.well_water_told's, for either well), its kind, and both wells' told.
create or replace function town.well_water_told_at(p_well integer, p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
  select case when jsonb_typeof(t.doc) = 'object' and (t.doc->>'until')::bigint > p_now then t.doc else 'null'::jsonb end
    from (select (select x.doc from public.town_things x where x.key = town.well_water_key(p_well)) as doc) t
$$;
create or replace function town.well_kind_at(p_well integer, p_now bigint)
returns text language sql stable set search_path = '' as $$
  select case when jsonb_typeof(w.doc) = 'object' then w.doc->>'kind' end from (select town.well_water_told_at(p_well, p_now) as doc) w
$$;
create or replace function town.wells_told()
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_array(coalesce((select x.doc from public.town_things x where x.key = 'well'), '0'::jsonb),
                           coalesce((select x.doc from public.town_things x where x.key = 'well_south'), '0'::jsonb))
$$;
create or replace function town.well_waters_told(p_now bigint)
returns jsonb language sql stable set search_path = '' as $$ select jsonb_build_array(town.well_water_told_at(0, p_now), town.well_water_told_at(1, p_now)) $$;
revoke all on function town.well_by(integer, integer), town.well_of(integer, integer), town.well_key(integer), town.well_water_key(integer),
  town.well_water_told_at(integer, bigint), town.well_kind_at(integer, bigint), town.wells_told(), town.well_waters_told(bigint) from public, anon, authenticated;

-- ── 2. The functions that knew one well: their live text, but for these ───────────────────────────────────────────────
do $$
declare c text[]; d text; n integer;
begin
  foreach c slice 1 in array array[
    ['public.town_chore(integer,integer)', 'well := (town.thing(''well'', at_ = ''well'') #>> ''{}'')::int;', 'well := (town.thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)), at_ = ''well'') #>> ''{}'')::int;', '1'],
    ['public.town_chore(integer,integer)', 'if (did->>''well'')::int <> well then perform town.keep_thing(''well'', did->''well''); end if;', 'if (did->>''well'')::int <> well then perform town.keep_thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)), did->''well''); end if;', '1'],
    ['public.town_chore(integer,integer)', '0, jsonb_build_object(''well'', did->''well''));', '0, jsonb_build_object(''well'', did->''well'', ''at'', coalesce(town.well_by(p_x, p_y), 0)));', '1'],
    ['public.town_chore(integer,integer)', 'return town.answer(me, did) || jsonb_build_object(''well'', coalesce((did->>''well'')::int, well));', 'return town.answer(me, did) || jsonb_build_object(''well'', coalesce((did->>''well'')::int, well), ''wells'', town.wells_told());', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'well := (town.thing(''well'', true) #>> ''{}'')::int;', 'well := (town.thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)), true) #>> ''{}'')::int;', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'if (did->>''well'')::int <> well then perform town.keep_thing(''well'', did->''well''); end if;', 'if (did->>''well'')::int <> well then perform town.keep_thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)), did->''well''); end if;', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'town.well_poured_times(town.thing(''well_water'', true),', 'town.well_poured_times(town.thing(town.well_water_key(coalesce(town.well_by(p_x, p_y), 0)), true),', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'perform town.keep_thing(''well_water'', coalesce(water, ''null''::jsonb));', 'perform town.keep_thing(town.well_water_key(coalesce(town.well_by(p_x, p_y), 0)), coalesce(water, ''null''::jsonb));', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'jsonb_build_object(''well'', did->''well'', ''flask'', true)', 'jsonb_build_object(''well'', did->''well'', ''flask'', true, ''at'', coalesce(town.well_by(p_x, p_y), 0))', '1'],
    ['public.town_moon_pour(integer,integer,integer)', 'jsonb_build_object(''well'', coalesce((did->>''well'')::int, well), ''wellWater'', town.well_water_told(now_))', 'jsonb_build_object(''well'', coalesce((did->>''well'')::int, well), ''wellWater'', town.well_water_told(now_), ''wells'', town.wells_told(), ''wellWaters'', town.well_waters_told(now_))', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'well_:=(town.thing(''well'',true)#>>''{}'')::integer;', 'well_:=(town.thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)),true)#>>''{}'')::integer;', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'perform town.keep_thing(''well'',to_jsonb(well_+1));', 'perform town.keep_thing(town.well_key(coalesce(town.well_by(p_x, p_y), 0)),to_jsonb(well_+1));', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'perform town.note(me,''pour'',null,1,0,jsonb_build_object(''prepared'',p_choice));', 'perform town.note(me,''pour'',null,1,0,jsonb_build_object(''prepared'',p_choice,''at'',coalesce(town.well_by(p_x, p_y), 0)));', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'was:=town.thing(''well_water'',true);', 'was:=town.thing(town.well_water_key(coalesce(town.well_by(p_x, p_y), 0)),true);', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'perform town.keep_thing(''well_water'',jsonb_build_object(''kind'',kind_,''until'',until_,''by'',me));', 'perform town.keep_thing(town.well_water_key(coalesce(town.well_by(p_x, p_y), 0)),jsonb_build_object(''kind'',kind_,''until'',until_,''by'',me));', '1'],
    ['public.town_stream(text,text,integer,integer,uuid)', 'jsonb_build_object(''stream'',gate_,''wellWater'',town.well_water_told(now_))', 'jsonb_build_object(''stream'',gate_,''wellWater'',town.well_water_told(now_),''wells'',town.wells_told(),''wellWaters'',town.well_waters_told(now_))', '1'],
    ['town.well_seen(uuid,bigint,text,text,numeric,jsonb)', 'insert into public.town_well_water (member_id, buckets) values (p_member, v_n);', 'insert into public.town_well_water (member_id, buckets, well) values (p_member, v_n, coalesce((p_doc->>''at'')::integer, 0));', '1'],
    ['town.well_seen(uuid,bigint,text,text,numeric,jsonb)', 'perform town.keep_thing(''well_water'', coalesce(town.well_poured(town.thing(''well_water'', true), v_kind, v_n, p_member, p_at), ''null''::jsonb));', 'perform town.keep_thing(town.well_water_key(coalesce((p_doc->>''at'')::integer, 0)), coalesce(town.well_poured(town.thing(town.well_water_key(coalesce((p_doc->>''at'')::integer, 0)), true), v_kind, v_n, p_member, p_at), ''null''::jsonb));', '1'],
    ['town.well_seen(uuid,bigint,text,text,numeric,jsonb)', 'from public.town_well_water w order by w.id limit 1 for update;', 'from public.town_well_water w where w.well = coalesce((p_doc->>''at'')::integer, 0) order by w.id limit 1 for update;', '1'],
    ['public.town_farm(bigint)', '''well'', town.thing(''well'', false),', '''well'', town.thing(''well'', false), ''wells'', town.wells_told(), ''wellWaters'', town.well_waters_told(town.now_ms()),', '1'],
    ['town.plot_heat()', 'w := town.well_water_told(new.changed);', 'w := town.well_water_told_at(town.well_of(new.x, new.y), new.changed);', '1'],
    ['public.town_tend(integer,integer,jsonb,boolean)', 'town.well_kind(now_)', 'town.well_kind_at(town.well_of(p_x, p_y), now_)', '2'],
    ['public.town_longpour(integer,integer,jsonb,jsonb)', 'kind text := town.well_kind(now_);', 'kind text := town.well_kind_at(town.well_of(p_x, p_y), now_);', '1'],
    ['town.reward_help_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)', 'town.well_kind(t)', 'town.well_kind_at(town.well_of(x_, y_), t)', '1'],
    ['public.town_well()', '''wellWater'', town.well_water_told(now_));', '''wellWater'', town.well_water_told(now_), ''wellWaters'', town.well_waters_told(now_));', '1'],
    ['public.town_well_ranks()', '''wellWater'', town.well_water_told(town.now_ms()));', '''wellWater'', town.well_water_told(town.now_ms()), ''wellWaters'', town.well_waters_told(town.now_ms()));', '1']] loop
    d := replace(pg_get_functiondef(c[1]::regprocedure), chr(13), '');
    -- (made already, on a run before: some of the new text holds the old)
    continue when position(c[3] in d) > 0;
    n := (length(d) - length(replace(d, c[2], ''))) / length(c[2]);
    if n = c[4]::integer then execute replace(d, c[2], c[3]);
    else raise exception 'v287: % has % of [%], not %: rebuild v287', c[1], n, left(c[2], 60), c[4]; end if;
  end loop;
end $$;

do $$ begin
  if town.well_by(157, 65) <> 1 or town.well_by(155, 24) <> 0 or town.well_by(156, 65) is not null then raise exception 'v287: town.well_by does not tell the wells apart'; end if;
  if town.well_of(150, 30) <> 0 or town.well_of(150, 60) <> 1 then raise exception 'v287: town.well_of does not tell the halves apart'; end if;
  if jsonb_array_length(town.wells_told()) <> 2 then raise exception 'v287: town.wells_told'; end if;
end $$;
commit;

-- After it has run, in the SQL editor (each answers as said):
--   select town.wells_told();                                  -- [<the first well's>, 0]
--   select town.well_by(157, 65), town.well_of(150, 60);       -- 1, 1
