// A read-only look at the live database for v140 (a cover is not a cure). The file writes no row, so that it has run
// cannot be read from outside: that is the owner's word. This says who may, and what the members have put on plants
// by the hour, before the moment it ran and since. Touches nothing; prints no key, no name and no id.
//   node probe-v140.mjs ["<the moment it ran, e.g. 2026-10-05T18:10:00+07:00>"]
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const RAN = process.argv[2] ? Date.parse(process.argv[2]) : null;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path) => {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const rows = await (await fetch(`${URL_}${path}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Range: `${from}-${from + 999}` } })).json();
    if (!Array.isArray(rows)) return rows;
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
};
const anon = async (fn, body) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 200) }; };

let r = await anon("town_tend", { p_x: 133, p_y: 4 });
ok("somebody signed out tends no plot", r.status === 401 || r.status === 403 || /42501|permission denied/.test(r.body), r);
r = await anon("feed", { p_key: "133,4", p_purse: {}, p_plot: {}, p_hand: "ladybird", p_now: 0 });
ok("the rule of putting a thing on a plant is not to be asked from outside", r.status === 404 || /PGRST202|42501/.test(r.body), r);
r = await anon("deed_for", { p_key: "133,4", p_plot: {}, p_hand: "ladybird", p_me: "x", p_now: 0, p_owner: null });
ok("…nor the rule of what a hand is offered", r.status === 404 || /PGRST202|42501/.test(r.body), r);

// what has been put on plants: a cover, a cure, or what makes a plant grow, by what was in the hand
const COVERS = ["guardFert", "ladybird", "lavenderSachet", "mantis", "mosquitofish"], CURES = ["archerfish", "pestCure"];
const deeds = await get(`/rest/v1/town_deeds?select=at,what,doc&what=in.(feed,cure)&order=id`);
if (Array.isArray(deeds)) {
  const kind = (d) => (d.what === "cure" ? "cure" : COVERS.includes(d.doc?.with) ? "cover" : "grow");
  const tally = (rows) => { const by = {}; for (const d of rows) { const k = `${kind(d)} (${d.doc?.with ?? "?"})`; by[k] = (by[k] ?? 0) + 1; } return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(", ") || "nothing"; };
  if (RAN) {
    const before = deeds.filter((d) => Date.parse(d.at) < RAN), since = deeds.filter((d) => Date.parse(d.at) >= RAN);
    console.log(`\n  before it ran: ${tally(before)}`);
    console.log(`  since (${((Date.now() - RAN) / 3_600_000).toFixed(1)} h): ${tally(since)}`);
    ok("since it ran a cure has its own work: every curing was with a cure", since.filter((d) => d.what === "cure").every((d) => CURES.includes(d.doc?.with)), since.filter((d) => d.what === "cure").map((d) => d.doc?.with));
  } else console.log(`\n  put on plants so far: ${tally(deeds)}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows it trips over fetch's handles as it goes, and the exit code is lost)
process.exitCode = fail ? 1 : 0;
