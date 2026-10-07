// Scenes of the well's new size and the can's filling, through what a member calls (try-line.mjs and try-all.mjs play them).
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, patch }) {
  t.section("the farm's well: a hundred bucketfuls, and a can's filling takes two of them");
  const cat = await one(`select (data->>'well')::int as well, (data->>'fill')::int as fill, data->'cans' as cans, data->'wellAt' as at from public.town_catalog where key = 'farming'`);
  t.check("the catalog says so: the well holds 100, a filling takes 2, the cans hold what they held", cat.well === 100 && cat.fill === 2 && same(cat.cans, { can: 8, canCopper: 12, canBrass: 18 }), cat);
  const [wx, wy] = cat.at, by = [wx + 1, wy];
  const well = async () => Number((await one(`select doc from public.town_things where key = 'well'`))?.doc ?? 0);
  const lots = async () => (await t.sql(`select member_id, buckets::int as buckets from public.town_well_water order by id`)).rows.map((r) => [r.member_id, r.buckets]);
  const bag = (hand, water) => ({ hand, stamina: { day: 0, left: 80 }, bag: [{ item: hand, n: 1, ...(water ? { water } : {}) }, null, null, null, null, null, null, null, null, null] });
  // two carriers pour: the first three bucketfuls, the second two
  await call(U.m1, "town_me"); await call(U.m2, "town_me");
  await patch(U.m1, bag("waterYokeGreat", 3));
  let did = await call(U.m1, "town_chore", by[0], by[1]);
  t.check("three bucketfuls are poured in by one carrier", did?.ok === true && did.chore === "pour" && (await well()) === 3, did);
  await patch(U.m2, bag("bucketIron", 2));
  did = await call(U.m2, "town_chore", by[0], by[1]);
  t.check("…and two by another: the book has both, the oldest first", did?.ok === true && (await well()) === 5 && same(await lots(), [[U.m1, 3], [U.m2, 2]]), { did, lots: await lots() });
  // a can filled: two bucketfuls leave the well and the book's oldest water, and the can is full
  await patch(U.m2, bag("can", 3));
  did = await call(U.m2, "town_chore", by[0], by[1]);
  let p = await purseOf(U.m2);
  t.check("a can's filling takes two bucketfuls of the well and fills the can, however much was left in it", did?.ok === true && did.chore === "fill" && did.well === 3 && (await well()) === 3 && p.bag[0].water === 8, { did, bag: p.bag[0] });
  t.check("…the book takes as many of its oldest water, and the can's water is the oldest carrier's", same(await lots(), [[U.m1, 1], [U.m2, 2]])
    && same((await t.sql(`select carrier, waterings::int as w from public.town_well_cans where member_id = $1 and item = 'can'`, [U.m2])).rows.map((r) => [r.carrier, r.w]), [[U.m1, 8]]), { lots: await lots() });
  t.check("…and it is written down with the two it took", same((await deeds("fill")).map((d) => [d.member_id, d.thing, d.n, d.doc.well]), [[U.m2, "can", 2, 3]]), await deeds("fill"));
  // a brass can: two more, across two carriers' water
  await patch(U.m1, bag("canBrass"));
  did = await call(U.m1, "town_chore", by[0], by[1]);
  p = await purseOf(U.m1);
  t.check("a better can takes its two as well, across two carriers' water, and holds more of them", did?.ok === true && did.well === 1 && p.bag[0].water === 18 && same(await lots(), [[U.m2, 1]]), { did, lots: await lots() });
  // one bucketful left: half a can, and the well is dry
  await patch(U.m2, bag("canCopper", 2));
  did = await call(U.m2, "town_chore", by[0], by[1]);
  p = await purseOf(U.m2);
  t.check("with one bucketful left a filling takes it and gives half a can more", did?.ok === true && did.well === 0 && p.bag[0].water === 8 && same(await lots(), []) && (await deeds("fill")).at(-1).n === 1, { did, bag: p.bag[0] });
  did = await call(U.m2, "town_chore", by[0], by[1]);
  t.check("a dry well fills nothing, and nothing is spent or written down", did?.ok === false && did.why === "dry" && (await deeds("fill")).length === 3, did);
  // the brim is a hundred
  await t.sql(`select town.keep_thing('well', '98'::jsonb)`);
  await patch(U.m1, bag("waterCart", 6));
  did = await call(U.m1, "town_chore", by[0], by[1]);
  p = await purseOf(U.m1);
  t.check("the well takes water up to a hundred bucketfuls, and what does not fit stays in the bucket", did?.ok === true && did.well === 100 && (await well()) === 100 && p.bag[0].water === 4, { did, bag: p.bag[0] });
  did = await call(U.m1, "town_chore", by[0], by[1]);
  t.check("at its brim nothing more is poured", did?.ok === false && did.why === "none" && (await well()) === 100, did);
}
