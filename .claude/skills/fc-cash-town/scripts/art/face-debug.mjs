// Faces up close: head + eyes + mouth for each hairstyle, gender and view, with
// a red tick where the chin was found and a cyan tick at the mouth's target.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DOLL = process.argv[2], OUT = process.argv[3];
const M = JSON.parse(readFileSync(join(DOLL, "manifest.json"), "utf8"));
const urls = Object.fromEntries(readdirSync(DOLL).filter((f) => f.endsWith(".png")).map((f) => [f, `data:image/png;base64,${readFileSync(join(DOLL, f)).toString("base64")}`]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "face-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1500, height: 820, deviceScaleFactor: 1, mobile: false });
await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const M = ${JSON.stringify(M)}, U = ${JSON.stringify(urls)};
  const img = async (n) => { const i = new Image(); i.src = U[n]; await i.decode(); return i; };
  document.body.style.margin = "0";
  const cv = document.createElement("canvas"); cv.width = 1500; cv.height = 820; document.body.append(cv);
  const g = cv.getContext("2d"); g.fillStyle = "#1b212b"; g.fillRect(0, 0, 1500, 820);
  let i = 0;
  for (const style of ["twin", "spiky", "bald"]) for (const gen of ["f", "m"]) for (const v of [0, 1]) {
    const F = M.faces[style][gen][v], B = M.bodies[gen][v];
    const c = document.createElement("canvas"); c.width = B.W; c.height = B.H; const x = c.getContext("2d");
    x.drawImage(await img("body-" + gen + "-" + v + ".png"), 0, 0);
    x.drawImage(await img("head-" + style + "-" + gen + "-" + v + ".png"), 0, 0);
    const ps = M.parts.scale[gen];
    const put = async (part, tx, ty, sx = 1) => x.drawImage(await img(part.file), tx - part.anchor.cx * ps * sx, ty - part.anchor.cy * ps, part.w * ps * sx, part.h * ps);
    const eyes = M.parts.eyes.find((e) => e.id === "round"), mouth = M.parts.mouths.find((m) => m.id === "grin");
    await put(eyes.L, F.eyes[0].x, F.eyes[0].y); await put(eyes.R, F.eyes[1].x, F.eyes[1].y, v === 1 ? 0.78 : 1);
    await put(mouth, F.mouth.x, F.mouth.y, v === 1 ? 0.88 : 1);
    x.fillStyle = "red"; x.fillRect(F.mouth.x - 30, F.chin - 1, 60, 2);
    // Crop around the face, 2.2x.
    const cx = (F.eyes[0].x + F.eyes[1].x) / 2, cy = F.eyes[0].y + 20, half = 90;
    const col = i % 6, row = (i / 6) | 0;
    g.imageSmoothingQuality = "high";
    g.drawImage(c, cx - half, cy - half, half * 2, half * 2, col * 250 + 5, row * 400 + 5, 240, 240);
    g.fillStyle = "#e3e8ef"; g.font = "14px sans-serif"; g.fillText(style + " " + gen + " " + (v ? "3/4" : "front"), col * 250 + 8, row * 400 + 265);
    i++;
  }
  return true;
})()` });
const s = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(OUT, Buffer.from(s.data, "base64"));
try { ws.close(); } catch {}
proc.kill();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
console.log("ok");
