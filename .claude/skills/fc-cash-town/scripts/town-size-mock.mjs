// The mock of a plant grown over its bed, gold, the "let it grow" panel on the bed's map, and animals of four sizes: laid
// in the dev test room and photographed at desktop, phone and a small phone. Nothing here plays the rules: the plants are
// laid as they would stand (lib/town/giant-sizes).
//   node .claude/skills/fc-cash-town/scripts/town-size-mock.mjs http://localhost:<port> <outdir> [desktop|phone|small|all]
const { browser, sleep, status, until } = await import(new URL("./cdp.mjs", import.meta.url).href);
const [BASE = "http://localhost:3231", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const T = "window.__townTrade", V = "window.__townView", S = "window.__townPasture";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, small: { width: 360, height: 640, dpr: 2, mobile: true } };

const lay = (plan, friends = false) => `(() => {
  const H = 3600000, now = Date.now(), me = ${T}.id, farm = {};
  const q = (ceil, nar) => { const a = Math.min(1, ceil / 100 + 1e-6); return { at: now, span: 1, area: [a, a, a, a], nar: [nar >= 10 ? 1 : 0, nar >= 20 ? 1 : 0, 0] }; };
  const put = (x, y, crop, n = 1, more = {}) => {
    const root = x + "," + y, keys = []; for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) keys.push((x + u) + "," + (y + v));
    const p = { by: me, crop, sown: now - 2000 * H, boost: 0, watered: now - H, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...(n > 1 ? { root, footprint: keys, rotation: 0, giant: true } : {}), ...more };
    for (const k of keys) farm[k] = { soil: "tilled", plant: { ...p } };
  };
  const till = (x, y, w, h) => { for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) { const k = (x + u) + "," + (y + v); if (!farm[k]) farm[k] = { soil: "tilled", plant: null }; } };
  ${plan}
  localStorage.setItem("cashtown.trial.farm.2", JSON.stringify(farm));
  const beds = {}; for (let b = 0; b < 24; b++) beds[b] = ${friends} ? { by: b === 1 ? me : "trial-friend-" + ["Mali", "Ploy", "Ton", "Nok", "Kai", "Fah"][b % 6], tended: now, empty: 0, name: b === 1 ? "" : ["Mali", "Ploy", "Ton", "Nok", "Kai", "Fah"][b % 6] } : { by: me, tended: now, empty: 0, name: "" };
  localStorage.setItem("cashtown.trial.beds.1", JSON.stringify(beds));
  return Object.keys(farm).length;
})()`;

// The ladder: bed 0 holds one plot, 2x2 and 3x3; bed 1 the 5x5 with a ring of helpers; bed 2 the whole bed. Gold the row below.
const ladder = `
  put(136, 7, "pumpkin", 1, { fit: 0.97 }); put(138, 7, "pumpkin", 1, { fit: 1.2 }); put(136, 4, "pumpkin", 2); put(132, 4, "pumpkin", 3); put(133, 8, "corn"); put(135, 9, "carrot"); till(132, 4, 7, 7);
  put(141, 5, "pumpkin", 4); till(140, 4, 7, 7);
  put(149, 5, "pumpkin", 5); till(148, 4, 7, 7);
  put(132, 12, "pumpkin", 6); till(132, 12, 7, 7);
  put(140, 12, "pumpkin", 7, { fit: 1.06 });
  put(148, 12, "pumpkin", 7, { gold: true, fit: 1.06 });
  put(132, 25, "taro", 7, { fit: 1.06 });
  put(141, 26, "pumpkin", 4, { gold: true }); till(140, 25, 7, 7);
  put(148, 25, "pumpkin", 2, { gold: true }); put(151, 25, "pumpkin", 3, { gold: true }); put(149, 29, "pumpkin", 1, { gold: true }); put(151, 29, "tomato", 1, { gold: true }); till(148, 25, 7, 7);
  put(132, 33, "carrot", 3, { fit: 1.08 }); put(135, 36, "carrot", 4, { fit: 0.97 }); till(132, 33, 7, 7); put(140, 33, "daikon", 6); till(140, 33, 7, 7); put(149, 34, "cabbage", 5); till(148, 33, 7, 7);
`;
// A farm everybody has come to: ordinary beds of mixed crops, and giants on every side of mine (bed 1).
const busy = `
  const mix = ["tomato", "corn", "chili", "basil", "eggplant", "carrot", "cabbage", "garlic"];
  const crops = (x0, y0, others = {}) => { for (let y = y0; y < y0 + 7; y++) for (let x = x0; x < x0 + 7; x++) put(x, y, mix[(x * 3 + y * 5) % mix.length], 1, { watered: now - 5 * 60000, ...others }); };
  crops(132, 4); crops(140, 4); crops(132, 25); crops(148, 33); crops(161, 4); crops(169, 12);
  put(148, 4, "pumpkin", 7, { gold: true, fit: 1.06 }); put(140, 12, "daikon", 7, { fit: 1.06 }); put(148, 12, "pumpkin", 7, { fit: 1.06 });
  put(133, 13, "carrot", 5); for (let i = 0; i < 7; i++) { put(132 + i, 12, "tomato", 1); put(132 + i, 18, "corn", 1); }
  put(140, 25, "cabbage", 7, { gold: true, fit: 1.06 }); put(148, 25, "taro", 7, { fit: 1.06 }); put(132, 33, "pumpkin", 7, { fit: 1.06 }); put(140, 33, "carrot", 7, { gold: true, fit: 1.06 });
  till(161, 12, 7, 7);
`;
// The panel's states: bed 0 ready for 3x3; bed 1 wanting a whole bed with things in the way; bed 2 a rank-7 giant, grown on.
const panel = `
  put(135, 7, "pumpkin", 1, { q: q(88, 10) }); till(132, 4, 7, 7); put(132, 4, "tomato"); put(133, 5, "corn");
  put(143, 7, "pumpkin", 1, { q: q(100, 20) }); for (const [x, y, c] of [[142,7,"runnerBean"],[144,7,"gardenStrawberry"],[143,6,"borage"],[143,8,"marigold"],[140,4,"corn"]]) put(x, y, c); till(140, 4, 7, 7); for (const k of ["146,4","146,5","140,10","141,10"]) delete farm[k];
  put(150, 7, "pumpkin", 2, { q: q(90, 0) }); till(148, 4, 7, 7);
  put(135, 15, "carrot", 1, { q: q(60, 0) }); till(132, 12, 7, 7);
`;

for (const label of ONLY === "all" ? Object.keys(SIZES) : [ONLY]) {
  const size = SIZES[label], X = await browser("size" + label, size), phone = label !== "desktop";
  const shot = (name) => X.shot(`${OUT}/${label}-${name}.png`);
  const alive = () => X.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 8 + Math.round(Math.random() * 6), y: 8 }).catch(() => {});
  const enter = async () => { await X.goto(`${BASE}/town?townTest=${phone ? "Y" : "W"}&townRoom=size&townHour=11&townWeather=clear`); await until("ready", async () => (await status(X)) === "ready", 300000); await until("view", () => X.evaluate(`!!${T} && !!${V} && !!${V}.tileScreen`), 60000); };
  const go = async (x, y, ms = 2200, look = true) => { await alive(); await X.evaluate(`(() => { ${V}.warp(${x}, ${y}); ${look ? `${V}.lookAt(${x + 0.5}, ${y + 0.5});` : ""} })()`); await sleep(ms); };
  const zoom = (z) => X.evaluate(`(window.__townZoomFree = true, ${V}.zoom(${z}))`);
  try {
    await enter();
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.empty())`);
    if (process.env.CALM) {
      if (!process.env.EPIC) {
      await X.evaluate(lay(busy, true)); await enter(); await sleep(1500);
      await zoom(phone ? 0.62 : 0.85);
      await go(143.5, 7.5, 3000); await X.evaluate("(window.__townCalmOff = true)"); await sleep(1800); await shot("busy-before");
      await X.evaluate("(window.__townCalmOff = false)"); await sleep(1500); await shot("busy-after");
      await go(144.5, 21.5, 2600); await shot("busy-lane");
      await X.evaluate("(window.__townCalmOff = true)"); await sleep(1800); await shot("busy-lane-before"); await X.evaluate("(window.__townCalmOff = false)");
      }
      // epic animals
      await X.evaluate(`${T}.animalFriends()`); await sleep(400);
      const row = await X.evaluate(`(() => {
        const key = "cashtown.trial.animals.2", w = JSON.parse(localStorage.getItem(key)), at = {};
        const mali = w.animals.filter((a) => a.owner === "trial-friend-Mali");
        w.animals = w.animals.filter((a) => a.owner !== "trial-friend-Mali");
        const place = (id, base, more, x, y, pose) => { const a = { ...base, id, home: "barn", ...more }; w.animals.push(a); at[id] = [x, y, pose]; };
        const cow = mali.find((a) => a.breed === "dairyCow"), ram = mali.find((a) => a.breed === "meadowSheep"), hen = mali.find((a) => a.breed === "barnHen");
        const spots = [[197, 37.5], [199, 35.5], [201, 33.5], [203, 31.5], [200.5, 41], [202.5, 39], [204.5, 37], [206.5, 35], [203.5, 44], [205.5, 42], [207.5, 40], [209.5, 38]];
        [1, 1.4, 1.9, 2.5].forEach((b, i) => place("cow" + i, cow, { body: b }, ...spots[i]));
        [1, 1.5, 2.1, 2.8].forEach((b, i) => place("ram" + i, ram, { body: b, sex: "m" }, ...spots[4 + i]));
        [1, 1.6, 2.2, 3].forEach((b, i) => place("hen" + i, hen, { body: b, sex: "f" }, ...spots[8 + i]));
        place("gcow", cow, { body: 2.5, gold: true }, 222, 12, "walk"); place("gram", ram, { body: 2.8, gold: true, sex: "m" }, 225, 12); place("ghen", hen, { body: 3, gold: true, sex: "f" }, 228, 12, "walk"); place("gram2", ram, { body: 1.5, gold: true, sex: "m" }, 231, 12);
        w.offers = []; w.asks = [];
        localStorage.setItem(key, JSON.stringify(w));
        return at;
      })()`);
      await enter(); await sleep(1500);
      await X.evaluate(`(window.__townAnimalRow = ${JSON.stringify(row)})`);
      await zoom(phone ? 0.62 : 1.05);
      await go(203.5, 38, 6000); await shot("epic-sizes");
      // the gold ones come to the same lawn, the rest go off it
      const gold = { ...row, gcow: [199, 35.5, "walk"], gram: [204.5, 37], ghen: [205.5, 42, "walk"], gram2: [201.5, 41] };
      for (const id of Object.keys(row)) if (!id.startsWith("g") && id !== "cow0" && id !== "ram0" && id !== "hen0") gold[id] = [226 + Math.random() * 6, 8 + Math.random() * 6];
      gold.cow0 = [203, 31.5]; gold.ram0 = [200, 38]; gold.hen0 = [208.5, 39.5];
      await X.evaluate(`(window.__townAnimalRow = ${JSON.stringify(gold)})`); await sleep(2500); await shot("epic-gold");
      if (process.env.FILM) { const box = phone ? { x: 0, y: 150, width: 384, height: 440, scale: 1 } : { x: 170, y: 90, width: 940, height: 640, scale: 0.8 }; for (let i = 0; i < 40; i++) { const r = await X.send("Page.captureScreenshot", { format: "png", clip: box }); (await import("node:fs")).writeFileSync(`${process.env.FILM}/${label}-${String(i).padStart(3, "0")}.png`, Buffer.from(r.data, "base64")); await sleep(40); } }
      console.log(label, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 300));
      continue;
    }
    if (!process.env.PANELS) {
    await X.evaluate(lay(ladder)); await enter(); await sleep(1500);
    await zoom(phone ? 0.62 : 0.95); await go(130.5, 21.5, 2600); await X.evaluate(`${V}.lookAt(${phone ? 143 : 142.5}, 12)`); await sleep(1500); await shot("ladder");
    if (process.env.HERO) { await X.evaluate("(window.__townCalmOff = true)"); await zoom(phone ? 1 : 1.5); await go(129.5, 37.5, 2200); await X.evaluate(`${V}.lookAt(135.5, 36)`); await sleep(1500); await shot("breakpoint"); console.log(label, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 300)); continue; }
    await go(151, 11, 2000); await shot("whole");
    await zoom(phone ? 0.62 : 0.95); await go(144.5, 22.5, 2500); await shot("gold-ladder");
    await go(151, 19, 2000); await shot("gold-whole");
    if (process.env.FILM) {
      await zoom(phone ? 0.72 : 1.05); await go(151.5, 20.5, 2600);
      const box = phone ? { x: 0, y: 150, width: 384, height: 440, scale: 1 } : { x: 170, y: 90, width: 940, height: 640, scale: 0.8 }, t0 = Date.now(), frames = 44;
      for (let i = 0; i < frames; i++) { const r = await X.send("Page.captureScreenshot", { format: "png", clip: box }); (await import("node:fs")).writeFileSync(`${process.env.FILM}/${label}-${String(i).padStart(3, "0")}.png`, Buffer.from(r.data, "base64")); await sleep(40); }
      console.log(label, "film", frames, "frames, a frame", Math.round((Date.now() - t0) / frames), "ms");
    }
    await zoom(phone ? 1 : 1.5); await go(151, 19, 2000); await shot("gold-close");
    await go(150, 11.2, 1800); await shot("behind");
    // the plant takes no taps: plots hidden behind the whole-bed plant still send one walking to them
    await zoom(phone ? 0.8 : 1); await go(151, 20, 2200);
    { let good = 0, bad = []; for (const [x, y] of [[147, 12], [146, 13], [146, 15], [149, 10], [151, 10], [153, 9], [150, 15], [152, 14], [148, 16]]) { const p = await X.evaluate(`${V}.tileScreen(${x + 0.5}, ${y + 0.5})`); if (p.x < 4 || p.y < 60 || p.x > size.width - 4 || p.y > size.height - 120) { bad.push(`${x},${y} off`); continue; } await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 }); await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 }); await sleep(260); const g = await X.evaluate(`${V}.goal()`), me = await X.evaluate(`${V}.self()`); if ((g && g.x === x && g.y === y) || (!g && me && Math.floor(me.x) === x && Math.floor(me.y) === y)) good++; else bad.push(`${x},${y}->${g ? g.x + "," + g.y : "none"}`); await X.evaluate(`${V}.warp(151, 20)`); await sleep(120); } console.log(label, "taps behind the plant reached", good, "of 9", bad.join(" ")); }
    await zoom(phone ? 0.62 : 0.95); await go(143, 38.5, 2500); await shot("other-crops");
    
    }
    if (process.env.MAP) { console.log(label, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 300)); continue; }
    await X.evaluate(lay(panel)); await enter(); await sleep(1500);
    await zoom(phone ? 1 : 1.3);
    const chip = async () => { await until("chip", () => X.evaluate(`!!document.querySelector("[data-quality-chip]")`), 15000); await X.evaluate(`document.querySelector("[data-quality-chip]").click()`); await sleep(700); };
    const openGrow = async () => { await until("grow button", () => X.evaluate(`!!document.querySelector("[data-quality-grow-open]")`), 8000); await X.evaluate(`document.querySelector("[data-quality-grow-open]").scrollIntoView({ block: "center" })`); await sleep(300); };
    // the inspector, ripe, ceiling 88
    await go(135, 7, 2400); await chip(); await openGrow(); await shot("inspector");
    await X.evaluate(`document.querySelector("[data-quality-grow-open]").click()`); await sleep(800); await shot("grow-ready");
    await X.evaluate(`document.querySelector('[data-quality-grow-size="5"]').click()`); await sleep(400); await shot("grow-locked");
    const facts = await X.evaluate(`(() => { const go = document.querySelector("[data-quality-grow-go]").getBoundingClientRect(); console.log;  const r = [...document.querySelectorAll("[data-quality-grow] button, [data-quality-grow] [data-grow-cell]")].slice(0, 80).map((e) => { const b = e.getBoundingClientRect(); return [e.tagName, Math.round(b.width), Math.round(b.height), Math.round(b.bottom)]; }); return JSON.stringify({ go: [Math.round(go.left), Math.round(go.top), Math.round(go.right), Math.round(go.bottom)], buttons: r.filter((x) => x[0] === "BUTTON"), section: (() => { const s = document.querySelector("[data-quality-grow]"); const b = s.getBoundingClientRect(); return [Math.round(b.top), Math.round(b.bottom), s.scrollHeight, s.clientHeight]; })() }); })()`);
    console.log(label, facts);
    // whole bed wanted, things in the way
    await X.evaluate(`document.querySelector('[data-quality-grow] [aria-label="ปิด"]').click()`); await sleep(400);
    await X.evaluate(`document.querySelector('[data-quality-inspector] [aria-label="ปิด"]')?.click()`); await sleep(300);
    await go(143, 7, 2400); await chip(); await openGrow(); await X.evaluate(`document.querySelector("[data-quality-grow-open]").click()`); await sleep(800); await shot("grow-blocked");
    await X.evaluate(`document.querySelector('[data-quality-grow] [aria-label="ปิด"]').click()`); await sleep(400);
    await X.evaluate(`document.querySelector('[data-quality-inspector] [aria-label="ปิด"]')?.click()`); await sleep(300);
    // a giant of rank 7, grown on from its 2x2
    await go(150, 7, 2400); await chip(); await openGrow(); await X.evaluate(`document.querySelector("[data-quality-grow-open]").click()`); await sleep(800); await shot("grow-giant");
    await X.evaluate(`document.querySelector('[data-quality-grow] [aria-label="ปิด"]').click()`); await sleep(400);
    await X.evaluate(`document.querySelector('[data-quality-inspector] [aria-label="ปิด"]')?.click()`); await sleep(300);
    // not ripe enough: below 70
    await go(135, 15, 2400); await chip(); await sleep(300); await X.evaluate(`document.querySelector("[data-quality-grow-note]")?.scrollIntoView({ block: "center" })`); await sleep(300); await shot("inspector-under-70");
    if (process.env.PANELS) { console.log(label, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 300)); continue; }
    // four sizes of a body, side by side on the meadow: one animal cloned, one factor over every pose
    await X.evaluate(`${T}.animalFriends()`); await sleep(500);
    const row = await X.evaluate(`(() => {
      const key = "cashtown.trial.animals.2", w = JSON.parse(localStorage.getItem(key)), bodies = [0.9, 1, 1.12, 1.25], at = {};
      const mali = w.animals.filter((a) => a.owner === "trial-friend-Mali");
      w.animals = w.animals.filter((a) => a.owner !== "trial-friend-Mali");
      [["dairyCow", "f", 38.6, 2.9], ["meadowSheep", "m", 41, 2.5], ["barnHen", "f", 43, 1.9]].forEach(([breed, sex, y, gap], r) => {
        const base = mali.find((a) => a.breed === breed) ?? mali[0];
        bodies.forEach((body, i) => { const a = { ...base, id: breed + "-" + i, breed, sex, body, home: "barn" }; w.animals.push(a); at[a.id] = [206 + i * gap, y - 6 - i * gap * 0.4]; });
      });
      localStorage.setItem(key, JSON.stringify(w));
      return at;
    })()`);
    await enter(); await sleep(1500);
    await X.evaluate(`(window.__townAnimalRow = ${JSON.stringify(row)})`);
    await zoom(phone ? 1.05 : 1.7); await go(211, 38, 6000); await shot("animals");
    console.log(label, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 300));
  } finally { X.close(); }
}
process.exit(0);
