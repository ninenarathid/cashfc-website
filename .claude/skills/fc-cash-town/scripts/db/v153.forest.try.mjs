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
}
