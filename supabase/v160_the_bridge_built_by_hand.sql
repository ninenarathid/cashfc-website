-- v160 — the bridge built by hand, and the village's works
--
-- Run it once in the Supabase SQL editor, after v166 (it stands on nothing
-- later than v159; v161, v162 and v164 are other rounds' numbers and have not
-- run). Running it again is safe.
--
-- The owner, 2026-10-08, of the bucket line that members stand in rows of four
-- and five for: "สะพานจากมือชาวบ้าน สร้างได้เลย แต่จะเปิดใช้งานเมื่อ session ที่ทำ
-- ขุดแร่กับตัดไม้ทำเสร็จก่อน ไม่งั้น สะพานจะสร้างเสร็จก่อน patch มา", and "stamina
-- คนยก เหลือ 1 พอ".
--
-- And that evening, of what it would take for made-up players to score the
-- piece ninety: "ขอให้ทำทุกอันเป็นแบบดันสุดเลย … เอาตามที่ codex ว่ามาได้เลย": a stone is
-- handed on within ten tiles; each span keeps whose hands built it; and about
-- one stone in twenty-five has something in it.
--
-- **A work** is something the whole village gives to. `town_works` has one row
-- a work (when it was opened, when it was marked whole); `town_work_needs` what
-- it needs of each thing (no number: it takes any amount) and how many it has;
-- `town_work_hands` who gave how many of what, and when each first came;
-- `town_work_built` whose hands built each span of it, and when each first
-- came to that span; `town_work_finds` what was found in its stones, when, in
-- which span, and whose hands each came by.
-- `town_work_give(work, thing, n)` gives out of the bag: it refuses only what
-- would pass a need that is a number. **`done_at` is a mark for the page: the
-- giving never reads it, and nothing closes a row for good.** No work uses the
-- giving yet.
--
-- **The bridge** is the first work: six hundred stones, handed from the pile
-- by the uncle's shop to the bridge's foot, six spans of a hundred.
--
--   · A stone is in the hands, never in the bag: `town_work_carried` has, for
--     whoever holds one, whose hands it has been through (the last eight, the
--     holder last), and what the stone has in it.
--   · Lifted at the pile with nothing in the hand: one stamina. **About one in
--     twenty-five has something in it** (six kinds, the catalog's
--     `bridge.marks`), drawn at that moment from the lifter and the clock
--     (`town.roll`, as an insect let go on a plant is tried) and kept with the
--     stone. **Nobody is told while it is carried**: no answer and no reading
--     says it, the holder's neither.
--   · Handed on to somebody with empty hands: nothing.
--   · Laid at the foot: one stamina. The work has one more, and **everybody
--     whose hands the stone went through is counted it** (a row of
--     `town_work_hands` each) **and a point on the helpers' line**: a deed for
--     the one who laid it (`stone_lay`) and one for each of the others
--     (`stone_hand`), which v149's trigger counts by `town.work_counts_of`.
--     The helpers' day's bound holds them as it holds every point of theirs.
--     Each of them is one of the hands of the span the stone went into
--     (`town_work_built`), and what the stone had in it is seen now: its
--     answer says so (`find`), and it is set in the bridge for good with their
--     names (`town_work_finds`). A find is never a thing, is never sold, and
--     counts on no line.
--   · Let go of anywhere: it is gone, and nothing comes back.
--   · With no stamina nothing is refused.
--   · No coins come of it, and nothing that can be sold.
--
-- **It is built closed.** While a work's `opened_at` is null every function of
-- it answers `closed`, and a page is told only that it is not open. The owner
-- opens the bridge with one line, when the mountain is ready:
--
--   update public.town_works set opened_at = now() where id = 'bridge';
--
-- The database cannot know where anybody stands (nothing of the game's can:
-- the room is the page's), so how near two are for a stone to be handed on is
-- the page's to hold to; the tile somebody lifts or lays from is the page's
-- word, held to the catalog's two tiles, as it is at the storage box.
--
-- **Two functions that were there are written again, each main's text exactly
-- as it is live after v159 (v153's) with one block of this file's, marked with
-- a comment at its top and at its end**: `town.work_counts_of`, for the two
-- deeds of a stone laid, and `town.deed_th`, for six words. Nothing else in
-- them is changed, not even the layout, and nothing else that was there is
-- written again. **A file after this one that writes either again carries
-- this file's block with its own.** The rules are lib/town/bridge.ts
-- written again (`town.stone_lift`, `stone_pass`, `stone_lay`, `stone_drop`,
-- `stone_mark`, `stone_into`, `works_give`), held to the code case by case by
-- the dry run; the numbers are the catalog's row `bridge`.
--
-- **The code goes out before this file**: a page with the code and a database
-- without the file is told nothing of any works, and shows nothing of them.

/* ── v149 and v153 first ─────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regclass('public.town_work') is null or to_regclass('public.town_deeds') is null then
    raise exception 'v160 needs v149: a stone laid is counted on the helpers'' line, which that file made';
  end if;
end $$;

/* ── the catalog ─────────────────────────────────────────────────────────── */

-- <catalog:v160> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('bridge', $town${
    "work": "bridge",
    "thing": "stone",
    "need": 600,
    "spans": 6,
    "costs": {"lift":1,"lay":1},
    "reach": 10,
    "near": 2,
    "paces": {"held":0.5,"spent":0.25},
    "hands": 8,
    "point": 1,
    "hold": 1.2,
    "stand": 9,
    "steps": 10,
    "marks": {"one":25,"kinds":["shell","coin","rune","pearl","star","leaf"]},
    "pile": [42,27],
    "foot": [11,27]
  }$town$::jsonb)
  on conflict (key) do nothing;
-- </catalog:v160>

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A work: when its owner opened it (null: it is closed, and nothing of it is
-- offered), and when it came to have all it needs (a mark, read by nothing
-- that gives).
create table if not exists public.town_works (
  id        text primary key,
  opened_at timestamptz,
  done_at   timestamptz
);
-- What a work needs of a thing (null: any amount), and how many it has.
create table if not exists public.town_work_needs (
  work  text not null references public.town_works (id) on delete cascade,
  thing text not null,
  need  integer check (need is null or need > 0),
  have  integer not null default 0 check (have >= 0),
  primary key (work, thing)
);
-- Who gave how many of what to a work, and when they first came.
create table if not exists public.town_work_hands (
  work      text not null references public.town_works (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  thing     text not null,
  n         integer not null default 0 check (n >= 0),
  first_at  timestamptz not null default now(),
  primary key (work, member_id, thing)
);
-- What somebody carries in their hands towards a work (a stone): whose hands
-- it has been through, in the order it came by them, the holder last.
-- And what the stone has in it (null: nothing, as most have): the keeper's
-- alone until it is laid.
create table if not exists public.town_work_carried (
  member_id uuid primary key references public.profiles (id) on delete cascade,
  work      text not null references public.town_works (id) on delete cascade,
  thing     text not null,
  hands     uuid[] not null default '{}',
  mark      text,
  at        timestamptz not null default now()
);
-- Whose hands built each span of a work (from one), and when each first came
-- to that span.
create table if not exists public.town_work_built (
  work      text not null references public.town_works (id) on delete cascade,
  span      integer not null check (span > 0),
  member_id uuid not null references public.profiles (id) on delete cascade,
  first_at  timestamptz not null default now(),
  primary key (work, span, member_id)
);
-- What was found in a stone and set in a work for good: which kind, when it
-- was laid, in which span, and whose hands the stone came by, in the order it
-- went through them.
create table if not exists public.town_work_finds (
  id    bigint generated always as identity primary key,
  work  text not null references public.town_works (id) on delete cascade,
  thing text not null,
  kind  text not null,
  span  integer not null default 0,
  hands uuid[] not null default '{}',
  at    timestamptz not null default now()
);
create index if not exists town_work_finds_work on public.town_work_finds (work, at);
alter table public.town_works enable row level security;
alter table public.town_work_needs enable row level security;
alter table public.town_work_hands enable row level security;
alter table public.town_work_carried enable row level security;
alter table public.town_work_built enable row level security;
alter table public.town_work_finds enable row level security;
revoke all on public.town_works, public.town_work_needs, public.town_work_hands, public.town_work_carried, public.town_work_built, public.town_work_finds from anon, authenticated;

-- The bridge: closed, needing its stones. (What it needs is seeded from the
-- catalog and is the table's from then on: the giving reads the table.)
insert into public.town_works (id) select town.cat('bridge')->>'work' on conflict (id) do nothing;
insert into public.town_work_needs (work, thing, need)
  select b.k->>'work', b.k->>'thing', (b.k->>'need')::integer from (select town.cat('bridge') as k) b
  on conflict (work, thing) do nothing;

/* ── the rules: lib/town/bridge.ts, written again ────────────────────────── */

-- Whether a work still wants a thing: it is open, takes the thing, and has
-- not all it needs of it.
create or replace function town.works_wants(p_work jsonb, p_thing text)
returns boolean language sql immutable
as $$
  select coalesce((p_work->>'open')::boolean, false) and coalesce(jsonb_typeof(p_work->'needs'->p_thing) = 'object', false)
     and (p_work->'needs'->p_thing->>'need' is null or (p_work->'needs'->p_thing->>'have')::integer < (p_work->'needs'->p_thing->>'need')::integer)
$$;

-- Whether somebody on a tile stands by the pile or by the foot: within so
-- many tiles of it, either way. (No tile is near nothing.)
create or replace function town.stone_near(p_x integer, p_y integer, p_which text)
returns boolean language sql stable
as $$
  select p_x is not null and p_y is not null
     and coalesce(greatest(abs(p_x - (b.k->p_which->>0)::integer), abs(p_y - (b.k->p_which->>1)::integer)) <= (b.k->>'near')::integer, false)
    from (select town.cat('bridge') as k) b
$$;

-- How many spans so many stones of so many make.
create or replace function town.stone_spans(p_have integer, p_need integer)
returns integer language sql stable
as $$
  select case when p_need is null or p_need <= 0 then 0
              else greatest(0, least((town.cat('bridge')->>'spans')::integer, (p_have * (town.cat('bridge')->>'spans')::integer) / p_need)) end
$$;

-- Which span the stone that makes so many of so many went into, from one (the
-- span that was in hand before it): none, for a work that takes any amount.
create or replace function town.stone_into(p_have integer, p_need integer)
returns integer language sql stable
as $$
  select case when p_need is null or p_need <= 0 or p_have is null or p_have <= 0 then 0
              else least((town.cat('bridge')->>'spans')::integer, town.stone_spans(p_have - 1, p_need) + 1) end
$$;

-- What a stone has in it by the number it is tried by: one in so many has
-- something, each kind as likely as another; the rest nothing.
create or replace function town.stone_mark(p_luck double precision)
returns text language sql stable
as $$
  select case when p_luck is null or not (p_luck >= 0) or p_luck * (m.k->>'one')::double precision >= 1 then null
              else m.k->'kinds'->>least(jsonb_array_length(m.k->'kinds') - 1, floor(p_luck * (m.k->>'one')::double precision * jsonb_array_length(m.k->'kinds'))::integer) end
    from (select town.cat('bridge')->'marks' as k) m
$$;

-- Lift a stone at the pile: nothing in the hand, no stone in the hands, a tile
-- by the pile. One stamina (none left: lifted all the same). What it has in it
-- is drawn at this moment, from its lifter and the clock.
create or replace function town.stone_lift(p_purse jsonb, p_carried jsonb, p_work jsonb, p_x integer, p_y integer, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  b jsonb := town.cat('bridge');
  thing text := b->>'thing';
begin
  if not coalesce((p_work->>'open')::boolean, false) or not coalesce(jsonb_typeof(p_work->'needs'->thing) = 'object', false) then return town.no('closed'); end if;
  if not town.works_wants(p_work, thing) then return town.no('whole'); end if;
  if coalesce(jsonb_typeof(p_carried), '') = 'object' then return town.no('held'); end if;
  if town.hand_of(p_purse) is not null then return town.no('hand'); end if;
  if not town.stone_near(p_x, p_y, 'pile') then return town.no('far'); end if;
  return jsonb_build_object('ok', true,
    'purse', town.spend(p_purse, (b->'costs'->>'lift')::double precision, p_now),
    'carried', jsonb_build_object('work', b->>'work', 'thing', thing, 'hands', jsonb_build_array(p_me), 'mark', town.stone_mark(town.roll('stone|' || p_me, p_now))));
end;
$$;

-- Hand the stone one holds on to somebody with nothing in the hand and no
-- stone: for nothing. It goes with the hands it came by, the taker's last
-- (once), the last so many remembered, and with what it has in it.
create or replace function town.stone_pass(p_carried jsonb, p_to text, p_theirs jsonb, p_their_carried jsonb, p_work jsonb)
returns jsonb language plpgsql stable
as $$
declare
  most integer := (town.cat('bridge')->>'hands')::integer;
  hands jsonb;
begin
  if not coalesce((p_work->>'open')::boolean, false) then return town.no('closed'); end if;
  if coalesce(jsonb_typeof(p_carried), '') <> 'object' then return town.no('none'); end if;
  if coalesce(jsonb_typeof(p_their_carried), '') = 'object' then return town.no('held'); end if;
  if town.hand_of(p_theirs) is not null then return town.no('hand'); end if;
  select coalesce(jsonb_agg(x.id order by x.ord), '[]'::jsonb) || jsonb_build_array(p_to) into hands
    from jsonb_array_elements_text(p_carried->'hands') with ordinality x(id, ord) where x.id <> p_to;
  if jsonb_array_length(hands) > most then
    select jsonb_agg(x.v order by x.ord) into hands from jsonb_array_elements(hands) with ordinality x(v, ord) where x.ord > jsonb_array_length(hands) - most;
  end if;
  return jsonb_build_object('ok', true, 'carried', p_carried || jsonb_build_object('hands', hands));
end;
$$;

-- Lay the stone one holds at the foot: from a tile by it, for one stamina
-- (none left: laid all the same). Says how many the work has now, whose hands
-- the stone came by, how many spans that makes, whether this stone finished
-- one, whether the work is whole, which span the stone went into, and what was
-- found in it, now that it is laid.
create or replace function town.stone_lay(p_purse jsonb, p_carried jsonb, p_work jsonb, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  b jsonb := town.cat('bridge');
  n jsonb;
  need integer;
  have integer;
begin
  if not coalesce((p_work->>'open')::boolean, false) then return town.no('closed'); end if;
  if coalesce(jsonb_typeof(p_carried), '') <> 'object' then return town.no('none'); end if;
  n := p_work->'needs'->(p_carried->>'thing');
  if coalesce(jsonb_typeof(n), '') <> 'object' then return town.no('none'); end if;
  need := (n->>'need')::integer;
  have := (n->>'have')::integer;
  if need is not null and have >= need then return town.no('whole'); end if;
  if not town.stone_near(p_x, p_y, 'foot') then return town.no('far'); end if;
  have := have + 1;
  return jsonb_build_object('ok', true,
    'purse', town.spend(p_purse, (b->'costs'->>'lay')::double precision, p_now),
    'have', have, 'hands', p_carried->'hands',
    'spans', town.stone_spans(have, need), 'span', town.stone_spans(have, need) > town.stone_spans(have - 1, need),
    'whole', need is not null and have >= need,
    'into', town.stone_into(have, need), 'find', coalesce(p_carried->'mark', 'null'::jsonb));
end;
$$;

-- Let go of the stone one holds: it is gone, and nothing comes back.
create or replace function town.stone_drop(p_carried jsonb, p_work jsonb)
returns jsonb language sql immutable
as $$
  select case when not coalesce((p_work->>'open')::boolean, false) then town.no('closed')
              when coalesce(jsonb_typeof(p_carried), '') <> 'object' then town.no('none')
              else jsonb_build_object('ok', true) end
$$;

-- Give so many of a thing out of the bag to a work. Refused only for what
-- would pass what the work needs, where it needs so many.
create or replace function town.works_give(p_purse jsonb, p_work jsonb, p_thing text, p_n integer)
returns jsonb language plpgsql immutable
as $$
declare
  n jsonb := p_work->'needs'->p_thing;
  need integer;
  have integer;
begin
  if not coalesce((p_work->>'open')::boolean, false) then return town.no('closed'); end if;
  if coalesce(jsonb_typeof(n), '') <> 'object' or p_n is null or p_n <= 0 then return town.no('none'); end if;
  if town.held(p_purse->'bag', p_thing) < p_n then return town.no('short'); end if;
  need := (n->>'need')::integer;
  have := (n->>'have')::integer;
  if need is not null and have + p_n > need then return town.no('over'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_thing, p_n)), 'have', have + p_n);
end;
$$;

/* ── what is kept, read and written ──────────────────────────────────────── */

-- A work as its rules read it: whether it is open, and what it needs. Nothing,
-- for a work there is none of.
create or replace function town.works_read(p_work text)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('open', w.opened_at is not null,
           'needs', coalesce((select jsonb_object_agg(n.thing, jsonb_build_object('need', n.need, 'have', n.have)) from public.town_work_needs n where n.work = w.id), '{}'::jsonb))
    from public.town_works w where w.id = p_work
$$;

-- What a member carries in their hands, as the rules read it (what the stone
-- has in it among it: the rules' alone). Nothing, for empty hands.
create or replace function town.works_carried(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('work', c.work, 'thing', c.thing, 'hands', to_jsonb(c.hands), 'mark', c.mark) from public.town_work_carried c where c.member_id = p_member
$$;

-- So many of a thing counted to each of some members (only those who are
-- still here), at a moment; the work has so many more; and it is marked whole
-- when it has all it needs of everything (the mark is put once, and read by
-- nothing that gives).
create or replace function town.works_counted(p_work text, p_thing text, p_who uuid[], p_each integer, p_add integer, p_now bigint)
returns void language plpgsql set search_path = public
as $$
begin
  insert into public.town_work_hands (work, member_id, thing, n, first_at)
    select p_work, h.id, p_thing, p_each, to_timestamp(p_now / 1000.0)
      from (select distinct x.id from unnest(p_who) as x(id)) h join public.profiles pr on pr.id = h.id
    on conflict (work, member_id, thing) do update set n = public.town_work_hands.n + excluded.n;
  update public.town_work_needs n set have = n.have + p_add where n.work = p_work and n.thing = p_thing;
  update public.town_works w set done_at = to_timestamp(p_now / 1000.0)
   where w.id = p_work and w.done_at is null
     and not exists (select 1 from public.town_work_needs n where n.work = w.id and (n.need is null or n.have < n.need));
end;
$$;

-- A stone laid (lib/town/bridge's `laid`): everybody whose hands it came by is
-- counted it; each is one of the hands of the span it went into, from the
-- moment they first came to that span; and what was in the stone, if anything,
-- is set in the work for good with whose hands it came by.
create or replace function town.works_laid(p_work text, p_thing text, p_who uuid[], p_into integer, p_mark text, p_now bigint)
returns void language plpgsql set search_path = public
as $$
begin
  perform town.works_counted(p_work, p_thing, p_who, 1, 1, p_now);
  if p_into > 0 then
    insert into public.town_work_built (work, span, member_id, first_at)
      select p_work, p_into, h.id, to_timestamp(p_now / 1000.0)
        from (select distinct x.id from unnest(p_who) as x(id)) h join public.profiles pr on pr.id = h.id
      on conflict (work, span, member_id) do nothing;
  end if;
  if p_mark is not null then
    insert into public.town_work_finds (work, thing, kind, span, hands, at)
      values (p_work, p_thing, p_mark, coalesce(p_into, 0), p_who, to_timestamp(p_now / 1000.0));
  end if;
end;
$$;

-- The works as a member is told them (lib/town/bridge's `told`): of each one
-- that is open, when it was marked whole, what it needs and has, everybody who
-- has given to it **in the order they first came, with no numbers**, the
-- member's own counts, told to them alone, whose hands built each span (by the
-- span, in the order they first came to it, with no numbers either), and what
-- was found in its stones, in the order they were laid, each with the hands it
-- came by; of one that is not open, only that it is not. And what the member
-- carries in their hands, towards a work that is open: **never what the stone
-- has in it**.
create or replace function town.works_told(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object(
    'works', coalesce((
      select jsonb_object_agg(w.id, case when w.opened_at is null
        then jsonb_build_object('open', false, 'done', null, 'needs', '{}'::jsonb, 'helpers', '[]'::jsonb, 'mine', '{}'::jsonb, 'built', '{}'::jsonb, 'finds', '[]'::jsonb)
        else jsonb_build_object('open', true, 'done', round(extract(epoch from w.done_at) * 1000)::bigint,
          'needs', coalesce((select jsonb_object_agg(n.thing, jsonb_build_object('need', n.need, 'have', n.have)) from public.town_work_needs n where n.work = w.id), '{}'::jsonb),
          'helpers', coalesce((
            select jsonb_agg(jsonb_build_object('id', q.member_id, 'name', q.name) order by q.first_at, q.id_text)
              from (select h.member_id, min(h.first_at) as first_at, h.member_id::text collate "C" as id_text,
                           coalesce(pr.character_name, pr.display_name, pr.discord_username, '') as name
                      from public.town_work_hands h join public.profiles pr on pr.id = h.member_id
                     where h.work = w.id group by h.member_id, pr.character_name, pr.display_name, pr.discord_username) q), '[]'::jsonb),
          'mine', coalesce((select jsonb_object_agg(h.thing, h.n) from public.town_work_hands h where h.work = w.id and h.member_id = p_member), '{}'::jsonb),
          'built', coalesce((
            select jsonb_object_agg(s.span::text, s.hands)
              from (select b.span, jsonb_agg(jsonb_build_object('id', b.member_id, 'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, ''))
                                             order by b.first_at, b.member_id::text collate "C") as hands
                      from public.town_work_built b join public.profiles pr on pr.id = b.member_id
                     where b.work = w.id group by b.span) s), '{}'::jsonb),
          'finds', coalesce((
            select jsonb_agg(jsonb_build_object('kind', f.kind, 'at', round(extract(epoch from f.at) * 1000)::bigint, 'span', f.span,
                     'hands', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'name', coalesce(pr.character_name, pr.display_name, pr.discord_username, '')) order by x.ord)
                                          from unnest(f.hands) with ordinality x(id, ord) join public.profiles pr on pr.id = x.id), '[]'::jsonb))
                     order by f.at, f.id)
              from public.town_work_finds f where f.work = w.id), '[]'::jsonb)) end)
        from public.town_works w), '{}'::jsonb),
    'carried', (select jsonb_build_object('work', c.work, 'thing', c.thing)
                  from public.town_work_carried c join public.town_works w on w.id = c.work
                 where c.member_id = p_member and w.opened_at is not null))
$$;

/* ── the helpers' line counts a stone laid; the tally's words ─────────────── */

-- `town.work_counts_of`: **main's text of it exactly as it is live after v159** (v153's, which no file since has
-- written), with one block more, marked at its top and its end: a stone laid is a point on the helpers' line for the
-- one who laid it and for each of the others it came by (what it is worth is the bridge's own number, the catalog's
-- `bridge.point`). Nothing else in it is changed, not even its layout: a file after this one that writes it again
-- carries this block with its own.
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
returns jsonb language plpgsql stable
as $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  return '[]'::jsonb;
end;
$$;

-- `town.deed_th`: main's text of it exactly as it is live after v159 (v153's), with one block more, marked the
-- same way: six words, for the bridge's five deeds and the works' giving.
create or replace function town.deed_th(p_what text)
returns text language sql immutable
as $$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    else p_what end
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

/* ── what a browser calls ────────────────────────────────────────────────── */

-- The works as I am told them, and what I carry in my hands.
create or replace function public.town_works_read()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'works', town.works_told(me));
end;
$$;

-- Lift a stone at the pile, from the tile I stand on.
create or replace function public.town_stone_lift(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  -- (my purse's row is held first, as by every deed of mine: what I carry needs no holding of its own)
  mine jsonb := town.purse_of(me, true);
  did jsonb;
begin
  did := town.stone_lift(mine, town.works_carried(me), town.works_read(town.cat('bridge')->>'work'), p_x, p_y, me::text, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_work_carried (member_id, work, thing, hands, mark, at)
      values (me, did->'carried'->>'work', did->'carried'->>'thing', array[me], did->'carried'->>'mark', to_timestamp(now_ / 1000.0));
    perform town.note(me, 'stone_lift', did->'carried'->>'thing', 1, 0, jsonb_build_object('work', did->'carried'->>'work', 'tile', jsonb_build_array(p_x, p_y)));
  end if;
  return town.answer(me, (did - 'purse' - 'carried') || jsonb_build_object('works', town.works_told(me)));
end;
$$;

-- Hand the stone I hold on to somebody: into their empty hands.
create or replace function public.town_stone_pass(p_to uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  carried jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there: a proved character, or an admin)
  if p_to is null or p_to = me or not exists (
       select 1 from public.town_purses pp join public.profiles p on p.id = pp.member_id
        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then
    return town.answer(me, town.no('none') || jsonb_build_object('works', town.works_told(me)));
  end if;
  -- (two who hand to each other at the same moment: the two purses are held in the order of their ids; what each
  -- carries is theirs alone to change, under their own purse)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  carried := town.works_carried(me);
  did := town.stone_pass(carried, p_to::text, theirs, town.works_carried(p_to), town.works_read(coalesce(carried->>'work', town.cat('bridge')->>'work')));
  if (did->>'ok')::boolean then
    delete from public.town_work_carried c where c.member_id = me;
    insert into public.town_work_carried (member_id, work, thing, hands, mark, at)
      values (p_to, did->'carried'->>'work', did->'carried'->>'thing',
              array(select x.id::uuid from jsonb_array_elements_text(did->'carried'->'hands') with ordinality x(id, ord) order by x.ord), did->'carried'->>'mark', to_timestamp(now_ / 1000.0));
    perform town.note(me, 'stone_pass', did->'carried'->>'thing', 1, 0, jsonb_build_object('to', p_to, 'work', did->'carried'->>'work'));
  end if;
  return town.answer(me, (did - 'carried') || jsonb_build_object('works', town.works_told(me)));
end;
$$;

-- Lay the stone I hold at the foot, from the tile I stand on: the work has one
-- more, everybody whose hands it went through is counted it and is one of that
-- span's hands, and what the stone had in it is set in the work and told.
create or replace function public.town_stone_lay(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb := town.purse_of(me, true);
  carried jsonb := town.works_carried(me);
  work_ text := coalesce(carried->>'work', town.cat('bridge')->>'work');
  hands uuid[];
  did jsonb;
begin
  -- (the work's row is held after my purse's: two who lay at the same moment are counted one after the other)
  perform 1 from public.town_works w where w.id = work_ for update;
  did := town.stone_lay(mine, carried, town.works_read(work_), p_x, p_y, now_);
  if (did->>'ok')::boolean then
    hands := array(select x.id::uuid from jsonb_array_elements_text(did->'hands') with ordinality x(id, ord) order by x.ord);
    perform town.keep_purse(me, did->'purse');
    delete from public.town_work_carried c where c.member_id = me;
    perform town.works_laid(work_, carried->>'thing', hands, (did->>'into')::integer, did->>'find', now_);
    perform town.note(me, 'stone_lay', carried->>'thing', 1, 0,
      jsonb_build_object('work', work_, 'have', did->'have', 'hands', jsonb_array_length(did->'hands'), 'tile', jsonb_build_array(p_x, p_y))
        || case when (did->>'span')::boolean then jsonb_build_object('span', did->'spans') else '{}'::jsonb end
        || case when did->>'find' is not null then jsonb_build_object('find', did->'find') else '{}'::jsonb end);
    -- (a line of the deeds for each of the others it came by, at the moment it was laid: only those who are still here)
    insert into public.town_deeds (member_id, at, what, thing, n, doc)
      select h.id, to_timestamp(now_ / 1000.0), 'stone_hand', carried->>'thing', 1, jsonb_build_object('by', me, 'work', work_)
        from unnest(hands) with ordinality h(id, ord) join public.profiles pr on pr.id = h.id
       where h.id <> me
       order by h.ord;
  end if;
  return town.answer(me, (did - 'purse' - 'hands') || jsonb_build_object('works', town.works_told(me)));
end;
$$;

-- Let go of the stone I hold.
create or replace function public.town_stone_drop()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  mine jsonb := town.purse_of(me, true);
  carried jsonb := town.works_carried(me);
  did jsonb;
begin
  did := town.stone_drop(carried, town.works_read(coalesce(carried->>'work', town.cat('bridge')->>'work')));
  if (did->>'ok')::boolean then
    delete from public.town_work_carried c where c.member_id = me;
    perform town.note(me, 'stone_drop', carried->>'thing', 1, 0, jsonb_build_object('work', carried->>'work'));
  end if;
  return town.answer(me, did || jsonb_build_object('works', town.works_told(me)));
end;
$$;

-- Give so many of a thing out of my bag to a work.
create or replace function public.town_work_give(p_work text, p_thing text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb := town.purse_of(me, true);
  did jsonb;
begin
  -- (the work's row is held after my purse's: two who give at the same moment are counted one after the other, and
  -- of two who would together pass what it needs the second is refused)
  perform 1 from public.town_works w where w.id = p_work for update;
  did := town.works_give(mine, town.works_read(p_work), p_thing, p_n);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.works_counted(p_work, p_thing, array[me], p_n, p_n, now_);
    perform town.note(me, 'work_give', p_thing, p_n, 0, jsonb_build_object('work', p_work, 'have', did->'have'));
  end if;
  return town.answer(me, (did - 'purse') || jsonb_build_object('works', town.works_told(me)));
end;
$$;

revoke execute on function public.town_works_read() from public, anon;
revoke execute on function public.town_stone_lift(integer, integer) from public, anon;
revoke execute on function public.town_stone_pass(uuid) from public, anon;
revoke execute on function public.town_stone_lay(integer, integer) from public, anon;
revoke execute on function public.town_stone_drop() from public, anon;
revoke execute on function public.town_work_give(text, text, integer) from public, anon;
grant execute on function public.town_works_read() to authenticated;
grant execute on function public.town_stone_lift(integer, integer) to authenticated;
grant execute on function public.town_stone_pass(uuid) to authenticated;
grant execute on function public.town_stone_lay(integer, integer) to authenticated;
grant execute on function public.town_stone_drop() to authenticated;
grant execute on function public.town_work_give(text, text, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select c.relname, c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in ('town_works', 'town_work_needs', 'town_work_hands', 'town_work_carried', 'town_work_built', 'town_work_finds') order by 1;
--   -- six rows, each t | 0
--
--   select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_works_read', 'town_stone_lift', 'town_stone_pass', 'town_stone_lay', 'town_stone_drop', 'town_work_give') order by 1;
--   -- six rows, each f | t
--
--   select w.id, w.opened_at, w.done_at, n.thing, n.need, n.have from public.town_works w join public.town_work_needs n on n.work = w.id;
--   -- bridge | (null) | (null) | stone | 600 | 0
--
--   select town.cat('bridge')->>'need' as need, town.cat('bridge')->>'reach' as reach, town.cat('bridge')->'marks'->>'one' as one_in, town.deed_th('stone_lay') as lay,
--          pg_get_functiondef('town.work_counts_of(jsonb, text)'::regprocedure) like '%''stone_hand''%' as counted;
--   -- 600 | 10 | 25 | วางหินที่เชิงสะพาน | t
--
-- ─── Opening it ──────────────────────────────────────────────────────────
--
--   update public.town_works set opened_at = now() where id = 'bridge';
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how far the bridge is, and who has built it, in the order they came
--   select n.have, n.need from public.town_work_needs n where n.work = 'bridge';
--   select p.character_name, h.n, h.first_at from public.town_work_hands h join public.profiles p on p.id = h.member_id where h.work = 'bridge' order by h.first_at;
--
--   -- who holds a stone now, whose hands it has been through, and what it has in it
--   select p.character_name as holder, (select array_agg(h.character_name order by o.ord) from unnest(c.hands) with ordinality o(id, ord) join public.profiles h on h.id = o.id) as hands, c.mark
--     from public.town_work_carried c join public.profiles p on p.id = c.member_id;
--
--   -- what was found in the stones, and whose hands each came by; and each span's hands in the order they came to it
--   select f.at, f.kind, f.span, (select array_agg(h.character_name order by o.ord) from unnest(f.hands) with ordinality o(id, ord) join public.profiles h on h.id = o.id) as hands
--     from public.town_work_finds f where f.work = 'bridge' order by f.at;
--   select b.span, array_agg(p.character_name order by b.first_at) as hands from public.town_work_built b join public.profiles p on p.id = b.member_id where b.work = 'bridge' group by b.span order by b.span;
--
--   -- how often a stone had something in it (about one in twenty-five is meant)
--   select count(*) filter (where d.what = 'stone_lay') as laid, count(*) filter (where d.what = 'stone_lay' and d.doc ? 'find') as found from public.town_deeds d;
--
--   -- stones lifted, handed on, laid and let go of, by day
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*) from public.town_deeds d where d.what like 'stone\_%' group by 1, 2 order by 1 desc, 2;
