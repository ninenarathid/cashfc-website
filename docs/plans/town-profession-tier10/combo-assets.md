# Equipment bond VFX assets

Runtime ล่าสุดใช้ native canvas particles/material จาก [drawComboMaterial.ts](../../../components/town/drawComboMaterial.ts) และ [TownComboMaterialFx.tsx](../../../components/town/TownComboMaterialFx.tsx) ที่ 64×56 สำหรับ cue พร้อม world effects จาก action จริง ไม่มีการขยาย หมุน หรือ fade ภาพ concept ทั้งแผ่นเป็นเอฟเฟกต์บนแผนที่ ดู [handoff ฉบับจบ](sessions/final-2026-10-11.md) ภาพ AI ด้านล่างเก็บเป็น concept reference เดิม

Common prompt brief: Stylized concept: transparent pixel-art VFX sprite for a cozy isometric village game. Crisp 32-bit pixel art with limited colors and stepped edges, readable at 80 px. Centered with padding. No frame, badge, text, scenery or checkerboard.

## water

- Asset: [water-v1.png](../../../public/town/combos/water-v1.png)
- Source: `C:/Users/narat/.codex/generated_images/01a1247f-711d-7820-a3af-c068dd505ce1/exec-c7229846-3c69-4d28-b8a5-aad2b511a0ad.png`
- Prompt brief: Linked turquoise water rings, a tiny luminous fish, droplets and four gold stars.
- Verified: 1254 × 1254, alpha channel includes transparent pixels.

## wood

- Asset: [wood-v1.png](../../../public/town/combos/wood-v1.png)
- Source: `C:/Users/narat/.codex/generated_images/01a1247f-711d-7820-a3af-c068dd505ce1/exec-da5b3c2e-fe28-4849-ad82-d4116dd57e43.png`
- Prompt brief: Linked gold and moss-green arcs, three wood-grain strokes, amber leaf sparks suggesting woodpecker rhythm; no bird.
- Verified: 1254 × 1254, alpha channel includes transparent pixels.

## echo

- Asset: [echo-v1.png](../../../public/town/combos/echo-v1.png)
- Source: `C:/Users/narat/.codex/generated_images/01a1247f-711d-7820-a3af-c068dd505ce1/exec-4d44f79a-abfe-4f6f-9de1-74cb358bbafc.png`
- Prompt brief: Linked violet sonar arcs, an amber faceted crystal spark, three sound marks and a few gold glints; no bat.
- Verified: 1254 × 1254, alpha channel includes transparent pixels.

Current motion: water droplets/ripples, wood fibres/leaves and echo facets/rings originate from the actual action. Equip cue is generic and reveals no recipe. The town motion switch and prefers-reduced-motion keep a readable static material cue. Original PNG references are not runtime map VFX.
