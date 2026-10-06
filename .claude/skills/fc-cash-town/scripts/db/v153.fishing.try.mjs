// Scenes of the fishing deck's gifts, played through the functions a member calls (try-line.mjs runs this after the
// line's SQL is in and its rule cases have been asked).
export default async function ({ t, U, call, purseOf, deeds, one, same, give }) {
  const DECK = [16, 38];
  const BAG = [{ item: "rod", n: 1 }, { item: "worm", n: 9 }, null, null, null, null, null, null, null, null];
  /** A member with a rod in the hand, a bag (nine worms, unless told), all their stamina, and these gifts. */
  const rigged = async (who, gifts = {}, bag = BAG) => {
    await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
    await t.sql(`delete from public.town_lines where member_id = $1`, [who]);
    await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || jsonb_build_object('hand', 'rod', 'bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) where member_id = $1`, [who, JSON.stringify(bag)]);
    return give(who, gifts);
  };
  const lineOf = async (who) => (await one(`select doc from public.town_lines where member_id = $1`, [who]))?.doc ?? null;
  const held = async (who, item = "worm") => (await purseOf(who)).bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
  const stamina = async (who) => (await purseOf(who)).stamina.left;
  const plays = async (who) => (await t.sql(`select won, doc from public.town_plays where member_id = $1 and game = 'fishing' order by id`, [who])).rows;
  /** The line a member has out made to be this (a fish, its size), its bite a moment ago. */
  const fated = (who, doc) => t.sql(`update public.town_lines set doc = doc || $2::jsonb || jsonb_build_object('bites_at', town.now_ms() - 200) where member_id = $1`, [who, JSON.stringify(doc)]);
  /** The fight a member is in made to have begun so long ago. */
  const ago = (who, ms) => t.sql(`update public.town_lines set doc = doc || jsonb_build_object('struck_at', town.now_ms() - $2::bigint) where member_id = $1`, [who, ms]);
  /** A line dropped, made to be a fish, and hooked: the member is in the fight. */
  const hooked = async (who, what = "snakehead", size = 50) => {
    const c = await call(who, "town_cast", "worm", DECK[0], DECK[1], false);
    if (!c?.ok) return c;
    await fated(who, { what, size });
    return call(who, "town_strike", 200);
  };
  let did;

  /* ── the otter ── */
  t.section("the otter: a fish that gets away in the fight is driven back for one more");
  await rigged(U.m1, { had: ["famOtter"], familiar: "famOtter" });
  did = await hooked(U.m1);
  const paid = 100 - (await stamina(U.m1)), wormsOut = await held(U.m1), before = (await plays(U.m1)).length;
  t.check("a fish is hooked: its fight is paid for, and its bait is out", did?.ok === true && did.hooked === true && did.what === "snakehead" && paid === 7 && wormsOut === 8, { did, paid, wormsOut });
  did = await call(U.m1, "town_land", "slipped", { secs: 4 });
  let line = await lineOf(U.m1);
  t.check("it slips the hook, and the otter drives it back: the answer says once more, the line is out still with the same fish on", did?.ok === true && did.again === true && did.how === "slipped" && did.back === false
    && line?.what === "snakehead" && line.again === true && line.struck_at !== null, { did, line });
  t.check("…nothing is lost by it: no bait back or gone, no more stamina, and nothing written down of the go yet", (await held(U.m1)) === 8 && 100 - (await stamina(U.m1)) === paid && (await plays(U.m1)).length === before, { worms: await held(U.m1), stamina: await stamina(U.m1) });
  t.check("…and it is counted: one of ten in this meal's hours, written down", (await purseOf(U.m1)).gifts.used.famOtter?.n === 1
    && same((await deeds("gift_use")).filter((d) => d.member_id === U.m1 && d.thing === "famOtter").map((d) => [d.n, d.doc.left, d.doc.what, d.doc.how]), [[1, 9, "snakehead", "slipped"]]), { used: (await purseOf(U.m1)).gifts.used, deeds: await deeds("gift_use") });
  did = await call(U.m1, "town_land", "snapped", { secs: 3 });
  t.check("lost again, it is lost: the line is gone, the bait comes back as it does of any fish lost in the fight, and the go is written down once", did?.ok === true && !did.again && did.how === "snapped" && did.back === true
    && (await lineOf(U.m1)) === null && (await held(U.m1)) === 9 && (await plays(U.m1)).length === before + 1 && (await plays(U.m1)).at(-1).doc.how === "snapped" && (await purseOf(U.m1)).gifts.used.famOtter.n === 1, { did, plays: (await plays(U.m1)).slice(-2) });
  // driven back, and landed the second time
  await hooked(U.m1);
  did = await call(U.m1, "town_land", "snapped", null);
  const again = did?.again === true;
  did = await call(U.m1, "town_land", "landed", null);
  t.check("driven back and reeled in at once, it is no landing (a fight takes its time from when it was driven back)", again && did?.ok === true && did.how === "slipped" && !did.again, did);
  await hooked(U.m1);
  await call(U.m1, "town_land", "slipped", null);
  await ago(U.m1, 60000);
  did = await call(U.m1, "town_land", "landed", null);
  const last = (await plays(U.m1)).at(-1);
  t.check("driven back and fought again, it is landed: in the bag, the go won, and counted a fish once", did?.ok === true && did.how === "landed" && did.kept === true && (await held(U.m1, "snakehead")) === 1 && last.won === true && last.doc.what === "snakehead"
    && (await purseOf(U.m1)).gifts.used.famOtter.n === 3, { did, last, used: (await purseOf(U.m1)).gifts.used });
  // a line taken up, a fish landed, a landing too quick: none is the otter's
  await hooked(U.m1);
  await ago(U.m1, 60000);
  did = await call(U.m1, "town_land", "left", null);
  t.check("a line taken up with a fish on is not driven back", did?.ok === true && did.how === "left" && !did.again && (await purseOf(U.m1)).gifts.used.famOtter.n === 3, did);
  // its count: ten to a meal's hours
  await t.sql(`update public.town_purses set doc = jsonb_set(doc, '{gifts,used,famOtter,n}', '10'::jsonb) where member_id = $1`, [U.m1]);
  await hooked(U.m1);
  did = await call(U.m1, "town_land", "slipped", null);
  t.check("with its ten of this meal's hours done, a fish that gets away is lost as ever (and its bait comes back)", did?.ok === true && !did.again && did.how === "slipped" && did.back === true && (await lineOf(U.m1)) === null, did);
  // had, and not following
  await rigged(U.m1, { had: ["famOtter", "famGnome"], familiar: "famGnome" });
  await hooked(U.m1);
  did = await call(U.m1, "town_land", "slipped", null);
  t.check("had and not following (another familiar does), it drives nothing back", did?.ok === true && !did.again && did.how === "slipped" && (await lineOf(U.m1)) === null, did);
  // somebody without it
  await rigged(U.m2, {});
  await hooked(U.m2);
  const w2 = await held(U.m2);
  did = await call(U.m2, "town_land", "slipped", null);
  t.check("somebody with no otter is as before: the fish is lost, the bait comes back", did?.ok === true && !did.again && did.how === "slipped" && did.back === true && w2 === 8 && (await held(U.m2)) === 9 && (await lineOf(U.m2)) === null, did);
  /* ── a rod of two lines ── */
  t.section("a rod of two lines: two baits, two fish, lost one at a time");
  const lines = async (who) => (await t.sql(`select count(*)::int as n from public.town_lines where member_id = $1`, [who])).rows[0].n;
  const points = async (who) => Number((await one(`select coalesce((kept->>'points')::numeric, 0) as p from public.town_work where member_id = $1 and line = 'fishing'`, [who]))?.p ?? 0);
  /** Two lines dropped, made to be these two, and struck. */
  const hookedTwo = async (who, first, second) => {
    const c = await call(who, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
    if (!c?.ok) return c;
    await fated(who, { what: first[0], size: first[1], two: { what: second[0], size: second[1] } });
    return call(who, "town_strike", 200);
  };
  t.check("the catalog says which tiers never come as one of a pair", same((await one(`select town.cat('fishing')->'pair'->'never' as never`)).never, ["legend"]));
  await rigged(U.m2, {});
  did = await call(U.m2, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
  t.check("somebody with no rod of two lines is refused the pair, and nothing leaves the bag", did?.ok === false && did.why === "none" && (await held(U.m2)) === 9 && (await lines(U.m2)) === 0, did);
  did = await call(U.m2, "town_cast", "worm", DECK[0], DECK[1], false, "noSuchWay");
  t.check("a way of dropping a line there is none of is refused", did?.ok === false && did.why === "none" && (await held(U.m2)) === 9, did);
  did = await call(U.m2, "town_cast", "worm", DECK[0], DECK[1]);
  t.check("the plain line is dropped as ever, by a page that names four things and by one that names five", did?.ok === true && !("pair" in did.line) && (await held(U.m2)) === 8
    && (await call(U.m2, "town_cast", "worm", DECK[0], DECK[1], false, null))?.ok === true && (await lineOf(U.m2))?.two === undefined, did);
  await rigged(U.m1, { had: ["thingRod"] }, [{ item: "rod", n: 1 }, { item: "worm", n: 1 }, null, null, null, null, null, null, null, null]);
  did = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
  t.check("with one worm two lines cannot be dropped, and the worm stays", did?.ok === false && did.why === "none" && (await held(U.m1)) === 1, did);
  await rigged(U.m1, { had: ["thingRod"] });
  const castsBefore = (await deeds("cast")).length;
  did = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
  line = await lineOf(U.m1);
  const castDeed = (await deeds("cast")).at(-1);
  t.check("with the rod two lines go out for two worms: the line has a second thing on it, and the answer says two are out and nothing of what", did?.ok === true && did.line.pair === true && !("coming" in did.line) && !("coming2" in did.line)
    && (await held(U.m1)) === 7 && typeof line?.two?.what === "string" && typeof line.two.size === "number" && line.struck_at === null, { did, line });
  t.check("…written down as one cast of two baits", (await deeds("cast")).length === castsBefore + 1 && castDeed.thing === "worm" && castDeed.n === 2 && castDeed.doc.pair === true, castDeed);
  const tiers = (await t.sql(`select coalesce(town.cat('fish')->(l.doc->>'what')->>'tier', 'other') as a, coalesce(town.cat('fish')->(l.doc->'two'->>'what')->>'tier', 'other') as b from public.town_lines l where member_id = $1`, [U.m1])).rows[0];
  t.check("neither of the two is a legend", tiers.a !== "legend" && tiers.b !== "legend", tiers);
  await rigged(U.m1, { had: ["thingRod", "charmFloat"], charms: ["charmFloat"] });
  did = await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
  line = await lineOf(U.m1);
  t.check("with the whispering float worn both are told: the very things the two lines have", did?.ok === true && did.line.coming === line.what && did.line.coming2 === line.two.what, { told: did?.line, line });

  // two fish: both hooked by the one strike, each fight paid for, ended one at a time
  await rigged(U.m1, { had: ["thingRod"] });
  let was = await points(U.m1), had = (await plays(U.m1)).length;
  did = await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  line = await lineOf(U.m1);
  t.check("one strike hooks both: the answer names the two, each fight is paid for (2 and 2), and both are on the line", did?.ok === true && did.hooked === true && did.landed === false
    && same(did.pair, [{ what: "barb", size: 20, landed: false }, { what: "tilapia", size: 25, landed: false }]) && (await stamina(U.m1)) === 96 && line.what === "barb" && line.two?.what === "tilapia" && line.struck_at !== null, { did, line });
  did = await call(U.m1, "town_land", "landed", { which: 1 });
  t.check("one of the two reeled in at once is no landing: it got away, and the other is on still", did?.ok === true && did.how === "slipped" && did.what === "tilapia" && did.more === true && (await lineOf(U.m1))?.what === "barb" && (await lineOf(U.m1)).two === undefined, did);
  did = await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  await ago(U.m1, 60000);
  did = await call(U.m1, "town_land", "landed", { which: 1, secs: 9 });
  line = await lineOf(U.m1);
  t.check("the second of the two is landed first: in the bag, written down as a go of its own, and the first is on still, on a line as any other", did?.ok === true && did.how === "landed" && did.what === "tilapia" && did.kept === true && did.more === true
    && (await held(U.m1, "tilapia")) === 1 && line?.what === "barb" && line.size === 20 && line.two === undefined && (await plays(U.m1)).at(-1).won === true && (await plays(U.m1)).at(-1).doc.what === "tilapia" && (await plays(U.m1)).at(-1).doc.pair === 1, { did, line });
  const wormsMid = await held(U.m1);
  did = await call(U.m1, "town_land", "slipped", null);
  t.check("the other is lost after it: one fish lost, one bait back, the line gone, and its own go written down", did?.ok === true && did.how === "slipped" && did.what === "barb" && !did.more && did.back === true && (await held(U.m1)) === wormsMid + 1
    && (await lineOf(U.m1)) === null && (await plays(U.m1)).at(-1).doc.what === "barb" && (await plays(U.m1)).at(-1).won === false, { did, worms: [wormsMid, await held(U.m1)] });
  did = await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  const wormsOut2 = await held(U.m1);
  did = await call(U.m1, "town_land", "snapped", { which: 0 });
  t.check("the first of the two lost while the second is on: its bait comes back, and the second is still to be won", did?.ok === true && did.how === "snapped" && did.what === "barb" && did.more === true && did.back === true && (await held(U.m1)) === wormsOut2 + 1 && (await lineOf(U.m1))?.what === "tilapia", did);
  await ago(U.m1, 60000);
  did = await call(U.m1, "town_land", "landed", null);
  t.check("…and is won: landed, the line gone", did?.ok === true && did.how === "landed" && did.what === "tilapia" && !did.more && (await lineOf(U.m1)) === null && (await held(U.m1, "tilapia")) === 2, did);
  did = await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  await ago(U.m1, 60000);
  const a = await call(U.m1, "town_land", "landed", { which: 0 }), b = await call(U.m1, "town_land", "landed", null);
  const won = (await plays(U.m1)).slice(-2);
  t.check("both landed: two fish in the bag, two goes won, each counted on the line of work by itself", a?.how === "landed" && a.what === "barb" && a.more === true && b?.how === "landed" && b.what === "tilapia" && !b.more
    && (await held(U.m1, "barb")) === 1 && (await held(U.m1, "tilapia")) === 3 && won.every((p) => p.won) && same(won.map((p) => p.doc.what), ["barb", "tilapia"]) && (await points(U.m1)) >= was + 4, { a, b, won, points: [was, await points(U.m1)] });
  t.check("…and every one of these goes was written down: seven of them (the fish left on a line when the next was dropped is given up, as ever)", (await plays(U.m1)).length === had + 7, { had, now: (await plays(U.m1)).length });

  // what is no fish comes in at once
  await rigged(U.m1, { had: ["thingRod"] });
  had = (await plays(U.m1)).length;
  did = await hookedTwo(U.m1, ["boot", 0], ["minnow", 6]);
  line = await lineOf(U.m1);
  t.check("an old boot and a minnow: the boot is in the bag at once and written down, the minnow is to be fought alone and only its fight is paid for", did?.ok === true && same(did.pair, [{ what: "boot", size: 0, landed: true, kept: true }, { what: "minnow", size: 6, landed: false }])
    && (await held(U.m1, "boot")) === 1 && line?.what === "minnow" && line.two === undefined && line.struck_at !== null && (await stamina(U.m1)) === 99 && (await plays(U.m1)).length === had + 1 && (await plays(U.m1)).at(-1).doc.what === "boot", { did, line });
  await ago(U.m1, 60000);
  did = await call(U.m1, "town_land", "landed", null);
  t.check("…and landed as any fish", did?.ok === true && did.how === "landed" && did.what === "minnow" && (await held(U.m1, "minnow")) === 1, did);
  did = await hookedTwo(U.m1, ["hyacinth", 0], ["boot", 0]);
  t.check("two things that are no fish both come in at once: no fight, the line gone, both written down", did?.ok === true && did.landed === true && did.pair.every((h) => h.landed && h.kept) && (await lineOf(U.m1)) === null
    && (await held(U.m1, "hyacinth")) === 1 && (await held(U.m1, "boot")) === 2 && (await stamina(U.m1)) === 99, did);

  // a strike mistimed, and a line taken up
  await rigged(U.m1, { had: ["thingRod"] });
  await call(U.m1, "town_cast", "worm", DECK[0], DECK[1], false, "pair");
  did = await call(U.m1, "town_strike", -3000);
  t.check("a strike too soon loses both lines' bait, as it loses one's", did?.ok === true && did.hooked === false && did.how === "early" && (await held(U.m1)) === 7 && (await lineOf(U.m1)) === null, did);
  await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  did = await call(U.m1, "town_land", "left", null);
  t.check("two lines taken up with both fish on: both are let go, nothing comes back", did?.ok === true && did.how === "left" && !did.more && (await lineOf(U.m1)) === null && (await held(U.m1)) === 5, did);

  // the otter and the pair: it drives back the last fish still on, not one of two
  await rigged(U.m1, { had: ["thingRod", "famOtter"], familiar: "famOtter" });
  await hookedTwo(U.m1, ["barb", 20], ["tilapia", 25]);
  did = await call(U.m1, "town_land", "slipped", { which: 0 });
  const firstLost = did;
  did = await call(U.m1, "town_land", "slipped", null);
  line = await lineOf(U.m1);
  t.check("with the otter, one of two that gets away is lost (the other is on still); the last one on is driven back", firstLost?.how === "slipped" && firstLost.more === true && !firstLost.again && did?.again === true && line?.what === "tilapia" && line.again === true
    && (await purseOf(U.m1)).gifts.used.famOtter.n === 1, { firstLost, did, line });
}
