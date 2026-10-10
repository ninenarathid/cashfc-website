/*
 * The town's stand-in database as it is after the last file that ran, for a dry run to begin from.
 *
 * Every dry run replayed every file of the town's (v104 on) into an empty PGlite before it tried its own: a minute or
 * two, and again for each break of the file (mutate.mjs runs the dry run once a break). This builds that database
 * once, dumps it beside this file (`snap-v<RAN>.tar`, not kept in git), and hands it back loaded in a fraction of a
 * second whenever it is asked for again.
 *
 *   node stand-in.mjs            builds the snapshot (or says it is there); FRESH=1 builds it anew
 *
 *   import { standIn } from "./stand-in.mjs";
 *   const t = await standIn();   // the harness's own object (sql, as, run, runTwice, check, section, done)
 *
 * What is in it: the harness's stubs and seed, the kudos and gallery tables the town's files lean on, every file of
 * the town's to RAN replayed as town-bench.mjs replays them, the game opened, and the catalog's rows made three hours
 * old (so that a file's own writes to them show as fresh). Nothing of any one dry run.
 * A snapshot is of the files as they ran: when RAN moves, another is built under its own name.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { supabaseLike, migration } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";

/** The last file of the town's that has run (town-bench.mjs has the same number). */
export const RAN = 176;
const here = (name) => new URL(`./${name}`, import.meta.url);
// (v160 and v163 ran after v166, v164 after v168: the snapshot named for RAN alone is of all that has run, as it ran: snap-v176.tar.
// Older ones are kept, each under its own name, for the dry runs that begin from the database as it was before a file:
// snap-v168.tar is the database before v164 (`standIn({ before164: true })`, for v164's own parts); snap-v168-with-164.tar is
// before v169 (`standIn({ upTo: 168 })`); snap-v169-with-164.tar is before v170 (`standIn({ upTo: 169 })`); snap-v170-with-164.tar is before v171 (`standIn({ upTo: 170 })`);
// snap-v171-with-164.tar is before v172 (`standIn({ upTo: 171 })`), snap-v172-with-164.tar before v173 (`standIn({ upTo: 172 })`).)
const snapOf = (upTo) => here(upTo >= 173 ? `snap-v${upTo}.tar` : `snap-v${upTo}-with-164.tar`);
const SNAP = snapOf(RAN);
const SNAP_BEFORE_164 = here("snap-v168.tar");
const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

/** Built from nothing: every file replayed. */
async function build({ before164 = false, upTo = RAN } = {}) {
  if (before164) upTo = 168;
  const t = await supabaseLike({ extra });
  // (by number, but v130 after v131, as it ran; v136 is the party finder's and v157 the members' contacts'; a number that was never a file is passed over:
  // v160 to v164 were other rounds' numbers, not files yet when v165 and v166 ran; **v160 (the bridge built by hand) and v163 (the lamp relay) ran after
  // v166, on 2026-10-09, and are replayed there, as they ran**; v161 and v162 never were files)
  // (v169 and v170 ran on 2026-10-09 after v164, in their numbers' order, and v171, v172 and v173 after them: v164 is replayed after v168, then v169 to v173)
  // (**v164, the far side, ran on 2026-10-09 after v168, though its number is lower**: it writes `town.work_counts_of` and `town.deed_th` from
  // their text as v163 left it, so it is replayed after v168 and not by its number, where it would undo v160's and v163's blocks and be undone by them.)
  const numbers = Array.from({ length: upTo - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136 && n !== 157 && n !== 160 && n !== 163 && n !== 164);
  const AFTER_168 = before164 ? [] : [164];
  numbers.splice(numbers.indexOf(131) + 1, 0, 130);
  numbers.splice(numbers.indexOf(166) + 1, 0, 160, 163);
  numbers.splice(numbers.indexOf(168) + 1, 0, ...AFTER_168);
  for (const n of numbers) { let sql = null; try { sql = migration(n); } catch { /* never a file */ } if (sql) await t.run(sql, `v${n}`); }
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
  return t;
}

/** The stand-in, from the snapshot when there is one (and `fresh` is not asked for), else built and dumped for the next time. */
export async function standIn({ fresh = process.env.FRESH === "1", before164 = false, upTo = RAN } = {}) {
  const SNAP_ = before164 ? SNAP_BEFORE_164 : snapOf(upTo);
  if (!fresh && existsSync(SNAP_)) return supabaseLike({ load: new Blob([readFileSync(SNAP_)]) });
  const t = await build({ before164, upTo });
  const dump = await t.db.dumpDataDir("none");
  writeFileSync(SNAP_, Buffer.from(await dump.arrayBuffer()));
  return t;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const had = existsSync(SNAP) && process.env.FRESH !== "1", t0 = Date.now();
  const t = await standIn();
  const n = (await t.sql(`select count(*)::int as n from pg_proc p where p.pronamespace = 'town'::regnamespace`)).rows[0].n;
  console.log(`${had ? "the snapshot is there" : "the snapshot is built"}: v104 to v${RAN}, ${n} rules of the town's, in ${((Date.now() - t0) / 1000).toFixed(1)} s (${fileURLToPath(SNAP)})`);
  process.exit(0);
}
