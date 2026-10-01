// Look at a generated character picture: is the background really transparent,
// any stray specks, and how does it read at the sizes Cash Town draws people?
//   node inspect-art.mjs <png> <out.png>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [src, out] = process.argv.slice(2);
const dataUrl = `data:image/png;base64,${readFileSync(src).toString("base64")}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "art-"));
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
await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 520, deviceScaleFactor: 1, mobile: false });
const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, W, H).data;
  let clear = 0, solid = 0, partial = 0, minX = W, minY = H, maxX = 0, maxY = 0;
  const specks = [];
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const a = d[i + 3];
    if (a === 0) { clear++; continue; }
    if (a === 255) solid++; else partial++;
    const px = p % W, py = (p / W) | 0;
    if (a > 40) { minX = Math.min(minX, px); maxX = Math.max(maxX, px); minY = Math.min(minY, py); maxY = Math.max(maxY, py); }
    // Saturated red, which this picture should not have outside the blush.
    if (a > 100 && d[i] > 170 && d[i + 1] < 80 && d[i + 2] < 80 && specks.length < 40) specks.push([px, py]);
  }
  const corner = [d[3], d[(W - 1) * 4 + 3], d[(W * (H - 1)) * 4 + 3], d[(W * H - 1) * 4 + 3]];
  const hist = { "1-63": 0, "64-191": 0, "192-239": 0, "240-249": 0, "250-254": 0 };
  for (let i = 3; i < d.length; i += 4) { const a = d[i]; if (a === 0 || a === 255) continue; hist[a < 64 ? "1-63" : a < 192 ? "64-191" : a < 240 ? "192-239" : a < 250 ? "240-249" : "250-254"]++; }
  // The previews: big, then the sizes the town draws, on the town's floor and the page's dark.
  document.body.style.margin = "0"; document.body.style.background = "#0f1319";
  const v = document.createElement("canvas"); v.width = 900; v.height = 520; document.body.append(v);
  const g = v.getContext("2d");
  g.fillStyle = "#0f1319"; g.fillRect(0, 0, 900, 520);
  const bw = maxX - minX + 1, bh = maxY - minY + 1;
  const draw = (hgt, cx, foot, smooth = true) => { const k = hgt / bh; g.imageSmoothingEnabled = smooth; g.imageSmoothingQuality = "high"; g.drawImage(img, minX, minY, bw, bh, cx - bw * k / 2, foot - bh * k, bw * k, bh * k); };
  // Checkerboard behind the big one, so transparency shows as such.
  for (let yy = 20; yy < 480; yy += 16) for (let xx = 20; xx < 360; xx += 16) { g.fillStyle = ((xx + yy) / 16) % 2 ? "#2a3240" : "#1c222c"; g.fillRect(xx, yy, 16, 16); }
  draw(440, 190, 470);
  g.fillStyle = "#3d4452"; g.fillRect(400, 60, 480, 420);
  g.fillStyle = "#8b97a8"; g.font = "600 13px sans-serif";
  for (const [hgt, cx] of [[40, 460], [64, 560], [96, 700], [140, 820]]) { draw(hgt, cx, 300); g.fillText(hgt + " px", cx - 18, 330); }
  return { W, H, clear, solid, partial, hist, corner, box: [minX, minY, maxX, maxY], specks: specks.slice(0, 12), speckCount: specks.length };
})()` });
console.log(JSON.stringify(r.result.value));
const s = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(s.data, "base64"));
try { ws.close(); } catch {}
proc.kill();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
