// The pasture's males (the owner, 2026-10-20: animals get a sex; a rooster per hen breed, a drake per duck breed, a ram
// per sheep breed, a bull per cow breed): each an in-place edit of the female sheet it stands on, so that a male is
// drawn where, as large and as his female is (README "Every sheet is an in-place edit of another"). The young and the
// posts stay as they are. Codex's batch read (2026-10-20-06-49-24-art-44628) gave the opening (the feet anchored, each
// male inside its own column) and the drakes' hooked tail feather. Writes prompts/scenery/pasture-<sheet>-m.txt and work/pasture/calls-males.txt.
//
//   node pasture-males.mjs
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const KIND = { chicken: ["hens", "the rooster of her own breed"], duck: ["ducks", "the drake of her own breed"], sheep: ["ewes", "the ram of her own breed"], cow: ["cows", "the bull of her own breed"] };
/** [female sheet, species, how many items, { item number: the male's words }, items that stay] */
const SHEETS = [
  ["pasture-chicken-a", "chicken", 6, {
    1: "a barn rooster: red-brown with golden-orange neck hackles, a big upright red comb, long red wattles and a tall arching sickle tail of glossy dark green-black feathers, standing a little taller and prouder",
    2: "a Silkie rooster: white and fluffy all over like cotton, a bigger fluffy crest with a small dark red walnut comb, a dark blue-grey face and long fluffy tail plumes",
    3: "an Araucana rooster: grey feathers barred in darker grey, round puffy cheek tufts, a red pea comb and a long barred sickle tail",
    4: "a Marans rooster: glossy black with bright copper neck and saddle feathers, a big red comb and a tall glossy green-black sickle tail",
    5: "a lantern rooster: amber with a big red comb and long arching tail feathers whose tips are pale lemon yellow" }, [6]],
  ["pasture-chicken-b", "chicken", 6, {
    1: "a cloud rooster: puffy white with soft pale blue shading, a small pink comb and a long fluffy tail like a trailing cloud",
    2: "a golden rooster: shining gold with bright pale yellow highlights, a big red comb and a tall golden sickle tail",
    3: "a pocket phoenix cock: red-orange plumes, a taller crest of five flame-shaped feathers and a longer tail of curling orange and yellow flame feathers" }, [4, 5, 6]],
  ["pasture-duck-a", "duck", 6, {
    1: "a puddle drake: white with cream shading, an orange bill and feet, and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across",
    2: "an Indian runner drake: upright like a bottle, fawn brown and white, a green-tinged head and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across",
    3: "a Cayuga drake: glossy black with a strong beetle-green sheen on its head and wings and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across",
    4: "a mandarin drake: with two tall upright orange sail feathers rising clearly above its back, visibly taller than the reference's sails, a white stripe over its eye, an orange ruff, a purple breast and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across",
    5: "a raindrop drake: deeper sky blue with a darker blue head, the same tiny grey-white rain cloud with three blue drops above its head, and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across" }, [6]],
  ["pasture-duck-b", "duck", 6, {
    1: "a moon drake: pearl white with a silvery blue head, a bigger warm yellow crescent on its wing and a bold upright hooked tail feather, visibly changing the tail silhouette, with an open notch at least two art pixels across",
    2: "a paperboat drake: its cream and white feathers folded in crisp pleats, a pointed folded paper crest on its head and an upright hooked paper-fold tail with an open notch at least two art pixels across, visibly changing the tail silhouette",
    3: "a little leviathan drake: deeper sea blue scales, a taller fin crest on its head and a longer finned tail" }, [4, 5, 6]],
  ["pasture-sheep-a1", "sheep", 4, {
    1: "a meadow ram: the same soft white fleece and cream face, with two big curled cream horns",
    2: "a Shetland ram: the same patches of brown, fawn and grey, with two big curled honey-coloured horns",
    3: "a Jacob ram: the same black and white patches, with four bigger horns, two curling up and two curling down beside its face" }, [4]],
  ["pasture-sheep-a2", "sheep", 4, {
    1: "a Valais blacknose ram: the same long fluffy curls, black face and ears, with two big spiral horns",
    2: "a dandelion ram: the same fleece of fluffy seed heads, with two curled pale cream horns",
    3: "a rainbow ram: the same seven bands of colour, with two curled cream horns" }, [4]],
  ["pasture-sheep-b", "sheep", 5, {
    1: "a star-fleece ram: the same midnight blue fleece with stars, with two curled silver-grey horns",
    2: "a golden fleece ram: the same shining golden curls, with bigger, heavier curled ivory horns and a broader chest" }, [3, 4, 5]],
  ["pasture-cow-a", "cow", 3, {
    1: "a spotted dairy bull: white with big black spots, a broader chest, a heavier neck, short thick horns, a brass ring in its nose and no udder",
    2: "a Jersey bull: darker fawn brown, a broader chest, a heavier neck, short horns and no udder" }, [3]],
  ["pasture-cow-b", "cow", 3, {
    1: "a Highland bull: the same long shaggy red-orange coat and fringe, much wider upcurved horns, a heavier neck and no udder",
    2: "a Brown Swiss bull: soft grey-brown, big fuzzy ears, a heavier neck, short horns and no udder" }, [3]],
  ["pasture-cow-c", "cow", 3, {
    1: "a strawberry bull: soft pink freckled with yellow seed dots and a green leafy tuft, a heavier neck, short horns and no udder",
    2: "a cocoa bull: dark chocolate brown with milk-chocolate patches, a heavier neck, bigger cream horns and no udder" }, [3]],
  ["pasture-cow-d", "cow", 3, {
    1: "a flower bull: white with soft green mossy patches and little flowers on its back, a heavier neck, short horns and no udder",
    2: "a Milky Way bull: deep midnight blue with star constellations along its sides, a heavier neck, short pale horns and no udder" }, [3]],
];
// The golden fleece's ewe: drawn with a ram's horns on the first sheet; ewes are hornless (the coordinator's rule)
const EWE = ["pasture-sheep-b", 5, 2, "the golden fleece ewe: the same shining golden curls and cream face, with no horns at all, a softer rounder face and small ears"];

const OUT = path.join(HERE, "prompts", "scenery"), calls = [];
const word = ["", "first", "second", "third", "fourth", "fifth", "sixth"];
for (const [sheet, species, n, males, stay] of SHEETS) {
  const [plural, male] = KIND[species];
  const list = Object.entries(males).map(([k, w]) => `the ${word[k]} becomes ${w}`).join("; ");
  const keep = stay.map((k) => `the ${word[k]}`).join(", ").replace(/, ([^,]*)$/, " and $1");
  const text = `The attached picture is a sprite sheet of ${n} items in one row from a cozy 2D town game, ${plural} and their kin. Redraw the same sheet with every item's feet anchored in exactly the same place on the canvas, its body at about the same size; the requested male features may change its silhouette, but must remain inside its own column, with clear fully transparent vertical gaps between neighbouring items and nothing clipped at the canvas edges, in the same three-quarter top-down view facing the lower right, with the same chunky pixel size, the same thick dark outline and the same cute style with big shiny dark eyes.

Change only this: each animal named below becomes ${male}, standing in the same place, the same pose and about the same size, plainly the same breed in its colours: ${list}. ${keep[0].toUpperCase() + keep.slice(1)} ${stay.length > 1 ? "stay" : "stays"} exactly as ${stay.length > 1 ? "they are" : "it is"}.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`;
  fs.writeFileSync(path.join(OUT, `${sheet}-m.txt`), text);
  calls.push(`${sheet}-m gpt-image-2.5-sunburst low ${sheet.startsWith("pasture-sheep-a") || sheet.startsWith("pasture-cow") || sheet === "pasture-sheep-b" ? "1536x1024" : "1536x1024"} prompts/scenery/${sheet}-m.txt work/out/${sheet}.png`);
}
{
  const [sheet, n, k, w] = EWE;
  const text = `The attached picture is a sprite sheet of ${n} items in one row from a cozy 2D town game, sheep and their kin. Redraw the same sheet with every item in exactly the same place on the canvas, at the same size, in the same three-quarter top-down view facing the lower right, with the same chunky pixel size, the same thick dark outline and the same cute style with big shiny dark eyes.

Change only this: the ${word[k]} item becomes ${w}, standing in the same place, the same pose and the same size. Every other item stays exactly as it is.

Use the same pixel size as the attached picture: do not make the pixels smaller or larger. Crisp pixel art with hard square pixel edges, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients. Transparent background, no ground, no shadows, no text, no labels.
`;
  fs.writeFileSync(path.join(OUT, `${sheet}-ewe.txt`), text);
  calls.push(`${sheet}-ewe gpt-image-2.5-sunburst low 1536x1024 prompts/scenery/${sheet}-ewe.txt work/out/${sheet}.png`);
}
fs.mkdirSync(path.join(HERE, "work", "pasture"), { recursive: true });
fs.writeFileSync(path.join(HERE, "work", "pasture", "calls-males.txt"), calls.join("\n") + "\n");
console.log(calls.length, "calls");
