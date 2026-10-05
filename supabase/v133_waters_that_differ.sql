-- v133 — waters that differ
--
-- Run this once in the Supabase SQL editor, after v132. Running it again is
-- safe.
--
-- The fifth round for the members who carry water for the others (the owner,
-- 2026-10-05: "waters that differ: dawn, rain, a full moon … nothing told,
-- the well changes its look", one of nine things thought of for them; and his
-- rule for the town: keep things secret, and leave a way to feel towards the
-- answer).
--
-- Water is not all one water. What is drawn at certain moments has a nature:
-- the rain's, while it rains; the dew's, from five to seven in the morning;
-- the moon's, on a night when the moon is full (as the fish know it: v122's
-- sign). Carried to the farm and poured into the well, it gives the well its
-- nature for a while: half an hour a bucketful, two hours at the most;
-- another nature poured in takes its place; plain water changes nothing. And
-- while the well has a nature, every watering on the farm has it:
--
--   · the dew's: a watering does as much again;
--   · the rain's: half as much again;
--   · the moon's: the plant is kept from pests for twelve hours.
--
-- So a carrier who is up at dawn, or out in the rain, or about on the right
-- night, brings the whole farm something no can holds, and the well's book
-- says whose doing it is. Nothing says what each water does.
--
-- How it is kept: a bucket's water has its nature beside the hands it came by
-- (`town_line_water.kind`: worked out as the line of a bucket drawn is read,
-- carried along as it is handed on); the well's is one row of `town_things`
-- (`well_water`: which, until when, by whom), written as a bucket with a
-- nature is poured in; and a watering has it as its plot is kept, by the
-- trigger that keeps the heat (v130's, written again). Only the well takes a
-- nature: poured over a bed or into the yard's jar it is plain water.
--
-- **None of the game's functions is written again.** The rules are
-- lib/town/waters.ts written again, held to the code case by case by the dry
-- run; their numbers are the catalog's row `waters`.
--
-- **The code goes out before this file**: a page built before shows nothing
-- of it (and loses nothing by it).

/* ── v132 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.pass(jsonb, jsonb, bigint)') is null or to_regclass('public.town_line_water') is null then
    raise exception 'v132 has not run yet: a bucket''s water is kept where the hands it came by are';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v133> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('waters', $town${
    "dawn": [5,7],
    "night": [19,5],
    "lasts": 30,
    "most": 120,
    "adds": {"dawn":1,"rain":0.5,"moon":0},
    "guards": {"dawn":0,"rain":0,"moon":12}
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v133>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- The nature of the water in a bucket, beside the hands it came by: none, for
-- plain water. (A bucket drawn with a nature has a line here though nobody's
-- hands but its drawer's are on it: its `hands` are empty.)
alter table public.town_line_water add column if not exists kind text;

-- The well's water when a nature was last poured into it: which, until when,
-- by whom. Nothing, until some is.
insert into public.town_things (key, doc) values ('well_water', 'null'::jsonb) on conflict (key) do nothing;

/* ── the rules: lib/town/waters.ts, written again ────────────────────────── */

-- The nature of water drawn at a moment: the rain's while it rains, whatever
-- the hour; else the dew's in the early morning; else the moon's on a night
-- the moon is full; else none.
create or replace function town.water_kind(p_at bigint)
returns text language sql stable set search_path = public
as $$
  select case
    when town.raining(p_at) then 'rain'
    when town.hour_at(p_at) >= (w.k->'dawn'->>0)::double precision and town.hour_at(p_at) < (w.k->'dawn'->>1)::double precision then 'dawn'
    when (town.hour_at(p_at) >= (w.k->'night'->>0)::double precision or town.hour_at(p_at) < (w.k->'night'->>1)::double precision) and town.full_moon(p_at) then 'moon'
  end
    from (select town.cat('waters') as k) w
$$;

-- The well after so many bucketfuls of a nature are poured in at a moment:
-- more of the nature it has keeps it longer, to the most from now; another
-- takes its place; plain water, or none, changes nothing (a nature that has
-- run out is none).
create or replace function town.well_poured(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', least(p_now + (k->>'most')::bigint * 60000, v_from + p_n::bigint * (k->>'lasts')::bigint * 60000));
end;
$$;

-- The well's water as a page is told of it: its nature while it has one
-- (which, until when, by whom), or nothing.
create or replace function town.well_water_told(p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select case when jsonb_typeof(t.doc) = 'object' and (t.doc->>'until')::bigint > p_now then t.doc else 'null'::jsonb end
    from (select (select x.doc from public.town_things x where x.key = 'well_water') as doc) t
$$;

-- A plot as it is kept (v130's, written again): when what is written is a
-- watering (the same plant, watered at this moment and not before), what it
-- added is added again for the heat and for the nature of the well's water,
-- and under the moon's the plant is kept from pests. Whatever goes wrong
-- here, the row is kept as it was written.
create or replace function town.plot_heat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  added double precision;
  more double precision := 0;
  w jsonb;
  k jsonb;
  hours double precision;
begin
  begin
    if new.plant is not null and old.plant is not null and jsonb_typeof(new.plant) = 'object' and jsonb_typeof(old.plant) = 'object'
       and (new.plant->>'sown') = (old.plant->>'sown')
       and (new.plant->>'watered')::bigint = new.changed and (old.plant->>'watered')::bigint < new.changed then
      added := (new.plant->>'boost')::double precision - (old.plant->>'boost')::double precision;
      if added > 0 then
        if town.hot(new.changed) then more := more + (town.cat('heat')->>'by')::double precision; end if;
        w := town.well_water_told(new.changed);
        if jsonb_typeof(w) = 'object' then
          k := town.cat('waters');
          more := more + coalesce((k->'adds'->>(w->>'kind'))::double precision, 0);
          hours := coalesce((k->'guards'->>(w->>'kind'))::double precision, 0);
          if hours > 0 then
            new.plant := new.plant || jsonb_build_object('guard', greatest((new.plant->>'guard')::bigint, new.changed + (hours * 3600000)::bigint));
          end if;
        end if;
        if more > 0 then
          new.plant := new.plant || jsonb_build_object('boost', (new.plant->>'boost')::double precision + added * more);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'the heat and the well''s water missed plot %,%: %', new.x, new.y, sqlerrm;
  end;
  return new;
end;
$$;

/* ── the well's book: its line reader, with the nature of the water ──────── */

-- v132's, word for word but for: a bucket drawn has the nature of its moment
-- beside it, or none; one handed on carries its nature with its hands; one
-- poured into the well gives the well its nature.
create or replace function town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
returns void language plpgsql set search_path = public
as $$
declare
  v_n integer;
  v_lot bigint;
  v_lot_by uuid;
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
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_well_water w order by w.id limit 1 for update;
    if v_lot is not null then
      if v_lot_has > 1 then update public.town_well_water w set buckets = w.buckets - 1 where w.id = v_lot;
      else delete from public.town_well_water w where w.id = v_lot; end if;
    end if;
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

-- The book as a member reads it (v132's), and, while the well's water has a
-- nature, what it is: which, until when, and whose doing, by name.
create or replace function town.well_book(p_member uuid, p_now bigint)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  w jsonb := town.cat('well');
  v_day integer := town.day_of(p_now);
  v_from timestamptz := to_timestamp((v_day::bigint * 86400000 - 7 * 3600000::bigint + (town.cat('rules')->>'dawn')::integer * 3600000::bigint) / 1000.0);
  v_till timestamptz := v_from + interval '1 day';
  v_buckets integer := 0;
  v_taken integer[] := '{}';
  v_today integer;
  v_waterings integer;
  v_plants integer;
  v_people integer;
  v_watered integer;
  v_helped integer;
  v_pots integer;
  v_cooks integer;
  v_carriers jsonb;
  v_water jsonb := town.well_water_told(p_now);
begin
  select c.buckets, c.taken into v_buckets, v_taken from public.town_carriers c where c.member_id = p_member;
  v_buckets := coalesce(v_buckets, 0);
  v_taken := coalesce(v_taken, '{}');
  select coalesce(sum(floor(d.n)), 0)::integer into v_today
    from public.town_deeds d where d.member_id = p_member and d.at >= v_from and d.at < v_till and d.n >= 1
     and (d.what in ('pour', 'yard', 'line') or (d.what = 'ditch' and d.thing is not null));
  select coalesce(sum(r.n), 0)::integer, count(*)::integer, count(distinct r.owner)::integer into v_waterings, v_plants, v_people
    from public.town_well_reach r where r.day = v_day and r.carrier = p_member;
  select count(*)::integer, count(distinct d.doc->>'whose')::integer into v_watered, v_helped
    from public.town_deeds d where d.member_id = p_member and d.what = 'water' and d.at >= v_from and d.at < v_till and d.doc ? 'whose';
  select coalesce(sum(r.n), 0)::integer, count(*)::integer into v_pots, v_cooks
    from public.town_yard_reach r where r.day = v_day and r.carrier = p_member;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name, 'buckets', q.buckets, 'rank', town.well_rank(q.total)) order by q.first_at, q.id_text), '[]'::jsonb)
    into v_carriers
    from (
      select t.member_id, t.buckets, t.first_at, t.member_id::text collate "C" as id_text,
             coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name, coalesce(c.buckets, 0) as total
        from (select d.member_id, sum(floor(d.n))::integer as buckets, min(d.at) as first_at
                from public.town_deeds d
               where d.at >= v_from and d.at < v_till and d.n >= 1 and d.member_id is not null
                 and (d.what in ('pour', 'yard', 'line') or (d.what = 'ditch' and d.thing is not null))
               group by d.member_id) t
        join public.profiles pr on pr.id = t.member_id
        left join public.town_carriers c on c.member_id = t.member_id
       order by t.first_at, t.member_id::text collate "C"
       limit (w->>'listed')::integer
    ) q;
  return jsonb_build_object(
    'buckets', v_buckets, 'rank', town.well_rank(v_buckets), 'towards', town.well_towards(v_buckets), 'gift', town.well_due(v_buckets, v_taken) is not null,
    'today', jsonb_build_object('buckets', v_today, 'waterings', v_waterings, 'plants', v_plants, 'people', v_people, 'watered', v_watered, 'helped', v_helped)
      || case when v_cooks > 0 then jsonb_build_object('pots', v_pots, 'cooks', v_cooks) else '{}'::jsonb end,
    'carriers', v_carriers)
    || case when jsonb_typeof(v_water) = 'object' then jsonb_build_object('water', v_water || jsonb_build_object('name',
         coalesce((select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') from public.profiles pr where pr.id = (v_water->>'by')::uuid), ''))) else '{}'::jsonb end;
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The well's book, as I read it (v130's), and what the well's water is now.
create or replace function public.town_well()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  -- (what the book no longer reads is thrown away as it is opened: a week of days is kept)
  delete from public.town_well_reach r where r.day < town.day_of(now_) - 7;
  delete from public.town_yard_reach r where r.day < town.day_of(now_) - 7;
  perform town.jar_now(now_);
  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_, 'thanks', town.thanks_board(me, now_), 'jar', town.jar_told(me, now_),
    'wellWater', town.well_water_told(now_));
end;
$$;

-- Everybody who has a rank, who has thanked me today, the yard's jar and that
-- there is a line (v132's); and what the well's water is now, which is how a
-- page comes to show it (and to know that waters differ).
create or replace function public.town_well_ranks()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(),
    'ranks', (select coalesce(jsonb_object_agg(c.member_id::text, town.well_rank(c.buckets)), '{}'::jsonb)
                from public.town_carriers c where town.well_rank(c.buckets) > 0),
    'thanked', town.thanks_board(me, town.now_ms())->'today',
    'yard', jsonb_build_object('jar', coalesce((select (t.doc #>> '{}')::integer from public.town_things t where t.key = 'yard'), 0)),
    'line', true,
    'wellWater', town.well_water_told(town.now_ms()));
end;
$$;

revoke execute on function public.town_well() from public, anon;
revoke execute on function public.town_well_ranks() from public, anon;
grant execute on function public.town_well() to authenticated;
grant execute on function public.town_well_ranks() to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select column_name, data_type from information_schema.columns where table_schema = 'public' and table_name = 'town_line_water' order by ordinal_position;
--   -- member_id uuid | item text | hands ARRAY | kind text
--
--   select key, doc from public.town_things where key = 'well_water';
--   -- well_water | null        (until somebody pours water with a nature into the well)
--
--   select town.cat('waters') as waters;
--   -- {"adds": {"dawn": 1, "moon": 0, "rain": 0.5}, "dawn": [5, 7], "most": 120, "lasts": 30, "night": [19, 5], "guards": {"dawn": 0, "moon": 12, "rain": 0}}
--
--   select town.water_kind(town.now_ms()) as drawn_now, town.well_water_told(town.now_ms()) as the_well;
--   -- rain while it rains, dawn from five to seven, moon on a night of the full moon, else nothing | null
--
--   select has_function_privilege('authenticated', 'town.water_kind(bigint)', 'execute') as rule_open, has_function_privilege('authenticated', 'public.town_well_ranks()', 'execute') as ranks;
--   -- f | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- the buckets that hold water with a nature now
--   select p.character_name, l.item, l.kind from public.town_line_water l join public.profiles p on p.id = l.member_id where l.kind is not null;
--
--   -- what the well's water is, and whose doing
--   select t.doc->>'kind' as kind, to_timestamp((t.doc->>'until')::bigint / 1000.0) as until, p.character_name
--     from public.town_things t left join public.profiles p on p.id = (t.doc->>'by')::uuid where t.key = 'well_water';
