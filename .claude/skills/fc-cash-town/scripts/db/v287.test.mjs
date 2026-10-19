// v287, each well its own water, dry-run: the file runs as checked out on Windows (CR at its line ends) and again as
// written (the second run changes nothing); each function it changes is its text but for the file's PATCHES, word for
// word; the helpers tell the wells and the halves apart as lib/town/world does; a bucket poured at the second well
// fills it and not the first, its lot is the second's, a can filled there takes the second's water and is of its
// carrier, and one filled at the first takes the first's; a plant watered in the southern half takes the second well's
// nature and one in the first half the first's; the page is told both wells.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v287.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
import { PATCHES } from "./build-v287.mjs";
await import("./repo-ts-town.mjs");
const { FARM, WELLS, wellBy, wellOf } = await import("@/lib/town/world");
const { put } = await import("@/lib/town/trade");

const FILE = "supabase/v287_each_well_its_own_water.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const SIGS = PATCHES.map(([sig]) => sig);
const defs = async () => Object.fromEntries(await Promise.all(SIGS.map(async (s) => [s, (await one("select replace(pg_get_functiondef($1::regprocedure), chr(13), '') d", [s])).d])));
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 285; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  eq((await one("select to_regprocedure('town.at_well(integer,integer)') is not null a")).a, true, "the bench has v284");
  const before = await defs();
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const after = await defs();
  await db.exec(sql);
  eq(await defs(), after, "a second run leaves every function as the first made it");
  for (const [sig, list] of PATCHES) eq(after[sig], list.reduce((d, [a, b]) => d.split(a).join(b), before[sig]), `${sig} is its text but for the file's replacements`);

  // ── the helpers are the page's ──
  const tiles = [];
  for (const w of WELLS) for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) tiles.push([w.x + dx, w.y + dy]);
  for (let y = FARM.y; y < FARM.y + FARM.h; y += 3) for (let x = FARM.x; x < FARM.x + FARM.w; x += 5) tiles.push([x, y]);
  const got = await rows("select town.well_by((t->>0)::int, (t->>1)::int) b, town.well_of((t->>0)::int, (t->>1)::int) o from jsonb_array_elements($1::jsonb) t", [JSON.stringify(tiles)]);
  eq(got.map((r) => r.b ?? -1), tiles.map(([x, y]) => wellBy(x, y)), `town.well_by is wellBy on ${tiles.length} tiles`);
  eq(got.map((r) => r.o), tiles.map(([x, y]) => wellOf(x, y)), `town.well_of is wellOf on ${tiles.length} tiles`);
  eq((await one("select town.wells_told() w")).w, [0, 0], "both wells told, the second empty (the bench's first is empty too)");

  // ── a member at either well ──
  const [me, pal] = (await rows("select p.id from public.profiles p order by p.id limit 2")).map((r) => r.id);
  const asOf = (who) => async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0]; } finally { await db.exec("reset role"); } };
  const as = asOf(me), asPal = asOf(pal);
  const hold = async (who, item, water) => {
    const p = (await one("select town.purse_of($1,true) p", [who])).p;
    await one("select town.keep_purse($1,$2::jsonb)", [who, JSON.stringify({ ...p, bag: Array(p.bag.length).fill(null).map((_, i) => (i === 0 ? { item, n: 1, ...(water === undefined ? {} : { water }) } : null)), hand: item, stamina: { day: p.stamina?.day ?? 0, left: 100 } })]);
  };
  await db.exec("update public.town_things set doc = '50'::jsonb where key = 'well'; update public.town_things set doc = '10'::jsonb where key = 'well_south'; delete from public.town_well_water where true");
  await db.query("insert into public.town_well_water (member_id, buckets, well) values ($1, 50, 0), ($2, 10, 1)", [me, me]);
  const [north, south] = WELLS;
  await hold(pal, "bucket", 1);
  const poured = (await asPal("select public.town_chore($1, $2) r", [south.x + 1, south.y])).r;
  eq([poured.ok, poured.chore, poured.well, poured.wells], [true, "pour", 11, [50, 11]], "a bucket poured at the second well: it has eleven, the first fifty still");
  eq((await rows("select member_id, buckets, well from public.town_well_water order by id")).map((r) => [r.member_id === pal, r.buckets, r.well]), [[false, 50, 0], [false, 10, 1], [true, 1, 1]], "the lot is the second well's, of whoever poured it");
  await hold(pal, "can", 0);
  const south1 = (await asPal("select public.town_chore($1, $2) r", [south.x - 1, south.y + 1])).r;
  eq([south1.ok, south1.chore, south1.wells], [true, "fill", [50, 9]], "a can filled at the second well takes two of its eleven");
  eq((await rows("select buckets, well from public.town_well_water order by id")).map((r) => [r.buckets, r.well]), [[50, 0], [8, 1], [1, 1]], "of the second well's oldest water");
  eq((await one("select carrier from public.town_well_cans where member_id = $1 and item = 'can'", [pal])).carrier, me, "and the can's water is of whoever carried it there");
  await hold(me, "can", 0);
  const north1 = (await as("select public.town_chore($1, $2) r", [north.x, north.y + 1])).r;
  eq([north1.ok, north1.chore, north1.wells], [true, "fill", [48, 9]], "a can filled at the first well takes the first's");
  const away = (await as("select public.town_chore($1, $2) r", [south.x + 3, south.y])).r;
  eq([away.ok, away.why], [false, "none"], "and away from both, nothing");

  // ── each half its own well's nature ──
  const t = Number((await one("select town.now_ms() t")).t);
  await db.query("update public.town_things set doc = $1::jsonb where key = 'well_water_south'", [JSON.stringify({ kind: "dawn", until: t + 3_600_000, by: me })]);
  await db.exec("update public.town_things set doc = 'null'::jsonb where key = 'well_water'");
  eq((await one("select town.well_kind_at(0, $1) a, town.well_kind_at(1, $1) b, town.well_kind($1) c", [t])), { a: null, b: "dawn", c: null }, "the second well's water has a nature, the first's none");
  eq((await one("select town.well_waters_told($1) w", [t])).w, [null, { kind: "dawn", until: t + 3_600_000, by: me }], "both told");
  const adds = (await one("select (town.cat('waters')->'adds'->>'dawn')::double precision m")).m;
  const watered = async (x, y) => {
    const key = `${x},${y}`, plant = { by: me, crop: "kangkong", sown: t - 3_600_000, boost: 0, watered: t - 7_200_000, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0 };
    await db.exec(`alter table public.town_plots disable trigger user; alter table public.town_plots enable trigger town_plots_heat`);
    await db.query("delete from public.town_plots where x = $1 and y = $2", [x, y]);
    await db.query("insert into public.town_plots(x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, $4)", [x, y, JSON.stringify(plant), t - 7_200_000]);
    await db.query("update public.town_plots set plant = plant || jsonb_build_object('boost', 1000, 'watered', $3::bigint), changed = $3 where x = $1 and y = $2", [x, y, t]);
    const boost = (await one("select (plant->>'boost')::double precision b from public.town_plots where x = $1 and y = $2", [x, y])).b;
    await db.exec(`alter table public.town_plots enable trigger user`);
    return boost;
  };
  const heat = (await one("select case when town.hot($1) then (town.cat('heat')->>'by')::double precision else 0 end h", [t])).h;
  const southPlot = await watered(FARM.x + 5, FARM.y + 50), northPlot = await watered(FARM.x + 5, FARM.y + 6);
  assert.ok(adds > 0); checks++;
  eq(northPlot, 1000 + 1000 * heat, "a plant watered in the first half: no nature (its well's water has none)");
  eq(southPlot, 1000 + 1000 * (heat + adds), "a plant watered in the southern half takes the second well's dawn");

  // ── the farm, as a page reads it ──
  const farm = (await as("select public.town_farm(0) r")).r;
  eq([farm.well, farm.wells, farm.wellWaters?.[1]?.kind ?? null], [48, [48, 9], "dawn"], "the farm tells both wells and both waters");

  console.log(`v287: ${checks} checks passed`);
} finally { await db.close(); }
