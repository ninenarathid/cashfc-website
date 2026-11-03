// A read-only look at the live database after v319 (the cloud ram's pack). Touches nothing: every call it makes either
// reads with the site's key, or is made as somebody signed out and is refused before anything of it runs. Prints no
// key, no name and no id.
//   node probe-v319.mjs
// It says: the column `pack` is on town_boxes, an array in every row; the table is nobody's to read from outside; the
// three functions are there (the site's key is let in and stopped by town.member(), which wants a member, not by a
// missing function) and refuse whoever is signed out; and how many deeds of the pack there are so far.
// What only the SQL editor can say (privileges of each function, town.deed_th's two words) is in the file's foot.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}`); };
const head = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const ask = async (key, fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: head(key), body: JSON.stringify(body) }); const text = await r.text(); return { status: r.status, text }; };
const read = async (key, path) => { const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: head(key) }); const text = await r.text(); let rows = null; try { rows = JSON.parse(text); } catch { /* not json */ } return { status: r.status, rows, text }; };

const boxes = await read(SERVICE, "town_boxes?select=pack");
ok("the site's key reads town_boxes with its new column", boxes.status === 200 && Array.isArray(boxes.rows), `${boxes.status} ${boxes.text.slice(0, 160)}`);
if (Array.isArray(boxes.rows)) {
  ok("…an array of slots in every row", boxes.rows.every((r) => Array.isArray(r.pack)), "a row's pack is no array");
  console.log(`  (${boxes.rows.length} rows; ${boxes.rows.filter((r) => r.pack.some((s) => s)).length} with something in the pack)`);
}
const outside = await read(ANON, "town_boxes?select=pack&limit=1");
ok("nobody signed out reads the table", outside.status >= 400 || (Array.isArray(outside.rows) && outside.rows.length === 0), `${outside.status} ${outside.text.slice(0, 160)}`);
for (const [fn, body] of [["town_pack", {}], ["town_pack_put", { p_slot: 0, p_n: 1 }], ["town_pack_take", { p_slot: 0, p_n: 1 }]]) {
  const anon = await ask(ANON, fn, body);
  ok(`${fn} refuses whoever is signed out`, anon.status === 401 || anon.status === 403 || /permission denied/i.test(anon.text), `${anon.status} ${anon.text.slice(0, 160)}`);
  const site = await ask(SERVICE, fn, body);
  ok(`${fn} is there (stopped for want of a member, not missing)`, !/PGRST202|Could not find the function/i.test(site.text), `${site.status} ${site.text.slice(0, 160)}`);
}
const deeds = await read(SERVICE, "town_deeds?select=what&what=in.(pack_put,pack_take)");
if (Array.isArray(deeds.rows)) console.log(`  (deeds so far: ${deeds.rows.filter((d) => d.what === "pack_put").length} put in, ${deeds.rows.filter((d) => d.what === "pack_take").length} taken out)`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
