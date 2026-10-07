-- The farm's well, and what a can takes of it (the owner, 2026-10-07, trying the gifts: "บ่อน้ำเปลี่ยนจาก เต็ม 40 เป็น 100",
-- "ตอนนี้ 1 น้ำในบ่อต่อบัวได้กี่ครั้ง ลดลงมาครึ่งนึง"). The well holds a hundred bucketfuls where it held forty: that is the
-- catalog's number (`farming.well`), which every rule here reads already. A can's filling takes two bucketfuls where it
-- took one (`farming.fill`), so a bucketful of the well's water is four waterings of a plain can, six of a copper one,
-- nine of a brass one; a well with one bucketful left gives half a can. What is written down of a filling is how many
-- bucketfuls it took, and the well's book takes as many of its oldest water, so that the book and the well agree.

-- A chore done (lib/town/farm's chore): v110's as the database has it, but for the can's filling.
create or replace function town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  what text := town.chore_for(p_purse, p_where, p_well);
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  has integer;
  pours integer;
  needs integer;
begin
  if what is null or hand is null then return town.no('none'); end if;
  if what = 'draw' then
    select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well,
      'purse', town.spend(p_purse, (f->'chores'->>'draw')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', (f->'buckets'->>hand)::int
          + (case when town.has_buff(p_purse, p_now, 'carry') then (town.wishing()->>'carry')::int else 0 end)))));
  end if;
  if what = 'pour' then
    -- as much of it as the well has room for; the rest stays in the bucket
    select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) <> 0 order by x.ord limit 1;
    pours := least(has, (f->>'well')::int - p_well);
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well + pours,
      'purse', town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text],
             case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
  end if;
  -- a can's filling takes so many bucketfuls of the well's water (the catalog's `fill`; one where it says none), however
  -- much was left in the can. A well that has fewer gives what it has, and the can so much of a filling more
  if p_well < 1 then return town.no('dry'); end if;
  select (x.ord - 1)::int, coalesce((x.s->>'water')::numeric, 0)::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric order by x.ord limit 1;
  needs := greatest(1, coalesce((f->>'fill')::int, 1));
  pours := least(needs, p_well);
  return jsonb_build_object('ok', true, 'chore', what, 'well', p_well - pours,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water',
           case when pours >= needs then (f->'cans'->>hand)::int
                else least((f->'cans'->>hand)::int, has + floor((f->'cans'->>hand)::numeric * pours / needs)::int) end))));
end;
$$;

-- What a member calls for a chore: as the database has it, but that a filling is written down with the bucketfuls it took.
create or replace function public.town_chore(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  at_ text := case
    when greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) = 1 then 'well'
    when town.cat('fishing')->'places' ? (p_x::text || ',' || p_y::text) then 'river' end;
  well integer;
  did jsonb;
begin
  if at_ is null then return town.answer(me, town.no('none')); end if;
  -- (the well is held only by somebody at it: drawing at the river does not touch it)
  well := (town.thing('well', at_ = 'well') #>> '{}')::int;
  did := town.chore(purse, at_, well, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
    -- (how much: the bucketfuls poured into the well, or drawn at the river, or taken from the well by a can)
    perform town.note(me, did->>'chore', town.hand_of(purse),
      case did->>'chore' when 'pour' then (did->>'well')::numeric - well when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric
        + (case when town.has_buff(purse, now_, 'carry') then (town.wishing()->>'carry')::numeric else 0 end) else well - (did->>'well')::numeric end,
      0, jsonb_build_object('well', did->'well'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well));
end;
$$;

-- The well's book (lib/town/well's seen): as the database has it, but that a filling takes as many bucketfuls of the
-- oldest water as it took of the well.
create or replace function town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
returns void language plpgsql set search_path = public
as $$
declare
  v_n integer;
  v_lot bigint;
  v_lot_by uuid;
  v_from uuid;
  v_lot_has integer;
  v_can text;
  v_carrier uuid;
  v_waterings integer;
  v_owner uuid;
  v_x integer;
  v_y integer;
  v_to uuid;
  v_hands uuid[];
  v_most integer;
  v_kind text;
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
    -- (water with a nature gives it to the well for a while)
    select l.kind into v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    if v_kind is not null then
      perform town.keep_thing('well_water', coalesce(town.well_poured(town.thing('well_water', true), v_kind, v_n, p_member, p_at), 'null'::jsonb));
    end if;
  elsif p_what in ('ditch', 'yard') then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 or (p_what = 'ditch' and p_thing is null) then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    if p_what = 'ditch' then
      insert into public.town_well_cans (member_id, item, carrier, waterings)
        values (p_member, p_thing, p_member, greatest(0, floor(coalesce((p_doc->>'plants')::numeric, 0))::integer))
        on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
    else
      insert into public.town_yard_water (member_id, buckets) values (p_member, v_n);
    end if;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
  elsif p_what = 'line' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
  elsif p_what = 'draw' then
    if p_thing is not null then
      delete from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
      -- (the nature of the moment it was drawn at, when it has one: nobody's hands are on it yet)
      v_kind := town.water_kind(p_at);
      if v_kind is not null then
        insert into public.town_line_water (member_id, item, hands, kind) values (p_member, p_thing, '{}', v_kind);
      end if;
    end if;
  elsif p_what = 'pass' then
    v_to := (p_doc->>'to')::uuid;
    if p_thing is null or v_to is null or p_doc->>'into' is null or floor(coalesce(p_n, 0)) <= 0 then return; end if;
    select l.hands, l.kind into v_hands, v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    -- (whoever takes it is the last of them, once; only the last so many are remembered; a bucket nobody's hands were on yet begins with its giver's)
    v_hands := array_remove(case when coalesce(cardinality(v_hands), 0) = 0 then array[p_member] else v_hands end, v_to) || v_to;
    v_most := (town.cat('line')->>'hands')::integer;
    if array_length(v_hands, 1) > v_most then v_hands := v_hands[array_length(v_hands, 1) - v_most + 1:]; end if;
    -- (the water's nature goes with it)
    insert into public.town_line_water (member_id, item, hands, kind) values (v_to, p_doc->>'into', v_hands, v_kind)
      on conflict (member_id, item) do update set hands = excluded.hands, kind = excluded.kind;
  elsif p_what = 'fresh' then
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_yard_water w order by w.id limit 1 for update;
    if v_lot is null then return; end if;
    if v_lot_has > 1 then update public.town_yard_water w set buckets = w.buckets - 1 where w.id = v_lot;
    else delete from public.town_yard_water w where w.id = v_lot; end if;
    if v_lot_by is null or v_lot_by = p_member then return; end if;
    insert into public.town_yard_reach (day, carrier, cook, n) values (town.day_of(p_at), v_lot_by, p_member, 1)
      on conflict (day, carrier, cook) do update set n = public.town_yard_reach.n + 1;
  elsif p_what = 'fill' then
    if p_thing is null then return; end if;
    -- (so many bucketfuls of the oldest water there is: as many as the filling took of the well, one where the deed
    --  says none; the can's water is of whoever carried the oldest of them)
    for v_i in 1..greatest(1, floor(coalesce(p_n, 1))::integer) loop
      select w.id, w.member_id, w.buckets into v_lot, v_from, v_lot_has from public.town_well_water w order by w.id limit 1 for update;
      exit when v_lot is null;
      if v_i = 1 then v_lot_by := v_from; end if;
      if v_lot_has > 1 then update public.town_well_water w set buckets = w.buckets - 1 where w.id = v_lot;
      else delete from public.town_well_water w where w.id = v_lot; end if;
    end loop;
    insert into public.town_well_cans (member_id, item, carrier, waterings)
      values (p_member, p_thing, v_lot_by, coalesce((town.cat('farming')->'cans'->>p_thing)::integer, 0))
      on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
  elsif p_what = 'water' then
    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);
    if jsonb_typeof(p_doc->'tile') = 'array' then
      v_x := (p_doc->'tile'->>0)::integer;
      v_y := (p_doc->'tile'->>1)::integer;
    end if;
    if v_owner <> p_member and v_x is not null then
      -- (a plant of somebody else's than the one the plot's helpers helped: theirs are forgotten)
      delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
      insert into public.town_plot_help (x, y, helper, owner, water) values (v_x, v_y, p_member, v_owner, 1)
        on conflict (x, y, helper) do update set water = public.town_plot_help.water + 1;
    end if;
    v_can := p_doc->>'with';
    if v_can is null then return; end if;
    select c.carrier, c.waterings into v_carrier, v_waterings from public.town_well_cans c where c.member_id = p_member and c.item = v_can for update;
    if v_waterings is null or v_waterings <= 0 then return; end if;
    update public.town_well_cans c set waterings = c.waterings - 1 where c.member_id = p_member and c.item = v_can;
    if v_carrier is null or v_carrier = v_owner or v_x is null then return; end if;
    insert into public.town_well_reach (day, carrier, x, y, owner, n)
      values (town.day_of(p_at), v_carrier, v_x, v_y, v_owner, 1)
      on conflict (day, carrier, x, y) do update set n = public.town_well_reach.n + 1, owner = excluded.owner;
    delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
    insert into public.town_plot_help (x, y, helper, owner, carry) values (v_x, v_y, v_carrier, v_owner, 1)
      on conflict (x, y, helper) do update set carry = public.town_plot_help.carry + 1;
  elsif p_what = 'sow' then
    if jsonb_typeof(p_doc->'tile') = 'array' then
      delete from public.town_plot_help h where h.x = (p_doc->'tile'->>0)::integer and h.y = (p_doc->'tile'->>1)::integer;
    end if;
  end if;
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
