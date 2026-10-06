-- v153, the insects' line: the gifts of its ranks 2 to 6 (lib/town/insects.ts, lib/town/gifts.ts). Tried on top of
-- v153.shared.sql (try-line.mjs). The catalog's rows `gifts` and `insects` are written over by the file this is put
-- together into: the butterfly's number is a half, and `insects` has `nectar` and `pair`.
--
-- New: town.nectar_haunt, town.nectar, town.rid_by, town.followed, town.net_mine, town.cloak_at, town.bug_for;
--      public.town_nectar, public.town_net_mine.
-- Written again, each but for the lines named above it: town.net, public.town_bugs, public.town_net.

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
-- it comes by p_r3. For whoever wears the butterfly-wing cloak the insects that have days of their own may come on
-- any day (a kind's `day` is passed over: town.wild_fits is not asked about it).
create or replace function town.nectar(p_purse jsonb, p_x integer, p_y integer, p_now bigint, p_r1 double precision, p_r2 double precision, p_r3 double precision,
  p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  k jsonb := ins->'nectar';
  used jsonb := town.gift_use(p_purse, 'thingNectar', p_now);
  cloak boolean := town.wearing(p_purse, 'charmCloak');
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
    if bug->'at' ? (h->>0) and town.wild_fits(case when cloak then bug - 'day' else bug end, ids->>i, h->>1, h->>2, p_now, word) then
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

-- A purse after a catch, with what follows the insect caught when the butterfly-wing cloak is worn, as the purse was
-- before the catch (lib/town/insects.ts's followed): its kind, how many a catch gives, the tile its catcher stood on,
-- and the moment it is off, the cloak's number of seconds on. Without the cloak, the purse as it is.
create or replace function town.followed(p_before jsonb, p_after jsonb, p_bug text, p_n integer, p_x integer, p_y integer, p_now bigint)
returns jsonb language sql stable
as $$
  select case when town.wearing(p_before, 'charmCloak')
    then p_after || jsonb_build_object('follower', jsonb_build_object('bug', p_bug, 'n', p_n, 'at', jsonb_build_array(p_x, p_y),
      'until', p_now + ((town.cat('gifts')->'gifts'->'charmCloak'->>'by')::numeric * 1000)::bigint))
    else p_after end
$$;

-- Catch an insect that is mine alone (lib/town/insects.ts's netMine): the one come to my drop of nectar ('lured'),
-- there from when it came until it is off again; or the one following an insect I caught under the cloak ('pair'),
-- until its seconds are up and so long past them as the journey may take (the catalog's insects.pair.slack). As a
-- haunt's is caught (town.net): with a net in the hand, from near enough the drop or the place of the first catch,
-- with room in the bag, for its stamina and a point a miss up to so many. The drop is done with, and under the cloak
-- its insect has another following; the one that followed is gone, and has none.
create or replace function town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  reach double precision := (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;

-- The same, for a member: the catch kept, the first of its kind written in the village's book, a ladybird's doing,
-- and the deed written down as a catch like any (`net`: it counts against its kind and on the line), with where the
-- insect was from (`nectar`: the haunt its drop called from; or `pair`: it followed one just caught).
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
  if p_which is null or p_which not in ('lured', 'pair') then return town.answer(me, town.no('none')); end if;
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
    h := case when p_which = 'lured' then ins->'haunts'->((purse->'lured'->>'haunt')::int) end;
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when p_which = 'lured' then jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1) else jsonb_build_object('pair', true) end
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$$;
revoke execute on function public.town_net_mine(text, integer, integer, numeric) from public, anon;
grant execute on function public.town_net_mine(text, integer, integer, numeric) to authenticated;

-- ── the butterfly-wing cloak (the sixth rank's charm) ─────────────────────

-- The rare insects that are out only on some days, out for the cloak's wearer every day (lib/town/insects.ts's
-- cloakAt). What a haunt has in a turn for whoever wears the cloak and for nobody else: the turn rolled as town.bug_at
-- rolls it (the same numbers), but with every insect that has days of its own counted in whatever day it is. Where
-- that roll lands on such an insect on a day that is not its own, and it is plentiful enough, that insect; null
-- everywhere else (the wearer then has what everybody has: town.bug_for). town.bug_at's text, but for: the haunts none
-- of whose insects has a day are passed over at once, town.wild_fits is not asked about a kind's `day`, the pick is
-- kept only if it is such an insect off its day, and the answer says `cloak`.
create or replace function town.cloak_at(p_haunt integer, p_now bigint, p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  ids jsonb := ins->'order';
  bug jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick text := null;
  i integer;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  if not exists (select 1 from jsonb_each(ins->'bugs') b where b.value ? 'day' and b.value->'at' ? (h->>0)) then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug - 'day', ids->>i, h->>1, h->>2, at_, word));
    if fits[i + 1] then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * total;
  for i in 0..jsonb_array_length(ids) - 1 loop
    if fits[i + 1] then
      pick := ids->>i;
      left_ := left_ - (ins->'bugs'->pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  -- only an insect that has days of its own, on a day that is not one of them: on its own day everybody has it
  if not (ins->'bugs'->pick ? 'day') or town.roll(word || ':day:' || pick, town.day_of(at_)::bigint) < (ins->'bugs'->pick->>'day')::double precision then return null; end if;
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase, 'cloak', true);
end;
$$;

-- What a haunt has now for somebody (lib/town/insects.ts's hereFor): with the cloak, the insect that is there for
-- its wearers alone, where there is one; else what it has for everybody (town.bug_here).
create or replace function town.bug_for(p_cloak boolean, p_haunt integer, p_now bigint, p_backs jsonb, p_cat jsonb default null, p_word text default null)
returns jsonb language sql stable
as $$
  select coalesce(case when coalesce(p_cloak, false) then town.cloak_at(p_haunt, p_now, p_cat, p_word) end, town.bug_here(p_haunt, p_now, p_backs, p_cat, p_word))
$$;

-- town.net (v125's, as v152 has it), written again but for its last statement: the purse it gives back goes through
-- town.followed, so that an insect caught under the cloak has another of its kind following (kept in the purse).
CREATE OR REPLACE FUNCTION town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           <= (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)), id, n, p_x, p_y, p_now),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$;

-- public.town_bugs (v131's, as v152 has it), written again but for two lines: whether I wear the cloak is read from
-- my purse as it is kept, and what each haunt has for me is asked of town.bug_for.
CREATE OR REPLACE FUNCTION public.town_bugs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(now_);
  cloak boolean := town.wearing((select p.doc from public.town_purses p where p.member_id = me), 'charmCloak');
  took jsonb;
  has jsonb;
  t jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'haunt' and tk.at > now() - interval '2 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    has := town.bug_for(cloak, i, now_, backs, ins, word);
    continue when has is null;
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, has->>'bug', (has->>'turn')::bigint, (has->>'seed')::bigint, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'bugs', out_,
    'bugsAgain', (select min((x->>'from')::bigint) from jsonb_array_elements(backs) x where (x->>'from')::bigint > now_),
    'book', (select coalesce(jsonb_object_agg(b.key, b.value->>'name'), '{}'::jsonb) from jsonb_each(town.thing('bugs', false)) b));
end;
$function$;

-- public.town_net (v126's, as v152 has it), written again but for two lines: what the haunt has for me is asked of
-- town.bug_for (the cloak's insect, for its wearer), and the deed says `cloak` when it was one.
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random());
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$;

revoke execute on all functions in schema town from public, anon, authenticated;
