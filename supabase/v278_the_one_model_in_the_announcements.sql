-- v278 — the one model in the announcements (2026-10-17)
-- Run once in the Supabase SQL editor, after v255 (and v256 if it has run), and after the page with Doll 2 is live.
-- Running it again is safe.
--
-- Doll 2 (the owner, 2026-10-17: everybody one model, with outfits, hats and things worn): a look is written in a new
-- form, "6" and twelve digits (lib/town/look's v6: the old eight, then the outfit, the hat, the glasses, the neck and
-- the hair). Every page reads an old look (v5, a race's) as the one model already, so nobody's look needs rewriting
-- here: the change to one model happens wherever a look is read, and each member's own page saves the new form.
--
-- The one place the database keeps a look is the announcements' faces (v255: `town_announcement_faces`, what a
-- member's portrait is drawn from), and it takes only the old form: its check refuses a new look, and the two
-- functions that keep a member's face (`town_announcements`, and v256's `town_admin_announce`) pass a new look by
-- without keeping it. So a portrait would stay the member's old race look, in the starter's clothes, whatever they
-- wear now. This lets the faces take both forms, and each member's face becomes the new one the next time their page
-- asks for the announcements (it sends the look it wears each time). The functions are changed where the old form is
-- written in them, read from the database's own definitions, so this is right whether v256 has run or not.

begin;
set local statement_timeout = '30s';
set local lock_timeout = '10s';
do $$ begin
 if to_regclass('public.town_announcement_faces') is null then raise exception 'Run v255 before v278'; end if;
end $$;

-- a face: the old form (a race's, eight) or the new (one model, thirteen)
alter table public.town_announcement_faces drop constraint if exists town_announcement_faces_look_check;
alter table public.town_announcement_faces add constraint town_announcement_faces_look_check
  check (look ~ '^(5[0-9a-z]{7}|6[0-9a-z]{12})$');

-- every function that keeps a face only in the old form takes the new as well (its own text, that one test changed)
do $$
declare
  f regprocedure;
  d text;
begin
  for f in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname in ('public', 'town') and p.prosrc like '%^5[0-9a-z]{7}$%' loop
    d := pg_get_functiondef(f);
    execute replace(d, '''^5[0-9a-z]{7}$''', '''^(5[0-9a-z]{7}|6[0-9a-z]{12})$''');
  end loop;
end $$;

commit;
notify pgrst, 'reload schema';

-- What it should say afterwards:
--   select pg_get_constraintdef(oid) from pg_constraint where conname = 'town_announcement_faces_look_check';
--                                                  -- CHECK ((look ~ '^(5[0-9a-z]{7}|6[0-9a-z]{12})$'::text))
--   select count(*) from pg_proc where prosrc like '%''^5[0-9a-z]{7}$''%';            -- 0
--   select left(look, 1) v, count(*) from public.town_announcement_faces group by 1;  -- 5s now; 6s as members come back
