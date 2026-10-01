// Cut the Lalafell proof-of-concept into paper-doll layers, then draw a
// preview grid of assembled dolls to check the fit by eye.
//   node build-doll.mjs <art dir>
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ART = process.argv[2];
const OUT = join(ART, "doll");
mkdirSync(OUT, { recursive: true });
const files = { f: "lalafell-f.png", m: "lalafell-m.png", fb: "lalafell-f-bald.png", mb: "lalafell-m-bald.png", bald: "lala-head-bald.png", parts: "face-parts.png", twin: "lala-hair-twin.png", spiky: "lala-hair-spiky.png" };
const urls = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, `data:image/png;base64,${readFileSync(join(ART, f)).toString("base64")}`]));
const lib = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "doll-lib.js"), "utf8");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "doll-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
ws.binaryType = "arraybuffer";
await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
const run = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

try {
  await send("Runtime.enable");
  await run(lib + "\n;window.__lib = { build }; true");
  const t0 = Date.now();
  const { manifest, images } = await run(`(async () => { const r = await __lib.build(${JSON.stringify(urls)}); window.__built = r; return r; })()`);
  for (const [name, dataUrl] of Object.entries(images)) writeFileSync(join(OUT, name), Buffer.from(dataUrl.split(",")[1], "base64"));
  writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`built ${Object.keys(images).length} layers in ${((Date.now() - t0) / 1000).toFixed(1)}s; parts rows ${JSON.stringify(manifest.rows)}; eyes ${manifest.parts.eyes.length}, brows ${manifest.parts.brows.length}, mouths ${manifest.parts.mouths.length}, extras ${manifest.parts.extras.length}; scale ${JSON.stringify(manifest.parts.scale)}; necks bridged ${JSON.stringify(manifest.bridged ?? {})}`);

  // A preview: both bodies, both hairstyles, three views; default face.
  await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 1000, deviceScaleFactor: 1, mobile: false });
  await run(`(async () => {
    const { manifest: M, images: I } = window.__built;
    const img = async (name) => { const i = new Image(); i.src = I[name]; await i.decode(); return i; };
    document.body.style.margin = "0"; document.body.style.background = "#0f1319";
    const cv = document.createElement("canvas"); cv.width = 1500; cv.height = 1000; document.body.append(cv);
    const g = cv.getContext("2d");
    g.fillStyle = "#0f1319"; g.fillRect(0, 0, 1500, 1000);
    const cells = [];
    for (const [gi, gender] of ["f", "m"].entries()) for (const [si, style] of ["twin", "spiky"].entries()) for (let v = 0; v < 3; v++) cells.push({ gender, style, v, col: v + si * 3, row: gi });
    const eyeSet = M.parts.eyes.find((e) => e.id === "round"), brow = M.parts.brows.find((b) => b.id === "soft"), mouth = M.parts.mouths.find((m) => m.id === "smile");
    for (const c of cells) {
      const B = M.bodies[c.gender][c.v];
      const cw = 250, ch = 480, ox = c.col * cw, oy = c.row * ch + 20;
      g.fillStyle = (c.col + c.row) % 2 ? "#1b212b" : "#161b23"; g.fillRect(ox, oy, cw, ch);
      const s = Math.min(cw / B.W, (ch - 10) / B.H);
      const layer = document.createElement("canvas"); layer.width = B.W; layer.height = B.H;
      const L = layer.getContext("2d");
      L.drawImage(await img("body-" + c.gender + "-" + c.v + ".png"), 0, 0);
      L.drawImage(await img("head-" + c.style + "-" + c.gender + "-" + c.v + ".png"), 0, 0);
      const Fc = M.faces[c.style]?.[c.gender]?.[c.v];
      if (Fc) {
        const ps = M.parts.scale[c.gender];
        const put = async (part, x, y, sx = 1) => { const i = await img(part.file); L.drawImage(i, x - part.anchor.cx * ps * sx, y - part.anchor.cy * ps, part.w * ps * sx, part.h * ps); };
        const [eL, eR] = Fc.eyes;
        const squash = c.v === 1 ? 0.78 : 1;
        await put(eyeSet.L, eL.x, eL.y);
        await put(eyeSet.R, eR.x, eR.y, squash);
        await put(brow.L, eL.x, eL.y - eL.h * 1.35);
        await put(brow.R, eR.x, eR.y - eR.h * 1.35, squash);
        await put(mouth, Fc.mouth.x, Fc.mouth.y, squash);
      }
      g.imageSmoothingQuality = "high";
      g.drawImage(layer, ox + (cw - B.W * s) / 2, oy + (ch - B.H * s) / 2, B.W * s, B.H * s);
    }
    return true;
  })()`);
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(ART, "doll-preview.png"), Buffer.from(shot.data, "base64"));
  console.log("preview written");
} finally {
  try { ws.close(); } catch {}
  proc.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
}
