// Aqua's event of 2026-10-31 in real browsers, against the stand-in with v314 in it (town-bench.mjs 3299, v314 last in
// BENCH_EXTRA). The owner: "5 6 8 เอาหมด", "ข้อ 7 ช่วยทำให้นายธนาคารเปลี่ยนเหรียญเป็น popoto coin ได้", "แจก 1000 เฉพาะวันกิจกรรม".
// From the fountain the chip walks a member to the casino's door and in; the counter offers the event's 1,000; all ten
// taken says so; a whole turn gets a member up at the pull with nothing taken, then a rest; a prize run out says so in the
// paytable; and with the casino SHUT the banker changes Casino Coins into Popoto coins. Pictures at 1280x860, 384x730, 360x640.
//
//   node town-casino-event.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3201", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView";
const sql = async (text, params = []) => { const r = await (await fetch(`${BENCH}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: text, params }) })).json(); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const who = async (as) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent(as)}&name=${encodeURIComponent(as)}`)).json()).id;
const casino = (X) => X.evaluate(`${V}.casino()`);
const middle = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(500);
}
const clickText = (X, words) => X.evaluate(`(() => { const b = [...document.querySelectorAll("button")].find((e) => e.offsetParent && e.innerText.includes(${JSON.stringify(words)}) && !e.disabled); if (!b) return false; b.click(); return true; })()`);
const text = (X, sel) => X.evaluate(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((e) => e.innerText).join(" | ")`);
const alert = (X) => text(X, ".casino-error");
const account = async (id) => (await sql(`select chips, free_left, seat_rest_until from public.casino_live_accounts where user_id = $1`, [id]))[0];
const coins = async (id) => Number((await sql(`select coins from public.town_purses where member_id = $1`, [id]))[0]?.coins ?? 0);
const seats = (machines, ids) => Promise.all(machines.map((m, i) => sql(`insert into public.casino_live_seats (machine, user_id, at, since) values ($1, $2, now() + interval '1 hour', now()) on conflict (machine) do update set user_id = excluded.user_id, at = excluded.at, since = excluded.since`, [m, ids[i]])));
/** The machine on the screen clear of the bars. */
const machineOnScreen = async (X) => {
  const wide = await X.evaluate("innerWidth"), high = await X.evaluate("innerHeight");
  let box = null;
  await until("a machine", async () => { const seen = (await casino(X)).boxes.filter((b) => b.n > 0 && b.n < 100 && middle(b)[0] > 40 && middle(b)[0] < wide - 40 && middle(b)[1] > 170 && middle(b)[1] < high - 200); box = seen.sort((a, b) => middle(a)[1] - middle(b)[1])[0] ?? null; return !!box; }, 15000);
  return box;
};

const others = []; for (let i = 1; i <= 10; i++) others.push(await who(`EVENT${i}`));

async function run(label, size, letter) {
  await sql(`delete from public.casino_live_seats`);
  await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100, free_event_chips = 1000, free_event_until = now() + interval '2 hours', seat_turn_s = 300, seat_rest_s = 60, starts_at = null, ends_at = null where id = 1`);
  await sql(`update public.casino_live_prizes set issued = 0`);
  const X = await browser(`event-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("keeper", () => X.evaluate("!!window.__townKeeper && window.__townKeeper.ready()"), 60000);
    const me = await (async () => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id)();
    await sql(`select town.purse_of($1, true)`, [me]); await sql(`update public.town_purses set coins = 500 where member_id = $1`, [me]);
    await sql(`delete from public.casino_live_chip_moves where user_id = $1`, [me]);
    await sql(`delete from public.casino_live_spins where user_id = $1`, [me]);
    await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [me]);
    await sql(`update public.casino_live_accounts set chips = 0, free_left = 0, seat_rest_until = null where user_id = $1`, [me]);
    await X.evaluate(`window.__townKeeper.purseAgain?.()`);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1800);

    // ── 5: the way to the door ──
    const chip = `document.querySelector("[data-town-casino-way]")`;
    await until("the chip", () => X.evaluate(`!!${chip}`), 10000);
    const box = await X.evaluate(`(() => { const r = ${chip}.getBoundingClientRect(), top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, bottom: r.bottom, mine: !!top && (top === ${chip} || ${chip}.contains(top)) }; })()`);
    const wide = await X.evaluate("innerWidth");
    ok(`${label}: the way to the casino shows at the fountain`, box.h >= 44 && box.left >= 0 && box.right <= wide && box.mine, box);
    await X.shot(`${OUT}/event-1-way-${label}.png`);
    await X.evaluate(`${chip}.click()`);
    await until("walking", async () => (await X.evaluate(`${V}.self()`)).moving, 5000).catch(() => {});
    await until("in the casino", async () => (await casino(X)).place === "casino", 60000);
    ok(`${label}: and walks me in`, true);
    await sleep(1500);
    ok(`${label}: inside, it has gone`, !(await X.evaluate(`!!${chip}`)));

    // ── the counter: the event's 1,000 ──
    await clickText(X, "แลก Coin");
    await until("the counter", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "desk"`), 8000);
    ok(`${label}: the counter offers 1,000 free`, /1,000/.test(await text(X, ".casino-chips-free")), await text(X, ".casino-chips-free"));
    await X.evaluate(`document.querySelector(".casino-chips-free")?.click()`); await sleep(1500);
    ok(`${label}: and gives them`, (await account(me)).chips === 1000 && (await account(me)).free_left === 1000, await account(me));
    await X.evaluate(`document.querySelector(".casino-in-town .casino-panel-close")?.click()`); await sleep(600);

    // ── 6: all ten taken ──
    await X.evaluate(`${V}.warp(352, 117)`); await sleep(1500);
    const m = await machineOnScreen(X);
    await seats([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], others);
    await tap(X, ...middle(m)); await sleep(1200);
    ok(`${label}: all ten taken says so`, /เครื่องเต็มทุกตัว/.test(await alert(X)) && /5 นาที/.test(await alert(X)), await alert(X));
    await X.shot(`${OUT}/event-2-full-${label}.png`);

    // ── 6: my turn ends at the pull ──
    await sql(`delete from public.casino_live_seats where machine = $1`, [m.n]);
    await tap(X, ...middle(m));
    await until("the sheet", () => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "slots"`), 10000);
    await until("sat", () => X.evaluate(`!!document.querySelector(".casino-in-town .casino-lever") && !document.querySelector(".casino-in-town .casino-lever").classList.contains("is-dim")`), 20000);
    await sleep(1200);
    // (8: the paytable, a prize run out)
    await sql(`update public.casino_live_prizes set issued = stock where id = 'gold'`);
    await X.evaluate(`window.dispatchEvent(new Event("focus"))`); await sleep(3200);
    await X.evaluate(`document.querySelector(".casino-prize-details")?.setAttribute("open", "")`); await sleep(500);
    const table = await text(X, ".casino-paytable");
    ok(`${label}: the paytable says a prize has run out`, /หมดแล้ว/.test(table), table);
    await X.evaluate(`document.querySelector(".casino-prize-details")?.scrollIntoView({ block: "center" })`); await sleep(300);
    await X.shot(`${OUT}/event-3-gone-${label}.png`);
    await X.evaluate(`document.querySelector(".casino-prize-details")?.removeAttribute("open")`); await sleep(200);
    await sql(`update public.casino_live_prizes set issued = 0 where id = 'gold'`);
    await sql(`update public.casino_live_seats set since = now() - interval '6 minutes', at = now() where user_id = $1`, [me]);
    const held = (await account(me)).chips;
    await until("the lever ready", () => X.evaluate(`(() => { const e = document.querySelector(".casino-in-town .casino-lever"); return !!e && !e.disabled; })()`), 15000);
    await sleep(600);
    await X.evaluate(`document.querySelector(".casino-in-town .casino-lever")?.click()`);
    await until("the turn's end said", async () => /เล่นครบ 5 นาที/.test(await alert(X)), 8000).catch(() => {});
    ok(`${label}: a whole turn: up at the pull, and told`, /เล่นครบ 5 นาที/.test(await alert(X)), await alert(X));
    ok(`${label}: nothing taken`, (await account(me)).chips === held, await account(me));
    await sleep(1500);
    ok(`${label}: the machine let go, the rest begun`, !!(await account(me)).seat_rest_until && (await sql(`select count(*) n from public.casino_live_seats where user_id = $1`, [me]))[0].n === 0, await account(me));
    ok(`${label}: the sheet closed`, await X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane === "none"`));
    await X.shot(`${OUT}/event-4-turn-${label}.png`);
    await tap(X, ...middle(await machineOnScreen(X))); await sleep(1000);
    ok(`${label}: sitting again says to rest`, /พักอีก \d+ วินาที/.test(await alert(X)), await alert(X));
    await sql(`delete from public.casino_live_seats`);
    await sql(`update public.casino_live_accounts set seat_rest_until = null where user_id = $1`, [me]);

    // ── 7: the banker, with the casino shut ──
    await sql(`update public.casino_live_accounts set chips = 620, free_left = 100 where user_id = $1`, [me]);
    await sql(`update public.casino_live_settings set access = 'closed', open = false where id = 1`);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(800);
    await X.evaluate(`${V}.warp(68, 35)`); await sleep(1500);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1500);
    ok(`${label}: the casino shut: no way shown`, !(await X.evaluate(`!!${chip}`)));
    // (next to the banker, tile 53,56 on the new map)
    const near = await X.evaluate(`(() => { for (const [dx, dy] of [[0, 2], [1, 2], [-1, 2], [2, 0], [-2, 0], [0, -2], [2, 2], [-2, 2]]) if (${V}.walkable(53 + dx, 56 + dy)) return [53 + dx, 56 + dy]; return null; })()`);
    await X.evaluate(`${V}.warp(${near[0]}, ${near[1]})`); await sleep(1800);
    const banker = await findBanker(X);
    await tap(X, ...middle(banker));
    const TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`;
    await until("the talk opens", () => X.evaluate(`!!${TALK}`), 8000);
    for (let i = 0; i < 10 && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) {
      for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await sleep(250);
    }
    await until("the banker's choices", async () => (await X.evaluate(`${TALK}?.innerText ?? ""`)).includes("แลก Casino Coin เป็น Popoto coin"), 8000);
    ok(`${label}: the banker offers it`, true);
    await X.shot(`${OUT}/event-5-talk-${label}.png`);
    await clickText(X, "แลก Casino Coin เป็น Popoto coin");
    await until("the teller", () => X.evaluate(`!!document.querySelector("[data-bank-casino]")`), 15000);
    await sleep(800);
    const said = await text(X, "[data-bank-casino]");
    ok(`${label}: 520 may go, the free hundred stays`, /520/.test(said), said);
    await clickText(X, "ทั้งหมด"); await sleep(400);
    ok(`${label}: all, for 468`, /468/.test(await text(X, "[data-bank-casino-go]")), await text(X, "[data-bank-casino-go]"));
    await X.shot(`${OUT}/event-6-teller-${label}.png`);
    const was = await coins(me);
    await X.evaluate(`document.querySelector("[data-bank-casino-go]")?.click()`); await sleep(1800);
    ok(`${label}: paid, with the casino shut`, (await coins(me)) === was + 468 && (await account(me)).chips === 100, { was, now: await coins(me), acc: await account(me) });
    ok(`${label}: and said`, /ได้ 468 Popoto coin/.test(await text(X, "[data-bank-casino-note]")), await text(X, "[data-bank-casino-note]"));
    await X.shot(`${OUT}/event-7-paid-${label}.png`);
  } finally { await X.quit(); }
}
/** Where the banker is on the page. */
async function findBanker(X) {
  let k = null;
  await until("the banker on the screen", async () => { k = (await X.evaluate(`${V}.keepers()`)).find((b) => b.id === "banker") ?? null; return !!k; }, 20000);
  return k;
}

for (const [label, size, letter] of [["1280", { width: 1280, height: 860 }, "T"], ["384", { width: 384, height: 730, mobile: true, dpr: 2 }, "U"], ["360", { width: 360, height: 640, mobile: true, dpr: 2 }, "V"]]) await run(label, size, letter);
await sql(`update public.casino_live_settings set free_event_chips = 0, free_event_until = null, access = 'everyone', open = true where id = 1`);
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
