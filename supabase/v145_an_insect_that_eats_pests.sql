-- v145 — an insect that eats pests, and a cure that keeps them off
--
-- Run this once in the Supabase SQL editor, after v140 (which has run, as
-- has everything up to v144). Running it again is safe (see the note on
-- numbers changed by hand, below).
--
-- Why. The owner, 2026-10-06, in the course of an hour:
--
--   "แมลงที่ใช้กำจัด ศัตรูพืชใน Cash town ช่วยทำให้กลับมาใช้งานได้ แต่มีโอกาศสำเร็จแค่ 70%"
--   "เอาเต่าทอง 50% ตักแตนตำข้าว 70% เพิ่มจำนวนแมลงสองตัวนี้ไปอีกเท่า
--    แต่ยังคงทำให้การยิ่งจับยิ่งน้อยยังมีอยู่"
--   "การกำจัดแมลงด้วยแมลง จะไม่ทำให้ป้องกันแมลงกลับมาโจมตีได้
--    แต่ยาฆ่าแมลงจะยังป้องกันได้ 24 ชม"
--
-- The day before (v140) a cover stopped being a cure: whatever keeps pests
-- off a plant for a day (the pest-proof fertiliser, the lavender sachet,
-- the mosquitofish, the ladybird, the mantis) no longer went on a plant
-- that had a pest, because a ladybird caught for a point of stamina was
-- doing the work of a cure that takes a scroll, a pot and five things, and
-- nobody made the cure. He now has the two INSECTS rid a pest again, but
-- not every time and with nothing more; and the cure that is made does
-- more than they do.
--
-- What it does.
--
--   · AN INSECT THAT EATS PESTS IS LET GO ON A PLANT THAT HAS ONE. The
--     catalog's `farming` row says which and how often (`rids`, new): a
--     ladybird half the time, a mantis seven times in ten (the mantis,
--     which takes a friend to catch, is the surer). `town.feed` lets such
--     a thing go on a plant with a pest. So often it eats the pest: the
--     plant is rid of it as a cure rids it (its `cured` is that moment),
--     and is covered by NOTHING, so a pest may come again the same day.
--     The other times it is off: the plant is as it was, pest and all.
--     Either way the insect is gone from the bag and the stamina spent.
--     `town.deed_for` offers it there. (On a plant with no pest it is a
--     cover for a day, as it always was.)
--
--     Which it is comes of a number made of the plot, its plant and the
--     very moment (`town.roll('rid|' || plot, moment, sown)`, the roll the
--     pests themselves are worked out by): this database's clock to the
--     millisecond, which nobody chooses. So the rule stays one that can be
--     asked again and answers the same, as every rule of the farm's, and
--     the site's own code answers each case as this does.
--
--   · THE PEST CURE KEEPS PESTS OFF FOR A DAY AFTER. `farming.cures`, new,
--     says which cure does and for how many hours: the pest cure, 24.
--     `town.cure` rids the plant as ever, and for such a cure covers it
--     from that moment as a cover does. The archerfish, the other cure,
--     only rids. (Until now no cure covered anything.) How the cure is
--     made is as it was.
--
--   · WHAT CAME OF AN INSECT IS WRITTEN DOWN. `public.town_tend` writes
--     the deed as ever (`feed`, with what was in the hand), and for an
--     insect let go on a plant that had a pest it adds `rid`: true, it ate
--     it; false, it was off. So how often each really works can be read
--     (the first query under "Reading it").
--
--   · TWICE AS MANY OF THE TWO INSECTS. The catalog's `insects` row: a
--     ladybird weighs 13 where it weighed 6, a mantis 50 where it weighed
--     22. A weight is a share of a haunt's roll, so twice the weight is a
--     little short of twice as many; these are the weights at which a dry
--     day's haunts roll each twice as often as now: about eight ladybirds
--     an hour over the three maps where there were four (the town 2.6, the
--     farm 2.0, the forest 3.4), and eight mantises an hour on the farm
--     where there were four. HUNTED, EACH GROWS SCARCE AS BEFORE: `scarce`
--     (v139: twenty of a kind caught in a day and it is out half as often)
--     is not touched, nor is the rule that reads it.
--
-- What stays as it was. The other three covers do not go on a plant with
-- a pest (v140). How a strike is counted (`town.pest_at`) is not touched,
-- so nothing is counted again: a plant covered or cured before this ran
-- is as it was. A ladybird's one chance in ten of taking a pest off some
-- plant when it is CAUGHT (v126) is as it was. What each insect costs to
-- catch and what it fetches are as they were.
--
-- The site and this file may go out in either order. A page from before
-- offers no cover for a plant with a pest, so nobody asks; a page with
-- the new rule and a database without this file offers the insect and is
-- told the plot is not ready for it. A cure covers from the moment this
-- runs, in any page (a page draws nothing for a cover). What is out at a
-- haunt is this database's alone to say, in any page.
--
-- It writes four functions again, each as it last ran but for the lines
-- meant (scripts/db/v145.lines.mjs; `node build-v145.mjs` writes them from
-- the texts that ran): `town.feed` and `town.deed_for` (v140's),
-- `town.cure` (v110's), and `public.town_tend` (v121's). No table, no
-- trigger.
--
-- NUMBERS CHANGED BY HAND. This file writes two rows of the catalog OVER,
-- whole: that is its purpose. Before it was written the live rows were
-- compared entry by entry with what the code gave before this change: the
-- same (`farming` last written by v130 on 2026-10-05 at 06:25 UTC,
-- `insects` by v139 the same day at 12:42 UTC). So of the whole catalog
-- five entries differ after it: `farming.rids.ladybird`,
-- `farming.rids.mantis` and `farming.cures.pestCure`, new, and the two
-- weights. If either row has been changed by hand since, the first query
-- at the foot says when it was last touched: look before running it. No
-- other row is touched, here or by running it twice.

do $$
begin
  if to_regprocedure('town.plenty(text, bigint, jsonb)') is null then
    raise exception 'v139 has not run yet: the insects'' row this file writes over has what that rule reads (scarce)';
  end if;
  if to_regprocedure('town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)') is null then
    raise exception 'v119 has not run yet: what a hand may do to a plot (town.deed_for) is what this file writes again';
  end if;
end $$;

/* ── the numbers ─────────────────────────────────────────────────────────── */

-- <catalog:v145> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
    "rids": {"ladybird":0.5,"mantis":0.7},
    "cures": {"pestCure":24},
    "pests": {"from":8,"to":18,"chance":0.03,"kills":6},
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
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":50,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":10,"chance":0.55,"shares":1},"water":{"every":10,"chance":0.5,"shares":1},"field":{"every":10,"chance":0.55,"shares":1},"lamp":{"every":10,"chance":0.6,"shares":1},"tree":{"every":20,"chance":0.5,"shares":1},"litter":{"every":20,"chance":0.5,"shares":1},"glade":{"every":60,"chance":0.25,"shares":1},"falls":{"every":30,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v145>

/* ── an insect let go on a plant: v140's, but for one that eats pests ────── */

-- <feed>
create or replace function town.feed(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if kind not in ('feed', 'guard') or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  if (town.see(p_key, p_plot, p_now)->>'dead')::boolean
     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed). But an insect that eats pests (`farming.rids`: how often) is let
  -- go on it: so often it eats the pest, and the plant is rid of it as a cure rids it and covered by nothing; the
  -- other times it is off, and the plant is as it was. Either way the insect and the stamina are gone. Which, by a
  -- number made of the plot, its plant and this very moment (lib/town/farm.ts's ridLuck).
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then
    if f->'rids'->>p_hand is null then return town.no('soil'); end if;
    return jsonb_build_object('ok', true,
      'plot', case when town.roll('rid|' || p_key, p_now, (p->>'sown')::bigint) < (f->'rids'->>p_hand)::double precision
                then p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)) else p_plot end,
      'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
  end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || case when kind = 'feed' then jsonb_build_object('fed', p_now)
      else jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000) end),
    'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;
-- </feed>

/* ── what the hand is offered: v140's, the same ──────────────────────────── */

-- <deed_for>
create or replace function town.deed_for(p_key text, p_plot jsonb, p_hand text, p_me text, p_now bigint, p_owner text)
returns text language plpgsql stable
as $$
declare
  seen jsonb := town.see(p_key, p_plot, p_now);
  kind text := coalesce(town.tool_of(p_hand), '');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  mine boolean := p_owner is null or p_owner = p_me;
  dead boolean := (seen->>'dead')::boolean;
  ripe boolean := (seen->>'ripe')::boolean;
begin
  if kind = 'hoe' then
    return case when p <> 'null'::jsonb then case when not mine then null when dead then 'pull' else 'uproot' end
                when p_plot->>'soil' = 'wild' then 'clear' when p_plot->>'soil' = 'cleared' then 'till' end;
  end if;
  if kind = 'seed' then return case when mine and p_plot->>'soil' = 'tilled' and p = 'null'::jsonb then 'sow' end; end if;
  if p <> 'null'::jsonb and not dead then
    if kind = 'cure' and (seen->>'pest')::boolean then return 'cure'; end if;
    if kind = 'can' and not (seen->>'wet')::boolean and not (town.growing(p, p_now)->>'spent')::boolean
       and not (ripe and town.cat('crops')->(p->>'crop')->>'again' is null) then return 'water'; end if;
    if kind = 'feed' and (p->>'fed')::bigint = 0 then return 'feed'; end if;
    if kind = 'guard' and (p->>'guard')::bigint <= p_now
       and (not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null) then return 'feed'; end if;
    if ripe and mine then return 'pick'; end if;
  end if;
  return null;
end;
$$;
-- </deed_for>

/* ── a cure: v110's, and the one that is made keeps pests off after ──────── */

-- <cure>
create or replace function town.cure(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
begin
  if coalesce(town.tool_of(p_hand), '') <> 'cure' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb or not (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
  -- (a cure that keeps pests off afterwards, `farming.cures`: the plant is covered for so many hours from this
  -- moment, as by a cover; another only rids it)
  return jsonb_build_object('ok', true, 'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)
      || case when coalesce((f->'cures'->>p_hand)::bigint, 0) > 0 then jsonb_build_object('guard', p_now + (f->'cures'->>p_hand)::bigint * 3600000) else '{}'::jsonb end),
    'purse', town.spend(p_purse, (f->'costs'->>'cure')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;
-- </cure>

/* ── tending a plot: v121's, with what came of the insect written down ───── */

-- <town_tend>
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb default null, p_sure boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
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
begin
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
-- </town_tend>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules are no browser's to call, written again or not; and tending is
-- a member's, as it was (a function written again keeps who may call it:
-- said again so that it is so whatever ran before).
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from public, anon;
grant execute on function public.town_tend(integer, integer, jsonb, boolean) to authenticated;

notify pgrst, 'reload schema';

-- ─── Before running it ───────────────────────────────────────────────────
--
-- Have the rows been changed by hand? They should say 2026-10-05 06:25
-- (farming) and 2026-10-05 12:42 (insects), UTC.
--
--   select key, updated_at from public.town_catalog where key in ('farming', 'insects') order by key;
--
-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select key, updated_at > now() - interval '1 hour' as written
--     from public.town_catalog order by key;
--   -- farming: t. insects: t. Every other row: f. (`written` is true for
--   -- an hour after it runs)
--
--   select (select data->'rids' from public.town_catalog where key = 'farming') as rids,
--          (select data->'cures' from public.town_catalog where key = 'farming') as cures,
--          (select (data->'bugs'->'ladybird'->>'weight')::int from public.town_catalog where key = 'insects') as ladybird,
--          (select (data->'bugs'->'mantis'->>'weight')::int from public.town_catalog where key = 'insects') as mantis,
--          (select data->'scarce' from public.town_catalog where key = 'insects') as scarce;
--   -- {"mantis": 0.7, "ladybird": 0.5} | {"pestCure": 24} | 13 | 50 | {"day": 24, "half": 20}
--
--   -- a pumpkin sown one morning long ago, which a pest struck at eight the next day (no weather is kept of then),
--   -- an hour into its pest, and somebody with a ladybird, a mantis, a sachet, a cure and an archerfish. At that
--   -- very moment the plot's number is 0.68: over a ladybird's half, under a mantis's seven in ten.
--   with x as (
--     select '133,4'::text as key, 1578362400000::bigint as an_hour_in,
--            jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', 'somebody', 'crop', 'pumpkin', 'sown', 1578265200000,
--              'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)) as plot,
--            town.fresh() || jsonb_build_object('bag', town.put(town.put(town.put(town.put(town.put(town.fresh()->'bag',
--              'ladybird', 1), 'mantis', 1), 'lavenderSachet', 1), 'pestCure', 1), 'archerfish', 1)) as purse)
--   select (town.see(key, plot, an_hour_in)->>'pest')::boolean as has_a_pest,
--          town.deed_for(key, plot, 'ladybird', 'me', an_hour_in, null) as a_ladybird_is_offered,
--          round(town.roll('rid|' || key, an_hour_in, 1578265200000)::numeric, 2) as the_moments_number,
--          (town.see(key, town.feed(key, purse, plot, 'ladybird', an_hour_in)->'plot', an_hour_in + 1)->>'pest')::boolean as a_pest_after_the_ladybird,
--          town.held(town.feed(key, purse, plot, 'ladybird', an_hour_in)->'purse'->'bag', 'ladybird') as ladybirds_left,
--          (town.see(key, town.feed(key, purse, plot, 'mantis', an_hour_in)->'plot', an_hour_in + 1)->>'pest')::boolean as a_pest_after_the_mantis,
--          (town.feed(key, purse, plot, 'mantis', an_hour_in)->'plot'->'plant'->>'guard')::bigint as covered_by_the_mantis_until,
--          (town.feed(key, purse, plot, 'lavenderSachet', an_hour_in)->>'ok')::boolean as a_sachet_goes_on,
--          ((town.cure(key, purse, plot, 'pestCure', an_hour_in)->'plot'->'plant'->>'guard')::bigint - an_hour_in) / 3600000 as hours_a_cure_keeps_it,
--          (town.cure(key, purse, plot, 'archerfish', an_hour_in)->'plot'->'plant'->>'guard')::bigint as covered_by_the_fish_until
--     from x;
--   -- true | feed | 0.68 | true | 0 | false | 0 | false | 24 | 0
--
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open,
--          has_function_privilege('anon', 'public.town_tend(integer, integer, jsonb, boolean)', 'execute') as anon_tends,
--          has_function_privilege('authenticated', 'public.town_tend(integer, integer, jsonb, boolean)', 'execute') as a_member_tends;
--   -- 0 | f | t
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- how often each insect let go on a plant with a pest ate it, a day at a time (a ladybird should come to about
--   -- half, a mantis to about seven in ten, once there are enough of them)
--   select date_trunc('day', d.at) as day, d.doc->>'with' as insect, count(*) as let_go,
--          count(*) filter (where (d.doc->>'rid')::boolean) as ate_it, count(distinct d.member_id) as members
--     from public.town_deeds d where d.what = 'feed' and d.doc ? 'rid' group by 1, 2 order by 1 desc, 2;
--
--   -- and what has been put on plants at all, by what was in the hand (a cure is `cure`; a cover and what makes a
--   -- plant grow are both `feed`)
--   select date_trunc('day', d.at) as day, d.what, d.doc->>'with' as with_, count(*) as times, count(distinct d.member_id) as members
--     from public.town_deeds d where d.what in ('feed', 'cure') group by 1, 2, 3 order by 1 desc, 4 desc;
