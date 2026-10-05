-- v131 — an insect caught is gone for everybody, and comes back elsewhere
--
-- Run this once in the Supabase SQL editor, AFTER v126 (it writes v126's
-- town_net again, and stops at its first line if v126 has not run), AND ONLY
-- ONCE THE SITE'S OWN CODE FOR IT IS LIVE. Running it again is safe.
--
-- Why. The owner, the day the insects came (2026-10-05), two things:
--
--   "เมื่อจับแมลงแล้ว ช่วยทำให้หายไปจากแมพ ในหน้าจอคนอื่นด้วย หลังจากนั้น จะมี delay
--    เล็กน้อยก่อนสุ่มเกิดที่ใหม่"
--   "ช่วยทำให้ การจับแมลงขาย balance ด้วย อย่าให้ได้เงินเยอะกว่าอาชีพอื่น"
--
-- So:
--
--   · An insect is one member's. Until now three members could each catch
--     the same one, and the other two went on seeing it. Now whoever's net
--     takes it has it, and it is told to nobody any more (every kind of
--     haunt: `shares` 1, where it was 3).
--   · Thirty seconds after a catch another insect comes out at another haunt
--     of the same map: one that has nothing in its turn, with two minutes of
--     that turn left at the least; which haunt is drawn by chance, and the
--     insect by that haunt's own odds at that hour. Once: one that came back
--     and is caught brings nothing back. A map so gives at most twice what
--     its haunts roll, however many hunt it (all told, about 9,000 insects a
--     day at the very most, where three to an insect made 13,600).
--   · The common insects fetch about a third less: a white butterfly, a
--     dragonfly, a grasshopper and a ladybird 2 coins where they fetched 3;
--     a monarch and a scarab 3 for 4; a damselfly and a cicada 5 for 7; a
--     stick insect 5 and a leaf insect 6 for 8; a firefly 4 for 6; a mantis 7
--     for 9. Caught with no miss, a day's common insects now fetch about 2.4
--     coins a point of stamina (they fetched 3.2): a common fish fetches
--     about 2, the forest 2.4, a quick vegetable 3.7. The rare ones are as
--     they were (a glass dragonfly 60, a Hercules beetle 150: a rare fish's
--     worth), and so is a beetle, which takes two people.
--   · And the relatives' moving price (v124) counts a thing's usual amount
--     in coins' worth: `market_bug`, 10 coins a head a round. Left alone, a
--     cheaper insect would count as less oversold and the cut would be an
--     eleventh, not a third, once the village sells many. It is turned to 7,
--     which keeps the usual number of insects where it was. Only if it is
--     still the 10 it was seeded with: a number an admin has turned stays.
--
-- What it adds: one closed table, `town_comebacks` (which haunt, in which
-- turn of its, which insect, from what moment, and whose catch brought it);
-- three rules (`town.backs_now`, `town.bug_here`, `town.comeback`:
-- lib/town/insects.ts's hereAt and comeback). What it writes again:
-- `public.town_bugs` (v125's, word for word but for three lines) and
-- `public.town_net` (v126's, but for the lines that do the above); the
-- catalog rows `insects` and `items`.
--
-- A page is told when to ask again (the moment the next one comes back),
-- never where: nothing of where it will be is sent before it is there.

/* ── v126 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regprocedure('town.rid_pick(jsonb, bigint, double precision)') is null then
    raise exception 'v126 has not run yet: run it first (this file writes its town_net again)';
  end if;
end $$;

-- <catalog:v131> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":22,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":60,"n":[1,1],"cost":1,"places":["farm","town"],"hours":[[5,18]],"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":10,"chance":0.55,"shares":1},"water":{"every":10,"chance":0.5,"shares":1},"field":{"every":10,"chance":0.55,"shares":1},"lamp":{"every":10,"chance":0.6,"shares":1},"tree":{"every":20,"chance":0.5,"shares":1},"litter":{"every":20,"chance":0.5,"shares":1},"glade":{"every":60,"chance":0.25,"shares":1},"falls":{"every":30,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "comeback": {"after":30,"least":120}
  }$town$::jsonb),
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
    "bowl": {"kind":"tool","tier":1,"stack":1,"pays":3},
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
    "scrollLassi": {"kind":"scroll","tier":3,"stack":1,"pays":35}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v131>

/* ── the relatives' usual amount of an insect ────────────────────────────── */

-- (v124's knob, in coins a head a round. A seed would not change it: it is
-- there. Turned only from the number it was seeded with.)
update public.town_knobs set value = 7 where key = 'market_bug' and value = 10;

/* ── what is kept ────────────────────────────────────────────────────────── */

-- An insect that comes back after a catch: at which haunt, in which turn of
-- that haunt's (a haunt has one insect in a turn: its own, or one come back
-- to it), which insect, how many a catch of it gives, the moment it is there
-- from, and whose catch brought it.
create table if not exists public.town_comebacks (
  haunt   integer not null,
  turn    bigint not null,
  bug     text not null,
  n       integer not null check (n > 0),
  from_ms bigint not null,
  by      uuid references public.profiles (id) on delete set null,
  at      timestamptz not null default now(),
  primary key (haunt, turn)
);
create index if not exists town_comebacks_from on public.town_comebacks (from_ms);

alter table public.town_comebacks enable row level security;
revoke all on public.town_comebacks from anon, authenticated;

/* ── the rules ───────────────────────────────────────────────────────────── */

-- Those that have come back and may still be about, the earliest first: a
-- turn is an hour at the longest, so two hours' are read.
create or replace function town.backs_now(p_now bigint)
returns jsonb language sql stable set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('haunt', c.haunt, 'turn', c.turn, 'bug', c.bug, 'n', c.n, 'from', c.from_ms) order by c.from_ms, c.haunt), '[]'::jsonb)
    from public.town_comebacks c where c.from_ms > p_now - 2 * 3600000::bigint
$$;

-- lib/town/insects.ts's hereAt(): what a haunt has now, of its own (v125's
-- bug_at) or come back to it after a catch elsewhere, or null. `p_backs` is
-- those that have come back, as town.backs_now tells them. One come back is
-- told with `back`.
create or replace function town.bug_here(p_haunt integer, p_now bigint, p_backs jsonb, p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  own jsonb := town.bug_at(p_haunt, p_now, ins, p_word);
  every bigint;
  phase bigint;
  turn bigint;
  b jsonb;
begin
  if own is not null then return own; end if;
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  select x.one into b from jsonb_array_elements(coalesce(p_backs, '[]'::jsonb)) with ordinality as x(one, ord)
   where (x.one->>'haunt')::int = p_haunt and (x.one->>'turn')::bigint = turn and (x.one->>'from')::bigint <= p_now
   order by x.ord limit 1;
  if b is null then return null; end if;
  return jsonb_build_object('turn', turn, 'bug', b->>'bug', 'n', (b->>'n')::int, 'seed', p_haunt::bigint * 100003 + turn,
    'until', (turn + 1) * every - phase, 'back', true);
end;
$$;

-- lib/town/insects.ts's comeback(): where the insect caught at a haunt comes
-- back, and as what. At another haunt of the same map that has nothing in
-- the turn it will be in then (none of its own, none come back to it), with
-- enough of that turn left, and where some insect may be at that hour: which
-- of them by `p_r1`, in the order of their numbers; the insect by that
-- haunt's own weights (`p_r2`), how many by `p_r3`; each a number from 0 up
-- to 1. Null when the map has no such haunt.
create or replace function town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision,
  p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  whence jsonb := ins->'haunts'->p_haunt;
  at_ bigint := p_now + (ins->'comeback'->>'after')::bigint * 1000;
  least_ bigint := (ins->'comeback'->>'least')::bigint * 1000;
  ids jsonb := ins->'order';
  backs jsonb := coalesce(p_backs, '[]'::jsonb);
  free integer[] := '{}';
  turns bigint[] := '{}';
  begins bigint[] := '{}';
  h jsonb;
  kind jsonb;
  bug jsonb;
  every bigint;
  phase bigint;
  turn bigint;
  began bigint;
  some_ boolean;
  n integer;
  nth integer;
  i integer;
  j integer;
  total double precision := 0;
  left_ double precision;
  pick text := null;
  lo integer;
  hi integer;
begin
  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    every := (kind->>'every')::bigint * 60000;
    phase := floor(town.roll('bugphase', i) * (kind->>'every')::double precision)::bigint * 60000;
    turn := floor((at_ + phase)::numeric / every)::bigint;
    began := turn * every - phase;
    continue when began + every - at_ < least_;
    continue when town.bug_at(i, at_, ins, word) is not null;
    continue when exists (select 1 from jsonb_array_elements(backs) x where (x->>'haunt')::int = i and (x->>'turn')::bigint = turn);
    some_ := false;
    for j in 0..jsonb_array_length(ids) - 1 loop
      bug := ins->'bugs'->(ids->>j);
      if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, began, word) then some_ := true; exit; end if;
    end loop;
    continue when not some_;
    free := free || i;
    turns := turns || turn;
    begins := begins || began;
  end loop;
  n := coalesce(array_length(free, 1), 0);
  if n = 0 then return null; end if;
  nth := least(n - 1, greatest(0, floor(coalesce(p_r1, 0) * n)::int)) + 1;
  i := free[nth];
  h := ins->'haunts'->i;
  -- the insect: by that haunt's own weights, as its own turn would roll it
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision; end if;
  end loop;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * total;
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then
      pick := ids->>j;
      left_ := left_ - (bug->>'weight')::double precision;
      exit when left_ < 0;
    end if;
  end loop;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('haunt', i, 'turn', turns[nth], 'bug', pick,
    'n', lo + least(hi - lo, greatest(0, floor(coalesce(p_r3, 0) * (hi - lo + 1))::int)), 'from', at_);
end;
$$;

/* ── what is out for me: v125's, with what has come back ─────────────────── */

-- <town_bugs>
create or replace function public.town_bugs()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  word text := town.word();
  backs jsonb := town.backs_now(now_);
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
    has := town.bug_here(i, now_, backs, ins, word);
    continue when has is null;
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, has->>'bug', (has->>'turn')::bigint, (has->>'seed')::bigint, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'bugs', out_,
    'bugsAgain', (select min((x->>'from')::bigint) from jsonb_array_elements(backs) x where (x->>'from')::bigint > now_),
    'book', (select coalesce(jsonb_object_agg(b.key, b.value->>'name'), '{}'::jsonb) from jsonb_each(town.thing('bugs', false)) b));
end;
$$;
-- </town_bugs>

/* ── a catch: v126's, gone for everybody and coming back elsewhere ───────── */

-- <town_net>
create or replace function public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric default 0, p_by uuid default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
  has := town.bug_here(p_haunt, now_, backs);
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
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$$;
-- </town_net>

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The new rules are no browser's to call; the two a member calls are a
-- member's, as they were.
revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_bugs() from public, anon;
revoke execute on function public.town_net(integer, integer, integer, numeric, uuid) from public, anon;
grant execute on function public.town_bugs() to authenticated;
grant execute on function public.town_net(integer, integer, integer, numeric, uuid) to authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select (select count(*) from jsonb_each(town.cat('insects')->'kinds') k where (k.value->>'shares')::int = 1) as kinds_of_one,
--          (select count(*) from jsonb_each(town.cat('insects')->'kinds')) as kinds,
--          town.cat('insects')->'comeback' as comeback;
--   -- 8 | 8 | {"after": 30, "least": 120}
--
--   select town.cat('items')->'ladybird'->>'pays' as ladybird, town.cat('items')->'cicada'->>'pays' as cicada,
--          town.cat('items')->'glassDragonfly'->>'pays' as glass_dragonfly, town.cat('items')->'herculesBeetle'->>'pays' as hercules;
--   -- 2 | 5 | 60 | 150
--
--   select value from public.town_knobs where key = 'market_bug';
--   -- 7   (or whatever an admin had turned it to)
--
--   select c.relrowsecurity as closed,
--          (select count(*) from information_schema.role_table_grants g
--            where g.table_schema = 'public' and g.table_name = 'town_comebacks' and g.grantee in ('anon', 'authenticated')) as grants
--     from pg_class c where c.oid = 'public.town_comebacks'::regclass;
--   -- true | 0
--
--   select has_function_privilege('authenticated', 'public.town_bugs()', 'execute') as bugs, has_function_privilege('anon', 'public.town_bugs()', 'execute') as bugs_anon,
--          has_function_privilege('authenticated', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as net,
--          has_function_privilege('anon', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as net_anon,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- true | false | true | false | 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- what has come back lately: where, what, from when, whose catch brought it, and whether it has been caught
--   select c.haunt, town.cat('insects')->'haunts'->c.haunt->>1 as map, c.bug, to_timestamp(c.from_ms / 1000.0) as from_, p.character_name as brought_by,
--          exists (select 1 from public.town_takes t where t.what = 'haunt' and t.place = c.haunt and t.turn = c.turn) as caught
--     from public.town_comebacks c left join public.profiles p on p.id = c.by order by c.from_ms desc limit 40;
--
--   -- catches by the hour: how many, and how many of them were of one that had come back
--   select date_trunc('hour', d.at) as hour, count(*) as catches, count(*) filter (where d.doc ? 'back') as of_one_come_back,
--          count(*) filter (where d.doc ? 'next') as brought_one_back, count(distinct d.member_id) as members
--     from public.town_deeds d where d.what = 'net' group by 1 order by 1 desc limit 48;
