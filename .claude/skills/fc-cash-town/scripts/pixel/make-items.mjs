// Doll 2's wearable things (DOLL2.md): every prompt written from prompts/doll2/items.json, so a new outfit, hat or
// accessory is a line of words there and nothing else (the owner, 2026-10-17: "ทำให้การเพิ่มชุดใหม่ 1 ชุด ไม่เปลือง
// token จนเกินไป"). It writes the prompt files and lists every call gen.mjs would make, for Codex to read in one run.
//
//   node make-items.mjs <stage> <calls.jsonl>     stage 1: what the base sheets are enough for
//                                                 stage 2: the eating poses, and the skin keys of stage 1's outfits
//                                                 stage 3: the eating poses' skin keys (the same words as stage 2's keys)
//                                                 stage 4: the hats' and accessories' keys (each thing painted magenta:
//                                                          what the builder cuts it out by; told apart by colour, a
//                                                          straw hat or dark lenses were lost against the face)
//   then: node ~/.claude/skills/codex-pair/scripts/codex-ask.mjs art --for "…" --calls <calls.jsonl>
//         and the same `node gen.mjs …` lines it printed, one by one
//
// Sheet names (work/out): do-<id>-<type> an outfit (type front, back, poses, eat: in-place edits of d2-mannequin-*),
// dk-<id>-<type> its skin key, dh-<id>-<view> a hat, da-<id>-<view> an accessory; d2-mannequin-eat the sitting-eating
// base, d2-starter-eat and d2-skinkey-eat the starter's.
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const P = path.join(HERE, "prompts", "doll2");
const OUT = path.join(P, "items");
const [stage, callsFile] = [process.argv[2], process.argv[3]];
if (!["1", "2", "3", "4"].includes(stage) || !callsFile) { console.log("node make-items.mjs <1|2|3|4> <calls.jsonl>"); process.exit(1); }
const items = JSON.parse(fs.readFileSync(path.join(P, "items.json"), "utf8"));
fs.mkdirSync(OUT, { recursive: true });

const CLOSE = "Crisp pixel art with hard square pixel edges, no anti-aliasing, no blur, no gradients. Transparent background, no text, no labels, no ground shadow, nothing else changed.";
const KEEP = (what) => `Edit the attached pixel art sprite sheet. Keep everything exactly where it is: the same canvas, the same four figures at the same positions and the same size, ${what}, the same chunky square pixel size, the same thick dark outline and the same pixel art style.`;
const SHAPES = "Simple bold shapes with two or three tones per colour, no tiny patterns.";

const calls = [];
const call = (name, text, ref) => {
  fs.writeFileSync(path.join(OUT, `${name}.txt`), text.replace(/\n/g, "\r\n"));
  calls.push({ name, ref, file: path.join(OUT, `${name}.txt`) });
};

const outfit = {
  front: (o) => `${KEEP("the same walking poses, the same bald round head with exactly the same outline and size, the same face, the same long pointed ears, the same bare hands")}\n\nChange only the clothes, to this outfit, the same on all four figures: ${o.front}. ${SHAPES} The grey base layer is completely gone. Nothing on the head.\n\n${CLOSE}\n`,
  back: (o) => `${KEEP("the same walking poses seen from behind, the same bald round head with exactly the same outline and size, the same smooth bald back of the head, the same long pointed ears, the same bare hands")}\n\nChange only the clothes, to this outfit as it looks from behind, the same on all four figures walking away: ${o.back}. Only the back shows: no front details. ${SHAPES} The grey base layer is completely gone. Nothing on the head.\n\n${CLOSE}\n`,
  poses: (o) => `${KEEP("the same four poses (sitting seen from the front, sitting seen from behind, lying asleep, waving), the same bald round head with exactly the same outline and size, the same faces, the same long pointed ears, the same bare hands")}\n\nChange only the clothes, in all four poses, to this outfit: ${o.front}. On the figure sitting seen from behind, only the back shows: ${o.back}, no front details. ${SHAPES} The grey base layer is completely gone. Nothing on the head. Every pose keeps its exact placement and body proportions while the clothing outline changes as needed for the outfit.${o.pose ?? ""}\n\n${CLOSE}\n`,
  eat: (o) => `${KEEP("the same four sitting poses and the same empty hands, the same bald round head with exactly the same outline and size, the same faces, the same long pointed ears")}\n\nChange only the clothes, on all four figures, to this outfit: ${o.front}. On the two figures seen from behind, only the back shows: ${o.back}, no front details. ${SHAPES} The grey base layer is completely gone. Nothing on the head, nothing in the hands. Every pose keeps its exact placement and body proportions while the clothing outline changes as needed for the outfit.${o.pose ? " In all four sitting poses, the skirt drapes continuously over the lap and upper thighs, with one continuous hem at the bent knees, rather than separate shorts-like leg openings; the hands, knees and feet stay where they are." : ""}\n\n${CLOSE}\n`,
};
const skinkey = () => `${KEEP("the same poses, the same clothes and shoes in their same colours")}\n\nChange only the colour of all the bare skin (the head, face, ears, neck, hands, and any arms or legs showing between the clothes): paint it flat bright cyan, shaded only with darker cyans. Leave every piece of clothing, the shoes and the eyes exactly as they are.\n\n${CLOSE}\n`;
const eatBase = `Use the attached pixel art sprite sheet as the reference for the character: its exact size and proportions, the plain grey base layer, the bald round head, the face, the long pointed ears, the chunky square pixel size, the thick dark outline and the pixel art style. Draw the same character four times in one row, evenly spaced, at exactly the same size as in the reference, each sitting on the ground the way the reference's first two figures sit: 1) sitting seen from the front, both hands held together in front of the chest, palms up, as if holding a small snack to eat; 2) the same, both hands lifted together up to just below the mouth, as if taking a bite, the mouth open; 3) sitting seen from behind, the elbows bent, the hands in front of the chest out of sight; 4) the same seen from behind, the elbows lifted a little higher, the hands up at the mouth out of sight. The hands are empty: no bowl, no food, no spoon, nothing in them.\n\nKeep the same canvas. Place the four seated figures at the horizontal centres of the reference's four figure slots. Frames 1 and 2 are horizontally translated copies of the reference's first seated figure; frames 3 and 4 are horizontally translated copies of its second seated figure. Preserve each source seated figure's size, head position, legs and seat height, changing only the arms, hands and the requested mouth. Within each pair, the head, torso and legs stay in exactly the same relative positions. Replace the sleeping and waving figures completely; neither pose remains.\n\nCrisp pixel art with hard square pixel edges, no anti-aliasing, no blur, no gradients. Transparent background, no text, no labels, no ground shadow.\n`;

const hat = (h, view) => `${KEEP(`the same walking poses${view === "back" ? " seen from behind" : ""}, the same bald round head with exactly the same outline and size, ${view === "back" ? "the same smooth bald back of the head" : "the same face"}, the same long pointed ears, the same outfit`)}\n\nChange only one thing: put ${h[view]} on her head, the same hat on all four figures. It sits a little loose, as if over a full head of hair: its band rests just above her ears and is a little wider than her bald head, and the ears stay uncovered and exactly as they are. She stays bald under it. ${SHAPES}\n\n${CLOSE}\n`;
const accessory = (a, view) => {
  if (a.slot === "face") return `${KEEP("the same walking poses, the same bald round head with exactly the same outline and size, the same long pointed ears, the same outfit")}\n\nChange only one thing: put ${a.front}, the same on all four figures. Her eyes, face and head stay exactly as they are. ${SHAPES}\n\n${CLOSE}\n`;
  if (a.slot === "hair") return `${KEEP(`the same walking poses${view === "back" ? " seen from behind" : ""}, the same bald round head with exactly the same outline and size, ${view === "back" ? "the same smooth bald back of the head" : "the same face"}, the same long pointed ears, the same outfit`)}\n\nChange only one thing: put ${a[view]} on her bald head, the same on all four figures. She stays bald. ${SHAPES}\n\n${CLOSE}\n`;
  return `${KEEP(`the same walking poses${view === "back" ? " seen from behind" : ""}, the same bald round head with exactly the same outline and size, the same long pointed ears, the same plain grey base layer`)}\n\nChange only one thing: put ${a[view]}, the same on all four figures. The grey base layer stays exactly as it is. ${SHAPES}\n\n${CLOSE}\n`;
};

// the women's versions (the owner, 2026-10-17: "ชุดเดิมให้เป็นชุด ผู้ชาย ชุดผู้หญิง ให้ Gen ใหม่"): <id>_f, on the same bases
const women = [...items.outfits.filter((o) => o.f).map((o) => ({ id: `${o.id}_f`, ...o.f })), ...(items.starter?.f ? [{ id: "starter_f", ...items.starter.f }] : [])];
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
if (stage === "1") {
  for (const o of [...items.outfits, ...women]) for (const t of ["front", "back", "poses"]) call(`do-${o.id}-${t}`, outfit[t](o), `work/out/d2-mannequin-${t}.png`);
  call("d2-mannequin-eat", eatBase, "work/out/d2-mannequin-poses.png");
  for (const h of items.hats) for (const v of ["front", "back"]) call(`dh-${h.id}-${v}`, hat(h, v), `work/out/f-bald-${v}.png`);
  for (const a of items.accessories) for (const v of ["front", "back"]) {
    if (!a[v]) continue;
    const ref = a.slot === "face" ? "work/out/f-neutral-front.png" : a.slot === "hair" ? `work/out/f-bald-${v}.png` : `work/out/d2-mannequin-${v}.png`;
    call(`da-${a.id}-${v}`, accessory(a, v), ref);
  }
} else if (stage === "2") {
  const starter = { front: "a loose light-blue linen shirt with a small open collar, its sleeves rolled up neatly to just below the elbow with the rolled cuffs a slightly darker blue; over it a short sleeveless deep maroon vest, open at the front and ending at the waist; cream knee-length shorts; soft brown leather ankle boots with a lighter tan sole; a thin brown leather strap from the right shoulder across the chest down to a small brown satchel at the left hip", back: "the back of the shirt and of the vest, the strap crossing the back, the satchel at the side" };
  call("d2-starter-eat", outfit.eat(starter), "work/out/d2-mannequin-eat.png");
  for (const o of [...items.outfits, ...women]) {
    call(`do-${o.id}-eat`, outfit.eat(o), "work/out/d2-mannequin-eat.png");
    for (const t of ["front", "back", "poses"]) call(`dk-${o.id}-${t}`, skinkey(), `work/out/do-${o.id}-${t}.png`);
  }
} else if (stage === "4") {
  const thing = (what, clear) => `${KEEP("the same poses, the same head, face, ears and eyes, the same clothes")}

Change only the colour of ${what}: paint all of it, its dark outline included, flat bright magenta, shaded only with darker magentas.${clear ? " Only the frames: the clear lenses stay as they are, with the eyes showing through." : ""} Leave the head, the face, the ears, the skin, the eyes, the hair and the clothes exactly as they are.

${CLOSE}
`;
  for (const h of items.hats) for (const v of ["front", "back"]) call(`dhk-${h.id}-${v}`, thing(h.key ?? "the hat"), `work/out/dh-${h.id}-${v}.png`);
  const WHAT = { face: "the glasses", neck: "the thing worn at the neck", hair: "the hair clip" };
  for (const a of items.accessories) for (const v of ["front", "back"]) if (a[v]) call(`dak-${a.id}-${v}`, thing(a.key ?? WHAT[a.slot], a.clear ?? a.id === "glasses"), `work/out/da-${a.id}-${v}.png`);
} else {
  call("d2-skinkey-eat", skinkey(), "work/out/d2-starter-eat.png");
  for (const o of [...items.outfits, ...women]) call(`dk-${o.id}-eat`, skinkey(), `work/out/do-${o.id}-eat.png`);
}
if (only) calls.splice(0, calls.length, ...calls.filter((c) => only.test(c.name)));
fs.writeFileSync(callsFile, calls.map((c) => JSON.stringify({ bg: "transparent", argv: [c.name, "gpt-image-2.5-sunburst", "low", "1536x1024", c.file, path.resolve(HERE, c.ref)] })).join("\n") + "\n");
console.log(`${calls.length} calls listed in ${callsFile}; prompts in ${OUT}`);
for (const c of calls) console.log(`node gen.mjs ${c.name} gpt-image-2.5-sunburst low 1536x1024 ${path.relative(HERE, c.file).replace(/\\/g, "/")} ${c.ref}`);
