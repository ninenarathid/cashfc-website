// The editor's town's benches, kitchen hall and fishing pier, as the owner asked on 2026-10-22, tried by two testers in a
// real browser on the dev test room, desktop and phone: each bench sat on the way it faces, two on a long bench side by
// side (the second given the other place), the sitter drawn on the bench; into the hall by the front gap and the back
// doorway only, somebody outside behind its back wall hidden by it; onto the pier by its stairs only.
//
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/town2-seats.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

globalThis.__cashTownMap = "town2";
await import("./db/repo-ts-town.mjs");
const { BENCHES, YARD_SEATS, KITCHEN } = await import("@/lib/town/world");
const [BASE = "http://localhost:3195", OUT = "."] = process.argv.slice(2);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + JSON.stringify(d)}`); };
const V = "window.__townView";
/** The places on a bench (as BENCHES indexes), by the tile under the middle of its picture. */
const placesOf = (thing) => BENCHES.flatMap((b, i) => (b.of === thing ? [i] : []));
const ROOM = `town2seats${Date.now() % 100000}`;
const url = `${BASE}/town?townTest=__L__&townRoom=${ROOM}&townMap=town2&townHour=12&townWeather=clear`;
const me = (X) => X.evaluate("window.__cashTown.me()");

async function tapAt(X, mx, my) {
  const at = await X.evaluate(`(() => { const r = document.querySelector("canvas").getBoundingClientRect(); return { x: r.left, y: r.top }; })()`);
  const x = mx + at.x, y = my + at.y;
  await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  await sleep(300);
}
/** Tap a bench's place where it is on the screen, and wait till sat (on it, or on whichever place one is given). */
async function sitOn(X, i, want = null) {
  const box = (await X.evaluate(`${V}.benches()`)).find((b) => b.i === i);
  if (!box) return { error: "not on the screen", i };
  await tapAt(X, (box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2);
  try { await until(`sat ${i}`, async () => { const s = (await me(X)).sit ?? -1; return want ? want.includes(s) : s === i; }, 15000); } catch { /* told below */ }
  return { sit: (await me(X)).sit };
}
async function standAt(X, x, y) { await X.evaluate(`${V}.warp(${x}, ${y})`); await sleep(1800); }

for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730 }]]) {
  const A = await browser(`seats-a-${label}`, size), B = await browser(`seats-b-${label}`, size);
  try {
    await A.goto(url.replace("__L__", "S")); await B.goto(url.replace("__L__", "T"));
    for (const X of [A, B]) await until("ready", async () => (await status(X)) === "ready", 240000);
    ok(`${label}: both have the editor's town`, (await A.evaluate(`${V}.town2().on`)) && (await B.evaluate(`${V}.town2().on`)));

    // ── by the water: two on one bench, facing the water ──
    const water = placesOf(757);
    await standAt(A, 56, 68); await standAt(B, 57, 68);
    const a1 = await sitOn(A, water[0]);
    // (the free half is tapped: the first sitter covers the other, and a tap there is a tap on them)
    const b1 = await sitOn(B, water[1], water);
    ok(`${label}: the second to sit on the water's bench has its other place`, a1.sit === water[0] && b1.sit === water[1], { a1, b1, water });
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-water.png`);

    // ── the bench with a back by the lantern ──
    await standAt(A, 52, 39); await standAt(B, 60, 30);
    const lantern = placesOf(444);
    ok(`${label}: sat on the bench with a back`, (await sitOn(A, lantern[0])).sit === lantern[0]);
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-lantern.png`);

    // ── the long red bench by the tanuki: two side by side ──
    const tanuki = placesOf(524);
    await standAt(A, 36, 15); await standAt(B, 37, 15);
    const a2 = await sitOn(A, tanuki[0]), b2 = await sitOn(B, tanuki[1]);
    ok(`${label}: two side by side on the long bench`, a2.sit === tanuki[0] && b2.sit === tanuki[1], { a2, b2 });
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-tanuki.png`);

    // ── the stage's rows ──
    const row = placesOf(569), row2 = placesOf(567);
    await standAt(A, 19, 50); await standAt(B, 19, 49);
    const a3 = await sitOn(A, row[0]), b3 = await sitOn(B, row2[1]);
    ok(`${label}: sat in the stage's rows`, a3.sit === row[0] && b3.sit === row2[1], { a3, b3 });
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-stage.png`);

    // ── the kitchen hall: somebody outside behind its back wall; a place at a near bench ──
    await standAt(B, 64, 45); await standAt(A, label === "desktop" ? 65 : 69, label === "desktop" ? 47 : 50);
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-hall-wall.png`);
    const seen = await A.evaluate(`${V}.benches()`), w = size.width, h = size.height;
    const shown = KITCHEN.seats.map((s, i) => ({ s, i: YARD_SEATS + i })).filter(({ i }) => seen.some((b) => b.i === i && b.x0 > 0 && b.x1 < w && b.y0 > 70 && b.y1 < h - 90));
    const near = (shown.find(({ s }) => s.back) ?? shown[0])?.i ?? -1;
    const a4 = await sitOn(A, near, KITCHEN.seats.map((_, i) => YARD_SEATS + i));
    ok(`${label}: sat at a near bench of the hall`, (a4.sit ?? -1) >= YARD_SEATS, a4);
    await sleep(1500); await A.shot(`${OUT}/seats-${label}-hall-seat.png`);

    // ── into the hall by the back doorway ──
    await standAt(A, 68, 43);
    await A.evaluate(`${V}.walk(68.5, 48.5)`);
    let byDoor = false;
    for (let t = 0; t < 80; t++) {
      const p = await A.evaluate(`${V}.self()`);
      if (Math.floor(p.x) === 68 && Math.floor(p.y) === 45) byDoor = true;
      if (!p.moving && t > 3) break;
      await sleep(150);
    }
    const inHall = await A.evaluate(`${V}.self()`);
    ok(`${label}: in by the back doorway`, byDoor && Math.floor(inHall.y) >= 47 && Math.floor(inHall.y) <= 49, { inHall, byDoor });
    if (label === "desktop") { await standAt(A, 68, 46); await A.shot(`${OUT}/seats-${label}-backdoor.png`); }

    // ── the fishing pier: from the grass below its front, round by its stairs ──
    await standAt(A, 16, 68);
    await A.evaluate(`${V}.walk(15.5, 65.5)`);
    let stairs = false;
    for (let t = 0; t < 120; t++) {
      const p = await A.evaluate(`${V}.self()`);
      if (Math.floor(p.x) === 20 && (Math.floor(p.y) === 63 || Math.floor(p.y) === 64)) stairs = true;
      if (!p.moving && t > 4) break;
      await sleep(150);
    }
    const onDeck = await A.evaluate(`${V}.self()`);
    ok(`${label}: up onto the pier by its stairs`, stairs && Math.floor(onDeck.x) === 15 && Math.floor(onDeck.y) === 65, { stairs, onDeck });
    await sleep(800); await A.shot(`${OUT}/seats-${label}-pier.png`);

    // ── the stage: up its stairs, somebody before it on the ground ──
    await standAt(A, 16, 50); await standAt(B, 15, 52);
    await A.evaluate(`${V}.walk(9.5, 48.5)`);
    let foot = false;
    for (let t = 0; t < 120; t++) {
      const p = await A.evaluate(`${V}.self()`);
      if (Math.floor(p.x) === 15 && (Math.floor(p.y) === 48 || Math.floor(p.y) === 49)) foot = true;
      if (!p.moving && t > 4) break;
      await sleep(150);
    }
    const onStage = await A.evaluate(`${V}.self()`);
    ok(`${label}: up onto the stage by its stairs`, foot && Math.floor(onStage.x) === 9 && Math.floor(onStage.y) === 48, { foot, onStage });
    await sleep(800); await A.shot(`${OUT}/seats-${label}-stage-top.png`);

    // ── the water pavilion: nobody behind its tank; somebody before it ──
    ok(`${label}: nobody stands behind the water pavilion's tank`, !(await B.evaluate(`${V}.walkable(69, 16)`)) && !(await B.evaluate(`${V}.walkable(70, 15)`)));
    await standAt(A, 71, 19); await standAt(B, 70, 18);
    await sleep(800); await A.shot(`${OUT}/seats-${label}-temizuya.png`);
    ok(`${label}: no page errors`, A.errors.length === 0 && B.errors.length === 0, [...A.errors(), ...B.errors()]);
  } catch (e) { console.log(`  ${label}: ${e.message}`); fail++; }
  finally { A.close(); B.close(); }
}
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
