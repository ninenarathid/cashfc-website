// A live probe of v119 (a plant dug out): as anon, and as a throwaway member with a proved character who is no admin.
// Touches only what it makes (one throwaway account and the purse row its first call makes) and deletes all of it in
// `finally`. The throwaway has nothing in its bag or its hand, and asks only about a plot that has no plant in it
// (looked up first: with empty hands a ripe plant in a bed that is nobody's could be picked, so no plot with a plant
// is ever asked about): every call is one the rules refuse, which is what there is to see. That plot's row is read
// before and after, and must not have changed. It never makes an admin. Prints no key, no token, no name and no id.
//   node probe-v119.mjs
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
  return { status: r.status, json, code: json?.code ?? null };
}
const rpc = (fn, args, token = ANON) => call(`/rest/v1/rpc/${fn}`, { method: "POST", token, body: args });
const denied = (r) => r.code === "42501" || r.status === 401 || r.status === 403;
const svc = (path, opts = {}) => call(path, { ...opts, token: SERVICE, key: SERVICE });
/** A refusal as it is told, with nothing of the purse in it (for what is printed when a check fails). */
const brief = (r) => ({ status: r.status, code: r.code, ok: r.json?.ok, why: r.json?.why, key: r.json?.key, plot: r.json?.plot });

let user = null;
try {
  console.log("── the game, and a plot to ask about");
  let r = await svc(`/rest/v1/town_knobs?key=eq.game_open&select=value`);
  const open = r.json?.[0]?.value > 0;
  ok("the game is open to members: a throwaway who is no admin can ask", open, r.json);
  // every plot that has a row, and of those the ones with a plant: a plot of the first beds with no plant in it is asked about
  r = await svc(`/rest/v1/town_plots?select=x,y,soil,plant`);
  const kept = new Map((r.json ?? []).map((p) => [`${p.x},${p.y}`, p]));
  let at = null;
  // (the first bed begins at 132,4, seven plots by seven; the next along at 140,4)
  for (const bx of [132, 140, 148, 156]) for (let y = 4; y < 11 && !at; y++) for (let x = bx; x < bx + 7 && !at; x++) if (!kept.get(`${x},${y}`)?.plant) at = [x, y];
  ok("a plot with no plant in it is found", !!at && r.status === 200, { status: r.status, kept: kept.size });
  if (!at || !open) throw new Error("nothing to ask about");
  const key = `${at[0]},${at[1]}`, plotNow = async () => JSON.stringify((await svc(`/rest/v1/town_plots?x=eq.${at[0]}&y=eq.${at[1]}&select=soil,plant,changed`)).json);
  const before = await plotNow();
  console.log(`   ${kept.size} plots kept, ${[...kept.values()].filter((p) => p.plant).length} with a plant; the plot asked about is ${kept.has(key) ? `kept (${kept.get(key).soil}, no plant)` : "weeds"}`);

  console.log("── as anon");
  r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: null });
  ok("somebody signed out may not tend a plot, asked with three words as a page built before asks", denied(r), brief(r));
  r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: null, p_sure: true });
  ok("…nor with the fourth", denied(r), brief(r));
  for (const fn of ["uproot", "tend", "hoe", "deed_for"]) {
    r = await rpc(fn, {});
    ok(`the rule town.${fn} is not a browser's to call`, r.status === 404, r.status);
  }

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
  ok("the throwaway has a profile, with no character (and nothing ever makes it an admin)", r.json?.length === 1 && r.json[0].character_id === null, r.status);
  r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: null, p_sure: true }, token);
  ok("with no proved character, tending does not answer, the word given or not", denied(r), brief(r));
  const fake = 900000100 + Math.floor(Math.random() * 800000);
  r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);

  console.log("── proved, with empty hands: the one function of four words");
  r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: null }, token);
  // ("soil" in a bed that is nobody's or would be its own, "theirs" in one that is somebody's: either way nothing is done)
  const refusedHere = (q) => q.status === 200 && q.json?.ok === false && (q.json.why === "soil" || q.json.why === "theirs") && q.json.key === key;
  ok("asked with three words, as a page built before asks: an answer, not an error, and nothing done", refusedHere(r) && Array.isArray(r.json.purse?.bag), brief(r));
  ok("…told with the plot as it stands", r.json?.plot?.plant === null && typeof r.json?.plot?.soil === "string", brief(r));
  for (const [word, how] of [[true, "given"], [false, "withheld"], [null, "nothing"]]) {
    r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: null, p_sure: word }, token);
    ok(`asked with the fourth word ${how}: the database knows the word, and with empty hands nothing is dug`, refusedHere(r), brief(r));
  }
  r = await rpc("town_tend", { p_x: at[0], p_y: at[1], p_timing: { hits: 3, misses: 0, secs: 2 }, p_sure: "maybe" }, token);
  // ("yes" would do: the database reads it as true. "maybe" is neither)
  ok("a word that is neither yes nor no is no call at all", r.status >= 400 && r.status < 500 && !refusedHere(r), brief(r));
  r = await rpc("town_tend", { p_x: 131, p_y: 4, p_timing: null, p_sure: true }, token);
  ok("a tile that is no plot is refused, the word given", r.status === 200 && r.json?.ok === false && r.json.why === "none", brief(r));

  console.log("── what is there afterwards, read with the service key");
  r = await svc(`/rest/v1/town_plays?member_id=eq.${user}&select=id`);
  ok("nothing was written down for it", r.status === 200 && r.json?.length === 0, r.status);
  const after = await plotNow();
  ok("the plot asked about is as it was", after === before, { before, after });
  r = await svc(`/rest/v1/town_beds?member_id=eq.${user}&select=bed`);
  ok("no bed is the throwaway's", r.status === 200 && r.json?.length === 0, r.status);
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    const prof = await svc(`/rest/v1/profiles?id=eq.${user}&select=id`);
    ok("the throwaway account is deleted, and its profile and purse went with it", d.status < 300 && left.json?.length === 0 && prof.json?.length === 0, { deleted: d.status, purse: left.json?.length, profile: prof.json?.length });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
