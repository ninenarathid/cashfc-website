// A forged tool of the old seven (lib/town/forged), in a real browser on the dev test room: with the trial's own
// setter (`setTool`: a tool as if the smith had forged it) a tool's numbers are read where its game is played, at
// several levels; and a tool as it was bought measures as it always did.
//
//   node town-forged.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes forged-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, T, V, cast, enter, faults, hand, held, phase, purse, result, strike, tally, toDeck } from "./fish-gifts.mjs";
import { awaitGame, gameGone, gameState, gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3181", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const FARM = "window.__townFarm", B = "window.__townBugs", C = "window.__townCook";
const near = (a, b, e = 1e-6) => typeof a === "number" && Math.abs(a - b) <= e;
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s && s.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(450); };
/** The tool of a kind in the bag as if it had been forged so: its plus, its options by their milestones, its gems. */
const forge = async (X, item, plus, opts = [], gems = []) => { const did = await X.evaluate(`${T}.setTool(${await slotOf(X, item)}, ${plus}, ${JSON.stringify(opts)}, ${JSON.stringify(gems)})`); await sleep(450); return did; };
const stack = async (X, item) => (await purse(X)).bag.find((s) => s && s.item === item) ?? null;
const stamina = async (X) => (await purse(X)).stamina.left;
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(800); };
const escape = async (X) => { await X.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await X.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" }); await sleep(500); };
/** Begin the farm's deed where I stand and say what its game shows of itself; the game is left up. */
const farmGame = async (X) => { await X.evaluate(`${FARM}.act()`); await awaitGame(X, 6000); await sleep(150); return gameState(X); };
const WELL = [157, 23];

const X = await browser("Forged", { width: 1280, height: 860 });
let code = 1;
try {
  /* ── the rod ── */
  await enter(X, BASE, "G");
  await toDeck(X, [["worm", 30]]);
  await X.evaluate(`${T}.setStamina(100)`);
  const g0 = await X.evaluate(`({ gear: ${F}.gear(), window: ${F}.window() })`);
  ok("a rod as it was bought: the gear it always was, and the strike's moment of 1.6 s", g0.gear.rod === "rod" && g0.gear.band === 1 && g0.gear.pace === 1 && g0.gear.fx === undefined && near(g0.window, 1.6), g0);
  ok("the trial's setter forges it", (await forge(X, "rod", 4)) === true && (await stack(X, "rod")).plus === 4);
  const g4 = await X.evaluate(`({ fx: ${F}.gear().fx, window: ${F}.window() })`);
  ok("at +4 the gear carries a wider stretch, a slower one, and a longer moment to strike in", near(g4.fx?.band, 1.1) && near(g4.fx?.pace, 0.95) && near(g4.window, 1.7), g4);
  await forge(X, "rod", 10);
  const g10 = await X.evaluate(`({ fx: ${F}.gear().fx, window: ${F}.window() })`);
  ok("at +10 more of each", near(g10.fx?.band, 1.5) && near(g10.fx?.pace, 0.7) && near(g10.window, 2.2), g10);
  // a fight with it, and one with the rod as it was bought: the same fish
  await cast(X, ["minnow"]);
  ok("a minnow is hooked with the forged rod", (await strike(X)) === "fight", await phase(X));
  const f10 = await X.evaluate(`(() => { const f = ${F}.fight(); return { band: f.band, pace: f.pace }; })()`);
  await X.shot(`${OUT}/forged-rod.png`);
  await hand(X, "win");
  await result(X);
  await forge(X, "rod", 0);
  await X.evaluate(`${T}.setStamina(100)`);
  await cast(X, ["minnow"]);
  ok("…and with the plain one", (await strike(X)) === "fight", await phase(X));
  const f0 = await X.evaluate(`(() => { const f = ${F}.fight(); return { band: f.band, pace: f.pace }; })()`);
  const spent = 100 - (await stamina(X));
  await hand(X, "win");
  await result(X);
  ok("the forged rod's fight had the stretch half as wide again, moving at seven tenths of the pace", near(f10.band / f0.band, 1.5, 1e-9) && near(f10.pace / f0.pace, 0.7, 1e-9), { f0, f10 });
  ok("a fight with the plain rod costs its stamina", spent > 0, { spent });
  // the keeper's part: the first fights of a meal's hours free with the option that says so
  await forge(X, "rod", 3, ["rdFresh"]);
  await X.evaluate(`${T}.setStamina(100)`);
  await cast(X, ["minnow"]);
  await strike(X);
  const fresh = await purse(X);
  ok("with the angler's option the fight costs nothing, and one is counted", fresh.stamina.left === 100 && fresh.powers?.rdFresh?.n === 1, { left: fresh.stamina.left, powers: fresh.powers });
  await hand(X, "win");
  await result(X);
  // the page's part: a strike too soon forgiven once, then not
  await forge(X, "rod", 3, ["rdBait"]);
  const worms = await held(X, "worm");
  await X.evaluate(`${F}.quick(false)`);
  const c = await cast(X, ["minnow"]);
  await X.evaluate(`${F}.quick(false)`);
  await X.evaluate(`${F}.strike()`);
  await sleep(400);
  ok("a strike too soon with a fast bait: the line is out still", (await phase(X)) === "waiting" && (await X.evaluate(`${F}.forgiven()`)) === 1, { phase: await phase(X), c });
  await X.evaluate(`${F}.strike()`);
  await until("the second one ends the cast", async () => (await phase(X)) !== "waiting" && (await phase(X)) !== "striking", 5000, 50);
  const early = await X.evaluate(`${F}.result()`);
  ok("…and the second is too soon as ever: the bait is gone with it", early?.how === "early" && (await held(X, "worm")) === worms - 1, { early, worms, now: await held(X, "worm") });

  /* ── the can ── */
  await X.evaluate(`(${T}.grant("can", 1), ${T}.grant("hoe", 1), ${T}.grant("bugNet", 1), ${T}.grant("pot", 1), ${T}.grant("tomato", 6), ${T}.grant("chili", 6), ${T}.setWell(60), ${T}.setStamina(100))`);
  await warp(X, ...WELL);
  await until("the farm's own code has come", () => X.evaluate(`!!${FARM}`), 20000);
  await hold(X, "can");
  await until("the can is offered the well", async () => (await X.evaluate(`${FARM}.chore()`)) === "fill", 6000);
  const fill = async () => { const did = await X.evaluate(`${K}.choreDo("well", null)`); await sleep(300); return { did, can: await stack(X, "can"), well: await X.evaluate(`${K}.well()`) }; };
  const c0 = await fill();
  ok("a can as it was bought holds 8 waterings, for two bucketfuls", c0.did.ok && c0.can.water === 8 && c0.well === 58, c0);
  ok("…and full, the well offers it nothing", (await X.evaluate(`${K}.choreAt("well")`)) === null);
  await forge(X, "can", 4);
  ok("at +4 the same can is not full any more", (await X.evaluate(`${K}.choreAt("well")`)) === "fill" && (await stack(X, "can")).water === 8);
  const c4 = await fill();
  ok("…and holds 9", c4.did.ok && c4.can.water === 9 && c4.can.plus === 4, c4);
  await forge(X, "can", 10);
  const c10 = await fill();
  ok("at +10 it holds 16, and what it carries is still on it", c10.did.ok && c10.can.water === 16 && c10.can.plus === 10 && (await X.evaluate(`${K}.choreAt("well")`)) === null, c10);
  await forge(X, "can", 0);
  ok("made plain again it is full at 8 and above", (await X.evaluate(`${K}.choreAt("well")`)) === null);

  /* ── the hoe ── */
  await warp(X, 135, 7);
  await hold(X, "hoe");
  await until("the hoe is offered the weeds", async () => (await X.evaluate(`${FARM}.deed()`)) === "clear", 6000);
  let w = await farmGame(X);
  ok("a hoe as it was bought: the weeding's gusts are 2.4 s apart, two stones among three weeds", w?.kind === "weeding" && near(w.every, 2.4) && w.cells.filter((c) => c?.kind === "stone").length === 2 && w.need === 3, w);
  await escape(X);
  await gameGone(X);
  await forge(X, "hoe", 10);
  w = await farmGame(X);
  ok("at +10 the gusts are slower by three tenths of their pace", w?.kind === "weeding" && near(w.every, 2.4 / 0.7, 1e-9), w);
  await X.shot(`${OUT}/forged-weeding.png`);
  ok("…and the patch is cleared by playing it", (await play(X)) === "weeding");
  await until("the plot is cleared", async () => (await X.evaluate(`${FARM}.seen("135,7").soil`)) === "cleared", 6000);
  let r = await farmGame(X);
  ok("the tilling with it: a stretch half as wide again, a marker at seven tenths of its pace", r?.kind === "timing" && near(r.width, 0.17 * 1.5, 1e-9) && near(r.speed, 0.9 * 0.7, 1e-9) && r.need === 3, r);
  await X.shot(`${OUT}/forged-tilling.png`);
  await escape(X);
  await gameGone(X);
  await forge(X, "hoe", 0);
  r = await farmGame(X);
  ok("with the hoe made plain again the stretch and the marker are as they always were", r?.kind === "timing" && near(r.width, 0.17, 1e-12) && near(r.speed, 0.9, 1e-12) && r.need === 3 && r.spare === undefined, r);
  await escape(X);
  await gameGone(X);
  await forge(X, "hoe", 4, ["hoFirst"], ["fire"]);
  r = await farmGame(X);
  ok("what a hoe carries reaches its board: a hit fewer, a miss forgiven", r?.kind === "timing" && r.need === 2 && r.spare === 1 && near(r.width, 0.17 * 1.1, 1e-9), r);
  await escape(X);
  await gameGone(X);

  /* ── the net ── */
  await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
  await hold(X, "bugNet");
  const n0 = await X.evaluate(`({ ring: ${B}.ringOf("butterflyWhite"), lands: ${B}.swingMs(), again: ${B}.againMs(), reach: ${B}.reach() })`);
  ok("a net as it was bought: a swing that lands after 300 ms and can come again after 650, a reach of 2.4 tiles", n0.lands === 300 && n0.again === 650 && near(n0.reach, 2.4) && n0.ring > 0, n0);
  await forge(X, "bugNet", 4);
  const n4 = await X.evaluate(`({ ring: ${B}.ringOf("butterflyWhite"), lands: ${B}.swingMs() })`);
  await forge(X, "bugNet", 10, ["ntLong"]);
  const n10 = await X.evaluate(`({ ring: ${B}.ringOf("butterflyWhite"), lands: ${B}.swingMs(), again: ${B}.againMs(), reach: ${B}.reach() })`);
  ok("at +4 the ring is a tenth wider and the swing lands at 270 ms", near(n4.ring / n0.ring, 1.1, 1e-9) && n4.lands === 270, { n0, n4 });
  ok("at +10 half as wide again and at 150 ms; and a long handle reaches a tile further", near(n10.ring / n0.ring, 1.5, 1e-9) && n10.lands === 150 && n10.again === 500 && near(n10.reach, 3.4), n10);
  await forge(X, "bugNet", 0);
  const n00 = await X.evaluate(`({ ring: ${B}.ringOf("butterflyWhite"), lands: ${B}.swingMs(), again: ${B}.againMs(), reach: ${B}.reach() })`);
  ok("made plain again it measures as before", JSON.stringify(n00) === JSON.stringify(n0), { n0, n00 });
  // light in the net: an insect near me glints, as none does for a plain net
  const fly = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "town" && h.kind === "blooms"); const h = all[6 % all.length]; ${T}.setBug(h.id, "butterflyWhite"); return { id: h.id, x: h.x, y: h.y }; })()`);
  await warp(X, Math.floor(fly.x) + 1, Math.floor(fly.y) + 1);
  await until("it is out", async () => (await X.evaluate(`${B}.sights().filter((s) => s.place === "town").length`)) >= 1, 10000);
  await sleep(1200);
  ok("with a plain net nothing glints", (await X.evaluate(`${B}.glints()`)) === 0);
  await forge(X, "bugNet", 10, [], ["light"]);
  await until("with light in the net the insect beside me glints", async () => (await X.evaluate(`${B}.glints()`)) >= 1, 5000, 100).catch(() => null);
  ok("with light in the net the insect beside me glints", (await X.evaluate(`${B}.glints()`)) >= 1, await X.evaluate(`({ glints: ${B}.glints(), fx: ${B}.fx() })`));
  await X.shot(`${OUT}/forged-net.png`);
  await forge(X, "bugNet", 0);
  await X.evaluate(`${T}.unsetBugs()`);

  /* ── the pot ── */
  const places = await X.evaluate(`${C}.places()`), stove = places.find((p) => p.kind === "stove").at;
  await warp(X, stove[0], stove[1]);
  await hold(X, "pot");
  const stir = async () => {
    await until("cooking is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook") || (await X.evaluate(`${C}.open()`)), 6000);
    if (!(await X.evaluate(`${C}.open()`))) { await X.evaluate(`${C}.act("cook")`); await sleep(450); }
    await X.evaluate(`${C}.put([["tomato", 1], ["chili", 1]])`);
    await sleep(300);
    await X.evaluate(`${C}.go()`);
    await awaitGame(X, 6000);
    await sleep(150);
    const s = await gameState(X);
    await escape(X);
    await gameGone(X);
    return s;
  };
  const s0 = await stir();
  ok("a pot as it was bought: four stirs for two kinds of thing, the good pace as wide as ever", s0?.kind === "stirring" && s0.need === 4 && near((s0.hi - s0.lo) / 2, 0.36 * Math.SQRT2, 1e-9) && s0.spare === undefined, s0);
  await forge(X, "pot", 4);
  const s4 = await stir();
  ok("at +4 the good pace is a tenth wider", near((s4.hi - s4.lo) / (s0.hi - s0.lo), 1.1, 1e-9), s4);
  await forge(X, "pot", 6, ["ckBrisk", "ckBase"]);
  const s6 = await stir();
  ok("what a pot carries reaches its board: a quarter fewer stirs, a miss that loses nothing", s6.need === 3 && s6.spare === 1, s6);
  await forge(X, "pot", 0);
  const s00 = await stir();
  ok("made plain again it is stirred as before", s00.need === s0.need && near(s00.hi - s00.lo, s0.hi - s0.lo, 1e-12) && s00.spare === undefined, s00);
  await X.shot(`${OUT}/forged-pot.png`);

  ok("no page errors", faults(X).length === 0 && (X.errors ?? []).length === 0, { logs: faults(X).slice(0, 5), errors: X.errors });
  code = done();
} catch (e) {
  console.log(`  FAIL the check stopped: ${e?.message ?? e}`);
  await X.shot(`${OUT}/forged-stopped.png`).catch(() => {});
  done();
} finally { await X.close(); }
process.exit(code);
