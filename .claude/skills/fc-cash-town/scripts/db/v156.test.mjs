/*
 * v156 (the fae anklet's gap: forty-five seconds, where it was eight) tried against the stand-in database as it is
 * after the last file that ran (stand-in.mjs's snapshot, loaded in a second, in memory: nothing is written anywhere).
 *
 *   node v156.test.mjs <the worktree's root>          (MIGRATION_FILE=<a file> tries that one; RULES=0 skips the cases)
 *
 * It reads the draft beside this file while supabase/ has no v156 (then supabase/'s, then history once it has run),
 * v153.helpers.calls.json (the helpers' rule cases' calls), and, in ./lines/v156/ beside this file (write them first,
 * in the worktree:   TOWN_VECTORS=<this folder>/lines/v156 npx vitest run lib/town/db-vectors-gifts-helpers.test.ts ):
 *   catalog.json                 the catalog as the worktree's code has it
 *   vectors-gifts-helpers.json   the helpers' rule cases, every one (the run's among them, laid about the new gap)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";

const [root] = process.argv.slice(2);
if (!root) { console.log("node v156.test.mjs <the worktree's root>"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const here = (name) => new URL(`./lines/v156/${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
if (!existsSync(here("catalog.json"))) { console.log("no lines/v156/catalog.json: run the helpers' rule cases with TOWN_VECTORS first (see this file's head)"); process.exit(2); }
const inRepo = existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v156_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : existsSync(db("v156_draft.sql")) ? readFileSync(db("v156_draft.sql"), "utf8") : migration(156));
const CODE = JSON.parse(readFileSync(here("catalog.json"), "utf8"));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);

const t0 = Date.now();
const t = await standIn();
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param));
  return r.error ? r : r.rows[0].r;
};
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const give = async (who, gifts) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
};
const patch = async (who, fields) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(fields)]);
};

t.section("v156, twice over");
const was = (await one(`select data from public.town_catalog where key = 'farming'`)).data;
const rules = async () => (await t.sql(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') order by 1`)).rows;
const rulesWas = await rules();
t.check("before it a run begins anew after eight seconds", was.helping.anklet.gap === 8, was.helping.anklet);
await t.runTwice(FILE, "v156");
const row = (await one(`select data from public.town_catalog where key = 'farming'`)).data;
t.check("the catalog's farming row is the code's", same(row, CODE.farming), row.helping);
t.check("…forty-five seconds, and not one other number of the row differs from what was there",
  row.helping.anklet.gap === 45 && same({ ...row, helping: { ...row.helping, anklet: { ...row.helping.anklet, gap: 8 } } }, was), row.helping.anklet);
const others = (await t.sql(`select key, data from public.town_catalog where key <> 'farming'`)).rows.filter((r) => CODE[r.key] !== undefined && !same(r.data, CODE[r.key])).map((r) => r.key);
t.check("every other row of the catalog is the code's still", others.length === 0, others);
t.check("no function is written, dropped or added", same(await rules(), rulesWas), (await rules()).length);
const NOW = Number((await one(`select town.now_ms() as n`)).n), worn = { gifts: { had: ["charmAnklet"], charms: ["charmAnklet"] } };
const run = async (ago) => (await one(`select town.run_of($1::jsonb, $2::bigint) as n`, [JSON.stringify({ ...worn, chime: { n: 5, at: NOW - ago } }), NOW])).n;
t.check("a run of five: on after nine seconds, after thirty, at forty-five; over a moment later", same([await run(9000), await run(30000), await run(45000), await run(45001)], [5, 5, 5, 0]), [await run(9000), await run(45000), await run(45001)]);

if (process.env.RULES !== "0") {
  const vectors = JSON.parse(readFileSync(here("vectors-gifts-helpers.json"), "utf8"));
  const CALL = JSON.parse(readFileSync(db("v153.helpers.calls.json"), "utf8"));
  t.section(`the helpers' rule cases: ${vectors.length}, each as the code answers it`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r);
    r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn}`; continue; }
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2400)}` : "");
}

// ── through what a member calls: a neighbour's bed watered plant by plant, with a walk to the well between ──
const f = CODE.farming, HOUR = 3_600_000, day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
const bedAt = f.bedsAt[3], keys = Array.from({ length: 4 }, (_, i) => [bedAt[0] + i, bedAt[1] + 1]);
t.section("the run through a member's own waterings (town_tend)");
// (the database's clock, read afresh for each: the rule cases above take a while)
const clock = async () => Number((await one(`select town.now_ms() as n`)).n);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (3, $1, $2, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [U.m2, NOW]);
for (const [x, y] of keys) {
  await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, 3, 'tilled', $3::jsonb, $4) on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`,
    [x, y, JSON.stringify({ by: U.m2, crop: "pumpkin", sown: NOW - 5 * HOUR, boost: 0, watered: 0, fed: 0, guard: NOW + 999 * HOUR, cured: 0, picked: 0, pickedAt: 0 }), NOW]);
}
const can = () => { const b = Array(10).fill(null); b[0] = { item: "can", n: 1, water: 8 }; return b; };
await give(U.m1, { had: ["charmAnklet"], charms: ["charmAnklet"] });
// (seven plants watered, the last of them thirty seconds ago: the walk to the well and back)
await patch(U.m1, { bag: can(), hand: "can", stamina: { day, left: 50 }, chime: { n: 7, at: (await clock()) - 30_000 } });
let did = await call(U.m1, "town_tend", ...keys[0], null);
t.check("thirty seconds after the seventh plant the eighth is of the same run, twice over", did?.ok === true && did.deed === "water" && did.times === 2 && (await purseOf(U.m1)).chime.n === 8, { did: did?.times ?? did, chime: (await purseOf(U.m1))?.chime });
// (nineteen, the last forty seconds ago: the twentieth is three times over)
await patch(U.m1, { chime: { n: 19, at: (await clock()) - 40_000 } });
did = await call(U.m1, "town_tend", ...keys[1], null);
t.check("forty seconds after the nineteenth the twentieth is three times over", did?.ok === true && did.times === 3 && (await purseOf(U.m1)).chime.n === 20, { did: did?.times ?? did, chime: (await purseOf(U.m1))?.chime });
// (and after more than the gap the run begins anew)
await patch(U.m1, { chime: { n: 19, at: (await clock()) - 60_000 } });
did = await call(U.m1, "town_tend", ...keys[2], null);
t.check("a minute after the nineteenth the run begins anew: twice over, the first of a run", did?.ok === true && did.times === 2 && (await purseOf(U.m1)).chime.n === 1, { did: did?.times ?? did, chime: (await purseOf(U.m1))?.chime });
// (somebody without the anklet: no run, and a watering as ever)
await give(U.m1, {});
await patch(U.m1, { chime: null });
did = await call(U.m1, "town_tend", ...keys[3], null);
t.check("without the anklet a neighbour's plant is watered as ever, with no run kept", did?.ok === true && did.deed === "water" && !("times" in did) && !(await purseOf(U.m1)).chime, { did: did?.times ?? did.deed, chime: (await purseOf(U.m1))?.chime });

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
