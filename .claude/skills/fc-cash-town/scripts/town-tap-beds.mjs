// Every plot of two full beds can be tapped (the owner, 2026-10-15: "make sure ด้วยว่าใน 1 แปรง จะใช้งานได้ทั้งหมด ไม่มีภาพ
// อื่นมาบัง แล้วกดที่พื้นไม่ได้"): the garden hybrids, the giants, the fig, an insect house and tall crops laid, all ripe, then a
// real click at each plot's middle must send me walking to that very plot, at 1280x860 and 384x730. Exit 1 if not.
//   node .claude/skills/fc-cash-town/scripts/town-tap-beds.mjs http://localhost:<port>
const { browser, sleep, status, until } = await import(new URL("./cdp.mjs", import.meta.url).href);
const [BASE = "http://localhost:3141"] = process.argv.slice(2);
const T = "window.__townTrade", V = "window.__townView";
const BEDS = [[132, 4], [140, 4]].map(([x0, y0]) => { const k = []; for (let x = x0; x < x0 + 7; x++) for (let y = y0; y < y0 + 7; y++) k.push([x, y]); return k; });
const lay = `(() => {
  const H = 3600000, now = Date.now(), me = ${T}.id;
  const farm = {};
  const put = (x, y, crop, cells, more = {}) => {
    const root = x + "," + y, keys = cells.map(([u, v]) => (x + u) + "," + (y + v));
    const p = { by: me, crop, sown: now - 2000 * H, boost: 0, watered: now - H, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...(keys.length > 1 ? { root, footprint: keys, rotation: 0 } : {}), ...more };
    for (const k of keys) farm[k] = { soil: "tilled", plant: { ...p } };
  };
  put(132, 4, "blueCorn", [[0,0],[1,0],[2,0]]); put(136, 4, "lotusRootBed", [[0,0],[1,0],[2,0]]);
  put(132, 6, "bottleGourd", [[0,0],[1,0],[1,1]]); put(135, 6, "sunflowerPatch", [[0,0],[1,0],[0,1]]);
  put(138, 6, "trellisBerry", [[0,0],[0,1],[0,2]]); put(132, 9, "rowBean", [[0,0],[1,0]]);
  put(135, 9, "teaBush", [[0,0],[1,0]]); put(137, 9, "redOkra", [[0,0],[0,1]]);
  for (const [x, y, c] of [[134,8,"corn"],[136,8,"sunflowerPatch"],[132,8,"tomato"],[133,8,"chili"],[134,10,"basil"],[133,10,"lemongrass"],[135,8,"eggplant"]]) if (!farm[x + "," + y]) put(x, y, c, [[0,0]]);
  put(140, 4, "pumpkin", [[0,0],[1,0],[0,1],[1,1]], { giant: true }); put(143, 4, "cabbage", [[0,0],[1,0],[0,1],[1,1]], { giant: true });
  put(140, 7, "carrot", [[0,0],[1,0],[0,1],[1,1]], { giant: true }); put(143, 7, "daikon", [[0,0],[1,0],[0,1],[1,1]], { giant: true });
  put(140, 9, "taro", [[0,0],[1,0],[0,1],[1,1]], { giant: true }); put(143, 9, "fig", [[0,0],[1,0],[0,1],[1,1]]);
  farm["145,5"] = { soil: "house", plant: null, house: { by: me, at: now - H, rooms: [{ bug: "honeyBee", from: now - H, until: now + 40 * H }, null] } };
  for (const [x, y, c] of [[145,4,"corn"],[146,4,"papaya"],[146,6,"mango"],[146,8,"banana"],[145,10,"coconut"],[146,10,"lime"],[142,6,"corn"]]) if (!farm[x + "," + y]) put(x, y, c, [[0,0]]);
  localStorage.setItem("cashtown.trial.farm.2", JSON.stringify(farm));
  localStorage.setItem("cashtown.trial.beds.1", JSON.stringify({ 0: { by: me, tended: now, empty: 0, name: "A" }, 1: { by: me, tended: now, empty: 0, name: "B" } }));
  return Object.keys(farm).length;
})()`;
let failures = 0;
for (const [label, size] of [["wide", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730, dpr: 2, mobile: true }]]) {
  const X = await browser("tap" + label, size);
  try {
    const enter = async () => { await X.goto(`${BASE}/town?townTest=${label === "wide" ? "W" : "Y"}&townRoom=check&townHour=11&townWeather=clear`); await until("ready", async () => (await status(X)) === "ready", 240000); await until("view", () => X.evaluate(`!!${T} && !!${V} && !!${V}.tileScreen`), 30000); };
    await enter(); await X.evaluate(`(${T}.reset(), ${T}.forget(), ${T}.empty())`); await X.evaluate(lay); await enter();
    const bad = [];
    for (const bed of BEDS) {
      // stand on the path below the bed, look at the bed, and tap each plot
      const [bx, by] = bed[0];
      await X.evaluate(`${V}.warp(${bx + 3}, ${by + 7})`); await sleep(1200);
      for (const [x, y] of bed) {
        const at = await X.evaluate(`${V}.tileScreen(${x + 0.5}, ${y + 0.5})`);
        if (at.x < 4 || at.y < 60 || at.x > size.width - 4 || at.y > size.height - 120) { await X.evaluate(`${V}.warp(${x}, ${y + 2})`); await sleep(900); }
        const p = await X.evaluate(`${V}.tileScreen(${x + 0.5}, ${y + 0.5})`);
        await X.send("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", clickCount: 1 });
        await X.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", clickCount: 1 });
        await sleep(260);
        const goal = await X.evaluate(`${V}.goal()`), me = await X.evaluate(`${V}.self()`);
        const ok = (goal && goal.x === x && goal.y === y) || (!goal && me && Math.floor(me.x) === x && Math.floor(me.y) === y);
        if (!ok) bad.push(`${x},${y}→${goal ? goal.x + "," + goal.y : "nothing"}`);
        await X.evaluate(`${V}.warp(${bx + 3}, ${by + 7})`); await sleep(120);
      }
    }
    failures += bad.length;
    console.log(label, bad.length ? `NOT REACHED ${bad.length}: ${bad.join(" ")}` : `every plot of both beds reached (${BEDS.flat().length})`, "errors", JSON.stringify(X.errors?.() ?? []).slice(0, 200));
  } finally { X.close(); }
}
process.exit(failures ? 1 : 0);
