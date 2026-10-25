<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Game art quality — persistent user preference

The owner explicitly requires premium visual quality throughout the game (2026-10-11).
No equipment, VFX, scenery, character detail, or other game visual may look like a pasted or cut-out image. This is a hard requirement, including for AI-generated assets.

- Integrate every visual with the game's pixel-art scale, palette, perspective, lighting, depth, and animation.
- VFX must behave as energy, motion, and material emerging from an actual action. Scaling, rotating, or fading a complete illustrative icon alone is insufficient.
- Preserve equipment identity, natural proportions, complete pixels, and a believable hand grip. Never stretch, clip, or excessively bend a sprite.
- Mixed elements must remain individually readable; matching sockets need a deliberate stronger design.
- Review the result in actual gameplay at normal desktop and mobile sizes. A good-looking standalone asset does not establish quality in the game.
- Revise any result that feels pasted on, coarse, incomplete, or visually out of place. Aim for the best polished result, not merely a technically working effect.
- **No pixel bugs, ever** (the owner, 2026-10-26: "เครื่องแต่งกาย หรือ ภาพใหม่ๆ ที่ เพิ่มเข้าเกมห้ามมี pixel bug แบบนี้เด็ดขาด"). No costume or new picture reaches the game, or the owner, with: bare scalp or a forehead strip under a hat, a hole or skin speck inside a worn thing, a thin ring or line of the head's outline showing through, an eye's outline showing under opaque glasses, a brim or ear eaten away, bangs cut in one straight edge, hair cut in a flat block, or stray specks. Run `.claude/skills/fc-cash-town/scripts/pixel/ART_WORKFLOW.md`'s "No pixel bugs" checks for every new wearable and hairstyle and look at each new piece enlarged, alone and on the doll, before showing it. Fix the pipeline when the drawing is right; draw again when it is not.

## Cash Town image generation — persistent owner workflow (2026-10-15)

Before preparing prompts, generating, or regenerating any Cash Town art, read the entire [image generation workflow](.claude/skills/fc-cash-town/scripts/pixel/ART_WORKFLOW.md) and the entire [pixel pipeline README](.claude/skills/fc-cash-town/scripts/pixel/README.md). Preserve the owner's prompt templates and their closing sentences. These instructions apply to Cash Town art rather than unrelated image work.

- Use the existing `gen.mjs` pipeline (or its character wrappers), `gpt-image-2.5-sunburst`, quality `low`, and the required existing art references. Do not substitute built-in `image_gen`, another generator (PixelLab only as the next point says), or code-drawn player-facing icons/sprites.
- PixelLab (the owner, 2026-10-19: Tier 1 bought, "เพิ่มใน work flow ส่วนที่คุณคิดว่าต้องใช้ Pixellab") is the generator for four jobs only, through `pixel/pl.mjs` and the workflow's "PixelLab" section: doll action frames from shared skeleton pose sets, expressions and small edits of existing pixel art by masked inpaint, one-shot event VFX sheets, and a new view of a sprite when the owner asks for one. Everything else stays with `gen.mjs`. Codex reads a PixelLab call before it runs, and it goes in the same `work/` ledger.
- Review each prompt through the existing `codex-ask.mjs art` gate before generation; keep reviews and spending in the shared `work/` ledger. Follow the workflow's explicit, recorded exception procedure if intentionally skipping review.
- Draw icons and small sheets once; draw large scenes three times with `N=3`, retain all candidates, compare the builder cuts, and report the choice and reason.
- Use the existing builders, verify pixel scale against native art, and inspect actual desktop and mobile gameplay before delivering art. Save prompts and document calls and costs in the pixel README.
- Treat the workflow's old image counts and spending as historical; read current totals from the ledger. Its listed art replacements require the owner's instruction before replacing live assets.

## Cash Town UI review — persistent owner workflow (2026-10-15)

The owner requires every UI change to be proved usable on screen before it goes live: "Codex ต้องตรวจ UI ทุกครั้ง ใน desktop และ มือถือ เพื่อ make sure ว่า ui สามารถใช้ได้จริง และ ไม่รกจนเกินไป และ ไม่บังปุ่มอื่นจนกดไม่ได้" and "ส่งภาพ UI ให้ผมเช็คก่อนทุกครั้ง".

- Any change that alters what is on screen (a panel, button, HUD piece, layout, a label that changes size) is shot in the real game at desktop (1280×860) and phone (384×730, and 360×640 when the HUD or a board is touched), in every state the change adds.
- Codex reviews those screenshots each time (`codex-ask.mjs find … --see`): every control visible and pressable, nothing covering another, phone tap targets about 44 px, not cluttered, consistent with the existing UI (Midnight theme, the same chips, badges and buttons). When the HUD is touched, `.claude/skills/fc-cash-town/scripts/town-hud.mjs` runs as well.
- The owner sees the screenshots and gives his OK before a push. A new design gets mock pictures at both sizes before it is built.

## Cash Town time of day — design foundation (2026-10-15)

The owner plans different mechanics for each time of day in every line: "มีอะไรให้ค้นหามากมาย ซับซ้อน แต่ gameplay เข้าใจง่ายมองแล้วผู้เล่นใช้เวลาไม่นานในการทำความเข้าใจ". Use these eight Bangkok bands: 03–05 before dawn, 05–07 early morning, 07–11 late morning, 11–13 midday, 13–16 afternoon, 16–19 evening, 19–23 night, 23–03 late night. Measured on 2026-10-15, the busiest band is 19–23 at about 24.5 members a day, and the scarcest is 03–07 at about 5.6 members a day.

- Limit only what can be gathered: things that keep and can be traded. Never limit actions on a player's own things, and never put the hour into Quality maths.
- Make exclusives new things. Existing species and chains keep their windows and their catch rates.
- Put the rarest things in 03–07, mostly through fishing and forage. A rare time-limited thing gives convenience, not strength, and is never the only way to a grade.
- Add new species in bulk, several per band and place, with some spanning adjacent bands. Find them by place, band and bait or habit. Let each family decide a species' use under one rule, and give every species a real use.
- Keep the rules simple and the catalogue rich. Show what is out now. Players may trade across times through the notice board, which is to become a board of its own in the town centre.
