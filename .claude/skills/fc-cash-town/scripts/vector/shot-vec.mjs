// Screenshot the vector doll page: as built, with the reference overlaid, zoomed, and side by side.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const DIR = process.argv[2], OUT = process.argv[3] ?? DIR;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "vec-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
let port; for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map(); const errors = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.split("\n")[0]); };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(OUT, `vec-${name}.png`), Buffer.from(s.data, "base64")); };
try {
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(join(DIR, "preview.html")).href });
  await sleep(1500);
  await ev(`document.getElementById("walk").checked = false; document.getElementById("blink").checked = false`);
  await sleep(300);
  await shot("1-still");
  await ev(`__vecRef(true)`); await sleep(200); await shot("2-overlay"); await ev(`__vecRef(false)`);
  const args = process.argv.slice(4);
  if (args.includes("more")) {
    await ev(`[...document.querySelectorAll(".chip")].find(b => b.textContent === "หมวกพ่อมด").click(); document.querySelector('[aria-label="สีผม #1f1c24"]').click(); document.querySelector('[aria-label="สีชุด #c4473a"]').click(); document.querySelector('[aria-label="สีตา #2f5fb3"]').click()`);
    await sleep(300); await shot("3-wizard-black");
    await ev(`[...document.querySelectorAll(".chip")].find(b => b.textContent === "ผ้าคลุมไหล่").click(); [...document.querySelectorAll(".chip")].find(b => b.textContent === "ยิ้มหยี").click(); [...document.querySelectorAll(".chip")].find(b => b.textContent === "ยิ้มกว้าง").click(); document.querySelector('[aria-label="สีผม #e8c071"]').click(); document.querySelector('[aria-label="สีผิว #fbe7da"]').click()`);
    await sleep(300); await shot("4-cloak-blonde");
    await ev(`document.getElementById("walk").checked = true`); await sleep(370); await shot("5-walk-a"); await sleep(150); await shot("5-walk-b");
    await ev(`document.getElementById("walk").checked = false; document.getElementById("compare").checked = true; document.getElementById("zoom").value = 4; document.getElementById("compare").dispatchEvent(new Event("change"))`);
    await sleep(500); await shot("6-compare-zoom");
  }
  console.log(errors.length ? `errors: ${errors.join(" | ")}` : "no page errors");
} finally { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); }
