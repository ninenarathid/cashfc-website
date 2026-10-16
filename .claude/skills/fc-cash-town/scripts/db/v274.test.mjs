// v274, the farming line's own pouch and the farm's produce stacked twice as high, dry-run: the file runs twice (its
// guards against the chain through v273); the catalog's stacks and pouches are the code's; then, the Quality's salt
// set empty so that the draws are the code's (lib/town/pouches, farm, gardening):
//   * the pouches as the purse keeps them, and room, holding, stowing (with grades), taking out (the bag first), using
//     up (the pouches first), and moving a slot to the bag and back, over random purses (the farm's pouch, the creel,
//     the sack, none; graded produce, seeds, fish, stone, tools; pouches kept wrongly): each the code's to the digit;
//   * pickings into the pouch first, then the bag (by hand, giants, the twine's fruit, the seeds given back), with the
//     pouch empty, part full and full, and the refusal when nothing fits: the code's;
//   * the crescent sickle's sweep with its one more into the pouch: the code's;
//   * sowing from the pouch first, a row of the seed pouch counting the pouch's seeds and sparing back where they were
//     taken: the code's;
//   * the bigger stacks in the bag and the pouch (forty of a crop to a slot, seeds as they were);
//   * the move's deed in words; the new functions closed to a browser; no bare write.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v274.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN, FILE, SIGS } from "./build-v274.mjs";
// (the code read is the tree it is run in, FC_REPO or not)
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const farm = await import("@/lib/town/farm");
const { gardenHarvest } = await import("@/lib/town/gardening");
const P = await import("@/lib/town/pouches");
const trade = await import("@/lib/town/trade");
const { CROPS, ITEMS } = await import("@/lib/town/items");
const { bedCorner, rowOf, BEDS_IN_FARM } = await import("@/lib/town/world");
const { dayOf } = await import("@/lib/town/stamina");

const H = 3_600_000, T = Date.UTC(2026, 9, 20, 5), ME = "00000000-0000-0000-0000-0000000000a1";
let checks = 0, s = 274;
const norm = (x) => JSON.parse(JSON.stringify(x ?? null));
const diffOf = (a, b, at = "") => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (a && b && typeof a === "object" && typeof b === "object") return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => diffOf(a[k], b[k], `${at}.${k}`));
  return [`${at}: ${JSON.stringify(a)?.slice(0, 200)} against ${JSON.stringify(b)?.slice(0, 200)}`];
};
const eq = (a, b, what) => { try { assert.deepEqual(a, b); } catch { assert.fail(`${what}:\n  ${diffOf(norm(a), norm(b)).slice(0, 12).join("\n  ")}`); } checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647), int = (n) => Math.floor(rand() * n), pick = (xs) => xs[int(xs.length)];

const CROPS_ = ["tomato", "corn", "kangkong", "pumpkin", "mint", "cabbage", "carrot"], SEEDS = ["seedTomato", "seedCorn", "seedPumpkin"], OTHER = ["minnow", "stone", "log", "rod", "salt", "compost"];
const stackOf = (pool = [...CROPS_, ...CROPS_, ...SEEDS, ...OTHER]) => {
  const item = pick(pool), most = ITEMS[item].stack, n = 1 + int(most), g = CROPS_.includes(item) ? pick([0, 0, 1, 2, 3]) : 0;
  return g ? { item, n, grade: g } : { item, n };
};
const bagOf = (len = 8 + int(5), empty = 0.35) => Array.from({ length: len }, () => (rand() < empty ? null : stackOf()));
const pouchOf = (len, pool) => Array.from({ length: len }, () => (rand() < 0.4 ? null : rand() < 0.06 ? { item: pick(OTHER), n: 3 } : rand() < 0.04 ? { item: pick(CROPS_), n: 99, grade: 7 } : stackOf(pool)));
const purseOf = (over = {}) => {
  const had = [...(rand() < 0.8 ? ["thingPouch"] : []), ...(rand() < 0.3 ? ["thingCreel"] : []), ...(rand() < 0.2 ? ["thingSack"] : [])];
  // (now and then a bag and a pouch with no room at all: what is refused for want of it)
  const crammed = rand() < 0.15, pouches = rand() < 0.1 ? undefined : { ...(rand() < 0.85 ? { thingPouch: crammed ? Array.from({ length: 6 }, () => ({ item: "seedTomato", n: 10 })) : pouchOf(pick([6, 6, 6, 4, 8]), [...CROPS_, ...SEEDS]) } : {}), ...(rand() < 0.5 ? { thingCreel: pouchOf(5, ["minnow"]) } : {}), ...(rand() < 0.3 ? { thingSack: pouchOf(5, ["stone"]) } : {}) };
  return { ...trade.newPurse(), stamina: { day: dayOf(T), left: 100 }, bag: crammed ? [stackOf(CROPS_), ...Array.from({ length: 9 }, () => ({ item: "rod", n: 1 }))] : bagOf(), gifts: { had, charms: [] }, ...(pouches ? { pouches } : {}), ...over };
};

const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
const v = async (q, a) => (await one(q, a)).v;
const defsOf = async () => Promise.all(SIGS.map(async (sig) => (await one(`select pg_get_functiondef('${sig}'::regprocedure) d`)).d));
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  const OLD = await defsOf(), sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  const NEW = await defsOf();
  for (const [i, sig] of SIGS.entries()) ok(OLD[i] !== NEW[i], `${sig} written over`);

  // the catalog: the stacks and the pouches the code's
  const items = (await one("select data from public.town_catalog where key='items'")).data, pouches = (await one("select data from public.town_catalog where key='pouches'")).data;
  eq([items.kangkong.stack, items.cabbage.stack, items.pumpkin.stack, items.mint.stack, items.seedKangkong.stack, items.minnow.stack], [40, 20, 10, 40, 10, 20], "the farm's produce stacks twice as high, seeds and fish as they were");
  for (const id of Object.keys(CROPS)) eq(items[id].stack, ITEMS[id].stack, `${id}'s stack`);
  eq(pouches.map((p) => [p.gift, p.slots, p.holds.length]), P.POUCHES.map((p) => [p.gift, p.slots, p.holds.length]), "the pouches");
  eq(pouches.find((p) => p.gift === "thingPouch").holds, [...P.FARM_HOLDS], "what the farm's pouch holds");
  eq(await v("select town.deed_th('move') v"), "ย้ายผักในแปลงด้วยจอบต้องมนตร์", "the move in words");
  await db.exec("update town.quality_salt set salt='' where one");
  await db.exec("delete from public.town_weather where true; delete from public.town_swarms where true");

  /* ── the pouches' rules ── */
  const ALL = [...CROPS_, ...SEEDS, ...OTHER];
  let stowed = 0, intoPouch = 0, graded = 0, moved = 0, refused = { full: 0, none: 0 };
  for (let k = 0; k < 500; k++) {
    const purse = purseOf(), J = JSON.stringify(purse), id = pick(ALL), g = CROPS_.includes(id) ? pick([0, 1, 2, 3]) : 0;
    eq(norm(await v("select town.pouches_of($1::jsonb) v", [J])), norm(P.pouchesOf(purse).map((p) => ({ gift: p.pouch.gift, slots: p.slots, holds: [...p.pouch.holds] }))), "the pouches as kept");
    const room = P.roomIn(purse, id, g);
    eq(await v("select town.room_in_g($1::jsonb,$2,$3) v", [J, id, g]), room, `room for ${id} ★${g}`);
    eq(await v("select town.room_in($1::jsonb,$2) v", [J, id]), P.roomIn(purse, id), `room for ${id}`);
    eq(await v("select town.held_in($1::jsonb,$2) v", [J, id]), P.heldIn(purse, id), `${id} held`);
    const n = 1 + int(Math.max(1, Math.min(room, 90)));
    if (room >= n) {
      const want = P.stow(purse, id, n, g);
      eq(norm(await v("select town.stow_away_g($1::jsonb,$2,$3,$4) v", [J, id, n, g])), norm(want), `${n} ${id} ★${g} stowed`);
      stowed++; if (P.heldIn(want, id) - trade.held(want.bag, id) > P.heldIn(purse, id) - trade.held(purse.bag, id)) intoPouch++; if (g) graded++;
    }
    const things = Array.from({ length: 1 + int(3) }, () => { const t = pick(ALL), tg = CROPS_.includes(t) ? pick([0, 1, 2, 3]) : 0, tn = 1 + int(60); return tg ? [t, tn, tg] : [t, tn]; });
    eq(norm(await v("select town.stow_all($1::jsonb,$2::jsonb) v", [J, JSON.stringify(things)])), norm(P.stowAll(purse, things)), `stowed together ${JSON.stringify(things)}`);
    const has = P.heldIn(purse, id), take = 1 + int(Math.max(1, has));
    if (has >= take) {
      eq(norm(await v("select town.take_out($1::jsonb,$2,$3) v", [J, id, take])), norm(P.takeOut(purse, id, take)), `${take} ${id} taken out`);
      eq(norm(await v("select town.use_up($1::jsonb,$2,$3) v", [J, id, take])), norm(P.useUp(purse, id, take)), `${take} ${id} used up`);
    }
    const gift = pick(["thingPouch", "thingPouch", "thingCreel", "thingSack", "thingBundle"]), slot = int(7) - (rand() < 0.05 ? 3 : 0);
    const out = P.pouchToBag(purse, gift, slot);
    eq(norm(await v("select town.pouch_to_bag($1::jsonb,$2,$3) v", [J, gift, slot])), norm(out), `the slot ${slot} of ${gift} into the bag`);
    if (!out.ok) refused[out.why]++; else moved++;
    const bslot = int(purse.bag.length + 1) - (rand() < 0.03 ? 2 : 0), back = P.bagToPouch(purse, bslot);
    eq(norm(await v("select town.bag_to_pouch($1::jsonb,$2) v", [J, bslot])), norm(back), `the bag's slot ${bslot} into a pouch`);
    if (back.ok) moved++; else refused[back.why]++;
  }
  ok(stowed > 200 && intoPouch > 80 && graded > 50 && moved > 150 && refused.full > 10 && refused.none > 40, `the pouches' rules of every sort (stowed ${stowed}, into a pouch ${intoPouch}, graded ${graded}, moved ${moved}, refused ${JSON.stringify(refused)})`);

  /* ── pickings into the pouch first ── */
  const TOOLS = ["gardenTwine", "seedTray", "graftKnife"];
  let picks = 0, pouched = 0, fullRefused = 0, giants = 0, twined = 0;
  for (let k = 0; k < 300; k++) {
    const [bx, by] = bedCorner(int(BEDS_IN_FARM)), key = `${bx + 1 + int(5)},${by + 1 + int(5)}`, crop = pick(["tomato", "corn", "pumpkin", "cabbage", "mint", "kangkong", "carrot"]), c = CROPS[crop], picks_ = c.picks ?? 1;
    const plant = { by: ME, crop, sown: T - Math.ceil((c.hours + 1) * (1 + rand())) * H - (picks_ + 2) * Math.ceil(c.again ?? 1) * H, boost: 0, watered: 0, fed: 0, guard: T + 999 * H, cured: 0, picked: 0, pickedAt: 0,
      q: { at: T - (1 + int(20)) * H, span: 0.3 + rand(), area: [rand(), rand(), rand(), rand()].map((a) => a * 0.95), nar: [rand() * 0.3, 0, 0] } };
    if (picks_ > 1 && rand() < 0.3) { plant.picked = 1; plant.pickedAt = T - Math.ceil((c.again ?? 1) * 1.3) * H; }
    if (rand() < 0.15) { plant.giant = true; plant.root = key; plant.footprint = [key]; } else if (rand() < 0.4) { plant.root = key; plant.footprint = [key]; }
    const fill = pick(["empty", "part", "part", "full", "crammed"]), tools = TOOLS.filter(() => rand() < 0.4);
    const bag = fill === "crammed" ? Array.from({ length: 10 }, () => ({ item: "rod", n: 1 })) : [...tools.map((t) => ({ item: t, n: 1 })), ...bagOf(6, 0.6)];
    if (fill === "crammed") tools.forEach((t, i) => (bag[i] = { item: t, n: 1 }));
    const pouch = fill === "empty" ? Array(6).fill(null) : fill === "part" ? pouchOf(6, [...CROPS_, ...SEEDS]).map((x) => (x?.item === "minnow" || x?.grade === 7 ? null : x)) : Array.from({ length: 6 }, () => ({ item: "seedTomato", n: 10 }));
    const purse = { ...trade.newPurse(), stamina: { day: dayOf(T), left: 100 }, bag, gifts: { had: ["thingPouch", ...(rand() < 0.4 ? ["famMandrake"] : [])], charms: [], familiar: rand() < 0.5 ? "famMandrake" : null }, pouches: { thingPouch: pouch } };
    const plot = { soil: "tilled", plant }, plots = { [key]: plot };
    const got = await v("select town.pick($1,$2::jsonb,$3::jsonb,true,null,$4,$5) v", [key, JSON.stringify(purse), JSON.stringify(plot), T, ME]);
    const base = farm.pick(key, purse, plot, true, null, T, [], ME), want = base.ok ? gardenHarvest(key, plots, purse, base, ME, T, []) : base;
    eq(norm(got), norm(want), `a picking of ${crop} at ${key}, the pouch ${fill}`);
    picks++;
    if (!want.ok) { if (want.why === "full") fullRefused++; continue; }
    if (P.heldIn(want.purse, crop) - trade.held(want.purse.bag, crop) > P.heldIn(purse, crop) - trade.held(purse.bag, crop)) pouched++;
    if (plant.giant) giants++;
    if (tools.includes("gardenTwine") && plant.root) twined++;
  }
  ok(pouched > 60 && fullRefused > 10 && giants > 5 && twined > 5, `pickings of every sort (${picks}: into the pouch ${pouched}, refused full ${fullRefused}, giants ${giants}, twine ${twined})`);

  /* ── the sickle's sweep ── */
  let swept = 0;
  for (let k = 0; k < 60; k++) {
    const bed = int(BEDS_IN_FARM), [bx, by] = bedCorner(bed), y = by + int(7), keys = rowOf(bx, y).map(([u, w]) => `${u},${w}`), plots = {};
    for (const key of keys) if (rand() < 0.85) { const crop = pick(["tomato", "eggplant", "cabbage", "carrot", "scallion"]), c = CROPS[crop]; plots[key] = { soil: "tilled", plant: { by: ME, crop, sown: T - (c.hours + 2) * H, boost: 0, watered: 0, fed: 0, guard: T + 999 * H, cured: 0, picked: 0, pickedAt: 0, q: { at: T - H, span: 1, area: [rand(), rand(), rand(), rand()], nar: [0, 0, 0] } } }; }
    const at = pick(Object.keys(plots).length ? Object.keys(plots) : keys), marks = Object.fromEntries(Object.keys(plots).map((key) => [key, rand() < 0.7]));
    const purse = { ...trade.newPurse(), stamina: { day: dayOf(T), left: 100 }, bag: bagOf(6, 0.5), gifts: { had: ["charmSickle", "thingPouch"], charms: ["charmSickle"] }, pouches: { thingPouch: pick([Array(6).fill(null), pouchOf(6, CROPS_).map((x) => (x?.grade === 7 || x?.item === "minnow" ? null : x))]) } };
    const bedKept = { by: ME, tended: T - H, empty: 0 };
    const got = await v("select town.row_tend($1,$2::jsonb,$3::jsonb,$4::jsonb,0,0,$5::jsonb,$6,$7,$8::jsonb) v", [at, JSON.stringify(keys), JSON.stringify(plots), JSON.stringify(bedKept), JSON.stringify(purse), ME, T, JSON.stringify(marks)]);
    const want = farm.rowTend(at, keys, plots, bedKept, 0, 0, purse, ME, T, marks, []);
    eq(norm(got), norm(want), `a sweep from ${at}`);
    if (want.ok && want.deed === "pick") swept++;
  }
  ok(swept > 20, `sweeps (${swept})`);

  /* ── sowing from the pouch first ── */
  let sownFromPouch = 0, rows = 0, spared = 0;
  for (let k = 0; k < 120; k++) {
    const seed = pick(SEEDS), inBag = 1 + int(4), inPouch = pick([0, 0, 1, 3, 6, 12]), [bx, by] = bedCorner(int(BEDS_IN_FARM)), y = by + int(7), keys = rowOf(bx, y).map(([u, w]) => `${u},${w}`);
    const pouch = Array(6).fill(null);
    if (inPouch) { pouch[int(6)] = { item: seed, n: Math.min(10, inPouch) }; if (inPouch > 10) pouch[(pouch.findIndex((x) => x) + 1) % 6] = { item: seed, n: inPouch - 10 }; }
    const base = { ...trade.newPurse(), stamina: { day: dayOf(T), left: 100 }, bag: [{ item: seed, n: inBag }, null, null], gifts: { had: ["thingPouch"], charms: [] }, pouches: { thingPouch: pouch } };
    const purse = trade.hold(base, 0).purse, plots = Object.fromEntries(keys.filter(() => rand() < 0.8).map((key) => [key, { soil: "tilled", plant: null }]));
    const at = pick(Object.keys(plots).length ? Object.keys(plots) : keys), plot = plots[at] ?? { soil: "wild", plant: null };
    eq(norm(await v("select town.sow($1::jsonb,$2::jsonb,$3,$4,$5) v", [JSON.stringify(purse), JSON.stringify(plot), seed, ME, T])), norm(farm.sow(purse, plot, seed, ME, T)), `a ${seed} sown, ${inBag} in the bag and ${inPouch} in the pouch`);
    if (farm.sow(purse, plot, seed, ME, T).ok && inPouch) sownFromPouch++;
    eq(norm(await v("select town.row_for($1,$2::jsonb,$3::jsonb,$4::jsonb,$5,$6,$7) v", [at, JSON.stringify(keys), JSON.stringify(plots), JSON.stringify(purse), ME, T, null])), norm(farm.rowFor(at, keys, plots, purse, ME, T, null)), `the row from ${at}`);
    const got = await v("select town.row_tend($1,$2::jsonb,$3::jsonb,null,0,0,$4::jsonb,$5,$6,'{}'::jsonb) v", [at, JSON.stringify(keys), JSON.stringify(plots), JSON.stringify(purse), ME, T]);
    const want = farm.rowTend(at, keys, plots, undefined, 0, 0, purse, ME, T, {}, []);
    eq(norm(got), norm(want), `a row sown from ${at}, ${inBag} in the bag and ${inPouch} in the pouch`);
    if (want.ok) { rows++; if (want.each.length > (want.seeds ?? 0)) spared++; }
  }
  ok(sownFromPouch > 30 && rows > 30 && spared > 15, `sowings (${sownFromPouch} from the pouch first, ${rows} rows, ${spared} sparing seeds)`);

  /* ── closed ── */
  for (const sig of ["town.room_in_g(jsonb,text,integer)", "town.stow_away_g(jsonb,text,integer,integer)", "town.use_up(jsonb,text,integer)"])
    for (const role of ["anon", "authenticated"]) eq((await one("select has_function_privilege($1,$2,'EXECUTE') ok", [role, sig])).ok, false, `${role} may not call ${sig}`);
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v274: ${checks} checks passed (pouch rules: ${stowed} stowings, ${moved} moves; ${picks} pickings, ${pouched} into the pouch, ${fullRefused} refused full; ${swept} sweeps; ${rows} rows sown).`);
} finally { await db.close(); }
