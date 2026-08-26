-- ─────────────────────────────────────────────────────────────────────────
-- migration_v14.sql — tagging the other people in a picture
--
-- Run this once in the Supabase SQL editor, after migration_v13.sql.
--
-- A group shot belongs to everybody in it. Tags say who else is there, and a
-- tagged picture shows on that member's page alongside their own — eight people
-- in one screenshot should not each have to post their own copy of it.
--
-- A tag does nothing until the person tagged says yes. Anybody can write your
-- name on a picture; only you decide whether it appears on your page. Until
-- then the tag exists and is pending, and the picture is nowhere near you.
--
-- Tags are character ids from the roster rather than accounts, because most of
-- the people in a group shot have never signed in — a tag that only worked for
-- members with accounts would miss most of the FC. The trade is that confirming
-- one does need an account, which is the right way round: being named costs
-- nothing, and agreeing to it is the part that should require being you.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.gallery_tags (
  post_id      bigint not null references public.gallery_posts (id) on delete cascade,
  character_id bigint not null,
  -- Kept beside the id so a tag reads correctly without the roster to hand, and
  -- keeps reading correctly for somebody who has since left the FC.
  name         text not null check (char_length(name) <= 60),
  -- Null until the person tagged agrees to it.
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  primary key (post_id, character_id)
);
create index if not exists gallery_tags_character
  on public.gallery_tags (character_id, confirmed_at);

alter table public.gallery_tags enable row level security;

-- Readable as far as the post is: the join keeps a hidden post's tags hidden
-- without repeating the rule. Pending tags are readable too — the person tagged
-- has to be able to find out they were.
drop policy if exists "gallery tags: read" on public.gallery_tags;
create policy "gallery tags: read" on public.gallery_tags for select
  using (exists (select 1 from public.gallery_posts p where p.id = post_id));

-- Whoever may edit the post may say who is in it. A verified member may also
-- always add their own name to a picture they are in, which needs nobody else.
drop policy if exists "gallery tags: write on own post" on public.gallery_tags;
create policy "gallery tags: write on own post" on public.gallery_tags for insert
  with check (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and (p.author_id = auth.uid() or public.is_admin()))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );

-- Tagging yourself is its own consent, so it takes effect at once rather than
-- sitting in your own pending list waiting for you to agree with yourself.
create or replace function public.gallery_tag_autoconfirm()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if new.confirmed_at is null and exists (
    select 1 from public.profiles pr
    where pr.id = auth.uid()
      and pr.character_id = new.character_id
      and pr.character_verified_at is not null
  ) then
    new.confirmed_at := now();
  end if;
  return new;
end
$fn$;

drop trigger if exists gallery_tags_autoconfirm on public.gallery_tags;
create trigger gallery_tags_autoconfirm
  before insert on public.gallery_tags
  for each row execute function public.gallery_tag_autoconfirm();

-- Confirming is the tagged member's, and an admin's on their behalf. The poster
-- is deliberately not on that list: whoever wrote the name cannot also be the
-- one who agrees to it, or the confirmation would mean nothing. An admin agreeing
-- for a member who never signs in is the practical escape hatch, and it is a
-- named person doing it rather than the tag simply defaulting to true.
drop policy if exists "gallery tags: confirm your own" on public.gallery_tags;
create policy "gallery tags: confirm your own" on public.gallery_tags for update
  using (public.is_admin()
         or exists (select 1 from public.profiles pr
                    where pr.id = auth.uid()
                      and pr.character_id = gallery_tags.character_id
                      and pr.character_verified_at is not null))
  with check (public.is_admin()
              or exists (select 1 from public.profiles pr
                         where pr.id = auth.uid()
                           and pr.character_id = gallery_tags.character_id
                           and pr.character_verified_at is not null));

-- The answer is the only thing an update may change. Row policies decide which
-- rows you can touch, never which columns, so without this a member could keep
-- their own tag and quietly rewrite the name shown on somebody else's picture.
create or replace function public.gallery_tag_guard()
returns trigger
language plpgsql
as $fn$
begin
  new.post_id      := old.post_id;
  new.character_id := old.character_id;
  new.name         := old.name;
  new.created_at   := old.created_at;
  return new;
end
$fn$;

drop trigger if exists gallery_tags_guard on public.gallery_tags;
create trigger gallery_tags_guard
  before update on public.gallery_tags
  for each row execute function public.gallery_tag_guard();

-- Removing works from either side: the poster can correct a mistake, and the
-- person tagged can always take their own name off a picture.
drop policy if exists "gallery tags: remove" on public.gallery_tags;
create policy "gallery tags: remove" on public.gallery_tags for delete
  using (
    exists (select 1 from public.gallery_posts p
            where p.id = post_id
              and (p.author_id = auth.uid() or public.is_admin()))
    or exists (select 1 from public.profiles pr
               where pr.id = auth.uid()
                 and pr.character_id = gallery_tags.character_id
                 and pr.character_verified_at is not null)
  );

-- ─── A member's pictures are their own plus the ones they agreed to ──────
create or replace function public.gallery_feed(
  p_sort   text default 'hot',
  p_query  text default null,
  p_limit  int  default 24,
  p_offset int  default 0,
  p_character bigint default null
)
returns setof public.gallery_posts
language sql
stable
security invoker
as $$
  select p.*
  from public.gallery_posts p
  left join public.profiles pr on pr.id = p.author_id
  where (
      p_character is null
      -- Either arm alone is enough, and a picture that is both theirs and tagged
      -- with them still matches once: this is one row filter, not a join, so
      -- tagging yourself in your own post cannot double it on your page.
      or p.character_id = p_character
      -- Confirmed only: a pending tag must not put a picture on somebody's page.
      or exists (select 1 from public.gallery_tags g
                 where g.post_id = p.id
                   and g.character_id = p_character
                   and g.confirmed_at is not null)
    )
    and (
      p_query is null or btrim(p_query) = ''
      or p.caption ilike '%' || p_query || '%'
      or coalesce(pr.character_name, pr.display_name, pr.discord_username, '')
         ilike '%' || p_query || '%'
      -- Searching a name finds the pictures somebody is in, not only the ones
      -- they posted, which is what somebody typing a name is usually after.
      or exists (select 1 from public.gallery_tags g
                 where g.post_id = p.id
                   and g.confirmed_at is not null
                   and g.name ilike '%' || p_query || '%')
    )
  order by
    case when p_sort = 'top' then p.like_count end desc nulls last,
    case when p_sort = 'hot' then
      (p.like_count * 2 + p.comment_count + 1)
      * power(0.5, extract(epoch from (now() - p.created_at)) / 3600.0 / 96.0)
    end desc nulls last,
    p.created_at desc
  limit greatest(1, least(p_limit, 60))
  offset greatest(0, p_offset);
$$;

grant execute on function public.gallery_feed(text, text, int, int, bigint)
  to anon, authenticated;
