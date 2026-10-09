/*
 * v169 (sixty picks and sixty axes a round on the uncle's shelf, where there were six of each) tried against the
 * stand-in database as it is after the last file that ran, v164 among them: stand-in.mjs's snapshot, loaded in a
 * second, in memory: nothing is written anywhere.
 *
 *   FC_REPO=<the tree whose code is meant> node v169.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *
 * It reads supabase/'s file in the root given, then history once it has run. What is held:
 *   · the file changes two numbers of the catalog's `goods` row and nothing else: no function, no table, no other
 *     row, no other entry of that row;
 *   · the row is then the code's (`catalogOf().goods`), to the entry;
 *   · run again, it changes nothing (not even when the row was written);
 *   · no UPDATE or DELETE without a WHERE in any function (it makes none).
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { migration } from "./pglite-harness.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v169_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(169));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 400))}`); };

const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const texts = async () => rows(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') order by 1`);
const tables = async () => rows(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('town', 'public') and c.relkind = 'r' order by 1`);
const catalog = async () => Object.fromEntries((await rows(`select key, data, updated_at::text as at from public.town_catalog order by key`)).map((r) => [r.key, r]));

const before = { texts: await texts(), tables: await tables(), catalog: await catalog() };
ok("before it, the shelf has six picks and six axes a round (the stand-in has v164)", before.catalog.goods?.data.pick?.stock === 6 && before.catalog.goods?.data.axe?.stock === 6, before.catalog.goods?.data.pick);

await t.sql(FILE);
const after = { texts: await texts(), tables: await tables(), catalog: await catalog() };
ok("it makes and changes no function", same(before.texts, after.texts));
ok("it makes no table", same(before.tables, after.tables));
ok("no other row of the catalog is written", Object.keys(after.catalog).length === Object.keys(before.catalog).length
  && Object.keys(after.catalog).every((k) => k === "goods" || (same(after.catalog[k].data, before.catalog[k]?.data) && after.catalog[k].at === before.catalog[k]?.at)));
const g0 = before.catalog.goods.data, g1 = after.catalog.goods.data;
const differ = Object.keys({ ...g0, ...g1 }).filter((k) => !same(g0[k], g1[k]));
ok("of the shelf's row only the pick and the axe differ, and of each only its stock", same(differ.sort(), ["axe", "pick"])
  && same(g1.pick, { ...g0.pick, stock: 60 }) && same(g1.axe, { ...g0.axe, stock: 60 }), { differ, pick: g1.pick, axe: g1.axe });
ok("the row is then the code's, to the entry", same(g1, catalogOf().goods), Object.keys(catalogOf().goods).filter((k) => !same(catalogOf().goods[k], g1[k])));

await t.sql(FILE);
const again = await catalog();
ok("run again, it changes nothing: the row is as it was written the first time", same(again.goods.data, g1) && again.goods.at === after.catalog.goods.at && same(await texts(), after.texts));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
