import kit from "@/lib/town/ui-kit.json";

/**
 * The town's own skin: wood, parchment and iron studs in the town's pixels, for what lies over the map.
 *
 * Until 2026-10-09 every piece of the HUD was the web site's: translucent navy circles and pills with a blur behind
 * them, over warm chunky pixel art, which read as a web page laid on a game (the owner: "ควร gen ภาพมาใช้ยังไงให้ดูเป็น
 * เกมส์ ที่ professional มากขึ้น"; of the wood and parchment shown him, "แบบนี้ดีแล้ว"). The pieces are drawn by the image
 * model and cut by `scripts/pixel/build-ui.mjs` into nine-slices of a few hundred bytes each (lib/town/ui-kit.json);
 * this is the CSS of them, which the map puts on the page beside `FOOT_CSS`. Nothing is fetched for it.
 *
 * How a piece wears it: `tk` and one frame (`tk-plate` dark wood, `tk-window` wood about parchment, `tk-slot` a dark
 * well, `tk-btn` the green button, `tk-btn-wood` the wooden one). The frame is the element's `::before`, so the
 * element's own box, padding and content are as they were; it must be positioned (it is made `relative` where
 * nothing else says). The whole of it is in the stylesheet's `components` layer, under the utilities: a class on
 * the element (`absolute`, a padding, a size) still has the last word, as it has everywhere else. A frame is opaque: no blur behind it, which the canvas under it would pay for at every frame.
 *
 * A frame re-names the site's colours for what is inside it (`--color-ink`, `--color-muted`, `--color-accent` …), so
 * that whatever was written for the navy panels (`text-ink`, `border-line`, `bg-accent text-bg`) reads rightly on
 * wood and on parchment with no line of its own changed.
 *
 * A picture pixel is `kit.scale` CSS pixels, a whole number on every screen, and drawn hard.
 */
const K = kit.scale;
type Piece = keyof typeof kit.pieces;
const img = (piece: Piece) => `url("${kit.pieces[piece].uri}")`;
const frame = (sel: string, piece: Piece) => {
  const p = kit.pieces[piece];
  return `${sel}::before { border-width: ${p.c * K}px; border-image: ${img(piece)} ${p.c} fill / ${p.c * K}px / 0 stretch; }`;
};
/** How far in from a frame's edge its rim ends: what a piece's padding has to clear, in CSS pixels. */
export const RIM = { plate: 5 * K, window: 5 * K, slot: 4 * K, btn: 3 * K } as const;

export const SKIN_CSS = `
@layer components {
  .tk { position: relative; }
  .tk { isolation: isolate; border: 0; border-radius: 0; background: none; box-shadow: none; -webkit-backdrop-filter: none; backdrop-filter: none; }
  .tk::before { content: ""; position: absolute; inset: 0; z-index: -1; border-style: solid; border-color: transparent; image-rendering: pixelated; pointer-events: none; }
  .tk:focus-visible { outline: 2px solid #ffd166; outline-offset: 2px; }
  ${frame(".tk-plate", "plate")}
  ${frame(".tk-window", "window")}
  ${frame(".tk-slot", "slot")}
  ${frame(".tk-slot-on", "slotOn")}
  ${frame(".tk-btn", "btn")}
  ${frame(".tk-btn-wood", "btnWood")}
  .tk-slot:is([aria-pressed="true"], [aria-expanded="true"], [aria-checked="true"], [data-on]):not([data-plain])::before { border-image-source: ${img("slotOn")}; }
  .tk-btn:active::before { border-image-source: ${img("btnDown")}; }
  .tk-btn-wood:active::before { border-image-source: ${img("btnWoodDown")}; }
  .tk-btn:active, .tk-btn-wood:active { translate: 0 1px; }
  :is(.tk-slot, .tk-btn, .tk-btn-wood):disabled { opacity: 0.55; }
  @media (hover: hover) { :is(.tk-slot, .tk-btn, .tk-btn-wood, .tk-window):is(button, a):hover:not(:disabled)::before { filter: brightness(1.1); } }

  /* What is written on dark wood, and in a dark well */
  .tk-plate, .tk-slot, .tk-slot-on {
    --color-ink: #f7e7c9; --color-muted: #d5bb92; --color-accent: #ffd27a; --color-gold: #ffd166; --color-jade: #9ed44a; --color-chili: #ff8a6b;
    --color-line: #7a4d26; --color-line-lit: #b9834a; --color-line-strong: #a06a38; --color-card: #4a2a12; --color-surface: #623718; --color-bg: #3b2412;
    color: #f7e7c9;
  }
  /* What is written on parchment */
  .tk-window {
    --color-ink: #3b2412; --color-muted: #76583a; --color-accent: #8f2f1f; --color-gold: #8a5200; --color-jade: #2f6f3a; --color-chili: #b3311f;
    --color-line: #d7b78a; --color-line-lit: #b9925e; --color-line-strong: #9c7648; --color-card: #ecd0a6; --color-surface: #f5dab7; --color-bg: #f5dab7;
    color: #3b2412;
  }
  .tk-btn, .tk-btn-wood { color: #fff7df; text-shadow: 0 2px 0 rgb(0 0 0 / 0.4); --color-ink: #fff7df; --color-muted: #f0e2bd; --color-gold: #ffe08a; }

  /* A bar of the HUD's: a dark trough with a hard edge, and what fills it */
  .tk-bar { height: 8px; background: #22130a; box-shadow: 0 0 0 2px #1a0e06; }
  .tk-bar > i { display: block; height: 100%; background: linear-gradient(#b4e25a 0 50%, #7fb432 50%); }
  .tk-bar[data-low] > i { background: linear-gradient(#ff9a7a 0 50%, #d9573a 50%); }
  .tk-bar[data-gold] > i { background: linear-gradient(#ffe08a 0 50%, #f0b63a 50%); }
  /* A key's cap, on a wide screen */
  .tk-key { display: inline-grid; place-items: center; min-width: 18px; height: 18px; padding: 0 4px; background: #f5dab7; color: #3b2412; font: 600 11px/1 var(--font-data, ui-monospace); box-shadow: 0 0 0 2px #3b2412, inset 0 -3px 0 #cfa97a; text-shadow: none; }
  /* A name on a ribbon of cloth, on a frame's top edge */
  .tk-ribbon { background: #a23b2a; color: #fff3dc; box-shadow: 0 0 0 2px #3b2412, inset 0 -3px 0 #7c2a1d; }
  /* A mark that something waits */
  .tk-dot { position: absolute; right: -3px; top: -3px; width: 10px; height: 10px; background: #f0b63a; box-shadow: 0 0 0 2px #1a0e06; }
  /* A box that is typed in says so by its frame, a little lighter (see below, of the line round the words) */
  .tk-plate:focus-within::before { filter: brightness(1.2); }
}
/* Outside the layer, because the site's own ring round whatever has the keyboard is (app/globals.css, :focus-visible):
   a box of the skin's that is typed in had that ring round its words the whole time it was typed in, in the frame's
   own yellow (the owner, 2026-10-09, of the chat's box: "มันมีเส้นเหลืองแบบนี้ ช่วยเอาออกด้วยครับ"). A button keeps its ring. */
.tk :is(input, textarea):focus-visible { outline: none; }
`;
