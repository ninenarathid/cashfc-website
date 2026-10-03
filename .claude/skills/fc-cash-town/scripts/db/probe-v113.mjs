// A live probe of v113 (a bigger bag): the catalog's row, and a throwaway member's new purse. Touches only what it
// makes (one throwaway account and the purse row its first call makes) and deletes all of it in `finally`. Prints no
// key and no token.
//   node probe-v113.mjs
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

let user = null;
try {
  let r = await svc(`/rest/v1/town_catalog?key=eq.rules&select=data,updated_at`);
  ok("the catalog's rules: a bag begins with ten slots; the uncle's hours and the dawn as they were", r.json?.[0]?.data?.slots === 10 && JSON.stringify(r.json[0].data.rounds) === "[7,19]" && r.json[0].data.dawn === 5, r.json);
  r = await svc(`/rest/v1/town_purses?select=member_id&limit=1`, { prefer: "count=exact" });
  const before = r.range;
  console.log(`   purses before: ${before}`);
  r = await rpc("town_me", {});
  ok("anon is still told nothing", denied(r), r);
  r = await rpc("roomy", { p_purse: {} });
  ok("the rule itself is not reachable", r.status === 404 || denied(r), r);

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
  for (let i = 0; i < 10; i++) { r = await svc(`/rest/v1/profiles?id=eq.${user}&select=id`); if (r.json?.length) break; await new Promise((res) => setTimeout(res, 300)); }
  r = await rpc("town_me", {}, token);
  ok("with no proved character, still nothing", denied(r), r);
  const fake = 900000100 + Math.floor(Math.random() * 800000);
  r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);
  r = await rpc("town_me", {}, token);
  ok("a new member's purse: ten empty slots, no coins", r.status === 200 && r.json?.purse?.bag?.length === 10 && r.json.purse.bag.every((s) => s === null) && r.json.purse.coins === 0, r);
  r = await rpc("town_hold", { p_slot: 0 }, token);
  ok("an empty slot is not held, and the answer's bag has ten too", r.status === 200 && r.json?.ok === false && r.json.purse.bag.length === 10, r);
  r = await rpc("town_stall", {}, token);
  ok("the stall still answers: its shelf of twenty-one, and today's order", r.status === 200 && r.json?.shelf?.length >= 21 && Array.isArray(r.json.order?.wants), r);
  r = await rpc("town_farm", { p_since: 0 }, token);
  ok("…and so does the farm", r.status === 200 && typeof r.json?.well === "number", r);
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    ok("the throwaway account is deleted, and its purse went with it", d.status < 300 && left.json?.length === 0, { deleted: d.status, purse: left.json });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
