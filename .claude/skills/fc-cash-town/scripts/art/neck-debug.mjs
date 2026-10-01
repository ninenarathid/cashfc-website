// Print where the back-view neck cut lands on each bald body, with the classes around it.
//   node neck-debug.mjs <art dir>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ART = process.argv[2];
const lib = readFileSync(new URL("./doll-lib.js", import.meta.url), "utf8");
const urls = { f: "lalafell-f-bald.png", m: "lalafell-m-bald.png" };
for (const k in urls) urls[k] = `data:image/png;base64,${readFileSync(join(ART, urls[k])).toString("base64")}`;

// Runs in the page, after doll-lib.js.
async function probe(urls) {
  const NL = String.fromCharCode(10);
  const out = [];
  for (const g of ["f", "m"]) {
    const v = splitViews(await load(urls[g]))[2];
    const L = labels(v), W = v.W;
    const blueTop = topRow(v, L, [CL.blue], 0.15);
    const nk = neckOf(v, L, blueTop);
    const xs = [];
    for (let y = Math.max(0, blueTop - 30); y < blueTop; y++) for (let x = 0; x < W; x++) if (L[y * W + x] === CL.skin) xs.push(x);
    xs.sort((a, b) => a - b);
    const cx = xs[xs.length >> 1];
    const rows = [];
    // . clear  g green  v violet  s skin  b blue  c cream  B brown  d dark  w white  p pink  o other
    for (let y = blueTop + 10; y > blueTop - 70; y -= 2) {
      let s = "";
      for (let x = cx - 90; x <= cx + 90; x += 3) s += ".gvsbcBdwpo"[L[y * W + x]] ?? "?";
      rows.push(String(y).padStart(4) + (nk && y === nk.chin ? "*" : " ") + s);
    }
    out.push(`${g}: W ${W} H ${v.H} blueTop ${blueTop} cx ${cx} neck ${JSON.stringify(nk)}` + NL + rows.join(NL));
  }
  return out.join(NL + NL);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "neck-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
try {
  const expression = `${lib}\n;(${probe.toString()})(${JSON.stringify(urls)})`;
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) console.log(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text, "at line", r.exceptionDetails.lineNumber, "of", expression.split("\n").length);
  else console.log(r.result.value);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
}
