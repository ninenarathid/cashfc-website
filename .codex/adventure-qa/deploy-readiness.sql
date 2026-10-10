-- Read-only feature markers, not a migration ledger or a live gameplay test.
-- Run in the Supabase SQL Editor before choosing which migration to install.
-- For this release the expected starting state is v176-v179/v183/v195 true,
-- and all twelve pending expansion rows false. Never replay older guarded
-- migrations merely because a single marker is false; inspect partial states.
with catalog as (
  select jsonb_object_agg(key,data) as c from public.town_catalog
), readers as (
  select count(*) = 4 and coalesce(bool_and(case
    when p.proname = 'town_well_ranks' then position('town.thanks_board' in pg_get_functiondef(p.oid)) = 0
    else position('town.shared_read(' in pg_get_functiondef(p.oid)) > 0 end),false) as ready
  from pg_proc p where p.oid in (
    to_regprocedure('public.town_bugs()'),to_regprocedure('public.town_wild()'),
    to_regprocedure('town.cave_told(uuid,jsonb,integer,integer,integer,bigint)'),
    to_regprocedure('public.town_well_ranks()'))
)
select version,coalesce(feature_present,false) as feature_present
from catalog cross join readers cross join lateral (values
  (176,(c->'box_upgrade'->>'max') = '40' and to_regprocedure('town.box_offer(jsonb)') is not null),
  (177,(c#>>'{forge,options,of,pkSteady,six,n,strikes}') = '4' and (c#>>'{forge,options,of,axOne,use,n}') = '30'),
  (178,(c#>>'{trees,echo,trees}') = '2' and (c#>>'{gifts,gifts,charmEchoAxe,by}') = '2'),
  (179,to_regprocedure('public.town_box_sort(jsonb,integer,integer)') is not null),
  (180,to_regprocedure('public.town_craft(text,uuid)') is not null and c ? 'workshop'),
  (181,to_regprocedure('town.line_count(jsonb)') is not null),
  (182,c->'fishing' ? 'waters' and c->'fish' ? 'creekDace'),
  (183,to_regprocedure('public.town_fishing_hook(text)') is not null),
  (184,to_regprocedure('town.wood_choice(jsonb)') is not null),
  (185,to_regprocedure('town.rock_choice(jsonb)') is not null),
  (186,to_regprocedure('town.garden_plots(text)') is not null and c ? 'gardening'),
  (187,to_regprocedure('public.town_insect_care(integer,integer,integer,text)') is not null),
  (188,c ? 'forest_parts' and to_regclass('public.town_forest_rest') is not null),
  (194,to_regprocedure('public.town_combo(text,jsonb)') is not null),
  (195,readers.ready and to_regclass('town.read_cache') is not null),
  (196,to_regprocedure('public.town_stream(text,text,integer,integer,uuid)') is not null),
  (197,to_regprocedure('public.town_preparation(text,text,integer,integer,uuid,jsonb)') is not null and c ? 'camps'),
  (198,c->'fish' ? 'crystalCaveDragon' and c->'dishes' ? 'moonveilFeast')
) checks(version,feature_present)
order by version;
