-- v55 — taking something down actually takes it down
--
-- Run this once in the Supabase SQL editor, after v54.
--
-- Two delete buttons on the party board, and neither of them worked. Both were
-- reported by members within a day of the board opening, which is the good
-- case: nothing had been quietly failing for a month.
--
-- They failed for unrelated reasons and the reasons are worth writing down,
-- because both are the kind that a client-side test cannot see.

/* ── a message can actually be taken back ────────────────────────────────── */

-- v52 blanked a deleted message by writing null over its body and its
-- pictures. Both columns are not null — body has defaulted to the empty string
-- since v45 — so every delete raised 23502 and the trigger that was supposed
-- to guarantee a deleted message keeps nothing instead guaranteed that no
-- message could be deleted at all.
--
-- The fix is to write each column's own empty value rather than null. Which is
-- what should have been written in the first place: "" is what this column
-- means by empty, it is what a message with no text already holds, and the
-- tombstone the reader sees is drawn from deleted_at regardless. Nothing about
-- the promise changes — the text is still gone before anybody can select it.

create or replace function public.comment_redact() returns trigger
language plpgsql as $$
begin
  -- Only on the way out, and only once: a row already deleted is left alone,
  -- so an admin touching an old one does not restamp it.
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := '';
    new.images := '{}'::text[];
  end if;
  return new;
end;
$$;

/* ── and so can a listing ────────────────────────────────────────────────── */

/**
 * Take a party off the board.
 *
 * The owner could edit every other column on their own listing and not this
 * one. Setting deleted_at came back 42501, new row violates row-level security
 * policy — because the read policy is `deleted_at is null`, and an update that
 * sets it hands back a row the same statement is no longer allowed to see. The
 * edit policy was never the problem: the row was allowed out and not allowed
 * back in.
 *
 * So the retirement is done here instead, where the question is asked plainly
 * rather than falling out of two policies meeting. Same shape as party_accept
 * and party_take_seat from v47, and for the same reason: a definer function
 * sees past every policy, so the check the policies would have made is made in
 * the open, in one place, where it can be read.
 *
 * A tombstone rather than a delete. A party is a record of something once it
 * is over — it has a conversation attached to it and people who were in it —
 * and every read on this table already filters the column, so a retired party
 * leaves the board and keeps its history.
 *
 * Returns false if it was already gone, which is the second press of a button
 * rather than a failure.
 */
create or replace function public.party_retire(p_party bigint)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.party_posts;
begin
  select * into p from public.party_posts where id = p_party;
  if p.id is null or p.deleted_at is not null then return false; end if;

  -- The owner, or an admin, because somebody has to be able to take down a
  -- listing whose author has gone quiet. The same two the edit policy names.
  if p.owner <> auth.uid() and not exists (
    select 1 from public.profiles f
     where f.id = auth.uid() and f.is_admin
  ) then
    raise exception 'that party is not yours to take down';
  end if;

  update public.party_posts set deleted_at = now() where id = p_party;
  return true;
end;
$$;

revoke all on function public.party_retire(bigint) from anon;
grant execute on function public.party_retire(bigint) to authenticated;
