# Cash Town image generation workflow

Persistent owner instructions, saved 2026-10-15. Apply this workflow to all new or regenerated Cash Town art. Read this entire file, the entire adjacent README.md, and the "Game art quality" section of the repository's AGENTS.md before preparing prompts or generating images. The owner's templates below take precedence over historical examples in README.md and generic image-generation workflows.

Paths in the owner's instructions are repository-relative unless they start with `work/`, `prompts/`, `checks/`, or name a pixel script; those resolve from `.claude/skills/fc-cash-town/scripts/pixel/`. The `~/.claude/` review helper is relative to the user's home directory. In PowerShell, invoke it via `Join-Path $HOME '.claude/skills/codex-pair/scripts/codex-ask.mjs'` and set environment variables with `$env:N = '3'` or `$env:BG = 'opaque'` for the relevant call, restoring their previous values afterwards.

The figures 1,267 images and $23.84 below are the owner's historical snapshot, not current totals. Read the shared `work/ledger.jsonl` and `gen.mjs` for current spending and budget; do not reset the ledger. Budget handling below applies only during an authorized generation task. The regeneration list is a backlog and requires the owner's instruction before replacing live art; saving this workflow does not start that work.

## Owner's original template (preserved verbatim)

ภาพทุกชิ้นใน Cash Town ต้องสร้างด้วยวิธีและสไตล์เดียวกับที่ Claude Code ใช้มาตลอด
(ภาพเดิม 1,267 ภาพใน work/ledger.jsonl ทำแบบนี้ทั้งหมด) ก่อนเริ่มให้อ่าน
.claude/skills/fc-cash-town/scripts/pixel/README.md ทั้งไฟล์ และหัวข้อ "Game art quality" ใน AGENTS.md

1) เครื่องมือ: ห้ามเปลี่ยน
- สร้างภาพผ่าน gen.mjs เท่านั้น: ไปที่ .claude/skills/fc-cash-town/scripts/pixel แล้วรัน
  node gen.mjs <name> gpt-image-2.5-sunburst low 1536x1024 prompts/<kind>/<name>.txt <reference.png ...>
- ห้ามใช้ built-in image_gen
- ห้ามวาด icon หรือ sprite ที่ผู้เล่นเห็นด้วยโค้ด (rect()/line() แบบ add-reward-icons.mjs)
- quality ใช้ low เสมอ ที่วัดไว้แล้ว: medium ไม่ได้ดีกว่าหลังตัด ส่วน high ออกมาหยาบกว่า
- canvas ใหญ่ (2304x1536, 3456x2304, 3840x2160) ใช้เฉพาะอาคารหรือฉากใหญ่
- ฉากใหญ่ (พื้นหลังมินิเกม หรือสิ่งที่เต็มบอร์ดหรือจอ):
  - ใส่ N=3 หน้าคำสั่งเพื่อวาดสามรอบ แล้วเลือกหนึ่งด้วย checks/cut-look.mjs
  - เก็บอีกสองไว้ และรายงานว่าเลือกอันไหนเพราะอะไร
- icon และ sheet เล็กวาดรอบเดียว
- ก่อนวาดทุกครั้งต้องให้ prompt ถูกอ่านก่อน:
  node ~/.claude/skills/codex-pair/scripts/codex-ask.mjs art --for "<แสดงที่ไหน ขนาดเท่าไร อยู่ข้างอะไร>" <อาร์กิวเมนต์ชุดเดียวกับ gen.mjs>
  - gen.mjs ไม่ยอมวาด call ที่ไม่มีใน work/reviews.jsonl
  - ใน --for บอกเฉพาะสิ่งที่เป็นจริง
  - ถ้าตั้งใจข้ามขั้นนี้ ให้ใส่ NO_REVIEW="<เหตุผล>"
- งบ: BUDGET=35 และใช้ไปแล้ว $23.84 ถ้า gen.mjs หยุดเพราะงบ ให้เพิ่ม BUDGET ใน commit แยก
  ที่อ้างคำของเจ้าของเมื่อ 2026-10-08 ("อย่าไปคิดเรื่องต้นทุนรูป") แล้วทำต่อ จากนั้นรายงานยอดที่ใช้
- work/ ถูก git ignore อยู่ ถ้าทำใน worktree ให้ link work/ ไปที่ของ fcnext ตามที่ README บอก
  เพื่อให้มี ledger อันเดียว

2) แนบภาพอ้างอิงทุกครั้ง: นี่คือสิ่งที่คุมสไตล์มากที่สุด
- icon: แนบ work/out/scene-icons.png หรือ sheet icon ล่าสุดของสายเดียวกัน
  (เช่น icons-mining-a.png, icons-felling-c.png)
- ของที่วางบนแผนที่: แนบ sheet ฉากที่ใกล้เคียงซึ่งมีตัวละครอยู่ เพื่อให้ได้ขนาด
  และวางของสูงไว้ใน sheet ด้วย (ป้ายหรือเสาสูงสามเท่าตัวละคร) ไม่อย่างนั้น pixel จะออกมาใหญ่เป็นสองเท่า
- ของถือและเอฟเฟกต์: แนบ held-tools-a.png หรือ icons-fx-b.png
- ฉากมินิเกม: แนบฉากที่ใช้อยู่ในสายเดียวกัน (เช่น scene-cave-a.png) และใส่ BG=opaque
  (ใช้ BG=opaque กับ texture ด้วย)
- ตัวละคร: ใช้ gen-race.mjs หรือ gen-hairs.sh ซึ่งแก้ sheet เดิมโดยวางทุกอย่างไว้ที่เดิม

3) รูปแบบ prompt: ภาษาอังกฤษ บรรยายธรรมดา ทำตามแม่แบบ และห้ามแก้ประโยคปิดท้าย

[ICON SHEET]
"Use the attached picture only as the reference for the pixel art style, the colours and the
thick dark outline of a cozy 2D town game. Draw a new sprite sheet of small icons for <where>
of that game, in the same pixel art style.

Each icon is drawn on its own 16 by 16 pixel grid, scaled up big so every pixel of the icon is
a large crisp square, all icons the same size, simple and bold so they read clearly when shown
small, with a thick dark outline and two or three tones per colour. Six icons in one row across
the canvas, evenly spaced with wide empty gaps between them, not touching, not overlapping:
1) ...; 2) ...; 3) ...; 4) ...; 5) ...; 6) ....

Crisp pixel art with hard square pixel edges, no anti-aliasing, no blur, no gradients, no glow.
Transparent background, no frames or boxes around the icons, no shadows, no text, no letters,
no numbers."

[PROPS ON THE MAP]
"Use the first attached sprite sheet only as the reference for the pixel art style, the chunky
square pixel size and the scale: the little characters in it are the size of a person.
<the second reference, if any: draw in exactly its style and at its size>. Do not draw any characters.

Draw <N> items, all at the characters' own scale and pixel size (do not draw them larger to fill
the canvas): 1) <size compared with a character, e.g. as tall as a character, as wide as three
characters side by side>, ...

All <N> items in one row, evenly spaced, not overlapping, with clear empty space between them,
standing on the same ground line. Crisp pixel art with hard square pixel edges, the same thick
dark outline, flat shading with a few tones per colour, no anti-aliasing, no blur, no gradients.
Transparent background, no ground under them, no shadows, no text, no labels."

[MINI-GAME SCENE]
"Use the attached sprite sheet only as the reference for the pixel art style, its colours and its
chunky square pixel size. Draw one scene that fills the whole canvas from edge to edge, with no
border and no frame, for a mini-game of the same cozy 2D game.

<what is in the middle: keep it plain and quiet wherever the game draws its own things; what
stands at each edge; where the light comes from>

Crisp pixel art with hard square pixel edges, a thick dark outline on things, flat shading with a
few tones per colour, no anti-aliasing, no blur, no gradients, no glow. No characters, no text,
no letters, no numbers."

[EFFECT SHEET] คือแม่แบบ icon ที่ใส่ "the element of <X> about an enchanted tool" กับสีของธาตุ
ชิ้น 1–3 เล็กราว 5 pixel ส่วนชิ้น 4–6 ใหญ่ราว 16 pixel ปิดท้ายด้วย "..., no glow, no soft halo."
แสงทั้งหมด (halo, rays, aura, rim) สร้างในโค้ด (components/town/held.ts, vfx.ts) ห้ามวาดลงในภาพ

กฎของเนื้อหาใน prompt:
- หนึ่ง sheet มี 6 ชิ้นเรียงแถวเดียว (sheet ที่มี 4 ชิ้นเคยออกมา pixel ใหญ่เป็นสองเท่า)
- แต่ละชิ้นบอกรูปร่าง สีหลัก 2–3 สี และของประกอบไม่เกิน 1–2 อย่าง ต้องอ่านออกที่ 40px
- ของพิเศษหรือของระดับสูงใช้ "one small golden four-pointed sparkle star at its upper right corner"
- ของชนิดเดียวกันหลายขั้นต้องอยู่ใน sheet เดียวกัน ("the same <thing> at four ages ... so that
  they are plainly one kind")
- ชื่อ icon ต้องเป็น id ของ item ใน lib/town/items.ts
- ไม่ใช้ชื่อเกมหรือแบรนด์จริง และของมาจากวัฒนธรรมไหนก็ได้ ไม่จำเป็นต้องเป็นไทย
- ห้ามใช้คำหรือรูปแบบเหล่านี้ เพราะทำให้ภาพหลุดสไตล์:
  "Use case: ...", "Asset type: production ...", "beautifully crafted", "detailed", "polished RPG",
  "rich ... highlights", "translucent", "hot core", "soft light", "logical pixels" หรือขนาดเป็น px
  ของตัว asset, grid หลายแถวที่ช่องละ 256px, และ glow, halo หรือ aura ในภาพ

4) หลังวาด
- ตัดด้วย builder เดิมเท่านั้น: build-icons.mjs (ใส่ { range: [a, b] } ของ pixel size ให้แต่ละ sheet
  หาค่าได้ด้วย work/icon-pitch2.mjs และ work/icon-try.mjs), build-scenery.mjs, build-held.mjs,
  build-mine-scene.mjs
- ขยายดู sheet ที่ตัดแล้ว และวางเทียบกับ icon เดิม ขนาดต้องใกล้กัน
  (ถ้าได้ 14x15 ข้าง 30x30 แปลว่าผิด ต้องแก้ range)
- ตรวจในเกมจริงทั้งเดสก์ท็อปและมือถือตาม AGENTS.md ถ้าภาพดูแปะ หยาบ หรือไม่เข้ากับของรอบข้าง ต้องแก้ก่อนส่ง
- เก็บ prompt ทุกอันไว้ที่ prompts/<icons|scenery|held>/<name>.txt
  และเพิ่มบรรทัดใน README.md ว่า sheet ชื่ออะไร มีอะไรอยู่ข้างใน กี่ call และใช้เงินเท่าไร

5) ของที่ต้องทำใหม่ให้เข้าสไตล์ (ขอคำสั่งเจ้าของก่อนเอาไปแทนของที่ live)
- icon รางวัลใหม่ 42 ชิ้นที่วาดด้วยโค้ดใน add-reward-icons.mjs (charmChefFlame ... thingForesterKnife)
  ให้ทำเป็น 7 sheet sheet ละ 6 ชิ้น ตามแม่แบบ ICON SHEET และแนบ scene-icons.png
- ภาพที่สร้างด้วย built-in image_gen: กล่องเก็บของ 4 ระดับ (prompts/box-tiers.json),
  ของในคาสิโน (docs/plans/casino-art-prompts.json) และ atlas VFX ธาตุ (.codex/element-vfx-refinement)

## PixelLab (the owner, 2026-10-19)

The owner bought PixelLab Tier 1 (2,000 generations a month) after the trial of 2026-10-18/19 and asked: "เพิ่มใน
work flow ส่วนที่คุณคิดว่าต้องใช้ Pixellab". The trial's figures are in README.md, "PixelLab". PixelLab is used only for
the four jobs below; everything in sections 1–5 stays as it is.

**The tool.** `node pl.mjs <out-name> <endpoint> <body.json>` from this folder. The key is `PIXELLAB_API_KEY` in
fcnext/.env.local and is never printed. Results go to `work/pl/<name>/`, and every call to the same `work/ledger.jsonl`
with `cost: 0` (the subscription pays, so gen.mjs's dollar total is unchanged) and `gens`. Before a call or a batch,
Codex reads the body and its pictures (`codex-ask.mjs find` or `plan` with `--see`), then `REVIEW="<its run folder>"`;
`NO_REVIEW="<why>"` and `CALLS=<file>` work as with gen.mjs. Never call PixelLab through its MCP or a script of the
moment: the gate and the ledger must hold for it as for OpenAI.

**What PixelLab is for:**

1. **Doll action frames** (DOLL2.md's action families): `/animate-with-skeleton-v3`.
   - One pose set per family per view, designed once: 18-joint keypoints, starting from `/estimate-skeleton` (0.1
     generation) of the mannequin's standing frame. Keep it in `poses/<family>-<view>.json`.
   - Every outfit is animated from its own standing frame with that same pose set. The same keypoints give the same
     pose, measured on the trial at 94–96% overlap front and 90–92% back, which is as close as the two standing
     frames themselves.
   - The builder then lays the shared head, takes the hands from the keypoints, takes arm-over-head order from the
     keypoints' z, and snaps to the palette. It refuses a frame by per-frame material masks (skin, cloth), not by
     overlap alone: overlap can pass a broken hand and fail a skirt (Codex).
   - Never `/animate-with-text-*` for doll frames. It turns the body to face front, adds a tool of its own, closes
     eyes, and gives each outfit another pose (77–89%).
   - Cost: 7–8 frames = 3 generations, 15 frames = 4.
2. **Expressions and small edits of existing pixel art** (a face, a hair piece under a hat, a detail on an outfit):
   `/inpaint-image-pro-flash`, 5 generations.
   - The mask covers only what changes: pure black and white, the same size as the picture. Send the whole doll
     frame as `context_image` with its `bounding_box`.
   - Nothing outside the mask changes (measured: 0 pixels), so the part is the changed cells, including the erased
     old features.
   - Not plain `/inpaint`: its faces come out off-style.
3. **One-shot event VFX** (a hit, a catch, a rank-up, a rare find, a craft or forge result): `/vfx`.
   - `artist: "lite"` (1 generation) for small frequent effects, `"pro"` (about 8) for big rare moments.
   - Send the tool or the doll as `sprite` at its own pixel size. `game_pack: true` gives the layers behind and in
     front of the sprite.
   - Code places, tints and times them; frequent ones last 250–450 ms.
   - Continuous effects, element mixes and anything driven by a number stay procedural code.
4. **A new view of an existing sprite**: `/generate-8-rotations-v3`, 1 generation. Only when the owner asks for a new
   facing. The town stays at 4 diagonal facings from 2 drawn views (every hair, face, hat and outfit would be ×2.5).

**What stays with gen.mjs:** icon sheets, props, scenery, large scenes, textures, the UI kit, and the base sheets of a
new outfit, hat or hair (in-place edits of the mannequin, as DOLL2.md says).

**After a PixelLab job,** as after a gen.mjs one:
- the existing builders, and the pixel scale checked against native art;
- one contact sheet, then the game at desktop and phone size;
- the body JSON and pose sets kept in `prompts/pixellab/`;
- a line in README.md: what was made, how many calls, how many generations.

## No pixel bugs (the owner, 2026-10-26)

"ช่วยจำไว้ใน workflow ว่า เครื่องแต่งกาย หรือ ภาพใหม่ๆ ที่ เพิ่มเข้าเกมห้ามมี pixel bug แบบนี้เด็ดขาด". Said after he tried Granny
Twilla's new things on in the dev town and found, one after another: bare scalp under the brims, a strip of forehead
under new hats lying over the bangs, a ring of the head's outline through a hat, brims eaten away, hollow bear ears, the
eyes' outline under star sunglasses, a speckled net veil, flames drawn as black sticks, bangs cut straight, hair hanging
as a flat block. None of these may reach the game or the owner again. Before showing any new wearable, hairstyle or
picture:

1. **The checks** (from this folder, `DIR=<the build>`), each must be clean for what is new:
   - `node checks/hat-bald.mjs`: 0 cells of scalp bared under any hat, over every hairstyle, front and back.
   - `node checks/hair-crown.mjs`: no bare crown on a new hairstyle.
   - `node build-pixel-atlas.mjs ...`: "hole check: every step whole".
2. **Each new piece alone, enlarged** (at least 6x, over a loud colour such as magenta, as `work/shop-mock/hat-piece.png`
   was made): no holes inside it, no skin-coloured strip or speck it should not carry, nothing eaten from its edge.
3. **The drawing against the build** (`work/pl/<name>/image.png` or `work/out/<sheet>.png` beside the built piece, both
   enlarged): what the build lost is the pipeline's to fix; what the drawing lacks is drawn again.
4. **On the doll** (`checks/wear-look.mjs` with `LOOKS=`, or `checks/shop-gallery.mjs`): over several hairstyles (a
   long one, one with bangs, pigtails, a short one), front, back, sitting and eating, enlarged at least 3x; glasses
   checked for the eyes under them, hats for the hair and forehead under the brim, hair things for the head's rim.
5. **In the game** at desktop and phone size, as AGENTS.md says.

The lay-back's rules that came of these (`pl-doll.mjs unhead`; the builder's `clip` and `coverRim`) are explained where
they are written; a new bug of this kind gets its own check here.
