// Screenshot the LPC dressing room through a few presets and choices.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const DIR = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "lpc-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "--allow-file-access-from-files", "about:blank"], { stdio: "ignore" });
let port; for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map(); const errors = [];
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } else if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description?.split("\n").slice(0, 2).join(" ")); };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (name) => { const s = await send("Page.captureScreenshot", { format: "png" }); writeFileSync(join(DIR, `lpc-${name}.png`), Buffer.from(s.data, "base64")); };
const click = (text) => ev(`(() => { const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === ${JSON.stringify(text)}); if (!b) return "missing " + ${JSON.stringify(text)}; b.click(); return "ok"; })()`);
try {
  await send("Runtime.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: pathToFileURL(join(DIR, "preview.html")).href });
  await sleep(4000);
  await shot("1-default");
  for (const [name, steps] of [["2-lalafell", ["Lalafell"]], ["3-miqote", ["Miqo'te"]], ["4-aura", ["Au Ra"]], ["5-hrothgar", ["Hrothgar"]], ["6-elezen-sit", ["Elezen", "นั่ง"]], ["7-miqote-happy-wizard", ["Miqo'te", "ยิ้มกว้าง", "หมวกพ่อมด", "ยืน"]]]) {
    for (const s of steps) console.log(name, s, await click(s));
    await sleep(900); await shot(name);
  }
  console.log(errors.length ? `errors: ${errors.join(" | ")}` : "no page errors");
} finally { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); }
