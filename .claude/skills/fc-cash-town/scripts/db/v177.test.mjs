import { readFileSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { changed } from "./build-v159.mjs";
await import("./repo-ts-town.mjs");
const tools = await import("@/lib/town/tools"), fx = await import("@/lib/town/forged"), powers = await import("@/lib/town/powers");
const trade = await import("@/lib/town/trade");
const { catalogOf } = await import("@/lib/town/catalog");
const dir = join(process.env.FC_REPO, ".claude/skills/fc-cash-town/scripts/db");
const source = readFileSync(process.env.V177_SQL ?? join(dir, "v177_draft.sql"), "utf8");
const t = await standIn({ upTo: 176 }), NOW = Date.parse("2026-10-10T12:00:00+07:00");
const one = async (q, p = []) => (await t.sql(q, p)).rows[0];
const defs = async () => (await t.sql("select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' or (n.nspname='public' and p.proname like 'town_%')")).rows;
const same = (a, b) => {
  if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) <= 1e-8;
  if (a === null || b === null || typeof a !== "object" || typeof b !== "object") return a === b;
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return JSON.stringify(ka) === JSON.stringify(kb) && ka.every((k) => same(a[k], b[k]));
};
const old = await defs(), oldCat = (await t.sql("select key,data from public.town_catalog")).rows;
if (process.env.V177_SQL) await t.db.exec(source);
else await t.runTwice(source, "v177");
const now = await defs(), edits = JSON.parse(readFileSync(join(dir, "v177.lines.json"), "utf8"));
const owned = new Set(edits.map((e) => e.sig));
for (const e of edits) t.check(`${e.sig}: exact marked changes`, now.find((d) => d.sig === e.sig)?.def === changed(old.find((d) => d.sig === e.sig).def, e.sig, e.lines));
t.check("unrelated definitions unchanged", old.every((d) => owned.has(d.sig) || now.find((x) => x.sig === d.sig)?.def === d.def));
const code = catalogOf();
for (const row of oldCat) {
  const expected = structuredClone(row.data);
  if (row.key === "forge") expected.options.of = code.forge.options.of;
  if (row.key === "trees") expected.axe.opts = code.trees.axe.opts;
  if (row.key === "mining") expected.pick.opts = code.mining.pick.opts;
  t.check(`catalog ${row.key}: only owned fields`, same((await one("select data from public.town_catalog where key=$1", [row.key])).data, expected));
}
t.check("no bare table writes", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
const open = (await t.sql("select p.oid::regprocedure::text sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='town' and (has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('anon',p.oid,'execute'))")).rows;
t.check("all private functions closed", open.length === 0, open);
const js = (v) => v === null ? null : typeof v === "object" ? JSON.stringify(v) : v;
const tallies = new Map();
const compare = async (name, expression, args, want) => {
  const r = tallies.get(name) ?? { n: 0, bad: 0, first: null }; tallies.set(name, r); r.n++;
  let got; try { got = (await one(`select ${expression} r`, args.map(js))).r; } catch (e) { got = { error: e.message }; }
  if (!same(got, want)) { r.bad++; r.first ??= { args, want, got }; }
};
const held = (stack) => ({ ...trade.newPurse(), hand: stack.item, handAt: 0, bag: [stack, ...Array(19).fill(null)] });
for (const id of tools.OPTION_IDS) {
  const o = tools.OPTIONS[id], kind = o.tools[0], a = tools.poolOf(kind, 1).find((x) => x !== id);
  for (const plus of [0, 3, 6, 7, 10]) for (const strong of [false, true]) {
    const opts = o.pool === 2 ? [a, "", id] : strong ? [a, id] : [id];
    const stack = { item: kind, n: 1, plus, opts }, p = held(stack);
    await compare("tool_mods", "town.tool_mods($1::jsonb)", [stack], ((({ hue, ...m }) => m)(tools.modsOf(stack))));
    const reader = ["pick", "axe"].includes(kind) ? null : kind === "bugNet" ? "net" : ["pot", "pan", "grill"].includes(kind) ? "cook" : kind;
    if (reader) await compare(`${reader}_fx`, `town.${reader}_fx($1::jsonb)`, [stack], fx[`${reader}Fx`](stack));
    for (const k of new Set([...Object.keys(o.n ?? {}), ...Object.keys(tools.SIX[id]?.n ?? {})])) await compare("opt_n", "town.opt_n($1::text,$2::text,$3::jsonb)", [id, k, stack], tools.optN(id, k, stack));
    await compare("power_rule", "town.power_rule($1::text,$2::jsonb)", [id, stack], powers.powerRule(id, stack));
    await compare("use_power", "town.use_power($1::jsonb,$2::jsonb,$3::text,$4::bigint)", [p, stack, id, NOW], powers.usePower(p, stack, id, NOW));
    const rule = powers.powerRule(id, stack);
    if (rule) {
      const used = { ...p, powers: { [id]: { k: (await import("@/lib/town/gifts")).stretchOf(rule, NOW), n: rule.n } } };
      await compare("exhausted", "town.use_power($1::jsonb,$2::jsonb,$3::text,$4::bigint)", [used, stack, id, NOW], powers.usePower(used, stack, id, NOW));
      await compare("next_day", "town.use_power($1::jsonb,$2::jsonb,$3::text,$4::bigint)", [used, stack, id, NOW + 86400000], powers.usePower(used, stack, id, NOW + 86400000));
    }
  }
}
for (const [name, r] of tallies) t.check(`${name}: ${r.n} code/SQL cases`, r.bad === 0, r.bad ? `${r.bad} failures: ${JSON.stringify(r.first).slice(0,1500)}` : "");
await t.db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$ select ${NOW}::bigint $$`);
await t.sql("update public.town_knobs set value=1 where key in ('game_open','smith_open','far_open')");
const seed = async (id, p = trade.newPurse()) => t.sql("insert into public.town_purses(member_id,coins,doc) values($1,1000,$2::jsonb) on conflict(member_id) do update set doc=excluded.doc,coins=excluded.coins", [id, JSON.stringify(p)]);
const ask = async (id, q, p = []) => { const a = await t.as(id, q, p); return a.error ? a : a.rows[0].r; };
const purse = async (id) => (await one("select town.purse_of($1::uuid,false) p", [id])).p;
const netTool = { item: "bugNet", n: 1, plus: 10, opts: ["ntLong", "ntMesh", "ntWide"] };
await seed(U.m1, held(netTool)); await seed(U.m2, held(netTool));
const otherBefore = await purse(U.m2);
const first = await ask(U.m1, "select public.town_tool_power('ntWide') r");
let saved = await purse(U.m1);
t.check("member power grants five catches for ten seconds", first.ok === true && saved.netSweep?.left === 5 && saved.netSweep?.until === NOW + 10000, first);
t.check("power changes only caller's purse", same(await purse(U.m2), otherBefore));
const extra = async (p, at = NOW) => (await one("select town.net_more_far($1::jsonb,$2::bigint) n", [JSON.stringify(p), at])).n;
t.check("sweep reaches only while its server grant is live", (await extra(saved)) === 6 && (await extra(saved, NOW + 10000)) === 1);
const plainHand = { ...saved, bag: [{ item: "bugNet", n: 1, plus: 10, opts: ["ntLong"] }, ...Array(19).fill(null)] };
t.check("swapping net cannot carry sweep's extra reach", (await extra(plainHand)) === 1);
const bug = Object.keys(code.insects.bugs)[0];
let swept = saved;
for (let i = 0; i < 5; i++) swept = (await one("select town.net_more($1::jsonb,$2::jsonb,$3::text,1,0,1,$4::bigint) r", [JSON.stringify(swept), JSON.stringify(netTool), bug, NOW])).r.purse;
t.check("five successful catches exhaust the server grant", swept.netSweep?.left === 0 && (await extra(swept)) === 1);
let exhausted;
for (let i = 1; i < 20; i++) exhausted = await ask(U.m1, "select public.town_tool_power('ntWide') r");
const quotaBefore = await purse(U.m1);
const refused = await ask(U.m1, "select public.town_tool_power('ntWide') r");
t.check("repeated public requests share one daily quota", exhausted.ok === true && quotaBefore.powers.ntWide.n === 20 && refused.ok === false && refused.why === "spent", refused);
t.check("refused power spends nothing", same(await purse(U.m1), quotaBefore));
await t.db.exec(`create or replace function town.now_ms() returns bigint language sql stable as $$ select ${NOW + 86400000}::bigint $$`);
const renewed = await ask(U.m1, "select public.town_tool_power('ntWide') r");
t.check("daily quota renews on a later game day", renewed.ok === true && (await purse(U.m1)).powers.ntWide.n === 1);
for (const id of ["anon", U.unver, U.nochar]) {
  const r = await ask(id, "select public.town_tool_power('ntWide') r");
  t.check(`${id}: cannot activate a power`, !!r.error, r);
}
const forgedWrite = await t.as(U.m1, "update public.town_purses set doc=jsonb_set(doc,'{netSweep}', '{\"until\":9999999999999,\"left\":500}'::jsonb) where member_id=$1", [U.m2]);
t.check("member cannot mint a grant in another purse", !!forgedWrite.error || forgedWrite.rows.length === 0);
t.check("other purse survives direct write attempt", same(await purse(U.m2), otherBefore));
// A real function edit must be refused before any catalog write.
const def = (await one("select pg_get_functiondef('town.can_fx(jsonb)'::regprocedure) d")).d;
await t.db.exec(def.replace("AS $function$", "AS $function$\n-- an unexpected live edit"));
try { await t.db.exec(source); t.check("unexpected definition is rejected", false); } catch (e) { t.check("unexpected definition is rejected", /Definition changed/.test(e.message)); await t.db.exec("rollback"); }
t.done(); await t.db.close();
