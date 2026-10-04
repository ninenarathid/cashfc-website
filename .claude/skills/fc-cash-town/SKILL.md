---
name: fc-cash-town
description: Plan, prototype and build Cash Town, the FC's future virtual town in the browser. It is an isometric world like the Thai Flash-era Zheza, where avatars walk, chat in bubbles, visit homes and pets, and talk by microphone when close (like Gather), with mini-games such as a popoto farm. Covers the vision, the architecture (2D isometric with PixiJS or Phaser, click-to-move netcode, a Cloudflare Durable Object per zone, Supabase persistence), proximity voice (WebRTC mesh or the Cloudflare SFU), mini-game and housing design, costs with a calculator, safety and phasing. Use whenever Cash Town, a virtual town or world, avatars, proximity voice, a Gather-like space, multiplayer presence, a farm, pets, housing or a mall comes up, including Thai requests like "Cash Town", "เมือง", "อวาตาร์", "เดินในเว็บ", "คุยด้วยไมค์", "แบบ Gather", "แบบ Zheza", "ปลูก popoto", "สัตว์เลี้ยง", "บ้าน".
---

# Cash Town

The FC's future virtual town: an isometric town where every member's avatar
walks, chats and visits, with homes, pets, a popoto farm and mini-games, and
where walking close to someone lets you talk by microphone.

**Status (2026-10-01): a beta is live at `/town` for every member with a
verified character** (v102; admins since v101). It has:
- **one 64×64 map** (no buildings since 2026-10-02), drawn with plain Canvas 2D:
  - the starter town in the middle (`TOWN`): a cobbled plaza with the fountain, a lamp and a flower bed at each corner, benches round the fountain with bins, a signpost;
  - **four winding dirt paths** leave the plaza (`ARMS`, `pathMiddle`): straight at the mouth, wandering further out. They are shapes, not tiles: `groundLook(x, y)` gives the ground at any point, so bends and banks are drawn as curves (`scenery.ts` caches it per eighth of a tile). Each path is lit where it leaves the plaza and has two resting places (a bench facing it, a bin, flowers, a lamp across the way);
  - **a river** down the left (`riverMiddle`, water and sandy banks, not walkable) cuts the west and south paths. Twice as wide since 2026-10-03 (the owner: "เพิ่มขนาดแม่น้ำความกว้างเป็นสองเท่าจากตอนนี้"): it grew away from the town, so the town's own bank is where it was (`RIVER_HALF`; the layout still keeps clear of the narrower river it was laid out beside, `wetThen`, so nothing in the town moved). It flows (streaks, glints, fish shadows, a koi leaping every 23 s, things drifting by: leaves, lily pads, a paper boat, a stick, a rubber duck), all by the wall clock;
  - **road works** (`ROADWORKS`) close the north path at the map's edge: a barrier, a popoto waving a flag, "กำลังซ่อมทางเดิน". The east path's were finished on 2026-10-03: it ends at a gateway to the farm (below);
  - **Popoto Shop** being built (`SHOP.stage`, 2 of 3 since 2026-10-03: the timber frame and walls up, rafters on, a popoto hammering on the scaffold and one carrying planks; stage 1 was the foundation). A stage is a picture `shop<stage>` in the scenery (`scene-shop-<n>.png`, an edit of the first sheet, stood on the first's ground point by `build-scenery.mjs`), a line on the board (`STAGES` in `lib/town/board.ts`) and where the workers stand (`Town.tsx`);
  - **the fishing deck** being built (`PIER.stage`, 1 since 2026-10-03) on the town's bank straight left of the plaza on the screen and below its left corner, between where the west and south paths meet the river and on neither. It took three goes to please the owner: a small one at the west path's end, a bigger one here, then "ขอใหญ่กว่านี้ 2 เท่า ตอนสร้างเสร็จขอมีทางเดินขึ้นไปได้ (บันไดเล็กๆ)". Now a long platform, its left third (bare joists) out over the river, two jetties further out, and the frame of a few steps at its right corner beside the south path (`pier1`, 619×364, from `scene-pier-1.png`); three popoto nailing boards down and three running planks down the south path (`rush*`, `popoto-rush.png`); "ลานตกปลา · กำลังสร้าง". `PIER.post` is where its left corner post stands, in the water, and the picture is stood by it; `PIER.tiles` are the ones it closes (those inside the platform's four corners). What the layout's seed had put on them, and the trees a step round it, are taken off afterwards. Nobody fishes yet: fishing is planned for this map (no change of map), from the finished deck, up its steps;
  - **the cooking yard** being built (`KITCHEN.stage`, 1 of 2: the owner, "มี 2 state พอ") below the plaza on the screen, between the east and south paths and clear of both ("อย่าทับทางเดินด้วย"). It lies across the screen and faces the viewer, as the stall and the bank counter do, rather than along the tiles (the first one drawn did, and was half the size: "ขอใหญ่กว่านี้ 2 เท่า และ วางแนวขวาง ตอนนี้เฉียงๆ"): a kerbed flagstone floor two thirds laid, three brick stoves along the back with a way in between the second and the third ("อยากให้มีทางเข้าทางทิศเหนือด้วย": `KITCHEN.ways`), two worktables' frames, a ring of stones for a big pot, dining tables on their sides, and heaps on the bare earth at its right (`kitchen1`, 752×265, from `scene-kitchen-1.png`); three popoto at work in it and three running planks down from the east path, "ลานทำอาหาร · กำลังสร้าง". `KITCHEN.foot` is where the picture's ground point stands (the middle of its front, by the way in); `KITCHEN.tiles` are the ones inside its kerb's four corners, measured from that point in the picture's own pixels; `KITCHEN.near` is the ground about it kept clear of trees. It is drawn as far forward as its front kerb, so whoever is behind or beside it is behind it. Stage 2 will be the yard itself, where members cook with cookware of their own, bought from the uncle;
  - **two shopkeepers** in front of the Popoto Shop (`KEEPERS`, 2026-10-03): the uncle at his stall (`stall`, `un_*`), who will sell tools, seeds and bait, and the banker at his counter (`bankdesk`, `bk_*`), who will change popoto into Popoto coins. Each goes through a little round of poses by the clock, under its name. **A tap on one opens a talk** (`lib/town/talk.ts`, `TownTalk.tsx`): its large portrait (`tk_uncle`, `tk_banker`, the mouth moving while a line is written), its name, and a greeting for the hour then the next of its conversations, in turn; Enter, Space or a tap goes on, Escape closes. The lines say what each will do, the way the owner settled it (limited stock refilled twice a day, the uncle's relatives fetching what was sold twice a day so the money comes later; popoto from the profile and pictures into coins, one way at first), with no numbers, and that it is not open: the shop and the exchange are planned, not built;
  - **the trade, as a trial in `next dev` only** (2026-10-03; the owner, asked how the two should work in dev first: "ลองในเบราว์เซอร์ก่อน"). The rules are real and pure (`lib/town/trade.ts`, tested): a bag of five slots where a tool takes one like anything else (his call) and things of a kind stack; the uncle's stock is one pool for the village refilled at each round, with a limit a person a round; what is left with him to be sold is taken back until the next round and paid after it, when the money is collected from him; the rounds are 07:00 and 19:00 in Bangkok; the banker gives 5 coins a popoto, 20 popoto a week, from Monday. Every number is a knob (`RULES`, `ITEMS`) meant for the database. What is kept is kept in the browser (`lib/town/trial.ts`: localStorage, one stall for the browser so two tabs share its stock, a purse a tester, made-up popoto to change, a clock that can be put forward a round): nothing is asked of the database and no real popoto are touched. In dev a talk opens with a greeting and what the keeper asks, then choices (`TownTalk`'s `choices`: buy, sell or collect, exchange, or a chat); `TownTrade.tsx` (loaded lazily behind `TRIAL` in Town.tsx: in a production build the keepers say they are not open and the panels are never asked for; a production build made on 2026-10-03 was searched, client and server, for the trial's storage keys, every `__town*` handle, the panels' own words and the catalog's names: none was there. Search again before it is pushed: `npx next build` writes to `.next` beside the dev server's `.next/dev`, so both can run) is the stall, the bank and the bag as panels, and a bag button on the map shows the coins. `window.__townTrade` is the trial, for scripts. **Next: the same rules as database functions**, once the owner is happy with how it plays;
  - **the deck finished, in `next dev` only** (2026-10-03; the owner: "พร้อมกับ ลานตกปลาที่เสร็จแล้ว เฉพาะใน dev"): `PIER.stage` is 2 unless the build is a production one, where it is still the building site. The finished picture (`pier2`, an edit of the first, stood where it stands) has every board laid, steps at its right corner, a railing only along its far edges, and its floor clear. **Its floor is drawn above where its posts stand**, so the tiles walked on are the ones the boards are drawn at (`PIER.deck`: the floor less the far railing's row, and the two jetties, a tile wide), not the footprint (`PIER.tiles`, which stay closed where no boards are drawn over them, as does the row behind the far railing). It is walked onto and off only by its steps (`PIER.steps`; `findPath` crosses the deck's edge nowhere else; `onDeck`). It is drawn before anybody who stands on it. `PIER.spots` are eight places to fish from, each with where its float lands; a little float rides the water at each, and a tap on one walks to its place. `work/deck-tiles.mjs` marks the map's tile middles on the picture, to choose such tiles.
  - **everything there is** (`lib/town/items.ts`, 2026-10-03; the owner: "ช่วย generate item ในเกมขึ้นมาทั้งหมด ทั้งปลา อาหาร สูตรอาหาร ผักทั้งหมด"): some seventy things, each with its names, what it is for, how many stack and what the uncle's relatives pay; its id is its picture's name (`icons-items-*`, `iconOf`). **Fish** (`FISH`: twelve, from a minnow to the golden koi that is seen leaping, plus water hyacinth and an old boot): which baits each takes (worm, dough, a minnow, corn), its hours, whether rain brings it, how long it waits, its length, and how it fights. **Vegetables** (`CROPS`: twelve) grow through four stages; some bear again (back to the stage before the last, ripe again after `again` hours, `picks` times in all: `growth`). **Dishes** (`DISHES`: sixteen) give stamina and most leave a buff (`BUFFS`: steady hands, keen eye, lucky, hearty, green fingers); their recipes are secrets to be found from hints about the town ("เราจะไม่บอกสูตรอาหาร จะแค่ใบ้ไว้ในเกม จากช่องทางต่างๆ"); the uncle sells two scrolls of the simplest (`SCROLLS`) and a plain rice parcel. Only fishing, buying, selling, eating and reading a scroll are built; farming and cooking are data so far.
  - **stamina and meals** (`lib/town/stamina.ts`, the trial only): the gauge is full at 05:00; three meals a day by Bangkok's clock (05–11, 11–17, 17–05), each once (asked, he chose the real hours); a meal is eaten **sitting down and takes five minutes**, the stamina coming as it is eaten and the buff at its end, three hours long ("อยากให้การทานข้าวใช้เวลาระดับนึง … คนที่กินข้าวในชีวิตจริง อาจจะอยาก login เข้ามาเพื่อหาเพื่อนทานข้าว"); getting up early keeps what was eaten; **each other person eating within three tiles adds a tenth, up to five**. The room is told what one eats (`Doing.eat`, a dish's name; `TownSession.setEating`), drawn beside the head and noted on the person's card. With no stamina a fight is much harder (`STAMINA.spent`), never refused. The bag panel shows the gauge, the day's meals, the buff, an Eat button for a dish and the recipe book. Not built: tables at the yard that give more, and the door on every page saying a meal is on.
  - **fishing** (`lib/town/fishing.ts`, `TownFish.tsx`, the trial only; he chose each part when asked): on a place of the deck a button offers to fish; the panel shows the baits in the bag and what each may bring at this hour (a fish never caught is a shadow with its odds); the line is dropped (a bait leaves the bag; a rod must be in it) and what takes it is decided then (`castLine`, from a seed): **20 seconds to 3 minutes, the rare ones up to 8**. **The float must be watched**: it twitches at a nibble and goes under at the bite, and the strike must come within 1.6 s of the bite (`STRIKE`); at a nibble or too soon it scares the fish off, too late it is gone, either way with the bait. Then **the fight, one button**: held it reels and raises the line's tension, let go it gives line; line is won only in the safe stretch; above it the line strains and snaps, below it the hook slips; each fish pulls and surges its own way (`FightStyle`: steady, darter, leaper, slippery, sleeper), and some give a surge away first. Played by made-up players of three speeds it comes out as he asked, hard: a newcomer lands a minnow nearly always and a catfish half the time; the koi is 1 in 100 for them and near half for the skilled. A fight costs 2–12 stamina. The trial has a tick box that cuts the wait to a tenth. `window.__townFish` is its handle for scripts. Others do not see one's line yet.
  - **a recipe scroll** (`TownScroll.tsx`): two wooden rods part and the paper unrolls: the dish, what goes in, in what, how many it feeds, what eating it gives; Escape or a tap outside rolls it up. Reading a scroll from the bag copies its recipe into the recipe book (the bag panel lists them) and uses the scroll up.
  - **the farm, a map of its own** (`FARM`, 2026-10-03; the owner: "แปลงปลูกผักเปิดแมพใหม่ได้เลย แต่ยังไม่มีอุปกรณ์ก็ยังทำอะไรไม่ได้ … แมพกว้างๆเลย"): 60×44 tiles far to the east in the same tile space (so which map somebody is on is just where they stand: `placeOf`; nothing more is told to the room, and voice is still one room). Beds of plots, a seed to a plot (1,176 of them, `plotAt`; each plot's rim is drawn a little darker), two lanes crossing at a well, a tool shed, hay, four scarecrows, a fence along the edge it is entered by, woods on the other three (`FARM_PROPS`, `tex-field`, `scene-farm-a`). **Gates** (`GATES`, `gateAt`) join the maps: the end of the town's east path and the farm lane's first tiles. Stopping on one puts you at the other (`TownSession.warpTo`, told as an ordinary move; whoever hears a move to another map stands the walker there instead of walking them across). A tap on a gateway walks to it. The camera stays inside the map I am on (`BOUNDS` in camera.ts) and comes up out of the dark after a gate. Nothing can be done in the farm yet;
  - **the game as it stands, in `next dev` only (the night of 2026-10-03). Nothing of it is pushed:** asked how to open, the owner chose "ยังไม่ Push รอฐานข้อมูล", and "เปิดจริงไปเลย แลก popoto จริงได้เลย" (no starter gifts). It supersedes whatever the bullets above call planned or not built. Everything is kept by the browser's trial (`lib/town/trial.ts`: a purse a tester; the stall, the clock, the farm, the well, the beds, the pots, the finds and the deals for the whole browser, so two tabs are two members of one village).
    - **The thread through it (his):** players find things out for themselves ("ส่วนใหญ่ผมอยากให้ ผู้เล่น หาข้อมูลกันเอาเอง"). The screen shows states and refusals, never rules or tips; a thing's line says what it looks like, never what it is for; **a deed is offered only when the right thing is in the hand** (`Purse.hand`, `Doing.hold`, the bag's Hold). The bank alone says what changing popoto costs.
    - **Later that night (2026-10-03 into 10-04), and it supersedes the bullets below where they differ.** His rule for all of it: "อยากให้ ผู้เล่นมีประติสัมพัน มี communicate กันมากที่สุด หลายๆอย่างเลยต้องปิดเป็นความลับ และ หลายๆเกมต้องใช้หลายคนในการเล่น ขอให้ยืดถือ design แบบนี้ครับ"; and its other half, "ถึงเราจะทำให้ทำอาหารยาก และต้องเดา วัตถุดิบ แต่ก็ยังต้องทำให้ ผู้เล่นยังพอ คลำทางไปเจอวิธีทำที่ถูกต้องได้".
      - **317 things** now: 25 dishes of five other countries (Japan, Korea, China, Italy, India; eleven take two cooks) with seaweed, tofu, cheese, milk, fresh noodles (`MAKES`), a rolling pin, a bamboo mat, a stone bowl and a clay oven; flour is the second tier's; **a scroll for every dish** (66), six sold by the uncle and sixty found by opening what the river brings up (`scrolls.ts`: an old boot 35% of the time, a bottle, a chest; the bag offers "Open").
      - **Cooking**: no choosing by recipe (the chips are gone); **the wrong things, cooked in cookware, are a pot of the odd dish** (`oddDish`: 6 stamina, no buff, nobody buys it), and so are the wrong amounts, the wrong cookware and too few cooks; with bare hands they are lost for a little compost. **The odd dish has a taste** (`tasteOf`: nothing like anything, some of it right, one thing short / too many / not the one, the wrong amounts, everything right but the way), which is how the right dish is felt for. **No clean pot is needed** (the pot is the yard's and takes a free slot of the bag; the uncle's relatives no longer buy pots). Whoever has made a thing (`Purse.made`) is told when cookware or cooks are missing, and loses nothing.
      - **A found recipe tells all but its last thing**, which is named by its kind (`hints.ts`: `toldOf`, `KIND_WORD`): on a scroll, in the uncle's hint, and in the book for a recipe somebody else found. Whoever has made it reads all of it; the scroll says who made it first (`trial.finder`), the one to ask. **Missed three times by that last thing alone** (`Purse.tries`, `COOKING.clue`), the recipe says what the thing looks like, never its name.
      - **Farming**: five stages, the first only what was sown (`STAGES`, `STAGE_AT` 0/10/30/60/100% of a plant's hours, `growIconOf`; six looks: seeds, big seeds, a bulb, a root, a cutting, a nut). The test window's "พืช" page shows every plant at every stage with its hours, and plants a show garden in the four beds round the well (`trial.showGarden`).
      - **A deal may have coins in it** (`deal.ts`: `Deal.coins`), laid beside the things. The database's deal has to write every one down: coins handed on are a way round the week's twenty popoto.
      - **The yard**: its benches are sat on and eaten at (`KITCHEN.seats`, told to the room as `YARD_SEATS` + its number; the far bench sits behind the table's top, drawn again over the sitter; whoever sits at the same table is company); **from outside it is a house** (`kitchenHouse` in the scenery; `roofRef` fades it off for whoever stands in the yard, and nobody inside is drawn for whoever does not); **its fire burns and lights the yard**, and at night the house's lanterns and windows glow, slowly (`drawFlames`, `drawYardLights`, `KITCHEN.lights`).
      - **Each kind of work looks and sounds like itself** ("ตอนนี้เหมือน ตกปลาเลย"): the timing game is dressed as a hoe along earth, a ladle round a pot, a brush along a tub (`TownTiming`'s `look`); `sfx.ts` has the sounds of work (`WorkSound`, `FishSfx.work`); `components/town/vfx.ts` throws up earth, leaves, water, steam, smoke, bubbles and a sparkle where the work is done.
      - **The database**: v105–v109 have run (v109 on 2026-10-04; every catalog row checked against the files, live). v110 (the farm: plots, beds, the well) ran the same day (live probe 21 of 21). v111 (the kitchen, with the bowls) and v112 (deals, things and coins, every one kept) ran that day too (live probe 30 of 30): every rule of the game is in the database now. v113 (a bag begins with ten slots, the owner's word) and v114 (the popoto board counts less what was changed at the bank: each character's oldest first, no row of `kudos` touched; popoto on pictures not changed for now, the owner's word) ran that day too; v115 (the knob that opens the game: admins only until the owner sets `game_open` to 1) ran on 2026-10-04 too (live probe 10 of 10). The owner opened the game that night. By the next noon seventeen members were playing, and he asked whether a vegetable, which takes hours, fetches more than a fish caught at once: it did not (a plot came to 11 to 15 coins a day, a common fish to 8 to 12 at once, and a point of stamina spent on morning glory earned less than one spent fishing). He chose, of four ways shown him: **every crop gives twice as many at a picking, and clearing and tilling cost 2 stamina each** (`CROPS` in items.ts, `FARMING.costs` in farm.ts, v116; prices and dishes left alone). `farm.test.ts` pins both, and that a point of stamina pays better the longer a crop takes. `scripts/db/README.md` says how each was proved and how a change to a seeded number reaches the database.
      - **Who keeps the game: `lib/town/keeper.ts`** (2026-10-04). The six panels ask a keeper and never know which: a member's is the database's (`DbKeeper`: reads answered at once from what each answer brought, deeds awaited, one at a time; the database's clock; what others change asked for while it is looked at and when the room says so with a `nd` broadcast that carries only the word for what; fishing dropped, struck and landed with the database, which says what bit only at the strike), and `next dev`'s test room has the browser's trial behind the same interface (`keeper-trial.ts`). The map makes the keeper and shows the game when it says the game is open to whoever is here; the test window and the trial are in a branch a production build drops (searched, 2026-10-04). **Pushed on 2026-10-04** (`fef0458`, and `9e7fb0b` "v105 to v115 have run") on the owner's word ("Push ได้ทันที"), shut to all but admins until he opens it from the SQL editor: `update public.town_knobs set value = 1 where key = 'game_open';`. `&townDb=http://127.0.0.1:3199` points the dev test room at a stand-in for the database (`scripts/db/town-bench.mjs`), which is how the game is played by the database's rules before anything is pushed. **The deck and the cooking yard are finished for whoever the game is open to** and building sites for everybody else (`setBuilt` in world.ts; they were finished in `next dev` only before, so an admin on the real site could neither cook nor fish from the deck): told to the owner, his to change. The checks' browser helper is `scripts/cdp.mjs` (the copy in `pixel/work/` is in a folder git does not keep). The near benches of the yard are not sat on for now (the owner: the pose seen from behind is wrong; `SIDES = [false]` in world.ts).
      - **A helping takes its bowl; there is no dirty pot** (the owner, 2026-10-04: "ตอนตักใส่ถ้วย ถ้วยต้องหายไปด้วย ต้องกินหมดก่อนถ้วยค่อยกลับมา หม้อสกปรก ตัดออกเลย พอตักครบออกหายออกจากพื้นไปเลย"). Ladling (from a pot set down, or from one's own) takes a bowl out of the bag and puts the helping there instead; the bowl is back when the meal ends, eaten up or left (`bowlsBack` in stamina.ts; a bag with no room is owed it, `Purse.owed`, and has it as soon as there is room: mine, so that no bowl is lost). A dish the uncle sells ready comes wrapped and gives no bowl (`inBowl`). A pot whose last helping is out is gone, from the ground and from the bag; only whoever set a pot down takes it up; one person leaves at most six standing (`COOKING.pots`, mine). **Washing up is gone with the dirty pot**, and so are the things that were only for it: `potDirty`, `scrubber`, `brush`, `ash`, `soap` (312 things now; the uncle's shelf 21 + 80). The tub in the yard is scenery. A pot to cook in fetches 40 again: nothing makes one any more. This supersedes every line below about dirty pots and washing.
      - **Green fingers does what it says** (2026-10-04): the meal buff `green` promised "Watering speeds a plant more" and no rule read it. A watering by somebody who has it now adds half as much again (`water()` in farm.ts, and the same in v110).
      - **No stamina is three times as hard, and food matters** (the owner, on the game's first day, 2026-10-04: "เมื่อ stamina หมด minigame จะยากขึ้นกว่านี้อีกสามเท่า แต่ยังคงเป็นไปได้ที่จะเล่นผ่าน ถ้าเป็นคนที่เล่นเก่งมาก … เพื่อที่อาหารจะได้สำคัญมากขึ้น"). That day the members hoed 279 plots with no stamina and 129 with some (a miss cost nothing at zero), and landed the small fish as often either way. The numbers are set by what comes of a whole go, played by made-up hands (the members' own timing is off by about 0.07 s either way, a practised hand's by 0.035, a very good one's by 0.02), not by dividing each by three: a fifth of the stretch is no game even for the best. **Fishing** (`STAMINA.spent`: strike 0.3, band 0.35, pace 1.4): 0.48 s to strike in, and of a hundred bites a practised hand lands 35 where it landed 95, a very good one 85, nobody the bigger fish. **The hoe** takes the same stretch and is **dropped at the third miss** (`TIMING.spent.misses`, `dropped()`, three marks in the panel, nothing done to the plot): one go in ten, two in five, six in seven. **Everything else on the farm** (sowing, watering, feeding, curing, picking, pulling up, carrying water) had no game and stayed free; he said "ออกแบบเพิ่มเลย": with none it is a short round of the same game (`FARMING.tired`, two hits; `hitsFor`), dropped the same way with nothing lost, along a strip of earth or of water with the thing in the hand running over it. With stamina all of it is as it was. All of this is the browser's: the database judges only the strike (v117).
      - **The stirring is the kindest game** ("ทำอาหารทำให้ง่ายกว่าปกติหน่อย เพราะกว่าจะหาวัตถุดิบมาปรุงอาหารได้ ก็ยากมากแล้ว ไม่อยากให้ fail มาก ถ้าพลาดก็ยังได้อะไรบ้าง"): its stretch is twice the hoe's, and with no stamina three quarters of that and a little quicker, never dropped (`COOKING.stirring`, `stirMods`; `TimingMods.wide` and `tired`). A miss still costs a helping and never more than half the pot.
      - **A cure for pests that can be had** ("ช่วยเพิ่มสูตรทำยาฆ่าแมลงในร้านค้าให้ด้วย"): `scrollPestCure`, the one scroll that is of no dish, on the first day's shelf (40 coins, six a round, one each); `SCROLLS` maps a scroll to a dish or to that, `Purse.recipes` holds either, and the book lists it with what else is made (`knownMakes`). **The cure is made of chili 2, scallion 2 and salt 1 in a pot now** (mine, told to him): it took garlic and basil, whose seeds the uncle has only after two orders, and the village had filled none, with 42 plants in the ground. v117 wrote the nine catalog rows (ran 2026-10-04; the live rows are the file's to the entry).
      - **Rain waters the plots** (the owner, 2026-10-04: "ระหว่างที่ฝนตก พืชทั้งหมดจะถือว่ารดน้ำแล้ว ตลอดการตก"): while it rains (`WET_SKIES`: drizzle, rain, storm: whatever is drawn as rain) every plant grows as if a can came to it every hour (half an hour of growth to an hour of rain, by the minute: `grown(p, now, rains)`), its plot is wet, and a can is offered nothing. The farm's pure rules take the stretches of rain as their last argument (none, where nothing is said); whoever keeps the game hands them `SKIES.rains()`; the database counts the same from its own table (`town.wet_ms`, v118: `grown`, `pest_at` and `see` again), and `db-vectors` makes the farm's cases again under five skies. A line's rain is the database's too (`town_cast` no longer believes the browser). A plant picked once and bearing again waits by the clock, as it does for a can.
      - **What a line brings up that is no fish fetches something** ("ช่วยทำให้ ขยะจากการตกปลา สามารถขายมีราคาได้ด้วย แต่ไม่เวอร์เกินไป"): an old boot 3 coins (a minnow's worth) and an old chest 20, each a little less than what is in it would fetch on average, so opening is still the better guess. On a worm or dough a bite in a hundred is a boot: a bite is worth a third of a hundredth more (`pgtest/junk-odds.mjs` in that session's scratch folder printed it by bait and place).
      - **The stall counts down to the next round** (the owner, 2026-10-04: "ในลุงขายของ ช่วยทำให้ขึ้นเวลาด้วยว่า รอบต่อไปที่เงินจะเข้าเหลือเวลาอีกเท่าไหร่ เห็นทุกคนได้เลย"): under the stall's two tabs, the hour the relatives come next (07:00 or 19:00) and how long until it, second by second on the keeper's clock (`NextRound` in TownTrade.tsx, `leftOf` in trade.ts: hours and minutes, the seconds too under ten minutes); on the selling side, what the things left with him will fetch then. For everybody: this one is no secret.
      - **A page built before a thing was added** falls over drawing a shelf with it: the keeper leaves unknown things off the shelf from now on (`DbKeeper.take`), but pages loaded earlier do not. So when a migration adds a thing: push the code, wait for the deploy, and only then put the file in `supabase/` (the owner runs it on sight); and say that pages open since before have to be loaded again.
    - **222 things in three tiers** (`items.ts`, `Item.tier`): 78 of the early game (the first 72, the pot's things and a bucket), 72 and 72 after ("ไอเทม next tier มาอีก จำนวน 2 เท่า"); 32 fish, 26 vegetables, 42 dishes (41 cooked, some by two to four cooks each at a tool of their own), 21 other things that are made (`MAKES`), better gear in every line (`gear.ts`). `uses.ts` answers his two conditions for opening, and tests hold the rules to it: `usesOf`/`idle()` (**every tool does something**) and `sources()`/`missing()` (**everything can be had**: bought, caught, grown, cooked or made from what can itself be had). Everything that is bought is on the uncle's price list (`GOODS`), but his shelf opens a thing at a time (next bullet).
    - **The uncle's order** (`orders.ts`; the owner, that night: "ลุงขายของ จะมีเควส รายวันปลดล็อคของในร้านทีละอย่าง เราเอาของ basic ขึ้นมาก่อน แล้วค่อยๆปลดล็อคไปดีกว่า"): the stall begins with 23 basic things (`BASIC`: the first tools, bait, rice and salt, a plain meal, six seeds, two scrolls, and what a pot of food and the well need). Each day (the game's day, from dawn) he wants three things, so many of each: one from the river, one from the plots, one from the kitchen (`wantsFor`: only common fish, vegetables that ripen within two days, and what one or two cooks make of those, of no later tier than his shelf has reached; worked out from `sources(shelf)`, so **an order can always be filled**: a test tries every stage). Whoever brings some is paid on the spot at what his relatives pay (`give`); the whole village fills it between them (`Village`, the browser's in the trial). **A day filled opens the next of `UNLOCKS`** (74 things in order: the six early seeds that were to be foraged, then the second tier, then the third), for everybody and for good, one a day at the most. The order is at the top of the stall's Sell tab; what filling it opens is not said until it is there. His hints, too, are only of what can be made with what he sells so far (`sourcesAt`). The order of `UNLOCKS` and the amounts are mine, not his.
    - **Recipes are never told.** `hints.ts`: the uncle sells a hint of the next recipe one has neither heard nor found (15/40/90 coins by tier), written from the recipe itself: what goes in and what it is made in, **a fish only as "a fish"** ("บอกแค่ว่าเป็นปลา แต่ไม่ได้บอกว่าปลาอะไร"), never how much. `cooking.ts` wastes things that make nothing (a little compost is left), but refuses the right things in the wrong amounts with nothing lost (`near`), and the right things with the wrong cookware or too few cooks. A find is everybody's (`Trial.found`).
    - **Fishing** (`fishing.ts`, `TownFish.tsx`): from every deck tile a line reaches water from and all along the town's bank (`fishFrom`: the bank is shallow, common fish only); "Fish here" shows only with a rod in the hand; only baits one holds are offered and what a bait may bring is hidden (`seesOdds`); waits halved and by chance; the fight is one button (or the space bar) on a gauge twice as long, its safe stretch wandering over the whole of it by the fish's own numbers (`sway`, `pace`, `STYLE`), from a seed and in fixed steps so that a recorded fight replays exactly (`replayFight`); with no stamina everything is much harder (`STAMINA.spent`); rods and tackle make it easier (`gearOf`); its own sounds, and other people's softer by distance (`sfx.ts`).
    - **Farming** (`farm.ts`, `TownFarm.tsx`): a hoe clears weeds and tills (the game of timing, `timing.ts`, `TownTiming.tsx`), a seed is sown, the plant grows by the real clock, is picked, some bear again. **A watering can has to be filled** (`WATER`: 8/12/18 waterings a filling): a bucket is drawn at the river (anywhere a line can be dropped), carried through the east gate and poured into **the well where the farm's lanes cross** (`WELL`, 40 bucketfuls), and a can takes a bucketful there. **A bed is whoever's sows in it first, the whole bed** (`bedOf`, 24 beds of 49 plots; `Bed`, `ownerOf`, `tend`): only its owner sows and picks there; anybody hoes (clearing, tilling, pulling up what died: the owner, 2026-10-04, "ยังขุดแปลงคนอื่นได้เหมือนเดิมแต่ เสีย stamina", for the stamina it costs anybody, and it is not the owner's tending: v118), waters, feeds and cures; it is free again after a day with nothing growing or four days untended. `BEDS.each` (2) is mine, not his: without a limit one seed in each bed would hold the whole farm. Weeds are of thirteen kinds, none to three to a plot, from the plot's own tile (`weedsOf`). A sickle or shears pick one more.
    - **Cooking** (`cooking.ts`, `TownCook.tsx`): the yard is finished (`KITCHEN.stage` 2 in dev): its floor is walked on by its two ways in, between furniture kept as boxes of the picture (`stands`, with `rise`: how much of a box is height, where somebody may stand behind it and is drawn behind it by `SceneryKit.drawPart`, which leaves the grey stone out). The picture is drawn from the front, so across the yard's floor corner-to-corner steps are free (`findPath`). At a stove, a worktable or the fire with cookware in the hand (bare hands at a worktable) things from the bag are put together and stirred (the game of timing; an apron makes it easier). **A dish comes as a pot of it** (a clean `pot` becomes `potFull` with `Stack.of`; each dish has its own pot picture, `potIconOf`, `icons-pots-*`); the cook ladles from it with a bowl, or sets it down (held in the hand) for anybody with a bowl of their own; emptied it is a dirty pot for its owner (anybody, after half an hour), **washed at the tub: ten minutes, scrubbing takes it down to five** (a wad of fibre is used up, a brush is not; ash or soap help). The others standing at the yard's places with cookware in their hands are the rest of the cooks (`Doing.hold`, read by the map).
    - **Trading between members** (`deal.ts`, `TownDeal.tsx`): opened from the card of somebody standing within three tiles; each lays out things from their own bag, either changing their side takes back both words, with both words everything changes hands at once or nothing does. **Things only, no coins** (mine: coins handed over would be a way round the week's twenty popoto). In the trial both testers have to be tabs of one browser.
    - **The bag** (`TownTrade.tsx`): an opened leather bag; a thing's card on hover; Hold, Eat, Unroll, Wear (a basket, a carrying basket and a carrying pole each add five slots: `wear`, `takeOff`), Ladle; what a thing holds is shown (`Stack.water`, `Stack.of`, `holdsOf`, `StackIcon`). The recipe book appears with the first recipe.
    - **Every go at a mini-game is written down** (`plays.ts`: fishing with its seed and holds, the hoe, the stirring, the scrubbing), for boards and skills later.
    - **The test window** (`TownTest.tsx`, the Test button): every thing with every number (what it is used as, where it comes from, its recipe, its hint), to conjure; coins, stamina, slots, the clock, the well. **Dev only**, as he asked to have confirmed: the button and its lazy import sit behind `TRIAL`.
    - **Before any of it opens:** the same rules as database functions, the database deciding every outcome (rule 4 below); then look at a production build's chunks again.
    - **Known cost to settle before pushing:** the icon picture every visitor to the town loads grew to 320 KB with the items' and the pots' pictures in it (411 icons), none of which a production build shows yet. Cut it in two (the town's own signs; the things) before the things are needed there.
  - **the Popoto Board** (`BOARD`, `lib/town/board.ts`, `TownBoard.tsx`) north of the fountain: the building news on its paper, a "!" until you vote; a tap opens the panel with the shop's progress and the vote for the next building (v103: `town_vote`, `town_vote_tally`, `town_my_vote`);
  - countryside all round: woods, rocks, flowers.
  - The layout comes from a fixed seed (`PROPS`, `BENCHES` in `world.ts`, pure and tested).
- **life in town, from the clock alone** (everybody sees the same, nothing sent):
  - popoto outings by the hour (`lib/town/popotos.ts`): morning a runner with toast, noon a picnic, evening football or badminton, late night a tired office popoto; about one every nine minutes in their hours. `?townPopoto=lunch` brings one out in `next dev`;
  - birds in the trees, butterflies round the flowers, a dog chasing a cat (`lib/town/critters.ts`); none in the rain, birds and butterflies by day.
- **Bangkok's weather, unannounced, the same for everybody** (`lib/town/weather.ts`, `lib/town/skies.ts`, `app/api/town/weather`; v118, ran 2026-10-04: the site wrote its first quarter hours within two minutes of it). Until 2026-10-04 every page asked a cached answer in its own time and eased towards it from when it was told, and two members side by side could be twenty minutes apart, one in the rain and one in the sun (the owner: "คนเห็นสภาพอากาศไม่ตรงกัน"). Now **the database keeps the weather in quarter hours** (`town_weather`: each written once and never changed, the next ones three ahead of their time), **the site writes them** when a page asks it to (the route asks Open-Meteo's `minutely_15` for those since the newest kept, a week back at most, and inserts with its own key; nothing a caller says is believed), and **every page reads them** (`town_sky`) and draws by the database's clock: `effectsAt(slots, now)` is a pure matter of the slots and the clock, the turn from one quarter hour's weather to the next included (`TURN`: clouds and the dark gather before the turn, the rain comes on it, the puddles last ten minutes after it stops). `SKIES` is what the page keeps of it; whether it rains is the database's word (`SKIES.raining()`), not what is drawn. Where the database has none to give (the migration not run, nobody to write it) the route answers the old way and the page holds that one answer. `next dev`'s `?townWeather=rain` forces one, rain without end when it is a wet one. What it looks like:
  - **fine:** the trees sway gently (only that: the owner turned down trees shaking in the gusts), and pixel leaves move in the world, not on the screen: some drop from the trees in view and lie under them a while, others blow in from the windward side, spinning, most of them in gusts that also stir the fallen ones. A gust is as hard as the day is windy;
  - **cloud shadows by day** (`lib/town/clouds.ts`, pure and tested; the owner, 2026-10-03: "เงาเมฆเคลื่อนตัว ตอนเช้า"): soft, a little blue, multiplied over everything, drifting the way the leaves blow and faster in more wind. A few on a clear day, most of twelve under cloud (`Effects.clouds`); none by lamplight (`sunOf`), in mist, or under heavy rain;
  - **light rain is only rain** (the owner: "ถ้าฝนตกเบาๆ ก็มีแค่ ฝน แต่ยังรู้สึกเช้าเหมือนเดิม"): streaks in three depths, rings where it lands, puddles, and the hour's own light;
  - **heavy rain is as dark as night** ("ถ้าฝนตกหนัก ให้ทำฟ้าครึ้มเหมือนเป็นตอนกลางคืนด้วย"): `Effects.gloom`, from the gauge (`heaviness`: light under 0.6 mm a quarter hour, heavy from 1.9; a storm always). `overcast` in `lib/town/daylight.ts` darkens the hour's tint to `STORM_TINT` and lights the lamps; at night nothing gets darker;
  - mist hazes.
  - `?townWeather=clear|windy|cloudy|fog|drizzle|light|rain|heavy|storm` in `next dev`, with `?townHour=`. `window.__townView.sky()` says what is drawn.
  - **A lesson:** `draw`'s `dt` is seconds. The weather took it for milliseconds until 2026-10-03, so the rain hung in the air, no leaf ever landed (they piled up instead), and a change in the real weather took hours to show. Nothing failed; only `__townView.leaves().down` staying at 0 gave it away. When something that should move is added, measure that it moves.
- **music by the hour, made with Suno** (`lib/town/music.ts`, `lib/town/music.json`, `TownMusicButton.tsx`; since 2026-10-04, in place of the lofi synth that was composed in code): open, sparse pieces "that need not be listened to". The owner's words, the Suno settings and every hour's prompt are in `scripts/music/suno-prompts.md`.
  - **A piece** is an MP3 in `public/town` named by its content (`music-HH-<hash>.mp3`, about 2.3 MB for three minutes), built from the owner's WAV by `scripts/music/build-music.mjs` (reads `scripts/music/work/HH.wav`, a folder git does not keep): every piece brought to one loudness, a pause of three seconds left after its last sound, tags taken off. ffmpeg is not in the project; the script's head says how to get one.
  - **Which piece an hour plays** is `pieceAt` (pure, tested): its own if it has one, or else the nearest of its part of the day (night 22–05, morning 06–11, afternoon 12–17, evening 18–21). Four so far (08, 16, 19, 23), one to a part; a new piece only has to be built to take its hour.
  - **The player** is one looped audio element through a Web Audio gain (a phone ignores an element's volume, and lets an element play again later only if a tap started it). It begins where the clock is, so nobody always hears a piece's opening; a new piece comes in after the old has faded away, never over it. The slider is `gainOf` (volume to the power 1.5): at the 0.3 it starts at the pieces are as loud as the synth was there, measured in the town.
  - On and soft by default, starting with the first tap; on/off and volume kept on the device.
- **every icon is pixel art made for the town** (`TownIcon.tsx`, `lib/town/icon-atlas.json`, built by `scripts/pixel/build-icons.mjs`): no emoji anywhere in Cash Town.
- **typing shows "…"** over your head (`Doing.typing`, told once and again every 6 s at most, gone after 10 s without word).
- **zoom out stops at about the town's width** (`MOST_TILES_ACROSS`, `MIN_SCALE` on a phone).
- **all of it in pixel art** (`lib/town/scenery.ts`, built by `scripts/pixel/build-scenery.mjs`):
  - AI-made props at the characters' pixel size;
  - top-down ground textures laid onto the isometric ground in 512 px chunks, as they come into view;
  - the fountain's water in drawn frames.
- **sitting:** tap a bench (anywhere on its picture; the cursor turns into a bench over one) to walk up and sit, or sit on the ground where you stand from the **emote window** (the smiling bubble above the microphone): `Doing.sit` is an index into `BENCHES`, `SIT_HERE` (−2) on the ground, or −1. Walking anywhere gets you up. The sitting pose is drawn on the ground; a bench lifts it onto its seat.
- **the custom cursor** is drawn on the canvas from the icon atlas (arrow, hand, bench, fist), two CSS pixels to a picture pixel.
- **day and night by the real clock** (`lib/town/daylight.ts`, Thai time, pure and tested): the scene is multiplied by the sky's tint and the lamps glow from dusk. A clock (`TownClock.tsx`) sits beside the Cash Town pill. In `next dev`, `?townHour=21` shows any hour.
- **a close start** (`START_DESK` 1.6, `START_PHONE` 1.3), with the camera following you;
- tap to walk, with the A\* path computed the same way on every client;
- **one room where everybody in voice hears everybody**, at full volume
  wherever they stand (the owner's call). Distance-based hearing is kept
  behind `PROXIMITY` in `world.ts`, with `pickLines` (nearest first, at most
  `MAX_LINES`) and its tests, for when the town grows;
- a peer-to-peer voice mesh, STUN only, no TURN relay yet;
- at most `ROOM_CAP` (30) people; the 31st is told the room is full and gets
  in by themselves when somebody leaves;
- a 📊 panel with each voice line's RTT, jitter, loss, kbit/s and path;
- **a stay that outlives the page** (`lib/town/session.ts`): another page of
  the site keeps you in town and talking, with the dock (`TownBar`) at the
  foot of every page (a member who may go in but is not there gets a door to
  the town in the same place, `TownDock`, read from the profile row
  `AdminProvider` already fetches: `canEnterTown`), and others see you as "on another page" (`away`). A
  reload, or a link that loads a whole page, resumes it by itself, microphone
  included, if the tab was in town within `RESUME_MS` (a minute; sessionStorage,
  `lib/town/active.ts`), so reopened tabs never walk anybody in. Leaving is
  the town's button or the dock's ✕, or closing the tab;
- **typed chat** (`lib/town/chat.ts`): a bubble over the speaker's head for a
  few seconds, a short log over the map, and the dock's chat with an unread
  count on other pages. Never stored, cleaned on the way in and out, paced by
  room size (`chatEvery`, like `moveEvery`);
- **the page as a game screen** (redesign, 2026-10-01): the map fills the
  window under the header and runs under the phone's tab bar, with a
  fullscreen button; small controls in the corners, so chat (a slim bar, a 💬
  button on a phone) and the microphone never cover the town; wheel, pinch
  and button zoom, drag to look around (`lib/town/camera.ts`, pure and tested);
- **avatars are pixel dolls of the game's races** (`lib/town/pixeldoll.ts`, `lib/town/look.ts`;
  since 2026-10-02):
  - **The races:** the Lalafell first; the others each have their own picture (`public/town/pixel-<race>-<hash>.png` and `pixel-<race>.json`, built by `scripts/pixel/build-race-atlas.mjs` from sheets made by `gen-race.mjs`) and open in the wardrobe when `race-data.mjs --open` writes them into `lib/town/races.json`. Each race is drawn whole at one scale, its body (feet to the top of the head, ears left out) at the game's own height against a Lalafell, with the Lalafell drawn at `LALAFELL_SIZE` (0.6) so the tallest fit the map: the owner's call, after trying chibi heads and squeezed heights. The builder refuses a doll with a missing pixel (every step, every eye shape; `--allow-holes` to look anyway): "ห้ามให้มีจุดผิดพลาดเด็ดขาด".
  - **The look:** male or female in the game's own starter outfit (Lalafellin attire), with the character creator's own hairstyles: 14 for girls, 13 for boys, each gender its own list. Also 26 hair colours, 8 skins, 6 eye shapes and 18 eye colours, chosen in the wardrobe (`Wardrobe.tsx`; free, change any time).
  - **The wardrobe** lists every race; those not built yet are locked.
  - **The art:** one picture, `public/town/pixel-<hash>.png` and `pixel.json`, built by `scripts/pixel/build-pixel-atlas.mjs` from AI sheets (see its README).
  - **Walking:** four steps each way, three-quarter front and back, mirrored for the left. Each step's body carries one head cut from the standing step, so hair and faces never shimmer.
  - **The face:** blinks, and the mouth opens while the microphone hears them.
  - **Layers:** body, then face (per gender × eye shape), then hair. Skin is one ramp of exact colours, found on the bodies by an AI skin-key copy (cyan skin) read with care (`scripts/pixel/README.md`, the last section), so the tan boots never change with the skin.
  - **Colours are painted once per pixel** (`paintKeys`): an exact ramp colour is skin; otherwise violet is an eye; otherwise green is hair, or fur on Miqo'te and Viera. (Eyes first and fur after turned green and olive eyes into the hair colour on those two; a member reported green eyes that stayed pink, 2026-10-03.) A hair piece's skin, an ear or a horn through it, is painted too.
  - **Sitting wears the same head as standing:** the pose's own head is cut out by the builder and the shared one laid in its place.
  - **The look string:** eight characters (`"5"` + race + 6 digits) in `Doing.look`; versions 1–4 are still read (as Lalafell). It is told to the room once the wardrobe settles (`LOOK_SETTLE_MS`) and kept on the device (localStorage).
  - **Nobody chose?** They get a look of their own from their id.
  - **Profile pictures** are only in the card a tap on somebody opens; names are on the map.

The code is in `components/town/` (`Town.tsx` the map, `TownGate.tsx`,
`TownBar.tsx` the dock, `TownDock.tsx` the few lines in the root layout that
load the dock only for a tab in town and show the door to everybody else who
may go in, `Wardrobe.tsx`) and `lib/town/`
(`world.ts`, `chat.ts`, `active.ts`, `look.ts` and `camera.ts` are pure and
tested; `session.ts`, `voice.ts`, `room.ts`, `pixeldoll.ts`). In `next dev`,
`window.__townView.screenOf(id)` says where somebody stands on the screen, for
scripts that tap them.
The account menu links to it. In `next dev`, `/town?townTest=A` opens a public
test room with no sign-in, and `&townCap=N` makes it full at N (production
compiles both away).

**How the room talks** (`room.ts`). Written around the Supabase plan's
limits, because breaking them is what made people drop:
- presence may be updated 5 times per 30s per person, with at most 10 fields;
- every delivered message counts towards 500 a second for the whole project,
  shared with the party board and the bell.

So:
- **presence** carries who you are (name, face, colour), once per join;
- **room broadcasts** carry what you do: `hi` on arriving (with where you are,
  your microphone, and whether you are on another page), `mv` for a
  destination (every 300ms at most, less often as the room fills), `st` for a
  change, `bye` on leaving, and `chat` for a typed line;
- **letterboxes** carry what is for one person: a private channel per member
  (`<room>:u:<id>`; anybody in the town may post, only the owner may read)
  for the replies to `hi` and the two messages that connect two microphones
  (non-trickle ICE: an offer and an answer, no candidate stream). It is
  plumbing, not a room anybody can be in.

The prototype uses Supabase Realtime instead of the Durable Object
recommended below, because the site is not on Cloudflare yet. Fine for a beta
of one room. Move to a Durable Object, which checks the session itself
(rule 4), before the town is more than that.

**Proving it still works after a change.** The scripts are in `scripts/`.
They print PASS or FAIL lines, and none prints a key, token or the room
name.

| Script | What it does | What it touches |
|---|---|---|
| `node town-e2e.mjs http://localhost:3100 <out> [two\|crowd\|all]` | Headless Chromes with fake microphones on the `next dev` test room. Two: enter, see each other, walk, voice both ways, still full volume from opposite corners, the 📊 panel, **a tab frozen 75s and a network cut 40s, recovered without a reload**. Then six: everybody hears everybody (15 lines), a seventh is turned away by a full room and gets in later, and leaving is timed: closing the tab, a killed browser, walking off to another page. 28 checks. | nothing |
| `node town-stay.mjs http://localhost:3100 <out>` | Two Chromes on the dev test room: typing both ways; another page in the same tab keeps the same stay (the dock shows, others see "on another page", voice keeps flowing); a line arriving there is counted and read from the dock, which replies; back to the map with nothing reconnected; a reload on the map and on another page each resume with the microphone; leaving from the dock is gone in 0.1s and stays gone after a reload. 24 checks. | nothing |
| `node town-live.mjs full <out> [--freeze] [--crowd N]` | Production with **throwaway verified members (not admins)**: enter the private room, talk, opposite corners, one closes the tab. `--freeze` sleeps a tab 75s; `--crowd N` fills the room to N in voice. **Refuses to run while real members are in the room** (the probes' fake microphones beep into everyone's ears); `--even-if-busy` overrides. | creates the accounts and deletes them in `finally` |
| `node town-who.mjs` | Production. How many are in the room now, and whether any are test probes. Listens without being listed, prints counts only. | nothing |
| `node town-pixel.mjs http://localhost:3100 <out>` | Two Chromes on the dev test room. The pixel atlas loads. A dresses in the wardrobe (boy, bob, ruby hair, amber eyes, turning around), and B sees exactly that look. Screenshots of A walking and standing from B's zoomed view, plus no page errors. 11 checks. | nothing |
| `node checks/sky-check.mjs` (in `scripts/pixel`) | The dev test room in each weather at 10:00, with pictures: clouds cast shadows by day and drift; light rain keeps the day's light, no lamps; heavy rain and storms are as dark as night, lamps lit, and the rain lands; at night no sun; leaves reach the ground and never heap up. 17 checks. `checks/sky-film.mjs <weather>` saves a few frames in a row. | nothing |
| `node checks/look-check.mjs <base> <out> <look,…>` (in `scripts/pixel`) | Looks in the dev test room, close up: standing, sitting on the ground and on a bench, photographed. Green and olive eyes are counted on the screen against the same look with other eyes (a fur colour once took them). | nothing |
| `node town-gate.mjs http://localhost:3100 <out>` | Two Chromes on the dev test room. A taps the town's gateway, walks to the gate and comes out in the farm; B, still in town, sees A there at once; A walks about the farm and B sees where; a tap on the farm's gateway brings A back. 10 checks. | nothing |
| `node town-trade.mjs http://localhost:3100 <out>` | One Chrome, wide then as a phone, on the dev test room: the banker changes the week's twenty popoto into a hundred coins and then refuses more; the uncle's shelf is laid out by kind, has only the basic things on it, and sells a rod (one a round) and five worms into the bag; the worms are left to be sold, nothing is paid until the round is brought on, then the uncle says the money has come and it is collected; the bag button shows the coins; his order of the day is three things, bringing them pays on the spot, and the order filled puts a new thing on the shelf; a chat ends with nothing to choose; the scroll of the cure for pests on the first day's shelf of twenty-two; the stall says when the relatives come next and counts down to it (and, with something left, what it will fetch), then to the round after. 56 checks. | nothing (the trial is the browser's own) |
| `node town-fish.mjs http://localhost:3100 <out>` | One Chrome on the dev test room: where a line can be dropped from (the deck's riverward part, the bank) and that the way to begin shows only with the rod in the hand; only held baits offered, nothing said of what they bring; a strike too soon, a bite left alone, a snapped line and a slipped hook; the fight by the space bar; the catch into the bag and onto the record; the hand, the test window, the bag opened; every go written down; a meal and a scroll. 40 checks. | nothing (the trial is the browser's own) |
| `node town-farm.mjs http://localhost:3100 <out>` | Two tabs of one Chrome (two testers, one farm): scattered weeds of many kinds; the hoe by the game of timing; a seed makes the bed the sower's, by name, and only what was sown shows; a fertiliser keeps pests off (the check would otherwise hang on the hour it runs at); an empty can waters nothing; a bucket drawn at the river, poured into the well, the can filled; the other waters too; ripe at its fifth stage, picked, bears again; four days untended and the bed is anybody's; the test window's show garden (26 plants at 5 stages), a fortnight on all ripe, cleared; with no stamina the hoe dropped at the third miss and the plot left as it was, and sowing, watering and drawing water each a short round (dropped with nothing lost, written down), done at once again with stamina; in somebody's bed a hoe clears the weeds for the stamina it costs anybody, the bed still its owner's, and a seed is offered nothing. 61 checks. | nothing |
| `node town-cook.mjs http://localhost:3100 <out>` | Two tabs of one Chrome: cooking offered only at a place with cookware in the hand; no recipe to pick; the stirring dressed as a ladle round a pot; the wrong things an odd dish, in the yard's own pot, with its taste (one thing too many; the wrong amounts); a pot of tom yum, its recipe found under the finder's name; having made it, told when the cookware is wrong; a basket woven and worn; a helping ladled into a bowl, which leaves the bag with it, and none without a bowl to spare; the pot set down, the other ladling a bowl to a helping; its last helping out, the pot gone from the ground (no dirty pot, nothing to wash); a helping eaten up gives its bowl back; a dish for two an odd dish alone and cooked together; the scroll read whole by its cook and short of its last thing by the other; the uncle's hint; the stirring's stretch twice the hoe's, and three quarters of that with no stamina; the scroll of the cure for pests bought, read into the book, and the cure cooked. 49 checks. | nothing |
| `node town-db.mjs http://localhost:3100 <out> [http://127.0.0.1:3199]` | **The game as a member will play it.** Two tabs of one Chrome on the dev test room, kept by the database's keeper against the stand-in (`scripts/db/town-bench.mjs`, started first in a scratch folder: see `scripts/db/README.md`): the bank through its panel (twenty popoto, a hundred coins, the board counting twenty fewer, no picture side, no trial's foot), a rod and worms bought at the stall, a strike too soon, a fish hooked by the database's clock and fought, a plot cleared, tilled and sown that the other sees within moments, a dish cooked and its pot ladled from by the other, a deal of things and coins; and, first, the game shut and then opened, beginning from the building sites as production does. 35 checks. | the stand-in only |
| `node town-sky.mjs http://localhost:3100 <out> [http://127.0.0.1:3199]` | **The same sky for two.** Two tabs kept by the database's keeper against the stand-in (with v118): the stand-in is given fine weather, then heavy rain, and its clock put a little before the turn. Both tabs have its clock and its weather; before the turn clouds gather and the light goes on both alike with not a drop yet; after it both are in the rain alike, and it rains by the database's word; a plant is wet for both and a can offered nothing (asked all the same, refused, no water used); past the rain the can waters, and the plant has a quarter hour more growth for half an hour of rain. Then the trial with `?townWeather=rain`: what is sown is wet at once, and a six-hour morning glory is ripe in a little over four. It waits a change of weather out (four minutes). 21 checks. | the stand-in's weather and one plot, put back |
| `node town-deal.mjs http://localhost:3100 <out>` | Two tabs of one Chrome: no way to trade on the card of somebody far off; opened from the card of somebody near; things laid out and taken back by tapping; one side changing takes back both words; with both words everything changes hands and both are told; a full bag refuses the lot; called off by one, off for both; a pot of food goes with its food; coins laid beside the things with a tap, never more than the purse has, changing hands with them. 18 checks. | nothing |
| `node music/music-check.mjs http://localhost:3100 [hours]` | One Chrome on the dev test room: silent until the first tap anywhere, which starts the music at its soft volume; at its end a piece begins again; then at five hours of the day a piece of the town's plays from where the clock is, softly and without clipping; the slider is the volume; off stops it and on brings it back; an hour of the same part of the day keeps the piece and one of another part brings its own after the old has faded. 38 checks. The check's Chrome plays without a tap, so what a browser refuses before one is not tried. | nothing |

Every `town-*.mjs` on the dev test room opens `?townTest=<letter>&townRoom=check`: a room of its own (`TownGate.tsx`, dev only), because the owner tries things in the plain test room as "ทดสอบ A", and his avatar at the yard with cookware in its hand was once counted among a check's cooks. A new check does the same.

| `node town-isolation.mjs` | Production. Unverified: told no name, refused even with it, cannot post. Verified: told the name, let in, refused somebody else's letterbox but can post into it. A public channel with the same name hears nothing. | three throwaway accounts, deleted |

**Leaving, timed** (dev, 2026-10-01): closing the tab or going to another
page, gone from everybody else's town in about 0.2s, voice on or off; a
killed browser, about 5s (the room notices the dropped connection, then
`GONE_MS`), which is also what headless Chrome's `Browser.close` gives,
because it does not run the page's handlers; a frozen tab or a sleeping
laptop, about a minute, because only the server's own timeout notices
those.

**Lessons, all kept in the code:**
- **A hidden tab's keep-alive** (fixed in `df9aead`). Browsers slow a hidden
  tab's timers to about once a minute, the keep-alive misses its turn, and the
  server hangs up. The town has its own client (`townClient`) with `realtime:
  { worker: true }` and an `accessToken` callback; a watchdog rejoins if the
  room isn't back within 10s, and at once on `visibilitychange` or `online`;
  every voice line carries a `pc` id, so an offer from a new one replaces the
  old line, and a line down for 15s is replaced.
- **A goodbye has to beat the realtime client's own `pagehide`.** Phoenix,
  underneath realtime-js, hangs up the socket on `pagehide`. A goodbye sent
  after that falls back to HTTP, which the browser cancels on a closing page.
  Listeners on `window` run in the order they were added, capture or not
  (tried in Chrome), so `TownSession` adds its listener before it creates the
  town's client. `cast` never sends while the socket is down, so nothing
  falls back to HTTP quietly.
- **A goodbye hides, the room removes.** `bye` hides somebody at once; they are
  removed when presence agrees, and shown again if presence still lists them
  after `BYE_TRUST_MS` (another tab of theirs).
- **A resumed microphone may play nothing at first.** After a reload the
  microphone comes back without a tap where the browser remembers the
  permission, but playing what arrives can still need one (autoplay):
  `VoiceMesh.audioBlocked`, a "tap to hear" button, and any tap on the page
  resumes it.
- **Hello only when the letterbox is open.** The replies to `hi` go there; one
  sent before it opens is lost, and a newcomer who missed who has a
  microphone on would hang up on every line the others opened.

The tests run on one machine, so they prove signalling and media but not NAT
traversal. The owner and Aqua talked across their own networks, so P2P worked
for them; some mobile networks will need TURN.

The planning sections below still apply to everything beyond the prototype.

Read [references/vision.md](references/vision.md) first: where the idea comes
from (a member's proposal in feedback #12, and the owner's direction), what
Zheza and Gather do well, the proposed pillars, and the open questions.

## Rules that hold from day one

1. **The site stays fast.** The town lives at its own route with a
   lazy-loaded bundle. Nothing about it ships to other pages (fc-perf).
2. **The town is a front door, not a second site.** Buildings link to the
   pages that exist, and the plain site keeps working for whoever prefers it.
3. **Popoto can be spent** (the owner's call, 2026-10-02: "เปลี่ยนกฎ project
   เป็น popoto สามารถใช้จ่ายได้"). The shop, seeds and decorations may cost
   popoto. Spend from a balance; the lifetime count of popoto received is the
   record of being thanked and never goes down. Prices, balances and every
   deduction live in the database (rule 4). Rare popoto become pets without
   being consumed (fc-game-design economy.md).
4. **Server authority.** The room server decides movement and chat. The
   database decides growth, harvests, rewards and caps, from server time.
   The browser is never trusted with a number.
5. **Safety by default:**
   - Only a verified character can enter, talk or build (v85).
   - The microphone starts off, and joining voice is a choice.
   - Mute, block and report are always one tap away.
   - Nothing is recorded.
   - Private areas really are private.
6. **Kind game design.** Nothing dies or decays while you're away. No
   streaks to lose. Competition is opt-in, and pet fights never cost a pet
   (fc-game-design).
7. **The cost is checked before shipping anything realtime.** Run
   `node .claude/skills/fc-cash-town/scripts/town-cost.mjs` with the
   expected numbers. Click-to-move, a Durable Object per zone and the
   Cloudflare SFU keep it near the 5 US dollars a month the Cloudflare move already
   pays. Streaming positions over Supabase Realtime does not work at all
   ([references/costs.md](references/costs.md)).

## Recommended defaults (decided in the spike, not here)

| Decision | Default | Why |
|---|---|---|
| 2D or 3D | **2D isometric** | the Zheza feel, phone-friendly, light; the admin's lag worry |
| Renderer | **PixiJS v8 or Phaser 4**, picked by a one-evening spike | Pixi is lean (WebGPU first); Phaser is a full framework (stable since 4.0, April 2026) |
| Map editing | **Tiled** (isometric) → JSON | non-programmers can build districts |
| Movement | **Click or tap to move, deterministic A\*** | one message per click instead of a stream |
| Room server | **A Cloudflare Durable Object per zone**, with WebSocket Hibernation | it fits the Cloudflare move; outgoing messages free; idle costs nothing |
| Lasting state | **Supabase tables + RPCs** (fc-migration) | RLS, the verified rule, auditable |
| Voice | **Mesh P2P with proximity for the spike and phase 1 → Cloudflare Realtime SFU** when groups grow | free to start; scales without changing the proximity logic |
| Sign-in | **The Supabase JWT verified in the Worker,** plus a verified-character check | one identity across the site and the town |

The details: [references/architecture.md](references/architecture.md) (the
shape, iso maths, netcode, a Durable Object sketch, auth, tables, budgets) and
[references/voice.md](references/voice.md) (mesh or SFU, who hears whom, Web
Audio distance, phone quirks, safety).

## Workflows

### A. When the owner says "let's plan Cash Town"

1. **Answer the open questions** in vision.md together: who enters, the peak
   number of people, whether voice is in v1, the avatar style, the art
   pipeline, phone or desktop first, moderation, the currency, pets and
   fights, and the budget. Ask in one batch, and propose defaults.
2. **Fix the pillars** (three or four) and the MVP. The MVP is the smallest
   thing that's fun: one district, avatars walking, name tags, chat bubbles,
   and buildings that link to pages.
3. **Run the cost model** with their numbers, and show the table.
4. **Write the plan** with the GDD template below.
5. **Shape each system** with fc-game-design: the farm, homes, pets, the
   mall. Use [references/minigames.md](references/minigames.md) as the
   starting designs.

### B. A tech spike (the first code)

Its goal is to answer "is it smooth on a mid-range phone, and what does an
hour cost?" before building features.

1. Build a throwaway route or a separate worktree, never shipping by
   accident. Use one Tiled district, with 20 fake avatars wandering by
   click-to-move.
2. Run a Durable Object zone on `wrangler dev`. Open two browsers; then 20
   fake clients from a script.
3. Measure:
   - fps on a phone (Chrome remote debugging), and memory after 15 minutes;
   - the size of the first-load bundle;
   - the messages per minute;
   - for voice: mesh between two phones, with delay, echo and battery.
4. Report a table of numbers against the targets (60 fps with 30 avatars,
   about 1.5 MB on first load, no audio dropouts), and a recommendation:
   Pixi or Phaser, mesh or SFU.

### C. Building a phase

**The phases:**

| Phase | What it adds |
|---|---|
| 0 | the spike |
| 1 | one district, presence, chat, links |
| 2 | proximity voice and private areas |
| 3 | homes and decoration |
| 4 | the farm, pets, the mall, and the coins economy |
| 5 | mini-games and seasonal districts |

**Each phase:**
- ships admin-only first, then to volunteers (fc-game-design's playtest
  guide);
- runs through fc-security (voice, uploads and chat are new attack surface);
- goes through fc-migration for tables;
- gets the fc-perf budget checks.

## Output: the plan (GDD-lite), in Thai when the user writes Thai

```
# Cash Town — แผน <phase>
**เสาหลัก:** 1… 2… 3…
**MVP ของเฟสนี้:** … (what a member can do, in one paragraph)
**ประสบการณ์ 2 นาที / 30 นาที:** what a quick visit feels like, and what a long one does
**ระบบ:** each system with its loop, its economy and its knobs (via fc-game-design)
**เทคนิค:** renderer · room server · voice · tables · auth (decisions + why)
**ตัวเลขเป้าหมาย:** fps / first-load MB / people per zone / monthly cost (from town-cost.mjs)
**ความปลอดภัย & ความเป็นส่วนตัว:** who enters, mic defaults, block/report, moderation
**งานศิลป์:** list of sprites/tiles/UI with the pipeline
**ความเสี่ยง:** top 3 and what we do if they happen
**แผนทดสอบ:** admin → volunteers → everyone; the signal after 2 weeks
```
