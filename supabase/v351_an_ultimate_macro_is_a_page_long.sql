-- v351 — an Ultimate's macro is a page long
--
-- Run this once in the Supabase SQL editor, after v350. Running it again is
-- safe.
--
-- v349 capped guides.macro_en and guides.macro_ja at 2000 characters: an
-- Extreme's macro is one or two in-game macros. An Ultimate's is a whole set,
-- one block a phase. The Elemental PF sets the Ultimate guides copy from
-- Tuufless's Notes (the owner's choice, 2026-11-27) run to 3331 characters
-- (DSR, English) — TOP's import was refused by guides_macro_en_check. The cap
-- goes to 8000, which every Ultimate's set fits with room to spare.

alter table public.guides drop constraint if exists guides_macro_en_check;
alter table public.guides add constraint guides_macro_en_check
  check (macro_en is null or char_length(macro_en) <= 8000);

alter table public.guides drop constraint if exists guides_macro_ja_check;
alter table public.guides add constraint guides_macro_ja_check
  check (macro_ja is null or char_length(macro_ja) <= 8000);

-- Check: two rows, each "... <= 8000".
select conname, pg_get_constraintdef(oid)
  from pg_constraint
 where conrelid = 'public.guides'::regclass
   and conname in ('guides_macro_en_check', 'guides_macro_ja_check')
 order by conname;
