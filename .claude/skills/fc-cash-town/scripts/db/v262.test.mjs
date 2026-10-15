// v262, compost and the pollen brush, dry-run: the file runs twice (its guards against the chain through v260); the deed
// offered and the care done are the code's (lib/town/farm's deedFor, tend, care) for random plants, hands, owners and
// bags; no browser may call the care; no function writes with no WHERE.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v262.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const trade = await import("@/lib/town/trade");
const { deedFor, tend } = await import("@/lib/town/farm");

const H = 3_600_000, T0 = Date.UTC(2026, 9, 20);
let checks = 0, s = 23;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), pick = (xs) => xs[Math.floor(rand() * xs.length)];
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of ["v253_experience_that_respects_the_work", "v253_a_market_for_selling_or_waiting", "v254_night_meals_and_exact_trades", "v259_a_crop_counts_its_good_care", "v260_produce_keeps_its_grade"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const sql = readFileSync("supabase/v262_compost_and_the_pollen_brush.sql", "utf8");
  await db.exec(sql);
  await db.exec(sql);
  let cared = 0;
  for (let k = 0; k < 400; k++) {
    const now = T0, sown = now - pick([10, 40, 100]) * H, by = pick(["me", "me", "them"]);
    const plant = { by, crop: pick(["tomato", "corn", "chili"]), sown, boost: 0, watered: 0, fed: 0, guard: now + 99 * H, cured: 0, picked: 0, pickedAt: 0,
      ...(rand() < 0.3 ? { compost: sown + H } : {}), ...(rand() < 0.3 ? { brushed: sown + 2 * H } : {}) };
    const plot = { soil: "tilled", plant }, hand = pick(["compost", "pollenBrush", "can", null]);
    const owner = pick(["me", "them", null]), bed = owner ? { by: owner, tended: now - H, empty: 0 } : null;
    const bag = [rand() < 0.7 ? { item: "compost", n: 2 } : null, { item: "pollenBrush", n: 1 }, { item: "can", n: 1, water: 4 }, ...Array(7).fill(null)];
    const purse = { ...trade.newPurse(), bag, hand };
    const want = deedFor("3,3", plot, hand, "me", now, owner);
    eq((await one("select town.deed_for($1,$2::jsonb,$3,$4,$5,$6) d", ["3,3", JSON.stringify(plot), hand, "me", now, owner])).d, want, `the deed offered (${hand}, ${owner}, ${by})`);
    if (want !== "compost" && want !== "brush") continue;
    const got = (await one("select town.tend($1,$2::jsonb,$3::jsonb,$4,$5,$6::jsonb,$7,$8,false) v", ["3,3", JSON.stringify(plot), JSON.stringify(bed), 1, 1, JSON.stringify(purse), "me", now])).v;
    const did = tend("3,3", plot, bed ?? undefined, 1, 1, purse, "me", now, [], false);
    eq(got.ok ?? false, did.ok, `the care done (${want})`);
    if (!did.ok) { eq(got.why, did.why, "the same refusal"); continue; }
    eq(got.deed, did.deed, "the same deed");
    eq(norm(got.plot), norm(did.plot), "the plant as the code leaves it");
    eq(norm(got.purse.bag), norm(did.purse.bag), "the bag as the code leaves it");
    eq(norm(got.purse.stamina), norm(did.purse.stamina), "the stamina as the code leaves it");
    eq(norm(got.bed), norm(did.bed), "the bed as the code keeps it");
    cared++;
  }
  assert.ok(cared >= 40, `enough care done (${cared})`); checks++;
  const bare = await bareWrites((q) => db.query(q).then((r) => r.rows));
  eq(bare.filter((b) => /quality|care|deed_for|tend/.test(JSON.stringify(b))), [], "no bare write");
  for (const role of ["anon", "authenticated"]) eq((await one(`select has_function_privilege('${role}','town.quality_care(text,jsonb,jsonb,text,jsonb,text,bigint)','EXECUTE') a`)).a, false, `${role} may not call the care`);
  console.log(`v262: ${checks} checks passed (${cared} cares and every deed offered against the code; closed; no bare write).`);
} catch (e) {
  console.error("FAIL after", checks, "checks:", e.message?.slice(0, 1500));
  process.exitCode = 1;
} finally {
  await db.close();
}
