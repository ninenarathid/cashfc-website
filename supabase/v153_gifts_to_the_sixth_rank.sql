-- v153 — the gifts of the lines' ranks, the first to the sixth of every line;
-- a bigger well, and twice as many insects
--
-- Run this once in the Supabase SQL editor, after v152 (it stops at its first
-- line without v152's counted gifts). Running it again is safe. **Run it after
-- the site's own code for it is live**: a page from before asks nothing new of
-- it, and a page with the code and a database without this file offers the
-- nine gifts of v152 and none of the new deeds (the squirrel fetches nothing,
-- a second line is not dropped, no row is worked at a swing). Two gifts of
-- before do nothing in between: the enchanted hoe and the garden gnome, whose
-- old powers the new page no longer has and whose new ones are this file's.
-- A page left open since before the code went live should be loaded again.
--
-- Why. The owner, 2026-10-07, of what a rank's gift should be:
--
--   "เอาให้ทุกคนร้องว้าวเหมือนตอนเข้าป่าแล้วมีตะเกียง"
--   "ที่เกือบจะเข้าขั้น OP ของแต่ละสาย"
--   and of a power that could never be failed: "แรงไป แบบนี้จะไม่มีการ fail เกิดขึ้นเลย"
--   then, of the ladder laid out anew: "เอาตามที่คุณออกแบบมาทุกอย่างเลย", "เอาจนจบ 1-6 เลย"
--
-- So each rank's gift cuts a whole rule of its line out, each rank more than
-- the last; none takes failing away (one that is always on can still be
-- failed, one that skips a game is counted to a day or a meal's hours); and
-- the game grows with whoever has them: a power that does many at once has a
-- longer, harder game of its own, and from a line's fourth rank its good
-- things are 8% a rank harder for that member.
--
-- What it does, a line at a time (the rules are lib/town's, each held to its
-- twin here case by case):
--
--   * What every line stands on. A count is reckoned by its whole rule
--     (`town.stretch_at`: a day, a meal's hours, a span of minutes), where
--     v152's took the word alone (`town.stretch_of`, dropped; `town.used_of`
--     and `town.gift_use` written again for it). `town.harder_at`,
--     `town.rank_on`, `town.harder_for`: how much harder a line's good things
--     are at a rank. `town.deed_th`: a Thai word for every new deed, and for
--     those written down since v144 that had none.
--   * The kitchen. A dimension basket of twelve helpings in no slot of the
--     bag (`town_basket_put`, `_take`, `_eat`); a whispering spoon that tells
--     the secret thing of the recipe the pot is on the way to, three a day
--     (`town_spoon`); a hearth sprite that cooks a recipe made before with no
--     game and a helping more, three pots a meal's hours, and a phoenix flame
--     that gives back what comes to nothing, three a day (both through
--     `town_cook`, written again for a few lines); a stardust spice that puts
--     a bowl's buff at the fourth level, once a day (`town_spice_eat`;
--     `town.chew` written again for one line).
--   * The farm. A bed's row worked at one swing: the enchanted hoe's, the
--     seed pouch's (seven plots for five seeds) and the crescent sickle's (one
--     more from a plant cut well), one deed with each plot's own line written
--     down (`town_row`); the garden gnome waters its member's whole bed, a bed
--     once an hour (`town_gnome`; its weeding, and that weeding's count, are
--     gone); the hourglass of seasons makes one bed grow three times as fast
--     for three hours, once a day (`town_hourglass`); the mandrake sprout has
--     a plant picked for the last time bear once more, seven a day.
--     `town.grown`, `town.growing`, `town.pest_at` and `town.pick` are written
--     again for the hourglass's hours and the mandrake's encore; a plant with
--     neither grows, sickens and is picked as it was.
--   * The helpers (on the farm's rules, for work in somebody else's bed). The
--     gardener's gloves leave nothing of that work's stamina to pay (the
--     catalog's number: a half until now), and water a row of somebody
--     else's at one long pour (`town_longpour`: let go too soon or spilt, the
--     row's last plants get none). The fae anklet has another's plant its
--     wearer waters grow twice as much, three times from the twentieth of a
--     run with no more than eight seconds between; the duet bell doubles two
--     members' waterings in one bed within ten seconds of each other and
--     gives each two stamina back a plant, of twenty-five plants a day.
--     Whatever multiplies a watering (these two, the heat, the well's water)
--     is one sum, never more than three times (`town.poured_as`; v133's
--     trigger on town_plots, `town.plot_heat`, leaves a watering kept so
--     alone). The ring of shared strength gives a friend near thirty stamina
--     for fifteen of its wearer's, three a day (`town_ring`: how far the
--     friend stands is the page's to say). Fae dust stops the dying clock of
--     another's plant that has pests for twelve hours, five a day
--     (`town_dust`; `town.see` and `town.rid_pick` reckon the death by
--     `town.dies_at`). `town.tend`, `town_tend` and `town.work_counts_of`
--     (the dust and the bell count on the helpers' line) are written again
--     for these. (The guardian's cloak is the page's own: the tired games of
--     that work.)
--   * The well. A flask of living water: a drink held out to a friend near,
--     who takes it (thirty stamina to them, ten to its owner; a drinker once
--     in a meal's hours: `town_drink_offer`, `town_drink_take`); a rain frog
--     under whose rain an empty bucket in the hand fills by itself
--     (`town_rain_fill`); a moon flask that keeps three bucketfuls of dew,
--     rain or moon water, which poured into the well works three times as
--     long (`town_moon`, `town_moon_keep`, `town_moon_pour`). `town.well_poured`
--     is written again for one line: more of the same water never shortens
--     what the well has.
--   * The deck. An otter that drives a fish that got away back for one more
--     fight, ten to a meal's hours; a rod of two lines (two baits, two fish
--     fought at once and lost one at a time); a sky orb (a night, rain or a
--     full moon over its owner's water for thirty minutes, once a day:
--     `town_orb`); stardust bait, three a day, that only rare fish and better
--     take. And the water grows wiser: a line taken up and dropped again more
--     than three times in five minutes, and the rare fish are gone from that
--     member's water for ten; a legend is landed in no less than two fights'
--     time; from the fourth rank an uncommon fish and better pulls harder and
--     is bigger. `town_cast` takes a fifth word (how the line is dropped: its
--     four-word form is dropped, and a page from before is answered by the
--     new one), and `town_strike`, `town_land` and `town.cast_line` are
--     written again for these.
--   * The forest. The squirrel fetches what lies on the ground from two tiles
--     off for no stamina; the truffle piglet digs with no hoe and bruises
--     nothing, one more a hole, ten holes a meal's hours; the firefly lantern
--     shows what every place holds, and six secret places of the deep woods
--     that take two games running; a sprite's treasure map, three a day
--     (`town_map_use`, `town_map_dig`: where the chest lies is never kept and
--     never told); the moss stag gathers from two tiles off. `town_wild`,
--     `town_gather`, `town.wild_holds` and `town.gather` (two words more: its
--     eleven-word form is dropped) are written again for these.
--   * The insects. A drop of nectar brings an insect of that place and hour,
--     ten a day (`town_nectar`), its owner's alone to net (`town_net_mine`);
--     the butterfly-wing cloak leaves another of its kind following a catch
--     for three seconds, and has the day-rare insects out for its wearer every
--     day. `town_bugs`, `town_net` and `town.net` are written again for a line
--     or two each. (The butterfly's halved distance, the wind net and the
--     lulling flute are the page's own; the flute is counted by v152's
--     `town_gift_use`.)
--
-- And three things the owner asked for on 2026-10-07, trying the gifts:
--
--   * The farm's well holds a hundred bucketfuls where it held forty
--     ("บ่อน้ำเปลี่ยนจาก เต็ม 40 เป็น 100"), and a bucketful of it goes half as far
--     in a can ("ลดลงมาครึ่งนึง"): a can's filling takes two bucketfuls where
--     it took one (`farming.fill`), so a bucketful is four waterings of a
--     plain can, six of a copper one, nine of a brass one; a well with one
--     left gives half a can. `town.chore`, `town_chore` and `town.well_seen`
--     are written again for it: a filling is written down with the
--     bucketfuls it took, and the well's book takes as many of its oldest
--     water. What is in the well when this runs stays in it.
--   * Twice as many insects ("เพิ่มปริมาณแมลง … เป็นสองเท่า"; the forest's things
--     as they were): every kind of haunt rolls one twice as often, by a
--     shorter turn and, at the common haunts, a likelier one (the catalog's
--     `insects` row, which the rules read: none of them changes). Each
--     haunt's turns begin anew with the row, so what is out at the moment the
--     file runs changes at once.
--   * (The page's alone, with the code: no scarecrow stands on the farm, and
--     a familiar at its member's heels is drawn smaller.)
--
-- No table, and no column. No coins come of any of it: every new deed writes
-- coins 0. What a gift gives more of is things, growth and water, and
-- stamina in three places: the flask (thirty to a friend, ten to its owner),
-- the ring (thirty to a friend for fifteen) and the bell (two a plant, of
-- twenty-five plants a day); and the gloves take the stamina of work in
-- somebody else's bed away. Seven catalog rows are written over: `gifts`,
-- `farming`, `well`, `forest`, `insects`, `fishing`, `work`.

do $$ begin
  if to_regprocedure('town.gift_use(jsonb, text, bigint)') is null then raise exception 'v153 needs v152: run supabase/v152 first'; end if;
end $$;

-- ─── The catalog's rows ────────────────────────────────────────────────────
-- <catalog:v153> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "uses": {"thingSpoon":{"n":3,"per":"day"},"famSprite":{"n":3,"per":"meal"},"thingSpice":{"n":1,"per":"day"},"thingFlame":{"n":3,"per":"day"},"charmRing":{"n":3,"per":"day"},"thingDust":{"n":5,"per":"day"},"famOtter":{"n":10,"per":"meal"},"thingOrb":{"n":1,"per":"day"},"thingBait":{"n":3,"per":"day"},"famPiglet":{"n":10,"per":"meal"},"thingMap":{"n":3,"per":"day"},"thingNectar":{"n":10,"per":"day"},"thingFlute":{"n":1,"per":"span","ms":300000},"thingHourglass":{"n":1,"per":"day"},"famMandrake":{"n":7,"per":"day"}},
    "harder": {"from":4,"by":0.08},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":0.5},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":60},"thingBasket":{"kind":"thing","line":"kitchen","rank":2,"by":12},"thingSpoon":{"kind":"thing","line":"kitchen","rank":3,"by":1},"famSprite":{"kind":"familiar","line":"kitchen","rank":4,"by":1},"thingSpice":{"kind":"thing","line":"kitchen","rank":5,"by":4},"thingFlame":{"kind":"thing","line":"kitchen","rank":6,"by":1},"charmAnklet":{"kind":"charm","line":"helpers","rank":2,"by":2},"charmBell":{"kind":"charm","line":"helpers","rank":3,"by":2},"charmRing":{"kind":"charm","line":"helpers","rank":4,"by":30},"thingDust":{"kind":"thing","line":"helpers","rank":5,"by":12},"charmGuard":{"kind":"charm","line":"helpers","rank":6,"by":2},"famOtter":{"kind":"familiar","line":"fishing","rank":2,"by":1},"thingRod":{"kind":"thing","line":"fishing","rank":3,"by":0.75},"charmLine":{"kind":"charm","line":"fishing","rank":4,"by":3},"thingOrb":{"kind":"thing","line":"fishing","rank":5,"by":2},"thingBait":{"kind":"thing","line":"fishing","rank":6,"by":1},"famPiglet":{"kind":"familiar","line":"forest","rank":3,"by":1},"charmFirefly":{"kind":"charm","line":"forest","rank":4,"by":1},"thingMap":{"kind":"thing","line":"forest","rank":5,"by":1},"famStag":{"kind":"familiar","line":"forest","rank":6,"by":2},"thingNectar":{"kind":"thing","line":"insects","rank":3,"by":1},"charmWind":{"kind":"charm","line":"insects","rank":4,"by":1},"thingFlute":{"kind":"thing","line":"insects","rank":5,"by":15},"charmCloak":{"kind":"charm","line":"insects","rank":6,"by":3},"thingPouch":{"kind":"thing","line":"farming","rank":3,"by":5},"charmSickle":{"kind":"charm","line":"farming","rank":4,"by":1},"thingHourglass":{"kind":"thing","line":"farming","rank":5,"by":3},"famMandrake":{"kind":"familiar","line":"farming","rank":6,"by":1},"thingFlask":{"kind":"thing","line":"well","rank":4,"by":30},"famFrog":{"kind":"familiar","line":"well","rank":5,"by":45},"thingMoon":{"kind":"thing","line":"well","rank":6,"by":3}}
  }$town$::jsonb),
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "rids": {"ladybird":0.5,"mantis":0.7},
    "cures": {"pestCure":24},
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6,"swarm":{"some":1,"many":4,"adds":[0.01,0.02]}},
    "swings": {"clear":3,"till":3},
    "pulled": "compost",
    "stages": [0,0.1,0.3,0.6,1],
    "tools": {"hoe":"hoe","can":"can","seedKangkong":"seed","seedScallion":"seed","seedCabbage":"seed","seedCarrot":"seed","seedDaikon":"seed","seedCorn":"seed","seedChili":"seed","seedTomato":"seed","seedBasil":"seed","seedSweetPotato":"seed","seedGarlic":"seed","seedPumpkin":"seed","growFert":"feed","guardFert":"guard","pestCure":"cure","mosquitofish":"guard","herring":"feed","archerfish":"cure","mulch":"feed","lavenderSachet":"guard","butterflyWhite":"feed","monarch":"feed","mantis":"guard","ladybird":"guard","scarab":"feed","hoeIron":"hoe","canCopper":"can","seedEggplant":"seed","seedCucumber":"seed","seedLongBean":"seed","seedLemongrass":"seed","seedGalangal":"seed","seedLime":"seed","seedPapaya":"seed","hoeSteel":"hoe","canBrass":"can","seedMango":"seed","seedBanana":"seed","seedCoconut":"seed","seedGinger":"seed","seedTurmeric":"seed","seedTaro":"seed","seedWatermelon":"seed"},
    "seeds": {"seedKangkong":"kangkong","seedScallion":"scallion","seedCabbage":"cabbage","seedCarrot":"carrot","seedDaikon":"daikon","seedCorn":"corn","seedChili":"chili","seedTomato":"tomato","seedBasil":"basil","seedSweetPotato":"sweetPotato","seedGarlic":"garlic","seedPumpkin":"pumpkin","seedEggplant":"eggplant","seedCucumber":"cucumber","seedLongBean":"longBean","seedLemongrass":"lemongrass","seedGalangal":"galangal","seedLime":"lime","seedPapaya":"papaya","seedMango":"mango","seedBanana":"banana","seedCoconut":"coconut","seedGinger":"ginger","seedTurmeric":"turmeric","seedTaro":"taro","seedWatermelon":"watermelon"},
    "field": {"hoe":1,"hoeIron":1.5,"hoeSteel":2.2,"can":1,"canCopper":1.5,"canBrass":2.2,"sickle":1.5,"shears":1.5},
    "blades": {"tree":"shears","plant":"sickle"},
    "tree": 5,
    "cans": {"can":8,"canCopper":12,"canBrass":18},
    "buckets": {"bucket":1,"bucketIron":2,"waterYoke":2,"waterYokeGreat":4,"waterCart":6},
    "well": 100,
    "fill": 2,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30,
    "gifted": {"glass":{"hours":3,"kept":40},"encore":0.5},
    "helping": {"most":3,"anklet":{"run":20,"gap":8,"top":3,"long":12},"bell":{"within":10,"back":2,"plants":25},"ring":{"part":0.5,"reach":3},"dust":{"kept":12},"told":8}
  }$town$::jsonb),
  ('well', $town${
    "ranks": [50,200,600],
    "gifts": [[1,"waterYoke"],[2,"waterCart"],[3,"waterYokeGreat"]],
    "listed": 40,
    "drink": {"back":10,"reach":3,"waits":20},
    "frog": {"croaks":15,"fills":12},
    "moon": {"holds":3}
  }$town$::jsonb),
  ('forest', $town${
    "kinds": {"sticks":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"twig","weight":60,"n":[1,2]},{"item":"pineCone","weight":25,"n":[1,2]},{"item":"feather","weight":8,"n":[1,1]},{"item":"resin","weight":7,"n":[1,1],"zones":["woods","deep"]}]},"leaves":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"leafMould","weight":75,"n":[1,2]},{"item":"vine","weight":25,"n":[1,2],"zones":["woods","deep","bamboo"]}]},"flowers":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"wildflower","weight":100,"n":[1,2]},{"item":"fourLeafClover","weight":2,"n":[1,1],"zones":["edge"]},{"item":"wildOrchid","weight":40,"n":[1,1],"zones":["deep","bamboo"],"day":0.25},{"item":"moonflower","weight":400,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"moon":true}]},"bamboo":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"bambooCane","weight":1,"n":[1,2]}]},"clay":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"clay","weight":1,"n":[1,3]}]},"mushrooms":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"shiitake","weight":60,"n":[1,2]},{"item":"chanterelle","weight":50,"n":[1,2],"rain":6},{"item":"porcini","weight":35,"n":[1,2],"rain":6,"zones":["deep"]},{"item":"glowMushroom","weight":80,"n":[1,2],"zones":["deep"],"hours":[[19,24],[0,5]]}]},"greens":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"fiddlehead","weight":100,"n":[1,2],"zones":["stream"]},{"item":"mint","weight":60,"n":[1,2],"zones":["edge","stream"]},{"item":"rosemary","weight":100,"n":[1,2],"zones":["rise"]},{"item":"chamomile","weight":60,"n":[1,2],"zones":["edge"],"hours":[[5,12]]},{"item":"lavender","weight":50,"n":[1,2],"zones":["edge"]}]},"berries":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"blueberry","weight":100,"n":[2,3],"zones":["edge","woods"]},{"item":"raspberry","weight":100,"n":[2,3],"zones":["woods","rise"]},{"item":"wildStrawberry","weight":40,"n":[1,2],"zones":["edge"]}]},"nook":{"how":"pick","every":120,"chance":0.5,"shares":2,"cost":1,"finds":[{"item":"egg","weight":60,"n":[1,2],"zones":["edge","woods"]},{"item":"silkCocoon","weight":40,"n":[1,1],"zones":["bamboo","woods"]},{"item":"feather","weight":20,"n":[1,2]}]},"mound":{"how":"dig","every":30,"chance":0.6,"shares":2,"cost":3,"finds":[{"item":"bambooShoot","weight":100,"n":[1,2],"zones":["bamboo"],"hours":[[4,12]]},{"item":"wildYam","weight":60,"n":[1,2],"zones":["woods","rise","edge","deep"]},{"item":"worm","weight":50,"n":[1,3]},{"item":"truffle","weight":40,"n":[1,1],"zones":["deep"],"day":0.25},{"item":"ginseng","weight":3,"n":[1,1],"zones":["deep"]},{"item":"amber","weight":3,"n":[1,1],"zones":["rise"]},{"item":"mandrake","weight":2,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"rain":2}]},"fruit":{"how":"shake","every":60,"chance":0.7,"shares":3,"cost":2,"finds":[{"item":"wildApple","weight":100,"n":[2,3],"zones":["edge"]},{"item":"chestnut","weight":100,"n":[1,3],"zones":["woods","deep","rise","stream","bamboo"]}]},"glint":{"how":"pick","every":720,"chance":1,"shares":5,"cost":1,"finds":[{"item":"starShard","weight":1,"n":[1,1],"hours":[[19,24],[0,5]],"day":0.2}]}},
    "spots": [["fruit",153,184,"edge"],["fruit",157,186,"edge"],["fruit",173,175,"edge"],["fruit",183,184,"edge"],["fruit",198,179,"edge"],["fruit",181,186,"edge"],["fruit",218,183,"edge"],["fruit",207,124,"deep"],["fruit",182,140,"woods"],["fruit",186,156,"woods"],["fruit",233,125,"deep"],["fruit",177,118,"deep"],["fruit",172,134,"deep"],["fruit",184,121,"deep"],["sticks",176,147,"woods"],["sticks",221,160,"rise"],["sticks",196,143,"woods"],["sticks",169,132,"deep"],["sticks",177,124,"deep"],["sticks",162,131,"deep"],["sticks",155,129,"deep"],["sticks",175,130,"deep"],["sticks",229,121,"deep"],["sticks",180,121,"deep"],["sticks",216,163,"rise"],["sticks",183,125,"deep"],["sticks",232,115,"deep"],["sticks",226,134,"deep"],["sticks",219,167,"rise"],["sticks",217,146,"rise"],["sticks",173,153,"bamboo"],["sticks",163,157,"bamboo"],["sticks",198,126,"deep"],["sticks",177,172,"woods"],["sticks",168,122,"deep"],["sticks",211,171,"rise"],["sticks",168,146,"bamboo"],["sticks",187,142,"woods"],["sticks",226,127,"deep"],["sticks",154,150,"bamboo"],["sticks",202,147,"woods"],["sticks",212,148,"rise"],["sticks",217,136,"stream"],["sticks",165,145,"bamboo"],["leaves",212,127,"deep"],["leaves",155,157,"bamboo"],["leaves",196,124,"deep"],["leaves",151,150,"bamboo"],["leaves",214,124,"deep"],["leaves",189,124,"deep"],["leaves",152,114,"deep"],["leaves",186,151,"woods"],["leaves",176,167,"woods"],["leaves",160,167,"bamboo"],["leaves",186,163,"woods"],["leaves",148,151,"bamboo"],["leaves",154,161,"bamboo"],["leaves",202,124,"deep"],["leaves",190,148,"woods"],["leaves",159,170,"bamboo"],["leaves",209,127,"deep"],["leaves",220,129,"deep"],["leaves",176,158,"woods"],["leaves",176,155,"woods"],["leaves",188,114,"deep"],["leaves",196,174,"woods"],["leaves",196,164,"woods"],["leaves",197,115,"deep"],["flowers",148,177,"edge"],["flowers",162,180,"edge"],["flowers",185,177,"edge"],["flowers",189,183,"edge"],["flowers",169,178,"edge"],["flowers",214,184,"edge"],["flowers",227,182,"edge"],["flowers",224,176,"edge"],["flowers",178,177,"edge"],["flowers",223,181,"edge"],["flowers",156,181,"edge"],["flowers",181,180,"edge"],["flowers",196,154,"camp"],["flowers",190,161,"camp"],["flowers",220,122,"deep"],["flowers",191,164,"camp"],["flowers",155,169,"bamboo"],["flowers",191,153,"camp"],["flowers",188,159,"camp"],["bamboo",157,155,"bamboo"],["bamboo",148,166,"bamboo"],["bamboo",160,152,"bamboo"],["bamboo",157,162,"bamboo"],["bamboo",165,169,"bamboo"],["bamboo",146,149,"bamboo"],["bamboo",152,168,"bamboo"],["bamboo",167,149,"bamboo"],["bamboo",155,164,"bamboo"],["bamboo",158,173,"bamboo"],["clay",231,147,"stream"],["clay",220,143,"stream"],["clay",194,137,"stream"],["clay",188,136,"stream"],["clay",226,141,"stream"],["clay",220,139,"stream"],["clay",161,140,"stream"],["clay",166,142,"stream"],["mushrooms",207,147,"woods"],["mushrooms",179,147,"woods"],["mushrooms",206,170,"woods"],["mushrooms",186,173,"woods"],["mushrooms",193,169,"woods"],["mushrooms",209,152,"woods"],["mushrooms",196,150,"woods"],["mushrooms",200,175,"woods"],["mushrooms",183,154,"woods"],["mushrooms",167,128,"deep"],["mushrooms",149,122,"deep"],["mushrooms",184,116,"deep"],["mushrooms",210,120,"deep"],["mushrooms",153,133,"deep"],["mushrooms",203,117,"deep"],["mushrooms",174,123,"deep"],["mushrooms",159,116,"deep"],["mushrooms",210,131,"deep"],["mushrooms",159,120,"deep"],["mushrooms",234,118,"deep"],["mushrooms",164,116,"deep"],["mushrooms",224,132,"deep"],["mushrooms",226,137,"deep"],["mushrooms",147,125,"deep"],["mushrooms",195,131,"deep"],["mushrooms",227,119,"deep"],["greens",176,180,"edge"],["greens",164,182,"edge"],["greens",228,177,"edge"],["greens",200,182,"edge"],["greens",188,178,"edge"],["greens",231,183,"edge"],["greens",172,179,"edge"],["greens",163,176,"edge"],["greens",197,135,"stream"],["greens",173,144,"stream"],["greens",157,144,"stream"],["greens",177,141,"stream"],["greens",235,147,"stream"],["greens",148,144,"stream"],["greens",183,131,"stream"],["greens",204,137,"stream"],["greens",237,167,"rise"],["greens",237,158,"rise"],["greens",211,161,"rise"],["greens",220,154,"rise"],["greens",235,172,"rise"],["greens",229,154,"rise"],["berries",154,179,"edge"],["berries",168,182,"edge"],["berries",208,177,"edge"],["berries",150,183,"edge"],["berries",207,181,"edge"],["berries",211,175,"edge"],["berries",194,184,"edge"],["berries",179,166,"woods"],["berries",198,168,"woods"],["berries",204,143,"woods"],["berries",180,157,"woods"],["berries",185,167,"woods"],["berries",188,169,"woods"],["berries",223,166,"rise"],["berries",224,156,"rise"],["berries",237,153,"rise"],["berries",210,144,"rise"],["berries",235,175,"rise"],["nook",219,177,"edge"],["nook",148,160,"bamboo"],["nook",148,147,"bamboo"],["nook",202,169,"woods"],["nook",172,168,"bamboo"],["nook",204,153,"woods"],["nook",160,183,"edge"],["nook",150,162,"bamboo"],["nook",160,158,"bamboo"],["nook",163,171,"bamboo"],["mound",166,161,"bamboo"],["mound",159,146,"bamboo"],["mound",152,171,"bamboo"],["mound",157,150,"bamboo"],["mound",172,163,"bamboo"],["mound",161,163,"bamboo"],["mound",163,148,"bamboo"],["mound",169,166,"bamboo"],["mound",201,156,"woods"],["mound",203,150,"woods"],["mound",183,149,"woods"],["mound",217,160,"rise"],["mound",152,176,"edge"],["mound",233,163,"rise"],["mound",182,177,"edge"],["mound",211,183,"edge"],["mound",223,135,"deep"],["mound",154,118,"deep"],["mound",236,127,"deep"],["mound",151,118,"deep"],["mound",170,127,"deep"],["mound",208,116,"deep"],["mound",199,121,"deep"],["mound",175,115,"deep"],["glint",217,122,"deep"],["glint",219,119,"deep"],["glint",193,120,"deep"],["glint",189,118,"deep"],["glint",193,123,"deep"]],
    "reach": 1,
    "decoy": "toadstool",
    "decoys": 2,
    "hoes": ["hoe","hoeIron","hoeSteel"],
    "misses": 30,
    "squirrel": 2,
    "stag": 2,
    "secret": {"kinds":{"ring":{"how":"choose","then":"dig","every":240,"chance":0.5,"shares":3,"cost":4,"finds":[{"item":"porcini","weight":40,"n":[2,3]},{"item":"truffle","weight":30,"n":[1,2]},{"item":"ginseng","weight":14,"n":[1,1]},{"item":"glowMushroom","weight":50,"n":[2,3],"hours":[[19,24],[0,5]]},{"item":"mandrake","weight":6,"n":[1,1],"hours":[[19,24],[0,5]]}]},"bough":{"how":"shake","then":"choose","every":240,"chance":0.5,"shares":3,"cost":4,"finds":[{"item":"silkCocoon","weight":40,"n":[1,2]},{"item":"wildOrchid","weight":30,"n":[1,2]},{"item":"amber","weight":10,"n":[1,1]},{"item":"starShard","weight":8,"n":[1,1],"hours":[[19,24],[0,5]]},{"item":"moonflower","weight":60,"n":[1,1],"hours":[[19,24],[0,5]],"moon":true}]}},"spots":[["bough",221,133,"deep"],["bough",156,125,"deep"],["bough",160,136,"deep"],["ring",173,127,"deep"],["ring",189,128,"deep"],["ring",168,117,"deep"]]},
    "hunt": {"sites":[[232,151],[148,129],[205,174],[193,147],[229,151],[177,121],[230,159],[180,152],[172,183],[214,136],[181,129],[226,153],[196,139],[216,181],[187,122],[211,124],[199,159],[153,123],[217,172],[196,170],[201,153],[165,174],[184,145],[231,130],[168,138],[233,180],[173,150],[216,130],[230,173],[164,163],[204,127],[167,134],[157,135],[154,145],[227,158],[223,149],[204,183],[191,179],[152,158],[175,161],[191,143],[149,173],[147,135],[206,132],[218,133],[218,150],[217,157],[185,180],[201,164],[223,139],[230,163],[148,185],[148,139],[170,152],[227,164],[169,162],[179,169],[177,132],[192,150],[236,122],[205,177],[200,144],[204,114],[205,120],[183,158],[198,118],[172,117],[215,117],[233,121],[146,153],[187,145],[235,165],[153,155],[235,115],[226,171],[163,167],[156,121],[148,169],[234,156],[213,180],[165,178],[217,175],[208,163],[228,125],[147,117],[166,157],[228,132],[200,129],[229,117],[182,173],[207,154],[199,141],[194,116],[146,157],[157,166],[213,133],[223,146],[213,114],[220,147],[160,176],[151,127],[209,149],[155,115],[214,146],[161,123],[190,132],[202,172],[223,128],[213,143],[229,169],[205,162],[224,122],[164,120],[174,171],[195,179],[215,154],[188,153],[235,132],[192,139],[152,181],[219,126],[237,150],[197,146],[199,133],[178,129],[206,158],[220,136],[201,119],[154,136],[224,119],[223,116],[151,131],[209,166],[179,114],[182,166],[210,134],[164,136],[222,174],[150,136],[207,137],[160,149],[170,114],[228,129],[228,114],[171,173],[182,163],[155,176],[234,168],[204,167],[161,114],[220,180],[172,157],[172,131],[212,154],[223,170],[235,161],[212,166],[162,128],[213,177],[231,176],[226,150],[219,114],[197,129],[214,174],[212,158],[159,132],[168,169],[223,125],[224,161],[237,170],[174,165],[201,179],[237,119],[176,183],[236,181],[186,139],[147,182],[146,121],[207,129],[213,151]],"off":5,"radius":8,"bands":[0,1,3,6,10],"rare":0.5,"pair":100,"rares":[["wildOrchid",0.25],["truffle",0.25],["starShard",0.2]],"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea","scrollTruffleEggs","scrollMushroomOmelette"]}
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":50,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":7,"chance":0.77,"shares":1},"water":{"every":7,"chance":0.7,"shares":1},"field":{"every":7,"chance":0.77,"shares":1},"lamp":{"every":7,"chance":0.84,"shares":1},"tree":{"every":14,"chance":0.7,"shares":1},"litter":{"every":14,"chance":0.7,"shares":1},"glade":{"every":30,"chance":0.25,"shares":1},"falls":{"every":15,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20},
    "nectar": {"within":10,"soon":3,"stays":120,"at":["blooms","water","field","lamp","litter"],"maps":[["town",0,0,64,64],["farm",128,0,60,44],["forest",144,112,96,80]]},
    "pair": {"slack":2500}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","loach","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait","caterpillar","moth","dragonfly","grasshopper"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatFeather":1.1,"floatGlow":1.15,"floatQuill":1.25,"floatBell":1.5},
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
  ('work', $town${
    "ids": ["kitchen","well","helpers","fishing","forest","insects","farming"],
    "ranks": 10,
    "past": 0.25,
    "first": 10,
    "marks": {"kitchen":[50,150,350,700,1300,2200,3600,5500,8000,12000],"well":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"helpers":[50,200,600,1500,3000,6000,10000,15000,22000,30000],"fishing":[50,150,350,700,1300,2200,3600,5500,8000,12000],"forest":[50,150,350,700,1300,2200,3600,5500,8000,12000],"insects":[50,150,350,700,1300,2200,3600,5500,8000,12000],"farming":[50,150,350,700,1300,2200,3600,5500,8000,12000]},
    "day": {"kitchen":150,"well":200,"helpers":200,"fishing":150,"forest":150,"insects":150,"farming":150},
    "kitchen": {"ladled":1,"pots":3,"ladling":9,"pot":{"friedMinnow":2,"grilledFish":2,"grilledCorn":2,"roastSweetPotato":2,"stirKangkong":3,"basilCatfish":3,"tomYum":4,"sourCurry":4,"friedPerch":2,"fishCake":4,"spicyEel":3,"grilledPrawn":2,"steamedGoby":3,"pumpkinSoup":5,"shabu":10,"somTam":3,"grilledEggplant":2,"tomKha":4,"friedGourami":2,"crabCurry":4,"steamedSheatfish":3,"friedFrog":2,"laab":4,"omelette":2,"snailCurry":4,"candiedPumpkin":5,"friedRice":3,"greenCurry":5,"khanomJeen":6,"hoMok":4,"mangoStickyRice":4,"bananaInCoconut":4,"taroPudding":6,"steamedCroaker":3,"gingerFish":4,"turmericFish":3,"jungleCurry":6,"megaLaab":20,"watermelonSlices":6,"khantoke":20,"naamPrik":4,"sushi":4,"ramen":3,"tempura":2,"unadon":2,"okonomiyaki":3,"kimchi":4,"bibimbap":4,"tteokbokki":3,"kimbap":3,"pajeon":2,"harGow":4,"chowMein":3,"springRoll":4,"congee":4,"mapoTofu":3,"pizza":6,"spaghetti":3,"risotto":4,"lasagna":6,"minestrone":5,"fishCurry":4,"naan":4,"biryani":5,"samosa":4,"lassi":3,"fishChips":4,"ukha":4,"thieboudienne":5,"piranhaSoup":3,"crawfishBoil":8,"masgouf":3,"salmonSteak":2,"arapaimaRoast":10,"mushroomSoup":3,"mushroomSkewer":2,"fishOnStick":2,"roastYam":2,"roastedApple":2,"mushroomRisotto":4,"fernSalad":2,"herbTea":3,"berryCompote":3,"bakedApple":3,"roastChestnut":3,"forestStew":6,"bambooShootStir":3,"rosemaryFish":2,"ginsengSoup":4,"moonTea":4,"truffleEggs":3,"mushroomOmelette":2,"fishSauce":1,"compost":1,"growFert":1,"guardFert":1,"pestCure":1,"basket":1,"hookScale":1,"floatGlow":1,"bowl":1,"skewer":1,"floatFeather":1,"lineSpun":1,"mulch":1,"lavenderSachet":1,"bugNet":1,"driedFish":1,"saltedFish":1,"curryPaste":1,"pickle":1,"charcoal":1,"rope":1,"krabung":1,"noodle":1,"coconutMilk":1,"fermentedFish":1,"shrimpPaste":1,"driedChili":1,"riceNoodle":1,"toastedRice":1,"yoke":1}},
    "helpers": {"water":1,"clear":2,"till":2,"feed":2,"cure":5,"thanked":3,"dust":2},
    "fishing": {"minnow":1,"barb":1,"tilapia":1,"perch":1,"catfish":1,"pangasius":3,"snakehead":3,"eel":3,"prawn":3,"featherback":8,"goby":8,"gourami":1,"crab":1,"snail":1,"hampala":3,"sheatfish":3,"bagrid":3,"giantGourami":3,"frog":3,"tigerfish":8,"wallago":8,"croaker":3,"blackEar":3,"spinyEel":3,"puffer":3,"goldenCarp":8,"giantSnakehead":8,"royalFeatherback":8,"arowana":30,"stingray":30,"megaCatfish":30,"koi":30,"loach":1,"mosquitofish":1,"mussel":1,"crayfish":1,"goldfish":1,"carp":1,"piranha":1,"herring":3,"archerfish":3,"pacu":3,"pike":3,"nilePerch":3,"salmon":3,"wels":8,"gar":8,"arapaima":30,"dozyFish":1,"popotoFish":1,"rainbowFish":1,"moonFish":8},
    "forest": {"how":{"pick":1,"choose":2,"shake":2,"dig":3},"rare":10,"rares":["starShard","truffle","wildOrchid"]},
    "insects": {"butterflyWhite":1,"monarch":1,"morpho":8,"dragonfly":3,"damselfly":3,"glassDragonfly":8,"grasshopper":3,"mantis":3,"cricket":3,"cicada":3,"stickInsect":3,"leafInsect":3,"firefly":3,"orchidMantis":8,"moth":3,"lunaMoth":8,"hawkMoth":8,"rhinoBeetle":8,"stagBeetle":8,"jewelBeetle":8,"herculesBeetle":8,"ladybird":1,"scarab":1,"caterpillar":1},
    "farming": {"kangkong":1,"scallion":1,"cabbage":2,"carrot":2,"daikon":3,"corn":4,"chili":4,"tomato":6,"basil":3,"sweetPotato":6,"garlic":5,"pumpkin":12,"eggplant":5,"cucumber":3,"longBean":4,"lemongrass":6,"galangal":8,"lime":14,"papaya":12,"mango":20,"banana":16,"coconut":24,"ginger":10,"turmeric":10,"taro":14,"watermelon":12}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v153>

-- ─── What every line stands on ─────────────────────────────────────────────
-- v153, the part every line's gifts stand on. A line's own functions are in v153.<line>.sql beside this file, tried
-- on top of this one (try-line.mjs); the file for supabase/ is put together from all of them.

-- The stretch of time a count is of, as one number, by the count's whole rule (lib/town/gifts' stretchOf): the day,
-- the day and which meal's hours of it, or which span of so many milliseconds the moment is in.
create or replace function town.stretch_at(p_rule jsonb, p_now bigint)
returns bigint language sql stable
as $$
  select case p_rule->>'per'
    when 'day' then town.day_of(p_now)::bigint
    when 'meal' then town.day_of(p_now)::bigint * 3 + town.meal_of(p_now)
    else floor(p_now::numeric / greatest(1, coalesce((p_rule->>'ms')::numeric, 1)))::bigint end
$$;

-- How many times a counted gift has been used in the stretch p_now is in (lib/town/gifts' usedOf): v152's, the
-- stretch by the rule.
create or replace function town.used_of(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_at(rule, p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- A counted gift used once (lib/town/gifts' useGift): v152's, the stretch by the rule.
create or replace function town.gift_use(p_purse jsonb, p_id text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  mine jsonb;
  n integer;
begin
  if rule is null or not town.gift_works(p_purse, p_id) then return town.no('none'); end if;
  n := town.used_of(p_purse, p_id, p_now);
  if n >= (rule->>'n')::integer then return town.no('spent'); end if;
  mine := town.gifts_of(p_purse);
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - n - 1,
    'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('used',
      (mine->'used') || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', n + 1)))));
end;
$$;

-- (v152's stretch by a word alone: nothing calls it now)
drop function if exists town.stretch_of(text, bigint);

-- How much harder a line's good things are at a rank of it (lib/town/gifts' harderAt): 1 below the rank the catalog
-- names, then so much more a rank.
create or replace function town.harder_at(p_rank integer)
returns double precision language sql stable
as $$
  select coalesce((select case when p_rank < (h->>'from')::integer then 1::double precision
      else 1 + (h->>'by')::double precision * (least(10, p_rank) - (h->>'from')::integer + 1) end
    from (select town.cat('gifts')->'harder' as h) c), 1)
$$;

-- A member's rank on a line now, and how much harder that line's good things are for them.
create or replace function town.rank_on(p_member uuid, p_line text)
returns integer language sql stable set search_path = public
as $$ select town.work_rank(p_line, coalesce((town.work_told(p_member, town.now_ms())->p_line->>'points')::double precision, 0)) $$;

create or replace function town.harder_for(p_member uuid, p_line text)
returns double precision language sql stable set search_path = public
as $$ select town.harder_at(town.rank_on(p_member, p_line)) $$;

-- The deeds' Thai words, for town.tally: v142's as the database has them, every word of theirs as it was, with a word
-- for each deed written down since that had none, and for each deed of the gifts of ranks 1 to 6.
create or replace function town.deed_th(p_what text)
returns text language sql immutable
as $$
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
    else p_what end
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The kitchen ───────────────────────────────────────────────────────────
-- v153, the kitchen's part: the gifts of its second to sixth ranks (lib/town/gifts; the rules are lib/town/cooking.ts
-- and lib/town/stamina.ts again). Tried on top of v153.shared.sql (try-line.mjs). Safe to run twice.
--
--   * The dimension basket (rank 2): twelve helpings, of any dishes, kept in the purse (`basket`) and in no slot of
--     the bag: put in from the bag, taken back out, eaten straight from it as from the bag.
--   * The whispering spoon (rank 3): asked of what is in the pot, it tells its owner the secret thing of the recipe
--     the pot is on the way to, three times a day; the recipes it has told are kept in the purse (`whispers`).
--   * The hearth sprite (rank 4, a familiar): while it follows its member, a recipe they have made before is cooked
--     with no game, its full helpings and one more, three pots to a meal's hours. `town_cook` (as the database has
--     it after v152) is written again but for the lines meant: it is told how the pot was cooked with the game's own
--     account (`p_timing.sprite`), and cooks by `town.cook_with`, which is `town.cook` with the gifts laid over it.
--     A pot the sprite cooks is written down as a go at the game won, as ever, so the line counts it as it counts any.
--   * The stardust spice (rank 5): sprinkled on a bowl as it is begun (out of the bag or the basket), once a day;
--     eaten up, that bowl's buff is at the fourth level at once. Which meal was sprinkled is kept in the purse
--     (`spiced`, by the moment the meal began). `town.chew` (as it is after v152) is written again but for one line: the buff a
--     meal leaves is raised by `town.raised_to`, which is `town.raised` with a level it is at once at the least.
--   * The phoenix flame in a bottle (rank 6): a stove wherever its owner stands, which is the page's own to offer
--     (nothing here ever asked where a cook stands); and, where its owner set it to (`p_timing.flame`), things that
--     are no recipe's come to nothing instead of an odd dish and are all back in the bag, three times a day
--     (`town.cook_with` again; `town_cook` reads the flag and writes the giving back down).
--
-- Two functions that were there are written again (`public.town_cook`, `town.chew`), each as it was but for the
-- lines meant; `town.cook`, `town.sit_down`, `town.raised`, `town.get_up` and `town.settle` are as they were. The
-- game made harder for the skilled (a dish of the second tier or better, from the kitchen's fourth rank) is not here:
-- the cooking games are played in the browser, which tells the database how many were missed, as it always has.
--
-- No table, and no catalog row of the kitchen's own (the gifts' numbers are in `gifts`, which the shared part's file
-- writes). Nothing here gives coins. The one thing more that comes of it is the sprite's helping more to a pot.

-- ─── The dimension basket ────────────────────────────────────────────────

-- What a purse keeps in the basket, made sound (lib/town/cooking's basketOf): dishes only, each once, a whole number
-- of helpings of each, in the order they were first put in.
create or replace function town.basket_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  dishes jsonb := town.cat('dishes');
  kept jsonb := '[]'::jsonb;
  seen jsonb := '[]'::jsonb;
  e jsonb;
begin
  if jsonb_typeof(p_purse->'basket') is distinct from 'array' then return kept; end if;
  for e in select t.v from jsonb_array_elements(p_purse->'basket') with ordinality as t(v, ord) order by t.ord loop
    if jsonb_typeof(e) = 'array' and jsonb_array_length(e) = 2 and jsonb_typeof(e->0) = 'string' and dishes ? (e->>0)
       and jsonb_typeof(e->1) = 'number' and (e->>1)::numeric = floor((e->>1)::numeric) and (e->>1)::numeric > 0
       and not seen ? (e->>0) then
      kept := kept || jsonb_build_array(e);
      seen := seen || to_jsonb(e->>0);
    end if;
  end loop;
  return kept;
end;
$$;

-- How many more helpings the basket has room for (basketRoom): none, for whoever has no basket.
create or replace function town.basket_room(p_purse jsonb)
returns integer language sql stable
as $$
  select case when town.gift_works(p_purse, 'thingBasket')
    then greatest(0, (town.cat('gifts')->'gifts'->'thingBasket'->>'by')::numeric
      - coalesce((select sum((e->>1)::numeric) from jsonb_array_elements(town.basket_of(p_purse)) e), 0))::integer
    else 0 end
$$;

-- A basket with so many helpings of a dish out of it (it must hold as many).
create or replace function town.basket_less(p_basket jsonb, p_dish text, p_n numeric)
returns jsonb language sql immutable
as $$
  select coalesce(jsonb_agg(case when t.e->>0 = p_dish then jsonb_build_array(p_dish, (t.e->>1)::numeric - p_n) else t.e end order by t.ord), '[]'::jsonb)
    from jsonb_array_elements(p_basket) with ordinality as t(e, ord)
   where t.e->>0 <> p_dish or (t.e->>1)::numeric > p_n
$$;

-- So many helpings of the dish in a slot of the bag, put into the basket (basketPut).
create or replace function town.basket_put(p_purse jsonb, p_slot integer, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  mine jsonb;
  dish text;
begin
  if not town.gift_works(p_purse, 'thingBasket') or s is null or s = 'null'::jsonb or not (town.cat('dishes') ? (s->>'item')) then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > (s->>'n')::numeric then return town.no('amount'); end if;
  if p_n > town.basket_room(p_purse) then return town.no('full'); end if;
  dish := s->>'item';
  mine := town.basket_of(p_purse);
  return jsonb_build_object('ok', true, 'dish', dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', jsonb_set(p_purse->'bag', array[p_slot::text],
      case when (s->>'n')::numeric = p_n then 'null'::jsonb else jsonb_build_object('item', dish, 'n', (s->>'n')::numeric - p_n) end),
    'basket', case when exists (select 1 from jsonb_array_elements(mine) e where e->>0 = dish)
      then (select jsonb_agg(case when t.e->>0 = dish then jsonb_build_array(dish, (t.e->>1)::numeric + p_n) else t.e end order by t.ord)
              from jsonb_array_elements(mine) with ordinality as t(e, ord))
      else mine || jsonb_build_array(jsonb_build_array(dish, p_n)) end));
end;
$$;

-- So many helpings of a dish taken back out of the basket, into the bag (basketTake).
create or replace function town.basket_take(p_purse jsonb, p_dish text, p_n numeric)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := town.basket_of(p_purse);
  had numeric := (select (e->>1)::numeric from jsonb_array_elements(mine) e where e->>0 = p_dish limit 1);
begin
  if not town.gift_works(p_purse, 'thingBasket') or had is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n < 1 or p_n > had then return town.no('amount'); end if;
  if town.room(p_purse->'bag', p_dish) < p_n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'dish', p_dish, 'n', p_n, 'purse', p_purse || jsonb_build_object(
    'bag', town.put(p_purse->'bag', p_dish, p_n::integer), 'basket', town.basket_less(mine, p_dish, p_n)));
end;
$$;

-- A helping of a dish begun now, wherever it was taken from (lib/town/stamina's begun): one more of this meal's
-- hours' helpings, and the meal at hand. (town.sit_down has the same written in it, and is as it was.)
create or replace function town.begun(p_purse jsonb, p_dish text, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))
                from (select case when x.ord - 1 = m.meal then x.e::int + 1 else x.e::int end as n, x.ord
                        from jsonb_array_elements_text(town.bowls_today(p_purse, p_now)) with ordinality as x(e, ord)) b),
    'eating', jsonb_build_object('dish', p_dish, 'meal', m.meal, 'from', p_now, 'till', p_now, 'got', 0))
    from (select town.meal_of(p_now) as meal) m
$$;

-- Sitting down to a helping of a dish out of the basket (basketEat): as town.sit_down, but that it leaves the basket.
create or replace function town.basket_eat(p_purse jsonb, p_dish text, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := town.basket_of(p_purse);
  bowls jsonb := town.bowls_today(p_purse, p_now);
begin
  if not town.gift_works(p_purse, 'thingBasket') or p_dish is null
     or not exists (select 1 from jsonb_array_elements(mine) e where e->>0 = p_dish) then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (bowls->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  return jsonb_build_object('ok', true, 'dish', p_dish,
    'purse', p_purse || jsonb_build_object('basket', town.basket_less(mine, p_dish, 1)) || town.begun(p_purse, p_dish, p_now));
end;
$$;

-- ─── The whispering spoon ────────────────────────────────────────────────

-- The recipes whose secret thing the spoon has told somebody, made sound (lib/town/cooking's whispersOf): recipes
-- there are, each once.
create or replace function town.whispers_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  recipes jsonb := town.cat('cooking')->'recipes';
  kept jsonb := '[]'::jsonb;
  e jsonb;
begin
  if jsonb_typeof(p_purse->'whispers') is distinct from 'array' then return kept; end if;
  for e in select t.v from jsonb_array_elements(p_purse->'whispers') with ordinality as t(v, ord) order by t.ord loop
    if jsonb_typeof(e) = 'string' and recipes ? (e #>> '{}') and not kept ? (e #>> '{}') then kept := kept || e; end if;
  end loop;
  return kept;
end;
$$;

-- What the spoon says of some things (spoonSays): of the recipes that have each of them in no smaller an amount,
-- less those p_known names (read whole already), the one nearest done (the fewest things still to go in; of two as
-- near, the first in the catalog's order), its last thing, and how many such recipes there are.
create or replace function town.spoon_says(p_things jsonb, p_known jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('cooking');
  mine jsonb := town.things_of(p_things);
  known jsonb := case when jsonb_typeof(p_known) = 'array' then p_known else '[]'::jsonb end;
  total double precision;
  best record;
begin
  if mine = '{}'::jsonb then return town.no('amount'); end if;
  total := (select sum((m.value #>> '{}')::double precision) from jsonb_each(mine) m);
  with fits as (
    select r.id, r.ord, (select sum(v.value::double precision) from jsonb_each_text(k->'needs'->r.id) v) - total as short
      from jsonb_array_elements_text(k->'recipes') with ordinality r(id, ord)
     where not exists (select 1 from jsonb_each(mine) m
                        where coalesce((k->'needs'->r.id->>m.key)::double precision, 0) < (m.value #>> '{}')::double precision))
  select (select count(*) from fits)::int as all_n,
         (select count(*) from fits f where not known ? f.id)::int as open_n,
         (select f.id from fits f where not known ? f.id order by f.short, f.ord limit 1) as id
    into best;
  if best.all_n = 0 then return town.no('astray'); end if;
  if best.open_n = 0 then return town.no('known'); end if;
  return jsonb_build_object('ok', true, 'of', best.id, 'secret', (town.needs_of(best.id)->-1)->>0, 'ways', best.open_n);
end;
$$;

-- The spoon asked of what is in the pot (spoon): things of one's own bag, as they would be cooked; counted once
-- when it has something to tell, and the recipe is among `whispers` from then on.
create or replace function town.spoon(p_purse jsonb, p_things jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb;
  x jsonb;
  told jsonb;
  says jsonb;
  used jsonb;
begin
  if not town.gift_works(p_purse, 'thingSpoon') then return town.no('none'); end if;
  alls := town.tidy(p_things);
  if jsonb_array_length(alls) = 0 or jsonb_array_length(alls) > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null or ck->'never' ? (items->(x->>0)->>'kind')
       or town.held(p_purse->'bag', x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  if town.used_of(p_purse, 'thingSpoon', p_now) >= (town.cat('gifts')->'uses'->'thingSpoon'->>'n')::integer then return town.no('spent'); end if;
  told := town.whispers_of(p_purse);
  says := town.spoon_says(alls, (case when jsonb_typeof(p_purse->'made') = 'array' then p_purse->'made' else '[]'::jsonb end) || told);
  if not (says->>'ok')::boolean then return says; end if;
  used := town.gift_use(p_purse, 'thingSpoon', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return says || jsonb_build_object('left', used->'left', 'purse', (used->'purse') || jsonb_build_object('whispers', told || to_jsonb(says->>'of')));
end;
$$;

-- ─── The hearth sprite ───────────────────────────────────────────────────

-- Things put together as town.cook does, with what the kitchen's later gifts change of it (lib/town/cooking's
-- cookWith). p_how.sprite: by the hearth sprite, with no game: only while it follows, only a recipe made before,
-- counted, as a pot stirred with no miss, and so many helpings more in the pot (the pot that was not in the bag
-- before). What refuses a pot cooked by hand refuses this one, with nothing lost and nothing counted.
-- p_how.flame: cooked by hand with the phoenix flame set to guard the pot: where what came of it is the odd dish, or
-- nothing (bare hands), and the flame has one of the day's left, every thing is back in the bag (`back`): the bag as
-- it was, the stamina paid and a miss by a recipe's last thing counted as the go itself did.
create or replace function town.cook_with(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint, p_how jsonb)
returns jsonb language plpgsql stable
as $$
declare
  recipe text;
  used jsonb;
  did jsonb;
  more integer;
  at_ integer;
begin
  if p_how->'sprite' is distinct from 'true'::jsonb then
    did := town.cook(p_purse, p_things, p_crew, p_misses, p_now);
    if not (did->>'ok')::boolean or p_how->'flame' is distinct from 'true'::jsonb
       or (did->>'made' is not null and did->>'made' <> town.cat('cooking')->>'oddDish') or not town.gift_works(p_purse, 'thingFlame') then return did; end if;
    used := town.gift_use(p_purse, 'thingFlame', p_now);
    if not (used->>'ok')::boolean then return did; end if;
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'back', true,
        'purse', (used->'purse') || jsonb_build_object('stamina', did->'purse'->'stamina')
          || case when did->'purse' ? 'tries' then jsonb_build_object('tries', did->'purse'->'tries') else '{}'::jsonb end)
      || case when did ? 'taste' then jsonb_build_object('taste', did->'taste') else '{}'::jsonb end;
  end if;
  if not town.gift_works(p_purse, 'famSprite') then return town.no('none'); end if;
  recipe := town.made_of(p_things);
  if recipe is null or not (case when jsonb_typeof(p_purse->'made') = 'array' then p_purse->'made' else '[]'::jsonb end) ? recipe then return town.no('unmade'); end if;
  used := town.gift_use(p_purse, 'famSprite', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  did := town.cook(used->'purse', p_things, p_crew, 0, p_now);
  if not (did->>'ok')::boolean then return did; end if;
  more := (town.cat('gifts')->'gifts'->'famSprite'->>'by')::integer;
  select (s.ord - 1)::int into at_ from jsonb_array_elements(did->'purse'->'bag') with ordinality s(v, ord)
   where s.v->>'item' = 'potFull' and s.v->'of'->>'dish' = did->>'made' and coalesce(p_purse->'bag'->((s.ord - 1)::int)->>'item', '') <> 'potFull'
   order by s.ord limit 1;
  if at_ is null then return did || '{"sprite": true}'::jsonb; end if;
  return did || jsonb_build_object('sprite', true, 'n', (did->>'n')::int + more,
    'purse', jsonb_set(did->'purse', array['bag', at_::text, 'of', 'left'], to_jsonb((did->'purse'->'bag'->at_->'of'->>'left')::int + more)));
end;
$$;

-- Cooking, as a member asks for it: as the database has it after v152, written again but for four things: how the pot was cooked is read out
-- of what the browser says of its game (`how`: by the sprite; with the flame set to guard it), the rule is
-- town.cook_with, a pot the sprite cooked or a go the flame gave back says so in the go that is written down, and
-- the sprite's cooking and the flame's giving back are each written down as a gift used.
create or replace function public.town_cook(p_things jsonb, p_crew uuid[] default '{}', p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ck jsonb := town.cat('cooking');
  crew jsonb := jsonb_build_array(town.hand_of(purse));
  others uuid[];
  claims jsonb := town.timing_said(p_timing);
  how jsonb := jsonb_build_object('sprite', coalesce(town.claims(p_timing)->'sprite' = 'true'::jsonb, false), 'flame', coalesce(town.claims(p_timing)->'flame' = 'true'::jsonb, false));
  misses integer := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (ck->>'misses')::int);
  did jsonb;
  after jsonb;
  made text;
  find boolean;
  is_first boolean := false;
  known jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  -- the other cooks: members of the town, each once, seven at most; what each holds is their own purse's to say
  select coalesce(array_agg(c.id order by c.id), '{}') into others
    from (select distinct u.id from unnest(coalesce(p_crew, '{}'::uuid[])) u(id)
            join public.profiles p on p.id = u.id
           where u.id <> me and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)
           order by u.id limit 7) c;
  select crew || coalesce(jsonb_agg(town.hand_of(coalesce(pp.doc, '{}'::jsonb)) order by o.ord), '[]'::jsonb) into crew
    from unnest(others) with ordinality o(id, ord) left join public.town_purses pp on pp.member_id = o.id;
  did := town.cook_with(purse, p_things, crew, misses, now_, how);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  after := did->'purse';
  made := did->>'made';
  -- a recipe found: a dish that has one, or something else that is made. The odd dish is not.
  find := made is not null and (town.cat('makes') ? made or coalesce(town.cat('dishes')->made->'recipe', 'null'::jsonb) <> 'null'::jsonb);
  if find then
    if town.cat('dishes') ? made and not coalesce(after->'recipes', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('recipes', coalesce(after->'recipes', '[]'::jsonb) || to_jsonb(made));
    end if;
    if not coalesce(after->'made', '[]'::jsonb) ? made then
      after := after || jsonb_build_object('made', coalesce(after->'made', '[]'::jsonb) || to_jsonb(made));
    end if;
    known := town.thing('found', true);
    if not known ? made then
      is_first := true;
      perform town.keep_thing('found', known || to_jsonb(made));
      perform town.keep_thing('finders', town.thing('finders', true) || jsonb_build_object(made, jsonb_build_object('by', me, 'at', now_,
        'name', (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
  end if;
  perform town.keep_purse(me, after);
  perform town.record(me, 'cooking', find, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
    jsonb_build_object('what', coalesce(made, 'nothing'), 'need', (ck->>'stirs')::int + jsonb_array_length(town.tidy(p_things)), 'misses', misses,
      'crew', to_jsonb(others), 'claims', claims) || case when did->'sprite' = 'true'::jsonb then '{"sprite": true}'::jsonb when did->'back' = 'true'::jsonb then '{"back": true}'::jsonb else '{}'::jsonb end);
  if did->'sprite' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'famSprite', 1, 0, jsonb_build_object('made', made, 'n', did->'n',
      'left', (town.cat('gifts')->'uses'->'famSprite'->>'n')::integer - town.used_of(after, 'famSprite', now_)));
  end if;
  if did->'back' = 'true'::jsonb then
    perform town.note(me, 'gift_use', 'thingFlame', 1, 0, jsonb_build_object('things', town.tidy(p_things), 'taste', did->'taste',
      'left', (town.cat('gifts')->'uses'->'thingFlame'->>'n')::integer - town.used_of(after, 'thingFlame', now_)));
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first, 'misses', misses);
end;
$$;

-- ─── The stardust spice ──────────────────────────────────────────────────

-- The level the buff of the meal being eaten goes to at once when it is eaten up (lib/town/stamina's spiceOf): the
-- sprinkling's own, where it is of this meal (by the moment the meal began); none (0) otherwise.
create or replace function town.spice_of(p_purse jsonb)
returns integer language sql immutable
as $$
  select case when coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb and jsonb_typeof(p_purse->'spiced') = 'object'
               and jsonb_typeof(p_purse->'spiced'->'from') = 'number' and p_purse->'spiced'->'from' = p_purse->'eating'->'from'
               and jsonb_typeof(p_purse->'spiced'->'level') = 'number' and (p_purse->'spiced'->>'level')::numeric > 0
    then floor((p_purse->'spiced'->>'level')::numeric)::integer else 0 end
$$;

-- What a purse has of meals' buffs once a helping that leaves p_id is eaten up (lib/town/stamina's raised, with its
-- `to`): town.raised (which is as it was), but that the level is p_level at once at the least, never past the last.
create or replace function town.raised_to(p_purse jsonb, p_id text, p_now bigint, p_level integer)
returns jsonb language plpgsql stable
as $$
declare
  st jsonb := town.cat('stamina');
  live jsonb := town.meal_buffs(p_purse, p_now);
  at_ integer := (select (e.ord - 1)::int from jsonb_array_elements(live) with ordinality as e(b, ord) where e.b->>'id' = p_id order by e.ord limit 1);
  buffs jsonb;
begin
  if at_ is null then
    buffs := live || jsonb_build_array(jsonb_build_object('id', p_id, 'level', least((st->>'levels')::int, greatest(1, coalesce(p_level, 0))), 'until', p_now + (st->>'hours')::bigint * 3600000));
    at_ := jsonb_array_length(buffs) - 1;
  else
    buffs := jsonb_set(live, array[at_::text, 'level'], to_jsonb(least((st->>'levels')::int, greatest((live->at_->>'level')::int + 1, coalesce(p_level, 0)))));
  end if;
  return jsonb_build_object('buffs', buffs,
    'buff', case when st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', buffs->at_->'until') else coalesce(p_purse->'buff', 'null'::jsonb) end);
end;
$$;

-- A meal counted on (lib/town/stamina's chew): as it is after v152, written again but for one line: the buff it leaves when it
-- is eaten up is raised by town.raised_to, to the level a sprinkled bowl's goes to (none, for any other bowl: then
-- it is raised as it always was).
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  gain := (dish->>'stamina')::double precision
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));
end;
$$;

-- Sitting down to a helping with the spice sprinkled on it (lib/town/cooking's spiceEat): out of a slot of the bag,
-- or (p_dish) out of the basket. The meal is begun as ever; a dish that leaves no buff is not sprinkled; counted as
-- it is sprinkled.
create or replace function town.spice_eat(p_purse jsonb, p_slot integer, p_dish text, p_seated boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  sat jsonb;
  used jsonb;
begin
  if not town.gift_works(p_purse, 'thingSpice') then return town.no('none'); end if;
  sat := case when p_dish is not null then town.basket_eat(p_purse, p_dish, p_seated, p_now) else town.sit_down(p_purse, p_slot, p_seated, p_now) end;
  if not (sat->>'ok')::boolean then return sat; end if;
  if coalesce(town.cat('dishes')->(sat->>'dish')->'buff', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  used := town.gift_use(sat->'purse', 'thingSpice', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return jsonb_build_object('ok', true, 'dish', sat->'dish', 'purse', (used->'purse') || jsonb_build_object('spiced',
    jsonb_build_object('from', p_now, 'level', (town.cat('gifts')->'gifts'->'thingSpice'->>'by')::integer)));
end;
$$;

-- ─── What a member does ──────────────────────────────────────────────────

create or replace function public.town_basket_put(p_slot integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_put(town.purse_of(me, true), p_slot, p_n);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'basket_put', did->>'dish', (did->>'n')::numeric, 0, jsonb_build_object('in', town.basket_of(did->'purse')));
  end if;
  return town.answer(me, did);
end;
$$;

create or replace function public.town_basket_take(p_dish text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_take(town.purse_of(me, true), p_dish, p_n);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'basket_take', did->>'dish', (did->>'n')::numeric, 0, jsonb_build_object('in', town.basket_of(did->'purse')));
  end if;
  return town.answer(me, did);
end;
$$;

-- (a meal begun is written down as `eat`, as town_sit writes one: this one says where the helping was)
create or replace function public.town_basket_eat(p_dish text, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.basket_eat(town.purse_of(me, true), p_dish, p_seated, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'eat', did->>'dish', 1, 0, jsonb_build_object('from', 'basket'));
  end if;
  return town.answer(me, did);
end;
$$;

-- (what it told goes to whoever asked and to nobody else: the answer, and a line of the town's own log)
create or replace function public.town_spoon(p_things jsonb)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb;
begin
  if p_things is null or jsonb_typeof(p_things) <> 'array' or jsonb_array_length(p_things) > 64
     or exists (select 1 from jsonb_array_elements(p_things) x
                 where jsonb_typeof(x) <> 'array' or jsonb_array_length(x) <> 2 or jsonb_typeof(x->0) <> 'string' or jsonb_typeof(x->1) <> 'number'
                    or x->>0 !~ '^[A-Za-z]{1,24}$' or abs((x->>1)::numeric) > 1000) then
    return town.answer(me, town.no('none'));
  end if;
  did := town.spoon(town.purse_of(me, true), p_things, town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift_use', 'thingSpoon', 1, 0, jsonb_build_object('left', did->'left', 'of', did->'of', 'ways', did->'ways'));
  end if;
  return town.answer(me, did);
end;
$$;

-- (a meal begun, written down as `eat` with where the helping was and that it was sprinkled; and the gift used)
create or replace function public.town_spice_eat(p_slot integer, p_dish text, p_seated boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.spice_eat(town.purse_of(me, true), p_slot, p_dish, p_seated, now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'eat', did->>'dish', 1, 0, jsonb_build_object('from', case when p_dish is not null then 'basket' else 'bag' end, 'spice', true));
    perform town.note(me, 'gift_use', 'thingSpice', 1, 0, jsonb_build_object('dish', did->'dish',
      'left', (town.cat('gifts')->'uses'->'thingSpice'->>'n')::integer - town.used_of(did->'purse', 'thingSpice', now_)));
  end if;
  return town.answer(me, did);
end;
$$;

revoke execute on function public.town_spice_eat(integer, text, boolean) from public, anon;
grant execute on function public.town_spice_eat(integer, text, boolean) to authenticated;
revoke execute on function public.town_spoon(jsonb) from public, anon;
grant execute on function public.town_spoon(jsonb) to authenticated;
revoke execute on function public.town_basket_put(integer, integer) from public, anon;
grant execute on function public.town_basket_put(integer, integer) to authenticated;
revoke execute on function public.town_basket_take(text, integer) from public, anon;
grant execute on function public.town_basket_take(text, integer) to authenticated;
revoke execute on function public.town_basket_eat(text, boolean) from public, anon;
grant execute on function public.town_basket_eat(text, boolean) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The farm ──────────────────────────────────────────────────────────────
-- v153, the farming line's gifts (lib/town/farm.ts, under "the gifts of the farming line"; lib/town/gifts.ts has
-- each gift's own number). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
--   * The enchanted hoe (a charm, worn): a bed's row at a swing. `town_row(x, y, marks, timing)` is ONE deed: told
--     how each plot's beat went, it does each plot whose beat was hit as `town_tend` would have done it by itself
--     (`town.tend`, as it is), from the plot stood on outwards, and leaves each whose beat was missed. Each plot done
--     is written down as its own go at farming (`town_plays`, which the lines of work count), and the row whole as
--     one line of `town_deeds` (`row`).
--   * The spellbound seed pouch (a thing, had): the same deed sows every plot of the row that is ready for a seed,
--     for five seeds where seven plots would take seven (`town.pouch_seeds`), each plot written down as its own
--     sowing (`sow`, which earns no points, as ever).
--   * The crescent sickle (a charm, worn): the same deed picks every ripe plant of the row its wearer swung at, in
--     their own bed, each as `town.pick` picks it by hand; one cut well gives one more (the catalog's gifts row: the
--     sickle's number), where the bag has room. Each plant is written down as its own picking (`pick`, which earns
--     its points on the farming line as ever), with how it was cut.
--   * The hourglass of seasons (a thing, had): turned over one bed of its owner's (`town_hourglass(x, y)`, once a
--     day: the catalog's count), everything growing there grows so many times as fast (its number) for so many hours
--     (`farming.gifted.glass`, new in the catalog's row). Each plant of the bed remembers the turning (`fast`, a
--     list of moments in the plant's own document), and the clocks growth is reckoned by count it: `town.grown`
--     (v118's), `town.growing` (v110's) and `town.pest_at` (v147's) are written again, each as it ran but for the
--     hourglass's term (`town.quick_ms`, which is nothing for a plant no hourglass was turned over: such a plant is
--     as it always was, to the millisecond). Written down as one line (`hourglass`: how many plants).
--   * The mandrake sprout (a familiar, following): it sings as its member picks a plant for what would be the last
--     time, and that plant bears once more, any crop (so many plants a day: the catalog's count). The plant keeps
--     that (`more`, in its own document), waits its kind's own while to bear again, or, of a kind picked only once,
--     a part of its hours (`farming.gifted.encore`), and is picked once more. `town.pick` (v110's) is written again
--     for the song, and `town.growing` and `town.pest_at` (above) know of the bearing more. A plant never sung to
--     has no such mark and is as it always was.
--   * The garden gnome (a familiar, following) waters its member's whole bed at once: no water out of a can, no
--     stamina, what a plain can adds; a bed rests so many minutes between two of its rounds (the catalog's gifts row:
--     the gnome's number), kept in the purse (`gnomed`). `town_gnome(x, y)`; written down as one line (`gnome`:
--     how many plants). It began as a weeder counted ten times to a meal's hours (v152): that count is gone from the
--     catalog's row, and `town_gift_use('famGnome')` answers that there is nothing to use.

-- The growth an hourglass of seasons has added to a plant between two moments, in milliseconds (lib/town/farm's
-- quickMs): for every stretch it ran over the plant's bed, the part of it between them, so many times over again
-- (three times as fast is twice more). Nothing, for a plant no hourglass was turned over.
create or replace function town.quick_ms(p_plant jsonb, p_from bigint, p_to bigint)
returns double precision language sql stable
as $$
  select case when jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0 then
      coalesce((select sum(greatest(0, least(p_to::numeric, (f.at #>> '{}')::numeric + k.span) - greatest(p_from::numeric, (f.at #>> '{}')::numeric)))
                  from jsonb_array_elements(p_plant->'fast') as f(at) where jsonb_typeof(f.at) = 'number'), 0)::double precision * (k.by - 1::double precision)
    else 0::double precision end
    from (select (town.cat('farming')->'gifted'->'glass'->>'hours')::numeric * 3600000 as span,
                 (town.cat('gifts')->'gifts'->'thingHourglass'->>'by')::double precision as by) k
$$;

-- How many bearings more than its kind a plant has (lib/town/farm's moreOf): none, but for one the mandrake sang to.
create or replace function town.more_of(p_plant jsonb)
returns integer language sql immutable
as $$ select case when jsonb_typeof(p_plant->'more') = 'number' and (p_plant->>'more')::numeric > 0 then floor((p_plant->>'more')::numeric)::integer else 0 end $$;

-- The hours a plant has grown by a moment (v118's, with what an hourglass turned over its bed did).
create or replace function town.grown(p_plant jsonb, p_now bigint)
returns double precision language sql stable
as $$
  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + town.wet_ms(p.sown, p_now)::double precision * (w.f->>'adds')::double precision / (w.f->>'every')::double precision
      + town.quick_ms(p_plant, p.sown, p_now)) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$$;

-- Where a plant is in its growing, pests left out (v110's; one that was picked and bears again waits by the clock,
-- and by the hourglass with it).
create or replace function town.growing(p_plant jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  -- (a plant the mandrake sang to has a bearing more than its kind, and waits for it as one that bears again waits)
  select case when m.more > 0 and m.picked >= m.picks and m.picked < m.picks + m.more
      then jsonb_build_object('stage', case when m.since >= m.encore then 5 else 4 end, 'ripe', m.since >= m.encore, 'spent', false)
      else town.growth(p_plant->>'crop', town.grown(p_plant, p_now), m.picked, m.since) end
    from (
      select (p_plant->>'picked')::int as picked, town.more_of(p_plant) as more, (c.crop->>'picks')::int as picks,
             coalesce((c.crop->>'again')::double precision, (c.crop->>'hours')::double precision * (town.cat('farming')->'gifted'->>'encore')::double precision) as encore,
             ((p_now - (p_plant->>'pickedAt')::bigint)::double precision
               + case when (p_plant->>'picked')::int > 0 then town.quick_ms(p_plant, (p_plant->>'pickedAt')::bigint, p_now) else 0::double precision end) / 3600000::double precision as since
        from (select town.cat('crops')->(p_plant->>'crop') as crop) c
    ) m
$$;

-- When a pest struck a plant, if one has and it has not been cured since (v147's, with the hourglass in what is
-- ripe: a ripe plant is safe).
create or replace function town.pest_at(p_key text, p_plant jsonb, p_now bigint)
returns bigint language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  c jsonb := town.cat('crops')->(p_plant->>'crop');
  from_ integer := (f->'pests'->>'from')::int;
  to_ integer := (f->'pests'->>'to')::int;
  chance double precision := (f->'pests'->>'chance')::double precision;
  faster double precision := (f->>'feed')::double precision - 1::double precision;
  hours double precision := (c->>'hours')::double precision;
  again double precision := (c->>'again')::double precision;
  picks integer := (c->>'picks')::int;
  sown bigint := (p_plant->>'sown')::bigint;
  fed bigint := (p_plant->>'fed')::bigint;
  boost double precision := (p_plant->>'boost')::double precision;
  picked integer := (p_plant->>'picked')::int;
  picked_at bigint := (p_plant->>'pickedAt')::bigint;
  guard bigint := (p_plant->>'guard')::bigint;
  adds double precision := (f->'water'->>'adds')::double precision;
  every double precision := (f->'water'->>'every')::double precision;
  h bigint := ceil(greatest(sown, (p_plant->>'cured')::bigint, picked_at)::numeric / 3600000)::bigint;
  t bigint;
  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (`farming.pests.swarm`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
  -- (whether an hourglass was ever turned over it: its term is asked for only then)
  quick boolean := coalesce(jsonb_typeof(p_plant->'fast') = 'array' and jsonb_array_length(p_plant->'fast') > 0, false);
  -- (the bearing more of a plant the mandrake sang to, and the hours it waits for it)
  more integer := town.more_of(p_plant);
  encore double precision := coalesce((c->>'again')::double precision, (c->>'hours')::double precision * (f->'gifted'->>'encore')::double precision);
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
    t := h * 3600000;
    exit when t > p_now;
    hour := ((((t + 25200000) % 86400000) + 86400000) % 86400000 / 3600000)::int;
    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
      -- (a ripe plant is safe: it only waits to be picked)
      ripe := case
        when picked >= picks + more then false
        when picked >= picks then ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= encore
        when picked > 0 then again is not null and ((t - picked_at)::double precision
          + case when quick then town.quick_ms(p_plant, picked_at, t) else 0::double precision end) / 3600000::double precision >= again
        else ((greatest(0, t - sown))::double precision
          + (case when fed <> 0 then (greatest(0, t - greatest(fed, sown)))::double precision * faster else 0::double precision end)
          + boost
          + town.wet_ms(sown, t)::double precision * adds / every
          + case when quick then town.quick_ms(p_plant, sown, t) else 0::double precision end) / 3600000::double precision >= hours end;
      if ripe then return null; end if;
      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then return t; end if;
    end if;
    h := h + 1;
  end loop;
  return null;
end;
$$;

-- Pick a ripe plant into the bag (v110's, with the mandrake's song: picked for what would be the last time by a
-- member the mandrake follows, with a song left to the day, the plant is not spent: it bears once more).
create or replace function town.pick(p_key text, p_purse jsonb, p_plot jsonb, p_may boolean, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  n integer;
  picked integer;
  last_ boolean;
  sung jsonb;
  mine jsonb := p_purse;
begin
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean then return town.no('soil'); end if;
  if not coalesce(p_may, false) then return town.no('theirs'); end if;
  if not (seen->>'ripe')::boolean then return town.no('unripe'); end if;
  n := town.yield_of(p_key, p, case when town.held(p_purse->'bag', p_hand) > 0 then p_hand end);
  if town.room(p_purse->'bag', p->>'crop') < n then return town.no('full'); end if;
  picked := (p->>'picked')::int + 1;
  last_ := picked >= (town.cat('crops')->(p->>'crop')->>'picks')::int + town.more_of(p);
  -- (a plant it has sung to is not sung to again)
  if last_ and town.more_of(p) = 0 then
    sung := town.gift_use(p_purse, 'famMandrake', p_now);
    if (sung->>'ok')::boolean then mine := sung->'purse'; last_ := false; else sung := null; end if;
  end if;
  return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(p->>'crop', n)),
    'plot', case when last_ then '{"soil": "cleared", "plant": null}'::jsonb
      else p_plot || jsonb_build_object('plant', p || jsonb_build_object('picked', picked, 'pickedAt', p_now, 'watered', 0)
        || case when sung is not null then jsonb_build_object('more', (town.cat('gifts')->'gifts'->'famMandrake'->'by')) else '{}'::jsonb end) end,
    'purse', town.spend(mine, (f->'costs'->>'pick')::double precision, p_now) || jsonb_build_object('bag', town.put(mine->'bag', p->>'crop', n)));
end;
$$;

-- The hourglass turned over a bed (lib/town/farm's glassTurn). p_plots: every plot of the bed that is kept, by its
-- key; p_owner: whose the bed is now. Gives the purse with the day's turning counted, the plots it quickened as they
-- now are (each plant that lives remembers the turning), which those are, and until when the sand runs.
create or replace function town.glass_turn(p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('farming')->'gifted'->'glass';
  span numeric := (k->>'hours')::numeric * 3600000;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  live text[];
  used jsonb;
  key text;
  p jsonb;
  fast jsonb;
  next jsonb := '{}'::jsonb;
begin
  if not town.gift_works(p_purse, 'thingHourglass') then return town.no('none'); end if;
  if town.used_of(p_purse, 'thingHourglass', p_now) >= (town.cat('gifts')->'uses'->'thingHourglass'->>'n')::integer then return town.no('spent'); end if;
  if p_owner is distinct from p_me then return town.no('theirs'); end if;
  select coalesce(array_agg(e.key order by split_part(e.key, ',', 2)::int, split_part(e.key, ',', 1)::int), '{}'::text[]) into live
    from jsonb_each(plots) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (town.see(e.key, e.value, p_now)->>'dead')::boolean;
  -- (while the sand still runs over a plant of the bed it is not turned again)
  if exists (
    select 1 from unnest(live) as l(key_),
           jsonb_array_elements(case when jsonb_typeof(plots->l.key_->'plant'->'fast') = 'array' then plots->l.key_->'plant'->'fast' else '[]'::jsonb end) as f(at)
     where jsonb_typeof(f.at) = 'number' and (f.at #>> '{}')::numeric <= p_now and p_now < (f.at #>> '{}')::numeric + span) then return town.no('running'); end if;
  -- (it is turned for what is still on its way: a bed of plants that only wait to be picked has nothing to gain)
  if not exists (select 1 from unnest(live) as l(key_) where not (town.see(l.key_, plots->l.key_, p_now)->>'ripe')::boolean) then return town.no('soil'); end if;
  used := town.gift_use(p_purse, 'thingHourglass', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  foreach key in array live loop
    p := plots->key->'plant';
    -- (the turnings it remembers, this one last: the newest so many)
    select coalesce(jsonb_agg(q.at order by q.ord), '[]'::jsonb) into fast
      from (
        select t.at, t.ord
          from (select f.at, f.ord from jsonb_array_elements(case when jsonb_typeof(p->'fast') = 'array' then p->'fast' else '[]'::jsonb end) with ordinality as f(at, ord)
                 where jsonb_typeof(f.at) = 'number'
                union all select to_jsonb(p_now), 9223372036854775807) t
         order by t.ord desc limit (k->>'kept')::int
      ) q;
    next := next || jsonb_build_object(key, (plots->key) || jsonb_build_object('plant', p || jsonb_build_object('fast', fast)));
  end loop;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'plots', next, 'quickened', to_jsonb(live), 'until', p_now + span::bigint);
end;
$$;

-- Turn my hourglass over the bed I stand in. One at a time in a bed, as every deed there.
create or replace function public.town_hourglass(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  bed jsonb;
  owner text;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.glass_turn(bed, purse, me::text, now_, owner);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'hourglass', null, jsonb_array_length(did->'quickened'), 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n, 'until', did->'until'));
  for k in select jsonb_array_elements_text(did->'quickened') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  return town.answer(me, did);
end;
$$;
revoke execute on function public.town_hourglass(integer, integer) from public, anon;
grant execute on function public.town_hourglass(integer, integer) to authenticated;

-- The row of its bed a plot is in: the bed's plots that share its y, as their keys from one end to the other
-- (lib/town/world's rowOf); none, off the beds.
create or replace function town.row_keys(p_x integer, p_y integer)
returns jsonb language sql stable
as $$
  select coalesce((
    select jsonb_agg(((b.at->>0)::int + i)::text || ',' || p_y::text order by i)
      from (select town.cat('farming') as f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord), generate_series(0, (c.f->>'side')::int - 1) i
     where b.ord - 1 = town.bed_of(p_x, p_y)), '[]'::jsonb)
$$;

-- The seeds the pouch takes for so many plots of a row of p_side (lib/town/farm's pouchSeeds): its number for a
-- whole row, in that measure for fewer plots, never more than the plots. And how many plots so many seeds reach.
create or replace function town.pouch_seeds(p_plots integer, p_side integer)
returns integer language sql stable
as $$ select least(p_plots, ceil(p_plots::numeric * (town.cat('gifts')->'gifts'->'thingPouch'->>'by')::numeric / p_side)::integer) $$;
create or replace function town.pouch_plots(p_seeds integer, p_side integer)
returns integer language sql stable
as $$ select coalesce(max(m), 0)::integer from generate_series(1, p_side) m where town.pouch_seeds(m, p_side) <= p_seeds $$;

-- What a gift of the farming line would do to the row from the plot stood on, if anything (lib/town/farm's rowFor):
-- which work, and the plots it would do it to, the one stood on first and then outwards (of two as near, the one
-- further left). p_keys: the row's plots; p_plots: those of them that are kept (one that is not is weeds).
create or replace function town.row_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  x0 integer;
  deed text;
  row_ jsonb;
  hoes boolean;
  sows boolean;
  reaps boolean;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) then return null; end if;
  deed := town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner);
  if deed is null then return null; end if;
  hoes := deed in ('clear', 'till') and town.wearing(p_purse, 'charmHoe');
  sows := deed = 'sow' and town.gift_works(p_purse, 'thingPouch');
  -- (the sickle is for its wearer's own beds: not somebody else's, nor one that is nobody's)
  reaps := deed = 'pick' and p_owner is not distinct from p_me and town.wearing(p_purse, 'charmSickle');
  if not hoes and not sows and not reaps then return null; end if;
  x0 := split_part(p_at, ',', 1)::integer;
  -- (the pouch sows as many plots as the seeds in the bag reach, the nearest first)
  select jsonb_agg(q.key_ order by q.far, q.x) into row_
    from (
      select k.key_, abs(split_part(k.key_, ',', 1)::integer - x0) as far, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = deed
       order by far, x
       limit case when sows then town.pouch_plots(town.held(p_purse->'bag', hand), jsonb_array_length(p_keys)) end
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return null; end if;
  return jsonb_build_object('deed', deed, 'plots', row_);
end;
$$;

-- A row's deed, whole (lib/town/farm's rowTend). p_marks: how each plot's beat went, by its key (a plot it says
-- nothing of was not in the game, and is left). p_rest: how many plots of the bed outside this row have a plant;
-- p_holds: how many other beds are p_me's. Gives the purse, the plots that changed and the bed's keeping as they
-- are afterwards, and each plot done in the order it was done.
create or replace function town.row_tend(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb)
returns jsonb language plpgsql stable
as $$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  found jsonb;
  state jsonb := '{}'::jsonb;
  stand jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb := p_purse;
  key text;
  plot jsonb;
  did jsonb;
  others integer;
  hand text := town.hand_of(p_purse);
  sows boolean;
  spared integer := 0;
  reaps boolean;
  more integer := (town.cat('gifts')->'gifts'->'charmSickle'->>'by')::integer;
  crop text;
  n integer;
  well boolean;
begin
  found := town.row_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if found is null then return town.no('none'); end if;
  sows := found->>'deed' = 'sow';
  reaps := found->>'deed' = 'pick';
  -- (the pouch: of the seeds its plots would have taken one by one, so many are spared)
  if sows then spared := jsonb_array_length(found->'plots') - town.pouch_seeds(jsonb_array_length(found->'plots'), jsonb_array_length(p_keys)); end if;
  for key in select t.key_ from jsonb_array_elements_text(found->'plots') with ordinality as t(key_, ord) order by t.ord loop
    -- (a beat missed leaves its plot undone; sowing has no beats: every plot of its row is sown; and every plant the
    -- sickle swung at is picked, however it was cut: only one that was not in the sweep is left)
    continue when case when reaps then not (marks ? key) else not sows and marks->key is distinct from 'true'::jsonb end;
    stand := plots || state;
    plot := coalesce(stand->key, wild);
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(stand->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plot, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> found->>'deed' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    -- (a seed spared is back in the bag as soon as it was taken: there is room for it where it lay)
    if sows and jsonb_array_length(each) < spared then mine := mine || jsonb_build_object('bag', town.put(mine->'bag', hand, 1)); end if;
    if not reaps then
      each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', coalesce(plot->'plant'->'crop', did->'plot'->'plant'->'crop', 'null'::jsonb), 'n', 1));
      continue;
    end if;
    -- (a plant cut well: the sickle's one more, where the bag has room for it)
    crop := plot->'plant'->>'crop';
    well := marks->key = 'true'::jsonb;
    n := (did->'got'->0->>1)::integer;
    if well and town.room(mine->'bag', crop) >= more then
      mine := mine || jsonb_build_object('bag', town.put(mine->'bag', crop, more));
      n := n + more;
    end if;
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', crop, 'n', n, 'well', well));
  end loop;
  return jsonb_build_object('ok', true, 'deed', found->>'deed', 'purse', mine, 'plots', state, 'each', each,
      -- (what was picked, all told: of each crop how many, in the order they were first picked)
      'got', case when reaps then coalesce((select jsonb_agg(jsonb_build_array(q.crop, q.total) order by q.at)
          from (select t.e->>'crop' as crop, sum((t.e->>'n')::integer) as total, min(t.ord) as at from jsonb_array_elements(each) with ordinality as t(e, ord) group by 1) q), '[]'::jsonb)
        else '[]'::jsonb end)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end
    || case when sows then jsonb_build_object('seeds', jsonb_array_length(each) - least(spared, jsonb_array_length(each))) else '{}'::jsonb end;
end;
$$;

-- The garden gnome sent down a bed (lib/town/farm's gnomeWater). p_plots: every plot of the bed that is kept, by its
-- key; p_owner: whose the bed is now. Gives the purse (which remembers the round and is otherwise as it was), the
-- plots it watered as they now are, and which those are, down the bed a row at a time.
create or replace function town.gnome_water(p_bed integer, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  rest double precision := case when town.gift_works(p_purse, 'famGnome') then (town.cat('gifts')->'gifts'->'famGnome'->>'by')::double precision * 60000 else 0 end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  rounds jsonb := case when jsonb_typeof(p_purse->'gnomed') = 'object' then p_purse->'gnomed' else '{}'::jsonb end;
  kept jsonb;
  keys text[];
  k text;
  p jsonb;
  next jsonb := '{}'::jsonb;
begin
  if not (rest > 0) then return town.no('none'); end if;
  if p_owner is distinct from p_me then return town.no('theirs'); end if;
  -- (a bed rests between two of its rounds, whatever has dried meanwhile)
  if jsonb_typeof(rounds->(p_bed::text)) = 'number' and p_now - (rounds->>(p_bed::text))::numeric < rest then return town.no('wet'); end if;
  select array_agg(e.key order by split_part(e.key, ',', 2)::int, split_part(e.key, ',', 1)::int) into keys
    from jsonb_each(plots) e where town.deed_for(e.key, e.value, 'can', '', p_now, null) = 'water';
  if keys is null then
    return town.no(case when exists (
      select 1 from jsonb_each(plots) e, lateral (select town.see(e.key, e.value, p_now) as s) z
       where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb and not (z.s->>'dead')::boolean and (z.s->>'wet')::boolean) then 'wet' else 'soil' end);
  end if;
  foreach k in array keys loop
    p := plots->k->'plant';
    next := next || jsonb_build_object(k, (plots->k) || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + (f->'water'->>'adds')::double precision * 60000::double precision)));
  end loop;
  -- (only rounds that still count are kept)
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) into kept
    from jsonb_each(rounds) e where jsonb_typeof(e.value) = 'number' and p_now - (e.value #>> '{}')::numeric < rest;
  return jsonb_build_object('ok', true, 'watered', to_jsonb(keys), 'plots', next,
    'purse', p_purse || jsonb_build_object('gnomed', kept || jsonb_build_object(p_bed::text, p_now)));
end;
$$;

-- Send the gnome that follows me down the bed I stand in. One at a time in a bed, as every deed there.
create or replace function public.town_gnome(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  bed jsonb;
  owner text;
  did jsonb;
  k text;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
    into bed from public.town_plots p where p.bed = bed_n;
  select town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) into owner
    from public.town_beds b where b.bed = bed_n;
  did := town.gnome_water(bed_n, bed, purse, me::text, now_, owner);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  -- (one line for the round: the gnome's water is nobody's and the plants its member's own, so the well's book and
  -- the lines of work have nothing to count of it, plant by plant)
  perform town.note(me, 'gnome', null, jsonb_array_length(did->'watered'), 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'bed', bed_n));
  for k in select jsonb_array_elements_text(did->'watered') loop
    v_x := split_part(k, ',', 1)::integer;
    v_y := split_part(k, ',', 2)::integer;
    update public.town_plots p set plant = did->'plots'->k->'plant', changed = now_ where p.x = v_x and p.y = v_y;
  end loop;
  -- (its owner's every deed in a bed counts as tending it)
  update public.town_beds b set tended = now_ where b.bed = bed_n and b.member_id = me;
  -- (the plots as they are kept: with what the heat and the well's water added, if they did)
  return town.answer(me, did - 'plots') || jsonb_build_object('plots', (
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
      from public.town_plots p where p.bed = bed_n and did->'watered' ? (p.x::text || ',' || p.y::text)));
end;
$$;
revoke execute on function public.town_gnome(integer, integer) from public, anon;
grant execute on function public.town_gnome(integer, integer) to authenticated;

-- A row at a time: what a gift of the farming line does to the whole row of the bed from the plot stood on, with
-- the thing in the hand. One deed, one at a time in a bed (as every deed there).
create or replace function public.town_row(p_x integer, p_y integer, p_marks jsonb default null, p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  end loop;
  if n > 0 then
    perform town.keep_purse(me, did->'purse');
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$$;
revoke execute on function public.town_row(integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.town_row(integer, integer, jsonb, jsonb) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The helpers (on the farm's) ───────────────────────────────────────────
-- v153, the helpers' line's gifts (lib/town/helping.ts; lib/town/farm.ts under "the gifts of the helpers' line";
-- lib/town/gifts.ts has each gift's own number). Tried on top of v153.shared.sql and v153.farming.sql (try-line.mjs):
-- the helpers' line is work done in somebody else's bed, so it stands on the farm's rules as the farming line left
-- them. The file for supabase/ is put together from every line's.
--
--   * The gardener's gloves (a charm, worn): work for somebody else takes NO stamina (it took half: the catalog's
--     gifts row has the gloves' number, what is left to pay, at 0; `town.gloved` and `town.eased` are as they ran,
--     and a half left owing in a purse from before stays there, never asked for). And a row of somebody else's
--     plants is watered at one long pour: `town_longpour(x, y, marks, timing)` is ONE deed. Told which plants the
--     water reached (the page's game), it waters each of them as `town_tend` would have by itself (`town.tend`),
--     from the row's head, and leaves the rest. Each plant is written down as its own watering (`water`, with whose
--     plant it was: what the well's book, the thanks and the helpers' line read), and the pour whole as one line
--     (`longpour`).
--   * The garden fae anklet (a charm, worn): another's plant its wearer waters grows so many times as much from that
--     watering (its number), and more (`farming.helping.anklet.top`) from the twentieth of a run of them with no
--     more than eight seconds between two. The run is kept in the purse (`chime`); `town.tend` (v151's) is written
--     again to count it and to say how many times over the watering is (`times`, only where it is more than once:
--     nobody without the anklet gets an answer that differs). The plot `town.tend` answers with is as any watering
--     leaves it: whoever keeps it makes it the more (`town.poured_as`), with the heat and the well's water, never to
--     more than `farming.helping.most` times what the watering added where a gift has a hand in it. `town_tend`
--     (v145's) is written again to keep a watering so, and v133's trigger on `town_plots` (`town.plot_heat`) to
--     leave alone a watering that was reckoned already: the plant says so (`pour`: whose its last watering with a
--     can was, when, what it added before anything made it the more, and how many times over it was kept in all).
--     Every watering with a can leaves that mark now, whoever waters and with whatever gifts: growth by it is as it
--     always was for somebody with no gift.
--   * The duet bell (a charm, worn): two members watering in the same bed within ten seconds of each other
--     (`farming.helping.bell`), and both waterings count double: what each added is added once more (`town.ring`,
--     under the same bound), each of somebody else's plants is a watering's worth more on the helpers' line, and
--     each of the two has two stamina back a plant, of no more than so many plants a day (`town.belled`; kept in the
--     purse, `rung`). One bell is enough for the two: it rings when either wears it in a bed that is not their own;
--     the friend may be anybody else who waters there, the bed's owner too. It is judged for both purses in the one
--     call of whoever waters second (`town.bell_rung`, from `town_tend` and `town_longpour`): the friend's plants,
--     purse and points are written there, and both are told (`aided`, in each one's own purse) and written down
--     (`bell`, a line of the deeds each). So that two who ring at once never wait on each other, the purses of
--     whoever watered in the bed within the ten seconds are held with the caller's own, in the order of their ids,
--     BEFORE the bed is: `town_tend` no longer holds its caller's purse as it is declared. `town.work_counts_of`
--     (v149's) is written again to count a `bell`.
--   * The ring of shared strength (a charm, worn): `town_ring(to, far)` gives a friend standing near thirty stamina
--     (its number) and takes half of that from its wearer (`farming.helping.ring.part`), three times a day (the
--     catalog's count). Never above the friend's full gauge: what would be over is not given and not paid for.
--     Refused to a wearer who has not what it costs, to a friend who is not of the town or not near (how near is the
--     page's to say, `far`: the database knows where nobody stands, and holds to what it is told), or whose gauge is
--     full. Both purses are held in the order of their ids and judged in the one call; the friend is told (`aided`);
--     written down for both (`ring`, `ring_had`).
--   * Garden fae dust (a thing, had): `town_dust(x, y)` sprinkles it on another member's plant that has a pest, and
--     the plant's dying clock stands still for twelve hours (its number) from then: `town.see` (v110's) and
--     `town.rid_pick` (v126's) are written again to reckon death by `town.dies_at`, which is the six hours it always
--     was for a plant never dusted (`dust`, a list of moments in the plant's own document). It is no cure. Five a
--     day (the catalog's count), no stamina. The plant's owner is told who did it (`aided`), and the duster is among
--     those to thank at the picking (`town_plot_help`). Written down (`dust`, with whose plant), and worth what
--     feeding a plant is on the helpers' line (`work.helpers.dust`, new in the catalog's row; `town.work_counts_of`
--     counts it).

-- Whether work on a plot is work for somebody else (lib/town/farm's theirsAt): in a bed that is another's, or on a
-- plant another sowed.
create or replace function town.theirs_at(p_plot jsonb, p_owner text, p_me text)
returns boolean language sql immutable
as $$
  select (p_owner is not null and p_owner <> p_me)
      or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and coalesce(p_plot->'plant'->>'by' <> p_me, false))
$$;

-- The run of waterings a purse keeps, as it stands at a moment (lib/town/helping's runOf): none, once the gap has
-- passed, or of what is kept wrongly.
create or replace function town.run_of(p_purse jsonb, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  k jsonb := p_purse->'chime';
begin
  if k is null or jsonb_typeof(k) <> 'object' or jsonb_typeof(k->'n') is distinct from 'number' or jsonb_typeof(k->'at') is distinct from 'number' then return 0; end if;
  if not ((k->>'n')::numeric >= 1) or p_now < (k->>'at')::numeric
     or p_now - (k->>'at')::numeric > (town.cat('farming')->'helping'->'anklet'->>'gap')::numeric * 1000 then return 0; end if;
  return floor((k->>'n')::numeric)::integer;
end;
$$;

-- A watering of somebody else's plant by whoever wears the anklet (lib/town/helping's chime): the purse with the run
-- one longer, and how many times over the watering is. Without the anklet: the purse as it is, and once.
create or replace function town.chime(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  a jsonb := town.cat('farming')->'helping'->'anklet';
  n integer;
begin
  if not town.wearing(p_purse, 'charmAnklet') then return jsonb_build_object('purse', p_purse, 'times', 1); end if;
  n := least(9999, town.run_of(p_purse, p_now) + 1);
  return jsonb_build_object('purse', p_purse || jsonb_build_object('chime', jsonb_build_object('n', n, 'at', p_now)),
    'times', case when n >= (a->>'run')::integer then a->'top' else town.cat('gifts')->'gifts'->'charmAnklet'->'by' end);
end;
$$;

-- A purse whose run is not the shorter for a long pour that was so many seconds in the pouring (lib/town/helping's
-- bridged): the run's last moment is put that much later, never past now. What the page says of its seconds is
-- believed up to the catalog's `long`.
create or replace function town.bridged(p_purse jsonb, p_secs double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := p_purse->'chime';
begin
  if not coalesce(p_secs > 0, false) or k is null or jsonb_typeof(k) <> 'object' or jsonb_typeof(k->'n') is distinct from 'number' or jsonb_typeof(k->'at') is distinct from 'number'
     or not town.wearing(p_purse, 'charmAnklet') then return p_purse; end if;
  return p_purse || jsonb_build_object('chime', jsonb_build_object('n', k->'n',
    'at', least(p_now::numeric, (k->>'at')::numeric + floor((least(p_secs, (town.cat('farming')->'helping'->'anklet'->>'long')::double precision) * 1000)::numeric))));
end;
$$;

-- Tend a plot (v151's, with the anklet: somebody else's plant watered by its wearer lengthens the run, and the
-- answer says how many times over the watering is).
create or replace function town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean default false)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
  theirs boolean;
  rung jsonb;
begin
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  theirs := (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me);
  -- (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the watering so many times over)
  rung := jsonb_build_object('purse', case when theirs then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end, 'times', 1);
  if deed = 'water' and theirs then rung := town.chime(rung->'purse', p_now); end if;
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', rung->'purse',
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end
    || case when (rung->>'times')::numeric > 1 then jsonb_build_object('times', rung->'times') else '{}'::jsonb end;
end;
$$;

-- The plots the long pour of the gardener's gloves would water from the plot stood on (lib/town/farm's pourFor):
-- every plant of the row that is somebody else's and that the can in the hand could water now, from the row's head
-- as far as the water in the can reaches. None: there is no row to pour along.
create or replace function town.pour_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
returns jsonb language plpgsql stable
as $$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  reach integer;
  row_ jsonb;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) or not town.wearing(p_purse, 'charmGloves') then return '[]'::jsonb; end if;
  if not town.theirs_at(p_plots->p_at, p_owner, p_me)
     or town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner) is distinct from 'water' then return '[]'::jsonb; end if;
  -- (each plant takes a watering out of the can, as ever: but under the fountain's blessing, which spares the can)
  reach := case when town.has_buff(p_purse, p_now, 'spring') then jsonb_array_length(p_keys)
    else floor((select coalesce(sum(coalesce((s.v->>'water')::numeric, 0)), 0) from jsonb_array_elements(p_purse->'bag') as s(v) where s.v->>'item' = hand))::integer end;
  select jsonb_agg(q.key_ order by q.x) into row_
    from (
      select k.key_, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.theirs_at(p_plots->k.key_, p_owner, p_me)
         and town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = 'water'
       order by x
       limit greatest(0, reach)
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return '[]'::jsonb; end if;
  return row_;
end;
$$;

-- The long pour, whole (lib/town/farm's pourRow). p_marks: which plants the water reached, by their keys (a plot it
-- says nothing of is left). p_rest: how many plots of the bed outside this row have a plant; p_holds: how many other
-- beds are p_me's; p_secs: how long the pour took, as the page says. Gives the purse, the plots watered and the bed's
-- keeping as they are afterwards, and each plant watered in the order it was reached, with how many times over the
-- gifts of whoever poured make its watering.
create or replace function town.pour_row(p_at text, p_keys jsonb, p_plots jsonb, p_bed jsonb, p_rest integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_marks jsonb, p_secs double precision default 0)
returns jsonb language plpgsql stable
as $$
declare
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  plots jsonb := case when jsonb_typeof(p_plots) = 'object' then p_plots else '{}'::jsonb end;
  marks jsonb := case when jsonb_typeof(p_marks) = 'object' then p_marks else '{}'::jsonb end;
  row_ jsonb;
  state jsonb := '{}'::jsonb;
  each jsonb := '[]'::jsonb;
  mine jsonb;
  key text;
  did jsonb;
  others integer;
begin
  if jsonb_typeof(p_keys) is distinct from 'array' then return town.no('none'); end if;
  row_ := town.pour_for(p_at, p_keys, plots, p_purse, p_me, p_now, town.owner_of(bed,
    p_rest + (select count(*) from jsonb_array_elements_text(p_keys) as k(key_) where coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb) > 0, p_now));
  if jsonb_array_length(row_) = 0 then return town.no('none'); end if;
  mine := town.bridged(p_purse, p_secs, p_now);
  for key in select t.key_ from jsonb_array_elements_text(row_) with ordinality as t(key_, ord) order by t.ord loop
    continue when marks->key is distinct from 'true'::jsonb;
    select p_rest + count(*)::int into others from jsonb_array_elements_text(p_keys) as k(key_)
     where k.key_ <> key and coalesce(plots->k.key_->'plant', 'null'::jsonb) <> 'null'::jsonb;
    did := town.tend(key, plots->key, bed, others, p_holds, mine, p_me, p_now, false);
    if not (did->>'ok')::boolean or did->>'deed' <> 'water' then
      if jsonb_array_length(each) = 0 and not (did->>'ok')::boolean then return did; end if;
      exit;
    end if;
    mine := did->'purse';
    bed := did->'bed';
    state := state || jsonb_build_object(key, did->'plot');
    each := each || jsonb_build_array(jsonb_build_object('key', key, 'crop', plots->key->'plant'->'crop', 'times', coalesce(did->'times', '1'::jsonb)));
  end loop;
  return jsonb_build_object('ok', true, 'purse', mine, 'plots', state, 'each', each)
    || case when bed is null then '{}'::jsonb else jsonb_build_object('bed', bed) end;
end;
$$;

-- A plot as it is kept after a watering with a can (lib/town/helping's pouredAs), written at p_now over what it
-- was: what the watering added is made the more by the gifts of whoever watered (p_times) and by the heat and the
-- well's water (p_hot, p_kind), never to more than the catalog's `most` times where a gift has a hand in it; under
-- the moon's water the plant is kept from pests, as ever; and the plant remembers the watering (`pour`). What is no
-- watering is given back as it is.
create or replace function town.poured_as(p_was jsonb, p_next jsonb, p_now bigint, p_hot boolean, p_kind text, p_by text, p_times double precision default 1, p_worn boolean default false)
returns jsonb language plpgsql stable
as $$
declare
  a jsonb := coalesce(p_was->'plant', 'null'::jsonb);
  b jsonb := coalesce(p_next->'plant', 'null'::jsonb);
  k jsonb := town.cat('waters');
  base double precision;
  more double precision;
  x double precision;
  hours double precision;
begin
  if jsonb_typeof(a) is distinct from 'object' or jsonb_typeof(b) is distinct from 'object' then return p_next; end if;
  if (a->'sown') is distinct from (b->'sown') or (b->>'watered')::numeric <> p_now or (a->>'watered')::numeric >= p_now then return p_next; end if;
  base := (b->>'boost')::double precision - (a->>'boost')::double precision;
  if not coalesce(base > 0, false) then return p_next; end if;
  more := (case when coalesce(p_hot, false) then (town.cat('heat')->>'by')::double precision else 0 end) + coalesce((k->'adds'->>p_kind)::double precision, 0);
  x := case when coalesce(p_times, 1) > 1
    then greatest(1 + more, least((town.cat('farming')->'helping'->>'most')::double precision, p_times * (1 + more))) else 1 + more end;
  hours := coalesce((k->'guards'->>p_kind)::double precision, 0);
  return p_next || jsonb_build_object('plant', b || jsonb_build_object(
    -- (with no gift in it the sum is the heat's own: what was added, and so much of it again)
    'boost', case when coalesce(p_times, 1) > 1 then to_jsonb((a->>'boost')::double precision + base * x)
                  when more <> 0 then to_jsonb((b->>'boost')::double precision + base * more) else b->'boost' end,
    'guard', case when hours > 0 then to_jsonb(greatest((b->>'guard')::bigint, p_now + (hours * 3600000)::bigint)) else b->'guard' end,
    'pour', jsonb_build_object('by', p_by, 'at', p_now, 'base', base, 'x', x) || case when coalesce(p_worn, false) then '{"worn": true}'::jsonb else '{}'::jsonb end));
end;
$$;

-- The nature the well's water has at a moment, if it has one (lib/town/waters): its word, for `town.poured_as`.
create or replace function town.well_kind(p_now bigint)
returns text language sql stable set search_path = public
as $$ select case when jsonb_typeof(w.doc) = 'object' then w.doc->>'kind' end from (select town.well_water_told(p_now) as doc) w $$;

-- The heat and the well's water, as a plot is kept (v133's trigger on town_plots). A watering that whoever watered
-- has reckoned already (v153: `town.poured_as`, the plant's `pour` is of this very moment) is left as it is; any
-- other (a bucket over a bed, the gnome's can) is made the more here, as it always was.
create or replace function town.plot_heat()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  added double precision;
  more double precision := 0;
  w jsonb;
  k jsonb;
  hours double precision;
begin
  begin
    if new.plant is not null and old.plant is not null and jsonb_typeof(new.plant) = 'object' and jsonb_typeof(old.plant) = 'object'
       and (new.plant->>'sown') = (old.plant->>'sown')
       and (new.plant->>'watered')::bigint = new.changed and (old.plant->>'watered')::bigint < new.changed
       and (new.plant->'pour'->>'at') is distinct from new.changed::text then
      added := (new.plant->>'boost')::double precision - (old.plant->>'boost')::double precision;
      if added > 0 then
        if town.hot(new.changed) then more := more + (town.cat('heat')->>'by')::double precision; end if;
        w := town.well_water_told(new.changed);
        if jsonb_typeof(w) = 'object' then
          k := town.cat('waters');
          more := more + coalesce((k->'adds'->>(w->>'kind'))::double precision, 0);
          hours := coalesce((k->'guards'->>(w->>'kind'))::double precision, 0);
          if hours > 0 then
            new.plant := new.plant || jsonb_build_object('guard', greatest((new.plant->>'guard')::bigint, new.changed + (hours * 3600000)::bigint));
          end if;
        end if;
        if more > 0 then
          new.plant := new.plant || jsonb_build_object('boost', (new.plant->>'boost')::double precision + added * more);
        end if;
      end if;
    end if;
  exception when others then
    raise warning 'the heat and the well''s water missed plot %,%: %', new.x, new.y, sqlerrm;
  end;
  return new;
end;
$$;

-- The duet bell, as a bed is kept after a watering (lib/town/helping's ring). p_bed: every plot of the bed as it
-- now is, the plots just watered among them; p_watered: the plots p_me watered at this moment; p_wears: whether p_me
-- wears the bell in a bed that is not their own; p_may: the friends whose purses are held (null: everybody). Gives
-- the plots it made the more as they now are, which of them are p_me's own waterings, each friend's that it doubled
-- now by who they are, and every friend it rang with (`near`); or null, when no bell rings.
create or replace function town.ring(p_bed jsonb, p_watered jsonb, p_me text, p_wears boolean, p_now bigint, p_may jsonb default null)
returns jsonb language plpgsql stable
as $$
declare
  h jsonb := town.cat('farming')->'helping';
  within numeric := (h->'bell'->>'within')::numeric * 1000;
  twice double precision := (town.cat('gifts')->'gifts'->'charmBell'->>'by')::double precision;
  most double precision := (h->>'most')::double precision;
  bed jsonb := case when jsonb_typeof(p_bed) = 'object' then p_bed else '{}'::jsonb end;
  fresh jsonb;
  mine text[];
  theirs text[];
  plots jsonb := '{}'::jsonb;
  pals jsonb := '{}'::jsonb;
  k text;
  p jsonb;
  m jsonb;
  x double precision;
begin
  -- every plant of the bed watered with a can within the ten seconds: its plot, and what it remembers of the watering
  select coalesce(jsonb_object_agg(q.key, q.pour), '{}'::jsonb) into fresh
    from (
      select e.key, e.value->'plant'->'pour' as pour,
             case when jsonb_typeof(e.value->'plant'->'pour'->'at') = 'number' then (e.value->'plant'->'pour'->>'at')::numeric end as at
        from jsonb_each(bed) e
       where jsonb_typeof(e.value->'plant'->'pour') = 'object' and (e.value->'plant'->'pour'->'at') = (e.value->'plant'->'watered')
    ) q
   where p_now >= q.at and p_now - q.at <= within;
  select array_agg(w.key_ order by split_part(w.key_, ',', 1)::int, split_part(w.key_, ',', 2)::int) into mine
    from jsonb_array_elements_text(case when jsonb_typeof(p_watered) = 'array' then p_watered else '[]'::jsonb end) as w(key_)
   where fresh ? w.key_ and fresh->w.key_->>'by' = p_me and (fresh->w.key_->'bell') is distinct from 'true'::jsonb;
  if mine is null then return null; end if;
  select array_agg(e.key order by split_part(e.key, ',', 1)::int, split_part(e.key, ',', 2)::int) into theirs
    from jsonb_each(fresh) e
   where e.value->>'by' <> p_me and (p_may is null or jsonb_typeof(p_may) <> 'array' or p_may ? (e.value->>'by'));
  if theirs is null or not (coalesce(p_wears, false) or exists (select 1 from unnest(theirs) as t(key_) where fresh->t.key_->'worn' = 'true'::jsonb)) then return null; end if;
  foreach k in array mine || theirs loop
    m := fresh->k;
    -- (a friend's watering a bell has rung for already is not doubled again: it only says that the friend is there)
    continue when m->>'by' <> p_me and m->'bell' = 'true'::jsonb;
    p := bed->k->'plant';
    x := greatest((m->>'x')::double precision, least(most, (m->>'x')::double precision * twice));
    plots := plots || jsonb_build_object(k, (bed->k) || jsonb_build_object('plant', p || jsonb_build_object(
      'boost', (p->>'boost')::double precision + (m->>'base')::double precision * (x - (m->>'x')::double precision),
      'pour', m || jsonb_build_object('x', x, 'bell', true))));
    if m->>'by' <> p_me then pals := pals || jsonb_build_object(m->>'by', coalesce(pals->(m->>'by'), '[]'::jsonb) || to_jsonb(k)); end if;
  end loop;
  return jsonb_build_object('plots', plots, 'mine', to_jsonb(mine), 'pals', pals,
    'near', (select coalesce(jsonb_agg(q.by_ order by q.by_ collate "C"), '[]'::jsonb) from (select distinct fresh->t.key_->>'by' as by_ from unnest(theirs) as t(key_)) q));
end;
$$;

-- What the bell gives back to somebody for so many of their plants it rang over (lib/town/helping's belled): so much
-- stamina a plant, never above the full gauge, and of no more plants in a day than the catalog's bound. Gives the
-- purse, and how much it had back.
create or replace function town.belled(p_purse jsonb, p_plants double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  b jsonb := town.cat('farming')->'helping'->'bell';
  day_ integer := town.day_of(p_now);
  k jsonb := p_purse->'rung';
  had double precision := 0;
  n double precision;
  left_ double precision := town.stamina_of(p_purse, p_now);
  back double precision;
begin
  if k is not null and jsonb_typeof(k) = 'object' and jsonb_typeof(k->'day') = 'number' and jsonb_typeof(k->'n') = 'number' then
    if (k->>'day')::numeric = day_ and (k->>'n')::numeric > 0 then had := floor((k->>'n')::double precision); end if;
  end if;
  n := greatest(0, least(floor(coalesce(p_plants, 0)), (b->>'plants')::double precision - had));
  back := least(n * (b->>'back')::double precision, greatest(0, (town.cat('stamina')->>'max')::double precision - left_));
  if not coalesce(back > 0, false) then return jsonb_build_object('purse', p_purse, 'back', 0); end if;
  return jsonb_build_object('back', back, 'purse', p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', day_, 'left', left_ + back),
    'rung', jsonb_build_object('day', day_, 'n', had + ceil(back / (b->>'back')::double precision))));
end;
$$;

-- A purse told of one more thing a friend's gift did for its member (lib/town/helping's aided): the newest so many
-- are kept, for the page to tell of once.
create or replace function town.aided(p_purse jsonb, p_aid jsonb)
returns jsonb language sql stable
as $$
  select p_purse || jsonb_build_object('aided', (
    select coalesce(jsonb_agg(q.a order by q.ord), '[]'::jsonb)
      from (
        select t.a, t.ord
          from (select e.a, e.ord from jsonb_array_elements(case when jsonb_typeof(p_purse->'aided') = 'array' then p_purse->'aided' else '[]'::jsonb end) with ordinality as e(a, ord)
                 where jsonb_typeof(e.a) = 'object' and jsonb_typeof(e.a->'at') = 'number'
                union all select p_aid, 9223372036854775807) t
         order by t.ord desc limit (town.cat('farming')->'helping'->>'told')::int
      ) q))
$$;

-- Whoever else watered a plant of a bed with a can within the bell's seconds: the friends a watering there now may
-- ring with. Read before the bed is held: their purses are held first.
create or replace function town.bell_pals(p_bed integer, p_me uuid, p_now bigint)
returns uuid[] language sql stable set search_path = public
as $$
  select coalesce(array_agg(distinct q.by_::uuid), '{}'::uuid[])
    from (
      select p.plant->'pour'->>'by' as by_
        from public.town_plots p
       where p.bed = p_bed and jsonb_typeof(p.plant->'pour') = 'object'
         and case when jsonb_typeof(p.plant->'pour'->'at') = 'number' then (p.plant->'pour'->>'at')::numeric end
               >= p_now - (town.cat('farming')->'helping'->'bell'->>'within')::numeric * 1000
    ) q
   where q.by_ ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and q.by_ <> p_me::text
$$;

-- The duet bell after a watering of p_me's in a bed, kept: p_mine is the plots just watered, by their keys, as
-- `town.poured_as` kept them (not written yet); p_purse the purse as the watering left it; p_pals the friends whose
-- purses are held. When it rings: the friends' plants are written as they now are, each friend's purse has its
-- stamina back and is told, both are written down (`bell`: for how many of somebody else's plants, which the
-- helpers' line counts), and what is the caller's to keep is given back: its own plots as they now are, its purse,
-- and what to answer (`bell`: with whom, how many plants, how much stamina back). Null: no bell rang.
create or replace function town.bell_rung(p_me uuid, p_bed integer, p_mine jsonb, p_purse jsonb, p_wears boolean, p_pals uuid[], p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  bed jsonb;
  rang jsonb;
  mine jsonb;
  theirs jsonb;
  pal record;
  k text;
  mates jsonb;
  called text;
begin
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into bed
    from public.town_plots p where p.bed = p_bed;
  rang := town.ring(bed || p_mine, (select coalesce(jsonb_agg(e.key), '[]'::jsonb) from jsonb_each(p_mine) e), p_me::text, p_wears, p_now,
    (select coalesce(jsonb_agg(u.id::text), '[]'::jsonb) from unnest(p_pals) as u(id)));
  if rang is null then return null; end if;
  mates := rang->'near';
  mine := town.belled(p_purse, jsonb_array_length(rang->'mine'), p_now);
  select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') into called from public.profiles pr where pr.id = p_me;
  for pal in select e.key::uuid as id, e.value as keys from jsonb_each(rang->'pals') e order by e.key loop
    for k in select jsonb_array_elements_text(pal.keys) loop
      update public.town_plots p set plant = rang->'plots'->k->'plant', changed = p_now
       where p.x = split_part(k, ',', 1)::integer and p.y = split_part(k, ',', 2)::integer;
    end loop;
    theirs := town.belled(town.purse_of(pal.id, true), jsonb_array_length(pal.keys), p_now);
    perform town.keep_purse(pal.id, town.aided(theirs->'purse', jsonb_build_object('what', 'bell', 'by', p_me::text, 'name', coalesce(called, ''),
      'n', jsonb_array_length(pal.keys), 'at', p_now, 'back', theirs->'back')));
    perform town.note(pal.id, 'bell', null,
      (select count(*) from jsonb_array_elements_text(pal.keys) as t(key_) where bed->t.key_->'plant'->>'by' <> pal.id::text), 0,
      jsonb_build_object('bed', p_bed, 'with', jsonb_build_array(p_me::text), 'plants', jsonb_array_length(pal.keys), 'back', theirs->'back'));
  end loop;
  perform town.note(p_me, 'bell', null,
    (select count(*) from jsonb_array_elements_text(rang->'mine') as t(key_) where (bed || p_mine)->t.key_->'plant'->>'by' <> p_me::text), 0,
    jsonb_build_object('bed', p_bed, 'with', mates, 'plants', jsonb_array_length(rang->'mine'), 'back', mine->'back'));
  return jsonb_build_object(
    'plots', (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(rang->'plots') e where p_mine ? e.key),
    'purse', town.aided(mine->'purse', jsonb_build_object('what', 'bell', 'by', mates->>0,
      'name', coalesce((select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') from public.profiles pr where pr.id::text = mates->>0), ''),
      'n', jsonb_array_length(rang->'mine'), 'at', p_now, 'back', mine->'back')),
    'bell', jsonb_build_object('with', mates, 'plants', jsonb_array_length(rang->'mine'), 'back', mine->'back'));
end;
$$;

-- What something done counts for, on every line it counts on (v149's, with a duet bell that rang: each of somebody
-- else's plants it rang over for whoever it is written down for is a watering's worth more on the helpers' line; and
-- with fae dust sprinkled on somebody else's plant, which is help as feeding one is).
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
returns jsonb language plpgsql stable
as $$
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
  return '[]'::jsonb;
end;
$$;

-- Do to the plot I stand on what the thing in my hand does (v145's, with a watering kept as `town.poured_as` keeps
-- it: the gifts of whoever waters, the heat and the well's water in one sum under their bound, and the plant's own
-- mark of it; and with the duet bell: the purses of whoever watered in the bed within its seconds are held with the
-- caller's, in the order of their ids, before the bed is, and a watering is rung with theirs).
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null, p_sure boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
  end if;
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses);
end;
$$;
revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from public, anon;
grant execute on function public.town_tend(integer, integer, jsonb, boolean) to authenticated;

-- One long pour along the row of somebody else's bed I stand in, with the can in my hand. One deed, one at a time in
-- a bed (as every deed there).
create or replace function public.town_longpour(p_x integer, p_y integer, p_marks jsonb default null, p_timing jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  hand text;
  -- what the browser says of its game: which plants the water reached, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  was jsonb;
  v_x integer;
  v_y integer;
  hot boolean := town.hot(now_);
  kind text := town.well_kind(now_);
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  kept jsonb := '{}'::jsonb;
  after jsonb;
  rang jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  hand := town.hand_of(purse);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.pour_row(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks, coalesce((claims->>'secs')::double precision, 0));
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
  -- the pour, whole: how many plants it watered, and how the browser said its game went
  perform town.note(me, 'longpour', hand, n, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'marks', marks, 'claims', claims));
  -- and each plant watered, its own deed: written down as town_tend writes a watering, so that each is read as one
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    was := plots->(e->>'key')->'plant';
    perform town.note(me, 'water', e->>'crop', 1, 0,
      jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', hand, 'row', true)
        || case when was->>'by' <> me::text then jsonb_build_object('whose', was->>'by') else '{}'::jsonb end);
    -- (kept with what my gifts, the heat and the well's water make of the watering, under their bound)
    kept := kept || jsonb_build_object(e->>'key', town.poured_as(plots->(e->>'key'), did->'plots'->(e->>'key'), now_, hot, kind, me::text, (e->>'times')::double precision, wears));
  end loop;
  after := did->'purse';
  if n > 0 then
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, kept, after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      kept := kept || (rang->'plots');
    end if;
    for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
      update public.town_plots p set plant = kept->(e->>'key')->'plant', changed = now_
       where p.x = split_part(e->>'key', ',', 1)::integer and p.y = split_part(e->>'key', ',', 2)::integer;
    end loop;
    perform town.keep_purse(me, after);
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  -- (the plots as they are kept: with what my gifts, the heat and the well's water made of each watering)
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || case when rang is not null then jsonb_build_object('bell', rang->'bell') else '{}'::jsonb end
    || jsonb_build_object('key', key, 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)),
         'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))), '{}'::jsonb)
                     from public.town_plots p where p.bed = bed_n and did->'plots' ? (p.x::text || ',' || p.y::text)));
end;
$$;
revoke execute on function public.town_longpour(integer, integer, jsonb, jsonb) from public, anon;
grant execute on function public.town_longpour(integer, integer, jsonb, jsonb) to authenticated;

-- The ring of shared strength (lib/town/helping's share): p_mine gives p_theirs so much stamina (the ring's number,
-- or what their gauge has room for, if that is less) and pays a part of what was given. p_far: how many tiles off
-- the friend stands, as the page says (nothing that keeps the game knows where anybody stands). Gives both purses
-- (the wearer's with the day's use counted, the friend's told who gave it), what was given and paid, and how many
-- uses the day has left; or why not.
create or replace function town.share(p_mine jsonb, p_theirs jsonb, p_me text, p_name text, p_far double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  r jsonb := town.cat('farming')->'helping'->'ring';
  day_ integer := town.day_of(p_now);
  has double precision;
  gave double precision;
  paid double precision;
  left_ double precision;
  used jsonb;
begin
  if not town.gift_works(p_mine, 'charmRing') then return town.no('none'); end if;
  if town.used_of(p_mine, 'charmRing', p_now) >= (town.cat('gifts')->'uses'->'charmRing'->>'n')::integer then return town.no('spent'); end if;
  if not coalesce(p_far >= 0 and p_far <= (r->>'reach')::double precision, false) then return town.no('far'); end if;
  has := town.stamina_of(p_theirs, p_now);
  gave := least((town.cat('gifts')->'gifts'->'charmRing'->>'by')::double precision, (town.cat('stamina')->>'max')::double precision - has);
  if not coalesce(gave > 0, false) then return town.no('full'); end if;
  paid := gave * (r->>'part')::double precision;
  left_ := town.stamina_of(p_mine, p_now);
  if left_ < paid then return town.no('weak'); end if;
  used := town.gift_use(p_mine, 'charmRing', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  return jsonb_build_object('ok', true, 'gave', gave, 'paid', paid, 'left', used->'left',
    'mine', (used->'purse') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_ - paid)),
    'theirs', town.aided(p_theirs || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', has + gave)),
      jsonb_build_object('what', 'ring', 'by', p_me, 'name', p_name, 'n', gave, 'at', p_now)));
end;
$$;

-- Give somebody standing near stamina of mine, with the ring I wear. Judged for both purses in the one call, and
-- written down for both (`ring`, mine; `ring_had`, theirs).
create or replace function public.town_ring(p_to uuid, p_far double precision default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
  called text;
begin
  -- (somebody who is of the town and has a purse there: a proved character, or an admin)
  if p_to is null or p_to = me or not exists (
       select 1 from public.town_purses pp join public.profiles p on p.id = pp.member_id
        where pp.member_id = p_to and ((p.character_id is not null and p.character_verified_at is not null) or p.is_admin)) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who give to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_to then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_to, true);
  else
    theirs := town.purse_of(p_to, true);
    mine := town.purse_of(me, true);
  end if;
  select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') into called from public.profiles pr where pr.id = me;
  did := town.share(mine, theirs, me::text, coalesce(called, ''), p_far, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'mine');
    perform town.keep_purse(p_to, did->'theirs');
    perform town.note(me, 'ring', null, (did->>'gave')::numeric, 0, jsonb_build_object('to', p_to, 'paid', did->'paid', 'far', p_far));
    perform town.note(p_to, 'ring_had', null, (did->>'gave')::numeric, 0, jsonb_build_object('by', me));
  end if;
  return town.answer(me, did - 'mine' - 'theirs');
end;
$$;
revoke execute on function public.town_ring(uuid, double precision) from public, anon;
grant execute on function public.town_ring(uuid, double precision) to authenticated;

-- The moment a plant dies of a pest that struck it at p_struck, if nothing rids it of it (lib/town/helping's
-- diesAt): p_kills milliseconds after, not counting the time garden fae dust lay on it (so many hours from each
-- sprinkling: the dust's number). With no dust: p_struck + p_kills, as it always was. Null, of a plant no pest struck.
create or replace function town.dies_at(p_plant jsonb, p_struck bigint, p_kills bigint)
returns bigint language plpgsql stable
as $$
declare
  span numeric;
  t numeric := p_struck;
  left_ numeric := p_kills;
  d numeric;
  from_ numeric;
begin
  if p_struck is null then return null; end if;
  if jsonb_typeof(p_plant->'dust') is distinct from 'array' or jsonb_array_length(p_plant->'dust') = 0 then return p_struck + p_kills; end if;
  span := (town.cat('gifts')->'gifts'->'thingDust'->>'by')::numeric * 3600000;
  for d in select (e.v #>> '{}')::numeric from jsonb_array_elements(p_plant->'dust') as e(v)
            where jsonb_typeof(e.v) = 'number' and (e.v #>> '{}')::numeric + span > p_struck order by 1 loop
    from_ := greatest(d, t);
    -- (it died before this sprinkling)
    exit when from_ - t > left_;
    left_ := left_ - (from_ - t);
    t := greatest(t, d + span);
  end loop;
  return (t + left_)::bigint;
end;
$$;

-- Until when the dust on a plant holds, if it does at a moment (lib/town/helping's dustUntil).
create or replace function town.dust_until(p_plant jsonb, p_now bigint)
returns bigint language sql stable
as $$
  select (max((e.v #>> '{}')::numeric) + k.span)::bigint
    from (select (town.cat('gifts')->'gifts'->'thingDust'->>'by')::numeric * 3600000 as span) k,
         jsonb_array_elements(case when jsonb_typeof(p_plant->'dust') = 'array' then p_plant->'dust' else '[]'::jsonb end) as e(v)
   where jsonb_typeof(e.v) = 'number' and (e.v #>> '{}')::numeric <= p_now and p_now < (e.v #>> '{}')::numeric + k.span
   group by k.span
$$;

-- What a plot shows at a moment (v110's, with the dying clock that fae dust stops: `town.dies_at`).
create or replace function town.see(p_key text, p_plot jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  ends bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  -- (the moment it dies of its pest: so long after it struck, not counting the time fae dust lay on it)
  ends := town.dies_at(p, struck, kills);
  dead := struck is not null and p_now > ends;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then ends else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now));
end;
$$;

-- Which plant with a pest an insect caught rids of it (v126's, with the dying clock that fae dust stops: a plant the
-- dust keeps alive still has its pest, and may be the one).
create or replace function town.rid_pick(p_plots jsonb, p_now bigint, p_pick double precision)
returns text language plpgsql stable
as $$
declare
  kills bigint := (town.cat('farming')->'pests'->>'kills')::bigint * 3600000;
  keys text[];
  n integer;
begin
  select array_agg(e.key order by split_part(e.key, ',', 1)::int, split_part(e.key, ',', 2)::int) into keys
    from jsonb_each(coalesce(p_plots, '{}'::jsonb)) e
   where coalesce(e.value->'plant', 'null'::jsonb) <> 'null'::jsonb
     and p_now <= town.dies_at(e.value->'plant', town.pest_at(e.key, e.value->'plant', p_now), kills);
  n := coalesce(array_length(keys, 1), 0);
  if n = 0 then return null; end if;
  return keys[least(n, greatest(1, floor(coalesce(p_pick, 0) * n)::int + 1))];
end;
$$;

-- Garden fae dust sprinkled on a plant (lib/town/farm's dust): the purse with the day's use counted, the plot as it
-- now is (the plant remembers the sprinkling), how many are left to the day, and until when the dust holds; or why
-- not.
create or replace function town.dust(p_key text, p_purse jsonb, p_plot jsonb, p_me text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  used jsonb;
  kept jsonb;
begin
  if not town.gift_works(p_purse, 'thingDust') then return town.no('none'); end if;
  if town.used_of(p_purse, 'thingDust', p_now) >= (town.cat('gifts')->'uses'->'thingDust'->>'n')::integer then return town.no('spent'); end if;
  if p = 'null'::jsonb or not (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
  if p->>'by' = p_me then return town.no('own'); end if;
  if town.dust_until(p, p_now) is not null then return town.no('running'); end if;
  used := town.gift_use(p_purse, 'thingDust', p_now);
  if not (used->>'ok')::boolean then return town.no(case when used->>'why' = 'spent' then 'spent' else 'none' end); end if;
  -- (the sprinklings it remembers, this one last: the newest so many)
  select coalesce(jsonb_agg(q.v order by q.ord), '[]'::jsonb) into kept
    from (
      select t.v, t.ord
        from (select e.v, e.ord from jsonb_array_elements(case when jsonb_typeof(p->'dust') = 'array' then p->'dust' else '[]'::jsonb end) with ordinality as e(v, ord)
               where jsonb_typeof(e.v) = 'number'
              union all select to_jsonb(p_now), 9223372036854775807) t
       order by t.ord desc limit (town.cat('farming')->'helping'->'dust'->>'kept')::int
    ) q;
  return jsonb_build_object('ok', true, 'left', used->'left', 'purse', used->'purse',
    'until', p_now + ((town.cat('gifts')->'gifts'->'thingDust'->>'by')::numeric * 3600000)::bigint,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('dust', kept)));
end;
$$;

-- Sprinkle my fae dust on the plant in the plot I stand on. Its owner is told who did it, in their own purse (held
-- with mine, in the order of our ids, before the bed is), and has me among those to thank at the picking.
create or replace function public.town_dust(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  whose text;
  owner_ uuid;
  held uuid;
  plot jsonb;
  did jsonb;
begin
  -- (whose the plant is, read before the bed is held: their purse is held with mine)
  select p.plant->>'by' into whose from public.town_plots p where p.x = p_x and p.y = p_y;
  if whose ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then owner_ := whose::uuid; end if;
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = owner_ order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  did := town.dust(key, purse, plot, me::text, now_);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  perform town.keep_purse(me, did->'purse');
  update public.town_plots p set plant = did->'plot'->'plant', changed = now_ where p.x = p_x and p.y = p_y;
  perform town.note(me, 'dust', plot->'plant'->>'crop', 1, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'whose', plot->'plant'->>'by', 'until', did->'until'));
  -- (the plant's owner, if it is still whose it was a moment ago and they have a purse: told who did it; and I am among those who helped this plant)
  if owner_ is not null and plot->'plant'->>'by' = whose then
    if exists (select 1 from public.town_purses pp where pp.member_id = owner_) then
      perform town.keep_purse(owner_, town.aided(town.purse_of(owner_, true), jsonb_build_object('what', 'dust', 'by', me::text,
        'name', coalesce((select coalesce(pr.character_name, pr.display_name, pr.discord_username, '') from public.profiles pr where pr.id = me), ''),
        'n', 1, 'at', now_, 'key', key)));
    end if;
    delete from public.town_plot_help h where h.x = p_x and h.y = p_y and h.owner <> owner_;
    insert into public.town_plot_help (x, y, helper, owner, water, carry) values (p_x, p_y, me, owner_, 0, 0)
      on conflict (x, y, helper) do nothing;
  end if;
  return town.answer(me, did - 'plot') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n));
end;
$$;
revoke execute on function public.town_dust(integer, integer) from public, anon;
grant execute on function public.town_dust(integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The well ──────────────────────────────────────────────────────────────
-- v153, the well's part: what the fourth to the sixth rank of the water carriers' line give (the rules are
-- lib/town/well-gifts.ts again). Tried on top of v153.shared.sql (try-line.mjs); the file for supabase/ is put together
-- from every line's.
--
-- Its numbers are the catalog's: `gifts` (each gift's own: the flask's thirty) and `well` (written over by v153: what
-- else these three go by).

-- ── the flask of living water (rank 4, thingFlask): a drink for a friend ──

-- A tile as it is told, if it is one: two whole numbers (lib/town/well-gifts' tileOf).
create or replace function town.is_tile(p_at jsonb)
returns boolean language plpgsql immutable
as $$
begin
  if p_at is null or jsonb_typeof(p_at) <> 'array' then return false; end if;
  if jsonb_array_length(p_at) <> 2 then return false; end if;
  if jsonb_typeof(p_at->0) <> 'number' or jsonb_typeof(p_at->1) <> 'number' then return false; end if;
  return (p_at->>0)::numeric = trunc((p_at->>0)::numeric) and (p_at->>1)::numeric = trunc((p_at->>1)::numeric);
end;
$$;

-- The drink somebody holds out, as it is kept, if it is kept soundly: to whom, from which tile, until when
-- (toastOf). Lapsed or not: town.drink_take says which.
create or replace function town.toast_of(p_purse jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  t jsonb := p_purse->'toast';
begin
  if t is null or jsonb_typeof(t) <> 'object' then return null; end if;
  if jsonb_typeof(t->'to') is distinct from 'string' or jsonb_typeof(t->'till') is distinct from 'number' then return null; end if;
  if t->>'to' = '' or not town.is_tile(t->'at') then return null; end if;
  return jsonb_build_object('to', t->'to', 'at', t->'at', 'till', t->'till');
end;
$$;

-- Whether somebody has been given a drink in the meal's hours a moment is in (hasDrunk).
create or replace function town.has_drunk(p_purse jsonb, p_now bigint)
returns boolean language plpgsql stable
as $$
declare
  d jsonb := p_purse->'drunk';
begin
  if d is null or jsonb_typeof(d) <> 'object' then return false; end if;
  if jsonb_typeof(d->'k') is distinct from 'number' then return false; end if;
  return (d->>'k')::numeric = town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now);
end;
$$;

-- Hold a drink out to somebody, from the tile one stands on (p_to null: put it away). One at a time (drinkOffer).
create or replace function town.drink_offer(p_purse jsonb, p_me text, p_to text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  till bigint;
begin
  if not town.gift_works(p_purse, 'thingFlask') then return town.no('none'); end if;
  if p_to is null then return jsonb_build_object('ok', true, 'till', null, 'purse', p_purse - 'toast'); end if;
  if p_to = '' or p_to = p_me then return town.no('none'); end if;
  if not town.is_tile(p_at) then return town.no('none'); end if;
  till := p_now + round((town.cat('well')->'drink'->>'waits')::numeric * 1000)::bigint;
  return jsonb_build_object('ok', true, 'till', till,
    'purse', (p_purse - 'toast') || jsonb_build_object('toast', jsonb_build_object('to', p_to, 'at', p_at, 'till', till)));
end;
$$;

-- Drink what somebody holds out to one, from the tile one stands on: both purses as they are afterwards, what the
-- drinker had of it and what its giver had for the giving (drinkTake). Once in a meal's hours for whoever drinks;
-- never above a full gauge; nothing for a gauge that is full.
create or replace function town.drink_take(p_giver jsonb, p_drinker jsonb, p_from text, p_me text, p_at jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('well')->'drink';
  top double precision := (town.cat('stamina')->>'max')::double precision;
  gives double precision := (town.cat('gifts')->'gifts'->'thingFlask'->>'by')::double precision;
  held jsonb := town.toast_of(p_giver);
  day_ integer := town.day_of(p_now);
  mine double precision;
  theirs double precision;
  left_ double precision;
  after_ double precision;
begin
  if p_from = p_me or held is null or not town.gift_works(p_giver, 'thingFlask') then return town.no('none'); end if;
  if held->>'to' <> p_me then return town.no('none'); end if;
  if not ((held->>'till')::numeric > p_now) then return town.no('late'); end if;
  if not town.is_tile(p_at) then return town.no('far'); end if;
  if greatest(abs((p_at->>0)::numeric - (held->'at'->>0)::numeric), abs((p_at->>1)::numeric - (held->'at'->>1)::numeric)) > (k->>'reach')::numeric then return town.no('far'); end if;
  if town.has_drunk(p_drinker, p_now) then return town.no('drunk'); end if;
  mine := town.stamina_of(p_drinker, p_now);
  if mine >= top then return town.no('sated'); end if;
  theirs := town.stamina_of(p_giver, p_now);
  left_ := least(top, mine + gives);
  after_ := least(top, theirs + (k->>'back')::double precision);
  return jsonb_build_object('ok', true, 'got', left_ - mine, 'back', after_ - theirs,
    'giver', (p_giver - 'toast') || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', after_)),
    'drinker', p_drinker || jsonb_build_object('stamina', jsonb_build_object('day', day_, 'left', left_),
      'drunk', jsonb_build_object('k', town.stretch_at('{"n": 1, "per": "meal"}'::jsonb, p_now), 'by', p_from)));
end;
$$;

-- What a member calls: a drink held out to somebody of the town, from the tile they stand on (p_to null: put away).
create or replace function public.town_drink_offer(p_to uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  -- (somebody who is of the town: a proved character, or an admin)
  if p_to is not null and not town.is_member(p_to) then return town.answer(me, town.no('none')); end if;
  did := town.drink_offer(purse, me::text, p_to::text, jsonb_build_array(p_x, p_y), town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if p_to is not null then
      perform town.note(me, 'drink_offer', 'thingFlask', 1, 0, jsonb_build_object('to', p_to, 'at', jsonb_build_array(p_x, p_y)));
    end if;
  end if;
  return town.answer(me, did);
end;
$$;

-- …and the friend drinking it, from the tile they stand on: both purses judged and kept in this one call, and a line
-- written down for each of the two.
create or replace function public.town_drink_take(p_from uuid, p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  mine jsonb;
  theirs jsonb;
  did jsonb;
begin
  -- (somebody who is of the town and has a purse there)
  if p_from is null or p_from = me or not town.is_member(p_from)
     or not exists (select 1 from public.town_purses pp where pp.member_id = p_from) then
    return town.answer(me, town.no('none'));
  end if;
  -- (two who drink to each other at the same moment: the two purses are held in the order of their ids)
  if me < p_from then
    mine := town.purse_of(me, true);
    theirs := town.purse_of(p_from, true);
  else
    theirs := town.purse_of(p_from, true);
    mine := town.purse_of(me, true);
  end if;
  did := town.drink_take(theirs, mine, p_from::text, me::text, jsonb_build_array(p_x, p_y), now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(p_from, did->'giver');
    perform town.keep_purse(me, did->'drinker');
    perform town.note(me, 'drink', 'thingFlask', (did->>'got')::numeric, 0, jsonb_build_object('from', p_from, 'at', jsonb_build_array(p_x, p_y)));
    perform town.note(p_from, 'drink_gave', 'thingFlask', (did->>'back')::numeric, 0, jsonb_build_object('to', me));
  end if;
  return town.answer(me, did - 'giver' - 'drinker');
end;
$$;

-- ── the rain frog (rank 5, famFrog): under rain the bucket its member holds fills by itself ──
-- (What it shows of the sky to come, and its croak before rain, are the page's own to read: public.town_sky tells
-- every page the quarter hours the database has, those to come among them.)

-- The rain fills the empty bucket in somebody's hand: as much as it carries, for no stamina. Only while it rains
-- (p_raining: public.town_rain_fill says, by the weather the database keeps), only with the frog following, and not
-- sooner after the last than this one takes to fill (rainFill).
create or replace function town.rain_fill(p_purse jsonb, p_raining boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  n integer;
begin
  if not town.gift_works(p_purse, 'famFrog') then return town.no('none'); end if;
  if not coalesce(p_raining, false) then return town.no('dry'); end if;
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
  if slot is null then return town.no('hand'); end if;
  n := (f->'buckets'->>hand)::int;
  if jsonb_typeof(p_purse->'rained') = 'number' then
    if p_now - (p_purse->>'rained')::numeric < n * (town.cat('well')->'frog'->>'fills')::numeric * 1000 then return town.no('soon'); end if;
  end if;
  return jsonb_build_object('ok', true, 'n', n, 'can', hand,
    'purse', p_purse || jsonb_build_object('rained', p_now, 'bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', n))));
end;
$$;

-- What a member's page calls when its bucket has stood under the rain long enough. Written down under a word of its
-- own (`rain_fill`: the bucket, how many bucketfuls). The well's book reads deeds by their word and knows none of this
-- one (its trigger on town_deeds names the words it reads: nothing of v127's is written again here), so what the book
-- does for a bucket drawn is done here: nobody's hands are on its water yet, and it has the nature of the moment,
-- which is the rain's.
create or replace function public.town_rain_fill()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.rain_fill(town.purse_of(me, true), town.raining(now_), now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    delete from public.town_line_water l where l.member_id = me and l.item = did->>'can';
    if town.water_kind(now_) is not null then
      insert into public.town_line_water (member_id, item, hands, kind) values (me, did->>'can', '{}', town.water_kind(now_));
    end if;
    perform town.note(me, 'rain_fill', did->>'can', (did->>'n')::numeric, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$$;

-- ── the moon flask (rank 6, thingMoon): water that differs, kept for the moment of its owner's choosing ──

-- The well after so many bucketfuls of a nature are poured in that work so many times as long (lib/town/waters'
-- pouredIn with its `times`): town.well_poured's rule, with the minutes a bucketful keeps the nature and the most both
-- so many times over. More of the nature the well has never shortens what it has.
create or replace function town.well_poured_times(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint, p_times double precision)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  by_ numeric := case when coalesce(p_times, 0) > 0 then p_times::numeric else 1 end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', greatest(v_from, least(p_now + floor((k->>'most')::numeric * by_ * 60000)::bigint, v_from + floor(p_n * (k->>'lasts')::numeric * by_ * 60000)::bigint)));
end;
$$;

-- What a moon flask keeps, if it is kept soundly: a nature there is, and a whole number of bucketfuls from one to what
-- it holds (moonOf). Null for an empty one.
create or replace function town.moon_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  m jsonb := p_purse->'moon';
  n numeric;
begin
  if m is null or jsonb_typeof(m) <> 'object' then return null; end if;
  if jsonb_typeof(m->'kind') is distinct from 'string' or jsonb_typeof(m->'n') is distinct from 'number' then return null; end if;
  if not (town.cat('waters')->'adds' ? (m->>'kind')) then return null; end if;
  n := (m->>'n')::numeric;
  if n <> trunc(n) or n < 1 or n > (town.cat('well')->'moon'->>'holds')::numeric then return null; end if;
  return jsonb_build_object('kind', m->'kind', 'n', n::integer);
end;
$$;

-- Keep the water of the bucket somebody holds in their flask: as many bucketfuls as the flask has room for, the rest
-- stays in the bucket (moonKeep). p_kind is the nature of that water, as the well's book has it; plain water is not
-- kept, nor another nature than the flask has. For nothing.
create or replace function town.moon_keep(p_purse jsonb, p_kind text)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  has jsonb := town.moon_of(p_purse);
  slot integer;
  water integer;
  room integer;
  n integer;
begin
  if not town.gift_works(p_purse, 'thingMoon') then return town.no('none'); end if;
  if hand is null or not (f->'buckets' ? hand) then return town.no('hand'); end if;
  select (x.ord - 1)::int, floor((x.s->>'water')::numeric)::int into slot, water from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null or water < 1 then return town.no('hand'); end if;
  if p_kind is null or not (town.cat('waters')->'adds' ? p_kind) then return town.no('plain'); end if;
  if has is not null and has->>'kind' <> p_kind then return town.no('other'); end if;
  room := (town.cat('well')->'moon'->>'holds')::integer - coalesce((has->>'n')::integer, 0);
  if room < 1 then return town.no('brim'); end if;
  n := least(water, room);
  return jsonb_build_object('ok', true, 'n', n, 'kind', p_kind, 'can', hand,
    'purse', p_purse || jsonb_build_object('moon', jsonb_build_object('kind', p_kind, 'n', coalesce((has->>'n')::integer, 0) + n),
      'bag', jsonb_set(bag, array[slot::text],
        case when water > n then jsonb_build_object('item', hand, 'n', 1, 'water', water - n) else jsonb_build_object('item', hand, 'n', 1) end)));
end;
$$;

-- Pour so many bucketfuls of a flask into the well (all it has, when it has fewer), for a pour's stamina: the purse
-- and the well afterwards, how many were poured, and how many the well had room for (moonPour). What it has no room
-- for runs over. The well's nature is public.town_moon_pour's to keep.
create or replace function town.moon_pour(p_purse jsonb, p_well integer, p_n numeric, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  has jsonb := town.moon_of(p_purse);
  poured integer;
  into_ integer;
  left_ integer;
  spent jsonb;
begin
  if not town.gift_works(p_purse, 'thingMoon') then return town.no('none'); end if;
  if p_n is null then return town.no('amount'); end if;
  if p_n <> trunc(p_n) or p_n < 1 then return town.no('amount'); end if;
  if has is null then return town.no('dry'); end if;
  poured := least(p_n, (has->>'n')::numeric)::integer;
  into_ := greatest(0, least(poured, (f->>'well')::integer - p_well));
  left_ := (has->>'n')::integer - poured;
  spent := town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now) - 'moon';
  return jsonb_build_object('ok', true, 'poured', poured, 'into', into_, 'kind', has->'kind', 'well', p_well + into_,
    'purse', case when left_ > 0 then spent || jsonb_build_object('moon', jsonb_build_object('kind', has->'kind', 'n', left_)) else spent end);
end;
$$;

-- The nature of the water in each bucket of a member's that has one, as the well's book has it (by who holds which
-- thing): what a flask's owner's page asks, to know whether the water in their hand can be kept.
create or replace function town.carried_kinds(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_object_agg(l.item, l.kind), '{}'::jsonb) from public.town_line_water l where l.member_id = p_member and l.kind is not null
$$;

-- What a member's page calls: what water their buckets have; that water kept in the flask; the flask poured into the
-- well from one of the tiles about it.
create or replace function public.town_moon()
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.member();
begin
  return jsonb_build_object('now', town.now_ms(), 'carried', town.carried_kinds(me));
end;
$$;

create or replace function public.town_moon_keep()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  hand text := town.hand_of(purse);
  kind text := (select l.kind from public.town_line_water l where l.member_id = me and l.item = hand);
  did jsonb := town.moon_keep(purse, kind);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'moon_keep', did->>'can', (did->>'n')::numeric, 0, jsonb_build_object('kind', did->'kind', 'flask', did->'purse'->'moon'->'n'));
  end if;
  return town.answer(me, did) || jsonb_build_object('carried', town.carried_kinds(me));
end;
$$;

create or replace function public.town_moon_pour(p_x integer, p_y integer, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  well integer;
  did jsonb;
  water jsonb;
begin
  -- (at the well, as a bucket is poured: on one of the tiles about it)
  if p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) <> 1 then return town.answer(me, town.no('none')); end if;
  well := (town.thing('well', true) #>> '{}')::int;
  did := town.moon_pour(purse, well, p_n, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
    -- the well takes the flask's nature from all that was poured, so many times as long as a bucket's
    water := town.well_poured_times(town.thing('well_water', true), did->>'kind', (did->>'poured')::integer, me, now_,
      (town.cat('gifts')->'gifts'->'thingMoon'->>'by')::double precision);
    perform town.keep_thing('well_water', coalesce(water, 'null'::jsonb));
    -- what went into the well is a bucketful poured like any other in the well's book, which reads that word (the
    -- flask is no bucket of anybody's line: nobody else is counted it, and the book gives the well no nature of it)
    if (did->>'into')::int > 0 then
      perform town.note(me, 'pour', 'thingMoon', (did->>'into')::numeric, 0, jsonb_build_object('well', did->'well', 'flask', true));
    end if;
    perform town.note(me, 'moon_pour', did->>'kind', (did->>'poured')::numeric, 0, jsonb_build_object('well', did->'well', 'into', did->'into', 'until', water->'until'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well), 'wellWater', town.well_water_told(now_));
end;
$$;

-- The well after so many bucketfuls of a nature are poured in (v133's, as the database has it but for one line): more
-- of the nature the well has never shortens what it has of it. (It could not, while a bucket's most was the only most;
-- with a flask's water in the well, a bucket of the same poured after it would have cut its hours to two.)
CREATE OR REPLACE FUNCTION town.well_poured(p_was jsonb, p_kind text, p_n integer, p_by uuid, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb := town.cat('waters');
  has jsonb := case when p_was is not null and jsonb_typeof(p_was) = 'object' and (p_was->>'until')::bigint > p_now then p_was end;
  v_from bigint;
begin
  if p_kind is null or coalesce(p_n, 0) <= 0 then return has; end if;
  v_from := case when has is not null and has->>'kind' = p_kind then (has->>'until')::bigint else p_now end;
  return jsonb_build_object('kind', p_kind, 'by', p_by,
    'until', greatest(v_from, least(p_now + (k->>'most')::bigint * 60000, v_from + p_n::bigint * (k->>'lasts')::bigint * 60000)));
end;
$function$;

-- (the deeds' Thai words, town.deed_th, are in v153.shared.sql with every line's: the well's six among them)

revoke execute on function public.town_drink_offer(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_offer(uuid, integer, integer) to authenticated;
revoke execute on function public.town_drink_take(uuid, integer, integer) from public, anon;
grant execute on function public.town_drink_take(uuid, integer, integer) to authenticated;
revoke execute on function public.town_rain_fill() from public, anon;
grant execute on function public.town_rain_fill() to authenticated;
revoke execute on function public.town_moon() from public, anon;
grant execute on function public.town_moon() to authenticated;
revoke execute on function public.town_moon_keep() from public, anon;
grant execute on function public.town_moon_keep() to authenticated;
revoke execute on function public.town_moon_pour(integer, integer, integer) from public, anon;
grant execute on function public.town_moon_pour(integer, integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The farm's well holds more, and a can takes two bucketfuls of it ──────
-- The farm's well, and what a can takes of it (the owner, 2026-10-07, trying the gifts: "บ่อน้ำเปลี่ยนจาก เต็ม 40 เป็น 100",
-- "ตอนนี้ 1 น้ำในบ่อต่อบัวได้กี่ครั้ง ลดลงมาครึ่งนึง"). The well holds a hundred bucketfuls where it held forty: that is the
-- catalog's number (`farming.well`), which every rule here reads already. A can's filling takes two bucketfuls where it
-- took one (`farming.fill`), so a bucketful of the well's water is four waterings of a plain can, six of a copper one,
-- nine of a brass one; a well with one bucketful left gives half a can. What is written down of a filling is how many
-- bucketfuls it took, and the well's book takes as many of its oldest water, so that the book and the well agree.

-- A chore done (lib/town/farm's chore): v110's as the database has it, but for the can's filling.
create or replace function town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  what text := town.chore_for(p_purse, p_where, p_well);
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  has integer;
  pours integer;
  needs integer;
begin
  if what is null or hand is null then return town.no('none'); end if;
  if what = 'draw' then
    select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well,
      'purse', town.spend(p_purse, (f->'chores'->>'draw')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', (f->'buckets'->>hand)::int
          + (case when town.has_buff(p_purse, p_now, 'carry') then (town.wishing()->>'carry')::int else 0 end)))));
  end if;
  if what = 'pour' then
    -- as much of it as the well has room for; the rest stays in the bucket
    select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) <> 0 order by x.ord limit 1;
    pours := least(has, (f->>'well')::int - p_well);
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well + pours,
      'purse', town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text],
             case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
  end if;
  -- a can's filling takes so many bucketfuls of the well's water (the catalog's `fill`; one where it says none), however
  -- much was left in the can. A well that has fewer gives what it has, and the can so much of a filling more
  if p_well < 1 then return town.no('dry'); end if;
  select (x.ord - 1)::int, coalesce((x.s->>'water')::numeric, 0)::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric order by x.ord limit 1;
  needs := greatest(1, coalesce((f->>'fill')::int, 1));
  pours := least(needs, p_well);
  return jsonb_build_object('ok', true, 'chore', what, 'well', p_well - pours,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water',
           case when pours >= needs then (f->'cans'->>hand)::int
                else least((f->'cans'->>hand)::int, has + floor((f->'cans'->>hand)::numeric * pours / needs)::int) end))));
end;
$$;

-- What a member calls for a chore: as the database has it, but that a filling is written down with the bucketfuls it took.
create or replace function public.town_chore(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  at_ text := case
    when greatest(abs(p_x - (f->'wellAt'->>0)::int), abs(p_y - (f->'wellAt'->>1)::int)) = 1 then 'well'
    when town.cat('fishing')->'places' ? (p_x::text || ',' || p_y::text) then 'river' end;
  well integer;
  did jsonb;
begin
  if at_ is null then return town.answer(me, town.no('none')); end if;
  -- (the well is held only by somebody at it: drawing at the river does not touch it)
  well := (town.thing('well', at_ = 'well') #>> '{}')::int;
  did := town.chore(purse, at_, well, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'well')::int <> well then perform town.keep_thing('well', did->'well'); end if;
    -- (how much: the bucketfuls poured into the well, or drawn at the river, or taken from the well by a can)
    perform town.note(me, did->>'chore', town.hand_of(purse),
      case did->>'chore' when 'pour' then (did->>'well')::numeric - well when 'draw' then (f->'buckets'->>town.hand_of(purse))::numeric
        + (case when town.has_buff(purse, now_, 'carry') then (town.wishing()->>'carry')::numeric else 0 end) else well - (did->>'well')::numeric end,
      0, jsonb_build_object('well', did->'well'));
  end if;
  return town.answer(me, did) || jsonb_build_object('well', coalesce((did->>'well')::int, well));
end;
$$;

-- The well's book (lib/town/well's seen): as the database has it, but that a filling takes as many bucketfuls of the
-- oldest water as it took of the well.
create or replace function town.well_seen(p_member uuid, p_at bigint, p_what text, p_thing text, p_n numeric, p_doc jsonb)
returns void language plpgsql set search_path = public
as $$
declare
  v_n integer;
  v_lot bigint;
  v_lot_by uuid;
  v_from uuid;
  v_lot_has integer;
  v_can text;
  v_carrier uuid;
  v_waterings integer;
  v_owner uuid;
  v_x integer;
  v_y integer;
  v_to uuid;
  v_hands uuid[];
  v_most integer;
  v_kind text;
begin
  if p_member is null then return; end if;
  if p_what = 'pour' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_well_water (member_id, buckets) values (p_member, v_n);
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
    -- (water with a nature gives it to the well for a while)
    select l.kind into v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    if v_kind is not null then
      perform town.keep_thing('well_water', coalesce(town.well_poured(town.thing('well_water', true), v_kind, v_n, p_member, p_at), 'null'::jsonb));
    end if;
  elsif p_what in ('ditch', 'yard') then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 or (p_what = 'ditch' and p_thing is null) then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
    if p_what = 'ditch' then
      insert into public.town_well_cans (member_id, item, carrier, waterings)
        values (p_member, p_thing, p_member, greatest(0, floor(coalesce((p_doc->>'plants')::numeric, 0))::integer))
        on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
    else
      insert into public.town_yard_water (member_id, buckets) values (p_member, v_n);
    end if;
    perform town.line_counted(p_member, p_thing, v_n, p_at, p_what);
  elsif p_what = 'line' then
    v_n := floor(coalesce(p_n, 0))::integer;
    if v_n <= 0 then return; end if;
    insert into public.town_carriers (member_id, buckets) values (p_member, v_n)
      on conflict (member_id) do update set buckets = public.town_carriers.buckets + excluded.buckets;
  elsif p_what = 'draw' then
    if p_thing is not null then
      delete from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
      -- (the nature of the moment it was drawn at, when it has one: nobody's hands are on it yet)
      v_kind := town.water_kind(p_at);
      if v_kind is not null then
        insert into public.town_line_water (member_id, item, hands, kind) values (p_member, p_thing, '{}', v_kind);
      end if;
    end if;
  elsif p_what = 'pass' then
    v_to := (p_doc->>'to')::uuid;
    if p_thing is null or v_to is null or p_doc->>'into' is null or floor(coalesce(p_n, 0)) <= 0 then return; end if;
    select l.hands, l.kind into v_hands, v_kind from public.town_line_water l where l.member_id = p_member and l.item = p_thing;
    -- (whoever takes it is the last of them, once; only the last so many are remembered; a bucket nobody's hands were on yet begins with its giver's)
    v_hands := array_remove(case when coalesce(cardinality(v_hands), 0) = 0 then array[p_member] else v_hands end, v_to) || v_to;
    v_most := (town.cat('line')->>'hands')::integer;
    if array_length(v_hands, 1) > v_most then v_hands := v_hands[array_length(v_hands, 1) - v_most + 1:]; end if;
    -- (the water's nature goes with it)
    insert into public.town_line_water (member_id, item, hands, kind) values (v_to, p_doc->>'into', v_hands, v_kind)
      on conflict (member_id, item) do update set hands = excluded.hands, kind = excluded.kind;
  elsif p_what = 'fresh' then
    select w.id, w.member_id, w.buckets into v_lot, v_lot_by, v_lot_has from public.town_yard_water w order by w.id limit 1 for update;
    if v_lot is null then return; end if;
    if v_lot_has > 1 then update public.town_yard_water w set buckets = w.buckets - 1 where w.id = v_lot;
    else delete from public.town_yard_water w where w.id = v_lot; end if;
    if v_lot_by is null or v_lot_by = p_member then return; end if;
    insert into public.town_yard_reach (day, carrier, cook, n) values (town.day_of(p_at), v_lot_by, p_member, 1)
      on conflict (day, carrier, cook) do update set n = public.town_yard_reach.n + 1;
  elsif p_what = 'fill' then
    if p_thing is null then return; end if;
    -- (so many bucketfuls of the oldest water there is: as many as the filling took of the well, one where the deed
    --  says none; the can's water is of whoever carried the oldest of them)
    for v_i in 1..greatest(1, floor(coalesce(p_n, 1))::integer) loop
      select w.id, w.member_id, w.buckets into v_lot, v_from, v_lot_has from public.town_well_water w order by w.id limit 1 for update;
      exit when v_lot is null;
      if v_i = 1 then v_lot_by := v_from; end if;
      if v_lot_has > 1 then update public.town_well_water w set buckets = w.buckets - 1 where w.id = v_lot;
      else delete from public.town_well_water w where w.id = v_lot; end if;
    end loop;
    insert into public.town_well_cans (member_id, item, carrier, waterings)
      values (p_member, p_thing, v_lot_by, coalesce((town.cat('farming')->'cans'->>p_thing)::integer, 0))
      on conflict (member_id, item) do update set carrier = excluded.carrier, waterings = excluded.waterings;
  elsif p_what = 'water' then
    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);
    if jsonb_typeof(p_doc->'tile') = 'array' then
      v_x := (p_doc->'tile'->>0)::integer;
      v_y := (p_doc->'tile'->>1)::integer;
    end if;
    if v_owner <> p_member and v_x is not null then
      -- (a plant of somebody else's than the one the plot's helpers helped: theirs are forgotten)
      delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
      insert into public.town_plot_help (x, y, helper, owner, water) values (v_x, v_y, p_member, v_owner, 1)
        on conflict (x, y, helper) do update set water = public.town_plot_help.water + 1;
    end if;
    v_can := p_doc->>'with';
    if v_can is null then return; end if;
    select c.carrier, c.waterings into v_carrier, v_waterings from public.town_well_cans c where c.member_id = p_member and c.item = v_can for update;
    if v_waterings is null or v_waterings <= 0 then return; end if;
    update public.town_well_cans c set waterings = c.waterings - 1 where c.member_id = p_member and c.item = v_can;
    if v_carrier is null or v_carrier = v_owner or v_x is null then return; end if;
    insert into public.town_well_reach (day, carrier, x, y, owner, n)
      values (town.day_of(p_at), v_carrier, v_x, v_y, v_owner, 1)
      on conflict (day, carrier, x, y) do update set n = public.town_well_reach.n + 1, owner = excluded.owner;
    delete from public.town_plot_help h where h.x = v_x and h.y = v_y and h.owner <> v_owner;
    insert into public.town_plot_help (x, y, helper, owner, carry) values (v_x, v_y, v_carrier, v_owner, 1)
      on conflict (x, y, helper) do update set carry = public.town_plot_help.carry + 1;
  elsif p_what = 'sow' then
    if jsonb_typeof(p_doc->'tile') = 'array' then
      delete from public.town_plot_help h where h.x = (p_doc->'tile'->>0)::integer and h.y = (p_doc->'tile'->>1)::integer;
    end if;
  end if;
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The deck ──────────────────────────────────────────────────────────────
-- v153, the fishing deck's part: the gifts of its second to sixth ranks, and the game made harder to match.
-- Tried on top of v153.shared.sql (try-line.mjs); the rules are lib/town/fishing.ts again, held to it by the cases
-- of lib/town/db-vectors-gifts-fishing.test.ts. Safe to run twice.
--
-- It needs two catalog rows as the code has them now: `gifts` (every line's) and `fishing` (new keys: pair, orb,
-- star, wary, bouts; nothing that was there is changed).
--
-- New (schema town): drive_back, sift, hook_baits, cast_from, strike_two, land_one, orb_of, orb_light, under_orb,
--   star_odds, hook_star, shelf_top, is_wary, took_up, bouts_of, harder_of, bigger, least_ms.
-- New (what a member calls): public.town_orb(text).
-- Written again, each from its text in live/functions-v152.sql:
--   town.cast_line     its body is town.cast_from's now, which is handed the odds; it hands that a bait's own.
--   public.town_cast   a fifth argument, p_how ('pair', 'star'); the function of four arguments is dropped.
--   public.town_strike a rod of two lines, a told line let go by counted, and `harder` said to the page.
--   public.town_land   the otter, one of two fish ended, a line pulled up counted, a landing held to town.least_ms.
-- No table, no column: what the gifts keep is in the purse's document (orb, wary) and in the line's (two, again,
-- told, harder, orb). No coins and no thing that can be sold comes of any of it.

-- ─── The rules ───────────────────────────────────────────────────────────

-- The otter (famOtter, the second rank): a fish that got away in the fight is driven back for one more fight
-- (lib/town/fishing's driveBack): a line snapped or a hook slipped, once to a line, and counted so many times to a
-- meal's hours.
create or replace function town.drive_back(p_purse jsonb, p_how text, p_again boolean, p_now bigint)
returns jsonb language sql stable
as $$
  select case when coalesce(p_again, false) or p_how is null or p_how not in ('snapped', 'slipped') then town.no('none')
    else town.gift_use(p_purse, 'famOtter', p_now) end
$$;

-- What may take a bait, without the fish of some tiers (lib/town/fishing's sift): each share of what is left, of
-- what is left. (What is no fish is of no tier, and stays.)
create or replace function town.sift(p_odds jsonb, p_tiers text[])
returns jsonb language plpgsql stable
as $$
declare
  fish jsonb := town.cat('fish');
  o jsonb;
  kept jsonb := '[]'::jsonb;
  total double precision := 0;
  left_ jsonb := '[]'::jsonb;
begin
  for o in select t.e from jsonb_array_elements(p_odds) with ordinality as t(e, ord) order by t.ord loop
    continue when fish->(o->>'what')->>'tier' = any(coalesce(p_tiers, '{}'::text[]));
    kept := kept || jsonb_build_array(o);
    total := total + (o->>'p')::double precision;
  end loop;
  for o in select t.e from jsonb_array_elements(kept) with ordinality as t(e, ord) order by t.ord loop
    left_ := left_ || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision / total));
  end loop;
  return left_;
end;
$$;

-- So many of a bait put on hooks at once (lib/town/fishing's hookBaits): a rod of two lines takes two. As
-- town.hook_bait is for one.
create or replace function town.hook_baits(p_purse jsonb, p_bait text, p_n integer)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  n integer := greatest(1, coalesce(p_n, 1));
begin
  if not exists (select 1 from jsonb_array_elements_text(cat->'rods') r where town.held(p_purse->'bag', r) > 0) then return town.no('tool'); end if;
  if not cat->'baits' ? p_bait or town.held(p_purse->'bag', p_bait) < n then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse',
    case when cat->'kept' ? p_bait then p_purse else p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_bait, n)) end);
end;
$$;

-- A line dropped, from what may take it however that was reckoned (lib/town/fishing's castFrom): town.cast_line's
-- own body (v122's), with the odds handed to it.
create or replace function town.cast_from(p_odds jsonb, p_rnd double precision[])
returns jsonb language plpgsql stable
as $$
declare
  odds jsonb := p_odds;
  n integer := jsonb_array_length(odds);
  apart integer := (town.cat('fishing')->>'apart')::int;
  k integer := 2;
  r double precision := p_rnd[1];
  what text := odds->(n - 1)->>'what';
  fish jsonb;
  span jsonb;
  wait integer;
  many integer := 0;
  nibbles integer[] := '{}';
  at_ integer;
  big double precision;
  size double precision := 0;
  i integer;
begin
  for i in 0..n - 1 loop
    if r < (odds->i->>'p')::double precision then what := odds->i->>'what'; exit; end if;
    r := r - (odds->i->>'p')::double precision;
  end loop;
  fish := town.cat('fish')->what;
  span := coalesce(fish->'wait', town.cat('flotsam')->what->'wait');
  wait := floor((span->>0)::double precision + ((span->>1)::double precision - (span->>0)::double precision) * p_rnd[k] + 0.5::double precision)::int;
  k := k + 1;
  -- a fish may nibble once or twice first; what is no fish only drifts onto the hook
  if fish is not null then
    many := case when p_rnd[k] < 0.3 then 0 when p_rnd[k] < 0.75 then 1 else 2 end;
    k := k + 1;
  end if;
  for i in 1..many loop
    at_ := floor((0.25::double precision + 0.6::double precision * p_rnd[k]) * wait + 0.5::double precision)::int;
    k := k + 1;
    if at_ >= apart and wait - at_ >= apart and not exists (select 1 from unnest(nibbles) x where abs(x - at_) < apart) then
      nibbles := nibbles || at_;
    end if;
  end loop;
  -- most are small: the roll is multiplied by itself
  if fish is not null then
    big := p_rnd[k];
    size := floor(((fish->'size'->>0)::double precision + ((fish->'size'->>1)::double precision - (fish->'size'->>0)::double precision) * (big * big)) * 10 + 0.5::double precision)
      / 10::double precision;
  end if;
  return jsonb_build_object('what', what, 'wait', wait, 'size', size,
    'nibbles', (select coalesce(jsonb_agg(x order by x), '[]'::jsonb) from unnest(nibbles) x));
end;
$$;

-- town.cast_line(...): v122's, its body now town.cast_from's: it hands that a bait's own odds.
CREATE OR REPLACE FUNCTION town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
begin
  return town.cast_from(town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs, p_luck), p_rnd);
end;
$function$;

-- ─── A rod of two lines (thingRod, the third rank) ───────────────────────

-- The strike of a rod of two lines: each of the two is hooked by it. What is no fish comes in at once, as ever; a
-- fish is to be fought, and its fight is paid for, each its own. With one fish on, the line is a line as any other
-- from here; with two, the second waits in `two` (town.land_one ends them one at a time).
create or replace function town.strike_two(p_member uuid, p_purse jsonb, p_line jsonb, p_reaction integer, p_spent boolean, p_play jsonb, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  purse jsonb := p_purse;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size'), p_line->'two');
  thing jsonb;
  fish jsonb;
  landed jsonb;
  told jsonb := '[]'::jsonb;
  onhook jsonb := '[]'::jsonb;
  i integer;
begin
  for i in 0..1 loop
    thing := things->i;
    fish := town.cat('fish')->(thing->>'what');
    if fish is null then
      landed := town.land_catch(purse, thing->>'what', 0);
      purse := landed->'purse';
      perform town.record(p_member, 'fishing', true, 0, p_spent, town.buff_of(p_purse, p_now),
        p_play || jsonb_build_object('what', thing->'what', 'size', 0, 'how', 'landed', 'kept', landed->'kept', 'record', false, 'pair', i));
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
    else
      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);
      onhook := onhook || jsonb_build_array(thing);
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', thing->'size', 'landed', false));
    end if;
  end loop;
  perform town.keep_purse(p_member, purse);
  if jsonb_array_length(onhook) = 0 then
    delete from public.town_lines where member_id = p_member;
  else
    update public.town_lines set doc = (p_line - 'two')
        || jsonb_build_object('what', onhook->0->'what', 'size', onhook->0->'size', 'struck_at', p_now, 'reaction', p_reaction, 'spent', p_spent, 'paired', true)
        || case when jsonb_array_length(onhook) = 2 then jsonb_build_object('two', onhook->1) else '{}'::jsonb end, updated_at = now()
     where member_id = p_member;
  end if;
  return jsonb_build_object('ok', true, 'hooked', true, 'what', told->0->'what', 'size', told->0->'size',
    'landed', jsonb_array_length(onhook) = 0, 'kept', told->0->'kept', 'pair', told)
    || case when p_line ? 'harder' then jsonb_build_object('harder', p_line->'harder') else '{}'::jsonb end;
end;
$$;

-- One of two fish still on a rod of two lines has ended (the page says which: the first, or `which` 1 for the
-- second): landed, or lost, as town_land ends any fish, and written down as a go of its own. The other is on still:
-- the line is a line as any other from here, with that fish.
create or replace function town.land_one(p_member uuid, p_purse jsonb, p_line jsonb, p_how text, p_fight jsonb, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  cat jsonb := town.cat('fishing');
  second boolean := coalesce(p_fight->>'which', '0') = '1';
  first jsonb := jsonb_build_object('what', p_line->'what', 'size', p_line->'size');
  mine jsonb := case when second then p_line->'two' else first end;
  other jsonb := case when second then first else p_line->'two' end;
  fish jsonb := town.cat('fish')->(mine->>'what');
  how text := p_how;
  took bigint := p_now - (p_line->>'struck_at')::bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))
      or took > (cat->>'longest')::bigint * 1000) then
    how := 'slipped';
    suspect := true;
  end if;
  if how = 'landed' then
    landed := town.land_catch(p_purse, mine->>'what', (mine->>'size')::double precision);
    perform town.keep_purse(p_member, landed->'purse');
  elsif not suspect then
    back := town.back_bait(case when how = 'snapped' then town.lose_bait(p_purse, p_line->>'bait') else p_purse end, p_line->>'bait');
    perform town.keep_purse(p_member, back);
  end if;
  update public.town_lines set doc = (p_line - 'two') || jsonb_build_object('what', other->'what', 'size', other->'size'), updated_at = now() where member_id = p_member;
  perform town.record(p_member, 'fishing', how = 'landed', took / 1000.0, coalesce((p_line->>'spent')::boolean, false), town.buff_of(p_purse, p_now), jsonb_build_object(
    'how', how, 'place', case when (p_line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(p_line->'x', p_line->'y'),
    'bait', p_line->'bait', 'hour', p_line->'hour', 'what', mine->'what', 'size', mine->'size', 'wait', p_line->'wait',
    'nibbles', jsonb_array_length(p_line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect, 'pair', case when second then 1 else 0 end,
    'claims', jsonb_build_object('rain', p_line->'rain', 'reaction', p_line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return jsonb_build_object('ok', true, 'how', how, 'what', mine->'what', 'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);
end;
$$;

-- ─── A sky orb (thingOrb, the fifth rank) ─────────────────────────────────

-- The sky an orb has lit for somebody now (lib/town/fishing's orbOf): one of those there are, while it lasts.
create or replace function town.orb_of(p_purse jsonb, p_now bigint)
returns text language sql stable
as $$
  -- (what is kept is looked at before it is read as a number: a sky kept wrongly is no sky)
  select case when jsonb_typeof(p_purse->'orb') = 'object' and jsonb_typeof(p_purse->'orb'->'until') = 'number' and jsonb_typeof(p_purse->'orb'->'sky') = 'string' then
    case when (p_purse->'orb'->>'until')::numeric > p_now and town.cat('fishing')->'orb'->'skies' ? (p_purse->'orb'->>'sky') then p_purse->'orb'->>'sky' end end
$$;

-- Light the orb under a sky (lib/town/fishing's lightOrb): one of those there are, by somebody who has it, once a
-- day (lib/town/gifts' count). The sky is kept in the purse with the moment it ends.
create or replace function town.orb_light(p_purse jsonb, p_sky text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  orb jsonb := town.cat('fishing')->'orb';
  used jsonb;
  until_ bigint := p_now + (orb->>'minutes')::bigint * 60000;
begin
  if p_sky is null or not (orb->'skies' ? p_sky) then return town.no('none'); end if;
  used := town.gift_use(p_purse, 'thingOrb', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return jsonb_build_object('ok', true, 'until', until_, 'purse', (used->'purse') || jsonb_build_object('orb', jsonb_build_object('sky', p_sky, 'until', until_)));
end;
$$;

-- What the water answers under an orb's sky (lib/town/fishing's underOrb): the hour, the rain and the signs a line
-- is dropped by. Night is an hour of the night; rain is rain (and no sky after it); a full moon is a night of one.
-- With no orb lit, they are as they are.
create or replace function town.under_orb(p_sky text, p_hour integer, p_rain boolean, p_signs text[])
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'hour', case when p_sky in ('night', 'moon') then (o.orb->>'night')::integer else p_hour end,
    'rain', case when p_sky = 'rain' then true else coalesce(p_rain, false) end,
    'signs', to_jsonb(case
      when p_sky = 'rain' then array(select s from unnest(coalesce(p_signs, '{}'::text[])) with ordinality as t(s, ord) where s <> 'after' order by ord)
      when p_sky = 'moon' and not ('full' = any(coalesce(p_signs, '{}'::text[]))) then coalesce(p_signs, '{}'::text[]) || 'full'::text
      else coalesce(p_signs, '{}'::text[]) end))
    from (select town.cat('fishing')->'orb' as orb) o
$$;

-- ─── Stardust bait (thingBait, the sixth rank) ────────────────────────────

-- What takes a stardust bait, and how likely each is (lib/town/fishing's starOdds): every fish of its tiers that is
-- in this water under this sky and that the village's shelf has reached, by its tier and the sky alone: whichever
-- bait it likes, whatever the hour. None, where there is none.
create or replace function town.star_odds(p_rain boolean, p_shallow boolean, p_signs text[], p_top integer)
returns jsonb language plpgsql stable
as $$
declare
  cat jsonb := town.cat('fishing');
  fish jsonb := town.cat('fish');
  items jsonb := town.cat('items');
  ids text[] := '{}';
  ws double precision[] := '{}';
  id text;
  f jsonb;
  sky double precision;
  total double precision := 0;
  odds jsonb := '[]'::jsonb;
  i integer;
begin
  for id in select jsonb_array_elements_text(cat->'fish') loop
    f := fish->id;
    continue when not (cat->'star'->'tiers' ? (f->>'tier')) or (items->id->>'tier')::integer > p_top;
    continue when case when f ? 'water' then f->>'water' <> (case when p_shallow then 'bank' else 'deck' end) else p_shallow end;
    continue when f ? 'needs' and exists (select 1 from jsonb_array_elements_text(f->'needs') n where not (n = any(coalesce(p_signs, '{}'::text[]))));
    sky := case when p_rain then (f->>'rain')::double precision else coalesce((f->>'dry')::double precision, 1::double precision) end;
    continue when not (sky > 0);
    ids := ids || id;
    ws := ws || ((cat->'tiers'->>(f->>'tier'))::double precision * sky);
  end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop total := total + ws[i]; end loop;
  for i in 1..coalesce(array_length(ws, 1), 0) loop
    odds := odds || jsonb_build_array(jsonb_build_object('what', ids[i], 'p', ws[i] / total));
  end loop;
  return odds;
end;
$$;

-- Put a stardust bait on the hook (lib/town/fishing's hookStar): a rod has to be in the bag, as for any line; one of
-- the day's is counted, and nothing leaves the bag.
create or replace function town.hook_star(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
begin
  if not exists (select 1 from jsonb_array_elements_text(town.cat('fishing')->'rods') r where town.held(p_purse->'bag', r) > 0) then return town.no('tool'); end if;
  return town.gift_use(p_purse, 'thingBait', p_now);
end;
$$;

-- How far the village's shelf has come: the latest tier of anything the uncle sells now.
create or replace function town.shelf_top()
returns integer language sql set search_path = public
as $$
  select coalesce(max((town.cat('items')->x->>'tier')::integer), 1)
    from jsonb_array_elements_text(town.shelf_of(coalesce((town.thing('village', false)->>'unlocked')::integer, 0))) x
$$;

-- ─── The game made harder to match ───────────────────────────────────────

-- Whether the rare fish have gone from somebody's water for now (lib/town/fishing's isWary).
create or replace function town.is_wary(p_purse jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select coalesce(case when jsonb_typeof(p_purse->'wary') = 'object' and jsonb_typeof(p_purse->'wary'->'until') = 'number'
    then (p_purse->'wary'->>'until')::numeric > p_now end, false)
$$;

-- A line taken up (lib/town/fishing's tookUp): one more of them counted; with more than there may be lately, the
-- rare fish are gone from now, and the count begins anew.
create or replace function town.took_up(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  w jsonb := town.cat('fishing')->'wary';
  kept jsonb := case when jsonb_typeof(p_purse->'wary') = 'object' then p_purse->'wary' else '{}'::jsonb end;
  lately jsonb;
begin
  select coalesce(jsonb_agg(e.x order by e.ord), '[]'::jsonb) into lately
    from jsonb_array_elements(case when jsonb_typeof(kept->'ups') = 'array' then kept->'ups' else '[]'::jsonb end) with ordinality e(x, ord)
   where case when jsonb_typeof(e.x) = 'number' then (e.x #>> '{}')::numeric > p_now - (w->>'within')::numeric * 1000 and (e.x #>> '{}')::numeric <= p_now else false end;
  if jsonb_array_length(lately) + 1 > (w->>'ups')::integer then
    return p_purse || jsonb_build_object('wary', jsonb_build_object('ups', '[]'::jsonb, 'until', p_now + (w->>'gone')::bigint * 1000));
  end if;
  return p_purse || jsonb_build_object('wary', jsonb_build_object('ups', lately || to_jsonb(p_now),
    'until', case when jsonb_typeof(kept->'until') = 'number' then kept->'until' else '0'::jsonb end));
end;
$$;

-- How many fights running a fish is landed after (lib/town/fishing's boutsOf): a legend's two.
create or replace function town.bouts_of(p_what text)
returns integer language sql stable
as $$ select coalesce((town.cat('fishing')->'bouts'->>(town.cat('fish')->p_what->>'tier'))::integer, 1) $$;

-- How much harder a thing on a line is for somebody the deck's good things are so much harder for (lib/town/fishing's
-- harderOf): a fish that is uncommon or better, so much; a common fish, and what is no fish, as it is.
create or replace function town.harder_of(p_what text, p_k double precision)
returns double precision language sql stable
as $$
  select case when f.tier is not null and f.tier <> 'common' and coalesce(p_k, 1) > 1 then p_k else 1::double precision end
    from (select town.cat('fish')->p_what->>'tier' as tier) f
$$;

-- A length so many times as long, to the tenth (lib/town/fishing's biggerBy).
create or replace function town.bigger(p_size double precision, p_k double precision)
returns double precision language sql immutable
as $$ select floor(p_size * p_k * 10 + 0.5::double precision) / 10::double precision $$;

-- The least a landing can have taken, in milliseconds (lib/town/fishing's leastMs): so much of the quickest fight
-- there could be with that fish, by how much harder it is for whoever fought it, for each of its bouts.
create or replace function town.least_ms(p_what text, p_harder double precision, p_bouts integer)
returns bigint language sql stable
as $$
  select floor((c.fish->>'line')::double precision / (c.cat->>'reel')::double precision * (c.cat->>'least')::double precision
      * town.harder_of(p_what, p_harder) * p_bouts * 1000)::bigint
    from (select town.cat('fish')->p_what as fish, town.cat('fishing') as cat) c
$$;

-- ─── What a member does ──────────────────────────────────────────────────

-- Light my sky orb under a sky: for its minutes the water answers me as if under it.
create or replace function public.town_orb(p_sky text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.orb_light(town.purse_of(me, true), p_sky, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift_use', 'thingOrb', 1, 0, jsonb_build_object('sky', p_sky, 'until', did->'until'));
  end if;
  return town.answer(me, did);
end;
$$;
revoke execute on function public.town_orb(text) from public, anon;
grant execute on function public.town_orb(text) to authenticated;

-- public.town_cast: v152's, and how the line is dropped (p_how: 'pair' for a rod of two lines, 'star' for a
-- stardust bait, which takes none from the bag: p_bait is not looked at then), under the sky an orb has lit; and the
-- game made harder (a line dropped over one still out is a line taken up; no rare fish for a hand they are wary of;
-- bigger, harder fish from the deck's fourth rank). The argument is new, so the function of four arguments goes: a
-- page from before names four, and is answered by this one.
drop function if exists public.town_cast(text, integer, integer, boolean);
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  sky text := town.orb_of(purse, now_);
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and town.gift_works(purse, 'thingRod')) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, 2) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top())
    else town.odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky')) end;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
    line := line || jsonb_build_object('two', jsonb_build_object('what', two->'what', 'size',
      case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', bait, case when pair then 2 else 1 end, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'two'->>'what') else '{}'::jsonb end));
end;
$function$;
revoke execute on function public.town_cast(text, integer, integer, boolean, text) from public, anon;
grant execute on function public.town_cast(text, integer, integer, boolean, text) to authenticated;

-- public.town_strike(p_reaction integer): v120's, a rod of two lines (town.strike_two), a line that told what was on
-- its way let go by counted as a line taken up, and how much harder the fish is said to the page that fights it.
CREATE OR REPLACE FUNCTION public.town_strike(p_reaction integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text;
  landed jsonb;
  spent boolean := town.stamina_of(purse, now_) <= 0;
  play jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or line->'struck_at' <> 'null'::jsonb then return town.answer(me, town.no('none')); end if;
  play := jsonb_build_object('place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'claims', jsonb_build_object('rain', line->'rain', 'reaction', p_reaction));
  how := case
    when now_ < (line->>'bites_at')::bigint - (cat->'slack'->>'early')::bigint then 'early'
    when now_ > (line->>'bites_at')::bigint + floor(town.strike_window(purse, now_) * 1000)::bigint + (cat->'slack'->>'late')::bigint then 'missed'
    end;
  if how is not null then
    delete from public.town_lines where member_id = me;
    -- (of a line that told what was on its way, a strike too soon and a bite let go by are a line taken up)
    if coalesce((line->>'told')::boolean, false) then perform town.keep_purse(me, town.took_up(purse, now_)); end if;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  -- (a rod of two lines: both are hooked by the one strike)
  if line ? 'two' then return town.answer(me, town.strike_two(me, purse, line, p_reaction, spent, play, now_)); end if;
  fish := town.cat('fish')->(line->>'what');
  if fish is null then
    landed := town.land_catch(purse, line->>'what', 0);
    perform town.keep_purse(me, landed->'purse');
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', true, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', 'landed', 'kept', landed->'kept', 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
  end if;
  -- a fight costs its stamina whatever comes of it
  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false)
    || case when line ? 'harder' then jsonb_build_object('harder', line->'harder') else '{}'::jsonb end);
end;
$function$;

-- public.town_land(p_how text, p_fight jsonb): v152's, the otter, a rod of two lines (town.land_one), a line pulled
-- up with nothing hooked counted as a line taken up, and a landing held to how hard the fish was (town.least_ms: by
-- the member's rank, and a legend's two bouts).
CREATE OR REPLACE FUNCTION public.town_land(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
  drove jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  -- (two fish still on a rod of two lines: one of them has ended, and the other is on still)
  if line ? 'two' and line->'struck_at' <> 'null'::jsonb and how <> 'left' then return town.answer(me, town.land_one(me, purse, line, how, p_fight, now_)); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
    perform town.keep_purse(me, town.took_up(purse, now_));
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    -- (by how much harder the fish was for this member; and a legend takes its bouts, but for one the otter drove back, which is fought once more)
    if how = 'landed' and (took < town.least_ms(line->>'what', coalesce((line->>'harder')::double precision, 1),
          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
    elsif how in ('snapped', 'slipped') and not suspect then
      -- (the otter drives it back, once to a line: the line stays out with its fish on, to be fought again from now,
      -- and nothing is lost or written down of the go yet)
      drove := town.drive_back(purse, how, coalesce((line->>'again')::boolean, false), now_);
      if (drove->>'ok')::boolean then
        perform town.keep_purse(me, drove->'purse');
        update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'again', true), updated_at = now() where member_id = me;
        perform town.note(me, 'gift_use', 'famOtter', 1, 0, jsonb_build_object('left', drove->'left', 'what', line->'what', 'how', how));
        return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', line->'what', 'kept', false, 'record', false, 'back', false, 'again', true));
      end if;
      back := town.back_bait(case when how = 'snapped' then town.lose_bait(purse, line->>'bait') else purse end, line->>'bait');
      perform town.keep_purse(me, back);
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')));
end;
$function$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The forest ────────────────────────────────────────────────────────────
-- v153, the forest's part: the gifts of the forest line's second to sixth ranks (lib/town/gifts, lib/town/forest).
-- Run after v153.shared.sql. Safe to run twice. Every function that was there before is written whole, from its
-- text as the database has it after v152, with as few lines changed as the gift needs.

-- ── the squirrel (rank 2): it fetches what lies on the ground as its member walks past ──────────────────────────
-- Whether a squirrel fetches a kind of place's thing for somebody (lib/town/forest's fetches): what is picked up
-- with no game, while it follows them.
create or replace function town.wild_fetches(p_purse jsonb, p_how text)
returns boolean language sql stable
as $$ select coalesce(p_how = 'pick' and town.gift_works(p_purse, 'famSquirrel'), false) $$;

-- How far somebody reaches a kind of place from, in tiles (lib/town/forest's reachOf): a tile; as far as their
-- squirrel fetches; or, whatever the place, as far as is reached from a moss stag's back (rank 6: lib/town/gifts'
-- famStag, while it follows them).
create or replace function town.wild_reach(p_purse jsonb, p_how text)
returns integer language sql stable
as $$
  select case when town.wild_fetches(p_purse, p_how) then (town.cat('forest')->>'squirrel')::integer
    when town.gift_works(p_purse, 'famStag') then (town.cat('forest')->>'stag')::integer
    else (town.cat('forest')->>'reach')::integer end
$$;

-- The stamina a gathering of a kind of place costs somebody (lib/town/forest's costFor): its own; none of theirs
-- when the squirrel fetches it.
create or replace function town.wild_cost(p_purse jsonb, p_kind jsonb)
returns double precision language sql stable
as $$ select case when town.wild_fetches(p_purse, p_kind->>'how') then 0 else (p_kind->>'cost')::double precision end $$;

-- ── the truffle piglet (rank 3): no hoe, one more from every hole, so many holes to a meal's hours ─────────────
-- Whether a truffle piglet may dig for somebody now (lib/town/forest's pigletDigs): it follows them and has a hole
-- left of its count to these hours.
create or replace function town.piglet_digs(p_purse jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select town.gift_works(p_purse, 'famPiglet')
     and town.used_of(p_purse, 'famPiglet', p_now) < (town.cat('gifts')->'uses'->'famPiglet'->>'n')::integer
$$;

-- ── the firefly lantern (rank 4): what every place holds, and the secret places of the deep woods ──────────────
-- The secret places are in the catalog's forest row beside the places everybody has (`secret`: their kinds and the
-- places themselves), and their numbers go on from the last of `spots`: so `town_takes` keeps who took from them as
-- it does of every place, and what one holds is rolled by the same rule from the same word.
-- A place of a number, one everybody has or a secret one (lib/town/forest's placeAt); null for what is no place's.
-- (The places everybody has are looked at first and by their number alone: the forest is listed place by place.)
create or replace function town.wild_place(p_f jsonb, p_spot integer)
returns jsonb language sql immutable
as $$
  select case when p_spot is null or p_spot < 0 then null
    else coalesce(p_f->'spots'->p_spot, p_f->'secret'->'spots'->(p_spot - jsonb_array_length(p_f->'spots'))) end
$$;

-- What a kind of place is, as rules (lib/town/forest's ruleOf): a kind everybody has, or a secret place's.
create or replace function town.wild_rule(p_f jsonb, p_kind text)
returns jsonb language sql immutable
as $$ select coalesce(p_f->'kinds'->p_kind, p_f->'secret'->'kinds'->p_kind) $$;

-- Whether a place's number is a secret place's (lib/town/forest's isSecret).
create or replace function town.wild_secret(p_f jsonb, p_spot integer)
returns boolean language sql immutable
as $$
  select coalesce(p_spot >= jsonb_array_length(p_f->'spots')
    and p_spot < jsonb_array_length(p_f->'spots') + jsonb_array_length(coalesce(p_f->'secret'->'spots', '[]'::jsonb)), false)
$$;

-- town.wild_holds: v125's. Changed: the place and its kind are looked up among the secret places too (two lines;
-- written out there and not asked of the two rules above, since the forest is listed by asking this of every place).
CREATE OR REPLACE FUNCTION town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := coalesce(f->'spots'->p_spot, f->'secret'->'spots'->(p_spot - jsonb_array_length(f->'spots')));
  kind jsonb := coalesce(f->'kinds'->(spot->>0), f->'secret'->'kinds'->(spot->>0));
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  finds jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick jsonb := null;
  i integer;
  lo integer;
  hi integer;
begin
  if p_spot is null or p_spot < 0 or spot is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('phase', p_spot) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':has', p_spot, turn) >= (kind->>'chance')::double precision then return null; end if;
  finds := kind->'finds';
  for i in 0..jsonb_array_length(finds) - 1 loop
    fits := fits || town.wild_fits(finds->i, finds->i->>'item', 'forest', spot->>3, at_, word);
    if fits[i + 1] then total := total + (finds->i->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':what', p_spot, turn) * total;
  for i in 0..jsonb_array_length(finds) - 1 loop
    if fits[i + 1] then
      pick := finds->i;
      left_ := left_ - (pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  lo := (pick->'n'->>0)::int;
  hi := (pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'item', pick->>'item', 'n', lo + floor(town.roll(word || ':n', p_spot, turn) * (hi - lo + 1))::int,
    'until', (turn + 1) * every - phase);
end;
$function$;

-- town.gather: v125's, with two arguments more at its end (`p_with`: the gift a gathering is asked to be done with,
-- none for the plain way; `p_lost`: a secret place's games were left), so the function of eleven arguments goes and
-- this one answers its calls too.
-- Changed: the place and its kind are looked up among the secret places too (two lines); how far one reaches (a
-- line); what it costs (a line); asked of the piglet, what is dug takes no hoe, is one of the piglet's holes, and
-- gives one more (three declarations, the hoe's line grown into a block, a line for how many, and the purse the
-- stamina is spent from); and a secret place is there only for whoever wears the lantern (in the first line of the
-- body), gives all it has when both its games were won and is written in the purse's record, and otherwise spends
-- the turn with nothing got (two declarations and a block after the reach).
drop function if exists town.gather(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, double precision, bigint);
drop function if exists town.gather(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, double precision, bigint, text);
CREATE OR REPLACE FUNCTION town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint, p_with text DEFAULT NULL::text, p_lost boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('forest');
  spot jsonb := town.wild_place(f, p_spot);
  kind jsonb := town.wild_rule(f, spot->>0);
  bag jsonb := p_purse->'bag';
  item text := p_has->>'item';
  n integer;
  wrong integer := 0;
  piglet boolean := coalesce(kind->>'how' = 'dig' and p_with = 'famPiglet', false);
  mine jsonb := p_purse;
  used jsonb;
  secret boolean := town.wild_secret(f, p_spot);
  found jsonb := case when jsonb_typeof(p_purse->'forest'->'secrets') = 'array' then p_purse->'forest'->'secrets' else '[]'::jsonb end;
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null or (secret and not town.wearing(p_purse, 'charmFirefly')) then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > town.wild_reach(p_purse, kind->>'how') then return town.no('far'); end if;
  if secret then
    if coalesce(p_lost, false) or floor(coalesce(p_misses, 0)) > 0 or floor(coalesce(p_wrong, 0)) > 0 then
      return jsonb_build_object('ok', true, 'lost', true, 'got', '[]'::jsonb, 'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now));
    end if;
    n := (p_has->>'n')::int;
    if town.room(bag, item) < n then return town.no('full'); end if;
    if not found @> to_jsonb(p_spot) then
      select jsonb_agg(e.v order by e.v) into found from (select x.v::int as v from jsonb_array_elements_text(found) x(v) union select p_spot) e;
    end if;
    return jsonb_build_object('ok', true, 'got', jsonb_build_array(jsonb_build_array(item, n)),
      'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now) || jsonb_build_object('bag', town.put(bag, item, n),
        'forest', case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end || jsonb_build_object('secrets', found)));
  end if;
  if piglet then
    used := town.gift_use(p_purse, 'famPiglet', p_now);
    if not (used->>'ok')::boolean then return used; end if;
    mine := used->'purse';
  elsif kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int)
    + case when piglet then (town.cat('gifts')->'gifts'->'famPiglet'->>'by')::int else 0 end;
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(mine, town.wild_cost(p_purse, kind), p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$function$;

-- public.town_gather: v125's. Changed: what the gathering is asked to be done with, and whether a secret place's
-- games were left, are read from `p_went` and handed on (two declarations, and the call's last arguments); a place
-- may be a secret one (the guard, the place's line, and the kind's way in the deed); a secret place lost is written
-- down as `slip` and not as a gathering (the deed's line grown into a block); and the deed says when it was the
-- squirrel that fetched the thing or the piglet that dug it, and when the place was a secret one (two lines).
CREATE OR REPLACE FUNCTION public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  with_ text := case when jsonb_typeof(went->'with') = 'string' then went->>'with' end;
  lost_ boolean := coalesce(case when jsonb_typeof(went->'lost') = 'boolean' then (went->>'lost')::boolean end, false);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  if town.wild_place(f, p_spot) is null then return town.answer(me, town.no('none')); end if;
  spot := town.wild_place(f, p_spot);
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    if coalesce((did->>'lost')::boolean, false) then
      perform town.note(me, 'slip', has->>'item', 0, 0, jsonb_build_object(
        'spot', p_spot, 'kind', spot->>0, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'wrong', wrong, 'secs', secs, 'left', lost_,
        'spent', town.stamina_of(purse, now_) <= 0));
    else
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', town.wild_rule(f, spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0)
      || case when town.wild_fetches(purse, town.wild_rule(f, spot->>0)->>'how') then jsonb_build_object('by', 'famSquirrel')
              when with_ = 'famPiglet' and town.wild_rule(f, spot->>0)->>'how' = 'dig' and not town.wild_secret(f, p_spot) then jsonb_build_object('by', 'famPiglet') else '{}'::jsonb end
      || case when town.wild_secret(f, p_spot) then jsonb_build_object('secret', true) else '{}'::jsonb end);
    end if;
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$function$;

-- ── a sprite's treasure map (rank 5): a hunt for a chest, hot and cold ──────────────────────────────────────────
-- The catalog's forest row has `hunt`: the dig sites, how far a map's ring may lie off the chest and how wide it is,
-- how near a dig is for each warmth, and what a chest may hold. A hunt is kept in the purse (`forest.hunt`: the day
-- it is of, which of that day's maps, the digs that missed); the tile is never kept and never told: it is rolled
-- from the word no browser reads, whose hunt it is, the day and the map.
-- The hunt somebody is on now (lib/town/hunt's huntOf): the one kept, if it is of today; null with none.
create or replace function town.hunt_of(p_purse jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select case when jsonb_typeof(h.h) = 'object' and jsonb_typeof(h.h->'k') = 'number' and jsonb_typeof(h.h->'n') = 'number'
      and (h.h->>'k')::numeric = town.stretch_at(town.cat('gifts')->'uses'->'thingMap', p_now)
    then jsonb_build_object('k', h.h->'k', 'n', floor((h.h->>'n')::numeric),
      'digs', case when jsonb_typeof(h.h->'digs') = 'number' and (h.h->>'digs')::numeric > 0 then floor((h.h->>'digs')::numeric) else 0 end) end
    from (select p_purse->'forest'->'hunt' as h) h
$$;

-- The tile a hunt's chest is buried at (lib/town/hunt's huntSite), as [x, y].
create or replace function town.hunt_site(p_word text, p_me text, p_hunt jsonb)
returns jsonb language sql stable
as $$
  select s.sites->least(jsonb_array_length(s.sites) - 1,
      floor(town.roll(p_word || ':hunt:' || p_me, (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * jsonb_array_length(s.sites))::integer)
    from (select town.cat('forest')->'hunt'->'sites' as sites) s
$$;

-- The ring a hunt's map draws (lib/town/hunt's huntArea): its middle off the chest by rolls of its own.
create or replace function town.hunt_area(p_word text, p_me text, p_hunt jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
      'x', (s.site->>0)::integer + floor(town.roll(p_word || ':hunt:' || p_me || ':dx', (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * (2 * s.off + 1))::integer - s.off,
      'y', (s.site->>1)::integer + floor(town.roll(p_word || ':hunt:' || p_me || ':dy', (p_hunt->>'k')::bigint, (p_hunt->>'n')::bigint) * (2 * s.off + 1))::integer - s.off,
      'r', s.radius)
    from (select town.hunt_site(p_word, p_me, p_hunt) as site, (town.cat('forest')->'hunt'->>'off')::integer as off, (town.cat('forest')->'hunt'->'radius') as radius) s
$$;

-- A hunt as its owner is told it (lib/town/hunt's huntTold): which map of the day, the digs so far, and the ring.
create or replace function town.hunt_told(p_purse jsonb, p_word text, p_me text, p_now bigint)
returns jsonb language sql stable
as $$
  select case when h.hunt is not null then jsonb_build_object('n', h.hunt->'n', 'digs', h.hunt->'digs', 'area', town.hunt_area(p_word, p_me, h.hunt)) end
    from (select town.hunt_of(p_purse, p_now) as hunt) h
$$;

-- How warm a dig is (lib/town/hunt's warmthOf): 0 on the chest, then by the catalog's bands, and one past them, cold.
create or replace function town.hunt_warm(p_site jsonb, p_x integer, p_y integer)
returns integer language sql stable
as $$
  select coalesce((select min(b.ord)::integer - 1 from jsonb_array_elements_text(town.cat('forest')->'hunt'->'bands') with ordinality b(v, ord)
                    where greatest(abs(p_x - (p_site->>0)::integer), abs(p_y - (p_site->>1)::integer)) <= b.v::numeric),
                  jsonb_array_length(town.cat('forest')->'hunt'->'bands'))
$$;

-- What a chest holds, by two rolls (lib/town/hunt's chestOf), as [thing, how many]: a rare thing of the forest whose
-- day it is (two of one worth little), or a scroll.
create or replace function town.chest_of(p_word text, p_now bigint, p_r0 double precision, p_r1 double precision)
returns jsonb language plpgsql stable
as $$
declare
  h jsonb := town.cat('forest')->'hunt';
  rares jsonb;
  many integer;
  item text;
begin
  select coalesce(jsonb_agg(r.v->>0 order by r.ord), '[]'::jsonb) into rares
    from jsonb_array_elements(h->'rares') with ordinality r(v, ord)
   where town.roll(p_word || ':day:' || (r.v->>0), town.day_of(p_now)::bigint) < (r.v->>1)::double precision;
  many := jsonb_array_length(rares);
  if many > 0 and p_r0 < (h->>'rare')::double precision then
    item := rares->>least(many - 1, greatest(0, floor(p_r1 * many)::integer));
    return jsonb_build_array(item, case when (town.cat('items')->item->>'pays')::numeric < (h->>'pair')::numeric then 2 else 1 end);
  end if;
  many := jsonb_array_length(h->'scrolls');
  return jsonb_build_array(h->'scrolls'->>least(many - 1, greatest(0, floor(p_r1 * many)::integer)), 1);
end;
$$;

-- Use a map (lib/town/hunt's mapUse): one of the day's, and a hunt begins. Refused with a hunt on already.
create or replace function town.map_use(p_purse jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  used jsonb;
begin
  if town.hunt_of(p_purse, p_now) is not null then return town.no('had'); end if;
  used := town.gift_use(p_purse, 'thingMap', p_now);
  if not (used->>'ok')::boolean then return used; end if;
  return jsonb_build_object('ok', true, 'left', used->'left', 'purse', (used->'purse') || jsonb_build_object('forest',
    case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end
      || jsonb_build_object('hunt', jsonb_build_object('k', town.stretch_at(town.cat('gifts')->'uses'->'thingMap', p_now), 'n', town.used_of(used->'purse', 'thingMap', p_now), 'digs', 0))));
end;
$$;

-- Dig for the chest from a tile (lib/town/hunt's mapDig): off it, how warm it was, and the dig is counted; on it, the
-- chest is up, what it holds is in the bag, the hunt is over and it is one more chest found.
create or replace function town.map_dig(p_purse jsonb, p_word text, p_me text, p_x integer, p_y integer, p_now bigint, p_r0 double precision, p_r1 double precision)
returns jsonb language plpgsql stable
as $$
declare
  hunt jsonb := town.hunt_of(p_purse, p_now);
  mine jsonb := case when jsonb_typeof(p_purse->'forest') = 'object' then p_purse->'forest' else '{}'::jsonb end;
  warm integer;
  digs integer;
  chest jsonb;
  n integer;
  chests integer;
begin
  if hunt is null then return town.no('none'); end if;
  warm := town.hunt_warm(town.hunt_site(p_word, p_me, hunt), p_x, p_y);
  digs := (hunt->>'digs')::integer + 1;
  if warm > 0 then
    return jsonb_build_object('ok', true, 'found', false, 'warm', warm, 'digs', digs, 'got', '[]'::jsonb,
      'purse', p_purse || jsonb_build_object('forest', mine || jsonb_build_object('hunt', hunt || jsonb_build_object('digs', digs))));
  end if;
  chest := town.chest_of(p_word, p_now, p_r0, p_r1);
  n := (chest->>1)::integer;
  if town.room(p_purse->'bag', chest->>0) < n then return town.no('full'); end if;
  chests := case when jsonb_typeof(mine->'chests') = 'number' and (mine->>'chests')::numeric > 0 then floor((mine->>'chests')::numeric)::integer else 0 end;
  return jsonb_build_object('ok', true, 'found', true, 'warm', 0, 'digs', digs, 'got', jsonb_build_array(chest),
    'purse', p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', chest->>0, n), 'forest', mine || jsonb_build_object('hunt', null, 'chests', chests + 1)));
end;
$$;

-- A member uses a map: one of the day's three, and a hunt begins.
create or replace function public.town_map_use()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  did jsonb := town.map_use(town.purse_of(me, true), now_);
  told jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'map_use', 'thingMap', 1, 0, jsonb_build_object('map', did->'purse'->'forest'->'hunt'->'n', 'left', did->'left'));
  end if;
  told := town.answer(me, did);
  return told || jsonb_build_object('hunt', town.hunt_told(told->'purse', town.word(), me::text, now_));
end;
$$;

-- A member digs for the chest of the hunt they are on, from the tile they stand on.
create or replace function public.town_map_dig(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  told jsonb;
begin
  if p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  did := town.map_dig(purse, town.word(), me::text, p_x, p_y, now_, random(), random());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    if (did->>'found')::boolean then
      perform town.note(me, 'chest', did->'got'->0->>0, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
        'map', town.hunt_of(purse, now_)->'n', 'digs', did->'digs', 'tile', jsonb_build_array(p_x, p_y)));
    else
      perform town.note(me, 'map_dig', null, 0, 0, jsonb_build_object(
        'map', town.hunt_of(purse, now_)->'n', 'digs', did->'digs', 'warm', did->'warm', 'tile', jsonb_build_array(p_x, p_y)));
    end if;
  end if;
  told := town.answer(me, did);
  return told || jsonb_build_object('hunt', town.hunt_told(told->'purse', town.word(), me::text, now_));
end;
$$;

-- public.town_wild: v125's. Changed: whoever wears the firefly lantern is told what lies buried, and the secret
-- places with the rest (a declaration; the loop's bound; the kind's line; and the line that says what a place has);
-- and the hunt a member is on is told with the forest (the last line).
CREATE OR REPLACE FUNCTION public.town_wild()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  word text := town.word();
  took jsonb;
  has jsonb;
  t jsonb;
  kind jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
  lit boolean := coalesce((select town.wearing(p.doc, 'charmFirefly') from public.town_purses p where p.member_id = me), false);
begin
  -- (what has been taken of late, in one look: no turn is longer than half a day)
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'spot' and tk.at > now() - interval '13 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(f->'spots') - 1 + case when lit then jsonb_array_length(coalesce(f->'secret'->'spots', '[]'::jsonb)) else 0 end loop
    has := town.wild_holds(i, now_, f, word);
    continue when has is null;
    kind := coalesce(f->'kinds'->(f->'spots'->i->>0), f->'secret'->'kinds'->(f->'secret'->'spots'->(i - jsonb_array_length(f->'spots'))->>0));
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (kind->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, case when kind->>'how' = 'dig' and not lit then null else has->>'item' end, (has->>'n')::int, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'wild', out_, 'hunt', town.hunt_told((select p.doc from public.town_purses p where p.member_id = me), word, me::text, now_));
end;
$function$;

revoke execute on function public.town_gather(integer, integer, integer, jsonb) from public, anon;
grant execute on function public.town_gather(integer, integer, integer, jsonb) to authenticated;
revoke execute on function public.town_wild() from public, anon;
grant execute on function public.town_wild() to authenticated;
revoke execute on function public.town_map_use() from public, anon;
grant execute on function public.town_map_use() to authenticated;
revoke execute on function public.town_map_dig(integer, integer) from public, anon;
grant execute on function public.town_map_dig(integer, integer) to authenticated;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── The insects ───────────────────────────────────────────────────────────
-- v153, the insects' line: the gifts of its ranks 2 to 6 (lib/town/insects.ts, lib/town/gifts.ts). Tried on top of
-- v153.shared.sql (try-line.mjs). The catalog's rows `gifts` and `insects` are written over by the file this is put
-- together into: the butterfly's number is a half, and `insects` has `nectar` and `pair`.
--
-- New: town.nectar_haunt, town.nectar, town.rid_by, town.followed, town.net_mine, town.cloak_at, town.bug_for;
--      public.town_nectar, public.town_net_mine.
-- Written again, each but for the lines named above it: town.net, public.town_bugs, public.town_net.

-- ── a drop of nectar (the third rank's thing) ──────────────────────────────

-- The haunt a drop on a tile calls from (lib/town/insects.ts's nectarHaunt): of the map the tile is on, among the
-- kinds of haunt a drop calls from, the one a perch of which is nearest (the lower number, of two as near). Null off
-- the maps.
create or replace function town.nectar_haunt(p_x integer, p_y integer, p_cat jsonb default null)
returns integer language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  k jsonb := ins->'nectar';
  place text;
  h jsonb;
  best integer := null;
  least_ double precision := null;
  d double precision;
  i integer;
begin
  if p_x is null or p_y is null or k is null then return null; end if;
  select m.v->>0 into place from jsonb_array_elements(k->'maps') with ordinality m(v, ord)
   where p_x >= (m.v->>1)::int and p_x < (m.v->>1)::int + (m.v->>3)::int and p_y >= (m.v->>2)::int and p_y < (m.v->>2)::int + (m.v->>4)::int
   order by m.ord limit 1;
  if place is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when h->>1 <> place or not k->'at' ? (h->>0);
    select min(((p->>0)::double precision - p_x - 0.5) * ((p->>0)::double precision - p_x - 0.5)
             + ((p->>1)::double precision - p_y - 0.5) * ((p->>1)::double precision - p_y - 0.5)) into d
      from jsonb_array_elements(h->3) p;
    if d is not null and (least_ is null or d < least_) then least_ := d; best := i; end if;
  end loop;
  return best;
end;
$$;

-- Put a drop down (lib/town/insects.ts's nectar): the purse with a drop used and what it brings kept in it (`lured`),
-- or why not: no nectar to one's name or none left today (town.gift_use's words), one out already, nothing about to
-- call. Which insect: one of the kinds the haunt would have at that very moment, by their weights there, each
-- weighed down by how scarce its kind has been hunted (town.plenty); p_r1, how many a catch gives by p_r2, how soon
-- it comes by p_r3. For whoever wears the butterfly-wing cloak the insects that have days of their own may come on
-- any day (a kind's `day` is passed over: town.wild_fits is not asked about it).
create or replace function town.nectar(p_purse jsonb, p_x integer, p_y integer, p_now bigint, p_r1 double precision, p_r2 double precision, p_r3 double precision,
  p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  k jsonb := ins->'nectar';
  used jsonb := town.gift_use(p_purse, 'thingNectar', p_now);
  cloak boolean := town.wearing(p_purse, 'charmCloak');
  ids jsonb := ins->'order';
  hid integer;
  h jsonb;
  bug jsonb;
  may text[] := '{}';
  ws double precision[] := '{}';
  w double precision;
  total double precision := 0;
  left_ double precision;
  pick text;
  lo integer;
  hi integer;
  n integer;
  from_ bigint;
  lured jsonb;
  i integer;
begin
  if not (used->>'ok')::boolean then return used; end if;
  if jsonb_typeof(p_purse->'lured'->'until') = 'number' and (p_purse->'lured'->>'until')::numeric > p_now then return town.no('out'); end if;
  hid := town.nectar_haunt(p_x, p_y, ins);
  if hid is null then return town.no('quiet'); end if;
  h := ins->'haunts'->hid;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    if bug->'at' ? (h->>0) and town.wild_fits(case when cloak then bug - 'day' else bug end, ids->>i, h->>1, h->>2, p_now, word) then
      w := (bug->>'weight')::double precision * town.plenty(ids->>i, p_now, ins);
      may := may || (ids->>i);
      ws := ws || w;
      total := total + w;
    end if;
  end loop;
  if not coalesce(total > 0, false) then return town.no('quiet'); end if;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r1, 0))) * total;
  for i in 1..array_length(may, 1) loop
    pick := may[i];
    left_ := left_ - ws[i];
    exit when left_ < 0;
  end loop;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  n := lo + least(hi - lo, greatest(0, floor(least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * (hi - lo + 1))::int));
  from_ := p_now + floor(((k->>'soon')::double precision + least(0.999999::double precision, greatest(0::double precision, coalesce(p_r3, 0)))
             * ((k->>'within')::double precision - (k->>'soon')::double precision)) * 1000)::bigint;
  lured := jsonb_build_object('x', p_x, 'y', p_y, 'haunt', hid, 'bug', pick, 'n', n, 'from', from_, 'until', from_ + (k->>'stays')::bigint * 1000,
    'seed', (hid::bigint * 100003 + p_now / 1000) % 2147483647);
  return jsonb_build_object('ok', true, 'purse', (used->'purse') || jsonb_build_object('lured', lured), 'lured', lured, 'left', used->'left');
end;
$$;

-- A drop of nectar where I stand: what it brings is drawn here, kept in my purse, and written down.
create or replace function public.town_nectar(p_x integer, p_y integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  did jsonb := town.nectar(purse, p_x, p_y, now_, random(), random(), random());
  h jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    h := town.cat('insects')->'haunts'->((did->'lured'->>'haunt')::int);
    perform town.note(me, 'nectar', did->'lured'->>'bug', (did->'lured'->>'n')::numeric, 0, jsonb_build_object(
      'haunt', (did->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$$;
revoke execute on function public.town_nectar(integer, integer) from public, anon;
grant execute on function public.town_nectar(integer, integer) to authenticated;

-- ── an insect that is one member's alone and no haunt's ────────────────────

-- A ladybird caught, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it. The
-- block of public.town_net (v126's, as v145 left it) as a function of its own, for a catch that is no haunt's: the
-- same chance (the insect's `rids`), the same pick among the plots with a pest on them at this moment
-- (town.rid_pick), the plot written under its bed's lock, only its plant's `cured` and its `changed`. Null when
-- nothing was rid; else the plot's tile, and the plot as it is now.
create or replace function town.rid_by(p_bug text, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  chance double precision := coalesce((town.cat('insects')->'bugs'->p_bug->>'rids')::double precision, 0);
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
begin
  if not (chance > 0 and random() < chance) then return null; end if;
  rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                          from public.town_plots p where p.plant is not null), p_now, random());
  if rid is null then return null; end if;
  rid_x := split_part(rid, ',', 1)::int;
  rid_y := split_part(rid, ',', 2)::int;
  perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
  select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
  if rid_plant is null or town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), p_now, 0) is null then return null; end if;
  rid_plant := rid_plant || jsonb_build_object('cured', p_now);
  update public.town_plots set plant = rid_plant, changed = p_now where x = rid_x and y = rid_y;
  return jsonb_build_object('rid', rid, 'soil', rid_soil, 'plant', rid_plant);
end;
$$;

-- A purse after a catch, with what follows the insect caught when the butterfly-wing cloak is worn, as the purse was
-- before the catch (lib/town/insects.ts's followed): its kind, how many a catch gives, the tile its catcher stood on,
-- and the moment it is off, the cloak's number of seconds on. Without the cloak, the purse as it is.
create or replace function town.followed(p_before jsonb, p_after jsonb, p_bug text, p_n integer, p_x integer, p_y integer, p_now bigint)
returns jsonb language sql stable
as $$
  select case when town.wearing(p_before, 'charmCloak')
    then p_after || jsonb_build_object('follower', jsonb_build_object('bug', p_bug, 'n', p_n, 'at', jsonb_build_array(p_x, p_y),
      'until', p_now + ((town.cat('gifts')->'gifts'->'charmCloak'->>'by')::numeric * 1000)::bigint))
    else p_after end
$$;

-- Catch an insect that is mine alone (lib/town/insects.ts's netMine): the one come to my drop of nectar ('lured'),
-- there from when it came until it is off again; or the one following an insect I caught under the cloak ('pair'),
-- until its seconds are up and so long past them as the journey may take (the catalog's insects.pair.slack). As a
-- haunt's is caught (town.net): with a net in the hand, from near enough the drop or the place of the first catch,
-- with room in the bag, for its stamina and a point a miss up to so many. The drop is done with, and under the cloak
-- its insect has another following; the one that followed is gone, and has none.
create or replace function town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  reach double precision := (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;

-- The same, for a member: the catch kept, the first of its kind written in the village's book, a ladybird's doing,
-- and the deed written down as a catch like any (`net`: it counts against its kind and on the line), with where the
-- insect was from (`nectar`: the haunt its drop called from; or `pair`: it followed one just caught).
create or replace function public.town_net_mine(p_which text, p_x integer, p_y integer, p_misses numeric default 0)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  did jsonb;
  bug text;
  h jsonb;
  book jsonb;
  is_first boolean := false;
  rid jsonb := null;
begin
  if p_which is null or p_which not in ('lured', 'pair') then return town.answer(me, town.no('none')); end if;
  did := town.net_mine(purse, p_which, town.hand_of(purse), p_x, p_y, misses, now_);
  if (did->>'ok')::boolean then
    bug := did->'got'->0->>0;
    perform town.keep_purse(me, did->'purse');
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    rid := town.rid_by(bug, now_);
    h := case when p_which = 'lured' then ins->'haunts'->((purse->'lured'->>'haunt')::int) end;
    perform town.note(me, 'net', bug, (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when p_which = 'lured' then jsonb_build_object('nectar', (purse->'lured'->>'haunt')::int, 'kind', h->>0, 'map', h->>1) else jsonb_build_object('pair', true) end
      || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'whose', rid->'plant'->>'by') else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid->>'rid', 'ridPlot', jsonb_build_object('soil', rid->>'soil', 'plant', rid->'plant')) else '{}'::jsonb end;
end;
$$;
revoke execute on function public.town_net_mine(text, integer, integer, numeric) from public, anon;
grant execute on function public.town_net_mine(text, integer, integer, numeric) to authenticated;

-- ── the butterfly-wing cloak (the sixth rank's charm) ─────────────────────

-- The rare insects that are out only on some days, out for the cloak's wearer every day (lib/town/insects.ts's
-- cloakAt). What a haunt has in a turn for whoever wears the cloak and for nobody else: the turn rolled as town.bug_at
-- rolls it (the same numbers), but with every insect that has days of its own counted in whatever day it is. Where
-- that roll lands on such an insect on a day that is not its own, and it is plentiful enough, that insect; null
-- everywhere else (the wearer then has what everybody has: town.bug_for). town.bug_at's text, but for: the haunts none
-- of whose insects has a day are passed over at once, town.wild_fits is not asked about a kind's `day`, the pick is
-- kept only if it is such an insect off its day, and the answer says `cloak`.
create or replace function town.cloak_at(p_haunt integer, p_now bigint, p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  word text := coalesce(p_word, town.word());
  every bigint;
  phase bigint;
  turn bigint;
  at_ bigint;
  ids jsonb := ins->'order';
  bug jsonb;
  fits boolean[] := '{}';
  total double precision := 0;
  left_ double precision;
  pick text := null;
  i integer;
  lo integer;
  hi integer;
  w double precision;
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  if not exists (select 1 from jsonb_each(ins->'bugs') b where b.value ? 'day' and b.value->'at' ? (h->>0)) then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug - 'day', ids->>i, h->>1, h->>2, at_, word));
    if fits[i + 1] then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := town.roll(word || ':which', p_haunt, turn) * total;
  for i in 0..jsonb_array_length(ids) - 1 loop
    if fits[i + 1] then
      pick := ids->>i;
      left_ := left_ - (ins->'bugs'->pick->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  if pick is null then return null; end if;
  -- only an insect that has days of its own, on a day that is not one of them: on its own day everybody has it
  if not (ins->'bugs'->pick ? 'day') or town.roll(word || ':day:' || pick, town.day_of(at_)::bigint) < (ins->'bugs'->pick->>'day')::double precision then return null; end if;
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase, 'cloak', true);
end;
$$;

-- What a haunt has now for somebody (lib/town/insects.ts's hereFor): with the cloak, the insect that is there for
-- its wearers alone, where there is one; else what it has for everybody (town.bug_here).
create or replace function town.bug_for(p_cloak boolean, p_haunt integer, p_now bigint, p_backs jsonb, p_cat jsonb default null, p_word text default null)
returns jsonb language sql stable
as $$
  select coalesce(case when coalesce(p_cloak, false) then town.cloak_at(p_haunt, p_now, p_cat, p_word) end, town.bug_here(p_haunt, p_now, p_backs, p_cat, p_word))
$$;

-- town.net (v125's, as v152 has it), written again but for its last statement: the purse it gives back goes through
-- town.followed, so that an insect caught under the cloak has another of its kind following (kept in the purse).
CREATE OR REPLACE FUNCTION town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           <= (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)), id, n, p_x, p_y, p_now),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$function$;

-- public.town_bugs (v131's, as v152 has it), written again but for two lines: whether I wear the cloak is read from
-- my purse as it is kept, and what each haunt has for me is asked of town.bug_for.
CREATE OR REPLACE FUNCTION public.town_bugs()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(now_);
  cloak boolean := town.wearing((select p.doc from public.town_purses p where p.member_id = me), 'charmCloak');
  took jsonb;
  has jsonb;
  t jsonb;
  out_ jsonb := '[]'::jsonb;
  i integer;
begin
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'haunt' and tk.at > now() - interval '2 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    has := town.bug_for(cloak, i, now_, backs, ins, word);
    continue when has is null;
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, has->>'bug', (has->>'turn')::bigint, (has->>'seed')::bigint, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'bugs', out_,
    'bugsAgain', (select min((x->>'from')::bigint) from jsonb_array_elements(backs) x where (x->>'from')::bigint > now_),
    'book', (select coalesce(jsonb_object_agg(b.key, b.value->>'name'), '{}'::jsonb) from jsonb_each(town.thing('bugs', false)) b));
end;
$function$;

-- public.town_net (v126's, as v152 has it), written again but for two lines: what the haunt has for me is asked of
-- town.bug_for (the cloak's insect, for its wearer), and the deed says `cloak` when it was one.
CREATE OR REPLACE FUNCTION public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random());
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$function$;

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── Nobody calls a rule of schema town ────────────────────────────────────
revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select (select count(*) from jsonb_object_keys(data->'gifts')) as gifts,
--          (select count(*) from jsonb_each(data->'gifts') e where e.value->>'kind' = 'thing') as things,
--          (select count(*) from jsonb_object_keys(data->'uses')) as counted,
--          data->'harder' as harder, data->'uses' ? 'famGnome' as gnome_counted
--     from public.town_catalog where key = 'gifts';
--   -- 39 | 15 | 15 | {"by": 0.08, "from": 4} | false
--
--   select (data->>'well')::int as well_holds, (data->>'fill')::int as a_can_takes, data->'cans' as cans from public.town_catalog where key = 'farming';
--   -- 100 | 2 | {"can": 8, "canBrass": 18, "canCopper": 12}
--
--   select data->'kinds'->'blooms' as blooms, data->'kinds'->'tree' as tree, data->'kinds'->'glade' as glade from public.town_catalog where key = 'insects';
--   -- {"every": 7, "chance": 0.77, "shares": 1} | {"every": 14, "chance": 0.7, "shares": 1} | {"every": 30, "chance": 0.25, "shares": 1}
--
--   select town.harder_at(3) as third, town.harder_at(4) as fourth, town.harder_at(10) as tenth;
--   -- 1 | 1.08 | 1.56
--
--   select to_regprocedure('public.town_cast(text, integer, integer, boolean)') is null as old_cast_gone,
--          to_regprocedure('public.town_cast(text, integer, integer, boolean, text)') is not null as cast_there,
--          to_regprocedure('town.stretch_of(text, bigint)') is null as old_stretch_gone,
--          to_regprocedure('public.town_row(integer, integer, jsonb, jsonb)') is not null
--            and to_regprocedure('public.town_spoon(jsonb)') is not null
--            and to_regprocedure('public.town_drink_take(uuid, integer, integer)') is not null
--            and to_regprocedure('public.town_map_dig(integer, integer)') is not null
--            and to_regprocedure('public.town_net_mine(text, integer, integer, numeric)') is not null
--            and to_regprocedure('public.town_orb(text)') is not null as new_there;
--   -- true | true | true | true
--
--   select jsonb_array_length(town.work_answer(null)->'gives') as given;
--   -- 39
--
--   select town.deed_th('row') as row_, town.deed_th('nectar') as nectar, town.deed_th('buy') as buy;
--   -- ทำงานทั้งแถวในครั้งเดียว | หยดน้ำหวานล่อแมลง | ซื้อของจากลุง
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- which gifts have been taken, by how many members
--   select g.id, count(*) from public.town_purses p, jsonb_array_elements_text(coalesce(p.doc->'gifts'->'had', '[]'::jsonb)) g(id) group by 1 order by 2 desc, 1;
--
--   -- the new deeds, a day at a time (each is written down with coins 0)
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*), sum(d.n) as n, sum(d.coins) as coins
--     from public.town_deeds d
--    where d.what in ('row', 'gnome', 'hourglass', 'basket_put', 'basket_take', 'drink', 'drink_gave', 'rain_fill', 'moon_keep', 'moon_pour',
--                     'slip', 'map_use', 'map_dig', 'chest', 'nectar', 'gift_use')
--    group by 1, 2 order by 1 desc, 2 limit 80;
--
--   -- what was gathered, netted and landed by a gift's doing (the squirrel, the piglet, a secret place, nectar, a pair, the cloak)
--   select d.what, coalesce(d.doc->>'by', case when d.doc ? 'secret' then 'secret' when d.doc ? 'nectar' then 'nectar' when d.doc ? 'pair' then 'pair' when d.doc ? 'cloak' then 'cloak' end) as how,
--          count(*), sum(d.n) as n
--     from public.town_deeds d where d.what in ('gather', 'net') and d.at > now() - interval '2 days'
--    group by 1, 2 order by 1, 3 desc;
--
--   -- stamina given between members by the flask, a day at a time
--   select (d.at at time zone 'Asia/Bangkok')::date as day, count(*) as drinks, count(distinct d.member_id) as drinkers
--     from public.town_deeds d where d.what = 'drink' group by 1 order by 1 desc limit 14;
