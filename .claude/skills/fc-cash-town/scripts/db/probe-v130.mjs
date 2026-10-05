// A read-only look at the live database around the water carriers' later rounds: v130 (a hot afternoon, a bucket
// over a bed, the yard's jar, and the cart's three rows of the catalog), v132 (a bucket line), v133 (waters that
// differ). Touches nothing; prints no key, no name and no id (a thing's or a catalog row's name is neither).
//   node probe-v130.mjs before     (before v130 is run: what the three rows it writes over would change)
//   node probe-v130.mjs            (after v130)
//   node probe-v130.mjs 132        (after v132 too)
//   node probe-v130.mjs 132 133    (after v133 too)
// The code's own catalog is read from the tree FC_REPO names (the shared one by default): run it on the tree that is deployed.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { REPO } from "./repo-ts-town.mjs";
const { catalogOf } = await import(pathToFileURL(`${REPO}/lib/town/catalog.ts`).href);
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BEFORE = process.argv.includes("before"), LINE = process.argv.includes("132") || process.argv.includes("133"), WATERS = process.argv.includes("133");
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
/** Every row of a read, a thousand at a time. */
const all = async (path) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: `${from}-${from + 999}` } });
    const j = await r.json();
    if (!Array.isArray(j)) return { error: j?.code ?? j?.message ?? "refused", status: r.status };
    out.push(...j);
    if (j.length < 1000) return out;
  }
};
const anon = async (path, init = {}) => { const r = await fetch(`${URL_}${path}`, { ...init, headers: { apikey: ANON, "Content-Type": "application/json", ...(init.headers ?? {}) } }); return { status: r.status, json: await r.json().catch(() => null) }; };
const refusedCall = (r) => r.status === 401 || r.status === 403 || r.json?.code === "42501";
const missing = (r) => r.status === 404 || r.json?.code === "PGRST202";
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
/** How many rows a read has (nothing of them is printed). */
const count = async (path) => { const rows = await all(path); return Array.isArray(rows) ? rows.length : NaN; };
const NOBODY = "00000000-0000-0000-0000-000000000000";

const code = catalogOf();
const rows = await all(`/rest/v1/town_catalog?select=key,data&order=key`);
if (!Array.isArray(rows)) { console.log("the catalog cannot be read", rows); process.exit(1); }
const cat = Object.fromEntries(rows.map((r) => [r.key, r.data]));
/** The names in a row (of things, of its entries) that are not the same in the two. */
const differ = (a = {}, b = {}) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !same(a[k], b[k])).sort();
const carriers = await all(`/rest/v1/town_carriers?select=buckets,taken`);
const [, second] = code.well.ranks;

if (BEFORE) {
  console.log("\nbefore v130: what it would write over");
  ok("v130 has not run: nobody is refused pouring over a bed, there is no such thing to ask for", missing(await anon(`/rest/v1/rpc/town_ditch`, { method: "POST", body: JSON.stringify({ p_x: 132, p_y: 5 }) })));
  ok("its three rows to seed are not there yet", !("heat" in cat) && !("ditch" in cat) && !("yard" in cat), Object.keys(cat));
  const { waterCart, ...things } = code.items, { waterCart: holds, ...buckets } = code.farming.buckets;
  ok("the things live are the code's but for the cart: writing the row over adds one thing and changes nothing else", same(cat.items, things) && !!waterCart, differ(cat.items, things));
  ok("the farm's numbers live are the code's but for what the cart carries", same(cat.farming, { ...code.farming, buckets }) && holds === 6, differ(cat.farming, { ...code.farming, buckets }));
  ok("the well's numbers live are the code's but for the gifts, which have two", same({ ...cat.well, gifts: code.well.gifts }, code.well) && same(cat.well?.gifts, [[1, "waterYoke"], [3, "waterYokeGreat"]]), cat.well);
  const odd = rows.filter((r) => !["items", "farming", "well"].includes(r.key) && r.key in code && !same(r.data, code[r.key])).map((r) => r.key);
  ok("every other row that is live is what the code gives now", odd.length === 0, odd);
  if (Array.isArray(carriers)) console.log(`    carriers: ${carriers.length}; of the second rank or over: ${carriers.filter((c) => c.buckets >= second).length} (each will find a cart waiting at the well)`);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}

console.log("\nv130: a hot afternoon, a bucket over a bed, the yard's jar; and the cart");
ok("the catalog has the heat's, the pouring's and the jar's numbers, as the code has them", same(cat.heat, code.heat) && same(cat.ditch, code.ditch) && same(cat.yard, code.yard) && same(cat.heat, { from: 12, to: 16, skies: ["clear"], by: 1 }) && same(cat.ditch, { plants: 8, cost: 3 }) && cat.yard?.holds === 10,
  { heat: cat.heat, ditch: cat.ditch, holds: cat.yard?.holds });
ok("the cart is a thing, carries six bucketfuls, and is the well's for the second rank", same(cat.items?.waterCart, { kind: "tool", tier: 1, stack: 1, pays: 0 }) && cat.farming?.buckets?.waterCart === 6 && same(cat.well?.gifts, [[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]]),
  { cart: cat.items?.waterCart, holds: cat.farming?.buckets?.waterCart, gifts: cat.well?.gifts });
ok("the three rows written over are the code's, whole", same(cat.items, code.items) && same(cat.farming, code.farming) && same(cat.well, code.well), { items: differ(cat.items, code.items), farming: differ(cat.farming, code.farming), well: differ(cat.well, code.well) });
{
  const odd = rows.filter((r) => r.key in code && !same(r.data, code[r.key])).map((r) => r.key);
  ok(`every row of the catalog that is live is what the code gives now (${rows.length} rows)`, odd.length === 0, odd);
}
{
  const [water, reach, things] = [await all(`/rest/v1/town_yard_water?select=buckets`), await all(`/rest/v1/town_yard_reach?select=n`), await all(`/rest/v1/town_things?select=doc&key=eq.yard`)];
  ok("the jar's two tables are there, and the site's key reads them", Array.isArray(water) && Array.isArray(reach), [water, reach].map((x) => (Array.isArray(x) ? x.length : x)));
  const jar = Number(Array.isArray(things) ? things[0]?.doc : NaN), followed = Array.isArray(water) ? water.reduce((n, w) => n + w.buckets, 0) : NaN;
  ok(`the yard's jar is there, with no more than it holds, and its water followed lot by lot (${jar} in it, ${followed} followed)`, jar >= 0 && jar <= 10 && Math.abs(followed - jar) <= 2, { jar, followed });
  const [ditch, yard, fresh] = [await count(`/rest/v1/town_deeds?select=id&what=eq.ditch`), await count(`/rest/v1/town_deeds?select=id&what=eq.yard`), await count(`/rest/v1/town_deeds?select=id&what=eq.fresh`)];
  console.log(`    so far: ${ditch} buckets poured over a bed, ${yard} into the yard's jar, ${fresh} pots cooked with its water; ${Array.isArray(reach) ? reach.length : "?"} lines of whose pots had whose water`);
  if (Array.isArray(carriers)) {
    const due = carriers.filter((c) => c.buckets >= second && !(c.taken ?? []).includes(2)).length, took = carriers.filter((c) => (c.taken ?? []).includes(2)).length;
    console.log(`    carriers: ${carriers.length}; a cart waits for ${due}, ${took} have taken theirs`);
  }
}
for (const [fn, body] of [["town_ditch", { p_x: 132, p_y: 5 }], ["town_yard", {}], ["town_yard_pour", { p_x: 0, p_y: 0 }]]) ok(`somebody signed out is refused ${fn}`, refusedCall(await anon(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(body) })));
for (const table of ["town_yard_water", "town_yard_reach"]) {
  const r = await anon(`/rest/v1/${table}?select=*&limit=1`);
  ok(`somebody signed out reads nothing of ${table}`, r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), r.status);
}
for (const fn of ["hot", "ditch", "yard_pour"]) {
  const r = await anon(`/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Profile": "town" }, body: "{}" });
  ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
}

if (LINE) {
  console.log("\nv132: a bucket line");
  ok("the catalog has the line's numbers, as the code has them", same(cat.line, code.line) && same(cat.line, { reach: 40, cost: 1, hands: 8 }), cat.line);
  const water = await all(`/rest/v1/town_line_water?select=member_id`);
  ok("the table of whose hands a bucket's water came by is there, and the site's key reads it", Array.isArray(water), water);
  ok("somebody signed out is refused town_pass", refusedCall(await anon(`/rest/v1/rpc/town_pass`, { method: "POST", body: JSON.stringify({ p_to: NOBODY }) })));
  const r = await anon(`/rest/v1/town_line_water?select=*&limit=1`);
  ok("somebody signed out reads nothing of town_line_water", r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), r.status);
  const [handed, counted] = [await count(`/rest/v1/town_deeds?select=id&what=eq.pass`), await count(`/rest/v1/town_deeds?select=id&what=eq.line`)];
  console.log(`    so far: ${handed} buckets handed on, ${counted} bucketfuls counted for a hand that was not the pourer's; ${Array.isArray(water) ? water.length : "?"} buckets with water whose hands are kept`);
}

if (WATERS) {
  console.log("\nv133: waters that differ");
  ok("the catalog has the waters' numbers, as the code has them", same(cat.waters, code.waters) && same(cat.waters, { dawn: [5, 7], night: [19, 5], lasts: 30, most: 120, adds: { dawn: 1, rain: 0.5, moon: 0 }, guards: { dawn: 0, rain: 0, moon: 12 } }), cat.waters);
  const kinds = await all(`/rest/v1/town_line_water?select=kind`);
  ok("a bucket's water has a place for its nature", Array.isArray(kinds), kinds);
  const things = await all(`/rest/v1/town_things?select=doc&key=eq.well_water`);
  const doc = Array.isArray(things) ? things[0]?.doc : undefined;
  ok("the well's water has its row: nothing, or a nature and when it ends", Array.isArray(things) && things.length === 1 && (doc === null || (["dawn", "rain", "moon"].includes(doc?.kind) && typeof doc?.until === "number")), Array.isArray(things) ? { rows: things.length, kind: doc?.kind } : things);
  if (Array.isArray(kinds)) {
    const by = kinds.reduce((n, k) => ({ ...n, [k.kind ?? "plain"]: (n[k.kind ?? "plain"] ?? 0) + 1 }), {});
    console.log(`    now: the well's water is ${doc?.kind ? `the ${doc.kind}'s, ${Math.max(0, Math.round((doc.until - Date.now()) / 60000))} minutes yet` : "plain"}; buckets with water kept: ${JSON.stringify(by)}`);
  }
  for (const fn of ["water_kind", "well_poured", "well_water_told"]) {
    const r = await anon(`/rest/v1/rpc/${fn}`, { method: "POST", headers: { "Content-Profile": "town" }, body: "{}" });
    ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
