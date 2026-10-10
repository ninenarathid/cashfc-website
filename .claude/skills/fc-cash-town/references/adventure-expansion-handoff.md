# Six gameplay phases: implementation handoff

Updated 2026-10-10, Asia/Bangkok. Status: **deployed; SQL installation reported complete by owner**.
Vercel completed commit `4a529987` at 2026-10-10 09:57:47 UTC. The owner subsequently
reported running all twelve pending SQL files. Post-install feature markers and
authenticated live gameplay still need verification. This handoff is internal,
not public patch notes.

## Completed scope

| Phase | Working gameplay |
|---|---|
| 1 | Workshop, equipment/material recipes, inventory checks and contextual clues |
| 2 | Independent fishing lines, regional pools/current/bait, removable rod hook |
| 3 | Reading wood grain, notches/fall/parts; rock echoes, ore/crystal choices |
| 4 | Rotated multi-cell plants/crossing; insect routes, catches and garden releases |
| 5 | Forest traces/parts/ecology; shared channels, sampling/filtering/mixing and water properties |
| 6 | Preparation experiments with heat/color/aroma/sound; provisions and shared field camps |

The nine profession item registries contain **25 new usable core items each,
225 total**. Accompanying seeds and recipe scrolls are additional, not counted
twice. `lib/town/adventure-expansion.test.ts` verifies counts, unique IDs,
obtainable sources, uses and atlas coverage. Old inventories and coins are
preserved. Generated icons are registered in `lib/town/icon-atlas.json` with
the final `/town/icons-2c180d738d5c.png` atlas.

Players encounter contextual entry points and remember experiments in personal
notebooks. Unknown output names stay hidden in preparation choices. Same-effect
bonuses use the strongest eligible effect; different effects can coexist.

## Validation and snapshot

The shared workspace is dirty; Git HEAD at handoff is `725e3b5c` (`v195 has run`).
That concurrent commit is not an implementation commit for this expansion.
The tested SQL and key runtime files have SHA-256 hashes in
[source-hashes.json](../../../../.codex/adventure-qa/source-hashes.json).
All 15 hashes matched again after the final build.

| Check | Result |
|---|---|
| `npx.cmd vitest run lib/town --maxWorkers=3` | 147 files, 1,786 tests passed |
| Additional `fieldwork-trial.test.ts` | 2 tests passed: reload/replay and shared camp accounting |
| v196 database parity/privilege checks | 196 passed, 0 failed |
| v197 database parity/privilege checks | 785 passed, 0 failed |
| Production `npm.cmd run build -- --webpack` | Successful compilation, TypeScript and 550 generated pages |
| Private combo boundary in final production browser chunks | Registry/rule signatures absent from 128 chunks |

The build used the isolated `E:/NinenineProject/fcnext-wt-adventure` checkout
and `.next-adventure-build`, with QA-only distDir configuration. Webpack was
used because the isolated checkout's node_modules junction is outside
Turbopack's inferred root. The main development server was left running.
This does not certify a default Turbopack production build.

Evidence is in [`.codex/adventure-qa`](../../../../.codex/adventure-qa/):
`town-tests.log`, `v196-tests.log`, `v197-tests.log`, `build-webpack.log`,
`production-boundary.log` and browser screenshots. The additional two trial
tests were run separately after the full suite; 1,788 is the combined count,
not a single full-suite run.

Browser checks covered mobile 390×844 and desktop 1280×800: preparation failure
produced compost, success produced two diced roots and a notebook entry;
camp placement consumed supplies, then a benefit consumed one supply and one
shared charge; forest root digging produced two flower bulbs and discovery;
the mountain channel map rendered on mobile. These are local trial checks,
not authenticated production RPC verification.

## Manual installation

Deploy the matching site and follow the SQL dependencies. The gameplay chain
after v179 is:

`v180 → v181 → v182 → v184 → v185 → v186 → v187 → v188 → v196 → v197`

v183 is the independent removable-hook migration; the owner already reported
running it. No remaining installation is inferred just from files being present.
v194 is the separate secret-combo pilot migration, with its own dependencies
and guarded definitions. v196 and v197 do not replace its wrapped action
functions. v195 is the separate read-performance patch; its SQL was removed
by the concurrent `v195 has run` commit. Do not restore or rerun it as part
of this handoff.

Install only migrations still missing from the target database. Do not rerun
older migrations blindly after later guarded function changes. A definition
guard failure requires comparing current database text and rebuilding against
that definition, not removing the guard. Keep the transaction and the final
privilege/catalog probes from each SQL file intact.

## Baselines for the separate profession-reward project

The reward owner can use this evidence to review the gates in
[work-board.md](../../../../docs/plans/town-profession-tier10/work-board.md).
This handoff does not change another session's task statuses or certify the
42 planned additional rewards or the remaining secret combinations.

* **B-COMMON / B-FISH / B-WOOD / B-MINE / B-GARDEN / B-INSECTS:** workshop,
  rod/line/hook, wood-grain, geology, plant footprint/crossing and insect
  release runtime modules are present with corresponding v180–v187 rules.
  Existing forged tools/gems remain part of the common use paths.
* **B-FOREST:** `foraging-parts.ts`, `TownForageParts.tsx`, v188. Shared part
  availability, trace discovery and extraction decisions are authoritative;
  taking a root requires the digging game to succeed.
* **B-WATER:** `stream-work.ts`, `TownStream.tsx`, v196. Eight banks, shared
  channel choices and 15-minute resource/route cooldowns. Pouring credits actual
  carried water; `sealedFlask` preserves its property. This is not a reward
  that teleports or creates unlimited water.
* **B-KITCHEN:** `preparation.ts`, `TownFieldwork.tsx`, v197. UUID-bound run,
  original tile, minimum two seconds and three-minute expiry; begin checks
  board, cookware and inputs. Finish validates three choices and consumes inputs
  atomically: correct result ×2 or compost ×1. Full inventory preserves the
  purse/run. One correction uses the strongest spoon/seasoning allowance,
  not their sum. Success records `prepBook`/`made`.
* **B-HELP:** `camps.ts`, `TownFieldwork.tsx`, v197. Five clear field sites,
  explicit placement and benefit choice. Placement consumes canvas, tinder and
  three rations; a provision chest uses five rations for five shared charges.
  Camps last 30 minutes, or 45 with an awning. A benefit consumes one owned
  provision, one shared charge and one stamina; three benefits per person/day
  across camps. Stronger existing buffs are preserved. Helping points go to
  the owner when another player uses the camp. Checkpoint restoration, revive
  and the planned profession reward flags are not implemented by this camp.

Preparation RPCs require membership; the forest kitchen and field camps also
require mountain access. Purse locks serialize inventory changes. Private RLS
tables keep runs, camp state and UUID receipts; receipts reject repeated requests
and are bounded/cleaned up. Trial supports the same action results and reload
protection; its local receipt cache is bounded but does not implement the
database's seven-day receipt expiry.

## Remaining release work

Presentation was subsequently polished and locally verified; see
[adventure-ui-review.md](adventure-ui-review.md) for scope, screenshots and current
UI source hashes. The bag's recipe and village insect books now open as bound
readers with known-entry categories and details. No SQL was changed for that UI pass.

The matching site deployment is complete and the owner reported completing SQL
installation. A post-install run of `.codex/adventure-qa/deploy-readiness.sql`
should now return true for every row. Authenticated live smoke checks remain;
the owner's installation report does not itself verify live gameplay.

## Regional fish and food extension — v198

The owner's follow-up asks for twenty exclusive species per regional water,
with food and useful destinations for the added fish. `regional-fish.ts` adds
18 creek, 16 headwater and 17 pool species: combined with the existing exclusives,
each habitat has twenty. Existing town fish and shared regional fish are retained.
The regional registry now has 60 exclusive and three shared species. These are
habitat counts, not twenty fish exclusive to each whole forest/mountain map.

Six new cooked meals per habitat use every one of the 51 new fish as a real
ingredient. Each meal has a companion recipe scroll, a normal kitchen recipe,
profession points, stamina restoration and an existing gameplay buff. Common
recipes give three helpings; later recipes give four or five. The bound recipe
notebook supplies cookware categories, ingredients, helpings and buff descriptions
after discovery, with its normal final-ingredient secret until learned by play.
Scrolls enter the existing bottle/chest discovery and player trade paths.

Fish base consignment prices rise strictly by rarity (10–14, 20–24, 38–42,
70–74); player trade prices remain negotiated. Added recipe scrolls pay 22 or
28, preserving the existing incentive to open a found chest rather than sell it
closed. Meals can be eaten, shared from pots, saved through the existing food
systems or exchanged as existing game rules allow. No new unlimited meal/buff
capacity is introduced.

The original nine-by-25 quota remains 225 usable additions. This extension adds
69 usable entries (51 fish and 18 dishes), making 294 usable additions in total;
the 18 companion scrolls are recorded separately. Native 32px pixel sprites cover
all added fish, dishes and their full-pot variants (87 sprites). The atlas builder
preserves existing tiles; evidence is `.codex/adventure-qa/regional-fish-sprites.png`.

`v198_twenty_fish_for_each_water.sql` is an additive, transactional catalog patch,
to install after v197 and the matching site deployment. It preserves existing
function definitions, purse inventories and coins, and supports rerunning without
duplicating list entries. PGlite replay through the full pending migration chain
passes 485 checks, including every added fish/meal/scroll, server/TypeScript catch
parity, actual cooking, full-bag refusal, town-pool preservation and repeat install.
The dedicated eight-file test run passed 114 tests and TypeScript validation passed.
After the scroll-value correction, the final project-wide run passed all 162 files
and 2,017 tests (`--maxWorkers=2 --testTimeout=30000`). The final production build
exited 0 and generated 550 pages; the existing metadataBase warning remains.
Private combo rules are absent from all 101 production browser chunks. Evidence
is under `.codex/adventure-qa/regional-full-tests.log`, `regional-build.log` and
`regional-build.exit.txt`.

The v198 site code is deployed with commit `4a529987`; the owner reported applying
v198 with the rest of the pending SQL chain. Keep this handoff internal; no public
patch note or undiscovered recipe list is published.

## Release clarification: already-applied baseline

The owner clarified that earlier messages explicitly saying a SQL file was run
remain valid, and that the unapplied work likely means the new expansion in this
session. Use `.codex/adventure-qa/deploy-readiness.sql` to inspect the target without
changing it. These are feature markers, not an authoritative migration ledger.
Expected prior state: v176-v179, v183 and v195 present. Pending sequence:
v180, v181, v182, v184, v185, v186, v187, v188, v194, v196, v197, v198.
`release198.test.mjs` replays exactly this sequence after the already-applied v195
copy and verifies starting/final markers: 51 checks passed. The shared v195 readers
remain intact; no v195 rerun is required by these twelve files. This is local
replay evidence; actual installation state still comes from the owner's database.

## Release installed: owner confirmation

The pre-install query screenshot confirmed v176-v179, v183 and v195 present, with
all twelve expansion rows absent. After Vercel reported deployment success, the
owner said "รันครบหมดแล้ว" for the instructed sequence:
v180, v181, v182, v184, v185, v186, v187, v188, v194, v196, v197, v198.
Treat that sequence as applied according to the owner; do not suggest reinstalling
it. Keep the SQL files as release references. The follow-up read-only marker
query should return eighteen true rows, but its post-install result has not yet
been received. Live authenticated gameplay has not been exercised by this agent
after installation.
