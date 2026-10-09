// The forged tools' stories of v174's older tools' part (v174.tools.try.mjs plays them after the day with plain
// tools, on the database with the part and the test's clock in it). Each number is held to what the code says of the
// same purse (lib/town/forged, forged-keep, farm, fishing, insects, cooking, stamina), read here from the code
// itself; a number of chance the code takes from the moment is found by moving the clock to a moment that gives it.
export default async function ({ t, U, one, CODE, clock, now, purse, kept, patch, ask, lineOf, day, FORGED, STAM, COOK, FISHING, hastened, sql, str }) {
  const FARM = await import("@/lib/town/farm");
  const POWERS = await import("@/lib/town/powers");
  const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  const F = CODE.farming, K = CODE.cooking, INS = CODE.insects, FI = CODE.fishing, OPT = CODE.forge.options.of;
  const same = (a, b) => str(a) === str(b);
  const tool = (item, plus, opts = [], gems = [], more = {}) => ({ item, n: 1, ...(plus ? { plus } : {}), ...(opts.length ? { opts: [opts[0] ?? "", opts[1] ?? "", opts[2] ?? ""] } : {}), ...(gems.length ? { gems } : {}), ...more });
  const stam = (p) => STAM.staminaOf(p, now());
  const used = (p, id) => POWERS.powerUsed(p, id, now());
  const seedFor = async (want) => { for (let i = 1; i < 400; i++) { const s = i / 401; await t.sql(`select setseed(${s})`); if (want(Number((await one(`select random() as r`)).r))) return s; } throw new Error("no seed"); };
  const momentFor = async (want, from = now() + 1) => { for (let ms = from; ms < from + 5000; ms++) if (want(ms)) { await clock(ms); return ms; } throw new Error("no moment"); };
  const deedsN = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const DEEP = Object.keys(FI.places).find((k) => FI.places[k]).split(",").map(Number);
  const FISH_UNCOMMON = Object.keys(CODE.fish).find((id) => CODE.fish[id].tier === "uncommon"), FISH_COMMON = Object.keys(CODE.fish).find((id) => CODE.fish[id].tier === "common" && !CODE.fish[id].water);
  const setLine = (who, what) => t.sql(`update public.town_lines set doc = doc || jsonb_build_object('what', $2::text, 'size', 20) where member_id = $1`, [who, what]);
  await clock(Math.floor(now() / DAY) * DAY + 4 * DAY + 2 * HOUR);   // (nine in the morning in Bangkok, some days on)

  /* ── the rod ── */
  t.section("a forged rod on the deck");
  const cast = (who) => ask(who, "town_cast", "worm", DEEP[0], DEEP[1], false, null);
  const rodCall = tool("rod", 10, ["rdBait", "rdCalm", "rdCall"]);
  await purse(U.m1, [rodCall, { item: "worm", n: 60 }], 100, { hand: "rod", handAt: 0 });
  await purse(U.m2, [{ item: "rod", n: 1 }, { item: "worm", n: 60 }], 100, { hand: "rod", handAt: 0 });
  const N_CALL = OPT.rdCall.use.n, waits = [];
  for (let i = 0; i < N_CALL + 2; i++) { const r = await cast(U.m1); waits.push(r.line?.wait); await clock(now() + 6 * MIN); }
  let p = await kept(U.m1);
  t.check(`a counted option of the rod's, in the deed's own function: its ${N_CALL} of the day, and then the line waits as any`, waits.slice(0, N_CALL).every((w) => w === 1) && waits.slice(N_CALL).every((w) => w > 1) && used(p, "rdCall") === N_CALL, { waits, powers: p.powers });
  const plainCast = await cast(U.m2), p2 = await kept(U.m2);
  t.check("a member beside them with a rod as it was bought: a line as ever, and nothing counted", plainCast.line.wait > 1 && !("powers" in p2), { wait: plainCast.line?.wait, powers: p2.powers });
  // (the count is the member's, by the option: a second rod with it does not begin another)
  await patch(U.m1, { bag: [tool("rod", 10, ["rdQuick", "rdFresh", "rdCall"]), { item: "worm", n: 30 }, ...Array(12).fill(null)] });
  await clock(now() + 6 * MIN);
  t.check("a second rod with the same option shares the count: spent for the day with both", (await cast(U.m1)).line.wait > 1);
  await clock(now() + DAY);
  const again = await cast(U.m1);
  p = await kept(U.m1);
  t.check("…and back with the day: one counted of the new day", again.line.wait === 1 && used(p, "rdCall") === 1, { wait: again.line?.wait, powers: p.powers });

  // the wait a rod shortens: the same line drawn for two members by the same numbers of chance, one of them with such a rod
  await purse(U.m1, [tool("rod", 3, ["rdQuick"]), { item: "worm", n: 9 }], 100, { hand: "rod", handAt: 0 });
  await purse(U.m2, [{ item: "rod", n: 1 }, { item: "worm", n: 9 }], 100, { hand: "rod", handAt: 0 });
  await t.sql(`delete from public.town_lines where true`);
  await clock(now() + 10 * MIN);
  await t.sql(`select setseed(0.31)`); const slow = await cast(U.m2), slowLine = await lineOf(U.m2);
  await t.sql(`delete from public.town_lines where true`);
  await t.sql(`select setseed(0.31)`); const quick = await cast(U.m1), quickLine = await lineOf(U.m1);
  const wantQuick = hastened({ wait: slow.line.wait, nibbles: slow.line.nibbles }, FISHING.rodHaste(1, OPT.rdQuick.n.shorter));
  t.check("a line dropped with a rod that shortens the wait: the same fish, sooner by what the code says, its twitches with it", quickLine.what === slowLine.what && quick.line.wait === wantQuick.wait && quick.line.wait < slow.line.wait && same(quick.line.nibbles, wantQuick.nibbles),
    { slow: slow.line, quick: quick.line, want: wantQuick });

  // the strike's moment, longer with a forged rod; and no longer than the code says
  const strikeAt = async (who, bag, past, reaction = 9999) => {
    await purse(who, bag, 100, { hand: "rod", handAt: 0 });
    await t.sql(`delete from public.town_lines where member_id = $1`, [who]);
    await cast(who); await setLine(who, FISH_COMMON);
    const line = await lineOf(who), pk = await kept(who);
    const win = Number((await one(`select town.strike_window($1::jsonb, town.now_ms()) as w`, [JSON.stringify(pk)])).w);
    await clock(line.bites_at + Math.floor(win * 1000) + FI.slack.late + past);
    return { win, r: await ask(who, "town_strike", reaction), want: FISHING.strikeWindowOf(pk, now()) };
  };
  const plainBag = [{ item: "rod", n: 1 }, { item: "worm", n: 9 }], plusBag = [tool("rod", 10), { item: "worm", n: 9 }, { item: "floatQuill", n: 1 }];
  const a1 = await strikeAt(U.m2, plainBag, 0), a2 = await strikeAt(U.m2, plainBag, 1), b1 = await strikeAt(U.m1, plusBag, 0), b2 = await strikeAt(U.m1, plusBag, 1);
  t.check("the strike's moment is the code's for a plain rod and for a forged one, to the millisecond: hooked at its end, gone a millisecond later",
    a1.r.hooked === true && a2.r.how === "missed" && b1.r.hooked === true && b2.r.how === "missed" && a1.win === a1.want && b1.win === b1.want && b1.win > a1.win, { plain: a1.win, forged: b1.win, a1: a1.r, a2: a2.r, b1: b1.r, b2: b2.r });
  const cap = CODE.forge.forge.cap;
  await purse(U.m1, [tool("rod", 10), { item: "floatBell", n: 1 }], 100, { hand: "rod", handAt: 0, buffs: [{ id: "keen", level: 4, until: now() + HOUR }] });
  const capped = Number((await one(`select town.strike_window($1::jsonb, town.now_ms()) as w`, [JSON.stringify(await kept(U.m1))])).w);
  await purse(U.m2, [{ item: "rod", n: 1 }, { item: "floatBell", n: 1 }], 100, { hand: "rod", handAt: 0, buffs: [{ id: "keen", level: 4, until: now() + HOUR }] });
  const rest = Number((await one(`select town.strike_window($1::jsonb, town.now_ms()) as w`, [JSON.stringify(await kept(U.m2))])).w);
  t.check("with a meal's buff and better gear already past the cap, the forged rod adds nothing; and takes nothing from what they give", capped === rest && rest > FI.strike * cap, { capped, rest, cap: FI.strike * cap });

  // a strike after the moment
  const goldBag = [tool("rod", 10, ["rdBait", "rdCalm", "rdGold"]), { item: "worm", n: 30 }];
  const g1 = await strikeAt(U.m1, goldBag, 500, 2500);
  p = await kept(U.m1);
  t.check("a strike after the moment, with a rod that takes it: hooked, and one of the day's counted", g1.r.hooked === true && used(p, "rdGold") === 1, { r: g1.r, powers: p.powers });
  await ask(U.m1, "town_land", "slipped", null);
  const g2 = await strikeAt(U.m1, goldBag, 500, null);
  t.check("a bite let go by is no strike: gone, and nothing counted", g2.r.how === "missed" && !("powers" in (await kept(U.m1))));
  const g3 = await strikeAt(U.m1, goldBag, OPT.rdGold.n.secs * 1000, 2500);
  t.check("past its seconds the fish is gone as ever", g3.r.how === "missed");
  const g4 = await strikeAt(U.m2, plainBag, 500, 2500);
  t.check("…and with a rod as it was bought a strike after the moment is gone", g4.r.how === "missed");

  // a fight's stamina; and the water lulled
  const fight = async (who, what) => {
    await t.sql(`delete from public.town_lines where member_id = $1`, [who]);
    await cast(who); await setLine(who, what);
    const line = await lineOf(who), before = await kept(who);
    await clock(line.bites_at + 300);
    const want = FISHING.lulled(FISHING.fightPaid(before, CODE.fish[what].effort, now()), what, now());
    const r = await ask(who, "town_strike", 300), after = await kept(who);
    await ask(who, "town_land", "slipped", null);
    return { r, before, after, want };
  };
  await clock(Math.floor(now() / DAY) * DAY + DAY + 5 * HOUR);   // (noon in Bangkok: the fights below are all of one meal's hours)
  await purse(U.m1, [tool("rod", 10, ["rdFresh", "rdQuick", "rdStill"], ["earth"]), { item: "worm", n: 60 }], 100, { hand: "rod", handAt: 0, buffs: [{ id: "hearty", level: 2, until: now() + DAY }] });
  const fights = [];
  for (let i = 0; i < OPT.rdFresh.use.n + 3; i++) { fights.push(await fight(U.m1, i === 1 ? FISH_UNCOMMON : FISH_COMMON)); await clock(now() + 6 * MIN); }
  const stays = (x) => same({ stamina: x.after.stamina, toolOwed: x.after.toolOwed ?? null, powers: x.after.powers ?? null, rodStill: x.after.rodStill ?? null },
    { stamina: x.want.stamina, toolOwed: x.want.toolOwed ?? null, powers: x.want.powers ?? null, rodStill: x.want.rodStill ?? null });
  t.check(`${fights.length} fights with a forged rod: after each the purse's stamina, what is owed forward, the counts and the lull are the code's`, fights.every(stays) && fights.every((x) => x.r.hooked),
    fights.filter((x) => !stays(x)).slice(0, 1).map((x) => ({ after: { s: x.after.stamina, o: x.after.toolOwed, p: x.after.powers, r: x.after.rodStill }, want: { s: x.want.stamina, o: x.want.toolOwed, p: x.want.powers, r: x.want.rodStill } })));
  p = fights[fights.length - 1].after;
  t.check("the first fights of the meal's hours cost nothing and are counted; the rest cost a share less, in whole points with the rest owed forward; and a better fish lulled the water once",
    stam(fights[OPT.rdFresh.use.n - 1].after) === 100 && stam(p) < 100 && used(p, "rdFresh") === OPT.rdFresh.use.n && typeof fights[1].after.rodStill === "number" && !("rodStill" in fights[0].after) && fights.some((x) => (x.after.toolOwed ?? 0) > 0),
    { left: stam(p), powers: p.powers, owed: fights.map((x) => x.after.toolOwed ?? 0) });
  const running = (await one(`select town.power_running($1::jsonb, $2::jsonb, $3::bigint) as r`, [JSON.stringify(fights[1].after), JSON.stringify(fights[1].after.bag[0]), fights[1].after.rodStill - 1])).r;
  t.check("the smith's own rule reads the lull as running, by the field this part writes", same(running, ["rdStill"]), running);

  // the least a landing can have taken
  const landAt = async (who, bag, share) => {
    await purse(who, bag, 100, { hand: "rod", handAt: 0 });
    await t.sql(`delete from public.town_lines where member_id = $1`, [who]);
    await cast(who); await setLine(who, FISH_UNCOMMON);
    const line = await lineOf(who);
    await clock(line.bites_at + 300); await ask(who, "town_strike", 300);
    const least = Number((await one(`select town.least_ms($1, 1, 1) as ms`, [FISH_UNCOMMON])).ms);
    await clock(now() + Math.ceil(least * share));
    return { rod: line.rod ?? null, r: await ask(who, "town_land", "landed", { secs: 5 }) };
  };
  const fireRod = tool("rod", 10, [], ["fire"]), linePart = FORGED.slowPartOf(0.88, FORGED.rodFx(fireRod).line);
  const l1 = await landAt(U.m1, [fireRod, { item: "worm", n: 9 }, { item: "netSmall", n: 1 }], linePart + 0.01), l2 = await landAt(U.m1, [fireRod, { item: "worm", n: 9 }, { item: "netSmall", n: 1 }], linePart - 0.02);
  const l3 = await landAt(U.m2, plainBag, linePart + 0.01), l4 = await landAt(U.m2, plainBag, 1.001);
  t.check("the least a landing can take is the rod's part of it, as the line remembers: an honest landing with that rod is taken, a sooner one is not; and a plain rod's bound is where it was",
    l1.rod === linePart && l1.r.how === "landed" && l2.r.how === "slipped" && l3.rod === null && l3.r.how === "slipped" && l4.r.how === "landed", { linePart, l1, l2, l3, l4 });

  // a bait left in the bag
  const keepsRod = tool("rod", 10, [], ["lightning"]), keeps = FORGED.rodFx(keepsRod).keeps;
  const landWith = async (seed) => {
    await purse(U.m1, [keepsRod, { item: "worm", n: 9 }], 100, { hand: "rod", handAt: 0 });
    await t.sql(`delete from public.town_lines where member_id = $1`, [U.m1]);
    await cast(U.m1); await setLine(U.m1, FISH_COMMON);
    const line = await lineOf(U.m1);
    await clock(line.bites_at + 300); await ask(U.m1, "town_strike", 300);
    await clock(now() + 60_000);
    await t.sql(`select setseed(${seed})`);
    const r = await ask(U.m1, "town_land", "landed", { secs: 5 });
    return { r, worms: (await kept(U.m1)).bag.find((s) => s?.item === "worm")?.n };
  };
  const yes = await landWith(await seedFor((r) => r < keeps)), no = await landWith(await seedFor((r) => r >= keeps));
  t.check("a fish landed with a rod that may leave the bait: by the database's own chance the bait is in the bag again, or it is not", yes.r.how === "landed" && yes.r.back === true && yes.worms === 9 && no.r.back === false && no.worms === 8, { yes, no });

  /* ── the hoe ── */
  t.section("a forged hoe on the farm");
  const [bx, by] = F.bedsAt[3];
  const key = (i, j = 0) => `${bx + i},${by + j}`;
  const plotRow = async (i, j = 0) => (await one(`select soil, plant, damp from public.town_plots where x = $1 and y = $2`, [bx + i, by + j])) ?? null;
  const tend = (who, i, j = 0, timing = { hits: 3, misses: 0, secs: 2 }) => ask(who, "town_tend", bx + i, by + j, timing, false);
  /** A deed as the code does it to that purse and plot: lib/town/farm's tend. */
  const tendWant = (pBefore, plot, i, j, me, bed = undefined, others = 0) => FARM.tend(key(i, j), plot, bed, others, 0, pBefore, me, now());
  const hoe = tool("hoe", 10, ["hoFresh", "hoFirst", "hoBoth"], ["earth"]);
  await purse(U.m1, [hoe, { item: "seedKangkong", n: 9 }], 100, { hand: "hoe", handAt: 0 });
  let before = await kept(U.m1), want = tendWant(before, FARM.WILD, 0, 0, U.m1), did = await tend(U.m1, 0);
  p = await kept(U.m1);
  t.check("weeds cleared with a hoe that does both: tilled by the same deed, the purse as the code leaves it (nothing paid, two options counted)",
    did.ok && did.deed === "clear" && did.plot.soil === "tilled" && same(did.plot, want.plot) && same(p.stamina, want.purse.stamina) && same(p.powers, want.purse.powers) && used(p, "hoFresh") === 1 && used(p, "hoBoth") === 1 && (await plotRow(0)).soil === "tilled",
    { did: did.plot, want: want.plot, powers: p.powers });
  const wetHoe = tool("hoe", 10, ["hoClear", "hoLight", "hoWet"], ["dark"]);
  await purse(U.m1, [wetHoe, { item: "seedKangkong", n: 9 }, { item: "hoeIron", n: 1 }], 100, { hand: "hoe", handAt: 0 });
  const wormChance = FORGED.hoeFx(wetHoe).worm;
  await tend(U.m1, 1);
  await momentFor((ms) => FORGED.luckOf(`worm|${key(1)}`, ms) < wormChance);
  before = await kept(U.m1); want = tendWant(before, { soil: "cleared", plant: null }, 1, 0, U.m1); did = await tend(U.m1, 1);
  p = await kept(U.m1);
  t.check("ground tilled with a hoe that leaves it so: the plot is kept with its mark, told with it, and what the tilling turned up is in the bag, as the code says of that moment",
    did.ok && did.plot.damp === true && same(did.plot, want.plot) && same(did.got, want.got) && did.got.length === 1 && (await plotRow(1)).damp === true && same(p.bag, want.purse.bag) && same(p.powers, want.purse.powers)
    && (await ask(U.m1, "town_farm", 0)).plots[key(1)].damp === true, { did, want: { plot: want.plot, got: want.got } });
  await tend(U.m1, 2);
  await momentFor((ms) => FORGED.luckOf(`worm|${key(2)}`, ms) >= wormChance);
  did = await tend(U.m1, 2);
  t.check("…and at a moment that turns nothing up, nothing", did.ok && did.got.length === 0 && did.plot.damp === true);
  // sown in the damp plot, and in one beside it that is not
  await patch(U.m1, { hand: "seedKangkong", handAt: 1 });
  before = await kept(U.m1); want = tendWant(before, { soil: "tilled", plant: null, damp: true }, 1, 0, U.m1); did = await tend(U.m1, 1, 0, null);
  t.check("a seed sown there is as the code sows it: watered at that moment, grown by a watering; and the plot's mark is gone",
    did.ok && did.deed === "sow" && same(did.plot, want.plot) && did.plot.plant.watered === now() && did.plot.plant.boost === F.water.adds * 60000 && !("damp" in did.plot) && (await plotRow(1)).damp === false, { did: did.plot, want: want.plot });
  did = await tend(U.m1, 0, 0, null);
  t.check("…and in a furrow with no mark a seed is sown as ever", did.ok && did.plot.plant.watered === 0 && did.plot.plant.boost === 0);
  // a forged hoe in the bag and another in the hand
  await patch(U.m1, { hand: "hoeIron", handAt: 2, powers: {}, stamina: { day: await day(), left: 50 } });
  did = await tend(U.m1, 3);
  const afterIron = await kept(U.m1);
  did = await tend(U.m1, 3);
  p = await kept(U.m1);
  t.check("a forged hoe that is in the bag and not in the hand does nothing: the deed costs what it costs, counts nothing, and leaves the plot as any hoe does",
    did.ok && !("damp" in did.plot) && same(p.powers, {}) && stam(afterIron) === 50 - F.costs.clear && stam(p) === 50 - F.costs.clear - F.costs.till && !("toolOwed" in p), { powers: p.powers, left: stam(p) });
  // tired hands that keep hold; and a plot beside the deed's
  await purse(U.m1, [tool("hoe", 10, ["hoFresh", "hoFirst", "hoGrip"]), { item: "worm", n: 1 }], 0, { hand: "hoe", handAt: 0 });
  await tend(U.m1, 4);
  t.check("a plot hoed with no stamina by a hoe that counts it: one of the day's", used(await kept(U.m1), "hoGrip") === 1);
  const nextHoe = tool("hoe", 10, [], ["lightning"]), nextChance = FORGED.hoeFx(nextHoe).next;
  await purse(U.m1, [nextHoe], 100, { hand: "hoe", handAt: 0 });
  await momentFor((ms) => FORGED.luckOf(`next|${key(3, 1)}`, ms) < nextChance);
  const plays = Number((await one(`select count(*)::int as n from public.town_plays`)).n);
  let deeds = await deedsN();
  did = await tend(U.m1, 3, 1);
  const alsoBed = did.also ? await Promise.all(did.also.map(async (k) => Number((await one(`select town.bed_of($1, $2) as b`, k.split(",").map(Number))).b))) : [];
  t.check("weeds cleared with a hoe that may do the next plot too: at a moment that does, the nearest plot of the row that wants the same (the one further left of two) is cleared with it, told and kept, in the same bed, and is no deed of its own",
    did.ok && same(did.also, [key(2, 1)]) && did.plots[key(2, 1)].soil === "cleared" && (await plotRow(2, 1)).soil === "cleared" && alsoBed.every((b) => b === 3)
    && Number((await one(`select count(*)::int as n from public.town_plays`)).n) === plays + 1 && (await deedsN()) === deeds, { also: did.also, plots: did.plots });
  await momentFor((ms) => FORGED.luckOf(`next|${key(5, 1)}`, ms) >= nextChance);
  did = await tend(U.m1, 5, 1);
  t.check("…and at a moment that does not, only its own", did.ok && !("also" in did) && (await plotRow(6, 1)) === null && (await plotRow(4, 1)) === null);

  // a row at a time (the enchanted hoe, the seed pouch) with a forged hoe: each plot as a deed leaves it, its mark kept and gone again
  await purse(U.m1, [wetHoe, { item: "seedKangkong", n: 9 }], 100, { hand: "hoe", handAt: 0, gifts: { had: ["charmHoe", "thingPouch"], charms: ["charmHoe"], owed: 0, familiar: null, used: {} } });
  const rowKeys = Array.from({ length: F.side }, (_, i) => key(i, 3)), marks = Object.fromEntries(rowKeys.map((k) => [k, true]));
  const dampIn = async () => Number((await one(`select count(*)::int as n from public.town_plots where damp and y = $1 and x between $2 and $3`, [by + 3, bx, bx + F.side - 1])).n);
  const r1 = await ask(U.m1, "town_row", bx, by + 3, marks, { hits: 7, misses: 0, secs: 9 }), r2 = await ask(U.m1, "town_row", bx, by + 3, marks, { hits: 7, misses: 0, secs: 9 });
  const dampAfter = await dampIn();
  await patch(U.m1, { hand: "seedKangkong", handAt: 1 });
  const r3 = await ask(U.m1, "town_row", bx, by + 3, {}, null);
  t.check("a row hoed with the enchanted hoe and a hoe that leaves its furrows so: every plot of the row is kept with its mark, and sown from the pouch each has its watering and its mark is gone",
    r1.ok && r2.ok && r2.deed === "till" && rowKeys.every((k) => r2.plots[k]?.damp === true) && dampAfter === F.side && used(await kept(U.m1), "hoWet") === F.side
    && r3.ok && r3.deed === "sow" && r3.done.length >= 2 && r3.done.every((k) => r3.plots[k].plant.watered === now() && !("damp" in r3.plots[k])) && (await dampIn()) === F.side - r3.done.length,
    { r1: r1.ok ?? r1, r2: r2.deed ?? r2, damp: dampAfter, sown: r3.done, left: await dampIn() });

  /* ── the watering can ── */
  t.section("a forged watering can at the well and on the farm");
  const [wx, wy] = F.wellAt, [cx, cy] = F.bedsAt[4];
  const ckey = (i, j = 0) => `${cx + i},${cy + j}`;
  const sownAt = (i, j, by_, wateredAgo = null) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
    on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [cx + i, cy + j, JSON.stringify({ by: by_, crop: "kangkong", sown: now() - 20 * MIN, boost: 0, watered: wateredAgo === null ? 0 : now() - wateredAgo, fed: 0, guard: now() + 99 * HOUR, cured: 0, picked: 0, pickedAt: 0 })]);
  const bedOwn = (who) => t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (4, $1, $2, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [who, now() - MIN]);
  const cplot = async (i, j = 0) => (await one(`select soil, plant, damp from public.town_plots where x = $1 and y = $2`, [cx + i, cy + j]));
  const ctend = (who, i, j = 0) => ask(who, "town_tend", cx + i, cy + j, null, false);
  const can = tool("can", 10, ["cnDrop", "cnThrift", "cnRain"], ["dark"]);
  await t.sql(`update public.town_things set doc = '12'::jsonb where key = 'well'`);
  await purse(U.m1, [can], 100, { hand: "can", handAt: 0 });
  did = await ask(U.m1, "town_chore", wx, wy - 1);
  p = await kept(U.m1);
  t.check("a forged can filled at the well: what it holds as the stack it is, for the bucketfuls the code says, and it is the tool it was",
    did.ok && did.chore === "fill" && p.bag[0].water === FARM.canHolds(can) && p.bag[0].water > F.cans.can && did.well === 12 - 1 && same({ ...p.bag[0], water: 0 }, { ...can, water: 0 }), { stack: p.bag[0], well: did.well, holds: FARM.canHolds(can) });
  t.check("…and full, it takes no more", (await ask(U.m1, "town_chore", wx, wy - 1)).ok === false);
  await purse(U.m2, [{ item: "can", n: 1 }], 100, { hand: "can", handAt: 0 });
  const plainFill = await ask(U.m2, "town_chore", wx, wy - 1);
  t.check("a can as it was bought is filled as ever", plainFill.ok && (await kept(U.m2)).bag[0].water === F.cans.can && plainFill.well === 11 - F.fill && same(Object.keys((await kept(U.m2)).bag[0]).sort(), ["item", "n", "water"]));
  // its own bed: a row of three dry plants, watered from one end and, an hour on, from the other
  for (const i of [0, 2, 5]) await sownAt(i, 0, U.m1);
  await bedOwn(U.m1);
  const waterWant = async (who, i, j = 0) => { const b = await kept(who), pl = await cplot(i, j); return FARM.water(ckey(i, j), b, { soil: pl.soil, plant: pl.plant }, b.hand, now()); };
  before = await kept(U.m1); const w0 = await waterWant(U.m1, 0); did = await ctend(U.m1, 0);
  p = await kept(U.m1);
  const beds1 = await Promise.all((did.also ?? []).map(async (k) => Number((await one(`select town.bed_of($1, $2) as b`, k.split(",").map(Number))).b)));
  t.check("a watering in a bed of one's own with a can that waters the row: every plant of the row that could be watered is, as a watering waters it; the can pays for one; one of the day's is counted",
    did.ok && same(did.also, [ckey(2), ckey(5)]) && [2, 5].every((i) => did.plots[ckey(i)].plant.watered === now() && did.plots[ckey(i)].plant.boost === w0.plot.plant.boost) && same(did.plot.plant.boost, w0.plot.plant.boost)
    && p.bag[0].water === before.bag[0].water - FORGED.canFx(can).uses && used(p, "cnRain") === 1 && beds1.every((b) => b === 4) && (await cplot(5)).plant.watered === now(), { also: did.also, water: p.bag[0].water, boost: [did.plot?.plant?.boost, w0.plot?.plant?.boost] });
  await clock(now() + 61 * MIN);
  did = await ctend(U.m1, 5);
  t.check("an hour on, from the other end of the row: the same three plots, each of that bed, its own and the two beside", did.ok && same(did.also, [ckey(0), ckey(2)]) && used(await kept(U.m1), "cnRain") === 2, did.also);
  await clock(now() + 61 * MIN);
  await bedOwn(U.m2);
  did = await ctend(U.m1, 0);
  t.check("in a bed that is somebody else's it waters its own plot only", did.ok && !("also" in did) && used(await kept(U.m1), "cnRain") === 2);
  // somebody else's plant, with a can the lines of work read
  const kindCan = tool("can", 6, ["cnKind", "cnFresh"], ["earth"], { water: 8 });
  await purse(U.m1, [kindCan], 100, { hand: "can", handAt: 0 });
  await sownAt(0, 2, U.m2); await sownAt(1, 2, U.m2);
  const helpersOf = async (who) => Number((await one(`select coalesce((town.work_told($1, town.now_ms())->'helpers'->>'points')::numeric, 0) as p`, [who])).p);
  const h0 = await helpersOf(U.m1);
  did = await ctend(U.m1, 0, 2);
  const noted = (await t.sql(`select what, doc from public.town_deeds order by id desc limit 1`)).rows[0];
  t.check("somebody else's plant watered with a can the lines of work read: the deed says so, and the helpers' line has the watering's points and the can's, no more than the option's own",
    did.ok && noted.what === "water" && noted.doc.kind === OPT.cnKind.n.points && noted.doc.whose === U.m2 && (await helpersOf(U.m1)) === h0 + CODE.work.helpers.water + OPT.cnKind.n.points, { doc: noted.doc, h0, h1: await helpersOf(U.m1) });
  await purse(U.m2, [{ item: "can", n: 1, water: 5 }], 100, { hand: "can", handAt: 0 });
  await sownAt(3, 2, U.m1); const h2 = await helpersOf(U.m2);
  await ctend(U.m2, 3, 2);
  t.check("…and with a can as it was bought, the watering's points as ever", (await helpersOf(U.m2)) === h2 + CODE.work.helpers.water);
  // a second watering in the hour; a can with no water in it
  const twiceCan = tool("can", 10, ["cnDrop", "cnFresh", "cnTwice"], [], { water: 9 });
  await purse(U.m1, [twiceCan], 100, { hand: "can", handAt: 0 });
  await bedOwn(U.m1); await sownAt(0, 4, U.m1, 10 * MIN); await sownAt(1, 4, U.m1, 10 * MIN);
  did = await ctend(U.m1, 0, 4);
  const third = await ctend(U.m1, 0, 4);
  await purse(U.m2, [{ item: "can", n: 1, water: 5 }], 100, { hand: "can", handAt: 0 });
  const plainWet = await ctend(U.m2, 1, 4);
  t.check("a plant wet from one watering takes one more from a can that waters twice (counted), no third until it has dried; and from any other can none",
    did.ok && did.deed === "water" && did.plot.plant.twice === now() && used(await kept(U.m1), "cnTwice") === 1 && third.ok === false && plainWet.ok === false, { did: did.plot?.plant, third, plainWet });
  const fullCan = tool("can", 10, ["cnDrop", "cnFresh", "cnFull"], []);
  await purse(U.m1, [fullCan, tool("hoe", 3)], 100, { hand: "can", handAt: 0 });
  await sownAt(0, 5, U.m1); await sownAt(1, 5, U.m1); await sownAt(2, 5, U.m1);
  did = await ctend(U.m1, 0, 5);
  p = await kept(U.m1);
  const mins = OPT.cnFull.n.mins;
  const runs = (await one(`select town.power_running($1::jsonb, $2::jsonb, town.now_ms()) as r`, [JSON.stringify(p), JSON.stringify(p.bag[0])])).r;
  t.check("a can that waters with none in it: it begins when it is dry, for its minutes, counted once; the smith's own rule reads it as running",
    did.ok && p.canFull === now() + mins * MIN && used(p, "cnFull") === 1 && (p.bag[0].water ?? 0) === 0 && same(runs, ["cnFull"]), { did, canFull: p.canFull, powers: p.powers, runs });
  await clock(now() + (mins - 1) * MIN);
  did = await ctend(U.m1, 1, 5);
  await clock(now() + 2 * MIN);
  const dry = await ctend(U.m1, 2, 5);
  t.check("…it waters on within them with nothing counted again, and after them it is dry (its one of the day is spent)", did.ok && used(await kept(U.m1), "cnFull") === 1 && dry.ok === false && dry.why === "dry", { dry });

  /* ── the net ── */
  t.section("a forged net");
  const net = tool("bugNet", 10, ["ntFresh", "ntMesh", "ntWide"], ["lightning"]), twin = FORGED.netFx(net).twin;
  await t.sql(`delete from public.town_takes where true`);
  await clock(Math.floor(now() / DAY) * DAY + DAY + 3 * HOUR);   // (ten in the morning in Bangkok)
  await purse(U.m1, [net], 100, { hand: "bugNet", handAt: 0 });
  const sights = (await ask(U.m1, "town_bugs")).bugs.filter((b) => INS.bugs[b[1]].habit !== "lure");
  const catchAt = async (s, wantTwin) => {
    await momentFor((ms) => ms < s[4] - 1000 && (FORGED.luckOf("twin", s[0], s[2], ms) < twin) === wantTwin);
    const perch = INS.haunts[s[0]][3][0], b = await kept(U.m1);
    const r = await ask(U.m1, "town_net", s[0], Math.floor(perch[0]), Math.floor(perch[1]), 1, null);
    return { r, before: b, after: await kept(U.m1) };
  };
  const c1 = await catchAt(sights[0], true), c2 = await catchAt(sights[1], false);
  const hunted = (await t.sql(`select thing, n::int as n from public.town_deeds where what = 'net' order by id desc limit 2`)).rows;
  t.check("a catch with a forged net: nothing paid while its first catches of the meal's hours last (counted); at a moment that brings one more, one more than the haunt had; at another, as many",
    c1.r.ok && c2.r.ok && c1.r.got[0][1] === hunted[1].n + 1 && c2.r.got[0][1] === hunted[0].n && stam(c1.after) === 100 && stam(c2.after) === 100 && used(c2.after, "ntFresh") === 2, { got: [c1.r.got, c2.r.got], hunted, powers: c2.after.powers });
  const N_WIDE = OPT.ntWide.use.n, lefts = [];
  for (let i = 0; i < N_WIDE + 1; i++) { const r = await ask(U.m1, "town_tool_power", "ntWide"); lefts.push(r.ok ? r.left : r.why); }
  t.check(`an option the page counts through the database, to its last: ${N_WIDE} of the day, then spent`, same(lefts, [...Array.from({ length: N_WIDE }, (_, i) => N_WIDE - 1 - i), "spent"]), lefts);
  await purse(U.m2, [{ item: "bugNet", n: 1 }, net], 100, { hand: "bugNet", handAt: 0 });
  t.check("…none for the net as it was bought in the hand, though the forged one is in the bag", (await ask(U.m2, "town_tool_power", "ntWide")).why === "none");
  await clock(now() + DAY);
  t.check("…and back with the day", (await ask(U.m1, "town_tool_power", "ntWide")).left === N_WIDE - 1);
  const darkNet = tool("bugNet", 10, [], ["dark"]);
  await purse(U.m1, [darkNet, { item: "bugNet", n: 1 }], 100, { hand: "bugNet", handAt: 0 });
  const rarerHeld = (await one(`select town.net_cat($1::jsonb, town.cat('insects'))->'rarer' as k`, [JSON.stringify(await kept(U.m1))])).k;
  await patch(U.m1, { handAt: 1 });
  const rarerBag = (await one(`select town.net_cat($1::jsonb, town.cat('insects')) as k`, [JSON.stringify(await kept(U.m1))])).k;
  t.check("what comes back after a catch is asked with the row as the net in the hand has it; with the plain net in the hand and the forged one in the bag, as it is", rarerHeld === FORGED.netFx(darkNet).rare && rarerBag === null, { rarerHeld, rarerBag });

  /* ── the kitchen ── */
  t.section("forged cookware in the kitchen");
  const one1 = (ware) => COOK.RECIPE_IDS.find((id) => { const k = COOK.takes(id); return k.cooks === 1 && k.in.length === 1 && k.in[0] === ware && id in CODE.dishes && !!CODE.dishes[id].buff; });
  const DISH = one1("pot"), PAN = one1("pan");
  const needs = COOK.needsOf(DISH), larder = (times, of = needs) => of.map(([item, n]) => ({ item, n: n * times }));
  const cookNow = async (who, wantMore) => {
    const held = (await kept(who)).bag[0];
    if (wantMore !== null) await momentFor((ms) => (FORGED.luckOf("helping", ms, needs.length) < FORGED.cookFx(held).helping) === wantMore);
    const b = await kept(who), w = COOK.cook(b, needs, [b.hand], 1, now());
    const r = await ask(who, "town_cook", needs, "{}", { misses: 1, secs: 8 });
    return { r, want: w, before: b, after: await kept(who) };
  };
  const pot = tool("pot", 10, ["ckFresh", "ckBrisk", "ckBig"], ["lightning"]);
  await purse(U.m1, [pot, ...larder(8)], 100, { hand: "pot", handAt: 0 });
  await purse(U.m2, [{ item: "pot", n: 1 }, ...larder(2)], 100, { hand: "pot", handAt: 0 });
  const plainPot = await cookNow(U.m2, null), k1 = await cookNow(U.m1, true), k2 = await cookNow(U.m1, false);
  const N_BIG = OPT.ckBig.use.n, more = [k1, k2];
  for (let i = 2; i < N_BIG + 1; i++) more.push(await cookNow(U.m1, false));
  const potIn = (pp, dish) => pp.bag.filter((s) => s?.item === "potFull" && s.of?.dish === dish);
  t.check(`${more.length} pots cooked in forged cookware: each is the code's pot of that moment, helping for helping, and the purse after it the code's (stamina, counts)`,
    more.every((x) => x.r.ok && x.r.n === x.want.n && same(x.after.stamina, x.want.purse.stamina) && same(x.after.powers, x.want.purse.powers)), more.map((x) => [x.r.n, x.want.n, x.r.why]));
  t.check("…the pots a counted option makes bigger are so many more, at a moment that adds a helping one more again, and after the day's last the pot is as any",
    k1.r.n === plainPot.r.n + OPT.ckBig.n.more + 1 && k2.r.n === plainPot.r.n + OPT.ckBig.n.more && more[N_BIG].r.n === plainPot.r.n && used(more[N_BIG].after, "ckBig") === N_BIG, { plain: plainPot.r.n, forged: more.map((x) => x.r.n) });
  // a pot that carries something from its cookware: set down, told, eaten from, taken up
  const tablePot = tool("pot", 10, ["ckFire", "ckBase", "ckWarm"], []), scentPan = tool("pan", 10, ["ckFire", "ckBase", "ckScent"], [], { origin: "pot" });
  await purse(U.m1, [tablePot, ...larder(3), { item: "bowl", n: 1 }], 100, { hand: "pot", handAt: 0 });
  const warm = await cookNow(U.m1, null), warmStack = potIn(warm.after, DISH)[0];
  t.check("a dish cooked in cookware whose pots are for the table: the pot in the bag carries what the code gave it, and one of the day's is counted", warm.r.ok && warmStack.warm === OPT.ckWarm.n.hours && !("scent" in warmStack) && same(warmStack, potIn(warm.want.purse, DISH)[0]) && used(warm.after, "ckWarm") === 1, warmStack);
  const YARD = K.feast.floor[0], slotOf = (pp) => pp.bag.findIndex((s) => s?.item === "potFull");
  const down = await ask(U.m1, "town_pot_down", YARD[0], YARD[1], slotOf(warm.after)), potId = Number(down.pot?.id);
  const told = (await ask(U.m2, "town_kitchen")).pots.find((o) => Number(o.id) === potId);
  t.check("set down in the yard it stands on the table with what it carries: kept on its row, and told so", down.ok && down.pot.feast === true && down.pot.warm === OPT.ckWarm.n.hours && told?.warm === OPT.ckWarm.n.hours
    && same((await one(`select marks from public.town_pots where id = $1`, [potId])).marks, { warm: OPT.ckWarm.n.hours }), { down: down.pot, told });
  await purse(U.m2, [{ item: "bowl", n: 1 }], 30, {});
  const ate = await ask(U.m2, "town_feast_eat", potId, YARD[0], YARD[1], true);
  let eater = await kept(U.m2);
  t.check("a helping out of it goes with what the pot carries", ate.ok && eater.eating.warm === OPT.ckWarm.n.hours && eater.eating.lent === true, eater.eating);
  await clock(now() + CODE.stamina.minutes * MIN + 1000);
  const chewWant = STAM.chew(eater, 0, now()), chewed = await ask(U.m2, "town_chew", 0);
  eater = await kept(U.m2);
  const buffOf = (pp) => (pp.buffs ?? []).find((b) => b.id === CODE.dishes[DISH].buff);
  t.check("…and eaten up, the buff the dish leaves runs as long as the code says: its hours and the pot's", chewed.ok !== false && buffOf(eater)?.until === buffOf(chewWant.purse).until && buffOf(eater).until === now() + (CODE.stamina.hours + OPT.ckWarm.n.hours) * HOUR && same(eater.stamina, chewWant.purse.stamina),
    { got: buffOf(eater), want: buffOf(chewWant.purse) });
  const up = await ask(U.m1, "town_pot_take", potId, YARD[0], YARD[1]);
  p = await kept(U.m1);
  t.check("taken up again it is the pot it was, with what it carries", up.ok && potIn(p, DISH)[0]?.warm === OPT.ckWarm.n.hours && potIn(p, DISH)[0].of.left === warm.r.n - 1, potIn(p, DISH));
  // the other mark, from a forging that came out of a fellow of the line: at home in all three
  await purse(U.m1, [scentPan, { item: "pot", n: 1 }, ...larder(1, COOK.needsOf(PAN)), { item: "bowl", n: 1 }], 100, { hand: "pan", handAt: 0 });
  const sc = await ask(U.m1, "town_cook", COOK.needsOf(PAN), "{}", { misses: 0, secs: 4 });
  p = await kept(U.m1);
  const scStack = potIn(p, PAN)[0];
  const down2 = await ask(U.m1, "town_pot_down", YARD[0], YARD[1], slotOf(p));
  await purse(U.m2, [], 30, {});
  await ask(U.m2, "town_feast_eat", Number(down2.pot?.id), YARD[0], YARD[1], true);
  eater = await kept(U.m2);
  await clock(now() + CODE.stamina.minutes * MIN + 1000);
  const want2 = STAM.chew(eater, 0, now()); await ask(U.m2, "town_chew", 0);
  const fed = await kept(U.m2);
  t.check("a pan with a forging that came out of a pot (the cookware's options are at home in all three): its pot carries the other mark, and a helping out of it gives as much stamina as the code says",
    sc.ok && scStack?.scent === OPT.ckScent.n.stamina && eater.eating?.scent === OPT.ckScent.n.stamina && same(fed.stamina, want2.purse.stamina) && stam(fed) > 30 + CODE.dishes[PAN].stamina, { sc: sc.ok ?? sc, scStack, left: stam(fed), want: want2.purse?.stamina });
  // forged cookware in the bag, another piece in the hand; and somebody else's forged cookware beside mine
  await purse(U.m1, [{ item: "pot", n: 1 }, pot, ...larder(2)], 100, { hand: "pot", handAt: 0 });
  await purse(U.m2, [pot], 100, { hand: "pot", handAt: 0 });
  const mine = await ask(U.m1, "town_cook", needs, `{${U.m2}}`, { misses: 1, secs: 8 });
  p = await kept(U.m1);
  t.check("forged cookware that is in the bag and not in the hand, and another member's forged cookware beside mine, do nothing: the pot is a plain pot's, the stamina paid, nothing counted on either purse",
    mine.ok && mine.n === plainPot.r.n && stam(p) === 100 - K.cost && !("powers" in p) && !("powers" in (await kept(U.m2))), { n: mine.n, left: stam(p) });

  /* ── a tool handed over ── */
  t.section("a forged tool handed over in a deal");
  await t.sql(`delete from public.town_lines where true`);
  await purse(U.m1, [rodCall, { item: "worm", n: 9 }], 100, {});
  await purse(U.m2, [{ item: "worm", n: 9 }], 100, {});
  const open = await ask(U.m1, "town_deal_open", U.m2);
  const lay = await ask(U.m1, "town_deal_lay", [["rod", 1]], 0);
  await ask(U.m2, "town_deal_lay", [], 0);
  await ask(U.m1, "town_deal_agree", true);
  const done = await ask(U.m2, "town_deal_agree", true);
  await patch(U.m1, { bag: [{ item: "rod", n: 1 }, { item: "worm", n: 9 }, ...Array(12).fill(null)], hand: "rod", handAt: 0 });
  const theirs = await kept(U.m2), slot = theirs.bag.findIndex((s) => s?.item === "rod");
  await ask(U.m2, "town_hold", slot);
  await clock(now() + 10 * MIN);
  const newCast = await cast(U.m2), oldCast = await cast(U.m1);
  t.check("the tool is the new holder's whole, and works for them; the old holder fishes with a rod as it was bought, and their count is not the new holder's",
    open.ok !== false && lay.ok !== false && done.ok !== false && same(theirs.bag[slot], rodCall) && newCast.line.wait === 1 && oldCast.line.wait > 1 && used(await kept(U.m2), "rdCall") === 1 && !("powers" in (await kept(U.m1))),
    { open: open.ok ?? open, lay: lay.ok ?? lay, done: done.ok ?? done, stack: theirs.bag[slot], waits: [newCast.line?.wait, oldCast.line?.wait] });

  /* ── once more ── */
  t.section("the part run once more, over what the stories left");
  const dampBefore = Number((await one(`select count(*)::int as n from public.town_plots where damp`)).n), marksBefore = Number((await one(`select count(*)::int as n from public.town_pots where marks is not null`)).n);
  let ranAgain = true;
  try { await t.db.exec(sql); } catch (e) { ranAgain = e.message; }
  t.check("it runs, and what was kept is kept: the plots' marks and the pots' are as they were", ranAgain === true
    && Number((await one(`select count(*)::int as n from public.town_plots where damp`)).n) === dampBefore && Number((await one(`select count(*)::int as n from public.town_pots where marks is not null`)).n) === marksBefore && dampBefore > 0 && marksBefore > 0, { ranAgain, dampBefore, marksBefore });
  await purse(U.m1, [tool("hoe", 10, ["hoFresh"]), { item: "worm", n: 1 }], 100, { hand: "hoe", handAt: 0 });
  did = await ask(U.m1, "town_tend", F.bedsAt[5][0], F.bedsAt[5][1], { hits: 3, misses: 0, secs: 2 }, false);
  t.check("…and a deed with a forged tool is as it was", did.ok && stam(await kept(U.m1)) === 100 && used(await kept(U.m1), "hoFresh") === 1);
}
