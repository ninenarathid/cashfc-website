// The cloud ram's flock on every map (the owner, 2026-11-24: "มีคนบอกว่าชวนขึ้นแกะขี่หลายคนไม่ได้ ช่วยทำให้มันชวนขึ้นได้ให้ทำงาน
// ได้ทุกแมพ"). Live, the pasture's world is read only on the farm (or while the hay wagon tours), and a member who has not
// been there this visit has none: each of the three pages here is made such a member (`animalWorld` says nothing). A
// rider on a map other than the farm (the city by default) gets on, asks two friends beside them in turn, both get on;
// the three go through the map's gate to the farm and back, the friends carried along and still seated on every page;
// a friend gets down, and the rider lets the other down. Driven in real browsers on the dev test room (the trial keeper,
// the throwaway public room). PASS/FAIL lines and screenshots of the chips at desktop and phone. Muted (cdp.mjs).
//
//   node town-ram-maps.mjs <base> <outdir> [city|town2|classic]
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3461", OUT = ".", MAP = "city"] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 400)}`); };
const V = "window.__townView", T = "window.__townTrade", K = "window.__townKeeper", S = "window.__townPasture";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, mobile: true } };
const tag = String(Date.now() % 100000);
const alive = (X) => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
const click = async (X, sel) => (await alive(X), X.evaluate(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b || b.disabled) return false; b.click(); return true; })()`));
const has = (X, sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
const place = (X) => X.evaluate(`${V}.casino().place`);
const self = (X) => X.evaluate(`${V}.self()`);
const seat = (X) => X.evaluate(`${S}.seat()`);

async function enter(X, who) {
  await X.goto(`${BASE}/town?townTest=${who}&townRoom=rammaps${tag}&townMap=${MAP}&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 300000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${K} && !!${S}`), 60000);
  // (a member who has not been to the farm this visit: the pasture's world unread)
  await X.evaluate(`(${K}.animalWorld = () => null, true)`);
}

const X = await browser("ram-maps", SIZES.desktop);
try {
  await enter(X, `R${tag}`);
  const P = await X.window("RamFriendA", SIZES.phone);
  await enter(P, `Q${tag}`);
  const Q = await X.window("RamFriendB", SIZES.phone);
  await enter(Q, `S${tag}`);
  const [rider, a, b] = [await X.evaluate(`${K}.id`), await P.evaluate(`${K}.id`), await Q.evaluate(`${K}.id`)];
  await X.evaluate(`(${T}.setGifts(true), ${T}.familiarWear("famCloudRam"))`);
  ok(`the rider starts off the farm (${MAP})`, (await place(X)) !== "farm", await place(X));
  ok("no page has the pasture's world", !(await X.evaluate(`!!${K}.animalWorld()`)) && !(await P.evaluate(`!!${K}.animalWorld()`)));

  // the two friends beside the rider (tiles one can stand on, within the ram's reach)
  const me = await self(X), tx = Math.floor(me.x), ty = Math.floor(me.y);
  const spots = await X.evaluate(`[[1,0],[0,1],[-1,0],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[2,0],[0,2]].map(([dx, dy]) => [${tx} + dx, ${ty} + dy]).filter(([x, y]) => ${V}.walkable(x, y))`);
  await P.evaluate(`${V}.warp(${spots[0][0]}, ${spots[0][1]})`);
  await Q.evaluate(`${V}.warp(${spots[1][0]}, ${spots[1][1]})`);
  await sleep(2500);

  await until("the button to get on", () => X.evaluate(`document.querySelector("[data-town-ride]")?.dataset.townRide === "off"`), 20000).catch(() => {});
  ok("the ram's button gets on", await click(X, "[data-town-ride]"));
  await until("both friends offered to ask", () => X.evaluate(`document.querySelectorAll("[data-ram-ask]").length >= 2`), 30000).catch(() => {});
  ok("the rider is offered to ask both friends", (await X.evaluate(`document.querySelectorAll("[data-ram-ask]").length`)) >= 2, await X.evaluate(`[...document.querySelectorAll("[data-ram-ask]")].map((e) => e.dataset.ramAsk)`));
  await X.shot(`${OUT}/ram-maps-desktop-01-ask-two.png`);

  for (const [F, id, name] of [[P, a, "first"], [Q, b, "second"]]) {
    ok(`the ${name} friend asked`, await click(X, `[data-ram-ask="${id}"]`));
    await until("the invite has come", () => has(F, "[data-ram-invite]"), 15000).catch(() => {});
    ok(`the ${name} friend sees the invite`, await has(F, "[data-ram-invite]"));
    if (name === "first") await F.shot(`${OUT}/ram-maps-phone-02-invite.png`);
    await alive(F);
    await F.evaluate(`document.querySelector("[data-ram-invite] button")?.click()`);
    await until("seated", async () => (await seat(F)) === `r:${rider}`, 8000).catch(() => {});
    ok(`the ${name} friend sits on the rider's flock`, (await seat(F)) === `r:${rider}`, await seat(F));
  }
  await until("two lambs", () => X.evaluate(`${V}.flockAt().filter((l) => l.owner === ${JSON.stringify(rider)}).length === 2`), 10000).catch(() => {});
  ok("two lambs behind the rider on the rider's page", (await X.evaluate(`${V}.flockAt().filter((l) => l.owner === ${JSON.stringify(rider)}).length`)) === 2);
  ok("a friend has the button to get down", await has(P, "[data-ram-off]"));
  ok("the rider has the button to let a friend down", await has(X, "[data-ram-let-down]"));
  await X.shot(`${OUT}/ram-maps-desktop-03-two-on.png`);
  await P.shot(`${OUT}/ram-maps-phone-03-on.png`);

  // through the gate to the farm, and back: the friends carried along, still seated, on every page
  const gates = await X.evaluate(`${V}.gateList()`);
  const here = await place(X);
  const tryGate = async (from, leads) => {
    const g = gates.find((q) => q.from === from && q.leads === leads);
    if (!g) return { skipped: true };
    const [gx, gy] = g.tiles[0];
    // (stand a few steps short of it, then walk onto it as a member does)
    const near = await X.evaluate(`(() => { for (let r = 2; r <= 6; r++) for (const [dx, dy] of [[r,0],[-r,0],[0,r],[0,-r]]) { const x = ${gx} + dx, y = ${gy} + dy; if (${V}.walkable(x, y)) return [x, y]; } return null; })()`);
    if (near) { await X.evaluate(`${V}.warp(${near[0]}, ${near[1]})`); await sleep(2500); }
    await alive(X);
    await X.evaluate(`${V}.walk(${gx}, ${gy})`);
    await until(`over to the ${leads}`, async () => (await place(X)) === leads, 20000).catch(() => {});
    await sleep(4000);
    return { skipped: false };
  };
  // (the farm's gate there and back; the forest's too, where this town has one)
  const legs = [[here, "farm"], ["farm", here], ...(gates.some((g) => g.from === here && g.leads === "forest") ? [[here, "forest"], ["forest", here]] : [])];
  for (const [from, leads] of legs) {
    const r = await tryGate(from, leads);
    if (r.skipped) { ok(`a gate from ${from} to ${leads}`, false, gates.map((g) => `${g.from}>${g.leads}`)); continue; }
    ok(`the rider went through to the ${leads}`, (await place(X)) === leads, await place(X));
    const [x, p, q] = [await self(X), await self(P), await self(Q)];
    for (const [F, at, name] of [[P, p, "first"], [Q, q, "second"]]) {
      ok(`${from} → ${leads}: the ${name} friend is on the ${leads} too`, (await place(F)) === leads, await place(F));
      ok(`${from} → ${leads}: the ${name} friend still sits on the flock`, (await seat(F)) === `r:${rider}`, await seat(F));
      ok(`${from} → ${leads}: the ${name} friend is where the rider is`, !!at && !!x && Math.hypot(at.x - x.x, at.y - x.y) < 1.5, { at, x });
    }
    ok(`${from} → ${leads}: two lambs still behind the rider`, (await X.evaluate(`${V}.flockAt().filter((l) => l.owner === ${JSON.stringify(rider)}).length`)) === 2);
  }
  await X.shot(`${OUT}/ram-maps-desktop-04-back.png`);

  // down again: one by their own button, the other let down by the rider
  await click(P, "[data-ram-off]");
  await until("the first down", async () => !(await seat(P)), 6000).catch(() => {});
  ok("the first friend got down", !(await seat(P)), await seat(P));
  await click(X, "[data-ram-let-down]");
  await until("the second down", async () => !(await seat(Q)), 8000).catch(() => {});
  ok("the rider let the second friend down", !(await seat(Q)), await seat(Q));
  ok("no page errors", X.errors().length === 0 && P.errors().length === 0 && Q.errors().length === 0, [...X.errors(), ...P.errors(), ...Q.errors()]);
} catch (e) { fail++; console.log(`  FAIL ${e.message}`); }
finally { X.close(); }
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
