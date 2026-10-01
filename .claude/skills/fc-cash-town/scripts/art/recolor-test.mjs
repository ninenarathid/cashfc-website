// Can members recolour an AI-drawn character in code? Take the anchor, find
// the hair, outfit, eyes and skin by their colour (flat cel shading makes each
// a narrow band of hue), move each band to a new colour keeping its shading,
// and draw a grid of variations, big and at town size.
//   node recolor-test.mjs <png> <out.png>
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [src, out] = process.argv.slice(2);
const dataUrl = `data:image/png;base64,${readFileSync(src).toString("base64")}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), "recolor-"));
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
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 860, deviceScaleFactor: 1, mobile: false });
const r = await send("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
  const img = new Image(); img.src = ${JSON.stringify(dataUrl)}; await img.decode();
  const W = img.naturalWidth, H = img.naturalHeight;
  const base = document.createElement("canvas"); base.width = W; base.height = H;
  const bx = base.getContext("2d"); bx.drawImage(img, 0, 0);
  const src = bx.getImageData(0, 0, W, H);

  const toHsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l]; const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; };
  const toRgb = (h, s, l) => { h /= 360; if (!s) { const v = Math.round(l * 255); return [v, v, v]; } const q = l < .5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; const f = (t) => { t = (t + 1) % 1; return t < 1/6 ? p + (q - p) * 6 * t : t < .5 ? q : t < 2/3 ? p + (q - p) * (2/3 - t) * 6 : p; }; return [f(h + 1/3), f(h), f(h - 1/3)].map((v) => Math.round(v * 255)); };
  const hexHsl = (hex) => { const n = parseInt(hex.slice(1), 16); return toHsl(n >> 16 & 255, n >> 8 & 255, n & 255); };
  const inHue = (h, a, b) => a <= b ? h >= a && h <= b : h >= a || h <= b;

  // The regions, by colour (and, where two share a hue, by place).
  const regions = {
    hair:   (h, s, l, x, y) => inHue(h, 318, 356) && s > .3 && l > .42,
    outfit: (h, s, l, x, y) => inHue(h, 195, 238) && s > .25 && l > .35 && y > H * .45,
    eyes:   (h, s, l, x, y) => inHue(h, 195, 250) && s > .3 && y > H * .3 && y < H * .44 && x > W * .3 && x < W * .7,
    skin:   (h, s, l, x, y) => inHue(h, 14, 40) && s > .25 && s < .8 && l > .44 && l < .84 && y < H * .86,
  };
  // Each region's own typical colour: the median of what it holds.
  const label = new Uint8Array(W * H);
  const samples = { hair: [], outfit: [], eyes: [], skin: [] };
  const names = Object.keys(regions);
  for (let p = 0, i = 0; p < W * H; p++, i += 4) {
    if (src.data[i + 3] < 200) continue;
    const [h, s, l] = toHsl(src.data[i], src.data[i + 1], src.data[i + 2]);
    const x = p % W, y = (p / W) | 0;
    for (let k = 0; k < names.length; k++) if (regions[names[k]](h, s, l, x, y)) { label[p] = k + 1; if (p % 7 === 0) samples[names[k]].push([h, s, l]); break; }
  }
  const med = (arr, j) => { const v = arr.map((a) => a[j]).sort((a, b) => a - b); return v[v.length >> 1] ?? 0; };
  const typical = Object.fromEntries(names.map((n) => [n, [med(samples[n], 0), med(samples[n], 1), med(samples[n], 2)]]));

  function recolor(targets) {
    const outData = new ImageData(new Uint8ClampedArray(src.data), W, H);
    const d = outData.data;
    for (let p = 0, i = 0; p < W * H; p++, i += 4) {
      const k = label[p]; if (!k) continue;
      const name = names[k - 1], t = targets[name]; if (!t) continue;
      const [, s, l] = toHsl(d[i], d[i + 1], d[i + 2]);
      const [hb, sb, lb] = typical[name], [ht, st, lt] = hexHsl(t);
      const s2 = Math.max(0, Math.min(1, st * (s / Math.max(.05, sb))));
      // Keep the shading: the same steps of light and shadow, around the new colour.
      const l2 = Math.max(0, Math.min(1, lt + (l - lb) * (lt < .3 ? .6 : 1)));
      const [r, g, b] = toRgb(ht, s2, l2);
      d[i] = r; d[i + 1] = g; d[i + 2] = b;
    }
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    c.getContext("2d").putImageData(outData, 0, 0);
    return c;
  }

  const looks = [
    ["ต้นฉบับ", {}],
    ["ผมเงิน · ชุดเขียวหยก", { hair: "#dcdbe6", outfit: "#3fae8f" }],
    ["ผมดำ · ชุดแดง · ตาทอง", { hair: "#2c2833", outfit: "#c4473a", eyes: "#d4a017" }],
    ["ผมมิ้นต์ · ชุดม่วง · ตาเขียว", { hair: "#7fd1b0", outfit: "#7e6bc4", eyes: "#3fb27f" }],
    ["ผมบลอนด์ · ผิวขาว", { hair: "#ecc874", skin: "#f6d7c3" }],
    ["ผมแดง · ชุดเทาเข้ม · ผิวเข้ม", { hair: "#c8303a", outfit: "#3f4756", skin: "#8f5f3e" }],
    ["ผมน้ำตาล · ชุดทอง", { hair: "#6b3d2a", outfit: "#d8b65a" }],
    ["ผมฟ้า · ชุดขาว · ตาแดง", { hair: "#8fb0e0", outfit: "#e9e6df", eyes: "#d8424f" }],
  ];
  document.body.style.margin = "0";
  const v = document.createElement("canvas"); v.width = 1200; v.height = 860; document.body.append(v);
  const g = v.getContext("2d");
  g.fillStyle = "#0f1319"; g.fillRect(0, 0, 1200, 860);
  g.font = "600 14px sans-serif"; g.textAlign = "center"; g.fillStyle = "#e3e8ef";
  const crop = [80, 28, 1092, 1202];
  const made = looks.map(([name, t]) => [name, recolor(t)]);
  made.forEach(([name, c], i) => {
    const col = i % 4, row = (i / 4) | 0, cx = 150 + col * 300, top = 20 + row * 330;
    g.fillStyle = "#1b212b"; g.fillRect(cx - 140, top, 280, 300);
    const k = 270 / crop[3];
    g.imageSmoothingQuality = "high";
    g.drawImage(c, crop[0], crop[1], crop[2], crop[3], cx - crop[2] * k / 2, top + 8, crop[2] * k, crop[3] * k);
    g.fillStyle = "#e3e8ef"; g.fillText(name, cx, top + 322);
  });
  // The same eight at the size the town draws people.
  g.fillStyle = "#3d4452"; g.fillRect(0, 690, 1200, 170);
  made.forEach(([name, c], i) => {
    const cx = 75 + i * 150, k = 64 / crop[3];
    g.drawImage(c, crop[0], crop[1], crop[2], crop[3], cx - crop[2] * k / 2, 720, crop[2] * k, crop[3] * k);
  });
  g.fillStyle = "#8b97a8"; g.fillText("ขนาดในเมือง (64 px)", 600, 812);
  return { typical, counts: Object.fromEntries(names.map((n, k) => [n, label.reduce((a, v) => a + (v === k + 1), 0)])) };
})()` });
console.log(JSON.stringify(r.result.value));
const s = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(out, Buffer.from(s.data, "base64"));
try { ws.close(); } catch {}
proc.kill();
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 800);
