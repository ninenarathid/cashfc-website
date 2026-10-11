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
