-- ─────────────────────────────────────────────────────────────────────────
-- migration_v10.sql — admins can take a picture down without destroying it
--
-- Run this once in the Supabase SQL editor, after migration_v9.sql.
--
-- Deleting was already possible, but it is the only tool in the box and it is
-- permanent. Hiding is the one you actually want most of the time: the picture
-- comes off the site now, the person who posted it can be spoken to afterwards,
-- and nothing has been thrown away in the meantime.
--
-- Enforced in the read policy rather than filtered in the page, so a hidden
-- picture is not merely absent from the grid — it never leaves the database for
-- anybody but an admin, and a shared link to it stops resolving too.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.gallery_posts
  add column if not exists hidden boolean not null default false;

drop policy if exists "gallery: read posts" on public.gallery_posts;
create policy "gallery: read posts" on public.gallery_posts for select
  using (hidden = false or public.is_admin());

-- Both columns are writable at the column level, because the author owns the
-- caption and somebody has to be able to write hidden at all.
revoke update on table public.gallery_posts from anon, authenticated;
grant update (caption, hidden) on table public.gallery_posts to authenticated;

drop policy if exists "gallery: edit own" on public.gallery_posts;
create policy "gallery: edit own" on public.gallery_posts for update
  using (auth.uid() = author_id or public.is_admin())
  with check (auth.uid() = author_id or public.is_admin());

-- A row policy cannot say "this column may not change", and without that an
-- author could simply un-hide whatever an admin had just hidden — which would
-- make hiding useless against the one person it is aimed at. A trigger can see
-- the old row and the new one at once, so the rule lives here.
create or replace function public.gallery_guard_hidden()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.hidden is distinct from old.hidden and not public.is_admin() then
    raise exception 'Only an admin may hide or restore a gallery picture';
  end if;
  return new;
end;
$$;

drop trigger if exists gallery_posts_guard_hidden on public.gallery_posts;
create trigger gallery_posts_guard_hidden
  before update on public.gallery_posts
  for each row execute function public.gallery_guard_hidden();
