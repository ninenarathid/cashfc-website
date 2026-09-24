-- v94 — a name for the site
--
-- Run this once in the Supabase SQL editor. It needs v85 (verified_character)
-- and is_admin().
--
-- The site lives on cashfc-website.vercel.app, which is Vercel's name for it
-- rather than the FC's. Before one is bought the FC gets to choose it: three
-- days, one vote each, and the list is the members' own — anybody who can vote
-- can put a name on it, with what it costs a year, so the choice is between
-- real options at real prices rather than between whatever an admin thought of.
--
--   domain_polls    one row per round: when it opens, when it closes, and a
--                   switch to take it off the front page once the FC is done.
--   domain_choices  the names on the ballot, who suggested each, and its price
--                   in US dollars a year, which is how registrars quote it.
--   domain_votes    one row per member per round. Changing your mind is an
--                   update of that row, never a second one.
--
-- Separate from polls/poll_votes on purpose. The gallery card reads the newest
-- open row in polls, so a domain question there would turn up on the gallery
-- with none of its options — and polls keep their options in one column an
-- admin writes, which is exactly what this round is not.
--
-- Totals are published, who voted which way is not: the votes table only ever
-- shows somebody their own row, and domain_poll_tally counts the rest. Same
-- shape as poll_tally, for the same reason.
--
-- Everything written here is written by a verified character (v85), under its
-- own restrictive policies as well as the table's, so the rule stays one rule.

/* ── the round ─────────────────────────────────────────────────────────── */

create table if not exists public.domain_polls (
  id          bigserial primary key,
  opens_at    timestamptz not null default now(),
  closes_at   timestamptz not null default now() + interval '3 days',
  -- Off the front page. A round that has only run out of time keeps its card
  -- so the result can be read; this is how it goes away afterwards.
  closed      boolean not null default false,
  created_at  timestamptz not null default now(),
  check (closes_at > opens_at)
);

alter table public.domain_polls enable row level security;

drop policy if exists domain_polls_read on public.domain_polls;
create policy domain_polls_read on public.domain_polls
  for select to anon, authenticated using (true);

drop policy if exists domain_polls_admin_write on public.domain_polls;
create policy domain_polls_admin_write on public.domain_polls
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists domain_polls_admin_edit on public.domain_polls;
create policy domain_polls_admin_edit on public.domain_polls
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.domain_polls to anon, authenticated;
grant insert, update on public.domain_polls to authenticated;
grant usage on sequence public.domain_polls_id_seq to authenticated;

-- Open means now, not merely not-closed: the window is the whole point of a
-- three-day vote, and the page's clock is the reader's, not the database's.
create or replace function public.domain_poll_open(p_poll bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.domain_polls
     where id = p_poll and not closed
       and now() >= opens_at and now() < closes_at
  );
$$;

grant execute on function public.domain_poll_open(bigint) to anon, authenticated;

/* ── the names on the ballot ───────────────────────────────────────────── */

create table if not exists public.domain_choices (
  id          bigserial primary key,
  poll_id     bigint not null references public.domain_polls(id) on delete cascade,
  -- Lower case, no scheme, no path: the page tidies what was typed before it
  -- gets here, and this refuses anything it missed. A Thai name goes in as its
  -- punycode (xn--…), which is what a registrar sells anyway.
  domain      text not null check (
                char_length(domain) between 4 and 253
                and domain ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]([a-z0-9-]*[a-z0-9])?$'),
  -- A year of it, in dollars. Optional, because somebody may know the name
  -- they want before they know what it costs.
  price_usd   numeric(9,2) check (price_usd is null or (price_usd >= 0 and price_usd < 100000)),
  added_by    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (poll_id, domain),
  -- So a vote can name its choice and its round in one key and cannot pair a
  -- choice with a round it is not on.
  unique (id, poll_id)
);

create index if not exists domain_choices_added_by on public.domain_choices (added_by);

alter table public.domain_choices enable row level security;

-- How many names somebody has put on this round. Definer, so the count sees
-- every row and not only the ones a policy would show.
create or replace function public.domain_choices_mine(p_poll bigint)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::int from public.domain_choices
   where poll_id = p_poll and added_by = (select auth.uid());
$$;

grant execute on function public.domain_choices_mine(bigint) to authenticated;

drop policy if exists domain_choices_read on public.domain_choices;
create policy domain_choices_read on public.domain_choices
  for select to anon, authenticated using (true);

-- Three each, so the ballot stays a list somebody can read in one go.
drop policy if exists domain_choices_add on public.domain_choices;
create policy domain_choices_add on public.domain_choices
  for insert to authenticated
  with check (
    added_by = (select auth.uid())
    and public.domain_poll_open(poll_id)
    and public.domain_choices_mine(poll_id) < 3
  );

grant select on public.domain_choices to anon, authenticated;
grant insert, delete on public.domain_choices to authenticated;
grant usage on sequence public.domain_choices_id_seq to authenticated;

/* ── the votes ─────────────────────────────────────────────────────────── */

create table if not exists public.domain_votes (
  poll_id     bigint not null references public.domain_polls(id) on delete cascade,
  profile_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  choice_id   bigint not null,
  voted_at    timestamptz not null default now(),
  primary key (poll_id, profile_id),
  -- A name taken off the ballot takes its votes with it, and those members
  -- are simply back to not having voted.
  foreign key (choice_id, poll_id)
    references public.domain_choices (id, poll_id) on delete cascade
);

create index if not exists domain_votes_choice on public.domain_votes (choice_id);

alter table public.domain_votes enable row level security;

drop policy if exists domain_votes_own_read on public.domain_votes;
create policy domain_votes_own_read on public.domain_votes
  for select to authenticated using (profile_id = (select auth.uid()));

drop policy if exists domain_votes_own_write on public.domain_votes;
create policy domain_votes_own_write on public.domain_votes
  for insert to authenticated
  with check (profile_id = (select auth.uid()) and public.domain_poll_open(poll_id));

-- Changing your mind, for as long as the round is open.
drop policy if exists domain_votes_own_edit on public.domain_votes;
create policy domain_votes_own_edit on public.domain_votes
  for update to authenticated
  using (profile_id = (select auth.uid()) and public.domain_poll_open(poll_id))
  with check (profile_id = (select auth.uid()) and public.domain_poll_open(poll_id));

grant select, insert, update on public.domain_votes to authenticated;

create or replace function public.domain_poll_tally(p_poll bigint)
returns table (choice_id bigint, votes bigint)
language sql stable security definer set search_path = public
as $$
  select v.choice_id, count(*)
    from public.domain_votes v
   where v.poll_id = p_poll
   group by v.choice_id;
$$;

grant execute on function public.domain_poll_tally(bigint) to anon, authenticated;

/* ── taking a name back ─────────────────────────────────────────────── */

-- Whether anybody other than the one asking has voted for this name. Definer
-- because the votes table shows each member only their own row.
create or replace function public.domain_choice_backed(p_choice bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.domain_votes
     where choice_id = p_choice and profile_id <> (select auth.uid())
  );
$$;

grant execute on function public.domain_choice_backed(bigint) to authenticated;

-- Taking a name back is for fixing a typo, not for pulling one out from under
-- the people who chose it: once somebody else has voted for it, it stays. An
-- admin can still remove anything.
drop policy if exists domain_choices_take_back on public.domain_choices;
create policy domain_choices_take_back on public.domain_choices
  for delete to authenticated
  using (
    (select public.is_admin())
    or (added_by = (select auth.uid())
        and public.domain_poll_open(poll_id)
        and not public.domain_choice_backed(id))
  );

/* ── the v85 rule, on both tables members write to ─────────────────────── */

drop policy if exists domain_choices_named_write on public.domain_choices;
create policy domain_choices_named_write on public.domain_choices
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists domain_choices_named_drop on public.domain_choices;
create policy domain_choices_named_drop on public.domain_choices
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists domain_votes_named_write on public.domain_votes;
create policy domain_votes_named_write on public.domain_votes
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists domain_votes_named_edit on public.domain_votes;
create policy domain_votes_named_edit on public.domain_votes
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

/* ── the first round ───────────────────────────────────────────────────── */

-- Three days from the moment this is run. `node scripts/domain-poll.mjs open`
-- starts a fresh round (and ends this one) when the vote goes out for real.
insert into public.domain_polls (opens_at, closes_at)
select now(), now() + interval '3 days'
 where not exists (select 1 from public.domain_polls);

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select id, opens_at, closes_at, closed from public.domain_polls;
--   select tablename, policyname, cmd, permissive from pg_policies
--    where tablename like 'domain\_%' order by tablename, policyname;
