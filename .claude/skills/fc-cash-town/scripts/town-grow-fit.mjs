// Do plants grown over their ground stand on it, exactly? A farmed bed as members have it (rank-7 giants among small plants,
// a young one, an insect house), and each size, in the real game: photographed clean, and again with each plant's own
// square outlined on the map. Desktop, phone and a small phone.
//   node .claude/skills/fc-cash-town/scripts/town-grow-fit.mjs http://localhost:<port> <outdir> [desktop|phone|small|all]
const { browser, sleep, status, until } = await import(new URL("./cdp.mjs", import.meta.url).href);
const [BASE = "http://localhost:3232", OUT = ".", ONLY = "all"] = process.argv.slice(2);
const T = "window.__townTrade", V = "window.__townView", FARM = "cashtown.trial.farm.2", BEDS = "cashtown.trial.beds.1";
const SIZES = { desktop: { width: 1280, height: 860 }, phone: { width: 384, height: 730, dpr: 2, mobile: true }, small: { width: 360, height: 640, dpr: 2, mobile: true } };

const SCENE = `
  const small = ["kangkong", "scallion", "chili", "borage", "marigold", "basil", "lavender", "gardenStrawberry"];
  const grown = (x, y, crop, n, more = {}) => put(x, y, crop, n, { ...more });
  // (the bed in his picture: three giants of two a side among small plants)
  put(133, 6, "pumpkin", 2, { size: undefined, sown: now - 2 * H });
  put(135, 4, "cabbage", 2, { size: undefined });
  put(137, 8, "carrot", 2, { size: undefined });
  for (let v = 0; v < 7; v++) for (let u = 0; u < 7; u++) { const x = 132 + u, y = 4 + v, k = x + "," + y; if (!farm[k]) put(x, y, small[(u * 3 + v * 5) % small.length], 1, { sown: now - (u + v) * 3 * H }); }
  // (each size, on beds of their own, each plot tilled)
  for (const [bx, by, n, crop, u, v] of [[140, 4, 3, "pumpkin", 141, 5], [148, 4, 4, "cabbage", 149, 5], [161, 4, 5, "carrot", 162, 5], [169, 4, 7, "daikon", 169, 4]]) { till(bx, by, 7, 7); put(u, v, crop, n); }
`;
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

// (each plant's own square, drawn over the page where the map says its corners are: a thing of this check alone)
const outline = (squares) => `(() => {
  document.getElementById("fit-debug")?.remove();
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.id = "fit-debug"; svg.setAttribute("style", "position:fixed;inset:0;width:100vw;height:100vh;z-index:99999;pointer-events:none");
  for (const [x, y, n] of ${JSON.stringify(squares)}) {
    const c = [[x, y], [x + n, y], [x + n, y + n], [x, y + n]].map(([u, v]) => { const p = ${V}.tileScreen(u, v); return p.x + "," + p.y; }).join(" ");
    const shape = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    shape.setAttribute("points", c); shape.setAttribute("fill", "none"); shape.setAttribute("stroke", "#39e6ff"); shape.setAttribute("stroke-width", "2");
    svg.appendChild(shape);
  }
  document.body.appendChild(svg);
})()`;

for (const label of ONLY === "all" ? Object.keys(SIZES) : [ONLY]) {
  const size = SIZES[label], X = await browser("fit" + label, size), phone = label !== "desktop";
  const enter = async () => { await X.goto(`${BASE}/town?townTest=${phone ? "Y" : "W"}&townRoom=fit&townHour=11&townWeather=clear`); await until("ready", async () => (await status(X)) === "ready", 300000); await until("view", () => X.evaluate(`!!${T} && !!${V} && !!${V}.tileScreen`), 60000); };
  const look = async (x, y, z, ms = 2400) => { await X.evaluate(`(() => { window.__townZoomFree = true; ${V}.zoom(${z}); ${V}.warp(${x}, ${y}); ${V}.lookAt(${x + 0.5}, ${y + 0.5}); })()`); await sleep(ms); };
  const both = async (name, squares) => { await X.evaluate(`document.getElementById("fit-debug")?.remove()`); await sleep(120); await X.shot(`${OUT}/${label}-${name}.png`); await X.evaluate(outline(squares)); await sleep(120); await X.shot(`${OUT}/${label}-${name}-square.png`); await X.evaluate(`document.getElementById("fit-debug")?.remove()`); };
  try {
    await enter();
    await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.empty())`);
    await X.evaluate(lay(SCENE));
    await enter(); await sleep(900);
    await look(136, 7, phone ? 1.3 : 2.2);
    await both("bed", [[133, 6, 2], [135, 4, 2], [137, 8, 2]]);
    await look(143, 11, phone ? 1 : 1.6); await both("three", [[141, 5, 3]]);
    await look(151, 11, phone ? 0.9 : 1.4); await both("four", [[149, 5, 4]]);
    await look(164, 11, phone ? 0.8 : 1.2); await both("five", [[162, 5, 5]]);
    await look(172, 11.5, phone ? 0.7 : 1); await both("seven", [[169, 4, 7]]);
    // (somebody in front of it stands in front; somebody behind it shows through)
    await look(150, 9.6, phone ? 0.9 : 1.4, 1800); await X.shot(`${OUT}/${label}-in-front.png`);
    await look(150, 4.2, phone ? 0.9 : 1.4, 1800); await X.shot(`${OUT}/${label}-behind.png`);
    console.log(label, "errors", JSON.stringify((await X.errors?.()) ?? []).slice(0, 300));
  } finally { X.close(); }
}
process.exit(0);
