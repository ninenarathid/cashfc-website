// A read-only look at the live database after v155: the relatives' seven usual amounts are the file's, every other
// number of the market's is as v124 left it, and where the prices stand. Touches nothing; prints no key, name or id.
//   node probe-v155.mjs
// Run it once when the file has run (the numbers), and again after a round has turned (07:00 and 19:00, Bangkok): a
// price moves only then, a quarter of itself down at the most, so what the village sells most is under its usual
// price from the first or the second turn.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500))}`); };
const get = async (path) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: "0-999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };

const knobs = Object.fromEntries(((await get(`/rest/v1/town_knobs?select=key,value&key=like.market*`)).body ?? []).map((k) => [k.key.slice(7), k.value]));
const usual = Object.fromEntries(["crop", "fish", "catch", "dish", "goods", "wild", "bug"].map((k) => [k, knobs[k]]));
const same = (a, b) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
ok("the seven usual amounts are the file's: crop 15, fish 8, catch 5, dish 8, goods 8, wild 8, bug 4", same(usual, { crop: 15, fish: 8, catch: 5, dish: 8, goods: 8, wild: 8, bug: 4 }), usual);
ok("every other number of the market's is as v124 left it", Object.keys(knobs).length === 19
  && same(Object.fromEntries(Object.entries(knobs).filter(([k]) => !(k in usual))), { floor: 40, made: 100, margin: 150, ceil_a: 150, ceil_b: 130, ceil_c: 115, fall: 25, rise: 10, memory: 50, bend: 70, heads: 10, lately: 14 }), knobs);

const market = (await get(`/rest/v1/town_things?select=doc&key=eq.market`)).body?.[0]?.doc;
ok("the market is kept, with a price for every thing that moves", !!market && typeof market.round === "number" && Object.keys(market.at ?? {}).length > 200, market && Object.keys(market.at ?? {}).length);
if (market) {
  const fs_ = Object.values(market.at).map((s) => s.f), under = fs_.filter((f) => f < 100).length, at = fs_.filter((f) => f === 100).length, over = fs_.filter((f) => f > 100).length;
  console.log(`\n  round ${market.round}: ${under} thing(s) under their usual price, ${at} at it, ${over} over (2026-10-07 before the file: 6, 2, 245)`);
  const items = (await get(`/rest/v1/town_catalog?select=data&key=eq.items`)).body?.[0]?.data ?? {};
  const last = (await get(`/rest/v1/town_market_log?select=round,doc&order=round.desc&limit=1`)).body?.[0];
  if (last) {
    const rows = Object.entries(last.doc).map(([id, [f, sold]]) => ({ id, f, sold, worth: sold * (items[id]?.pays ?? 0) })).filter((r) => r.sold > 0).sort((a, b) => b.worth - a.worth).slice(0, 15);
    console.log(`  the things sold most in round ${last.round}: how many, the price then, the price now`);
    for (const r of rows) console.log(`    ${r.id.padEnd(16)} ${String(r.sold).padStart(5)}   ${String(r.f).padStart(3)} → ${String(market.at[r.id]?.f ?? 100).padStart(3)}`);
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
