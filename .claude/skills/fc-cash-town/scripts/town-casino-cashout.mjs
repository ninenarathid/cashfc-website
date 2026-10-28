// Casino Coins back into Popoto coins at the counter (v312, the owner, 2026-10-28: "โอเคแล้ว ทำขึ้นมาเลย"), in real
// browsers against the stand-in with v312 in it (town-bench.mjs 3299, v312 last in BENCH_EXTRA). A tester takes today's
// free Casino Coins and changes 500 Popoto coins in: the counter says how many may go back (the free hundred kept for
// spinning), 120 go back for 108, "all" fills what may go. Pictures at 1280x860, 384x730 and 360x640.
//
//   node town-casino-cashout.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3201", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView";
const sql = async (text, params = []) => {
  const r = await (await fetch(`${BENCH}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: text, params }) })).json();
  if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`);
  return r.rows;
};
const casino = (X) => X.evaluate(`${V}.casino()`);
const middle = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
const click = (X, sel) => X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return false; e.click(); return true; })()`);
const clickText = (X, words) => X.evaluate(`(() => { const b = [...document.querySelectorAll(".casino-in-town button")].find((e) => e.offsetParent && e.innerText.includes(${JSON.stringify(words)}) && !e.disabled); if (!b) return false; b.click(); return true; })()`);
const text = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ""`);
const account = async (id) => (await sql(`select chips, free_left from public.casino_live_accounts where user_id = $1`, [id]))[0];

async function run(label, size, letter) {
  await sql(`do $f$ begin if to_regclass('public.casino_live_seats') is not null then delete from public.casino_live_seats; end if; end $f$`);
  const X = await browser(`cashout-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("keeper", () => X.evaluate("!!window.__townKeeper && window.__townKeeper.ready()"), 60000);
    const me = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
    await sql(`select town.purse_of($1, true)`, [me]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [me]);
    await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [me]);
    await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [me]);
    await sql(`update public.casino_live_accounts set chips = 0, free_left = 0 where user_id = $1`, [me]);
    await X.evaluate(`window.__townKeeper.purseAgain?.()`); await sleep(800);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1200);
    await X.evaluate(`${V}.warp(68, 35)`); await sleep(900);
    const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === 68 && g.to[1] === 34);
    await tap(X, ...middle(gate));
    await until("in the casino", async () => (await casino(X)).place === "casino", 20000); await sleep(1500);
    await click(X, ".casino-chip-count");
    await until("the counter", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "desk"`), 8000);
    ok(`${label}: the buy line no longer says it cannot go back`, !/แลกกลับไม่ได้/.test(await text(X, ".casino-chips")), await text(X, ".casino-chips-rate"));
    await click(X, ".casino-chips-free"); await sleep(1500);
    await click(X, ".casino-chips-packs button:nth-child(2)"); await sleep(300);
    await click(X, ".casino-chips-buy"); await sleep(2000);
    ok(`${label}: 600 held, 100 of them free`, JSON.stringify(await account(me)) === JSON.stringify({ chips: 600, free_left: 100 }), await account(me));
    const can = await text(X, ".casino-cashout");
    ok(`${label}: ten for nine, said`, /แลก 10 Casino Coin ได้ 9 Popoto coin/.test(can), can);
    ok(`${label}: 500 may go back, the free hundred kept for spinning`, /แลกคืนได้ 500/.test(can) && /เหรียญฟรีที่เหลือ 100 แลกคืนไม่ได้ ใช้หมุนก่อน/.test(can), can);
    await X.evaluate(`(() => { const i = document.querySelector('.casino-cashout input'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, '120'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(300);
    ok(`${label}: 120 shows what it gives`, /ได้ 108/.test(await text(X, ".casino-cashout-go")), await text(X, ".casino-cashout-go"));
    await X.shot(`${OUT}/cashout-1-${label}.png`);
    const coins0 = Number((await sql(`select coins from public.town_purses where member_id = $1`, [me]))[0].coins);
    await click(X, ".casino-cashout-go"); await sleep(1800);
    ok(`${label}: 120 back for 108`, (await account(me)).chips === 480 && Number((await sql(`select coins from public.town_purses where member_id = $1`, [me]))[0].coins) === coins0 + 108, { acc: await account(me), coins0 });
    ok(`${label}: and said`, /แลกคืน 120 Casino Coin ได้ 108 Popoto coin/.test(await text(X, ".casino-chips-note")), await text(X, ".casino-chips-note"));
    ok(`${label}: now 380 may go`, /แลกคืนได้ 380/.test(await text(X, ".casino-cashout")), await text(X, ".casino-cashout"));
    await clickText(X, "ทั้งหมด"); await sleep(300);
    ok(`${label}: "all" fills what may go`, /ได้ 342/.test(await text(X, ".casino-cashout-go")), await text(X, ".casino-cashout-go"));
    await X.evaluate(`document.querySelector(".casino-in-town .casino-chips-note")?.scrollIntoView({ block: "center" })`); await sleep(300);
    await X.shot(`${OUT}/cashout-2-${label}.png`);
  } finally { await X.quit(); }
}

await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100 where id = 1`);
for (const [label, size, letter] of [["1280", { width: 1280, height: 860 }, "Q"], ["384", { width: 384, height: 730, mobile: true, dpr: 2 }, "R"], ["360", { width: 360, height: 640, mobile: true, dpr: 2 }, "S"]]) await run(label, size, letter);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
