-- v349 — a guide's talk, its macros and its cheatsheet
--
-- Run this once in the Supabase SQL editor, after v348. Running it again is
-- safe.
--
-- Three asks from the owner, 2026-11-25:
--
-- 1. A chat under every guide, "เหมือนในหน้า gallery กับ party finder" — the
--    same conversation the site has under a gallery post, an event and a
--    contest look (lib/threads.ts, ui/Messages): guide_comments and
--    guide_comment_reactions, in exactly the shape of v99's contest_comments
--    and contest_comment_reactions. Anybody may read the talk of a published
--    guide (admins: of a draft too); writing is for members with a proved
--    character, his answer when asked ("สมาชิกที่ยืนยันตัวละครแล้ว").
-- 2. The strat's macro in two languages, English and Japanese, to paste into
--    the game: guides.macro_en, guides.macro_ja.
-- 3. A cheatsheet: the whole fight on one page. As panels the page lights for
--    the reader's own seat where the positions are fixed (his ask the same
--    afternoon, "focus แค่ตำแหน่งที่เราเลือก เฉพาะ mech ที่ fix position"):
--    guides.cheat_panels, each a title in Thai and English, a picture, the
--    spots on it (the same shape and check as a step's) and a few lines. And
--    as one picture to keep on a phone, in Thai and in English:
--    guides.cheat_pics, guides.cheat_pics_en (guide_refs_ok, as every other
--    picture list here).
--
-- The macros and the cheatsheet come from another site than the plan does
-- (xivjpraids.com), so a guide may name a second source: xref_name, xref_url.

/* ── what a cheatsheet panel may hold ────────────────────────────────────── */

create or replace function public.guide_cheat_ok(c jsonb)
returns boolean
language sql
immutable
as $fn$
  select c is not null
     and jsonb_typeof(c) = 'array'
     and jsonb_array_length(c) <= 16
     and not exists (
       select 1
         from jsonb_array_elements(c) as e(v)
        where jsonb_typeof(e.v) <> 'object'
           or exists (select 1 from jsonb_object_keys(e.v) as k(name)
                       where k.name not in ('title', 'title_en', 'path', 'w', 'h', 'ring', 'spots', 'lines', 'lines_en'))
           or jsonb_typeof(e.v -> 'title') is distinct from 'string'
           or char_length(e.v ->> 'title') not between 1 and 60
           or (e.v ? 'title_en' and (jsonb_typeof(e.v -> 'title_en') <> 'string'
                                     or char_length(e.v ->> 'title_en') > 60))
           or (e.v ? 'path' and (jsonb_typeof(e.v -> 'path') <> 'string'
                                 or (e.v ->> 'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'
                                 or jsonb_typeof(e.v -> 'w') is distinct from 'number'
                                 or jsonb_typeof(e.v -> 'h') is distinct from 'number'))
           or (e.v ? 'ring' and (jsonb_typeof(e.v -> 'ring') <> 'number'
                                 or (e.v ->> 'ring')::numeric not between 3 and 30))
           or (e.v ? 'spots' and not public.guide_spots_ok(e.v -> 'spots'))
           or (e.v ? 'lines' and (jsonb_typeof(e.v -> 'lines') <> 'array'
                                  or jsonb_array_length(e.v -> 'lines') > 6
                                  or exists (select 1 from jsonb_array_elements(e.v -> 'lines') as l(x)
                                              where jsonb_typeof(l.x) <> 'string' or char_length(l.x #>> '{}') > 40)))
           or (e.v ? 'lines_en' and (jsonb_typeof(e.v -> 'lines_en') <> 'array'
                                     or jsonb_array_length(e.v -> 'lines_en') > 6
                                     or exists (select 1 from jsonb_array_elements(e.v -> 'lines_en') as l(x)
                                                 where jsonb_typeof(l.x) <> 'string' or char_length(l.x #>> '{}') > 40)))
     );
$fn$;

/* ── the macros, the cheatsheet, the second source ───────────────────────── */

alter table public.guides add column if not exists macro_en text
  check (macro_en is null or char_length(macro_en) <= 2000);
alter table public.guides add column if not exists macro_ja text
  check (macro_ja is null or char_length(macro_ja) <= 2000);
alter table public.guides add column if not exists cheat_pics jsonb not null default '[]'::jsonb
  check (pg_column_size(cheat_pics) <= 4000 and public.guide_refs_ok(cheat_pics));
alter table public.guides add column if not exists cheat_pics_en jsonb not null default '[]'::jsonb
  check (pg_column_size(cheat_pics_en) <= 4000 and public.guide_refs_ok(cheat_pics_en));
alter table public.guides add column if not exists cheat_panels jsonb not null default '[]'::jsonb
  check (pg_column_size(cheat_panels) <= 16000 and public.guide_cheat_ok(cheat_panels));
alter table public.guides add column if not exists xref_name text
  check (xref_name is null or char_length(xref_name) <= 80);
alter table public.guides add column if not exists xref_url text
  check (xref_url is null or (char_length(xref_url) <= 300 and xref_url ~ '^https://'));

grant insert (macro_en, macro_ja, cheat_panels, cheat_pics, cheat_pics_en, xref_name, xref_url) on public.guides to authenticated;
grant update (macro_en, macro_ja, cheat_panels, cheat_pics, cheat_pics_en, xref_name, xref_url) on public.guides to authenticated;

/* ── the talk ────────────────────────────────────────────────────────────── */

create table if not exists public.guide_comments (
  id            bigserial primary key,
  guide_id      bigint not null references public.guides(id) on delete cascade,
  author_id     uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  body          text   not null default '' check (char_length(body) <= 2000),
  images        text[] not null default '{}' check (cardinality(images) <= 4),
  reply_to      bigint references public.guide_comments(id) on delete set null,
  mentions      bigint[] not null default '{}' check (cardinality(mentions) <= 20),
  mentions_all  boolean not null default false,
  edited_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists guide_comments_on on public.guide_comments (guide_id, created_at);

alter table public.guide_comments enable row level security;

-- The guide's own visibility, through a subquery that is itself under
-- guides_read: a draft's talk is as hidden as the draft.
drop policy if exists guide_comments_read on public.guide_comments;
create policy guide_comments_read on public.guide_comments
  for select to anon, authenticated
  using (exists (select 1 from public.guides g where g.id = guide_comments.guide_id));

drop policy if exists guide_comments_add on public.guide_comments;
create policy guide_comments_add on public.guide_comments
  for insert to authenticated
  with check (
    guide_comments.author_id = (select auth.uid())
    and exists (select 1 from public.guides g where g.id = guide_comments.guide_id)
  );

-- Editing and taking back are the author's; an admin can do either to
-- anything, which is how a message that has to go is taken down.
drop policy if exists guide_comments_edit on public.guide_comments;
create policy guide_comments_edit on public.guide_comments
  for update to authenticated
  using (guide_comments.author_id = (select auth.uid()) or (select public.is_admin()))
  with check (guide_comments.author_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists guide_comments_admin_drop on public.guide_comments;
create policy guide_comments_admin_drop on public.guide_comments
  for delete to authenticated using ((select public.is_admin()));

drop policy if exists guide_comments_named_write on public.guide_comments;
create policy guide_comments_named_write on public.guide_comments
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_comments_named_edit on public.guide_comments;
create policy guide_comments_named_edit on public.guide_comments
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_comments_named_drop on public.guide_comments;
create policy guide_comments_named_drop on public.guide_comments
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

revoke all on public.guide_comments from anon, authenticated;
grant select on public.guide_comments to anon, authenticated;
grant insert (guide_id, author_id, body, images, reply_to, mentions, mentions_all)
  on public.guide_comments to authenticated;
grant update (body, images, edited_at, deleted_at) on public.guide_comments to authenticated;
grant delete on public.guide_comments to authenticated;
grant usage on sequence public.guide_comments_id_seq to authenticated;

create table if not exists public.guide_comment_reactions (
  id            bigserial primary key,
  comment_id    bigint not null references public.guide_comments(id) on delete cascade,
  profile_id    uuid   not null default auth.uid() references public.profiles(id) on delete cascade,
  character_id  bigint,
  name          text   not null check (char_length(name) between 1 and 80),
  emoji         text   not null check (char_length(emoji) between 1 and 16),
  created_at    timestamptz not null default now(),
  unique (comment_id, profile_id, emoji)
);

create index if not exists guide_comment_reactions_on
  on public.guide_comment_reactions (comment_id);

alter table public.guide_comment_reactions enable row level security;

drop policy if exists guide_comment_reactions_read on public.guide_comment_reactions;
create policy guide_comment_reactions_read on public.guide_comment_reactions
  for select to anon, authenticated
  using (exists (
    select 1 from public.guide_comments c where c.id = guide_comment_reactions.comment_id));

drop policy if exists guide_comment_reactions_add on public.guide_comment_reactions;
create policy guide_comment_reactions_add on public.guide_comment_reactions
  for insert to authenticated
  with check (
    guide_comment_reactions.profile_id = (select auth.uid())
    and exists (select 1 from public.guide_comments c where c.id = guide_comment_reactions.comment_id)
  );

-- Taken back by the one who put it there (a toggle, so never an admin's
-- sweep of everybody's: see the fc-migration rules).
drop policy if exists guide_comment_reactions_drop on public.guide_comment_reactions;
create policy guide_comment_reactions_drop on public.guide_comment_reactions
  for delete to authenticated
  using (guide_comment_reactions.profile_id = (select auth.uid()));

drop policy if exists guide_comment_reactions_named_write on public.guide_comment_reactions;
create policy guide_comment_reactions_named_write on public.guide_comment_reactions
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_comment_reactions_named_edit on public.guide_comment_reactions;
create policy guide_comment_reactions_named_edit on public.guide_comment_reactions
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_comment_reactions_named_drop on public.guide_comment_reactions;
create policy guide_comment_reactions_named_drop on public.guide_comment_reactions
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

revoke all on public.guide_comment_reactions from anon, authenticated;
grant select on public.guide_comment_reactions to anon, authenticated;
grant insert (comment_id, profile_id, character_id, name, emoji)
  on public.guide_comment_reactions to authenticated;
grant delete on public.guide_comment_reactions to authenticated;
grant usage on sequence public.guide_comment_reactions_id_seq to authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select table_name from information_schema.tables
 where table_schema = 'public' and table_name in ('guide_comments', 'guide_comment_reactions')
 order by 1;
--  guide_comment_reactions
--  guide_comments

select count(*) as policies from pg_policies
 where schemaname = 'public' and tablename in ('guide_comments', 'guide_comment_reactions');
--  13 (7 on the talk, 6 on the reactions)

select column_name from information_schema.columns
 where table_schema = 'public' and table_name = 'guides'
   and column_name in ('macro_en', 'macro_ja', 'cheat_panels', 'cheat_pics', 'cheat_pics_en', 'xref_name', 'xref_url')
 order by 1;
--  cheat_panels, cheat_pics, cheat_pics_en, macro_en, macro_ja, xref_name, xref_url (seven rows)

select public.guide_cheat_ok('[{"title": "Deep Freeze", "spots": {"MT": {"at": [[20, 20]]}}}]') as fine,
       public.guide_cheat_ok('[{"title": "x", "path": "https://evil.example/a.png", "w": 1, "h": 1}]') as url_path;
--  true | false
*/
