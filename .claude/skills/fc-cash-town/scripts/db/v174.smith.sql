-- v174, the smith's part: the blacksmith who stands in the town, and the forge's great fire (lib/town/forge,
-- lib/town/great-fire and lib/town/powers' `running`, written again). Tried on the stand-in's snapshot, as it is
-- after the last file that ran: `node try-v164.mjs <the worktree's root> v174 smith`. Safe to run twice.
--
-- It stands on what v164 gave and is live (v164.base.sql's head is the contract): the catalog's `forge` row, the far
-- side's gate, the readers of a tool (`town.tool_kind`, `tool_level`, `tool_drawn`, `tool_origin`, `tool_away`,
-- `tool_gems`, `tool_makers`, `tool_has`, `gem_by`, `opt_n`, `gem_element`, `hand_stack`, `same_pool`, `line_kinds`),
-- the powers (`town.use_power`) and the pouches (`town.held_in`, `room_in`, `take_out`, `stow_away`). Nothing of
-- those is written again here.
--
-- WHAT IS HERE, in the order of the file:
--
--   1. THE CATALOG. One row written over, `forge`: what the smith himself reads beyond what a pick and an axe were
--      read by from the first day (`fire`, `timed`, `stand`, `old`). The block is written from lib/town/catalog.ts
--      (fill-catalog.mjs v174 <this file>); whoever adds a row to CATALOG_KEYS.v174 writes it again.
--   2. THE GATE. The knob `smith_open` (0: built closed). `town.smith_member()` is what every function of the smith's
--      that a member calls begins with:
--          me uuid := town.smith_member();
--      It answers an admin always, and a proved character only while the game is open (v115's knob), the far side is
--      open (v164's) AND `smith_open` is above nothing; everybody else is refused (42501), as `town.far_member()`
--      refuses. `public.town_smith_open()` says the same as a yes or no: the page asks it once, so that nobody is
--      refused anything. Opened from the SQL editor:
--          update public.town_knobs set value = 1 where key = 'smith_open';
--      (`public.town_tool_power` alone begins with the game's gate, `town.member()`: a counted option is used wherever
--      its tool's game is played, and a member has such a tool only by the smith.)
--   3. WHAT IS KEPT.
--      · `town_smiths`, a row a member: lib/town/forge's `Smithy` (the queue of pieces smelting by this clock, how
--        often it was widened, the timber still burning, the draw that waits). A member who has put nothing in has
--        no row. `town.smithy_read(member)`, `town.smithy_held(member)` (held until the transaction ends),
--        `town.keep_smithy(member, doc)`.
--      · `smith`, a row of `town_things`: the village's board (lib/town/forge's `SmithBoard`: who first forged each
--        kind of tool to the top, who first found each option).
--      · `town_great_fire`, ONE row: lib/town/great-fire's `GreatFire` (`due`, `flint`, `tinder`, `row`, `topped`).
--        `town.fire_kept(<hold>)`, `town.keep_fire(doc)`.
--        ITS `due` IS TOLD TO NO PAGE, EVER: the moment the halves of the next fire can be found is drawn here by
--        chance (`random()`, in `public.town_smith_try`, when a fire is spent), kept in this row, and read by the
--        rules alone. What leaves the database of the fire is `town.fire_told` and nothing else: the halves found and
--        by whom, whether it is lit, the row, how many of its first may use it, where the asker stands and whether
--        they have taken the top. No deed's document has `due`, the number it was drawn by, or the fire's document.
--        A fresh village's fire: update public.town_great_fire set doc = '{}'::jsonb, updated_at = now() where one;
--      All three closed: row level security on, no policy, nothing granted to a browser.
--   4. THE RULES, each answering what the code answers, case by case (lib/town/db-vectors-smith.test.ts makes the
--      cases): the table of tries, smelting, the bellows, a try, the options, a gem, a move, the board, the great fire.
--   5. THE FUNCTIONS OF EARLIER FILES WITH A BLOCK MORE, and WHAT A MEMBER CALLS.
--
-- WHAT THE BROWSER IS BELIEVED ABOUT, and nothing else: which slot, which piece and how many, which option of those
-- laid out, which gem; whose bellows (that the two stand by the forge is the page's to hold to: the database knows
-- where nobody stands); and, of a move, the tile stood on (held to the forge's own place) and whether a game's board
-- is open on the page.
--
-- CHANCE IS DRAWN HERE and never sent: how a try goes, which options a draw lays out, and the while before the next
-- fire's halves can be found. Each rule takes its number of chance as an argument, so that it can be held to the
-- code's cases; the function a member calls draws the number and has no argument for one.
--
-- THE ORDER ROWS ARE HELD IN. The base's, with the smith's rows in their places (the base's head: "for every part of
-- this file and of the smith's after it"):
--
--   (1) the village's rows first: `grove`, or a place of `town_cave` (never both in one call);
--       THEN THE GREAT FIRE'S ROW (`town.fire_kept(true)`); THEN THE SMITH'S BOARD (`town.thing('smith', true)`);
--   (2) then members' purses, by their ids, the lesser first (`town.purse_of(<id>, true)`);
--   (3) then a member's smithy (`town.smithy_held(<id>)`): never two in one call.
--
-- Which call holds what, in that order and in no other:
--   public.town_fell          grove; the great fire (only while its tinder can be found by the feller); the purses
--   public.town_mine          a place of the cave; the great fire (only while its flint can be found); the purses
--   public.town_smith_try     the great fire; the board; my purse          (every try: a try may be the top's)
--   public.town_smith_choose  the board; my purse; my smithy
--   public.town_fire_join, public.town_fire_leave      the great fire (my purse is read, not held)
--   town_smith_smelt, _take, _widen, _draw, _redraw    my purse; my smithy
--   town_smith_gem, _move, public.town_tool_power      my purse (a move reads my smithy without holding it: only a
--                                                      deed of my own writes its waiting draw, and those wait on my purse)
--   public.town_smith_bellows                          the other member's smithy, and nothing else
-- No rule of schema `town` takes a hold but the readers named `…_held` / `…_kept(true)`, and those are called by the
-- functions above and by nothing else (the try script reads every function's text for it).
--
-- Every number is the catalog's (`forge`; `work` for what the bellows are worth; `farming.cans` and `items` for a
-- move): no rule here has one of its own. Coins paid to the smith leave the game: they go nowhere.
--
-- Four functions that were there have a small marked block more each: `public.town_fell` and `public.town_mine` (a
-- tree felled may be the village's tinder, a rock paid for its flint), `town.work_counts_of` (the bellows count for
-- the helpers' line) and `town.deed_th` (a word for each deed here). NOTHING OF THEM IS PASTED HERE:
-- v174.smith.lines.mjs says the lines, and build-v164.mjs builds each statement from the function's own text as the
-- database then has it (a file that runs before v174 may have written it again), into the empty places marked below.
-- `town.fell` itself, the woodcutters' rule, is not touched (v172 and v173, which run before this file, write it).

-- <guards: the smith's part> (whoever puts the file together may fold these into the file's own head)
do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.tool_carried(jsonb)') is null or to_regprocedure('town.take_out(jsonb, text, integer)') is null
     or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null or to_regprocedure('town.hand_stack(jsonb)') is null then
    raise exception 'v164 has not run yet: the smith stands on its gate, its readers of a tool, its powers and its pouches';
  end if;
  if to_regprocedure('public.town_fell(jsonb, integer, integer)') is null or to_regprocedure('public.town_mine(integer, integer, integer, integer, double precision, text)') is null then
    raise exception 'v164 has not run yet: the great fire''s halves are found where a tree is felled and a rock is paid for';
  end if;
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 and v149 have not run yet: the smith writes his deeds down, and the bellows count for a line';
  end if;
  if not coalesce(town.cat('work')->'helpers' ? 'bellows', false) then raise exception 'the catalog''s `work` row does not say what the bellows are worth'; end if;
end $$;
-- </guards: the smith's part>

-- ─── 1. The catalog ──────────────────────────────────────────────────────

-- <catalog:v174> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('forge', $town${
    "kinds": ["pick","axe","rod","hoe","can","bugNet","pot","pan","grill"],
    "wooden": ["axe","rod","bugNet"],
    "lines": {"kitchen":["pot","pan","grill"],"farming":["hoe","can"],"fishing":["rod"],"insects":["bugNet"],"mining":["pick"],"felling":["axe"]},
    "forge": {"top":10,"floor":4,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"glow":{"from":7,"full":10},"gemAtTop":1,"cap":3,"maker":24},
    "gemLevels": 4,
    "levels": {"pick":{"power":[3,3.45,3.65,3.7,4,4.5,5,6,7,8.5,12],"strikes":[6,6,6,7,7,7,7,8,9,9,10]},"axe":{"chops":[12,11,11,10,10,9,8,7,7,6,4],"ahead":[3,3,3,3,3,3,4,4,4,4,5],"slow":[0,0,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.5]},"rod":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3],"strike":[1.6,1.625,1.65,1.675,1.7,1.767,1.833,1.9,2,2.1,2.2]},"hoe":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3]},"can":{"waterings":[8,9,9,10,10,11,11,12,13,14,16],"marks":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"bugNet":{"ring":[0.6,0.615,0.63,0.645,0.66,0.69,0.72,0.75,0.8,0.85,0.9],"lands":[300,293,285,278,270,255,240,225,200,175,150]},"pot":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"pan":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"grill":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]}},
    "tries": [{"to":1,"take":100,"stay":0,"down":0,"fee":10,"ore":"shardCopper","n":5,"timber":2},{"to":2,"take":100,"stay":0,"down":0,"fee":20,"ore":"shardCopper","n":8,"timber":2},{"to":3,"take":100,"stay":0,"down":0,"fee":40,"ore":"shardCopper","n":12,"timber":3},{"to":4,"take":100,"stay":0,"down":0,"fee":80,"ore":"shardIron","n":16,"timber":3},{"to":5,"take":90,"stay":10,"down":0,"fee":150,"ore":"oreIron","n":3,"timber":12},{"to":6,"take":80,"stay":15,"down":5,"fee":250,"ore":"oreIron","n":5,"timber":12},{"to":7,"take":70,"stay":20,"down":10,"fee":400,"ore":"oreSilver","n":6,"timber":15},{"to":8,"take":60,"stay":25,"down":15,"fee":600,"ore":"oreSilver","n":9,"timber":15},{"to":9,"take":50,"stay":25,"down":25,"fee":900,"ore":"oreSilver","n":12,"timber":18},{"to":10,"take":40,"stay":30,"down":30,"fee":1500,"ore":"oreSilver","n":5,"timber":6}],
    "smith": {"places":3,"wider":3,"more":[{"timber":20,"coins":200},{"timber":40,"coins":500}],"bellows":{"share":0.1,"each":3,"points":2},"gem":{"mount":"timber","mounts":5,"fee":50},"redraw":{"gems":1,"fee":100},"offer":2,"move":{"share":30,"least":50}},
    "options": {"order":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","axGrain","axDust","axKeen","axResin","axFresh","axDry","rdBait","rdCalm","rdFresh","rdQuick","hoClear","hoFirst","hoFresh","hoLight","cnDrop","cnThrift","cnFresh","cnKind","ntAgain","ntMesh","ntFresh","ntLong","ckFire","ckBase","ckFresh","ckBrisk","pkQuake","pkTwin","pkDrill","pkGleam","axOne","axDouble","axRoot","axElder","rdGold","rdStill","rdCall","hoBoth","hoGrip","hoWet","cnRain","cnFull","cnTwice","ntWide","ntFreeze","ntNest","ckBig","ckWarm","ckScent"],"of":{"pkPeek":{"pool":1,"tools":["pick"],"n":{}},"pkCrumb":{"pool":1,"tools":["pick"],"n":{"every":5,"more":1}},"pkSteady":{"pool":1,"tools":["pick"],"n":{"strikes":2}},"pkLoose":{"pool":1,"tools":["pick"],"n":{"fewer":1}},"pkFresh":{"pool":1,"tools":["pick"],"n":{},"use":{"n":10,"per":"meal"}},"pkCutter":{"pool":1,"tools":["pick"],"n":{"more":1}},"axGrain":{"pool":1,"tools":["axe"],"n":{"ahead":2}},"axDust":{"pool":1,"tools":["axe"],"n":{"every":5,"more":1}},"axKeen":{"pool":1,"tools":["axe"],"n":{"chops":2}},"axResin":{"pool":1,"tools":["axe"],"n":{"in":4}},"axFresh":{"pool":1,"tools":["axe"],"n":{},"use":{"n":5,"per":"meal"}},"axDry":{"pool":1,"tools":["axe"],"n":{"pieces":2}},"rdBait":{"pool":1,"tools":["rod"],"n":{}},"rdCalm":{"pool":1,"tools":["rod"],"n":{"secs":2}},"rdFresh":{"pool":1,"tools":["rod"],"n":{},"use":{"n":5,"per":"meal"}},"rdQuick":{"pool":1,"tools":["rod"],"n":{"shorter":0.15}},"hoClear":{"pool":1,"tools":["hoe"],"n":{"stones":2}},"hoFirst":{"pool":1,"tools":["hoe"],"n":{"misses":1}},"hoFresh":{"pool":1,"tools":["hoe"],"n":{},"use":{"n":10,"per":"meal"}},"hoLight":{"pool":1,"tools":["hoe"],"n":{}},"cnDrop":{"pool":1,"tools":["can"],"n":{"more":3}},"cnThrift":{"pool":1,"tools":["can"],"n":{"takes":1}},"cnFresh":{"pool":1,"tools":["can"],"n":{},"use":{"n":10,"per":"meal"}},"cnKind":{"pool":1,"tools":["can"],"n":{"points":1}},"ntAgain":{"pool":1,"tools":["bugNet"],"n":{"by":0.5}},"ntMesh":{"pool":1,"tools":["bugNet"],"n":{"misses":2}},"ntFresh":{"pool":1,"tools":["bugNet"],"n":{},"use":{"n":10,"per":"meal"}},"ntLong":{"pool":1,"tools":["bugNet"],"n":{"reach":1}},"ckFire":{"pool":1,"tools":["pot","pan","grill"],"n":{"steady":2}},"ckBase":{"pool":1,"tools":["pot","pan","grill"],"n":{"misses":1}},"ckFresh":{"pool":1,"tools":["pot","pan","grill"],"n":{},"use":{"n":3,"per":"meal"}},"ckBrisk":{"pool":1,"tools":["pot","pan","grill"],"n":{"shorter":0.25}},"pkQuake":{"pool":2,"tools":["pick"],"n":{"reach":1},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"tools":["pick"],"n":{"times":2},"use":{"n":5,"per":"day"}},"pkDrill":{"pool":2,"tools":["pick"],"n":{},"use":{"n":3,"per":"day"}},"pkGleam":{"pool":2,"tools":["pick"],"n":{"by":1.5}},"axOne":{"pool":2,"tools":["axe"],"n":{},"use":{"n":10,"per":"day"}},"axDouble":{"pool":2,"tools":["axe"],"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"tools":["axe"],"n":{},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"tools":["axe"],"n":{"by":1.5}},"rdGold":{"pool":2,"tools":["rod"],"n":{"secs":3},"use":{"n":10,"per":"day"}},"rdStill":{"pool":2,"tools":["rod"],"n":{"by":0.5,"mins":5},"use":{"n":2,"per":"day"}},"rdCall":{"pool":2,"tools":["rod"],"n":{},"use":{"n":10,"per":"day"}},"hoBoth":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"hoGrip":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":20,"per":"day"}},"hoWet":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"cnRain":{"pool":2,"tools":["can"],"n":{},"use":{"n":3,"per":"day"}},"cnFull":{"pool":2,"tools":["can"],"n":{"mins":30},"use":{"n":1,"per":"day"}},"cnTwice":{"pool":2,"tools":["can"],"n":{},"use":{"n":10,"per":"day"}},"ntWide":{"pool":2,"tools":["bugNet"],"n":{"reach":3},"use":{"n":10,"per":"day"}},"ntFreeze":{"pool":2,"tools":["bugNet"],"n":{"secs":2},"use":{"n":10,"per":"day"}},"ntNest":{"pool":2,"tools":["bugNet"],"n":{}},"ckBig":{"pool":2,"tools":["pot","pan","grill"],"n":{"more":2},"use":{"n":3,"per":"day"}},"ckWarm":{"pool":2,"tools":["pot","pan","grill"],"n":{"hours":2},"use":{"n":3,"per":"day"}},"ckScent":{"pool":2,"tools":["pot","pan","grill"],"n":{"stamina":10},"use":{"n":3,"per":"day"}}}},
    "built": {"pick":{"opts":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","pkQuake","pkTwin","pkDrill","pkGleam"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"axe":{"opts":["axGrain","axDust","axKeen","axResin","axFresh","axDry","axOne","axDouble","axRoot","axElder"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"rod":{"opts":["rdBait","rdCalm","rdFresh","rdQuick","rdGold","rdStill","rdCall"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"hoe":{"opts":["hoClear","hoFirst","hoFresh","hoLight","hoBoth","hoGrip","hoWet"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"can":{"opts":["cnDrop","cnThrift","cnFresh","cnKind","cnRain","cnFull","cnTwice"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"bugNet":{"opts":["ntAgain","ntMesh","ntFresh","ntLong","ntWide","ntFreeze","ntNest"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pot":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pan":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"grill":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]}},
    "elements": ["fire","water","ice","earth","lightning","wind","light","dark"],
    "gems": {"fire":{"gem":"gemRuby","chip":"chipRuby"},"water":{"gem":"gemSapphire","chip":"chipSapphire"},"ice":{"gem":"gemAquamarine","chip":"chipAquamarine"},"earth":{"gem":"gemAmber","chip":"chipAmber"},"lightning":{"gem":"gemTopaz","chip":"chipTopaz"},"wind":{"gem":"gemEmerald","chip":"chipEmerald"},"light":{"gem":"gemDiamond","chip":"chipDiamond"},"dark":{"gem":"gemOnyx","chip":"chipOnyx"}},
    "smelting": {"fragments":10,"timber":1},
    "smelts": {"order":["oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx"],"of":{"oreCopper":{"of":"shardCopper","mins":5,"fee":5},"oreIron":{"of":"shardIron","mins":8,"fee":10},"oreSilver":{"of":"shardSilver","mins":11,"fee":15},"gemRuby":{"of":"chipRuby","mins":10,"fee":20},"gemSapphire":{"of":"chipSapphire","mins":10,"fee":20},"gemAquamarine":{"of":"chipAquamarine","mins":10,"fee":20},"gemAmber":{"of":"chipAmber","mins":10,"fee":20},"gemTopaz":{"of":"chipTopaz","mins":10,"fee":20},"gemEmerald":{"of":"chipEmerald","mins":10,"fee":20},"gemDiamond":{"of":"chipDiamond","mins":10,"fee":20},"gemOnyx":{"of":"chipOnyx","mins":10,"fee":20}}},
    "fire": {"wait":{"least":1209600000,"most":2937600000},"turn":86400000,"row":60},
    "timed": {"cnFull":"canFull","rdStill":"rodStill"},
    "stand": {"at":[50.2,24.1],"reach":6},
    "old": {"fire":{"rod":{"tires":[0.15,0.25,0.35,0.45]},"hoe":{"fewer":[1,1,2,2]},"can":{"more":[1,2,3,4]},"bugNet":{"sooner":[0.15,0.25,0.35,0.45]},"cook":{"shorter":[0.15,0.25,0.35,0.45]}},"water":{"spared":[1,2,3,4]},"ice":{"slow":[0.15,0.25,0.35,0.45]},"earth":{"stamina":[0.15,0.25,0.35,0.45]},"lightning":{"chance":[0.1,0.2,0.3,0.4]},"light":{"rod":{"early":[0.2,0.3,0.4,0.5]},"can":{"glint":[4,7,10,999]},"bugNet":{"seen":[3,5,7,9]}},"dark":{"rod":{"rare":[1.2,1.4,1.6,1.8],"fiercer":0.1},"hoe":{"worm":[0.05,0.1,0.15,0.2],"faster":0.1},"can":{"more":[0.1,0.15,0.2,0.25],"uses":2},"bugNet":{"rare":[1.2,1.4,1.6,1.8],"smaller":0.1},"cook":{"helping":[0.1,0.2,0.3,0.4],"harder":0.1}}}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","loach","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait","caterpillar","moth","dragonfly","grasshopper"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatFeather":1.1,"floatGlow":1.15,"floatQuill":1.25,"floatBell":1.5},
    "nets": {"netSmall":0.88,"netLong":0.76},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "signs": {"crowd":2,"lately":300,"after":30,"moon":1.5,"weekend":[0,6]},
    "pair": {"never":["legend"]},
    "orb": {"minutes":30,"night":23,"skies":["night","rain","moon"]},
    "star": {"tiers":["rare","legend"]},
    "wary": {"ups":3,"within":300,"gone":600,"tiers":["rare","legend"]},
    "bouts": {"legend":2},
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":50,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":7,"chance":0.77,"shares":1},"water":{"every":7,"chance":0.7,"shares":1},"field":{"every":7,"chance":0.77,"shares":1},"lamp":{"every":7,"chance":0.84,"shares":1},"tree":{"every":14,"chance":0.7,"shares":1},"litter":{"every":14,"chance":0.7,"shares":1},"glade":{"every":30,"chance":0.25,"shares":1},"falls":{"every":15,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "rare": ["morpho","glassDragonfly","orchidMantis","lunaMoth","hawkMoth","stagBeetle","jewelBeetle","herculesBeetle"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20},
    "nectar": {"within":10,"soon":3,"stays":120,"at":["blooms","water","field","lamp","litter"],"maps":[["town",0,0,64,64],["farm",128,0,60,44],["forest",144,112,96,80]]},
    "pair": {"slack":2500}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v174>

do $$
begin
  if town.cat('forge')->'fire' is null or town.cat('forge')->'stand' is null or town.cat('forge')->'timed' is null or town.cat('forge')->'old' is null then
    raise exception 'the catalog''s `forge` row has not the great fire''s knobs, the forge''s place, the timed options and the older tools'' steps in it: its block was not written from the code';
  end if;
end $$;

-- ─── 2. The gate ─────────────────────────────────────────────────────────

insert into public.town_knobs (key, value) values
  ('smith_open', 0)         -- whether the blacksmith is open to every proved character: until it is, to admins only
  on conflict (key) do nothing;

-- Who is asking, of the smith: `town.far_member()`'s answer, with one thing more: the smith is open to them.
create or replace function town.smith_member()
returns uuid language plpgsql stable set search_path = public
as $$
declare
  me uuid := town.far_member();
begin
  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) <= 0 then
    raise exception 'the blacksmith is not open yet' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- Whether the smith is open to whoever asks: the same rule, as a yes or no.
create or replace function public.town_smith_open()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.is_admin()
          or (public.verified_character()
              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0
              and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) > 0
              and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) > 0));
$$;

comment on function public.town_smith_open() is
  'Whether Cash Town''s blacksmith is open to whoever asks: an admin always, a proved character while '
  'town_knobs.game_open, town_knobs.far_open and town_knobs.smith_open are all above nothing.';

-- Whether the smith is open to a member, by their id: for whoever is not the asker (a rock is paid to whoever struck
-- it first, who may be another than the one who broke it).
create or replace function town.smith_for(p_who uuid)
returns boolean language sql stable set search_path = public
as $$
  select coalesce((select pr.is_admin from public.profiles pr where pr.id = p_who), false)
      or (coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) > 0 and town.is_member(p_who))
$$;

-- ─── 3. What is kept ─────────────────────────────────────────────────────

-- What a member has at the smith. Gone with the member. No browser reads or writes it: the functions below do.
create table if not exists public.town_smiths (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  doc        jsonb not null default '{}'::jsonb check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.town_smiths enable row level security;
revoke all on table public.town_smiths from anon, authenticated;

-- The village's board at the smith: lib/town/forge's newBoard().
insert into public.town_things (key, doc) values ('smith', '{"tops": {}, "found": {}}'::jsonb) on conflict (key) do nothing;

-- The forge's great fire, the village's one: a table of one row. (Its document is read by the rules alone: see the head.)
create table if not exists public.town_great_fire (
  one        boolean primary key default true check (one),
  doc        jsonb not null default '{}'::jsonb check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.town_great_fire enable row level security;
revoke all on table public.town_great_fire from anon, authenticated;

insert into public.town_great_fire (one) values (true) on conflict (one) do nothing;

-- ─── 4a. The table (lib/town/forge) ──────────────────────────────────────

-- tryCost: what a try for a level takes of a kind of tool. Null past the top.
create or replace function town.try_cost(p_kind text, p_to integer)
returns jsonb language sql stable
as $$
  select case when f.k->'wooden' ? p_kind
      then jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', ceil((t.v->>'n')::numeric / 2), 'timber', (t.v->>'timber')::numeric * 2)
      else jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', t.v->'n', 'timber', t.v->'timber') end
    from (select town.cat('forge') as k) f, jsonb_array_elements(f.k->'tries') t(v)
   where (t.v->>'to')::numeric = p_to limit 1
$$;

-- tryOdds: how a try for a level may go, in hundredths: null past the top.
create or replace function town.try_odds(p_to integer)
returns jsonb language sql stable
as $$
  select jsonb_build_object('take', t.v->'take', 'stay', t.v->'stay', 'down', t.v->'down')
    from jsonb_array_elements(town.cat('forge')->'tries') t(v) where (t.v->>'to')::numeric = p_to limit 1
$$;

-- outcomeOf: how a try for a level goes, from a number of chance (nothing up to one).
create or replace function town.outcome_of(p_to integer, p_r double precision)
returns text language sql stable
as $$
  select coalesce((
    select case when x.x < (t.o->>'take')::double precision then 'taken'
                when x.x < (t.o->>'take')::double precision + (t.o->>'stay')::double precision then 'stays' else 'down' end
      from (select town.try_odds(p_to) as o) t, (select greatest(0::double precision, least(0.999999::double precision, p_r)) * 100 as x) x
     where t.o is not null), 'stays')
$$;

-- ─── 4b. What a member has at the smith, made sound ──────────────────────

-- newSmithy.
create or replace function town.smithy_new()
returns jsonb language sql immutable
as $$ select '{"queue": [], "more": 0, "ember": 0, "pending": null}'::jsonb $$;

-- soundSmithy: a smithy made sound, whatever was kept: only pieces that are smelted, in order of their ends, each
-- with the presses it has had within their bound; a draw only if it is one; counts within their bounds.
create or replace function town.smithy_sound(p_kept jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  p jsonb := k->'pending';
  each_ numeric := (f->'smith'->'bellows'->>'each')::numeric;
  queue jsonb;
  pending jsonb := 'null'::jsonb;
begin
  queue := coalesce((select jsonb_agg(jsonb_build_object('piece', q.v->'piece', 'from', q.v->'from', 'till', q.v->'till')
        || case when jsonb_typeof(q.v->'blown') = 'number' and greatest(0, least(each_, floor((q.v->>'blown')::numeric))) > 0
                then jsonb_build_object('blown', greatest(0, least(each_, floor((q.v->>'blown')::numeric)))) else '{}'::jsonb end
        order by (q.v->>'till')::numeric, q.ord)
    from jsonb_array_elements(case when jsonb_typeof(k->'queue') = 'array' then k->'queue' else '[]'::jsonb end) with ordinality q(v, ord)
   where case when jsonb_typeof(q.v) = 'object' and jsonb_typeof(q.v->'piece') = 'string' and jsonb_typeof(q.v->'from') = 'number' and jsonb_typeof(q.v->'till') = 'number'
              then f->'smelts'->'of' ? (q.v->>'piece') and (q.v->>'till')::numeric >= (q.v->>'from')::numeric else false end), '[]'::jsonb);
  if jsonb_typeof(p) = 'object' and jsonb_typeof(p->'item') = 'string' and town.tool_kind(p->>'item') is not null and jsonb_typeof(p->'at') = 'number' and jsonb_typeof(p->'offer') = 'array' then
    if (p->>'at')::numeric = floor((p->>'at')::numeric) and (p->>'at')::numeric >= 0 and (p->>'at')::numeric < jsonb_array_length(f->'forge'->'milestones')
       and not exists (select 1 from jsonb_array_elements(p->'offer') o where jsonb_typeof(o) <> 'string') then
      pending := jsonb_build_object('item', p->'item', 'at', p->'at', 'offer', p->'offer')
        || case when jsonb_typeof(p->'old') = 'string' then jsonb_build_object('old', p->'old') else '{}'::jsonb end;
    end if;
  end if;
  return jsonb_build_object('queue', queue, 'pending', pending,
    'more', case when jsonb_typeof(k->'more') = 'number' then greatest(0, least(jsonb_array_length(f->'smith'->'more'), floor((k->>'more')::numeric))) else 0 end,
    'ember', case when jsonb_typeof(k->'ember') = 'number' then greatest(0, floor((k->>'ember')::numeric)) else 0 end);
end;
$$;

-- ─── 4c. Smelting ────────────────────────────────────────────────────────

-- placesOf: how many places a member's queue has.
create or replace function town.smith_places(p_smithy jsonb)
returns integer language sql stable
as $$
  select ((k.s->>'places')::numeric + (k.s->>'wider')::numeric * greatest(0, least(jsonb_array_length(k.s->'more'), coalesce((p_smithy->>'more')::numeric, 0))))::integer
    from (select town.cat('forge')->'smith' as s) k
$$;

-- smithView: the queue at a moment: the pieces that are done and wait to be taken, the one smelting, those waiting
-- their turn; and how many places are free (a piece that is done takes none).
create or replace function town.smith_view(p_smithy jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  with q as (select e.v, e.ord, (e.v->>'till')::numeric <= p_now as done from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)),
       cur as (select min(q.ord) as ord from q where not q.done and (q.v->>'from')::numeric <= p_now),
       places as (select town.smith_places(p_smithy) as n)
  select jsonb_build_object(
    'done', coalesce((select jsonb_agg(q.v order by q.ord) from q where q.done), '[]'::jsonb),
    'now', coalesce((select q.v from q, cur where q.ord = cur.ord), 'null'::jsonb),
    'waiting', coalesce((select jsonb_agg(q.v order by q.ord) from q, cur where not q.done and q.ord is distinct from cur.ord), '[]'::jsonb),
    'places', (select n from places),
    'free', greatest(0, (select n from places) - (select count(*) from q where not q.done)))
$$;

-- dryOf (the number is the option's own, read off the registry).
create or replace function town.smith_dry(p_bag jsonb)
returns integer language sql stable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_bag) s where town.tool_has(s, 'axDry'))
    then (town.cat('forge')->'options'->'of'->'axDry'->'n'->>'pieces')::integer else 1 end
$$;

-- timberFor: how much fine timber so many pieces take now: so much a piece, less what a timber already burned still smelts.
create or replace function town.smith_timber(p_smithy jsonb, p_n integer, p_dry integer)
returns jsonb language plpgsql stable
as $$
declare
  each_ numeric := (town.cat('forge')->'smelting'->>'timber')::numeric;
  ember numeric := (p_smithy->>'ember')::numeric;
  timber numeric := 0;
  i integer;
begin
  for i in 1..p_n loop
    if ember > 0 then ember := ember - 1; continue; end if;
    timber := timber + each_;
    ember := greatest(0, p_dry - 1);
  end loop;
  return jsonb_build_object('timber', timber, 'ember', ember);
end;
$$;

-- smelt: so many pieces of one kind put in to smelt: they are paid for now (from the bag, then a pouch) and join the
-- end of the queue.
create or replace function town.smelt(p_purse jsonb, p_smithy jsonb, p_piece text, p_n numeric, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  rule jsonb := f->'smelts'->'of'->p_piece;
  queue jsonb := p_smithy->'queue';
  fragments numeric;
  burn jsonb;
  fee_ numeric;
  spent jsonb;
  from_ numeric;
  till_ numeric;
  i integer;
begin
  if rule is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n <= 0 then return town.no('amount'); end if;
  if (town.smith_view(p_smithy, p_now)->>'free')::numeric < p_n then return town.no('places'); end if;
  fragments := (f->'smelting'->>'fragments')::numeric * p_n;
  if town.held_in(p_purse, rule->>'of') < fragments then return town.no('ore'); end if;
  burn := town.smith_timber(p_smithy, p_n::integer, town.smith_dry(p_purse->'bag'));
  if town.held_in(p_purse, 'timber') < (burn->>'timber')::numeric then return town.no('timber'); end if;
  fee_ := (rule->>'fee')::numeric * p_n;
  if (p_purse->>'coins')::numeric < fee_ then return town.no('coins'); end if;
  spent := town.take_out(p_purse, rule->>'of', fragments::integer);
  if (burn->>'timber')::numeric > 0 then spent := town.take_out(spent, 'timber', (burn->>'timber')::integer); end if;
  from_ := greatest(p_now::numeric, coalesce((select max((q->>'till')::numeric) from jsonb_array_elements(queue) q), p_now::numeric));
  for i in 1..p_n::integer loop
    till_ := from_ + (rule->>'mins')::numeric * 60000;
    queue := queue || jsonb_build_array(jsonb_build_object('piece', p_piece, 'from', from_, 'till', till_));
    from_ := till_;
  end loop;
  return jsonb_build_object('ok', true, 'timber', burn->'timber', 'fee', fee_,
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - fee_),
    'smithy', p_smithy || jsonb_build_object('queue', queue, 'ember', burn->'ember'));
end;
$$;

-- collect: what is done taken: as much of it as there is room for (in a pouch that holds it, then the bag); the rest
-- goes on waiting.
create or replace function town.smith_collect(p_purse jsonb, p_smithy jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := p_purse;
  got jsonb := '[]'::jsonb;
  left_ jsonb := '[]'::jsonb;
  q jsonb;
  piece text;
  done_ integer := 0;
begin
  for q in select e.v from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric <= p_now order by e.ord loop
    done_ := done_ + 1;
    piece := q->>'piece';
    if town.room_in(mine, piece) < 1 then left_ := left_ || jsonb_build_array(q); continue; end if;
    mine := town.stow_away(mine, piece, 1);
    if exists (select 1 from jsonb_array_elements(got) g where g->>0 = piece) then
      got := (select jsonb_agg(case when g.v->>0 = piece then jsonb_build_array(piece, (g.v->>1)::integer + 1) else g.v end order by g.ord) from jsonb_array_elements(got) with ordinality g(v, ord));
    else
      got := got || jsonb_build_array(jsonb_build_array(piece, 1));
    end if;
  end loop;
  if done_ = 0 then return town.no('none'); end if;
  if jsonb_array_length(got) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'got', got, 'purse', mine,
    'smithy', p_smithy || jsonb_build_object('queue', left_
      || coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric > p_now), '[]'::jsonb)));
end;
$$;

-- bellowsLeft: how many presses of the bellows the piece smelting now may still take, whoever presses: none, with
-- nothing smelting.
create or replace function town.bellows_left(p_smithy jsonb, p_now bigint)
returns integer language sql stable
as $$
  select case when v.cur = 'null'::jsonb then 0
    else greatest(0, (town.cat('forge')->'smith'->'bellows'->>'each')::numeric - coalesce((v.cur->>'blown')::numeric, 0))::integer end
    from (select town.smith_view(p_smithy, p_now)->'now' as cur) v
$$;

-- bellowsOff: what one press takes off a piece, in milliseconds: its share of the time a piece of its kind smelts
-- (rounded as the code rounds: a half goes up).
create or replace function town.bellows_off(p_piece text)
returns numeric language sql stable
as $$
  select floor(coalesce((f.k->'smelts'->'of'->p_piece->>'mins')::double precision, 0) * 60000 * (f.k->'smith'->'bellows'->>'share')::double precision + 0.5)::numeric
    from (select town.cat('forge') as k) f
$$;

-- bellows: a press of the bellows of somebody's queue: its share off the piece smelting now (never past its end), as
-- much off everything behind it, and the press counted on the piece. Never one's own.
create or replace function town.bellows(p_smithy jsonb, p_owner text, p_by text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  each_ integer := (town.cat('forge')->'smith'->'bellows'->>'each')::integer;
  cur integer;
  piece jsonb;
  off_ numeric;
begin
  if p_by = p_owner then return town.no('self'); end if;
  select min(e.ord)::integer into cur from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)
   where (e.v->>'till')::numeric > p_now and (e.v->>'from')::numeric <= p_now;
  if cur is null then return town.no('idle'); end if;
  piece := p_smithy->'queue'->(cur - 1);
  if coalesce((piece->>'blown')::numeric, 0) >= each_ then return town.no('tired'); end if;
  off_ := least(town.bellows_off(piece->>'piece'), (piece->>'till')::numeric - p_now);
  -- (the piece smelting ends sooner; whatever waits behind it begins and ends as much sooner)
  return jsonb_build_object('ok', true, 'off', off_, 'smithy', p_smithy || jsonb_build_object(
    'queue', (select jsonb_agg(case when (e.v->>'till')::numeric <= p_now then e.v
                                    when e.ord = cur then e.v || jsonb_build_object('till', (e.v->>'till')::numeric - off_, 'blown', coalesce((e.v->>'blown')::numeric, 0) + 1)
                                    else e.v || jsonb_build_object('from', (e.v->>'from')::numeric - off_, 'till', (e.v->>'till')::numeric - off_) end order by e.ord)
                from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord))));
end;
$$;

-- widen: the queue made wider: so many places more, for fine timber and coins. As wide as it gets after the last.
create or replace function town.smith_widen(p_purse jsonb, p_smithy jsonb)
returns jsonb language plpgsql stable
as $$
declare
  more_ integer := (p_smithy->>'more')::integer;
  cost_ jsonb := case when more_ >= 0 then town.cat('forge')->'smith'->'more'->more_ end;
begin
  if cost_ is null then return town.no('top'); end if;
  if town.held_in(p_purse, 'timber') < (cost_->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost_->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true,
    'purse', town.take_out(p_purse, 'timber', (cost_->>'timber')::integer) || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost_->>'coins')::numeric),
    'smithy', p_smithy || jsonb_build_object('more', more_ + 1));
end;
$$;

-- ─── 4d. A forging try ───────────────────────────────────────────────────

-- drawable: the options of a pool that may be drawn for a kind of tool now: in the registry's order, those of the
-- pool, for the kind, that are built.
create or replace function town.forge_drawable(p_kind text, p_pool integer)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(o.id order by o.ord), '[]'::jsonb)
    from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'options'->'order') with ordinality o(id, ord)
   where (f.k->'options'->'of'->o.id->>'pool')::integer = p_pool and f.k->'options'->'of'->o.id->'tools' ? p_kind and f.k->'built'->p_kind->'opts' ? o.id
$$;

-- settable: whether a gem of an element may be set in a kind of tool now.
create or replace function town.forge_settable(p_kind text, p_element text)
returns boolean language sql stable
as $$ select coalesce(town.cat('forge')->'built'->p_kind->'gems' ? p_element, false) $$;

-- withState: a stack with its own state written as it is kept: nothing kept that says nothing. The options to the
-- last there is, a milestone with none before it as an empty word.
create or replace function town.tool_with(p_stack jsonb, p_plus integer, p_opts jsonb, p_gems jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  last_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.v <> 'null'::jsonb);
  s jsonb := p_stack - 'plus' - 'opts' - 'gems';
begin
  if p_plus > 0 then s := s || jsonb_build_object('plus', p_plus); end if;
  if last_ is not null then
    s := s || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.ord <= last_));
  end if;
  if jsonb_array_length(p_gems) > 0 then s := s || jsonb_build_object('gems', p_gems); end if;
  return s;
end;
$$;

-- withMaker: a tool with its maker written at a milestone: only where nobody is written there yet, and only a name
-- that is one.
create or replace function town.tool_with_maker(p_stack jsonb, p_at integer, p_by text)
returns jsonb language plpgsql stable
as $$
declare
  name_ text := town.maker_name(to_jsonb(p_by));
  had jsonb := town.tool_makers(p_stack);
  makers jsonb;
  last_ integer;
begin
  if coalesce(name_, '') = '' or p_at is null or p_at < 0 or p_at >= jsonb_array_length(had) or coalesce(had->p_at, 'null'::jsonb) <> 'null'::jsonb then return p_stack; end if;
  makers := (select jsonb_agg(case when m.ord - 1 = p_at then to_jsonb(name_) when m.v = 'null'::jsonb then '""'::jsonb else m.v end order by m.ord)
               from jsonb_array_elements(had) with ordinality m(v, ord));
  last_ := (select max(m.ord)::integer from jsonb_array_elements(makers) with ordinality m(v, ord) where m.v <> '""'::jsonb);
  return p_stack || jsonb_build_object('makers', (select jsonb_agg(m.v order by m.ord) from jsonb_array_elements(makers) with ordinality m(v, ord) where m.ord <= last_));
end;
$$;

-- candidates: the options a draw for a milestone may lay out for a tool: those of the milestone's pool that are
-- built, less every one the tool has. None, for a forging that is away from home.
create or replace function town.forge_candidates(p_stack jsonb, p_at integer)
returns jsonb language sql stable
as $$
  select case when k.kind is null or k.pool is null or town.tool_away(p_stack) then '[]'::jsonb
    else coalesce((select jsonb_agg(d.id order by d.ord) from jsonb_array_elements_text(town.forge_drawable(k.kind, k.pool)) with ordinality d(id, ord)
                    where not town.tool_drawn(p_stack) ? d.id), '[]'::jsonb) end
    from (select town.tool_kind(p_stack->>'item') as kind, case when p_at >= 0 then (town.cat('forge')->'forge'->'pools'->>p_at)::integer end as pool) k
$$;

-- owedOf: the milestone a tool is owed a draw at: the first its level has reached that has no option yet and
-- something to draw. -1 when it is owed none, and for a forging that is away from home.
create or replace function town.forge_owed(p_stack jsonb)
returns integer language sql stable
as $$
  select case when town.tool_away(p_stack) then -1 else
    coalesce((select (m.ord - 1)::integer from jsonb_array_elements(town.cat('forge')->'forge'->'milestones') with ordinality m(v, ord)
      where town.tool_level(p_stack) >= (m.v #>> '{}')::integer and town.tool_drawn(p_stack)->((m.ord - 1)::integer) = 'null'::jsonb
        and jsonb_array_length(town.forge_candidates(p_stack, (m.ord - 1)::integer)) > 0
      order by m.ord limit 1), -1) end
$$;

-- forgeTry: a try at the tool in a slot of the bag. Its materials (from the bag, then a pouch) and its fee are spent,
-- taken or not. `p_r` is the number of chance whoever keeps the game drew (the function a member calls draws it: no
-- browser sends one). A failure leaves the level or lowers it by one, as the table says, and never under the floor;
-- the tool is never lost. `p_by`: what whoever forges is called: written on the tool at a milestone it is taken to,
-- where nobody is written yet.
create or replace function town.forge_try(p_purse jsonb, p_slot integer, p_r double precision, p_by text default '')
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge')->'forge';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  from_ integer;
  cost_ jsonb;
  out_ text;
  level_ integer;
  spent jsonb;
  raised jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  -- (a forging that sits in a kind of tool of another pool is moved back first)
  if town.tool_away(stack) then return town.no('foreign'); end if;
  from_ := town.tool_level(stack);
  if from_ >= (f->>'top')::integer then return town.no('top'); end if;
  -- (a draw the tool is owed is chosen before it is forged further)
  if town.forge_owed(stack) >= 0 then return town.no('owed'); end if;
  cost_ := town.try_cost(kind_, from_ + 1);
  if town.held_in(p_purse, cost_->>'ore') < (cost_->>'n')::numeric then return town.no('ore'); end if;
  if town.held_in(p_purse, 'timber') < (cost_->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost_->>'fee')::numeric then return town.no('coins'); end if;
  out_ := town.outcome_of(from_ + 1, p_r);
  level_ := case out_ when 'taken' then from_ + 1 when 'down' then greatest(least(from_, (f->>'floor')::integer), from_ - 1) else from_ end;
  spent := town.take_out(town.take_out(p_purse, cost_->>'ore', (cost_->>'n')::integer), 'timber', (cost_->>'timber')::integer);
  -- (the tool stays in its slot: taking its materials never moves it, for a tool is no ore and no timber)
  raised := town.tool_with(coalesce(nullif(spent->'bag'->p_slot, 'null'::jsonb), stack), level_, town.tool_drawn(stack), town.tool_gems(stack));
  if out_ = 'taken' then
    raised := town.tool_with_maker(raised,
      coalesce((select (m.ord - 1)::integer from jsonb_array_elements(f->'milestones') with ordinality m(v, ord) where (m.v #>> '{}')::integer = level_ order by m.ord limit 1), -1), p_by);
  end if;
  return jsonb_build_object('ok', true, 'out', out_, 'from', from_, 'level', level_, 'item', kind_, 'owed', town.forge_owed(raised),
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost_->>'fee')::numeric, 'bag', jsonb_set(spent->'bag', array[p_slot::text], raised)));
end;
$$;

-- ─── 4e. The options ─────────────────────────────────────────────────────

-- pickOffer: two (or as many as there are) of some options, by two numbers of chance: never the same one twice.
create or replace function town.pick_offer(p_from jsonb, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  n integer := (town.cat('forge')->'smith'->>'offer')::integer;
  left_ jsonb := p_from;
  out_ jsonb := '[]'::jsonb;
  r double precision;
  i integer;
  k integer := 0;
begin
  foreach r in array array[p_r1, p_r2] loop
    k := k + 1;
    exit when k > n or jsonb_array_length(left_) = 0;
    i := least(jsonb_array_length(left_) - 1, floor(greatest(0::double precision, least(0.999999::double precision, r)) * jsonb_array_length(left_))::integer);
    out_ := out_ || jsonb_build_array(left_->i);
    left_ := left_ - i;
  end loop;
  return out_;
end;
$$;

-- Whether a stack is the tool a waiting draw is for: of its kind, not away from home, and (of a draw made again) with
-- the option the draw was made over, whatever its level; or (of a draw that is owed) at its milestone or past it with
-- no option there.
create or replace function town.pending_fits(p_stack jsonb, p_pending jsonb)
returns boolean language sql stable
as $$
  select coalesce(p_stack is not null and p_stack <> 'null'::jsonb and town.tool_kind(p_stack->>'item') = p_pending->>'item' and not town.tool_away(p_stack)
    and case when coalesce(p_pending->>'old', '') <> '' then town.tool_drawn(p_stack)->>((p_pending->>'at')::integer) = p_pending->>'old'
             else town.tool_level(p_stack) >= (town.cat('forge')->'forge'->'milestones'->>((p_pending->>'at')::integer))::integer
                  and town.tool_drawn(p_stack)->((p_pending->>'at')::integer) = 'null'::jsonb end, false)
$$;

-- pendingSlot: the slot of the tool a waiting draw is for: the one said, if it fits; or else the first in the bag
-- that does. -1 when no tool in the bag fits it.
create or replace function town.pending_slot(p_purse jsonb, p_pending jsonb, p_slot integer)
returns integer language sql stable
as $$
  select case when p_pending is null or p_pending = 'null'::jsonb then -1
    when p_slot >= 0 and town.pending_fits(p_purse->'bag'->p_slot, p_pending) then p_slot
    else coalesce((select (b.ord - 1)::integer from jsonb_array_elements(p_purse->'bag') with ordinality b(v, ord) where town.pending_fits(b.v, p_pending) order by b.ord limit 1), -1) end
$$;

-- draw: the draw a tool is owed laid out: two options of its milestone's pool. One draw waits at a time, and a draw
-- that waits is the one laid out again, whatever chance is given: it is not drawn anew by going away and coming back.
create or replace function town.forge_draw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  waits integer := town.pending_slot(p_purse, waiting, p_slot);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  at_ integer;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and waits >= 0 then
    if waits is not distinct from p_slot then return jsonb_build_object('ok', true, 'smithy', p_smithy, 'pending', waiting, 'slot', p_slot, 'fresh', false); end if;
    return town.no('owed');
  end if;
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if town.tool_away(stack) then return town.no('foreign'); end if;
  at_ := town.forge_owed(stack);
  if at_ < 0 then return town.no('none'); end if;
  pending := jsonb_build_object('item', kind_, 'at', at_, 'offer', town.pick_offer(town.forge_candidates(stack, at_), p_r1, p_r2));
  return jsonb_build_object('ok', true, 'smithy', p_smithy || jsonb_build_object('pending', pending), 'pending', pending, 'slot', p_slot, 'fresh', true);
end;
$$;

-- redraw: the option of a milestone drawn again, for a gem of any element (from the bag, then a pouch) and a fee: two
-- are laid out, and the old one may be kept. Of any option the tool has, whatever its level has fallen to.
create or replace function town.forge_redraw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_at integer, p_gem text, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  old_ text;
  from_ jsonb;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_slot) >= 0 then return town.no('owed'); end if;
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if town.tool_away(stack) then return town.no('foreign'); end if;
  old_ := case when p_at >= 0 then town.tool_drawn(stack)->>p_at end;
  if old_ is null then return town.no('none'); end if;
  if town.gem_element(p_gem) is null or town.held_in(p_purse, p_gem) < (f->'smith'->'redraw'->>'gems')::numeric then return town.no('gem'); end if;
  if (p_purse->>'coins')::numeric < (f->'smith'->'redraw'->>'fee')::numeric then return town.no('coins'); end if;
  from_ := town.forge_candidates(stack, p_at);
  if jsonb_array_length(from_) = 0 then return town.no('unbuilt'); end if;
  pending := jsonb_build_object('item', kind_, 'at', p_at, 'offer', town.pick_offer(from_, p_r1, p_r2), 'old', old_);
  return jsonb_build_object('ok', true, 'pending', pending, 'smithy', p_smithy || jsonb_build_object('pending', pending),
    'purse', town.take_out(p_purse, p_gem, (f->'smith'->'redraw'->>'gems')::integer) || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (f->'smith'->'redraw'->>'fee')::numeric));
end;
$$;

-- choose: one of the options laid out chosen (or, of a draw made again, the old one kept): it is the tool's from
-- then on. (A slot that is none is no tool's: the code has no answer there, lib/town/db-vectors-smith.test.ts says where.)
create or replace function town.forge_choose(p_purse jsonb, p_smithy jsonb, p_slot integer, p_pick text)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb;
  kept boolean;
  opts jsonb;
begin
  if p = 'null'::jsonb then return town.no('none'); end if;
  if p_slot is null or p_slot < 0 or town.pending_slot(p_purse, p, p_slot) <> p_slot then return town.no('tool'); end if;
  kept := coalesce(p->>'old', '') <> '' and p_pick is not distinct from p->>'old';
  if not kept and not coalesce(p->'offer' ? p_pick, false) then return town.no('none'); end if;
  stack := p_purse->'bag'->p_slot;
  opts := jsonb_set(town.tool_drawn(stack), array[p->>'at'], to_jsonb(p_pick));
  return jsonb_build_object('ok', true, 'item', p->'item', 'at', p->'at', 'opt', p_pick, 'kept', kept,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], town.tool_with(stack, town.tool_level(stack), opts, town.tool_gems(stack)))),
    'smithy', p_smithy || '{"pending": null}'::jsonb);
end;
$$;

-- ─── 4f. A gem ───────────────────────────────────────────────────────────

-- setGem: a gem set into the tool in a slot: a gem, its mount (bag and pouches together) and a fee. It always takes;
-- a gem already there is gone. Too little of the mount is said by the mount's own word (fine timber's, or the ore's).
create or replace function town.gem_set(p_purse jsonb, p_slot integer, p_gem text)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('forge')->'smith'->'gem';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  element_ text := town.gem_element(p_gem);
  over_ text;
  spent jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if element_ is null or town.held_in(p_purse, p_gem) < 1 then return town.no('gem'); end if;
  if not town.forge_settable(kind_, element_) then return town.no('unbuilt'); end if;
  over_ := town.tool_gems(stack)->>0;
  if over_ = element_ then return town.no('same'); end if;
  if town.held_in(p_purse, k->>'mount') < (k->>'mounts')::numeric then return town.no(case when k->>'mount' = 'timber' then 'timber' else 'ore' end); end if;
  if (p_purse->>'coins')::numeric < (k->>'fee')::numeric then return town.no('coins'); end if;
  spent := town.take_out(town.take_out(p_purse, p_gem, 1), k->>'mount', (k->>'mounts')::integer);
  return jsonb_build_object('ok', true, 'item', kind_, 'element', element_, 'over', over_,
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (k->>'fee')::numeric,
      'bag', jsonb_set(spent->'bag', array[p_slot::text], town.tool_with(coalesce(nullif(spent->'bag'->p_slot, 'null'::jsonb), stack), town.tool_level(stack), town.tool_drawn(stack), jsonb_build_array(element_)))));
end;
$$;

-- ─── 4g. A move ──────────────────────────────────────────────────────────

-- canHolds (lib/town/farm): how many waterings a can holds when full, as the stack it is: its kind's, and what its
-- own forging adds. None, of what is no can. (Read here because a move cuts a can's water down to it; the farm's own
-- rules read a can by whatever the older tools' part gives them.)
create or replace function town.can_holds(p_stack jsonb)
returns double precision language sql stable
as $$
  select case when coalesce(c.cans ? (p_stack->>'item'), false) then (c.cans->>(p_stack->>'item'))::double precision
      + case when town.tool_kind(p_stack->>'item') = 'can' then
          (f.k->'levels'->'can'->'waterings'->>town.tool_level(p_stack))::double precision - (f.k->'levels'->'can'->'waterings'->>0)::double precision
          + town.gem_by(p_stack, 'fire', f.k->'old'->'fire'->'can'->'more')
          + case when town.tool_has(p_stack, 'cnDrop') then town.opt_n('cnDrop', 'more') else 0 end
        else 0 end
    else 0 end
    from (select town.cat('forge') as k) f, (select town.cat('farming')->'cans' as cans) c
$$;

-- forgingOf: what the smith put into a tool, all of it: its plus, the options it carries by their milestones, every
-- gem kept that is one, its makers' names, and the kind of tool those options were drawn for (null with no option).
create or replace function town.forging_of(p_stack jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object('plus', town.tool_level(p_stack), 'opts', d.opts,
    'gems', case when p_stack is not null and town.tool_kind(p_stack->>'item') is not null and jsonb_typeof(p_stack->'gems') = 'array'
      then coalesce((select jsonb_agg(g.v order by g.ord) from jsonb_array_elements(p_stack->'gems') with ordinality g(v, ord)
                      where jsonb_typeof(g.v) = 'string' and town.cat('forge')->'elements' ? (g.v #>> '{}')), '[]'::jsonb) else '[]'::jsonb end,
    'makers', town.tool_makers(p_stack),
    'origin', case when exists (select 1 from jsonb_array_elements(d.opts) o(v) where o.v <> 'null'::jsonb) then town.tool_origin(p_stack) end)
    from (select town.tool_drawn(p_stack) as opts) d
$$;

-- withForging: a tool with a forging in place of whatever it carried, written as it is kept. `origin` is kept only
-- where it says something. What the tool holds of its own stays, but a watering can's water is cut down to what the
-- can holds now: nobody gains water by a move.
create or replace function town.tool_with_forging(p_tool jsonb, p_f jsonb)
returns jsonb language plpgsql stable
as $$
declare
  kind_ text := town.tool_kind(p_tool->>'item');
  opt_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.v <> 'null'::jsonb and o.v <> '""'::jsonb);
  maker_ integer := (select max(m.ord)::integer from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.v <> 'null'::jsonb and m.v <> '""'::jsonb);
  next_ jsonb := p_tool - 'plus' - 'opts' - 'gems' - 'makers' - 'origin';
  holds double precision;
begin
  if (p_f->>'plus')::numeric > 0 then next_ := next_ || jsonb_build_object('plus', p_f->'plus'); end if;
  if opt_ is not null then
    next_ := next_ || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.ord <= opt_));
  end if;
  if jsonb_array_length(p_f->'gems') > 0 then next_ := next_ || jsonb_build_object('gems', p_f->'gems'); end if;
  if maker_ is not null then
    next_ := next_ || jsonb_build_object('makers', (select jsonb_agg(case when m.v = 'null'::jsonb then '""'::jsonb else m.v end order by m.ord)
      from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.ord <= maker_));
  end if;
  if kind_ is not null and p_f->>'origin' is not null and opt_ is not null and not town.same_pool(p_f->>'origin', kind_) then
    next_ := next_ || jsonb_build_object('origin', p_f->'origin');
  end if;
  if jsonb_typeof(next_->'water') = 'number' then
    holds := town.can_holds(next_);
    if holds > 0 then next_ := next_ || jsonb_build_object('water', greatest(0, least((next_->>'water')::numeric, holds::numeric))); end if;
  end if;
  return next_;
end;
$$;

-- stickerOf: what the tries up to a level ask in coins, all told (read from the owner's table, never written again).
create or replace function town.sticker_of(p_level numeric)
returns numeric language sql stable
as $$ select coalesce(sum((t.v->>'fee')::numeric) filter (where (t.v->>'to')::numeric <= p_level), 0) from jsonb_array_elements(town.cat('forge')->'tries') t(v) $$;

-- moveFeeAt: what a move costs in a line of so many kinds of tool, at the higher of the two tools' levels: its share
-- of that level's sticker price, shared by the kinds, rounded up; never less than the least.
create or replace function town.move_fee_at(p_kinds integer, p_level numeric)
returns integer language sql stable
as $$
  select greatest((m.v->>'least')::numeric,
      ceil(((m.v->>'share')::double precision * town.sticker_of(greatest(0, least((f.k->'forge'->>'top')::numeric, floor(p_level))))::double precision)
           / (100 * greatest(1, p_kinds))::double precision)::numeric)::integer
    from (select town.cat('forge') as k) f, lateral (select f.k->'smith'->'move' as v) m
$$;

-- moveFee: what moving between two tools costs: null of what are not two tools that are forged.
create or replace function town.move_fee(p_a jsonb, p_b jsonb)
returns integer language sql stable
as $$
  select case when k.a is not null and k.b is not null then town.move_fee_at(jsonb_array_length(town.line_kinds(k.a)), greatest(town.tool_level(p_a), town.tool_level(p_b))) end
    from (select town.tool_kind(p_a->>'item') as a, town.tool_kind(p_b->>'item') as b) k
$$;

-- running (lib/town/powers): the options a tool carries whose doing is going on now: begun, and not yet over.
create or replace function town.power_running(p_purse jsonb, p_tool jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(d.v order by d.ord), '[]'::jsonb)
    from (select town.cat('forge')->'timed' as timed) t, jsonb_array_elements(town.tool_drawn(p_tool)) with ordinality d(v, ord)
   where d.v <> 'null'::jsonb and t.timed ? (d.v #>> '{}')
     and case when jsonb_typeof(p_purse->(t.timed->>(d.v #>> '{}'))) = 'number' then (p_purse->>(t.timed->>(d.v #>> '{}')))::numeric > p_now else false end
$$;

-- bySmith (lib/town/world): whether somebody on a tile is by the forge: its middle within the forge's reach.
create or replace function town.by_smith(p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select coalesce(sqrt(d.dx * d.dx + d.dy * d.dy) <= (s.v->>'reach')::double precision, false)
    from (select town.cat('forge')->'stand' as v) s,
         lateral (select p_x + 0.5::double precision - (s.v->'at'->>0)::double precision as dx, p_y + 0.5::double precision - (s.v->'at'->>1)::double precision as dy) d
$$;

-- moveWhy: why two tools of a bag cannot trade what the smith put into them now, or null when they can. In the code's
-- order, and every one of them before a coin is taken.
create or replace function town.move_why(p_purse jsonb, p_smithy jsonb, p_from integer, p_to integer, p_near boolean, p_playing boolean, p_now bigint)
returns text language plpgsql stable
as $$
declare
  a jsonb := case when p_from is null or p_from < 0 then null else nullif(p_purse->'bag'->p_from, 'null'::jsonb) end;
  b jsonb := case when p_to is null or p_to < 0 then null else nullif(p_purse->'bag'->p_to, 'null'::jsonb) end;
  ka text := town.tool_kind(a->>'item');
  kb text := town.tool_kind(b->>'item');
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
begin
  if not coalesce(p_near, false) then return 'far'; end if;
  if p_from is not distinct from p_to then return 'twice'; end if;
  if a is null or b is null or ka is null or kb is null then return 'tool'; end if;
  if jsonb_array_length(town.line_kinds(ka)) < 2 then return 'alone'; end if;
  if town.line_kinds(ka) <> town.line_kinds(kb) or (town.cat('items')->(a->>'item')->'tier') is distinct from (town.cat('items')->(b->>'item')->'tier') then return 'line'; end if;
  if town.forging_of(a) = town.forging_of(b) then return 'nothing'; end if;
  if town.forge_owed(a) >= 0 or (waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_from) = p_from) then return 'owed'; end if;
  if town.forge_owed(b) >= 0 or (waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_to) = p_to) then return 'owed'; end if;
  if coalesce(p_playing, false) then return 'playing'; end if;
  if jsonb_array_length(town.power_running(p_purse, a, p_now)) > 0 or jsonb_array_length(town.power_running(p_purse, b, p_now)) > 0 then return 'running'; end if;
  if (p_purse->>'coins')::numeric < town.move_fee(a, b) then return 'coins'; end if;
  return null;
end;
$$;

-- moveForging: two tools of one line and one tier trade the whole of what the smith put into them. It always takes,
-- for coins only. The tools stay in their slots; no maker's name is written and nothing goes on the board.
create or replace function town.move_forging(p_purse jsonb, p_smithy jsonb, p_from integer, p_to integer, p_near boolean, p_playing boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  why_ text := town.move_why(p_purse, p_smithy, p_from, p_to, p_near, p_playing, p_now);
  a jsonb;
  b jsonb;
  na jsonb;
  nb jsonb;
  fee_ integer;
  water_ numeric[];
begin
  if why_ is not null then return town.no(why_); end if;
  a := p_purse->'bag'->p_from;
  b := p_purse->'bag'->p_to;
  fee_ := town.move_fee(a, b);
  na := town.tool_with_forging(a, town.forging_of(b));
  nb := town.tool_with_forging(b, town.forging_of(a));
  water_ := array[case when jsonb_typeof(a->'water') = 'number' then (a->>'water')::numeric else 0 end, case when jsonb_typeof(na->'water') = 'number' then (na->>'water')::numeric else 0 end,
                  case when jsonb_typeof(b->'water') = 'number' then (b->>'water')::numeric else 0 end, case when jsonb_typeof(nb->'water') = 'number' then (nb->>'water')::numeric else 0 end];
  return jsonb_build_object('ok', true, 'fee', fee_, 'a', town.tool_kind(a->>'item'), 'b', town.tool_kind(b->>'item'),
    'level', greatest(town.tool_level(a), town.tool_level(b)), 'spilt', greatest(0, water_[1] - water_[2]) + greatest(0, water_[3] - water_[4]),
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - fee_,
      'bag', jsonb_set(jsonb_set(p_purse->'bag', array[p_from::text], na), array[p_to::text], nb)));
end;
$$;

-- ─── 4h. The board ───────────────────────────────────────────────────────

-- markTop: the board with a tool at the top written on it: only the first of its kind is.
create or replace function town.board_top(p_board jsonb, p_kind text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'tops'->p_kind, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('tops', coalesce(p_board->'tops', '{}'::jsonb) || jsonb_build_object(p_kind, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- markFound: the board with an option found written on it: only its first finder is.
create or replace function town.board_found(p_board jsonb, p_opt text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'found'->p_opt, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('found', coalesce(p_board->'found', '{}'::jsonb) || jsonb_build_object(p_opt, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- The board as a document of the two lists, whatever is kept.
create or replace function town.board_sound(p_kept jsonb)
returns jsonb language sql immutable
as $$
  select jsonb_build_object('tops', case when jsonb_typeof(p_kept->'tops') = 'object' then p_kept->'tops' else '{}'::jsonb end,
                            'found', case when jsonb_typeof(p_kept->'found') = 'object' then p_kept->'found' else '{}'::jsonb end)
$$;

-- ─── 4i. The great fire (lib/town/great-fire) ────────────────────────────

-- newGreatFire: a village's first fire can be found at once.
create or replace function town.fire_new()
returns jsonb language sql immutable
as $$ select '{"due": 0, "flint": null, "tinder": null, "row": [], "topped": []}'::jsonb $$;

-- A finder as it is kept, made sound: somebody (an id), a name of forty characters at the most, and a moment.
create or replace function town.fire_finder(p_v jsonb, p_at jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'id') = 'string' and p_v->>'id' <> '' and jsonb_typeof(p_at) = 'number'
    then jsonb_build_object('id', p_v->'id', 'name', case when jsonb_typeof(p_v->'name') = 'string' then left(p_v->>'name', 40) else '' end, 'at', p_at)
    else 'null'::jsonb end
$$;

-- soundGreatFire: what was kept, made sound: nobody twice in the row, nobody in it who has taken the top, no more
-- names than the row holds. (A walk down the row, as the code walks it. It was timed on the stand-in beside one
-- statement over the row, in the language of SQL and inside this one, with rows of none, three, ten and sixty names:
-- the walk was the lightest of the three at every length. Every telling of the smith reads this.)
create or replace function town.fire_sound(p_kept jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  most_ integer := (town.cat('forge')->'fire'->>'row')::integer;
  topped jsonb := '[]'::jsonb;
  row_ jsonb := '[]'::jsonb;
  seen jsonb;
  w jsonb;
  f jsonb;
  t text;
begin
  for t in select e.v #>> '{}' from jsonb_array_elements(case when jsonb_typeof(k->'topped') = 'array' then k->'topped' else '[]'::jsonb end) with ordinality e(v, ord)
            where jsonb_typeof(e.v) = 'string' and e.v #>> '{}' <> '' order by e.ord loop
    if not topped ? t then topped := topped || jsonb_build_array(t); end if;
  end loop;
  seen := topped;
  for w in select e.v from jsonb_array_elements(case when jsonb_typeof(k->'row') = 'array' then k->'row' else '[]'::jsonb end) with ordinality e(v, ord) order by e.ord loop
    f := town.fire_finder(w, case when jsonb_typeof(w) = 'object' then w->'since' end);
    continue when f = 'null'::jsonb or seen ? (f->>'id') or jsonb_array_length(row_) >= most_;
    seen := seen || jsonb_build_array(f->'id');
    row_ := row_ || jsonb_build_array(jsonb_build_object('id', f->'id', 'name', f->'name', 'since', f->'at'));
  end loop;
  return jsonb_build_object('due', case when jsonb_typeof(k->'due') = 'number' then greatest(0, (k->>'due')::numeric) else 0 end,
    'flint', town.fire_finder(k->'flint', case when jsonb_typeof(k->'flint') = 'object' then k->'flint'->'at' end),
    'tinder', town.fire_finder(k->'tinder', case when jsonb_typeof(k->'tinder') = 'object' then k->'tinder'->'at' end),
    'row', row_, 'topped', topped);
end;
$$;

-- litAt: since when the fire is lit: both halves are in the village's keeping. Null while it is not.
create or replace function town.fire_lit_at(p_fire jsonb)
returns numeric language sql immutable
as $$
  select case when coalesce(p_fire->'flint', 'null'::jsonb) <> 'null'::jsonb and coalesce(p_fire->'tinder', 'null'::jsonb) <> 'null'::jsonb
    then greatest((p_fire->'flint'->>'at')::numeric, (p_fire->'tinder'->>'at')::numeric) end
$$;

-- openTo: how many of the row's first may use the fire at a moment: none while it is not lit, then one, and one more
-- with every turn's while that has gone by.
create or replace function town.fire_open_to(p_fire jsonb, p_now bigint)
returns integer language sql stable
as $$
  select case when l.lit is null or p_now < l.lit then 0
    else least(jsonb_array_length(p_fire->'row'), 1 + floor((p_now - l.lit) / (town.cat('forge')->'fire'->>'turn')::numeric))::integer end
    from (select town.fire_lit_at(p_fire) as lit) l
$$;

-- halfFound: if the fire's time has come and that half is not yet found, this is its finding, into the village's
-- keeping under the finder's name. `found` says whether it was; `lit`, whether that lit the fire.
create or replace function town.fire_half_found(p_fire jsonb, p_half text, p_id text, p_name text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  next_ jsonb;
begin
  if p_half not in ('flint', 'tinder') or p_now < (p_fire->>'due')::numeric or coalesce(p_fire->p_half, 'null'::jsonb) <> 'null'::jsonb then
    return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false);
  end if;
  next_ := p_fire || jsonb_build_object(p_half, jsonb_build_object('id', p_id, 'name', p_name, 'at', p_now));
  return jsonb_build_object('fire', next_, 'found', true, 'lit', town.fire_lit_at(next_) is not null);
end;
$$;

-- joinRow: a name put in the row: somebody who has never taken the top, and has a tool one level under it now.
create or replace function town.fire_join(p_fire jsonb, p_id text, p_name text, p_ready boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
begin
  if p_fire->'topped' ? p_id then return town.no('topped'); end if;
  if exists (select 1 from jsonb_array_elements(p_fire->'row') w(v) where w.v->>'id' = p_id) then return town.no('twice'); end if;
  if not coalesce(p_ready, false) then return town.no('level'); end if;
  if jsonb_array_length(p_fire->'row') >= (town.cat('forge')->'fire'->>'row')::integer then return town.no('places'); end if;
  return jsonb_build_object('ok', true, 'fire', p_fire || jsonb_build_object('row', p_fire->'row' || jsonb_build_array(jsonb_build_object('id', p_id, 'name', p_name, 'since', p_now))));
end;
$$;

-- leaveRow: one's name taken out of the row.
create or replace function town.fire_leave(p_fire jsonb, p_id text)
returns jsonb language sql stable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_fire->'row') w(v) where w.v->>'id' = p_id)
    then jsonb_build_object('ok', true, 'fire', p_fire || jsonb_build_object('row',
      coalesce((select jsonb_agg(w.v order by w.ord) from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' <> p_id), '[]'::jsonb)))
    else town.no('none') end
$$;

-- fireWhy: why a member may not try for the top now; null when they may.
create or replace function town.fire_why(p_fire jsonb, p_id text, p_now bigint)
returns text language plpgsql stable
as $$
declare
  at_ integer;
begin
  if town.fire_lit_at(p_fire) is null then return 'fire'; end if;
  at_ := (select (w.ord - 1)::integer from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' = p_id order by w.ord limit 1);
  if at_ is null then return case when p_fire->'topped' ? p_id then 'topped' else 'row' end; end if;
  return case when at_ < town.fire_open_to(p_fire, p_now) then null else 'turn' end;
end;
$$;

-- fireSpent: a try at the top was made with the fire: it is spent whatever came of it, and the halves of the next
-- can be found after a while drawn by `p_chance` (nothing to one; rounded as the code rounds). Taken: the member is
-- counted for good and leaves the row. Failed: to the row's end.
create or replace function town.fire_spent(p_fire jsonb, p_id text, p_name text, p_out text, p_now bigint, p_chance double precision)
returns jsonb language plpgsql stable
as $$
declare
  w jsonb := town.cat('forge')->'fire'->'wait';
  drawn numeric := floor((w->>'least')::double precision
    + greatest(0::double precision, least(1::double precision, p_chance)) * ((w->>'most')::double precision - (w->>'least')::double precision) + 0.5)::numeric;
  rest jsonb := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(p_fire->'row') with ordinality r(v, ord) where r.v->>'id' <> p_id), '[]'::jsonb);
begin
  return jsonb_build_object('due', p_now + drawn, 'flint', null, 'tinder', null,
    'row', case when p_out = 'taken' then rest else rest || jsonb_build_array(jsonb_build_object('id', p_id, 'name', p_name, 'since', p_now)) end,
    'topped', case when p_out = 'taken' and not (p_fire->'topped' ? p_id) then p_fire->'topped' || jsonb_build_array(p_id) else p_fire->'topped' end);
end;
$$;

-- fireTold: what a page is told of the fire, AND ALL IT IS TOLD: the halves found and by whom, whether it is lit, the
-- row with how many of its first may use it now, where I stand in it and whether I have taken the top. Never when the
-- next one comes.
create or replace function town.fire_told(p_fire jsonb, p_me text, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'flint', case when coalesce(p_fire->'flint', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('name', p_fire->'flint'->'name') end,
    'tinder', case when coalesce(p_fire->'tinder', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('name', p_fire->'tinder'->'name') end,
    'lit', town.fire_lit_at(p_fire) is not null,
    'row', coalesce((select jsonb_agg(jsonb_build_object('id', w.v->'id', 'name', w.v->'name') order by w.ord) from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord)), '[]'::jsonb),
    'open', town.fire_open_to(p_fire, p_now),
    'mine', coalesce((select (w.ord - 1)::integer from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' = p_me order by w.ord limit 1), -1),
    'topped', p_fire->'topped' ? p_me)
$$;

-- Whether a bag holds a tool that stands one level under the top: the row is for those who have one.
create or replace function town.forge_under_top(p_purse jsonb)
returns boolean language sql stable
as $$
  select exists (select 1 from jsonb_array_elements(p_purse->'bag') s(v)
                  where s.v <> 'null'::jsonb and town.tool_kind(s.v->>'item') is not null and town.tool_level(s.v) = (town.cat('forge')->'forge'->>'top')::integer - 1)
$$;

-- A try, with the great fire where the try is for the top (as whoever keeps the game does it: lib/town/trial's
-- `smithTry`). A tool one level under the top is tried only with the fire, asked before anything is taken; and a try
-- made with it spends it, whatever came of it. `p_chance`: the number the while before the next fire is drawn by.
-- Answers the try's own answer, with `spent` (whether the fire was) and `fire` (the fire as it is afterwards: FOR
-- WHOEVER KEEPS IT ALONE: no function a member calls passes it on).
create or replace function town.forge_try_fired(p_purse jsonb, p_fire jsonb, p_slot integer, p_r double precision, p_id text, p_name text, p_now bigint, p_chance double precision)
returns jsonb language plpgsql stable
as $$
declare
  held_ jsonb := case when p_slot is null or p_slot < 0 then null else nullif(p_purse->'bag'->p_slot, 'null'::jsonb) end;
  needs boolean := coalesce(town.tool_kind(held_->>'item') is not null and town.tool_level(held_) = (town.cat('forge')->'forge'->>'top')::integer - 1, false);
  why_ text;
  did jsonb;
begin
  if needs then
    why_ := town.fire_why(p_fire, p_id, p_now);
    if why_ is not null then return town.no(why_); end if;
  end if;
  did := town.forge_try(p_purse, p_slot, p_r, p_name);
  if not (did->>'ok')::boolean then return did; end if;
  return did || jsonb_build_object('spent', needs, 'fire', case when needs then town.fire_spent(p_fire, p_id, p_name, did->>'out', p_now, p_chance) else p_fire end);
end;
$$;

-- ─── What is kept, read and written ──────────────────────────────────────

-- A member's smithy as it is kept, made sound: a new one for whoever has nothing there (reading makes no row).
create or replace function town.smithy_read(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$ select town.smithy_sound((select s.doc from public.town_smiths s where s.member_id = p_member)) $$;

-- …and held, for a deed that is to write it: its row waits for whoever else is writing it. (A member's own deeds wait
-- for each other on the purse's row already; this is for the one deed that writes somebody else's smithy, the
-- bellows. Whoever has no row yet has nothing a friend could press: nothing is held, and nothing need be.)
create or replace function town.smithy_held(p_member uuid)
returns jsonb language plpgsql set search_path = public
as $$
declare
  kept jsonb;
begin
  select s.doc into kept from public.town_smiths s where s.member_id = p_member for update;
  return town.smithy_sound(kept);
end;
$$;

create or replace function town.keep_smithy(p_member uuid, p_smithy jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_smiths (member_id, doc, updated_at) values (p_member, p_smithy, now())
  on conflict (member_id) do update set doc = excluded.doc, updated_at = now()
$$;

-- The great fire as it is kept, made sound; with `p_hold` its row is held until the transaction ends.
create or replace function town.fire_kept(p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  kept jsonb;
begin
  if p_hold then select f.doc into kept from public.town_great_fire f where f.one for update;
  else select f.doc into kept from public.town_great_fire f where f.one; end if;
  return town.fire_sound(kept);
end;
$$;

create or replace function town.keep_fire(p_doc jsonb)
returns void language sql set search_path = public
as $$ update public.town_great_fire set doc = p_doc, updated_at = now() where one $$;

-- Whether a half of the great fire could be found at a moment by a member, or by another (the one a rock would be
-- paid to), as things stand, read without holding: its time has come, that half is not found yet, and the smith is
-- open to one of the two. What `public.town_fell` and `public.town_mine` ask before they take the fire's row, so that
-- the row is held only then: for a fortnight and more after a fire is spent no felling and no mining touches it.
-- ONE read of the one row, whoever asks (read off it as `town.fire_sound` reads these two, the row of names left
-- alone): this is asked by every felling and every mining call there is.
create or replace function town.fire_wants(p_half text, p_who uuid, p_now bigint, p_other uuid default null)
returns boolean language plpgsql stable set search_path = public
as $$
declare
  kept jsonb;
begin
  if (p_who is null and p_other is null) or p_half not in ('flint', 'tinder') then return false; end if;
  select f.doc into kept from public.town_great_fire f where f.one;
  if kept is null then return false; end if;
  if jsonb_typeof(kept->'due') = 'number' and p_now < (kept->>'due')::numeric then return false; end if;
  if town.fire_finder(kept->p_half, case when jsonb_typeof(kept->p_half) = 'object' then kept->p_half->'at' end) <> 'null'::jsonb then return false; end if;
  return coalesce(town.smith_for(p_who), false) or coalesce(town.smith_for(p_other), false);
end;
$$;

-- What a member is called, for a name on a tool, on the board and in the fire's keeping: as the site calls them that
-- day (never what a page says).
create or replace function town.smith_called(p_member uuid)
returns text language sql stable set search_path = public
as $$
  select coalesce((select nullif(coalesce(pr.character_name, pr.display_name, pr.discord_username, ''), '') from public.profiles pr where pr.id = p_member), p_member::text)
$$;

-- A half found, on the fire's row AS IT IS HELD (`p_fire`: what `town.fire_kept(true)` gave this call): kept under
-- the finder's name and written down, if its time has come, nobody has found it and the smith is open to the finder.
-- Answers `{"fire": {"half", "lit"}}` for the finder's own answer, or nothing.
create or replace function town.fire_find(p_fire jsonb, p_half text, p_finder uuid, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  did jsonb;
begin
  if p_fire is null or p_finder is null or not town.smith_for(p_finder) then return '{}'::jsonb; end if;
  did := town.fire_half_found(p_fire, p_half, p_finder::text, town.smith_called(p_finder), p_now);
  if not (did->>'found')::boolean then return '{}'::jsonb; end if;
  perform town.keep_fire(did->'fire');
  perform town.note(p_finder, 'fire_found', p_half, 1, 0, jsonb_build_object('lit', did->'lit'));
  return jsonb_build_object('fire', jsonb_build_object('half', p_half, 'lit', did->'lit'));
end;
$$;

-- What a member is told of the smith: what they have there, the village's board, and the great fire as a page may
-- know it (`town.fire_told`: never the fire's own document).
create or replace function town.smith_told(p_member uuid)
returns jsonb language sql set search_path = public
as $$
  select jsonb_build_object('smithy', town.smithy_read(p_member), 'board', town.board_sound(town.thing('smith', false)),
    'fire', town.fire_told(town.fire_kept(false), p_member::text, town.now_ms()))
$$;

-- A deed's answer at the smith: the rule's own, with the member's purse, this clock, and the smith as he now stands.
-- (A smithy the rule gave back is not sent as it is: what is told is what was kept. And the fire's own document is
-- never sent, whatever a rule gave back.)
create or replace function town.smith_answer(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$ select town.answer(p_member, p_did - 'smithy' - 'fire') || jsonb_build_object('smith', town.smith_told(p_member)) $$;

-- ─── 5a. Functions of earlier files, each with a block more ──────────────
-- (empty places: build-v164.mjs puts each function here as the database has it, with the lines of
-- v174.smith.lines.mjs in place. Left empty in this file on purpose: a pasted copy would undo whatever a file that
-- runs before v174 wrote into the same function.)

-- <public.town_fell>
-- </public.town_fell>

-- <public.town_mine>
-- </public.town_mine>

-- <town.work_counts_of>
-- </town.work_counts_of>

-- <town.deed_th>
-- </town.deed_th>

-- ─── 5b. What a member calls ─────────────────────────────────────────────

-- The smith looked at: my purse, this clock, what I have there, the board, and the great fire as a page may know it.
create or replace function public.town_smith()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
begin
  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms(), 'smith', town.smith_told(me));
end;
$$;

-- So many pieces of a kind put in to smelt.
create or replace function public.town_smith_smelt(p_piece text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  -- (my purse's row is held first, as by every deed of mine; then my smithy's, which a friend at the bellows writes too)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_piece is null or p_piece !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.smelt(purse, town.smithy_held(me), p_piece, p_n, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smelt', p_piece, p_n, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', did->'timber', 'till', did->'smithy'->'queue'->-1->'till'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- What is done taken: as much of it as there is room for.
create or replace function public.town_smith_take()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_collect(purse, town.smithy_held(me), now_);
  g jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    for g in select e.v from jsonb_array_elements(did->'got') with ordinality e(v, ord) order by e.ord loop
      perform town.note(me, 'smelted', g->>0, (g->>1)::numeric, 0, jsonb_build_object('waits', jsonb_array_length(town.smith_view(did->'smithy', now_)->'done')));
    end loop;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- The queue widened.
create or replace function public.town_smith_widen()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_widen(purse, town.smithy_held(me));
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smith_wider', null, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', town.held_in(purse, 'timber') - town.held_in(did->'purse', 'timber'), 'places', town.smith_places(did->'smithy')));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- Who of these members has a piece smelting now, each with how many presses of the bellows that piece may still take.
-- (A look, asked every few seconds while the smelting's leaf is open and somebody stands by: it brings no purse and
-- holds nothing.)
create or replace function public.town_smith_near(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  each_ numeric := (town.cat('forge')->'smith'->'bellows'->>'each')::numeric;
begin
  -- (`cardinality`, not the first dimension's length: a list of lists counts by all it holds)
  if p_ids is null or coalesce(cardinality(p_ids), 0) > 64 then return jsonb_build_object('now', now_, 'near', '[]'::jsonb); end if;
  -- (each queue is looked at once, and only a queue that has something in it; what a piece may still take is
  -- `town.bellows_left`'s own sum, of the piece already in hand)
  return jsonb_build_object('now', now_, 'near', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'piece', x.cur, 'left', greatest(0, each_ - coalesce((x.cur->>'blown')::numeric, 0))::integer) order by x.ord)
      from (select i.id, i.ord, town.smith_view(town.smithy_sound(k.doc), now_)->'now' as cur
              from (select distinct on (u.id) u.id, u.ord from unnest(p_ids) with ordinality u(id, ord) where u.id is not null and u.id <> me order by u.id, u.ord) i
              join public.town_smiths k on k.member_id = i.id
             where jsonb_typeof(k.doc->'queue') = 'array' and jsonb_array_length(k.doc->'queue') > 0
            offset 0) x
     where x.cur <> 'null'::jsonb), '[]'::jsonb));
end;
$$;

-- A press of the bellows of somebody else's queue. Only their smithy's row is held.
create or replace function public.town_smith_bellows(p_whose uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  theirs jsonb;
  did jsonb;
begin
  if p_whose is null then return town.smith_answer(me, town.no('idle')); end if;
  if p_whose = me then return town.smith_answer(me, town.no('self')); end if;
  -- (their smithy's row is held: they, or another friend, may be writing it at this moment)
  theirs := town.smithy_held(p_whose);
  did := town.bellows(theirs, p_whose::text, me::text, now_);
  if (did->>'ok')::boolean then
    perform town.keep_smithy(p_whose, did->'smithy');
    perform town.note(me, 'bellows', town.smith_view(theirs, now_)->'now'->>'piece', 1, 0,
      jsonb_build_object('whose', p_whose::text, 'off', did->'off', 'left', town.bellows_left(did->'smithy', now_)));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A try at the tool in a slot of my bag. Both numbers of chance are drawn here: how the try goes, and (of a try for
-- the top, which spends the great fire) the while before the halves of the next can be found. The second is written
-- nowhere but into the fire's own row.
create or replace function public.town_smith_try(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  called text := town.smith_called(me);
  -- (the village's rows first: the great fire's, then the board's; then my purse)
  fire_ jsonb := town.fire_kept(true);
  board jsonb := town.board_sound(town.thing('smith', true));
  purse jsonb := town.purse_of(me, true);
  r double precision := random();
  did jsonb := town.forge_try_fired(purse, fire_, p_slot, r, me::text, called, now_, random());
  cost_ jsonb;
  marked jsonb;
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_purse(me, did->'purse');
  if (did->>'spent')::boolean then perform town.keep_fire(did->'fire'); end if;
  cost_ := town.try_cost(did->>'item', (did->>'from')::integer + 1);
  -- (every try is written down, whatever came of it: what was tried for, how it went, the number it went by, what it took)
  perform town.note(me, 'forge', did->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
    jsonb_build_object('slot', p_slot, 'from', did->'from', 'to', (did->>'from')::integer + 1, 'out', did->'out', 'level', did->'level', 'r', r,
      'ore', cost_->'ore', 'ores', cost_->'n', 'timber', cost_->'timber')
    || case when (did->>'spent')::boolean then '{"fire": true}'::jsonb else '{}'::jsonb end);
  -- (and the first of a kind at the top goes on the board)
  if (did->>'level')::integer >= (town.cat('forge')->'forge'->>'top')::integer then
    marked := town.board_top(board, did->>'item', me::text, called, now_);
    if marked <> board then
      perform town.keep_thing('smith', marked);
      perform town.note(me, 'forge_first', did->>'item', 1, 0, '{"which": "tops"}'::jsonb);
    end if;
  end if;
  return town.smith_answer(me, jsonb_build_object('ok', true, 'out', did->'out', 'from', did->'from', 'level', did->'level', 'item', did->'item', 'owed', did->'owed', 'spent', did->'spent'));
end;
$$;

-- The draw a tool is owed, laid out: the two numbers of chance are drawn here, and count only for a draw that is new.
create or replace function public.town_smith_draw(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.forge_draw(purse, town.smithy_held(me), p_slot, random(), random());
begin
  if (did->>'ok')::boolean and (did->>'fresh')::boolean then
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_draw', did->'pending'->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'pending'->'at', 'offer', did->'pending'->'offer'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- One of the options laid out chosen, or the old one kept. The board's row is held first: an option chosen may be
-- the first of its kind found.
create or replace function public.town_smith_choose(p_slot integer, p_pick text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  board jsonb := town.board_sound(town.thing('smith', true));
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  marked jsonb;
begin
  if p_pick is null or p_pick !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.forge_choose(purse, town.smithy_held(me), p_slot, p_pick);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_choose', did->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'at', 'opt', did->'opt', 'kept', did->'kept'));
    marked := town.board_found(board, did->>'opt', me::text, town.smith_called(me), now_);
    if marked <> board then
      perform town.keep_thing('smith', marked);
      perform town.note(me, 'forge_first', did->>'opt', 1, 0, '{"which": "found"}'::jsonb);
    end if;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A milestone's option drawn again, for a gem and a fee.
create or replace function public.town_smith_redraw(p_slot integer, p_at integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.forge_redraw(purse, town.smithy_held(me), p_slot, p_at, p_gem, random(), random());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_redraw', did->'pending'->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'at', p_at, 'old', did->'pending'->'old', 'offer', did->'pending'->'offer', 'gem', p_gem));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A gem set in the tool in a slot of my bag.
create or replace function public.town_smith_gem(p_slot integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.gem_set(purse, p_slot, p_gem);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gem_set', p_gem, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'item', did->'item', 'element', did->'element', 'over', did->'over'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- Two tools of my bag trade what the smith put into them. The tile is the one the page says I stand on, held to the
-- forge's place; whether a game's board is open is the page's word. (My smithy is read, not held: see the head.)
create or replace function public.town_smith_move(p_from integer, p_to integer, p_x integer, p_y integer, p_playing boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.move_forging(purse, town.smithy_read(me), p_from, p_to, coalesce(town.by_smith(p_x, p_y), false), coalesce(p_playing, false), now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'forge_move', did->>'a', 1, -(did->>'fee')::numeric,
      jsonb_build_object('from', p_from, 'to', p_to, 'a', did->'a', 'b', did->'b', 'level', did->'level', 'spilt', did->'spilt'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- My name put in the row for the great fire. (Whether I have a tool one level under the top is read off my purse as
-- it stands: the purse is not held, for nothing of it is written.)
create or replace function public.town_fire_join()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  fire_ jsonb := town.fire_kept(true);
  did jsonb := town.fire_join(fire_, me::text, town.smith_called(me), town.forge_under_top(town.purse_of(me, false)), now_);
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_fire(did->'fire');
  perform town.note(me, 'fire_join', null, 1, 0, jsonb_build_object('place', jsonb_array_length(did->'fire'->'row')));
  return town.smith_answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- My name taken out of the row.
create or replace function public.town_fire_leave()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  fire_ jsonb := town.fire_kept(true);
  did jsonb := town.fire_leave(fire_, me::text);
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_fire(did->'fire');
  perform town.note(me, 'fire_leave', null, 1, 0, '{}'::jsonb);
  return town.smith_answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- A counted option of the tool in my hand used once (lib/town/powers' `usePower`), where its game is played on the
-- page and the page has to ask for the count. By the game's gate: see the head.
create or replace function public.town_tool_power(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_id is null or p_id !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.use_power(purse, town.hand_stack(purse), p_id, town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'power', p_id, 1, 0, jsonb_build_object('left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_smith_open() from public, anon;
grant execute on function public.town_smith_open() to authenticated;
revoke execute on function public.town_smith() from public, anon;
grant execute on function public.town_smith() to authenticated;
revoke execute on function public.town_smith_smelt(text, integer) from public, anon;
grant execute on function public.town_smith_smelt(text, integer) to authenticated;
revoke execute on function public.town_smith_take() from public, anon;
grant execute on function public.town_smith_take() to authenticated;
revoke execute on function public.town_smith_widen() from public, anon;
grant execute on function public.town_smith_widen() to authenticated;
revoke execute on function public.town_smith_near(uuid[]) from public, anon;
grant execute on function public.town_smith_near(uuid[]) to authenticated;
revoke execute on function public.town_smith_bellows(uuid) from public, anon;
grant execute on function public.town_smith_bellows(uuid) to authenticated;
revoke execute on function public.town_smith_try(integer) from public, anon;
grant execute on function public.town_smith_try(integer) to authenticated;
revoke execute on function public.town_smith_draw(integer) from public, anon;
grant execute on function public.town_smith_draw(integer) to authenticated;
revoke execute on function public.town_smith_choose(integer, text) from public, anon;
grant execute on function public.town_smith_choose(integer, text) to authenticated;
revoke execute on function public.town_smith_redraw(integer, integer, text) from public, anon;
grant execute on function public.town_smith_redraw(integer, integer, text) to authenticated;
revoke execute on function public.town_smith_gem(integer, text) from public, anon;
grant execute on function public.town_smith_gem(integer, text) to authenticated;
revoke execute on function public.town_smith_move(integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.town_smith_move(integer, integer, integer, integer, boolean) to authenticated;
revoke execute on function public.town_fire_join() from public, anon;
grant execute on function public.town_fire_join() to authenticated;
revoke execute on function public.town_fire_leave() from public, anon;
grant execute on function public.town_fire_leave() to authenticated;
revoke execute on function public.town_tool_power(text) from public, anon;
grant execute on function public.town_tool_power(text) to authenticated;

-- ─── Reading it (for whoever puts the file together: these go at its foot) ──
--
--   -- every try of the last day, by the level tried for: how many, and how they went beside the table's shares
--   select (d.doc->>'to')::int as tried_for, count(*) as tries,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'taken') / count(*), 1) as taken,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'stays') / count(*), 1) as stays,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'down') / count(*), 1) as down,
--          (select t->>'take' || ' / ' || (t->>'stay') || ' / ' || (t->>'down') from jsonb_array_elements(town.cat('forge')->'tries') t where t->>'to' = d.doc->>'to') as the_table,
--          -sum(d.coins) as coins_paid
--     from public.town_deeds d where d.what = 'forge' and d.at > now() - interval '1 day' group by d.doc->>'to' order by 1;
--
--   -- who has what at the smith: pieces done and waiting, smelting, how wide the queue is, a draw waiting
--   select p.character_name, jsonb_array_length(v.view->'done') as done, (v.view->'now'->>'piece') as smelting, jsonb_array_length(v.view->'waiting') as waiting,
--          v.view->>'places' as places, s.doc->'pending' as draw_waiting, s.updated_at
--     from public.town_smiths s join public.profiles p on p.id = s.member_id, lateral (select town.smith_view(town.smithy_sound(s.doc), town.now_ms()) as view) v
--    order by s.updated_at desc;
--
--   -- the board, and the great fire as a page is told it (its own row is the owner's to read: select doc from public.town_great_fire)
--   select town.board_sound(town.thing('smith', false)), town.fire_told(town.fire_kept(false), '', town.now_ms());
--
--   -- what the smith's deeds took out of the game, by the day and the deed
--   select date_trunc('day', d.at at time zone 'Asia/Bangkok') as day, d.what, count(*) as deeds, -sum(d.coins) as coins_gone
--     from public.town_deeds d where d.what in ('smelt', 'smith_wider', 'forge', 'forge_redraw', 'gem_set', 'forge_move') group by 1, 2 order by 1 desc, 2;
