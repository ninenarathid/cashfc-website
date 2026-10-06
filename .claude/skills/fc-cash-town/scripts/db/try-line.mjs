/*
 * One line's SQL tried against the stand-in database as it is after the last file that ran (a snapshot, loaded in a
 * second, in memory: nothing is written anywhere, and several may run at once).
 *
 *   node try-line.mjs <the worktree's root> <line>
 *
 * It reads, in <root>/.claude/skills/fc-cash-town/scripts/db/:
 *   v153.shared.sql          what every line stands on (run first; not a line's to change)
 *   v153.<line>.sql          the line's functions (it must run, twice over, and write to no table with no WHERE)
 *   v153.<line>.calls.json   optional: { "<case fn>": "town.x($1::jsonb, $2::text)" } for the line's rule cases
 *   v153.<line>.try.mjs      optional: `export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, give, patch, rank }) { … }`
 * and, in ./lines/<line>/ beside this file (write them first, in the worktree:
 *   TOWN_VECTORS=<this folder>/lines/<line> npx vitest run lib/town/db-vectors-gifts-<line>.test.ts lib/town/db-vectors-gifts.test.ts ):
 *   catalog.json                 the catalog as the worktree's code has it: every row of it is put into the database first
 *   vectors-gifts-<line>.json    the line's rule cases
 *
 * In a try.mjs: `call(U.m1, "town_x", arg, …)` calls public.town_x as that member and gives its answer (or
 * { error, code }); `purseOf(U.m1)` is the member's purse as kept; `deeds("what")` the deeds written down under a
 * word; `one(sql, params)` a row as the SQL editor; `give(who, gifts)` puts a purse's gifts as they are to be
 * ({ had, charms, familiar }); `patch(who, fields)` writes fields of the kept purse over; `t.check(name, ok, detail)`, `t.section(title)`, `t.sql(sql, params)`;
 * `rank(who, line, points)` gives a member so many points on a line (not the well's: that is the carriers' book).
 * U.m1 and U.m2 are verified members, U.admin an admin, U.guest not of the FC.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const [root, line] = process.argv.slice(2);
if (!root || !line) { console.log("node try-line.mjs <the worktree's root> <line>"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const here = (name) => new URL(`./lines/${line}/${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
if (!existsSync(db(`v153.${line}.sql`))) { console.log(`no ${db(`v153.${line}.sql`)}`); process.exit(2); }
if (!existsSync(here("catalog.json"))) { console.log(`no lines/${line}/catalog.json: run the line's rule cases with TOWN_VECTORS first (see this file's head)`); process.exit(2); }
const FILE = lf(readFileSync(db(`v153.${line}.sql`), "utf8"));
const CODE = JSON.parse(readFileSync(here("catalog.json"), "utf8"));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);

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
/** A member's gifts put as they are to be (the purse made first by a call of the member's own, if there is none). */
const give = async (who, gifts) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
  return (await purseOf(who))?.gifts;
};
/** Fields of a member's kept purse written over (stamina, bag, a field of the line's own …): `patch(U.m1, { stamina: 0 })`. */
const patch = async (who, fields) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(fields)]);
  return purseOf(who);
};

t.section(`the catalog as the code has it: ${Object.keys(CODE).length} rows`);
const before = Object.fromEntries((await t.sql(`select key, data from public.town_catalog`)).rows.map((r) => [r.key, r.data]));
const moved = Object.keys(CODE).filter((k) => !same(CODE[k], before[k]));
for (const k of Object.keys(CODE)) await t.sql(`insert into public.town_catalog (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()`, [k, JSON.stringify(CODE[k])]);
console.log(`  rows that differ from what the database had: ${moved.length ? moved.join(", ") : "none"}`);

// (what every line stands on: the count's stretch by its whole rule, and how much harder a line's good things are at a rank)
const SHARED = lf(readFileSync(db("v153.shared.sql"), "utf8"));
t.section("v153.shared.sql, then the line's own");
await t.runTwice(SHARED, "v153.shared.sql");
if (line !== "shared") await t.runTwice(FILE, `v153.${line}.sql`);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes to a table with no WHERE", bare.length === 0, bare);
// (what a member may call is granted to the signed in and to nobody else)
const made = [...FILE.matchAll(/create or replace function (public\.town_[a-z0-9_]+)\s*\(/g)].map((m) => m[1]);
for (const fn of new Set(made)) {
  const g = await one(`select has_function_privilege('authenticated', p.oid, 'execute') as member, has_function_privilege('anon', p.oid, 'execute') as anon, p.prosecdef as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid desc limit 1`, [fn]);
  t.check(`${fn}: for the signed in, not for the signed out, security definer`, g?.member === true && g.anon === false && g.definer === true, g);
}
const open = (await t.sql(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'town' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows.map((r) => r.name);
t.check("no rule of schema town is for anybody to call", open.length === 0, open);

if (existsSync(here(`vectors-gifts-${line}.json`))) {
  const vectors = JSON.parse(readFileSync(here(`vectors-gifts-${line}.json`), "utf8"));
  const CALL = existsSync(db(`v153.${line}.calls.json`)) ? JSON.parse(readFileSync(db(`v153.${line}.calls.json`), "utf8")) : {};
  t.section(`the line's rule cases: ${vectors.length}, each as the code answers it`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r);
    r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn} in v153.${line}.calls.json`; continue; }
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2400)}` : "");
} else console.log(`  (no lines/${line}/vectors-gifts-${line}.json: no rule cases asked)`);

if (existsSync(db(`v153.${line}.try.mjs`))) {
  const mod = await import(pathToFileURL(db(`v153.${line}.try.mjs`)).href);
  await mod.default({ t, U, call, purseOf, deeds, one, same, CODE, give, patch, rank });
}
t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
