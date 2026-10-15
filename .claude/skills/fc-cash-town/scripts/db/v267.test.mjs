// v267, good gardens draw wild insects, dry-run: the file runs twice (its guards against the chain through v266); the
// catalog's insects row is the code's; every old haunt has what the code says at many moments (nothing of theirs
// changed); for random beds of pollen helpers at every stage, a bed as the database sees it (town.garden_now) is the
// code's (lib/town/garden-visitors' gardenNow), and a good garden's haunt has what the code says (lib/town/insects'
// swarmAt) at moments over every hour; the farm's count of what eats the crops is the same whatever a garden holds;
// no bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v267.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN } from "./build-v267.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { HAUNTS, bugTurnStart, swarmAt, gardenDraws } = await import("@/lib/town/insects");
const { gardenNow } = await import("@/lib/town/garden-visitors");
const { CROPS } = await import("@/lib/town/items");
const { bedCorner, bedOf } = await import("@/lib/town/world");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20) - 7 * H, WORD = "a word of the day";
let checks = 0, s = 67;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const swarmAs = (sw, id) => (sw ? { ...sw, until: bugTurnStart(HAUNTS[id], sw.turn + 1) } : null);

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v267_good_gardens_draw_wild_insects.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  eq((await one("select town.cat('insects') c")).c, norm(catalogOf().insects), "the catalog's insects is the code's");

  // every old haunt as it was, at moments over two days
  const gardens = HAUNTS.filter((h) => h.kind === "garden"), old = HAUNTS.filter((h) => h.kind !== "garden");
  eq(gardens.length, 24, "a garden haunt a bed");
  for (let k = 0; k < 12; k++) {
    const t = T0 + Math.floor(rand() * 48 * 60) * 60_000;
    for (const h of old) eq((await one("select town.bug_at($1,$2,null,$3) b", [h.id, t, WORD])).b, norm(swarmAs(swarmAt(WORD, h, t), h.id)), `haunt ${h.id} (${h.kind}) at ${t}`);
  }

  // random beds of pollen helpers (and others) at every stage, in the bed of a garden haunt
  const POLLEN = ["borage", "lavender", "passionfruit", "milkweed", "fennel"], OTHER = ["tomato", "corn", "peanut", "basil"];
  let good = 0, milk = 0, out = 0;
  const seenBugs = new Set();
  for (let k = 0; k < 120; k++) {
    const h = pick(gardens), bed = bedOf(Math.floor(h.perches[0].x), Math.floor(h.perches[0].y)), [bx, by] = bedCorner(bed);
    const now = T0 + Math.floor(rand() * 72 * 60) * 60_000, plots = {};
    for (let n = 0, many = 1 + Math.floor(rand() * 9); n < many; n++) {
      const x = bx + Math.floor(rand() * 7), y = by + Math.floor(rand() * 7), crop = rand() < 0.75 ? pick(POLLEN) : pick(OTHER);
      const age = pick([0.1, 0.3, 0.6, 0.85, 1.05, 1.6]) * CROPS[crop].hours * H;
      plots[`${x},${y}`] = { soil: "tilled", plant: { by: pick(["a", "b"]), crop, sown: now - Math.floor(age), boost: 0, watered: 0, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0 } };
    }
    await db.exec(`delete from public.town_plots where bed=${bed}`);
    for (const [key, p] of Object.entries(plots)) { const [x, y] = key.split(",").map(Number); await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,$3,$4,$5::jsonb,$6)", [x, y, bed, p.soil, JSON.stringify(p.plant), now - H]); }
    const g = gardenNow(bed, plots, now);
    eq((await one("select town.garden_now($1,$2) g", [bed, now])).g, g, `bed ${bed} as a garden sees it`);
    if (g.good) good++;
    if (g.milkweed) milk++;
    // the garden's haunt at moments over the day, the bed as it is
    for (let m = 0; m < 6; m++) {
      const t = now + Math.floor(rand() * 24 * 60) * 60_000, gt = gardenNow(bed, plots, t);
      const want = swarmAs(swarmAt(WORD, h, t, undefined, undefined, gt), h.id);
      eq((await one("select town.bug_at($1,$2,null,$3) b", [h.id, t, WORD])).b, norm(want), `garden ${h.id} at ${t} (${JSON.stringify(gt)})`);
      if (want) { out++; seenBugs.add(want.bug); assert.ok(gardenDraws(gt)[want.bug] !== undefined, `${want.bug} is one the garden draws`); }
    }
    await db.exec(`delete from public.town_plots where bed=${bed}`);
  }
  assert.ok(good >= 20 && milk >= 10 && out >= 15 && seenBugs.size >= 4, `enough gardens and visitors (${good} good, ${milk} with milkweed, ${out} out, ${[...seenBugs].join(" ")})`); checks++;

  // the farm's count of what eats the crops is the same whatever a garden holds
  const h0 = gardens[0], bed0 = bedOf(Math.floor(h0.perches[0].x), Math.floor(h0.perches[0].y)), [cx, cy] = bedCorner(bed0);
  for (let k = 0; k < 10; k++) {
    const t = T0 + 9 * H + k * 37 * 60_000;
    await db.exec(`delete from public.town_plots where bed=${bed0}`);
    const before = (await one("select town.farm_bugs($1) n", [t])).n;
    for (let n = 0; n < 5; n++) await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,$3,'tilled',$4::jsonb,$5)",
      [cx + n, cy, bed0, JSON.stringify({ by: "a", crop: POLLEN[n], sown: t - 2 * CROPS[POLLEN[n]].hours * H, boost: 0, watered: 0, fed: 0, guard: t + 99 * H, cured: 0, picked: 0, pickedAt: 0 }), t - H]);
    eq((await one("select town.farm_bugs($1) n", [t])).n, before, `the farm's count at ${t} with a good garden`);
  }
  await db.exec(`delete from public.town_plots where bed=${bed0}`);

  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /garden_now|bug_at|farm_bugs/.test(JSON.stringify(b))), [], "no bare write");
  console.log(`v267: ${checks} checks passed (the catalog's insects row, ${old.length} old haunts at 12 moments, 120 beds as gardens with ${good} good and ${milk} with milkweed, ${out} visitors of ${seenBugs.size} kinds, the farm's count, against the code).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
