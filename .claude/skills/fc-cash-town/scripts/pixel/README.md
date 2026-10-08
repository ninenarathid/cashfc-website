# Cash Town's pixel avatars (live art pipeline, 2026-10-02)

**The official set** (the user, 2026-10-02: "เอาข้อมูล ทรงผม ชุด lalafell มา … ทรงผมแบบ starter และชุดเริ่มต้น lalafell เหมือนเดิม ffxiv official"):
- **Bodies wear the Lalafellin attire**, the race's starter outfit: `<g>-starter-*`, in-place edits of the bald sheets (`prompts/o-starter-*`), described in words from reference pictures that were never sent to the model.
  - Girls: a white kaftan dress, a brown embossed vest, a red cowl, a flowered pouch, bloomers and boots.
  - Boys: a white tunic, a studded brown vest, a navy cowl, a buckled belt, olive gaskins and top boots.
  - `f-starter-back` had to be made from `m-starter-back`: edits of the girl's back came out 6–8 px taller.
- **Hairstyles are the character creator's own:**
  - 13 per gender, plus the girls' curly bobble pigtails. The ids `f01`–`f14` and `m01`–`m13` follow the creator's order.
  - Found through XIVAPI (`CharaMakeType` 8/9, menu `Lobby` 234 → `CharaMakeCustomize` FeatureID 1–13, 51–53); their icons were looked at and described in words (`gen-official.sh`).
  - All are drawn on `f-bald`, so they share the skull.
- **Accessories** (white bands and ribbons, pink bobbles) come with the hair overlay: anything the hairstyle added outside the bald silhouette, or, over the skull above the chin, light or clearly different colours. Below the chin, only ties next to the hair and never the tunic's colours.
- **The chin cut** is found on the skull's raw colours, before any palette. Dark eye pixels once passed for tunic blue and cut every face at the eyes.
- **Two palettes:** bodies and heads. In one shared palette the girl's red cowl drowned among the hair sheets' greens.

Chibi pixel Lalafell made with the OpenAI image API (`gpt-image-2.5-sunburst`,
quality `low`, 1536x1024) and turned into true pixel art. Their output,
`public/town/pixel-<hash>.png` + `pixel.json`, is drawn by
`lib/town/pixeldoll.ts`.

Spike demo: [Pixel Lalafell Spike](https://claude.ai/artifact/Uetw3Y3U1iCnDn4Z9qdpdh).

## Files

| File | What it does |
|---|---|
| `gen.mjs` | One API call: `node gen.mjs <name> <model> <quality> <size> <prompt.txt> [ref.png ...]` |
| `gen-hairs.sh` | Hairstyle sheets as in-place edits: `./gen-hairs.sh <g> <hair> [<g> <hair> ...]` |
| `build-scenery.mjs` | The town's scenery; `--set forest` the forest's own sheet; `--set kitchen` the cooking screen's (`public/town/kitchen.json`). In a worktree pass `--out <tree>/public/town` (the default writes into fcnext's), and link `work` to fcnext's so that the ledger is the one ledger (`mklink /J work …cnext…pixelwork`) |
| `build-pixel-atlas.mjs` | `work/out` → `public/town` (`--out <dir>` to try elsewhere; `--poses` adds sit, sleep and wave) |
| `gen-race.mjs`, `build-race-atlas.mjs`, `race-data.mjs` | The other seven races: sheets, picture, and what the wardrobe offers (see the last section) |
| `checks/` | Audits and close-ups of the built dolls, and the town's sky in a headless browser (see the last section, and SKILL.md) |
| `pxlib.mjs` | Grid, cells, palette, shapes |
| `pixelize.mjs`, `anim.mjs` | The spike's one-sheet tools |
| `work/` | Sheets, ledger, debug pictures. Git-ignored by its own `.gitignore`; back it up, the sheets cost money. |
| `prompts/` | Every prompt used |

## Running it

- **The key** is `OPENAI_API_KEY` in fcnext/.env.local. It is never printed.
- **Every call** is logged in `work/ledger.jsonl` with its cost, worked out from the returned usage: $8 per 1M image-input tokens, $30 per 1M image-output tokens, $5 per 1M text tokens. About $0.018 a call.
- **Budget:** `gen.mjs` stops within $0.50 of `BUDGET` ($25 since the owner topped it up, 2026-10-02; `work/ledger.jsonl` has what is spent).
- **Rate limit:** a new account may send 5 reference pictures a minute. `gen.mjs` waits as the 429 says and tries again, and `gen-hairs.sh` runs one call at a time.

## The sheets (`work/out/<g>-<hair>-<type>.png`)

Every sheet is an in-place edit of another, so the figures line up. Pass the
original full-size sheet as the only input, with "edit the attached sheet, keep
everything where it is, change only …". A small upscaled strip makes the model
relayout with bigger pixels.

- **`type`:**
  - `front`: walk, 4 frames, 3/4 to the viewer's right;
  - `back`: walk, 4 frames, 3/4 away to the right;
  - `poses`: sit front, sit back, sleep, wave.
- **Where each sheet comes from:**
  - `f-twin-*`: the user's own character (the originals: walk-sun-low, walk-back-low, poses-low);
  - `f-bald-*`: those, with all the hair removed (`prompts/base-bald-*`);
  - `m-bald-*`: the girl turned into a boy (`prompts/base-male-*`). This uses the boyish-face fix: a grin, thick brows, no lashes, a straight tunic;
  - `f-neutral-front`: the girl's calm face (a short flat mouth, no smile) on `f-bald-front` (`prompts/face-neutral-f.txt`);
  - `m-face-front`: the boy's face (short thick brows, no lashes, a flat mouth) on that **same skull** (`prompts/face-neutral-m.txt`);
  - `f-<hair>-*`: the hairstyle added to `f-bald-*` (`prompts/hair.txt`). This is the only hair walking uses;
  - `m-<hair>-*`: the same on the boy. Only the poses use these.
- **Key colours:** hair is one bright green shaded with greens, so it can be recoloured; eyes stay violet. Ribbons are brown and stay brown.

## What the builder does

- **Cells:**
  - Each type's grid comes from `f-bald-<type>`. Each sheet's phase is detected, and the cell takes its mode colour.
  - One 96-colour palette is shared by all sheets.
  - `m-bald` is aligned to `f-bald`, and each hairstyle to its own bald sheet, on the body band only.
- **Frames:** figure spans come from `f-bald` (4 per sheet). Whole shapes go to the span holding their centre.
- **Walking is layered:**
  - The body of every step comes from the bald sheet, below the chin cut. The cut is the narrowest row above the first tunic-blue row near the head.
  - **One skull for everybody** (the user, 2026-10-02: the boy's head was a different size from the girl's): `f-bald`'s standing step, above the cut.
  - A head is built per gender × hairstyle × way, from three parts:
    1. that skull with the gender's face (`f-neutral` / `m-face`; the back of the head is the same for both);
    2. the hairstyle's **hair overlay** from `f-<hair>`: green patches of 10+ cells, the dark cells touching them (never next to an eye), the ribbons (twin, pony) and cells the hair surrounds.
  - So every look has the same head size and the same face, and expressions later are just more face sheets.
  - Each step stores where the skull goes on that gender's body, found by matching the skull in that step. So the head moves with the body, and hair and face never shimmer.
  - Grids differ by a cell in width between sheets: copy between them through x and y, never by index.
- **Faces** (front heads with both eyes found):
  - eye cells for a blink: the violet box grown a cell to the sides and up, never hair or its outline;
  - the mouth: halfway from the eyes to the chin, under the middle between them. Most smiles are too faint to find at about 64 px;
  - the skin colour.
  - Every head finds both eyes now that the face is drawn once per gender.
- **Debug pictures:** `work/debug/walk.png` (every gender × hair, all steps) and `faces.png` (from `work/face-preview.mjs`: normal, blink, talk).

## Adding a hairstyle

1. Add a line to `desc()` in `gen-hairs.sh`, then run `./gen-hairs.sh f <id>`. That's 3 calls, about $0.05; both genders wear the girl's sheet. Add `m <id>` only when the boy's poses are needed.
2. Append `<id>` to the end of `HAIRS` in both `build-pixel-atlas.mjs` and `lib/town/look.ts`, after `bald`. Looks are written by index, so the ones people already chose must keep theirs.
3. Run `node build-pixel-atlas.mjs`, look at `work/debug/walk.png`, then run `node ../town-pixel.mjs http://localhost:3100 work/shots`.

## Skin, eye shapes, scenery (2026-10-02)

- **Eye shapes:** `<g>-eyes_<shape>-front` are in-place edits of each gender's face that change only the eyes (`gen-faces.sh`). There are 6 shapes, `round` being the face itself.
- **Skin:**
  - `<g>-skinkey-<view>` is each body with its bare skin painted cyan. A body cell is skin when it is warm and the key is cyan there, so the tan boots, belt and pouch stay put.
  - Faces' skin is their warm cells.
  - All skin is snapped to one 6-colour ramp (`meta.skin`), and nothing else may wear those exact colours. The browser moves the ramp to a picked swatch.
- **Hair alignment:** sheets are lined up by what the hair sits on: the eyes for fronts, the ear tips for backs, both measured on raw colours. Adding hair, the model had moved the head up 2–7 rows, so lining up by the body left hair floating too high ("ทรงผมบางทรง วางไว้สูงเกิน").
- **Three palettes** (bodies, faces, hair): with 54 hair sheets in one palette, the violet eyes were lost.
- **Scenery** (`build-scenery.mjs` → `public/town/scenery-<hash>.png` + `scenery.json`):
  - Props are `scene-props-a` (tree, pine, bush, rock), `scene-props-b` (lamp, bench, flowers, sign) and `scene-fountain`. They were drawn with a character sheet as the pixel-size reference, and their grid is searched only in 4.5–7.5 (a double period halved every prop).
  - The ground is the `tex-<kind>` top-down textures, laid onto the iso ground by `lib/town/scenery.ts` at 32 texture px per tile side.

## Benches, sitting, the shop (2026-10-02)

- **`scene-bench-back`** came back as a whole new sheet: lamp2, barrel, bench_back, planter, sign2. The bench and bench_back are drawn facing SE and NE; the browser mirrors them for SW and NW.
- **`scene-shop-1`** ("whole": every shape one piece) is the shop's first stage.
- **`scene-popoto-workers`** has 6 frames (hammering ×3, carrying a plank ×3), drawn with the site's popoto picture as the reference and standing under their hard hat's middle ("hat"), so they don't wobble.
- **Sitting** uses the starter poses' first two frames (sit front, sit back), resampled by head width (the pose sheets came out ~8% larger) and skinned by `<g>-skinkey-poses`. They are `meta.sit[g][view]`, and their bottom is the seat (`SEAT_LIFT` 12 above a bench's ground point).

## The fountain, animated (2026-10-02)

- `scene-fountain-anim` is four frames drawn in one 3840×1280 image (frames drawn together agree with each other; separate edits would not): the jet high, lower, lowest, rising.
- Their grid is 6.00, so each frame is about 152 px wide, a little larger than the old 132 px fountain.
- "anim" mode gives every later frame the first frame's stone wherever both have stone, so only the water moves.
- The browser plays them 1-2-3-4-3-2 at 150 ms (`FOUNTAIN_LOOP` in scenery.ts). The old single fountain with cycled blues is the fallback.

## Expressions (next)

- Each expression is an in-place edit of `f-neutral-front` (and `m-face-front`) that changes only the face.
- Build the extra heads from the same skull and hair overlays.
- Pick between them at draw time, like the blink and talk faces.

## Known gaps

- **Poses** (sit, sleep, wave) are built (`--poses`) but not in the town yet. Showing them needs a pose in `Doing`.
- **Outfits:** the body layer is the bald sheet, so a new outfit is an in-place edit of the three bald sheets per gender.
  - The chin cut is a single row. A pose with an arm above the head would need a mask.
  - The heads hold the collar row just under the chin, from the base outfit.
- **Skin colour** is not recoloured yet. Skin and cream classes overlap; separate them by key before offering it.

## Scenery, life and icons (2026-10-02)

- `build-scenery.mjs` packs every scenery sheet in `work/out` into `public/town/scenery-<hash>.png` + `scenery.json`: props, the shop, the board, the road works, popoto outings (`popoto-*`, anchored by "body": under the middle of the popoto's brown), critters (`critter-*`), the river's things (`river-things`), the falling leaves (`scene-leaves`), the vote's building pictures (`scene-icons`), and the ground textures. Prompts are in `prompts/scenery/`; the house popoto prompt starts "The first attached picture is the mascot…" with `work/ref-popoto.png` and the workers' sheet as references.
- `build-icons.mjs` cuts the UI icon sheets (`prompts/icons/`, each a row of icons on a 16-pixel grid) into `public/town/icons-<hash>.png` and `lib/town/icon-atlas.json` (imported by `components/town/TownIcon.tsx`). Pieces are assigned to evenly spaced columns, since some icons come in parts.
- A sheet whose transparent pixels carry colour looks like it has a glowing backdrop in a viewer; check its alpha before regenerating.

## The fishing deck, the cooking yard, the farm, and the two shopkeepers (2026-10-03)

- **`scene-pier-1`** ("whole") is the fishing deck's first stage. It took three: 212×121 (kept in `work/out/pier-small/`), 309×180 on a 2304×1536 canvas (`work/out/pier-mid/`), and, when the owner asked for twice that, **619×364 on a 3456×2304 canvas** (the API takes both sizes). Each was drawn with a character sheet for the scale and the one before for the look, and "about one and a half times as large in every direction … use the same pixel size as the second picture"; on the largest canvas the model drew finer pixels instead (5.33 to the pixel, against 7.14), which is what doubled it. `Town.tsx` stands it by its platform's left corner post, measured in the picture's own pixels; a later stage should be an in-place edit of it, stood where it stands (the way `scene-shop-2` is).
- **The picture is 1024 across now** (`W` in `build-scenery.mjs`): at 512 the deck was wider than the picture and was written over its neighbours. The build refuses a piece wider than the picture.
- **`scene-kitchen-1`** ("whole") is the cooking yard's building site. The first was an isometric plot (414×243, a 2304×1536 canvas, kept in `work/out/kitchen-iso/` with its prompt); the owner asked for twice the size, lying across the screen. The second was drawn on a **3840×2160 canvas** (the API takes it) with the first for its materials and `scene-npc-stands` for facing the viewer, and "not turned and not isometric … its front edge and its back edge two straight horizontal lines". The model drew it soft, with no pixel size of its own (4 scores best, 6 next), so the sheet's fifth entry fixes it at **5** (`[5, 5]`): that gives 752×265, its stoves the size they were in the first and the yard twice as long and as deep. It is a little narrower at the back (drawn in perspective); `KITCHEN` in world.ts measures its kerb's corners from the picture (`work/kitchen-scale.mjs` cuts a sheet at several sizes beside the old piece, to choose).
- **`scene-farm-a`** (a 3840×1280 canvas, six in a row): the gateway, a length of fence (it runs from the lower left up to the upper right, along a tile edge; mirror it for the other way), the well, the tool shed, a scarecrow, a bale of hay. They came out large beside a Lalafell and are drawn at 0.7–0.9 (`PROP_K` in Town.tsx), the gateway and the fence at 1. **`tex-field`** is the farm's plots' ground (`BG=opaque`, no reference, like the other textures).
- **`talk-uncle`, `talk-banker`** (mode "talk"): each shopkeeper's large portrait for the talk box, the mouth closed and open, side by side in one picture. The model draws them at about twice the scenery's pixel size, so the sheet's fifth entry gives the range to look for it in (`[7.5, 13]`). The open one is rebuilt as the closed one with only the cells about the mouth changed (laid on it at the move that agrees best), so nothing else moves when it speaks.
- **`popoto-rush`** ("hat") has six frames: three running with a plank, two hammering, one wiping its brow. They came out a little smaller than the shop's workers and are drawn at 1.2.
- **`popoto-uncle`, `popoto-banker`, `scene-npc-stands`** (the stall and the bank counter) stand in front of the shop (`KEEPERS` in world.ts). Both popoto came out about one and a half times the workers' size, and are drawn at 0.78 and 0.72. The stands are drawn flat on, facing the viewer, like the Popoto Board.
- `work/piece-view.mjs <dir> <scale> <out.png> <name …>` cuts pieces out of a built atlas, enlarged, with a ruler and the ground point marked; `work/pier-check.mjs` photographs the deck in the dev town.
- **`icons-items-a`, `icons-items-b`** (`build-icons.mjs`): what the uncle sells and a bag holds, six to a sheet, drawn in their own colours with `scene-icons` for the style: a rod, a hoe, a watering can, a clay pot, a worm, dough bait; four seed packets (morning glory, cabbage, chilli, pumpkin), the Popoto coin (gold, stamped with a potato) and a bag. An icon's name is its item's id in `lib/town/trade.ts`, so `TownIcon name={item}` draws it.
- **`icons-items-c` … `icons-items-n`** (2026-10-03, `work/make-item-prompts.mjs` writes their prompts): everything else in `lib/town/items.ts`, six to a sheet: cookware and staples, eight more seed packets, twelve vegetables, twelve fish, what else a line brings up, goods, sixteen dishes, and the signs for stamina, a float, a hook, a meal, the recipe book and five buffs. **The model drew some sheets with pixels half the size of the others'** (8 to the pixel on the canvas, against 12–13), and measured freely those come out at double (16): their entry gives the range to look in (`{ range: [7.5, 8.5] }`). Look at every new sheet's size in the build's lines: an icon of 14×15 beside ones of 30×30 is this.
- **`icons-items-o` … `icons-items-an`, `icons-farm-a` … `icons-farm-l`, `icons-pots-a` … `icons-pots-g`** (the night of 2026-10-03): the two later tiers' things; the plots (weeds, soil, a sprout, a seedling, each vegetable half grown and grown, a dead plant, a bug, a drop, a shine); **twelve more weeds** (`icons-farm-k`, `-l`: the owner, "วัชพืชตอนนี้มีแค่แบบเดียว … ช่วย gen มาหลายๆแบบ"); a bucket empty and full, a tub, a well, two hands shaking, a tin pail, a brush, soap, an apron, a note; and **the pot each dish comes as** (`work/make-pot-prompts.mjs`: "the same big clay pot … only the food differs", named `pot` and the dish's id, `potTomYum`; the last is `potEmpty`).
- **The night of 2026-10-03, later** (ten sheets and two, $0.25): `icons-farm-m` (what a plot shows when it has only just been sown: seeds, big seeds, a bulb, a root, a cutting, a nut); `icons-items-ao` (the odd dish in its bowl and in its pot, `mystery` for the thing a found recipe does not name, `rosette` for who made a dish first, `seek`, `sprout`); `icons-items-ap` … `-au` and `icons-pots-h` … `-k` (the dishes of five other countries, what they take and are cooked in, and their pots: `work/make-world-prompts.mjs` and `work/make-pot-prompts.mjs` write the prompts; new pots go after `empty` in the list, so the sheets drawn before stay as they are).
- **`icons-g`** (2026-10-04, one sheet, $0.02): the settings at the top right of the town: a cog (`settings`), a gauge for how often the map is drawn, and the two ends of that choice, a snowflake and a bolt. Its true pixels are about 20 of the sheet's (`range`): measured freely it comes out at half that, and the icons at twice their size.
- **`icons-game-a`** (2026-10-04, one sheet, $0.02): the stirring game's pot seen from directly above, four of it: simmering (`potTop`), boiling over (`potTopOver`), scorched (`potTopBurnt`), empty (`potTopEmpty`). Asked for on a 32-pixel grid, so finer than the icons (30 by 26 of its own pixels; `range` about 10). It is drawn six screen pixels to one in `TownStirring`.
  - **Two that were drawn touching** come out of the build as one wide piece and one scrap (`potSpaghetti 94x54`, `potRisotto 13x10`). `{ split: true }` on the sheet gives each cell to the column it stands in instead of each piece to the column its middle is in.
- **`scene-kitchen-house`** (`prompts/scenery/kitchen-house.txt`, an edit of `scene-kitchen-2`): the cooking yard as a house, for whoever is outside it. It shares only its kerb, its posts and its sign with the yard, so `build-scenery.mjs` stands it where the most of those agree (`{ least: 0.1 }`: 30% of the yard's lowest third did). `work/` has no tool for it; to see how the two lie on each other, cut both from the atlas and lay one over the other at their ground points (the house's walls are about ten pixels inside the yard's front corners, which is why the yard is not drawn under it).
- **`icons-items-av` … `-ba`, `icons-pots-l`, `-m`** (2026-10-05, nine sheets, $0.17; `work/make-fish-prompts.mjs` writes their prompts): the twenty fish the owner asked for ("ไม่จำเป้นต้องเป็นปลาไทย เป้นปลาประเทศอื่น หรือ แฟนตาซี หน่อยก็ได้"), a scale hook and a glowing float, the eight dishes eight of them are cooked into, and those dishes' pots. Four sheets of six, then four of four: **a sheet asked for as four icons came out with pixels more than twice the size** (`icons-items-ay`, 12.8 against 5.4), so it was drawn again as six (a full moon and a rainbow beside its four, `moonFull` and `rainbow`: in the atlas, not used yet). The dishes' and the pots' sheets of four came out at 8, like the first fish sheets.
- **`icons-well-a`, `icons-well-b`** (2026-10-05, two sheets, $0.04): the well's book (lib/town/well). The two yokes the well gives its carriers, each empty and full (`waterYoke`, `waterYokeFull`, `waterYokeGreat`, `waterYokeGreatFull`: a bucket's picture when it holds water is its name and `Full`), the book and a parcel for something waiting (`wellBook`, `wellGift`); a carrier's three ranks (`rankWaterA` to `C`: wood, silver, gold), and three for what comes after (`tipJar`, `thanksCard`, `waterCart`). **The first sheet came out with pixels half the size** (7.7 against 15 measured freely): its `range` says where to look.
- **`icons-well-c`** (2026-10-05, one sheet, $0.02): the carriers' later rounds. The cart with water in it (`waterCartFull`, beside `waterCart` of the sheet before), a drop for each water that has a nature (`waterDawn`, `waterRain`, `waterMoon`: the well's book, lib/town/waters), the cooking yard's jar full (`yardJar`: the book's line of the pots my water went into), and a bucket between two hands (`lineHands`: the chip that hands water on, `TownLine`).
  - **Every sheet's pixel size has to be found.** Left to itself the build takes two or three of the picture's own pixels for one (a fish of 13×9 beside ones of 40×30), so each sheet's entry gives the range to look in (`{ range: [5.25, 5.45] }`). `node work/icon-pitch2.mjs <sheet …>` prints the best grid between 6 and 17 and how well its half and its third fit beside it; `node work/icon-try.mjs <sheet> <out.png> <a-b> <a-b>` cuts the sheet at each range, one row under the other, to choose by eye. The finer one that still shows crisp squares is the picture's own. The pots' seven sheets came out at 3.7 to 5.5, so a pot's picture is 45 to 66 pixels wide: the map draws every pot at one width whatever its own (`TownCook`'s `blit`).
  - `work/kitchen-tiles.mjs <out.png>` marks the map's tile middles on the finished yard's picture (`scene-kitchen-2`, an edit of the first, stood where it stands), to see which are floor and which under a stove or a table.
- **`work/cdp.mjs`** (the check scripts' browser): `page.tab(label)` opens another tab of the same Chrome, with the same localStorage and its own sessionStorage: a second tester who shares what the trial keeps for the whole browser (`town-farm.mjs`, `town-cook.mjs`, `town-deal.mjs`).
- **`scene-pier-2`** ("whole", like `scene-pier-1`): the deck finished, an edit of the first sheet on the same canvas ("redraw the same deck finished, in exactly the same place … every floor board is laid … a railing only along the two far edges"); the build stands it where the first stands. **`scene-kitchen-1`** was edited the same way for its way in from the north (`prompts/scenery/kitchen-1-north.txt`; the model took a stove out to make room, so there are three); the wide one before it is kept in `work/out/kitchen-wide-1/`.
- **The hairline fix** (`build-pixel-atlas.mjs`, "fillCrown"): seen from the front, several styles part with bare skin almost to the crown, which under dark hair read as a wig set too far back. Skin above 68% of the way from the head's top to the eyes, with hair on both sides of it, is filled with the style's main tone, with an outline-coloured edge. `work/doll-look.mjs` previews styles in black hair, before and after (`DIR2=work/pub2` for a build made with `--out work/pub2`).

## The other races, and what keeps them clean (2026-10-02, 2026-10-03)

Hyur, Elezen, Miqo'te, Roegadyn, Au Ra, Hrothgar and Viera each have their own sheets (`work/out/<race>/`), their own list of hairstyles and skins (`races/<race>.json`) and their own picture.

1. `node gen-race.mjs <race> [f|m] [--only base,back,poses,starter,skinkey,eyes,hair] [--like <race>] [--dry]` makes the sheets.
2. `node build-race-atlas.mjs <race> [--out <dir>] [--allow-holes]` builds `public/town/pixel-<race>-<hash>.png` and `pixel-<race>.json`. Try a change with `--out work/race-test` first, and look at it with the checks below (`DIR=work/race-test`).
3. `node race-data.mjs [--open race,race]` writes `lib/town/races.json`, which is what the wardrobe offers.

**A race's file** (`races/<race>.json`) holds the research (heights, features, the attire in words, hairstyles, skins) and two fixes for what the model draws wrong:
- `attire.<g>.back`: the outfit as seen from behind, for the walking-away sheet. An outfit is described from the front, and where the front is its whole point the model drew it on figures walking away (the Viera woman: her bustier under the back of her head on three steps of four, her back on one). With it, the prompt says of all four figures that only the back shows. Her sitting-from-behind pose was then given the same keyhole by an in-place edit of the poses sheet (`prompts/race/viera-f-poses-back.txt`).
- `steps.<g>.<view>`: which step each of the four is, when one is drawn wrong. `[0, 1, 2, 1]` walks step 1 again in place of step 3. The Elezen woman's last front step came without her sleeve puff, so the puff blinked off once a stride; 1 and 3 are the two passing steps, as alike as two steps get.

Look at every step of a new sheet side by side before building on it (`checks/skin-audit.mjs <race>` with `G=f` or `G=m` shows all ten).

**What the builder refuses** (the owner: "ห้ามให้มีจุดผิดพลาดเด็ดขาด"). It stops and says where; `--allow-holes` builds anyway, to look:
- **A hole:** every step under every eye shape must cover its sheet's own figure from the neck down, with no see-through cell inside.
- **A speck:** a step's body and each head it may wear must be one figure. A few loose cells (12 at most, the end of a tassel hanging in the air) are taken off; anything bigger apart stops the build.
- **A sitting neck** outside 0.3–0.8 of the standing one.

**Skin on the bodies.** The skin-key sheet is a redrawing: a cell out along edges, and whole patches wrong. Read cell by cell it left skin in the art's own peach on a doll of any other colour (the owner, 2026-10-03, a grey Roegadyn: "มี pixel มีปัญหา"). So, in this order (`SKIN_TRACE=<job>` prints which rule took each cell):
1. Under the key's cyan: skin, unless the colour is plainly the outfit's. Each colour's share of cells under the key, over all of a gender's frames, says whose it is.
2. Where the key repeats the cell's own colour, the model left it as the outfit's (`kept`): a gold buckle is the colour of a lion's fur.
3. A thing the key painted by mistake is the outfit's whole: an Elezen woman's white sleeve puff was painted cyan, and took the skin's colour (dark, on a dark Elezen). The vote clears most of it; its beige shading is "always under the key" and stays. So, on walking steps, cell by cell: a pale cell that is like none of the skin's main colours, is not on the base sheet (what both sheets have is the body's own), and lies among plainly-outfit cells with little sure skin beside it, is the outfit's; then the next one in. Without the base sheet to ask, the rule went down an Au Ra's cream tail, cell after cell, so sitting poses are left alone. Tried and dropped: "an outlined shape that is nearly all outfit is outfit whole" (a neck and a mantle meet with no outline, and the neck went with the mantle), and "under the key and on the base sheet is skin" (a Roegadyn's scarf lies over the base tunic's cream collar).
4. Elsewhere the colour decides: patches of the skin's main colours; edge cells close to the skin beside them; a shadow on the skin (colours that are the skin's more often than not, with skin along most of their edge); small clumps that skin surrounds; a forgotten bit of bare skin beside skin. A colour seen often and almost never under the key is never taken by the patch rule or by the later, deeper edge rounds: a Hyur man's tan mantle is within a shade of the shadow on his arms.
5. Race rules: an Au Ra's horns are skin on the bodies too. A Hrothgar's tail tuft never is (the key painted it on some frames only).

**Sitting.** A pose sheet draws its own head, a little bigger or smaller than the standing one and turned its own way. It is cut out (`fitHead`, `ownHead`, `tidyHead`) and the shared head is laid in its place, so every look has the same head sitting as standing. Of the own head these stay in the body:
- the nooks between the shared head and the body (`neckFill`): where a 7-cell square cannot come from outside, and only clumps that reach the body. A clump touching the head alone is a step in the head's own outline, and showed as a line of skin outside it;
- cells that would otherwise be holes (`closeHoles`).
What stays is skin where the key says so, whatever the vote says of its colour.

**Heads.** A head piece keeps nothing that is apart from the head below the chin line (a strip of the base collar with the neck in it lay over a Roegadyn's scarf on every step).

**A face's skin** (`faceSkin`). Above the chin line every warm cell is skin. Below it the piece may carry a little of the base sheet's cream collar, so a warm cell needs a reason:
1. the standing body has skin there, at that cell or the next;
2. or it is one of the face's main colours (each a thirtieth or more of the skin above the line, within 30). Not "the commonest, to nine tenths": that took in the odd pale highlight, and with it a Roegadyn woman's cream collar on three of her six eye shapes. The face palette is shared, so cream and a pale highlight can be the very same colour;
3. or it lies beside skin that is sure by 1's position or 2's colour, and is all but its colour (two cells deep). Never from skin that is skin only by lying next to the body's: at a collar that is a cell of cream;
4. or it is at the eyes, warm, of a skin's depth of colour and lightness: an eyelid, the shade under a brow, the sliver of cheek past the far eye. A sleepy eye's lid stayed tan on a face of any other colour. Never the white of an eye (very light, or all but grey);
5. or it is a small patch that skin and outline close in on every side (the last of a Hrothgar man's cream muzzle, under his nose). A patch that reaches the piece's edge or lies against anything light is collar;
6. or, on another eye shape, the round face has sure skin there in that colour.

**Hair.** A hair piece may carry skin: an ear through a mane, a horn through the hair. `hairSkin` marks what is of the skin's colours and joined to the bald head's skin; ribbons and flowers stay as drawn.

**In the browser** (`lib/town/pixeldoll.ts`, `paintKeys`): each pixel is decided once. An exact ramp colour is skin; otherwise violet is an eye; otherwise green is hair (or fur, on Miqo'te and Viera). Painting the eyes first and the fur after turned green and olive eyes into the hair colour on those two races.

**The checks** (`checks/`; all read `public/town`, or `DIR=<folder>` for a trial build):

| Script | What it shows |
|---|---|
| `eye-audit.mjs [race …]` | every face's recolourable eye cells are at its two eyes, and nowhere else |
| `face-audit.mjs [race …]` | every eye shape's skin agrees with its round face (a collar taken for skin on some eye shapes only shows here) |
| `face-skins.mjs <race> [skinHex] [scale]` | every face piece alone in a far skin (black by default), with light warm cells that are not skin marked (`PLAIN=1` unmarked) |
| `speck-audit.mjs [race …]` | nothing floats beside any doll, under any head |
| `skin-audit.mjs <race> [scale]` | every step with the skin painted magenta, and a count of warm cells beside skin that are not skin (`MARK=1` marks them) |
| `sit-necks.mjs [skinHex] [scale] [race …]` | every race sitting, bald, in a far skin, so skin left in its own colour shows (`NECK=1` closer, `FULL=1` whole, `WALK=1` standing) |
| `piece-split.mjs <race> <g> <view> [sit\|0–3] [skinHex] [scale]` | one step's body and head apart, and together |
| `hair-skin-check.mjs <race> <hair:view,…> [scale]` | hairstyles in a far skin, with skin-like cells that are not skin marked |
| `look-check.mjs [base] [out] <look,…>` | looks in the dev town itself: standing, sitting on the ground and on a bench, photographed; green and olive eyes counted on the screen against the same look with other eyes |
| `sky-check.mjs`, `sky-film.mjs <weather>` | the town's weather in a headless browser (SKILL.md) |

## The mountain, the cave, the bridge and the blacksmith (2026-10-08, a preview in `next dev`)

Twenty-four calls, $0.45 of the $5 the step was given (the budget is 35 since that day). Prompts in `prompts/scenery`; three sets: the town's own, `--set mountain`, `--set cave` (`public/town/mountain.json`, `cave.json`: fetched only by whoever goes there, components/town/mountain-art's `loadMore`).

- **`scene-bridge-2`** ("whole", a 3456×2304 canvas with the deck's sheet for its wood): the bridge whole, lying straight across the canvas ("not turned and not isometric … its far edge and its near edge two long straight horizontal lines"), built "in six equal spans" on "seven low piers of grey stone". **`scene-bridge-1`** is an edit of it, the bare frame on the same piers, stood where the first stands: the map draws so many spans of the whole one and the next of the frame, so one pair of pictures is every state. Where its floor and its ends are in the picture is in mountain-art.ts (`BRIDGE_ART`, measured with the scratch `measure.cjs` way: rows nearly full of pixels are the floor and the rails).
- **`popoto-smith`** ("body", with the uncle's sheet for the size), **`talk-smith`** ("talk"), **`scene-forge`** (the forge, the notice board, a sign post).
- **Something tall on the sheet keeps the rest at the dolls' scale.** The forge with its board alone, four rocks alone, and the mouth with the lookout alone each came out with pixels up to twice the size (grids of 11, 14 and 7), though told the scale. Drawn again with a tall thing beside them (a sign post three characters high, a standing stone, a flag pole) they came out at 5.2 to 6.6 and at the right sizes. The first of each is kept as `<sheet>.first.png`.
- **`scene-mountain-a`, `-b`, `-c`**: a pine, an ironwood and a moonwood, each "the same tree at four ages … so that they are plainly one kind of tree" (a stump, a sprout, a young tree, grown: `mt<kind>_<age>`). The ironwood's sheet came out at 7.4 and is drawn at 1.2.
- **`scene-mountain-d`** ("whole"): the ancient cedar; **`scene-mountain-d-stump`** is an edit of it, felled. The model drew the stump larger and lower than the tree's foot, so it is not laid on the tree (`moveOnto` put it 37 rows off): it stands on its own lowest row.
- **`scene-mountain-e`** (the mine's mouth, the lookout's deck, a signpost, a flag pole), **`scene-rocks`** (a standing stone, three rocks, one with crystals), **`scene-peaks`** (two far peaks, drawn at 2.4 to 3.2 times their size: they are a backdrop), **`scene-cave-a`** (the ladder with its lamp, the way down, a stalagmite, a mine cart), **`scene-cave-b`** (a lift, a torch, rubble).
- **Textures** (`BG=opaque`, no reference): `tex-rock`, `tex-snow`, `tex-cavefloor`, `tex-cavewall`, and **`tex-cliff`**, which is a rock face "seen from straight in front": lib/town/scenery lays it straight up the screen, not along the ground. The first cave floor came out coarse (a grid of 12.8) and was drawn once more (`tex-cavefloor.coarse.png` is the first).

**The builder's own switches:** `SKIN_TRACE=<job>` (and `SKIN_TRACE_ROWS`), `SKIN_WHY=<job>` (a map, and what is warm and not skin by colour; `SKIN_WHY_TEXT=1` adds letters), `SKIN_DEBUG=1` (the colour vote, and what each face rule took), `THING_DEBUG=1` (or a job: a map of what the mistaken-thing rule dropped), `FACE_DEBUG=1` (light cells left in a face, and why a patch stayed open), `OWN_DEBUG=1` (a face's main colours), `SHADE_MAP=1`, `SIT_MAP=1`, `FILL_DEBUG=<g>-<view>`, `FILL_SWEEP=1`, `SIT_DEBUG=1`, `EYE_DEBUG=1`, `CAP_DEBUG=1`. A job is `body-<g>-<view>-<step>` or `sit-<g>-<view>`.

## Mining: the line's gifts and the vein's board (2026-10-08)

Two calls, $0.038 (`gpt-image-2.5-sunburst`, low, 1536x1024). Prompts in `prompts/icons/icons-mining-a.txt` and `prompts/scenery/mining-game-vein.txt`.

- **`icons-mining-a`** (`build-icons.mjs`, with `scene-icons` for the style): a miner's lamp, a guiding bat, a miner's sack (the mining line's three gifts: `charmMinerLamp`, `famBat`, `thingSack`), and what a vein's face shows: ore that glints, a cluster of crystals, a hard knot (`veinOre`, `veinCrystal`, `veinKnot`).
- **`scene-mining-game-vein`** (`BG=opaque`, with `scene-cave-a` for the style): a plain face of rock between timber props, a lantern at its upper left, rubble along its foot. `node build-mine-scene.mjs [out folder]` shrinks it to its true pixels (199 x 132, 22 KB) as `public/town/mine-vein-<hash>.png`; the board (components/town/TownVein) names the file, lays it under its six-by-six face and asks for it only when a vein is opened.

## What is held in the hand: the long tools upright, and the gems' elements (2026-10-09)

Ten calls, $0.185 (`gpt-image-2.5-sunburst`, low, 1536x1024, each once), and three more for the finer tools below. Prompts in `prompts/held/`. `node build-held.mjs --out <tree>` cuts them into one sheet of their own, `public/town/held-<hash>.png` (256 wide, 19 KB) and `lib/town/held-art.json`, which `components/town/held.ts` reads: the icon atlas is not touched.

- **`held-tools-a`**: eight tools standing upright, their heads at the top turned to the right (a pick, an axe, a stone, an iron and a steel hoe, an insect net, a sickle, shears), drawn from a picture of their eight bag icons laid in a row (each blown up to the same size: the bag icons lie diagonally, and a tool in a fist stands). Asked for on a grid of 14 by 40, they came out 12 to 20 wide and 52 tall (28 for the two short ones), 8.5 of the canvas to a pixel. The builder finds where each handle stands (the middle of its lowest rows) and where its head is (the middle of its top part, by a share a tool: `TOOLS`), which is how the map sets the fist on the handle and the gems' light on the head.
- **`held-fx-<element>`** (fire, water, ice, earth, lightning, wind, light, dark), with `icons-fx-b` for the style: six pictures in a row, three tiny pieces and then the element's flourish twice and its grandest. **`held-fx-mix`**: a puff, a wisp of mist, a blue spark; steam, a bank of mist, a ring half gold and half violet. The sheets' true pixels differ (11 to 17 of the canvas), so a flourish is 13 to 34 pixels across by its sheet: the map lays every piece at a whole number of the screen's pixels to one of its own and does not even them out.
- **A row is cut at its widest empty gaps** (`row`: so many pictures, one gap fewer), not into even columns as `build-icons.mjs` cuts: the pictures of a row are not of one width, and many are in parts (a ring of crystals, sparks over a flame). A picture drawn touching its neighbour would be cut wrong: look at the built sheet blown up before using it.
- **`held-tools-b1`, `held-tools-b2`** (the same day, three calls, $0.072; each prompt read by Codex first, `codex-ask.mjs art`): the eight tools again, four a sheet, drawn finer for the tall races, whose own pictures have small pixels: the first sheet's tools in a Roegadyn's hand had pixels twice the doll's. With `held-tools-a` as the picture of the designs. They cut to 110 and 112 tall (55 for the two short ones). **`b1` was drawn twice**: the first came out hardly finer than sheet `a` (about 62 tall where 100 was asked: kept as `work/out/held-tools-b1-coarse.png`), the second was given `b2` as a second reference and "exactly the pixel size of the second picture", and matched it. What Codex changed: in `b1` the third and fourth tools' words were made to say what the reference shows (a warm brown handle and a broad head for the stone hoe, a compact pointed head for the iron one: the prompt had them the other way round); in `b2` the straight-bar rule was kept to the hoe and the net (the sickle's grip and the shears' two grips are their own), the sickle's blade was said to curve to the left as the reference has it, and the two short tools were given a height (about 45 pixels). The map takes the finer picture where a pixel of the first would cover more than a screen pixel and a half (`longCell` in components/town/held.ts).
- The level's light (a halo, rays, a ring, a mote, a tool's rim) is not on any sheet: it is made once for each colour by `components/town/held.ts` when first wanted.
