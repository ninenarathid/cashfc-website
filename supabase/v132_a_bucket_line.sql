-- v132 — a bucket line
--
-- Run this once in the Supabase SQL editor, after v130. Running it again is
-- safe.
--
-- The fourth round for the members who carry water for the others (the owner,
-- 2026-10-05: "a bucket line of three or more", one of nine things thought of
-- for them; and his rule for the town, that its games should need several
-- people so that they talk).
--
-- Water is drawn at the river, in the town; the well is on the farm, through
-- the gate: a minute's walk a bucketful. A line spares the walk. Somebody with
-- water in the bucket they hold hands it on to somebody who holds an empty one
-- and stands within sight (forty tiles as the path goes: two cannot reach
-- from the river to the well, three can): the water is in the other's bucket
-- at once, and they hand it on in their turn, or pour it where they stand.
--
--   · Handing on costs a stamina, and nothing else.
--   · **Everybody whose hands the water went through has carried it**: when
--     it is poured (into the well, over a bed, into the yard's jar), each of
--     them is counted a bucketful, as the one who pours is: their rank, the
--     day's carriers in the well's book, their work at the jar by the well.
--     Whose water it was, for the thanks and for what the book says came of
--     it, is still the pourer's.
--   · The database cannot know where anybody stands (nothing of the game's
--     can: the room is the page's), so how near the two are is the page's to
--     hold to, like who stands at a stove beside a cook. What it holds to
--     itself: that both are members whose game is open, that the one holds a
--     bucket with water and the other an empty one.
--
-- `town_line_water` has, for the water in a bucket somebody holds, whose
-- hands it has been through. The well's reader (v127's, v129's, v130's own)
-- is written again to keep it: a bucket drawn begins with nobody; one handed
-- on carries its hands with it; one poured counts for each of them, by a line
-- of the deeds written for each (`line`), which the book and the jar read as
-- they read a bucketful poured.
--
-- **None of the game's functions is written again.** The rule is
-- lib/town/line.ts written again (`town.pass`), held to the code case by case
-- by the dry run; its numbers are the catalog's row `line`.
--
-- **The code goes out before this file**: a page built before offers no
-- handing on (and loses nothing by it).

/* ── v130 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.yard_freshen(jsonb, text, integer)') is null or to_regclass('public.town_yard_water') is null then
    raise exception 'v130 has not run yet: the line stands on the well''s book as that file left it';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v132> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('line', $town${
    "reach": 40,
    "cost": 1,
    "hands": 8
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v132>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- Whose hands the water in a bucket has been through: by who holds the bucket
-- and which it is, the hands in the order it came by them (the holder last).
-- A bucket drawn at the river has no line here: nobody's hands but its own.
create table if not exists public.town_line_water (
  member_id uuid not null references public.profiles (id) on delete cascade,
  item      text not null,
  hands     uuid[] not null default '{}',
  primary key (member_id, item)
);
alter table public.town_line_water enable row level security;
revoke all on public.town_line_water from anon, authenticated;

/* ── the rule: lib/town/line.ts, written again ───────────────────────────── */

-- Hand the water in the bucket one holds on into the empty bucket the other
-- holds: as much as it carries; what it does not stays. Costs whoever hands
-- it on a stamina.
create or replace function town.pass(p_from jsonb, p_to jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_from);
  theirs text := town.hand_of(p_to);
  slot integer;
  has integer;
  into_ integer;
  n integer;
begin
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, has from jsonb_array_elements(p_from->'bag') with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  if theirs is null or not (f->'buckets' ? theirs) then return town.no('none'); end if;
  select (x.ord - 1)::int into into_ from jsonb_array_elements(p_to->'bag') with ordinality x(s, ord)
   where x.s->>'item' = theirs and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
  if into_ is null then return town.no('full'); end if;
  n := least(has, (f->'buckets'->>theirs)::int);
  return jsonb_build_object('ok', true, 'n', n, 'can', hand, 'into', theirs,
    'from', town.spend(p_from, (town.cat('line')->>'cost')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_from->'bag', array[slot::text],
           case when has > n then jsonb_build_object('item', hand, 'n', 1, 'water', has - n) else jsonb_build_object('item', hand, 'n', 1) end)),
    'to', p_to || jsonb_build_object('bag', jsonb_set(p_to->'bag', array[into_::text], jsonb_build_object('item', theirs, 'n', 1, 'water', n))));
end;
$$;

/* ── the well's book: its line reader, with the hands ────────────────────── */

-- Everybody else whose hands the water in a bucket went through is counted so
-- many bucketfuls: a line of the deeds for each, at the moment it was poured.
-- (Only those who are still here: a line for somebody gone could not be
-- written.)
create or replace function town.line_counted(p_member uuid, p_thing text, p_n integer, p_at bigint, p_into text)
returns void language sql set search_path = public
as $$
  insert into public.town_deeds (member_id, at, what, thing, n, doc)
    select h.id, to_timestamp(p_at / 1000.0), 'line', p_thing, p_n, jsonb_build_object('by', p_member, 'into', p_into)
      from public.town_line_water l, unnest(l.hands) with ordinality h(id, ord) join public.profiles pr on pr.id = h.id
     where l.member_id = p_member and l.item = p_thing and h.id <> p_member and p_n > 0
     order by h.ord
$$;

-- v130's, word for word but for: a bucket drawn begins with nobody's hands on
-- it; one handed on (`pass`) carries its hands with it, the taker last; one
-- poured (into the well, over a bed, into the yard's jar) counts for each of
-- the others too, by a line written for each (`line`), which counts towards
-- their rank as it is read.
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
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
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
    if p_thing is not null then delete from public.town_line_water l where l.member_id = p_member and l.item = p_thing; end if;
  elsif p_what = 'pass' then
    v_to := (p_doc->>'to')::uuid;
    if p_thing is null or v_to is null or p_doc->>'into' is null or floor(coalesce(p_n, 0)) <= 0 then return; end if;
    select l.hands into v_hands from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    -- (whoever takes it is the last of them, once; only the last so many are remembered)
    v_hands := array_remove(coalesce(v_hands, array[p_member]), v_to) || v_to;
    v_most := (town.cat('line')->>'hands')::integer;
    if array_length(v_hands, 1) > v_most then v_hands := v_hands[array_length(v_hands, 1) - v_most + 1:]; end if;
    insert into public.town_line_water (member_id, item, hands) values (v_to, p_doc->>'into', v_hands)
      on conflict (member_id, item) do update set hands = excluded.hands;
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

-- The book as a member reads it (v130's), but for: what was carried today,
-- and today's carriers, count the bucketfuls that went through somebody's
-- hands in a line with those they poured themselves.
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
    'carriers', v_carriers);
end;
$$;

-- What each did for the others between two rounds (v130's), but for: a
-- bucketful that went through one's hands in a line counts as one poured.
create or replace function town.jar_work(p_from integer, p_to integer)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_array(q.member_id, q.w) order by q.id_text), '[]'::jsonb)
    from (
      select d.member_id, d.member_id::text collate "C" as id_text,
             sum(case when d.what in ('pour', 'yard', 'line') then floor(d.n) * (town.cat('jar')->>'bucket')::integer else 1 end)::integer as w
        from public.town_deeds d
       where d.at >= to_timestamp(town.round_from(p_from) / 1000.0) and d.at < to_timestamp(town.round_from(p_to) / 1000.0)
         and d.member_id is not null
         and ((d.what in ('pour', 'yard', 'line') and d.n >= 1) or (d.what = 'water' and d.doc ? 'whose'))
       group by d.member_id
    ) q
   where q.w > 0
$$;

-- The tally's words for the two new lines: `town.deed_th` as it stands, with
-- two `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('pass') = 'pass' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''pass'' then ''ส่งถังน้ำต่อให้คนถัดไป'' when ''line'' then ''น้ำที่ช่วยกันส่งต่อมาถึงที่'' else p_what end');
  end if;
end $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- Hand the water in the bucket I hold on to somebody: into the empty bucket
-- they hold.
create or replace function public.town_pass(p_to uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there: a proved character, or an admin)
  if p_to is null or p_to = me or not exists (
       select 1 from public.town_purses pp join public.profiles p on p.id = pp.member_id
        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who hand to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.pass(mine, theirs, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'from');
    perform town.keep_purse(p_to, did->'to');
    perform town.note(me, 'pass', did->>'can', (did->>'n')::numeric, 0, jsonb_build_object('to', p_to, 'into', did->>'into'));
  end if;
  return town.answer(me, did - 'from' - 'to');
end;
$$;

-- Everybody who has a rank, who has thanked me today, and the yard's jar
-- (v130's); and that there is a line, which is how a page comes to offer one.
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
    'line', true);
end;
$$;

revoke execute on function public.town_pass(uuid) from public, anon;
revoke execute on function public.town_well_ranks() from public, anon;
grant execute on function public.town_pass(uuid) to authenticated;
grant execute on function public.town_well_ranks() to authenticated;

/* ── the trigger reads a bucket drawn, one handed on, and a line counted ─── */

do $$
begin
  lock table public.town_deeds in share row exclusive mode;
  drop trigger if exists town_deeds_well on public.town_deeds;
  create trigger town_deeds_well after insert on public.town_deeds
    for each row when (new.what in ('pour', 'fill', 'water', 'sow', 'ditch', 'yard', 'fresh', 'draw', 'pass', 'line')) execute function town.well_deed();
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_line_water' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relname = 'town_line_water' and c.relnamespace = 'public'::regnamespace;
--   -- t | 0
--
--   select has_function_privilege('anon', 'public.town_pass(uuid)', 'execute') as anon, has_function_privilege('authenticated', 'public.town_pass(uuid)', 'execute') as member;
--   -- f | t
--
--   select pg_get_triggerdef(oid) like '%''pass''%' as reads_a_pass from pg_trigger where tgname = 'town_deeds_well';
--   -- t
--
--   select town.cat('line') as line, town.deed_th('pass') as pass, town.deed_th('line') as line_th;
--   -- {"cost": 1, "hands": 8, "reach": 40} | ส่งถังน้ำต่อให้คนถัดไป | น้ำที่ช่วยกันส่งต่อมาถึงที่
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- every bucket handed on: from whom to whom, how many bucketfuls
--   select d.at, a.character_name as from_, b.character_name as to_, d.thing, d.n
--     from public.town_deeds d join public.profiles a on a.id = d.member_id left join public.profiles b on b.id = (d.doc->>'to')::uuid
--    where d.what = 'pass' order by d.id desc limit 50;
--
--   -- whose hands the water in each bucket has been through
--   select p.character_name as holder, l.item, (select array_agg(h.character_name order by o.ord) from unnest(l.hands) with ordinality o(id, ord) join public.profiles h on h.id = o.id) as hands
--     from public.town_line_water l join public.profiles p on p.id = l.member_id;
--
--   -- the bucketfuls each was counted for standing in a line, by day
--   select (d.at at time zone 'Asia/Bangkok')::date as day, p.character_name, sum(d.n) as bucketfuls
--     from public.town_deeds d join public.profiles p on p.id = d.member_id where d.what = 'line' group by 1, 2 order by 1 desc, 3 desc;
