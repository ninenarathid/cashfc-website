# Motion on the FC site

## What motion is for

Motion explains one of three things: where something came from, where it
went, or what just changed. If it explains none of them, leave it out.
Delight is allowed when the moment is the point, as when a popoto hits a
face or a rare potato opens. Motion then carries the moment rather than
decorating it.

## The vocabulary already here

The site's timings are argued per place, not taken from a scale. These are
the ones a new thing should sit next to:

| Moment | Timing | Where |
|---|---|---|
| press | instant `scale: .97` | globals.css `@layer base` |
| popover, hover card | 110 in / 90 out, `pop-in` | Radix `data-state` |
| tab panel | `tab-in` | ui/Tabs |
| modal, lightbox | 240ms, `rise-in` | ui/Modal, ImageLightbox |
| toast | `toast-slide` | ui/Toast |
| page change | 170 out / 260 in, slide by direction | view transition, types from `<Link transitionTypes>` |
| face → member page | 620ms, `ease-drawer` | `lib/morph.ts` → `member-face` |
| popoto throw | 700–1000 flight, 420 squash, 380 hold, 220 leave, on one clock | `components/ui/throwPotato.ts` (WAAPI, own layer, z-200) |
| rare popoto reveal | tiered, `TIER_FX` | `lib/popoto-rare.ts:273-279`, `rare-*` classes |
| prize fanfare | the same effects inside a card | `PrizeFanfare` `Fanfare({tier,hue})` |
| event slider | turns every 10s, holds on hover and focus, stops under reduced motion | `components/home/EventSlider.tsx:110-150`, the model to copy for anything that moves on its own |

**Curves:** `--ease-settle` for arriving, `--ease-exit` for leaving,
`--ease-drawer` for sheets and morphs. In CSS write `var(--ease-settle)`; in
Tailwind, `ease-[var(--ease-settle)]`. Never retype a `cubic-bezier` literal:
that is how the site ended up with thirty almost-matching curves.

Exits run faster than entries (about 60–75% of the entry). Only animate
`transform` / `translate` / `scale` / `rotate`, `opacity`, a small `filter`,
and `clip-path`.

## Choosing the tool

1. **CSS keyed on state.** Radix `data-state`, `aria-expanded`, `:has()`,
   `@starting-style` for entering from `display:none`, and
   `transition-behavior: allow-discrete` for leaving. This covers most UI.
2. **View Transitions** for navigation and for big state swaps inside a page.
   For in-page swaps, use `startTransition(() => { addTransitionType("x");
   setState(...) })` and the React 19.3 `<ViewTransition>`. Read
   `node_modules/next/dist/docs/01-app/02-guides/view-transitions.md` first:
   - direction wrappers go in `page.tsx`, never in a layout;
   - back and forward carry no type;
   - a morph only plays if the destination renders in the same commit, which
     means it was prefetched;
   - `default="none"` needs an explicit `share="morph"`.
3. **The Web Animations API** (`el.animate`) for one-off choreography on its
   own layer outside React, the way the throw is built.
4. **`motion/react` only for layout animation** (a shared `layoutId`, list
   reordering). It already costs about 42 KB gz on every page because Nav
   uses it, so don't spread it. When touching Nav's caret, consider replacing
   the `layoutId` with a CSS `view-transition-name` on the caret, which the
   page transition would morph for free, and dropping motion from the global
   bundle.

## Reduced motion keeps the meaning

- **Movement becomes a crossfade or an instant change,** and the event still
  reads. Under reduced motion the throw skips the flight and fades the hug in
  on the target (throwPotato.ts:143-157). Copy that idea.
- **Stop infinite loops:** `motion-reduce:animate-none` on `animate-pulse` and
  `animate-spin`.
- **Shorten timer choreography,** not just the CSS. A `setTimeout` chain that
  waits for a "charge" nobody sees is dead time. Check
  `matchMedia("(prefers-reduced-motion: reduce)").matches` and skip the
  phases.
- **Anything that moves on its own for more than five seconds** needs pause
  on hover and focus, and a stop under reduced motion (WCAG 2.2.2).
  EventSlider is the pattern.

## Recipes

**Entering without a library.**
```css
.item { transition: opacity .2s var(--ease-settle), translate .2s var(--ease-settle); }
@starting-style { .item { opacity: 0; translate: 0 6px; } }
```

**Leaving from `display: none` (popover-like).**
```css
.panel { transition: opacity .09s var(--ease-exit), display .09s allow-discrete; }
.panel[hidden] { opacity: 0; display: none; }
```

**Shared element, list → detail.** Set `viewTransitionName` on the source
element just before navigating (`lib/morph.ts` `markFaceMorph` is the
pattern), give the destination the same name, and clear it afterwards. Each
name may be on only one element at a time.

**Scroll reveal for a feed or contest wall** (CSS only; up to about 30
sections, never 500 rows):
```css
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .reveal { animation: reveal linear both; animation-timeline: view(); animation-range: entry 0% entry 40%; }
  }
}
@keyframes reveal { from { opacity: 0; translate: 0 12px; } }
```

**Stagger without JavaScript** (Chromium; elsewhere simply no stagger):
```css
@supports (transition-delay: calc(sibling-index() * 1ms)) {
  .chip { transition-delay: calc((sibling-index() - 1) * 30ms); }
}
```

**A count that climbs** (a popoto total). Register
`@property --n { syntax: '<integer>'; inherits: false; initial-value: 0; }`,
transition `--n`, and render it with `counter-reset: n var(--n); content:
counter(n)`. Hide the animated number from screen readers and put the real
value in `aria-label`. Under reduced motion, jump straight to the value.

**Optimistic toggle with an honest failure.** Use `useOptimistic` inside
`startTransition` so the popoto or reaction shows at once. On error, revert,
give a 150ms ±3px shake (under reduced motion, a colour flash instead), and
show a toast that says what happened in the site's voice.

**A celebration.** Reuse the `rare-*` / `aqua-*` classes or `Fanfare`. A new
one must:
- be triggered by something genuinely rare;
- be tappable to skip;
- have a reduced-motion version;
- never block the rest of the page;
- load its assets lazily.

If everything celebrates, nothing does.

## Anti-patterns

- Hover effects on every row of a 500-row list.
- Parallax.
- Bounce easing on chrome.
- Animating `box-shadow` (fade a pseudo-element's opacity instead).
- Animated blur.
- A spinner where a skeleton fits.
- Staggering a long list.
- Motion that delays the answer to a tap.
