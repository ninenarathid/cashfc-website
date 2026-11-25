-- v346 — guides in English too
--
-- Run this once in the Supabase SQL editor, after v345. Running it again is
-- safe.
--
-- The owner, 2026-11-25: "ช่วยทำให้รองรับภาษาอังกฤษด้วย". The site already
-- speaks Thai and English; a guide's own words were Thai only. So beside every
-- Thai text a guide has there is now an English one, and the page shows the
-- reader's language, falling back to the Thai where nobody has written the
-- English yet:
--
--   guides       note_en
--   guide_steps  phase_en, mech_en, name_en, note_en
--   spots        each seat may carry "say_en" beside "say"
--   refs         each picture may carry "say_en" beside "say"
--
-- The same limits as the Thai, the same writers (admins) and readers (anyone,
-- for a published guide). The two check functions are replaced to let the one
-- new key through and nothing else; the rest of what they check is unchanged
-- (and guide_refs_ok keeps v345's exact path pattern).

/* ── the columns ─────────────────────────────────────────────────────────── */

alter table public.guides add column if not exists note_en text
  check (note_en is null or char_length(note_en) <= 1000);

alter table public.guide_steps add column if not exists phase_en text
  check (phase_en is null or char_length(phase_en) <= 60);
alter table public.guide_steps add column if not exists mech_en text
  check (mech_en is null or char_length(mech_en) <= 80);
alter table public.guide_steps add column if not exists name_en text
  check (name_en is null or char_length(name_en) <= 80);
alter table public.guide_steps add column if not exists note_en text
  check (note_en is null or char_length(note_en) <= 1000);

/* ── a seat's line, in either language ───────────────────────────────────── */

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
                       where k.name not in ('at', 'say', 'say_en'))
           or (e.v ? 'say' and (jsonb_typeof(e.v -> 'say') <> 'string'
                                or char_length(e.v ->> 'say') > 200))
           or (e.v ? 'say_en' and (jsonb_typeof(e.v -> 'say_en') <> 'string'
                                   or char_length(e.v ->> 'say_en') > 200))
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

/* ── a reference picture's caption, in either language ───────────────────── */

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
                       where k.name not in ('path', 'w', 'h', 'say', 'say_en'))
           or jsonb_typeof(e.v -> 'path') is distinct from 'string'
           or (e.v ->> 'path') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g-[0-9]{10,16}-[a-z0-9]{4,12}\.(webp|jpg|png)$'
           or jsonb_typeof(e.v -> 'w') is distinct from 'number'
           or jsonb_typeof(e.v -> 'h') is distinct from 'number'
           or (e.v ? 'say' and (jsonb_typeof(e.v -> 'say') <> 'string'
                                or char_length(e.v ->> 'say') > 160))
           or (e.v ? 'say_en' and (jsonb_typeof(e.v -> 'say_en') <> 'string'
                                   or char_length(e.v ->> 'say_en') > 160))
     );
$fn$;

/* ── who may write them: admins, as for the Thai ─────────────────────────── */

grant insert (note_en) on public.guides to authenticated;
grant update (note_en) on public.guides to authenticated;
grant insert (phase_en, mech_en, name_en, note_en) on public.guide_steps to authenticated;
grant update (phase_en, mech_en, name_en, note_en) on public.guide_steps to authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select table_name, column_name from information_schema.columns
 where table_schema = 'public' and column_name like '%\_en' escape '\'
   and table_name in ('guides', 'guide_steps')
 order by 1, 2;
--  guide_steps | mech_en
--  guide_steps | name_en
--  guide_steps | note_en
--  guide_steps | phase_en
--  guides      | note_en

select public.guide_spots_ok('{"MT": {"at": [[50, 20]], "say": "เหนือ", "say_en": "North"}}') as both_lines,
       public.guide_spots_ok('{"MT": {"say_fr": "Nord"}}') as other_language;
--  true | false

select count(*) as steps_with_english from public.guide_steps where note_en is not null;
--  0 (until a guide is given its English)
*/
