// v269, the garden on one plot a plant, dry-run: the file runs twice (its guard against the chain through v268); the
// catalog's gardening, crops, quality and work rows are the code's; the database places a hybrid and the fig on one
// plot (town.garden_room); what a picking gives (town.yield_of) is the code's (lib/town/farm's yieldOf) for one-plot
// plants, for plants sown over two, three or four plots before (each plot as before), and for giants (as before); no
// bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v269.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN } from "./build-v269.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { yieldOf } = await import("@/lib/town/farm");
const { GARDEN } = await import("@/lib/town/gardening");
const { CROPS } = await import("@/lib/town/items");

let checks = 0, s = 269;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v269_the_garden_on_one_plot_a_plant.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const cat = catalogOf();
  for (const key of ["gardening", "crops", "quality", "work"]) eq((await one("select town.cat($1) c", [key])).c, norm(cat[key]), `the catalog's ${key} is the code's`);

  // every hybrid and the figs on one plot, as the database places them at each turn
  const hybrids = ["bottleGourd", "rowBean", "trellisBerry", "blueCorn", "teaBush", "sunflowerPatch", "redOkra", "lotusRootBed", "fig", "dewFig"];
  const plots = {}; for (let x = 130; x < 136; x++) for (let y = 2; y < 8; y++) plots[`${x},${y}`] = { soil: "tilled", plant: null };
  for (const crop of hybrids) {
    eq(GARDEN.shapes[crop], [[0, 0]], `${crop} is one plot in the code`);
    for (const r of [0, 1, 2, 3]) eq((await one("select town.garden_room('132,4', $1, $2::jsonb, $3) c", [crop, JSON.stringify(plots), r])).c, ["132,4"], `${crop} turned ${r} takes its one plot`);
  }

  // what a picking gives: the code's, one-plot or sown over several before, or a giant; with and without a blade
  const crops = Object.keys(CROPS);
  const blades = [null, "sickle", "shears", "hoe"];
  for (let k = 0; k < 400; k++) {
    const crop = k < 200 ? pick(hybrids) : pick(crops), cells = pick([1, 1, 2, 3, 4]), giant = k % 13 === 0;
    const key = `${130 + Math.floor(rand() * 6)},${2 + Math.floor(rand() * 6)}`;
    const footprint = cells > 1 ? Array.from({ length: cells }, (_, i) => `${200 + i},9`) : rand() < 0.5 ? [key] : undefined;
    const plant = { by: "m", crop, sown: 1_790_000_000_000 + Math.floor(rand() * 1e9), picked: Math.floor(rand() * 4), boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, pickedAt: 0,
      ...(footprint ? { footprint, root: key } : {}), ...(giant ? { giant: true } : {}) };
    const hand = pick(blades);
    const n = (await one("select town.yield_of($1, $2::jsonb, $3) n", [key, JSON.stringify(plant), hand])).n;
    // (a giant's picking is its yield six times, the database adding five plain ones where it picks)
    eq(n, giant ? yieldOf(key, { ...plant, giant: false, footprint: undefined }, hand) : yieldOf(key, plant, hand), `${crop} over ${cells}${giant ? " (giant)" : ""} with ${hand}`);
  }
  // a blue corn sown over three plots before gives for its three (6 to 8 then; 6 to 12 now, three plots of 2 to 4)
  const old = { by: "m", crop: "blueCorn", sown: 1_790_000_000_000, picked: 0, footprint: ["1,1", "2,1", "3,1"], root: "1,1" };
  for (let i = 0; i < 20; i++) { const n = (await one("select town.yield_of('1,1', $1::jsonb, null) n", [JSON.stringify({ ...old, sown: old.sown + i * 7919 })])).n; assert.ok(n >= 6 && n <= 12, `old blue corn gives ${n}`); checks++; }

  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v269: ${checks} checks passed`);
} finally { await db.close(); }
