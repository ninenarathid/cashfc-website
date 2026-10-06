// The well's gifts through the functions a member calls (try-line.mjs plays this after the rule cases): each deed
// done, refused for each reason, what is kept in the purse, what is written down, and somebody without the gift as
// before.
/** The moon flask: special water kept, and poured into the well when its owner likes, through the functions a member's page calls. */
async function moonScenes({ t, U, call, purseOf, deeds, one, give, patch, CODE, now, gauge, staminaOf }) {
  const MIN = 60000, [wx, wy] = CODE.farming.wellAt, FULL = CODE.farming.well;
  const holding = async (who, item, water) => {
    const bag = (await purseOf(who)).bag.map((_, i) => (i === 0 ? { item, n: 1, ...(water ? { water } : {}) } : null));
    return patch(who, { bag, hand: item });
  };
  /** The nature the well's book has for the water in a bucket of somebody's (null: plain). */
  const waterIs = (who, item, kind) => t.sql(`insert into public.town_line_water (member_id, item, hands, kind) values ($1, $2, '{}', $3)
    on conflict (member_id, item) do update set hands = excluded.hands, kind = excluded.kind`, [who, item, kind]);
  const wellIs = (n) => t.sql(`insert into public.town_things (key, doc) values ('well', $1::jsonb) on conflict (key) do update set doc = excluded.doc`, [String(n)]);
  const wellWater = async () => (await one(`select doc from public.town_things where key = 'well_water'`))?.doc ?? null;
  const wellHas = async () => (await one(`select (doc #>> '{}')::int as n from public.town_things where key = 'well'`)).n;
  const carriedBy = async (who) => (await one(`select buckets from public.town_carriers where member_id = $1`, [who]))?.buckets ?? 0;
  const noWater = () => t.sql(`update public.town_things set doc = 'null'::jsonb where key = 'well_water'`);

  t.section("the moon flask: water that differs, kept out of the bucket in the hand");
  await give(U.m1, { had: ["thingFlask", "famFrog", "thingMoon"], familiar: null });
  await patch(U.m1, { moon: null, rained: 0 });
  await holding(U.m1, "waterYokeGreat", 4);
  await waterIs(U.m1, "waterYokeGreat", "dawn");
  await gauge(U.m1, 50);
  let did = await call(U.m1, "town_moon");
  t.check("a flask's owner's page is told what water their buckets have", did?.carried?.waterYokeGreat === "dawn" && typeof did.now === "number", did);
  await holding(U.m2, "bucket", 1);
  await waterIs(U.m2, "bucket", "dawn");
  const before2 = await purseOf(U.m2);
  did = await call(U.m2, "town_moon_keep");
  t.check("somebody with no flask keeps nothing: their bucket of dew is as it was", did?.ok === false && did.why === "none" && JSON.stringify((await purseOf(U.m2)).bag) === JSON.stringify(before2.bag) && !("moon" in (await purseOf(U.m2))), did);
  did = await call(U.m1, "town_moon_keep");
  let mine = await purseOf(U.m1);
  t.check("the dew of a yoke of four: three bucketfuls go into the flask, one stays in the yoke, for nothing", did?.ok === true && did.n === 3 && did.kind === "dawn" && mine.moon?.kind === "dawn" && mine.moon.n === 3 && mine.bag[0].water === 1 && mine.stamina.left === 50, { did: did?.ok ? [did.n, did.kind] : did, moon: mine.moon, bag: mine.bag[0] });
  let keeps = await deeds("moon_keep");
  t.check("it is written down: who, out of which bucket, how many, of which water, and what the flask has now", keeps.length === 1 && keeps[0].member_id === U.m1 && keeps[0].thing === "waterYokeGreat" && keeps[0].n === 3 && keeps[0].doc.kind === "dawn" && keeps[0].doc.flask === 3 && keeps[0].coins === 0, keeps);
  did = await call(U.m1, "town_moon_keep");
  t.check("a flask that has its three keeps no more", did?.ok === false && did.why === "brim" && (await purseOf(U.m1)).bag[0].water === 1, did);
  await patch(U.m1, { moon: { kind: "dawn", n: 1 } });
  await waterIs(U.m1, "waterYokeGreat", "rain");
  did = await call(U.m1, "town_moon_keep");
  t.check("another water than it has is not mixed in", did?.ok === false && did.why === "other", did);
  await waterIs(U.m1, "waterYokeGreat", null);
  did = await call(U.m1, "town_moon_keep");
  t.check("plain water is not kept", did?.ok === false && did.why === "plain", did);
  await holding(U.m1, "waterYokeGreat");
  await waterIs(U.m1, "waterYokeGreat", "dawn");
  did = await call(U.m1, "town_moon_keep");
  t.check("…nor from a bucket with no water in it", did?.ok === false && did.why === "hand" && (await deeds("moon_keep")).length === 1, did);

  t.section("the moon flask: poured into the well when its owner likes, three times as long");
  await patch(U.m1, { moon: { kind: "dawn", n: 3 } });
  await wellIs(FULL - 2);
  await noWater();
  await t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, 100) on conflict (member_id) do update set buckets = 100`, [U.m1]);
  const pours0 = (await deeds("pour")).length;
  did = await call(U.m1, "town_moon_pour", 30, 40, 1);
  t.check("not away from the well", did?.ok === false && did.why === "none" && (await purseOf(U.m1)).moon.n === 3, did);
  did = await call(U.m1, "town_moon_pour", wx + 1, wy, 0);
  t.check("not by no bucketful at all", did?.ok === false && did.why === "amount", did);
  let t0 = await now();
  did = await call(U.m1, "town_moon_pour", wx + 1, wy, 1);
  mine = await purseOf(U.m1);
  let water = await wellWater();
  t.check("a bucketful of the flask into the well: the well has one more, the flask one fewer, for a pour's stamina", did?.ok === true && did.poured === 1 && did.into === 1 && did.kind === "dawn" && did.well === FULL - 1 && (await wellHas()) === FULL - 1 && mine.moon.n === 2 && mine.stamina.left === 50 - CODE.farming.chores.pour, { did: did?.ok ? [did.poured, did.into, did.well] : did, moon: mine.moon, stamina: mine.stamina });
  t.check("the well takes the dew's nature for an hour and a half of that one bucketful, where a bucket's gives half an hour", water?.kind === "dawn" && water.by === U.m1 && water.until >= t0 + 90 * MIN && water.until < t0 + 90 * MIN + 5000 && did.wellWater?.until === water.until, water);
  let pours = (await deeds("pour")).slice(pours0), flasks = await deeds("moon_pour");
  t.check("it is written down twice over: a bucketful poured, which the well's book counts as any; and the flask's own line", pours.length === 1 && pours[0].member_id === U.m1 && pours[0].thing === "thingMoon" && pours[0].n === 1 && pours[0].doc.flask === true
    && flasks.length === 1 && flasks[0].member_id === U.m1 && flasks[0].thing === "dawn" && flasks[0].n === 1 && flasks[0].doc.into === 1 && flasks[0].doc.until === water.until && flasks[0].coins === 0, { pours, flasks });
  t.check("…the carrier's book has the bucketful, and the well's lots whose water it is", (await carriedBy(U.m1)) === 101
    && (await one(`select member_id, buckets from public.town_well_water order by id desc limit 1`)).member_id === U.m1, await carriedBy(U.m1));
  const first = water.until;
  t0 = await now();
  did = await call(U.m1, "town_moon_pour", wx, wy + 1, 3);
  mine = await purseOf(U.m1);
  water = await wellWater();
  t.check("all it has, asked for three with two in it: two poured, one into a well with room for one, the other runs over; the flask is empty", did?.ok === true && did.poured === 2 && did.into === 1 && did.well === FULL && !("moon" in mine) && (await carriedBy(U.m1)) === 102, { did: did?.ok ? [did.poured, did.into, did.well] : did, moon: mine.moon });
  t.check("the well's dew lasts three hours more: every bucketful poured counts, the one that ran over too", water.kind === "dawn" && water.until === first + 180 * MIN, { first, until: water.until });
  did = await call(U.m1, "town_moon_pour", wx + 1, wy, 1);
  t.check("an empty flask pours nothing", did?.ok === false && did.why === "dry", did);
  // a full well: the nature is given all the same; nothing is counted as poured
  await patch(U.m1, { moon: { kind: "moon", n: 2 } });
  const flasksBefore = (await deeds("moon_pour")).length, poursBefore = (await deeds("pour")).length;
  t0 = await now();
  did = await call(U.m1, "town_moon_pour", wx + 1, wy + 1, 2);
  water = await wellWater();
  t.check("into a full well: the water runs over and nothing is counted as poured, and the well takes the nature all the same", did?.ok === true && did.poured === 2 && did.into === 0 && did.well === FULL && (await wellHas()) === FULL && (await carriedBy(U.m1)) === 102
    && (await deeds("pour")).length === poursBefore && (await deeds("moon_pour")).length === flasksBefore + 1, did?.ok ? [did.poured, did.into, did.well] : did);
  t.check("another nature takes the first one's place, as it always did: the moon's, for three hours of two bucketfuls", water.kind === "moon" && water.until >= t0 + 180 * MIN && water.until < t0 + 180 * MIN + 5000, water);

  t.section("the moon flask: a bucket of the same water poured after it never shortens the well's hours");
  await patch(U.m1, { moon: { kind: "moon", n: 3 } });
  await wellIs(10);
  await noWater();
  await call(U.m1, "town_moon_pour", wx + 1, wy, 3);
  const long = (await wellWater()).until;
  await holding(U.m2, "bucket", 1);
  await waterIs(U.m2, "bucket", "moon");
  await gauge(U.m2, 50);
  t0 = await now();
  did = await call(U.m2, "town_chore", wx - 1, wy);
  water = await wellWater();
  t.check("the flask's four and a half hours stand, where a bucket's most of two hours would have cut them", did?.ok === true && did.chore === "pour" && long >= t0 + 269 * MIN && water.kind === "moon" && water.until === long && water.by === U.m2, { long: long - t0, until: water.until - t0, by: water.by });
  await holding(U.m2, "bucket", 1);
  await waterIs(U.m2, "bucket", "rain");
  t0 = await now();
  did = await call(U.m2, "town_chore", wx - 1, wy);
  water = await wellWater();
  t.check("…and a bucket of another water still takes its place, for its own half hour", did?.ok === true && water.kind === "rain" && water.until >= t0 + 30 * MIN && water.until < t0 + 30 * MIN + 5000, { kind: water.kind, until: water.until - t0 });
  const words = await one(`select town.deed_th('moon_pour') as a, town.deed_th('moon_keep') as b, town.deed_th('rain_fill') as c, town.deed_th('drink') as d, town.deed_th('drink_gave') as e, town.deed_th('drink_offer') as f, town.deed_th('pour') as g`);
  t.check("every new deed has its Thai word, and the old ones theirs", Object.entries(words).every(([, w]) => /[฀-๿]/.test(w)) && words.g === "เทน้ำลงบ่อ", words);
}

/** The rain frog: a bucket the rain fills, through the function a member's page calls. */
async function frogScenes({ t, U, call, purseOf, deeds, one, give, patch, CODE, now, gauge, staminaOf }) {
  const slotNow = async () => Math.floor((await now()) / 900000);
  /** The weather of a quarter hour, written as the SQL editor (the trigger that keeps the weather lets it). */
  const sky = (slot, word) => t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, $2, 6, 12, $3)
    on conflict (slot) do update set sky = excluded.sky, rain = excluded.rain`, [slot, word, word === "clear" ? 0 : 1.2]);
  /** A bag with one thing in its first slot, held in the hand (with so much water in it, when it is said). */
  const holding = async (who, item, water) => {
    const bag = (await purseOf(who)).bag.map((_, i) => (i === 0 ? { item, n: 1, ...(water ? { water } : {}) } : null));
    return patch(who, { bag, hand: item });
  };
  const lineWater = (who, item) => one(`select hands, kind from public.town_line_water where member_id = $1 and item = $2`, [who, item]);

  t.section("the rain frog: under rain the bucket its member holds fills by itself");
  const cur = await slotNow();
  await sky(cur, "clear");
  await give(U.m1, { had: ["thingFlask", "famFrog"], familiar: "famFrog" });
  await holding(U.m1, "waterYokeGreat");
  await gauge(U.m1, 37);
  // (a bucket that came by somebody's hands once, with the dew's water: what the book still has of it, until it is drawn again)
  await t.sql(`insert into public.town_line_water (member_id, item, hands, kind) values ($1, 'waterYokeGreat', array[$2::uuid], 'dawn')
    on conflict (member_id, item) do update set hands = excluded.hands, kind = excluded.kind`, [U.m1, U.m2]);
  let did = await call(U.m1, "town_rain_fill");
  t.check("under a dry sky nothing fills", did?.ok === false && did.why === "dry" && !("rained" in (await purseOf(U.m1))) && (await deeds("rain_fill")).length === 0, did);
  await sky(cur, "rain");
  const t0 = await now();
  did = await call(U.m1, "town_rain_fill");
  let mine = await purseOf(U.m1);
  t.check("under rain the yoke of four is full: four bucketfuls, for no stamina", did?.ok === true && did.n === 4 && did.purse.bag[0].water === 4 && mine.bag[0].water === 4 && mine.bag[0].item === "waterYokeGreat" && mine.stamina.left === 37, did);
  t.check("…and when is kept in the purse", mine.rained >= t0 && mine.rained < t0 + 5000, mine.rained);
  let fills = await deeds("rain_fill");
  t.check("it is written down under a word of its own: who, which bucket, how many bucketfuls, no coin", fills.length === 1 && fills[0].member_id === U.m1 && fills[0].thing === "waterYokeGreat" && fills[0].n === 4 && fills[0].coins === 0, fills);
  const kept = await lineWater(U.m1, "waterYokeGreat");
  t.check("the well's book reads it as a bucket drawn: nobody's hands on its water, and its nature the rain's", kept?.kind === "rain" && kept.hands.length === 0, kept);
  did = await call(U.m1, "town_rain_fill");
  t.check("a bucket that has water in it is not filled again", did?.ok === false && did.why === "hand", did);
  await holding(U.m1, "waterYokeGreat");
  did = await call(U.m1, "town_rain_fill");
  t.check("emptied and held out again at once: not yet, the rain takes its time", did?.ok === false && did.why === "soon" && !(await purseOf(U.m1)).bag[0].water, did);
  await patch(U.m1, { rained: (await now()) - 47000 });
  did = await call(U.m1, "town_rain_fill");
  t.check("…47 seconds on, still not: a yoke of four takes 48", did?.ok === false && did.why === "soon", did);
  await patch(U.m1, { rained: (await now()) - 48000 });
  did = await call(U.m1, "town_rain_fill");
  t.check("…and after its 48 seconds it is full again", did?.ok === true && did.n === 4, did);
  await holding(U.m1, "bucket");
  await patch(U.m1, { rained: (await now()) - 12000 });
  did = await call(U.m1, "town_rain_fill");
  t.check("a plain bucket is full after 12", did?.ok === true && did.n === 1 && (await purseOf(U.m1)).bag[0].water === 1, did);
  await holding(U.m1, "can");
  await patch(U.m1, { rained: 0 });
  did = await call(U.m1, "town_rain_fill");
  t.check("what is no bucket is not filled", did?.ok === false && did.why === "hand", did);
  await patch(U.m1, { hand: null });
  did = await call(U.m1, "town_rain_fill");
  t.check("…nor a hand that holds nothing", did?.ok === false && did.why === "hand", did);

  t.section("the rain frog: only for whoever it follows");
  await holding(U.m1, "waterYokeGreat");
  await give(U.m1, { had: ["thingFlask", "famFrog"], familiar: null });
  did = await call(U.m1, "town_rain_fill");
  t.check("a frog that rests fills nothing", did?.ok === false && did.why === "none", did);
  await holding(U.m2, "bucket");
  const before = await purseOf(U.m2);
  did = await call(U.m2, "town_rain_fill");
  const after = await purseOf(U.m2);
  t.check("somebody with no frog stands in the rain with an empty bucket, as before", did?.ok === false && did.why === "none" && !after.bag[0].water && !("rained" in after) && JSON.stringify(after.bag) === JSON.stringify(before.bag), did);
  fills = await deeds("rain_fill");
  t.check("only what was filled is written down", fills.length === 3 && fills.every((d) => d.member_id === U.m1 && d.coins === 0), fills.map((d) => [d.thing, d.n]));

  t.section("the rain frog: what the rain filled is still to be carried and poured");
  await give(U.m1, { had: ["thingFlask", "famFrog"], familiar: "famFrog" });
  await patch(U.m1, { rained: 0 });
  await t.sql(`insert into public.town_things (key, doc) values ('well', '0'::jsonb) on conflict (key) do update set doc = excluded.doc`);
  await t.sql(`update public.town_things set doc = 'null'::jsonb where key = 'well_water'`);
  await t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, 0) on conflict (member_id) do update set buckets = 0`, [U.m1]);
  did = await call(U.m1, "town_rain_fill");
  const [wx, wy] = CODE.farming.wellAt;
  const stamina = await staminaOf(U.m1);
  did = await call(U.m1, "town_chore", wx + 1, wy);
  const book = await one(`select (select c.buckets from public.town_carriers c where c.member_id = $1) as buckets, (select doc from public.town_things where key = 'well_water') as water, (select (doc #>> '{}')::int from public.town_things where key = 'well') as well`, [U.m1]);
  t.check("poured into the well as any water: the pour's own stamina, four bucketfuls in the well and in the carrier's book", did?.ok === true && did.chore === "pour" && did.well === 4 && book.well === 4 && book.buckets === 4 && (await staminaOf(U.m1)) === stamina - CODE.farming.chores.pour, { did: did?.chore ?? did, book });
  t.check("…and the well takes the rain's nature of it, as of any rain water", book.water?.kind === "rain" && book.water.by === U.m1 && book.water.until > (await now()), book.water);

  t.section("the rain frog: the sky to come is the database's, told to every page");
  for (const [i, word] of ["cloudy", "rain", "storm", "clear", "clear"].entries()) await sky(cur + 1 + i, word);
  const told = await call(U.m2, "town_sky", 0);
  const ahead = Object.fromEntries((told?.slots ?? []).map((s) => [s[0], s[1]]));
  t.check("town_sky tells this quarter hour's weather and those written ahead: the three the frog shows, and beyond", ahead[cur] === "rain" && ahead[cur + 1] === "cloudy" && ahead[cur + 2] === "rain" && ahead[cur + 3] === "storm" && ahead[cur + 5] === "clear", ahead);
  await sky(cur, "clear");
}

export default async function ({ t, U, call, purseOf, deeds, one, give, patch, CODE }) {
  const now = async () => Number((await one(`select town.now_ms() as n`)).n);
  const today = async () => (await one(`select town.day_of(town.now_ms()) as d`)).d;
  const hours = async () => Number((await one(`select town.stretch_at('{"n":1,"per":"meal"}'::jsonb, town.now_ms()) as k`)).k);
  const gauge = async (who, left) => patch(who, { stamina: { day: await today(), left } });
  const poured = (who, n) => t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, $2) on conflict (member_id) do update set buckets = excluded.buckets`, [who, n]);
  const staminaOf = async (who) => (await purseOf(who)).stamina.left;

  // ── the well's later ranks are taken by whoever has poured enough (its points are its own book's bucketfuls) ──
  t.section("the well's fourth to sixth ranks: taken by the bucketfuls poured");
  await call(U.m1, "town_me");
  await poured(U.m1, 1499);
  let did = await call(U.m1, "town_gift_take", "well", 4);
  t.check("with 1,499 bucketfuls the fourth rank's gift is not to be had yet", did?.ok === false && did.why === "rank", did);
  await poured(U.m1, 1500);
  const r = await one(`select town.rank_on($1, 'well') as r, (town.work_told($1, town.now_ms())->'well'->>'points')::int as points`, [U.m1]);
  t.check("1,500 bucketfuls are the well's fourth rank, by the carriers' book", r.r === 4 && r.points === 1500, r);
  did = await call(U.m1, "town_gift_take", "well", 4);
  t.check("…and its gift is the flask of living water, in no slot of the bag", did?.ok === true && did.gift === "thingFlask" && did.purse.gifts.had.includes("thingFlask") && did.purse.bag.every((s) => s === null), did);
  const took = (await deeds("gift")).filter((d) => d.thing === "thingFlask");
  t.check("the taking is written down, with its line and rank", took.length === 1 && took[0].member_id === U.m1 && took[0].doc.line === "well" && took[0].doc.rank === 4, took);
  did = await call(U.m1, "town_gift_take", "well", 4);
  t.check("it is taken once", did?.ok === false && did.why === "had", did);
  did = await call(U.m1, "town_gift_take", "well", 5);
  t.check("the fifth rank's waits for 3,000", did?.ok === false && did.why === "rank", did);
  await poured(U.m1, 6000);
  const five = await call(U.m1, "town_gift_take", "well", 5), six = await call(U.m1, "town_gift_take", "well", 6);
  t.check("with 6,000 the frog and the moon flask are taken too", five?.ok === true && five.gift === "famFrog" && six?.ok === true && six.gift === "thingMoon", { five: five?.gift ?? five, six: six?.gift ?? six });
  for (const rank of [1, 2, 3]) {
    did = await call(U.m1, "town_gift_take", "well", rank);
    t.check(`the well's rank ${rank} gives no gift of this kind (its own book hands that over)`, did?.ok === false && did.why === "none", did);
  }
  await poured(U.m1, 0);

  // ── the flask of living water ──
  t.section("the flask of living water: a drink held out");
  await give(U.m1, { had: ["thingFlask"] });
  // (a purse is kept from a member's first deed on: putting away what is held is one that changes nothing)
  await call(U.m2, "town_hold", null);
  await call(U.admin, "town_hold", null);
  await gauge(U.m1, 40);
  const before2 = await purseOf(U.m2);
  did = await call(U.m2, "town_drink_offer", U.m1, 10, 12);
  t.check("somebody with no flask holds nothing out", did?.ok === false && did.why === "none" && !("toast" in (await purseOf(U.m2))), did);
  did = await call(U.m1, "town_drink_offer", U.unver, 10, 12);
  t.check("nothing is held out to somebody who is not of the town", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_drink_offer", U.m1, 10, 12);
  t.check("…nor to oneself", did?.ok === false && did.why === "none", did);
  did = await call(U.m1, "town_drink_offer", U.m2, null, 12);
  t.check("…nor from what is no tile", did?.ok === false && did.why === "none" && (await deeds("drink_offer")).length === 0, did);
  const t0 = await now();
  did = await call(U.m1, "town_drink_offer", U.m2, 10, 12);
  let mine = await purseOf(U.m1);
  t.check("the flask's owner holds a drink out to a friend for twenty seconds", did?.ok === true && did.till >= t0 + 20000 && did.till < t0 + 25000 && did.purse.toast.to === U.m2, did);
  t.check("…kept in the giver's purse: to whom, from which tile, until when", mine.toast?.to === U.m2 && mine.toast.at[0] === 10 && mine.toast.at[1] === 12 && mine.toast.till === did.till && mine.stamina.left === 40, mine.toast);
  let offers = await deeds("drink_offer");
  t.check("…and written down", offers.length === 1 && offers[0].member_id === U.m1 && offers[0].thing === "thingFlask" && offers[0].doc.to === U.m2, offers);

  t.section("the flask of living water: the friend drinks");
  did = await call(U.m2, "town_drink_take", U.m1, 11, 12);
  t.check("a friend whose gauge is full is given none (a purse not counted today is full)", did?.ok === false && did.why === "sated", did);
  await gauge(U.m2, 20);
  did = await call(U.m2, "town_drink_take", U.m1, 14, 12);
  t.check("from four tiles off it is too far", did?.ok === false && did.why === "far", did);
  did = await call(U.m2, "town_drink_take", U.m1, null, null);
  t.check("…and from what is no tile", did?.ok === false && did.why === "far", did);
  did = await call(U.admin, "town_drink_take", U.m1, 10, 12);
  t.check("somebody it is not held out to has none of it", did?.ok === false && did.why === "none", did);
  did = await call(U.m2, "town_drink_take", U.m2, 10, 12);
  t.check("nobody drinks to themselves", did?.ok === false && did.why === "none", did);
  did = await call(U.m2, "town_drink_take", U.unver, 10, 12);
  t.check("…nor from somebody who is not of the town", did?.ok === false && did.why === "none", did);
  t.check("so far nothing has changed for either: the drink still held out, the gauges as they were, nothing written", (await purseOf(U.m1)).toast?.to === U.m2 && (await staminaOf(U.m1)) === 40 && (await staminaOf(U.m2)) === 20
    && (await deeds("drink")).length === 0 && (await deeds("drink_gave")).length === 0, {});
  const coins = [(await one(`select coins from public.town_purses where member_id = $1`, [U.m1])).coins, (await one(`select coins from public.town_purses where member_id = $1`, [U.m2])).coins];
  did = await call(U.m2, "town_drink_take", U.m1, 13, 9);
  t.check("from three tiles off the friend drinks: thirty stamina to them, ten to the flask's owner, in one call", did?.ok === true && did.got === 30 && did.back === 10 && did.purse.stamina.left === 50, did);
  mine = await purseOf(U.m1);
  const theirs = await purseOf(U.m2), k = await hours();
  t.check("both purses are kept: the drinker's gauge and who gave it, the giver's gauge and the drink no longer held out", theirs.stamina.left === 50 && theirs.drunk?.k === k && theirs.drunk.by === U.m1 && mine.stamina.left === 50 && !("toast" in mine), { mine: mine.stamina, toast: mine.toast, theirs: theirs.stamina, drunk: theirs.drunk });
  const coinsAfter = [(await one(`select coins from public.town_purses where member_id = $1`, [U.m1])).coins, (await one(`select coins from public.town_purses where member_id = $1`, [U.m2])).coins];
  t.check("stamina only: no coin and no thing has moved", coins[0] === coinsAfter[0] && coins[1] === coinsAfter[1] && JSON.stringify(theirs.bag) === JSON.stringify(before2.bag), { coins, coinsAfter });
  const drank = await deeds("drink"), gave = await deeds("drink_gave");
  t.check("it is written down for both: the drink under the drinker, the giving under the giver", drank.length === 1 && drank[0].member_id === U.m2 && drank[0].n === 30 && drank[0].doc.from === U.m1 && drank[0].coins === 0
    && gave.length === 1 && gave[0].member_id === U.m1 && gave[0].n === 10 && gave[0].doc.to === U.m2 && gave[0].coins === 0, { drank, gave });

  t.section("the flask of living water: once in a meal's hours for whoever drinks");
  await call(U.m1, "town_drink_offer", U.m2, 10, 12);
  did = await call(U.m2, "town_drink_take", U.m1, 10, 12);
  t.check("a second drink in the same hours is refused, from the same giver", did?.ok === false && did.why === "drunk" && (await staminaOf(U.m2)) === 50 && (await staminaOf(U.m1)) === 50, did);
  await give(U.admin, { had: ["thingFlask"] });
  await call(U.admin, "town_drink_offer", U.m2, 10, 12);
  did = await call(U.m2, "town_drink_take", U.admin, 10, 12);
  t.check("…and from another giver: the count is the drinker's", did?.ok === false && did.why === "drunk", did);
  // (the ring: the drinker, given a flask, holds one out to the one who gave; that one has not drunk, and has one drink)
  await give(U.m2, { had: ["thingFlask"] });
  await call(U.m2, "town_drink_offer", U.m1, 10, 12);
  did = await call(U.m1, "town_drink_take", U.m2, 10, 12);
  t.check("a ring of two with a flask each: the other has their one drink of these hours", did?.ok === true && did.got === 30 && did.back === 10 && (await staminaOf(U.m1)) === 80 && (await staminaOf(U.m2)) === 60, did);
  await call(U.m2, "town_drink_offer", U.m1, 10, 12);
  did = await call(U.m1, "town_drink_take", U.m2, 10, 12);
  t.check("…and no more: round the ring a second time nobody has anything", did?.ok === false && did.why === "drunk" && (await staminaOf(U.m1)) === 80 && (await staminaOf(U.m2)) === 60, did);
  // (the next meal's hours: the count kept is of hours gone by)
  await patch(U.m2, { drunk: { k: k - 1, by: U.m1 } });
  await gauge(U.m2, 95);
  await gauge(U.m1, 96);
  await call(U.m1, "town_drink_offer", U.m2, 10, 12);
  did = await call(U.m2, "town_drink_take", U.m1, 10, 12);
  t.check("in the next meal's hours a drink is theirs again; and neither gauge goes above full", did?.ok === true && did.got === 5 && did.back === 4 && (await staminaOf(U.m2)) === 100 && (await staminaOf(U.m1)) === 100, did);

  t.section("the flask of living water: a drink held out too long ago, and put away");
  await gauge(U.admin, 10);
  await patch(U.admin, { drunk: null });
  await call(U.m1, "town_drink_offer", U.admin, 10, 12);
  const held = (await purseOf(U.m1)).toast;
  await patch(U.m1, { toast: { ...held, till: (await now()) - 1 } });
  did = await call(U.admin, "town_drink_take", U.m1, 10, 12);
  t.check("after its twenty seconds a drink is no longer there to be had", did?.ok === false && did.why === "late" && (await staminaOf(U.admin)) === 10, did);
  await call(U.m1, "town_drink_offer", U.admin, 10, 12);
  offers = await deeds("drink_offer");
  did = await call(U.m1, "town_drink_offer", null, 0, 0);
  t.check("a drink is put away: nothing held out, and nothing more written down", did?.ok === true && did.till === null && !("toast" in (await purseOf(U.m1))) && (await deeds("drink_offer")).length === offers.length, did);
  did = await call(U.admin, "town_drink_take", U.m1, 10, 12);
  t.check("…and then there is none to drink", did?.ok === false && did.why === "none", did);
  await frogScenes({ t, U, call, purseOf, deeds, one, give, patch, CODE, now, gauge, staminaOf });
  await moonScenes({ t, U, call, purseOf, deeds, one, give, patch, CODE, now, gauge, staminaOf });
  // every drink of the scenes above gave thirty at the most to one member in one meal's hours, and nothing but stamina
  const all = await deeds("drink");
  t.check("no drink gave more than the flask's thirty", all.length === 3 && all.every((d) => d.n > 0 && d.n <= 30 && d.coins === 0), all);
}
