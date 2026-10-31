// A plant let grow over its ground, in the real game (the dev test room, the trial keeping it): the inspector's button, the
// panel on the bed's map, the press, the young plant on the map, what the inspector says while it swells, the pull's board
// short of hands, full and under way, the dig alone, the sale; a ripe plant's gold told; an animal raised. Each state
// photographed at desktop, phone and a small phone.
//   node .claude/skills/fc-cash-town/scripts/town-grow.mjs http://localhost:<port> <outdir> [desktop|phone|small|all]
const { browser, sleep, status, until } = await import(new URL("./cdp.mjs", import.meta.url).href);
const [BASE = "http://localhost:3231", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const T = "window.__townTrade", V = "window.__townView", S = "window.__townPasture", FARM = "cashtown.trial.farm.2", BEDS = "cashtown.trial.beds.1";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, small: { width: 360, height: 640, dpr: 2, mobile: true } };
let good = 0, bad = 0;
const ok = (what, yes, more = "") => { if (yes) good++; else { bad++; console.log(`  FAIL ${what} ${more}`); } };

// (a bed of tilled plots; `plants` laid on it: a round settled ahead of every moment here)
const lay = (plants) => `(() => {
  const H = 3600000, now = Date.now(), me = ${T}.id, farm = {};
  const Q = (c, nar = 0) => ({ at: now + 9000 * H, span: 100, area: [c, c, c, c], nar: [nar * 5, nar * 5, 0] });
  const put = (x, y, crop, n = 1, more = {}) => {
    const root = x + "," + y, keys = []; for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) keys.push((x + u) + "," + (y + v));
    const p = { by: me, crop, sown: now - 400 * H, boost: 0, watered: now - H, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0, q: Q(100), ...(n > 1 ? { root, footprint: keys, rotation: 0, giant: true, size: { n, at: now - H, until: now - 1000, plain: true } } : {}), ...more };
    for (const k of keys) farm[k] = { soil: "tilled", plant: { ...p } };
  };
  const till = (x, y, w, h) => { for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) { const k = (x + u) + "," + (y + v); if (!farm[k]) farm[k] = { soil: "tilled", plant: null }; } };
  ${plants}
  localStorage.setItem("${FARM}", JSON.stringify(farm));
  const beds = {}; for (let b = 0; b < 24; b++) beds[b] = { by: me, tended: now, empty: 0, name: "" };
  localStorage.setItem("${BEDS}", JSON.stringify(beds));
})()`;

for (const label of ONLY === "all" ? Object.keys(SIZES) : [ONLY]) {
  const size = SIZES[label], X = await browser("grow" + label, size), phone = label !== "desktop";
  const shot = (name) => X.shot(`${OUT}/${label}-${name}.png`);
  const enter = async () => { await X.goto(`${BASE}/town?townTest=${phone ? "Y" : "W"}&townRoom=grow&townHour=11&townWeather=clear`); await until("ready", async () => (await status(X)) === "ready", 300000); await until("view", () => X.evaluate(`!!${T} && !!${V} && !!${V}.tileScreen`), 60000); };
  const go = async (x, y, ms = 2200) => { await X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {}); await X.evaluate(`(() => { ${V}.warp(${x}, ${y}); ${V}.lookAt(${x + 0.5}, ${y + 0.5}); })()`); await sleep(ms); };
  const zoom = (z) => X.evaluate(`(window.__townZoomFree = true, ${V}.zoom(${z}))`);
  const has = (sel) => X.evaluate(`!!document.querySelector(${JSON.stringify(sel)})`);
  const click = (sel) => X.evaluate(`document.querySelector(${JSON.stringify(sel)})?.click()`);
  const farm = () => X.evaluate(`JSON.parse(localStorage.getItem("${FARM}"))`);
  const coins = () => X.evaluate(`${T}.purse().coins`);
  const openChip = async () => { await until("chip", () => has("[data-quality-chip]"), 15000); await click("[data-quality-chip]"); await sleep(700); };
  const closePanels = async () => { for (const sel of ['[data-quality-grow] [aria-label="ปิด"]', '[data-quality-inspector] [aria-label="ปิด"]']) { await click(sel); await sleep(250); } };
  try {
    await enter();
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.empty())`);
    // ── the press: a ripe pumpkin of ceiling 88, its bed ready, nine seeds ──
    await X.evaluate(lay(`put(135, 7, "pumpkin", 1, { q: Q(88) }); till(132, 4, 7, 7);`));
    await enter(); await sleep(1000);
    await X.evaluate(`${T}.grant("seedPumpkin", 9)`);
    await zoom(phone ? 0.8 : 1.1);
    await go(135, 7, 2400); await openChip();
    ok(`${label}: the inspector offers to let it grow`, await has("[data-quality-grow-open]"));
    await X.evaluate(`document.querySelector("[data-quality-grow-open]")?.scrollIntoView({ block: "center" })`); await sleep(300); await shot("inspector");
    await click("[data-quality-grow-open]"); await sleep(700);
    ok(`${label}: the panel says its ground is ready`, await has('[data-quality-grow-status="ready"]'));
    await click('[data-quality-grow-size="4"]'); await sleep(300);
    await shot("panel-ready");
    const go1 = await X.evaluate(`(() => { const r = document.querySelector("[data-quality-grow-go]").getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(r.height)]; })()`);
    ok(`${label}: its button is on the screen, tall enough`, go1[1] <= go1[2] && go1[3] >= 40, JSON.stringify(go1));
    await click("[data-quality-grow-go]"); await sleep(900);
    const grown = await farm(), root = grown["135,7"]?.plant;
    ok(`${label}: pressed, it stands on sixteen plots`, root?.footprint?.length === 16 && root?.size?.n === 4, JSON.stringify(root?.size));
    ok(`${label}: three seeds gone`, (await X.evaluate(`${T}.purse().bag.find((s) => s && s.item === "seedPumpkin")?.n`)) === 6);
    ok(`${label}: the panel closes on the inspector, saying it swells`, !(await has("[data-quality-grow]")) && await has("[data-quality-swelling]"));
    await X.evaluate(`document.querySelector("[data-quality-swelling]")?.scrollIntoView({ block: "center" })`); await sleep(300); await shot("inspector-swelling");
    await closePanels(); await sleep(400);
    await go(136, 11, 2400); await shot("young-on-map");
    // ── swollen: the pull's board, short of hands ──
    const mark = (body) => X.evaluate(`(() => { const f = JSON.parse(localStorage.getItem("${FARM}")), r = f["135,7"].plant, now = Date.now(), me = ${T}.id; const pull = ${body}; for (const k of r.footprint) f[k].plant = { ...f[k].plant, size: { ...r.size, until: now - 1000 }, ...(pull ? { pull } : {}) }; if (!pull) for (const k of r.footprint) delete f[k].plant.pull; localStorage.setItem("${FARM}", JSON.stringify(f)); })()`);
    await mark("null"); await enter(); await sleep(1000); await zoom(phone ? 0.8 : 1.1);
    await go(136, 10, 2400);
    ok(`${label}: the plant ripe, its keeper is offered the pull`, await has("[data-giant-pull-open]"));
    await shot("offered");
    await click("[data-giant-pull-open]"); await sleep(900);
    ok(`${label}: the board opens, called`, await has('[data-giant-pull="call"]'));
    ok(`${label}: it says how many it takes`, (await X.evaluate(`document.querySelector("[data-giant-pull-hands]")?.dataset.giantPullHands`)) === "3");
    ok(`${label}: its start waits for them`, await X.evaluate(`document.querySelector("[data-giant-pull-go]")?.disabled === true`));
    await shot("call-short");
    await click("[data-giant-pull-dig]"); await sleep(300); await shot("dig-armed");
    // ── full, under way ──
    const names = '["trial-friend-Mali","trial-friend-Ploy","trial-friend-Ton","trial-friend-Nok","trial-friend-Kai","trial-friend-Fah","trial-friend-Dao"]';
    await X.evaluate(`(() => { const f = JSON.parse(localStorage.getItem("${FARM}")); const r = f["135,7"].plant, cells = []; for (let y = 4; y < 11; y++) for (let x = 132; x < 139; x++) cells.push(x + "," + y); const p = { ...r, footprint: cells, size: { ...r.size, n: 7 } }; for (const k of cells) f[k] = { soil: "tilled", plant: { ...p } }; localStorage.setItem("${FARM}", JSON.stringify(f)); })()`);
    await mark(`({ by: me, at: now, crew: [me, ...${names}], go: 0, hits: {}, paid: [], out: 0, bonus: 0, helped: [] })`); await enter(); await sleep(1000); await zoom(phone ? 0.8 : 1.1); await go(136, 11, 2400);
    ok(`${label}: a crew of eight fits`, await has('[data-giant-pull="call"]'));
    ok(`${label}: its start is open with six or more`, await X.evaluate(`document.querySelector("[data-giant-pull-go]")?.disabled === false`));
    await shot("call-full");
    await click("[data-giant-pull-go]"); await sleep(4200);
    ok(`${label}: the go begins`, await has('[data-giant-pull="pull"]'));
    await shot("pulling");
    const box = await X.evaluate(`(() => { const r = document.querySelector('[data-giant-pull]').getBoundingClientRect(), a = document.querySelector('[data-giant-pull-side="right"]').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom), innerHeight, Math.round(a.height), Math.round(a.bottom)]; })()`);
    ok(`${label}: its ropes are on the screen, tall enough`, box[4] <= box[2] && box[3] >= 40, JSON.stringify(box));
    // ── out: sold on the spot ──
    const before = await coins();
    await mark(`({ by: me, at: now, crew: [me, ...${names}], go: now - 9000, hits: {}, paid: [], out: now - 500, bonus: 2, helped: ["trial-friend-Mali", "trial-friend-Ploy"] })`);
    await sleep(2200);
    const after = await coins();
    await X.evaluate(`document.querySelector("[data-giant-pull]")?.scrollIntoView({ block: "center" })`);
    ok(`${label}: the relatives pay for it whole`, after > before, `${before} -> ${after}`);
    ok(`${label}: and the board says so`, await has("[data-giant-pull-sale]"));
    ok(`${label}: the bed is empty after it`, !(await farm())["135,7"]?.plant);
    await shot("sold");
    // ── dug alone: no sale ──
    await X.evaluate(lay(`put(133, 5, "pumpkin", 3);`)); await enter(); await sleep(1000); await zoom(phone ? 0.8 : 1.1);
    await go(134, 9, 2400); await click("[data-giant-pull-open]"); await sleep(900);
    const c0 = await coins();
    await click("[data-giant-pull-dig]"); await sleep(250); await click("[data-giant-pull-dig]"); await sleep(1800);
    ok(`${label}: dug out alone, picked, no sale`, !(await farm())["133,5"]?.plant && (await coins()) === c0);
    // ── gold told: ripe plants whose floor was raised, once each; one under the line is not asked ──
    await X.evaluate(lay(`for (let i = 0; i < 3; i++) put(132 + i, 5, "tomato", 1, { q: Q(100, 20), sown: now - 400 * H - i }); put(136, 5, "tomato", 1, { q: Q(100, 0) }); put(132, 7, "pumpkin", 1, { q: Q(100, 20), gold: 0, sealed: 0 });`));
    await enter(); await sleep(2500);
    const told = await farm();
    ok(`${label}: its grower's page has the draw told`, ["132,5", "133,5", "134,5"].every((k) => told[k]?.plant?.sealed === 0));
    ok(`${label}: nothing asked of one whose floor was not raised`, told["136,5"]?.plant?.sealed === undefined);
    await zoom(phone ? 0.9 : 1.3); await go(134, 9, 2600); await shot("gold-one-plot");
    // ── an animal raised ──
    await X.evaluate(`(${T}.reset(), ${T}.animalsClear(), ${T}.setGifts(false), ${T}.setLine("animals", 0), ${T}.fished({ ...${T}.purse(), coins: 30000 }), ${T}.animalFriends())`);
    await sleep(500);
    const ids = await X.evaluate(`(() => {
      const t = ${T}, calf = t.animalGive("dairyCow", "baby"), cow = t.animalGive("dairyCow", "adult", 200);
      t.animalSet(calf.id, { rearing: { was: 20, days: 3, pet: 3, treat: 2, out: 3, fed: 3 }, food: 20 });
      t.animalSet(cow.id, { body: 2.5, gold: true, food: 20 });
      return [calf.id, cow.id];
    })()`);
    await sleep(700);
    await X.evaluate(`${S}.open("mine")`); await sleep(900);
    await click('[data-animals-tab="mine"]'); await sleep(500);
    await click(`[data-animal-card="${ids[0]}"] button[aria-expanded]`); await sleep(500);
    ok(`${label}: its card shows how it is being raised`, await has("[data-rearing]"));
    await X.evaluate(`document.querySelector("[data-rearing]")?.scrollIntoView({ block: "center" })`); await sleep(300); await shot("animal-rearing");
    await click(`[data-animal-card="${ids[1]}"] button[aria-expanded]`); await sleep(500);
    ok(`${label}: a grown one's card shows its size`, await has("[data-body]"));
    await X.evaluate(`document.querySelector("[data-body]")?.scrollIntoView({ block: "center" })`); await sleep(300); await shot("animal-grown");
    console.log(label, "errors", JSON.stringify((await X.errors?.()) ?? []).slice(0, 400));
  } finally { X.close(); }
}
console.log(`town-grow: ${good} checks passed${bad ? `, ${bad} FAILED` : ""}.`);
process.exit(bad ? 1 : 0);
