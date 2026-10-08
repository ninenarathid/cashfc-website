// The smith through the functions a member calls, against the stand-in database (try-v164.mjs plays this): each deed
// done, refused for each reason, what is kept, what is written down; the table's odds held over many tries; two
// members and the bellows; a draw that waits; the firsts on the board; and who may not.
//   TRIES=<n>: how many tries a level through the member's own function (150); DRAWS=<n>: how many draws a level by
//   the database's own chance in one statement (20000).
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, patch }) {
  const F = CODE.forge, K = F.smith, TOP = F.forge.top, FLOOR = F.forge.floor, MIN = 60_000;
  const TRIES = Number(process.env.TRIES ?? 150), DRAWS = Number(process.env.DRAWS ?? 20000);
  const bag = (...stacks) => Array.from({ length: Math.max(10, stacks.length) }, (_, i) => stacks[i] ?? null);
  const held = (p, item) => (p?.bag ?? []).reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
  const coinsOf = async (who) => Number((await one(`select coins from public.town_purses where member_id = $1`, [who]))?.coins ?? 0);
  const smithyOf = async (who) => (await one(`select doc from public.town_smiths where member_id = $1`, [who]))?.doc ?? null;
  const rows = async () => Number((await one(`select count(*)::int as n from public.town_smiths`)).n);
  const board = async () => (await one(`select doc from public.town_things where key = 'smith'`))?.doc;
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const helpers = async (who) => Number((await one(`select coalesce((town.work_told($1, town.now_ms())->'helpers'->>'points')::numeric, 0) as p`, [who])).p);
  /** A member's queue and the bellows worked for it, as if so long ago: the clock is the database's, so time is moved by moving what is kept. */
  const ago = async (who, ms) => t.sql(`update public.town_smiths s set doc = s.doc
      || jsonb_build_object('queue', coalesce((select jsonb_agg(q.v || jsonb_build_object('from', (q.v->>'from')::bigint - $2::bigint, 'till', (q.v->>'till')::bigint - $2::bigint) order by q.ord) from jsonb_array_elements(s.doc->'queue') with ordinality q(v, ord)), '[]'::jsonb))
      || jsonb_build_object('helps', coalesce((select jsonb_agg(h.v || jsonb_build_object('at', (h.v->>'at')::bigint - $2::bigint) order by h.ord) from jsonb_array_elements(s.doc->'helps') with ordinality h(v, ord)), '[]'::jsonb))
    where s.member_id = $1`, [who, ms]);
  const tryOf = (to) => F.tries.find((x) => x.to === to);
  const costOf = (kind, to) => { const x = tryOf(to); return F.wooden.includes(kind) ? { fee: x.fee, ore: x.ore, n: Math.ceil(x.n / 2), timber: x.timber * 2 } : { fee: x.fee, ore: x.ore, n: x.n, timber: x.timber }; };
  /** How a try for a level goes by a number of chance, as the catalog's table says (the code's outcomeOf, read off the row). */
  const outcome = (to, r) => { const o = tryOf(to), x = Math.max(0, Math.min(0.999999, r)) * 100; return x < o.take ? "taken" : x < o.take + o.stay ? "stays" : "down"; };
  const pool = (kind, n) => F.options.order.filter((id) => F.options.of[id].pool === n && F.options.of[id].tools.includes(kind) && F.built[kind].opts.includes(id));
  // (a purse of each member's own, whole, before anything of it is written over)
  for (const who of [U.m1, U.m2, U.guest, U.admin]) await call(who, "town_hold", null);
  const FNS = [["town_smith"], ["town_smith_smelt", "oreCopper", 1], ["town_smith_take"], ["town_smith_widen"], ["town_smith_near", `{${U.m1}}`], ["town_smith_bellows", U.m1],
    ["town_smith_try", 0], ["town_smith_draw", 0], ["town_smith_choose", 0, "pkPeek"], ["town_smith_redraw", 0, 0, "gemRuby"], ["town_smith_gem", 0, "gemRuby"]];

  // (what is the village's and other people's, to see at the end that nothing paid to the smith went anywhere)
  const aroundNow = async () => one(`select (select coalesce(sum(p.coins), 0)::int from public.town_purses p where p.member_id not in ($1, $2)) as others,
    (select coalesce(sum(j.coins), 0)::int from public.town_jar j) as jar, (select coalesce(sum(o.coins), 0)::int from public.town_jar_owed o) as owed, (select coalesce(sum(n.due), 0)::bigint from public.town_notice_books n) as dues,
    (select jsonb_object_agg(th.key, th.doc) from public.town_things th where th.key not in ('smith', 'seen')) as things`, [U.m1, U.m2]);
  const around0 = await aroundNow();

  t.section("who may: somebody signed out, unproved, or with no character is refused by every one of them");
  await patch(U.m1, { coins: 5000, bag: bag({ item: "pick", n: 1 }, { item: "shardCopper", n: 50 }, { item: "timber", n: 30 }, { item: "gemRuby", n: 1 }, { item: "oreCopper", n: 2 }) });
  const m1Before = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), deeds: await written() };
  for (const who of ["anon", U.unver, U.nochar]) {
    const got = [];
    for (const [fn, ...args] of FNS) got.push(await call(who, fn, ...args));
    t.check(`${who === "anon" ? "signed out" : who === U.unver ? "an unproved character" : "no character"}: all eleven refused (42501)`, got.every((r) => r?.code === "42501"), got.map((r) => r?.code ?? r));
  }
  t.check("…and nothing of anybody's moved, nothing written down, no row made", same(await purseOf(U.m1), m1Before.purse) && (await coinsOf(U.m1)) === m1Before.coins && (await written()) === m1Before.deeds && (await rows()) === 0);
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const shut = await call(U.m1, "town_smith"), shutTry = await call(U.m1, "town_smith_try", 0), adminIn = await call(U.admin, "town_smith");
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
  t.check("while the game is shut a member is refused and an admin is not", shut?.code === "42501" && shutTry?.code === "42501" && !!adminIn?.smith, { shut, shutTry });

  t.section("the smith told: with the purse (which is how a page learns there is one), and when he is looked at");
  let me = await call(U.m1, "town_me");
  t.check("town_me brings what I have at the smith: a new smithy for whoever has nothing there; not the board", !!me?.purse && typeof me.now === "number"
    && same(me.smith, { smithy: { queue: [], more: 0, ember: 0, helps: [], pending: null } }), me?.smith);
  let look = await call(U.m1, "town_smith");
  t.check("town_smith brings the purse, the clock, the smithy and the board", !!look?.purse && typeof look.now === "number" && same(look.smith, { smithy: me.smith.smithy, board: { tops: {}, found: {} } }), look?.smith);
  t.check("reading makes no row", (await rows()) === 0);

  t.section("smelting: paid for at once, one after another by the database's clock");
  const copper = F.smelts.of.oreCopper, FR = F.smelting.fragments;
  let did = await call(U.m1, "town_smith_smelt", "oreCopper", 2), p = await purseOf(U.m1), s = await smithyOf(U.m1);
  t.check("two pieces put in: the fragments, a timber each and the fee are gone from the purse", did?.ok === true && did.timber === 2 * F.smelting.timber && did.fee === 2 * copper.fee
    && held(p, "shardCopper") === 50 - 2 * FR && held(p, "timber") === 30 - 2 && (await coinsOf(U.m1)) === 5000 - 2 * copper.fee && did.purse.coins === 5000 - 2 * copper.fee, { ...did, purse: undefined });
  t.check("…and they are in the queue, the second beginning as the first ends, by this clock", s.queue.length === 2 && s.queue[0].piece === "oreCopper" && Math.abs(s.queue[0].from - did.now) < 2000
    && s.queue[0].till === s.queue[0].from + copper.mins * MIN && s.queue[1].from === s.queue[0].till && s.queue[1].till === s.queue[1].from + copper.mins * MIN && same(did.smith.smithy, { ...s, helps: [], pending: null }), s);
  let w = await deeds("smelt");
  t.check("written down: who, which piece, how many, what it cost, the timber, and when the last is done", w.length === 1 && w[0].member_id === U.m1 && w[0].thing === "oreCopper" && w[0].n === 2 && w[0].coins === -2 * copper.fee
    && w[0].doc.timber === 2 && w[0].doc.till === s.queue[1].till, w);
  const before = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), smithy: await smithyOf(U.m1), deeds: await written() };
  const noPiece = await call(U.m1, "town_smith_smelt", "pick", 1), noWord = await call(U.m1, "town_smith_smelt", "ore; drop", 1), nought = await call(U.m1, "town_smith_smelt", "oreCopper", 0), minus = await call(U.m1, "town_smith_smelt", "oreCopper", -1);
  const places = await call(U.m1, "town_smith_smelt", "oreCopper", 2), noOre = await call(U.m1, "town_smith_smelt", "oreIron", 1), nothing = await call(U.m1, "town_smith_take");
  t.check("refused, with nothing changed and nothing written: what is not smelted, no number, more than the places free, fragments not had; and nothing is done to take yet",
    noPiece?.why === "none" && noWord?.why === "none" && nought?.why === "amount" && minus?.why === "amount" && places?.why === "places" && noOre?.why === "ore" && nothing?.why === "none"
    && same(await purseOf(U.m1), before.purse) && (await coinsOf(U.m1)) === before.coins && same(await smithyOf(U.m1), before.smithy) && (await written()) === before.deeds, [noPiece, noWord, nought, minus, places, noOre, nothing].map((d) => d?.why ?? d));
  await patch(U.m1, { bag: bag({ item: "pick", n: 1 }, { item: "shardCopper", n: 30 }) });
  const noTimber = await call(U.m1, "town_smith_smelt", "oreCopper", 1);
  await patch(U.m1, { coins: copper.fee - 1, bag: bag({ item: "pick", n: 1 }, { item: "shardCopper", n: 30 }, { item: "timber", n: 30 }) });
  const noCoins = await call(U.m1, "town_smith_smelt", "oreCopper", 1);
  t.check("…and with no timber, or too few coins", noTimber?.why === "timber" && noCoins?.why === "coins" && same(await smithyOf(U.m1), before.smithy), { noTimber, noCoins });

  t.section("what is done waits, and is taken when there is room");
  await ago(U.m1, copper.mins * MIN + 1000);
  await patch(U.m1, { coins: 5000, bag: bag(...Array.from({ length: 10 }, () => ({ item: "boot", n: 1 }))) });
  look = await call(U.m1, "town_smith");
  const full = await call(U.m1, "town_smith_take");
  t.check("one is done, one smelts; a bag with no room takes nothing, and the piece goes on waiting", look.smith.smithy.queue[0].till <= look.now && look.smith.smithy.queue[1].till > look.now && full?.why === "full" && (await smithyOf(U.m1)).queue.length === 2, full);
  await patch(U.m1, { bag: bag({ item: "pick", n: 1 }, { item: "shardCopper", n: 50 }, { item: "timber", n: 60 }) });
  did = await call(U.m1, "town_smith_take");
  t.check("with room it is in the bag, and only what was done has left the queue", did?.ok === true && same(did.got, [["oreCopper", 1]]) && held(await purseOf(U.m1), "oreCopper") === 1 && (await smithyOf(U.m1)).queue.length === 1 && did.smith.smithy.queue.length === 1, { ...did, purse: undefined });
  w = await deeds("smelted");
  t.check("written down: what was taken, and how many", w.length === 1 && w[0].member_id === U.m1 && w[0].thing === "oreCopper" && w[0].n === 1 && w[0].coins === 0, w);
  // (a month away: nothing is lost)
  did = await call(U.m1, "town_smith_smelt", "oreCopper", 2);
  await ago(U.m1, 30 * 24 * 60 * MIN);
  const month = await call(U.m1, "town_smith_take");
  t.check("a month away, everything is done and still there", did?.ok === true && month?.ok === true && same(month.got, [["oreCopper", 3]]) && (await smithyOf(U.m1)).queue.length === 0 && held(await purseOf(U.m1), "oreCopper") === 4, { ...month, purse: undefined });

  t.section("the queue widened: twice, for fine timber and coins");
  await patch(U.m1, { coins: K.more[0].coins - 1, bag: bag({ item: "timber", n: 99 }) });
  const poor = await call(U.m1, "town_smith_widen");
  await patch(U.m1, { coins: 5000, bag: bag({ item: "timber", n: K.more[0].timber - 1 }) });
  const bare = await call(U.m1, "town_smith_widen");
  await patch(U.m1, { coins: 5000, bag: bag({ item: "timber", n: 99 }, { item: "shardCopper", n: 99 }) });
  const once = await call(U.m1, "town_smith_widen"), afterOnce = await coinsOf(U.m1), twice = await call(U.m1, "town_smith_widen"), thrice = await call(U.m1, "town_smith_widen");
  p = await purseOf(U.m1);
  t.check("refused for want of coins and of timber; then three places more each time, paid for; and no third time", poor?.why === "coins" && bare?.why === "timber" && once?.ok === true && afterOnce === 5000 - K.more[0].coins
    && twice?.ok === true && (await coinsOf(U.m1)) === 5000 - K.more[0].coins - K.more[1].coins && held(p, "timber") === 99 - K.more[0].timber - K.more[1].timber && thrice?.why === "top" && (await smithyOf(U.m1)).more === 2, { poor, bare, thrice });
  w = await deeds("smith_wider");
  t.check("written down, with what each took and how many places there are then", w.length === 2 && same(w.map((d) => [d.coins, d.doc.timber, d.doc.places]), [[-K.more[0].coins, K.more[0].timber, K.places + K.wider], [-K.more[1].coins, K.more[1].timber, K.places + 2 * K.wider]]), w);
  did = await call(U.m1, "town_smith_smelt", "oreCopper", K.places + 2 * K.wider);
  const over = await call(U.m1, "town_smith_smelt", "oreCopper", 1);
  t.check("as many pieces as there are places now, and not one more", did?.ok === true && (await smithyOf(U.m1)).queue.length === K.places + 2 * K.wider && over?.why === "places", { did: { ...did, purse: undefined, smith: undefined }, over });

  t.section("a friend at the bellows: so much off the piece smelting, so many times an hour, never one's own");
  const near0 = await call(U.m2, "town_smith_near", `{${U.m1},${U.m2},${U.guest},${U.m1}}`);
  s = await smithyOf(U.m1);
  t.check("who stands by with a fire burning: the one who smelts, once, with the piece and how many times more I may blow", same(near0?.near, [{ id: U.m1, piece: s.queue[0], left: K.bellows.each }]) && typeof near0.now === "number" && near0.purse === undefined, near0);
  const mine = await call(U.m1, "town_smith_near", `{${U.m1}}`);
  t.check("never one's own fire among them", same(mine?.near, []), mine);
  const pts = await helpers(U.m2), m2Coins = await coinsOf(U.m2);
  did = await call(U.m2, "town_smith_bellows", U.m1);
  let after = await smithyOf(U.m1);
  t.check("blown on: the piece smelting ends so much sooner, and everything behind it begins and ends as much sooner", did?.ok === true && did.off === K.bellows.off && after.queue[0].till === s.queue[0].till - K.bellows.off && after.queue[0].from === s.queue[0].from
    && after.queue.slice(1).every((q, i) => q.from === s.queue[i + 1].from - K.bellows.off && q.till === s.queue[i + 1].till - K.bellows.off) && same(after.helps.map((h) => h.by), [U.m2]), { did: { ...did, purse: undefined }, after: after.queue.slice(0, 2), was: s.queue.slice(0, 2) });
  t.check("…the answer is the blower's own: their purse, their smithy (not the fire's owner's), nothing paid", same(did.smith.smithy, { queue: [], more: 0, ember: 0, helps: [], pending: null }) && did.purse.coins === m2Coins && (await coinsOf(U.m2)) === m2Coins && (await smithyOf(U.m2)) === null, did.smith);
  w = await deeds("bellows");
  t.check("written down for the blower: whose fire it was, the piece, how much sooner, how many times left", w.length === 1 && w[0].member_id === U.m2 && w[0].thing === "oreCopper" && w[0].doc.whose === U.m1 && w[0].doc.off === K.bellows.off && w[0].doc.left === K.bellows.each - 1, w);
  t.check("…and it counts for the helpers' line: so many points", (await helpers(U.m2)) === pts + CODE.work.helpers.bellows && CODE.work.helpers.bellows === K.bellows.points, { before: pts, after: await helpers(U.m2) });
  me = await call(U.m1, "town_me");
  t.check("the owner's own look shows the sooner queue", same(me.smith.smithy.queue, after.queue), me.smith.smithy.queue.slice(0, 2));
  const again = [];
  for (let i = 1; i < K.bellows.each; i++) again.push(await call(U.m2, "town_smith_bellows", U.m1));
  const tired = await call(U.m2, "town_smith_bellows", U.m1), nearTired = await call(U.m2, "town_smith_near", `{${U.m1}}`), ptsTired = await helpers(U.m2);
  t.check("so many times an hour for one friend's fire, then no more (and nothing counted for the one refused)", again.every((d) => d?.ok === true) && tired?.why === "tired" && nearTired.near[0].left === 0
    && (await deeds("bellows")).length === K.bellows.each && ptsTired === pts + K.bellows.each * CODE.work.helpers.bellows && (await smithyOf(U.m1)).helps.length === K.bellows.each, { tired, left: nearTired.near[0]?.left });
  const other = await call(U.admin, "town_smith_bellows", U.m1);
  t.check("another friend has their own count at the same fire", other?.ok === true && (await smithyOf(U.m1)).helps.length === K.bellows.each + 1, { ...other, purse: undefined });
  const own = await call(U.m1, "town_smith_bellows", U.m1), idle = await call(U.m1, "town_smith_bellows", U.m2), nobody = await call(U.m1, "town_smith_bellows", "00000000-0000-0000-0000-0000000000ff"), noId = await call(U.m1, "town_smith_bellows", null);
  t.check("refused: one's own fire; a friend with nothing smelting; somebody who is nobody (and no row is made for them)", own?.why === "self" && idle?.why === "idle" && nobody?.why === "idle" && noId?.why === "idle" && (await rows()) === 1, { own, idle, nobody, noId });
  await ago(U.m1, K.bellows.per + 1000);
  // (an hour on, the pieces put in have long been done: one more is put in to have a fire)
  await call(U.m1, "town_smith_take");
  await patch(U.m1, { coins: 5000, bag: bag({ item: "timber", n: 60 }, { item: "shardCopper", n: 99 }, { item: "shardIron", n: 99 }) });
  await call(U.m1, "town_smith_smelt", "oreIron", 2);
  const fresh = await call(U.m2, "town_smith_bellows", U.m1);
  t.check("an hour on, the same friend may blow again; and those who blew before are forgotten", fresh?.ok === true && same((await smithyOf(U.m1)).helps.map((h) => h.by), [U.m2]), { ...fresh, purse: undefined });
  // (a piece with less than the bellows' worth left: only what is left comes off, and it is done)
  s = await smithyOf(U.m1);
  await ago(U.m1, s.queue[0].till - (await call(U.m1, "town_smith")).now - 5000);
  s = await smithyOf(U.m1);
  did = await call(U.admin, "town_smith_bellows", U.m1);
  after = await smithyOf(U.m1);
  t.check("a piece nearly done loses only what it has left, and is done; the one behind it begins at once", did?.ok === true && did.off > 0 && did.off <= 5000 && after.queue[0].till === s.queue[0].till - did.off && after.queue[0].till <= did.now + 1
    && after.queue[1].from === after.queue[0].till && after.queue[1].till - after.queue[1].from === F.smelts.of.oreIron.mins * MIN, { off: did?.off, after: after.queue });

  t.section("a forging try: the materials and the fee spent, taken or not; the outcome the database's own");
  const c1 = costOf("pick", 1);
  await patch(U.m1, { coins: 1000, bag: bag({ item: "minnow", n: 3 }, { item: "pick", n: 1 }, { item: "shardCopper", n: 60 }, { item: "timber", n: 40 }, { item: "shardIron", n: 40 }, { item: "can", n: 1, water: 5 }) });
  did = await call(U.m1, "town_smith_try", 1);
  p = await purseOf(U.m1);
  t.check("a pick as it was bought, tried for +1: it takes, in its slot, and what it took is gone", did?.ok === true && did.out === "taken" && did.from === 0 && did.level === 1 && did.item === "pick" && did.owed === -1 && same(p.bag[1], { item: "pick", n: 1, plus: 1 })
    && held(p, c1.ore) === 60 - c1.n && held(p, "timber") === 40 - c1.timber && (await coinsOf(U.m1)) === 1000 - c1.fee && same(did.purse.bag, p.bag), { ...did, purse: undefined, smith: undefined });
  w = await deeds("forge");
  t.check("written down: the tool, from which level to which, how it went, the number it went by, what it took", w.length === 1 && w[0].member_id === U.m1 && w[0].thing === "pick" && w[0].coins === -c1.fee
    && same({ ...w[0].doc, r: 0 }, { slot: 1, from: 0, to: 1, out: "taken", level: 1, r: 0, ore: c1.ore, ores: c1.n, timber: c1.timber }) && w[0].doc.r >= 0 && w[0].doc.r < 1, w);
  const cCan = costOf("can", 1), coins0 = await coinsOf(U.m1);
  did = await call(U.m1, "town_smith_try", 5);
  p = await purseOf(U.m1);
  t.check("a watering can keeps its water through a try", did?.ok === true && same(p.bag[5], { item: "can", n: 1, water: 5, plus: 1 }) && (await coinsOf(U.m1)) === coins0 - cCan.fee, p.bag[5]);
  const state = { purse: await purseOf(U.m1), coins: await coinsOf(U.m1), deeds: await written() };
  const fish = await call(U.m1, "town_smith_try", 0), hole = await call(U.m1, "town_smith_try", 7), under = await call(U.m1, "town_smith_try", -1), beyond = await call(U.m1, "town_smith_try", 99), none = await call(U.m1, "town_smith_try", null);
  t.check("refused, and nothing spent: a fish, an empty slot, no slot at all", [fish, hole, under, beyond, none].every((d) => d?.why === "tool") && same(await purseOf(U.m1), state.purse) && (await coinsOf(U.m1)) === state.coins && (await written()) === state.deeds, [fish, hole, under, beyond, none]);
  const c2 = costOf("pick", 2);
  await patch(U.m1, { bag: bag(null, { item: "pick", n: 1, plus: 1 }, { item: "shardCopper", n: c2.n - 1 }, { item: "timber", n: 40 }) });
  const wantOre = await call(U.m1, "town_smith_try", 1);
  await patch(U.m1, { bag: bag(null, { item: "pick", n: 1, plus: 1 }, { item: "shardCopper", n: 60 }, { item: "timber", n: c2.timber - 1 }) });
  const wantTimber = await call(U.m1, "town_smith_try", 1);
  await patch(U.m1, { coins: c2.fee - 1, bag: bag(null, { item: "pick", n: 1, plus: 1 }, { item: "shardCopper", n: 60 }, { item: "timber", n: 40 }) });
  const wantCoins = await call(U.m1, "town_smith_try", 1);
  await patch(U.m1, { coins: 99999, bag: bag(null, { item: "pick", n: 1, plus: TOP, opts: [pool("pick", 1)[0], pool("pick", 1)[1], pool("pick", 2)[0]] }, { item: "oreSilver", n: 20 }, { item: "timber", n: 40 }) });
  const atTop = await call(U.m1, "town_smith_try", 1);
  t.check("refused for want of ore, of timber, of coins, and at the top: nothing spent, nothing written", wantOre?.why === "ore" && wantTimber?.why === "timber" && wantCoins?.why === "coins" && atTop?.why === "top" && (await written()) === state.deeds
    && (await coinsOf(U.m1)) === 99999 && held(await purseOf(U.m1), "oreSilver") === 20, { wantOre, wantTimber, wantCoins, atTop });
  // (a wooden tool's recipe: half the ore, rounded up, and twice the timber)
  const a1 = costOf("axe", 1);
  await patch(U.m1, { coins: 1000, bag: bag({ item: "axe", n: 1 }, { item: "shardCopper", n: 60 }, { item: "timber", n: 40 }) });
  did = await call(U.m1, "town_smith_try", 0);
  p = await purseOf(U.m1);
  t.check("an axe takes the wooden recipe", did?.ok === true && a1.n === Math.ceil(c1.n / 2) && a1.timber === 2 * c1.timber && held(p, "shardCopper") === 60 - a1.n && held(p, "timber") === 40 - a1.timber, { a1, bag: p.bag.slice(0, 3) });

  t.section(`the table's odds: ${DRAWS} draws a level by the database's own chance, and ${TRIES} tries a level through the member's function`);
  for (let to = 1; to <= TOP; to++) {
    const o = tryOf(to), got = await one(`select count(*) filter (where x.out = 'taken')::float8 / count(*) * 100 as taken, count(*) filter (where x.out = 'stays')::float8 / count(*) * 100 as stays, count(*) filter (where x.out = 'down')::float8 / count(*) * 100 as down
      from (select town.outcome_of($1::integer, random()) as out from generate_series(1, $2::integer)) x`, [to, DRAWS]);
    // (five times what chance alone moves a share by, and never less than a quarter of a hundredth)
    const tol = (share) => Math.max(0.25, 5 * Math.sqrt((share * (100 - share)) / DRAWS));
    t.check(`a try for +${to}: taken ${o.take}, stays ${o.stay}, down ${o.down} in a hundred (got ${got.taken.toFixed(1)} / ${got.stays.toFixed(1)} / ${got.down.toFixed(1)})`,
      Math.abs(got.taken - o.take) <= tol(o.take) && Math.abs(got.stays - o.stay) <= tol(o.stay) && Math.abs(got.down - o.down) <= tol(o.down) && (o.take < 100 || got.taken === 100) && (o.down > 0 || got.down === 0), got);
  }
  const P1 = pool("pick", 1), P2 = pool("pick", 2), deedsBefore = (await deeds("forge")).length;
  let tries = 0, lowest = TOP, wrong = [], unpaid = [], moved = [];
  const seen = {};
  for (let to = FLOOR + 1; to <= TOP; to++) {
    const from = to - 1, cost = costOf("pick", to), stack = { item: "pick", n: 1, plus: from, opts: [P1[0], ...(from >= F.forge.milestones[1] ? [P1[1]] : [])] };
    seen[to] = { taken: 0, stays: 0, down: 0 };
    for (let i = 0; i < TRIES; i++) {
      await patch(U.m2, { coins: cost.fee, bag: bag({ item: cost.ore, n: cost.n }, { item: "timber", n: cost.timber }, stack) });
      const d = await call(U.m2, "town_smith_try", 2);
      tries++;
      if (!d?.ok) { wrong.push(d); continue; }
      seen[to][d.out]++;
      lowest = Math.min(lowest, d.level);
      const want = d.out === "taken" ? to : d.out === "down" ? Math.max(Math.min(from, FLOOR), from - 1) : from;
      if (d.level !== want || d.from !== from || d.purse.bag[2].plus !== want || !same(d.purse.bag[2].opts, stack.opts)) moved.push({ to, d: { ...d, purse: undefined, smith: undefined } });
      // (taken or not, everything it takes is spent: the purse had exactly that)
      if (d.purse.coins !== 0 || d.purse.bag[0] !== null || d.purse.bag[1] !== null) unpaid.push({ to, out: d.out, coins: d.purse.coins, bag: d.purse.bag.slice(0, 2) });
    }
  }
  const logged = (await deeds("forge")).slice(deedsBefore);
  t.check(`${tries} tries from +${FLOOR} to +${TOP - 1}: each went as its level's line says`, wrong.length === 0 && moved.length === 0, { wrong: wrong.slice(0, 2), moved: moved.slice(0, 2) });
  t.check("…each spent its ore, its timber and its fee, taken or not", unpaid.length === 0, unpaid.slice(0, 3));
  t.check(`…and no tool ever went under +${FLOOR}`, lowest >= FLOOR, lowest);
  t.check("every one of them is written down, the failed ones too, each with the number it went by; and that number is what decided it",
    logged.length === tries && logged.every((d) => d.member_id === U.m2 && d.thing === "pick" && d.coins === -costOf("pick", d.doc.to).fee && d.doc.r >= 0 && d.doc.r < 1 && outcome(d.doc.to, d.doc.r) === d.doc.out)
    && logged.some((d) => d.doc.out === "stays") && logged.some((d) => d.doc.out === "down") && logged.some((d) => d.doc.out === "taken"), logged.filter((d) => outcome(d.doc.to, d.doc.r) !== d.doc.out).slice(0, 2));
  const rs = logged.map((d) => d.doc.r), mean = rs.reduce((a, b) => a + b, 0) / Math.max(1, rs.length);
  t.check("the numbers of chance are the database's own: all different, spread over nothing to one", new Set(rs).size === rs.length && Math.abs(mean - 0.5) < 5 * Math.sqrt(1 / 12 / Math.max(1, rs.length)) && Math.min(...rs) < 0.1 && Math.max(...rs) > 0.9, { n: rs.length, mean });
  for (let to = FLOOR + 1; to <= TOP; to++) {
    const o = tryOf(to), g = seen[to], pct = (n) => (100 * n) / TRIES, tol = (share) => Math.max(1, 5 * Math.sqrt((share * (100 - share)) / TRIES));
    t.check(`through the member's function, for +${to}: ${g.taken} taken, ${g.stays} stay, ${g.down} down of ${TRIES} (the table: ${o.take} / ${o.stay} / ${o.down})`,
      Math.abs(pct(g.taken) - o.take) <= tol(o.take) && Math.abs(pct(g.stays) - o.stay) <= tol(o.stay) && Math.abs(pct(g.down) - o.down) <= tol(o.down) && (o.down > 0 || g.down === 0), g);
  }
  // (up to the floor a try always takes)
  let sure = 0;
  for (let to = 1; to <= FLOOR; to++) for (let i = 0; i < 12; i++) {
    const cost = costOf("pick", to);
    await patch(U.m2, { coins: cost.fee, bag: bag({ item: cost.ore, n: cost.n }, { item: "timber", n: cost.timber }, { item: "pick", n: 1, ...(to > 1 ? { plus: to - 1 } : {}), ...(to - 1 >= F.forge.milestones[0] ? { opts: [P1[0]] } : {}) }) });
    const d = await call(U.m2, "town_smith_try", 2);
    if (d?.ok && d.out === "taken" && d.level === to) sure++;
  }
  t.check(`up to +${FLOOR} a try always takes (${sure} of ${FLOOR * 12})`, sure === FLOOR * 12);
  const sent = await t.as(U.m1, `select public.town_smith_try(0, 0.0::double precision) as r`), named = await t.as(U.m1, `select public.town_smith_try(p_slot => 0, p_r => 0.0) as r`);
  t.check("no number of chance can be sent: the function takes a slot and nothing else", !!sent.error && !!named.error, { sent, named });

  t.section("the options: a draw that waits is the same draw, and one is chosen");
  await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m1]);
  const c3 = costOf("pick", 3);
  await patch(U.m1, { coins: 5000, bag: bag({ item: "pick", n: 1, plus: 2 }, { item: "shardCopper", n: 60 }, { item: "timber", n: 40 }, { item: "shardIron", n: 60 }, { item: "axe", n: 1, plus: 3 }, { item: "pick", n: 1, plus: 3 }, { item: "minnow", n: 1 }) });
  const early = await call(U.m1, "town_smith_draw", 0);
  did = await call(U.m1, "town_smith_try", 0);
  const blocked = await call(U.m1, "town_smith_try", 0);
  t.check(`nothing to draw under +${F.forge.milestones[0]}; reaching it, the tool is owed a draw and is not forged further until one is chosen`, early?.why === "none" && did?.ok === true && did.level === 3 && did.owed === 0 && blocked?.why === "owed"
    && held(await purseOf(U.m1), c3.ore) === 60 - c3.n, { early, did: { ...did, purse: undefined, smith: undefined }, blocked });
  const d1 = await call(U.m1, "town_smith_draw", 0);
  t.check("the draw laid out: two of the pick's first pool that are built, never the same twice; it waits in the smithy", d1?.ok === true && d1.fresh === true && d1.slot === 0 && d1.pending.item === "pick" && d1.pending.at === 0 && d1.pending.offer.length === K.offer
    && new Set(d1.pending.offer).size === K.offer && d1.pending.offer.every((o) => P1.includes(o)) && d1.pending.old === undefined && same((await smithyOf(U.m1)).pending, d1.pending) && same(d1.smith.smithy.pending, d1.pending), d1?.pending);
  const sameAgain = [];
  for (let i = 0; i < 12; i++) sameAgain.push(await call(U.m1, "town_smith_draw", 0));
  t.check("asked again, twelve times: the same two every time, and not drawn anew", sameAgain.every((d) => d?.ok === true && d.fresh === false && same(d.pending, d1.pending)) && same((await smithyOf(U.m1)).pending, d1.pending), sameAgain.find((d) => !same(d?.pending, d1.pending)));
  const twin = await call(U.m1, "town_smith_draw", 5), otherKind = await call(U.m1, "town_smith_draw", 4), noTool = await call(U.m1, "town_smith_draw", 6), redrawNow = await call(U.m1, "town_smith_redraw", 0, 0, "gemRuby");
  t.check("…nor by asking for another tool: a second pick at the same milestone is shown the same two, an axe is told a draw waits, and so is whatever is no tool", twin?.ok === true && twin.fresh === false && same(twin.pending, d1.pending)
    && otherKind?.why === "owed" && noTool?.why === "owed" && redrawNow?.why === "owed" && same((await smithyOf(U.m1)).pending, d1.pending), { twin: twin?.pending, otherKind, noTool, redrawNow });
  w = await deeds("forge_draw");
  t.check("written down once: the tool, the milestone, what was laid out", w.length === 1 && w[0].member_id === U.m1 && w[0].thing === "pick" && w[0].doc.at === 0 && same(w[0].doc.offer, d1.pending.offer) && w[0].doc.slot === 0, w);
  const notOffered = P1.find((o) => !d1.pending.offer.includes(o));
  const wrongPick = await call(U.m1, "town_smith_choose", 0, notOffered), wrongSlot = await call(U.m1, "town_smith_choose", 4, d1.pending.offer[0]), noSlot = await call(U.m1, "town_smith_choose", -1, d1.pending.offer[0]), odd = await call(U.m1, "town_smith_choose", 0, "x'; --");
  t.check("refused: an option that was not laid out, a tool the draw is not for, no slot, what is no option's name; the draw goes on waiting", wrongPick?.why === "none" && wrongSlot?.why === "tool" && noSlot?.why === "tool" && odd?.why === "none"
    && same((await smithyOf(U.m1)).pending, d1.pending) && (await purseOf(U.m1)).bag[0].opts === undefined, { wrongPick, wrongSlot, noSlot, odd });
  did = await call(U.m1, "town_smith_choose", 0, d1.pending.offer[1]);
  p = await purseOf(U.m1);
  t.check("chosen: it is the tool's, and no draw waits", did?.ok === true && did.opt === d1.pending.offer[1] && did.kept === false && did.at === 0 && did.item === "pick" && same(p.bag[0], { item: "pick", n: 1, plus: 3, opts: [d1.pending.offer[1]] })
    && (await smithyOf(U.m1)).pending === null && did.smith.smithy.pending === null, { ...did, purse: undefined, smith: undefined });
  w = await deeds("forge_choose");
  t.check("written down: the tool, the milestone, the option, and that it was not the old one kept", w.length === 1 && w[0].thing === "pick" && same(w[0].doc, { slot: 0, at: 0, opt: d1.pending.offer[1], kept: false }), w);
  let b = await board();
  t.check("the first to find an option is on the board, by name", same(Object.keys(b.found), [d1.pending.offer[1]]) && b.found[d1.pending.offer[1]].by === U.m1 && b.found[d1.pending.offer[1]].name === "Member One"
    && Math.abs(b.found[d1.pending.offer[1]].at - did.now) < 2000 && same(did.smith.board, b), b);
  const chooseAgain = await call(U.m1, "town_smith_choose", 0, d1.pending.offer[0]);
  const d2 = await call(U.m1, "town_smith_draw", 5), dAxe = await call(U.m1, "town_smith_draw", 4);
  t.check("nothing more to choose for it; the second pick is now owed a draw of its own, and the axe waits for that one", chooseAgain?.why === "none" && d2?.ok === true && d2.fresh === true && d2.pending.item === "pick" && dAxe?.why === "owed", { chooseAgain, d2: d2?.pending, dAxe });
  // (the same option found by another member: the board keeps its first finder)
  await patch(U.m2, { coins: 0, bag: bag({ item: "pick", n: 1, plus: 3 }) });
  let theirs = null;
  for (let i = 0; i < 400 && !theirs; i++) {
    await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m2]);
    const d = await call(U.m2, "town_smith_draw", 0);
    if (d?.ok && d.pending.offer.includes(d1.pending.offer[1])) theirs = d;
  }
  did = theirs ? await call(U.m2, "town_smith_choose", 0, d1.pending.offer[1]) : null;
  b = await board();
  t.check("found again by somebody else: the board keeps the first", did?.ok === true && b.found[d1.pending.offer[1]].by === U.m1 && Object.keys(b.found).length === 1, { did: did && { ...did, purse: undefined, smith: undefined }, found: b.found });
  // (+6 never offers the option had at +3; the top draws from the second pool)
  let never = true, second = true;
  for (let i = 0; i < 60; i++) {
    await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m2]);
    await patch(U.m2, { bag: bag({ item: "pick", n: 1, plus: 6, opts: [P1[i % P1.length]] }, { item: "axe", n: 1, plus: TOP, opts: [pool("axe", 1)[0], pool("axe", 1)[1]] }) });
    const six = await call(U.m2, "town_smith_draw", 0);
    if (!six?.ok || six.pending.at !== 1 || six.pending.offer.includes(P1[i % P1.length]) || !six.pending.offer.every((o) => P1.includes(o))) never = false;
    await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m2]);
    const top = await call(U.m2, "town_smith_draw", 1);
    if (!top?.ok || top.pending.at !== 2 || !top.pending.offer.every((o) => pool("axe", 2).includes(o)) || top.pending.offer.length !== K.offer) second = false;
  }
  t.check("sixty draws each: the second milestone never lays out the option had at the first, and the top draws from the second pool", never && second, { never, second });
  // (every option of a pool comes up, and none that is not built: the draw is by chance over all of them)
  const came = new Set();
  for (let i = 0; i < 200 && came.size < P1.length; i++) {
    await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m2]);
    await patch(U.m2, { bag: bag({ item: "pick", n: 1, plus: 3 }) });
    for (const o of (await call(U.m2, "town_smith_draw", 0))?.pending?.offer ?? []) came.add(o);
  }
  t.check(`over many draws every one of the pick's ${P1.length} first options is laid out some time`, came.size === P1.length && [...came].every((o) => P1.includes(o)), [...came]);
  await patch(U.m2, { bag: bag({ item: "rod", n: 1, plus: 3 }) });
  await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m2]);
  const unbuiltDraw = await call(U.m2, "town_smith_draw", 0), rodTry = await call(U.m2, "town_smith_try", 0);
  t.check("a tool nothing is built for yet is owed no draw (and is forged on, if it has what that takes)", unbuiltDraw?.why === "none" && F.built.rod.opts.length === 0 && rodTry?.why !== "owed", { unbuiltDraw, rodTry });

  t.section("an option drawn again: a gem of any element and a fee; the old one may be kept");
  await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m1]);
  const mineNow = [P1[0], P1[1]];
  await patch(U.m1, { coins: K.redraw.fee + 30, bag: bag({ item: "pick", n: 1, plus: 6, opts: mineNow }, { item: "gemOnyx", n: 2 }, { item: "minnow", n: 1 }, { item: "pick", n: 1, plus: 2, opts: [P1[2]] }) });
  const notGem = await call(U.m1, "town_smith_redraw", 0, 0, "minnow"), noGem = await call(U.m1, "town_smith_redraw", 0, 0, "gemRuby"), noOpt = await call(U.m1, "town_smith_redraw", 0, 2, "gemOnyx"), badAt = await call(U.m1, "town_smith_redraw", 0, -1, "gemOnyx");
  const asleep = await call(U.m1, "town_smith_redraw", 3, 0, "gemOnyx"), notATool = await call(U.m1, "town_smith_redraw", 2, 0, "gemOnyx");
  t.check("refused, and nothing paid: what is no gem, a gem not had, a milestone with no option, an option that sleeps, what is no tool", notGem?.why === "gem" && noGem?.why === "gem" && noOpt?.why === "none" && badAt?.why === "none" && asleep?.why === "asleep"
    && notATool?.why === "tool" && (await coinsOf(U.m1)) === K.redraw.fee + 30 && held(await purseOf(U.m1), "gemOnyx") === 2 && (await smithyOf(U.m1)) === null, { notGem, noGem, noOpt, badAt, asleep, notATool });
  const r1 = await call(U.m1, "town_smith_redraw", 0, 0, "gemOnyx");
  p = await purseOf(U.m1);
  t.check("made again: the gem and the fee are gone, two others are laid out, and the old one is named with them", r1?.ok === true && r1.pending.old === mineNow[0] && r1.pending.at === 0 && r1.pending.offer.length === K.offer
    && r1.pending.offer.every((o) => P1.includes(o) && !mineNow.includes(o)) && (await coinsOf(U.m1)) === 30 && held(p, "gemOnyx") === 1 && same(p.bag[0].opts, mineNow) && same((await smithyOf(U.m1)).pending, r1.pending), r1?.pending);
  w = await deeds("forge_redraw");
  t.check("written down: the tool, the milestone, the old option, what was laid out, the gem and the fee", w.length === 1 && w[0].thing === "pick" && w[0].coins === -K.redraw.fee && same(w[0].doc, { slot: 0, at: 0, old: mineNow[0], offer: r1.pending.offer, gem: "gemOnyx" }), w);
  const tryMeanwhile = await call(U.m1, "town_smith_redraw", 0, 1, "gemOnyx"), sameDraw = await call(U.m1, "town_smith_draw", 0);
  t.check("while it waits no other is made, and asked for again it is the same", tryMeanwhile?.why === "owed" && sameDraw?.ok === true && sameDraw.fresh === false && same(sameDraw.pending, r1.pending) && held(await purseOf(U.m1), "gemOnyx") === 1, { tryMeanwhile, sameDraw: sameDraw?.pending });
  did = await call(U.m1, "town_smith_choose", 0, mineNow[0]);
  t.check("the old one kept: the tool is as it was, and no draw waits", did?.ok === true && did.kept === true && did.opt === mineNow[0] && same((await purseOf(U.m1)).bag[0].opts, mineNow) && (await smithyOf(U.m1)).pending === null, { ...did, purse: undefined, smith: undefined });
  await patch(U.m1, { coins: K.redraw.fee - 1 });
  const cannotPay = await call(U.m1, "town_smith_redraw", 0, 1, "gemOnyx");
  await patch(U.m1, { coins: K.redraw.fee });
  const r2 = await call(U.m1, "town_smith_redraw", 0, 1, "gemOnyx");
  did = r2?.ok ? await call(U.m1, "town_smith_choose", 0, r2.pending.offer[0]) : null;
  p = await purseOf(U.m1);
  t.check("too few coins refuses; with the fee, another is taken in the old one's place", cannotPay?.why === "coins" && did?.ok === true && did.kept === false && same(p.bag[0].opts, [mineNow[0], r2.pending.offer[0]]) && held(p, "gemOnyx") === 0 && (await coinsOf(U.m1)) === 0, { cannotPay, did: did && { ...did, purse: undefined, smith: undefined } });
  w = await deeds("forge_choose");
  t.check("both choices written down, the kept one as kept", same(w.filter((d) => d.member_id === U.m1).slice(-2).map((d) => [d.doc.at, d.doc.opt, d.doc.kept]), [[0, mineNow[0], true], [1, r2.pending.offer[0], false]]), w.slice(-2));

  t.section("the first to the top is on the board");
  const c10 = costOf("pick", TOP);
  let top = null, tried = 0;
  for (; tried < 400 && !(top?.ok && top.out === "taken"); tried++) {
    await patch(U.m2, { coins: c10.fee, bag: bag({ item: "pick", n: 1, plus: TOP - 1, opts: [P1[0], P1[1]] }, { item: c10.ore, n: c10.n }, { item: "timber", n: c10.timber }) });
    top = await call(U.m2, "town_smith_try", 0);
  }
  b = await board();
  t.check(`a pick taken to +${TOP} (after ${tried} ${tried === 1 ? "try" : "tries"}): its member is on the board by name, and the tool is owed its last draw`, top?.ok === true && top.level === TOP && top.owed === 2 && same(Object.keys(b.tops), ["pick"])
    && b.tops.pick.by === U.m2 && b.tops.pick.name === "Member Two" && same(top.smith.board, b), { top: top && { ...top, purse: undefined, smith: undefined }, tops: b.tops });
  for (tried = 0, top = null; tried < 400 && !(top?.ok && top.out === "taken"); tried++) {
    await patch(U.m1, { coins: c10.fee, bag: bag({ item: "pick", n: 1, plus: TOP - 1, opts: [P1[0], P1[1]] }, { item: c10.ore, n: c10.n }, { item: "timber", n: c10.timber }) });
    top = await call(U.m1, "town_smith_try", 0);
  }
  const a10 = costOf("axe", TOP);
  let axeTop = null;
  for (tried = 0; tried < 400 && !(axeTop?.ok && axeTop.out === "taken"); tried++) {
    await patch(U.m1, { coins: a10.fee, bag: bag({ item: "axe", n: 1, plus: TOP - 1, opts: [pool("axe", 1)[0], pool("axe", 1)[1]] }, { item: a10.ore, n: a10.n }, { item: "timber", n: a10.timber }) });
    axeTop = await call(U.m1, "town_smith_try", 0);
  }
  b = await board();
  t.check("the second to take a pick there is not written over the first; the first axe there is its own first", top?.level === TOP && b.tops.pick.by === U.m2 && axeTop?.level === TOP && b.tops.axe.by === U.m1 && b.tops.axe.name === "Member One" && Object.keys(b.tops).length === 2, b.tops);
  const last = await call(U.m1, "town_smith_draw", 0);
  t.check("the draw at the top is of the second pool", last?.ok === true && last.pending.at === 2 && last.pending.offer.every((o) => pool("axe", 2).includes(o)), last?.pending);

  t.section("a gem set in a tool: a gem, a mount and a fee; one set over another replaces it");
  await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m1]);
  await patch(U.m1, { coins: 3 * K.gem.fee, bag: bag({ item: "pick", n: 1, plus: 6, opts: mineNow }, { item: "gemRuby", n: 2 }, { item: "gemSapphire", n: 1 }, { item: K.gem.mount, n: 3 * K.gem.mounts }, { item: "rod", n: 1 }, { item: "chipRuby", n: 5 }, { item: "minnow", n: 1 }) });
  did = await call(U.m1, "town_smith_gem", 0, "gemRuby");
  p = await purseOf(U.m1);
  t.check("set: it always takes; the gem, the mount and the fee are gone; the tool keeps its plus and its options", did?.ok === true && did.element === "fire" && did.over === null && did.item === "pick" && same(p.bag[0], { item: "pick", n: 1, plus: 6, opts: mineNow, gems: ["fire"] })
    && held(p, "gemRuby") === 1 && held(p, K.gem.mount) === 2 * K.gem.mounts && (await coinsOf(U.m1)) === 2 * K.gem.fee, { ...did, purse: undefined, smith: undefined });
  const sameGem = await call(U.m1, "town_smith_gem", 0, "gemRuby"), inRod = await call(U.m1, "town_smith_gem", 4, "gemRuby"), chip = await call(U.m1, "town_smith_gem", 0, "chipRuby"), notHad = await call(U.m1, "town_smith_gem", 0, "gemOnyx"), inFish = await call(U.m1, "town_smith_gem", 6, "gemRuby");
  t.check("refused, and nothing spent: the element it has already, a tool the element does nothing for yet, a fragment, a gem not had, what is no tool", sameGem?.why === "same" && inRod?.why === "unbuilt" && chip?.why === "gem" && notHad?.why === "gem" && inFish?.why === "tool"
    && (await coinsOf(U.m1)) === 2 * K.gem.fee && held(await purseOf(U.m1), "gemRuby") === 1, { sameGem, inRod, chip, notHad, inFish });
  did = await call(U.m1, "town_smith_gem", 0, "gemSapphire");
  p = await purseOf(U.m1);
  t.check("another set over it: the same cost, and the old one is gone", did?.ok === true && did.element === "water" && did.over === "fire" && same(p.bag[0].gems, ["water"]) && held(p, "gemSapphire") === 0 && (await coinsOf(U.m1)) === K.gem.fee && held(p, K.gem.mount) === K.gem.mounts, { ...did, purse: undefined, smith: undefined });
  w = await deeds("gem_set");
  t.check("both written down: the gem, the tool, the element, what it was set over, the fee", w.length === 2 && same(w.map((d) => [d.thing, d.coins, d.doc.item, d.doc.element, d.doc.over, d.doc.slot]), [["gemRuby", -K.gem.fee, "pick", "fire", null, 0], ["gemSapphire", -K.gem.fee, "pick", "water", "fire", 0]]), w);
  await patch(U.m1, { coins: K.gem.fee - 1 });
  const gemPoor = await call(U.m1, "town_smith_gem", 0, "gemRuby");
  await patch(U.m1, { coins: 999, bag: bag({ item: "pick", n: 1 }, { item: "gemRuby", n: 1 }) });
  const noMount = await call(U.m1, "town_smith_gem", 0, "gemRuby");
  t.check("…and for want of coins or of the mount", gemPoor?.why === "coins" && noMount?.why === "ore" && held(await purseOf(U.m1), "gemRuby") === 1, { gemPoor, noMount });

  t.section("what the smith took has left the game, and every deed has its word");
  const paid = await one(`select coalesce(sum(coins), 0)::int as coins, count(*)::int as n from public.town_deeds where what in ('smelt', 'smelted', 'smith_wider', 'bellows', 'forge', 'forge_draw', 'forge_choose', 'forge_redraw', 'gem_set')`);
  const gains = await one(`select count(*)::int as n from public.town_deeds where what in ('smelt', 'smelted', 'smith_wider', 'bellows', 'forge', 'forge_draw', 'forge_choose', 'forge_redraw', 'gem_set') and coins > 0`);
  const around1 = await aroundNow();
  t.check("no deed at the smith ever gives a coin; and what was paid went to nobody: no other purse, the jar at the well, the notice board's dues and the village's things are as they were",
    paid.coins < 0 && gains.n === 0 && same(around1, around0), { paid, around0, around1 });
  const words = (await t.sql(`select w, town.deed_th(w) as th from unnest(array['smelt', 'smelted', 'smith_wider', 'bellows', 'forge', 'forge_draw', 'forge_choose', 'forge_redraw', 'gem_set', 'buy', 'box_put', 'bell']) w`)).rows;
  t.check("each has a Thai word for the tally, and the words that were there are as they were", words.every((r) => r.th !== r.w) && words.find((r) => r.w === "buy").th === "ซื้อของจากลุง" && words.find((r) => r.w === "bell").th === "ระฆังคู่หูดังกับเพื่อน", words);
  const guestLook = await call(U.guest, "town_smith");
  t.check("a proved character who is not of the FC is in the town as everywhere, with a smithy of their own", !!guestLook?.smith && same(guestLook.smith.smithy, { queue: [], more: 0, ember: 0, helps: [], pending: null }), guestLook);

  // As the code has it (said, not checked: lib/town/forge keeps one draw at a time for a member, not one for a tool).
  await t.sql(`delete from public.town_smiths where member_id = $1`, [U.m1]);
  await patch(U.m1, { coins: 0, bag: bag({ item: "pick", n: 1, plus: 3 }, { item: "axe", n: 1, plus: 3 }) });
  const first = await call(U.m1, "town_smith_draw", 0);
  await patch(U.m1, { bag: bag(null, { item: "axe", n: 1, plus: 3 }) });       // (the pick put away somewhere: its draw fits no tool in the bag)
  const axeDraw = await call(U.m1, "town_smith_draw", 1);
  if (axeDraw?.ok) await call(U.m1, "town_smith_choose", 1, axeDraw.pending.offer[0]);
  await patch(U.m1, { bag: bag({ item: "pick", n: 1, plus: 3 }, (await purseOf(U.m1)).bag[1]) });
  const anew = await call(U.m1, "town_smith_draw", 0);
  console.log(`  NOTE (the code's rule, not a check): a draw that waits is forgotten when its tool is out of the bag and another tool is drawn for: ${JSON.stringify(first?.pending?.offer)} for the pick, then, the pick put away, a draw for the axe (fresh: ${axeDraw?.fresh}); the pick back, its draw is ${anew?.fresh ? "made anew" : "the same"}: ${JSON.stringify(anew?.pending?.offer)}`);
}
