-- ─────────────────────────────────────────────────────────────────────────
-- migration_v11.sql — searching and ranking the whole gallery, not just the
-- part already on screen
--
-- Run this once in the Supabase SQL editor, after migration_v10.sql.
--
-- Search and the Hot and Top orderings used to work on whatever had been
-- scrolled into memory, which quietly means "the newest few dozen" — so a
-- search could miss a picture that exists and Top could name the wrong winner.
--
-- Ranking by reactions needs the counts to be a column rather than a second
-- query, so they are kept on the row by triggers. Hot decays with age, which
-- cannot be a stored or generated column because now() is not immutable, so the
-- ordering lives in a function instead.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.gallery_posts
  add column if not exists like_count    int not null default 0,
  add column if not exists comment_count int not null default 0;

-- ─── Keep the counters honest ────────────────────────────────────────────
-- security definer because a member may not write these columns directly, which
-- is the point: the only way they move is by actually liking or commenting.
create or replace function public.gallery_bump_counts()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target bigint := coalesce(new.post_id, old.post_id);
  delta  int    := case when tg_op = 'INSERT' then 1 else -1 end;
begin
  if tg_table_name = 'gallery_likes' then
    update public.gallery_posts
       set like_count = greatest(0, like_count + delta) where id = target;
  else
    update public.gallery_posts
       set comment_count = greatest(0, comment_count + delta) where id = target;
  end if;
  return null;
end;
$$;

drop trigger if exists gallery_likes_count on public.gallery_likes;
create trigger gallery_likes_count
  after insert or delete on public.gallery_likes
  for each row execute function public.gallery_bump_counts();

drop trigger if exists gallery_comments_count on public.gallery_comments;
create trigger gallery_comments_count
  after insert or delete on public.gallery_comments
  for each row execute function public.gallery_bump_counts();

-- Whatever was posted before the counters existed.
update public.gallery_posts p set
  like_count = (select count(*) from public.gallery_likes l where l.post_id = p.id),
  comment_count = (select count(*) from public.gallery_comments c where c.post_id = p.id);

-- ─── One feed, ordered and searched in the database ──────────────────────
-- security invoker, so row-level security still applies and a hidden picture
-- stays invisible to everybody but an admin — exactly as it does elsewhere.
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
  where (p_character is null or p.character_id = p_character)
    and (
      p_query is null or btrim(p_query) = ''
      or p.caption ilike '%' || p_query || '%'
      -- Whatever that member is called: their character if they have one, the
      -- name a guest chose otherwise.
      or coalesce(pr.character_name, pr.display_name, pr.discord_username, '')
         ilike '%' || p_query || '%'
    )
  order by
    case when p_sort = 'top' then p.like_count end desc nulls last,
    case when p_sort = 'hot' then
      -- Reactions decayed by age, halving every four days: a picture from this
      -- morning with two popotos can outrank one from last month with five. A
      -- comment counts for less than a popoto because it is cheaper to leave,
      -- and the +1 stops a brand new picture scoring zero and sinking on arrival.
      (p.like_count * 2 + p.comment_count + 1)
      * power(0.5, extract(epoch from (now() - p.created_at)) / 3600.0 / 96.0)
    end desc nulls last,
    p.created_at desc
  limit greatest(1, least(p_limit, 60))
  offset greatest(0, p_offset);
$$;

grant execute on function public.gallery_feed(text, text, int, int, bigint)
  to anon, authenticated;

create index if not exists gallery_posts_likes on public.gallery_posts (like_count desc);
