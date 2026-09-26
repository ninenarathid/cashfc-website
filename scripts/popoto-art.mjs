// The popoto's poses, from the drawings to the files the site serves.
//
//   node scripts/popoto-art.mjs <folder>
//
// <folder> holds one drawing per pose, a PNG on a transparent background,
// named for the moment it is used:
//
//   popoto.png   the plain one: every button, counter and board
//   heart.png    holding a heart: the corner of a notification that one arrived
//   sleep.png    asleep: "sent today", until 07:00 lets you send another
//   fly.png      in the air, facing right: the throw
//   hug.png      landed, arms wide: the throw, on the face it hit
//
// Written to assets/popoto/, where components import them. An import rather
// than public/ so each file gets a hashed name and is cached for good: a
// browser that has seen a pose once never asks for it again, and a redrawn
// pose is a new name rather than a stale picture.
//
// The drawings come out of an image generator at whatever size and position it
// felt like — one potato a little larger, one a little to the left. Shown one
// at a time that would not matter, but these are swapped for each other in
// place, mid-throw, and a potato that grows or jumps sideways at the moment it
// lands looks like a different potato. So each pose is measured before it is
// placed:
//
//   the body   the largest solid shape in the drawing — the potato, not the
//              steam, the hearts or the sleep bubble beside it
//   its size   the body's area. Every pose is scaled so that area comes out the
//              same, which keeps a squashed potato (the hug) the same amount of
//              potato as a round one rather than the same width
//
// Then two sets, because they are placed for two different jobs:
//
//   icons      popoto, heart, sleep. Sit in a line of text, so each is centred
//              on the whole drawing, steam and all, on one shared canvas.
//   throw      fly, hug. Swapped in the air, so each is centred on its body:
//              the point the throw follows is the potato's middle, and the
//              steam trailing behind it is allowed to hang off to one side.
//
// The throw set also writes throw.json with where the body sits on the canvas,
// which is what components/ui/throwPotato.ts sizes the flying potato from.
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const from = process.argv[2];
if (!from) {
  console.error("usage: node scripts/popoto-art.mjs <folder with popoto.png, heart.png, sleep.png, fly.png, hug.png>");
  process.exit(1);
}
const OUT = "assets/popoto";

/** Icons are drawn at 13 to 24px; 96 is four times the largest. */
const ICON_PX = 96;
/** The throw is drawn at about 84px; 256 covers a 3x phone screen. */
const THROW_PX = 256;
/** Clear space around the drawing, as a share of the canvas on each side. */
const MARGIN = 0.03;

async function measure(pose) {
  const file = join(from, `${pose}.png`);
  const { data, info } = await sharp(file).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  // Everything visible, however faint: the box the drawing needs.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  // Solid enough to be part of the potato rather than its soft edge or glow.
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const a = data[i * 4 + 3];
    if (a > 8) {
      const x = i % w, y = (i / w) | 0;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    if (a >= 128) solid[i] = 1;
  }

  // The body: the largest connected solid shape, found by flooding each one.
  const seen = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let body = { n: 0, sx: 0, sy: 0, bx0: 0, bx1: 0, by0: 0, by1: 0 };
  for (let i = 0; i < w * h; i++) {
    if (!solid[i] || seen[i]) continue;
    let head = 0, tail = 0;
    const s = { n: 0, sx: 0, sy: 0, bx0: w, bx1: -1, by0: h, by1: -1 };
    seen[i] = 1;
    queue[tail++] = i;
    while (head < tail) {
      const p = queue[head++];
      const x = p % w, y = (p / w) | 0;
      s.n++; s.sx += x; s.sy += y;
      if (x < s.bx0) s.bx0 = x;
      if (x > s.bx1) s.bx1 = x;
      if (y < s.by0) s.by0 = y;
      if (y > s.by1) s.by1 = y;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1,
                       y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && solid[q] && !seen[q]) { seen[q] = 1; queue[tail++] = q; }
      }
    }
    if (s.n > body.n) body = s;
  }

  return {
    pose, file,
    box: { x0, y0, x1, y1 },
    area: body.n,
    cx: body.sx / body.n,
    cy: body.sy / body.n,
    bodyW: body.bx1 - body.bx0 + 1,
    bodyH: body.by1 - body.by0 + 1,
  };
}

/**
 * Draw one pose onto a square canvas.
 *
 * `k` scales the drawing to the shared body size, in canvas units per source
 * pixel. `(ax, ay)` is the source point that lands at `(tx, ty)` on a canvas
 * `side` units across, which is drawn `px` pixels across.
 */
async function place(m, k, side, ax, ay, tx, ty, px) {
  const s = px / side;
  const { x0, y0, x1, y1 } = m.box;
  const w = Math.max(1, Math.round((x1 - x0 + 1) * k * s));
  const h = Math.max(1, Math.round((y1 - y0 + 1) * k * s));
  const left = Math.round((tx + (x0 - ax) * k) * s);
  const top = Math.round((ty + (y0 - ay) * k) * s);
  if (left < 0 || top < 0 || left + w > px || top + h > px) {
    throw new Error(`${m.pose}: does not fit the canvas (${left},${top} ${w}x${h} on ${px})`);
  }
  const cut = await sharp(m.file)
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(w, h, { kernel: "lanczos3" })
    .png().toBuffer();
  return sharp({ create: { width: px, height: px, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: cut, left, top }])
    .png().toBuffer();
}

const webp = (buf) => sharp(buf).webp({ quality: 90, alphaQuality: 100, effort: 6, smartSubsample: true }).toBuffer();

const ICONS = ["popoto", "heart", "sleep"];
const THROW = ["fly", "hug"];
const m = Object.fromEntries(await Promise.all(
  [...ICONS, ...THROW].map(async (p) => [p, await measure(p)])));
// Everything is scaled to the plain popoto's body.
const k = (p) => Math.sqrt(m.popoto.area / m[p].area);

mkdirSync(OUT, { recursive: true });
const wrote = [];
const save = (name, buf) => {
  writeFileSync(join(OUT, name), buf);
  wrote.push(`${name} ${(buf.length / 1024).toFixed(1)} KB`);
};

// Icons: centred on the whole drawing, on a canvas that fits the largest.
const fit = Math.max(...ICONS.map((p) => {
  const { x0, y0, x1, y1 } = m[p].box;
  return Math.max(x1 - x0 + 1, y1 - y0 + 1) * k(p);
}));
const iconSide = fit / (1 - 2 * MARGIN);
for (const p of ICONS) {
  const { x0, y0, x1, y1 } = m[p].box;
  const png = await place(m[p], k(p), iconSide, (x0 + x1) / 2, (y0 + y1) / 2,
                          iconSide / 2, iconSide / 2, ICON_PX);
  save(`${p}.webp`, await webp(png));
  // The link-preview card is drawn by Satori, which is safest given a PNG.
  if (p === "popoto") {
    const small = await place(m[p], k(p), iconSide, (x0 + x1) / 2, (y0 + y1) / 2,
                              iconSide / 2, iconSide / 2, 64);
    save("popoto-og.png", await sharp(small).png({ palette: true, quality: 90, effort: 10 }).toBuffer());
  }
}

// Throw: centred on the body, on a canvas that reaches the furthest part of
// either pose from its body's middle.
const reach = Math.max(...THROW.map((p) => {
  const { x0, y0, x1, y1 } = m[p].box;
  const { cx, cy } = m[p];
  return Math.max(cx - x0, x1 - cx, cy - y0, y1 - cy) * k(p);
}));
const throwSide = (2 * reach) / (1 - 2 * MARGIN);
for (const p of THROW) {
  const png = await place(m[p], k(p), throwSide, m[p].cx, m[p].cy,
                          throwSide / 2, throwSide / 2, THROW_PX);
  save(`${p}.webp`, await webp(png));
}

// How big the potato itself is on each canvas, so the code can size the flying
// one to match the icon it came from.
const share = (side, p) => ({
  w: +((m[p].bodyW * k(p)) / side).toFixed(4),
  h: +((m[p].bodyH * k(p)) / side).toFixed(4),
});
const geometry = {
  note: "Written by scripts/popoto-art.mjs. The body's size as a share of each canvas.",
  icon: share(iconSide, "popoto"),
  fly: share(throwSide, "fly"),
  hug: share(throwSide, "hug"),
};
save("throw.json", Buffer.from(JSON.stringify(geometry, null, 2) + "\n"));

console.log(wrote.join("\n"));
console.log(JSON.stringify(geometry));
