# Tier 10 implementation — 2026-10-11

เอกสารนี้เป็นประวัติราย migration สถานะปัจจุบันครบ **42/42 รางวัลใหม่, 90 รางวัลรวม, 18/18 คอมโบ และคู่มือ 90 ชิ้น** อ่าน [handoff ฉบับจบ](final-2026-10-11.md) ก่อนทำต่อ ตัวเลข checkpoint ด้านล่างเป็นสถานะในเวลานั้น ไม่ใช่งานค้างปัจจุบัน

The user has now requested resuming and completing the whole plan. The pause is revoked. The checkpoint below records the state at resumption; current progress is appended as work is verified.

- Current verified local completion: 21/42 missing profession rewards and 7/18 combinations. Remaining: 21 rewards, 11 combinations, balance/integration and release checks.
- v207–v214 and v216–v219 are authored locally; this session has not installed live SQL or deployed the site. v215 installation is recorded by the separate warehouse session.
- The forest10 prototype is now complete as v217, felling08 as v218, mining10 as v219; details below supersede the old pause checkpoint.
- Full-suite result through v214 remains 164 files / 1,935 tests. Later changes have targeted tests; a final full suite/build remains required.

Owner: tier10 implementation 2026-10-11 (this session). User authorized continuing until the whole plan is complete: 42 missing profession rewards, the remaining 13 secret combinations, old-reward compatibility/balance and integration validation. Work continues across compact; do not treat this handoff as permission to stop after the first batch.

## Current work

- FOUNDATION-01 / BAL-01 / FIRST-MINE / FIRST-WOOD: active.
- Reserve v207 for foundation/compatibility and first playable reward actions; higher numbers must be checked again before reserving subsequent migrations.
- Baseline includes gameplay through v198, v203 passive equipment and v205 elemental training; preserve independent v195/v200 readers, v199 ground and v201 lamps. Casino v204/v206 is another feature and not a reward dependency.
- Runtime IDs for the first pair: mining04 = thingOreCompass; felling04 = thingForesterKnife. Do not declare later rewards before their real use paths are implemented.

## Ownership

New modules for reward protocol/state/actions/tests and related migration builders belong to this task. Integration edits to gifts.ts, pouches.ts, keeper.ts, keeper-trial.ts, trial.ts, TownMe/TownMine/TownTrees are narrow edits only. Preserve all existing dirty edits (casino, elemental training, rendering and other gameplay) and do not stage/reset/clean them.

## Completion tracking

Implemented additional rewards: 21/42 (mining04–10; felling04/05/06/08/10; forest07–10; fishing07; well07–10). Implemented combinations: 7/18 (SC13, SC01, SC02, SC03, SC11, SC15, SC14). Remaining rewards: felling07/09, fishing08–10, kitchen07–10, helpers07–10, insects07–10, farming07–10. Local migrations through v226 are authored and verified; live install/site deployment is not implied. The full objective remains active.

## Verified implementations

- v207: thingOreCompass / thingForesterKnife. Coarse scan never reports stairs/daily crystal, 5/day; one post-felling extraction, 5/day, actual stamina, no repeated parts. Persistent per-member receipts store replies rather than purses. Expanded old pouch whitelists preserve their 5/3 capacities. Preserves v203 passive implements, v205 elemental training and v195/v200 readers.
- v208: thingPocketSawmill / famDwarf. Processes the 13 existing wood/mineral Make recipes only after actual discovery (`made`), with original tools, actual ingredients, original 4 stamina and existing output. 3 batches/day; the dwarf must follow and the player must be underground. No free crafting or production multiplier.
- v209: thingForestRing / thingStarBottle. Three distinct ordinary forest traces with memory, order and timing games; finite loot, private map marker and persistent checkpoints. Forest: 2 starts/day, one forestLichen/mushroomSpores/wildMedicRoot per stage. Stars: 1 start/day, one starShard at completion. Each completed attempt costs 2 stamina, including a valid miss; full bags do not advance or pay. PostgreSQL parity/replay: 201 checks. Browser played all six stages via the visible clues and timing controls and verified the four bounded loot stacks and one start per gift.
- v210: thingTreeHive / thingCrystalRepair / charmGemColor. Real physical ingredients, three-stamina games, quota charged at completed attempt (including a miss); missed games keep ingredients. Hive chooses honey OR wax from five fragrant petals, 1 attempt/day. Repair uses ten same-colour chips, two quartzCore and rootTwine for one wholeGeode, 3 attempts/day. Colour uses two different loose plain gems and sparkPowder for one known base gem, 3 attempts/day, equipped charm, at the smith. No socket/grade modification. PostgreSQL: 1,390 checks across 458 recipes; all three successful UI paths verified on mobile.
- v211: private SC15. A matching loadout at both start and failure offers one correction of a colour sequence in the same batch. Original inputs/output/three daily batch limit remain; one correction/day, one correction per run, no retrospective equipping or duplicate discovery. PostgreSQL: 42 checks. Browser deliberately played a wrong sequence, saw the bond effect/discovery, retained ingredients, then played the visible correct sequence and paid one original batch for one gem.
- v212: fishing07 / thingSchoolBell. Two calls/day; three eligible normal casts per thirty-minute call. Previously caught nonlegendary target only; triple draw weight within the unchanged eligible pool. Pair uses one charge; stardust preserves charges. PostgreSQL: 23 checks; mobile UI activated a catfish call and a two-line cast spent one charge and two worms.
- v213: mining07 / thingPocketLift. Exact worked-floor anchor, six single legs/day, current-day safe arrival, bounded client acknowledgement; original lifts and shared readers unchanged. PostgreSQL: 64 checks. Browser performed a real mining payout on floor 3, anchored it with the UI, returned to the mouth, and rode back to its safe arrival; exactly two legs spent and zero missing icons. Core tests and affected mining vectors passed (5 tests in two files).
- v214: mining08 / charmBranchVein. Charm worn when opening and paying the real main vein; correct echo and positive main hits, same-day saved work site. Three branches/day, optional three-stamina timing game gives four ore fragments OR three actual gem fragments reached by that main go, never both and never multiplied by pkTwin. One finite branch source; valid miss closes it, full bags preserve it, cancel cannot reroll the seed. PostgreSQL: 111 checks; browser played the main echo/visible ore path, then the timing branch and received four copper fragments with one quota. Affected town tests: 41 plus the 15 resource/combination cases passed.
- Local PostgreSQL tests: v207 30 checks, v208 67 checks (rerun, parity, grants, ownership, preservation and retry).
- Full town suite passed: 160 files / 1,921 tests before fishing07 and mining07 additions. Fishing changes then passed 136 affected tests in three files. Run the complete suite again after subsequent additions.
- TypeScript check passed after integration. Browser on local development trial: successful compass on mobile; extraction resumed with the same run after reload; actual timing-game inputs produced pineBark ×1; sawmill produced rootTwine ×2; active dwarf underground produced stoneTile ×2. Each charged its own single quota and missing icon count was zero. Evidence under `.codex/tier10/`.
- All twelve reward pixel icons are registered without removing existing atlas cells. Production build and private-registry bundle review are still release gates, not claimed complete.

## Next work (still authorized)

Continue all remaining lines and combinations; do not stop at this checkpoint. Reuse the verified trace/checkpoint and resource-game lifecycle where appropriate, without reducing different profession rewards to reskins. Next focus: fishing target/cast contracts and actual exploration/transport contracts. Each new migration uses the highest free number after the latest authored file (currently v214), checked again before creation. Keep v207/208/209/210 gift selections explicit so rebuilding does not install future items early. Shared casino files remain outside this task.

## Prototype decisions now concrete

- Standalone gems currently have one base grade; elemental training belongs to a socketed tool. Gem colour conversion therefore accepts plain loose base gems only and cannot consume metadata-bearing stacks or change a tool's training. A target colour must be known from mineral fragments or a held loose gem.
- Crystal repair uses actual mined chips with quartz/twine to create an intact geological specimen. It never dismantles an intact gem or gives both geode and chip rewards from one action. The smith location keeps this separate from the dwarf's field processing.
- Resource games charge an attempt on a valid result rather than reserving inputs while a player is disconnected. Full/missing inputs do not pay; cancellation does not move ingredients. A miss costs three stamina and one attempt but retains expensive ingredients. SC15 offers one correction before that result is finalized, within the same bounded batch.
- Private trails charge their start quota when started, retain only three checkpoints, and cannot repeat earlier loot. Pausing a route does not refund its start or require new daily maintenance.

## Evidence and next-session commands

Local SQL evidence: `.codex/tier10/v207-validation.json` through `v214-validation.json`. SQL scripts are under `.claude/skills/fc-cash-town/scripts/db/`; use `build-vNNN.mjs` before the corresponding `vNNN.test.mjs` only when authoring changed. PGlite uses the local bench and never contacts the live project.

Browser fixture scripts: `.codex/tier10/browser-actions.js`, `browser-trails.js`, `browser-resources.js`, `browser-resource-combo.js`, `browser-school.js`, `browser-lift.js`, `browser-branch.js`. They guard the development Trial keeper and touch only a local named room. Use the existing dev server on port 4320, isolated browser session `tier10-20261011`; after reload wait for `window.__townKeeper`. A long combined browser eval can time out at the CLI even if its JavaScript finishes: split cases or store evidence on the window and inspect it afterward.

The full-suite count above is a verified earlier checkpoint, not a final gate for later changes. TypeScript passed through fishing07; the check through mining08 passed. Production build and release remain pending. Do not deploy or run live SQL from a local test result.

## Active next design: mining10

Prepare a private three-room expedition rather than changing shared cave spawns. One start/day across every route. A room locks its selected ore/crystal/safe route before play and persists a checkpoint; completed rooms pay at most once. Use actual held pick, an exact worked current underground floor, and known mineral families. Budget the entire run, preserve partial loot on failure, and reject any new run while one is active. Concrete output caps and failure/bonus rules are still being chosen; no runtime ID or migration has been installed for this design yet.

Full suite after v214 is running: exec session 30122, log `.codex/tier10/town-tests-after-v214.log`. Wait/read the outcome before claiming a final count. The isolated browser has the completed branch result open; new mining scripts should close it or reload first. Browser command input must use `Get-Content -Encoding utf8` and `$OutputEncoding` UTF-8. PowerShell defaults corrupted the first branch catalog Thai text, which was corrected and read back; use apply_patch or explicit UTF-8 for all new Thai source/docs. No changes were made to another chat?s element-skins fix (it changed concurrently and now passes TypeScript).


## Verified continuation after resuming

- v217 forest10 / famForestGuardian: real leaf then root games; perfect raw reading gathers both for both original costs, one world share and one quota. A raw fractional miss gives only ordinary leaves without guardian use; root recovery remains original. 37 SQL checks and 10 affected TS cases passed. Actual flower UI gave fragrantPetal ×2 / flowerBulb ×1, used one quota and two stamina; mobile/desktop evidence under .codex/tier10/guardian-*.png.
- v218 felling08 / charmListening: choose a second bark/sap/seed before chopping, manually correct all notches/lean and zero misses; first ordinary trunk only, five/day. Shares two-part budget with extraction knife; full bonus bag rejects whole deed atomically. 99 SQL checks and 46 affected TS cases passed. Visible notch/chop browser game produced pineBark ×1 and closed extraction; .codex/tier10/browser-listener.js and listener-desktop.png.
- v219 mining10 / thingCoreSpade: three private rooms, one expedition/day on an exact worked floor while holding a pick. Each room locks ore ×2 / 3 stamina, known crystal fragment ×1 / 4 stamina, or stone ×2 / 2 stamina. Timing/order/memory games; route, mineral and seed survive misses, disconnect and day changes. No shared cave writes, twins, full gems or repeated payouts. 290 SQL checks, 4 TS cases and TypeScript passed. Browser played visible timing and memory controls for all three choices; one start yielded copper ×2, ruby chip ×1, stone ×2. Native atlas had zero missing icons; core-desktop.png/core-mobile.png inspected.
- Latest local migration v219. Use existing dev port 3000 (another chat owns that server), isolated browser tier10-20261011. Local scripts reward-db.mjs include the actual installed warehouse v215 and gem v216 before deriving new wrappers.
- Next: felling05 directional domino and SC14, then remaining felling, fishing, kitchen, well, helpers, insects and farming. Objective is still active; no pause or permission to stop after a batch.

- v220 felling05 / charmDomino: actual first eligible trunks on one chosen ray, maximum three including Echo. One hardest-trunk manual game, each trunk's original stamina cost, three chains/day. Full and failed chains pay no quota. 293 SQL checks and affected TS cases passed; actual three-trunk browser payout used one quota.
- v221 SC14: private bat/domino registry; native pulses travel up actual trunks, numbered prospective targets and blockers. Preview reserves no trees and pays no production quota. 219 SQL checks, current TypeScript, and complete town suite 172 files / 1,977 tests passed. Native desktop/mobile screenshots inspected under .codex/tier10/domino-sonar-*.png.
- Current checkpoint: 16/42 rewards, 7/18 combinations. 26 rewards and 11 combinations remain. Latest authored migration v221; live installation/deployment is not implied. Continue water07 with an actual owned receiver container and conserved water.

- v222 well07 / famWaterRelay: place one actual empty single container for one stamina; send held water up to forty tiles on the same town/farm/forest map, maximum six bucketfuls, two stamina and one of three daily sends. Real physical receiver must be retrieved beside its point with an empty bag slot; retrieval remains possible with the familiar removed. A filled receiver cannot accept another send. Preserve source nature and contributor UUIDs as a snapshot and restore the ordinary water ledger upon retrieval; no XP for moving alone. Duplicate filled item types are rejected to keep the original item-keyed water provenance unambiguous. 98 SQL checks, 2 TS tests, TypeScript passed. Browser UI placed a real cart, sent four from a yoke, then retrieved exactly four with one quota and zero missing icons; native receiver and water particles inspected on mobile/desktop.
- Latest authored migration v222. Current continuation 17/42 rewards, 7/18 combinations; 25 rewards and 11 combinations remain. Objective active. No live install or deployment performed.

- v223 well08 / thingRiverHorn: three manual water valves, correctly connected branches only. Snapshot root identity (owner/sowing/crop/bearing), revalidate thirsty plants and held water at completion, maximum 48 roots using the original eight-roots-per-bucket volume. One stamina/game + one/bucket; unfinished/cancelled games move no water. A real watering activates a shared ninety-minute bed cooldown in at most twenty-four private rows; ordinary watering remains available. Matches the original farm purse/bed lock order and original heat/nature/credit triggers. Receipts omit old plot snapshots; the client refreshes current plots so retry cannot overwrite a new crop. 97 SQL checks across all 27 valve choices and varied seeds, 2 meaningful TS tests, TypeScript passed. Browser turned the visible valves, watered 24 real roots with three of six bucketfuls and four stamina; mobile/desktop checked, zero missing icons.
- Current continuation: 18/42 rewards, 7/18 combinations, latest authored migration v223. Continue well09 shared finite spring and well10 local consenting rain, then remaining lines. Objective active, no live SQL/deploy.

- v224: well09 thingSpringStone. Five fixed rest sites, one awakening/day, three stamina, sixty minutes, twelve shared ordinary bucketfuls. Five bounded private rows and authenticated nearby reads. Held empty single containers use ordinary draw cost; clears old water nature/contributor provenance. 132 local SQL checks and two TypeScript tests passed, including two authenticated visitors sharing 12 total and idempotent replay. Native desktop/mobile gameplay checked; no missing icons. Latest authored migration v224; deployment/installation remains pending. Current local progress 19/42 rewards and 7/18 combos; 23 rewards and 11 combos remain.

- v225: well10 thingCloudJar. One finished rhythm/day, real special bucketful and six stamina even on a miss. At most three nearby consenting beds, owner consent revocable and rechecked at completion under ordered bed locks. Existing root identities only, one cloud/root/day, ten-minute local wet interval. Elapsed rain growth excludes overlap with natural rain or permanently moist soil. Catalyst nature gives one effect/event; world weather and ordinary rain triggers/XP stay untouched. 115 local SQL checks, two meaningful TS tests, ordinary farm regression, TSC and actual desktop/mobile rhythm gameplay passed. One actual bucketful consumed and 24 actual roots affected in the browser. Bounded private consent table (24 beds). Local progress 20/42, 7/18 combos.
- v226: felling10 thingTinyForest. Spend three plain actual pine seeds for one three-tree nursery/day; each known kind may be chosen more than once, making the reward reachable before higher-tier species exist. Known kinds come from actual felling; owning pine seeds teaches pine. Three care games and locked part choices, two stamina/attempt, up to six small parts total (elder wood capped at one cedar sliver/tree). No logs/timber, world tree writes, forged multipliers, respawn, or XP. Full bags preserve the exact seed/challenge/choice; checkpoints survive days; cancellation refunds nothing. 573 local SQL parity/privacy/receipt checks, two TS lifecycle tests, relevant regression tests and TSC passed. Played memory, order and timing in the actual browser: three seeds consumed; two bark, two pitch and two seeds paid once; desktop/mobile UI checked, no missing icons. Current progress 21/42 and 7/18 combos. Latest authored migration v226. Continue all remaining work; no live SQL or deployment performed.


### v227 — living-tree pact and shared part supply (2026-10-11, local only)

- felling09 `charmTreePact`: choose bark/sap/seed/root beside a grown ordinary tree; remember the three-step care sequence. Three attempts/day; each finished attempt consumes one real held bucketful, one compost and two stamina, including misses. A perfect attempt receives two small parts and leaves the tree standing.
- A ten-minute supply per actual tree/part now applies across grain harvest, heartwood listener, parting knife and care. Ordinary logs/timber and felling stay available; spent parts cannot be selected in grain reading. This remains valid after quickening-root regrowth and does not reserve the whole tree while caring.
- All mutations use the original grove-world-before-purse locking order. Competing collection/another feller, stale or occupied trees, full bags and UUID retries cannot lose inputs or pay twice. Remaining water keeps its nature/contributor ledger; an emptied bucket clears that ledger.
- Local PGlite: 72 parity, authenticated receipt, supplies and ordinary/listener interactions; rerun guarded migration twice. Vitest: 54 relevant tests pass; TypeScript passes. Full town suite immediately before this batch: 177 files / 1,987 tests pass.
- Desktop and 390px mobile actual gameplay reviewed: `.codex/tier10/pact-desktop.png`, `pact-care-desktop.png`, `pact-mobile.png`; the care sequence paid pinePitch ×2, water 6→5, compost 5→4, tree remained grown, zero missing icons. Native water and spark particles emerge from the actual tree.
- Current verified progress: **22/42 rewards, 7/18 combos**. Remaining: felling07; fishing08–10; kitchen07–10; helpers07–10; insects07–10; farming07–10; 11 secret combos. Finish all before final integration/balance/build/bundle secrecy/release handoff. No live SQL or deployment performed.

### v228 — beaver crossings (2026-10-11, local only)

- felling07 `famBeaver`: following beaver builds one shared 30-minute bridge/day at either marked forest crossing. The long crossing consumes eight logs, the short crossing four; both consume two root fibres and three stamina. Uses existing water and banks, ordinary movement, no new map gates or XP.
- Two private fixed world rows; world-before-purse lock, authenticated bounded reader, rerun preserves active bridges. Same receipt cannot reopen an expired path. Queued paths crossing a closed bridge are cleared; a traveller on expired planks returns to the nearest bank, including after resuming a tab.
- Local PostgreSQL: 33 parity/inputs/receipt/privacy/rerun checks. Vitest: 26 tests across bridge, session movement and forest pass; TSC passes. Previous full town suite: 178 files / 1,989 tests pass.
- Actual browser: consumed logs ×8, root fibres ×2, stamina 46→43; walked from [174,135] across the seven water tiles to [174,143]. Advanced trial clock 31 minutes while standing at [174,139]; returned to [174,135], bridge reader empty, water unwalkable. Desktop/mobile native planks and beaver reviewed in `bridge-desktop.png` / `bridge-mobile.png`, no missing icons.
- Current verified progress: **23/42 rewards, 7/18 combos**. Remaining: fishing08–10; kitchen07–10; helpers07–10; insects07–10; farming07–10; 11 combos. v229 lunar reel and fishing bonds are in progress and are not yet counted. No live SQL or deploy.

### v229 — lunar reel and fishing quiet windows (2026-10-11, local only)

- fishing09 `charmLunarReel`: each fish accumulates five seconds inside its own safe band. Manual pull shortens remaining line 20% and immediately counters for two seconds. One pull per actual fish, including multiple legend bouts and otter rescue. Other lines keep their distance and charge; no automatic landing.
- SC18 float + wind on a manually hooked fish in a running current: first-surge quiet window 1.5s. SC16 lunar + frog on a manual charged pull during actual world rain: counterattack quiet window 2s. Shared five-fish/day pool, stable fish keys and original cast loadout; orb/local-cloud rain does not count. No bait, XP, fish, stamina or extra lines granted. Only discovered rules reach the player.
- Server retains stable keys as pair lines finish. Old requests, early charge, NaN, different loadouts and closed lines cannot affect a fresh cast. Replay returns the existing activation; private original strike/helper and explicit member RPC grants. Guarded rerun preserves active line state and verifies the wrapped base definition.
- Local PostgreSQL: 43 checks including the actual authenticated three-line strike, per-fish activation, removal of one line, shared pool, weather distinction, private-rule parity and rerun. Vitest: 96 fishing/combination tests pass; TSC passes.
- Actual browser: single and two-line fights charged and manually pulled. First line became used and shortened; second retained its original remaining distance and unused charge. During forced world rain, the frog produced the actual two-second quiet interval and SC16 discovery. Native ripples emerge at the fought fish; reduced motion is respected. Desktop/mobile screenshots: `reel-desktop.png`, `reel-mobile.png`, `reel-pair-desktop.png`, `reel-rain-combo.png`; no missing icons.
- Charge retains the base game's client-reported minigame model. Server verifies live ownership, cast loadout, elapsed five seconds and one activation; it does not claim to replay the complete physics in SQL.
- Current verified progress: **24/42 rewards, 9/18 combos**. Remaining 18 rewards: fishing08/10; kitchen07–10; helpers07–10; insects07–10; farming07–10. Remaining combos SC04–SC10, SC12, SC17. Next: boat routes/consent and river-dragon trail. No live SQL or deploy.


### v230 — lotus boats (2026-10-11, local only)

- fishing08 `thingLotusBoat`: launch at either fixed forest dock for two stamina, thirty minutes. Owner offers one closed-by-default seat; the friend boards themselves. Both travel at ordinary 3.5 tiles/sec; riding, wind and cart bonuses cannot accelerate the boat. Either traveller can request the return after everyone finishes their fishing line. No map gates or walkability change.
- One private lease row per owner, own/joined boat plus at most twelve nearby rows in the member reader. Boat-before-purse locks serialize actual casting and movement. UUID receipts preserve exact commands; rerun preserves leases. Midstream fishing uses ordinary bait, habitat/current, timing, stamina and catches. Expiry/reload returns travellers to the original bank.
- PostgreSQL: 32 consent, parity, travel, actual owner/passenger cast, occupied-line rejection, expiry, privacy and rerun checks pass. Seven actual-session movement/boat tests and TypeScript pass. New native pixel icon preserves all 1,248 baseline cells.
- Browser: two distinct trial players joined voluntarily in separate tabs, owner departed, reload resumed both at the actual anchorage, normal cast was accepted, passenger requested return and both reached the bank. Desktop/mobile integrated leaf hull, deck, paddle and water wakes reviewed (`boat-dock-desktop.png`, `boat-midstream-desktop.png`, `boat-mobile.png`). During development a stale HMR session instance did not move avatars; a full page reload verified the new actual session code.
- Current verified progress: **25/42 rewards, 9/18 combos**. Remaining: fishing10 plus kitchen/helpers/insects/farming07–10 (17 rewards), SC04–SC10/SC12/SC17 (9 combos). No live SQL or deploy.


### v231 — river-dragon trail (2026-10-11, local only)

- fishing10 `famRiverDragon`: one trail start/day. Choose a legendary fish actually caught before, with an eligible ordinary bait/current at one of five real banks. Three different dry, reachable clues use memory, ordering and manual timing; each finished attempt costs two stamina, misses keep that checkpoint. No materials or XP from clues. Pause/cancel uses the existing bounded private-trail account.
- Completing creates one thirty-minute encounter at the original bank/bait/current. At the actual cast, the original pool must still contain that legend after habitat, time, sky/orb, signs, wariness and forged-rod filters. Pair/stardust cannot consume it. Conditions changing preserve the pending encounter until expiry. One eligible ordinary cast draws the legend and clears the encounter atomically; the normal manual fight and catch still decide the outcome. No reconnect reroll. As with other resumable daily trails, one unfinished trail may carry across midnight; start quota applies to the day it began.
- The ordinary school-bell eligibility helper now recognizes authorized anchored boat water too; a moving or unrelated boat cannot furnish an eligible pool.
- PostgreSQL: 34 parity, actual legend cast, three checkpoint, known-fish, hour/bait/wariness, mode/location, privacy and guarded-rerun checks pass. Thirteen dragon/forest-trail/school tests and TypeScript pass. All five banks and fifteen clues have actual paths. Native dragon icon preserves 1,248 baseline cells.
- Browser: started from the actual fishing setup, walked to clues, played memory/order/timing to completion, returned to the bank, then dropped the ordinary line. Actual trial draw was arowana and the pending call became null. Native pet and desktop/mobile trail/call UI reviewed (`dragon-memory-desktop.png`, `dragon-mobile.png`, `dragon-call-mobile.png`), no missing icons. Trial clock advanced forward to the next valid morning window; the UI correctly refused the earlier ineligible evening hour.
- Current verified progress: **26/42 rewards, 9/18 combos**. Remaining sixteen rewards: kitchen/helpers/insects/farming07–10. Remaining nine combos SC04–SC10/SC12/SC17. No live SQL or deploy.

### v232 — verified locally

Insects07: personally caught, carried beetles spar in three manual stance/timing rounds. One stamina, bounded best-score record, no beetle loss, wagers, goods, coins or XP. SQL 25 checks; six focused arena/dragon tests; TypeScript passed. Actual browser completed 3/3 with unchanged bag/coins; desktop/mobile canvas review. SQL prepared, not installed. Current 27/42 rewards and 9/18 combos; 15 rewards remain.

### v233–v234 — verified locally

Insects08: one known night insect at the nearest original habitat, costs two stamina, one use/day, twenty-minute private lure sharing the nectar slot. Only hours bypassed; rain, rare days and moon remain. Captures use existing net costs, scarcity and records, with no cloak follower chain. SQL 16 checks; five lantern/arena tests and TypeScript pass; desktop/mobile and actual capture verified.

Insects09: one captured pollinator gives a choice of sixty minutes growth OR a second hybrid seed at an actual ripe-neighbour harvest. Shares pollenRound with ordinary release; crossing and graftKnife cap at two seeds. SQL 15 checks, sixteen focused ecology/garden tests, TypeScript pass. Actual mobile UI cross consumed one bee and set the original root bearing marker; desktop reviewed. Current 29/42 rewards, 9/18 combos; thirteen rewards remain. SQL prepared, not installed.

### v235 — verified locally

Insects10 uses one two-stamina, three-species quest per day with a twenty-four-hour deadline. Actual normal net/lure catches record distinct required species; followers and crown lures never feed it. Completing it permits three single personal calls obeying original habitat/time/rain. Each consumes its charge at spawn, uses normal manual net cost, and cannot create cloak followers. SQL 33 checks; ten focused crown/lantern/ecology tests; TypeScript pass after validating wrapper clock index and garden test narrowing. Browser actual three net transactions completed the garden quest; UI summoned and captured one grasshopper, charges 3→2, no follower. Desktop/mobile reviewed. Current 30/42 rewards, 9/18 combos; kitchen/helpers/farming07–10 remain (twelve rewards). Prepared SQL only.


### v236–v237 — ครัวครบถึงสิบ (ตรวจในเครื่อง)

ตอนนี้ครบ 34/42 ของใหม่ และ 9/18 คอมโบ ยังเหลือสายช่วยเหลือ 4 กับสายปลูก 4 ส่วนโค้ดสายปลูกบางส่วนกำลังทำอยู่ ยังไม่นับพร้อมใช้งาน

- v236 ปิกนิก: ย้ายอาหารจริงสูงสุดสี่ที่ไป existing pot row; เพื่อนใกล้ ๆ กดนั่งกิน 30 วินาทีเอง นับโควตามื้อเดิม คืนหม้อคงเหลือได้ ใช้ expiry/table transfer เดิม ไม่มี world table หรือ polling ใหม่. สองแท็บ A/B ทดลองกดหน้าจอจริงแล้ว อาหาร 4→3 ผู้รับไม่มีผ้าก็กินได้ มื้อจบและไม่คืน borrowed bowl. Vitest meal/picnic 27 ผ่าน SQL 16 ผ่าน
- v237 เชฟเพลิง: สาม narrow beats ก่อนหม้อ manual สูตรที่รู้จัก ใช้แรง 2 ต่อ attempt สูงสุดห้า attempts/run สามเริ่ม/day; หม้อจริงถัดไปที่ตรงสูตรและไม่มี miss ได้ +2 servings. Sprite/refund ไม่รับโบนัส. เล่น UI จริงสามจังหวะและ cookDo ที่ใช้วัตถุดิบจริงแล้ว tomYum 4→6 และ fire charge หมด
- ตำรารส: ใช้ basil/salt/garlic เพิ่มจริงหนึ่งชิ้นพร้อมสูตร known; บัฟรองระดับหนึ่ง 30 นาทีหลัง fully eaten จาก shared pot (table/picnic), ไม่เพิ่มระดับซ้ำ แรงและบัฟหลักเดิม. Plain ladled bowls ยังคง plain ตาม contract เดิม. เพิ่ม cook provenance เฉพาะ pot/meal ที่เกิดจริง เตรียม SC08
- หม้อมังกร: ห้าที่จริงจากอย่างน้อยสามสูตร known; reserve ตอนเริ่ม วันละครั้ง TTL 30 นาที forfeits reserved food on cancel/expiry. สามด่านด่านละแรง 2 พลาดเล่นด่านเดิมและไม่หักอาหารเพิ่ม max five attempts. จบเป็น five existing feast rows, original dish identities, one serving each, warm อย่างน้อย .5 ชั่วโมง. Solo จบได้ ผู้กินเลือกกินจากโต๊ะเองและโควตามื้อเดิม. เล่น UI จริงทั้งสามด่านแล้วตรวจ five rows/ห้าที่ จบ run และยังเก็บอาหารคงเหลือใน bag ตรงจำนวน
- Native pixel icons เพิ่มสี่ชิ้น รักษา baseline 1,248 cells; ผ้าปิกนิก native ground geometry กับ bowls/steam ไม่ใช้ภาพวาดไอคอนขยาย
- Focused cooking/picnic/stamina 71 ผ่าน; v237 SQL 19 ตรวจ parity/checkpoint/paid flavour/full meal/five servings/privacy/rerun; TSC ผ่าน

ยังไม่รัน SQL บนระบบจริงและยังไม่ deploy. v207–v237 เป็นชุดที่เตรียมใน repo เท่านั้น
