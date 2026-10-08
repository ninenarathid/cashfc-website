// A look at the live database for v165 (a bag put in order), from outside and as somebody signed out: the site's own
// public key and nothing else. What can be seen of the file from there is the shape of what it adds: its three
// functions are there once it has run (each refuses whoever is signed out, before anything of it runs), where before
// the file the same questions are answered "no such function"; and its rules are no function anybody can ask for.
// Touches nothing; prints no key.
//   node probe-v165.mjs            after the file has run
//   node probe-v165.mjs before     before it: the same questions, and what they are answered then
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const anon = async (fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 300) }; };
const refused = (r) => (r.status === 401 || r.status === 403) && /42501|permission denied/.test(r.body);
const unknown = (r) => r.status === 404 && /PGRST202/.test(r.body);

for (const [fn, body] of [["town_bag", {}], ["town_bag_move", { p_from: 0, p_to: 1 }], ["town_bag_sort", {}]]) {
  const r = await anon(fn, body);
  if (BEFORE) ok(`before the file ${fn} is no function: nobody is answered`, unknown(r), r);
  else {
    ok(`${fn}(${Object.keys(body).join(", ")}) is there: the file has run`, !unknown(r), r);
    ok("…and somebody signed out is refused it", refused(r), r);
  }
}
if (!BEFORE) {
  let r = await anon("town_bag_move", { p_from: 0, p_to: 1, p_member: "00000000-0000-0000-0000-000000000000" });
  ok("a word it does not take (whose bag) is answered: no such function", unknown(r), r);
  // (the rules are the town's own schema's, which is nobody's to ask through the site's door)
  for (const [fn, body] of [["bag_sort", { p_purse: {} }], ["bag_move", { p_purse: {}, p_from: 0, p_to: 1 }], ["bag_joins", { p_stack: {} }]]) {
    r = await anon(fn, body);
    ok(`the rule ${fn} is no function anybody can ask for`, unknown(r), r);
  }
  // (what was there is there as it was: the hand's own deed, which the bag's panel has beside the new ones)
  r = await anon("town_hold", { p_slot: 0 });
  ok("town_hold(p_slot) is there as it was, and refuses whoever is signed out", refused(r), r);
}
const t = await fetch(`${URL_}/rest/v1/town_purses?select=member_id&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const rows = await t.text();
ok("the purses are nobody's to read from outside", (t.status === 200 && rows.trim() === "[]") || t.status === 401 || t.status === 403, { status: t.status, rows: rows.slice(0, 120) });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
