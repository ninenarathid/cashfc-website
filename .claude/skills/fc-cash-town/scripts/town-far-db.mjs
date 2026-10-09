// The far side as a member will meet it, tried in a real browser before anything is pushed: two windows of the dev
// test room, each kept by the database's keeper (lib/town/keeper.ts's DbKeeper), asking a stand-in for the database
// with the whole of v164 in it (its base, the woodcutters' part and the miners'). Production is not touched. `next dev`
// only. The rules were built against the browser's trial and each part proved alone by SQL dry runs: this is where
// the page and the database's own functions meet.
//
//   1  the gate: with `far_open` 0 the keeper says the far side is not open, the village's whole bridge is walked
//      over, the gate on the far bank says "not open yet" and leads nowhere, nothing of the far side answers, and the
//      lines of work have no felling and no mining; with 1, the gate leads to the mountain's foot
//   2  felling: a board put up from what the database said, a second member refused at the held tree and then
//      bracing its trunk, the board played through, the wood, the deeds and the go as the database kept them; then
//      the plain press on another tree
//   3  mining at the foot: a rock broken by real taps; a rock one member struck first and the other broke
//   4  the cave: through the mouth to floor 1, the rock that hides the way down (asked of the stand-in), the ladder
//      to floor 2, a vein opened (asked of the stand-in) and played with real presses, a torch set down, the board of
//      the deepest floor, a resting floor and its lift
//   5  `unlaid`: the day's floors taken out of the stand-in; the page neither crashes nor hangs, asks the site's
//      route (which cannot lay a stand-in) and says so in words; laid again, it goes on
//   6  pictures at 1440x900 and 390x844: the gate with its label, the foot with the HUD, a felling board, a cave
//      floor lit by the lamp, a vein's board
//
// Each line says what the page showed (its marks) and what the stand-in's rows say. After the five, the far side is
// shut again by its knob under a member who stands in the cave: the page takes the refusal for the far side shut and
// not for the game shut.
//
// On 2026-10-09, 58 of 60: the two that fail are things a member would meet, and are left failing until they are
// seen to. The cave's board of the deepest floor is drawn only on the blacksmith's screen, which a database without
// a smith never opens. And a page that came in while the day's floors were not laid has no words for it (its keeper
// was told of no cave, so the mine's panel draws nothing and a tap on a rock is a step).
//
//   (in the scratch folder of the dry runs, see scripts/db/README.md; leave it running)
//   BENCH_EXTRA=<v164's three parts as one draft, each part's places filled (db/build-v164.mjs)> node town-bench.mjs 3187
//   node town-far-db.mjs <base> <outdir> [bench]
//
// The stand-in has to tell the database who a tester is wherever the page names one: `p_feller` of `town_fell_brace`
// among them (as it does `p_other` and a stone's `p_to`). Where it does not, the brace is answered as out of reach.
// The site's own route /api/town/cave is asked once here before anybody comes in (a page asks it at every `unlaid`):
// it writes to the real project and to nothing else, where there is no such table until v164 has run, so it lays
// nothing; the day's floors are laid into the stand-in here, as the site's key would lay them.
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameGone } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = ".", BENCH = "http://127.0.0.1:3187"] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const brief = (d) => (d === undefined || d === "" ? "" : (typeof d === "string" ? d : JSON.stringify(d)).replace(/\s+/g, " ").slice(0, 420));
/** A line: `ok` or `FAIL`, what was looked for, and what was seen. */
const ok = (n, c, saw) => { c ? pass++ : fail++; console.log(`  ${c ? "ok  " : "FAIL"} ${n}${brief(saw) ? `  [${brief(saw)}]` : ""}`); };
const note = (text) => console.log(`       (${text})`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const K = "window.__townKeeper", V = "window.__townView", R = "window.__townTrees", M = "window.__townMine", MORE = "window.__townMore", G = "window.__townGame";
const DESKTOP = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844, dpr: 2, mobile: true };

/* ── the stand-in, asked directly ── */
const post = async (path, body) => (await fetch(`${BENCH}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })).json();
const sql = async (text, params = []) => { const r = await post("/bench/sql", { sql: text, params }); if (!r.rows) throw new Error(`sql: ${JSON.stringify(r)}`); return r.rows; };
const one = async (text, params = []) => (await sql(text, params))[0];
/** A function a member calls, asked as a tester (by the id the room has of them): its answer and the status it came with. */
const rpc = async (as, fn, args = {}) => { const r = await fetch(`${BENCH}/rest/v1/rpc/${fn}`, { method: "POST", headers: { "content-type": "application/json", "x-town-as": as }, body: JSON.stringify(args) }); return { status: r.status, body: await r.json().catch(() => null) }; };
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);
/** The words the far side's deeds are written down under. */
const FAR_DEEDS = ["fell", "brace", "root", "mine", "hew", "delve", "crystal", "vein", "vein_odd", "torch", "lift"];
const deedsSince = (from) => sql(`select d.member_id as by, d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [from]);
const kept = async (id) => (await one(`select coalesce(p.coins, 0)::int as coins, p.doc from public.town_purses p where p.member_id = $1`, [id]));
const count = (bag, item) => (bag ?? []).reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
/** Whether a bag has gained, since it was last looked at, just what was said to have come (`[[thing, how many], …]`). */
const gained = (was, is, got) => got.every(([item, n]) => count(is, item) - count(was, item) === n);
const grove = async () => (await one(`select doc from public.town_things where key = 'grove'`)).doc;
const caveOf = async (place) => (await one(`select (select c.doc from public.town_cave c where c.place = $1) as doc`, [place])).doc;
const setPurse = (id, coins, bag) => sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [id, coins, JSON.stringify([...bag, ...Array(12).fill(null)].slice(0, 12))]);
/** What every rock of a floor holds this turn for a member's pick, as the database rolls it (the page is never told). */
const HOLDS = `with d as (select town.now_ms() as now, town.day_of(town.now_ms()) as day),
  f as (select d.now, d.day, town.cave_laid(d.day, $1)->'rocks' as rocks, town.mine_crystal(d.day) as c, town.cave_at(town.cave_kept($1, false), d.now) as cave from d),
  g as (select f.*, case when (f.c->>'floor')::integer = $1 then (f.c->>'rock')::integer end as crock from f)
  select (r.v->>0)::integer as rock, (r.v->>1)::integer as x, (r.v->>2)::integer as y, coalesce(g.cave->'broken'->'ids', '[]'::jsonb) @> to_jsonb((r.v->>0)::integer) as gone,
    town.mine_holds(town.mine_word(), $1, (r.v->>0)::integer, town.mine_turn(g.now), town.mine_today(town.mine_word(), $1, g.day, g.rocks, g.cave, g.crock), town.mine_pick(town.purse_of($2::uuid, false))) as holds
  from g, jsonb_array_elements(g.rocks) with ordinality r(v, ord) order by r.ord`;
const holds = (floor, id) => sql(HOLDS, [floor, id]);
/** Today's thirty floors laid into the stand-in as the site's key lays them (insert only, through the table's own guard), from the page's own generator. */
async function layDay() {
  process.env.FC_REPO ??= fileURLToPath(new URL("../../../../", import.meta.url)).replace(/\\/g, "/").replace(/\/$/, "");
  await import("./db/repo-ts-town.mjs");
  const { caveLayout } = await import("@/lib/town/mining-row");
  const { MINING } = await import("@/lib/town/mining");
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  for (let f = 1; f <= MINING.floors; f++) {
    const r = await post("/bench/sql", { sql: `set role service_role; insert into public.town_cave_days (day, floor, layout) values (${day}, ${f}, $lay$${JSON.stringify(caveLayout(f, day))}$lay$::jsonb) on conflict do nothing; reset role;` });
    if (!r.rows) throw new Error(`floor ${f} was not laid: ${JSON.stringify(r)}`);
  }
  return { day, ...(await one(`select count(*)::int as floors, town.cave_is_laid($1) as laid from public.town_cave_days where day = $1`, [day])) };
}
const unlay = async () => { const day = (await one(`select town.day_of(town.now_ms()) as d`)).d; await sql(`delete from public.town_cave_days where day = $1`, [day]); return day; };

/* ── a page, driven as a member's hand drives it ── */
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const self = (X) => X.evaluate(`${V}.self()`);
const purse = (X) => X.evaluate(`${K}.purse()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
const marks = (X, sel) => X.evaluate(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((e) => ({ ...e.dataset }))`);
const frames = (X) => X.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const go = async (X, place) => { const went = await X.evaluate(`${MORE}.go(${JSON.stringify(place)})`); await sleep(1200); return went; };
/** My purse read again from the stand-in (after it was set up by hand there), and the thing of a kind taken into the hand. */
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await sleep(200); };
const hold = async (X, item) => { await X.evaluate(`${K}.hold(${K}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})).then(() => null)`); await sleep(350); };
const origin = (X) => X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
/** A real press of the mouse at a point of the window. */
const click = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
/** A real press on what a selector finds. */
const press = async (X, sel, wait = 350) => {
  const at = await X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!at) throw new Error(`nothing to press: ${sel}`);
  await click(X, at.x, at.y);
  if (wait) await sleep(wait);
};
/** What of the far side can be tapped on the map this frame (components/town/mountain-art's own list), and a real tap on one of them. */
const hits = (X, kind) => X.evaluate(`(${MORE}?.hits?.() ?? []).filter((h) => h.kind === ${JSON.stringify(kind)})`);
const tapHit = async (X, kind, id = null, lift = 6) => {
  const h = (await hits(X, kind)).find((x) => id === null || x.id === id);
  if (!h) return false;
  const o = await origin(X);
  await click(X, o.x + h.x, o.y + h.y - lift);
  return true;
};
/** Every word the map has drawn in the last half second (a gateway's label is drawn, not a mark: the canvas is listened to). */
const listen = (X) => X.evaluate(`(() => { if (window.__drawn) return; window.__drawn = new Map(); const was = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) { window.__drawn.set(String(t), performance.now()); return was.call(this, t, ...rest); }; })()`);
const drawn = (X) => X.evaluate(`[...(window.__drawn ?? [])].filter(([, at]) => performance.now() - at < 500).map(([t]) => t)`);
/** A picture at the desktop's size and at a phone's (the window is put back as it was). */
async function shots(X, name) {
  await frames(X);
  await X.shot(`${OUT}/far-db-${name}-desktop.png`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: PHONE.width, height: PHONE.height, deviceScaleFactor: PHONE.dpr, mobile: true });
  await sleep(900);
  await X.shot(`${OUT}/far-db-${name}-phone.png`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: DESKTOP.width, height: DESKTOP.height, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  await frames(X);
}
async function enter(X, letter) {
  await X.goto("about:blank");
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=far6e-db&townHour=12&townWeather=clear&townDb=${encodeURIComponent(BENCH)}`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the database's keeper has read the purse", () => X.evaluate(`!!${K} && ${K}.ready() && ${K}.open() === true`), 60000);
  await listen(X);
  X.born = await X.evaluate(`performance.timeOrigin`);
  return X.evaluate(`${K}.id`);
}
/** Before a step: the page is the one that was entered (the dev server's own rebuild loads a page anew now and then), and its keeper answers. */
async function alive(X) {
  await until("the page is up", async () => (await status(X)) === "ready" && (await X.evaluate(`!!${K} && ${K}.ready()`)), 120000);
  const born = await X.evaluate(`performance.timeOrigin`);
  if (born !== X.born) { note(`${X.label}: the page loaded itself anew since it was entered (the dev server's rebuild): what it stood at is set again`); X.born = born; await listen(X); await sleep(2500); }
}
/** The lines of work the panel lists, read off the panel itself (opened and shut again by its button). */
async function linesShown(X) {
  await press(X, "[data-town-lines-button]", 700);
  const lines = await X.evaluate(`[...document.querySelectorAll("[data-lines-line]")].map((e) => e.dataset.linesLine)`);
  if (await there(X, "[data-town-lines-button]")) await press(X, "[data-town-lines-button]", 400);
  return lines;
}
/** The tiles beside a tree that can be stood on, those with the fewest other trees near first. */
const besideTree = (X, id) => X.evaluate(`(() => { const wood = ${R}.wood(), t = wood.find((x) => x.id === ${id}), n = t.size || 1, all = [];
  const far = (o, x, y) => { const m = o.size || 1; return Math.max(Math.max(o.x - x, 0, x - (o.x + m - 1)), Math.max(o.y - y, 0, y - (o.y + m - 1))); };
  for (let y = t.y - 1; y <= t.y + n; y++) for (let x = t.x - 1; x <= t.x + n; x++) if ((x < t.x || x >= t.x + n || y < t.y || y >= t.y + n) && ${V}.walkable(x, y)) all.push([x, y, wood.filter((o) => o.id !== t.id && far(o, x, y) <= 1).length]);
  return all.sort((a, b) => a[2] - b[2]).map(([x, y]) => [x, y]); })()`);
/** What a rock left, as its card on the page says it. */
const cameOf = (X) => X.evaluate(`(() => { const c = document.querySelector("[data-mine-came]"); if (!c) return null;
  return { kind: c.dataset.mineCame, by: c.dataset.mineBy, helped: c.dataset.mineHelped, got: [...c.querySelectorAll("[data-mine-got]")].map((e) => [e.dataset.mineGot, Number(e.dataset.n)]) }; })()`);
const rockOf = async (X, floor, rock) => (await X.evaluate(`${M}.rocks(${floor})`)).find((r) => r.id === rock);
/** Stand beside a rock of a place (the script's own hand puts me there), for a tap on it to be a swing. */
async function standBy(X, floor, rock, nth = 0) {
  const r = await rockOf(X, floor, rock);
  const spots = await X.evaluate(`[[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [${r.x} + dx, ${r.y} + dy]).filter(([x, y]) => ${V}.walkable(x, y))`);
  const spot = spots[Math.min(nth, spots.length - 1)];
  if (!spot) throw new Error(`no tile to stand on beside rock ${rock} of place ${floor}`);
  await warp(X, spot[0], spot[1]);
  return spot;
}
/** Real taps on a rock I stand beside, a swing's time apart, until it is gone on this page or the taps are spent. Says how many, whether it went, and every word the page said meanwhile. */
async function strike(X, floor, rock, most = 24) {
  const kind = floor ? "caveRock" : "rock", said = [], gone = () => X.evaluate(`(${M}.told()?.gone?.[${JSON.stringify(String(floor))}] ?? []).includes(${rock})`);
  let taps = 0;
  for (let tries = 0; tries < most && !(await gone()); tries++) {
    if (!(await tapHit(X, kind, rock))) { await sleep(300); continue; }
    taps++;
    await sleep(420);
    const word = await textOf(X, "[data-mine-note]");
    if (word && !said.includes(word)) said.push(word);
  }
  return { taps, gone: await gone(), said };
}
/** Play the vein's board that is up with real presses on its cells: each strike the one that runs the crack over the most ore it has not passed. */
async function playVein(X) {
  const struck = [];
  for (let i = 0; i < 24; i++) {
    const next = await X.evaluate(`(() => { const b = document.querySelector("[data-town-vein]"); if (!b || b.dataset.phase !== "play") return null;
      const cells = [...b.querySelectorAll("[data-vein-cell]")].map((e) => ({ at: e.dataset.veinCell.split(",").map(Number), kind: e.dataset.kind, may: e.dataset.may === "1", got: e.dataset.got === "1", head: e.dataset.head === "1" }));
      const head = cells.find((c) => c.head)?.at, at = (x, y) => cells.find((c) => c.at[0] === x && c.at[1] === y);
      const may = cells.filter((c) => c.may && c.kind !== "knot" && c.kind !== "ice");
      if (!head || !may.length) return null;
      const worth = (c) => { const dx = Math.sign(c.at[0] - head[0]), dy = Math.sign(c.at[1] - head[1]), far = Math.abs(c.at[0] - head[0]) + Math.abs(c.at[1] - head[1]); let n = 0;
        for (let k = 1; k <= far; k++) { const p = at(head[0] + dx * k, head[1] + dy * k); if (p && (p.kind === "ore" || p.kind === "gem") && !p.got) n++; } return n * 10 + far; };
      return may.sort((a, b) => worth(b) - worth(a))[0].at; })()`);
    if (!next) break;
    await press(X, `[data-vein-cell="${next[0]},${next[1]}"]`, 260);
    struck.push(next);
  }
  return struck;
}
/** Put the stand-in's clock on to the rocks' next turn where little of this one is left (rocks that are broken stand again at a turn's end); never over the day's end. */
async function freshTurn(least, pages) {
  const t = await one(`select town.now_ms() as now, (town.cat('mining')->>'turn')::bigint as turn, town.day_of(town.now_ms()) as day`);
  const left = Number(t.turn) - (Number(t.now) % Number(t.turn));
  if (left >= least) return false;
  if ((await one(`select town.day_of($1::bigint) as d`, [Number(t.now) + left + 2000])).d !== t.day) { note("the rocks' turn is nearly over and so is the day: the clock is left as it is"); return false; }
  await post("/bench/skip", { ms: left + 2000 });
  for (const X of pages) { await again(X); await X.evaluate(`${K}.nudged("cave")`); }
  await sleep(1200);
  note(`the stand-in's clock put on ${Math.round((left + 2000) / 1000)} s, to the rocks' next turn`);
  return true;
}

if (!(await fetch(`${BENCH}/bench/who?as=check`).then((r) => r.ok).catch(() => false))) {
  console.log(`no stand-in database at ${BENCH}: start scripts/db/town-bench.mjs first, with v164's draft (see this file's head)`);
  process.exit(2);
}
if (!(await one(`select to_regprocedure('public.town_far()') is not null and to_regprocedure('public.town_fell(jsonb, integer, integer)') is not null and to_regprocedure('public.town_vein(jsonb)') is not null as there`)).there) {
  console.log(`the stand-in at ${BENCH} has not had v164 whole (its base, the woodcutters' part and the miners'): start it with the draft in BENCH_EXTRA`);
  process.exit(2);
}

const A = await browser("farA", DESKTOP);
let B = null;
try {
  /* ── the stand-in set up: shut, the bridge whole, nothing felled or broken, the day laid ── */
  console.log("the stand-in, set up");
  await sql(`update public.town_knobs set value = 0 where key = 'far_open'`);
  await sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  await sql(`update public.town_works set opened_at = coalesce(opened_at, now()), done_at = coalesce(done_at, now()) where id = 'bridge'`);
  await sql(`update public.town_work_needs set have = need where work = 'bridge'`);
  await sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
  await sql(`delete from public.town_cave where true`);
  await unlay();
  const laid = await layDay();
  ok("today's thirty floors are laid into the stand-in as the site's key lays them, from the page's own generator", laid.floors === 30 && laid.laid === true, laid);
  const bridge = await one(`select n.have, n.need, w.opened_at is not null as open, w.done_at is not null as done from public.town_works w join public.town_work_needs n on n.work = w.id where w.id = 'bridge'`);
  ok("the stand-in's bridge is whole and the far side is shut by its knob", bridge.have === bridge.need && bridge.open && bridge.done && (await one(`select value from public.town_knobs where key = 'far_open'`)).value === 0, bridge);
  // (asked once before anybody is in: a page asks it at every `unlaid`, and the dev server's first build of it may load open pages anew)
  const route = await fetch(`${BASE}/api/town/cave`).then((r) => r.json()).catch((e) => ({ error: e.message }));
  ok("the site's own route lays nothing: it writes to the real project, which has no such table yet, and never to a stand-in", route.laid === 0, route);
  const from = await lastDeed();

  /* ── 1: the gate ── */
  console.log("1  the gate, shut and opened");
  const a = await enter(A, "A");
  const idA = (await me(A)).id, nameA = (await me(A)).name;
  await setPurse(a, 200, [{ item: "axe", n: 1 }, { item: "pick", n: 1 }, { item: "torch", n: 2 }]);
  await again(A);
  await sleep(1500);
  const shut = { trial: await A.evaluate(`${K}.trial === null`), far: await A.evaluate(`${K}.far()`), db: (await rpc(idA, "town_far")).body };
  ok("the keeper is the database's, and learns that the far side is not open to this member", shut.trial === true && shut.far === false && shut.db === false, shut);
  // (the bridge is the village's works': a stone short of whole in the stand-in, it is not walked on; a tile of it over the water says)
  const bridgeNow = async () => { await A.evaluate(`${K}.worksLook().then(() => null)`); await sleep(500); return A.evaluate(`({ works: ${K}.works()?.works.bridge.needs.stone ?? null, drawn: ${MORE}.state().bridge, water: ${V}.walkable(7, 31) })`); };
  await sql(`update public.town_work_needs set have = need - 1 where work = 'bridge'`);
  const short = await bridgeNow();
  await sql(`update public.town_work_needs set have = need where work = 'bridge'`);
  const span = await bridgeNow();
  ok("a stone short of whole in the stand-in, the page draws the bridge a span short and nobody walks on it; whole, it is walked on", short.works?.have === short.works?.need - 1 && short.drawn.spans === 5 && short.drawn.open === false && short.water === false && span.water === true, { short, whole: span });
  await warp(A, 12, 28);
  await A.evaluate(`${V}.walk(3.5, 34.5)`);
  const over = await until("over the bridge", async () => { const p = await self(A); return !p.moving && Math.abs(p.x - 3.5) < 0.6 && Math.abs(p.y - 34.5) < 0.6 && p; }, 30000, 250).catch((e) => e.message);
  ok("the village's bridge is whole on the page as in the stand-in, and is walked over to the far bank while the far side is shut", span.works?.have === span.works?.need && span.drawn.spans === 6 && span.drawn.open === true && typeof over === "object", { ...span, over });
  await A.evaluate(`${V}.lookAt(2, 33)`);
  await sleep(900);
  let words = await drawn(A);
  ok("the gate on the far bank is labelled as not open yet", words.includes("ทางขึ้นเขา (ยังไม่เปิด)") && !words.includes("ไปตีนเขา"), words.filter((w) => /เขา/.test(w)));
  await shots(A, "gate-shut");
  let gate = (await A.evaluate(`${V}.gates()`))[0], o = await origin(A);
  await click(A, o.x + (gate.x0 + gate.x1) / 2, o.y + (gate.y0 + gate.y1) / 2);
  await sleep(600);
  let stood = await until("stopped", async () => { const p = await self(A); return !p.moving && p; }, 20000, 250);
  await sleep(1200);
  stood = await self(A);
  ok("a tap on it walks to the gate's tile and leads nowhere: still on the far bank, in town", gate.to[0] === Math.floor(stood.x) && gate.to[1] === Math.floor(stood.y) && stood.y < 100, { to: gate.to, stood });
  // nothing of the far side answers: not where a member can stand, and not on the mountain itself (set there by this script's own hand, which no member has)
  const town = { panels: await A.evaluate(`[typeof ${R}, typeof ${M}]`) };
  await hold(A, "axe");
  await go(A, "slope");
  await sleep(800);
  const tree0 = (await hits(A, "tree"))[0] ?? null;
  if (tree0) { await tapHit(A, "tree", tree0.id); await sleep(900); }
  const mountain = { tree: tree0?.id ?? null, offered: await there(A, "[data-trees-here], [data-trees-offer], [data-game='felling']"), panels: await A.evaluate(`[typeof ${R}, typeof ${M}]`), trees: await A.evaluate(`${K}.trees()`), cave: await A.evaluate(`${K}.cave()`),
    begin: await A.evaluate(`${K}.fellBegin(${tree0?.id ?? 0}, [0, 0])`), asked: [(await rpc(idA, "town_trees")).status, (await rpc(idA, "town_cave", { p_floor: 0 })).status, (await rpc(idA, "town_fell_begin", { p_tree: 0, p_x: 0, p_y: 0 })).status] };
  ok("nothing of the far side answers a tap: its panels are not there, a tree tapped with an axe in the hand offers nothing, and the database refuses its functions outright", same(town.panels, ["undefined", "undefined"])
    && mountain.tree !== null && mountain.offered === false && same(mountain.panels, ["undefined", "undefined"]) && mountain.trees === null && mountain.cave === null && mountain.begin.ok === false && same(mountain.asked, [403, 403, 403])
    && (await deedsSince(from)).filter((d) => FAR_DEEDS.includes(d.what)).length === 0, { town, mountain });
  ok("…and the game itself is as it was: the purse is read, the bag is there", (await A.evaluate(`${K}.open() === true && ${K}.ready()`)) && (await A.evaluate(`[...document.querySelectorAll("button")].some((b) => b.title === "กระเป๋า")`)));
  await warp(A, 3, 34);
  let lines = await linesShown(A);
  let told = await A.evaluate(`(() => { const l = ${K}.lines(); return l ? { given: l.given ?? null, felling: l.lines.felling, mining: l.lines.mining } : null; })()`);
  ok("the lines of work show no felling and no mining", lines.length >= 7 && !lines.includes("felling") && !lines.includes("mining") && told?.given === null, { lines, told });

  await sql(`update public.town_knobs set value = 1 where key = 'far_open'`);
  await sleep(1500);
  ok("opened by its knob, a page that was here already has it shut until it asks again (every five minutes)", (await A.evaluate(`${K}.far()`)) === false && (await rpc(idA, "town_far")).body === true);
  await enter(A, "A");
  await until("the far side is open here", () => A.evaluate(`${K}.far()`), 20000).catch(() => {});
  ok("come in again, the keeper learns that the far side is open", (await A.evaluate(`${K}.far()`)) === true && (await rpc(idA, "town_far")).body === true);
  lines = await linesShown(A);
  told = await A.evaluate(`${K}.lines()?.given ?? null`);
  ok("…and the lines of work have felling and mining", lines.includes("felling") && lines.includes("mining") && same(told, ["felling", "mining"]), { lines, told });
  await warp(A, 3, 34);
  await A.evaluate(`${V}.lookAt(2, 33)`);
  await sleep(900);
  words = await drawn(A);
  ok("the gate on the far bank is labelled as the way to the mountain", words.includes("ไปตีนเขา") && !words.includes("ทางขึ้นเขา (ยังไม่เปิด)"), words.filter((w) => /เขา/.test(w)));
  await shots(A, "gate-open");
  gate = (await A.evaluate(`${V}.gates()`))[0]; o = await origin(A);
  await click(A, o.x + (gate.x0 + gate.x1) / 2, o.y + (gate.y0 + gate.y1) / 2);
  const foot = await until("on the mountain", async () => { const p = await self(A); return p.y >= 200 && !p.moving && p; }, 25000, 250).catch((e) => e.message);
  await until("the far side's panels", () => A.evaluate(`!!${R} && !!${M} && !!${K}.trees() && !!${K}.cave()`), 20000).catch(() => {});
  const farSide = { where: await A.evaluate(`${M}?.where?.() ?? null`), trees: await A.evaluate(`(() => { const t = ${K}.trees(); return t ? { down: t.down.length } : null; })()`), cave: await A.evaluate(`(() => { const c = ${K}.cave(); return c ? { day: c.day, place: c.place } : null; })()`) };
  ok("a tap on it leads to the mountain's foot, and the keeper has the trees and the cave from the database (every tree grown, today's cave)", typeof foot === "object" && farSide.where?.mountain === true && farSide.trees?.down === 0 && farSide.cave?.day === laid.day, { foot, ...farSide });
  await sleep(1200);
  await shots(A, "foot");

  /* ── 2: felling ── */
  console.log("2  felling");
  B = await A.window("farB", DESKTOP);
  const b = await enter(B, "B");
  const idB = (await me(B)).id, nameB = (await me(B)).name;
  await setPurse(b, 200, [{ item: "axe", n: 1 }, { item: "pick", n: 1 }, { item: "torch", n: 2 }]);
  await again(B);
  await until("the far side is open to the other", () => B.evaluate(`${K}.far() && !!${K}.trees()`), 20000);
  ok("two members, each their own, the far side open to both", a !== b && idA !== idB && (await B.evaluate(`${K}.far()`)) === true, { a, b });
  await alive(A);
  for (const X of [A, B]) { await hold(X, "axe"); await go(X, "slope"); }
  await until("the trees' layer on both", async () => (await A.evaluate(`!!${R} && ${R}.wood().length > 100`)) && (await B.evaluate(`!!${R} && ${R}.wood().length > 100`)), 60000);
  // two pines a little way apart: one with nothing else near, and one with a tile beside it that is beside no other tree
  const [t1, t2] = await A.evaluate(`(() => { const wood = ${R}.wood(), pines = wood.filter((t) => t.tier === 1 && !t.elder), far = (p, q) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
    const clear = (t) => { for (let y = t.y - 1; y <= t.y + 1; y++) for (let x = t.x - 1; x <= t.x + 1; x++) if ((x !== t.x || y !== t.y) && ${V}.walkable(x, y) && !wood.some((x2) => x2.id !== t.id && Math.max(Math.abs(x2.x - x), Math.abs(x2.y - y)) <= 1)) return true; return false; };
    const first = pines.find((t) => !wood.some((x) => x.id !== t.id && far(x, t) <= 3)) ?? pines.find(clear);
    return [first, pines.find((t) => t.id !== first.id && far(t, first) > 5 && clear(t)) ?? null]; })()`);
  if (!t1 || !t2) throw new Error(`no two pines to fell: ${JSON.stringify([t1, t2])}`);
  let spots = await besideTree(A, t1.id);
  const spotB = spots[1] ?? spots[0];
  await warp(A, spots[0][0], spots[0][1]);
  await until("the tree is offered", async () => (await A.evaluate(`${R}.here()`)) === t1.id, 8000, 100).catch(() => {});
  let offer = await marks(A, "[data-trees-here], [data-trees-plain], [data-trees-offer]");
  ok("beside a pine with the axe in the hand: the plain press and the board are offered", offer.some((m) => m.treesHere === String(t1.id)) && offer.some((m) => m.treesPlain === String(t1.id)) && offer.some((m) => m.treesOffer === String(t1.id)), offer);
  let deeds0 = await lastDeed();
  await press(A, `[data-trees-offer="${t1.id}"]`);
  await until("the board, made from what the database said", async () => (await A.evaluate(`${G}?.kind ?? null`)) === "felling", 8000, 60);
  const board = await A.evaluate(`(() => { const s = ${G}.state(); return { trees: s.trees, chops: s.chops, girth: s.girth, family: s.family }; })()`);
  let wood = await grove();
  ok("a press puts the board up, from the game the database put together; the tree is held for its feller there", (await there(A, `[data-game="felling"][data-tree="${t1.id}"]`)) && same(board.trees, [t1.id]) && board.chops > 0 && same(wood.goes?.[a]?.trees, [t1.id]), { board, goes: wood.goes });
  await shots(A, "felling");
  // the other member, at the held tree with an axe: told whose it is, refused by the database, and no board
  await warp(B, spotB[0], spotB[1]);
  await until("the other is told whose tree it is", () => there(B, "[data-trees-held]"), 12000, 150).catch(() => {});
  const heldMark = { held: await B.evaluate(`document.querySelector("[data-trees-held]")?.dataset.treesHeld ?? null`), words: await textOf(B, "[data-trees-held]"), offer: await there(B, "[data-trees-offer]") };
  ok("a second member at the held tree is told whose it is, and is offered no board", heldMark.held === idA && (heldMark.words ?? "").includes(nameA) && heldMark.offer === false, heldMark);
  await B.evaluate(`${R}.begin(${t1.id})`);
  await until("the refusal's words", () => there(B, "[data-trees-note]"), 5000, 60).catch(() => {});
  const refusal = { note: await textOf(B, "[data-trees-note]"), board: await B.evaluate(`${G}?.kind ?? null`), db: (await rpc(idB, "town_fell_begin", { p_tree: t1.id, p_x: spotB[0], p_y: spotB[1] })).body?.why ?? null };
  ok("…and a board asked for all the same is refused by the database (`held`) in words, with no board and no crash", refusal.note === "มีคนกำลังโค่นต้นนี้อยู่" && refusal.board === null && refusal.db === "held" && (await status(B)) === "ready", refusal);
  await until("the brace is offered", () => there(B, `[data-trees-brace="${t1.id}"]`), 10000, 150).catch(() => {});
  const chip = await textOf(B, "[data-trees-brace]");
  if (await there(B, "[data-trees-brace]")) await press(B, "[data-trees-brace]");
  await until("the trunk is braced", () => there(B, `[data-trees-bracing="${t1.id}"]`), 8000, 100).catch(() => {});
  await until("the feller's board says so", () => there(A, "[data-felling-braced]"), 8000, 150).catch(() => {});
  wood = await grove();
  const braced = { chip, bracing: await textOf(B, "[data-trees-bracing]"), note: await textOf(B, "[data-trees-note]"), board: await textOf(A, "[data-felling-braced]"), db: wood.goes?.[a]?.braced ?? null };
  ok("the other braces the trunk by a press: the database has the brace on the go, and the feller's board says who", (braced.chip ?? "").includes(nameA) && !!braced.bracing && (braced.board ?? "").includes(nameB) && braced.db === b, braced);
  if (braced.db !== b && /ติดต่อเมืองไม่ได้/.test(braced.note ?? "")) note("the brace could not be reached: does the stand-in tell the database who `p_feller` is? (scripts/db/town-bench.mjs)");
  await A.evaluate(`${G}.auto(true, 130)`);
  await gameGone(A, 30000);
  await until("the card", () => A.evaluate(`!!document.querySelector("[data-trees-card]") || !!${R}.note()`), 8000, 60).catch(() => {});
  const card = await A.evaluate(`(() => { const c = document.querySelector("[data-trees-card]"); if (!c) return null;
    return { through: c.dataset.through, got: [...c.querySelectorAll("li[data-trees-got]")].map((e) => [e.dataset.treesGot, Number(e.dataset.n)]), braced: !!c.querySelector("[data-trees-braced]"), felled: [...c.querySelectorAll("[data-trees-felled]")].map((e) => Number(e.dataset.treesFelled)) }; })()`);
  const bracerTold = await until("the bracer is told what the brace gave", () => B.evaluate(`(() => { const n = document.querySelector("[data-trees-note]"); const g = n?.querySelector("[data-trees-got]"); return g ? { words: n.innerText.replace(/\\s+/g, " ").trim(), got: [g.dataset.treesGot, Number(g.dataset.n)] } : null; })()`), 9000, 100).catch((e) => e.message);
  let deeds = await deedsSince(deeds0);
  const fell = deeds.find((d) => d.what === "fell"), brace = deeds.find((d) => d.what === "brace");
  ok("played through, the card says what the database gave: the tree's logs and its fine timber, and that a friend braced", card?.through === "true" && same(card.felled, [t1.id]) && count(card.got.map(([item, n]) => ({ item, n })), "log") === 2 && card.braced === true && same(card.got, fell?.doc.got ?? null), { card, got: fell?.doc.got });
  let pa = await kept(a), pb = await kept(b);
  const bagA = (await purse(A)).bag;
  ok("the wood is in the feller's purse as the database keeps it, and on the page, for two stamina", !!card && card.got.every(([item, n]) => count(pa.doc.bag, item) === n && count(bagA, item) === n) && pa.doc.stamina.left === 98, { bag: pa.doc.bag.filter(Boolean), stamina: pa.doc.stamina });
  ok("the deeds are written down: the tree felled, with the tile, the brace and what it gave; and the brace, in the bracer's name", fell?.by === a && fell.thing === "pine" && fell.doc.tree === t1.id && fell.doc.braced === b && same(fell.doc.tile, spots[0]) && brace?.by === b && brace.n === 1 && brace.doc.feller === a && brace.doc.tree === t1.id, deeds);
  ok("the bracer is paid a log into their own purse, and is told so on their page", count(pb.doc.bag, "log") === 1 && typeof bracerTold === "object" && same(bracerTold.got, ["log", 1]), { bag: pb.doc.bag.filter(Boolean), told: bracerTold });
  const went = await one(`select t.game, t.board, t.what, t.how, t.need, t.hits, t.misses, t.spent from public.town_tries t where t.member_id = $1 order by t.id desc limit 1`, [a]);
  ok("the go is in the go-log, as it was played", went?.game === "felling" && went.board === "felling" && went.what === "pine" && went.how === "done" && went.hits === went.need && went.need === board.chops, went);
  wood = await grove();
  await until("a stump on both pages", async () => (await A.evaluate(`${R}.looks()[${t1.id}]`)) === 0 && (await B.evaluate(`${R}.looks()[${t1.id}]`)) === 0, 10000, 150).catch(() => {});
  ok("the tree is down on both pages and in the stand-in's grove, felled by that member", (await A.evaluate(`${R}.looks()[${t1.id}]`)) === 0 && (await B.evaluate(`${R}.looks()[${t1.id}]`)) === 0 && wood.down?.[String(t1.id)]?.by === a && !wood.goes?.[a], { down: wood.down, goes: wood.goes ?? null });

  // the plain press, on another tree
  spots = await besideTree(A, t2.id);
  await warp(A, spots[0][0], spots[0][1]);
  await until("the other tree is offered", () => there(A, `[data-trees-plain="${t2.id}"]`), 8000, 100);
  deeds0 = await lastDeed();
  await press(A, `[data-trees-plain="${t2.id}"]`);
  // (wood alone is said in a word over the buttons; where the tree let a keepsake fall besides, on a card)
  const plainTold = await until("what the plain way gave", () => A.evaluate(`(() => { const n = document.querySelector("[data-trees-note]"), c = document.querySelector("[data-trees-card]"), on = n?.querySelector("[data-trees-got]") ? n : c;
    return on ? { on: on === n ? "note" : "card", got: [...on.querySelectorAll("[data-trees-got]")].map((e) => [e.dataset.treesGot, Number(e.dataset.n)]) } : null; })()`), 8000, 80).catch((e) => e.message);
  deeds = await deedsSince(deeds0);
  pa = await kept(a);
  await until("the other sees the stump", async () => (await B.evaluate(`${R}.looks()[${t2.id}]`)) === 0, 10000, 150).catch(() => {});
  ok("the plain press on another tree: down at once for its logs, no board, written down as the plain way, and a stump on the other's page", typeof plainTold === "object" && same(plainTold.got, [["log", 2]]) && (await A.evaluate(`${G}?.kind ?? null`)) === null
    && deeds.length === 1 && deeds[0].what === "fell" && deeds[0].doc.how === "plain" && deeds[0].doc.tree === t2.id && count(pa.doc.bag, "log") === 4 && (await B.evaluate(`${R}.looks()[${t2.id}]`)) === 0, { told: plainTold, deeds });

  /* ── 3: mining at the mountain's foot ── */
  console.log("3  mining at the mountain's foot");
  await alive(A); await alive(B);
  for (const X of [A, B]) await hold(X, "pick");
  await freshTurn(8 * 60_000, [A, B]);
  await until("both are told of the rocks", async () => (await A.evaluate(`!!${M}?.told?.()`)) && (await B.evaluate(`!!${M}?.told?.()`)), 20000);
  // two rocks of the foot with room to stand by them and no other rock near
  const [r1, r2] = await A.evaluate(`(() => { const all = ${M}.rocks(0), out = [];
    for (const r of all) { const near = all.filter((x) => x.id !== r.id && Math.max(Math.abs(x.x - r.x), Math.abs(x.y - r.y)) <= 2).length;
      const room = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => ${V}.walkable(r.x + dx, r.y + dy)).length; if (room >= 3) out.push({ id: r.id, near }); }
    return out.sort((p, q) => p.near - q.near).slice(0, 2).map((r) => r.id); })()`);
  deeds0 = await lastDeed();
  let had = { kept: (await kept(a)).doc.bag, page: (await purse(A)).bag };
  let at = await standBy(A, 0, r1);
  const need = await A.evaluate(`${M}.need(0, ${r1})`);
  let did = await strike(A, 0, r1);
  let came = await until("what the rock left", () => cameOf(A), 6000, 80).catch((e) => e.message);
  await sleep(500);
  deeds = await deedsSince(deeds0);
  pa = await kept(a);
  let place = await caveOf(0);
  ok("a rock of the foot broken by real taps with the pick in the hand: as many swings as it takes, and a card of what it left", did.gone && did.taps >= need && did.taps <= need + 1 && typeof came === "object" && came.kind === "rock" && came.got.length > 0 && came.by === "" && came.helped === "", { need, ...did, came });
  const sack = (await purse(A)).bag;
  ok("…what it gave is in the bag as the database keeps it and on the page, the rock is gone in the stand-in, and the deed is written with the tile stood on", typeof came === "object" && gained(had.kept, pa.doc.bag, came.got) && gained(had.page, sack, came.got)
    && (place?.broken?.ids ?? []).includes(r1) && deeds.length === 1 && deeds[0].what === "mine" && deeds[0].by === a && deeds[0].doc.rock === r1 && deeds[0].doc.floor === 0 && same(deeds[0].doc.tile, at), { bag: pa.doc.bag.filter(Boolean), broken: place?.broken, deeds });

  // a rock one member struck first and the other breaks
  await sleep(3400);   // (the first card is put away)
  deeds0 = await lastDeed();
  at = await standBy(A, 0, r2, 0);
  await standBy(B, 0, r2, 2);
  const stonesA = count((await kept(a)).doc.bag, "stone");
  await tapHit(A, "rock", r2);
  await until("the first swing is the database's", async () => !!(await caveOf(0))?.struck?.rocks?.[String(r2)], 6000, 150).catch(() => {});
  place = await caveOf(0);
  await until("the other is told whose rock it is", async () => (await B.evaluate(`${M}.told().struck?.[${JSON.stringify(String(r2))}]?.mine`)) === false, 8000, 150).catch(() => {});
  ok("one member's first swing at a rock is the database's at once: theirs first, a part struck away, and the other's page is told whose it is", place?.struck?.rocks?.[String(r2)]?.first === a && (await B.evaluate(`${M}.told().struck?.[${JSON.stringify(String(r2))}]?.by ?? null`)) === nameA, { struck: place?.struck?.rocks, told: await B.evaluate(`${M}.told().struck`) });
  did = await strike(B, 0, r2);
  const cameB = await until("the helper's card", () => cameOf(B), 6000, 80).catch((e) => e.message);
  const cameA = await until("the card of whoever struck first", async () => { const c = await cameOf(A); return c && c.by ? c : null; }, 10000, 80).catch((e) => e.message);
  await sleep(500);
  deeds = await deedsSince(deeds0);
  pa = await kept(a); pb = await kept(b);
  ok("the other strikes the same rock and breaks it: their page says whose rock they helped with, and gives them nothing of it", typeof cameB === "object" && cameB.helped === nameA && cameB.got.length === 0 && did.said.some((w) => w.includes(nameA)), { ...did, came: cameB });
  ok("whoever struck first is paid, and their page says who struck the last of it away", typeof cameA === "object" && cameA.by === nameB && cameA.got.length > 0 && count(pa.doc.bag, "stone") === stonesA + count(cameA.got.map(([item, n]) => ({ item, n })), "stone") && pa.doc.mine?.paid?.rock === r2, { came: cameA, paid: pa.doc.mine?.paid });
  const mine = deeds.find((d) => d.what === "mine"), hew = deeds.find((d) => d.what === "hew");
  ok("written down: the rock in the name of whoever struck it first, broken by the other; and the hand lent, in the helper's name", mine?.by === a && mine.doc.rock === r2 && mine.doc.by === b && hew?.by === b && hew.doc.rock === r2 && hew.doc.whose === a && count(pb.doc.bag, "stone") === 0, deeds);

  /* ── 4: the cave ── */
  console.log("4  the cave");
  await alive(A); await alive(B);
  await hold(A, "pick");
  await go(A, "mouth");
  ok("the mine's mouth is there to tap", (await hits(A, "mouth")).length === 1);
  await tapHit(A, "mouth", null, 0);
  await until("on the first floor", async () => (await A.evaluate(`${M}.where().floor`)) === 1, 20000, 200).catch(() => {});
  await until("told of the first floor", () => A.evaluate(`${M}.told().place === 1`), 10000, 200).catch(() => {});
  await sleep(1500);
  const rocks1 = await A.evaluate(`${M}.rocks(1).map((r) => [r.id, r.x, r.y])`), laid1 = (await one(`select town.cave_laid($1, 1) as l`, [laid.day])).l;
  const lit = await A.evaluate(`${MORE}.state().lit`);
  ok("a tap on the mouth walks in, to floor 1: the floor the page lays out is the one the stand-in has for today, rock for rock, and the ladder's lamp lights it", (await A.evaluate(`${M}.where().floor`)) === 1 && rocks1.length > 0 && same(rocks1, laid1.rocks.map((r) => [r[0], r[1], r[2]])) && lit.lights >= 1 && lit.lit > 0, { rocks: rocks1.length, lit });
  await shots(A, "cave");
  let all = await holds(1, a);
  const way = all.find((r) => r.holds.kind === "way"), stone = all.find((r) => r.holds.kind === "stone" && !r.holds.moss && !r.gone);
  deeds0 = await lastDeed();
  await standBy(A, 1, stone.rock);
  did = await strike(A, 1, stone.rock);
  came = await until("what the rock left", () => cameOf(A), 6000, 80).catch((e) => e.message);
  ok("a rock of the cave broken", typeof came === "object" && came.kind === "rock" && came.got.length > 0, { rock: stone.rock, ...did, came });
  await sleep(3400);
  await standBy(A, 1, way.rock);
  did = await strike(A, 1, way.rock);
  came = await until("the way down", async () => { const c = await cameOf(A); return c && c.kind === "way" ? c : null; }, 6000, 80).catch((e) => e.message);
  await sleep(600);
  deeds = await deedsSince(deeds0);
  place = await caveOf(1);
  const wayTold = { card: came, page: await A.evaluate(`${MORE}.way(1)`), told: await A.evaluate(`${M}.told().ways["1"] ?? null`), db: place?.way ?? null };
  ok("the rock the stand-in says hides the way down, broken: the card says the way down is found, the ladder stands where the rock stood, and the database has it open, found by that member", typeof came === "object" && same(wayTold.page, [way.x, way.y]) && wayTold.told?.rock === way.rock && wayTold.db?.rock === way.rock && wayTold.db.by === a
    && deeds.some((d) => d.what === "delve" && d.by === a && d.doc.floor === 1 && d.doc.rock === way.rock), wayTold);
  const deepest = { keeper: await A.evaluate(`${K}.caveBoard()`), smith: await A.evaluate(`${K}.smith()`), page: await A.evaluate(`/ลึกสุดของวันนี้|Today's deepest/.test(document.body.innerText)`) };
  ok("the keeper has the cave's board from the database: floor 2 the deepest today, opened by that member", deepest.keeper?.floor === 2 && deepest.keeper.by === a && deepest.keeper.name === nameA, deepest.keeper);
  ok("the cave's board of the deepest floor is on the page", deepest.page === true, `it is drawn only on the blacksmith's screen (components/town/TownSmith), which opens where the keeper has a smith: this database keeps none (smith ${JSON.stringify(deepest.smith)}), so no page shows it`);
  await tapHit(A, "ladderDown", null, 0);
  await until("on the second floor", async () => (await A.evaluate(`${M}.where().floor`)) === 2, 20000, 200).catch(() => {});
  await until("told of the second floor", () => A.evaluate(`${M}.told().place === 2`), 10000, 200).catch(() => {});
  ok("a tap on the ladder walks down it to floor 2", (await A.evaluate(`${M}.where().floor`)) === 2, await self(A));

  // a vein: which rock holds one this turn is the database's to say (another turn is waited for where no rock of the floor does)
  let vein = null;
  for (let turn = 0; turn < 6 && !vein; turn++) {
    all = await holds(2, a);
    vein = all.find((r) => r.holds.kind === "vein" && !r.gone) ?? null;
    if (!vein && !(await freshTurn(Infinity, [A]))) break;
  }
  if (!vein) ok("a rock of floor 2 holds a vein in one of six turns", false, "none did: the vein is not driven");
  else {
    await freshTurn(4 * 60_000, [A]).then(async (moved) => { if (moved) vein = (await holds(2, a)).find((r) => r.holds.kind === "vein" && !r.gone) ?? vein; });
    deeds0 = await lastDeed();
    await standBy(A, 2, vein.rock);
    did = await strike(A, 2, vein.rock);
    await sleep(700);
    had = { kept: (await kept(a)).doc.bag, page: (await purse(A)).bag };
    await until("the vein's board", () => there(A, "[data-town-vein]"), 8000, 100).catch(() => {});
    const face = await A.evaluate(`(() => { const b = document.querySelector("[data-town-vein]"); return b ? { phase: b.dataset.phase, left: Number(b.dataset.left), of: Number(b.dataset.of), family: b.dataset.family, how: !!b.querySelector("[data-vein-how]") } : null; })()`);
    const open = (await kept(a)).doc.mine?.vein ?? null;
    ok("the rock the stand-in says holds a vein, broken: the vein's board comes up from the database's seed, with its strikes and how it is played", face?.phase === "play" && face.left > 0 && face.of > 0 && face.how && open?.rock === vein.rock && open.seed === vein.holds.seed && (await A.evaluate(`${M}.told().vein?.seed`)) === open.seed, { face, open });
    await shots(A, "vein");
    const struck = await playVein(A);
    const end = await until("what the vein came to", () => A.evaluate(`(() => { const c = document.querySelector("[data-vein-came]"); if (!c) return null;
      return { phase: c.dataset.veinCame, passed: Number(c.dataset.veinPassed ?? -1), got: [...c.querySelectorAll("[data-vein-got]")].map((e) => [e.dataset.veinGot, Number(e.dataset.n)]) }; })()`), 10000, 100).catch((e) => e.message);
    await sleep(600);
    deeds = await deedsSince(deeds0);
    pa = await kept(a);
    const veinDeed = deeds.find((d) => d.what === "vein");
    ok("played out with real presses on its cells: the database accepts the page's account and pays what the board says", typeof end === "object" && end.phase === "came" && end.passed > 0 && end.got.length > 0 && gained(had.kept, pa.doc.bag, end.got) && gained(had.page, (await purse(A)).bag, end.got)
      && veinDeed?.by === a && veinDeed.n === end.passed && veinDeed.doc.rock === vein.rock && same(veinDeed.doc.strikes, struck) && !deeds.some((d) => d.what === "vein_odd") && pa.doc.mine?.vein === null, { struck, end, bag: pa.doc.bag.filter(Boolean), deed: veinDeed && { n: veinDeed.n, rock: veinDeed.doc.rock, passed: veinDeed.doc.passed, of: veinDeed.doc.of, said: veinDeed.doc.said } });
    const veinGo = await one(`select t.game, t.board, t.what, t.how, t.need, t.hits from public.town_tries t where t.member_id = $1 order by t.id desc limit 1`, [a]);
    ok("…and the go at the vein is in the go-log", veinGo?.game === "mining" && veinGo.board === "vein" && typeof end === "object" && veinGo.hits === end.passed, veinGo);
    if (await there(A, "[data-vein-next]")) await press(A, "[data-vein-next]", 500);
    ok("the board is put away by its press", !(await there(A, "[data-town-vein]")));
  }

  // a torch set down
  await hold(A, "torch");
  await until("the torch is offered", () => there(A, "[data-mine-torch]"), 6000, 100).catch(() => {});
  deeds0 = await lastDeed();
  const before = { lights: (await A.evaluate(`${MORE}.state().lit`)).lights, torches: count((await kept(a)).doc.bag, "torch"), at: await self(A) };
  if (await there(A, "[data-mine-torch]")) await press(A, "[data-mine-torch]");
  await until("a torch burns", () => A.evaluate(`${M}.told().torches.length > 0`), 6000, 100).catch(() => {});
  await sleep(1200);
  deeds = await deedsSince(deeds0);
  place = await caveOf(2);
  pa = await kept(a);
  const tile = [Math.floor(before.at.x), Math.floor(before.at.y)];
  ok("a torch in the hand in the cave is set down by its press: one fewer in the bag, it burns on that tile for everybody in the stand-in, the floor has a light more, and the deed is written", count(pa.doc.bag, "torch") === before.torches - 1
    && (place?.torches ?? []).some((t) => t.x === tile[0] && t.y === tile[1] && t.by === a) && (await A.evaluate(`${MORE}.state().lit`)).lights === before.lights + 1 && deeds.some((d) => d.what === "torch" && d.by === a && same(d.doc.tile, tile)), { torches: place?.torches, deeds: deeds.map((d) => d.what) });

  // a resting floor and its lift: the ways down to it opened in the stand-in by its owner's hand (nine floors are not dug here)
  for (let f = 2; f <= 9; f++) {
    const w = (await holds(f, a)).find((r) => r.holds.kind === "way");
    if (w) await sql(`select town.keep_cave($1, town.cave_open_way(town.cave_at(town.cave_kept($1, true), town.now_ms()), $1, jsonb_build_object('rock', $2::integer, 'x', $3::integer, 'y', $4::integer, 'by', $5::text, 'name', $6::text, 'at', town.now_ms())))`, [f, w.rock, w.x, w.y, a, nameA]);
  }
  await hold(A, "pick");
  deeds0 = await lastDeed();
  await A.evaluate(`${M}.meant()`);
  await go(A, "cave10");
  await until("the resting floor is a stop of mine", () => A.evaluate(`${M}.told().rests.includes(10)`), 10000, 200).catch(() => {});
  ok("come to the resting floor (set there by this script's hand, its ways opened in the stand-in), it is one of my lift's stops in the database", (await A.evaluate(`${M}.where().floor`)) === 10 && same(await A.evaluate(`${M}.told().rests`), [10]) && same((await kept(a)).doc.mine?.rests, [10]), (await kept(a)).doc.mine?.rests);
  const liftAt = (await one(`select town.cave_laid($1, 10)->'liftAt' as at`, [laid.day])).at;
  await warp(A, liftAt[0] + 2, liftAt[1] + 2);
  await tapHit(A, "lift", null, 0);
  await until("the lift's panel", () => there(A, "[data-mine-lift]"), 10000, 150).catch(() => {});
  const stops = await marks(A, "[data-lift-stop]");
  ok("a tap on the lift opens its panel: here at 10, the mouth reached, the deeper stops not", same(stops.map((s) => [s.liftStop, s.state]), [["0", "reached"], ["10", "here"], ["20", "far"], ["30", "far"]]), stops.map((s) => `${s.liftStop}:${s.state}`));
  if (await there(A, '[data-lift-stop="0"]')) await press(A, '[data-lift-stop="0"]', 900);
  await until("at the mouth", async () => (await A.evaluate(`${M}.where().mountain`)) === true, 8000, 150).catch(() => {});
  await sleep(900);
  const up = await self(A);
  // (a tap on the mouth, from where the lift set me down: asked where to, and not walked on in)
  await tapHit(A, "mouth", null, 0);
  await until("the lift's panel at the mouth", () => there(A, "[data-mine-lift]"), 10000, 150).catch(() => {});
  await sleep(2500);
  const atMouth = { stops: (await marks(A, "[data-lift-stop]")).map((s) => `${s.liftStop}:${s.state}`), walk: await there(A, "[data-lift-walk]"), where: await A.evaluate(`${M}.where()`) };
  ok("ridden up, I stand before the mouth; a tap on the mouth asks where to and leaves me outside: here at the mouth, 10 reached, and the walk down offered", up.y >= 200 && up.y < 320 && atMouth.where.mountain === true && atMouth.where.floor === 0
    && same(atMouth.stops, ["0:here", "10:reached", "20:far", "30:far"]) && atMouth.walk === true, { up, ...atMouth });
  if (await there(A, '[data-lift-stop="10"]')) await press(A, '[data-lift-stop="10"]', 900);
  await until("on the resting floor again", async () => (await A.evaluate(`${M}.where().floor`)) === 10, 8000, 150).catch(() => {});
  await sleep(900);
  deeds = (await deedsSince(deeds0)).filter((d) => d.what === "lift");
  const down = await self(A);
  ok("…and the lift is ridden down again to where the database says its cage stands: both rides written down", (await A.evaluate(`${M}.where().floor`)) === 10 && same([Math.floor(down.x), Math.floor(down.y)], liftAt) && same(deeds.map((d) => [d.by, d.n]), [[a, 0], [a, 10]]), { down, liftAt, rides: deeds.map((d) => d.n) });

  /* ── 5: the day's floors not laid ── */
  console.log("5  the day's floors not laid");
  await alive(B);
  await hold(B, "pick");
  await go(B, "mouth");
  await B.evaluate(`${K}.nudged("cave")`);
  await sleep(1200);
  const asked0 = await B.evaluate(`performance.getEntriesByType("resource").filter((r) => r.name.includes("/api/town/cave")).length`), errors0 = B.errors().length;
  // (a plain rock of the first floor that stands, chosen while the stand-in can still say what each holds)
  const free = (await holds(1, b)).find((r) => r.holds.kind === "stone" && !r.holds.moss && !r.gone && r.rock !== way.rock).rock;
  await unlay();
  await tapHit(B, "mouth", null, 0);
  await until("in the cave", async () => (await B.evaluate(`${M}?.where?.().floor ?? 0`)) === 1, 20000, 200).catch(() => {});
  await sleep(5000);
  const inside = { status: await status(B), floor: await B.evaluate(`${M}?.where?.().floor ?? null`), keeper: await B.evaluate(`${K}.open() === true && ${K}.far() === true`), asked: (await B.evaluate(`performance.getEntriesByType("resource").filter((r) => r.name.includes("/api/town/cave")).length`)) - asked0,
    db: (await rpc(idB, "town_cave", { p_floor: 1 })).body?.why ?? null, said: await textOf(B, "[data-mine-note]"), errors: B.errors().slice(errors0) };
  ok("with today's floors taken out of the stand-in, the page neither crashes nor hangs on the way in: the game and the far side are as they were, and the site's route was asked, once", inside.status === "ready" && inside.keeper === true && inside.asked === 1 && inside.db === "unlaid" && inside.errors.length === 0, inside);
  if (inside.floor === 1 && !inside.said) note("walking in says nothing: the floor is drawn from the page's own layout, and the member stands in a cave the database has not");
  await standBy(B, 1, free);
  await tapHit(B, "caveRock", free);
  const refused = await until("the refusal's words", () => textOf(B, "[data-mine-note]"), 8000, 80).catch(() => null);
  ok("a rock struck there is refused by the database (`unlaid`) in words a member can read, and nothing is taken or written", refused === "ถ้ำของวันนี้ยังไม่พร้อม ลองใหม่อีกสักครู่" && (await B.evaluate(`${M}.swings(1, ${free})`)) === 0 && !(await cameOf(B)) && (await status(B)) === "ready", { said: refused });
  // a page that comes in while the day is not laid has never been told of a cave at all
  await enter(A, "A");
  await until("the far side is open here", () => A.evaluate(`${K}.far()`), 20000).catch(() => {});
  await hold(A, "pick");
  await go(A, "cave1");
  await sleep(4000);
  const never = { status: await status(A), floor: await A.evaluate(`${M}?.where?.().floor ?? null`), told: await A.evaluate(`${K}.cave()`), rocks: (await hits(A, "caveRock")).length };
  if (never.floor === 1 && never.rocks) { await standBy(A, 1, free, 1); await tapHit(A, "caveRock", free); await sleep(1500); }
  never.said = await textOf(A, "[data-mine-note]");
  ok("a page that came in while the day was not laid stands in the cave without a crash, its keeper told of no cave", never.status === "ready" && never.floor === 1 && never.told === null && A.errors().length === 0, never);
  ok("…and says so in words", !!never.said, "it says nothing: with no cave told the mine's panel draws nothing at all, a tap on a rock is a step, and the pick does nothing (the words are only said of a deed refused, which this page cannot begin)");
  const again1 = await layDay();
  did = await strike(B, 1, free);
  came = await until("what the rock left", () => cameOf(B), 8000, 80).catch((e) => e.message);
  ok("laid again, the same rock breaks under the same hand: the page goes on with nothing loaded again", again1.laid === true && typeof came === "object" && came.got.length > 0 && (await B.evaluate(`${M}.told().place`)) === 1, { ...did, came });
  await A.evaluate(`${K}.nudged("cave")`);
  await until("the page that had no cave is told of one", () => A.evaluate(`!!${K}.cave()`), 70000, 500).catch(() => {});
  ok("…and the page that had been told of no cave has one when it next looks (by itself within a minute)", (await A.evaluate(`${K}.cave()?.day ?? null`)) === laid.day);

  /* ── the far side shut again under a member who is there ── */
  console.log("the far side shut again by its knob, under a member in the cave");
  await sql(`update public.town_knobs set value = 0 where key = 'far_open'`);
  await B.evaluate(`${K}.nudged("cave")`);   // (the look the page makes by itself every minute while a member is about)
  await sleep(2500);
  const closed = { open: await B.evaluate(`window.__townKeeper?.open?.() ?? null`), far: await B.evaluate(`window.__townKeeper?.far?.() ?? null`), bag: await B.evaluate(`[...document.querySelectorAll("button")].some((b) => b.title === "กระเป๋า")`), panels: await B.evaluate(`[typeof ${R}, typeof ${M}]`) };
  ok("the next look at the cave is refused, and the page takes it for the far side shut, not the game: the bag stays, the far side's panels go", closed.open === true && closed.far === false && closed.bag === true && same(closed.panels, ["undefined", "undefined"]), closed);
  await sql(`update public.town_knobs set value = 1 where key = 'far_open'`);

  for (const X of [A, B]) {
    const said = X.logs.filter((l) => l.startsWith("console.error"));
    ok(`${X.label}: no page errors`, X.errors().length === 0, X.errors().slice(0, 4));
    if (said.length) note(`${X.label}: ${said.length} line${said.length === 1 ? "" : "s"} on the console's error channel: ${brief(said.slice(0, 3))}`);
  }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.stack ?? e}`);
  await A.shot(`${OUT}/far-db-stopped-A.png`).catch(() => {});
  if (B) await B.shot(`${OUT}/far-db-stopped-B.png`).catch(() => {});
  console.log(`       logs: ${JSON.stringify([...A.logs.slice(-4), ...(B?.logs.slice(-4) ?? [])])}`);
} finally {
  // (left open for whoever comes next to the same stand-in)
  await sql(`update public.town_knobs set value = 1 where key = 'far_open'`).catch(() => {});
  try { await A.close(); } catch { /* gone already */ }
}
console.log(`\n${pass} ok, ${fail} failed`);
process.exit(fail ? 1 : 0);
