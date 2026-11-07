// The editor's farm's barns (lib/town/farm2, 2026-11-07) looked at in the dev test room: the four looks (the game's
// facades 0..3, plainest first) on the trial's barns, shut and open; a barn from inside with a tray to each place, full
// and empty. The trial's world is changed in the page for the look only (its herds' facades and food): nothing is kept.
//
//   node town-farm2-barns.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3290", OUT = "."] = process.argv.slice(2);
const V = "window.__townView", P = "window.__townPasture";
const SIZES = (process.env.SIZES ?? "desktop,phone").split(",");
for (const [label, size] of [["desktop", { width: 1280, height: 860 }], ["phone", { width: 384, height: 730, mobile: true }]]) {
  if (!SIZES.includes(label)) continue;
  const X = await browser(`farm2b-${label}`, size);
  try {
    // the trial's animal world laid first (this browser's own: nothing is kept anywhere else): four barns of the first row
    // held by made-up members, each in a look (0..3), the second's door open; and four of the fourth row, one each again
    await X.goto(`${BASE}/`);
    const herds = [0, 1, 2, 3, 12, 13, 14, 15].map((barn, i) => ({ owner: `look-${i}`, barn, room: i % 2 ? 4 : 2, door: i === 1 || i === 5 ? [[Date.now() - 60_000, null]] : [], credit: 0, lastCare: Date.now(), facade: i % 4, care: "named", carers: [] }));
    await X.evaluate(`localStorage.setItem("cashtown.trial.animals.2", ${JSON.stringify(JSON.stringify({ animals: [], herds, found: {}, spells: [], wagons: [], offers: [], asks: [] }))})`);
    await X.goto(`${BASE}/town?townTest=L&townRoom=farm2barns&townMap=town2&farmMap=farm2&townHour=${process.env.HOUR ?? 11}&townWeather=clear`);
    await until("ready", async () => (await status(X)) === "ready", 240000);
    await until("the pasture", () => X.evaluate(`!!${P}?.world()`), 60000);
    const held = herds.map((h) => ({ barn: h.barn, facade: h.facade }));
    console.log(`  ${label}: held barns`, JSON.stringify(held));
    for (const h of held) {
      const b = await X.evaluate(`(() => { const B = ${P}.barns?.() ?? null; return B ? B[${h.barn}] : null; })()`);
      // stand on the lane before its door
      const row = Math.floor(h.barn / 4), col = h.barn % 4, x = [222, 231, 243, 252][col] + 4, y = [21, 32, 43, 68, 79, 90][row] + 1;
      if (!(await X.evaluate(`${V}.warp(${x}, ${y})`))) { console.log(`  could not stand before barn ${h.barn}`, b); continue; }
      await sleep(3000);
      await X.shot(`${OUT}/f2b-${label}-look${h.facade}-barn${h.barn}.png`);
      // inside it, by its back wall
      if (await X.evaluate(`${V}.warp(${x - 2}, ${y - 4})`)) { await sleep(3500); await X.shot(`${OUT}/f2b-${label}-inside-look${h.facade}.png`); }
    }
  } finally { await X.close?.(); }
}
