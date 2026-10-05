-- v125 — the forest, and a net for insects
--
-- Run this once in the Supabase SQL editor, AFTER v123 (it writes v123's
-- town.deed_th again, with two words more, and its town.wishes, with two
-- wishes more; it stops at its first line if v123 has not run). Running it
-- again is safe.
--
-- Why. The owner asked for two things more to do in the town (2026-10-05):
-- "หาของป่า จะมี map ใหม่ เป็นป่าใหญ่ๆ สามารถเดินเข้าไปเก็บของป่าที่จะ spawn ออกมาเป็น
-- ช่วงเวลา เช่นของบางอย่างเกิดทุก 10 นาที ไปจนถึง ขอหายาก ที่จะเกิดเฉพาะบางวัน แบบ Random
-- … การหาของป่าต้องเล่น minigame ด้วย", and "จับแมลง ในทุกแมพในเกม … สามารถใช้ที่จับแมลง
-- จับมาได้ แต่ต้องวิ่งไปจับให้ทัน". Both cost stamina, and what they give goes
-- somewhere besides the uncle's relatives: into a pot, onto a hook, onto a
-- plant.
--
-- The rules are lib/town/forest.ts and lib/town/insects.ts, written again
-- here:
--
--   · the forest has places and the three maps have haunts, laid out once by
--     the code and told here (two rows of `town_catalog`). Time at each goes
--     in turns of its own length; in a turn a place has one thing or nothing,
--     and a haunt one insect or none: rolled from the place, the turn and a
--     word only this database knows (`town_secrets`: the code is public, and
--     nobody is to work out tomorrow's truffles from it), by where it is, the
--     hour, the sky (`town_weather`), the moon, and for the rare ones whether
--     today is a day of theirs;
--   · what a place or a haunt has in a turn is for several, and each member
--     takes from it once (`town_takes`): whoever finds something loses
--     nothing by calling a friend over;
--   · gathering costs stamina, and how its game went is how many come of it
--     (never none); among mushrooms a wrong one taken is a toadstool besides.
--     Digging takes a hoe in the hand;
--   · an insect is caught with a net in the hand, from near its haunt; each
--     swing that missed first is a point of stamina more, up to two. A beetle
--     comes down its tree only to something sweet held under it by somebody
--     else, whose hand this database reads from their own purse. The first of
--     a kind caught is written in the village's book, with who caught it.
--
-- As with every game here, the page is believed about how the game went (the
-- misses) and where its member stood; that the thing was there this turn,
-- that they had not had it, the hand, the bag and the stamina are checked
-- here. How an insect moves and the net's ring are the page's alone.
--
-- What it adds: `town_secrets` (a word; no browser reads it, and no function
-- a browser calls gives it back), `town_takes` (who took what in which
-- turn), a row of `town_things` (the village's book of insects), the rules
-- (`town.wild_holds`, `town.gather`, `town.bug_at`, `town.net` and what they
-- stand on), and four functions a member calls: `town_wild()`,
-- `town_gather(spot, x, y, went)`, `town_bugs()`, `town_net(haunt, x, y,
-- misses, by)`. Two deeds more are written down (`town_deeds`, v121):
--
--   gather     gathered in the forest: the thing, how many. With the place,
--              its kind and the way it is gathered, the tile, the thing in
--              the hand, the game's misses and wrong ones and seconds, and
--              whether it was done with no stamina
--   net        an insect caught: which, how many. With the haunt, its kind
--              and map, the tile, the misses, whether with no stamina, and
--              for a beetle what was held under its tree and by whom
--
-- and `town.deed_th` has their words. Fifteen catalog rows are seeded or
-- written over (below, between the marked lines): the things themselves and
-- what is made of them, a net on the uncle's shelf from the first day, four
-- insects that go on a hook as a bait there already was and five that go on
-- a plant.
--
-- And two wishes more at the fountain (v123), asked for the same day ("อยาก
-- ให้ช่วยเพิ่ม บัฟที่เกี่ยวของกับ การหาของป่า การจับแมลงที่เพิ่มเข้ามาใหม่"): `forage`,
-- under which each of the forest's games is a little kinder, and `net`,
-- under which an insect lets somebody come nearer. Both are the page's to
-- act on (the games are the page's): here only `town.wishes` learns their
-- names, so that the fountain offers them from the moment this file runs.
--
-- What it does not change: no function that was here before but
-- `town.deed_th` and `town.wishes`. Cooking at the camp's fire is v111's `town_cook` as it is
-- (where a cook stands was never the database's to check, and a skewer is
-- cookware by the catalog's word).

/* ── v123 first ──────────────────────────────────────────────────────────── */

do $$
begin
  if to_regclass('public.town_blessings') is null then
    raise exception 'v123 has not run yet: run it first (this file writes its town.deed_th and town.wishes again)';
  end if;
end $$;

/* ── what is kept ────────────────────────────────────────────────────────── */

-- A word the rolls hang on. Made here, once, and read by nothing but the
-- rules below: no policy, no grant.
create table if not exists public.town_secrets (
  key  text primary key,
  word text not null
);
alter table public.town_secrets enable row level security;
revoke all on public.town_secrets from anon, authenticated;

insert into public.town_secrets (key, word)
values ('wild', md5(random()::text || clock_timestamp()::text) || md5(random()::text || txid_current()::text))
on conflict (key) do nothing;

-- Who has taken from which place of the forest (`what` 'spot') or caught
-- which haunt's insect ('haunt') in which turn. A member once to a turn.
-- Written by the two deeds below and by nothing else.
create table if not exists public.town_takes (
  what      text not null check (what in ('spot', 'haunt')),
  place     integer not null,
  turn      bigint not null,
  member_id uuid not null references public.profiles (id) on delete cascade,
  at        timestamptz not null default now(),
  primary key (what, place, turn, member_id)
);
create index if not exists town_takes_at on public.town_takes (at);
alter table public.town_takes enable row level security;
revoke all on public.town_takes from anon, authenticated;

-- The village's book of insects: who first caught each kind.
insert into public.town_things (key, doc) values ('bugs', '{}'::jsonb) on conflict (key) do nothing;

-- <catalog:v125> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('forest', $town${
    "kinds": {"sticks":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"twig","weight":60,"n":[1,2]},{"item":"pineCone","weight":25,"n":[1,2]},{"item":"feather","weight":8,"n":[1,1]},{"item":"resin","weight":7,"n":[1,1],"zones":["woods","deep"]}]},"leaves":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"leafMould","weight":75,"n":[1,2]},{"item":"vine","weight":25,"n":[1,2],"zones":["woods","deep","bamboo"]}]},"flowers":{"how":"pick","every":10,"chance":0.6,"shares":3,"cost":1,"finds":[{"item":"wildflower","weight":100,"n":[1,2]},{"item":"fourLeafClover","weight":2,"n":[1,1],"zones":["edge"]},{"item":"wildOrchid","weight":40,"n":[1,1],"zones":["deep","bamboo"],"day":0.25},{"item":"moonflower","weight":400,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"moon":true}]},"bamboo":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"bambooCane","weight":1,"n":[1,2]}]},"clay":{"how":"pick","every":30,"chance":0.7,"shares":3,"cost":1,"finds":[{"item":"clay","weight":1,"n":[1,3]}]},"mushrooms":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"shiitake","weight":60,"n":[1,2]},{"item":"chanterelle","weight":50,"n":[1,2],"rain":6},{"item":"porcini","weight":35,"n":[1,2],"rain":6,"zones":["deep"]},{"item":"glowMushroom","weight":80,"n":[1,2],"zones":["deep"],"hours":[[19,24],[0,5]]}]},"greens":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"fiddlehead","weight":100,"n":[1,2],"zones":["stream"]},{"item":"mint","weight":60,"n":[1,2],"zones":["edge","stream"]},{"item":"rosemary","weight":100,"n":[1,2],"zones":["rise"]},{"item":"chamomile","weight":60,"n":[1,2],"zones":["edge"],"hours":[[5,12]]},{"item":"lavender","weight":50,"n":[1,2],"zones":["edge"]}]},"berries":{"how":"choose","every":30,"chance":0.65,"shares":3,"cost":2,"finds":[{"item":"blueberry","weight":100,"n":[2,3],"zones":["edge","woods"]},{"item":"raspberry","weight":100,"n":[2,3],"zones":["woods","rise"]},{"item":"wildStrawberry","weight":40,"n":[1,2],"zones":["edge"]}]},"nook":{"how":"pick","every":120,"chance":0.5,"shares":2,"cost":1,"finds":[{"item":"egg","weight":60,"n":[1,2],"zones":["edge","woods"]},{"item":"silkCocoon","weight":40,"n":[1,1],"zones":["bamboo","woods"]},{"item":"feather","weight":20,"n":[1,2]}]},"mound":{"how":"dig","every":30,"chance":0.6,"shares":2,"cost":3,"finds":[{"item":"bambooShoot","weight":100,"n":[1,2],"zones":["bamboo"],"hours":[[4,12]]},{"item":"wildYam","weight":60,"n":[1,2],"zones":["woods","rise","edge","deep"]},{"item":"worm","weight":50,"n":[1,3]},{"item":"truffle","weight":40,"n":[1,1],"zones":["deep"],"day":0.25},{"item":"ginseng","weight":3,"n":[1,1],"zones":["deep"]},{"item":"amber","weight":3,"n":[1,1],"zones":["rise"]},{"item":"mandrake","weight":2,"n":[1,1],"zones":["deep"],"hours":[[19,24],[0,5]],"rain":2}]},"fruit":{"how":"shake","every":60,"chance":0.7,"shares":3,"cost":2,"finds":[{"item":"wildApple","weight":100,"n":[2,3],"zones":["edge"]},{"item":"chestnut","weight":100,"n":[1,3],"zones":["woods","deep","rise","stream","bamboo"]}]},"glint":{"how":"pick","every":720,"chance":1,"shares":5,"cost":1,"finds":[{"item":"starShard","weight":1,"n":[1,1],"hours":[[19,24],[0,5]],"day":0.2}]}},
    "spots": [["fruit",153,184,"edge"],["fruit",157,186,"edge"],["fruit",173,175,"edge"],["fruit",183,184,"edge"],["fruit",198,179,"edge"],["fruit",181,186,"edge"],["fruit",218,183,"edge"],["fruit",207,124,"deep"],["fruit",182,140,"woods"],["fruit",186,156,"woods"],["fruit",233,125,"deep"],["fruit",177,118,"deep"],["fruit",172,134,"deep"],["fruit",184,121,"deep"],["sticks",176,147,"woods"],["sticks",221,160,"rise"],["sticks",196,143,"woods"],["sticks",169,132,"deep"],["sticks",177,124,"deep"],["sticks",162,131,"deep"],["sticks",155,129,"deep"],["sticks",175,130,"deep"],["sticks",229,121,"deep"],["sticks",180,121,"deep"],["sticks",216,163,"rise"],["sticks",183,125,"deep"],["sticks",232,115,"deep"],["sticks",226,134,"deep"],["sticks",219,167,"rise"],["sticks",217,146,"rise"],["sticks",173,153,"bamboo"],["sticks",163,157,"bamboo"],["sticks",198,126,"deep"],["sticks",177,172,"woods"],["sticks",168,122,"deep"],["sticks",211,171,"rise"],["sticks",168,146,"bamboo"],["sticks",187,142,"woods"],["sticks",226,127,"deep"],["sticks",154,150,"bamboo"],["sticks",202,147,"woods"],["sticks",212,148,"rise"],["sticks",217,136,"stream"],["sticks",165,145,"bamboo"],["leaves",212,127,"deep"],["leaves",155,157,"bamboo"],["leaves",196,124,"deep"],["leaves",151,150,"bamboo"],["leaves",214,124,"deep"],["leaves",189,124,"deep"],["leaves",152,114,"deep"],["leaves",186,151,"woods"],["leaves",176,167,"woods"],["leaves",160,167,"bamboo"],["leaves",186,163,"woods"],["leaves",148,151,"bamboo"],["leaves",154,161,"bamboo"],["leaves",202,124,"deep"],["leaves",190,148,"woods"],["leaves",159,170,"bamboo"],["leaves",209,127,"deep"],["leaves",220,129,"deep"],["leaves",176,158,"woods"],["leaves",176,155,"woods"],["leaves",188,114,"deep"],["leaves",196,174,"woods"],["leaves",196,164,"woods"],["leaves",197,115,"deep"],["flowers",148,177,"edge"],["flowers",162,180,"edge"],["flowers",185,177,"edge"],["flowers",189,183,"edge"],["flowers",169,178,"edge"],["flowers",214,184,"edge"],["flowers",227,182,"edge"],["flowers",224,176,"edge"],["flowers",178,177,"edge"],["flowers",223,181,"edge"],["flowers",156,181,"edge"],["flowers",181,180,"edge"],["flowers",196,154,"camp"],["flowers",190,161,"camp"],["flowers",220,122,"deep"],["flowers",191,164,"camp"],["flowers",155,169,"bamboo"],["flowers",191,153,"camp"],["flowers",188,159,"camp"],["bamboo",157,155,"bamboo"],["bamboo",148,166,"bamboo"],["bamboo",160,152,"bamboo"],["bamboo",157,162,"bamboo"],["bamboo",165,169,"bamboo"],["bamboo",146,149,"bamboo"],["bamboo",152,168,"bamboo"],["bamboo",167,149,"bamboo"],["bamboo",155,164,"bamboo"],["bamboo",158,173,"bamboo"],["clay",231,147,"stream"],["clay",220,143,"stream"],["clay",194,137,"stream"],["clay",188,136,"stream"],["clay",226,141,"stream"],["clay",220,139,"stream"],["clay",161,140,"stream"],["clay",166,142,"stream"],["mushrooms",207,147,"woods"],["mushrooms",179,147,"woods"],["mushrooms",206,170,"woods"],["mushrooms",186,173,"woods"],["mushrooms",193,169,"woods"],["mushrooms",209,152,"woods"],["mushrooms",196,150,"woods"],["mushrooms",200,175,"woods"],["mushrooms",183,154,"woods"],["mushrooms",167,128,"deep"],["mushrooms",149,122,"deep"],["mushrooms",184,116,"deep"],["mushrooms",210,120,"deep"],["mushrooms",153,133,"deep"],["mushrooms",203,117,"deep"],["mushrooms",174,123,"deep"],["mushrooms",159,116,"deep"],["mushrooms",210,131,"deep"],["mushrooms",159,120,"deep"],["mushrooms",234,118,"deep"],["mushrooms",164,116,"deep"],["mushrooms",224,132,"deep"],["mushrooms",226,137,"deep"],["mushrooms",147,125,"deep"],["mushrooms",195,131,"deep"],["mushrooms",227,119,"deep"],["greens",176,180,"edge"],["greens",164,182,"edge"],["greens",228,177,"edge"],["greens",200,182,"edge"],["greens",188,178,"edge"],["greens",231,183,"edge"],["greens",172,179,"edge"],["greens",163,176,"edge"],["greens",197,135,"stream"],["greens",173,144,"stream"],["greens",157,144,"stream"],["greens",177,141,"stream"],["greens",235,147,"stream"],["greens",148,144,"stream"],["greens",183,131,"stream"],["greens",204,137,"stream"],["greens",237,167,"rise"],["greens",237,158,"rise"],["greens",211,161,"rise"],["greens",220,154,"rise"],["greens",235,172,"rise"],["greens",229,154,"rise"],["berries",154,179,"edge"],["berries",168,182,"edge"],["berries",208,177,"edge"],["berries",150,183,"edge"],["berries",207,181,"edge"],["berries",211,175,"edge"],["berries",194,184,"edge"],["berries",179,166,"woods"],["berries",198,168,"woods"],["berries",204,143,"woods"],["berries",180,157,"woods"],["berries",185,167,"woods"],["berries",188,169,"woods"],["berries",223,166,"rise"],["berries",224,156,"rise"],["berries",237,153,"rise"],["berries",210,144,"rise"],["berries",235,175,"rise"],["nook",219,177,"edge"],["nook",148,160,"bamboo"],["nook",148,147,"bamboo"],["nook",202,169,"woods"],["nook",172,168,"bamboo"],["nook",204,153,"woods"],["nook",160,183,"edge"],["nook",150,162,"bamboo"],["nook",160,158,"bamboo"],["nook",163,171,"bamboo"],["mound",166,161,"bamboo"],["mound",159,146,"bamboo"],["mound",152,171,"bamboo"],["mound",157,150,"bamboo"],["mound",172,163,"bamboo"],["mound",161,163,"bamboo"],["mound",163,148,"bamboo"],["mound",169,166,"bamboo"],["mound",201,156,"woods"],["mound",203,150,"woods"],["mound",183,149,"woods"],["mound",217,160,"rise"],["mound",152,176,"edge"],["mound",233,163,"rise"],["mound",182,177,"edge"],["mound",211,183,"edge"],["mound",223,135,"deep"],["mound",154,118,"deep"],["mound",236,127,"deep"],["mound",151,118,"deep"],["mound",170,127,"deep"],["mound",208,116,"deep"],["mound",199,121,"deep"],["mound",175,115,"deep"],["glint",217,122,"deep"],["glint",219,119,"deep"],["glint",193,120,"deep"],["glint",189,118,"deep"],["glint",193,123,"deep"]],
    "reach": 1,
    "decoy": "toadstool",
    "decoys": 2,
    "hoes": ["hoe","hoeIron","hoeSteel"],
    "misses": 30
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":22,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":60,"n":[1,1],"cost":1,"places":["farm","town"],"hours":[[5,11]]},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":10,"chance":0.55,"shares":3},"water":{"every":10,"chance":0.5,"shares":3},"field":{"every":10,"chance":0.55,"shares":3},"lamp":{"every":10,"chance":0.6,"shares":3},"tree":{"every":20,"chance":0.5,"shares":3},"litter":{"every":20,"chance":0.5,"shares":3},"glade":{"every":60,"chance":0.25,"shares":3},"falls":{"every":30,"chance":0.3,"shares":3}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"]
  }$town$::jsonb)
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
    "butterflyWhite": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "monarch": {"kind":"bug","tier":1,"stack":20,"pays":4},
    "morpho": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "dragonfly": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "damselfly": {"kind":"bug","tier":1,"stack":20,"pays":7},
    "glassDragonfly": {"kind":"bug","tier":1,"stack":5,"pays":60},
    "grasshopper": {"kind":"bug","tier":2,"stack":20,"pays":3},
    "mantis": {"kind":"bug","tier":1,"stack":10,"pays":9},
    "cicada": {"kind":"bug","tier":1,"stack":20,"pays":7},
    "stickInsect": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "leafInsect": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "firefly": {"kind":"bug","tier":1,"stack":20,"pays":6},
    "orchidMantis": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "moth": {"kind":"bug","tier":1,"stack":20,"pays":2},
    "lunaMoth": {"kind":"bug","tier":1,"stack":5,"pays":50},
    "hawkMoth": {"kind":"bug","tier":1,"stack":5,"pays":20},
    "rhinoBeetle": {"kind":"bug","tier":1,"stack":10,"pays":8},
    "stagBeetle": {"kind":"bug","tier":1,"stack":5,"pays":25},
    "jewelBeetle": {"kind":"bug","tier":1,"stack":5,"pays":40},
    "herculesBeetle": {"kind":"bug","tier":1,"stack":5,"pays":150},
    "ladybird": {"kind":"bug","tier":1,"stack":20,"pays":3},
    "scarab": {"kind":"bug","tier":1,"stack":20,"pays":4},
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
  }$town$::jsonb),
  ('goods', $town${
    "rod": {"price":60,"stock":6,"each":1},
    "hoe": {"price":50,"stock":6,"each":1},
    "can": {"price":40,"stock":6,"each":1},
    "pot": {"price":80,"stock":4,"each":1},
    "pan": {"price":70,"stock":4,"each":1},
    "grill": {"price":60,"stock":4,"each":1},
    "worm": {"price":2,"stock":120,"each":10},
    "dough": {"price":3,"stock":80,"each":10},
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
  ('shelf', $town${
    "basic": ["rod","hoe","can","pot","pan","grill","worm","dough","rice","salt","riceBox","seedKangkong","seedScallion","seedCabbage","seedCarrot","seedChili","seedPumpkin","scrollFriedMinnow","scrollGrilledFish","scrollPestCure","bowl","bucket","bugNet"],
    "unlocks": ["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato","cricket","seedCucumber","oil","egg","scrollOmelette","flour","mortar","seedLongBean","sugar","rollingPin","seedEggplant","branBait","wok","seaweed","seedLemongrass","jar","sushiMat","seedGalangal","shrimpLive","steamer","tofu","seedLime","cleaver","stoneBowl","seedPapaya","scrollSomTam","tamarind","manure","floatQuill","hookSteel","lineBraid","netSmall","rodTeak","hoeIron","canCopper","sickle","krabung","bucketIron","apron","antEggs","seedGinger","soy","stickyRice","seedBanana","bananaLeaf","pepper","milk","seedTurmeric","seedTaro","fermentedBait","cheese","seedWatermelon","steamerBamboo","oven","seedCoconut","seedMango","lure","potBrass","panBrass","hotpot","stoveBig","ladle","tok","scrollGreenCurry","scrollHoMok","floatBell","hookTwin","lineSilk","netLong","rodMaster","hoeSteel","canBrass","shears","yoke"]
  }$town$::jsonb),
  ('dishes', $town${
    "riceBox": {"stamina":15,"buff":null,"recipe":null},
    "oddDish": {"stamina":6,"buff":null,"recipe":null},
    "friedMinnow": {"stamina":20,"buff":"keen","recipe":{"needs":[["minnow",3],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "grilledFish": {"stamina":25,"buff":"calm","recipe":{"needs":[["tilapia",1],["salt",2]],"in":["grill"],"serves":2,"cooks":1}},
    "grilledCorn": {"stamina":15,"buff":null,"recipe":{"needs":[["corn",2]],"in":["grill"],"serves":2,"cooks":1}},
    "roastSweetPotato": {"stamina":18,"buff":null,"recipe":{"needs":[["sweetPotato",2]],"in":["grill"],"serves":2,"cooks":1}},
    "stirKangkong": {"stamina":22,"buff":"green","recipe":{"needs":[["kangkong",3],["chili",1],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "basilCatfish": {"stamina":35,"buff":"hearty","recipe":{"needs":[["catfish",1],["basil",2],["chili",1],["garlic",1],["rice",2]],"in":["pan"],"serves":3,"cooks":1}},
    "tomYum": {"stamina":40,"buff":"hearty","recipe":{"needs":[["snakehead",1],["tomato",2],["chili",2],["scallion",1]],"in":["pot"],"serves":4,"cooks":1}},
    "sourCurry": {"stamina":32,"buff":"calm","recipe":{"needs":[["barb",2],["daikon",1],["cabbage",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedPerch": {"stamina":28,"buff":"keen","recipe":{"needs":[["perch",2],["garlic",2],["salt",1]],"in":["pan"],"serves":2,"cooks":1}},
    "fishCake": {"stamina":38,"buff":"calm","recipe":{"needs":[["featherback",1],["basil",1],["chili",1],["salt",1]],"in":["pan"],"serves":4,"cooks":1}},
    "spicyEel": {"stamina":40,"buff":"hearty","recipe":{"needs":[["eel",1],["basil",2],["chili",2],["garlic",1]],"in":["pan"],"serves":3,"cooks":1}},
    "grilledPrawn": {"stamina":30,"buff":"lucky","recipe":{"needs":[["prawn",2],["salt",1]],"in":["grill"],"serves":2,"cooks":1}},
    "steamedGoby": {"stamina":45,"buff":"lucky","recipe":{"needs":[["goby",1],["scallion",2],["fishSauce",1]],"in":["pot"],"serves":3,"cooks":1}},
    "pumpkinSoup": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["scallion",1],["salt",1]],"in":["pot"],"serves":5,"cooks":1}},
    "shabu": {"stamina":50,"buff":"lucky","recipe":{"needs":[["cabbage",1],["carrot",2],["daikon",1],["corn",1],["scallion",2],["prawn",2],["pangasius",1]],"in":["pot"],"serves":10,"cooks":3}},
    "somTam": {"stamina":30,"buff":"keen","recipe":{"needs":[["papaya",1],["lime",1],["chili",2],["longBean",1],["tomato",1],["sugar",1]],"in":["mortar"],"serves":3,"cooks":1}},
    "grilledEggplant": {"stamina":22,"buff":"calm","recipe":{"needs":[["eggplant",2],["fishSauce",1]],"in":["grill"],"serves":2,"cooks":1}},
    "tomKha": {"stamina":42,"buff":"hearty","recipe":{"needs":[["sheatfish",1],["galangal",1],["lemongrass",1],["lime",1],["chili",1]],"in":["pot"],"serves":4,"cooks":1}},
    "friedGourami": {"stamina":26,"buff":null,"recipe":{"needs":[["gourami",2],["oil",1],["salt",1]],"in":["wok"],"serves":2,"cooks":1}},
    "crabCurry": {"stamina":46,"buff":"lucky","recipe":{"needs":[["crab",3],["curryPaste",1],["longBean",1],["eggplant",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "steamedSheatfish": {"stamina":40,"buff":"calm","recipe":{"needs":[["sheatfish",1],["lime",2],["chili",1],["garlic",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "friedFrog": {"stamina":36,"buff":"keen","recipe":{"needs":[["frog",2],["garlic",2],["oil",1]],"in":["wok"],"serves":2,"cooks":1}},
    "laab": {"stamina":44,"buff":"hearty","recipe":{"needs":[["bagrid",1],["lime",1],["chili",1],["scallion",1],["rice",1]],"in":["cleaver","mortar"],"serves":4,"cooks":2}},
    "omelette": {"stamina":20,"buff":null,"recipe":{"needs":[["egg",2],["oil",1]],"in":["pan"],"serves":2,"cooks":1}},
    "snailCurry": {"stamina":40,"buff":"green","recipe":{"needs":[["snail",6],["curryPaste",1],["lemongrass",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "candiedPumpkin": {"stamina":28,"buff":"green","recipe":{"needs":[["pumpkin",1],["sugar",2]],"in":["pot"],"serves":5,"cooks":1}},
    "friedRice": {"stamina":34,"buff":null,"recipe":{"needs":[["rice",3],["egg",1],["scallion",1],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "greenCurry": {"stamina":48,"buff":"calm","recipe":{"needs":[["featherback",1],["curryPaste",1],["coconutMilk",1],["eggplant",2],["basil",1]],"in":["mortar","pot"],"serves":5,"cooks":2}},
    "khanomJeen": {"stamina":50,"buff":"hearty","recipe":{"needs":[["riceNoodle",3],["croaker",1],["curryPaste",1],["coconutMilk",1],["longBean",1]],"in":["mortar","pot","steamer"],"serves":6,"cooks":3}},
    "hoMok": {"stamina":48,"buff":"lucky","recipe":{"needs":[["blackEar",1],["curryPaste",1],["coconutMilk",1],["bananaLeaf",2],["basil",1]],"in":["mortar","steamerBamboo"],"serves":4,"cooks":2}},
    "mangoStickyRice": {"stamina":44,"buff":"green","recipe":{"needs":[["mango",2],["stickyRice",2],["coconutMilk",1],["sugar",1]],"in":["steamerBamboo","pot"],"serves":4,"cooks":2}},
    "bananaInCoconut": {"stamina":32,"buff":"calm","recipe":{"needs":[["banana",3],["coconutMilk",1],["sugar",1]],"in":["pot"],"serves":4,"cooks":1}},
    "taroPudding": {"stamina":40,"buff":"keen","recipe":{"needs":[["taro",1],["flour",1],["coconutMilk",1],["sugar",1]],"in":["panBrass","pot"],"serves":6,"cooks":2}},
    "steamedCroaker": {"stamina":46,"buff":"keen","recipe":{"needs":[["croaker",1],["soy",1],["ginger",1],["scallion",1]],"in":["steamer"],"serves":3,"cooks":1}},
    "gingerFish": {"stamina":45,"buff":"hearty","recipe":{"needs":[["blackEar",1],["ginger",2],["soy",1],["oil",1]],"in":["wok"],"serves":4,"cooks":1}},
    "turmericFish": {"stamina":44,"buff":"calm","recipe":{"needs":[["spinyEel",2],["turmeric",1],["garlic",2],["oil",1]],"in":["wok"],"serves":3,"cooks":1}},
    "jungleCurry": {"stamina":50,"buff":"lucky","recipe":{"needs":[["giantSnakehead",1],["curryPaste",1],["galangal",1],["lemongrass",1],["eggplant",1],["longBean",1]],"in":["mortar","potBrass"],"serves":6,"cooks":2}},
    "megaLaab": {"stamina":50,"buff":"hearty","recipe":{"needs":[["megaCatfish",1],["toastedRice",1],["lime",3],["chili",3],["scallion",2]],"in":["cleaver","mortar","wok"],"serves":20,"cooks":3}},
    "watermelonSlices": {"stamina":24,"buff":null,"recipe":{"needs":[["watermelon",1]],"in":["cleaver"],"serves":6,"cooks":1}},
    "khantoke": {"stamina":50,"buff":"lucky","recipe":{"needs":[["stickyRice",3],["goldenCarp",1],["curryPaste",1],["coconutMilk",1],["cucumber",2],["longBean",2],["pepper",1]],"in":["hotpot","steamerBamboo","wok","mortar"],"serves":20,"cooks":4}},
    "naamPrik": {"stamina":38,"buff":"green","recipe":{"needs":[["fermentedFish",1],["chili",3],["garlic",1],["lime",1],["cucumber",1]],"in":["mortar"],"serves":4,"cooks":1}},
    "sushi": {"stamina":38,"buff":"keen","recipe":{"needs":[["tilapia",1],["rice",2],["sugar",1],["seaweed",1]],"in":["cleaver","sushiMat"],"serves":4,"cooks":2}},
    "ramen": {"stamina":46,"buff":"hearty","recipe":{"needs":[["noodle",2],["egg",1],["scallion",1],["soy",1],["driedFish",1]],"in":["pot"],"serves":3,"cooks":1}},
    "tempura": {"stamina":34,"buff":"lucky","recipe":{"needs":[["prawn",2],["flour",1],["oil",1],["egg",1]],"in":["wok"],"serves":2,"cooks":1}},
    "unadon": {"stamina":48,"buff":"hearty","recipe":{"needs":[["eel",1],["rice",2],["sugar",1],["soy",1]],"in":["grill"],"serves":2,"cooks":1}},
    "okonomiyaki": {"stamina":36,"buff":"green","recipe":{"needs":[["flour",1],["egg",1],["cabbage",1],["scallion",1],["prawn",1]],"in":["pan"],"serves":3,"cooks":1}},
    "kimchi": {"stamina":20,"buff":"hearty","recipe":{"needs":[["cabbage",2],["chili",2],["garlic",1],["fishSauce",1]],"in":["jar"],"serves":4,"cooks":1}},
    "bibimbap": {"stamina":44,"buff":"hearty","recipe":{"needs":[["rice",2],["egg",1],["carrot",1],["cucumber",1],["kangkong",1],["chili",1]],"in":["wok","stoneBowl"],"serves":4,"cooks":2}},
    "tteokbokki": {"stamina":36,"buff":"keen","recipe":{"needs":[["stickyRice",2],["chili",2],["scallion",1],["sugar",1]],"in":["mortar","pan"],"serves":3,"cooks":2}},
    "kimbap": {"stamina":32,"buff":"calm","recipe":{"needs":[["rice",2],["seaweed",1],["carrot",1],["cucumber",1],["egg",1]],"in":["sushiMat"],"serves":3,"cooks":1}},
    "pajeon": {"stamina":28,"buff":null,"recipe":{"needs":[["flour",1],["egg",1],["oil",1],["scallion",3]],"in":["pan"],"serves":2,"cooks":1}},
    "harGow": {"stamina":34,"buff":"lucky","recipe":{"needs":[["flour",2],["scallion",1],["prawn",2]],"in":["rollingPin","steamer"],"serves":4,"cooks":2}},
    "chowMein": {"stamina":40,"buff":"keen","recipe":{"needs":[["noodle",2],["cabbage",1],["carrot",1],["oil",1],["soy",1]],"in":["wok"],"serves":3,"cooks":1}},
    "springRoll": {"stamina":26,"buff":null,"recipe":{"needs":[["flour",1],["cabbage",1],["oil",1],["carrot",1]],"in":["rollingPin","wok"],"serves":4,"cooks":2}},
    "congee": {"stamina":30,"buff":"calm","recipe":{"needs":[["rice",2],["egg",1],["scallion",1],["perch",1]],"in":["pot"],"serves":4,"cooks":1}},
    "mapoTofu": {"stamina":40,"buff":"hearty","recipe":{"needs":[["chili",2],["garlic",1],["scallion",1],["soy",1],["tofu",2]],"in":["wok"],"serves":3,"cooks":1}},
    "pizza": {"stamina":46,"buff":"lucky","recipe":{"needs":[["flour",2],["tomato",2],["basil",1],["cheese",1]],"in":["rollingPin","oven"],"serves":6,"cooks":2}},
    "spaghetti": {"stamina":40,"buff":"keen","recipe":{"needs":[["noodle",2],["tomato",2],["oil",1],["prawn",1],["garlic",1]],"in":["pot","pan"],"serves":3,"cooks":2}},
    "risotto": {"stamina":38,"buff":"calm","recipe":{"needs":[["rice",2],["pumpkin",1],["garlic",1],["cheese",1]],"in":["pot"],"serves":4,"cooks":1}},
    "lasagna": {"stamina":48,"buff":"hearty","recipe":{"needs":[["noodle",2],["tomato",2],["cheese",2],["eggplant",1]],"in":["oven","pot"],"serves":6,"cooks":2}},
    "minestrone": {"stamina":30,"buff":"green","recipe":{"needs":[["tomato",2],["carrot",1],["cabbage",1],["longBean",1],["noodle",1]],"in":["pot"],"serves":5,"cooks":1}},
    "fishCurry": {"stamina":46,"buff":"hearty","recipe":{"needs":[["catfish",1],["chili",2],["ginger",1],["turmeric",1],["coconutMilk",1]],"in":["mortar","pot"],"serves":4,"cooks":2}},
    "naan": {"stamina":26,"buff":null,"recipe":{"needs":[["flour",2],["garlic",1],["milk",1]],"in":["rollingPin","oven"],"serves":4,"cooks":2}},
    "biryani": {"stamina":44,"buff":"calm","recipe":{"needs":[["rice",3],["turmeric",1],["milk",1],["pepper",1],["pangasius",1]],"in":["pot"],"serves":5,"cooks":1}},
    "samosa": {"stamina":28,"buff":"green","recipe":{"needs":[["flour",1],["chili",1],["oil",1],["sweetPotato",1]],"in":["rollingPin","wok"],"serves":4,"cooks":2}},
    "lassi": {"stamina":24,"buff":"lucky","recipe":{"needs":[["mango",1],["sugar",1],["milk",1]],"in":["mortar"],"serves":3,"cooks":1}},
    "dozyFish": {"stamina":12,"buff":null,"recipe":null},
    "rainbowFish": {"stamina":5,"buff":"lucky","recipe":null},
    "fishChips": {"stamina":30,"buff":"hearty","recipe":{"needs":[["salt",1],["popotoFish",2]],"in":["pan"],"serves":4,"cooks":1}},
    "ukha": {"stamina":32,"buff":"calm","recipe":{"needs":[["carrot",2],["scallion",1],["salt",1],["pike",1]],"in":["pot"],"serves":4,"cooks":1}},
    "thieboudienne": {"stamina":36,"buff":"green","recipe":{"needs":[["rice",3],["cabbage",1],["carrot",1],["nilePerch",1]],"in":["pot"],"serves":5,"cooks":1}},
    "piranhaSoup": {"stamina":30,"buff":"keen","recipe":{"needs":[["piranha",2],["chili",2],["scallion",1]],"in":["pot"],"serves":3,"cooks":1}},
    "crawfishBoil": {"stamina":36,"buff":"lucky","recipe":{"needs":[["crayfish",5],["salt",2],["chili",2],["corn",2]],"in":["pot"],"serves":8,"cooks":2}},
    "masgouf": {"stamina":28,"buff":"calm","recipe":{"needs":[["salt",2],["scallion",2],["carp",1]],"in":["grill"],"serves":3,"cooks":1}},
    "salmonSteak": {"stamina":34,"buff":"keen","recipe":{"needs":[["salmon",1],["salt",1],["garlic",1]],"in":["pan"],"serves":2,"cooks":1}},
    "arapaimaRoast": {"stamina":45,"buff":"hearty","recipe":{"needs":[["arapaima",1],["salt",3],["chili",2]],"in":["grill"],"serves":10,"cooks":3}},
    "mushroomSoup": {"stamina":26,"buff":"calm","recipe":{"needs":[["scallion",1],["salt",1],["shiitake",3]],"in":["pot"],"serves":3,"cooks":1}},
    "mushroomSkewer": {"stamina":16,"buff":null,"recipe":{"needs":[["salt",1],["shiitake",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "fishOnStick": {"stamina":20,"buff":null,"recipe":{"needs":[["salt",1],["barb",1]],"in":["skewer"],"serves":2,"cooks":1}},
    "roastYam": {"stamina":18,"buff":null,"recipe":{"needs":[["wildYam",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "roastedApple": {"stamina":12,"buff":null,"recipe":{"needs":[["wildApple",2]],"in":["skewer"],"serves":2,"cooks":1}},
    "mushroomRisotto": {"stamina":34,"buff":"hearty","recipe":{"needs":[["rice",2],["scallion",1],["salt",1],["porcini",1]],"in":["pot"],"serves":4,"cooks":1}},
    "fernSalad": {"stamina":20,"buff":"green","recipe":{"needs":[["fiddlehead",3],["salt",1],["mint",1]],"in":["pan"],"serves":2,"cooks":1}},
    "herbTea": {"stamina":12,"buff":"calm","recipe":{"needs":[["mint",1],["chamomile",2]],"in":["pot"],"serves":3,"cooks":1}},
    "berryCompote": {"stamina":22,"buff":"lucky","recipe":{"needs":[["blueberry",2],["raspberry",2],["wildStrawberry",1]],"in":["pot"],"serves":3,"cooks":1}},
    "bakedApple": {"stamina":20,"buff":null,"recipe":{"needs":[["wildApple",3],["chestnut",1]],"in":["grill"],"serves":3,"cooks":1}},
    "roastChestnut": {"stamina":16,"buff":null,"recipe":{"needs":[["salt",1],["chestnut",4]],"in":["pan"],"serves":3,"cooks":1}},
    "forestStew": {"stamina":38,"buff":"hearty","recipe":{"needs":[["wildYam",2],["shiitake",1],["carrot",1],["rosemary",1]],"in":["pot"],"serves":6,"cooks":2}},
    "bambooShootStir": {"stamina":24,"buff":"keen","recipe":{"needs":[["chili",1],["salt",1],["bambooShoot",2]],"in":["pan"],"serves":3,"cooks":1}},
    "rosemaryFish": {"stamina":30,"buff":"calm","recipe":{"needs":[["perch",1],["salt",1],["rosemary",1]],"in":["grill"],"serves":2,"cooks":1}},
    "ginsengSoup": {"stamina":50,"buff":"hearty","recipe":{"needs":[["shiitake",2],["scallion",1],["salt",1],["ginseng",1]],"in":["pot"],"serves":4,"cooks":1}},
    "moonTea": {"stamina":30,"buff":"lucky","recipe":{"needs":[["chamomile",1],["mint",1],["moonflower",1]],"in":["pot"],"serves":4,"cooks":1}},
    "truffleEggs": {"stamina":44,"buff":"lucky","recipe":{"needs":[["egg",2],["salt",1],["truffle",1]],"in":["pan"],"serves":3,"cooks":1}},
    "mushroomOmelette": {"stamina":30,"buff":"keen","recipe":{"needs":[["egg",2],["salt",1],["chanterelle",1]],"in":["pan"],"serves":2,"cooks":1}}
  }$town$::jsonb),
  ('scrolls', $town${
    "scrollPestCure": "pestCure",
    "scrollFriedMinnow": "friedMinnow",
    "scrollGrilledFish": "grilledFish",
    "scrollGrilledCorn": "grilledCorn",
    "scrollRoastSweetPotato": "roastSweetPotato",
    "scrollStirKangkong": "stirKangkong",
    "scrollBasilCatfish": "basilCatfish",
    "scrollTomYum": "tomYum",
    "scrollSourCurry": "sourCurry",
    "scrollFriedPerch": "friedPerch",
    "scrollFishCake": "fishCake",
    "scrollSpicyEel": "spicyEel",
    "scrollGrilledPrawn": "grilledPrawn",
    "scrollSteamedGoby": "steamedGoby",
    "scrollPumpkinSoup": "pumpkinSoup",
    "scrollShabu": "shabu",
    "scrollSomTam": "somTam",
    "scrollGrilledEggplant": "grilledEggplant",
    "scrollTomKha": "tomKha",
    "scrollFriedGourami": "friedGourami",
    "scrollCrabCurry": "crabCurry",
    "scrollSteamedSheatfish": "steamedSheatfish",
    "scrollFriedFrog": "friedFrog",
    "scrollLaab": "laab",
    "scrollOmelette": "omelette",
    "scrollSnailCurry": "snailCurry",
    "scrollCandiedPumpkin": "candiedPumpkin",
    "scrollFriedRice": "friedRice",
    "scrollSushi": "sushi",
    "scrollTempura": "tempura",
    "scrollOkonomiyaki": "okonomiyaki",
    "scrollKimchi": "kimchi",
    "scrollBibimbap": "bibimbap",
    "scrollKimbap": "kimbap",
    "scrollPajeon": "pajeon",
    "scrollHarGow": "harGow",
    "scrollSpringRoll": "springRoll",
    "scrollCongee": "congee",
    "scrollSpaghetti": "spaghetti",
    "scrollMinestrone": "minestrone",
    "scrollSamosa": "samosa",
    "scrollGreenCurry": "greenCurry",
    "scrollKhanomJeen": "khanomJeen",
    "scrollHoMok": "hoMok",
    "scrollMangoStickyRice": "mangoStickyRice",
    "scrollBananaInCoconut": "bananaInCoconut",
    "scrollTaroPudding": "taroPudding",
    "scrollSteamedCroaker": "steamedCroaker",
    "scrollGingerFish": "gingerFish",
    "scrollTurmericFish": "turmericFish",
    "scrollJungleCurry": "jungleCurry",
    "scrollMegaLaab": "megaLaab",
    "scrollWatermelonSlices": "watermelonSlices",
    "scrollKhantoke": "khantoke",
    "scrollNaamPrik": "naamPrik",
    "scrollRamen": "ramen",
    "scrollUnadon": "unadon",
    "scrollTteokbokki": "tteokbokki",
    "scrollChowMein": "chowMein",
    "scrollMapoTofu": "mapoTofu",
    "scrollPizza": "pizza",
    "scrollRisotto": "risotto",
    "scrollLasagna": "lasagna",
    "scrollFishCurry": "fishCurry",
    "scrollNaan": "naan",
    "scrollBiryani": "biryani",
    "scrollLassi": "lassi",
    "scrollFishChips": "fishChips",
    "scrollUkha": "ukha",
    "scrollThieboudienne": "thieboudienne",
    "scrollPiranhaSoup": "piranhaSoup",
    "scrollCrawfishBoil": "crawfishBoil",
    "scrollMasgouf": "masgouf",
    "scrollSalmonSteak": "salmonSteak",
    "scrollArapaimaRoast": "arapaimaRoast",
    "scrollMushroomSoup": "mushroomSoup",
    "scrollMushroomSkewer": "mushroomSkewer",
    "scrollFishOnStick": "fishOnStick",
    "scrollRoastYam": "roastYam",
    "scrollRoastedApple": "roastedApple",
    "scrollMushroomRisotto": "mushroomRisotto",
    "scrollFernSalad": "fernSalad",
    "scrollHerbTea": "herbTea",
    "scrollBerryCompote": "berryCompote",
    "scrollBakedApple": "bakedApple",
    "scrollRoastChestnut": "roastChestnut",
    "scrollForestStew": "forestStew",
    "scrollBambooShootStir": "bambooShootStir",
    "scrollRosemaryFish": "rosemaryFish",
    "scrollGinsengSoup": "ginsengSoup",
    "scrollMoonTea": "moonTea",
    "scrollTruffleEggs": "truffleEggs",
    "scrollMushroomOmelette": "mushroomOmelette"
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
    "pots": 6,
    "reach": 1.8,
    "tok": 3.2,
    "odd": {"per":2,"most":4},
    "oddDish": "oddDish",
    "clue": 3,
    "recipes": ["friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette","fishSauce","compost","growFert","guardFert","pestCure","basket","hookScale","floatGlow","bowl","skewer","floatFeather","lineSpun","mulch","lavenderSachet","bugNet","driedFish","saltedFish","curryPaste","pickle","charcoal","rope","krabung","noodle","coconutMilk","fermentedFish","shrimpPaste","driedChili","riceNoodle","toastedRice","yoke"],
    "needs": {"friedMinnow":{"minnow":3,"salt":1},"grilledFish":{"salt":2,"tilapia":1},"grilledCorn":{"corn":2},"roastSweetPotato":{"sweetPotato":2},"stirKangkong":{"chili":1,"garlic":1,"kangkong":3},"basilCatfish":{"basil":2,"catfish":1,"chili":1,"garlic":1,"rice":2},"tomYum":{"chili":2,"scallion":1,"snakehead":1,"tomato":2},"sourCurry":{"barb":2,"cabbage":1,"chili":1,"daikon":1},"friedPerch":{"garlic":2,"perch":2,"salt":1},"fishCake":{"basil":1,"chili":1,"featherback":1,"salt":1},"spicyEel":{"basil":2,"chili":2,"eel":1,"garlic":1},"grilledPrawn":{"prawn":2,"salt":1},"steamedGoby":{"fishSauce":1,"goby":1,"scallion":2},"pumpkinSoup":{"pumpkin":1,"salt":1,"scallion":1},"shabu":{"cabbage":1,"carrot":2,"corn":1,"daikon":1,"pangasius":1,"prawn":2,"scallion":2},"somTam":{"chili":2,"lime":1,"longBean":1,"papaya":1,"sugar":1,"tomato":1},"grilledEggplant":{"eggplant":2,"fishSauce":1},"tomKha":{"chili":1,"galangal":1,"lemongrass":1,"lime":1,"sheatfish":1},"friedGourami":{"gourami":2,"oil":1,"salt":1},"crabCurry":{"crab":3,"curryPaste":1,"eggplant":1,"longBean":1},"steamedSheatfish":{"chili":1,"garlic":1,"lime":2,"sheatfish":1},"friedFrog":{"frog":2,"garlic":2,"oil":1},"laab":{"bagrid":1,"chili":1,"lime":1,"rice":1,"scallion":1},"omelette":{"egg":2,"oil":1},"snailCurry":{"curryPaste":1,"lemongrass":1,"snail":6},"candiedPumpkin":{"pumpkin":1,"sugar":2},"friedRice":{"egg":1,"oil":1,"rice":3,"scallion":1},"greenCurry":{"basil":1,"coconutMilk":1,"curryPaste":1,"eggplant":2,"featherback":1},"khanomJeen":{"coconutMilk":1,"croaker":1,"curryPaste":1,"longBean":1,"riceNoodle":3},"hoMok":{"bananaLeaf":2,"basil":1,"blackEar":1,"coconutMilk":1,"curryPaste":1},"mangoStickyRice":{"coconutMilk":1,"mango":2,"stickyRice":2,"sugar":1},"bananaInCoconut":{"banana":3,"coconutMilk":1,"sugar":1},"taroPudding":{"coconutMilk":1,"flour":1,"sugar":1,"taro":1},"steamedCroaker":{"croaker":1,"ginger":1,"scallion":1,"soy":1},"gingerFish":{"blackEar":1,"ginger":2,"oil":1,"soy":1},"turmericFish":{"garlic":2,"oil":1,"spinyEel":2,"turmeric":1},"jungleCurry":{"curryPaste":1,"eggplant":1,"galangal":1,"giantSnakehead":1,"lemongrass":1,"longBean":1},"megaLaab":{"chili":3,"lime":3,"megaCatfish":1,"scallion":2,"toastedRice":1},"watermelonSlices":{"watermelon":1},"khantoke":{"coconutMilk":1,"cucumber":2,"curryPaste":1,"goldenCarp":1,"longBean":2,"pepper":1,"stickyRice":3},"naamPrik":{"chili":3,"cucumber":1,"fermentedFish":1,"garlic":1,"lime":1},"sushi":{"rice":2,"seaweed":1,"sugar":1,"tilapia":1},"ramen":{"driedFish":1,"egg":1,"noodle":2,"scallion":1,"soy":1},"tempura":{"egg":1,"flour":1,"oil":1,"prawn":2},"unadon":{"eel":1,"rice":2,"soy":1,"sugar":1},"okonomiyaki":{"cabbage":1,"egg":1,"flour":1,"prawn":1,"scallion":1},"kimchi":{"cabbage":2,"chili":2,"fishSauce":1,"garlic":1},"bibimbap":{"carrot":1,"chili":1,"cucumber":1,"egg":1,"kangkong":1,"rice":2},"tteokbokki":{"chili":2,"scallion":1,"stickyRice":2,"sugar":1},"kimbap":{"carrot":1,"cucumber":1,"egg":1,"rice":2,"seaweed":1},"pajeon":{"egg":1,"flour":1,"oil":1,"scallion":3},"harGow":{"flour":2,"prawn":2,"scallion":1},"chowMein":{"cabbage":1,"carrot":1,"noodle":2,"oil":1,"soy":1},"springRoll":{"cabbage":1,"carrot":1,"flour":1,"oil":1},"congee":{"egg":1,"perch":1,"rice":2,"scallion":1},"mapoTofu":{"chili":2,"garlic":1,"scallion":1,"soy":1,"tofu":2},"pizza":{"basil":1,"cheese":1,"flour":2,"tomato":2},"spaghetti":{"garlic":1,"noodle":2,"oil":1,"prawn":1,"tomato":2},"risotto":{"cheese":1,"garlic":1,"pumpkin":1,"rice":2},"lasagna":{"cheese":2,"eggplant":1,"noodle":2,"tomato":2},"minestrone":{"cabbage":1,"carrot":1,"longBean":1,"noodle":1,"tomato":2},"fishCurry":{"catfish":1,"chili":2,"coconutMilk":1,"ginger":1,"turmeric":1},"naan":{"flour":2,"garlic":1,"milk":1},"biryani":{"milk":1,"pangasius":1,"pepper":1,"rice":3,"turmeric":1},"samosa":{"chili":1,"flour":1,"oil":1,"sweetPotato":1},"lassi":{"mango":1,"milk":1,"sugar":1},"fishChips":{"popotoFish":2,"salt":1},"ukha":{"carrot":2,"pike":1,"salt":1,"scallion":1},"thieboudienne":{"cabbage":1,"carrot":1,"nilePerch":1,"rice":3},"piranhaSoup":{"chili":2,"piranha":2,"scallion":1},"crawfishBoil":{"chili":2,"corn":2,"crayfish":5,"salt":2},"masgouf":{"carp":1,"salt":2,"scallion":2},"salmonSteak":{"garlic":1,"salmon":1,"salt":1},"arapaimaRoast":{"arapaima":1,"chili":2,"salt":3},"mushroomSoup":{"salt":1,"scallion":1,"shiitake":3},"mushroomSkewer":{"salt":1,"shiitake":2},"fishOnStick":{"barb":1,"salt":1},"roastYam":{"wildYam":2},"roastedApple":{"wildApple":2},"mushroomRisotto":{"porcini":1,"rice":2,"salt":1,"scallion":1},"fernSalad":{"fiddlehead":3,"mint":1,"salt":1},"herbTea":{"chamomile":2,"mint":1},"berryCompote":{"blueberry":2,"raspberry":2,"wildStrawberry":1},"bakedApple":{"chestnut":1,"wildApple":3},"roastChestnut":{"chestnut":4,"salt":1},"forestStew":{"carrot":1,"rosemary":1,"shiitake":1,"wildYam":2},"bambooShootStir":{"bambooShoot":2,"chili":1,"salt":1},"rosemaryFish":{"perch":1,"rosemary":1,"salt":1},"ginsengSoup":{"ginseng":1,"salt":1,"scallion":1,"shiitake":2},"moonTea":{"chamomile":1,"mint":1,"moonflower":1},"truffleEggs":{"egg":2,"salt":1,"truffle":1},"mushroomOmelette":{"chanterelle":1,"egg":2,"salt":1},"fishSauce":{"minnow":4,"salt":2},"compost":{"hyacinth":3},"growFert":{"compost":2,"minnow":2},"guardFert":{"chili":2,"compost":2,"garlic":1},"pestCure":{"chili":2,"salt":1,"scallion":2},"basket":{"hyacinth":6},"hookScale":{"gar":1},"floatGlow":{"moonFish":1},"bowl":{"mussel":2},"skewer":{"twig":2},"floatFeather":{"bambooCane":1,"feather":2},"lineSpun":{"silkCocoon":3},"mulch":{"leafMould":3},"lavenderSachet":{"lavender":3,"vine":1},"bugNet":{"bambooCane":1,"vine":2},"driedFish":{"barb":2,"salt":1},"saltedFish":{"salt":3,"tilapia":1},"curryPaste":{"chili":3,"galangal":1,"garlic":2,"lemongrass":1},"pickle":{"cabbage":1,"salt":2},"charcoal":{"driftwood":2},"rope":{"hyacinth":4},"krabung":{"hyacinth":8,"rope":1},"noodle":{"egg":1,"flour":2},"coconutMilk":{"coconut":1},"fermentedFish":{"gourami":2,"salt":2,"toastedRice":1},"shrimpPaste":{"salt":2,"shrimpLive":5},"driedChili":{"chili":4},"riceNoodle":{"flour":2},"toastedRice":{"rice":2},"yoke":{"basket":2,"driftwood":2,"rope":2}},
    "cookware": ["pan","grill","pot","mortar","wok","steamer","cleaver","steamerBamboo","panBrass","potBrass","hotpot","sushiMat","jar","stoneBowl","rollingPin","oven","skewer"],
    "gear": {"wok":1.25,"potBrass":1.5,"panBrass":1.5,"stoveBig":1.25},
    "never": ["tool","scroll","dish","bug"],
    "bowl": "bowl",
    "bowled": ["oddDish","friedMinnow","grilledFish","grilledCorn","roastSweetPotato","stirKangkong","basilCatfish","tomYum","sourCurry","friedPerch","fishCake","spicyEel","grilledPrawn","steamedGoby","pumpkinSoup","shabu","somTam","grilledEggplant","tomKha","friedGourami","crabCurry","steamedSheatfish","friedFrog","laab","omelette","snailCurry","candiedPumpkin","friedRice","greenCurry","khanomJeen","hoMok","mangoStickyRice","bananaInCoconut","taroPudding","steamedCroaker","gingerFish","turmericFish","jungleCurry","megaLaab","watermelonSlices","khantoke","naamPrik","sushi","ramen","tempura","unadon","okonomiyaki","kimchi","bibimbap","tteokbokki","kimbap","pajeon","harGow","chowMein","springRoll","congee","mapoTofu","pizza","spaghetti","risotto","lasagna","minestrone","fishCurry","naan","biryani","samosa","lassi","fishChips","ukha","thieboudienne","piranhaSoup","crawfishBoil","masgouf","salmonSteak","arapaimaRoast","mushroomSoup","mushroomSkewer","fishOnStick","roastYam","roastedApple","mushroomRisotto","fernSalad","herbTea","berryCompote","bakedApple","roastChestnut","forestStew","bambooShootStir","rosemaryFish","ginsengSoup","moonTea","truffleEggs","mushroomOmelette"],
    "inside": {"boot":{"chance":0.35,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"bottle":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea","scrollTruffleEggs","scrollMushroomOmelette"]},"chest":{"chance":1,"scrolls":["scrollGrilledEggplant","scrollTomKha","scrollFriedGourami","scrollCrabCurry","scrollSteamedSheatfish","scrollFriedFrog","scrollLaab","scrollSnailCurry","scrollCandiedPumpkin","scrollFriedRice","scrollSushi","scrollTempura","scrollOkonomiyaki","scrollKimchi","scrollBibimbap","scrollKimbap","scrollPajeon","scrollHarGow","scrollSpringRoll","scrollCongee","scrollSpaghetti","scrollMinestrone","scrollSamosa","scrollKhanomJeen","scrollMangoStickyRice","scrollBananaInCoconut","scrollTaroPudding","scrollSteamedCroaker","scrollGingerFish","scrollTurmericFish","scrollJungleCurry","scrollMegaLaab","scrollWatermelonSlices","scrollKhantoke","scrollNaamPrik","scrollRamen","scrollUnadon","scrollTteokbokki","scrollChowMein","scrollMapoTofu","scrollPizza","scrollRisotto","scrollLasagna","scrollFishCurry","scrollNaan","scrollBiryani","scrollLassi","scrollTruffleEggs","scrollMushroomOmelette"]},"wels":{"chance":1,"scrolls":["scrollGrilledCorn","scrollRoastSweetPotato","scrollStirKangkong","scrollBasilCatfish","scrollTomYum","scrollSourCurry","scrollFriedPerch","scrollFishCake","scrollSpicyEel","scrollGrilledPrawn","scrollSteamedGoby","scrollPumpkinSoup","scrollShabu","scrollFishChips","scrollUkha","scrollThieboudienne","scrollPiranhaSoup","scrollCrawfishBoil","scrollMasgouf","scrollSalmonSteak","scrollArapaimaRoast","scrollMushroomSoup","scrollMushroomSkewer","scrollFishOnStick","scrollRoastYam","scrollRoastedApple","scrollMushroomRisotto","scrollFernSalad","scrollHerbTea","scrollBerryCompote","scrollBakedApple","scrollRoastChestnut","scrollForestStew","scrollBambooShootStir","scrollRosemaryFish","scrollGinsengSoup","scrollMoonTea"]},"pacu":{"chance":0.8,"scrolls":["seedGarlic","seedBasil","seedTomato","seedCorn","seedDaikon","seedSweetPotato"]}},
    "map": {"town":[64,64],"farm":[128,0,60,44]},
    "misses": 30
  }$town$::jsonb),
  ('fish', $town${
    "minnow": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[5,22]],"rain":1,"wait":[3,15],"size":[4,8],"effort":2,"line":0.5},
    "barb": {"tier":"common","baits":{"dough":1,"corn":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,22],"effort":3,"line":0.8},
    "tilapia": {"tier":"common","baits":{"dough":1,"corn":0.8,"moth":1},"hours":[[7,17]],"rain":1,"wait":[5,28],"size":[18,32],"effort":4,"line":0.9},
    "perch": {"tier":"common","baits":{"worm":1,"caterpillar":1},"hours":[[5,20]],"rain":1.3,"wait":[5,25],"size":[10,18],"effort":4,"line":0.8},
    "catfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"loach":0.5,"dough":0.3,"caterpillar":1,"moth":0.3,"dragonfly":0.5},"hours":[[18,24],[0,6]],"rain":2,"wait":[8,35],"size":[25,45],"effort":5,"line":1},
    "pangasius": {"tier":"uncommon","baits":{"dough":1,"corn":1,"moth":1},"hours":[[8,17]],"rain":1,"wait":[10,50],"size":[50,90],"effort":7,"line":1.3},
    "snakehead": {"tier":"uncommon","baits":{"minnow":1,"worm":0.3,"caterpillar":0.3,"dragonfly":1},"hours":[[5,8],[17,20]],"rain":1.2,"wait":[13,55],"size":[35,70],"effort":7,"line":1.1},
    "eel": {"tier":"uncommon","baits":{"worm":1,"caterpillar":1},"hours":[[19,24],[0,5]],"rain":2.5,"wait":[13,55],"size":[40,80],"effort":6,"line":1},
    "prawn": {"tier":"uncommon","baits":{"worm":0.8,"dough":0.6,"caterpillar":0.8,"moth":0.6},"hours":[[17,24]],"rain":1,"wait":[10,45],"size":[14,28],"effort":4,"line":0.7},
    "featherback": {"tier":"rare","baits":{"minnow":1,"dragonfly":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[45,85],"effort":8,"line":1.2},
    "goby": {"tier":"rare","baits":{"minnow":1,"worm":0.7,"caterpillar":0.7,"dragonfly":1},"hours":[[20,24],[0,4]],"rain":1,"wait":[23,90],"size":[25,50],"effort":8,"line":1.1},
    "gourami": {"tier":"common","baits":{"branBait":1,"cricket":0.6,"grasshopper":0.6},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[12,20],"effort":3,"line":0.8},
    "crab": {"tier":"common","baits":{"shrimpLive":1,"branBait":0.5},"hours":[[17,24],[0,6]],"rain":1.5,"wait":[5,25],"size":[5,9],"effort":2,"line":0.5},
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
    "loach": {"tier":"common","baits":{"worm":1,"dough":0.5,"caterpillar":1,"moth":0.5},"hours":[[0,24]],"rain":3,"wait":[4,20],"size":[8,15],"effort":2,"line":0.5,"water":"bank"},
    "mosquitofish": {"tier":"common","baits":{"dough":1,"worm":0.5,"caterpillar":0.5,"moth":1},"hours":[[6,18]],"rain":1,"wait":[3,15],"size":[3,6],"effort":1,"line":0.4,"water":"bank"},
    "mussel": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[6,12],"effort":1,"line":0.4,"water":"bank"},
    "crayfish": {"tier":"common","baits":{"worm":1,"minnow":0.5,"caterpillar":1,"dragonfly":0.5},"hours":[[18,24],[0,5]],"rain":1.5,"wait":[5,25],"size":[7,13],"effort":3,"line":0.6,"water":"bank"},
    "goldfish": {"tier":"common","baits":{"dough":1,"moth":1},"hours":[[8,18]],"rain":1,"wait":[5,25],"size":[6,14],"effort":2,"line":0.5,"water":"bank","needs":["weekend"]},
    "carp": {"tier":"common","baits":{"corn":1,"dough":0.7,"moth":0.7},"hours":[[6,18]],"rain":1,"wait":[6,28],"size":[25,50],"effort":5,"line":1},
    "piranha": {"tier":"common","baits":{"minnow":1,"loach":1,"worm":0.4,"caterpillar":0.4,"dragonfly":1},"hours":[[9,17]],"rain":1,"wait":[4,20],"size":[15,30],"effort":4,"line":0.8,"water":"deck"},
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
    "popotoFish": {"tier":"common","baits":{"worm":1,"dough":1,"caterpillar":1,"moth":1},"hours":[[0,24]],"rain":1,"wait":[5,25],"size":[10,20],"effort":3,"line":0.7,"needs":["crowd"]},
    "rainbowFish": {"tier":"common","baits":{"dough":1,"worm":1,"caterpillar":1,"moth":1},"hours":[[6,18]],"rain":1,"wait":[5,25],"size":[8,14],"effort":3,"line":0.6,"needs":["after"]},
    "moonFish": {"tier":"rare","baits":{"dough":1,"worm":0.6,"caterpillar":0.6,"moth":1},"hours":[[19,24],[0,5]],"rain":1,"wait":[18,75],"size":[20,40],"effort":7,"line":1,"needs":["full"]}
  }$town$::jsonb),
  ('flotsam', $town${
    "hyacinth": {"weight":9,"wait":[4,23]},
    "boot": {"weight":2,"wait":[5,30]},
    "driftwood": {"weight":6,"wait":[4,23],"on":["cricket","branBait","shrimpLive","grasshopper"]},
    "bottle": {"weight":3,"wait":[5,30],"on":["cricket","branBait","shrimpLive","grasshopper"]},
    "pearl": {"weight":0.6,"wait":[15,60],"on":["antEggs","lure","fermentedBait"]},
    "chest": {"weight":0.3,"wait":[20,75],"on":["antEggs","lure","fermentedBait"]}
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
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb),
  ('farming', $town${
    "costs": {"clear":2,"till":2,"pull":2,"sow":1,"water":1,"feed":1,"cure":1,"pick":2},
    "water": {"adds":30,"every":60},
    "feed": 1.25,
    "guard": 24,
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
    "buckets": {"bucket":1,"bucketIron":2},
    "well": 40,
    "chores": {"draw":2,"pour":1,"fill":1},
    "beds": {"empty":24,"untended":96,"each":2},
    "bedsAt": [[132,4],[140,4],[148,4],[161,4],[169,4],[177,4],[132,12],[140,12],[148,12],[161,12],[169,12],[177,12],[132,25],[140,25],[148,25],[161,25],[169,25],[177,25],[132,33],[140,33],[148,33],[161,33],[169,33],[177,33]],
    "side": 7,
    "wellAt": [156,23],
    "misses": 30
  }$town$::jsonb),
  ('order', $town${
    "n": {"fish":[4,8],"crop":[4,8],"made":[2,4]},
    "asks": {"fish":[["minnow",0],["barb",0],["tilapia",0],["perch",0],["catfish",0],["gourami",7],["crab",18],["snail",18],["loach",0],["mosquitofish",0],["mussel",0],["crayfish",0],["carp",0],["piranha",0]],"crop":[["kangkong",0],["scallion",0],["cabbage",0],["carrot",0],["daikon",5],["corn",4],["chili",0],["basil",2],["cucumber",8],["longBean",14]],"made":[["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["sourCurry",5],["friedGourami",19],["omelette",10],["friedRice",19],["sushi",29],["ramen",48],["bibimbap",30],["tteokbokki",49],["kimbap",23],["pajeon",12],["chowMein",48],["springRoll",19],["congee",10],["fishSauce",0],["compost",0],["growFert",0],["pestCure",0],["driedFish",7],["saltedFish",22],["pickle",22],["rope",7],["noodle",16],["fermentedFish",46],["shrimpPaste",46],["driedChili",46],["riceNoodle",46],["toastedRice",46]]}
  }$town$::jsonb),
  ('hints', $town${
    "price": {"1":15,"2":40,"3":90},
    "ids": [["friedMinnow",0],["grilledFish",0],["grilledCorn",4],["roastSweetPotato",6],["stirKangkong",1],["basilCatfish",2],["tomYum",3],["sourCurry",5],["friedPerch",1],["fishCake",2],["spicyEel",2],["grilledPrawn",0],["steamedGoby",0],["pumpkinSoup",0],["shabu",5],["fishSauce",0],["compost",0],["growFert",0],["guardFert",1],["pestCure",0],["basket",0],["fishChips",0],["ukha",0],["thieboudienne",0],["piranhaSoup",0],["crawfishBoil",4],["masgouf",0],["salmonSteak",1],["arapaimaRoast",0],["mushroomSoup",0],["mushroomSkewer",0],["fishOnStick",0],["roastYam",0],["roastedApple",0],["mushroomRisotto",0],["fernSalad",0],["herbTea",0],["berryCompote",0],["bakedApple",0],["roastChestnut",0],["forestStew",0],["bambooShootStir",0],["rosemaryFish",0],["ginsengSoup",0],["moonTea",0],["hookScale",0],["floatGlow",0],["bowl",0],["skewer",0],["floatFeather",0],["lineSpun",0],["mulch",0],["lavenderSachet",0],["bugNet",0],["somTam",31],["grilledEggplant",17],["tomKha",28],["friedGourami",19],["crabCurry",24],["steamedSheatfish",28],["friedFrog",19],["laab",29],["omelette",9],["snailCurry",24],["candiedPumpkin",15],["friedRice",19],["sushi",29],["tempura",19],["okonomiyaki",12],["kimchi",22],["bibimbap",30],["kimbap",23],["pajeon",12],["harGow",26],["springRoll",19],["congee",0],["spaghetti",16],["minestrone",16],["samosa",19],["driedFish",0],["saltedFish",22],["curryPaste",24],["pickle",22],["charcoal",0],["rope",0],["krabung",0],["noodle",16],["truffleEggs",0],["mushroomOmelette",0],["greenCurry",61],["khanomJeen",61],["hoMok",61],["mangoStickyRice",62],["bananaInCoconut",61],["taroPudding",65],["steamedCroaker",48],["gingerFish",56],["turmericFish",54],["jungleCurry",64],["megaLaab",46],["watermelonSlices",58],["khantoke",66],["naamPrik",28],["ramen",48],["unadon",48],["tteokbokki",49],["chowMein",48],["mapoTofu",48],["pizza",60],["risotto",57],["lasagna",60],["fishCurry",61],["naan",60],["biryani",54],["lassi",62],["coconutMilk",61],["fermentedFish",22],["shrimpPaste",25],["driedChili",0],["riceNoodle",12],["toastedRice",19],["yoke",0]]
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v125>

/* ── what both stand on ──────────────────────────────────────────────────── */

-- The word.
create or replace function town.word()
returns text language sql stable set search_path = public
as $$ select word from public.town_secrets where key = 'wild' $$;

-- The hour of the day in Bangkok at a moment, with its fraction.
create or replace function town.hour_at(p_at bigint)
returns double precision language sql immutable
as $$ select ((((p_at + 25200000) % 86400000) + 86400000) % 86400000)::double precision / 3600000::double precision $$;

-- Whether the moon is full at a moment: as the river's fish have it (v122).
create or replace function town.full_moon(p_at bigint)
returns boolean language sql stable
as $$ select 'full' = any(town.signs_of(p_at, false, 0, 0::bigint, false)) $$;

-- lib/town/forest.ts's and lib/town/insects.ts's fits(), but for where: whether
-- a thing (a find of the forest's, or an insect) may be there in the turn
-- that begins at a moment: its map, its part of the forest, its hours, the
-- sky, a day of its own, the moon.
create or replace function town.wild_fits(p_what jsonb, p_id text, p_place text, p_zone text, p_at bigint, p_word text)
returns boolean language plpgsql stable
as $$
declare
  h double precision;
begin
  if p_what ? 'places' and not p_what->'places' ? p_place then return false; end if;
  if p_what ? 'zones' and (p_zone is null or not p_what->'zones' ? p_zone) then return false; end if;
  if p_what ? 'hours' then
    h := town.hour_at(p_at);
    if not exists (select 1 from jsonb_array_elements(p_what->'hours') r where h >= (r->>0)::double precision and h < (r->>1)::double precision) then return false; end if;
  end if;
  if p_what ? 'rain' and town.wet_ms(p_at - ((p_what->>'rain')::double precision * 3600000)::bigint, p_at) <= 0 then return false; end if;
  if coalesce((p_what->>'dry')::boolean, false) and town.wet_ms(p_at - 1800000, p_at) > 0 then return false; end if;
  if p_what ? 'day' and not town.roll(p_word || ':day:' || p_id, town.day_of(p_at)::bigint) < (p_what->>'day')::double precision then return false; end if;
  if coalesce((p_what->>'moon')::boolean, false) and not town.full_moon(p_at) then return false; end if;
  return true;
end;
$$;

-- How many have taken from a place or a haunt in a turn, and whether a
-- member is one of them.
create or replace function town.taken(p_what text, p_place integer, p_turn bigint, p_member uuid)
returns jsonb language sql stable set search_path = public
as $$
  select jsonb_build_object('n', count(*), 'mine', coalesce(bool_or(t.member_id = p_member), false))
    from public.town_takes t where t.what = p_what and t.place = p_place and t.turn = p_turn
$$;

/* ── the forest ──────────────────────────────────────────────────────────── */

-- lib/town/forest.ts's holds(): what a place has now, or null for nothing.
-- Decided as its turn begins, by where it is, the hour, the sky and the day
-- then, and rolled from the word, the place and the turn. (`p_cat` and
-- `p_word` are the forest's row and the word, for whoever looks at every
-- place at once and has read them already.)
create or replace function town.wild_holds(p_spot integer, p_now bigint, p_cat jsonb default null, p_word text default null)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := coalesce(p_cat, town.cat('forest'));
  spot jsonb := f->'spots'->p_spot;
  kind jsonb := f->'kinds'->(spot->>0);
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
$$;

-- lib/town/forest.ts's gather(): gather what a place has. `p_taken` is how
-- many have taken from it this turn, `p_mine` whether this member is one of
-- them; (`p_x`, `p_y`) the tile they stand on. What comes of it is what the
-- place has, less one for every miss (never none); among mushrooms every
-- wrong one taken is a toadstool besides, up to so many.
create or replace function town.gather(p_purse jsonb, p_spot integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text,
  p_x integer, p_y integer, p_misses double precision, p_wrong double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forest');
  spot jsonb := f->'spots'->p_spot;
  kind jsonb := f->'kinds'->(spot->>0);
  bag jsonb := p_purse->'bag';
  item text := p_has->>'item';
  n integer;
  wrong integer := 0;
begin
  if p_has is null or p_has = 'null'::jsonb or spot is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_x is null or p_y is null or greatest(abs(p_x - (spot->>1)::int), abs(p_y - (spot->>2)::int)) > (f->>'reach')::int then return town.no('far'); end if;
  if kind->>'how' = 'dig' and (p_hand is null or not f->'hoes' ? p_hand) then return town.no('tool'); end if;
  n := greatest(1, (p_has->>'n')::int - greatest(0, floor(coalesce(p_misses, 0)))::int);
  if spot->>0 = 'mushrooms' then wrong := least((f->>'decoys')::int, greatest(0, floor(coalesce(p_wrong, 0)))::int); end if;
  if town.room(bag, item) < n then return town.no('full'); end if;
  bag := town.put(bag, item, n);
  if wrong > 0 then
    if town.room(bag, f->>'decoy') < wrong then return town.no('full'); end if;
    bag := town.put(bag, f->>'decoy', wrong);
  end if;
  return jsonb_build_object('ok', true, 'purse', town.spend(p_purse, (kind->>'cost')::double precision, p_now) || jsonb_build_object('bag', bag),
    'got', case when wrong > 0 then jsonb_build_array(jsonb_build_array(item, n), jsonb_build_array(f->>'decoy', wrong)) else jsonb_build_array(jsonb_build_array(item, n)) end);
end;
$$;

/* ── insects ─────────────────────────────────────────────────────────────── */

-- lib/town/insects.ts's swarmAt(): what a haunt has now, or null. (`p_cat`
-- and `p_word`: as for a place of the forest's.)
create or replace function town.bug_at(p_haunt integer, p_now bigint, p_cat jsonb default null, p_word text default null)
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
begin
  if p_haunt is null or p_haunt < 0 or h is null or kind is null then return null; end if;
  every := (kind->>'every')::bigint * 60000;
  phase := floor(town.roll('bugphase', p_haunt) * (kind->>'every')::double precision)::bigint * 60000;
  turn := floor((p_now + phase)::numeric / every)::bigint;
  at_ := turn * every - phase;
  if town.roll(word || ':bug', p_haunt, turn) >= (kind->>'chance')::double precision then return null; end if;
  for i in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>i);
    fits := fits || (bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>i, h->>1, h->>2, at_, word));
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
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('turn', turn, 'bug', pick, 'n', lo + floor(town.roll(word || ':bugs', p_haunt, turn) * (hi - lo + 1))::int,
    'seed', p_haunt::bigint * 100003 + turn, 'until', (turn + 1) * every - phase);
end;
$$;

-- lib/town/insects.ts's net(): catch what a haunt has. `p_misses` is the
-- swings that came to nothing first, each a point of stamina, up to so many;
-- `p_lure` what somebody under the tree holds (a beetle comes down to
-- nothing else).
create or replace function town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text,
  p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
returns jsonb language plpgsql stable
as $$
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
  return jsonb_build_object('ok', true, 'purse', town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;

/* ── the fountain's wishes: v123's, with two more ────────────────────────── */

-- <wishes>
create or replace function town.wishes()
returns text[] language sql immutable
as $$ select array['calm', 'keen', 'lucky', 'hearty', 'green', 'swift', 'clear', 'spring', 'sprout', 'feast', 'carry', 'forage', 'net'] $$;
-- </wishes>

/* ── a deed's word in Thai: v123's, with two more ────────────────────────── */

-- <deed_th>
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
    else p_what end
$$;
-- </deed_th>

/* ── what a member calls ─────────────────────────────────────────────────── */

-- Every place of the forest that has something for me now: its number, the
-- thing (but for what is buried, which is told only when it is dug out), how
-- many a gathering gives at the most, and the moment its turn ends.
create or replace function public.town_wild()
returns jsonb language plpgsql security definer set search_path = public
as $$
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
begin
  -- (what has been taken of late, in one look: no turn is longer than half a day)
  select coalesce(jsonb_object_agg(g.k, jsonb_build_object('n', g.n, 'mine', g.mine)), '{}'::jsonb) into took
    from (select tk.place::text || ':' || tk.turn::text as k, count(*) as n, bool_or(tk.member_id = me) as mine
            from public.town_takes tk where tk.what = 'spot' and tk.at > now() - interval '13 hours' group by tk.place, tk.turn) g;
  for i in 0..jsonb_array_length(f->'spots') - 1 loop
    has := town.wild_holds(i, now_, f, word);
    continue when has is null;
    kind := f->'kinds'->(f->'spots'->i->>0);
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (kind->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, case when kind->>'how' = 'dig' then null else has->>'item' end, (has->>'n')::int, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'wild', out_);
end;
$$;

-- Gather what a place has, from the tile I stand on. `p_went` is the page's
-- own account of the game (misses, wrong ones, seconds), within bounds.
create or replace function public.town_gather(p_spot integer, p_x integer, p_y integer, p_went jsonb default null)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  f jsonb := town.cat('forest');
  went jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  misses double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'misses') = 'number' then (went->>'misses')::numeric end, 0))), (f->>'misses')::int);
  wrong double precision := least(greatest(0, floor(coalesce(case when jsonb_typeof(went->'wrong') = 'number' then (went->>'wrong')::numeric end, 0))), (f->>'misses')::int);
  secs double precision := least(greatest(0, coalesce(case when jsonb_typeof(went->'secs') = 'number' then (went->>'secs')::numeric end, 0)), 3600);
  spot jsonb;
  has jsonb;
  t jsonb;
  did jsonb;
begin
  if p_spot is null or p_spot < 0 or p_spot >= jsonb_array_length(f->'spots') then return town.answer(me, town.no('none')); end if;
  spot := f->'spots'->p_spot;
  -- one at a time at a place, so that its share is not taken twice over (after my own purse, as a bed is held)
  perform pg_advisory_xact_lock(hashtext('town:spot:' || p_spot::text));
  has := town.wild_holds(p_spot, now_);
  t := town.taken('spot', p_spot, coalesce((has->>'turn')::bigint, 0), me);
  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('spot', p_spot, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    perform town.note(me, 'gather', has->>'item', (did->'got'->0->>1)::numeric, 0, jsonb_build_object(
      'spot', p_spot, 'kind', spot->>0, 'how', f->'kinds'->(spot->>0)->>'how', 'tile', jsonb_build_array(p_x, p_y), 'hand', town.hand_of(purse),
      'misses', misses, 'wrong', wrong, 'secs', secs, 'spent', town.stamina_of(purse, now_) <= 0));
    -- (turns long gone are of no more use)
    delete from public.town_takes where at < now() - interval '2 days';
  end if;
  return town.answer(me, did) || jsonb_build_object('spot', p_spot);
end;
$$;

-- Every haunt that has an insect for me now: its number, the insect, its
-- turn, what its ways follow from, and the moment the turn ends. With the
-- village's book of insects: who first caught each kind.
create or replace function public.town_bugs()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  word text := town.word();
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
    has := town.bug_at(i, now_, ins, word);
    continue when has is null;
    t := took->(i::text || ':' || (has->>'turn'));
    continue when t is not null and ((t->>'mine')::boolean or (t->>'n')::int >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int);
    out_ := out_ || jsonb_build_array(jsonb_build_array(i, has->>'bug', (has->>'turn')::bigint, (has->>'seed')::bigint, (has->>'until')::bigint));
  end loop;
  return jsonb_build_object('now', now_, 'bugs', out_,
    'book', (select coalesce(jsonb_object_agg(b.key, b.value->>'name'), '{}'::jsonb) from jsonb_each(town.thing('bugs', false)) b));
end;
$$;

-- Catch what a haunt has, from the tile I stand on, after so many swings
-- that missed. `p_by` is who stands under the tree with something sweet (a
-- beetle): what they hold is their own purse's to say.
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
begin
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  has := town.bug_at(p_haunt, now_);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first);
end;
$$;

/* ── who may ─────────────────────────────────────────────────────────────── */

-- The rules, the word among them, are no browser's to call; the four are a
-- member's.
revoke execute on all functions in schema town from public, anon, authenticated;

do $$
declare
  f text;
begin
  foreach f in array array['town_wild()', 'town_gather(integer, integer, integer, jsonb)', 'town_bugs()', 'town_net(integer, integer, integer, numeric, uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ───────────────────────────────────────
--
--   select (select count(*) from public.town_secrets) as words,
--          (select count(*) from information_schema.role_table_grants
--            where table_schema = 'public' and table_name in ('town_secrets', 'town_takes') and grantee in ('anon', 'authenticated')) as grants,
--          (select bool_and(c.relrowsecurity) from pg_class c where c.oid in ('public.town_secrets'::regclass, 'public.town_takes'::regclass)) as closed;
--   -- 1 | 0 | true
--
--   select jsonb_array_length(town.cat('forest')->'spots') as places, jsonb_array_length(town.cat('insects')->'haunts') as haunts,
--          town.cat('items') ? 'bugNet' as net, town.cat('shelf')->'basic' ? 'bugNet' as on_the_shelf, town.cat('cooking')->'cookware' ? 'skewer' as skewer;
--   -- (as lib/town/forest.ts and lib/town/insects.ts have them) | true | true | true
--
--   select count(*) filter (where has_function_privilege('anon', p.oid, 'execute')) as anon,
--          count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute')) as member
--     from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_wild', 'town_gather', 'town_bugs', 'town_net');
--   -- 0 | 4
--
--   select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
--          (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open;
--   -- false | 0
--
--   select town.deed_th('gather') as gather, town.deed_th('net') as net, town.deed_th('toss') as toss;
--   -- เก็บของป่า | จับแมลง | โยนเหรียญลงน้ำพุ
--
-- ─── Reading it ──────────────────────────────────────────────────────────
--
--   select * from town.tally() where what in ('gather', 'net');     -- who has gathered and caught, how often, how many
--
--   -- what has been gathered, by the thing
--   select d.thing, count(*) as times, sum(d.n) as n from public.town_deeds d where d.what = 'gather' group by 1 order by 2 desc;
--
--   -- the village's book of insects
--   select b.key as insect, b.value->>'name' as first_caught_by, to_timestamp((b.value->>'at')::bigint / 1000.0) as at
--     from jsonb_each((select doc from public.town_things where key = 'bugs')) b order by 3;
