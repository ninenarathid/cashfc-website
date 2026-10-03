-- v114 — what was changed no longer counts
--
-- Run this once in the Supabase SQL editor, after v113. Running it again is
-- safe.
--
-- Until somebody changes popoto at Cash Town's bank, this alters nothing
-- anybody sees: with nothing changed, the popoto board and every other page
-- say exactly what they said before (the dry run holds the new counting to
-- v104's own, row for row, on thousands of made-up popoto). The bank is not
-- open: nothing on the site calls it yet.
--
-- What it is for. v105 left one thing undone on purpose: "make the popoto
-- boards [and] the member page … count less", and said the bank must stay
-- shut until then, since a member who changed popoto into coins would still
-- show every one of them on the board. The owner settled which popoto stop
-- counting ("ลูกเก่าสุดของคนนั้นก่อน": each receiver's oldest first), that the
-- record of every send stays ("เอาจำนวนลดลง แต่ประวัติการกด send popoto ยังอยู่"), and,
-- asked who should do it, on 2026-10-04: "คุณทำเลย อย่าให้กระทบ ส่วนอื่น หรือ event
-- อื่น". So this is as small as it can be:
--
--   · The profile popoto board (`popoto_totals`, v104) leaves out, for each
--     character, as many of their oldest popoto as they have changed. A
--     month's board is touched only when somebody has changed so many that
--     their oldest reach into the month.
--   · `popoto_count(character)` is the same count for one character, for the
--     member page, which counted the rows itself.
--   · No row of `kudos` is deleted, changed or hidden. Who gave to whom, and
--     when, reads as it always has: the lists of givers, the admin's charts
--     and log, the rare popoto, Evercold's days and every draw are about the
--     giving, and are not touched. Nothing here reads or writes any of their
--     tables or functions.
--   · Popoto on pictures cannot be changed yet. The picture board divides
--     each picture's popoto between everybody in it (the FC's own vote), so
--     "which of them stop counting" is not this file's to decide, and that
--     board is left exactly as it is. A knob keeps the bank's picture side
--     shut (`bank_gallery`, 0): what a member has left to change from
--     pictures is told as none, and such a change is refused. Set it to 1
--     when the picture board has been settled.
--
-- How the board knows. `town_changed` keeps, for each character who has
-- changed any, how many, and the id of the newest popoto that no longer
-- counts: a popoto counts when its id is above that. The mark is moved on
-- when popoto are changed, by as many of the oldest that still count, never
-- on the way to drawing a board, so the board costs what it cost. It only
-- ever moves forward, and only by what was changed: a popoto below it that
-- is taken away afterwards (its giver's account closed) costs its receiver
-- nothing more.
--
-- `popoto_totals` becomes security definer, as v104 said it would have to
-- the day it read something a visitor cannot: it now reads `town_changed`,
-- which is closed. It still returns counts and never a sender, to exactly the
-- roles it was granted to.

/* ── the knob ────────────────────────────────────────────────────────────── */

insert into public.town_knobs (key, value) values
  ('bank_gallery', 0)    -- whether popoto on pictures can be changed: not until the picture board counts less
  on conflict (key) do nothing;

/* ── what no longer counts ───────────────────────────────────────────────── */

create table if not exists public.town_changed (
  character_id bigint primary key,
  popoto       integer not null check (popoto >= 1),
  cut_id       bigint not null,
  updated_at   timestamptz not null default now()
);

alter table public.town_changed enable row level security;
revoke all on public.town_changed from anon, authenticated;

-- Move a character's mark on by so many: the oldest of their popoto that
-- still count stop counting (all of them, if there are fewer).
create or replace function town.mark_changed(p_character bigint, p_popoto integer)
returns void language plpgsql set search_path = public
as $$
declare
  had integer;
  cut bigint;
  next_cut bigint;
begin
  if p_character is null or p_popoto is null or p_popoto < 1 then return; end if;
  select c.popoto, c.cut_id into had, cut from public.town_changed c where c.character_id = p_character for update;
  had := coalesce(had, 0);
  cut := coalesce(cut, 0);
  select k.id into next_cut from public.kudos k
   where k.receiver_character_id = p_character and k.id > cut order by k.id offset p_popoto - 1 limit 1;
  if next_cut is null then
    select max(k.id) into next_cut from public.kudos k where k.receiver_character_id = p_character and k.id > cut;
  end if;
  insert into public.town_changed (character_id, popoto, cut_id) values (p_character, had + p_popoto, coalesce(next_cut, cut))
    on conflict (character_id) do update set popoto = excluded.popoto, cut_id = excluded.cut_id, updated_at = now();
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- Whatever the ledger says that no mark has counted yet (nothing, today).
select town.mark_changed(s.character_id, s.n - coalesce(c.popoto, 0))
  from (select e.character_id, sum(e.popoto)::integer as n from public.town_exchanges e
         where e.kind = 'profile' and e.character_id is not null group by e.character_id) s
  left join public.town_changed c on c.character_id = s.character_id
 where s.n > coalesce(c.popoto, 0);

/* ── the board ───────────────────────────────────────────────────────────── */

-- v104's counting, less what was changed: a popoto counts when it is newer
-- than its receiver's mark. The same columns, in the same order.
create or replace function public.popoto_totals(
  p_since timestamptz default null
)
returns table (
  receiver_character_id bigint,
  score                 bigint,
  n                     bigint,
  first_id              bigint
)
language sql stable security definer set search_path = public
as $$
  select k.receiver_character_id,
         count(*)                    as score,
         count(distinct k.sender_id) as n,
         min(k.id)                   as first_id
    from public.kudos k
    left join public.town_changed c on c.character_id = k.receiver_character_id
   where k.created_at >= coalesce(p_since, '-infinity'::timestamptz)
     and k.id > coalesce(c.cut_id, 0)
   group by k.receiver_character_id
   order by min(k.id);
$$;

comment on function public.popoto_totals(timestamptz) is
  'The popoto board: for each character, how many popoto (score) and from how '
  'many people (n) since p_since, or ever when it is null, in the order each '
  'was first given one (first_id), less the oldest of each that were changed '
  'into Popoto coins (town_changed). Definer since v114, because that table is '
  'closed: counts only, never who gave.';

revoke all on function public.popoto_totals(timestamptz) from public;
grant execute on function public.popoto_totals(timestamptz)
  to anon, authenticated, service_role;

-- The same for one character: how many popoto they have that still count.
create or replace function public.popoto_count(p_character bigint)
returns bigint
language sql stable security definer set search_path = public
as $$
  select count(*)
    from public.kudos k
   where k.receiver_character_id = p_character
     and k.id > coalesce((select c.cut_id from public.town_changed c where c.character_id = p_character), 0);
$$;

comment on function public.popoto_count(bigint) is
  'How many popoto a character has that still count: every one they were '
  'given, less the oldest that were changed into Popoto coins. A count only.';

revoke all on function public.popoto_count(bigint) from public;
grant execute on function public.popoto_count(bigint)
  to anon, authenticated, service_role;

/* ── the bank ────────────────────────────────────────────────────────────── */

-- v105's, with the picture side behind its knob: while it is shut, there is
-- nothing to change from pictures.
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
         case when coalesce((select k.value from public.town_knobs k where k.key = 'bank_gallery'), 0) > 0 then
           greatest(0,
             (select count(*) from public.gallery_likes l
                join public.gallery_posts g on g.id = l.post_id
               where g.author_id = w.id and l.profile_id <> w.id)
             - coalesce((select sum(e.popoto) from public.town_exchanges e
                          where e.kind = 'gallery' and e.member_id = w.id), 0)
           )::integer
         else 0 end
    from who w;
$$;

revoke execute on function public.town_popoto_left(uuid) from public, anon, authenticated;

-- v105's, with one thing more: popoto changed from the profile move their
-- character's mark, so the board counts them no longer.
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
    -- the board counts them no longer: the character's oldest first
    if p_kind = 'profile' then perform town.mark_changed(mine, p_popoto); end if;
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
--   -- bank_gallery | 0
--   -- bank_rate    | 5
--   -- bank_weekly  | 20
--
--   select count(*) from public.town_changed;
--   -- 0, until somebody changes popoto
--
--   select c.relrowsecurity,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name = 'town_changed' and grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_changed'::regclass;
--   -- true | 0
--
--   select p.proname, p.prosecdef as definer,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('popoto_totals', 'popoto_count', 'town_exchange', 'town_popoto_left')
--    order by 1;
--   -- popoto_count     | true | true  | true
--   -- popoto_totals    | true | true  | true
--   -- town_exchange    | true | false | true
--   -- town_popoto_left | true | false | false
--
--   -- the board is what it was: every popoto there is, on it
--   select (select coalesce(sum(score), 0) from public.popoto_totals()) as on_the_board,
--          (select count(*) from public.kudos) as popoto;
--   -- the same number twice
