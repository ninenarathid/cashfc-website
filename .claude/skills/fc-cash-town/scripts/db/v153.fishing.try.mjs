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
}
