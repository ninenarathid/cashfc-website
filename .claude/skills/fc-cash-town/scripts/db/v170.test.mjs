/*
 * v170 (more trees on the mountain, grown again in six minutes where it was forty) tried against the
 * stand-in database as it is after the last file that ran, v164 among them: stand-in.mjs's snapshot, loaded in a
 * second, in memory: nothing is written anywhere.
 *
 *   FC_REPO=<the tree whose code is meant> node v170.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *
 * It reads supabase/'s file in the root given, then history once it has run. What is held:
 *   · the file writes the catalog's `trees` row over and nothing else: no function, no table, no other row;
 *   · of that row only `regrow` and the wood's list differ, and of the list the first hundred and twenty trees and
 *     the ancient one are as they were, to the entry: the new trees are numbered on from them;
 *   · the row is then the code's (`catalogOf().trees`), to the entry;
 *   · the rules read it: a new tree is a tree, an old one is the tree it was, a stump is grown again in six minutes;
 *   · run again, the row is the same.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { migration } from "./pglite-harness.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v170_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(170));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400))}`); };

const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
const texts = async () => rows(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\_%') order by 1`);
const tables = async () => rows(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('town', 'public') and c.relkind = 'r' order by 1`);
const catalog = async () => Object.fromEntries((await rows(`select key, data, updated_at::text as at from public.town_catalog order by key`)).map((r) => [r.key, r]));

const before = { texts: await texts(), tables: await tables(), catalog: await catalog() };
const w0 = before.catalog.trees.data.wood;
ok("before it, the mountain has its hundred and twenty trees and the ancient one, grown again in forty minutes (the stand-in has v164)", w0.length === 121 && before.catalog.trees.data.regrow === 40, [w0.length, before.catalog.trees.data.regrow]);
const tree0 = (await one(`select town.tree_of(0) as t`)).t, elder0 = (await one(`select town.tree_of(900) as t`)).t;

await t.sql(FILE);
const after = { texts: await texts(), tables: await tables(), catalog: await catalog() };
ok("it makes and changes no function", same(before.texts, after.texts));
ok("it makes no table", same(before.tables, after.tables));
ok("no other row of the catalog is written", Object.keys(after.catalog).length === Object.keys(before.catalog).length
  && Object.keys(after.catalog).every((k) => k === "trees" || (same(after.catalog[k].data, before.catalog[k]?.data) && after.catalog[k].at === before.catalog[k]?.at)));
const t0 = before.catalog.trees.data, t1 = after.catalog.trees.data, w1 = t1.wood;
const differ = Object.keys({ ...t0, ...t1 }).filter((k) => !same(t0[k], t1[k]));
ok("of the trees' row only `regrow` and the wood's list differ", same(differ.sort(), ["regrow", "wood"]), differ);
ok("a tree is grown again in six minutes", t1.regrow === 6, t1.regrow);
const byId = (w) => new Map(w.map((r) => [r[0], r]));
ok("every tree that was there is there as it was, to the entry: its number, its place, its kind, its girth", [...byId(w0)].every(([id, r]) => same(byId(w1).get(id), r)), [...byId(w0)].filter(([id, r]) => !same(byId(w1).get(id), r)).slice(0, 3));
const fresh = w1.filter((r) => !byId(w0).has(r[0]));
ok("the new ones are numbered on from the last there was, under the ancient tree's number: ninety-two pines, eighty ironwoods, forty moonwoods in all",
  fresh.length === 92 && Math.min(...fresh.map((r) => r[0])) === 120 && Math.max(...fresh.map((r) => r[0])) === 211
  && same([1, 2, 3].map((k) => w1.filter((r) => r[3] === k && r[0] < 900).length), [92, 80, 40]), [fresh.length, [1, 2, 3].map((k) => w1.filter((r) => r[3] === k && r[0] < 900).length)]);
ok("no two trees stand on one tile, nor beside one another", w1.every((a, i) => w1.every((b, j) => i === j || a[0] === 900 || b[0] === 900 || Math.max(Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2])) > 1)));
ok("the row is then the code's, to the entry", same(t1, catalogOf().trees), Object.keys(catalogOf().trees).filter((k) => !same(catalogOf().trees[k], t1[k])));
const said = await one(`select town.tree_of(0) as old, town.tree_of(900) as elder, town.tree_of(211) as fresh, town.tree_of(212) as none, town.tree_kind(town.tree_of(211)) as kind,
  town.tree_until(false, 1000000) - 1000000 as grows, town.tree_grown('{"down": {"5": {"at": 0, "by": "x"}}}'::jsonb, town.tree_of(5), 360000) as back, town.tree_grown('{"down": {"5": {"at": 0, "by": "x"}}}'::jsonb, town.tree_of(5), 359999) as not_yet`);
ok("the rules read it: an old tree is the tree it was, the last new one is a tree of the summit's kind, there is none past it", same(said.old, tree0) && same(said.elder, elder0) && said.fresh !== null && said.none === null && said.kind === "moonwood", said);
ok("…and a stump is a tree again six minutes after it fell, not a moment before", Number(said.grows) === 360000 && said.back === true && said.not_yet === false, said);

await t.sql(FILE);
const again = await catalog();
ok("run again, the row is the same and no function has changed", same(again.trees.data, t1) && same(await texts(), after.texts));

console.log(`
${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
