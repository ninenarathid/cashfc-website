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
}
