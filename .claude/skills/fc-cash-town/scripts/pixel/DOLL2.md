# Doll 2: one model for every player (2026-10-17)

The owner, 2026-10-17: every player becomes one model, the Lalafell's proportions, but it is
never named a race: only male and female. The base is rebuilt now, keeping the approved
proportions, so that a new hat or outfit is easy to add and cheap in Claude's tokens. Order:
the base and a new starter outfit (not FFXIV's), then expressions, then action frames for
the lines. Profession lines give fashion outfits by rank, worn freely.

This contract was written by Claude and checked by Codex (two `plan` rounds, gpt-6-astra).
Where they differed, Codex's correction is taken and marked "(Codex)".

## Two spaces

- **Body space.** Every frame is a fixed cell, with the feet at a fixed point. Every body
  layer (the outfit's body, a held tool, later back items) uses that cell's coordinates.
  Each frame carries anchors:
  - feet;
  - seat, on sitting frames: ground sitting and chair sitting are different;
  - the head point;
  - both hands, from the action phase on.
  Each frame also carries a coverage mask and draw-order slots, because a raised arm or
  tool passes before the head on some frames and behind it on others (Codex).
- **Head space.** One per view: 3/4 front and 3/4 back, with the other two directions
  mirrored. It is laid at the frame's head point.
  - **The head never tilts or rotates in any pose; it only moves.** So every head item is
    drawn once per view and fits every pose. Lying down, later, is an exact 90°.
  - Layers, back to front: hair-back, skull with ears, face parts, hair-front, glasses, hat.
  - Hair-back is ordered against the torso per view: behind it in front views, over it in
    back views.

## One body for both genders

- Gender comes from the face parts (brows, lashes), the hair, and voice. Every outfit is
  drawn once, not twice.
- The pilot proves or refuses this. The fallback is two bodies, which doubles every
  outfit's cost.

## The mannequin

- `d2-mannequin-{front,back,poses}` are in-place edits of the approved bald sheets
  (`f-bald-*`): the same figures, places, size and pixel grid, wearing a modest plain grey
  top and shorts, with bare feet.
- The mannequin is the base that **every outfit is an in-place edit of**. An outfit is cut
  as a complete body from its own sheet, not as a difference from the mannequin, because a
  difference leaves halos (Codex).
- Anchors are measured once on the mannequin and checked on each outfit (±1).

## Colour

- **Classify materials before snapping to a palette, and refuse ambiguous cells** (Codex).
  `pxlib`'s RGB snap cannot tell materials apart.
- **Skin:** skin-key copies stay until the mannequin's bare skin is proven to come through
  an outfit edit unchanged. Six skin shades.
- **Dye channels:** an experiment after the pilot, not a launch feature.
  - The model does not keep exact colours: the README records head drift, lost violet eyes
    and inaccurate skin keys.
  - Cloth keys must avoid the hair's green, the eyes' violet, magenta (which overlaps the
    violet-eye class), and the skin key's cyan.

## Hats and hair

- Every hat fits one standard crown and brim envelope.
- Every hairstyle needs hat variants of hair-front and hair-back: 2 layers × 2 variants ×
  2 views = **8 pieces a hairstyle**, 216 for today's 27.
- Tall buns, pigtails and low brims are flagged as exceptions (Codex).
- Hoods and helmets hide all the hair. They are a later class.

## Faces (expressions come before actions, on the owner's word)

- Faces are built from parts on fixed slots. Today's female face is 48×37 and its eyes are
  5×7 (near) and 3×7 (far).
- **Eyes are drawn as pairs, keeping the 3/4 asymmetry** (Codex).
- The first set is neutral, blink, happy, sad and surprised.
- Swirl eyes (@@), sparkle eyes and a cat mouth (:3) wait until they are proven readable
  at game size. Intentional isolated pixels in an expression are kept, not cleaned away as
  specks.

**As built in the pilot (2026-10-17):** five expressions to start, on the owner's word: smile, surprised, sad,
pout and shy.
- Each is an in-place edit of the gender's own face (`<g>-x_<expr>-front`), shown for 4 s from the emote window.
- Shy is laid over the player's own face and keeps their eyes (what changed below the eyes: the blush, the mouth).
- The other four show their own eyes while they last, as authored faces first, as Codex advised.
- The pinks are a cool rose, in a palette of their own, and never taken for skin.
- Adding one: a prompt in `prompts/doll2/x-<g>-<id>.txt`, a line in `EXPRS` in the builder (with `keep`), and one
  at the end of `lib/town/expression.ts`.

## Frames (per view; 2 views are drawn and mirrored to 4 directions)

| Phase | Frames per view | Per outfit (×2 views) |
|---|---|---|
| 1, the base: walk 4 (step 0 is standing), sit 1 (the chair perch derived as today) | 5 | 10 |
| Later action families, shared by the lines rather than one per line: swing-over 3 (pick, axe, hammer, hoe), swing-side 3 (net, sickle), crouch 2 (gather, pick, weed), cast 3 (fishing), pour 2 (watering, bucket), eat 2 (seated), hold-up 1 (torch) | +16 | +32 → **42** |

- **Fashion shows in every supported pose.** At four frames a sheet that is about 11 calls,
  about $0.22 an outfit (plus skin keys while they are needed), and about 0.8 MiB decoded
  per outfit.
  - Atlases are loaded only for outfits someone in view is wearing.
  - The compositing cache is bounded in bytes, not entries: a cache miss costs CPU (Codex).
- **Each new action family later adds (its frames × 2) to every outfit already made.**
  Lock the families before the catalogue grows.

## Outfit shapes

- **At launch:** whole sets with fitted tops (sleeves close to the arm), shorts or
  trousers, and boots or shoes.
- **A knee skirt is tested separately,** with its own sitting envelope. There is no
  universal "mannequin + 2 px" rule (Codex).
- **Later:** capes, robes and long dresses, which flow in walk, sit and crouch.
- Hats and glasses are separate head items. Back items (cape, backpack, wings) come later.

## Adding a thing must be cheap in tokens

`doll-add.mjs outfit|hat|hair <id> "<one line>"` (to be written) does the whole run:

1. It writes the prompts from a fixed template, with the mannequin sheets as the only
   references.
2. It has Codex read the batch (`codex-ask.mjs art --calls`) and then draws it.
3. It builds the sheets and checks them: holes, specks, ambiguous materials, anchors and
   coverage.
4. It renders **one contact sheet** at game size.

Claude writes the one line and looks at the one picture, and the owner OKs it. It
orchestrates; it does not accept art by itself (Codex). Every reference is stamped by its
bytes, not only its name (Codex: `gen.mjs` stamps basenames).

## Ownership

- The starter needs no database change.
- **Where a thing comes from is its `from` in lib/town/wear** (as built, v276 and v277):
  - a rank of a line (`at(rank, line)`): worked out on the page from the lines' points, nothing in the database;
  - the workbench (`CRAFT`) or the uncle's shelf (`UNCLE`): a thing of the bag in lib/town/wear-items (its item,
    its recipe or its price), worn once into the wardrobe by `town_dress` (DRESS_ITEMS says what it is worn into);
  - a drop (`drop(line, chance, { what, things, hours, rain, knob, how })`): rolled by town.work_counted at every
    count of that line's points that gives points, from the catalog's `wear_drops` (lib/town/wear's dropsFor is the
    same rule, and the trial's);
  - the bat merchant: not built, the card says "soon".
- What is bought or dropped is `town_dressed` (closed to the browser; `town_dressed()` tells a member their own). A
  new bought, made or dropped thing needs a migration for its catalog rows (TOWN_WRITE writes them); a rank one does not.
- Looks are still trusted from other players' pages (cosmetic); a page takes off what its own player does not have.

## The new starter outfit (not FFXIV's, universal, unisex)

A light-blue linen shirt with sleeves rolled to the elbow, a short sleeveless maroon vest,
cream knee-length shorts, soft brown ankle boots, and a thin leather strap across the chest
to a small satchel at the hip. Codex: keep the rolled sleeves modest and test that the
strap reads at game size.

## Adding a thing, as built (2026-10-17)

1. Add a line to `prompts/doll2/items.json`: an outfit's `front` and `back` words (and `f` for the women's version,
   with `pose` when it has a skirt), a hat's, or an accessory's with its `slot` (face, neck, hair). Add `key` when the
   thing has parts a plain word misses, `clear: true` for glasses whose lenses show the eyes. Closed shoes: strap
   sandals came out as empty rings and a bare foot when sitting (2026-10-17). Something that sits on the hair and lets
   it show (a crown, ears) is a hair thing, not a hat: a hat takes away the hair above its brim. Use the same id in
   `lib/town/wear.ts`, at the end of its list, with its `from`.
2. Run `node make-items.mjs 1 <calls>`, then `codex-ask.mjs art --calls <calls>`, then the printed `gen.mjs` lines.
   Stages 2 to 4 are run the same way: an outfit's eating sheet and skin keys, then a hat's or an accessory's magenta key.
3. Run `node build-pixel-atlas.mjs --doll2 --out <tree>/public/town`, then `node checks/wear-look.mjs`: one picture of everything.
   Each outfit is packed in a picture of its own (`pixel-o-<id>-<hash>.png`, pixel.json's `sheets`), which the page
   fetches when somebody first wears it; everything else is in the one picture.
4. Shoot it in the dev town at desktop and phone size, and have Codex look (the UI rule). Then it is the owner's.

Calls a thing costs: an outfit 8 (four sheets and their keys), a hat 4 (two views and their keys), an accessory 2 to 4.
At about $0.02 a call, an outfit is $0.15. Claude writes one line and looks at two pictures.
