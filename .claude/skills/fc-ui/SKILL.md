---
name: fc-ui
description: UI/UX craft for the Cafe And SHabu FC site. Build, polish or audit any screen at a 2026 level (fluid motion, view transitions, instant optimistic feedback, Thai-first typography, accessible, dark "Midnight" theme) without adding bloat or slowing the site. Use for every change to pages, components, styles, animation, layout, copy or loading/empty/error states in this repo; for "make it look or feel better" and phone/mobile problems; and for Thai requests like "ปรับ UI", "สวยขึ้น", "ดีไซน์", "หน้าตา", "ลื่นๆ", "แอนิเมชัน", "มือถือ", "ใช้งานง่าย", "UX", "ตรวจหน้า". Prefer it over generic design skills in this repo, because it knows the site's tokens, primitives and rules.
---

# UI/UX for the FC site

This is the home of a Thai FFXIV Free Company: about 500 characters, around
160 of them active, a restaurant theme, and a potato called popoto as the
running joke and the currency of kindness. It is used mostly on phones
(there is a bottom tab bar) and in Thai (the default). It should feel like a
warm, well-made game UI, and never like a dashboard.

## The bar: the best of 2026, and never too much

1. **Feel beats flash.** The premium feeling comes from responsiveness:
   - an answer to every press within 100 ms (buttons already shrink to
     `scale: .97`);
   - optimistic updates;
   - nothing jumping as data arrives;
   - skeletons shaped like what will arrive.

   An effect that makes a tap wait is a regression.
2. **Continuity.** Things travel from where they were. The page slides by
   direction and a member's face morphs into their page (View Transitions).
   Build on that before inventing anything new.
3. **One loud moment per flow.** Celebration is earned: a rare popoto opening,
   a prize, a contest podium, the popoto throw. Everyday motion is quiet:
   90–260 ms, with exits faster than entries.
4. **Platform first.** Prefer CSS, then the Web Animations API, then
   `motion/react`, which is only for layout and shared-layout animation. Never
   add a new animation or UI library. The newest CSS goes in as progressive
   enhancement, so an older browser gets the plain version and never a broken
   one.
5. **Thai first.**
   - Thai needs air: body line-height of at least 1.6.
   - The looped body face smudges below about 12px, so tiny labels use
     `font-data` (Bai Jamjuree).
   - Never letter-space Thai.
   - Never use `text-box-trim` on Thai, because it clips the tone marks above
     and the vowels below.
   - Test long Thai lines, which have no spaces, and long character names.
6. **Dark, done right.** Elevation comes from lighter surfaces
   (`bg` → `surface` → `card`) and the `line-lit` top edge. A black shadow on a
   near-black page does nothing. Measure contrast; don't eyeball it.
7. **Everyone.** WCAG 2.2 AA. Under reduced motion the meaning must survive
   even though the movement does not. Keyboard works everywhere, and labels
   exist in both languages.

## Know the system before adding to it

Read [references/design-system.md](references/design-system.md) before a
non-trivial change. It lists the tokens, type scale, easings, custom classes,
primitives (with when to use which), the z-index ladder, page anatomy and
i18n. The rules it adds up to:

- **Colours:**
  - Use tokens (`bg surface card line line-lit line-strong ink muted accent
    chili gold jade copper steel`).
  - Raw hex is only for game colours (jobs, tags, rarity, Discord), which are
    deliberately not tokens.
  - `chili` is 3.7–4.2:1 on the backgrounds: fine for fills, icons and large
    text, not for small text.
- **Text sizes:** the scale by job: `text-label` 11, `meta` 12, `ui` 13,
  `read` 14, `lead` 15, `title` 16, `head` 17.5. Tailwind sizes only above 16.
  No new `text-[Npx]`.
- **Components:** reuse `components/ui/*`: Modal and Sheet, TalkWindow,
  Messages, Toast, Tooltip / HoverCard / Popover, Tabs, Skeleton,
  ImageLightbox, DateTime, DropZone, ConfirmDialog. A hand-copied overlay or a
  fourth tab implementation is debt.
- **Words:**
  - Every string is a key in `lib/i18n.tsx` with both `en` and `th`, used
    through `useLang().t("ns.key", {vars})`. That includes `aria-label`s.
  - Game vocabulary stays English (Savage, Party, Crafter).
  - Never build a sentence by gluing fragments together, because word order
    differs between the languages. Use `{placeholders}`.
  - Match the voice: warm, casual Thai (นะ, หน่อย) and plain English.

## Workflow

### Build or change a screen

1. **Read first.** Read the page, its components, and the part of
   `app/globals.css` that styles them, and look for an existing class or
   primitive. Pages follow one shape: a server `page.tsx` reads data and
   renders a client component inside `<main className="pt-7">`.
2. **List the states before coding.** Use the checklist in
   [references/checklist.md](references/checklist.md): loading, empty, error,
   offline, signed out, no verified character (`gate.needCharacter`), admin,
   long Thai, long names, tall 9:16 pictures, 500 rows.
3. **Build phone-first at 360px.** Then `sm` (640px and up); two panes appear
   side by side from 1180px (`useRoomBeside`). Keep clear of the fixed bottom
   tab bar (the column has `pb-32` on phones).
4. **Add motion last,** from [references/motion.md](references/motion.md):
   the existing vocabulary first, reduced motion always.
5. **Reach for modern platform features where they earn it,** from
   [references/modern-web.md](references/modern-web.md). It lists what this
   Next 16.3 and React 19.3 stack offers and the support status of each.

### Polish a screen

Look for friction before beauty:
- contrast;
- targets smaller than 24px;
- a hover-only affordance on a phone;
- layout shift as data arrives;
- a missing empty or error state;
- a spinner where a skeleton fits;
- untranslated labels;
- motion that ignores reduced motion;
- anything that makes a tap wait.

Then add craft: continuity between states, a satisfying commit moment, and
copy in the site's voice.

### Audit a page or flow

Produce a table: **P1** (broken or inaccessible), **P2** (friction), **P3**
(polish). Each row gives the file:line, what is wrong, the fix, and the effort
(S/M/L). Put screenshots next to the findings. Start from the dated baseline
in [references/gaps-2026-10.md](references/gaps-2026-10.md): check what is
still true and strike what has been fixed.

## Verify before calling it done

- **Types:** `npx tsc --noEmit`. **Tests:** `npm test` when `lib/` changed.
- **Run it.** First check whether a dev server is already up
  (`curl -s -o /dev/null -w "%{http_code}" localhost:3000`), because another
  session may own it. Otherwise start `npx next dev --port 3100` in the
  background and stop it afterwards. `next dev` rewrites `next-env.d.ts`
  (restore it with `git checkout next-env.d.ts`) and the AGENTS.md block,
  which is expected. Never delete the main tree's `.env.local`.
- **Screenshots at the sizes that break things:**
  ```bash
  node .claude/skills/fc-ui/scripts/shoot.mjs http://localhost:3100/members \
    --sizes 360x640,375x667,390x844,768x1024,1280x800 --out <scratchpad>/shots
  # again with --reduced-motion, and with --lang en (Thai is the default)
  ```
  Look at every PNG with Read, and read the "problems seen" list it prints.
  375×667 is the short phone where tall dialogs lose their top.
- **Pages that need data or a session:**
  - Preview with fake Supabase data (see "Previewing with fake data" in
    [references/checklist.md](references/checklist.md)).
  - Or a throwaway signed-in cookie, via `--cookies`: see
    `.claude/skills/fc-security/references/live-probe.md`.
  - Delete either afterwards.
- **Contrast of any colour you introduce:**
  `node .claude/skills/fc-ui/scripts/contrast.mjs <hex|token> bg surface card`.
- **A keyboard pass:** Tab through, the focus ring is always visible and
  never hidden under the sticky header or tab bar, Esc closes, and Enter or
  Space activates.
- **Speed:** if the change adds a dependency, a large client component, or
  data crossing into the browser, run the fc-perf checks before finishing.

## Budgets for UI work

- **Dependencies:** no new runtime dependency for UI without the user's OK.
  Charts, the date picker, the cropper and the command palette are heavy:
  load them on demand with `next/dynamic` from a client component.
- **What animates:** only `transform`, `opacity`, a small `filter` and
  `clip-path`. Never layout properties, except `interpolate-size` on small
  disclosures. Keep `backdrop-filter` blur at 8px or less over small areas;
  phones pay for every blurred pixel.
- **Long lists (100+ rows):**
  - No per-row motion.
  - `content-visibility: auto` with `contain-intrinsic-size` for long
    off-screen sections.
  - `useDeferredValue` for filters.
  - `prefetch={false}` (or on hover) on links, when the linked page is
    static.
- **Images:**
  - An aspect-ratio box or width/height, so nothing shifts.
  - `loading="lazy"` and `decoding="async"` below the fold.
  - `fetchPriority="high"` on the one image that is the page's LCP.
  - The site uses plain `<img>` on purpose; see fc-perf before adding
    `next/image`.
- **Responsiveness (INP):** a handler does the minimum synchronously; wrap
  heavy state updates in `startTransition`.

## Deliver

Tell the user, in Thai when they write Thai:
- what changed for members, and why;
- before and after screenshot paths;
- what was verified (sizes, reduced motion, keyboard, both languages);
- anything left open.

Commit only when asked, staging only your own hunks: parallel sessions share
this working tree, so never `git add -A`. The subject is a plain sentence
about what members now see or can do, and the body explains why. Look at
`git log` for the tone.
