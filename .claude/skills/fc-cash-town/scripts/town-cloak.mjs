// The butterfly-wing cloak (the insects' sixth rank, lib/town/gifts' charmCloak), in a real browser on the dev test
// room. A pair at a time: without the cloak an insect caught has nothing following; with it, another of its kind is
// on the wing where the first was, with a ring about it running down, and a swing on it within three seconds has it
// (two of the kind, each a catch); a swing beside it misses, and not netted in time it is off and there is only the
// one, which the keeper then refuses too. And the rare insects of a day, every day: at some hour within two days a
// haunt has for the cloak's wearer an insect that has days of its own and that nobody else has there; taken off, it
// is not there; put on again, it is, and it is netted.
//
//   node town-cloak.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes cloak-*.png.
import { mkdirSync, writeFileSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 700)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", B = "window.__townBugs";
const DAY_KINDS = ["monarch", "morpho", "glassDragonfly", "hawkMoth", "jewelBeetle", "herculesBeetle"];
const poseOf = (X, id) => X.evaluate(`${B}.poses().find((p) => p.id === ${id}) ?? null`);
const held = (X, id) => X.evaluate(`${T}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
const warp = async (X, x, y) => { await X.evaluate(`${V}.warp(${Math.floor(x)}, ${Math.floor(y)})`); await sleep(350); };
const standNear = (X, at, from = null, least = 0, most = 99) => X.evaluate(`(() => { let best = null, d0 = 1e9;
  for (let dx = -9; dx <= 9; dx++) for (let dy = -9; dy <= 9; dy++) { const x = Math.floor(${at.x}) + dx, y = Math.floor(${at.y}) + dy;
    if (!${V}.walkable(x, y)) continue;
    const d = Math.hypot(x + 0.5 - ${at.x}, y + 0.5 - ${at.y}), f = ${from ? `Math.hypot(x + 0.5 - ${from.x}, y + 0.5 - ${from.y})` : "50"};
    if (f < ${least} || f > ${most}) continue;
    if (d < d0) { d0 = d; best = { x, y }; } }
  return best; })()`);
const closeUp = async (X, file, box = { x: 440, y: 330, width: 400, height: 300 }, scale = 3) => {
  const s = await X.send("Page.captureScreenshot", { format: "png", clip: { ...box, scale } });
  writeFileSync(file, Buffer.from(s.data, "base64"));
};
/** Put a ladybird at a field of the farm's, stand a step or two from it, and net it: says where I stood. */
const catchLadybird = async (X, haunts, pick) => {
  const fields = haunts.filter((h) => h.place === "farm" && h.kind === "field"), h = fields[pick % fields.length], had = await held(X, "ladybird");
  await X.evaluate(`${T}.setBug(${h.id}, "ladybird")`);
  await warp(X, ...Object.values(await standNear(X, h)));
  await until("the ladybird is about", () => poseOf(X, h.id), 10000, 100);
  for (let i = 0; i < 20; i++) {
    const q = await poseOf(X, h.id), me = await X.evaluate(`${V}.self()`);
    if (!q) break;
    const d = Math.hypot(q.aim.x - me.x, q.aim.y - me.y);
    if (d > 1.6 || d < 0.6) { const t = await standNear(X, q.aim, q.aim, 0.8, 1.5); if (t) await warp(X, t.x, t.y); continue; }
    await until("the net is ready", async () => (await X.evaluate(`${B}.ready()`)) === 0, 3000, 30).catch(() => {});
    // (aimed where a ladybird will be when the net lands: it only walks, so the clock says)
    await X.evaluate(`(() => { const p = ${B}.poseAt(${h.id}, ${B}.swingMs() + 20); return p ? ${B}.tap(p.aim.x, p.aim.y) : false; })()`);
    const got = await until("it is caught", async () => (await held(X, "ladybird")) > had, 1500, 20).catch(() => false);
    if (got) return { haunt: h, me: await X.evaluate(`${V}.self()`) };
  }
  return null;
};
const begin = async (X, who) => {
  const url = `${BASE}/town?townTest=${who}&townRoom=check&townHour=12&townWeather=clear`;
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${B}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(url);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
  await X.evaluate(`${T}.setSalt("check")`);
  await X.evaluate(`${T}.setRidChance(0)`);
  await X.evaluate(`${T}.grant("bugNet", 1)`);
  await X.evaluate(`${T}.hold(${T}.purse().bag.findIndex((s) => s && s.item === "bugNet"))`);
  await sleep(400);
};

const X = await browser("Cloak", { width: 1280, height: 860 });
try {
  await begin(X, "C");
  const haunts = await X.evaluate(`${B}.haunts()`);

  // without the cloak: one insect, nothing following
  let caught = await catchLadybird(X, haunts, 1);
  await sleep(300);
  ok("without the cloak an insect caught has nothing following", !!caught && (await X.evaluate(`${B}.follower()`)) === null && !(await X.evaluate(`${T}.purse().follower`)), { caught, f: await X.evaluate(`${T}.purse().follower`) });

  // with it: another of its kind, three seconds long
  await X.evaluate(`${T}.setGifts(["charmCloak"])`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmCloak"])`);
  await sleep(500);
  ok("the butterfly-wing cloak is worn as a charm", wore.ok === true, wore);
  const had1 = await held(X, "ladybird"), stamina1 = await X.evaluate(`${T}.purse().stamina.left`);
  caught = await catchLadybird(X, haunts, 3);
  let f = await until("another follows", () => X.evaluate(`${B}.follower()`), 2000, 20).catch(() => null);
  const kept = await X.evaluate(`${T}.purse().follower`);
  ok("with it, an insect caught has another of its kind following, on the wing where the first was", !!caught && !!f && f.bug === "ladybird" && f.flying === true && f.open === true && f.left > 2000 && f.left <= 3000
    && Math.hypot(f.aim.x - f.at.x, f.aim.y - f.at.y) <= 1.1, f);
  ok("the keeper has it in my purse for three seconds", !!kept && kept.bug === "ladybird" && kept.n === 1, kept);
  await sleep(200);
  await closeUp(X, `${OUT}/cloak-0-follower.png`);
  await X.shot(`${OUT}/cloak-0-follower-far.png`);
  // netted where it will be when the net lands (its wheel is the clock's own)
  await until("the net is ready", async () => (await X.evaluate(`${B}.ready()`)) === 0, 3000, 20).catch(() => {});
  const swung = await X.evaluate(`(() => { const p = ${B}.follower(${B}.swingMs() + 20); return p ? { tapped: ${B}.tap(p.aim.x, p.aim.y), left: p.left } : null; })()`);
  await until("the pair is caught", async () => (await held(X, "ladybird")) >= had1 + 2, 2500, 30).catch(() => {});
  const note = await X.evaluate(`${B}.note()`);
  ok("a swing on it within its three seconds has it: two of the kind", !!swung && swung.tapped === true && (await held(X, "ladybird")) === had1 + 2, { swung, held: await held(X, "ladybird"), note });
  ok("the page says the pair was had, and the second has none following", /ครบคู่/.test(note ?? "") && (await X.evaluate(`${B}.follower()`)) === null && (await X.evaluate(`${T}.purse().follower`)) === null, { note, f: await X.evaluate(`${T}.purse().follower`) });
  const stamina2 = await X.evaluate(`${T}.purse().stamina.left`);
  ok("each of the two cost its own stamina", stamina1 - stamina2 >= 2 && stamina1 - stamina2 <= 6, { stamina1, stamina2 });
  ok("and each counts against its kind", (await X.evaluate(`${T}.hunts().filter((h) => h.bug === "ladybird").length`)) === 3, await X.evaluate(`${T}.hunts()`));
  await sleep(800);

  // a swing beside it misses; not netted in time, there is only the one
  const had2 = await held(X, "ladybird");
  caught = await catchLadybird(X, haunts, 5);
  f = await until("another follows", () => X.evaluate(`${B}.follower()`), 2000, 20).catch(() => null);
  await until("the net is ready", async () => (await X.evaluate(`${B}.ready()`)) === 0, 3000, 20).catch(() => {});
  await X.evaluate(`(() => { const p = ${B}.follower(${B}.swingMs() + 20); return p ? ${B}.tap(p.aim.x + 1.0, p.aim.y + 0.1) : null; })()`);
  await sleep(450);
  const after = await X.evaluate(`${B}.follower()`);
  ok("a swing a tile beside it misses: it is there still, and the miss is counted", !!f && !!after && after.missed === 1 && (await held(X, "ladybird")) === had2 + 1, { after, held: await held(X, "ladybird") });
  await sleep(250);
  await closeUp(X, `${OUT}/cloak-1-running-out.png`);
  await until("its time is up", async () => (await X.evaluate(`${B}.follower()`)) === null, 4000, 50);
  await sleep(700);
  const flown = await X.evaluate(`${B}.note()`);
  ok("not netted within three seconds it is off, and there is only the one", (await held(X, "ladybird")) === had2 + 1 && /บินหนี/.test(flown ?? ""), { flown, held: await held(X, "ladybird") });
  await sleep(2700);
  const late = await X.evaluate(`${K}.netMine("pair", [${Math.floor(caught.me.x)}, ${Math.floor(caught.me.y)}], { misses: 0 }, "late")`);
  ok("and the keeper refuses it too, once its time and the journey's are over", late.ok === false && late.why === "none", late);

  // the rare insects of a day, every day: an hour is looked for at which the cloak has one that nobody else has
  await X.evaluate(`${T}.unsetBugs()`);
  let rare = null;
  for (let step = 0; step < 60 && !rare; step++) {
    const worn = await X.evaluate(`${T}.bugs()`);
    await X.evaluate(`${K}.charmsWear([])`);
    const bare = await X.evaluate(`${T}.bugs()`);
    await X.evaluate(`${K}.charmsWear(["charmCloak"])`);
    // (a monarch among the town's flowers: one that goes its round and is netted by one alone)
    const only = worn.find((s) => s.bug === "monarch" && bare.find((b) => b.id === s.id)?.bug !== s.bug);
    if (only) rare = { sight: only, bare: bare.find((b) => b.id === only.id) ?? null, others: worn.filter((s) => DAY_KINDS.includes(s.bug) && bare.find((b) => b.id === s.id)?.bug !== s.bug).length };
    else await X.evaluate(`${T}.skipHours(1)`);
  }
  ok("at some hour within two days a haunt has, for the cloak's wearer, a monarch on a day that is not the monarchs'", !!rare, rare);
  if (rare) {
    const h = haunts.find((x) => x.id === rare.sight.id);
    await warp(X, ...Object.values(await standNear(X, h)));
    await until("the monarch is about", () => poseOf(X, h.id), 10000, 100);
    const mine = await poseOf(X, h.id);
    ok("it is on the wing at its haunt for me", !!mine && mine.bug === "monarch" && mine.flying === true, mine);
    await sleep(300);
    await X.shot(`${OUT}/cloak-2-monarch.png`);
    await X.evaluate(`${K}.charmsWear([])`);
    await sleep(700);
    const off = await poseOf(X, h.id);
    ok("taken off, the monarch is not there: the haunt has what everybody has (" + (rare.bare?.bug ?? "nothing") + ")", (off?.bug ?? null) === (rare.bare?.bug ?? null), { off: off?.bug ?? null, bare: rare.bare });
    await X.evaluate(`${K}.charmsWear(["charmCloak"])`);
    await until("put on again, it is back", async () => (await poseOf(X, h.id))?.bug === "monarch", 5000, 100).catch(() => {});
    ok("put on again, it is there again", (await poseOf(X, h.id))?.bug === "monarch");
    // netted where it will be: a butterfly goes its round by the clock
    let got = false;
    for (let i = 0; i < 40 && !got; i++) {
      const q = await poseOf(X, h.id), me = await X.evaluate(`${V}.self()`);
      if (!q) break;
      if (Math.hypot(q.aim.x - me.x, q.aim.y - me.y) > 1.7) { const t = await standNear(X, q.aim); await warp(X, t.x, t.y); continue; }
      await until("the net is ready", async () => (await X.evaluate(`${B}.ready()`)) === 0, 3000, 20).catch(() => {});
      await X.evaluate(`(() => { const p = ${B}.poseAt(${h.id}, ${B}.swingMs() + 20), me = ${V}.self(); return p && Math.hypot(p.aim.x - me.x, p.aim.y - me.y) <= 2.3 ? ${B}.tap(p.aim.x, p.aim.y) : false; })()`);
      await sleep(600);
      got = (await held(X, "monarch")) > 0;
    }
    ok("and is netted: a monarch in the bag on a day that is not the monarchs'", got, await X.evaluate(`${B}.note()`));
    const f2 = await X.evaluate(`${B}.follower()`);
    ok("…with another following it, as any insect caught under the cloak", !got || (!!f2 && f2.bug === "monarch") || (await held(X, "monarch")) >= 2, f2);
  }
  { const thrown = X.logs.filter((x) => x.startsWith("exception")); ok("no page errors", thrown.length === 0, thrown); }
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
