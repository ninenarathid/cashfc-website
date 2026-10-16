// v270, the farm's Quality asks less at a tend, dry-run: the file runs twice (its guards against the chain through
// v269); then over random beds (main crops and helpers, plants with a round and plants with none yet, plots over two
// or three, insect houses) and random deeds on them (a watering, a picking, a plant gone, a sowing, a house set or
// taken away), the bed after the deeds is the same, to the digit, under v269's trigger and gift and under v270's; and
// a bed of 47 plants with no round yet is tended many times faster. No bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v270.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, SIGS } from "./build-v270.mjs";

const H = 3_600_000, T0 = Date.UTC(2026, 9, 17, 3);
let checks = 0, s = 270;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const defsOf = async () => Promise.all(SIGS.map(async (sig) => (await one(`select pg_get_functiondef('${sig}'::regprocedure) d`)).d));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const OLD = await defsOf();
  const sql = readFileSync("supabase/v270_quality_asks_less_at_a_tend.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = await defsOf();
  assert.notDeepEqual(OLD, NEW); checks++;
  const use = async (defs) => { for (const d of defs) await db.exec(d); };

  const f = (await one("select town.cat('farming') f")).f, qc = (await one("select town.cat('quality') q")).q;
  const helpers = Object.keys(qc.companions), mains = ["tomato", "chili", "corn", "basil", "cabbage", "carrot", "pumpkin", "cucumber", "longBean", "eggplant", "lime", "garlic"];
  const bugs = Object.keys(qc.house.favourites);
  const side = f.side, beds = f.bedsAt;
  const plantOf = (crop, t, more = {}) => ({ by: pick(["m1", "m2"]), crop, sown: t - Math.floor(rand() * 60) * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...more });
  const houseOf = (t) => ({ by: "m1", set: t, rooms: [{ bug: pick(bugs), from: t - H, until: t + 40 * H }, ...(rand() < 0.5 ? [{ bug: pick(bugs), from: t, until: t + 30 * H }] : [])] });
  const snap = async (bed) => (await one("select coalesce(jsonb_object_agg(x||','||y, jsonb_build_object('soil',soil,'plant',plant,'house',house) order by x, y), '{}'::jsonb) j from public.town_plots where bed=$1", [bed])).j;

  for (let k = 0; k < 40; k++) {
    const bed = Math.floor(rand() * beds.length), [bx, by] = beds[bed];
    // a bed laid with the triggers off: some plants with no round yet (as sown before the launch), houses, plots over two
    await db.exec("delete from public.town_plots");
    await db.exec("alter table public.town_plots disable trigger user");
    const keys = []; for (let x = bx; x < bx + side; x++) for (let y = by; y < by + side; y++) keys.push([x, y]);
    const taken = new Set();
    for (const [x, y] of keys) {
      if (taken.has(`${x},${y}`)) continue;
      const r = rand();
      let plant = null, house = null;
      if (r < 0.55) plant = plantOf(rand() < 0.35 ? pick(helpers) : pick(mains), T0, rand() < 0.3 ? { rotation: Math.floor(rand() * 4) } : {});
      else if (r < 0.6) house = houseOf(T0);
      if (plant && rand() < 0.08 && x + 1 < bx + side && !taken.has(`${x + 1},${y}`)) { plant.root = `${x},${y}`; plant.footprint = [`${x},${y}`, `${x + 1},${y}`]; }
      for (const c of plant?.footprint ?? [`${x},${y}`]) { taken.add(c); const [cx, cy] = c.split(",").map(Number); await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) on conflict (x,y) do update set plant=excluded.plant, house=excluded.house", [cx, cy, bed, house ? "house" : "tilled", plant ? JSON.stringify(plant) : null, house ? JSON.stringify(house) : null, T0]); }
    }
    await db.exec("alter table public.town_plots enable trigger user");
    // some plants given their round first (a watering through the trigger), as those touched since the launch
    for (const [x, y] of keys) if (rand() < 0.4) await db.query("update public.town_plots set plant=plant||jsonb_build_object('watered',$3::bigint), changed=$3 where x=$1 and y=$2 and plant is not null and plant<>'null'::jsonb and (plant->>'root' is null or plant->>'root'=x||','||y)", [x, y, T0 - H]);
    // the deeds, the same under both definitions
    const deeds = Array.from({ length: 6 }, (_, i) => ({ what: pick(["water", "water", "pick", "gone", "sow", "house"]), at: pick(keys), t: T0 + (i + 1) * 600_000, crop: rand() < 0.4 ? pick(helpers) : pick(mains), house: houseOf(T0) })).map((d) => ({ ...d, plant: plantOf(d.crop, d.t, { sown: d.t }) }));
    const run = async (defs) => {
      await use(defs);
      await db.exec("begin");
      try {
        for (const d of deeds) {
          const [x, y] = d.at, t = d.t;
          if (d.what === "water") await db.query("update public.town_plots set plant=plant||jsonb_build_object('watered',$3::bigint), changed=$3 where x=$1 and y=$2 and plant is not null and plant<>'null'::jsonb", [x, y, t]);
          if (d.what === "pick") await db.query("update public.town_plots set plant=plant||jsonb_build_object('picked',coalesce((plant->>'picked')::int,0)+1,'pickedAt',$3::bigint), changed=$3 where x=$1 and y=$2 and plant is not null and plant<>'null'::jsonb", [x, y, t]);
          if (d.what === "gone") await db.query("update public.town_plots set plant=null, soil='cleared', changed=$3 where x=$1 and y=$2 and plant is not null and plant->>'root' is null", [x, y, t]);
          if (d.what === "sow") await db.query("update public.town_plots set plant=$4::jsonb, soil='tilled', changed=$3 where x=$1 and y=$2 and (plant is null or plant='null'::jsonb) and house is null", [x, y, t, JSON.stringify(d.plant)]);
          if (d.what === "house") await db.query("update public.town_plots set house=case when house is null then $4::jsonb end, soil=case when house is null then 'house' else 'tilled' end, changed=$3 where x=$1 and y=$2 and (plant is null or plant='null'::jsonb)", [x, y, t, JSON.stringify(d.house)]);
        }
        return await snap(bed);
      } finally { await db.exec("rollback"); }
    };
    const before = await run(OLD), after = await run(NEW);
    const differ = Object.keys({ ...before, ...after }).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
    if (differ.length) console.log("DIFFER", differ.map((k) => [k, "  v269 " + JSON.stringify(before[k]), "  v270 " + JSON.stringify(after[k])].join(String.fromCharCode(10))).join(String.fromCharCode(10)));
    eq(after, before, `bed ${bed}, deeds ${deeds.map((d) => d.what + "@" + d.at).join(" ")}`);
  }
  await use(NEW);

  // the gift alone, the same for every plant of random beds
  for (let k = 0; k < 20; k++) {
    const bed = Math.floor(rand() * beds.length), [bx, by] = beds[bed], plots = {};
    for (let x = bx; x < bx + side; x++) for (let y = by; y < by + side; y++) if (rand() < 0.7) plots[`${x},${y}`] = rand() < 0.08 ? { soil: "house", plant: null, house: houseOf(T0) } : { soil: "tilled", plant: plantOf(rand() < 0.4 ? pick(helpers) : pick(mains), T0) };
    for (const key of Object.keys(plots)) {
      await use(OLD); const a = (await one("select town.quality_bed_gift($1,$2::jsonb) g", [key, JSON.stringify(plots)])).g;
      await use(NEW); const b = (await one("select town.quality_bed_gift($1,$2::jsonb) g", [key, JSON.stringify(plots)])).g;
      eq(b, a, `gift of ${key} in bed ${bed}`);
    }
  }

  // the time: a bed of 47 plants with no round yet, each watered once
  const timeBed = async (defs) => {
    await use(defs);
    const [bx, by] = beds[3];
    await db.exec("delete from public.town_plots");
    await db.exec("alter table public.town_plots disable trigger user");
    let n = 0; const roots = [];
    for (let x = bx; x < bx + side && n < 47; x++) for (let y = by; y < by + side && n < 47; y++) { n++; roots.push([x, y]); await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,3,'tilled',$3::jsonb,$4)", [x, y, JSON.stringify(plantOf(n % 4 === 0 ? pick(helpers) : pick(mains), T0)), T0]); }
    await db.exec("alter table public.town_plots enable trigger user");
    const t0 = performance.now();
    for (const [x, y] of roots.slice(0, 12)) await db.query("update public.town_plots set plant=plant||jsonb_build_object('watered',$3::bigint), changed=$3 where x=$1 and y=$2", [x, y, T0 + H]);
    return (performance.now() - t0) / 12;
  };
  const slow = await timeBed(OLD), fast = await timeBed(NEW);
  console.log(`a watering in a bed of 47 plants with no round yet: ${slow.toFixed(0)} ms under v269, ${fast.toFixed(0)} ms under v270`);
  assert.ok(fast * 4 < slow, "at least four times faster"); checks++;
  await use(NEW);

  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v270: ${checks} checks passed`);
} finally { await db.close(); }
