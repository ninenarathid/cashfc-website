// v266, the fertilisers of Quality, dry-run: the file runs twice (its guards against the chain through v265); the
// catalog's rows are the code's; the deed offered and the fertiliser put on (town.deed_for, town.tend) are the code's
// (lib/town/farm's deedFor, tend) for random plants, hands and slots; a round settled with a base, a top or a three-day
// packet on it is the code's (lib/town/quality-plant's settled); a fertiliser made by hand is the code's (cooking's
// cook); the leaf mulch is a base, no longer a growth feed; no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v266.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { catalogOf } = await import("@/lib/town/catalog");
const { deedFor, tend } = await import("@/lib/town/farm");
const { settled } = await import("@/lib/town/quality-plant");
const { NO_Q } = await import("@/lib/town/quality");
const { FERTS, FERT_MAKES } = await import("@/lib/town/fertilisers");
const cooking = await import("@/lib/town/cooking");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
let checks = 0, s = 61;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const J = (x) => JSON.stringify(x);

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v255_important_town_announcements", "v258_finite_profession_rewards", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush", "v263_helper_plants_and_their_crossings", "v264_species_of_the_time_bands", "v265_the_insect_house"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v266_fertilisers_of_quality.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const cat = catalogOf();
  for (const key of ["quality", "items", "makes", "farming", "cooking"]) eq((await one("select town.cat($1) c", [key])).c, norm(cat[key]), `the catalog's ${key} is the code's`);
  eq((await one("select town.tool_of('mulch') t")).t, null, "the mulch is no growth feed");

  // the deed offered and the fertiliser put on, for random plants, hands and slots
  const FERT_IDS = Object.keys(FERTS);
  let put = 0;
  for (let k = 0; k < 500; k++) {
    const now = T0, sown = now - pick([5, 20, 40, 80]) * H, by = pick(["me", "me", "them"]), picked = rand() < 0.25 ? 1 : 0;
    const plant = { by, crop: pick(["tomato", "corn", "chili", "basil"]), sown, boost: 0, watered: 0, fed: 0, guard: now + 99 * H, cured: 0, picked, pickedAt: picked ? sown + 72 * H : 0,
      ...(rand() < 0.3 ? { base: { item: pick(FERT_IDS.filter((f) => FERTS[f].slot === "base")), at: sown + H } } : {}),
      ...(rand() < 0.4 ? { top: (() => { const t = pick(FERT_IDS.filter((f) => FERTS[f].slot === "top")), at = now - pick([1, 10, 30, 80]) * H; return { item: t, at, until: at + FERTS[t].hours * H }; })() } : {}) };
    const plot = { soil: "tilled", plant }, hand = pick([...FERT_IDS, "growFert", "compost", null]);
    const owner = pick(["me", "me", "them", null]), bed = owner ? { by: owner, tended: now - H, empty: 0 } : null;
    const bag = [hand ? { item: hand, n: 2 } : null, ...Array(9).fill(null)];
    const purse = { ...trade.newPurse(), bag, ...(hand ? { hand } : {}) };
    const want = deedFor("3,3", plot, hand, "me", now, owner);
    eq((await one("select town.deed_for($1,$2::jsonb,$3,$4,$5,$6) d", ["3,3", J(plot), hand, "me", now, owner])).d, want, `the deed offered (${hand}, ${owner}, ${by})`);
    if (want !== "fert") continue;
    const got = (await one("select town.tend($1,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb,$7,$8,false) v", ["3,3", J(plot), J(bed), 1, 1, J(purse), "me", now])).v;
    const did = tend("3,3", plot, bed ?? undefined, 1, 1, purse, "me", now, [], false);
    eq(got.ok ?? false, did.ok, `put on (${hand})`);
    if (!did.ok) { eq(got.why, did.why, "the same refusal"); continue; }
    eq(got.deed, did.deed, "the same deed");
    eq(norm(got.plot), norm(did.plot), "the plant as the code leaves it");
    eq(norm(got.purse.bag), norm(did.purse.bag), "the bag as the code leaves it");
    eq(norm(got.purse.stamina), norm(did.purse.stamina), "the stamina as the code leaves it");
    eq(norm(got.bed), norm(did.bed), "the bed as the code keeps it");
    put++;
  }
  assert.ok(put >= 60, `enough put on (${put})`); checks++;

  // a round settled with its fertilisers, a three-day packet among them
  for (let k = 0; k < 200; k++) {
    const sown = T0 - pick([0, 10, 30]) * H, picked = rand() < 0.2 ? 1 : 0;
    const top = pick(FERT_IDS.filter((f) => FERTS[f].slot === "top")), at = sown + pick([0, 5, 20]) * H;
    const p = { by: "me", crop: pick(["tomato", "corn", "basil", "pumpkin"]), sown, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked, pickedAt: picked ? sown + 80 * H : 0,
      ...(rand() < 0.6 ? { base: { item: pick(FERT_IDS.filter((f) => FERTS[f].slot === "base")), at: sown + 2 * H } } : {}),
      ...(rand() < 0.8 ? { top: { item: rand() < 0.3 ? pick(["packetMist", "packetNight"]) : top, at, until: at + FERTS[rand() < 0.3 ? "packetMist" : top].hours * H } } : {}) };
    const q = NO_Q(picked ? p.pickedAt : sown), to = (picked ? p.pickedAt : sown) + pick([20, 60, 120, 200]) * H;
    eq((await one("select town.quality_settled($1::jsonb,$2) q", [J({ ...p, q }), to])).q, norm(settled({ ...p, q }, to, [])), `a round with its fertilisers (${p.base?.item}, ${p.top?.item})`);
  }

  // a fertiliser made by hand, as the old ones are
  let made = 0;
  for (const [id, m] of Object.entries(FERT_MAKES)) {
    const bag = [...m.needs.map(([item, n]) => ({ item, n })), ...Array(10 - m.needs.length).fill(null)];
    const purse = { ...trade.newPurse(), bag };
    const got = (await one("select town.cook($1::jsonb,$2::jsonb,$3::jsonb,0,$4) v", [J(purse), J(m.needs), J([null]), T0])).v;
    const want = cooking.cook(purse, m.needs, [null], 0, T0);
    eq(got.ok ?? false, want.ok, `${id} made (${got.why ?? ""} / ${want.why ?? ""})`);
    if (!want.ok) continue;
    eq([got.made, got.n], [want.made, want.n], `${id}: made and how many`);
    eq(norm(got.purse.bag), norm(want.purse.bag), `${id}: the bag after`);
    if (want.made === id) made++;
  }
  assert.ok(made === Object.keys(FERT_MAKES).length, `every fertiliser made (${made})`); checks++;

  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /quality_care|deed_for|tend|quality_covers|quality_accrue/.test(JSON.stringify(b))), [], "no bare write");
  console.log(`v266: ${checks} checks passed (the catalog's five rows, ${put} fertilisers put on, 200 rounds settled with theirs, ${made} made by hand, against the code).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
