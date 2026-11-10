// A read-only look at the live database after v326 (barns of 8 and 16, handed over in parts; a lighter look). Touches
// nothing: every call either reads with the site's key, or is made signed out and is refused before anything runs.
// Prints no key, no name and no id: counts only.
//   node probe-v326.mjs
// It says: the catalog's four stages are the code's (8 and 16 paid in parts, 2 and 4 as they were); the barns by room
// and how many herds hold parts (none on the day it runs); town_animals refuses whoever is signed out and is there for
// a member (the site's key is stopped by town.member(), not by a missing function); the deliveries so far. What only
// the SQL editor can say (the function's text, its privileges) is the file's foot.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}`); };
const head = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const ask = async (key, fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: head(key), body: JSON.stringify(body) }); return { status: r.status, text: await r.text() }; };
const read = async (key, path) => { const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: head(key) }); const text = await r.text(); let rows = null; try { rows = JSON.parse(text); } catch { /* not json */ } return { status: r.status, rows, text }; };

const STAGES = [
  { room: 2, coins: 500, needs: [["log", 20], ["stoneTile", 8]] },
  { room: 4, coins: 1000, needs: [["log", 40], ["stoneTile", 12]] },
  { room: 8, coins: 3000, needs: [["log", 200], ["timber", 100], ["stoneTile", 40], ["oreIron", 30]], parts: true },
  { room: 16, coins: 15000, needs: [["log", 400], ["timber", 200], ["stoneTile", 100], ["oreIron", 60], ["yarn", 40]], parts: true },
];
const cat = await read(SERVICE, "town_catalog?select=data&key=eq.animals");
const stages = cat.rows?.[0]?.data?.knobs?.barns?.stages;
ok("the catalog has the four stages, as the code has them", JSON.stringify(stages) === JSON.stringify(STAGES), stages);
ok("…and keeps the rest of its row (v324's specials, the species)", !!cat.rows?.[0]?.data?.specials && !!cat.rows?.[0]?.data?.species, Object.keys(cat.rows?.[0]?.data ?? {}));

const herds = await read(SERVICE, "town_herds?select=h");
if (Array.isArray(herds.rows)) {
  const rooms = {};
  for (const { h } of herds.rows) if (h.barn !== null) rooms[h.room] = (rooms[h.room] ?? 0) + 1;
  console.log(`  (barns by room: ${JSON.stringify(rooms)}; herds with parts handed over: ${herds.rows.filter(({ h }) => h.parts && Object.keys(h.parts).length).length})`);
  ok("every barn's room is one of the stages'", herds.rows.every(({ h }) => STAGES.some((s) => s.room === h.room)), "a room no stage gives");
}
const anon = await ask(ANON, "town_animals", { p_input: { action: "deliver" }, p_request: null });
ok("town_animals refuses whoever is signed out", anon.status === 401 || anon.status === 403 || /permission denied/i.test(anon.text), `${anon.status} ${anon.text.slice(0, 160)}`);
const site = await ask(SERVICE, "town_animals", { p_input: { action: "look" }, p_request: null });
ok("town_animals is there (stopped for want of a member, not missing)", !/PGRST202|Could not find the function/i.test(site.text), `${site.status} ${site.text.slice(0, 160)}`);
const deeds = await read(SERVICE, "town_deeds?select=what,n&what=in.(animal_deliver,animal_enlarge)");
if (Array.isArray(deeds.rows)) console.log(`  (deeds so far: ${deeds.rows.filter((d) => d.what === "animal_deliver").length} parts handed over, ${deeds.rows.filter((d) => d.what === "animal_enlarge" && Number(d.n) >= 8).length} barns grown to 8 or 16)`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
