// The PixelLab request bodies for the pasture's animals (ART_WORKFLOW "PixelLab"; README "The pasture"), one family of
// words a kind of animal, every body's first frame the animal's base (work/pasture/base/<name>.png, pasture-base.mjs):
//   <name>-walk.json   /animate-with-text-v3: a step (frame 1 is the one taken; the walk is the step and the base in turn)
//   <name>-happy.json  /animate-with-text-v3: a happy hop
//   <name>-eat.json    /edit-image-pro-flash: head down, eating
//   <name>-sleep.json  /edit-image-pro-flash: lying asleep
//   <name>-swim.json   /edit-image-pro-flash (ducks): floating, the feet hidden under a level waterline
// The words are those Codex read for the barn hen (2026-10-19-20-13-10-find-45136, -20-21-19-find-47448), given per
// family as it asked (a duck dabbles with its bill, a sheep or a cow grazes with its muzzle and walks on four legs), and
// as it read the batch's templates (2026-10-20-04-08-31-find-38564: a four-beat walk, the muzzle to the ground, the
// mounts' gear kept).
//
//   node pasture-bodies.mjs <name:family[:only,only][:noun]> ...     family: hen | duck | sheep | cow; noun: what the words
//                                                                  call it when not the family's (chick, ox, ram)
// Out: prompts/pixellab/pasture/<name>-<frame>.json
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const OUT = path.join(HERE, "prompts", "pixellab", "pasture");
const KEEP = "Preserve proportions, pixel size, dark outline and palette";
const WORDS = {
  hen: { noun: "hen", walk: "walks in place facing lower right throughout, alternating feet with a slight waddle", hop: "makes a tiny happy hop in place with a small wing lift and smiling closed eyes, then lands at the original position",
    eat: "eating: it bends its neck down so its beak touches the ground just in front of its feet, its tail tipped up a little, its eyes open. Its feet stay where they are",
    sleep: "asleep, resting its belly on the ground, legs folded and feet hidden beneath its feathers, head lowered slightly toward its breast" },
  duck: { noun: "duck", walk: "waddles in place facing lower right throughout, alternating its webbed feet with a slight sway", hop: "makes a tiny happy hop in place with a small wing flap and smiling closed eyes, then lands at the original position",
    eat: "dabbling: it bends its neck down so its bill touches the ground just in front of its feet, its tail tipped up a little, its eyes open. Its feet stay where they are",
    sleep: "asleep, resting its belly on the ground, legs folded and feet hidden beneath its feathers, its head lowered and its bill resting on its breast",
    swim: "floating as it swims: its body sits a little lower, its legs and feet hidden, the underside of its body flat and level along one waterline, its eyes open" },
  sheep: { noun: "sheep", walk: "walks in place facing lower right throughout, its four legs stepping in a gentle walk, each hoof lifting and landing separately in a four-beat walk", hop: "gives a small happy bounce in place, its front feet lifting a little and its eyes closed in a smile, then lands at the original position",
    eat: "grazing: it lowers its head so its muzzle touches the ground just in front of its front feet, its eyes open. Its four feet stay where they are",
    sleep: "lying down asleep: its legs folded out of sight under its body so it rests on its belly on the ground, its head resting low" },
  cow: { noun: "cow", walk: "walks in place facing lower right throughout, its four legs stepping in a slow walk, each hoof lifting and landing separately in a four-beat walk", hop: "gives a small happy bounce in place, its front feet lifting a little and its eyes closed in a smile, then lands at the original position",
    eat: "grazing: it lowers its head so its muzzle touches the ground just in front of its front feet, its eyes open. Its four feet stay where they are",
    sleep: "lying down asleep: its legs folded out of sight under its body so it rests on its belly on the ground, its head resting low" },
};
const base = (name) => `@../../../work/pasture/base/${name}.png`;
const animate = (name, w, action) => ({ first_frame: base(name), action: `The same ${w.noun} ${action}. Fixed camera, no translation or turning. ${KEEP}; no additions.`, frame_count: 4, no_background: true, enhance_prompt: false });
const edit = (name, w, pose, eyes) => ({ image: base(name), method: "text", description: `The same ${w.noun} ${pose}. ${eyes}${KEEP}, still facing the lower right. Keep the same canvas and ground contact position. Nothing else added.`, no_background: true, use_color_palette_correction: true });

for (const arg of process.argv.slice(2)) {
  const [name, family, only, noun] = arg.split(":"), w0 = WORDS[family];
  if (!w0) throw new Error(`${arg}: no family ${family}`);
  const w = noun ? { ...w0, noun } : w0;
  // (what a mount wears is kept as it is drawn: the ox's yoke, the ram's saddle with its two seats; Codex's words)
  const keep = { ox: " Keep the existing yoke intact, fitted in its original position.", ram: " Keep the existing saddle and both seats intact, fitted in their original positions; keep its cloud details unchanged." }[noun ?? ""] ?? "";
  const bodies = {
    walk: { ...animate(name, w, w.walk + "; eyes open"), ...(keep ? { action: animate(name, w, w.walk + "; eyes open").action + keep } : {}) },
    happy: animate(name, w, w.hop),
    eat: edit(name, w, w.eat, ""),
    sleep: edit(name, w, w.sleep, "Close only the eyes visible in the reference into short dark pixel lines; the resting silhouette is lower than standing. "),
    ...(w.swim ? { swim: edit(name, w, w.swim, "") } : {}),
  };
  for (const [frame, body] of Object.entries(bodies)) {
    if (only && !only.split(",").includes(frame)) continue;
    fs.writeFileSync(path.join(OUT, `${name}-${frame}.json`), JSON.stringify(body) + "\n");
  }
  console.log(`${name} (${family}): ${Object.keys(bodies).filter((f) => !only || only.split(",").includes(f)).join(", ")}`);
}
