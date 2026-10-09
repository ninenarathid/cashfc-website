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
  const { isRest } = await import("@/lib/town/cave");
  const V = await import("@/lib/town/vein");
  const VA = await import("@/lib/town/vein-account");
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
  const GATED = [["town_cave", true, 0, null, null], ["town_mine", true, 0, 0, 39, 231, 1, null], ["town_mine_peek", true, 0, 0], ["town_cave_reach", false, 10], ["town_lift", true, 0], ["town_torch", true, 5, 330], ["town_drill", true, 5, 330], ["town_vein", false, {}]];
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
  /** A floor come to, the lift ridden, a torch set down, a floor broken through: each as the trial's keeper does it (lib/town/trial's caveReach, liftRide, torchDown, drillDo). */
  const twinReach = (s, purse, floor) => {
    const reached = isRest(floor) && !M.mineOf(purse).rests.includes(floor) && CS.wayOpen(s, floor - 1);
    return { state: s, mine: reached ? M.reachRest(purse, floor) : purse, deeds: [], answer: { ok: true, reached } };
  };
  const twinLift = (s, who, purse, to) => (!M.mayRide(purse, to) ? { state: s, mine: purse, deeds: [], answer: { ok: false, why: "none" } }
    : { state: s, mine: purse, deeds: [[who, "lift", null, to, {}]], answer: { ok: true, at: to === 0 ? null : CS.floorSpots(to, s.day).liftAt ?? null } });
  function twinTorch(s, who, purse, at, now) {
    const floor = at[0] === null || at[1] === null ? 0 : CS.floorAtTile(at[0], at[1]), out = { state: s, mine: purse, deeds: [] };
    if (!floor || !CS.floorTile(floor, s.day, at[0], at[1])) return { ...out, answer: { ok: false, why: "here" } };
    const did = M.torchDown(purse);
    if (!did.ok) return { ...out, answer: did };
    return { state: CS.setTorch(s, floor, at[0], at[1], who, now), mine: did.purse, deeds: [[who, "torch", K.torch, 1, { floor, tile: at }]], answer: { ok: true, until: now + K.light.burns } };
  }
  function twinDrill(s, who, purse, at, now) {
    const floor = CS.floorAtTile(at[0], at[1]), out = { state: s, mine: purse, deeds: [] };
    if (!floor) return { ...out, answer: { ok: false, why: "none" } };
    const spots = CS.floorSpots(floor, s.day), c = crystalOn(s.day), rocks = rocksOn(floor, s.day);
    const free = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]].map(([dx, dy]) => [at[0] + dx, at[1] + dy])
      .find(([u, v]) => CS.floorTile(floor, s.day, u, v) && !(u === spots.up[0] && v === spots.up[1]) && !(u === spots.arrive[0] && v === spots.arrive[1]));
    // (the database's own, which the code does not ask: the tile said has to be one that could be stood on)
    if (!free || !stoodOn(floor, s.day, at[0], at[1], rocks, (id) => CS.stands(s, floor, id, now, c && c.floor === floor ? c.rock : null))) return { ...out, answer: { ok: false, why: "here" } };
    const did = M.drill(purse, floor, CS.wayOpen(s, floor), now);
    if (!did.ok) return { ...out, answer: did };
    return { state: CS.openWay(s, floor, { rock: null, x: free[0], y: free[1], by: who, name: NAME[who] ?? who, at: now }), mine: did.purse, deeds: [[who, "delve", null, 1, { floor, how: "drill", tile: free }]], answer: { ok: true, at: free, left: did.left } };
  }
  async function reach(who, floor) {
    const s = await stateNow(), purse = await purseNow(who), mark = await lastDeed(), got = await call(who, "town_cave_reach", floor);
    const x_ = await held(who, got, twinReach(s, purse, floor), { mark, told: false });
    // (what it tells of the member's own is what the cave's reader tells of it)
    const own = toldOf(s, await purseNow(who), who, 0, null, NOW);
    if (!same(got?.caveMine, { rests: own.rests, vein: own.vein, loose: own.loose, paid: own.paid })) { x_.agrees = false; x_.off.push({ caveMine: got?.caveMine }); }
    return x_;
  }
  async function lift(who, to) {
    const s = await stateNow(), purse = await purseNow(who), mark = await lastDeed(), got = await call(who, "town_lift", to);
    return held(who, got, twinLift(s, who, purse, to), { mark, told: false });
  }
  async function torch(who, at) {
    const s = await stateNow(), purse = await purseNow(who), mark = await lastDeed(), got = await call(who, "town_torch", at[0], at[1]);
    const floor = at[0] === null || at[1] === null ? 0 : CS.floorAtTile(at[0], at[1]);
    return held(who, got, twinTorch(s, who, purse, at, NOW), { floor: floor || null, tile: at, mark, told: !!got?.cave });
  }
  async function drill(who, at) {
    const s = await stateNow(), purse = await purseNow(who), mark = await lastDeed(), got = await call(who, "town_drill", at[0], at[1]);
    return held(who, got, twinDrill(s, who, purse, at, NOW), { floor: CS.floorAtTile(at[0], at[1]) || null, tile: at, mark, told: !!got?.cave });
  }
  /**
   * A vein played out, as the trial's keeper plays one (lib/town/trial's veinDo): by lib/town/mining's `veinEnd`, which
   * lays the face out and plays the strikes on it again. The database is told the go as its own keeper tells it
   * (lib/town/vein-account's `accountOf`, from the face), or whatever a scene has a page say instead.
   */
  function twinVein(s, who, purse, strikes, now) {
    const did = M.veinEnd(purse, strikes, now), out = { state: s, mine: purse, deeds: [] };
    if (!did.ok) return { ...out, answer: did };
    const v = did.vein, ore = M.oreOf(v.f), chip = did.got.find((g) => g[0] !== ore)?.[0] ?? null;
    return { ...out, mine: did.purse, answer: { ok: true, got: did.got, passed: did.passed, of: did.of, again: did.again },
      deeds: [[who, "vein", did.got.some((g) => g[0] === ore) ? ore : null, did.passed, { floor: v.f, rock: v.rock, strikes: strikes.slice(0, 64), struck: did.struck, passed: did.passed, of: did.of,
        ...(v.mods.spent ? { spent: true } : {}), ...(chip ? { chip } : {}), ...(v.gem ? { gem: v.gem } : {}), ...(v.again ? { again: true } : {}) }]] };
  }
  async function playVein(who, strikes) {
    const s = await stateNow(), purse = await purseNow(who), vein = M.mineOf(purse).vein, mark = await lastDeed();
    const got = await call(who, "town_vein", vein ? VA.accountOf(vein, strikes) : { seed: 0, again: false, strikes: [], struck: 0, of: 4, ore: 0, gems: [] });
    const x_ = await held(who, got, twinVein(s, who, purse, strikes, NOW), { mark, told: false });
    const own = toldOf(s, await purseNow(who), who, 0, null, NOW);
    if (!same(got?.caveMine, { rests: own.rests, vein: own.vein, loose: own.loose, paid: own.paid })) { x_.agrees = false; x_.off.push({ caveMine: got?.caveMine }); }
    return x_;
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
  /** …with a pick in the hand and a day's stamina again, and whatever they keep of the mine left as it is. */
  const handed = async (who, more = {}) => patch(who, { hand: "pick", handAt: 0, stamina: { day: dayOf(NOW), left: 100 }, bag: bag(PICK), ...more });
  const swingsOf = async (who, floor) => { const p = await purseNow(who); return M.swingsFor(M.pickOf(p), floor, false, false, await pointsOf(who)); };

  t.section("what the miners' part should say afterwards (the queries at its foot)");
  const PUBLIC = ["town_cave", "town_cave_reach", "town_drill", "town_lift", "town_mine", "town_mine_peek", "town_torch", "town_vein"];
  const foot = {
    fns: (await t.sql(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = any($1) order by 1`, [PUBLIC])).rows,
    said: await one(`select town.deed_th('mine') as a_word, town.deed_th('vein_odd') as another,
      town.work_counts_of('{"from": "deed", "what": "delve", "thing": null, "n": 1, "doc": {}}'::jsonb, 'me') as a_way_counts,
      town.mine_hardness(1, 0) as a_rock, town.cave_is_rest(10) as a_rest, town.mine_ore(25) as deep_ore,
      town.vein_odd('{"gem": null, "mods": {"strikes": 6, "back": 0}}'::jsonb, '{"strikes": [[0, 0]], "struck": 1, "of": 7, "ore": 1, "gems": []}'::jsonb) as a_face_of_seven`),
    kept: (await t.sql(`select place, doc->'day' as day, doc->'way' as way, jsonb_array_length(doc->'broken'->'ids') as broken from public.town_cave order by place`)).rows,
    editor: await t.as("super", `select public.town_cave()`),
  };
  t.check("the eight functions a member calls: definer, not for the signed out, for the signed in", same(foot.fns, PUBLIC.map((proname) => ({ proname, definer: true, anon: false, member: true }))) && same(GATED.map(([fn]) => fn).sort(), PUBLIC), foot.fns);
  t.check("a deed's word, a way down's count, a rock's hardness, a resting floor, the deep ore, and a face of seven refused", same(foot.said, { a_word: "ทุบหิน", another: "สายแร่ที่เล่าผลมาไม่ตรงกติกา", a_way_counts: [{ to: null, raw: 5, line: "mining" }],
    a_rock: 12, a_rest: true, deep_ore: "shardSilver", a_face_of_seven: "of" }), foot.said);
  t.check("nothing is kept of the cave before anybody has struck a rock; and nobody is signed in in the editor, where the cave is not told", same(foot.kept, []) && no(foot.editor), [foot.kept, foot.editor?.code ?? foot.editor]);

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
  t.check("every function that reads a floor answers `unlaid` with this clock, and no purse", did.length === GATED.filter(([, reads]) => reads).length && did.every((r) => r?.ok === false && r.why === "unlaid" && r.now === T0 && r.purse === undefined), did);
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
  await tick(K.swing.least);
  x = await strike(U.m1, 0, spot.rock.id, spot.at, 2);
  t.check("two more, one swing's time later, are quicker than a hand swings: `soon`, and nothing is counted", x.agrees && x.a.why === "soon" && x.a.cave.struck[String(spot.rock.id)].part === 0.5, x.off.length ? x.off : x.a);
  await tick(K.swing.least);
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
  // (`town_mine` takes its moment before it waits for the place: a call that waited while a newer one of the same
  // member, on another place, moved `mine.last` on comes back with a moment BEFORE the last strike believed)
  const mineWas = (await purseNow(U.m1)).mine, stale = [];
  for (const ahead of [1, 3_600_000]) {
    await patch(U.m1, { mine: { ...mineWas, last: NOW + ahead } });
    stale.push(await strike(U.m1, 0, next.rock.id, next.at, 4));
  }
  t.check("a strike whose moment is before the last one believed (an older call that waited while a newer one went first) is too soon, by a millisecond as by an hour: the rock stands, and nothing of it is struck away",
    stale.every((y) => y.agrees && y.a.why === "soon" && y.a.cave.struck[String(next.rock.id)] === undefined && !(y.a.cave.gone["0"] ?? []).includes(next.rock.id)), stale.map((y) => y.off.length ? y.off : y.a.why ?? y.a));
  await patch(U.m1, { mine: mineWas });
  await patch(U.m1, { hand: "glowMushroom", bag: bag(PICK, { item: "glowMushroom", n: 1 }) });
  x = await strike(U.m1, 0, next.rock.id, next.at, 4);
  t.check("with something else in the hand there is no pick to swing", x.agrees && x.a.why === "tool", x.off.length ? x.off : x.a);

  t.section("two picks on one rock: what it leaves is for whoever struck it first");
  await clock(NOW + 60_000);
  await miner(U.m1); await miner(U.m2);
  // (the two purses are told apart: whoever is paid, it shows which)
  await patch(U.m2, { coins: 77, stamina: { day: dayOf(NOW), left: 60 } });
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
    && same(x.a.got, []) && same(x.a.broke, [spot.rock.id]) && x.a.cost === 0 && p2.stamina.left === 60 && p2.coins === 77 && !p2.bag.some((b) => b?.item === "stone")
    && p1.bag.some((b) => b?.item === "stone" && b.n === 1) && p1.stamina.left === 99 && p1.coins === 50 && p1.mine.paid?.by === NAME[U.m2] && p1.mine.paid.rock === spot.rock.id && same(p1.mine.paid.got[0], ["stone", 1]), x.off.length ? x.off : [x.a, p1.mine]);
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

  t.section("a vein opened; the crystal rock; a bag with no room; a look, and a go with `quake`");
  await tick(5000);
  await miner(U.m1); await miner(U.m2);
  s = await stateNow();
  // (first the first strikes half of a rock of the foot away, and goes off into the cave: that rock is theirs still)
  const begun = find(0, PICK, plain, s), footNeed = await swingsOf(U.m1, 0);
  x = await strike(U.m1, 0, begun.rock.id, begun.at, footNeed / 2);
  const half0 = x.agrees && x.a.part === 0.5;
  await tick(5000);
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
  // (somebody else now strikes away the rest of the rock of the foot that the first began before they opened the vein)
  await tick(5000);
  const openWas = (await purseNow(U.m1)).mine.vein;
  x = await strike(U.m2, 0, begun.rock.id, begun.at, footNeed);
  p1 = await purseNow(U.m1);
  t.check("the first is paid for a rock they began before they opened the vein, broken by somebody else meanwhile: the stone is theirs, they are told who broke it, and the vein they have open is open still, as it was",
    half0 && x.agrees && x.a.ok && x.a.helped === true && x.a.paid === U.m1 && openWas?.seed === seed && same(p1.mine.vein, openWas) && p1.mine.paid?.rock === begun.rock.id && p1.mine.paid.vein === false && p1.mine.paid.by === NAME[U.m2]
    && p1.bag.some((b) => b?.item === "stone" && b.n === 2) && same((await call(U.m1, "town_cave", 0, null, null)).cave.vein, openWas), x.off.length ? x.off : [x.a, p1.mine]);
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
  // a look with a pick that has pkPeek, and a go asked with `quake` by one that has pkQuake
  await tick(5000);
  await miner(U.m1, BEST);
  s = await stateNow();
  const seen = find(2, BEST, () => true, s), peek = await call(U.m1, "town_mine_peek", 2, seen.rock.id);
  t.check("a look (town_mine_peek) with a pick that has pkPeek is answered as the code answers it: and nothing is held, kept or written down by looking", peek?.ok === true
    && peek.peek === M.peekOf(M.holdsOf(WORD, 2, seen.rock.id, M.turnOf(NOW), todayAt(2, s, crystal), BEST)) && same(await placeNow(2), placeOf(s, 2, NOW, crystal.floor)), peek);
  const peeks = [await call(U.m1, "town_mine_peek", 2, 9999), await call(U.m1, "town_mine_peek", 2, full.rock.id), await call(U.m1, "town_mine_peek", 44, 0)];
  await miner(U.m2);
  peeks.push(await call(U.m2, "town_mine_peek", 2, seen.rock.id));
  t.check("…none of a rock that is none or a place that is none, gone of one broken, and `tool` to a pick without pkPeek", same(peeks.map((y) => y?.why), ["none", "gone", "none", "tool"]), peeks);
  // (two plain rocks a tile apart with a tile between them, for the go asked with `quake`)
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
  t.check("a go asked with `quake`, by a pick that has pkQuake, from between two plain rocks: answered as the code answers it (both are among what broke), and counted once in the purse (powers.pkQuake)", !!pair && x.agrees && x.a.ok && x.a.broke.length >= 2 && x.a.broke.includes(pair.a.id) && x.a.broke.includes(pair.b.id)
    && same(x.a.purse.powers.pkQuake, { k: today, n: 1 }) && x.a.got.find((g) => g[0] === "stone")[1] === x.a.broke.length && x.a.cost === 1, x.off.length ? x.off : x.a);
  ds = await deedsSince((await lastDeed()) - x.a.broke.length);
  t.check("…each rock that broke written down, each with `how: quake`", ds.length === x.a.broke.length && ds.every((d) => d.what === "mine" && d.doc.how === "quake" && d.member_id === U.m1), ds);

  t.section("a floor broken through; a resting floor reached; the lift");
  const DRILL = { item: "pick", n: 1, plus: 10, opts: ["pkPeek", "pkLoose", "pkDrill"] };
  await tick(5000);
  await miner(U.m1, DRILL); await miner(U.m2);
  x = await reach(U.m1, 10);
  t.check("a resting floor is no stop of the lift while the way down to it is shut today, whatever the page says", x.agrees && x.a.ok === true && x.a.reached === false && same(x.a.caveMine.rests, []), x.off.length ? x.off : x.a);
  let rides = [await lift(U.m1, 10), await lift(U.m1, 0)];
  t.check("the lift goes to the mouth for anybody, and to no floor that was not reached", rides.every((y) => y.agrees) && rides[0].a.why === "none" && rides[1].a.ok === true && rides[1].a.at === null, rides.map((y) => (y.off.length ? y.off : y.a)));
  const arrive9 = laidOn(9, today).arrive, delveWas = await pointsOf(U.m1);
  x = await drill(U.m1, arrive9);
  t.check("town_drill with a pick that has pkDrill, on the ninth floor, from where one comes down into it: the way down is open on the free tile beside, for everybody; counted once in the purse (powers.pkDrill); and the tenth floor is the deepest reached", x.agrees && x.a.ok === true && x.a.left === 2
    && same(x.a.cave.ways["9"], { x: x.a.at[0], y: x.a.at[1], rock: null, name: NAME[U.m1] }) && same(x.a.cave.deepest, { floor: 10, by: U.m1, name: NAME[U.m1], at: NOW }) && same(x.a.purse.powers.pkDrill, { k: today, n: 1 }), x.off.length ? x.off : x.a);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("…written down as a way down found, by the pick, with the tile it opened on; and counted as one", same(ds.map((d) => [d.member_id, d.what, d.doc.floor, d.doc.how, d.doc.tile]), [[U.m1, "delve", 9, "drill", x.a.at]]) && (await pointsOf(U.m1)) > delveWas, ds);
  // (a tile in the rock, with floor beside it: no place to stand, whatever the page says; the code asks only which floor it is of)
  const k8 = CS.cornerOf(8);
  let inRock = null;
  for (let v = 0; v < K.at.size && !inRock; v++) for (let u = 0; u < K.at.size && !inRock; u++) {
    if (laidOn(8, today).open[v * K.at.size + u] === "0" && [[1, 0], [0, 1], [-1, 0], [0, -1]].some(([dx, dy]) => CS.floorTile(8, today, k8.x + u + dx, k8.y + v + dy))) inRock = [k8.x + u, k8.y + v];
  }
  const drills = [await drill(U.m1, arrive9), await drill(U.m1, laidOn(10, today).arrive), await drill(U.m2, laidOn(8, today).arrive), await drill(U.m1, [40, 230]), await drill(U.m1, inRock)];
  t.check("where the way is open already: open; on a resting floor: none; with a pick that cannot: tool; off the cave: none; from a tile in the rock: here. Nothing changes by any of it", drills.every((y) => y.agrees)
    && same(drills.map((y) => y.a.why), ["open", "none", "tool", "none", "here"]), drills.map((y) => (y.off.length ? y.off : y.a.why)));
  const more = [await drill(U.m1, laidOn(8, today).arrive), await drill(U.m1, laidOn(7, today).arrive), await drill(U.m1, laidOn(6, today).arrive)];
  t.check("pkDrill is counted by the day, as the catalog says: once its count is used up the answer is `spent`", more.every((y) => y.agrees) && same(more.map((y) => y.a.left ?? y.a.why), [1, 0, "spent"]) && same(Object.keys(more[2].a.purse.powers), ["pkDrill"]), more.map((y) => (y.off.length ? y.off : y.a)));
  const reaches = [await reach(U.m1, 10), await reach(U.m1, 10), await reach(U.m2, 10), await reach(U.m1, 9), await reach(U.m1, 20), await reach(U.m1, 40), await reach(U.m1, null)];
  t.check("with the ninth floor's way open, the tenth is a stop of the lift for whoever comes to it: once; not a floor that is no resting floor, not one whose way is shut, not one there is none of", reaches.every((y) => y.agrees)
    && same(reaches.map((y) => y.a.reached), [true, false, true, false, false, false, false]) && same(reaches[0].a.caveMine.rests, [10]) && same((await purseNow(U.m2)).mine.rests, [10]) && same((await call(U.m1, "town_cave", 0, null, null)).cave.rests, [10]),
    reaches.map((y) => (y.off.length ? y.off : y.a.reached)));
  rides = [await lift(U.m1, 10), await lift(U.m1, 0), await lift(U.m1, 20), await lift(U.m1, null)];
  t.check("the lift takes them to the tenth floor, to the tile beside its lift; to the mouth; and to no floor they have not reached", rides.every((y) => y.agrees) && same(rides[0].a.at, laidOn(10, today).liftAt) && rides[1].a.at === null
    && rides[2].a.why === "none" && rides[3].a.why === "none" && same((await deedsSince((await lastDeed()) - 2)).map((d) => [d.what, d.n]), [["lift", 10], ["lift", 0]]), rides.map((y) => (y.off.length ? y.off : y.a)));

  t.section("a torch set down");
  await handed(U.m1, { hand: "torch", bag: bag(PICK, { item: "torch", n: 2 }) });
  const tAt = laidOn(3, today).arrive, k3 = CS.cornerOf(3), rock3 = rocksOn(3)[0];
  x = await torch(U.m1, tAt);
  const lit = NOW + K.light.burns;
  // (what a rock holds is rolled from the turn, and the turn is the real clock's: on some runs a rock that broke in the
  // scenes above let moss out, which glows a minute and is one more thing a page asks again for. It is counted in)
  t.check("a torch from the hand is set down on the floor one stands on: it burns for five minutes, for everybody, and there is one fewer in the bag; the page is to ask again when it burns out, if the rocks' turn (or moss that glows still) is not sooner", x.agrees && x.a.ok === true && x.a.until === lit
    && same(x.a.cave.torches, [{ f: 3, x: tAt[0], y: tAt[1], until: lit, by: U.m1 }]) && x.a.purse.bag[1].n === 1 && x.a.cave.again === Math.min(lit, (M.turnOf(NOW) + 1) * TURN, ...x.a.cave.moss.map((g) => g.until))
    && same((await call(U.m2, "town_cave", 0, null, null)).cave.torches, x.a.cave.torches), x.off.length ? x.off : x.a);
  await tick(MIN);
  x = await torch(U.m1, tAt);
  t.check("another on the same tile burns anew: one torch to a tile", x.agrees && x.a.ok === true && same(x.a.cave.torches, [{ f: 3, x: tAt[0], y: tAt[1], until: NOW + K.light.burns, by: U.m1 }]) && x.a.purse.bag[1] === null, x.off.length ? x.off : x.a);
  const torches = [await torch(U.m1, tAt)];
  await patch(U.m1, { bag: bag(PICK, { item: "torch", n: 5 }) });
  torches.push(await torch(U.m1, [k3.x, k3.y]), await torch(U.m1, [rock3.x, rock3.y]), await torch(U.m1, [40, 230]), await torch(U.m1, [null, null]));
  await patch(U.m1, { hand: "pick" });
  torches.push(await torch(U.m1, tAt));
  t.check("with none left there is no torch to set down; in the rock, on a rock's tile, on the mountain's foot, on no tile: not here; and a torch in the bag but not in the hand is not set down", torches.every((y) => y.agrees)
    && same(torches.map((y) => y.a.why), ["tool", "here", "here", "here", "here", "tool"]), torches.map((y) => (y.off.length ? y.off : y.a.why)));
  await tick(K.light.burns);
  t.check("five minutes on it has burnt out, and nobody is told of it", same((await call(U.m2, "town_cave", 3, null, null)).cave.torches, []) && same((await placeNow(3)).torches, []));

  t.section("the rocks' turn: whole again, and the way down stays for the day");
  const turnWas = M.turnOf(NOW);
  told = (await call(U.m1, "town_cave", 1, null, null)).cave;
  t.check("before the turn: rocks are gone on the foot and on several floors, and ways are open", Object.keys(told.gone).length >= 3 && told.gone["1"].length >= 3 && same(Object.keys(told.ways), ["1", "7", "8", "9"]), [told.gone, told.ways]);
  await clock((turnWas + 1) * TURN + 1000);
  s = await stateNow();
  await handed(U.m1); await handed(U.m2);
  told = (await call(U.m1, "town_cave", 1, null, null)).cave;
  t.check("at the next turn every rock is back but the one each way down was found under, and the day's crystal rock: the ways are open still, the board is as it was, nothing is being broken",
    told.turn === turnWas + 1 && same(told.gone, { 1: [wayId], [crystal.floor]: [crystal.rock] }) && same(Object.keys(told.ways), ["1", "7", "8", "9"]) && told.deepest.floor === 10 && same(told.struck, {})
    && same(told, toldOf(s, await purseNow(U.m1), U.m1, 1, null, NOW)), told);
  t.check("…and nothing was cleared to make it so: what was kept is read as it is now", (await caves()).some((c) => c.place === 1 && c.doc.broken.turn === turnWas && c.doc.broken.ids.length >= 3));
  need = await swingsOf(U.m1, 1);
  x = await strike(U.m1, 1, spot.rock.id, spot.at, need);
  t.check("a rock broken last turn stands again, whole, and is broken again", x.agrees && x.a.ok === true && same(x.a.broke, [spot.rock.id]) && x.a.part === 1, x.off.length ? x.off : x.a);

  t.section("the day turns");
  const dawn = (today + 1) * 86_400_000 - 7 * 3_600_000 + CODE.rules.dawn * 3_600_000, rows = await caves(), deeds0 = await written();
  await clock(dawn + 5000);
  today += 1;
  await handed(U.m1, { mine: { ...(await purseNow(U.m1)).mine, vein: null } });
  const purse0 = await purseNow(U.m1);
  did = await gate(U.m1, ([, reads]) => reads);
  t.check("a new day whose floors the site has not laid yet: every function that reads a floor answers `unlaid`, and nothing is held, kept or written down", did.length === GATED.filter(([, reads]) => reads).length
    && did.every((y) => y?.ok === false && y.why === "unlaid" && y.now === NOW && y.purse === undefined) && same(await caves(), rows) && (await written()) === deeds0 && same(await purseNow(U.m1), purse0), did);
  r = await lay("service", today);
  t.check("the site lays the new day", !r.error && r.affected === K.floors, r);
  s = await stateNow();
  const crystal2 = crystalOn();
  told = (await call(U.m1, "town_cave", crystal2.floor, null, null)).cave;
  t.check("yesterday's cave is read as a new day's: no way open, nobody deepest, no rock gone, the crystal rock whole where the new day has it; and what was kept of yesterday was not touched", told.day === today && same(told.ways, {}) && told.deepest === null
    && same(told.gone, {}) && same(told.crystal, crystal2) && same(await caves(), rows) && same(told, toldOf(s, await purseNow(U.m1), U.m1, crystal2.floor, null, NOW)), told);
  spot = find(1, PICK, plain, s);
  need = await swingsOf(U.m1, 1);
  x = await strike(U.m1, 1, spot.rock.id, spot.at, need);
  t.check("a rock of the first floor as it is laid today is broken: the floor's document is the new day's from then on", x.agrees && x.a.ok === true && same(x.a.broke, [spot.rock.id]) && (await placeNow(1)).day === today && (await placeNow(1)).way === null, x.off.length ? x.off : x.a);
  rides = [await lift(U.m1, 10), await reach(U.admin, 10)];
  t.check("the lift's stops are the member's own, and are kept over the day's turn; and nobody reaches the tenth floor anew while the ninth's way is shut again", rides[0].agrees && same(rides[0].a.at, laidOn(10, today).liftAt) && same((await purseNow(U.m1)).mine.rests, [10]) && rides[1].agrees && rides[1].a.reached === false,
    rides.map((y) => (y.off.length ? y.off : y.a)));

  t.section("a vein played out: told by its page, believed within the rules");
  /** A vein opened by a member: a rock that hides one for their pick (a gem's or not) is found and broken. Where this turn has none, the turns to come are looked through. */
  async function openVein(who, pick, gem, more = {}) {
    for (let i = 0; i < 60; i++) {
      await miner(who, pick, more);
      const hit = findAny(pick, (h) => h.kind === "vein" && h.gem === gem, await stateNow());
      if (hit) { const y = await strike(who, hit.floor, hit.rock.id, hit.at, 200); return { ...hit, x: y, vein: y.a.vein }; }
      await clock((M.turnOf(NOW) + 1) * TURN + 1000);
    }
    throw new Error("no rock hides such a vein in sixty turns");
  }
  const v1 = await openVein(U.m1, PICK, false), face1 = V.faceOf(v1.vein.seed, false), best1 = V.bestRoute(face1, v1.vein.mods), veinWas = await pointsOf(U.m1);
  x = await playVein(U.m1, best1.strikes);
  t.check("a vein played by its best go: the page says what the crack passed, and the database gives what the trial's keeper gives for the same strikes on the same face: two fragments of the floor's ore a glinting cell, and the vein is played out",
    v1.x.agrees && x.agrees && x.a.ok === true && best1.passed >= 2 && x.a.passed === best1.passed && x.a.of === face1.points.length && same(x.a.got, [[M.oreOf(v1.floor), best1.passed * K.vein.ore]]) && x.a.again === false && x.a.caveMine.vein === null
    && (await purseNow(U.m1)).mine.vein === null, [v1.x.off, x.off.length ? x.off : x.a]);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("…written down with the strikes as they were made and the whole of what was said, with the seed of the face and what the go was played with: so that the go can be played again on its face, and held to its account",
    ds[0].what === "vein" && ds[0].thing === M.oreOf(v1.floor) && ds[0].n === best1.passed && same(ds[0].doc.strikes, best1.strikes) && same(ds[0].doc.said, { ore: best1.passed, gems: [], seed: v1.vein.seed, mods: v1.vein.mods, more: 0 })
    && VA.accountOf(v1.vein, ds[0].doc.strikes).ore === ds[0].doc.said.ore && (await pointsOf(U.m1)) >= veinWas + CODE.work.mining.vein, ds);
  const logged = await call(U.m1, "town_try", "mining", "vein", "ore", "done", false, x.a.of, x.a.passed, 0, 12.5);
  t.check("the go at the board is taken by the log of every go (v166's `town_try`), as the page sends it: the game `mining`, the board `vein`", logged === true
    && same(await one(`select game, board, what, how, need, hits from public.town_tries where member_id = $1 order by at desc limit 1`, [U.m1]), { game: "mining", board: "vein", what: "ore", how: "done", need: x.a.of, hits: x.a.passed }), logged);
  // a gem's vein, opened with a pick that has pkCutter and pkSteady
  const CUT = { item: "pick", n: 1, plus: 6, opts: ["pkCutter", "pkSteady"] };
  // (the go played is the one that passes the most of the gem's cells: so that the gem's share is in the scene, whatever the face)
  const v2 = await openVein(U.m1, CUT, true), face2 = V.faceOf(v2.vein.seed, true), chip2 = TOOLS.GEMS[v2.vein.gem]?.chip;
  const best2 = { strikes: V.bestRoute({ ...face2, points: face2.points.filter((p) => p.gem > 0) }, v2.vein.mods).strikes }, said2 = VA.accountOf(v2.vein, best2.strikes), cut2 = said2.gems, ore2 = said2.ore;
  x = await playVein(U.m1, best2.strikes);
  t.check("a gem's vein: of the floor's element of the day, with the vein's `more` and its strikes by the database's own reckoning when the rock broke (pkCutter, pkSteady); the gem's cells passed give their fragments and the vein's `more`, the others ore",
    v2.x.agrees && v2.vein.gem === M.elementOf(WORD, v2.floor, today) && v2.vein.more === 1 && v2.vein.mods.strikes === K.pick.strikes[6] + K.pick.opts.pkSteady.n.strikes && x.agrees && x.a.ok === true
    && cut2.length >= 1 && same(x.a.got, [...(ore2 ? [[M.oreOf(v2.floor), ore2 * K.vein.ore]] : []), [chip2, cut2.reduce((a, b) => a + b, 0) + 1]]), [v2.x.off, x.off.length ? x.off : x.a, v2.vein, said2]);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("…written down as a gem's vein, with the gem's cells that were said", ds[0].what === "vein" && ds[0].doc.gem === v2.vein.gem && same(ds[0].doc.said.gems, cut2) && (cut2.length ? ds[0].doc.chip === chip2 : ds[0].doc.chip === undefined), ds);

  t.section("a vein's account that is not so");
  const v3 = await openVein(U.m1, PICK, false), honest3 = VA.accountOf(v3.vein, V.bestRoute(V.faceOf(v3.vein.seed, false), v3.vein.mods).strikes);
  let mark = await lastDeed(), was = await purseNow(U.m1);
  const strangers = [await call(U.m1, "town_vein", { ...honest3, seed: honest3.seed + 1 }), await call(U.m1, "town_vein", { ...honest3, again: true }), await call(U.m1, "town_vein", null), await call(U.m1, "town_vein", JSON.stringify("a go")),
    await call(U.m2, "town_vein", honest3)];
  t.check("an account of another vein than the one that is open, of its second go, no account at all, and one from somebody with no vein open: nothing is done, and the vein waits", strangers.every((y) => y?.ok === false && y.why === "none")
    && strangers[0].caveMine.vein.seed === v3.vein.seed && same(await purseNow(U.m1), was) && (await lastDeed()) === mark, strangers.map((y) => y?.why ?? y));
  const pointsWas3 = await pointsOf(U.m1);
  let lied = await call(U.m1, "town_vein", { ...honest3, of: K.vein.points[1] + 1, ore: K.vein.points[1] + 1 });
  ds = await deedsSince(mark);
  t.check("an account that no face could have come to (a face of seven glinting cells): nothing is paid, the vein is closed, and it is written down apart with all that was said and why it could not be", lied?.ok === false && lied.why === "odd" && lied.caveMine.vein === null
    && same(await purseNow(U.m1), { ...was, mine: { ...was.mine, vein: null } }) && ds.length === 1 && ds[0].what === "vein_odd" && ds[0].n === 0 && ds[0].doc.how === "of" && ds[0].doc.said.ore === K.vein.points[1] + 1
    && ds[0].doc.seed === v3.vein.seed && same(ds[0].doc.mods, v3.vein.mods) && (await pointsOf(U.m1)) === pointsWas3, [lied, ds]);
  lied = await call(U.m1, "town_vein", honest3);
  t.check("…and the vein is not to be told again, truly or not", lied?.ok === false && lied.why === "none", lied);
  const odds = [];
  for (const [why, said] of [["shape", { struck: "6" }], ["strikes", { strikes: [[6, 0]] }], ["struck", { struck: v3.vein.mods.strikes + 1, strikes: Array.from({ length: 12 }, () => [1, 1]) }], ["gems", { gems: [2] }], ["passed", { of: 4, ore: 5 }], ["far", { struck: 1, ore: 3 }]]) {
    const v = await openVein(U.m1, PICK, false), y = await call(U.m1, "town_vein", { ...VA.accountOf(v.vein, []), strikes: Array.from({ length: 6 }, (_, i) => [i, 0]), struck: 6, of: 6, ore: 2, ...said });
    odds.push([why, y?.why, (await deedsSince((await lastDeed()) - 1))[0]?.doc.how]);
  }
  t.check("each thing the rules hold an account to, past its edge: more strikes than a go has, a strike off the face, a gem's cell in a vein that is no gem's, more cells passed than the face has or than the crack could have run through", odds.every(([why, got, how]) => got === "odd" && how === why), odds);
  // what believing the page costs: the fullest face there could be, every cell of it passed
  const v4 = await openVein(U.m2, PICK, false), S4 = v4.vein.mods.strikes;
  const lie = { seed: v4.vein.seed, again: false, strikes: Array.from({ length: S4 }, (_, i) => [i % K.vein.size, 0]), struck: S4, of: K.vein.points[1], ore: K.vein.points[1], gems: [] };
  lied = await call(U.m2, "town_vein", lie);
  ds = await deedsSince((await lastDeed()) - 1);
  const again4 = VA.accountOf(v4.vein, ds[0].doc.strikes);
  t.check("WHAT BELIEVING THE PAGE COSTS: a page that says it passed every cell of the fullest face there could be is paid for six cells, twelve fragments, whatever the face was. It shows afterwards: the strikes written down, played again on the face of the seed written down, do not come to what was said",
    lied?.ok === true && same(lied.got, [[M.oreOf(v4.floor), K.vein.points[1] * K.vein.ore]]) && same(VA.mostOf(v4.vein), { ore: 12, gems: 0 }) && ds[0].what === "vein" && ds[0].doc.said.ore === K.vein.points[1]
    && !same([again4.of, again4.ore, again4.struck], [lie.of, lie.ore, lie.struck]), [lied, again4]);

  t.section("a twin vein; a bag with no room; a vein opened with no stamina left");
  const TWIN = { item: "pick", n: 1, plus: 10, opts: ["pkPeek", "pkLoose", "pkTwin"] };
  const v5 = await openVein(U.m1, TWIN, false), best5 = V.bestRoute(V.faceOf(v5.vein.seed, false), v5.vein.mods);
  x = await playVein(U.m1, best5.strikes);
  const after5 = await pointsOf(U.m1);
  t.check("a vein played with a pick that has pkTwin: the answer says `again`, the vein is kept as its second go, and it is counted once in the purse (powers.pkTwin)", x.agrees && x.a.ok === true && x.a.again === true && same(x.a.caveMine.vein, { ...v5.vein, again: true })
    && same((await purseNow(U.m1)).powers.pkTwin, { k: today, n: 1 }), x.off.length ? x.off : x.a);
  x = await playVein(U.m1, best5.strikes);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("the second go gives what it passes again, is written down as the second, counts for nothing more on the line, and there is no third", x.agrees && x.a.ok === true && x.a.again === false && x.a.caveMine.vein === null && ds[0].doc.again === true
    && (await pointsOf(U.m1)) === after5 && (await call(U.m1, "town_vein", VA.accountOf({ ...v5.vein, again: true }, best5.strikes))).why === "none", x.off.length ? x.off : [x.a, ds]);
  const v6 = await openVein(U.m2, PICK, false, { stamina: { day: dayOf(NOW), left: 1 } }), best6 = V.bestRoute(V.faceOf(v6.vein.seed, false), v6.vein.mods);
  await patch(U.m2, { bag: bag(PICK, ...Array.from({ length: 9 }, () => ({ item: "boot", n: 1 }))) });
  x = await playVein(U.m2, best6.strikes);
  t.check("a vein opened with the last of the day's stamina is played tired, with two strikes fewer: the database's to say, not the page's. With no room for what it gives it is not played out: `full`, and it waits", v6.x.agrees
    && same(v6.vein.mods, { strikes: K.pick.strikes[0] - K.vein.tired.fewer, back: 0, cross: 0, spent: true }) && x.agrees && x.a.why === "full" && x.a.caveMine.vein.seed === v6.vein.seed, [v6.x.off, x.off.length ? x.off : x.a]);
  await patch(U.m2, { bag: bag(PICK) });
  x = await playVein(U.m2, best6.strikes);
  ds = await deedsSince((await lastDeed()) - 1);
  t.check("with room made it is: and written down as a go played with no stamina", x.agrees && x.a.ok === true && x.a.passed === best6.passed && ds[0].what === "vein" && ds[0].doc.spent === true, x.off.length ? x.off : x.a);

  t.section("the file run once more, over what has been done since");
  // (the far side is open, a day and its morrow are laid, rocks are broken on many floors, ways were opened, veins played, purses hold stone)
  const v7 = await openVein(U.m1, PICK, false);
  const kept = async () => ({ caves: await caves(), p1: await purseNow(U.m1), p2: await purseNow(U.m2), deeds: await written(), far: (await one(`select value from public.town_knobs where key = 'far_open'`)).value,
    days: (await one(`select count(*)::int as n from public.town_cave_days`)).n, word: (await one(`select town.mine_word() as w`)).w,
    work: (await t.sql(`select member_id, line, kept from public.town_work order by 1, 2`)).rows, told: (await call(U.m1, "town_cave", 1, null, null)).cave });
  const was7 = await kept();
  let ran = null;
  try { await t.sql(sql); } catch (e) { ran = e.message; }
  const now7 = await kept();
  t.check("it runs, and changes nothing: the cave's places, both purses (a vein open among them), the deeds, the lines, the days laid, the rocks' word, the far side open, and what a member is told", ran === null && same(now7, was7) && was7.caves.length >= 8 && was7.far === 1
    && was7.p1.mine.vein?.seed === v7.vein.seed, { ran, differ: Object.keys(was7).filter((k) => !same(was7[k], now7[k])) });
  x = await playVein(U.m1, V.bestRoute(V.faceOf(v7.vein.seed, false), v7.vein.mods).strikes);
  await tick(5000);
  s = await stateNow();
  spot = find(2, PICK, plain, s);
  const after7 = await strike(U.m1, 2, spot.rock.id, spot.at, 200);
  t.check("…and the game goes on over it: the vein that was open is played out, and a rock is broken", x.agrees && x.a.ok === true && after7.agrees && after7.a.ok === true && after7.a.broke.includes(spot.rock.id), [x.off, after7.off]);
}
