// Cash Town's vegetable plots, tried in a real browser on the dev test room (the trial kept in the browser, `next dev`
// only), by two testers in two tabs of one browser, who share its farm:
//
// - a plot of weeds (of many kinds, scattered) is cleared with a hoe by pulling them (a patch seen close: weeds are
//   touched, stones are not) and tilled by the game of timing, each on the town's own wooden board; a seed is sown,
//   and the bed is the sower's: its name plate says so, and the other tester can neither sow nor pick in it, but may
//   hoe there, for the stamina it costs anybody;
// - a watering can waters nothing until it is filled: a bucket is drawn at the river, poured into the farm's well,
//   and the can is filled there; the other tester may water too;
// - time is put forward until the plant is ripe, it is picked into the bag and bears again;
// - a hoe digs a plant out of one's own bed and nobody else's: a living one or one a pest has killed, with no game,
//   asked for twice (Space pressed once too often leaves it), for stamina, and with none left all the same; what
//   lived leaves nothing, what died leaves compost;
// - a bed nobody has tended for more than four days is anybody's again;
// - nothing is offered to a hand that holds the wrong thing; every go at the hoe is written down;
// - with no stamina left each game is its own and much harder: the weeds change places in the wind four times as
//   often, among more stones, and are dropped at the third miss with the plot left as it was; tilling's stretch is a
//   good third of itself; sowing is shaking hands to be steadied over the plot, watering and drawing water are a pour
//   let go between two marks: each dropped the same way with nothing lost, and with stamina again done at once.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-farm.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";
import { awaitGame, board, fumble, gameGone, gameState, gameUp, play } from "./games.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", F = "window.__townFarm";
const purse = (X) => X.evaluate(`${T}.purse()`);
const slotOf = (X, item) => X.evaluate(`${T}.purse().bag.findIndex((s) => s?.item === ${JSON.stringify(item)})`);
const hold = async (X, item) => { await X.evaluate(`${T}.hold(${await slotOf(X, item)})`); await sleep(350); };
const deed = (X) => X.evaluate(`${F}.deed()`);
const chore = (X) => X.evaluate(`${F}.chore()`);
const seen = (X, key) => X.evaluate(`${F}.seen(${JSON.stringify(key)})`);
const waterOf = async (X, item) => (await purse(X)).bag.find((s) => s?.item === item)?.water ?? 0;
const warp = async (X, x, y) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const shown = (X, re) => X.evaluate(`[...document.querySelectorAll("button, p")].some((b) => ${re}.test(b.innerText))`);
const has = async (X, item) => (await purse(X)).bag.reduce((t, b) => t + (b?.item === item ? b.n : 0), 0);
/** Put the fertiliser that keeps pests off on the plant I stand at. */
async function guard(X) {
  await hold(X, "guardFert");
  await until("the fertiliser is offered", async () => (await deed(X)) === "feed", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(450);
}
/** Clear a plot and till it, with the hoe. */
async function dig(X) {
  await hold(X, "hoe");
  for (const want of ["clear", "till"]) {
    await until(`the hoe is offered: ${want}`, async () => (await deed(X)) === want, 5000);
    await X.evaluate(`${F}.act()`);
    await play(X);
    await sleep(400);
  }
}
async function enter(X, letter) {
  // (a cloudy sky: under a clear one a watering from noon to four is worth twice, lib/town/heat, and this runs at whatever the hour is)
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
}

// A bed is seven plots by seven: the first begins at 132,4; the next along at 140,4.
const KEY = "133,5", WELL = [157, 23], RIVER = [17, 42];
const X = await browser("Farm", { width: 1280, height: 860 });
try {
  await enter(X, "M");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 3), ${T}.grant("rod", 1), ${T}.grant("bucket", 1), ${T}.grant("guardFert", 2))`);
  await warp(X, 133, 5);
  await until("the farm's own code has come", () => X.evaluate(`!!${F}`), 20000);
  await sleep(900);
  ok("an untended plot is weeds", (await seen(X, KEY)).soil === "wild");
  // the weeds: many kinds, none to three on a plot, never the same row after row
  const weeds = await X.evaluate(`(() => { const all = []; for (let y = 4; y < 11; y++) for (let x = 132; x < 139; x++) all.push(${F}.weeds(x, y)); return all; })()`);
  const kinds = new Set(weeds.flat()), counts = new Set(weeds.map((w) => w.length));
  ok("the weeds are of many kinds, scattered: none, one, two or three to a plot", kinds.size >= 9 && counts.size >= 3 && Math.max(...counts) <= 3, { kinds: [...kinds], counts: [...counts] });
  ok("with nothing in the hand, nothing is offered", (await deed(X)) === null && !(await shown(X, "/ถางหญ้า|พรวนดิน|หว่านเมล็ด/")));
  await hold(X, "rod");
  ok("…nor with the wrong thing in it", (await deed(X)) === null);

  // the hoe: the weeds are pulled, on a patch seen close; then the soil is tilled, by the game of timing
  await hold(X, "hoe");
  await until("the hoe's work is offered", async () => (await deed(X)) === "clear", 4000);
  await X.shot(`${OUT}/farm-weeds.png`);
  const before = (await purse(X)).stamina;
  await X.evaluate(`${F}.act()`);
  ok("clearing a plot is pulling its weeds: a game of its own", (await awaitGame(X)) === "weeding");
  await sleep(200);
  let patch = await gameState(X), sign = await board(X);
  const kinds_ = (p) => p.cells.map((c) => c?.kind ?? "bare");
  ok("a patch of eight places: three weeds, two stones, bare earth", patch.cells.length === 8 && kinds_(patch).filter((k) => k === "weed").length === 3 && kinds_(patch).filter((k) => k === "stone").length === 2 && patch.most === 0, kinds_(patch));
  ok("…on the town's wooden board: what the work is, a square for each weed wanted, nothing to lose", sign.title === "ถางหญ้า" && sign.need === 3 && sign.hits === 0 && sign.left === null && sign.look === "weeding", sign);
  ok("…each place a button that says what stands in it", await X.evaluate(`(() => { const b = [...document.querySelectorAll("[data-town-game] [data-place]")]; return b.length === 8 && b.every((x) => x.tagName === "BUTTON" && /ต้นหญ้า|ก้อนหิน|ดินเปล่า/.test(x.getAttribute("aria-label"))); })()`));
  await X.shot(`${OUT}/farm-weeding.png`);
  await fumble(X);
  await sleep(150);
  ok("a stone touched is a miss: it is counted, and no weed is pulled", (await gameState(X)).misses === 1 && (await gameState(X)).hits === 0 && (await X.evaluate(`document.querySelector("[data-town-game] [data-misses]")?.dataset.misses`)) === "1", await gameState(X));
  // a weed, touched as a finger touches it: on its own place of the picture
  const spot = await X.evaluate(`(() => { const b = document.querySelector('[data-town-game] [data-kind="weed"]'), r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: spot.x, y: spot.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
  await sleep(200);
  patch = await gameState(X);
  ok("a weed touched comes out: one pulled, two left standing", patch.hits === 1 && kinds_(patch).filter((k) => k === "weed").length === 2 && (await board(X)).hits === 1, patch);
  // the wind goes through it: the same things, in other places
  const wasAt = JSON.stringify(kinds_(patch));
  await until("the wind has gone through the patch", async () => JSON.stringify(kinds_(await gameState(X))) !== wasAt, 5000, 60);
  patch = await gameState(X);
  ok("every little while the wind goes through, and things change places: the same things", kinds_(patch).filter((k) => k === "weed").length === 2 && kinds_(patch).filter((k) => k === "stone").length === 2, kinds_(patch));
  ok("the rest pulled, the plot is cleared", (await play(X)) === "weeding");
  await until("the plot is cleared", async () => (await seen(X, KEY)).soil === "cleared", 4000);
  ok("three weeds pulled clear the plot, for stamina (and a point more for the stone)", (await deed(X)) === "till" && (before.day < 0 ? 100 : before.left) - (await purse(X)).stamina.left === 3, await purse(X));
  await X.evaluate(`${F}.act()`);
  ok("tilling is the game of timing: the hoe's swing, and the only work that is", (await awaitGame(X)) === "timing");
  await sleep(300);
  sign = await board(X);
  ok("…on the same board: a strip of earth, a button to swing by", sign.title === "พรวนดิน" && sign.need === 3 && sign.look === "hoe" && (await X.evaluate(`[...document.querySelectorAll("[data-town-game] button")].some((b) => /ฟันจอบ/.test(b.innerText))`)), sign);
  await X.shot(`${OUT}/farm-timing.png`);
  await play(X);
  await until("the plot is tilled", async () => (await seen(X, KEY)).soil === "tilled", 4000);
  ok("three swings till the soil, and the hoe has no more to do there", (await deed(X)) === null);

  // a seed: the bed is the sower's
  ok("nobody owns a bed nothing was sown in", (await X.evaluate(`${F}.owners()`)).length === 0);
  await hold(X, "seedKangkong");
  ok("a seed in the hand is offered tilled soil", (await deed(X)) === "sow");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  let s = await seen(X, KEY), p = await purse(X);
  ok("it is sown: one seed gone, and only what was sown lies in the plot", s.crop === "kangkong" && s.stage === 1 && p.bag.find((b) => b?.item === "seedKangkong").n === 2, { s });
  ok("a plot with a plant in it takes no second seed", (await deed(X)) === null);
  // (kept from pests for a day: whether one comes hangs on the hour the check is run at, and one left six hours kills)
  await guard(X);
  ok("a fertiliser that keeps pests off is put on it", (await X.evaluate(`${F}.plots()`))[KEY].plant.guard > 0 && (await has(X, "guardFert")) === 1);
  let owners = await X.evaluate(`${F}.owners()`);
  ok("the whole bed is the first sower's, by name", owners.length === 1 && owners[0].bed === 0 && /M/.test(owners[0].name), owners);

  // water: a can as it is bought is empty
  await hold(X, "can");
  ok("a watering can is offered the plant", (await deed(X)) === "water");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("…but an empty one waters nothing, and says there is no water", (await seen(X, KEY)).wet === false && (await shown(X, "/ไม่มีน้ำ/")));
  // a bucket, at the river
  await warp(X, ...RIVER);
  ok("by the river a can does nothing", (await chore(X)) === null);
  await hold(X, "bucket");
  await until("a bucket is offered the river", async () => (await chore(X)) === "draw", 5000);
  await X.shot(`${OUT}/farm-river.png`);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("a bucket is filled at the river", (await waterOf(X, "bucket")) === 1 && (await chore(X)) === null);
  // to the farm's well
  await warp(X, ...WELL);
  await until("a full bucket is offered the well", async () => (await chore(X)) === "pour", 5000);
  ok("the well begins empty", (await X.evaluate(`${F}.well()`)) === 0);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("…and poured into the farm's well", (await X.evaluate(`${F}.well()`)) === 1 && (await waterOf(X, "bucket")) === 0);
  await hold(X, "can");
  await until("a can is offered the well", async () => (await chore(X)) === "fill", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  const filled = await waterOf(X, "can");
  // (a filling takes two bucketfuls since 2026-10-07, where it took one: the one there is gives half a can, and the well is dry)
  ok("the can takes the well's water: the one bucketful there is gives it half a filling, four waterings, and leaves the well dry", filled === 4 && (await X.evaluate(`${F}.well()`)) === 0, { filled });
  await X.shot(`${OUT}/farm-well.png`);
  await warp(X, 133, 5);
  await until("the can is offered the plant again", async () => (await deed(X)) === "water", 5000);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("with water in it the plant is watered: wet for the hour, one watering less in the can", (await seen(X, KEY)).wet === true && (await deed(X)) === null && (await waterOf(X, "can")) === filled - 1);
  await X.shot(`${OUT}/farm-sprout.png`);

  // a second plot of my bed, tilled, for the other tester to try
  await warp(X, 134, 5);
  await dig(X);
  ok("another plot of my own bed is mine to till", (await seen(X, "134,5")).soil === "tilled");

  // the other tester, in another tab of the same browser: the same farm
  const Y = await X.tab("FarmB");
  await enter(Y, "B");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1), ${T}.grant("can", 1), ${T}.grant("seedKangkong", 3), ${T}.setWell(3))`);
  await warp(Y, 134, 5);
  await until("the farm's own code has come to the other", () => Y.evaluate(`!!${F}`), 20000);
  await sleep(900);
  ok("the other tester sees the same farm, and whose the bed is", (await seen(Y, KEY)).crop === "kangkong" && (await Y.evaluate(`${F}.owners()`)).some((o) => o.bed === 0 && /M/.test(o.name)));
  await hold(Y, "seedKangkong");
  ok("in somebody's bed, a seed is offered nothing", (await deed(Y)) === null);
  await hold(Y, "hoe");
  ok("…and a hoe nothing where something grows", (await deed(Y)) === null);
  // but a hoe works in anybody's bed (the owner, 2026-10-04: "ยังขุดแปลงคนอื่นได้เหมือนเดิมแต่ เสีย stamina")
  await warp(Y, 135, 5);
  await until("in somebody's bed, a hoe is offered the weeds", async () => (await deed(Y)) === "clear", 5000);
  const lent = (await purse(Y)).stamina;
  await Y.evaluate(`${F}.act()`);
  ok("…cleared by pulling its weeds, like one's own", (await play(Y)) === "weeding");
  await until("the neighbour's plot is cleared", async () => (await seen(Y, "135,5")).soil === "cleared", 4000);
  const after = (await purse(Y)).stamina, owned = await X.evaluate(`${F}.owners()`);
  ok("…for the stamina it costs anybody, and the bed is still its owner's", after.left < (lent.day < 0 ? 100 : lent.left) && owned.length === 1 && owned[0].bed === 0 && /M/.test(owned[0].name), { lent, after, owned });
  await hold(Y, "seedKangkong");
  await sleep(300);
  ok("…where a seed of theirs is still offered nothing", (await deed(Y)) === null);
  // but they may water: with a can filled at the well
  await warp(Y, ...WELL);
  await hold(Y, "can");
  await until("the other's can is offered the well", async () => (await chore(Y)) === "fill", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(400);
  await X.evaluate(`${T}.skipHours(1.1)`);
  await sleep(600);
  await warp(Y, 133, 5);
  await until("the other's can is offered my plant", async () => (await deed(Y)) === "water", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(500);
  ok("anybody may water anybody's plant", (await seen(X, KEY)).wet === true);
  // a bed of their own, the next along
  await warp(Y, 140, 5);
  await dig(Y);
  await hold(Y, "seedKangkong");
  await Y.evaluate(`${F}.act()`);
  await sleep(500);
  owners = await X.evaluate(`${F}.owners()`);
  ok("a free bed is theirs once they sow in it: two beds, two owners", owners.length === 2 && owners.some((o) => o.bed === 1 && /B/.test(o.name)), owners);
  await warp(X, 136, 6);
  for (let i = 0; i < 3; i++) { await X.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 640, y: 380, deltaX: 0, deltaY: -240 }); await sleep(80); }
  await sleep(900);
  await X.shot(`${OUT}/farm-beds.png`);
  await warp(X, 133, 5);

  // time: its stages, and ripe
  await hold(X, "can");
  await X.evaluate(`${T}.skipHours(3)`);
  await sleep(700);
  s = await seen(X, KEY);
  ok("hours on it has grown, and can be watered again", s.stage >= 2 && !s.ripe && (await deed(X)) === "water", s);
  await X.evaluate(`${T}.skipHours(3)`);
  await sleep(700);
  s = await seen(X, KEY);
  ok("six hours on it is ripe, the last of its five stages", s.stage === 5 && s.ripe === true, s);
  await X.shot(`${OUT}/farm-ripe.png`);
  await warp(Y, 133, 5);
  await hold(Y, "hoe");
  ok("a ripe plant is not the other's to pick", (await deed(Y)) === null);
  await hold(X, "rod");
  ok("a ripe plant of my bed is picked whatever I hold", (await deed(X)) === "pick");
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  p = await purse(X);
  s = await seen(X, KEY);
  const got = p.bag.find((b) => b?.item === "kangkong")?.n ?? 0;
  ok("picked: four to six of it in the bag", got >= 4 && got <= 6, p.bag);
  ok("it bears again: back a stage, not ripe", s.crop === "kangkong" && s.stage === 4 && !s.ripe && (await deed(X)) === null, s);
  // (still under the day's cover from pests it was given when it was sown)
  await X.evaluate(`${T}.skipHours(12)`);
  await sleep(700);
  ok("…and ripe again half a day on", (await seen(X, KEY)).ripe === true && (await deed(X)) === "pick");

  // a hoe digs a plant out of one's own bed, living or dead: no game, asked for twice (the owner, 2026-10-04: "ใช้จอบ
  // ขุดเอาพืชที่ไม่ต้องการออกได้ ทั้งพืชที่ปกติ และพืชที่ตายแล้ว ไม่ต้องเล่นมินิเกม แต่ต้องกด ยืนยันก่อน … ใช้ได้เฉพาะเจ้าของแปลงผัก")
  {
    const ASK = `document.querySelector("[data-farm-ask]")`, asking = (Z) => Z.evaluate(`${ASK}?.dataset.farmAsk ?? null`);
    const key = async (Z, k) => { for (const type of ["keyDown", "keyUp"]) await Z.send("Input.dispatchKeyEvent", { type, key: k === "Space" ? " " : k, code: k, windowsVirtualKeyCode: k === "Space" ? 32 : 27 }); await sleep(250); };
    await hold(Y, "hoe");
    await sleep(300);
    ok("a living plant in somebody's bed is not the other's hoe's", (await deed(Y)) === null && !(await shown(Y, "/ขุดออก/")));
    await hold(X, "hoe");
    await until("in my own bed the hoe is offered the plant", async () => (await deed(X)) === "uproot", 5000);
    ok("…and the button says dig it out", await shown(X, "/^ขุดออก/"));
    // (stamina is kept with its day: what was left on a day gone by is a full hundred today)
    const was = { stamina: (await purse(X)).stamina, kangkong: await has(X, "kangkong") }, left = (st, today) => (st.day === today ? st.left : 100);
    await X.evaluate(`${F}.act()`);
    await sleep(400);
    let said = await X.evaluate(`(() => { const d = ${ASK}; return d ? { what: d.dataset.farmAsk, text: d.innerText.replace(/\\s+/g, " ").trim(), role: d.getAttribute("role"), no: document.activeElement?.hasAttribute("data-farm-ask-no") ?? false, emoji: /\\p{Extended_Pictographic}/u.test(d.innerText) } : null; })()`);
    ok("it is asked a second time, by name, with what will be lost: this one is ripe", !!said && said.what === "uproot" && said.role === "alertdialog" && /ขุดผักบุ้งออกจากแปลง\?/.test(said.text) && /เก็บได้แล้ว/.test(said.text) && /เอาคืนไม่ได้/.test(said.text) && !said.emoji, said);
    ok("…with no game of timing, and nothing done yet", (await gameUp(X)) === null && (await seen(X, KEY)).crop === "kangkong");
    ok("…and leaving it is what the keys are on", !!said && said.no === true, said);
    await X.shot(`${OUT}/farm-dig-ask.png`);
    await key(X, "Space");
    ok("Space pressed once too often leaves it: the plant stands", (await asking(X)) === null && (await seen(X, KEY)).crop === "kangkong" && JSON.stringify((await purse(X)).stamina) === JSON.stringify(was.stamina), await seen(X, KEY));
    await key(X, "Space");
    ok("Space asks again", (await asking(X)) === "uproot");
    await key(X, "Escape");
    ok("Escape leaves it too", (await asking(X)) === null && (await seen(X, KEY)).crop === "kangkong");
    await X.evaluate(`${F}.act()`);
    await sleep(300);
    await warp(X, 134, 5);
    ok("walking off the plot leaves it", (await asking(X)) === null && (await seen(X, KEY)).crop === "kangkong");
    await warp(X, 133, 5);
    await until("the hoe is offered the plant again", async () => (await deed(X)) === "uproot", 5000);
    await X.evaluate(`${F}.act()`);
    await sleep(300);
    await X.evaluate(`${ASK}.querySelector("[data-farm-ask-yes]").click()`);
    await until("the plant is gone", async () => !(await seen(X, KEY)).crop, 4000);
    s = await seen(X, KEY);
    p = await purse(X);
    ok("said to be meant, it is dug out: bare cleared ground", s.soil === "cleared" && !s.crop && (await deed(X)) === "till", s);
    ok("…a ripe one too, with nothing harvested and nothing left of it", (await has(X, "kangkong")) === was.kangkong && (await has(X, "compost")) === 0, p.bag);
    ok("…for the stamina of pulling a plant up, and no game was played", left(was.stamina, p.stamina.day) - p.stamina.left === 2 && (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming").length === 4, p.stamina);
    ok("the bed is still mine, with nothing growing in it", (await X.evaluate(`${F}.owners()`)).some((o) => o.bed === 0 && /M/.test(o.name)));

    // one a pest has killed: a pumpkin sown so many days ago that one came and was left, found by looking
    let dead = null;
    for (let d = 1; d <= 5 && !dead; d++) for (const k of ["133,6", "134,6", "135,6", "136,6", "133,7", "134,7", "135,7", "136,7"]) {
      await X.evaluate(`${T}.setPlot(${JSON.stringify(k)}, { soil: "tilled", plant: { by: ${T}.id, crop: "pumpkin", sown: ${T}.now() - ${d} * 86400000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } })`);
      await sleep(60);
      if ((await X.evaluate(`${F}.seen(${JSON.stringify(k)})`)).dead) { dead = k; break; }
      await X.evaluate(`${T}.setPlot(${JSON.stringify(k)}, { soil: "wild", plant: null })`);
    }
    ok("a pumpkin a pest has killed is found", !!dead, dead);
    const [dx, dy] = dead.split(",").map(Number);
    await warp(Y, dx, dy);
    await sleep(400);
    ok("a dead plant in somebody's bed is not the other's to pull up", (await deed(Y)) === null, await deed(Y));
    await warp(X, dx, dy);
    await until("in my own bed the hoe is offered the dead plant", async () => (await deed(X)) === "pull", 5000);
    const tired = (await purse(X)).stamina.left;
    await X.evaluate(`${F}.act()`);
    await sleep(400);
    said = await X.evaluate(`(() => { const d = ${ASK}; return d ? { what: d.dataset.farmAsk, text: d.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
    ok("a dead one is asked about too, as a dead one", !!said && said.what === "pull" && /ถอนต้นที่ตายแล้วออกจากแปลง\?/.test(said.text) && /ถอนออก/.test(said.text), said);
    await X.shot(`${OUT}/farm-dig-dead.png`);
    await X.evaluate(`${ASK}.querySelector("[data-farm-ask-yes]").click()`);
    await until("the dead plant is gone", async () => !(await seen(X, dead)).crop, 4000);
    ok("pulled up, it leaves compost and cleared ground, for the same stamina", (await has(X, "compost")) === 1 && (await seen(X, dead)).soil === "cleared" && tired - (await purse(X)).stamina.left === 2 && (await shown(X, "/ปุ๋ยหมัก ×1/")), await purse(X));

    // with no stamina left it is still no game: asked twice, and done
    const kept = (await purse(X)).stamina.left;
    await X.evaluate(`${T}.setPlot("136,8", { soil: "tilled", plant: { by: ${T}.id, crop: "kangkong", sown: ${T}.now() - 3600000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 864000000, cured: 0, picked: 0, pickedAt: 0 } })`);
    await X.evaluate(`${T}.setStamina(0)`);
    await warp(X, 136, 8);
    await until("with no stamina the hoe is offered the plant", async () => (await deed(X)) === "uproot", 5000);
    await X.evaluate(`${F}.act()`);
    await sleep(400);
    said = await X.evaluate(`(() => { const d = ${ASK}; return d ? { what: d.dataset.farmAsk, text: d.innerText.replace(/\\s+/g, " ").trim() } : null; })()`);
    ok("with no stamina left it is still asked, not played: this one is growing", !!said && said.what === "uproot" && /ยังโตอยู่/.test(said.text) && (await gameUp(X)) === null, said);
    await X.evaluate(`${ASK}.querySelector("[data-farm-ask-yes]").click()`);
    await until("the plant is gone, with no stamina", async () => !(await seen(X, "136,8")).crop, 4000);
    ok("…and dug out with no game", (await gameUp(X)) === null && (await seen(X, "136,8")).soil === "cleared" && (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming").length === 4);
    await X.evaluate(`${T}.setStamina(${kept})`);
    // (the plot is put back as it stood, for what the check goes on to: a plant in it, ripe, mine)
    await X.evaluate(`${T}.setPlot(${JSON.stringify(KEY)}, { soil: "tilled", plant: { by: ${T}.id, crop: "kangkong", sown: ${T}.now() - 86400000, boost: 0, watered: 0, fed: 0, guard: ${T}.now() + 864000000, cured: 0, picked: 0, pickedAt: 0 } })`);
    await warp(X, 133, 5);
    // (and half a day goes by: digging was the owner's tending, and what follows counts four days from the last of it)
    await X.evaluate(`${T}.skipHours(12)`);
    await sleep(500);
  }

  // left alone for more than four days, a bed is anybody's again
  await X.evaluate(`${T}.skipHours(90)`);
  await sleep(900);
  ok("more than four days untended, the beds are nobody's", (await X.evaluate(`${F}.owners()`)).length === 0);
  await warp(Y, 134, 5);
  await hold(Y, "seedKangkong");
  await until("the tilled plot is offered the other's seed now", async () => (await deed(Y)) === "sow", 5000);
  await Y.evaluate(`${F}.act()`);
  await sleep(600);
  owners = await X.evaluate(`${F}.owners()`);
  ok("…and whoever sows in it next has it", owners.length === 1 && owners[0].bed === 0 && /B/.test(owners[0].name), owners);

  // every go at the hoe was written down
  const log = (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming");
  ok("the hoe's games are written down, with their hits and misses", log.length === 4 && log[0].what === "clear" && log[0].misses === 1 && log[1].what === "till" && log.every((l) => l.hits === 3 && l.need === 3 && l.secs > 0), log);

  // with no stamina left: much harder, and the work is dropped at the third miss (the owner, 2026-10-04: three times
  // as hard as it was, and still to be done by a very good hand)
  const TIRED = "142,6";
  await X.evaluate(`${T}.setStamina(0)`);
  await warp(X, 142, 6);
  await hold(X, "hoe");
  await until("the hoe is offered weeds, with no stamina left", async () => (await deed(X)) === "clear", 5000);
  await X.evaluate(`${F}.act()`);
  await awaitGame(X);
  await sleep(150);
  let tired = await gameState(X);
  sign = await board(X);
  ok("with no stamina the wind goes through the weeds four times as often, among four stones, and three marks stand for the misses left",
    tired.kind === "weeding" && tired.most === 3 && tired.every > 0.5 && tired.every < 0.7 && kinds_(tired).filter((k) => k === "stone").length === 4 && sign.left === 3, { every: tired.every, most: tired.most, sign });
  await X.shot(`${OUT}/farm-tired.png`);
  for (let n = 0; n < 3; n++) {
    await fumble(X);
    await sleep(80);
    if (n === 1) ok("…one mark goes out at each miss", (await board(X))?.left === 1, await board(X));
  }
  await gameGone(X, 3000);
  await sleep(200);
  ok("the third miss drops the hoe: it is said, and the weeds are as they were", (await shown(X, "/หมดแรง จอบหลุดมือ/")) && (await seen(X, TIRED)).soil === "wild" && (await deed(X)) === "clear", await seen(X, TIRED));
  await X.shot(`${OUT}/farm-dropped.png`);
  const lost = (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming").at(-1);
  ok("…and written down as a go that was lost, played with none", lost.won === false && lost.spent === true && lost.misses === 3 && lost.hits === 0 && lost.what === "clear", lost);
  await X.evaluate(`${F}.act()`);
  ok("a steady hand clears it all the same", (await play(X)) === "weeding");
  await until("the plot is cleared with no stamina", async () => (await seen(X, TIRED)).soil === "cleared", 4000);
  ok("…for nothing: there is no stamina to take", (await purse(X)).stamina.left === 0, (await purse(X)).stamina);

  // tilling, tired: the game of timing, its stretch a good third of itself and the marker faster
  await X.evaluate(`${F}.act()`);
  await awaitGame(X);
  await sleep(150);
  tired = await gameState(X);
  ok("tilling with no stamina: the stretch is a good third of itself, the marker faster, and it too is dropped at the third miss", tired.kind === "timing" && tired.most === 3 && tired.width > 0.05 && tired.width < 0.07 && tired.speed > 1.2 && (await board(X)).left === 3, tired);
  await X.shot(`${OUT}/farm-tired-till.png`);
  await play(X);
  await until("the plot is tilled with no stamina", async () => (await seen(X, TIRED)).soil === "tilled", 4000);

  // …and everything else on the farm is a game then (the owner: "ออกแบบเพิ่มเลย"), each its own: shaking hands to be
  // steadied, water to be poured; two parts, dropped at the third miss, with nothing lost
  await hold(X, "seedKangkong");
  await until("a seed is offered the tilled plot", async () => (await deed(X)) === "sow", 5000);
  const seeds = await has(X, "seedKangkong");
  await X.evaluate(`${F}.act()`);
  await awaitGame(X);
  await sleep(150);
  let light = await gameState(X);
  sign = await board(X);
  ok("with no stamina, sowing is shaking hands to be steadied over the plot: two parts, and three misses drop it",
    light.kind === "steady" && light.need === 2 && light.most === 3 && sign.title === "หว่านเมล็ด" && sign.look === "steady" && sign.left === 3 && !(await seen(X, TIRED)).crop, { light, sign });
  ok("…the seed hangs over the plot inside a ring, and wanders out of it when it is left alone", await until("it has left the ring", async () => (await gameState(X)).within === false, 5000, 40).catch(() => false));
  await X.shot(`${OUT}/farm-tired-sow.png`);
  // dragged by a real mouse, anywhere on the picture: the hand goes with it, by as much
  {
    const box = await X.evaluate(`(() => { const r = document.querySelector('[data-look="steady"]').getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.8, half: r.width / 2 }; })()`);
    const was = (await gameState(X)).x;
    await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: box.x, y: box.y, button: "left", buttons: 1, clickCount: 1 });
    for (let i = 1; i <= 6; i++) { await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x + i * 6, y: box.y, button: "left", buttons: 1 }); await sleep(20); }
    await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: box.x + 36, y: box.y, button: "left", buttons: 0, clickCount: 1 });
    await sleep(80);
    const now = (await gameState(X)).x;
    ok("…dragged anywhere on the picture, the hand is moved by as much: not held by its own place", Math.abs((now - was) - 36 / box.half) < 0.03, { was, now, want: 36 / box.half });
  }
  // left alone: it stays out, and is a miss each time it has been out long enough
  await until("the hands have given it up", async () => (await gameUp(X)) === null, 12000, 60);
  await sleep(200);
  ok("dropped, nothing is sown and no seed is lost: it is said", (await shown(X, "/หมดแรง มือสั่น/")) && (await seen(X, TIRED)).crop === null && (await has(X, "seedKangkong")) === seeds && (await deed(X)) === "sow", await seen(X, TIRED));
  await X.evaluate(`${F}.act()`);
  ok("a steady hand sows all the same", (await play(X)) === "steady");
  await until("the seed is in the ground", async () => (await seen(X, TIRED)).crop === "kangkong", 4000);
  ok("…one seed gone", (await has(X, "seedKangkong")) === seeds - 1);
  // watering: a pour, let go between the marks
  await hold(X, "can");
  await until("the can is offered what was sown", async () => (await deed(X)) === "water", 5000);
  const waterings = await waterOf(X, "can");
  await X.evaluate(`${F}.act()`);
  await awaitGame(X);
  await sleep(150);
  light = await gameState(X);
  sign = await board(X);
  ok("watering is a pour: the button held, and let go with the water between two marks",
    light.kind === "pouring" && light.need === 2 && light.most === 3 && light.width > 0.04 && light.width < 0.07 && sign.look === "pour" && (await X.evaluate(`[...document.querySelectorAll("[data-town-game] button")].some((b) => /กดค้างรด/.test(b.innerText))`)), { light, sign });
  await fumble(X);
  await sleep(150);
  ok("…let go short of them, a miss: one mark goes out", (await gameState(X)).misses === 1 && (await board(X)).left === 2, await gameState(X));
  // the big button held with a real mouse, past the brim: spilt, and it says to let go
  const big = await X.evaluate(`(() => { const b = [...document.querySelectorAll("[data-town-game] button")].find((x) => /กดค้างรด/.test(x.innerText)), r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: big.x, y: big.y, button: "left", buttons: 1, clickCount: 1 });
  await until("it has run over", async () => (await gameState(X)).spilt === true, 4000, 30);
  ok("…held until it runs over, it is spilt: a miss at once, and the button says to let go", (await gameState(X)).misses === 2 && (await X.evaluate(`[...document.querySelectorAll("[data-town-game] button")].some((b) => /หกแล้ว/.test(b.innerText))`)), await gameState(X));
  await X.shot(`${OUT}/farm-tired-water.png`);
  await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: big.x, y: big.y, button: "left", buttons: 0, clickCount: 1 });
  await sleep(120);
  ok("two good pours and it is watered", (await play(X)) === "pouring");
  await until("the plant is watered", async () => (await seen(X, TIRED)).wet === true, 4000);
  ok("…one watering less in the can", (await waterOf(X, "can")) === waterings - 1, { waterings, now: await waterOf(X, "can") });
  // carrying water
  await warp(X, ...RIVER);
  await hold(X, "bucket");
  await until("a bucket is offered the river", async () => (await chore(X)) === "draw", 5000);
  await X.evaluate(`${F}.act()`);
  await awaitGame(X);
  ok("drawing water is a pour too: the bucket dipped, held and let go", (await gameUp(X)) === "pouring" && (await board(X)).title === "ตักน้ำ" && (await waterOf(X, "bucket")) === 0 && (await X.evaluate(`[...document.querySelectorAll("[data-town-game] button")].some((b) => /กดค้างตัก/.test(b.innerText))`)), await board(X));
  await play(X);
  await until("the bucket is full", async () => (await waterOf(X, "bucket")) >= 1, 4000);
  const rounds = (await X.evaluate(`${T}.plays()`)).filter((l) => l.game === "farming").slice(-4).map((l) => [l.what, l.won, l.need, l.spent]);
  ok("each of those games is written down, the dropped one as lost", JSON.stringify(rounds) === JSON.stringify([["sow", false, 2, true], ["sow", true, 2, true], ["water", true, 2, true], ["draw", true, 2, true]]), rounds);
  // with stamina again, the same work is done at once
  await X.evaluate(`${T}.setStamina(100)`);
  await warp(X, ...WELL);
  await until("a full bucket is offered the well", async () => (await chore(X)) === "pour", 5000);
  const wellWas = await X.evaluate(`${F}.well()`);
  await X.evaluate(`${F}.act()`);
  await sleep(500);
  ok("with stamina, the same work is done at once, with no game", (await gameUp(X)) === null && (await X.evaluate(`${F}.well()`)) === wellWas + 1 && (await waterOf(X, "bucket")) === 0);

  // a few more plots at their stages, to look at
  await X.evaluate(`${T}.reset()`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("hoe", 1))`);
  for (const [x, y, item] of [[133, 5, "seedKangkong"], [134, 5, "seedCorn"], [135, 5, "seedPumpkin"], [134, 6, "seedChili"], [135, 6, "seedTomato"], [133, 6, "seedCabbage"]]) {
    await X.evaluate(`${T}.grant(${JSON.stringify(item)}, 1)`);
    await warp(X, x, y);
    await dig(X);
    await hold(X, item);
    await X.evaluate(`${F}.act()`);
    await sleep(350);
  }
  await X.evaluate(`${T}.skipHours(30)`);
  await warp(X, 134, 8);
  await sleep(1200);
  await X.shot(`${OUT}/farm-plots.png`);

  // the test window's show garden: every vegetable at every stage, in the four beds round the well
  await X.evaluate(`${T}.showGarden("M")`);
  await sleep(700);
  const row = [];
  for (let i = 0; i < 5; i++) row.push(await seen(X, `${148 + i},12`));
  ok("the show garden has a row to each vegetable, from what was sown to ripe", row.every((r, i) => r.crop === "kangkong" && r.stage === i + 1) && row[4].ripe === true && !row[3].ripe, row);
  const planted = Object.entries(await X.evaluate(`${F}.plots()`)).filter(([, plot]) => plot.plant);
  ok("…twenty-six vegetables at five stages each, beside what was sown before", planted.length === 26 * 5 + 6 && new Set(planted.map(([, plot]) => plot.plant.crop)).size === 26, planted.length);
  ok("its four beds are mine", (await X.evaluate(`${F}.owners()`)).filter((o) => [8, 9, 14, 15].includes(o.bed) && /M/.test(o.name)).length === 4, await X.evaluate(`${F}.owners()`));
  await warp(X, 157, 22);
  await sleep(1500);
  await X.shot(`${OUT}/farm-garden.png`);
  await warp(X, 150, 15);
  await sleep(1500);
  await X.shot(`${OUT}/farm-garden-near.png`);
  // a week on, everything that was sown is ripe (or has been, and waits)
  await X.evaluate(`${T}.skipHours(24 * 13)`);
  await sleep(900);
  ok("thirteen days on, every one of them is ripe", (await Promise.all(planted.filter(([key]) => !["133,5", "134,5", "135,5", "134,6", "135,6", "133,6"].includes(key)).map(([key]) => seen(X, key)))).every((r) => r.ripe && r.stage === 5));
  await X.evaluate(`${T}.clearFarm()`);
  await sleep(500);
  ok("the farm is cleared again", Object.keys(await X.evaluate(`${F}.plots()`)).length === 0 && (await X.evaluate(`${F}.owners()`)).length === 0);

  // An insect that eats pests, and a cure that keeps them off (the owner, 2026-10-06: "แมลงที่ใช้กำจัด ศัตรูพืช … ช่วยทำให้กลับมา
  // ใช้งานได้", "เอาเต่าทอง 50% ตักแตนตำข้าว 70%", "การกำจัดแมลงด้วยแมลง จะไม่ทำให้ป้องกันแมลงกลับมาโจมตีได้ แต่ยาฆ่าแมลงจะยังป้องกันได้ 24 ชม").
  // A pumpkin of somebody else's with a pest on it, found by looking, at an hour pests are about; the number an insect is
  // tried by said by the check (`setPutLuck`), so that what comes of each is known.
  {
    await X.evaluate(`(${T}.empty(), ${T}.setStamina(100))`);
    const PEST = "134,6", [px, py] = PEST.split(",").map(Number);
    // (whether a pest has come hangs on the very moment a plant was sown: the one found is kept, to be stood up again as it was)
    let sick = null;
    for (let turn = 0; turn < 30 && !sick; turn++) {
      const at = await X.evaluate(`${T}.now()`);
      for (let h = 3; h <= 72 && !sick; h++) {
        const plot = { soil: "tilled", plant: { by: "somebody-else", crop: "pumpkin", sown: at - h * 3600000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } };
        await X.evaluate(`${T}.setPlot(${JSON.stringify(PEST)}, ${JSON.stringify(plot)})`);
        await sleep(40);
        if ((await seen(X, PEST)).pest) sick = plot;
      }
      if (!sick) await X.evaluate(`${T}.skipHours(1)`);
    }
    ok("a plant of somebody else's with a pest on it is found", !!sick, sick);
    const again = async () => { await X.evaluate(`${T}.setPlot(${JSON.stringify(PEST)}, ${JSON.stringify(sick)})`); await sleep(300); };
    const note = () => X.evaluate(`${F}.note()`);
    const label = () => X.evaluate(`document.querySelector("[data-farm-offer]")?.innerText.replace(/\\s+/g, " ").trim() ?? null`);
    await warp(X, px, py);
    await X.evaluate(`(${T}.grant("ladybird", 3), ${T}.grant("mantis", 1), ${T}.grant("lavenderSachet", 1), ${T}.grant("pestCure", 1), ${T}.grant("archerfish", 1))`);
    // a cover that eats nothing is not offered for it, as since the day before
    await hold(X, "lavenderSachet");
    ok("a sachet in the hand is offered nothing for a plant with a pest", (await deed(X)) === null && (await label()) === null, await deed(X));
    // a ladybird is, by its own word
    await hold(X, "ladybird");
    await until("the ladybird is offered", async () => (await deed(X)) === "feed", 5000);
    ok("a ladybird in the hand is offered for it, and the button says it is let go", /ปล่อยแมลง/.test((await label()) ?? ""), await label());
    await X.shot(`${OUT}/farm-insect-offered.png`);
    // at a number over its half: it is off
    await X.evaluate(`${T}.setPutLuck(0.6)`);
    let stood = (await X.evaluate(`${F}.plots()`))[PEST], left = (await purse(X)).stamina.left;
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    ok("let go at a moment it does not eat: the ladybird is gone from the bag, for a point of stamina", (await has(X, "ladybird")) === 2 && left - (await purse(X)).stamina.left === 1, await purse(X));
    ok("…the plant is as it was to the letter, with its pest", JSON.stringify((await X.evaluate(`${F}.plots()`))[PEST]) === JSON.stringify(stood) && (await seen(X, PEST)).pest === true, (await X.evaluate(`${F}.plots()`))[PEST]);
    ok("…and the page says it flew off, with the pest still there", /เต่าทองบินหนีไปแล้ว ศัตรูพืชยังอยู่/.test((await note()) ?? ""), await note());
    await X.shot(`${OUT}/farm-insect-off.png`);
    ok("another is offered at once", (await deed(X)) === "feed");
    // at a number under it: it eats the pest, and covers nothing
    await X.evaluate(`${T}.setPutLuck(0.4)`);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    let plot = (await X.evaluate(`${F}.plots()`))[PEST];
    ok("let go at a moment it eats: the pest is gone, the plant rid of it at that moment and covered by nothing", (await seen(X, PEST)).pest === false && plot.plant.cured > 0 && plot.plant.guard === 0 && (await has(X, "ladybird")) === 1, plot);
    ok("…and the page says it ate the pest", /เต่าทองกินศัตรูพืชหมดแล้ว/.test((await note()) ?? ""), await note());
    await X.shot(`${OUT}/farm-insect-ate.png`);
    // on the plant now, which has no pest, the third is a cover for a day, whatever the number, and nothing is said
    await X.evaluate(`${T}.setPutLuck(0.99)`);
    await until("the ladybird is offered as a cover", async () => (await deed(X)) === "feed", 5000);
    await sleep(2700);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    plot = (await X.evaluate(`${F}.plots()`))[PEST];
    ok("on a plant with no pest a ladybird is a cover for a day, as ever, and nothing is said of a pest", plot.plant.guard > (await X.evaluate(`${T}.now()`)) + 23 * 3600000 && (await has(X, "ladybird")) === 0 && !/ศัตรูพืช/.test((await note()) ?? ""), { plot, note: await note() });
    // a mantis: seven in ten. At 0.6, where the ladybird was off, it eats
    await again();
    await hold(X, "mantis");
    await until("the mantis is offered", async () => (await deed(X)) === "feed", 5000);
    await X.evaluate(`${T}.setPutLuck(0.6)`);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    ok("a mantis, at the number the ladybird was off at, eats the pest: it is the surer", (await seen(X, PEST)).pest === false && (await has(X, "mantis")) === 0 && /ตั๊กแตนตำข้าวกินศัตรูพืชหมดแล้ว/.test((await note()) ?? ""), await note());
    await X.evaluate(`${T}.setPutLuck(null)`);
    // the cure that is made rids the plant and keeps it a day; the fish only rids it
    await again();
    await hold(X, "pestCure");
    await until("the cure is offered", async () => (await deed(X)) === "cure", 5000);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    plot = (await X.evaluate(`${F}.plots()`))[PEST];
    const now = await X.evaluate(`${T}.now()`);
    ok("the pest cure rids the plant and keeps pests off it for 24 hours from then", (await seen(X, PEST)).pest === false && plot.plant.cured > 0 && plot.plant.guard > now + 23.9 * 3600000 && plot.plant.guard <= now + 24 * 3600000, plot);
    await hold(X, "lavenderSachet");
    ok("…so a cover is offered nothing there: it is covered", (await deed(X)) === null);
    await again();
    await hold(X, "archerfish");
    await until("the fish is offered", async () => (await deed(X)) === "cure", 5000);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    plot = (await X.evaluate(`${F}.plots()`))[PEST];
    ok("an archerfish rids it and covers nothing, as ever", (await seen(X, PEST)).pest === false && plot.plant.cured > 0 && plot.plant.guard === 0, plot);
    // the cure says what it does, in the bag
    await X.evaluate(`(${T}.grant("pestCure", 1), ${T}.grant("ladybird", 1), ${T}.grant("mantis", 1))`);
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า").click()`);
    await sleep(700);
    const bag = await X.evaluate(`document.querySelector('[aria-labelledby="town-trade-h"]')?.innerText ?? ""`);
    await X.evaluate(`[...document.querySelector('[aria-labelledby="town-trade-h"]').querySelectorAll("button")].find((b) => /ยาไล่แมลง/.test(b.innerText) || /ยาไล่แมลง/.test(b.title ?? "") || /ยาไล่แมลง/.test(b.getAttribute("aria-label") ?? ""))?.click()`);
    await sleep(500);
    const card = await X.evaluate(`document.querySelector('[aria-labelledby="town-trade-h"]')?.innerText ?? ""`);
    ok("the pest cure's own line in the bag says what it does: rids a plant of its pest, and keeps pests off for 24 hours", /ป้องกันศัตรูพืชต่ออีก 24 ชม\./.test(bag + card), (bag + card).slice(0, 400));
    // and so do the two insects that eat pests, with how often as a number (the owner, 2026-10-07: "แก้ในเกมเลย")
    ok("a ladybird's and a mantis's own lines in the bag say what they do, and how often: 50% and 70%", /เต่าทอง[^]*?สรรพคุณ: ปล่อยบนต้นที่มีศัตรูพืช มีโอกาส 50% ที่จะกินศัตรูพืชให้/.test(bag) && /ตั๊กแตนตำข้าว[^]*?สรรพคุณ: ปล่อยบนต้นที่มีศัตรูพืช มีโอกาส 70% ที่จะกินศัตรูพืชให้/.test(bag) && /ไม่ป้องกันศัตรูพืชต่อ/.test(bag), bag.slice(0, 600));
    await X.shot(`${OUT}/farm-cure-line.png`);
    await X.evaluate(`[...document.querySelectorAll("button")].find((b) => b.title === "กระเป๋า")?.click()`);
    await sleep(400);
    await X.evaluate(`${T}.clearFarm()`);
    await sleep(300);
  }

  // The farm's own insects bring pests on (the owner, 2026-10-06: "ทำให้ % การโจมตีสูงขึ้นถ้ามี แมลงอยู่ในแมพ ฟาร์ม แต่ถ้าไม่มีเลยก็
  // เท่าเดิม … สูงขึ้นเล็กน้อยพอ ซัก 1-2 %"). Six hundred pumpkins sown half an hour before an hour of the pests' began: with
  // that hour counted with no insect, some of them have a pest (three in a hundred); counted with some, a few more;
  // with many, more again; and every one that had one keeps it.
  {
    const B = "window.__townBugs", HOUR = 3600000;
    // (the hours are the check's to say here: the trial does not count them by itself meanwhile)
    await X.evaluate(`(${T}.holdSwarm(true), ${T}.empty(), ${T}.setStamina(100), ${T}.setSwarm(null))`);
    // (an hour of the pests', at least a quarter of an hour in: the clock is put on until it is one)
    const inHours = (ms) => { const h = Math.floor((((ms + 7 * HOUR) % (24 * HOUR)) + 24 * HOUR) % (24 * HOUR) / HOUR); return h >= 8 && h < 18; };
    let now = await X.evaluate(`${T}.now()`);
    for (let i = 0; i < 30 && !(inHours(now) && now % HOUR > 15 * 60000 && now % HOUR < 50 * 60000); i++) { await X.evaluate(`${T}.skipHours(${inHours(now) ? 0.4 : 1})`); now = await X.evaluate(`${T}.now()`); }
    ok("(the clock is in an hour of the pests')", inHours(now), new Date(now).toISOString());
    const h = Math.floor(now / HOUR), sown = h * HOUR - 30 * 60000;
    await X.evaluate(`(() => { for (let x = 132; x < 162; x++) for (let y = 4; y < 24; y++) ${T}.setPlot(x + "," + y, { soil: "tilled", plant: { by: "somebody-else", crop: "pumpkin", sown: ${sown} + ((x * 31 + y) % 600) * 1000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } }); })()`);
    await sleep(900);
    // (read once the page has drawn what was last said of the hours, and twice alike: a busy machine draws late)
    const pests = async () => { let last = ""; for (let i = 0; i < 10; i++) { await sleep(i ? 500 : 1200); const got = JSON.stringify(await X.evaluate(`Object.keys(${F}.plots()).filter((k) => ${F}.seen(k).pest)`)); if (got === last) break; last = got; } return JSON.parse(last); };
    const planted = Object.keys(await X.evaluate(`${F}.plots()`)).length;
    const none = await pests();
    ok("with the hour not counted, a few of the pumpkins have a pest: three in a hundred or so", planted >= 500 && none.length >= 5 && none.length <= planted * 0.07, { planted, none: none.length });
    await X.evaluate(`${T}.setSwarm(0)`);
    ok("counted with no insect on the farm, the same ones and no more", JSON.stringify(await pests()) === JSON.stringify(none));
    await X.evaluate(`${T}.setSwarm(2)`);
    const some = await pests();
    await X.evaluate(`${T}.setSwarm(6)`);
    const many = await pests();
    ok("counted with some insects, a few more plants have one; with many, more again", some.length > none.length && many.length > some.length, { none: none.length, some: some.length, many: many.length });
    ok("…every plant that had a pest has it still: the insects only add", none.every((k) => some.includes(k)) && some.every((k) => many.includes(k)));
    ok("…and only a little: under one plant in twelve even with many", many.length <= planted / 12, { planted, many: many.length });
    // an hour ago counts for nothing here (these were sown since), nor does an hour to come
    await X.evaluate(`(${T}.setSwarm(null), ${T}.setSwarm(9, ${(h - 1) * HOUR}), ${T}.setSwarm(9, ${(h + 1) * HOUR}))`);
    { const beside = await pests(); ok("the hour before and the hour after, counted with many, change nothing of this hour", JSON.stringify(beside) === JSON.stringify(none), { none: none.length, now: beside.length, more: beside.filter((k) => !none.includes(k)).slice(0, 3), swarms: await X.evaluate(`${T}.swarms()`), h, clock: await X.evaluate(`${T}.now()`) }); }
    // a plant that has a pest only for the insects: a cure is offered there, and takes it off
    await X.evaluate(`(${T}.setSwarm(null), ${T}.setSwarm(6))`);
    // (one that is a real plot: the made-up field lies over the grass between the beds too, where nobody is offered anything)
    let lone = null;
    for (const k of many) if (!none.includes(k) && await X.evaluate(`${F}.isPlot(${k})`)) { lone = k; break; }
    ok("(one of the plants with a pest only for the insects stands on a real plot)", lone !== null, many.filter((k) => !none.includes(k)));
    const [lx, ly] = lone.split(",").map(Number);
    await X.evaluate(`${T}.grant("pestCure", 1)`);
    await hold(X, "pestCure");
    await warp(X, lx, ly);
    await until("the cure is offered for it", async () => (await deed(X)) === "cure", 5000);
    await X.evaluate(`${T}.setSwarm(0)`);
    await sleep(700);
    ok("a cure is offered for a plant that has a pest only for the insects, and not when the hour had none", (await deed(X)) === null);
    await X.evaluate(`${T}.setSwarm(6)`);
    await until("the cure is offered again", async () => (await deed(X)) === "cure", 5000);
    await X.evaluate(`${F}.act()`);
    await sleep(500);
    ok("…and takes the pest off", (await seen(X, lone)).pest === false && (await has(X, "pestCure")) === 0);
    // the trial counts an hour as the database does: once, by what is on the farm, less the two that eat pests
    await X.evaluate(`(${T}.clearFarm(), ${T}.setSwarm(null), ${T}.unsetBugs())`);
    await sleep(300);
    const haunts = await X.evaluate(`${B}.haunts().map((x) => ({ id: x.id, place: x.place, kind: x.kind }))`), fields = haunts.filter((x) => x.place === "farm" && x.kind === "field").map((x) => x.id);
    await X.evaluate(`(${T}.setBug(${fields[0]}, "grasshopper"), ${T}.setBug(${fields[1]}, "ladybird"), ${T}.setBug(${fields[2]}, "mantis"), ${T}.setBug(${fields[3]}, "scarab"))`);
    const out = await X.evaluate(`${T}.bugs().map((s) => [s.id, s.bug])`);
    const onFarm = out.filter(([id, bug]) => haunts.find((x) => x.id === id)?.place === "farm" && bug !== "ladybird" && bug !== "mantis").length;
    await X.evaluate(`${T}.swarmNote(true)`);
    let kept = await X.evaluate(`${T}.swarms()`);
    ok("the hour is counted with what is on the farm that nobody has caught, less ladybirds and mantises", kept[h] === onFarm && onFarm >= 2 && out.some(([, bug]) => bug === "ladybird") && out.some(([, bug]) => bug === "mantis"), { kept, onFarm });
    await X.evaluate(`(${T}.setBug(${fields[4]}, "grasshopper"), ${T}.setBug(${fields[5]}, "grasshopper"), ${T}.swarmNote(true))`);
    kept = await X.evaluate(`${T}.swarms()`);
    ok("…once: two more insects come to the farm in the same hour, and it is as it was counted", kept[h] === onFarm && Object.keys(kept).length === 1, kept);
    await X.evaluate(`(${T}.unsetBugs(), ${T}.setSwarm(null), ${T}.clearFarm(), ${T}.holdSwarm(false))`);
    await sleep(300);
  }
  ok("no page errors", X.logs.length === 0 && Y.logs.length === 0, [...X.logs, ...Y.logs]);
} catch (e) { ok("the run", false, e.message + " " + JSON.stringify(X.logs)); } finally { X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
await sleep(900);
process.exit(fail ? 1 : 0);
