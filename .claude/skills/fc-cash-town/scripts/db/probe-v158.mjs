// A look at the live database for v158 (the pot set down is the pot that was meant), from outside and as somebody
// signed out: the site's own public key and nothing else. The file writes no row, so what can be seen of it is the
// function's shape: asked with the slot, `town_pot_down` is there (and refuses whoever is signed out, before anything
// of it runs); asked with two words, as a page from before asks, it is there too; and a word it does not take is
// answered "no such function", which is what the slot was answered before the file ran. Touches nothing; prints no key.
//   node probe-v158.mjs
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const anon = async (fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }); return { status: r.status, body: (await r.text()).slice(0, 300) }; };
const refused = (r) => (r.status === 401 || r.status === 403) && /42501|permission denied/.test(r.body);
const unknown = (r) => r.status === 404 && /PGRST202/.test(r.body);

let r = await anon("town_pot_down", { p_x: 1, p_y: 1, p_nope: 0 });
ok("a word it does not take is answered: no such function", unknown(r), r);
r = await anon("town_pot_down", { p_x: 1, p_y: 1, p_slot: 0 });
ok("asked with the slot, the function is there: the file has run, and its shape is known to whoever asks", !unknown(r), r);
ok("…and somebody signed out is refused it", refused(r), r);
r = await anon("town_pot_down", { p_x: 1, p_y: 1 });
ok("asked with two words, as a page from before asks, it is there too, and refuses the same", refused(r), r);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
