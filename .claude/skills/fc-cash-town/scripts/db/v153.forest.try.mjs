// The forest's gifts through the functions a member calls, against the stand-in database (try-line.mjs plays this
// after the rule cases): for each new or changed deed, that it is done, that it is refused for each reason, what is
// kept in the purse, what is written down, what is counted, and that somebody without the gift is as before.
export default async function ({ t, U, call, purseOf, deeds, one, same, give, patch, CODE }) {
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
  // ── the firefly lantern, and the secret places ──
  t.section("the firefly lantern: what lies buried, and the secret places of the deep woods, for its wearer alone");
  const S = F.secret, first = F.spots.length, cost = S.kinds.ring.cost;
  t.check("the catalog has six secret places, numbered on from the places everybody has", S.spots.length === 6 && (await one(`select town.wild_secret(town.cat('forest'), $1::int) as a, town.wild_secret(town.cat('forest'), $2::int) as b`, [first, first - 1])).a === true, S.spots.length);
  // (a word under which at least four secret places hold something now, a ring and a bough among them: the stand-in's own may have none this hour)
  let hid = [];
  for (let i = 0; i < 400 && !(hid.length >= 4 && hid.some((p) => p.kind === "ring") && hid.some((p) => p.kind === "bough")); i++) {
    await t.sql(`update public.town_secrets set word = $1 where key = 'wild'`, [`lantern-${i}`]);
    hid = (await t.sql(`select i, town.wild_holds(i, town.now_ms()) as has from generate_series($1::int, $2::int) as i`, [first, first + S.spots.length - 1])).rows
      .filter((r) => r.has).map((r) => ({ id: r.i, kind: S.spots[r.i - first][0], x: S.spots[r.i - first][1], y: S.spots[r.i - first][2], ...r.has }));
  }
  t.check("four secret places hold something now", hid.length >= 4, hid.length);
  const [s1, s2, s3, s4] = [hid.find((p) => p.kind === "ring"), hid.find((p) => p.kind === "bough"), ...hid.filter((p) => p !== hid.find((q) => q.kind === "ring") && p !== hid.find((q) => q.kind === "bough"))];
  const everybody = await holding();
  await give(U.m1, {}); await patch(U.m1, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 100 }, forest: null });
  await give(U.m2, { had: ["charmFirefly"], charms: ["charmFirefly"] }); await patch(U.m2, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 100 }, forest: null });
  const told = async (who) => (await call(who, "town_wild")).wild;
  /** The places everybody has that still have something for a member: not taken from by them this turn, a share left. */
  const stillFor = async (who) => { const out = []; for (const p of everybody) { const tk = (await one(`select town.taken('spot', $1::int, $2::bigint, $3) as t`, [p.id, p.turn, who])).t; if (!tk.mine && tk.n < F.kinds[p.kind].shares) out.push(p); } return out; };
  // what each is told
  let plain = await told(U.m1), seen = await told(U.m2);
  const forM1 = await stillFor(U.m1), forM2 = await stillFor(U.m2);
  t.check("without the lantern nobody is told of a secret place: only of the places everybody has", plain.every((r) => r[0] < first) && same(plain.map((r) => r[0]), forM1.map((p) => p.id)), { n: plain.length, all: forM1.length });
  t.check("…nor what lies buried", plain.filter((r) => F.kinds[F.spots[r[0]][0]].how === "dig").every((r) => r[1] === null) && plain.some((r) => r[1] === null));
  t.check("its wearer is told every secret place that holds something, with what and how many", same(seen.filter((r) => r[0] >= first).map((r) => [r[0], r[1], r[2]]), hid.map((p) => [p.id, p.item, p.n])), { seen: seen.filter((r) => r[0] >= first), hid });
  t.check("…and what lies under every mound", seen.every((r) => r[1] !== null) && forM2.some((p) => p.how === "dig") && forM2.filter((p) => p.how === "dig").every((p) => seen.find((r) => r[0] === p.id)?.[1] === p.item));
  t.check("…and of the places everybody has, the same as anybody is", same(seen.filter((r) => r[0] < first).map((r) => r[0]), forM2.map((p) => p.id)));
  const near = (p) => (p.kind === "bough" ? [p.x + 1, p.y] : [p.x, p.y]);
  const takes = async (who, id) => (await one(`select count(*)::int as n from public.town_takes where what = 'spot' and place = $1 and member_id = $2`, [id, who])).n;
  const pointsOf = async (who) => Number((await one(`select coalesce((kept->>'points')::numeric, 0) as p from public.town_work where member_id = $1 and line = 'forest'`, [who]))?.p ?? 0);
  // without the lantern: nothing is there
  did = await call(U.m1, "town_gather", s1.id, ...near(s1), { misses: 0, wrong: 0 });
  t.check("without the lantern a secret place gives nothing: it is not there", did?.ok === false && did.why === "none" && (await takes(U.m1, s1.id)) === 0 && (await stamina(U.m1)) === 100 && (await bagN(U.m1, s1.item)) === 0, did);
  await give(U.m1, { had: ["charmFirefly"], charms: [] });
  did = await call(U.m1, "town_gather", s1.id, ...near(s1), { misses: 0, wrong: 0 });
  t.check("…nor to somebody who has the lantern and does not wear it", did?.ok === false && did.why === "none", did);
  // both games won
  const p0 = await pointsOf(U.m2);
  did = await call(U.m2, "town_gather", s1.id, s1.x + 2, s1.y, { misses: 0, wrong: 0 });
  t.check("too far from it, nothing: and nothing is spent or taken", did?.ok === false && did.why === "far" && (await stamina(U.m2)) === 100 && (await takes(U.m2, s1.id)) === 0, did);
  did = await call(U.m2, "town_gather", s1.id, ...near(s1), { misses: 0, wrong: 0, secs: 31 });
  t.check("both its games won, a secret place gives all it has", did?.ok === true && !did.lost && same(did.got, [[s1.item, s1.n]]) && (await bagN(U.m2, s1.item)) === s1.n, did?.got ?? did);
  t.check("…for its stamina, and it is in the record of the secret places gathered from", (await stamina(U.m2)) === 100 - cost && same((await purseOf(U.m2)).forest, { secrets: [s1.id] }) && same(did.purse.forest, { secrets: [s1.id] }), (await purseOf(U.m2)).forest);
  deed = await lastDeed("gather");
  t.check("…written down as a gathering at a secret place, with no coin", deed?.member_id === U.m2 && deed.thing === s1.item && deed.n === s1.n && deed.doc.secret === true && deed.doc.how === S.kinds[s1.kind].how && deed.doc.kind === s1.kind && deed.coins === 0 && !("by" in deed.doc), deed);
  t.check("…and it counts on the forest's line as a gathering does", (await pointsOf(U.m2)) > p0, { before: p0, after: await pointsOf(U.m2) });
  did = await call(U.m2, "town_gather", s1.id, ...near(s1), { misses: 0, wrong: 0 });
  t.check("…once a turn: it has nothing more for me", did?.ok === false && did.why === "had" && (await takes(U.m2, s1.id)) === 1, did);
  t.check("…and I am no longer told of it", !(await told(U.m2)).some((r) => r[0] === s1.id));
  // a game failed
  const p1 = await pointsOf(U.m2), slips = (await deeds("slip")).length, gathers = (await deeds("gather")).length;
  did = await call(U.m2, "town_gather", s2.id, ...near(s2), { misses: 1, wrong: 0, secs: 12 });
  t.check("a game failed, the turn there is spent with nothing got", did?.ok === true && did.lost === true && same(did.got, []) && (await bagN(U.m2, s2.item)) === (s2.item === s1.item ? s1.n : 0) && (await takes(U.m2, s2.id)) === 1, did?.got ?? did);
  t.check("…for its stamina, and the record is as it was", (await stamina(U.m2)) === 100 - 2 * cost && same((await purseOf(U.m2)).forest, { secrets: [s1.id] }), { left: await stamina(U.m2), forest: (await purseOf(U.m2)).forest });
  deed = await lastDeed("slip");
  t.check("…written down as a slip and not as a gathering, and no point of the line counted", (await deeds("slip")).length === slips + 1 && (await deeds("gather")).length === gathers && deed?.member_id === U.m2 && deed.thing === s2.item && deed.n === 0
    && deed.coins === 0 && deed.doc.misses === 1 && deed.doc.left === false && (await pointsOf(U.m2)) === p1, deed);
  did = await call(U.m2, "town_gather", s2.id, ...near(s2), { misses: 0, wrong: 0 });
  t.check("…and there is no second go at it this turn", did?.ok === false && did.why === "had", did);
  // a wrong one taken; and the games left
  did = await call(U.m2, "town_gather", s3.id, ...near(s3), { misses: 0, wrong: 1 });
  t.check("a look-alike taken loses it too", did?.ok === true && did.lost === true && (await takes(U.m2, s3.id)) === 1, did?.got ?? did);
  did = await call(U.m2, "town_gather", s4.id, ...near(s4), { misses: 0, wrong: 0, lost: true });
  deed = await lastDeed("slip");
  t.check("its games left once begun, it is lost as well, and written down as left", did?.ok === true && did.lost === true && deed?.doc.left === true && deed.doc.spot === s4.id && (await takes(U.m2, s4.id)) === 1, { did: did?.got ?? did, deed });
  // somebody else, the same turn: a heap is for several
  await give(U.admin, { had: ["charmFirefly"], charms: ["charmFirefly"] }); await patch(U.admin, { bag: Array(10).fill({ item: "rod", n: 1 }), hand: null, stamina: { day, left: 100 } });
  did = await call(U.admin, "town_gather", s2.id, ...near(s2), { misses: 0, wrong: 0 });
  t.check("won with no room in the bag, nothing is given, spent or taken: one comes back", did?.ok === false && did.why === "full" && (await takes(U.admin, s2.id)) === 0 && (await stamina(U.admin)) === 100, did);
  await patch(U.admin, { bag: Array(10).fill(null) });
  did = await call(U.admin, "town_gather", s2.id, ...near(s2), { misses: 0, wrong: 0 });
  t.check("what one lost another may still win, the same turn", did?.ok === true && !did.lost && same(did.got, [[s2.item, s2.n]]), did?.got ?? did);
  for (const who of [U.m1, U.guest]) if ((await takes(who, s2.id)) === 0) await t.sql(`insert into public.town_takes (what, place, turn, member_id, at) values ('spot', $1, $2, $3, now())`, [s2.id, s2.turn, who]);
  await give(U.unver, { had: ["charmFirefly"], charms: ["charmFirefly"] });
  const bare = await one(`select town.gather((select doc || jsonb_build_object('coins', coins) from public.town_purses where member_id = $1), $2::int, $3::jsonb, (town.taken('spot', $2::int, $4::bigint, $1)->>'n')::int, false, null, $5::int, $6::int, 0, 0, town.now_ms()) as r`,
    [U.unver, s2.id, JSON.stringify({ turn: s2.turn, item: s2.item, n: s2.n }), s2.turn, ...near(s2)]);
  t.check("…until its shares are gone", bare.r?.ok === false && bare.r.why === "bare", bare.r);
  // ── a sprite's treasure map ──
  t.section("a sprite's treasure map: a hunt for a chest, three a day, found by digging hot and cold");
  const H = F.hunt;
  t.check("the catalog has the dig sites, the ring, the warmths and what a chest may hold", H.sites.length === 180 && H.radius > H.off && H.bands.length === 5 && H.rares.length === 3 && H.scrolls.length > 20, { sites: H.sites.length });
  const coinsOf = async (who) => (await one(`select coins from public.town_purses where member_id = $1`, [who])).coins;
  const huntKept = async (who) => (await purseOf(who)).forest?.hunt ?? null;
  const siteOf = async (who) => (await one(`select town.hunt_site(town.word(), ($1::uuid)::text, town.hunt_of((select doc from public.town_purses where member_id = $1::uuid), town.now_ms())) as s`, [who])).s;
  await give(U.m1, {}); await patch(U.m1, { bag: Array(10).fill(null), hand: null, forest: null });
  await give(U.m2, { had: ["thingMap"] }); await patch(U.m2, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 50 }, forest: { secrets: [first] } });
  // without the thing
  did = await call(U.m1, "town_map_use");
  t.check("without the map there is nothing to use", did?.ok === false && did.why === "none" && did.hunt === null, did);
  did = await call(U.m1, "town_map_dig", 200, 150);
  t.check("…and nothing to dig for", did?.ok === false && did.why === "none", did);
  // a map used
  const c0 = await coinsOf(U.m2), uses0 = (await deeds("map_use")).length;
  did = await call(U.m2, "town_map_use");
  t.check("a map used: a hunt begins, two maps are left today", did?.ok === true && did.left === 2 && did.hunt?.n === 1 && did.hunt.digs === 0 && did.hunt.area?.r === H.radius, did?.hunt ?? did);
  const area = did.hunt.area, kept = await huntKept(U.m2);
  t.check("…kept in the purse beside what else the forest keeps there, and counted against the day", kept?.n === 1 && kept.digs === 0 && same((await purseOf(U.m2)).forest.secrets, [first]) && (await purseOf(U.m2)).gifts.used.thingMap.n === 1, (await purseOf(U.m2)).forest);
  deed = await lastDeed("map_use");
  t.check("…and written down", (await deeds("map_use")).length === uses0 + 1 && deed?.member_id === U.m2 && deed.thing === "thingMap" && deed.doc.map === 1 && deed.doc.left === 2 && deed.coins === 0, deed);
  t.check("…the purse it is told has no tile in it: only the day, the map and the digs", same(Object.keys(did.purse.forest.hunt).sort(), ["digs", "k", "n"]), did.purse.forest);
  did = await call(U.m2, "town_map_use");
  t.check("with a hunt on, another map is refused and not used up", did?.ok === false && did.why === "had" && (await purseOf(U.m2)).gifts.used.thingMap.n === 1 && did.hunt?.n === 1, did);
  const site = await siteOf(U.m2);
  t.check("the chest is at a dig site inside the map's ring, and its middle is not told as the chest", H.sites.some((s) => s[0] === site[0] && s[1] === site[1]) && Math.abs(site[0] - area.x) <= H.off && Math.abs(site[1] - area.y) <= H.off, { site, area });
  t.check("…and somebody else's first map of the day leads elsewhere", !same((await one(`select town.hunt_site(town.word(), ($1::uuid)::text, $2::jsonb) as s`, [U.m1, JSON.stringify(kept)])).s, site));
  t.check("the forest tells its owner the hunt, and nobody else", same((await call(U.m2, "town_wild")).hunt, { n: 1, digs: 0, area }) && (await call(U.m1, "town_wild")).hunt === null);
  // digs that miss
  const bag0 = JSON.stringify((await purseOf(U.m2)).bag), st = await stamina(U.m2), digs0 = (await deeds("map_dig")).length;
  did = await call(U.m2, "town_map_dig", site[0] + 40, site[1]);
  t.check("a dig far off: cold, and counted", did?.ok === true && did.found === false && did.warm === 5 && did.digs === 1 && same(did.got, []) && did.hunt?.digs === 1, did?.hunt ?? did);
  did = await call(U.m2, "town_map_dig", site[0] + 1, site[1] - 1);
  t.check("a dig beside it: as warm as it gets without the chest", did?.ok === true && did.found === false && did.warm === 1 && did.digs === 2 && (await huntKept(U.m2)).digs === 2, did);
  deed = await lastDeed("map_dig");
  t.check("…each written down with how warm it was, for no stamina and nothing out of the bag", (await deeds("map_dig")).length === digs0 + 2 && deed?.doc.warm === 1 && deed.doc.digs === 2 && deed.coins === 0 && deed.n === 0
    && JSON.stringify((await purseOf(U.m2)).bag) === bag0 && (await stamina(U.m2)) === st, deed);
  did = await call(U.m2, "town_map_dig", null, site[1]);
  t.check("a dig from nowhere is nothing", did?.ok === false && did.why === "none" && (await huntKept(U.m2)).digs === 2, did);
  // the chest
  await patch(U.m2, { bag: Array(10).fill({ item: "rod", n: 1 }) });
  did = await call(U.m2, "town_map_dig", site[0], site[1]);
  t.check("on the chest with no room in the bag: it waits, and nothing is lost or counted", did?.ok === false && did.why === "full" && (await huntKept(U.m2)).digs === 2 && did.hunt?.n === 1, did);
  await patch(U.m2, { bag: Array(10).fill(null) });
  const chests0 = (await deeds("chest")).length;
  did = await call(U.m2, "town_map_dig", site[0], site[1]);
  const got = did?.got?.[0];
  t.check("on the chest: it is up, and what it holds is in the bag", did?.ok === true && did.found === true && did.warm === 0 && did.digs === 3 && !!got && (await bagN(U.m2, got[0])) === got[1], did?.got ?? did);
  t.check("…a rare thing of the forest whose day it is, or a scroll that is only found", !!got && (H.rares.some((r) => r[0] === got[0]) || H.scrolls.includes(got[0])) && (H.scrolls.includes(got[0]) ? got[1] === 1 : got[1] <= 2), got);
  t.check("…the hunt is over, it is one more chest found, and the rest of what the forest keeps is as it was", (await huntKept(U.m2)) === null && did.hunt === null && (await purseOf(U.m2)).forest.chests === 1 && same((await purseOf(U.m2)).forest.secrets, [first]), (await purseOf(U.m2)).forest);
  deed = await lastDeed("chest");
  t.check("…written down with the thing, how many, and the digs it took; no coin, anywhere in it", (await deeds("chest")).length === chests0 + 1 && deed?.member_id === U.m2 && deed.thing === got[0] && deed.n === got[1] && deed.doc.digs === 3 && deed.doc.map === 1 && deed.coins === 0
    && (await coinsOf(U.m2)) === c0, { deed, coins: await coinsOf(U.m2), c0 });
  did = await call(U.m2, "town_map_dig", site[0], site[1]);
  t.check("the same tile again is nothing: there is no hunt on", did?.ok === false && did.why === "none", did);
  // the day's other maps, and no fourth
  did = await call(U.m2, "town_map_use");
  const second = await siteOf(U.m2);
  t.check("the second map of the day is another hunt", did?.ok === true && did.left === 1 && did.hunt?.n === 2 && did.hunt.digs === 0, did?.hunt ?? did);
  await call(U.m2, "town_map_dig", second[0], second[1]);
  did = await call(U.m2, "town_map_use");
  const third = await siteOf(U.m2);
  t.check("…and the third", did?.ok === true && did.left === 0 && did.hunt?.n === 3 && (await purseOf(U.m2)).forest.chests === 2, did?.hunt ?? did);
  await call(U.m2, "town_map_dig", third[0], third[1]);
  did = await call(U.m2, "town_map_use");
  t.check("a fourth there is not, today", did?.ok === false && did.why === "spent" && (await purseOf(U.m2)).forest.chests === 3 && (await huntKept(U.m2)) === null, did);
  t.check("three chests, three things, never a coin", (await coinsOf(U.m2)) === c0 && (await deeds("chest")).length === chests0 + 3);
  // a hunt of yesterday is gone with its day
  await patch(U.m2, { forest: { hunt: { k: kept.k - 1, n: 1, digs: 5 }, chests: 3 } });
  did = await call(U.m2, "town_map_dig", site[0], site[1]);
  t.check("a hunt of another day is no hunt", did?.ok === false && did.why === "none" && (await call(U.m2, "town_wild")).hunt === null, did);
  // ── the moss stag ──
  t.section("the moss stag: from its back whatever is within two tiles is gathered");
  const fresh = await holding();
  const free = async (who, p) => { const tk = (await one(`select town.taken('spot', $1::int, $2::bigint, $3) as t`, [p.id, p.turn, who])).t; return !tk.mine && tk.n < F.kinds[p.kind].shares; };
  const pickFor = async (who, how, skip = []) => { for (const p of fresh) if (p.how === how && !skip.includes(p.id) && (await free(who, p))) return p; return null; };
  await give(U.m1, {}); await patch(U.m1, { bag: Array(10).fill(null), hand: null, stamina: { day, left: 100 }, forest: null });
  await give(U.m2, { had: ["famStag"], familiar: "famStag" }); await patch(U.m2, { bag: [{ item: "hoe", n: 1 }, ...Array(9).fill(null)], hand: "hoe", stamina: { day, left: 100 }, forest: null });
  const grows = await pickFor(U.m2, "choose"), tree = await pickFor(U.m2, "shake"), buried = await pickFor(U.m2, "dig"), lies = await pickFor(U.m2, "pick"), other = await pickFor(U.m2, "choose", [grows.id]);
  did = await call(U.m1, "town_gather", grows.id, grows.x + 2, grows.y - 2, { misses: 0, wrong: 0 });
  t.check("on foot, two tiles off is too far", did?.ok === false && did.why === "far", did);
  did = await call(U.m2, "town_gather", grows.id, grows.x + 2, grows.y - 2, { misses: 0, wrong: 0 });
  t.check("from a stag's back what grows two tiles off is gathered", did?.ok === true && did.got?.[0]?.[0] === grows.item && did.got[0][1] === grows.n, did?.got ?? did);
  t.check("…for the stamina it costs, as on foot", (await stamina(U.m2)) === 100 - F.kinds[grows.kind].cost, await stamina(U.m2));
  deed = await lastDeed("gather");
  t.check("…written down as a gathering like any other, from the tile it was done from", deed?.member_id === U.m2 && deed.thing === grows.item && same(deed.doc.tile, [grows.x + 2, grows.y - 2]) && !("by" in deed.doc), deed);
  for (const [p, name] of [[tree, "what hangs"], [buried, "what is buried (with a hoe in the hand)"], [lies, "what lies about"]]) {
    did = await call(U.m2, "town_gather", p.id, p.x - 2, p.y + 1, { misses: 0, wrong: 0 });
    t.check(`…and ${name}`, did?.ok === true && did.got?.[0]?.[0] === p.item, did?.got ?? did);
  }
  did = await call(U.m2, "town_gather", other.id, other.x + 3, other.y, { misses: 0, wrong: 0 });
  t.check("three tiles off is too far from its back too", did?.ok === false && did.why === "far", did);
  await give(U.m2, { had: ["famStag"], familiar: null });
  did = await call(U.m2, "town_gather", other.id, other.x + 2, other.y, { misses: 0, wrong: 0 });
  t.check("a stag at rest carries nobody: two tiles off is too far again", did?.ok === false && did.why === "far", did);
  await give(U.m2, { had: ["famStag", "famPiglet"], familiar: "famPiglet" });
  did = await call(U.m2, "town_gather", other.id, other.x + 2, other.y, { misses: 0, wrong: 0 });
  t.check("…and with another familiar at the heels", did?.ok === false && did.why === "far", did);
  // nothing here gives coins
  const coins = await one(`select coalesce(sum(coins), 0)::int as c from public.town_deeds where what in ('gather', 'slip', 'map_use', 'map_dig', 'chest')`);
  t.check("no deed of the forest's gifts gave a coin", coins.c === 0, coins);
}
