// v260, produce keeps its grade, dry-run: the file runs twice (its guards against the chain through v259); the bag's
// helpers, the uncle's lots, a deal's pull and the pick are the code's (lib/town/trade, deal, farm) for random graded
// bags and plants (the salt set empty here, so the draws are the code's); the salt and the new functions are no
// browser's to read or call.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v260.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { pull: tsPull, push: tsPush } = await import("@/lib/town/deal");
const { plain: tsPlain } = await import("@/lib/town/notices");
const { pick: tsPick } = await import("@/lib/town/farm");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
let checks = 0, s = 11;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];
const ITEMS = ["tomato", "corn", "chili", "salt", "log"], GRADED = ["tomato", "corn", "chili"];
const stackOf = () => { const item = pick(ITEMS), n = 1 + int(item === "log" ? 30 : 20), g = GRADED.includes(item) ? pick([0, 0, 1, 2, 3]) : 0; return g ? { item, n, grade: g } : { item, n }; };
const bagOf = () => Array.from({ length: 10 }, () => (rand() < 0.35 ? null : stackOf()));
// (the database keeps a stack's keys in its own order: compare as data)
const norm = (x) => JSON.parse(JSON.stringify(x));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v260_produce_keeps_its_grade.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  eq((await one("select count(*)::int n, min(char_length(salt)) l from town.quality_salt")).n, 1, "one salt");
  assert.ok((await one("select min(char_length(salt)) l from town.quality_salt")).l >= 16, "a salt of some length"); checks++;

  // the bag's helpers against the code
  for (let k = 0; k < 300; k++) {
    const bag = bagOf(), id = pick(ITEMS), g = GRADED.includes(id) ? pick([0, 1, 2, 3]) : 0, n = 1 + int(25);
    const B = JSON.stringify(bag);
    eq((await one("select town.room($1::jsonb,$2) v", [B, id])).v, trade.roomFor(bag, id), "room");
    eq((await one("select town.room_g($1::jsonb,$2,$3) v", [B, id, g])).v, trade.roomFor(bag, id, g), "room_g");
    eq((await one("select town.held_g($1::jsonb,$2,$3) v", [B, id, g])).v, trade.held(bag, id, g), "held_g");
    eq((await one("select town.plain($1::jsonb,$2) v", [B, id])).v, tsPlain(bag, id), "plain");
    if (trade.roomFor(bag, id, g) >= n) eq(norm((await one("select town.put_g($1::jsonb,$2,$3,$4) v", [B, id, n, g])).v), norm(trade.put(bag, id, n, g)), "put_g");
    if (trade.held(bag, id) >= n) eq(norm((await one("select town.take($1::jsonb,$2,$3) v", [B, id, n])).v), norm(trade.take(bag, id, n)), "take, lowest grade first");
    const moving = [stackOf(), stackOf()];
    eq(norm((await one("select town.push($1::jsonb,$2::jsonb) v", [B, JSON.stringify(moving)])).v), norm(tsPush(bag, moving)), "push");
    const give = [[id, 1 + int(5)]];
    if (trade.held(bag, id, 0) >= give[0][1]) eq(norm((await one("select town.pull($1::jsonb,$2::jsonb) v", [B, JSON.stringify(give)])).v), norm(tsPull(bag, give)), "pull by kind");
  }

  // the uncle's lots: left from a graded slot, taken back, fetched and paid by the grade
  for (let k = 0; k < 150; k++) {
    const bag = bagOf(), slot = bag.findIndex((x) => x && x.item !== "log");
    if (slot < 0) continue;
    const now = T0 + int(48) * H, purse = { ...trade.newPurse(), bag, left: [] }, n = 1 + int(bag[slot].n);
    const got = (await one("select town.leave($1::jsonb,$2,$3,$4,$5) v", [JSON.stringify(purse), slot, n, now, 100])).v, want = trade.leave(purse, slot, n, now);
    eq(got.ok, want.ok, "leave ok");
    if (!want.ok) continue;
    eq(norm(got.purse.bag), norm(want.purse.bag), "leave's bag");
    eq(norm(got.purse.left), norm(want.purse.left), "leave's lot");
    const back = (await one("select town.take_back($1::jsonb,0,$2) v", [JSON.stringify(want.purse), now])).v, wantBack = trade.takeBack(want.purse, 0, now);
    eq(back.ok, wantBack.ok, "take back ok");
    if (wantBack.ok) eq(norm(back.purse.bag), norm(wantBack.purse.bag), "taken back at its grade");
    const later = now + 13 * H, paid = (await one("select town.collect($1::jsonb,$2) v", [JSON.stringify(want.purse), later])).v, wantPaid = trade.collect(want.purse, later);
    eq(paid.ok, wantPaid.ok, "collect ok");
    if (wantPaid.ok) eq(paid.coins, wantPaid.coins, "paid by the grade");
  }

  // the pick: the fruits are the code's when the salt is empty
  await db.exec("update town.quality_salt set salt='' where one");
  let graded = 0;
  for (let k = 0; k < 80; k++) {
    const crop = pick(["tomato", "corn", "chili", "kangkong"]), sown = T0 - 400 * H;
    const area = [0, 1, 2, 3].map(() => pick([0, 0.25, 0.5, 0.75, 1]));
    const plant = { by: "me", crop, sown, boost: 0, watered: 0, fed: 0, guard: sown + 900 * H, cured: 0, picked: 0, pickedAt: 0,
      q: { at: T0, span: 1, area, nar: [pick([0, 0.5, 1]), 0, 0] }, ...(rand() < 0.5 ? { brushed: sown + H } : {}) };
    const plot = { soil: "tilled", plant }, purse = { ...trade.newPurse(), bag: rand() < 0.2 ? Array(10).fill({ item: "salt", n: 1 }) : bagOf() };
    const got = (await one("select town.pick($1,$2::jsonb,$3::jsonb,true,null,$4) v", ["3,3", JSON.stringify(purse), JSON.stringify(plot), T0])).v;
    const want = tsPick("3,3", purse, plot, true, null, T0);
    eq(got.ok ?? false, want.ok, `pick ok (${got.why ?? ""} / ${want.why ?? ""})`);
    if (!want.ok) { eq(got.why, want.why, "the same refusal"); continue; }
    eq(norm(got.purse.bag), norm(want.purse.bag), "the same graded bag");
    eq(got.fruits.values, want.fruits.values, "the same fruits");
    eq(got.fruits.range, want.fruits.range, "the same range");
    if (want.purse.bag.some((x) => x?.grade)) graded++;
  }
  assert.ok(graded >= 10, `enough picks gave graded fruit (${graded})`); checks++;

  // no function, old or new, writes to a table with no WHERE (the live API refuses those)
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /quality|grade|_g|pick|take|put|push|leave|collect|pull|has_all|plain|room/.test(JSON.stringify(b))), [], "no bare write in what v259 and v260 wrote");

  // nobody in a browser may read the salt or call the new functions
  for (const role of ["anon", "authenticated"]) {
    eq((await one(`select has_table_privilege('${role}','town.quality_salt','SELECT') a`)).a, false, `${role} may not read the salt`);
    for (const fn of ["town.quality_harvest(text,jsonb,integer,bigint,text)", "town.put_g(jsonb,text,integer,integer)", "town.grade_pays(text,integer)"]) eq((await one(`select has_function_privilege('${role}','${fn}','EXECUTE') a`)).a, false, `${role} may not call ${fn}`);
  }
  console.log(`v260: ${checks} checks passed (the bag's helpers, the uncle's lots, deals and the pick against the code; the salt and the functions closed).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
