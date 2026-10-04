// A read-only look at the live database after v122 (twenty fish from other waters): the ten catalog rows are what
// the file writes, to the entry; the other eight are as they were; nobody signed out may drop a line. Then what the
// town has made of it so far, as counts. Touches nothing; prints no key, no name and no id.
//   node probe-v122.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path) => (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: "0-999" } })).json();
const rows = await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`);
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
// what the file writes: its block, as the code gave it (kept beside this script; or in the scratch folder's pgtest)
const here = new URL("./v122.seed.sql", import.meta.url), there = new URL("./pgtest/v122.seed.sql", import.meta.url);
const seed = fs.readFileSync(fs.existsSync(here) ? here : there, "utf8");
const want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const TEN = ["cooking", "dishes", "farming", "fish", "fishing", "hints", "items", "makes", "order", "scrolls"];
const TWENTY = ["loach", "mosquitofish", "mussel", "crayfish", "goldfish", "carp", "piranha", "herring", "archerfish", "pacu", "pike", "nilePerch", "salmon", "wels", "gar", "arapaima", "dozyFish", "popotoFish", "rainbowFish", "moonFish"];

ok("the file's block names ten rows", same(Object.keys(want).sort(), TEN), Object.keys(want).sort());
for (const key of TEN) {
  ok(`the live \`${key}\` row is what the file writes, to the entry`, same(live[key]?.data, want[key]), Object.keys(want[key] ?? {}).filter((k) => !same(live[key]?.data?.[k], want[key][k])).slice(0, 6));
}
const d = (key) => live[key]?.data ?? {};
ok("there are 351 things, 52 fish, 78 things to eat, 75 scrolls, 24 things made",
  Object.keys(d("items")).length === 351 && Object.keys(d("fish")).length === 52 && Object.keys(d("dishes")).length === 78 && Object.keys(d("scrolls")).length === 75 && Object.keys(d("makes")).length === 24,
  { items: Object.keys(d("items")).length, fish: Object.keys(d("fish")).length, dishes: Object.keys(d("dishes")).length, scrolls: Object.keys(d("scrolls")).length, makes: Object.keys(d("makes")).length });
ok("every one of the twenty is a thing and a fish, weighed after the fish there were", TWENTY.every((f) => d("items")[f] && d("fish")[f]) && same(d("fishing").fish?.slice(-20), TWENTY), d("fishing").fish?.slice(-20));
ok("the signs' numbers, a loach among the baits, a glowing float among the floats",
  same(d("fishing").signs, { crowd: 2, lately: 300, after: 30, moon: 1.5, weekend: [0, 6] }) && d("fishing").baits?.includes("loach") && d("fishing").floats?.floatGlow === 1.15, { signs: d("fishing").signs, floats: d("fishing").floats });
ok("three fish are put on a plant, two hold something, two are eaten as they are",
  d("farming").tools?.herring === "feed" && d("farming").tools?.mosquitofish === "guard" && d("farming").tools?.archerfish === "cure"
  && d("cooking").inside?.wels?.chance === 1 && d("cooking").inside?.pacu?.scrolls?.length === 6 && d("items").dozyFish?.kind === "dish" && d("items").rainbowFish?.kind === "dish",
  { tools: [d("farming").tools?.herring, d("farming").tools?.mosquitofish, d("farming").tools?.archerfish], inside: Object.keys(d("cooking").inside ?? {}) });
// (the ten were written together, in the same moment; no other row then or since)
const at = live.fish?.updated_at, together = rows.filter((r) => r.updated_at === at).map((r) => r.key).sort();
const later = rows.filter((r) => Date.parse(r.updated_at) >= Date.parse(at)).map((r) => r.key).sort();
ok("the ten rows were written in one go, and no other row then or since; eighteen rows in all", same(together, TEN) && same(later, TEN) && rows.length === 18, { together, later, rows: rows.length });
// nobody signed out may drop a line (the rule itself is in a schema no browser reaches)
{
  const r = await fetch(`${URL_}/rest/v1/rpc/town_cast`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ p_bait: "worm", p_x: 16, p_y: 38 }) });
  const j = await r.json().catch(() => ({}));
  ok("somebody signed out is refused a line, as ever", r.status === 401 || r.status === 403 || j.code === "42501", { status: r.status, code: j.code });
  const o = await fetch(`${URL_}/rest/v1/rpc/odds`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify({ p_bait: "worm", p_hour: 12, p_rain: false, p_lucky: false, p_shallow: false, p_signs: [] }) });
  ok("the rule of what bites is not to be asked from outside", o.status >= 400, o.status);
}

// what the town has made of it so far (counts only): the lines dropped since, the signs that held, the new fish landed
const casts = await get(`/rest/v1/town_deeds?select=doc&what=eq.cast&at=gte.${encodeURIComponent(at ?? "2100-01-01")}&order=id.desc`);
if (Array.isArray(casts)) {
  const held = {};
  for (const c of casts) for (const s of c.doc?.signs ?? []) held[s] = (held[s] ?? 0) + 1;
  const withSigns = casts.filter((c) => Array.isArray(c.doc?.signs)).length;
  console.log(`\n  since: ${casts.length} lines dropped, ${withSigns} with their signs written; signs that held: ${JSON.stringify(held)}`);
  if (casts.length) ok("every line dropped since has its signs written beside it", withSigns === casts.length, { casts: casts.length, withSigns });
}
const plays = await get(`/rest/v1/town_plays?select=doc&game=eq.fishing&at=gte.${encodeURIComponent(at ?? "2100-01-01")}&order=id.desc`);
if (Array.isArray(plays)) {
  const on = {}, landed = {};
  for (const p of plays) if (TWENTY.includes(p.doc?.what)) { on[p.doc.what] = (on[p.doc.what] ?? 0) + 1; if (p.doc.how === "landed") landed[p.doc.what] = (landed[p.doc.what] ?? 0) + 1; }
  console.log(`  of ${plays.length} lines that ended, the twenty were on ${Object.values(on).reduce((a, b) => a + b, 0)}: ${JSON.stringify(on)}; landed: ${JSON.stringify(landed)}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
