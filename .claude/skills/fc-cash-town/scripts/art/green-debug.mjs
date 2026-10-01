// Where the hairless sheets have pixels the cutter would call hair (green), and what colour they are.
//   node green-debug.mjs <art dir>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ART = process.argv[2];
const lib = readFileSync(new URL("./doll-lib.js", import.meta.url), "utf8");
const urls = { m: "lalafell-m-bald.png", f: "lalafell-f-bald.png" };
for (const k in urls) urls[k] = `data:image/png;base64,${readFileSync(join(ART, urls[k])).toString("base64")}`;

async function probe(urls) {
  const NL = String.fromCharCode(10);
  const out = [];
  for (const g of ["m", "f"]) {
    const img = await load(urls[g]);
    const W = img.W, H = img.H;
    const L = labels(img);
    const cells = new Map();
    let n = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (L[y * W + x] !== CL.green) continue;
      n++;
      const k = `${Math.floor(x / 40) * 40},${Math.floor(y / 40) * 40}`;
      const c = cells.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
      const i = (y * W + x) * 4;
      c.n++; c.r += img.d[i]; c.g += img.d[i + 1]; c.b += img.d[i + 2];
      cells.set(k, c);
    }
    const top = [...cells.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 14)
      .map(([k, c]) => {
        const r = Math.round(c.r / c.n), gg = Math.round(c.g / c.n), b = Math.round(c.b / c.n);
        const [h, s, l] = hsl(r, gg, b);
        return `  cell ${k}: ${c.n}px avg rgb(${r},${gg},${b}) h${Math.round(h)} s${s.toFixed(2)} l${l.toFixed(2)}`;
      });
    out.push(`${g}: ${W}x${H}, green pixels ${n}` + NL + top.join(NL));
  }
  return out.join(NL);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "green-"));
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
  console.log(r.exceptionDetails ? (r.exceptionDetails.exception?.description ?? r.exceptionDetails.text) : r.result.value);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
}
