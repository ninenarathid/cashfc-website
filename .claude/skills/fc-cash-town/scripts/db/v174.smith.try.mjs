// v174's smith part through the functions a member calls, against the stand-in database (try-v164.mjs plays this after
// the part's rule cases: `node try-v164.mjs <root> v174 smith`). The rules themselves are held to the code case by
// case before this; here are the stories and who may:
//
//   · who may ask: signed out, an unproved character, no character, a proved member with each gate shut and with all
//     open, an admin; the two tables closed to a browser; no rule of schema `town` for anybody to call;
//   · a smithy from empty: pieces put in, smelted by the clock, taken; the queue widened; a second member at the
//     bellows; who of the members standing by has a piece smelting;
//   · a tool from as it was bought to the top: every try by the database's own chance (read off first, never sent),
//     a draw owed at each milestone, the same draw however often it is asked for, a choice, the board's firsts, the
//     maker's name; the try from one under the top refused without the great fire; the fire's two halves found by a
//     tree felled and a rock paid for, lit, queued for, spent whatever comes of it; found again when its time comes;
//   · a gem set; an option drawn again; what the smith put into a tool moved to another of its line, and back;
//   · a counted option used, to its last;
//   · the order rows are held in, read off the text of every function that holds one;
//   · the moment the fire's halves can next be found: in no answer of any function, in no deed;
//   · the same call twice making nothing twice; the odds of a try by the database's chance; and the part run once more
//     over all of it.
//   TRIES=<n>: how many tries the odds are counted over (300).
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, patch, root, sql }) {
  process.env.FC_REPO ??= root;
  await import("./repo-ts-town.mjs");
  const { caveLayout } = await import("@/lib/town/mining-row");
  const { dayOf } = await import("@/lib/town/stamina");
  const TREES = await import("@/lib/town/trees");
  const { farTrees, farCedar } = await import("@/lib/town/far-side");
  const F = CODE.forge, K = F.smith, TOP = F.forge.top, MILE = F.forge.milestones, FIRE = F.fire, MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const TRIES = Number(process.env.TRIES ?? 300);
  const no = (r) => r?.code === "42501";
  const knob = (key, v) => t.sql(`update public.town_knobs set value = $2 where key = $1`, [key, v]);
  const bag = (...stacks) => Array.from({ length: Math.max(12, stacks.length) }, (_, i) => stacks[i] ?? null);
  const held = (p, item) => (p?.bag ?? []).reduce((n, s) => n + (s?.item === item ? s.n : 0), 0) + Object.values(p?.pouches ?? {}).flat().reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
  const coinsOf = async (who) => Number((await one(`select coins from public.town_purses where member_id = $1`, [who]))?.coins ?? 0);
  const smithyOf = async (who) => (await one(`select doc from public.town_smiths where member_id = $1`, [who]))?.doc ?? null;
  const smithRows = async () => Number((await one(`select count(*)::int as n from public.town_smiths`)).n);
  const boardKept = async () => (await one(`select doc from public.town_things where key = 'smith'`))?.doc;
  const fireKept = async () => (await one(`select doc from public.town_great_fire where one`))?.doc;
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const lastDeed = async () => Number((await one(`select coalesce(max(id), 0)::int as n from public.town_deeds`)).n);
  const deedsAfter = async (id) => (await t.sql(`select member_id, what, thing, n::float8 as n, coins::float8 as coins, doc from public.town_deeds where id > $1 order by id`, [id])).rows;
  const helpers = async (who) => Number((await one(`select coalesce((town.work_told($1, town.now_ms())->'helpers'->>'points')::numeric, 0) as p`, [who])).p);
  const NAME = Object.fromEntries(await Promise.all([U.m1, U.m2, U.admin].map(async (id) => [id, (await one(`select town.smith_called($1) as n`, [id])).n])));

  /* ── every answer of every call is kept, to be read at the end for what no page may be told ── */
  const answers = [], dues = new Set();
  const ask = async (who, fn, ...args) => { const r = await call(who, fn, ...args); answers.push([fn, JSON.stringify(r ?? null)]); return r; };
  /** The fire as it is kept, read as the SQL editor reads it; the moment its halves can next be found is noted, to be looked for in every answer. */
  const fireNow = async () => { const f = await fireKept(); if (typeof f?.due === "number" && f.due > 0) dues.add(String(f.due)); return f; };

  /* ── the test's clock in the place of the database's (after the part's own functions were held to what they were) ── */
  let NOW = Date.parse("2026-10-12T12:00:00+07:00");
  await t.sql(`create table if not exists town.test_clock (ms bigint not null);
    delete from town.test_clock where true;
    insert into town.test_clock values (${NOW});
    create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
  const lay = async () => {
    const day = dayOf(NOW);
    if (Number((await one(`select count(*)::int as n from public.town_cave_days where day = $1`, [day])).n) >= CODE.mining.floors) return;
    await t.sql(`insert into public.town_cave_days (day, floor, layout) select $1::integer, e.ord::integer, e.v from jsonb_array_elements($2::jsonb) with ordinality e(v, ord) on conflict do nothing`,
      [day, JSON.stringify(Array.from({ length: CODE.mining.floors }, (_, i) => caveLayout(i + 1, day)))]);
  };
  /** The clock moved on (and the cave of the day it comes to laid, as the site's server lays it). */
  const on = async (ms) => { NOW += Math.round(ms); await t.sql(`update town.test_clock set ms = ${NOW} where true`); await lay(); };
  await lay();

  /**
   * The numbers of chance the database's next call will draw, in order: the seed is set, they are read off, and the
   * seed is set again, so that the call draws the same ones. `fits`: asked of each set until one fits.
   */
  let seeded = 0;
  const chance = async (n, fits = () => true) => {
    for (let tries = 0; tries < 6000; tries++) {
      const s = (((++seeded) * 0.6180339887) % 1) * 2 - 1;
      await t.sql(`select setseed($1::double precision)`, [s]);
      const drawn = (await t.sql(`select random()::float8 as r from generate_series(1, $1::int)`, [n])).rows.map((r) => Number(r.r));
      if (!fits(drawn)) continue;
      await t.sql(`select setseed($1::double precision)`, [s]);
      return drawn;
    }
    throw new Error("no numbers of chance fit what the scene asks for");
  };
  const tryOf = (to) => F.tries.find((x) => x.to === to);
  const costOf = (kind, to) => { const x = tryOf(to); return F.wooden.includes(kind) ? { fee: x.fee, ore: x.ore, n: Math.ceil(x.n / 2), timber: x.timber * 2 } : { fee: x.fee, ore: x.ore, n: x.n, timber: x.timber }; };
  /** How a try for a level goes by a number of chance, as the catalog's table says (the code's outcomeOf, read off the row). */
  const outcome = (to, r) => { const o = tryOf(to), x = Math.max(0, Math.min(0.999999, r)) * 100; if (!o) return "stays"; return x < o.take ? "taken" : x < o.take + o.stay ? "stays" : "down"; };
  const pool = (kind, n) => F.options.order.filter((id) => F.options.of[id].pool === n && F.options.of[id].tools.includes(kind) && F.built[kind].opts.includes(id));
  // (a purse of each member's own, whole, before anything of it is written over)
  for (const who of [U.m1, U.m2, U.guest, U.admin]) await call(who, "town_hold", null);

  const BY = [Math.floor(F.stand.at[0]), Math.floor(F.stand.at[1])];
  const FNS = [["town_smith"], ["town_smith_smelt", "oreCopper", 1], ["town_smith_take"], ["town_smith_widen"], ["town_smith_near", `{${U.m1}}`], ["town_smith_bellows", U.m1],
    ["town_smith_try", 0], ["town_smith_draw", 0], ["town_smith_choose", 0, "pkPeek"], ["town_smith_redraw", 0, 0, "gemRuby"], ["town_smith_gem", 0, "gemRuby"],
    ["town_smith_move", 0, 1, BY[0], BY[1], false], ["town_fire_join"], ["town_fire_leave"]];
  const all = async (who) => { const got = []; for (const [fn, ...args] of FNS) got.push(await ask(who, fn, ...args)); return got; };

  // (what is the village's and other people's, to see at the end that nothing paid to the smith went anywhere)
  const aroundNow = async () => one(`select (select coalesce(sum(p.coins), 0)::int from public.town_purses p where p.member_id not in ($1, $2, $3)) as others,
    (select coalesce(sum(j.coins), 0)::int from public.town_jar j) as jar, (select coalesce(sum(o.coins), 0)::int from public.town_jar_owed o) as owed, (select coalesce(sum(n.due), 0)::bigint from public.town_notice_books n) as dues,
    (select jsonb_object_agg(th.key, th.doc) from public.town_things th where th.key in ('stall', 'fountain', 'village', 'well', 'yard')) as things`, [U.m1, U.m2, U.admin]);
  const around0 = await aroundNow();

  const markOpen = await lastDeed();
  t.section("who may: built closed. Somebody signed out, unproved, or with no character is refused by every one of them, whatever is open");
  await patch(U.m1, { coins: 5000, bag: bag({ item: "pick", n: 1 }, { item: "pan", n: 1 }, { item: "shardCopper", n: 50 }, { item: "timber", n: 30 }, { item: "gemRuby", n: 1 }, { item: "oreCopper", n: 2 }) });
  const m1Before = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), deeds: await written(), fire: await fireKept(), board: await boardKept() };
  const quiet = async () => same(await purseOf(U.m1), m1Before.purse) && (await coinsOf(U.m1)) === m1Before.coins && (await written()) === m1Before.deeds && (await smithRows()) === 0
    && same(await fireKept(), m1Before.fire) && same(await boardKept(), m1Before.board);
  t.check("the knob is made at nothing: the smith is built closed", Number((await one(`select value from public.town_knobs where key = 'smith_open'`)).value) === 0);
  for (const [far, smith] of [[0, 0], [1, 1]]) {
    await knob("far_open", far); await knob("smith_open", smith);
    for (const who of ["anon", U.unver, U.nochar]) {
      const got = await all(who), yes = await ask(who, "town_smith_open"), power = await ask(who, "town_tool_power", "ntFreeze");
      t.check(`${who === "anon" ? "signed out" : who === U.unver ? "an unproved character" : "no character"}, ${smith ? "everything open" : "the smith closed"}: all fourteen refused (42501), the counted option too, and the yes or no is ${who === "anon" ? "not theirs to ask" : "no"}`,
        got.every(no) && no(power) && (who === "anon" ? !!yes?.error : yes === false), [got.map((r) => r?.code ?? r), yes, power]);
    }
  }
  t.check("…and nothing of anybody's moved, nothing written down, no row made", await quiet());

  t.section("who may: a proved member, by the three knobs; an admin always");
  const gates = [];
  for (const [game, far, smith] of [[1, 0, 0], [1, 1, 0], [1, 0, 1], [0, 1, 1]]) {
    await knob("game_open", game); await knob("far_open", far); await knob("smith_open", smith);
    const got = await all(U.m1), yes = await ask(U.m1, "town_smith_open"), admin = await ask(U.admin, "town_smith"), adminYes = await ask(U.admin, "town_smith_open");
    gates.push({ game, far, smith, refused: got.every(no), yes, admin: !!admin?.smith && adminYes === true });
  }
  t.check("a proved member is refused by all fourteen, and told no, while the game, the far side or the smith is shut: each of the three by itself",
    gates.every((g) => g.refused && g.yes === false), gates);
  t.check("an admin is answered, and told yes, whatever is shut", gates.every((g) => g.admin), gates);
  t.check("…and nothing of the member's moved, nothing written down, no row made by being refused", await quiet());
  await knob("game_open", 1); await knob("far_open", 1); await knob("smith_open", 0);
  const power0 = await ask(U.m1, "town_tool_power", "ntFreeze");
  t.check("a counted option is asked by the game's gate alone: with the smith closed a member is answered (and has no such option)", power0?.ok === false && power0.why === "none" && !!power0.purse, power0);
  await knob("smith_open", 1);
  const opened = await all(U.m1), yes1 = await ask(U.m1, "town_smith_open");
  t.check("opened by its knob (the game and the far side open), a proved member is told yes and answered by all fourteen", yes1 === true && opened.every((r) => !r?.error && (r.ok !== undefined || r.smith !== undefined || r.near !== undefined)),
    opened.map((r) => r?.error ?? r?.why ?? "ok"));
  // (what those fourteen did is taken back, so that the stories begin from nothing)
  await patch(U.m1, { coins: 5000, bag: m1Before.purse.bag });
  await t.sql(`delete from public.town_smiths where true`);
  await t.sql(`delete from public.town_deeds where id > $1`, [markOpen]);

  t.section("what is kept is closed to a browser, and no rule is a browser's to call");
  for (const who of ["anon", U.m1, U.admin]) {
    const reads = [await t.as(who, `select * from public.town_smiths`), await t.as(who, `select * from public.town_great_fire`), await t.as(who, `select doc from public.town_things where key = 'smith'`)];
    const writes = [await t.as(who, `update public.town_great_fire set doc = '{"due": 0}'::jsonb where one`), await t.as(who, `insert into public.town_smiths (member_id) values ('${U.m1}')`), await t.as(who, `delete from public.town_smiths where true`)];
    const rules = [await t.as(who, `select town.fire_kept(false)`), await t.as(who, `select town.fire_told(town.fire_kept(false), '', 0)`), await t.as(who, `select town.smithy_read('${U.m1}')`),
      await t.as(who, `select town.forge_try_fired('{}'::jsonb, '{}'::jsonb, 0, 0.1, 'x', 'x', 0, 0.5)`), await t.as(who, `select town.keep_fire('{}'::jsonb)`), await t.as(who, `select town.smith_member()`)];
    t.check(`${who === "anon" ? "signed out" : who === U.m1 ? "a member" : "an admin"}, straight at the tables and the rules: nothing read, nothing written, no rule run`,
      reads.every((r) => !!r.error || r.rows.length === 0) && writes.every((r) => !!r.error || r.affected === 0) && rules.every((r) => !!r.error), [reads, writes, rules].map((l) => l.map((r) => r.error ?? `${r.rows?.length} rows`)));
  }
  t.check("…and the fire's row is as it was made: a village's first fire, to be found at once", same(await fireKept(), {}) && same((await one(`select town.fire_kept(false) as f`)).f, { due: 0, flint: null, tinder: null, row: [], topped: [] }));

  t.section("the smith told: when he is looked at; reading makes no row");
  let look = await ask(U.m1, "town_smith");
  t.check("town_smith brings the purse, the clock, a new smithy, the board and the great fire as a page may know it", !!look?.purse && look.now === NOW
    && same(look.smith, { smithy: { queue: [], more: 0, ember: 0, pending: null }, board: { tops: {}, found: {} }, fire: { flint: null, tinder: null, lit: false, row: [], open: 0, mine: -1, topped: false } }), look?.smith);
  t.check("…and no row was made by looking", (await smithRows()) === 0);
  const me0 = await call(U.m1, "town_me");
  t.check("town_me is as it was: the purse and the clock, and nothing of the smith (the page learns of him by his own yes or no)", !!me0?.purse && me0.smith === undefined && Object.keys(me0).sort().join() === "now,purse", Object.keys(me0 ?? {}));

  t.section("smelting: paid for at once, one after another by the database's clock");
  const copper = F.smelts.of.oreCopper, FR = F.smelting.fragments;
  let did = await ask(U.m1, "town_smith_smelt", "oreCopper", 2), p = await purseOf(U.m1), s = await smithyOf(U.m1);
  t.check("two pieces put in: the fragments, a timber each and the fee are gone from the purse", did?.ok === true && did.timber === 2 * F.smelting.timber && did.fee === 2 * copper.fee
    && held(p, "shardCopper") === 50 - 2 * FR && held(p, "timber") === 30 - 2 && (await coinsOf(U.m1)) === 5000 - 2 * copper.fee && did.purse.coins === 5000 - 2 * copper.fee, { ...did, purse: undefined });
  t.check("…and they are in the queue, the second beginning as the first ends, by this clock", s.queue.length === 2 && s.queue[0].piece === "oreCopper" && s.queue[0].from === NOW
    && s.queue[0].till === NOW + copper.mins * MIN && s.queue[1].from === s.queue[0].till && s.queue[1].till === s.queue[1].from + copper.mins * MIN && same(did.smith.smithy, s), s);
  let w = await deeds("smelt");
  t.check("written down: who, which piece, how many, what it cost, the timber, and when the last is done", w.length === 1 && w[0].member_id === U.m1 && w[0].thing === "oreCopper" && w[0].n === 2 && w[0].coins === -2 * copper.fee
    && w[0].doc.timber === 2 && w[0].doc.till === s.queue[1].till, w);
  const before = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), smithy: await smithyOf(U.m1), deeds: await written() };
  const refusals = [["none", "noSuchPiece", 1], ["none", "shardCopper", 1], ["none", null, 1], ["none", "ore-Copper", 1], ["amount", "oreCopper", 0], ["amount", "oreCopper", -2], ["amount", "oreCopper", null], ["places", "oreCopper", 2], ["ore", "oreIron", 1], ["none", "x".repeat(40), 1]];
  const got = [];
  for (const [, piece, n] of refusals) got.push((await ask(U.m1, "town_smith_smelt", piece, n))?.why);
  t.check("refused, each for its reason: what is no piece, no whole number above nothing, more than the places free, fragments one has not", same(got, refusals.map(([why]) => why)), got);
  await patch(U.m1, { coins: copper.fee - 1 });
  did = await ask(U.m1, "town_smith_smelt", "oreCopper", 1);
  await patch(U.m1, { coins: before.coins });
  const noTimber = await patch(U.m1, { bag: before.purse.bag.map((x) => (x?.item === "timber" ? null : x)) });
  const dry = await ask(U.m1, "town_smith_smelt", "oreCopper", 1);
  await patch(U.m1, { bag: before.purse.bag });
  t.check("…coins one short, and no fine timber", did?.why === "coins" && dry?.why === "timber" && held(noTimber, "timber") === 0, [did?.why, dry?.why]);
  t.check("…and a refusal changes nothing and writes nothing down", same(await purseOf(U.m1), before.purse) && (await coinsOf(U.m1)) === before.coins && same(await smithyOf(U.m1), before.smithy) && (await written()) === before.deeds);

  t.section("the bellows: a second member, press by press");
  await patch(U.m2, { coins: 0, bag: bag() });
  let near = await ask(U.m2, "town_smith_near", `{${U.m1},${U.m2},${U.admin}}`);
  t.check("who of those standing by has a piece smelting: the first member, with the piece and the presses it may still take; not the asker, not whoever has none", near?.near?.length === 1 && near.near[0].id === U.m1
    && near.near[0].piece.piece === "oreCopper" && near.near[0].left === K.bellows.each && near.now === NOW && near.purse === undefined, near);
  const off = Math.round(copper.mins * MIN * K.bellows.share), pointsWas = await helpers(U.m2), m2Was = await purseOf(U.m2);
  const presses = [];
  for (let i = 0; i < K.bellows.each + 1; i++) presses.push(await ask(U.m2, "town_smith_bellows", U.m1));
  s = await smithyOf(U.m1);
  t.check(`each press takes its share of the piece's whole time off it (${off / 1000} s) and off the piece behind it, and is counted on the piece; after ${K.bellows.each} the piece takes no more: \`tired\``,
    presses.slice(0, K.bellows.each).every((r) => r?.ok === true && r.off === off) && presses[K.bellows.each]?.why === "tired"
    && s.queue[0].till === before.smithy.queue[0].till - K.bellows.each * off && s.queue[0].blown === K.bellows.each && s.queue[0].from === before.smithy.queue[0].from
    && s.queue[1].from === s.queue[0].till && s.queue[1].till === before.smithy.queue[1].till - K.bellows.each * off, [presses.map((r) => r?.off ?? r?.why), s.queue]);
  w = await deeds("bellows");
  t.check("written down in the helper's name, each press, with whose it was; and each is the helpers' points to whoever pressed, the owner none", w.length === K.bellows.each && w.every((d) => d.member_id === U.m2 && d.thing === "oreCopper" && d.doc.whose === U.m1 && d.doc.off === off)
    && same(w.map((d) => d.doc.left), [2, 1, 0]) && (await helpers(U.m2)) === pointsWas + K.bellows.each * CODE.work.helpers.bellows && (await helpers(U.m1)) === 0, [w.map((d) => d.doc), await helpers(U.m2)]);
  t.check("the helper's purse is as it was, and the helper is answered with their own smithy, not the owner's", same(await purseOf(U.m2), m2Was) && same(presses[0].smith.smithy, { queue: [], more: 0, ember: 0, pending: null }) && presses[0].smithy === undefined, presses[0]?.smith);
  const odd = [await ask(U.m1, "town_smith_bellows", U.m1), await ask(U.m2, "town_smith_bellows", U.admin), await ask(U.m2, "town_smith_bellows", null), await ask(U.m2, "town_smith_bellows", "00000000-0000-0000-0000-0000000000ff")];
  t.check("one's own bellows: `self`; somebody with nothing smelting, nobody, and somebody who is nobody: `idle`; and no row is made for any of them", same(odd.map((r) => r?.why), ["self", "idle", "idle", "idle"]) && (await smithRows()) === 1, odd.map((r) => r?.why ?? r));

  t.section("what is done waits, is taken, and is not taken twice");
  let taken = await ask(U.m1, "town_smith_take");
  t.check("nothing is done yet: `none`", taken?.why === "none", taken);
  await on(s.queue[0].till - NOW);
  look = await ask(U.m1, "town_smith");
  t.check("the first piece is done by the clock the bellows brought forward, and waits", look.smith.smithy.queue[0].till <= NOW && look.smith.smithy.queue[1].till > NOW, look.smith.smithy.queue);
  taken = await ask(U.m1, "town_smith_take");
  p = await purseOf(U.m1);
  t.check("taken: one big ore more in the bag, the piece out of the queue, the other still smelting", taken?.ok === true && same(taken.got, [["oreCopper", 1]]) && held(p, "oreCopper") === 3 && (await smithyOf(U.m1)).queue.length === 1, taken?.got);
  const again = await ask(U.m1, "town_smith_take");
  t.check("asked again at once: `none`, and no second ore", again?.why === "none" && held(await purseOf(U.m1), "oreCopper") === 3, again);
  await on(20 * MIN);
  await patch(U.m1, { bag: bag(...Array.from({ length: 12 }, () => ({ item: "boot", n: 1 }))) });
  const full = await ask(U.m1, "town_smith_take");
  t.check("with no room in the bag what is done goes on waiting: `full`, nothing lost", full?.why === "full" && (await smithyOf(U.m1)).queue.length === 1, full);
  await patch(U.m1, { bag: bag({ item: "boot", n: 1 }), gifts: { had: ["thingSack"], charms: [], owed: 0, familiar: null, used: {} }, pouches: {} });
  taken = await ask(U.m1, "town_smith_take");
  p = await purseOf(U.m1);
  t.check("with a miner's sack it goes into the sack before the bag", taken?.ok === true && same(p.pouches.thingSack[0], { item: "oreCopper", n: 1 }) && !p.bag.some((x) => x?.item === "oreCopper") && (await smithyOf(U.m1)).queue.length === 0, p.pouches);
  w = await deeds("smelted");
  t.check("each taking written down", w.length === 2 && w.every((d) => d.member_id === U.m1 && d.thing === "oreCopper" && d.n === 1), w);

  t.section("the queue widened, twice and no more; paid from the pouch where the timber is");
  await patch(U.m1, { coins: 1000, bag: bag({ item: "timber", n: 15 }), gifts: { had: ["thingBundle"], charms: [], owed: 0, familiar: null, used: {} }, pouches: { thingBundle: [{ item: "timber", n: 50 }, null, null] } });
  const wide = [await ask(U.m1, "town_smith_widen"), await ask(U.m1, "town_smith_widen"), await ask(U.m1, "town_smith_widen")];
  p = await purseOf(U.m1);
  t.check("each widening takes its timber (the bag's first, then the bundle's) and its coins and gives three places; the third: `top`", wide[0]?.ok && wide[1]?.ok && wide[2]?.why === "top"
    && (await smithyOf(U.m1)).more === 2 && wide[1].smith.smithy.more === 2 && held(p, "timber") === 65 - K.more[0].timber - K.more[1].timber && !p.bag.some((x) => x?.item === "timber")
    && (await coinsOf(U.m1)) === 1000 - K.more[0].coins - K.more[1].coins, [wide.map((r) => r?.why ?? "ok"), p.pouches, await coinsOf(U.m1)]);
  w = await deeds("smith_wider");
  t.check("written down, with the timber it took and the places there are now", same(w.map((d) => [d.coins, d.doc.timber, d.doc.places]), [[-K.more[0].coins, K.more[0].timber, K.places + K.wider], [-K.more[1].coins, K.more[1].timber, K.places + 2 * K.wider]]), w);

  /* ── a tree felled and a rock broken, through the woodcutters' and the miners' own functions ── */
  const wood = TREES.woodOf(farTrees(), farCedar()), pines = wood.filter((x) => x.tier === 1 && !x.elder);
  let nextPine = 0;
  /** A member fells a pine on its board, with a plain axe: the answer of `town_fell`. (Their bag is put back as it was afterwards, with whatever the tree gave left out.) */
  const fellOne = async (who) => {
    const was = await purseOf(who), tree = pines[nextPine++ % pines.length], spot = [tree.x - 1, tree.y];
    await patch(who, { bag: bag({ item: "axe", n: 1 }), hand: "axe", handAt: 0, stamina: { day: dayOf(NOW), left: 100 } });
    await t.sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
    const begun = await ask(who, "town_fell_begin", tree.id, spot[0], spot[1]);
    await on(30_000);
    const felled = await ask(who, "town_fell", { tree: tree.id, through: true, misses: 0, secs: 30 }, spot[0], spot[1]);
    await patch(who, { bag: was.bag, hand: was.hand ?? null, handAt: was.handAt ?? null });
    return { begun, felled };
  };
  let nextRock = 0;
  /** A member breaks a rock of the mountain's foot with a plain pick, in one call: the answer of `town_mine` (and of the calls that went before it, where others struck first). */
  const breakOne = async (who, first = null) => {
    const was = await purseOf(who), swings = 4;
    await t.sql(`update public.town_cave set doc = '{}'::jsonb where place = 0`);
    for (;;) {
      const [id, x, y] = CODE.mining.rocks[nextRock++ % CODE.mining.rocks.length];
      for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
        await patch(who, { bag: bag({ item: "pick", n: 1 }), hand: "pick", handAt: 0, stamina: { day: dayOf(NOW), left: 100 }, mine: {} });
        if (first) {
          const firstWas = await purseOf(first);
          await patch(first, { bag: bag({ item: "pick", n: 1 }), hand: "pick", handAt: 0, stamina: { day: dayOf(NOW), left: 100 }, mine: {} });
          const struck = await ask(first, "town_mine", 0, id, x + dx, y + dy, 1, null);
          await patch(first, { bag: firstWas.bag, hand: firstWas.hand ?? null, handAt: firstWas.handAt ?? null });
          if (struck?.ok !== true) continue;
        }
        const broke = await ask(who, "town_mine", 0, id, x + dx, y + dy, first ? swings - 1 : swings, null);
        if (broke?.ok === true && broke.part === 1) { await patch(who, { bag: was.bag, hand: was.hand ?? null, handAt: was.handAt ?? null }); return { broke, rock: id }; }
        if (broke?.ok === true) throw new Error(`the rock did not break: ${JSON.stringify({ ...broke, purse: undefined, cave: undefined })}`);
      }
      if (nextRock > 60) throw new Error("no rock of the mountain's foot could be stood by and broken");
    }
  };

  t.section("the great fire while the smith is closed: nobody's felling or mining finds a half, but an admin's does");
  await knob("smith_open", 0);
  let f0 = await fellOne(U.m1), b0 = await breakOne(U.m2);
  t.check("a member fells a tree and another breaks a rock with the smith closed: both done as ever, no `fire` in either answer, the fire's row untouched, nothing written of it",
    f0.felled?.ok === true && f0.felled.felled.length === 1 && f0.felled.fire === undefined && b0.broke.fire === undefined && same(await fireKept(), {}) && (await deeds("fire_found")).length === 0, [f0.felled?.why ?? f0.felled?.fire, b0.broke?.fire]);
  await knob("smith_open", 1);
  await on(MIN);

  t.section("a tool from as it was bought: every try by the database's own chance, read off before the call and never sent");
  const kind = "pick";
  /** Everything the tries to the top can take, and the tool in slot 0. */
  const stocked = (tool, more = {}) => patch(U.m1, { coins: 20000, hand: null, gifts: { had: [], charms: [], owed: 0, familiar: null, used: {} }, pouches: {},
    bag: bag(tool, { item: "shardCopper", n: 99 }, { item: "shardIron", n: 99 }, { item: "oreIron", n: 30 }, { item: "oreSilver", n: 60 }, { item: "timber", n: 99 }, { item: "timber", n: 99 }), ...more });
  await stocked({ item: kind, n: 1 });
  await t.sql(`update public.town_smiths set doc = doc || '{"pending": null}'::jsonb where member_id = $1`, [U.m1]);
  /** One try through the member's own function, with the chance the database is about to draw read off first (`fits`: of the try's own number). */
  const tryOnce = async (fits = () => true) => {
    const tool = (await purseOf(U.m1)).bag[0], from = tool.plus ?? 0, mark = await lastDeed();
    const [r, luck] = await chance(2, ([x]) => fits(outcome(from + 1, x)));
    const answer = await ask(U.m1, "town_smith_try", 0);
    return { answer, from, r, luck, want: outcome(from + 1, r), deed: (await deedsAfter(mark)).filter((d) => d.what === "forge")[0] ?? null, after: (await purseOf(U.m1)).bag[0] };
  };
  const log = [];
  for (let level = 0; level < MILE[0]; level++) {
    const coins = await coinsOf(U.m1), pBefore = await purseOf(U.m1), x = await tryOnce(), cost = costOf(kind, level + 1), pAfter = await purseOf(U.m1);
    log.push(x.answer?.ok === true && x.answer.out === x.want && x.answer.from === level && x.answer.level === (x.want === "taken" ? level + 1 : level) && (x.after.plus ?? 0) === x.answer.level
      && (await coinsOf(U.m1)) === coins - cost.fee && held(pAfter, cost.ore) === held(pBefore, cost.ore) - cost.n && held(pAfter, "timber") === held(pBefore, "timber") - cost.timber
      && x.deed?.doc.r === x.r && x.deed.doc.out === x.want && x.deed.coins === -cost.fee && x.deed.doc.to === level + 1 && x.deed.thing === kind && x.deed.doc.fire === undefined && x.answer.fire === undefined && x.answer.r === undefined);
  }
  p = await purseOf(U.m1);
  t.check(`three tries to +${MILE[0]}: each goes as the table says of the number the database drew (written in its deed, told to no page), takes its ore, timber and fee, and leaves the tool in its slot`, log.every(Boolean) && p.bag[0].plus === MILE[0], [log, p.bag[0]]);
  t.check(`at +${MILE[0]} the maker is written on the tool, as the site calls them`, same(p.bag[0].makers, [NAME[U.m1]]), p.bag[0]);

  t.section("a draw owed: laid out by the database's chance, the same however often it is asked for, chosen once; the board's first");
  let x = await tryOnce();
  t.check("a tool owed a draw is not forged further: `owed`, nothing spent, nothing written", x.answer?.why === "owed" && x.deed === null && same(await purseOf(U.m1), p), x.answer);
  const first = pool(kind, 1);
  let [r1, r2] = await chance(2);
  const pick2 = (from, a, b) => { const left = [...from], out = []; for (const r of [a, b]) out.push(...left.splice(Math.min(left.length - 1, Math.floor(Math.max(0, Math.min(0.999999, r)) * left.length)), 1)); return out; };
  let drawn = await ask(U.m1, "town_smith_draw", 0);
  t.check("the draw: two options of the first pool, as the code picks them by the two numbers the database drew; it waits", drawn?.ok === true && drawn.fresh === true && same(drawn.pending, { item: kind, at: 0, offer: pick2(first, r1, r2) })
    && same((await smithyOf(U.m1)).pending, drawn.pending) && same(drawn.smith.smithy.pending, drawn.pending), drawn?.pending);
  const mark0 = await lastDeed(), sameAgain = [await ask(U.m1, "town_smith_draw", 0), await ask(U.m1, "town_smith_draw", 0), await ask(U.m1, "town_smith_draw", 0)];
  t.check("asked for again, three times: the same draw each time, not fresh, and nothing more written down", sameAgain.every((r) => r?.ok === true && r.fresh === false && same(r.pending, drawn.pending)) && (await deedsAfter(mark0)).length === 0 && (await deeds("forge_draw")).length === 1,
    sameAgain.map((r) => r?.pending));
  const bad = [await ask(U.m1, "town_smith_choose", 0, first.find((id) => !drawn.pending.offer.includes(id))), await ask(U.m1, "town_smith_choose", 1, drawn.pending.offer[0]), await ask(U.m1, "town_smith_choose", 0, "no-such"), await ask(U.m1, "town_smith_choose", -1, drawn.pending.offer[0])];
  t.check("an option that was not laid out, another slot, what is no option, no slot: refused, and the draw still waits", same(bad.map((r) => r?.why), ["none", "tool", "none", "tool"]) && same((await smithyOf(U.m1)).pending, drawn.pending), bad.map((r) => r?.why));
  let chose = await ask(U.m1, "town_smith_choose", 0, drawn.pending.offer[1]);
  p = await purseOf(U.m1);
  t.check("one chosen: it is the tool's, the draw is over, and the village's board has its first finder", chose?.ok === true && chose.opt === drawn.pending.offer[1] && chose.kept === false && same(p.bag[0].opts, [drawn.pending.offer[1]])
    && (await smithyOf(U.m1)).pending === null && same(Object.keys((await boardKept()).found), [drawn.pending.offer[1]]) && (await boardKept()).found[drawn.pending.offer[1]].by === U.m1
    && (await boardKept()).found[drawn.pending.offer[1]].name === NAME[U.m1] && same(chose.smith.board, await boardKept()), [chose, await boardKept()]);
  const twice = await ask(U.m1, "town_smith_choose", 0, drawn.pending.offer[0]);
  t.check("chosen again: `none`, and the tool has the one option still", twice?.why === "none" && same((await purseOf(U.m1)).bag[0].opts, [drawn.pending.offer[1]]), twice);
  w = await deeds("forge_first");
  t.check("the first written down once", w.length === 1 && w[0].thing === drawn.pending.offer[1] && w[0].doc.which === "found", w);

  t.section(`on to +${TOP - 1}: failures leave the level or take one, never under the floor; the second milestone's draw`);
  const walked = [];
  for (let guard = 0; guard < 400 && ((await purseOf(U.m1)).bag[0].plus ?? 0) < TOP - 1; guard++) {
    const tool = (await purseOf(U.m1)).bag[0];
    if ((tool.plus ?? 0) >= MILE[1] && !(tool.opts ?? [])[1]) {
      [r1, r2] = await chance(2);
      const d2 = await ask(U.m1, "town_smith_draw", 0), want2 = pick2(first.filter((id) => !(tool.opts ?? []).includes(id)), r1, r2);
      walked.push({ draw: d2?.ok === true && same(d2.pending, { item: kind, at: 1, offer: want2 }) });
      await ask(U.m1, "town_smith_choose", 0, d2.pending.offer[0]);
      continue;
    }
    // (now and then a try that fails, to see the level stay and fall)
    const want = guard % 5 === 1 ? "down" : guard % 5 === 3 ? "stays" : "taken", o = tryOf((tool.plus ?? 0) + 1);
    x = await tryOnce((out) => (o[want === "taken" ? "take" : want === "stays" ? "stay" : "down"] > 0 ? out === want : out === "taken"));
    walked.push({ from: x.from, out: x.answer?.out, level: x.answer?.level, ok: x.answer?.ok === true && x.answer.out === x.want && x.answer.level === (x.want === "taken" ? x.from + 1 : x.want === "down" ? Math.max(Math.min(x.from, F.forge.floor), x.from - 1) : x.from) && (x.after.plus ?? 0) === x.answer.level && x.after.item === kind });
    if (held(await purseOf(U.m1), "oreSilver") < 10) await stocked((await purseOf(U.m1)).bag[0]);
  }
  p = await purseOf(U.m1);
  t.check(`every try went as the table says of the number drawn; some stayed, some lost a level, none fell under +${F.forge.floor}, none lost the tool or an option`, walked.filter((s_) => "ok" in s_).every((s_) => s_.ok) && walked.some((s_) => s_.out === "stays")
    && walked.some((s_) => s_.out === "down" && s_.level === s_.from - 1) && walked.filter((s_) => "ok" in s_).every((s_) => s_.level >= Math.min(s_.from, F.forge.floor)) && p.bag[0].plus === TOP - 1 && p.bag[0].opts.length === 2, walked.filter((s_) => s_.ok === false));
  t.check("the second milestone's draw was of the first pool less the option the tool has, and its maker is written beside the first", walked.filter((s_) => "draw" in s_).length === 1 && walked.find((s_) => "draw" in s_).draw && same(p.bag[0].makers, [NAME[U.m1], NAME[U.m1]]), p.bag[0]);

  t.section(`the try for +${TOP} needs the great fire: refused without it, and nothing is taken`);
  const at9 = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), deeds: await written() };
  x = await tryOnce();
  t.check("no fire lit: `fire`, with all its ore, timber and coins in the bag; nothing spent, nothing written", x.answer?.why === "fire" && same(await purseOf(U.m1), at9.purse) && (await coinsOf(U.m1)) === at9.coins && (await written()) === at9.deeds, x.answer);
  let joined = await ask(U.m2, "town_fire_join");
  t.check("the row is for those with a tool one level under the top: a member without one is refused, `level`", joined?.why === "level" && (await fireKept()).row === undefined, joined);
  joined = await ask(U.m1, "town_fire_join");
  let fire = await fireNow();
  t.check("a member with one puts their name in the row, under the name the site calls them; told with where they stand", joined?.ok === true && same(fire.row, [{ id: U.m1, name: NAME[U.m1], since: NOW }])
    && same(joined.smith.fire, { flint: null, tinder: null, lit: false, row: [{ id: U.m1, name: NAME[U.m1] }], open: 0, mine: 0, topped: false }), [joined?.smith?.fire, fire]);
  const joinedTwice = await ask(U.m1, "town_fire_join");
  t.check("the same name twice: `twice`, and the row has it once", joinedTwice?.why === "twice" && (await fireKept()).row.length === 1, joinedTwice);
  x = await tryOnce();
  t.check("in the row, and still no fire lit: `fire`", x.answer?.why === "fire", x.answer);

  t.section("the fire's halves: tinder by a tree felled, flint by a rock paid for; under the finder's name; lit with both");
  await patch(U.admin, { bag: bag() });
  const stood = await (async () => {
    // (a go that is not cut through: the tree stands, and nothing is found)
    const was = await purseOf(U.m2), tree = pines[nextPine++ % pines.length], spot = [tree.x - 1, tree.y];
    await patch(U.m2, { bag: bag({ item: "axe", n: 1 }), hand: "axe", handAt: 0, stamina: { day: dayOf(NOW), left: 100 } });
    await t.sql(`update public.town_things set doc = '{"down": {}, "half": []}'::jsonb where key = 'grove'`);
    const refused = await ask(U.m2, "town_fell", { tree: tree.id, through: true, misses: 0, secs: 30 }, spot[0] - 9, spot[1]);
    await patch(U.m2, { bag: was.bag, hand: was.hand ?? null, handAt: was.handAt ?? null });
    return refused;
  })();
  t.check("a felling call that fells no tree finds nothing: the fire is as it was", stood?.ok === false && stood.fire === undefined && ((await fireKept()).tinder ?? null) === null, stood?.why);
  let markF = await lastDeed();
  let f1 = await fellOne(U.m2);
  fire = await fireNow();
  t.check("the next tree felled is the village's tinder: kept under the feller's name, told in the feller's own answer (the half, and that the fire is not lit yet)", f1.felled?.ok === true && f1.felled.felled.length === 1
    && same(f1.felled.fire, { half: "tinder", lit: false }) && fire.tinder?.id === U.m2 && fire.tinder.name === NAME[U.m2] && fire.tinder.at === NOW && (fire.flint ?? null) === null, [f1.felled?.fire ?? f1.felled?.why, fire]);
  w = (await deedsAfter(markF)).filter((d) => d.what === "fire_found");
  t.check("…written down once, in the finder's name", w.length === 1 && w[0].member_id === U.m2 && w[0].thing === "tinder" && w[0].doc.lit === false, w);
  const f2 = await fellOne(U.m1);
  t.check("another tree felled finds nothing more: the tinder is found once", f2.felled?.ok === true && f2.felled.fire === undefined && same((await fireKept()).tinder, fire.tinder) && (await deeds("fire_found")).length === 1, f2.felled?.fire);
  // (a rock that another member struck first: it is THEY who are paid, and the flint is theirs)
  markF = await lastDeed();
  const b1 = await breakOne(U.m2, U.admin);
  fire = await fireNow();
  t.check("a rock the admin struck first, broken by another member: the admin is paid, and the flint is kept under the admin's name; the helper's answer says nothing of it; the fire is lit",
    b1.broke.helped === true && b1.broke.paid === U.admin && b1.broke.fire === undefined && fire.flint?.id === U.admin && fire.flint.name === NAME[U.admin] && fire.flint.at === NOW
    && same((await deedsAfter(markF)).filter((d) => d.what === "fire_found").map((d) => [d.member_id, d.thing, d.doc.lit]), [[U.admin, "flint", true]]), [{ ...b1.broke, purse: undefined, cave: undefined }, fire]);
  const b2 = await breakOne(U.m1);
  t.check("another rock broken finds nothing more", b2.broke.ok === true && b2.broke.fire === undefined && same((await fireKept()).flint, fire.flint), b2.broke.fire);
  look = await ask(U.m1, "town_smith");
  t.check("what a page is told: both halves with their finders' names, lit, the row, the first of it may use it, and I am the first", same(look.smith.fire, { flint: { name: NAME[U.admin] }, tinder: { name: NAME[U.m2] }, lit: true,
    row: [{ id: U.m1, name: NAME[U.m1] }], open: 1, mine: 0, topped: false }), look.smith.fire);

  t.section("the row of turns: who is not in it, whose turn it is not, and one more of the row with every turn's while");
  // (the admin and the second member each with a tool one under the top, and the admin ahead of both in the row)
  await patch(U.m2, { coins: 5000, bag: bag({ item: "axe", n: 1, plus: TOP - 1, opts: pool("axe", 1).slice(0, 2) }, { item: "oreSilver", n: 20 }, { item: "timber", n: 40 }) });
  const notIn = await ask(U.m2, "town_smith_try", 0);
  t.check("a member with a tool one under the top who is not in the row: `row`, nothing spent", notIn?.why === "row" && (await coinsOf(U.m2)) === 5000, notIn);
  await ask(U.m2, "town_fire_join");
  const second = await ask(U.m2, "town_smith_try", 0);
  t.check("second in the row while the first has the fire to themself: `turn`, nothing spent", second?.why === "turn" && (await coinsOf(U.m2)) === 5000 && same((await fireKept()).row.map((r) => r.id), [U.m1, U.m2]), second);
  await on(FIRE.turn - (NOW - Math.max(fire.flint.at, fire.tinder.at)) - 1);
  const stillNot = await ask(U.m2, "town_smith");
  await on(1);
  const nowMay = await ask(U.m2, "town_smith");
  t.check("a turn's while after it was lit, to the millisecond, the second of the row may use it too (somebody away is passed over and keeps their place)", stillNot.smith.fire.open === 1 && nowMay.smith.fire.open === 2 && nowMay.smith.fire.mine === 1, [stillNot.smith.fire.open, nowMay.smith.fire.open]);
  const left = await ask(U.m2, "town_fire_leave"), leftTwice = await ask(U.m2, "town_fire_leave");
  t.check("a name taken out of the row, once: again is `none`", left?.ok === true && leftTwice?.why === "none" && same((await fireKept()).row.map((r) => r.id), [U.m1]), [left, leftTwice]);
  t.check("joining and leaving are written down", (await deeds("fire_join")).length === 2 && (await deeds("fire_leave")).length === 1);

  t.section("a try with the fire: it is spent whatever comes of it, and the time of the next is drawn by the database and told to nobody");
  const lit = await fireNow();
  x = await tryOnce((out) => out === "stays");
  fire = await fireNow();
  const wait = FIRE.wait.least + x.luck * (FIRE.wait.most - FIRE.wait.least);
  t.check("a try that fails: the level stays, its ore, timber and fee are gone as at any try, and the fire is spent: both halves gone, the member at the row's end",
    x.answer?.ok === true && x.answer.out === "stays" && x.answer.level === TOP - 1 && x.answer.spent === true && (fire.flint ?? null) === null && (fire.tinder ?? null) === null && same(fire.row, [{ id: U.m1, name: NAME[U.m1], since: NOW }]) && same(fire.topped, []), [x.answer, fire]);
  t.check(`the halves of the next can be found after a while of ${FIRE.wait.least / DAY} to ${FIRE.wait.most / DAY} days, drawn by the second number of chance of the call (it is the one the code's rule gives for that number)`,
    fire.due === NOW + Math.round(wait) && fire.due >= NOW + FIRE.wait.least && fire.due <= NOW + FIRE.wait.most && lit.due !== fire.due, [fire.due - NOW, Math.round(wait)]);
  t.check("the try's deed says the fire was spent, and nothing of when the next comes; the answer has no fire but the one a page is told, not lit",
    x.deed?.doc.fire === true && !JSON.stringify(x.deed.doc).includes(String(fire.due)) && x.deed.doc.due === undefined && same(x.answer.smith.fire, { flint: null, tinder: null, lit: false, row: [{ id: U.m1, name: NAME[U.m1] }], open: 0, mine: 0, topped: false }), [x.deed?.doc, x.answer?.smith?.fire]);
  x = await tryOnce();
  t.check("tried again at once: `fire`, nothing spent", x.answer?.why === "fire" && x.deed === null, x.answer);
  const early = [await fellOne(U.m2), await breakOne(U.m2)];
  t.check("before its time has come no tree and no rock finds a half, however many are felled and broken", early[0].felled?.ok === true && early[0].felled.fire === undefined && early[1].broke.fire === undefined && (await fireKept()).tinder === null && (await fireKept()).flint === null);
  // (a felling takes its thirty seconds at the board: begun so that the tree falls a millisecond before the fire's time)
  await on(fire.due - NOW - 30_001);
  const justBefore = await fellOne(U.m2);
  t.check("a millisecond and a tree's felling before its time: nothing", justBefore.felled?.ok === true && justBefore.felled.fire === undefined && (await fireKept()).tinder === null, justBefore.felled?.fire);
  await on(DAY);
  const f3 = await fellOne(U.m1), b3 = await breakOne(U.m1);
  fire = await fireNow();
  t.check("once its time has come: the next tree is its tinder and the next rock its flint (here by the same member, in the answers of the two calls), and it is lit again",
    same(f3.felled?.fire, { half: "tinder", lit: false }) && same(b3.broke.fire, { half: "flint", lit: true }) && fire.flint.id === U.m1 && fire.tinder.id === U.m1, [f3.felled?.fire ?? f3.felled?.why, b3.broke.fire]);
  await stocked((await purseOf(U.m1)).bag[0]);
  x = await tryOnce((out) => out === "taken");
  fire = await fireNow();
  p = await purseOf(U.m1);
  t.check(`a try that takes: the tool is at +${TOP}, the fire is spent, and the member is counted for good and out of the row`, x.answer?.ok === true && x.answer.out === "taken" && x.answer.level === TOP && p.bag[0].plus === TOP
    && same(fire.row, []) && same(fire.topped, [U.m1]) && fire.flint === null && x.answer.smith.fire.topped === true && x.answer.smith.fire.mine === -1, [x.answer, fire]);
  t.check("the board has the first of its kind at the top, written down once; and the third maker's name is on the tool", (await boardKept()).tops[kind]?.by === U.m1 && (await boardKept()).tops[kind].name === NAME[U.m1]
    && (await deeds("forge_first")).filter((d) => d.doc.which === "tops" && d.thing === kind).length === 1 && same(p.bag[0].makers, [NAME[U.m1], NAME[U.m1], NAME[U.m1]]), [await boardKept(), p.bag[0]]);
  const back = await ask(U.m1, "town_fire_join");
  t.check("who has taken the top may not stand in the row again: `topped`", back?.why === "topped" && same((await fireKept()).row, []), back);
  x = await tryOnce();
  t.check(`a tool at +${TOP} is tried no further (\`top\`), whether or not its last draw is still owed`, x.answer?.why === "top" && x.deed === null, x.answer?.why);
  [r1, r2] = await chance(2);
  drawn = await ask(U.m1, "town_smith_draw", 0);
  chose = await ask(U.m1, "town_smith_choose", 0, drawn?.pending?.offer?.[0]);
  x = await tryOnce();
  t.check("its last draw is of the second pool: drawn, chosen, and the try still says `top`", same(drawn?.pending, { item: kind, at: 2, offer: pick2(pool(kind, 2), r1, r2) }) && chose?.ok === true && (await purseOf(U.m1)).bag[0].opts.length === 3 && x.answer?.why === "top", [drawn?.pending, x.answer]);
  const TOPPED = (await purseOf(U.m1)).bag[0];

  t.section("a gem set, with its mount of fine timber: over none, over another, the same again");
  await patch(U.m1, { coins: 2 * K.gem.fee + 5, bag: bag(TOPPED, { item: "gemRuby", n: 2 }, { item: "gemOnyx", n: 1 }, { item: "timber", n: 2 * K.gem.mounts + 1 }, { item: "oreCopper", n: 9 }) });
  const g1 = await ask(U.m1, "town_smith_gem", 0, "gemRuby"), g1b = await ask(U.m1, "town_smith_gem", 0, "gemRuby"), g2 = await ask(U.m1, "town_smith_gem", 0, "gemOnyx"), g3 = await ask(U.m1, "town_smith_gem", 0, "gemRuby");
  p = await purseOf(U.m1);
  t.check("set: the gem, five fine timber and the fee each time; the same element again is refused (`same`) and takes nothing; a third with one timber left: `timber`; copper ore is not taken",
    g1?.ok === true && g1.element === "fire" && g1.over === null && g1b?.why === "same" && g2?.ok === true && g2.element === "dark" && g2.over === "fire" && g3?.why === "timber"
    && same(p.bag[0].gems, ["dark"]) && held(p, "gemRuby") === 1 && held(p, "gemOnyx") === 0 && held(p, "timber") === 1 && held(p, "oreCopper") === 9 && (await coinsOf(U.m1)) === 5
    && same({ ...p.bag[0], gems: undefined }, { ...TOPPED, gems: undefined }), [g1?.why, g1b?.why, g2?.why, g3?.why, p.bag[0]]);
  const gemBad = [await ask(U.m1, "town_smith_gem", 0, "chipRuby"), await ask(U.m1, "town_smith_gem", 0, "gemTopaz"), await ask(U.m1, "town_smith_gem", 1, "gemRuby"), await ask(U.m1, "town_smith_gem", 0, null)];
  t.check("a fragment, a gem one has not, a slot with no tool, no gem: refused", same(gemBad.map((r) => r?.why), ["gem", "gem", "tool", "gem"]), gemBad.map((r) => r?.why));
  w = await deeds("gem_set");
  t.check("each setting written down, with what it was set over", same(w.map((d) => [d.thing, d.coins, d.doc.element, d.doc.over, d.doc.item]), [["gemRuby", -K.gem.fee, "fire", null, kind], ["gemOnyx", -K.gem.fee, "dark", "fire", kind]]), w);

  t.section("an option drawn again, for a gem and a fee: the old one may be kept; what was paid is not given back");
  await patch(U.m1, { coins: 2 * K.redraw.fee, bag: bag(TOPPED, { item: "gemAmber", n: 1 }), gifts: { had: ["thingSack"], charms: [], owed: 0, familiar: null, used: {} }, pouches: { thingSack: [{ item: "gemAmber", n: 1 }, null, null, null, null] } });
  [r1, r2] = await chance(2);
  const re = await ask(U.m1, "town_smith_redraw", 0, 0, "gemAmber");
  t.check("the first milestone's option drawn again: two of its pool less those the tool has, the old one beside them; a gem (the bag's first) and the fee are gone", re?.ok === true
    && same(re.pending, { item: kind, at: 0, offer: pick2(first.filter((id) => !TOPPED.opts.includes(id)), r1, r2), old: TOPPED.opts[0] }) && (await coinsOf(U.m1)) === K.redraw.fee
    && !(await purseOf(U.m1)).bag.some((b) => b?.item === "gemAmber") && (await purseOf(U.m1)).pouches.thingSack[0].n === 1, re?.pending);
  const reAgain = await ask(U.m1, "town_smith_redraw", 0, 1, "gemAmber"), drawAgain = await ask(U.m1, "town_smith_draw", 0);
  t.check("while it waits nothing else is drawn for that tool (`owed`), and the draw asked for again is the same one, with the old option in it", reAgain?.why === "owed" && drawAgain?.ok === true && drawAgain.fresh === false && same(drawAgain.pending, re.pending)
    && (await coinsOf(U.m1)) === K.redraw.fee, [reAgain?.why, drawAgain?.pending]);
  const kept = await ask(U.m1, "town_smith_choose", 0, TOPPED.opts[0]);
  t.check("the old one kept: the tool is as it was, the draw is over", kept?.ok === true && kept.kept === true && same((await purseOf(U.m1)).bag[0], TOPPED) && (await smithyOf(U.m1)).pending === null, kept);
  const re2 = await ask(U.m1, "town_smith_redraw", 0, 1, "gemAmber"), took = await ask(U.m1, "town_smith_choose", 0, re2?.pending?.offer?.[0]);
  t.check("drawn again at the second milestone with the gem from the sack, and a new one chosen: it is in the old one's place", re2?.ok === true && took?.ok === true && took.kept === false
    && same((await purseOf(U.m1)).bag[0].opts, [TOPPED.opts[0], re2.pending.offer[0], TOPPED.opts[2]]) && (await purseOf(U.m1)).pouches.thingSack[0] === null && (await coinsOf(U.m1)) === 0, [re2?.pending, (await purseOf(U.m1)).bag[0]]);
  const reBad = [await ask(U.m1, "town_smith_redraw", 0, 0, "gemAmber"), await ask(U.m1, "town_smith_redraw", 0, 5, "gemAmber"), await ask(U.m1, "town_smith_redraw", 3, 0, "gemAmber")];
  t.check("no gem left, a milestone that is none, a slot with no tool: refused", same(reBad.map((r) => r?.why), ["gem", "none", "tool"]), reBad.map((r) => r?.why));

  t.section("a move: what the smith put into a tool, to another tool of its line; and between the hoe and the can, away from home and back");
  const POT = { item: "pot", n: 1, plus: 7, opts: pool("pot", 1).slice(0, 2), gems: ["ice"], makers: ["Aqua", "Nine"] };
  const sticker = (level) => F.tries.reduce((n, y) => n + (y.to <= level ? y.fee : 0), 0), feeOf = (kinds, level) => Math.max(K.move.least, Math.ceil((K.move.share * sticker(level)) / (100 * kinds)));
  await patch(U.m1, { coins: 1000, gifts: { had: [], charms: [], owed: 0, familiar: null, used: {} }, pouches: {}, bag: bag(POT, { item: "grill", n: 1 }, { item: "pick", n: 1, plus: 4 }, { item: "pan", n: 1, plus: 3 }) });
  const moveBad = [];
  for (const [from, to, x_, y_, playing] of [[0, 1, BY[0] + 9, BY[1], false], [0, 1, null, null, false], [0, 0, ...BY, false], [0, 5, ...BY, false], [2, 0, ...BY, false], [0, 3, ...BY, false], [0, 1, ...BY, true]]) moveBad.push((await ask(U.m1, "town_smith_move", from, to, x_, y_, playing))?.why);
  t.check("refused, each for its reason and before a coin is taken: far from the forge, no tile said, the same slot twice, a slot with no tool, a tool alone in its line, a tool owed a draw, a game being played",
    same(moveBad, ["far", "far", "twice", "tool", "alone", "owed", "playing"]) && (await coinsOf(U.m1)) === 1000 && same((await purseOf(U.m1)).bag[0], POT), moveBad);
  await patch(U.m1, { coins: feeOf(3, 7) - 1 });
  const poor = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  await patch(U.m1, { coins: 1000 });
  const mv = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  p = await purseOf(U.m1);
  t.check(`from the pot to a plain grill, by the forge: everything the smith put in is the grill's (the plus, the options awake, the gem, the makers' names), the pot is plain, both in their slots; for ${feeOf(3, 7)} coins, and one short is \`coins\``,
    poor?.why === "coins" && mv?.ok === true && mv.fee === feeOf(3, 7) && mv.spilt === 0 && same(p.bag[0], { item: "pot", n: 1 }) && same(p.bag[1], { ...POT, item: "grill" }) && (await coinsOf(U.m1)) === 1000 - feeOf(3, 7), [poor?.why, mv, p.bag.slice(0, 2)]);
  const same2 = await ask(U.m1, "town_smith_move", 0, 3, ...BY, false);
  t.check("…and the pot, plain now, with the pan that is owed a draw: `owed`", same2?.why === "owed", same2);
  w = await deeds("forge_move");
  t.check("written down, with the fee", w.length === 1 && w[0].coins === -feeOf(3, 7) && w[0].doc.from === 0 && w[0].doc.to === 1 && w[0].doc.level === 7, w);
  const HOE = { item: "hoe", n: 1, plus: 6, opts: pool("hoe", 1).slice(0, 2), makers: ["Aqua"] };
  await patch(U.m1, { coins: 5000, bag: bag(HOE, { item: "can", n: 1, water: 8 }, { item: "shardIron", n: 60 }, { item: "oreIron", n: 20 }, { item: "timber", n: 60 }, { item: "gemRuby", n: 2 }, { item: "oreSilver", n: 9 }) });
  const out1 = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  p = await purseOf(U.m1);
  t.check("from the hoe to the can: the can carries the hoe's forging with the hoe written as its kind, and keeps its water", out1?.ok === true && out1.fee === feeOf(2, 6) && same(p.bag[1], { ...HOE, item: "can", water: 8, origin: "hoe" }) && same(p.bag[0], { item: "hoe", n: 1 }), p.bag.slice(0, 2));
  const away = [await ask(U.m1, "town_smith_try", 1), await ask(U.m1, "town_smith_draw", 1), await ask(U.m1, "town_smith_redraw", 1, 0, "gemRuby")];
  const gemAway = await ask(U.m1, "town_smith_gem", 1, "gemRuby");
  t.check("away from home it is neither forged further nor drawn for again (`foreign`, nothing spent); a gem is set in it all the same", same(away.map((r) => r?.why), ["foreign", "foreign", "foreign"]) && gemAway?.ok === true
    && (await coinsOf(U.m1)) === 5000 - feeOf(2, 6) - K.gem.fee, [away.map((r) => r?.why), gemAway?.why]);
  const home = await ask(U.m1, "town_smith_move", 1, 0, ...BY, false);
  p = await purseOf(U.m1);
  t.check("moved back: the hoe has it all again with the gem set meanwhile, nothing says `origin` any more, and it is forged further as ever", home?.ok === true && same(p.bag[0], { ...HOE, gems: ["fire"] }) && same(p.bag[1], { item: "can", n: 1, water: 8 })
    && (await ask(U.m1, "town_smith_try", 0))?.ok === true, p.bag.slice(0, 2));
  await patch(U.m1, { coins: 5000, bag: bag({ item: "can", n: 1, plus: 10, opts: ["cnThrift", "cnKind", "cnRain"], water: 16 }, { item: "hoe", n: 1, plus: 4, opts: ["hoClear"] }) });
  const spill = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  p = await purseOf(U.m1);
  const canAt4 = CODE.farming.cans.can + F.levels.can.waterings[4] - F.levels.can.waterings[0];
  t.check("a full can whose forging is traded for a lesser one holds no more water than it holds now: what is over is spilt, and said", spill?.ok === true && p.bag[0].water === canAt4 && spill.spilt === 16 - canAt4 && p.bag[0].plus === 4 && p.bag[1].plus === 10, [spill, p.bag.slice(0, 2)]);
  await patch(U.m1, { coins: 5000, canFull: NOW + 5 * MIN, bag: bag({ item: "can", n: 1, plus: 10, opts: ["cnThrift", "cnKind", "cnFull"], water: 3 }, { item: "hoe", n: 1 }) });
  const run = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  await patch(U.m1, { canFull: NOW - 1 });
  const ran = await ask(U.m1, "town_smith_move", 0, 1, ...BY, false);
  t.check("while a timed option of one of the two is going on the forging is not moved (`running`); once it is over, it is", run?.why === "running" && ran?.ok === true, [run?.why, ran?.why]);

  t.section("a counted option of the tool in the hand, used to its last");
  const power = F.options.of.ntFreeze.use;
  await patch(U.m1, { hand: "bugNet", handAt: 0, powers: {}, bag: bag({ item: "bugNet", n: 1, plus: 10, opts: ["", "", "ntFreeze"] }, { item: "bugNet", n: 1 }) });
  const uses = [];
  for (let i = 0; i < power.n + 1; i++) uses.push(await ask(U.m1, "town_tool_power", "ntFreeze"));
  t.check(`used ${power.n} times in its stretch, each counted in the purse and told how many are left; then \`spent\``, uses.slice(0, power.n).every((r, i) => r?.ok === true && r.left === power.n - 1 - i) && uses[power.n]?.why === "spent"
    && (await purseOf(U.m1)).powers.ntFreeze.n === power.n && (await deeds("power")).length === power.n, uses.map((r) => r?.left ?? r?.why));
  await patch(U.m1, { handAt: 1, powers: {} });
  const plainHand = await ask(U.m1, "town_tool_power", "ntFreeze"), noSuch = [await ask(U.m1, "town_tool_power", "ntNest"), await ask(U.m1, "town_tool_power", "no-such"), await ask(U.m1, "town_tool_power", null)];
  t.check("of the two nets it is the one taken up that counts: with the plain one in the hand, `none`; an option that is not counted, what is none: `none`", plainHand?.why === "none" && noSuch.every((r) => r?.why === "none") && same((await purseOf(U.m1)).powers, {}), [plainHand, noSuch.map((r) => r?.why)]);

  t.section("the odds of a try are the table's, by the database's own chance: no page has a say");
  const sig = (await t.sql(`select p.proname, pg_get_function_identity_arguments(p.oid) as args from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_smith_try', 'town_smith_draw', 'town_smith_redraw') order by 1`)).rows;
  const steer = [await t.as(U.m1, `select public.town_smith_try(0, 0.01)`), await t.as(U.m1, `select public.town_smith_try(0, 0.01::double precision, 0.5::double precision)`), await t.as(U.m1, `select public.town_smith_draw(0, 0.1, 0.2)`)];
  t.check("the functions a member calls take a slot (and a milestone and a gem) and no number of chance: one sent is no function at all", same(sig.map((r) => `${r.proname}(${r.args})`), ["town_smith_draw(p_slot integer)", "town_smith_redraw(p_slot integer, p_at integer, p_gem text)", "town_smith_try(p_slot integer)"])
    && steer.every((r) => /does not exist/.test(r.error ?? "")), [sig, steer.map((r) => r.error)]);
  const FROM = 5, o6 = tryOf(FROM + 1), markT = await lastDeed();
  await t.sql(`select setseed(0.4242)`);
  for (let i = 0; i < TRIES; i++) {
    await patch(U.m1, { coins: 100000, hand: null, bag: bag({ item: "pot", n: 1, plus: FROM, opts: pool("pot", 1).slice(0, 1) }, { item: "oreIron", n: 9 }, { item: "timber", n: 9 }) });
    await call(U.m1, "town_smith_try", 0);
  }
  const tried = (await deedsAfter(markT)).filter((d) => d.what === "forge"), share = (out) => tried.filter((d) => d.doc.out === out).length / tried.length;
  const sd = (pc) => Math.sqrt((pc / 100) * (1 - pc / 100) / TRIES);
  t.check(`${TRIES} tries from +${FROM}: every one went as the table says of its own number, the numbers are all different and all from nothing up to one`, tried.length === TRIES && tried.every((d) => d.doc.out === outcome(FROM + 1, d.doc.r) && d.doc.r >= 0 && d.doc.r < 1)
    && new Set(tried.map((d) => d.doc.r)).size === TRIES, tried.length);
  t.check(`…and they took ${o6.take} in a hundred, stayed ${o6.stay}, lost a level ${o6.down}, within four standard deviations each`, Math.abs(share("taken") - o6.take / 100) < 4 * sd(o6.take) && Math.abs(share("stays") - o6.stay / 100) < 4 * sd(o6.stay) + 0.01
    && Math.abs(share("down") - o6.down / 100) < 4 * sd(o6.down) + 0.01, [share("taken"), share("stays"), share("down")]);

  t.section("the order rows are held in, read off the text of every function that holds one");
  const made = [...new Set([...sql.matchAll(/create or replace function ((?:public|town)\.[a-z0-9_]+)\s*\(/gi)].map((m) => m[1].toLowerCase()))];
  const src = Object.fromEntries((await t.sql(`select n.nspname || '.' || p.proname as name, p.prosrc as src from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public')`)).rows.map((r) => [r.name, r.src]));
  const HOLDS = [["the grove", /town\.thing\('grove', true\)/g, 1], ["a place of the cave", /town\.cave_kept\([^()]*, true\)/g, 1], ["the great fire", /town\.fire_kept\(true\)/g, 2], ["the smith's board", /town\.thing\('smith', true\)/g, 3],
    ["a purse", /town\.purse_of\([^()]*, true\)/g, 4], ["a smithy", /town\.smithy_held\(/g, 5]];
  const heldBy = (name) => HOLDS.flatMap(([what, re, rank]) => [...(src[name] ?? "").replace(/--[^\n]*/g, "").matchAll(re)].map((m) => ({ what, rank, at: m.index }))).sort((a, b) => a.at - b.at);
  const callers = made.filter((n) => n.startsWith("public.")), order = Object.fromEntries(callers.map((n) => [n, heldBy(n).map((h) => h.what)]));
  const outOfOrder = callers.filter((n) => heldBy(n).some((h, i, l) => i > 0 && h.rank < l[i - 1].rank));
  t.check("every function a member calls takes its rows in the one order: the grove or a place of the cave, the great fire, the board, the purses, a smithy", outOfOrder.length === 0, outOfOrder.map((n) => [n, order[n]]));
  const WANT = {
    "public.town_fell": ["the grove", "the great fire", "a purse", "a purse", "a purse"], "public.town_mine": ["a place of the cave", "the great fire", "a purse", "a purse", "a purse"],
    "public.town_smith_try": ["the great fire", "the smith's board", "a purse"], "public.town_smith_choose": ["the smith's board", "a purse", "a smithy"],
    "public.town_fire_join": ["the great fire"], "public.town_fire_leave": ["the great fire"], "public.town_smith_bellows": ["a smithy"],
    "public.town_smith_smelt": ["a purse", "a smithy"], "public.town_smith_take": ["a purse", "a smithy"], "public.town_smith_widen": ["a purse", "a smithy"], "public.town_smith_draw": ["a purse", "a smithy"], "public.town_smith_redraw": ["a purse", "a smithy"],
    "public.town_smith_gem": ["a purse"], "public.town_smith_move": ["a purse"], "public.town_tool_power": ["a purse"], "public.town_smith": [], "public.town_smith_near": [], "public.town_smith_open": [],
  };
  t.check("…each holding exactly what the part's head says it holds", same(order, WANT), Object.entries(order).filter(([n, h]) => !same(h, WANT[n])));
  const rules = made.filter((n) => n.startsWith("town.")), locking = rules.filter((n) => /for\s+update/i.test(src[n] ?? "")), nested = rules.filter((n) => heldBy(n).length > 0);
  t.check("no rule of the part takes a hold but the two readers made for it, and no rule calls one of them holding: every hold is taken where it can be read, in the function a member calls",
    same(locking.sort(), ["town.fire_kept", "town.smithy_held"]) && nested.length === 0, { locking, nested });
  const writes = [["town.keep_fire(", /town\.fire_kept\(true\)/], ["town.keep_thing('smith'", /town\.thing\('smith', true\)/], ["town.keep_smithy(", /town\.smithy_held\(/], ["town.keep_purse(", /town\.purse_of\([^()]*, true\)/]];
  const unheld = callers.flatMap((n) => writes.filter(([w_, hold]) => (src[n] ?? "").includes(w_) && !hold.test(src[n])).map(([w_]) => `${n} writes with ${w_}…) and holds no such row`));
  t.check("whatever a function a member calls writes, it holds first (the half found in a felling or a mining call is written by `town.fire_find` on the row that call holds)", unheld.length === 0
    && /fire_ := town\.fire_kept\(true\)/.test(src["public.town_fell"]) && /town\.fire_find\(fire_,/.test(src["public.town_fell"]) && /town\.fire_find\(fire_,/.test(src["public.town_mine"])
    && rules.filter((n) => (src[n] ?? "").includes("town.keep_fire(")).join() === "town.fire_find", unheld);

  t.section("the moment the fire's halves can next be found is told to no page: not in any answer, not in any deed");
  fire = await fireNow();
  const told = answers.filter(([, a]) => /"due"\s*:/.test(a) || [...dues].some((d) => a.includes(d)));
  t.check(`no answer has it: of ${answers.length} answers of every function a member calls (the woodcutters' and the miners' among them), none has a \`due\` and none has one of the ${dues.size} moments the row has held`, dues.size >= 2 && told.length === 0, told.map(([fn, a]) => [fn, a.slice(0, 300)]));
  const fireKeys = answers.filter(([fn]) => fn.startsWith("town_smith") || fn.startsWith("town_fire")).map(([, a]) => JSON.parse(a)?.smith?.fire).filter(Boolean);
  t.check("what is told of the fire is always the same seven things, and none of them is a moment", fireKeys.length > 100 && fireKeys.every((f_) => Object.keys(f_).sort().join() === "flint,lit,mine,open,row,tinder,topped"
    && [f_.flint, f_.tinder].every((h) => h === null || Object.keys(h).join() === "name") && f_.row.every((r) => Object.keys(r).sort().join() === "id,name")), fireKeys.find((f_) => Object.keys(f_).length !== 7));
  const inDeeds = (await t.sql(`select id, what, doc::text as doc from public.town_deeds`)).rows.filter((d) => /"due"\s*:/.test(d.doc) || [...dues].some((x_) => d.doc.includes(x_)));
  t.check("no deed's document has it either, nor the number it was drawn by", inDeeds.length === 0 && (await deeds("forge")).filter((d) => d.doc.fire).every((d) => Object.keys(d.doc).every((k) => !["due", "chance", "wait", "luck"].includes(k))), inDeeds);
  const readers = (await t.sql(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prosrc ~ 'town_great_fire' order by 1`)).rows.map((r) => r.name);
  const kept_ = Object.keys(src).filter((n) => /town\.fire_kept\(/.test(src[n])).sort();
  t.check("the fire's table is read by three rules and no other function; and its document is asked for by the functions the head names, each of which passes on `town.fire_told` or nothing",
    same(readers, ["town.fire_kept", "town.fire_wants", "town.keep_fire"]) && same(kept_, ["public.town_fell", "public.town_fire_join", "public.town_fire_leave", "public.town_mine", "public.town_smith_try", "town.smith_told"])
    && /town\.fire_told\(town\.fire_kept\(false\)/.test(src["town.smith_told"]) && /- 'smithy' - 'fire'/.test(src["town.smith_answer"]), { readers, kept_ });

  t.section("every deed of the smith's and of the great fire's was written down in these stories, and has its word");
  const WORDS = ["smelt", "smelted", "smith_wider", "bellows", "forge", "forge_draw", "forge_choose", "forge_redraw", "gem_set", "forge_move", "forge_first", "power", "fire_found", "fire_join", "fire_leave"];
  const worded = (await t.sql(`select w.what, town.deed_th(w.what) as th, (select count(*)::int from public.town_deeds d where d.what = w.what) as n from unnest($1::text[]) w(what)`, [`{${WORDS.join(",")}}`])).rows;
  t.check("fifteen kinds of deed, each written at least once here, each with a word of its own for the tally", worded.length === WORDS.length && worded.every((r) => r.n > 0 && r.th !== r.what && /[\u0E01-\u0E5B]/.test(r.th)), worded.filter((r) => !(r.n > 0 && r.th !== r.what)));

  t.section("nothing paid to the smith went anywhere; and the part run once more over all of it changes nothing");
  t.check("no other purse, no jar, no book and nothing of the village's has a coin more or less for all the fees paid", same(await aroundNow(), around0), [around0, await aroundNow()]);
  const keptAll = async () => ({ smiths: (await t.sql(`select member_id, doc from public.town_smiths order by 1`)).rows, fire: await fireKept(), board: await boardKept(), knob: (await one(`select value from public.town_knobs where key = 'smith_open'`)).value,
    forge: (await one(`select data from public.town_catalog where key = 'forge'`)).data });
  const wasAll = await keptAll();
  await t.run(sql, "the part, a third time, over what members did");
  // (the part's own run writes town.now_ms no more than it did: the test's clock is still in its place)
  t.check("every smithy, the fire, the board, the knob (open, as its owner set it) and the catalog's row are as they were", same(await keptAll(), wasAll) && wasAll.knob === 1 && wasAll.smiths.length >= 1 && wasAll.fire.topped.length === 1);
  look = await ask(U.m1, "town_smith");
  t.check("…and a member is answered as before", !!look?.smith?.board?.tops?.[kind] && look.smith.fire.topped === true, look?.smith);
}
