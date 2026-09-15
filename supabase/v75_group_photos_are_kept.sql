-- v75 — group photos are kept
--
-- Run this once in the Supabase SQL editor, after v74.
--
-- v73 kept a party's group photo as one link on the party: outcome_photo.
-- Everything that changes the outcome changed that link — reopening cleared it,
-- marking a party a test cleared it, closing it again with another picture
-- wrote over it — and the file stayed in storage with nothing pointing at it,
-- which for a photo meant to be kept is the same as losing it. It also sat in
-- the same bucket as every screenshot pasted into a party's conversation,
-- filed by whoever uploaded it rather than by the party it was taken at.
--
-- So the photos get their own place, and it only ever grows:
--
--   party-photos      a bucket of their own, one folder per party
--   party_photos      one row per photo, added and never changed or removed
--                     from the site
--
-- A party may have several. Only that party's lead or an admin adds them,
-- which is who closes it. Nobody can delete one through the site — not the
-- person who uploaded it, not the lead; taking one down is done in the table
-- by hand, on purpose, by somebody who meant to.
--
-- outcome_photo stays where it is and is no longer written. Whatever it holds
-- is copied across below.

/* ── the bucket ──────────────────────────────────────────────────────────── */

insert into storage.buckets (id, name, public)
values ('party-photos', 'party-photos', true)
on conflict (id) do nothing;

-- Public, like every other picture on the site: the link is the picture.
drop policy if exists party_photos_files_read on storage.objects;
create policy party_photos_files_read on storage.objects
  for select to public using (objects.bucket_id = 'party-photos');

/*
 * Into the folder named for the party, by that party's lead or an admin.
 *
 * The folder is the party id, so "whose party is this file for" is answered by
 * the path the client chose — and checked here against the party itself, so a
 * path naming somebody else's party is refused rather than trusted. Names are
 * qualified throughout; v65 was a policy whose unqualified column bound to the
 * wrong table.
 *
 * No update policy and no delete policy: a file here is not replaced or taken
 * back from the site by anybody.
 */
drop policy if exists party_photos_files_add on storage.objects;
create policy party_photos_files_add on storage.objects
  for insert to authenticated with check (
    objects.bucket_id = 'party-photos'
    and exists (
      select 1 from public.party_posts x
       where x.id::text = (storage.foldername(objects.name))[1]
         and x.deleted_at is null
         and (x.owner = auth.uid() or public.is_admin())
    )
  );

/* ── the table ───────────────────────────────────────────────────────────── */

create table if not exists public.party_photos (
  id          bigserial primary key,
  party_id    bigint not null references public.party_posts(id) on delete cascade,
  url         text   not null,
  -- The object's path in the bucket, so the file can be found from the row
  -- without taking a URL apart. Null for rows copied from outcome_photo, whose
  -- files live in the old bucket.
  path        text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists party_photos_on
  on public.party_photos (party_id, created_at);

alter table public.party_photos enable row level security;

-- Readable by whoever can read the board.
drop policy if exists party_photos_read on public.party_photos;
create policy party_photos_read on public.party_photos
  for select to authenticated using (true);

-- Added by the party's lead or an admin, as themselves. Nothing else: no
-- update policy and no delete policy, so a row, once written, stays.
drop policy if exists party_photos_add on public.party_photos;
create policy party_photos_add on public.party_photos
  for insert to authenticated with check (
    party_photos.uploaded_by = auth.uid()
    and exists (
      select 1 from public.party_posts x
       where x.id = party_photos.party_id
         and x.deleted_at is null
         and (x.owner = auth.uid() or public.is_admin())
    )
  );

grant select, insert on public.party_photos to authenticated;
grant usage on sequence public.party_photos_id_seq to authenticated;

/* ── what v73 already had ────────────────────────────────────────────────── */

insert into public.party_photos (party_id, url, path, uploaded_by, created_at)
select x.id, x.outcome_photo, null, null, coalesce(x.outcome_at, now())
  from public.party_posts x
 where x.outcome_photo is not null
   and not exists (
     select 1 from public.party_photos p
      where p.party_id = x.id and p.url = x.outcome_photo
   );
