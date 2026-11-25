-- v345 — guide notes with room to breathe
--
-- Run this once in the Supabase SQL editor, after v344. Running it again is
-- safe.
--
-- The owner, 2026-11-25, reading the first guide (EX7 Enuo): a note should
-- be laid out one thing to a line, and should carry the tricks the FC
-- actually plays by ("ยืนรอตรงข้ามเส้นสั้น แล้วค่อยวิ่งไป position", "ยิงเลข
-- หลบตัวอักษร"). Laid out like that, with those added, three of Enuo's notes
-- no longer fit in v344's 400 characters, and later fights will have more of
-- the same. So a step's note may now run to 1000 characters and a guide's to
-- 1000. Nothing else about either changes.
--
-- And a mend to v344: guide_refs_ok's path pattern lost the backslash before
-- the dot of the file's extension, so any one character was let through
-- there. Harmless (the page checks every path again with the strict pattern
-- and draws nothing it does not accept), but the database should say exactly
-- what it means, as guide_steps.picture's check already does.

/* ── room in the notes ───────────────────────────────────────────────────── */

alter table public.guide_steps drop constraint if exists guide_steps_note_check;
alter table public.guide_steps add constraint guide_steps_note_check
  check (note is null or char_length(note) <= 1000);

alter table public.guides drop constraint if exists guides_note_check;
alter table public.guides add constraint guides_note_check
  check (note is null or char_length(note) <= 1000);

/* ── the reference pictures' path, exactly ───────────────────────────────── */

create or replace function public.guide_refs_ok(r jsonb)
returns boolean
language sql
immutable
as $fn$
  select r is not null
     and jsonb_typeof(r) = 'array'
     and jsonb_array_length(r) <= 4
     and not exists (
       select 1
         from jsonb_array_elements(r) as e(v)
        where jsonb_typeof(e.v) <> 'object'
           or exists (select 1 from jsonb_object_keys(e.v) as k(name)
                       where k.name not in ('path', 'w', 'h', 'say'))
           or jsonb_typeof(e.v -> 'path') is distinct from 'string'
           or (e.v ->> 'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'
           or jsonb_typeof(e.v -> 'w') is distinct from 'number'
           or jsonb_typeof(e.v -> 'h') is distinct from 'number'
           or (e.v ? 'say' and (jsonb_typeof(e.v -> 'say') <> 'string'
                                or char_length(e.v ->> 'say') > 160))
     );
$fn$;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select conname, pg_get_constraintdef(oid) from pg_constraint
 where conname in ('guide_steps_note_check', 'guides_note_check') order by 1;
--  guide_steps_note_check | CHECK (((note IS NULL) OR (char_length(note) <= 1000)))
--  guides_note_check      | CHECK (((note IS NULL) OR (char_length(note) <= 1000)))

select public.guide_refs_ok('[{"path": "0b9c1f2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f/g-1764000000000-abcd.webp", "w": 1, "h": 1}]') as fine,
       public.guide_refs_ok('[{"path": "0b9c1f2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f/g-1764000000000-abcd/webp", "w": 1, "h": 1}]') as slash_for_dot;
--  true | false
*/
