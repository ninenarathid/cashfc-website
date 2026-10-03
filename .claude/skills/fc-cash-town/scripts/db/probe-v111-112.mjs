// A live probe of v111 (a pot on the fire) and v112 (a deal between two): as anon, and as a throwaway member, unproved
// and then proved. Touches only what it makes (one throwaway account and the purse row its first call makes) and
// deletes all of it in `finally`. The throwaway has nothing in its bag, so nothing is cooked, set down, ladled or
// dealt: every call is one the rules refuse, which is what there is to see. The kitchen's and the deals' own rows are
// counted before and after, and must not have changed. Prints no key and no token.
//   node probe-v111-112.mjs          (ONLY=111 when v112 has not run yet)
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.log("missing keys in .env.local"); process.exit(2); }
const DEALS = process.env.ONLY !== "111";
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500))}`); };
async function call(path, { method = "GET", token = ANON, key = ANON, body, prefer } = {}) {
  const r = await fetch(`${URL_}${path}`, { method, headers: { apikey: key, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json = null;
  try { json = await r.json(); } catch { /* no body */ }
  return { status: r.status, json, code: json?.code ?? null, range: r.headers.get("content-range") };
}
const rpc = (fn, args, token = ANON) => call(`/rest/v1/rpc/${fn}`, { method: "POST", token, body: args });
const denied = (r) => r.code === "42501" || r.status === 401 || r.status === 403;
const svc = (path, opts = {}) => call(path, { ...opts, token: SERVICE, key: SERVICE });
const NOBODY = "00000000-0000-4000-8000-0000000000aa";
const TABLES = ["town_pots", ...(DEALS ? ["town_deals"] : [])];
const CALLS = [
  ["town_kitchen", {}], ["town_cook", { p_things: [["worm", 1]], p_crew: [], p_timing: null }], ["town_pot_down", { p_x: 50, p_y: 50 }],
  ["town_pot_ladle", { p_id: 1, p_x: 50, p_y: 50 }], ["town_pot_take", { p_id: 1, p_x: 50, p_y: 50 }], ["town_serve", { p_slot: 0 }], ["town_open", { p_slot: 0 }],
  ...(DEALS ? [["town_deal", {}], ["town_deal_open", { p_other: NOBODY }], ["town_deal_lay", { p_give: [], p_coins: 0 }], ["town_deal_agree", { p_word: true }], ["town_deal_cancel", {}]] : []),
];
/** The kitchen's and the deals' rows as they stand. */
async function rowsNow() {
  const out = [];
  for (const t of TABLES) out.push(`${t} ${(await svc(`/rest/v1/${t}?select=id&limit=1`, { prefer: "count=exact" })).range}`);
  const things = await svc(`/rest/v1/town_things?key=in.(found,finders)&select=key,doc`);
  out.push(...(things.json ?? []).map((x) => `${x.key} ${Array.isArray(x.doc) ? x.doc.length : Object.keys(x.doc).length}`).sort());
  return out.join(" | ");
}

let user = null;
try {
  const before = await rowsNow();
  console.log(`   before: ${before}`);
  console.log("── the catalog");
  let r = await svc(`/rest/v1/town_catalog?select=key,data`);
  const cat = Object.fromEntries((r.json ?? []).map((x) => [x.key, x.data]));
  const want = {};
  for (const f of fs.readdirSync("E:/NinenineProject/fcnext/supabase").filter((n) => /^v11[12]_/.test(n)).sort()) {
    if (!DEALS && f.startsWith("v112")) continue;
    for (const m of fs.readFileSync(`E:/NinenineProject/fcnext/supabase/${f}`, "utf8").matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
  }
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
  const differ = Object.keys(want).filter((k) => !cat[k] || canon(cat[k]) !== canon(want[k]));
  ok(`the ${Object.keys(want).length} rows these files write are there, as they wrote them`, Object.keys(want).length >= 7 && differ.length === 0, differ);
  ok("there is no dirty pot, nothing to wash one with, and a pot to cook in fetches forty", cat.items && !cat.items.potDirty && !cat.items.soap && !cat.items.scrubber && cat.items.pot?.pays === 40
    && Object.keys(cat.items).length === 312 && Object.keys(cat.goods).length === 101, { items: Object.keys(cat.items ?? {}).length, goods: Object.keys(cat.goods ?? {}).length });

  console.log("── as anon");
  let bad = [];
  for (const [fn, args] of CALLS) { const q = await rpc(fn, args); if (!denied(q)) bad.push([fn, q.status, q.code]); }
  ok(`anon may call none of the ${CALLS.length} functions`, bad.length === 0, bad);
  bad = [];
  for (const t of TABLES) { const q = await call(`/rest/v1/${t}?select=*&limit=1`); if (!denied(q)) bad.push([t, q.status]); }
  ok("anon can read none of their tables", bad.length === 0, bad);
  r = await rpc("cook", { p_things: [] });
  ok("the rules themselves are not reachable at all", r.status === 404 || denied(r), r);

  console.log("── a throwaway member");
  const email = `probe-${crypto.randomUUID().slice(0, 8)}@example.com`;
  r = await svc(`/auth/v1/admin/users`, { method: "POST", body: { email, email_confirm: true } });
  if (r.status >= 300 || !r.json?.id) throw new Error(`could not make the throwaway account (${r.status})`);
  user = r.json.id;
  r = await svc(`/auth/v1/admin/generate_link`, { method: "POST", body: { type: "magiclink", email } });
  const hashed = r.json?.properties?.hashed_token ?? r.json?.hashed_token;
  if (!hashed) throw new Error(`no magic link (${r.status})`);
  r = await call(`/auth/v1/verify`, { method: "POST", body: { type: "magiclink", token_hash: hashed } });
  const token = r.json?.access_token;
  if (!token) throw new Error(`no session (${r.status})`);
  for (let i = 0; i < 10; i++) { r = await svc(`/rest/v1/profiles?id=eq.${user}&select=id,character_id`); if (r.json?.length) break; await new Promise((res) => setTimeout(res, 300)); }
  ok("the throwaway has a profile, with no character", r.json?.length === 1 && r.json[0].character_id === null, r);
  bad = [];
  for (const [fn, args] of CALLS) { const q = await rpc(fn, args, token); if (!denied(q)) bad.push([fn, q.status, q.code]); }
  ok("with no proved character, none of them answers", bad.length === 0, bad);
  const fake = 900000100 + Math.floor(Math.random() * 800000);
  r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);

  console.log("── proved: the kitchen (v111)");
  r = await rpc("town_kitchen", {}, token);
  ok("the kitchen is told: its pots, what has been found and by whom, and the town's clock", r.status === 200 && Array.isArray(r.json?.pots) && Array.isArray(r.json.found) && typeof r.json.finders === "object"
    && Math.abs(r.json.now - Date.now()) < 120_000 && !("purse" in r.json), r);
  console.log(`     ${r.json?.pots?.length} pots standing · ${r.json?.found?.length} recipes found`);
  r = await rpc("town_cook", { p_things: [["worm", 1]], p_crew: [], p_timing: { hits: 3, misses: 0, secs: 5 } }, token);
  ok("what is not in the bag is not cooked: an answer, not an error", r.status === 200 && r.json?.ok === false && r.json.why === "none" && Array.isArray(r.json.purse?.bag), r);
  r = await rpc("town_cook", { p_things: [], p_crew: [NOBODY], p_timing: null }, token);
  ok("nothing put in is nothing cooked", r.status === 200 && r.json?.ok === false && r.json.why === "amount", r);
  r = await rpc("town_cook", { p_things: "tomYum", p_crew: [], p_timing: null }, token);
  ok("a recipe's name is no list of things: nothing is cooked by naming it", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_pot_down", { p_x: 50, p_y: 50 }, token);
  ok("with no pot of food there is nothing to set down", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_pot_ladle", { p_id: 987654321, p_x: 50, p_y: 50 }, token);
  ok("a pot that is not there is not ladled from", r.status === 200 && r.json?.ok === false && r.json.why === "gone", r);
  r = await rpc("town_pot_take", { p_id: 987654321, p_x: 50, p_y: 50 }, token);
  ok("…nor taken up", r.status === 200 && r.json?.ok === false && r.json.why === "gone", r);
  r = await rpc("town_serve", { p_slot: 0 }, token);
  ok("an empty slot serves nothing", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_open", { p_slot: 0 }, token);
  ok("…and opens nothing", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_chew", { p_company: 0 }, token);
  ok("a meal that is not being eaten gives no bowl", r.status === 200 && r.json?.purse?.bag?.every((s) => s === null) && !("owed" in r.json.purse), r);

  if (DEALS) {
    console.log("── proved: deals (v112)");
    r = await rpc("town_deal", {}, token);
    ok("there is no deal", r.status === 200 && r.json?.deal === null && typeof r.json.now === "number", r);
    r = await rpc("town_deal_open", { p_other: user }, token);
    ok("nobody deals with themselves", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
    r = await rpc("town_deal_open", { p_other: NOBODY }, token);
    ok("nor with somebody who is not there", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
    r = await rpc("town_deal_lay", { p_give: [["worm", 1]], p_coins: 5 }, token);
    ok("with no deal open nothing is laid out", r.status === 200 && r.json?.ok === false && r.json.why === "gone", r);
    r = await rpc("town_deal_agree", { p_word: true }, token);
    ok("…no word is given", r.status === 200 && r.json?.ok === false && r.json.why === "gone", r);
    r = await rpc("town_deal_cancel", {}, token);
    ok("…and nothing is called off", r.status === 200 && r.json?.ok === false && r.json.why === "gone", r);
  }

  console.log("── what a member's own hands cannot reach");
  bad = [];
  for (const t of TABLES) { const q = await call(`/rest/v1/${t}?select=*&limit=1`, { token }); if (!denied(q)) bad.push([t, q.status]); }
  ok("a member can read none of their tables", bad.length === 0, bad);
  r = await call(`/rest/v1/town_pots`, { method: "POST", token, body: { member_id: user, dish: "shabu", helpings: 99, x: 50, y: 50, set_at: 0 }, prefer: "return=minimal" });
  ok("a member cannot set down a pot of shabu by hand", denied(r), r);
  r = await call(`/rest/v1/town_things?key=eq.finders`, { method: "PATCH", token, body: { doc: { shabu: { name: "Probe" } } }, prefer: "return=representation" });
  ok("…nor write themselves in as a finder", denied(r), r);
  if (DEALS) {
    r = await call(`/rest/v1/town_deals`, { method: "POST", token, body: { a: user, b: user, doc: {}, touched: 0, ended: "done" }, prefer: "return=minimal" });
    ok("…nor write a deal", denied(r), r);
  }

  console.log("── what is there afterwards, read with the service key");
  r = await svc(`/rest/v1/town_plays?member_id=eq.${user}&select=id`);
  ok("nothing was written down for it: nothing was cooked", r.status === 200 && r.json?.length === 0, r);
  const after = await rowsNow();
  ok("the kitchen's and the deals' own rows are as they were", after === before, { before, after });
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    const prof = await svc(`/rest/v1/profiles?id=eq.${user}&select=id`);
    ok("the throwaway account is deleted, and its profile and purse went with it", d.status < 300 && left.json?.length === 0 && prof.json?.length === 0, { deleted: d.status, purse: left.json, profile: prof.json });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
