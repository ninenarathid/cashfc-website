// A live probe of v110 (a seed in the ground): as anon, and as a throwaway member, unproved and then proved.
// Touches only what it makes (one throwaway account and the purse row its first call makes) and deletes all of it in
// `finally`. The throwaway has nothing in its bag or its hand, so no plot is cleared, nothing is sown and no water is
// carried: every call is one the rules refuse, which is what there is to see. The farm's own rows (plots, beds, the
// well) are counted before and after, and must not have changed. Prints no key and no token.
//   node probe-v110.mjs
import fs from "node:fs";

const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SERVICE) { console.log("missing keys in .env.local"); process.exit(2); }
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
const TABLES = ["town_plots", "town_beds"];
const CALLS = [["town_farm", { p_since: 0 }], ["town_tend", { p_x: 132, p_y: 4, p_timing: null }], ["town_chore", { p_x: 155, p_y: 23 }]];
/** The farm's rows as they stand: how many plots, how many beds, the well. */
async function farmNow() {
  const plots = await svc(`/rest/v1/town_plots?select=x&limit=1`, { prefer: "count=exact" }), beds = await svc(`/rest/v1/town_beds?select=bed&limit=1`, { prefer: "count=exact" });
  const well = await svc(`/rest/v1/town_things?key=eq.well&select=doc`);
  return `${plots.range} | ${beds.range} | ${JSON.stringify(well.json?.[0]?.doc)}`;
}

let user = null;
try {
  const before = await farmNow();
  console.log(`   the farm before: plots ${before}`);
  console.log("── the catalog");
  let r = await svc(`/rest/v1/town_catalog?key=in.(crops,farming)&select=key,data`);
  const cat = Object.fromEntries((r.json ?? []).map((x) => [x.key, x.data]));
  const file = fs.readdirSync("E:/NinenineProject/fcnext/supabase").find((n) => n.startsWith("v110_"));
  const want = {};
  if (file) for (const m of fs.readFileSync(`E:/NinenineProject/fcnext/supabase/${file}`, "utf8").matchAll(/\('([a-z]+)', \$town\$([\s\S]*?)\$town\$::jsonb\)/g)) want[m[1]] = JSON.parse(m[2]);
  const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((key) => [key, x[key]])) : x));
  ok("the two rows it seeds are there, as its file wrote them", !!cat.crops && !!cat.farming && (!file || (canon(cat.crops) === canon(want.crops) && canon(cat.farming) === canon(want.farming))),
    { crops: Object.keys(cat.crops ?? {}).length, farming: Object.keys(cat.farming ?? {}).length });

  console.log("── as anon");
  let bad = [];
  for (const [fn, args] of CALLS) { const q = await rpc(fn, args); if (!denied(q)) bad.push([fn, q.status, q.code]); }
  ok(`anon may call none of the ${CALLS.length} functions`, bad.length === 0, bad);
  bad = [];
  for (const t of TABLES) { const q = await call(`/rest/v1/${t}?select=*&limit=1`); if (!denied(q)) bad.push([t, q.status]); }
  ok("anon can read neither of the farm's tables", bad.length === 0, bad);
  r = await rpc("tend", { p_key: "132,4" });
  ok("the rules themselves are not reachable at all", r.status === 404 || denied(r), r);
  r = await call(`/rest/v1/town_plots`, { method: "POST", body: { x: 132, y: 4, bed: 0, soil: "tilled", changed: 0 }, prefer: "return=minimal" });
  ok("anon cannot write a plot", denied(r), r);

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

  console.log("── proved: the farm");
  r = await rpc("town_farm", { p_since: 0 }, token);
  ok("the farm is told: its plots, its beds, the well and the town's clock", r.status === 200 && typeof r.json?.plots === "object" && typeof r.json.beds === "object" && typeof r.json.well === "number"
    && Math.abs(r.json.now - Date.now()) < 120_000 && !("purse" in r.json), r);
  console.log(`     ${Object.keys(r.json?.plots ?? {}).length} plots tended · ${Object.keys(r.json?.beds ?? {}).length} beds held · the well ${r.json?.well}`);
  r = await rpc("town_tend", { p_x: 132, p_y: 4, p_timing: null }, token);
  ok("with nothing in the hand a plot is not tended: an answer, not an error", r.status === 200 && r.json?.ok === false && r.json.why === "soil" && r.json.key === "132,4" && Array.isArray(r.json.purse?.bag), r);
  r = await rpc("town_tend", { p_x: 131, p_y: 4, p_timing: { hits: 3, misses: 0, secs: 2 } }, token);
  ok("a tile that is no plot is refused", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_tend", { p_x: 2000000000, p_y: -5, p_timing: "x" }, token);
  ok("…and one far off the map", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_chore", { p_x: 155, p_y: 23 }, token);
  ok("beside the well with empty hands there is nothing to do", r.status === 200 && r.json?.ok === false && r.json.why === "none" && typeof r.json.well === "number", r);
  r = await rpc("town_chore", { p_x: 16, p_y: 38 }, token);
  ok("…nor at the river", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);
  r = await rpc("town_chore", { p_x: 1, p_y: 1 }, token);
  ok("…nor in the middle of the grass", r.status === 200 && r.json?.ok === false && r.json.why === "none", r);

  console.log("── what a member's own hands cannot reach");
  bad = [];
  for (const t of TABLES) { const q = await call(`/rest/v1/${t}?select=*&limit=1`, { token }); if (!denied(q)) bad.push([t, q.status]); }
  ok("a member can read neither of the farm's tables", bad.length === 0, bad);
  r = await call(`/rest/v1/town_plots`, { method: "POST", token, body: { x: 132, y: 4, bed: 0, soil: "tilled", plant: { by: user, crop: "coconut", sown: 0 }, changed: 0 }, prefer: "return=minimal" });
  ok("a member cannot plant a ripe coconut by hand", denied(r), r);
  r = await call(`/rest/v1/town_beds`, { method: "POST", token, body: { bed: 0, member_id: user, tended: Date.now() }, prefer: "return=minimal" });
  ok("…nor claim a bed", denied(r), r);
  r = await call(`/rest/v1/town_things?key=eq.well`, { method: "PATCH", token, body: { doc: 40 }, prefer: "return=representation" });
  ok("…nor fill the well", denied(r), r);

  console.log("── what is there afterwards, read with the service key");
  r = await svc(`/rest/v1/town_plays?member_id=eq.${user}&select=id`);
  ok("nothing was written down for it: nothing was hoed", r.status === 200 && r.json?.length === 0, r);
  const after = await farmNow();
  ok("the farm's own rows are as they were", after === before, { before, after });
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
