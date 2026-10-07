// A look at the live database for v159 (a table for the village's pots), from outside and as somebody signed out: the
// site's own public key and nothing else. What can be seen of the file from there is the shape of what it adds: the
// table's own bowl, `town_feast_eat`, is there once it has run (and refuses whoever is signed out, before anything of
// it runs), where before the file the same question is answered "no such function"; the pots' other functions are
// there as they were; and the pots themselves are nobody's to read from outside. Touches nothing; prints no key.
//   node probe-v159.mjs            after the file has run
//   node probe-v159.mjs before     before it: the same questions, and what they are answered then
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, BEFORE = process.argv[2] === "before";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const anon = async (fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 300) }; };
const refused = (r) => (r.status === 401 || r.status === 403) && /42501|permission denied/.test(r.body);
const unknown = (r) => r.status === 404 && /PGRST202/.test(r.body);

const EAT = { p_id: 0, p_x: 1, p_y: 1, p_seated: true };
let r = await anon("town_feast_eat", EAT);
if (BEFORE) ok("before the file the table's bowl is no function: nobody is answered", unknown(r), r);
else {
  ok("the table's bowl is there: the file has run, and its shape is known to whoever asks", !unknown(r), r);
  ok("…and somebody signed out is refused it", refused(r), r);
  r = await anon("town_feast_eat", { ...EAT, p_nope: 0 });
  ok("a word it does not take is answered: no such function", unknown(r), r);
}
for (const [fn, body] of [["town_kitchen", {}], ["town_pot_down", { p_x: 1, p_y: 1 }], ["town_pot_down", { p_x: 1, p_y: 1, p_slot: 0 }], ["town_pot_ladle", { p_id: 0, p_x: 1, p_y: 1 }], ["town_pot_take", { p_id: 0, p_x: 1, p_y: 1 }]]) {
  r = await anon(fn, body);
  ok(`${fn}(${Object.keys(body).join(", ")}) is there as it was, and refuses whoever is signed out`, refused(r), r);
}
const t = await fetch(`${URL_}/rest/v1/town_pots?select=id&limit=1`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
const rows = await t.text();
ok("the pots are nobody's to read from outside", (t.status === 200 && rows.trim() === "[]") || t.status === 401 || t.status === 403, { status: t.status, rows: rows.slice(0, 120) });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
