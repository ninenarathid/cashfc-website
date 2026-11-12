-- v333 — the statics get their own message under the Discord board
--
-- Run this once in the Supabase SQL editor, after v332. Running it again is
-- safe.
--
-- The owner asked on 2026-11-12 that the static listings show in Discord too,
-- as a section of their own, a second message under the party board. The
-- board is one message the site edits in place (v57), and the route that
-- draws it takes down every other message the bot has left in the channel so
-- that there is only ever one board. A second message therefore needs to be
-- remembered by id, the same way the board is, or the sweep takes it down on
-- the next tick and it is posted again, over and over.
--
-- One column on the same one-row table. Nothing reaches the table from a
-- browser (v57 revoked it from anon and authenticated); the route uses the
-- service role. Until this has run the route reads the column, finds it
-- missing, and leaves the statics out, which is the board as it is today.

alter table public.discord_board add column if not exists static_message_id text;

notify pgrst, 'reload schema';

/* ── What it should say afterwards ───────────────────────────────────────────

select column_name, data_type
  from information_schema.columns
 where table_schema = 'public' and table_name = 'discord_board'
   and column_name = 'static_message_id';
--  static_message_id | text

select static_message_id from public.discord_board where id = 1;
--  null (until the next tick of the board posts the statics)
*/
