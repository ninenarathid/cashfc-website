// v164's felling part through the functions a member calls, against the stand-in database (try-v164.mjs plays this,
// with the base run first): who may ask; a tree begun and felled on its board, by the plain press, by the ancient
// tree's own asking; one go on a tree at a time; a friend at the trunk, paid into their own purse; a keepsake found
// once; a cord and a bag with no room; what the browser says of a go, held to its bounds; then three members at the
// trees for a few hundred calls, the clock moving. Every call is made of the database and, on what the database kept
// before it, of the code itself (lib/town/trees, with the numbers of chance the database is about to draw read off
// first): the answer, both purses and the grove are held to what the code says. Last, the file run once more over all
// of it.
export default async function (ctx) {
  const { t, U, call, one, same, CODE, give, patch, root, sql } = ctx;
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const T = await import("@/lib/town/trees");
  const { farTrees, farCedar } = await import("@/lib/town/far-side");
  const { dayOf } = await import("@/lib/town/stamina");
  const K = CODE.trees, wood = T.woodOf(farTrees(), farCedar());
  const pines = wood.filter((w) => w.tier === 1 && !w.elder), elder = wood.find((w) => w.elder), upper = wood.find((w) => w.tier === 2);
  const apart = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
  const NAME = { [U.m1]: "Member One", [U.m2]: "Member Two", [U.admin]: "Aqua Admin" };
  const SEC = 1000, MIN = 60 * SEC;
  const no = (r) => r?.code === "42501";
  const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);
  const bag = (...stacks) => Array.from({ length: 10 }, (_, i) => stacks[i] ?? null);
  const axe = (more = {}) => ({ item: "axe", n: 1, ...more });
  const beside = (w) => (w.elder ? [w.x - 1, w.y + 1] : [w.x - 1, w.y]);
  const held = (purse, id) => (purse.bag ?? []).reduce((n, s) => n + (s && s.item === id ? s.n : 0), 0)
    + Object.values(purse.pouches ?? {}).flat().reduce((n, s) => n + (s && s.item === id ? s.n : 0), 0);

  /* ── the test's clock in the place of the database's (after the part's own functions were held to what they were) ── */
  const NOON = Date.parse("2026-10-09T12:00:00+07:00");
  let NOW = NOON;
  await t.sql(`create table if not exists town.test_clock (ms bigint not null);
    delete from town.test_clock where true;
    insert into town.test_clock values (${NOON});
    create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  const clock = async (ms) => { NOW = ms; await t.sql(`update town.test_clock set ms = ${ms} where true`); };
  const on = (ms) => clock(NOW + ms);

  /* ── what is kept, read as the rules read it ── */
  const groveKept = async () => (await one(`select doc from public.town_things where key = 'grove'`)).doc;
  const purseAs = async (who) => (await one(`select town.purse_of($1::uuid, false) as p`, [who])).p;
  const lastDeed = async () => Number((await one(`select coalesce(max(id), 0)::int as n from public.town_deeds`)).n);
  const deedsAfter = async (id) => (await t.sql(`select member_id, what, thing, n::float8 as n, coins::float8 as coins, doc from public.town_deeds where id > $1 order by id`, [id])).rows;
  const points = async (who, line) => Number((await one(`select coalesce((town.work_told($1::uuid, town.now_ms())->($2::text)->>'points')::numeric, 0) as p`, [who, line])).p);
  /** A member about to fell: an axe in the first slot and in the hand, rested, nothing kept of the line. */
  const fresh = (who, stack = axe(), more = {}) => patch(who, { bag: bag(stack), hand: "axe", handAt: 0, stamina: { day: dayOf(NOW), left: 100 }, powers: {}, felling: {}, pouches: {}, ...more });

  /**
   * The numbers of chance the database's next call will draw, in order: the seed is set, they are read off, and the
   * seed is set again, so that the call draws the same ones. `fits`: asked of each set until one fits (a keepsake that
   * falls, one that does not).
   */
  let seeded = 0;
  const chance = async (n, fits = () => true) => {
    for (let tries = 0; tries < 4000; tries++) {
      const s = (((++seeded) * 0.6180339887) % 1) * 2 - 1;
      await t.sql(`select setseed($1::double precision)`, [s]);
      const drawn = (await t.sql(`select random()::float8 as r from generate_series(1, $1::int)`, [n])).rows.map((r) => Number(r.r));
      if (!fits(drawn)) continue;
      await t.sql(`select setseed($1::double precision)`, [s]);
      return drawn;
    }
    throw new Error("no numbers of chance fit what the scene asks for");
  };
  const luckOf = (drawn) => Array.from({ length: K.echo.trees }, (_, i) => ({ dark: drawn[i * 6], scent: drawn[i * 6 + 1], which: drawn[i * 6 + 2], chain: drawn[i * 6 + 3], keep: drawn[i * 6 + 4], kind: drawn[i * 6 + 5] }));
  /** No keepsake from any tree of the go (so that a scene's wood is all there is to count). */
  const plainLuck = (drawn) => luckOf(drawn).every((l) => !(l.keep < 1 / K.keepsake.in));

  /**
   * Each of the five functions, asked of the database and of the code: `ok` says the answer, what is kept of the
   * grove and of every purse it touched, and what was written down are all as the code says; `why` says what was not.
   */
  const told = (grove, purse) => T.toldOf(grove, purse, NOW, wood);
  const differs = (pairs) => pairs.filter(([, a, b]) => !same(a, b)).map(([name, a, b]) => `${name}: ${JSON.stringify(a)?.slice(0, 500)} is not ${JSON.stringify(b)?.slice(0, 500)}`);
  async function look(who) {
    const grove = T.tidied(T.groveOf(await groveKept()), NOW, wood), purse = await purseAs(who);
    const got = await call(who, "town_trees");
    const off = differs([["trees", got?.trees, told(grove, purse)], ["purse", got?.purse, purse], ["now", got?.now, NOW]]);
    return { got, ok: off.length === 0, why: off };
  }
  async function begin(who, tree, at, fits) {
    const [r] = await chance(1, fits), was = await groveKept(), purse = await purseAs(who);
    const grove = T.tidied(T.groveOf(was), NOW, wood);
    const want = T.begin(purse, grove, tree, at, NOW, Math.floor(r * 2 ** 31), wood, who);
    const got = await call(who, "town_fell_begin", tree, at[0], at[1]);
    const kept = await groveKept(), after = want.ok ? T.opened(grove, who, want.trees, NOW) : was;
    const off = differs([
      ["the answer", got?.ok === true ? { ok: true, trees: got.group, ask: got.ask, elder: got.elder } : { ok: got?.ok, why: got?.why }, want],
      ["the grove kept", kept, after], ["the purse kept", await purseAs(who), purse], ["the purse told", got?.purse, purse],
      ["the trees told", got?.trees, told(want.ok ? after : grove, purse)], ["now", got?.now, NOW],
    ]);
    return { got, want, ok: off.length === 0, why: off };
  }
  async function fell(who, went, at, fits = () => true) {
    const drawn = await chance(K.echo.trees * 6, fits), was = await groveKept(), purse = await purseAs(who), before = await lastDeed();
    const grove = T.tidied(T.groveOf(was), NOW, wood);
    const want = T.fell(purse, grove, who, went, at, NOW, luckOf(drawn), wood, NAME[who]);
    const friend = want.ok ? want.braced : null, theirs = friend ? await purseAs(friend) : null;
    const got = await call(who, "town_fell", went, at[0], at[1]);
    const kept = await groveKept(), mine = await purseAs(who), written = await deedsAfter(before);
    const pairs = [["the purse told", got?.purse, mine], ["now", got?.now, NOW]];
    if (!want.ok) {
      pairs.push(["the answer", { ok: got?.ok, why: got?.why }, want], ["the grove kept", kept, was], ["the purse kept", mine, purse], ["what was written down", written, []], ["the trees told", got?.trees, told(grove, purse)]);
    } else {
      const { purse: _p, grove: _g, found, ...rest } = want;
      const { purse: _q, trees: _t, now: _n, keeps, ...answered } = got ?? {};
      pairs.push(["the answer", { ...answered, found: keeps }, { ...rest, found }], ["the grove kept", kept, want.grove], ["the purse kept", mine, want.purse], ["the trees told", got?.trees, told(want.grove, want.purse)]);
      if (friend) pairs.push(["the friend's purse kept", await purseAs(friend), T.bracePay(theirs).purse]);
      // one deed a tree, the feller's, with what the code counts a tree by; and the friend's, when a trunk was braced
      const mineDeeds = written.filter((d) => d.what === "fell"), wantDeeds = want.felled.map((f, i) => ({
        member_id: who, what: "fell", thing: f.kind, n: 1,
        doc: { tree: f.id, misses: f.misses, girth: f.girth, timber: f.timber, ...(want.plain ? { how: "plain" } : want.one ? { how: "one" } : {}), ...(f.keepsake ? { keepsake: f.keepsake } : {}), ...(i === 0 && want.braced ? { braced: want.braced } : {}) },
      }));
      pairs.push(["the deeds of the trees", mineDeeds.map((d) => ({ member_id: d.member_id, what: d.what, thing: d.thing, n: d.n, doc: Object.fromEntries(["tree", "misses", "girth", "timber", "how", "keepsake", "braced"].filter((k) => k in d.doc).map((k) => [k, d.doc[k]])) })), wantDeeds]);
      pairs.push(["the friend's deed", written.filter((d) => d.what === "brace").map((d) => [d.member_id, d.thing, d.n, d.doc.tree, d.doc.feller]),
        friend ? [[friend, want.felled[0].kind, T.bracePay(theirs).got.length ? K.brace.logs : 0, want.felled[0].id, who]] : []]);
      pairs.push(["nothing else written down", written.filter((d) => d.what !== "fell" && d.what !== "brace").length, 0]);
    }
    const off = differs(pairs);
    return { got, want, written, drawn, ok: off.length === 0, why: off };
  }
  async function brace(who, feller, at) {
    const was = await groveKept(), purse = await purseAs(who), before = await lastDeed();
    const grove = T.tidied(T.groveOf(was), NOW, wood);
    const want = T.braceGo(grove, who, feller, at, NOW, wood);
    const got = await call(who, "town_fell_brace", feller, at[0], at[1]);
    const kept = await groveKept();
    const off = differs([
      ["the answer", got?.ok === true ? { ok: true, tree: got.tree } : { ok: got?.ok, why: got?.why }, want.ok ? { ok: true, tree: want.tree } : want],
      ["the grove kept", kept, want.ok ? want.grove : was], ["the purse kept", await purseAs(who), purse], ["the purse told", got?.purse, purse],
      ["the trees told", got?.trees, told(want.ok ? want.grove : grove, purse)], ["what was written down", await deedsAfter(before), []],
    ]);
    return { got, want, ok: off.length === 0, why: off };
  }
  async function rootBack(who, tree) {
    const was = await groveKept(), purse = await purseAs(who), before = await lastDeed();
    const grove = T.tidied(T.groveOf(was), NOW, wood);
    const want = T.rootBack(purse, grove, who, tree, NOW, wood);
    const got = await call(who, "town_fell_root", tree);
    const kept = await groveKept(), mine = await purseAs(who), written = await deedsAfter(before);
    const off = differs([
      ["the answer", got?.ok === true ? { ok: true, left: got.left } : { ok: got?.ok, why: got?.why }, want.ok ? { ok: true, left: want.left } : want],
      ["the grove kept", kept, want.ok ? want.grove : was], ["the purse kept", mine, want.ok ? want.purse : purse], ["the purse told", got?.purse, mine],
      ["the trees told", got?.trees, told(want.ok ? want.grove : grove, mine)],
      ["what was written down", written.map((d) => [d.member_id, d.what, d.doc.tree, d.doc.left]), want.ok ? [[who, "root", tree, want.left]] : []],
    ]);
    return { got, want, ok: off.length === 0, why: off };
  }

  // (a purse is kept whole the first time a function of the game keeps it: the three members' are, before anything
  // here writes a field of one by hand)
  for (const who of [U.m1, U.m2, U.admin]) await call(who, "town_hold", null);
  // the trees: three that stand together and the nine nearest them are the stories' patch; every other pine is a
  // scene's own, each used by one scene (nobody in a scene wears the echoing axe or has a gem in theirs: a tree's
  // neighbours are nothing to it there)
  const trio = pines.find((p) => pines.filter((o) => o.id !== p.id && apart(o, p) <= K.echo.reach).length >= 2);
  const patchOf = [trio, ...pines.filter((x) => x.id !== trio.id).sort((x, y) => apart(x, trio) - apart(y, trio) || x.id - y.id).slice(0, 9)];
  const pool = pines.filter((p) => !patchOf.includes(p));
  const tree = (girth) => { const i = pool.findIndex((p) => !girth || T.girthOf(p) === girth); if (i < 0) throw new Error("the scenes have used every pine of that girth"); return pool.splice(i, 1)[0]; };

  t.section("what the woodcutters' part should say afterwards (the queries at its foot)");
  const said = {
    fns: (await t.sql(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
      from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_trees', 'town_fell_begin', 'town_fell', 'town_fell_brace', 'town_fell_root') order by 1`)).rows,
    rules: await one(`select town.tree_kind(town.tree_of(0)) as a_pine, town.tree_kind(town.tree_of(900)) as the_ancient_tree, town.tree_of(-1) is null as no_tree,
      jsonb_array_length(town.keepsake_ids()) as keepsakes, town.deed_th('fell') as a_word,
      town.work_counts_of('{"from": "deed", "what": "fell", "thing": "pine", "n": 1, "doc": {}}'::jsonb, 'me') as a_pine_counts`),
    trees: (await one(`select town.trees_told((select doc from public.town_things where key = 'grove'), '{}'::jsonb, town.now_ms()) as t`)).t,
  };
  t.check("the five functions a member calls: definer, not for the signed out, for the signed in",
    same(said.fns, ["town_fell", "town_fell_begin", "town_fell_brace", "town_fell_root", "town_trees"].map((proname) => ({ proname, definer: true, anon: false, member: true }))), said.fns);
  t.check("a pine, the ancient tree, no tree; twelve keepsakes; a word for a tree felled; what a pine counts for",
    same(said.rules, { a_pine: "pine", the_ancient_tree: "elder", no_tree: true, keepsakes: 12, a_word: "ตัดต้นไม้", a_pine_counts: [{ to: null, raw: 2, line: "felling", first: "felling:pine" }] }), said.rules);
  t.check("the trees as the village has them on the first run: none down", same(said.trees, { down: [], half: [] }), said.trees);
  t.check("every deed of the woodcutters' has its word, and the words that were there are as they were",
    same(await one(`select town.deed_th('brace') as b, town.deed_th('root') as r, town.deed_th('lamp_light') as l, town.deed_th('no such deed') as x`), { b: "ช่วยค้ำต้นไม้ให้เพื่อน", r: "ปลุกตอไม้ให้โตคืนทันที", l: "จุดโคม", x: "no such deed" }));
  t.check("the catalog's keepsakes are weighed in the code's order, and every tree's girth is the code's own", same((await one(`select town.keepsake_ids() as k`)).k, T.KEEPSAKE_IDS) && wood.every((w) => K.wood.find((r) => r[0] === w.id)?.[5] === T.girthOf(w)) && pool.length >= 30 && patchOf.length === 10,
    { pool: pool.length });

  t.section("who may ask");
  const a = tree(), at = beside(a);
  const ASKS = [["town_trees"], ["town_fell_begin", a.id, at[0], at[1]], ["town_fell", { tree: a.id, plain: true, secs: 0 }, at[0], at[1]], ["town_fell_brace", U.admin, at[0], at[1]], ["town_fell_root", a.id]];
  const ask = async (who) => { const out = []; for (const [fn, ...args] of ASKS) out.push(await call(who, fn, ...args)); return out; };
  await fresh(U.m1); await fresh(U.m2); await fresh(U.admin);
  const grove0 = await groveKept(), deeds0 = await lastDeed();
  t.check("the far side is built closed", Number((await one(`select value from public.town_knobs where key = 'far_open'`)).value) === 0);
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"], [U.guest, "a proved member, while the far side is closed (one not of the FC)"], [U.m1, "a proved member, while the far side is closed"]]) {
    const did = await ask(who);
    t.check(`refused, in all five functions: ${name}`, did.every(no), did.map((r) => r?.code ?? r));
  }
  t.check("…and nothing came of any of it: the grove as it was, nothing written down", same(await groveKept(), grove0) && (await lastDeed()) === deeds0);
  let did = await ask(U.admin);
  t.check("an admin is answered while it is closed: the trees, a board, a tree felled the plain way, nobody's go to brace, no root to wake",
    did.every((r) => !r?.error) && same(did[0].trees, { down: [], half: [] }) && did[1]?.ok === true && did[2]?.ok === true && did[2].felled?.[0]?.id === a.id && did[3]?.why === "none" && did[4]?.why === "none", did.map((r) => r?.error ?? r?.why ?? "ok"));
  await knob("far_open", 1);
  await on((K.go.secs + 1) * SEC);
  did = await ask(U.m1);
  t.check("opened by its knob, a proved member is answered (the tree is a stump by now, and says so)", did.every((r) => !r?.error) && did[0].trees?.down?.[0]?.id === a.id && did[1]?.why === "stump" && did[2]?.why === "stump", did.map((r) => r?.error ?? r?.why ?? "ok"));
  for (const [who, name] of [["anon", "somebody signed out"], [U.nochar, "a member with no character"], [U.unver, "a member whose character was never proved"]]) {
    const still = await ask(who);
    t.check(`still refused once it is open: ${name}`, still.every(no), still.map((r) => r?.code ?? r));
  }
  await knob("game_open", 0);
  did = await ask(U.m1);
  t.check("with the game itself shut, a proved member is refused, though the far side's own knob says open", did.every(no), did.map((r) => r?.code ?? r));
  await knob("game_open", 1);
  await t.sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
  await t.sql(`delete from public.town_deeds where what in ('fell', 'brace', 'root')`);
  await t.sql(`delete from public.town_work where line in ('felling', 'helpers')`);

  t.section("a tree begun, and felled on its board");
  for (const [girth, name] of [[1, "slender"], [2, "plain"], [3, "stout"]]) {
    const p = tree(girth), from = beside(p), knobs = K.girths[girth - 1];
    await fresh(U.m1);
    const b = await begin(U.m1, p.id, from);
    t.check(`a ${name} pine walked up to with a plain axe: a board of ${knobs.chops} chops in its own family, at its own pace, for that one tree, as the code says`, b.ok && b.got.ok === true && same(b.got.group, [p.id])
      && b.got.ask.chops === knobs.chops && b.got.ask.family === knobs.family && b.got.ask.pace === knobs.pace && b.got.ask.girth === girth && same(b.got.ask.trees, [{ id: p.id, girth, timber: knobs.timber }])
      && Number.isInteger(b.got.ask.seed) && b.got.ask.spent === false && b.got.elder === false, b.why.length ? b.why : b.got);
    t.check("…and its board is written down: the tree is mine for as long as a go is held", same((await groveKept()).goes, { [U.m1]: { trees: [p.id], at: NOW } }), (await groveKept()).goes);
    await on(9 * SEC);
    const before = { stamina: (await purseAs(U.m1)).stamina.left, points: await points(U.m1, "felling") };
    const f = await fell(U.m1, { tree: p.id, through: true, misses: 0, secs: 8.5 }, from, plainLuck);
    const mine = await purseAs(U.m1), kept = await groveKept();
    t.check(`cut through with no miss: ${K.logs} logs and every fine timber of its girth (${knobs.timber.length}), as the code says`, f.ok && f.got.ok === true && same(f.got.got, [["log", K.logs], ["timber", knobs.timber.length]])
      && held(mine, "log") === K.logs && held(mine, "timber") === knobs.timber.length && f.got.through === true && f.got.stood === false && same(f.got.keeps, []) && f.got.braced === null, f.why.length ? f.why : f.got);
    t.check("…the stamina a tree costs is paid, the tree is a stump of mine from this moment, and the go is over", mine.stamina.left === before.stamina - K.cost && same(kept.down[p.id], { at: NOW, by: U.m1 }) && kept.goes === undefined, { stamina: mine.stamina, kept });
    t.check("…one deed, with the tree, the misses, the girth and the fine timber; and the tile, the wood, the seconds and whether the hand was spent beside them",
      f.written.length === 1 && same(f.written[0], { member_id: U.m1, what: "fell", thing: "pine", n: 1, coins: 0, doc: { tree: p.id, misses: 0, girth, timber: knobs.timber.length, tile: from, got: [["log", K.logs], ["timber", knobs.timber.length]], secs: 8.5, spent: false } }), f.written);
    t.check(`…and it counts on the woodcutters' line: ${girth === 1 ? "a pine's points and the first of its kind" : "a pine's points"}`, (await points(U.m1, "felling")) === before.points + CODE.work.felling.pine + (girth === 1 ? CODE.work.first : 0), [before.points, await points(U.m1, "felling")]);
    const seen = await look(U.m2);
    t.check("…everybody is told the stump, with when it fell and when it is grown again", seen.ok && same(seen.got.trees.down.find((d) => d.id === p.id), { id: p.id, at: NOW, until: NOW + K.regrow * MIN }), seen.why.length ? seen.why : seen.got.trees);
  }
  {
    const p = tree(3), from = beside(p), bears = K.girths[2].timber;
    for (const [misses, through] of [[1, true], [2, true], [3, true], [4, true], [0, false]]) {
      await clock(NOW + (K.regrow + 1) * MIN);
      await fresh(U.m1);
      const b = await begin(U.m1, p.id, from);
      await on(9 * SEC);
      const f = await fell(U.m1, { tree: p.id, through, misses, secs: 8 }, from, plainLuck), fine = through ? bears.filter((x) => misses <= x).length : 0;
      t.check(through ? `a stout pine cut through with ${misses} miss${misses === 1 ? "" : "es"}: ${fine} fine timber, and its logs` : "a go that was lost (the bar ran out): the tree comes down all the same, for its logs alone",
        b.ok && f.ok && f.got.ok === true && same(f.got.got, fine ? [["log", K.logs], ["timber", fine]] : [["log", K.logs]]) && f.got.felled[0].misses === misses && f.got.through === through, f.why.length ? f.why : f.got);
    }
    t.check("…grown again by the clock, it was felled five times over, and counted each time", (await deedsAfter(0)).filter((d) => d.what === "fell" && d.doc.tree === p.id).length === 5);
  }

  t.section("the plain press");
  {
    const p = tree(3), from = beside(p);
    await fresh(U.m1);
    const f = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, from, plainLuck);
    t.check("a stout pine felled at once, with no board: its logs and no fine timber, written down as the plain way", f.ok && f.got.ok === true && f.got.plain === true && same(f.got.got, [["log", K.logs]]) && f.written[0]?.doc.how === "plain" && f.written[0].doc.timber === 0, f.why.length ? f.why : f.got);
    const again = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, from);
    t.check("pressed again, it is a stump: nothing is had twice", again.ok && again.got.why === "stump", again.why.length ? again.why : again.got);
    await fresh(U.m1, axe({ plus: 10 }));
    const old = await fell(U.m1, { tree: elder.id, plain: true, secs: 0 }, beside(elder));
    t.check("the ancient tree is not felled the plain way, by any axe", old.ok && old.got.why === "none", old.why.length ? old.why : old.got);
  }

  t.section("one go on a tree at a time");
  {
    const p = tree(), from = beside(p), other = [p.x + 1, p.y];
    await fresh(U.m1); await fresh(U.m2);
    const b = await begin(U.m1, p.id, from);
    const theirs = await begin(U.m2, p.id, other), press = await fell(U.m2, { tree: p.id, plain: true, secs: 0 }, other), played = await fell(U.m2, { tree: p.id, through: true, misses: 0, secs: 9 }, other);
    t.check("a tree whose board somebody has up is held: another member's board, plain press and go are all refused, and nothing of theirs changes", b.ok && theirs.ok && theirs.got.why === "held" && press.ok && press.got.why === "held" && played.ok && played.got.why === "held",
      [b.why, theirs.why, press.why, played.why, theirs.got?.why, press.got?.why, played.got?.why]);
    await on(K.go.secs * SEC);
    const still = await begin(U.m2, p.id, other);
    t.check(`at the last moment of the hold (${K.go.secs} seconds) it is held still`, still.ok && still.got.why === "held", still.why.length ? still.why : still.got);
    const mine = await begin(U.m1, p.id, from);
    t.check("its own member is never refused it: walking up again begins the hold anew", mine.ok && mine.got.ok === true && (await groveKept()).goes[U.m1].at === NOW, mine.why.length ? mine.why : mine.got);
    await on(K.go.secs * SEC + 1);
    const free = await begin(U.m2, p.id, other);
    t.check("a moment past the hold, the tree is free: the other member's board goes up, and the lapsed go is forgotten", free.ok && free.got.ok === true && same(Object.keys((await groveKept()).goes), [U.m2]), free.why.length ? free.why : (await groveKept()).goes);
    const late = await fell(U.m1, { tree: p.id, through: true, misses: 0, secs: 9 }, from);
    t.check("…and whoever walked away from it is refused in their turn: the tree pays one of them, never both", late.ok && late.got.why === "held", late.why.length ? late.why : late.got);
    await on(5 * SEC);
    const done = await fell(U.m2, { tree: p.id, through: true, misses: 0, secs: 5 }, other, plainLuck);
    t.check("the one whose board is up fells it", done.ok && done.got.ok === true && (await groveKept()).down[p.id].by === U.m2, done.why.length ? done.why : done.got);
  }

  t.section("a friend at the trunk");
  for (const [feller, friend] of [[U.m1, U.m2], [U.m2, U.m1]]) {
    const p = tree(), from = beside(p), near = [p.x + K.brace.reach, p.y + 1], far = [p.x + K.brace.reach + 1, p.y];
    await fresh(feller); await fresh(friend, axe(), { hand: null });
    const none = await brace(friend, feller, near);
    await begin(feller, p.id, from);
    const tooFar = await brace(friend, feller, far), self = await brace(feller, feller, from), took = await brace(friend, feller, near), twice = await brace(U.admin, feller, near);
    t.check(`${NAME[friend]} braces ${NAME[feller]}'s trunk from within the brace's reach: not before a board is up, not from further off, not one's own, not a trunk somebody braces already`,
      none.ok && none.got.why === "none" && tooFar.ok && tooFar.got.why === "far" && self.ok && self.got.why === "none" && took.ok && took.got.ok === true && took.got.tree === p.id && twice.ok && twice.got.why === "none"
      && (await groveKept()).goes[feller].braced === friend, [none.why, tooFar.why, self.why, took.why, twice.why, took.got]);
    await on(9 * SEC);
    const helpers = await points(friend, "helpers"), logs = held(await purseAs(friend), "log");
    const f = await fell(feller, { tree: p.id, through: true, misses: 1, secs: 9 }, from, plainLuck);
    t.check(`…the go over, the friend has a log in their own purse, a deed of their own, and a point on the helpers' line; the feller's deed says who braced (the two purses held in the order of their ids, ${feller < friend ? "the feller's" : "the friend's"} first)`,
      f.ok && f.got.ok === true && f.got.braced === friend && held(await purseAs(friend), "log") === logs + K.brace.logs && f.written.find((d) => d.what === "fell").doc.braced === friend
      && same(f.written.filter((d) => d.what === "brace").map((d) => [d.member_id, d.n, d.doc.feller]), [[friend, K.brace.logs, feller]]) && (await points(friend, "helpers")) === helpers + CODE.work.braced, f.why.length ? f.why : f.written);
  }
  {
    const p = tree(), from = beside(p);
    await fresh(U.m1);
    await fresh(U.m2, axe(), { hand: null, bag: bag(axe(), ...Array.from({ length: 9 }, () => ({ item: "boot", n: CODE.items.boot.stack }))) });
    await begin(U.m1, p.id, from);
    await brace(U.m2, U.m1, [p.x + 1, p.y]);
    await on(9 * SEC);
    const helpers = await points(U.m2, "helpers");
    const f = await fell(U.m1, { tree: p.id, through: false, misses: 2, secs: 4 }, from, plainLuck);
    t.check("a friend with no room for a log has none, and loses nothing; the tree fell all the same, and the point on the helpers' line is theirs",
      f.ok && f.got.ok === true && f.got.braced === U.m2 && held(await purseAs(U.m2), "log") === 0 && f.written.find((d) => d.what === "brace").n === 0 && (await points(U.m2, "helpers")) === helpers + CODE.work.braced, f.why.length ? f.why : f.written);
  }

  t.section("a keepsake, found once");
  {
    const p = tree(1), q = tree(1), fromP = beside(p), fromQ = beside(q);
    const falls = (id) => (drawn) => { const l = luckOf(drawn)[0]; return T.keepsakeFor(p, l.keep, l.kind) === id; };
    await fresh(U.m1); await fresh(U.m2);
    const first = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, fromP, falls("twinCones"));
    const mine = await purseAs(U.m1), kept = await groveKept();
    t.check("a pine lets twin cones fall: told as found for the first time, kept in the purse and never in the bag, and written in the village's book with who found it",
      first.ok && same(first.got.keeps, [{ id: "twinCones", first: true }]) && first.got.felled[0].keepsake === "twinCones" && same(mine.felling.keeps, { twinCones: 1 }) && !mine.bag.some((s) => s && s.item === "twinCones")
      && same(kept.book, { twinCones: { by: "Member One", at: NOW } }) && first.written[0].doc.keepsake === "twinCones" && same(first.got.trees.book, [["twinCones", "Member One"]]), first.why.length ? first.why : first.got);
    await on(3 * SEC);
    const second = await fell(U.m2, { tree: q.id, plain: true, secs: 0 }, fromQ, falls("twinCones"));
    t.check("another member finds the same: theirs to keep, but the book's line is the first finder's still", second.ok && same(second.got.keeps, [{ id: "twinCones", first: false }]) && same((await purseAs(U.m2)).felling.keeps, { twinCones: 1 })
      && same((await groveKept()).book, kept.book), second.why.length ? second.why : second.got);
    await clock(NOW + (K.regrow + 1) * MIN);
    const third = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, fromP, falls("nest"));
    t.check("a second kind is a second line of the book, in the order the code lists them", third.ok && same(third.got.trees.book, [["nest", "Member One"], ["twinCones", "Member One"]]) && same((await purseAs(U.m1)).felling.keeps, { twinCones: 1, nest: 1 }), third.why.length ? third.why : third.got);
    const stout = await one(`select town.keepsake_for(town.tree_of($1), 0::float8, 0.999::float8) as slender, town.keepsake_for(town.tree_of($2), 0::float8, 0.999::float8) as stout, town.keepsake_for(town.tree_of($3), 0::float8, 0.5::float8) as ancient`,
      [p.id, pines.find((x) => T.girthOf(x) === 3).id, elder.id]);
    t.check("only a stout pine has the last of them, and the ancient tree lets nothing fall", same(stout, { slender: "ribbon", stout: "carvedBird", ancient: null }), stout);
  }

  t.section("a cord and a bag with no room");
  {
    const p = tree(2), from = beside(p), logs = CODE.items.log.stack, full = (n) => Array.from({ length: n }, () => ({ item: "boot", n: CODE.items.boot.stack }));
    await give(U.m1, { had: ["thingBundle"] });
    await fresh(U.m1, axe(), { bag: bag(axe(), ...full(9)), pouches: { thingBundle: [{ item: "log", n: logs - 1 }, null, { item: "log", n: logs }] } });
    const f = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, from, plainLuck);
    const mine = await purseAs(U.m1);
    t.check("wood goes into the firewood cord before the bag: a full bag, and the logs are put away all the same", f.ok && f.got.ok === true && same(mine.pouches.thingBundle, [{ item: "log", n: logs }, { item: "log", n: 1 }, { item: "log", n: logs }]) && held(mine, "boot") === 9 * CODE.items.boot.stack,
      f.why.length ? f.why : mine.pouches);
    const q = tree(2), fromQ = beside(q);
    await fresh(U.m1, axe(), { bag: bag(axe(), ...full(9)), pouches: { thingBundle: [{ item: "log", n: logs }, { item: "timber", n: CODE.items.timber.stack }, { item: "log", n: logs - 1 }] } });
    const walked = await begin(U.m1, q.id, fromQ), pressed = await fell(U.m1, { tree: q.id, plain: true, secs: 0 }, fromQ, plainLuck);
    t.check("a cord and a bag with room for one log: no board is put up, the plain press fells nothing, and the tree stands for whoever has the room",
      walked.ok && walked.got.why === "full" && pressed.ok && pressed.got.why === "full" && !(await groveKept()).down[q.id] && (await purseAs(U.m1)).stamina.left === 100, [walked.why, pressed.why, walked.got?.why, pressed.got?.why]);
    await give(U.m1, { had: [] });
    await fresh(U.m1, axe(), { bag: bag(axe(), ...full(8)), pouches: { thingBundle: [{ item: "log", n: 3 }] } });
    const plain = await fell(U.m1, { tree: q.id, plain: true, secs: 0 }, fromQ, plainLuck);
    t.check("somebody with no cord has only the bag: what an old cord kept is not theirs to fill", plain.ok && plain.got.ok === true && (await purseAs(U.m1)).bag[9]?.item === "log", plain.why.length ? plain.why : plain.got);
  }

  t.section("what the browser says of a go, held to its bounds");
  {
    const most = Math.max(K.elderChops, ...K.girths.map((g) => g.chops));
    const p = tree(3), from = beside(p);
    await fresh(U.m1);
    await begin(U.m1, p.id, from);
    const quick = await fell(U.m1, { tree: p.id, through: true, misses: 0, secs: 0.2 }, from);
    t.check("a stout trunk cut through in a fifth of a second was not played: no go, the tree stands, the board is still up", quick.ok && quick.got.why === "none" && !(await groveKept()).down[p.id] && !!(await groveKept()).goes?.[U.m1], quick.why.length ? quick.why : quick.got);
    const least = (K.girths[2].chops - 1) * K.quickest;
    const just = await call(U.m1, "town_fell", { tree: p.id, through: true, misses: 1e9, secs: 1e9 }, from[0], from[1]);
    const deed = (await deedsAfter((await lastDeed()) - 1))[0];
    t.check(`misses past any a trunk has are kept as the most chops a trunk takes (${most}), and seconds past an hour as an hour: the tree falls with no fine timber`, just?.ok === true && just.felled[0].misses === most && just.felled[0].timber === 0
      && deed.doc.misses === most && deed.doc.secs === 3600 && least > 0.2, { just, deed });
    const q = tree(), fromQ = beside(q);
    await fresh(U.m1);
    const asks = [
      ["from three tiles off", [{ tree: q.id, plain: true, secs: 0 }, q.x - 3, q.y], "far"], ["from no tile at all", [{ tree: q.id, plain: true, secs: 0 }, null, null], "none"],
      ["a tree that is no number", [{ tree: "5", plain: true, secs: 0 }, fromQ[0], fromQ[1]], "none"], ["half a tree", [{ tree: q.id + 0.5, plain: true, secs: 0 }, fromQ[0], fromQ[1]], "none"],
      ["a tree past every tree", [{ tree: 1e12, plain: true, secs: 0 }, fromQ[0], fromQ[1]], "none"], ["no tree", [{ plain: true }, fromQ[0], fromQ[1]], "none"],
      ["a go that is no document", [[q.id], fromQ[0], fromQ[1]], "none"], ["no go", [null, fromQ[0], fromQ[1]], "none"],
      ["a board cut through with no seconds said", [{ tree: q.id, through: true, misses: 0 }, fromQ[0], fromQ[1]], "none"],
      ["a yes that is no yes (the plain way said as a word): it is a board, and one with no seconds", [{ tree: q.id, plain: "true", through: true }, fromQ[0], fromQ[1]], "none"],
    ];
    const answers = [];
    for (const [, args] of asks) answers.push(await call(U.m1, "town_fell", ...args));
    t.check(`refused, each for its reason, and the tree stands: ${asks.map(([name]) => name).join("; ")}`, same(answers.map((r) => r?.why ?? r?.error ?? "felled"), asks.map(([, , why]) => why)) && !(await groveKept()).down[q.id],
      answers.map((r) => r?.why ?? r?.error ?? "felled"));
    const walked = [await call(U.m1, "town_fell_begin", q.id, q.x - 2, q.y), await call(U.m1, "town_fell_begin", q.id, null, null), await call(U.m1, "town_fell_begin", null, fromQ[0], fromQ[1]), await call(U.m1, "town_fell_begin", 9999, fromQ[0], fromQ[1]),
      await call(U.m1, "town_fell_brace", null, fromQ[0], fromQ[1]), await call(U.m1, "town_fell_root", null)];
    t.check("a board from two tiles off, from no tile, at no tree, at a tree there is not; a brace of nobody's go; a root of no tree: each refused with its word", same(walked.map((r) => r?.why ?? r?.error ?? "ok"), ["far", "far", "none", "none", "none", "none"]),
      walked.map((r) => r?.why ?? r?.error ?? "ok"));
    await patch(U.m1, { hand: null });
    const bare = [await call(U.m1, "town_fell_begin", q.id, fromQ[0], fromQ[1]), await call(U.m1, "town_fell", { tree: q.id, plain: true, secs: 0 }, fromQ[0], fromQ[1])];
    await fresh(U.m1);
    const tier = [await call(U.m1, "town_fell_begin", upper.id, upper.x - 1, upper.y), await call(U.m1, "town_fell_begin", elder.id, ...beside(elder))];
    t.check("with no axe in the hand, nothing; a tree of an upper terrace does not take this axe's bite; the ancient tree asks more of an axe", same([...bare, ...tier].map((r) => r?.why), ["tool", "tool", "bite", "plus"]), [...bare, ...tier].map((r) => r?.why ?? r?.error));
  }

  t.section("the ancient tree, and an axe forged to the top");
  {
    const from = beside(elder);
    await fresh(U.m1, axe({ plus: 10, opts: ["axGrain", "axKeen", "axRoot"] }));
    await fresh(U.m2);
    const b = await begin(U.m1, elder.id, from);
    t.check("the ancient tree takes an axe at the top: a board of its own, with no family to its branches, for it alone", b.ok && b.got.ok === true && b.got.elder === true && b.got.ask.family === K.elderFamily && same(b.got.group, [elder.id])
      && same(b.got.ask.trees, [{ id: elder.id, girth: 3, timber: [CODE.mining.all] }]), b.why.length ? b.why : b.got);
    await on(6 * SEC);
    const lost = await fell(U.m1, { tree: elder.id, through: false, misses: 2, secs: 6 }, from);
    t.check("a go at it that is lost: it stands, nothing is paid and nothing written down, and the go is over", lost.ok && lost.got.ok === true && lost.got.stood === true && same(lost.got.felled, []) && lost.written.length === 0 && (await groveKept()).goes === undefined
      && (await purseAs(U.m1)).stamina.left === 100, lost.why.length ? lost.why : lost.got);
    await begin(U.m1, elder.id, from);
    await on(6 * SEC);
    const won = await fell(U.m1, { tree: elder.id, through: true, misses: 5, secs: 6 }, from);
    const dawn = Number((await one(`select town.tree_until(true, $1::bigint)::float8 as u`, [NOW])).u);
    t.check("cut through: its fine timber and its resin whatever the misses, no logs, and its own points on the line", won.ok && won.got.ok === true && same(won.got.got, [["timber", K.elder.timber], ["resin", K.elder.resin]]) && won.written[0]?.thing === "elder", won.why.length ? won.why : won.got);
    const seen = await look(U.m2);
    t.check("it is down until the next dawn, and of that everybody is told only that it is down", seen.ok && same(seen.got.trees.down.find((d) => d.id === elder.id), { id: elder.id, at: NOW }) && dawn === T.grownAt({ elder: true }, NOW) && dawn > NOW, seen.why.length ? seen.why : seen.got.trees);
    const none = await rootBack(U.m1, elder.id);
    t.check("its stump is not to be woken", none.ok && none.got.why === "none", none.why.length ? none.why : none.got);
    const p = tree(), fromP = beside(p);
    const f = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, fromP, plainLuck);
    const theirs = await rootBack(U.m2, p.id);
    await on(30 * SEC);
    const woke = await rootBack(U.m1, p.id);
    t.check("a stump just made is woken by whoever made it, with the axe that can: grown again for everybody, counted by the day, and written down", f.ok && theirs.ok && theirs.got.why !== undefined && woke.ok && woke.got.ok === true && !(await groveKept()).down[p.id]
      && woke.got.left === CODE.forge.options.of.axRoot.use.n - 1 && !woke.got.trees.down.some((d) => d.id === p.id), [f.why, theirs.why, woke.why, woke.got]);
    await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, fromP, plainLuck);
    await on((K.root.within + 1) * SEC);
    const late = await rootBack(U.m1, p.id);
    t.check("…and one made too long ago is not", late.ok && late.got.why === "none" && !!(await groveKept()).down[p.id], late.why.length ? late.why : late.got);
  }

  t.section("every go at a board is told to the log of goes (v166), under the game's own name");
  {
    const tries = async () => Number((await one(`select count(*)::int as n from public.town_tries where game = 'felling' and board = 'felling'`)).n);
    const was = await tries();
    const kept = [await call(U.m1, "town_try", "felling", "felling", "pine", "done", false, 12, 12, 1, 6.5), await call(U.m1, "town_try", "felling", "felling", "elder", "left", true, 0, 0, 0, 0)];
    t.check("a go at felling, and one left before its first chop, are both kept there", same(kept, [true, true]) && (await tries()) === was + 2, kept);
  }

  t.section("three members at the trees, the clock moving: every call as the code says");
  {
    // a patch of the slope, so that they meet at the same trees; each with an axe of their own sort, and gifts of the line
    const who = [U.m1, U.m2, U.admin];
    let a0 = 20261009;
    const next = () => { a0 = (a0 + 0x6d2b79f5) | 0; let x = Math.imul(a0 ^ (a0 >>> 15), 1 | a0); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
    const of = (list) => list[Math.floor(next() * list.length)], maybe = (p) => next() < p;
    const KITS = [
      [{ plus: 10, opts: ["axDust", "axResin", "axDouble"], gems: ["lightning"] }, { had: ["charmEchoAxe", "thingBundle"], charms: ["charmEchoAxe"] }],
      [{ plus: 6, opts: ["axKeen", "axFresh"], gems: ["dark"] }, { had: ["famWoodpecker"], familiar: "famWoodpecker" }],
      [{ plus: 10, opts: ["axGrain", "axDry", "axOne"], gems: ["earth"] }, { had: ["charmEchoAxe", "famWoodpecker", "thingBundle"], charms: ["charmEchoAxe"], familiar: "famWoodpecker" }],
      // (a plain axe, and a bag with room for a few logs and a little fine timber and for nothing else)
      [{}, { had: [] }, { bag: bag(axe(), { item: "log", n: CODE.items.log.stack - 5 }, { item: "timber", n: CODE.items.timber.stack - 3 }, ...Array.from({ length: 7 }, () => ({ item: "boot", n: CODE.items.boot.stack }))) }],
      [{ plus: 10, opts: ["axResin", "axFresh", "axRoot"], gems: ["fire"] }, { had: ["thingBundle"] }], [{ plus: 3, opts: ["axDust"], gems: ["water"] }, { had: ["charmEchoAxe"], charms: ["charmEchoAxe"] }],
    ];
    const tally = { calls: 0, begun: 0, felled: 0, trees: 0, held: 0, braced: 0, paid: 0, keeps: 0, chained: 0, roots: 0, full: 0, spent: 0 };
    for (let story = 0; story < 4; story++) {
      await t.sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
      for (const [i, m] of who.entries()) { const [kit, gifts, more] = KITS[(story * 3 + i) % KITS.length]; await give(m, gifts); await fresh(m, axe(kit), { stamina: { day: dayOf(NOW), left: of([100, 100, 30, 6]) }, ...(more ?? {}) }); }
      const up = {}, last = {};   // whose board is up, at which tree and from which tile; and the tree each felled last
      let bad = null, calls = 0;
      for (let step = 0; step < 90 && !bad; step++) {
        await on(of([1, 2, 3, 5, 8, 13, 21, 50]) * SEC + (maybe(0.06) ? (K.regrow + 1) * MIN : 0));
        // (whoever has a board up is the likelier to act next: a go is a few seconds long)
        const m = Object.keys(up).length && maybe(0.45) ? of(Object.keys(up)) : of(who);
        // (and whoever has none goes, as often as not, to where somebody's board is up: to brace the trunk, or to take on the tree)
        const busy = who.filter((x) => x !== m && up[x]), meets = !up[m] && busy.length && maybe(0.5) ? of(busy) : null;
        const p = up[m] && maybe(0.8) ? up[m].tree : meets ? up[meets].tree : of(patchOf), from = maybe(0.93) ? beside(p) : [p.x - 3, p.y];
        const fresh_ = last[m] && NOW - last[m].at <= 100 * SEC;
        const kind = up[m] ? of(["fell", "fell", "fell", "fell", "begin", "look"]) : meets ? of(["brace", "brace", "begin", "plain"]) : fresh_ && maybe(0.4) ? "root"
          : of(["begin", "begin", "begin", "plain", "plain", "brace", "root", "look", "fell"]);
        let r;
        if (kind === "look") r = await look(m);
        else if (kind === "begin") { r = await begin(m, p.id, from); if (r.got?.ok === true) { up[m] = { tree: p, from }; tally.begun++; } if (r.got?.why === "held") tally.held++; if (r.got?.why === "full") tally.full++; }
        else if (kind === "brace") { const feller = meets ?? of(who); r = await brace(m, feller, up[feller] ? [up[feller].tree.x + of([1, 2, 2, 3]), up[feller].tree.y] : from); if (r.got?.ok === true) tally.braced++; }
        else if (kind === "root") { r = await rootBack(m, fresh_ ? last[m].tree : p.id); delete last[m]; if (r.got?.ok === true) tally.roots++; }
        else {
          const board = kind === "fell", at = board && up[m] ? up[m].from : from, first = board && up[m] ? up[m].tree : p;
          const went = board ? { tree: first.id, through: maybe(0.8), misses: of([0, 0, 0, 1, 2, 4]), secs: of([4, 6, 9, 0.1]), ...(maybe(0.15) ? { one: true } : {}), ...(maybe(0.3) ? { twice: true } : {}) } : { tree: first.id, plain: true, secs: 0, ...(maybe(0.2) ? { twice: true } : {}) };
          r = await fell(m, went, at);
          if (board) delete up[m];
          if (r.got?.ok === true && r.got.felled.length) last[m] = { tree: r.got.felled[r.got.felled.length - 1].id, at: NOW };
          if (r.got?.ok === true) { tally.felled++; tally.trees += r.got.felled.length; tally.keeps += r.got.keeps.length; if (r.got.braced) tally.paid++; tally.chained += r.got.felled.filter((f) => f.chained !== null).length; tally.spent += r.written.filter((d) => d.doc.spent).length; }
          if (r.got?.why === "held") tally.held++;
          if (r.got?.why === "full") tally.full++;
        }
        calls++;
        if (!r.ok) bad = { step, kind, who: NAME[m], tree: p.id, why: r.why, got: r.got?.error ?? r.got?.why ?? "ok" };
      }
      tally.calls += calls;
      t.check(`story ${story + 1}: ${calls} calls by three members, each answer, purse, grove and deed as the code says`, !bad, bad);
    }
    t.check("…and the stories met what they were for: boards up and trees felled, several at a go, trees held against another, trunks braced and paid, keepsakes, trees left half cut, stumps woken, no room, tired hands",
      tally.begun > 40 && tally.felled > 60 && tally.trees > tally.felled && tally.held > 3 && tally.braced > 3 && tally.paid > 1 && tally.keeps > 5 && tally.chained > 2 && tally.roots > 0 && tally.full > 0 && tally.spent > 0, tally);
    console.log(`  ${JSON.stringify(tally)}`);
  }

  t.section("the file run once more, over what has been done since");
  {
    const was = { grove: await groveKept(), purses: [await purseAs(U.m1), await purseAs(U.m2), await purseAs(U.admin)], deeds: await lastDeed(), far: Number((await one(`select value from public.town_knobs where key = 'far_open'`)).value),
      fns: (await t.sql(`select p.proname, md5(pg_get_functiondef(p.oid)) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.proname ~ '^(town_)?(tree|fell|axe|grove|trees|keepsake|felling|brace|go_|timber|work_counts_of|deed_th)' and p.prokind = 'f' order by 1, 2`)).rows };
    let ran = null;
    try { await t.sql(sql); } catch (e) { ran = e.message; }
    const now = { grove: await groveKept(), purses: [await purseAs(U.m1), await purseAs(U.m2), await purseAs(U.admin)], deeds: await lastDeed(), far: Number((await one(`select value from public.town_knobs where key = 'far_open'`)).value),
      fns: (await t.sql(`select p.proname, md5(pg_get_functiondef(p.oid)) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.proname ~ '^(town_)?(tree|fell|axe|grove|trees|keepsake|felling|brace|go_|timber|work_counts_of|deed_th)' and p.prokind = 'f' order by 1, 2`)).rows };
    t.check("it runs, and nothing is changed by it: the trees down, the book, the purses, what is written down, the far side open, and every function of the part its own text still", ran === null && same(was, now) && was.fns.length > 30 && was.far === 1, { ran, fns: was.fns.length });
    const p = tree(), from = beside(p);
    await fresh(U.m1);
    const f = await fell(U.m1, { tree: p.id, plain: true, secs: 0 }, from, plainLuck);
    t.check("…and a tree is felled after it as before", f.ok && f.got.ok === true, f.why.length ? f.why : f.got);
  }
  await knob("far_open", 0);
}
