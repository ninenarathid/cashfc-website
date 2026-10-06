// The forest's gifts through the functions a member calls, against the stand-in database (try-line.mjs plays this
// after the rule cases): for each new or changed deed, that it is done, that it is refused for each reason, what is
// kept in the purse, what is written down, what is counted, and that somebody without the gift is as before.
export default async function ({ t, U, call, purseOf, deeds, one, give, patch, rank, CODE }) {
  const F = CODE.forest;
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
  const stamina = async (who) => { const p = await purseOf(who); return p?.stamina?.day === day ? p.stamina.left : 100; };
  const bagN = async (who, item) => ((await purseOf(who))?.bag ?? []).reduce((n, s) => n + (s && s.item === item ? s.n : 0), 0);
  const emptyBag = (who) => patch(who, { bag: Array(10).fill(null), hand: null });
  const lastDeed = async (what) => (await deeds(what)).at(-1);
  /** Every place of the forest that has something now, with what (as the SQL editor sees it: nobody else does). */
  const holding = async () => (await t.sql(`select i, town.wild_holds(i, town.now_ms()) as has from generate_series(0, $1::int - 1) as i`, [F.spots.length])).rows
    .filter((r) => r.has).map((r) => ({ id: r.i, kind: F.spots[r.i][0], x: F.spots[r.i][1], y: F.spots[r.i][2], how: F.kinds[F.spots[r.i][0]].how, ...r.has }));
  const places = await holding();
  const some = (how, n = 1, skip = []) => places.filter((p) => p.how === how && !skip.includes(p.id)).slice(0, n);
  t.check("the stand-in's forest has something at many places, of every way of gathering", places.length > 40 && ["pick", "choose", "dig", "shake"].every((h) => some(h).length > 0), places.length);

  // ── the squirrel ──
  t.section("the squirrel: what lies on the ground is fetched from two tiles off, for no stamina");
  const [a, b, c, d] = some("pick", 4);
  await give(U.m1, {}); await emptyBag(U.m1);
  await give(U.m2, { had: ["famSquirrel"], familiar: "famSquirrel" }); await emptyBag(U.m2);
  // without the gift: as before
  let did = await call(U.m1, "town_gather", a.id, a.x + 2, a.y, { misses: 0, wrong: 0 });
  t.check("without a squirrel, two tiles off is too far, and nothing is kept", did?.ok === false && did.why === "far" && (await bagN(U.m1, a.item)) === 0, did);
  did = await call(U.m1, "town_gather", a.id, a.x, a.y, { misses: 0, wrong: 0 });
  t.check("without a squirrel, picked up by hand at the place for a point of stamina", did?.ok === true && did.got?.[0]?.[0] === a.item && (await stamina(U.m1)) === 100 - F.kinds[a.kind].cost, { did: did?.got, left: await stamina(U.m1) });
  let deed = await lastDeed("gather");
  t.check("…written down as a gathering by hand", deed?.member_id === U.m1 && deed.thing === a.item && deed.doc.how === "pick" && !("by" in deed.doc), deed);
  // with it
  did = await call(U.m2, "town_gather", a.id, a.x + 2, a.y - 2, { misses: 0, wrong: 0 });
  t.check("with a squirrel at the heels it is fetched from two tiles off", did?.ok === true && did.got?.[0]?.[0] === a.item && did.got[0][1] === a.n, did?.got ?? did);
  t.check("…for none of its member's stamina, and it is in the bag", (await stamina(U.m2)) === 100 && (await bagN(U.m2, a.item)) === a.n, { left: await stamina(U.m2), n: await bagN(U.m2, a.item) });
  deed = await lastDeed("gather");
  t.check("…written down as the squirrel's, with the thing and how many", deed?.member_id === U.m2 && deed.thing === a.item && deed.n === a.n && deed.doc.by === "famSquirrel" && deed.doc.how === "pick" && deed.coins === 0, deed);
  const took = await one(`select count(*)::int as n from public.town_takes where what = 'spot' and place = $1 and member_id = $2`, [a.id, U.m2]);
  t.check("…and the place is taken from, once", took.n === 1, took);
  did = await call(U.m2, "town_gather", a.id, a.x + 1, a.y, { misses: 0, wrong: 0 });
  t.check("a place it has fetched from has nothing more for its member this turn", did?.ok === false && did.why === "had", did);
  did = await call(U.m2, "town_gather", b.id, b.x + 3, b.y, { misses: 0, wrong: 0 });
  t.check("three tiles off is too far for the squirrel too", did?.ok === false && did.why === "far", did);
  // what grows is still its member's to gather
  const [g] = some("choose");
  did = await call(U.m2, "town_gather", g.id, g.x + 2, g.y, { misses: 0, wrong: 0 });
  t.check("what grows is not fetched: two tiles off is too far", did?.ok === false && did.why === "far", did);
  did = await call(U.m2, "town_gather", g.id, g.x + 1, g.y, { misses: 0, wrong: 0 });
  t.check("…and gathered by hand it costs its stamina", did?.ok === true && (await stamina(U.m2)) === 100 - F.kinds[g.kind].cost, { did: did?.got ?? did, left: await stamina(U.m2) });
  // at rest, and another familiar
  await give(U.m2, { had: ["famSquirrel", "famGnome"], familiar: null });
  did = await call(U.m2, "town_gather", b.id, b.x + 2, b.y, { misses: 0, wrong: 0 });
  t.check("a squirrel at rest fetches nothing", did?.ok === false && did.why === "far", did);
  await give(U.m2, { had: ["famSquirrel", "famGnome"], familiar: "famGnome" });
  did = await call(U.m2, "town_gather", b.id, b.x + 2, b.y, { misses: 0, wrong: 0 });
  t.check("…nor does another familiar", did?.ok === false && did.why === "far", did);
  // with no stamina, and with no room
  await give(U.m2, { had: ["famSquirrel"], familiar: "famSquirrel" });
  await patch(U.m2, { stamina: { day, left: 0 } });
  did = await call(U.m2, "town_gather", b.id, b.x + 2, b.y, { misses: 0, wrong: 0 });
  deed = await lastDeed("gather");
  t.check("with no stamina left the squirrel fetches all the same", did?.ok === true && (await stamina(U.m2)) === 0 && deed?.doc.by === "famSquirrel" && deed.doc.spent === true, { did: did?.got ?? did, deed });
  await patch(U.m2, { bag: Array(10).fill({ item: "rod", n: 1 }) });
  did = await call(U.m2, "town_gather", c.id, c.x + 2, c.y, { misses: 0, wrong: 0 });
  t.check("into a bag with no room it fetches nothing, and the place is not taken from", did?.ok === false && did.why === "full"
    && (await one(`select count(*)::int as n from public.town_takes where what = 'spot' and place = $1 and member_id = $2`, [c.id, U.m2])).n === 0, did);
  await emptyBag(U.m2);
  // a heap for several: each once
  const shares = F.kinds[d.kind].shares;
  for (const who of [U.admin, U.m1, U.guest, U.unver].slice(0, shares)) await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('spot', $1, $2, $3, now())`, [d.id, d.turn, who]);
  did = await call(U.m2, "town_gather", d.id, d.x + 2, d.y, { misses: 0, wrong: 0 });
  t.check("the last of a heap gone to others, the squirrel comes back with nothing", did?.ok === false && did.why === "bare", did);

  // ── the truffle piglet ──
  t.section("the truffle piglet: no hoe, one more from every hole, ten holes to a meal's hours");
  const mounds = some("dig", 5), [h1, h2, h3, h4, h5] = mounds;
  t.check("the stand-in's forest has five mounds with something under them", mounds.length === 5, mounds.length);
  const most = CODE.gifts.uses.famPiglet.n, more = CODE.gifts.gifts.famPiglet.by;
  const used = async (who) => (await purseOf(who))?.gifts?.used?.famPiglet?.n ?? 0;
  await give(U.m1, {}); await patch(U.m1, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 100 } });
  await give(U.m2, { had: ["famPiglet"], familiar: "famPiglet" }); await patch(U.m2, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 100 } });
  // without the gift: as before
  did = await call(U.m1, "town_gather", h1.id, h1.x, h1.y, { misses: 0, wrong: 0 });
  t.check("without a piglet, bare hands dig nothing", did?.ok === false && did.why === "tool", did);
  did = await call(U.m1, "town_gather", h1.id, h1.x, h1.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("…and asking for a piglet one has not got is refused, with nothing kept or counted", did?.ok === false && did.why === "none" && (await bagN(U.m1, h1.item)) === 0 && (await stamina(U.m1)) === 100, did);
  await patch(U.m1, { bag: [{ item: "hoe", n: 1 }, ...Array(9).fill(null)], hand: "hoe" });
  did = await call(U.m1, "town_gather", h1.id, h1.x, h1.y, { misses: 0, wrong: 0 });
  t.check("…with a hoe in the hand it is dug as ever: what the mound has, for its stamina", did?.ok === true && did.got?.[0]?.[1] === h1.n && (await stamina(U.m1)) === 100 - F.kinds.mound.cost, { got: did?.got ?? did, has: h1.n });
  deed = await lastDeed("gather");
  t.check("…written down as dug by hand", deed?.member_id === U.m1 && deed.doc.how === "dig" && !("by" in deed.doc) && deed.doc.hand === "hoe", deed);
  // with it, and no hoe
  did = await call(U.m2, "town_gather", h1.id, h1.x, h1.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("with a piglet at the heels and no hoe, it is dug, and one more comes out of the hole", did?.ok === true && did.got?.[0]?.[0] === h1.item && did.got[0][1] === h1.n + more && (await bagN(U.m2, h1.item)) === h1.n + more, { got: did?.got ?? did, has: h1.n });
  t.check("…for the stamina digging costs, and one of its holes of these hours", (await stamina(U.m2)) === 100 - F.kinds.mound.cost && (await used(U.m2)) === 1, { left: await stamina(U.m2), used: await used(U.m2) });
  deed = await lastDeed("gather");
  t.check("…written down as the piglet's, with how many came out", deed?.member_id === U.m2 && deed.thing === h1.item && deed.n === h1.n + more && deed.doc.by === "famPiglet" && deed.doc.how === "dig" && deed.doc.hand === null && deed.coins === 0, deed);
  did = await call(U.m2, "town_gather", h1.id, h1.x, h1.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("the same mound has nothing more for its member this turn, and no hole is counted for asking", did?.ok === false && did.why === "had" && (await used(U.m2)) === 1, did);
  // badly dug: what was left under the earth is still left, the one more besides
  did = await call(U.m2, "town_gather", h2.id, h2.x, h2.y, { misses: 9, wrong: 0, with: "famPiglet" });
  t.check("dug badly, what was left behind is still left: one of the thing, and the one more", did?.ok === true && did.got?.[0]?.[1] === 1 + more && (await used(U.m2)) === 2, did?.got ?? did);
  // not asked: with no hoe nothing digs, and no hole is counted
  did = await call(U.m2, "town_gather", h3.id, h3.x, h3.y, { misses: 0, wrong: 0 });
  t.check("not asked of the piglet, bare hands dig nothing and no hole is counted", did?.ok === false && did.why === "tool" && (await used(U.m2)) === 2, did);
  // a hoe in the hand and the piglet at the heels: the plain way is as for anybody
  await patch(U.m2, { bag: [{ item: "hoe", n: 1 }, ...Array(9).fill(null)], hand: "hoe" });
  did = await call(U.m2, "town_gather", h3.id, h3.x, h3.y, { misses: 0, wrong: 0 });
  t.check("with a hoe in the hand too, the hoe's way gives what the mound has and counts no hole", did?.ok === true && did.got?.[0]?.[1] === h3.n && (await used(U.m2)) === 2, { got: did?.got ?? did, has: h3.n });
  // at rest, and past its count
  await give(U.m2, { had: ["famPiglet"], familiar: null, used: (await purseOf(U.m2)).gifts.used });
  await patch(U.m2, { hand: null });
  did = await call(U.m2, "town_gather", h4.id, h4.x, h4.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("a piglet at rest digs nothing", did?.ok === false && did.why === "none", did);
  const k = (await purseOf(U.m2)).gifts.used.famPiglet.k;
  await give(U.m2, { had: ["famPiglet"], familiar: "famPiglet", used: { famPiglet: { k, n: most - 1 } } });
  did = await call(U.m2, "town_gather", h4.id, h4.x, h4.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("its last hole of these hours is dug", did?.ok === true && (await used(U.m2)) === most, { did: did?.got ?? did, used: await used(U.m2) });
  const before = { left: await stamina(U.m2), n: await bagN(U.m2, h5.item) };
  did = await call(U.m2, "town_gather", h5.id, h5.x, h5.y, { misses: 0, wrong: 0, with: "famPiglet" });
  t.check("past its count it is refused, and nothing is spent, kept or taken", did?.ok === false && did.why === "spent" && (await stamina(U.m2)) === before.left && (await bagN(U.m2, h5.item)) === before.n && (await used(U.m2)) === most
    && (await one(`select count(*)::int as n from public.town_takes where what = 'spot' and place = $1 and member_id = $2`, [h5.id, U.m2])).n === 0, did);
  await patch(U.m2, { hand: "hoe" });
  did = await call(U.m2, "town_gather", h5.id, h5.x, h5.y, { misses: 0, wrong: 0 });
  t.check("…and digging is as for anybody then: with the hoe, what the mound has", did?.ok === true && did.got?.[0]?.[1] === h5.n, { got: did?.got ?? did, has: h5.n });
  // (a count of other hours is no count)
  await give(U.m2, { had: ["famPiglet"], familiar: "famPiglet", used: { famPiglet: { k: k - 1, n: most } } });
  const digs = await one(`select town.piglet_digs((select doc from public.town_purses where member_id = $1), town.now_ms()) as ok`, [U.m2]);
  t.check("a count of the hours before is no count of these", digs.ok === true, digs);
  // nothing here gives coins
  const coins = await one(`select coalesce(sum(coins), 0)::int as c from public.town_deeds where what = 'gather'`);
  t.check("no gathering gave a coin", coins.c === 0, coins);
}
