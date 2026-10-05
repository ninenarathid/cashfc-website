// A read-only look at the live database after v127 (the well keeps a book) and, when it has run too, v129 (thanks at
// the picking, a jar at the well). Touches nothing; prints no key, no name and no id.
//   node probe-v127.mjs            (v127 alone)
//   node probe-v127.mjs 129        (v129 as well)
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const ALSO = process.argv.includes("129");
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
/** Every row of a read, a thousand at a time. */
const all = async (path) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: `${from}-${from + 999}` } });
    const j = await r.json();
    if (!Array.isArray(j)) return { error: j, status: r.status };
    out.push(...j);
    if (j.length < 1000) return out;
  }
};
const anon = async (path, init = {}) => { const r = await fetch(`${URL_}${path}`, { ...init, headers: { apikey: ANON, "Content-Type": "application/json", ...(init.headers ?? {}) } }); return { status: r.status, json: await r.json().catch(() => null) }; };
const refusedCall = (r) => r.status === 401 || r.status === 403 || r.json?.code === "42501";
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const rows = await all(`/rest/v1/town_catalog?select=key,data&order=key`);
const cat = Object.fromEntries(rows.map((r) => [r.key, r.data]));
console.log("\nv127: the well keeps a book");
ok("the catalog has the well's numbers", same(cat.well, { ranks: [50, 200, 600], gifts: [[1, "waterYoke"], [3, "waterYokeGreat"]], listed: 40 }), cat.well);
ok("the two yokes are things, and carry two bucketfuls and four", same(cat.items?.waterYoke, { kind: "tool", tier: 1, stack: 1, pays: 0 }) && same(cat.items?.waterYokeGreat, { kind: "tool", tier: 1, stack: 1, pays: 0 })
  && cat.farming?.buckets?.waterYoke === 2 && cat.farming?.buckets?.waterYokeGreat === 4 && cat.farming?.buckets?.bucket === 1, cat.farming?.buckets);
// what the book keeps, against the deeds it was made from: read one after the other, so a deed written between two reads may make them differ by itself
const kept = await all(`/rest/v1/town_well_kept?select=upto`);
ok("the lines written before were read once", Array.isArray(kept) && kept.length === 1 && kept[0].upto >= 0, kept);
const [carriers, pours, water, things] = [await all(`/rest/v1/town_carriers?select=member_id,buckets,taken`), await all(`/rest/v1/town_deeds?select=member_id,n&what=eq.pour`), await all(`/rest/v1/town_well_water?select=buckets`), await all(`/rest/v1/town_things?select=doc&key=eq.well`)];
if (Array.isArray(carriers) && Array.isArray(pours)) {
  const sum = {};
  for (const p of pours) if (p.member_id && Number(p.n) >= 1) sum[p.member_id] = (sum[p.member_id] ?? 0) + Math.floor(Number(p.n));
  const got = Object.fromEntries(carriers.map((c) => [c.member_id, c.buckets]));
  const odd = Object.keys({ ...sum, ...got }).filter((id) => Math.abs((sum[id] ?? 0) - (got[id] ?? 0)) > 4);
  ok(`every carrier's count is the bucketfuls their lines say: ${carriers.length} carriers, ${pours.length} pourings`, carriers.length > 0 && odd.length === 0, { odd: odd.length, carriers: carriers.length });
  console.log(`    ranks: ${carriers.filter((c) => c.buckets >= 600).length} at the third, ${carriers.filter((c) => c.buckets >= 200 && c.buckets < 600).length} at the second, ${carriers.filter((c) => c.buckets >= 50 && c.buckets < 200).length} at the first; gifts taken: ${carriers.reduce((n, c) => n + c.taken.length, 0)}`);
} else ok("the carriers and the deeds can be read with the site's key", false, [carriers, pours].map((x) => (Array.isArray(x) ? x.length : x)));
if (Array.isArray(water) && Array.isArray(things)) {
  const followed = water.reduce((n, w) => n + w.buckets, 0), well = Number(things[0]?.doc);
  ok(`the book's count of the well's water is the well's own, or within a bucket or two of it while members carry (${followed} followed, ${well} in the well)`, Math.abs(followed - well) <= 4, { followed, well });
}
for (const fn of ["town_well", "town_well_ranks", "town_well_take"]) ok(`somebody signed out is refused ${fn}`, refusedCall(await anon(`/rest/v1/rpc/${fn}`, { method: "POST", body: "{}" })));
for (const table of ["town_well_water", "town_well_cans", "town_carriers", "town_well_reach", "town_well_kept"]) {
  const r = await anon(`/rest/v1/${table}?select=*&limit=1`);
  ok(`somebody signed out reads nothing of ${table}`, r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), r.status);
}
{
  const r = await anon(`/rest/v1/rpc/well_book`, { method: "POST", headers: { "Content-Profile": "town" }, body: JSON.stringify({ p_member: "00000000-0000-0000-0000-000000000000", p_now: 0 }) });
  ok("the book's rule is not to be asked from outside", r.status >= 400, r.status);
}

if (ALSO) {
  console.log("\nv129: thanks at the picking, and a jar at the well");
  ok("the catalog has the board's length and the jar's numbers", same(cat.thanks, { listed: 10 }) && same(cat.jar, { bucket: 8, kinds: ["crop", "fish", "dish", "goods", "catch", "staple"] }), { thanks: cat.thanks, jar: cat.jar });
  const [help, thanks, jar, owed, log] = [await all(`/rest/v1/town_plot_help?select=x,y,water,carry`), await all(`/rest/v1/town_thanks?select=id,day`), await all(`/rest/v1/town_jar?select=round,coins,things`), await all(`/rest/v1/town_jar_owed?select=coins`), await all(`/rest/v1/town_jar_log?select=what,coins`)];
  ok("the five tables are there, and the site's key reads them", [help, thanks, jar, owed, log].every(Array.isArray), [help, thanks, jar, owed, log].map((x) => (Array.isArray(x) ? x.length : x)));
  if ([help, thanks, jar, owed, log].every(Array.isArray)) {
    console.log(`    so far: ${help.length} lines of help in ${new Set(help.map((h) => `${h.x},${h.y}`)).size} plots, ${thanks.length} thanks, the jar ${jar[0] ? `${jar[0].coins} coins and ${jar[0].things.length} kinds of thing` : "not looked at yet"}, ${owed.length} with a share waiting`);
    const dropped = log.filter((l) => l.what === "drop").reduce((n, l) => n + l.coins, 0), taken = log.filter((l) => l.what === "take").reduce((n, l) => n + l.coins, 0), waiting = owed.reduce((n, o) => n + o.coins, 0);
    ok(`no coin is made or lost at the jar (${dropped} dropped: ${taken} taken, ${waiting} waiting, ${jar[0]?.coins ?? 0} in it)`, Math.abs(dropped - taken - waiting - (jar[0]?.coins ?? 0)) <= 20, { dropped, taken, waiting });
  }
  for (const [fn, body] of [["town_to_thank", {}], ["town_thank", { p_x: 133, p_y: 5 }], ["town_jar_drop", { p_coins: 1 }], ["town_jar_take", {}]]) ok(`somebody signed out is refused ${fn}`, refusedCall(await anon(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(body) })));
  for (const table of ["town_plot_help", "town_thanks", "town_jar", "town_jar_owed", "town_jar_log"]) {
    const r = await anon(`/rest/v1/${table}?select=*&limit=1`);
    ok(`somebody signed out reads nothing of ${table}`, r.status >= 400 || (Array.isArray(r.json) && r.json.length === 0), r.status);
  }
  const r = await anon(`/rest/v1/town_thanks`, { method: "POST", body: JSON.stringify({ from_id: "00000000-0000-0000-0000-000000000001", to_id: "00000000-0000-0000-0000-000000000002", day: 1 }) });
  ok("…nor writes a thanks", r.status >= 400, r.status);
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
