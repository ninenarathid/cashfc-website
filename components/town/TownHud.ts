/** Cosmetic only: the current purse chooses the material, with identical controls at every tier. */
export const HUD_TIERS = [
  { id: "wood", coins: 0 },
  { id: "copper", coins: 1_000 },
  { id: "gold", coins: 10_000 },
  { id: "platinum", coins: 100_000 },
] as const;

export function hudTierFor(coins: number) {
  return HUD_TIERS.findLast((tier) => Number.isFinite(coins) && coins >= tier.coins) ?? HUD_TIERS[0];
}

export const HUD_CSS = `
@layer components {
  .town-hud-top, .town-foot {
    --text-label: 0.8125rem; --text-meta: 0.875rem; --text-ui: 0.9375rem;
    --text-read: 1rem; --text-title: 1.125rem;
  }
  [data-town-hud-tier] {
    --hud-edge: #ab8a59; --hud-top: #393025; --hud-bottom: #29231c;
    --hud-ink: #fff1d6; --hud-muted: #d0bfa3; --hud-accent: #f0ca86;
    --hud-line: #65513a; --hud-selected: #51422c; --hud-ornament: transparent;
    --hud-highlight: #e8cc9233; --hud-glow: 0 0 0 transparent;
  }
  [data-town-hud-tier="copper"] {
    --hud-edge: #d39b75; --hud-top: #483329; --hud-bottom: #2e221d;
    --hud-muted: #e0c3ae; --hud-accent: #ffc397; --hud-line: #795442;
    --hud-selected: #674632; --hud-highlight: #ffc89b55; --hud-ornament: #e0ac7a99;
  }
  [data-town-hud-tier="gold"] {
    --hud-edge: #e3c17a; --hud-top: #433922; --hud-bottom: #292418;
    --hud-muted: #e1cfaa; --hud-accent: #ffe2a1; --hud-line: #7b663c;
    --hud-selected: #65522d; --hud-highlight: #ffe3a96b; --hud-ornament: #ffe2a1;
    --hud-glow: 0 0 12px #e3bc5920;
  }
  [data-town-hud-tier="platinum"] {
    --hud-edge: #c2dce3; --hud-top: #344249; --hud-bottom: #202a30;
    --hud-ink: #f1f8fa; --hud-muted: #c3d5da; --hud-accent: #d4efff;
    --hud-line: #637e88; --hud-selected: #405966; --hud-highlight: #d5f3ff70;
    --hud-ornament: #d6f2ff; --hud-glow: 0 0 14px #b2dced26;
  }
  .town-hud-surface, .town-hud-button {
    --color-ink: var(--hud-ink); --color-muted: var(--hud-muted); --color-accent: var(--hud-accent);
    --color-gold: #f0ca86; --color-jade: #b5d486; --color-chili: #ffad94;
    --color-bg: var(--hud-bottom); --color-surface: var(--hud-top); --color-card: var(--hud-selected);
    --color-line: var(--hud-line); --color-line-strong: var(--hud-edge);
    color: var(--color-ink); border-radius: 10px;
  }
  .town-hud-surface::before, .town-hud-button::before {
    border-image: none; border: 1px solid var(--hud-edge); border-radius: inherit;
    background: linear-gradient(180deg, var(--hud-top), var(--hud-bottom));
    box-shadow: inset 0 1px 0 var(--hud-highlight), inset 0 -2px 0 #17130f55, 0 3px 10px #17130f40, var(--hud-glow);
  }
  .town-hud-surface::after {
    content: ""; position: absolute; inset: 4px; z-index: -1; border-radius: 6px; pointer-events: none;
    background: linear-gradient(135deg, var(--hud-ornament) 0 2px, transparent 2px) top left,
      linear-gradient(225deg, var(--hud-ornament) 0 2px, transparent 2px) top right,
      linear-gradient(45deg, var(--hud-ornament) 0 2px, transparent 2px) bottom left,
      linear-gradient(315deg, var(--hud-ornament) 0 2px, transparent 2px) bottom right;
    background-size: 6px 6px; background-repeat: no-repeat;
  }
  .town-hud-surface.tk-btn-wood:active::before { border-image: none; }
  .town-hud-button { width: 44px; height: 44px; touch-action: manipulation; }
  .town-hud-button:is([aria-expanded="true"], [aria-pressed="true"], [data-on]):not([data-plain])::before,
  .town-hud-button.tk-slot-on::before {
    border-image: none; border-color: var(--hud-accent); background: var(--hud-selected);
  }
  .town-hud-overview { padding: 3px; }
  .town-hud-status { width: 240px; }
  .town-hud-status .tk-bar { height: 6px; border-radius: 2px; box-shadow: 0 0 0 1px #14120e; overflow: hidden; }
  .town-hud-status .tk-bar > i { background: linear-gradient(#c5dfa0, #96b966); }
  .town-hud-status .tk-bar[data-low] > i { background: #ffad94; }
  .town-hud-status .tk-bar[data-gold] > i { background: #f0ca86; }
  .town-hud-place { border-left: 1px solid var(--hud-line); }
  .town-hud-cluster { padding: 4px; }
  .town-hud-cluster .town-hud-button::before { border-color: transparent; background: none; box-shadow: none; }
  .town-hud-cluster .town-hud-button:is([aria-expanded="true"], [aria-pressed="true"], [data-on]):not([data-plain])::before,
  .town-hud-cluster .town-hud-button.tk-slot-on::before { border-color: var(--hud-edge); background: var(--hud-selected); }
  .town-hud-cluster .town-hud-bag::before { border-color: var(--hud-edge); background: var(--hud-selected); }
  .town-hud-label { font-family: var(--font-data-face, sans-serif); font-size: var(--text-label); font-weight: 600; line-height: 1.5; color: var(--color-ink); }
  .town-hud-key { border-radius: 4px; min-width: 18px; height: 18px; padding: 0 4px; font-size: 0.75rem; background: var(--hud-muted); color: var(--hud-bottom); box-shadow: 0 1px 2px #15110d80; }
  .town-hud-stack-count { font-size: var(--text-label); line-height: 1.5; }
  .town-hud-menu { padding: 18px; }
  .town-hud-menu-heading { padding-bottom: 12px; border-bottom: 1px solid var(--color-line); }
  .town-hud-menu .town-hud-button { width: 48px; height: 48px; }
  .town-hud-input::before { border-color: #8e7858; background: #211d17; box-shadow: inset 0 1px 3px #0003; }
  .town-hud-send::before { border-image: none; border: 1px solid #a5bc79; border-radius: 7px; background: linear-gradient(#567042, #405333); box-shadow: inset 0 1px 0 #c6e5a333; }
  .town-hud-send { border-radius: 7px; text-shadow: none; }
  @media (hover: hover) {
    .town-hud-cluster .town-hud-button:hover:not(:disabled)::before { background: var(--hud-selected); }
  }
}
.town-hud-top {
  top: max(12px, env(safe-area-inset-top));
  left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right));
}
.town-foot {
  left: max(12px, env(safe-area-inset-left)); right: max(12px, env(safe-area-inset-right));
}
.town-hud-labelled { height: 56px; gap: 2px; align-content: center; }
.town-hud-chat-row { padding: 4px; }
[data-town-hand="bar"].town-hud-surface { padding: 5px; gap: 4px; }
[data-town-hand="bar"] .town-hud-button { width: 44px; height: 44px; }
@media (max-width: 639px) {
  .town-hud-overview { flex: 1; max-width: 290px; }
  .town-hud-status { width: auto; min-width: 0; }
  .town-hud-place { border-left: 0; border-top: 1px solid var(--hud-line); justify-content: space-between; }
  .town-hud-status:has([data-town-meal]) { flex-wrap: wrap; height: auto; min-height: 32px; padding-top: 6px; padding-bottom: 6px; }
  .town-hud-chat-row { width: 100%; }
}
@media (min-width: 640px) {
  .town-hud-status, .town-hud-place { height: 40px; }
}
@media (max-width: 359px) {
  .town-foot { left: max(8px, env(safe-area-inset-left)); right: max(8px, env(safe-area-inset-right)); }
  .town-hud-cluster { padding: 3px; gap: 2px; }
}
`;
