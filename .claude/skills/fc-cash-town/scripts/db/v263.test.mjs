// v263, the helper plants and their crossings, dry-run: the file runs twice (its guards against the chain through v262);
// the catalog's rows are the code's; letting a pollinator go keeps its sky as the code does (lib/town/insect-garden);
// the crossing found is the code's (lib/town/gardening's gardenCross) for random beds of parents, pollinators and the
// garden's own pairs; no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v263.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { catalogOf } = await import("@/lib/town/catalog");
const { insectCare } = await import("@/lib/town/insect-garden");
const { gardenCross } = await import("@/lib/town/gardening");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
let checks = 0, s = 31;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade", "v261_a_dish_as_good_as_what_went_in", "v262_compost_and_the_pollen_brush"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v263_helper_plants_and_their_crossings.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const cat = catalogOf();
  for (const key of ["items", "crops", "gardening", "goods", "shelf", "quality"]) eq((await one("select town.cat($1) c", [key])).c, norm(cat[key]), `the catalog's ${key} is the code's`);

  // a pollinator let go: its sky kept on the plant, as the code keeps it
  for (const bug of ["honeyBee", "moth", "lunaMoth", "monarch"]) {
    const plot = { soil: "tilled", plant: { by: "me", crop: "corn", sown: T0 - 10 * H, boost: 0, watered: 0, fed: 0, guard: T0 + 99 * H, cured: 0, picked: 0, pickedAt: 0 } };
    const purse = { ...trade.newPurse(), bag: [{ item: bug, n: 1 }, ...Array(9).fill(null)] };
    const got = (await one("select town.insect_care($1,$2::jsonb,$3::jsonb,0,'pollinate','me',$4) v", ["3,3", JSON.stringify(plot), JSON.stringify(purse), T0])).v;
    const want = insectCare("3,3", plot, purse, 0, "pollinate", "me", T0, []);
    eq(got.ok, want.ok, `${bug} let go`);
    eq(got.plot.plant.pollenSky, want.plot.plant.pollenSky, `${bug}'s sky`);
  }

  // the crossing found: random beds of the parents of both kinds of crossing, with and without a pollinator
  const KINDS = ["corn", "longBean", "cabbage", "carrot", "chili", "basil", "tomato", "pumpkin", "cucumber", "gardenStrawberry", "kangkong", "scallion", "borage", "lemongrass", "sunflowerPatch"];
  let found = 0, helpers = 0;
  for (let k = 0; k < 150; k++) {
    const plots = {};
    for (let n = 0; n < 8; n++) {
      const key = `${133 + Math.floor(rand() * 3)},${5 + Math.floor(rand() * 3)}`;
      const bug = rand() < 0.6 ? { pollenRound: 0, pollenSky: pick(["sun", "moon"]) } : {};
      plots[key] = { soil: "tilled", plant: { by: "me", crop: pick(KINDS), sown: T0 - 900 * H, boost: 0, watered: 0, fed: 0, guard: T0 + 99 * H, cured: 0, picked: 0, pickedAt: 0, ...bug } };
    }
    for (const key of Object.keys(plots)) {
      const got = (await one("select town.garden_cross($1,$2::jsonb,'me',$3) c", [key, JSON.stringify(plots), T0])).c, want = gardenCross(key, plots, "me", T0, []);
      eq(got ?? null, want ?? null, `the crossing at ${key}`);
      if (want) { found++; if (!cat.gardening.crosses.some((c) => c[2] === want)) helpers++; }
    }
  }
  assert.ok(found >= 30 && helpers >= 15, `enough crossings found (${found}, of the helpers' ${helpers})`); checks++;

  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /insect_care|garden_cross/.test(JSON.stringify(b))), [], "no bare write");
  console.log(`v263: ${checks} checks passed (the catalog's six rows, pollinators' skies, ${found} crossings (${helpers} of the helpers') against the code).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
