-- v129 — thanks at the picking, and a jar at the well
--
-- Run this once in the Supabase SQL editor, after v127. Running it again is
-- safe.
--
-- v127 made the members who carry water seen. This gives the others a way to
-- answer them (the owner, 2026-10-05: they "ไม่ได้รับอะไรตอบแทนเลย"; of the nine
-- things thought of for them he took all nine). Two things:
--
--   · **Thanks.** Each plot remembers who has helped the plant in it since it
--     was sown: who watered it (when it was not their own) and whose water it
--     was watered with. Standing on a plot of one's own, one tap thanks them
--     all. A thanks is a popoto of Cash Town's own, as he settled it before
--     there was a way to give one (2026-10-03: "โยนฟรีวันละ 1 ต่อคู่ นับคะแนนเป็น
--     Popoto จาก cash town (leader board อันใหม่)"): free, one a day from one
--     person to another, counted on a board of the town's own. It is not the
--     site's popoto (`kudos` is not touched) and it is not coins: it buys
--     nothing.
--   · **A jar by the well.** Anybody drops coins into it, or something they
--     grew, caught or cooked. When the uncle's relatives next come by (07:00
--     and 19:00), what is in it is shared out among everybody who worked for
--     the others since: by the bucketfuls they poured (eight waterings' worth
--     each) and the plants of other people they watered. Each share waits at
--     the jar until it is taken. No coin is made: what one drops another is
--     given, and every drop and every share is written down
--     (`town_jar_log`).
--
-- What it keeps: `town_plot_help` (a line to a plot and a helper), which the
-- trigger of v127 now fills as it reads a watering, and empties when the plot
-- is sown anew; `town_thanks` (a line to a thanks: one a pair a day);
-- `town_jar` (one line: what is in it, and the round it was last shared in),
-- `town_jar_owed` (what waits for each), `town_jar_log`.
--
-- v127's own are written again: `town.well_seen` (the same, and a helper's
-- line more at each watering; a plot sown is forgotten), its trigger (which
-- now reads a sowing too), `town_well()` (the book, with the thanks' board
-- and the jar) and `town_well_ranks()` (with who thanked me today, which is
-- how a page comes to say so). No function of the game's is written again;
-- `town.deed_th` is given three words more from its own text as it stands.
--
-- The rules are lib/town/thanks.ts and lib/town/jar.ts written again, held to
-- the code case by case by the dry run; their numbers are the catalog's rows
-- `thanks` and `jar`.

/* ── v127 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.well_seen(uuid, bigint, text, text, numeric, jsonb)') is null or to_regclass('public.town_well_cans') is null then
    raise exception 'v127 has not run yet: thanks and the jar stand on the well''s book';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v129> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('thanks', $town${
    "listed": 10
  }$town$::jsonb),
  ('jar', $town${
    "bucket": 8,
    "kinds": ["crop","fish","dish","goods","catch","staple"]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v129>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- Who has helped the plant in a plot since it was sown: whose plant it is, how
-- many times the helper watered it, and how many waterings of it were of
-- water the helper carried.
create table if not exists public.town_plot_help (
  x      integer not null,
  y      integer not null,
  helper uuid not null references public.profiles (id) on delete cascade,
  owner  uuid not null references public.profiles (id) on delete cascade,
  water  integer not null default 0,
  carry  integer not null default 0,
  primary key (x, y, helper)
);
create index if not exists town_plot_help_owner on public.town_plot_help (owner);
create index if not exists town_plot_help_helper on public.town_plot_help (helper);

-- A thanks: from whom to whom, on which day of the game's (from dawn), and
-- when. One a day from one person to another.
create table if not exists public.town_thanks (
  id      bigint generated always as identity primary key,
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id   uuid not null references public.profiles (id) on delete cascade,
  day     integer not null,
  at      timestamptz not null default now(),
  unique (from_id, to_id, day),
  check (from_id <> to_id)
);
create index if not exists town_thanks_to on public.town_thanks (to_id, at desc);

-- The jar: what is in it (things as [thing, how many], in the order they were
-- first dropped), and the round it was last shared in.
create table if not exists public.town_jar (
  one    boolean primary key default true check (one),
  round  integer not null,
  coins  integer not null default 0 check (coins >= 0),
  things jsonb not null default '[]'::jsonb
);
-- What waits at the jar for each.
create table if not exists public.town_jar_owed (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  coins     integer not null default 0 check (coins >= 0),
  things    jsonb not null default '[]'::jsonb
);
-- Every drop, every share and every taking, as it happened.
create table if not exists public.town_jar_log (
  id        bigint generated always as identity primary key,
  member_id uuid references public.profiles (id) on delete set null,
  at        timestamptz not null default now(),
  round     integer not null,
  what      text not null,
  coins     integer not null default 0,
  things    jsonb not null default '[]'::jsonb
);
create index if not exists town_jar_log_member on public.town_jar_log (member_id, at desc);

alter table public.town_plot_help enable row level security;
alter table public.town_thanks enable row level security;
alter table public.town_jar enable row level security;
alter table public.town_jar_owed enable row level security;
alter table public.town_jar_log enable row level security;
revoke all on public.town_plot_help, public.town_thanks, public.town_jar, public.town_jar_owed, public.town_jar_log from anon, authenticated;

/* ── the well's book: v127's line reader, with the helpers ───────────────── */

-- v127's, word for word but for: whose plant it was is worked out first, a
-- waterer of somebody else's plant is written down as its helper (whatever
-- the can), the carrier too when their water reached it, and a plot sown
-- anew forgets who helped the plant that was there.
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
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
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

/* ── thanks: lib/town/thanks.ts, written again ───────────────────────────── */

-- Who helped my plant in a plot, the most first: [{id, water, carry}].
create or replace function town.helpers_of(p_x integer, p_y integer, p_me uuid)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', h.helper, 'water', h.water, 'carry', h.carry) order by h.water + h.carry desc, h.helper::text collate "C"), '[]'::jsonb)
    from public.town_plot_help h
   where h.x = p_x and h.y = p_y and h.owner = p_me and h.helper <> p_me
$$;

-- Of those, the ones not thanked by me on that day.
create or replace function town.unthanked(p_x integer, p_y integer, p_me uuid, p_day integer)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(h.one order by h.at), '[]'::jsonb)
    from jsonb_array_elements(town.helpers_of(p_x, p_y, p_me)) with ordinality as h(one, at)
   where not exists (select 1 from public.town_thanks t where t.from_id = p_me and t.to_id = (h.one->>'id')::uuid and t.day = p_day)
$$;

-- Thank everybody who helped my plant in a plot and whom I have not thanked
-- today: a line to each. Says who was thanked, in the helpers' order.
create or replace function town.thank(p_x integer, p_y integer, p_me uuid, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  v_left jsonb := town.unthanked(p_x, p_y, p_me, town.day_of(p_now));
begin
  if jsonb_array_length(v_left) = 0 then return town.no('none'); end if;
  insert into public.town_thanks (from_id, to_id, day, at)
    select p_me, (h.one->>'id')::uuid, town.day_of(p_now), to_timestamp(p_now / 1000.0)
      from jsonb_array_elements(v_left) with ordinality as h(one, at) order by h.at
    on conflict (from_id, to_id, day) do nothing;
  return jsonb_build_object('ok', true, 'thanked', (select jsonb_agg(h.one->>'id' order by h.at) from jsonb_array_elements(v_left) with ordinality as h(one, at)));
end;
$$;

-- Every plot of mine with somebody in it to thank today: a plot to its
-- helpers, each by their character's name.
create or replace function town.to_thank(p_me uuid, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, p.helpers), '{}'::jsonb)
    from (
      select h.x, h.y, jsonb_agg(jsonb_build_object('id', h.helper, 'water', h.water, 'carry', h.carry,
               'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, ''))
               order by h.water + h.carry desc, h.helper::text collate "C") as helpers
        from public.town_plot_help h join public.profiles pr on pr.id = h.helper
       where h.owner = p_me and h.helper <> p_me
         and not exists (select 1 from public.town_thanks t where t.from_id = p_me and t.to_id = h.helper and t.day = town.day_of(p_now))
       group by h.x, h.y
    ) p
$$;

-- The board as a member reads it: the thanks they have had (today's, by whom;
-- this week's; all told), and who has been thanked most, this week and ever.
create or replace function town.thanks_board(p_me uuid, p_now bigint)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  v_listed integer := (town.cat('thanks')->>'listed')::integer;
  v_day integer := town.day_of(p_now);
  v_week integer := town.week_of(p_now);
  v_today jsonb;
  v_top jsonb;
  v_ever jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object('id', t.from_id, 'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) order by t.at, t.from_id::text collate "C"), '[]'::jsonb)
    into v_today from public.town_thanks t join public.profiles pr on pr.id = t.from_id where t.to_id = p_me and t.day = v_day;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.to_id, 'name', q.name, 'n', q.n) order by q.n desc, q.id_text), '[]'::jsonb) into v_top
    from (select t.to_id, count(*)::integer as n, t.to_id::text collate "C" as id_text, max(coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) as name
            from public.town_thanks t join public.profiles pr on pr.id = t.to_id
           where town.week_of(round(extract(epoch from t.at) * 1000)::bigint) = v_week
           group by t.to_id order by count(*) desc, t.to_id::text collate "C" limit v_listed) q;
  select coalesce(jsonb_agg(jsonb_build_object('id', q.to_id, 'name', q.name, 'n', q.n) order by q.n desc, q.id_text), '[]'::jsonb) into v_ever
    from (select t.to_id, count(*)::integer as n, t.to_id::text collate "C" as id_text, max(coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) as name
            from public.town_thanks t join public.profiles pr on pr.id = t.to_id
           group by t.to_id order by count(*) desc, t.to_id::text collate "C" limit v_listed) q;
  return jsonb_build_object('today', v_today,
    'week', (select count(*)::integer from public.town_thanks t where t.to_id = p_me and town.week_of(round(extract(epoch from t.at) * 1000)::bigint) = v_week),
    'all', (select count(*)::integer from public.town_thanks t where t.to_id = p_me),
    'top', v_top, 'ever', v_ever);
end;
$$;

/* ── the jar: lib/town/jar.ts, written again ─────────────────────────────── */

-- The moment a round of the uncle's begins (lib/town/trade's roundStart).
create or replace function town.round_from(p_round integer)
returns bigint language sql stable
as $$
  select (p_round / 2)::bigint * 86400000
       + (town.cat('rules')->'rounds'->>(case when p_round % 2 = 0 then 0 else 1 end))::bigint * 3600000 - 7 * 3600000::bigint
$$;

-- More of a thing among things kept as [thing, how many]: onto its own entry,
-- or as a new one at the end.
create or replace function town.jar_add(p_things jsonb, p_id text, p_n integer)
returns jsonb language sql immutable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_things) e where e->>0 = p_id)
    then (select jsonb_agg(case when e.one->>0 = p_id then jsonb_build_array(p_id, (e.one->>1)::integer + p_n) else e.one end order by e.at)
            from jsonb_array_elements(p_things) with ordinality as e(one, at))
    else p_things || jsonb_build_array(jsonb_build_array(p_id, p_n)) end
$$;

-- Drop coins into the jar, or so many of the thing in a slot. `p_what` is
-- {"coins": n} or {"slot": i, "n": n}.
create or replace function town.jar_drop(p_purse jsonb, p_jar jsonb, p_what jsonb)
returns jsonb language plpgsql stable
as $$
declare
  v_coins numeric;
  v_slot integer;
  v_n numeric;
  s jsonb;
begin
  if p_what ? 'coins' then
    v_coins := (p_what->>'coins')::numeric;
    if v_coins is null or v_coins <> floor(v_coins) or v_coins <= 0 then return town.no('amount'); end if;
    if v_coins > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
    return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer - v_coins::integer),
      'jar', p_jar || jsonb_build_object('coins', (p_jar->>'coins')::integer + v_coins::integer));
  end if;
  v_slot := (p_what->>'slot')::integer;
  v_n := (p_what->>'n')::numeric;
  s := case when v_slot >= 0 then p_purse->'bag'->v_slot end;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;
  if v_n is null or v_n <> floor(v_n) or v_n <= 0 or v_n > (s->>'n')::numeric then return town.no('amount'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[v_slot::text],
      case when (s->>'n')::integer = v_n::integer then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::integer - v_n::integer) end)),
    'jar', p_jar || jsonb_build_object('things', town.jar_add(p_jar->'things', s->>'item', v_n::integer)));
end;
$$;

-- So many of something shared out by work ([[who, waterings], …] in the order
-- of their ids): each their whole share, and what is left over one at a time
-- to those whose share fell furthest short (the one who did more first, then
-- by their ids). All of it is given. Answers [[who, how many], …], those who
-- are given something, in the work's own order.
create or replace function town.jar_shares(p_total integer, p_work jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  v_all bigint := (select coalesce(sum((w->>1)::bigint), 0) from jsonb_array_elements(p_work) w);
  v_left integer;
  v_got jsonb;
  g record;
begin
  if coalesce(p_total, 0) <= 0 or v_all <= 0 then return '[]'::jsonb; end if;
  select jsonb_object_agg(w.one->>0, (p_total::bigint * (w.one->>1)::bigint) / v_all) into v_got from jsonb_array_elements(p_work) with ordinality as w(one, at);
  v_left := p_total - (select sum(v::text::integer) from jsonb_each(v_got) e(k, v));
  for g in select w.one->>0 as who from jsonb_array_elements(p_work) w(one)
            order by (p_total::bigint * (w.one->>1)::bigint) % v_all desc, (w.one->>1)::bigint desc, (w.one->>0) collate "C" loop
    exit when v_left <= 0;
    v_got := jsonb_set(v_got, array[g.who], to_jsonb((v_got->>g.who)::integer + 1));
    v_left := v_left - 1;
  end loop;
  return (select coalesce(jsonb_agg(jsonb_build_array(w.one->>0, (v_got->>(w.one->>0))::integer) order by w.at), '[]'::jsonb)
            from jsonb_array_elements(p_work) with ordinality as w(one, at) where (v_got->>(w.one->>0))::integer > 0);
end;
$$;

-- The jar shared out in a round later than its own, told what each did since:
-- what waits for each afterwards (`p_owed`: a member to {coins, things}). With
-- nobody having worked, or nothing in it, the jar keeps what it has.
create or replace function town.jar_settle(p_jar jsonb, p_owed jsonb, p_work jsonb, p_round integer)
returns jsonb language plpgsql immutable
as $$
declare
  v_owed jsonb := coalesce(p_owed, '{}'::jsonb);
  s jsonb;
  thing jsonb;
  mine jsonb;
begin
  if jsonb_array_length(p_work) = 0 or ((p_jar->>'coins')::integer = 0 and jsonb_array_length(p_jar->'things') = 0) then
    return jsonb_build_object('jar', p_jar || jsonb_build_object('round', p_round), 'owed', v_owed, 'shared', false);
  end if;
  for s in select * from jsonb_array_elements(town.jar_shares((p_jar->>'coins')::integer, p_work)) loop
    mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
    v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('coins', (mine->>'coins')::integer + (s->>1)::integer));
  end loop;
  for thing in select * from jsonb_array_elements(p_jar->'things') loop
    for s in select * from jsonb_array_elements(town.jar_shares((thing->>1)::integer, p_work)) loop
      mine := coalesce(v_owed->(s->>0), '{"coins": 0, "things": []}'::jsonb);
      v_owed := v_owed || jsonb_build_object(s->>0, mine || jsonb_build_object('things', town.jar_add(mine->'things', thing->>0, (s->>1)::integer)));
    end loop;
  end loop;
  return jsonb_build_object('jar', jsonb_build_object('round', p_round, 'coins', 0, 'things', '[]'::jsonb), 'owed', v_owed, 'shared', true);
end;
$$;

-- Take what waits for me: the coins, and as many of the things as the bag has
-- room for (the rest wait on). `p_mine` is {coins, things}, or null.
create or replace function town.jar_collect(p_purse jsonb, p_mine jsonb)
returns jsonb language plpgsql stable
as $$
declare
  bag jsonb := p_purse->'bag';
  v_coins integer := coalesce((p_mine->>'coins')::integer, 0);
  v_took jsonb := '[]'::jsonb;
  v_rest jsonb := '[]'::jsonb;
  thing jsonb;
  v_fits integer;
begin
  if p_mine is null or p_mine = 'null'::jsonb or (v_coins = 0 and jsonb_array_length(p_mine->'things') = 0) then return town.no('nothing'); end if;
  for thing in select * from jsonb_array_elements(p_mine->'things') loop
    v_fits := least((thing->>1)::integer, town.room(bag, thing->>0));
    if v_fits > 0 then
      bag := town.put(bag, thing->>0, v_fits);
      v_took := v_took || jsonb_build_array(jsonb_build_array(thing->>0, v_fits));
    end if;
    if v_fits < (thing->>1)::integer then v_rest := v_rest || jsonb_build_array(jsonb_build_array(thing->>0, (thing->>1)::integer - v_fits)); end if;
  end loop;
  if v_coins = 0 and jsonb_array_length(v_took) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'coins', v_coins, 'things', v_took,
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer + v_coins, 'bag', bag),
    'mine', case when jsonb_array_length(v_rest) > 0 then jsonb_build_object('coins', 0, 'things', v_rest) end);
end;
$$;

-- What each did for the others from one round up to (not into) another, in
-- waterings, read off the deeds: a bucketful poured counts as so many, a
-- plant of somebody else's watered as one. [[who, waterings], …] in the order
-- of their ids, only those who did something.
create or replace function town.jar_work(p_from integer, p_to integer)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_array(q.member_id, q.w) order by q.id_text), '[]'::jsonb)
    from (
      select d.member_id, d.member_id::text collate "C" as id_text,
             sum(case when d.what = 'pour' then floor(d.n) * (town.cat('jar')->>'bucket')::integer else 1 end)::integer as w
        from public.town_deeds d
       where d.at >= to_timestamp(town.round_from(p_from) / 1000.0) and d.at < to_timestamp(town.round_from(p_to) / 1000.0)
         and d.member_id is not null
         and ((d.what = 'pour' and d.n >= 1) or (d.what = 'water' and d.doc ? 'whose'))
       group by d.member_id
    ) q
   where q.w > 0
$$;

-- The jar as it stands, held, and shared out first if a round has turned
-- since it last was: every share is put to what waits for its member, and
-- written down.
create or replace function town.jar_now(p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  v_round integer := town.round_of(p_now);
  jar jsonb;
  work jsonb;
  did jsonb;
  s record;
begin
  insert into public.town_jar (round) values (v_round) on conflict (one) do nothing;
  select jsonb_build_object('round', j.round, 'coins', j.coins, 'things', j.things) into jar from public.town_jar j for update;
  if v_round <= (jar->>'round')::integer then return jar; end if;
  work := town.jar_work((jar->>'round')::integer, v_round);
  did := town.jar_settle(jar, (select coalesce(jsonb_object_agg(o.member_id::text, jsonb_build_object('coins', o.coins, 'things', o.things)), '{}'::jsonb)
                                 from public.town_jar_owed o where o.member_id::text in (select w->>0 from jsonb_array_elements(work) w)), work, v_round);
  if (did->>'shared')::boolean then
    for s in select e.key as who, e.value as mine from jsonb_each(did->'owed') e loop
      insert into public.town_jar_owed (member_id, coins, things) values (s.who::uuid, (s.mine->>'coins')::integer, s.mine->'things')
        on conflict (member_id) do update set coins = excluded.coins, things = excluded.things;
    end loop;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (null, to_timestamp(p_now / 1000.0), (jar->>'round')::integer, 'share', (jar->>'coins')::integer, jsonb_build_object('things', jar->'things', 'work', work));
  end if;
  jar := did->'jar';
  update public.town_jar j set round = (jar->>'round')::integer, coins = (jar->>'coins')::integer, things = jar->'things';
  return jar;
end;
$$;

-- The jar as a page is told of it: what is in it, when it is next shared, and
-- what waits for whoever asks.
create or replace function town.jar_told(p_me uuid, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('coins', j.coins, 'things', j.things, 'round', j.round, 'next', town.round_from(town.round_of(p_now) + 1),
           'mine', (select jsonb_build_object('coins', o.coins, 'things', o.things) from public.town_jar_owed o where o.member_id = p_me))
    from public.town_jar j
$$;

-- The tally's words for a thanks, a drop into the jar and a share taken:
-- `town.deed_th` as it stands, with three `when`s more.
do $$
declare
  def text;
begin
  if town.deed_th('thank') = 'thank' then
    def := pg_get_functiondef('town.deed_th(text)'::regprocedure);
    if position('else p_what end' in def) = 0 then raise exception 'town.deed_th is not as v121 wrote it: its last line is gone'; end if;
    execute replace(def, 'else p_what end', 'when ''thank'' then ''ขอบคุณคนที่ช่วยดูแลผัก'' when ''jar_drop'' then ''หยอดกระปุกที่บ่อน้ำ'' when ''jar_take'' then ''รับส่วนแบ่งจากกระปุก'' else p_what end');
  end if;
end $$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The well's book, as I read it (v127's), with the thanks' board and the jar.
create or replace function public.town_well()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
begin
  -- (what the book no longer reads is thrown away as it is opened: a week of days is kept)
  delete from public.town_well_reach r where r.day < town.day_of(now_) - 7;
  perform town.jar_now(now_);
  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_, 'thanks', town.thanks_board(me, now_), 'jar', town.jar_told(me, now_));
end;
$$;

-- Everybody who has a rank (v127's), and who has thanked me today.
create or replace function public.town_well_ranks()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(),
    'ranks', (select coalesce(jsonb_object_agg(c.member_id::text, town.well_rank(c.buckets)), '{}'::jsonb)
                from public.town_carriers c where town.well_rank(c.buckets) > 0),
    'thanked', town.thanks_board(me, town.now_ms())->'today');
end;
$$;

-- Every plot of mine with somebody in it to thank today.
create or replace function public.town_to_thank()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'toThank', town.to_thank(me, town.now_ms()));
end;
$$;

-- Thank everybody who helped my plant in the plot at a tile.
create or replace function public.town_thank(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb;
begin
  if p_x is null or p_y is null then return jsonb_build_object('ok', false, 'why', 'none', 'now', now_); end if;
  -- (one at a time for one member: two taps at once thank nobody twice)
  perform pg_advisory_xact_lock(hashtext('town.thanks'), hashtext(me::text));
  did := town.thank(p_x, p_y, me, now_);
  if (did->>'ok')::boolean then
    perform town.note(me, 'thank', null, jsonb_array_length(did->'thanked'), 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'to', did->'thanked'));
  end if;
  return did || jsonb_build_object('now', now_, 'toThank', town.to_thank(me, now_));
end;
$$;

-- Drop coins into the jar (`p_coins`), or so many of the thing in a slot of my bag.
create or replace function public.town_jar_drop(p_slot integer default null, p_n integer default null, p_coins integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.jar_drop(purse, jar, case when p_coins is not null then jsonb_build_object('coins', p_coins) else jsonb_build_object('slot', p_slot, 'n', p_n) end);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things';
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'drop', coalesce(p_coins, 0),
              case when p_coins is null then jsonb_build_array(jsonb_build_array(purse->'bag'->p_slot->>'item', p_n)) else '[]'::jsonb end);
    perform town.note(me, 'jar_drop', case when p_coins is null then purse->'bag'->p_slot->>'item' end, coalesce(p_n, 1), -coalesce(p_coins, 0), '{}'::jsonb);
  end if;
  return town.answer(me, did - 'jar') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$$;

-- Take what waits for me at the jar.
create or replace function public.town_jar_take()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  jar jsonb := town.jar_now(now_);
  purse jsonb := town.purse_of(me, true);
  mine jsonb;
  did jsonb;
begin
  select jsonb_build_object('coins', o.coins, 'things', o.things) into mine from public.town_jar_owed o where o.member_id = me for update;
  did := town.jar_collect(purse, mine);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if did->'mine' is null or did->'mine' = 'null'::jsonb then delete from public.town_jar_owed o where o.member_id = me;
    else update public.town_jar_owed o set coins = 0, things = did->'mine'->'things' where o.member_id = me; end if;
    insert into public.town_jar_log (member_id, at, round, what, coins, things)
      values (me, to_timestamp(now_ / 1000.0), (jar->>'round')::integer, 'take', (did->>'coins')::integer, did->'things');
    perform town.note(me, 'jar_take', null, 1, (did->>'coins')::numeric, jsonb_build_object('things', did->'things'));
  end if;
  return town.answer(me, did - 'mine') || jsonb_build_object('jar', town.jar_told(me, now_));
end;
$$;

revoke execute on function public.town_well() from public, anon;
revoke execute on function public.town_well_ranks() from public, anon;
revoke execute on function public.town_to_thank() from public, anon;
revoke execute on function public.town_thank(integer, integer) from public, anon;
revoke execute on function public.town_jar_drop(integer, integer, integer) from public, anon;
revoke execute on function public.town_jar_take() from public, anon;
grant execute on function public.town_well() to authenticated;
grant execute on function public.town_well_ranks() to authenticated;
grant execute on function public.town_to_thank() to authenticated;
grant execute on function public.town_thank(integer, integer) to authenticated;
grant execute on function public.town_jar_drop(integer, integer, integer) to authenticated;
grant execute on function public.town_jar_take() to authenticated;

/* ── the trigger reads a sowing too ──────────────────────────────────────── */

do $$
begin
  lock table public.town_deeds in share row exclusive mode;
  drop trigger if exists town_deeds_well on public.town_deeds;
  create trigger town_deeds_well after insert on public.town_deeds
    for each row when (new.what in ('pour', 'fill', 'water', 'sow')) execute function town.well_deed();
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select count(*) filter (where c.relrowsecurity) as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name in ('town_plot_help', 'town_thanks', 'town_jar', 'town_jar_owed', 'town_jar_log') and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relname in ('town_plot_help', 'town_thanks', 'town_jar', 'town_jar_owed', 'town_jar_log') and c.relnamespace = 'public'::regnamespace;
--   -- 5 | 0
--
--   select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_to_thank', 'town_thank', 'town_jar_drop', 'town_jar_take') order by 1;
--   -- town_jar_drop | f | t      town_jar_take | f | t      town_thank | f | t      town_to_thank | f | t
--
--   select tgname, pg_get_triggerdef(oid) like '%''sow''%' as reads_a_sowing from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal;
--   -- town_deeds_well | t
--
--   select town.cat('thanks') as thanks, town.cat('jar') as jar;
--   -- {"listed": 10} | {"kinds": ["crop", "fish", "dish", "goods", "catch", "staple"], "bucket": 8}
--
--   select town.deed_th('thank') as thank, town.deed_th('jar_drop') as dropped, town.deed_th('jar_take') as taken, town.deed_th('gift') as gift;
--   -- ขอบคุณคนที่ช่วยดูแลผัก | หยอดกระปุกที่บ่อน้ำ | รับส่วนแบ่งจากกระปุก | รับของที่บ่อน้ำฝากไว้ให้
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- who has been thanked, and how often
--   select p.character_name, count(*) as thanks from public.town_thanks t join public.profiles p on p.id = t.to_id group by 1 order by 2 desc;
--
--   -- the jar: what is in it, what waits for whom, and everything that went in and out
--   select * from public.town_jar;
--   select p.character_name, o.coins, o.things from public.town_jar_owed o join public.profiles p on p.id = o.member_id;
--   select l.at, p.character_name, l.round, l.what, l.coins, l.things from public.town_jar_log l left join public.profiles p on p.id = l.member_id order by l.id desc limit 50;
