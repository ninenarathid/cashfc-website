// Pack the paper doll's layers into one picture for Cash Town: every body,
// every hairstyle and every face part, cropped to what they draw, scaled for
// the town, in a single WebP with a JSON map beside it. One request instead
// of sixty-odd, which matters on a host that counts requests.
//
//   node build-town-atlas.mjs <doll dir> <out dir> [scale=0.6] [quality=0.92]
//
// <doll dir> is what build-doll.mjs wrote (art/doll, built in mannequin mode:
// hairless bodies with the head, hair-only layers). <out dir> is public/town.
//
// The picture is named by its content (doll-<hash>.webp), so browsers may keep
// it for a week (next.config.ts) and a new one can never be paired with an old
// map: doll.json, which is asked for afresh, says which picture it belongs to.
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [DOLL, OUT, scaleArg, qArg] = process.argv.slice(2);
if (!DOLL || !OUT) { console.error("usage: node build-town-atlas.mjs <doll dir> <out dir> [scale] [quality]"); process.exit(1); }
const S = Number(scaleArg ?? 0.6);
const Q = Number(qArg ?? 0.92);
const manifest = JSON.parse(readFileSync(join(DOLL, "manifest.json"), "utf8"));
if (manifest.mode !== "mannequin") { console.error("the doll was not built in mannequin mode (hairless sheets missing?)"); process.exit(1); }
const files = Object.fromEntries(readdirSync(DOLL).filter((f) => f.endsWith(".png"))
  .map((f) => [f, `data:image/png;base64,${readFileSync(join(DOLL, f)).toString("base64")}`]));

// Runs in the page.
async function pack({ manifest: M, files, S, Q }) {
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  const bbox = (img) => {
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, img.width, img.height).data;
    let x0 = img.width, y0 = img.height, x1 = -1, y1 = -1;
    for (let y = 0; y < img.height; y++) for (let x = 0; x < img.width; x++) if (d[(y * img.width + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return x1 < 0 ? null : { x0, y0, x1: x1 + 1, y1: y1 + 1 };
  };
  const maxPart = Math.max(M.parts.scale.f, M.parts.scale.m);
  const Pk = S * maxPart; // face parts: their own pixels, to the doll's at the larger scale
  // Each piece: the source, the crop, and the scale it goes in at.
  const pieces = [];
  for (const g of ["f", "m"]) for (let v = 0; v < 3; v++) {
    pieces.push({ name: `body-${g}-${v}`, file: `body-${g}-${v}.png`, k: S });
    for (const st of ["twin", "spiky"]) pieces.push({ name: `hair-${st}-${g}-${v}`, file: `head-${st}-${g}-${v}.png`, k: S });
  }
  const partFiles = new Set();
  for (const e of M.parts.eyes) { partFiles.add(e.L.file); partFiles.add(e.R.file); }
  for (const b of M.parts.brows) { partFiles.add(b.L.file); partFiles.add(b.R.file); }
  for (const m of M.parts.mouths) partFiles.add(m.file);
  for (const x of M.parts.extras) partFiles.add(x.file);
  for (const f of partFiles) pieces.push({ name: f.replace(/\.png$/, ""), file: f, k: Pk, part: true });

  for (const p of pieces) {
    p.img = await load(files[p.file]);
    // Parts are cut to their pixels already; layers carry the doll canvas's padding.
    p.box = p.part ? { x0: 0, y0: 0, x1: p.img.width, y1: p.img.height } : bbox(p.img);
    if (!p.box) continue;
    p.w = Math.max(1, Math.ceil((p.box.x1 - p.box.x0) * p.k));
    p.h = Math.max(1, Math.ceil((p.box.y1 - p.box.y0) * p.k));
  }
  // Shelf packing, tallest first, into a width that keeps the sheet roughly square.
  const live = pieces.filter((p) => p.box);
  const area = live.reduce((a, p) => a + (p.w + 2) * (p.h + 2), 0);
  const W = Math.max(...live.map((p) => p.w + 2), Math.ceil(Math.sqrt(area) * 1.1));
  live.sort((a, b) => b.h - a.h || b.w - a.w);
  let x = 0, y = 0, shelf = 0;
  for (const p of live) {
    if (x + p.w + 2 > W) { x = 0; y += shelf; shelf = 0; }
    p.ax = x + 1; p.ay = y + 1;
    x += p.w + 2; shelf = Math.max(shelf, p.h + 2);
  }
  const H = y + shelf;
  const sheet = document.createElement("canvas"); sheet.width = W; sheet.height = H;
  const g = sheet.getContext("2d");
  g.imageSmoothingQuality = "high";
  for (const p of live) g.drawImage(p.img, p.box.x0, p.box.y0, p.box.x1 - p.box.x0, p.box.y1 - p.box.y0, p.ax, p.ay, p.w, p.h);

  // [x, y, w, h, ox, oy]: where it is on the sheet, and where its corner goes
  // on the doll's canvas (scaled); parts have no place of their own (ox, oy 0).
  const frames = {};
  for (const p of live) frames[p.name] = [p.ax, p.ay, p.w, p.h, p.part ? 0 : +(p.box.x0 * S).toFixed(2), p.part ? 0 : +(p.box.y0 * S).toFixed(2)];
  const r2 = (n) => +n.toFixed(2);
  const bodies = {}, faces = {};
  for (const g2 of ["f", "m"]) {
    bodies[g2] = M.bodies[g2].map((b, v) => {
      const fr = frames[`body-${g2}-${v}`];
      return { W: r2(b.W * S), H: r2(b.H * S), feetY: r2(b.feetY * S), cx: r2(fr[4] + fr[2] / 2) };
    });
    faces[g2] = [0, 1].map((v) => {
      const F = M.faces.twin[g2][v];
      return { eyes: F.eyes.map((e) => ({ x: r2(e.x * S), y: r2(e.y * S), w: r2(e.w * S), h: r2(e.h * S) })), mouth: { x: r2(F.mouth.x * S), y: r2(F.mouth.y * S) } };
    });
  }
  const part = (q) => ({ frame: q.file.replace(/\.png$/, ""), ax: r2(q.anchor.cx * Pk), ay: r2(q.anchor.cy * Pk) });
  const parts = {
    scale: { f: r2(M.parts.scale.f / maxPart), m: r2(M.parts.scale.m / maxPart) },
    eyes: M.parts.eyes.map((e) => ({ id: e.id, L: part(e.L), R: part(e.R) })),
    brows: M.parts.brows.map((b) => ({ id: b.id, L: part(b.L), R: part(b.R) })),
    mouths: M.parts.mouths.map((m) => ({ id: m.id, ...part(m) })),
    extras: M.parts.extras.map((e) => ({ id: e.id, ...part(e) })),
  };
  const webp = sheet.toDataURL("image/webp", Q);
  return { json: { v: 1, scale: S, size: [W, H], frames, bodies, faces, parts }, webp };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "atlas-"));
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
  const expression = `(${pack.toString()})(${JSON.stringify({ manifest, files, S, Q })})`;
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  const { json, webp } = r.result.value;
  if (!webp.startsWith("data:image/webp")) throw new Error("this Chrome did not encode WebP");
  mkdirSync(OUT, { recursive: true });
  const bytes = Buffer.from(webp.split(",")[1], "base64");
  const image = `doll-${createHash("sha1").update(bytes).digest("hex").slice(0, 10)}.webp`;
  for (const old of readdirSync(OUT)) if (/^doll(-[0-9a-f]+)?\.webp$/.test(old) && old !== image) rmSync(join(OUT, old));
  writeFileSync(join(OUT, image), bytes);
  writeFileSync(join(OUT, "doll.json"), JSON.stringify({ ...json, image }));
  console.log(`${image}: atlas ${json.size[0]}x${json.size[1]} at scale ${S}, ${Object.keys(json.frames).length} frames, webp ${(bytes.length / 1024).toFixed(0)} KB, json ${(JSON.stringify(json).length / 1024).toFixed(1)} KB`);
} finally {
  try { ws.close(); } catch {}
  proc.kill();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
}
