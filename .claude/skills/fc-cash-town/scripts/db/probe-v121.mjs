// A live probe of v121 (every deed written down): as anon, and as a throwaway member with a proved character who is
// no admin. Touches only what it makes (one throwaway account, the purse row its first call makes, and the lines its
// own two deeds leave) and deletes all of it in `finally`. With empty hands every one of the twenty-one functions is
// asked something the rules refuse, about nothing that is anybody's (a plot is asked about only if it has no plant:
// with empty hands a ripe plant in a bed that is nobody's could be picked), and no line may come of it. Then one worm
// is put in the throwaway's own bag with the service key, taken into the hand and thrown away: the two lines that
// leaves are the only ones it ever has, and they go with the account. It never makes an admin, buys nothing, and
// leaves the village's things alone. Prints no key, no token, no name and no id.
//   node probe-v121.mjs
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
/** An answer as it is told, with nothing of the purse in it (for what is printed when a check fails). */
const brief = (r) => ({ status: r.status, code: r.code, ok: r.json?.ok, why: r.json?.why });

let user = null;
try {
  console.log("── the game, the deeds, and a plot to ask about");
  let r = await svc(`/rest/v1/town_knobs?key=eq.game_open&select=value`);
  const open = r.json?.[0]?.value > 0;
  ok("the game is open to members: a throwaway who is no admin can ask", open, r.json);
  r = await svc(`/rest/v1/town_deeds?select=id&limit=1`);
  ok("the deeds are there, and the site's own key reads them", r.status === 200, r.status);
  if (!open || r.status >= 300) throw new Error("nothing to ask about");
  r = await svc(`/rest/v1/town_plots?select=x,y,plant`);
  const kept = new Map((r.json ?? []).map((p) => [`${p.x},${p.y}`, p]));
  let at = null;
  // (the first bed begins at 132,4, seven plots by seven; the next along at 140,4)
  for (const bx of [132, 140, 148, 156]) for (let y = 4; y < 11 && !at; y++) for (let x = bx; x < bx + 7 && !at; x++) if (!kept.get(`${x},${y}`)?.plant) at = [x, y];
  ok("a plot with no plant in it is found", !!at && r.status === 200, { status: r.status, kept: kept.size });
  if (!at) throw new Error("no plot to ask about");
  const villageNow = async () => JSON.stringify((await svc(`/rest/v1/town_things?select=key,doc&order=key`)).json);
  const plotNow = async () => JSON.stringify((await svc(`/rest/v1/town_plots?x=eq.${at[0]}&y=eq.${at[1]}&select=soil,plant,changed`)).json);
  const plotWas = await plotNow();

  console.log("── as anon");
  r = await call(`/rest/v1/town_deeds?select=id&limit=1`);
  ok("somebody signed out cannot read the deeds", denied(r), brief(r));
  r = await call(`/rest/v1/town_deeds`, { method: "POST", body: { what: "pour", thing: "bucket", n: 40 } });
  ok("…nor write one", denied(r), brief(r));
  r = await rpc("town_chore", { p_x: 16, p_y: 38 });
  ok("…nor carry water", denied(r), brief(r));
  for (const fn of ["note", "tally", "deed_th"]) {
    r = await rpc(fn, {});
    ok(`town.${fn} is not a browser's to call`, r.status === 404, r.status);
  }
  r = await call(`/rest/v1/doings?select=what&limit=1`);
  ok("town.doings is not a browser's to read", r.status === 404, r.status);

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
  r = await rpc("town_chore", { p_x: 16, p_y: 38 }, token);
  ok("with no proved character, carrying water does not answer", denied(r), brief(r));
  r = await call(`/rest/v1/town_deeds?select=id&limit=1`, { token });
  ok("…and the deeds are not theirs to read", denied(r), brief(r));
  const fake = 900000100 + Math.floor(Math.random() * 800000);
  r = await svc(`/rest/v1/profiles?id=eq.${user}`, { method: "PATCH", body: { character_id: fake, character_name: "Probe Popoto", character_verified_at: new Date().toISOString() }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not prove the throwaway's character (${r.status} ${r.code})`);
  r = await call(`/rest/v1/town_deeds?select=id&limit=1`, { token });
  ok("proved, they still cannot read the deeds", denied(r), brief(r));
  const village = await villageNow();

  console.log("── proved, with empty hands: every one of the twenty-one, asked what the rules refuse");
  const mine = async () => (await svc(`/rest/v1/town_deeds?member_id=eq.${user}&select=what,thing,n,coins,doc,at&order=id`)).json ?? null;
  // (each: the function, what it is asked, and whether the answer is a refusal or, for two that do nothing with empty hands, a plain yes)
  const asks = [
    ["town_buy", { p_item: "megaNothing", p_n: 1 }, false], ["town_leave", { p_slot: 0, p_n: 1 }, false], ["town_take_back", { p_at: 0 }, false],
    ["town_collect", {}, false], ["town_hold", { p_slot: 0 }, false], ["town_hold", { p_slot: null }, true], ["town_wear", { p_slot: 0 }, false],
    ["town_take_off", { p_item: "basket" }, false], ["town_drop", { p_slot: 0 }, false], ["town_give", { p_slot: 0, p_n: 1 }, false], ["town_hint", {}, false],
    ["town_sit", { p_slot: 0, p_seated: true }, false], ["town_get_up", { p_company: 0 }, true], ["town_read", { p_slot: 0 }, false],
    ["town_cast", { p_bait: "worm", p_x: 16, p_y: 38, p_rain: false }, false], ["town_tend", { p_x: at[0], p_y: at[1], p_timing: null }, false],
    ["town_tend", { p_x: at[0], p_y: at[1], p_timing: null, p_sure: true }, false], ["town_chore", { p_x: 16, p_y: 38 }, false], ["town_chore", { p_x: 157, p_y: 24 }, false],
    ["town_pot_down", { p_x: 50, p_y: 50 }, false], ["town_pot_ladle", { p_id: 987654321, p_x: 0, p_y: 0 }, false], ["town_pot_take", { p_id: 987654321, p_x: 0, p_y: 0 }, false],
    ["town_serve", { p_slot: 0 }, false], ["town_open", { p_slot: 0 }, false],
  ];
  const odd = [];
  for (const [fn, args, yes] of asks) {
    r = await rpc(fn, args, token);
    if (!(r.status === 200 && r.json?.ok === yes)) odd.push({ fn, ...brief(r) });
  }
  ok(`${asks.length} calls of the twenty-one functions: each answers, an answer and not an error, and nothing is done`, odd.length === 0 && new Set(asks.map((a) => a[0])).size === 21, odd.slice(0, 4));
  let lines = await mine();
  ok("no line was written for any of it", Array.isArray(lines) && lines.length === 0, lines);
  ok("the village's things are as they were: the stall, the order, the well, what was found", (await villageNow()) === village);
  ok("the plot asked about is as it was", (await plotNow()) === plotWas);
  r = await svc(`/rest/v1/town_lines?member_id=eq.${user}&select=member_id`);
  ok("no line is in the water for it", r.status === 200 && r.json?.length === 0, r.status);

  console.log("── a worm of its own, taken into the hand and thrown away");
  r = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=doc`);
  const doc = r.json?.[0]?.doc;
  if (!doc || !Array.isArray(doc.bag)) throw new Error("the throwaway has no purse to put a worm in");
  r = await svc(`/rest/v1/town_purses?member_id=eq.${user}`, { method: "PATCH", body: { doc: { ...doc, bag: [{ item: "worm", n: 1 }, ...doc.bag.slice(1)] } }, prefer: "return=minimal" });
  if (r.status >= 300) throw new Error(`could not put a worm in the throwaway's bag (${r.status} ${r.code})`);
  const sent = Date.now();
  r = await rpc("town_hold", { p_slot: 0 }, token);
  ok("the worm is taken into the hand, answered as before", r.status === 200 && r.json?.ok === true && r.json.purse?.hand === "worm", brief(r));
  r = await rpc("town_drop", { p_slot: 0 }, token);
  ok("…and thrown away", r.status === 200 && r.json?.ok === true && r.json.purse?.bag?.[0] === null, brief(r));
  lines = await mine();
  ok("two lines were written: the worm held, the worm dropped", lines?.length === 2 && lines[0].what === "hold" && lines[0].thing === "worm" && lines[1].what === "drop" && lines[1].thing === "worm"
    && Number(lines[1].n) === 1 && Number(lines[1].coins) === 0, lines);
  ok("…by the database's clock, now", lines?.length === 2 && lines.every((d) => Math.abs(new Date(d.at).getTime() - sent) < 120_000), lines?.map((d) => d.at));

  console.log("── what the members' own play has left there");
  const all = [];
  for (let from = 0; ; from += 1000) {
    const page = await svc(`/rest/v1/town_deeds?select=what,thing,n,coins&member_id=neq.${user}&order=id&limit=1000&offset=${from}`);
    all.push(...(page.json ?? []));
    if ((page.json ?? []).length < 1000 || from > 20000) break;
  }
  const by = {};
  for (const d of all) by[d.what] = (by[d.what] ?? 0) + 1;
  console.log(`   ${all.length} lines so far: ${Object.entries(by).sort((a, b) => b[1] - a[1]).map(([w, n]) => `${w} ${n}`).join(", ") || "none yet"}`);
  const KNOWN = new Set(["buy", "leave", "take_back", "collect", "give", "hint", "hold", "put_away", "wear", "take_off", "drop", "eat", "get_up", "read", "cast", "draw", "pour", "fill",
    "sow", "water", "feed", "cure", "pick", "pull", "uproot", "pot_down", "ladle", "pot_take", "serve", "open"]);
  ok("every line is of a deed the file names, with how many and its coins", all.every((d) => KNOWN.has(d.what) && d.n !== null && d.coins !== null), Object.keys(by).filter((w) => !KNOWN.has(w)));
  ok("…and none of a plot cleared or tilled: those are written down with their game", !by.clear && !by.till, by);
} catch (e) {
  ok("the probe ran", false, e.message);
} finally {
  if (user) {
    const d = await svc(`/auth/v1/admin/users/${user}`, { method: "DELETE" });
    const left = await svc(`/rest/v1/town_purses?member_id=eq.${user}&select=member_id`);
    const prof = await svc(`/rest/v1/profiles?id=eq.${user}&select=id`);
    const deeds = await svc(`/rest/v1/town_deeds?member_id=eq.${user}&select=id`);
    ok("the throwaway account is deleted, and its profile, its purse and its two lines went with it", d.status < 300 && left.json?.length === 0 && prof.json?.length === 0 && deeds.json?.length === 0,
      { deleted: d.status, purse: left.json?.length, profile: prof.json?.length, deeds: deeds.json?.length });
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
