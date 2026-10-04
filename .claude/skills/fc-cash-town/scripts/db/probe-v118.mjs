// A look at the live database after v118 (the same sky for everybody). It reads; and it asks the site's own route
// for the weather once, as any page in town does, which is what makes the site write the quarter hours that are due.
// It writes nothing itself and tries no write. Prints no key, no name and no id.
//   node probe-v118.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = "https://cashfc-website.vercel.app", SLOT = 900000;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const as = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: as(key) }); return { status: r.status, json: await r.json().catch(() => null) }; };
const rpc = async (fn, args, key = ANON) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { ...as(key), "content-type": "application/json" }, body: JSON.stringify(args ?? {}) }); return { status: r.status, json: await r.json().catch(() => null) }; };
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

console.log("the catalog");
const rows = (await get(`/rest/v1/town_catalog?select=key,data,updated_at&order=key`)).json;
const live = Object.fromEntries(rows.map((r) => [r.key, r]));
const here = new URL("./v118.seed.sql", import.meta.url), there = new URL("./pgtest/v118.seed.sql", import.meta.url);
const seed = fs.readFileSync(fs.existsSync(here) ? here : there, "utf8"), want = {};
for (const m of seed.matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
ok("the file's block names one row, items", same(Object.keys(want), ["items"]), Object.keys(want));
ok("the live `items` row is what the file writes, to the entry", same(live.items?.data, want.items), Object.keys(want.items).filter((k) => !same(live.items?.data?.[k], want.items[k])).slice(0, 6));
ok("an old boot fetches three and an old chest twenty; three hundred and thirteen things", live.items?.data?.boot?.pays === 3 && live.items?.data?.chest?.pays === 20 && Object.keys(live.items?.data ?? {}).length === 313);
const newest = rows.reduce((a, r) => (Date.parse(r.updated_at) > Date.parse(a.updated_at) ? r : a), rows[0]);
ok("it is the row written last, and the only one written then", newest.key === "items" && rows.filter((r) => r.updated_at === newest.updated_at).length === 1 && rows.length === 18, { newest: newest.key, at: newest.updated_at });

console.log("the weather");
const before = await get(`/rest/v1/town_weather?select=slot&order=slot.desc&limit=1`);
ok("the table is there", before.status === 200 && Array.isArray(before.json), before);
const anonRead = await get(`/rest/v1/town_weather?select=slot,sky&order=slot.desc&limit=3`, ANON);
ok("somebody signed out reads it", anonRead.status === 200 && Array.isArray(anonRead.json), anonRead);
// the site is asked, as a page in town asks it (twice, a little apart: the first may be answered from the edge's cache)
let answer = null;
for (let i = 0; i < 2; i++) { answer = await fetch(`${SITE}/api/town/weather?probe=${Date.now()}`).then((r) => r.json()).catch(() => null); await sleep(2500); }
const cur = Math.floor(Date.now() / SLOT);
const kept = (await get(`/rest/v1/town_weather?select=slot,sky,wind,gust,rain,written&order=slot`)).json ?? [];
const slots = kept.map((r) => r.slot);
ok("asked for the weather, the site has written the quarter hours that are due: this one and at least two to come", slots.includes(cur) && Math.max(...slots, -Infinity) >= cur + 2, { cur, kept: slots.slice(-8) });
ok("…each a sky of the six and numbers in measure", kept.every((r) => ["clear", "cloudy", "fog", "drizzle", "rain", "storm"].includes(r.sky) && r.wind >= 0 && r.wind <= 200 && r.gust >= 0 && r.rain >= 0), kept.slice(-3));
const now = kept.find((r) => r.slot === cur);
ok("…and answers this quarter hour's weather, in the shape a page built before reads", !!answer && !!now && answer.sky === now.sky && Math.abs(answer.wind - now.wind) < 1e-3 && Math.abs(answer.rain - now.rain) < 1e-3, { answer, now });

console.log("what a page is told");
const sky = await rpc("town_sky", { p_since: 0 });
ok("somebody signed out is told the weather: the database's clock, the quarter hours, the wet ones", sky.status === 200 && typeof sky.json?.now === "number" && Math.abs(sky.json.now - Date.now()) < 5000
  && Array.isArray(sky.json.slots) && sky.json.slots.some((s) => s[0] === cur) && Array.isArray(sky.json.wet), { status: sky.status, now: sky.json?.now, slots: sky.json?.slots?.length });
ok("…the same quarter hours as are kept, from two hours back", same(sky.json?.slots ?? [], kept.filter((r) => r.slot >= cur - 8).map((r) => [r.slot, r.sky, r.wind, r.gust, r.rain])), sky.json?.slots?.slice(-3));
ok("…the wet ones those that are rain, drizzle or storm", same(sky.json?.wet ?? [], kept.filter((r) => ["drizzle", "rain", "storm"].includes(r.sky)).map((r) => r.slot)), sky.json?.wet);
for (const fn of ["wet_ms", "raining", "grown"]) {
  const r = await rpc(fn, {});
  ok(`the rule town.${fn} is not a browser's to call`, r.status === 404, r.status);
}
console.log(`\n  now: ${now ? `${now.sky}, rain ${now.rain} mm, wind ${now.wind} km/h` : "no weather kept for this quarter hour"}; quarter hours kept ${kept.length}, wet ${kept.filter((r) => ["drizzle", "rain", "storm"].includes(r.sky)).length}`);
console.log(`\n${pass} passed, ${fail} failed`);
process.exitCode = fail ? 1 : 0;
