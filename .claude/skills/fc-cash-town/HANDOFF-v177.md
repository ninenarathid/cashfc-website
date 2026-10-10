# OP powers and understandable cards — 2026-10-10

Owner confirmed v174, v175, v176, v177 and v178 ran. The smith is open to everyone.
Code release: 469dfcc6 and be9f30c9. Migration v177 is confirmed run by the owner; its closing probe has not yet been performed.
Only the owner writes production SQL. Do not reset inventories, coins or daily rights.

The owner's next balance decision is focused: reduce the echoing axe from three to two trees per game (v178). Keep log and timber drops: logs expand character storage and fine timber feeds forging. Preserve the stag's movement and the forge powers. Fast shared-tree depletion and client-reported completion times were investigated, but are not claimed fixed by this count change.

Owner confirmed v178 ran on 2026-10-10. A read-only production probe verified `trees.echo.trees = 2`, `gifts.gifts.charmEchoAxe.by = 2`, and v177's `axOne.use.n = 30`; anonymous catalog reads are refused (HTTP 401). No production member was created and no gameplay RPC was called. The applied SQL file is closed in commit `91fe1320` (`v178 has run`); its private draft remains for regression checks. RAN is now 178. Only two catalog numbers changed; all existing SQL functions remain unchanged. New boards use two trees; a board already open keeps the trees it held for at most its existing 45 seconds. Validation before release: 63 focused unit checks, 56 database checks including 184 felling starts, two mutations caught, and TypeScript passes. The felling vectors use axOne's actual daily quota for their exhausted case instead of the obsolete ten-use value. No production write was performed by Codex. v179 is being handled in another session; do not reserve that number.

The owner prioritized OP powers, then asked for clear buff descriptions because players did not understand stones and weeds. Cards now name the minigame, action, effect and relevant conditions. Weeding has a short visible instruction. `hoFirst` uses a neutral name that fits both +3 and +6; `cnTwice` says double watering rather than suggesting an extra manual watering.

+6's second option has stronger numbers and keeps working after a level drops. +10 changes play: earned vein loot is doubled immediately; ordinary trees can skip their minigame; fresh own stumps can regrow in a group; ancient branches can all be previewed; a watering can can cover the whole own bed or automatically double a dry plant's growth; a net sweep has a server-owned five-catch, ten-second grant; big cookware pays for three recipe batches in one minigame. Quotas remain member-owned and shared across tools.

Validation: 236 focused unit checks; 101 migration checks including authenticated RPCs, grants, refusals, rerun and catalog preservation; 404 keeper checks; three security mutations caught. The larger differential run passed 121 function groups, then its two failures were corrected and retested (780 cave views, 1,500 felling starts). Mining vectors and the 4,500 account-validation scenarios pass. Production build passes. Smith cards were checked at desktop and 390px widths.

## The revised goal of 9/10

9/10 is a design target, not a measured player score. Here “farming” means grinding for ore, wood and coins to try forging again. The owner challenged the harvest event: it was our own interpretation, not a requested named event. Harvest goals and the village festival are removed from this release; their unpublished draft/art is archived in `E:/NinenineProject/fcnext-codex-bench/later-activities`.

Next work should follow the existing loop: receive an interesting power, use it to gather materials more enjoyably, then return for another forge attempt. Priorities are visible confirmation when a power actually works, an understandable choice of where to gather the next needed material, and useful moments of helping other players with the existing powers. Use actual play evidence before changing grind prices or introducing another activity. Keep powers desirable for different play styles; avoid one mandatory option.

The owner authorizes image generation where useful. Keep animated Canvas effects native and cached; generate art only when it improves a concrete screen. Do not reintroduce the deferred harvest project by copying its archived mixed source files.
