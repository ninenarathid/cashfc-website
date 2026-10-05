// Cash Town's third round for those who carry water, tried in a real browser on the dev test room (the trial kept in
// the browser, `next dev` only), by two testers in two tabs of one browser, who share its farm and its cooking yard:
//
// - a hot afternoon (noon to four under a clear sky): the plots know it, a watering does as much again, and at five
//   it does not;
// - a bucket poured over a bed: offered with a bucket of water in the hand on a plot of a bed with thirsty plants,
//   it waters the nearest eight, with plain water, for three stamina; the well's book counts the bucketful and
//   whose plants it reached; with no stamina left it is poured like any water, a short game;
// - the cooking yard's water jar: poured into by the tub; a pot cooked while it has water has a helping more and
//   the jar a bucketful less; the carrier's book says whose pot their water went into.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-carrying.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm", W = "window.__townWell", C = "window.__townCook";
const MIN = 60_000, HOUR = 60 * MIN;
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const stamina = (X) => X.evaluate(`(() => { const p = ${T}.purse(); return p.stamina.day < 0 ? 100 : p.stamina.left; })()`);
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(750); };
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const grant = (X, list) => X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(list)}) ${T}.grant(id, n); })()`);
const plots = (X) => X.evaluate(`${F}.plots()`);
const hourOf = (ms) => (((ms + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR;
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=13&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}
/** Do the chore on offer by the water (draw, pour, fill), playing its game if tired hands make it one. */
async function chore(X, what) {
  await until(`${what} is offered`, async () => (await X.evaluate(`${F}.chore()`)) === what, 6000);
  await X.evaluate(`${F}.act()`);
  await sleep(400);
  if (await gameUp(X)) { await play(X); await sleep(600); }
}
/** Put the trial's clock at an hour of Bangkok's day (a little past it). */
async function clockTo(X, hour) {
  const now = await X.evaluate(`${T}.now()`);
  await X.evaluate(`${T}.skipHours(${((hour + 0.2 - hourOf(now)) % 24 + 24) % 24})`);
  await sleep(400);
}

const RIVER = [17, 42], WELL = [157, 23], OTHER = "somebody-else";
const X = await browser("Carrying", { width: 1280, height: 860 });
try {
  await enter(X, "W");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`${T}.resize(10)`);
  await clockTo(X, 13);
  const me = await X.evaluate(`${T}.id`), t0 = await X.evaluate(`${T}.now()`);
  // seven plants of somebody else's along a row of a bed and three under them, and one of mine beside those
  const plant = (by) => ({ soil: "tilled", plant: { by, crop: "pumpkin", sown: t0 - HOUR, boost: 0, watered: 0, fed: 0, guard: t0 + 4 * 86400000, cured: 0, picked: 0, pickedAt: 0 } });
  const THEIRS = ["132,5", "133,5", "134,5", "135,5", "136,5", "137,5", "138,5", "132,6", "133,6", "134,6"], MINE = "135,6";
  for (const key of THEIRS) await X.evaluate(`${T}.setPlot(${JSON.stringify(key)}, ${JSON.stringify(plant(OTHER))})`);
  await X.evaluate(`${T}.setPlot(${JSON.stringify(MINE)}, ${JSON.stringify(plant(me))})`);
  await grant(X, [["bucket", 1], ["can", 1]]);
  await warp(X, 132, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F} && typeof ${F}.hot === "function"`), 20000);

  /* ── a hot afternoon ── */
  ok("at one in the afternoon under a clear sky it is hot", Math.floor(hourOf(await X.evaluate(`${T}.now()`))) === 13 && (await X.evaluate(`${F}.hot()`)) === true);
  ok("with nothing in the hand, nothing is offered on somebody else's growing plant", (await X.evaluate(`${F}.offer()`)) === null);
  await sleep(600);
  await X.shot(`${OUT}/carrying-hot.png`);

  /* ── a bucket poured over a bed ── */
  await hold(X, "bucket");
  ok("an empty bucket is offered nothing on a plot", (await X.evaluate(`${F}.offer()`)) === null && (await X.evaluate(`${F}.flood()`)).length === 0);
  await warp(X, ...RIVER);
  await chore(X, "draw");
  ok("a bucket is drawn at the river", (await waterOf(X, "bucket")) === 1 && (await stamina(X)) === 98, { water: await waterOf(X, "bucket"), stamina: await stamina(X) });
  await warp(X, 132, 5);
  await until("the pour is offered", async () => (await X.evaluate(`${F}.offer()`)) === "ditch", 6000);
  const reach = await X.evaluate(`${F}.flood()`);
  ok("on a plot of a bed with thirsty plants, the bucket is offered to be poured over the bed: the nearest eight",
    JSON.stringify(reach) === JSON.stringify(["132,5", "133,5", "132,6", "133,6", "134,5", "134,6", "135,5", "135,6"]) && /เทน้ำรดทั้งแปลง/.test(await textOf(X, '[data-farm-offer="ditch"]')), reach);
  await X.shot(`${OUT}/carrying-offer.png`);
  await X.evaluate(`${F}.act()`);
  await until("it is poured", async () => (await waterOf(X, "bucket")) === 0, 5000);
  await sleep(300);
  let farm = await plots(X);
  const now1 = await X.evaluate(`${T}.now()`);
  ok("eight plants are watered at once, mine among them, and the three furthest are not",
    reach.every((k) => farm[k].plant.watered > t0 && now1 - farm[k].plant.watered < 5000) && ["136,5", "137,5", "138,5"].every((k) => farm[k].plant.watered === 0));
  ok("in the heat the plain water of a bucket does as much again: an hour of growth to a plant", reach.every((k) => farm[k].plant.boost === 60 * MIN), reach.map((k) => farm[k].plant.boost / MIN));
  ok("it took the bucketful and three stamina, and says how many it watered", (await stamina(X)) === 95 && /รดไป 8 ต้น/.test((await X.evaluate(`${F}.note()`)) ?? ""), { stamina: await stamina(X), note: await X.evaluate(`${F}.note()`) });
  ok("the bucket empty, nothing more is offered", (await X.evaluate(`${F}.offer()`)) === null);
  await X.shot(`${OUT}/carrying-poured.png`);

  // the well's book
  await warp(X, ...WELL);
  await until("the book is offered", () => there(X, "[data-well-chip]"), 8000);
  await X.evaluate(`${W}.open()`);
  await until("the book opens", () => there(X, "[data-well-today]"), 5000);
  let book = await X.evaluate(`${W}.book()`);
  ok("the book counts it: a bucketful carried; my water on seven of somebody else's plants, by my own hand; my own plant is nobody's help",
    book.buckets === 1 && JSON.stringify(book.today) === JSON.stringify({ buckets: 1, waterings: 7, plants: 7, people: 1, watered: 7, helped: 1 }) && /หาบน้ำมา 1 ถัง/.test(await textOf(X, "[data-well-today]")), book.today);
  ok("…and I am among today's carriers", book.carriers.length === 1 && book.carriers[0].id === me && book.carriers[0].buckets === 1, book.carriers);
  await X.evaluate(`${W}.close()`);

  // a can in the heat
  await X.evaluate(`${T}.setWell(3)`);
  await hold(X, "can");
  await chore(X, "fill");
  await warp(X, 136, 5);
  await until("watering is offered", async () => (await X.evaluate(`${F}.deed()`)) === "water", 6000);
  await X.evaluate(`${F}.act()`);
  await until("it is watered", async () => (await plots(X))["136,5"].plant.watered > 0, 5000);
  ok("a can's watering does as much again in the heat too", (await plots(X))["136,5"].plant.boost === 60 * MIN, (await plots(X))["136,5"].plant.boost / MIN);

  /* ── the cooking yard's water jar ── */
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C} && typeof ${C}.wash === "function"`), 20000);
  const wash = await X.evaluate(`${C}.wash()`), stove = (await X.evaluate(`${C}.places()`)).find((p) => p.kind === "stove").at;
  await hold(X, "bucket");
  await warp(X, ...wash[0]);
  ok("by the yard's jar with an empty bucket, nothing is offered; the jar is empty", !(await X.evaluate(`${C}.offers()`)).includes("water") && (await X.evaluate(`${C}.jar()`)) === 0);
  await warp(X, ...RIVER);
  await chore(X, "draw");
  await warp(X, ...wash[0]);
  await until("pouring into the jar is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("water"), 6000);
  const before = await stamina(X);
  await X.evaluate(`${C}.act("water")`);
  await until("the jar has a bucketful", async () => (await X.evaluate(`${C}.jar()`)) === 1, 5000);
  ok("a bucket is poured into the yard's jar: a bucketful in it, the bucket empty, one stamina", (await waterOf(X, "bucket")) === 0 && before - (await stamina(X)) === 1 && /โอ่งน้ำ 1\/10/.test((await X.evaluate(`${C}.note()`)) ?? ""), await X.evaluate(`${C}.note()`));
  await sleep(500);
  await X.shot(`${OUT}/carrying-jar.png`);

  // the other cooks a soup while the jar has water, and another when it has none
  const Y = await X.tab("CarryingB");
  await enter(Y, "V");
  await Y.evaluate(`${T}.resize(10)`);
  await grant(Y, [["pot", 1], ["pumpkin", 2], ["scallion", 2], ["salt", 2]]);
  const other = await Y.evaluate(`${T}.id`);
  await warp(Y, ...stove);
  await until("the kitchen's own code has come to the other", () => Y.evaluate(`!!${C}`), 20000);
  const soup = async () => {
    await hold(Y, "pot");
    await until("cooking is offered", async () => (await Y.evaluate(`${C}.offers()`)).includes("cook"), 6000);
    await Y.evaluate(`${C}.act("cook")`);
    await until("the cooking panel opens", () => Y.evaluate(`${C}.open()`), 4000);
    await Y.evaluate(`${C}.put([["pumpkin", 1], ["scallion", 1], ["salt", 1]])`);
    await sleep(300);
    await Y.evaluate(`${C}.go()`);
    await sleep(350);
    await play(Y);
    await sleep(800);
    return { note: await Y.evaluate(`${C}.note()`), pots: (await purse(Y)).bag.filter((s) => s?.item === "potFull").map((s) => s.of.left) };
  };
  const first = await soup();
  ok("a soup cooked while the jar has water comes with a helping more: six, where the recipe serves five", first.pots.length === 1 && first.pots[0] === 6 && /6 ที่/.test(first.note ?? ""), first);
  ok("…and the jar is a bucketful the less", (await Y.evaluate(`${C}.jar()`)) === 0 && (await X.evaluate(`${C}.jar()`)) === 0);
  await Y.shot(`${OUT}/carrying-soup.png`);
  const second = await soup();
  ok("with the jar empty a soup is cooked as it always was: five", second.pots.length === 2 && second.pots.includes(5) && /5 ที่/.test(second.note ?? ""), second);
  await warp(X, ...WELL);
  await until("the book is offered again", () => there(X, "[data-well-chip]"), 8000);
  await X.evaluate(`${W}.open()`);
  await until("the book opens again", () => there(X, "[data-well-today]"), 5000);
  book = await X.evaluate(`${W}.book()`);
  ok("my book says whose pot my water went into: one pot, of one cook; and two bucketfuls carried", book.today.pots === 1 && book.today.cooks === 1 && book.today.buckets === 2 && book.buckets === 2 && /น้ำของฉันอยู่ในอาหาร 1 หม้อ/.test(await textOf(X, "[data-well-today]")), book.today);
  await X.shot(`${OUT}/carrying-book.png`);
  await X.evaluate(`${W}.close()`);
  void other;

  /* ── after four it is not hot ── */
  await clockTo(X, 17);
  await sleep(5500);
  ok("at five it is hot no longer", (await X.evaluate(`${F}.hot()`)) === false);
  await hold(X, "bucket");
  await warp(X, ...RIVER);
  await chore(X, "draw");
  await warp(X, 138, 5);
  await until("the pour is offered again (the plants watered at one are dry by five)", async () => (await X.evaluate(`${F}.offer()`)) === "ditch", 8000);
  await X.evaluate(`${F}.act()`);
  await until("it is poured again", async () => (await waterOf(X, "bucket")) === 0, 5000);
  await sleep(300);
  farm = await plots(X);
  ok("out of the heat a bucket's water adds half an hour, as a plain can's does", farm["138,5"].plant.boost === 30 * MIN && farm["137,5"].plant.boost === 30 * MIN && farm["136,5"].plant.boost === 90 * MIN, ["138,5", "137,5", "136,5"].map((k) => farm[k].plant.boost / MIN));

  /* ── tired hands ── */
  await X.evaluate(`${T}.spend(500)`);
  await sleep(300);
  ok("with no stamina left", (await stamina(X)) === 0);
  await warp(X, ...RIVER);
  await chore(X, "draw");
  ok("…a bucket is still drawn, the hard way", (await waterOf(X, "bucket")) === 1);
  await clockTo(X, 19);
  await sleep(5500);
  await warp(X, 132, 5);
  await until("the pour is offered to tired hands", async () => (await X.evaluate(`${F}.offer()`)) === "ditch", 8000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
  ok("pouring it over the bed is a pour like any water: the short game of tired hands", (await gameUp(X)) === "pouring" && (await waterOf(X, "bucket")) === 1, await gameUp(X));
  await X.shot(`${OUT}/carrying-tired.png`);
  await play(X);
  await until("played, it is poured", async () => (await waterOf(X, "bucket")) === 0, 6000);
  ok("…and played, it waters the bed", (await plots(X))["132,5"].plant.boost === 90 * MIN, (await plots(X))["132,5"].plant.boost / MIN);
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/carrying-stopped.png`).catch(() => {});
} finally {
  await X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
