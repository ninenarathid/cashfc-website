-- ─────────────────────────────────────────────────────────────────────────
-- migration_v13.sql — an admin can post a picture for somebody else
--
-- Run this once in the Supabase SQL editor, after migration_v12.sql.
--
-- Plenty of members will never sign in, and their best screenshots are sitting
-- in Discord. An admin can now put one up on their behalf: it lands on that
-- member's own page and is credited to them, with the admin recorded as the
-- account that uploaded it.
--
-- This also closes a hole that was already open. character_id decides whose
-- member page a picture appears on, and nothing was checking it — so anybody
-- could have posted a picture onto somebody else's page. It is now pinned to
-- the poster's own verified character unless an admin is doing the posting.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.gallery_posts
  -- Who the picture is by, when that is not the account that uploaded it.
  -- Denormalised on purpose: the credited member may have no profile row at
  -- all, which is the whole reason an admin is posting for them.
  add column if not exists credited_name text
    check (credited_name is null or char_length(credited_name) <= 60);

create or replace function public.gallery_guard_author()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  own_character bigint;
  verified      timestamptz;
begin
  if public.is_admin() then
    return new;                    -- an admin may credit anybody
  end if;

  -- Everybody else posts as themselves, onto their own page, and only once
  -- they have proved the character is theirs.
  select character_id, character_verified_at into own_character, verified
    from public.profiles where id = auth.uid();

  if verified is null or own_character is null then
    raise exception 'Verify your character before posting to the gallery';
  end if;
  if new.character_id is distinct from own_character then
    raise exception 'You can only post pictures to your own page';
  end if;
  if new.credited_name is not null then
    raise exception 'Only an admin may credit a picture to somebody else';
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_posts_guard_author on public.gallery_posts;
create trigger gallery_posts_guard_author
  before insert or update on public.gallery_posts
  for each row execute function public.gallery_guard_author();

-- credited_name travels with the post, so an admin needs to be able to write it.
-- The trigger above is what stops anybody else.
revoke update on table public.gallery_posts from anon, authenticated;
grant update (caption, hidden, credited_name, character_id)
  on table public.gallery_posts to authenticated;
