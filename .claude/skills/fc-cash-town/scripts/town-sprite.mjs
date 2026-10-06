// The hearth sprite (the kitchen's fourth rank, a familiar; lib/town/gifts), in a real browser on the dev test room,
// at a wide screen and a phone's: nothing of it at the kitchen table until it follows its member; then it waits at
// the stove, and beside "cook it" there is a way to have it cook: only what is in the pot when that is a recipe its
// member has made before, with its cookware in the hand. It leaps into the pot, no game is played, and the pot has
// its full helpings and one more; the pot counts on the kitchen's line as one cooked by hand; three pots to a meal's
// hours, and cooking by hand is there all the while.
//
//   node town-sprite.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes sprite-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", KP = "window.__townKeeper", K = `document.querySelector("[data-town-kitchen]")`;
const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
const tap = async (X, what) => { await X.evaluate(`${K}.querySelector('${what}').click()`); await sleep(240); };
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(800); };
const purse = (X) => X.evaluate(`${T}.purse()`);
/** What the table shows of the sprite: at the stove (idle, cooking, or not there), its button (pots left, whether it can be asked), cooking by hand, the card. */
const seen = (X) => X.evaluate(`(() => { const k = ${K}; if (!k) return null; const at = k.querySelector("[data-kitchen-sprite]"), b = k.querySelector("[data-kitchen-sprite-go]"), go = k.querySelector("[data-kitchen-go]"), came = k.querySelector("[data-kitchen-came]");
  const board = k.getBoundingClientRect(), r = b?.getBoundingClientRect();
  return { at: at ? at.dataset.kitchenSprite : null, go: b ? { left: Number(b.dataset.left), off: b.disabled, fits: r.left >= board.left - 1 && r.right <= board.right + 1 && r.width >= 44 && r.height >= 44 } : null,
    hand: go ? !go.disabled : null, busy: !!k.querySelector("[data-kitchen-busy]"), game: !!document.querySelector("[data-town-game]"),
    came: came ? { kind: came.dataset.kitchenCame, by: !!came.querySelector("[data-kitchen-by-sprite]"), text: came.innerText.replace(/\\s+/g, " ") } : null,
    over: k.scrollWidth > k.clientWidth + 1 }; })()`);
const fill = async (X, things) => { await X.evaluate(`${C}.put(${JSON.stringify(things)})`); await sleep(300); };

async function run(label, size) {
  console.log(`\n── ${label} ──`);
  const X = await browser(`Sprite-${label}`, size);
  try {
    await X.goto(`${BASE}/town?townTest=H&townRoom=check&townHour=12&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
    await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), ${T}.setLine("kitchen", 0))`);
    await sleep(500);
    await X.evaluate(`${T}.resize(20)`);
    // (noon by the trial's clock: lunch's hours, with five of them ahead)
    const to = await X.evaluate(`(() => { const now = ${T}.now(), day = 86400000, bkk = 7 * 3600000; const at = Math.floor((now + bkk) / day) * day - bkk + 12 * 3600000; return ((at > now ? at : at + day) - now) / 3600000; })()`);
    await X.evaluate(`${T}.skipHours(${to})`);
    await X.evaluate(`(() => { for (const [id, n] of [["snakehead", 5], ["tomato", 10], ["chili", 10], ["scallion", 5], ["minnow", 3], ["salt", 1], ["pot", 1], ["pan", 1]]) ${T}.grant(id, n); ${T}.learn("tomYum", true); ${T}.setStamina(100); })()`);
    const places = await X.evaluate(`${C}.places()`);
    await warp(X, places.find((p) => p.kind === "stove").at);
    await until("the kitchen table is offered", async () => (await X.evaluate(`${C}.offers()`)).includes("cook"), 6000);
    await X.evaluate(`${C}.act("cook")`);
    await until("the kitchen table is laid", () => X.evaluate(`${C}.open() && !!${K}`), 5000);
    await sleep(500);
    await tap(X, '[data-kitchen-tool="pot"]');
    await fill(X, TOMYUM);
    let s = await seen(X);
    ok("with no familiar there is nothing of the sprite at the table, and cooking by hand is as it was", s.at === null && s.go === null && s.hand === true, s);

    await X.evaluate(`${T}.setGifts(["famSprite"])`);
    await sleep(300);
    ok("had and resting, still nothing", (await seen(X)).at === null);
    const wore = await X.evaluate(`${KP}.familiarWear("famSprite")`);
    await until("following its member, the sprite is at the stove", async () => (await seen(X)).at === "idle", 4000);
    s = await seen(X);
    ok("it follows (the room is told so), waits at the stove, and has three pots in it for these hours", wore.ok === true && (await X.evaluate(`window.__cashTown.me().pet`)) === "famSprite" && s.at === "idle" && s.go.left === 3, s);
    ok("what is in the pot is a recipe its member has made, with its pot in the hand: the sprite may cook it, beside cooking by hand", s.go.off === false && s.hand === true && s.go.fits === true && s.over === false, s);
    await X.shot(`${OUT}/sprite-waits-${label}.png`);
    // not its to cook: a part of the recipe, a recipe never made, the wrong cookware
    await fill(X, TOMYUM.slice(0, 2));
    ok("a part of a recipe is not the sprite's to cook", (await seen(X)).go.off === true && (await seen(X)).hand === true);
    await fill(X, [["minnow", 3], ["salt", 1]]);
    ok("nor a recipe its member has never made", (await seen(X)).go.off === true);
    const guess = await X.evaluate(`${KP}.cookDo([["minnow", 3], ["salt", 1]], ["pan"], [], { hits: 0, misses: 0, secs: 0, need: 0, sprite: true }, "H")`);
    ok("…and the keeper itself refuses it, with nothing lost", guess.ok === false && guess.why === "unmade" && (await purse(X)).bag.some((b) => b?.item === "minnow" && b.n === 3), guess);
    await fill(X, TOMYUM);
    await tap(X, '[data-kitchen-tool="hand"]');
    ok("nor a pot's dish with no pot in the hand", (await seen(X)).go.off === true);
    await tap(X, '[data-kitchen-tool="pot"]');

    // ── the sprite cooks ──
    const before = await purse(X), pts = await X.evaluate(`${T}.lines().lines.kitchen.points`);
    await tap(X, "[data-kitchen-sprite-go]");
    s = await seen(X);
    ok("asked, it leaps into the pot at once: no game is laid, and nothing else at the table is touched meanwhile", s.at === "cooking" && s.busy === true && s.game === false, s);
    await sleep(380);
    await X.shot(`${OUT}/sprite-cooks-${label}.png`);
    await until("the pot is done", async () => (await seen(X))?.came !== null, 6000);
    s = await seen(X);
    let p = await purse(X);
    const pot = p.bag.find((b) => b?.item === "potFull");
    ok("no game was played, and the pot has its four helpings and one more", s.game === false && s.came.kind === "found" && s.came.by === true && /5 ที่/.test(s.came.text) && pot?.of.dish === "tomYum" && pot.of.left === 5, { came: s.came, pot });
    ok("the things left the bag and the stamina was paid, as by hand", p.stamina.left === before.stamina.left - 4 && p.bag.find((b) => b?.item === "snakehead").n === 4, { stamina: p.stamina });
    ok("one of the three pots of these hours is used", p.gifts.used.famSprite.n === 1, p.gifts.used);
    const play = await X.evaluate(`${T}.plays().at(-1)`), now = await X.evaluate(`${T}.lines().lines.kitchen.points`);
    ok("the pot counts on the kitchen's line as one cooked by hand: its recipe's four, and ten for the first", play.game === "cooking" && play.won === true && play.what === "tomYum" && now - pts === 14, { play, pts, now });
    await X.shot(`${OUT}/sprite-done-${label}.png`);

    // two more, and then no more in these hours; by hand all the while
    for (let i = 2; i <= 3; i++) {
      await tap(X, "[data-kitchen-again]");
      await fill(X, TOMYUM);
      await tap(X, "[data-kitchen-sprite-go]");
      await until(`pot ${i} is done`, async () => (await seen(X))?.came !== null, 6000);
    }
    await tap(X, "[data-kitchen-again]");
    await fill(X, TOMYUM);
    s = await seen(X);
    p = await purse(X);
    ok("three pots in a meal's hours, and the fourth is the hand's to cook", s.go.left === 0 && s.go.off === true && s.hand === true && p.bag.filter((b) => b?.item === "potFull").every((b) => b.of.left === 5) && p.bag.filter((b) => b?.item === "potFull").length === 3, { s, used: p.gifts.used });
    const fourth = await X.evaluate(`${KP}.cookDo(${JSON.stringify(TOMYUM)}, ["pot"], [], { hits: 0, misses: 0, secs: 0, need: 0, sprite: true }, "H")`);
    ok("…the keeper itself refuses a fourth, with nothing lost", fourth.ok === false && fourth.why === "spent" && (await purse(X)).bag.find((b) => b?.item === "snakehead").n === 2, fourth);
    await X.evaluate(`${T}.skipHours(5.5)`);
    await sleep(500);
    ok("in the next meal's hours it has three pots in it again", (await seen(X)).go.left === 3 && (await seen(X)).go.off === false, (await seen(X)).go);
    await X.evaluate(`${KP}.familiarWear(null)`);
    await sleep(500);
    ok("sent to rest, it is gone from the table", (await seen(X)).at === null && (await seen(X)).go === null);
    ok("no page errors", (X.logs ?? []).filter((l) => !/favicon|Download the React DevTools/.test(l)).length === 0, X.logs);
  } finally { await X.close(); }
}

await run("wide", { width: 1280, height: 860 });
await run("phone", { width: 360, height: 780, mobile: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
