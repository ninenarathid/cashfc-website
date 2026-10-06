-- v153, the part every line's gifts stand on. A line's own functions are in v153.<line>.sql beside this file, tried
-- on top of this one (try-line.mjs); the file for supabase/ is put together from all of them.

-- The stretch of time a count is of, as one number, by the count's whole rule (lib/town/gifts' stretchOf): the day,
-- the day and which meal's hours of it, or which span of so many milliseconds the moment is in.
create or replace function town.stretch_at(p_rule jsonb, p_now bigint)
returns bigint language sql stable
as $$
  select case p_rule->>'per'
    when 'day' then town.day_of(p_now)::bigint
    when 'meal' then town.day_of(p_now)::bigint * 3 + town.meal_of(p_now)
    else floor(p_now::numeric / greatest(1, coalesce((p_rule->>'ms')::numeric, 1)))::bigint end
$$;

-- How many times a counted gift has been used in the stretch p_now is in (lib/town/gifts' usedOf): v152's, the
-- stretch by the rule.
create or replace function town.used_of(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_at(rule, p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- A counted gift used once (lib/town/gifts' useGift): v152's, the stretch by the rule.
create or replace function town.gift_use(p_purse jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  mine jsonb;
  n integer;
begin
  if rule is null or not town.gift_works(p_purse, p_id) then return town.no('none'); end if;
  n := town.used_of(p_purse, p_id, p_now);
  if n >= (rule->>'n')::integer then return town.no('spent'); end if;
  mine := town.gifts_of(p_purse);
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - n - 1,
    'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('used',
      (mine->'used') || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', n + 1)))));
end;
$$;

-- (v152's stretch by a word alone: nothing calls it now)
drop function if exists town.stretch_of(text, bigint);

-- How much harder a line's good things are at a rank of it (lib/town/gifts' harderAt): 1 below the rank the catalog
-- names, then so much more a rank.
create or replace function town.harder_at(p_rank integer)
returns double precision language sql stable
as $$
  select coalesce((select case when p_rank < (h->>'from')::integer then 1::double precision
      else 1 + (h->>'by')::double precision * (least(10, p_rank) - (h->>'from')::integer + 1) end
    from (select town.cat('gifts')->'harder' as h) c), 1)
$$;

-- A member's rank on a line now, and how much harder that line's good things are for them.
create or replace function town.rank_on(p_member uuid, p_line text)
returns integer language sql stable set search_path = public
as $$ select town.work_rank(p_line, coalesce((town.work_told(p_member, town.now_ms())->p_line->>'points')::double precision, 0)) $$;

create or replace function town.harder_for(p_member uuid, p_line text)
returns double precision language sql stable set search_path = public
as $$ select town.harder_at(town.rank_on(p_member, p_line)) $$;

revoke execute on all functions in schema town from public, anon, authenticated;
