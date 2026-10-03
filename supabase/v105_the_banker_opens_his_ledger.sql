-- v105 — the banker opens his ledger
--
-- Run this once in the Supabase SQL editor, after v104. Running it again is
-- safe.
--
-- Nothing on the site uses this yet, and it changes nothing that exists: it
-- only adds. It is the first of the migrations Cash Town's game waits for.
-- The game (fishing, the plots, the cooking yard, the uncle's stall, the bank)
-- plays today in `next dev`, with everything kept in each tester's browser.
-- Asked how to open it, the owner chose on 2026-10-03 "ยังไม่ Push รอฐานข้อมูล":
-- nothing goes up until the database keeps it. And, asked how a newcomer with
-- no coins should begin: "เปิดจริงไปเลย แลก popoto จริงได้เลย". So the first thing
-- the database has to keep is the banker's: Popoto coins, and the popoto that
-- were changed into them.
--
-- What he settled, which this holds to (lib/town/trade.ts is the same rule, in
-- the browser's trial):
--   · one popoto is five Popoto coins, and one person changes at most twenty
--     popoto a week, the week beginning on Monday in Bangkok;
--   · popoto from the profile and popoto from pictures can both be changed,
--     one way only for now, into coins;
--   · "เอาจำนวนลดลง แต่ประวัติการกด send popoto ยังอยู่": the count goes down and the
--     record of every send stays. No row of `kudos` or `gallery_likes` is ever
--     deleted or changed here. What was changed is written down in a ledger of
--     its own, and what a member still has to change is what they were sent
--     less what the ledger says they changed.
--   · Popoto coins are not the gil of the site's wallet ("ระบบเงินแยกกับ wallet ที่
--     มีในเว็ป"), so nothing here is called a wallet or touches one.
--
-- What this does NOT do yet, on purpose: make the popoto boards, the member
-- page and the draws count less. v104's own comment says where that belongs
-- (inside popoto_totals, each receiver's oldest going first), and which popoto
-- stop counting is the owner's to settle before anybody writes it. Until that
-- migration has run, the bank must stay shut: a member who changed popoto
-- would otherwise still show every one of them on the board, which is not
-- what the banker tells them. Running this file opens nothing by itself: the
-- functions below are only called by code that has not been pushed.
--
-- The decisions a reader might question:
--
-- Closed tables, like the town's vote (v103). Row-level security is on and
-- neither anon nor authenticated is granted anything: a purse is read and
-- changed only through the two functions, which are security definer for that
-- reason. A coin a browser could write would be a coin anybody could mint.
--
-- A refusal that a member can run into is an answer, not an error. The week's
-- twenty are changed already, there are not that many popoto left, the number
-- is not a whole one above nothing: town_exchange answers `ok = false` with
-- `why` naming it (cap, popoto, amount), the same three words lib/town/trade.ts
-- gives, so the page shows the same line either way. Only what the page never
-- lets happen raises: nobody signed in, no proved character.
--
-- Popoto one gave oneself are not changed. The banker's words are "popoto ที่
-- เพื่อนๆ ส่งให้": a popoto sent to one's own profile, or to one's own picture,
-- still counts on the boards as it always has, but it is not coin. Otherwise
-- a daily popoto to oneself would be a daily five coins for nothing.
--
-- The profile's popoto belong to the character, the pictures' to the member.
-- `kudos` is kept by character id, so the ledger keeps the character each
-- profile popoto was changed for, and what is left is counted against that
-- character: if a character is one day proved by another account, what was
-- changed stays changed. For the same reason the ledger outlives its member
-- (`on delete set null`, not cascade): deleting an account must not hand its
-- character's popoto back to be changed again.
--
-- One purse at a time. town_exchange takes the member's purse row `for update`
-- before it counts anything, so two exchanges sent at once by the same member
-- are done one after the other and the second sees what the first changed.
--
-- The knobs are a table, not constants: "1 popoto = 5 coins and 20 popoto a
-- week, both kept in the database". Nobody in a browser is granted it; an
-- admin changes a number with the service key or here in the editor, until
-- the admin panel has a place for them.
--
-- The indexes are made only if nothing like them is there (v104 did the same
-- for created_at): some early migrations were never committed, and a second
-- copy of an index is dead weight on every popoto sent.

/* ── the knobs ───────────────────────────────────────────────────────────── */

create table if not exists public.town_knobs (
  key        text primary key check (key ~ '^[a-z][a-z_]{0,39}$'),
  value      integer not null,
  updated_at timestamptz not null default now()
);

alter table public.town_knobs enable row level security;
revoke all on public.town_knobs from anon, authenticated;

insert into public.town_knobs (key, value) values
  ('bank_rate', 5),      -- Popoto coins for one popoto
  ('bank_weekly', 20)    -- popoto one person may change in a week
  on conflict (key) do nothing;

/* ── the purse ───────────────────────────────────────────────────────────── */

create table if not exists public.town_purses (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  coins      integer not null default 0 check (coins >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.town_purses enable row level security;
revoke all on public.town_purses from anon, authenticated;

/* ── the ledger ──────────────────────────────────────────────────────────── */

create table if not exists public.town_exchanges (
  id           bigint generated always as identity primary key,
  -- Null once the account is gone: the line stays (see above).
  member_id    uuid references public.profiles (id) on delete set null,
  kind         text not null check (kind in ('profile', 'gallery')),
  -- The character whose profile popoto these were; null for pictures' popoto.
  character_id bigint,
  popoto       integer not null check (popoto between 1 and 1000),
  coins        integer not null check (coins >= 0),
  -- The Monday, in Bangkok, of the week it counts in.
  week         date not null,
  created_at   timestamptz not null default now(),
  check ((kind = 'profile') = (character_id is not null))
);

create index if not exists town_exchanges_week on public.town_exchanges (member_id, week);
create index if not exists town_exchanges_character on public.town_exchanges (character_id)
  where kind = 'profile';
create index if not exists town_exchanges_pictures on public.town_exchanges (member_id)
  where kind = 'gallery';

alter table public.town_exchanges enable row level security;
revoke all on public.town_exchanges from anon, authenticated;

/* ── counting what was sent ──────────────────────────────────────────────── */

do $$
begin
  if not exists (
    select 1
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_am m on m.oid = c.relam
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
     where i.indrelid = 'public.kudos'::regclass
       and m.amname = 'btree' and a.attname = 'receiver_character_id'
       and i.indpred is null and i.indisvalid
  ) then
    create index kudos_receiver on public.kudos (receiver_character_id);
  end if;
  if not exists (
    select 1
      from pg_index i
      join pg_class c on c.oid = i.indexrelid
      join pg_am m on m.oid = c.relam
      join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
     where i.indrelid = 'public.gallery_posts'::regclass
       and m.amname = 'btree' and a.attname = 'author_id'
       and i.indpred is null and i.indisvalid
  ) then
    create index gallery_posts_author on public.gallery_posts (author_id);
  end if;
end $$;

-- What a member still has to change: what friends sent, less what the ledger
-- says was changed. Never below nothing (a picture's popoto can be taken
-- back by whoever gave it, after it was changed). For the two functions
-- below only: nobody in a browser may call it with somebody else's id.
create or replace function public.town_popoto_left(p_member uuid)
returns table (profile_left integer, gallery_left integer)
language sql stable security definer set search_path = public
as $$
  with who as (
    select p.id,
           case when p.character_verified_at is not null then p.character_id end as character_id
      from public.profiles p
     where p.id = p_member
  )
  select greatest(0,
           (select count(*) from public.kudos k
             where k.receiver_character_id = w.character_id and k.sender_id <> w.id)
           - coalesce((select sum(e.popoto) from public.town_exchanges e
                        where e.kind = 'profile' and e.character_id = w.character_id), 0)
         )::integer,
         greatest(0,
           (select count(*) from public.gallery_likes l
              join public.gallery_posts g on g.id = l.post_id
             where g.author_id = w.id and l.profile_id <> w.id)
           - coalesce((select sum(e.popoto) from public.town_exchanges e
                        where e.kind = 'gallery' and e.member_id = w.id), 0)
         )::integer
    from who w;
$$;

revoke execute on function public.town_popoto_left(uuid) from public, anon, authenticated;

/* ── the counter ─────────────────────────────────────────────────────────── */

-- What the bank's panel shows: my coins, the rate, the week's limit and how
-- much of it I have used, and what I have left to change of each kind.
create or replace function public.town_bank()
returns table (
  coins        integer,
  rate         integer,
  weekly       integer,
  changed      integer,
  profile_left integer,
  gallery_left integer
)
language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  this_week date := date_trunc('week', now() at time zone 'Asia/Bangkok')::date;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the bank is for a proved character' using errcode = '42501';
  end if;
  return query
    select coalesce((select p.coins from public.town_purses p where p.member_id = me), 0),
           (select k.value from public.town_knobs k where k.key = 'bank_rate'),
           (select k.value from public.town_knobs k where k.key = 'bank_weekly'),
           coalesce((select sum(e.popoto) from public.town_exchanges e
                      where e.member_id = me and e.week = this_week), 0)::integer,
           l.profile_left, l.gallery_left
      from public.town_popoto_left(me) l;
end;
$$;

revoke execute on function public.town_bank() from public, anon;
grant execute on function public.town_bank() to authenticated;

-- Change popoto into Popoto coins. Answers what the panel shows afterwards,
-- with `ok` and, when it was not done, `why`: 'amount' (not a whole number
-- above nothing), 'cap' (more than is left of the week's limit), 'popoto'
-- (not that many left of that kind).
create or replace function public.town_exchange(p_kind text, p_popoto integer)
returns table (
  ok           boolean,
  why          text,
  coins        integer,
  changed      integer,
  profile_left integer,
  gallery_left integer
)
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  this_week date := date_trunc('week', now() at time zone 'Asia/Bangkok')::date;
  rate integer;
  weekly integer;
  used integer;
  have_profile integer;
  have_gallery integer;
  mine bigint;
  refusal text;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the bank is for a proved character' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('profile', 'gallery') then
    raise exception 'no such kind of popoto' using errcode = '22023';
  end if;

  -- My purse, made if this is the first time, and held until this is done:
  -- a second exchange of mine waits here and then sees this one.
  insert into public.town_purses (member_id) values (me) on conflict (member_id) do nothing;
  perform 1 from public.town_purses p where p.member_id = me for update;

  select k.value into rate from public.town_knobs k where k.key = 'bank_rate';
  select k.value into weekly from public.town_knobs k where k.key = 'bank_weekly';
  select coalesce(sum(e.popoto), 0) into used
    from public.town_exchanges e where e.member_id = me and e.week = this_week;
  select l.profile_left, l.gallery_left into have_profile, have_gallery
    from public.town_popoto_left(me) l;

  if p_popoto is null or p_popoto < 1 then
    refusal := 'amount';
  elsif used + p_popoto > weekly then
    refusal := 'cap';
  elsif p_popoto > (case p_kind when 'profile' then have_profile else have_gallery end) then
    refusal := 'popoto';
  end if;

  if refusal is null then
    if p_kind = 'profile' then
      select p.character_id into mine from public.profiles p where p.id = me;
    end if;
    insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week)
      values (me, p_kind, mine, p_popoto, p_popoto * rate, this_week);
    update public.town_purses p
       set coins = p.coins + p_popoto * rate, updated_at = now()
     where p.member_id = me;
    used := used + p_popoto;
    if p_kind = 'profile' then have_profile := have_profile - p_popoto;
    else have_gallery := have_gallery - p_popoto; end if;
  end if;

  return query
    select refusal is null, refusal,
           (select p.coins from public.town_purses p where p.member_id = me),
           used, have_profile, have_gallery;
end;
$$;

revoke execute on function public.town_exchange(text, integer) from public, anon;
grant execute on function public.town_exchange(text, integer) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, value from public.town_knobs order by key;
--   -- bank_rate | 5
--   -- bank_weekly | 20
--
--   select c.relname, c.relrowsecurity
--     from pg_class c
--    where c.oid in ('public.town_knobs'::regclass, 'public.town_purses'::regclass,
--                    'public.town_exchanges'::regclass)
--    order by 1;
--   -- town_exchanges | true
--   -- town_knobs     | true
--   -- town_purses    | true
--
--   select count(*) from information_schema.role_table_grants
--    where table_schema = 'public'
--      and table_name in ('town_knobs', 'town_purses', 'town_exchanges')
--      and grantee in ('anon', 'authenticated');
--   -- 0
--
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_bank', 'town_exchange', 'town_popoto_left')
--    order by 1;
--   -- town_bank        | false | true
--   -- town_exchange    | false | true
--   -- town_popoto_left | false | false
--
--   select count(*) from public.town_purses;      -- 0, until the bank opens
--   select count(*) from public.town_exchanges;   -- 0
