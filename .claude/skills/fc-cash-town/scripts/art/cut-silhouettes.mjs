// The other races as dark silhouettes, cut from the 8-race lineup picture:
// the eight largest pieces left to right, each filled with one dark colour.
//   node cut-silhouettes.mjs <lineup.png> <out dir>
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const [src, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const lib = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "doll-lib.js"), "utf8");
const url = `data:image/png;base64,${readFileSync(src).toString("base64")}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "sil-"));
const proc = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
let port;
for (let i = 0; i < 150 && !port; i++) { try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; } catch { await sleep(100); } }
const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let seq = 0; const wait = new Map();
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); m.error ? w.no(new Error(m.error.message)) : w.ok(m.result); } };
const send = (method, params = {}) => new Promise((ok, no) => { const id = ++seq; wait.set(id, { ok, no }); ws.send(JSON.stringify({ id, method, params })); });
const run = async (expression) => { const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text); return r.result.value; };
try {
  await send("Runtime.enable");
  await run(lib + "\n;true");
  const res = await run(`(async () => {
    const img = await load(${JSON.stringify(url)});
    // The characters touch, so split by columns: the seven emptiest columns,
    // each the deepest dip in occupancy within its stretch, spaced apart.
    const occ = new Array(img.W).fill(0);
    for (let y = 0; y < img.H; y++) for (let x = 0; x < img.W; x++) if (img.d[(y * img.W + x) * 4 + 3] > 60) occ[x]++;
    const sm = occ.map((_, x) => { let s = 0, n = 0; for (let d = -4; d <= 4; d++) { const v = occ[x + d]; if (v !== undefined) { s += v; n++; } } return s / n; });
    let first = 0, last = img.W - 1;
    while (first < img.W && occ[first] === 0) first++;
    while (last > 0 && occ[last] === 0) last--;
    const span = last - first, cuts = [];
    const minGap = span / 14;
    const cand = [];
    for (let x = first + 10; x < last - 10; x++) if (sm[x] <= sm[x - 1] && sm[x] <= sm[x + 1]) cand.push(x);
    cand.sort((a, b) => sm[a] - sm[b]);
    for (const x of cand) { if (cuts.every((c) => Math.abs(c - x) > minGap)) cuts.push(x); if (cuts.length === 7) break; }
    cuts.sort((a, b) => a - b);
    const edges = [first, ...cuts, last + 1];
    const groups = edges.slice(0, -1).map((x0, i) => ({ x0, x1: edges[i + 1] }));
    const names = ["lalafell", "miqote", "hyur", "aura", "viera", "hrothgar", "elezen", "roegadyn"];
    const H = 150, outImgs = {};
    const box = (g) => { let y0 = img.H, y1 = 0; for (let y = 0; y < img.H; y++) for (let x = g.x0; x < g.x1; x++) if (img.d[(y * img.W + x) * 4 + 3] > 60) { if (y < y0) y0 = y; if (y > y1) y1 = y; } return { y0, y1: y1 + 1 }; };
    const boxes = groups.map(box);
    const tallest = Math.max(...boxes.map((b) => b.y1 - b.y0));
    const ground = Math.max(...boxes.map((b) => b.y1));
    const k = (H - 6) / tallest;
    groups.forEach((g, i) => {
      const W = Math.ceil((g.x1 - g.x0) * k) + 6;
      const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      const src = document.createElement("canvas"); src.width = g.x1 - g.x0; src.height = img.H;
      const sd = new ImageData(src.width, src.height);
      for (let y = 0; y < img.H; y++) for (let x = g.x0; x < g.x1; x++) {
        const p = y * img.W + x, q = (y * src.width + (x - g.x0)) * 4;
        sd.data[q] = 30; sd.data[q + 1] = 36; sd.data[q + 2] = 46; sd.data[q + 3] = img.d[p * 4 + 3];
      }
      src.getContext("2d").putImageData(sd, 0, 0);
      const c = cv.getContext("2d"); c.imageSmoothingQuality = "high";
      c.drawImage(src, 3, H - 3 - ground * k, src.width * k, img.H * k);
      outImgs["sil-" + names[i] + ".png"] = cv.toDataURL("image/png");
    });
    return { outImgs, sizes: groups.map((g) => g.x1 - g.x0) };
  })()`);
  for (const [name, d] of Object.entries(res.outImgs)) writeFileSync(join(out, name), Buffer.from(d.split(",")[1], "base64"));
  console.log("silhouettes", Object.keys(res.outImgs).join(", "), "| widths", res.sizes.join(","));
} finally { try { ws.close(); } catch {} proc.kill(); setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800); }
