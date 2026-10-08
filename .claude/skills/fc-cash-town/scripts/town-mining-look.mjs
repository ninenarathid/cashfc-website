// The vein's board, photographed (`next dev` only): at a desktop's size and a phone's, in Thai and in English, a plain
// vein and a gem's, fresh, half played, tired, and with what it came to. Not a check: pictures to look at.
//
//   node town-mining-look.mjs <base> <outdir>
import { browser, sleep, status, until } from "./cdp.mjs";

const [BASE = "http://localhost:3190", OUT = "."] = process.argv.slice(2);
const M = "window.__townMore", K = "window.__townTrade", N = "window.__townMine", G = "window.__townVein";
const SIZES = [["desktop", { width: 1280, height: 800 }], ["phone", { width: 390, height: 844, dpr: 2, mobile: true }], ["small", { width: 360, height: 640, dpr: 2, mobile: true }]];
const only = process.argv[4];
for (const [label, size] of SIZES.filter(([l]) => !only || l === only)) {
  const X = await browser(`L${label[0].toUpperCase()}`, size);
  try {
    const enter = async (more = "") => {
      await X.goto(`${BASE}/town?townTest=${X.label}&townRoom=look&townHour=12&townWeather=clear&townAt=cave1${more}`);
      await until("ready", async () => (await status(X)) === "ready", 240000);
      await until("the layers", () => X.evaluate(`!!${M} && !!${K} && !!${N}`), 60000);
      await sleep(1500);
    };
    /** Open a vein: a rock said to hide one, struck through the page's own way of striking. */
    const open = async (what, stamina, seed, tool = [0, [], []]) => {
      await X.evaluate(`${K}.caveReset()`);
      await until("no board", () => X.evaluate(`!${G}`), 15000);
      await X.evaluate(`(() => { const t = ${K}; t.empty(); t.setStamina(${stamina}); t.grant("pick", 1); t.hold(0); t.setTool(0, ${JSON.stringify(tool[0])}, ${JSON.stringify(tool[1])}, ${JSON.stringify(tool[2])}); })()`);
      const me = await X.evaluate(`window.__cashTown.me().pos`);
      const rock = (await X.evaluate(`${N}.rocks(1)`)).map((r) => ({ ...r, far: Math.hypot(r.x - me.x, r.y - me.y) })).sort((a, b) => a.far - b.far)[0];
      await X.evaluate(`${K}.setRock(1, ${rock.id}, ${JSON.stringify(what)}, ${seed})`);
      for (let i = 0; i < 40 && !(await X.evaluate(`!!${G}`)); i++) { await X.evaluate(`${N}.hit(1, ${rock.id})`); await sleep(i < 2 ? 2500 : 400); }
      await until("the board", () => X.evaluate(`!!${G}`), 15000);
      await sleep(900);
    };
    await enter();
    await open("vein", 100, 7);
    await X.shot(`${OUT}/vein-${label}-fresh.png`);
    // two strikes of a go, by real clicks on cells that may be struck
    for (let i = 0; i < 2; i++) {
      const at = await X.evaluate(`(() => { const s = ${G}.state(), els = [...document.querySelectorAll('[data-vein-cell][data-may="1"]')]; const el = els.find((e) => e.dataset.kind !== "knot") ?? els[0]; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!at) break;
      for (const type of ["mousePressed", "mouseReleased"]) await X.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", buttons: type === "mousePressed" ? 1 : 0, clickCount: 1 });
      await sleep(500);
    }
    await X.shot(`${OUT}/vein-${label}-played.png`);
    await X.evaluate(`${G}.enough()`);
    await sleep(1400);
    await X.shot(`${OUT}/vein-${label}-came.png`);
    if (label !== "small") {
      await enter();
      await open("gem", 100, 11, [10, ["pkSteady", "pkCutter", "pkTwin"], ["ice"]]);
      await X.shot(`${OUT}/vein-${label}-gem.png`);
      await enter();
      await open("vein", 1, 5);
      await sleep(2300);
      await X.shot(`${OUT}/vein-${label}-tired.png`);
      await enter("&lang=en");
    }
    console.log(label, "done", JSON.stringify(X.errors?.slice?.(0, 3) ?? []));
  } finally {
    await X.close();
  }
}
