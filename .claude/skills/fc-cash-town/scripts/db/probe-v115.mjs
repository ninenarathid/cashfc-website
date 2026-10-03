// A live probe of v115 (the town's game opens when its owner says), for while the knob is still shut: a throwaway
// member with a proved character who is no admin is refused by every one of the game's 37 functions, is told "not
// open" by town_is_open without being refused anything, and has nothing made for them; somebody signed out may not
// ask; the popoto board's two counts answer anybody as before. It makes one throwaway account and deletes it in
// `finally`. It never makes an admin, and never turns the knob. Prints no key and no token.
//   node probe-v115.mjs
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
  return { status: r.status, json, code: json?.code ?? null, message: json?.message ?? null, range: r.headers.get("content-range") };
}
const rpc = (fn, args, token = ANON) => call(`/rest/v1/rpc/${fn}`, { method: "POST", token, body: args });
const denied = (r) => r.code === "42501" || r.status === 401 || r.status === 403;
const svc = (path, opts = {}) => call(path, { ...opts, token: SERVICE, key: SERVICE });
const total = (r) => Number((r.range ?? "").split("/")[1]);

/** Every function of the game's a member may call, with something for each of its arguments. */
const GAME = (me) => ({
  town_me: {}, town_stall: {}, town_bank: {}, town_buy: { p_item: "worm", p_n: 1 }, town_hold: { p_slot: 0 }, town_leave: { p_slot: 0, p_n: 1 }, town_take_back: { p_at: 0 },
  town_collect: {}, town_give: { p_slot: 0, p_n: 1 }, town_hint: {}, town_drop: { p_slot: 0 }, town_wear: { p_slot: 0 }, town_take_off: { p_item: "basket" }, town_read: { p_slot: 0 },
  town_open: { p_slot: 0 }, town_sit: { p_slot: 0, p_seated: true }, town_chew: { p_company: 0 }, town_get_up: { p_company: 0 }, town_line: {},
  town_cast: { p_bait: "worm", p_x: 0, p_y: 0, p_rain: false }, town_strike: { p_reaction: 0 }, town_land: { p_how: "left", p_fight: null }, town_farm: { p_since: 0 },
  town_tend: { p_x: 130, p_y: 5, p_timing: null }, town_chore: { p_x: 0, p_y: 0 }, town_kitchen: {}, town_cook: { p_things: [], p_crew: [], p_timing: null },
  town_pot_down: { p_x: 1, p_y: 1 }, town_pot_ladle: { p_id: 0, p_x: 1, p_y: 1 }, town_pot_take: { p_id: 0, p_x: 1, p_y: 1 }, town_serve: { p_slot: 0 }, town_deal: {},
  town_deal_open: { p_other: me }, town_deal_lay: { p_give: [], p_coins: 0 }, town_deal_agree: { p_word: true }, town_deal_cancel: {}, town_exchange: { p_kind: "profile", p_popoto: 1 },
});

let user = null;
try {
  let r = await svc(`/rest/v1/town_knobs?select=key,value&order=key`);
  const knobs = Object.fromEntries((r.json ?? []).map((k) => [k.key, k.value]));
  ok("the knobs: the game's is there; the bank's as they were", "game_open" in knobs && knobs.bank_rate === 5 && knobs.bank_weekly === 20 && knobs.bank_gallery === 0, knobs);
  const shut = knobs.game_open === 0;
  console.log(`   the game is ${shut ? "shut: admins only" : "OPEN to every proved character"}`);
  r = await svc(`/rest/v1/town_purses?select=member_id&limit=1`, { prefer: "count=exact" });
  const purses = total(r);
  r = await rpc("town_is_open", {});
  ok("somebody signed out may not ask whether it is open", denied(r), r);
  r = await rpc("town_me", {});
  ok("…and is told nothing, as before", denied(r), r);
  r = await call(`/rest/v1/rpc/popoto_totals?order=first_id&limit=3`);
  ok("the popoto board still answers anybody", r.status === 200 && Array.isArray(r.json) && r.json.length === 3, r);

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
  for (let i = 0; i < 10; i++) { r = await svc(`/rest/v1/profiles?id=eq.${user}&select=id,is_admin`); if (r.json?.length) break; await new Promise((res) => setTimeout(res, 300)); }
  if (r.json?.[0]?.is_admin) throw new Error("the throwaway came out an admin: stopping");
  r = await rpc("town_is_open", {}, token);
  ok("with no proved character: not open to them, said as a plain no", r.status === 200 && r.json === false, r);
  const fake = 900000100 + Math.floor(Math.random() * 800000);
  r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);
  r = await rpc("town_is_open", {}, token);
  ok(`with a proved character, and no admin: ${shut ? "still no, while the game is shut" : "yes, the game being open"}`, r.status === 200 && r.json === !shut, r);

  const game = GAME(user), refused = [], other = [];
  for (const [fn, args] of Object.entries(game)) {
    r = await rpc(fn, args, token);
    if (r.code === "42501" && /not open yet/.test(r.message ?? "")) refused.push(fn); else other.push(`${fn}: ${r.status} ${r.code ?? ""}`);
  }
  if (shut) {
    ok(`every one of the game's ${Object.keys(game).length} functions refuses them: the game is not open yet`, Object.keys(game).length === 37 && refused.length === 37, other);
    r = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    const mine = r.json?.length;
    r = await svc(`/rest/v1/town_purses?select=member_id&limit=1`, { prefer: "count=exact" });
    ok("nothing was made for them: no purse, and as many purses as there were", mine === 0 && total(r) === purses, { mine, before: purses, after: total(r) });
    r = await svc(`/rest/v1/town_exchanges?member_id=eq.${user}&select=id`);
    ok("…and no popoto of theirs was changed", r.json?.length === 0, r.json);
  } else {
    ok("the game being open, none of its functions says \"not open yet\" to a proved character", refused.length === 0, refused);
  }
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    ok("the throwaway account is deleted, and nothing of it is left", d.status < 300 && left.json?.length === 0, { deleted: d.status, purse: left.json });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
