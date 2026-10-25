// Doll 2's things drawn by PixelLab in a batch (the owner, 2026-10-25: OpenAI credit is down to $1.10, "ช่วยเอาไปทำที่
// PixelLab แทน แต่พยายามทำให้ออกมา เป็นแบบเดียวกันให้ได้"): every line of prompts/doll2/items.json marked `src: "pixellab"`
// gets its PixelLab bodies, on the templates the auction's sets proved (an outfit: the mannequin's walking and sitting
// canvases, edited, and the women's version the same; a head thing: a masked inpaint of the head; pl-doll.mjs packs and
// lays them back).
//
//   node pl-items.mjs write [ids]                    writes prompts/pixellab/items/<name>.json and lists them in
//                                                   work/pl-items/calls.json (what Codex reads in one run)
//   REVIEW="<run>" node pl-items.mjs run [ids]       makes every listed call not made yet, four at a time, one ledger
//                                                   row for the batch's whole cost; then lays each back on its sheets
//   node pl-items.mjs lay [ids]                      lays back what has come (do-/dk-, dh-/dhk-, da-/dak- in work/out)
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const ITEMS = JSON.parse(fs.readFileSync(path.join(HERE, "prompts", "doll2", "items.json"), "utf8"));
const P = path.join(HERE, "prompts", "pixellab", "items"), W = path.join(HERE, "work", "pl-items");
const [cmd, only] = process.argv.slice(2);
const wanted = only ? new Set(only.split(",")) : null;
fs.mkdirSync(P, { recursive: true });
fs.mkdirSync(W, { recursive: true });

// ── the templates (the Count's and the countess's words, which came out right) ──
const STYLE = "Dress every figure in the same outfit and change nothing else: keep each figure's pose, size, place, bald head, ears and face exactly as they are, with the same chunky pixel size, the same thick dark outline and the same flat shading with a few tones per colour.";
const WALK = "Edit this sheet of eight small chibi pixel art figures: the top row walks towards the viewer, the bottom row walks away from the viewer. ";
const REST = "Edit this sheet of six small chibi pixel art figures sitting on the ground: in the top row one sits facing the viewer, one sits facing away from the viewer, one sits facing the viewer with the hands at the chest; in the bottom row one sits facing the viewer with the hands at the mouth and two sit facing away. ";
const END = " Simple bold shapes, no fine pattern. The hands stay bare. Transparent background, nothing else added.";
const SEAT = " Simple bold shapes, no fine pattern. Nothing of the outfit reaches lower than each seated figure's own lowest pixels, which stay exactly where they are. The hands stay bare and keep their place. Transparent background, nothing else added.";
const outfit = (front, back) => `The outfit: ${front}. Seen from behind: ${back}.`;
const KEEP = "Keep the same chunky pixel size, the same thick dark outline and the same flat shading with a few tones per colour. The head, the face and the ears stay exactly as they are, nothing else added, transparent background.";
const TWO = "Two views of the same small chibi pixel art head, bald, with long pointed ears: on the left seen from the front, on the right seen from behind. Paint only inside the white of the mask: ";
const hat = (h) => `${TWO}put the same hat on both heads, sitting straight and a little loose, its band resting just above the ears and a little wider than the head: ${h.front} (seen from behind, ${h.back}). Simple bold shapes. ${KEEP}`;
const hair = (a) => `${TWO}put the same thing on both heads, in the same place on each: ${a.front} (seen from behind, ${a.back}). Simple bold shapes. ${KEEP}`;
const face = (a) => `A small chibi pixel art head seen from the front, bald, with long pointed ears and big violet eyes. Paint only inside the white of the mask, across the eyes: put ${a.front}.${a.clear ? " The lenses are clear, so the eyes show through them." : ""} Simple bold shapes. Keep the same chunky pixel size, the same thick dark outline and the same flat shading with a few tones per colour. The rest of the face, the head and the ears stay exactly as they are, nothing else added, transparent background.`;
const neck = (a) => `Two views of the same small chibi pixel art figure in a plain grey top, from the head to the chest: on the left seen from the front, on the right seen from behind. Paint only inside the white of the mask, at the neck and the chest: put ${a.front} (seen from behind, ${a.back}). Simple bold shapes. Keep the same chunky pixel size, the same thick dark outline and the same flat shading with a few tones per colour. The head, the face and the grey top stay exactly as they are, nothing else added, transparent background.`;

const B = "@../../../work/pl-doll";
function calls() {
  const out = [];
  const add = (name, endpoint, body, lay) => out.push({ name, endpoint, file: path.join(P, `${name}.json`), body, lay });
  for (const o of ITEMS.outfits.filter((x) => x.src === "pixellab" && (!wanted || wanted.has(x.id)))) {
    for (const [id, words] of [[o.id, o], [`${o.id}_f`, o.f]]) {
      add(`${id}-walk`, "edit-image-pro-flash", { image: `${B}/base/walk.png`, method: "text", no_background: true, description: WALK + STYLE + " " + outfit(words.front, words.back) + END }, { kind: "outfit", id, part: "walk" });
      add(`${id}-rest`, "edit-image-pro-flash", { image: `${B}/base/rest.png`, method: "text", no_background: true, description: REST + STYLE + " " + outfit(words.front, words.back) + SEAT }, { kind: "outfit", id, part: "rest" });
    }
  }
  const head = (slot, words) => ({ image: `${B}/head-${slot}/head.png`, mask_image: `${B}/head-${slot}/head-mask.png`, no_background: true, description: words });
  for (const h of ITEMS.hats.filter((x) => x.src === "pixellab" && !x.full && (!wanted || wanted.has(x.id)))) add(h.id, "inpaint-image-pro-flash", head("hat", hat(h)), { kind: "head", id: h.id, slot: "hat", g: "dh" });
  for (const a of ITEMS.accessories.filter((x) => x.src === "pixellab" && (!wanted || wanted.has(x.id)))) {
    const words = a.slot === "face" ? face(a) : a.slot === "neck" ? neck(a) : hair(a);
    add(a.id, "inpaint-image-pro-flash", head(a.slot, words), { kind: "head", id: a.id, slot: a.slot, g: "da" });
  }
  return out;
}

const made = (c) => fs.existsSync(path.join(HERE, "work", "pl", `${c.name}-1`, "image.png"));

if (cmd === "write") {
  const list = calls();
  for (const c of list) fs.writeFileSync(c.file, JSON.stringify(c.body, null, 1));
  fs.writeFileSync(path.join(W, "calls.json"), JSON.stringify(list.map(({ body, ...c }) => ({ ...c, description: body.description })), null, 1));
  console.log(`${list.length} bodies in ${path.relative(HERE, P)}; listed in work/pl-items/calls.json`);
}

// lay back what has come: outfits through pl-doll.mjs unpack (both canvases needed), head things through unhead
function lay(list) {
  const outfits = new Set(list.filter((c) => c.lay.kind === "outfit").map((c) => c.lay.id));
  for (const id of outfits) {
    const walk = path.join(HERE, "work", "pl", `${id}-walk-1`, "image.png"), rest = path.join(HERE, "work", "pl", `${id}-rest-1`, "image.png");
    if (!fs.existsSync(walk) || !fs.existsSync(rest)) continue;
    const d = path.join(HERE, "work", "pl-doll", id);
    fs.mkdirSync(d, { recursive: true });
    for (const f of ["map.json", "walk.png", "rest.png"]) fs.copyFileSync(path.join(HERE, "work", "pl-doll", "base", f), path.join(d, f));
    fs.copyFileSync(walk, path.join(d, "walk-out.png"));
    fs.copyFileSync(rest, path.join(d, "rest-out.png"));
    const r = spawnSync("node", ["pl-doll.mjs", "unpack", d, id], { cwd: HERE, encoding: "utf8" });
    console.log(r.stdout.trim().split("\n").at(-1) || r.stderr);
  }
  for (const c of list.filter((x) => x.lay.kind === "head")) {
    const got = path.join(HERE, "work", "pl", `${c.name}-1`, "image.png");
    if (!fs.existsSync(got)) continue;
    const d = path.join(HERE, "work", "pl-doll", `head-${c.lay.slot}`);
    fs.copyFileSync(got, path.join(d, "head-out.png"));
    const r = spawnSync("node", ["pl-doll.mjs", "unhead", d, c.lay.id, c.lay.g], { cwd: HERE, encoding: "utf8" });
    console.log(r.stdout.trim() || r.stderr);
  }
}
if (cmd === "lay") lay(calls());

if (cmd === "run") {
  if (!process.env.REVIEW && !process.env.NO_REVIEW) { console.log("REVIEW=<Codex's run folder> (or NO_REVIEW=<why>) first"); process.exit(1); }
  const list = calls().filter((c) => !made(c));
  const key = fs.readFileSync("E:/NinenineProject/fcnext/.env.local", "utf8").match(/^PIXELLAB_API_KEY=(.+)$/m)?.[1].trim();
  const left = async () => (await (await fetch("https://api.pixellab.ai/v2/balance", { headers: { Authorization: `Bearer ${key}` } })).json()).subscription?.generations;
  const batch = `items-${Date.now()}`, before = await left();
  console.log(`${list.length} calls to make, ${before} generations left`);
  let i = 0;
  const one = () => new Promise((done) => {
    const c = list[i++];
    if (!c) return done();
    const p = spawn("node", ["pl.mjs", `${c.name}-1`, c.endpoint, c.file], { cwd: HERE, env: { ...process.env, PL_BATCH: batch } });
    let out = "";
    p.stdout.on("data", (d) => (out += d));
    p.on("close", () => { console.log(`${c.name}: ${out.trim().split("\n").at(-1)}`); one().then(done); });
  });
  await Promise.all([one(), one(), one(), one()]);
  const after = await left();
  fs.appendFileSync(path.join(HERE, "work", "ledger.jsonl"), JSON.stringify({ t: new Date().toISOString(), tool: "pixellab", name: batch, endpoint: "batch", pictures: [], cost: 0, gens: +(before - after).toFixed(2), batch, calls: list.length, ...(process.env.REVIEW ? { review: process.env.REVIEW } : { noReview: process.env.NO_REVIEW }) }) + "\n");
  console.log(`batch ${batch}: ${(before - after).toFixed(1)} generations, ${after} left`);
  lay(calls());
}
