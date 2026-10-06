// Stardust bait (the deck's sixth rank, lib/town/gifts' thingBait), in a real browser on the dev test room: without
// it nothing of one is offered; with it it is a bait of its own among the baits, with how many are left today; chosen,
// the line goes out with it and nothing leaves the bag, the float is lit by it, and what is on its way is rare or
// better every time; it is struck and fought as any fish and can be lost; three a day; with nothing else to put on a
// hook it is the bait in hand; and in the shallows, where nothing rare lives, the water lies still and it is not spent.
//
//   node town-stardust.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes stardust-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, until } from "./cdp.mjs";
import { F, K, PANEL, T, V, cast, enter, faults, hand, handOff, held, phase, purse, ready, result, strike, tally, text, toDeck, walk, press } from "./fish-gifts.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
const { ok, done } = tally();
const RARE = ["featherback", "goby", "wels", "gar", "moonFish", "koi", "arapaima"];
const starButton = (X) => X.evaluate(`(() => { const b = ${PANEL}?.querySelector("[data-fish-star]"); return b ? { left: Number(b.dataset.fishStar), on: b.getAttribute("aria-checked") === "true", disabled: b.disabled, text: b.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
const used = async (X) => (await purse(X)).gifts.used?.thingBait?.n ?? 0;
const bag = async (X) => JSON.stringify((await purse(X)).bag);
/** So many stardust baits dropped straight through the keeper and taken up again, the day's count put back each time: what each brought. */
const many = (X, n) => X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < ${n}; i++) {
  const p = ${T}.purse(); ${T}.fished({ ...p, gifts: { ...p.gifts, used: {} } });
  const c = await ${K}.cast("worm", place, false, true, "star"); if (!c.ok) return c; all.push(c.coming); await ${K}.land("left", null); } return all; })()`);

const X = await browser("Stardust", { width: 1280, height: 860 });
let code = 1;
try {
  await enter(X, BASE, "Z");
  await toDeck(X, [["worm", 5]]);
  await ready(X);

  // ── without it, and with it ──
  ok("with no stardust bait only the baits of the bag are offered", (await starButton(X)) === null && /ไส้เดือน/.test(await text(X)));
  await X.evaluate(`${T}.setGifts(["thingBait", "charmFloat"])`);
  await X.evaluate(`${K}.charmsWear(["charmFloat"])`);
  await until("the stardust bait is offered", async () => (await starButton(X)) !== null, 4000, 100);
  let b = await starButton(X);
  ok("with it, it is a bait of its own among the baits: three for the day, and not the one in hand until it is chosen", b.left === 3 && b.on === false && /เหยื่อดาวตก/.test(b.text) && /×3/.test(b.text), b);
  await X.evaluate(`${PANEL}.querySelector("[data-fish-star]").click()`);
  await until("it is the bait in hand", async () => (await starButton(X))?.on === true, 3000, 60);
  await X.shot(`${OUT}/stardust-ready.png`);

  // ── dropped ──
  const before = await bag(X);
  let c = await cast(X);
  ok("the line goes out with it: nothing leaves the bag, one of the day's three is counted", (await bag(X)) === before && (await used(X)) === 1 && (await held(X, "worm")) === 5, { used: await used(X) });
  ok("what is on its way is rare or better (the whispering float tells it), and the float is lit by the bait", RARE.includes(c.coming) && (await X.evaluate(`!!${PANEL}.querySelector('[data-fx="star"]')`)), c);
  await sleep(400);
  await X.shot(`${OUT}/stardust-water.png`);
  await X.evaluate(`${T}.setStamina(100)`);
  let at = await strike(X);
  ok("it is struck and fought as any fish, its fight paid for", at === "fight" && (await purse(X)).stamina.left < 100, { at, stamina: (await purse(X)).stamina.left });
  await hand(X, "slack");
  let r = await result(X);
  ok("…and can be lost: the bait is spent, and nothing comes back to the bag", r.how === "slipped" && !r.back && (await bag(X)) === before && (await used(X)) === 1, r);
  await ready(X);
  b = await starButton(X);
  ok("two are left for the day, and it is still the bait in hand", b.left === 2 && b.on === true, b);

  // ── what takes it ──
  const took = await many(X, 40);
  ok("forty of them: every one rare or better, and a legend among them now and then", Array.isArray(took) && took.every((w) => RARE.includes(w)) && took.some((w) => w === "koi" || w === "arapaima") && new Set(took).size >= 4, Array.isArray(took) ? [...new Set(took)].join(" ") : took);

  // ── three a day ──
  await X.evaluate(`(() => { const p = ${T}.purse(); ${T}.fished({ ...p, gifts: { ...p.gifts, used: {} } }); })()`);
  const three = await X.evaluate(`(async () => { const place = ${V}.fishAt(), all = []; for (let i = 0; i < 4; i++) { const c = await ${K}.cast("worm", place, false, true, "star"); all.push(c.ok ? "ok" : c.why); if (c.ok) await ${K}.land("left", null); } return all; })()`);
  await sleep(300);
  b = await starButton(X);
  ok("three a day: the fourth is refused, and the bait is shown spent, the worms in hand again", three.join() === "ok,ok,ok,spent" && b.left === 0 && b.disabled === true && b.on === false && /×0/.test(b.text), { three, b });
  await X.shot(`${OUT}/stardust-spent.png`);

  // ── with nothing else to put on a hook ──
  await X.evaluate(`(${T}.empty(), ${T}.grant("rod", 1), ${T}.hold(0))`);
  await X.evaluate(`(() => { const p = ${T}.purse(); ${T}.fished({ ...p, gifts: { ...p.gifts, used: {} } }); })()`);
  await sleep(700);
  // (the rod left the hand with the bag: the panel is opened again)
  if (!(await X.evaluate(`!!${PANEL}`))) {
    await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
    await press(X, "ตกปลาตรงนี้");
    await until("the rod's panel opens", () => X.evaluate(`!!${PANEL}`), 5000);
  }
  await ready(X);
  b = await starButton(X);
  const words = await text(X);
  ok("with no bait in the bag at all, the stardust is the bait in hand, and the line can be dropped", !!b && b.on === true && b.left === 3 && /หย่อนเบ็ด/.test(words) && !/ไม่มีอะไรที่เกี่ยวเบ็ดได้/.test(words), { b, words });
  c = await cast(X, ["goby"]);
  at = await strike(X);
  await hand(X, "win");
  r = await result(X, 120000);
  ok("…dropped, struck and fought: a fish landed is in the bag", at === "fight" && ["landed", "snapped", "slipped"].includes(r.how) && (r.how !== "landed" || (await held(X, "goby")) === 1), r);
  await handOff(X);

  // ── in the shallows ──
  // (off the deck, on the town's bank: a tile whose line lands in the shallows)
  await ready(X);
  await press(X, "ปิด", PANEL);
  await sleep(300);
  await walk(X, 24, 47, 40000);
  const bank = await until("the bank is a place to fish from", () => X.evaluate(`${V}.fishAt()`), 6000).catch((e) => e.message);
  await until("the way to begin shows", () => X.evaluate(`[...document.querySelectorAll("button")].some((b) => b.innerText.includes("ตกปลาตรงนี้"))`), 8000);
  await press(X, "ตกปลาตรงนี้");
  await until("the rod's panel opens", () => X.evaluate(`!!${PANEL}`), 5000);
  await ready(X);
  const left = (await starButton(X)).left;
  await press(X, "หย่อนเบ็ด", PANEL);
  await until("the water lies still", async () => /น้ำนิ่งสนิท/.test(await text(X)), 4000, 60).catch(() => {});
  ok("in the shallows nothing rare lives: the water lies still, the line is not dropped, and the bait is not spent", bank?.deep === false && /น้ำนิ่งสนิท/.test(await text(X)) && (await phase(X)) === "ready" && (await starButton(X)).left === left,
    { bank, left, now: (await starButton(X)).left, text: await text(X) });
  await X.shot(`${OUT}/stardust-calm.png`);

  // ── at a phone's width ──
  await X.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 740, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await X.evaluate(`${T}.grant("worm", 5)`);
  await sleep(300);
  const fits = await X.evaluate(`(() => { const p = ${PANEL}.getBoundingClientRect(), s = ${PANEL}.querySelector("[data-fish-star]").getBoundingClientRect(); return p.left >= 0 && p.right <= window.innerWidth + 0.5 && s.left >= p.left && s.right <= p.right && document.documentElement.scrollWidth <= window.innerWidth; })()`);
  ok("at a phone's width the stardust bait fits among the baits", fits);
  await X.shot(`${OUT}/stardust-phone.png`);
  ok("no page errors", faults(X).length === 0, faults(X));
  void walk;
  code = done();
} finally { await X.close(); }
process.exit(code);
