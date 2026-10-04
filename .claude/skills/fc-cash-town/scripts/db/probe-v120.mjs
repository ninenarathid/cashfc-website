// A read-only look at the live catalog after v120 (a quicker bite, and time to strike): the three rows are what the
// file writes, to the entry; the other fifteen are as they were. Touches nothing; prints no key, no name and no id.
//   node probe-v120.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: "0-999" } })).json();
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (kept beside this script; or in the scratch folder's pgtest)
const here = new URL("./v120.seed.sql", import.meta.url), there = new URL("./pgtest/v120.seed.sql", import.meta.url);
const seed = fs.readFileSync(fs.existsSync(here) ? here : there, "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const THREE = ["fish", "fishing", "flotsam"];

ok("the file's block names three rows", same(Object.keys(want).sort(), THREE), Object.keys(want).sort());
for (const key of THREE) {
  ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), Object.keys(want[key] ?? {}).filter((k) => !same(live[key]?.data?.[k], want[key][k])).slice(0, 6));
}
const d = (key) => live[key]?.data ?? {};
ok("a minnow bites in 3 to 15 s, a catfish in 8 to 35, a koi in 30 to 120; hyacinth drifts in in 4 to 23",
  same(d("fish").minnow?.wait, [3, 15]) && same(d("fish").catfish?.wait, [8, 35]) && same(d("fish").koi?.wait, [30, 120]) && same(d("flotsam").hyacinth?.wait, [4, 23]),
  { minnow: d("fish").minnow?.wait, catfish: d("fish").catfish?.wait, koi: d("fish").koi?.wait, hyacinth: d("flotsam").hyacinth?.wait });
const waits = [...Object.values(d("fish")), ...Object.values(d("flotsam"))].map((f) => f.wait);
ok("there are 38 waits: none begins under 3 s, none runs past two minutes", waits.length === 38 && waits.every((w) => Array.isArray(w) && w[0] >= 3 && w[1] <= 120 && w[0] < w[1]), { n: waits.length, least: Math.min(...waits.map((w) => w[0])), most: Math.max(...waits.map((w) => w[1])) });
ok("with no stamina 0.6 of the strike's moment is left, of 1.6 s, and the two clocks have their slack", d("fishing").spent === 0.6 && d("fishing").strike === 1.6 && same(d("fishing").slack, { early: 300, late: 1500 }), { spent: d("fishing").spent, strike: d("fishing").strike, slack: d("fishing").slack });
// (the three were written together, in the same moment; no other row then or since)
const at = live.fishing?.updated_at, together = rows.filter((r) => r.updated_at === at).map((r) => r.key).sort();
const later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key).sort();
ok("the three rows were written in one go, and no other row then or since", same(together, THREE) && same(later, THREE) && rows.length === 18, { together, later, rows: rows.length });
ok("they were written after the file was pushed (2026-10-04 17:06 UTC)", Date.parse(at) > Date.parse("2026-10-04T17:06:00Z"), at);

// what the town has made of it so far (counts only): the bites since, and how long each was waited for
const since = await get(`/rest/v1/town_plays?select=spent,doc&game=eq.fishing&at=gte.${encodeURIComponent(at ?? "2100-01-01")}&order=id`);
if (Array.isArray(since)) {
  const w = since.map((r) => Number(r.doc?.wait)).filter((x) => x > 0), tired = since.filter((r) => r.spent);
  console.log(`\n  since: ${since.length} bites; waited ${w.length ? (w.reduce((a, b) => a + b, 0) / w.length).toFixed(1) : "-"} s on average, ${w.length ? Math.max(...w) : "-"} at the most; with no stamina ${tired.length}, landed ${tired.filter((r) => r.doc?.how === "landed").length}`);
  if (w.length) ok("no bite since has been waited for longer than two minutes", Math.max(...w) <= 120, Math.max(...w));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
