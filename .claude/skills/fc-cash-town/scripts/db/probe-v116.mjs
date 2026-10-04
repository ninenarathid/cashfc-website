// A read-only look at the live catalog after v116 (a bigger harvest, a lighter hoe): the two rows are what the file
// writes, to the entry; every other row is as it was. Touches nothing; prints no key.
//   node probe-v116.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const rows = await (await fetch(`${URL_}/rest/v1/town_catalog?select=key,data,updated_at&order=key`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })).json();
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (kept beside this script; or the file itself while it is in supabase/)
const here = new URL("./v116.seed.sql", import.meta.url), there = new URL("./pgtest/v116.seed.sql", import.meta.url);
const seed = fs.readFileSync(fs.existsSync(here) ? here : there, "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
ok("the file's block names two rows: crops and farming", same(Object.keys(want).sort(), ["crops", "farming"]), Object.keys(want));
ok("the live `crops` row is what the file writes, to the entry", same(live.crops?.data, want.crops), Object.keys(want.crops).filter((k) => !same(live.crops?.data?.[k], want.crops[k])));
ok("the live `farming` row is what the file writes, to the entry", same(live.farming?.data, want.farming), Object.keys(want.farming).filter((k) => !same(live.farming?.data?.[k], want.farming[k])));
const y = live.crops?.data ?? {};
ok("morning glory four to six, a cabbage two, chili six to ten, a pumpkin two; twenty-six crops", same([y.kangkong?.yield, y.cabbage?.yield, y.chili?.yield, y.pumpkin?.yield, Object.keys(y).length], [[4, 6], [2, 2], [6, 10], [2, 2], 26]), [y.kangkong?.yield, y.cabbage?.yield, y.chili?.yield, y.pumpkin?.yield, Object.keys(y).length]);
ok("clearing and tilling cost two each, the other deeds what they cost", same(live.farming?.data?.costs, { clear: 2, till: 2, pull: 2, sow: 1, water: 1, feed: 1, cure: 1, pick: 2 }), live.farming?.data?.costs);
const recent = rows.filter((r) => Date.now() - Date.parse(r.updated_at) < 6 * 3_600_000).map((r) => r.key);
ok("only those two rows were written lately; the others are as they were", same(recent, ["crops", "farming"]) && rows.length === 18, { recent, rows: rows.length });
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
