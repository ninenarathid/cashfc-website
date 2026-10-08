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
export const RAN = 165;
const here = (name) => new URL(`./${name}`, import.meta.url);
const SNAP = here(`snap-v${RAN}.tar`);
const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

/** Built from nothing: every file replayed. */
async function build() {
  const t = await supabaseLike({ extra });
  // (by number, but v130 after v131, as it ran; v136 is the party finder's and v157 the members' contacts'; a number that was never a file is passed over:
  // v160 to v164 are other rounds' numbers, not files yet when v165 ran, and none of them and v165 stands on the other)
  const numbers = Array.from({ length: RAN - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136 && n !== 157);
  numbers.splice(numbers.indexOf(131) + 1, 0, 130);
  for (const n of numbers) { let sql = null; try { sql = migration(n); } catch { /* never a file */ } if (sql) await t.run(sql, `v${n}`); }
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
  return t;
}

/** The stand-in, from the snapshot when there is one (and `fresh` is not asked for), else built and dumped for the next time. */
export async function standIn({ fresh = process.env.FRESH === "1" } = {}) {
  if (!fresh && existsSync(SNAP)) return supabaseLike({ load: new Blob([readFileSync(SNAP)]) });
  const t = await build();
  const dump = await t.db.dumpDataDir("none");
  writeFileSync(SNAP, Buffer.from(await dump.arrayBuffer()));
  return t;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const had = existsSync(SNAP) && process.env.FRESH !== "1", t0 = Date.now();
  const t = await standIn();
  const n = (await t.sql(`select count(*)::int as n from pg_proc p where p.pronamespace = 'town'::regnamespace`)).rows[0].n;
  console.log(`${had ? "the snapshot is there" : "the snapshot is built"}: v104 to v${RAN}, ${n} rules of the town's, in ${((Date.now() - t0) / 1000).toFixed(1)} s (${fileURLToPath(SNAP)})`);
  process.exit(0);
}
