# Gameplay and comprehension review — 2026-10-10

Owner request: rate the fun expected after releasing all six implemented gameplay
phases, and check that the new UI is thematic and understandable. These are
design estimates from implemented rules and local Trial review, not player
survey results or confirmation that the expansion is live. No numeric before
scores are invented: there is no comparable measured baseline.

Scope is the nine professions in the six-phase expansion, including the common
workshop and 225 usable additions. The separate 42 planned rank rewards and
unimplemented secret combinations are excluded. Installation of matching SQL,
site deployment and authenticated live verification remain separate work.

## Expected fun, out of ten

| Profession | Expected | Concrete improvement | Remaining limitation |
|---|---:|---|---|
| Fishing | 9 | Two/three lines with independent catches, one reel control, habitats, currents, bait choice and removable hooks | Multiple bands are harder to read; repetition and waiting still need real player observation |
| Woodcutting | 8.5 | Read three grain notches, choose the fall and an additional part, then earn quality through successful timed chops | Grain of the same tree can become familiar; this does not create unlimited new puzzles |
| Mining | 8.5 | Echo direction and ore versus intact crystals add decisions to crack-path play | Binary echo reading is simple; most action depth remains in the vein board |
| Gardening | 8.5 | Rotate footprints, plan adjacent plants, discover crosses and use captured insects | Growth still takes time; a session is less immediately active than fishing |
| Insects | 8 | Movement traces/lures and catching versus garden care connect collecting to other professions | Different habits require practice, and release conditions must be visible |
| Foraging | 8 | Environmental traces, plant-part choice and root recovery turn gathering into exploration | Less mechanical challenge than fishing or mining; repeated routes may feel routine |
| Mountain water | 7.5 | Shared channel choices, samples, filtering/blending and bringing properties to the village | Primarily exploration and resource decisions, rather than a deep action minigame |
| Cooking | 8.5 | Known recipe reader, preparation decisions, sensory/tool clues and recorded experiments | Preparation is three manual choices, not a continuous heat simulation; discovery can require failed attempts |
| Helping | 8 | Placeable camps, shared charges and chosen benefits make provisions useful to travelers | Rating assumes other players participate; solo enjoyment is lower |

Arithmetic mean of these estimates: about 8.3/10. Scores emphasize meaningful
choices, readable feedback, discovery, replay variety and links to other lines.
The strongest improvement is in decisions and discovery, not simply item count.
There is no claim that every player will find every profession equally enjoyable.

## Further UI fixes in this review

- Wood grain: explain that each line is read top to bottom, with its lower end
  identifying the notch side. Show how many of three notches are selected and
  whether a fall direction is still missing. Choices remain manual.
- Multiple fishing lines: one short sentence beside the gauge explains the white
  needle, a fish's band and overlapping bands. No switching mechanic is invented.
- Workshop: classify old cookware, nets, axes, picks, garden tools and buckets by
  their real use, alongside the expansion tools. Search accepts Thai/English
  names and trims whitespace. Only previously available craft leads are searched.
- Food experiments: show ingredient/stamina cost and compost outcome before
  tasting; make a failed attempt's next step explicit. Remaining time is visible.
  An expired local UI run returns to ingredient selection through an explicit
  restart button, preserving the existing server validation and spend-on-finish
  contract. No recipe answer is revealed by this fix.
- Camps: success text distinguishes placing a camp from receiving preparation;
  benefit feedback lists the one supply, one stamina and one shared use spent.
- Water: explain the sampler/bucket entry point and gathering/preparation cost;
  pouring explicitly says it uses one prepared water and one stamina and changes
  the shared well. Hidden recipe outputs and undiscovered effects remain hidden.
- Insect release: disable clearly ineligible actions and explain seed/root plot,
  ownership, dead/ripe plant, previous pollination or absence of pests before the
  click. The server still decides eligibility; inventory/care rules are unchanged.
- Notebook: search input has a stable name. Existing category/detail reader,
  native modal focus behavior, known-only content and reduced motion remain.

The material-based UI/recipe and village insect books from the preceding pass
remain covered by [adventure-ui-review.md](adventure-ui-review.md). This follow-up
does not replace old screenshots or claim an accessibility certification for the
entire map and every older minigame.

## Validation

Own isolated browser Trial on port 3107, room `uipolish`; no production purses or
remote database writes. Fixtures grant local items/plots, and the geological
survey uses a valid pending-vein fixture to inspect its screen. Fishing uses the
Trial's development catch fixture; these are UI checks, not a live reward audit.

- Mobile 390×844: visual review of grain, mineral survey, footprint placement,
  insect release, two-line fishing fight, preparation and camp. Document width
  stayed at 390px on tested screens. Grain controls measured 44px high. Longer
  boards have contained scrolling, including their bottom actions.
- Three grain choices plus fall enable readiness; selecting an echo enables the
  survey action. Rotating a gourd updates its three actual footprint cells and
  changes no purse before planting.
- Releasing a butterfly consumes one insect, records the garden experiment and
  disables another pollination on the same bearing. A camp benefit consumes one
  ration and displays one daily use, with the correct success text.
- Advance only the Trial keeper's UI clock beyond an experiment deadline: restart
  appears, ingredients/coins/purse stay unchanged and restarting restores ready
  ingredient choices. Restore the clock immediately after this check.
- `npx tsc --noEmit`: passed. Targeted existing phase6, fieldwork Trial and insect
  garden suites: 3 files, 13 tests passed, covering actual action/state contracts.
- Isolated production webpack build: exit 0, TypeScript passed, 550 static pages.
  Existing metadataBase warning remains. Explicit exit evidence avoids treating
  PowerShell's stderr warning wrapper as a failed Next build.
- All 18 UI sources match main/QA checkout. Hash snapshot:
  `.codex/adventure-qa/ui-gameplay-audit-source-hashes.json`.
  Build evidence: `ui-gameplay-audit-build.log` and `ui-gameplay-audit-build.exit.txt`.
  Private combo registry absent from all 127 production browser chunks.
- Tracked UI `git diff --check`: passed, apart from Windows newline notices.

Additional screenshots under `.codex/adventure-qa/`: `ui-grain-mobile.png`,
`ui-survey-mobile.png`, `ui-garden-mobile.png`, `ui-insect-release-mobile.png`,
`ui-fishing-lines-mobile.png`, `ui-preparation-audit-mobile.png`,
`ui-camp-audit-mobile.png`.

After release, observe first-attempt success, repeated failures, help use,
abandonment and return play before upgrading these predictions to player evidence.
No new analytics or public patch notes were introduced by this review.
