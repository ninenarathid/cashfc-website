// Woodcutting in real browsers, on the dev test room (the browser's trial keeps it; `next dev` only: the mountain is
// there and nowhere else yet). Two testers in one Chrome, so that one sees the stump the other made; a third on a
// phone's screen for its pictures. A tree felled by the arrow keys and by clicks on the board's two halves; what it
// gives by the misses; the stump on the other's map at once, and the tree back through its looks as the trial's clock
// is put forward; tired hands; a tree this axe will not bite; the ancient tree; the three gifts; an axe's options,
// gems and counted powers. Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-felling.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
import { board, fumble, gameGone } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 500)}`); };
const T = "window.__cashTown", V = "window.__townView", K = "window.__townTrade", R = "window.__townTrees", G = "window.__townGame", M = "window.__townMore";
const NO_LUCK = { dark: 0.99, scent: 0.99, which: 0.99, chain: 0.99 };
const url = (X) => `${BASE}/town?townTest=${X.label}&townRoom=check&townHour=12&townWeather=clear&townAt=slope`;
const enter = async (X) => {
  await X.goto(url(X));
  await until(`${X.label} ready`, async () => (await status(X)) === "ready", 240000);
  await until(`${X.label}'s trees`, () => X.evaluate(`!!${K} && !!${R} && ${R}.wood().length > 100`), 60000);
};
const frames = (X) => X.evaluate(`new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))))`);
/** A bag with nothing but an axe, held; full of stamina; no gifts; chance that turns nothing up; the clock as it is. */
const fresh = (X, axe = {}) => X.evaluate(`(() => { const k = ${K}, key = "cashtown.trial.purse.2." + ${T}.me().id;
  // (what the purse has counted of an axe's powers and of the line's own is forgotten: the trial keeps a purse as plain words)
  try { const p = JSON.parse(localStorage.getItem(key)); if (p) { delete p.powers; delete p.felling; localStorage.setItem(key, JSON.stringify(p)); } } catch {}
  k.empty(); k.setGifts(false); k.grant("axe", 1); const i = k.purse().bag.findIndex((s) => s && s.item === "axe");
  k.setTool(i, ${axe.plus ?? 0}, ${JSON.stringify(axe.opts ?? [])}, ${JSON.stringify(axe.gems ?? [])}); k.hold(i); k.setStamina(100); k.setFellLuck(${JSON.stringify(NO_LUCK)}); k.setFellSeed(null);
  document.querySelector("[data-trees-card] button")?.click(); return i; })()`);
const heldOf = (X, id) => X.evaluate(`${K}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const stamina = (X) => X.evaluate(`(() => { const p = ${K}.purse(); return p.stamina.left; })()`);
/** A tree of the layout, and a tile beside it that can be stood on. */
const treeOf = (X, id) => X.evaluate(`${R}.wood().find((t) => t.id === ${id})`);
/** A tile beside a tree that can be stood on: one that no other tree is beside, where there is one. */
const beside = (X, t) => X.evaluate(`(() => { const t = ${JSON.stringify(t)}, n = t.size || 1, wood = ${R}.wood(), all = [];
  const far = (o, x, y) => { const m = o.size || 1; return Math.max(Math.max(o.x - x, 0, x - (o.x + m - 1)), Math.max(o.y - y, 0, y - (o.y + m - 1))); };
  for (let y = t.y - 1; y <= t.y + n; y++) for (let x = t.x - 1; x <= t.x + n; x++) if ((x < t.x || x >= t.x + n || y < t.y || y >= t.y + n) && ${V}.walkable(x, y)) all.push([x, y, wood.filter((o) => o.id !== t.id && far(o, x, y) <= 1).length]);
  all.sort((a, b) => a[2] - b[2]);
  return all[0] ? [all[0][0], all[0][1], all[0][2]] : null; })()`);
/** Stand beside a tree, and wait until I stand there (with `offered`: until it is the tree the button offers, where no other tree is beside that tile). */
async function standBy(X, id, offered = true) {
  const t = await treeOf(X, id), at = await beside(X, t);
  await X.evaluate(`${V}.warp(${at[0]}, ${at[1]})`);
  if (offered) await until(`tree ${id} is offered`, async () => { const here = await X.evaluate(`${R}.here()`); return at[2] ? here !== -1 : here === id; }, 8000, 100);
  else await sleep(900);
  return at;
}
const key = async (X, k) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code: k === " " ? "Space" : k, windowsVirtualKeyCode: k === "ArrowLeft" ? 37 : k === "ArrowRight" ? 39 : k === "Escape" ? 27 : 32 }); };
const click = async (X, x, y) => { for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 }); };
const clickOn = async (X, sel) => { const r = await X.evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`); if (!r) return false; await click(X, r.x, r.y); return true; };
const state = (X) => X.evaluate(`${G}?.kind === "felling" ? ${G}.state() : null`);
const up = (X) => until("the felling board", async () => (await X.evaluate(`${G}?.kind ?? null`)) === "felling", 8000, 60);
/** Begin at a tree I stand by, and wait for its board. */
async function begin(X, id) { await X.evaluate(`${R}.begin(${id})`); await up(X); await sleep(120); return state(X); }
/** Play the board that is up with so many branches struck on purpose, then with a steady hand; gives the card, or the note. */
async function finish(X, misses = 0, every = 120) {
  for (let i = 0; i < misses; i++) await fumble(X);
  await X.evaluate(`${G}?.auto?.(true, ${every})`);
  await gameGone(X, 30000);
  await until("what the go came to", () => X.evaluate(`!!${R}.card() || !!${R}.note()`), 6000, 60);
  return X.evaluate(`({ card: ${R}.card(), note: ${R}.note() })`);
}
const fellOne = async (X, id, misses = 0) => { await standBy(X, id); await begin(X, id); return finish(X, misses); };
const got = (r, id) => r.card?.got.find(([x]) => x === id)?.[1] ?? 0;
/** Pines of the slope with nothing felled about them, apart from each other, to work at one after another. */
const pines = (X) => X.evaluate(`(() => { const all = ${R}.wood().filter((t) => t.tier === 1 && !t.elder);
  const lone = all.filter((t) => !all.some((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= 3)).map((t) => t.id);
  const trio = all.find((t) => all.filter((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= 2).length >= 2);
  const pair = all.find((t) => t.id !== trio.id && all.some((o) => o.id !== t.id && Math.max(Math.abs(o.x - t.x), Math.abs(o.y - t.y)) <= 3));
  return { all: all.map((t) => t.id), lone, trio: trio.id, pair: pair.id }; })()`);

const A = await browser("FA", { width: 1280, height: 860 });
let B = null, C = null;
try {
  await enter(A);
  await A.evaluate(`${K}.reset()`);
  await A.evaluate(`${K}.setTrees(null)`);
  // (a window of its own: of two tabs of one window only the one in front is drawn as often as a game needs)
  B = await A.window("FB", { width: 1280, height: 860 });
  await enter(B);
  const P = await pines(A);
  // (trees to work at, each once: far enough from the trio and the pair that nothing done to one touches another)
  const spare = P.all.filter((id) => id !== P.trio && id !== P.pair);
  let next = 0;
  const tree = () => spare[next++ % spare.length];

  console.log("== a tree, felled by the keys");
  await fresh(A);
  const t1 = tree();
  await A.evaluate(`${K}.letGo()`);
  await standBy(A, t1, false);
  ok("nothing is offered to empty hands, and a tap on a tree is a step as anywhere", (await A.evaluate(`${R}.here()`)) === -1 && (await A.evaluate(`${R}.tap(${t1})`)) === false);
  await fresh(A);
  await standBy(A, t1);
  ok("with an axe in the hand the grown tree I stand by is offered", (await A.evaluate(`document.querySelector("[data-trees-offer]")?.dataset.treesOffer`)) === String(t1));
  ok("…by one press, its board: there is no plain press beside a tree", (await A.evaluate(`!document.querySelector("[data-trees-plain]") && document.querySelectorAll("[data-trees-offer]").length === 1`)) === true);
  await A.shot(`${OUT}/felling-0-offer.png`);
  await key(A, " ");
  await up(A);
  let s = await state(A);
  ok("the board: twelve chops, branches seen three up, the bar full and still until the first chop", s.chops === 12 && s.ahead === 3 && s.share === 1 && !s.running && s.most === 0, s);
  ok("it says how it is played, in three marks", (await A.evaluate(`document.querySelectorAll("[data-felling-how] li").length`)) === 3);
  await frames(A);
  await A.shot(`${OUT}/felling-1-ready.png`);
  await sleep(700);
  ok("nothing runs before the first chop", (await state(A)).share === 1);
  // (a few chops for the picture's sake, and the board put away: a picture takes longer than the bar has)
  for (let i = 0; i < 5; i++) { await A.evaluate(`${G}.chop(${G}.safe())`); await sleep(120); }
  await A.shot(`${OUT}/felling-2-chopping.png`);
  await key(A, "Escape");
  await gameGone(A, 4000);
  ok("put away with Escape, nothing is felled and nothing spent", (await A.evaluate(`${R}.looks()[${t1}] ?? 3`)) === 3 && (await stamina(A)) === 100 && (await heldOf(A, "log")) === 0);
  await key(A, " ");
  await up(A);
  await sleep(150);
  // the arrow keys, each from the side no branch comes down on
  for (let i = 0; i < 5; i++) { await key(A, (await A.evaluate(`${G}.safe()`)) < 0 ? "ArrowLeft" : "ArrowRight"); await sleep(110); }
  s = await state(A);
  ok("five presses of the arrow keys are five chops, and the bar runs", s.cut === 5 && s.running && s.misses === 0, s);
  for (let i = 0; i < 7; i++) { await key(A, (await A.evaluate(`${G}.safe()`)) < 0 ? "ArrowLeft" : "ArrowRight"); await sleep(110); }
  await gameGone(A, 8000);
  await until("the card", () => A.evaluate(`!!${R}.card()`), 5000, 60);
  let r = await A.evaluate(`({ card: ${R}.card(), note: ${R}.note() })`);
  ok("felled clean: two logs and two fine timber, on a card", got(r, "log") === 2 && got(r, "timber") === 2 && r.card.felled[0].misses === 0 && (await A.evaluate(`!!document.querySelector("[data-trees-card]")`)), r);
  ok("they are in the bag, and it cost two stamina", (await heldOf(A, "log")) === 2 && (await heldOf(A, "timber")) === 2 && (await stamina(A)) === 98);
  await frames(A);
  await A.shot(`${OUT}/felling-3-card.png`);
  ok("the go is written down", await A.evaluate(`(() => { const p = ${K}.plays().at(-1); return !!p && p.game === "felling" && p.won && p.what === "pine" && p.need === 12 && p.hits === 12 && p.misses === 0; })()`));
  ok("two points on the woodcutters' line, and ten for the first pine", (await A.evaluate(`${K}.lines().lines.felling.points`)) === 12, await A.evaluate(`${K}.lines().lines.felling`));

  console.log("== the stump, for everybody; and the tree back by the clock");
  ok("it is a stump on my map", (await A.evaluate(`${R}.looks()[${t1}]`)) === 0);
  await until("the other tester's map has the stump", async () => (await B.evaluate(`${R}.looks()[${t1}]`)) === 0, 6000, 100).then(() => ok("the other tester's map has the stump at once", true), (e) => ok("the other tester's map has the stump at once", false, e.message));
  await standBy(B, t1, false);
  await B.evaluate(`(() => { const k = ${K}; k.empty(); k.grant("axe", 1); k.hold(k.purse().bag.findIndex((s) => s && s.item === "axe")); k.setStamina(100); })()`);
  await sleep(600);
  ok("a stump is not offered", (await B.evaluate(`${R}.here()`)) !== t1, await B.evaluate(`${R}.here()`));
  await B.evaluate(`${R}.begin(${t1})`);
  await until("a note", () => B.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("and walked up to all the same, it says only that it is not grown", (await B.evaluate(`${R}.note()`)) === "ยังไม่โต" && (await B.evaluate(`${G}?.kind ?? null`)) === null, await B.evaluate(`${R}.note()`));
  const looks = [];
  for (const mins of [11, 14, 14, 2]) { await A.evaluate(`${K}.skipHours(${mins} / 60)`); await sleep(2600); looks.push(await B.evaluate(`${R}.looks()[${t1}] ?? 3`)); }
  ok("it comes back through its looks: a sprout at eleven minutes, a young tree at twenty-five and thirty-nine, grown at forty-one", JSON.stringify(looks) === "[1,2,2,3]", looks);
  await sleep(400);
  ok("grown, it is offered again", (await B.evaluate(`${R}.here()`)) === t1);

  console.log("== by clicks on the board's two halves, and what the misses cost");
  await fresh(A);
  const t2 = tree();
  await standBy(A, t2);
  // a real click on the offer, then on the stage's halves
  await clickOn(A, "[data-trees-offer]");
  await up(A);
  const stage = await A.evaluate(`(() => { const b = document.querySelector("[data-felling-stage]").getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; })()`);
  let struck = 0, clicks = 0;
  for (let i = 0; i < 30 && (await state(A)) && !(await state(A)).over; i++) {
    // (one branch struck on purpose, the first there is; the rest from the safe side)
    const under = await A.evaluate(`${G}.under()`), side = !struck && under ? under : await A.evaluate(`${G}.safe()`);
    if (!struck && under) struck = 1;
    await click(A, stage.x + stage.w * (side < 0 ? 0.25 : 0.75), stage.y + stage.h * 0.55);
    clicks++;
    await sleep(130);
  }
  await gameGone(A, 8000);
  await until("the card", () => A.evaluate(`!!${R}.card()`), 5000, 60);
  r = await A.evaluate(`({ card: ${R}.card() })`);
  ok("clicks on the left and right halves chop from that side, a chop a click; one branch struck: one fine timber", clicks === 12 && struck === 1 && r.card.felled[0].misses === 1 && got(r, "log") === 2 && got(r, "timber") === 1, { clicks, r });
  await fresh(A);
  r = await fellOne(A, tree(), 2);
  ok("two misses: still one fine timber", r.card?.felled[0].misses === 2 && got(r, "timber") === 1 && got(r, "log") === 2, r);
  await fresh(A);
  r = await fellOne(A, tree(), 3);
  ok("three misses: logs only", r.card?.felled[0].misses === 3 && got(r, "timber") === 0 && got(r, "log") === 2, r);
  ok("the card says the branches that struck", await A.evaluate(`document.querySelector("[data-trees-felled]")?.dataset.misses === "3"`));

  console.log("== a tap on the map");
  await fresh(A);
  const t3 = tree(), t3at = await treeOf(A, t3);
  await A.evaluate(`${V}.warp(${t3at.x + 3}, ${t3at.y + 3})`).then((w) => w || A.evaluate(`${V}.warp(${t3at.x - 3}, ${t3at.y + 3})`));
  await sleep(900);
  await frames(A);
  const hit = await A.evaluate(`(${M}.hits().find((h) => h.kind === "tree" && h.id === ${t3})) ?? null`);
  if (hit) {
    const cv = await A.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
    await click(A, cv.x + hit.x, cv.y + hit.y);
    await up(A).then(() => ok("a click on a grown tree walks up to it and opens the board", true), (e) => ok("a click on a grown tree walks up to it and opens the board", false, e.message));
    await key(A, "Escape");
    await gameGone(A, 4000);
    ok("Escape puts the board away, and the tree stands", (await A.evaluate(`${R}.looks()[${t3}] ?? 3`)) === 3 && (await heldOf(A, "log")) === 0);
  } else ok("a click on a grown tree walks up to it and opens the board", false, "the tree is not on the screen");

  console.log("== with no stamina");
  await fresh(A);
  await A.evaluate(`${K}.setStamina(0)`);
  const t4 = tree();
  await standBy(A, t4);
  s = await begin(A, t4);
  ok("the bar runs 1.6 times as fast, branches are seen a segment later, and three misses are all there are", Math.abs(s.pace - 1.6) < 1e-6 && s.ahead === 2 && s.most === 3 && s.spent, s);
  ok("the board shows the three misses left", (await board(A)).left === 3);
  await frames(A);
  await A.shot(`${OUT}/felling-4-tired.png`);
  for (let i = 0; i < 3; i++) await fumble(A);
  await gameGone(A, 8000);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("at the third miss the axe slips from the hand: the tree stands, nothing got, nothing lost", (await A.evaluate(`${R}.note()`)) === "ขวานหลุดมือ ต้นไม้ยังยืนอยู่" && (await A.evaluate(`${R}.looks()[${t4}] ?? 3`)) === 3 && (await heldOf(A, "log")) === 0 && (await heldOf(A, "axe")) === 1 && (await stamina(A)) === 0,
    { note: await A.evaluate(`${R}.note()`), look: await A.evaluate(`${R}.looks()[${t4}] ?? 3`) });
  ok("the lost go is written down too", await A.evaluate(`(() => { const p = ${K}.plays().at(-1); return !!p && p.game === "felling" && !p.won && p.spent && p.misses === 3; })()`));
  // and walked away from, the bar runs out
  await fresh(A);
  await A.evaluate(`${K}.setStamina(0)`);
  await sleep(2700);
  s = await begin(A, t4);
  await A.evaluate(`${G}.chop(${G}.safe())`);
  await gameGone(A, 6000);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("left alone the bar runs out, and the tree stands", (await A.evaluate(`${R}.note()`)) === "ไม่ทัน ต้นไม้ยังยืนอยู่" && (await A.evaluate(`${R}.looks()[${t4}] ?? 3`)) === 3, await A.evaluate(`${R}.note()`));

  console.log("== trees this axe does not fell");
  await fresh(A);
  const iron = await A.evaluate(`${R}.wood().find((t) => t.tier === 2).id`);
  await standBy(A, iron, false);
  await A.evaluate(`${R}.begin(${iron})`);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("a tree of the upper terrace: this axe will not bite", (await A.evaluate(`${R}.note()`)) === "ขวานนี้ฟันไม่เข้า" && (await A.evaluate(`${G}?.kind ?? null`)) === null, await A.evaluate(`${R}.note()`));
  const elder = await A.evaluate(`${R}.wood().find((t) => t.elder).id`);
  await sleep(2700);
  await standBy(A, elder, false);
  await A.evaluate(`${R}.begin(${elder})`);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("the ancient tree, to an axe under +10: refused, by its state", (await A.evaluate(`${R}.note()`)) === "ต้นไม้เก่าแก่ไม่สะเทือนเลย" && (await A.evaluate(`${G}?.kind ?? null`)) === null, await A.evaluate(`${R}.note()`));
  await fresh(A, { plus: 9 });
  await sleep(2700);
  await A.evaluate(`${R}.begin(${elder})`);
  await until("a note", () => A.evaluate(`!!${R}.note()`), 4000, 60).catch(() => {});
  ok("and at +9 still", (await A.evaluate(`${R}.note()`)) === "ต้นไม้เก่าแก่ไม่สะเทือนเลย");
  await fresh(A, { plus: 10 });
  await sleep(300);
  s = await begin(A, elder);
  ok("at +10 its board comes up: a longer game than a pine's with the same axe", s.chops === 8 && s.ahead === 5 && Math.abs(s.pace - 0.5) < 1e-6, s);
  await frames(A);
  await A.shot(`${OUT}/felling-5-ancient.png`);
  r = await finish(A, 0);
  ok("felled: fifteen fine timber and three resin", got(r, "timber") === 15 && got(r, "resin") === 3 && got(r, "log") === 0, r);
  ok("it is a great stump on both maps, and nobody is told when it is back", (await A.evaluate(`${R}.looks()[${elder}]`)) === 0 && (await until("B's", async () => (await B.evaluate(`${R}.looks()[${elder}]`)) === 0, 5000, 100).catch(() => false)) && (await A.evaluate(`${R}.told().down.find((d) => d.id === ${elder}).until === undefined`)));
  ok("ten points for it, and ten for the first", (await A.evaluate(`${K}.lines().lines.felling.points`)) >= 12 + 20);
  await A.evaluate(`${K}.setTree(${elder}, null)`);

  console.log("== what a forged axe changes");
  const at = async (axe, id) => { await fresh(A, axe); await sleep(2700); await standBy(A, id); const st = await begin(A, id); await key(A, "Escape"); await gameGone(A, 4000); return st; };
  const t5 = tree();
  s = await at({ plus: 4 }, t5);
  ok("+4: ten chops, the bar a tenth slower", s.chops === 10 && s.ahead === 3 && Math.abs(s.pace - 0.9) < 1e-6, s);
  s = await at({ plus: 10 }, t5);
  ok("+10: four chops, branches seen five up, the bar half as fast", s.chops === 4 && s.ahead === 5 && Math.abs(s.pace - 0.5) < 1e-6, s);
  s = await at({ plus: 3, opts: ["axKeen"] }, t5);
  ok("an option drawn at +3 (the keen edge): two chops fewer", s.chops === 9, s);
  s = await at({ plus: 3, opts: ["axGrain"] }, t5);
  ok("another (the grain-reader): branches seen two further up", s.ahead === 5 && s.chops === 11, s);
  s = await at({ plus: 2, opts: ["axGrain"] }, t5);
  ok("under the plus it was drawn at it sleeps", s.ahead === 3, s);
  s = await at({ gems: ["fire"] }, t5);
  ok("a gem of fire: fewer chops", s.chops === 11 && s.pace === 1, s);
  s = await at({ gems: ["ice"] }, t5);
  ok("a gem of ice: a slower bar", Math.abs(s.pace - 0.85) < 1e-6 && s.chops === 12, s);
  s = await at({ gems: ["water"] }, t5);
  ok("a gem of water: a branch forgiven", s.spared === 1, s);
  s = await at({ plus: 10, gems: ["water"] }, t5);
  ok("at +10 the gem is a level stronger: two forgiven", s.spared === 2, s);
  // a gem of light: grown trees glint, on my own screen
  await fresh(A, { gems: ["light"] });
  await sleep(500); await frames(A);
  const glints = await A.evaluate(`${R}.glints()`);
  await fresh(A);
  await sleep(500); await frames(A);
  ok("a gem of light: the grown trees about me glint, and with a plain axe none does", glints > 0 && (await A.evaluate(`${R}.glints()`)) === 0, glints);
  // a gem of lightning: a neighbour left half cut, for everybody
  await fresh(A, { gems: ["lightning"] });
  await A.evaluate(`${K}.setFellLuck(${JSON.stringify({ ...NO_LUCK, chain: 0 })})`);
  await sleep(2700);
  r = await fellOne(A, P.pair);
  const half = r.card?.felled[0].chained;
  ok("a gem of lightning: a tree near the felled one is left half cut", Number.isInteger(half) && (await A.evaluate(`${R}.told().half.includes(${half})`)), r);
  if (Number.isInteger(half)) {
    await until("B's", async () => await B.evaluate(`${R}.told().half.includes(${half})`), 5000, 100).then(() => ok("the other tester is told of it too", true), (e) => ok("the other tester is told of it too", false, e.message));
    s = await at({}, half);
    ok("it takes half the chops, whoever fells it", s.chops === 6, s);
  }
  // a gem of earth: less stamina, what is left of a point owed on
  await fresh(A, { gems: ["earth"] });
  await A.evaluate(`${K}.setTrees(null)`);
  await sleep(2700);
  for (let i = 0; i < 3; i++) await fellOne(A, tree());
  ok("a gem of earth: three trees cost five stamina, not six", (await stamina(A)) === 95, await stamina(A));

  console.log("== the echo axe (the line's first rank)");
  await fresh(A);
  await A.evaluate(`${K}.setTrees(null)`);
  await A.evaluate(`(() => { ${K}.setGifts(["charmEchoAxe"]); return ${K}.charmsWear(["charmEchoAxe"]); })()`);
  await sleep(2700);
  await standBy(A, P.trio);
  s = await begin(A, P.trio);
  ok("worn, one game is for three trees standing close", s.trees === 3 && s.at === 0, s);
  await frames(A);
  r = await finish(A, 0, 110);
  ok("all three fall in the one game, each with its wood, and each costs its stamina", r.card?.felled.length === 3 && got(r, "log") === 6 && got(r, "timber") === 6 && (await stamina(A)) === 94, r);
  await frames(A);
  await A.shot(`${OUT}/felling-6-echo-card.png`);
  ok("three stumps on both maps", (await A.evaluate(`Object.values(${R}.looks()).filter((l) => l === 0).length`)) === 3 && (await until("B's", async () => (await B.evaluate(`Object.values(${R}.looks()).filter((l) => l === 0).length`)) === 3, 5000, 100).catch(() => false)));
  // a stretch lost leaves its tree
  await A.evaluate(`${K}.setTrees(null)`);
  await A.evaluate(`${K}.setStamina(100)`);
  await sleep(2700);
  await standBy(A, P.trio);
  await begin(A, P.trio);
  await A.evaluate(`${G}.auto(true, 110)`);
  await until("the second stretch", async () => (await state(A))?.at === 1, 10000, 40);
  await A.evaluate(`${G}.auto(false)`);
  await sleep(700);
  await A.evaluate(`${G}.chop(${G}.safe())`);
  await until("the third stretch", async () => (await state(A))?.at === 2, 10000, 60);
  await sleep(700);
  r = await finish(A, 0, 110);
  ok("a stretch that runs out of time leaves its tree standing: two fell, and four stamina went", r.card?.felled.length === 2 && got(r, "log") === 4 && (await stamina(A)) === 96, r);
  await A.evaluate(`${K}.charmsWear([])`);
  await A.evaluate(`${K}.setTrees(null)`);
  await sleep(2700);
  await standBy(A, P.trio);
  s = await begin(A, P.trio);
  ok("taken off, a game is for one tree", s.trees === 1, s);
  await key(A, "Escape");
  await gameGone(A, 4000);

  console.log("== the woodpecker (the second rank)");
  await fresh(A);
  await A.evaluate(`${K}.setTrees(null)`);
  const t6 = tree(), t7 = tree();
  await A.evaluate(`${K}.setTree(${t7}, 28)`);
  await standBy(A, t7, false);
  await sleep(2400); await frames(A);
  ok("with none, no stump says how long it has to go", (await A.evaluate(`${R}.times()`)) === 0 && (await A.evaluate(`${R}.looks()[${t7}]`)) === 2);
  await A.evaluate(`(() => { ${K}.setGifts(["famWoodpecker"]); return ${K}.familiarWear("famWoodpecker"); })()`);
  await sleep(700); await frames(A);
  ok("at my heels, a stump's time shows over it", (await A.evaluate(`${R}.times()`)) >= 1, await A.evaluate(`${R}.times()`));
  await A.shot(`${OUT}/felling-7-woodpecker.png`);
  ok("everybody is told which familiar follows me", await until("B's", () => B.evaluate(`${T}.people().some((p) => p.pet === "famWoodpecker")`), 6000, 150).catch(() => false));
  await standBy(A, t6);
  s = await begin(A, t6);
  ok("one branch a tree is forgiven", s.spared === 1 && (await A.evaluate(`document.querySelector("[data-felling-spared]")?.dataset.fellingSpared`)) === "1", s);
  r = await finish(A, 1);
  ok("the first branch that strikes is no miss: two fine timber all the same", r.card?.felled[0].misses === 0 && got(r, "timber") === 2, r);
  await fresh(A);
  await A.evaluate(`${K}.setGifts(["famWoodpecker", "thingBundle", "charmEchoAxe"])`);
  ok("the firewood cord is a gift like the others (its slots are another's to build)", await A.evaluate(`${K}.purse().gifts.had.includes("thingBundle")`));

  console.log("== the powers of an axe at +10, counted by the day");
  await fresh(A, { plus: 10, opts: ["", "", "axOne"] });
  await A.evaluate(`${K}.setTrees(null)`);
  await sleep(2700);
  const t8 = tree();
  await standBy(A, t8);
  await begin(A, t8);
  ok("one stroke: offered on the board, ten left", (await A.evaluate(`document.querySelector("[data-felling-one]")?.dataset.left`)) === "10");
  await frames(A);
  await A.shot(`${OUT}/felling-8-power.png`);
  await clickOn(A, "[data-felling-one]");
  await gameGone(A, 6000);
  await until("the card", () => A.evaluate(`!!${R}.card()`), 5000, 60);
  r = await A.evaluate(`({ card: ${R}.card() })`);
  ok("the tree falls with no game, clean", r.card.one === true && got(r, "log") === 2 && got(r, "timber") === 2 && (await A.evaluate(`${R}.looks()[${t8}]`)) === 0, r);
  const t9 = tree();
  await standBy(A, t9);
  await begin(A, t9);
  ok("and nine are left", (await A.evaluate(`document.querySelector("[data-felling-one]")?.dataset.left`)) === "9");
  await key(A, "Escape");
  await gameGone(A, 4000);
  // twice the wood
  await fresh(A, { plus: 10, opts: ["", "", "axDouble"] });
  await sleep(300);
  await standBy(A, t9);
  await begin(A, t9);
  await clickOn(A, "[data-felling-twice]");
  ok("a double haul: chosen on the board before the first chop", (await A.evaluate(`document.querySelector("[data-felling-twice]")?.getAttribute("aria-pressed")`)) === "true");
  r = await finish(A, 0);
  ok("twice the wood of the tree, and nine left", got(r, "log") === 4 && got(r, "timber") === 4 && (await A.evaluate(`${K}.purse().powers.axDouble.n`)) === 1, r);
  // the quickening root
  await fresh(A, { plus: 10, opts: ["", "", "axRoot"] });
  await sleep(2700);
  const t10 = tree();
  r = await fellOne(A, t10);
  ok("the quickening root: offered on the card of the stump just made, three left", (await A.evaluate(`document.querySelector("[data-trees-root]")?.dataset.left`)) === "3" && (await A.evaluate(`${R}.looks()[${t10}]`)) === 0);
  await clickOn(A, "[data-trees-root]");
  await until("the tree is back", async () => (await A.evaluate(`${R}.looks()[${t10}] ?? 3`)) === 3, 4000, 60).then(() => ok("the tree is grown again at once", true), (e) => ok("the tree is grown again at once", false, e.message));
  ok("for the other tester too, and two are left", (await until("B's", async () => (await B.evaluate(`${R}.looks()[${t10}] ?? 3`)) === 3, 5000, 100).catch(() => false)) && (await A.evaluate(`${K}.purse().powers.axRoot.n`)) === 1);
  // the elder's friend
  await fresh(A, { plus: 10, opts: ["", "", "axElder"] });
  await sleep(2700);
  await standBy(A, elder);
  await begin(A, elder);
  r = await finish(A, 0);
  await frames(A);
  ok("the elder's friend: half as much again from the ancient tree, and its stump says when it is back", got(r, "timber") === 23 && got(r, "resin") === 5 && (await A.evaluate(`typeof ${R}.told().down.find((d) => d.id === ${elder}).until`)) === "number" && (await A.evaluate(`${R}.times()`)) >= 1, r);

  console.log("== the line on the board of lines");
  ok("the trial gives the woodcutters' line", await A.evaluate(`(${K}.lines().given ?? []).includes("felling")`));
  if (await clickOn(A, "[data-town-lines-button]")) {
    await sleep(900);
    ok("it has a card on the lines' board", await A.evaluate(`[...document.querySelectorAll("button, li, h3, span")].some((e) => e.textContent.trim() === "สายตัดไม้")`));
    await A.shot(`${OUT}/felling-9-lines.png`);
    await key(A, "Escape");
    await sleep(300);
  } else ok("it has a card on the lines' board", false, "no lines button");

  console.log("== on a phone's screen");
  C = await browser("FC", { width: 390, height: 844, dpr: 2, mobile: true });
  await enter(C);
  await C.evaluate(`${K}.reset()`);
  await C.evaluate(`${K}.setTrees(null)`);
  await fresh(C);
  const t11 = spare[3];
  await standBy(C, t11);
  await begin(C, t11);
  await frames(C);
  await sleep(500);
  await C.shot(`${OUT}/felling-phone-1-ready.png`);
  const fits = await C.evaluate(`(() => { const b = document.querySelector("[data-town-game]").getBoundingClientRect(); return { top: b.top, bottom: b.bottom, w: b.width, vh: innerHeight, vw: innerWidth }; })()`);
  ok("the whole board is on a phone's screen", fits.top >= 0 && fits.bottom <= fits.vh && fits.w <= fits.vw, fits);
  for (let i = 0; i < 4; i++) { await C.evaluate(`${G}.chop(${G}.safe())`); await sleep(150); }
  await C.shot(`${OUT}/felling-phone-2-chopping.png`);
  await fumble(C);
  await sleep(90);
  await C.shot(`${OUT}/felling-phone-3-struck.png`);
  r = await finish(C, 0);
  await frames(C);
  await C.shot(`${OUT}/felling-phone-4-card.png`);
  ok("felled there too", got(r, "log") === 2, r);
  // the town standing still: the board still plays
  await C.evaluate(`localStorage.setItem("cashTown:motion", "off")`);
  await enter(C);
  await fresh(C);
  await C.evaluate(`${K}.setTrees(null)`);
  await standBy(C, t11);
  await begin(C, t11);
  r = await finish(C, 0);
  ok("with the town's motion switched off it is played all the same", got(r, "log") === 2, r);

  for (const X of [A, B, C]) ok(`${X.label}: no page errors`, X.errors().length === 0, X.errors());
} catch (e) {
  fail++;
  console.log(`  FAIL the check itself: ${e.message}`);
  for (const X of [A, B, C]) if (X) { await X.shot(`${OUT}/felling-failed-${X.label}.png`).catch(() => {}); console.log(`  ${X.label} logs: ${JSON.stringify(X.logs.slice(-5))}`); }
} finally {
  for (const X of [C, A]) { try { await X?.close(); } catch { /* gone already */ } }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
