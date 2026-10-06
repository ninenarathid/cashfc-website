// A read-only look at the live database after v142 (a stall of one's own, under a sign held up): its five knobs are
// there with the file's numbers; its table is there and closed; nobody signed out may call its seven functions; its
// rules are not to be asked from outside; the tally has its words. Then what the town has made of it so far, as counts.
// Touches nothing; prints no key, no name, no id.
//   node probe-v142.mjs
//   node probe-v142.mjs wait     (asks every twenty seconds until the knobs are there, then looks)
import fs from "node:fs";
const REPO = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const env = Object.fromEntries(fs.readFileSync(`${REPO}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const KNOBS = { shop_lines: 6, shop_reach: 3, shop_most: 200, shop_quiet: 150, shop_every: 50 };
const NOBODY = "00000000-0000-0000-0000-000000000000";
const FNS = [["town_shop", {}], ["town_shop_open", { p_lines: [], p_x: 30, p_y: 38 }], ["town_shop_close", {}], ["town_shop_beat", {}], ["town_shop_look", { p_who: NOBODY }],
  ["town_shop_buy", { p_who: NOBODY, p_item: "kangkong", p_n: 1, p_x: 30, p_y: 38 }], ["town_shop_sell", { p_who: NOBODY, p_item: "kangkong", p_n: 1, p_x: 30, p_y: 38 }]];
const RULES = [["shop_knobs", {}], ["shop_open", { p_purse: {}, p_me: "x", p_ask: [], p_x: 30, p_y: 38, p_now: 0, p_seen: [], p_k: {} }], ["shop_of", { p_member: NOBODY, p_hold: false }],
  ["shop_deal", { p_me: NOBODY, p_who: NOBODY, p_kind: "sell", p_item: "kangkong", p_n: 1, p_x: 30, p_y: 38 }], ["shops_told", { p_me: NOBODY }]];
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-4999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };
const knobsNow = async () => (await get(`/rest/v1/town_knobs?select=key,value&key=like.shop_*`)).body ?? [];

if (process.argv[2] === "wait") {
  for (let i = 0; i < 2000 && (await knobsNow()).length < Object.keys(KNOBS).length; i++) await new Promise((r) => setTimeout(r, 20000));
  // (a look within seconds of a run is answered 404 for new tables and functions until PostgREST has read the schema again)
  await new Promise((r) => setTimeout(r, 40000));
}
const knobs = await knobsNow();
if (knobs.length < Object.keys(KNOBS).length) console.log(`\n  v142 has not run yet: ${knobs.length} of its ${Object.keys(KNOBS).length} knobs are there. Nothing more to look at.`);
else {
  const odd = Object.entries(KNOBS).filter(([key, value]) => knobs.find((k) => k.key === key)?.value !== value).map(([key]) => key);
  ok("the stall's five knobs are there, with the file's numbers", knobs.length === 5 && odd.length === 0, { n: knobs.length, odd });
  const kept = await get(`/rest/v1/town_shops?select=member_id,lines,beat,took,paid`);
  ok("the table town_shops is there, and the site's key reads it", kept.status >= 200 && kept.status < 300 && Array.isArray(kept.body), kept.status);
  const anon = await get(`/rest/v1/town_shops?select=*`, ANON);
  ok("somebody signed out reads nothing of it", anon.status >= 400 || (Array.isArray(anon.body) && anon.body.length === 0), { status: anon.status, n: anon.body?.length });
  for (const [fn, args] of FNS) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(args) });
    const j = await r.json().catch(() => ({}));
    // (a function that is not there answers 404 with PGRST202: that is not a refusal)
    ok(`somebody signed out is refused ${fn}, which is there`, (r.status === 401 || r.status === 403 || j.code === "42501") && j.code !== "PGRST202", { status: r.status, code: j.code });
  }
  for (const [fn, args] of RULES) {
    const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json", "Content-Profile": "town" }, body: JSON.stringify(args) });
    ok(`the rule town.${fn} is not to be asked from outside`, r.status >= 400, r.status);
  }
  // (the board's own things stand as they did: a stall's prices and what may be wanted are theirs)
  const board = (await get(`/rest/v1/town_knobs?select=key,value&key=in.(notice_cap,notice_capless)`)).body ?? [];
  ok("the notice board's most for a price is there for the stall to go by", board.length === 2, board);
  // what the town has made of it so far (counts only)
  const deeds = (await get(`/rest/v1/town_deeds?select=what,n,coins,member_id,at&what=like.shop_*&order=id.asc`)).body ?? [];
  const n = (what) => deeds.filter((d) => d.what === what).length;
  const open = (kept.body ?? []).filter((s) => Date.now() - Number(s.beat) < KNOBS.shop_quiet * 1000);
  const sum = deeds.reduce((t, d) => t + Number(d.coins), 0);
  console.log(`\n  stalls kept now: ${(kept.body ?? []).length}, open (heard from within ${KNOBS.shop_quiet} s): ${open.length}, with ${open.reduce((t, s) => t + (s.lines ?? []).length, 0)} lines`);
  console.log(`  opened ${n("shop_open")} times and shut ${n("shop_close")} times, by ${new Set(deeds.filter((d) => d.what === "shop_open").map((d) => d.member_id)).size} member(s)`);
  console.log(`  bought at a stall ${n("shop_buy")} times (${deeds.filter((d) => d.what === "shop_buy").reduce((t, d) => t - Number(d.coins), 0)} coins), brought to one ${n("shop_sell")} times (${deeds.filter((d) => d.what === "shop_sell").reduce((t, d) => t + Number(d.coins), 0)} coins)`);
  if (deeds.length) ok("every sale is written down twice, and all that the deeds say of coins comes to nothing", n("shop_buy") === n("shop_sold") && n("shop_sell") === n("shop_bought") && sum === 0, { buy: n("shop_buy"), sold: n("shop_sold"), sell: n("shop_sell"), bought: n("shop_bought"), sum });
}
console.log(`\n${pass} passed, ${fail} failed`);
// (not process.exit: on Windows a fetch still closing makes node die of an assertion with code 127 after its last line)
process.exitCode = fail ? 1 : 0;
