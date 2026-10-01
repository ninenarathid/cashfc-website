// Run cutNeck on each hair sheet's back view and cutBody on each hairless back, and print what they decided.
//   node probe-neck.mjs <art dir>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ART = process.argv[2];
const lib = readFileSync(new URL("./doll-lib.js", import.meta.url), "utf8");
const urls = { twin: "lala-hair-twin.png", spiky: "lala-hair-spiky.png", bald: "lala-head-bald.png", fb: "lalafell-f-bald.png", mb: "lalafell-m-bald.png" };
for (const k in urls) urls[k] = `data:image/png;base64,${readFileSync(join(ART, urls[k])).toString("base64")}`;

async function probe(urls) {
  const NL = String.fromCharCode(10);
  const out = [];
  const names = Object.fromEntries(Object.entries(CL).map(([k, n]) => [n, k[0]]));
  for (const st of ["twin", "spiky", "bald"]) {
    const v = splitViews(await load(urls[st]))[2];
    const L = labels(v), W = v.W, H = v.H;
    const r = cutNeck(v, L, true);
    let greens = 0; for (let p = 0; p < W * H; p++) if (L[p] === CL.green) greens++;
    const col = []; for (let y = r.chin + 2; y > r.chin - 30; y -= 2) col.push(names[L[y * W + r.neck.cx]]);
    out.push(`${st}: W ${W} H ${H} chin ${r.chin} minY ${r.minY} cx ${r.neck.cx} band ${r.neck.x0}-${r.neck.x1} bottom ${r.neck.bottom} nape ${r.nape} greens ${greens} need ${Math.round(W * H * 0.05)} column-up-from-chin+2 ${col.join("")}`);
  }
  for (const g of ["fb", "mb"]) {
    const v = splitViews(await load(urls[g]))[2];
    const L = labels(v);
    const blueTop = topRow(v, L, [CL.blue], 0.15);
    const nk = neckOf(v, L, blueTop);
    const ears = earTips(v, L, blueTop);
    out.push(`${g}: W ${v.W} H ${v.H} blueTop ${blueTop} neck ${JSON.stringify(nk)} earR ${JSON.stringify(ears.R)}`);
  }
  return out.join(NL);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "probe-"));
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
