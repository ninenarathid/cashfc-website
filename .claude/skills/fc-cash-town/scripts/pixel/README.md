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
| `build-pixel-atlas.mjs` | `work/out` → `public/town` (`--out <dir>` to try elsewhere; `--poses` adds sit, sleep and wave) |
| `pxlib.mjs` | Grid, cells, palette, shapes |
| `pixelize.mjs`, `anim.mjs` | The spike's one-sheet tools |
| `work/` | Sheets, ledger, debug pictures. Git-ignored by its own `.gitignore`; back it up, the sheets cost money. |
| `prompts/` | Every prompt used |

## Running it

- **The key** is `OPENAI_API_KEY` in fcnext/.env.local. It is never printed.
- **Every call** is logged in `work/ledger.jsonl` with its cost, worked out from the returned usage: $8 per 1M image-input tokens, $30 per 1M image-output tokens, $5 per 1M text tokens. About $0.018 a call.
- **Budget:** `gen.mjs` stops within $0.50 of `BUDGET` ($10).
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
- **The hairline fix** (`build-pixel-atlas.mjs`, "fillCrown"): seen from the front, several styles part with bare skin almost to the crown, which under dark hair read as a wig set too far back. Skin above 68% of the way from the head's top to the eyes, with hair on both sides of it, is filled with the style's main tone, with an outline-coloured edge. `work/doll-look.mjs` previews styles in black hair, before and after (`DIR2=work/pub2` for a build made with `--out work/pub2`).
