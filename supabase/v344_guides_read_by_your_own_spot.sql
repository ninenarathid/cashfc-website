-- v344 — guides read by your own spot
--
-- Run this once in the Supabase SQL editor, after v343. Running it again is
-- safe.
--
-- The owner, 2026-11-25: back to the guides, but not the way they were planned
-- before (a fight written as coordinates, phases with timings, variants and a
-- quiz: a great deal of work before a single mechanic could be read, and only
-- one ever was). What he wants instead is wtfdig's way: pick your role, and
-- each step of the fight is one picture with everything dimmed except the spot
-- you have to remember, and a line saying what it is. And he wants to make
-- them himself, in the site, without a deploy.
--
-- So two tables and a bucket.
--
--   guides       one fight: its name, where the strategy comes from, and
--                whether members can see it yet (`published`). A guide is a
--                draft until an admin publishes it, and a draft is not sent to
--                anybody but admins. `content_key` is the party finder's own
--                key for the duty (`ex:Enuo`, `sav:M9S`), so a party shows
--                the guide for its fight and a guide puts up a party for it
--                (the owner, 2026-11-25).
--   guide_steps  one picture of one moment. `spots` holds, per seat, where that
--                seat stands on the picture (up to four points, in percent of
--                the picture's width and height, so the picture can be shown at
--                any size) and one line for that seat. `ring` is the size of
--                the bright circle, in percent of the picture's width.
--                `pic_w`/`pic_h` are the picture's own size, so the page keeps
--                its shape before it loads and the circle stays round.
--
-- Only admins write anything here. Members and visitors only ever read what is
-- published: a strategy is public knowledge and a member often opens the link
-- before signing in. The verified-character trio is added anyway, as on every
-- table a browser writes to, so a later grant cannot open a hole.
--
-- The picture is a path inside the `guides` bucket, never a URL, because the
-- page builds the address from its own Supabase URL; the check below allows
-- only the shape the editor writes: `<uploader id>/g-<time>-<random>.<ext>`.
--
-- `spots` is checked in the database too (guide_spots_ok): only the eight
-- seats, at most four points each, every coordinate a number from 0 to 100,
-- and a line of at most 200 characters. The coordinates go into an SVG on the
-- page, and the page should never draw anything it did not expect.

/* ── the fights ──────────────────────────────────────────────────────────── */

create table if not exists public.guides (
  id          bigint generated always as identity primary key,
  slug        text not null unique
                check (slug ~ '^[a-z0-9][a-z0-9-]{0,39}$'),
  name        text not null check (char_length(name) between 1 and 80),
  short       text check (short is null or char_length(short) between 1 and 20),
  expansion   text not null default 'Dawntrail'
                check (char_length(expansion) between 1 and 40),
  category    text not null default 'savage'
                check (category in ('savage', 'extreme', 'ultimate', 'chaotic', 'other')),
  patch       text check (patch is null or char_length(patch) <= 12),
  source_name text check (source_name is null or char_length(source_name) <= 80),
  source_url  text check (source_url is null
                or (char_length(source_url) <= 300 and source_url ~ '^https://')),
  note        text check (note is null or char_length(note) <= 600),
  content_key text check (content_key is null or char_length(content_key) between 1 and 80),
  published   boolean not null default false,
  sort        integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.guides add column if not exists content_key text
  check (content_key is null or char_length(content_key) between 1 and 80);

create index if not exists guides_shelf on public.guides (expansion, category, sort);
create index if not exists guides_for_duty on public.guides (content_key)
  where content_key is not null and published;

/* ── what a seat on a picture may hold ───────────────────────────────────── */

create or replace function public.guide_spots_ok(s jsonb)
returns boolean
language sql
immutable
as $fn$
  select s is not null
     and jsonb_typeof(s) = 'object'
     and not exists (
       select 1
         from jsonb_each(s) as e(seat, v)
        where e.seat not in ('MT', 'ST', 'H1', 'H2', 'D1', 'D2', 'D3', 'D4')
           or jsonb_typeof(e.v) <> 'object'
           or exists (select 1 from jsonb_object_keys(e.v) as k(name)
                       where k.name not in ('at', 'say'))
           or (e.v ? 'say' and (jsonb_typeof(e.v -> 'say') <> 'string'
                                or char_length(e.v ->> 'say') > 200))
           or (e.v ? 'at' and (
                jsonb_typeof(e.v -> 'at') <> 'array'
                or jsonb_array_length(e.v -> 'at') > 4
                or exists (
                  select 1
                    from jsonb_array_elements(e.v -> 'at') as p(pt)
                   where jsonb_typeof(p.pt) <> 'array'
                      or jsonb_array_length(p.pt) <> 2
                      or jsonb_typeof(p.pt -> 0) <> 'number'
                      or jsonb_typeof(p.pt -> 1) <> 'number'
                      or case when jsonb_typeof(p.pt -> 0) = 'number'
                               and jsonb_typeof(p.pt -> 1) = 'number'
                              then (p.pt ->> 0)::numeric not between 0 and 100
                                or (p.pt ->> 1)::numeric not between 0 and 100
                              else true end
                )))
     );
$fn$;

/* ── the pictures of a fight ─────────────────────────────────────────────── */

create table if not exists public.guide_steps (
  id          bigint generated always as identity primary key,
  guide_id    bigint not null references public.guides (id) on delete cascade,
  sort        integer not null default 0,
  phase       text check (phase is null or char_length(phase) <= 60),
  name        text not null check (char_length(name) between 1 and 80),
  note        text check (note is null or char_length(note) <= 400),
  picture     text check (picture is null or (
                char_length(picture) <= 120
                and picture ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$')),
  pic_w       integer check (pic_w is null or pic_w between 16 and 4096),
  pic_h       integer check (pic_h is null or pic_h between 16 and 4096),
  ring        smallint not null default 9 check (ring between 3 and 30),
  spots       jsonb not null default '{}'::jsonb
                check (pg_column_size(spots) <= 6000 and public.guide_spots_ok(spots)),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists guide_steps_of on public.guide_steps (guide_id, sort);

/* ── who reads, who writes ───────────────────────────────────────────────── */

alter table public.guides enable row level security;
alter table public.guide_steps enable row level security;

drop policy if exists guides_read on public.guides;
create policy guides_read on public.guides
  for select to anon, authenticated
  using (published or (select public.is_admin()));

drop policy if exists guides_add on public.guides;
create policy guides_add on public.guides
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists guides_edit on public.guides;
create policy guides_edit on public.guides
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists guides_drop on public.guides;
create policy guides_drop on public.guides
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists guides_named_write on public.guides;
create policy guides_named_write on public.guides
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guides_named_edit on public.guides;
create policy guides_named_edit on public.guides
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guides_named_drop on public.guides;
create policy guides_named_drop on public.guides
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_steps_read on public.guide_steps;
create policy guide_steps_read on public.guide_steps
  for select to anon, authenticated
  using (
    (select public.is_admin())
    or exists (select 1 from public.guides g
                where g.id = guide_steps.guide_id and g.published)
  );

drop policy if exists guide_steps_add on public.guide_steps;
create policy guide_steps_add on public.guide_steps
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists guide_steps_edit on public.guide_steps;
create policy guide_steps_edit on public.guide_steps
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists guide_steps_drop on public.guide_steps;
create policy guide_steps_drop on public.guide_steps
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists guide_steps_named_write on public.guide_steps;
create policy guide_steps_named_write on public.guide_steps
  as restrictive for insert to authenticated
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_steps_named_edit on public.guide_steps;
create policy guide_steps_named_edit on public.guide_steps
  as restrictive for update to authenticated
  using ((select public.verified_character()) or (select public.is_admin()))
  with check ((select public.verified_character()) or (select public.is_admin()));

drop policy if exists guide_steps_named_drop on public.guide_steps;
create policy guide_steps_named_drop on public.guide_steps
  as restrictive for delete to authenticated
  using ((select public.verified_character()) or (select public.is_admin()));

revoke all on public.guides from anon, authenticated;
grant select on public.guides to anon, authenticated;
grant insert (slug, name, short, expansion, category, patch, source_name, source_url,
              note, content_key, published, sort)
  on public.guides to authenticated;
grant update (slug, name, short, expansion, category, patch, source_name, source_url,
              note, content_key, published, sort)
  on public.guides to authenticated;
grant delete on public.guides to authenticated;

revoke all on public.guide_steps from anon, authenticated;
grant select on public.guide_steps to anon, authenticated;
grant insert (guide_id, sort, phase, name, note, picture, pic_w, pic_h, ring, spots)
  on public.guide_steps to authenticated;
grant update (sort, phase, name, note, picture, pic_w, pic_h, ring, spots)
  on public.guide_steps to authenticated;
grant delete on public.guide_steps to authenticated;

/* ── when it last changed ────────────────────────────────────────────────── */

create or replace function public.guides_touched()
returns trigger
language plpgsql
as $fn$
begin
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$fn$;

drop trigger if exists guides_touched on public.guides;
create trigger guides_touched
  before update on public.guides
  for each row execute function public.guides_touched();

drop trigger if exists guide_steps_touched on public.guide_steps;
create trigger guide_steps_touched
  before update on public.guide_steps
  for each row execute function public.guides_touched();

/* ── the pictures ────────────────────────────────────────────────────────── */

-- Public, because a published guide is read by anybody with the link and the
-- picture is just a picture of a fight. Admins put pictures up into their own
-- folder and take any down. Only admins may list it (a delete has to see the
-- row it deletes): a list would show the pictures of guides not yet published.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guides', 'guides', true, 4194304,
        array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists guides_files_add on storage.objects;
create policy guides_files_add on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'guides'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_admin())
  );

drop policy if exists guides_files_admin on storage.objects;
create policy guides_files_admin on storage.objects
  for select to authenticated
  using (bucket_id = 'guides' and (select public.is_admin()));

drop policy if exists guides_files_drop on storage.objects;
create policy guides_files_drop on storage.objects
  for delete to authenticated
  using (bucket_id = 'guides' and (select public.is_admin()));

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select table_name from information_schema.tables
 where table_schema = 'public' and table_name in ('guides', 'guide_steps')
 order by 1;
--  guide_steps
--  guides

select count(*) as policies from pg_policies
 where schemaname = 'public' and tablename in ('guides', 'guide_steps');
--  14

select id, public, file_size_limit from storage.buckets where id = 'guides';
--  guides | true | 4194304

select public.guide_spots_ok('{"MT": {"at": [[50, 20]], "say": "north"}}') as fine,
       public.guide_spots_ok('{"XX": {"at": [[50, 20]]}}') as unknown_seat,
       public.guide_spots_ok('{"MT": {"at": [[150, 20]]}}') as off_the_picture;
--  true | false | false

select count(*) as guides from public.guides;
--  0 (until an admin starts one)
*/
