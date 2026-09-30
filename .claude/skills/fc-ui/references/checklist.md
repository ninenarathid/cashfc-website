# UI checklist

Go through this before building (as a list of states to design for) and
again before finishing (as a review). Skip the lines that cannot apply.

## States

- [ ] **Loading:** a skeleton the size and shape of what will arrive. No
      layout shift when it lands. No spinner for anything under about 300ms.
- [ ] **Empty:** a friendly line in the site's voice, plus the next action
      ("ยังไม่มีรูปเลย เป็นคนแรกก็ได้นะ").
- [ ] **Error:** what happened, in words a member understands, and a way to
      retry. A failed optimistic update reverts visibly.
- [ ] **Offline or a slow network:** the page is still usable, and a write
      that fails says so.
- [ ] **Who is looking:**
  - Signed out: reads work, and a write says how to sign in.
  - Signed in with no verified character: explain and link to the claim
    (`gate.needCharacter`). The database refuses these writes anyway.
  - Guest (not in the FC): FC-only things are explained, not just missing.
  - Admin: admin controls are clearly marked. AdminSwitch can preview the
    member view.
- [ ] **Private data:** a member with a private Lodestone profile shows
      "No data", never a broken card.
- [ ] **Extremes:**
  - Text: a long Thai sentence with no spaces, a long character name
    with an apostrophe (an invented one: "Ka'lyna Moonwhisper-Valentine"),
    a 300-character caption.
  - Pictures: a 9:16 GPose shot, a 4K one.
  - Counts: 0, 1, and 500 items.
- [ ] **Time:** dates in Bangkok time, and relative times that stay true
      after an hour on the page.

## Layout and screens

- [ ] 360×640, 375×667 (a short phone: tall dialogs must not lose their
      top; use `justify-center-safe`, and `shrink-0` on the art),
      390×844, 768×1024, 1280×800, and 1180px and up with two panes side
      by side.
- [ ] Nothing hides under the fixed bottom tab bar or the sticky header,
      including the focused element (`scroll-padding`).
- [ ] Sheets use `dvh`, and nothing is cut off by the phone's toolbar.
- [ ] No sideways scrolling at 360px. Long strings wrap
      (`overflow-wrap: anywhere` for URLs and IDs).

## Input

- [ ] Targets are at least 24×24px (WCAG 2.2), and primary actions on
      phones about 44px.
- [ ] Nothing works on hover only. Touch has an equivalent
      (`[@media(hover:none)]:opacity-100`, as the carousel buttons do).
- [ ] Keyboard: a sensible tab order; the focus ring is always visible;
      Esc closes; Enter or Space activates; arrows work in lists and
      lightboxes.
- [ ] Forms: labels, `inputmode`/`enterkeyhint` on phones, errors next to
      the field, `aria-live="polite"` for async results.

## Accessibility

- [ ] Contrast measured with `scripts/contrast.mjs`: 4.5:1 for text, 3:1
      for large text, control edges and meaningful icons. `chili` is not
      small-text safe.
- [ ] Every dialog has a title (sr-only is fine). Icon buttons have
      translated `aria-label`s.
- [ ] Decorative images have `alt=""`; meaningful ones say what they show.
- [ ] Reduced motion: movement is gone and the meaning stays. No infinite
      pulse or spin. Timer choreography is shortened.
- [ ] Thai content is announced as Thai (`lang` on `<html>`, or on the
      block).

## Words

- [ ] Every string is a key in `lib/i18n.tsx` with `en` and `th`, and that
      includes aria-labels and toasts.
- [ ] Game vocabulary stays English. No sentences glued from fragments; use
      `{placeholders}`.
- [ ] The voice: warm, short Thai and plain English. Nothing officious.

## Speed

- [ ] No new dependency. Anything heavy loads on demand.
- [ ] Only compositor properties animate. No motion per row in long lists.
- [ ] Images have a box (aspect-ratio or width/height), lazy loading below
      the fold, and a size that fits where they are shown (a 48px icon is
      never a 1200px picture).
- [ ] Handlers stay light (INP). Filters over big lists are deferred.

## Consistency

- [ ] Tokens, not hex (unless it is a game colour). Scale classes, not
      `text-[Npx]`. `var(--ease-*)`, not curve literals.
- [ ] Primitives from `components/ui`, not hand-copied overlays or tabs.
- [ ] New layers are placed on the z-index ladder.
- [ ] Page anatomy: the eyebrow, `font-display text-3xl` h1, `<main
      className="pt-7">`.

## Previewing with fake data

For states that need data you don't have (empty, 500 rows, a long name, a
contest at each stage):

1. Add a temporary route, for example `app/_preview/page.tsx`, that renders
   the component.
2. Patch the shared browser client's fetch before it renders:
   ```ts
   (createClient() as any).rest.fetch = async (url, init) => /* fake Response */;
   ```
   Patching `window.fetch` does not work, because `@supabase/ssr` keeps one
   client and the header creates it before the page's module loads.
3. Honour `limit=1` in the fake, or `maybeSingle()` sees two rows and returns
   null.
4. Screenshot it with `shoot.mjs`. For widths below about 500px, the script
   already uses device-metrics emulation.
5. Delete the route when done, and `git checkout next-env.d.ts` if dev
   rewrote it.
