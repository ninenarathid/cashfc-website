-- v176: a larger box for each character.
-- Run in the Supabase SQL editor after v175. Safe to run again.
-- Logs (bag first, then box) and coins buy 20, 30, then 40 slots.
-- The existing member-owned box is expanded; nobody else's box changes.
-- Prices have their own catalog key so existing box settings remain intact.
begin;

do $$
begin
  if to_regprocedure('town.box_of(uuid)') is null
     or to_regprocedure('town.by_box(integer,integer)') is null
     or not coalesce(town.cat('items') ? 'log', false) then
    raise exception 'v134 storage and the woodcutting items must be installed first';
  end if;
end $$;

-- <catalog:v176> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('box_upgrade', $town${
    "max": 40,
    "upgrades": [{"slots":20,"wood":100,"coins":1000},{"slots":30,"wood":200,"coins":3000},{"slots":40,"wood":400,"coins":8000}]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v176>

create or replace function town.box_offer(p_box jsonb)
returns jsonb language sql stable set search_path = ''
as $$
  select u.value from jsonb_array_elements(town.cat('box_upgrade')->'upgrades') u(value)
   where (u.value->>'slots')::integer > jsonb_array_length(town.box_roomy(p_box)->'things')
     and (u.value->>'slots')::integer <= least(40, (town.cat('box_upgrade')->>'max')::integer)
   order by (u.value->>'slots')::integer limit 1
$$;

-- Same rules as lib/town/box.ts's upgradeBox. The target must match the
-- displayed offer: a stale request cannot silently buy a more expensive tier.
create or replace function town.box_upgrade(p_purse jsonb, p_box jsonb, p_slots integer, p_x integer, p_y integer)
returns jsonb language plpgsql stable set search_path = ''
as $$
declare
  kept jsonb := town.box_roomy(p_box);
  offer jsonb;
  bag_wood integer;
  from_bag integer;
begin
  if p_x is null or p_y is null or not town.by_box(p_x, p_y) then return town.no('far'); end if;
  offer := town.box_offer(kept);
  if offer is null then return town.no('max'); end if;
  if p_slots is distinct from (offer->>'slots')::integer then return town.no('changed'); end if;
  bag_wood := town.held(p_purse->'bag', 'log');
  if bag_wood + town.held(kept->'things', 'log') < (offer->>'wood')::integer then return town.no('wood'); end if;
  if (p_purse->>'coins')::numeric < (offer->>'coins')::numeric then return town.no('coins'); end if;
  from_bag := least(bag_wood, (offer->>'wood')::integer);
  return offer || jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (offer->>'coins')::numeric,
      'bag', town.take(p_purse->'bag', 'log', from_bag)),
    'box', town.box_roomy(kept || jsonb_build_object(
      'more', p_slots - (town.cat('box')->>'slots')::integer,
      'things', town.take(kept->'things', 'log', (offer->>'wood')::integer - from_bag))));
end;
$$;

-- Reading does not create a row. Older pages ignore the additional offer.
create or replace function public.town_box()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  me uuid := town.member();
  box jsonb := town.box_of(me);
begin
  return jsonb_build_object('box', box, 'boxOffer', town.box_offer(box), 'now', town.now_ms());
end;
$$;

create or replace function public.town_box_upgrade(p_slots integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := town.member();
  -- Every box transfer also locks the purse first. Two requests for this
  -- character serialize here before either reads its capacity or materials.
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  box jsonb;
begin
  did := town.box_upgrade(purse, town.box_of(me), p_slots, p_x, p_y);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_boxes(member_id, things, more, updated_at)
      values(me, did->'box'->'things', (did->'box'->>'more')::integer, now())
      on conflict(member_id) do update set things = excluded.things, more = excluded.more, updated_at = now();
    perform town.note(me, 'box_upgrade', 'log', (did->>'wood')::numeric, -(did->>'coins')::numeric,
      jsonb_build_object('slots', p_slots, 'tile', jsonb_build_array(p_x, p_y)));
  end if;
  box := town.box_of(me);
  return town.answer(me, did - 'box') || jsonb_build_object('box', box, 'boxOffer', town.box_offer(box));
end;
$$;

-- Add a tally label without rewriting any other game's labels.
do $$
declare def text;
begin
  if town.deed_th('box_upgrade') = 'box_upgrade' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'The tally label function has changed'; end if;
    execute replace(def, 'else p_what end', 'when ''box_upgrade'' then ''อัปเกรดกล่องเก็บของ'' else p_what end');
  end if;
end $$;

revoke execute on function town.box_offer(jsonb) from public, anon, authenticated;
revoke execute on function town.box_upgrade(jsonb,jsonb,integer,integer,integer) from public, anon, authenticated;
revoke execute on function public.town_box() from public, anon;
revoke execute on function public.town_box_upgrade(integer,integer,integer) from public, anon;
grant execute on function public.town_box() to authenticated;
grant execute on function public.town_box_upgrade(integer,integer,integer) to authenticated;

notify pgrst, 'reload schema';
commit;
