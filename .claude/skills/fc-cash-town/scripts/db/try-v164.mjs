/*
 * One part of a file to come, tried against the stand-in database as it is after the last file that ran (a snapshot,
 * loaded in a second, in memory: nothing is written anywhere, and several may run at once). try-line.mjs made general:
 * the version and the part are arguments, a part may make a table, and a part may add lines to functions that earlier
 * files wrote, without pasting them.
 *
 *   node try-v164.mjs <the worktree's root> <version> <part>          e.g.  node try-v164.mjs E:/…/fcnext-wt-x v164 smith
 *
 * It reads, in <root>/.claude/skills/fc-cash-town/scripts/db/:
 *   <version>.shared.sql          optional: what every part stands on (run first; not a part's to change)
 *   <version>.<part>.sql          the part's tables and NEW functions (it must run, twice over, and write to no table
 *                                 with no WHERE). A line `-- stands on: <part>, <part>` in its head names the parts whose
 *                                 SQL is run before it, as it will be in the file put together. A part that carries the
 *                                 file's catalog block (`-- <catalog:vNNN>`, written by fill-catalog.mjs) writes those
 *                                 rows itself: they are not put in for it, and what it leaves is held to the code.
 *                                 (MIGRATION_FILE=<a copy> tries that copy in the part's place: mutate.mjs's way.)
 *   <version>.<part>.lines.mjs    optional: `export const AGAIN = [[mark, "schema.fn(arg types)", [[from, to], …]], …]`:
 *                                 the functions of earlier files that the part adds lines to. THE PART NEVER PASTES
 *                                 THEM (a file that runs in between may write them again): its file has an empty place
 *                                 for each, `-- <mark>` / `-- </mark>`, and each statement is built here from the
 *                                 function's own text as the database has it, with the lines in place (build-v164.mjs).
 *                                 A part that writes a function that was there before in its own file fails.
 *   <version>.<part>.calls.json   optional: { "<case fn>": "town.x($1::jsonb, $2::text)" } for the part's rule cases
 *   <version>.<part>.try.mjs      optional: `export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, give, patch, rank, root, sql }) { … }`
 * and, in ./<version>/ beside this file (write them first, in the worktree:
 *   TOWN_VECTORS=<this folder>/<version> npx vitest run lib/town/db-vectors-<part>.test.ts ):
 *   catalog.json              the catalog as the worktree's code has it: every row of it is put into the database first
 *   vectors-<part>.json       the part's rule cases: [{ fn, args, want }]
 *
 * In a try.mjs: `call(U.m1, "town_x", arg, …)` calls public.town_x as that member and gives its answer (or
 * { error, code }); `purseOf(U.m1)` is the member's purse as kept; `deeds("what")` the deeds written down under a
 * word; `one(sql, params)` a row as the SQL editor; `give(who, gifts)` puts a purse's gifts as they are to be;
 * `patch(who, fields)` writes fields of the kept purse over; `rank(who, line, points)` gives a member so many points
 * on a line; `t.check(name, ok, detail)`, `t.section(title)`, `t.sql(sql, params)`.
 * U.m1 and U.m2 are verified members, U.admin an admin, U.guest not of the FC, U.unver unproved, U.nochar with no character.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { changed } from "./build-v159.mjs";
import { againOf, defsOf, filled, linesOf, pasted } from "./build-v164.mjs";

const [root, version, part] = process.argv.slice(2);
if (!root || !/^v\d+$/.test(version ?? "") || !part) { console.log("node try-v164.mjs <the worktree's root> <version> <part>"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const here = (name) => new URL(`./${version}/${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const file = (p) => `${version}.${p}.sql`;
if (!existsSync(db(file(part)))) { console.log(`no ${db(file(part))}`); process.exit(2); }
if (!existsSync(here("catalog.json"))) { console.log(`no ${version}/catalog.json: run the part's rule cases with TOWN_VECTORS first (see this file's head)`); process.exit(2); }
// (MIGRATION_FILE: a broken copy of the part's own file in its place, which is how mutate.mjs hands one in)
const FILE = lf(readFileSync(process.env.MIGRATION_FILE || db(file(part)), "utf8"));
const CODE = JSON.parse(readFileSync(here("catalog.json"), "utf8"));
/** The catalog rows a part's own text writes: those of its marked block (`-- <catalog:vNNN>` … `-- </catalog:vNNN>`), if it carries one. */
const blockOf = (sql) => {
  const a = sql.indexOf(`-- <catalog:${version}>`), b = sql.indexOf(`-- </catalog:${version}>`);
  return a < 0 || b < a ? [] : [...sql.slice(a, b).matchAll(/^ {2}\('([a-z_]+)', \$town\$/gm)].map((m) => m[1]);
};
const OWN = blockOf(FILE);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
/** The parts a part's SQL says it stands on (`-- stands on: a, b` in its head), in the order they are named. */
const standsOn = (sql) => (sql.split("\n").slice(0, 60).map((l) => /^-- stands on:\s*(.+)$/.exec(l)?.[1]).find(Boolean) ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const t0 = Date.now();
const t = await standIn();
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
/** So many points on a line for a member, as if earned before today. */
const rank = async (who, ln, points) => {
  await t.sql(`insert into public.town_work (member_id, line, kept) values ($1, $2, jsonb_build_object('points', $3::numeric)) on conflict (member_id, line) do update set kept = coalesce(public.town_work.kept, '{}'::jsonb) || jsonb_build_object('points', $3::numeric)`, [who, ln, points]);
  return (await one(`select town.rank_on($1, $2) as r`, [who, ln])).r;
};
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param));
  return r.error ? r : r.rows[0].r;
};
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const deeds = async (what) => (await t.sql(`select member_id, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what = $1 order by id`, [what])).rows;
/** A member's gifts put as they are to be (the purse made first, if there is none). */
const give = async (who, gifts) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
  return (await purseOf(who))?.gifts;
};
/** Fields of a member's kept purse written over (`coins` is the row's own column, and is written there). */
const patch = async (who, fields) => {
  const { coins, ...doc } = fields;
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(doc)]);
  if (coins !== undefined) await t.sql(`update public.town_purses set coins = $2 where member_id = $1`, [who, coins]);
  return purseOf(who);
};
const defs = () => defsOf((q) => t.sql(q).then((r) => r.rows));
/** A part as it is run: its own file, with each function it adds lines to built from the database's text as it is at that moment. */
const ready = async (p) => filled(lf(readFileSync(db(file(p)), "utf8")), againOf(await defs(), await linesOf(db(`${version}.${p}.lines.mjs`))));

t.section(`the catalog as the code has it: ${Object.keys(CODE).length} rows`);
const before = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const moved = Object.keys(CODE).filter((k) => !same(CODE[k], before[k]));
// (a part that carries the file's catalog block writes its rows itself: they are not put in for it, so that it is the
// block that is tried, and what it leaves is held to the code below)
for (const k of Object.keys(CODE).filter((key) => !OWN.includes(key))) await t.sql(`insert into public.town_catalog (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()`, [k, JSON.stringify(CODE[k])]);
console.log(`  rows that differ from what the database had: ${moved.length ? moved.join(", ") : "none"}`);
if (OWN.length) console.log(`  rows the part's own block writes, left to it: ${OWN.join(", ")}`);

t.section(`${existsSync(db(file("shared"))) ? `${file("shared")}, then ` : ""}the part's own`);
if (existsSync(db(file("shared"))) && part !== "shared") await t.runTwice(lf(readFileSync(db(file("shared")), "utf8")), file("shared"));
// (a part that stands on another's: that one's SQL is run first, as it will be in the file put together)
for (const b of standsOn(FILE)) await t.runTwice(await ready(b), `${file(b)} (what ${part} stands on)`);
// (the functions the part adds lines to, as they are before it; and nothing of them pasted into its file)
const AGAIN = await linesOf(db(`${version}.${part}.lines.mjs`));
const OLD = await defs();
const copies = pasted(FILE, OLD);
t.check("the part's own file writes no function that was there before (such a one is built from its lines, never pasted)", copies.length === 0, copies);
let RUN = FILE;
try { RUN = filled(FILE, againOf(OLD, AGAIN)); t.check(`${AGAIN.length} function${AGAIN.length === 1 ? "" : "s"} of earlier files built from the database's own text, each with the part's lines in place`, true); }
catch (e) { t.check("the functions of earlier files are built from the database's own text with the part's lines in place", false, e.message); }
await t.runTwice(RUN, file(part));
if (OWN.length) {
  // (the block is the code's: every row the code has is the database's now, and the block wrote every row that
  // differed and no other)
  const after = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
  const off = Object.keys(CODE).filter((k) => !same(CODE[k], after[k]));
  t.check(`the catalog is the code's after the part's own block (${OWN.length} rows written by it)`, off.length === 0, off);
  const idle = OWN.filter((k) => !moved.includes(k)), missed = moved.filter((k) => !OWN.includes(k));
  t.check("the block writes every row that differed from the database's, and none that did not", idle.length === 0 && missed.length === 0, { idle, missed });
}
const NOW = await defs();
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes to a table with no WHERE", bare.length === 0, bare);
// (in any case: a function written again from the database's own wording has its head in capitals)
const inFile = [...new Set([...RUN.matchAll(/create or replace function ((?:public|town)\.[a-z0-9_]+)\s*\(/gi)].map((m) => m[1].toLowerCase()))];
// (what a member may call is granted to the signed in and to nobody else)
for (const fn of inFile.filter((f) => f.startsWith("public.town_"))) {
  const g = await one(`select has_function_privilege('authenticated', p.oid, 'execute') as member, has_function_privilege('anon', p.oid, 'execute') as anon, p.prosecdef as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid desc limit 1`, [fn]);
  t.check(`${fn}: for the signed in, not for the signed out, security definer`, g?.member === true && g.anon === false && g.definer === true, g);
}
const open = (await t.sql(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'town' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows.map((r) => r.name);
t.check("no rule of schema town is for anybody to call", open.length === 0, open);
// (a table the part makes is closed: row level security on, and nothing granted to a browser)
for (const table of [...new Set([...FILE.matchAll(/create table if not exists (public\.town_[a-z0-9_]+)/gi)].map((m) => m[1].toLowerCase()))]) {
  const c = await one(`select c.relrowsecurity as closed, (select count(*)::int from information_schema.role_table_grants g
      where g.table_schema || '.' || g.table_name = $1 and g.grantee in ('anon', 'authenticated')) as grants,
      (select count(*)::int from pg_policies p where p.schemaname || '.' || p.tablename = $1) as policies from pg_class c where c.oid = $1::regclass`, [table]);
  t.check(`${table}: row level security on, nothing granted to a browser, no policy that opens it`, c?.closed === true && c.grants === 0 && c.policies === 0, c);
}

// A function of an earlier file's that the part adds lines to is the one it replaces, but for those lines; and
// nothing else that was there before is changed by the part.
const sigs = new Set(AGAIN.map(([, sig]) => sig));
for (const [mark, sig, lines] of AGAIN) {
  let want = null, why = "";
  try { want = changed(OLD[sig] ?? "", mark, lines); } catch (e) { why = e.message; }
  t.check(`${mark} is the one it replaces, word for word, but for the lines meant`, !!OLD[sig] && NOW[sig] === want && NOW[sig] !== OLD[sig], why || (NOW[sig] ?? "").slice(0, 300));
}
const others = Object.keys(OLD).filter((k) => !sigs.has(k) && NOW[k] !== OLD[k]);
t.check("no other function that was there before is changed (or gone)", others.length === 0, others);
console.log(`  new functions: ${Object.keys(NOW).filter((k) => !(k in OLD)).length}; with lines more: ${AGAIN.length}`);

if (existsSync(here(`vectors-${part}.json`))) {
  const vectors = JSON.parse(readFileSync(here(`vectors-${part}.json`), "utf8"));
  const CALL = existsSync(db(`${version}.${part}.calls.json`)) ? JSON.parse(readFileSync(db(`${version}.${part}.calls.json`), "utf8")) : {};
  t.section(`the part's rule cases: ${vectors.length}, each as the code answers it`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r);
    r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn} in ${version}.${part}.calls.json`; continue; }
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2400)}` : "");
} else console.log(`  (no ${version}/vectors-${part}.json: no rule cases asked)`);

if (existsSync(db(`${version}.${part}.try.mjs`))) {
  const mod = await import(pathToFileURL(db(`${version}.${part}.try.mjs`)).href);
  // (`sql`: the part as it was run, its places filled: for a scene that runs it once more over what members have done since)
  await mod.default({ t, U, call, purseOf, deeds, one, same, CODE, give, patch, rank, root, sql: RUN });
}
t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
