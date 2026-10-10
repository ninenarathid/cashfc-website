# OP powers and understandable cards — 2026-10-10

Owner confirmed v174, v175 and v176 ran. The smith is open to everyone.
Code release: 469dfcc6 and be9f30c9. Migration v177 remains pending until the owner confirms running it.
Only the owner writes production SQL. Do not reset inventories, coins or daily rights.

The owner prioritized OP powers, then asked for clear buff descriptions because players did not understand stones and weeds. Cards now name the minigame, action, effect and relevant conditions. Weeding has a short visible instruction. `hoFirst` uses a neutral name that fits both +3 and +6; `cnTwice` says double watering rather than suggesting an extra manual watering.

+6's second option has stronger numbers and keeps working after a level drops. +10 changes play: earned vein loot is doubled immediately; ordinary trees can skip their minigame; fresh own stumps can regrow in a group; ancient branches can all be previewed; a watering can can cover the whole own bed or automatically double a dry plant's growth; a net sweep has a server-owned five-catch, ten-second grant; big cookware pays for three recipe batches in one minigame. Quotas remain member-owned and shared across tools.

Validation: 236 focused unit checks; 101 migration checks including authenticated RPCs, grants, refusals, rerun and catalog preservation; 404 keeper checks; three security mutations caught. The larger differential run passed 121 function groups, then its two failures were corrected and retested (780 cave views, 1,500 felling starts). Mining vectors and the 4,500 account-validation scenarios pass. Production build passes. Smith cards were checked at desktop and 390px widths.

## The revised goal of 9/10

9/10 is a design target, not a measured player score. Here “farming” means grinding for ore, wood and coins to try forging again. The owner challenged the harvest event: it was our own interpretation, not a requested named event. Harvest goals and the village festival are removed from this release; their unpublished draft/art is archived in `E:/NinenineProject/fcnext-codex-bench/later-activities`.

Next work should follow the existing loop: receive an interesting power, use it to gather materials more enjoyably, then return for another forge attempt. Priorities are visible confirmation when a power actually works, an understandable choice of where to gather the next needed material, and useful moments of helping other players with the existing powers. Use actual play evidence before changing grind prices or introducing another activity. Keep powers desirable for different play styles; avoid one mandatory option.

The owner authorizes image generation where useful. Keep animated Canvas effects native and cached; generate art only when it improves a concrete screen. Do not reintroduce the deferred harvest project by copying its archived mixed source files.
