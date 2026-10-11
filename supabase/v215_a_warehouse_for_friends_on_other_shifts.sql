-- v215 — a shared warehouse at the town's existing storage counter.
-- Run once in Supabase SQL Editor after v179. Rerunning keeps all stored items.
-- Independent of the pending profession/casino migrations. Feedback #19:
-- friends on different shifts need to return borrowed tools without meeting.
-- One 20-slot warehouse per member; 100 logs + 1,000 coins; up to 20 guests.
-- The owner explicitly grants access. Removing a guest never deletes items.
begin;
create table if not exists public.town_warehouses (
  owner uuid primary key references public.profiles(id),
  members uuid[] not null default '{}',
  things jsonb not null default '[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb,
  updated_at timestamptz not null default now(),
  check(cardinality(members)<=20 and array_position(members,null) is null and not owner=any(members)),
  check(jsonb_typeof(things)='array' and jsonb_array_length(things)=20)
);
create index if not exists town_warehouses_guests on public.town_warehouses using gin(members);
create table if not exists public.town_warehouse_requests (
  actor uuid not null references public.profiles(id), request uuid not null,
  input jsonb not null, created_at timestamptz not null default now(),
  primary key(actor,request)
);
alter table public.town_warehouses enable row level security;
alter table public.town_warehouse_requests enable row level security;
revoke all on public.town_warehouses,public.town_warehouse_requests from public,anon,authenticated;

create or replace function town.warehouses_for(p_member uuid)
returns jsonb language sql stable set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('owner',w.owner,
    'name',coalesce(p.character_name,p.display_name,p.discord_username,'Member'),
    'members',w.members,'things',w.things) order by w.owner),'[]'::jsonb)
  from public.town_warehouses w join public.profiles p on p.id=w.owner
  where w.owner=p_member or w.members @> array[p_member];
$$;
revoke all on function town.warehouses_for(uuid) from public,anon,authenticated;

create or replace function public.town_warehouse(p_input jsonb,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  me uuid:=town.member(); action_ text:=p_input->>'action'; purse jsonb;
  w public.town_warehouses; previous jsonb; owner_ uuid; member_ uuid;
  x integer; y integer; slot_ integer; s jsonb; did jsonb; box_ jsonb;
begin
  if p_input is null or jsonb_typeof(p_input)<>'object' or action_ is null or
    action_ not in ('look','create','invite','remove','put','take') or octet_length(p_input::text)>20000 then
    raise exception 'Invalid warehouse action' using errcode='22023';
  end if;
  if action_='look' then
    return jsonb_build_object('ok',true,'warehouses',town.warehouses_for(me),'now',town.now_ms());
  end if;
  if p_request is null or jsonb_typeof(p_input->'at') is distinct from 'array' or
    jsonb_array_length(p_input->'at')<>2 then raise exception 'Request and storage location required' using errcode='22023'; end if;
  x:=(p_input->'at'->>0)::integer; y:=(p_input->'at'->>1)::integer;
  if x is null or y is null or not town.by_box(x,y) then
    return jsonb_build_object('ok',false,'why','far','warehouses',town.warehouses_for(me));
  end if;
  -- Every operation holds its own purse first, then one warehouse. No other
  -- player's purse is taken, so guests cannot form a cycle of wallet locks.
  purse:=town.purse_of(me,true);
  select r.input into previous from public.town_warehouse_requests r where r.actor=me and r.request=p_request;
  if found then
    if previous<>p_input then raise exception 'Request was used for a different action' using errcode='22023'; end if;
    return town.answer(me,jsonb_build_object('ok',true)) || jsonb_build_object('warehouses',town.warehouses_for(me));
  end if;
  if action_='create' then
    if exists(select 1 from public.town_warehouses where owner=me) then did:=town.no('exists');
    elsif (purse->>'coins')::integer<1000 then did:=town.no('coins');
    elsif town.held(purse->'bag','log')<100 then did:=town.no('wood');
    else
      insert into public.town_warehouses(owner,things) values(me,'[null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null]'::jsonb);
      purse:=jsonb_set(jsonb_set(purse,'{coins}',to_jsonb((purse->>'coins')::integer-1000)),'{bag}',town.take(purse->'bag','log',100));
      perform town.keep_purse(me,purse); did:=jsonb_build_object('ok',true);
    end if;
  else
    owner_:=(p_input->>'owner')::uuid;
    select * into w from public.town_warehouses where owner=owner_ for update;
    if not found or (w.owner<>me and not me=any(w.members)) then did:=town.no('denied');
    elsif action_ in ('invite','remove') then
      member_:=(p_input->>'member')::uuid;
      if w.owner<>me or member_ is null or member_=me then did:=town.no('denied');
      elsif action_='invite' and not exists(select 1 from public.profiles p where p.id=member_ and
        (p.is_admin or (p.character_id is not null and p.character_verified_at is not null))) then did:=town.no('member');
      elsif action_='invite' and cardinality(w.members)>=20 and not member_=any(w.members) then did:=town.no('full');
      else
        update public.town_warehouses set members=case when action_='remove' then array_remove(w.members,member_)
          when member_=any(w.members) then w.members else array_append(w.members,member_) end,updated_at=clock_timestamp() where owner=w.owner;
        did:=jsonb_build_object('ok',true);
      end if;
    else
      slot_:=(p_input->>'slot')::integer;
      if slot_ is null or slot_<0 or slot_>=(case when action_='put' then jsonb_array_length(purse->'bag') else 20 end) then did:=town.no('none');
      else
        s:=case when action_='put' then purse->'bag'->slot_ else w.things->slot_ end;
        if s is null or s='null'::jsonb or p_input->'expected' is distinct from s then did:=town.no('changed');
        else
          box_:=jsonb_build_object('things',w.things,'more',10);
          did:=case when action_='put' then town.stow(purse,box_,slot_,(s->>'n')::integer,x,y)
            else town.unstow(purse,box_,slot_,(s->>'n')::integer,x,y) end;
          if did->'ok'='true'::jsonb then
            update public.town_warehouses set things=did->'box'->'things',updated_at=clock_timestamp() where owner=w.owner;
            perform town.keep_purse(me,did->'purse');
          end if;
        end if;
      end if;
    end if;
  end if;
  if did->'ok'='true'::jsonb then
    insert into public.town_warehouse_requests(actor,request,input) values(me,p_request,p_input);
    perform town.note(me,'warehouse_'||action_,coalesce(s->>'item',''),coalesce((s->>'n')::integer,0),
      case when action_='create' then -1000 else 0 end,jsonb_build_object('owner',coalesce(owner_,me),'member',member_,'request',p_request));
  end if;
  return town.answer(me,did-'box'-'purse') || jsonb_build_object('warehouses',town.warehouses_for(me));
end $$;
revoke all on function public.town_warehouse(jsonb,uuid) from public,anon;
grant execute on function public.town_warehouse(jsonb,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object(
  'warehouse_ready',to_regprocedure('public.town_warehouse(jsonb,uuid)') is not null,
  'direct_write_blocked',not has_table_privilege('authenticated','public.town_warehouses','UPDATE'),
  'private_items',not has_table_privilege('authenticated','public.town_warehouses','SELECT'),
  'anonymous_blocked',not has_function_privilege('anon','public.town_warehouse(jsonb,uuid)','EXECUTE')
) as v215_verified;
