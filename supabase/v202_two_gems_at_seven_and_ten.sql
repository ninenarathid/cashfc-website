-- v202: two gem sockets, first at +7 and second at +10.
-- Run after v179. Safe to rerun; existing fitted gems survive downgrades.
-- Old clients keep mounting into socket 0 through town_smith_gem.
begin;

update public.town_catalog
set data = jsonb_set(jsonb_set(data, '{forge,sockets}', '2'), '{forge,socketAt}', '[7,10]')
where key = 'forge';
update public.town_catalog set data = jsonb_set(data, '{pick,sockets}', '2') where key = 'mining';
update public.town_catalog set data = jsonb_set(data, '{axe,sockets}', '2') where key = 'trees';

create or replace function town.socket_open(p_stack jsonb, p_socket integer)
returns boolean language sql stable set search_path = ''
as $$
  select coalesce(town.tool_kind(p_stack->>'item') is not null
    and p_socket >= 0 and p_socket < 2
    and (town.tool_level(p_stack) >= (town.cat('forge')->'forge'->'socketAt'->>p_socket)::integer
      or p_socket < jsonb_array_length(town.tool_gems(p_stack))), false)
$$;
revoke all on function town.socket_open(jsonb,integer) from public, anon, authenticated;

-- Patch the installed reader so later profession logic is kept.
do $$
declare def_ text; before_ text := 'gems_ := gems_ || jsonb_build_object(e, works);';
begin
  def_ := pg_get_functiondef('town.tool_mods(jsonb)'::regprocedure);
  if position('-- v202 duplicate gems' in def_) = 0 then
    if position(before_ in def_) = 0 then raise exception 'tool_mods changed: review v202'; end if;
    def_ := replace(def_, before_, 'gems_ := gems_ || jsonb_build_object(e, least((k->>''gemLevels'')::integer, coalesce((gems_->>e)::integer + 1, works))); -- v202 duplicate gems');
    execute def_;
  end if;
  -- Preserve historical extra gem data when forging/choosing rewrites a tool.
  def_ := pg_get_functiondef('town.tool_with(jsonb,integer,jsonb,jsonb)'::regprocedure);
  if position('-- v202 retain extra gems' in def_) = 0 then
    before_ := 'if jsonb_array_length(p_gems) > 0 then';
    if position(before_ in def_) = 0 then raise exception 'tool_with changed: review v202'; end if;
    def_ := replace(def_, before_, E'-- v202 retain extra gems\n  p_gems := p_gems || coalesce((select jsonb_agg(g.v order by g.ord) from jsonb_array_elements(case when jsonb_typeof(p_stack->''gems'') = ''array'' then p_stack->''gems'' else ''[]''::jsonb end) with ordinality g(v,ord) where jsonb_typeof(g.v) = ''string'' and g.v #>> ''{}'' in (''fire'',''water'',''ice'',''earth'',''lightning'',''wind'',''light'',''dark'') and (select count(*) from jsonb_array_elements(case when jsonb_typeof(p_stack->''gems'') = ''array'' then p_stack->''gems'' else ''[]''::jsonb end) with ordinality h(v,ord) where h.ord <= g.ord and jsonb_typeof(h.v) = ''string'' and h.v #>> ''{}'' in (''fire'',''water'',''ice'',''earth'',''lightning'',''wind'',''light'',''dark'')) > 2), ''[]''::jsonb);\n  if jsonb_array_length(p_gems) > 0 then');
    execute def_;
  end if;
end;
$$;

create or replace function town.gem_set_slot(p_purse jsonb, p_slot integer, p_gem text, p_socket integer)
returns jsonb language plpgsql stable set search_path = ''
as $$
declare
  k jsonb := town.cat('forge')->'smith'->'gem';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  element_ text := town.gem_element(p_gem);
  gems_ jsonb; over_ text; spent jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if element_ is null or town.held_in(p_purse, p_gem) < 1 then return town.no('gem'); end if;
  if not town.forge_settable(kind_, element_) then return town.no('unbuilt'); end if;
  gems_ := town.tool_gems(stack);
  if not town.socket_open(stack, p_socket) or p_socket > jsonb_array_length(gems_) then return town.no('socket'); end if;
  over_ := gems_->>p_socket;
  if over_ = element_ then return town.no('same'); end if;
  if town.held_in(p_purse, k->>'mount') < (k->>'mounts')::numeric then
    return town.no(case when k->>'mount' = 'timber' then 'timber' else 'ore' end);
  end if;
  if (p_purse->>'coins')::numeric < (k->>'fee')::numeric then return town.no('coins'); end if;
  spent := town.take_out(town.take_out(p_purse, p_gem, 1), k->>'mount', (k->>'mounts')::integer);
  gems_ := jsonb_set(gems_, array[p_socket::text], to_jsonb(element_), true);
  return jsonb_build_object('ok', true, 'item', kind_, 'element', element_, 'over', over_,
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (k->>'fee')::numeric,
      'bag', jsonb_set(spent->'bag', array[p_slot::text],
        town.tool_with(coalesce(nullif(spent->'bag'->p_slot, 'null'::jsonb), stack),
          town.tool_level(stack), town.tool_drawn(stack), gems_))));
end;
$$;
revoke all on function town.gem_set_slot(jsonb,integer,text,integer) from public, anon, authenticated;

create or replace function town.gem_set(p_purse jsonb, p_slot integer, p_gem text)
returns jsonb language sql stable set search_path = ''
as $$ select town.gem_set_slot(p_purse, p_slot, p_gem, 0) $$;
revoke all on function town.gem_set(jsonb,integer,text) from public, anon, authenticated;

create or replace function public.town_smith_gem_slot(p_slot integer, p_gem text, p_socket integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.gem_set_slot(purse, p_slot, p_gem, p_socket);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gem_set', p_gem, 1,
      (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'socket', p_socket, 'item', did->'item', 'element', did->'element', 'over', did->'over'));
  end if;
  return town.smith_answer(me, did);
end;
$$;
revoke all on function public.town_smith_gem_slot(integer,text,integer) from public, anon;
grant execute on function public.town_smith_gem_slot(integer,text,integer) to authenticated;

notify pgrst, 'reload schema';
commit;

select jsonb_build_object(
  'two_sockets', town.cat('forge')->'forge'->'sockets' = '2'::jsonb,
  'unlock_levels', town.cat('forge')->'forge'->'socketAt' = '[7,10]'::jsonb,
  'mining_sockets', town.cat('mining')->'pick'->'sockets' = '2'::jsonb,
  'trees_sockets', town.cat('trees')->'axe'->'sockets' = '2'::jsonb,
  'private_helper', not has_function_privilege('authenticated', 'town.gem_set_slot(jsonb,integer,text,integer)', 'EXECUTE'),
  'anon_denied', not has_function_privilege('anon', 'public.town_smith_gem_slot(integer,text,integer)', 'EXECUTE'),
  'member_rpc', has_function_privilege('authenticated', 'public.town_smith_gem_slot(integer,text,integer)', 'EXECUTE')
) as v202_verified;
