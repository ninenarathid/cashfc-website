-- v332 — a party wears its own picture
--
-- Run this once in the Supabase SQL editor, after v331. Running it again is
-- safe.
--
-- The owner asked on 2026-11-12: a lead may put up their own picture for a
-- party, cropped to the banner's shape, and a party without one keeps the
-- duty's own banner as before. And the pictures other leads have already used
-- for the same fight are offered again, the most used first.
--
-- So one column, `cover`: the picture's path inside the `party` bucket, which
-- already holds the write-ups' screenshots (v39). A path rather than a URL,
-- because the page builds the address from its own Supabase URL and this
-- column could otherwise point the board, and the server that draws the
-- Discord card, at any address on the internet. The check below allows only
-- the shape the site writes: `<uploader id>/cover-<time>-<random>.<webp|jpg|png>`.
-- The folder is not required to be the writer's own, because choosing a
-- picture another lead uploaded is the point of the gallery.
--
-- Who may set it is who may edit the party already (v39's party_posts_edit,
-- and v85's verified-character trio): the lead, or an admin. Nothing new is
-- granted.
--
-- How often a picture is used is not a counter. It is the number of parties
-- that carry it, counted when the gallery is opened: a counter would have to
-- be kept true through every edit, copy and deletion, and this cannot drift.
-- The partial index is for that count, which asks by fight and only ever for
-- the rows that have a picture.
--
-- The Discord card is drawn for a crawler with no session, so it reads the
-- picture through `party_cover`, a function that returns the path of one
-- party that is not deleted and nothing else, the same way `party_card`
-- serves the rest of the card. party_card itself is left as it stands.

/* ── the column ──────────────────────────────────────────────────────────── */

alter table public.party_posts add column if not exists cover text;

alter table public.party_posts drop constraint if exists party_posts_cover_shape;
alter table public.party_posts add constraint party_posts_cover_shape check (
  cover is null
  or (
    char_length(cover) <= 120
    and cover ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/cover-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'
  )
);

create index if not exists party_posts_covers
  on public.party_posts (content_key)
  where cover is not null and deleted_at is null;

/* ── the bucket gets a ceiling ───────────────────────────────────────────── */

-- v39 made the `party` bucket with no size limit, so the only ceiling was the
-- project's own. A cover is now shown on every row of the board and fetched
-- by the server that draws the Discord card, and the gallery passes it from
-- one party to the next: a file of tens of megabytes named like a cover would
-- be downloaded by everybody who opens the board. Every way the site uploads
-- into this bucket already refuses more than 8 MB in the browser (the
-- write-up's and the chat's screenshots, and the cover, which is cropped to a
-- few hundred kilobytes), so the bucket now says the same. Only lowered,
-- never raised, if somebody has set a smaller one by hand.
update storage.buckets
   set file_size_limit = 8388608
 where id = 'party'
   and (file_size_limit is null or file_size_limit > 8388608);

/* ── the picture, for the card a crawler asks for ────────────────────────── */

create or replace function public.party_cover(p_id bigint)
returns text
language sql
stable
security definer
set search_path = public
as $fn$
  select p.cover
    from public.party_posts p
   where p.id = p_id
     and p.deleted_at is null;
$fn$;

grant execute on function public.party_cover(bigint) to anon, authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'party_posts'
   and column_name = 'cover';
--  cover | text

select conname from pg_constraint
 where conrelid = 'public.party_posts'::regclass
   and conname = 'party_posts_cover_shape';
--  party_posts_cover_shape

select indexname from pg_indexes
 where schemaname = 'public' and indexname = 'party_posts_covers';
--  party_posts_covers

select count(*) as with_cover from public.party_posts where cover is not null;
--  0 (until somebody puts one up)

select public.party_cover(-1) is null as nothing_for_no_party;
--  true

select file_size_limit from storage.buckets where id = 'party';
--  8388608
*/
