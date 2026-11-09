// The cloud ram's flock (the owner, 2026-11-09: "แกะของเจ้าของตัวใหญ่ขึ้น คนที่มาขี่ ได้นั่งแกะตัวเล็กๆ พอมีคนนั่งเยอะๆ มันจะเป็นฝูงแกะ
// น่ารักๆ" and "บางคน สุ่ม จะได้นั่งบนก้อนเมฆแกะ เหมือนเป็นเวทมนของแกะวิเศษ"): the pieces for build-scenery.mjs --set flock, read
// from the specials previews' kit (round 3: docs/plans/specials/kit/, every frame cut at its native pixels, kit.json, and
// docs/plans/specials/previews/flock-seats.json beside it), as lib/town/flock-art.ts names them:
//
//   fl_big_<SE|NE>_stand, fl_big_<SE|NE>_walk_<0-5>            the owner's big ram, its standing and its six-step walk
//   fl_lamb_<w|c|p>_<SE|NE>_stand, _walk_<0-5>, _graze          a passenger's lamb in white, cream or pink
//   fl_cloud_<SE|NE>_<0-5>                                       the magic ram's spell: a floating sheep-shaped cloud
//   fl_pop_<SE|NE>_<out|in>_<0-5>                                a lamb puffing out of the big ram's fleece, and back
//   <a front view's frame>_head                                  its head, drawn again over its rider (the legs go behind it)
//   fl_full                                                      the full flock's icon, for the control that cannot be pressed
//
// Each piece stands on the kit's anchor (its feet on the ground point: the body bobs as the legs reach) and its `seat`
// (the json's) is where the rider's hips go against that point, in its own pixels: from flock-seats.json, else kit.json.
// The cloud as drawn floats 35 to 65 of its pixels over the ground; the seats' `lift` (a gap of 12 and a quarter of its
// drawn bob) is what it is stood at.
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1"), "..", "..", "..", "..", "..");
export const KIT = path.join(ROOT, "docs", "plans", "specials", "kit");
export const SEATS = path.join(ROOT, "docs", "plans", "specials", "previews", "flock-seats.json");
const COLOUR = { white: "w", cream: "c", pink: "p" };
const STEP = (k) => (k === "stand" ? "stand" : k === "graze" ? "graze" : /^w(\d)$/.test(k) ? `walk_${Number(k.slice(1)) - 1}` : null);

/** A kit's set and frame as the piece's name. */
function nameOf(set, frame) {
  let m;
  if ((m = /^bigram-(SE|NE)$/.exec(set))) return STEP(frame) && `fl_big_${m[1]}_${STEP(frame)}`;
  if ((m = /^lamb-(SE|NE)-(white|cream|pink)$/.exec(set))) return STEP(frame) && `fl_lamb_${COLOUR[m[2]]}_${m[1]}_${STEP(frame)}`;
  if ((m = /^cloud-(SE|NE)$/.exec(set))) return /^f[1-6]$/.test(frame) ? `fl_cloud_${m[1]}_${Number(frame.slice(1)) - 1}` : null;
  if ((m = /^pop(out|in)-(SE|NE)$/.exec(set))) return /^f[1-6]$/.test(frame) ? `fl_pop_${m[2]}_${m[1]}_${Number(frame.slice(1)) - 1}` : null;
  return null;
}
async function rgba(file) {
  const { data, info } = await L.sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // (every pixel solid or clear, as the kit's are)
  const buf = Buffer.from(data);
  for (let i = 3; i < buf.length; i += 4) buf[i] = buf[i] >= 128 ? 255 : 0;
  return { buf, w: info.width, h: info.height };
}

/** The flock's pieces, from the kit's folder and its seats. */
export async function flockPieces(dir = KIT, seatsFile = SEATS) {
  const kit = JSON.parse(fs.readFileSync(path.join(dir, "kit.json"), "utf8"));
  const seats = fs.existsSync(seatsFile) ? JSON.parse(fs.readFileSync(seatsFile, "utf8")) : { mounts: {} };
  const pieces = [];
  for (const [set, frames] of Object.entries(kit.sets)) for (const [frame, f] of Object.entries(frames)) {
    const name = nameOf(set, frame);
    if (!name) { console.log(`flock: ${set} ${frame} is no piece of the game's`); continue; }
    const told = seats.mounts?.[set]?.[frame] ?? {}, anchor = told.anchor ?? f.anchor, seat = told.seat ?? f.seat;
    let [ax, ay] = anchor;
    // (the cloud: stood at the seats' lift, not as high as it was drawn)
    const liftDrawn = told.liftDrawn ?? f.lift, lift = told.lift;
    if (typeof liftDrawn === "number" && typeof lift === "number") ay -= liftDrawn - lift;
    const img = await rgba(path.join(dir, f.file));
    pieces.push({ name, img, ax, ay, ...(seat ? { seat: [seat[0] - ax, seat[1] - ay] } : {}) });
    if (f.head) pieces.push({ name: `${name}_head`, img: await rgba(path.join(dir, f.head)), ax, ay });
  }
  // the full flock's icon (the kit's icons/: drawn for the build); stood on its middle
  const icon = path.join(dir, "icons", "flockFull.png");
  if (fs.existsSync(icon)) { const img = await rgba(icon); pieces.push({ name: "fl_full", img, ax: Math.round(img.w / 2), ay: img.h - 1 }); }
  return pieces;
}
