// A read-only look at the live catalog after v117 (tired hands, and a cure): the nine rows are what the file writes,
// to the entry; the other nine are as they were. Touches nothing; prints no key, no name and no id.
//   node probe-v117.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (kept beside this script; or in the scratch folder's pgtest)
const here = new URL("./v117.seed.sql", import.meta.url), there = new URL("./pgtest/v117.seed.sql", import.meta.url);
const seed = fs.readFileSync(fs.existsSync(here) ? here : there, "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const NINE = ["cooking", "fishing", "goods", "hints", "items", "makes", "order", "scrolls", "shelf"];

ok("the file's block names nine rows", same(Object.keys(want).sort(), NINE), Object.keys(want).sort());
for (const key of NINE) {
  ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), Object.keys(want[key] ?? {}).filter((k) => !same(live[key]?.data?.[k], want[key][k])).slice(0, 6));
}
const d = (key) => live[key]?.data ?? {};
ok("the scroll is a thing, a good of forty coins (six a round, one each), tells of the cure, and is on the first day's shelf of twenty-two",
  same(d("items").scrollPestCure, { kind: "scroll", tier: 1, stack: 1, pays: 0 }) && same(d("goods").scrollPestCure, { price: 40, stock: 6, each: 1 })
  && d("scrolls").scrollPestCure === "pestCure" && d("shelf").basic?.includes("scrollPestCure") && d("shelf").basic.length === 22,
  { thing: d("items").scrollPestCure, good: d("goods").scrollPestCure, tells: d("scrolls").scrollPestCure, basic: d("shelf").basic?.length });
ok("the cure is of two chilies, two scallions and salt in a pot, the same in both rows",
  same(d("makes").pestCure, { needs: [["chili", 2], ["scallion", 2], ["salt", 1]], in: ["pot"], gives: 2 }) && same(d("cooking").needs?.pestCure, { chili: 2, scallion: 2, salt: 1 }),
  { makes: d("makes").pestCure, tidied: d("cooking").needs?.pestCure });
const has = (list, id) => (list ?? []).some(([x, stage]) => x === id && stage === 0);
ok("it is asked for and hinted at from the first day", has(d("order").asks?.made, "pestCure") && has(d("hints").ids, "pestCure"));
ok("with no stamina 0.3 of the strike's moment is left, of 1.6 s", d("fishing").spent === 0.3 && d("fishing").strike === 1.6, { spent: d("fishing").spent, strike: d("fishing").strike });
// (the nine were written together, in the same second; no other row since the morning's two, crops and farming)
const at = live.items?.updated_at, together = rows.filter((r) => r.updated_at === at).map((r) => r.key).sort();
const later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key).sort();
ok("the nine rows were written in one go, and no other row then or since", same(together, NINE) && same(later, NINE) && rows.length === 18, { together, later, rows: rows.length });

// what the town has made of it so far (counts only)
const things = Object.fromEntries((await get(`/rest/v1/town_things?select=key,doc`)).map((t) => [t.key, t.doc]));
const purses = await get(`/rest/v1/town_purses?select=doc`);
const holds = (id) => purses.filter((p) => (p.doc?.bag ?? []).some((s) => s?.item === id)).length;
console.log(`\n  since: scrolls of the cure sold this round ${things.stall?.sold?.scrollPestCure ?? 0}; members who have read it ${purses.filter((p) => (p.doc?.recipes ?? []).includes("pestCure")).length}, who hold the scroll ${holds("scrollPestCure")}, a cure ${holds("pestCure")}; the cure found by the village: ${(things.found ?? []).includes?.("pestCure") ? "yes" : "not yet"}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
