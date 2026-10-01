// The back views large: body alone, head alone, both, for each gender and hairstyle.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DOLL = process.argv[2], OUT = process.argv[3];
const view = Number(process.argv[4] ?? 2);
const data = (n) => `data:image/png;base64,${readFileSync(join(DOLL, n)).toString("base64")}`;
const names = [];
for (const g of ["f", "m"]) { names.push(`body-${g}-${view}.png`); for (const h of ["twin", "spiky"]) names.push(`head-${h}-${g}-${view}.png`); }
const urls = Object.fromEntries(names.map((n) => [n, data(n)]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "back-"));
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
await send("Emulation.setDeviceMetricsOverride", { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const U = ${JSON.stringify(urls)};
  const img = async (n) => { const i = new Image(); i.src = U[n]; await i.decode(); return i; };
  document.body.style.margin = "0";
  const cv = document.createElement("canvas"); cv.width = 1600; cv.height = 900; document.body.append(cv);
  const g = cv.getContext("2d");
  // A checkerboard, so what is missing shows as checks.
  for (let y = 0; y < 900; y += 20) for (let x = 0; x < 1600; x += 20) { g.fillStyle = ((x + y) / 20) % 2 ? "#3a4250" : "#262c36"; g.fillRect(x, y, 20, 20); }
  const cells = [["body-f", null], ["head-twin-f", null], ["body-f", "head-twin-f"], ["body-f", "head-spiky-f"], ["body-m", "head-twin-m"], ["body-m", "head-spiky-m"]];
  let i = 0;
  for (const [a, b] of cells) {
    const ox = (i % 6) * 266, oy = 20;
    const A = await img(a.startsWith("body") ? a + "-${view}.png" : a + "-${view}.png");
    const s = 260 / A.width;
    g.drawImage(A, ox, oy, A.width * s, A.height * s);
    if (b) { const B = await img(b + "-${view}.png"); g.drawImage(B, ox, oy, B.width * s, B.height * s); }
    g.fillStyle = "#fff"; g.font = "14px sans-serif"; g.fillText(a + (b ? " + " + b : ""), ox + 4, 870);
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
