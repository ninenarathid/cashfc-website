// The shorn sheep (the coordinator, 2026-10-20: "every sheep breed ewe and ram, front/back, idle/walk"): each sheep sheet
// (the ewes', the rams') edited in place into the same sheep just shorn, so a shorn one stands where, as large and in
// the same pixels as its fleeced self (README "Every sheet is an in-place edit of another"); the lambs and the post stay.
// Codex's read (2026-10-20-08-07-24-art-19172) gave the stars and the attached tufts; its trial (the rams' a2) kept the fleece
// and drew a fourth ram for the post, so the words now say how a sheared sheep looks and name what stays.
// pasture-base.mjs then cuts each as `<breed>Shorn` / `<breed>MShorn`, and pasture-looks.mjs makes it a PixelLab look.
// Writes prompts/scenery/pasture-<sheet>-shorn.txt and work/pasture/calls-shorn.txt.
//
//   node pasture-shorn.mjs
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
/** What each breed's coat is once its fleece is off (its fleece's own colours, kept short). */
const COAT = {
  meadowSheep: "the first creamy white",
  shetland: "the second chocolate brown",
  jacob: "the third in the same black and white patches",
  valais: "the first white, its black face, ears and knees as they are",
  dandelionLamb: "the second pale cream with a few of its small white flowers still attached on its back",
  rainbowSheep: "the third still in its seven coloured bands, in the same order",
  starFleece: "the first midnight blue still marked with a few large, well-separated pale yellow four-pointed stars, fully opaque and inside its outline, with no glow or floating sparkles",
  goldenFleece: "the second shining golden",
};
/** [sheet, how many items, the breeds in its first items, the rest that stay, ram?] */
const SHEETS = [
  ["pasture-sheep-a1", 4, ["meadowSheep", "shetland", "jacob"], 1, false],
  ["pasture-sheep-a2", 4, ["valais", "dandelionLamb", "rainbowSheep"], 1, false],
  ["pasture-sheep-b-ewe", 5, ["starFleece", "goldenFleece"], 3, false],
  ["pasture-sheep-a1-m", 4, ["meadowSheep", "shetland", "jacob"], 1, true],
  ["pasture-sheep-a2-m", 4, ["valais", "dandelionLamb", "rainbowSheep"], 1, true],
  ["pasture-sheep-b-m", 5, ["starFleece", "goldenFleece"], 3, true],
];
const word = ["", "first", "second", "third", "fourth", "fifth"];
const calls = [];
for (const [sheet, n, breeds, rest, ram] of SHEETS) {
  const list = breeds.map((b) => COAT[b]).join("; ");
  const stay = Array.from({ length: rest }, (_, i) => `the ${word[breeds.length + i + 1]}`).join(", ").replace(/, ([^,]*)$/, " and $1");
  const what = ram ? "rams" : "ewes";
  const text = `The attached picture is a sprite sheet of ${n} items in one row from a cozy 2D town game, sheep and their kin. Redraw the same sheet with every item's feet anchored in exactly the same place on the canvas, in the same three-quarter top-down view facing the lower right, with the same chunky pixel size, the same thick dark outline and the same cute style with big shiny dark eyes; each item stays inside its own column, with clear fully transparent vertical gaps between neighbouring items and nothing clipped at the canvas edges.

Change only this: the first ${["", "one", "two", "three"][breeds.length]} items, ${what}, have just been sheared like real sheep after shearing: all their thick fluffy wool is gone. Each body is now smooth and much slimmer, about two thirds as wide as before, its outline following the body closely with no fluffy bumps or scallops, covered in a smooth, short, velvety coat: ${list}. Their heads, faces, ears, ${ram ? "horns, " : ""}legs and hooves stay exactly as they are and where they are; the legs and neck show more of their length without being lengthened. ${stay[0].toUpperCase() + stay.slice(1)} ${rest > 1 ? "stay exactly as they are, in their places" : "stays exactly as it is, in its place"}: ${rest > 1 ? "the lamb, the young sheep and the tall post" : "the tall post"}.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`;
  fs.writeFileSync(path.join(HERE, "prompts", "scenery", `${sheet}-shorn.txt`), text);
  calls.push(`${sheet}-shorn gpt-image-2.5-sunburst low 1536x1024 prompts/scenery/${sheet}-shorn.txt work/out/${sheet}.png`);
}
fs.writeFileSync(path.join(HERE, "work", "pasture", "calls-shorn.txt"), calls.join("\n") + "\n");
console.log(calls.length, "calls: work/pasture/calls-shorn.txt");
