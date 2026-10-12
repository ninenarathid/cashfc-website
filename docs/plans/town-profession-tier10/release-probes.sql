-- Read-only checks AFTER the matching v251 chain. No wallet or game writes.
with rewards as (
 select key id, value->>'line' line, (value->>'rank')::integer rank
 from jsonb_each(town.cat('gifts')->'gifts')
 union all
 select g->>1, 'well', (g->>0)::integer
 from jsonb_array_elements(town.cat('well')->'gifts') g
), ranks as (
 select line, rank, count(*) n from rewards group by line, rank
)
select jsonb_build_object(
 'reward_count', (select count(*) from rewards),
 'all_ninety', (select count(*)=90 from rewards),
 'nine_lines', (select count(distinct line)=9 from rewards),
 'one_reward_per_rank', (select count(*)=90 and bool_and(n=1 and rank between 1 and 10) from ranks),
 'eighteen_bonds', jsonb_array_length(town.combo_rules())=18,
 'private_rule_registry', not has_function_privilege('authenticated','town.combo_rules()','EXECUTE'),
 'reward_member_only', has_function_privilege('authenticated','public.town_reward(uuid,jsonb)','EXECUTE')
   and not has_function_privilege('anon','public.town_reward(uuid,jsonb)','EXECUTE'),
 'combo_member_only', has_function_privilege('authenticated','public.town_combo(text,jsonb)','EXECUTE')
   and not has_function_privilege('anon','public.town_combo(text,jsonb)','EXECUTE'),
 'private_reward_and_combo_helpers', not exists (
   select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='town' and (p.proname like 'reward_%' or p.proname like 'combo_%' or p.proname='carried_bag')
    and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'))),
 'shared_bugs', position('town.shared_read' in pg_get_functiondef('public.town_bugs()'::regprocedure))>0,
 'shared_wild', position('town.shared_read' in pg_get_functiondef('public.town_wild()'::regprocedure))>0,
 'shared_cave', position('town.shared_read' in pg_get_functiondef('town.cave_told(uuid,jsonb,integer,integer,integer,bigint)'::regprocedure))>0
) as tier10_release_verified;
