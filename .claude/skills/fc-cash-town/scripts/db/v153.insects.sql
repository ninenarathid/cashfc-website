-- v153, the insects' line: the gifts of its ranks 2 to 6 (lib/town/insects.ts, lib/town/gifts.ts). Tried on top of
-- v153.shared.sql (try-line.mjs). The catalog's rows `gifts` and `insects` are written over by the file this is put
-- together into: the butterfly's number is a half, and `insects` has `nectar`.
--
-- New: town.nectar_haunt, town.nectar, town.rid_by, town.net_mine; public.town_nectar, public.town_net_mine.

-- ── a drop of nectar (the third rank's thing) ──────────────────────────────

-- The haunt a drop on a tile calls from (lib/town/insects.ts's nectarHaunt): of the map the tile is on, among the
-- kinds of haunt a drop calls from, the one a perch of which is nearest (the lower number, of two as near). Null off
-- the maps.
create or replace function town.nectar_haunt(p_x integer, p_y integer, p_cat jsonb default null)
returns integer language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  k jsonb := ins->'nectar';
  place text;
  h jsonb;
  best integer := null;
  least_ double precision := null;
  d double precision;
  i integer;
begin
  if p_x is null or p_y is null or k is null then return null; end if;
  select m.v->>0 into place from jsonb_array_elements(k->'maps') with ordinality m(v, ord)
   where p_x >= (m.v->>1)::int and p_x < (m.v->>1)::int + (m.v->>3)::int and p_y >= (m.v->>2)::int and p_y < (m.v->>2)::int + (m.v->>4)::int
   order by m.ord limit 1;
  if place is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when h->>1 <> place or not k->'at' ? (h->>0);
    select min(((p->>0)::double precision - p_x - 0.5) * ((p->>0)::double precision - p_x - 0.5)
             + ((p->>1)::double precision - p_y - 0.5) * ((p->>1)::double precision - p_y - 0.5)) into d
      from jsonb_array_elements(h->3) p;
    if d is not null and (least_ is null or d < least_) then least_ := d; best := i; end if;
  end loop;
  return best;
end;
$$;

-- Put a drop down (lib/town/insects.ts's nectar): the purse with a drop used and what it brings kept in it (`lured`),
-- or why not: no nectar to one's name or none left today (town.gift_use's words), one out already, nothing about to
-- call. Which insect: one of the kinds the haunt would have at that very moment, by their weights there, each
-- weighed down by how scarce its kind has been hunted (town.plenty); p_r1, how many a catch gives by p_r2, how soon
-- it comes by p_r3.
create or replace function town.nectar(p_purse jsonb, p_x integer, p_y integer, p_now bigint, p_r1 double precision, p_r2 double precision, p_r3 double precision,
  p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  k jsonb := ins->'nectar';
  used jsonb := town.gift_use(p_purse, 'thingNectar', p_now);
  ids jsonb := ins->'order';
  hid integer;
  h jsonb;
  bug jsonb;
  may text[] := '{}';
  ws double precision[] := '{}';
  w double precision;
  total double precision := 0;
  left_ double precision;
  pick text;
  lo integer;
  hi integer;
  n integer;
  from_ bigint;
  lured jsonb;
  i integer;
begin
  if not (used->>'ok')::boolean then return used; end if;
  if jsonb_typeof(p_purse->'lured'->'until') = 'number' and (p_purse->'lured'->>'until')::numeric > p_now then return town.no('out'); end if;
  hid := town.nectar_haunt(p_x, p_y, ins);
  if hid is null then return town.no('quiet'); end if;
  h := ins->'haunts'->hid;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>i, h->>1, h->>2, p_now, word) then
      w := (bug->>'weight')::double precision * town.plenty(ids->>i, p_now, ins);
      may := may || (ids->>i);
      ws := ws || w;
      total := total + w;
    end if;
  end loop;
  if not coalesce(total > 0, false) then return town.no('quiet'); end if;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r1, 0))) * total;
  for i in 1..array_length(may, 1) loop
    pick := may[i];
    left_ := left_ - ws[i];
    exit when left_ < 0;
  end loop;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  n := lo + least(hi - lo, greatest(0, floor(least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * (hi - lo + 1))::int));
  from_ := p_now + floor(((k->>'soon')::double precision + least(0.999999::double precision, greatest(0::double precision, coalesce(p_r3, 0)))
             * ((k->>'within')::double precision - (k->>'soon')::double precision)) * 1000)::bigint;
  lured := jsonb_build_object('x', p_x, 'y', p_y, 'haunt', hid, 'bug', pick, 'n', n, 'from', from_, 'until', from_ + (k->>'stays')::bigint * 1000,
    'seed', (hid::bigint * 100003 + p_now / 1000) % 2147483647);
  return jsonb_build_object('ok', true, 'purse', (used->'purse') || jsonb_build_object('lured', lured), 'lured', lured, 'left', used->'left');
end;
$$;

-- A drop of nectar where I stand: what it brings is drawn here, kept in my purse, and written down.
create or replace function public.town_nectar(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb := town.nectar(purse, p_x, p_y, now_, random(), random(), random());
  h jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    h := town.cat('insects')->'haunts'->((did->'lured'->>'haunt')::int);
    perform town.note(me, 'nectar', did->'lured'->>'bug', (did->'lured'->>'n')::numeric, 0, jsonb_build_object(
      'haunt', (did->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$$;
revoke execute on function public.town_nectar(integer, integer) from public, anon;
grant execute on function public.town_nectar(integer, integer) to authenticated;

-- ── an insect that is one member's alone and no haunt's ────────────────────

-- A ladybird caught, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it. The
-- block of public.town_net (v126's, as v145 left it) as a function of its own, for a catch that is no haunt's: the
-- same chance (the insect's `rids`), the same pick among the plots with a pest on them at this moment
-- (town.rid_pick), the plot written under its bed's lock, only its plant's `cured` and its `changed`. Null when
-- nothing was rid; else the plot's tile, and the plot as it is now.
create or replace function town.rid_by(p_bug text, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  chance double precision := coalesce((town.cat('insects')->'bugs'->p_bug->>'rids')::double precision, 0);
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
begin
  if not (chance > 0 and random() < chance) then return null; end if;
  rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                          from public.town_plots p where p.plant is not null), p_now, random());
  if rid is null then return null; end if;
  rid_x := split_part(rid, ',', 1)::int;
  rid_y := split_part(rid, ',', 2)::int;
  perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
  select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
  if rid_plant is null or town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), p_now, 0) is null then return null; end if;
  rid_plant := rid_plant || jsonb_build_object('cured', p_now);
  update public.town_plots set plant = rid_plant, changed = p_now where x = rid_x and y = rid_y;
  return jsonb_build_object('rid', rid, 'soil', rid_soil, 'plant', rid_plant);
end;
$$;

-- Catch an insect that is mine alone (lib/town/insects.ts's netMine): the one come to my drop of nectar ('lured'),
-- there from when it came until it is off again. As a haunt's is caught (town.net): with a net in the hand, from near
-- enough the drop, with room in the bag, for its stamina and a point a miss up to so many. The drop is done with.
create or replace function town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  reach double precision := (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  return jsonb_build_object('ok', true,
    'purse', town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n), 'lured', null),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;

-- The same, for a member: the catch kept, the first of its kind written in the village's book, a ladybird's doing,
-- and the deed written down as a catch like any (`net`: it counts against its kind and on the line), with where the
-- insect was from (`nectar`: the haunt its drop called from).
create or replace function public.town_net_mine(p_which text, p_x integer, p_y integer, p_misses numeric default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  did jsonb;
  bug text;
  h jsonb;
  book jsonb;
  is_first boolean := false;
  rid jsonb := null;
begin
  if p_which is null or p_which not in ('lured') then return town.answer(me, town.no('none')); end if;
  did := town.net_mine(purse, p_which, town.hand_of(purse), p_x, p_y, misses, now_);
  if (did->>'ok')::boolean then
    bug := did->'got'->0->>0;
    perform town.keep_purse(me, did->'purse');
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    rid := town.rid_by(bug, now_);
    h := ins->'haunts'->((purse->'lured'->>'haunt')::int);
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int)
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$$;
revoke execute on function public.town_net_mine(text, integer, integer, numeric) from public, anon;
grant execute on function public.town_net_mine(text, integer, integer, numeric) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;
