// The pasture's bag icons (docs/plans/animals/ART-NEEDED.md "Icons"): writes prompts/icons/icons-pasture-<sheet>.txt on
// the owner's ICON SHEET template (ART_WORKFLOW), six to a sheet, and lists each sheet's gen.mjs call (with the reference
// of its line) in work/pasture/calls-icons.txt for one Codex read. An icon's name is its item's id
// (lib/town/animal-items.ts, lib/town/gifts); a dish's pot is "pot" and the dish's id. Codex's batch read
// (2026-10-20-04-46-52-art-19820) gave each family one silhouette (every egg, every fleece, every milk bottle the same
// shape), the duckweed as a floating mat, and the star to the legend dishes' pots; its words are these.
//
//   node pasture-icons.mjs
import fs from "node:fs";
import path from "node:path";

const HERE = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const STAR = ", one small golden four-pointed sparkle star at its upper right corner";
const OPEN = (where) => `Use the attached picture only as the reference for the pixel art style, the colours and the thick dark outline of a cozy 2D town game. Draw a new sprite sheet of small icons for ${where} of that game, in the same pixel art style.`;
const GRID = (lead) => `Each icon is drawn on its own 16 by 16 pixel grid, scaled up big so every pixel of the icon is a large crisp square, all icons the same size, simple and bold so they read clearly when shown small, with a thick dark outline and two or three tones per colour.${lead ? ` ${lead}` : ""} Six icons in one row across the canvas, evenly spaced with wide empty gaps between them, not touching, not overlapping:`;
const CLOSE = "Crisp pixel art with hard square pixel edges, no anti-aliasing, no blur, no gradients, no glow. Transparent background, no frames or boxes around the icons, no shadows, no text, no letters, no numbers.";
const POT_OPEN = "Use the attached picture only as the reference for the pixel art style, the colours and the thick dark outline of a cozy 2D town game. Draw a new sprite sheet of big cooking pots full of food for that game's kitchen, in the same pixel art style.";
const POT_GRID = "Every one is the same big round red-brown clay cooking pot with two small handles, seen from the front and a little above so that the food inside shows over its rim, with a little steam. Each is drawn on its own 18 by 18 pixel grid, scaled up big so every pixel is a large crisp square, all the pots the same size and shape, simple and bold so they read clearly when shown small, with a thick dark outline and two or three tones per colour. Only the food differs. Six pots in one row across the canvas, evenly spaced with wide empty gaps between them, not touching, not overlapping:";
const POT_CLOSE = "Crisp pixel art with hard square pixel edges, no anti-aliasing, no blur, no gradients, no glow. Transparent background, no frames or boxes, no shadows, no table, no ground, no text, no letters, no numbers.";

const GOODS = "work/out/icons-items-e.png", DISH = "work/out/icons-items-ap.png", POTS = "work/out/icons-pots-p.png", WILD = "work/out/icons-items-bd.png", GIFT = "work/out/icons-mining-a.png";
/** [sheet, where, reference, the line before the list, [id, words] x 6] */
const SHEETS = [
  ["eggs-a", "the farm animals' eggs kept in the bag", GOODS, "Every egg across all three egg sheets has the same plump upright shell silhouette, width and height, seen from the side; only its shell colours, markings and small identifying accents differ.", [
    ["farmEgg", "a pale brown egg with a wisp of golden straw stuck to its shell"], ["silkieEgg", "a soft cream egg"], ["blueEgg", "an egg with a pale sky-blue shell"],
    ["chocolateEgg", "an egg with a dark chocolate-brown shell speckled with darker freckles"], ["lanternEgg", "an amber egg with a round pale yellow patch in its middle like a warm light inside"], ["cloudEgg", "a milk-white egg resting on two small white cloud puffs"]]],
  ["eggs-b", "the farm animals' eggs kept in the bag", GOODS, "Every egg across all three egg sheets has the same plump upright shell silhouette, width and height, seen from the side; only its shell colours, markings and small identifying accents differ.", [
    ["goldenEgg", "an egg with a shining gold shell and a few bright pale yellow highlight pixels"], ["emberEgg", `a red-orange egg crackled with dark lines like a glowing ember, with tiny bright yellow spark pixels on it${STAR}`], ["duckEgg", "a white egg with a faint blue tint"],
    ["runnerEgg", "a creamy white egg"], ["cayugaEgg", "an egg with a dark grey-green shell"], ["mandarinEgg", "a cream egg dotted with soft orange spots"]]],
  ["eggs-c", "the farm's eggs and dairy kept in the bag", GOODS, "Every egg across all three egg sheets has the same plump upright shell silhouette, width and height, seen from the side; only its shell colours, markings and small identifying accents differ.", [
    ["rainEgg", "a pale blue egg with an opaque shell, a wavy darker blue water line across its middle"], ["moonEgg", "a pearl-white egg with a pale yellow crescent moon on its shell"], ["paperEgg", "a white egg with an angular paper-pleat pattern on its shell in grey lines"],
    ["leviathanEgg", `a deep sea-blue egg patterned with small teal scales${STAR}`], ["cream", "thick white cream heaped in a small brown earthenware cup"], ["butter", "a pale yellow block of butter half wrapped in white cloth tied with string"]]],
  ["wool-a", "the wool shorn from the farm's sheep", GOODS, "Every fleece across both wool sheets has the same soft round tuft silhouette, width and height; only its colour and internal curl pattern differ.", [
    ["wool", "a soft white tuft"], ["shetlandWool", "a tuft in patches of brown, fawn and grey"], ["jacobWool", "a tuft patched black and white"],
    ["valaisWool", "a white tuft filled with bold fluffy curls"], ["dandelionWool", "a cream fleece tuft with pale yellow centres in its fluffy lobes like dandelion seed heads"], ["rainbowWool", "a tuft in seven bands of colour from red to violet"]]],
  ["wool-b", "the farm's wool and what is knitted of it", GOODS, "Every fleece across both wool sheets has the same soft round tuft silhouette, width and height; only its colour and internal curl pattern differ.", [
    ["starWool", "a deep-blue tuft of fleece with three pale yellow four-pointed stars in it"], ["goldenWool", `a shining golden tuft of fleece with a bold curl inside${STAR}`], ["yarn", "a soft white ball of yarn with a loose end"],
    ["woolScarf", "a folded cream scarf knitted in cables, fringed at its end"], ["rainbowScarf", "a folded scarf knitted in seven-coloured stripes, fringed at its end"], ["starScarf", "a folded deep-blue scarf with pale yellow stars, fringed at its end"]]],
  ["milk-a", "the farm cows' milk kept in the bag", GOODS, "All eight breed milks across both milk sheets use the same upright glass bottle silhouette, width and height; only the contents, closure colours and collar markings differ.", [
    ["farmMilk", "thick white milk in a glass bottle, its mouth tied with white muslin"], ["jerseyMilk", "rich cream-coloured milk in a glass bottle with a deeper yellow layer at its top"], ["highlandMilk", "white milk in a glass bottle with a broad brown wooden collar tied with rope"],
    ["swissMilk", "white milk in a glass bottle with a brown cork stopper"], ["strawberryMilk", "pale pink milk in a glass bottle with a small red strawberry on its label band"], ["cocoaMilk", "dark brown milk in a glass bottle with a cream cap"]]],
  ["milk-b", "the farm's milk and goods kept in the bag", GOODS, "All eight breed milks across both milk sheets use the same upright glass bottle silhouette, width and height; only the contents, closure colours and collar markings differ.", [
    ["flowerMilk", "white milk in a glass bottle with tiny pink and yellow petals floating in it"], ["starMilk", `midnight-blue milk in a glass bottle with pale yellow star specks in it${STAR}`], ["farmCheese", "a round cheese with a pale yellow rind and one wedge cut out, cream inside"],
    ["goldenScarf", `a folded scarf knitted of shining golden thread, fringed at its end${STAR}`], ["prism", "a clear pale blue crystal bar with a small band of rainbow colours shining from one end, in solid colour stripes"], ["packedRation", `a dense square block of fodder wrapped in silvery grey-green leaves tied with a grass string${STAR}`]]],
  ["feed-a", "the farm animals' feed kept in the bag", GOODS, "", [
    ["chickFeed", "a cream cloth bag open at the top, full of golden mixed grain, a small yellow chick painted on it"], ["duckFeed", "a cream cloth bag open at the top, full of pale green pellets and waterweed, an orange duck footprint painted on it"], ["sheepFeed", "a yellow bale of hay tied with two brown strings"],
    ["cowFeed", "a brown burlap sack of hay and cracked yellow corn, a black and white cow-spot patch sewn on it"], ["chickGrow", "a small brown paper bag folded at the top, fine pale yellow crumbs spilling in front of it"], ["duckGrow", "a small brown paper bag folded at the top, fine green crumbs spilling in front of it"]]],
  ["feed-b", "the farm animals' feed and tools kept in the bag", GOODS, "", [
    ["lambGrow", "a small glass milk bottle with a red rubber teat"], ["calfGrow", "a big glass milk bottle with a blue rubber teat"], ["dewGrow", `a small brown earthen cup of crushed green clover beaded with clear white dew drops${STAR}`],
    ["cowBell", "a brass cow bell hanging from a red leather strap with a small buckle"], ["milker", "a hand-pump milking machine: a brass pail with two wooden pump handles and two black rubber hoses"], ["woolShears", "a pair of curved steel sheep shears with rope-wrapped wooden handles"]]],
  ["tool-a", "the farm's tools kept in the bag", GOODS, "", [
    ["eggBasket", "a wicker basket lined with red and white gingham cloth puffing over its rim"], ["churn", "a tall wooden barrel butter churn bound with iron hoops, a wooden dasher sticking out of its lid"], ["cheesePress", "a small wooden cheese press: a frame with a big screw pressing a board down into a round mould"],
    ["spindle", "a wooden drop spindle: a slim rod with a round wooden whorl, white yarn wound on it"], ["knittingNeedles", "two wooden knitting needles with round red beads at their heads, crossed through a small knitted cream swatch"], ["charmHerdBell", "a small silver hand bell with a green ribbon bow and a tiny golden clover charm"]]],
  ["gift-a", "the gifts a farmer earns in that game, kept as charms and keepsakes", GIFT, "", [
    ["thingBarnCat", "an orange tabby cat curled up asleep on a small round straw cushion"], ["thingWarmBottle", "a baby milk bottle in a knitted red cosy with a small white heart on it"], ["charmStarCollar", "a red leather animal collar buckled in a ring, a golden star tag hanging from it"],
    ["thingCradle", "a small round wooden cradle on rockers with a patchwork quilt"], ["famCloudRam", "a fluffy white cloud sheep with pale blue shading, curled pale gold horns and a red double saddle"], ["thingTwinCradle", "a wooden cradle on rockers with two little pillows side by side and two small pink hearts on its side"]]],
  ["wild-a", "the meadow's wild forage that farm animals eat, each a small clump of the plant as it is picked", WILD, "", [
    ["mistVetch", `a clump of pale purple vetch flowers beaded with little white mist drops${STAR}`], ["ghostReed", `a clump of pale silver-grey reeds with white tips${STAR}`], ["dewClover", `a clump of three-leaved green clover covered in round white dew drops${STAR}`],
    ["dawnOats", `a bunch of oat sprays tinged pink and gold${STAR}`], ["meadowOats", "a bunch of drooping straw-coloured oat sprays"], ["sweetTimothy", "a clump of long grass with soft green cylindrical seed spikes"]]],
  ["wild-b", "the meadow's wild forage that farm animals eat, each a small clump of the plant as it is picked", WILD, "", [
    ["sunAlfalfa", "a clump of bright green alfalfa with little purple flowers"], ["pondMillet", "green stalks bowed under heads of round cream millet seeds"], ["copperSedge", "a clump of slim sedge leaves the copper orange of afternoon sun"],
    ["orchardPea", "a sprig of vine with plump pale green pea pods hanging from it"], ["amberClover", "a clump of orange-green clover leaves with one round amber flower"], ["reedSeed", "a few reed stems with soft fluffy brown seed plumes"]]],
  ["wild-c", "the meadow's wild forage and a farmer's keepsakes", WILD, "", [
    ["lanternGrass", "a clump of grass with round pale yellow seed heads like tiny lanterns"], ["velvetVetch", "a clump of soft fuzzy dark green vetch leaves with one deep purple flower"], ["moonOats", "a bunch of pale silver oat sprays"],
    ["nightDuckweed", "a compact floating mat of broad green duckweed leaves with lighter green centres, no water or puddle underneath"], ["thingHarp", "a small wooden harp with golden strings and green vine leaves twined round its frame"], ["thingSpringWind", "a curling ribbon of pale green spring wind carrying three pink blossoms, all solid shapes"]]],
  ["dish-a", "dishes cooked from farm eggs and milk, each in its own dish", DISH, "", [
    ["custard", "a smooth pale yellow egg custard in a white china cup"], ["pancakes", "a stack of three golden pancakes on a white plate, a pat of butter melting on top"], ["cheesecake", "a slice of cream cheesecake with a golden crust edge on a small plate"],
    ["butterCookies", "round golden butter cookies in an open round blue tin"], ["quiche", "a round crisp tart filled with golden egg and melted cheese"], ["lanternCustard", "an amber pudding on a small dish with a round pale yellow centre like a warm light inside"]]],
  ["dish-b", "dishes cooked from farm eggs and milk, each in its own dish", DISH, "", [
    ["cloudSouffle", "a tall white souffle risen high like a cloud above a white ramekin"], ["goldenOmelette", "a folded omelette of shining gold with bright pale yellow highlights on a white plate"], ["emberBakedEggs", `two eggs baked in red tomato sauce in a small black iron pan, a few tiny orange sparks over it${STAR}`],
    ["rainBroth", "a blue bowl of clear soup with green waterweed and a round egg floating like a raindrop"], ["moonPudding", "a pearl-white pudding shaped like a crescent moon on a dark blue plate"], ["paperFish", "a fish baked in a cream paper parcel folded like a little boat"]]],
  ["dish-c", "dishes and keepsakes of the farm", DISH, "", [
    ["leviathanEggCup", `a sea-blue steamed egg custard in a small cup with a pink prawn on top${STAR}`], ["strawberryShake", "a tall glass of pink shake with a red and white striped straw"], ["hotCocoa", "a mug of hot brown cocoa with three white marshmallows floating"],
    ["flowerLatte", "a cup of milky coffee with a white flower drawn in its foam"], ["starPudding", `a midnight-blue pudding speckled with pale yellow stars on a small plate${STAR}`], ["thingHayWagon", "a small wooden hay wagon on two wheels piled high with golden hay"]]],
];
const POTSHEETS = [
  ["pots-a", [["potCustard", "full of smooth pale yellow egg custard"], ["potPancakes", "holding a tall stack of golden pancakes with butter melting on top"], ["potCheesecake", "holding a round cream cheesecake with a golden edge"],
    ["potButterCookies", "heaped with round golden butter cookies"], ["potQuiche", "holding a golden egg and cheese tart standing up over the rim"], ["potLanternCustard", "full of amber pudding with a round pale yellow centre like a warm light inside"]]],
  ["pots-b", [["potCloudSouffle", "with a tall white souffle risen high over the rim like a cloud"], ["potGoldenOmelette", "holding a big folded omelette of shining gold"], ["potEmberBakedEggs", `full of red tomato sauce with eggs baked in it and a few tiny orange sparks${STAR}`],
    ["potRainBroth", "full of clear pale blue soup with green waterweed and a round egg floating"], ["potMoonPudding", "full of pearl-white pudding with a pale yellow crescent moon on top"], ["potPaperFish", "holding a cream paper parcel folded like a boat with a fish tail showing"]]],
  ["pots-c", [["potLeviathanEggCup", `full of sea-blue steamed egg custard with pink prawns on top${STAR}`], ["potStrawberryShake", "full of pale pink strawberry shake with a red strawberry on top"], ["potHotCocoa", "full of hot brown cocoa with white marshmallows floating"],
    ["potFlowerLatte", "full of milky coffee with a white flower drawn in its foam"], ["potStarPudding", `full of midnight-blue pudding speckled with pale yellow stars${STAR}`], ["_potCustard", "full of smooth pale yellow egg custard"]]],
];
const out = path.join(HERE, "prompts", "icons");
const calls = [];
for (const [sheet, where, ref, lead, items] of SHEETS) {
  const list = items.map(([, w], i) => `${i + 1}) ${w}`).join("; ") + ".";
  fs.writeFileSync(path.join(out, `icons-pasture-${sheet}.txt`), `${OPEN(where)}\n\n${GRID(lead)}\n${list}\n\n${CLOSE}\n`);
  calls.push(`icons-pasture-${sheet} gpt-image-2.5-sunburst low 1536x1024 prompts/icons/icons-pasture-${sheet}.txt ${ref}`);
}
for (const [sheet, items] of POTSHEETS) {
  const list = items.map(([, w], i) => `${i + 1}) the pot ${w}`).join("; ") + ".";
  fs.writeFileSync(path.join(out, `icons-pasture-${sheet}.txt`), `${POT_OPEN}\n\n${POT_GRID}\n${list}\n\n${POT_CLOSE}\n`);
  calls.push(`icons-pasture-${sheet} gpt-image-2.5-sunburst low 1536x1024 prompts/icons/icons-pasture-${sheet}.txt ${POTS}`);
}
fs.mkdirSync(path.join(HERE, "work", "pasture"), { recursive: true });
fs.writeFileSync(path.join(HERE, "work", "pasture", "calls-icons.txt"), calls.join("\n") + "\n");
// the build-icons.mjs entries (names in their order on the sheet)
for (const [sheet, , , , items] of SHEETS) console.log(`  ["icons-pasture-${sheet}", ${JSON.stringify(items.map(([id]) => id))}],`);
for (const [sheet, items] of POTSHEETS) console.log(`  ["icons-pasture-${sheet}", ${JSON.stringify(items.map(([id]) => id))}],`);
