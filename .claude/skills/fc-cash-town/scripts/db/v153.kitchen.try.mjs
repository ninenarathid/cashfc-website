// The kitchen's gifts through the functions a member calls, against the stand-in database (try-line.mjs plays this):
// each deed done, refused for each reason, what is kept in the purse, what is written down, what is counted, and
// somebody without the gift as before.
export default async function ({ t, U, call, purseOf, deeds, one, same, give, patch }) {
  const bag = (...stacks) => Array.from({ length: 10 }, (_, i) => stacks[i] ?? null);
  const held = (p, item) => (p?.bag ?? []).reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
  const inBasket = (p) => (p?.basket ?? []).reduce((n, e) => n + e[1], 0);
  // (a purse of each member's own, whole, before anything of it is written over)
  for (const who of [U.m1, U.m2]) await call(who, "town_hold", null);
  const day = (await one(`select town.day_of(town.now_ms()) as d`)).d, meal = (await one(`select town.meal_of(town.now_ms()) as m`)).m;

  t.section("the dimension basket (rank 2)");
  await patch(U.m1, { bag: bag({ item: "tomYum", n: 5 }, { item: "friedMinnow", n: 4 }, { item: "minnow", n: 3 }, { item: "oddDish", n: 5 }, { item: "bowl", n: 1 }), basket: null, eating: null, meals: { day, eaten: [false, false, false], bowls: [0, 0, 0] } });
  let did = await call(U.m1, "town_basket_put", 0, 1);
  t.check("without the gift nothing goes into a basket, and the purse is as it was", did?.ok === false && did.why === "none" && held(await purseOf(U.m1), "tomYum") === 5 && (await deeds("basket_put")).length === 0, did);
  await give(U.m1, { had: ["thingBasket"] });
  did = await call(U.m1, "town_basket_put", 0, 5);
  let p = await purseOf(U.m1);
  t.check("with it, five helpings leave their slot of the bag for the basket", did?.ok === true && did.dish === "tomYum" && did.n === 5 && same(p.basket, [["tomYum", 5]]) && p.bag[0] === null && same(did.purse.basket, p.basket), { did: { ...did, purse: undefined }, basket: p.basket });
  did = await call(U.m1, "town_basket_put", 1, 4);
  const odd = await call(U.m1, "town_basket_put", 3, 3);
  p = await purseOf(U.m1);
  t.check("any dishes together, a part of a stack too: twelve in all", did?.ok === true && odd?.ok === true && same(p.basket, [["tomYum", 5], ["friedMinnow", 4], ["oddDish", 3]]) && same(p.bag[3], { item: "oddDish", n: 2 }) && inBasket(p) === 12, p.basket);
  did = await call(U.m1, "town_basket_put", 3, 1);
  t.check("the thirteenth is refused, and stays in the bag", did?.ok === false && did.why === "full" && held(await purseOf(U.m1), "oddDish") === 2, did);
  const fish = await call(U.m1, "town_basket_put", 2, 1), hole = await call(U.m1, "town_basket_put", 0, 1), none = await call(U.m1, "town_basket_put", 3, 0), many = await call(U.m1, "town_basket_put", 3, 9);
  t.check("food only: a fish is refused, and so are an empty slot, no helping and more than the slot has", fish?.why === "none" && hole?.why === "none" && none?.why === "amount" && many?.why === "amount", { fish, hole, none, many });
  let written = await deeds("basket_put");
  t.check("each helping put in is written down: whose, which dish, how many, and what the basket then held",
    written.length === 3 && written.every((d) => d.member_id === U.m1) && same(written.map((d) => [d.thing, d.n]), [["tomYum", 5], ["friedMinnow", 4], ["oddDish", 3]]) && same(written[2].doc.in, [["tomYum", 5], ["friedMinnow", 4], ["oddDish", 3]]) && written.every((d) => d.coins === 0), written);

  did = await call(U.m1, "town_basket_take", "friedMinnow", 4);
  p = await purseOf(U.m1);
  t.check("taken back out, a dish's helpings are in the bag again and its place in the basket is gone", did?.ok === true && did.n === 4 && same(p.basket, [["tomYum", 5], ["oddDish", 3]]) && held(p, "friedMinnow") === 4, { did: { ...did, purse: undefined }, basket: p.basket });
  const notIn = await call(U.m1, "town_basket_take", "shabu", 1), tooMany = await call(U.m1, "town_basket_take", "tomYum", 6), nought = await call(U.m1, "town_basket_take", "tomYum", 0);
  await patch(U.m1, { bag: bag(...Array.from({ length: 10 }, () => ({ item: "boot", n: 1 }))) });
  const noRoom = await call(U.m1, "town_basket_take", "tomYum", 1);
  t.check("refused: a dish that is not in it, more than it holds, none, and a bag with no room (nothing leaves the basket)", notIn?.why === "none" && tooMany?.why === "amount" && nought?.why === "amount" && noRoom?.why === "full" && inBasket(await purseOf(U.m1)) === 8, { notIn, tooMany, nought, noRoom });
  written = await deeds("basket_take");
  t.check("what is taken out is written down", written.length === 1 && written[0].thing === "friedMinnow" && written[0].n === 4 && same(written[0].doc.in, [["tomYum", 5], ["oddDish", 3]]), written);

  await patch(U.m1, { bag: bag({ item: "tomYum", n: 1 }) });
  const stood = await call(U.m1, "town_basket_eat", "tomYum", false), absent = await call(U.m1, "town_basket_eat", "shabu", true);
  t.check("eating from it: refused standing, and of a dish that is not in it", stood?.why === "stand" && absent?.why === "none", { stood, absent });
  const eats = (await deeds("eat")).length;
  did = await call(U.m1, "town_basket_eat", "tomYum", true);
  p = await purseOf(U.m1);
  t.check("sitting, a helping out of the basket is begun: one of this meal's hours' helpings, the bag untouched", did?.ok === true && did.dish === "tomYum" && p.eating?.dish === "tomYum" && p.eating.meal === meal && p.meals.bowls[meal] === 1
    && same(p.basket, [["tomYum", 4], ["oddDish", 3]]) && held(p, "tomYum") === 1, { did: { ...did, purse: undefined }, eating: p.eating, meals: p.meals, basket: p.basket });
  written = await deeds("eat");
  t.check("…written down as a meal begun, out of the basket", written.length === eats + 1 && written.at(-1).thing === "tomYum" && written.at(-1).doc.from === "basket", written.at(-1));
  const second = await call(U.m1, "town_basket_eat", "tomYum", true), fromBag = await call(U.m1, "town_sit", 0, true);
  t.check("one meal at a time, from the basket or the bag", second?.why === "meal" && fromBag?.why === "meal", { second, fromBag });
  // the meal over (its time put back six minutes), the bowl back and the buff left, as a helping out of the bag
  await patch(U.m1, { eating: { ...p.eating, from: p.eating.from - 6 * 60000, till: p.eating.till - 6 * 60000 } });
  const chewed = await call(U.m1, "town_chew", 0);
  p = await purseOf(U.m1);
  t.check("eaten up, it gives its bowl back and leaves its buff", chewed?.done === true && p.eating === null && held(p, "bowl") === 1 && same(p.buffs.map((b) => [b.id, b.level]), [["hearty", 1]]), { chewed: { ...chewed, purse: undefined }, buffs: p.buffs, bag: p.bag });
  await patch(U.m1, { meals: { day, eaten: [true, true, true], bowls: [3, 3, 3] } });
  did = await call(U.m1, "town_basket_eat", "tomYum", true);
  t.check("a meal's hours that have had their three take no fourth from the basket", did?.why === "meal" && inBasket(await purseOf(U.m1)) === 7, did);

  // somebody else: their own basket, and nothing of mine
  await patch(U.m2, { bag: bag({ item: "tomYum", n: 2 }), basket: null });
  did = await call(U.m2, "town_basket_take", "tomYum", 1);
  const theirs = await call(U.m2, "town_sit", 0, false);
  t.check("another member has no basket of mine to take from; and eating from the bag is as it was", did?.why === "none" && theirs?.why === "stand" && inBasket(await purseOf(U.m1)) === 7, { did, theirs });

  t.section("the whispering spoon (rank 3)");
  const things = bag({ item: "snakehead", n: 1 }, { item: "tomato", n: 2 }, { item: "minnow", n: 4 }, { item: "pot", n: 1 });
  await patch(U.m2, { bag: things, whispers: null, made: [] });
  await give(U.m2, { had: [] });
  did = await call(U.m2, "town_spoon", [["snakehead", 1]]);
  t.check("without the gift the spoon says nothing", did?.why === "none" && (await purseOf(U.m2)).whispers == null, did);
  await give(U.m2, { had: ["thingSpoon"] });
  did = await call(U.m2, "town_spoon", [["snakehead", 1], ["tomato", 2]]);
  p = await purseOf(U.m2);
  t.check("asked of what is in the pot, it tells the secret thing of the recipe the pot is on the way to", did?.ok === true && did.of === "tomYum" && did.secret === "scallion" && did.ways === 1 && did.left === 2, { ...did, purse: undefined });
  t.check("…kept in the purse as told, counted once, and nothing leaves the bag", same(p.whispers, ["tomYum"]) && p.gifts.used.thingSpoon.n === 1 && same(p.bag, things), { whispers: p.whispers, used: p.gifts.used, bag: p.bag });
  const known = await call(U.m2, "town_spoon", [["snakehead", 1], ["tomato", 2]]), astray = await call(U.m2, "town_spoon", [["snakehead", 1], ["minnow", 1]]);
  const notMine = await call(U.m2, "town_spoon", [["snakehead", 2]]), empty = await call(U.m2, "town_spoon", []), tool = await call(U.m2, "town_spoon", [["pot", 1]]);
  const shape = await call(U.m2, "town_spoon", [["snakehead", "1"]]), word = await call(U.m2, "town_spoon", JSON.stringify("snakehead"));
  t.check("silent, and not counted: a pot read whole already, one no recipe has, things the bag has not, nothing, cookware, and what is no list of things",
    known?.why === "known" && astray?.why === "astray" && notMine?.why === "none" && empty?.why === "amount" && tool?.why === "none" && shape?.why === "none" && word?.why === "none"
    && (await purseOf(U.m2)).gifts.used.thingSpoon.n === 1, [known, astray, notMine, empty, tool, shape, word].map((d) => d?.why ?? d));
  const two = await call(U.m2, "town_spoon", [["minnow", 3]]), three = await call(U.m2, "town_spoon", [["minnow", 3]]), four = await call(U.m2, "town_spoon", [["tomato", 1]]);
  t.check("a pot that could still be two recipes: the nearest done first (saying there are two), then the other; and a fourth time today is refused",
    two?.of === "friedMinnow" && two.ways === 2 && two.secret === "salt" && three?.of === "fishSauce" && three.ways === 1 && three.left === 0 && four?.why === "spent"
    && same((await purseOf(U.m2)).whispers, ["tomYum", "friedMinnow", "fishSauce"]), { two: { ...two, purse: undefined }, three: { ...three, purse: undefined }, four });
  written = (await deeds("gift_use")).filter((d) => d.thing === "thingSpoon");
  t.check("each telling is written down for its member alone: which recipe, how many ways, how many left", written.length === 3 && written.every((d) => d.member_id === U.m2 && d.coins === 0)
    && same(written.map((d) => [d.doc.of, d.doc.ways, d.doc.left]), [["tomYum", 1, 2], ["friedMinnow", 2, 1], ["fishSauce", 1, 0]]), written);
  await patch(U.m2, { made: ["tomYum", "friedMinnow"], whispers: null, gifts: { ...(await purseOf(U.m2)).gifts, used: {} } });
  did = await call(U.m2, "town_spoon", [["minnow", 3]]);
  t.check("a recipe its owner has made is not what it answers for", did?.of === "fishSauce" && did.ways === 1, { ...did, purse: undefined });
  t.check("the other member's purse knows nothing of it", (await purseOf(U.m1)).whispers == null);

  t.section("the hearth sprite (rank 4)");
  const TOMYUM = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["scallion", 1]];
  const larder = () => [{ item: "snakehead", n: 6 }, { item: "tomato", n: 12 }, { item: "chili", n: 12 }, { item: "scallion", n: 6 }, { item: "pot", n: 1 }, { item: "minnow", n: 3 }, { item: "salt", n: 1 }, ...Array.from({ length: 7 }, () => null)];
  const BY_HAND = { hits: 6, misses: 1, secs: 9, need: 6 }, BY_SPRITE = { hits: 0, misses: 0, secs: 0, need: 0, sprite: true };
  const points = async (who) => Number((await one(`select coalesce((town.work_told($1, town.now_ms())->'kitchen'->>'points')::numeric, 0) as p`, [who])).p);
  const lastPlay = async (who) => one(`select game, won, doc from public.town_plays where member_id = $1 order by id desc limit 1`, [who]);
  const plays = async (who) => Number((await one(`select count(*)::int as n from public.town_plays where member_id = $1`, [who])).n);
  const potsOf = (q) => q.bag.filter((s) => s?.item === "potFull").map((s) => s.of.left);
  await patch(U.m1, { bag: larder(), hand: "pot", made: ["tomYum"], recipes: ["tomYum"], stamina: { day, left: 100 }, basket: null, eating: null, buffs: [], buff: null });
  await give(U.m1, { had: [] });
  let before = await points(U.m1);
  did = await call(U.m1, "town_cook", TOMYUM, "{}", BY_HAND);
  p = await purseOf(U.m1);
  const byHand = (await points(U.m1)) - before;
  t.check("without it, a pot is cooked by hand as ever: a miss is a helping, and nothing says a sprite", did?.ok === true && did.made === "tomYum" && did.n === 3 && did.sprite === undefined && same(potsOf(p), [3]) && (await lastPlay(U.m1)).doc.sprite === undefined, { ...did, purse: undefined });
  const n0 = await plays(U.m1);
  did = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE);
  t.check("asked for a sprite it has not, nothing is cooked and nothing lost", did?.why === "none" && same((await purseOf(U.m1)).bag, p.bag) && (await plays(U.m1)) === n0, did);
  await give(U.m1, { had: ["famSprite"], familiar: null });
  did = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE);
  t.check("had and resting, the same", did?.why === "none", did);
  await give(U.m1, { had: ["famSprite"], familiar: "famSprite" });
  before = await points(U.m1);
  const stamina = (await purseOf(U.m1)).stamina.left;
  did = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE);
  p = await purseOf(U.m1);
  t.check("following its member, it cooks a recipe they have made with no game: the full four helpings and one more", did?.ok === true && did.made === "tomYum" && did.n === 5 && did.sprite === true && same(potsOf(p).sort(), [3, 5]), { ...did, purse: undefined });
  t.check("…the things leave the bag, the stamina is paid, and one of these hours' three pots is counted", p.bag[0].n === 4 && p.stamina.left === stamina - 4 && p.gifts.used.famSprite.n === 1, { bag: p.bag, stamina: p.stamina, used: p.gifts.used });
  let play = await lastPlay(U.m1);
  t.check("the pot is written down as a go at the game won, saying the sprite cooked it", (await plays(U.m1)) === n0 + 1 && play.game === "cooking" && play.won === true && play.doc.what === "tomYum" && play.doc.sprite === true, play);
  t.check("and the kitchen's line counts it as it counts a pot cooked by hand (the recipe's four; the first of its kind was the hand's)", (await points(U.m1)) - before === 4 && byHand === 14, { byHand, bySprite: (await points(U.m1)) - before });
  written = (await deeds("gift_use")).filter((d) => d.thing === "famSprite");
  t.check("the sprite's work is written down: what it made, how many, how many pots are left", written.length === 1 && written[0].member_id === U.m1 && written[0].doc.made === "tomYum" && written[0].doc.n === 5 && written[0].doc.left === 2 && written[0].coins === 0, written);
  const guess = await call(U.m1, "town_cook", [["minnow", 3], ["salt", 1]], "{}", BY_SPRITE), odd2 = await call(U.m1, "town_cook", [["minnow", 2]], "{}", BY_SPRITE);
  await patch(U.m1, { hand: null });
  const bare = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE);
  await patch(U.m1, { hand: "pot" });
  let q = await purseOf(U.m1);
  t.check("refused, with nothing lost and nothing counted: a recipe never made, things that are none, and the recipe's cookware not in the hand",
    guess?.why === "unmade" && odd2?.why === "unmade" && bare?.why === "tool" && q.bag[5].n === 3 && q.bag[0].n === 4 && q.gifts.used.famSprite.n === 1 && (await plays(U.m1)) === n0 + 1, [guess, odd2, bare].map((d) => d?.why ?? d));
  const pot2 = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE), pot3 = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE), pot4 = await call(U.m1, "town_cook", TOMYUM, "{}", BY_SPRITE);
  q = await purseOf(U.m1);
  t.check("three pots to a meal's hours: the fourth is refused, with its things still in the bag", pot2?.n === 5 && pot3?.n === 5 && pot4?.why === "spent" && q.bag[0].n === 2 && same(potsOf(q).sort(), [3, 5, 5, 5]), { pot2: pot2?.n, pot3: pot3?.n, pot4: pot4?.why, pots: potsOf(q) });
  did = await call(U.m1, "town_cook", TOMYUM, "{}", { hits: 6, misses: 0, secs: 8, need: 6 });
  t.check("…and cooked by hand all the same", did?.ok === true && did.n === 4 && did.sprite === undefined, { ...did, purse: undefined });
  await patch(U.m2, { bag: larder(), hand: "pot", made: ["tomYum"], stamina: { day, left: 100 } });
  did = await call(U.m2, "town_cook", TOMYUM, "{}", BY_SPRITE);
  t.check("another member's sprite is no sprite of mine", did?.why === "none" && (await purseOf(U.m2)).bag[0].n === 6, did);

  t.section("the stardust spice (rank 5)");
  const fresh = { eating: null, buffs: [], buff: null, spiced: null, meals: { day, eaten: [false, false, false], bowls: [0, 0, 0] } };
  /** The meal at hand put back six minutes, and its sprinkling with it (a sprinkling is of its meal, by the moment that meal began), then counted on: it is over. */
  const finish = async (who) => {
    const q = await purseOf(who), back = 6 * 60000;
    await patch(who, { eating: { ...q.eating, from: q.eating.from - back, till: q.eating.till - back }, ...(q.spiced ? { spiced: { ...q.spiced, from: q.spiced.from - back } } : {}) });
    return call(who, "town_chew", 0);
  };
  const levels = (q) => (q.buffs ?? []).map((b) => [b.id, b.level]);
  await patch(U.m2, { ...fresh, bag: bag({ item: "tomYum", n: 4 }, { item: "grilledCorn", n: 1 }, { item: "minnow", n: 1 }), basket: [["friedMinnow", 2]] });
  await give(U.m2, { had: ["thingBasket"] });
  did = await call(U.m2, "town_spice_eat", 0, null, true);
  t.check("without the gift no bowl is sprinkled, and no meal is begun for the asking", did?.why === "none" && (await purseOf(U.m2)).eating === null && (await purseOf(U.m2)).bag[0].n === 4, did);
  await give(U.m2, { had: ["thingBasket", "thingSpice"] });
  const standing = await call(U.m2, "town_spice_eat", 0, null, false), corn = await call(U.m2, "town_spice_eat", 1, null, true), fishy = await call(U.m2, "town_spice_eat", 2, null, true), gone = await call(U.m2, "town_spice_eat", null, "shabu", true);
  p = await purseOf(U.m2);
  t.check("refused, with nothing begun and nothing counted: standing, a dish that leaves no buff, what is no dish, a dish the basket has not",
    standing?.why === "stand" && corn?.why === "none" && fishy?.why === "none" && gone?.why === "none" && p.eating === null && !p.gifts.used?.thingSpice && p.bag[1].n === 1, [standing, corn, fishy, gone].map((d) => d?.why ?? d));
  const eatsBefore = (await deeds("eat")).length;
  did = await call(U.m2, "town_spice_eat", 0, null, true);
  p = await purseOf(U.m2);
  t.check("sprinkled on a bowl out of the bag: the meal is begun as ever, the sprinkling is of that meal, and the day's one is counted",
    did?.ok === true && did.dish === "tomYum" && p.eating?.dish === "tomYum" && p.spiced?.from === p.eating.from && p.spiced.level === 4 && p.gifts.used.thingSpice.n === 1 && p.bag[0].n === 3 && p.meals.bowls[meal] === 1, { ...did, purse: undefined, spiced: p.spiced, eating: p.eating });
  written = await deeds("eat");
  const usedSpice = (await deeds("gift_use")).filter((d) => d.thing === "thingSpice");
  t.check("…written down: a meal begun out of the bag with the spice on it, and the gift used", written.length === eatsBefore + 1 && written.at(-1).thing === "tomYum" && written.at(-1).doc.spice === true && written.at(-1).doc.from === "bag"
    && usedSpice.length === 1 && usedSpice[0].member_id === U.m2 && usedSpice[0].doc.dish === "tomYum" && usedSpice[0].doc.left === 0, { eat: written.at(-1), usedSpice });
  let chewedUp = await finish(U.m2);
  p = await purseOf(U.m2);
  t.check("eaten up, its buff is at the fourth level at once, for a new buff's three hours", chewedUp?.done === true && same(levels(p), [["hearty", 4]]) && p.buffs[0].until - (await one(`select town.now_ms() as n`)).n > 2.9 * 3600000, { buffs: p.buffs });
  did = await call(U.m2, "town_spice_eat", 0, null, true);
  t.check("a second sprinkling today is refused, and begins no meal", did?.why === "spent" && (await purseOf(U.m2)).eating === null && (await purseOf(U.m2)).bag[0].n === 3, did);
  // out of the basket, on another day's count; a buff had at the first level goes to the fourth with its hours as they run
  await patch(U.m2, { ...fresh, buffs: [{ id: "keen", level: 1, until: (await one(`select town.now_ms() as n`)).n + 40 * 60000 }] });
  await give(U.m2, { had: ["thingBasket", "thingSpice"] });
  const keenUntil = (await purseOf(U.m2)).buffs[0].until;
  did = await call(U.m2, "town_spice_eat", null, "friedMinnow", true);
  p = await purseOf(U.m2);
  t.check("sprinkled on a bowl out of the basket the same", did?.ok === true && did.dish === "friedMinnow" && same(p.basket, [["friedMinnow", 1]]) && p.spiced.level === 4 && (await deeds("eat")).at(-1).doc.from === "basket" && (await deeds("eat")).at(-1).doc.spice === true, { ...did, purse: undefined });
  await finish(U.m2);
  p = await purseOf(U.m2);
  t.check("…and a buff one has goes to the fourth level with its hours as they ran", same(levels(p), [["keen", 4]]) && p.buffs[0].until === keenUntil, p.buffs);
  // a bowl left before it is eaten: the buff is forfeit as ever, and the sprinkling with it; the next bowl is plain
  await patch(U.m2, { ...fresh });
  await give(U.m2, { had: ["thingBasket", "thingSpice"] });
  await call(U.m2, "town_spice_eat", 0, null, true);
  await call(U.m2, "town_get_up", 0);
  p = await purseOf(U.m2);
  const plain = await call(U.m2, "town_sit", 0, true);
  await finish(U.m2);
  const after = await purseOf(U.m2);
  t.check("a bowl left before it is eaten up forfeits its buff and the sprinkling; the next bowl, eaten plain, leaves the first level", p.eating === null && same(levels(p), []) && p.gifts.used.thingSpice.n === 1 && plain?.ok === true && same(levels(after), [["hearty", 1]]), { left: levels(p), after: levels(after) });
  // somebody without the spice eats as ever
  await patch(U.m1, { ...fresh, bag: bag({ item: "tomYum", n: 1 }) });
  await call(U.m1, "town_sit", 0, true);
  await finish(U.m1);
  t.check("a meal of somebody without the spice leaves what it always left", same(levels(await purseOf(U.m1)), [["hearty", 1]]), (await purseOf(U.m1)).buffs);

  t.section("the phoenix flame in a bottle (rank 6)");
  const WRONG = [["snakehead", 1], ["tomato", 2], ["chili", 2], ["hyacinth", 1]];
  const shelf = () => [{ item: "snakehead", n: 3 }, { item: "tomato", n: 6 }, { item: "chili", n: 6 }, { item: "scallion", n: 1 }, { item: "hyacinth", n: 6 }, { item: "pot", n: 1 }, ...Array.from({ length: 8 }, () => null)];
  const GUARDED = { hits: 6, misses: 0, secs: 9, need: 6, flame: true }, PLAIN = { hits: 6, misses: 0, secs: 9, need: 6 };
  const start = { ...fresh, bag: shelf(), hand: "pot", made: [], tries: {}, stamina: { day, left: 100 } };
  await patch(U.m1, start);
  await give(U.m1, { had: [] });
  did = await call(U.m1, "town_cook", WRONG, "{}", GUARDED);
  p = await purseOf(U.m1);
  t.check("without the flame, asking for it changes nothing: an odd dish, and the things are gone", did?.ok === true && did.made === "oddDish" && did.back === undefined && p.bag[0].n === 2 && p.bag[4].n === 5, { ...did, purse: undefined });
  await patch(U.m1, start);
  await give(U.m1, { had: ["thingFlame"] });
  did = await call(U.m1, "town_cook", WRONG, "{}", PLAIN);
  t.check("with it but not set to guard the pot, an odd dish as ever, and none of the day's three used", did?.made === "oddDish" && did.back === undefined && !(await purseOf(U.m1)).gifts.used?.thingFlame, { ...did, purse: undefined });
  await patch(U.m1, start);
  const n1 = await plays(U.m1);
  did = await call(U.m1, "town_cook", WRONG, "{}", GUARDED);
  p = await purseOf(U.m1);
  t.check("set to guard the pot: things that are no recipe's come to nothing, and every one of them is back in the bag", did?.ok === true && did.made === null && did.n === 0 && did.back === true && same(p.bag, shelf()), { ...did, purse: undefined, bag: p.bag });
  t.check("…the guess is still a guess: its taste is told, its stamina paid, the miss by the recipe's last thing counted; one of the day's three is used",
    did.taste === "swap" && p.stamina.left === 96 && p.tries?.tomYum === 1 && p.gifts.used.thingFlame.n === 1, { taste: did.taste, stamina: p.stamina, tries: p.tries, used: p.gifts.used });
  play = await lastPlay(U.m1);
  t.check("the go is written down as one that came to nothing, saying the flame gave it back", (await plays(U.m1)) === n1 + 1 && play.game === "cooking" && play.won === false && play.doc.what === "nothing" && play.doc.back === true, play);
  written = (await deeds("gift_use")).filter((d) => d.thing === "thingFlame");
  t.check("and the giving back is written down: the things, the taste, how many are left today", written.length === 1 && written[0].member_id === U.m1 && same(written[0].doc.things, [["chili", 2], ["hyacinth", 1], ["snakehead", 1], ["tomato", 2]]) && written[0].doc.taste === "swap" && written[0].doc.left === 2 && written[0].coins === 0, written);
  did = await call(U.m1, "town_cook", TOMYUM, "{}", GUARDED);
  t.check("a real recipe is cooked as ever under the guard, and costs none of the three", did?.made === "tomYum" && did.n === 4 && did.back === undefined && (await purseOf(U.m1)).gifts.used.thingFlame.n === 1, { ...did, purse: undefined });
  // bare hands: what would have been lost is back too (and no compost is left for it)
  await patch(U.m1, { ...start, gifts: (await purseOf(U.m1)).gifts, hand: null });
  did = await call(U.m1, "town_cook", [["hyacinth", 2]], "{}", GUARDED);
  p = await purseOf(U.m1);
  t.check("put together by hand, what would have been lost is back too", did?.back === true && did.made === null && same(p.bag, shelf()) && p.gifts.used.thingFlame.n === 2, { ...did, purse: undefined, bag: p.bag });
  await patch(U.m1, { hand: "pot" });
  const third2 = await call(U.m1, "town_cook", [["hyacinth", 2]], "{}", GUARDED), fourth2 = await call(U.m1, "town_cook", [["hyacinth", 2]], "{}", GUARDED);
  p = await purseOf(U.m1);
  t.check("three times a day: the fourth guess is an odd dish as ever, its things gone", third2?.back === true && fourth2?.ok === true && fourth2.made === "oddDish" && fourth2.back === undefined && p.bag[4].n === 4 && p.gifts.used.thingFlame.n === 3
    && (await deeds("gift_use")).filter((d) => d.thing === "thingFlame").length === 3, { third2: { ...third2, purse: undefined }, fourth2: { ...fourth2, purse: undefined } });
  await patch(U.m2, { ...start });
  await give(U.m2, { had: ["thingSpice"] });
  did = await call(U.m2, "town_cook", WRONG, "{}", GUARDED);
  t.check("somebody without the flame cooks as before", did?.made === "oddDish" && did.back === undefined && (await purseOf(U.m2)).bag[0].n === 2, { ...did, purse: undefined });
}
