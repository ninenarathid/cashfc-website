// A stall under a sign as a member will have it: two tabs of one browser on the dev test room, kept by the database's
// keeper against the stand-in (scripts/db/town-bench.mjs, with v142 in it), not by the browser's trial:
//
// - the keeper knows of stalls before a sign is thought of, and the panel offers one;
// - a stall opened from the panel is the database's (its row, its deed), with the sign held up, and nothing has left
//   the bag or the purse;
// - somebody else's keeper reads it, buys at it and brings to it: both purses as the database keeps them, all of the
//   coins, each sale written down twice;
// - the stall's keeper is told on their own page (through the room), and their panel counts it;
// - their page says it is still there, and the database hears it; unheard from too long, the stall is shut, and the
//   sign comes down by itself;
// - with a stall up nothing walks its keeper off; the sign taken down takes the database's stall with it.
//
// A stand-in's members are not in the room under their own ids (a tester's id there is not the member's here), so a
// comer is driven by the keeper's own handle, and the room's word of a sale goes to everybody.
//
//   BENCH_EXTRA=<v142's file> node db/town-bench.mjs 3197     (in the scratch folder: see db/README.md)
//   node town-sign-db.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3197"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView", C = "window.__cashTown", S = "window.__townSign";
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const count = (slots, item) => slots.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const click = async (X, sel) => { await X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`); await sleep(300); };
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=signsdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
  await until("the sign's own code has come", () => X.evaluate(`!!${S}`), 30000);
}
const who = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate(`${C}.me().id`)))}`)).json()).id;
const give = (id, coins, bag) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = public.town_purses.doc || jsonb_build_object('bag', $3::jsonb)`, [id, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10))]);
const purseOf = async (id) => { const [r] = await sql(`select coins, doc->'bag' as bag from public.town_purses where member_id = $1`, [id]); return r; };
const stall = async (id) => (await sql(`select x, y, lines, took::int as took, paid::int as paid, beat::text as beat from public.town_shops where member_id = $1`, [id]))[0] ?? null;
const deeds = (like) => sql(`select member_id, what, thing, n::int as n, coins::int as coins from public.town_deeds where what like $1 order by id`, [like]);
/** Ask the keeper to read again what the database gave it by another way (a purse set up by the check). */
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(300); };

const HERE = [30, 38], BY = [31, 39], AWAY = [28, 40];
const A = await browser("signdb", { width: 1280, height: 860 });
try {
  await enter(A, "S");
  const B = await A.tab("signdb-b");
  await enter(B, "T");
  const a = await who(A), b = await who(B);
  await sql(`delete from public.town_shops where true`);
  await sql(`delete from public.town_deeds where what like 'shop\\_%'`);
  await give(a, 80, [{ item: "kangkong", n: 12 }]);
  await give(b, 50, [{ item: "minnow", n: 4 }]);
  // (what the village has met is looked for again every ten minutes: the bags as they are now)
  await post("/bench/skip", { ms: 11 * 60_000 });
  await again(A);
  await again(B);
  await warp(A, ...HERE);
  await warp(B, ...BY);
  await until("the keeper has been told of stalls", () => A.evaluate(`!!${S}.shops()`), 15000).catch(() => {});
  const told = await A.evaluate(`${S}.shops()`);
  ok("the keeper knows of stalls before a sign is thought of: none of mine, the rules' numbers, what the uncle's shelf shows", told?.mine === null && told.lines === 6 && told.reach === 3 && told.seen.includes("worm"), told);
  await A.evaluate(`void ${S}.open("setup")`);
  await until("what may be wanted is read again", () => A.evaluate(`${S}.shops().seen.includes("minnow")`), 10000, 200).catch(() => {});
  ok("what may be wanted is read again as the panel opens: what is in the village's bags now", await A.evaluate(`${S}.shops().seen.includes("minnow") && ${S}.shops().seen.includes("kangkong")`));
  ok("and the panel offers a stall", await A.evaluate(`!document.querySelector('[data-sign-kind="shop"]').disabled`));
  await A.evaluate(`void ${S}.form("shop", "ผักสด", [{ kind: "sell", item: "kangkong", n: 10, price: 4 }, { kind: "buy", item: "minnow", n: 5, price: 6 }])`);
  await sleep(300);
  await click(A, "[data-sign-raise]");
  await until("the sign is up", async () => (await A.evaluate(`${C}.sign()`))?.kind === "shop", 10000, 200).catch(() => {});
  const kept = await stall(a);
  ok("a stall opened from the panel is the database's, on the tile I stand on, with the sign held up", (await A.evaluate(`${C}.sign()`))?.kind === "shop" && kept?.x === HERE[0] && kept.y === HERE[1]
    && JSON.stringify(kept.lines.map((l) => [l.kind, l.item, l.left, l.price])) === JSON.stringify([["sell", "kangkong", 10, 4], ["buy", "minnow", 5, 6]]), kept);
  const p0 = await purseOf(a);
  ok("nothing has left the bag or the purse for it, and its opening is written down", p0.coins === 80 && count(p0.bag, "kangkong") === 12 && (await deeds("shop\\_open")).length === 1, p0);
  await A.shot(`${OUT}/sign-db-mine.png`);
  await click(A, "[data-sign-close]");

  // somebody else's keeper comes to it
  await B.evaluate(`${K}.shopVisit(${JSON.stringify(a)}).then(() => null)`);
  const seen = await B.evaluate(`${K}.shopSeen()`);
  ok("somebody else's keeper reads it: what it sells and wants, and how many can change hands", JSON.stringify(seen?.told?.lines.map((l) => [l.kind, l.item, l.price, l.can])) === JSON.stringify([["sell", "kangkong", 4, 10], ["buy", "minnow", 6, 5]]), seen);
  const bought = await B.evaluate(`${K}.shopBuy(${JSON.stringify(a)}, "kangkong", 3, [${BY}])`);
  const pa = await purseOf(a), pb = await purseOf(b);
  ok("three bought: the comer's at once, twelve coins gone from one purse and all twelve in the other", bought.ok && bought.coins === 12 && pb.coins === 38 && count(pb.bag, "kangkong") === 3 && pa.coins === 92 && count(pa.bag, "kangkong") === 9, { bought: bought.ok ? bought.coins : bought, pa: pa.coins, pb: pb.coins });
  ok("the comer's own page has it too", (await B.evaluate(`${K}.purse().coins`)) === 38);
  await until("the stall's keeper is told", async () => /\+12/.test((await textOf(A, "[data-sign-toast]")) ?? ""), 12000, 200).catch(() => {});
  ok("the stall's keeper is told on their own page, through the room", /\+12/.test((await textOf(A, "[data-sign-toast]")) ?? "") && (await A.evaluate(`${K}.purse().coins`)) === 92, await textOf(A, "[data-sign-toast]"));
  const brought = await B.evaluate(`${K}.shopSell(${JSON.stringify(a)}, "minnow", 4, [${BY}])`);
  ok("four minnows brought: twenty-four coins out of the keeper's purse into the comer's", brought.ok && brought.coins === 24 && (await purseOf(b)).coins === 62 && (await purseOf(a)).coins === 68 && count((await purseOf(a)).bag, "minnow") === 4, brought);
  const written = await deeds("shop\\_%");
  ok("each sale is written down twice, the comer's line and the keeper's", JSON.stringify(written.slice(1).map((d) => [d.member_id === a ? "a" : "b", d.what, d.thing, d.n, d.coins]))
    === JSON.stringify([["b", "shop_buy", "kangkong", 3, -12], ["a", "shop_sold", "kangkong", 3, 12], ["b", "shop_sell", "minnow", 4, 24], ["a", "shop_bought", "minnow", 4, -24]]), written);
  await A.evaluate(`void ${S}.open("mine")`);
  await until("the keeper's panel counts it", async () => (await A.evaluate(`document.querySelector("[data-sign-paid]")?.dataset.signPaid`)) === "24", 12000, 200).catch(() => {});
  const mine = await A.evaluate(`({ left: [...document.querySelectorAll("[data-sign-mine] [data-line]")].map((l) => [l.dataset.line, Number(l.dataset.left)]), took: document.querySelector("[data-sign-took]")?.dataset.signTook, paid: document.querySelector("[data-sign-paid]")?.dataset.signPaid })`);
  ok("and their panel counts it: seven and one left, twelve taken, twenty-four paid", JSON.stringify(mine) === JSON.stringify({ left: [["kangkong", 7], ["minnow", 1]], took: "12", paid: "24" }), mine);
  await click(A, "[data-sign-close]");
  ok("from too far off nothing is bought", (await B.evaluate(`${K}.shopBuy(${JSON.stringify(a)}, "kangkong", 1, [${HERE[0] + 9}, ${HERE[1]}])`)).why === "far");

  // heard from, and not
  const beat0 = (await stall(a)).beat;
  await post("/bench/skip", { ms: 60_000 });
  await A.evaluate(`void ${K}.shopBeater()()`);
  await sleep(800);
  ok("the page says it is still there, and the database hears it", Number((await stall(a)).beat) >= Number(beat0) + 60_000, { was: beat0, is: (await stall(a)).beat });
  await post("/bench/skip", { ms: 200_000 });
  ok("unheard from too long, the stall is shut to whoever comes", (await B.evaluate(`${K}.shopBuy(${JSON.stringify(a)}, "kangkong", 1, [${BY}])`)).why === "shut");
  await A.evaluate(`${K}.shopLook().then(() => null)`);
  await until("the sign comes down by itself", async () => (await A.evaluate(`${C}.sign()`)) === null, 15000, 300).catch(() => {});
  ok("and its keeper's sign comes down by itself", (await A.evaluate(`${C}.sign()`)) === null && (await A.evaluate(`${S}.shops().mine`)) === null);

  // walking takes the sign down, and the database's stall with it
  await A.evaluate(`void ${S}.form("shop", "ผักสด", [{ kind: "sell", item: "kangkong", n: 2, price: 3 }])`);
  await sleep(300);
  await A.evaluate(`void ${S}.raise()`);
  await until("a second stall is up", async () => !!(await stall(a)) && (await A.evaluate(`${C}.sign()`))?.kind === "shop", 10000, 200).catch(() => {});
  const second = await stall(a);
  const walked = await A.evaluate(`${V}.walk(${AWAY[0]}, ${AWAY[1]})`);
  await sleep(600);
  ok("with a stall up nothing walks its keeper off: the sign and the database's stall stay", walked === false && (await A.evaluate(`${C}.sign()`))?.kind === "shop" && !!(await stall(a)));
  await A.evaluate(`void ${C}.lowerSign()`);
  await until("the stall is gone from the database", async () => (await stall(a)) === null, 10000, 200).catch(() => {});
  ok("the sign taken down takes the database's stall with it, written down", !!second && (await A.evaluate(`${C}.sign()`)) === null && (await stall(a)) === null && (await deeds("shop\\_close")).length >= 1, { second: !!second, row: await stall(a) });
} catch (e) {
  fail++;
  console.log(`  FAIL the check stopped: ${e?.stack ?? e}`);
  await A.shot(`${OUT}/sign-db-stopped.png`).catch(() => {});
} finally {
  await A.quit();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
