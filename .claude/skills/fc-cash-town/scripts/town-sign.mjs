// Cash Town's signs held up over a head (lib/town/sign), tried in a real browser on the dev test room (the trial kept
// in the browser, `next dev` only), by three testers in three tabs of one browser, who share its stalls:
//
// - the emote window offers a sign; its panel offers a chat room or a stall, a title, and for a stall its lines:
//   things of my bag to sell, and things wanted from among those the village has met; walking, no sign is held up;
// - held up, the board is drawn over my head on everybody's map, and says what it is;
// - another tester taps the board from far off, walks up, and has the stall's panel: buys some of what it sells and
//   brings some of what it wants; things and coins change hands at once, all of the coins (nothing is kept back);
//   the stall's keeper is told, and their own panel counts it; from too far, or with too few coins, nothing is done;
// - whoever holds a sign up, looks at a stall or is in a chat room stays where they are: a tap on the ground walks
//   none of them and says why; the sign is taken down, the stall's panel closed and the room left each by its own
//   button, and then one walks again; a stall whose sign is down is shut; one with nothing left takes its own down;
// - what the uncle sells may be asked more for at a stall than he asks, up to the stall's own most and no further;
// - a chat room: somebody near taps the board and is let in, the board says how many are in; what is typed in the
//   room is read by those in it and by nobody else, while the town's own chat is still everybody's; with microphones
//   on, those in the room have a voice line with each other and with nobody else, and whoever is outside with nobody
//   in it; its holder lets somebody go, who is not let back in; its holder closing it ends it for everybody;
// - on a phone the panel is within the screen.
//
// Prints PASS/FAIL lines and writes screenshots to <outdir>.
//
//   node town-sign.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", V = "window.__townView", C = "window.__cashTown", S = "window.__townSign", K = "window.__townKeeper";
const purse = (X) => X.evaluate(`${T}.purse()`);
const count = (bag, item) => bag.reduce((t, s) => t + (s?.item === item ? s.n : 0), 0);
const there = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const textOf = (X, sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.innerText ?? null`);
const click = async (X, sel) => { const did = await X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`); await sleep(300); return did; };
const me = (X) => X.evaluate(`${C}.me().id`);
const self = (X) => X.evaluate(`${V}.self()`);
const tile = async (X) => { const a = await self(X); return [Math.floor(a.x), Math.floor(a.y)]; };
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(700); };
const stopped = (X) => until("stopped walking", async () => !(await self(X)).moving, 30000, 200);
/** Type into a box as a person does, so that React hears it. */
const type = (X, sel, text) => X.evaluate(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; set.call(el, ${JSON.stringify(text)}); el.dispatchEvent(new Event("input", { bubbles: true })); })()`);
/** Tap a point of the map (counted from the map's own corner), as a finger or a mouse does. */
async function tap(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`), x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const kind of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type: kind, x, y, button: "left", clickCount: 1 });
}
/** Tap somebody's board on my map, with the map turned to where they stand. */
async function tapSign(X, id) {
  const at = await X.evaluate(`${V}.at(${JSON.stringify(id)})`);
  await X.evaluate(`void ${V}.lookAt(${at.x}, ${at.y})`);
  await sleep(600);
  const b = await X.evaluate(`${V}.signs().find((s) => s.id === ${JSON.stringify(id)}) ?? null`);
  if (!b) return false;
  await tap(X, b.x, b.y);
  await sleep(300);
  return true;
}
/** Tap a tile of the ground, with the map turned to it (it is then at the map's middle, clear of every panel). */
async function tapGround(X, x, y) {
  await X.evaluate(`void ${V}.lookAt(${x + 0.5}, ${y + 0.5})`);
  await sleep(500);
  const mid = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2 }; })()`);
  await tap(X, mid.x, mid.y);
  await sleep(500);
}
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=signs&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
  await until("the sign's own code has come", () => X.evaluate(`!!${S}`), 30000);
}
const signOf = (X) => X.evaluate(`${C}.sign()`);
const seenOf = (X, id) => X.evaluate(`${C}.people().find((p) => p.id === ${JSON.stringify(id)}) ?? null`);
const lines = (X) => X.evaluate(`${C}.lineTo()`);

// (ground one may stand on, checked as the script begins: a lamp or a bench closes a tile)
const HERE = [30, 38], NEAR = [31, 40], FAR = [44, 31], BY = [28, 40], OPEN = [29, 42];
const X = await browser("Sign", { width: 1280, height: 860 });
try {
  /* ── holding one up ── */
  await enter(X, "A");
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(400);
  await X.evaluate(`(${T}.resize(10), ${T}.grant("kangkong", 12), ${T}.grant("minnow", 3), ${T}.grant("carp", 2, 80))`);
  for (const [name, t] of Object.entries({ HERE, NEAR, FAR, BY, OPEN })) if (!(await X.evaluate(`${V}.walkable(${t[0]}, ${t[1]})`))) throw new Error(`the check's tile ${name} (${t}) cannot be stood on: choose another`);
  await warp(X, ...HERE);
  const A = await me(X);
  // (the tap the rest of the check holds people to: with nothing held up, it walks)
  await tapGround(X, ...OPEN);
  ok("a tap on the ground walks me, as ever", (await self(X)).moving || Math.floor((await self(X)).x) !== HERE[0]);
  await stopped(X);
  await warp(X, ...HERE);
  await click(X, 'button[title="ท่าทาง"]');
  ok("the emote window offers a sign", await there(X, "[data-emote-sign]"));
  await click(X, "[data-emote-sign]");
  ok("which opens the panel that holds one up, on a chat room", (await there(X, '[data-sign-panel="setup"]')) && (await X.evaluate(`document.querySelector('[data-sign-kind="chat"]').getAttribute("aria-checked")`)) === "true");
  ok("a stall is offered too, where whoever keeps the game knows of stalls", await X.evaluate(`!document.querySelector('[data-sign-kind="shop"]').disabled`));
  await click(X, '[data-sign-kind="shop"]');
  ok("a stall with nothing on it cannot be held up", await X.evaluate(`document.querySelector("[data-sign-raise]").disabled`));
  await click(X, '[data-sign-add="sell"]');
  const mine = await X.evaluate(`[...document.querySelectorAll("[data-sign-picker] [data-item]")].map((b) => b.dataset.item).sort()`);
  ok("to sell: what is in my bag, and nothing else", JSON.stringify(mine) === JSON.stringify(["carp", "kangkong", "minnow"]), mine);
  await click(X, '[data-sign-picker] [data-item="kangkong"]');
  const first = await X.evaluate(`(() => { const l = document.querySelector('[data-sign-lines] [data-line="kangkong"]'); return l ? { n: l.querySelector("[data-line-n]").value, price: l.querySelector("[data-line-price]").value } : null; })()`);
  ok("a thing picked is a line, of all I hold of it, at what the relatives pay", first?.n === "12" && Number(first?.price) >= 1, first);
  await click(X, '[data-sign-add="buy"]');
  const met = await X.evaluate(`[...document.querySelectorAll("[data-sign-picker] [data-item]")].map((b) => b.dataset.item)`);
  ok("wanted: only what the village has met (and not what is on the stall already)", met.includes("minnow") && !met.includes("catfish") && !met.includes("kangkong") && met.length > 3, met);
  // (the rest of the form by the panel's own handle: the same state its boxes set)
  await X.evaluate(`void ${S}.form("shop", "ผักสดจากสวน", [{ kind: "sell", item: "kangkong", n: 10, price: 4 }, { kind: "buy", item: "minnow", n: 5, price: 6 }])`);
  await sleep(300);
  ok("the board is shown as it will read: both marks, and the title", /ขาย/.test(await textOf(X, "[data-sign-board]")) && /รับซื้อ/.test(await textOf(X, "[data-sign-board]")) && /ผักสดจากสวน/.test(await textOf(X, "[data-sign-board]")), await textOf(X, "[data-sign-board]"));
  ok("and what all that is wanted comes to", /30/.test(await textOf(X, "[data-sign-wanted]")), await textOf(X, "[data-sign-wanted]"));
  await X.shot(`${OUT}/sign-setup.png`);
  // walking, no sign is held up
  await X.evaluate(`${V}.walk(${FAR[0]}, ${FAR[1]})`);
  await click(X, "[data-sign-raise]");
  ok("walking, no sign is held up, and the panel says why", (await signOf(X)) === null && /หยุดเดิน/.test((await textOf(X, "[data-sign-said]")) ?? ""), await textOf(X, "[data-sign-said]"));
  await warp(X, ...HERE);
  await click(X, "[data-sign-raise]");
  await until("the sign is up", async () => (await signOf(X))?.kind === "shop", 8000, 200).catch(() => {});
  const up = await signOf(X);
  ok("standing still it is held up: a stall that sells and buys, by its title", up?.kind === "shop" && up.sells && up.buys && up.title === "ผักสดจากสวน", up);
  ok("its panel is my own sign's now, with both lines and nothing taken yet", (await there(X, '[data-sign-panel="mine"]')) && (await X.evaluate(`document.querySelectorAll("[data-sign-mine] [data-line]").length`)) === 2 && (await X.evaluate(`document.querySelector("[data-sign-took]").dataset.signTook`)) === "0");
  const before = await purse(X);
  ok("and nothing has left my bag or my purse for it", count(before.bag, "kangkong") === 12 && before.coins === 80, { kangkong: count(before.bag, "kangkong"), coins: before.coins });
  await click(X, "[data-sign-close]");
  await sleep(400);
  ok("the board is drawn over my head", (await X.evaluate(`${V}.signs().some((s) => s.id === ${JSON.stringify(A)} && s.w > 60)`)));
  await X.shot(`${OUT}/sign-held.png`);

  /* ── somebody comes to the stall ── */
  const Y = await X.tab("SignB");
  await enter(Y, "B");
  await Y.evaluate(`(${T}.resize(10), ${T}.grant("minnow", 4, 50))`);
  const startB = await purse(Y);
  await warp(Y, ...FAR);
  const B = await me(Y);
  await until("B has heard of A's sign", async () => (await seenOf(Y, A))?.sign === "s3|ผักสดจากสวน", 15000).catch(() => {});
  ok("another tester is told of the sign", (await seenOf(Y, A))?.sign === "s3|ผักสดจากสวน", await seenOf(Y, A));
  ok("from far off the stall is not theirs to buy at", (await Y.evaluate(`${K}.shopBuy(${JSON.stringify(A)}, "kangkong", 1, [${FAR}])`)).why === "far");
  ok("a tap on the board, from far off, walks up to it", (await tapSign(Y, A)) && (await self(Y)).moving);
  await stopped(Y);
  await until("the stall's panel opens", () => there(Y, '[data-sign-panel="visit"]'), 6000, 200).catch(() => {});
  const stood = await tile(Y);
  ok("and there the stall's panel opens, with me beside it", (await there(Y, '[data-sign-panel="visit"]')) && Math.max(Math.abs(stood[0] - HERE[0]), Math.abs(stood[1] - HERE[1])) <= 3, stood);
  await until("the stall has been read", async () => (await Y.evaluate(`document.querySelectorAll("[data-sign-stall] [data-line]").length`)) === 2, 6000, 200).catch(() => {});
  const told = await Y.evaluate(`${S}.seen()`);
  ok("it sells ten kangkong at four and wants five minnows at six", JSON.stringify(told?.told?.lines) === JSON.stringify([{ kind: "sell", item: "kangkong", price: 4, can: 10 }, { kind: "buy", item: "minnow", price: 6, can: 5 }]), told);
  await Y.shot(`${OUT}/sign-stall.png`);
  // three kangkong, by the panel's own buttons
  for (let i = 0; i < 2; i++) await click(Y, '[data-stall-side="sell"] [data-line="kangkong"] button[aria-label="เพิ่มจำนวน"]');
  await click(Y, '[data-stall-side="sell"] [data-line="kangkong"] [data-line-do]');
  await until("the sale is done", async () => count((await purse(Y)).bag, "kangkong") === 3, 6000, 200).catch(() => {});
  const b1 = await purse(Y), a1 = await purse(X);
  ok("three bought: the things are mine at once, and twelve coins have left my purse", count(b1.bag, "kangkong") === 3 && b1.coins === startB.coins - 12, { kangkong: count(b1.bag, "kangkong"), coins: b1.coins });
  ok("all twelve are the keeper's: nothing is kept back", a1.coins === 92 && count(a1.bag, "kangkong") === 9, { coins: a1.coins, kangkong: count(a1.bag, "kangkong") });
  await until("the keeper is told", async () => /\+12/.test((await textOf(X, "[data-sign-toast]")) ?? ""), 8000, 200).catch(() => {});
  ok("the stall's keeper is told at once, wherever they look", /\+12/.test((await textOf(X, "[data-sign-toast]")) ?? ""), await textOf(X, "[data-sign-toast]"));
  // four minnows brought
  await Y.evaluate(`void ${S}.trade("minnow", 4)`);
  await until("the minnows are brought", async () => count((await purse(Y)).bag, "minnow") === 0, 6000, 200).catch(() => {});
  const b2 = await purse(Y), a2 = await purse(X);
  ok("four minnows brought: they are the keeper's, and twenty-four coins mine", count(b2.bag, "minnow") === 0 && b2.coins === b1.coins + 24 && count(a2.bag, "minnow") === 7 && a2.coins === 92 - 24, { b: b2.coins, a: a2.coins, minnow: count(a2.bag, "minnow") });
  await X.evaluate(`void ${S}.open("mine")`);
  await sleep(600);
  const kept = await X.evaluate(`({ left: [...document.querySelectorAll("[data-sign-mine] [data-line]")].map((l) => [l.dataset.line, Number(l.dataset.left)]), took: document.querySelector("[data-sign-took]").dataset.signTook, paid: document.querySelector("[data-sign-paid]").dataset.signPaid })`);
  ok("the keeper's own panel counts it: seven and one left, twelve taken, twenty-four paid", JSON.stringify(kept) === JSON.stringify({ left: [["kangkong", 7], ["minnow", 1]], took: "12", paid: "24" }), kept);
  await X.shot(`${OUT}/sign-mine.png`);
  await click(X, "[data-sign-close]");
  ok("more than my coins buy is refused, with nothing changed", (await Y.evaluate(`${T}.grant("minnow", 0, -${b2.coins - 3})`), (await Y.evaluate(`${K}.shopBuy(${JSON.stringify(A)}, "kangkong", 1, [${stood}])`)).why === "coins") && count((await purse(X)).bag, "kangkong") === 9);
  await Y.evaluate(`${T}.grant("minnow", 0, 60)`);
  // whoever looks at a stall, and whoever keeps one, stays put: a tap on the ground walks neither
  const yWas = await self(Y);
  await tapGround(Y, ...OPEN);
  const yIs = await self(Y);
  ok("looking at a stall, a tap on the ground does not walk me: its panel stays, and I am told why", !yIs.moving && yIs.x === yWas.x && yIs.y === yWas.y && (await there(Y, '[data-sign-panel="visit"]')) && /ปิดหน้าร้าน/.test((await textOf(Y, "[data-stuck-note]")) ?? ""), { yIs, note: await textOf(Y, "[data-stuck-note]") });
  ok("nor does anything else that would", (await Y.evaluate(`${V}.walk(${NEAR[0]}, ${NEAR[1]})`)) === false && (await Y.evaluate(`${V}.stuck()`)) === "stall");
  await click(Y, "[data-sign-close]");
  ok("its panel closed, I walk again", (await Y.evaluate(`${V}.stuck()`)) === null && (await Y.evaluate(`${V}.walk(${NEAR[0]}, ${NEAR[1]})`)) === true);
  await stopped(Y);
  const xWas = await self(X);
  await tapGround(X, ...OPEN);
  const xIs = await self(X);
  ok("holding a sign up, a tap on the ground does not walk me: the sign stays up, and I am told why", !xIs.moving && xIs.x === xWas.x && xIs.y === xWas.y && (await signOf(X))?.kind === "shop" && /เก็บป้าย/.test((await textOf(X, "[data-stuck-note]")) ?? ""), { xIs, note: await textOf(X, "[data-stuck-note]") });
  await X.shot(`${OUT}/sign-stuck.png`);
  await X.evaluate(`void ${S}.open("mine")`);
  await sleep(300);
  await click(X, "[data-sign-lower]");
  ok("the sign is taken down by its own button", (await signOf(X)) === null);
  await until("B sees it gone", async () => !(await seenOf(Y, A))?.sign, 8000, 200).catch(() => {});
  ok("on everybody's map", !(await seenOf(Y, A))?.sign && !(await Y.evaluate(`${V}.signs().some((s) => s.id === ${JSON.stringify(A)})`)));
  ok("and the stall is shut: nothing is bought at it", (await X.evaluate(`${S}.shops().mine`)) === null && (await Y.evaluate(`${K}.shopBuy(${JSON.stringify(A)}, "kangkong", 1, [${await tile(Y)}])`)).why === "shut");
  ok("with the sign down I walk again", (await X.evaluate(`${V}.walk(${BY[0]}, ${BY[1]})`)) === true);
  await stopped(X);
  // a stall with nothing left takes its own sign down
  await X.evaluate(`void ${S}.form("shop", "ปลาสด", [{ kind: "sell", item: "carp", n: 2, price: 5 }])`);
  await sleep(300);
  await X.evaluate(`void ${S}.raise()`);
  await until("the second stall is up", async () => (await signOf(X))?.title === "ปลาสด", 8000, 200).catch(() => {});
  ok("a stall that only sells says only that", JSON.stringify(await signOf(X)) === JSON.stringify({ kind: "shop", title: "ปลาสด", n: 0, sells: true, buys: false }), await signOf(X));
  await warp(Y, BY[0] + 1, BY[1]);
  await sleep(500);
  const bought = await Y.evaluate(`${K}.shopBuy(${JSON.stringify(A)}, "carp", 2, [${BY[0] + 1}, ${BY[1]}])`);
  await until("the sign comes down by itself", async () => (await signOf(X)) === null, 12000, 300).catch(() => {});
  ok("both carp bought: the stall has nothing left and takes its own sign down", bought.ok && (await signOf(X)) === null && /หมดแล้ว/.test((await textOf(X, "[data-sign-toast]")) ?? ""), { bought, sign: await signOf(X), toast: await textOf(X, "[data-sign-toast]") });

  /* ── what the uncle sells, for more than he asks ── */
  // (he sells a worm for two, and his relatives pay one: a stall's most for it is ten)
  await X.evaluate(`${T}.grant("worm", 6)`);
  await X.evaluate(`void ${S}.open("setup")`);
  await sleep(300);
  await X.evaluate(`void ${S}.form("shop", "เหยื่อ", [{ kind: "sell", item: "worm", n: 5, price: 5 }])`);
  await sleep(300);
  const priceBox = await X.evaluate(`(() => { const p = document.querySelector('[data-sign-lines] [data-line="worm"] [data-line-price]'); return p ? { value: p.value, max: p.max } : null; })()`);
  ok("a worm, which the uncle sells for two, may be priced at five in the panel: its box goes up to ten", priceBox?.value === "5" && priceBox.max === "10", priceBox);
  await click(X, "[data-sign-raise]");
  await until("the worm stall is up", async () => (await signOf(X))?.title === "เหยื่อ", 8000, 200).catch(() => {});
  ok("and the stall opens at that price", (await signOf(X))?.kind === "shop" && (await X.evaluate(`${S}.shops().mine?.lines[0]?.price`)) === 5, await X.evaluate(`${S}.said()`));
  const paid = await Y.evaluate(`${K}.shopBuy(${JSON.stringify(A)}, "worm", 2, [${BY[0] + 1}, ${BY[1]}])`);
  ok("somebody buys two at five each", paid.ok && paid.coins === 10, paid);
  await X.evaluate(`void ${S}.open("mine")`);
  await sleep(300);
  await click(X, "[data-sign-lower]");
  ok("eleven a worm is more than a stall's most, and is refused", (await X.evaluate(`${K}.shopOpen([{ kind: "sell", item: "worm", n: 1, price: 11 }], [${BY}])`)).why === "dear" && (await signOf(X)) === null);

  /* ── a chat room ── */
  await warp(Y, ...NEAR);
  await click(Y, 'button[title="ท่าทาง"]');
  await click(Y, "[data-emote-sign]");
  await click(Y, '[data-sign-kind="chat"]');
  await type(Y, "[data-sign-title]", "คุยเรื่องตกปลา");
  await sleep(200);
  await click(Y, "[data-sign-raise]");
  await sleep(600);
  ok("a chat room held up: its holder is the first in it", JSON.stringify(await signOf(Y)) === JSON.stringify({ kind: "chat", title: "คุยเรื่องตกปลา", n: 1, sells: false, buys: false }) && JSON.stringify(await Y.evaluate(`${C}.circle()`)) === JSON.stringify({ host: B, members: [B] }), await signOf(Y));
  ok("and has the room's panel, which says who is in it", (await there(Y, "[data-circle-panel]")) && (await textOf(Y, "[data-circle-count]")) === "1/8" && (await textOf(Y, "[data-circle-title]")) === "คุยเรื่องตกปลา");
  await warp(X, ...FAR);
  await sleep(600);
  ok("from far off nobody is let in", (await X.evaluate(`${C}.askIn(${JSON.stringify(B)})`)) === "far" && (await X.evaluate(`${C}.circle()`)) === null);
  ok("a tap on the board walks up to it", (await tapSign(X, B)) && (await self(X)).moving);
  await stopped(X);
  await until("A is let in", async () => (await X.evaluate(`${C}.circle()`))?.members.length === 2, 10000, 200).catch(() => {});
  ok("and there I am let in: the holder first, then me", JSON.stringify(await X.evaluate(`${C}.circle()`)) === JSON.stringify({ host: B, members: [B, A] }), await X.evaluate(`${C}.circle()`));
  await until("the board counts two", async () => (await signOf(Y))?.n === 2, 6000, 200).catch(() => {});
  ok("the board says two are in", (await signOf(Y))?.n === 2 && (await textOf(X, "[data-circle-count]")) === "2/8" && (await textOf(Y, "[data-circle-count]")) === "2/8");
  const Z = await X.tab("SignC");
  await enter(Z, "C");
  await warp(Z, NEAR[0] + 1, NEAR[1] + 1);
  const Cid = await me(Z);
  await until("C has heard of the room", async () => (await seenOf(Z, B))?.sign === "c2|คุยเรื่องตกปลา", 15000).catch(() => {});
  ok("somebody outside sees the board and how many are in, and who is in whose room", (await seenOf(Z, B))?.sign === "c2|คุยเรื่องตกปลา" && (await seenOf(Z, A))?.circle === B, await seenOf(Z, B));
  // typed in the room: the room's, and nobody else's
  await type(X, "[data-circle-box]", "ในห้องเท่านั้น");
  await X.evaluate(`document.querySelector("[data-circle-box]").form.requestSubmit()`);
  await until("the line reaches the holder", async () => (await Y.evaluate(`${C}.circleLog()`)).some((l) => l.text === "ในห้องเท่านั้น"), 8000, 200).catch(() => {});
  ok("a line typed in the room is read by the others in it", (await Y.evaluate(`${C}.circleLog()`)).some((l) => l.text === "ในห้องเท่านั้น" && !l.mine) && (await X.evaluate(`${C}.circleLog()`)).some((l) => l.mine));
  ok("and is no bubble over anybody's head: not on my own map, nor on the map of whoever is in the room", (await X.evaluate(`${C}.said()`)) !== "ในห้องเท่านั้น" && (await seenOf(Y, A))?.said !== "ในห้องเท่านั้น", { mine: await X.evaluate(`${C}.said()`), theirs: (await seenOf(Y, A))?.said });
  // (a line a moment after another is held back: lib/town/chat's pace)
  await sleep(1200);
  const sent = await X.evaluate(`${C}.chat("ทั้งเมือง")`);
  if (sent !== "sent") console.log(`  (the town's line was not sent: ${sent})`);
  await until("the town's line reaches C", async () => (await Z.evaluate(`${C}.chatLog()`)).some((l) => l.text === "ทั้งเมือง"), 8000, 200).catch(() => {});
  const zLog = await Z.evaluate(`({ town: ${C}.chatLog().map((l) => l.text), room: ${C}.circleLog().map((l) => l.text) })`);
  ok("and by nobody outside it, who still reads what is typed to the town", zLog.town.includes("ทั้งเมือง") && !zLog.town.includes("ในห้องเท่านั้น") && zLog.room.length === 0, zLog);
  ok("nor is it in the town's own log of those in the room", !(await Y.evaluate(`${C}.chatLog()`)).some((l) => l.text === "ในห้องเท่านั้น"));
  ok("what is typed to the town is a bubble as ever, over my head and on everybody's map", (await X.evaluate(`${C}.said()`)) === "ทั้งเมือง" && (await seenOf(Z, A))?.said === "ทั้งเมือง", { mine: await X.evaluate(`${C}.said()`), theirs: (await seenOf(Z, A))?.said });
  await Y.evaluate(`${C}.sayCircle("ยินดีต้อนรับ")`);
  await until("the holder's line reaches A", async () => (await X.evaluate(`${C}.circleLog()`)).some((l) => l.text === "ยินดีต้อนรับ"), 8000, 200).catch(() => {});
  ok("the holder's line reaches whoever is in", (await X.evaluate(`${C}.circleLog()`)).some((l) => l.text === "ยินดีต้อนรับ"));
  await X.shot(`${OUT}/sign-room.png`);
  // voices: the room's own
  for (const P of [X, Y, Z]) await P.evaluate(`void ${C}.joinVoice()`);
  await until("the room's two have a line", async () => (await lines(X)).includes(B) && (await lines(Y)).includes(A), 20000).catch(() => {});
  await sleep(2500);
  const v1 = { a: await lines(X), b: await lines(Y), c: await lines(Z) };
  ok("with microphones on, the two in the room have a line with each other and with nobody else", JSON.stringify(v1.a) === JSON.stringify([B]) && JSON.stringify(v1.b) === JSON.stringify([A]), v1);
  ok("and whoever is outside has none with them", v1.c.length === 0, v1);
  ok("the room's panel says where the voice goes", await there(X, "[data-circle-voice]"));
  await Z.evaluate(`${C}.askIn(${JSON.stringify(B)})`);
  await until("C is let in", async () => (await Z.evaluate(`${C}.circle()`))?.members.length === 3, 10000, 200).catch(() => {});
  await until("three in the room hear each other", async () => (await lines(Z)).length === 2 && (await lines(X)).length === 2 && (await lines(Y)).length === 2, 20000).catch(() => {});
  ok("a third let in hears both, and both hear them", (await lines(Z)).length === 2 && (await lines(X)).length === 2 && (await lines(Y)).length === 2, { a: await lines(X), b: await lines(Y), c: await lines(Z) });
  // let go by the holder, by their name, asked a second time
  await click(Y, `[data-let-go="${Cid}"]`);
  ok("the holder is asked a second time before somebody is let go", /ให้ออกจากห้อง/.test((await textOf(Y, `[data-let-go="${Cid}"]`)) ?? "") && (await Y.evaluate(`${C}.circle()`)).members.length === 3);
  await click(Y, `[data-let-go="${Cid}"]`);
  await until("C is out", async () => (await Z.evaluate(`${C}.circle()`)) === null, 8000, 200).catch(() => {});
  ok("let go, they are out, and told so", (await Z.evaluate(`${C}.circle()`)) === null && (await Z.evaluate(`${C}.circleNote()`)) === "out" && /ให้ออก/.test((await textOf(Z, "[data-circle-word]")) ?? ""), await textOf(Z, "[data-circle-word]"));
  await Z.evaluate(`${C}.askIn(${JSON.stringify(B)})`);
  await until("C is refused", async () => (await Z.evaluate(`${C}.circleNote()`)) === "out", 8000, 200).catch(() => {});
  await sleep(1500);
  ok("and not let back in", (await Z.evaluate(`${C}.circle()`)) === null && (await Y.evaluate(`${C}.circle()`)).members.length === 2);
  await until("C's lines are gone", async () => (await lines(Z)).length === 0 && (await lines(X)).length === 1, 15000).catch(() => {});
  ok("nor heard any more", (await lines(Z)).length === 0 && JSON.stringify(await lines(X)) === JSON.stringify([B]), { a: await lines(X), c: await lines(Z) });
  // in a room one stays put: a tap on the ground walks nobody; it is left by its own button
  const inWas = await self(X);
  await tapGround(X, ...OPEN);
  const inIs = await self(X);
  ok("in a chat room, a tap on the ground does not walk me: I am still in it, and told why", !inIs.moving && inIs.x === inWas.x && inIs.y === inWas.y && (await X.evaluate(`${C}.circle()`))?.members.length === 2 && /ออกจากห้อง/.test((await textOf(X, "[data-stuck-note]")) ?? ""), { inIs, note: await textOf(X, "[data-stuck-note]") });
  await click(X, "[data-circle-leave]");
  await until("A has left", async () => (await X.evaluate(`${C}.circle()`)) === null, 8000, 200).catch(() => {});
  await until("the holder is alone", async () => (await Y.evaluate(`${C}.circle()`)).members.length === 1 && (await signOf(Y)).n === 1, 8000, 200).catch(() => {});
  ok("left by its own button: I am out, and the board says one again", (await X.evaluate(`${C}.circle()`)) === null && (await Y.evaluate(`${C}.circle()`)).members.length === 1 && (await signOf(Y)).n === 1);
  ok("and then I walk again", (await X.evaluate(`${V}.walk(${FAR[0]}, ${FAR[1]})`)) === true);
  await until("the two outside hear each other", async () => (await lines(X)).includes(Cid) && (await lines(Z)).includes(A), 20000).catch(() => {});
  ok("the two outside now have a line with each other, and none with the room's holder", JSON.stringify(await lines(X)) === JSON.stringify([Cid]) && JSON.stringify(await lines(Z)) === JSON.stringify([A]) && (await lines(Y)).length === 0, { a: await lines(X), b: await lines(Y), c: await lines(Z) });
  // its holder stays put too, and ends it for everybody by its own button
  await stopped(X);
  await X.evaluate(`${V}.warp(${NEAR[0]}, ${NEAR[1] + 1})`);
  await sleep(700);
  await X.evaluate(`${C}.askIn(${JSON.stringify(B)})`);
  await until("A is back in", async () => (await X.evaluate(`${C}.circle()`))?.members.length === 2, 10000, 200).catch(() => {});
  const hWas = await self(Y);
  await tapGround(Y, ...OPEN);
  ok("its holder does not walk off by a tap either: the room goes on", (await self(Y)).x === hWas.x && (await signOf(Y))?.kind === "chat" && (await Y.evaluate(`${C}.circle()`)).members.length === 2);
  await Y.evaluate(`window.__townCircle.fold(false)`);
  await sleep(300);
  await click(Y, "[data-circle-leave]");
  await until("the room is over", async () => (await X.evaluate(`${C}.circle()`)) === null, 8000, 200).catch(() => {});
  ok("its holder closing it ends the room for everybody in it, who are told", (await signOf(Y)) === null && (await Y.evaluate(`${C}.circle()`)) === null && (await X.evaluate(`${C}.circle()`)) === null && (await X.evaluate(`${C}.circleNote()`)) === "end");
  await until("everybody hears everybody", async () => (await lines(X)).length === 2 && (await lines(Y)).length === 2 && (await lines(Z)).length === 2, 25000).catch(() => {});
  ok("and everybody hears everybody again", (await lines(X)).length === 2 && (await lines(Y)).length === 2 && (await lines(Z)).length === 2, { a: await lines(X), b: await lines(Y), c: await lines(Z) });

  /* ── a phone ── */
  const P = await X.tab("SignPhone", { width: 390, height: 780, dpr: 2, mobile: true });
  await enter(P, "P");
  await P.evaluate(`void ${S}.open("setup")`);
  await sleep(600);
  const box = await P.evaluate(`(() => { const r = document.querySelector("[data-sign-panel]").getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: innerWidth, h: innerHeight }; })()`);
  ok("on a phone the panel is within the screen", box.l >= 0 && box.r <= box.w + 1 && box.t >= 0 && box.b <= box.h + 1, box);
  await P.shot(`${OUT}/sign-phone.png`);
} catch (e) {
  fail++;
  console.log(`  FAIL the check stopped: ${e?.stack ?? e}`);
  await X.shot(`${OUT}/sign-stopped.png`).catch(() => {});
} finally {
  await X.quit();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
