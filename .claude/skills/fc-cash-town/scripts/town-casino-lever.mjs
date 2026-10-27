// The slot's lever (the owner, 2026-10-27: "เปลี่ยนการกดปั่นเป็นการ ดึงคันโยกโดยเปลี่ยน UI ให้เหมือนเครื่อง slot machine
// จริงๆ"), in a real browser against the stand-in (the bench of town-casino-chips.mjs). A tester sits at a machine, takes
// today's free Casino Coins at the counter, comes back; the lever is dragged half way (nothing spins), let go (it springs
// back), then dragged all the way (a spin, paid in Casino Coins). Pictures of each at 1280x860,
// 384x730 and 360x640.
//
//   node town-casino-lever.mjs <base> <outdir> [bench]
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
const clickText = (X, words) => X.evaluate(`(() => { const b = [...document.querySelectorAll(".casino-in-town button")].find((e) => e.offsetParent && e.innerText.includes(${JSON.stringify(words)}) && !e.disabled); if (!b) return false; b.click(); return true; })()`);
const lever = (X) => X.evaluate(`(() => { const e = document.querySelector(".casino-in-town .casino-lever"); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height, ready: !e.disabled, label: e.getAttribute("aria-label"), pose: e.querySelectorAll(".casino-lever-piece")[1]?.style.backgroundPosition }; })()`);
const chipsOf = async (m) => Number((await sql(`select chips from public.casino_live_accounts where user_id = $1`, [m]))[0]?.chips ?? 0);
const spinsOf = async (m) => Number((await sql(`select count(*)::int n from public.casino_live_spins where user_id = $1`, [m]))[0].n);
const mouse = (X, type, x, y) => X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: type === "mouseMoved" ? 0 : 1, buttons: type === "mouseReleased" ? 0 : 1 });

async function run(label, size, letter) {
  const X = await browser(`lever-${label}`, size);
  try {
    await sql(`do $f$ begin if to_regclass('public.casino_live_seats') is not null then delete from public.casino_live_seats; end if; end $f$`);
    await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    const me = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
    await sql(`update public.casino_live_accounts set chips = 0 where user_id = $1`, [me]);
    await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [me]);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1200);
    await X.evaluate(`${V}.warp(68, 35)`); await sleep(900);
    const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === 68 && g.to[1] === 34);
    await tap(X, ...middle(gate));
    await until("in the casino", async () => (await casino(X)).place === "casino", 20000);
    await sleep(1500);
    const wide = await X.evaluate("innerWidth"), high = await X.evaluate("innerHeight");
    let box = null;
    await until("a machine", async () => { const seen = (await casino(X)).boxes.filter((b) => b.n > 0 && b.n < 100 && middle(b)[0] > 20 && middle(b)[0] < wide - 20 && middle(b)[1] > 90 && middle(b)[1] < high - 200); box = seen.sort((a, b) => Math.abs(middle(a)[0] - wide / 2) - Math.abs(middle(b)[0] - wide / 2))[0]; return !!box; }, 15000);
    await tap(X, ...middle(box));
    await until("the sheet", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots"`), 10000);
    await until("sat", () => X.evaluate(`!!document.querySelector(".casino-in-town .casino-spin") && !document.querySelector(".casino-in-town .casino-spin").disabled`), 20000);
    // no Casino Coins: the lever is dim and a button sends to the counter
    const dim = await X.evaluate(`document.querySelector(".casino-in-town .casino-lever")?.classList.contains("is-dim")`);
    ok(`${label}: with no Casino Coins the lever is dim`, dim === true);
    ok(`${label}: and the button goes to the counter`, await clickText(X, "แลกที่เคาน์เตอร์"));
    await X.shot(`${OUT}/0-no-coins-${label}.png`);
    await until("the desk", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "desk"`), 8000);
    ok(`${label}: today's free Casino Coins`, await clickText(X, "รับฟรี"));
    await until("coins", async () => (await chipsOf(me)) >= 100, 10000);
    ok(`${label}: back to the machine`, await clickText(X, "ไปเล่นที่เครื่อง"));
    await until("the lever ready", async () => (await lever(X))?.ready, 20000);
    await sleep(800);
    const L = await lever(X);
    ok(`${label}: the lever says what it costs`, /ดึงคันโยก · 100 Casino Coin/.test(L.label), L.label);
    ok(`${label}: the lever is at least 44 px to tap`, L.h >= 44, L.h);
    await X.shot(`${OUT}/1-rest-${label}.png`);
    // half way down and let go: it springs back, nothing spins
    const n0 = await spinsOf(me), up = L.pose;
    await mouse(X, "mouseMoved", L.x, L.y - 30); await mouse(X, "mousePressed", L.x, L.y - 30);
    for (let d = 6; d <= 42; d += 6) { await mouse(X, "mouseMoved", L.x, L.y - 30 + d); await sleep(30); }
    await sleep(150);
    const mid = await lever(X);
    ok(`${label}: dragged half way, the arm follows`, mid.pose !== up, mid.pose);
    await X.shot(`${OUT}/2-half-${label}.png`);
    await mouse(X, "mouseReleased", L.x, L.y + 12); await sleep(900);
    ok(`${label}: let go half way, it springs back`, (await lever(X)).pose === up, (await lever(X)).pose);
    ok(`${label}: and nothing spun`, (await spinsOf(me)) === n0);
    // all the way down: a spin
    await mouse(X, "mouseMoved", L.x, L.y - 30); await mouse(X, "mousePressed", L.x, L.y - 30);
    for (let d = 10; d <= 100; d += 10) { await mouse(X, "mouseMoved", L.x, L.y - 30 + d); await sleep(30); }
    await sleep(80);
    await X.shot(`${OUT}/3-down-${label}.png`);
    await mouse(X, "mouseReleased", L.x, L.y + 70);
    await sleep(500);
    await X.shot(`${OUT}/4-rolling-${label}.png`);
    // (while the reels turn the count does not tell what they will stop on)
    const seen = await X.evaluate(`document.querySelector(".casino-in-town .casino-allowance strong")?.innerText`), dimNow = await X.evaluate(`document.querySelector(".casino-in-town .casino-lever")?.classList.contains("is-dim")`);
    ok(`${label}: while the reels turn the count shows the price taken, not the win`, seen === "0", seen);
    ok(`${label}: and the lever keeps its colour`, dimNow === false);
    await until("a spin", async () => (await spinsOf(me)) === n0 + 1, 10000).catch(() => {});
    ok(`${label}: pulled all the way, one spin`, (await spinsOf(me)) === n0 + 1, await spinsOf(me));
    // (the 100 taken from the Casino Coins; what comes back is added at once, never exactly the price: no row pays 100%)
    ok(`${label}: paid in Casino Coins`, (await chipsOf(me)) !== 100, await chipsOf(me));
    await sleep(900);
    ok(`${label}: and the lever is back up`, (await lever(X)).pose === up, (await lever(X)).pose);
    await sleep(5000);
    await X.shot(`${OUT}/5-after-${label}.png`);
  } finally { await X.quit(); }
}

await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100 where id = 1`);
for (const [label, size, letter] of [["1280", { width: 1280, height: 860 }, "A"], ["384", { width: 384, height: 730, mobile: true, dpr: 2 }, "B"], ["360", { width: 360, height: 640, mobile: true, dpr: 2 }, "C"]]) await run(label, size, letter);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
