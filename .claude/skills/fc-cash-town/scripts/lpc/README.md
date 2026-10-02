# LPC pixel avatars (prototype, 2026-10-02)

Cash Town avatars from the Universal LPC Spritesheet Character Generator
(github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator).
Nothing here is used by the site yet.

    git clone --depth 1 --filter=blob:none --sparse <repo> ulpc
    git -C ulpc sparse-checkout set sheet_definitions palette_definitions
    git -C ulpc ls-tree -r --name-only HEAD -- spritesheets > all-sprites.txt
    python build_proto.py fetch    # resolve the curated items, sparse-fetch exactly their files
    python build_proto.py page     # pack atlases + palettes + credits into proto/catalog.json
    (then inline catalog.json into page_template.html at __DATA__)

What the LPC data says, and what this relies on:
- Sheets are 64x64 frames, 4 rows (up, left, down, right), one PNG per animation.
  walk 9 frames (0 = standing), run 8, idle 2, sit 3.
- `sheet_definitions/**.json`: per item, `layer_N` (zPos, path per body type),
  `animations`, `recolors` (material + palettes, or colour channels), or
  `variants` (old style: one PNG per colour), and `credits`.
- Recolouring is an exact palette swap: `palette_definitions/<material>/<material>_ulpc.json`
  ramps (6 colours; eyes 3). Art is drawn in the material's `base` ramp unless the
  channel declares one (a wolf head: `"base": "ulpc.fur_brown"`).
- Old-style items whose one variant is drawn exactly in a base ramp (tails "orange",
  wizard/bowler/top/christmas hats "white"; checked 100% pixel match) are recoloured
  from that one sheet. The child-body clothes are older art and keep their fixed colours.
- Body types used: male, female, child (Lalafell). The child body has walk, idle, sit
  (no run), and its only clothes are a shirt, pants and a skirt, for walking only.
- Licences: CC0 / CC-BY / OGA-BY / CC-BY-SA / GPL per file. Credit every author of
  the files used, on a page members can reach (the prototype lists them per item).
