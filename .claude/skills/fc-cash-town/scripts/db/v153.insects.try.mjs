// Scenes of the insects' gifts through the functions a member calls (try-line.mjs plays them on the stand-in
// database, after v153.shared.sql and v153.insects.sql). The stand-in's clock is the machine's: whatever hour this
// runs at, a drop by the forest's litter brings something (what lies among sticks and leaves is out at every hour),
// and one of a lamp and a flower bed has nothing about (a lamp by day, flowers at night, both at dusk and at dawn).
export default async function ({ t, U, one, call, give, patch, purseOf, deeds, CODE }) {
  const INS = CODE.insects, haunts = INS.haunts;
  const tileOf = (i) => [Math.floor(haunts[i][3][0][0]), Math.floor(haunts[i][3][0][1])];
  const first = (kind, place) => haunts.findIndex((h) => h[0] === kind && h[1] === place);
  const mine = async (what, who) => (await deeds(what)).filter((d) => d.member_id === who);
  const bag = (...items) => [...items.map(([item, n]) => ({ item, n })), ...Array(10 - items.length).fill(null)];
  const count = (purse, id) => (purse.bag ?? []).reduce((n, s) => n + (s && s.item === id ? s.n : 0), 0);
  const now = async () => Number((await one(`select town.now_ms() as n`)).n);

  t.section("the ground the rule cases stand on");
  const far = await one(`select (select count(*)::int from public.town_weather w where w.slot * 900000 > 1988000000000) as wet,
    (select count(*)::int from public.town_deeds d where d.what = 'net' and d.at > to_timestamp(1988000000)) as nets`);
  t.check("years on, the stand-in has had no rain and no catch", far.wet === 0 && far.nets === 0, far);
  t.check("the catalog has a drop's numbers", INS.nectar?.within === 10 && INS.nectar.soon === 3 && INS.nectar.stays === 120 && INS.nectar.maps?.length === 3 && same5(INS.nectar.at), INS.nectar);

  t.section("a drop of nectar (the insects' third rank)");
  const litter = first("litter", "forest"), [lx, ly] = tileOf(litter);
  let did = await call(U.m1, "town_nectar", lx, ly);
  t.check("nobody without the nectar puts a drop down", did?.ok === false && did.why === "none" && !did.purse?.lured, did);
  t.check("…and nothing is written down", (await mine("nectar", U.m1)).length === 0);
  await give(U.m1, { had: ["thingNectar"] });
  const t0 = await now();
  did = await call(U.m1, "town_nectar", lx, ly);
  const l = did?.lured;
  t.check("with it, a drop by the forest's litter brings something of the litter, at any hour", did?.ok === true && did.left === 9 && ["stickInsect", "leafInsect", "caterpillar"].includes(l?.bug) && l.haunt === litter && l.x === lx && l.y === ly, did);
  t.check("it comes within ten seconds and no sooner than three, and stays two minutes", !!l && l.from >= t0 + 3000 && l.from <= (await now()) + 10000 && l.until === l.from + 120000, { t0, l });
  let kept = await purseOf(U.m1);
  t.check("what it brings is kept in the purse, and a drop is counted", JSON.stringify(kept.lured) === JSON.stringify(l) && kept.gifts.used.thingNectar.n === 1, { lured: kept.lured, used: kept.gifts.used });
  let noted = await mine("nectar", U.m1);
  t.check("the drop is written down: the insect, the haunt it called from, the tile, the drops left", noted.length === 1 && noted[0].thing === l.bug && noted[0].n === l.n && noted[0].doc.haunt === litter && noted[0].doc.kind === "litter" && noted[0].doc.map === "forest"
    && noted[0].doc.tile[0] === lx && noted[0].doc.tile[1] === ly && noted[0].doc.left === 9, noted);
  did = await call(U.m1, "town_nectar", lx, ly);
  t.check("a second drop while one is out is refused, and none is used", did?.ok === false && did.why === "out" && (await purseOf(U.m1)).gifts.used.thingNectar.n === 1 && (await mine("nectar", U.m1)).length === 1, did);

  // (where nothing is about: a lamp by day, flowers at night)
  await give(U.m2, { had: ["thingNectar"] });
  const [ax, ay] = tileOf(first("lamp", "town")), [bx, by] = tileOf(first("blooms", "town"));
  const lampDrop = await call(U.m2, "town_nectar", ax, ay);
  // (a drop that was put down is out: its owner's purse is made as new before the other place is tried)
  if (lampDrop?.ok) await patch(U.m2, { lured: null });
  const bloomDrop = await call(U.m2, "town_nectar", bx, by);
  const quiet = [lampDrop, bloomDrop].filter((d) => d?.ok === false);
  t.check("where no insect is about at this hour (a lamp by day, flowers by night) no drop is put down", quiet.length >= 1 && quiet.every((d) => d.why === "quiet"), { lampDrop, bloomDrop });
  kept = await purseOf(U.m2);
  t.check("…and none is used up for it", (kept.gifts.used?.thingNectar?.n ?? 0) === [lampDrop, bloomDrop].filter((d) => d?.ok).length && (await mine("nectar", U.m2)).length === [lampDrop, bloomDrop].filter((d) => d?.ok).length, kept.gifts);
  await patch(U.m2, { lured: null });
  did = await call(U.m2, "town_nectar", -40, -40);
  t.check("nor off the maps", did?.ok === false && did.why === "quiet", did);
  // ten a day
  await give(U.m2, { had: ["thingNectar"], used: { thingNectar: { k: Number((await one(`select town.day_of(town.now_ms()) as d`)).d), n: 10 } } });
  did = await call(U.m2, "town_nectar", lx, ly);
  t.check("the eleventh drop of a day is refused", did?.ok === false && did.why === "spent", did);

  t.section("the insect of a drop, caught");
  await patch(U.m1, { bag: bag(["bugNet", 1]), hand: "bugNet" });
  did = await call(U.m1, "town_net_mine", "lured", lx, ly, 0);
  t.check("before it has come there is nothing to catch", did?.ok === false && did.why === "none", did);
  // (it has come: its drop's clock put back)
  await patch(U.m1, { lured: { ...l, from: t0 - 1000 } });
  await patch(U.m1, { hand: null });
  did = await call(U.m1, "town_net_mine", "lured", lx, ly, 0);
  t.check("with no net in the hand it is not caught", did?.ok === false && did.why === "tool", did);
  await patch(U.m1, { hand: "bugNet" });
  did = await call(U.m1, "town_net_mine", "lured", lx + 20, ly, 0);
  t.check("nor from far off", did?.ok === false && did.why === "far", did);
  did = await call(U.m1, "town_net_mine", "pair", lx, ly, 0);
  t.check("nor by a word that names no insect of mine", did?.ok === false && did.why === "none", did);
  did = await call(U.m2, "town_net_mine", "lured", lx, ly, 0);
  t.check("nor by anybody else: it is its owner's alone", did?.ok === false && did.why === "none", did);
  const staminaOf = async (who) => Number((await one(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [who])).s);
  const before = await purseOf(U.m1), stamina0 = await staminaOf(U.m1), plenty0 = Number((await one(`select town.plenty($1, town.now_ms() + 1000) as p`, [l.bug])).p);
  const points0 = Number((await one(`select coalesce((kept->>'points')::float8, 0) as p from public.town_work where member_id = $1 and line = 'insects'`, [U.m1]))?.p ?? 0);
  did = await call(U.m1, "town_net_mine", "lured", lx + 1, ly - 1, 1);
  t.check("with a net, from beside the drop, it is caught", did?.ok === true && did.got?.[0]?.[0] === l.bug && did.got[0][1] === l.n && did.first === true, did);
  kept = await purseOf(U.m1);
  const cost = INS.bugs[l.bug].cost + 1;
  const stamina1 = await staminaOf(U.m1);
  t.check("it is in the bag, the drop is done with, and it cost its stamina and a point for the miss", count(kept, l.bug) === count(before, l.bug) + l.n && kept.lured === null
    && Math.abs(stamina0 - stamina1 - cost) < 1e-9, { stamina0, stamina1, cost, lured: kept.lured });
  noted = (await mine("net", U.m1)).filter((d) => d.doc.nectar !== undefined);
  t.check("the catch is written down as a catch like any, with the haunt its drop called from", noted.length === 1 && noted[0].thing === l.bug && noted[0].n === l.n && noted[0].doc.nectar === litter && noted[0].doc.kind === "litter"
    && noted[0].doc.map === "forest" && noted[0].doc.misses === 1 && noted[0].doc.spent === false && noted[0].doc.first === true && noted[0].doc.tile[0] === lx + 1, noted);
  const book = (await one(`select doc from public.town_things where key = 'bugs'`)).doc;
  t.check("the first of its kind is in the village's book, with who", book?.[l.bug]?.by === U.m1, book);
  const plenty1 = Number((await one(`select town.plenty($1, town.now_ms() + 1000) as p`, [l.bug])).p);
  t.check("it counts towards its kind's scarcity, as any catch does", plenty0 === 1 && plenty1 < 1 && plenty1 > 0.9, { plenty0, plenty1 });
  const points1 = Number((await one(`select coalesce((kept->>'points')::float8, 0) as p from public.town_work where member_id = $1 and line = 'insects'`, [U.m1]))?.p ?? 0);
  t.check("and on the insects' line, as any catch does", points1 > points0, { points0, points1 });
  did = await call(U.m1, "town_net_mine", "lured", lx, ly, 0);
  t.check("caught once: there is nothing more to catch", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_nectar", lx, ly);
  t.check("and another drop may be put down", did?.ok === true && did.left === 8, did);
  // a drop's insect that was not caught is off after its two minutes
  await patch(U.m1, { lured: { ...did.lured, from: t0 - 200000, until: t0 - 1000 } });
  did = await call(U.m1, "town_net_mine", "lured", lx, ly, 0);
  t.check("one left alone is off after its time: nothing to catch, and a new drop may be put down", did?.ok === false && did.why === "none" && (await call(U.m1, "town_nectar", lx, ly))?.ok === true, did);
  // hunted scarce, a kind comes seldom: by the woods' litter at the next noon, chance's middle brings a stick insect;
  // with stick insects caught beyond counting it brings the caterpillar beside it, and at night, when a stick insect
  // is all there is, a stick insect still (something always comes while anything may)
  await patch(U.m1, { lured: null });
  const woods = haunts.findIndex((h) => h[0] === "litter" && h[2] !== "deep"), [sx, sy] = tileOf(woods);
  const noon = Math.ceil(((await now()) - 5 * 3600000) / 86400000) * 86400000 + 5 * 3600000, night = noon + 11 * 3600000 > (await now()) + 86400000 ? noon - 13 * 3600000 : noon + 11 * 3600000;
  const purse = JSON.stringify({ ...(await purseOf(U.m1)), coins: 0 });
  const drop = async (at) => (await one(`select town.nectar($1::jsonb, $2, $3, $4::bigint, 0.5, 0, 0) as r`, [purse, sx, sy, at])).r;
  const plain = await drop(noon);
  await t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, coins, doc) values ($1, now(), 'net', 'stickInsect', 100000000, 0, '{"scene":true}'::jsonb)`, [U.m2]);
  const hunted = await drop(noon), alone = night > (await now()) ? await drop(night) : null;
  t.check("a kind hunted beyond counting hardly comes to a drop: what is beside it there comes in its place", plain?.lured?.bug === "stickInsect" && hunted?.lured?.bug === "caterpillar", { plain: plain?.lured ?? plain, hunted: hunted?.lured ?? hunted });
  t.check("…and where it is all there is, it comes still", alone === null || alone?.lured?.bug === "stickInsect", alone);
  await t.sql(`delete from public.town_deeds where what = 'net' and doc ? 'scene'`);

  function same5(list) { return JSON.stringify(list) === JSON.stringify(["blooms", "water", "field", "lamp", "litter"]); }
}
