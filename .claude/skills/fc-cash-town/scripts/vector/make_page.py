"""Build the vector doll prototype page: the pieces (doll-vector.json), a rig,
and the controls. Writes vector-doll/vector-doll.html (a page fragment, as the
artifact publish step wraps it) and vector-doll/preview.html (with a skeleton,
for local screenshots).

    python make_page.py
"""
import base64, io, json, os
from PIL import Image

os.makedirs("vector-doll", exist_ok=True)
data = json.load(open("doll-vector.json"))
ref = Image.open("lala-vector-style.png").convert("RGB").crop((0, 140, 512, 900))
buf = io.BytesIO(); ref.save(buf, "WEBP", quality=88)
ref_url = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()

PALETTES = {
    "hair": ["#f39c93", "#1f1c24", "#3a2b28", "#5a3a2a", "#7a4a2e", "#a8572f", "#c97a3d", "#d9a05b", "#e8c071", "#f2dca0",
             "#9e2b34", "#c8434e", "#e07a8b", "#f3a6c4", "#5b3f8c", "#8a6ad0", "#c3a6e8", "#2f4a7a", "#4f7fc4", "#8fb0e0",
             "#2f6b5a", "#4fa88a", "#8fd1b6", "#6e6a75", "#b9b6c3", "#e8e6ef"],
    "eye": ["#3a2418", "#2f5fb3", "#4a8fe7", "#2fa3a8", "#3fb27f", "#8fbf4a", "#d4a017", "#b5652b", "#d8424f", "#e0709a", "#8a5cd8", "#9aa2ae"],
    "skin": ["#f2ad75", "#fbe7da", "#f8dccb", "#f2cdb5", "#ecbd9f", "#e5b48a", "#d39c6f", "#bd8358", "#9c6640"],
    "outfit": ["#6c98af", "#3d6fb0", "#3fae8f", "#5e8a4a", "#d8b65a", "#c98a5b", "#c4473a", "#b0527a", "#7e6bc4", "#3f4756", "#8b8f99", "#e9e6df"],
    "hat": ["#597daa", "#a44442", "#7c452e", "#3fae8f", "#7e6bc4", "#d8b65a", "#3f4756", "#e9e6df"],
}

html = r"""<title>Vector Lalafell</title>
<meta name="description" content="A prototype of Cash Town's avatar as real vector art on a skeleton: swap eyes, mouths and hats, recolour anything, walk, blink and talk.">
<style>
:root { --bg:#0f1319; --surface:#161b23; --card:#1b212b; --line:#262d39; --line-strong:#3a4352; --ink:#e3e8ef; --muted:#8b97a8; --accent:#6aa9e0; --gold:#e5cc80; --jade:#4fb8a8; }
:root[data-theme="light"] { --bg:#f4f1ea; --surface:#fffdf8; --card:#ffffff; --line:#e3ddd0; --line-strong:#cfc6b4; --ink:#1f2430; --muted:#5f6878; --accent:#2f6fb0; --gold:#9a7a20; --jade:#1f7f72; }
@media (prefers-color-scheme: light) { :root:not([data-theme="dark"]) { --bg:#f4f1ea; --surface:#fffdf8; --card:#ffffff; --line:#e3ddd0; --line-strong:#cfc6b4; --ink:#1f2430; --muted:#5f6878; --accent:#2f6fb0; --gold:#9a7a20; --jade:#1f7f72; } }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.65 "Noto Sans Thai Looped", "Noto Sans Thai", system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 20px 16px 48px; }
.eyebrow { font-size: 12px; letter-spacing: .2em; text-transform: uppercase; color: var(--accent); }
h1 { font-size: 28px; margin: 2px 0 6px; line-height: 1.3; }
.lede { color: var(--muted); margin: 0 0 16px; max-width: 46rem; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 16px; }
@media (max-width: 860px) { .grid { grid-template-columns: 1fr; } }
.stagecard { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; overflow: hidden; }
.stage { position: relative; height: min(70vh, 620px); background: radial-gradient(120% 90% at 50% 20%, #1d2533, #0c1017); }
:root[data-theme="light"] .stage { background: radial-gradient(120% 90% at 50% 20%, #fff, #e9e3d6); }
.stage svg { width: 100%; height: 100%; display: block; }
.stage .refimg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; opacity: .45; pointer-events: none; }
.split { display: grid; grid-template-columns: 1fr 1fr; height: 100%; }
.split > div { position: relative; overflow: hidden; border-right: 1px solid var(--line); }
.split .tag { position: absolute; left: 10px; top: 8px; z-index: 2; font-size: 12px; color: var(--muted); background: color-mix(in oklab, var(--bg) 80%, transparent); padding: 2px 8px; border-radius: 99px; }
.split img.raster { position: absolute; left: 50%; top: 50%; transform-origin: center; }
.bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; padding: 10px 14px; border-top: 1px solid var(--line); }
.bar label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.bar input[type=range] { width: 140px; accent-color: var(--accent); }
.panel { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 12px 14px; max-height: min(78vh, 760px); overflow: auto; }
.g { margin-top: 12px; } .g:first-child { margin-top: 0; }
.gl { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--muted); margin-bottom: 6px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { border: 1px solid var(--line-strong); background: transparent; color: var(--ink); border-radius: 99px; padding: 5px 12px; font: inherit; font-size: 13px; cursor: pointer; min-height: 32px; }
.chip[aria-pressed="true"] { background: color-mix(in oklab, var(--accent) 22%, transparent); border-color: var(--accent); color: var(--accent); font-weight: 600; }
.sw { width: 30px; height: 30px; border-radius: 50%; border: 0; cursor: pointer; box-shadow: inset 0 0 0 1px rgba(0,0,0,.25); }
.sw[aria-pressed="true"] { outline: 2px solid var(--accent); outline-offset: 2px; }
.chip:focus-visible, .sw:focus-visible, .bar input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.note { font-size: 12px; color: var(--muted); margin-top: 14px; }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px; margin-top: 16px; }
.fact { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; }
.fact b { display: block; font-size: 14px; } .fact span { font-size: 12.5px; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
<main>
  <div class="eyebrow">Cash Town · ทดลอง vector</div>
  <h1>Lalafell แบบ vector บนโครงกระดูก</h1>
  <p class="lede">ทุกชิ้นแปลงจากภาพ ChatGPT 2 ภาพเป็น vector จริง (SVG) แล้วติดกับกระดูก: เปลี่ยนตา ปาก หมวก สีอะไรก็ได้ เดิน กะพริบตา คุยได้ ติ๊ก "เทียบ PNG" แล้วเลื่อนซูม จะเห็นว่า vector คมกว่าแค่ไหน</p>
  <div class="grid">
    <section class="stagecard" aria-label="ตัวละคร">
      <div class="stage" id="stage"></div>
      <div class="bar">
        <label><input type="checkbox" id="walk" checked> เดิน</label>
        <label><input type="checkbox" id="talk"> คุย (ปากขยับ)</label>
        <label><input type="checkbox" id="blink" checked> กะพริบตา</label>
        <label><input type="checkbox" id="compare"> เทียบ PNG</label>
        <label>ซูม <input type="range" id="zoom" min="1" max="5" step="0.1" value="1"></label>
      </div>
    </section>
    <aside class="panel" id="panel" aria-label="แต่งตัว"></aside>
  </div>
  <div class="facts">
    <div class="fact"><b>ชิ้นใหม่ = วาดครั้งเดียว</b><span>ท่าเดิน กะพริบตา ปากขยับ มาจากกระดูก ไม่ต้องวาดทีละเฟรม</span></div>
    <div class="fact"><b>สีอะไรก็ได้ แม่นทุกชิ้น</b><span>แต่ละเส้นรู้ว่าตัวเองเป็นผม ผิว ชุด ตา หรือหมวก</span></div>
    <div class="fact"><b>คมทุกระดับซูม</b><span>เป็นเส้น vector ไม่ใช่จุดภาพ ลองเลื่อนซูมดู</span></div>
    <div class="fact"><b>ยังเป็นต้นแบบ</b><span>มีแค่มุมหน้า แขนขายังชิ้นเดียว (ท่านั่งต้องแยกเป็น 2 ท่อน)</span></div>
  </div>
</main>
<script>
const PIECES = __PIECES__;
const REF = "__REF__";
const PAL = __PAL__;

/* ── colour ── */
function hsl(hex) { const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return [h * 60, s, l]; }
function hex(h, s, l) { const c = (1 - Math.abs(2 * l - 1)) * s, hp = ((h % 360) + 360) % 360 / 60, x = c * (1 - Math.abs(hp % 2 - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x]; const m = l - c / 2;
  return "#" + [r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join(""); }
const clamp = (v) => Math.max(0, Math.min(1, v));
/** A shade of the base colour, moved to the target: same hue as the target, the same steps lighter or darker. */
function shift(fill, base, target, opts = {}) {
  const [, s, l] = hsl(fill), [, bs, bl] = hsl(base), [th, ts, tl] = hsl(target);
  const s2 = clamp(ts * (s / Math.max(.05, bs)));
  const l2 = opts.keepDark ? clamp(Math.min(l, tl)) : clamp(tl + (l - bl) * (tl < .3 ? .6 : 1));
  return hex(th, s2, l2);
}
const browOf = (hair) => { const [h, s, l] = hsl(hair); return hex(h, Math.min(1, s * .8), Math.min(l, .42) * .62); };

/* ── the rig: where each piece goes, in the reference picture's pixels ── */
// [x, y, scale]: the piece's top-left corner; face parts and hats by their centre (c: true).
const RIG = {
  cloak:     [279, 600, 1.25, true],
  hairBack:  [16, 150, 1.31],
  legL:      [147, 666, 1.25],
  legR:      [282, 666, 1.25],
  armL:      [73, 537, 1.08],
  armR:      [357, 537, 1.08],
  torso:     [100, 494, 1.08],
  head:      [57, 232, 1.31],
  blushL:    [188, 452, 1.1, true],
  blushR:    [366, 452, 1.1, true],
  eyeL:      [210, 404, 0.9, true],
  eyeR:      [339, 404, 0.9, true],
  browL:     [212, 352, 0.85, true],
  browR:     [343, 352, 0.85, true],
  mouth:     [276, 472, 0.8, true],
  hairFront: [104, 150, 1.31],
  hatChef:   [279, 196, 1.0, true],
  hatWizard: [279, 196, 1.15, true],
  hatBeret:  [270, 222, 1.02, true],
  crownFlower:[279, 262, 1.0, true],
};
// Joints the bones turn on.
const JOINT = { hipL: [208, 706], hipR: [342, 706], shoulderL: [135, 548], shoulderR: [400, 548], neck: [279, 540], hairTop: [279, 300] };

const S = { hair: PAL.hair[0], eye: PAL.eye[0], skin: PAL.skin[0], outfit: PAL.outfit[0], hat: PAL.hat[0],
  eyes: "Open", mouth: "Smile", brows: true, blush: true, hatKind: "none" };

/* ── building the SVG ── */
const NS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
function piece(name, at) {
  const P = PIECES[name], [x, y, s, c] = at;
  const g = el("g", { transform: c ? `translate(${x - P.w * s / 2} ${y - P.h * s / 2}) scale(${s})` : `translate(${x} ${y}) scale(${s})` });
  g.dataset.piece = name;
  for (const [d, f, grp, tx, ty] of P.p) {
    const p = el("path", { d, fill: f }); if (tx || ty) p.setAttribute("transform", `translate(${tx} ${ty})`);
    if (grp) { p.dataset.g = grp; p.dataset.f = f; p.dataset.base = P.base[grp]; }
    g.append(p);
  }
  return g;
}
const stage = document.getElementById("stage");
const svg = el("svg", { viewBox: "0 60 560 840", role: "img", "aria-label": "Lalafell แบบ vector" });
const root = el("g"), bone = {};
for (const b of ["cloak", "hairBack", "legL", "legR", "armL", "armR", "torso", "head"]) { bone[b] = el("g"); root.append(bone[b]); }
bone.cloak.append(piece("cloak", RIG.cloak));
bone.hairBack.append(piece("hairBack", RIG.hairBack));
bone.legL.append(piece("legL", RIG.legL)); bone.legR.append(piece("legR", RIG.legR));
bone.armL.append(piece("armL", RIG.armL)); bone.armR.append(piece("armR", RIG.armR));
bone.torso.append(piece("torso", RIG.torso));
const H = bone.head;
H.append(piece("head", RIG.head));
const blush = [piece("blushL", RIG.blushL), piece("blushR", RIG.blushR)]; blush.forEach((b) => H.append(b));
const eyes = {}; for (const k of ["Open", "Happy", "Closed"]) { eyes[k] = [piece(`eye${k}L`, RIG.eyeL), piece(`eye${k}R`, RIG.eyeR)]; eyes[k].forEach((e) => H.append(e)); }
const brows = [piece("browL", RIG.browL), piece("browR", RIG.browR)]; brows.forEach((b) => H.append(b));
const mouths = {}; for (const k of ["Smile", "Open", "Sad", "Grin"]) { mouths[k] = piece(`mouth${k}`, RIG.mouth); H.append(mouths[k]); }
H.append(piece("hairFront", RIG.hairFront));
const hats = {}; for (const k of ["hatChef", "hatWizard", "hatBeret", "crownFlower"]) { hats[k] = piece(k, RIG[k]); H.append(hats[k]); }
svg.append(root);

/* ── the two views: the doll, or the doll beside the PNG it came from ── */
const single = document.createElement("div"); single.style.cssText = "position:absolute;inset:0";
single.append(svg);
// The picture the pieces came from, in the doll's own coordinates (for lining the rig up).
const refOverlay = el("image", { href: REF, x: 0, y: 140, width: 512, height: 760, opacity: .45 });
refOverlay.style.display = "none";
svg.append(refOverlay);
stage.append(single);
const split = document.createElement("div"); split.className = "split"; split.hidden = true;
split.innerHTML = `<div><span class="tag">vector (SVG)</span></div><div><span class="tag">PNG ต้นฉบับ</span></div>`;
const rasterImg = document.createElement("img"); rasterImg.className = "raster"; rasterImg.src = REF; rasterImg.alt = "ภาพ PNG ต้นฉบับ";
split.children[1].append(rasterImg);
stage.append(split);

/* ── colours and choices ── */
function paint() {
  for (const p of svg.querySelectorAll("path[data-g]")) {
    const g = p.dataset.g, f = p.dataset.f, base = p.dataset.base;
    const target = g === "hair" ? S.hair : g === "skin" ? S.skin : g === "outfit" ? S.outfit : g === "iris" ? S.eye : g === "hat" ? S.hat : g === "brow" ? browOf(S.hair) : null;
    if (!target) continue;
    p.setAttribute("fill", g === "brow" ? shift(f, base, target, { keepDark: true }) : g === "iris" ? shift(f, base, darker(S.eye)) : shift(f, base, target));
  }
}
const darker = (c) => { const [h, s, l] = hsl(c); return hex(h, s, Math.min(l, .5) * .85); };
function show() {
  for (const [k, pair] of Object.entries(eyes)) pair.forEach((e) => e.style.display = k === eyesNow() ? "" : "none");
  brows.forEach((b) => b.style.display = S.brows ? "" : "none");
  blush.forEach((b) => b.style.display = S.blush ? "" : "none");
  for (const [k, m] of Object.entries(mouths)) m.style.display = k === mouthNow ? "" : "none";
  for (const [k, h] of Object.entries(hats)) h.style.display = k === S.hatKind ? "" : "none";
  bone.cloak.style.display = S.hatKind === "cloak" ? "" : "none";
}
let blinking = false, mouthNow = S.mouth;
const eyesNow = () => (blinking && S.eyes === "Open" ? "Closed" : S.eyes);

/* ── the panel ── */
const panel = document.getElementById("panel");
const group = (label, node) => { const d = document.createElement("div"); d.className = "g"; d.innerHTML = `<div class="gl">${label}</div>`; d.append(node); panel.append(d); };
const chips = (items, get, set) => { const w = document.createElement("div"); w.className = "chips"; w.setAttribute("role", "group");
  const btns = items.map(([v, t]) => { const b = document.createElement("button"); b.type = "button"; b.className = "chip"; b.textContent = t;
    b.onclick = () => { set(v); btns.forEach((x, i) => x.setAttribute("aria-pressed", String(items[i][0] === get()))); show(); paint(); }; b.setAttribute("aria-pressed", String(v === get())); return b; });
  w.append(...btns); return w; };
const swatches = (list, key, label) => { const w = document.createElement("div"); w.className = "chips"; w.setAttribute("role", "group"); w.setAttribute("aria-label", label);
  const btns = list.map((c) => { const b = document.createElement("button"); b.type = "button"; b.className = "sw"; b.style.background = c; b.setAttribute("aria-label", `${label} ${c}`);
    b.onclick = () => { S[key] = c; btns.forEach((x, i) => x.setAttribute("aria-pressed", String(list[i] === c))); paint(); }; b.setAttribute("aria-pressed", String(c === S[key])); return b; });
  w.append(...btns); return w; };
// Each thing to wear starts in its own colour; the swatches change it from there.
group("หมวก", chips([["none", "ไม่มี"], ["hatChef", "หมวกเชฟ"], ["hatWizard", "หมวกพ่อมด"], ["hatBeret", "เบเร่ต์"], ["crownFlower", "มงกุฎดอกไม้"], ["cloak", "ผ้าคลุมไหล่"]], () => S.hatKind,
  (v) => { S.hatKind = v; const own = PIECES[v]?.base?.hat; if (own) { S.hat = own; panel.querySelectorAll('[aria-label^="สีหมวก"]').forEach((b) => b.setAttribute("aria-pressed", "false")); } }));
group("สีหมวก / ผ้าคลุม", swatches(PAL.hat, "hat", "สีหมวก"));
group("ตา", chips([["Open", "ตาโต"], ["Happy", "ยิ้มหยี"], ["Closed", "หลับตา"]], () => S.eyes, (v) => S.eyes = v));
group("สีตา", swatches(PAL.eye, "eye", "สีตา"));
group("ปาก", chips([["Smile", "ยิ้ม"], ["Open", "อ้าปาก"], ["Sad", "เศร้า"], ["Grin", "ยิ้มกว้าง"]], () => S.mouth, (v) => { S.mouth = v; mouthNow = v; }));
group("คิ้ว · แก้มแดง", chips([["b1", "มีคิ้ว"], ["b0", "ไม่มีคิ้ว"]], () => (S.brows ? "b1" : "b0"), (v) => S.brows = v === "b1"));
group("สีผม", swatches(PAL.hair, "hair", "สีผม"));
group("สีผิว", swatches(PAL.skin, "skin", "สีผิว"));
group("สีชุด", swatches(PAL.outfit, "outfit", "สีชุด"));
const note = document.createElement("p"); note.className = "note";
note.textContent = "ชุดและหมวกทุกชิ้นใช้กระดูกชุดเดียวกัน ท่าเดินจึงได้ฟรีทุกชิ้น · ตอนนี้ยังมีแค่มุมหน้า";
panel.append(note);

/* ── the animation ── */
const $ = (id) => document.getElementById(id);
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) $("walk").checked = false;
let nextBlink = performance.now() + 2500;
const rot = (a, [x, y]) => `rotate(${a} ${x} ${y})`;
function frame(now) {
  const t = now / 1000, walk = $("walk").checked;
  const ph = t * Math.PI * 2 * 1.7;
  const bob = walk ? -Math.abs(Math.sin(ph)) * 7 : Math.sin(t * 2.2) * 1.5;
  root.setAttribute("transform", `translate(0 ${bob})`);
  const lift = (v) => (walk ? Math.max(0, v) * 12 : 0);
  bone.legL.setAttribute("transform", `translate(0 ${-lift(Math.sin(ph))}) ${rot(walk ? Math.sin(ph) * 5 : 0, JOINT.hipL)}`);
  bone.legR.setAttribute("transform", `translate(0 ${-lift(-Math.sin(ph))}) ${rot(walk ? -Math.sin(ph) * 5 : 0, JOINT.hipR)}`);
  bone.armL.setAttribute("transform", rot(walk ? -Math.sin(ph) * 9 : Math.sin(t * 2.2) * 1.5, JOINT.shoulderL));
  bone.armR.setAttribute("transform", rot(walk ? Math.sin(ph) * 9 : -Math.sin(t * 2.2) * 1.5, JOINT.shoulderR));
  const tilt = walk ? Math.sin(ph) * 2 : Math.sin(t * 1.1) * 1.2;
  bone.head.setAttribute("transform", rot(tilt, JOINT.neck));
  bone.hairBack.setAttribute("transform", `${rot(tilt, JOINT.neck)} ${rot(walk ? -Math.sin(ph - .7) * 2.5 : 0, JOINT.hairTop)}`);
  bone.cloak.setAttribute("transform", rot(walk ? -Math.sin(ph - .5) * 1.5 : 0, JOINT.neck));
  if ($("blink").checked && !reduce && now > nextBlink) { blinking = true; if (now > nextBlink + 130) { blinking = false; nextBlink = now + 2600 + Math.random() * 2600; } }
  else if (!$("blink").checked) blinking = false;
  mouthNow = $("talk").checked && !reduce ? (Math.floor(t * 7) % 2 ? "Open" : S.mouth) : S.mouth;
  show();
  requestAnimationFrame(frame);
}

/* ── zoom, and the side-by-side ── */
let saved = null;
function zoom() {
  const z = +$("zoom").value, cmp = $("compare").checked;
  // Side by side, the doll wears the picture's own look, so only sharpness differs.
  if (cmp && !saved) {
    saved = { ...S }; Object.assign(S, { hair: PAL.hair[0], eye: PAL.eye[0], skin: PAL.skin[0], outfit: PAL.outfit[0], eyes: "Open", mouth: "Smile", hatKind: "none", brows: true, blush: true });
    mouthNow = S.mouth; paint(); show();
  } else if (!cmp && saved) { Object.assign(S, saved); saved = null; mouthNow = S.mouth; paint(); show(); }
  single.hidden = cmp; split.hidden = !cmp;
  const cx = 279, cy = z > 1 ? 420 + 60 / z : 480, w = 560 / z, h = 840 / z;
  const vb = `${cx - w / 2} ${cy - h / 2} ${w} ${h}`;
  svg.setAttribute("viewBox", vb);
  if (cmp) {
    split.children[0].append(svg);
    // The PNG at the same zoom on the same spot: the reference picture is the source of the pieces.
    const box = split.children[1].getBoundingClientRect(), k = Math.min(box.width / w, box.height / h);
    rasterImg.style.width = `${512 * k}px`; rasterImg.style.height = `${760 * k}px`;
    rasterImg.style.transform = `translate(${-(cx - 0) * k}px, ${-(cy - 140) * k}px)`;
  } else single.append(svg);
}
$("zoom").oninput = zoom; $("compare").onchange = zoom; addEventListener("resize", zoom);
window.__vecRef = (on) => { refOverlay.style.display = on ? "" : "none"; };

paint(); show(); zoom(); requestAnimationFrame(frame);
</script>
"""
html = (html.replace("__PIECES__", json.dumps(data, separators=(",", ":")))
            .replace("__REF__", ref_url)
            .replace("__PAL__", json.dumps(PALETTES)))
open("vector-doll/vector-doll.html", "w", encoding="utf-8").write(html)
open("vector-doll/preview.html", "w", encoding="utf-8").write(
    '<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>' + html + "</body></html>")
print(f"page {len(html) / 1024:.0f} KB")
