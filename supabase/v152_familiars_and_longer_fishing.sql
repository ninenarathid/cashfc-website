-- v152 — the familiars: one follows its member, for everybody to see
--
-- Run this once in the Supabase SQL editor, after v151 (it stops at its first
-- line without v151's gifts). Running it again is safe. **Run it after the
-- site's own code for it is live**: a page from before asks nothing of it,
-- and a page with the code and a database without this file offers the six
-- charms as before and no familiar.
--
-- Why. The owner, 2026-10-06, of what the lines' ranks give:
--
--   "ใส่ ภูติ หรือ สัตว์เดินตามได้ 1 ชนิด"   (changed "อิสระ")
--   and, of building every rank's gift: "ทำต่อได้เลย เอาให้ครบถึงขั้น 10 เลย"
--
-- What it does (the rules are lib/town/gifts.ts again):
--
--   * The second rank of three lines gives a familiar: the forest's a
--     squirrel, the insects' a lucky butterfly, the farm's a garden gnome.
--     It is taken as a charm is (`town_gift_take`, v151's, as it is), is
--     bound to its member and is in no slot of the bag.
--   * One familiar follows its member at a time (`town_familiar_wear(id)`;
--     null sends it to rest), changed as often as one likes. Which follows
--     is kept in the purse (`gifts.familiar`), so `town.gifts_of` (v151's)
--     is written again to keep it: as it ran but for the lines meant
--     (v152.lines.mjs). Everybody's page draws it at its member's heels;
--     that is told through the room, not through the database.
--   * What these three do is the page's own to read (their games are played
--     in the browser): no rule of the game is judged otherwise here.
--   * What a gift does only so many times (the gnome weeds ten plots to a
--     meal's hours) is counted in the purse (`gifts.used`), here, so that the
--     count is the same on every device: `town_gift_use(id)` uses one, for
--     what the page itself then does.
--   * `town.work_answer` (v151's) says which gifts are given, so that a page
--     offers those and no other.
--   * The first charms do more (the owner, 2026-10-07: nearly OP, as the
--     forest's lamp is). What the net and the apron do is the page's own (the
--     net shows where every insect is, the apron's pot says whether what is in
--     it can still be a recipe): their numbers in the catalog are 1. Two are
--     the database's to know: the whispering float no longer lengthens the
--     strike's moment (its number is 1, which the rule multiplies by), and
--     `town_cast` (v146's, written again but for the lines meant) tells
--     whoever wears it what is on its way when the line is dropped.
--   * Fishing lasts longer (the owner, 2026-10-07: "เหยือหมดไวเกินไป สตามิน่า
--     ก็หมดไว เล่นแปบเดียวก็หมดแล้ว"). A fish that was hooked and got away in
--     the fight gives its bait back (`town_land`, v108's, written again but
--     for the lines meant; a strike mistimed and a line taken up give nothing
--     back). The uncle sells twice the bait: twenty worms and twenty dough a
--     person a round, and twice as many of each in his stock (catalog row
--     `goods`; nothing else of his shelf moves). A common fish takes half the
--     stamina to fight, one at the least (catalog row `fish`).
--
-- What it changes: one catalog row written over (`gifts`: three gifts more,
-- and what is counted; the float's number and the net's), five rules new, three
-- functions and `town_land` written again, a rule new for the bait given
-- back, two functions a member calls; and two catalog rows more written over
-- (`goods`: the two baits; `fish`: what a common fish's fight costs). No table.
-- No coins and no thing that can be sold comes of it.

do $$ begin
  if to_regprocedure('town.gifts_of(jsonb)') is null or to_regprocedure('public.town_gift_take(text, integer)') is null then raise exception 'v151 has not run: there are no gifts to add a familiar to'; end if;
end $$;

-- <catalog:v152> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('gifts', $town${
    "slots": 2,
    "uses": {"famGnome":{"n":10,"per":"meal"}},
    "gifts": {"charmApron":{"kind":"charm","line":"kitchen","rank":1,"by":1},"charmGloves":{"kind":"charm","line":"helpers","rank":1,"by":0.5},"charmFloat":{"kind":"charm","line":"fishing","rank":1,"by":1},"charmLamp":{"kind":"charm","line":"forest","rank":1,"by":5},"charmNet":{"kind":"charm","line":"insects","rank":1,"by":1},"charmHoe":{"kind":"charm","line":"farming","rank":1,"by":1.5},"famSquirrel":{"kind":"familiar","line":"forest","rank":2,"by":2},"famButterfly":{"kind":"familiar","line":"insects","rank":2,"by":1},"famGnome":{"kind":"familiar","line":"farming","rank":2,"by":10}}
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
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[5,22]],"rain":1,"wait":[3,15],"size":[4,8],"effort":1,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,22],"effort":2,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8,"moth":1},"hours":[[7,17]],"rain":1,"wait":[5,28],"size":[18,32],"effort":2,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[5,20]],"rain":1.3,"wait":[5,25],"size":[10,18],"effort":2,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"loach":0.5,"dough":0.3,"caterpillar":1,"moth":0.3,"dragonfly":0.5},"hours":[[18,24],[0,6]],"rain":2,"wait":[8,35],"size":[25,45],"effort":3,"line":1},
    "pangasius": {"tier":"uncommon","baits":{"dough":1,"corn":1,"moth":1},"hours":[[8,17]],"rain":1,"wait":[10,50],"size":[50,90],"effort":7,"line":1.3},
    "snakehead": {"tier":"uncommon","baits":{"minnow":1,"worm":0.3,"caterpillar":0.3,"dragonfly":1},"hours":[[5,8],[17,20]],"rain":1.2,"wait":[13,55],"size":[35,70],"effort":7,"line":1.1},
    "eel": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[19,24],[0,5]],"rain":2.5,"wait":[13,55],"size":[40,80],"effort":6,"line":1},
    "prawn": {"tier":"uncommon","baits":{"worm":0.8,"dough":0.6,"caterpillar":0.8,"moth":0.6},"hours":[[17,24]],"rain":1,"wait":[10,45],"size":[14,28],"effort":4,"line":0.7},
    "featherback": {"tier":"rare","baits":{"minnow":1,"dragonfly":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[45,85],"effort":8,"line":1.2},
    "goby": {"tier":"rare","baits":{"minnow":1,"worm":0.7,"caterpillar":0.7,"dragonfly":1},"hours":[[20,24],[0,4]],"rain":1,"wait":[23,90],"size":[25,50],"effort":8,"line":1.1},
    "gourami": {"tier":"common","baits":{"branBait":1,"cricket":0.6,"grasshopper":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,20],"effort":2,"line":0.8},
    "crab": {"tier":"common","baits":{"shrimpLive":1,"branBait":0.5},"hours":[[17,24],[0,6]],"rain":1.5,"wait":[5,25],"size":[5,9],"effort":1,"line":0.5},
    "snail": {"tier":"common","baits":{"branBait":1},"hours":[[0,24]],"rain":1.2,"wait":[4,20],"size":[2,4],"effort":1,"line":0.4},
    "hampala": {"tier":"uncommon","baits":{"cricket":1,"shrimpLive":0.8,"grasshopper":1},"hours":[[5,9],[16,19]],"rain":1,"wait":[10,45],"size":[25,50],"effort":6,"line":0.9},
    "sheatfish": {"tier":"uncommon","baits":{"shrimpLive":1},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[13,55],"size":[25,45],"effort":6,"line":1},
    "bagrid": {"tier":"uncommon","baits":{"cricket":1,"branBait":0.4,"grasshopper":1},"hours":[[18,24],[0,5]],"rain":2,"wait":[13,55],"size":[30,60],"effort":7,"line":1.2},
    "giantGourami": {"tier":"uncommon","baits":{"branBait":1},"hours":[[8,17]],"rain":1,"wait":[13,55],"size":[35,60],"effort":8,"line":1.4},
    "frog": {"tier":"uncommon","baits":{"cricket":1,"grasshopper":1},"hours":[[18,24],[0,6]],"rain":3,"wait":[10,45],"size":[8,14],"effort":4,"line":0.6},
    "tigerfish": {"tier":"rare","baits":{"shrimpLive":1},"hours":[[5,8],[17,20]],"rain":1,"wait":[23,90],"size":[20,40],"effort":9,"line":1.1},
    "wallago": {"tier":"rare","baits":{"shrimpLive":1,"cricket":0.5,"grasshopper":0.5},"hours":[[19,24],[0,5]],"rain":1.5,"wait":[23,90],"size":[60,120],"effort":10,"line":1.5},
    "croaker": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[13,55],"size":[20,35],"effort":7,"line":1.1},
    "blackEar": {"tier":"uncommon","baits":{"fermentedBait":1},"hours":[[6,18]],"rain":1,"wait":[13,55],"size":[50,90],"effort":9,"line":1.5},
    "spinyEel": {"tier":"uncommon","baits":{"antEggs":1},"hours":[[19,24],[0,5]],"rain":2,"wait":[13,55],"size":[25,45],"effort":6,"line":0.9},
    "puffer": {"tier":"uncommon","baits":{"antEggs":0.8,"lure":0.5},"hours":[[9,16]],"rain":1,"wait":[10,45],"size":[8,15],"effort":4,"line":0.6},
    "goldenCarp": {"tier":"rare","baits":{"fermentedBait":1},"hours":[[5,8],[16,19]],"rain":1,"wait":[23,90],"size":[50,90],"effort":10,"line":1.6},
    "giantSnakehead": {"tier":"rare","baits":{"lure":1},"hours":[[5,9],[16,20]],"rain":1.2,"wait":[23,90],"size":[60,110],"effort":11,"line":1.5},
    "royalFeatherback": {"tier":"rare","baits":{"lure":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[23,90],"size":[50,90],"effort":10,"line":1.4},
    "arowana": {"tier":"legend","baits":{"lure":1},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[50,90],"effort":13,"line":1.6},
    "stingray": {"tier":"legend","baits":{"fermentedBait":1},"hours":[[21,24],[0,4]],"rain":1,"wait":[30,120],"size":[100,220],"effort":14,"line":2},
    "megaCatfish": {"tier":"legend","baits":{"fermentedBait":0.7,"antEggs":0.5},"hours":[[4,7],[18,21]],"rain":1,"wait":[30,120],"size":[120,270],"effort":15,"line":2.2},
    "koi": {"tier":"legend","baits":{"dough":1,"corn":0.7,"moth":1},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[60,100],"effort":12,"line":1.5},
    "loach": {"tier":"common","baits":{"worm":1,"dough":0.5,"caterpillar":1,"moth":0.5},"hours":[[0,24]],"rain":3,"wait":[4,20],"size":[8,15],"effort":1,"line":0.5,"water":"bank"},
    "mosquitofish": {"tier":"common","baits":{"dough":1,"worm":0.5,"caterpillar":0.5,"moth":1},"hours":[[6,18]],"rain":1,"wait":[3,15],"size":[3,6],"effort":1,"line":0.4,"water":"bank"},
    "mussel": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[6,12],"effort":1,"line":0.4,"water":"bank"},
    "crayfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"caterpillar":1,"dragonfly":0.5},"hours":[[18,24],[0,5]],"rain":1.5,"wait":[5,25],"size":[7,13],"effort":2,"line":0.6,"water":"bank"},
    "goldfish": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[8,18]],"rain":1,"wait":[5,25],"size":[6,14],"effort":1,"line":0.5,"water":"bank","needs":["weekend"]},
    "carp": {"tier":"common","baits":{"corn":1,"dough":0.7,"moth":0.7},"hours":[[6,18]],"rain":1,"wait":[6,28],"size":[25,50],"effort":3,"line":1},
    "piranha": {"tier":"common","baits":{"minnow":1,"loach":1,"worm":0.4,"caterpillar":0.4,"dragonfly":1},"hours":[[9,17]],"rain":1,"wait":[4,20],"size":[15,30],"effort":2,"line":0.8,"water":"deck"},
    "herring": {"tier":"uncommon","baits":{"worm":1,"dough":0.6,"caterpillar":1,"moth":0.6},"hours":[[4,8]],"rain":1,"wait":[8,40],"size":[18,32],"effort":4,"line":0.8},
    "archerfish": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[8,18]],"rain":0,"wait":[10,45],"size":[10,20],"effort":4,"line":0.7},
    "pacu": {"tier":"uncommon","baits":{"dough":1,"corn":1,"moth":1},"hours":[[9,16]],"rain":1,"wait":[10,50],"size":[30,60],"effort":7,"line":1.2},
    "pike": {"tier":"uncommon","baits":{"minnow":1,"loach":1,"dragonfly":1},"hours":[[5,9],[16,19]],"rain":1,"wait":[13,55],"size":[40,90],"effort":7,"line":1.2},
    "nilePerch": {"tier":"uncommon","baits":{"loach":1,"minnow":0.6,"dragonfly":0.6},"hours":[[10,16]],"rain":0,"wait":[13,55],"size":[50,110],"effort":8,"line":1.4},
    "salmon": {"tier":"uncommon","baits":{"loach":1,"worm":0.6,"caterpillar":0.6},"hours":[[0,24]],"rain":4,"wait":[10,45],"size":[45,85],"effort":7,"line":1.2,"dry":0},
    "wels": {"tier":"rare","baits":{"minnow":1,"loach":1,"dragonfly":1},"hours":[[21,24],[0,4]],"rain":2,"wait":[18,75],"size":[80,180],"effort":9,"line":1.5},
    "gar": {"tier":"rare","baits":{"loach":1,"minnow":0.6,"dragonfly":0.6},"hours":[[17,21]],"rain":1,"wait":[18,75],"size":[70,150],"effort":9,"line":1.4},
    "arapaima": {"tier":"legend","baits":{"loach":0.3},"hours":[[5,7],[17,19]],"rain":1,"wait":[30,120],"size":[120,250],"effort":13,"line":1.9},
    "dozyFish": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[4,20],"size":[12,24],"effort":1,"line":0.4,"needs":["tired"]},
    "popotoFish": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[10,20],"effort":2,"line":0.7,"needs":["crowd"]},
    "rainbowFish": {"tier":"common","baits":{"dough":1,"worm":1,"caterpillar":1,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[8,14],"effort":2,"line":0.6,"needs":["after"]},
    "moonFish": {"tier":"rare","baits":{"dough":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[20,40],"effort":7,"line":1,"needs":["full"]}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v152>

-- ─── The rules ───────────────────────────────────────────────────────────

-- A purse's gifts, made sound (lib/town/gifts' giftsOf): as v151 wrote it, and which familiar follows.
-- <gifts_of>
create or replace function town.gifts_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  g jsonb := town.cat('gifts');
  kept jsonb := p_purse->'gifts';
  had jsonb := '[]'::jsonb;
  charms jsonb := '[]'::jsonb;
  x jsonb;
  owed double precision := 0;
  fam text;
begin
  if jsonb_typeof(kept->'had') = 'array' then
    for x in select t.e from jsonb_array_elements(kept->'had') with ordinality as t(e, ord) order by t.ord loop
      if jsonb_typeof(x) = 'string' and g->'gifts' ? (x #>> '{}') and not (had ? (x #>> '{}')) then had := had || x; end if;
    end loop;
  end if;
  if jsonb_typeof(kept->'charms') = 'array' then
    for x in select t.e from jsonb_array_elements(kept->'charms') with ordinality as t(e, ord) order by t.ord loop
      if jsonb_array_length(charms) < (g->>'slots')::integer and jsonb_typeof(x) = 'string' and had ? (x #>> '{}')
         and g->'gifts'->(x #>> '{}')->>'kind' = 'charm' and not (charms ? (x #>> '{}')) then charms := charms || x; end if;
    end loop;
  end if;
  if jsonb_typeof(kept->'owed') = 'number' and (kept->>'owed')::double precision > 0 and (kept->>'owed')::double precision < 1 then owed := (kept->>'owed')::double precision; end if;
  if jsonb_typeof(kept->'familiar') = 'string' and had ? (kept->>'familiar') and g->'gifts'->(kept->>'familiar')->>'kind' = 'familiar' then fam := kept->>'familiar'; end if;
  return jsonb_build_object('had', had, 'charms', charms, 'owed', owed, 'familiar', fam,
    'used', case when jsonb_typeof(kept->'used') = 'object' then kept->'used' else '{}'::jsonb end);
end;
$$;
-- </gifts_of>

-- Have this familiar follow me and no other (null: none follows): one I have (lib/town/gifts' wearFamiliar).
create or replace function town.familiar_wear(p_purse jsonb, p_id text)
returns jsonb language plpgsql stable
as $$
declare
  g jsonb := town.cat('gifts');
  mine jsonb := town.gifts_of(p_purse);
begin
  if p_id is not null and (not (mine->'had' ? p_id) or g->'gifts'->p_id->>'kind' is distinct from 'familiar') then return town.no('none'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('gifts', mine || jsonb_build_object('familiar', p_id)));
end;
$$;

-- Whether a gift works for somebody now (lib/town/gifts' works): one they have; and a charm is worn, a familiar follows.
create or replace function town.gift_works(p_purse jsonb, p_id text)
returns boolean language sql stable
as $$
  select coalesce(m.g->'had' ? p_id and case town.cat('gifts')->'gifts'->p_id->>'kind'
      when 'charm' then m.g->'charms' ? p_id when 'familiar' then m.g->>'familiar' = p_id else true end, false)
    from (select town.gifts_of(p_purse) as g) m
$$;

-- The stretch of time a count is of, as one number (lib/town/gifts' stretchOf): the day, or the day and which meal's hours of it.
create or replace function town.stretch_of(p_per text, p_now bigint)
returns bigint language sql stable
as $$ select case when p_per = 'day' then town.day_of(p_now)::bigint else town.day_of(p_now)::bigint * 3 + town.meal_of(p_now) end $$;

-- How many times a counted gift has been used in the stretch p_now is in (lib/town/gifts' usedOf): none, of a count
-- kept wrongly or of another stretch.
create or replace function town.used_of(p_purse jsonb, p_id text, p_now bigint)
returns integer language plpgsql stable
as $$
declare
  rule jsonb := town.cat('gifts')->'uses'->p_id;
  u jsonb := town.gifts_of(p_purse)->'used'->p_id;
begin
  if rule is null or u is null or jsonb_typeof(u) <> 'object' or jsonb_typeof(u->'k') is distinct from 'number' or jsonb_typeof(u->'n') is distinct from 'number'
     or (u->>'k')::numeric <> town.stretch_of(rule->>'per', p_now) then return 0; end if;
  return greatest(0, floor((u->>'n')::numeric))::integer;
end;
$$;

-- Use a counted gift once (lib/town/gifts' useGift): it has to work for me now, and to have a time left in this stretch.
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
      (mine->'used') || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_of(rule->>'per', p_now), 'n', n + 1)))));
end;
$$;

-- ─── The lines of work say which gifts are given ─────────────────────────

-- <work_answer>
create or replace function town.work_answer(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('now', town.now_ms(), 'gifting', true,
    'gives', (select coalesce(jsonb_agg(k.id order by k.id), '[]'::jsonb) from jsonb_object_keys(town.cat('gifts')->'gifts') as k(id)),
    'lines', town.work_told(p_member, town.now_ms()),
    'worn', (select jsonb_build_object('line', t.line, 'rank', t.rank) from public.town_titles t where t.member_id = p_member),
    'titles', (select coalesce(jsonb_object_agg(t.member_id::text, jsonb_build_object('line', t.line, 'rank', t.rank)), '{}'::jsonb) from public.town_titles t))
$$;
-- </work_answer>

-- ─── The whispering float tells what is coming ───────────────────────────

-- <cast>
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean default false)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  did := town.hook_bait(purse, p_bait);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  line := town.cast_line(p_bait, hour, town.raining(now_), town.has_buff(purse, now_, 'lucky'), not deep::boolean, signs,
    array[random(), random(), random(), random(), random(), random()], town.buff_by(purse, now_, 'lucky'));
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', p_bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', p_bait, 1, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs)));
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end));
end;
$$;
-- </cast>

-- ─── Fishing that lasts longer ───────────────────────────────────────────

-- A fish that was hooked got away in the fight: the bait it took comes back, where the bag has room for it
-- (lib/town/fishing's backBait). A bait that is not eaten never left the bag.
create or replace function town.back_bait(p_purse jsonb, p_bait text)
returns jsonb language sql stable
as $$
  select case when town.cat('fishing')->'kept' ? p_bait or town.room(p_purse->'bag', p_bait) < 1 then p_purse
    else p_purse || jsonb_build_object('bag', town.put(p_purse->'bag', p_bait, 1)) end
$$;

-- <land>
create or replace function public.town_land(p_how text, p_fight jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
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
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    if how = 'landed' and (took < floor((fish->>'line')::double precision / (cat->>'reel')::double precision * (cat->>'least')::double precision * 1000)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
    elsif how in ('snapped', 'slipped') and not suspect then
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
$$;
-- </land>

-- ─── What a member does ──────────────────────────────────────────────────

-- Have this familiar of mine follow me, or none.
create or replace function public.town_familiar_wear(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.familiar_wear(town.purse_of(me, true), p_id);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'familiar', p_id, case when p_id is null then 0 else 1 end, 0, '{}'::jsonb);
  end if;
  return town.answer(me, did);
end;
$$;

-- Use a gift of mine that is counted, once: for what the page itself then does (the gnome's weeding).
create or replace function public.town_gift_use(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  did jsonb := town.gift_use(town.purse_of(me, true), p_id, town.now_ms());
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gift_use', p_id, 1, 0, jsonb_build_object('left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$$;

revoke execute on all functions in schema town from public, anon, authenticated;
revoke execute on function public.town_familiar_wear(text) from public, anon;
grant execute on function public.town_familiar_wear(text) to authenticated;
revoke execute on function public.town_gift_use(text) from public, anon;
grant execute on function public.town_gift_use(text) to authenticated;

-- ─── Checking it ─────────────────────────────────────────────────────────
--
--   select (select count(*) from jsonb_object_keys(data->'gifts')) as gifts,
--          (select count(*) from jsonb_each(data->'gifts') e where e.value->>'kind' = 'familiar') as familiars
--     from public.town_catalog where key = 'gifts';
--   -- 9 | 3
--
--   select jsonb_array_length(town.work_answer(null)->'gives') as given;
--   -- 9
--
--   select town.gifts_of('{"gifts": {"had": ["famGnome"], "familiar": "famGnome"}}'::jsonb)->>'familiar' as follows;
--   -- famGnome
--
--   select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--      and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'));
--   -- 0
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   -- whom which familiar follows
--   select p.member_id, p.doc->'gifts'->>'familiar' as follows from public.town_purses p where p.doc->'gifts'->>'familiar' is not null order by 1 limit 80;
--
--   -- what was used of the gifts that are counted, as it was written down
--   select d.member_id, d.at, d.thing, d.doc->'left' as left from public.town_deeds d where d.what = 'gift_use' order by d.at desc limit 40;
--
--   -- a familiar called or sent to rest, as it was written down
--   select d.member_id, d.at, d.thing from public.town_deeds d where d.what = 'familiar' order by d.at desc limit 40;
