# The six-phase expansion agreed on 2026-10-10

The owner authorized completing all six phases in this session. There are nine
professions, with 25 new usable items each (225 total). Seeds accompanying crops
and recipe scrolls do not count twice toward a profession's quota. Every item
needs an obtainable source and a working use; differently colored duplicates
do not count. Existing bags, coins, forging, gems and achievements are preserved.

1. Equipment foundation: tier 2–3 workshop recipes, material sources and clues;
   compatible with forging, gems and existing powers.
2. Fishing: two lines from advanced rods, a third from the gift, independent
   catches controlled with one hand; discoveries by habitat, bait, time and weather.
3. Woodcutting and mining: notches, fall direction and grain affect material
   quality; echoes, cavities and a choice between ore and preserving crystals;
   new resources and processing.
4. Gardening and insects: rotating multi-tile plants, neighboring crosses and
   experiment knowledge; insect routes/lures and catching versus pollination
   or pest management.
5. Forest gathering and mountain water: traces, plant-part choices and ecology;
   branched streams, sluices, shared water, filtering and mixing properties.
6. Cooking and helping: preparation, heat, color, smell and sound, experimental
   ingredients and secret tastes; provisions, field tools and placeable camps
   that support travelers and friends.

Agreed buffs: read the current, sense wood grain, hear rock layers, pollen
relationship, blend with scents, read traces, preserve a water property,
adjust seasoning once, and choose a limited camp preparation benefit. Same-effect
bonuses use the strongest; different effects can coexist. Numbers remain
database-owned and do not remove the player's decisions.

Completion requires playable UI, recipes, server rules and tests for every
phase, including full inventory, insufficient ingredients, buff interactions
and duplicate rewards. Code/build completion, deployment and live SQL installation
are separate statuses; the owner runs SQL manually.

The owner wants this release discovered in play, without public patch notes.
Use first materials, environmental traces and contextual uncle hints as entry
points, then remember experiments in personal notebooks. Do not reveal full
unknown recipes or undiscovered items on member markets. Players doing ordinary
work must encounter clues without needing to guess an invisible prerequisite.
Base consignment values should reflect rarity, work and processing costs;
member prices remain voluntary and depend on demand, within existing limits.

Current gameplay status (2026-10-10): all six phases are implemented and locally
validated, including 225 usable items, UI, pixel icons, server rules and trial
behavior. The migration tests start from v179; independent v183 was reported
installed by the owner. This is local completion, not confirmation of deployment
or installation of the remaining migrations. Read the
[gameplay handoff](adventure-expansion-handoff.md) for the tested snapshot,
evidence, runtime contracts and migration order.

## Profession rewards through rank 10

The shared reward implementation plan is
[town-profession-tier10](../../../../docs/plans/town-profession-tier10/README.md).
Read its reward designs, work board and handoff before extending profession gifts.
It proposes 42 missing rewards on top of the existing 48, with separate baseline
gates for this expansion's gameplay. These rewards do not automatically count
toward the 225 usable items above. The plan is prepared; reward implementation
has not started. Coordinate shared files and migration numbers through its board.

The owner also requested secret equipment combinations, including cross-profession
charm/familiar loadouts with special gameplay effects and visual discovery cues.
Their shared design and tasks are in
[secret-combos](../../../../docs/plans/town-profession-tier10/secret-combos.md).
Keep unknown combination rules out of public catalogs, client bundles and patch
notes; reveal effects through play and personal discoveries. Five pilot bonds
(SC01/SC02/SC03/SC11/SC13) are now implemented and locally tested with generated
VFX; v194 remains pending manual installation and has not been deployed. See
[combo implementation handoff](../../../../docs/plans/town-profession-tier10/combo-implementation.md).
The remaining combos stay planned, separate from the 90 rank rewards and 225 usable-item quota.
