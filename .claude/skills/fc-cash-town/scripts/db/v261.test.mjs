// v261, a dish as good as what went into it, dry-run: the file runs twice (its guards against the chain through v260);
// what carries a grade, the grade of what was used, cooking (dishes, makes, the odd dish, bare hands, a big pot's
// batches), the preparation board, the pot's marks, a pot set down, taken up and eaten from at the table, bowls ladled
// and served, sitting down, the basket (put, take, eat, and what a purse keeps made sound) and eating (stamina and the
// buff's level) are the code's (lib/town/quality, trade, cooking, preparation, stamina) for random mixed grades; no
// function writes with no WHERE; the new helpers are no browser's to call.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v261.test.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const cooking = await import("@/lib/town/cooking");
const stamina = await import("@/lib/town/stamina");
const { prepare, PREPARATION } = await import("@/lib/town/preparation");
const { ITEMS, DISHES, MAKES } = await import("@/lib/town/items");
const { FOOD_PREPS } = await import("@/lib/town/quality");

const MIN = 60_000, NOW = Date.parse("2026-10-16T12:10:00+07:00");
let checks = 0, s = 261;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const G = () => pick([0, 0, 1, 2, 3]);
/** A bag of twenty slots with these things at random grades (those that carry one), split over a stack or two, and some room. */
function bagWith(things, { extra = [], free = 6 } = {}) {
  let bag = Array(20).fill(null);
  for (const [id, n] of [...things, ...extra]) {
    let left = n;
    while (left > 0) { const k = Math.max(1, Math.min(left, 1 + int(left))), g = trade.carriesGrade(id) ? G() : 0; if (trade.roomFor(bag, id, g) < k) break; bag = trade.put(bag, id, k, g); left -= k; }
  }
  // (the bag's empty slots: so many left free, the rest filled with salt, which nothing here takes)
  const empty = bag.map((x, i) => (x ? -1 : i)).filter((i) => i >= 0);
  for (const i of empty.slice(free)) bag[i] = { item: "log", n: 1 };
  return bag;
}
const purseOf = (bag, more = {}) => ({ ...trade.newPurse(), bag, stamina: { day: stamina.dayOf(NOW), left: 40 }, ...more });

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const J = (x) => JSON.stringify(x);
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v255_important_town_announcements", "v258_finite_profession_rewards", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v261_a_dish_as_good_as_what_went_in.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  checks++;

  // ── what carries a grade: every thing the catalog has, as the code says ──
  const said = (await one("select jsonb_object_agg(k, town.carries_grade(k)) v from jsonb_object_keys(town.cat('items')) k")).v;
  const ids = Object.keys(said);
  assert.ok(ids.length > 500, `the catalog's things (${ids.length})`);
  eq(Object.fromEntries(ids.map((id) => [id, said[id]])), Object.fromEntries(ids.map((id) => [id, trade.carriesGrade(id)])), "carries_grade is the code's for every thing");
  for (const id of FOOD_PREPS) eq(said[id], true, `${id} is a preparation in the catalog`);

  // ── the grade of what was used ──
  const POOL = ["tomato", "corn", "chili", "salt", "minnow", "curryPaste", "fishStock"];
  for (let k = 0; k < 200; k++) {
    const things = POOL.filter(() => rand() < 0.5).map((id) => [id, 1 + int(4)]);
    if (!things.length) continue;
    const before = bagWith(things, { extra: [[pick(POOL), 1 + int(5)]] });
    let after = before;
    for (const [id, n] of things) after = trade.take(after, id, Math.min(n, trade.held(after, id)));
    eq((await one("select town.used_grade($1::jsonb,$2::jsonb,$3::jsonb) v", [J(before), J(after), J(things)])).v, trade.usedGrade(before, after, things.map(([id]) => id)), "used_grade");
  }

  // ── cooking ──
  const CASES = [
    { things: DISHES.stirKangkong.recipe.needs, crew: ["pan"] }, { things: DISHES.tomYum.recipe.needs, crew: ["pot"] },
    { things: DISHES.grilledCorn.recipe.needs, crew: ["grill"] }, { things: DISHES.friedMinnow.recipe.needs, crew: ["pan"] },
    { things: DISHES.greenCurry.recipe.needs, crew: ["mortar", "pot"] }, { things: DISHES.basilCatfish.recipe.needs, crew: ["pan"] },
    { things: MAKES.curryPaste.needs, crew: ["mortar"] }, { things: MAKES.coconutMilk.needs, crew: ["mortar"] },
    { things: MAKES.pestCure.needs, crew: ["pot"] }, { things: MAKES.beanPaste.needs, crew: ["mortar"] }, { things: MAKES.nectarSyrup.needs, crew: ["pot"] },
    { things: MAKES.guardFert.needs, crew: [null] },
    // the odd dish, of graded things; and the same with bare hands (lost, and a little compost)
    { things: [["corn", 3], ["chili", 1]], crew: ["grill"] }, { things: [["corn", 3], ["chili", 1]], crew: [null] },
    // a dish that wants more cooks than there are (whoever has made it is told; anybody else gets the odd dish)
    { things: DISHES.greenCurry.recipe.needs, crew: ["mortar"] },
  ];
  let graded = 0, makes = 0;
  for (let k = 0; k < 260; k++) {
    const c = pick(CASES), free = pick([0, 1, 2, 6, 6, 6]);
    const tools = c.crew.filter(Boolean).map((id) => [id, 1]);
    const bag = bagWith([...c.things], { extra: tools, free });
    // (cookware is the cook's hand: the first piece, held)
    let purse = purseOf(bag, rand() < 0.2 ? { made: ["greenCurry"] } : {});
    if (c.crew[0]) { const at = purse.bag.findIndex((x) => x?.item === c.crew[0]); const h = trade.hold(purse, at); if (h.ok) purse = h.purse; }
    const misses = int(3);
    const got = (await one("select town.cook($1::jsonb,$2::jsonb,$3::jsonb,$4,$5) v", [J(purse), J(c.things), J(c.crew), misses, NOW])).v;
    const want = cooking.cook(purse, c.things, c.crew, misses, NOW);
    eq(got.ok ?? false, want.ok, `cook ok (${got.why ?? ""} / ${want.why ?? ""})`);
    if (!want.ok) { eq(got.why, want.why, "the same refusal"); continue; }
    eq([got.made, got.n, got.taste ?? null], [want.made, want.n, want.taste ?? null], "made, how many, the taste");
    eq(norm(got.purse.bag), norm(want.purse.bag), "the bag after cooking, the pot or the preparation at its grade");
    eq(got.purse.stamina, want.purse.stamina, "the stamina it cost");
    if (want.purse.bag.some((x) => x?.item === "potFull" && x.grade)) graded++;
    if (want.made && !(want.made in DISHES) && want.purse.bag.some((x) => x?.item === want.made && x.grade)) makes++;
  }
  assert.ok(graded >= 20 && makes >= 10, `enough graded pots (${graded}) and preparations (${makes})`); checks++;

  // a big pot: forged cookware that cooks three batches, the batches' units counted too
  let batches = 0;
  for (let k = 0; k < 40; k++) {
    const things = DISHES.tomYum.recipe.needs, big = { item: "pot", n: 1, plus: 10, opts: ["", "", "ckBig"] };
    const bag = bagWith(things.map(([id, n]) => [id, n * 3]), { free: 4 });
    bag[bag.findIndex((x) => !x)] = big;
    const h = trade.hold(purseOf(bag), bag.findIndex((x) => x?.item === "pot"));
    if (!h.ok) throw new Error("could not hold the big pot");
    const got = (await one("select town.cook($1::jsonb,$2::jsonb,$3::jsonb,0,$4) v", [J(h.purse), J(things), J(["pot"]), NOW])).v;
    const want = cooking.cook(h.purse, things, ["pot"], 0, NOW);
    eq(got.ok ?? false, want.ok, "big pot ok");
    if (!want.ok) continue;
    eq([got.n, norm(got.purse.bag)], [want.n, norm(want.purse.bag)], "the big pot's helpings and its bag (its grade from every batch)");
    if (!want.purse.bag.some((x) => x && ["snakehead", "tomato", "chili", "scallion"].includes(x.item))) batches++;
  }
  assert.ok(batches >= 30, `the big pot took all three batches (${batches})`); checks++;

  // ── the preparation board ──
  const PREPS = ["brownedOnion", "dicedRoot", "driedZest", "spicePaste", "fishStock", "thickBroth", "brightSauce"];
  let prepped = 0;
  for (let k = 0; k < 160; k++) {
    const recipe = pick(PREPS), r = PREPARATION.recipes[recipe], tile = PREPARATION.stations[int(PREPARATION.stations.length)];
    const bag = bagWith(r.needs, { extra: [["prepBoard", 1], ...r.in.map((t) => [t, 1])], free: pick([0, 3, 6]) });
    const purse = purseOf(bag), id = randomUUID();
    const run = { id, recipe, seed: 1, at: NOW - 3000, until: NOW + 3 * MIN, tile };
    const target = { method: PREPARATION.methods[recipe], heat: PREPARATION.heat[recipe], finish: PREPARATION.finish[recipe] };
    const answers = rand() < 0.7 ? target : { ...target, heat: (target.heat + 1) % 3 };
    const got = (await one("select town.prepare($1::jsonb,$2::jsonb,$3::uuid,$4::jsonb,$5,$6,$7) v", [J(purse), J(run), id, J(answers), tile[0], tile[1], NOW])).v;
    const want = prepare(purse, run, id, answers, tile, NOW);
    eq(got.ok ?? false, want.ok, `prepare ok (${got.why ?? ""} / ${want.why ?? ""})`);
    if (!want.ok) { eq(got.why, want.why, "the same refusal"); continue; }
    eq([got.made, got.n, norm(got.purse.bag)], [want.made, want.n, norm(want.purse.bag)], "the preparation at its grade (compost at none)");
    if (want.purse.bag.some((x) => x?.item === recipe && x.grade)) prepped++;
  }
  assert.ok(prepped >= 15, `enough graded preparations at the board (${prepped})`); checks++;

  // ── the pot's marks ──
  for (let k = 0; k < 120; k++) {
    const from = { ...(rand() < 0.5 ? { warm: pick([0, 0.5, 2]) } : {}), ...(rand() < 0.5 ? { scent: pick([0, 3]) } : {}), ...(rand() < 0.4 ? { secondary: pick(["green", "calm", "keen"]) } : {}),
      ...(rand() < 0.3 ? { cookedBy: "me", cookId: "c1" } : {}), ...(rand() < 0.8 ? { grade: pick([0, 1, 2, 3, "2", 1.5, null]) } : {}) };
    eq(norm((await one("select town.pot_marks($1::jsonb) v", [J(from)])).v), norm(cooking.potMarks(from)), `pot_marks ${J(from)}`);
  }

  // ── a pot set down, taken up, eaten from at the table; bowls ladled and served ──
  const DISH = ["tomYum", "grilledCorn", "stirKangkong", "oddDish"];
  for (let k = 0; k < 160; k++) {
    const dish = pick(DISH), g = G(), marks = { ...(g ? { grade: g } : {}), ...(rand() < 0.3 ? { warm: 1 } : {}), ...(rand() < 0.3 ? { scent: 4 } : {}) };
    const stack = { item: "potFull", n: 1, of: { dish, left: 1 + int(4) }, ...marks };
    const bag = bagWith([["bowl", int(3)], [dish, int(3)]], { free: pick([0, 1, 4]) });
    const slot = bag.findIndex((x) => !x) >= 0 ? bag.findIndex((x) => !x) : 19;
    bag[slot] = stack;
    const purse = purseOf(bag);
    // set down (as the old keepers do: no table said)
    const down = (await one("select town.set_down($1::jsonb,$2,'me',$3::jsonb,'p1') v", [J(purse), slot, J([3, 4])])).v, wantDown = cooking.setDown(purse, slot, "me", [3, 4], "p1");
    eq(norm(down.pot), norm(wantDown.pot), "the pot set down keeps its grade");
    // taken up again into a bag with room
    const up = (await one("select town.take_up($1::jsonb,$2::jsonb,'me') v", [J(wantDown.purse), J(wantDown.pot)])).v, wantUp = cooking.takeUp(wantDown.purse, wantDown.pot, "me");
    eq(norm(up.purse?.bag), norm(wantUp.ok ? wantUp.purse.bag : null), "the pot taken up keeps its grade");
    // served from the bag, and ladled from the pot set down
    const sv = (await one("select town.serve($1::jsonb,$2) v", [J(purse), slot])).v, wantSv = cooking.serve(purse, slot);
    eq(sv.ok ?? false, wantSv.ok, `serve ok (${sv.why ?? ""} / ${wantSv.why ?? ""})`);
    if (wantSv.ok) eq(norm(sv.purse.bag), norm(wantSv.purse.bag), "a served bowl has the pot's grade");
    const ld = (await one("select town.ladle($1::jsonb,$2::jsonb) v", [J(wantDown.purse), J(wantDown.pot)])).v, wantLd = cooking.ladle(wantDown.purse, wantDown.pot);
    eq(ld.ok ?? false, wantLd.ok, `ladle ok (${ld.why ?? ""} / ${wantLd.why ?? ""})`);
    if (wantLd.ok) eq([norm(ld.purse.bag), norm(ld.pot)], [norm(wantLd.purse.bag), norm(wantLd.pot)], "a ladled bowl has the pot's grade alone");
    // eaten at the feast table
    const feastPot = { ...wantDown.pot, feast: true, set: NOW };
    const fe = (await one("select town.feast_eat($1::jsonb,$2::jsonb,true,$3) v", [J(purseOf([])), J(feastPot), NOW])).v, wantFe = cooking.feastEat(purseOf([]), feastPot, true, NOW);
    eq(fe.ok ?? false, wantFe.ok, "feast eat ok");
    if (wantFe.ok) eq([norm(fe.purse.eating), norm(fe.pot)], [norm(wantFe.purse.eating), norm(wantFe.pot)], "the meal at the table has the pot's grade");
  }

  // ── sitting down to a helping out of the bag ──
  for (let k = 0; k < 120; k++) {
    const dish = pick(DISH), bag = bagWith([[dish, 1 + int(4)], ["corn", 2]]), slot = bag.findIndex((x) => x?.item === pick([dish, dish, "corn"]));
    const purse = purseOf(bag, rand() < 0.2 ? { eating: { dish: "tomYum", meal: 1, from: NOW - MIN, till: NOW - MIN, got: 0 } } : {});
    const got = (await one("select town.sit_down($1::jsonb,$2,true,$3) v", [J(purse), slot, NOW])).v, want = stamina.sitDown(purse, slot, true, NOW);
    eq(got.ok ?? false, want.ok, "sit down ok");
    if (!want.ok) { eq(got.why, want.why, "the same refusal"); continue; }
    eq([norm(got.purse.bag), norm(got.purse.eating), norm(got.purse.meals)], [norm(want.purse.bag), norm(want.purse.eating), norm(want.purse.meals)], "the stack left and the meal keep the grade");
  }

  // ── the basket ──
  const gifted = { gifts: { had: ["thingBasket"], charms: [] } };
  const basketOfRandom = () => Array.from({ length: int(5) }, () => pick([
    [pick(DISH), 1 + int(3)], [pick(DISH), 1 + int(3), pick([1, 2, 3])], [pick(DISH), 1, 0], [pick(DISH), 2, 7], ["salt", 1], "x", [pick(DISH), 1.5],
  ]));
  for (let k = 0; k < 200; k++) {
    const basket = basketOfRandom(), bag = bagWith([[pick(DISH), 1 + int(4)], [pick(DISH), 1 + int(3)]], { free: pick([0, 1, 5]) });
    const purse = purseOf(bag, { ...gifted, basket });
    eq(norm((await one("select town.basket_of($1::jsonb) v", [J(purse)])).v), norm(cooking.basketOf(purse)), `basket_of ${J(basket)}`);
    const room = (await one("select town.basket_room($1::jsonb) v", [J(purse)])).v;
    eq(room, cooking.basketRoom(purse), "basket room");
    const op = pick(["put", "take", "eat"]);
    if (op === "put") {
      const slot = bag.findIndex((x) => x && x.item in DISHES), n = 1 + int(3);
      const got = (await one("select town.basket_put($1::jsonb,$2,$3) v", [J(purse), slot, n])).v, want = cooking.basketPut(purse, slot, n);
      eq(got.ok ?? false, want.ok, `basket put ok (${got.why ?? ""} / ${want.why ?? ""})`);
      if (want.ok) eq([norm(got.purse.bag), norm(got.purse.basket)], [norm(want.purse.bag), norm(want.purse.basket)], "put: the bag and the basket by grade");
      else eq(got.why, want.why, "put: the same refusal");
    } else if (op === "take") {
      const dish = pick(DISH), n = 1 + int(4);
      const got = (await one("select town.basket_take($1::jsonb,$2,$3) v", [J(purse), dish, n])).v, want = cooking.basketTake(purse, dish, n);
      eq(got.ok ?? false, want.ok, `basket take ok (${got.why ?? ""} / ${want.why ?? ""})`);
      if (want.ok) eq([norm(got.purse.bag), norm(got.purse.basket)], [norm(want.purse.bag), norm(want.purse.basket)], "take: the lowest grade first, each onto its own stacks");
      else eq(got.why, want.why, "take: the same refusal");
    } else {
      const dish = pick(DISH);
      const got = (await one("select town.basket_eat($1::jsonb,$2,true,$3) v", [J(purse), dish, NOW])).v, want = cooking.basketEat(purse, dish, true, NOW);
      eq(got.ok ?? false, want.ok, `basket eat ok (${got.why ?? ""} / ${want.why ?? ""})`);
      if (want.ok) eq([norm(got.purse.basket), norm(got.purse.eating), norm(got.purse.meals)], [norm(want.purse.basket), norm(want.purse.eating), norm(want.purse.meals)], "eat: the lowest grade first, and the meal has it");
      else eq(got.why, want.why, "eat: the same refusal");
    }
  }

  // ── eating: the stamina a grade adds and an excellent dish's buff ──
  let levelled = 0;
  for (let k = 0; k < 240; k++) {
    const dish = pick(["tomYum", "grilledCorn", "stirKangkong", "friedMinnow", "oddDish"]), g = G(), from = NOW - int(6) * MIN;
    const eating = { dish, meal: stamina.mealOf(from), from, till: from + int(2) * MIN, got: 0, ...(g ? { grade: g } : {}),
      ...(rand() < 0.3 ? { scent: pick([2, 5]) } : {}), ...(rand() < 0.3 ? { warm: 1 } : {}), ...(rand() < 0.2 ? { secondary: pick(["green", "calm"]) } : {}), ...(rand() < 0.2 ? { lent: true } : {}) };
    const buff = DISHES[dish].buff, had = buff && rand() < 0.4 ? [{ id: buff, level: 1 + int(4), until: NOW + 30 * MIN }] : [];
    const purse = purseOf(bagWith([["bowl", 1]]), { eating, stamina: { day: stamina.dayOf(NOW), left: pick([0, 20, 70, 95]) }, ...(had.length ? { buffs: had } : {}),
      ...(rand() < 0.15 ? { spiced: { from, level: pick([2, 3, 4]) } } : {}) });
    const company = int(7), at = NOW + int(3) * MIN;
    const got = (await one("select town.chew($1::jsonb,$2,$3) v", [J(purse), company, at])).v, want = stamina.chew(purse, company, at);
    eq(got.done, want.done, "chew done");
    eq(got.purse.stamina, want.purse.stamina, `the stamina eaten (grade ${g}, ${dish})`);
    eq(norm(got.purse.eating), norm(want.purse.eating), "the meal as it goes on");
    const byId = (b) => [...(b ?? [])].sort((x, y) => (x.id < y.id ? -1 : 1));
    eq(norm(byId(got.purse.buffs)), norm(byId(want.purse.buffs)), "the buffs, the excellent one's at the second level");
    eq(norm(got.purse.bag), norm(want.purse.bag), "the bowl back");
    if (want.done && g === 3 && buff && !had.length) { assert.ok(want.purse.buffs.find((b) => b.id === buff).level >= 2, "an excellent dish starts its buff at the second level"); levelled++; }
  }
  assert.ok(levelled >= 3, `enough excellent meals eaten up (${levelled})`); checks++;

  // no function, old or new, writes to a table with no WHERE (the live API refuses those)
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /grade|cook|prepare|pot_marks|ladle|serve|sit_down|chew|basket/.test(JSON.stringify(b))), [], "no bare write in what v261 wrote");

  // nobody in a browser may call the new helpers
  for (const role of ["anon", "authenticated"]) {
    for (const fn of ["town.carries_grade(text)", "town.used_grade(jsonb,jsonb,jsonb)", "town.grade_restores(integer)", "town.basket_grade(jsonb)"]) eq((await one(`select has_function_privilege('${role}','${fn}','EXECUTE') a`)).a, false, `${role} may not call ${fn}`);
  }
  console.log(`v261: ${checks} checks passed (what carries a grade, cooking, preparing, pots, bowls, the basket and eating against the code; the helpers closed).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 2500));
  process.exitCode = 1;
} finally {
  await db.close();
}
