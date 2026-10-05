// A read-only look at the live database after v135 (the uncle's hints come by chance). The file writes no table, no
// row and no knob, and its rules are in a schema nothing outside may ask, so that it has run cannot be read: the owner
// says so. What can be read is what follows from it: nobody signed out is sold a hint, the rules are not to be asked
// from outside, every hint bought since is one he lists at its tier's price and is kept once, and the buyers no longer
// hear the same hints in the same order (seen as soon as a few have bought: before v135 a purse's hints were always in
// the order of his list).
// Touches nothing; prints no key, no name, no id (buyers are numbered).
//   node probe-v135.mjs [since]        since: a moment, as 2026-10-05T13:40:00+07:00 (when it ran); left out, the last day
import fs from "node:fs";
const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const since = new Date(process.argv[2] ?? Date.now() - 24 * 3600 * 1000);
if (Number.isNaN(since.getTime())) { console.log("since: a moment, as 2026-10-05T13:40:00+07:00"); process.exit(2); }
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-4999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };

// who may
{
  const r = await fetch(`${URL_}/rest/v1/rpc/town_hint`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: "{}" });
  const j = await r.json().catch(() => ({}));
  ok("somebody signed out is refused town_hint", r.status === 401 || r.status === 403 || j.code === "42501", { status: r.status, code: j.code });
  for (const [fn, args] of [["next_hint", { p_purse: {}, p_found: [], p_stage: 99, p_r: 0.5 }], ["buy_hint", { p_purse: { coins: 100000 }, p_found: [], p_stage: 99, p_r: 0.5 }]]) {
    const q = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify(args) });
    ok(`the rule town.${fn} is not to be asked from outside`, q.status >= 400, q.status);
  }
}

// what he lists, and how far his shelf is open
const cat = Object.fromEntries(((await get(`/rest/v1/town_catalog?select=key,data&key=in.(hints,items)`)).body ?? []).map((r) => [r.key, r.data]));
const things = Object.fromEntries(((await get(`/rest/v1/town_things?select=key,doc&key=in.(village,found)`)).body ?? []).map((r) => [r.key, r.doc]));
const stage = Number(things.village?.unlocked ?? 0), order = (cat.hints?.ids ?? []).map(([id]) => id);
const tierOf = (id) => cat.items?.[id]?.tier, priceOf = (id) => cat.hints?.price?.[tierOf(id)];
ok("his list of hints and what each costs are there to read", order.length > 100 && [1, 2, 3].every((t) => Number(cat.hints.price[t]) > 0), { n: order.length, price: cat.hints?.price });
const open = (cat.hints?.ids ?? []).filter(([, at]) => at >= 0 && at <= stage).map(([id]) => id);
console.log(`  (his shelf has had ${stage} order(s) filled: he has ${[1, 2, 3].map((t) => open.filter((id) => tierOf(id) === t).length).join(" / ")} hints by tier for somebody who knows nothing)`);

// the hints bought since
const deeds = (await get(`/rest/v1/town_deeds?select=member_id,thing,coins,at&what=eq.hint&at=gte.${encodeURIComponent(since.toISOString())}&order=id.asc`)).body ?? [];
const by = new Map();
for (const d of deeds) by.set(d.member_id, [...(by.get(d.member_id) ?? []), d]);
console.log(`\n  since ${since.toISOString()}: ${deeds.length} hint(s) bought by ${by.size} member(s)`);
if (!deeds.length) console.log("  none yet: nothing more to look at. Run it again when somebody has bought one.");
else {
  ok("every one of them is a hint he lists, at its tier's price", deeds.every((d) => order.includes(d.thing) && Number(d.coins) === -priceOf(d.thing)), deeds.filter((d) => !order.includes(d.thing) || Number(d.coins) !== -priceOf(d.thing)).slice(0, 5).map((d) => [d.thing, d.coins]));
  const purses = (await get(`/rest/v1/town_purses?select=member_id,doc->hints`)).body ?? [];
  const hintsOf = new Map(purses.map((p) => [p.member_id, p.hints ?? []]));
  ok("and is in its buyer's purse once", [...by].every(([who, list]) => list.every((d) => (hintsOf.get(who) ?? []).filter((id) => id === d.thing).length === 1)));
  let n = 0, outOfOrder = 0, long = 0;
  const firsts = new Set();
  for (const [, list] of by) {
    const ids = list.map((d) => d.thing), listed = ids.every((id, i) => i === 0 || order.indexOf(id) > order.indexOf(ids[i - 1]));
    if (ids.length >= 2) { long++; if (!listed) outOfOrder++; }
    firsts.add(ids[0]);
    console.log(`    buyer ${++n}: ${ids.length} — ${ids.join(", ")}${ids.length >= 2 ? (listed ? "   (in the order of his list)" : "   (not in the order of his list)") : ""}`);
  }
  console.log(`  ${outOfOrder} of ${long} who bought two or more did not hear them in the order of his list; ${firsts.size} different first hint(s) among ${by.size} buyer(s)`);
  if (long >= 2 || outOfOrder) ok("somebody's hints are not in the order of his list: they come by chance", outOfOrder > 0, { long, outOfOrder });
  else console.log("  (too few have bought two or more to say by this alone whether they come by chance)");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
