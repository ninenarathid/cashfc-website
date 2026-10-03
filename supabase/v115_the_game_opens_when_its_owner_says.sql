-- v115 — the town's game opens when its owner says
--
-- Run this once in the Supabase SQL editor, after v114. Running it again is
-- safe.
--
-- Nothing on the site calls the game's functions yet, so nobody sees a
-- change. It is here for the day the game's pages are pushed: they can go up
-- with the game shut, be looked at by the admins on the real site, and be
-- opened to everybody from here, with no deploy:
--
--   update public.town_knobs set value = 1 where key = 'game_open';
--
-- (and shut again with 0). The town itself, its room, its voice and its
-- vote are not the game and are not touched: every proved character walks
-- in as before.
--
-- What it changes. Since v105 and v106 every function of the game's has
-- answered any member with a proved character. From now on it answers an
-- admin always, and a proved character only while the knob `game_open` is
-- above nothing; anybody else is refused as they always were. That is the
-- rule in the database, which is the only place a rule holds: a page that
-- merely hid its buttons would leave the bank open to whoever calls it by
-- hand, and the bank changes real popoto.
--
--   · `town.member()` (v106), which every function of the game's begins
--     with, has the one check more.
--   · The bank's two (`town_bank`, v105; `town_exchange`, v114) made their
--     own check before `town.member()` existed: each now asks it too, and is
--     otherwise word for word what it was.
--   · `town_is_open()` is new: whether the game is open to whoever asks, as a
--     yes or no. The page asks it first, so that a member the game is not
--     open to is told so without being refused anything.
--
-- The popoto board's two counts (`popoto_totals`, `popoto_count`) are not
-- the game's and answer everybody, as they do today.

/* ── the knob ────────────────────────────────────────────────────────────── */

insert into public.town_knobs (key, value) values
  ('game_open', 0)    -- whether the game is open to every proved character: until it is, to admins only
  on conflict (key) do nothing;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- v106's, with one thing more: the game is open to them.
create or replace function town.member()
returns uuid language plpgsql stable set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'the town is for a proved character' using errcode = '42501';
  end if;
  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) <= 0 then
    raise exception 'the town''s game is not open yet' using errcode = '42501';
  end if;
  return me;
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- Whether the game is open to whoever asks: the same rule, as a yes or no.
create or replace function public.town_is_open()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.is_admin()
          or (public.verified_character()
              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0));
$$;

comment on function public.town_is_open() is
  'Whether Cash Town''s game is open to whoever asks: an admin always, a '
  'proved character while town_knobs.game_open is above nothing.';

revoke execute on function public.town_is_open() from public, anon;
grant execute on function public.town_is_open() to authenticated;

/* ── the bank ────────────────────────────────────────────────────────────── */

-- v105's, with one thing more: the game is open to them.
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
  perform town.member();
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

-- v114's, with one thing more: the game is open to them.
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
  perform town.member();
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
--   -- game_open    | 0
--
--   select p.proname, p.prosecdef as definer,
--          has_function_privilege('anon', p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_is_open', 'town_bank', 'town_exchange')
--    order by 1;
--   -- town_bank     | true | false | true
--   -- town_exchange | true | false | true
--   -- town_is_open  | true | false | true
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- false | 0
--
--   -- (in the SQL editor nobody is signed in, so this says false; it is the page's to ask)
--   select public.town_is_open();
--   -- false
