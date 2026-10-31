// The Popoto Casino's twenty machines in real browsers, against the stand-in with v318 in it (town-bench.mjs 3299, v318 last
// in BENCH_EXTRA). The owner, 2026-10-31: "เพิ่มตอนนี้เลยเป็น 20 เครื่อง โดยขยายเพิ่มด้านลึก". A back-row machine is tapped,
// walked to and played, and a first-row one; each machine's cabinet is its own to tap, with every machine's marquee up;
// the turn still waits for all twenty. Pictures at 1280x860, 384x730, 360x640.
//
//   node town-casino-twenty.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3201", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView";
const sql = async (text, params = []) => { const r = await (await fetch(`${BENCH}/bench/sql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sql: text, params }) })).json(); if (!r.rows) throw new Error(JSON.stringify(r).slice(0, 300)); return r.rows; };
const who = async (as) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent(as)}&name=${encodeURIComponent(as)}`)).json()).id;
const casino = (X) => X.evaluate(`${V}.casino()`);
const middle = (b) => [(b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2];
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(500);
}
const pane = (X) => X.evaluate(`document.querySelector(".casino-in-town")?.dataset.pane ?? null`);
const closeSheet = async (X) => { await X.evaluate(`document.querySelector(".casino-in-town .casino-panel-close")?.click()`); await sleep(800); };
const seatOf = async (id) => (await sql(`select machine from public.casino_live_seats where user_id = $1`, [id]))[0]?.machine ?? null;
/** The cabinets on the screen clear of the bars, those of a row, the most central first. */
const onScreen = async (X, back) => {
  const wide = await X.evaluate("innerWidth"), high = await X.evaluate("innerHeight");
  let list = [];
  await until("a machine", async () => {
    const boxes = (await casino(X)).boxes.filter((b) => b.n > 0 && b.n < 100 && (back ? b.n > 10 : b.n <= 10) && b.y1 - b.y0 > 60 * (b.x1 - b.x0) / 72);
    list = boxes.filter((b) => middle(b)[0] > 40 && middle(b)[0] < wide - 40 && middle(b)[1] > 170 && middle(b)[1] < high - 200).sort((p, q) => Math.abs(middle(p)[0] - wide / 2) - Math.abs(middle(q)[0] - wide / 2));
    return list.length > 0;
  }, 15000);
  return list;
};

const others = []; for (let i = 1; i <= 20; i++) others.push(await who(`TWENTY${i}`));

async function run(label, size, letter) {
  await sql(`delete from public.casino_live_seats`);
  await sql(`update public.casino_live_settings set access = 'everyone', open = true, chip_rate = 1, free_chips = 100, free_event_chips = 1000, free_event_until = now() + interval '2 hours', seat_turn_s = 300, seat_rest_s = 60, starts_at = null, ends_at = null where id = 1`);
  const X = await browser(`twenty-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=${letter}&townRoom=casino&townHour=20&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
    await until("ready", async () => (await status(X)) === "ready", 280000);
    await until("keeper", () => X.evaluate("!!window.__townKeeper && window.__townKeeper.ready()"), 60000);
    const me = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
    await sql(`select town.purse_of($1, true)`, [me]);
    await sql(`delete from public.casino_live_spins where machine > 0`);
    await sql(`insert into public.casino_live_accounts (user_id) values ($1) on conflict do nothing`, [me]);
    await sql(`update public.casino_live_accounts set chips = 5000, free_left = 0, seat_rest_until = null, available_at = now() - interval '1 second' where user_id = $1`, [me]);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1800);

    // ── in by the door, as a member comes ──
    await X.evaluate(`${V}.warp(68, 35)`); await sleep(1200);
    await X.evaluate(`window.dispatchEvent(new Event("cashtown:casino-door"))`); await sleep(1200);
    await X.evaluate(`document.querySelector("[data-town-casino-way]")?.click()`);
    await until("in the casino", async () => (await casino(X)).place === "casino", 60000);
    ok(`${label}: in by the door`, true);
    await sleep(2000);
    await X.shot(`${OUT}/twenty-1-in-${label}.png`);

    // ── a back-row machine ──
    await X.evaluate(`${V}.warp(356, 113)`); await sleep(2000);
    await X.shot(`${OUT}/twenty-2-aisle-${label}.png`);
    const back = (await onScreen(X, true))[0];
    await tap(X, ...middle(back));
    await until("the sheet", async () => (await pane(X)) === "slots", 10000);
    await until("sat", () => X.evaluate(`(() => { const e = document.querySelector(".casino-in-town .casino-lever"); return !!e && !e.disabled && !e.classList.contains("is-dim"); })()`), 30000);
    ok(`${label}: back-row machine ${back.n}: tapped, walked to, sat at`, (await seatOf(me)) === back.n, await seatOf(me));
    await sleep(700);
    await X.evaluate(`document.querySelector(".casino-in-town .casino-lever")?.click()`); await sleep(1500);
    const row = (await sql(`select machine from public.casino_live_spins where user_id = $1 order by created_at desc limit 1`, [me]))[0];
    ok(`${label}: and played`, row?.machine === back.n, row);
    await X.shot(`${OUT}/twenty-3-back-playing-${label}.png`);
    await sleep(3600);
    await closeSheet(X);

    // ── a first-row machine, by the gap between two ──
    await X.evaluate(`${V}.warp(356, 118)`); await sleep(2000);
    const front = (await onScreen(X, false))[0];
    await tap(X, ...middle(front));
    await until("the sheet", async () => (await pane(X)) === "slots", 10000);
    await until("sat", async () => (await seatOf(me)) === front.n, 30000);
    ok(`${label}: first-row machine ${front.n}: sat at`, true);
    await closeSheet(X);
    await sql(`delete from public.casino_live_seats`);

    // ── all twenty played: the marquees over every head, the cabinets still each their own to tap ──
    const mine = (await sql(`select id from public.casino_live_spins where user_id = $1 order by created_at desc limit 1`, [me]))[0].id;
    for (let n = 1; n <= 20; n++) {
      await sql(`insert into public.casino_live_spins (id, user_id, player_name, machine, revision, price, reels, prize, forced, created_at, reveal_at, test, trail)
        select gen_random_uuid(), $1, $2, $3, revision, price, reels, prize, forced, now(), now() - interval '10 seconds', test, trail from public.casino_live_spins where id = $4`, [others[n - 1], `Member ${n}`, n, mine]);
    }
    await X.evaluate(`window.dispatchEvent(new Event("focus"))`); await sleep(3400);
    await X.evaluate(`${V}.warp(356, 113)`); await sleep(2000);
    await X.shot(`${OUT}/twenty-4-all-signs-${label}.png`);
    const boxes = (await casino(X)).boxes.filter((b) => b.n > 0 && b.n < 100 && b.y1 - b.y0 > 60 * (b.x1 - b.x0) / 72);
    const wide = await X.evaluate("innerWidth"), high = await X.evaluate("innerHeight");
    const seen = boxes.filter((b) => middle(b)[0] > 0 && middle(b)[0] < wide && middle(b)[1] > 0 && middle(b)[1] < high);
    const wrong = await X.evaluate(`(() => { const a = ${V}.casino(); return ${JSON.stringify(seen)}.filter((b) => { const x = (b.x0 + b.x1) / 2, y = (b.y0 + b.y1) / 2; const under = a.boxes.filter((q) => x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1).map((q) => q.n); return !under.includes(b.n) || under.some((n) => n !== b.n && n > 0 && n < 100 && a.boxes.some((q) => q.n === n && (q.y1 - q.y0) > 60 * (q.x1 - q.x0) / 72 && x >= q.x0 && x <= q.x1 && y >= q.y0 && y <= q.y1)); }).map((b) => b.n); })()`);
    ok(`${label}: no cabinet's middle under another's (${seen.length} on the screen)`, wrong.length === 0, wrong);
    await X.evaluate(`${V}.warp(356, 118)`); await sleep(2000);
    await X.shot(`${OUT}/twenty-5-first-row-signs-${label}.png`);
    await sql(`delete from public.casino_live_spins where machine > 0`);
  } finally { await X.close?.(); }
}

await run("desk", { width: 1280, height: 860 }, "T");
await run("phone", { width: 384, height: 730 }, "U");
await run("small", { width: 360, height: 640 }, "W");
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
