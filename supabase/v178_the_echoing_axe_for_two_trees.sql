-- v178: the echoing axe fells at most two nearby trees in one game.
-- Run after v177 and the matching site deploy. Safe to run twice.
-- The owner asked for two instead of three after seeing shared trees disappear too quickly.
-- Wood drops, the stag, forge powers and members' inventories are unchanged.
begin;
do $guard$
begin
  if not exists (select 1 from public.town_catalog where key = 'forge' and data->'options'->'of'->'axOne'->'use'->>'n' = '30') then
    raise exception 'Run v177 first';
  end if;
  if not exists (select 1 from public.town_catalog where key = 'trees' and data->'echo'->>'trees' in ('3', '2')) then
    raise exception 'Echo tree count changed; rebuild v178 on current catalog';
  end if;
  if not exists (select 1 from public.town_catalog where key = 'gifts' and data->'gifts'->'charmEchoAxe'->>'by' in ('3', '2')) then
    raise exception 'Echo gift count changed; rebuild v178 on current catalog';
  end if;
end $guard$;
update public.town_catalog
  set data = jsonb_set(data, '{echo,trees}', '2'::jsonb), updated_at = now()
  where key = 'trees';
update public.town_catalog
  set data = jsonb_set(data, '{gifts,charmEchoAxe,by}', '2'::jsonb), updated_at = now()
  where key = 'gifts';
notify pgrst, 'reload schema';
commit;
-- Expected: both counts are 2; all other catalog entries are unchanged.
select key, data->'echo'->'trees' as trees from public.town_catalog where key = 'trees';
select data->'gifts'->'charmEchoAxe' as echoing_axe from public.town_catalog where key = 'gifts';
