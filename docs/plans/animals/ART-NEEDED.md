# The animal line: every picture the page names (for the art piece)

The page piece (branch `animals-page`, 2026-10-20) draws the pasture through **one mapping of names**,
`lib/town/pasture-art.ts`. Until a name is in the pasture's sheet, the page draws a plain stand-in
(`components/town/pasture-draw.ts`, each marked `// ART:`), and item icons fall back to a like icon
(`lib/town/animal-icons.ts`). Nothing below exists yet; the art piece makes them with the owner's workflow
(AGENTS.md "Cash Town image generation": read `.claude/skills/fc-cash-town/scripts/pixel/ART_WORKFLOW.md` and its README
first; gen.mjs + `codex-ask.mjs art`, PixelLab for facings and frames as agreed in the README's round 5).

**State, 2026-10-20 (branch `animals-art`; the pixel README's "The pasture" has how each was made).** In the sheet and the
atlas: the barn hen (every frame), the ox; the barn and its three fronts, the coop, the nursery, the troughs, the nest,
the stall, the table, the gate, the wagon, the wagon stop, eggs out, the grazed tuft, the bubbles; Uncle Popoto on the
map and in his talk; the three games' scenes and pieces; all 119 icons (a forage spot draws its plant's icon). Waiting
on the owner's new designs: every other animal and the young (animals get a sex; their gen.mjs bases and some PixelLab
frames are made and kept in the shared work/), the shorn sheep, the cloud ram (`pa_ram_*`), the walk-in barns of the
new layout (the buildings above may be replaced by it), `pa_harpNotes` and `pa_windGust` (the page draws neither).
The glint over eggs out is a light, made in code. The games show each breed's own picture, so `mg_milk_cow`,
`mg_milk_cowShift`, `mg_eggs_hen`, `mg_shear_sheep` and `mg_shear_fleece` are not drawn (pasture-art's GAME_ART).

**How to drop them in.** Build a sheet `public/town/pasture.json` + its picture with the scenery script
(`--set pasture`), same JSON shape as `public/town/scenery.json` (`image`, `size`, `props: { name: [x, y, w, h, anchorX?, anchorY?] }`).
`loadPastureArt()` fetches it once; every `kit.has(name)` then draws the picture instead of the stand-in, anchored at
the feet (a tile's point, as the town's props are). Item icons go into the icon atlas (`lib/town/icon-atlas.json`)
under the item's own id; `iconOf` uses an atlas icon by its id before any stand-in.

Sizes below are in the map's own pixels at scale 1 (the town's tile is 64 × 32). Keep the town's pixel scale (one art
pixel = one map pixel, as the barn, the fence and the dolls are drawn), its palette, its light from the upper left,
and its depth: nothing pasted on (AGENTS.md "Game art quality").

## 1. Animals (`an_*`)

`animalSprite(species, breed, stage, facing, frame)`:

- grown: `an_<breed>_adult_<facing>_<frame>`, for each of the 32 breeds (lib/town/animals' BREEDS, with their `looks`);
- young, by species whatever the breed: `an_<species>_baby_<facing>_<frame>` and `an_<species>_young_<facing>_<frame>`
  (species: chicken, duck, sheep, cow);
- a shorn sheep, by breed: `an_<breed>_shorn_<facing>_<frame>` (named in `shornSprite`; the page does not show shorn
  sheep yet: a fleece's regrowth is the round, so it can be drawn from the sheep's round when the pictures come).

Facings: `SE`, `SW` (used now: the page turns them by the way they go across the screen), `NE`, `NW` (to come).
Frames: `idle`, `walk1`, `walk2`, `eat` (head down), `sleep` (lying down, eyes shut), `happy` (petted, a heart), and
`swim` (ducks only: what shows above the water).

| species | grown length | young | baby | stand-in now |
|---|---|---|---|---|
| cow | ~62 px long, ~44 tall | ×0.74 | ×0.55 | white body with spots, legs, head, horns |
| sheep | ~44 px long, ~36 tall (the fleece round) | ×0.74 | ×0.55 | puffs of fleece, dark legs and face |
| chicken | ~19 px long, ~18 tall | ×0.74 | ×0.55 | body, comb, beak |
| duck | ~20 px long, ~18 tall | ×0.74 | ×0.55 | body, orange bill |

Babies: a chick, a duckling, a lamb, a calf; the young: a pullet, a young duck, a hogget, a heifer (SPECIES' words).
Every breed's look is in its `looks` line (th/en), which the book and the cards show beside the picture.
The cloud ram (the familiar, rank 6): `pa_ram_walk1`, `pa_ram_walk2`, `pa_ram_idle` (~48 px long, a puff of cloud with
curled horns, with a saddle for TWO riders: the page lifts the rider 24 px and the passenger sits 11 px behind).

## 2. The pasture's things (`pa_*`)

| name | what | about |
|---|---|---|
| `pa_barn` | the barn (cows, sheep), door on the side that faces the lanes (+y, the screen's lower left) | footprint 9 × 6 tiles, ~150 px tall |
| `pa_barnFront1..3` | the three barn fronts a member buys (cosmetic: blue, green, violet now) | as the barn |
| `pa_coop` | the coop (chickens, ducks), its door to the lanes | 6 × 4 tiles, ~100 px tall |
| `pa_nursery` | the nursery hut beside the coop | 3 × 3 tiles, ~70 px |
| `pa_trough`, `pa_troughFed` | a feeding trough, empty and filled | 2 tiles long, ~16 px tall |
| `pa_villageTrough` | the village water trough at the crossing | 2 tiles |
| `pa_nest`, `pa_nestEgg` | the breeding nest of straw at the barn door, and an egg in it (one per child coming) | 1 tile |
| `pa_stall` | Uncle Popoto's stall: a counter with a green-and-cream awning, young animals in a crate | 3 tiles across, ~60 px |
| `pa_table` | the making table (churn, press, spindle on it) | 2 tiles |
| `pa_gateShut`, `pa_gateOpen` | the village gate: two posts and a field gate of three bars, shut across or swung in toward the meadow | 3 tiles wide |
| `pa_wagon` | the hay wagon (a bed of hay on two wheels, room for riders) | ~70 px long |
| `pa_ox_walk1`, `pa_ox_walk2`, `pa_ox_idle` | the ox that draws it | ~50 px long |
| `pa_wagonStop` | the sign at each map's stop (a signpost stands in) | |
| `pa_eggOutside`, `pa_eggGlint` | eggs laid out in the grass; the glint for their owner under the herd bell | ~12 px |
| `pa_forage`, `pa_forageTaken` | a meadow forage spot (a clump with flowers of the band's plant), and taken | ~16 px |
| `pa_bubbleHungry`, `pa_bubbleReady`, `pa_bubbleCare` | bubbles over an animal: hungry (empty bowl), ready (its produce), a friend's hungry one (a heart) | ~18 px round |
| `pa_harpNotes`, `pa_windGust` | the harp's notes over those it plays for; the spring wind across the farm (named, not drawn yet) | |

The fence and the rim's woods use the town's own scenery (`fence` mirrored along the pasture's first row, `tree`,
`pine`, `bush`) and need nothing new.

## 2b. The animal farm of round 6 (page piece round 2, branch `animals-page2`, 2026-10-20)

The farm moved east of the garden (lib/town/pasture.ts): global x 188..239 beside the garden's rows 0..85. What the
next art round draws for it, on these footprints (tiles are the map's 64 × 32; the town's pixel scale, light from the
upper left; nothing pasted on):

- **24 barns, each 8 × 4 tiles** (8 along x, the screen's down-right; 4 along y), `BARNS[i]` = west column
  `[196, 205, 217, 226][i % 4]`, north row `[5, 16, 27, 47, 58, 69][i / 4 | 0]`. The old `pa_barn` fits it now (drawn
  at 0.84 so its walls' foot is the footprint; `BUILDING_FIT`), its door on the long face that looks +y (the screen's
  lower left). **Door**: the middle two tiles of the front row, `(x+3, y+3)` and `(x+4, y+3)`; a barn is walked into
  and out of only straight through them (from `(x+3|x+4, y+4)`). Wanted: `pa_barnDoorOpen` (the doors slid aside, the
  barn dark inside; the page draws a stand-in over the closed door now, its quad measured on pa_barn:
  pasture-draw's `BARN_DOOR`), and the three fronts as before.
- **The inside**, shown to whoever stands in the barn (its roof and walls fade off as the cooking yard's house does):
  `pa_barnInside`, the floor and the two back walls (the -y wall along x, the -x wall along y) for an 8 × 4 floor, the
  front walls cut down to a low sill with the door's gap. No stalls (the owner: "ในคอกสัตว์ไม่ต้องมี รั้วแยกแต่ละสัตว์").
  Two things stand on the floor and stop a walker: the **nest** (front row's east tile `(x+7, y+3)`, `pa_nest` /
  `pa_nestEgg`, art exists) and **hay** (front row's west tile `(x, y+3)`, the town's `hay` at 0.7 now).
- **One trough** along the back wall (row `y`, against the wall at the barn's north edge), laid as **[left end][slot ×
  room][right end]**: a slot is **1 tile** wide, an end **half a tile**; centred on the wall, so 2 slots run
  x+2.5..x+5.5 and 4 slots x+1.5..x+6.5; depth about 0.45 of a tile (lib/town/pasture's `TROUGH`, `troughOf`). Pieces,
  each standing by its middle on the wall's foot: `pa_troughLeft`, `pa_troughRight`, `pa_troughSlot` (empty) and
  `pa_troughSlot_<species>_<half|full>` (chicken, duck, sheep, cow: each its own sack's feed): pasture-art's
  `TROUGH_ART`. The page's stand-in draws the same shape until they come.
- **The fence and its two wide gates**: the fence down x 188 (rows 1..18, 25..60, 67..84; the town's `fence`, along y);
  the gates leave rows 19..24 and 61..66 open, a tall post at each end and a field gate's leaf swung back west along
  the garden's rim: `pa_farmGate` (stand-in now, pasture-draw's `drawGateSide`).
- **Uncle Popoto's pen**: a paddock x 189..192, y 26..31 (`PEN`), a low rail fence round it, whoever waits in it idling
  inside: `pa_penFence` (stand-in now). His stall at (190..192, 17), himself at (191.1, 18.55), the making table at
  (189..190, 14), the village trough at (189..190, 33), the wagon's stop at (191, 24).
- **Males**: `an_<breed>_male_<facing>_<frame>` for a grown male of each breed (rooster, drake, ram, bull), and
  `an_<breed>_male_shorn_<facing>_<frame>` for a shorn ram; the young of either sex look alike (pasture-art's
  `maleSprite`). Until they come a male is drawn by his stand-in (never by the female's picture).
- **Shorn sheep**: `an_<breed>_shorn_<facing>_<frame>`, shown after a shearing while its fleece is less than half
  grown back (the page reads it from the round).

## 3. Uncle Popoto

- On the map: `pp_stand`, `pp_wave`, `pp_show` (holding up a chick), `pp_laugh`: a popoto like the uncle, the banker and
  the smith, in a farmer's straw hat and a green apron (the uncle's frames stand in, with a drawn straw hat).
- In a talk: `tk_popoto`, `tk_popoto_o` (quiet, talking), the talk box's portrait size as `tk_uncle` (the uncle's stand in).

## 4. The three games (`mg_*`, each its own scene: never a reskin of another board)

All are drawn on a 320 × 240 board.

- Milking, in the barn's warm stall: `mg_milk_barn` (scene), `mg_milk_cow` (the cow from the side, ~150 px long),
  `mg_milk_cowShift` (her shifting), `mg_milk_pail`, `mg_milk_handleL`, `mg_milk_handleR` (the hand-pump milker's two
  handles), `mg_milk_gauge`, `mg_milk_needle` (the pressure needle), `mg_milk_splash`.
- The coop's eggs: `mg_eggs_coop` (scene), `mg_eggs_box` (a nest box with straw, five in a row), `mg_eggs_hen`
  (peeping over a box), `mg_eggs_egg`, `mg_eggs_basket` (padded, red gingham), `mg_eggs_crack`, `mg_eggs_straw`.
- Shearing, in the pen: `mg_shear_pen` (scene), `mg_shear_sheep` (~200 px, standing calm), `mg_shear_fleece`
  (the fleece with its swirl, to be cut away along the trace), `mg_shear_shears`, `mg_shear_nick`, `mg_shear_tuft`.

## 5. Icons (the icon atlas, by item id; stand-in in brackets)

- **goods** (51): farmEgg, silkieEgg, blueEgg, chocolateEgg, lanternEgg, cloudEgg, goldenEgg, emberEgg, duckEgg,
  runnerEgg, cayugaEgg, mandarinEgg, rainEgg, moonEgg, paperEgg, leviathanEgg [egg]; wool, shetlandWool, jacobWool,
  valaisWool, dandelionWool, rainbowWool, starWool, goldenWool [feather]; farmMilk, jerseyMilk, highlandMilk, swissMilk,
  strawberryMilk, cocoaMilk, flowerMilk, starMilk, cream [milk]; butter, farmCheese [cheese]; yarn, woolScarf,
  rainbowScarf, starScarf, goldenScarf [thingSack]; prism [crystalLens]; chickFeed, duckFeed, sheepFeed, cowFeed,
  packedRation [thingSack]; chickGrow, duckGrow, lambGrow, calfGrow [bottle]; dewGrow [bowl].
- **tools** (7): milker [bucket], woolShears [shears], eggBasket [basket], churn [bucketIron], cheesePress [cheese],
  spindle, knittingNeedles [floatQuill].
- **wild** (16, the meadow's forage): mistVetch, ghostReed, dewClover, dawnOats, meadowOats, sweetTimothy, sunAlfalfa,
  pondMillet, copperSedge, orchardPea, amberClover, reedSeed, lanternGrass, velvetVetch, moonOats, nightDuckweed [clover].
- **dishes** (17): custard, pancakes, cheesecake, butterCookies, quiche, lanternCustard, cloudSouffle, goldenOmelette,
  emberBakedEggs, rainBroth, moonPudding, paperFish, leviathanEggCup, strawberryShake, hotCocoa, flowerLatte,
  starPudding [bowl]; and each its pot, `pot<Dish>` (as every dish has).
- **scrolls**: the 17 dish scrolls and 28 breed scrolls (`scrollBreed<Species><letter>`) use the town's `scroll`.
- **gifts** (10): charmHerdBell [charmBell], thingBarnCat [thingBasket], thingWarmBottle [bottle], charmStarCollar
  [charmGloves], thingCradle [basket], famCloudRam [famCloud], thingTwinCradle [thingBasket], thingHarp [thingFlute],
  thingSpringWind [charmWind], thingHayWagon [waterCart]; and the line's icon `cowBell` [charmBell].
