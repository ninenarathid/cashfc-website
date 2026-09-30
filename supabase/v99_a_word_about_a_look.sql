-- v99 — a word about a look
--
-- Run this once in the Supabase SQL editor. It needs v98 (the contest) and
-- v85 (verified_character). Running it again is safe.
--
-- A glamour contest's looks get the same conversation a gallery picture has:
-- messages with pictures, replies, reactions, editing, taking one back. The
-- two tables are the gallery's own, column for column, so lib/threads.ts can
-- read and write them exactly as it does gallery_comments — the page only has
-- to say which tables.
--
--   contest_comments            what is said under a look
--   contest_comment_reactions   the emoji on each of those
--
-- The one rule the gallery does not have: while a contest keeps its names
-- hidden, nobody says anything under their own look — no message, no
-- reaction. A message carries a name, and one under your own look is the name
-- of whoever entered it: the thing hide_names exists to keep back. Once the
-- result is out, or if the contest never hid names, it is a conversation like
-- any other.
--
-- Reading follows the look: whoever may see a look may read what is said
-- about it, so a look still waiting for approval has a conversation only its
-- author and the admins can see, the same as the look itself.
--
-- Reactions carry a name and a character, which the page fills in. Here they
-- are taken from the reactor's own profile instead, so a reaction cannot be
-- put up in somebody else's name.

/* ── who may speak under a look ──────────────────────────────────────────── */

/*
 * Whether the caller may write under this look: they can see it, and it is
 * not their own look in a contest that is hiding names. Definer, so the look
 * and its contest are read whatever the caller's own view of them is — the
 * visibility rule is asked explicitly, the same one contest_looks asks.
 */
create or replace function public.contest_talk_open(p_entry bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.contest_entries e
     where e.id = p_entry
       and (public.is_admin()
            or e.author_id = auth.uid()
            or public.contest_look_shown(e.contest_id, e.hidden, e.approved_at))
       and not (e.author_id = auth.uid() and public.contest_names_hidden(e.contest_id))
  );
$$;

grant execute on function public.contest_talk_open(bigint) to authenticated;

/* ── the messages ────────────────────────────────────────────────────────── */

create table if not exists public.contest_comments (
  id            bigserial primary key,
  entry_id      bigint not null references public.contest_entries(id) on delete cascade,
  author_id     uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  body          text   not null default '' check (char_length(body) <= 2000),
  images        text[] not null default '{}',
  reply_to      bigint references public.contest_comments(id) on delete set null,
  mentions      bigint[] not null default '{}',
  mentions_all  boolean not null default false,
  edited_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists contest_comments_on on public.contest_comments (entry_id, created_at);

alter table public.contest_comments enable row level security;

-- The look's own visibility, through a subquery that is itself under
-- contest_entries_read: one rule, not two.
drop policy if exists contest_comments_read on public.contest_comments;
create policy contest_comments_read on public.contest_comments
  for select to anon, authenticated
  using (exists (
    select 1 from public.contest_entries e where e.id = contest_comments.entry_id));

drop policy if exists contest_comments_add on public.contest_comments;
create policy contest_comments_add on public.contest_comments
  for insert to authenticated
  with check (
    contest_comments.author_id = (select auth.uid())
    and public.contest_talk_open(contest_comments.entry_id)
  );

-- Editing and taking back are the author's; an admin can do either to
-- anything, which is how a message that has to go is taken down.
drop policy if exists contest_comments_edit on public.contest_comments;
create policy contest_comments_edit on public.contest_comments
  for update to authenticated
  using (contest_comments.author_id = (select auth.uid()) or (select public.is_admin()))
  with check (contest_comments.author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists contest_comments_admin_drop on public.contest_comments;
create policy contest_comments_admin_drop on public.contest_comments
  for delete to authenticated using ((select public.is_admin()));

-- Set outright rather than added to, because Supabase grants everything on a
-- new table to anon and authenticated by default (see v98).
revoke all on public.contest_comments from anon, authenticated;
grant select on public.contest_comments to anon, authenticated;
grant insert (entry_id, author_id, body, images, reply_to, mentions, mentions_all)
  on public.contest_comments to authenticated;
grant update (body, images, edited_at, deleted_at) on public.contest_comments to authenticated;
grant delete on public.contest_comments to authenticated;
grant usage on sequence public.contest_comments_id_seq to authenticated;

/* ── the reactions ───────────────────────────────────────────────────────── */

create table if not exists public.contest_comment_reactions (
  id            bigserial primary key,
  comment_id    bigint not null references public.contest_comments(id) on delete cascade,
  profile_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  character_id  bigint,
  name          text   not null,
  emoji         text   not null check (char_length(emoji) between 1 and 16),
  created_at    timestamptz not null default now(),
  unique (comment_id, profile_id, emoji)
);

create index if not exists contest_comment_reactions_on
  on public.contest_comment_reactions (comment_id);

alter table public.contest_comment_reactions enable row level security;

drop policy if exists contest_comment_reactions_read on public.contest_comment_reactions;
create policy contest_comment_reactions_read on public.contest_comment_reactions
  for select to anon, authenticated
  using (exists (
    select 1 from public.contest_comments c
     where c.id = contest_comment_reactions.comment_id));

drop policy if exists contest_comment_reactions_add on public.contest_comment_reactions;
create policy contest_comment_reactions_add on public.contest_comment_reactions
  for insert to authenticated
  with check (
    contest_comment_reactions.profile_id = (select auth.uid())
    and exists (
      select 1 from public.contest_comments c
       where c.id = contest_comment_reactions.comment_id
         and public.contest_talk_open(c.entry_id))
  );

drop policy if exists contest_comment_reactions_drop on public.contest_comment_reactions;
create policy contest_comment_reactions_drop on public.contest_comment_reactions
  for delete to authenticated
  using (contest_comment_reactions.profile_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.contest_comment_reactions from anon, authenticated;
grant select on public.contest_comment_reactions to anon, authenticated;
grant insert (comment_id, profile_id, character_id, name, emoji)
  on public.contest_comment_reactions to authenticated;
grant delete on public.contest_comment_reactions to authenticated;
grant usage on sequence public.contest_comment_reactions_id_seq to authenticated;

-- Whose reaction it is, from their profile rather than from whatever the page
-- sent: the name is shown beside the emoji, and it has to be theirs.
create or replace function public.contest_reaction_signed()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  select p.character_id,
         coalesce(p.character_name, p.display_name, p.discord_username, '—')
    into new.character_id, new.name
    from public.profiles p
   where p.id = new.profile_id;
  return new;
end;
$fn$;

drop trigger if exists contest_reaction_signed on public.contest_comment_reactions;
create trigger contest_reaction_signed
  before insert on public.contest_comment_reactions
  for each row execute function public.contest_reaction_signed();

/* ── the v85 rule ────────────────────────────────────────────────────────── */

drop policy if exists contest_comments_named_write on public.contest_comments;
create policy contest_comments_named_write on public.contest_comments
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists contest_comments_named_edit on public.contest_comments;
create policy contest_comments_named_edit on public.contest_comments
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists contest_comments_named_drop on public.contest_comments;
create policy contest_comments_named_drop on public.contest_comments
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists contest_comment_reactions_named_write on public.contest_comment_reactions;
create policy contest_comment_reactions_named_write on public.contest_comment_reactions
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists contest_comment_reactions_named_drop on public.contest_comment_reactions;
create policy contest_comment_reactions_named_drop on public.contest_comment_reactions
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select tablename, policyname, cmd, permissive from pg_policies
--    where tablename in ('contest_comments', 'contest_comment_reactions')
--    order by tablename, policyname;
--
--   contest_comment_reactions  _add, _drop, _named_drop (RESTRICTIVE),
--                              _named_write (RESTRICTIVE), _read
--   contest_comments           _add, _admin_drop, _edit, _named_drop (RESTRICTIVE),
--                              _named_edit (RESTRICTIVE), _named_write (RESTRICTIVE),
--                              _read
