# The modern toolbox: what this stack and 2026 browsers offer

The rule: anything that is Baseline "widely available" can be used freely.
Anything newer, or in only one or two engines, goes in as progressive
enhancement, behind `@supports` or feature detection, with a fallback that is
complete and pleasant on its own. The statuses below are as of mid-2026.
Before relying on a "partial" one, check https://webstatus.dev or caniuse.

## Quick wins not taken yet (checked 2026-10-01)

- **`color-scheme: dark`** on `:root` and **`accent-color: var(--color-accent)`**,
  so native scrollbars, form controls, date inputs and autofill match the dark
  theme.
- **`export const viewport = { themeColor: "#0f1319", colorScheme: "dark",
  viewportFit: "cover" }`** in `app/layout.tsx`. `viewportFit: "cover"` is what
  makes the existing `env(safe-area-inset-bottom)` padding on the tab bar work
  on iPhones.
- **`dvh` instead of `vh`** in sheets, so a phone's moving toolbar never cuts
  them off.
- **`app/not-found.tsx`, `app/error.tsx`** (with `retry()`, new in 16.3) and
  **`app/global-error.tsx`**. None exist, so a bad link shows Next's plain 404.
  A popoto-themed 404 is cheap delight.
- **`navigator.share()` with a clipboard fallback** in place of the
  `window.prompt` fallbacks (TellButton, PfHelper, ShareParty). On a phone it
  opens Discord, LINE or Messenger directly.

## CSS

| Feature | Use here | Status |
|---|---|---|
| Container queries (`@container`; Tailwind v4 `@container` + `@sm:`) | Cards that adapt to their slot: a LookCard in the wall versus the side panel, member rows inside TalkWindow | Baseline 2023 |
| `:has()` | Style a parent by the state inside it; Tailwind `has-data-pending:` for optimistic feedback | Baseline 2023 |
| `@starting-style`, `transition-behavior: allow-discrete` | Entry and exit animation with no JS | Baseline 2024 |
| View Transitions, `:active-view-transition-type()` | Page slide and morphs (in use) | All engines for same-document by late 2025; types newer, so keep `@supports` |
| Scroll-driven animations (`animation-timeline: scroll()/view()`) | The header (in use), reveals, reading progress | Chromium, Safari 26; Firefox behind a flag |
| `interpolate-size`, `calc-size()` | Animating to `height: auto` (in use on `details`) | Chromium only; others snap, which is fine |
| `text-wrap: balance` | Headings, short captions | Baseline 2024 |
| `text-wrap: pretty` | Paragraphs, to avoid a one-word last line; works with Thai | Chromium, Safari 26 |
| `dvh` / `svh` / `lvh` | Full-height sheets and screens on phones | Baseline |
| `env(safe-area-inset-*)` + `viewport-fit=cover` | Fixed bars on notched phones | Baseline |
| `content-visibility: auto` + `contain-intrinsic-size` | Skip rendering off-screen sections: member board groups, long threads | Baseline 2024 |
| `scrollbar-gutter: stable` | No sideways jump when a dialog locks scrolling | Baseline |
| `overscroll-behavior: contain` | Scrolling inside a sheet doesn't scroll the page | Baseline |
| `color-mix()`, OKLCH, relative colour `oklch(from var(--color-accent) l c h / .15)` | Derive tints and hover states from tokens instead of new hex | Baseline 2023–24 |
| `@property` | Animatable custom properties (the caret bloom uses it) | Baseline 2024 |
| `field-sizing: content` | A composer textarea that grows with no JS | Chromium; newer elsewhere, so keep any JS fallback |
| `sibling-index()` / `sibling-count()` | CSS-only stagger | Chromium only |
| Anchor positioning | Not needed; Radix positions everything | Chromium, Safari 26 |
| `appearance: base-select` | Not worth it while Radix and native selects serve | Chromium only |
| `text-box: trim-both cap alphabetic` | **Never on Thai**: it clips tone marks and the vowels below | Chromium, Safari |
| `corner-shape: squircle` | Decoration only; consistent radii matter more | Chromium only |

## HTML and browser APIs

| API | Use here | Status |
|---|---|---|
| `navigator.share()` | Share a party, contest, look or member link on a phone | Safari, Chrome Android; partial on desktop, so fall back to the clipboard |
| `navigator.clipboard.writeText` | Copy `/tell Name@World`; needs a user gesture | Baseline; fall back to a popover with the text selected |
| `inert` | Freeze what is behind a custom overlay (Radix already does this for dialogs) | Baseline 2023 |
| `<details name="group">` | Exclusive accordions | Baseline 2024 |
| `hidden="until-found"` | Collapsed text that Ctrl+F can still find | Chromium; newer elsewhere |
| `fetchpriority="high"` | The one LCP image | Baseline |
| `loading="lazy"` on images and iframes | Below-the-fold pictures; the YouTube and Discord embeds | Baseline |
| `scheduler.yield()` | Break a long handler up for INP | Chromium; fall back to `await new Promise(r => setTimeout(r))` |
| `navigator.setAppBadge(n)` | Unread count on an installed icon, only if the site becomes installable (a manifest) | Chromium desktop; iOS home-screen apps |

## React 19.3 and Next 16.3 (see `node_modules/next/dist/docs/`)

- **`<ViewTransition name enter exit share default>`**, together with
  `<Link transitionTypes={["nav-forward"]}>`,
  `router.push(href, { transitionTypes })`, and `addTransitionType` inside
  `startTransition`. Doc: `02-guides/view-transitions.md`.
- **`useOptimistic` + `useTransition`** make toggles instant (popoto,
  reactions, votes, seats). A `data-pending` attribute plus Tailwind
  `has-data-pending:` gives feedback on an ancestor. Doc:
  `02-guides/interactive-apps.md`.
- **`useDeferredValue`** keeps typing smooth while 500 members filter.
- **`useEffectEvent`** reads the latest props inside effects without
  re-subscribing. Realtime handlers are the obvious fit.
- **`<Activity mode="hidden">`** keeps a hidden panel's state, but it costs
  memory and keeps effects around. Use it on purpose only.
- **`useLinkStatus()`** from `next/link` shows a pending hint inside a link to
  a slow, dynamic page (member and party pages are dynamic). Use a fixed-size
  hint with a 100ms delay. Doc: `03-api-reference/04-functions/use-link-status.md`.
- **Route files:**
  - `loading.tsx` is prefetched as an instant fallback for dynamic routes.
  - `error.tsx` gets `retry()` (which re-fetches) and `reset()` (which only
    clears).
  - `global-error.tsx` must render its own `<html>` and `<body>`.
  - `catchError` from `next/error` gives a component-level boundary.
- **Experimental,** so skip unless asked: `useOffline`, `partialPrefetching`,
  and `instant`, which needs `cacheComponents`.

## Not here

- A light theme, unless members ask: it doubles every design check.
- New UI kits, icon fonts, animation libraries, CSS-in-JS.
- `next/image` added casually: Vercel bills image optimization and Cloudflare
  would need a loader. The fc-perf skill decides that.
