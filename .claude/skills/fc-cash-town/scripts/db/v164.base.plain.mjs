// (Carried from branch smith-sql, where it was v164.plain.try.mjs: the scenes of what was the "plain" part, which is
// in v164's base now. v164.base.try.mjs plays it after its own.)
// What a forged tool means to what was there already, through the functions a member calls, against the stand-in
// database (try-v164.mjs plays this): the hand, the uncle, the notice board, a stall, the storage box, a deal, the
// ground, the jar at the well. In each: a tool that carries something of its own is refused as a plain thing, or
// moved whole; and a tool as it was bought, a pot of food and things that stack go as they went.
export default async function ({ t, U, call, purseOf, deeds, one, same, CODE, patch }) {
  const bag = (...stacks) => Array.from({ length: Math.max(10, stacks.length) }, (_, i) => stacks[i] ?? null);
  const coinsOf = async (who) => Number((await one(`select coins from public.town_purses where member_id = $1`, [who]))?.coins ?? 0);
  const written = async () => Number((await one(`select count(*)::int as n from public.town_deeds`)).n);
  const FORGED = { item: "pick", n: 1, plus: 7, opts: ["pkPeek", "pkCrumb"], gems: ["dark"] }, BOUGHT = { item: "pick", n: 1 };
  const ROD = { item: "rod", n: 1, plus: 2 }, POT = { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } };
  const BOX = CODE.box.at, BY_BOX = [BOX[0] + 1, BOX[1] + 1];
  for (const who of [U.m1, U.m2]) await call(who, "town_hold", null);

  t.section("the hand: the slot a thing is taken up from is kept with it");
  await patch(U.m1, { coins: 500, hand: null, bag: bag(BOUGHT, { item: "minnow", n: 3 }, FORGED) });
  let did = await call(U.m1, "town_hold", 2), p = await purseOf(U.m1);
  t.check("of two picks, the forged one taken up: the hand is a pick, and the slot says which", did?.ok === true && p.hand === "pick" && p.handAt === 2 && did.purse.handAt === 2 && same(p.bag[2], FORGED), { hand: p.hand, handAt: p.handAt });
  did = await call(U.m1, "town_hold", 0);
  p = await purseOf(U.m1);
  t.check("the other taken up: the slot is the other's", did?.ok === true && p.hand === "pick" && p.handAt === 0, { hand: p.hand, handAt: p.handAt });
  const empty = await call(U.m1, "town_hold", 5), away = await call(U.m1, "town_hold", null);
  p = await purseOf(U.m1);
  t.check("an empty slot takes nothing up; put away, the hand is empty", empty?.why === "none" && away?.ok === true && p.hand === null, { empty, hand: p.hand });
  const held = (await deeds("hold")).filter((d) => d.member_id === U.m1);
  t.check("taking up is written down as it was", held.length === 2 && held.every((d) => d.thing === "pick"), held);

  t.section("the uncle: a tool that carries something of its own is not left to be sold");
  const before = { purse: await purseOf(U.m1), deeds: await written() };
  did = await call(U.m1, "town_leave", 2, 1);
  t.check("the forged pick is refused as unwanted: it stays in its slot, and nothing is written", did?.why === "unwanted" && same(await purseOf(U.m1), before.purse) && (await written()) === before.deeds, did);
  did = await call(U.m1, "town_leave", 0, 1);
  p = await purseOf(U.m1);
  t.check("the pick as it was bought is left with him as ever", did?.ok === true && p.bag[0] === null && p.left.length === 1 && p.left[0].item === "pick" && same(p.bag[2], FORGED), { did: { ...did, purse: undefined }, left: p.left });

  t.section("the notice board and a stall: it is neither counted nor taken as one of its kind");
  await patch(U.m1, { coins: 500, left: [], bag: bag(ROD, { item: "minnow", n: 3 }) });
  let post = await call(U.m1, "town_notice_post", "sell", "rod", 1, 40);
  let shop = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "rod", n: 1, price: 40 }], 30, 30);
  t.check("with only a forged rod in the bag, none can be put up for sale: on the board, or at a stall", post?.why === "none" && shop?.why === "none" && same((await purseOf(U.m1)).bag[0], ROD), { post, shop });
  await patch(U.m1, { bag: bag(ROD, { item: "rod", n: 1 }, { item: "minnow", n: 3 }) });
  const two = await call(U.m1, "town_notice_post", "sell", "rod", 2, 40);
  post = await call(U.m1, "town_notice_post", "sell", "rod", 1, 40);
  p = await purseOf(U.m1);
  t.check("with one as it was bought beside it, one can be: that one leaves the bag, and the forged one stays as it is", two?.why === "none" && post?.ok === true && same(p.bag[0], ROD) && p.bag[1] === null, { two, post: { ...post, purse: undefined, notices: undefined }, bag: p.bag.slice(0, 3) });
  await patch(U.m1, { bag: bag(ROD, { item: "rod", n: 1 }, { item: "minnow", n: 3 }) });
  const twoAtStall = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "rod", n: 2, price: 40 }], 30, 30);
  shop = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "rod", n: 1, price: 40 }], 30, 30);
  await patch(U.m2, { coins: 500, bag: bag() });
  const bought = await call(U.m2, "town_shop_buy", U.m1, "rod", 1, 31, 30);
  p = await purseOf(U.m1);
  const theirs = await purseOf(U.m2);
  t.check("a stall sells the one as it was bought, and the buyer has that one; the forged one never leaves its owner", twoAtStall?.why === "none" && shop?.ok === true && bought?.ok === true && same(p.bag[0], ROD) && p.bag[1] === null
    && same(theirs.bag.filter(Boolean), [{ item: "rod", n: 1 }]), { twoAtStall, shop: shop?.why, bought: bought?.why ?? bought?.ok, mine: p.bag.slice(0, 2), theirs: theirs.bag.slice(0, 2) });
  const again = await call(U.m2, "town_shop_buy", U.m1, "rod", 1, 31, 30);
  t.check("…and with only the forged one left, the stall has none to sell", again?.ok !== true && same((await purseOf(U.m1)).bag[0], ROD), again);
  await call(U.m1, "town_shop_close");

  t.section("the storage box: carried whole, in a slot of its own");
  await t.sql(`delete from public.town_boxes where member_id = $1`, [U.m1]);
  await patch(U.m1, { bag: bag(BOUGHT, FORGED, POT, { item: "minnow", n: 5 }) });
  const plainIn = await call(U.m1, "town_box_put", 0, 1, BY_BOX[0], BY_BOX[1]), forgedIn = await call(U.m1, "town_box_put", 1, 1, BY_BOX[0], BY_BOX[1]), potIn = await call(U.m1, "town_box_put", 2, 1, BY_BOX[0], BY_BOX[1]), fishIn = await call(U.m1, "town_box_put", 3, 2, BY_BOX[0], BY_BOX[1]);
  let box = (await call(U.m1, "town_box")).box;
  t.check("put away beside a pick as it was bought, the forged one has a slot of its own and everything it carries", plainIn?.ok === true && forgedIn?.ok === true && same(box.things.slice(0, 2), [BOUGHT, FORGED]), box.things.slice(0, 4));
  t.check("…and a pot of food and things that stack go as they went", potIn?.ok === true && fishIn?.ok === true && same(box.things.slice(2, 4), [POT, { item: "minnow", n: 2 }]) && same((await purseOf(U.m1)).bag[3], { item: "minnow", n: 3 }), box.things.slice(0, 4));
  await patch(U.m1, { bag: bag(...Array.from({ length: 9 }, () => ({ item: "boot", n: 1 })), BOUGHT) });
  const noSlot = await call(U.m1, "town_box_take", 1, 1, BY_BOX[0], BY_BOX[1]);
  t.check("taken out into a bag with a pick but no free slot, it does not fit: it is never laid onto another of its kind", noSlot?.why === "full" && same((await call(U.m1, "town_box")).box.things[1], FORGED), noSlot);
  await patch(U.m1, { bag: bag(BOUGHT, null, { item: "boot", n: 1 }) });
  const out = await call(U.m1, "town_box_take", 1, 1, BY_BOX[0], BY_BOX[1]);
  p = await purseOf(U.m1);
  box = (await call(U.m1, "town_box")).box;
  t.check("with a free slot it is back in the bag as it was, and gone from the box", out?.ok === true && same(p.bag.slice(0, 3), [BOUGHT, FORGED, { item: "boot", n: 1 }]) && box.things[1] === null, { bag: p.bag.slice(0, 3), box: box.things.slice(0, 3) });

  t.section("a deal between two members: the tool crosses whole");
  await call(U.m1, "town_deal_cancel"); await call(U.m2, "town_deal_cancel");
  await patch(U.m1, { coins: 100, bag: bag(FORGED, { item: "minnow", n: 5 }) });
  await patch(U.m2, { coins: 100, bag: bag(BOUGHT, { item: "timber", n: 9 }) });
  const opened = await call(U.m1, "town_deal_open", U.m2), laid = await call(U.m1, "town_deal_lay", [["pick", 1]], 0), theirLay = await call(U.m2, "town_deal_lay", [["timber", 4]], 30);
  const word1 = await call(U.m1, "town_deal_agree", true), word2 = await call(U.m2, "town_deal_agree", true);
  p = await purseOf(U.m1);
  const q = await purseOf(U.m2);
  t.check("laid out and agreed: the forged pick is in the other's bag, in a slot of its own beside their own pick, with everything it carries", opened?.ok === true && laid?.ok === true && theirLay?.ok === true && word1?.ok === true && word2?.ok === true
    && same(q.bag.filter((s) => s?.item === "pick"), [BOUGHT, FORGED]) && !p.bag.some((s) => s?.item === "pick") && p.bag.some((s) => s?.item === "timber" && s.n === 4) && (await coinsOf(U.m1)) === 130 && (await coinsOf(U.m2)) === 70,
    { opened: opened?.why, laid: laid?.why, word2: { ...word2, purse: undefined }, mine: p.bag.slice(0, 3), theirs: q.bag.slice(0, 4) });
  // (and back, into a bag with no free slot: the deal is not done, and nothing moves)
  await patch(U.m1, { bag: bag(...Array.from({ length: 9 }, () => ({ item: "boot", n: 1 })), BOUGHT) });
  await call(U.m2, "town_deal_open", U.m1);
  const back = await call(U.m2, "town_deal_lay", [["pick", 2]], 0);
  await call(U.m1, "town_deal_agree", true);
  const refused = await call(U.m2, "town_deal_agree", true);
  t.check("sent back to a bag with a pick but no free slot, the deal is not done and nothing has moved", back?.ok === true && refused?.ok !== true && same((await purseOf(U.m2)).bag.filter((s) => s?.item === "pick"), [BOUGHT, FORGED]), refused);
  await call(U.m1, "town_deal_cancel"); await call(U.m2, "town_deal_cancel");

  t.section("the ground: dropped and picked up whole");
  await patch(U.m2, { bag: bag(BOUGHT, FORGED) });
  await patch(U.m1, { bag: bag(BOUGHT) });
  const dropped = await call(U.m2, "town_ground_drop", 1, 20, 20);
  const lying = (dropped?.ground ?? []).find((d) => d.stack?.item === "pick");
  const picked = lying ? await call(U.m1, "town_ground_take", lying.id, 20, 21) : null;
  p = await purseOf(U.m1);
  t.check("it lies there as it is, and whoever picks it up has it whole, beside their own", dropped?.ok === true && same(lying?.stack, FORGED) && picked?.ok === true && same(p.bag.slice(0, 2), [BOUGHT, FORGED]) && (await purseOf(U.m2)).bag[1] === null,
    { dropped: dropped?.why, lying, picked: picked?.why, bag: p.bag.slice(0, 3) });

  t.section("the jar at the well");
  await patch(U.m1, { bag: bag(FORGED, { item: "minnow", n: 3 }) });
  const inJar = await call(U.m1, "town_jar_drop", 0, 1), fish = await call(U.m1, "town_jar_drop", 1, 1);
  t.check("a tool is not dropped in, forged or not; a fish is, as ever", inJar?.why === "unwanted" && fish?.ok === true && same((await purseOf(U.m1)).bag[0], FORGED), { inJar, fish: fish?.why ?? fish?.ok });
}
