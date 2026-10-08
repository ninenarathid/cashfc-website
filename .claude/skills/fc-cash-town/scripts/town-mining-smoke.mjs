// A first look at mining in a real browser (`next dev` only): one tester goes into the cave's first floor with a
// pick, strikes a rock by real taps, and a picture is taken. The whole check is town-mining.mjs; this is the quick
// one, for whoever is changing the page.
//
//   node town-mining-smoke.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3190", OUT = "."] = process.argv.slice(2);
const T = "window.__cashTown", V = "window.__townView", M = "window.__townMore", K = "window.__townTrade", N = "window.__townMine";
const A = await browser("SA", { width: 1280, height: 800 });
const tap = async (X, x, y) => {
  const r = await X.evaluate(`(() => { const c = document.querySelector("canvas").getBoundingClientRect(); return { x: c.left, y: c.top }; })()`);
  for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: r.x + x, y: r.y + y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
};
try {
  await A.goto(`${BASE}/town?townTest=${A.label}&townRoom=check&townHour=12&townWeather=clear&townAt=cave1`);
  await until("ready", async () => (await status(A)) === "ready", 240000);
  await until("the preview", () => A.evaluate(`!!${M}`), 30000);
  await until("the trial", () => A.evaluate(`!!${K}`), 30000);
  await A.evaluate(`(() => { const t = ${K}; t.caveReset(); t.empty(); t.setStamina(100); t.grant("pick", 1); t.hold(0); })()`).catch((e) => console.log("setup", e.message));
  await until("the mine's layer", () => A.evaluate(`!!${N}`), 30000);
  await sleep(2500);
  console.log("where", JSON.stringify(await A.evaluate(`${N}.where()`)), "hooks", JSON.stringify(await A.evaluate(`${N}.hooks()`)));
  console.log("told", JSON.stringify(await A.evaluate(`(() => { const t = ${N}.told(); return t && { day: t.day, gone: t.gone, ways: t.ways, rests: t.rests }; })()`)));
  const hits = await A.evaluate(`${M}.hits()`);
  console.log("hits", hits.length, JSON.stringify(hits.slice(0, 6)));
  const me = await A.evaluate(`${T}.me().pos`);
  const rocks = await A.evaluate(`${N}.rocks(1)`);
  const near = rocks.map((r) => ({ ...r, far: Math.hypot(r.x - me.x, r.y - me.y) })).sort((a, b) => a.far - b.far)[0];
  console.log("me", JSON.stringify(me), "nearest rock", JSON.stringify(near));
  await A.evaluate(`${K}.setRock(1, ${near.id}, "shards")`);
  // walk up to it by a tap, then strike by taps
  for (let i = 0; i < 12; i++) {
    const h = (await A.evaluate(`${M}.hits()`)).find((x) => x.kind === "caveRock" && x.id === near.id);
    if (!h) { console.log("the rock is gone from the taps after", i); break; }
    await tap(A, h.x, h.y);
    await sleep(i === 0 ? 3500 : 420);
    if (i === 2) await A.shot(`${OUT}/smoke-striking.png`);
    console.log(i, "swings", await A.evaluate(`${N}.swings(1, ${near.id})`), "need", await A.evaluate(`${N}.need(1, ${near.id})`), "card", await A.evaluate(`document.querySelector("[data-mine-came]")?.textContent ?? null`), "note", await A.evaluate(`document.querySelector("[data-mine-note]")?.textContent ?? null`));
  }
  await sleep(300);
  await A.shot(`${OUT}/smoke-broken.png`);
  console.log("bag", JSON.stringify(await A.evaluate(`${K}.purse().bag.filter(Boolean)`)));
  console.log("gone", JSON.stringify(await A.evaluate(`${N}.told().gone`)));
  console.log("errors", JSON.stringify(A.errors?.slice?.(0, 5) ?? []));
} finally {
  await A.close();
}
