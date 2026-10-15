# The farm's Quality rework: build plan

The owner approved the design on 2026-10-15 ("คิดว่าเริ่มทำได้เลยครับ"). The design, with mock screens at desktop and phone,
is the artifact https://claude.ai/artifact/6jR6hbg7pHtGmfa3vQHFJC. This file is how it is built. Branch `farm-bands`
(worktree `fcnext-wt-farm`), on origin/main.

## Pieces in order (each ships alone; the owner sees the screens before each push)

| # | Piece | State |
|---|---|---|
| 1a | The clock names the eight bands (`lib/town/bands.ts`, TownClock) | done, waits for his OK |
| 1b | The trade board as a board of its own in the town centre (art: the board, the before-dawn icon) | done: `TRADE_BOARD` at 36,33 (south-east of the fountain, outside the ring members appear on), its own sprite `tradeBoard`, the uncle's tab removed; the clock's `beforeDawn` icon |
| 2.1 | Pure Quality rules (`lib/town/quality.ts`): bars, range, roll, grades, pay, helpers' shapes, partners | done |
| 2.2 | Coverage on each plant and the plant inspector (bars, sources, range, chances); harvest still ungraded | done: `quality-plant.ts`, trial hook, **v259** (trigger, dry run 1337 checks), `TownQuality.tsx` chip + inspector (shot, Codex looked); the compost act moves to 2.6 with the brush |
| 2.3 | The roll at the pick and grades on items through every path (bag, box, ground, deal, notices, stalls, pouches, the uncle's relatives) | done: TS (trade, farm pick, box, deal) + **v260** (12 functions guarded, private salt, dry run 3446 checks) + bag stars, sell line, pick note (shot, Codex looked); Codex's code check of v259–v260 pending |
| 2.4 | Cooking and stamina by grade | done on branch `farm-cook`: TS (cooking, preparation, stamina, the basket; `carriesGrade`/`usedGrade`, `FOOD_PREPS`; `quality-cook.test.ts`) + **v261** (12 functions guarded, 4 helpers closed, dry run 5163 checks) + the grade on the cook's card, the feast table, the meal in the bag, the basket and the picnic (shot, Codex looked) |
| 2.5 | The twenty helper plants (four from the uncle), their shapes, fennel; the bed overview | done (helper-items.ts, bed gift in v259, v263 catalog, placement preview, overview); **art on branch farm-art (agent)** |
| 2.6 | Partners, the pollen brush and compost (hand acts on a plant: one RPC, tired hands as other farm work) | done: partners via the bed gift; compost and brush deeds (v262) |
| 2.7 | Dig out from the inspector (tilled ground, 2 stamina, nothing back) | done: the hoe's dig-out of a living plant leaves tilled ground (v262) |
| 3 | The 27 fertilisers, two slots, the chart, holding one shows its gain | |
| 4 | The insect house, 48 new species, time icons, "out now" notebook, wild insects drawn to good gardens | **4a the house done** (`insect-house.ts`, `TownInsectHouse.tsx`, **v265** dry run 5117 checks, art `insectHouse`/`plotInsectHouse`); 4b the species on branch `farm-species` (agent, v264); wild insects drawn to good gardens not yet |

| 4 | The insect house, 48 new species, time icons, "out now" notebook, wild insects drawn to good gardens | **4b done** on branch `farm-species`: the 48 species and 4 rare finds (`lib/town/band-species.ts`), their art (10 calls, $0.19), the time icons, "out now" from the clock's band, **v264** (6 functions guarded, 3 new, dry run 7631 checks); 4a (the house) on farm-bands, v265 |
| 5 | Crossing sun / moon / mist, hybrid seeds in the players' market, the seed tray | sun/moon done (8 helper crossings, pollinator skies, v263); mist with the pre-dawn insects (4) |
| 6 | The bat merchant, 03:00–05:00 | |
| 7 | Farming-line gear and charms 1–10 (the swap charm), designed with the owner first | |

## Decisions taken while building (not the owner's words; told to him)

- **Where Quality lives:** an optional `q` on the plant's own record (the plots' JSON), like every other plant feature:
  its round's start, the last settle, the area each bar has gathered and the narrowing gathered; frozen when ripe.
  The bed's lock already covers it, and the TypeScript rules and the SQL stay one-to-one (db-vectors parity).
  Codex proposed side tables; the plant record was chosen for parity with how the farm is kept. The roll needs no
  stored seed: it is drawn inside the locked pick, and the plant's round moves on in the same statement.
- **Settle before change, in ONE place:** in the database a `BEFORE UPDATE OF plant` trigger on `public.town_plots`
  (as v186's `town_garden_spread` is an AFTER trigger there) settles the row's round with `OLD.plant` up to now and
  writes it into `NEW.plant.q`; a pick (picked grew) starts a new round. So every path (row watering, the gnome,
  insects, moon water, clouds) is caught without a hook of its own. In the browser trial the same is `syncQuality` in
  `trial.ts`'s one `write(FARM)`. Covers kept only as an end time (guard, pollenUntil, wetUntil) count from the last
  settle, which the settle-before-every-change makes exact. A helper plant's cover of its neighbours (piece 2.5) is
  derived from the helper's own sowing and death; taking a helper out settles its neighbours first (in the trigger,
  by touching their rows while the helper is still there).
- **Hand work** (agreed with Codex, 2026-10-15): half a bar; a watering 26 h (one a day keeps it), rain while it falls
  and 12 h after, a damp furrow all its life, compost once a planting to the last bearing (a new act, 1 compost, 1
  stamina), the brush once a round to ripeness (2 stamina, the design's), guard/cure 24 h, moon water 12 h, a released
  pollinator its 60–90 min. Four halves make 48 at most.
- **Launch:** `QUALITY.launch` (now the trial's 2026-10-15); set it to the moment it goes live in the release.
- **Weighting by growing, not by the clock** (mine; Codex proposed wall time): each stretch counts by the part of the
  round the plant grew in it, so faster growth counts faster and nothing counts once it is ripe; the bars freeze by
  themselves, with no need to find the ripe moment. A boost's jump falls between two settles and is left out of the
  share (`span`). A round starts at sowing, at the last pick for a re-bearing round, or at launch for a plant already
  in the ground; covers before launch do not count. (`accrue` in lib/town/quality.ts.)
- **Grade on a stack:** a `grade` field (0–3) on bag slots, lots, pots and transfers, never a suffixed item id, so
  recipes, pictures and the one oversupply counter stay as they are. Produce with no field is normal (0); things the
  uncle sells carry none and are ignored by a dish's grade. Stacks join only at the same grade; downgrading to join is
  an explicit act that never raises a grade.
- **The roll** is seeded by plot, sowing, picking and fruit through `roll()` (TS) / `town.roll` (SQL) mixed with a salt:
  empty in the trial and the bench (so they match fruit for fruit), private in `town.quality_salt` live. The same draws
  on a retry, so a full bag or a reload never re-rolls; the bag must hold every grade the pick gives (checked on the
  real draws, as they cannot change). The charm sickle's extra fruit and the garden twine's are normal.
- **Graded produce is not plain** (`plainStack`/`town.plain`/`take_plain` pass it over): stalls, the notice board and
  the jar do not take it yet (grade-aware listings are a later piece); the box, the ground and deals move it with its
  grade (`push` joins its own grade); a deal gives graded stock only by its slot; drag/sort never join graded stacks
  (a pick's `put` does). The uncle's relatives pay by `gradePays` (raw produce, kind `crop`, only).
- **The receipt** tells the plant's range (from the page's own rules) and the grades from the bag before and after:
  the server's per-fruit numbers are not carried through `tend`.
- **A line helper** reaches three cells each way (Codex's figure); a **partner** narrows by the share of the round it
  stood touching (as a rare insect does), so a partner set just before ripeness gives little.
- **Migrations:** the next free number is v259 (v257 and v258 exist untracked in the shared tree); ask the peers first.
- **What carries a grade into a dish** (piece 2.4): produce (kind `crop`; a normal unit counts as normal) and the
  sixteen preparations made of produce, directly or through another, that feed a dish (`FOOD_PREPS` in
  lib/town/quality; a test checks it against the recipes, the dry run the database's `town.carries_grade` against the
  catalog). Things of produce that feed no dish (the gourd cup, pickle, dried chilli, the cure, the guard fertiliser)
  carry none, so they stay plain for stalls and the board; compost and tools never do.
- **Counted from what left the bag:** the grade of each graded thing is the lowest grade of which fewer are left after
  cooking (`usedGrade` / `town.used_grade`), the big pot's batches included; with the bag giving the lowest first, it is
  the lowest grade the cook held of it. The odd dish is a dish and takes a grade the same way.
- **Graded dishes and preparations are not plain**, as graded produce: stalls, the notice board and the jar pass them
  over until grade-aware listings; the relatives pay them the old price (`gradePays` is for raw produce only).
- **The basket** keeps one entry a dish and grade, `[dish, n, grade]` (a pair is normal, as before); taking out and
  eating by dish give the lowest grade first (the RPCs are unchanged), and the basket tells which grade comes out first.
- **Eating:** `(stamina × (1 + restores) + scent) × company`, under the hundred; an excellent dish's own buff is at the
  second level at least (`raised` / `town.raised_to` with `max(spice, 2)`), one more on a buff one has, never past the
  fourth; the flavour stays at the first. The table's button counts the grade in the stamina it promises.
- **A fix found on the way:** the big pot's batch take calls `town.take(bag, id, numeric)`, and `town.take` takes an
  integer, so on the bench (built from the migrations) a pot cooked with the batch power fails with "function does not
  exist", as it likely does live since v177; v261 casts it to a whole number.

- **The insect house** (piece 4a, mine where the design was silent): a column of its plot (`town_plots.house`) with the
  plot's soil `"house"` while it stands, so every deed that asks for tilled, cleared or wild ground passes it over and
  no other function had to change; its own deeds (set, fill a room, lift with the hoe) are `town_house` / the trial's
  `houseDo`, beside `tend`, with the whole bed in view. One a bed, its owner's only; 1 stamina each deed. Lifting gives
  the house back and the insects in it are lost, so it is asked twice. A room keeps its end (`until`): the favourite
  plant counts when the insect goes in (the design said "when it is there"; one moment asked keeps it simple and
  exact). Rare = what the relatives pay is 20 or more (morpho, luna moth, hawk moth, orchid mantis). Favourites
  (`FAVOURITES`) are mine, each a helper of another role. Recipe: split plank 3, carving blank 1, pitch seal 1 (the
  woodworkers' goods), worth 30, tier 2; it is the farm Quality's own gear (`QUALITY_GEAR`), not one of the wood
  line's twenty-five. Its cover reaches the plants through the bed's gift (`h`), which v265's trigger re-works when a
  house changes. Soil-workers come with 4b's species.
- **The fig on 2×2** is drawn once as one tree at the middle of its plots (sized like the orchard's trees), not a
  small tree on each plot.

## Piece 4b: decisions taken while building (not the owner's words; told to him)

- **No newcomer thins an old one, and how:** the old draws are untouched to the last roll (the dry run compares the 94
  old haunts' draws before and after v264 at every band). *Insects* keep to 31 haunts of their own kinds (flowers,
  leaves, logs, bark, litter, sand, fence posts) laid after the old ones; such a haunt has nothing so often beside its
  newcomers (`QUIET.none` 100), nothing comes back from or to it, and the farm's pests do not count them. *Fish:* every
  cast catches one thing, so a new fish must take some old outcome's place; it takes only **what is no fish** (hyacinth,
  boot, driftwood, bottle; never a pearl or a chest), each its rarity's share of a cast (C 6%, U 2.5%, R 0.8%, V 0.3%,
  half outside its peak band), all of them never more than half of what is no fish, and only after every gift has
  shaped the odds. **So where a newcomer fits, junk comes up less often (at most half as often); the hyacinth there
  feeds compost, rope and baskets: the owner's to weigh** (the alternative, thinning the old fish a few per cent in the
  newcomer's band and bait, breaks the rule). In the town's crowded water this makes the town's newcomers rarer than
  their letter (a C small fish there is about 1% of dough casts). *Rare finds:* the forest's two only in a turn of their
  place that had nothing; the dew a sample of its own; the guano besides what a rock left, never instead.
- **Rarities (mine, measured in band-species.test.ts):** insects C about 3.6 to 5.4 an hour on their map in their window,
  U 1.6 to 2.4, R 0.55 to 0.8 (the old commons are 20 to 30); fish as above; the mist mushroom about 0.5 an hour in the
  woods 03-05 (V), the queen's pollen about 1.3 an hour at the edge 23-03 (R); the dew one a bank per 15-minute turn per
  member 05-07; guano a 30% chance per plain cave rock broken 18-19.
- **Places:** "the town pond" is the town's river (the only water in town); "mountain headwater/pool" are the headwater and
  pool habitats (on the forest's stream and the mountain). The antlion and the tiger beetle share the stream's sand.
  "Small fish" as a bait is a minnow or a loach (and the newcomer small fish go on a hook as a minnow does).
- **Uses by family now:** pollinators join `INSECT_GARDEN.pollinators` and `POLLINATOR_SKY` by their time icon (the two
  dawn bees are "mist", which crosses as the day's until piece 5); hunters join `predators`; small fish are bait.
  Recorded for later (`FAMILIES.later`): the house's soil room (`DECOMPOSERS`, piece 4a), glow powder (its picture is
  drawn, the item comes with its recipe), beetle frass, fish emulsion, bone meal, scale powder and the "any small fish
  ×3" recipes all need **recipes that take any of a family**, one mechanic for piece 3; medium fish's "food" needs the
  same. Points: a newcomer of two stamina scores a way's 3 (the line's ladder of 1, 3, 8).
- **Found, for the dark shapes:** an insect once the village has caught one (the village's book), a fish once I have (my
  longest of it). The book shows only the newcomers (the old species' windows and baits stay unsaid, as the owner hid
  the odds of a bait).
- **The uncle's orders never ask for a newcomer** (they are not in the weighed fish), and the newcomers are not in the
  stardust bait, the school bell or the dragon's pools.
- **Pre-existing:** `lib/town/preview.test.ts` "joins the town and the mountain by a gate each" fails on farm-bands too.

## Checks a piece gets

New rules: unit tests and TypeScript/SQL parity vectors; SQL: a PGlite dry run from the snapshot with the breaks
that matter (a stranger, another's bed, the same call twice, retries at a full bag); Codex reads the SQL once; every
screen shot at 1280×860, 384×730 and 360×640, Codex looks, the owner sees them before a push.

## Order from here (2026-10-15 evening)

The fertilisers' inputs (decomposer and glowing insects, ornate fish, mist mushroom, queen pollen, dew, bat guano) come
of piece 4's new species and finds, so: 4b the 48 species and the rare finds (with their art), then 4a the insect
house, then 3 the fertilisers, then 6 the bat merchant, 1b the board, and the mist crossings. The owner said "ทำต่อได้เลย
จนจบทั้งหมด"; piece 7 (rank gear) waits for his design. Migrations so far: v259 (Quality round, bed gift), v260
(grades), v261 (cooking by grade, branch farm-cook merged; also mends the big pot's batches, broken live since v177),
v262 (compost, brush, dig-out), v263 (helpers and crossings), v265 (the insect house; v264 is 4b's species); all
dry-run; run in order with the matching code.

