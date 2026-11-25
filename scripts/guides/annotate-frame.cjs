// A footage picture readers understand without the video: a wide crop that
// keeps the arena, every bit of Japanese text blurred away, and our own
// marks (a ring or arrow and a short Thai label) on what to watch.
// usage: node annotate-frame.cjs <spec.json>
// spec: { src, out, crop: [x,y,w,h], blur: [[x,y,w,h],...] (in crop coords),
//         marks: [{ t: "ring", at: [x,y], r } | { t: "arrow", from: [x,y], to: [x,y] }
//                 | { t: "label", at: [x,y], lines: ["…"], anchor?: "start"|"middle" }],
//         width: 1000 }
const fs = require("fs");
const sharp = require("sharp");
const spec = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const GOLD = "#ffd23f";
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

(async () => {
  const [cx, cy, cw, ch] = spec.crop;
  let img = await sharp(spec.src).extract({ left: cx, top: cy, width: cw, height: ch }).toBuffer();
  // Blur: pixelate then blur hard, so no stroke of a letter is left.
  const comps = [];
  for (const [x, y, w, h] of spec.blur ?? []) {
    const X = Math.max(0, x), Y = Math.max(0, y), W = Math.min(w, cw - X), H = Math.min(h, ch - Y);
    const piece = await sharp(img).extract({ left: X, top: Y, width: W, height: H })
      .resize(Math.max(1, Math.round(W / 8)), Math.max(1, Math.round(H / 8)), { kernel: "nearest" })
      .resize(W, H, { kernel: "nearest" }).blur(8).toBuffer();
    comps.push({ input: piece, left: X, top: Y });
  }
  if (comps.length) img = await sharp(img).composite(comps).toBuffer();

  // Our marks, drawn at the crop's own scale.
  const parts = [];
  for (const m of spec.marks ?? []) {
    if (m.t === "ring") {
      parts.push(`<circle cx="${m.at[0]}" cy="${m.at[1]}" r="${m.r}" fill="none" stroke="#000" stroke-opacity="0.55" stroke-width="11"/>`);
      parts.push(`<circle cx="${m.at[0]}" cy="${m.at[1]}" r="${m.r}" fill="none" stroke="${GOLD}" stroke-width="6"/>`);
    } else if (m.t === "arrow") {
      const [x1, y1] = m.from, [x2, y2] = m.to;
      const a = Math.atan2(y2 - y1, x2 - x1), L = 26;
      const h1 = [x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45)], h2 = [x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)];
      for (const [c, w] of [["#000", 13], [GOLD, 7]]) {
        parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c}" stroke-opacity="${c === "#000" ? 0.55 : 1}" stroke-width="${w}" stroke-linecap="round"/>`);
        parts.push(`<polyline points="${h1.join(",")} ${x2},${y2} ${h2.join(",")}" fill="none" stroke="${c}" stroke-opacity="${c === "#000" ? 0.55 : 1}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`);
      }
    } else if (m.t === "label") {
      const size = m.size ?? 34, lh = Math.round(size * 1.3), pad = 14;
      // The box fits the text as drawn (Thai vowel and tone marks take no width).
      const drawn = async (l) => (await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${l.length * size + 40}" height="${size * 2}"><text x="20" y="${size * 1.4}" font-family="Leelawadee UI, Tahoma, Arial" font-size="${size}" font-weight="700" fill="#fff">${esc(l)}</text></svg>`)).trim().toBuffer({ resolveWithObject: true })).info.width;
      const width = Math.max(...(await Promise.all(m.lines.map(drawn)))) + pad * 2;
      const height = m.lines.length * lh + pad * 1.4;
      const anchor = m.anchor ?? "start";
      const x0 = anchor === "middle" ? m.at[0] - width / 2 : m.at[0];
      parts.push(`<rect x="${x0}" y="${m.at[1]}" width="${width}" height="${height}" rx="12" fill="#101216" fill-opacity="0.82" stroke="${GOLD}" stroke-width="3"/>`);
      m.lines.forEach((l, i) => parts.push(
        `<text x="${x0 + pad}" y="${m.at[1] + pad * 0.7 + (i + 1) * lh - size * 0.28}" font-family="Leelawadee UI, Tahoma, Arial" font-size="${size}" font-weight="700" fill="${i === 0 ? GOLD : "#ffffff"}">${esc(l)}</text>`));
    }
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${cw}" height="${ch}">${parts.join("")}</svg>`);
  // sharp resizes before it composites, so mark first, then scale.
  const marked = await sharp(img).composite([{ input: svg, left: 0, top: 0 }]).png().toBuffer();
  await sharp(marked).resize(spec.width ?? 1000).webp({ quality: 86 }).toFile(spec.out);
  console.log("written", spec.out);
})();
