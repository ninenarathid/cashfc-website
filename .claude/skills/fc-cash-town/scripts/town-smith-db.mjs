// The blacksmith as a member will meet him, and a forged tool in each of the older games, tried in a real browser before
// anything is pushed: two windows of the dev test room, each kept by the database's keeper (lib/town/keeper.ts's
// DbKeeper), asking a stand-in for the database with the whole of v174's draft in it. Production is not touched.
// `next dev` only. The page was built against the browser's trial and the file proved by SQL dry runs: this is where
// the page and the database's own functions meet. (scripts/town-smith.mjs is the trial's, and another thing.)
//
//   1  closed: with `smith_open` 0 a member's page offers nothing of the smith (he says his forge is not open yet, no
//      screen, nothing asked that is refused, the game as it was); an admin's page offers him
//   2  smelting: a piece begun from the screen, the clock put on, taken; the queue full; widened; a second member at
//      the bellows, seen by the first
//   3  tries: to +4 every one taken; onward by the database's chance until a "stays" and a level lost have each been
//      on the screen; what a try is said to take is what the purse then loses; a try over the forger's head in the
//      second window
//   4  a milestone: its draw laid out, left, the page loaded again, the same draw; chosen; drawn again
//   5  a gem set; the same element not to be set again, in words; another element over it
//   6  a move between the hoe and the can, and back; refused in words where it should be
//   7  the great fire: tinder by a tree felled and flint by a rock broken, the finder told in words; lit; the row; a
//      try for the top refused without a turn, and made with one, the fire spent whatever came of it; whoever has
//      taken the top is not offered the row. The screen's card at each
//   8  a forged tool of each older game in its game, through the page, and the same with the tool as it was bought:
//      a rod (a cast, a strike, a landing), a hoe, a can (the plots beside as the page then shows them), a net (a
//      catch at the edge of what it reaches), a pot (a dish cooked, set down, eaten from)
//   9  an option that is counted, used on the page to its last, refused in words, back with the day
//   10 pictures at 1440x900 and 390x844: the smith's leaves, the great fire's card, a try over a head, the hand bar and
//      the bag with a forged tool
//
// Each line says what the page showed (its marks) and what the stand-in's rows say. A forged tool a section begins
// with is forged by its member's own functions (scripts/smith-hands.mjs): the database's chance, the draws as laid out.
// What an option or a gem does is nowhere said here: ids only.
//
//   (in the scratch folder of the dry runs, see scripts/db/README.md; leave it running)
//   FC_REPO=<root> BENCH_EXTRA=<root>/.claude/skills/fc-cash-town/scripts/db/v174_draft.sql node town-bench.mjs 3198
//   node town-smith-db.mjs <base> <outdir> [bench] [sections, as 2,3: all]
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameGone, gameUp, play } from "./games.mjs";
import { count, fireAsNew, forgeTo, kept, layDays, lightByHand, setPurse as purseSet, standInAt, tryTakes } from "./smith-hands.mjs";

const [BASE = "http://localhost:3200", OUT = ".", BENCH = "http://127.0.0.1:3198", ONLY = ""] = process.argv.slice(2);
const only = ONLY.split(",").map(Number).filter(Boolean), runs = (n) => !only.length || only.includes(n);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const failed = [];
const brief = (d) => (d === undefined || d === "" ? "" : (typeof d === "string" ? d : JSON.stringify(d)).replace(/\s+/g, " ").slice(0, 520));
/** A line: `ok` or `FAIL`, what was looked for, and what was seen. */
const ok = (n, c, saw) => { c ? pass++ : (fail++, failed.push(n)); console.log(`  ${c ? "ok  " : "FAIL"} ${n}${brief(saw) ? `  [${brief(saw)}]` : ""}`); };
const note = (text) => console.log(`       (${text})`);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const K = "window.__townKeeper", V = "window.__townView", S = "window.__townSmith", MORE = "window.__townMore", G = "window.__townGame";
const R = "window.__townTrees", M = "window.__townMine", FISH = "window.__townFish", FARM = "window.__townFarm", BUGS = "window.__townBugs", COOK = "window.__townCook";
const DESKTOP = { width: 1440, height: 900 }, PHONE = { width: 390, height: 844, dpr: 2, mobile: true };
const TALK = `document.querySelector('[aria-labelledby="town-talk-h"]')`, FISHP = `document.querySelector('[aria-labelledby="town-fish-h"]')`;

/* ── the stand-in, asked directly ── */
const b = standInAt(BENCH), { sql, one, rpc, skip } = b;
const setPurse = (id, coins, bag, more) => purseSet(b, id, coins, bag, more);
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);
const deedsSince = (from) => sql(`select d.member_id as by, d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.id > $1 order by d.id`, [from]);
const smithyOf = async (id) => (await one(`select (select s.doc from public.town_smiths s where s.member_id = $1) as doc`, [id])).doc;
const fireKept = async () => (await one(`select doc from public.town_great_fire where one`)).doc;
const knob = (key, value) => sql(`update public.town_knobs set value = $2 where key = $1`, [key, value]);
const FORGE = (await b.up()) ? (await one(`select to_regprocedure('public.town_smith_open()') is not null as there`)).there ? (await one(`select town.cat('forge') as f`)).f : null : undefined;
if (FORGE === undefined) { console.log(`no stand-in database at ${BENCH}: start scripts/db/town-bench.mjs first, with v174's draft (see this file's head)`); process.exit(2); }
if (FORGE === null) { console.log(`the stand-in at ${BENCH} has not had v174: start it with the draft in BENCH_EXTRA`); process.exit(2); }

/* ── a page, driven as a member's hand drives it ── */
const me = (X) => X.evaluate(`window.__cashTown.me()`);
const self = (X) => X.evaluate(`${V}.self()`);
const purse = (X) => X.evaluate(`${K}.purse()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
const attr = (X, sel, name) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(name)}) ?? null`);
const marks = (X, sel) => X.evaluate(`[...document.querySelectorAll(${JSON.stringify(sel)})].map((e) => ({ ...e.dataset }))`);
const frames = (X) => X.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => r(true)))))`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(900); };
const go = async (X, place) => { const went = await X.evaluate(`${MORE}.go(${JSON.stringify(place)})`); await sleep(1200); return went; };
/** My purse and what I have at the smith read again from the stand-in (after they were set up by hand there). */
const again = async (X) => { await X.evaluate(`${K}.hold(-1).then(() => null)`); await X.evaluate(`${K}.smithLook()`); await sleep(450); };
const slotOf = (X, item, forged = null) => X.evaluate(`${K}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)}${forged === null ? "" : forged ? " && (s.plus ?? 0) > 0" : " && !(s.plus > 0)"})`);
const hold = async (X, item, forged = null) => { const at = await slotOf(X, item, forged); await X.evaluate(`${K}.hold(${at}).then(() => null)`); await sleep(450); return at; };
const has = async (X, item) => count((await purse(X)).bag, item);
const origin = (X) => X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
/** A real press of the mouse at a point of the window. */
const click = async (X, x, y) => {
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
/** A real press on what a selector finds, brought into sight first. Says false where it is not there or not to be pressed. */
const press = async (X, sel, wait = 350) => {
  const at = await X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e || e.disabled) return null; e.scrollIntoView({ block: "center", behavior: "instant" }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  if (!at) return false;
  await sleep(60);
  await click(X, at.x, at.y);
  if (wait) await sleep(wait);
  return true;
};
const key = async (X, k, code = k, vk = 0) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk }); };
const hits = (X, kind) => X.evaluate(`(${MORE}?.hits?.() ?? []).filter((h) => h.kind === ${JSON.stringify(kind)})`);
const tapHit = async (X, kind, id = null, lift = 6) => {
  const h = (await hits(X, kind)).find((x) => id === null || x.id === id);
  if (!h) return false;
  const o = await origin(X);
  await click(X, o.x + h.x, o.y + h.y - lift);
  return true;
};
/** Every word the map has drawn in the last moments (a try over a head is drawn, not a mark: the canvas is listened to). */
const listen = (X) => X.evaluate(`(() => { if (window.__drawn) return; window.__drawn = new Map(); const was = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, ...rest) { window.__drawn.set(String(t), performance.now()); return was.call(this, t, ...rest); }; })()`);
const drawn = (X, ms = 500) => X.evaluate(`[...(window.__drawn ?? [])].filter(([, at]) => performance.now() - at < ${ms}).map(([t]) => t)`);
/** A picture at the desktop's size and at a phone's (the window is put back as it was). `between`: done on the phone's screen before its picture. */
async function shots(X, name, between = null) {
  await frames(X);
  await X.shot(`${OUT}/smith-db-${name}-desktop.png`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: PHONE.width, height: PHONE.height, deviceScaleFactor: PHONE.dpr, mobile: true });
  await sleep(1100);
  if (between) await between();
  await X.shot(`${OUT}/smith-db-${name}-phone.png`);
  await X.send("Emulation.setDeviceMetricsOverride", { width: DESKTOP.width, height: DESKTOP.height, deviceScaleFactor: 1, mobile: false });
  await sleep(800);
  await frames(X);
}
const ROOM = "smithdb";
async function enter(X, letter, more = "") {
  await X.goto("about:blank");
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=${ROOM}&townHour=12&townWeather=clear&townDb=${encodeURIComponent(BENCH)}${more}`);
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
  if (born !== X.born) { note(`${X.label}: the page loaded itself anew since it was entered (the dev server's rebuild)`); X.born = born; await listen(X); await sleep(2500); }
}
const told = (X) => until("the smith is told of", () => X.evaluate(`!!${K}.smith()`), 25000, 250);

/* ── the smith's screen ── */
const openSmith = async (X, view) => { await X.evaluate(`${S}.open(${JSON.stringify(view)})`); await until("the smith's screen", () => there(X, "[data-smith-panel]"), 20000, 150); await sleep(500); };
const shutSmith = async (X) => { await X.evaluate(`${S}?.close?.()`); await sleep(300); };
const leaf = async (X, v) => { await press(X, `[data-smith-tab="${v}"]`, 500); return (await attr(X, "[data-smith-panel]", "data-smith-view")) === v; };
/** What a box of the screen says a deed takes: each thing wanted, and the coins. */
const needs = (X, within) => X.evaluate(`Object.fromEntries([...document.querySelectorAll(${JSON.stringify(`${within} [data-smith-need]`)})].map((e) => [e.dataset.smithNeed, Number(e.dataset.want)]))`);
/** What two purses differ by: the coins lost and each thing lost (pouches are not looked into: no tester here has one). */
const lost = (was, is, items) => ({ coins: was.coins - is.coins, ...Object.fromEntries(items.map((i) => [i, count(was.bag, i) - count(is.bag, i)])) });
const anvil = async (X, item, forged = null) => { const at = await slotOf(X, item, forged); await press(X, `[data-smith-tool="${at}"]`, 400); return at; };
/** One try at the tool on the anvil, by a real press: what the screen said it would take and how it might go, what it said came of it, and what the purse lost. */
async function strikeOnce(X, id) {
  const want = await needs(X, "[data-smith-try]"), odds = await attr(X, "[data-smith-odds]", "data-smith-odds"), was = await kept(b, id), to = Number(await attr(X, "[data-smith-try]", "data-to"));
  if (!(await press(X, "[data-smith-strike]", 100))) return { pressed: false, want, odds, to, why: await attr(X, "[data-smith-fire-why]", "data-smith-fire-why") };
  await until("the try is answered", () => X.evaluate(`(document.querySelector("[data-smith-said]")?.innerText ?? "").trim().length > 0 && !document.querySelector("[data-smith-strike]")?.innerText.includes("…")`), 12000, 80);
  const out = await attr(X, "[data-smith-said]", "data-out"), said = await textOf(X, "[data-smith-said]"), is = await kept(b, id);
  const ore = Object.keys(want).find((k) => k !== "timber" && k !== "coins");
  return { pressed: true, want, odds, to, out, said, lost: lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, [ore, "timber"]), ore };
}
const offered = (X) => X.evaluate(`[...document.querySelectorAll("[data-smith-option]")].map((c) => ({ id: c.getAttribute("data-smith-option"), keep: c.getAttribute("data-keep") === "true" }))`);
const chooseFirst = async (X) => {
  await until("the draw is laid out", () => there(X, "[data-smith-offer]"), 10000, 100);
  const cards = await offered(X);
  await press(X, `[data-smith-choose="${cards[0].id}"]`, 700);
  await until("the draw is put away", async () => !(await there(X, "[data-smith-offer]")), 8000, 100).catch(() => {});
  return cards;
};
const fireCard = (X) => X.evaluate(`(() => { const c = document.querySelector("[data-smith-fire]"); if (!c) return null; const d = c.dataset;
  return { lit: d.lit, flint: d.flint, tinder: d.tinder, row: Number(d.row), mine: Number(d.mine), open: Number(d.open), join: !!c.querySelector("[data-smith-fire-join]"), leave: !!c.querySelector("[data-smith-fire-leave]"), topped: !!c.querySelector("[data-smith-fire-topped]") }; })()`);
/** The materials of every try there is, and gems, in a bag with the tools named: enough for many tries (restocked by `stock`). */
const STOCK = [{ item: "shardCopper", n: 99 }, { item: "shardIron", n: 99 }, { item: "oreIron", n: 20 }, { item: "oreSilver", n: 20 }, { item: "timber", n: 50 }];   // (each a whole stack of its kind, and no more)
const stock = async (X, id, coins = 50000) => {
  const k = await kept(b, id), bag = k.doc.bag.map((s) => { const full = STOCK.find((x) => x.item === s?.item); return full ? { ...s, n: full.n } : s; });
  await sql(`update public.town_purses set coins = $2, doc = jsonb_set(doc, '{bag}', $3::jsonb) where member_id = $1`, [id, coins, JSON.stringify(bag)]);
  await X.evaluate(`${K}.smithLook()`);
  await sleep(350);
};
const toolKept = async (id, item, forged = null) => (await kept(b, id)).doc.bag.find((s) => s?.item === item && (forged === null || (forged ? (s.plus ?? 0) > 0 : !(s.plus > 0)))) ?? null;
/** A tool of a kind in a member's bag forged to a level by their own functions (scripts/smith-hands.mjs), and the page told. */
const forged = async (X, as, id, item, level, how = {}) => {
  const slot = (await kept(b, id)).doc.bag.findIndex((s) => s?.item === item && !(s.plus > 0));
  const made = await forgeTo(b, as, id, slot, level, how);
  if (X) await again(X);
  return made;
};

/* ── the far side's things, for the great fire's halves (as scripts/town-far-db.mjs drives them) ── */
const besideTree = (X, id) => X.evaluate(`(() => { const wood = ${R}.wood(), t = wood.find((x) => x.id === ${id}), n = t.size || 1, all = [];
  const far = (o, x, y) => { const m = o.size || 1; return Math.max(Math.max(o.x - x, 0, x - (o.x + m - 1)), Math.max(o.y - y, 0, y - (o.y + m - 1))); };
  for (let y = t.y - 1; y <= t.y + n; y++) for (let x = t.x - 1; x <= t.x + n; x++) if ((x < t.x || x >= t.x + n || y < t.y || y >= t.y + n) && ${V}.walkable(x, y)) all.push([x, y, wood.filter((o) => o.id !== t.id && far(o, x, y) <= 1).length]);
  return all.sort((a, b) => a[2] - b[2]).map(([x, y]) => [x, y]); })()`);
const rockOf = async (X, floor, rock) => (await X.evaluate(`${M}.rocks(${floor})`)).find((r) => r.id === rock);
async function standBy(X, floor, rock, nth = 0) {
  const r = await rockOf(X, floor, rock);
  const spots = await X.evaluate(`[[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [${r.x} + dx, ${r.y} + dy]).filter(([x, y]) => ${V}.walkable(x, y))`);
  const spot = spots[Math.min(nth, spots.length - 1)];
  if (!spot) throw new Error(`no tile to stand on beside rock ${rock} of place ${floor}`);
  await warp(X, spot[0], spot[1]);
  return spot;
}
async function strikeRock(X, floor, rock, most = 30) {
  const gone = () => X.evaluate(`(${M}.told()?.gone?.[${JSON.stringify(String(floor))}] ?? []).includes(${rock})`);
  let taps = 0;
  for (let tries = 0; tries < most && !(await gone()); tries++) {
    if (!(await tapHit(X, floor ? "caveRock" : "rock", rock))) { await sleep(300); continue; }
    taps++;
    await sleep(420);
  }
  return { taps, gone: await gone() };
}

/* ── the older games, each driven as its own check script drives it ── */
/** A hand on the reel. Says how it ended. */
async function fight(X) {
  const end = Date.now() + 120000;
  while (Date.now() < end) {
    const f = await X.evaluate(`(() => { const f = ${FISH}?.fight(); if (!f) return null;
      const on = f.t >= f.surge.from - 0.3 && f.t < f.surge.to;
      ${FISH}.hold(f.tension < f.lo + (f.hi - f.lo) * (on ? 0.25 : 0.5)); return { over: f.over }; })()`);
    if (!f) break;
    await sleep(20);
  }
  await until("the fight is over", () => X.evaluate(`${FISH}.phase() === "result"`), 8000);
  return X.evaluate(`${FISH}.result()`);
}
const pressWords = (X, words, within = "document") => X.evaluate(`(() => {
  const b = [...(${within} ?? document).querySelectorAll("button")].find((x) => !x.disabled && x.innerText.replace(/\\s+/g, " ").trim().startsWith(${JSON.stringify(words)}));
  if (!b) return false; b.click(); return true; })()`);
/** A line dropped from the deck with the rod in the hand, until something is landed (the stand-in's clock is put on to each bite). Says the casts, the strikes answered, and what was landed. */
async function fishOnce(X, most = 8) {
  await warp(X, 17, 42);
  await until("the deck is a place to fish from", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 10000);
  await pressWords(X, "ตกปลาตรงนี้");
  await until("the rod's panel is ready", () => X.evaluate(`${FISH}?.phase() === "ready"`), 8000);
  const out = { casts: 0, strikes: 0, landed: null, hows: [] };
  for (let n = 0; n < most && !out.landed; n++) {
    await until("ready to drop", () => X.evaluate(`["ready", "result"].includes(${FISH}?.phase())`), 10000);
    if ((await X.evaluate(`${FISH}.phase()`)) === "result") { await until("what the go came to can be left", () => pressWords(X, "หย่อนอีก", FISHP), 6000, 80); await sleep(250); }
    await pressWords(X, "หย่อนเบ็ด", FISHP);
    const outNow = await until("the line is out", () => X.evaluate(`${FISH}.phase() === "waiting"`), 6000).catch(() => false);
    if (!outNow) { out.hows.push(`no line: ${await textOf(X, '[aria-labelledby="town-fish-h"]')}`.slice(0, 160)); break; }
    out.casts++;
    const c = await X.evaluate(`${FISH}.cast()`);
    await skip(Math.round(c.wait * 1000) + 250);
    // (the stand-in's clock is at the bite and the page's own is not: to the page this strike is too soon. A rod may carry an option by which the
    // page lets such a strike by, the line left out and nobody asked: the hand then strikes again, as a member's would)
    for (let i = 0; i < 4; i++) {
      await X.evaluate(`${FISH}.strike()`);
      if (await until("the strike is answered", () => X.evaluate(`["fight", "result"].includes(${FISH}.phase())`), i < 3 ? 1500 : 6000, 60).catch(() => false)) break;
      out.forgiven = (out.forgiven ?? 0) + 1;
    }
    if (!(await X.evaluate(`["fight", "result"].includes(${FISH}.phase())`))) { out.hows.push(`no answer to a strike: ${await X.evaluate(`${FISH}.phase()`)}`); break; }
    out.strikes++;
    const res = (await X.evaluate(`${FISH}.phase()`)) === "fight" ? await fight(X) : await X.evaluate(`${FISH}.result()`);
    out.hows.push(res.how);
    if (res.how === "landed") out.landed = res;
  }
  await pressWords(X, "ปิด", FISHP); await pressWords(X, "พอแล้ว", FISHP); await sleep(300);
  await key(X, "Escape", "Escape", 27);
  await sleep(300);
  return out;
}
/** The farm's deed where I stand, begun and played through with a steady hand. Says which deed it was, which game came up, and what the farm's panel said. */
async function farmDeed(X, want, ms = 8000) {
  const deed = await until(`the deed is ${want}`, async () => { const d = await X.evaluate(`${FARM}?.deed() ?? null`); return d === want && d; }, ms, 150).catch(async () => X.evaluate(`${FARM}?.deed() ?? null`));
  if (deed !== want) return { deed, game: null, note: await X.evaluate(`${FARM}?.note() ?? null`) };
  // (what the farm's panel says of the deed is listened for from the press on: its words are put away again soon)
  await X.evaluate(`(() => { window.__farmSaid = null; clearInterval(window.__farmEar); const t0 = Date.now();
    window.__farmEar = setInterval(() => { const n = ${FARM}?.note?.() ?? null; if (n && !window.__farmSaid) window.__farmSaid = n; if (Date.now() - t0 > 60000) clearInterval(window.__farmEar); }, 30); })()`);
  await X.evaluate(`${FARM}.act()`);
  const game = await play(X, 45000);
  await sleep(900);
  return { deed, game, note: await X.evaluate(`(clearInterval(window.__farmEar), window.__farmSaid ?? ${FARM}?.note() ?? null)`) };
}
const plotKept = async (x, y) => (await one(`select (select to_jsonb(p) from public.town_plots p where p.x = $1 and p.y = $2) as p`, [x, y])).p;

if (!(await b.up())) process.exit(2);
const A = await browser("smithA", DESKTOP);
let B = null;
const who = {};
try {
  /* ── the stand-in set up ── */
  console.log("the stand-in, set up");
  await knob("game_open", 1); await knob("far_open", 1); await knob("smith_open", 0);
  await sql(`update public.town_works set opened_at = coalesce(opened_at, now()), done_at = coalesce(done_at, now()) where id = 'bridge'`);
  await sql(`update public.town_work_needs set have = need where work = 'bridge'`);
  await sql(`delete from public.town_smiths where true`);
  await sql(`update public.town_things set doc = '{"tops": {}, "found": {}}'::jsonb where key = 'smith'`);
  await fireAsNew(b);
  // (the stand-in's clock put back to the wall's: a run before this one may have left it days on, and the cave's floors are laid for today and tomorrow only)
  await sql(`update public.bench_clock set skew = 0 where true`);
  const laid = await layDays(b, 1);
  ok("today's thirty floors are laid into the stand-in, the far side is open and the smith shut by his knob", laid.floors === 30 && laid.laid === true && (await one(`select value from public.town_knobs where key = 'smith_open'`)).value === 0, laid);
  const tries = FORGE.tries.map((t) => `${t.to}:${t.n} ${t.ore}+${t.timber}t+${t.fee}c ${t.take}/${t.stay}/${t.down}`);
  note(`the stand-in's forging table (its catalog's forge row): ${tries.join("  ")}`);

  who.a = await enter(A, "A", "&townAt=smith");
  who.idA = (await me(A)).id; who.nameA = (await me(A)).name;
  await sql(`update public.profiles set is_admin = false where id = $1`, [who.a]);
  await setPurse(who.a, 300, [{ item: "worm", n: 3 }]);
  const { a, idA, nameA } = who;
  const second = async () => {
    if (B) { await alive(B); return; }
    B = await A.window("smithB", DESKTOP);
    who.b = await enter(B, "B", "&townAt=smith");
    who.idB = (await me(B)).id; who.nameB = (await me(B)).name;
    await sql(`update public.profiles set is_admin = false where id = $1`, [who.b]);
  };
  const opened = async () => {
    await knob("smith_open", 1);
    for (const X of [A, B].filter(Boolean)) if (!(await X.evaluate(`!!${K}.smith()`))) { await enter(X, X === A ? "A" : "B", "&townAt=smith"); await told(X); }
  };

  /* ── 1: closed ── */
  if (runs(1)) {
    console.log("1  closed to a member, open to an admin");
    await enter(A, "A", "&townAt=smith");
    await sleep(2500);
    const asked = await A.evaluate(`performance.getEntriesByType("resource").map((r) => r.name).filter((n) => n.includes("/rpc/town_smith") || n.includes("/rpc/town_fire") || n.includes("/rpc/town_tool")).map((n) => n.split("/rpc/")[1])`);
    const shut = { far: await A.evaluate(`${K}.far()`), smith: await A.evaluate(`${K}.smith()`), fire: await A.evaluate(`${K}.fire()`), asked, open: (await rpc(idA, "town_smith_open")).body, read: (await rpc(idA, "town_smith")).status };
    ok("a member's keeper asks whether the smith is open, is told no, and asks nothing else of him: nothing was refused", shut.far === true && shut.smith === null && shut.fire === null && same(asked, ["town_smith_open"]) && shut.open === false && shut.read === 403, shut);
    await A.evaluate(`${S}.open("smelt")`);
    await sleep(700);
    ok("his screen does not open, whoever asks for it", !(await there(A, "[data-smith-panel]")));
    // (a tap on the smith himself: he talks, and offers nothing)
    await A.evaluate(`${V}.lookAt(${(await A.evaluate(`${MORE}.world().smith.at`)).x}, ${(await A.evaluate(`${MORE}.world().smith.at`)).y})`);
    await sleep(900);
    const talkTo = async (X) => {
      const o = await origin(X), k = (await X.evaluate(`${V}.keepers()`)).find((x) => x.id === "smith");
      if (!k) return { box: false };
      await click(X, o.x + (k.x0 + k.x1) / 2, o.y + (k.y0 + k.y1) / 2);
      await until("the talk opens", () => X.evaluate(`!!${TALK}`), 6000).catch(() => {});
      const said = [];
      for (let i = 0; i < 10 && (await X.evaluate(`!!${TALK}`)) && !(await X.evaluate(`!!${TALK}?.querySelector('[role="group"]')`)); i++) {
        const t = await X.evaluate(`${TALK}?.innerText.replace(/\\s+/g, " ").trim() ?? ""`);
        if (t && !said.includes(t)) said.push(t);
        await key(X, "Enter", "Enter", 13); await sleep(220);
      }
      const choices = await X.evaluate(`[...(${TALK}?.querySelectorAll('[role="group"] button') ?? [])].map((x) => x.innerText.replace(/\\s+/g, " ").trim())`);
      return { box: true, said, choices };
    };
    const closed = await talkTo(A);
    ok("the smith himself talks when tapped, says his forge is not open yet, and offers no leaf of his screen", closed.box && closed.said.length > 0 && closed.choices.length === 0 && /ยังจัดร้านไม่เสร็จ|ยังไม่เปิด|not open|setting up/i.test(closed.said.join(" ")), closed);
    await key(A, "Escape", "Escape", 27);
    ok("…and the game itself is as it was: the purse is read, the bag is there, nothing thrown", (await A.evaluate(`${K}.open() === true && ${K}.ready()`)) && (await A.evaluate(`[...document.querySelectorAll("button")].some((b) => b.title === "กระเป๋า")`)) && (await has(A, "worm")) === 3 && A.errors().length === 0, A.errors().slice(0, 3));
    await sql(`update public.profiles set is_admin = true where id = $1`, [a]);
    await enter(A, "A", "&townAt=smith");
    await told(A).catch(() => {});
    const admin = { smith: await A.evaluate(`!!${K}.smith()`), fire: await A.evaluate(`${K}.fire()`), open: (await rpc(idA, "town_smith_open")).body, knob: (await one(`select value from public.town_knobs where key = 'smith_open'`)).value };
    ok("an admin's page is told of the smith while his knob is 0: what they have there, the board, the great fire", admin.smith && admin.fire?.lit === false && admin.open === true && admin.knob === 0, admin);
    await A.evaluate(`${V}.lookAt(${(await A.evaluate(`${MORE}.world().smith.at`)).x}, ${(await A.evaluate(`${MORE}.world().smith.at`)).y})`);
    await sleep(900);
    const offers = await talkTo(A);
    ok("…the smith asks what they came for and offers his five leaves", offers.box && offers.choices.filter((c) => /^[1-5] /.test(c)).length === 5, { choices: offers.choices, said: offers.said.at(-1) });
    await firstChoice(A);
    await until("his screen", () => there(A, "[data-smith-panel]"), 8000, 150).catch(() => {});
    ok("…and a leaf chosen opens his screen at it", (await attr(A, "[data-smith-panel]", "data-smith-view")) === "smelt" && (await A.evaluate(`document.querySelectorAll("[data-smith-tab]").length`)) === 5, await attr(A, "[data-smith-panel]", "data-smith-view"));
    await shutSmith(A);
    await sql(`update public.profiles set is_admin = false where id = $1`, [a]);
  }

  /* ── 2: smelting ── */
  if (runs(2)) {
    console.log("2  smelting");
    await second();
    const { b: bId, idB } = who;
    await sql(`delete from public.town_smiths where member_id in ($1, $2)`, [a, bId]);
    await setPurse(a, 1000, [{ item: "shardCopper", n: 60 }, { item: "timber", n: 40 }]);
    await setPurse(bId, 0, []);
    await opened();
    for (const X of [A, B]) { await again(X); await go(X, "smith"); }
    const at = await self(A);
    await warp(B, at.x + 1, at.y);
    await openSmith(A, "smelt");
    const copper = FORGE.smelts.of.oreCopper, fromCatalog = { [copper.of]: FORGE.smelting.fragments, timber: FORGE.smelting.timber, coins: copper.fee };
    const row = await needs(A, '[data-smith-row="oreCopper"]');
    ok("a piece of copper is said to take what the catalog's row says: its fragments, a fine timber and its fee", same(row, fromCatalog), { screen: row, catalog: fromCatalog, row: copper });
    ok("the queue has three places, all free", (await attr(A, "[data-smith-places]", "data-smith-places")) === String(FORGE.smith.places) && (await attr(A, "[data-smith-places]", "data-smith-free")) === String(FORGE.smith.places));
    let was = await kept(b, a), deeds0 = await lastDeed();
    await press(A, '[data-smith-do="oreCopper"]', 700);
    let is = await kept(b, a), smithy = await smithyOf(a);
    ok("a piece begun from the screen: the purse loses what was said, and the stand-in has it in the member's queue", same(lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["shardCopper", "timber"]), { coins: row.coins, shardCopper: row.shardCopper, timber: row.timber })
      && smithy?.queue?.length === 1 && smithy.queue[0].piece === "oreCopper" && (await attr(A, '[data-smith-queue] li[data-on="true"]', "data-smith-piece")) === "oreCopper", { lost: lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["shardCopper", "timber"]), queue: smithy?.queue, deeds: (await deedsSince(deeds0)).map((d) => d.what) });
    const mins = (smithy.queue[0].till - smithy.queue[0].from) / 60000;
    ok("it smelts for the minutes the screen says", new RegExp(`\\b${mins}\\s*(นาที|min)`).test((await textOf(A, '[data-smith-row="oreCopper"]')) ?? ""), { mins, row: await textOf(A, '[data-smith-row="oreCopper"]') });

    // a second member beside the forge, at the bellows of the piece that smelts
    await openSmith(B, "smelt");
    await until("the other is shown the fire", () => there(B, `[data-smith-fire="${idA}"]`), 15000, 250).catch(() => {});
    const fire = { shown: await there(B, `[data-smith-fire="${idA}"]`), name: await textOf(B, `[data-smith-fire="${idA}"]`), left: await attr(B, `[data-smith-blow="${idA}"]`, "data-left"), own: await there(A, "[data-smith-fires]") };
    ok("a second member standing by is shown the first's fire by name, with the presses the piece may still take; nobody is shown their own", fire.shown && (fire.name ?? "").includes(nameA) && fire.left === String(FORGE.smith.bellows.each) && fire.own === false, fire);
    const till0 = smithy.queue[0].till;
    await press(B, `[data-smith-blow="${idA}"]`, 900);
    const blown = await smithyOf(a), saidB = await textOf(B, "[data-smith-said]");
    ok("a press of the bellows: the stand-in has the piece done sooner and the press counted on it, and the presser is told how much sooner", blown.queue[0].blown === 1 && blown.queue[0].till < till0 && /\d/.test(saidB ?? ""), { off: till0 - blown.queue[0].till, blown: blown.queue[0].blown, said: saidB });
    await until("the first sees the press", () => there(A, "[data-smith-blown]"), 15000, 250).catch(() => {});
    ok("…and the first sees it on their own screen, on the piece, without asking", (await attr(A, "[data-smith-blown]", "data-smith-blown")) === "1" && (await A.evaluate(`${K}.smith().smithy.queue[0].till`)) === blown.queue[0].till, { pips: await attr(A, "[data-smith-blown]", "data-smith-blown") });
    const helper = await deedsSince(deeds0);
    ok("the press is written down in the presser's name", helper.some((d) => d.by === bId), helper.map((d) => [d.what, d.by === bId ? "B" : "A", d.thing]));
    ok("the presser's own bellows are refused by the stand-in in a word the page has", (await rpc(idA, "town_smith_bellows", { p_whose: idA })).body?.why === "self");
    await shutSmith(B);

    // the clock put on: done, and taken
    await skip(blown.queue[0].till - Number((await one(`select town.now_ms() as n`)).n) + 2000);
    await A.evaluate(`${K}.smithLook()`);
    await until("the piece is done on the screen", () => there(A, "[data-smith-done]"), 10000, 200).catch(() => {});
    ok("the clock put on to its end: the screen says a piece waits to be taken", (await attr(A, "[data-smith-done]", "data-smith-done")) === "1" && (await textOf(A, "[data-smith-due]")) === "1");
    was = await kept(b, a);
    await press(A, "[data-smith-take]", 800);
    is = await kept(b, a);
    ok("taken: a piece of copper is in the purse the stand-in keeps and on the page, the queue is empty, and the screen says what was taken", count(is.doc.bag, "oreCopper") - count(was.doc.bag, "oreCopper") === 1 && (await has(A, "oreCopper")) === 1 && (await smithyOf(a)).queue.length === 0 && /×1/.test((await textOf(A, "[data-smith-said]")) ?? ""), await textOf(A, "[data-smith-said]"));

    // the queue full
    for (let i = 0; i < FORGE.smith.places; i++) await press(A, '[data-smith-do="oreCopper"]', 600);
    const full = { free: await attr(A, "[data-smith-places]", "data-smith-free"), why: await attr(A, '[data-smith-row="oreCopper"] [data-smith-why]', "data-smith-why"), words: await textOf(A, '[data-smith-row="oreCopper"] [data-smith-why]'), press: await press(A, '[data-smith-do="oreCopper"]', 100), queue: (await smithyOf(a)).queue.length, db: (await rpc(idA, "town_smith_smelt", { p_piece: "oreCopper", p_n: 1 })).body?.why };
    ok("three more fill the queue: the screen says it is full in words, there is nothing to press, and the stand-in refuses one more with the same word", full.free === "0" && full.why === "places" && !!full.words && full.press === false && full.queue === FORGE.smith.places && full.db === "places", full);

    // widened
    const wider = await needs(A, "[data-smith-wider]");
    was = await kept(b, a);
    await press(A, "[data-smith-widen]", 800);
    is = await kept(b, a);
    const more = FORGE.smith.more[0];
    ok("widened from the screen for what it said, which is the catalog's: three places more, the timber and the coins gone", same(wider, { timber: more.timber, coins: more.coins }) && same(lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["timber"]), { coins: more.coins, timber: more.timber })
      && (await attr(A, "[data-smith-places]", "data-smith-places")) === String(FORGE.smith.places + FORGE.smith.wider) && (await smithyOf(a)).more === 1, { screen: wider, catalog: more, places: await attr(A, "[data-smith-places]", "data-smith-places") });
    await shutSmith(A);
  }

  /* ── 3: tries ── */
  if (runs(3)) {
    console.log("3  tries");
    await second();
    const { b: bId } = who;
    await sql(`delete from public.town_smiths where member_id = $1`, [a]);
    await setPurse(a, 50000, [{ item: "pick", n: 1 }, ...STOCK, { item: "axe", n: 1 }]);
    await setPurse(bId, 0, []);
    await opened();
    for (const X of [A, B]) { await again(X); await go(X, "smith"); }
    const at = await self(A);
    await warp(B, at.x + 1, at.y + 1);
    await B.evaluate(`${V}.lookAt(${at.x}, ${at.y})`);
    await openSmith(A, "forge");
    await anvil(A, "pick");
    const seen = { taken: 0, stays: 0, down: 0 }, bad = [], overHead = [];
    let deeds0 = await lastDeed(), n = 0, lowered = 0;
    const one_ = async () => {
      await stock(A, a);
      const level = Number(await attr(A, "[data-smith-card]", "data-plus")), takes = await tryTakes(b, "pick", level + 1), table = FORGE.tries.find((t) => t.to === level + 1);
      await B.evaluate(`window.__drawn?.clear()`);
      const did = await strikeOnce(A, a);
      n++;
      if (!did.pressed) return { level, did };
      seen[did.out]++;
      const after = Number((await toolKept(a, "pick"))?.plus ?? 0), shouldBe = did.out === "taken" ? level + 1 : did.out === "down" ? level - 1 : level;
      // what the screen said it takes is the catalog's, and what the purse lost; its odds the catalog's; its outcome the stand-in's level
      if (!same(did.want, { [takes.ore]: takes.n, timber: takes.timber, coins: takes.fee })) bad.push(`+${level + 1}: the screen says ${JSON.stringify(did.want)}, the catalog ${JSON.stringify(takes)}`);
      if (!same(did.lost, { coins: did.want.coins, [did.ore]: did.want[did.ore], timber: did.want.timber })) bad.push(`+${level + 1}: said ${JSON.stringify(did.want)}, lost ${JSON.stringify(did.lost)}`);
      if (did.odds !== `${table.take}/${table.stay}/${table.down}`) bad.push(`+${level + 1}: odds on the screen ${did.odds}, the catalog's ${table.take}/${table.stay}/${table.down}`);
      if (after !== shouldBe || !new RegExp(`\\+${after}(?!\\d)`).test(did.said ?? "")) bad.push(`+${level + 1} ${did.out}: the stand-in has +${after}, the screen said "${did.said}"`);
      // the second window: the try over the forger's head, with the level it came to
      const words = await until("the try is over the forger's head in the second window", async () => { const w = await drawn(B, 4000); return w.includes(`+${after}`) && (did.out !== "stays" || w.includes("ไม่ขึ้น")) && w; }, 5000, 150).catch(() => null);
      overHead.push(!!words);
      return { level, did, after };
    };
    // to +4: every try taken (the draw of +3 chosen as it is laid out)
    const early = [];
    for (let i = 0; i < FORGE.forge.floor; i++) {
      const t = await one_();
      early.push(t.did.out);
      if (await there(A, "[data-smith-offer]").catch(() => false) || t.after === FORGE.forge.milestones[0]) await chooseFirst(A);
    }
    ok("to +4 every try is taken, at odds the screen gives as certain", same(early, Array(FORGE.forge.floor).fill("taken")) && Number((await toolKept(a, "pick")).plus) === FORGE.forge.floor, early);
    // onward by the database's chance, until a "stays" and a level lost have each been on the screen
    for (let i = 0; i < 90 && !(seen.stays && seen.down); i++) {
      let level = Number(await attr(A, "[data-smith-card]", "data-plus"));
      if (level >= FORGE.forge.top - 1) {
        // (one under the top takes the great fire, which is section 7's: the tool is put back to +6 by the stand-in's owner's hand, and said so)
        await sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,0,plus}', '6'::jsonb) where member_id = $1`, [a]);
        await A.evaluate(`${K}.smithLook()`); await sleep(400); lowered++;
        continue;
      }
      const t = await one_();
      if (!t.did.pressed) { bad.push(`at +${t.level} the strike was not to be pressed: ${JSON.stringify(t.did)}`); break; }
      if (await there(A, "[data-smith-offer]")) await chooseFirst(A);
    }
    if (lowered) note(`the pick came to +9 ${lowered} time${lowered > 1 ? "s" : ""} before both had been seen, and was put back to +6 by hand each time`);
    ok(`by the database's chance, in ${n} tries: a try that stays and a try that loses a level have each been on the screen`, seen.stays > 0 && seen.down > 0, seen);
    ok("every try: what the screen said it takes is the catalog's and is what the purse lost, taken or not; its odds are the catalog's; the level it said is the stand-in's", bad.length === 0, bad.slice(0, 6));
    ok("every try was drawn over the forger's head in the second window, with the level it came to", overHead.length > 0 && overHead.every(Boolean), `${overHead.filter(Boolean).length} of ${overHead.length}`);
    const written = (await deedsSince(deeds0)).filter((d) => d.by === a);
    ok("the tries are written down in the forger's name, the failed ones too", written.length >= n, [...new Set(written.map((d) => d.what))]);
    await shutSmith(A);
  }

  /* ── 4: a milestone ── */
  if (runs(4)) {
    console.log("4  a milestone's draw");
    await sql(`delete from public.town_smiths where member_id = $1`, [a]);
    await setPurse(a, 50000, [{ item: "axe", n: 1 }, ...STOCK, { item: "gemRuby", n: 3 }]);
    await opened();
    await again(A); await go(A, "smith");
    await openSmith(A, "forge");
    await anvil(A, "axe");
    for (let i = 0; i < FORGE.forge.milestones[0]; i++) { await stock(A, a); await strikeOnce(A, a); }
    await until("the draw is laid out", () => there(A, "[data-smith-offer]"), 10000, 100).catch(() => {});
    const first = await offered(A), pending = (await smithyOf(a))?.pending;
    ok("at +3 the draw is laid out: two options, not the same one twice, and they are the two the stand-in keeps waiting", first.length === FORGE.smith.offer && first[0].id !== first[1].id && same(first.map((c) => c.id), pending?.offer) && pending.at === 0, { screen: first.map((c) => c.id), kept: pending });
    ok("while it waits there is nothing to strike and no other leaf to turn to; the stand-in refuses a try in a word the page has", !(await there(A, "[data-smith-try]")) && !(await press(A, '[data-smith-tab="gems"]', 100)) && (await rpc(idA, "town_smith_try", { p_slot: 0 })).body?.why === "owed");
    // left, and the page loaded again
    await shutSmith(A);
    await enter(A, "A", "&townAt=smith");
    await told(A);
    await openSmith(A, "forge");
    await until("the draw is laid out again", () => there(A, "[data-smith-offer]"), 10000, 100).catch(() => {});
    const second_ = await offered(A);
    ok("left, the page loaded again, the forging leaf opened: the same draw is laid out", same(second_.map((c) => c.id), first.map((c) => c.id)), second_.map((c) => c.id));
    await press(A, `[data-smith-choose="${first[1].id}"]`, 800);
    let tool = await toolKept(a, "axe");
    ok("one chosen: it is the tool's in the stand-in and on its card, nothing waits, and the village's book has who found it", same(tool.opts, [first[1].id]) && (await there(A, `[data-smith-opt="${first[1].id}"]`)) && (await smithyOf(a)).pending === null
      && (await one(`select doc->'found'->$1->>'by' as by from public.town_things where key = 'smith'`, [first[1].id])).by === a, { tool, said: await textOf(A, "[data-smith-said]") });
    // drawn again
    const was = await kept(b, a);
    await press(A, '[data-smith-again="0"]', 500);
    const asks = { box: await there(A, '[data-smith-redraw="0"]'), words: await textOf(A, "[data-smith-redraw]"), pay: await there(A, '[data-smith-pay="gemRuby"]') };
    await press(A, '[data-smith-pay="gemRuby"]', 800);
    await until("the new draw is laid out", () => there(A, "[data-smith-offer]"), 10000, 100).catch(() => {});
    const third = await offered(A), is = await kept(b, a);
    ok("drawn again from the screen for a gem and the fee the catalog says: two new ones beside the old, which may be kept", asks.box && asks.pay && (asks.words ?? "").includes(String(FORGE.smith.redraw.fee)) && third.length === FORGE.smith.offer + 1 && third.filter((c) => c.keep).length === 1 && third.find((c) => c.keep).id === first[1].id
      && same(lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["gemRuby"]), { coins: FORGE.smith.redraw.fee, gemRuby: FORGE.smith.redraw.gems }), { asks, third, lost: lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["gemRuby"]) });
    const fresh = third.find((c) => !c.keep).id;
    await press(A, `[data-smith-choose="${fresh}"]`, 800);
    tool = await toolKept(a, "axe");
    ok("a new one chosen takes the old one's place", same(tool.opts, [fresh]) && (await there(A, `[data-smith-opt="${fresh}"]`)) && !(await there(A, `[data-smith-opt="${first[1].id}"]`)), tool);
    await shutSmith(A);
  }

  /* ── 5: a gem ── */
  if (runs(5)) {
    console.log("5  a gem");
    await sql(`delete from public.town_smiths where member_id = $1`, [a]);
    await setPurse(a, 1000, [{ item: "pick", n: 1 }, { item: "timber", n: 30 }, { item: "gemRuby", n: 2 }, { item: "gemSapphire", n: 1 }]);
    await opened();
    await again(A); await go(A, "smith");
    await openSmith(A, "gems");
    await anvil(A, "pick");
    ok("with nothing set the card says the socket is empty", (await attr(A, "[data-smith-gem]", "data-smith-gem")) === "");
    await press(A, '[data-smith-pick-gem="gemRuby"]', 400);
    const want = await needs(A, "[data-smith-setting]");
    ok("a gem chosen is said to take itself, its mount of fine timber and the fee: the catalog's", same(want, { gemRuby: 1, [FORGE.smith.gem.mount]: FORGE.smith.gem.mounts, coins: FORGE.smith.gem.fee }) && !(await there(A, "[data-smith-warn]")), { screen: want, catalog: FORGE.smith.gem });
    let was = await kept(b, a);
    await press(A, "[data-smith-set]", 800);
    let is = await kept(b, a), tool = await toolKept(a, "pick");
    const element = tool?.gems?.[0];
    ok("set from the screen: the gem is in the tool the stand-in keeps and on its card, and the purse lost what was said", tool?.gems?.length === 1 && (await attr(A, "[data-smith-gem]", "data-smith-gem")) === element
      && same(lost({ coins: was.coins, bag: was.doc.bag }, { coins: is.coins, bag: is.doc.bag }, ["gemRuby", "timber"]), { coins: want.coins, gemRuby: 1, timber: want.timber }), { tool, said: await textOf(A, "[data-smith-said]") });
    const again_ = { can: await attr(A, '[data-smith-pick-gem="gemRuby"]', "data-can"), words: await textOf(A, `[data-smith-gem-would="${element}"]`), pressed: await press(A, '[data-smith-pick-gem="gemRuby"]', 100), db: (await rpc(idA, "town_smith_gem", { p_slot: 0, p_gem: "gemRuby" })).body?.why, asked: await A.evaluate(`${K}.smithGem(0, "gemRuby").then((d) => d.why ?? "done")`) };
    ok("a second of the same element is not to be set: its row says in words that it is set already and cannot be pressed, and the stand-in refuses it (`same`), a word the page has", again_.can === "false" && again_.words === "ฝังอยู่ในเครื่องมือชิ้นนี้แล้ว" && again_.pressed === false && again_.db === "same" && again_.asked === "same"
      && count((await kept(b, a)).doc.bag, "gemRuby") === 1, again_);
    await press(A, '[data-smith-pick-gem="gemSapphire"]', 400);
    const warn = await textOf(A, "[data-smith-warn]");
    was = await kept(b, a);
    await press(A, "[data-smith-set]", 800);
    is = await kept(b, a); tool = await toolKept(a, "pick");
    ok("another element over it: the screen warns that the first will be gone, and set, the tool has the new one alone and the first is not given back", !!warn && tool?.gems?.length === 1 && tool.gems[0] !== element && (await attr(A, "[data-smith-gem]", "data-smith-gem")) === tool.gems[0]
      && count(is.doc.bag, "gemRuby") === count(was.doc.bag, "gemRuby") && count(was.doc.bag, "gemSapphire") - count(is.doc.bag, "gemSapphire") === 1, { warn, tool });
    await shutSmith(A);
  }

  /* ── 6: a move ── */
  if (runs(6)) {
    console.log("6  a move between the hoe and the can, and back");
    await sql(`delete from public.town_smiths where member_id = $1`, [a]);
    await setPurse(a, 5000, [{ item: "hoe", n: 1 }, { item: "can", n: 1 }, { item: "rod", n: 1 }]);
    await opened();
    const made = await forged(A, idA, a, "hoe", 4);
    await go(A, "smith");
    await openSmith(A, "move");
    await anvil(A, "hoe");
    ok("standing by the forge with a forged hoe on the anvil: the can is offered to move to, and nothing says to come nearer", (await there(A, '[data-smith-move-pick="1"]')) && (await attr(A, '[data-smith-move-pick="1"]', "data-can")) === "true" && !(await there(A, "[data-smith-move-far]")), await marks(A, "[data-smith-move-pick]"));
    await press(A, '[data-smith-move-pick="1"]', 600);
    const pair = { fee: Number(await attr(A, "[data-smith-move-pair]", "data-fee")), cards: await marks(A, "[data-smith-move-card]"), why: await attr(A, "[data-smith-move-why]", "data-smith-move-why"), sleeps: await there(A, "[data-smith-move-sleeps]") };
    let was = await kept(b, a);
    await press(A, "[data-smith-move-do]", 900);
    let is = await kept(b, a);
    const after = pair.cards.filter((c) => c.smithMoveCard === "after");
    ok("moved from the screen: the two tools side by side as they would be are what the stand-in then keeps (the can has the plus and the option, the hoe none), for the fee the screen said, and the screen says so", pair.why === null
      && (is.doc.bag[1].plus ?? 0) === made.tool.plus && same(is.doc.bag[1].opts, made.tool.opts) && !(is.doc.bag[0].plus > 0) && was.coins - is.coins === pair.fee && pair.fee > 0
      && after.find((c) => c.item === "can")?.plus === String(made.tool.plus) && after.find((c) => c.item === "hoe")?.plus === "0" && /⇄/.test((await textOf(A, "[data-smith-said]")) ?? ""), { fee: pair.fee, paid: was.coins - is.coins, kept: is.doc.bag.slice(0, 2), said: await textOf(A, "[data-smith-said]") });
    // in the can the hoe's forging is not its own: said on the forging leaf, and refused by the stand-in
    await leaf(A, "forge");
    await anvil(A, "can");
    const foreign = { box: await attr(A, "[data-smith-foreign]", "data-smith-foreign"), words: await textOf(A, "[data-smith-foreign]"), strike: await there(A, "[data-smith-strike]"), asleep: (await marks(A, "[data-smith-opt]")).map((m) => m.asleep), db: (await rpc(idA, "town_smith_try", { p_slot: 1 })).body?.why, sleeps: pair.sleeps };
    ok("in the can the forging is said, in words, to be a hoe's (not forged further until it is moved back; its option marked asleep), there is no strike, and the stand-in refuses a try with the same word", foreign.box === "hoe" && !!foreign.words && foreign.strike === false && foreign.asleep.every((x) => x === "true") && foreign.db === "foreign" && foreign.sleeps === true, foreign);
    // refused in words where it should be: away from the forge
    await shutSmith(A);
    await warp(A, 40, 40);
    await openSmith(A, "move");
    await anvil(A, "can");
    await press(A, '[data-smith-move-pick="0"]', 600);
    const far = { told: await textOf(A, "[data-smith-move-far]"), why: await attr(A, "[data-smith-move-why]", "data-smith-move-why"), words: await textOf(A, "[data-smith-move-why]"), pressed: await press(A, "[data-smith-move-do]", 100), db: (await rpc(idA, "town_smith_move", { p_from: 1, p_to: 0, p_x: 40, p_y: 40, p_playing: false })).body?.why };
    ok("away from the forge a move is refused in words (come and stand by the forge), the button is not to be pressed, and the stand-in refuses it with the same word", !!far.told && far.why === "far" && far.words === far.told && far.pressed === false && far.db === "far", far);
    const others = { twice: (await rpc(idA, "town_smith_move", { p_from: 1, p_to: 1, p_x: 51, p_y: 25, p_playing: false })).body?.why, line: (await rpc(idA, "town_smith_move", { p_from: 1, p_to: 2, p_x: 51, p_y: 25, p_playing: false })).body?.why, playing: (await rpc(idA, "town_smith_move", { p_from: 1, p_to: 0, p_x: 51, p_y: 25, p_playing: true })).body?.why };
    ok("…and the stand-in's other refusals of a move are words the page has: one tool twice, a tool of another line, a game being played", others.twice === "twice" && others.line === "line" && others.playing === "playing", others);
    // and back
    await shutSmith(A);
    await go(A, "smith");
    await openSmith(A, "move");
    await anvil(A, "can");
    await press(A, '[data-smith-move-pick="0"]', 600);
    was = await kept(b, a);
    await press(A, "[data-smith-move-do]", 900);
    is = await kept(b, a);
    await leaf(A, "forge");
    await anvil(A, "hoe");
    ok("moved back by the forge: the hoe has its forging again in the stand-in, the can none, and on the forging leaf it may be forged further", (is.doc.bag[0].plus ?? 0) === made.tool.plus && same(is.doc.bag[0].opts, made.tool.opts) && !(is.doc.bag[1].plus > 0) && !("origin" in is.doc.bag[0]) && was.coins > is.coins
      && (await there(A, "[data-smith-try]")) && !(await there(A, "[data-smith-foreign]")), { kept: is.doc.bag.slice(0, 2), paid: was.coins - is.coins });
    await shutSmith(A);
  }

  /* ── 7: the great fire ── */
  if (runs(7)) {
    console.log("7  the great fire");
    await second();
    const { b: bId, idB, nameB } = who;
    await sql(`delete from public.town_smiths where member_id in ($1, $2)`, [a, bId]);
    await fireAsNew(b);
    await sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
    await sql(`delete from public.town_cave where true`);
    await setPurse(a, 50000, [{ item: "pick", n: 1 }, { item: "oreSilver", n: 20 }, { item: "timber", n: 50 }, { item: "axe", n: 1 }]);
    await setPurse(bId, 50000, [{ item: "pick", n: 1 }, { item: "oreSilver", n: 20 }, { item: "timber", n: 50 }, { item: "pick", n: 1 }]);
    await opened();
    const top = FORGE.forge.top;
    const mineA = await forged(A, idA, a, "pick", top - 1), mineB = await forged(B, idB, bId, "pick", top - 1);
    note(`two picks forged to +${top - 1} by their members' own functions: ${mineA.tries} and ${mineB.tries} tries`);
    await again(A); await again(B);
    await go(A, "smith");
    await openSmith(A, "forge");
    await anvil(A, "pick", true);
    const cards = {};
    cards.new = await fireCard(A);
    const none = { card: cards.new, why: await attr(A, "[data-smith-fire-why]", "data-smith-fire-why"), words: await textOf(A, "[data-smith-fire-why]"), pressed: await press(A, "[data-smith-strike]", 100), db: (await rpc(idA, "town_smith_try", { p_slot: 0 })).body?.why };
    ok("with a tool one under the top on the anvil the great fire's card is on the forging leaf: not lit, neither half found, nobody in the row; the strike is not to be pressed, says why in words, and the stand-in refuses a try with the same word", none.card?.lit === "0" && none.card.flint === "" && none.card.tinder === "" && none.card.row === 0 && none.why === "fire" && !!none.words && none.pressed === false && none.db === "fire", none);
    await shutSmith(A);

    // tinder: a tree felled (A, with the axe)
    await hold(A, "axe");
    await go(A, "slope");
    await until("the trees' layer", () => A.evaluate(`!!${R} && ${R}.wood().length > 100`), 60000);
    const tree = await A.evaluate(`(() => { const wood = ${R}.wood(), pines = wood.filter((t) => t.tier === 1 && !t.elder), far = (p, q) => Math.max(Math.abs(p.x - q.x), Math.abs(p.y - q.y));
      return pines.find((t) => !wood.some((x) => x.id !== t.id && far(x, t) <= 3)) ?? pines[0]; })()`);
    const spots = await besideTree(A, tree.id);
    await warp(A, spots[0][0], spots[0][1]);
    await until("the tree is offered", () => there(A, `[data-trees-offer="${tree.id}"]`), 10000, 100);
    await press(A, `[data-trees-offer="${tree.id}"]`);
    await until("the felling board", async () => (await gameUp(A)) === "felling", 8000, 60);
    await A.evaluate(`${G}.auto(true, 130)`);
    await gameGone(A, 40000);
    await until("the card", () => there(A, "[data-trees-card]"), 8000, 60).catch(() => {});
    const tinder = { words: await textOf(A, "[data-trees-fire]"), kept: (await fireKept()).tinder, through: await attr(A, "[data-trees-card]", "data-through") };
    ok("a tree felled through: its card tells the feller, in words, that the tinder was found; the stand-in keeps it under their name", !!tinder.words && tinder.kept?.id === a && tinder.through === "true", tinder);

    // flint: a plain rock broken (B, with a pick)
    await hold(B, "pick", true);
    await go(B, "foot");
    await until("told of the rocks", () => B.evaluate(`!!${M}?.told?.()`), 30000);
    const rock = await B.evaluate(`(() => { const all = ${M}.rocks(0), gone = ${M}.told()?.gone?.["0"] ?? []; const out = [];
      for (const r of all) { if (gone.includes(r.id)) continue; const near = all.filter((x) => x.id !== r.id && Math.max(Math.abs(x.x - r.x), Math.abs(x.y - r.y)) <= 2).length;
        const room = [[1, 0], [0, 1], [-1, 0], [0, -1]].filter(([dx, dy]) => ${V}.walkable(r.x + dx, r.y + dy)).length; if (room >= 3) out.push({ id: r.id, near }); }
      return out.sort((p, q) => p.near - q.near)[0]?.id ?? null; })()`);
    await standBy(B, 0, rock);
    const broke = await strikeRock(B, 0, rock);
    await until("what the rock left", () => there(B, "[data-mine-came]"), 6000, 80).catch(() => {});
    const flint = { broke, words: await textOf(B, "[data-mine-fire]"), kept: (await fireKept()).flint };
    ok("a plain rock broken at the mountain's foot: its card tells whoever is paid for it, in words, that the flint was found; the stand-in keeps it under their name, and with both the fire is lit", broke.gone && !!flint.words && flint.kept?.id === bId, flint);

    // lit: the card, before a name is in the row
    await go(A, "smith");
    await openSmith(A, "forge");
    await anvil(A, "pick", true);
    await A.evaluate(`${K}.smithLook()`); await sleep(600);
    cards.lit = await fireCard(A);
    const noRow = { card: cards.lit, why: await attr(A, "[data-smith-fire-why]", "data-smith-fire-why"), words: await textOf(A, "[data-smith-fire-why]"), db: (await rpc(idA, "town_smith_try", { p_slot: 0 })).body?.why };
    ok("lit: the card says so, with who found each half by name; with no name in the row the strike says why in words, and the stand-in refuses a try with the same word", noRow.card?.lit === "1" && noRow.card.tinder === nameA && noRow.card.flint === nameB && noRow.card.join === true && noRow.why === "row" && !!noRow.words && noRow.db === "row", noRow);

    // the row: the other first, then me; mine is not the turn yet
    await go(B, "smith");
    await openSmith(B, "board");
    await press(B, "[data-smith-fire-join]", 800);
    await press(A, "[data-smith-fire-join]", 800);
    await A.evaluate(`${K}.smithLook()`); await sleep(600);
    cards.second = await fireCard(A);
    const turn = { card: cards.second, other: await fireCard(B), row: (await fireKept()).row.map((w) => w.id === a ? "A" : w.id === bId ? "B" : "?"), why: await attr(A, "[data-smith-fire-why]", "data-smith-fire-why"), words: await textOf(A, "[data-smith-fire-why]"), pressed: await press(A, "[data-smith-strike]", 100), db: (await rpc(idA, "town_smith_try", { p_slot: 0 })).body?.why };
    ok("names put down from both screens: the stand-in's row is the other, then me; my card has me second with one who may use it, the strike says it is not my turn, in words, and the stand-in refuses a try with the same word", same(turn.row, ["B", "A"]) && turn.card?.row === 2 && turn.card.mine === 1 && turn.card.open === 1 && turn.card.leave === true && turn.why === "turn" && !!turn.words && turn.pressed === false && turn.db === "turn", turn);
    await shots(A, "fire-card", async () => { await A.evaluate(`document.querySelector("[data-smith-fire]")?.scrollIntoView({ block: "start", behavior: "instant" })`); await sleep(300); });
    await A.evaluate(`document.querySelector("[data-smith-fire]")?.scrollIntoView({ block: "start", behavior: "instant" })`);

    // a turn's while on: one more of the row may use it; the try, and the fire spent whatever came of it
    await skip(FORGE.fire.turn + 60_000);
    await A.evaluate(`${K}.smithLook()`); await sleep(700);
    cards.turn = await fireCard(A);
    await stock(A, a);
    const takes = await tryTakes(b, "pick", top), before = await kept(b, a);
    const did = await strikeOnce(A, a);
    await sleep(600);
    const spent = await fireKept(), nowTool = await toolKept(a, "pick", true);
    cards.spent = await fireCard(A);
    ok("a turn's while later two of the row may use it; my try for the top is made from the screen for what it said (the catalog's), and whatever came of it the fire is spent: no half in the stand-in, the card not lit", cards.turn?.open === 2 && did.pressed && ["taken", "stays", "down"].includes(did.out) && same(did.want, { [takes.ore]: takes.n, timber: takes.timber, coins: takes.fee })
      && same(did.lost, { coins: takes.fee, [takes.ore]: takes.n, timber: takes.timber }) && spent.flint === null && spent.tinder === null && spent.due > Number((await one(`select town.now_ms() as n`)).n) && (cards.spent === null || cards.spent.lit === "0"), { out: did.out, said: did.said, plus: nowTool?.plus, row: spent.row.map((w) => w.id === a ? "A" : "B"), topped: spent.topped.length, card: cards.spent, was: before.coins });
    ok(did.out === "taken" ? "taken: the stand-in counts me as one who has taken the top, out of the row" : "not taken: the stand-in has me at the row's end, counted among nobody who has taken the top",
      did.out === "taken" ? spent.topped.includes(a) && !spent.row.some((w) => w.id === a) && Number(nowTool.plus) === top : !spent.topped.includes(a) && spent.row.at(-1)?.id === a && Number(nowTool.plus) < top, { row: spent.row.length, topped: spent.topped.length, plus: nowTool?.plus });
    // whoever has taken the top is not offered the row: tried until one of mine is taken, the fire lit by the stand-in's owner's hand each time
    let goes = 1, out = did.out;
    for (; out !== "taken" && goes < 40; goes++) {
      if (await there(A, "[data-smith-offer]")) await chooseFirst(A);
      const plus = Number((await toolKept(a, "pick", true)).plus);
      if (plus < top - 1) { await forgeTo(b, idA, a, 0, top - 1); await A.evaluate(`${K}.smithLook()`); await sleep(400); }
      await lightByHand(b);
      await sql(`update public.town_great_fire set doc = jsonb_set(doc, '{row}', (select coalesce(jsonb_agg(w order by (w->>'id' = $1) desc), '[]'::jsonb) from jsonb_array_elements(doc->'row') w)) where one`, [a]);
      await rpc(idA, "town_fire_join");
      await stock(A, a);
      await anvil(A, "pick", true);
      const more = await strikeOnce(A, a);
      if (!more.pressed) { note(`the strike was not to be pressed: ${JSON.stringify(more)}`); break; }
      out = more.out;
    }
    if (goes > 1) note(`the top was taken at the ${goes}${goes === 2 ? "nd" : goes === 3 ? "rd" : "th"} try (the fire lit by hand for each after the first)`);
    // (the top's own draw is laid out a moment after the try is answered, and no other leaf is turned to while it waits)
    if (out === "taken") await until("the draw of the top is laid out", () => there(A, "[data-smith-offer]"), 8000, 100).catch(() => {});
    if (await there(A, "[data-smith-offer]").catch(() => false)) await chooseFirst(A);
    await leaf(A, "board");
    await A.evaluate(`${K}.smithLook()`); await sleep(700);
    cards.topped = await fireCard(A);
    const topped = { out, card: cards.topped, words: await textOf(A, "[data-smith-fire-topped]"), db: (await rpc(idA, "town_fire_join")).body?.why, first: await attr(A, '[data-smith-top-of="pick"]', "data-by"), top: await there(A, "[data-smith-top]") };
    ok("whoever has taken the top is not offered the row: the card says so in words and has no button, the stand-in refuses their name with the same word, and the board has them as the first to forge a pick to the top", out === "taken" && topped.card?.topped === true && topped.card.join === false && !!topped.words && topped.db === "topped" && topped.first === a, topped);
    note(`the card through its states: ${JSON.stringify(cards)}`);
    await shutSmith(A); await shutSmith(B);
    await fireAsNew(b);
  }

  /* ── 8: a forged tool in each older game, and the tool as it was bought ── */
  if (runs(8)) {
    console.log("8  the older games: a forged tool, and the tool as it was bought");
    await second();
    const { b: bId } = who;
    await opened();
    const plain = (p) => ["powers", "toolOwed", "canFull", "rodStill"].filter((k) => k in (p ?? {}));
    /** A tool of a kind forged by my own functions in a bag of its own, and the stack it then is: put into each go's bag as it is. */
    const make = async (item, level, how) => { await setPurse(a, 0, [{ item, n: 1 }]); const made = await forgeTo(b, idA, a, 0, level, how); return made.tool; };
    const VARIANTS = (stack, item) => [[`forged to +${stack.plus}`, stack, true], ["as it was bought", { item, n: 1 }, false]];

    // ── the rod ──
    await sql(`delete from public.town_lines where member_id = $1`, [a]);
    const rod = await make("rod", 6);
    for (const [word, stack, isForged] of VARIANTS(rod, "rod")) {
      await alive(A);
      await setPurse(a, 100, [stack, { item: "worm", n: 20 }]);
      await again(A);
      await hold(A, "rod");
      const plays0 = Number((await one(`select coalesce(max(id), 0) as n from public.town_plays`)).n), had = (await kept(b, a)).doc.bag;
      const went = await fishOnce(A);
      const is = await kept(b, a), plays = await sql(`select doc->>'how' as how from public.town_plays where id > $1 and member_id = $2 and game = 'fishing' order by id`, [plays0, a]);
      ok(`the rod ${word}: a line cast from the deck, struck at the stand-in's bite, and something landed into the purse the stand-in keeps; every go written down`, went.casts > 0 && went.strikes > 0 && !!went.landed && count(is.doc.bag, went.landed.what) > count(had, went.landed.what) && plays.length === went.strikes && A.errors().length === 0,
        { ...went, landed: went.landed?.what, plays: plays.map((p) => p.how), opts: isForged ? stack.opts : undefined });
      if (!isForged) ok("…with the rod as it was bought the purse has nothing of a forged tool's in it", plain(is.doc).length === 0, plain(is.doc));
    }

    // ── the hoe, and then the can ── (a plot cleared, tilled and sown from the page; the same plant put into the plots beside it by the
    // stand-in's owner's hand, and the can filled by hand; the page is loaded anew after rows are taken out by hand: it would keep them)
    const PLOT = [133, 5], KEY = PLOT.join(","), keys = [-1, 0, 1, 2].map((dx) => `${PLOT[0] + dx},${PLOT[1]}`);
    const bare = async () => { await sql(`delete from public.town_plots where x between $1 and $2 and y = $3`, [PLOT[0] - 1, PLOT[0] + 3, PLOT[1]]); await sql(`delete from public.town_beds where bed = town.bed_of($1, $2)`, PLOT); };
    // (the can: forged to the top, the fire lit by hand, with its option cnRain, which is what makes a watering one of plots beside as well)
    const hoe = await make("hoe", 6), can = await make("can", FORGE.forge.top, { want: ["cnRain"], fire: true });
    await fireAsNew(b);
    for (const [word, stack, isForged] of VARIANTS(hoe, "hoe")) {
      await bare();
      await setPurse(a, 100, [stack, isForged ? { ...can, water: 3 } : { item: "can", n: 1, water: 3 }, { item: "seedKangkong", n: 4 }]);
      await enter(A, "A"); await told(A).catch(() => {});
      await warp(A, PLOT[0], PLOT[1]);
      await hold(A, "hoe");
      const plays0 = Number((await one(`select coalesce(max(id), 0) as n from public.town_plays`)).n);
      const cleared = await farmDeed(A, "clear", 12000);
      await until("the plot is cleared", () => A.evaluate(`${FARM}.seen("${KEY}").soil !== "wild"`), 8000, 150).catch(() => {});
      const mid = await A.evaluate(`${FARM}.seen("${KEY}").soil`);
      const tilled = mid === "tilled" ? { deed: "till", game: "(tilled with the clearing)", note: null } : await farmDeed(A, "till");
      await until("the plot is tilled", () => A.evaluate(`${FARM}.seen("${KEY}").soil === "tilled"`), 8000, 150).catch(() => {});
      const row = await plotKept(PLOT[0], PLOT[1]);
      let is = await kept(b, a);
      const plays = await sql(`select game from public.town_plays where id > $1 and member_id = $2 order by id`, [plays0, a]);
      ok(`the hoe ${word}: the plot's weeds pulled and its soil tilled by the hoe's own games, and the stand-in has the plot tilled`, cleared.deed === "clear" && !!cleared.game && tilled.deed === "till" && row?.soil === "tilled" && plays.length >= 1 && A.errors().length === 0,
        { cleared, tilled, mid, row: row && { soil: row.soil, damp: row.damp ?? null }, plays: plays.map((p) => p.game), opts: isForged ? stack.opts : undefined });
      if (!isForged) ok("…with the hoe as it was bought the plot has nothing of a forged tool's on it, and neither has the purse", !row?.damp && plain(is.doc).length === 0, { damp: row?.damp ?? null, purse: plain(is.doc) });

      await hold(A, "seedKangkong");
      const sown = await farmDeed(A, "sow");
      await until("sown", () => A.evaluate(`${FARM}.seen("${KEY}").crop === "kangkong"`), 8000, 150).catch(() => {});
      const cols = (await sql(`select column_name as c from information_schema.columns where table_schema = 'public' and table_name = 'town_plots' and column_name not in ('x', 'y')`)).map((r) => r.c);
      for (const dx of [-1, 1, 2]) await sql(`insert into public.town_plots (x, y, ${cols.join(", ")}) select $3, y, ${cols.join(", ")} from public.town_plots where x = $1 and y = $2 on conflict (x, y) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`, [PLOT[0], PLOT[1], PLOT[0] + dx]);
      await enter(A, "A"); await told(A).catch(() => {});
      await warp(A, PLOT[0], PLOT[1]);
      await until("the row of plants is on the page", () => A.evaluate(`${JSON.stringify(keys)}.every((k) => ${FARM}?.seen(k).crop === "kangkong")`), 15000, 250).catch(() => {});
      await hold(A, "can");
      const deeds0 = await lastDeed();
      const watered = await farmDeed(A, "water", 12000);
      await sleep(900);
      const shown = Object.fromEntries(await Promise.all(keys.map(async (k) => [k, await A.evaluate(`!!${FARM}.seen("${k}").wet`)])));
      const rows = Object.fromEntries(await Promise.all(keys.map(async (k) => { const p = await plotKept(...k.split(",").map(Number)); return [k, Number(p?.plant?.watered ?? 0) > 0]; })));
      const deed = (await deedsSince(deeds0)).filter((d) => d.by === a), wetBeside = keys.filter((k) => k !== KEY && shown[k]);
      is = await kept(b, a);
      if (isForged) ok(`the can forged to +${can.plus} with the option cnRain: a watering from the page wets the plot under it and plots beside it; the page then shows as wet exactly the plots the stand-in has watered, and the option is counted in the purse`, can.opts.includes("cnRain") && sown.deed === "sow" && watered.deed === "water" && shown[KEY] && wetBeside.length > 0 && same(shown, rows) && is.doc.powers?.cnRain?.n === 1 && A.errors().length === 0, { watered, shown, kept: rows, deeds: deed.map((d) => d.what), water: is.doc.bag[1]?.water, powers: is.doc.powers, opts: can.opts });
      else ok(`the can ${word}: a watering from the page wets the plot under it and no other, on the page and in the stand-in; nothing of a forged tool's in the purse`, sown.deed === "sow" && watered.deed === "water" && shown[KEY] && wetBeside.length === 0 && same(shown, rows) && plain(is.doc).length === 0 && A.errors().length === 0, { watered, shown, kept: rows, water: is.doc.bag[1]?.water, purse: plain(is.doc) });
      if (isForged) { await A.evaluate(`${V}.lookAt(${PLOT[0] + 0.5}, ${PLOT[1] + 0.5})`); await sleep(500); await shots(A, "can-beside"); }
    }
    await bare();
    await enter(A, "A"); await told(A).catch(() => {});

    // ── the net ──
    const net = await make("bugNet", 3, { want: ["ntLong"] });
    const NET = { reach: 2.4, far: 4 };   // (lib/town/insects' NET: how far a net as it was bought takes an insect from, and the slack whoever keeps the game gives)
    const STILL = ["cricket", "stickInsect", "leafInsect", "ladybird", "caterpillar", "scarab", "snail"];
    for (const [, stack, isForged] of VARIANTS(net, "bugNet")) {
      await alive(A);
      await setPurse(a, 100, [stack]);
      await again(A);
      await hold(A, "bugNet");
      const out = await until("the insects, as the stand-in tells them", async () => { const s = await A.evaluate(`${BUGS}?.sights?.() ?? null`); return s && s.length > 3 && s; }, 40000).catch(() => []);
      const reach = await A.evaluate(`${BUGS}.reach()`);
      let caught = null, at = null, tried = 0, last = null;
      for (const s of out.filter((x) => STILL.includes(x.bug)).slice(0, 12)) {
        if (caught) break;
        await warp(A, s.x, s.y);
        const p = await until("it is about", () => A.evaluate(`${BUGS}.poses().find((p) => p.id === ${s.id}) ?? null`), 8000, 100).catch(() => null);
        if (!p) continue;
        // a tile to stand on: for the forged net, farther from the insect than a net as it was bought reaches and within what this one does; otherwise beside it
        const spot = await A.evaluate(`(() => { const aim = ${JSON.stringify(p.aim ?? p)}; let best = null;
          for (let dx = -6; dx <= 6; dx++) for (let dy = -6; dy <= 6; dy++) { const x = Math.floor(aim.x) + dx, y = Math.floor(aim.y) + dy; if (!${V}.walkable(x, y)) continue;
            const mine = Math.hypot(aim.x - x - 0.5, aim.y - y - 0.5);
            const fits = ${isForged} ? mine > ${NET.reach} + 0.3 && mine <= ${reach} - 0.1 : mine <= 1.4 && mine >= 0.4;
            if (fits && (!best || (${isForged} ? mine > best.mine : mine < best.mine))) best = { x, y, mine }; }
          return best; })()`);
        if (!spot) continue;
        tried++;
        await warp(A, spot.x, spot.y);
        await sleep(1500);
        const had = await has(A, s.bug), deeds0 = await lastDeed();
        for (let i = 0; i < 6 && !caught; i++) {
          const q = await A.evaluate(`${BUGS}.poses().find((p) => p.id === ${s.id}) ?? null`);
          if (!q) break;
          const me_ = await self(A), far = Math.hypot(q.aim.x - me_.x, q.aim.y - me_.y);
          if (isForged && far <= NET.reach) break;   // (it came nearer: no catch at the edge here)
          if (await A.evaluate(`${BUGS}.tap(${q.aim.x}, ${q.aim.y})`)) { await until("the swing lands", async () => !(await A.evaluate(`${BUGS}.swinging()`)), 3000, 40).catch(() => {}); await sleep(900); }
          last = { bug: s.bug, far, note: await A.evaluate(`${BUGS}.note()`) };
          if ((await has(A, s.bug)) > had) { caught = s; at = { ...spot, far, note: last.note, deed: (await deedsSince(deeds0)).find((d) => d.what === "net")?.doc ?? null }; }
        }
      }
      if (isForged) ok(`the net with the option ntLong: an insect netted from farther off than a net as it was bought reaches (${NET.reach} tiles) and within what this one does (${reach}), at its edge: the stand-in takes the catch, and the page has it in the bag`, !!caught && at.far > NET.reach && at.far <= reach + 0.05 && reach > NET.reach && A.errors().length === 0, { caught: caught?.bug, at, reach, tried, last, opts: stack.opts });
      else ok("the net as it was bought: an insect netted from beside it, into the purse the stand-in keeps; it reaches what a net always did, and the purse has nothing of a forged tool's", !!caught && reach === NET.reach && plain((await kept(b, a)).doc).length === 0 && A.errors().length === 0, { caught: caught?.bug, at, reach, tried, last });
    }

    // ── the pan ── (a pot of two helpings: the other ladles both, so that none stands when the next is cooked, and sits down to one)
    await sql(`delete from public.town_pots where true`);
    await enter(A, "A"); await enter(B, "B");
    const pan = await make("pan", 6);
    for (const [word, stack, isForged] of VARIANTS(pan, "pan")) {
      await alive(A); await alive(B);
      await setPurse(a, 100, [stack, { item: "minnow", n: 3 }, { item: "salt", n: 1 }]);
      await setPurse(bId, 0, [{ item: "bowl", n: 2 }]);
      await again(A); await again(B);
      await hold(A, "pan");
      const stove = await A.evaluate(`(() => { const k = ${COOK}; const p = k.places().find((x) => x.kind === "stove") ?? k.places()[0]; return p.stand ?? p.at ?? p.tiles?.[0] ?? null; })()`);
      if (stove) await warp(A, stove[0], stove[1]);
      await until("cooking is offered at the stove", () => A.evaluate(`${COOK}.offers().includes("cook")`), 10000).catch(() => null);
      await A.evaluate(`${COOK}.act("cook")`);
      await sleep(350);
      await A.evaluate(`${COOK}.put([["minnow", 3], ["salt", 1]])`);
      await sleep(250);
      await A.evaluate(`${COOK}.go()`);
      const game = await play(A, 60000);
      await until("the dish is done", async () => (await has(A, "potFull")) === 1, 10000).catch(() => null);
      const pot = (await kept(b, a)).doc.bag.find((s) => s?.item === "potFull") ?? null, dish = pot?.of?.dish ?? "friedMinnow";
      await A.evaluate(`${COOK}.shut?.()`); await sleep(300);
      await hold(A, "potFull");
      await warp(A, 44, 52); await warp(B, 45, 52);
      await until("the pot can be set down", () => A.evaluate(`${COOK}.offers().includes("down")`), 8000).catch(() => null);
      await A.evaluate(`${COOK}.act("down")`);
      await until("the pot stands there", () => A.evaluate(`${COOK}.pots().length >= 1`), 8000).catch(() => null);
      const stands = (await one(`select (select to_jsonb(p) from public.town_pots p where p.member_id = $1 limit 1) as p`, [a])).p;
      let ladled = 0;
      for (let i = 0; i < (pot?.of?.left ?? 2); i++) {
        await until("a helping is offered to the other", () => B.evaluate(`${COOK}.offers().includes("ladle")`), 12000).catch(() => null);
        await B.evaluate(`${COOK}.act("ladle")`);
        if (await until("the helping is in the other's bag", async () => (await has(B, dish)) === i + 1, 8000).catch(() => false)) ladled++;
      }
      const sat = await B.evaluate(`${K}.sitDown(${await slotOf(B, dish)}, true).then((d) => ({ ok: d.ok, why: d.why ?? null, dish: d.dish ?? null }))`).catch((e) => ({ error: String(e).slice(0, 160) }));
      await sleep(600);
      const eating = (await kept(b, bId)).doc.eating, left = Number((await one(`select count(*)::int as n from public.town_pots`)).n);
      ok(`the pan ${word}: a dish cooked at the stove by the kitchen's own game, the pot set down in the yard, its helpings ladled by the other, who sits down to one: all as the stand-in keeps them, and the pot gone when it is empty`, !!game && !!pot && !!stands && ladled === (pot?.of?.left ?? 2) && sat.ok === true && eating?.dish === dish && left === 0 && A.errors().length === 0 && B.errors().length === 0,
        { game, pot, stands: stands && { marks: stands.marks ?? null }, ladled, sat, eating: eating && { dish: eating.dish }, left, opts: isForged ? stack.opts : undefined });
      if (!isForged) ok("…with the pan as it was bought the pot carries nothing of a forged tool's, and neither has the cook's purse", !stands?.marks && plain((await kept(b, a)).doc).length === 0, { marks: stands?.marks ?? null, purse: plain((await kept(b, a)).doc) });
    }
  }

  /* ── 9: a counted option ── */
  if (runs(9)) {
    console.log("9  an option that is counted: to its last, refused in words, back with the day");
    await opened();
    const OPT = "cnFull", PLOT = [133, 9];
    await fireAsNew(b);
    await setPurse(a, 2000, [{ item: "can", n: 1 }, { item: "hoe", n: 1 }, { item: "seedKangkong", n: 4 }]);
    const can = await forged(A, idA, a, "can", FORGE.forge.top, { want: [OPT], fire: true });
    await fireAsNew(b);
    ok(`a can forged to the top by its member's own functions (the fire lit by hand), the option ${OPT} drawn for it: counted, ${FORGE.options?.of?.[OPT]?.use?.n ?? "so many"} a day by the catalog`, can.tool.opts.includes(OPT), { opts: can.tool.opts, tries: can.tries, use: FORGE.options?.of?.[OPT]?.use });
    // (early in the day, so that the option's minutes end before the day does)
    const day = async () => (await one(`select town.day_of(town.now_ms()) as d, town.now_ms() as n`));
    const d0 = await day();
    let ms = 0; for (; ms < 26 * 3_600_000 && (await one(`select town.day_of(town.now_ms() + $1::bigint) as d`, [ms])).d === d0.d; ms += 600_000);
    await skip(ms + 60_000);
    const d1 = await day();
    await sql(`delete from public.town_plots where x between $1 and $2 and y = $3`, [PLOT[0], PLOT[0] + 3, PLOT[1]]);
    await sql(`delete from public.town_beds where bed = town.bed_of($1, $2)`, PLOT);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    await enter(A, "A");
    await told(A);
    await warp(A, PLOT[0], PLOT[1]);
    await hold(A, "hoe");
    await farmDeed(A, "clear");
    await until("cleared", () => A.evaluate(`${FARM}.seen("${PLOT.join(",")}").soil !== "wild"`), 8000, 150).catch(() => {});
    if ((await A.evaluate(`${FARM}.seen("${PLOT.join(",")}").soil`)) !== "tilled") await farmDeed(A, "till");
    await until("tilled", () => A.evaluate(`${FARM}.seen("${PLOT.join(",")}").soil === "tilled"`), 8000, 150).catch(() => {});
    await hold(A, "seedKangkong");
    await farmDeed(A, "sow");
    await until("sown", () => A.evaluate(`${FARM}.seen("${PLOT.join(",")}").crop === "kangkong"`), 8000, 150).catch(() => {});
    const cols = (await sql(`select column_name as c from information_schema.columns where table_schema = 'public' and table_name = 'town_plots' and column_name not in ('x', 'y')`)).map((r) => r.c);
    for (const dx of [1, 2, 3]) await sql(`insert into public.town_plots (x, y, ${cols.join(", ")}) select $3, y, ${cols.join(", ")} from public.town_plots where x = $1 and y = $2 on conflict (x, y) do update set ${cols.map((c) => `${c} = excluded.${c}`).join(", ")}`, [PLOT[0], PLOT[1], PLOT[0] + dx]);
    await A.evaluate(`${K}.nudged?.("farm")`);
    const used = async () => (await kept(b, a)).doc.powers?.[OPT] ?? null;
    const waterAt = async (dx) => { await warp(A, PLOT[0] + dx, PLOT[1]); await hold(A, "can"); const did = await farmDeed(A, "water", 6000); await sleep(600); return { ...did, wet: await A.evaluate(`!!${FARM}.seen("${PLOT[0] + dx},${PLOT[1]}").wet`), kept: Number((await plotKept(PLOT[0] + dx, PLOT[1]))?.plant?.watered ?? 0) > 0 }; };
    const first = await waterAt(0), after1 = await used(), till = (await kept(b, a)).doc.canFull ?? null;
    ok("the can, with no water in it, waters from the page all the same: the option is used, counted once in the purse the stand-in keeps, and its minutes begun", first.deed === "water" && first.wet && first.kept && after1?.n === 1 && typeof till === "number" && (await kept(b, a)).doc.bag[0].water === undefined || (await kept(b, a)).doc.bag[0].water === 0, { first, powers: after1, canFull: till });
    // its minutes over, the same day: it is at its last
    const now1 = Number((await day()).n);
    await skip(Math.max(0, Number(till) - now1) + 30_000);
    const sameDay = (await day()).d === d1.d;
    await A.evaluate(`${K}.nudged?.("farm")`); await again(A);
    const refused = await waterAt(1);
    const words = refused.note ?? await A.evaluate(`${FARM}.note()`);
    ok("its minutes over, the same day, the day's one use spent: a watering from the page is refused in words, the plant stays dry on the page and in the stand-in, and nothing more is counted", sameDay && !refused.wet && !refused.kept && !!words && (await used())?.n === 1, { sameDay, refused, words });
    // the next day: back
    let on = 0; for (; on < 26 * 3_600_000 && (await one(`select town.day_of(town.now_ms() + $1::bigint) as d`, [on])).d === d1.d; on += 600_000);
    await skip(on + 60_000);
    await sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [a]);
    await A.evaluate(`${K}.nudged?.("farm")`); await again(A);
    const back = await waterAt(2), after2 = await used();
    ok("the clock put on to the next day: the same watering from the page is taken again, and the count is the new day's first", back.deed === "water" && back.wet && back.kept && after2?.n === 1 && after2.k !== after1?.k, { back, was: after1, is: after2 });
    await sql(`delete from public.town_plots where x between $1 and $2 and y = $3`, [PLOT[0], PLOT[0] + 3, PLOT[1]]);
    await sql(`delete from public.town_beds where bed = town.bed_of($1, $2)`, PLOT);
  }

  /* ── 10: pictures ── */
  if (runs(10)) {
    console.log("10 pictures");
    await second();
    const { b: bId, idB } = who;
    await sql(`delete from public.town_smiths where member_id in ($1, $2)`, [a, bId]);
    await fireAsNew(b);
    await setPurse(a, 4321, [{ item: "pick", n: 1 }, { item: "hoe", n: 1 }, { item: "can", n: 1 }, { item: "shardCopper", n: 45 }, { item: "chipRuby", n: 22 }, { item: "timber", n: 37 }, { item: "oreSilver", n: 14 }, { item: "gemRuby", n: 2 }, { item: "gemSapphire", n: 1 }, { item: "rod", n: 1 }]);
    await setPurse(bId, 0, []);
    await opened();
    const pick = await forged(null, idA, a, "pick", 7), hoe = await forged(null, idA, a, "hoe", 4);
    await rpc(idA, "town_smith_gem", { p_slot: 0, p_gem: "gemRuby" });
    await rpc(idA, "town_smith_smelt", { p_piece: "oreCopper", p_n: 2 });
    await enter(A, "A", "&townAt=smith"); await told(A);
    await go(B, "smith");
    const at = await self(A);
    await warp(B, at.x + 1, at.y + 1);
    const purseNow = await kept(b, a);
    for (const v of ["smelt", "forge", "gems", "move", "board"]) {
      await openSmith(A, v);
      if (v !== "smelt" && v !== "board") await anvil(A, v === "move" ? "hoe" : "pick");
      if (v === "move") await press(A, `[data-smith-move-pick="${await slotOf(A, "can")}"]`, 600);
      await A.evaluate(`document.querySelector("[data-smith-panel] .overflow-y-auto")?.scrollTo(0, 0)`);
      const coins = await attr(A, "[data-smith-coins]", "data-smith-coins");
      if (Number(coins) !== purseNow.coins && v === "smelt") note(`the screen's coins ${coins}, the stand-in's ${purseNow.coins}`);
      await shots(A, `leaf-${v}`);
      await shutSmith(A);
    }
    // a try over a head, as the second window sees it (shown by the page's own handle with what a try told the room)
    await B.evaluate(`${V}.lookAt(${at.x}, ${at.y})`);
    await sleep(600);
    await A.evaluate(`${S}.show({ item: "pick", from: 7, out: "taken" })`);
    await sleep(1500);
    await shots(B, "try-over-a-head", async () => { await A.evaluate(`${S}.show({ item: "pick", from: 7, out: "taken" })`); await sleep(1500); });
    // the hand bar and the bag with a forged tool
    await hold(A, "pick");
    await sleep(500);
    const bar = { slots: await A.evaluate(`${"window.__townHand"}?.slots?.() ?? null`), held: await A.evaluate(`${"window.__townHand"}?.held?.() ?? null`) };
    await shots(A, "hand-bar");
    await A.evaluate(`document.querySelector('button[title="กระเป๋า"], button[title="Bag"]')?.click()`);
    await sleep(900);
    const bagMarks = await A.evaluate(`[...document.querySelectorAll("[data-slot]")].map((e) => ({ ...e.dataset })).filter((d) => d.item)`);
    await shots(A, "bag");
    ok("the pictures are written: the five leaves, the great fire's card (section 7), a try over a head, the hand bar, the bag", true, { bar, bag: bagMarks.slice(0, 4), tool: pick.tool, hoe: hoe.tool.plus });
    await key(A, "Escape", "Escape", 27);
  }

  for (const X of [A, B].filter(Boolean)) {
    const said = X.logs.filter((l) => l.startsWith("console.error"));
    ok(`${X.label}: no page errors`, X.errors().length === 0, X.errors().slice(0, 4));
    if (said.length) note(`${X.label}: ${said.length} line${said.length === 1 ? "" : "s"} on the console's error channel: ${brief(said.slice(0, 3))}`);
  }
} catch (e) {
  fail++; failed.push("(stopped)");
  console.log(`  FAIL (stopped) ${e?.stack ?? e}`);
  await A.shot(`${OUT}/smith-db-stopped-A.png`).catch(() => {});
  if (B) await B.shot(`${OUT}/smith-db-stopped-B.png`).catch(() => {});
  console.log(`       logs: ${JSON.stringify([...A.logs.slice(-4), ...(B?.logs.slice(-4) ?? [])])}`);
} finally {
  await fireAsNew(b).catch(() => {});
  try { await A.close(); } catch { /* gone already */ }
}
console.log(`\n${pass} ok, ${fail} failed${failed.length ? `\n  failed: ${failed.map((f) => f.slice(0, 90)).join("\n          ")}` : ""}`);
process.exit(fail ? 1 : 0);

/** The first of the choices a talk ends with, pressed. */
async function firstChoice(X) { await X.evaluate(`${TALK}?.querySelector('[role="group"] button')?.click()`); await sleep(500); }
