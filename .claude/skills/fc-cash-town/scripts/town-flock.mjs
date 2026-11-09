// The cloud ram's flock (the owner, 2026-11-09: the big ram's own rider in its saddle, every passenger on a lamb of their
// own trailing it two by two, now and then one on the magic ram's cloud; at most eight): driven in a real browser on the
// dev test room (the trial keeper, the throwaway public room: `.env.local` for the room). Two pages of the same size: the
// owner on the big ram, a friend beside it who is asked on, gets on and down, is asked onto a full flock and is let down
// again when the flock fills as they get on. The rest of the flock are passengers who are not there
// (`__townView.flock(n)`, `next dev` only): 1, 3, 6 and 8 riders, standing and walking SE and NE, a cloud among them.
// PASS/FAIL lines and screenshots of every state.
//
//   node .claude/skills/fc-cash-town/scripts/town-flock.mjs <base-url> <out-dir> [1280x860|384x730|360x640]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = ".", SIZE = "1280x860"] = process.argv.slice(2);
const [W, H] = SIZE.split("x").map(Number), size = { width: W, height: H, mobile: W < 600 };
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`); };
const V = "window.__townView", T = "window.__townTrade", K = "window.__townKeeper", S = "window.__townPasture";
// (the page in front draws every frame; a tab behind is throttled, so whichever is shot or walked is brought to the front)
const alive = async (X) => { await X.send("Page.bringToFront").catch(() => {}); await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {}); };
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const click = async (X, sel) => (await alive(X), X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`, true));
const key = (X) => X.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyR", key: "r", bubbles: true }))`);
const lambs = (X, owner) => X.evaluate(`${V}.flockAt().filter((l) => l.owner === ${JSON.stringify(owner)})`);
let shots = 0;
const shot = async (X, name) => (await X.send("Page.bringToFront").catch(() => {}), X.shot(`${OUT}/flock-${W}-${String(++shots).padStart(2, "0")}-${name}.png`));
const START = [38, 45], LEG = 5;

async function enter(X, who) {
  await X.goto(`${BASE}/town?townTest=${who}&townRoom=flock${W}&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T}`), 30000);
}
const warp = async (X, x, y) => { await alive(X); await X.evaluate(`${V}.warp(${x}, ${y})`); };
/** Standing a while, then a walk SE and one NE, a shot of each; back to the start. */
async function rounds(O, n) {
  await alive(O); await sleep(2600); await shot(O, `${n}-stand`);
  await O.evaluate(`${V}.walk(${START[0] + LEG}, ${START[1]})`); await sleep(850); await shot(O, `${n}-walkSE`);
  await sleep(900); await alive(O);
  await O.evaluate(`${V}.walk(${START[0] + LEG}, ${START[1] - LEG})`); await sleep(850); await shot(O, `${n}-walkNE`);
  await sleep(2600); await alive(O); await shot(O, `${n}-standNE`);
  await O.evaluate(`${V}.walk(${START[0]}, ${START[1]})`); await sleep(2600);
}

const O = await browser("FlockOwner", size);
let F = null;
try {
  await enter(O, "O");
  F = await O.tab("FlockFriend", size);
  await enter(F, "F");
  const owner = await O.evaluate(`${K}.id`), friend = await F.evaluate(`${K}.id`);
  await O.evaluate(`(${T}.reset(), ${T}.setGifts(["famCloudRam"]))`);
  await warp(O, ...START); await warp(F, START[0] + 1, START[1] + 1); await sleep(1500);
  ok("the cloud ram is put on", (await O.evaluate(`${K}.familiarWear("famCloudRam")`)).ok === true);
  await sleep(600); await key(O); await sleep(1200);
  // ── one rider, a real one ──
  await until("the friend to ask", () => has(O, "[data-ram-ask]"), 40000).catch(() => {});
  ok("riding, the owner is offered to ask the friend beside them", await has(O, "[data-ram-ask]"));
  await shot(O, "ask");
  ok("…and asks", await click(O, "[data-ram-ask]"));
  await until("the invite", () => has(F, "[data-ram-invite]"), 15000).catch(() => {});
  ok("the friend is asked onto the ram", await has(F, "[data-ram-invite]"));
  await shot(F, "invite");
  await F.evaluate(`document.querySelector("[data-ram-invite] button:not(:disabled)")?.click()`, true);
  await sleep(350); await shot(O, "1-pop");
  await until("seated", async () => (await F.evaluate(`${S}.seat()`))?.startsWith("r:"), 8000).catch(() => {});
  ok("the friend sits on the owner's ram", (await F.evaluate(`${S}.seat()`)) === `r:${owner}`);
  await sleep(1200);
  const [mine, theirs] = [await lambs(O, owner), await lambs(F, owner)];
  const lambOf = (list) => list.find((l) => l.id === friend);
  ok("the friend has a lamb of their own on the owner's page", !!lambOf(mine), mine);
  ok("…the same colour and the same lamb or cloud on both pages", !!lambOf(mine) && !!lambOf(theirs) && lambOf(mine).colour === lambOf(theirs).colour && lambOf(mine).cloud === lambOf(theirs).cloud, { mine: lambOf(mine), theirs: lambOf(theirs) });
  await rounds(O, 1);
  await sleep(2500);
  const [a, b] = [await O.evaluate(`${S}.self()`), await F.evaluate(`${S}.self()`)];
  ok("the friend is carried where the owner goes", !!a && !!b && Math.hypot(a.x - b.x, a.y - b.y) < 1.2, { a, b });
  // ── 3, 6 and 8: the friend first in the line, passengers who are not there behind ──
  for (const n of [3, 6, 8]) {
    await alive(O); await O.evaluate(`${V}.flock(${n - 1})`);
    // (two lambs puffing out of the fleece, step by step: out of the fleece, the hop, landed)
    if (n === 3) for (const k of ["a", "b", "c", "d"]) { await sleep(70); await shot(O, `3-pop-${k}`); }
    await until(`${n} lambs`, async () => (await lambs(O, owner)).length === n, 6000).catch(() => {});
    const got = await lambs(O, owner);
    ok(`${n} ride: ${n} lambs on the owner's page, ${n >= 3 ? "a cloud among them" : ""}`, got.length === n && got.some((l) => l.cloud), got.map((l) => [l.id, l.cloud]));
    await rounds(O, n);
  }
  ok("eight riding, nobody else is offered to the owner", !(await has(O, "[data-ram-ask]")));
  // ── a middle rider gets down: those behind move up, its lamb jumps home ──
  const before = await lambs(O, owner), second = before.find((l) => l.id === "flockghost0"), third = before.find((l) => l.id === "flockghost1");
  await O.evaluate(`${V}.flockOff(0)`); await sleep(260); await shot(O, "middle-off");
  await sleep(2400);
  const after = (await lambs(O, owner)).find((l) => l.id === "flockghost1");
  ok("one in the middle gets down: the one behind takes its place", !!second && !!third && !!after && Math.hypot(after.x - second.x, after.y - second.y) < Math.hypot(after.x - third.x, after.y - third.y), { second, third, after });
  // ── the friend gets down; the flock full; asked onto a full flock ──
  await F.evaluate(`document.querySelector("[data-ram-off]")?.click()`, true);
  await sleep(250); await shot(O, "friend-off");
  await sleep(1200);
  ok("the friend got down", !(await F.evaluate(`${S}.seat()`)));
  const me = await O.evaluate(`${S}.self()`); await warp(F, Math.floor(me.x) + 1, Math.floor(me.y) + 1); await sleep(2500);
  await O.evaluate(`${V}.flock(8)`); await sleep(1500);
  await until("the full flock", () => has(O, "[data-ram-full]"), 8000).catch(() => {});
  ok("eight riding and the friend beside: the full flock's picture, nothing to press", await has(O, "[data-ram-full]") && !(await has(O, "[data-ram-ask]")) && await O.evaluate(`document.querySelector("[data-ram-full]")?.disabled === true`));
  await shot(O, "full");
  await O.evaluate(`${V}.flock(7)`); await sleep(1200);
  ok("seven riding: the friend can be asked again", await click(O, "[data-ram-ask]"));
  await F.evaluate(`${V}.flock(8, ${JSON.stringify(owner)}, [])`);
  await until("the invite", () => has(F, "[data-ram-invite]"), 15000).catch(() => {});
  await sleep(600);
  ok("asked onto a flock of eight, the friend sees the full flock's picture and no way on", await has(F, "[data-ram-invite] [data-ram-full]") && !(await F.evaluate(`[...document.querySelectorAll("[data-ram-invite] button")].some((b) => !b.disabled && /ขึ้นเลย|Hop on/.test(b.innerText))`)));
  await shot(F, "invite-full");
  await F.evaluate(`[...document.querySelectorAll("[data-ram-invite] button")].at(-1)?.click()`, true);
  // ── got on as the ninth: down again, on the friend's own page ──
  await F.evaluate(`${V}.flock(0)`); await sleep(400);
  ok("asked again", await click(O, "[data-ram-ask]"));
  await until("the invite", () => has(F, "[data-ram-invite]"), 15000).catch(() => {});
  await F.evaluate(`document.querySelector("[data-ram-invite] button:not(:disabled)")?.click()`, true);
  await until("seated", async () => (await F.evaluate(`${S}.seat()`))?.startsWith("r:"), 8000).catch(() => {});
  ok("…and on", (await F.evaluate(`${S}.seat()`)) === `r:${owner}`);
  await F.evaluate(`${V}.flock(8, ${JSON.stringify(owner)}, [], Date.now() - 600000)`);
  await until("let down", async () => !(await F.evaluate(`${S}.seat()`)), 6000).catch(() => {});
  ok("eight got on before them: the ninth is let down again, and told the flock is full", !(await F.evaluate(`${S}.seat()`)) && /ฝูงแกะเต็ม|flock is full/.test(await F.evaluate(`document.querySelector("[data-pasture-note]")?.innerText ?? ""`)));
  await shot(F, "ninth-down");
  await F.evaluate(`${V}.flock(0)`);
  // ── the owner gets down: every lamb jumps home ──
  await O.evaluate(`${V}.flock(6)`); await sleep(2500);
  await key(O); await sleep(240); await shot(O, "owner-down");
  await sleep(1500);
  ok("the owner got down: no lamb left", (await lambs(O, owner)).length === 0 && !(await O.evaluate(`${V}.flockAt()`)).length);
  ok("no page errors", O.errors().length === 0 && F.errors().length === 0, [...O.errors(), ...F.errors()]);
} catch (e) { fail++; console.log(`  FAIL ${e.message}`); }
finally { O.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
