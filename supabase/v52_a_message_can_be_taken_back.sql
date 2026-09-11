-- v52 — a message can be corrected, or taken back
--
-- Run this once in the Supabase SQL editor, after v51.
--
-- A party's conversation is where the evening is actually arranged, and until
-- now every line in it was final. A typo in a meeting time stayed a typo, and
-- something said in the wrong party stayed there.
--
-- Two things, and the second is the one with a decision in it.
--
-- An edit records when. A conversation people are reading for instructions is
-- one where "he said nine" matters, so a line that changed says it changed —
-- silently rewriting what somebody else has already read is the one thing an
-- edit must not do.
--
-- A delete leaves a mark rather than a hole. A message that vanishes takes the
-- replies to it with it, in the sense that they stop making sense: an answer
-- to a question nobody can see reads as a non sequitur. So the row stays, says
-- it was deleted, and keeps nothing else.
--
-- Keeping nothing else is enforced here rather than asked of the client. The
-- text is the thing being taken back, and "the app blanks it on the way out"
-- is a promise a direct API call does not have to keep.

alter table public.party_comments
  add column if not exists edited_at timestamptz;

comment on column public.party_comments.edited_at is
  'When the body was last changed by its author. Null for a message that has '
  'never been edited; set by the client, since a delete also updates the row '
  'and is not an edit.';

/* ── what a deleted message keeps ────────────────────────────────────────── */

create or replace function public.comment_redact() returns trigger
language plpgsql as $$
begin
  -- Only on the way out, and only once: a row already deleted is left alone,
  -- so an admin touching an old one does not restamp it.
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := null;
    new.images := null;
  end if;
  return new;
end;
$$;

drop trigger if exists party_comments_redact on public.party_comments;
create trigger party_comments_redact before update on public.party_comments
  for each row execute function public.comment_redact();

/* ── and it stays where it was ───────────────────────────────────────────── */

-- Deleted rows were filtered out of the read entirely, which is what made a
-- deletion a hole in the conversation. They come back as tombstones: the body
-- is gone by the time anybody can select one, so there is nothing left in the
-- row to keep from them.
drop policy if exists party_comments_read on public.party_comments;
create policy party_comments_read on public.party_comments
  for select to anon, authenticated using (true);
