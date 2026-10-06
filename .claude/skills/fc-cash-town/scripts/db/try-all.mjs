/*
 * Every line's SQL together, against the stand-in database after the last file that ran: what try-line.mjs does for
 * one line, for all of them on one database, in the order given.
 *
 *   node try-all.mjs <the worktree's root> <line> <line> …        (SCENES=0: no scenes; ONLY=<line>: that line's scenes alone)
 *
 * First, in the worktree:
 *   TOWN_VECTORS=<this folder>/lines/all npx vitest run lib/town/db-vectors-gifts*.test.ts
 *
 * - no function is written by two lines (the later would silently undo the earlier);
 * - the shared SQL and every line's run, and the whole of it runs a second time;
 * - no write with no WHERE; what a member calls is granted rightly; no rule of schema town is for anybody to call;
 * - every line's rule cases, and the older cases of the gifts (lib/town/db-vectors-gifts.test.ts) where their rules
 *   still take what they took;
 * - each line's scenes, on a database of its own with every line's SQL in it.
 */
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const [root, ...LINES] = process.argv.slice(2);
if (!root || !LINES.length) { console.log("node try-all.mjs <the worktree's root> <line> …"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const here = (name) => new URL(`./lines/all/${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const read = (name) => lf(readFileSync(db(name), "utf8"));
const CODE = JSON.parse(readFileSync(here("catalog.json"), "utf8"));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
// (SUB=<line>=<file>: that line's SQL read from another file, a broken copy say; CASES=<line>: that line's rule cases alone;
//  DRAFT=<file>: the whole draft as one file in the parts' place, to prove the file put together and not only its parts)
const SUB = (process.env.SUB ?? "").split("=");
const part = (l) => (SUB[0] === l ? lf(readFileSync(SUB.slice(1).join("="), "utf8")) : read(`v153.${l}.sql`));
const FILES = process.env.DRAFT ? [["draft", lf(readFileSync(process.env.DRAFT, "utf8"))]] : [["shared", part("shared")], ...LINES.map((l) => [l, part(l)])];
const CASES = process.env.CASES ?? "";
// (in any case: a function written again from the database's own wording has its head in capitals)
const madeIn = (sql) => [...new Set([...sql.matchAll(/create or replace function ((?:public|town)\.[a-z0-9_]+)\s*\(/gi)].map((m) => m[1].toLowerCase()))];

/** A database with the catalog as the code has it and every file run (twice over when asked). */
async function fresh(t0 = null, twice = false) {
  const t = t0 ?? await standIn();
  for (const k of Object.keys(CODE)) await t.sql(`insert into public.town_catalog (key, data) values ($1, $2::jsonb) on conflict (key) do update set data = excluded.data, updated_at = now()`, [k, JSON.stringify(CODE[k])]);
  for (const [name, sql] of FILES) { if (t0) await t.run(sql, `v153.${name}.sql`); else await t.db.exec(sql); }
  if (twice) { try { for (const [, sql] of FILES) await t.db.exec(sql); t.check("the whole of it runs a second time", true); } catch (e) { t.check("the whole of it runs a second time", false, e.message); } }
  return t;
}
const helpers = (t) => {
  const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
  const call = async (who, fn, ...args) => { const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param)); return r.error ? r : r.rows[0].r; };
  const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
  const deeds = async (what) => (await t.sql(`select member_id, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what = $1 order by id`, [what])).rows;
  const give = async (who, gifts) => {
    await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
    await t.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
    return (await purseOf(who))?.gifts;
  };
  const patch = async (who, fields) => {
    await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
    await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(fields)]);
    return purseOf(who);
  };
  const rank = async (who, ln, points) => {
    await t.sql(`insert into public.town_work (member_id, line, kept) values ($1, $2, jsonb_build_object('points', $3::numeric)) on conflict (member_id, line) do update set kept = coalesce(public.town_work.kept, '{}'::jsonb) || jsonb_build_object('points', $3::numeric)`, [who, ln, points]);
    return (await one(`select town.rank_on($1, $2) as r`, [who, ln])).r;
  };
  return { t, U, call, purseOf, deeds, one, same, CODE, give, patch, rank };
};

const t0 = Date.now();
const t = await standIn();
t.section("no function is written by two lines");
const by = new Map();
for (const [name, sql] of FILES) for (const fn of madeIn(sql)) by.set(fn, [...(by.get(fn) ?? []), name]);
const twice = [...by].filter(([, who]) => who.length > 1);
t.check("each function is one file's", twice.length === 0, twice.map(([fn, who]) => `${fn}: ${who.join(" and ")}`).join("; "));

t.section(`the shared SQL and ${LINES.length} lines' on one database`);
await fresh(t, true);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes to a table with no WHERE", bare.length === 0, bare);
for (const fn of [...by.keys()].filter((f) => f.startsWith("public."))) {
  const g = (await t.sql(`select has_function_privilege('authenticated', p.oid, 'execute') as member, has_function_privilege('anon', p.oid, 'execute') as anon, p.prosecdef as definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid desc limit 1`, [fn])).rows[0];
  if (!(g?.member === true && g.anon === false && g.definer === true)) t.check(`${fn}: for the signed in, not for the signed out, security definer`, false, g);
}
t.check("what a member calls is for the signed in alone, security definer", true);
const open = (await t.sql(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'town' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows.map((r) => r.name);
t.check("no rule of schema town is for anybody to call", open.length === 0, open);

const ask = async (title, vectors, CALL) => {
  t.section(`${title}: ${vectors.length} cases`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r); r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn}`; continue; }
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2000)}` : "");
};
for (const l of LINES) {
  if (CASES && CASES !== l) continue;
  if (!existsSync(here(`vectors-gifts-${l}.json`))) { console.log(`  (no vectors-gifts-${l}.json)`); continue; }
  await ask(`${l}'s rule cases`, JSON.parse(readFileSync(here(`vectors-gifts-${l}.json`), "utf8")), existsSync(db(`v153.${l}.calls.json`)) ? JSON.parse(readFileSync(db(`v153.${l}.calls.json`), "utf8")) : {});
}
// (the older cases of the gifts, as v152's dry run asked them; OLD_CALLS may say otherwise for a rule that takes more now)
const OLD = {
  gifts_of: "town.gifts_of($1::jsonb)", wearing: "to_jsonb(town.wearing($1::jsonb, $2::text))", charm_by: "to_jsonb(town.charm_by($1::jsonb, $2::text, $3::float8))",
  familiar_wear: "town.familiar_wear($1::jsonb, $2::text)", back_bait: "town.back_bait($1::jsonb, $2::text)",
  gift_works: "to_jsonb(town.gift_works($1::jsonb, $2::text))", used_of: "to_jsonb(town.used_of($1::jsonb, $2::text, $3::bigint))", gift_use: "town.gift_use($1::jsonb, $2::text, $3::bigint)",
  gift_take: "town.gift_take($1::jsonb, $2::jsonb, $3::text, $4::int)", charms_wear: "town.charms_wear($1::jsonb, $2::jsonb)",
  eased: "town.eased($1::jsonb, $2::jsonb, $3::bigint, $4::float8, $5::float8)", gloved: "town.gloved($1::jsonb, $2::jsonb, $3::bigint)",
  strike_window: "to_jsonb(town.strike_window($1::jsonb, $2::bigint))",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  ...(existsSync(db("v153.old.calls.json")) ? JSON.parse(readFileSync(db("v153.old.calls.json"), "utf8")) : {}),
};
if (existsSync(here("vectors-gifts.json")) && (!CASES || CASES === "shared")) await ask("the older cases of the gifts", JSON.parse(readFileSync(here("vectors-gifts.json"), "utf8")).filter((v) => v.fn !== "fam_by"), OLD);

if (process.env.SCENES !== "0") for (const l of ["shared", ...LINES]) {
  if (process.env.ONLY && process.env.ONLY !== l) continue;
  if (!existsSync(db(`v153.${l}.try.mjs`))) continue;
  const own = await fresh();
  // (the scenes' checks are counted with the rest)
  const h = helpers(own);
  h.t = { ...own, check: t.check, section: (title) => t.section(`[${l}] ${title}`) };
  try { await (await import(pathToFileURL(db(`v153.${l}.try.mjs`)).href)).default(h); } catch (e) { t.check(`${l}'s scenes ran to their end`, false, e.message); }
  try { await own.db.close(); } catch { /* closed */ }
}
t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
