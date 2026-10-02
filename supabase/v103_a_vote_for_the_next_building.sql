-- v103 — a vote for the town's next building
--
-- Run this once in the Supabase SQL editor, after v102. Running it again is
-- safe.
--
-- Cash Town's Popoto Board (the owner, 2026-10-02) tells the town how the
-- building work is going (Popoto Shop now) and lets everybody in town vote for
-- what goes up next: a condo with private rooms, village land plots, or the
-- Popoto village municipal office. Without this the board can show the
-- choices but not count anything.
--
-- How it is kept safe:
--   · Nobody reads or writes the vote rows themselves. RLS is on with no
--     policies and every grant revoked, so the only ways in are the three
--     functions below, which run as their owner and check who is asking.
--   · Voting needs a proved character (v85's rule for anything written), the
--     same people the town lets in.
--   · One vote per member per poll: the primary key. Voting again changes it;
--     voting "nothing" takes it back. A member can only ever touch their own
--     row (the functions use auth.uid(), never an id from the browser), so a
--     take-back can never remove anybody else's (the toggle rule, v98).
--   · The tally gives counts, never who voted for what.
--   · A poll can be closed (town_polls.open), and its number of choices bounds
--     what may be voted for. Polls are opened and closed with the service key
--     or this editor; there is no browser way to.

/* ── the polls ───────────────────────────────────────────────────────────── */

create table if not exists public.town_polls (
  id         text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  choices    smallint not null check (choices between 2 and 9),
  open       boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.town_polls enable row level security;
revoke all on public.town_polls from anon, authenticated;

insert into public.town_polls (id, choices, open) values ('next-building', 3, true)
  on conflict (id) do nothing;

/* ── the votes ───────────────────────────────────────────────────────────── */

create table if not exists public.town_votes (
  poll       text not null references public.town_polls (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  choice     smallint not null check (choice between 1 and 9),
  voted_at   timestamptz not null default now(),
  primary key (poll, member_id)
);

create index if not exists town_votes_member on public.town_votes (member_id);
create index if not exists town_votes_tally on public.town_votes (poll, choice);

alter table public.town_votes enable row level security;
revoke all on public.town_votes from anon, authenticated;

/* ── voting ──────────────────────────────────────────────────────────────── */

-- Vote, change a vote (another choice), or take it back (null).
create or replace function public.town_vote(p_poll text, p_choice smallint)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  n smallint;
begin
  if me is null then raise exception 'not signed in' using errcode = '42501'; end if;
  if not (public.verified_character() or public.is_admin()) then
    raise exception 'a proved character votes' using errcode = '42501';
  end if;
  select choices into n from public.town_polls where id = p_poll and open;
  if n is null then raise exception 'no such open poll' using errcode = '22023'; end if;
  if p_choice is null then
    delete from public.town_votes where poll = p_poll and member_id = me;
    return;
  end if;
  if p_choice < 1 or p_choice > n then raise exception 'no such choice' using errcode = '22023'; end if;
  insert into public.town_votes (poll, member_id, choice) values (p_poll, me, p_choice)
    on conflict (poll, member_id) do update set choice = excluded.choice, voted_at = now();
end;
$$;

revoke execute on function public.town_vote(text, smallint) from public, anon;
grant execute on function public.town_vote(text, smallint) to authenticated;

-- The counts: how many chose each choice, never who.
create or replace function public.town_vote_tally(p_poll text)
returns table (choice smallint, votes integer)
language sql stable security definer set search_path = public
as $$
  select v.choice, count(*)::int
  from public.town_votes v
  where v.poll = p_poll and auth.uid() is not null
  group by v.choice
  order by v.choice;
$$;

revoke execute on function public.town_vote_tally(text) from public, anon;
grant execute on function public.town_vote_tally(text) to authenticated;

-- My own vote, so the board can show which I chose (null: none).
create or replace function public.town_my_vote(p_poll text)
returns smallint
language sql stable security definer set search_path = public
as $$
  select v.choice from public.town_votes v
  where v.poll = p_poll and v.member_id = auth.uid();
$$;

revoke execute on function public.town_my_vote(text) from public, anon;
grant execute on function public.town_my_vote(text) to authenticated;

notify pgrst, 'reload schema';

-- What it should say afterwards:
--
--   select id, choices, open from public.town_polls;
--     → next-building | 3 | true
--
--   select relname, relrowsecurity from pg_class
--    where oid in ('public.town_polls'::regclass, 'public.town_votes'::regclass) order by relname;
--     → town_polls | true
--       town_votes | true
--
--   select count(*) from information_schema.role_table_grants
--    where table_name in ('town_polls', 'town_votes') and grantee in ('anon', 'authenticated');
--     → 0
--
--   select routine_name from information_schema.routine_privileges
--    where routine_name like 'town_%vot%' and grantee = 'authenticated' order by routine_name;
--     → town_my_vote, town_vote, town_vote_tally
