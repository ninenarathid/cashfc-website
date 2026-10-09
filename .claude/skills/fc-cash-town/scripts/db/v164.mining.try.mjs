// v164's miners' part through what a member calls, against the stand-in database with the base under it
// (try-v164.mjs plays this after the part's rule cases). The clock is the test's own, so that a turn, a torch's five
// minutes and the day's turn can be come to; the word the rolls hang on is the database's own, read here as the SQL
// editor reads it, and what a rock holds is asked of the code (lib/town/mining) with that word: so every scene finds
// its own rock (one that hides a vein, the way down, moss, the day's crystal) instead of hoping for one.
//
// EVERY CALL IS HELD TO THE CODE. Beside the database there is a twin here: what the trial's keeper does at each
// call (lib/town/trial's cave, mineDo, minePeek, veinDo, caveReach, liftRide, torchDown, drillDo), done with the
// code's own rules on what the database kept before the call. After the call the database's answer, both purses, the
// place's document, what the member is told of the cave and the deeds written down are held to the twin's. A scene
// then only says what it is a scene of.
export default async function (ctx) {
  const { t, U, call, one, same, CODE, give, patch, root, sql } = ctx;
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const { caveLayout } = await import("@/lib/town/mining-row");
  const M = await import("@/lib/town/mining");
  const CS = await import("@/lib/town/cave-state");
  const TOOLS = await import("@/lib/town/tools");
  const { dayOf } = await import("@/lib/town/stamina");
  const K = CODE.mining, TURN = K.turn, MIN = 60_000;
  const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);
  const no = (r) => r?.code === "42501";
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const caves = async () => (await t.sql(`select place, doc from public.town_cave order by place`)).rows;
  const bag = (...stacks) => Array.from({ length: Math.max(10, stacks.length) }, (_, i) => stacks[i] ?? null);

  // the test's clock in the place of the database's: a moment of the real today, a little after a turn's edge
  // (the real today: the site's key may lay today's floors and tomorrow's, by the database's own clock, and no other)
  const REAL = Date.now();
  let T0 = Math.floor(REAL / TURN) * TURN + 5000;
  if (dayOf(T0) !== dayOf(REAL)) T0 += TURN;
  await t.sql(`create table if not exists town.test_clock (ms bigint not null); delete from town.test_clock where true; insert into town.test_clock values (${T0});
    create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  let NOW = T0;
  const clock = async (ms) => { NOW = Math.round(ms); await t.sql(`update town.test_clock set ms = ${NOW} where true`); };
  const tick = (ms) => clock(NOW + ms);
  let today = dayOf(T0);
  const WORD = (await one(`select town.mine_word() as w`)).w;
  const LAID = new Map();
  const laidOn = (floor, day) => { const k = `${floor}:${day}`; if (!LAID.has(k)) LAID.set(k, caveLayout(floor, day)); return LAID.get(k); };
  /** A place's rocks on a day, as the code has them. */
  const rocksOn = (floor, day = today) => (floor === 0 ? K.rocks : floor >= 1 && floor <= K.floors ? laidOn(floor, day).rocks : []).map(([id, x, y, look]) => ({ id, x, y, look }));
  const crystalOn = (day = today) => M.crystalOf(WORD, day, (f) => rocksOn(f, day));
  const NAME = Object.fromEntries(await Promise.all([U.m1, U.m2, U.admin].map(async (id) => [id, (await one(`select town.mine_name($1) as n`, [id])).n])));
  /** The functions of this part that a member calls behind the gate, each with something to ask; and whether it reads a floor. */
  const GATED = [["town_cave", true, 0, null, null], ["town_mine", true, 0, 0, 39, 231, 1, null], ["town_mine_peek", true, 0, 0]];
  const gate = async (who, only = () => true) => Promise.all(GATED.filter(only).map(([fn, , ...args]) => call(who, fn, ...args)));
  for (const who of [U.m1, U.m2, U.admin]) await call(who, "town_hold", null);

  /* ── the twin: what the trial's keeper does, with the code's rules, on what the database kept ── */

  const purseNow = async (who) => (await one(`select town.purse_of($1, false) as p`, [who])).p;
  const pointsOf = async (who, line = "mining") => Number((await one(`select coalesce((town.work_told($1, town.now_ms())->$2->>'points')::float8, 0) as p`, [who, line])).p);
  const lastDeed = async () => Number((await one(`select coalesce(max(id), 0)::int as n from public.town_deeds`)).n);
  const deedsSince = async (mark) => (await t.sql(`select member_id, what, thing, n::float8 as n, doc from public.town_deeds where id > $1 order by id`, [mark])).rows;
  /** The code's whole cave, of the places as the database keeps them (each read as the code reads one at a moment). */
  const wholeOf = (f, d) => ({ day: d.day, ways: { [String(f)]: d.way }, broken: { [String(f)]: d.broken }, struck: { [String(f)]: d.struck }, crystal: d.crystal, deepest: null, torches: d.torches, moss: d.moss });
  async function stateNow(now = NOW) {
    let s = CS.newCave(dayOf(now));
    for (const { place, doc } of await caves()) {
      const o = CS.caveAt(wholeOf(place, doc), now);
      s = { ...s, ways: { ...s.ways, ...o.ways }, broken: { ...s.broken, ...o.broken }, struck: { ...s.struck, ...o.struck }, crystal: o.crystal ?? s.crystal, torches: [...s.torches, ...o.torches], moss: [...s.moss, ...o.moss] };
    }
    // (the board: the floor under the deepest way that is open, as the code's openWay keeps it)
    const deep = Object.keys(s.ways).map(Number).sort((a, b) => b - a)[0];
    return deep === undefined ? s : { ...s, deepest: { floor: deep + 1, by: s.ways[String(deep)].by, name: s.ways[String(deep)].name, at: s.ways[String(deep)].at } };
  }
  /** …and one place's document of it, as the database keeps one. */
  const placeOf = (s, f, now, crystalFloor) => ({
    day: s.day, way: s.ways[String(f)] ?? null, crystal: crystalFloor === f ? s.crystal : null,
    broken: s.broken[String(f)] ?? { turn: M.turnOf(now), ids: [] }, struck: s.struck[String(f)] ?? { turn: M.turnOf(now), rocks: {} },
    torches: s.torches.filter((x) => x.f === f), moss: s.moss.filter((x) => x.f === f),
  });
  const placeNow = async (f, now = NOW) => (await one(`select town.cave_at((select c.doc from public.town_cave c where c.place = $1), $2::bigint) as d`, [f, now])).d;
  const todayAt = (floor, s, c) => {
    if (floor <= 0) return { way: null, crystal: null };
    const here = c && c.floor === floor ? c.rock : null;
    return { way: s.ways[String(floor)] ? null : M.wayRockOf(WORD, floor, s.day, rocksOn(floor, s.day), here), crystal: s.crystal ? null : here };
  };
  /** Whether a tile is one a member may be believed to stand on (the database's own rule, said here in the code's words). */
  const stoodOn = (floor, day, x, y, rocks, stands) => {
    const r = rocks.find((q) => q.x === x && q.y === y);
    return r ? !stands(r.id) : floor === 0 ? CS.floorAtTile(x, y) === 0 : CS.floorTile(floor, day, x, y);
  };
  /** What a member is told of the cave (lib/town/trial's cave). */
  function toldOf(s, p, me, place, tile, now) {
    const floor = place >= 0 && place <= K.floors ? place : 0;
    const kept = M.mineOf(p), pick = M.pickOf(p), turn = M.turnOf(now), c = crystalOn(s.day), gone = {};
    for (let f = 0; f <= K.floors; f++) {
      const ids = CS.goneAt(s, f, now);
      if (s.crystal && c && c.floor === f && !ids.includes(c.rock)) ids.push(c.rock);
      if (ids.length) gone[String(f)] = ids;
    }
    const reach = TOOLS.gemBy(pick, "light", TOOLS.GEM_FX.light.pick.glint), glints = [];
    if (reach > 0 && floor > 0 && tile && tile[0] !== null && tile[1] !== null) {
      const td = todayAt(floor, s, c);
      for (const r of rocksOn(floor, s.day)) {
        if (gone[String(floor)]?.includes(r.id) || (reach < TOOLS.ALL && Math.hypot(r.x - tile[0], r.y - tile[1]) > reach)) continue;
        if (M.holdsOf(WORD, floor, r.id, turn, td, pick).kind === "vein") glints.push(r.id);
      }
    }
    const [lf, lt] = kept.loose.k.split(":").map(Number);
    return {
      day: s.day, turn, again: CS.changesAt(s, now), gone,
      ways: Object.fromEntries(Object.entries(s.ways).map(([f, w]) => [f, { x: w.x, y: w.y, rock: w.rock, name: w.name }])),
      torches: s.torches.filter((x) => x.until > now), moss: s.moss.filter((x) => x.until > now), deepest: CS.boardOf(s),
      rests: kept.rests, vein: kept.vein, loose: lt === turn && kept.loose.ids.length ? { floor: lf, ids: kept.loose.ids } : null, glints,
      place: floor, struck: CS.struckTold(s, floor, me, now), paid: kept.paid,
      crystal: !c || s.crystal ? null : floor === c.floor ? { floor: c.floor, rock: c.rock } : pick && TOOLS.has(pick, "pkGleam") ? { floor: c.floor, rock: null } : null,
    };
  }
  /** A rock struck, as the trial's keeper strikes one (lib/town/trial's mineDo): what it answers, what is kept after it, and the deeds it writes. */
  function twinMine(s, who, purse, theirs, floor, rock, at, swings, how, now, points) {
    const rocks = rocksOn(floor, s.day), c = crystalOn(s.day), here = c && c.floor === floor ? c.rock : null, today_ = todayAt(floor, s, c), element = M.elementOf(WORD, floor, s.day);
    const standing = (id) => CS.stands(s, floor, id, now, here);
    // (a tile that cannot be believed is no tile to the rules: the rock is out of reach, in the rule's own turn)
    const tile = at && at[0] !== null && at[1] !== null && stoodOn(floor, s.day, at[0], at[1], rocks, standing) ? at : [-9999, -9999];
    const go = { now, floor, rock, at: tile, swings, rocks, standing, salt: WORD, day: s.day, today: today_, element, points, quake: how === "quake", who, name: NAME[who] ?? who, struck: (id) => CS.struckAt(s, floor, id, now) };
    const did = M.mine(purse, go), out = { state: s, mine: purse, theirs, deeds: [] };
    if (!did.ok) return { ...out, answer: did };
    const nothing = { got: [], broke: [], way: false, vein: null, crystal: false, chained: null, cost: 0 };
    const first = did.struck.first, whose = first === who ? null : did.struck.name || first;
    if (did.done === false) return { ...out, state: CS.strikeRock(s, floor, rock, did.struck, now), mine: did.purse, answer: { ok: true, ...nothing, part: did.part, whose } };
    let paid;
    if (did.done === "theirs") {
      const got = theirs ? M.payFirst(theirs, go, did.struck) : null;
      if (!got || !got.ok) return { ...out, state: CS.strikeRock(s, floor, rock, did.struck, now), mine: did.purse, answer: { ok: true, ...nothing, part: 1, waits: true, whose } };
      paid = got;
      out.theirs = got.purse;
    } else paid = did;
    let next = CS.breakRocks(s, floor, paid.broke, now);
    const name = did.struck.name || first;
    if (paid.way !== null) { const r = rocks.find((x) => x.id === paid.way); next = CS.openWay(next, floor, { rock: r.id, x: r.x, y: r.y, by: first, name, at: now }); }
    if (paid.crystal) next = CS.crystalBroken(next, { by: first, name, at: now });
    for (const id of paid.moss) { const r = rocks.find((x) => x.id === id); if (r && floor > 0) next = CS.setMoss(next, floor, r.x, r.y, first, now); }
    const helpers = M.helpersOf(did.struck), deeds = [];
    for (const e of paid.each) {
      const doc = { floor, rock: e.rock, swings, ...(paid.spent ? { spent: true } : {}), ...(e.rock === paid.chained ? { chained: true } : {}), ...(how ? { how } : {}), hand: "pick",
        ...(e.rock === rock && first !== who ? { by: who } : {}), ...(e.rock === rock && helpers.length ? { with: helpers } : {}) };
      if (e.kind === "crystal") deeds.push([first, "crystal", "stone", 1, { ...doc, got: TOOLS.ORES[TOOLS.ORES.length - 1].shard, chip: TOOLS.GEMS[element].chip }]);
      else deeds.push([first, "mine", "stone", 1, { ...doc, ...(e.shards ? { got: M.oreOf(floor), shards: e.shards } : {}), ...(e.kind === "vein" ? { vein: true } : {}), ...(paid.moss.includes(e.rock) ? { moss: true } : {}) }]);
    }
    if (paid.way !== null) deeds.push([first, "delve", null, 1, { floor, rock: paid.way }]);
    for (const id of helpers) deeds.push([id, "hew", "stone", 1, { floor, rock, whose: first }]);
    const answer = first === who
      ? { ok: true, got: paid.got, broke: paid.broke, way: paid.way !== null, vein: paid.vein, crystal: paid.crystal, chained: paid.chained, cost: paid.cost, part: 1, moss: paid.moss.length > 0 }
      : { ok: true, ...nothing, broke: paid.broke, way: paid.way !== null, crystal: paid.crystal, chained: paid.chained, part: 1, helped: true, whose, paid: first, moss: paid.moss.length > 0 };
    return { state: next, mine: did.purse, theirs: out.theirs, deeds, answer };
  }
  /** What the database did at a call, held to what the twin did: the answer, the purses, the place, what is told, the deeds. Gives the answer, whether all of it agrees, and where it does not. */
  async function held(who, got, want, { floor = null, tile = null, other = null, mark, told = true } = {}) {
    const off = [], { purse: _p, now: _n, cave: said, caveMine: _m, ...answer } = got ?? {};
    if (got?.error) off.push({ error: got.error });
    else if (!same(answer, want.answer)) off.push({ answer, want: want.answer });
    const mine = await purseNow(who);
    if (!same(mine, want.mine)) off.push({ purse: Object.keys({ ...mine, ...want.mine }).filter((k) => !same(mine[k], want.mine[k])).map((k) => [k, mine[k], want.mine[k]]) });
    if (other) { const theirs = await purseNow(other); if (!same(theirs, want.theirs)) off.push({ theirs: Object.keys({ ...theirs, ...want.theirs }).filter((k) => !same(theirs[k], want.theirs[k])).map((k) => [k, theirs[k], want.theirs[k]]) }); }
    const c = crystalOn(want.state.day);
    for (const f of floor === null ? [] : [floor]) { const doc = await placeNow(f), was = placeOf(CS.caveAt(want.state, NOW), f, NOW, c?.floor ?? null); if (!same(doc, was)) off.push({ place: f, doc, want: was }); }
    if (told && floor !== null && !got?.error) { const w = toldOf(CS.caveAt(want.state, NOW), want.mine, who, floor, tile, NOW); if (!same(said, w)) off.push({ told: Object.keys(w).filter((k) => !same(said?.[k], w[k])).map((k) => [k, said?.[k], w[k]]) }); }
    const deeds = await deedsSince(mark);
    const fits = deeds.length === want.deeds.length && deeds.every((d, i) => { const [m, what, thing, n, doc] = want.deeds[i]; return d.member_id === m && d.what === what && d.thing === thing && d.n === n && Object.keys(doc).every((k) => same(d.doc[k], doc[k])) && Object.keys(d.doc).every((k) => k in doc || k === "tile" || k === "under" || k === "said"); });
    if (!fits) off.push({ deeds: deeds.map((d) => [d.member_id, d.what, d.thing, d.n, d.doc]), want: want.deeds });
    return { a: got, agrees: off.length === 0, off };
  }
  /** Strike a rock as a member, and hold everything the database did to the twin. */
  async function strike(who, floor, rock, at, swings, how = null) {
    const s = await stateNow(), purse = await purseNow(who), first = CS.struckAt(s, floor, rock, NOW)?.first ?? null, other = first && first !== who ? first : null;
    const theirs = other ? await purseNow(other) : null, points = await pointsOf(who), mark = await lastDeed();
    const got = await call(who, "town_mine", floor, rock, at?.[0] ?? null, at?.[1] ?? null, swings, how);
    return held(who, got, twinMine(s, who, purse, theirs, floor, rock, at, swings, how ?? undefined, NOW, points), { floor, tile: at, other, mark });
  }
  /** A rock of a place that holds what is wanted for a pick now, and a tile beside it to strike from (floor, and no rock's): null where the place has none. */
  function find(floor, pick, want, s, skip = []) {
    const c = crystalOn(s.day), td = todayAt(floor, s, c), here = c && c.floor === floor ? c.rock : null, rocks = rocksOn(floor, s.day), stands = (id) => CS.stands(s, floor, id, NOW, here);
    for (const r of rocks) {
      if (skip.includes(r.id) || !stands(r.id) || CS.struckAt(s, floor, r.id, NOW) || !want(M.holdsOf(WORD, floor, r.id, M.turnOf(NOW), td, pick), r)) continue;
      const at = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [r.x + dx, r.y + dy]).find(([x, y]) => stoodOn(floor, s.day, x, y, rocks, stands));
      if (at) return { rock: r, at };
    }
    return null;
  }
  /** …on the first floor that has one (the floors gone through from `from`). */
  function findAny(pick, want, s, from = 1, to = K.floors) {
    for (let f = from; f <= to; f++) { if (!M.isDug(f)) continue; const hit = find(f, pick, want, s); if (hit) return { floor: f, ...hit }; }
    return null;
  }
  const plain = (h) => h.kind === "stone" && !h.moss;
  const PICK = { item: "pick", n: 1 }, BEST = { item: "pick", n: 1, plus: 10, opts: ["pkPeek", "pkLoose", "pkQuake"] };
  /** A member set up to mine: a pick in the hand, a day's stamina, nothing kept of the mine, and what is said besides. */
  const miner = async (who, pick = PICK, more = {}) => patch(who, { coins: 50, hand: "pick", handAt: 0, pouches: {}, powers: {}, mine: {}, stamina: { day: dayOf(NOW), left: 100 }, bag: bag(pick), ...more });
  const swingsOf = async (who, floor) => { const p = await purseNow(who); return M.swingsFor(M.pickOf(p), floor, false, false, await pointsOf(who)); };

  t.section("the gate: built closed, opened by its knob");
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"], [U.m1, "a proved member, while it is closed"]]) {
    const did = await gate(who);
    t.check(`the gate refuses ${name}, in every function of the miners'`, did.every(no), did.map((r) => r?.code ?? r));
  }
  let did = await gate(U.admin);
  t.check("the gate lets an admin by while it is closed", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));
  await knob("far_open", 1);
  did = await gate(U.m1);
  t.check("the gate lets a proved member by once it is open", did.every((r) => !r?.error), did.map((r) => r?.error ?? "ok"));
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
    const still = await gate(who);
    t.check(`the gate still refuses ${name} once it is open`, still.every(no), still.map((r) => r?.code ?? r));
  }

  t.section("a day that is not laid: `unlaid`, and nothing held or changed");
  await miner(U.m1);
  const before = { caves: await caves(), purse: await purseNow(U.m1), deeds: await written() };
  did = await gate(U.m1, ([, reads]) => reads);
  t.check("every function that reads a floor answers `unlaid` with this clock, and no purse", did.length >= 3 && did.every((r) => r?.ok === false && r.why === "unlaid" && r.now === T0 && r.purse === undefined), did);
  t.check("…and nothing was made, kept or written down by asking", same(await caves(), before.caves) && same(await purseNow(U.m1), before.purse) && (await written()) === before.deeds, await caves());

  t.section("the day laid by the site's key: what a member is told of a cave nobody has been in");
  const lay = (who, day) => t.as(who, `insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`,
    [day, JSON.stringify(Array.from({ length: K.floors }, (_, i) => laidOn(i + 1, day)))]);
  let r = await lay("service", today);
  t.check("the site's key lays the day's thirty floors, from the code's own generator", !r.error && r.affected === K.floors, r);
  const crystal = crystalOn();
  await patch(U.m1, { hand: null });
  let told = await call(U.m1, "town_cave", 0, null, null);
  t.check("on the mountain's foot: today, this turn, to be asked again at the turn's end; no rock gone, no way open, no light, nobody deepest; nothing of my own; and no crystal rock told to a plain hand",
    told?.ok === true && told.now === T0 && same(told.cave, { day: today, turn: Math.floor(T0 / TURN), again: (Math.floor(T0 / TURN) + 1) * TURN, gone: {}, ways: {}, torches: [], moss: [], deepest: null,
      rests: [], vein: null, loose: null, glints: [], place: 0, struck: {}, paid: null, crystal: null }) && told.purse?.bag?.length >= 10, told);
  t.check("the day's crystal rock stands where the code says it does by the database's own word: on one of the two deepest floors that are dug", !!crystal && [28, 29].includes(crystal.floor)
    && same((await one(`select town.mine_crystal($1) as c`, [today])).c, crystal), crystal);
  told = await call(U.m1, "town_cave", crystal.floor, null, null);
  const elsewhere = await call(U.m1, "town_cave", crystal.floor === 28 ? 29 : 28, null, null);
  t.check("it is told, with its number, to whoever is on its floor; and not at all on another floor", same(told?.cave?.crystal, crystal) && told.cave.place === crystal.floor && elsewhere?.cave?.crystal === null, [told?.cave?.crystal, elsewhere?.cave?.crystal]);
  const odd = [await call(U.m1, "town_cave", 99, null, null), await call(U.m1, "town_cave", -3, null, null), await call(U.m1, "town_cave", null, null, null)];
  t.check("a place that is none is the mountain's foot", odd.every((x) => x?.ok === true && x.cave.place === 0), odd.map((x) => x?.cave?.place ?? x));
  t.check("reading the cave holds nothing and makes no row", same(await caves(), before.caves) && (await written()) === before.deeds);

  t.section("the mountain's foot: a rock struck, swing by swing");
  await miner(U.m1);
  let s = await stateNow(), spot = find(0, PICK, plain, s), need = await swingsOf(U.m1, 0);
  let x = await strike(U.m1, 0, spot.rock.id, spot.at, 2);
  t.check("two swings of a plain pick go into a rock of the foot, which still stands: half of it struck away, in my name, and the purse remembers only the moment", x.agrees && need === 4 && x.a.part === 0.5 && x.a.broke.length === 0 && x.a.whose === null
    && same(x.a.cave.struck[String(spot.rock.id)], { part: 0.5, own: 0.5, by: NAME[U.m1], mine: true }) && x.a.purse.mine.last === NOW && x.a.purse.stamina.left === 100, x.off);
  x = await strike(U.m1, 0, spot.rock.id, spot.at, 2);
  t.check("two more at once are quicker than a hand swings: `soon`, and nothing is counted", x.agrees && x.a.why === "soon" && x.a.cave.struck[String(spot.rock.id)].part === 0.5, x.off.length ? x.off : x.a);
  await tick(2 * K.swing.least);
  const footHolds = M.holdsOf(WORD, 0, spot.rock.id, M.turnOf(NOW), { way: null, crystal: null }, PICK), pointsWas = await pointsOf(U.m1);
  x = await strike(U.m1, 0, spot.rock.id, spot.at, 2);
  t.check("a hand's time later they strike the last of it away: it breaks, a stone (and the fragments it held) in the bag for a point of stamina, and it is gone for everybody", x.agrees && x.a.ok && same(x.a.broke, [spot.rock.id]) && x.a.part === 1
    && same(x.a.got, [["stone", 1], ...(footHolds.shards ? [["shardCopper", footHolds.shards]] : [])]) && x.a.cost === 1 && x.a.purse.stamina.left === 99 && x.a.vein === null && x.a.way === false && x.a.fire === undefined
    && same(x.a.cave.gone, { 0: [spot.rock.id] }) && same(x.a.cave.struck, {}), x.off.length ? x.off : x.a);
  t.check("…written down as a rock mined, and a point on the miners' line (and the line's first fragment, where it left some)", (await pointsOf(U.m1)) >= pointsWas + 1
    && same((await deedsSince((await lastDeed()) - 1)).map((d) => [d.member_id, d.what, d.thing, d.n, d.doc.floor, d.doc.rock, d.doc.hand, d.doc.tile]), [[U.m1, "mine", "stone", 1, 0, spot.rock.id, "pick", spot.at]]), await pointsOf(U.m1));
  x = await strike(U.m1, 0, spot.rock.id, spot.at, 1);
  t.check("struck again it is gone", x.agrees && x.a.why === "gone", x.off.length ? x.off : x.a);
  s = await stateNow();
  const next = find(0, PICK, plain, s, [spot.rock.id]), far = [next.rock.x + 2, next.rock.y], onRock = rocksOn(0).find((q) => q.id !== next.rock.id);
  await tick(5000);
  const tries = [await strike(U.m1, 0, next.rock.id, far, 4), await strike(U.m1, 0, next.rock.id, [next.rock.x, next.rock.y], 4), await strike(U.m1, 0, next.rock.id, [onRock.x, onRock.y], 4),
    await strike(U.m1, 0, next.rock.id, [null, null], 4), await strike(U.m1, 0, next.rock.id, [5, K.at.y + 5], 4), await strike(U.m1, 0, 9999, next.at, 4), await strike(U.m1, 0, next.rock.id, next.at, 0), await strike(U.m1, 77, 0, next.at, 4)];
  t.check("from two tiles off, from the rock's own tile, from another rock's, from no tile, from a tile of the cave's: out of reach; a rock that is none, and a place that is none: none; no swing at all: more. Nothing changes by any of it",
    tries.every((y) => y.agrees) && same(tries.map((y) => y.a.why), ["far", "far", "far", "far", "far", "none", "more", "none"]), tries.map((y) => y.off.length ? y.off : y.a.why));
  await patch(U.m1, { hand: "glowMushroom", bag: bag(PICK, { item: "glowMushroom", n: 1 }) });
  x = await strike(U.m1, 0, next.rock.id, next.at, 4);
  t.check("with something else in the hand there is no pick to swing", x.agrees && x.a.why === "tool", x.off.length ? x.off : x.a);

  t.section("two picks on one rock: what it leaves is for whoever struck it first");
  await clock(NOW + 60_000);
  await miner(U.m1); await miner(U.m2);
  s = await stateNow();
  spot = find(1, PICK, plain, s);
  need = await swingsOf(U.m1, 1);
  const half = need / 2, before1 = { m1: await pointsOf(U.m1), m2: await pointsOf(U.m2), h2: await pointsOf(U.m2, "helpers") };
  x = await strike(U.m1, 1, spot.rock.id, spot.at, half);
  t.check("the first strikes half of a rock of the cave's first floor away", x.agrees && x.a.part === 0.5 && x.a.whose === null, x.off.length ? x.off : x.a);
  x = await strike(U.m2, 1, spot.rock.id, spot.at, 1);
  t.check("the second's swing goes into the same rock, and they are told whose it is", x.agrees && x.a.ok && x.a.part === 0.5 + 1 / need && x.a.whose === NAME[U.m1] && x.a.broke.length === 0
    && same(x.a.cave.struck[String(spot.rock.id)], { part: 0.5 + 1 / need, own: 1 / need, by: NAME[U.m1], mine: false }), x.off.length ? x.off : x.a);
  await tick(5000);
  const holds1 = M.holdsOf(WORD, 1, spot.rock.id, M.turnOf(NOW), todayAt(1, s, crystal), PICK);
  x = await strike(U.m2, 1, spot.rock.id, spot.at, need);
  let p1 = await purseNow(U.m1), p2 = await purseNow(U.m2);
  t.check("the second strikes the last of it away: it breaks, and the FIRST is paid (the stone, the stamina, and told who broke it for them); the second has nothing of it and lent a hand", x.agrees && x.a.ok && x.a.helped === true && x.a.paid === U.m1 && x.a.whose === NAME[U.m1]
    && same(x.a.got, []) && same(x.a.broke, [spot.rock.id]) && x.a.cost === 0 && p2.stamina.left === 100 && !p2.bag.some((b) => b?.item === "stone")
    && p1.bag.some((b) => b?.item === "stone" && b.n === 1) && p1.stamina.left === 99 && p1.mine.paid?.by === NAME[U.m2] && p1.mine.paid.rock === spot.rock.id && same(p1.mine.paid.got[0], ["stone", 1]), x.off.length ? x.off : [x.a, p1.mine]);
  let ds = await deedsSince((await lastDeed()) - 2);
  t.check("…written down: the rock in the first's name, with who broke it and who helped; and a hand lent, in the helper's name", same(ds.map((d) => [d.member_id, d.what, d.doc.by ?? null, d.doc.with ?? null, d.doc.whose ?? null]), [[U.m1, "mine", U.m2, [U.m2], null], [U.m2, "hew", null, null, U.m1]]), ds);
  t.check("…and counted: the rock's point to the first (with a first fragment's, if it left one); a point on the miners' line and one on the helpers' to the second",
    (await pointsOf(U.m1)) >= before1.m1 + 1 && (await pointsOf(U.m2)) === before1.m2 + CODE.work.mining.lent && (await pointsOf(U.m2, "helpers")) === before1.h2 + CODE.work.mining.lending && holds1.kind === "stone",
    [before1, await pointsOf(U.m1), await pointsOf(U.m2), await pointsOf(U.m2, "helpers")]);
  // (whoever struck first cannot take it: the rock waits for them, whole, and nobody's swings are lost)
  await tick(5000);
  s = await stateNow();
  const waits = find(1, PICK, plain, s);
  await strike(U.m1, 1, waits.rock.id, waits.at, 1);
  await patch(U.m1, { bag: bag(PICK, ...Array.from({ length: 9 }, () => ({ item: "boot", n: 1 }))) });
  await tick(5000);
  x = await strike(U.m2, 1, waits.rock.id, waits.at, need);
  t.check("the first's bag is full when the second strikes the last away: the rock waits for them, struck whole away, and nobody is paid", x.agrees && x.a.ok && x.a.waits === true && x.a.part === 1 && x.a.broke.length === 0 && x.a.helped === undefined
    && x.a.cave.struck[String(waits.rock.id)].part === 1 && !x.a.cave.gone["1"].includes(waits.rock.id), x.off.length ? x.off : x.a);
  await patch(U.m1, { bag: bag(PICK) });
  await tick(5000);
  x = await strike(U.m1, 1, waits.rock.id, waits.at, 1);
  t.check("with room made, the first's next swing breaks it: theirs, with the second written down as the hand that helped", x.agrees && x.a.ok && same(x.a.broke, [waits.rock.id]) && x.a.got[0][0] === "stone" && x.a.helped === undefined
    && same((await deedsSince((await lastDeed()) - 2)).map((d) => [d.member_id, d.what, d.doc.with ?? null]), [[U.m1, "mine", [U.m2]], [U.m2, "hew", null]]), x.off.length ? x.off : x.a);

  t.section("the way down: found under a rock, open to everybody for the day");
  await tick(5000);
  s = await stateNow();
  const wayId = M.wayRockOf(WORD, 1, today, rocksOn(1), null), way = find(1, PICK, (h, q) => q.id === wayId, s), wayWas = await pointsOf(U.m1);
  x = await strike(U.m1, 1, way.rock.id, way.at, need);
  t.check("the rock that hides the first floor's way down is broken: the way is open where it stood, in the breaker's name, and the floor under it is the deepest the village has reached today", x.agrees && x.a.ok && x.a.way === true
    && same(x.a.cave.ways, { 1: { x: way.rock.x, y: way.rock.y, rock: way.rock.id, name: NAME[U.m1] } }) && same(x.a.cave.deepest, { floor: 2, by: U.m1, name: NAME[U.m1], at: NOW }) && x.a.cave.gone["1"].includes(way.rock.id), x.off.length ? x.off : x.a);
  ds = await deedsSince((await lastDeed()) - 2);
  t.check("…written down as a rock mined and as a way down found, and counted as both", same(ds.map((d) => [d.member_id, d.what, d.thing, d.doc.floor, d.doc.rock]), [[U.m1, "mine", "stone", 1, way.rock.id], [U.m1, "delve", null, 1, way.rock.id]])
    && (await pointsOf(U.m1)) >= wayWas + CODE.work.mining.rock + CODE.work.mining.way, [ds, wayWas, await pointsOf(U.m1)]);
  t.check("the tile where it stood may be stood on now: a rock beside it is struck from there… if one is near enough; and the other member is told of the way as it is", same((await call(U.m2, "town_cave", 1, null, null)).cave.ways, x.a.cave.ways)
    && (await one(`select town.mine_stood(1, $1, $2, town.cave_laid($3, 1), town.cave_laid($3, 1)->'rocks', town.cave_at((select doc from public.town_cave where place = 1), town.now_ms()), town.now_ms(), null) as ok`, [way.rock.x, way.rock.y, today])).ok === true);

  t.section("a vein opened; the crystal rock; a bag with no room; what a keen pick does");
  await tick(5000);
  await miner(U.m1);
  s = await stateNow();
  const veinAt = findAny(PICK, (h) => h.kind === "vein" && !h.gem, s);
  need = await swingsOf(U.m1, veinAt.floor);
  x = await strike(U.m1, veinAt.floor, veinAt.rock.id, veinAt.at, need);
  const seed = M.holdsOf(WORD, veinAt.floor, veinAt.rock.id, M.turnOf(NOW), todayAt(veinAt.floor, s, crystal), PICK).seed;
  t.check("a rock that hides a vein breaks, and the vein is the breaker's from then on: its place, the seed of its face, no gem, a plain pick's strikes; a stone, and the stamina of the rock and of the vein", x.agrees && x.a.ok
    && same(x.a.vein, { f: veinAt.floor, rock: veinAt.rock.id, turn: M.turnOf(NOW), seed, gem: null, mods: { strikes: K.pick.strikes[0], back: 0, cross: 0, spent: false }, more: 0 })
    && same(x.a.got, [["stone", 1]]) && x.a.cost === K.stamina + K.vein.stamina && x.a.purse.stamina.left === 100 - K.stamina - K.vein.stamina && same(x.a.cave.vein, x.a.vein), x.off.length ? x.off : x.a);
  await tick(5000);
  s = await stateNow();
  const other1 = find(veinAt.floor, PICK, plain, s);
  x = await strike(U.m1, veinAt.floor, other1.rock.id, other1.at, need);
  t.check("with a vein open and not played out, no rock is struck", x.agrees && x.a.why === "vein" && same(x.a.cave.vein?.seed, seed), x.off.length ? x.off : x.a);
  // the crystal rock
  await miner(U.m1);
  s = await stateNow();
  const cRock = rocksOn(crystal.floor).find((q) => q.id === crystal.rock), cAt = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([dx, dy]) => [cRock.x + dx, cRock.y + dy])[0];
  x = await strike(U.m1, crystal.floor, crystal.rock, cAt, 30);
  t.check("the day's crystal rock will not be bitten by a plain pick: `weak`, and it stands", x.agrees && x.a.why === "weak" && same(x.a.cave.crystal, crystal) && same(x.a.cave.struck, {}), x.off.length ? x.off : x.a);
  await miner(U.m1, BEST);
  const element = M.elementOf(WORD, crystal.floor, today), crystalWas = await pointsOf(U.m1);
  x = await strike(U.m1, crystal.floor, crystal.rock, cAt, 30);
  t.check("a pick at the top breaks it: fragments of silver and of the floor's own gem, and it is gone for the day, for everybody", x.agrees && x.a.ok && x.a.crystal === true
    && same(x.a.got, [["stone", 1], ["shardSilver", K.crystal.shards], [TOOLS.GEMS[element].chip, K.crystal.chips]]) && x.a.cave.crystal === null && x.a.cave.gone[String(crystal.floor)].includes(crystal.rock)
    && same((await placeNow(crystal.floor)).crystal, { by: U.m1, name: NAME[U.m1], at: NOW }), x.off.length ? x.off : x.a);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("…written down as the crystal rock, with what it gave, and counted for ten", same(ds.map((d) => [d.member_id, d.what, d.doc.got, d.doc.chip]), [[U.m1, "crystal", "shardSilver", TOOLS.GEMS[element].chip]])
    && (await pointsOf(U.m1)) >= crystalWas + CODE.work.mining.crystal, [ds, crystalWas, await pointsOf(U.m1)]);
  // a bag with no room, and a sack
  await tick(5000);
  await miner(U.m1, PICK, { bag: bag(PICK, ...Array.from({ length: 9 }, () => ({ item: "boot", n: 1 }))) });
  s = await stateNow();
  let full = find(2, PICK, plain, s);
  need = await swingsOf(U.m1, 2);
  const row2 = await placeNow(2);
  x = await strike(U.m1, 2, full.rock.id, full.at, need);
  t.check("with no room for what a rock leaves it is not broken: `full`, and nothing is kept of the go, the swings neither", x.agrees && x.a.why === "full" && same(await placeNow(2), row2) && same(x.a.cave.struck, {}), x.off.length ? x.off : x.a);
  await give(U.m1, { had: ["thingSack"] });
  x = await strike(U.m1, 2, full.rock.id, full.at, need);
  t.check("with the miners' sack it is: the stone goes into the sack, the bag as full as it was", x.agrees && x.a.ok && same(x.a.broke, [full.rock.id]) && same(x.a.purse.pouches.thingSack[0], { item: "stone", n: 1 })
    && x.a.purse.bag.filter((b) => b?.item === "boot").length === 9, x.off.length ? x.off : x.a);
  await give(U.m1, { had: [] });
  // a pick that sees into stone, and one swing for every rock within a step
  await tick(5000);
  await miner(U.m1, BEST);
  s = await stateNow();
  const seen = find(2, BEST, () => true, s), peek = await call(U.m1, "town_mine_peek", 2, seen.rock.id);
  t.check("a pick that sees into stone is told what a rock holds, as the code would tell it: and nothing is held, kept or written down by looking", peek?.ok === true
    && peek.peek === M.peekOf(M.holdsOf(WORD, 2, seen.rock.id, M.turnOf(NOW), todayAt(2, s, crystal), BEST)) && same(await placeNow(2), placeOf(s, 2, NOW, crystal.floor)), peek);
  const peeks = [await call(U.m1, "town_mine_peek", 2, 9999), await call(U.m1, "town_mine_peek", 2, full.rock.id), await call(U.m1, "town_mine_peek", 44, 0)];
  await miner(U.m2);
  peeks.push(await call(U.m2, "town_mine_peek", 2, seen.rock.id));
  t.check("…none of a rock that is none or a place that is none, gone of one broken, and nothing to a pick that cannot see", same(peeks.map((y) => y?.why), ["none", "gone", "none", "tool"]), peeks);
  // (two rocks a tile apart with a tile between them: a quake from there breaks both, if both are plain)
  let pair = null;
  for (let f = 1; f <= K.floors && !pair; f++) {
    if (!M.isDug(f)) continue;
    const rocks = rocksOn(f), td = todayAt(f, s, crystal), ok = (q) => plain(M.holdsOf(WORD, f, q.id, M.turnOf(NOW), td, BEST)) && CS.stands(s, f, q.id, NOW, crystal.floor === f ? crystal.rock : null) && !CS.struckAt(s, f, q.id, NOW);
    for (const a of rocks) for (const b of rocks) {
      if (pair || a.id >= b.id || Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) !== 2 || !ok(a) || !ok(b)) continue;
      // (a tile of floor within a step of both)
      const mid = [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => [a.x + dx, a.y + dy])).find(([u, v]) => Math.max(Math.abs(u - b.x), Math.abs(v - b.y)) <= 1 && CS.floorTile(f, today, u, v));
      if (mid) pair = { f, a, b, mid };
    }
  }
  x = await strike(U.m1, pair.f, pair.a.id, pair.mid, 1, "quake");
  t.check("a quake: one swing, and every plain rock within a step of the striker breaks with the one struck; counted once of the day's ten", !!pair && x.agrees && x.a.ok && x.a.broke.length >= 2 && x.a.broke.includes(pair.a.id) && x.a.broke.includes(pair.b.id)
    && same(x.a.purse.powers.pkQuake, { k: today, n: 1 }) && x.a.got.find((g) => g[0] === "stone")[1] === x.a.broke.length && x.a.cost === 1, x.off.length ? x.off : x.a);
  ds = await deedsSince((await lastDeed()) - x.a.broke.length);
  t.check("…each rock written down, each as a quake's", ds.length === x.a.broke.length && ds.every((d) => d.what === "mine" && d.doc.how === "quake" && d.member_id === U.m1), ds);

  return { clock, tick, now: () => NOW, T0, today, WORD, laidOn, rocksOn, crystal, knob, no, written, caves, bag, lay, GATED, gate, M, CS, TOOLS, K, TURN, MIN, sql };
}
