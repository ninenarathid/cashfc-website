// A read-only look at the live database after v334 (the auction's rounds close together). Touches nothing: every call
// either reads with the site's key, or is made signed out and is refused before anything runs, or is a bid with no
// round (p_auction null), which v297 and v334 alike answer before any row is held. Prints no key, no name and no id.
//   node probe-v334.mjs
// What only the SQL editor can say (the function's text, its privileges) is the file's foot: the owner runs those.
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail)).slice(0, 300)}`); };
const head = (key) => ({ apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" });
const ask = async (key, fn, body = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: head(key), body: JSON.stringify(body) }); return { status: r.status, text: await r.text() }; };
const read = async (key, path) => { const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: head(key) }); const text = await r.text(); let rows = null; try { rows = JSON.parse(text); } catch { /* not json */ } return { status: r.status, rows, text }; };

const anon = await ask(ANON, "town_bid", { p_auction: null, p_amount: null, p_request: null });
ok("town_bid refuses whoever is signed out", anon.status === 401 || anon.status === 403 || /permission denied/i.test(anon.text), `${anon.status} ${anon.text.slice(0, 160)}`);
const site = await ask(SERVICE, "town_bid", { p_auction: null, p_amount: null, p_request: null });
ok("town_bid is there with its three arguments (not missing)", !/PGRST202|Could not find the function/i.test(site.text), `${site.status} ${site.text.slice(0, 160)}`);
const rounds = await read(SERVICE, "town_auctions?select=id,design,closes_at,hard_close,settled_at&settled_at=is.null&order=id");
ok("the open rounds are read", Array.isArray(rounds.rows), rounds.text.slice(0, 160));
const at = (id) => rounds.rows?.find((r) => r.id === id);
for (const [id, design] of [[3, "moonkeeper"], [4, "mapleregent"]]) {
  const r = at(id);
  ok(`round ${id} (${design}) unsettled, closing 2026-11-15 20:00 Bangkok, hard close 20:30 (v334 changes no row)`, r && r.design === design && Date.parse(r.closes_at) === Date.parse("2026-11-15T13:00:00Z") && Date.parse(r.hard_close) === Date.parse("2026-11-15T13:30:00Z"), r);
}
const bids = await read(SERVICE, "town_bids?select=auction_id");
if (Array.isArray(bids.rows)) {
  const n = {};
  for (const b of bids.rows) n[b.auction_id] = (n[b.auction_id] ?? 0) + 1;
  console.log(`  (bids standing by round: ${JSON.stringify(n)})`);
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
