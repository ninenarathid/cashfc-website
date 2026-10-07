// The feast table (the owner, 2026-10-07, of a member's "ต้องมีโต๊ะวางอาหารเป็นหลักแหล่งแล้ว ตอนนี้เกลื่อนเมือง"), in a real
// browser on the dev test room: two testers in two tabs, then a phone's screen.
//
// A dish set down in the cooking yard is on the yard's two tables, drawn on their tops; whoever stands on the yard's
// floor is offered the table, and from its panel sets a pot of theirs on it, eats a helping there out of the table's
// own bowl (sitting down at the tables, with no bowl of theirs, and none back afterwards), ladles one into a bowl of
// their own (three bowls to a slot), or takes a pot of theirs back. A pot on the ground stands there an hour and is
// then on the table; the odd dish is gone with its hour, and its card offers to throw it away; one member leaves two
// on the ground; and the table is cleared when the meal's hours after the ones a pot came in are over.
//
//   node town-feast.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes feast-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";
const { KITCHEN, YARD_SEATS, yardFloor } = await import("../../../../lib/town/world.ts");

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", C = "window.__townCook", G = "window.__townGame", K = `document.querySelector("[data-town-kitchen]")`, P = `document.querySelector("[data-feast-panel]")`;
const MINNOW = [["minnow", 3], ["salt", 1]], WRONG = [["minnow", 1]];
const HOUR = 3_600_000, MIN = 60_000;
const TILE = KITCHEN.feast.tile;
/** Tiles of the yard's floor that are no place to cook at, well apart; and tiles of the plaza's ground. */
const places = new Set(KITCHEN.places.map((p) => p.at.join(",")));
const FLOOR = KITCHEN.floor.filter(([x, y]) => !places.has(`${x},${y}`) && !KITCHEN.wash.some(([wx, wy]) => wx === x && wy === y) && !(x === TILE[0] && y === TILE[1]));
const GROUND = [[30, 38], [34, 40], [38, 38]];

const purse = (X) => X.evaluate(`${T}.purse()`);
const holds = async (X, item) => (await purse(X)).bag.filter((s) => s?.item === item).reduce((n, s) => n + s.n, 0);
const pots = (X) => X.evaluate(`${C}.pots().map((p) => ({ id: p.id, dish: p.dish, left: p.left, feast: !!p.feast, at: p.at, by: p.by }))`);
const offers = (X) => X.evaluate(`${C}.offers()`);
const warp = async (X, [x, y]) => { await X.evaluate(`window.__townView.warp(${x}, ${y})`); await sleep(700); };
const panel = (X) => X.evaluate(`!!${P}`);
const said = (X) => X.evaluate(`${P}?.querySelector("[data-feast-said]")?.innerText ?? null`);
const lines = (X) => X.evaluate(`[...(${P}?.querySelectorAll("[data-feast-pot]") ?? [])].map((li) => ({ id: li.dataset.feastPot, dish: li.dataset.dish, left: Number(li.dataset.left), words: li.innerText,
  eat: !li.querySelector("[data-feast-eat]").disabled, ladle: !li.querySelector("[data-feast-ladle]").disabled, take: !!li.querySelector("[data-feast-take]") }))`);
const openTable = async (X) => {
  await until("the table is offered", async () => (await offers(X)).includes("feast"), 8000);
  await X.evaluate(`document.querySelector('[data-cook-offer="feast"]').click()`);
  await until("the table's panel is up", () => panel(X), 4000);
  await sleep(350);
};
/** A real tap on the map, at a point of the canvas. */
async function tapAt(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(400);
}
/** The middle of a dining table's top on the screen, once it is drawn and still: of whichever table is on the screen with nothing of the page over that point. */
async function tableTop(X) {
  let at = null;
  await until("a table's top is drawn on the screen, and still", async () => {
    const now = await X.evaluate(`(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      for (const k of window.__townView.tables()) {
        const x = (k.x0 + k.x1) / 2, y = (k.y0 + k.y1) / 2;
        if (x > 8 && y > 8 && x < r.width - 8 && y < r.height - 8 && document.elementFromPoint(x + r.left, y + r.top)?.tagName === "CANVAS") return { x, y, table: k.table };
      }
      return null;
    })()`);
    const still = !!now && !!at && now.table === at.table && Math.abs(now.x - at.x) < 0.5 && Math.abs(now.y - at.y) < 0.5;
    at = now;
    return still;
  }, 20000, 400);
  return at;
}
/** The X key, as a keyboard gives it. */
const pressX = async (X) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: "x", code: "KeyX", windowsVirtualKeyCode: 88, nativeVirtualKeyCode: 88 }); await sleep(500); };
const meOf = (X) => X.evaluate("window.__cashTown.me()");
const shut = async (X) => { if (await panel(X)) { await X.evaluate(`${P}.querySelector("[data-feast-close]").click()`); await sleep(300); } };
/** A pot of a dish (or of the odd dish) into the bag, by the rule of cooking itself. */
const cooked = async (X, things, name) => {
  await X.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(things)}) ${T}.grant(id, n); ${T}.setStamina(100); })()`);
  return X.evaluate(`(() => { const d = ${T}.cookDo(${JSON.stringify(things)}, ["pan"], 0, ${JSON.stringify(name)}); return d.ok ? { made: d.made, n: d.n } : d; })()`);
};
const potSlot = async (X, dish) => (await purse(X)).bag.findIndex((s) => s?.item === "potFull" && s.of?.dish === dish);
/** The trial's clock put on to a moment (it is the whole browser's: both tabs'). */
const clockTo = async (X, at) => { await X.evaluate(`${T}.skipHours((${at} - ${T}.now()) / ${HOUR})`); await sleep(400); };
const enter = async (X, letter) => {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 20000);
  await until("the kitchen's own code has come", () => X.evaluate(`!!${C}`), 20000);
};

const A = await browser("Feast-A", { width: 1280, height: 860 });
try {
  await enter(A, "F");
  await A.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.setGifts(false))`);
  await sleep(500);
  // noon tomorrow by Bangkok's clock: lunch's hours, so what comes to the table is cleared at five the morning after
  const NOON = (Math.floor((Date.now() + 7 * HOUR) / (24 * HOUR)) + 1) * 24 * HOUR + 12 * HOUR - 7 * HOUR;
  await clockTo(A, NOON);
  await A.evaluate(`${T}.grant("pan", 1)`);
  const dish = await cooked(A, MINNOW, "A"), second = await cooked(A, MINNOW, "A"), odd = await cooked(A, WRONG, "A");
  ok("two pots of a dish and one of the odd dish are cooked: three pots in the bag", dish.made === "friedMinnow" && second.made === "friedMinnow" && dish.n === 2 && odd.made === "oddDish" && (await holds(A, "potFull")) === 3, { dish, second, odd });
  const told = await A.evaluate(`${C}.feast().told`);
  ok("whoever keeps the game has a feast table: six pots a member, an hour on the ground first", told?.pots === 6 && told.ground === 60 && told.tile?.join() === TILE.join(), told);

  console.log("\n── the table, from the yard's floor ──");
  await warp(A, GROUND[0]);
  ok("outside the yard the table is not offered", !(await offers(A)).includes("feast"), await offers(A));
  await warp(A, FLOOR[3]);
  await openTable(A);
  ok("on the yard's floor, with a pot of a dish in the bag, the table is offered and its panel opens with nothing on it", (await lines(A)).length === 0 && (await A.evaluate(`!!${P}.querySelector("[data-feast-empty]")`)), await lines(A));
  const mine = await A.evaluate(`({ set: [...${P}.querySelectorAll("[data-feast-set]")].length, odd: [...${P}.querySelectorAll("[data-feast-odd]")].length, words: ${P}.querySelector("[data-feast-mine]")?.innerText })`);
  ok("the pots in my bag are listed: each dish to be set on the table, the odd dish with a word that the table does not take it", mine.set === 2 && mine.odd === 1 && /โต๊ะไม่รับอาหารแปลก/.test(mine.words), mine);
  await A.shot(`${OUT}/feast-panel-empty.png`);
  await A.evaluate(`${P}.querySelector("[data-feast-set]").click()`);
  await until("the pot is on the table", async () => (await pots(A)).some((p) => p.feast), 5000);
  await sleep(300);
  let stand = await pots(A);
  ok("a tap sets the dish on the table: out of the bag, on the table, said to stand on the table's tile", stand.length === 1 && stand[0].feast && stand[0].dish === "friedMinnow" && stand[0].left === dish.n && stand[0].at.join() === TILE.join() && (await holds(A, "potFull")) === 2, stand);
  ok("…and the panel says until when it stands there: five the next morning", /โต๊ะเลี้ยง/.test(await said(A)) && /05:00/.test(await said(A)), await said(A));
  let list = await lines(A);
  ok("the pot is a line of the table's: its dish, its helpings, mine, until when, and mine to take back", list.length === 1 && list[0].dish === "friedMinnow" && list[0].left === dish.n && /ของฉัน/.test(list[0].words) && /05:00/.test(list[0].words) && list[0].take, list);
  ok("…with no bowl of my own it can be eaten at the table, and not ladled", list[0].eat === true && list[0].ladle === false, list[0]);
  await A.shot(`${OUT}/feast-panel.png`);
  await shut(A);
  await sleep(600);
  await A.shot(`${OUT}/feast-table.png`);
  let top = await tableTop(A);
  await tapAt(A, top.x, top.y);
  await until("the panel is up", () => panel(A), 6000).catch(() => {});
  ok("a tap on a table's top, standing in the yard, opens the table's panel where one stands", (await panel(A)) && (await lines(A)).length === 1 && !(await A.evaluate("window.__townView.self().moving")), await lines(A));
  await shut(A);

  console.log("\n── another member eats at the table, out of the table's own bowl ──");
  const B = await A.tab("Feast-B");
  await enter(B, "G");
  await B.evaluate(`(${T}.setGifts(false), ${T}.setStamina(10))`);
  ok("somebody with an empty bag stands in the plaza: the table is not theirs to open from there", !(await offers(B)).includes("feast") && (await purse(B)).bag.every((s) => !s), await offers(B));
  // (a tap on a table from just inside the yard's way in: the way in is of the yard's floor, so the panel opens there. From outside the yard is a house, and its tables are not to be tapped.)
  await warp(B, KITCHEN.way[0]);
  await sleep(1500);
  top = await tableTop(B);
  await tapAt(B, top.x, top.y);
  await until("the panel is up", () => panel(B), 20000).catch(() => {});
  const stoodAt = await B.evaluate("window.__townView.self()");
  ok("a tap on a table's top from the yard's way in opens the table's panel for whoever stands there, with an empty bag too", (await panel(B)) && !stoodAt.moving && yardFloor(Math.floor(stoodAt.x), Math.floor(stoodAt.y)), stoodAt);
  list = await lines(B);
  ok("on the yard's floor they are offered the table, and read the pot with its cook's name", list.length === 1 && /โดย/.test(list[0].words) && !list[0].take && list[0].eat && !list[0].ladle, list);
  await shut(B);
  // sat down at a place of a table (the middle of a near bench: their back to the viewer) with food on the table
  const NEAR = KITCHEN.seats.findIndex((x) => x.back && x.table === 0) + 1, meId = (await meOf(B)).id;
  await B.evaluate(`window.__cashTown.sitOn(${YARD_SEATS + NEAR})`);
  await until("they sit there", async () => (await meOf(B)).sit === YARD_SEATS + NEAR && !(await B.evaluate("window.__townView.self().moving")), 20000);
  await until("the panel is up", () => panel(B), 6000).catch(() => {});
  ok("sitting down at a table that has food on it brings the table's panel up by itself", (await panel(B)) && (await lines(B)).length === 1 && (await lines(B))[0].eat, await lines(B));
  ok("…and while one sits there is a button to get up by", await B.evaluate(`!!document.querySelector("[data-stand-up]")`));
  await B.evaluate(`${P}.querySelector("[data-feast-eat]").click()`);
  await until("the meal has begun", async () => !!(await purse(B)).eating, 8000);
  let p = await purse(B);
  ok("\"eat at the table\", already sat: the helping is begun where they sit, out of the table's bowl, with no walk", p.eating?.dish === "friedMinnow" && p.eating.lent === true && !(await panel(B))
    && (await meOf(B)).sit === YARD_SEATS + NEAR, { eating: p.eating, sit: (await meOf(B)).sit });
  // a slip of the finger on the map at a meal: nobody is walked off their seat or out of their meal, they only turn that way
  // (where they are drawn is their place at the table, not the floor tile they walked to: the taps are to either side of the place)
  const seatBox = (await B.evaluate("window.__townView.benches()")).find((k) => k.i === YARD_SEATS + NEAR), at = { x: (seatBox.x0 + seatBox.x1) / 2, y: seatBox.y1 };
  await tapAt(B, at.x - 150, at.y + 60);
  let now = await meOf(B);
  ok("a tap on the ground to the left of somebody sat at a meal walks them nowhere: still sat, still eating, turned to the left", now.sit === YARD_SEATS + NEAR && now.turn === 2 && !!(await purse(B)).eating && !(await B.evaluate("window.__townView.self().moving")), now);
  await tapAt(B, at.x + 150, at.y + 60);
  now = await meOf(B);
  ok("…and one to the right turns them to the right", now.sit === YARD_SEATS + NEAR && now.turn === 1 && !!(await purse(B)).eating, now);
  ok("…which the other page is told", (await until("the other page", async () => (await A.evaluate(`window.__cashTown.people().find((x) => x.id === ${JSON.stringify(meId)})?.turn`)) === 1, 8000).catch(() => false)) === true,
    await A.evaluate(`window.__cashTown.people().find((x) => x.id === ${JSON.stringify(meId)})`));
  ok("…with nothing in the bag: no helping, no bowl", p.bag.every((s) => !s), p.bag.filter(Boolean));
  ok("…and the pot a helping the less, for both", (await pots(B))[0]?.left === dish.n - 1 && (await until("the cook's page knows", async () => (await pots(A))[0]?.left === dish.n - 1, 8000)) === true, { b: await pots(B), a: await pots(A) });
  await sleep(700);
  await B.shot(`${OUT}/feast-eating.png`);
  await clockTo(B, NOON + 6 * MIN);
  await until("the meal is eaten up", async () => !(await purse(B)).eating, 15000);
  p = await purse(B);
  ok("eaten up: its stamina had, and no bowl in the bag nor owed", p.stamina.left > 10 && p.bag.every((s) => !s) && !p.owed, { stamina: p.stamina, owed: p.owed, bag: p.bag.filter(Boolean) });
  // the key to get up and to sit down, and the button
  await pressX(B);
  ok("the X key gets somebody who sits up", (await meOf(B)).sit === -1 && !(await B.evaluate(`!!document.querySelector("[data-stand-up]")`)), await meOf(B));
  await pressX(B);
  await until("sat again", async () => ((await meOf(B)).sit ?? -1) !== -1, 15000).catch(() => {});
  ok("…and sits them down again, on the nearest seat", ((await meOf(B)).sit ?? -1) !== -1 && ((await meOf(B)).turn ?? 0) === 0, await meOf(B));
  await sleep(500);
  await B.evaluate(`document.querySelector("[data-stand-up]")?.click()`);
  await sleep(400);
  ok("the button that is there while one sits gets them up too", (await meOf(B)).sit === -1, await meOf(B));
  await shut(B);

  console.log("\n── bowls of one's own, three to a slot ──");
  await B.evaluate(`${T}.grant("bowl", 3)`);
  p = await purse(B);
  ok("three bowls sit in one slot of the bag", p.bag.filter(Boolean).length === 1 && p.bag.find(Boolean)?.item === "bowl" && p.bag.find(Boolean)?.n === 3, p.bag.filter(Boolean));
  await B.evaluate(`window.__cashTown.standUp?.()`);
  await sleep(400);
  await openTable(B);
  list = await lines(B);
  ok("with a bowl of their own the pot can be ladled from too", list[0]?.ladle === true, list[0]);
  await B.evaluate(`${P}.querySelector("[data-feast-ladle]").click()`);
  await until("a helping is in the bag", async () => (await holds(B, "friedMinnow")) === 1, 5000);
  await sleep(400);
  p = await purse(B);
  ok("ladled into a bowl of one's own: the helping in the bag, the slot of bowls a bowl the less, and the panel says so", (await holds(B, "bowl")) === 2 && (await holds(B, "friedMinnow")) === 1 && /ถ้วย/.test((await said(B)) ?? ""), { bag: p.bag.filter(Boolean), said: await said(B) });
  ok("that was the pot's last helping: it is gone from the table, for both", (await pots(B)).length === 0 && (await lines(B)).length === 0 && (await until("the cook's page knows", async () => (await pots(A)).length === 0, 8000)) === true, { b: await pots(B), a: await pots(A) });
  await shut(B);

  console.log("\n── its cook takes a pot back; the ground, an hour, and the table's end ──");
  await openTable(A);
  await A.evaluate(`${P}.querySelector("[data-feast-set]").click()`);
  await until("the second pot is on the table", async () => (await pots(A)).length === 1, 5000);
  await sleep(300);
  await A.evaluate(`${P}.querySelector("[data-feast-take]").click()`);
  await until("the pot is back in the bag", async () => (await holds(A, "potFull")) === 2, 5000);
  await sleep(300);
  ok("the cook takes a pot back from the table's panel, with what is in it, and the panel says so", (await pots(A)).length === 0 && (await purse(A)).bag.some((s) => s?.item === "potFull" && s.of?.dish === "friedMinnow" && s.of.left === second.n) && /กระเป๋า/.test((await said(A)) ?? ""), { bag: (await purse(A)).bag.filter(Boolean), said: await said(A) });
  await shut(A);
  // (on the ground, outside the yard: the dish and the odd dish; and a third pot, which is one too many)
  await clockTo(A, NOON + 30 * MIN);
  const T0 = await A.evaluate(`${T}.now()`);
  const d1 = await A.evaluate(`${T}.potDown(${JSON.stringify(GROUND[0])}, ${await potSlot(A, "friedMinnow")})`), d2 = await A.evaluate(`${T}.potDown(${JSON.stringify(GROUND[1])}, ${await potSlot(A, "oddDish")})`);
  await cooked(A, MINNOW, "A");
  const d3 = await A.evaluate(`${T}.potDown(${JSON.stringify(GROUND[2])}, ${await potSlot(A, "friedMinnow")})`);
  ok("two pots are set down on the ground outside the yard, each where its cook stood, and a third is one too many", d1.ok && !d1.pot.feast && d2.ok && !d2.pot.feast && d1.pot.at.join() === GROUND[0].join() && d3.ok === false && d3.why === "many", { d1, d2, d3 });
  await warp(A, GROUND[2]);
  await sleep(500);
  await A.shot(`${OUT}/feast-ground.png`);
  await clockTo(A, T0 + 59 * MIN);
  stand = await pots(A);
  ok("a minute short of its hour both stand on the ground still", stand.length === 2 && stand.every((o) => !o.feast), stand);
  await clockTo(A, T0 + 61 * MIN);
  await until("the hour is up on the page", async () => (await pots(A)).length === 1, 12000);
  stand = await pots(A);
  ok("as its hour ends the dish is on the table and the odd dish is gone", stand.length === 1 && stand[0].feast && stand[0].dish === "friedMinnow" && stand[0].at.join() === TILE.join(), stand);
  ok("…for the other member too", (await until("the other page knows", async () => { const o = await pots(B); return o.length === 1 && o[0].feast; }, 12000)) === true, await pots(B));
  // set down in the yard with the pot in the hand: the map's own offer says where it goes, and what is said afterwards says until when
  await A.evaluate(`${T}.hold(${await potSlot(A, "friedMinnow")})`);
  await warp(A, FLOOR[5]);
  await until("setting it down is offered", async () => (await offers(A)).includes("down"), 8000);
  const word = await A.evaluate(`document.querySelector('[data-cook-offer="down"]').innerText.replace(/\\s*Space\\s*$/i, "").trim()`);
  ok("with a pot of a dish in the hand in the yard, the offer says it goes on the feast table", /บนโต๊ะเลี้ยง/.test(word), word);
  await A.evaluate(`document.querySelector('[data-cook-offer="down"]').click()`);
  await until("it is on the table", async () => (await pots(A)).filter((o) => o.feast).length === 2, 5000);
  await until("the panel is up", () => panel(A), 5000).catch(() => {});
  const note = await said(A);
  ok("…and once it is set there the table's panel opens with it on it, and says how long it stands", (await panel(A)) && (await lines(A)).length === 2 && /โต๊ะเลี้ยง/.test(note ?? "") && /05:00/.test(note ?? ""), note);
  await sleep(500);
  await A.shot(`${OUT}/feast-two.png`);
  // from outside the yard, under its roof: a few words over the house say there is food
  await warp(A, [TILE[0] - 1, TILE[1] + 9]);
  await sleep(1800);
  await A.shot(`${OUT}/feast-outside.png`);
  // the table's end
  const ENDS = NOON + 17 * HOUR;
  await clockTo(A, ENDS - MIN);
  ok("a minute before five the next morning both are on the table still", (await pots(A)).length === 2, await pots(A));
  await clockTo(A, ENDS + MIN);
  await until("the table is cleared on the page", async () => (await pots(A)).length === 0, 12000);
  ok("as breakfast's hours begin the table is cleared, whatever was left", (await pots(A)).length === 0 && (await pots(B)).length === 0, { a: await pots(A), b: await pots(B) });

  console.log("\n── the card of what was cooked, in the yard ──");
  await A.evaluate(`(${T}.reset(), ${T}.setGifts(false), ${T}.grant("pan", 1), ${T}.grant("bowl", 1))`);
  await sleep(400);
  const stove = (await A.evaluate(`${C}.places()`)).find((x) => x.kind === "stove").at;
  const cookAt = async (things) => {
    await A.evaluate(`(() => { for (const [id, n] of ${JSON.stringify(things)}) ${T}.grant(id, n); ${T}.setStamina(100); })()`);
    await warp(A, stove);
    await until("cooking is offered", async () => (await offers(A)).includes("cook"), 8000);
    await A.evaluate(`${C}.act("cook")`);
    await until("the kitchen table is laid", () => A.evaluate(`!!${K}`), 5000);
    await sleep(500);
    await A.evaluate(`${K}.querySelector('[data-kitchen-tool="pan"]').click()`);
    await sleep(250);
    await A.evaluate(`${C}.put(${JSON.stringify(things)})`);
    await sleep(300);
    await A.evaluate(`${K}.querySelector("[data-kitchen-go]").click()`);
    await until("the game is laid", () => A.evaluate(`!!${G}`), 5000);
    await A.evaluate(`${G}.drive(0.9)`);
    await until("the go is over", () => A.evaluate(`!!${K}?.querySelector("[data-kitchen-came]")`), 40000);
    await sleep(300);
  };
  await cookAt(MINNOW);
  let card = await A.evaluate(`({ down: ${K}.querySelector("[data-kitchen-down]")?.innerText.trim(), pour: !!${K}.querySelector("[data-kitchen-pour]") })`);
  ok("the card of a dish cooked in the yard offers to set it on the feast table, and nothing to throw away", /โต๊ะเลี้ยง/.test(card.down ?? "") && !card.pour, card);
  await A.shot(`${OUT}/feast-card.png`);
  await A.evaluate(`${K}.querySelector("[data-kitchen-down]").click()`);
  await until("the kitchen table is put away", () => A.evaluate(`!${K}`), 5000);
  await until("the feast table's panel is up", () => panel(A), 5000).catch(() => {});
  stand = await pots(A);
  list = await lines(A);
  ok("…and does: the pot just cooked is on the table, and the table's panel opens with it, to eat from at once", stand.length === 1 && stand[0].feast && stand[0].dish === "friedMinnow"
    && list.length === 1 && list[0].eat && /โต๊ะเลี้ยง/.test((await said(A)) ?? ""), { stand, list, said: await said(A) });
  await A.shot(`${OUT}/feast-after-card.png`);
  await shut(A);
  await cookAt(WRONG);
  card = await A.evaluate(`({ came: ${K}.querySelector("[data-kitchen-came]")?.dataset.kitchenCame, down: ${K}.querySelector("[data-kitchen-down]")?.innerText.trim(), pour: ${K}.querySelector("[data-kitchen-pour]")?.innerText.trim() })`);
  ok("the card of the odd dish offers no table: to set it down, or to throw it away", card.came === "odd" && !/โต๊ะเลี้ยง/.test(card.down ?? "x") && /ทิ้ง/.test(card.pour ?? ""), card);
  await A.shot(`${OUT}/feast-card-odd.png`);
  await A.evaluate(`${K}.querySelector("[data-kitchen-pour]").click()`);
  await until("the kitchen table is put away", () => A.evaluate(`!${K}`), 5000);
  await sleep(300);
  ok("thrown away, the odd pot is out of the bag and no pot stands for it", (await holds(A, "potFull")) === 0 && (await pots(A)).length === 1, { bag: (await purse(A)).bag.filter(Boolean), pots: await pots(A) });

  console.log("\n── a phone ──");
  await A.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 780, deviceScaleFactor: 2, mobile: true });
  await sleep(600);
  await warp(A, FLOOR[4]);
  await openTable(A);
  const box = await A.evaluate(`(() => { const r = ${P}.getBoundingClientRect(), b = [...${P}.querySelectorAll("[data-feast-eat], [data-feast-ladle]")].map((x) => x.getBoundingClientRect()); return { x0: r.left, x1: r.right, y1: r.bottom, w: innerWidth, h: innerHeight, small: Math.min(...b.map((x) => x.height)) }; })()`);
  ok("on a phone the table's panel is within the screen and its buttons a finger's size", box.x0 >= 0 && box.x1 <= box.w + 0.5 && box.y1 <= box.h + 0.5 && box.small >= 44, box);
  await A.shot(`${OUT}/feast-phone.png`);
  ok("no page errors on either page", A.errors().length === 0 && B.errors().length === 0, [...A.errors(), ...B.errors()]);
} catch (e) {
  fail++;
  console.log(`  FAIL the check fell over: ${e.message}`);
  await A.shot(`${OUT}/feast-fell.png`).catch(() => {});
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await A.quit?.();
}
process.exit(fail ? 1 : 0);
