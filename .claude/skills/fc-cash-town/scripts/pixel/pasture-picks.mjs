// Which PixelLab picture is which frame of each pasture animal: writes prompts/pixellab/pasture/picks.json, which
// pasture-frames.mjs (build-scenery.mjs --set pasture) reads. README "The pasture".
//
//   node pasture-picks.mjs
//
// - idle is the base (pasture-base.mjs); the walk is frame 1 of the walk's animation and the base in turn (frames 2 to 4
//   turn the animal toward the viewer, as the trial showed); eat, sleep and swim are the pro-flash edits.
// - happy is the first frame of the happy hop that stands on the ground (a frame in the air, held while the animal is
//   petted or gathered by the bell, would float), else frame 1.
// - k: the sheet's grid over its kind's first sheet's (a sheet cut finer drew its animal in more pixels), times a share
//   for a young one the model drew too large beside the grown ones (ART-NEEDED: a baby about 0.55 of a grown one, a
//   young one about 0.74), measured on the bases.
// - OVERRIDE below: a frame looked at and chosen by eye.
import fs from "node:fs";
import path from "node:path";
import * as L from "./pxlib.mjs";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const WORK = path.join(HERE, "work");
const KIND = {
  chicken: ["barnHen", "silkie", "araucana", "marans", "lanternHen", "cloudHen", "goldenHen", "pocketPhoenix"],
  duck: ["puddleDuck", "runner", "cayuga", "mandarin", "raindropDuck", "moonDuck", "paperboatDuck", "littleLeviathan"],
  sheep: ["meadowSheep", "shetland", "jacob", "valais", "dandelionLamb", "rainbowSheep", "starFleece", "goldenFleece"],
  cow: ["dairyCow", "jersey", "highland", "brownSwiss", "strawberryCow", "cocoaCow", "flowerCow", "milkyWayCow"],
};
const YOUNG = { chicken: ["chick", "pullet"], duck: ["duckling", "youngDuck"], sheep: ["lamb", "hogget"], cow: ["calf", "heifer"] };
/** Each kind's first sheet's grid: what its pictures' sizes are measured against. */
const REF = { chicken: "barnHen", duck: "barnHen", sheep: "meadowSheep", cow: "dairyCow" };
/** A young one's share where the model drew it too large (measured: the pullet stood as tall as the hens). */
const SHARE = { pullet: 0.78, duckling: 0.8, youngDuck: 0.7, hogget: 0.9, calf: 0.72, heifer: 0.74 };
/** Frames chosen by eye: { "<base>": { "<frame>": ["<pl name>", <i>] } }. */
const OVERRIDE = {
  // (the trial: its edits are named eatE and sleepE; its first animated sleep and pecking were not taken)
  barnHen: { happy: ["pasture-barnHen-happy", 1], eat: ["pasture-barnHen-eatE", 0], sleep: ["pasture-barnHen-sleepE", 0] },
};

const meta = (n) => JSON.parse(fs.readFileSync(path.join(WORK, "pasture", "base", `${n}.json`), "utf8"));
const pl = (n, f, i) => path.join(WORK, "pl", `pasture-${n}-${f}`, `images-${i}.png`);
async function bottomOf(file) {
  const { data, info } = await L.sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let y = info.height - 1; y >= 0; y--) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] >= 128) return y;
  return -1;
}
async function entry(base, species, frames) {
  const m = meta(base), k = (m.grid / meta(REF[species]).grid) * (SHARE[base] ?? 1), out = { base, k: +k.toFixed(3), frames: { idle: "base" } };
  const has = (f, i) => fs.existsSync(pl(base, f, i));
  if (frames.includes("walk") && has("walk", 1)) { out.frames.walk1 = [`pasture-${base}-walk`, 1]; out.frames.walk2 = "base"; }
  if (frames.includes("happy")) {
    const floor = m.y + m.h - 1;
    let pick = null;
    for (let i = 1; i <= 4 && !pick; i++) if (has("happy", i) && (await bottomOf(pl(base, "happy", i))) >= floor - 1) pick = i;
    if (pick ?? has("happy", 1)) out.frames.happy = [`pasture-${base}-happy`, pick ?? 1];
  }
  for (const f of ["eat", "sleep", "swim"]) if (frames.includes(f) && has(f, 0)) out.frames[f] = [`pasture-${base}-${f}`, 0];
  Object.assign(out.frames, OVERRIDE[base] ?? {});
  return out;
}
/**
 * The animals in the sheet now. The owner, 2026-10-20: animals get a sex (bought with a chosen one, bred at random),
 * which may want male looks (a rooster, a ram, a bull, a drake): every animal but the barn hen of the trial waits for
 * that design. Their bases and the frames made before the pause are kept in work/pasture/base and work/pl.
 */
const NOW = new Set(["barnHen", "ox"]);
const picks = {};
const ALL = ["walk", "happy", "eat", "sleep"];
for (const [species, breeds] of Object.entries(KIND)) {
  const own = species === "duck" ? [...ALL, "swim"] : ALL;
  for (const b of breeds) if (NOW.has(b) && fs.existsSync(path.join(WORK, "pasture", "base", `${b}.json`))) picks[`an_${b}_adult_SE`] = await entry(b, species, own);
  const [baby, young] = YOUNG[species];
  for (const [n, stage] of [[baby, "baby"], [young, "young"]]) if (NOW.has(n) && fs.existsSync(path.join(WORK, "pasture", "base", `${n}.json`))) picks[`an_${species}_${stage}_SE`] = await entry(n, species, own);
}
// the ox that draws the hay wagon and the cloud ram (the line's mount): standing and walking only
for (const [prefix, base] of [["pa_ox", "ox"], ["pa_ram", "cloudRam"]]) if (NOW.has(base) && fs.existsSync(path.join(WORK, "pasture", "base", `${base}.json`))) picks[prefix] = await entry(base, "cow", ["walk"]);
fs.writeFileSync(path.join(HERE, "prompts", "pixellab", "pasture", "picks.json"), JSON.stringify(picks, null, 1) + "\n");
for (const [p, e] of Object.entries(picks)) console.log(`${p.padEnd(28)} k ${e.k}  ${Object.entries(e.frames).map(([f, v]) => `${f}=${v === "base" ? "base" : v[1]}`).join(" ")}`);
