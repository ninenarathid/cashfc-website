// What I won (the owner, 2026-10-27: "รู้สึกดูกระเป๋าตังค์ตัวเองยากว่าชนะอะไรไปแล้วบ้าง", then "ทำเลย"), in real browsers against
// the stand-in with v308 in it (town-bench.mjs 3299, v308 last in BENCH_EXTRA). A tester changes Popoto coins for Casino
// Coins and spins five times: a "+N" shows by the sheet's count and under the status bar's as coins come in; the
// "ของฉัน" button opens today's count (spins, what they cost, what came back) and the wins. Pictures at 1280x860,
// 384x730 and 360x640.
//
//   node town-casino-mine.mjs <base> <outdir> [bench]
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
const text = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? ""`);

async function run(label, size, letter) {
  await sql(`do $f$ begin if to_regclass('public.casino_live_seats') is not null then delete from public.casino_live_seats; end if; end $f$`);
  const X = await browser(`mine-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("keeper", () => X.evaluate("!!window.__townKeeper && window.__townKeeper.ready()"), 60000);
    const me = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
    await sql(`select town.purse_of($1, true)`, [me]); await sql(`update public.town_purses set coins = 5000 where member_id = $1`, [me]);
    await sql(`update public.casino_live_accounts set chips = 0 where user_id = $1`, [me]);
    await sql(`delete from public.casino_live_spins where user_id = $1`, [me]);
    await X.evaluate(`window.__townKeeper.purseAgain?.()`); await sleep(800);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1200);
    await X.evaluate(`${V}.warp(68, 35)`); await sleep(900);
    const gate = (await X.evaluate(`${V}.gates()`)).find((g) => g.to[0] === 68 && g.to[1] === 34);
    await tap(X, ...middle(gate));
    await until("in the casino", async () => (await casino(X)).place === "casino", 20000); await sleep(1500);
    ok(`${label}: a "ของฉัน" button in the corner`, (await text(X, ".casino-mine-button")) === "ของฉัน");
    // nothing yet today
    await click(X, ".casino-mine-button"); await sleep(1500);
    ok(`${label}: it opens today's count`, /วันนี้ ตั้งแต่ 05:00/.test(await text(X, ".casino-mine-when")), await text(X, ".casino-mine-when"));
    ok(`${label}: nothing won yet`, /ยังไม่ได้รางวัล/.test(await text(X, ".casino-mine")));
    await click(X, ".casino-mine-button"); await sleep(500);
    // (up to the machines first: on a small phone they stand under the town's bars from the door)
    await X.evaluate(`${V}.warp(352, 117)`); await sleep(1500);
    const wide = await X.evaluate("innerWidth"), high = await X.evaluate("innerHeight");
    let box = null;
    await until("a machine", async () => { const seen = (await casino(X)).boxes.filter((b) => b.n > 0 && b.n < 100 && middle(b)[0] > 20 && middle(b)[0] < wide - 20 && middle(b)[1] > 90 && middle(b)[1] < high - 200); box = seen.sort((a, b) => Math.abs(middle(a)[0] - wide / 2) - Math.abs(middle(b)[0] - wide / 2))[0]; return !!box; }, 15000);
    await tap(X, ...middle(box));
    await until("the sheet", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots"`), 10000).catch(async (e) => { await X.shot(`${OUT}/fail-${label}.png`); console.log("  (tapped", JSON.stringify(box), ")"); throw e; });
    await until("sat", () => X.evaluate(`!!document.querySelector(".casino-in-town .casino-spin") && !document.querySelector(".casino-in-town .casino-spin").disabled`), 20000);
    await click(X, ".casino-in-town .casino-spin"); await sleep(800);
    await click(X, ".casino-chips-packs button:nth-child(2)"); await sleep(300);
    await click(X, ".casino-chips-buy");
    // (the counter's change shows its "+500" too, under the status bar's count)
    await until("+N under the status bar", () => X.evaluate(`!!document.querySelector("[data-casino-chips] .casino-plus")`), 5000).catch(() => {});
    ok(`${label}: Casino Coins coming in show "+N" under the status bar's count`, /\+500/.test(await text(X, "[data-casino-chips] .casino-plus")), await text(X, "[data-casino-chips]"));
    await sleep(1500);
    await click(X, ".casino-chips-back"); await sleep(1500);
    let spins = 0, coinWins = 0, wins = 0, plusSeen = false, shot = false;
    const said = () => text(X, ".casino-in-town .casino-result");
    for (let k = 0; k < 5; k++) {
      await until("the lever", () => X.evaluate(`!document.querySelector(".casino-in-town .casino-lever")?.disabled`), 20000);
      await X.evaluate(`document.querySelector(".casino-in-town .casino-lever").click()`);
      await until("turning", async () => /กำลังลุ้น/.test(await said()), 8000, 50);
      await until("stopped", async () => !/กำลังลุ้น/.test(await said()), 12000, 50);
      spins++;
      const w = await said();
      if (/ได้ /.test(w)) wins++;
      if (/Casino Coin!/.test(w)) {
        coinWins++;
        const p = await until("+N by the sheet's count", () => X.evaluate(`document.querySelector(".casino-in-town .casino-allowance .casino-plus")?.innerText ?? null`), 3000, 50).catch(() => null);
        if (p) plusSeen = true;
        if (p && !shot) { await X.shot(`${OUT}/1-plus-${label}.png`); shot = true; }
      }
      await sleep(900);
    }
    if (coinWins) ok(`${label}: a coin win shows "+N" by the sheet's count`, plusSeen);
    await click(X, ".casino-mine-button"); await sleep(1800);
    const stats = await X.evaluate(`[...document.querySelectorAll(".casino-mine-stats b")].map((b) => b.innerText)`);
    ok(`${label}: today's spins`, stats[0] === String(spins), stats);
    ok(`${label}: what they cost`, stats[1] === (spins * 100).toLocaleString("en-US"), stats);
    const back = Number((await sql(`select coalesce(sum((prize->>'amount')::bigint) filter (where prize->>'kind' = 'coin'), 0)::int n from public.casino_live_spins where user_id = $1`, [me]))[0].n);
    ok(`${label}: what came back`, stats[2] === `+${back.toLocaleString("en-US")}`, { stats, back });
    ok(`${label}: each win listed`, (await X.evaluate(`document.querySelectorAll(".casino-mine li").length`)) === wins, wins);
    await X.shot(`${OUT}/2-mine-${label}.png`);
  } finally { await X.quit(); }
}

await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100 where id = 1`);
await sql(`update public.casino_live_prizes set name = 'Casino Coin คืน', kind = 'coin', amount = 22, active = true where id = 'pair'`);
await sql(`update public.casino_live_prizes set chance = case id when 'pair' then 60 else 0 end, issued = 0`);
for (const [label, size, letter] of [["1280", { width: 1280, height: 860 }, "N"], ["384", { width: 384, height: 730, mobile: true, dpr: 2 }, "O"], ["360", { width: 360, height: 640, mobile: true, dpr: 2 }, "P"]]) await run(label, size, letter);
await sql(`update public.casino_live_prizes set chance = case id when 'pair' then 20 else 0 end`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
