-- v164 — the far side: the mountain's trees, its rocks, and the cave under it
--
-- Run it once in the Supabase SQL editor, after v168 (v165 to v168 ran before
-- it, though its number is lower: the number was kept for the mountain).
-- Running it again is safe. **Run it after the site's own code for it is
-- live** (see "The page", below).
--
-- What it is. The far side is the mountain over the bridge the village built
-- by hand (v160): its trees, felled with an axe on the woodcutters' line of
-- work, and its rocks, broken with a pick on the miners', with a cave of
-- thirty floors under it. The rules are lib/town's written again (trees,
-- felling, mining, cave-state, tools, powers, pouches), each held to the code
-- case by case; what the database decides and what a page is believed about
-- is said at the head of each part below.
--
-- **THE BLACKSMITH IS NOT IN IT.** Smelting, forging, a gem set in a tool, a
-- forging moved to another tool and the great fire come with a migration of
-- his own, later (the owner, 2026-10-09: the first opening is the mountain
-- with mining and felling only). So there is no table for a member's smithy
-- here, no rule of his, and no answer has a `fire` in it. What IS here of
-- forging is what a pick or an axe is read by from the first day, while every
-- tool is still as it was bought: the catalog's `forge` row, the readers of
-- what a tool carries, and the rule that a tool which carries something of
-- its own is no plain thing at a stall, on the board, in a deal or in the jar.
--
-- **IT IS BUILT CLOSED.** The knob `far_open` is made at 0. While it is,
-- every function of the far side answers an admin and refuses everybody else
-- (42501, as the game refuses whoever it is shut to), and `town_far()`, which
-- a page asks first, says no: a member's page shows nothing of the mountain
-- and asks nothing more of it. Its owner opens it with one line, with no
-- deploy, when he has tried it:
--
--   update public.town_knobs set value = 1 where key = 'far_open';
--
-- (and shuts it again with `value = 0`). The bridge has its own line, v160's:
-- the far side being open does not open the bridge, nor the bridge the far
-- side.
--
-- What it makes:
--
--   · three knobs: `far_open` (0), `notice_gem` and `notice_chip` (the most a
--     gem and a gem's fragment may be asked for at a stall and on the board);
--   · four catalog rows seeded (`forge`, `trees`, `mining`, `pouches`) and
--     nine written over as the code has them (`items`, `goods`, `shelf`,
--     `hints`, `makes`, `cooking`, `work`, `gifts`, `box`): the pick and the
--     axe on the first day's shelf, the wood, the stone, the ore, the gems and
--     the torch, the two new lines of work and their gifts, and where the
--     chest at the mountain's foot stands (it opens a member's storage box as
--     the plaza's does: `box.more`);
--   · the village's trees as a row of `town_things` (`grove`), and the word
--     the rocks' rolls hang on as a row of `town_secrets` (`mine`), made once;
--   · two tables, closed: `town_cave_days` (a floor of the cave on a day, laid
--     by the site's server with its own key, which may read and insert and no
--     more; what is laid stays as it was laid) and `town_cave` (what the
--     village shares of a place: 0 the mountain's foot, 1 to 30 the floors);
--   · 151 rules in the schema `town`, no browser's to call;
--   · seventeen functions a member calls, each for the signed in and each
--     beginning with the gate: `town_far`, `town_cave_days`, `town_pouch_out`,
--     `town_pouch_in`; `town_trees`, `town_fell_begin`, `town_fell`,
--     `town_fell_brace`, `town_fell_root`; `town_cave`, `town_mine`,
--     `town_mine_peek`, `town_cave_reach`, `town_lift`, `town_torch`,
--     `town_drill`, `town_vein`;
--   · and eleven functions that were there, each with a small marked block
--     more and nothing else of it touched: `town.plain`, `town.take_plain`,
--     `town.push`, `town.jar_drop`, `town.leave`, `town.hold` (a forged tool is
--     no plain thing), `town.shop_cap`, `town.notice_cap` (a gem's most),
--     `town.by_box` (the chest at the mountain's foot), and
--     `town.work_counts_of` and `town.deed_th`, which have TWO blocks more
--     each, the woodcutters' and the miners' (what a deed of theirs counts for
--     on its line, and a Thai word for each). **A file after this one that
--     writes any of the eleven again carries this file's blocks with its
--     own.**
--
-- The storage box is not the far side's: it is v134's, behind the game's own
-- gate, and the mountain's chest opens it whether the far side is open or
-- not. (Where a member stands is the page's word at every chest: the database
-- cannot know it. Shutting that chest by the far side's knob would keep
-- nobody from anything.)
--
-- No coins are made by it. What comes of a tree and of a rock are things:
-- logs, timber, stone, ore, fragments, which a member sells as they sell
-- anything.
--
-- The page. The site's code for the far side has been live since 2026-10-09
-- with the far side shut: it asks `town_far()`, is told nothing by a database
-- that has not had this file, and shows nothing. **Four things of the page's
-- keeper are newer than that and have to be live before this file runs**
-- (lib/town/keeper.ts): the trees are asked for once the far side says yes;
-- the keepsakes of a go are read from `keeps`; a vein's go is told as an
-- account (`town_vein(p_go)`, lib/town/vein-account); and a function of the
-- cave or the rocks refused shuts the far side on the page, not the whole
-- game. With the older page and this file, a member sees no difference while
-- the far side is closed to them; an admin is told no trees and cannot play a
-- vein out; and once it has been opened, shutting it again would show the
-- game as shut to whoever stood in the cave. A page left open since before
-- that deploy has to be loaded again.
--
-- The site's server lays the cave's floors (`town_cave_days`: today's and
-- tomorrow's, thirty a day) when a page asks it to; until a day is laid, what
-- reads a floor answers `unlaid` and changes nothing.
--
-- Safe to run twice. A knob that is there is left as it is (the far side,
-- once opened, stays open); the four seeded rows are left as they are, the
-- nine others written over with the same; the trees that are down, the
-- rocks' word, the cave's rows and every purse are not touched; every
-- function is written again as the first run left it.
--
-- How it was put together. Three parts, each written and proved alone
-- (v164.base.sql, v164.felling.sql, v164.mining.sql in the fc-cash-town
-- skill's scripts/db), run in that order: the two others stand on the base.
-- Each part's own head is kept below as the head of its section, word for
-- word. Where one says that nothing of an earlier file's function is pasted
-- and that its place is left empty, the place is FILLED in this file: by
-- assemble-v164.mjs, from the function's own text as the stand-in database
-- had it after v168 and after the parts above it, with the part's lines in
-- place. So the second statement of `town.work_counts_of` and of
-- `town.deed_th` (the miners') has the woodcutters' block in it too.
--
-- What to see afterwards is at the file's foot.
--
-- BEFORE RUNNING IT, if any file of the town's has run since v168: the 11 functions this file writes again were
-- built from their text as it stood after v168. This says whether they are that text still (in the SQL editor; it
-- reads and changes nothing). `true | 11` before the file has ever run; if it says false then, put the file together
-- again from a stand-in that has the later file (assemble-v164.mjs) and do not run this one. (Once this file has
-- run it says false, rightly: the 11 have their blocks.)
--
--   select coalesce(bool_and(md5(replace(p.prosrc, chr(13), '')) = w.was), false) as as_they_were, count(p.oid) as found
--     from (values
--       ('town.plain(jsonb, text)', '5fffc6b01b125c5e50feeb8639f8ddfd'),
--       ('town.take_plain(jsonb, text, integer)', 'a35791f0eeb2dbe77e83552d9c4a616e'),
--       ('town.push(jsonb, jsonb)', '1df4d4d9b0f8be77016812dbd5edba38'),
--       ('town.jar_drop(jsonb, jsonb, jsonb)', '05128090698fcf3d911781653af9b1dc'),
--       ('town.leave(jsonb, integer, integer, bigint, integer)', '91061b112e76b47a4cd21d1b9eb72bf2'),
--       ('town.hold(jsonb, integer)', '8a8c52001554b809955bbd04e8d1f3ca'),
--       ('town.shop_cap(text, jsonb)', 'cd8415c63e6879e84ddd238197abd41d'),
--       ('town.notice_cap(text, jsonb)', 'cd8415c63e6879e84ddd238197abd41d'),
--       ('town.by_box(integer, integer)', '9b42b6810e52ca193e9883755aa12957'),
--       ('town.work_counts_of(jsonb, text)', '50c6d8a42a50ad38a1403a8a6bc9d5f5'),
--       ('town.deed_th(text)', '536d84280b002b8a6fd1ebd5b09fca9b')
--     ) w(fn, was) left join pg_proc p on p.oid = to_regprocedure(w.fn);
--   -- true | 11

-- ═══ Part 1 of 3: the base, which the two others stand on ══════════════════════════════════════════════════════════

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
--   1. THE CATALOG. Four rows seeded (`forge`, `trees`, `mining`, `pouches`) and nine written over (`items`,
--      `goods`, `shelf`, `hints`, `makes`, `cooking`, `work`, `gifts`, `box`): every row that differs from the
--      database as it stands. The block is written from lib/town/catalog.ts (fill-catalog.mjs v164 <this file>).
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
-- THE CHEST AT THE MOUNTAIN'S FOOT opens a member's storage box as the plaza's does (lib/town/box's `nearBox`). The
-- box is v134's and is not the far side's: `town_box_put` and `town_box_take` begin with the game's gate, not this
-- part's. What this part does is tell the database where that chest stands: the catalog's `box` row has `more` (the
-- tiles of the chests beyond the plaza's), and `town.by_box` reads it. IT ANSWERS WHETHER THE FAR SIDE IS OPEN OR
-- NOT, as the code does: the tile a member says they stand on is the page's word at every chest (the database cannot
-- know where anybody stands), so a browser that would say the mountain's tile while the far side is shut could as
-- well say the plaza's; shutting the far chest by the knob would keep nobody from anything, and would have a member
-- who stands there when the far side is shut again told to stand nearer a chest they are beside.
--
-- Nine functions that were there have a small marked block more each: the six that a forged tool is no plain thing
-- to (`town.plain`, `town.take_plain`, `town.push`, `town.jar_drop`, `town.leave`, `town.hold`), the two caps
-- (`town.shop_cap`, `town.notice_cap`) and `town.by_box`. NOTHING OF THEM IS PASTED HERE: v164.base.lines.mjs says the lines, and
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
  if to_regprocedure('town.by_box(integer, integer)') is null then raise exception 'v134 has not run yet: the chest at the mountain''s foot opens its storage box'; end if;
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
  }$town$::jsonb),
  ('box', $town${
    "slots": 10,
    "reach": 2,
    "at": [34,34],
    "more": [[67,242]]
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
-- (each function below is the database's own text as it stood after v168, with the lines of
-- v164.base.lines.mjs in place: built by assemble-v164.mjs, never typed. If a file that writes one of them has
-- run since v168, its change is undone here: this file's head says how to look first.)

-- <town.plain>
create or replace function town.plain(p_bag jsonb, p_id text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $$
  select coalesce(sum((s->>'n')::int), 0)::integer from jsonb_array_elements(p_bag) s
   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0
     -- ── v164: a tool that carries something of its own is no plain thing ──
     and not town.forged(s)
$$;
-- </town.plain>

-- <town.take_plain>
create or replace function town.take_plain(p_bag jsonb, p_id text, p_n integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $$
declare
  bag jsonb := p_bag;
  s jsonb;
  more integer := p_n;
  less integer;
  i integer;
begin
  for i in reverse jsonb_array_length(bag) - 1..0 loop
    exit when more <= 0;
    s := bag->i;
    -- ── v164: a tool that carries something of its own is no plain thing, and is passed over ──
    continue when town.forged(s);
    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then
      less := least(more, (s->>'n')::int);
      more := more - less;
      bag := jsonb_set(bag, array[i::text],
        case when (s->>'n')::int = less then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::int - less) end);
    end if;
  end loop;
  return bag;
end;
$$;
-- </town.take_plain>

-- <town.push>
create or replace function town.push(p_bag jsonb, p_stacks jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  bag jsonb := p_bag;
  s jsonb;
  slot integer;
begin
  for s in select e.v from jsonb_array_elements(p_stacks) with ordinality e(v, ord) order by e.ord loop
    -- ── v164: a tool that carries something of its own is moved whole too, into a slot of its own ──
    if coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' or town.forged(s) then
      select (b.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality b(v, ord) where b.v = 'null'::jsonb order by b.ord limit 1;
      if slot is null then return null; end if;
      bag := jsonb_set(bag, array[slot::text], s);
    else
      if town.room(bag, s->>'item') < (s->>'n')::numeric then return null; end if;
      bag := town.put(bag, s->>'item', (s->>'n')::int);
    end if;
  end loop;
  return bag;
end;
$$;
-- </town.push>

-- <town.jar_drop>
create or replace function town.jar_drop(p_purse jsonb, p_jar jsonb, p_what jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  v_coins numeric;
  v_slot integer;
  v_n numeric;
  s jsonb;
begin
  if p_what ? 'coins' then
    v_coins := (p_what->>'coins')::numeric;
    if v_coins is null or v_coins <> floor(v_coins) or v_coins <= 0 then return town.no('amount'); end if;
    if v_coins > (p_purse->>'coins')::numeric then return town.no('coins'); end if;
    return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::integer - v_coins::integer),
      'jar', p_jar || jsonb_build_object('coins', (p_jar->>'coins')::integer + v_coins::integer));
  end if;
  v_slot := (p_what->>'slot')::integer;
  v_n := (p_what->>'n')::numeric;
  s := case when v_slot >= 0 then p_purse->'bag'->v_slot end;
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  -- ── v164: what carries something of its own is no plain thing ──
  if town.forged(s) then return town.no('unwanted'); end if;
  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;
  if v_n is null or v_n <> floor(v_n) or v_n <= 0 or v_n > (s->>'n')::numeric then return town.no('amount'); end if;
  return jsonb_build_object('ok', true,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[v_slot::text],
      case when (s->>'n')::integer = v_n::integer then 'null'::jsonb else s || jsonb_build_object('n', (s->>'n')::integer - v_n::integer) end)),
    'jar', p_jar || jsonb_build_object('things', town.jar_add(p_jar->'things', s->>'item', v_n::integer)));
end;
$$;
-- </town.jar_drop>

-- <town.leave>
create or replace function town.leave(p_purse jsonb, p_slot integer, p_n integer, p_now bigint, p_f integer DEFAULT 100)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  cur integer := town.round_of(p_now);
  pays integer;
  lots jsonb := p_purse->'left';
  same integer := -1;
  i integer;
begin
  if p_n is null or p_n < 1 then return town.no('amount'); end if;
  if s is null or s = 'null'::jsonb or (s->>'n')::int < p_n then return town.no('none'); end if;
  pays := (town.cat('items')->(s->>'item')->>'pays')::int;
  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;
  -- ── v164: a tool that carries something of its own is not left to be sold as one of its kind ──
  if town.forged(s) then return town.no('unwanted'); end if;
  for i in 0..jsonb_array_length(lots) - 1 loop
    if lots->i->>'item' = s->>'item' and (lots->i->>'round')::int = cur and (lots->i->>'pays')::int = pays
       and coalesce((lots->i->>'f')::int, 100) = coalesce(p_f, 100) then same := i; exit; end if;
  end loop;
  if same < 0 then
    lots := lots || jsonb_build_array(jsonb_build_object('item', s->>'item', 'n', p_n, 'pays', pays, 'round', cur)
      || case when coalesce(p_f, 100) = 100 then '{}'::jsonb else jsonb_build_object('f', p_f) end);
  else
    lots := jsonb_set(lots, array[same::text, 'n'], to_jsonb((lots->same->>'n')::int + p_n));
  end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::int = p_n then 'null'::jsonb else jsonb_build_object('item', s->>'item', 'n', (s->>'n')::int - p_n) end),
    'left', lots));
end;
$$;
-- </town.leave>

-- <town.hold>
create or replace function town.hold(p_purse jsonb, p_slot integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb then return town.no('none'); end if;
  -- ── v164: the slot it was taken up from is kept too (of two tools of a kind, which is held) ──
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item', 'handAt', p_slot));
end;
$$;
-- </town.hold>

-- <town.shop_cap>
create or replace function town.shop_cap(p_item text, p_k jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  select case
    -- ── v164: a gem and a gem's fragment have a most of their own, whatever the relatives pay ──
    when town.dear_of(p_item) is not null then town.dear_of(p_item)
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$$;
-- </town.shop_cap>

-- <town.notice_cap>
create or replace function town.notice_cap(p_item text, p_k jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  select case
    -- ── v164: a gem and a gem's fragment have a most of their own, whatever the relatives pay ──
    when town.dear_of(p_item) is not null then town.dear_of(p_item)
    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0 then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int
    else (p_k->>'capless')::int end
$$;
-- </town.notice_cap>

-- <town.by_box>
create or replace function town.by_box(p_x integer, p_y integer)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $$
  select coalesce(greatest(abs(p_x - (b.k->'at'->>0)::int), abs(p_y - (b.k->'at'->>1)::int)) between 1 and (b.k->>'reach')::int, false)
    -- ── v164: a chest beyond the plaza's opens the same box, from as near (the mountain's foot has one) ──
    or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(b.k->'more') = 'array' then b.k->'more' else '[]'::jsonb end) c(v)
                where greatest(abs(p_x - (c.v->>0)::int), abs(p_y - (c.v->>1)::int)) between 1 and (b.k->>'reach')::int)
    from (select town.cat('box') as k) b
$$;
-- </town.by_box>

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

-- ═══ Part 2 of 3: the woodcutters' part: the mountain's trees ══════════════════════════════════════════════════════

-- v164, the woodcutters' part: the mountain's trees, felled with an axe (lib/town/trees and lib/town/felling, written
-- again). Tried by try-v164.mjs on the stand-in's snapshot, with the base run before it. Safe to run twice.
--
-- stands on: base
--
-- THE BLACKSMITH AND THE GREAT FIRE ARE NOT HERE (the base's head says why): a tree felled is nobody's tinder yet,
-- and what a member is answered has no `fire` in it.
--
--   * A tree is everybody's: felled, it is a stump for the whole village until the clock brings it back. Who felled
--     which and when is the base's `grove` (a row of `town_things`, lib/town/trees' `Grove`): this part makes no table.
--   * A tree always falls, and always gives its logs. The board is played for the fine timber besides; the plain way
--     fells the tree at once for its logs alone.
--   * One go on a tree at a time: from the moment a board is put up its trees are held for whoever put it up, for as
--     long as the catalog says (`trees.go.secs`), and nobody else's board or plain press takes on any of them. A hold
--     that has lapsed frees its trees.
--   * A friend may brace the trunk of a go that is open, and has a log for it when the go is over.
--   * A pine lets a keepsake fall now and then: kept in the purse of whoever felled it, never in the bag, and written
--     in the village's book the first time one of its kind is found.
--
-- WHAT THE BROWSER IS BELIEVED ABOUT, and nothing else:
--
--   * the tile stood on, which is held to the tree's own place (a tree is felled from beside it, a trunk braced from
--     within the brace's reach);
--   * how the board went: whether the trunk was cut through, with how many misses (kept as a whole number from
--     nothing to the most chops any trunk takes: no board has more branches than that), and the seconds the hand
--     says it played (kept from nothing to an hour; a go cut through faster than a hand can chop is no go).
--
-- The board itself is played in the browser, from what `town_fell_begin` answers; which trees a go is for, what each
-- gives, what it costs and every number of chance are decided HERE.
--
-- THE ORDER ROWS ARE HELD IN (the base's): the `grove` first, then members' purses by their ids, the lesser first.
-- A go with its trunk braced pays a SECOND member, the friend: `town_fell` reads who that is off the grove once it
-- holds it, and only then takes the two purses, in the order of their ids.
--
-- Every number is the catalog's (`trees`; `work` for what a tree is worth on the line): no rule here has one of its
-- own. An axe is read by the base's readers of a tool (`town.tool_level`, `tool_has`, `gem_by`, `opt_n`,
-- `hand_stack`), its counted powers by `town.use_power`, and wood is put away by `town.stow_all` (the firewood cord
-- before the bag).
--
-- Two functions that were there have a small marked block more each (v164.felling.lines.mjs says the lines, and
-- build-v164.mjs builds each from the function's own text as the database then has it): `town.work_counts_of` (a
-- tree felled counts on the woodcutters' line, and a trunk braced on the helpers') and `town.deed_th` (a word for
-- each deed here). NOTHING OF THEM IS PASTED HERE.

do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.hand_stack(jsonb)') is null or to_regprocedure('town.stow_all(jsonb, jsonb)') is null
     or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null then
    raise exception 'v164''s base has not run yet: the woodcutters'' part stands on its gate, its readers of a tool, its powers and its pouches';
  end if;
  if town.cat('trees') is null or jsonb_typeof(town.cat('trees')->'wood') is distinct from 'array' or jsonb_array_length(town.cat('trees')->'wood') = 0 then
    raise exception 'the catalog''s `trees` row has no tree in it: every number of the woodcutters'' is read from it';
  end if;
  if not exists (select 1 from public.town_things t where t.key = 'grove') then raise exception 'the village has no `grove` row yet: it is the base''s to make'; end if;
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.eased(jsonb, jsonb, bigint, double precision, double precision)') is null then
    raise exception 'v121, v149 and v151 have not all run yet: the woodcutters write their deeds down, count on a line, and owe the rest of a point of stamina';
  end if;
end $$;

-- ─── A tree, as the layout has it (lib/town/trees) ───────────────────────

-- treeOf: a tree of the layout, as the catalog has it: [number, x, y, tier, tiles across, girth]. Null for no tree.
create or replace function town.tree_of(p_id integer)
returns jsonb language sql stable
as $$ select w.v from jsonb_array_elements(town.cat('trees')->'wood') with ordinality w(v, ord) where (w.v->>0)::integer = p_id order by w.ord limit 1 $$;

-- (the ancient tree is the one with the number the catalog names)
create or replace function town.tree_elder(p_tree jsonb)
returns boolean language sql stable
as $$ select (p_tree->>0)::integer = (town.cat('trees')->'elder'->>'id')::integer $$;

-- kindOf: what a tree is called in what is written down, and counted as on the line.
create or replace function town.tree_kind(p_tree jsonb)
returns text language sql stable
as $$ select case when town.tree_elder(p_tree) then c.k->>'elderKind' else c.k->'kinds'->>((p_tree->>3)::integer - 1) end from (select town.cat('trees') as k) c $$;

-- girthOf: a tree's girth, its own from its number: the catalog's row has it worked out, tree by tree.
create or replace function town.tree_girth(p_tree jsonb)
returns integer language sql immutable
as $$ select (p_tree->>5)::integer $$;

-- girthKnobs: what a tree's girth makes of its game: {chops, pace, spent, family, timber}. The ancient tree's are its
-- own, and its one prize bears every miss (lib/town/tools' ALL, which the catalog has in its `mining` row).
create or replace function town.tree_knobs(p_tree jsonb)
returns jsonb language sql stable
as $$
  select case when town.tree_elder(p_tree)
    then jsonb_build_object('chops', c.k->'elderChops', 'pace', c.k->'elderPace', 'spent', c.k->'elderSpent', 'family', c.k->'elderFamily',
           'timber', jsonb_build_array((town.cat('mining')->>'all')::integer))
    else c.k->'girths'->(town.tree_girth(p_tree) - 1) end
    from (select town.cat('trees') as k) c
$$;

-- bearsOf: the misses each of a tree's fine timbers bears.
create or replace function town.tree_bears(p_tree jsonb)
returns jsonb language sql stable
as $$ select town.tree_knobs(p_tree)->'timber' $$;

-- mostTimber: the fine timber a tree gives at the most.
create or replace function town.tree_most(p_tree jsonb)
returns integer language sql stable
as $$ select case when town.tree_elder(p_tree) then (town.cat('trees')->'elder'->>'timber')::integer else jsonb_array_length(town.tree_bears(p_tree)) end $$;

-- farFrom: how far a tile is from a tree, from the nearest of the tiles it stands on. From no tile it is no distance
-- at all (null: said out, since the greatest of some numbers passes over one that is not there, and no tile would
-- else be the tree's own): whatever asks it reads that as too far.
create or replace function town.tree_far(p_tree jsonb, p_x integer, p_y integer)
returns integer language sql immutable
as $$
  select case when p_x is null or p_y is null then null
    else greatest(greatest(t.x - p_x, 0, p_x - (t.x + t.n - 1)), greatest(t.y - p_y, 0, p_y - (t.y + t.n - 1))) end
    from (select (p_tree->>1)::integer as x, (p_tree->>2)::integer as y, coalesce((p_tree->>4)::integer, 1) as n) t
$$;

-- apart: how far two trees stand from each other.
create or replace function town.tree_apart(p_a jsonb, p_b jsonb)
returns integer language sql immutable
as $$ select greatest(abs((p_a->>1)::integer - (p_b->>1)::integer), abs((p_a->>2)::integer - (p_b->>2)::integer)) $$;

-- grownAt: when a tree felled at a moment is grown again: so many minutes on; the ancient tree, at the next dawn
-- (the first moment of the day after the one it fell on, as the stamina counts days).
create or replace function town.tree_until(p_elder boolean, p_at bigint)
returns bigint language sql stable
as $$
  select case when coalesce(p_elder, false)
    then (town.day_of(p_at)::bigint + 1) * 86400000 - 7 * 3600000::bigint + (town.cat('rules')->>'dawn')::bigint * 3600000
    else p_at + (town.cat('trees')->>'regrow')::bigint * 60000 end
$$;

-- isGrown: whether a tree stands grown, by what is kept of the grove.
create or replace function town.tree_grown(p_grove jsonb, p_tree jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select f.v is null or p_now >= town.tree_until(town.tree_elder(p_tree), (f.v->>'at')::numeric::bigint)
    from (select p_grove->'down'->(p_tree->>0) as v) f
$$;

-- ─── One go on a tree at a time ──────────────────────────────────────────

-- goHolds: whether a go is still its owner's: opened no longer ago than a go is held.
create or replace function town.go_holds(p_go jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select coalesce(jsonb_typeof(p_go) = 'object' and p_now - (p_go->>'at')::numeric <= (town.cat('trees')->'go'->>'secs')::numeric * 1000 and p_now >= (p_go->>'at')::numeric, false)
$$;

-- heldBy, as a yes or no: whether somebody else's go holds a tree now (anybody's but `p_me`'s own).
create or replace function town.tree_held(p_grove jsonb, p_tree integer, p_now bigint, p_me text default null)
returns boolean language sql stable
as $$
  select exists (select 1 from jsonb_each(case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end) g
                  where g.key is distinct from p_me and town.go_holds(g.value, p_now) and jsonb_typeof(g.value->'trees') = 'array' and g.value->'trees' @> to_jsonb(p_tree))
$$;

-- opened: a board is put up for a go: its trees are held for its owner from now (one go a member: an older one is
-- forgotten).
create or replace function town.fell_opened(p_grove jsonb, p_me text, p_trees jsonb, p_now bigint)
returns jsonb language sql immutable
as $$
  select p_grove || jsonb_build_object('goes', (case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end)
    || jsonb_build_object(p_me, jsonb_build_object('trees', p_trees, 'at', p_now)))
$$;

-- braceGo: a friend braces the trunk of somebody's open go, from the tile they stand on: near its first tree, not
-- the feller, and nobody braces it yet. It is written on the go, and paid when the go is over.
create or replace function town.brace_go(p_grove jsonb, p_me text, p_feller text, p_x integer, p_y integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb := goes_->p_feller;
  t jsonb;
begin
  if p_me is not distinct from p_feller or not town.go_holds(go_, p_now) then return town.no('none'); end if;
  t := case when jsonb_typeof(go_->'trees'->0) = 'number' and abs((go_->'trees'->>0)::numeric) < 2000000000 then town.tree_of((go_->'trees'->>0)::numeric::integer) end;
  if t is null then return town.no('none'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (town.cat('trees')->'brace'->>'reach')::integer, true) then return town.no('far'); end if;
  if jsonb_typeof(go_->'braced') = 'string' and go_->>'braced' <> '' then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'tree', (t->>0)::integer,
    'grove', p_grove || jsonb_build_object('goes', goes_ || jsonb_build_object(p_feller, go_ || jsonb_build_object('braced', p_me))));
end;
$$;

-- bracePay: what a friend who braced a trunk has for it, into their own bag (or their cord): so many logs, where
-- there is room, and nothing lost where there is none.
create or replace function town.brace_pay(p_purse jsonb)
returns jsonb language sql stable
as $$
  select case when h.home is null then jsonb_build_object('purse', p_purse, 'got', '[]'::jsonb) else jsonb_build_object('purse', h.home, 'got', h.things) end
    from (select b.things, town.stow_all(p_purse, b.things) as home
            from (select jsonb_build_array(jsonb_build_array('log', (town.cat('trees')->'brace'->>'logs')::integer)) as things) b) h
$$;

-- ─── Keepsakes, and what a purse keeps of the line ───────────────────────

-- KEEPSAKE_IDS: the keepsakes the catalog has, in the order the code weighs them in. (The catalog keeps them by
-- their names, and a document's names are kept in no order of their own; which keepsake a number of chance falls on
-- is by their order, so the order is said here. One the catalog gains later comes after these.)
create or replace function town.keepsake_ids()
returns jsonb language sql stable
as $$
  with said(ids) as (select '["nest", "feather", "twinCones", "cicada", "pellet", "initials", "heartKnot", "amber", "ribbon", "rustKey", "silverRing", "carvedBird"]'::jsonb)
  select coalesce(jsonb_agg(x.id order by x.ord, x.id), '[]'::jsonb)
    from said, lateral (
      select o.id, o.ord from jsonb_array_elements_text(said.ids) with ordinality o(id, ord) where town.cat('trees')->'keepsakes' ? o.id
      union all
      select n.id, 1000000 from jsonb_object_keys(town.cat('trees')->'keepsakes') n(id) where not said.ids ? n.id) x
$$;

-- keepsakesOf: the keepsakes a tree of a girth may let fall.
create or replace function town.keepsakes_of(p_girth integer)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(i.id order by i.ord), '[]'::jsonb)
    from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
   where p_girth = 3 or not coalesce((town.cat('trees')->'keepsakes'->i.id->>'stout')::boolean, false)
$$;

-- keepsakeFor: what a felled tree lets fall, if anything: from two numbers of chance (whether; and which, by the
-- weights of those its girth may have). Nothing, from the ancient tree and from the trees above the first tier.
create or replace function town.keepsake_for(p_tree jsonb, p_whether double precision, p_which double precision)
returns text language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  may jsonb;
  all_ double precision;
  left_ double precision;
  id_ text;
  last_ text;
begin
  if town.tree_elder(p_tree) or (p_tree->>3)::integer <> 1 or not coalesce(p_whether < 1::double precision / (k->'keepsake'->>'in')::double precision, false) then return null; end if;
  may := town.keepsakes_of(town.tree_girth(p_tree));
  select coalesce(sum((k->'keepsakes'->i.id->>'weight')::double precision), 0) into all_ from jsonb_array_elements_text(may) i(id);
  left_ := greatest(0::double precision, least(0.999999::double precision, p_which)) * all_;
  for id_ in select i.id from jsonb_array_elements_text(may) with ordinality i(id, ord) order by i.ord loop
    left_ := left_ - (k->'keepsakes'->id_->>'weight')::double precision;
    if left_ < 0 then return id_; end if;
    last_ := id_;
  end loop;
  return last_;
end;
$$;

-- fellingOf: what a woodcutter's purse keeps of the line, made sound: the part of a point of stamina left owing; how
-- many trees have fallen towards the next offcut; and the keepsakes found, how many of each.
create or replace function town.felling_of(p_purse jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'owed', case when jsonb_typeof(f.k->'owed') = 'number' and (f.k->>'owed')::double precision > 0 and (f.k->>'owed')::double precision < 1 then f.k->'owed' else '0'::jsonb end,
    'dust', case when jsonb_typeof(f.k->'dust') = 'number' and (f.k->>'dust')::numeric = floor((f.k->>'dust')::numeric) and (f.k->>'dust')::numeric > 0 then f.k->'dust' else '0'::jsonb end,
    'keeps', coalesce((select jsonb_object_agg(e.key, e.value)
        from jsonb_each(case when jsonb_typeof(f.k->'keeps') = 'object' then f.k->'keeps' else '{}'::jsonb end) e
       where town.cat('trees')->'keepsakes' ? e.key and jsonb_typeof(e.value) = 'number'
         and (e.value #>> '{}')::numeric = floor((e.value #>> '{}')::numeric) and (e.value #>> '{}')::numeric > 0), '{}'::jsonb))
    from (select case when jsonb_typeof(p_purse->'felling') = 'object' then p_purse->'felling' else '{}'::jsonb end as k) f
$$;

-- ─── What is kept, and what a page is told ───────────────────────────────

-- tidied: a grove with what has grown again forgotten, and the goes that are held no longer. (A grove with nothing
-- to forget is given back as it is.)
create or replace function town.grove_tidied(p_grove jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  still jsonb;
  held_ jsonb;
begin
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into still
    from jsonb_each(down_) e, lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
   where x.t is not null and p_now < town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint);
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into held_ from jsonb_each(goes_) e where town.go_holds(e.value, p_now);
  if (select count(*) from jsonb_object_keys(still)) = (select count(*) from jsonb_object_keys(down_))
     and (select count(*) from jsonb_object_keys(held_)) = (select count(*) from jsonb_object_keys(goes_)) then
    return p_grove;
  end if;
  return (p_grove - 'goes') || jsonb_build_object('down', still) || case when held_ <> '{}'::jsonb then jsonb_build_object('goes', held_) else '{}'::jsonb end;
end;
$$;

-- toldOf: the trees as a page is told them: every tree that is not grown, with when it fell and when it is grown
-- again; the trees half cut; and the book of the pines, where anything has been found. Of the ancient tree only
-- that it is down: when it is grown again is told to whoever holds an axe that knows it.
create or replace function town.trees_told(p_grove jsonb, p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'down', coalesce((select jsonb_agg(jsonb_build_object('id', (d.t->>0)::integer, 'at', d.f->'at')
          || case when town.tree_elder(d.t) and not c.knows then '{}'::jsonb else jsonb_build_object('until', d.until) end order by (d.t->>0)::integer)
        from (select x.t, e.value as f, town.tree_until(town.tree_elder(x.t), (e.value->>'at')::numeric::bigint) as until
                from jsonb_each(case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end) e,
                     lateral (select case when e.key ~ '^-?[0-9]{1,9}$' then town.tree_of(e.key::integer) end as t) x
               where x.t is not null) d
       where p_now < d.until), '[]'::jsonb),
    'half', coalesce((select jsonb_agg(h.v order by (h.v #>> '{}')::numeric)
        from jsonb_array_elements(case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) h(v)
       where not coalesce(p_grove->'down', '{}'::jsonb) ? (h.v #>> '{}')), '[]'::jsonb))
    || coalesce((select jsonb_build_object('book', jsonb_agg(jsonb_build_array(i.id, p_grove->'book'->i.id->'by') order by i.ord))
        from jsonb_array_elements_text(town.keepsake_ids()) with ordinality i(id, ord)
       where jsonb_typeof(p_grove->'book') = 'object' and p_grove->'book' ? i.id
      having count(*) > 0), '{}'::jsonb)
    from (select coalesce(town.tool_has(town.hand_stack(p_purse), 'axElder'), false) as knows) c
$$;

-- ─── The axe, as the game reads it (lib/town/tools, the axe's part; lib/town/trees) ───

-- axeOf: the axe in the hand, as the stack it is; null with anything else held, or nothing.
create or replace function town.axe_of(p_purse jsonb)
returns jsonb language sql stable
as $$ select case when town.tool_kind(s.v->>'item') = 'axe' then s.v end from (select town.hand_stack(p_purse) as v) s $$;

-- bites: why this axe does not fell that tree at all: its tier, or the ancient tree's own asking. Null when it does.
create or replace function town.axe_bites(p_axe jsonb, p_tree jsonb)
returns text language sql stable
as $$
  select case when (p_tree->>3)::integer > (c.k->>'axeTier')::integer then 'bite'
              when town.tree_elder(p_tree) and town.tool_level(p_axe) < (c.k->'elder'->>'plus')::integer then 'plus' end
    from (select town.cat('trees') as k) c
$$;

-- axeChops: the chops an axe takes to fell a tree that takes so many of a plain one.
create or replace function town.axe_chops(p_axe jsonb, p_base double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, ceil(ceil(
      ((c.a->'chops'->>town.tool_level(p_axe))::double precision * p_base) / (c.a->'chops'->>0)::double precision
      - case when town.tool_has(p_axe, 'axKeen') then town.opt_n('axKeen', 'chops') else 0 end)
    * (1::double precision - town.gem_by(p_axe, 'fire', c.a->'gems'->'fire'->'fewer'))))::integer
    from (select town.cat('trees')->'axe' as a) c
$$;

-- axeAhead: how many segments up an axe shows a branch.
create or replace function town.axe_ahead(p_axe jsonb)
returns double precision language sql stable
as $$
  select (town.cat('trees')->'axe'->'ahead'->>town.tool_level(p_axe))::double precision
    + case when town.tool_has(p_axe, 'axGrain') then town.opt_n('axGrain', 'ahead') else 0 end
$$;

-- axeBarPace: how fast the bar of time runs with an axe, as so many times its plain pace.
create or replace function town.axe_pace(p_axe jsonb)
returns double precision language sql stable
as $$
  select greatest(1::double precision / (c.a->>'cap')::double precision,
      (1::double precision - (c.a->'slow'->>town.tool_level(p_axe))::double precision)
      * (1::double precision - town.gem_by(p_axe, 'ice', c.a->'gems'->'ice'->'slow'))
      * (1::double precision + town.gem_by(p_axe, 'dark', c.a->'gems'->'dark'->'faster')))
    from (select town.cat('trees')->'axe' as a) c
$$;

-- chopsFor: the chops a tree takes with an axe, of a trunk of the tree's girth; and a share of that of a tree half cut.
create or replace function town.fell_chops(p_axe jsonb, p_tree jsonb, p_half boolean)
returns integer language sql stable
as $$
  select case when coalesce(p_half, false) then greatest(1::double precision, ceil(w.whole * (town.cat('trees')->'chain'->>'left')::double precision))::integer else w.whole end
    from (select town.axe_chops(p_axe, (town.tree_knobs(p_tree)->>'chops')::double precision) as whole) w
$$;

-- ─── A game, put together (lib/town/trees) ───────────────────────────────

-- groupOf: the trees one game fells, the first being the one walked up to: with the echo axe worn, as many more
-- grown trees as stand near the first, the nearest first (a tie: the lower number), never one somebody else's go
-- holds. The ancient tree by itself.
create or replace function town.fell_group(p_purse jsonb, p_grove jsonb, p_first jsonb, p_axe jsonb, p_now bigint, p_me text default null)
returns jsonb language sql stable
as $$
  select jsonb_build_array(p_first) || case when town.tree_elder(p_first) or not town.gift_works(p_purse, 'charmEchoAxe') then '[]'::jsonb else
    coalesce((select jsonb_agg(s.v order by s.far_, s.id) from (
      select w.v, town.tree_apart(w.v, p_first) as far_, (w.v->>0)::integer as id
        from jsonb_array_elements(c.k->'wood') w(v)
       where (w.v->>0)::integer <> (p_first->>0)::integer and not town.tree_elder(w.v) and town.tree_apart(w.v, p_first) <= (c.k->'echo'->>'reach')::integer
         and town.axe_bites(p_axe, w.v) is null and town.tree_grown(p_grove, w.v, p_now) and not town.tree_held(p_grove, (w.v->>0)::integer, p_now, p_me)
       order by 2, 3 limit greatest(0, (c.k->'echo'->>'trees')::integer - 1)) s), '[]'::jsonb) end
    from (select town.cat('trees') as k) c
$$;

-- mostOf: the most a go at these trees can bring home: what there has to be room for before the axe is swung.
create or replace function town.fell_most(p_axe jsonb, p_trees jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  twice double precision := case when town.tool_has(p_axe, 'axDouble') then town.opt_n('axDouble', 'by') else 1 end;
  elder double precision := case when town.tool_has(p_axe, 'axElder') then town.opt_n('axElder', 'by') else 1 end;
  more double precision := case when town.gem_by(p_axe, 'dark', k->'axe'->'gems'->'dark'->'log') > 0 then 1 else 0 end
    + case when town.tool_has(p_axe, 'axDust') then town.opt_n('axDust', 'more') else 0 end;
  scented boolean := town.tool_has(p_axe, 'axResin');
  logs double precision := 0;
  timber double precision := 0;
  resin double precision := 0;
  scent integer := 0;
  t jsonb;
  out_ jsonb;
begin
  for t in select e.v from jsonb_array_elements(p_trees) with ordinality e(v, ord) order by e.ord loop
    if town.tree_elder(t) then
      timber := timber + ceil((k->'elder'->>'timber')::double precision * elder);
      resin := resin + ceil((k->'elder'->>'resin')::double precision * elder);
      continue;
    end if;
    logs := logs + ((k->>'logs')::double precision + more) * twice;
    timber := timber + town.tree_most(t) * twice;
    if scented then scent := scent + 1; end if;
  end loop;
  out_ := jsonb_build_array(jsonb_build_array('log', logs), jsonb_build_array('timber', timber))
    || coalesce((select jsonb_agg(jsonb_build_array(s.id, scent + case when s.id = 'resin' then resin else 0 end) order by s.ord) from jsonb_array_elements_text(k->'scent') with ordinality s(id, ord)), '[]'::jsonb)
    || case when k->'scent' ? 'resin' then '[]'::jsonb else jsonb_build_array(jsonb_build_array('resin', resin)) end;
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(out_) with ordinality e(v, ord) where (e.v->>1)::double precision > 0), '[]'::jsonb);
end;
$$;

-- trunkOf: the trunk a game is played on, of the trees it fells: the hardest of them (the most chops with this axe;
-- of two alike, the stouter; of two alike again, the earlier). As {t, chops}.
create or replace function town.fell_trunk(p_axe jsonb, p_grove jsonb, p_trees jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object('t', s.v, 'chops', s.chops)
    from (select e.v, e.ord, town.fell_chops(p_axe, e.v, (case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end) @> to_jsonb((e.v->>0)::integer)) as chops
            from jsonb_array_elements(p_trees) with ordinality e(v, ord)) s
   order by s.chops desc, town.tree_girth(s.v) desc, s.ord limit 1
$$;

-- (the seed a trunk is made from, of the game's own and the tree's: whole numbers of thirty-two bits, as the code's)
create or replace function town.fell_seed(p_seed bigint, p_id integer)
returns integer language sql immutable
as $$ select (((((p_seed % 4294967296) * 31 + (p_id + 1)::bigint * 7919) % 4294967296) + 4294967296 + 2147483648) % 4294967296 - 2147483648)::integer $$;

-- begin: walk up to a tree with an axe in the hand: whether it can be felled now, and the game that fells it.
-- Refused: no such tree; no axe in the hand; too far; an axe that will not bite; the ancient tree to an axe that is
-- not at the top; a tree somebody else's go holds; a tree that is not grown; no room for what it may give.
-- `p_seed`: a number of chance, from which the trunk is made. `p_me`: whose go this would be.
create or replace function town.fell_begin(p_purse jsonb, p_grove jsonb, p_tree integer, p_x integer, p_y integer, p_now bigint, p_seed bigint, p_me text default null)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
  trunk jsonb;
  knobs jsonb;
  spent_ boolean;
begin
  if t is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, t);
  if refused is not null then return town.no(refused); end if;
  if town.tree_held(p_grove, p_tree, p_now, p_me) then return town.no('held'); end if;
  if not town.tree_grown(p_grove, t, p_now) then return town.no('stump'); end if;
  grp := town.fell_group(p_purse, p_grove, t, axe, p_now, p_me);
  if town.stow_all(p_purse, town.fell_most(axe, grp)) is null then return town.no('full'); end if;
  trunk := town.fell_trunk(axe, p_grove, grp);
  knobs := town.tree_knobs(trunk->'t');
  spent_ := town.stamina_of(p_purse, p_now) <= 0;
  return jsonb_build_object('ok', true,
    'trees', (select jsonb_agg((g.v->>0)::integer order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
    'elder', town.tree_elder(t),
    'ask', jsonb_build_object(
      'trees', (select jsonb_agg(jsonb_build_object('id', (g.v->>0)::integer, 'girth', town.tree_girth(g.v), 'timber', town.tree_bears(g.v)) order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
      'chops', (trunk->>'chops')::integer, 'seed', town.fell_seed(p_seed, p_tree), 'girth', town.tree_girth(trunk->'t'), 'family', knobs->'family',
      'ahead', town.axe_ahead(axe),
      'pace', town.axe_pace(axe) * case when spent_ then (knobs->>'spent')::double precision else (knobs->>'pace')::double precision end,
      'spared', town.gem_by(axe, 'water', k->'axe'->'gems'->'water'->'spared') + case when town.gift_works(p_purse, 'famWoodpecker') then (k->>'pecks')::double precision else 0 end,
      'spent', spent_));
end;
$$;

-- ─── A go, brought home (lib/town/felling, lib/town/trees) ───────────────

-- timberOf: the fine timber a trunk gives for so many misses: as many of its timbers as bear them.
create or replace function town.timber_of(p_bears jsonb, p_misses numeric)
returns integer language sql immutable
as $$ select count(*)::integer from jsonb_array_elements_text(p_bears) b(v) where p_misses <= b.v::numeric $$;

-- fell: a go at felling, judged. The tree named has to be reached with an axe that bites, and not be held by
-- somebody else's go. Every tree of the go comes down, however it went, and gives its logs; the fine timber is the
-- board's: a trunk cut through gives each tree its own by the misses, and a go that says it was played faster than a
-- hand can chop is no go. The plain way and the axe's one chop fell the one tree walked up to. The trees of a go are
-- those its board was opened for while it holds, or worked out afresh; either way only those still standing. Only
-- the ancient tree stands when its go is lost: then nothing changes but that the go is over.
-- `p_went`: {tree, through, misses, secs, plain, one, twice}, the flags true or not there. `p_luck`: a set of
-- numbers of chance for each tree that falls, in their order ({dark, scent, which, chain, keep, kind}, each 0 to 1).
-- `p_who`: the name the book of the pines writes beside what was never found before.
create or replace function town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text default null)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
begin
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  if town.tree_elder(first_) and not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by') else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every') then logs := logs + town.opt_n('axDust', 'more'); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by'); timber := timber * town.opt_n('axDouble', 'by');
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in') then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_by(axe, 'earth', k->'axe'->'gems'->'earth'->'stamina'), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$$;

-- rootBack: a stump just made by me grows back at once, for everybody. Never the ancient tree's. Counted by the
-- day, by the axe in the hand.
create or replace function town.fell_root(p_purse jsonb, p_grove jsonb, p_me text, p_tree integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  f jsonb := p_grove->'down'->(p_tree::text);
  axe jsonb := town.axe_of(p_purse);
  used jsonb;
begin
  if t is null or town.tree_elder(t) then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if f is null or f->>'by' is distinct from p_me or p_now - (f->>'at')::numeric::bigint > (k->'root'->>'within')::bigint * 1000
     or p_now >= town.tree_until(false, (f->>'at')::numeric::bigint) then return town.no('none'); end if;
  used := town.use_power(p_purse, axe, 'axRoot', p_now);
  if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', (used->>'left')::integer,
    'grove', p_grove || jsonb_build_object('down', (p_grove->'down') - (p_tree::text)));
end;
$$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (each function below is the database's own text as it stood after v168 and the part above, with the lines of
-- v164.felling.lines.mjs in place: built by assemble-v164.mjs, never typed. If a file that writes one of them has
-- run since v168, its change is undone here: this file's head says how to look first.)

-- <town.work_counts_of>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;
-- </town.work_counts_of>

-- <town.deed_th>
create or replace function town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    -- ── the lamp relay at dusk (v163) ──
    when 'flame_take' then 'รับไฟจากกองไฟ' when 'flame_pass' then 'ส่งไฟต่อให้คนถัดไป' when 'lamp_light' then 'จุดโคม' when 'lamp_hand' then 'ไฟที่ช่วยกันส่งต่อมาจุดโคม'
    -- ── the lamp relay at dusk (v163): its end ──
    -- ── the mountain's trees (v164) ──
    when 'fell' then 'ตัดต้นไม้' when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'
    -- ── the mountain's trees (v164): its end ──
    else p_what end
$$;
-- </town.deed_th>

-- ─── What a member calls ─────────────────────────────────────────────────

-- The trees as I am told them, with my purse. (A page asks this once the far side is open to it, while it is near
-- the trees, and when the room says a tree fell: a friend who braced a trunk reads the log they had for it here.)
create or replace function public.town_trees()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, false);
begin
  return jsonb_build_object('now', now_, 'purse', purse,
    'trees', town.trees_told(town.grove_tidied(coalesce(town.thing('grove', false), '{"down": {}, "half": []}'::jsonb), now_), purse, now_));
end;
$$;

-- Walk up to a tree with an axe in the hand, from the tile I stand on: the game that fells it, or the state that
-- refuses it. The trunk's seed is drawn here. Its trees are held for me from now, for as long as a go is held.
create or replace function public.town_fell_begin(p_tree integer, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  -- (the grove is held: of two who walk up to one tree at one moment, the second finds it held)
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, false);
  did := town.fell_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text);
  if (did->>'ok')::boolean then
    grove := town.fell_opened(grove, me::text, did->'trees', now_);
    perform town.keep_thing('grove', grove);
  end if;
  -- (the trees it is for are told as `group`: `trees` is what every answer tells of the grove)
  return town.answer(me, (did - 'trees') || case when (did->>'ok')::boolean then jsonb_build_object('group', did->'trees') else '{}'::jsonb end
    || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$$;

-- A go at felling as it was played, or the plain way, from the tile I stand on. The grove is held first, so that two
-- who fell the same tree at the same moment are judged one after the other and the second finds a stump; then my
-- purse and, where a friend braces the trunk of my go, theirs, in the order of the two ids. Every tree that falls is
-- written down, each a deed of its own.
create or replace function public.town_fell(p_went jsonb, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  k jsonb := town.cat('trees');
  said jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  -- (no trunk has more segments than the stoutest takes with a plain axe, so no go has more misses)
  most integer := greatest((k->>'elderChops')::integer, (select max((g.v->>'chops')::integer) from jsonb_array_elements(k->'girths') g(v)));
  went jsonb;
  grove jsonb;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  bracer uuid;
  luck jsonb := '[]'::jsonb;
  r1 double precision;
  r2 double precision;
  r3 double precision;
  r4 double precision;
  r5 double precision;
  r6 double precision;
  i integer;
  spent_ boolean;
  did jsonb;
  f jsonb;
  paid jsonb;
begin
  if jsonb_typeof(said->'tree') is distinct from 'number' or p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if (said->>'tree')::numeric <> floor((said->>'tree')::numeric) or abs((said->>'tree')::numeric) > 100000 then return town.answer(me, town.no('none')); end if;
  -- what the browser says of its go is kept as this and no more: the tree, three yeses, the misses and the seconds
  went := jsonb_build_object('tree', (said->>'tree')::numeric::integer,
      'through', coalesce(said->'through' = 'true'::jsonb, false), 'plain', coalesce(said->'plain' = 'true'::jsonb, false),
      'one', coalesce(said->'one' = 'true'::jsonb, false), 'twice', coalesce(said->'twice' = 'true'::jsonb, false),
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest(floor((said->>'misses')::numeric), 0), most) else 0 end)
    || case when jsonb_typeof(said->'secs') = 'number' then jsonb_build_object('secs', least(greatest((said->>'secs')::double precision, 0), 3600)) else '{}'::jsonb end;
  -- the village's row first
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  -- whoever braces the trunk of my go has a purse to be paid into: it is held with mine, the lesser id first
  go_ := grove->'goes'->(me::text);
  if jsonb_typeof(go_->'braced') = 'string' then
    if go_->>'braced' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      if go_->>'braced' <> me::text then
        if town.is_member((go_->>'braced')::uuid) then bracer := (go_->>'braced')::uuid; end if;
      end if;
    end if;
  end if;
  if bracer is not null and bracer < me then theirs := town.purse_of(bracer, true); end if;
  purse := town.purse_of(me, true);
  if bracer is not null and bracer > me then theirs := town.purse_of(bracer, true); end if;
  spent_ := town.stamina_of(purse, now_) <= 0;
  -- a set of numbers of chance for each tree a go may fell, drawn here and never sent: in the order the code draws them
  for i in 1..(k->'echo'->>'trees')::integer loop
    r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random(); r6 := random();
    luck := luck || jsonb_build_array(jsonb_build_object('dark', r1, 'scent', r2, 'which', r3, 'chain', r4, 'keep', r5, 'kind', r6));
  end loop;
  did := town.fell(purse, grove, me::text, went, p_x, p_y, now_, luck,
    (select coalesce(nullif(coalesce(p.character_name, p.display_name, p.discord_username, ''), ''), me::text) from public.profiles p where p.id = me));
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
  end if;
  perform town.keep_purse(me, did->'purse');
  perform town.keep_thing('grove', did->'grove');
  -- the friend at the trunk: a log into their own purse, where there is room for one
  if did->>'braced' is not null and theirs is not null and (did->>'braced') = bracer::text then
    paid := town.brace_pay(theirs);
    perform town.keep_purse(bracer, paid->'purse');
    perform town.note(bracer, 'brace', did->'felled'->0->>'kind', coalesce((paid->'got'->0->>1)::numeric, 0), 0,
      jsonb_build_object('tree', did->'felled'->0->'id', 'feller', me));
  end if;
  for f, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(did->'felled') with ordinality e(v, ord) order by e.ord loop
    perform town.note(me, 'fell', f->>'kind', 1, 0,
      jsonb_build_object('tree', f->'id', 'misses', f->'misses', 'girth', f->'girth', 'timber', f->'timber')
      || case when (did->>'plain')::boolean then '{"how": "plain"}'::jsonb when (did->>'one')::boolean then '{"how": "one"}'::jsonb else '{}'::jsonb end
      || case when f ? 'keepsake' then jsonb_build_object('keepsake', f->'keepsake') else '{}'::jsonb end
      || case when i = 0 and did->>'braced' is not null then jsonb_build_object('braced', did->>'braced') else '{}'::jsonb end
      -- (and what only this record can say of it: the tile stood on, what the tree gave, how long the hand says it
      -- played, whether it was played with no stamina, and what the axe's own did)
      || jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'got', f->'got', 'secs', coalesce(went->'secs', '0'::jsonb), 'spent', spent_)
      || case when (f->>'twice')::boolean then '{"twice": true}'::jsonb else '{}'::jsonb end
      || case when (f->>'free')::boolean then '{"free": true}'::jsonb else '{}'::jsonb end
      || case when f->'chained' <> 'null'::jsonb then jsonb_build_object('chained', f->'chained') else '{}'::jsonb end);
  end loop;
  -- (the keepsakes found are told as `keeps`: `found`, in an answer of the game's, is the list of what the village has
  -- found, which a page keeps whole from whatever answer brings it)
  return town.answer(me, (did - 'grove' - 'found') || jsonb_build_object('keeps', did->'found', 'trees', town.trees_told(did->'grove', did->'purse', now_)));
end;
$$;

-- Brace the trunk of somebody's open go, from the tile I stand on. Nothing of mine changes until their go is over.
create or replace function public.town_fell_brace(p_feller uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  did jsonb;
begin
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  did := town.brace_go(grove, me::text, p_feller::text, p_x, p_y, now_);
  if (did->>'ok')::boolean then
    grove := did->'grove';
    perform town.keep_thing('grove', grove);
  end if;
  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, town.purse_of(me, false), now_)));
end;
$$;

-- The stump I just made, grown again at once for everybody (an axe's own, counted by the day).
create or replace function public.town_fell_root(p_tree integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  grove jsonb;
  purse jsonb;
  did jsonb;
begin
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  purse := town.purse_of(me, true);
  did := town.fell_root(purse, grove, me::text, p_tree, now_);
  if (did->>'ok')::boolean then
    grove := did->'grove';
    purse := did->'purse';
    perform town.keep_purse(me, purse);
    perform town.keep_thing('grove', grove);
    perform town.note(me, 'root', town.tree_kind(town.tree_of(p_tree)), 1, 0, jsonb_build_object('tree', p_tree, 'left', (did->>'left')::integer));
  end if;
  return town.answer(me, (did - 'grove') || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_trees() from public, anon;
grant execute on function public.town_trees() to authenticated;
revoke execute on function public.town_fell_begin(integer, integer, integer) from public, anon;
grant execute on function public.town_fell_begin(integer, integer, integer) to authenticated;
revoke execute on function public.town_fell(jsonb, integer, integer) from public, anon;
grant execute on function public.town_fell(jsonb, integer, integer) to authenticated;
revoke execute on function public.town_fell_brace(uuid, integer, integer) from public, anon;
grant execute on function public.town_fell_brace(uuid, integer, integer) to authenticated;
revoke execute on function public.town_fell_root(integer) from public, anon;
grant execute on function public.town_fell_root(integer) to authenticated;

-- ═══ Part 3 of 3: the miners' part: the mountain's rocks and the cave ══════════════════════════════════════════════

-- v164, the miners' part: the mountain's rocks and the cave under it (lib/town/mining, lib/town/cave-state,
-- lib/town/vein). Tried by try-v164.mjs on the stand-in's snapshot, after the base. Safe to run twice.
-- stands on: base
--
-- THE BLACKSMITH AND THE GREAT FIRE ARE NOT HERE (the base's head says why): a rock broken finds no flint for the
-- village's fire, and `town_mine`'s answer has no `fire`.
--
-- What is kept is the base's: a place's document in `town_cave` (0 the mountain's foot, 1 to 30 the cave's floors),
-- a day's floors in `town_cave_days`, the rocks' word in `town_secrets`. A member's own is in their purse (`mine`:
-- lib/town/mining's MineKept). This part makes no table.
--
-- A PLACE'S DOCUMENT, as every rule here reads and writes it (`town.cave_at` makes whatever is kept into this, as it
-- is at a moment: lib/town/cave-state's `caveAt`, for the one place):
--     day      the day it is of (the stamina's day: it turns at dawn in Bangkok)
--     way      the way down open from this floor: {rock (null: broken through), x, y, by, name, at}; or null
--     crystal  who broke the day's crystal rock, on the floor it stood on: {by, name, at}; or null
--     broken   {turn, ids}: the rocks broken in the turn that is
--     struck   {turn, rocks}: the rocks being broken, each by its number: {first, name, at, by: {member: share}}
--     torches  [{f, x, y, until, by}], moss [{f, x, y, until, by}]
-- A document of another day has no way, no crystal and no moss; one of another turn has no rock broken or struck. So
-- nothing is ever cleared by the clock: what is kept is read as it is NOW, and written over at the next deed.
--
-- NO DICE. What a rock holds, whether a neighbour breaks with it, where the day's crystal rock stands, a floor's
-- element and the rock that hides the way down are all rolled from the rocks' word, the place and the turn or the
-- day (`town.roll`, v125's): the same answer whenever it is asked, and lib/town/mining's to the last digit. No
-- function of this part draws a number of its own.
--
-- WHAT A BROWSER IS BELIEVED ABOUT, and how far:
--   · THE TILE STOOD ON (`town.mine_stood`). In the cave it has to be floor that one may stand on, by the day's own
--     layout (`open`: a '1'), or the place of a rock that stands no longer (the way down is walked onto where its
--     rock stood); on the mountain's foot, where the database knows only where the rocks stand, any tile that is no
--     floor of the cave's and no standing rock's. A tile that is not is no tile at all to the rules, and the rock is
--     out of reach (`far`). The rules then hold it to a king's move of the rock, as the code does. WHERE A MEMBER
--     IS, the database does not know and the code does not ask: a tile said is believed if it could be stood on.
--   · THE SWINGS SINCE IT LAST SAID. No more are counted than what is left of the rock takes of this pick, and none
--     quicker than a hand swings: so many swings want so many times `swing.least` milliseconds since the member's
--     last strike was believed (`mine.last` in their purse), or the answer is `soon` (lib/town/mining's own bound).
--   · A VEIN'S GO. The database does not lay a vein's face out (the face comes of a seed by a generator that the
--     page runs; it is not ported). `town_vein` is told the go by the page: its strikes, how many of them counted,
--     how many cells of the face glint, how many glinting cells of ore the crack passed and what each gem's cell it
--     passed gives. It is believed within what the rules allow of ANY face (`town.vein_odd`): the strikes a go has
--     with this pick, the cells a crack can run through in them, the most a face can hold of each thing. An account
--     outside that pays nothing, closes the vein and is written down apart (`vein_odd`), as a fish landed sooner than
--     any fight is let slip and written down as suspect. Whether there is a vein, of which gem, with how many
--     strikes: those are the purse's, written by `town_mine`, never the page's. The whole account is kept in the
--     deed's doc, with the seed of the face and what the go was played with: a go can be played again on its face
--     afterwards (lib/town/vein-account's `accountOf`) and held to what was said.
--     WHAT BELIEVING IT COSTS: a page may say it passed every cell of the fullest face there could be, whatever the
--     face was: six cells, twelve fragments of the floor's ore a vein (a rested hand with a plain pick has four
--     cells or so of the five a face has, taking one face with another); of a gem's vein, both of the two gem's
--     cells a face can have at their three fragments. It cannot say there is a vein where there is none, a gem
--     where there is none, a strike more than the go has, or anything of what its pick carries.
--   · A RESTING FLOOR REACHED (`town_cave_reach`): the floor is the page's word; it counts only while the way down
--     to it is open today. THE LIFT (`town_lift`): where it is taken from is not asked, as the code does not.
--   · A TORCH (`town_torch`) wants floor with nothing on it under it, as the code does. A FLOOR BROKEN THROUGH
--     (`town_drill`): the code asks only which floor the tile said is of; here it has to be a tile that could be
--     stood on as well, with a free tile beside it.
--
-- WHAT AN ANSWER BRINGS BESIDES. Every answer of `town_mine`, and a torch set down or a floor broken through, tells
-- the cave as it is then for the floor and the tile said (`cave`: what `town_cave` tells), so that a page has what
-- its own deed changed with no look in between. What is told no floor (`town_vein`, `town_cave_reach`) tells only
-- the member's own of it (`caveMine`: the lift's stops, the vein open, the rocks loosened, the rock somebody else
-- broke for them), which a page lays over what it was last told.
--
-- THE ORDER ROWS ARE HELD IN (the base's): the place of `town_cave` first; then purses by their ids, the lesser
-- first (a rock somebody else struck first pays THAT member: theirs and the striker's are both held, in that order,
-- before either is read); then nothing else. `town_cave`, `town_mine_peek` and `town_lift` hold nothing.
--
-- THE WORD `unlaid`: every function here but `town_vein` and `town_cave_reach` (which read no floor) answers
-- `town.no('unlaid')` with this clock while today's floors are not all laid, before it holds or changes anything.
--
-- Two functions that were there have a marked block more each (`town.work_counts_of`, `town.deed_th`): the lines
-- are in v164.mining.lines.mjs, and build-v164.mjs builds each from the function's own text. NOTHING OF THEM IS
-- PASTED HERE. The woodcutters' part adds a block of its own to the same two: each block is hung before a line
-- that stays where it is, so the two go in either order.

do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.cave_kept(integer, boolean)') is null
     or to_regprocedure('town.stow_all(jsonb, jsonb)') is null or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null then
    raise exception 'the base of v164 has not run yet: the miners'' part stands on its gate, its tables, its readers of a tool and its pouches';
  end if;
  if to_regprocedure('town.roll(text, bigint[])') is null or to_regprocedure('town.eased(jsonb, jsonb, bigint, double precision, double precision)') is null then
    raise exception 'v125 and v153 have not both run yet: a rock''s roll and a share of stamina kept exact are theirs';
  end if;
end $$;

-- ─── 1. When, and what a place is (lib/town/mining, lib/town/cave) ───────

-- turnOf: the turn a moment is in. Rocks that stand no longer are back at the next.
create or replace function town.mine_turn(p_now bigint)
returns bigint language sql stable
as $$ select p_now / (town.cat('mining')->>'turn')::bigint $$;

-- isRest: every so many floors is a resting floor (no rocks, a fire, a lift).
create or replace function town.cave_is_rest(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor > 0 and p_floor % (town.cat('mining')->>'rest')::integer = 0, false) $$;

-- depthOf: which of the cave's depths a floor is in: 0, 1, 2.
create or replace function town.cave_depth(p_floor integer)
returns integer language sql stable
as $$ select count(*)::integer from jsonb_array_elements_text(town.cat('mining')->'depths') d(v) where p_floor > d.v::integer $$;

-- isDug: whether a floor has rocks to break and a way down to find under one. hasBelow: whether there is a floor under it.
create or replace function town.mine_is_dug(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor >= 1 and p_floor <= (town.cat('mining')->>'floors')::integer and not town.cave_is_rest(p_floor), false) $$;

create or replace function town.mine_has_below(p_floor integer)
returns boolean language sql stable
as $$ select coalesce(p_floor >= 1 and p_floor < (town.cat('mining')->>'floors')::integer, false) $$;

-- hardnessOf: how hard a place's rocks are, for somebody with so many points on the miners' line. (From a floor on,
-- a line's good rocks are harder for the skilled: v153's `town.harder_at`.)
create or replace function town.mine_hardness(p_floor integer, p_points double precision)
returns double precision language sql stable
as $$
  select case when p_floor <= 0 then (m.k->'hardness'->>'foot')::double precision
    else (m.k->'hardness'->'depth'->>town.cave_depth(p_floor))::double precision
       * case when p_floor >= (m.k->>'harderFrom')::integer then town.harder_at(town.work_rank('mining', coalesce(p_points, 0))) else 1::double precision end end
    from (select town.cat('mining') as k) m
$$;

-- oreOf: the ore a place's rocks leave fragments of.
create or replace function town.mine_ore(p_floor integer)
returns text language sql stable
as $$ select town.cat('mining')->'ores'->(case when p_floor <= 0 then 0 else town.cave_depth(p_floor) end)->>'shard' $$;

-- elementOf: a floor's element of the day: light and dark so many times as likely as each of the others.
create or replace function town.mine_element(p_word text, p_floor integer, p_day integer)
returns text language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  rare double precision := (m->>'rare')::double precision;
  all_ jsonb := m->'pick'->'elements';
  left_ double precision;
  e text;
begin
  select sum(case when x.id in ('light', 'dark') then rare else 1::double precision end order by x.ord) into left_ from jsonb_array_elements_text(all_) with ordinality x(id, ord);
  left_ := town.roll(p_word || ':element', p_floor, p_day) * left_;
  for e in select x.id from jsonb_array_elements_text(all_) with ordinality x(id, ord) order by x.ord loop
    left_ := left_ - case when e in ('light', 'dark') then rare else 1::double precision end;
    if left_ < 0 then return e; end if;
  end loop;
  return all_->>0;
end;
$$;

-- A rock of some rocks ([[id, x, y, look], …]) by its number: null when there is none.
create or replace function town.mine_rock(p_rocks jsonb, p_rock integer)
returns jsonb language sql immutable
as $$ select r.v from jsonb_array_elements(case when jsonb_typeof(p_rocks) = 'array' then p_rocks else '[]'::jsonb end) with ordinality r(v, ord) where (r.v->>0)::integer = p_rock order by r.ord limit 1 $$;

-- near: whether a tile is within a king's move of so many tiles of another. (A tile that is none is near nothing.)
create or replace function town.mine_near(p_x numeric, p_y numeric, p_to_x integer, p_to_y integer, p_by double precision)
returns boolean language sql immutable
as $$ select coalesce(greatest(abs(floor(p_x) - p_to_x), abs(floor(p_y) - p_to_y)) <= p_by, false) $$;

-- ─── 2. The rolls: where the crystal rock stands, the way down, what a rock holds ─────────────────────────────────

-- crystalOf: where the day's crystal rock stands: {floor, rock}. `p_floors` has the rocks of each floor it may stand
-- on, as they are laid that day ({"28": [[id, x, y, look], …], …}); null when none of them has a rock.
create or replace function town.mine_crystal_of(p_word text, p_day integer, p_floors jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  may integer[] := '{}';
  f integer;
  on_ integer;
  all_ jsonb;
  of_ jsonb;
begin
  for f in (m->'crystal'->'floors'->>0)::integer..(m->'crystal'->'floors'->>1)::integer loop
    if town.mine_is_dug(f) and jsonb_typeof(p_floors->(f::text)) = 'array' and jsonb_array_length(p_floors->(f::text)) > 0 then may := may || f; end if;
  end loop;
  if cardinality(may) = 0 then return null; end if;
  on_ := may[1 + floor(town.roll(p_word || ':crystal', p_day) * cardinality(may))::integer];
  all_ := p_floors->(on_::text);
  -- (a rock with crystals in it, if the floor has one: look 3)
  of_ := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(all_) with ordinality r(v, ord) where (r.v->>3)::integer = 3), all_);
  return jsonb_build_object('floor', on_, 'rock', (of_->(floor(town.roll(p_word || ':crystal:rock', p_day) * jsonb_array_length(of_))::integer)->>0)::integer);
end;
$$;

-- …read off the day as it is laid: null on a day that is not.
create or replace function town.mine_crystal(p_day integer)
returns jsonb language sql stable set search_path = public
as $$
  select town.mine_crystal_of(town.mine_word(), p_day, coalesce(
    (select jsonb_object_agg(f.n::text, town.cave_laid(p_day, f.n)->'rocks')
       from (select town.cat('mining')->'crystal'->'floors' as v) c, generate_series((c.v->>0)::integer, (c.v->>1)::integer) f(n)
      where town.cave_laid(p_day, f.n) is not null), '{}'::jsonb))
$$;

-- wayRockOf: the rock of a floor that hides the way down that day (never the crystal rock): null on a floor with
-- none to find.
create or replace function town.mine_way_rock(p_word text, p_floor integer, p_day integer, p_rocks jsonb, p_crystal integer)
returns integer language plpgsql stable
as $$
declare
  of_ jsonb;
begin
  if not town.mine_is_dug(p_floor) or not town.mine_has_below(p_floor) then return null; end if;
  of_ := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(p_rocks) with ordinality r(v, ord) where p_crystal is null or (r.v->>0)::integer <> p_crystal), '[]'::jsonb);
  if jsonb_array_length(of_) = 0 then return null; end if;
  return (of_->(floor(town.roll(p_word || ':way', p_floor, p_day) * jsonb_array_length(of_))::integer)->>0)::integer;
end;
$$;

-- holdsOf, for a pick whose share of veins is worked out already (`p_veins`: 1 with nothing that makes them
-- likelier). What a rock holds in a turn: {kind: stone, shards, moss?} | {kind: vein, gem, seed} | {kind: way,
-- shards} | {kind: crystal}. `p_today`: {way, crystal}, the rock that hides the way down (null once it is open) and
-- the crystal rock (null where it is not, or once it is broken). On the mountain's foot there is neither, nor a vein.
create or replace function town.mine_holds_by(p_word text, p_floor integer, p_rock integer, p_turn bigint, p_today jsonb, p_veins double precision)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  odds jsonb := case when p_floor > 0 then m->'cave' else m->'foot' end;
  shards integer := 0;
begin
  if p_floor > 0 and jsonb_typeof(p_today->'crystal') = 'number' and (p_today->>'crystal')::numeric = p_rock then return jsonb_build_object('kind', 'crystal'); end if;
  if town.roll(p_word || ':ore', p_floor, p_rock, p_turn) < (odds->>'shard')::double precision then
    shards := (odds->'n'->>0)::integer + floor(town.roll(p_word || ':n', p_floor, p_rock, p_turn) * ((odds->'n'->>1)::integer - (odds->'n'->>0)::integer + 1))::integer;
  end if;
  if p_floor > 0 and jsonb_typeof(p_today->'way') = 'number' and (p_today->>'way')::numeric = p_rock then return jsonb_build_object('kind', 'way', 'shards', shards); end if;
  if p_floor > 0 and town.roll(p_word || ':vein', p_floor, p_rock, p_turn) < (m->'cave'->>'vein')::double precision * p_veins then
    return jsonb_build_object('kind', 'vein', 'gem', town.roll(p_word || ':gem', p_floor, p_rock, p_turn) < (m->'cave'->>'gem')::double precision,
      'seed', floor(town.roll(p_word || ':face', p_floor, p_rock, p_turn) * 4294967296::double precision)::bigint);
  end if;
  if p_floor > 0 and town.roll(p_word || ':moss', p_floor, p_rock, p_turn) < (m->'moss'->>'chance')::double precision then
    return jsonb_build_object('kind', 'stone', 'shards', shards, 'moss', true);
  end if;
  return jsonb_build_object('kind', 'stone', 'shards', shards);
end;
$$;

-- A pick's share of the chance of a vein (the catalog's `pick.gems.dark.veins`), or 1.
create or replace function town.mine_veins(p_pick jsonb)
returns double precision language sql stable
as $$ select town.gem_by(p_pick, 'dark', town.cat('mining')->'pick'->'gems'->'dark'->'veins', 1) $$;

-- holdsOf: what a rock holds in a turn, for whoever strikes it with some pick.
create or replace function town.mine_holds(p_word text, p_floor integer, p_rock integer, p_turn bigint, p_today jsonb, p_pick jsonb)
returns jsonb language sql stable
as $$ select town.mine_holds_by(p_word, p_floor, p_rock, p_turn, p_today, town.mine_veins(p_pick)) $$;

-- peekOf: what a peek says of a rock: stone, fragments, or a vein. (The way down and the crystal are no peek's to
-- tell: each says what it would hold besides.)
create or replace function town.mine_peek(p_holds jsonb)
returns text language sql immutable
as $$
  select case when p_holds->>'kind' = 'vein' then 'vein'
    when p_holds->>'kind' <> 'crystal' and coalesce((p_holds->>'shards')::numeric, 0) > 0 then 'shards' else 'stone' end
$$;

-- ─── 3. A member's own (lib/town/mining's MineKept, in their purse) ──────

-- Whether something kept is a whole number, as the code asks it (Number.isInteger).
create or replace function town.mine_int(p_v jsonb)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_v) = 'number' and (p_v #>> '{}')::numeric = floor((p_v #>> '{}')::numeric), false) $$;

-- Whether something kept counts as a yes, as the code reads it (!!v): nothing, false, 0 and an empty word do not.
create or replace function town.mine_yes(p_v jsonb)
returns boolean language sql immutable
as $$
  select case jsonb_typeof(p_v) when 'boolean' then (p_v #>> '{}')::boolean when 'number' then (p_v #>> '{}')::numeric <> 0
    when 'string' then p_v #>> '{}' <> '' when 'array' then true when 'object' then true else false end
$$;

-- A number of something kept, as the code reads one (Number(v) || 0): a number, a yes for one, a word that is a
-- number; nothing, of anything else.
create or replace function town.mine_num(p_v jsonb)
returns double precision language sql immutable
as $$
  select case jsonb_typeof(p_v) when 'number' then (p_v #>> '{}')::double precision when 'boolean' then case when (p_v #>> '{}')::boolean then 1 else 0 end
    when 'string' then case when btrim(p_v #>> '{}') ~ '^[+-]?([0-9]+\.?[0-9]*|\.[0-9]+)([eE][+-]?[0-9]+)?$' then btrim(p_v #>> '{}')::double precision else 0 end
    else 0 end
$$;

-- veinOf: a vein opened and not played out, as it is kept, made sound: null for what is none.
create or replace function town.mine_vein_of(p_v jsonb)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(p_v) = 'object' and town.mine_int(p_v->'f') and town.mine_int(p_v->'rock') and town.mine_int(p_v->'turn')
      and jsonb_typeof(p_v->'seed') = 'number' and town.mine_int(p_v->'mods'->'strikes') then
    jsonb_build_object('f', p_v->'f', 'rock', p_v->'rock', 'turn', p_v->'turn', 'seed', p_v->'seed',
      'gem', case when jsonb_typeof(p_v->'gem') = 'string' and town.cat('mining')->'pick'->'elements' ? (p_v->>'gem') then p_v->'gem' else 'null'::jsonb end,
      'mods', jsonb_build_object('strikes', greatest(1, (p_v->'mods'->>'strikes')::numeric), 'back', greatest(0::double precision, floor(town.mine_num(p_v->'mods'->'back'))),
        'cross', greatest(0::double precision, floor(town.mine_num(p_v->'mods'->'cross'))), 'spent', town.mine_yes(p_v->'mods'->'spent')),
      'more', greatest(0::double precision, floor(town.mine_num(p_v->'more'))))
    || case when town.mine_yes(p_v->'again') then jsonb_build_object('again', true) else '{}'::jsonb end
  end
$$;

-- paidOf: the last rock of mine that somebody else broke for me, as it is kept, made sound: null for what is none.
create or replace function town.mine_paid_of(p_v jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'at') = 'number' and town.mine_int(p_v->'f') and town.mine_int(p_v->'rock') and jsonb_typeof(p_v->'got') = 'array' then
    jsonb_build_object('at', p_v->'at', 'f', p_v->'f', 'rock', p_v->'rock',
      'got', coalesce((select jsonb_agg(jsonb_build_array(g.v->0, g.v->1) order by g.ord) from jsonb_array_elements(p_v->'got') with ordinality g(v, ord)
                        where jsonb_typeof(g.v) = 'array' and jsonb_typeof(g.v->0) = 'string' and jsonb_typeof(g.v->1) = 'number'), '[]'::jsonb),
      'way', town.mine_yes(p_v->'way'), 'crystal', town.mine_yes(p_v->'crystal'), 'vein', town.mine_yes(p_v->'vein'),
      'by', case when jsonb_typeof(p_v->'by') = 'string' then p_v->>'by' else '' end)
  end
$$;

-- mineOf: what a purse keeps of the mine, made sound: stamina still to pay under a point (`owed`), plain rocks
-- broken since the last crumb, the rocks loosened of one place in one turn, a vein opened, the resting floors
-- reached, when a rock was last struck, and the last rock somebody else broke for them.
create or replace function town.mine_of(p_purse jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'owed', case when jsonb_typeof(k.v->'owed') = 'number' and (k.v->>'owed')::double precision > 0 and (k.v->>'owed')::double precision < 1 then k.v->'owed' else '0'::jsonb end,
    'crumb', case when town.mine_int(k.v->'crumb') and (k.v->>'crumb')::numeric > 0 then k.v->'crumb' else '0'::jsonb end,
    'loose', case when jsonb_typeof(k.v->'loose'->'k') = 'string' and jsonb_typeof(k.v->'loose'->'ids') = 'array' then jsonb_build_object('k', k.v->'loose'->'k',
        'ids', coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(k.v->'loose'->'ids') with ordinality i(v, ord) where town.mine_int(i.v)), '[]'::jsonb))
      else jsonb_build_object('k', '', 'ids', '[]'::jsonb) end,
    'vein', coalesce(town.mine_vein_of(k.v->'vein'), 'null'::jsonb),
    -- (a whole number first, and only then a number at all: a word kept there is passed over, never read as one)
    'rests', coalesce((select jsonb_agg(r.n order by r.n)
        from (select distinct case when town.mine_int(i.v) then (i.v #>> '{}')::numeric end as n
                from jsonb_array_elements(case when jsonb_typeof(k.v->'rests') = 'array' then k.v->'rests' else '[]'::jsonb end) i(v)) r
       where r.n between 1 and (town.cat('mining')->>'floors')::numeric and r.n % (town.cat('mining')->>'rest')::numeric = 0), '[]'::jsonb),
    'last', case when jsonb_typeof(k.v->'last') = 'number' then k.v->'last' else '0'::jsonb end,
    'paid', coalesce(town.mine_paid_of(k.v->'paid'), 'null'::jsonb))
    from (select case when jsonb_typeof(p_purse->'mine') = 'object' then p_purse->'mine' else '{}'::jsonb end as v) k
$$;

-- pickOf: the pick in the hand: null when what is held is no pick.
create or replace function town.mine_pick(p_purse jsonb)
returns jsonb language sql stable
as $$ select case when town.tool_kind(s.v->>'item') = 'pick' then s.v end from (select town.hand_stack(p_purse) as v) s $$;

-- anyPick: the pick somebody is paid by for a rock another broke for them: the one in the hand, or, the hand being
-- on something else by now, the best in the bag (the first of the best).
create or replace function town.mine_any_pick(p_purse jsonb)
returns jsonb language sql stable
as $$
  select coalesce(town.mine_pick(p_purse),
    (select b.v from jsonb_array_elements(p_purse->'bag') with ordinality b(v, ord)
      where b.v <> 'null'::jsonb and town.tool_kind(b.v->>'item') = 'pick' order by town.tool_level(b.v) desc, b.ord limit 1))
$$;

-- isLoose: whether a rock is loosened for somebody in a place and a turn.
create or replace function town.mine_is_loose(p_purse jsonb, p_floor integer, p_turn bigint, p_rock integer)
returns boolean language sql stable
as $$
  select l.v->>'k' = p_floor::text || ':' || p_turn::text and exists (select 1 from jsonb_array_elements(l.v->'ids') i(v) where (i.v #>> '{}')::numeric = p_rock)
    from (select town.mine_of(p_purse)->'loose' as v) l
$$;

-- pickSwings (lib/town/tools): how many swings a pick takes to break a rock of some hardness, the pick's own all
-- told. Never under one. (In `double precision`, as the code counts: see the base's head.)
create or replace function town.mine_pick_swings(p_pick jsonb, p_hardness double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, ceil(ceil(p_hardness / (k.p->'power'->>town.tool_level(p_pick))::double precision)
      * (1::double precision - town.gem_by(p_pick, 'fire', k.p->'gems'->'fire'->'fewer')))
    + town.gem_by(p_pick, 'dark', k.p->'gems'->'dark'->'swings'))::integer
    from (select town.cat('mining')->'pick' as p) k
$$;

-- swingsFor: how many swings a rock takes: the pick's own, so many times with no stamina, fewer for a rock
-- loosened. Never under one.
create or replace function town.mine_swings(p_pick jsonb, p_floor integer, p_spent boolean, p_loose boolean, p_points double precision)
returns integer language sql stable
as $$
  select greatest(1::double precision, town.mine_pick_swings(p_pick, town.mine_hardness(p_floor, p_points)) * case when p_spent then (town.cat('mining')->>'tired')::double precision else 1 end
    - case when p_loose then town.opt_n('pkLoose', 'fewer') else 0 end)::integer
$$;

-- veinStrikes (lib/town/tools), veinMods (lib/town/vein): what a go at a vein is played with, by the pick in the
-- hand and whether its holder has any stamina left: its strikes, how many of those a knot stops are given back, how
-- many of the knots the crack may cross, and whether it was begun with no stamina.
create or replace function town.vein_mods(p_pick jsonb, p_spent boolean)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'strikes', greatest(1::double precision, (k.m->'pick'->'strikes'->>town.tool_level(p_pick))::double precision
      + case when town.tool_has(p_pick, 'pkSteady') then town.opt_n('pkSteady', 'strikes') else 0 end
      - case when p_spent then (k.m->'vein'->'tired'->>'fewer')::double precision else 0 end),
    'back', town.gem_by(p_pick, 'water', k.m->'pick'->'gems'->'water'->'back'),
    'cross', town.gem_by(p_pick, 'ice', k.m->'pick'->'gems'->'ice'->'cross'), 'spent', coalesce(p_spent, false))
    from (select town.cat('mining') as m) k
$$;

-- ─── 4. A rock being broken (lib/town/mining's Struck) ───────────────────

-- struckOf: a rock's tally as it is kept, made sound: {first, name, at, by: {member: share}}; null for what is none.
create or replace function town.mine_struck_of(p_v jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'first') = 'string' and jsonb_typeof(p_v->'by') = 'object' and b.by <> '{}'::jsonb then
    jsonb_build_object('first', p_v->'first', 'name', case when jsonb_typeof(p_v->'name') = 'string' then p_v->>'name' else '' end,
      'at', case when jsonb_typeof(p_v->'at') = 'number' then p_v->'at' else '0'::jsonb end, 'by', b.by)
  end
    from (select coalesce((select jsonb_object_agg(e.key, least(1::double precision, (e.value #>> '{}')::double precision))
            from jsonb_each(case when jsonb_typeof(p_v->'by') = 'object' then p_v->'by' else '{}'::jsonb end) e
           where case when jsonb_typeof(e.value) = 'number' then (e.value #>> '{}')::double precision > 0 else false end), '{}'::jsonb) as by) b
$$;

-- partOf: how much of a rock is struck away, none (0) to all of it (1): everybody's shares, added up.
create or replace function town.mine_part(p_struck jsonb)
returns double precision language sql immutable
as $$
  select case when p_struck is null or jsonb_typeof(p_struck->'by') is distinct from 'object' then 0::double precision
    else least(1::double precision, coalesce((select sum(case when jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::double precision > 0 then (e.value #>> '{}')::double precision else 0 end order by e.ord)
      from jsonb_each(p_struck->'by') with ordinality e(key, value, ord)), 0)) end
$$;

-- helpersOf: whoever struck some of a rock away besides the one who struck it first, in the order of their ids.
create or replace function town.mine_helpers(p_struck jsonb)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(e.key order by e.key collate "C") from jsonb_each(p_struck->'by') e
    where e.key <> p_struck->>'first' and case when jsonb_typeof(e.value) = 'number' then (e.value #>> '{}')::double precision > 0 else false end), '[]'::jsonb)
$$;

-- ─── 5. A place's document (lib/town/cave-state, for the one place) ──────

-- Whether something kept says who did a thing and when: {by, name, at}.
create or replace function town.cave_is_by(p_v jsonb)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'by') = 'string' and jsonb_typeof(p_v->'name') = 'string' and jsonb_typeof(p_v->'at') = 'number', false) $$;

-- The lights of a list that still burn at a moment (torches, moss), each made sound: {f, x, y, until, by}.
create or replace function town.cave_lights(p_v jsonb, p_now bigint)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(jsonb_build_object('f', t.v->'f', 'x', t.v->'x', 'y', t.v->'y', 'until', t.v->'until', 'by', t.v->'by') order by t.ord)
    from jsonb_array_elements(case when jsonb_typeof(p_v) = 'array' then p_v else '[]'::jsonb end) with ordinality t(v, ord)
   where case when jsonb_typeof(t.v) = 'object' and town.mine_int(t.v->'f') and town.mine_int(t.v->'x') and town.mine_int(t.v->'y')
                and jsonb_typeof(t.v->'until') = 'number' and jsonb_typeof(t.v->'by') = 'string' then (t.v->>'until')::numeric > p_now else false end), '[]'::jsonb)
$$;

-- caveAt, for one place: its document as it is kept, made sound, and as it is at a moment (this file's head says its
-- shape). A new day has no way open, its crystal whole and no moss; a torch burnt out is gone; rocks of a turn gone
-- by are back, whole.
create or replace function town.cave_at(p_kept jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  day_ integer := town.day_of(p_now);
  turn_ bigint := town.mine_turn(p_now);
  same boolean := coalesce(jsonb_typeof(k->'day') = 'number' and (k->>'day')::numeric = day_, false);
  w jsonb := k->'way';
  b jsonb := k->'broken';
  s jsonb := k->'struck';
  way_ jsonb := 'null'::jsonb;
  ids jsonb := '[]'::jsonb;
  rocks jsonb := '{}'::jsonb;
  e record;
  sound jsonb;
begin
  if same and town.cave_is_by(w) and town.mine_int(w->'x') and town.mine_int(w->'y') then
    way_ := jsonb_build_object('rock', case when town.mine_int(w->'rock') then w->'rock' else 'null'::jsonb end, 'x', w->'x', 'y', w->'y', 'by', w->'by', 'name', w->'name', 'at', w->'at');
  end if;
  if jsonb_typeof(b) = 'object' and jsonb_typeof(b->'turn') = 'number' and jsonb_typeof(b->'ids') = 'array' then
    if (b->>'turn')::numeric = turn_ then
      -- (each once, in the order they were broken)
      ids := coalesce((select jsonb_agg(d.v order by d.ord) from (select i.v, min(i.ord) as ord from jsonb_array_elements(b->'ids') with ordinality i(v, ord) where town.mine_int(i.v) group by i.v) d), '[]'::jsonb);
    end if;
  end if;
  if jsonb_typeof(s) = 'object' and jsonb_typeof(s->'turn') = 'number' and jsonb_typeof(s->'rocks') = 'object' then
    if (s->>'turn')::numeric = turn_ then
      for e in select r.key as id, r.value as tally from jsonb_each(s->'rocks') r loop
        sound := town.mine_struck_of(e.tally);
        if sound is not null and e.id ~ '^-?[0-9]+$' then rocks := rocks || jsonb_build_object((e.id::numeric)::text, sound); end if;
      end loop;
    end if;
  end if;
  return jsonb_build_object('day', day_, 'way', way_,
    'crystal', case when same and town.cave_is_by(k->'crystal') then jsonb_build_object('by', k->'crystal'->'by', 'name', k->'crystal'->'name', 'at', k->'crystal'->'at') else 'null'::jsonb end,
    'broken', jsonb_build_object('turn', turn_, 'ids', ids), 'struck', jsonb_build_object('turn', turn_, 'rocks', rocks),
    'torches', town.cave_lights(k->'torches', p_now), 'moss', case when same then town.cave_lights(k->'moss', p_now) else '[]'::jsonb end);
end;
$$;

-- goneAt: the rocks of a place that are gone at a moment: those broken this turn, and the one the open way down
-- was found under.
create or replace function town.cave_gone(p_cave jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(p_cave->'way'->'rock') = 'number' and not exists (select 1 from jsonb_array_elements(g.ids) i(v) where i.v = p_cave->'way'->'rock')
              then g.ids || jsonb_build_array(p_cave->'way'->'rock') else g.ids end
    from (select case when (p_cave->'broken'->>'turn')::numeric = town.mine_turn(p_now) and jsonb_typeof(p_cave->'broken'->'ids') = 'array' then p_cave->'broken'->'ids' else '[]'::jsonb end as ids) g
$$;

-- stands: whether a rock of a place stands at a moment. `p_crystal`: the day's crystal rock if it is this place's;
-- once broken it is gone for the day.
create or replace function town.cave_stands(p_cave jsonb, p_rock integer, p_now bigint, p_crystal integer)
returns boolean language sql stable
as $$
  select not exists (select 1 from jsonb_array_elements(town.cave_gone(p_cave, p_now)) i(v) where (i.v #>> '{}')::numeric = p_rock)
     and not (coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb and p_crystal is not null and p_crystal = p_rock)
$$;

-- struckAt: what has been struck away of a rock of a place at a moment, and by whom: null when nobody has struck it
-- this turn.
create or replace function town.cave_struck_at(p_cave jsonb, p_rock integer, p_now bigint)
returns jsonb language sql stable
as $$ select case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then p_cave->'struck'->'rocks'->(p_rock::text) end $$;

-- strikeRock: a rock of a place as it is struck now.
create or replace function town.cave_strike(p_cave jsonb, p_rock integer, p_struck jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_cave || jsonb_build_object('struck', jsonb_build_object('turn', town.mine_turn(p_now), 'rocks',
    (case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then coalesce(p_cave->'struck'->'rocks', '{}'::jsonb) else '{}'::jsonb end) || jsonb_build_object(p_rock::text, p_struck)))
$$;

-- breakRocks: some rocks of a place broken ([id, …]): what was struck away of them is no more to be kept.
create or replace function town.cave_break(p_cave jsonb, p_ids jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_cave || jsonb_build_object(
    'broken', jsonb_build_object('turn', t.n, 'ids', coalesce((select jsonb_agg(d.v order by d.ord)
        from (select i.v, min(i.ord) as ord from jsonb_array_elements(case when (p_cave->'broken'->>'turn')::numeric = t.n then coalesce(p_cave->'broken'->'ids', '[]'::jsonb) else '[]'::jsonb end || p_ids) with ordinality i(v, ord) group by i.v) d), '[]'::jsonb)))
    || case when (p_cave->'struck'->>'turn')::numeric = t.n then jsonb_build_object('struck', jsonb_build_object('turn', t.n, 'rocks',
        coalesce((select jsonb_object_agg(r.key, r.value) from jsonb_each(p_cave->'struck'->'rocks') r where not exists (select 1 from jsonb_array_elements(p_ids) i(v) where (i.v #>> '{}') = r.key)), '{}'::jsonb)))
       else '{}'::jsonb end
    from (select town.mine_turn(p_now) as n) t
$$;

-- struckTold: what a member is told of the rocks of a place that are being broken: of each, how much of it is struck
-- away, how much of that by them, who struck it first (their name), and whether that was the member.
create or replace function town.cave_struck_told(p_cave jsonb, p_who text, p_now bigint)
returns jsonb language sql stable
as $$
  select case when (p_cave->'struck'->>'turn')::numeric = town.mine_turn(p_now) then
    coalesce((select jsonb_object_agg(r.key, jsonb_build_object('part', town.mine_part(r.value), 'own', least(1::double precision, coalesce((r.value->'by'->>p_who)::double precision, 0)),
        'by', r.value->'name', 'mine', r.value->>'first' = p_who)) from jsonb_each(p_cave->'struck'->'rocks') r), '{}'::jsonb)
    else '{}'::jsonb end
$$;

-- wayOpen: whether a floor's way down is open: a resting floor's always is; another's once it has been found or
-- broken through that day. Never below the last floor.
create or replace function town.cave_way_open(p_cave jsonb, p_floor integer)
returns boolean language sql stable
as $$
  select coalesce(p_floor >= 1 and p_floor < (town.cat('mining')->>'floors')::integer
    and (town.cave_is_rest(p_floor) or coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb), false)
$$;

-- What is known of a place on a day, for the rolls ({way, crystal}): which rock hides the way down (none once it is
-- open, or where there is none), and which is the crystal rock (none where it is not, or once it is broken).
-- `p_crystal`: the day's crystal rock if it is this place's.
create or replace function town.mine_today(p_word text, p_floor integer, p_day integer, p_rocks jsonb, p_cave jsonb, p_crystal integer)
returns jsonb language sql stable
as $$
  select case when p_floor <= 0 then jsonb_build_object('way', null, 'crystal', null)
    else jsonb_build_object(
      'way', case when coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb then null else town.mine_way_rock(p_word, p_floor, p_day, p_rocks, p_crystal) end,
      'crystal', case when coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb then null else p_crystal end) end
$$;

-- ─── 6. Where things are, by a day's layout ──────────────────────────────

-- floorAtTile: which floor of the cave a tile of the world is on (0: none).
create or replace function town.cave_floor_at(p_x integer, p_y integer)
returns integer language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  ax integer := (m->'at'->>'x')::integer;
  ay integer := (m->'at'->>'y')::integer;
  across integer := (m->'at'->>'across')::integer;
  apart integer := (m->'at'->>'apart')::integer;
  side integer := (m->'at'->>'size')::integer;
  col integer;
  row_ integer;
  n integer;
begin
  if p_x is null or p_y is null or p_x < ax or p_y < ay then return 0; end if;
  col := (p_x - ax) / apart;
  row_ := (p_y - ay) / apart;
  if col >= across or p_x - ax - col * apart >= side or p_y - ay - row_ * apart >= side then return 0; end if;
  n := row_ * across + col + 1;
  return case when n <= (m->>'floors')::integer then n else 0 end;
end;
$$;

-- floorTile: whether a tile of the world is floor of a floor of the cave that somebody may stand on, with nothing
-- standing on it, by the floor as it is laid.
create or replace function town.cave_floor_tile(p_layout jsonb, p_floor integer, p_x integer, p_y integer)
returns boolean language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  across integer := (m->'at'->>'across')::integer;
  apart integer := (m->'at'->>'apart')::integer;
  side integer := (m->'at'->>'size')::integer;
  u integer;
  v integer;
begin
  if p_layout is null or p_x is null or p_y is null or p_floor is null or p_floor < 1 or p_floor > (m->>'floors')::integer then return false; end if;
  u := p_x - ((m->'at'->>'x')::integer + ((p_floor - 1) % across) * apart);
  v := p_y - ((m->'at'->>'y')::integer + ((p_floor - 1) / across) * apart);
  return u >= 0 and v >= 0 and u < side and v < side and substr(p_layout->>'open', v * side + u + 1, 1) = '1';
end;
$$;

-- ─── 7. What a member is told of the cave (lib/town/cave-state's CaveTold) ─

-- What the village shares (the rocks gone by place, the ways down open, the torches and the moss, the deepest floor
-- reached today) and the member's own (the lift's stops, a vein opened, the rocks loosened, the rocks that glint for
-- them on the floor they are on, the day's crystal rock where they may know of it, the rocks being broken in the
-- place they are in, the last rock of theirs somebody else broke). Never what a rock holds.
-- `p_caves`: every place that has a document, each as it is at this moment ({"0": …, "7": …}); `p_rocks`: the rocks
-- of the place the member says they are in; `p_crystal`: where the day's crystal rock stands, {floor, rock}.

-- The member's own of it, which is all in their purse: the lift's stops, a vein opened and not played out, the rocks
-- loosened for them this turn, the last rock of theirs somebody else broke. (Told by itself, as `caveMine`, by what
-- changes only these and is told no floor: a page lays it over what it was last told of the cave.)
create or replace function town.cave_own(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object('rests', k.v->'rests', 'vein', k.v->'vein',
    'loose', case when split_part(k.lk, ':', 2) ~ '^[0-9]+$' and split_part(k.lk, ':', 2)::numeric = town.mine_turn(p_now) and jsonb_array_length(k.v->'loose'->'ids') > 0
      then jsonb_build_object('floor', case when split_part(k.lk, ':', 1) ~ '^-?[0-9]+$' then split_part(k.lk, ':', 1)::numeric end, 'ids', k.v->'loose'->'ids') else 'null'::jsonb end,
    'paid', k.v->'paid')
    from (select o.v, o.v->'loose'->>'k' as lk from (select town.mine_of(p_purse) as v) o) k
$$;

create or replace function town.cave_told_of(p_caves jsonb, p_purse jsonb, p_me text, p_floor integer, p_x integer, p_y integer, p_now bigint, p_word text, p_rocks jsonb, p_crystal jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  turn_ bigint := town.mine_turn(p_now);
  day_ integer := town.day_of(p_now);
  pick jsonb := town.mine_pick(p_purse);
  here jsonb := coalesce(p_caves->(p_floor::text), town.cave_at(null, p_now));
  cfloor integer := (p_crystal->>'floor')::integer;
  crock integer := (p_crystal->>'rock')::integer;
  -- (the crystal's breaker is written in the document of the floor it stood on)
  shattered boolean := cfloor is not null and coalesce(p_caves->(cfloor::text)->'crystal', 'null'::jsonb) <> 'null'::jsonb;
  gone jsonb := '{}'::jsonb;
  ways jsonb := '{}'::jsonb;
  deepest jsonb := 'null'::jsonb;
  glints jsonb := '[]'::jsonb;
  torches jsonb;
  moss jsonb;
  f integer;
  c jsonb;
  ids jsonb;
  reach double precision;
  veins double precision;
  today_ jsonb;
  r jsonb;
  again_ numeric;
begin
  for f in 0..(m->>'floors')::integer loop
    c := p_caves->(f::text);
    continue when c is null;
    ids := town.cave_gone(c, p_now);
    if shattered and cfloor = f and not exists (select 1 from jsonb_array_elements(ids) i(v) where (i.v #>> '{}')::numeric = crock) then ids := ids || jsonb_build_array(crock); end if;
    if jsonb_array_length(ids) > 0 then gone := gone || jsonb_build_object(f::text, ids); end if;
    if coalesce(c->'way', 'null'::jsonb) <> 'null'::jsonb then
      ways := ways || jsonb_build_object(f::text, jsonb_build_object('x', c->'way'->'x', 'y', c->'way'->'y', 'rock', c->'way'->'rock', 'name', c->'way'->'name'));
      -- (the board: the floor under the deepest way that is open today, and who opened it; the floors are gone through from the top)
      deepest := jsonb_build_object('floor', f + 1, 'by', c->'way'->'by', 'name', c->'way'->'name', 'at', c->'way'->'at');
    end if;
  end loop;
  -- the rocks that glint for the pick in the hand (the catalog's `pick.gems.light.glint`), by where the member stands
  reach := town.gem_by(pick, 'light', m->'pick'->'gems'->'light'->'glint');
  if reach > 0 and p_floor > 0 and p_x is not null and p_y is not null then
    today_ := town.mine_today(p_word, p_floor, day_, p_rocks, here, case when cfloor = p_floor then crock end);
    veins := town.mine_veins(pick);
    for r in select x.v from jsonb_array_elements(p_rocks) with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(coalesce(gone->(p_floor::text), '[]'::jsonb)) i(v) where (i.v #>> '{}')::numeric = (r->>0)::numeric);
      continue when reach < (m->>'all')::double precision
        and (((r->>1)::integer - p_x) * ((r->>1)::integer - p_x) + ((r->>2)::integer - p_y) * ((r->>2)::integer - p_y))::double precision > reach * reach;
      if town.mine_holds_by(p_word, p_floor, (r->>0)::integer, turn_, today_, veins)->>'kind' = 'vein' then glints := glints || jsonb_build_array((r->>0)::integer); end if;
    end loop;
  end if;
  -- (the lights of every place, the first to go out first)
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into torches
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'torches') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into moss
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'moss') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  -- changesAt: when this next changes by itself: the rocks' next turn, the first torch to burn out, the first moss to stop glowing
  select least((turn_ + 1) * (m->>'turn')::numeric, min((t.v->>'until')::numeric)) into again_ from jsonb_array_elements(torches || moss) t(v);
  return jsonb_build_object('day', day_, 'turn', turn_, 'again', again_, 'gone', gone, 'ways', ways, 'torches', torches, 'moss', moss, 'deepest', deepest,
    'glints', glints, 'place', p_floor, 'struck', town.cave_struck_told(here, p_me, p_now),
    'crystal', case when p_crystal is null or p_crystal = 'null'::jsonb or shattered then 'null'::jsonb
      when p_floor = cfloor then jsonb_build_object('floor', cfloor, 'rock', crock)
      when pick is not null and town.tool_has(pick, 'pkGleam') then jsonb_build_object('floor', cfloor, 'rock', null) else 'null'::jsonb end)
    || town.cave_own(p_purse, p_now);
end;
$$;

-- …for a member, read off what is kept (nothing is held): the places as they are now, the rocks of the place they
-- say they are in (a place that is none is the mountain's foot), the day's crystal rock.
create or replace function town.cave_told(p_member uuid, p_purse jsonb, p_floor integer, p_x integer, p_y integer, p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select town.cave_told_of(
    coalesce((select jsonb_object_agg(c.place::text, town.cave_at(c.doc, p_now)) from public.town_cave c), '{}'::jsonb),
    p_purse, p_member::text, f.n, p_x, p_y, p_now, town.mine_word(),
    case when f.n = 0 then town.cat('mining')->'rocks' else coalesce(town.cave_laid(d.n, f.n)->'rocks', '[]'::jsonb) end,
    town.mine_crystal(d.n))
    from (select case when p_floor between 0 and (town.cat('mining')->>'floors')::integer then p_floor else 0 end as n) f, (select town.day_of(p_now) as n) d
$$;

-- ─── 8. A rock struck (lib/town/mining's mine, payFirst and pay) ─────────
--
-- A GO, as the rules below are given it (`p_go`): now; floor (0: the mountain's foot); rock; at ([x, y], the tile
-- the member stands on: null for a tile that is none); swings (those made since the page last said); who and name
-- (the striker's); rocks (the place's as they are laid, [[id, x, y, look], …]); cave (the place's document as it is
-- now); crystal (the day's crystal rock if it is this place's); day; today ({way, crystal}: `town.mine_today`);
-- element (the floor's of the day); points (the striker's on the miners' line); quake (a counted power asked for).

-- Some more of a thing among what a go leaves ([[thing, how many], …]): onto its own line, or a new one at the end.
create or replace function town.mine_add(p_got jsonb, p_id text, p_n double precision)
returns jsonb language sql immutable
as $$
  select case when p_n is null or p_n <= 0 then p_got
    when exists (select 1 from jsonb_array_elements(p_got) g(v) where g.v->>0 = p_id)
      then (select jsonb_agg(case when g.v->>0 = p_id then jsonb_build_array(p_id, (g.v->>1)::double precision + p_n) else g.v end order by g.ord) from jsonb_array_elements(p_got) with ordinality g(v, ord))
    else p_got || jsonb_build_array(jsonb_build_array(p_id, p_n)) end
$$;

-- What a rock holds if it is a plain one that may break with another: null for one that somebody else than `p_first`
-- has begun (that one is theirs), and for one that hides a vein, the way down or the crystal.
create or replace function town.mine_plain_at(p_go jsonb, p_rock integer, p_first text, p_veins double precision, p_word text)
returns jsonb language sql stable
as $$
  select case when b.begun is not null and b.begun->>'first' <> p_first then null
    else (select case when h.v->>'kind' = 'stone' then h.v end
            from (select town.mine_holds_by(p_word, (p_go->>'floor')::integer, p_rock, town.mine_turn((p_go->>'now')::bigint), p_go->'today', p_veins) as v) h) end
    from (select town.cave_struck_at(p_go->'cave', p_rock, (p_go->>'now')::bigint) as begun) b
$$;

-- pay: a rock struck whole away breaks, and whoever struck it first has what it left. `p_own`: it is they who
-- struck the last of it away (then it is the pick in their hand that counts; or else the best they have). Refused
-- with nothing changed when it hides a vein and they have one open, or there is no room for what it leaves.
create or replace function town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_rock->>0)::integer;
  here integer := (p_go->>'crystal')::integer;
  touch double precision := (m->>'touch')::double precision;
  pick jsonb := case when p_own then town.mine_pick(p_purse) else town.mine_any_pick(p_purse) end;
  opts jsonb := town.tool_mods(pick)->'opts';
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  spent boolean := town.stamina_of(p_purse, now_) <= 0;
  veins double precision := town.mine_veins(pick);
  holds jsonb := town.mine_holds_by(p_word, floor_, rock_, turn_, p_go->'today', veins);
  breaks jsonb;                 -- [{rock: [id, x, y, look], holds}, …]: the rock struck first
  r jsonb;
  b jsonb;
  h jsonb;
  chance double precision;
  chained integer;
  got_ jsonb := '[]'::jsonb;
  each_ jsonb := '[]'::jsonb;
  moss jsonb := '[]'::jsonb;
  gone jsonb;
  loose jsonb;
  ore_ text := town.mine_ore(floor_);
  crumb integer := (kept->>'crumb')::integer;
  shards double precision;
  by_ double precision;
  way_ integer;
  shattered boolean := false;
  vein_ jsonb := 'null'::jsonb;
  stowed jsonb;
  after_ jsonb;
  cost double precision := 0;
  owed double precision := (kept->>'owed')::double precision;
  fresh_ jsonb;
  eased_ jsonb;
  used jsonb;
  had_ double precision;
  key_ text := floor_::text || ':' || turn_::text;
  paid jsonb;
begin
  if holds->>'kind' = 'vein' and kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;

  -- which rocks break: the one struck; by `pkQuake`, plain rocks about the member; and by the roll of `:chain`, now and
  -- then a neighbour. (Never a rock somebody else has begun: that one is theirs.)
  breaks := jsonb_build_array(jsonb_build_object('rock', p_rock, 'holds', holds));
  if p_quake then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when (r->>0)::integer = rock_ or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, town.opt_n('pkQuake', 'reach'));
      h := town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word);
      if h is not null then breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', h)); end if;
    end loop;
  end if;
  chance := town.gem_by(pick, 'lightning', m->'pick'->'gems'->'lightning'->'chain');
  if chance > 0 and town.roll(p_word || ':chain', floor_, rock_, turn_) < chance then
    -- (the nearest plain rock that touches it and still stands; of two as near, the lesser number)
    r := (select x.v from jsonb_array_elements(p_go->'rocks') x(v)
           where town.cave_stands(p_go->'cave', (x.v->>0)::integer, now_, here)
             and not exists (select 1 from jsonb_array_elements(breaks) q(v) where q.v->'rock'->>0 = x.v->>0)
             and town.mine_near((p_rock->>1)::numeric, (p_rock->>2)::numeric, (x.v->>1)::integer, (x.v->>2)::integer, touch)
             and town.mine_plain_at(p_go, (x.v->>0)::integer, p_struck->>'first', veins, p_word) is not null
           order by ((x.v->>1)::integer - (p_rock->>1)::integer) * ((x.v->>1)::integer - (p_rock->>1)::integer) + ((x.v->>2)::integer - (p_rock->>2)::integer) * ((x.v->>2)::integer - (p_rock->>2)::integer), (x.v->>0)::integer
           limit 1);
    if r is not null then
      breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word)));
      chained := (r->>0)::integer;
    end if;
  end if;

  -- what they leave
  for b in select x.v from jsonb_array_elements(breaks) with ordinality x(v, ord) order by x.ord loop
    got_ := town.mine_add(got_, 'stone', (m->>'stone')::double precision);
    h := b->'holds';
    shards := 0;
    if h->>'kind' in ('stone', 'way') then
      shards := (h->>'shards')::double precision;
      if h->>'kind' = 'way' then
        way_ := (b->'rock'->>0)::integer;
      elsif opts ? 'pkCrumb' then
        crumb := crumb + 1;
        if crumb >= town.opt_n('pkCrumb', 'every') then crumb := 0; shards := shards + town.opt_n('pkCrumb', 'more'); end if;
      end if;
      if h->>'kind' = 'stone' and coalesce((h->>'moss')::boolean, false) then moss := moss || jsonb_build_array((b->'rock'->>0)::integer); end if;
      got_ := town.mine_add(got_, ore_, shards);
    elsif h->>'kind' = 'crystal' then
      shattered := true;
      by_ := case when opts ? 'pkGleam' then town.opt_n('pkGleam', 'by') else 1 end;
      shards := ceil((m->'crystal'->>'shards')::double precision * by_);
      got_ := town.mine_add(got_, m->'ores'->-1->>'shard', shards);
      got_ := town.mine_add(got_, town.cat('forge')->'gems'->(p_go->>'element')->>'chip', ceil((m->'crystal'->>'chips')::double precision * by_));
    end if;
    each_ := each_ || jsonb_build_array(jsonb_build_object('rock', (b->'rock'->>0)::integer, 'kind', h->>'kind', 'shards', shards));
  end loop;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;

  -- what it costs: a point a go, by `pkFresh`'s count and `pick.gems.earth.stamina` (a share kept exact over time)
  after_ := stowed;
  fresh_ := case when opts ? 'pkFresh' then town.use_power(after_, pick, 'pkFresh', now_) end;
  if fresh_ is not null and (fresh_->>'ok')::boolean then
    after_ := fresh_->'purse';
  else
    had_ := town.stamina_of(after_, now_);
    eased_ := town.eased(after_, town.spend(after_, (m->>'stamina')::double precision, now_), now_,
      1::double precision - town.gem_by(pick, 'earth', m->'pick'->'gems'->'earth'->'stamina'), owed);
    cost := had_ - town.stamina_of(eased_->'purse', now_);
    after_ := eased_->'purse';
    owed := (eased_->>'owed')::double precision;
  end if;
  if p_quake then
    used := town.use_power(after_, pick, 'pkQuake', now_);
    if (used->>'ok')::boolean then after_ := used->'purse'; end if;
  end if;
  if holds->>'kind' = 'vein' then
    -- the vein is the member's from here: played with the pick as it is now, and with the stamina left after the rock
    vein_ := jsonb_build_object('f', floor_, 'rock', rock_, 'turn', turn_, 'seed', holds->'seed',
      'gem', case when (holds->>'gem')::boolean then p_go->'element' else 'null'::jsonb end,
      'mods', town.vein_mods(pick, town.stamina_of(after_, now_) <= 0),
      'more', case when (holds->>'gem')::boolean and opts ? 'pkCutter' then town.opt_n('pkCutter', 'more') else 0 end);
    had_ := town.stamina_of(after_, now_);
    after_ := town.spend(after_, (m->'vein'->>'stamina')::double precision, now_);
    cost := cost + (had_ - town.stamina_of(after_, now_));
  end if;

  -- what is loosened: the rocks that touch one that broke, and still stand
  gone := (select jsonb_agg((x.v->'rock'->>0)::integer order by x.ord) from jsonb_array_elements(breaks) with ordinality x(v, ord));
  loose := coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(case when kept->'loose'->>'k' = key_ then kept->'loose'->'ids' else '[]'::jsonb end) with ordinality i(v, ord)
                      where not exists (select 1 from jsonb_array_elements(gone) g(v) where g.v = i.v)), '[]'::jsonb);
  if opts ? 'pkLoose' then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(gone || loose) g(v) where (g.v #>> '{}')::numeric = (r->>0)::numeric)
        or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not exists (select 1 from jsonb_array_elements(breaks) q(v)
                        where town.mine_near((q.v->'rock'->>1)::numeric, (q.v->'rock'->>2)::numeric, (r->>1)::integer, (r->>2)::integer, touch));
      loose := loose || jsonb_build_array((r->>0)::integer);
    end loop;
    loose := coalesce((select jsonb_agg(i.v order by (i.v #>> '{}')::numeric) from jsonb_array_elements(loose) i(v)), '[]'::jsonb);
  end if;
  -- (broken for them by somebody else: their page is to say so once, with what it left and who it was)
  paid := case when p_own then kept->'paid' else jsonb_build_object('at', now_, 'f', floor_, 'rock', rock_, 'got', got_, 'way', way_ is not null, 'crystal', shattered,
    'vein', vein_ <> 'null'::jsonb, 'by', coalesce(p_go->>'name', '')) end;
  -- (a rock that opens no vein leaves the vein that is open as it is: whoever struck a rock first and has opened a
  -- vein elsewhere since is paid for the rock when somebody else breaks it, and their vein is theirs to play still.
  -- A rock that does open one never comes here with one open: it is refused at the top, and waits)
  after_ := after_ || jsonb_build_object('mine', kept || jsonb_build_object('owed', owed, 'crumb', crumb, 'loose', jsonb_build_object('k', key_, 'ids', loose),
    'vein', case when vein_ <> 'null'::jsonb then vein_ else kept->'vein' end,
    'last', case when p_own then to_jsonb(now_) else kept->'last' end, 'paid', paid));
  return jsonb_build_object('ok', true, 'done', true, 'purse', after_, 'struck', p_struck, 'broke', gone, 'chained', chained, 'got', got_, 'way', way_, 'vein', vein_,
    'crystal', shattered, 'loose', loose, 'cost', cost, 'spent', spent, 'each', each_, 'moss', moss);
end;
$$;

-- mine: a rock struck: the swings made since the page last said go into it, as the striker's own share of it. It
-- still stands (`done` false: the tally is to be kept, and the purse only remembers the moment); or it is struck
-- whole away and the striker struck it first (`done` true: it breaks, and their purse has what it left); or it is
-- struck whole away and somebody else struck it first (`done` "theirs": it is that member's to be paid for, with
-- their purse, `town.mine_pay_first`). The refusals are the code's, in the code's order.
create or replace function town.mine(p_purse jsonb, p_go jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_go->>'rock')::integer;
  who text := coalesce(p_go->>'who', '');
  pick jsonb := town.mine_pick(p_purse);
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  swings double precision := case when jsonb_typeof(p_go->'swings') = 'number' then (p_go->>'swings')::double precision end;
  last_ double precision := (kept->>'last')::double precision;
  r jsonb;
  had jsonb;
  own boolean;
  spent boolean;
  quake boolean;
  need double precision;
  left_ double precision;
  counted double precision;
  share double precision;
  struck jsonb;
  swung jsonb;
begin
  if pick is null then return town.no('tool'); end if;
  if kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;
  r := town.mine_rock(p_go->'rocks', rock_);
  if r is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', rock_, now_, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  if jsonb_typeof(p_go->'at') is distinct from 'array'
     or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, (m->>'reach')::double precision) then return town.no('far'); end if;
  if town.mine_holds(p_word, floor_, rock_, turn_, p_go->'today', pick)->>'kind' = 'crystal' and town.tool_level(pick) < (m->'crystal'->>'plus')::integer then return town.no('weak'); end if;
  -- (`pkQuake` is for a rock nobody else has begun: on somebody else's rock the pick swings as any other)
  had := town.cave_struck_at(p_go->'cave', rock_, now_);
  own := had is null or had->>'first' = who;
  spent := town.stamina_of(p_purse, now_) <= 0;
  quake := coalesce((p_go->>'quake')::boolean, false) and own;
  if quake and not town.may_power(p_purse, pick, 'pkQuake', now_) then return town.no('spent'); end if;
  if swings is null or swings < 1 then return town.no('more'); end if;
  -- the swings that count: no more than what is left of the rock takes of this pick, and none quicker than a hand swings
  need := case when quake then 1 else town.mine_swings(pick, floor_, spent, town.mine_is_loose(p_purse, floor_, turn_, rock_), coalesce((p_go->>'points')::double precision, 0)) end;
  left_ := greatest(0::double precision, 1::double precision - town.mine_part(had));
  counted := least(floor(swings), ceil(left_ * need - 1e-6::double precision));
  -- (a moment BEFORE the last strike believed is too soon too: `town_mine` takes its moment before it waits for the
  -- place, and a newer call of the same member on another place may have moved `last` on meanwhile)
  if now_ - last_ < counted * (m->'swing'->>'least')::double precision then return town.no('soon'); end if;
  share := least(left_, counted / need);
  struck := jsonb_build_object('first', coalesce(had->>'first', who), 'name', case when had is not null then had->>'name' else coalesce(p_go->>'name', '') end,
    'at', case when had is not null then had->'at' else to_jsonb(now_) end,
    'by', coalesce(had->'by', '{}'::jsonb) || case when share > 0 then jsonb_build_object(who, coalesce((had->'by'->>who)::double precision, 0) + share) else '{}'::jsonb end);
  swung := p_purse || jsonb_build_object('mine', kept || jsonb_build_object('last', now_));
  if town.mine_part(struck) < 1::double precision - 1e-6::double precision then
    return jsonb_build_object('ok', true, 'done', false, 'purse', swung, 'struck', struck, 'part', town.mine_part(struck));
  end if;
  if struck->>'first' <> who then return jsonb_build_object('ok', true, 'done', 'theirs', 'purse', swung, 'struck', struck); end if;
  return town.mine_pay(p_purse, p_go, r, struck, quake, true, p_word);
end;
$$;

-- payFirst: a rock that somebody else struck the last of away, paid to whoever struck it first as if they had
-- broken it: with their purse, wherever they stand and whatever they hold now. `p_go` is the go that broke it; its
-- `name` is who broke it. Refused with nothing changed when there is no room for what it leaves, or it hides a vein
-- and they have one open already: the rock then waits for them, whole.
create or replace function town.mine_pay_first(p_purse jsonb, p_go jsonb, p_struck jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  r jsonb := town.mine_rock(p_go->'rocks', (p_go->>'rock')::integer);
begin
  if r is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', (r->>0)::integer, (p_go->>'now')::bigint, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  return town.mine_pay(p_purse, p_go, r, p_struck, false, false, p_word);
end;
$$;

-- A look at a rock, for a pick that has `pkPeek` (as the code's keeper answers a peek).
create or replace function town.mine_look(p_purse jsonb, p_go jsonb, p_word text)
returns jsonb language plpgsql stable
as $$
declare
  pick jsonb := town.mine_pick(p_purse);
  now_ bigint := (p_go->>'now')::bigint;
  rock_ integer := (p_go->>'rock')::integer;
begin
  if pick is null or not town.tool_has(pick, 'pkPeek') then return town.no('tool'); end if;
  if town.mine_rock(p_go->'rocks', rock_) is null then return town.no('none'); end if;
  if not town.cave_stands(p_go->'cave', rock_, now_, (p_go->>'crystal')::integer) then return town.no('gone'); end if;
  return jsonb_build_object('ok', true, 'peek', town.mine_peek(town.mine_holds(p_word, (p_go->>'floor')::integer, rock_, town.mine_turn(now_), p_go->'today', pick)));
end;
$$;

-- openWay: a floor's way down opened: it stays so for the day. (The deepest floor reached is read off the rows.)
create or replace function town.cave_open_way(p_cave jsonb, p_floor integer, p_way jsonb)
returns jsonb language sql stable
as $$
  select case when coalesce(p_cave->'way', 'null'::jsonb) <> 'null'::jsonb or p_floor < 1 or p_floor >= (town.cat('mining')->>'floors')::integer then p_cave
    else p_cave || jsonb_build_object('way', p_way) end
$$;

-- crystalBroken: the day's crystal rock broken, by whom.
create or replace function town.cave_crystal_broken(p_cave jsonb, p_who jsonb)
returns jsonb language sql immutable
as $$ select case when coalesce(p_cave->'crystal', 'null'::jsonb) <> 'null'::jsonb then p_cave else p_cave || jsonb_build_object('crystal', p_who) end $$;

-- A light set on a tile, among some lights: it burns from now, so long. One to a tile: a new one there burns anew.
create or replace function town.cave_light(p_lights jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint, p_for numeric)
returns jsonb language sql immutable
as $$
  select coalesce((select jsonb_agg(t.v order by t.ord) from jsonb_array_elements(coalesce(p_lights, '[]'::jsonb)) with ordinality t(v, ord)
     where (t.v->>'until')::numeric > p_now and not ((t.v->>'f')::numeric = p_floor and (t.v->>'x')::numeric = p_x and (t.v->>'y')::numeric = p_y)), '[]'::jsonb)
    || jsonb_build_array(jsonb_build_object('f', p_floor, 'x', p_x, 'y', p_y, 'until', p_now + p_for, 'by', p_by))
$$;

-- setTorch, setMoss: a torch set down, and moss let out of a rock that stood on a tile: for everybody.
create or replace function town.cave_set_torch(p_cave jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint)
returns jsonb language sql stable
as $$ select p_cave || jsonb_build_object('torches', town.cave_light(p_cave->'torches', p_floor, p_x, p_y, p_by, p_now, (town.cat('mining')->'light'->>'burns')::numeric)) $$;

create or replace function town.cave_set_moss(p_cave jsonb, p_floor integer, p_x integer, p_y integer, p_by text, p_now bigint)
returns jsonb language sql stable
as $$ select p_cave || jsonb_build_object('moss', town.cave_light(p_cave->'moss', p_floor, p_x, p_y, p_by, p_now, (town.cat('mining')->'moss'->>'glows')::numeric)) $$;

-- ─── 9. The lift, a torch, and a floor broken through (lib/town/mining) ──

-- reachRest: a resting floor reached is one of the lift's stops for the member from then on. (A purse that gains
-- nothing by it is given back as it was.)
create or replace function town.mine_reach_rest(p_purse jsonb, p_floor integer)
returns jsonb language sql stable
as $$
  select case when p_floor is null or not town.cave_is_rest(p_floor) or p_floor > (town.cat('mining')->>'floors')::integer or k.v->'rests' @> to_jsonb(p_floor) then p_purse
    else p_purse || jsonb_build_object('mine', k.v || jsonb_build_object('rests',
      (select jsonb_agg(r.n order by r.n) from (select (i.v #>> '{}')::numeric as n from jsonb_array_elements(k.v->'rests') i(v) union select p_floor::numeric) r))) end
    from (select town.mine_of(p_purse) as v) k
$$;

-- liftStops, mayRide: where the lift takes somebody: the cave's mouth (0) always, and the resting floors they have
-- reached.
create or replace function town.mine_lift_stops(p_purse jsonb)
returns jsonb language sql stable
as $$ select '[0]'::jsonb || (town.mine_of(p_purse)->'rests') $$;

create or replace function town.mine_may_ride(p_purse jsonb, p_to integer)
returns boolean language sql stable
as $$ select coalesce(town.mine_lift_stops(p_purse) @> to_jsonb(p_to), false) $$;

-- torchDown: a torch set down from the hand: one fewer in the bag. (Where it stands and how long it burns is the
-- place's own document.)
create or replace function town.mine_torch_down(p_purse jsonb)
returns jsonb language sql stable
as $$
  select case when town.hand_of(p_purse) is distinct from k.id or town.held(p_purse->'bag', k.id) < 1 then town.no('tool')
    else jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', k.id, 1))) end
    from (select town.cat('mining')->>'torch' as id) k
$$;

-- drill: the way down opened oneself: `pkDrill`, counted, of the pick in the hand, on a floor whose
-- way is not open yet.
create or replace function town.mine_drill(p_purse jsonb, p_floor integer, p_open boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  pick jsonb := town.mine_pick(p_purse);
  used jsonb;
begin
  if pick is null or not town.tool_has(pick, 'pkDrill') then return town.no('tool'); end if;
  if not town.mine_is_dug(p_floor) or not town.mine_has_below(p_floor) then return town.no('none'); end if;
  if p_open then return town.no('open'); end if;
  used := town.use_power(p_purse, pick, 'pkDrill', p_now);
  if (used->>'ok')::boolean then return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', used->'left'); end if;
  return town.no('spent');
end;
$$;

-- The nearest free tile beside a tile of a floor, where a way broken through opens: floor with nothing on it, and
-- not where one comes down (the ladder, or the tile one arrives on). The four sides first, then the corners, in the
-- code's own order (lib/town/trial's drillDo). Null where there is none.
create or replace function town.cave_beside(p_layout jsonb, p_floor integer, p_x integer, p_y integer)
returns jsonb language sql stable
as $$
  select jsonb_build_array(p_x + d.dx, p_y + d.dy)
    from (values (1, 1, 0), (2, 0, 1), (3, -1, 0), (4, 0, -1), (5, 1, 1), (6, -1, 1), (7, 1, -1), (8, -1, -1)) d(ord, dx, dy)
   where town.cave_floor_tile(p_layout, p_floor, p_x + d.dx, p_y + d.dy)
     and p_layout->'up' is distinct from jsonb_build_array(p_x + d.dx, p_y + d.dy) and p_layout->'arrive' is distinct from jsonb_build_array(p_x + d.dx, p_y + d.dy)
   order by d.ord limit 1
$$;

-- ─── 10. A vein played out, by what its page says of the go (lib/town/vein-account) ─────────────────────────────
--
-- The database does not lay a vein's face out: the face comes of its seed by a generator that tries many times and
-- searches a way through each try, and that is not written twice. The page has the face. It says what the go came
-- to (`p_go`, lib/town/vein-account's VeinAccount):
--     seed, again   the vein it is a go at (the seed of its face; whether this is its second go)
--     strikes       the strikes as they were made, [[x, y], …]: cells of the face, sixty-four at the most
--     struck        how many of them counted
--     of            how many cells of the face glint
--     ore           how many glinting cells of ore the crack passed
--     gems          what each gem's cell it passed gives, in fragments: [n, …]
-- and is believed within what holds of EVERY face (`town.vein_odd`). What is the database's own and never the
-- page's: that there is a vein, whether it is a gem's and of which element, the strikes a go has and what a knot
-- gives back, and the vein's `more` (all in the purse's `mine.vein`, written when the rock broke).

-- Whether something said is a whole number, none or more.
create or replace function town.vein_whole(p_v jsonb)
returns boolean language sql immutable
as $$ select case when jsonb_typeof(p_v) = 'number' then (p_v #>> '{}')::numeric >= 0 and (p_v #>> '{}')::numeric = floor((p_v #>> '{}')::numeric) else false end $$;

-- oddOf: whether an account says something no face of that vein could have come to, and what (null: it is within
-- the rules). A face has so many glinting cells, least to most; a go has the vein's strikes and so many given back
-- at the most, and no more count than were made; a strike lengthens the crack by `reach` cells at the most, one that
-- a knot stopped (the only kind given back) by one fewer, and the crack passes no more glinting cells than it has
-- run through; only a gem's vein has gem's cells, one at least and so many at the most, each of so many fragments.
create or replace function town.vein_odd(p_vein jsonb, p_go jsonb)
returns text language plpgsql stable
as $$
declare
  v jsonb := town.cat('mining')->'vein';
  side numeric := (v->>'size')::numeric;
  reach numeric := (v->>'reach')::numeric;
  own numeric := greatest(1, (p_vein->'mods'->>'strikes')::numeric);
  back_ numeric := greatest(0, (p_vein->'mods'->>'back')::numeric);
  gem_ boolean := coalesce(p_vein->'gem', 'null'::jsonb) <> 'null'::jsonb;
  struck numeric;
  of_ numeric;
  ore numeric;
  cut integer;
begin
  if p_go is null or not town.vein_whole(p_go->'struck') or not town.vein_whole(p_go->'of') or not town.vein_whole(p_go->'ore') or jsonb_typeof(p_go->'gems') is distinct from 'array' then return 'shape'; end if;
  if exists (select 1 from jsonb_array_elements(p_go->'gems') g(n) where not town.vein_whole(g.n)) then return 'shape'; end if;
  if jsonb_typeof(p_go->'strikes') is distinct from 'array' then return 'strikes'; end if;
  if jsonb_array_length(p_go->'strikes') > 64 or exists (select 1 from jsonb_array_elements(p_go->'strikes') s(c)
       where not case when jsonb_typeof(s.c) = 'array' then
                   case when jsonb_array_length(s.c) = 2 and town.vein_whole(s.c->0) and town.vein_whole(s.c->1) then (s.c->>0)::numeric < side and (s.c->>1)::numeric < side else false end
                 else false end) then return 'strikes'; end if;
  struck := (p_go->>'struck')::numeric;
  of_ := (p_go->>'of')::numeric;
  ore := (p_go->>'ore')::numeric;
  cut := jsonb_array_length(p_go->'gems');
  if of_ < (v->'points'->>0)::numeric or of_ > (v->'points'->>1)::numeric then return 'of'; end if;
  if struck > jsonb_array_length(p_go->'strikes') or struck > own + back_ then return 'struck'; end if;
  if gem_ then
    if cut > (v->'gem'->'points'->>1)::integer or exists (select 1 from jsonb_array_elements_text(p_go->'gems') g(n) where g.n::numeric < (v->'gem'->'chips'->>0)::numeric or g.n::numeric > (v->'gem'->'chips'->>1)::numeric) then return 'gems'; end if;
  elsif cut > 0 then
    return 'gems';
  end if;
  if ore + cut > of_ or (gem_ and ore > of_ - greatest(1, cut)) then return 'passed'; end if;
  if ore + cut > reach * least(struck, own) + (reach - 1) * greatest(0, struck - own) then return 'far'; end if;
  return null;
end;
$$;

-- veinFrom (lib/town/mining's veinEnd, with the account in the face's place): a vein played out. Refused with
-- nothing changed when no vein is open or the account is of another vein than the one that is (`none`), or there is
-- no room for what it gives (`full`: the vein then waits). An account that no face could have come to (`odd`, with
-- what was odd in it) gives nothing and closes the vein: the purse given back with the refusal is the one to keep.
create or replace function town.vein_end(p_purse jsonb, p_go jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;
  -- `pkTwin`, counted, of the pick now in the hand: the vein is kept, as its second go
  pick := town.mine_pick(stowed);
  twin := case when not twice and pick is not null then town.use_power(stowed, pick, 'pkTwin', p_now) end;
  after_ := case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else stowed end;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', coalesce((twin->>'ok')::boolean, false), 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      case when coalesce((twin->>'ok')::boolean, false) then vein_ || '{"again": true}'::jsonb else 'null'::jsonb end)));
end;
$$;

-- A member's name, as the others are told it: who they are, of somebody with no name at all (as the code's keeper says).
create or replace function town.mine_name(p_member uuid)
returns text language sql stable set search_path = public
as $$
  select coalesce(nullif((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = p_member), ''), p_member::text)
$$;

-- Whoever a tally names, as a member to be paid or written down: null for what is no member's id (a tally is only
-- ever written by this file, so it is one; a member gone from the roster since is passed over, never an error).
create or replace function town.mine_member(p_id text)
returns uuid language plpgsql stable set search_path = public
as $$
begin
  if p_id is null or p_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return null; end if;
  return case when town.is_member(p_id::uuid) then p_id::uuid end;
end;
$$;

-- Whether a tile is one a member may be believed to stand on, to strike a rock of a place from. The place of a rock
-- only once that rock stands no longer; otherwise, in the cave, floor with nothing standing on it by the day's
-- layout; and on the mountain's foot, of which the database knows only where the rocks stand, any tile that is no
-- floor of the cave's. (How near the rock it has to be is the rule's own: a king's move.)
create or replace function town.mine_stood(p_floor integer, p_x integer, p_y integer, p_layout jsonb, p_rocks jsonb, p_cave jsonb, p_now bigint, p_crystal integer)
returns boolean language sql stable
as $$
  select case when p_x is null or p_y is null or p_floor is null then false
    when r.id is not null then not town.cave_stands(p_cave, r.id, p_now, p_crystal)
    when p_floor = 0 then town.cave_floor_at(p_x, p_y) = 0
    else town.cave_floor_tile(p_layout, p_floor, p_x, p_y) end
    from (select 1) one left join lateral
      (select (x.v->>0)::integer as id from jsonb_array_elements(case when jsonb_typeof(p_rocks) = 'array' then p_rocks else '[]'::jsonb end) with ordinality x(v, ord)
        where (x.v->>1)::integer = p_x and (x.v->>2)::integer = p_y order by x.ord limit 1) r on true
$$;

-- A go, put together for the rules from what is kept and what the page says (this file's section 8 says what one
-- is). `p_place`: the place the page says, or null for one that is none (then there is no rock to strike, and the
-- rule says so in its own turn). `p_cave`: the place's document as it is now. The tile is told to the rules only
-- when it can be believed; the swings, only when they are a number.
create or replace function town.mine_go(p_member uuid, p_place integer, p_rock integer, p_x integer, p_y integer, p_swings double precision, p_quake boolean, p_cave jsonb, p_now bigint)
returns jsonb language plpgsql stable set search_path = public
as $$
declare
  m jsonb := town.cat('mining');
  word_ text := town.mine_word();
  day_ integer := town.day_of(p_now);
  f integer := coalesce(p_place, 0);
  laid_ jsonb := case when p_place > 0 then town.cave_laid(day_, p_place) end;
  rocks_ jsonb := case when p_place = 0 then m->'rocks' when p_place > 0 then coalesce(laid_->'rocks', '[]'::jsonb) else '[]'::jsonb end;
  c jsonb := town.mine_crystal(day_);
  crock integer := case when p_place > 0 and (c->>'floor')::integer = p_place then (c->>'rock')::integer end;
begin
  return jsonb_build_object('now', p_now, 'floor', f, 'rock', p_rock,
    'at', case when p_place is not null and town.mine_stood(p_place, p_x, p_y, laid_, rocks_, p_cave, p_now, crock) then jsonb_build_array(p_x, p_y) else 'null'::jsonb end,
    'swings', case when p_swings is null or p_swings = 'NaN'::double precision or abs(p_swings) = 'Infinity'::double precision then 'null'::jsonb else to_jsonb(p_swings) end,
    'who', p_member::text, 'name', town.mine_name(p_member), 'rocks', rocks_, 'cave', p_cave, 'crystal', crock, 'day', day_,
    'today', town.mine_today(word_, f, day_, rocks_, p_cave, crock), 'element', town.mine_element(word_, f, day_),
    'points', coalesce((town.work_told(p_member, p_now)->'mining'->>'points')::double precision, 0), 'quake', coalesce(p_quake, false));
end;
$$;

-- ─── Functions of earlier files, each with a block more ──────────────────
-- (each function below is the database's own text as it stood after v168 and the parts above, with the lines of
-- v164.mining.lines.mjs in place: built by assemble-v164.mjs, never typed. If a file that writes one of them has
-- run since v168, its change is undone here: this file's head says how to look first.)

-- <town.work_counts_of>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;
-- </town.work_counts_of>

-- <town.deed_th>
create or replace function town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    -- ── the lamp relay at dusk (v163) ──
    when 'flame_take' then 'รับไฟจากกองไฟ' when 'flame_pass' then 'ส่งไฟต่อให้คนถัดไป' when 'lamp_light' then 'จุดโคม' when 'lamp_hand' then 'ไฟที่ช่วยกันส่งต่อมาจุดโคม'
    -- ── the lamp relay at dusk (v163): its end ──
    -- ── the mountain's trees (v164) ──
    when 'fell' then 'ตัดต้นไม้' when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'
    -- ── the mountain's trees (v164): its end ──
    -- ── the mountain's rocks (v164) ──
    when 'mine' then 'ทุบหิน' when 'crystal' then 'ทุบหินคริสตัลประจำวัน' when 'delve' then 'เปิดทางลงชั้นถัดไป' when 'hew' then 'ช่วยทุบหินของเพื่อน'
    when 'vein' then 'ขุดสายแร่' when 'vein_odd' then 'สายแร่ที่เล่าผลมาไม่ตรงกติกา' when 'lift' then 'ขึ้นลิฟต์ในถ้ำ' when 'torch' then 'วางคบไฟในถ้ำ'
    -- ── the mountain's rocks (v164): its end ──
    else p_what end
$$;
-- </town.deed_th>

-- ─── What a member calls ─────────────────────────────────────────────────

-- What I am told of the mountain's rocks and the cave, on the floor (0: the mountain's foot) and the tile I say I
-- am on: what glints for me and the crystal rock are told by where I stand. Nothing is held and nothing changes.
create or replace function public.town_cave(p_floor integer default 0, p_x integer default null, p_y integer default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  return town.answer(me, jsonb_build_object('ok', true, 'cave', town.cave_told(me, town.purse_of(me, false), p_floor, p_x, p_y, now_)));
end;
$$;

-- Strike a rock of a place (0: the mountain's foot) from the tile I stand on, with the swings I have made since I
-- last said. They add up with anybody's, and the rock breaks when it is struck whole away: what it leaves is for
-- whoever struck it first, I or another, and whoever else struck some of it away is written down as having lent a
-- hand. The place is held first (of two who strike one rock at one moment the second waits, and then sees the
-- first's swings in it); then my purse and, where somebody else struck the rock first, theirs, the lesser id first.
-- Every answer tells the cave as it is then, for the floor and the tile said.
create or replace function public.town_mine(p_floor integer, p_rock integer, p_x integer, p_y integer, p_swings double precision, p_how text default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  m jsonb := town.cat('mining');
  word_ text := town.mine_word();
  place_ integer := case when p_floor between 0 and (m->>'floors')::integer then p_floor end;
  quake boolean := coalesce(p_how = 'quake', false);
  -- (the swings as the page said them, for the record: what the rule counted of them is the rule's own)
  said numeric := case when p_swings is null or p_swings = 'NaN'::double precision then 0 else least(greatest(floor(p_swings::numeric), 0), 1000) end;
  cave_ jsonb;
  had jsonb;
  first_ uuid;
  first_id text;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  did jsonb;
  paid jsonb;
  next_ jsonb;
  whose jsonb;
  nothing jsonb := jsonb_build_object('ok', true, 'got', '[]'::jsonb, 'broke', '[]'::jsonb, 'way', false, 'vein', null, 'crystal', false, 'chained', null, 'cost', 0);
  helpers jsonb;
  r jsonb;
  e jsonb;
  id_ text;
  doc_ jsonb;
  ore_ text;
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  -- the village's row first, then the purses by their ids
  cave_ := town.cave_at(case when place_ is not null then town.cave_kept(place_, true) end, now_);
  had := case when p_rock is not null then town.cave_struck_at(cave_, p_rock, now_) end;
  first_ := case when had->>'first' <> me::text then town.mine_member(had->>'first') end;
  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;
  purse := town.purse_of(me, true);
  if first_ is not null and first_ > me then theirs := town.purse_of(first_, true); end if;

  go_ := town.mine_go(me, place_, p_rock, p_x, p_y, p_swings, quake, cave_, now_);
  did := town.mine(purse, go_, word_);
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('cave', town.cave_told(me, purse, place_, p_x, p_y, now_)));
  end if;
  first_id := did->'struck'->>'first';
  whose := case when first_id = me::text then 'null'::jsonb else to_jsonb(coalesce(nullif(did->'struck'->>'name', ''), first_id)) end;

  if did->'done' = 'false'::jsonb then
    -- my swings went into it, and it still stands
    perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
    perform town.keep_purse(me, did->'purse');
    return town.answer(me, nothing || jsonb_build_object('part', did->'part', 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
  end if;
  if did->>'done' = 'theirs' then
    -- somebody else struck it first: it is they who are paid, as if they had broken it
    paid := case when theirs is not null then town.mine_pay_first(theirs, go_, did->'struck', word_) end;
    if paid is null or not (paid->>'ok')::boolean then
      -- (they cannot take what it leaves just now: it waits for them, struck whole away, with my swings in it)
      perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
      perform town.keep_purse(me, did->'purse');
      return town.answer(me, nothing || jsonb_build_object('part', 1, 'waits', true, 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
    end if;
    perform town.keep_purse(first_, paid->'purse');
  else
    paid := did;
    first_ := me;
  end if;

  -- what the village shares of the place, after it: the rocks gone, the way down open, the crystal broken, moss let out
  next_ := town.cave_break(cave_, paid->'broke', now_);
  if paid->'way' <> 'null'::jsonb then
    r := town.mine_rock(go_->'rocks', (paid->>'way')::integer);
    next_ := town.cave_open_way(next_, place_, jsonb_build_object('rock', r->0, 'x', r->1, 'y', r->2, 'by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  if (paid->>'crystal')::boolean then
    next_ := town.cave_crystal_broken(next_, jsonb_build_object('by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  for id_ in select i.v from jsonb_array_elements_text(paid->'moss') with ordinality i(v, ord) order by i.ord loop
    r := town.mine_rock(go_->'rocks', id_::integer);
    if r is not null and place_ > 0 then next_ := town.cave_set_moss(next_, place_, (r->>1)::integer, (r->>2)::integer, first_id, now_); end if;
  end loop;
  perform town.keep_cave(place_, next_);
  perform town.keep_purse(me, did->'purse');

  -- written down: each rock that broke, in the name of whoever it was paid to; the way down found; and a hand lent,
  -- in the name of each who lent one
  helpers := town.mine_helpers(did->'struck');
  ore_ := town.mine_ore(place_);
  for e in select x.v from jsonb_array_elements(paid->'each') with ordinality x(v, ord) order by x.ord loop
    doc_ := jsonb_build_object('floor', place_, 'rock', e->'rock', 'swings', said, 'hand', 'pick', 'tile', jsonb_build_array(p_x, p_y))
      || case when (paid->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || case when e->'rock' = paid->'chained' then '{"chained": true}'::jsonb else '{}'::jsonb end
      || case when quake then '{"how": "quake"}'::jsonb else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and first_ <> me then jsonb_build_object('by', me) else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and jsonb_array_length(helpers) > 0 then jsonb_build_object('with', helpers) else '{}'::jsonb end;
    if e->>'kind' = 'crystal' then
      perform town.note(first_, 'crystal', 'stone', 1, 0, doc_ || jsonb_build_object('got', m->'ores'->-1->'shard', 'chip', town.cat('forge')->'gems'->(go_->>'element')->'chip'));
    else
      perform town.note(first_, 'mine', 'stone', 1, 0, doc_
        || case when (e->>'shards')::numeric > 0 then jsonb_build_object('got', ore_, 'shards', e->'shards') else '{}'::jsonb end
        || case when e->>'kind' = 'vein' then '{"vein": true}'::jsonb else '{}'::jsonb end
        || case when paid->'moss' @> jsonb_build_array(e->'rock') then '{"moss": true}'::jsonb else '{}'::jsonb end);
    end if;
  end loop;
  if paid->'way' <> 'null'::jsonb then perform town.note(first_, 'delve', null, 1, 0, jsonb_build_object('floor', place_, 'rock', paid->'way')); end if;
  for id_ in select h.v from jsonb_array_elements_text(helpers) with ordinality h(v, ord) order by h.ord loop
    if town.mine_member(id_) is not null then
      perform town.note(id_::uuid, 'hew', 'stone', 1, 0, jsonb_build_object('floor', place_, 'rock', p_rock, 'whose', first_));
    end if;
  end loop;

  return town.answer(me, case when first_ = me
      then jsonb_build_object('ok', true, 'got', paid->'got', 'broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'vein', paid->'vein', 'crystal', paid->'crystal',
        'chained', paid->'chained', 'cost', paid->'cost', 'part', 1, 'moss', jsonb_array_length(paid->'moss') > 0)
      else nothing || jsonb_build_object('broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'crystal', paid->'crystal', 'chained', paid->'chained',
        'part', 1, 'helped', true, 'whose', whose, 'paid', first_, 'moss', jsonb_array_length(paid->'moss') > 0) end
    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- A look at a rock, with a pick that has `pkPeek`: stone, fragments, or a vein. Nothing is held and nothing changes.
create or replace function public.town_mine_peek(p_floor integer, p_rock integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  place_ integer := case when p_floor between 0 and (town.cat('mining')->>'floors')::integer then p_floor end;
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  return town.answer(me, town.mine_look(town.purse_of(me, false),
    town.mine_go(me, place_, p_rock, null, null, null, false, town.cave_at(case when place_ is not null then town.cave_kept(place_, false) end, now_), now_), town.mine_word()));
end;
$$;

-- I have come to a floor: a resting floor, come to while the way down to it is open today, is one of my lift's stops
-- from then on. The floor is the page's word (the database does not know where anybody is): it counts for nothing
-- but a resting floor whose way is open. It reads no floor's layout, so a day not laid is nothing to it. Only my
-- purse is held; the floor above is read, not held.
create or replace function public.town_cave_reach(p_floor integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  reached boolean := false;
begin
  if town.cave_is_rest(p_floor) and p_floor <= (town.cat('mining')->>'floors')::integer and not town.mine_of(purse)->'rests' @> to_jsonb(p_floor)
     and town.cave_way_open(town.cave_at(town.cave_kept(p_floor - 1, false), now_), p_floor - 1) then
    purse := town.mine_reach_rest(purse, p_floor);
    perform town.keep_purse(me, purse);
    reached := true;
  end if;
  return town.answer(me, jsonb_build_object('ok', true, 'reached', reached, 'caveMine', town.cave_own(purse, now_)));
end;
$$;

-- Ride the lift to the mouth (0) or to a resting floor I have reached: where I come out, in the world's tiles (null:
-- before the mouth). Where it is taken from is not asked, as the code does not. Nothing is held; the ride is
-- written down.
create or replace function public.town_lift(p_to integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if not town.mine_may_ride(town.purse_of(me, false), p_to) then return town.answer(me, town.no('none')); end if;
  perform town.note(me, 'lift', null, p_to, 0, '{}'::jsonb);
  return town.answer(me, jsonb_build_object('ok', true, 'at', case when p_to = 0 then null else town.cave_laid(town.day_of(now_), p_to)->'liftAt' end));
end;
$$;

-- Set the torch in my hand down on the tile I stand on: it lights that floor for everybody, for as long as a torch
-- burns. The tile has to be floor of the cave with nothing on it, by the day's layout. The floor's row is held, then
-- my purse.
create or replace function public.town_torch(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  day_ integer := town.day_of(now_);
  place_ integer := town.cave_floor_at(p_x, p_y);
  cave_ jsonb;
  purse jsonb;
  did jsonb;
begin
  if not town.cave_is_laid(day_) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if place_ = 0 or not town.cave_floor_tile(town.cave_laid(day_, place_), place_, p_x, p_y) then return town.answer(me, town.no('here')); end if;
  cave_ := town.cave_at(town.cave_kept(place_, true), now_);
  purse := town.purse_of(me, true);
  did := town.mine_torch_down(purse);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_cave(place_, town.cave_set_torch(cave_, place_, p_x, p_y, me::text, now_));
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'torch', town.cat('mining')->>'torch', 1, 0, jsonb_build_object('floor', place_, 'tile', jsonb_build_array(p_x, p_y)));
  return town.answer(me, jsonb_build_object('ok', true, 'until', now_ + (town.cat('mining')->'light'->>'burns')::bigint, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- The way down opened beside the tile I stand on (`pkDrill`, counted, of the pick in the hand): it opens there, for
-- everybody, for the day. The tile I say I stand on has to be one that could be stood on (the code asks only which
-- floor it is of: the database asks this more), and there has to be a free tile beside it. The floor's row is held,
-- then my purse.
create or replace function public.town_drill(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  day_ integer := town.day_of(now_);
  place_ integer := town.cave_floor_at(p_x, p_y);
  laid_ jsonb;
  cave_ jsonb;
  c jsonb;
  free_ jsonb;
  purse jsonb;
  did jsonb;
begin
  if not town.cave_is_laid(day_) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  if place_ = 0 then return town.answer(me, town.no('none')); end if;
  laid_ := town.cave_laid(day_, place_);
  cave_ := town.cave_at(town.cave_kept(place_, true), now_);
  purse := town.purse_of(me, true);
  c := town.mine_crystal(day_);
  free_ := town.cave_beside(laid_, place_, p_x, p_y);
  if free_ is null or not town.mine_stood(place_, p_x, p_y, laid_, laid_->'rocks', cave_, now_, case when (c->>'floor')::integer = place_ then (c->>'rock')::integer end) then
    return town.answer(me, town.no('here'));
  end if;
  did := town.mine_drill(purse, place_, town.cave_way_open(cave_, place_), now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_cave(place_, town.cave_open_way(cave_, place_, jsonb_build_object('rock', null, 'x', free_->0, 'y', free_->1, 'by', me::text, 'name', town.mine_name(me), 'at', now_)));
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'delve', null, 1, 0, jsonb_build_object('floor', place_, 'how', 'drill', 'tile', free_));
  return town.answer(me, jsonb_build_object('ok', true, 'at', free_, 'left', did->'left', 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;

-- The vein I opened, played out: what my page says the go came to (section 10 says what an account is, and how far
-- it is believed). It reads no floor. Only my purse is held. The go is written down with the whole of what was
-- said and what it was played with (`said`: the cells of ore and of the gem that were claimed, the seed of the
-- face, the strikes the go had), so that a go can be played again on its face afterwards and held to its account.
-- An account no face could have come to pays nothing, closes the vein, and is written down apart (`vein_odd`).
create or replace function public.town_vein(p_go jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  -- (what is no account, or too long to be one, is none)
  said jsonb := town.claims(p_go);
  did jsonb := town.vein_end(purse, said, now_);
  vein_ jsonb := town.mine_of(purse)->'vein';
  ore_ text;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    ore_ := town.mine_ore((vein_->>'f')::integer);
    perform town.note(me, 'vein', case when exists (select 1 from jsonb_array_elements(did->'got') g(v) where g.v->>0 = ore_) then ore_ end, (did->>'passed')::numeric, 0,
      jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'strikes', said->'strikes', 'struck', did->'struck', 'passed', did->'passed', 'of', did->'of')
      || case when (vein_->'mods'->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || coalesce((select jsonb_build_object('chip', g.v->0) from jsonb_array_elements(did->'got') with ordinality g(v, ord) where g.v->>0 <> ore_ order by g.ord limit 1), '{}'::jsonb)
      || case when vein_->'gem' <> 'null'::jsonb then jsonb_build_object('gem', vein_->'gem') else '{}'::jsonb end
      || case when coalesce((vein_->>'again')::boolean, false) then '{"again": true}'::jsonb else '{}'::jsonb end
      || jsonb_build_object('said', jsonb_build_object('ore', said->'ore', 'gems', said->'gems', 'seed', vein_->'seed', 'mods', vein_->'mods', 'more', vein_->'more')));
    return town.answer(me, jsonb_build_object('ok', true, 'got', did->'got', 'passed', did->'passed', 'of', did->'of', 'again', did->'again', 'caveMine', town.cave_own(did->'purse', now_)));
  end if;
  if did->>'why' = 'odd' then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'vein_odd', null, 0, 0, jsonb_build_object('floor', vein_->'f', 'rock', vein_->'rock', 'how', did->'how', 'said', said,
      'seed', vein_->'seed', 'gem', vein_->'gem', 'mods', vein_->'mods', 'more', vein_->'more'));
    return town.answer(me, town.no('odd') || jsonb_build_object('caveMine', town.cave_own(did->'purse', now_)));
  end if;
  return town.answer(me, did || jsonb_build_object('caveMine', town.cave_own(purse, now_)));
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_cave(integer, integer, integer) from public, anon;
grant execute on function public.town_cave(integer, integer, integer) to authenticated;
revoke execute on function public.town_mine(integer, integer, integer, integer, double precision, text) from public, anon;
grant execute on function public.town_mine(integer, integer, integer, integer, double precision, text) to authenticated;
revoke execute on function public.town_mine_peek(integer, integer) from public, anon;
grant execute on function public.town_mine_peek(integer, integer) to authenticated;
revoke execute on function public.town_cave_reach(integer) from public, anon;
grant execute on function public.town_cave_reach(integer) to authenticated;
revoke execute on function public.town_lift(integer) from public, anon;
grant execute on function public.town_lift(integer) to authenticated;
revoke execute on function public.town_torch(integer, integer) from public, anon;
grant execute on function public.town_torch(integer, integer) to authenticated;
revoke execute on function public.town_drill(integer, integer) from public, anon;
grant execute on function public.town_drill(integer, integer) to authenticated;
revoke execute on function public.town_vein(jsonb) from public, anon;
grant execute on function public.town_vein(jsonb) to authenticated;

-- ─── Nobody calls a rule of schema town ────────────────────────────────────────────────────────────────────────────

-- (each part says it of its own functions; once more here, after the last function the file makes)
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ─────────────────────────────────────────────────────────────────────────────────
--
--   ── the base, which the two others stand on ──
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
--   -- (a member's storage box is opened from beside the plaza's chest as ever, and from beside the mountain's; never from a chest's own tile, nor from further off)
--   select (select data->'more' from public.town_catalog where key = 'box') as the_chests_beyond, town.by_box(33, 34) as by_the_plazas, town.by_box(66, 242) as by_the_mountains,
--          town.by_box(67, 242) as on_it, town.by_box(70, 242) as too_far;
--   -- [[67, 242]] | true | true | false | false
--
--   -- (in the SQL editor nobody is signed in, so this says false; it is the page's to ask)
--   select public.town_far();
--   -- false
--
--   ── the woodcutters' part: the mountain's trees ──
--
--   select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_trees', 'town_fell_begin', 'town_fell', 'town_fell_brace', 'town_fell_root') order by 1;
--   -- town_fell       | true | false | true
--   -- town_fell_begin | true | false | true
--   -- town_fell_brace | true | false | true
--   -- town_fell_root  | true | false | true
--   -- town_trees      | true | false | true
--
--   select town.tree_kind(town.tree_of(0)) as a_pine, town.tree_kind(town.tree_of(900)) as the_ancient_tree, town.tree_of(-1) is null as no_tree,
--          jsonb_array_length(town.keepsake_ids()) as keepsakes, town.deed_th('fell') as a_word,
--          town.work_counts_of('{"from": "deed", "what": "fell", "thing": "pine", "n": 1, "doc": {}}'::jsonb, 'me') as a_pine_counts;
--   -- pine | elder | true | 12 | ตัดต้นไม้ | [{"to": null, "raw": 2, "line": "felling", "first": "felling:pine"}]
--
--   -- (the trees as the village has them now: on the first run, none down)
--   select town.trees_told((select doc from public.town_things where key = 'grove'), '{}'::jsonb, town.now_ms());
--   -- {"down": [], "half": []}
--
--   ── the miners' part: the mountain's rocks and the cave ──
--
--   select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('town_cave', 'town_mine', 'town_mine_peek', 'town_cave_reach', 'town_lift', 'town_torch', 'town_drill', 'town_vein') order by 1;
--   -- town_cave       | true | false | true
--   -- town_cave_reach | true | false | true
--   -- town_drill      | true | false | true
--   -- town_lift       | true | false | true
--   -- town_mine       | true | false | true
--   -- town_mine_peek  | true | false | true
--   -- town_torch      | true | false | true
--   -- town_vein       | true | false | true
--
--   select town.deed_th('mine') as a_word, town.deed_th('vein_odd') as another,
--          town.work_counts_of('{"from": "deed", "what": "delve", "thing": null, "n": 1, "doc": {}}'::jsonb, 'me') as a_way_counts,
--          town.mine_hardness(1, 0) as a_rock, town.cave_is_rest(10) as a_rest, town.mine_ore(25) as deep_ore,
--          town.vein_odd('{"gem": null, "mods": {"strikes": 6, "back": 0}}'::jsonb, '{"strikes": [[0, 0]], "struck": 1, "of": 7, "ore": 1, "gems": []}'::jsonb) as a_face_of_seven;
--   -- ทุบหิน | สายแร่ที่เล่าผลมาไม่ตรงกติกา | [{"to": null, "raw": 5, "line": "mining"}] | 12 | true | shardSilver | of
--
--   -- (what is kept of the cave: no row on the first run; later, a row a place somebody has struck a rock of)
--   select place, doc->'day' as day, doc->'way' as way, jsonb_array_length(doc->'broken'->'ids') as broken from public.town_cave order by place;
--
--   -- (in the SQL editor nobody is signed in: `select public.town_cave();` is refused there, as it is to a browser signed out)
--
--   ── the whole file ──
--
--   -- (nothing of the schema `town` is anybody's to call; the seventeen functions a member calls are there, each for the signed in and for nobody signed out)
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_a_browser_calls,
--          (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
--            and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')
--            and p.proname in ('town_far', 'town_cave_days', 'town_pouch_out', 'town_pouch_in', 'town_trees', 'town_fell_begin', 'town_fell', 'town_fell_brace', 'town_fell_root',
--                              'town_cave', 'town_mine', 'town_mine_peek', 'town_cave_reach', 'town_lift', 'town_torch', 'town_drill', 'town_vein')) as a_members;
--   -- 0 | 17
--
--   -- (the two functions both lines of work add to have both blocks, and the blocks v160 and v163 put there)
--   select position('the mountain''s trees (v164)' in w.def) > 0 as trees_counted, position('the mountain''s rocks (v164)' in w.def) > 0 as rocks_counted,
--          position('the mountain''s trees (v164)' in d.def) > 0 as trees_worded, position('the mountain''s rocks (v164)' in d.def) > 0 as rocks_worded,
--          town.deed_th('stone_lay') <> 'stone_lay' and town.deed_th('lamp_light') <> 'lamp_light' as the_words_before
--     from (select pg_get_functiondef('town.work_counts_of(jsonb, text)'::regprocedure) as def) w, (select pg_get_functiondef('town.deed_th(text)'::regprocedure) as def) d;
--   -- true | true | true | true | true
--
--   -- (a forged tool is no plain thing, and a plain one is as it was)
--   select town.forged('{"item": "pick", "n": 1, "plus": 1}'::jsonb) as forged, town.forged('{"item": "pick", "n": 1}'::jsonb) as plain;
--   -- true | false
--
-- ─── Reading it ──────────────────────────────────────────────────────────────────────────────────────────────────
--
--   -- whether the far side is open, and since when its knob has stood as it does
--   select value, updated_at from public.town_knobs where key = 'far_open';
--
--   -- the far side's deeds, a day at a time
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*), sum(d.n) as n, count(distinct d.member_id) as members
--     from public.town_deeds d
--    where d.what in ('fell', 'brace', 'root', 'mine', 'crystal', 'delve', 'hew', 'vein', 'vein_odd', 'lift', 'torch')
--    group by 1, 2 order by 1 desc, 2 limit 80;
--
--   -- a vein's go that the rules could not hold (each is worth a look: a page said more than any face has)
--   select d.at, d.member_id, d.doc from public.town_deeds d where d.what = 'vein_odd' order by d.id desc limit 20;
--
--   -- the trees that are down, and the days of the cave that are laid
--   select jsonb_object_keys(doc->'down') as tree from public.town_things where key = 'grove' limit 200;
--   select day, count(*) as floors, min(written) as laid from public.town_cave_days group by 1 order by 1 desc limit 7;
--
--   -- where the two lines of work stand
--   select w.line, count(*) as members, max((w.kept->>'points')::numeric) as most from public.town_work w where w.line in ('felling', 'mining') group by 1;
