// Granny Twilla's shop, everything new in it on the built dolls, for the owner to look over (2026-10-25: "ขอดูภาพทรงผม
// ทั้งหมดแล้วก็ไอเทมทั้งหมดที่อัปเดตขึ้นมาหน่อย"): the eight hairstyles in two hair colours, the shop's outfits on a man and
// a woman standing and sitting, every hat, face, neck and hair thing front and back, and the auction's two sets whole.
// Laid as wear-look.mjs lays them (lib/town/pixeldoll's order), the hair recoloured as the game does (paintKeys), each
// card named with its price.
//   cd <tree> && FC_REPO=<tree> DIR=<tree>/public/town node .claude/skills/fc-cash-town/scripts/pixel/checks/shop-gallery.mjs <outdir>
import fs from "node:fs";
import * as L from "../pxlib.mjs";
await import("../../db/repo-ts-town.mjs");
const { OUTFITS, HATS, FACE_WEAR, NECK_WEAR, HAIR_WEAR } = await import("@/lib/town/wear");
const { TAILOR } = await import("@/lib/town/tailor");
const { HAIRS } = await import("@/lib/town/look");
const DIR = process.env.DIR ?? "E:/NinenineProject/fcnext/public/town";
const OUT = process.argv[2] ?? "work/shop-gallery";
fs.mkdirSync(OUT, { recursive: true });
const j = JSON.parse(fs.readFileSync(`${DIR}/pixel.json`, "utf8"));
const pics = { "": { data: (await L.loadRaw(`${DIR}/${j.image}`)).data, W: j.size[0] } };
for (const [g, s] of Object.entries(j.sheets ?? {})) pics[g] = { data: (await L.loadRaw(`${DIR}/${s.image}`)).data, W: s.size[0] };
const CW = 70, CH = 92, S = 3, LABEL = 64, GAP = 14, PAD = 18;

// ── the hair's colour, as lib/town/pixeldoll's paintKeys moves the art's green ──
const hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const rgb = (h, s, l) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = (((h % 360) + 360) % 360) / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
};
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const isHair = ([h, s, l]) => h >= 70 && h <= 170 && s > 0.2 && l > 0.08;
function paintHair(px, hex) {
  const hits = px.filter((p) => isHair(hsl(p.c[0], p.c[1], p.c[2])));
  if (!hits.length) return;
  const cs = hits.map((p) => hsl(p.c[0], p.c[1], p.c[2])), sb = median(cs.map((c) => c[1])), lb = median(cs.map((c) => c[2]));
  const n = parseInt(hex.slice(1), 16), [ht, st, lt] = hsl((n >> 16) & 255, (n >> 8) & 255, n & 255);
  hits.forEach((p, k) => {
    const [, s, l] = cs[k];
    const s2 = Math.max(0, Math.min(1, st * (s / Math.max(0.05, sb)))), l2 = Math.max(0.03, Math.min(0.97, lt + (l - lb) * (lt < 0.3 ? 0.6 : 1)));
    p.c = [...rgb(ht, s2, l2), p.c[3]];
  });
}

/** One doll in a cell of its own (raw RGBA, CW x CH). */
function doll(cell) {
  const out = Buffer.alloc(CW * CH * 4);
  const gg = cell.hair[0] === "m" ? "m" : "f", view = cell.view ?? "front", O = cell.outfit ? j.outfits[cell.outfit] : null;
  let step = (O?.walk ?? j.walk[gg])[view][1];
  if (cell.pose === "sit") step = (O?.sit ?? j.sit[gg])[view];
  const pieceOf = (name, dx, dy, keep = () => true) => {
    const f = j.frames[name]; if (!f) return [];
    const [x, y, w, h, ox, oy, g] = f, { data, W } = pics[g ?? ""], px = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      const si = ((y + r) * W + x + c) * 4; if (!data[si + 3] || !keep(ox + c, oy + r)) continue;
      px.push({ X: dx + ox + c, Y: dy + oy + r, c: [data[si], data[si + 1], data[si + 2], data[si + 3]] });
    }
    return px;
  };
  const put = (px) => { for (const p of px) if (p.X >= 0 && p.Y >= 0 && p.X < CW && p.Y < CH) { const o = (p.Y * CW + p.X) * 4; out[o] = p.c[0]; out[o + 1] = p.c[1]; out[o + 2] = p.c[2]; out[o + 3] = p.c[3]; } };
  const ax = CW / 2, ay = CH - 6;
  put(pieceOf(step.body, ax, ay));
  const hx = ax + step.hx, hy = ay + step.hy;
  const worn = (slot, id) => (id ? j.wear?.[slot]?.[id]?.[view] : null);
  put(pieceOf(worn("neck", cell.neck), hx, hy));
  put(pieceOf(view === "front" ? j.face[gg].round : j.face.back, hx, hy));
  const clip = cell.hat ? j.wear.hat[cell.hat]?.clip?.[view] : null;
  const under = clip ? (x, y) => y > clip.ys[Math.min(clip.ys.length - 1, Math.max(0, x - clip.x0))] : () => true;
  if (j.hair[cell.hair]?.[view]) { const h = pieceOf(j.hair[cell.hair][view], hx, hy, under); paintHair(h, cell.color ?? "#3a2b28"); put(h); }
  put(pieceOf(worn("face", cell.face), hx, hy));
  put(pieceOf(worn("hair", cell.hairWear), hx, hy));
  put(pieceOf(worn("hat", cell.hat), hx, hy));
  return out;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const fmt = (n) => n.toLocaleString("en-US");
/** A sheet: a title, then cards (a name, a line under it, a row of cells each with a small word), so many to a row. */
async function sheet(file, title, cards, cols) {
  const cw = Math.max(...cards.map((c) => c.cells.length)) * CW * S, ch = LABEL + CH * S + 26;
  const W = PAD * 2 + cols * cw + (cols - 1) * GAP, H = 70 + PAD + Math.ceil(cards.length / cols) * (ch + GAP);
  const comp = [];
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><style>text{font-family:'Leelawadee UI','Tahoma',sans-serif}</style>`;
  svg += `<text x="${PAD}" y="46" font-size="34" font-weight="700" fill="#f3efe6">${esc(title)}</text>`;
  cards.forEach((card, i) => {
    const x = PAD + (i % cols) * (cw + GAP), y = 70 + Math.floor(i / cols) * (ch + GAP);
    svg += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="14" fill="${card.limited ? "#241b35" : "#1d2433"}" stroke="${card.limited ? "#6b55a0" : "#2f3a50"}"/>`;
    svg += `<text x="${x + 14}" y="${y + 30}" font-size="24" font-weight="700" fill="#f3efe6">${esc(card.name)}</text>`;
    svg += `<text x="${x + 14}" y="${y + 54}" font-size="18" fill="${card.limited ? "#d8b4ff" : "#e8c071"}">${esc(card.sub)}</text>`;
    card.cells.forEach((cell, k) => {
      comp.push({ cell, left: x + k * CW * S, top: y + LABEL });
      if (cell.word) svg += `<text x="${x + k * CW * S + (CW * S) / 2}" y="${y + LABEL + CH * S + 16}" font-size="16" fill="#9aa4b8" text-anchor="middle">${esc(cell.word)}</text>`;
    });
  });
  svg += "</svg>";
  const layers = [{ input: Buffer.from(svg), left: 0, top: 0 }];
  for (const { cell, left, top } of comp) {
    const png = await L.sharp(doll(cell), { raw: { width: CW, height: CH, channels: 4 } }).resize(CW * S, CH * S, { kernel: "nearest" }).png().toBuffer();
    layers.push({ input: png, left, top });
  }
  await L.sharp({ create: { width: W, height: H, channels: 4, background: "#121722" } }).composite(layers).png().toFile(`${OUT}/${file}`);
  console.log(`${OUT}/${file}`, `${W}x${H}`, cards.length);
}

const price = (id) => (TAILOR[id] ? `${fmt(TAILOR[id].price)} เหรียญ${TAILOR[id].season ? " · ฮาโลวีน (ขายเฉพาะช่วงเทศกาล)" : ""}` : "");
const isNew = (w) => w.from && ("tailor" in w.from || "auction" in w.from);
const auction = (w) => !!(w.from && "auction" in w.from);
const F = "f05", M = "m03";

// 1. the eight hairstyles, each in two colours
const hairs = HAIRS.filter((h) => h.sold);
await sheet("1-hairstyles.png", "ทรงผมใหม่ 8 ทรง (ร้านยายทวิลล่า) · ซ้าย 3 ช่อง น้ำตาลเข้ม · ขวา 2 ช่อง บลอนด์ทอง", hairs.map((h) => ({
  name: `${h.th} (${h.g ? "ชาย" : "หญิง"})`, sub: price(h.sold),
  cells: [
    { hair: h.id, view: "front", color: "#3a2b28", word: "หน้า" }, { hair: h.id, view: "back", color: "#3a2b28", word: "หลัง" },
    { hair: h.id, view: "front", pose: "sit", color: "#3a2b28", word: "นั่ง" },
    { hair: h.id, view: "front", color: "#e8c071", word: "หน้า" }, { hair: h.id, view: "back", color: "#e8c071", word: "หลัง" },
  ],
})), 2);

// 2. the shop's outfits on a man and a woman
const outfits = OUTFITS.filter((o) => isNew(o) && !auction(o));
await sheet("2-outfits.png", `ชุดใหม่ ${outfits.length} ชุด · ชาย (หน้า หลัง นั่ง) · หญิง (หน้า หลัง นั่ง)`, outfits.map((o) => ({
  name: o.th, sub: price(o.id),
  cells: [
    { hair: M, outfit: o.id, view: "front", word: "ชาย" }, { hair: M, outfit: o.id, view: "back", word: "หลัง" }, { hair: M, outfit: o.id, pose: "sit", word: "นั่ง" },
    { hair: F, outfit: `${o.id}_f` in j.outfits ? `${o.id}_f` : o.id, view: "front", word: "หญิง" },
    { hair: F, outfit: `${o.id}_f` in j.outfits ? `${o.id}_f` : o.id, view: "back", word: "หลัง" },
    { hair: F, outfit: `${o.id}_f` in j.outfits ? `${o.id}_f` : o.id, pose: "sit", word: "นั่ง" },
  ],
})), 2);

// 3–4. the head's things and the neck's, front and back on a woman, front on a man
const things = (slot, list) => list.filter((w) => isNew(w) && !auction(w)).map((w) => ({
  name: w.th, sub: price(w.id),
  cells: [{ hair: F, view: "front", [slot]: w.id, word: "หญิง" }, { hair: F, view: "back", [slot]: w.id, word: "หลัง" }, { hair: M, view: "front", [slot]: w.id, word: "ชาย" }],
}));
const hats = things("hat", HATS), face = things("face", FACE_WEAR), neck = things("neck", NECK_WEAR), hw = things("hairWear", HAIR_WEAR);
await sheet("3-hats-glasses.png", `หมวก ${hats.length} · แว่นตา/หน้ากาก ${face.length}`, [...hats, ...face], 4);
await sheet("4-neck-hair.png", `ที่คอ ${neck.length} · ที่ผม ${hw.length}`, [...neck, ...hw], 4);

// 5. the auction's two sets, whole, as a woman and a man wear them (a woman the hair thing, a man the hat)
const SETS = [["count", "ชุดเคานต์ค้างคาวรัตติกาล", ["counthat", "batmask", "rosefascinator"]], ["pumpkin", "ชุดราชาฟักทองไฟผี", ["pumpkincrown", "pumpkinglasses", "pumpkinhead"]]];
const pieceName = (id) => [...HATS, ...FACE_WEAR, ...HAIR_WEAR].find((w) => w.id === id)?.th ?? id;
const setCells = (outfit, pieces, hair) => {
  const slotOf = (id) => (HATS.some((w) => w.id === id) ? "hat" : FACE_WEAR.some((w) => w.id === id) ? "face" : "hairWear");
  const top = (id) => !!HAIR_WEAR.find((w) => w.id === id)?.top;
  const c = { hair };
  for (const id of pieces) { const s = slotOf(id); if (hair[0] === "f" ? s !== "hat" : !(s === "hairWear" && top(id))) c[s] = id; }
  return ["front", "back"].map((view) => ({ ...c, outfit, view, word: view === "front" ? "หน้า" : "หลัง" })).concat([{ ...c, outfit, pose: "sit", word: "นั่ง" }]);
};
await sheet("5-auction-sets.png", "ชุดประมูลลิมิเต็ด 2 แบบ (รอบละ 3 ชุด) · ผู้หญิงใส่ของติดผม ผู้ชายใส่หมวก", SETS.flatMap(([id, th, pieces]) => [
  { name: `${th} · ชาย`, sub: `+ ${pieces.map(pieceName).join(" · ")}`, limited: true, cells: setCells(id, pieces, M) },
  { name: `${th} · หญิง`, sub: "LIMITED · เริ่มประมูล 8,000", limited: true, cells: setCells(`${id}_f`, pieces, F) },
]), 2);
