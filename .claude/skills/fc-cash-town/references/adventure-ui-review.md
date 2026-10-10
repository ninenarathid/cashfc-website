# Adventure UI review — 2026-10-10

Local implementation and review of the owner's request for material-based game UI,
books that open like books, categories, and readable details. Includes the long
recipe-button list in the bag shown in the owner's screenshot, not only the book
beside the stove. This is not a live deployment or a new database migration.

## Implemented

- `TownNotebook`: leather cover, native modal reader, bound two-page spread on
  desktop, compact phone layout, known-entry categories and page controls. Contents
  are grouped into ten-entry pages; larger collections have search. Native modal
  keeps background controls inert; Escape closes and focus returns to the cover.
  Page motion respects reduced-motion preferences.
- `TownRecipeBook` replaces the bag's long recipe-pill list. Categories follow
  cookware/method (grilled, baked, steamed, skillet, pots, fermented, other food,
  processed/crafted), shown only when represented among known recipes. Thai and
  English names are searchable. Pages show ingredients, cookware, portions/cooks,
  stamina, actual buff descriptions, special effects and first maker where known.
  `toldOf`/`whispersOf` preserve secret ingredients until the existing discovery
  rules reveal them; unknown recipes are not added to the book.
- `TownBugBook`: village discoveries grouped by actual movement/habit. Pages show
  description, approach clues, habitat, garden role, first catcher, and recorded
  species count. Undiscovered species are not listed.
- The stove's `TownKitchen` book retains pinning, ingredient availability, guess
  history, secret hints and manual ingredient selection. Its index is paginated;
  known buff filters and processed/crafted filter remain. Material styling and
  mobile stacking were corrected so the HUD does not obscure book headings.
- Found combo, preparation, water, forest-part and garden/insect experiment books
  use the reader. No private combo registry is imported by the reader.
- Workshop, preparation, camps, water channels, garden placement, insect release,
  wood grain, mineral survey and rod-hook equipment have themed frames, pixel
  illustrations, clearer action/ingredient details and visible focus states.
  Existing action handlers and gameplay limits are preserved.

The existing pines keepsake book was not converted in this pass. This note does
not claim all planned profession rewards or every secret combination are done.

## Validation

Own isolated Trial room: `townTest=UI&townRoom=uipolish`, QA checkout
`E:/NinenineProject/fcnext-wt-adventure`, development port 3107. Test grants and camp
placement changed only this Trial's local state; no production purses were used.

- Main `npx tsc --noEmit`: passed. Final isolated `npm run build -- --webpack`
  with `FC_ADVENTURE_BUILD=1`: exit 0, 550 static pages generated; build includes
  TypeScript validation. Existing metadataBase warning remains unrelated.
- All 17 UI source files match between main workspace and tested checkout:
  `.codex/adventure-qa/ui-source-hashes.json`. Final build output is
  `.codex/adventure-qa/ui-build.log`.
- Private combo registry absent from all 127 final production browser chunks.
- Desktop 1280×800 and mobile 390×844: inspected recipe/insect reader, kitchen
  recipe and index, workshop, preparation, water-channel and camp surfaces.
  Tested contents pagination (10 entries, next group 11–20), English search in
  Thai UI (`Ramen` → one entry), processed category (four known entries), Escape
  and focus restoration. Phone document width stayed at 390px.
- Found recipe's secret slip present before crafting, absent after marking made,
  present again after restoring the Trial state. Reading/filtering did not change
  coins or stamina. Camp UI displayed actual remaining charges and daily quota.
- axe-core scan of recipe reader: zero violations, 29 passes, color-contrast
  incomplete flag. Paper-gradient text contrast was visually reviewed. This is
  scoped reader evidence, not an accessibility certification for the whole game.
- `git diff --check` on tracked UI changes: passed (Windows line-ending notices).

Screenshots are under `.codex/adventure-qa/`:
`ui-recipe-book-desktop.png`, `ui-recipe-book-mobile.png`,
`ui-insect-book-desktop.png`, `ui-insect-book-mobile.png`,
`ui-kitchen-book-mobile.png`, `ui-kitchen-recipe-mobile.png`,
`ui-kitchen-recipe-desktop.png`, `ui-workshop-desktop.png`,
`ui-stream-desktop.png`, `ui-camp-desktop.png`, `ui-camp-mobile.png`,
`ui-preparation-mobile.png`, `ui-preparation-game-mobile.png`.

The earlier adventure gameplay source hashes describe their earlier checkpoint.
Use the UI hash snapshot above for this presentation change. Gameplay/SQL test
results in the expansion handoff remain historical evidence for that checkpoint.
Matching site deployment and authenticated live smoke checks are still release work.

Follow-up comprehension fixes and expected fun ratings for all nine professions
are in [adventure-gameplay-review.md](adventure-gameplay-review.md). Its newer
18-file UI snapshot and successful build include the multi-line fishing help,
experiment expiry restart and contextual insect-release eligibility messages.
