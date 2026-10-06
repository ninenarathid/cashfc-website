// The silver-web net's power (the insects' first rank, lib/town/gifts), in a real browser on the dev test room: worn as
// a charm, every insect that is out on the map I am on glints silver where it is, the hidden ones too (a cricket that
// is heard and not seen), on my own screen; not worn, nothing glints; and on another map only that map's insects do.
// Its ring is no wider than anybody's.
//
//   node town-net.mjs <base> <outdir>
//
// Needs `next dev` (the trial's test room). Writes net-*.png.
import { mkdirSync } from "node:fs";
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3100", OUT = "."] = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };
const T = "window.__townTrade", K = "window.__townKeeper", V = "window.__townView", B = "window.__townBugs";
const put = async (X, bug, place, kind, pick = 0) => {
  const id = await X.evaluate(`(() => { const all = ${B}.haunts().filter((h) => h.place === "${place}" && h.kind === "${kind}"); return all[${pick} % all.length]?.id ?? -1; })()`);
  await X.evaluate(`${T}.setBug(${id}, "${bug}")`);
  return id;
};
const here = (X, place) => X.evaluate(`${B}.sights().filter((s) => s.place === "${place}").length`);

const X = await browser("Net", { width: 1280, height: 860 });
try {
  await X.goto(`${BASE}/town?townTest=N&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the trial is there", () => X.evaluate(`!!${T} && !!${B}`), 20000);
  await X.evaluate(`(${T}.reset(), ${T}.forget())`);
  await sleep(500);
  await X.goto(`${BASE}/town?townTest=N&townRoom=check&townHour=12&townWeather=clear`);
  await until("ready", async () => (await status(X)) === "ready", 240000);
  await until("the insects' own code has come", () => X.evaluate(`!!${B}`), 20000);
  // a butterfly at the town's flowers and a moth at one of its lamps
  const fly = await put(X, "butterflyWhite", "town", "blooms", 6);
  await put(X, "moth", "town", "lamp", 0);
  await until("they are out", async () => (await here(X, "town")) >= 2, 10000);
  const haunt = await X.evaluate(`${B}.haunts().find((h) => h.id === ${fly})`);
  await X.evaluate(`${V}.warp(${Math.floor(haunt.x) + 3}, ${Math.floor(haunt.y) + 3})`);
  await sleep(1500);
  const ring = await X.evaluate(`${B}.ringOf("butterflyWhite")`);
  ok("with no net charm nothing glints", (await X.evaluate(`${B}.glints()`)) === 0);
  await X.shot(`${OUT}/net-bare.png`);

  await X.evaluate(`${T}.setGifts(true)`);
  const wore = await X.evaluate(`${K}.charmsWear(["charmNet"])`);
  ok("the silver-web net is worn as a charm", wore.ok === true, wore);
  await sleep(1200);
  const town = await here(X, "town"), lit = await X.evaluate(`${B}.glints()`);
  ok("worn, every insect that is out on this map glints: as many as are out", lit === town && lit >= 2, { lit, town });
  ok("the net's ring is no wider for it", (await X.evaluate(`${B}.ringOf("butterflyWhite")`)) === ring, { ring });
  await X.shot(`${OUT}/net-worn.png`);

  // on the farm only the farm's insects glint: a grasshopper, and a cricket, which is heard and not seen
  await put(X, "grasshopper", "farm", "field", 3);
  const cricket = await put(X, "cricket", "farm", "field", 6);
  await X.evaluate(`${V}.warp(133, 5)`);
  await until("the farm's are out", async () => (await here(X, "farm")) >= 1, 10000);
  await sleep(1200);
  const farm = await here(X, "farm"), lit2 = await X.evaluate(`${B}.glints()`);
  ok("on another map it is that map's insects that glint, and no others", lit2 === farm && farm >= 2, { lit2, farm, town });
  const hidden = await X.evaluate(`(${B}.poses().find((p) => p.id === ${cricket}) ?? {}).seen`);
  ok("…the cricket among them, which does not show itself", hidden === false, { hidden });
  await X.shot(`${OUT}/net-farm.png`);

  await X.evaluate(`${K}.charmsWear([])`);
  await sleep(900);
  ok("taken off, nothing glints", (await X.evaluate(`${B}.glints()`)) === 0);
  ok("no page errors", (X.errors ?? []).length === 0, X.errors);
} finally { await X.close(); }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
