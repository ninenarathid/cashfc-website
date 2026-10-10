import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
await import("./repo-ts-town.mjs");
const { newPurse } = await import("@/lib/town/trade");
const { WOOD, begin, fell, groupOf, newGrove } = await import("@/lib/town/trees");
const { dayOf } = await import("@/lib/town/stamina");
const dir = join(process.env.FC_REPO, ".claude/skills/fc-cash-town/scripts/db");
const source = readFileSync(process.env.V178_SQL ?? join(dir, "v178_draft.sql"), "utf8");
const t = await standIn({ upTo: 176 });
await t.db.exec(migration(177));
const one = async (sql, params = []) => (await t.sql(sql, params)).rows[0];
const catalog = async () => (await t.sql("select key,data from public.town_catalog order by key")).rows;
const definitions = async () => (await t.sql("select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' or (n.nspname='public' and p.proname like 'town_%') order by p.oid")).rows;
const same = (a, b) => {
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  const keys = Object.keys(a).sort();
  return JSON.stringify(keys) === JSON.stringify(Object.keys(b).sort()) && keys.every((k) => same(a[k], b[k]));
};
const old = await catalog(), oldDefs = await definitions();
// A real purse row in this isolated database: catalog updates must preserve saved wood, coins and rights.
await t.sql("select town.keep_purse($1::uuid,$2::jsonb)", [U.m1, JSON.stringify({ ...newPurse(), coins: 123, bag: [{ item: "log", n: 11 }, ...Array(9).fill(null)], powers: { axOne: { k: 1, n: 7 } } })]);
const beforePurses = (await t.sql("select * from public.town_purses order by member_id")).rows;
await t.runTwice(source, "v178");
const after = await catalog();
t.check("server echo count is two", after.find((r) => r.key === "trees").data.echo.trees === 2);
t.check("gift count is two", after.find((r) => r.key === "gifts").data.gifts.charmEchoAxe.by === 2);
for (const row of old) {
  const expected = structuredClone(row.data);
  if (row.key === "trees") expected.echo.trees = 2;
  if (row.key === "gifts") expected.gifts.charmEchoAxe.by = 2;
  t.check(`catalog ${row.key}: only the echo count changes`, same(after.find((r) => r.key === row.key).data, expected));
}
t.check("all existing functions unchanged", same(oldDefs, await definitions()));
t.check("member purses unchanged", same(beforePurses, (await t.sql("select * from public.town_purses order by member_id")).rows));
const NOW = Date.parse("2026-10-10T12:00:00+07:00");
const purse = (echo) => ({ ...newPurse(), hand: "axe", handAt: 0, bag: [{ item: "axe", n: 1 }, ...Array(9).fill(null)], stamina: { day: dayOf(NOW), left: 100 }, ...(echo ? { gifts: { had: ["charmEchoAxe"], charms: ["charmEchoAxe"] } } : {}) });
const grove = newGrove(), plain = purse(false), echo = purse(true);
let checks = 0, diffs = 0, firstDiff = null;
for (const p of [plain, echo]) for (const tree of WOOD.filter((w) => w.tier === 1 && !w.elder)) {
  const x = tree.x - 1, y = tree.y, want = begin(p, grove, tree.id, [x, y], NOW, 1, WOOD, U.m1);
  const got = (await one("select town.fell_begin($1::jsonb,$2::jsonb,$3::integer,$4::integer,$5::integer,$6::bigint,1,$7::text) r", [JSON.stringify(p), JSON.stringify(grove), tree.id, x, y, NOW, U.m1])).r;
  checks++;
  if (!same(got, want)) { diffs++; firstDiff ??= { tree: tree.id, got, want }; }
}
t.check(`all ${checks} felling starts match the page's two-tree rules`, diffs === 0, firstDiff);
const first = WOOD.find((w) => w.tier === 1 && !w.elder && groupOf(echo, grove, w, echo.bag[0], NOW).length === 2);
const started = (await one("select town.fell_begin($1::jsonb,$2::jsonb,$3::integer,$4::integer,$5::integer,$6::bigint,1,$7::text) r", [JSON.stringify(echo), JSON.stringify(grove), first.id, first.x - 1, first.y, NOW, U.m1])).r;
t.check("new echo board holds exactly two trees", started.ok && started.trees.length === 2, started);
const went = { tree: first.id, through: true, misses: 0, secs: 30 };
const luck = Array.from({ length: 2 }, () => ({ dark: 1, scent: 1, which: 1, chain: 1, keep: 1, kind: 1 }));
const finish = async (w) => (await one("select town.fell($1::jsonb,$2::jsonb,$3::text,$4::jsonb,$5::integer,$6::integer,$7::bigint,$8::jsonb) r", [JSON.stringify(echo), JSON.stringify(grove), U.m1, JSON.stringify(w), first.x - 1, first.y, NOW, JSON.stringify(luck)])).r;
const got = await finish(went), want = fell(echo, grove, U.m1, went, [first.x - 1, first.y], NOW, luck);
t.check("completed echo game fells two trees and pays their wood", got.ok && got.felled.length === 2 && same(got, want), got);
t.check("both wood drops still work", got.got.some(([id, n]) => id === "log" && n === 4) && got.got.some(([id, n]) => id === "timber" && n > 0), got.got);
const lost = await finish({ ...went, through: false });
t.check("a lost game leaves both trees and the purse unchanged", lost.ok && lost.felled.length === 0 && same(lost.purse, echo), lost);
const open = (await t.sql("select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute'))")).rows;
t.check("private functions remain closed", open.length === 0, open);
for (const who of ["anon", U.m1, U.unver, U.nochar]) {
  const r = await t.as(who, "update public.town_catalog set data='{}'::jsonb where key='trees'");
  t.check(`${who === "anon" ? "anon" : "member role"}: cannot change the tree cap`, !!r.error || r.rows?.length === 0, r);
}
t.check("refused writes leave the cap intact", (await one("select data->'echo'->'trees' cap from public.town_catalog where key='trees'")).cap === 2);
t.done();
await t.db.close();
