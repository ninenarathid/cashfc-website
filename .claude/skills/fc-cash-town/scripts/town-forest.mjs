// Cash Town's forest in a real browser, on the dev test room (the browser's trial keeps it): the forest has things at
// many of its places; what lies on the ground is picked up with no game; what grows is chosen from among look-alikes
// (a look-alike taken among mushrooms is a toadstool); a tree is shaken and its fruit caught; what is buried is dug
// for with a hoe in the hand, and not offered to empty hands. Beside the camp's fire, cooking is offered to bare hands: a
// stick is whittled from two twigs, and with it in the hand mushrooms are roasted on it, by turning the stick over the
// fire, a game of its own; on a log there, nothing is cooked.
// Prints PASS/FAIL lines and writes pictures to <outdir>.
//
//   node town-forest.mjs <base> <outdir>
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { play } from "./games.mjs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = process.argv[3] ?? ".";
mkdirSync(OUT, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d))}`); };
const profile = mkdtempSync(join(tmpdir(), "town-forest-"));
const proc = spawn(CHROME, ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
  "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map(), logs = [];
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && wait.has(m.id)) { const { ok: res, no } = wait.get(m.id); wait.delete(m.id); m.error ? no(new Error(m.error.message)) : res(m.result); }
  else if (m.method === "Runtime.exceptionThrown") logs.push(`exception: ${m.params.exceptionDetails.exception?.description?.split("\n")[0]}`);
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") logs.push(`console.error: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 200)}`);
};
const send = (method, params = {}) => new Promise((res, no) => { const id = ++seq; wait.set(id, { ok: res, no }); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 860, deviceScaleFactor: 1, mobile: false });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(s.data, "base64")); };
async function until(label, fn, ms = 8000, every = 150) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e.message; } await sleep(every); }
  throw new Error(`${label} timed out (last: ${JSON.stringify(last)?.slice(0, 200)})`);
}
const T = "window.__cashTown", V = "window.__townView", K = "window.__townTrade", F = "window.__townForest", G = "window.__townGame", C = "window.__townCook";
/** The page, as scripts/games.mjs asks for one. */
const X = { evaluate: (expr) => ev(expr) };
/** Open the cooking panel at the fire, put some things together, and stir if it comes to that. */
async function cookAtFire(things, shotAs = null) {
  await until("cooking is offered", async () => (await ev(`${C}.offers()`)).includes("cook"), 5000);
  await ev(`${C}.act("cook")`);
  await until("the cooking panel opens", () => ev(`${C}.open()`), 4000);
  await ev(`${C}.put(${JSON.stringify(things)})`);
  await sleep(300);
  await ev(`${C}.go()`);
  await sleep(350);
  const game = await ev(`${G}?.kind ?? null`);
  if (game) { if (shotAs) { await sleep(1300); await shot(shotAs); } await play(X); await sleep(700); }
  return game;
}
const heldOf = (id) => ev(`${K}.purse().bag.reduce((t, s) => t + (s && s.item === "${id}" ? s.n : 0), 0)`);
/** Stand at a place: on it, or (a tree) on a tile beside it; until gathering is offered there. */
async function standAt(s) {
  for (const [dx, dy] of s.kind === "fruit" ? [[1, 0], [0, 1], [-1, 0], [0, -1]] : [[0, 0]]) {
    await ev(`${V}.warp(${s.x + dx}, ${s.y + dy})`);
    try { return await until("the offer", () => ev(`(${F}.here()?.id === ${s.id}) || null`), 2500); } catch { /* another side of the tree */ }
  }
  return false;
}
try {
  await send("Page.navigate", { url: `${BASE}/town?townTest=W&townRoom=check&townHour=12&townWeather=clear` });
  await until("ready", async () => (await ev(`${T}?.status?.() ?? null`).catch(() => null)) === "ready", 120000, 300);
  await until("the trial", () => ev(`!!${K} && typeof ${K}.grant === "function"`), 20000);
  await ev(`${K}.setSalt("check")`);
  await ev(`${V}.warp(${144 + 48}, ${112 + 70})`);
  const sights = await until("the forest's things", async () => { const s = await ev(`${F}?.sights?.() ?? null`); return s && s.length > 40 && s; }, 20000);
  ok("the forest has things at many of its places", sights.length > 80, sights.length);
  const kinds = [...new Set(sights.map((s) => s.kind))];
  ok("of every kind that is there by day", ["sticks", "leaves", "flowers", "mushrooms", "greens", "berries", "mound", "fruit"].every((k) => kinds.includes(k)), kinds);
  ok("what is buried is not told", sights.filter((s) => s.kind === "mound").every((s) => s.item === null) && sights.filter((s) => s.kind !== "mound").every((s) => !!s.item));
  await sleep(1200);
  await shot("gather-0-meadow");

  // picked up: no game
  const stick = sights.find((s) => s.kind === "sticks" || s.kind === "leaves");
  ok("gathering is offered at a place stood on", await standAt(stick), stick);
  await shot("gather-1-offer");
  const before = await heldOf(stick.item);
  await ev(`${F}.act()`);
  const got = await until("it is in the bag", async () => (await heldOf(stick.item)) > before, 4000).catch((e) => e.message);
  ok("what lies on the ground is picked up at once, with no game", got === true, got);
  ok("and the place has nothing more for me", !(await ev(`${F}.sights().some((s) => s.id === ${stick.id})`)));
  ok("it cost a point of stamina", (await ev(`${K}.purse().stamina.left`)) === 99, await ev(`${K}.purse().stamina`));

  // chosen: a game for the eyes
  const shroom = sights.find((s) => s.kind === "mushrooms") ?? sights.find((s) => s.kind === "berries");
  await standAt(shroom);
  await ev(`${F}.act()`);
  const game = await until("the choosing game", () => ev(`${G}?.kind ?? null`), 4000).catch((e) => e.message);
  ok("what grows is chosen from among what looks like it, in a game of its own", game === "choosing", game);
  await sleep(500);
  await shot("gather-2-choosing");
  const bunch = await ev(`${G}.bunch()`);
  ok("the patch has the good ones and two look-alikes", bunch.cells.filter((c) => c && c.good).length === shroom.n && bunch.cells.filter((c) => c && !c.good).length === 2, bunch);
  const had = await heldOf(shroom.item);
  // one look-alike taken, then every good one
  await ev(`${G}.take(${bunch.cells.findIndex((c) => c && !c.good)})`);
  for (const [i, c] of bunch.cells.entries()) if (c && c.good) { await sleep(120); await ev(`${G}.take(${i})`); }
  const chose = await until("the mushrooms are in the bag", async () => (await heldOf(shroom.item)) > had, 5000).catch((e) => e.message);
  ok("every good one taken, it is gathered", chose === true, chose);
  const toad = await heldOf("toadstool");
  ok("a look-alike taken among mushrooms is a toadstool in the bag", shroom.kind !== "mushrooms" || toad === 1, toad);

  // shaken down: a game for the hand
  const tree = sights.find((s) => s.kind === "fruit");
  ok("a tree that bears is stood beside", await standAt(tree), tree);
  await sleep(600);
  await shot("gather-3-tree");
  await ev(`${F}.act()`);
  ok("it is shaken, and what falls is caught, in a game of its own", (await until("the catching game", () => ev(`${G}?.kind ?? null`), 4000).catch((e) => e.message)) === "catching");
  const fruitBefore = await heldOf(tree.item);
  let pictured = false;
  for (let i = 0; i < 200; i++) {
    const st = await ev(`${G} && ${G}.kind === "catching" ? { t: ${G}.time(), drops: ${G}.shower().drops } : null`);
    if (!st) break;
    const next = st.drops.find((d) => d.caught === null);
    if (!next) break;
    await ev(`${G}.move(${next.lane})`);
    if (!pictured && st.t > 1.2) { pictured = true; await shot("gather-4-catching"); }
    await sleep(60);
  }
  const fruit = await until("the fruit is in the bag", async () => (await heldOf(tree.item)) - fruitBefore, 5000).catch((e) => e.message);
  ok("with the basket under each as it lands, all of it is caught", fruit === tree.n, { fruit, n: tree.n });

  // dug up: a hoe, and a game of care
  const mound = sights.find((s) => s.kind === "mound");
  await ev(`${V}.warp(${mound.x}, ${mound.y})`);
  await sleep(900);
  ok("digging is not offered to empty hands", (await ev(`${F}.here()`)) === null, await ev(`${F}.here()`));
  await ev(`${K}.grant("hoe", 1)`);
  await ev(`${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "hoe"))`);
  ok("with a hoe in the hand it is", await until("the offer", () => ev(`(${F}.here()?.id === ${mound.id}) || null`), 4000).catch(() => false));
  const bagBefore = await ev(`JSON.stringify(${K}.purse().bag)`);
  await ev(`${F}.act()`);
  ok("it is dug for, in a game of its own", (await until("the digging game", () => ev(`${G}?.kind ?? null`), 4000).catch((e) => e.message)) === "digging");
  await sleep(400);
  await shot("gather-5-digging");
  const dig = await ev(`${G}.dig()`);
  for (const [i, c] of dig.cells.entries()) if (c.over) for (let n = c.earth; n > 0; n--) { await ev(`${G}.strike(${i})`); await sleep(70); }
  const dugUp = await until("something is in the bag", async () => (await ev(`JSON.stringify(${K}.purse().bag)`)) !== bagBefore, 5000).catch((e) => e.message);
  ok("every part laid bare and not one struck again, it is got out whole", dugUp === true, dugUp);
  await sleep(500);
  await shot("gather-6-dug");
  ok("the stamina each way of gathering costs has been spent", (await ev(`${K}.purse().stamina.left`)) === 100 - 1 - 2 - 2 - 3, await ev(`${K}.purse().stamina`));

  // the camp's fire: a place to cook at, with a stick whittled there
  await ev(`${K}.letGo()`);
  await ev(`${V}.warp(${144 + 47}, ${112 + 46})`);
  await until("the kitchen's own code has come", () => ev(`!!${C}`), 20000);
  await sleep(900);
  ok("on a log, two steps from the fire, nothing is cooked", !(await ev(`${C}.offers()`)).includes("cook"), await ev(`${C}.offers()`));
  await ev(`${V}.warp(${144 + 50}, ${112 + 47})`);
  const offered = await until("cooking is offered", async () => (await ev(`${C}.offers()`)).includes("cook"), 5000).catch((e) => e.message);
  ok("beside the camp's fire, cooking is offered to bare hands", offered === true, offered);
  ok("and nothing of the forest's is offered there", (await ev(`${F}.here()`)) === null, await ev(`${F}.here()`));
  await sleep(600);
  await shot("camp-0-fire");
  await ev(`(() => { for (const [id, n] of [["twig", 2], ["salt", 1], ["shiitake", 2]]) ${K}.grant(id, n); })()`);
  const twigs = await heldOf("twig");
  await cookAtFire([["twig", 2]]);
  ok("two twigs are whittled into a skewer, by hand", (await heldOf("skewer")) === 1 && (await heldOf("twig")) === twigs - 2, { skewer: await heldOf("skewer"), twig: await heldOf("twig") });
  await ev(`${K}.hold(${K}.purse().bag.findIndex((s) => s && s.item === "skewer"))`);
  await sleep(400);
  const roast = await cookAtFire([["salt", 1], ["shiitake", 2]], "camp-1-roasting");
  ok("what is cooked on a stick is roasted over the fire, in a game of its own", roast === "roasting", roast);
  const pot = await ev(`${K}.purse().bag.find((s) => s && s.item === "potFull")?.of ?? null`);
  ok("with the skewer in the hand, salt and mushrooms are roasted on it", pot?.dish === "mushroomSkewer" && pot.left >= 1, pot);
  ok("the skewer is still mine, and the recipe is found", (await heldOf("skewer")) === 1 && (await ev(`${C}.found().some((f) => (f.id ?? f.item ?? f) === "mushroomSkewer")`)), await ev(`JSON.stringify(${C}.found()).slice(0, 300)`));
  await sleep(500);
  await shot("camp-2-roasted");
  ok("no page errors", logs.length === 0, logs);
} catch (e) { ok("the run", false, e.message); console.log(logs.join("\n")); } finally { try { ws.close(); } catch {} try { proc.kill(); } catch {} await sleep(600); try { rmSync(profile, { recursive: true, force: true }); } catch {} }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
