# The farm's Quality rework: build plan

The owner approved the design on 2026-10-15 ("คิดว่าเริ่มทำได้เลยครับ"). The design, with mock screens at desktop and phone,
is the artifact https://claude.ai/artifact/6jR6hbg7pHtGmfa3vQHFJC. This file is how it is built. Branch `farm-bands`
(worktree `fcnext-wt-farm`), on origin/main.

## Pieces in order (each ships alone; the owner sees the screens before each push)

| # | Piece | State |
|---|---|---|
| 1a | The clock names the eight bands (`lib/town/bands.ts`, TownClock) | done, waits for his OK |
| 1b | The trade board as a board of its own in the town centre (art: the board, the before-dawn icon) | to do |
| 2.1 | Pure Quality rules (`lib/town/quality.ts`): bars, range, roll, grades, pay, helpers' shapes, partners | done |
| 2.2 | Coverage on each plant and the plant inspector (bars, sources, range, chances); harvest still ungraded | next |
| 2.3 | The roll at the pick and grades on items through every path (bag, box, ground, deal, notices, stalls, pouches, the uncle's relatives) | |
| 2.4 | Cooking and stamina by grade | |
| 2.5 | The twenty helper plants (four from the uncle), their shapes, fennel; the bed overview | |
| 2.6 | Partners and the pollen brush (narrowing) | |
| 2.7 | Dig out from the inspector (tilled ground, 2 stamina, nothing back) | |
| 3 | The 27 fertilisers, two slots, the chart, holding one shows its gain | |
| 4 | The insect house, 48 new species, time icons, "out now" notebook, wild insects drawn to good gardens | |
| 5 | Crossing sun / moon / mist, hybrid seeds in the players' market, the seed tray | |
| 6 | The bat merchant, 03:00–05:00 | |
| 7 | Farming-line gear and charms 1–10 (the swap charm), designed with the owner first | |

## Decisions taken while building (not the owner's words; told to him)

- **Where Quality lives:** an optional `q` on the plant's own record (the plots' JSON), like every other plant feature:
  its round's start, the last settle, the area each bar has gathered and the narrowing gathered; frozen when ripe.
  The bed's lock already covers it, and the TypeScript rules and the SQL stay one-to-one (db-vectors parity).
  Codex proposed side tables; the plant record was chosen for parity with how the farm is kept. The roll needs no
  stored seed: it is drawn inside the locked pick, and the plant's round moves on in the same statement.
- **Settle before change:** any act that changes a source (a plant set or taken out in the bed, watering, a cover put
  on) first settles every plant it touches up to now, then changes; time-limited covers are intervals and need no cron.
- **Weighting by growing, not by the clock** (mine; Codex proposed wall time): each stretch counts by the part of the
  round the plant grew in it, so faster growth counts faster and nothing counts once it is ripe; the bars freeze by
  themselves, with no need to find the ripe moment. A boost's jump falls between two settles and is left out of the
  share (`span`). A round starts at sowing, at the last pick for a re-bearing round, or at launch for a plant already
  in the ground; covers before launch do not count. (`accrue` in lib/town/quality.ts.)
- **Grade on a stack:** a `grade` field (0–3) on bag slots, lots, pots and transfers, never a suffixed item id, so
  recipes, pictures and the one oversupply counter stay as they are. Produce with no field is normal (0); things the
  uncle sells carry none and are ignored by a dish's grade. Stacks join only at the same grade; downgrading to join is
  an explicit act that never raises a grade.
- **Room before the roll:** a pick checks room for every grade its range can give before anything is drawn.
- **A line helper** reaches three cells each way (Codex's figure); a **partner** narrows by the share of the round it
  stood touching (as a rare insect does), so a partner set just before ripeness gives little.
- **Migrations:** the next free number is v259 (v257 and v258 exist untracked in the shared tree); ask the peers first.

## Checks a piece gets

New rules: unit tests and TypeScript/SQL parity vectors; SQL: a PGlite dry run from the snapshot with the breaks
that matter (a stranger, another's bed, the same call twice, retries at a full bag); Codex reads the SQL once; every
screen shot at 1280×860, 384×730 and 360×640, Codex looks, the owner sees them before a push.
