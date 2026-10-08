// Cash Town's bag put in order, tried in a real browser on the dev test room (the trial kept in the browser, `next
// dev` only). A member's ask, by way of the owner, 2026-10-08: "ขอ function sort ของในกระเป๋า และ ลากวางได้".
//
// - a thing pulled with the mouse from its slot: into an empty slot it moves, onto more of itself it joins, onto
//   another thing the two change places; the thing is under the pointer and the slot it would land in is lit;
//   let go of outside the bag, nothing moves; and the click that ends a pull takes nothing up;
// - with no pulling at all: the thing taken up, "ย้าย", then a tap on the slot it goes to (and a way out of it);
// - what is held is held still wherever it is moved, and marked there;
// - "จัดเรียง": by kind, split stacks brought together, dim once the bag is in order;
// - a carry is given up when the thing in its slot is gone, or is another (a sort answered while it was carried):
//   what is let go of then moves nothing;
// - a phone: a finger held a moment on a thing lifts it, and pulled it goes; a finger that moves at once lifts
//   nothing; the bag's head (the words, the buttons, the count) is one row inside the bag.
//
// The rules themselves are lib/town/bag's tests, and the database's are scripts/db/v165.test.mjs.
// Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-bag.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const T = "window.__townTrade", K = "window.__townKeeper";
const TRADE = `document.querySelector('[aria-labelledby="town-trade-h"]')`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const key = async (X, code, k = code) => { for (const type of ["keyDown", "keyUp"]) await X.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: code.startsWith("Key") ? code.charCodeAt(3) : 0 }); await sleep(350); };
const bag = (X) => X.evaluate(`${T}.purse().bag.map((s) => (s ? s.item + "×" + s.n : null))`);
const hand = (X) => X.evaluate(`${T}.purse().hand ?? null`);
const at = (X, i) => X.evaluate(`(() => { const r = document.querySelector('[data-bag-slot="${i}"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
/** What a pull looks like while it lasts: whether the thing is under the pointer, which slot it left, which are lit. */
const seen = (X) => X.evaluate(`({ ghost: !!document.querySelector("[data-bag-ghost]"), from: document.querySelector("[data-bag-dragging]")?.dataset.bagDragging ?? null,
  lit: [...document.querySelectorAll("[data-bag-slot]")].filter((li) => (li.className + " " + (li.firstElementChild?.className ?? "")).includes("border-accent")).map((li) => +li.dataset.bagSlot) })`);
const picked = (X) => X.evaluate(`[...document.querySelectorAll('[data-bag-slot] button[aria-pressed="true"]')].map((b) => +b.closest("[data-bag-slot]").dataset.bagSlot)`);
const heldAt = (X) => X.evaluate(`[...document.querySelectorAll("[data-bag-slot]")].filter((li) => li.querySelector("[data-bag-held]")).map((li) => +li.dataset.bagSlot)`);
const sortBtn = (X) => X.evaluate(`(() => { const b = document.querySelector("[data-bag-sort]"); return b ? { on: !b.disabled } : null; })()`);
const mouse = (X, type, p, down) => X.send("Input.dispatchMouseEvent", { type, x: p.x, y: p.y, button: type === "mouseMoved" && !down ? "none" : "left", buttons: down ? 1 : 0, clickCount: type === "mouseMoved" ? 0 : 1 });
const click = async (X, p) => { await mouse(X, "mouseMoved", p, false); await mouse(X, "mousePressed", p, true); await mouse(X, "mouseReleased", p, false); await sleep(350); };
/**
 * A thing pulled with the mouse from a slot to a slot (or to a point of the screen); what it looked like just before it
 * was let go. `meanwhile`: something done to the bag while the thing is carried, half way there.
 */
async function pull(X, from, to, meanwhile = null) {
  const a = await at(X, from), b = typeof to === "number" ? await at(X, to) : to;
  await mouse(X, "mouseMoved", a, false);
  await mouse(X, "mousePressed", a, true);
  for (let i = 1; i <= 6; i++) {
    await mouse(X, "mouseMoved", { x: a.x + ((b.x - a.x) * i) / 6, y: a.y + ((b.y - a.y) * i) / 6 }, true); await sleep(40);
    if (i === 3 && meanwhile) { const up = (await seen(X)).ghost; await X.evaluate(meanwhile); await sleep(250); if (!up) throw new Error("the thing was not up before the bag was changed"); }
  }
  await sleep(120);
  const was = await seen(X);
  await mouse(X, "mouseReleased", b, false);
  await sleep(400);
  return was;
}
const touch = (X, type, points) => X.send("Input.dispatchTouchEvent", { type, touchPoints: points.map((p, i) => ({ x: Math.round(p.x), y: Math.round(p.y), id: i + 1 })) });
async function enter(X, letter) {
  await X.goto(`${BASE}/town?townTest=${letter}&townRoom=check&townHour=10&townWeather=cloudy`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
/** A bag laid for the checks: two split stacks of one thing, a tool, bait, a can, fish, and four empty slots. */
async function lay(X) {
  await X.evaluate(`(${T}.reset(), ${T}.forget())`); await sleep(600);
  await X.evaluate(`${T}.resize(10)`);
  await X.evaluate(`(${T}.grant("kangkong", 25), ${T}.grant("hoe", 1), ${T}.grant("worm", 3), ${T}.grant("can", 1), ${T}.grant("minnow", 2), ${T}.leave(0, 12))`);
  await sleep(400);
  return bag(X);
}
const LAID = ["kangkong×8", "kangkong×5", "hoe×1", "worm×3", "can×1", "minnow×2", null, null, null, null];

const X = await browser("Bag", { width: 1280, height: 860 });
try {
  await enter(X, "A");
  const laid = await lay(X);
  ok("(the bag is laid: two split stacks, a tool, bait, a can, fish, four empty slots)", same(laid, LAID), laid);
  await key(X, "KeyI", "i");
  await until("my bag is open", () => X.evaluate(`!!${TRADE} && !!document.querySelector('[data-bag-slot="0"]')`), 8000);

  console.log("a thing pulled with the mouse");
  ok("the bag's head has \"จัดเรียง\", live while the bag is out of order, and no \"ย้าย\" with nothing taken up",
    same(await sortBtn(X), { on: true }) && !(await X.evaluate(`!!document.querySelector("[data-bag-move]")`)) && (await X.evaluate(`document.querySelector("[data-bag-sort]").innerText.trim()`)) === "จัดเรียง", await sortBtn(X));
  let was = await pull(X, 3, 8);
  let b = await bag(X);
  ok("while it is pulled the thing is under the pointer, its own slot is marked, and the slot it would land in is lit", was.ghost && was.from === "3" && same(was.lit, [8]), was);
  ok("into an empty slot it moves, and leaves its own empty", b[8] === "worm×3" && b[3] === null && b.filter(Boolean).length === 6, b);
  ok("…and the click that ends a pull takes nothing up, and the thing is no longer under the pointer", same(await picked(X), []) && !(await seen(X)).ghost, await picked(X));
  await X.shot(`${OUT}/bag-moved.png`);
  was = await pull(X, 1, 0);
  b = await bag(X);
  ok("onto more of itself it joins it: one stack of thirteen, and the slot it left is empty", b[0] === "kangkong×13" && b[1] === null && same(was.lit, [0]), b);
  await pull(X, 2, 5);
  b = await bag(X);
  ok("onto another thing the two change places", b[2] === "minnow×2" && b[5] === "hoe×1", b);
  const before = await bag(X);
  was = await pull(X, 4, { x: 30, y: 30 });
  ok("let go of outside the bag, nothing moves, nothing is lit there, and the bag stays open", same(await bag(X), before) && was.ghost && same(was.lit, []) && (await X.evaluate(`!!${TRADE}`)), { bag: await bag(X), was });
  await click(X, await at(X, 0));
  ok("a plain click takes a thing up to look at, as ever, and moves nothing", same(await picked(X), [0]) && same(await bag(X), before), await picked(X));

  console.log("with no pulling: taken up, \"ย้าย\", and a tap on the slot");
  ok("with a thing taken up the head offers \"ย้าย\"", (await X.evaluate(`document.querySelector("[data-bag-move]")?.innerText.trim() ?? null`)) === "ย้าย");
  await X.evaluate(`document.querySelector("[data-bag-move]").click()`); await sleep(300);
  ok("pressed, the head says what to do and how to leave it, and \"จัดเรียง\" is out of the way",
    (await X.evaluate(`document.querySelector("[data-bag-placing]")?.innerText.trim() ?? null`)) === "แตะช่องที่จะวาง" && (await sortBtn(X)) === null
    && (await X.evaluate(`[...${TRADE}.querySelectorAll("button")].some((x) => x.innerText.trim() === "ยกเลิก")`)));
  ok("…and no thing's card is over the head while a place is chosen", !(await X.evaluate(`!!${TRADE}.querySelector('[data-bag-slot] [role="tooltip"]')`)));
  await X.shot(`${OUT}/bag-placing.png`);
  await click(X, await at(X, 6));
  b = await bag(X);
  ok("a tap on an empty slot puts it there, what was taken up is taken up still, and the head is as it was", b[6] === "kangkong×13" && b[0] === null && same(await picked(X), [6])
    && !(await X.evaluate(`!!document.querySelector("[data-bag-placing]")`)) && same(await sortBtn(X), { on: true }), { b, picked: await picked(X) });
  await X.evaluate(`document.querySelector("[data-bag-move]").click()`); await sleep(300);
  await X.evaluate(`[...${TRADE}.querySelectorAll("button")].find((x) => x.innerText.trim() === "ยกเลิก").click()`); await sleep(300);
  ok("\"ยกเลิก\" leaves it where it is", same(await bag(X), b) && !(await X.evaluate(`!!document.querySelector("[data-bag-placing]")`)), await bag(X));
  await X.evaluate(`document.querySelector("[data-bag-move]").click()`); await sleep(300);
  await click(X, await at(X, 2));
  b = await bag(X);
  ok("a tap on another thing changes places with it", b[2] === "kangkong×13" && b[6] === "minnow×2", b);

  console.log("what is held");
  await X.evaluate(`${K}.hold(5)`); await sleep(400);
  ok("(the hoe is taken in the hand, and marked in its slot)", (await hand(X)) === "hoe" && same(await heldAt(X), [5]), await heldAt(X));
  await pull(X, 5, 9);
  ok("moved, it is in the hand still, and marked where it now is", (await hand(X)) === "hoe" && same(await heldAt(X), [9]) && (await bag(X))[9] === "hoe×1", { hand: await hand(X), at: await heldAt(X) });

  console.log("the bag sorted");
  await X.evaluate(`document.querySelector("[data-bag-sort]").click()`); await sleep(500);
  b = await bag(X);
  ok("\"จัดเรียง\": tools, bait, what is grown, fish, from the first slot on with no gap", same(b, ["can×1", "hoe×1", "worm×3", "kangkong×13", "minnow×2", null, null, null, null, null]), b);
  ok("…said, the button dim now that the bag is in order, and the hoe held still and marked where it is", same(await sortBtn(X), { on: false }) && (await hand(X)) === "hoe" && same(await heldAt(X), [1])
    && (await X.evaluate(`${TRADE}.innerText.includes("จัดเรียงกระเป๋าแล้ว")`)), { btn: await sortBtn(X), held: await heldAt(X) });
  await X.evaluate(`${T}.grant("kangkong", 20)`); await sleep(400);
  b = await bag(X);
  ok("(more of a thing comes in: its own stack is filled and the rest lies after the fish, so the button is live again)", b[3] === "kangkong×20" && b[5] === "kangkong×13" && same(await sortBtn(X), { on: true }), b);
  await X.evaluate(`document.querySelector("[data-bag-sort]").click()`); await sleep(500);
  b = await bag(X);
  ok("sorted again, it is put with its kind, the full stack first", same(b.slice(0, 6), ["can×1", "hoe×1", "worm×3", "kangkong×20", "kangkong×13", "minnow×2"]), b);
  await X.shot(`${OUT}/bag-sorted.png`);

  console.log("the bag changed under a carry");
  // (the bag is: a can, the hoe, worms, twenty and thirteen of the greens, the fish, four empty slots)
  was = await pull(X, 5, 8, `${T}.bagMove(5, 9)`);
  b = await bag(X);
  ok("the thing carried gone from its slot meanwhile: the carry is given up, and let go of over a slot nothing moves", !was.ghost && was.from === null && b[9] === "minnow×2" && b[8] === null && b[5] === null, { was, b });
  was = await pull(X, 4, 7, `${T}.bagMove(0, 4)`);
  b = await bag(X);
  ok("another thing come into its slot meanwhile: given up likewise, and that other thing is not moved in its place", !was.ghost && b[4] === "can×1" && b[0] === "kangkong×13" && b[7] === null, { was, b });
  was = await pull(X, 4, 7);
  ok("…and the next pull is a pull again", was.ghost && (await bag(X))[7] === "can×1" && (await bag(X))[4] === null, { was, bag: await bag(X) });
  { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await X.shot(`${OUT}/bag-stopped.png`).catch(() => {});
} finally { await X.close(); }

console.log("a phone");
const P = await browser("BagPhone", { width: 384, height: 780, dpr: 2, mobile: true });
try {
  await P.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  await enter(P, "B");
  const laid = await lay(P);
  ok("(the bag is laid)", same(laid, LAID), laid);
  await P.evaluate(`document.querySelector('button[title="กระเป๋า"]').click()`);
  await until("my bag is open", () => P.evaluate(`!!${TRADE} && !!document.querySelector('[data-bag-slot="0"]')`), 8000);
  await P.evaluate(`document.querySelector('[data-bag-slot="0"]').scrollIntoView({ block: "center" })`); await sleep(400);
  const head = await P.evaluate(`(() => { const s = document.querySelector("[data-bag-sort]"), row = s.parentElement, r = row.getBoundingClientRect();
    const kids = [...row.children].map((k) => k.getBoundingClientRect());
    return { inside: kids.every((k) => k.left >= r.left - 0.5 && k.right <= r.right + 0.5), apart: kids.every((k, i) => i === 0 || k.left >= kids[i - 1].right - 0.5), rows: new Set(kids.map((k) => Math.round(k.top + k.height / 2))).size, tall: Math.round(s.getBoundingClientRect().height) }; })()`);
  ok("the bag's head is one row inside the bag: the words, \"จัดเรียง\" and the count beside each other, the button a finger's size", head.inside && head.apart && head.rows === 1 && head.tall >= 32, head);
  // (a finger held a moment lifts the thing; pulled, it goes)
  let a = await at(P, 3), to = await at(P, 8);
  await touch(P, "touchStart", [a]);
  await sleep(120);
  const early = await seen(P);
  await sleep(380);
  const lifted = await seen(P);
  for (let i = 1; i <= 6; i++) { await touch(P, "touchMove", [{ x: a.x + ((to.x - a.x) * i) / 6, y: a.y + ((to.y - a.y) * i) / 6 }]); await sleep(40); }
  await sleep(100);
  const over = await seen(P);
  await touch(P, "touchEnd", []);
  await sleep(450);
  let b = await bag(P);
  ok("a finger held a moment on a thing lifts it (not before the moment is up)", !early.ghost && lifted.ghost && lifted.from === "3", { early, lifted });
  ok("…pulled, the slot under the finger is lit, and let go there the thing is in it", same(over.lit, [8]) && b[8] === "worm×3" && b[3] === null, { over, b });
  ok("…and nothing is taken up by the letting go", same(await picked(P), []), await picked(P));
  await P.shot(`${OUT}/bag-phone.png`);
  // (a finger that moves at once is scrolling, as ever: nothing is lifted, nothing moves)
  a = await at(P, 0); to = await at(P, 6);
  await touch(P, "touchStart", [a]);
  let any = false;
  for (let i = 1; i <= 6; i++) { await touch(P, "touchMove", [{ x: a.x + ((to.x - a.x) * i) / 6, y: a.y + ((to.y - a.y) * i) / 6 }]); await sleep(25); any ||= (await seen(P)).ghost; }
  await sleep(450);
  any ||= (await seen(P)).ghost;
  await touch(P, "touchEnd", []);
  await sleep(400);
  ok("a finger that moves at once lifts nothing, even held on afterwards, and nothing moves", !any && same(await bag(P), b), { any, bag: await bag(P) });
  // (held and let go of where it is: lifted and put back)
  a = await at(P, 0);
  await touch(P, "touchStart", [a]);
  await sleep(500);
  const up = (await seen(P)).ghost;
  await touch(P, "touchEnd", []);
  await sleep(450);
  ok("held and let go of in its own slot, it is put back: nothing moves, nothing is under the finger", up && same(await bag(P), b) && !(await seen(P)).ghost, await bag(P));
  // (a second finger put down on an empty slot of the bag while a thing is carried: another gesture, the carry is over)
  a = await at(P, 0); to = await at(P, 6);
  const other = await at(P, 3);
  await touch(P, "touchStart", [a]);
  await sleep(500);
  const carried = (await seen(P)).ghost;
  await touch(P, "touchStart", [a, other]);
  await sleep(150);
  const after = (await seen(P)).ghost;
  await touch(P, "touchMove", [to, other]);
  await sleep(100);
  await touch(P, "touchEnd", []);
  await sleep(450);
  ok("a second finger on the bag ends a carry: nothing is under the first any more, and nothing moves", carried && !after && same(await bag(P), b), { carried, after, bag: await bag(P) });
  await P.evaluate(`document.querySelector("[data-bag-sort]").click()`); await sleep(500);
  ok("\"จัดเรียง\" on a phone", same((await bag(P)).slice(0, 6), ["can×1", "hoe×1", "worm×3", "kangkong×13", "minnow×2", null]), await bag(P));
  { const thrown = P.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} catch (e) {
  fail++;
  console.log(`  FAIL (stopped) ${e?.message ?? e}`);
  await P.shot(`${OUT}/bag-phone-stopped.png`).catch(() => {});
} finally { await P.close(); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
