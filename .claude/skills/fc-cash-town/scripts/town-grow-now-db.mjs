// The giant seeds growing a plant at once, through the database's keeper against a stand-in with v317 in it (as town-grow-db.mjs:
// scripts/db/town-bench.mjs from the bench kept after v316, with a reader of the town's news and v317 as BENCH_EXTRA). Production is
// not touched. A's page misses the game, then passes it; the database says what happened; B, on another page, sees it arrive.
//   node town-bench.mjs 3299; node town-grow-now-db.mjs <base> <outdir> [bench]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3231", OUT = ".", BENCH = "http://127.0.0.1:3299"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const V = "window.__townView", K = "window.__townKeeper";
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r).slice(0, 400)}`); return r.rows; };
const enter = async (X, letter) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=grownowdb&townHour=11&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 60000);
  await until("view", () => X.evaluate(`!!${V} && !!${V}.tileScreen`), 60000);
};
const memberOf = async (X) => (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await X.evaluate("window.__cashTown.me()")).id)}`)).json()).id;
const go = async (X, x, y, ms = 2000) => { await X.evaluate(`(() => { ${V}.warp(${x}, ${y}); ${V}.lookAt(${x + 0.5}, ${y + 0.5}); })()`); await sleep(ms); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const click = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`);
const play = (X, hit) => X.evaluate(`(async () => {
  const run = ${K}.purse().professionRewards.giant, marks = []; let z = run.seed;
  for (let i = 0; i < 3; i++) { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; marks.push(0.2 + (z % 61) / 100); }
  const trowel = document.querySelector("[data-giant-trowel]"), btn = document.querySelector("[data-giant-dig]");
  for (let i = 0; i < 3; i++) {
    for (let tries = 0; tries < 800; tries++) { await new Promise(requestAnimationFrame); const near = Math.abs(parseFloat(trowel.style.left) / 100 - marks[i]); if (${hit ? "near < 0.04" : "near > 0.3"}) break; }
    const r = btn.getBoundingClientRect(), o = { bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, clientX: r.x + 5, clientY: r.y + 5 };
    btn.dispatchEvent(new PointerEvent("pointerdown", o)); btn.dispatchEvent(new PointerEvent("pointerup", o)); btn.click();
    await new Promise((r) => setTimeout(r, 120));
  }
})()`);

const A = await browser("nowA", { width: 1280, height: 860 });
const B = await browser("nowB", { width: 384, height: 730, dpr: 2, mobile: true });
try {
  await sql("update public.town_knobs set value = 1 where key = 'game_open'");
  await sql("insert into public.town_knobs (key, value) values ('far_open', 1) on conflict (key) do update set value = 1");
  await enter(A, "A");
  const a = await memberOf(A), H = 3_600_000, t0 = Number((await sql("select town.now_ms() n"))[0].n);
  const bed = (await sql("select town.bed_of(134, 6) b"))[0].b, farm = (await sql("select town.cat('farming') f"))[0].f, [cx, cy] = farm.bedsAt[bed];
  const rx = cx + 3, ry = cy + 3, ROOT = `${rx},${ry}`;
  const Q = (c) => ({ at: t0 + 9000 * H, span: 100, area: [c, c, c, c], nar: [0, 0, 0] });
  const plant = { by: a, crop: "pumpkin", sown: t0 - 200 * H, boost: 0, watered: 0, fed: 0, guard: t0 + 900 * H, cured: 0, picked: 0, pickedAt: 0, q: Q(100) };
  await sql("insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0", [bed, a, t0]);
  await sql("delete from public.town_plots where bed = $1", [bed]);
  for (let y = 0; y < farm.side; y++) for (let x = 0; x < farm.side; x++) await sql("insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', null, $4)", [cx + x, cy + y, bed, t0]);
  await sql("update public.town_plots set plant = $1 where x = $2 and y = $3", [JSON.stringify(plant), rx, ry]);
  const purse = (await sql("select town.purse_of($1, true) p", [a]))[0].p;
  await sql("select town.keep_purse($1, $2::jsonb)", [a, JSON.stringify({ ...purse, bag: [{ item: "seedPumpkin", n: 9 }, ...purse.bag.slice(1).map(() => null)], gifts: { had: ["thingGiantSeeds"], charms: [] }, professionRewards: {} })]);
  await enter(A, "A"); await sleep(800);
  await enter(B, "B"); await sleep(800);
  await A.evaluate(`(window.__townZoomFree = true, ${V}.zoom(0.8))`);
  await B.evaluate(`(window.__townZoomFree = true, ${V}.zoom(0.55))`);
  await go(A, rx, ry, 2400); await go(B, rx + 1, ry + 6, 2400);

  await until("chip", () => has(A, "[data-quality-chip]"), 20000); await click(A, "[data-quality-chip]"); await sleep(600);
  await click(A, "[data-quality-grow-open]"); await sleep(600);
  await click(A, '[data-quality-grow-size="7"]'); await sleep(300);
  ok("the panel offers to grow at once", await has(A, "[data-quality-grow-atonce]"));
  await click(A, "[data-quality-grow-atonce]");
  await until("the game", () => has(A, "[data-giant-game]"), 20000); await sleep(300);
  const purseNow = async () => (await sql("select town.purse_of($1, false) p", [a]))[0].p;
  const run = (await purseNow()).professionRewards?.giant;
  ok("the database holds the go, for that plant and size", run?.grow === 7 && run?.key === ROOT, run);

  await play(A, false);
  await until("the miss", () => has(A, "[data-grow-at-once-missed]"), 20000);
  ok("a miss: the plant as it was", (await sql("select plant->'size' s from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].s === null);
  ok("a miss: the seeds and the day as they were", await purseNow().then((q) => q.bag[0]?.n === 9 && !q.gifts.used?.thingGiantSeeds), await purseNow());

  await click(A, "[data-grow-at-once-again]");
  await until("the game again", () => has(A, "[data-giant-game]"), 20000); await sleep(300);
  await play(A, true);
  await until("the panels close", async () => !(await has(A, "[data-grow-at-once]")) && !(await has(A, "[data-quality-inspector]")), 20000);
  await A.shot(`${OUT}/db-a-burst.png`);
  const root = (await sql("select plant from public.town_plots where x = $1 and y = $2", [rx, ry]))[0].plant;
  ok("passed: whole-bed, its wait none", root.size?.n === 7 && root.size.at === root.size.until && root.footprint?.length === 49, root.size);
  ok("every plot of its square holds it", (await sql("select count(*)::int c from public.town_plots where bed = $1 and plant->>'root' = $2", [bed, ROOT]))[0].c === 49);
  const after = await purseNow();
  ok("six seeds, and the day's use", after.bag[0]?.n === 3 && after.gifts.used?.thingGiantSeeds?.n === 1, after.gifts);
  ok("written down as at once", (await sql("select doc->'atOnce' a from public.town_deeds where what = 'plant_grow' order by at desc limit 1"))[0]?.a === true);
  ok("A's page has it, ripe, with the pull on offer", await until("pull", () => has(A, "[data-giant-pull-open]"), 15000).then(() => true).catch(() => false));
  ok("B's page gets it too", await until("B's farm", () => B.evaluate(`${K}.farm()["${ROOT}"]?.plant?.size?.n === 7`), 30000).then(() => true).catch(() => false));
  await sleep(500); await B.shot(`${OUT}/db-b-sees.png`);
  await sleep(1500); await A.shot(`${OUT}/db-a-after.png`);
  console.log("A errors", JSON.stringify((await A.errors?.()) ?? []).slice(0, 300), "B errors", JSON.stringify((await B.errors?.()) ?? []).slice(0, 300));
} finally { A.close(); B.close(); }
console.log(`town-grow-now-db: ${pass} checks passed${fail ? `, ${fail} FAILED` : ""}.`);
process.exit(fail ? 1 : 0);
