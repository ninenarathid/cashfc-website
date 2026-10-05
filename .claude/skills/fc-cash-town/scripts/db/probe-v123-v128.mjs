// A read-only look at the live database after v123, v124 or v128: what each file adds is there, closed to a browser,
// and nobody signed out is let in. Touches nothing; prints no key, no name and no id.
//   node probe-v123-v128.mjs v123|v124|v128
import fs from "node:fs";
const env = Object.fromEntries(fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]));
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 500))}`); };
const get = async (path, key = SERVICE) => { const r = await fetch(`${URL_}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: "0-999" } }); return { status: r.status, body: await r.json().catch(() => null) }; };
const rpc = async (fn, args = {}) => { const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify(args) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
const knobs = async (like) => Object.fromEntries(((await get(`/rest/v1/town_knobs?select=key,value&key=like.${like}*`)).body ?? []).map((k) => [k.key, k.value]));
const thing = async (key) => (await get(`/rest/v1/town_things?select=doc&key=eq.${key}`)).body?.[0]?.doc;
/** A table is there for the service key, and no browser's: somebody signed out gets nothing of it. */
const closed = async (table) => {
  const mine = await get(`/rest/v1/${table}?select=*&limit=1`), theirs = await get(`/rest/v1/${table}?select=*&limit=1`, ANON);
  ok(`\`${table}\` is there, and no browser's to read`, mine.status < 300 && Array.isArray(mine.body) && (theirs.status >= 400 || (Array.isArray(theirs.body) && theirs.body.length === 0)), { mine: mine.status, theirs: theirs.status });
  return Array.isArray(mine.body) ? mine.body : [];
};
const refused = async (fn, args) => { const r = await rpc(fn, args); ok(`somebody signed out is refused \`${fn}\``, r.status === 401 || r.status === 403 || r.body?.code === "42501", { status: r.status, code: r.body?.code }); };
const missing = async (fn, args, why) => { const r = await rpc(fn, args); ok(why, r.status === 404 || r.body?.code === "PGRST202", { status: r.status, code: r.body?.code }); };

const which = process.argv[2];
if (which === "v123") {
  const k = await knobs("wish_");
  ok("twelve knobs, as the file sets them", JSON.stringify(Object.keys(k).sort()) === JSON.stringify(["wish_carry", "wish_counts", "wish_feast", "wish_least", "wish_minutes", "wish_more", "wish_people", "wish_rounds", "wish_share", "wish_sprout", "wish_swift", "wish_within"])
    && k.wish_share === 30 && k.wish_least === 100 && k.wish_minutes === 180 && k.wish_rounds === 3, k);
  const f = await thing("fountain");
  ok("the fountain is kept, with its pot", !!f && typeof f.pot === "number" && Array.isArray(f.blessings), f && Object.keys(f));
  await closed("town_blessings");
  await closed("town_wish_notes");
  for (const [fn, args] of [["town_fountain", {}], ["town_toss", { p_wish: "lucky", p_coins: 1 }], ["town_cheer", { p_note: 1, p_coins: 1 }], ["town_wish_report", { p_note: 1 }], ["town_wish_unsay", { p_note: 1 }], ["town_wish_hide", { p_note: 1, p_hidden: true }]]) await refused(fn, args);
  await missing("wishes", {}, "the rules are not to be asked from outside (town.wishes)");
  if (f) console.log(`\n  the pot: ${f.pot} of its goal today; ${f.blessings.length} blessing(s) running; ${f.given ?? 0} given today`);
} else if (which === "v124") {
  const k = await knobs("market_");
  ok("nineteen knobs, as the file sets them", Object.keys(k).length === 19 && k.market_floor === 40 && k.market_margin === 150 && k.market_ceil_a === 150 && k.market_fall === 25 && k.market_rise === 10 && k.market_crop === 30, k);
  const m = await thing("market");
  ok("the market is kept: the round its prices are of, where each stands, what was left this round", !!m && typeof m.round === "number" && !!m.at && !!m.sold, m && Object.keys(m));
  const log = await closed("town_market_log");
  for (const [fn, args] of [["town_stall", {}], ["town_leave", { p_slot: 0, p_n: 1 }], ["town_take_back", { p_at: 0 }]]) await refused(fn, args);
  await missing("market_now", {}, "the rules are not to be asked from outside (town.market_now)");
  if (m) {
    const moved = Object.entries(m.at).filter(([, s]) => s.f !== 100).map(([id, s]) => `${id} ${s.f}`);
    console.log(`\n  round ${m.round}; ${Object.keys(m.sold).length} thing(s) left to be sold this round; prices off the usual: ${moved.length ? moved.join(", ") : "none yet"}; rounds written down: ${log.length ? "some" : "none yet"}`);
  }
} else if (which === "v128") {
  const k = await knobs("notice_");
  ok("eleven knobs, as the file sets them", Object.keys(k).length === 11 && k.notice_slots === 3 && k.notice_fee === 10 && k.notice_hours === 72 && k.notice_cap === 10 && k.notice_slot_price === 100, k);
  const seen = await thing("seen");
  ok("what the village has met is kept", !!seen && typeof seen.at === "number" && !!seen.ids, seen && Object.keys(seen));
  const up = await closed("town_notices");
  await closed("town_notice_books");
  const sold = await closed("town_notice_sales");
  for (const [fn, args] of [["town_notices", {}], ["town_notice_post", { p_kind: "sell", p_item: "kangkong", p_n: 1, p_price: 1 }], ["town_notice_buy", { p_id: 1, p_n: 1 }], ["town_notice_fill", { p_id: 1, p_n: 1 }],
    ["town_notice_fetch", { p_id: 1 }], ["town_notice_down", { p_id: 1 }], ["town_notice_collect", {}], ["town_notice_slot", {}]]) await refused(fn, args);
  await missing("seen_now", {}, "the rules are not to be asked from outside (town.seen_now)");
  if (seen) console.log(`\n  met so far: ${Object.keys(seen.ids).length} thing(s) (${seen.at ? "looked for" : "not looked for yet"}); notices up: ${up.length ? "some" : "none yet"}; sold over the board: ${sold.length ? "some" : "nothing yet"}`);
} else { console.log("usage: node probe-v123-v128.mjs v123|v124|v128"); process.exit(2); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
