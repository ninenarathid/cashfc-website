// The rain frog (the well's fifth rank, lib/town/well-gifts, components/town/TownFrog and frog-art), tried in a real
// browser on the dev test room (the trial kept in the browser, `next dev` only), under a sky laid out ahead
// (`&townSkies=`, and the frog's own dev handle), by one tester, a second who looks on, and a third at a phone's width:
//
// - without the frog nothing says what the sky is or will be, and an empty bucket stands in the rain as it is;
// - the well's fifth rank is taken by the bucketfuls poured; the frog follows, and everybody's page is told so;
// - under the clock its member sees this quarter hour's sky and the three to come, each with its time, and in how
//   many minutes the rain comes; in the quarter hour before rain the frog croaks;
// - under rain the empty bucket in its member's hand fills by itself in twelve seconds a bucketful: no stamina, no
//   walk; the water is the rain's; poured into the well it fills again where its member stands;
// - only in rain, only while the frog follows, only an empty bucket in the hand;
// - at a phone's width the sky fits under the clock; with the town kept still nothing of it moves.
//
// Prints PASS/FAIL lines and writes frog-*.png to <outdir>.
//
//   node town-frog.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", G = "window.__townFrog", V = "window.__townView", F = "window.__townFarm", S = "window.__cashTown";
const purse = (X) => X.evaluate(`${T}.purse()`);
const stamina = (X) => X.evaluate(`(() => { const p = ${K}.purse(), now = ${K}.now(); const day = Math.floor((now + 2 * 3600000) / 86400000); return p.stamina.day === day ? p.stamina.left : 100; })()`);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText?.replace(/\\s+/g, " ").trim() ?? null`);
const boxOf = (X, sel) => X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)})?.getBoundingClientRect(); return b ? { x: b.left, y: b.top, w: b.width, h: b.height } : null; })()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(900); };
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const skies = (X) => X.evaluate(`[...document.querySelectorAll("[data-frog-ahead] > li")].map((li) => [li.dataset.frogSky, li.querySelector("span.font-data")?.innerText.trim()])`);
/** The sky laid out from this quarter hour on, and the page given a moment to show it. */
const force = async (X, words) => { await X.evaluate(`${G}.force(${JSON.stringify(words)})`); await sleep(300); };
async function enter(X, letter, sky) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=wellgifts&townHour=12&townSkies=${sky}`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${K}`), 30000);
}
const WELL = [157, 23];

const X = await browser("Frog", { width: 1280, height: 860 });
try {
  await enter(X, "W", "clear,rain,rain,clear");
  await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false), ${T}.setCarried(0))`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("bucket", 1), ${T}.grant("waterYokeGreat", 1), ${T}.setStamina(60))`);
  const a = await X.evaluate(`${T}.id`);
  await warp(X, 30, 40);
  const Y = await X.window("FrogB");
  await enter(Y, "V", "clear,rain,rain,clear");
  await Y.evaluate(`${T}.setGifts(false)`);
  await warp(Y, 32, 41);
  await until("the onlooker sees the carrier", () => Y.evaluate(`!!${V}.at(${JSON.stringify(a)})`), 30000, 100);

  // ── without the frog ──
  ok("without the frog nothing says what the sky is or will be", !(await there(X, "[data-town-frog]")) && !(await there(X, "[data-well-gifts]")), await textOf(X, "[data-town-frog]"));
  let did = await X.evaluate(`${K}.rainFill()`);
  ok("…and whoever keeps the game fills no bucket for somebody with no frog", did.ok === false && did.why === "none", did);

  // ── the fifth rank, and the frog at its member's heels ──
  await X.evaluate(`${T}.setCarried(2999)`);
  did = await X.evaluate(`${K}.giftTake("well", 5)`);
  ok("with 2,999 bucketfuls poured the well's fifth rank is not reached", did.ok === false && did.why === "rank", did);
  await X.evaluate(`${T}.setCarried(3000)`);
  did = await X.evaluate(`${K}.giftTake("well", 5)`);
  ok("with 3,000 its gift is taken: the rain frog", did.ok === true && did.gift === "famFrog", did);
  did = await X.evaluate(`${K}.familiarWear("famFrog")`);
  await until("the frog's own code has come", () => X.evaluate(`!!${G}`), 60000);
  await until("the room is told", async () => (await Y.evaluate(`${S}.people().find((p) => p.id === ${JSON.stringify(a)})?.pet`)) === "famFrog", 15000, 100).catch(() => {});
  ok("called, it follows its member, and everybody's page is told so", did.ok === true && (await purse(X)).gifts.familiar === "famFrog" && (await Y.evaluate(`${S}.people().find((p) => p.id === ${JSON.stringify(a)})?.pet`)) === "famFrog", did);

  // ── the sky ahead ──
  await force(X, ["clear", "rain", "rain", "clear"]);
  let shown = await skies(X);
  ok("under the clock its member sees this quarter hour's sky and the three to come", shown.length === 4 && shown.map((s) => s[0]).join() === "clear,rain,rain,clear", shown);
  const times = shown.slice(1).map((s) => s[1]);
  ok("…each with the time it begins: quarter hours, one after the other", shown[0][1] === "ตอนนี้" && times.every((t) => /^\d\d:(00|15|30|45)$/.test(t))
     && times.every((t, i) => !i || ((Number(t.slice(0, 2)) * 60 + Number(t.slice(3))) - (Number(times[i - 1].slice(0, 2)) * 60 + Number(times[i - 1].slice(3))) + 1440) % 1440 === 15), shown);
  const coming = await X.evaluate(`${G}.coming()`);
  ok("…and in how many minutes the rain comes", typeof coming?.rain === "number" && coming.rain >= 1 && coming.rain <= 15 && new RegExp(`ฝนมาในอีก ${coming.rain} นาที`).test((await textOf(X, "[data-frog-coming]")) ?? ""), [coming, await textOf(X, "[data-frog-coming]")]);
  ok("in the quarter hour before rain the frog croaks", (await X.evaluate(`${G}.croaks()`)) === true && (await X.evaluate(`document.querySelector("[data-town-frog]").hasAttribute("data-croaks")`)), await X.evaluate(`${G}.croaks()`));
  ok("the onlooker, who has no frog, is shown nothing of the sky", !(await there(Y, "[data-town-frog]")), await textOf(Y, "[data-town-frog]"));
  await sleep(700);
  await Promise.all([X.shot(`${OUT}/frog-sky.png`), Y.shot(`${OUT}/frog-seen.png`)]);
  await force(X, ["clear", "cloudy", "fog", "clear"]);
  ok("with dry weather ahead it says nothing is coming, and does not croak", (await X.evaluate(`${G}.coming()`)) === null && (await X.evaluate(`${G}.croaks()`)) === false && !(await there(X, "[data-frog-coming]")) && (await skies(X)).map((s) => s[0]).join() === "clear,cloudy,fog,clear", await skies(X));
  await force(X, ["clear", "clear", "storm", "rain"]);
  const far = await X.evaluate(`${G}.coming()`);
  ok("rain two quarter hours off is told, and is no croak yet", far?.rain >= 16 && far.rain <= 30 && (await X.evaluate(`${G}.croaks()`)) === false, far);

  // ── under a dry sky a bucket is as it is ──
  await hold(X, "bucket");
  await sleep(500);
  ok("under a dry sky the empty bucket in its member's hand gathers nothing", (await X.evaluate(`${G}.filling()`)) === null && !(await there(X, "[data-frog-fill]")), await X.evaluate(`${G}.filling()`));
  did = await X.evaluate(`${K}.rainFill()`);
  ok("…and whoever keeps the game says it is dry", did.ok === false && did.why === "dry", did);

  // ── under rain it fills by itself ──
  // (the onlooker's own sky is laid out as its page is loaded: under rain from here on)
  await enter(Y, "V", "rain,rain,clear,clear");
  await warp(Y, 32, 41);
  await until("the onlooker sees the carrier", () => Y.evaluate(`!!${V}.at(${JSON.stringify(a)})`), 30000, 100);
  const before = await stamina(X);
  await force(X, ["rain", "rain", "clear", "clear"]);
  const began = Date.now();
  await until("the bucket gathers the rain", () => there(X, "[data-frog-fill]"), 5000, 50);
  const f0 = await X.evaluate(`${G}.filling()`);
  const ends = await X.evaluate(`${G}.coming()`);
  ok("under rain the sky says when it ends, and the empty bucket begins to fill: twelve seconds for a bucketful", ends?.clears >= 16 && ends.clears <= 30 && f0?.ms === 12000 && f0.full < 0.5 && (await waterOf(X, "bucket")) === 0, { ends, f0 });
  await sleep(5000);
  await Promise.all([X.shot(`${OUT}/frog-filling.png`), Y.shot(`${OUT}/frog-filling-seen.png`)]);
  const f1 = await X.evaluate(`${G}.filling()`);
  ok("…its filling shown as it goes", f1?.full > f0.full && f1.full < 1 && Number(await X.evaluate(`document.querySelector("[data-frog-fill]")?.dataset.frogFill`)) > 20, f1);
  await until("the bucket is full", async () => (await waterOf(X, "bucket")) === 1, 15000, 100);
  const took = Date.now() - began;
  ok("after its twelve seconds the bucket is full, by itself: nothing pressed, no stamina spent", (await waterOf(X, "bucket")) === 1 && took >= 11500 && took < 16000 && (await stamina(X)) === before, { took, stamina: await stamina(X) });
  ok("…its member is told, and the room that the bucket has water", /ฝนเติมถังให้แล้ว 1 ถัง/.test((await textOf(X, "[data-frog-note]")) ?? "")
     && (await until("the room hears", async () => (await Y.evaluate(`${S}.people().find((p) => p.id === ${JSON.stringify(a)})?.wet`)) === true, 8000, 100).then(() => true).catch(() => false)), await textOf(X, "[data-frog-note]"));
  await X.shot(`${OUT}/frog-full.png`);
  ok("a bucket that has water gathers no more", (await X.evaluate(`${G}.filling()`)) === null, await X.evaluate(`${G}.filling()`));

  // ── still to be carried and poured; and it fills again where its member stands ──
  await X.evaluate(`${T}.setWell(3)`);
  await warp(X, ...WELL);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 30000);
  await until("pouring is offered", async () => (await X.evaluate(`${F}.chore()`)) === "pour", 8000);
  await X.evaluate(`${F}.act()`);
  await until("it is poured", async () => (await X.evaluate(`${K}.well()`)) === 4, 6000, 50);
  ok("poured into the well as any water, for the pour's own stamina; and the well's water is the rain's", (await X.evaluate(`${K}.well()`)) === 4 && (await stamina(X)) === before - 1 && (await X.evaluate(`${K}.wellWater()?.kind`)) === "rain", [await stamina(X), await X.evaluate(`${K}.wellWater()`)]);
  await until("the emptied bucket gathers the rain again", () => there(X, "[data-frog-fill]"), 5000, 50);
  await until("the bucket is full again", async () => (await waterOf(X, "bucket")) === 1, 16000, 100);
  await until("pouring is offered", async () => (await X.evaluate(`${F}.chore()`)) === "pour", 8000, 50);
  await X.evaluate(`${F}.act()`);
  await until("it is poured", async () => (await X.evaluate(`${K}.well()`)) === 5, 6000, 50);
  did = await X.evaluate(`${K}.rainFill()`);
  ok("standing at the well in the rain it fills again where its member stands, with no walk to the river, and is poured again", (await X.evaluate(`${K}.well()`)) === 5 && (await stamina(X)) === before - 2, [await X.evaluate(`${K}.well()`), await stamina(X)]);
  ok("asked the moment it is emptied, whoever keeps the game says not yet: the rain takes its time", did.ok === false && did.why === "soon" && (await waterOf(X, "bucket")) === 0, did);
  await X.shot(`${OUT}/frog-at-the-well.png`);
  // (a yoke of four takes four times as long)
  await hold(X, "waterYokeGreat");
  await until("the yoke gathers the rain", () => there(X, "[data-frog-fill]"), 5000, 50);
  ok("a great yoke of four takes forty-eight seconds", (await X.evaluate(`${G}.filling()`))?.ms === 48000, await X.evaluate(`${G}.filling()`));

  // ── only while the frog follows ──
  await X.evaluate(`${K}.familiarWear(null)`);
  await sleep(500);
  did = await X.evaluate(`${K}.rainFill()`);
  ok("a frog sent to rest shows no sky and fills no bucket", !(await there(X, "[data-town-frog]")) && did.ok === false && did.why === "none" && (await waterOf(X, "waterYokeGreat")) === 0, did);
  await X.evaluate(`${K}.familiarWear("famFrog")`);
  await until("the sky is shown again", () => there(X, "[data-town-frog]"), 8000, 100);

  // ── at a phone's width, and with the town kept still ──
  const Z = await X.window("FrogPhone", { width: 360, height: 700, mobile: true });
  await Z.goto(`${BASE}/town`);
  await sleep(1500);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "off")`);
  await enter(Z, "U", "clear,rain,storm,clear");
  await Z.evaluate(`(${T}.setGifts(["famFrog"]), ${K}.familiarWear("famFrog"))`);
  await until("the frog's own code has come", () => Z.evaluate(`!!${G}`), 60000);
  await Z.evaluate(`${G}.force(["clear", "rain", "storm", "clear"])`);
  await until("the sky is shown", () => there(Z, "[data-town-frog]"), 8000, 100);
  await sleep(500);
  const [fb, cb] = [await boxOf(Z, "[data-town-frog]"), await boxOf(Z, '[role="timer"]')];
  ok("at a phone's width the sky fits under the clock", fb.x >= 0 && fb.x + fb.w <= 360 && fb.y >= cb.y + cb.h && (await skies(Z)).map((s) => s[0]).join() === "clear,rain,storm,clear", { fb, cb, skies: await skies(Z) });
  ok("with the town kept still nothing of it moves", await Z.evaluate(`(() => { const d = document.querySelector("[data-town-frog]"); const c = d?.querySelector(".tf-croak"); return !!d && d.hasAttribute("data-still") && !!c && getComputedStyle(c).animationName === "none"; })()`),
     await Z.evaluate(`document.querySelector("[data-town-frog]")?.outerHTML.slice(0, 200)`));
  await Z.shot(`${OUT}/frog-phone.png`);
  await Z.evaluate(`localStorage.setItem("cashTown:motion", "on")`);

  const errors = [...X.logs, ...Y.logs, ...Z.logs].filter((l) => !/favicon|ERR_|Failed to load resource|supabase|WebSocket|realtime/i.test(l));
  ok("no page threw", errors.length === 0, errors.slice(0, 4));
} catch (e) {
  ok("the check ran to its end", false, e.message);
} finally {
  X.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
