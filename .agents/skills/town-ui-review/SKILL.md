---
name: town-ui-review
description: Review and improve Cash Town game UI and character presentation using actual desktop and mobile gameplay. Use for town announcements, portraits, HUD controls, game panels, and Thai requests to improve their appearance. Scoped to Cash Town rather than unrelated website pages.
---

# Cash Town UI review

Read the workspace's AGENTS.md and the affected renderer before proposing changes. Preserve the owner's current choices, the game's native art, and the surrounding gameplay. For implementation requests, fix the requested UI; for review-only requests, present findings with concrete visual evidence.

## Judge the player-facing result

- Identify the intended focal point and what the player needs to recognize at normal screen size. For an announcement, recognize the person, then the achievement.
- Use the game's wood, brass, and muted landscape colors, existing Thai typography, and native icons. Choose spacing and contrast around the real content, including long Thai names and messages. Do not turn the HUD into a generic web dashboard.
- Inspect the pixels, not just the bounding boxes. Correct containment can still leave a character tiny, floating, abruptly cut into a fragment, or crowded against a tool.
- Reuse native avatar and equipment renderers. Preserve color choices, hair, ears, clothing, grip, silhouette, and equipment proportions. Do not stretch the sprite to fill a rectangle.
- In an upper-body portrait, draw the continuous avatar through a fixed portrait window, with deliberate headroom and the torso continuing below the lower frame. Do not cut out a torso fragment and centre it as a standalone icon.
- Frame the person independently of equipment so changing from an axe to a rod does not shrink their face. Review hand placement and visible tool identity; accommodate the grip and head of the tool without deforming it.
- Keep camera scale and composition stable through blinking and expressions. The frame must contain the portrait and any animation. Respect reduced motion.

## Relevant implementation landmarks

- `lib/town/pixeldoll.ts` and `lib/town/look.ts`: actual avatars and appearance choices.
- `components/town/held.ts` and `element-skins.ts`: equipment proportions, grips, and elemental materials.
- `components/town/TownFoot.tsx`: existing HUD placement and portals.
- `TownAnnouncements.tsx` and `announcement-avatar.ts`: announcement layout and portrait framing.

Resolve these paths from the current repository; they are context, not permission to alter unrelated features.

## Validate visually before finishing

Use the available browser automation to inspect real gameplay at a normal desktop viewport and a narrow phone viewport. Capture and open screenshots yourself, revise visible defects, then inspect again. A passing build, pixel-containment check, or isolated enlarged sprite is insufficient evidence of design quality.

For character changes, sample relevant body types, wide hair or ears, and the equipment affected by the change. Inspect a blink or expression as well as the still pose. For panels and announcements, check a long Thai name/message and that the UI does not hide necessary game controls. Keep verification proportional to the edit.

Use local preview hooks when available instead of generating live announcements or changing player inventories for QA. This skill does not authorize deployment, database writes, or messages to other players.

Report the concrete change, link the reviewed screenshots, and distinguish local verification from production deployment. If a browser cannot be used, state that visual quality remains unverified rather than calling the result polished.
