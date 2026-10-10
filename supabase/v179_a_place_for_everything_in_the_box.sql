-- v179: move, merge, swap and sort the character's stored things.
-- Run after v176; independent of v177's tool changes. Safe to run again.
-- The expected layout is a comparison only: clients never supply replacement contents.
begin;
do $$ begin
  if to_regprocedure('town.box_offer(jsonb)') is null or to_regprocedure('town.bag_move(jsonb,integer,integer)') is null then
    raise exception 'Run v176 and the bag arrangement migration first';
  end if;
end $$;

create or replace function town.box_move(p_box jsonb, p_from integer, p_to integer)
returns jsonb language plpgsql stable set search_path = '' as $$
declare kept jsonb := town.box_roomy(p_box); did jsonb;
begin
  did := town.bag_move(jsonb_build_object('bag', kept->'things'), p_from, p_to);
  if not (did->>'ok')::boolean then return did; end if;
  return jsonb_build_object('ok', true, 'box', kept || jsonb_build_object('things', did->'purse'->'bag'));
end $$;

-- Same order as lib/town/bag.ts, also including wood and minerals. Attached
-- food, water, forging and future metadata stay whole; only plain stacks join.
create or replace function town.box_sort(p_box jsonb)
returns jsonb language sql stable set search_path = '' as $$
  with kept as (select town.box_roomy(p_box) box),
  held as (
    select s.v stack, s.i::integer was from kept,
      jsonb_array_elements(box->'things') with ordinality s(v,i) where s.v <> 'null'::jsonb
  ), loose as (
    select h.stack->>'item' item, sum((h.stack->>'n')::integer)::integer n,
      max((town.cat('items')->(h.stack->>'item')->>'stack')::integer) most
      from held h where town.bag_joins(h.stack) group by h.stack->>'item'
  ), whole as (
    select h.stack, h.was from held h where not town.bag_joins(h.stack)
    union all
    select jsonb_build_object('item',l.item,'n',least(l.most,l.n-g.k*l.most)),1000000+g.k
      from loose l cross join lateral generate_series(0,(l.n-1)/l.most) g(k)
  ), placed as (
    select w.stack, row_number() over (order by
      coalesce(array_position(array['tool','seed','bait','crop','fish','catch','wild','bug','wood','mineral','staple','goods','dish','scroll'],i.it->>'kind'),99),
      coalesce((i.it->>'tier')::integer,9), (w.stack->>'item') collate "C",
      coalesce(w.stack->'of'->>'dish','') collate "C", coalesce((w.stack->'of'->>'left')::numeric,0) desc,
      coalesce((w.stack->>'water')::numeric,0) desc, (w.stack->>'n')::integer desc, w.was) - 1 as at
      from whole w cross join lateral (select town.cat('items')->(w.stack->>'item') it) i
  )
  select box || jsonb_build_object('things',coalesce((
    select jsonb_agg(coalesce(p.stack,'null'::jsonb) order by g.i)
      from generate_series(0,jsonb_array_length(box->'things')-1) g(i)
      left join placed p on p.at=g.i),'[]'::jsonb)) from kept
$$;

create or replace function town.arrange_box(p_from integer, p_to integer, p_sort boolean, p_expected jsonb, p_x integer, p_y integer)
returns jsonb language plpgsql set search_path = '' as $$
declare
  me uuid := town.member();
  -- Transfers and upgrades take this same lock before reading storage.
  purse jsonb := town.purse_of(me,true);
  box jsonb := town.box_of(me);
  did jsonb;
begin
  if p_x is null or p_y is null or not town.by_box(p_x,p_y) then did := town.no('far');
  elsif p_expected is distinct from box->'things' then did := town.no('changed');
  elsif p_sort then did := jsonb_build_object('ok',true,'box',town.box_sort(box));
  else did := town.box_move(box,p_from,p_to);
  end if;
  if (did->>'ok')::boolean then
    insert into public.town_boxes(member_id,things,more,updated_at)
      values(me,did->'box'->'things',(did->'box'->>'more')::integer,now())
      on conflict(member_id) do update set things=excluded.things,more=excluded.more,updated_at=now();
    box := town.box_of(me);
  end if;
  return town.answer(me,did-'box') || jsonb_build_object('box',box,'boxOffer',town.box_offer(box),'boxTidy',true);
end $$;

create or replace function public.town_box_move(p_from integer, p_to integer, p_expected jsonb, p_x integer, p_y integer)
returns jsonb language sql security definer set search_path = '' as $$
  select town.arrange_box(p_from,p_to,false,p_expected,p_x,p_y)
$$;
create or replace function public.town_box_sort(p_expected jsonb, p_x integer, p_y integer)
returns jsonb language sql security definer set search_path = '' as $$
  select town.arrange_box(null,null,true,p_expected,p_x,p_y)
$$;

-- Older pages ignore this marker; newer pages show controls only once installed.
create or replace function public.town_box()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare me uuid := town.member(); box jsonb := town.box_of(me);
begin
  return jsonb_build_object('box',box,'boxOffer',town.box_offer(box),'boxTidy',true,'now',town.now_ms());
end $$;

revoke all on function town.box_move(jsonb,integer,integer),town.box_sort(jsonb),town.arrange_box(integer,integer,boolean,jsonb,integer,integer) from public,anon,authenticated;
revoke all on function public.town_box_move(integer,integer,jsonb,integer,integer),public.town_box_sort(jsonb,integer,integer),public.town_box() from public,anon;
grant execute on function public.town_box_move(integer,integer,jsonb,integer,integer),public.town_box_sort(jsonb,integer,integer),public.town_box() to authenticated;
notify pgrst,'reload schema';
commit;
