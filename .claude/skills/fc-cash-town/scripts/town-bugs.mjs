// Cash Town's insects in a real browser, on the dev test room (the browser's trial keeps them): an insect of each
// habit is put at a haunt and caught the way its kind is. A tap on one is a swing only with a net in the hand; a
// butterfly never stops and is met where it will be; a ladybird only walks; a grasshopper is off when somebody is
// before it and stays for somebody behind; a dragonfly darts from whoever walks up and comes to whoever waits; a
// cricket is not seen, falls quiet while somebody walks near and sings again when they stand; a stick insect lies
// among sticks and is somewhere else after a miss; a moth goes round a lamp; a beetle comes down its tree only to
// something sweet in another's hand. Each is caught once, and costs stamina; tired hands have a ring under half as
// wide and a slower net, lose an insect at the second swing that misses it, and still catch with a good swing. The
// first of a kind caught is in the village's book, in the bag, with who caught it. A ladybird caught may take a pest
// off some plant of the farm with it: the plant is cured, whoever sowed it, and a line over the catcher's head says
// that one went, not where; with the chance turned off no pest goes and nothing is said. An insect caught in one tab
// is gone from the other tab's map too, and half a minute later one is out at another haunt of that map, on both.
// Hunted, a kind grows scarce: what is caught is kept, and with every kind caught beyond counting no haunt has an
// insect of its own, in either tab, until what was caught is forgotten.
// Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-bugs.mjs <base> <outdir>
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const K = "window.__townTrade", V = "window.__townView", B = "window.__townBugs", F = "window.__townFarm";
const held = (X, id) => X.evaluate(`${K}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const hold = async (X, id) => { await X.evaluate(`${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "${id}"))`); await sleep(400); };
const stamina = (X) => X.evaluate(`${K}.purse().stamina.left`);
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const sights = (X) => X.evaluate(`${B}.sights()`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(500); };
/** A tile somebody can stand on nearest a point, no nearer than so far from another. */
const standNear = (X, at, from = null, least = 0, most = 99) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue;
    const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}), f = ${from ? `Math.hypot(x + 0.5 - ${from.x}, y + 0.5 - ${from.y})` : "50"};
    if (f < ${least} || f > ${most}) continue;
    if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
/** Put an insect at a haunt of a kind, on a map; says which haunt. */
async function put(X, bug, place, kind, pick = 0) {
  const id = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "${place}" && h.kind === "${kind}"); return all[${pick} % all.length]?.id ?? -1; })()`);
  await X.evaluate(`${K}.setBug(${id}, "${bug}")`);
  return id;
}
/** Swing where something will be when the net lands: from where it is now and a moment ago. */
async function lead(X, id, ms = 300) {
  const a = await poseOf(X, id), t0 = Date.now();
  await sleep(60);
  const b = await poseOf(X, id), dt = Date.now() - t0;
  if (!a || !b) return false;
  const vx = (b.aim.x - a.aim.x) / dt, vy = (b.aim.y - a.aim.y) / dt, at = { x: b.aim.x + vx * (ms + 25), y: b.aim.y + vy * (ms + 25) };
  return X.evaluate(`${B}.tap(${at.x}, ${at.y})`);
}
/** Wait until the swing in the air has landed and been answered. */
const landed = async (X) => { await until("the swing lands", async () => !(await X.evaluate(`${B}.swinging()`)), 3000, 40).catch(() => {}); await sleep(450); };

const A = await browser("bugs");
try {
  await A.goto(`${BASE}/town?townTest=B&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(A)) === "ready", 240000);
  await until("the trial", () => A.evaluate(`!!${K} && typeof ${K}.setBug === "function"`), 20000);
  await until("the insects' own code", () => A.evaluate(`!!${B}`), 20000);
  await A.evaluate(`${K}.setSalt("check")`);
  const haunts = await A.evaluate(`${B}.haunts()`);
  ok("insects have haunts on all three maps", ["town", "farm", "forest"].every((p) => haunts.some((h) => h.place === p)), haunts.length);

  // a butterfly, among the town's flowers
  const bf = await put(A, "butterflyWhite", "town", "blooms", 6);
  const hb = haunts.find((h) => h.id === bf);
  await warp(A, ...Object.values(await standNear(A, hb)));
  await until("the butterfly is about", () => poseOf(A, bf), 8000, 100);
  await sleep(600);
  await A.shot(`${OUT}/bugs-0-butterfly.png`);
  let p = await poseOf(A, bf);
  ok("a butterfly is on the wing where its haunt is", p.seen && p.flying && p.lift > 0.2, p);
  ok("with empty hands a tap on it is a step, not a swing", (await A.evaluate(`${B}.tap(${p.aim.x}, ${p.aim.y})`)) === false);
  await A.evaluate(`${K}.grant("bugNet", 1)`);
  await hold(A, "bugNet");
  let got = false;
  for (let i = 0; i < 12 && !got; i++) {
    // (stood where it will pass, a little ahead of it)
    const q = await poseOf(A, bf);
    if (!q) break;
    const me = await A.evaluate(`${V}.self()`);
    if (Math.hypot(q.aim.x - me.x, q.aim.y - me.y) > 1.6) { const t = await standNear(A, q.aim); await warp(A, t.x, t.y); continue; }
    if (await lead(A, bf)) { if (i === 0) { await sleep(150); await A.shot(`${OUT}/bugs-1-swing.png`); } await landed(A); }
    got = (await held(A, "butterflyWhite")) > 0;
  }
  ok("with a net, a swing aimed where it will be takes it", got, await A.evaluate(`${B}.note()`));
  ok("it is in the bag, and the haunt has no more of it for me", (await held(A, "butterflyWhite")) === 1 && !(await sights(A)).some((s) => s.id === bf));
  const spent = 100 - (await stamina(A));
  ok("it cost a point of stamina, and one for each miss before it, up to two", spent >= 1 && spent <= 3, spent);
  ok("the village's book has who caught the first", (await A.evaluate(`${K}.bugBook().butterflyWhite`)) !== undefined, await A.evaluate(`JSON.stringify(${K}.bugBook())`));
  await sleep(400);
  await A.shot(`${OUT}/bugs-2-caught.png`);
  // the book, in the bag
  await A.evaluate(`document.querySelector('button[title="กระเป๋า"], button[title="Bag"]')?.click()`);
  const page = await until("the book is in the bag", () => A.evaluate(`(() => { const li = document.querySelector('[data-bug="butterflyWhite"]'); return li ? { text: li.innerText, head: document.querySelector("[data-bug-book]")?.innerText ?? "" } : null; })()`), 6000, 200).catch((e) => e.message);
  ok("the bag has the village's book of insects: the kind caught, who caught the first, and how many of all there are", typeof page === "object" && page.head.includes("1/24") && page.text.length > 8, page);
  await sleep(300);
  await A.shot(`${OUT}/bugs-2b-book.png`);
  await A.evaluate(`document.querySelector('button[title="กระเป๋า"], button[title="Bag"]')?.click()`);
  await sleep(400);

  // a moth, round a lamp
  const mo = await put(A, "moth", "town", "lamp", 0), hm = haunts.find((h) => h.id === mo);
  await warp(A, ...Object.values(await standNear(A, hm, hm, 0.9)));
  await until("the moth is about", () => poseOf(A, mo), 8000, 100);
  await sleep(500);
  await A.shot(`${OUT}/bugs-3-moth.png`);
  p = await poseOf(A, mo);
  const r0 = Math.hypot(p.x - hm.x, p.y - hm.y);
  ok("a moth goes round its lamp", p.flying && r0 > 0.6 && r0 < 1.6, { r0, p });
  got = false;
  for (let i = 0; i < 14 && !got; i++) { if (await lead(A, mo)) await landed(A); else await sleep(150); got = (await held(A, "moth")) > 0; }
  ok("and is taken where it will be, too", got);

  // a dragonfly, by the river
  const df = await put(A, "dragonfly", "town", "water", 0), hd = haunts.find((h) => h.id === df);
  const off = await standNear(A, hd, hd, 5, 8);
  await warp(A, off.x, off.y);
  await until("the dragonfly is about", () => poseOf(A, df), 8000, 100);
  p = await poseOf(A, df);
  const visit0 = p.mind.visit, perch = hd.perches[p.mind.at], beside = await standNear(A, perch);
  await A.evaluate(`${V}.walk(${beside.x}, ${beside.y})`);
  const darted = await until("it darts", async () => { const q = await poseOf(A, df), me = await A.evaluate(`${V}.self()`); return q.mind.visit > visit0 ? { q, me } : null; }, 6000, 30).catch(() => null);
  ok("a dragonfly darts off from somebody who walks up to it", !!darted);
  // (whoever stands and waits by a perch has it come to them)
  let waited = false;
  for (let i = 0; i < 200 && !waited; i++) {
    const q = await poseOf(A, df), me = await A.evaluate(`${V}.self()`);
    if (!q) break;
    if (!me.moving && q.mind.land < Date.now() && Math.hypot(q.aim.x - me.x, q.aim.y - me.y) < 2.2) {
      if (await A.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) { await landed(A); waited = (await held(A, "dragonfly")) > 0; }
    } else await sleep(200);
  }
  ok("and is taken by whoever stands still where it comes to hover", waited, await poseOf(A, df));

  // the farm: a ladybird, a grasshopper, a cricket
  const lb = await put(A, "ladybird", "farm", "field", 0), hl = haunts.find((h) => h.id === lb);
  await warp(A, ...Object.values(await standNear(A, hl)));
  await until("the ladybird is about", () => poseOf(A, lb), 8000, 100);
  // (a plant of somebody else's with a pest on it: a pumpkin sown so many hours ago that one has come, found by looking;
  // and the chance that a ladybird takes it turned to certain)
  await until("the farm's own code", () => A.evaluate(`!!${F}`), 20000);
  let pest = null;
  for (let h = 3; h <= 72 && !pest; h++) for (const k of ["133,6", "134,6", "135,6", "136,6"]) {
    await A.evaluate(`${K}.setPlot(${JSON.stringify(k)}, { soil: "tilled", plant: { by: "somebody-else", crop: "pumpkin", sown: ${K}.now() - ${h} * 3600000, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 } })`);
    await sleep(60);
    if ((await A.evaluate(`${F}.seen(${JSON.stringify(k)})`)).pest) { pest = k; break; }
    await A.evaluate(`${K}.setPlot(${JSON.stringify(k)}, { soil: "wild", plant: null })`);
  }
  ok("a plant of somebody else's with a pest on it is found", !!pest, pest);
  await A.evaluate(`${K}.setRidChance(1)`);
  got = false;
  for (let i = 0; i < 10 && !got; i++) {
    const q = await poseOf(A, lb), me = await A.evaluate(`${V}.self()`);
    if (Math.hypot(q.aim.x - me.x, q.aim.y - me.y) > 2) { const t = await standNear(A, q); await warp(A, t.x, t.y); continue; }
    if (await A.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) await landed(A);
    got = (await held(A, "ladybird")) > 0;
  }
  ok("a ladybird only walks: a swing on it takes it", got);
  {
    // how it is used is said under what was caught (the owner, 2026-10-06: "พร้อมเขียนบอกวิธีใช้ตอนได้แมลงไปเลย"): for the two that eat pests, and no other
    const tip = await A.evaluate(`${B}.tip()`), said = await A.evaluate(`document.querySelector("[data-bug-tip]")?.innerText ?? null`);
    ok("caught, the page says how a ladybird is used: let go on a plant that has a pest, it eats it 50% of the time, or flies off", got && /วิธีใช้/.test(tip ?? "") && /เต่าทอง/.test(tip) && /ต้นที่มีศัตรูพืช/.test(tip) && /มีโอกาส 50%/.test(tip) && /บินหนี/.test(tip) && said === tip, { tip, said });
    await A.shot(`${OUT}/bugs-4a-how-to.png`);
  }
  {
    const last = (await A.evaluate(`${B}.caught()`)).at(-1), plot = (await A.evaluate(`${F}.plots()`))[pest], now = await A.evaluate(`${K}.now()`);
    ok("caught, it took the pest off that plant with it", last?.bug === "ladybird" && last.rid === pest, last);
    ok("the plant is cured at that moment, and is still whose it was", !!plot?.plant && plot.plant.cured > now - 20000 && plot.plant.cured <= now && plot.plant.by === "somebody-else" && plot.plant.crop === "pumpkin", plot);
    await sleep(200);
    ok("and has no pest on it now", (await A.evaluate(`${F}.seen(${JSON.stringify(pest)})`)).pest === false, await A.evaluate(`${F}.seen(${JSON.stringify(pest)})`));
    ok("a line over the catcher's head says a pest went", (await A.evaluate(`${B}.ridShown()`)) === true);
    await A.shot(`${OUT}/bugs-4b-pest-gone.png`);
    await until("the line goes", async () => !(await A.evaluate(`${B}.ridShown()`)), 9000, 200).catch(() => {});
    ok("for a little while, and no longer", (await A.evaluate(`${B}.ridShown()`)) === false);
    // (from here on no ladybird takes one: the last of this check is caught with the chance at nothing)
    await A.evaluate(`${K}.setPlot(${JSON.stringify(pest)}, { soil: "tilled", plant: { ...${JSON.stringify(plot.plant)}, cured: 0 } })`);
    await A.evaluate(`${K}.setRidChance(0)`);
  }

  const gh = await put(A, "grasshopper", "farm", "field", 3), hg = haunts.find((h) => h.id === gh);
  await warp(A, ...Object.values(await standNear(A, hg, hg, 6, 9)));
  await until("the grasshopper is about", () => poseOf(A, gh), 8000, 100);
  await sleep(300);
  await A.shot(`${OUT}/bugs-4-grasshopper.png`);
  // before it: off it hops
  p = await poseOf(A, gh);
  const face = p.right ? 1 : -1, v0 = p.mind.visit;
  const front = await standNear(A, { x: p.x + face * 1.6, y: p.y - face * 1.6 });
  await warp(A, front.x, front.y);
  const hopped = await until("it hops", async () => ((await poseOf(A, gh)).mind.visit > v0 ? true : null), 2500, 40).catch(() => false);
  ok("a grasshopper is off when somebody comes before it", hopped === true, { face, front, p });
  // behind it: it stays, and is taken
  got = false;
  let stayed = false;
  for (let i = 0; i < 14 && !got; i++) {
    await warp(A, ...Object.values(await standNear(A, hg, hg, 6, 9)));
    await until("it has landed", async () => { const q = await poseOf(A, gh); return q && !q.flying ? q : null; }, 4000, 40).catch(() => null);
    const q = await poseOf(A, gh), f = q.right ? 1 : -1, v = q.mind.visit;
    const back = await standNear(A, { x: q.x - f * 1.3, y: q.y + f * 1.3 }, q, 0.95, 2.2);
    if (!back || ((back.x + 0.5 - q.x) - (back.y + 0.5 - q.y)) * f >= 0) continue;
    await A.evaluate(`${V}.warp(${back.x}, ${back.y})`);
    await sleep(120);
    const now = await poseOf(A, gh);
    if (!now || now.mind.visit !== v) continue;
    stayed = true;
    if (await A.evaluate(`${B}.tap(${now.aim.x}, ${now.aim.y})`)) await landed(A);
    got = (await held(A, "grasshopper")) > 0;
  }
  ok("and stays for somebody behind it, who takes it", stayed && got, { stayed, got });

  const cr = await put(A, "cricket", "farm", "field", 6), hc = haunts.find((h) => h.id === cr);
  const away = await standNear(A, hc, hc, 5.5, 8);
  await warp(A, away.x, away.y);
  await until("the cricket is about", () => poseOf(A, cr), 8000, 100);
  await sleep(1500);
  p = await poseOf(A, cr);
  ok("a cricket is not seen, and sings while nobody walks near it", !p.seen && p.sings, p);
  await sleep(300);
  await A.shot(`${OUT}/bugs-5-cricket.png`);
  const nearC = await standNear(A, hc.perches[p.mind.at], hc.perches[p.mind.at], 1.2, 2.1);
  await A.evaluate(`${V}.walk(${nearC.x}, ${nearC.y})`);
  const hushed = await until("it falls quiet", async () => { const q = await poseOf(A, cr); return q && !q.sings ? true : null; }, 6000, 30).catch(() => false);
  ok("it falls quiet while somebody walks up", hushed === true);
  await until("I stand still", async () => !(await A.evaluate(`${V}.self()`)).moving, 8000, 50);
  const again = await until("it sings again", async () => { const q = await poseOf(A, cr); return q && q.sings ? q : null; }, 5000, 50).catch(() => null);
  ok("and sings again when they stand still", !!again);
  const crickets = await held(A, "cricket");
  if (again && (await A.evaluate(`${B}.tap(${again.aim.x}, ${again.aim.y})`))) await landed(A);
  ok("a swing where the song comes from takes it: a cricket for the hook", (await held(A, "cricket")) > crickets, await A.evaluate(`${B}.note()`));

  // the forest: a stick insect among sticks
  const si = await put(A, "stickInsect", "forest", "litter", 1), hs = haunts.find((h) => h.id === si);
  await warp(A, ...Object.values(await standNear(A, hs)));
  await until("the stick insect is about", () => poseOf(A, si), 20000, 100);
  await sleep(1500);
  await A.shot(`${OUT}/bugs-6-stick.png`);
  p = await poseOf(A, si);
  const at0 = p.mind.at, s0 = await stamina(A);
  // (a swing at one of the sticks beside it)
  const decoy = { x: p.x + 0.9, y: p.y + 0.2 };
  const me0 = await standNear(A, p);
  await warp(A, me0.x, me0.y);
  await A.evaluate(`${B}.tap(${decoy.x}, ${decoy.y})`);
  await landed(A);
  const moved = await poseOf(A, si);
  ok("a stick insect lies still among sticks, and after a miss beside it is somewhere else among them", moved && moved.mind.at !== at0 && (await held(A, "stickInsect")) === 0, { at0, moved });
  got = false;
  for (let i = 0; i < 6 && !got; i++) {
    const q = await poseOf(A, si), t = await standNear(A, q);
    await warp(A, t.x, t.y);
    if (await A.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`)) await landed(A);
    got = (await held(A, "stickInsect")) > 0;
  }
  ok("a swing on the right one takes it, the miss counted", got && s0 - (await stamina(A)) === 3, s0 - (await stamina(A)));

  // a beetle up a tree: down only to something sweet, in another's hand
  const rb = await put(A, "rhinoBeetle", "forest", "tree", 0), hr = haunts.find((h) => h.id === rb), trunk = hr.perches[0];
  const mine = await standNear(A, trunk, trunk, 1.1, 2.1);
  await warp(A, mine.x, mine.y);
  await until("the beetle is about", () => poseOf(A, rb), 20000, 100);
  await sleep(4800);
  p = await poseOf(A, rb);
  ok("a beetle stays up its tree for somebody with a net alone", !p.seen && !p.open, p);
  const C = await A.tab("lure");
  await C.goto(`${BASE}/town?townTest=C&townRoom=check&townHour=12&townWeather=clear`);
  await until("the other is ready", async () => (await status(C)) === "ready", 240000);
  await until("the other's trial", () => C.evaluate(`!!${K} && typeof ${K}.grant === "function"`), 20000);
  await C.evaluate(`${K}.grant("resin", 1)`);
  await hold(C, "resin");
  const theirs = await C.evaluate(`(() => { let best = null, d0 = 1e9; for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) { const x = ${Math.floor(trunk.x)} + dx, y = ${Math.floor(trunk.y)} + dy;
    if (!${V}.walkable(x, y) || (x === ${mine.x} && y === ${mine.y})) continue; const d = Math.hypot(x + 0.5 - ${trunk.x}, y + 0.5 - ${trunk.y}); if (d < d0) { d0 = d; best = { x, y, d }; } } return best; })()`);
  await C.evaluate(`${V}.warp(${theirs.x}, ${theirs.y})`);
  const down = await until("the beetle comes down", async () => { const q = await poseOf(A, rb); return q && q.open ? q : null; }, 15000, 100).catch(() => null);
  ok("it comes down to resin held still under it by somebody else", !!down, { theirs, pose: await poseOf(A, rb), sight: (await sights(A)).filter((x) => x.id === rb).map((x) => [x.bug, x.turn]), people: await A.evaluate(`${B}.people()`) });
  await sleep(200);
  await A.shot(`${OUT}/bugs-7-beetle.png`);
  if (down && (await A.evaluate(`${B}.tap(${down.aim.x}, ${down.aim.y})`))) await landed(A);
  ok("and the one with the net takes it", (await held(A, "rhinoBeetle")) === 1, await A.evaluate(`${B}.note()`));
  ok("the resin is still the other's", (await held(C, "resin")) === 1);

  // tired hands
  const ring = (await A.evaluate(`${B}.ringOf("ladybird")`));
  await A.evaluate(`${K}.setStamina(0)`);
  await sleep(500);
  const tired = (await A.evaluate(`${B}.ringOf("ladybird")`));
  ok("with no stamina the net's ring is under half as wide", tired < ring * 0.5 && tired > 0, { ring, tired });
  {
    // two swings beside a ladybird, near enough for it to mind and too far to take it: at the second it is off
    const shy = await put(A, "ladybird", "farm", "field", 11), hs = haunts.find((h) => h.id === shy);
    await warp(A, ...Object.values(await standNear(A, hs)));
    await until("a ladybird to miss is about", () => poseOf(A, shy), 8000, 100);
    /** A swing beside it (the insect's place read and the swing begun in one breath of the page), and what the page then counts against it. */
    const beside = async () => {
      await A.evaluate(`(() => { const p = ${B}.poses().find((p) => p.id === ${shy}); if (p) ${B}.swing(p.aim.x + 0.7, p.aim.y); })()`);
      await sleep(150);
      await landed(A);
      const all = await A.evaluate(`${B}.misses()`), key = Object.keys(all).find((k) => k.startsWith(`${shy}:`));
      return { n: key ? all[key] : 0, fled: await A.evaluate(`${B}.fled()`) };
    };
    const hadShy = await held(A, "ladybird");
    const first = await beside();
    ok("a first tired swing that misses is counted against it, and leaves it there", first.n === 1 && first.fled.length === 0 && !!(await poseOf(A, shy)) && (await sights(A)).some((x) => x.id === shy), first);
    let second = await beside();
    // (a haunt's turn may end between the two swings: what is there then is another insect, missed once)
    if (second.fled.length === 0 && second.n === 1) second = await beside();
    await sleep(300);
    const fled = await A.evaluate(`${B}.fled()`);
    ok("at the second it takes fright and is off: gone from my map, and said so", fled.length === 1 && fled[0].startsWith(`${shy}:`) && !(await sights(A)).some((x) => x.id === shy)
      && /หนีไป|took fright/.test((await A.evaluate(`${B}.note()`)) ?? ""), { fled, note: await A.evaluate(`${B}.note()`) });
    ok("nobody has caught it: it is only I who lost it", (await held(A, "ladybird")) === hadShy && (await A.evaluate(`${K}.bugs().some((x) => x.id === ${shy})`)));
    await A.shot(`${OUT}/bugs-8-fled.png`);
  }
  const lb2 = await put(A, "ladybird", "farm", "field", 9), hl2 = haunts.find((h) => h.id === lb2);
  await warp(A, ...Object.values(await standNear(A, hl2)));
  await until("another ladybird is about", () => poseOf(A, lb2), 8000, 100);
  const had = await held(A, "ladybird");
  got = false;
  // (a tap is a swing only once the page has drawn me where I was put, which a tab behind another does slowly: one
  // that is not taken is tried again a moment later, where it used to be tried twelve times in one breath and given up)
  for (let i = 0; i < 40 && !got; i++) {
    // (a tired net is slow and its ring small: it is aimed where the ladybird will be when the net lands, which for
    // something that only walks the clock alone says; read and swung in one breath of the page)
    const q = await A.evaluate(`(() => { const p = ${B}.poseAt(${lb2}, ${B}.swingMs() + 20), me = ${V}.self(); if (!p) return null;
      const d = Math.hypot(p.aim.x - me.x, p.aim.y - me.y); return { x: p.x, y: p.y, d, swung: d <= 2 ? ${B}.tap(p.aim.x, p.aim.y) : false }; })()`);
    if (!q) break;
    if (q.d > 2) { const t = await standNear(A, q); await warp(A, t.x, t.y); continue; }
    if (!q.swung) { await sleep(150); continue; }
    await landed(A);
    got = (await held(A, "ladybird")) > had;
  }
  ok("but nothing is refused: a swing aimed where it will be still catches it", got);
  {
    const last = (await A.evaluate(`${B}.caught()`)).at(-1), plot = (await A.evaluate(`${F}.plots()`))[pest];
    ok("with the chance at nothing a ladybird takes no pest, and nothing is said", last?.bug === "ladybird" && last.rid === null && plot?.plant?.cured === 0 && (await A.evaluate(`${B}.ridShown()`)) === false, { last, plot });
    await A.evaluate(`${K}.setRidChance(null)`);
    await A.evaluate(`${K}.setPlot(${JSON.stringify(pest)}, { soil: "wild", plant: null })`);
  }
  // caught, an insect is gone for everybody; and one comes back elsewhere on that map
  await A.evaluate(`${K}.setStamina(100)`);
  await A.evaluate(`${K}.unsetBugs()`);
  await C.evaluate(`${K}.unsetBugs()`);
  // (a word of its own from here: what the check caught before, and what came back for it, is forgotten, so that the
  // farm has haunts with nothing in their turn for one to come back to)
  await A.evaluate(`${K}.setSalt("check-back")`);
  await A.evaluate(`${B}.forget()`);
  await sleep(500);
  const one = await put(A, "ladybird", "farm", "field", 5), ho = haunts.find((h) => h.id === one);
  await C.evaluate(`${K}.setBug(${one}, "ladybird")`);
  await until("the other tab has it on its map too", () => C.evaluate(`${B}.sights().some((s) => s.id === ${one} && s.bug === "ladybird")`), 8000, 200);
  await warp(A, ...Object.values(await standNear(A, ho)));
  await until("the ladybird to be caught is about", () => poseOf(A, one), 8000, 100);
  const had2 = await held(A, "ladybird"), before = (await A.evaluate(`${K}.backs()`)).length;
  got = false;
  for (let i = 0; i < 40 && !got; i++) {
    const q = await poseOf(A, one), me = await A.evaluate(`${V}.self()`);
    if (!q) break;
    if (Math.hypot(q.aim.x - me.x, q.aim.y - me.y) > 2) { const t = await standNear(A, q); await warp(A, t.x, t.y); continue; }
    if (!(await A.evaluate(`${B}.tap(${q.aim.x}, ${q.aim.y})`))) { await sleep(150); continue; }
    await landed(A);
    got = (await held(A, "ladybird")) > had2;
  }
  ok("an insect both tabs see is caught in one", got);
  const goneThere = await until("gone from the other", async () => !(await C.evaluate(`${B}.sights().some((s) => s.id === ${one})`)), 8000, 200).then(() => true).catch(() => false);
  ok("it is gone from the other tab's map too, at once", goneThere && !(await sights(A)).some((s) => s.id === one));
  // (every catch of this check brought one back: the one this catch brought is the last of them)
  const every = await A.evaluate(`${K}.backs()`), backs = every.slice(-1), nowT = await A.evaluate(`${K}.now()`);
  ok("and one is to come back at another haunt of the farm, half a minute on", every.length === before + 1 && backs[0].haunt !== one && haunts.find((h) => h.id === backs[0].haunt)?.place === "farm"
    && backs[0].from - nowT > 15000 && backs[0].from - nowT <= 30000,
    { one, before, every: every.map((b) => [b.haunt, haunts.find((h) => h.id === b.haunt)?.place, b.bug, Math.round((b.from - nowT) / 1000)]) });
  if (backs.length === 1) {
    // (it comes back in the turn that haunt is in half a minute on: the haunt may still have its own of the turn before)
    const there = backs[0].haunt, back = (list) => list.find((s) => s.id === there && s.turn === backs[0].turn);
    ok("it is on nobody's map before its moment", !back(await sights(A)) && !back(await sights(C)));
    const came = await until("it comes back", async () => !!back(await sights(A)) && !!back(await sights(C)), 45000, 500).then(() => true).catch(() => false);
    const a1 = back(await sights(A)), c1 = back(await sights(C));
    ok("half a minute later it is on both tabs' maps: the same insect at the same haunt", came && !!a1 && !!c1 && a1.bug === backs[0].bug && c1.bug === backs[0].bug && (await A.evaluate(`${K}.now()`)) >= backs[0].from, { a1, c1 });
    const hb = haunts.find((h) => h.id === there);
    await warp(A, ...Object.values(await standNear(A, hb)));
    await sleep(900);
    await A.shot(`${OUT}/bugs-9-come-back.png`);
  }
  // hunted, a kind grows scarce (the rule is the unit tests' and the dry run's: here, that the trial keeps the catches and the map follows)
  const hunts = await A.evaluate(`${K}.hunts()`);
  ok("what this check caught since its last word is kept, each with its insect and its moment", hunts.length >= 1 && hunts.every((h) => typeof h.bug === "string" && h.at > 0 && h.n >= 1) && hunts.some((h) => h.bug === "ladybird"), hunts);
  await A.evaluate(`${K}.unsetBugs()`);
  await C.evaluate(`${K}.unsetBugs()`);
  await sleep(600);
  const rolled = async (X) => (await X.evaluate(`${K}.bugs()`)).length, plain = await rolled(A);
  ok("(with next to nothing caught, the haunts have their insects)", plain >= 4, plain);
  const KINDS = ["butterflyWhite", "monarch", "morpho", "dragonfly", "damselfly", "glassDragonfly", "grasshopper", "mantis", "cricket", "cicada", "stickInsect", "leafInsect", "firefly", "orchidMantis",
    "moth", "lunaMoth", "hawkMoth", "rhinoBeetle", "stagBeetle", "jewelBeetle", "herculesBeetle", "ladybird", "scarab", "caterpillar"];
  const t0 = await A.evaluate(`${K}.now()`);
  await A.evaluate(`${K}.setHunts(${JSON.stringify(KINDS.map((bug) => ({ bug, at: t0 - 2 * 3600000, n: 1e9 })))})`);
  await sleep(900);
  // (what had come back before is there until its turn ends: it was let come back when it was, and a turn is as it began)
  const cameBack = (await A.evaluate(`${K}.backs()`)).map((b) => b.haunt), own = async (X) => (await X.evaluate(`${K}.bugs()`)).filter((s) => !cameBack.includes(s.id)).length;
  ok("every kind caught beyond counting two hours ago: no haunt has an insect of its own, on either tab's map", (await own(A)) === 0 && (await own(C)) === 0 && (await sights(A)).every((s) => cameBack.includes(s.id)) && (await rolled(A)) < plain,
    { a: await own(A), c: await own(C), told: await rolled(A), cameBack });
  await A.evaluate(`${K}.setHunts(null)`);
  await sleep(900);
  ok("forgotten, they are back as they were", (await rolled(A)) === plain && (await rolled(C)) >= 4, { a: await rolled(A), c: await rolled(C), plain });
  ok("no page errors", A.logs.length === 0 && C.logs.length === 0, [...A.logs, ...C.logs]);
} catch (e) { ok("the run", false, e.stack ?? e.message); console.log(A.logs.join("\n")); } finally { A.close(); await sleep(900); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
