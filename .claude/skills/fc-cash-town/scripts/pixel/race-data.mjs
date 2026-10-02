// lib/town/races.json: what the site needs to know about each race besides the Lalafell, from the
// research (races/<race>.json) and what has been built (public/town/pixel-<race>.json).
//
//   node race-data.mjs [race ...] [--open race,race]    (no list: every race with research)
//
// A race opens only when its picture exists with both genders and --open names it (so a race can
// be built and looked at before members can pick it). Its hairstyles are the built ones, in the
// creator's order; its skins are the research's swatches.
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const SITE = "E:/NinenineProject/fcnext";
const OUTFILE = path.join(SITE, "lib", "town", "races.json");
const openAt = process.argv.indexOf("--open");
const OPEN = new Set(openAt > 0 ? process.argv[openAt + 1].split(",") : []);
const names = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--open");
const ids = names.length ? names : fs.readdirSync(path.join(HERE, "races")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));

const current = fs.existsSync(OUTFILE) ? JSON.parse(fs.readFileSync(OUTFILE, "utf8")) : [];
const byId = new Map(current.map((r) => [r.id, r]));
for (const id of ids) {
  const R = JSON.parse(fs.readFileSync(path.join(HERE, "races", `${id}.json`), "utf8"));
  const atlasFile = path.join(SITE, "public", "town", `pixel-${id}.json`);
  const atlas = fs.existsSync(atlasFile) ? JSON.parse(fs.readFileSync(atlasFile, "utf8")) : null;
  const built = new Set(atlas?.hairs ?? []);
  const hairs = ["f", "m"].flatMap((g, gi) => (R.hairs[g] ?? [])
    .filter((h) => !atlas || built.has(h.id))
    .map((h) => ({ g: gi, id: h.id, th: h.th || h.en, en: h.en })));
  const skins = (R.skins.f ?? R.skins.m).slice(0, 8).map((s) => ({ hex: s.hex, th: s.th || s.en, en: s.en }));
  const bothGenders = !!atlas?.walk?.f && !!atlas?.walk?.m;
  const open = OPEN.has(id) && bothGenders && hairs.some((h) => h.g === 0) && hairs.some((h) => h.g === 1);
  if (OPEN.has(id) && !open) console.log(`${id}: not opened (picture ${atlas ? "without both genders or hairstyles" : "not built"})`);
  // the game's own heights against the Lalafell's (the owner, 2026-10-02: "scale ตามเกมเหมือนเดิม ตามที่ดีไซน์");
  // the town fits them to the map by drawing the Lalafell small (lib/town/pixeldoll LALAFELL_SIZE)
  const height = Object.fromEntries(["f", "m"].map((g) => [g, +(R.height?.[g]?.scale ?? 1).toFixed(3)]));
  byId.set(id, { id, open: open || (!!byId.get(id)?.open && bothGenders), hairs, skins, height });
  console.log(`${id}: ${hairs.filter((h) => h.g === 0).length} + ${hairs.filter((h) => h.g === 1).length} hairstyles, ${skins.length} skins, ${byId.get(id).open ? "OPEN" : "closed"}`);
}
fs.writeFileSync(OUTFILE, JSON.stringify([...byId.values()], null, 1) + "\n");
console.log(`wrote ${path.relative(SITE, OUTFILE)}`);
