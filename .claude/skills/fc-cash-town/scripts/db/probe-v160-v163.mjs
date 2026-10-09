// A look at the live database for v160 (the bridge built by hand, and the village's works) and v163 (the lamp relay
// at dusk), from outside and as somebody signed out: the site's own public key and nothing else. What can be seen of
// the two files from there is the shape of what they add: their ten functions are there once they have run (each
// refuses whoever is signed out, before anything of it runs), where before the files the same questions are answered
// "no such function"; their nine tables are nobody's to read; and their rules are no function anybody can ask for.
// Whether the bridge is open, and whether a lamp is lit, cannot be seen from here: those are a member's to be told.
// Touches nothing; prints no key.
//   node probe-v160-v163.mjs            after the files have run
//   node probe-v160-v163.mjs before     before them: the same questions, and what they are answered then
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const anon = async (fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: await r.text() }; };
const refused = (r) => (r.status === 401 || r.status === 403) && /42501|permission denied/.test(r.body);
const unknown = (r) => r.status === 404 && /PGRST202/.test(r.body);
const NOBODY = "00000000-0000-0000-0000-000000000000";

const CALLS = [
  // v160
  ["town_works_read", {}], ["town_stone_lift", { p_x: 42, p_y: 27 }], ["town_stone_pass", { p_to: NOBODY }], ["town_stone_lay", { p_x: 11, p_y: 27 }],
  ["town_stone_drop", {}], ["town_work_give", { p_work: "bridge", p_thing: "stone", p_n: 1 }],
  // v163
  ["town_lamps_read", {}], ["town_flame_take", { p_map: "farm", p_x: 155, p_y: 24 }], ["town_flame_pass", { p_to: NOBODY }],
  ["town_lamp_light", { p_map: "farm", p_post: 0, p_x: 146, p_y: 23 }],
];
for (const [fn, body] of CALLS) {
  const r = await anon(fn, body);
  if (BEFORE) ok(`before the files ${fn} is no function: nobody is answered`, unknown(r), r);
  else {
    ok(`${fn}(${Object.keys(body).join(", ")}) is there: its file has run`, !unknown(r), r);
    ok("…and somebody signed out is refused it", refused(r), r);
  }
}
if (!BEFORE) {
  // (the rules are the town's own schema's, which is nobody's to ask through the site's door)
  for (const [fn, body] of [["stone_lift", { p_purse: {} }], ["works_told", { p_member: NOBODY }], ["lamp_night", { p_now: 0 }], ["lamps_told", { p_member: NOBODY, p_now: 0 }], ["work_counts_of", { p_done: {}, p_doer: "" }]]) {
    const r = await anon(fn, body);
    ok(`the rule ${fn} is no function anybody can ask for`, unknown(r), r);
  }
  // (what was there is there as it was: the bucket line's own handing on)
  const r = await anon("town_pass", { p_to: NOBODY });
  ok("town_pass(p_to) is there as it was, and refuses whoever is signed out", refused(r), r);
}
for (const table of ["town_works", "town_work_needs", "town_work_hands", "town_work_carried", "town_work_built", "town_work_finds", "town_lamp_nights", "town_lamps_lit", "town_lamp_flames"]) {
  const t = await fetch(`${URL_}/rest/v1/${table}?select=*&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  const rows = await t.text();
  if (BEFORE) ok(`before the files ${table} is no table`, t.status === 404, { status: t.status, rows: rows.slice(0, 120) });
  else ok(`${table} is nobody's to read from outside`, t.status === 401 || t.status === 403 || (t.status === 200 && rows.trim() === "[]"), { status: t.status, rows: rows.slice(0, 120) });
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
