// Compact check sheets: the source diagram (local copy) beside our picture, 12 pairs a sheet, labelled by step.
// usage: node cmp.cjs [from-step] [to-step]
const sharp = require("sharp"), fs = require("fs");
const d = JSON.parse(fs.readFileSync("scripts/guides/data/ucob.json", "utf8"));
const W = "scripts/guides/.work/ucob/";
const [a = 0, b = 999] = process.argv.slice(2).map(Number);
const pairs = [];
d.steps.forEach((s, i) => { if (s.scene && s.game8 && i >= a && i <= b) pairs.push({ i, src: W + "dl/img/" + s.game8[0].split("/ucob/")[1].replace("/", "_"), ours: `public/guides/preview/ucob/${String(i).padStart(2, "0")}.webp`, name: s.en.name }); });
(async () => {
  const S = 300, per = 12, cols = 3, PW = S * 2 + 8, PH = S + 20;
  fs.mkdirSync(W + "cmp", { recursive: true });
  for (let k = 0; k * per < pairs.length; k++) {
    const chunk = pairs.slice(k * per, (k + 1) * per), comp = [];
    for (const [j, p] of chunk.entries()) {
      const x = (j % cols) * (PW + 12), y = Math.floor(j / cols) * (PH + 6);
      comp.push({ input: Buffer.from(`<svg width="${PW}" height="20"><rect width="100%" height="100%" fill="#000"/><text x="3" y="15" fill="#ffd23f" font-size="13" font-family="Arial">${p.i} ${p.name.replace(/[&<>]/g, "").slice(0, 70)}</text></svg>`), left: x, top: y });
      comp.push({ input: await sharp(p.src).resize(S, S).toBuffer(), left: x, top: y + 20 });
      comp.push({ input: await sharp(p.ours).resize(S, S).toBuffer(), left: x + S + 8, top: y + 20 });
    }
    const out = W + `cmp/c${String(k + 1).padStart(2, "0")}.png`;
    await sharp({ create: { width: cols * (PW + 12), height: Math.ceil(chunk.length / cols) * (PH + 6), channels: 3, background: "#333" } }).composite(comp).png().toFile(out);
    console.log(out, chunk[0].i, chunk[chunk.length - 1].i);
  }
})();
