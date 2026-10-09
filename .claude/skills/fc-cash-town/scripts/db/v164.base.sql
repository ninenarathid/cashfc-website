-- v164, the base: what every other part of the far side stands on. The far side is the mountain over the bridge:
-- its trees (lib/town/trees, lib/town/felling) and its rocks, with the cave under it (lib/town/mining, lib/town/cave,
-- lib/town/vein). Tried by try-v164.mjs on the stand-in's snapshot. Safe to run twice.
--
-- THE BLACKSMITH IS NOT HERE. Smelting, forging, gems set in a tool, a forging moved to another tool and the great
-- fire come with a migration of his own, later (the owner, 2026-10-09: the first opening is the mountain with mining
-- and felling only). So this file makes no table for a member's smithy, no row for his board and none for the great
-- fire, and no rule of his. What IS here of forging is only what a pick or an axe is read by from the first day,
-- while every tool is still as it was bought: the readers of what a tool carries, and the catalog row they read.
--
-- What this part gives the others, in the order of the file:
--
--   1. THE CATALOG. Four rows seeded (`forge`, `trees`, `mining`, `pouches`) and eight written over (`items`,
--      `goods`, `shelf`, `hints`, `makes`, `cooking`, `work`, `gifts`): every row that differs from the database as
--      it stands. The block is written from lib/town/catalog.ts (fill-catalog.mjs v164 <this file>).
--   2. THE GATE. The knob `far_open` (0: built closed). `town.far_member()` is what every function of the far side
--      that a member calls begins with, in the place of `town.member()`:
--          me uuid := town.far_member();
--      It answers an admin always, and a proved character only while the game is open (v115's knob) AND `far_open` is
--      above nothing; everybody else is refused (42501), as `town.member()` refuses. `public.town_far()` says the
--      same as a yes or no: the page asks it once, so that nobody is refused anything. Opened from the SQL editor:
--          update public.town_knobs set value = 1 where key = 'far_open';
--   3. WHAT IS KEPT.
--      · `grove`, a row of `town_things`: the trees as lib/town/trees' `Grove` has them (`down`, `half`, `goes`,
--        `book`). Read and held with `town.thing('grove', <hold>)`, kept with `town.keep_thing('grove', <doc>)`.
--      · `town_cave_days` (`day`, `floor`, `layout`): a floor of the cave on a day, as lib/town/mining-row's
--        `caveLayout` makes it (`rocks`, `open`, `up`, `arrive`, `down`, and a resting floor's `lift` and `liftAt`,
--        all in the world's tiles). The site's server writes a day's thirty with its own key, as it writes the
--        weather: it may insert, today's and tomorrow's, and no more; what is kept stays kept. No browser reads the
--        table. `town.cave_laid(day, floor)` gives the rules a floor, and `town.cave_is_laid(day)` says whether a day
--        has every one of its floors. (The columns are called as the site writes them, and `day` and `floor` are
--        words a rule is apt to call its own variables: a rule reads a floor by those two functions and needs no
--        statement on the table itself.)
--        THE WORD `unlaid`: whatever reads a day's floors for a member answers `town.no('unlaid')` when that day's
--        floors are not all there yet, and does nothing else. The page then asks the site once to lay the day, and
--        asks again. `public.town_cave_days()` answers so here; every function of the miners' part that reads a
--        floor answers the same, before it holds or changes anything.
--      · `town_cave`: what the village shares of a place, a row a place (0 the mountain's foot, 1 to 30 the cave's
--        floors). Its document is lib/town/cave-state's `CaveState` for that one place, WITH ITS DAY IN IT, as the
--        code keeps it: `day`; `way` (the way down open from this floor, or null); `crystal` (who broke the day's
--        crystal rock, where it stood here); `broken` ({turn, ids}); `struck` ({turn, rocks}); `torches`; `moss`.
--        A document of another day is read as the code's `caveAt` reads one: nothing of it is thrown away by a
--        DELETE, a row is only ever written over. (The board of the deepest floor is the open way of the highest
--        floor that has one: it is read off the rows, and kept nowhere of its own.) `town.cave_kept(place, <hold>)`
--        reads and holds, `town.keep_cave(place, <doc>)` keeps.
--      · `mine`, a word in `town_secrets` (v125's table), which the rocks' rolls hang on: `town.mine_word()`.
--      · Nothing for a log: a go is a deed (`town.note`), as everywhere.
--   4. THE READERS OF A TOOL (lib/town/tools), THE POWERS (lib/town/powers), THE POUCHES (lib/town/pouches).
--   5. WHAT A FORGED TOOL MEANS TO THE RULES THAT WERE THERE (lib/town/trade's `forged`), and THE CAPS: a gem and a
--      gem's fragment have a most of their own at a stall and on the board (lib/town/notices' `dearOf`).
--
-- THE ORDER ROWS ARE HELD IN, for every part of this file and of the smith's after it. A function that holds more
-- than one row takes them in this order and in no other, so that no two members ever wait on each other:
--
--   (1) the village's rows first: `grove`, or a place of `town_cave` (of two places, the lesser first); never both
--       a tree's and a rock's in one call;
--   (2) then members' purses, by their ids, the lesser first (`town.purse_of(<id>, true)`);
--   (3) then whatever else is a member's own (a row of a later table).
--
-- A function that reads without holding (`town.thing(…, false)`, `town.cave_kept(…, false)`) takes no place in it.
--
-- NUMBERS WITH A FRACTION ARE `double precision`, as the code's are: a share read out of the catalog and multiplied
-- in `numeric` rounds otherwise than the code does (twenty less 0.35 of twenty is thirteen and a hair in the code,
-- and so fourteen when rounded up; in `numeric` it is thirteen). `town.gem_by` and `town.opt_n` answer in it for
-- that reason, and whatever is worked out from them is worked out in it.
--
-- Eight functions that were there have a small marked block more each: the six that a forged tool is no plain thing
-- to (`town.plain`, `town.take_plain`, `town.push`, `town.jar_drop`, `town.leave`, `town.hold`) and the two caps
-- (`town.shop_cap`, `town.notice_cap`). NOTHING OF THEM IS PASTED HERE: v164.base.lines.mjs says the lines, and
-- build-v164.mjs builds each statement from the function's own text as the database then has it (a file that runs
-- before v164 may have written it again), into the empty places marked below.

do $$
begin
  if to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null or to_regprocedure('town.gifts_of(jsonb)') is null
     or to_regprocedure('town.stretch_at(jsonb, bigint)') is null or to_regprocedure('town.hand_of(jsonb)') is null then
    raise exception 'v121, v151 and v153 have not all run yet: the far side writes its deeds down, gives its lines'' gifts, and counts a power by the day';
  end if;
  if to_regprocedure('town.shop_cap(text, jsonb)') is null or to_regprocedure('town.notice_cap(text, jsonb)') is null then
    raise exception 'v143 and v144 have not both run yet: the most a gem may be asked for is laid over theirs';
  end if;
  if to_regclass('public.town_secrets') is null then raise exception 'v125 has not run yet: the rocks'' rolls hang on a word kept in its table'; end if;
end $$;

-- ─── 1. The catalog ──────────────────────────────────────────────────────

-- <catalog:v164> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('forge', $town${
    "kinds": ["pick","axe","rod","hoe","can","bugNet","pot","pan","grill"],
    "wooden": ["axe","rod","bugNet"],
    "lines": {"kitchen":["pot","pan","grill"],"farming":["hoe","can"],"fishing":["rod"],"insects":["bugNet"],"mining":["pick"],"felling":["axe"]},
    "forge": {"top":10,"floor":4,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"glow":{"from":7,"full":10},"gemAtTop":1,"cap":3,"maker":24},
    "gemLevels": 4,
    "levels": {"pick":{"power":[3,3.45,3.65,3.7,4,4.5,5,6,7,8.5,12],"strikes":[6,6,6,7,7,7,7,8,9,9,10]},"axe":{"chops":[12,11,11,10,10,9,8,7,7,6,4],"ahead":[3,3,3,3,3,3,4,4,4,4,5],"slow":[0,0,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.5]},"rod":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3],"strike":[1.6,1.625,1.65,1.675,1.7,1.767,1.833,1.9,2,2.1,2.2]},"hoe":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3]},"can":{"waterings":[8,9,9,10,10,11,11,12,13,14,16],"marks":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"bugNet":{"ring":[0.6,0.615,0.63,0.645,0.66,0.69,0.72,0.75,0.8,0.85,0.9],"lands":[300,293,285,278,270,255,240,225,200,175,150]},"pot":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"pan":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"grill":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]}},
    "tries": [{"to":1,"take":100,"stay":0,"down":0,"fee":10,"ore":"shardCopper","n":5,"timber":2},{"to":2,"take":100,"stay":0,"down":0,"fee":20,"ore":"shardCopper","n":8,"timber":2},{"to":3,"take":100,"stay":0,"down":0,"fee":40,"ore":"shardCopper","n":12,"timber":3},{"to":4,"take":100,"stay":0,"down":0,"fee":80,"ore":"shardIron","n":16,"timber":3},{"to":5,"take":90,"stay":10,"down":0,"fee":150,"ore":"oreIron","n":1,"timber":4},{"to":6,"take":80,"stay":15,"down":5,"fee":250,"ore":"oreIron","n":2,"timber":4},{"to":7,"take":70,"stay":20,"down":10,"fee":400,"ore":"oreSilver","n":2,"timber":5},{"to":8,"take":60,"stay":25,"down":15,"fee":600,"ore":"oreSilver","n":3,"timber":5},{"to":9,"take":50,"stay":25,"down":25,"fee":900,"ore":"oreSilver","n":4,"timber":6},{"to":10,"take":40,"stay":30,"down":30,"fee":1500,"ore":"oreSilver","n":5,"timber":6}],
    "smith": {"places":3,"wider":3,"more":[{"timber":20,"coins":200},{"timber":40,"coins":500}],"bellows":{"share":0.1,"each":3,"points":2},"gem":{"mount":"timber","mounts":5,"fee":50},"redraw":{"gems":1,"fee":100},"offer":2,"move":{"share":30,"least":50}},
    "options": {"order":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","axGrain","axDust","axKeen","axResin","axFresh","axDry","rdBait","rdCalm","rdFresh","rdQuick","hoClear","hoFirst","hoFresh","hoLight","cnDrop","cnThrift","cnFresh","cnKind","ntAgain","ntMesh","ntFresh","ntLong","ckFire","ckBase","ckFresh","ckBrisk","pkQuake","pkTwin","pkDrill","pkGleam","axOne","axDouble","axRoot","axElder","rdGold","rdStill","rdCall","hoBoth","hoGrip","hoWet","cnRain","cnFull","cnTwice","ntWide","ntFreeze","ntNest","ckBig","ckWarm","ckScent"],"of":{"pkPeek":{"pool":1,"tools":["pick"],"n":{}},"pkCrumb":{"pool":1,"tools":["pick"],"n":{"every":5,"more":1}},"pkSteady":{"pool":1,"tools":["pick"],"n":{"strikes":2}},"pkLoose":{"pool":1,"tools":["pick"],"n":{"fewer":1}},"pkFresh":{"pool":1,"tools":["pick"],"n":{},"use":{"n":10,"per":"meal"}},"pkCutter":{"pool":1,"tools":["pick"],"n":{"more":1}},"axGrain":{"pool":1,"tools":["axe"],"n":{"ahead":2}},"axDust":{"pool":1,"tools":["axe"],"n":{"every":5,"more":1}},"axKeen":{"pool":1,"tools":["axe"],"n":{"chops":2}},"axResin":{"pool":1,"tools":["axe"],"n":{"in":4}},"axFresh":{"pool":1,"tools":["axe"],"n":{},"use":{"n":5,"per":"meal"}},"axDry":{"pool":1,"tools":["axe"],"n":{"pieces":2}},"rdBait":{"pool":1,"tools":["rod"],"n":{}},"rdCalm":{"pool":1,"tools":["rod"],"n":{"secs":2}},"rdFresh":{"pool":1,"tools":["rod"],"n":{},"use":{"n":5,"per":"meal"}},"rdQuick":{"pool":1,"tools":["rod"],"n":{"shorter":0.15}},"hoClear":{"pool":1,"tools":["hoe"],"n":{"stones":2}},"hoFirst":{"pool":1,"tools":["hoe"],"n":{"misses":1}},"hoFresh":{"pool":1,"tools":["hoe"],"n":{},"use":{"n":10,"per":"meal"}},"hoLight":{"pool":1,"tools":["hoe"],"n":{}},"cnDrop":{"pool":1,"tools":["can"],"n":{"more":3}},"cnThrift":{"pool":1,"tools":["can"],"n":{"takes":1}},"cnFresh":{"pool":1,"tools":["can"],"n":{},"use":{"n":10,"per":"meal"}},"cnKind":{"pool":1,"tools":["can"],"n":{"points":1}},"ntAgain":{"pool":1,"tools":["bugNet"],"n":{"by":0.5}},"ntMesh":{"pool":1,"tools":["bugNet"],"n":{"misses":2}},"ntFresh":{"pool":1,"tools":["bugNet"],"n":{},"use":{"n":10,"per":"meal"}},"ntLong":{"pool":1,"tools":["bugNet"],"n":{"reach":1}},"ckFire":{"pool":1,"tools":["pot","pan","grill"],"n":{"steady":2}},"ckBase":{"pool":1,"tools":["pot","pan","grill"],"n":{"misses":1}},"ckFresh":{"pool":1,"tools":["pot","pan","grill"],"n":{},"use":{"n":3,"per":"meal"}},"ckBrisk":{"pool":1,"tools":["pot","pan","grill"],"n":{"shorter":0.25}},"pkQuake":{"pool":2,"tools":["pick"],"n":{"reach":1},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"tools":["pick"],"n":{"times":2},"use":{"n":5,"per":"day"}},"pkDrill":{"pool":2,"tools":["pick"],"n":{},"use":{"n":3,"per":"day"}},"pkGleam":{"pool":2,"tools":["pick"],"n":{"by":1.5}},"axOne":{"pool":2,"tools":["axe"],"n":{},"use":{"n":10,"per":"day"}},"axDouble":{"pool":2,"tools":["axe"],"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"tools":["axe"],"n":{},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"tools":["axe"],"n":{"by":1.5}},"rdGold":{"pool":2,"tools":["rod"],"n":{"secs":3},"use":{"n":10,"per":"day"}},"rdStill":{"pool":2,"tools":["rod"],"n":{"by":0.5,"mins":5},"use":{"n":2,"per":"day"}},"rdCall":{"pool":2,"tools":["rod"],"n":{},"use":{"n":10,"per":"day"}},"hoBoth":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"hoGrip":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":20,"per":"day"}},"hoWet":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"cnRain":{"pool":2,"tools":["can"],"n":{},"use":{"n":3,"per":"day"}},"cnFull":{"pool":2,"tools":["can"],"n":{"mins":30},"use":{"n":1,"per":"day"}},"cnTwice":{"pool":2,"tools":["can"],"n":{},"use":{"n":10,"per":"day"}},"ntWide":{"pool":2,"tools":["bugNet"],"n":{"reach":3},"use":{"n":10,"per":"day"}},"ntFreeze":{"pool":2,"tools":["bugNet"],"n":{"secs":2},"use":{"n":10,"per":"day"}},"ntNest":{"pool":2,"tools":["bugNet"],"n":{}},"ckBig":{"pool":2,"tools":["pot","pan","grill"],"n":{"more":2},"use":{"n":3,"per":"day"}},"ckWarm":{"pool":2,"tools":["pot","pan","grill"],"n":{"hours":2},"use":{"n":3,"per":"day"}},"ckScent":{"pool":2,"tools":["pot","pan","grill"],"n":{"stamina":10},"use":{"n":3,"per":"day"}}}},
    "built": {"pick":{"opts":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","pkQuake","pkTwin","pkDrill","pkGleam"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"axe":{"opts":["axGrain","axDust","axKeen","axResin","axFresh","axDry","axOne","axDouble","axRoot","axElder"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"rod":{"opts":["rdBait","rdCalm","rdFresh","rdQuick","rdGold","rdStill","rdCall"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"hoe":{"opts":["hoClear","hoFirst","hoFresh","hoLight","hoBoth","hoGrip","hoWet"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"can":{"opts":["cnDrop","cnThrift","cnFresh","cnKind","cnRain","cnFull","cnTwice"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"bugNet":{"opts":["ntAgain","ntMesh","ntFresh","ntLong","ntWide","ntFreeze","ntNest"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pot":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pan":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"grill":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]}},
    "elements": ["fire","water","ice","earth","lightning","wind","light","dark"],
    "gems": {"fire":{"gem":"gemRuby","chip":"chipRuby"},"water":{"gem":"gemSapphire","chip":"chipSapphire"},"ice":{"gem":"gemAquamarine","chip":"chipAquamarine"},"earth":{"gem":"gemAmber","chip":"chipAmber"},"lightning":{"gem":"gemTopaz","chip":"chipTopaz"},"wind":{"gem":"gemEmerald","chip":"chipEmerald"},"light":{"gem":"gemDiamond","chip":"chipDiamond"},"dark":{"gem":"gemOnyx","chip":"chipOnyx"}},
    "smelting": {"fragments":10,"timber":1},
    "smelts": {"order":["oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx"],"of":{"oreCopper":{"of":"shardCopper","mins":5,"fee":5},"oreIron":{"of":"shardIron","mins":8,"fee":10},"oreSilver":{"of":"shardSilver","mins":11,"fee":15},"gemRuby":{"of":"chipRuby","mins":10,"fee":20},"gemSapphire":{"of":"chipSapphire","mins":10,"fee":20},"gemAquamarine":{"of":"chipAquamarine","mins":10,"fee":20},"gemAmber":{"of":"chipAmber","mins":10,"fee":20},"gemTopaz":{"of":"chipTopaz","mins":10,"fee":20},"gemEmerald":{"of":"chipEmerald","mins":10,"fee":20},"gemDiamond":{"of":"chipDiamond","mins":10,"fee":20},"gemOnyx":{"of":"chipOnyx","mins":10,"fee":20}}}
  }$town$::jsonb),
  ('trees', $town${
    "regrow": 40,
    "cost": 2,
    "reach": 1,
    "axeTier": 1,
    "logs": 2,
    "girths": [{"chops":8,"pace":0.8,"spent":1.6,"family":"alternate","timber":[2]},{"chops":12,"pace":1,"spent":1.22,"family":"pairs","timber":[2,0]},{"chops":16,"pace":1.05,"spent":1.2,"family":"run","timber":[3,1,0]}],
    "girthSeed": 2627,
    "girthAbove": 2,
    "elderChops": 24,
    "elderPace": 1,
    "elderSpent": 1.6,
    "elderFamily": "noise",
    "elder": {"id":900,"plus":10,"timber":15,"resin":3},
    "kinds": ["pine","ironwood","moonwood"],
    "elderKind": "elder",
    "scent": ["resin","pineCone"],
    "echo": {"trees":3,"reach":2},
    "chain": {"reach":3,"left":0.5},
    "pecks": 1,
    "root": {"within":120},
    "go": {"secs":45},
    "brace": {"reach":2,"logs":1},
    "keepsake": {"in":6},
    "quickest": 0.07,
    "tired": {"later":1,"misses":3},
    "braced": 0.3,
    "keepsakes": {"nest":{"weight":10,"stout":false},"feather":{"weight":10,"stout":false},"twinCones":{"weight":10,"stout":false},"cicada":{"weight":10,"stout":false},"pellet":{"weight":10,"stout":false},"initials":{"weight":6,"stout":false},"heartKnot":{"weight":6,"stout":false},"amber":{"weight":6,"stout":false},"ribbon":{"weight":6,"stout":false},"rustKey":{"weight":4,"stout":true},"silverRing":{"weight":3,"stout":true},"carvedBird":{"weight":2,"stout":true}},
    "axe": {"top":10,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"gemAtTop":1,"gemLevels":4,"cap":3,"chops":[12,11,11,10,10,9,8,7,7,6,4],"ahead":[3,3,3,3,3,3,4,4,4,4,5],"slow":[0,0,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.5],"elements":["fire","water","ice","earth","lightning","wind","light","dark"],"opts":{"axGrain":{"pool":1,"n":{"ahead":2}},"axDust":{"pool":1,"n":{"every":5,"more":1}},"axKeen":{"pool":1,"n":{"chops":2}},"axResin":{"pool":1,"n":{"in":4}},"axFresh":{"pool":1,"n":{},"use":{"n":5,"per":"meal"}},"axDry":{"pool":1,"n":{"pieces":2}},"axOne":{"pool":2,"n":{},"use":{"n":10,"per":"day"}},"axDouble":{"pool":2,"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"n":{},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"n":{"by":1.5}}},"gems":{"fire":{"fewer":[0.15,0.25,0.35,0.45]},"water":{"spared":[1,2,3,4]},"ice":{"slow":[0.15,0.25,0.35,0.45]},"earth":{"stamina":[0.15,0.25,0.35,0.45]},"lightning":{"chain":[0.1,0.2,0.3,0.4]},"wind":{"walk":[0.1,0.15,0.2,0.25]},"light":{"glint":[10,20,30,999]},"dark":{"log":[0.1,0.2,0.3,0.4],"faster":[0.15,0.15,0.15,0.15]}}},
    "wood": [[0,39,253,1,1,1],[1,35,218,1,1,2],[2,42,212,1,1,3],[3,36,224,1,1,2],[4,37,238,1,1,1],[5,35,256,1,1,3],[6,38,227,1,1,3],[7,41,241,1,1,1],[8,50,219,1,1,3],[9,41,217,1,1,3],[10,51,258,1,1,1],[11,38,240,1,1,1],[12,45,219,1,1,3],[13,39,256,1,1,3],[14,37,234,1,1,2],[15,47,221,1,1,3],[16,49,215,1,1,2],[17,42,210,1,1,1],[18,42,251,1,1,3],[19,51,256,1,1,3],[20,45,257,1,1,2],[21,49,229,1,1,2],[22,51,214,1,1,1],[23,40,212,1,1,3],[24,45,261,1,1,2],[25,43,219,1,1,1],[26,39,258,1,1,1],[27,35,226,1,1,2],[28,38,243,1,1,3],[29,44,240,1,1,3],[30,46,214,1,1,3],[31,40,237,1,1,1],[32,44,254,1,1,1],[33,40,234,1,1,2],[34,37,220,1,1,1],[35,40,239,1,1,1],[36,45,217,1,1,1],[37,39,222,1,1,3],[38,41,259,1,1,2],[39,48,219,1,1,3],[40,39,219,1,1,2],[41,49,235,1,1,3],[42,44,214,1,1,2],[43,44,259,1,1,2],[44,47,237,1,1,2],[45,50,241,1,1,2],[46,38,216,1,1,3],[47,51,210,1,1,2],[48,45,222,1,1,1],[49,49,233,1,1,3],[50,50,243,1,1,2],[51,51,229,1,1,2],[52,47,255,1,1,1],[53,42,232,1,1,2],[54,38,236,1,1,1],[55,45,211,1,1,1],[56,36,240,1,1,2],[57,41,214,1,1,1],[58,49,246,1,1,3],[59,37,253,1,1,1],[60,28,260,2,1,2],[61,26,218,2,1,2],[62,19,239,2,1,2],[63,30,252,2,1,2],[64,22,210,2,1,2],[65,19,237,2,1,2],[66,30,261,2,1,2],[67,24,222,2,1,2],[68,18,246,2,1,2],[69,28,258,2,1,2],[70,29,225,2,1,2],[71,29,212,2,1,2],[72,27,249,2,1,2],[73,17,255,2,1,2],[74,25,215,2,1,2],[75,18,220,2,1,2],[76,20,248,2,1,2],[77,22,231,2,1,2],[78,22,240,2,1,2],[79,20,220,2,1,2],[80,20,230,2,1,2],[81,22,220,2,1,2],[82,25,252,2,1,2],[83,19,222,2,1,2],[84,18,259,2,1,2],[85,30,249,2,1,2],[86,26,213,2,1,2],[87,20,218,2,1,2],[88,28,216,2,1,2],[89,20,212,2,1,2],[90,21,259,2,1,2],[91,23,214,2,1,2],[92,27,256,2,1,2],[93,24,249,2,1,2],[94,17,257,2,1,2],[95,29,239,2,1,2],[96,17,251,2,1,2],[97,21,234,2,1,2],[98,27,237,2,1,2],[99,24,219,2,1,2],[100,10,217,3,1,2],[101,6,211,3,1,2],[102,2,259,3,1,2],[103,5,219,3,1,2],[104,6,224,3,1,2],[105,3,255,3,1,2],[106,5,253,3,1,2],[107,11,255,3,1,2],[108,6,214,3,1,2],[109,13,231,3,1,2],[110,4,231,3,1,2],[111,4,226,3,1,2],[112,7,222,3,1,2],[113,5,222,3,1,2],[114,3,252,3,1,2],[115,12,250,3,1,2],[116,10,249,3,1,2],[117,9,245,3,1,2],[118,10,214,3,1,2],[119,8,210,3,1,2],[900,43,234,1,3,3]]
  }$town$::jsonb),
  ('mining', $town${
    "turn": 1200000,
    "floors": 30,
    "reach": 1,
    "hardness": {"foot":12,"depth":[12,18,24]},
    "harderFrom": 11,
    "stamina": 1,
    "tired": 2,
    "stone": 1,
    "foot": {"shard":0.2,"n":[1,1]},
    "cave": {"shard":0.4,"n":[1,2],"vein":0.08,"gem":0.05},
    "rare": 0.5,
    "touch": 2,
    "crystal": {"floors":[28,30],"plus":10,"shards":20,"chips":2},
    "swing": {"ms":320,"least":180,"hold":240},
    "light": {"walker":2,"mushroom":3,"lamp":4,"torch":4,"burns":300000},
    "mushroom": "glowMushroom",
    "torch": "torch",
    "moss": {"chance":0.1,"glows":60000},
    "ores": [{"tier":1,"shard":"shardCopper","ore":"oreCopper","mins":5,"fee":5},{"tier":2,"shard":"shardIron","ore":"oreIron","mins":8,"fee":10},{"tier":3,"shard":"shardSilver","ore":"oreSilver","mins":11,"fee":15}],
    "rest": 10,
    "depths": [10,20],
    "at": {"x":0,"y":320,"across":4,"apart":64,"size":28},
    "all": 999,
    "vein": {"size":6,"points":[4,6],"knots":[4,6],"reach":2,"ore":2,"gem":{"points":[1,2],"chips":[1,3]},"stamina":3,"tired":{"fewer":2,"shows":2000},"families":{"seam":3,"cluster":3,"ring":2,"scatter":2},"seam":{"kink":0.25,"knots":2},"cluster":{"knots":3},"ring":{"eye":0.7,"knots":2},"least":2},
    "pick": {"top":10,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"gemAtTop":1,"gemLevels":4,"cap":3,"power":[3,3.45,3.65,3.7,4,4.5,5,6,7,8.5,12],"strikes":[6,6,6,7,7,7,7,8,9,9,10],"elements":["fire","water","ice","earth","lightning","wind","light","dark"],"opts":{"pkPeek":{"pool":1,"n":{}},"pkCrumb":{"pool":1,"n":{"every":5,"more":1}},"pkSteady":{"pool":1,"n":{"strikes":2}},"pkLoose":{"pool":1,"n":{"fewer":1}},"pkFresh":{"pool":1,"n":{},"use":{"n":10,"per":"meal"}},"pkCutter":{"pool":1,"n":{"more":1}},"pkQuake":{"pool":2,"n":{"reach":1},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"n":{"times":2},"use":{"n":5,"per":"day"}},"pkDrill":{"pool":2,"n":{},"use":{"n":3,"per":"day"}},"pkGleam":{"pool":2,"n":{"by":1.5}}},"gems":{"fire":{"fewer":[0.15,0.25,0.35,0.45]},"water":{"back":[1,2,3,4]},"ice":{"cross":[1,2,3,4]},"earth":{"stamina":[0.15,0.25,0.35,0.45]},"lightning":{"chain":[0.1,0.2,0.3,0.4]},"wind":{"walk":[0.1,0.15,0.2,0.25]},"light":{"glint":[4,7,10,999]},"dark":{"veins":[1.3,1.6,1.9,2.2],"swings":[1,1,1,1]}}},
    "rocks": [[0,39,232,2],[1,48,210,1],[2,42,253,0],[3,47,216,2],[4,43,244,2],[5,49,212,0],[6,46,253,1],[7,38,210,2],[8,48,261,0],[9,38,224,0],[10,37,260,1],[11,51,261,0],[12,41,255,1],[13,41,261,2],[14,38,212,1],[15,37,214,2],[16,40,243,0],[17,49,253,0],[18,42,238,2],[19,40,225,1],[20,49,217,0],[21,43,216,2],[22,50,226,1],[23,49,248,2],[24,44,246,0],[25,49,256,0],[26,47,258,0],[27,49,231,0],[28,37,218,0],[29,44,242,1],[30,44,238,0],[31,51,232,1],[32,51,245,2],[33,47,235,0],[34,39,214,2],[35,41,220,0],[36,44,230,2],[37,35,236,0],[38,47,212,1],[39,43,221,2],[40,20,261,1],[41,28,253,1],[42,22,247,2],[43,27,225,0],[44,22,250,0],[45,29,219,1],[46,25,256,2],[47,23,212,1],[48,12,229,0],[49,11,236,0],[50,12,233,1],[51,2,210,0],[52,9,242,0],[53,7,247,0]]
  }$town$::jsonb),
  ('pouches', $town$[{"gift":"thingSack","slots":5,"holds":["stone","shardCopper","shardIron","shardSilver","chipRuby","chipSapphire","chipAquamarine","chipAmber","chipTopaz","chipEmerald","chipDiamond","chipOnyx","oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx"]},{"gift":"thingBundle","slots":3,"holds":["log","timber"]}]$town$::jsonb)
  on conflict (key) do nothing;
insert into public.town_catalog (key, data) values
  ('items', $town${
    "rod": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "hoe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "can": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "pot": {"kind":"tool","tier":1,"stack":1,"pays":40},
    "pan": {"kind":"tool","tier":1,"stack":1,"pays":35},
    "grill": {"kind":"tool","tier":1,"stack":1,"pays":30},
    "potFull": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "bucket": {"kind":"tool","tier":1,"stack":1,"pays":8},
    "waterYoke": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterYokeGreat": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "waterCart": {"kind":"tool","tier":1,"stack":1,"pays":0},
    "worm": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "dough": {"kind":"bait","tier":1,"stack":20,"pays":1},
    "rice": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "salt": {"kind":"staple","tier":1,"stack":20,"pays":1},
    "seedKangkong": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedScallion": {"kind":"seed","tier":1,"stack":10,"pays":2},
    "seedCabbage": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedCarrot": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedDaikon": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedCorn": {"kind":"seed","tier":1,"stack":10,"pays":6},
    "seedChili": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedTomato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedBasil": {"kind":"seed","tier":1,"stack":10,"pays":4},
    "seedSweetPotato": {"kind":"seed","tier":1,"stack":10,"pays":7},
    "seedGarlic": {"kind":"seed","tier":1,"stack":10,"pays":5},
    "seedPumpkin": {"kind":"seed","tier":1,"stack":10,"pays":12},
    "kangkong": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "scallion": {"kind":"crop","tier":1,"stack":20,"pays":3},
    "cabbage": {"kind":"crop","tier":1,"stack":10,"pays":20},
    "carrot": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "daikon": {"kind":"crop","tier":1,"stack":10,"pays":18},
    "corn": {"kind":"crop","tier":1,"stack":20,"pays":14},
    "chili": {"kind":"crop","tier":1,"stack":20,"pays":5},
    "tomato": {"kind":"crop","tier":1,"stack":20,"pays":8},
    "basil": {"kind":"crop","tier":1,"stack":20,"pays":4},
    "sweetPotato": {"kind":"crop","tier":1,"stack":20,"pays":12},
    "garlic": {"kind":"crop","tier":1,"stack":20,"pays":10},
    "pumpkin": {"kind":"crop","tier":1,"stack":5,"pays":110},
    "minnow": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "barb": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "tilapia": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "perch": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "catfish": {"kind":"fish","tier":1,"stack":10,"pays":12},
    "pangasius": {"kind":"fish","tier":1,"stack":5,"pays":22},
    "snakehead": {"kind":"fish","tier":1,"stack":5,"pays":30},
    "eel": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "prawn": {"kind":"fish","tier":1,"stack":10,"pays":35},
    "featherback": {"kind":"fish","tier":1,"stack":5,"pays":40},
    "goby": {"kind":"fish","tier":1,"stack":5,"pays":60},
    "koi": {"kind":"fish","tier":1,"stack":1,"pays":300},
    "hyacinth": {"kind":"catch","tier":1,"stack":20,"pays":2},
    "boot": {"kind":"catch","tier":1,"stack":5,"pays":3},
    "fishSauce": {"kind":"goods","tier":1,"stack":10,"pays":12},
    "compost": {"kind":"goods","tier":1,"stack":20,"pays":4},
    "growFert": {"kind":"goods","tier":1,"stack":20,"pays":10},
    "guardFert": {"kind":"goods","tier":1,"stack":20,"pays":12},
    "pestCure": {"kind":"goods","tier":1,"stack":10,"pays":10},
    "basket": {"kind":"goods","tier":1,"stack":1,"pays":0},
    "riceBox": {"kind":"dish","tier":1,"stack":5,"pays":3},
    "oddDish": {"kind":"dish","tier":1,"stack":5,"pays":0},
    "friedMinnow": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "grilledFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "grilledCorn": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "roastSweetPotato": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "stirKangkong": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "basilCatfish": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "tomYum": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "sourCurry": {"kind":"dish","tier":1,"stack":5,"pays":20},
    "friedPerch": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "fishCake": {"kind":"dish","tier":1,"stack":5,"pays":22},
    "spicyEel": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "grilledPrawn": {"kind":"dish","tier":1,"stack":5,"pays":44},
    "steamedGoby": {"kind":"dish","tier":1,"stack":5,"pays":38},
    "pumpkinSoup": {"kind":"dish","tier":1,"stack":5,"pays":30},
    "shabu": {"kind":"dish","tier":1,"stack":10,"pays":30},
    "scrollFriedMinnow": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledFish": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollPestCure": {"kind":"scroll","tier":1,"stack":1,"pays":0},
    "scrollGrilledCorn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastSweetPotato": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollStirKangkong": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBasilCatfish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTomYum": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSourCurry": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFriedPerch": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishCake": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSpicyEel": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGrilledPrawn": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSteamedGoby": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPumpkinSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollShabu": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "loach": {"kind":"fish","tier":1,"stack":20,"pays":3},
    "mosquitofish": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "mussel": {"kind":"fish","tier":1,"stack":20,"pays":2},
    "crayfish": {"kind":"fish","tier":1,"stack":10,"pays":9},
    "goldfish": {"kind":"fish","tier":1,"stack":5,"pays":35},
    "carp": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "piranha": {"kind":"fish","tier":1,"stack":10,"pays":11},
    "herring": {"kind":"fish","tier":1,"stack":10,"pays":8},
    "archerfish": {"kind":"fish","tier":1,"stack":10,"pays":14},
    "pacu": {"kind":"fish","tier":1,"stack":5,"pays":20},
    "pike": {"kind":"fish","tier":1,"stack":5,"pays":28},
    "nilePerch": {"kind":"fish","tier":1,"stack":5,"pays":32},
    "salmon": {"kind":"fish","tier":1,"stack":5,"pays":26},
    "wels": {"kind":"fish","tier":1,"stack":5,"pays":45},
    "gar": {"kind":"fish","tier":1,"stack":5,"pays":42},
    "arapaima": {"kind":"fish","tier":1,"stack":1,"pays":320},
    "dozyFish": {"kind":"dish","tier":1,"stack":5,"pays":2},
    "popotoFish": {"kind":"fish","tier":1,"stack":10,"pays":10},
    "rainbowFish": {"kind":"dish","tier":1,"stack":5,"pays":6},
    "moonFish": {"kind":"fish","tier":1,"stack":5,"pays":50},
    "hookScale": {"kind":"tool","tier":1,"stack":1,"pays":20},
    "floatGlow": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "fishChips": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "ukha": {"kind":"dish","tier":1,"stack":5,"pays":17},
    "thieboudienne": {"kind":"dish","tier":1,"stack":5,"pays":18},
    "piranhaSoup": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "crawfishBoil": {"kind":"dish","tier":1,"stack":10,"pays":15},
    "masgouf": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "salmonSteak": {"kind":"dish","tier":1,"stack":5,"pays":26},
    "arapaimaRoast": {"kind":"dish","tier":1,"stack":10,"pays":45},
    "scrollFishChips": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollUkha": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollThieboudienne": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollPiranhaSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollCrawfishBoil": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMasgouf": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollSalmonSteak": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollArapaimaRoast": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "twig": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "leafMould": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "pineCone": {"kind":"wild","tier":1,"stack":20,"pays":1},
    "feather": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "resin": {"kind":"wild","tier":1,"stack":10,"pays":3},
    "vine": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "bambooCane": {"kind":"wild","tier":1,"stack":10,"pays":2},
    "wildflower": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "clay": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "shiitake": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chanterelle": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "porcini": {"kind":"wild","tier":1,"stack":20,"pays":7},
    "glowMushroom": {"kind":"wild","tier":1,"stack":10,"pays":12},
    "toadstool": {"kind":"wild","tier":1,"stack":20,"pays":0},
    "fiddlehead": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "mint": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "rosemary": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "chamomile": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "lavender": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "blueberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "raspberry": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "wildStrawberry": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "silkCocoon": {"kind":"wild","tier":1,"stack":10,"pays":8},
    "fourLeafClover": {"kind":"wild","tier":1,"stack":5,"pays":40},
    "bambooShoot": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "wildYam": {"kind":"wild","tier":1,"stack":20,"pays":5},
    "truffle": {"kind":"wild","tier":1,"stack":10,"pays":45},
    "ginseng": {"kind":"wild","tier":1,"stack":5,"pays":80},
    "amber": {"kind":"wild","tier":1,"stack":5,"pays":120},
    "mandrake": {"kind":"wild","tier":1,"stack":1,"pays":200},
    "wildApple": {"kind":"wild","tier":1,"stack":20,"pays":2},
    "chestnut": {"kind":"wild","tier":1,"stack":20,"pays":3},
    "wildOrchid": {"kind":"wild","tier":1,"stack":5,"pays":60},
    "moonflower": {"kind":"wild","tier":1,"stack":5,"pays":70},
    "starShard": {"kind":"wild","tier":1,"stack":5,"pays":150},
    "skewer": {"kind":"tool","tier":1,"stack":1,"pays":1},
    "floatFeather": {"kind":"tool","tier":1,"stack":1,"pays":6},
    "lineSpun": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "mulch": {"kind":"goods","tier":1,"stack":20,"pays":3},
    "lavenderSachet": {"kind":"goods","tier":1,"stack":20,"pays":6},
    "mushroomSoup": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "mushroomSkewer": {"kind":"dish","tier":1,"stack":5,"pays":8},
    "fishOnStick": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "roastYam": {"kind":"dish","tier":1,"stack":5,"pays":12},
    "roastedApple": {"kind":"dish","tier":1,"stack":5,"pays":5},
    "mushroomRisotto": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "fernSalad": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "herbTea": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "berryCompote": {"kind":"dish","tier":1,"stack":5,"pays":9},
    "bakedApple": {"kind":"dish","tier":1,"stack":5,"pays":7},
    "roastChestnut": {"kind":"dish","tier":1,"stack":5,"pays":11},
    "forestStew": {"kind":"dish","tier":1,"stack":5,"pays":10},
    "bambooShootStir": {"kind":"dish","tier":1,"stack":5,"pays":13},
    "rosemaryFish": {"kind":"dish","tier":1,"stack":5,"pays":16},
    "ginsengSoup": {"kind":"dish","tier":1,"stack":5,"pays":34},
    "moonTea": {"kind":"dish","tier":1,"stack":5,"pays":28},
    "truffleEggs": {"kind":"dish","tier":2,"stack":5,"pays":35},
    "mushroomOmelette": {"kind":"dish","tier":2,"stack":5,"pays":15},
    "scrollMushroomSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomSkewer": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFishOnStick": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastYam": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMushroomRisotto": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollFernSalad": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollHerbTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBerryCompote": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBakedApple": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRoastChestnut": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollForestStew": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollBambooShootStir": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollRosemaryFish": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollGinsengSoup": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollMoonTea": {"kind":"scroll","tier":1,"stack":1,"pays":10},
    "scrollTruffleEggs": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMushroomOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "bugNet": {"kind":"tool","tier":1,"stack":1,"pays":12},
    "butterflyWhite": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "monarch": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "morpho": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "dragonfly": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "damselfly": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "glassDragonfly": {"kind":"bug","tier":1,"stack":5,"pays":60},
    "grasshopper": {"kind":"bug","tier":2,"stack":20,"pays":2},
    "mantis": {"kind":"bug","tier":1,"stack":10,"pays":7},
    "cicada": {"kind":"bug","tier":1,"stack":20,"pays":5},
    "stickInsect": {"kind":"bug","tier":1,"stack":10,"pays":5},
    "leafInsect": {"kind":"bug","tier":1,"stack":10,"pays":6},
    "firefly": {"kind":"bug","tier":1,"stack":20,"pays":4},
    "orchidMantis": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "moth": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "lunaMoth": {"kind":"bug","tier":1,"stack":5,"pays":50},
    "hawkMoth": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "rhinoBeetle": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "stagBeetle": {"kind":"bug","tier":1,"stack":5,"pays":25},
    "jewelBeetle": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "herculesBeetle": {"kind":"bug","tier":1,"stack":5,"pays":150},
    "ladybird": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "scarab": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "caterpillar": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "rodTeak": {"kind":"tool","tier":2,"stack":1,"pays":90},
    "floatQuill": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "hookSteel": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "lineBraid": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "netSmall": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "hoeIron": {"kind":"tool","tier":2,"stack":1,"pays":75},
    "canCopper": {"kind":"tool","tier":2,"stack":1,"pays":60},
    "sickle": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "krabung": {"kind":"tool","tier":2,"stack":1,"pays":0},
    "mortar": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "steamer": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "cleaver": {"kind":"tool","tier":2,"stack":1,"pays":55},
    "jar": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "wok": {"kind":"tool","tier":2,"stack":1,"pays":80},
    "rollingPin": {"kind":"tool","tier":2,"stack":1,"pays":45},
    "sushiMat": {"kind":"tool","tier":2,"stack":1,"pays":50},
    "stoneBowl": {"kind":"tool","tier":2,"stack":1,"pays":70},
    "bowl": {"kind":"tool","tier":1,"stack":3,"pays":3},
    "bucketIron": {"kind":"tool","tier":2,"stack":1,"pays":30},
    "apron": {"kind":"tool","tier":2,"stack":1,"pays":40},
    "cricket": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "branBait": {"kind":"bait","tier":2,"stack":20,"pays":2},
    "shrimpLive": {"kind":"bait","tier":2,"stack":20,"pays":3},
    "sugar": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "oil": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tamarind": {"kind":"staple","tier":2,"stack":20,"pays":2},
    "egg": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "flour": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seaweed": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "tofu": {"kind":"staple","tier":2,"stack":20,"pays":3},
    "seedEggplant": {"kind":"seed","tier":2,"stack":10,"pays":8},
    "seedCucumber": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLongBean": {"kind":"seed","tier":2,"stack":10,"pays":7},
    "seedLemongrass": {"kind":"seed","tier":2,"stack":10,"pays":9},
    "seedGalangal": {"kind":"seed","tier":2,"stack":10,"pays":12},
    "seedLime": {"kind":"seed","tier":2,"stack":5,"pays":30},
    "seedPapaya": {"kind":"seed","tier":2,"stack":10,"pays":14},
    "eggplant": {"kind":"crop","tier":2,"stack":20,"pays":14},
    "cucumber": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "longBean": {"kind":"crop","tier":2,"stack":20,"pays":9},
    "lemongrass": {"kind":"crop","tier":2,"stack":20,"pays":12},
    "galangal": {"kind":"crop","tier":2,"stack":20,"pays":22},
    "lime": {"kind":"crop","tier":2,"stack":20,"pays":10},
    "papaya": {"kind":"crop","tier":2,"stack":10,"pays":26},
    "gourami": {"kind":"fish","tier":2,"stack":10,"pays":12},
    "crab": {"kind":"fish","tier":2,"stack":10,"pays":10},
    "snail": {"kind":"fish","tier":2,"stack":20,"pays":2},
    "hampala": {"kind":"fish","tier":2,"stack":5,"pays":34},
    "sheatfish": {"kind":"fish","tier":2,"stack":5,"pays":42},
    "bagrid": {"kind":"fish","tier":2,"stack":5,"pays":36},
    "giantGourami": {"kind":"fish","tier":2,"stack":5,"pays":44},
    "frog": {"kind":"fish","tier":2,"stack":10,"pays":20},
    "tigerfish": {"kind":"fish","tier":2,"stack":5,"pays":90},
    "wallago": {"kind":"fish","tier":2,"stack":5,"pays":110},
    "driftwood": {"kind":"catch","tier":2,"stack":10,"pays":3},
    "bottle": {"kind":"catch","tier":2,"stack":10,"pays":2},
    "driedFish": {"kind":"goods","tier":2,"stack":10,"pays":14},
    "saltedFish": {"kind":"goods","tier":2,"stack":10,"pays":18},
    "curryPaste": {"kind":"goods","tier":2,"stack":10,"pays":20},
    "pickle": {"kind":"goods","tier":2,"stack":10,"pays":16},
    "charcoal": {"kind":"goods","tier":2,"stack":20,"pays":4},
    "rope": {"kind":"goods","tier":2,"stack":10,"pays":8},
    "manure": {"kind":"goods","tier":2,"stack":20,"pays":5},
    "noodle": {"kind":"goods","tier":2,"stack":20,"pays":6},
    "somTam": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "grilledEggplant": {"kind":"dish","tier":2,"stack":5,"pays":20},
    "tomKha": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "friedGourami": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "crabCurry": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "steamedSheatfish": {"kind":"dish","tier":2,"stack":5,"pays":46},
    "friedFrog": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "laab": {"kind":"dish","tier":2,"stack":5,"pays":42},
    "omelette": {"kind":"dish","tier":2,"stack":5,"pays":14},
    "snailCurry": {"kind":"dish","tier":2,"stack":5,"pays":36},
    "candiedPumpkin": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "friedRice": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "sushi": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "tempura": {"kind":"dish","tier":2,"stack":5,"pays":32},
    "okonomiyaki": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "kimchi": {"kind":"dish","tier":2,"stack":5,"pays":18},
    "bibimbap": {"kind":"dish","tier":2,"stack":5,"pays":44},
    "kimbap": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "pajeon": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "harGow": {"kind":"dish","tier":2,"stack":5,"pays":34},
    "springRoll": {"kind":"dish","tier":2,"stack":5,"pays":24},
    "congee": {"kind":"dish","tier":2,"stack":5,"pays":30},
    "spaghetti": {"kind":"dish","tier":2,"stack":5,"pays":40},
    "minestrone": {"kind":"dish","tier":2,"stack":5,"pays":28},
    "samosa": {"kind":"dish","tier":2,"stack":5,"pays":26},
    "scrollSomTam": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollOmelette": {"kind":"scroll","tier":2,"stack":1,"pays":0},
    "scrollGrilledEggplant": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTomKha": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedGourami": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCrabCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSteamedSheatfish": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedFrog": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollLaab": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSnailCurry": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCandiedPumpkin": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollFriedRice": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSushi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollTempura": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollOkonomiyaki": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimchi": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollBibimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollKimbap": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollPajeon": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollHarGow": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpringRoll": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollCongee": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSpaghetti": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollMinestrone": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "scrollSamosa": {"kind":"scroll","tier":2,"stack":1,"pays":20},
    "rodMaster": {"kind":"tool","tier":3,"stack":1,"pays":220},
    "floatBell": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "hookTwin": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "lineSilk": {"kind":"tool","tier":3,"stack":1,"pays":90},
    "netLong": {"kind":"tool","tier":3,"stack":1,"pays":100},
    "hoeSteel": {"kind":"tool","tier":3,"stack":1,"pays":160},
    "canBrass": {"kind":"tool","tier":3,"stack":1,"pays":140},
    "shears": {"kind":"tool","tier":3,"stack":1,"pays":110},
    "yoke": {"kind":"tool","tier":3,"stack":1,"pays":0},
    "potBrass": {"kind":"tool","tier":3,"stack":1,"pays":180},
    "stoveBig": {"kind":"tool","tier":3,"stack":1,"pays":150},
    "panBrass": {"kind":"tool","tier":3,"stack":1,"pays":170},
    "steamerBamboo": {"kind":"tool","tier":3,"stack":1,"pays":130},
    "hotpot": {"kind":"tool","tier":3,"stack":1,"pays":200},
    "oven": {"kind":"tool","tier":3,"stack":1,"pays":240},
    "ladle": {"kind":"tool","tier":3,"stack":1,"pays":20},
    "tok": {"kind":"tool","tier":3,"stack":1,"pays":60},
    "antEggs": {"kind":"bait","tier":3,"stack":20,"pays":6},
    "lure": {"kind":"bait","tier":3,"stack":5,"pays":30},
    "fermentedBait": {"kind":"bait","tier":3,"stack":20,"pays":5},
    "stickyRice": {"kind":"staple","tier":3,"stack":20,"pays":3},
    "soy": {"kind":"staple","tier":3,"stack":20,"pays":5},
    "pepper": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "cheese": {"kind":"staple","tier":3,"stack":20,"pays":6},
    "milk": {"kind":"staple","tier":3,"stack":20,"pays":4},
    "seedMango": {"kind":"seed","tier":3,"stack":5,"pays":40},
    "seedBanana": {"kind":"seed","tier":3,"stack":5,"pays":25},
    "seedCoconut": {"kind":"seed","tier":3,"stack":5,"pays":45},
    "seedGinger": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTurmeric": {"kind":"seed","tier":3,"stack":10,"pays":16},
    "seedTaro": {"kind":"seed","tier":3,"stack":10,"pays":18},
    "seedWatermelon": {"kind":"seed","tier":3,"stack":10,"pays":20},
    "mango": {"kind":"crop","tier":3,"stack":20,"pays":30},
    "banana": {"kind":"crop","tier":3,"stack":20,"pays":16},
    "coconut": {"kind":"crop","tier":3,"stack":10,"pays":34},
    "ginger": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "turmeric": {"kind":"crop","tier":3,"stack":20,"pays":26},
    "taro": {"kind":"crop","tier":3,"stack":10,"pays":30},
    "watermelon": {"kind":"crop","tier":3,"stack":5,"pays":60},
    "croaker": {"kind":"fish","tier":3,"stack":5,"pays":70},
    "blackEar": {"kind":"fish","tier":3,"stack":5,"pays":80},
    "spinyEel": {"kind":"fish","tier":3,"stack":5,"pays":60},
    "puffer": {"kind":"fish","tier":3,"stack":10,"pays":25},
    "goldenCarp": {"kind":"fish","tier":3,"stack":5,"pays":180},
    "giantSnakehead": {"kind":"fish","tier":3,"stack":5,"pays":200},
    "royalFeatherback": {"kind":"fish","tier":3,"stack":5,"pays":190},
    "arowana": {"kind":"fish","tier":3,"stack":1,"pays":600},
    "stingray": {"kind":"fish","tier":3,"stack":1,"pays":700},
    "megaCatfish": {"kind":"fish","tier":3,"stack":1,"pays":800},
    "pearl": {"kind":"catch","tier":3,"stack":10,"pays":150},
    "chest": {"kind":"catch","tier":3,"stack":1,"pays":20},
    "coconutMilk": {"kind":"goods","tier":3,"stack":10,"pays":22},
    "fermentedFish": {"kind":"goods","tier":3,"stack":10,"pays":26},
    "shrimpPaste": {"kind":"goods","tier":3,"stack":10,"pays":28},
    "driedChili": {"kind":"goods","tier":3,"stack":20,"pays":8},
    "riceNoodle": {"kind":"goods","tier":3,"stack":10,"pays":18},
    "bananaLeaf": {"kind":"goods","tier":3,"stack":20,"pays":2},
    "toastedRice": {"kind":"goods","tier":3,"stack":10,"pays":10},
    "greenCurry": {"kind":"dish","tier":3,"stack":5,"pays":60},
    "khanomJeen": {"kind":"dish","tier":3,"stack":5,"pays":70},
    "hoMok": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "mangoStickyRice": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "bananaInCoconut": {"kind":"dish","tier":3,"stack":5,"pays":34},
    "taroPudding": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "steamedCroaker": {"kind":"dish","tier":3,"stack":5,"pays":56},
    "gingerFish": {"kind":"dish","tier":3,"stack":5,"pays":54},
    "turmericFish": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "jungleCurry": {"kind":"dish","tier":3,"stack":5,"pays":66},
    "megaLaab": {"kind":"dish","tier":3,"stack":20,"pays":90},
    "watermelonSlices": {"kind":"dish","tier":3,"stack":10,"pays":20},
    "khantoke": {"kind":"dish","tier":3,"stack":20,"pays":120},
    "naamPrik": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "ramen": {"kind":"dish","tier":3,"stack":5,"pays":44},
    "unadon": {"kind":"dish","tier":3,"stack":5,"pays":48},
    "tteokbokki": {"kind":"dish","tier":3,"stack":5,"pays":36},
    "chowMein": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "mapoTofu": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "pizza": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "risotto": {"kind":"dish","tier":3,"stack":5,"pays":40},
    "lasagna": {"kind":"dish","tier":3,"stack":5,"pays":50},
    "fishCurry": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "naan": {"kind":"dish","tier":3,"stack":5,"pays":26},
    "biryani": {"kind":"dish","tier":3,"stack":5,"pays":46},
    "lassi": {"kind":"dish","tier":3,"stack":5,"pays":24},
    "scrollGreenCurry": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollHoMok": {"kind":"scroll","tier":3,"stack":1,"pays":0},
    "scrollKhanomJeen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMangoStickyRice": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBananaInCoconut": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTaroPudding": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollSteamedCroaker": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollGingerFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTurmericFish": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollJungleCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMegaLaab": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollWatermelonSlices": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollKhantoke": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaamPrik": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRamen": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollUnadon": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollTteokbokki": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollChowMein": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollMapoTofu": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollPizza": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollRisotto": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLasagna": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollFishCurry": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollNaan": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollBiryani": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35},
    "pick": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "axe": {"kind":"tool","tier":1,"stack":1,"pays":25},
    "stone": {"kind":"mineral","tier":1,"stack":50,"pays":0},
    "log": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "timber": {"kind":"wood","tier":1,"stack":50,"pays":0},
    "shardCopper": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardIron": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "shardSilver": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "oreCopper": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreIron": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "oreSilver": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "chipRuby": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipSapphire": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAquamarine": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipAmber": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipTopaz": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipEmerald": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipDiamond": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "chipOnyx": {"kind":"mineral","tier":1,"stack":99,"pays":0},
    "gemRuby": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemSapphire": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAquamarine": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemAmber": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemTopaz": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemEmerald": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemDiamond": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "gemOnyx": {"kind":"mineral","tier":1,"stack":20,"pays":0},
    "torch": {"kind":"goods","tier":1,"stack":10,"pays":0}
  }$town$::jsonb),
  ('goods', $town${
    "rod": {"price":60,"stock":6,"each":1},
    "hoe": {"price":50,"stock":6,"each":1},
    "can": {"price":40,"stock":6,"each":1},
    "pot": {"price":80,"stock":4,"each":1},
    "pan": {"price":70,"stock":4,"each":1},
    "grill": {"price":60,"stock":4,"each":1},
    "worm": {"price":2,"stock":240,"each":20},
    "dough": {"price":3,"stock":160,"each":20},
    "rice": {"price":3,"stock":100,"each":10},
    "salt": {"price":2,"stock":100,"each":10},
    "riceBox": {"price":6,"stock":40,"each":3},
    "seedKangkong": {"price":4,"stock":100,"each":8},
    "seedScallion": {"price":5,"stock":100,"each":8},
    "seedCabbage": {"price":8,"stock":60,"each":6},
    "seedCarrot": {"price":8,"stock":60,"each":6},
    "seedChili": {"price":10,"stock":40,"each":4},
    "seedPumpkin": {"price":25,"stock":20,"each":2},
    "scrollFriedMinnow": {"price":40,"stock":3,"each":1},
    "scrollGrilledFish": {"price":40,"stock":3,"each":1},
    "scrollPestCure": {"price":40,"stock":6,"each":1},
    "bowl": {"price":5,"stock":60,"each":5},
    "bucket": {"price":20,"stock":30,"each":4},
    "bugNet": {"price":35,"stock":6,"each":1},
    "pick": {"price":50,"stock":6,"each":1},
    "axe": {"price":50,"stock":6,"each":1},
    "bucketIron": {"price":70,"stock":6,"each":1},
    "apron": {"price":120,"stock":4,"each":1},
    "seedDaikon": {"price":10,"stock":40,"each":4},
    "seedCorn": {"price":12,"stock":40,"each":4},
    "seedTomato": {"price":14,"stock":40,"each":4},
    "seedBasil": {"price":8,"stock":40,"each":4},
    "seedSweetPotato": {"price":14,"stock":40,"each":4},
    "seedGarlic": {"price":10,"stock":40,"each":4},
    "rodTeak": {"price":240,"stock":3,"each":1},
    "floatQuill": {"price":90,"stock":4,"each":1},
    "hookSteel": {"price":90,"stock":4,"each":1},
    "lineBraid": {"price":90,"stock":4,"each":1},
    "netSmall": {"price":110,"stock":4,"each":1},
    "hoeIron": {"price":180,"stock":4,"each":1},
    "canCopper": {"price":150,"stock":4,"each":1},
    "sickle": {"price":120,"stock":4,"each":1},
    "krabung": {"price":150,"stock":4,"each":1},
    "mortar": {"price":130,"stock":4,"each":1},
    "steamer": {"price":160,"stock":4,"each":1},
    "cleaver": {"price":130,"stock":4,"each":1},
    "jar": {"price":110,"stock":6,"each":2},
    "wok": {"price":190,"stock":4,"each":1},
    "cricket": {"price":4,"stock":80,"each":10},
    "branBait": {"price":4,"stock":80,"each":10},
    "shrimpLive": {"price":6,"stock":60,"each":10},
    "sugar": {"price":6,"stock":80,"each":10},
    "oil": {"price":6,"stock":80,"each":10},
    "tamarind": {"price":5,"stock":80,"each":10},
    "egg": {"price":6,"stock":60,"each":10},
    "manure": {"price":8,"stock":60,"each":10},
    "flour": {"price":7,"stock":80,"each":10},
    "seaweed": {"price":8,"stock":60,"each":10},
    "tofu": {"price":7,"stock":60,"each":10},
    "rollingPin": {"price":90,"stock":4,"each":1},
    "sushiMat": {"price":100,"stock":4,"each":1},
    "stoneBowl": {"price":140,"stock":4,"each":1},
    "seedEggplant": {"price":18,"stock":40,"each":4},
    "seedCucumber": {"price":16,"stock":40,"each":4},
    "seedLongBean": {"price":16,"stock":40,"each":4},
    "seedLemongrass": {"price":20,"stock":40,"each":4},
    "seedGalangal": {"price":26,"stock":30,"each":4},
    "seedLime": {"price":70,"stock":12,"each":2},
    "seedPapaya": {"price":32,"stock":20,"each":2},
    "scrollSomTam": {"price":90,"stock":3,"each":1},
    "scrollOmelette": {"price":60,"stock":3,"each":1},
    "rodMaster": {"price":600,"stock":2,"each":1},
    "floatBell": {"price":220,"stock":3,"each":1},
    "hookTwin": {"price":220,"stock":3,"each":1},
    "lineSilk": {"price":220,"stock":3,"each":1},
    "netLong": {"price":260,"stock":3,"each":1},
    "hoeSteel": {"price":420,"stock":3,"each":1},
    "canBrass": {"price":360,"stock":3,"each":1},
    "shears": {"price":280,"stock":3,"each":1},
    "yoke": {"price":300,"stock":3,"each":1},
    "potBrass": {"price":460,"stock":3,"each":1},
    "stoveBig": {"price":380,"stock":3,"each":1},
    "panBrass": {"price":440,"stock":3,"each":1},
    "steamerBamboo": {"price":330,"stock":3,"each":1},
    "hotpot": {"price":520,"stock":2,"each":1},
    "ladle": {"price":50,"stock":10,"each":1},
    "tok": {"price":150,"stock":6,"each":1},
    "antEggs": {"price":14,"stock":50,"each":10},
    "lure": {"price":70,"stock":10,"each":2},
    "fermentedBait": {"price":12,"stock":50,"each":10},
    "stickyRice": {"price":7,"stock":80,"each":10},
    "soy": {"price":12,"stock":60,"each":10},
    "pepper": {"price":14,"stock":60,"each":10},
    "bananaLeaf": {"price":5,"stock":80,"each":10},
    "cheese": {"price":16,"stock":50,"each":10},
    "milk": {"price":9,"stock":60,"each":10},
    "oven": {"price":480,"stock":2,"each":1},
    "seedMango": {"price":95,"stock":10,"each":2},
    "seedBanana": {"price":60,"stock":12,"each":2},
    "seedCoconut": {"price":110,"stock":8,"each":2},
    "seedGinger": {"price":38,"stock":30,"each":4},
    "seedTurmeric": {"price":38,"stock":30,"each":4},
    "seedTaro": {"price":42,"stock":30,"each":4},
    "seedWatermelon": {"price":46,"stock":20,"each":2},
    "scrollGreenCurry": {"price":160,"stock":2,"each":1},
    "scrollHoMok": {"price":160,"stock":2,"each":1}
  }$town$::jsonb),
  ('shelf', $town${
    "basic": ["rod","hoe","can","pot","pan","grill","worm","dough","rice","salt","riceBox","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedChili","seedPumpkin","scrollFriedMinnow","scrollGrilledFish","scrollPestCure","bowl","bucket","bugNet","pick","axe"],
    "unlocks": ["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato","cricket","seedCucumber","oil","egg","scrollOmelette","flour","mortar","seedLongBean","sugar","rollingPin","seedEggplant","branBait","wok","seaweed","seedLemongrass","jar","sushiMat","seedGalangal","shrimpLive","steamer","tofu","seedLime","cleaver","stoneBowl","seedPapaya","scrollSomTam","tamarind","manure","floatQuill","hookSteel","lineBraid","netSmall","rodTeak","hoeIron","canCopper","sickle","krabung","bucketIron","apron","antEggs","seedGinger","soy","stickyRice","seedBanana","bananaLeaf","pepper","milk","seedTurmeric","seedTaro","fermentedBait","cheese","seedWatermelon","steamerBamboo","oven","seedCoconut","seedMango","lure","potBrass","panBrass","hotpot","stoveBig","ladle","tok","scrollGreenCurry","scrollHoMok","floatBell","hookTwin","lineSilk","netLong","rodMaster","hoeSteel","canBrass","shears","yoke"]
  }$town$::jsonb),
  ('hints', $town${
    "price": {"1":15,"2":40,"3":90},
    "ids": [["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["roastSweetPotato",6],["stirKangkong",1],["basilCatfish",2],["tomYum",3],["sourCurry",5],["friedPerch",1],["fishCake",2],["spicyEel",2],["grilledPrawn",0],["steamedGoby",0],["pumpkinSoup",0],["shabu",5],["fishSauce",0],["compost",0],["growFert",0],["guardFert",1],["pestCure",0],["basket",0],["fishChips",0],["ukha",0],["thieboudienne",0],["piranhaSoup",0],["crawfishBoil",4],["masgouf",0],["salmonSteak",1],["arapaimaRoast",0],["mushroomSoup",0],["mushroomSkewer",0],["fishOnStick",0],["roastYam",0],["roastedApple",0],["mushroomRisotto",0],["fernSalad",0],["herbTea",0],["berryCompote",0],["bakedApple",0],["roastChestnut",0],["forestStew",0],["bambooShootStir",0],["rosemaryFish",0],["ginsengSoup",0],["moonTea",0],["hookScale",0],["floatGlow",0],["bowl",0],["skewer",0],["floatFeather",0],["lineSpun",0],["mulch",0],["lavenderSachet",0],["bugNet",0],["torch",0],["somTam",31],["grilledEggplant",17],["tomKha",28],["friedGourami",19],["crabCurry",24],["steamedSheatfish",28],["friedFrog",19],["laab",29],["omelette",9],["snailCurry",24],["candiedPumpkin",15],["friedRice",19],["sushi",29],["tempura",19],["okonomiyaki",12],["kimchi",22],["bibimbap",30],["kimbap",23],["pajeon",12],["harGow",26],["springRoll",19],["congee",0],["spaghetti",16],["minestrone",16],["samosa",19],["driedFish",0],["saltedFish",22],["curryPaste",24],["pickle",22],["charcoal",0],["rope",0],["krabung",0],["noodle",16],["truffleEggs",0],["mushroomOmelette",0],["greenCurry",61],["khanomJeen",61],["hoMok",61],["mangoStickyRice",62],["bananaInCoconut",61],["taroPudding",65],["steamedCroaker",48],["gingerFish",56],["turmericFish",54],["jungleCurry",64],["megaLaab",46],["watermelonSlices",58],["khantoke",66],["naamPrik",28],["ramen",48],["unadon",48],["tteokbokki",49],["chowMein",48],["mapoTofu",48],["pizza",60],["risotto",57],["lasagna",60],["fishCurry",61],["naan",60],["biryani",54],["lassi",62],["coconutMilk",61],["fermentedFish",22],["shrimpPaste",25],["driedChili",0],["riceNoodle",12],["toastedRice",19],["yoke",0]]
  }$town$::jsonb),
  ('makes', $town${
    "fishSauce": {"needs":[["minnow",4],["salt",2]],"in":["pot"],"gives":2},
    "compost": {"needs":[["hyacinth",3]],"in":[],"gives":2},
    "growFert": {"needs":[["compost",2],["minnow",2]],"in":[],"gives":2},
    "guardFert": {"needs":[["compost",2],["chili",2],["garlic",1]],"in":[],"gives":2},
    "pestCure": {"needs":[["chili",2],["scallion",2],["salt",1]],"in":["pot"],"gives":2},
    "basket": {"needs":[["hyacinth",6]],"in":[],"gives":1},
    "hookScale": {"needs":[["gar",1]],"in":[],"gives":1},
    "floatGlow": {"needs":[["moonFish",1]],"in":[],"gives":1},
    "bowl": {"needs":[["mussel",2]],"in":[],"gives":1},
    "skewer": {"needs":[["twig",2]],"in":[],"gives":1},
    "floatFeather": {"needs":[["bambooCane",1],["feather",2]],"in":[],"gives":1},
    "lineSpun": {"needs":[["silkCocoon",3]],"in":[],"gives":1},
    "mulch": {"needs":[["leafMould",3]],"in":[],"gives":2},
    "lavenderSachet": {"needs":[["vine",1],["lavender",3]],"in":[],"gives":2},
    "bugNet": {"needs":[["bambooCane",1],["vine",2]],"in":[],"gives":1},
    "torch": {"needs":[["timber",1],["resin",1]],"in":[],"gives":2},
    "driedFish": {"needs":[["barb",2],["salt",1]],"in":["grill"],"gives":2},
    "saltedFish": {"needs":[["tilapia",1],["salt",3]],"in":["jar"],"gives":2},
    "curryPaste": {"needs":[["chili",3],["garlic",2],["lemongrass",1],["galangal",1]],"in":["mortar"],"gives":2},
    "pickle": {"needs":[["cabbage",1],["salt",2]],"in":["jar"],"gives":2},
    "charcoal": {"needs":[["driftwood",2]],"in":["grill"],"gives":4},
    "rope": {"needs":[["hyacinth",4]],"in":[],"gives":1},
    "krabung": {"needs":[["hyacinth",8],["rope",1]],"in":[],"gives":1},
    "noodle": {"needs":[["flour",2],["egg",1]],"in":["rollingPin"],"gives":3},
    "coconutMilk": {"needs":[["coconut",1]],"in":["mortar"],"gives":2},
    "fermentedFish": {"needs":[["gourami",2],["salt",2],["toastedRice",1]],"in":["jar"],"gives":2},
    "shrimpPaste": {"needs":[["shrimpLive",5],["salt",2]],"in":["jar"],"gives":1},
    "driedChili": {"needs":[["chili",4]],"in":["grill"],"gives":3},
    "riceNoodle": {"needs":[["flour",2]],"in":["pot"],"gives":3},
    "toastedRice": {"needs":[["rice",2]],"in":["wok"],"gives":2},
    "yoke": {"needs":[["driftwood",2],["rope",2],["basket",2]],"in":[],"gives":1}
  }$town$::jsonb),
  ('cooking', $town${
    "cost": 4,
    "stirs": 2,
    "kinds": 8,
    "ladle": 1,
    "pots": 2,
    "reach": 1.8,
    "tok": 3.2,
    "odd": {"per":2,"most":4},
    "oddDish": "oddDish",
    "clue": 3,
    "recipes": ["friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette","fishSauce","compost","growFert","guardFert","pestCure","basket","hookScale","floatGlow","bowl","skewer","floatFeather","lineSpun","mulch","lavenderSachet","bugNet","torch","driedFish","saltedFish","curryPaste","pickle","charcoal","rope","krabung","noodle","coconutMilk","fermentedFish","shrimpPaste","driedChili","riceNoodle","toastedRice","yoke"],
    "needs": {"friedMinnow":{"minnow":3,"salt":1},"grilledFish":{"salt":2,"tilapia":1},"grilledCorn":{"corn":2},"roastSweetPotato":{"sweetPotato":2},"stirKangkong":{"chili":1,"garlic":1,"kangkong":3},"basilCatfish":{"basil":2,"catfish":1,"chili":1,"garlic":1,"rice":2},"tomYum":{"chili":2,"scallion":1,"snakehead":1,"tomato":2},"sourCurry":{"barb":2,"cabbage":1,"chili":1,"daikon":1},"friedPerch":{"garlic":2,"perch":2,"salt":1},"fishCake":{"basil":1,"chili":1,"featherback":1,"salt":1},"spicyEel":{"basil":2,"chili":2,"eel":1,"garlic":1},"grilledPrawn":{"prawn":2,"salt":1},"steamedGoby":{"fishSauce":1,"goby":1,"scallion":2},"pumpkinSoup":{"pumpkin":1,"salt":1,"scallion":1},"shabu":{"cabbage":1,"carrot":2,"corn":1,"daikon":1,"pangasius":1,"prawn":2,"scallion":2},"somTam":{"chili":2,"lime":1,"longBean":1,"papaya":1,"sugar":1,"tomato":1},"grilledEggplant":{"eggplant":2,"fishSauce":1},"tomKha":{"chili":1,"galangal":1,"lemongrass":1,"lime":1,"sheatfish":1},"friedGourami":{"gourami":2,"oil":1,"salt":1},"crabCurry":{"crab":3,"curryPaste":1,"eggplant":1,"longBean":1},"steamedSheatfish":{"chili":1,"garlic":1,"lime":2,"sheatfish":1},"friedFrog":{"frog":2,"garlic":2,"oil":1},"laab":{"bagrid":1,"chili":1,"lime":1,"rice":1,"scallion":1},"omelette":{"egg":2,"oil":1},"snailCurry":{"curryPaste":1,"lemongrass":1,"snail":6},"candiedPumpkin":{"pumpkin":1,"sugar":2},"friedRice":{"egg":1,"oil":1,"rice":3,"scallion":1},"greenCurry":{"basil":1,"coconutMilk":1,"curryPaste":1,"eggplant":2,"featherback":1},"khanomJeen":{"coconutMilk":1,"croaker":1,"curryPaste":1,"longBean":1,"riceNoodle":3},"hoMok":{"bananaLeaf":2,"basil":1,"blackEar":1,"coconutMilk":1,"curryPaste":1},"mangoStickyRice":{"coconutMilk":1,"mango":2,"stickyRice":2,"sugar":1},"bananaInCoconut":{"banana":3,"coconutMilk":1,"sugar":1},"taroPudding":{"coconutMilk":1,"flour":1,"sugar":1,"taro":1},"steamedCroaker":{"croaker":1,"ginger":1,"scallion":1,"soy":1},"gingerFish":{"blackEar":1,"ginger":2,"oil":1,"soy":1},"turmericFish":{"garlic":2,"oil":1,"spinyEel":2,"turmeric":1},"jungleCurry":{"curryPaste":1,"eggplant":1,"galangal":1,"giantSnakehead":1,"lemongrass":1,"longBean":1},"megaLaab":{"chili":3,"lime":3,"megaCatfish":1,"scallion":2,"toastedRice":1},"watermelonSlices":{"watermelon":1},"khantoke":{"coconutMilk":1,"cucumber":2,"curryPaste":1,"goldenCarp":1,"longBean":2,"pepper":1,"stickyRice":3},"naamPrik":{"chili":3,"cucumber":1,"fermentedFish":1,"garlic":1,"lime":1},"sushi":{"rice":2,"seaweed":1,"sugar":1,"tilapia":1},"ramen":{"driedFish":1,"egg":1,"noodle":2,"scallion":1,"soy":1},"tempura":{"egg":1,"flour":1,"oil":1,"prawn":2},"unadon":{"eel":1,"rice":2,"soy":1,"sugar":1},"okonomiyaki":{"cabbage":1,"egg":1,"flour":1,"prawn":1,"scallion":1},"kimchi":{"cabbage":2,"chili":2,"fishSauce":1,"garlic":1},"bibimbap":{"carrot":1,"chili":1,"cucumber":1,"egg":1,"kangkong":1,"rice":2},"tteokbokki":{"chili":2,"scallion":1,"stickyRice":2,"sugar":1},"kimbap":{"carrot":1,"cucumber":1,"egg":1,"rice":2,"seaweed":1},"pajeon":{"egg":1,"flour":1,"oil":1,"scallion":3},"harGow":{"flour":2,"prawn":2,"scallion":1},"chowMein":{"cabbage":1,"carrot":1,"noodle":2,"oil":1,"soy":1},"springRoll":{"cabbage":1,"carrot":1,"flour":1,"oil":1},"congee":{"egg":1,"perch":1,"rice":2,"scallion":1},"mapoTofu":{"chili":2,"garlic":1,"scallion":1,"soy":1,"tofu":2},"pizza":{"basil":1,"cheese":1,"flour":2,"tomato":2},"spaghetti":{"garlic":1,"noodle":2,"oil":1,"prawn":1,"tomato":2},"risotto":{"cheese":1,"garlic":1,"pumpkin":1,"rice":2},"lasagna":{"cheese":2,"eggplant":1,"noodle":2,"tomato":2},"minestrone":{"cabbage":1,"carrot":1,"longBean":1,"noodle":1,"tomato":2},"fishCurry":{"catfish":1,"chili":2,"coconutMilk":1,"ginger":1,"turmeric":1},"naan":{"flour":2,"garlic":1,"milk":1},"biryani":{"milk":1,"pangasius":1,"pepper":1,"rice":3,"turmeric":1},"samosa":{"chili":1,"flour":1,"oil":1,"sweetPotato":1},"lassi":{"mango":1,"milk":1,"sugar":1},"fishChips":{"popotoFish":2,"salt":1},"ukha":{"carrot":2,"pike":1,"salt":1,"scallion":1},"thieboudienne":{"cabbage":1,"carrot":1,"nilePerch":1,"rice":3},"piranhaSoup":{"chili":2,"piranha":2,"scallion":1},"crawfishBoil":{"chili":2,"corn":2,"crayfish":5,"salt":2},"masgouf":{"carp":1,"salt":2,"scallion":2},"salmonSteak":{"garlic":1,"salmon":1,"salt":1},"arapaimaRoast":{"arapaima":1,"chili":2,"salt":3},"mushroomSoup":{"salt":1,"scallion":1,"shiitake":3},"mushroomSkewer":{"salt":1,"shiitake":2},"fishOnStick":{"barb":1,"salt":1},"roastYam":{"wildYam":2},"roastedApple":{"wildApple":2},"mushroomRisotto":{"porcini":1,"rice":2,"salt":1,"scallion":1},"fernSalad":{"fiddlehead":3,"mint":1,"salt":1},"herbTea":{"chamomile":2,"mint":1},"berryCompote":{"blueberry":2,"raspberry":2,"wildStrawberry":1},"bakedApple":{"chestnut":1,"wildApple":3},"roastChestnut":{"chestnut":4,"salt":1},"forestStew":{"carrot":1,"rosemary":1,"shiitake":1,"wildYam":2},"bambooShootStir":{"bambooShoot":2,"chili":1,"salt":1},"rosemaryFish":{"perch":1,"rosemary":1,"salt":1},"ginsengSoup":{"ginseng":1,"salt":1,"scallion":1,"shiitake":2},"moonTea":{"chamomile":1,"mint":1,"moonflower":1},"truffleEggs":{"egg":2,"salt":1,"truffle":1},"mushroomOmelette":{"chanterelle":1,"egg":2,"salt":1},"fishSauce":{"minnow":4,"salt":2},"compost":{"hyacinth":3},"growFert":{"compost":2,"minnow":2},"guardFert":{"chili":2,"compost":2,"garlic":1},"pestCure":{"chili":2,"salt":1,"scallion":2},"basket":{"hyacinth":6},"hookScale":{"gar":1},"floatGlow":{"moonFish":1},"bowl":{"mussel":2},"skewer":{"twig":2},"floatFeather":{"bambooCane":1,"feather":2},"lineSpun":{"silkCocoon":3},"mulch":{"leafMould":3},"lavenderSachet":{"lavender":3,"vine":1},"bugNet":{"bambooCane":1,"vine":2},"torch":{"resin":1,"timber":1},"driedFish":{"barb":2,"salt":1},"saltedFish":{"salt":3,"tilapia":1},"curryPaste":{"chili":3,"galangal":1,"garlic":2,"lemongrass":1},"pickle":{"cabbage":1,"salt":2},"charcoal":{"driftwood":2},"rope":{"hyacinth":4},"krabung":{"hyacinth":8,"rope":1},"noodle":{"egg":1,"flour":2},"coconutMilk":{"coconut":1},"fermentedFish":{"gourami":2,"salt":2,"toastedRice":1},"shrimpPaste":{"salt":2,"shrimpLive":5},"driedChili":{"chili":4},"riceNoodle":{"flour":2},"toastedRice":{"rice":2},"yoke":{"basket":2,"driftwood":2,"rope":2}},
    "cookware": ["pan","grill","pot","mortar","wok","steamer","cleaver","steamerBamboo","panBrass","potBrass","hotpot","sushiMat","jar","stoneBowl","rollingPin","oven","skewer"],
    "gear": {"wok":1.25,"potBrass":1.5,"panBrass":1.5,"stoveBig":1.25},
    "never": ["tool","scroll","dish","bug","mineral","wood"],
    "putIn": {"also":["timber"],"never":["torch"]},
    "bowl": "bowl",
    "bowled": ["oddDish","friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette"],
    "inside": {"boot":{"chance":0.35,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"bottle":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea","scrollTruffleEggs","scrollMushroomOmelette"]},"chest":{"chance":1,"scrolls":["scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollKhanomJeen","scrollMangoStickyRice","scrollBananaInCoconut","scrollTaroPudding","scrollSteamedCroaker","scrollGingerFish","scrollTurmericFish","scrollJungleCurry","scrollMegaLaab","scrollWatermelonSlices","scrollKhantoke","scrollNaamPrik","scrollRamen","scrollUnadon","scrollTteokbokki","scrollChowMein","scrollMapoTofu","scrollPizza","scrollRisotto","scrollLasagna","scrollFishCurry","scrollNaan","scrollBiryani","scrollLassi","scrollTruffleEggs","scrollMushroomOmelette"]},"wels":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"pacu":{"chance":0.8,"scrolls":["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato"]}},
    "map": {"town":[64,64],"farm":[128,0,60,44]},
    "misses": 30,
    "feast": {"pots":6,"ground":60,"tile":[46,48],"floor":[[47,50],[40,43],[46,38],[45,39],[44,40],[43,41],[44,41],[45,41],[48,41],[49,41],[44,42],[45,42],[46,42],[47,42],[48,42],[50,42],[41,43],[44,43],[47,43],[51,43],[40,44],[41,44],[42,44],[43,44],[46,44],[52,44],[40,45],[41,45],[42,45],[43,45],[44,45],[45,45],[38,46],[41,46],[42,46],[45,46],[46,46],[39,47],[40,47],[46,47],[47,47],[36,48],[37,48],[39,48],[42,48],[43,48],[45,48],[46,48],[47,48],[48,48],[37,49],[38,49],[39,49],[40,49],[41,49],[44,49],[45,49],[46,49],[47,49],[38,50],[39,50],[40,50],[45,50],[46,50],[39,51],[40,52],[41,53],[42,54]]}
  }$town$::jsonb),
  ('work', $town${
    "ids": ["kitchen","well","helpers","fishing","forest","insects","farming","felling","mining"],
    "ranks": 10,
    "past": 0.25,
    "first": 10,
    "marks": {"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000],"felling":[50,150,350,700,1300,2200,3600,5500,8000,12000],"mining":[50,150,350,700,1300,2200,3600,5500,8000,12000]},
    "day": {"kitchen":150,"well":200,"helpers":200,"fishing":150,"forest":150,"insects":150,"farming":150,"felling":150,"mining":150},
    "kitchen": {"ladled":1,"pots":3,"ladling":9,"pot":{"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":3,"tomYum":4,"sourCurry":4,"friedPerch":2,"fishCake":4,"spicyEel":3,"grilledPrawn":2,"steamedGoby":3,"pumpkinSoup":5,"shabu":10,"somTam":3,"grilledEggplant":2,"tomKha":4,"friedGourami":2,"crabCurry":4,"steamedSheatfish":3,"friedFrog":2,"laab":4,"omelette":2,"snailCurry":4,"candiedPumpkin":5,"friedRice":3,"greenCurry":5,"khanomJeen":6,"hoMok":4,"mangoStickyRice":4,"bananaInCoconut":4,"taroPudding":6,"steamedCroaker":3,"gingerFish":4,"turmericFish":3,"jungleCurry":6,"megaLaab":20,"watermelonSlices":6,"khantoke":20,"naamPrik":4,"sushi":4,"ramen":3,"tempura":2,"unadon":2,"okonomiyaki":3,"kimchi":4,"bibimbap":4,"tteokbokki":3,"kimbap":3,"pajeon":2,"harGow":4,"chowMein":3,"springRoll":4,"congee":4,"mapoTofu":3,"pizza":6,"spaghetti":3,"risotto":4,"lasagna":6,"minestrone":5,"fishCurry":4,"naan":4,"biryani":5,"samosa":4,"lassi":3,"fishChips":4,"ukha":4,"thieboudienne":5,"piranhaSoup":3,"crawfishBoil":8,"masgouf":3,"salmonSteak":2,"arapaimaRoast":10,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":4,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":6,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":4,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"fishSauce":1,"compost":1,"growFert":1,"guardFert":1,"pestCure":1,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":1,"lineSpun":1,"mulch":1,"lavenderSachet":1,"bugNet":1,"torch":1,"driedFish":1,"saltedFish":1,"curryPaste":1,"pickle":1,"charcoal":1,"rope":1,"krabung":1,"noodle":1,"coconutMilk":1,"fermentedFish":1,"shrimpPaste":1,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":1}},
    "helpers": {"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3,"dust":2,"bellows":2},
    "fishing": {"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":1,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":1,"popotoFish":1,"rainbowFish":1,"moonFish":8},
    "forest": {"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"]},
    "insects": {"butterflyWhite":1,"monarch":1,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":1,"scarab":1,"caterpillar":1},
    "farming": {"kangkong":1,"scallion":1,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":3,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12},
    "felling": {"pine":2,"ironwood":2,"moonwood":2,"elder":10},
    "braced": 1,
    "mining": {"rock":1,"vein":3,"way":5,"crystal":10,"lent":1,"lending":1}
  }$town$::jsonb),
  ('gifts', $town${
    "slots": 2,
    "uses": {"thingSpoon":{"n":3,"per":"day"},"famSprite":{"n":3,"per":"meal"},"thingSpice":{"n":1,"per":"day"},"thingFlame":{"n":3,"per":"day"},"charmRing":{"n":3,"per":"day"},"thingDust":{"n":5,"per":"day"},"famOtter":{"n":10,"per":"meal"},"thingOrb":{"n":1,"per":"day"},"thingBait":{"n":3,"per":"day"},"famSquirrel":{"n":20,"per":"meal"},"famPiglet":{"n":10,"per":"meal"},"thingMap":{"n":3,"per":"day"},"thingNectar":{"n":10,"per":"day"},"thingFlute":{"n":1,"per":"span","ms":300000},"thingHourglass":{"n":1,"per":"day"},"famMandrake":{"n":7,"per":"day"}},
    "harder": {"from":4,"by":0.08},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":0.5},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":90},"thingBasket":{"kind":"thing","line":"kitchen","rank":2,"by":12},"thingSpoon":{"kind":"thing","line":"kitchen","rank":3,"by":1},"famSprite":{"kind":"familiar","line":"kitchen","rank":4,"by":1},"thingSpice":{"kind":"thing","line":"kitchen","rank":5,"by":4},"thingFlame":{"kind":"thing","line":"kitchen","rank":6,"by":1},"charmAnklet":{"kind":"charm","line":"helpers","rank":2,"by":2},"charmBell":{"kind":"charm","line":"helpers","rank":3,"by":2},"charmRing":{"kind":"charm","line":"helpers","rank":4,"by":30},"thingDust":{"kind":"thing","line":"helpers","rank":5,"by":12},"charmGuard":{"kind":"charm","line":"helpers","rank":6,"by":2},"famOtter":{"kind":"familiar","line":"fishing","rank":2,"by":1},"thingRod":{"kind":"thing","line":"fishing","rank":3,"by":0.75},"charmLine":{"kind":"charm","line":"fishing","rank":4,"by":3},"thingOrb":{"kind":"thing","line":"fishing","rank":5,"by":2},"thingBait":{"kind":"thing","line":"fishing","rank":6,"by":1},"famPiglet":{"kind":"familiar","line":"forest","rank":3,"by":1},"charmFirefly":{"kind":"charm","line":"forest","rank":4,"by":1},"thingMap":{"kind":"thing","line":"forest","rank":5,"by":1},"famStag":{"kind":"familiar","line":"forest","rank":6,"by":2},"thingNectar":{"kind":"thing","line":"insects","rank":3,"by":1},"charmWind":{"kind":"charm","line":"insects","rank":4,"by":1},"thingFlute":{"kind":"thing","line":"insects","rank":5,"by":15},"charmCloak":{"kind":"charm","line":"insects","rank":6,"by":3},"thingPouch":{"kind":"thing","line":"farming","rank":3,"by":5},"charmSickle":{"kind":"charm","line":"farming","rank":4,"by":1},"thingHourglass":{"kind":"thing","line":"farming","rank":5,"by":3},"famMandrake":{"kind":"familiar","line":"farming","rank":6,"by":1},"thingFlask":{"kind":"thing","line":"well","rank":4,"by":30},"famFrog":{"kind":"familiar","line":"well","rank":5,"by":45},"thingMoon":{"kind":"thing","line":"well","rank":6,"by":3},"charmEchoAxe":{"kind":"charm","line":"felling","rank":1,"by":3},"famWoodpecker":{"kind":"familiar","line":"felling","rank":2,"by":1},"thingBundle":{"kind":"thing","line":"felling","rank":3,"by":3},"charmMinerLamp":{"kind":"charm","line":"mining","rank":1,"by":4},"famBat":{"kind":"familiar","line":"mining","rank":2,"by":1},"thingSack":{"kind":"thing","line":"mining","rank":3,"by":5}}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v164>

-- The two rows that list the mountain are never run without it: a block written where the mountain is not laid out
-- (a production build) would leave the woodcutters no tree and the miners no rock.
do $$
begin
  if coalesce(jsonb_array_length(town.cat('trees')->'wood'), 0) = 0 or coalesce(jsonb_array_length(town.cat('mining')->'rocks'), 0) = 0 then
    raise exception 'the catalog has no tree or no rock of the mountain in it: its block was written where the mountain is not laid out';
  end if;
end $$;

-- ─── 2. The gate ─────────────────────────────────────────────────────────

insert into public.town_knobs (key, value) values
  ('far_open', 0),          -- whether the far side is open to every proved character: until it is, to admins only
  ('notice_gem', 100000),   -- the most a gem may be asked or offered for, at a stall and on the board
  ('notice_chip', 10000)    -- and a gem's fragment
  on conflict (key) do nothing;

-- Who is asking, of the far side: `town.member()`'s answer, with one thing more: the far side is open to them.
create or replace function town.far_member()
returns uuid language plpgsql stable set search_path = public
as $$
declare
  me uuid := town.member();
begin
  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) <= 0 then
    raise exception 'the far side is not open yet' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- Whether the far side is open to whoever asks: the same rule, as a yes or no.
create or replace function public.town_far()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.is_admin()
          or (public.verified_character()
              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0
              and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) > 0));
$$;

comment on function public.town_far() is
  'Whether Cash Town''s far side (the mountain and the cave) is open to whoever asks: an admin always, a proved '
  'character while town_knobs.game_open and town_knobs.far_open are both above nothing.';

-- ─── 3. What is kept ─────────────────────────────────────────────────────

-- The trees, the village's: lib/town/trees' newGrove().
insert into public.town_things (key, doc) values ('grove', '{"down": {}, "half": []}'::jsonb) on conflict (key) do nothing;

-- The word the rocks' rolls hang on. Made here, once, and read by nothing but the rules.
insert into public.town_secrets (key, word)
values ('mine', md5(random()::text || clock_timestamp()::text) || md5(random()::text || txid_current()::text))
on conflict (key) do nothing;

create or replace function town.mine_word()
returns text language sql stable set search_path = public
as $$ select s.word from public.town_secrets s where s.key = 'mine' $$;

-- A floor of the cave on a day. `day` is the day as the stamina counts it (`town.day_of`: it turns at dawn in
-- Bangkok), `floor` the floor (1 is the first under the mouth), `layout` the floor as lib/town/mining-row's
-- `caveLayout` makes it. The three are named as the site's server writes them.
create table if not exists public.town_cave_days (
  day     integer not null,
  floor   integer not null check (floor between 1 and 99),
  layout  jsonb not null check (jsonb_typeof(layout) = 'object'),
  written timestamptz not null default now(),
  primary key (day, floor)
);

alter table public.town_cave_days enable row level security;

-- Nobody in a browser reads or writes it. The site's key reads and inserts, and no more.
revoke all on table public.town_cave_days from anon, authenticated, service_role;
grant select, insert on table public.town_cave_days to service_role;

-- What is kept stays kept. Whoever is not this editor may only insert, and only a floor the cave has, of today or
-- of tomorrow (the site lays tomorrow's before the day turns), that is a floor: its rocks, every tile of its square,
-- its ladders. (It runs as whoever writes, so it asks nothing of the schema `town`, which the site's key does not
-- reach: the day and the cave's size are read from the catalog's own table.)
create or replace function town.cave_days_kept() returns trigger
language plpgsql set search_path = public
as $$
declare
  dawn_ integer;
  today integer;
  floors integer;
  side integer;
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'a floor that was laid is kept as it was laid' using errcode = '42501';
  end if;
  select (c.data->>'dawn')::integer into dawn_ from public.town_catalog c where c.key = 'rules';
  select (c.data->>'floors')::integer, (c.data->'at'->>'size')::integer into floors, side from public.town_catalog c where c.key = 'mining';
  today := ((floor(extract(epoch from now()) * 1000)::bigint + 7 * 3600000::bigint - dawn_ * 3600000::bigint) / 86400000)::integer;
  if new.day < today or new.day > today + 1 then
    raise exception 'that day is too far off for its floors to be laid now' using errcode = '22003';
  end if;
  if new.floor < 1 or new.floor > floors then
    raise exception 'the cave has no such floor' using errcode = '22003';
  end if;
  if jsonb_typeof(new.layout->'rocks') is distinct from 'array' or jsonb_typeof(new.layout->'open') is distinct from 'string'
     or length(new.layout->>'open') <> side * side or (new.layout->>'open') !~ '^[012]+$'
     or jsonb_typeof(new.layout->'up') is distinct from 'array' or jsonb_typeof(new.layout->'arrive') is distinct from 'array'
     or jsonb_typeof(new.layout->'down') is distinct from 'array' then
    raise exception 'that is no floor of the cave' using errcode = '22023';
  end if;
  new.written := now();
  return new;
end;
$$;

drop trigger if exists town_cave_days_kept on public.town_cave_days;
create trigger town_cave_days_kept before insert or update or delete on public.town_cave_days
  for each row execute function town.cave_days_kept();

-- A floor as it is laid on a day, for the rules: null where the site has not laid it.
create or replace function town.cave_laid(p_day integer, p_floor integer)
returns jsonb language sql stable set search_path = public
as $$ select c.layout from public.town_cave_days c where c.day = p_day and c.floor = p_floor $$;

-- Whether a day of the cave is laid whole: every floor the cave has. Until it is, whatever reads its floors for a
-- member answers `unlaid`.
create or replace function town.cave_is_laid(p_day integer)
returns boolean language sql stable set search_path = public
as $$ select (select count(*) from public.town_cave_days c where c.day = p_day) >= (town.cat('mining')->>'floors')::integer $$;

-- What the village shares of a place: 0 the mountain's foot, 1 and on the cave's floors.
create table if not exists public.town_cave (
  place      integer primary key check (place between 0 and 99),
  doc        jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.town_cave enable row level security;
revoke all on table public.town_cave from anon, authenticated;

-- A place's document as it is kept (an empty one where nothing has been kept of it yet). With `p_hold` the row is
-- made if it is not there and held until the transaction ends: of two who strike the same rock, the second waits
-- here and then sees what the first did.
create or replace function town.cave_kept(p_place integer, p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  kept jsonb;
begin
  if p_hold then
    insert into public.town_cave (place) values (p_place) on conflict (place) do nothing;
    select c.doc into kept from public.town_cave c where c.place = p_place for update;
  else
    select c.doc into kept from public.town_cave c where c.place = p_place;
  end if;
  return coalesce(kept, '{}'::jsonb);
end;
$$;

create or replace function town.keep_cave(p_place integer, p_doc jsonb)
returns void language sql set search_path = public
as $$ update public.town_cave set doc = p_doc, updated_at = now() where place = p_place $$;

-- ─── 4a. What a tool carries (lib/town/tools) ────────────────────────────

-- toolKindOf: the kind of tool a thing is forged as; null for everything else, the better tools of later tiers among it.
create or replace function town.tool_kind(p_item text)
returns text language sql stable
as $$ select case when town.cat('forge')->'kinds' ? p_item then p_item end $$;

-- lineKinds: the kinds of a kind's line, itself among them (itself alone, of a kind in no line).
create or replace function town.line_kinds(p_kind text)
returns jsonb language sql stable
as $$
  select coalesce((select l.value from jsonb_each(town.cat('forge')->'lines') l where l.value ? p_kind limit 1), jsonb_build_array(p_kind))
$$;

-- samePool: whether two kinds of tool draw their options from one pool: the same options, in the registry's order,
-- are drawn for both.
create or replace function town.same_pool(p_a text, p_b text)
returns boolean language sql stable
as $$
  select p_a = p_b or
    (select coalesce(jsonb_agg(o.id order by o.ord), '[]'::jsonb) from (select town.cat('forge')->'options' as k) f, jsonb_array_elements_text(f.k->'order') with ordinality o(id, ord) where f.k->'of'->o.id->'tools' ? p_a)
    = (select coalesce(jsonb_agg(o.id order by o.ord), '[]'::jsonb) from (select town.cat('forge')->'options' as k) f, jsonb_array_elements_text(f.k->'order') with ordinality o(id, ord) where f.k->'of'->o.id->'tools' ? p_b)
$$;

-- levelOf: a tool's plus, made sound: a whole number from nothing to the top; nothing, for a thing that is not forged.
create or replace function town.tool_level(p_stack jsonb)
returns integer language sql stable
as $$
  select case when p_stack is null or town.tool_kind(p_stack->>'item') is null or jsonb_typeof(p_stack->'plus') is distinct from 'number' then 0
    else greatest(0, least((town.cat('forge')->'forge'->>'top')::numeric, floor((p_stack->>'plus')::numeric)))::integer end
$$;

-- optsFor: what is kept as a tool's options, read as the options of a kind of tool: by the milestone, each of that
-- kind's and that milestone's pool, each once (null where there is none).
create or replace function town.tool_opts_for(p_kept jsonb, p_kind text)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  out_ jsonb := '[]'::jsonb;
  e jsonb;
  o jsonb;
  i integer;
begin
  for i in 0..jsonb_array_length(f->'forge'->'milestones') - 1 loop
    e := p_kept->i;
    o := case when jsonb_typeof(e) = 'string' then f->'options'->'of'->(e #>> '{}') end;
    if o is not null and (o->>'pool')::integer = (f->'forge'->'pools'->>i)::integer and o->'tools' ? p_kind
       and not exists (select 1 from jsonb_array_elements(p_kept) with ordinality b(v, ord) where b.ord - 1 < i and b.v = e) then
      out_ := out_ || jsonb_build_array(e);
    else
      out_ := out_ || '[null]'::jsonb;
    end if;
  end loop;
  return out_;
end;
$$;

-- carriedOf: a tool's options and the kind of tool they were drawn for, made sound. They are the tool's own kind's,
-- but for a forging that came out of a fellow of its line (`origin` on the stack) and has an option of that kind's.
create or replace function town.tool_carried(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  kind_ text := town.tool_kind(p_stack->>'item');
  kept jsonb := case when jsonb_typeof(p_stack->'opts') = 'array' then p_stack->'opts' else '[]'::jsonb end;
  from_ text := case when jsonb_typeof(p_stack->'origin') = 'string' then town.tool_kind(p_stack->>'origin') end;
  theirs jsonb;
begin
  if p_stack is null or kind_ is null then return jsonb_build_object('origin', null, 'opts', town.tool_opts_for('[]'::jsonb, '')); end if;
  if from_ is not null and from_ <> kind_ and town.line_kinds(kind_) ? from_ then
    theirs := town.tool_opts_for(kept, from_);
    if exists (select 1 from jsonb_array_elements(theirs) t(v) where t.v <> 'null'::jsonb) then return jsonb_build_object('origin', from_, 'opts', theirs); end if;
  end if;
  return jsonb_build_object('origin', kind_, 'opts', town.tool_opts_for(kept, kind_));
end;
$$;

-- drawnOf: the options a tool carries, by the milestone each was drawn at (null where none was): awake or asleep.
create or replace function town.tool_drawn(p_stack jsonb)
returns jsonb language sql stable
as $$ select town.tool_carried(p_stack)->'opts' $$;

-- originOf: the kind of tool a tool's options were drawn for; null for a thing that is not forged.
create or replace function town.tool_origin(p_stack jsonb)
returns text language sql stable
as $$ select town.tool_carried(p_stack)->>'origin' $$;

-- awayOf: whether a tool's forging sits in a kind of tool that draws from another pool than its options were drawn from.
create or replace function town.tool_away(p_stack jsonb)
returns boolean language sql stable
as $$
  select coalesce(k.kind is not null and k.origin is not null and not town.same_pool(k.origin, k.kind), false)
    from (select town.tool_kind(p_stack->>'item') as kind, town.tool_origin(p_stack) as origin) k
$$;

-- gemsOf: the elements of the gems set in a tool, one for each socket filled: made sound.
create or replace function town.tool_gems(p_stack jsonb)
returns jsonb language sql stable
as $$
  select case when p_stack is null or town.tool_kind(p_stack->>'item') is null or jsonb_typeof(p_stack->'gems') is distinct from 'array' then '[]'::jsonb
    else coalesce((select jsonb_agg(g.v order by g.ord)
      from (select e.v, e.ord from jsonb_array_elements(p_stack->'gems') with ordinality e(v, ord)
             where jsonb_typeof(e.v) = 'string' and town.cat('forge')->'elements' ? (e.v #>> '{}')
             order by e.ord limit (select (town.cat('forge')->'forge'->>'sockets')::integer)) g), '[]'::jsonb) end
$$;

-- makerName: a name as it is written on a tool: one line, no longer than a maker's name may be; nothing, of what is
-- no name. (The white space is the code's own list of it, said out: a database's own notion of it is another.)
create or replace function town.maker_name(p_name jsonb)
returns text language sql stable
as $$
  select case when jsonb_typeof(p_name) = 'string' then
    btrim(left(btrim(regexp_replace(p_name #>> '{}', '[\t\n\v\f\r    -     　﻿]+', ' ', 'g'), ' '),
               (town.cat('forge')->'forge'->>'maker')::integer), ' ')
    else '' end
$$;

-- makersOf: who forged a tool to each of its milestones, by the milestone (null where nobody is written).
create or replace function town.tool_makers(p_stack jsonb)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(case when k.kind is not null and k.kept is not null then nullif(town.maker_name(k.kept->((m.ord - 1)::integer)), '') end order by m.ord), '[]'::jsonb)
    from jsonb_array_elements(town.cat('forge')->'forge'->'milestones') with ordinality m(v, ord),
         (select town.tool_kind(p_stack->>'item') as kind, case when jsonb_typeof(p_stack->'makers') = 'array' then p_stack->'makers' end as kept) k
$$;

-- modsOf: everything a tool carries, as it works now: its kind, its plus, the options that work and those that
-- sleep, the level each element of its gems works at, and how it glows (0 to 2). (Its colour is the page's.)
create or replace function town.tool_mods(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('forge');
  kind_ text := town.tool_kind(p_stack->>'item');
  level_ integer;
  carried jsonb;
  drawn jsonb;
  away_ boolean;
  works integer;
  gems_ jsonb := '{}'::jsonb;
  e text;
begin
  if p_stack is null or kind_ is null then
    return jsonb_build_object('kind', null, 'level', 0, 'opts', '[]'::jsonb, 'asleep', '[]'::jsonb, 'gems', '{}'::jsonb, 'glow', 0);
  end if;
  level_ := town.tool_level(p_stack);
  carried := town.tool_carried(p_stack);
  drawn := coalesce((select jsonb_agg(o.v order by o.ord) from jsonb_array_elements(carried->'opts') with ordinality o(v, ord) where o.v <> 'null'::jsonb), '[]'::jsonb);
  away_ := not town.same_pool(carried->>'origin', kind_);
  works := least((k->>'gemLevels')::integer, 1 + case when level_ >= (k->'forge'->>'top')::integer then (k->'forge'->>'gemAtTop')::integer else 0 end);
  for e in select g.id from jsonb_array_elements_text(town.tool_gems(p_stack)) g(id) loop
    gems_ := gems_ || jsonb_build_object(e, works);
  end loop;
  return jsonb_build_object('kind', kind_, 'level', level_,
    'opts', case when away_ then '[]'::jsonb else drawn end, 'asleep', case when away_ then drawn else '[]'::jsonb end, 'gems', gems_,
    'glow', case when level_ >= (k->'forge'->'glow'->>'full')::integer then 2 when level_ >= (k->'forge'->'glow'->>'from')::integer then 1 else 0 end);
end;
$$;

-- has: whether a tool has an option that works: drawn at one of its milestones, and not asleep.
create or replace function town.tool_has(p_stack jsonb, p_opt text)
returns boolean language sql stable
as $$ select coalesce(town.tool_mods(p_stack)->'opts' ? p_opt, false) $$;

-- gemLevel: the level an element works at in a tool: nothing with no gem of it set.
create or replace function town.gem_level(p_stack jsonb, p_element text)
returns integer language sql stable
as $$ select coalesce((town.tool_mods(p_stack)->'gems'->>p_element)::integer, 0) $$;

-- gemBy: what an element gives a tool, from the steps of its levels: `p_else` with no gem of it set.
create or replace function town.gem_by(p_stack jsonb, p_element text, p_steps jsonb, p_else double precision default 0)
returns double precision language sql stable
as $$
  select case when l.v >= 1 then (p_steps->>(least(jsonb_array_length(p_steps), l.v) - 1))::double precision else p_else end
    from (select town.gem_level(p_stack, p_element) as v) l
$$;

-- optN: one of an option's own numbers (nothing, of a number it has not).
create or replace function town.opt_n(p_id text, p_key text)
returns double precision language sql stable
as $$ select coalesce((town.cat('forge')->'options'->'of'->p_id->'n'->>p_key)::double precision, 0) $$;

-- elementOfGem, elementOfChip: the element a gem is of, and a gem's fragment (null for anything else).
create or replace function town.gem_element(p_item text)
returns text language sql stable
as $$
  select e.id from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'elements') with ordinality e(id, ord)
   where f.k->'gems'->e.id->>'gem' = p_item order by e.ord limit 1
$$;

create or replace function town.chip_element(p_item text)
returns text language sql stable
as $$
  select e.id from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'elements') with ordinality e(id, ord)
   where f.k->'gems'->e.id->>'chip' = p_item order by e.ord limit 1
$$;

-- handSlot (lib/town/trade): which slot of the bag the thing in the hand is in: the one it was taken up from
-- (`p_taken`) while that still has one of it, or else the first that has; -1 with nothing held.
create or replace function town.hand_slot(p_purse jsonb, p_taken integer default null)
returns integer language plpgsql stable
as $$
declare
  hand_ text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
begin
  if hand_ is null then return -1; end if;
  if p_taken is not null and p_taken >= 0 and p_taken < jsonb_array_length(bag) and bag->p_taken->>'item' = hand_ then return p_taken; end if;
  return coalesce((select (b.ord - 1)::integer from jsonb_array_elements(bag) with ordinality b(v, ord) where b.v->>'item' = hand_ order by b.ord limit 1), -1);
end;
$$;

-- heldStack (lib/town/trade): the thing in the hand as the stack it is, with what it carries of its own: of two tools
-- of a kind the one taken up (the slot the purse remembers, `handAt`, while that slot still has the thing; or else
-- the first of the kind). Null with nothing held.
create or replace function town.hand_stack(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  at_ numeric := case when jsonb_typeof(p_purse->'handAt') = 'number' then (p_purse->>'handAt')::numeric end;
  slot_ integer;
begin
  slot_ := town.hand_slot(p_purse, case when at_ is not null and at_ = floor(at_) and abs(at_) < 2000000000 then at_::integer end);
  return case when slot_ < 0 then null else p_purse->'bag'->slot_ end;
end;
$$;

-- ─── 4b. What is counted by the day or the meal (lib/town/powers) ────────

-- powerRule: an option's count, if it is counted.
create or replace function town.power_rule(p_id text)
returns jsonb language sql stable
as $$ select town.cat('forge')->'options'->'of'->p_id->'use' $$;

-- powerUsed: how many times a counted option has been used in the stretch the moment is in (none, of a count kept
-- wrongly or of another stretch). Kept in the purse (`powers`), by the option: two tools with it share the count.
create or replace function town.power_used(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.power_rule(p_id);
  u jsonb := case when jsonb_typeof(p_purse->'powers') = 'object' then p_purse->'powers'->p_id end;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_at(rule, p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- powerLeft: how many times more it may be used in this stretch (none, of an option that is not counted).
create or replace function town.power_left(p_purse jsonb, p_id text, p_now bigint)
returns integer language sql stable
as $$
  select case when r.rule is null then 0 else greatest(0, (r.rule->>'n')::integer - town.power_used(p_purse, p_id, p_now)) end
    from (select town.power_rule(p_id) as rule) r
$$;

-- mayPower: whether a tool's counted option can be used now: the tool has it, and it has a time left in this stretch.
create or replace function town.may_power(p_purse jsonb, p_tool jsonb, p_id text, p_now bigint)
returns boolean language sql stable
as $$ select town.tool_has(p_tool, p_id) and town.power_left(p_purse, p_id, p_now) > 0 $$;

-- usePower: use a tool's counted option once.
create or replace function town.use_power(p_purse jsonb, p_tool jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  rule jsonb := town.power_rule(p_id);
  kept jsonb := case when jsonb_typeof(p_purse->'powers') = 'object' then p_purse->'powers' else '{}'::jsonb end;
  used_ integer;
begin
  if rule is null or not town.tool_has(p_tool, p_id) then return town.no('none'); end if;
  used_ := town.power_used(p_purse, p_id, p_now);
  if used_ >= (rule->>'n')::integer then return town.no('spent'); end if;
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - used_ - 1,
    'purse', p_purse || jsonb_build_object('powers', kept || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', used_ + 1))));
end;
$$;

-- ─── 4c. The pouches (lib/town/pouches) ──────────────────────────────────

-- pouchesOf: the pouches somebody has, each with what is in it made sound (as many slots as it has, each empty or a
-- plain stack of a thing it holds, never more than stack): those of the gifts they have, in the pouches' order.
-- Each as {gift, slots, holds}.
create or replace function town.pouches_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  had jsonb := town.gifts_of(p_purse)->'had';
  kept jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  p jsonb;
  mine jsonb;
  s jsonb;
  slots jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  for p in select e.v from jsonb_array_elements(town.cat('pouches')) with ordinality e(v, ord) order by e.ord loop
    continue when not (had ? (p->>'gift'));
    mine := kept->(p->>'gift');
    slots := '[]'::jsonb;
    for i in 0..(p->>'slots')::integer - 1 loop
      s := case when jsonb_typeof(mine) = 'array' then mine->i end;
      if s is not null and jsonb_typeof(s) = 'object' and jsonb_typeof(s->'item') = 'string' and p->'holds' ? (s->>'item')
         and jsonb_typeof(s->'n') = 'number' and (s->>'n')::numeric = floor((s->>'n')::numeric) and (s->>'n')::numeric > 0 then
        slots := slots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', least((s->>'n')::numeric, (town.cat('items')->(s->>'item')->>'stack')::numeric)::bigint));
      else
        slots := slots || '[null]'::jsonb;
      end if;
    end loop;
    out_ := out_ || jsonb_build_array(jsonb_build_object('gift', p->>'gift', 'slots', slots, 'holds', p->'holds'));
  end loop;
  return out_;
end;
$$;

-- roomIn: how many more of a thing somebody has room for: in the pouches that take it, and in the bag.
create or replace function town.room_in(p_purse jsonb, p_id text)
returns integer language sql stable
as $$
  select (town.room(p_purse->'bag', p_id)
    + coalesce((select sum(town.room(p.v->'slots', p_id)) from jsonb_array_elements(town.pouches_of(p_purse)) p(v) where p.v->'holds' ? p_id), 0))::integer
$$;

-- heldIn: how many of a thing somebody has: in the pouches and in the bag.
create or replace function town.held_in(p_purse jsonb, p_id text)
returns integer language sql stable
as $$
  select (town.held(p_purse->'bag', p_id)
    + coalesce((select sum(town.held(p.v->'slots', p_id)) from jsonb_array_elements(town.pouches_of(p_purse)) p(v)), 0))::integer
$$;

-- stow: a purse with some more of a thing: into the pouches that take it first, then the bag. (It must have the
-- room: `town.room_in`.) Named apart from `town.stow`, which is the storage box's.
create or replace function town.stow_away(p_purse jsonb, p_id text, p_n integer)
returns jsonb language plpgsql stable
as $$
declare
  out_ jsonb := p_purse;
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  left_ integer := p_n;
  add_ integer;
  p jsonb;
begin
  for p in select e.v from jsonb_array_elements(town.pouches_of(p_purse)) with ordinality e(v, ord) order by e.ord loop
    continue when left_ <= 0 or not (p->'holds' ? p_id);
    add_ := least(left_, town.room(p->'slots', p_id));
    if add_ > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.put(p->'slots', p_id, add_));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - add_;
    end if;
  end loop;
  if left_ > 0 then out_ := out_ || jsonb_build_object('bag', town.put(out_->'bag', p_id, left_)); end if;
  return out_;
end;
$$;

-- stowAll: a purse with several things more ([[thing, how many], …]), each put away as `town.stow_away` puts it:
-- null when they do not all fit.
create or replace function town.stow_all(p_purse jsonb, p_things jsonb)
returns jsonb language plpgsql stable
as $$
declare
  out_ jsonb := p_purse;
  t jsonb;
  many integer;
begin
  for t in select e.v from jsonb_array_elements(p_things) with ordinality e(v, ord) order by e.ord loop
    many := (t->>1)::integer;
    continue when many <= 0;
    if town.room_in(out_, t->>0) < many then return null; end if;
    out_ := town.stow_away(out_, t->>0, many);
  end loop;
  return out_;
end;
$$;

-- takeOut: a purse with some of a thing taken out: from the bag first, then the pouches. (It must hold as many:
-- `town.held_in`.)
create or replace function town.take_out(p_purse jsonb, p_id text, p_n integer)
returns jsonb language plpgsql stable
as $$
declare
  out_ jsonb := p_purse;
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  in_bag integer := least(p_n, town.held(p_purse->'bag', p_id));
  left_ integer;
  less integer;
  p jsonb;
begin
  if in_bag > 0 then out_ := out_ || jsonb_build_object('bag', town.take(p_purse->'bag', p_id, in_bag)); end if;
  left_ := p_n - in_bag;
  for p in select e.v from jsonb_array_elements(town.pouches_of(p_purse)) with ordinality e(v, ord) order by e.ord loop
    exit when left_ <= 0;
    less := least(left_, town.held(p->'slots', p_id));
    if less > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.take(p->'slots', p_id, less));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - less;
    end if;
  end loop;
  return out_;
end;
$$;

-- pouchToBag: move what is in a pouch's slot into the bag: as much of it as the bag has room for.
create or replace function town.pouch_to_bag(p_purse jsonb, p_gift text, p_slot integer)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := (select p.v from jsonb_array_elements(town.pouches_of(p_purse)) p(v) where p.v->>'gift' = p_gift limit 1);
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  s jsonb := case when p_slot is not null and p_slot >= 0 then mine->'slots'->p_slot end;
  many integer;
begin
  if mine is null or s is null or s = 'null'::jsonb then return town.no('none'); end if;
  many := least((s->>'n')::integer, town.room(p_purse->'bag', s->>'item'));
  if many <= 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'n', many, 'purse', p_purse || jsonb_build_object(
    'pouches', pouches || jsonb_build_object(p_gift, jsonb_set(mine->'slots', array[p_slot::text],
      case when (s->>'n')::integer > many then jsonb_build_object('item', s->>'item', 'n', (s->>'n')::integer - many) else 'null'::jsonb end)),
    'bag', town.put(p_purse->'bag', s->>'item', many)));
end;
$$;

-- bagToPouch: move what is in a slot of the bag into a pouch that takes it: as much of it as the pouches have room
-- for. Only a plain thing.
create or replace function town.bag_to_pouch(p_purse jsonb, p_slot integer)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is not null and p_slot >= 0 then p_purse->'bag'->p_slot end;
  mine jsonb := town.pouches_of(p_purse);
  pouches jsonb := case when jsonb_typeof(p_purse->'pouches') = 'object' then p_purse->'pouches' else '{}'::jsonb end;
  out_ jsonb := p_purse;
  left_ integer;
  add_ integer;
  p jsonb;
begin
  if s is null or s = 'null'::jsonb or coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' or town.forged(s) then return town.no('none'); end if;
  left_ := (s->>'n')::integer;
  for p in select e.v from jsonb_array_elements(mine) with ordinality e(v, ord) order by e.ord loop
    continue when left_ <= 0 or not (p->'holds' ? (s->>'item'));
    add_ := least(left_, town.room(p->'slots', s->>'item'));
    if add_ > 0 then
      pouches := pouches || jsonb_build_object(p->>'gift', town.put(p->'slots', s->>'item', add_));
      out_ := out_ || jsonb_build_object('pouches', pouches);
      left_ := left_ - add_;
    end if;
  end loop;
  if left_ = (s->>'n')::integer then
    return town.no(case when exists (select 1 from jsonb_array_elements(mine) q(v) where q.v->'holds' ? (s->>'item')) then 'full' else 'none' end);
  end if;
  return jsonb_build_object('ok', true, 'n', (s->>'n')::integer - left_, 'purse', out_ || jsonb_build_object(
    'bag', jsonb_set(out_->'bag', array[p_slot::text], case when left_ > 0 then s || jsonb_build_object('n', left_) else 'null'::jsonb end)));
end;
$$;

-- ─── 5a. A forged tool is no plain thing (lib/town/trade) ────────────────

-- forged: whether a tool carries something of its own: a plus, an option drawn for it, a gem set in it. Read as it
-- is kept, of any stack: nothing here asks what kind of thing it is.
create or replace function town.forged(p_stack jsonb)
returns boolean language sql immutable
as $$
  select coalesce(
    case when jsonb_typeof(p_stack->'plus') = 'number' then (p_stack->>'plus')::numeric > 0 else false end
    or case when jsonb_typeof(p_stack->'opts') = 'array' then jsonb_array_length(p_stack->'opts') > 0 else false end
    or case when jsonb_typeof(p_stack->'gems') = 'array' then jsonb_array_length(p_stack->'gems') > 0 else false end, false)
$$;

-- ─── 5b. The most a gem may be asked for (lib/town/notices' dearOf) ──────

-- dearOf: the most a gem or a gem's fragment may be asked or offered for, on the board and at a stall; null for any
-- other thing. The two numbers are knobs, beside the board's others.
create or replace function town.dear_of(p_item text)
returns integer language sql stable set search_path = public
as $$
  select case
    when town.gem_element(p_item) is not null then coalesce((select k.value from public.town_knobs k where k.key = 'notice_gem'), 100000)
    when town.chip_element(p_item) is not null then coalesce((select k.value from public.town_knobs k where k.key = 'notice_chip'), 10000) end
$$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (empty places: build-v164.mjs puts each function here as the database has it, with the lines of
-- v164.base.lines.mjs in place. Left empty in this file on purpose: a pasted copy would undo whatever a file that
-- runs before v164 wrote into the same function.)

-- <town.plain>
-- </town.plain>

-- <town.take_plain>
-- </town.take_plain>

-- <town.push>
-- </town.push>

-- <town.jar_drop>
-- </town.jar_drop>

-- <town.leave>
-- </town.leave>

-- <town.hold>
-- </town.hold>

-- <town.shop_cap>
-- </town.shop_cap>

-- <town.notice_cap>
-- </town.notice_cap>

-- ─── What a member calls ─────────────────────────────────────────────────

-- Whether today's cave is laid, for a page: yes, or the refusal `unlaid` while today's floors are not all there (the
-- page then asks the site once to lay them, which the site's server does and never a page, and asks again). Either
-- way with this clock, today's number, how many floors a day has, and the days from today on that are laid whole.
create or replace function public.town_cave_days()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  now_ bigint := town.now_ms();
  today integer := town.day_of(now_);
  floors integer := (town.cat('mining')->>'floors')::integer;
begin
  perform town.far_member();
  return (case when town.cave_is_laid(today) then jsonb_build_object('ok', true) else town.no('unlaid') end)
    || jsonb_build_object('now', now_, 'day', today, 'floors', floors,
      'laid', coalesce((select jsonb_agg(d.day order by d.day)
        from (select c.day from public.town_cave_days c where c.day >= today group by c.day having count(*) >= floors) d), '[]'::jsonb));
end;
$$;

-- A pouch's slot emptied into the bag, as much of it as the bag has room for.
create or replace function public.town_pouch_out(p_gift text, p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  did jsonb := town.pouch_to_bag(town.purse_of(me, true), p_gift, p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- A slot of the bag put into a pouch that takes it, as much of it as the pouches have room for.
create or replace function public.town_pouch_in(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  did jsonb := town.bag_to_pouch(town.purse_of(me, true), p_slot);
begin
  if (did->>'ok')::boolean then perform town.keep_purse(me, did->'purse'); end if;
  return town.answer(me, did);
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_far() from public, anon;
grant execute on function public.town_far() to authenticated;
revoke execute on function public.town_cave_days() from public, anon;
grant execute on function public.town_cave_days() to authenticated;
revoke execute on function public.town_pouch_out(text, integer) from public, anon;
grant execute on function public.town_pouch_out(text, integer) to authenticated;
revoke execute on function public.town_pouch_in(integer) from public, anon;
grant execute on function public.town_pouch_in(integer) to authenticated;

-- ─── What the base should say afterwards (for the file's foot, where the parts are put together) ─────────────────
--
--   select key, value from public.town_knobs where key in ('far_open', 'notice_chip', 'notice_gem') order by key;
--   -- far_open    | 0          (closed: opened with `update public.town_knobs set value = 1 where key = 'far_open';`)
--   -- notice_chip | 10000
--   -- notice_gem  | 100000
--
--   select (select jsonb_array_length(data->'wood') from public.town_catalog where key = 'trees') as trees,
--          (select jsonb_array_length(data->'rocks') from public.town_catalog where key = 'mining') as rocks,
--          (select jsonb_array_length(data) from public.town_catalog where key = 'pouches') as pouches,
--          (select count(*) from public.town_catalog where key in ('forge', 'trees', 'mining', 'pouches')) as new_rows;
--   -- 121 | 54 | 2 | 4
--
--   select c.relname, c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as a_browsers_grants,
--          (select string_agg(g.privilege_type, ', ' order by g.privilege_type) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee = 'service_role') as the_sites_key
--     from pg_class c where c.oid in ('public.town_cave_days'::regclass, 'public.town_cave'::regclass) order by 1;
--   -- town_cave      | true | 0 | (whatever a table of the town's has: no browser's)
--   -- town_cave_days | true | 0 | INSERT, SELECT
--
--   select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_far', 'town_cave_days', 'town_pouch_out', 'town_pouch_in') order by 1;
--   -- town_cave_days | true | false | true
--   -- town_far       | true | false | true
--   -- town_pouch_in  | true | false | true
--   -- town_pouch_out | true | false | true
--
--   select (select doc from public.town_things where key = 'grove') as grove, (select length(word) from public.town_secrets where key = 'mine') as word,
--          town.shop_cap('gemRuby', town.shop_knobs()) as a_gem, town.notice_cap('chipRuby', town.notice_knobs()) as a_fragment, town.shop_cap('worm', town.shop_knobs()) as a_worm;
--   -- {"down": {}, "half": []} | 64 | 100000 | 10000 | 10      (the grove as it is on the first run; later, whatever has been felled)
--
--   -- (in the SQL editor nobody is signed in, so this says false; it is the page's to ask)
--   select public.town_far();
--   -- false
