// The pasture's back views (the owner, 2026-10-20, of the cows: "รูปวัวหันหลังดูแปลกๆนะ"): PixelLab's rotations of a
// three-quarter reference came out as a straight view from behind (its "north") or a side view (its "east"), never the
// map's three-quarter back. So each species sheet is edited in place into the same animals turned around, walking away
// to the upper right as seen on the 2:1 map, and pasture-base.mjs cuts each as `<look>Back`, the base PixelLab animates
// for the back view (pasture-looks.mjs, `--back`). Codex's words (2026-10-20-10-15-57-art-24928): standing still, the 2:1
// ground direction, the broad rump and near flank, legs planted and uncrossed. Writes prompts/scenery/pasture-<sheet>-back.txt and
// work/pasture/calls-backs-<species>.txt.
//
//   node pasture-backs.mjs cow|bird|sheep
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const species = process.argv[2];
/** [sheet, how many items, the animals in its first items (each its words), the rest that stay, its kind's words] */
const SHEETS = {
  cow: [
    ["pasture-cow-a", 3, ["the spotted dairy cow, its red collar and bell", "the fawn Jersey cow"], 1, "cows"],
    ["pasture-cow-b", 3, ["the shaggy red Highland cow and her wide horns", "the grey-brown Brown Swiss cow"], 1, "cows"],
    ["pasture-cow-c", 3, ["the pink strawberry cow with her yellow seed dots and green leafy tuft", "the dark chocolate cocoa cow"], 1, "cows"],
    ["pasture-cow-d", 3, ["the white flower cow with her mossy patches and flowers", "the midnight-blue Milky Way cow with her stars"], 1, "cows"],
    ["pasture-cow-e", 3, ["the small fawn calf", "the young fawn heifer"], 1, "young cattle"],
    ["pasture-cow-a-m", 3, ["the spotted dairy bull", "the fawn Jersey bull"], 1, "bulls"],
    ["pasture-cow-b-m-fix2", 3, ["the shaggy red Highland bull and his very wide horns", "the grey-brown Brown Swiss bull"], 1, "bulls"],
    ["pasture-cow-c-m-fix", 3, ["the pink strawberry bull with his seed dots and leafy tuft", "the dark chocolate cocoa bull"], 1, "bulls"],
    ["pasture-cow-d-m-fix", 3, ["the white flower bull with his mossy patches and flowers", "the midnight-blue Milky Way bull with his stars"], 1, "bulls"],
  ],
  bird: [
    ["pasture-chicken-a", 6, ["the red-brown barn hen", "the white fluffy silkie hen", "the grey-barred Araucana hen", "the black and copper Marans hen", "the amber lantern hen"], 1, "hens"],
    ["pasture-chicken-b", 6, ["the puffy white cloud hen", "the shining golden hen", "the red-orange pocket phoenix", "the small yellow chick", "the young pale brown pullet"], 1, "hens"],
    ["pasture-duck-a", 6, ["the white puddle duck", "the upright fawn Indian runner", "the black Cayuga duck", "the bright mandarin duck", "the sky-blue raindrop duck with her little rain cloud"], 1, "ducks"],
    ["pasture-duck-b", 6, ["the pearl-white moon duck", "the folded-paper paperboat duck", "the sea-blue little leviathan", "the small yellow duckling", "the young white duck"], 1, "ducks"],
    ["pasture-chicken-a-m", 6, ["the barn rooster", "the silkie rooster", "the Araucana rooster", "the Marans rooster", "the lantern rooster"], 1, "roosters"],
    ["pasture-chicken-b-m", 6, ["the cloud rooster", "the golden rooster", "the pocket phoenix cock"], 3, "roosters"],
    ["pasture-duck-a-m", 6, ["the puddle drake", "the Indian runner drake", "the Cayuga drake", "the mandarin drake", "the raindrop drake with his little rain cloud"], 1, "drakes"],
    ["pasture-duck-b-m", 6, ["the moon drake", "the paperboat drake", "the little leviathan drake"], 3, "drakes"],
  ],
  sheep: [
    ["pasture-sheep-a1", 4, ["the white meadow ewe", "the brown Shetland ewe", "the piebald Jacob ewe"], 1, "sheep"],
    ["pasture-sheep-a2", 4, ["the Valais blacknose ewe", "the dandelion ewe with her flowers", "the rainbow ewe in her seven bands"], 1, "sheep"],
    ["pasture-sheep-b-ewe", 5, ["the midnight-blue star-fleece ewe", "the hornless golden fleece ewe", "the small lamb", "the young hogget"], 1, "sheep"],
    ["pasture-sheep-a1-m", 4, ["the meadow ram", "the Shetland ram", "the Jacob ram and his four horns"], 1, "rams"],
    ["pasture-sheep-a2-m", 4, ["the Valais blacknose ram", "the dandelion ram", "the rainbow ram"], 1, "rams"],
    ["pasture-sheep-b-m", 5, ["the star-fleece ram", "the golden fleece ram"], 3, "rams"],
    ["pasture-sheep-a1-shorn", 4, ["the shorn meadow ewe", "the shorn Shetland ewe", "the shorn Jacob ewe"], 1, "shorn sheep"],
    ["pasture-sheep-a2-shorn", 4, ["the shorn Valais ewe", "the shorn dandelion ewe", "the shorn rainbow ewe"], 1, "shorn sheep"],
    ["pasture-sheep-b-ewe-shorn", 5, ["the shorn star-fleece ewe", "the shorn golden fleece ewe"], 3, "shorn sheep"],
    ["pasture-sheep-a1-m-shorn", 4, ["the shorn meadow ram", "the shorn Shetland ram", "the shorn Jacob ram"], 1, "shorn rams"],
    ["pasture-sheep-a2-m-shorn", 4, ["the shorn Valais ram", "the shorn dandelion ram", "the shorn rainbow ram"], 1, "shorn rams"],
    ["pasture-sheep-b-m-shorn", 5, ["the shorn star-fleece ram", "the shorn golden fleece ram"], 3, "shorn rams"],
  ],
};
/** A bird's and a sheep's words for the same turn (the cows' are kept as Codex passed them, below). */
const BODY = {
  bird: "its tail toward the lower left, its back and its folded near wing seen along its length, preserving its body length and width rather than narrowing into a straight rear view, its head turned away to the upper right so that the back of the head and its existing comb, crest or feathers show, held as in the front view (not raised), so that each bird is no taller and no larger than it is in the reference. Each keeps exactly its body proportions, size, markings and colours, standing naturally on its two legs with both feet planted",
  sheep: "its broad rump and tail toward the lower left, its back and a substantial area of its near flank seen along its length, preserving its body length and width rather than narrowing into a straight rear view, its head turned away to the upper right so that the back of the head and its existing ears and horns show, held level with its back as low as in the front view (not raised), so that each animal is no taller and no larger than it is in the reference. Each keeps exactly its body proportions, size, fleece or coat, markings and colours, standing naturally on four straight, uncrossed legs beneath its body, with all hooves planted and the far legs partly occluded where appropriate",
};
const word = ["", "first", "second", "third", "fourth", "fifth", "sixth"];
const calls = [];
for (const [sheet, n, animals, rest, kind] of SHEETS[species] ?? []) {
  if (species !== "cow") {
    const list = animals.map((a, i) => `the ${word[i + 1]} is ${a}`).join("; ");
    const stay = Array.from({ length: rest }, (_, i) => `the ${word[animals.length + i + 1]}`).join(", ").replace(/, ([^,]*)$/, " and $1");
    const text = `The attached picture is a sprite sheet of ${n} items in one row from a cozy 2D town game, ${kind} and a post. Redraw the same sheet with every item in the same column on the canvas, at the same size and on the same ground line, with the same chunky pixel size, the same thick dark outline and the same cute style; allow each animal's individual feet to move with its turned body. Each item stays inside its own column, with clear fully transparent gaps between neighbouring items and nothing clipped at the canvas edges.

Change only this: each animal named below is turned around, standing still and facing away from the viewer, seen from behind at three quarters in the same three-quarter top-down view, facing the upper right along a ground direction that runs two units right for one unit up: ${BODY[species]}: ${list}. ${stay[0].toUpperCase() + stay.slice(1)} ${rest > 1 ? "stay exactly as they are" : "stays exactly as it is"}.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`;
    fs.writeFileSync(path.join(HERE, "prompts", "scenery", `${sheet}-back.txt`), text);
    calls.push(`${sheet}-back gpt-image-2.5-sunburst low 1536x1024 prompts/scenery/${sheet}-back.txt work/out/${sheet}.png`);
    continue;
  }
  const list = animals.map((a, i) => `the ${word[i + 1]} is ${a}`).join("; ");
  const stay = Array.from({ length: rest }, (_, i) => `the ${word[animals.length + i + 1]}`).join(", ");
  const udder = kind === "bulls" ? " These are bulls: no udder at all." : kind === "cows" ? " A cow's udder shows only as a small shape between her hind legs, no larger than the front view shows it." : "";
  const text = `The attached picture is a sprite sheet of ${n} items in one row from a cozy 2D town game, ${kind} and a post. Redraw the same sheet with every item in the same column on the canvas, at the same size and on the same ground line, with the same chunky pixel size, the same thick dark outline and the same cute style; allow each animal's individual hooves to move with its turned body. Each item stays inside its own column, with clear fully transparent gaps between neighbouring items and nothing clipped at the canvas edges.

Change only this: each animal is turned around, standing still and facing away from the viewer, seen from behind at three quarters in the same three-quarter top-down view, facing the upper right along a ground direction that runs two units right for one unit up: its broad rump and tail toward the lower left, its back and a substantial area of its near flank seen along its length, preserving its body length and width rather than narrowing into a straight rear view, its head turned away to the upper right so that the back of the head and its existing ears and horns show, held level with its back as low as in the front view (not raised), so that each animal is no taller and no larger than it is in the reference. Each keeps exactly its body proportions, size, markings and colours, standing naturally on four straight, uncrossed legs beneath its body, with all hooves planted and the far legs partly occluded where appropriate: ${list}.${udder}${sheet.includes("-b-m") ? " The small pink udders and teats beneath both animals in the reference are errors: remove them, continuing the surrounding coat colour and shading into an uninterrupted underside while preserving the empty gaps between the legs." : ""}${sheet === "pasture-cow-e" ? " The calf remains hornless, and the heifer keeps only her tiny horn buds." : ""} ${stay[0].toUpperCase() + stay.slice(1)} ${rest > 1 ? "stay exactly as they are" : "stays exactly as it is"}.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`;
  fs.writeFileSync(path.join(HERE, "prompts", "scenery", `${sheet}-back.txt`), text);
  calls.push(`${sheet}-back gpt-image-2.5-sunburst low 1536x1024 prompts/scenery/${sheet}-back.txt work/out/${sheet}.png`);
}
fs.writeFileSync(path.join(HERE, "work", "pasture", `calls-backs-${species}.txt`), calls.join("\n") + "\n");
console.log(calls.length, `calls: work/pasture/calls-backs-${species}.txt`);
