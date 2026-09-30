# The FC site's design system, as it stands

Surveyed 2026-10-01. The code is the authority: if something here disagrees
with `app/globals.css` or `components/ui/`, trust the code and fix this file.

## Contents
1. Tokens (colour, type, shadow, easing, fonts)
2. Global behaviour already in CSS
3. Custom classes
4. Primitives in components/ui, and which to use
5. z-index ladder
6. Page anatomy and navigation
7. Words: i18n and voice

## 1. Tokens — `app/globals.css` `@theme` (lines 15-119)

"Midnight": cool slate with an ice-blue accent. Dark only. There is no light
theme, no `dark:` variant and no `color-scheme` declaration.

| Token | Hex | Job |
|---|---|---|
| `bg` | #0f1319 | the page |
| `surface` | #161b23 | a panel on the page |
| `card` | #1b212b | a card on a panel (the rare-popoto card is #161b23) |
| `line` | #36414f | a hairline between things that are already plainly separate |
| `line-lit` | #4a586b | the top edge of something raised (light from above) |
| `line-strong` | #5a6c85 | the boundary of a control; 3.02:1 on every surface |
| `ink` | #e3e8ef | text |
| `muted` | #8b97a8 | secondary text; 5.5–6.3:1 |
| `accent` | #6aa9e0 | links, focus, the one colour that means "this"; 6.4–7.4:1 |
| `chili` | #d14b3a | danger, hot; **3.7–4.2:1, too low for small text** |
| `gold` `jade` `copper` `steel` | #e5cc80 #4fb8a8 #c98a5b #7ea6c9 | status and accents |

Game colours (job stones, tag kinds, achievement rarity, Discord blue) are
deliberately **not** tokens: they belong to the game, not the theme.

**Type scale, named by job** (whole pixels, lines 100-106): `text-label` 11 ·
`text-meta` 12 · `text-ui` 13 · `text-read` 14 · `text-lead` 15 ·
`text-title` 16 · `text-head` 17.5. Above 16px use Tailwind sizes: a page h1
is `text-3xl`.

**Shadows** (108-110): `shadow-2xl`, `shadow-xl` and `shadow-lg` are redefined
darker and tighter for a dark page.

**Easings** (112-114): `--ease-settle` cubic-bezier(0.22,1,0.36,1) for
something arriving; `--ease-exit` (0.4,0,1,1) for something leaving;
`--ease-drawer` (0.32,0.72,0,1) for a sheet under a thumb and the face morph.
There is deliberately **no duration scale**: timings are argued per place
(110ms on a popover opened twenty times; 620ms on a face crossing the screen).

**Fonts** (`app/layout.tsx:28-45`, via next/font, Thai and Latin subsets):

| Class | Face | Weights | Job |
|---|---|---|---|
| `font-display` | Mitr | 500, 600 | headings; rounded and friendly |
| `font-body` | Noto Sans Thai Looped | 400, 600, 700 | body; looped Thai reads as conversational |
| `font-data` | Bai Jamjuree | 500, 600 | numbers, small caps labels, anything tiny (loops smudge at 10–11px) |

No radius or spacing tokens: Tailwind defaults (rounded-lg, rounded-xl and
rounded-full; dialogs use rounded-2xl).

## 2. Global behaviour already in CSS

- **Focus:** `:focus-visible` gives a 2px `accent` outline with a 2px offset
  (135-138). It sits outside any layer, so a Tailwind `outline-none` does not
  remove it. It follows each element's own radius.
- **Press feedback:** `scale: .97` on `:where(button,[role=button])` in
  `@layer base` (811-819), plus an opt-in `a.pressable` (907-911). It uses the
  `scale` property, not `transform`, so it composes with transforms.
- **Disclosure:** `details` opens with a height animation through
  `interpolate-size` (872-884).
- **Header:** reacts to scroll with no JavaScript, via a scroll-driven
  animation (1195-1216).
- **View transitions:**
  - The page slides, driven by the `nav-forward` / `nav-back` types from
    `<Link transitionTypes>` in `Nav.tsx`: 170ms out, 260ms in (1009-1085).
  - The header and tab bar are named out of the root snapshot (1097-1106).
  - The `member-face` morph runs 620ms on `ease-drawer` (1153-1183). It is
    triggered by `lib/morph.ts` `markFaceMorph` (called from MemberBoard) and
    targets `MemberView.tsx:499`.
  - All of it sits inside `@supports` and `prefers-reduced-motion:
    no-preference`.
- **Reduced motion:** a blanket `*{transition:none!important}` (217-225) plus
  per-feature blocks.
- **Inputs:** `input`, `textarea` and `select` with `border-line` are promoted
  to `line-strong` (1285-1289).

## 3. Custom classes (plain CSS, outside layers)

| Class | Lines | Use |
|---|---|---|
| `full-bleed` | 153 | break out of the column |
| `no-bar` / `slim-bar` | 164 / 178 | hide or slim scrollbars |
| `drift` | 200-225 | slow ambient drift |
| `pop-in` | 233-247 | popovers and hover cards (110 in / 90 out), keyed on Radix `data-state` |
| `skeleton` | 253-270 | loading shimmer (reduced-motion aware) |
| `looking` | 285-307 | "looking for" pulse |
| `badge-foil` | 324-366 | holographic award plaque |
| `donut-arc` | 372-390 | chart arc draw |
| `rare-*` | 398-568 | the rare-popoto reveal: flash, rings, rays, stars, shake, charge |
| `aqua-*` | 587-683 | Aqua's prize effects: coin shower, purse, black card |
| `toast-rare` / `-foil` / `-sheen` | 736-792 | special toasts |
| `tab-in` | 831 | tab panel entry |
| `toast-slide` | 845-856 | toast enter and exit |
| `nav-sticky`, `--nav-h` 64/68px | 934-960 | sticky header |
| `tabbar-scrim` | 968, 1256 | phone tab bar backdrop |
| `nav-caret` + `@property --caret-bloom` | 988-1138 | active-tab caret glow |
| `rise-in` | 1228-1244 | modals and the lightbox (240ms) |
| `lit-top` | 1269 | raised top edge |

## 4. Primitives — `components/ui/` (all client except Skeleton, ToMember, Emote, GiftIcon, NavIcons and PopotoIcon)

| Need | Use | Notes |
|---|---|---|
| A dialog | `Modal` | Radix Dialog at 640px and up, vaul Drawer below. Props: `open`, `onOpenChange`, `title` (rendered sr-only), `subtitle`, `icon`, `wide`, `sticky`, `beside`, `hideClose`. |
| A side or bottom panel | `Sheet` (from Modal.tsx) | Flags: `wide`, `flush` (child owns scrolling), `quiet` (non-modal), `split`. |
| A thing plus its conversation | `TalkWindow` | Modal and Sheet side by side; on a phone they share the height; a "door" shows the last message. Used by gallery PostDetail and contest LookDialog. |
| A thread | `Messages` | The one chat component: replies, pictures, edit/delete, reactions, stickers, YouTube. Writes are injected. |
| A notice | `toast({text,image,href,tone})` | Fires a `toast:show` CustomEvent; the host is mounted in the layout. Tones: accent, good, rare, prize, wallet. |
| One sentence of help | `Tooltip` | Pointer only by decision; don't hide essential information in one. |
| An explanation on hover | `HoverCard` | 120 / 80ms. |
| A question or choice | `Popover` | Trigger via asChild. |
| Tabs | `Tabs` | `{key,label,hint,body}[]`; mounts only the open panel. |
| Loading | `Skeleton` or the `.skeleton` class | Size it like the final content. |
| Pictures full screen | `ImageLightbox` | Arrow keys step through. |
| Date and time | `DateTime` | react-day-picker; a Sheet on a phone. Value is "YYYY-MM-DDTHH:mm". |
| Files | `DropZone`, `useDropTarget`, `usePasteImages` | |
| Are you sure? | `ConfirmDialog` (components/) | Radix AlertDialog; focus lands on Cancel; `danger`, `z`. |
| Search anything | `CommandPalette` | cmdk; opens with `/`, Ctrl/Cmd+K, or a `palette:open` event. |
| Phone or not | `useIsPhone()` (below 640), `useRoomBeside()` (1180 and up) | Don't re-implement them. |

## 5. z-index ladder

header 40 · tab bar 50 · ConfirmDialog 60 · palette / Modal 70+ (a Depth
context adds 10 per nesting level) · lightbox 80 · tooltip / toast / nav sheet
90 · DateTime 95 · popover / hover card 100 · confirm-inside-a-window and
PopotoRare 120 · the thrown potato 200.

Place new layers on this ladder, and say where in a comment.

## 6. Page anatomy and navigation

- **Column:** `mx-auto max-w-5xl px-4 pb-32 sm:pb-16` (`app/layout.tsx:107`).
  The larger bottom padding on phones clears the fixed tab bar.
- **Page:** a server `page.tsx` reads `data/*.json` and renders a client
  component in `<main className="pt-7">`.
  - Eyebrow: `font-data text-meta uppercase tracking-[0.22em] text-accent`.
  - h1: `font-display text-3xl font-bold`.
- **Desktop (`Nav.tsx`):** a sticky header with tabs (`hidden sm:flex`, never
  wrapping) and a `motion` layoutId caret.
- **Phone:** a fixed bottom tab bar (`sm:hidden`, z-50) with four slots plus
  "More", a vaul sheet holding search, the overflow tabs and language. Which
  tabs show depends on settings, sign-in and admin status.
- **Breakpoints:** `sm` does nearly all the work (124 uses); `md` and `lg` are
  rare. In JS: phone below 640, two panes side by side from 1180.
- **Safe areas:** `env(safe-area-inset-bottom)` is used at Nav.tsx:348 and
  420. There is no `viewport` export with `viewportFit: "cover"` yet.

## 7. Words — `lib/i18n.tsx`

- **Dictionary:** `DICT` holds about 1,590 keys shaped
  `"ns.key": { en, th }`. `type Key = keyof typeof DICT`, so keys are
  compile-checked.
- **Using it:** `const { lang, setLang, t } = useLang();` then
  `t("party.join", { name })`. It fills `{placeholders}` and falls back to
  English, then to the key. `useSectionLang()` lets one block flip its own
  language.
- **Choosing the language:** Thai is the default. The choice is stored in
  localStorage `fc_lang` and, for members, in `profiles.language`. The toggle
  is `LangToggle` (in the header at 640px and up, in the More sheet on
  phones).
- **Long explainers** may keep inline `th ? "…" : "…"` (LeaderboardIntro,
  HotExplainer). Everything short goes in the dictionary.
- **Voice:** Thai is warm and casual, and English plain. For example,
  "go wish them well!" / "ไปอวยพรกันหน่อย!", or "Nothing here yet — be the
  first to post something." / "ยังไม่มีรูปเลย เป็นคนแรกก็ได้นะ".
  🥔 is the currency and the running joke; the restaurant ranks are the
  in-game hierarchy.
