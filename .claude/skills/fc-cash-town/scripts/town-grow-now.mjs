// The giant seeds growing a ripe plant at once, in the real game (the dev test room, the trial keeping it): "let it grow" with
// the second button, the game, a miss and trying again, a pass, the map's bursting frame by frame, the panel when the day's use
// is spent, and the magic garden's words. Each state photographed at desktop, phone and a small phone.
//   node .claude/skills/fc-cash-town/scripts/town-grow-now.mjs http://localhost:<port> <outdir> [desktop|phone|small|all]
const { browser, sleep, status, until } = await import(new URL("./cdp.mjs", import.meta.url).href);
const [BASE = "http://localhost:3231", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const T = "window.__townTrade", V = "window.__townView", FARM = "cashtown.trial.farm.2", BEDS = "cashtown.trial.beds.1";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, small: { width: 360, height: 640, dpr: 2, mobile: true } };
let good = 0, bad = 0;
const ok = (what, yes, more = "") => { if (yes) good++; else { bad++; console.log(`  FAIL ${what} ${more}`); } };

const lay = (ceiling) => `(() => {
  const H = 3600000, now = Date.now(), me = ${T}.id, farm = {}, Q = (c) => ({ at: now + 9000 * H, span: 100, area: [c, c, c, c], nar: [0, 0, 0] });
  for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) farm[(132 + u) + "," + (4 + v)] = { soil: "tilled", plant: null };
  farm["135,7"] = { soil: "tilled", plant: { by: me, crop: "pumpkin", sown: now - 400 * H, boost: 0, watered: now - H, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0, q: Q(${ceiling}) } };
  localStorage.setItem("${FARM}", JSON.stringify(farm));
  const beds = {}; for (let b = 0; b < 24; b++) beds[b] = { by: me, tended: now, empty: 0, name: "" };
  localStorage.setItem("${BEDS}", JSON.stringify(beds));
})()`;

for (const label of ONLY === "all" ? Object.keys(SIZES) : [ONLY]) {
  const size = SIZES[label], X = await browser("growNow" + label, size), phone = label !== "desktop";
  const shot = (name) => X.shot(`${OUT}/${label}-${name}.png`);
  const enter = async () => { await X.goto(`${BASE}/town?townTest=${phone ? "Y" : "W"}&townRoom=grownow&townHour=11&townWeather=clear`); await until("ready", async () => (await status(X)) === "ready", 300000); await until("view", () => X.evaluate(`!!${T} && !!${V} && !!${V}.tileScreen`), 60000); };
  const go = async (x, y, ms = 2200) => { await X.evaluate(`(() => { ${V}.warp(${x}, ${y}); ${V}.lookAt(${x + 0.5}, ${y + 0.5}); })()`); await sleep(ms); };
  const has = (sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const click = (sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`);
  const farm = () => X.evaluate(`JSON.parse(localStorage.getItem("${FARM}"))`);
  const purse = () => X.evaluate(`${T}.purse()`);
  const openGrow = async () => { await until("chip", () => has("[data-quality-chip]"), 15000); await click("[data-quality-chip]"); await sleep(600); await click("[data-quality-grow-open]"); await sleep(600); };
  // (three presses of the game's dig, each while the trowel is over its mark or well away from it; the game's own times)
  // (`slow`: the page's clock at a sixteenth from the last press, for the bursting to be photographed frame by frame)
  const play = (hit, slow = false) => X.evaluate(`(async () => {
    const run = ${T}.purse().professionRewards.giant, marks = []; let z = run.seed;
    for (let i = 0; i < 3; i++) { z = (Math.imul(z, 1664525) + 1013904223) >>> 0; marks.push(0.2 + (z % 61) / 100); }
    const trowel = document.querySelector("[data-giant-trowel]"), track = trowel.parentElement, btn = document.querySelector("[data-giant-dig]");
    const down = () => { const r = btn.getBoundingClientRect(), o = { bubbles: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0, clientX: r.x + 5, clientY: r.y + 5 }; btn.dispatchEvent(new PointerEvent("pointerdown", o)); btn.dispatchEvent(new PointerEvent("pointerup", o)); btn.click(); };
    for (let i = 0; i < 3; i++) {
      for (let tries = 0; tries < 800; tries++) {
        await new Promise(requestAnimationFrame);
        const at = parseFloat(trowel.style.left) / 100, near = Math.abs(at - marks[i]);
        if (${hit ? "near < 0.04" : "near > 0.3"}) break;
      }
      if (${slow} && i === 2) { const real = performance.now.bind(performance), base = real(); performance.now = () => base + (real() - base) / 16; }
      down();
      await new Promise((r) => setTimeout(r, 120));
    }
  })()`);
  try {
    await enter();
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.empty())`);
    await X.evaluate(lay(100));
    await enter(); await sleep(800);
    await X.evaluate(`(${T}.grant("seedPumpkin", 9), ${T}.setGifts(["thingGiantSeeds"]))`);
    await X.evaluate(`(window.__townZoomFree = true, ${V}.zoom(${phone ? 0.55 : 0.8}))`);
    await go(135, 7, 2400); await openGrow();

    // ── the panel, with its second button ──
    ok(`${label}: the panel offers to grow at once`, await has("[data-quality-grow-atonce]"));
    await click('[data-quality-grow-size="7"]'); await sleep(300);
    await X.evaluate(`document.querySelector("[data-quality-grow-atonce-note]")?.scrollIntoView({ block: "center" })`); await sleep(200);
    await shot("panel");
    const boxes = await X.evaluate(`["[data-quality-grow-atonce]", "[data-quality-grow-go]"].map((q) => { const r = document.querySelector(q).getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom), Math.round(r.width), Math.round(r.height)]; })`);
    ok(`${label}: both buttons are on the screen and side by side`, boxes.every((b) => b[3] <= size.height && b[1] <= size.width && b[5] >= 44) && boxes[0][1] <= boxes[1][0], JSON.stringify(boxes));
    ok(`${label}: each wide enough for a thumb`, boxes.every((b) => b[4] >= 96), JSON.stringify(boxes));

    // ── the game ──
    await click("[data-quality-grow-atonce]");
    await until("the game", () => has("[data-giant-game]"), 15000); await sleep(300);
    await shot("game");
    const run = (await purse()).professionRewards?.giant;
    ok(`${label}: a go begun for that plant and size`, run?.grow === 7 && run?.key === "135,7", JSON.stringify(run));

    // ── a miss ──
    await play(false);
    await until("the miss", () => has("[data-grow-at-once-missed]"), 15000); await sleep(300);
    await shot("missed");
    ok(`${label}: missed, the plant is as it was`, !(await farm())["135,7"].plant.size);
    ok(`${label}: and the seeds`, (await purse()).bag.find((s) => s?.item === "seedPumpkin")?.n === 9);

    // ── a pass: the panels gone, the map bursting ──
    await click("[data-grow-at-once-again]");
    await until("the game again", () => has("[data-giant-game]"), 15000); await sleep(300);
    await play(true, true);
    await until("the panels close", async () => !(await has("[data-grow-at-once]")) && !(await has("[data-quality-inspector]")), 15000);
    // (its 1.5 s at a sixteenth: 24 s of frames)
    for (let i = 0; i < 12; i++) { await shot(`burst-${String(i).padStart(2, "0")}`); await sleep(1500); }
    await X.evaluate(`(() => { delete performance.now; })()`);
    const grown = (await farm())["135,7"].plant;
    ok(`${label}: passed, it is whole-bed at once`, grown.size?.n === 7 && grown.size.at === grown.size.until && grown.footprint?.length === 49, JSON.stringify(grown.size));
    ok(`${label}: six seeds gone`, (await purse()).bag.find((s) => s?.item === "seedPumpkin")?.n === 3);
    await sleep(1400);
    await shot("after");
    ok(`${label}: the pull is on offer straight away`, await has("[data-giant-pull-open]"));

    // ── spent: another plant, and the magic garden's words ──
    await X.evaluate(lay(100));
    await enter(); await sleep(800);
    await X.evaluate(`(window.__townZoomFree = true, ${V}.zoom(${phone ? 0.55 : 0.8}))`);
    await go(135, 7, 2400); await openGrow();
    ok(`${label}: the day's use spent, the second button is shut`, await X.evaluate(`document.querySelector("[data-quality-grow-atonce]")?.disabled === true`));
    await X.evaluate(`document.querySelector("[data-quality-grow-atonce-note]")?.scrollIntoView({ block: "center" })`); await sleep(200);
    await shot("panel-spent");
    await click('[data-quality-grow] [aria-label="ปิด"]'); await sleep(250); await click('[data-quality-inspector] [aria-label="ปิด"]'); await sleep(300);
    await go(133, 5, 1800);
    await click("[data-garden-rewards]"); await sleep(500);
    await X.evaluate(`(() => { const d = document.querySelector("[data-giant] details"); if (d) { d.open = true; d.scrollIntoView({ block: "center" }); } })()`); await sleep(300);
    ok(`${label}: the magic garden tells both uses`, await X.evaluate(`document.querySelector("[data-giant] details")?.textContent.includes("โตทันที")`));
    await shot("magic-garden-words");
    console.log(label, "errors", JSON.stringify((await X.errors?.()) ?? []).slice(0, 400));
  } finally { X.close(); }
}
console.log(`town-grow-now: ${good} checks passed${bad ? `, ${bad} FAILED` : ""}.`);
process.exit(bad ? 1 : 0);
