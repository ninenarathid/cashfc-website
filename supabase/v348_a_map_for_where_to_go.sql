-- v348 — a map for where to go
--
-- Run this once in the Supabase SQL editor, after v347. Running it again is
-- safe.
--
-- The owner, 2026-11-25: "เวลา mention ถึง map เช่น Tuliyollal (X: 11.1 Y:
-- 14.6) ขอภาพแมพด้วย". The unlock text of a guide names a place and a spot;
-- beside it there may now be up to four pictures (the game's own map cut
-- around the spot, with a pin), each with a caption — the same shape, and the
-- same check, as a step's reference pictures and a reward's pictures.
--
-- Read by anybody for a published guide, written by admins, as the rest of
-- the guide.

alter table public.guides add column if not exists unlock_pics jsonb not null default '[]'::jsonb
  check (pg_column_size(unlock_pics) <= 4000 and public.guide_refs_ok(unlock_pics));

grant insert (unlock_pics) on public.guides to authenticated;
grant update (unlock_pics) on public.guides to authenticated;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select column_name, data_type from information_schema.columns
 where table_schema = 'public' and table_name = 'guides' and column_name = 'unlock_pics';
--  unlock_pics | jsonb
*/
