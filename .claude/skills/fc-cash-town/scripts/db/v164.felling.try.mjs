// Scenes of woodcutting through the functions a member calls (try-v164.mjs plays them on the stand-in database, after
// v164.felling.sql). The stand-in's clock is the machine's; the chance is the database's own, so what hangs on it is
// asked only where it cannot turn up (a plain axe has none).
export default async function ({ t, U, one, call, give, patch, purseOf, deeds, rank, CODE }) {
  const K = CODE.trees, wood = K.wood, pines = wood.filter((w) => w[3] === 1 && w[0] !== K.elder.id), elder = wood.find((w) => w[0] === K.elder.id);
  const apart = (a, b) => Math.max(Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
  /** Pines with no other tree near, to work at one after another; and one with two others close. */
  const lone = pines.filter((p) => !wood.some((o) => o[0] !== p[0] && apart(o, p) <= 3));
  const far = pines.filter((p) => !pines.some((o) => o[0] !== p[0] && apart(o, p) <= K.echo.reach));
  const trio = pines.find((p) => pines.filter((o) => o[0] !== p[0] && apart(o, p) <= K.echo.reach).length >= 2);
  const upper = wood.find((w) => w[3] === 2);
  const beside = (w) => [w[1] - 1, w[2]];
  const bag = (...stacks) => [...stacks, ...Array(10 - stacks.length).fill(null)];
  const axe = (more = {}) => ({ item: "axe", n: 1, ...more });
  const count = (purse, id) => (purse.bag ?? []).reduce((n, s) => n + (s && s.item === id ? s.n : 0), 0);
  const mine = async (what, who) => (await deeds(what)).filter((d) => d.member_id === who);
  const now = async () => Number((await one(`select town.now_ms() as n`)).n);
  const day = async () => Number((await one(`select town.day_of(town.now_ms()) as d`)).d);
  const fresh = async (who, stack = axe(), more = {}) => patch(who, { bag: bag(stack), hand: "axe", handAt: 0, stamina: { day: await day(), left: 100 }, powers: {}, felling: {}, ...more });
  const went = (ids, more = {}) => ({ tree: ids[0], trees: ids.map((id) => ({ id, felled: true, misses: 0 })), secs: 8 * ids.length, ...more });
  /** Pines to work at, each once: none of the three that stand close (the echo's own scene). */
  const close = [trio, ...pines.filter((o) => o[0] !== trio[0] && apart(o, trio) <= K.echo.reach)].map((w) => w[0]);
  const pool = [...far, ...pines.filter((w) => !far.includes(w) && !close.includes(w[0]))];
  let next = 0;
  const tree = () => { if (next >= pool.length) throw new Error("the scenes have used every pine"); return pool[next++]; };

  t.section("the ground the scenes stand on");
  t.check("the catalog has the mountain's trees: a hundred and twenty and the ancient one", wood.length === 121 && pines.length === 60 && !!elder && elder[4] === 3, { n: wood.length, pines: pines.length, elder });
  t.check("…and pines that stand apart, and one with two others close", far.length >= 6 && pool.length >= 40 && !!trio && !!upper, { far: far.length, lone: lone.length, pool: pool.length });
  t.check("the lines' row has the woodcutters' line, and the gifts' row its three gifts", CODE.work.ids.includes("felling") && CODE.work.felling.pine === 2 && CODE.work.felling.elder === 10
    && ["charmEchoAxe", "famWoodpecker", "thingBundle"].every((id) => CODE.gifts.gifts[id]?.line === "felling"), CODE.work.felling);
  const kept = await one(`select pg_get_constraintdef(c.oid) as def from pg_constraint c where c.conrelid = 'public.town_plays'::regclass and c.conname = 'town_plays_game_check'`);
  t.check("a go at felling can be written down, and every game that could be still can", ["fishing", "farming", "cooking", "washing", "felling"].every((g) => kept.def.includes(`'${g}'`)), kept);

  t.section("who may ask");
  let did = await call(U.m1, "town_trees");
  t.check("a member is told the trees: every one is grown", did?.trees?.down?.length === 0 && did.trees.half.length === 0 && typeof did.now === "number", did);
  // (a proved character that is not of the FC plays the town's game as any proved character does: the town's own rule, not this part's)
  for (const who of ["unver", "nochar"]) {
    const no = await call(U[who], "town_trees"), cut = await call(U[who], "town_fell", went([pines[0][0]]), 0, 0);
    t.check(`${who}: told nothing, and fells nothing`, !!no?.error && !!cut?.error, { no, cut });
  }
  t.check("…and nothing was written for them", Number((await one(`select count(*)::int as n from public.town_trees`)).n) === 0);

  t.section("walking up to a tree");
  const a = tree(), at = beside(a);
  await patch(U.m1, { bag: bag({ item: "hoe", n: 1 }), hand: "hoe", stamina: { day: await day(), left: 100 } });
  did = await call(U.m1, "town_fell_begin", a[0], at[0], at[1]);
  t.check("with no axe in the hand: refused, as the tool it wants", did?.ok === false && did.why === "tool", did);
  await fresh(U.m1);
  did = await call(U.m1, "town_fell_begin", a[0], at[0], at[1]);
  t.check("with a plain axe at a pine: a game of twelve chops for that tree, branches seen three up, the plain pace", did?.ok === true && same(did.group, [a[0]]) && did.elder === false
    && did.ask.trees.length === 1 && did.ask.trees[0].id === a[0] && did.ask.trees[0].chops === 12 && Number.isInteger(did.ask.trees[0].seed) && did.ask.ahead === 3 && did.ask.pace === 1 && did.ask.spared === 0 && did.ask.spent === false, did);
  const again = await call(U.m1, "town_fell_begin", a[0], at[0], at[1]);
  t.check("the trunk's seed is drawn afresh each time, here", again?.ok === true && again.ask.trees[0].seed !== did.ask.trees[0].seed, again?.ask);
  t.check("too far: refused", (await call(U.m1, "town_fell_begin", a[0], at[0] - 3, at[1])).why === "far");
  t.check("no such tree: refused", (await call(U.m1, "town_fell_begin", 9999, at[0], at[1])).why === "none");
  did = await call(U.m1, "town_fell_begin", upper[0], upper[1] - 1, upper[2]);
  t.check("a tree of the upper terrace: this axe will not bite", did?.ok === false && did.why === "bite", did);
  did = await call(U.m1, "town_fell_begin", elder[0], elder[1] - 1, elder[2] + 1);
  t.check("the ancient tree, to an axe under the top: refused by its own word", did?.ok === false && did.why === "plus", did);
  await patch(U.m1, { stamina: { day: await day(), left: 0 } });
  did = await call(U.m1, "town_fell_begin", a[0], at[0], at[1]);
  t.check("with no stamina the game is said to be the tired one, and is not refused", did?.ok === true && did.ask.spent === true, did?.ask);
  await patch(U.m1, { bag: [axe(), ...Array(9).fill({ item: "stone", n: 50 })], stamina: { day: await day(), left: 100 } });
  did = await call(U.m1, "town_fell_begin", a[0], at[0], at[1]);
  t.check("a bag with no room for the wood: refused before the axe is swung", did?.ok === false && did.why === "full", did);
  t.check("nothing of all that was written down or kept", (await mine("fell", U.m1)).length === 0 && Number((await one(`select count(*)::int as n from public.town_trees`)).n) === 0);

  t.section("a tree felled");
  await fresh(U.m1);
  const t0 = await now();
  did = await call(U.m1, "town_fell", went([a[0]]), at[0], at[1]);
  t.check("felled clean: two logs and two fine timber, told with the purse and the trees", did?.ok === true && same(did.got, [["log", 2], ["timber", 2]]) && did.felled.length === 1 && did.felled[0].id === a[0] && did.felled[0].kind === "pine"
    && did.one === false && count(did.purse, "log") === 2 && count(did.purse, "timber") === 2 && did.trees.down.length === 1 && did.trees.down[0].id === a[0] && !("grove" in did), did);
  let p = await purseOf(U.m1);
  t.check("the wood is in the kept purse, and it cost two stamina", count(p, "log") === 2 && count(p, "timber") === 2 && p.stamina.left === 98, p.stamina);
  let row = await one(`select tree, felled_at::text as at, member_id, half from public.town_trees where tree = $1`, [a[0]]);
  t.check("the tree is kept as felled, by whom and when", row?.member_id === U.m1 && Number(row.at) >= t0 && row.half === false, row);
  let noted = await mine("fell", U.m1);
  t.check("the deed is written down: the tree's kind, its number, the tile, the misses, what it gave", noted.length === 1 && noted[0].thing === "pine" && noted[0].n === 1 && noted[0].doc.tree === a[0] && noted[0].doc.misses === 0
    && same(noted[0].doc.tile, at) && same(noted[0].doc.got, [["log", 2], ["timber", 2]]) && noted[0].doc.spent === false && noted[0].doc.plus === 0, noted);
  let play = await one(`select game, won, secs, spent, doc from public.town_plays where member_id = $1 order by id desc limit 1`, [U.m1]);
  t.check("the go is written down as a game: felling, won, the chops it wanted and made", play?.game === "felling" && play.won === true && play.spent === false && play.doc.what === "pine" && play.doc.need === 12 && play.doc.hits === 12 && play.doc.misses === 0, play);
  let line = (await call(U.m1, "town_work"))?.lines?.felling;
  t.check("two points on the woodcutters' line, and ten for the first pine", line?.points === 12 && line.today === 12, line);
  t.check("the deed has its Thai word", (await one(`select town.deed_th('fell') as a, town.deed_th('root') as b, town.deed_th('net') as c`)).a === "ตัดต้นไม้");

  t.section("the stump is everybody's");
  did = await call(U.m2, "town_trees");
  t.check("another member is told the stump, with when it is grown again", did?.trees?.down?.length === 1 && did.trees.down[0].id === a[0] && did.trees.down[0].until === did.trees.down[0].at + K.regrow * 60000, did?.trees);
  await fresh(U.m2);
  did = await call(U.m2, "town_fell_begin", a[0], at[0], at[1]);
  t.check("nobody begins at a stump", did?.ok === false && did.why === "stump", did);
  did = await call(U.m2, "town_fell", went([a[0]]), at[0], at[1]);
  t.check("nor fells one: told as the stump it is, with nothing got and nothing spent", did?.ok === false && did.why === "stump" && count(await purseOf(U.m2), "log") === 0 && (await purseOf(U.m2)).stamina.left === 100, did);
  // forty minutes on (the tree's row put back by that much)
  await t.sql(`update public.town_trees set felled_at = felled_at - $2::bigint where tree = $1`, [a[0], K.regrow * 60000]);
  did = await call(U.m2, "town_trees");
  t.check("forty minutes on it is told to nobody: grown", did?.trees?.down?.length === 0, did?.trees);
  did = await call(U.m2, "town_fell", went([a[0]], { trees: [{ id: a[0], felled: true, misses: 2 }] }), at[0], at[1]);
  t.check("and is felled again, by the other: with two misses, one fine timber", did?.ok === true && same(did.got, [["log", 2], ["timber", 1]]) && did.felled[0].misses === 2, did);
  row = await one(`select member_id from public.town_trees where tree = $1`, [a[0]]);
  t.check("it is the other's stump now", row?.member_id === U.m2, row);

  t.section("a go that is no go, and a go that felled nothing");
  const b = tree(), bt = beside(b);
  await fresh(U.m1);
  did = await call(U.m1, "town_fell", went([b[0]], { secs: 0.3 }), bt[0], bt[1]);
  t.check("twelve chops in a third of a second were not chopped: refused, nothing felled", did?.ok === false && did.why === "none" && Number((await one(`select count(*)::int as n from public.town_trees where tree = $1`, [b[0]])).n) === 0, did);
  did = await call(U.m1, "town_fell", went([b[0]], { trees: [{ id: b[0], felled: true, misses: 0 }, { id: b[0], felled: true, misses: 0 }] }), bt[0], bt[1]);
  t.check("the same tree named twice: refused", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_fell", { tree: "x" }, bt[0], bt[1]);
  t.check("a go with no tree to it: refused", did?.ok === false && did.why === "none", did);
  const plays0 = Number((await one(`select count(*)::int as n from public.town_plays where member_id = $1 and game = 'felling'`, [U.m1])).n);
  did = await call(U.m1, "town_fell", { tree: b[0], trees: [{ id: b[0], felled: false, misses: 3 }], secs: 2.5 }, bt[0], bt[1]);
  p = await purseOf(U.m1);
  t.check("a go that lost the tree: answered, with nothing felled, nothing got, nothing spent", did?.ok === true && did.felled.length === 0 && did.got.length === 0 && count(p, "log") === 0 && p.stamina.left === 100
    && Number((await one(`select count(*)::int as n from public.town_trees where tree = $1`, [b[0]])).n) === 0, did);
  play = await one(`select won, doc from public.town_plays where member_id = $1 and game = 'felling' order by id desc limit 1`, [U.m1]);
  t.check("…and written down all the same, as a go that was lost", Number((await one(`select count(*)::int as n from public.town_plays where member_id = $1 and game = 'felling'`, [U.m1])).n) === plays0 + 1 && play.won === false && play.doc.hits === 0 && play.doc.misses === 3, play);
  t.check("…with no deed", (await mine("fell", U.m1)).length === 1);
  did = await call(U.m1, "town_fell", went([b[0], pool[pool.length - 1][0]]), bt[0], bt[1]);
  t.check("a tree that was no part of the game does not fall with it", did?.ok === true && did.felled.length === 1 && did.felled[0].id === b[0], did?.felled);
  await patch(U.m1, { stamina: { day: await day(), left: 0 } });
  const c0 = tree(), ct = beside(c0);
  did = await call(U.m1, "town_fell", went([c0[0]], { trees: [{ id: c0[0], felled: true, misses: 3 }] }), ct[0], ct[1]);
  t.check("with no stamina a tree felled costs nothing more and gives as it gives anybody: three misses, logs only", did?.ok === true && same(did.got, [["log", 2]]) && did.purse.stamina.left === 0, did);
  t.check("…and its deed says it was felled tired", (await mine("fell", U.m1)).at(-1)?.doc.spent === true);

  t.section("the echo axe (the line's first rank)");
  const group = [trio, ...pines.filter((o) => o[0] !== trio[0] && apart(o, trio) <= K.echo.reach).sort((x, y) => apart(x, trio) - apart(y, trio) || x[0] - y[0]).slice(0, 2)].map((w) => w[0]);
  const tt = beside(trio);
  await fresh(U.m1);
  did = await call(U.m1, "town_fell_begin", trio[0], tt[0], tt[1]);
  t.check("without it, a game is for one tree", did?.ok === true && same(did.group, [trio[0]]), did?.group);
  await give(U.m1, { had: ["charmEchoAxe"], charms: ["charmEchoAxe"] });
  did = await call(U.m1, "town_fell_begin", trio[0], tt[0], tt[1]);
  t.check("worn, one game is for three trees standing close, each with its own trunk", did?.ok === true && same(did.group, group) && did.ask.trees.length === 3 && new Set(did.ask.trees.map((x) => x.seed)).size === 3, did?.group);
  const deeds0 = (await mine("fell", U.m1)).length;
  did = await call(U.m1, "town_fell", { tree: trio[0], trees: [{ id: group[0], felled: true, misses: 0 }, { id: group[1], felled: false, misses: 1 }, { id: group[2], felled: true, misses: 3 }], secs: 14 }, tt[0], tt[1]);
  p = await purseOf(U.m1);
  t.check("two of the three fell: their wood, the stamina of two, and the third stands", did?.ok === true && same(did.felled.map((f) => f.id), [group[0], group[2]]) && same(did.got, [["log", 4], ["timber", 2]]) && p.stamina.left === 96
    && same(did.trees.down.map((d) => d.id).filter((id) => group.includes(id)).sort((x, y) => x - y), [group[0], group[2]].sort((x, y) => x - y)), did);
  t.check("a deed a tree felled", (await mine("fell", U.m1)).length === deeds0 + 2);
  play = await one(`select won, doc from public.town_plays where member_id = $1 and game = 'felling' order by id desc limit 1`, [U.m1]);
  t.check("and one go written down for the three", play?.won === true && play.doc.trees === 3 && play.doc.felled === 2 && play.doc.need === 36 && play.doc.hits === 24 && play.doc.misses === 4, play);
  await give(U.m1, { had: [] });

  t.section("the woodpecker (the second rank)");
  const d0 = tree(), dt = beside(d0);
  await give(U.m1, { had: ["famWoodpecker"], familiar: "famWoodpecker" });
  did = await call(U.m1, "town_fell_begin", d0[0], dt[0], dt[1]);
  t.check("following, one branch a tree is forgiven", did?.ok === true && did.ask.spared === 1, did?.ask);
  await give(U.m1, { had: ["famWoodpecker"], familiar: null });
  did = await call(U.m1, "town_fell_begin", d0[0], dt[0], dt[1]);
  t.check("at rest, none", did?.ok === true && did.ask.spared === 0, did?.ask);
  await give(U.m1, { had: [] });

  t.section("the line's gifts are given by the lines' own functions");
  did = await call(U.m1, "town_work");
  t.check("the lines' answer gives the three gifts, and tells the line", ["charmEchoAxe", "famWoodpecker", "thingBundle"].every((id) => did?.gives?.includes(id)) && typeof did.lines.felling?.points === "number", did?.gives);
  await rank(U.m2, "felling", 49);
  did = await call(U.m2, "town_gift_take", "felling", 1);
  t.check("under the first mark the first gift is not taken", did?.ok === false && did.why === "rank", did);
  await rank(U.m2, "felling", 50);
  did = await call(U.m2, "town_gift_take", "felling", 1);
  t.check("at fifty points it is: the echo axe", did?.ok === true && did.gift === "charmEchoAxe" && (await purseOf(U.m2)).gifts.had.includes("charmEchoAxe"), did);

  t.section("an axe forged");
  const e0 = tree(), et = beside(e0);
  for (const [stack, want, what] of [
    [axe({ plus: 4 }), { chops: 10, ahead: 3, pace: 0.9 }, "+4"], [axe({ plus: 10 }), { chops: 4, ahead: 5, pace: 0.5 }, "+10"],
    [axe({ plus: 3, opts: ["axKeen"] }), { chops: 9, ahead: 3, pace: 1 }, "an option awake"], [axe({ plus: 2, opts: ["axKeen"] }), { chops: 11, ahead: 3, pace: 1 }, "an option asleep"],
    [axe({ gems: ["fire"] }), { chops: 11, ahead: 3, pace: 1 }, "a gem of fire"], [axe({ gems: ["ice"] }), { chops: 12, ahead: 3, pace: 0.85 }, "a gem of ice"],
  ]) {
    await fresh(U.m1, stack);
    did = await call(U.m1, "town_fell_begin", e0[0], et[0], et[1]);
    t.check(`${what}: the game is made from the axe in the hand`, did?.ok === true && did.ask.trees[0].chops === want.chops && did.ask.ahead === want.ahead && Math.abs(did.ask.pace - want.pace) < 1e-9, did?.ask);
  }
  // of two axes in the bag, the one taken up is the one that works
  await patch(U.m1, { bag: bag(axe(), axe({ plus: 10 })), hand: "axe", handAt: 1 });
  did = await call(U.m1, "town_fell_begin", e0[0], et[0], et[1]);
  t.check("of two axes in the bag, the one taken up is the one that works", did?.ok === true && did.ask.trees[0].chops === 4, did?.ask);
  // a tree half cut
  await t.sql(`insert into public.town_trees (tree, half) values ($1, true) on conflict (tree) do update set half = true`, [e0[0]]);
  await fresh(U.m1);
  did = await call(U.m1, "town_fell_begin", e0[0], et[0], et[1]);
  t.check("a tree half cut takes half the chops, and everybody is told it is", did?.ok === true && did.ask.trees[0].chops === 6 && did.trees.half.includes(e0[0]), did);
  did = await call(U.m1, "town_fell", went([e0[0]], { secs: 3 }), et[0], et[1]);
  row = await one(`select half, felled_at is not null as down from public.town_trees where tree = $1`, [e0[0]]);
  t.check("felled, it is whole again when it is back", did?.ok === true && row?.half === false && row.down === true && !did.trees.half.includes(e0[0]), row);
  // a gem of earth: three trees for five stamina
  await fresh(U.m1, axe({ gems: ["earth"] }));
  for (let i = 0; i < 3; i++) { const w = tree(), wt = beside(w); did = await call(U.m1, "town_fell", went([w[0]]), wt[0], wt[1]); }
  p = await purseOf(U.m1);
  t.check("a gem of earth: three trees cost five stamina, what is left of a point owed on", did?.ok === true && p.stamina.left === 95 && p.felling.owed > 0 && p.felling.owed < 1, { stamina: p.stamina, felling: p.felling });

  t.section("the ancient tree");
  const el = [elder[1] - 1, elder[2] + 1];
  await fresh(U.m1, axe({ plus: 10 }));
  did = await call(U.m1, "town_fell_begin", elder[0], el[0], el[1]);
  t.check("to an axe at the top its game comes: longer than a pine's with the same axe, and by itself", did?.ok === true && did.elder === true && same(did.group, [elder[0]]) && did.ask.trees[0].chops === 8, did);
  did = await call(U.m1, "town_fell", went([elder[0]], { trees: [{ id: elder[0], felled: true, misses: 4 }] }), el[0], el[1]);
  t.check("felled: fifteen fine timber and three resin, whatever the misses", did?.ok === true && same(did.got, [["timber", 15], ["resin", 3]]) && did.felled[0].kind === "elder", did);
  t.check("its deed, and ten points and ten for the first", (await mine("fell", U.m1)).at(-1)?.thing === "elder" && (await call(U.m1, "town_work")).lines.felling.today >= 20);
  did = await call(U.m2, "town_trees");
  const told = did?.trees?.down?.find((d) => d.id === elder[0]);
  t.check("everybody is told it is down, and nobody when it is back", !!told && !("until" in told), told);
  await patch(U.m2, { bag: bag(axe({ plus: 10, opts: ["", "", "axElder"] })), hand: "axe", handAt: 0 });
  did = await call(U.m2, "town_trees");
  const known = did?.trees?.down?.find((d) => d.id === elder[0]);
  const dawn = Number((await one(`select town.tree_until(true, $1::bigint)::text as u`, [known?.at ?? 0])).u);
  t.check("but for whoever holds an axe that knows: at the next dawn", !!known && known.until === dawn && dawn > known.at && dawn - known.at <= 24 * 3600000, known);
  // a day on: grown again, and felled with that axe for half as much again
  await t.sql(`update public.town_trees set felled_at = felled_at - 86400000 where tree = $1`, [elder[0]]);
  await patch(U.m2, { stamina: { day: await day(), left: 100 } });
  did = await call(U.m2, "town_fell", went([elder[0]]), el[0], el[1]);
  t.check("a day on it is felled again, by that axe: half as much again", did?.ok === true && same(did.got, [["timber", 23], ["resin", 5]]), did);

  t.section("the powers of an axe at the top, counted by the day");
  const f0 = tree(), ft = beside(f0), g0 = tree(), gt = beside(g0);
  await fresh(U.m1, axe({ plus: 10 }));
  did = await call(U.m1, "town_fell", { tree: f0[0], trees: [], secs: 0, one: true }, ft[0], ft[1]);
  t.check("an axe without the one stroke has none", did?.ok === false && did.why === "none", did);
  await fresh(U.m1, axe({ plus: 10, opts: ["", "", "axOne"] }));
  const before = Number((await one(`select count(*)::int as n from public.town_plays where member_id = $1 and game = 'felling'`, [U.m1])).n);
  did = await call(U.m1, "town_fell", { tree: f0[0], trees: [], secs: 0, one: true }, ft[0], ft[1]);
  p = await purseOf(U.m1);
  t.check("one stroke: the tree falls with no game, clean, and one of the day's ten is used", did?.ok === true && did.one === true && same(did.got, [["log", 2], ["timber", 2]]) && p.powers.axOne.n === 1 && p.powers.axOne.k === await day(), { did, powers: p.powers });
  t.check("its deed says so, and no game is written down for it", (await mine("fell", U.m1)).at(-1)?.doc.one === true
    && Number((await one(`select count(*)::int as n from public.town_plays where member_id = $1 and game = 'felling'`, [U.m1])).n) === before);
  await patch(U.m1, { powers: { axOne: { k: await day(), n: 10 } } });
  did = await call(U.m1, "town_fell", { tree: g0[0], trees: [], secs: 0, one: true }, gt[0], gt[1]);
  t.check("the eleventh of a day is refused, and the tree stands", did?.ok === false && did.why === "spent" && Number((await one(`select count(*)::int as n from public.town_trees where tree = $1`, [g0[0]])).n) === 0, did);
  await fresh(U.m1, axe({ plus: 10, opts: ["", "", "axDouble"] }));
  did = await call(U.m1, "town_fell", went([g0[0]], { twice: true, trees: [{ id: g0[0], felled: true, misses: 1 }] }), gt[0], gt[1]);
  t.check("a double haul: twice the wood, one of the day's ten used, said in the deed", did?.ok === true && same(did.got, [["log", 4], ["timber", 2]]) && (await purseOf(U.m1)).powers.axDouble.n === 1 && (await mine("fell", U.m1)).at(-1)?.doc.twice === true, did);
  // the quickening root
  const h0 = tree(), ht = beside(h0);
  await fresh(U.m1, axe({ plus: 10, opts: ["", "", "axRoot"] }));
  await call(U.m1, "town_fell", went([h0[0]]), ht[0], ht[1]);
  await patch(U.m2, { bag: bag(axe({ plus: 10, opts: ["", "", "axRoot"] })), hand: "axe", handAt: 0, powers: {} });
  did = await call(U.m2, "town_fell_root", h0[0]);
  t.check("the quickening root: not for another's stump", did?.ok === false && did.why === "none" && Number((await one(`select count(*)::int as n from public.town_trees where tree = $1 and felled_at is not null`, [h0[0]])).n) === 1, did);
  did = await call(U.m1, "town_fell_root", h0[0]);
  t.check("for my own fresh stump: grown again at once, for everybody, two of the day's three left", did?.ok === true && did.left === 2 && !did.trees.down.some((d) => d.id === h0[0])
    && Number((await one(`select count(*)::int as n from public.town_trees where tree = $1`, [h0[0]])).n) === 0 && !(await call(U.m2, "town_trees")).trees.down.some((d) => d.id === h0[0]), did);
  noted = await mine("root", U.m1);
  t.check("written down", noted.length === 1 && noted[0].thing === "pine" && noted[0].doc.tree === h0[0] && noted[0].doc.left === 2, noted);
  await call(U.m1, "town_fell", went([h0[0]]), ht[0], ht[1]);
  await t.sql(`update public.town_trees set felled_at = felled_at - 121000 where tree = $1`, [h0[0]]);
  did = await call(U.m1, "town_fell_root", h0[0]);
  t.check("not for a stump two minutes old", did?.ok === false && did.why === "none", did);
  await fresh(U.m1, axe({ plus: 10, opts: ["", "", "axRoot"] }));
  did = await call(U.m1, "town_fell", went([elder[0]]), el[0], el[1]);
  did = await call(U.m1, "town_fell_root", elder[0]);
  t.check("never for the ancient tree's", did?.ok === false && did.why === "none", did);

  t.section("what is kept is tidy");
  await t.sql(`update public.town_trees set felled_at = felled_at - 3600000 where felled_at is not null and tree <> $1`, [elder[0]]);
  const i0 = tree(), it = beside(i0);
  await fresh(U.m1);
  await t.sql(`delete from public.town_trees where tree = $1`, [i0[0]]);
  did = await call(U.m1, "town_fell", went([i0[0]]), it[0], it[1]);
  const rows = (await t.sql(`select tree from public.town_trees order by tree`)).rows.map((r) => r.tree);
  t.check("trees grown again are forgotten as the next is felled: only what still shows has a row", did?.ok === true && same(rows, [i0[0], elder[0]].sort((x, y) => x - y)), rows);
  t.check("every deed of the woodcutters' has a member and a kind, and none is of a tree that is none", (await deeds("fell")).every((d) => !!d.member_id && ["pine", "elder"].includes(d.thing) && Number.isInteger(d.doc.tree)));

  function same(x, y) { return JSON.stringify(x) === JSON.stringify(y); }
}
