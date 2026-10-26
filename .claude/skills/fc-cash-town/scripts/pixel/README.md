# Cash Town's pixel avatars (live art pipeline, 2026-10-02)

## Required workflow for new art (owner, 2026-10-15)

Read the entire [ART_WORKFLOW.md](ART_WORKFLOW.md), this README, and the repository's `AGENTS.md` "Game art quality" section before preparing prompts or generating Cash Town art. `ART_WORKFLOW.md` preserves the owner's exact prompt templates, required references, generator settings, review gate, builders, and gameplay checks. Follow it for all new or regenerated art; older entries below describe history, including past built-in `image_gen` assets, earlier budgets, and four-icon sheets, and do not authorize repeating those methods. Read current spending from the shared ledger and the current budget from `gen.mjs`.

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
| `gen.mjs` | One API call: `node gen.mjs <name> <model> <quality> <size> <prompt.txt> [ref.png ...]`. It draws only a call Codex has read (see "Codex reads a prompt before it is drawn") |
| `pl.mjs` | One PixelLab call: `node pl.mjs <name> <endpoint> <body.json>`, for the four jobs of ART_WORKFLOW.md's "PixelLab" only; `REVIEW=` or `NO_REVIEW=` as with gen.mjs; the same ledger (see "PixelLab") |
| `gen-hairs.sh` | Hairstyle sheets as in-place edits: `./gen-hairs.sh <g> <hair> [<g> <hair> ...]` |
| `build-scenery.mjs` | The town's scenery; `--set forest` the forest's own sheet; `--set kitchen` the cooking screen's (`public/town/kitchen.json`). In a worktree pass `--out <tree>/public/town` (the default writes into fcnext's), and link `work` to fcnext's so that the ledger is the one ledger (`mklink /J work …cnext…pixelwork`) |
| `build-pixel-atlas.mjs` | `work/out` → `public/town` (`--out <dir>` to try elsewhere; `--poses` adds sit, sleep and wave) |
| `gen-race.mjs`, `build-race-atlas.mjs`, `race-data.mjs` | The other seven races: sheets, picture, and what the wardrobe offers (see the last section) |
| `checks/` | Audits and close-ups of the built dolls, and the town's sky in a headless browser (see the last section, and SKILL.md) |
| `build-ui.mjs` | The HUD's skin: `work/out/ui-kit-*.png` → `lib/town/ui-kit.json`, each piece a nine-slice (its corners as drawn, its edges rebuilt from one row); `--look <out.png>` to see them. `components/town/TownSkin.ts` is the CSS of it (SKILL.md, "the HUD is the town's own") |
| `pxlib.mjs` | Grid, cells, palette, shapes |
| `build-boxes.mjs` | Four transparent pairs generated with built-in `image_gen` (`prompts/box-tiers.json`), kept in `work/boxes/box-{10,20,30,40}.png`, become eight sprites in `public/town/boxes.json` + `boxes-<hash>.png`. Run `node build-boxes.mjs work/boxes [<tree>/public/town]`; each capacity has closed and open states, selected from the viewer's own box by `lib/town/box-art.ts`. |
| `pixelize.mjs`, `anim.mjs` | The spike's one-sheet tools |
| `work/` | Sheets, ledger, debug pictures. Git-ignored by its own `.gitignore`; back it up, the sheets cost money. |
| `prompts/` | Every prompt used |

## Running it

- **The key** is `OPENAI_API_KEY` in fcnext/.env.local. It is never printed.
- **Every call** is logged in `work/ledger.jsonl` with its cost, worked out from the returned usage: $8 per 1M image-input tokens, $30 per 1M image-output tokens, $5 per 1M text tokens. About $0.018 a call.
- **Budget:** `gen.mjs` stops within $0.50 of `BUDGET` ($25 since the owner topped it up, 2026-10-02; `work/ledger.jsonl` has what is spent).
- **Rate limit:** a new account may send 5 reference pictures a minute. `gen.mjs` waits as the 429 says and tries again, and `gen-hairs.sh` runs one call at a time.

## Codex reads a prompt before it is drawn (2026-10-09)

The owner: "ช่วยทำให้ codex review prompt ก่อนนำไปสร้างเป็นภาพด้วย อยากได้งาน premium แต่คุ้มค่ากับ credit ที่เสียไปที่สุด". Until that day $6.01 of the $23.36 spent (320 of 1,252 calls) had gone on sheets that were then drawn again, and two thirds of what a call costs is the reference picture sent in with it.

- **The read:** from this folder, `node ~/.claude/skills/codex-pair/scripts/codex-ask.mjs art --for "<where the picture is shown, how large, beside what>" <name> <model> <quality> <size> <prompt.txt> [ref.png ...]`: the words `gen.mjs` takes (`--bg opaque` where `BG=opaque` will be set). Codex is shown the reference pictures, reads this file, the earlier prompts of the kind and the builder that will cut the sheet, and answers `send`, `fix` (with the whole prompt as it would send it) or `stop`. About a minute. The codex-pair skill has the rest.
- **The gate:** what Codex passed is written in `work/reviews.jsonl`, and `gen.mjs` refuses a call that is not there (its prompt, its settings and its references' names together; the name is not part of it). The ledger's line says which read let it through (`review`).
- **A batch:** `CALLS=<file> node gen-race.mjs <race> …` (or any script that calls `gen.mjs`) lists every call in the file and draws nothing; `codex-ask.mjs art --calls <file>` reads them in one run.
- **Unread on purpose:** `NO_REVIEW="<why>"` before the command, and the ledger keeps the reason (`noReview`): a trial of settings, a batch whose template was read as one of its calls.
- **What the read is told decides much of what it says.** Told that a scene had been drawn before and not kept, it found two faults in the prompt; told the same scene was in the game and nothing was wrong with it, it passed the same words unchanged. Say in `--for` only what is so.

**What a setting buys** (measured that day on the cooking game's scene, 1536×1024 with one reference; `work/ab/compare-draws.png`, `compare-kitchen.png`, `compare-pots.png`):

| Quality | Picture tokens out | A call | After the builder's cut |
|---|---|---|---|
| low | 158 | $0.0195 | five draws of the one call: 270 to 288 cells across, 57–63% of their edges on the grid; four with upright planks, one with lying ones. The draw of three days before, which is in the game: 218 across, 42% |
| medium | 343 | $0.0250 | one draw: 282 across, 51%; floor tiles and lying planks, which a low draw showed as well |
| high | 1,372 | $0.0559 | one draw: a coarser grid (205 across) and softer cells, 34% |

- **One draw differs from the next as much as low does from medium**, so nothing here says that medium buys what a member would see after the cut, and high bought nothing. The older figures for a picture at medium and high ($0.041, $0.165, from the price list) were not what the account paid.
- **A large scene is drawn three times at low, and one is chosen** (the owner, 2026-10-09, to that offer: "ฉากใหญ่ ได้ครับ"): three cost what one at high does. `N=3` before a `gen.mjs` command draws three in one call (`<name>-1.png` …); each is charged as a call of its own, the reference with it, so it saves time and no credit. Lay them side by side with `checks/cut-look.mjs`, copy the chosen one to `<name>.png` (the builders read that), keep the other two, and say in the report which was chosen and why, so that he can choose otherwise. What counts as a large scene is the author's to judge: a mini-game's backdrop and whatever else fills a board or the screen (`"scene"` in `build-scenery.mjs`). Icons and small sheets are drawn once.
- Six pots at medium came out more painted and less crisp than the low sheet that is in the game. A reference cut to hard pixels first (one colour a cell, nothing half see-through) made nothing crisper, on the scene or on the pots.
- **Codex's two sentences did not show.** Of that scene's prompt it said the light's direction and the pixel size were left to the model. The call with its words added and the call as written, drawn again, came out alike. What the read is for is a new prompt's faults that this file already names (a sheet of four icons, a front described on a back view), not a prompt that already works.

`node checks/cut-look.mjs <out.png> 4.5-7.5 "<label>=<sheet.png>" …` lays sheets side by side as the game will show them (each cut the builders' way), with each one's pixel size, how many cells it has and how clean it was before the cut: for choosing between two drawings of one thing.

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
| `cut-look.mjs <out.png> <lo-hi> <label=sheet.png> …` | sheets from `work/out` side by side, each cut the builders' way, with its pixel size, its cells and how clean it was drawn (this one reads sheets, not `public/town`) |

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

## The farm's twenty helper plants (2026-10-15)

Fourteen calls, $0.284 (`gpt-image-2.5-sunburst`, low, 1536x1024, each drawn once; the ledger's `icons-helper-*`). Prompts in `prompts/icons/icons-helper-*.txt`, all on the owner's ICON SHEET template with its closing sentence. The helpers are `lib/town/helper-items.ts`; each icon's name is its item's id, or the `growIconOf` name.

- **`icons-helper-grow-a` … `-g`** (with `icons-farm-d` for the reference: the tomato, chilli and basil growing): each plant young (`grow<Id>A`) and grown with its crop showing (`grow<Id>B`), three plants a sheet, all twenty (mint, chamomile and lavender too: their crops are the forest's herbs, `icons-items-bd`, `-be`, and were not drawn again); `-g` also has the picked passionfruit.
- **`icons-helper-bag-a` … `-f`** (with `icons-items-d`, the seed packets): each crop beside its seed packet; `-f` the five packets left (fig, passionfruit, mint, chamomile, lavender) and a sixth, plain, drawn only so the sheet has six (`_seedHelper`, not packed). **A packet's band is its helper's role** (soil orange-brown, water sky blue, pollen yellow, guard coral red: the Quality bars' colours in `components/town/TownQuality.tsx`), so the four families read in the bag; the picture on the front is the crop.
- **Codex read all thirteen first** (one `--calls` run): twelve `send`, and for `bag-b` the sesame's seeds were kept inside the pods (loose specks are lost by the cut, `build-icons.mjs`'s two-cell floor). `bag-b` and `grow-a` were drawn first as the trial, then the rest.
- **The look in the game** (the dev town, a bed of the twenty at both stages beside tomato, basil and the rest, the fig on its 2x2, the bag with every new crop and packet, at 1280x860 and 384x730; `codex-ask.mjs find --see` on one contact sheet): the fig read as an aubergine on a little palm (low leaves, big purple fruit hanging on stalks), its picked fig and packet as an aubergine, and the ripe garlic chives' daisy flowers as chamomile. **`icons-helper-fix-a`** drew them again (with both references: the plants, the packet): a fig tree with a pale trunk, hand-shaped lobed leaves and two figs against its branches; chives topped by little white pompoms; a whole fig beside one cut open, pink inside, and that on the packet. Codex read it and asked for two figs where five were asked (taken) and for "all icons the same pixel scale" where the template says "the same size" (kept, the template's: the six plant sheets with those words drew their young plants smaller), so it was drawn with `NO_REVIEW` giving that reason. The first drawings' names begin `_` in `build-icons.mjs` and are not packed.
- **Which grid is cut.** Measured freely every plant sheet comes out on a grid of 8 to 11 with its half fitting too. The bag's sheets are cut on their finer grid (5.5 to 6.9: packets 32 to 38 wide, as `seedLongBean`), the way the later seeds were. The plant sheets `a` to `e` and the fix are cut on the coarser (7.9 to 9.5), as `icons-farm-d` was: on the finer they came out 75 to 97 tall, and the map draws a plant at no less than 0.62 of a screen pixel to one of its own (`PLANT_SCALES` in TownFarm.tsx), so they stood half again to twice a tomato's height. `f` and `g` were drawn coarser and their finer grid (5.3, 5.6) gives 45 to 63. `icons-helper-fix-a` is listed twice, the plants at one range and the fig and its packet at the other.
- **Into the atlas without a full build:** since the sets laid under the atlas by `build-garden-icons.mjs` and its kind, a whole `build-icons.mjs` would leave them out. `ICONS_ONLY=<sheets> ICONS_APPEND=1 node build-icons.mjs` cuts those sheets alone and lays them under the atlas there is (`ICONS_PUB`, `ICONS_JSON`: the worktree's), refusing a name already in it.
- **The fig on its 2x2** is drawn by TownFarm as one sprite on each of its four plots, as the garden's crossings are: four small fig trees stand in a square. One tree over the four would need the map to draw it once, larger, at its root (as `drawGiantPlant` does), which is code, not a picture.

## The trade board and the hour before dawn (2026-10-15)

Four calls, $0.101 (`gpt-image-2.5-sunburst`, low, 1536x1024, each read by Codex first; prompts in `prompts/scenery/trade-board*.txt` and `prompts/icons/icons-sky-b.txt`, `-c.txt`).

- **`scene-trade-board-2`** (`build-scenery.mjs`, `tradeBoard`): the members' trade board in the plaza (lib/town/world's `TRADE_BOARD`), on the PROPS ON THE MAP template with `f-starter-front` for the scale and `scene-board` for its size and style, and a tall post beside it (`_tradePost`, not packed: a name beginning `_` is skipped) to hold the sheet to the characters' pixel size. A market board: a striped green and cream awning, a coin sign, pinned notes, goods tags, coins and a sack on a shelf, a crate of goods. Measured freely it is cut on a grid of 5.4, a third larger than the Popoto Board; it is cut on the board's own grid (`[7.1, 7.4]`: 121x109 beside the board's 139x121). **The first drawing** (`scene-trade-board`, a shingled roof) read in the game as the same kind of board as the Popoto Board (Codex, on the contact sheet): drawn once more with the awning.
- **`icons-sky-c`** (`build-icons.mjs`, `beforeDawn`): the clock's 03:00–05:00 band (lib/town/bands), drawn among the sky set's neighbours (evening, night, dawn, morning, noon: `_` names, not packed) with `icons-sky` for the reference, so that it takes their order, size and palette: dawn's rounded shape in night blue, a low crescent, a mist band, a line of pink first light. 15x14 on a grid of 12.9. **The first** (`icons-sky-b`, a crescent sinking into mist) read as night at the clock's 16–20 px; Codex's word for it was that "a band of soft mist" could come out as a haze, and it was asked for as solid hard-edged clusters.
- In the game: `work/helper-plants/contact-trade-board-clock.png` (1280x860, 384x730, 360x640, noon and 04:00).

## The farm's insect house (2026-10-15)

Two calls, $0.063 (`gpt-image-2.5-sunburst`, low, 1536x1024, each read by Codex first; `prompts/icons/icons-insect-house-*.txt`).

- **`icons-insect-house-a`** (with `icons-farm-d` for the plants and `icons-wood` for the bag's wood tools): the house standing on its plot (`plotInsectHouse`, drawn by TownFarm's `blit` as the growth sprites are), drawn between a tomato vine and a basil so that it takes their scale, on a short post set in the same mound, a gabled shingle roof, two rooms (big hollow bamboo tube ends with pale rims; pale wood drilled with smaller holes), two pine cones under the peak and no insects (the code draws those while its rooms are lived in); and the same house for the bag beside two wood tools. Codex's word before the drawing: tell the two rooms apart in the words, or at 30 px both read as one field of dots. Cut on the finer grid (5.77): on the coarser (11.4) the rims and holes ran together. 38x65.
- **`icons-insect-house-b`** (`insectHouse`, the bag's): drawn again after the look in the game, where the first one's nine small rings and holes ran into speckles in the bag and the hotbar (Codex: "reads less clearly than an insect hotel"), with the first sheet as the house to draw and fewer, bigger tube ends and holes. 44x49 on 5.56. Codex also said the standing house looks a little front-on beside the plants' tops: not drawn again (the plants are drawn front-on too, and it stands on their mound).
- In the game: `work/helper-plants/contact-insect-house.png` (the first: `contact-insect-house-first.png`). The house on a plot was shown through a temporary draw in TownFarm that was not kept (the house's own drawing is on farm-bands).

## The time bands' newcomers (2026-10-15)

Ten calls, $0.192 (`gpt-image-2.5-sunburst`, low, 1536x1024, each sheet drawn once; the ledger's `icons-band-*`). Prompts in `prompts/icons/icons-band-*.txt`, on the owner's ICON SHEET template; the species are `lib/town/band-species.ts`, each icon's name its item's id.

- **`icons-band-insects-a` … `-c`, `-d2`** (with `icons-items-bm` for the reference, the insects' own sheet): the twenty-four insects, seen from above and facing up as the old ones are, the side views facing left. **`-d` came out coarse (true pixels of 13.5 where its sisters had 8) with both moths drawn as half a moth and the rove beetle lying diagonally**; `-d2` drew it again with `-a` for the reference and Codex's facing words ("the five seen from above have their heads at the top … only the firefly, seen from the side, faces left"). Codex had also asked for "a 32 by 32 grid … about 8 canvas pixels per art pixel": that is the asset's pixel size, which ART_WORKFLOW forbids in a prompt, so the template's 16 by 16 line was kept and the call drawn with `NO_REVIEW` saying so. `-d2` still came out at 13.5 and is cut on its half (6.6 to 6.85), which gives its insects the others' size (36 to 49 tall beside 30 to 37); its pixels are a little bolder at 2x, not out of place beside the rest (looked at blown up beside `icons-items-bm`, `-bn`). The first `-d` is kept in work/out and not listed.
- **`icons-band-fish-a` … `-d`** (with `icons-items-av`, the twenty fish of 2026-10-05): one whole fish each, facing left, cut at 5.3 to 5.5 (`-d` at 4.8 to 5.0), 37 to 50 wide as the old fish. Codex asked that the sole show its eyed side (taken).
- **`icons-band-finds-a`** (with `icons-items-bd`, the forest's finds): the mist mushroom with the rare star, the queen of the night's pollen in a petal, the dew in a vial with a blade of grass, bat guano in a sack, glow powder in a jar (its picture only: the item comes with its recipe in piece 3), and `timeMist`, the dawn mist's time icon on an insect's card beside `noon` and `night`. Codex's first read moved the mist to three thick bands alone (taken, but its words "recognizable at 14-16 pixels" name the asset's size and were reworded, then read again); the second read added a sentence on solid glass colours, which `--apply` put **after** the closing sentence: the call was drawn so, and the prompt file keeps it as drawn.
- **Codex read all nine first** (one `--calls` run): seven `send`, two `fix` (taken as above). The insects' first sheet was drawn alone as the trial, cut and looked at, then the rest.
- **Into the atlas:** `ICONS_ONLY=<the nine> ICONS_APPEND=1` with `ICONS_PUB`/`ICONS_JSON` the worktree's. **In the game** (the dev town, `scripts/town-outnow.mjs`, 1280x860, 384x730, 360x640): a mason bee at a town flower haunt beside the old butterflies, the out-now book's pictures and dark shapes, the village book's card.

## The farm's fertilisers of Quality (2026-10-15)

Four calls, $0.077 (`gpt-image-2.5-sunburst`, low, 1536x1024, each read by Codex first; `prompts/icons/icons-fert-*.txt`, with `icons-items-e`, the goods set's growFert and guardFert, for the reference). Seventeen bag icons for lib/town/fertilisers' `FERT_ITEMS`, in the goods set beside growFert, guardFert, mulch and compost.

- **`icons-fert-a`**: what comes in a bag or a sack (sawdustMulch in a burlap sack, sulphurPowder in a paper bag cuffed open; its first four drawn again in `-d`). **`icons-fert-b`**: heaps and handfuls (mineralClay, forestHumus with a leaf and a mushroom, lotusSilt in a lotus leaf, shreddedBark, shellMeal on a scoop with a scallop, chitinPowder in a corked jar), cut on its finer grid (4.9): on its coarser they came out 18 to 25, at pixels nearly twice the others' in a bag slot. **`icons-fert-c`**: the wet ones each in a vessel of its own shape (fishEmulsion in a jug painted with a fish skeleton, kitchenFerment in a green crock under a cloth) and herbPowder in a half-open pouch; its sixth is a growFert drawn only to hold the size.
- **`icons-fert-d`**: drawn again after the look in the game, where Codex found slatePowder, biochar and silkFrass "nearly identical cream sacks with dark heaps" at bag size, woodAsh's puff fallen into specks, and nectarLure's flower and resinWash's pine sprig lost. Each of the four bags now has its own cloth and shape with what it holds spilled in front (a slim blue-grey bag and slate chips; a squat burlap bag and black char; a white silk pouch, green pellets and a cocoon; a cream bag of ash with a charred twig), a big domed brass sprinkler on the nectar, a pine cone on the resin flask. The first drawings' names begin `_` in `build-icons.mjs`.
- What Codex changed before the drawings: the ash's puff and the pellets as solid shapes joined to the heap (the cutter drops what is under two cells), the paper bag's top cuffed open so the yellow shows, the herb pouch's mouth open with its powder spilling, a broad sprinkler cap, the cone hung over the flask's pale shoulder.
- In the game: `work/helper-plants/contact-fertilisers.png` (the first: `contact-fertilisers-first.png`).

## Plants of more than one plot, and the garden's hybrids in this pipeline (2026-10-15)

The owner: "พืชที่กินมากกว่า 1 ช่อง แบบผสม ช่วย gen ภาพใหม่ ให้ดูเชื่อมต่อกัน ไม่ใช่ ภาพ 1 ช่องแบบนี้ / แบบขนาดใหญ่ ไป Gen ภาพให้ออกมาดีๆ", and "ช่วย Gen ภาพพืช ที่ codex เคยทำไปใหม่ด้วย จะได้เป็น Template เดียวกัน". Fifteen calls, $0.325 (`gpt-image-2.5-sunburst`, low; each read by Codex first).

- **Whole over their plots** (3840x1280, PROPS ON THE MAP template, with `icons-farm-d` for the plants and `work/out/ref-farm-plots.png`, a cut of the farm in the game, for the plots' angle): `icons-wide-a` the 3-plot rows (`wideBlueCornA/B`, `wideLotusRootBedA/B`, `wideTrellisBerryA/B`), `-b` the 2-plot rows (rowBean, teaBush), `-c` and `-d2` the two L's (`wide<Crop>Front/Back/SideA/B`: the corner at the front, at the back, at the right; the left is the right mirrored), `-e` the okra row and the giant cabbage and taro, `icons-giantcrop-a`, `-b` the five 2x2 giants (`giant<Crop>A/B`). A row runs from the lower left up to the upper right (mirrored for the other way). Cut on their true grid, 4, where their plants are the size the farm's hybrids are drawn at; the giants on twice it, 8 (on 4 a ripe daikon stood 224 tall, six tomatoes high).
  - **The trial** (`wide-lines-3`, kept) came out right in size and angle but stood each row on a flat slab cut into square tiles, a tray on the plots' own soil: the sheets after it say that the plants grow out of "one long, low, rounded mound … with no tiles, squares or straight edges. That mound is part of the plant; nothing else is drawn under it." Codex's one finding on them was to change the template's closing "no ground under them" instead; kept the closing (ART_WORKFLOW), so they were drawn with `NO_REVIEW` saying so.
  - **Drawn again after the look in the game** (a temporary mock in TownFarm drawing each once over its plots; `work/helper-plants/contact-multi-plot.png`, the first `-first.png`): the sunflower patch's L read as several sunflowers along a bed, the okra row as separate bushes, the giant taro as a little palm on a pedestal (must fix), the giant cabbage as broccoli (worth fixing): `icons-wide-d2` and `-e`, a continuous mass of leaves for the L and the row, a clump of elephant-ear leaves with no trunk, a smooth wrapped head. The first drawings' names begin `_`. The bottle gourd's L (its gourds dominating its leaves) was left as it is.
  - **`icons-giant-a`, `-b` are the turnip's** (branch `turnip`, 2026-10-08): drawn over by these the same morning, they were made again from that branch's atlas pieces at 8 to the pixel (`work/out/icons-giant-a.png`, `-b.png`; cut back, the same sizes and colours within a few steps), and these sheets renamed `icons-giantcrop-*`.
- **The garden's eight hybrids in this pipeline**, replacing what `build-garden-icons.mjs` packed from `grow-garden.png` and `icons-garden.png` (drawn outside gen.mjs, each cell resized into a box): `icons-garden-grow-a` … `-c` (their 1-plot growth sprites, with `icons-farm-d`), `icons-garden-bag-a` … `-c` (crops and seed packets, with `icons-items-d`; the band the crop's colour: Codex had the sunflower packet's band brown and the lotus root's cream, to match the crops). Packed with `ICONS_REPLACE=1`: names already in the atlas point at the new pieces, the old pixels stay in the picture unused. Codex wanted "all plants drawn at the same scale" for the growth sheets; kept the template's words (`NO_REVIEW`).

## The time bands' fertilisers (2026-10-15)

Three calls, $0.058 (low, 1536x1024, `icons-items-e` for the reference, each read by Codex first): `icons-fert-e` (boneMeal in a tall bag painted with a bone, guanoMeal in a paper bag with a bat, scalePowder in a jar of pastel scale powder, dewPollen in a vial with a dew-drop stopper; Codex made the bone bag tall with the bone painted large, so it is not another ash sack), `icons-fert-f` (the two rare three-day packets with the sparkle star: packetMist wrapped in a banana leaf with a curl of mist), and `icons-fert-g`, drawn again after the look in the game (beetleFrass with one big glossy beetle on its bag, packetNight with patches of firefly light and two fireflies over it; its scale powder came out plain white, so e's is kept). In the game: `work/helper-plants/contact-fertilisers-2.png`.

## The garden hybrids stand on their plots (2026-10-15, later)

The owner, of the pictures above: "พืชลูกผสม รู้สึกว่ายังทำภาพมาไม่ตรงช่องเท่าไหร่ ช่วยแก้ไขใหม่". Ten calls, $0.259 (low, each read by Codex first; two drawn with `NO_REVIEW` where its words gave sizes in pixels, which ART_WORKFLOW forbids).

- **What did not work.** `plot-template.mjs` draws a plan of each sheet's plots (2:1 diamonds, as the map lays them). As the base of an in-place edit (`tpl-*`, 3840x2160) the model dropped the plots, moved the plants off them and drew soft; as a second reference (`plan-*`, `icons-wide-fit-*`) it drew soft at a grid of 8 with a dark haze. The model does not put things where a picture says.
- **What did.** The crisp sheets' own words and references (`icons-farm-d`, `ref-farm-plots`), with the plant growing out of one small soil mound on each plot's middle, low, its clumps grown together over the gaps (`icons-wide3-a`, `-b`, `-d`; `icons-wide2-c` for the bottle gourd, which read as connected the first time). Then **`measure-wide.mjs`** finds the mounds (k-means on the soil, or by eye on a 10-px grid where the soil runs together or more clumps than plots were drawn: the end mounds and the corner's) and fits each picture to its plots' middles by a scale and a move: `lib/town/wide-art.json`, `{ name: [k, x, y] }`, the screen px to one of the picture's at scale 1 and the picture's point that stands on the footprint's middle (the mean of its plot centres). Off by 0.2 to 3.9 screen px (rms) where the model drew a row flatter than the map's; the trellis berry's row 3.6 and 5.4. k is 0.42 to 0.77, inside the 1-plot plants' 0.62 to 1.04 or a little finer.
- In the game (a mock of TownFarm drawing by wide-art.json): `work/helper-plants/contact-hybrids-fit.png` (the first state `-first.png`). Codex: no must-fix; worth fixing, not done (the one fix was spent on connectedness): the bottle gourd's fruit soft, the lotus bed's pads soft and its ripe roots like a raised bed, the ripe blue corn tall and dense over the plots behind, the ripe trellis berry a dark mass at phone size.
- The giants are unchanged. The atlas was rebuilt from farm-bands' with only these sheets appended (`ICONS_REPLACE`), so the tries between leave no pixels in it.

## The insect house's insects in flight (2026-10-15)

The owner: "ช่วยทำ effect ที่แมลงบินไปบินมาในแปลงเมื่อใช้ บ้านแมลงด้วย โดยต้องเกี่ยวข้องกับแมลงที่แสดง effect อยู่ Gen ภาพได้เลย". Ten calls, $0.133 (low, 1536x1024; Codex read all ten as a batch, two passed as written and its shared words were applied at the source of the other eight, drawn with `NO_REVIEW` saying so).

- **`icons-fly-a` … `-j`**: the 29 flying insects of INSECT_GARDEN's pollinators and predators, each twice, seen from the side facing left, its wings up (`fly<Insect>A`) and down (`fly<Insect>B`), three a sheet. Each sheet's reference is a strip of its three insects' own bag icons from the atlas (`work/out/ref-icons-fly-*.png`, made by scratchpad code as held-tools-a's picture of its tools was), so each keeps its colours and markings. Codex added: ignore the strip's dark ground and stray specks, the body the same in both frames with only the wings moving, the wings solid (not see-through), and for the beetles the coloured wing cases still with only the pale wings beating. Not drawn: the golden ant (a wingless worker), the antlion (a larva) and the rove beetle (it walks): the farm keeps their bag picture for them.
- **`pairs`** (build-icons.mjs): the two frames of each insect are laid one on the other where most of their pixels agree (the body) and cut to one box, so the body stays still as the wings beat (they came 1 to 9 px apart as drawn).
- In the game (three houses, six insects, frames 250 ms apart): `work/helper-plants/contact-fly.png`. Codex: no must-fix; the mantis's green body is lost against green leaves and the robber fly crowds a ladybird when they cross (where they fly, not the drawing).

## The mist children (2026-10-15)

The eight helper crossings' fifth child (lib/town/helper-items' `MIST_PLANTS`): a pre-dawn bee let go on a parent gives the sun child's rare form, the same plant touched by the mist before dawn, with a rare crop. Seven calls, $0.217 (`gpt-image-2.5-sunburst`, low, 1536x1024, each read by Codex first; prompts `prompts/icons/icons-mist-*.txt`). The ledger stood at 1,346 calls and $25.55 after them.

- **`icons-mist-grow-a` … `-c`** (with `icons-farm-d`, as the twenty helpers): each mist child young (`grow<Id>A`) and grown with its rare crop (`grow<Id>B`): the same outline, leaves and habit as its sun child in a silvery sage green with a few dew beads, pearl nuts at the peanut's foot, silver-grey grain sprays, ivory sesame, pale pink-white clover heads, dusty pink rhubarb stalks with a pearly bloom, watercress with a mint bloom, pearl-white chamomile round big golden hearts, the fig a whole tree (its 2x2, as `growFig`) with pale violet-grey figs. `-c`'s tomato pair is a filler. **`icons-mist-bag-a` … `-c`** (with `icons-items-d`): each rare crop with the sparkle star beside its packet of mist grey paper, the band its role's (soil orange-brown, water sky blue); `-c`'s two plain packets are fillers.
- **The second reference of each sheet is the sun children themselves**: `work/out/ref-mist-*.png`, their own drawings cut from their sheets (`icons-helper-grow-*`, `-bag-*`, `-fix-a`, `icons-farm-d`, `icons-items-bd`; whole pieces given to the column their middle is in, halos dropped) and laid at their native size in the new sheet's order, so the prompt can say "the rare form of the plant at the same place in the second picture". The plants came back the same shapes, position for position.
- **Codex's reads.** The first read asked for opaque plant material (bloom and dew rather than glass, crystal, opal or silver: "invites mineral plants"): taken, keeping a hint of each name. It also asked to drop the first reference as redundant: kept, the brief names it, and the second read passed all six with it. `grow-a` was drawn first as the trial, then the rest.
- **Which grid.** The plants on the grid where their sizes are the sun children's (`grow-a` 7.14, `-b` 8.0, `-c` 7.92: 23 to 35 wide, 27 to 53 tall); the bag on its finer (5.44 to 6.65: packets 28 to 39 wide, as the helpers' 34 to 36). **`colours: 96`** (a new option in `build-icons.mjs`, 48 otherwise) on `grow-c`: at 48 the fig's pale violet went into its sage leaves.
- **In the game** (the dev town, `town-tap-beds.mjs`'s way: each mist child beside its sun child, ripe and young, the two figs on their 2x2s, the bag with all sixteen crops and packets, 1280x860 and 384x730): `work/mist-children/contact-mist-children.png` (the first: `contact-mist-children-first.png`). Codex: must fix, the dew sesame's two split pods read as plain sesame in the bag. **`icons-mist-fix-a`** (with `icons-mist-bag-a` alone, on Codex's word: it holds the mist packet exactly) drew it as dew-bead seeds heaped on a silvery leaf, its packet the same, and the silver grain packet's grains outlined darker (worth fixing: grey on grey). Codex on the result: closed, nothing new, the packet better. The first drawings' names begin `_` in `build-icons.mjs`; the atlas was rebuilt from the branch's with only the seven sheets appended, so the first drawings leave no pixels in it.
- **Worth fixing, left:** the young mist buckwheat, sesame and watercress read a little frosted on a phone; the glass flower reads as white clover more than glass; the mist fig's sparse silver canopy is a little cactus-like.

## Leftover fixes (2026-10-16)

What Codex had left as worth fixing after the looks in the game above, drawn again before the push (the owner: finish everything first). Thirteen calls, $0.356 (`gpt-image-2.5-sunburst`, low, each sheet drawn once, every call read by Codex first: four batch reads and two single ones, all passed; its `fix` words taken for `fert-h`, `wide4-a` and `fly-k`). The ledger stood at 1,359 calls and $25.905 after them. Prompts `prompts/icons/icons-fert-h.txt`, `-mist-grow-d`, `-e`, `-mist-bag-d`, `-e`, `-fly-k`, `-wide4-a`, `-a2`, `-a3`, `-wide4-c`, `-c2`, `-c3`, `-c4`. The first drawings' names begin `_` in `build-icons.mjs`; the atlas was rebuilt from the branch's with only the kept sheets appended (`ICONS_REPLACE`), so the tries leave no pixels in it.

- **`icons-fert-h`** (`packetNight`): its second reference `work/out/ref-fert-h.png` is `icons-fert-f` with its night packet replaced by `icons-fert-g`'s (one firefly taken off to make room) and fert-f's star laid at its upper right, made by scratch code. Codex added that the cloth body be packetMist's size. Back with the gold star, four patches of firefly light and one firefly; 32x42 beside packetMist's 38x53.
- **`icons-mist-grow-d`** (young mist buckwheat and sesame, grown glass flower) and **`icons-mist-grow-e`** (young mist watercress, young and grown mist fig), each with a strip of the plants at their places (`ref-mist-grow-d`, `-e`: the sun children young, the figs grown): the young plants a mid sage green with darker shading and two or three dew beads, no pale rims; the glass flower's heads pale ice blue with a white shine square and the stalk's green under them; the figs a forked trunk under overlapping lobed leaves, 96 colours as grow-c. `grow-d`'s young watercress and figs were drawn again in `e` after the look below. **`icons-mist-bag-d`**, then **`-e`**: the glass flower and its packet the same way, with blue-green shading between the florets.
- **`icons-fly-k`** (`flyMantisA`, `B`): the mantises again with `icons-fly-i` as the only reference (Codex: the bag strip adds nothing to a recolour) and its sentence that keeps every insect where and as large as it is, after the template's opening (its first read had replaced the opening with an in-place edit; ART_WORKFLOW keeps the template). The green mantis has a deep leaf-green back, a cream underside and forelegs, a pale cream wing. Cut on fly-i's range.
- **The hybrids.** `icons-wide4-a` came back with its corn more open and its berries bright, but its ripe lotus roots laid along the mounds' fronts again (the kerb); **`icons-wide4-a2`**, its prompt with the ripe lotus's words alone changed (two segmented roots poking up out of the mounds' tops), is the one packed, all six: its corn is lower against its mounds as well. `icons-wide4-c` drew the bottle gourds as pears; `-c2` as figure eights as big as the leafy clumps, standing on the mounds; **`icons-wide4-c3`** is packed: small figure-eight gourds hanging from the rail among big round leaves, the leaves and vine the larger share (also the older note above, that its gourds dominated its leaves). After the look, `-a3` (veins on the lotus pads) and `-c4` (smaller gourds under a leaf) came out worse, the roots a kerb again and the gourds pears, and were not taken. **`measure-wide.mjs`** fitted all twelve again into `lib/town/wide-art.json`, off by 0.3 to 2.9 screen px (rms): by eye where the soil runs together or the mounds hide (`wideBlueCornB`, `wideTrellisBerryA`, `B`, `wideBottleGourdBackA`, `SideA`, `SideB`), found for the rest; the old marks for these names are gone. `town-tap-beds.mjs` passed at 1280x860 and 384x730.
- **In the game** (the dev town, `scripts/town-tap-beds.mjs`'s way: the hybrids ripe and young in both beds, the mist children beside their sun children with the figs on their 2x2s, a basil bed with a mantis in an insect house, zoomed in with the wheel, and the bag): `work/leftover-fixes/contact-leftover-fixes.png`, each frame before and after (shots in `v2-before`, `v3-after`).
- **Codex on the sheet**, first: the night packet, the corn, the berries and the mantis resolved; must fix, the young mist fig ("sparse, upright lobes retain the cactus silhouette"); worth fixing, the young watercress a little icy, the glass flower's crop and packet still white clover, the lotus pads soft discs, the gourds soft and dominant. After the one fix round: the watercress, the glass flower's crop and packet and the grown fig cleared.
- **Left:** the young mist fig, Codex's must-fix after the fix round: "the cactus arms are gone, but the replacement reads as a pointed silver succulent rosette, not a young fig" (its smallest fix: a short woody stem and two branches, broad lobed leaves in place of the radial spikes); worth fixing, the lotus pads still soft discs (a notch and an angular shaded rim) and the ripe gourds still pale and a little inflated over their vines (narrower, stepped shading). The ripe corn is more open but about as tall over its plots as before (Codex counted it resolved).
- **The owner passed them as they are** (2026-10-16, having seen the young mist fig, the lotus pads and the gourds beside every try that was thrown out: "ภาพที่รอตรวจผ่านหมดแล้ว ไม่ต้องสร้างรูปใหม่"): `growDewFigA` in `icons-mist-grow-e`, the lotus bed in `icons-wide4-a2` and the bottle gourd in `icons-wide4-c3` stay; nothing above is left open. A last round was stopped on his word after three calls, drawn and never used ($0.0824, read by Codex first): `icons-mist-grow-f` (the young mist fig as a woody stem with two branches), `icons-wide4-a4` (notched lotus pads) and `icons-wide4-c5` (narrower gourds); their prompts are kept in `prompts/icons/`. The ledger then stood at 1,362 calls and $25.987.

## The garden hybrids small, on one plot (2026-10-16)

The owner: "ช่วยลดขนาดผักที่มีขนาดใหญ่ และใช้หลายช่อง gen ภาพใหม่ ให้ต้นเล็ก ใช้แค่ช่องเดียวพอ เนื่องจาก พอมันใหญ่ มันทำให้ click พื้นที่ด้านหลังไม่ได้". Three calls, $0.0973 (`gpt-image-2.5-sunburst`, low, 1536x1024, each sheet drawn once). The ledger then stood at 1,365 calls and $26.085. Prompts `prompts/icons/icons-hybrid-small-a.txt`, `-b`, `-c`, on the owner's ICON SHEET template with its closing sentence.

- **`icons-hybrid-small-a` … `-c`** (with `icons-farm-d` and `icons-farm-c` for the reference: the tomato, chilli and basil, and the corn): each hybrid as a small plant on one plot, grown (`grow<Crop>A`) and ripe (`grow<Crop>B`), "about as wide as the tomato and the chilli in the first picture and no taller than the ripe corn in the second, with nothing reaching up high above it". `a` the bottle gourd (big round leaves on a short stake, two pale gourds), the bush bean (lilac flowers, broad flat pods) and the berry cane (pink flowers, red-purple berries); `b` a short blue corn with a purple stalk and two purple-blue ears, the tea bush with yellow-green tips, two short sunflowers; `c` the okra (cream flower, upright red pods), the lotus in a small pool (a pink lotus and a cream root when ripe), and the tomato and basil as fillers. They replace `icons-garden-grow-*`'s pictures (`ICONS_REPLACE`; those sheets' names now begin `_`), and stand 24 to 34 wide and 28 to 40 tall beside the ripe corn's 29x51.
- **Codex read all three first** (one `--calls` run): `fix` for the fillers in `c` (the pair sentence covered them; taken: "For icons 1 to 4 only … Icons 5 and 6 are not a pair"), and "all icons the same scale" for "the same size" in all three (not taken, the template's words, as for `icons-garden-grow` and `icons-helper-fix-a`), so the three were drawn with `NO_REVIEW` saying so. `c` was drawn first as the trial: cut on 8.52 its tomato and basil came out 21x35 and 25x35 beside the atlas's own 22x36 and 25x36.
- **Which grid.** `a` measured freely gives 13.8 with its half fitting (6.9): cut on 6.9 (31 to 34 by 37 to 40); on 8.4 the gourds' and the flowers' outlines went soft. `b` on 8.0, `c` on 8.5. The map draws every plant so its longer side is about 30 screen px (`PLANT_SCALES`), so the finer `a` has finer pixels (0.71 a screen px to one of its own) between the corn's 0.62 and the tomato's 0.83, not a larger plant.
- **On the map** (components/town/TownFarm, the same day): a hybrid sown over two or three plots before 2026-10-16 is drawn as its one-plot picture on its root, with a sprout on each of its other plots; only the giants keep their one picture over their plots. The `wide<Crop>…` pictures stay in the atlas, unused, and `lib/town/wide-art.json` with them.
- In the game (the dev town, a bed of the eight grown and ripe beside tomato, corn, chilli, basil and eggplant, an old blue corn over three plots and an old tea bush over two; 1280x860, 384x730, 360x640) with a contact sheet of the old and new pictures at 4x. Codex on them: all sixteen at the crops' scale, none pasted on, nothing tall over the plots behind; worth fixing (art, the owner's to decide): the tea bush's grown and ripe alike (a generic leafy herb, the ripe tips faint on a phone), the ripe blue corn's ears more purple than blue.

## Doll 2: one model for everybody, the base and the new starter (2026-10-17)

The owner, 2026-10-17: every player becomes one model with the Lalafell's proportions, never named a race (male and female only), rebuilt so that a new hat or outfit is cheap to add. **The contract is [DOLL2.md](DOLL2.md); read it before any doll work.** Six calls, $0.11 (`gpt-image-2.5-sunburst`, low, 1536x1024, each once, each read by Codex first; prompts in `prompts/doll2/`):

- **`d2-mannequin-front`, `-back`, `-poses`**: in-place edits of `f-bald-*` (the approved proportions), in a plain grey top and shorts with bare feet. Every outfit from now on is an in-place edit of these. Figures land where the reference has them, within 2–4 canvas px. On the poses sheet Codex's words replaced "keeps its exact outline", so the old tunic's outline would not survive.
- **`d2-starter-front`, `-back`, `-poses`**: the new starter outfit, unisex, not FFXIV's. It is a light-blue shirt with rolled sleeves, an open maroon vest, cream knee shorts, brown ankle boots with tan soles, and a strap to a satchel at the hip. The back sheet says what shows from behind (the strap across the back, no vest front), as this file's lesson on back views says. Codex added the tan soles on the back sheet and the open vest on the poses sheet.
- `checks/cut-look.mjs` measured pitches from 4.9 to 6.7 freely on these sheets. That is the free search's noise: the figures' boxes match the reference. The builder takes each type's grid from its mannequin sheet.

## Doll 2: the trial wearables, the eating pose, the faces redrawn (2026-10-17)

The owner asked for five outfits, five hats and five accessories, everyday things of the lines, "to see how well they work in the real game". He also asked that eating look held ("การกินอาหาร ช่วยทำให้ดูเหมือน ถือแล้วกินมากกว่านี้"), and that sad and pout be made plainer. That was 81 calls, $1.49; the day's total was $1.83 in 100 calls. Every prompt is written by **`make-items.mjs`** from **`prompts/doll2/items.json`** and read by Codex in three batches; the skin keys of stage 3 used stage 2's words.

- **Outfits** `do-<id>-front|back|poses|eat`, with skin keys `dk-<id>-*`: in-place edits of the mannequin sheets. The ids are farmer, fisher, cook, forest and mountain.
  - Codex caught that the drawn farmer's legs end above the knee and the fisher's sleeves at the elbow. `items.json` now says what was drawn, so the eating sheets match.
- **Eating**: `d2-mannequin-eat` is a new pose sheet drawn from the mannequin's poses. It has four seated figures: the hands at the chest, then at the mouth, then the same two from behind, with the hands empty.
  - The starter's and every outfit's eating sheets are in-place edits of it.
  - The game draws the dish's own icon at the hands, then the fingers over it (`<frame>-hands`), so it is held.
  - Where the hands are was measured once on the base (`EAT_HANDS`, from the head's point): 6 rows under the chin, then at the chin. Found from the skin that moves between the frames instead, the arms pulled it about.
- **Hats** `dh-<id>-front|back` (straw, bucket, chef, beanie, hardhat) and **accessories** `da-<id>-*` (glasses, sunglasses, flower, kerchief, shells) are edits of the bald head, the girl's face or the mannequin.
  - **Each has a magenta key copy** (`dhk-`, `dak-`), and the builder cuts the thing out by it. Cut by colour difference from the base instead, a golden straw hat and a mustard beanie passed for skin, and dark lenses passed for the eye's outline, so pieces of them were lost.
  - Codex had the hard hat's lamp, the sunglasses' lenses and the neck things named in their keys (`key` in `items.json`).
  - A hat stores its brim's lowest row per column (`clip`), and the browser takes the hair away above it, so no hair shows through. Seen on four hairstyles front and back.
- **Sad and pout** were redrawn as in-place edits of the first ones, which are kept in `work/out/expr-v1/`. Sad has half-shut drooping eyes, a larger tear and a wider down-turned mouth. Pout has a strong blush inside the head's outline and a puckered round mouth.
- **`checks/wear-look.mjs`** lays every hat and accessory over a few hairstyles, and every outfit walking, sitting and eating, without a browser (`DIR=` a trial build). Shots in the dev town: `work/debug/doll2-items-shots.mjs`.

## Doll 2: the round glasses in the bag (2026-10-17)

The owner: "แว่นกลม มีขายในร้านลุงขายของ" (v276: a thing of the bag, worn once into the wardrobe for good). One call, $0.0191 (`gpt-image-2.5-sunburst`, low, 1536x1024). The ledger then stood at 1,580 calls and $30.029. Prompt `prompts/icons/icons-wear-a.txt`, on the owner's ICON SHEET template with its closing sentence.

- **`icons-wear-a`** (with `icons-items-e`, the goods set, for the reference): the round glasses (`wearGlasses`: a dark brown wire frame, pale blue lenses, as the worn ones are brown wire), the round sunglasses (`wearSunglasses`: a gold frame and dark lenses, as worn; packed for the bat merchant, who is not built), and four of the reference's own goods drawn only to hold the size (`_` names). Cut on the finer grid (5.54): 42x28 and 43x28; on the coarser (10.9) the lenses came out square.
- **Drawn with `NO_REVIEW`:** Codex's weekly limit was used up, and the owner had said Claude does everything, the checks too. Read by Claude against ART_WORKFLOW's ICON SHEET template.
- In the game (the dev town, `work/debug/doll2-glasses-shots.mjs`: bought at the uncle's stall, worn from the bag, worn from the wardrobe; 1280x860 and 384x730): `work/debug/glasses/`. The bag's button was first "ใส่ (เข้าตู้แต่งตัว)", which squeezed the description to a word a line on the desktop; it is "ใส่" now, as the bag's other one-word actions are, and the glasses' own words say where they go.

## Doll 2: the well outfits sitting (2026-10-17)

The owner, of the dev town: "ชุดขนน้ำ ผู้หญิง ตอนนั่ง รองเท้าหายไปข้างนึง ชุดผู้ชายตอนนั่งก็แปลกๆเช่นกัน". The drawings were at fault, not the builder: the strap sandals, seen from the front sitting, came out as two empty sole rings on `do-well-poses` and as one bare foot on `do-well_f-poses` (every other outfit's sitting feet were looked at side by side: all whole). Four calls, $0.073: an in-place edit of each sheet that changes only the first figure's feet (`prompts/doll2/items/do-well-poses-feet.txt`, `do-well_f-poses-feet.txt`, on make-items.mjs's KEEP and CLOSE), then their skin keys with stage 2's words. Drawn with `NO_REVIEW` (Codex's limit used up). The first sheets are kept in `work/out/well-poses-v1/`. In the game: `work/debug/well-fix/worn-desk.png`.

## Doll 2: the 46 (2026-10-17)

The owner: "ทำ 46 ชิ้นก่อน", of the list both AIs made (the bat merchant's four left for when he is built). 277 calls, $5.066 (`gpt-image-2.5-sunburst`, low, 1536x1024, each drawn once but for the round below); the ledger then stood at 1,861 calls and $35.169, and `gen.mjs`'s budget was raised to 45 in a commit of its own. Codex's weekly limit was used up: every call was drawn with `NO_REVIEW` giving that, on make-items.mjs's templates with the new words read by Claude (`work/debug/draw-46.sh`).

- **What:** nine outfits, each with its women's version (`smith`, `sailor`, `lamplighter`, `builder`, `raincoat`, `tea`, `caver`, `waiter`, `weaver`), eight hats, eight glasses, ten things for the neck, eleven for the hair (`prompts/doll2/items.json`). The flower crown is a hair thing, not a hat: a hat takes away the hair above its brim. Closed shoes only, after the well's sandals.
- **The trial first** (ten calls: the sailor's three sheets, the witch's hat, the monocle, the scarf, the cat ears), cut and looked at, then the batch of 252.
- **One round of fixes** (ten calls), after the look on the dolls (`checks/wear-look.mjs`, `work/debug/wl46*.png`): the tortoiseshell glasses came out as thin as the round ones and the monocle a thin ring, the crystal pendant pale violet on a pale shirt, the bell choker a dot. Drawn again bolder (a frame twice as thick with honey blotches, a thick gold rim and chain, deep violet with an outline, a wide band and a bell as big as the eye); the first in `work/out/wear46-v1/`.
- **Bag icons** (`icons-wear-b` … `-f`, five calls, with `icons-wear-a` for the reference): the twenty-four made or bought things. `-f` drew again four that read as something else beside their neighbours: the apron as a bag, the pumpkin hat as the crop, the tortoiseshell glasses as the copper ones, the garland as the flower crown. The tortoiseshell's icon is still only a little apart from the copper's. Cut on the fine grid (5.3 to 5.8): 37 to 49 wide, as the round glasses.
- **The atlas** is now one picture of 168 KB for everything but the outfits and a picture of 15 to 20 KB for each outfit (34), fetched when somebody wears it (it was 421 KB for half as many things in one picture).
- **In the game:** `work/debug/new46/worn-desk.png` (18 looks walking, from behind, sitting and eating), `work/debug/wardrobe46/contact-{desk,phone,small}.png` (the wardrobe's tabs, a hat put on over cat ears, the locked cards). A thing on top of the head (ears, horns, tiara, crown, the big bow) and a hat take turns in the wardrobe (lib/town/wear's `together`).
## PixelLab (2026-10-18/19)

Tried on the real Doll 2 mannequin and starter outfit with the free trial (40 generations), then bought by the owner as Tier 1 (2,000 generations a month, 2026-10-19). What it is used for is ART_WORKFLOW.md's "PixelLab"; `pl.mjs` makes the calls. The trial's pictures were in a private page (https://claude.ai/artifact/CuXtn4dKKMLRLXz5VAHWjW); its scripts were throwaway.

What each tool cost and gave, measured on the trial (frames padded to 64×96, 96×112 or 128×128):

| Tool | Generations | What came out |
|---|---|---|
| `/estimate-skeleton` | 0.1 | 18 joints of a standing frame, close enough to start a pose set from |
| `/animate-with-skeleton-v3`, 7 frames | 3 | the pose asked for, the 3/4 view held, no tool added, the outline kept; the mannequin and the starter with the same keypoints overlap 94–96% front, 90–92% back. A crouch "to pick something up" drew a stone in both outfits alike: say only the motion |
| `/animate-with-text-v3`, 8 frames | 1 at 64×96, 2 at 96×112 | real motion, but the body turns towards the viewer or sideways, an axe or a stick appears, eyes close on some frames, the head shrinks; the same seed on another outfit gives another pose (77–89%) |
| `/generate-8-rotations-v3` | 1 | eight views of the starter, its face, colours and pixel size kept, the satchel strap right from behind |
| `/inpaint-image-pro-flash`, 64×64 head | 5 | a happy face (closed smiling eyes, blush, open mouth) in the doll's style; 0 pixels changed outside the mask |
| `/inpaint`, 64×64 head | 1 | 0 pixels changed outside the mask, but small realistic eyes: off-style |
| `/vfx` lite | 1 | 6–12 frames at 12 fps on the sprite's own pixel size, with a pivot; `game_pack` split a rank-up ring into behind and in front of the doll. Thin and plain for big moments |
| `/vfx` pro | quoted 8 for a fire burst on the axe | not tried |

- **The shared head fixes the head.** Laying the standing frame's own head on each generated frame, as Doll 2 lays its one head, (found by colour agreement within ±22 cells, the frame's own head cleared within 3 cells of the shared one) took away the closed eyes and the shrinking head of every route; it cannot undo a turned body.
- **Jobs take 2 to 12 minutes**, and the trial ran one at a time.

## The pasture: the animal line's pictures (2026-10-20)

The owner's go for the whole line ("เริ่มได้เลย เอาจนจบตาม requirment"); every name the page draws is in docs/plans/animals/ART-NEEDED.md and lib/town/pasture-art.ts. The pasture's own picture is `public/town/pasture.json` + `pasture-<hash>.png`, built by `node build-scenery.mjs --set pasture --out <tree>/public/town`, added to the town's scenery when somebody comes onto the farm (lib/town/pasture-art's `loadPastureArt`, as the lamps' and the works' are).

**The animals: a gen.mjs base, PixelLab's frames of it** (ART_WORKFLOW's PixelLab section; the owner agreed this as a fifth PixelLab job for this line's animals).
- **The base** is a sheet of five animals of one species and a tall post (`prompts/scenery/pasture-<species>-<a|b|c>.txt`, the PROPS ON THE MAP template, with `d2-starter-front` for the scale, `critter-cat` for the town's cute animals and, after the first, `pasture-chicken-a` for the pixel size). `node pasture-base.mjs <sheet> <lo-hi> <name,…>` cuts it as build-scenery cuts props (its grid, 64 colours) and writes each animal alone on a square canvas, its feet two rows above the bottom (`work/pasture/base/<name>.png` and `.json`).
- **The frames** (`prompts/pixellab/pasture/<name>-*.json`, sent by `pl.mjs`): the walk's step and the happy hop by `/animate-with-text-v3` (1 generation each; frame 1 of the walk, the clearest of the happy), the eating and the sleeping pose by `/edit-image-pro-flash` (5 each). `prompts/pixellab/pasture/picks.json` says which picture is which frame; `pasture-frames.mjs` (read by build-scenery's pasture set) snaps every frame to its base's palette, drops what is half see-through and loose specks, and stands every frame on the base's ground point, so nothing jumps between frames. The walk is the step and the base in turn.
- **What the trial showed** (the barn hen, `pasture-chicken-a`): animate-with-text keeps the hen's facing for one or two frames, then turns it to the viewer and stretches its neck (frames 2 to 4 of a walk); it never laid the hen down for sleep (it only shut the eyes). The pro-flash edit did both poses at once, in the base's own pixels: the head down at the ground, and sitting on its belly with closed eyes. Giving the base as `last_frame` too was tried for the walk and the pecking; those two jobs were lost (the session that sent them ended before they came back: 1 generation each, written in the ledger by hand).
- **The pixel size.** The hens' sheet cut on 7.33 (32x39 for the barn hen). The map draws an animal at `ANIMAL_K` (components/town/pasture-draw: 0.6 for the birds, 0.62 for sheep and cows) map pixels to one of its own, the dolls' own pixel (pixeldoll's 0.67): a grown hen stands at a little under half a member's height. SW is SE mirrored about the feet; a frame not drawn falls back to the animal standing; a duck with no swimming picture swims as itself sunk to its middle in a ring the page draws.
- Calls: `pasture-chicken-a` ($0.0317, read by Codex, its three words taken: the post twice a character, "round shiny dark eyes", "seen from the same three-quarter top-down angle"); PixelLab, the trial: 15 generations (walk, happy, sleep 1 each; the two edits 5 each; the two lost 1 each; the first pecking failed on PixelLab's side, "heavy load", 0).
- **The other animals' bases, drawn, then paused** (2026-10-20). Fourteen sheets: `pasture-chicken-b`, `-duck-a`, `-duck-b` (five a sheet with a post, as the hens: cut on 7.0 to 7.4), and for the four-legged ones three or two a sheet on 1536x1024 (`pasture-sheep-a1`, `-a2`, `-b`, `pasture-cow-a` … `-e`, `pasture-mounts`: the ox and the cloud ram). **Five sheep on 3840x1280 (`pasture-sheep-a`, kept, not used) came out soft and painted, with a thin brown outline, at 80x90 cells**; the same words with three sheep on 1536x1024 came out crisp with the hens' outline (grid 5.15). Codex read every sheet (three batch reads); its words were taken for the cute style moved onto the species' own sheet, a four-beat walk, the dandelion's spiky seed heads, the moon duck's big crescent, a plain calf and heifer and the ram's two seats; its one-reference saving for the cows was not taken (the PROPS template's opening keeps the characters' sheet), so those five were drawn with `NO_REVIEW` saying so. `pasture-picks.mjs` writes `picks.json` (the walk's frame 1, the first happy frame that stands on the ground, the edits; `k`, the sheet's grid over its kind's first sheet's, times a share where the model drew a young one as large as a grown one). **The owner then gave the animals a sex** (bought with a chosen one, bred at random), which may want male looks: every animal but the barn hen waits for that design (`NOW` in pasture-picks.mjs). The PixelLab batch was stopped: 63 jobs had come back (work/pl), six were lost mid-job (17 generations, written in the ledger by hand), the ox's walk was made after. Nothing of these is in the game yet.
- **The pasture's things** (`pasture-barn`, N=3, the first chosen: its walls' foot closest to the map's 2:1 and the fullest of its canvas; `pasture-coop`, `-nursery`, `-things-a` (troughs, nest), `-things-b` (Uncle Popoto's stall, the making table, the hay wagon, the wagon-stop sign), `-gate` (shut and open, eggs in the grass, a grazed tuft), `-bubbles` (cut on its 16-pixel grid, 13.4)). Codex's words taken: parallel 2:1 projection for the buildings, three wide canvases for the rows, the trough two tiles long, the gate three tiles, the wagon on the map's axis, the stall facing the viewer. **The barn's three fronts are the drawn barn repainted cell by cell** (`PASTURE_REPAINT` in build-scenery.mjs: the red paint's hues to blue, sage and violet, the planks' shading kept): Codex stopped the three in-place edits it read, because the builder lays an edit on its first by colour and a repainted wall defeats that. A building stands by its walls' front corner on its footprint's, at the scale that makes its walls' foot as wide as the footprint (`BUILDING_FIT` in lib/town/pasture-art: barn 1.05, coop 1.22, nursery 1.26 map px to one of its own); the things at `PROP_K` (0.45 to 1.1, each to ART-NEEDED's size). The troughs and the gate were drawn running up to the right and are mirrored on the map; the gate's two pictures stand by the middle between their posts' feet.
- **Uncle Popoto** (`popoto-rancher`, "body", with `popoto-uncle` alone for the size and style on Codex's word; `talk-rancher`, "talk", with the map sheet): a jolly old animal farmer, plainly another popoto than the uncle (a big white beard, a wide straw hat with a red band, a red checked neckerchief, blue denim dungarees, a coil of rope; standing, waving, holding up a chick, laughing), drawn at 0.8 as the uncle is at 0.78; his talk portrait 93x114, as the banker's 94x110. Town.tsx's talk takes his own portraits once the pasture's sheet has come.
- **The three games** (each its own place, never a reskin): `pasture-game-milk` (the barn's stall: plank wall, a lantern at the upper left, a hay rack, straw), `-eggs` (the hen house inside: a window, a long beam the nest boxes stand on, plank wall, straw, a feed bin), `-shear` (a grassy pen behind a rail fence, a stool, a basket of wool), each N=3 with an existing game scene for the style and BG=opaque; chosen with `checks/cut-look.mjs`: milk 2 (the crispest, 68% of its edges on the grid; its hay rack whole inside the board's 4:3, which 3 cut off), eggs 3 (the cleanest window and beam, 60% on the grid, its feed bin whole where 2's falls outside the 4:3), shear 2 (the fence high, leaving the most grass for the sheep; 1 and 3 coarser or plainer); the others kept as `-1`..`-3`. Their pieces on the ICON SHEET template with the goods sheet (`pasture-game-pieces-a`: the milking machine, its lever up and down, the gauge and its needle turning on a middle hub (Codex's word), a splash; `-b`: the pail empty, half, full behind one sight window (Codex's word), a nest box, the gingham basket, an egg; `-c`: a cracked egg, the shears, a shorn tuft, a nicked tuft, straw, a heart), cut by even columns (`"cols"`, new in build-scenery: the needle and the splash's drops were one piece by the emptiest-column split). TownAnimalGames lays the scene as tall as the board (its 3:2 sides fall outside the 4:3) and the pieces at 2.2 board units to one of their pixels; the animal on a board is its breed's own picture.
- **The icons** (119: 51 goods, 7 tools, 16 meadow forage, 17 dishes and their 17 pots, 10 gifts, the line's `cowBell`): twenty sheets `icons-pasture-*`, written by `pasture-icons.mjs` on the ICON SHEET template (the pots on the pot sheets' own), with the reference of their line (`icons-items-e` for goods, feed and tools, `icons-items-ap` for dishes, `icons-pots-p` for pots, `icons-items-bd` for forage, `icons-mining-a` for gifts). Codex read all twenty in one batch: 14 passed (five after its words were taken), and its shared words, one silhouette for each family (every egg, fleece and milk bottle the same shape: the runner's long egg, the Valais' long lock and the Highland's pail became markings on the one shape), the duckweed a floating mat with no puddle, the legend pots' star, were applied in pasture-icons.mjs, so the six it asked to read again were drawn with `NO_REVIEW` saying so. The eggs were drawn first as the trial. Each sheet cut on the grid that shows crisp squares at the town's icon sizes (`icon-pitch2`, `icon-try`, `work/pasture/icon-sizes.mjs`): 27 to 63 of their pixels; the feed and tool sheets on their finer grid (6.1: on 12 the hoses and the press's screw went jagged). Packed with `ICONS_ONLY` + `ICONS_APPEND` (the atlas 256x19678 to 256x20381). A meadow forage spot now draws its plant's own icon (20 map px), a grazed tuft once taken.
- **In the game** (the dev trial room, 1280x860, 384x730, 360x640: the pasture by day and night, the barn hens walking, pecking and asleep, the buildings and things, the wagon at its stop, Uncle Popoto and his talk, each game, the bag, the shop, the cards and the book, the meadow before dawn): `docs/plans/animals/shots-art/contact-pasture-art.png` (30 frames; not committed). Codex on it: the scenery fits (timber, perspective, proportions), the barn hens cute and readable on a phone; faults: the yards' sand is a hard-edged rectangle on the grass (the ground's layout, lib/town/pasture: left for the new layout the owner is drawing up), the sleeping hens and the forage hard to see at night (the forage now holds a faint pool of the dew's light while still to be picked; the hens left in the dark, as asleep), the code stand-ins of the paused animals clash with the drawn boards (they wait for the animals). No covered control.
- **Spent on the pasture** (the ledger, 2026-10-20): 49 OpenAI calls, 57 pictures, $1.38 (the ledger's total $36.62 of the $45 budget); PixelLab 90 calls, about 304 generations (1,632.7 of the month's 2,000 left).
- **Round 2** (the owner, 2026-10-20: "ช่วยใช้ pixellab ในการทำท่า idle ของทุกสัตว์ ทุกช่วงวัย และ ตอนหันหน้าหันหลัง animation ตอนเดิน ด้วย", and a male drawn as his own):
  - **Males** (`pasture-males.mjs`): each species sheet edited in place into its males, `pasture-<sheet>-m`, cut by pasture-base.mjs as `<breed>M`; the golden fleece's ewe made hornless (`pasture-sheep-b-ewe`). Bulls are drawn with no udder: three came right with Codex's words (`-fix`), the Highland's and the Brown Swiss's kept theirs twice and wait for a PixelLab masked inpaint (`prompts/pixellab/pasture2/bull-*.json`, Codex's words, not sent).
  - **Shorn sheep** (`pasture-shorn.mjs`): the six sheep sheets edited into the same sheep just sheared, cut as `<breed>Shorn` / `<breed>MShorn`. The first words (only "clipped short") kept the fleece and drew a fourth ram for the post; what worked names how a sheared sheep looks (smooth, about two thirds as wide, its outline close to the body) and names what stays.
  - **Every look a PixelLab character** (`pasture-looks.mjs`, ids in work/pasture/chars.json): create-character-v3 from its base (birds on the mannequin skeleton, sheep on dog, cows on horse), then walk and idle in two views. PixelLab's "south" is our SE; the back three quarters is its **"north"**, mirrored to NE (its "east" came out a profile for the hen, the lamb and the calf). Birds' walk and idle by **pixminimax** (it held identity where v3 turned the head to the viewer; the walk says "facing unchanged" or the hen turned to a straight back view); sheep `walk-4-frames` and `idle`; cows `walk-4-frames`, and for idle **not** the horse's `rest-idle` (it lay the bull down into a sheep and striped the cow's spots; the calf's and heifer's held and were kept): a pixminimax idle as the birds' (not yet drawn). At most 6 jobs at once (Tier 1 refuses past 8); a batch writes one ledger row of its whole cost. When the network drops while a job is polled, pl.mjs now asks again rather than failing, and a failed creation is first looked for among the account's characters (three were made twice before that).
  - **Built**: `pasture-frames.mjs` lookFrames + `build-scenery.mjs --set pasture-<species>` (a picture a species); `node pasture-frames.mjs --table` writes lib/town/pasture-art's ANIMAL_LOOPS; `checks/pasture-looks.mjs` is the contact sheet (work/pasture/contact-*.png).
  - **The barn's trough** (`pasture-trough.mjs`): one trough of three equal compartments (Codex: translated copies of one module), cut by seams that join where the boards look most alike into pa_troughLeft, pa_troughSlot and pa_troughRight, and eight in-place edits filling the middle compartment with each species' feed full and half, laid on the slot. An edit that came back redrawn larger is cut on its own grid and lined up by its box.
  - **The herder** (Doll 2, make-items.mjs, items.json `herder` and `herderhat`): 20 sheets, each read by Codex. Adding an outfit moves the atlas's shared palette, so every outfit's picture is written again (the dolls checked unchanged in checks/wear-look.mjs).
  - **Back views, redone** (the owner, 2026-10-20, of the cows: "รูปวัวหันหลังดูแปลกๆนะ"; Codex then found the birds' and sheep's the same): PixelLab's rotations of a three-quarter reference give a straight view from behind (its "north") or a profile (its "east"), never the map's 3/4 back. So `pasture-backs.mjs` edits each species sheet in place into the same animals turned around (Codex's words: standing still, facing the upper right along the 2:1 direction, the broad rump and near flank, the head held as low as in the front, bulls with no udder), cut as `<look>Back`; each is a PixelLab character of its own (its "south" is that view), walked by the custom engine; its idle is the base standing still (an animated idle from behind turned the head to the face). The first cow trial held its head high and stood a third taller than its front: "held level with its back, no taller and no larger" fixed it.
  - **Walks**: the horse skeleton's walk bent the cows' legs ("ตัวนี้ขาเบี้ยว"): cows walk by the custom engine (a slow four-beat walk, legs straight); its rest-idle laid the bull down into a sheep, so a cow's idle is custom too. The sheep keep the dog skeleton's walk (Codex found them natural).
  - **Two runs at once** each wrote work/pasture/chars.json over the other's: the frames builder now reads the characters from PixelLab's own answers (`charsFromPl`; `pasture-chars.mjs` writes the file again). When the network drops while a job is polled, pl.mjs asks again, and a failed creation is first looked for among the account's characters.
  - **The farm's buildings** (`pasture-barn8`, N=3 on a 2:1 footprint guide, `work/out/guide-barn8.png`: without it every barn, round 1's too, came out at a 0.38-0.43 slope; the first chosen at 0.47/0.45): `pa_barn` for the 8 x 4 footprint, `pa_barnDoorOpen` and `pa_barnInside` edits standing where it stands (the inside by build-scenery's `same` option: its walls are cut, nothing to match by colour; its sill lowered to a baseboard so the front row shows), the farm's gate side and a pen fence tile (`pasture-farm-things`, the gate drawn the way the model draws it and mirrored, each standing on its post's foot), BUILDING_FIT measured for each. Codex's shot review: ship.
  - **The rename tag's icon** (`icons-pasture-tag`, appended to the atlas).
  - **E-H and the cloud ram** (lanternHen ... goldenFleece and their males): their SE walk and idle in one run (`--se`), their 3/4 back from their back characters. The dog skeleton drew the rainbow ewe walking a fifth smaller and the rainbow ram with a long leg (Codex), and its idle drew both 15% smaller than the base: both redrawn by the custom engine (the cow walk and idle words), the dog runs kept as `-dog`. The cloud ram's SE idle dropped its saddle (kept as `-nosaddle`): it stands on its walk's first frame.
  - **Every pose of one animal the same size** (the owner, 2026-10-22: "ทุกท่าทางของสัตว์ตัวเดียวกัน จะมีขนาดเท่ากันเสมอ", the cow larger walking away than towards). Measured (scratch eh/area.mjs, sizes.mjs): the back views, drawn from their own characters, stood up to a quarter larger than the front (calf, lamb, heifer, the dandelion and star sheep, the dairy bull) and some idles a fifth off their walks. lookFrames now fits every loop of a look to its SE walk: a frame's size is sqrt(sqrt(drawn pixels) x its box's diagonal), a loop's the median, the fit goes into the piece's scale (no picture resized). After it every loop is within 4% of its SE walk. `KEEP` drops frames drawn unlike the rest of their loop: the heifer's SE idle 0-2 (smaller, a grey smudge), the shorn Jacob and golden rams' idles (two frames a fifth and a tenth off), the Shetland ram's SE idle (pale all through: it stands on its walk's start). The cloud ram's `pa_ram_idle` was never built after its idle was dropped, so the mount standing still was the code-drawn stand-in: now made. Not fixed, a redraw: the shorn golden ram's SE walk is a thin, long-legged body unlike its idle. **build-scenery.mjs writes to E:/NinenineProject/fcnext/public/town unless `--out` is given: in a worktree always pass `--out <worktree>/public/town`.**
  - Spent (the ledger, PixelLab's own count): PixelLab 766 generations this round (1,632.7 to 866.7 left); OpenAI 97 calls, $2.15 (the ledger's $38.77 of $45).

## Granny Twilla's clothes shop: forty things, eight hairstyles, the auction's two sets (2026-10-25)

The owner, 2026-10-25: an indoor clothes shop with Granny Twilla, about forty new wearables over every slot and price, a
try-on, and a weekly auction of limited outfits, this round two Halloween sets for men and women. OpenAI credit was down
to $1.10, so: "ช่วยเอาไปทำที่ PixelLab แทน แต่พยายามทำให้ออกมา เป็นแบบเดียวกันให้ได้" (gen.mjs's budget not raised).
Every picture here is PixelLab editing the game's own native pixels, so the style is the mannequin's own:

- **Outfits** (`pl-items.mjs`, `pl-doll.mjs pack|unpack`): the mannequin's eight walking and six sitting frames laid on
  one canvas each at native size on the builder's own grid (the seated pitch too), edited by `/edit-image-pro-flash` with
  the Count's words as the template (STYLE, WALK, REST, SEAT), laid back cell for cell into `do-`/`dk-` sheets. Long capes
  and gowns are in the outfit itself (the Count's cape, the Countess's gown); seated, nothing may fall below the figure's
  own lowest pixels. Eleven shop outfits x2 (men's, women's) and the two auction sets x2.
- **Head things** (`pl-doll.mjs head <slot>`, `unhead`): the bald head front and back on one canvas, masked by slot
  (`hat`, `hatwide` for a wide brim, `full` for the pumpkin head, `hair`, `face`, `neck`, `hairdo`), by
  `/inpaint-image-pro-flash`. The changed cells are the thing; the head redrawn a few shades off is the head, and skin
  grown past the head's old edge is the head only within two cells of it (a bear ear's tan inside, further off, is the
  ear: fixed 2026-10-25 after the ears came out as hollow rings). `--prune` takes a one-cell thread off (a brim's ring);
  `--one` keeps only what lies by the largest piece (the pocket watch's strays by the boots).
- **Hairstyles** (`prompts/pixellab/hair/`): f15–f18, m14–m17 painted on the bald head (`hairdo` mask), green to be
  recoloured as every hair is. The hime cut (f18) came out short in front; its long sides were painted on its own picture
  with a mask beside the body only (`f18-sides`, read by Codex: send).
- **Granny** (`popoto-granny`, `talk-granny`, `pl-sheet.mjs`) and **the limited one-shots** (`/vfx`, `count-bats`,
  `pumpkin-wisps`: public/town/vfx, lib/town/limited-fx.json).
- **Reviews**: each batch's template and its pictures read by Codex before it ran (`REVIEW=`); 7 calls made unread with
  the reason in the ledger: cowboy/sunhat (Codex stopped only for a canvas in git-ignored work/, the words it had passed
  in the batch read, only the brim's thickness added), the sun hat on a wider mask, the bear ears and the first hime
  redraw (in the words of Codex's own art review).
- **Codex's art review** of the whole set (`checks/wear-look.mjs` contact sheets): three faults, all fixed: the pocket
  watch's strays, the bear ears' thin ring, the hime cut's short front.
- **Spent** (the ledger, PixelLab's own count): 110 calls (56 edit, 50 inpaint, 4 vfx), about 714 generations (866.7 to
  151.3 left this month); OpenAI none.
- **The fringes** (the owner, the same evening, of the hairstyle sheet: "ทรงผมบางทรงดู ตลก ดูหัวล้าน"): beside the old
  hairstyles (`checks/shop-gallery.mjs`, its sheet 6) seven new ones stopped at a straight hairline over a band of bare
  forehead, where the old ones' bangs come down to just above the eyes. Each was given a fringe in its own style on its
  own picture, the front view's forehead masked (`head-hairdo/fringe-mask.png`, x 11–49, y 26–37), read by Codex (fix:
  gaps between locks allowed rather than a solid curtain; bolder shapes for f15, f17, m16, its words taken). 7 calls,
  42 generations (109.3 left). The wardrobe now shows every hairstyle as a card on one's own head, the shop's not
  bought as its shadow with the shop and the price.
- **The hanging lengths** (the owner, of the hime cut and the half-up bun: "ทรงผมเหมือนโดนตัดแปลกๆ"): both hung as flat
  blocks cut level (not a crop: the built hair is as tall as drawn). Their hanging lengths, front and back, were painted
  again in locks with tapered ends of uneven length (`f18-ends`, `m17-ends`, masks clear of the ears, bangs and bun; read
  by Codex: send). 2 calls, 12 generations (103.3 left). Specks of skin left at the crown's rim from behind (the model's
  hair outline a cell inside the skull's light edge) are covered by the builder for the shop's hairstyles only
  (`coverRim`, `SHOP_HAIRS`); `checks/hair-crown.mjs` counts bare crown cells (none on the eight; the old ones untouched).
  Codex's look after: the undercut's blonde back (its shaved part near skin) and the mullet's back (a flat slab) still
  weaker, shown to the owner before any redraw.
- **The fourth women's style, new** (the owner, of the hime cut: "ทรงนี้แปลก ไปออกแบบมาใหม่เลย"): three designs drawn on the
  bald head and built each into an atlas of its own to show as the game draws them (`f18-a` long high twin tails, `f18-b`
  high ponytail, `f18-c` crown braid; Codex: a send, b and c its words). He took the twin tails but not their bangs: "อย่า
  ทำให้หน้าม้า ตัดตรงแบบนี้ ทำให้มันเหมือนทรงผมปกติหน่อย อันนี้มันเหมือนภาพเกินไป". The bangs painted again as a few swept
  locks of uneven length with pointed tips (`f18a-bangs`, the forehead between the tails masked; drawn twice, the second
  kept: the first left a bare patch over one eye). f18 is now "ทวินเทลยาว" (`hairtwintails`, 2,200). 6 calls, 36
  generations (67.3 left). **Bangs are never one straight edge** (his rule).
- **The twin tails' way for all** (the owner: "ทวินเทลยาว ดีแล้ว ช่วยใช้ solution ทวินเทลยาว กับทุกทรงผมใหม่ด้วย", and of the half
  bun again "ตัดแปลกๆ"): the seven others drawn again from the bald head on the twin tails' words (`<id>-v2`, Codex: the
  women's send, the men's its words: the undercut's buzzed band "clearly visible dark green", the mullet's back "three
  broad overlapping locks", the curls "rounded and scalloped", the bun "projects above the crown"). As with the twin
  tails the fresh draws gave straight bangs again (f16, f17, m14, m15, m16, m17); the space buns' first draw came back
  without its back view (drawn again). With 19 generations left: the undercut, mullet and half bun kept and given the
  bangs-only pass (`<id>-bangs`, the twin tails' words, `bangs-mask.png` x 14–47 y 24–37); the long waves, pixie and
  curls back on their fringe versions (natural bangs already, Codex fine). 11 calls, about 66 generations: **PixelLab
  at 1.3 for the month.** Weak still, for next month: the mullet's bangs read nearly level in dark brown; the
  undercut's buzzed band goes tan in blonde.
- The owner then of the space buns ("แก้ทรงนี้ด้วย"): its redraw's bangs were cut level too, and no generations were left
  for a bangs pass: it is back on its fringe version (parted tapered locks), at no cost.
- **Trying them on locally** (the owner, 2026-10-25 night): "ชุดนี้ลองแล้ว เหมือน detail แปลกๆ", "หมวกมีหลายใบที่เก็บรายละเอียด
  ไม่ดี", "แว่น รายละเอียดไม่ดีเลย". Drawn against built: the outfits and the glasses are in the game pixel for pixel as
  PixelLab drew them (plain: the outfit template's "Simple bold shapes, no fine pattern" was taken to the letter; the
  glasses are a few pixels across an eye of seven); the hats were not: `--prune` had eaten the cowboy's and the sun hat's
  brims, the bear hat's ears were hollow, and where the model kept the head's outline under a hat in much the hat's
  colour the lay-back left a hole the outline showed through, a ring over the hat. `pl-doll.mjs unhead` now fills, for a
  hat (`dh`, or `--fill`), a cell the hat has on both sides and any gap it closes all round, in the picture's own
  colour; ten hats laid again without `--prune`. **Owed next month (his choice: open now, redraw then):** the ten shop
  outfits ×2 and the eight glasses redrawn with words for shading, folds and highlights (not "simple bold shapes"),
  about 290 PixelLab generations (or about $4–5 by gen.mjs, which needs credit and BUDGET raised).
- **The necessary first, by gen.mjs** (the owner, 2026-10-26: "ตอนนี้มี credit openai อยู่ 1.12 usd ช่วยแก้ไข เรื่องที่จำเป็นก่อน"):
  the eight glasses (the two auction sets' among them), the skeleton outfit both genders (a Halloween thing on sale
  now) and the long waves (f16) drawn again the Doll 2 way, on make-items.mjs's templates (`ONLY=` the ids) and
  prompts/hair.txt, the PixelLab sheets kept in `work/out/pl-v1/`. New words in items.json: opaque shades whose
  lenses hide the whole eye, outline and lashes included (the star shades had shown the eyes' outline under them), a
  skeleton with a rib cage, spine and pelvis ("three bars" before), the tutu's sitting words after the farmer's skirt;
  the long waves on both sides and down the back, its bangs in uneven pointed locks. **Codex read every call** (four
  batch reads, 2026-10-25-16-56-18 … 17-05-59): its words taken for the masquerade (the feather on one side), the
  eye patch (one eye), the pumpkin glasses, the heart shades, the women's skeleton from behind and the waves' back
  view; the star shades corrected at the source and read again; four keys given `key` words (the whole opaque lens,
  the whole patch, the mask's every part). **Watch out:** `make-items.mjs` writes every item's prompt file whatever
  `ONLY` says, so Codex's words copied over a prompt are lost if it runs again: copy them after. 34 calls, $0.618
  (the ledger $39.388 of $45; about $0.50 of the account's credit left). In the game: the skeleton reads as a
  skeleton standing, sitting and eating; the lenses hide the eyes; the waves are full front and back.
- **Pixel bugs under the hats and at the neck** (the owner, 2026-10-26, trying them on: "หมวกใหม่หลายใบยังมีบั๊คล่างหมวก",
  then "นอกลายตัดเส้น ลบออกให้หมดเลย ส่วนข้างในถมสีให้เต็ม" with the bad spots circled). Several causes, found with
  `UNHEAD_DEBUG` and `checks/piece-look.mjs`: (1) PixelLab paints the forehead under a brim a few shades off our skin, so
  it passed every skin test and came in as hat: the lay-back now learns the model's own skin tones from the cells that
  touch the face left as it was (front only: the back has no face, and a hat's colour touches the bare nape there),
  takes off what it reaches of them, then a few cells further into darker shades (never lighter: straw is as light as
  skin); (2) the older "skin grown past the head's edge" rule took a straw brim's cells beside the head (the sun hat's
  slits): not used for hats now; (3) **the atlas builder aligned a key to its sheet by the first of several equal shifts,
  two cells up and left**, which cut the aviator cap two rows low, onto the forehead: a tie now goes to no shift, for
  laid things only (the old hats' keys are drawn apart and keep the old rule: checked, all unchanged); (4) small
  skin-hued bits outside the dark outline (ear tips) go, a slit two cells wide with hat on both sides fills, an enclosed
  gap fills; (5) neck things kept the mannequin's grey top drawn again (the camera laid a grey shirt over the doll's
  own): a grey over the grey top at nearly its lightness, and reddish skin over its skin, are left out.
  `checks/hat-bald.mjs` 0, `hair-crown` clean, every hat and neck thing looked at alone and on dolls with short and long
  hair, front and back. Left, unseen in the game: a few cells under the chin in some neck pieces, which the face always
  covers.
- **The ears and the ring drawn again, and no bands** (the owner, 2026-10-26: "ช่วยแก้ไข หูหมี หูจิ้งจอก ที่คาดผมหนวดผึ้ง วงแหวนเทวดา
  แนะนำให้ gen รูป ออกแบบใหม่ดีกว่านี้", then "ไอเทมที่เป็น band ที่คาดหัว ตอนใส่ไม่ต้องขึ้นมาเป็น band เลย ขึ้นมาแค่หูสัตว์ ก็พอ"):
  bear ears, fox ears, bee antennae and the angel's ring by gen.mjs on the cat and bunny ears' words, each read by Codex
  (its words: a broad solid band, opaque to the outline; the ring a broad open oval with a gap above the head; never the
  word "halo"), 16 calls, $0.29 (about $0.07 of the account's credit left). Then **items marked `ears` in items.json
  (bear, fox, cat, bunny ears, the antennae, the horns) lose their band in the builder**: what stands farther from the
  drawing's own head than the band's thickness at the crown's middle is an ear, each kept down to the head's top in its
  own columns, its foot and cut sides closed with the piece's outline. Hair things also lost, in the builder: specks a
  quarter of the largest piece or less (eye spill, which showed on a blink), one-cell dark lines (a head outline drawn a
  cell larger: the fan pin's arc), reddish skin peeled in from the outside (never a hole inside a fox ear or a hibiscus);
  and in the lay-back, skin painted over the head's own outline. Left: the tiara's band shows a strip of skin inside it
  (an older item; closed inside the band, so peeling from outside does not reach it).
- **Ears set onto the head** (the owner, 2026-10-26: "หูมันดู ลอยๆ ไม่ติดกับหัวตัวละคร ช่วยแก้ไขหน่อย ยกเว้น วงแหวนนางฟ้า"):
  with the band cut away, each ear of an `ears: true` thing kept only what stood off the head, cut at the crown's
  height, so the ears floated over a head that curves down at the sides. The builder's ears step now keeps each ear's
  own shape (what stands off the head, the rows below it only where they are as wide as an ear and no lower than an ear
  that round would reach: its top plus its width) and sets the whole ear down onto the head by the least gap between
  its foot and the head's surface. Two tails this exposed went with it: the bear ears' band side under the left ear
  (eight cells wide, it passed the wide-row test) and the bunny ears' band side right under the foot; and a lone cell
  like none of its neighbours inside an ear takes their colour. The angel's ring is not an `ears` thing and floats as
  drawn. Looked at on dolls with short, long and spiky hair, front, back and sitting (`work/shop-mock/ears-zoom9.png`),
  alone at 6x, and in the dev game at desktop and phone size; hole check whole, `checks/hat-bald.mjs` 0 of 56.
- **Ears from the back, into the hair** (the owner, 2026-10-26, a shot of the fox ears from the back: "ด้านหน้าผ่าน แต่
  ด้านหลังลอย แบบนี้ไม่ได้"): from the back the ears are drawn with a flat foot on the crown, and the head curves away
  under each ear's outer half (nine cells under the fox's): the band filled that gap. Filling it over the hair failed
  twice (a base cut off at the scalp hung as drips; one stopped where a hair usually ends came to a point like a speech
  bubble's tail), so an ear that floats from the back now goes **before the hair**, whole, with its base carried on down
  into the head in its own colour column by column: a piece of its own, `under` in the atlas, drawn by
  `lib/town/pixeldoll` after the face and before the hair. Each hairstyle's own outline then crosses the ear where it
  comes out. A hairstyle that rises far over the head from the back (the pineapple, the big spikes) hid the ears, so the
  atlas records each hairstyle's `lift` (its middle height over the skull under the ears, less four, at most eight) and
  the game raises the back ears by it. Only floating ears do this: an antenna's stalk already reaches the head and stays
  over the hair (behind a big hairstyle its ball looked stuck on). The front is untouched: every front piece, hat and
  hairstyle compares pixel for pixel with the build he passed; the five back views changed (fox, bear, cat, bunny,
  horns). Looked at on all 35 hairstyles from the back (`work/shop-mock/sweep-*-z.png`) and in the dev game at desktop
  and phone size; the black cat ears behind the big spikes stay hard to see.

## The casino's reels: the evercold (2026-10-27)

Aqua's big prize, the evercold (the FC's name for the coming expansion: its poster's ice crystal), a fifth symbol on
the casino's reels (v299). One call, $0.0191 (`gpt-image-2.5-sunburst`, low, 1536x1024, drawn once; the ledger then
stood at 2,881 calls and $39.842 of $45). Prompt `prompts/icons/icons-casino-a.txt`, on the owner's ICON SHEET template
with its closing sentence, `work/out/scene-icons.png` for the reference.

- **`icons-casino-a`**: one tall ice crystal with the gold star of a rare thing (`reelEvercold`), a stack of coins with
  one on its edge (`reelCoins`, the pair's coins back), cherries, a gold bar and a potato with a face (`reelCherry`,
  `reelGold`, `reelPopoto`: the code-drawn reel symbols of lib/town/casino-symbol-art drawn the town's way, for the owner
  to choose whether to take them), and a cluster of three ice crystals with the star (`reelEvercoldB`). The reels use the
  single crystal: the cluster was tried first and Codex's look in the game (2026-10-27) found its tips running together
  at a marquee's and a cabinet window's 12 to 16 screen pixels, where the single crystal keeps its shape. Codex also
  advised drawing the cherries, gold bar and potato from this sheet for one look (the seven stays code-drawn: the
  template forbids numbers): the owner's to choose. Cut on its finer grid (8.0): on the coarser (16.6, which
  `icon-pitch2` gives first) the crystals and the coins broke into pieces.
- **Its own small picture**: `ICONS_ONLY=icons-casino-a ICONS_PUB=<tree>/public/town/casino ICONS_JSON=<tree>/lib/town/casino-reels.json
  node build-icons.mjs` (256x41, 2.7 KB): the town's atlas is not touched, and only the casino's pages ask for it.
- **Drawn with `NO_REVIEW`**: Codex's weekly limit was thought used up until 2026-10-27 13:32 (the reason is in the
  ledger); Codex looked at the sheet in the game afterwards (above).
- In the game: the reels of the sheet, the cabinet windows and the marquee over a machine, 1280x860, 384x730, 360x640
  (`scripts/town-casino-db.mjs`).
