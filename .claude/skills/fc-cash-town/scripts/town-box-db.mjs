// The storage box as a member will have it, tried in a real browser before anything is pushed: the dev test room
// kept by the database's keeper (lib/town/keeper.ts), asking a stand-in for the database with v134 in it
// (scripts/db/town-bench.mjs: every migration replayed into PGlite on a local port). Production is not touched.
//
// A member's box is the database's: a tap on the chest walks up to it and opens a panel of ten empty slots; a thing
// tapped in the bag is in the box the database keeps, and out of the purse it keeps; taken out, it is back; each deed
// is written down; loaded again, the page has the same box. A page asking a database that has not had v134 has a
// chest that is only a chest: no chip, no panel, and nothing breaks.
//
//   node town-bench.mjs 3198     (in a scratch folder, see scripts/db/README.md: leave it running; while v134 is a draft beside its test and not in
//                                supabase/, with BENCH_EXTRA=v134_draft.sql)
//   node town-box-db.mjs <base> <outdir> [bench] [bench without v134]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3198", OLD = ""] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const K = "window.__townKeeper", V = "window.__townView";
const post = async (path, body, bench = BENCH) => (await fetch(`${bench}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = [], bench = BENCH) => { const r = await post("/bench/sql", { sql: text, params }, bench); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const purse = (X) => X.evaluate(`${K}.purse()`);
const box = (X) => X.evaluate(`${K}.box()`);
const count = (slots, item) => slots.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const pick = async (X, part, item) => { await X.evaluate(`document.querySelector('[data-box-${part}] button[data-item="${item}"]')?.click()`); await sleep(350); };
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
async function chest(X) {
  let at = null;
  await until("the chest is drawn, and still", async () => {
    const now = await X.evaluate(`${V}.storebox()`), still = !!now && !!at && Math.abs(now.x - at.x) < 0.5 && Math.abs(now.y - at.y) < 0.5;
    at = now;
    return still;
  }, 20000, 400);
  return at;
}
async function enter(X, letter, bench) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=boxdb&townHour=12&townWeather=clear&townDb=${encodeURIComponent(bench)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready()`), 30000);
}

const FAR = [30, 38], BY = [35, 35];
const A = await browser("boxdb", { width: 1280, height: 860 });
try {
  await enter(A, "X", BENCH);
  const id = (await (await fetch(`${BENCH}/bench/who?as=${encodeURIComponent((await me(A)).id)}`)).json()).id;
  ok("the game is the database's here: no trial in the page", (await A.evaluate(`${K}.trial === null`)) === true);
  // (a bag set up by hand, and no box)
  await sql(`delete from public.town_boxes where member_id = $1`, [id]);
  await sql(`delete from public.town_deeds where member_id = $1 and what like 'box\\_%'`, [id]);
  await sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb))
    on conflict (member_id) do update set doc = public.town_purses.doc || jsonb_build_object('bag', $2::jsonb)`, [id, JSON.stringify([{ item: "kangkong", n: 12 }, { item: "can", n: 1, water: 4 }, ...Array(8).fill(null)])]);
  await A.evaluate(`${K}.hold(-1).then(() => null)`);
  await A.evaluate(`${K}.boxLook().then(() => null)`);
  await until("the keeper has the bag", async () => count((await purse(A)).bag, "kangkong") === 12, 8000);
  const first = await box(A);
  ok("the keeper knows of a box before the chest is walked up to: ten empty slots, told by the database", !!first && first.things.length === 10 && first.things.every((s) => s === null) && first.more === 0, first);

  await warp(A, ...FAR);
  const at = await chest(A);
  ok("away from the chest nothing is offered", !(await there(A, "[data-box-chip]")) && !(await there(A, "[data-box-panel]")));
  await tap(A, at.x, at.y);
  await until("its panel has come", () => there(A, "[data-box-panel]"), 20000);
  ok("a tap on the chest walks up to it and opens it", /^0 \/ 10$/.test(await textOf(A, "[data-box-count]")), await textOf(A, "[data-box-count]"));
  await pick(A, "bag", "kangkong");
  await until("the kangkong is in the box", async () => count((await box(A))?.things ?? [], "kangkong") === 12, 8000);
  let kept = (await sql(`select b.things, b.more, (select town.held(p.doc->'bag', 'kangkong') from public.town_purses p where p.member_id = b.member_id) as bag from public.town_boxes b where b.member_id = $1`, [id]))[0];
  ok("a thing tapped in my bag is in the box the database keeps, and out of the purse it keeps", count(kept.things, "kangkong") === 12 && kept.bag === 0 && kept.more === 0 && count((await purse(A)).bag, "kangkong") === 0, kept);
  await pick(A, "bag", "can");
  await until("the can is in the box", async () => count((await box(A)).things, "can") === 1, 8000);
  kept = (await sql(`select things from public.town_boxes where member_id = $1`, [id]))[0];
  ok("a can is kept with its water", kept.things.find((s) => s?.item === "can")?.water === 4, kept.things);
  await A.shot(`${OUT}/boxdb-open.png`);
  await A.evaluate(`document.querySelector('[data-box-step="half"]').click()`);
  await pick(A, "things", "kangkong");
  await until("half of it is back in my bag", async () => count((await purse(A)).bag, "kangkong") === 6, 8000);
  kept = (await sql(`select b.things, (select town.held(p.doc->'bag', 'kangkong') from public.town_purses p where p.member_id = b.member_id) as bag from public.town_boxes b where b.member_id = $1`, [id]))[0];
  ok("half taken out again: six in the purse the database keeps, six in the box", kept.bag === 6 && count(kept.things, "kangkong") === 6 && /ใส่กระเป๋า/.test(await textOf(A, "[data-box-said]")), kept);
  const deeds = await sql(`select what, thing, n::int as n, doc->'tile' as tile from public.town_deeds where member_id = $1 and what like 'box\\_%' order by id`, [id]);
  const stood = await A.evaluate(`${V}.self()`);
  ok("each deed is written down, with the tile I stood on", deeds.map((d) => `${d.what} ${d.thing} ${d.n}`).join() === "box_put kangkong 12,box_put can 1,box_take kangkong 6"
    && deeds.every((d) => d.tile[0] === Math.floor(stood.x) && d.tile[1] === Math.floor(stood.y)), deeds);

  // loaded again
  await enter(A, "X", BENCH);
  await until("the keeper has the box again", async () => count((await box(A))?.things ?? [], "kangkong") === 6, 10000);
  await warp(A, ...BY);
  await until("the chip is offered by the chest", () => there(A, "[data-box-chip]"), 10000);
  ok("the page loaded again has the same box, and says so by the chest", /2 \/ 10/.test(await textOf(A, "[data-box-chip]")), await textOf(A, "[data-box-chip]"));
  ok("no page errors", A.logs.length === 0, A.logs);

  if (OLD) {
    // a database that has not had v134
    const B = await A.tab("boxdb-old");
    await enter(B, "Y", OLD);
    ok("(the old stand-in has no box)", (await sql(`select to_regprocedure('public.town_box()') is null as none`, [], OLD))[0].none === true);
    await warp(B, ...BY);
    await sleep(1500);
    ok("a database without it: the keeper knows of no box, and by the chest nothing is offered", (await box(B)) === null && !(await there(B, "[data-box-chip]")));
    await warp(B, ...FAR);
    const where = await chest(B);
    await tap(B, where.x, where.y);
    await sleep(1500);
    const stays = await B.evaluate(`${V}.self()`);
    ok("…a tap on the chest opens nothing, and nobody walks up to it: it is only a chest", !(await there(B, "[data-box-panel]")) && Math.floor(stays.x) === FAR[0] && Math.floor(stays.y) === FAR[1], stays);
    ok("…and nothing breaks", B.logs.length === 0, B.logs);
  }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e.message}`);
  await A.shot(`${OUT}/boxdb-stopped.png`).catch(() => {});
} finally {
  A.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
