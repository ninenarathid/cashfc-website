// v284, the farm's southern half, dry-run: the file runs as checked out on Windows (CR at its line ends) and again as
// written (the second run changes nothing); each catalog row it touches is the row it was but for the entries meant,
// and those are the code's (lib/town/catalog); town.bed_of is lib/town/world's bedOf on every tile of the farm and its
// rim; the two tables keyed by bed take bed 47 and refuse 48; the two functions are their text but for the cloud's
// range; town.reward_relay_place is lib/town/reward-relay's relayPlace; and a member who holds two beds is refused a
// third in the new half, and given it once they hold one.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v284.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { BEDS_IN_FARM, FARM, bedCorner, bedOf } = await import("@/lib/town/world");
const { relayPlace } = await import("@/lib/town/reward-relay");
const { BEDS } = await import("@/lib/town/farm");
const { put } = await import("@/lib/town/trade");

const FILE = "supabase/v284_the_farms_southern_half.sql";
const SIGS = ["public.town_reward(uuid,jsonb)", "town.reward_cloud(jsonb,jsonb,uuid,uuid,jsonb,jsonb,jsonb,text,bigint,bigint)", "town.reward_relay_place(jsonb)"];
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const code = catalogOf();
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const cat = async () => Object.fromEntries((await rows("select key, data from public.town_catalog")).map((r) => [r.key, r.data]));
const defs = async () => Promise.all(SIGS.map(async (s) => (await one("select replace(pg_get_functiondef($1::regprocedure), chr(13), '') d", [s])).d));
const checksOn = async () => (await rows("select conrelid::regclass::text t, pg_get_constraintdef(oid) c from pg_constraint where contype = 'c' and conrelid in ('town.reward_conduits'::regclass, 'town.reward_cloud_consents'::regclass) order by 1")).map((r) => `${r.t} ${r.c}`);
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  // (the files after v275 that the bench can run; v279 needs the site's member_contacts, which is not the town's)
  for (let n = 276; n <= 281; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  const before = await cat(), [rewardWas, cloudWas, relayWas] = await defs();
  eq(before.farming.bedsAt.length, 24, "the bench has the first 24 beds");

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  const after = await cat(), defsAfter = await defs(), consAfter = await checksOn();
  await db.exec(sql);
  eq(await cat(), after, "a second run leaves the catalog as the first made it");
  eq(await defs(), defsAfter, "a second run leaves the functions as the first made them");
  eq(await checksOn(), consAfter, "a second run leaves the tables' checks as the first made them");

  // ── the catalog: each row as it was but for what was meant, and that the code's ──
  const want = structuredClone(before);
  want.farming.bedsAt = code.farming.bedsAt;
  want.rewards.cloudCorners = code.farming.bedsAt;
  want.cooking.map.farm = code.cooking.map.farm;
  want.ground.maps = before.ground.maps.map((m) => (JSON.stringify(m) === "[128,0,60,44]" ? code.ground.maps[1] : m));
  want.insects.nectar.maps = code.insects.nectar.maps;
  want.insects.haunts = code.insects.haunts;
  for (const key of Object.keys(want)) eq(after[key], want[key], `the catalog's ${key} row`);
  eq(after.farming.bedsAt.length, BEDS_IN_FARM, "48 beds");
  eq(after.farming.bedsAt.slice(0, 24), before.farming.bedsAt, "none of the first 24 moved");
  eq(after.insects.haunts.slice(0, before.insects.haunts.length), before.insects.haunts, "no haunt moved or changed its number");
  eq(after.farming.beds, { each: 2, empty: 24, untended: 96 }, "one person holds two beds at most, as before");
  eq(BEDS.each, 2, "and so does the page");

  // ── town.bed_of is bedOf on every tile of the farm and a step round it ──
  const tiles = [];
  for (let y = FARM.y - 2; y < FARM.y + FARM.h + 2; y++) for (let x = FARM.x - 2; x < FARM.x + FARM.w + 2; x++) tiles.push([x, y]);
  const got = await rows("select (t->>0)::int x, (t->>1)::int y, town.bed_of((t->>0)::int, (t->>1)::int) b from jsonb_array_elements($1::jsonb) t", [JSON.stringify(tiles)]);
  eq(got.map((r) => r.b), tiles.map(([x, y]) => bedOf(x, y)), `town.bed_of on ${tiles.length} tiles`);
  for (let b = 0; b < BEDS_IN_FARM; b++) eq(got.filter((r) => r.b === b).length, 49, `bed ${b} has 49 plots`);
  eq(bedCorner(47), [177, 75], "the last bed's corner");

  // ── the tables keyed by bed ──
  for (const t of ["town.reward_conduits", "town.reward_cloud_consents"]) {
    const col = t.endsWith("conduits") ? "until_ms" : "doc", val = t.endsWith("conduits") ? "0" : "'{}'::jsonb";
    await db.exec(`insert into ${t}(bed, ${col}) values (47, ${val}); delete from ${t} where bed = 47`); checks++;
    await assert.rejects(db.exec(`insert into ${t}(bed, ${col}) values (48, ${val})`), /check/, `${t} refuses bed 48`); checks++;
    await assert.rejects(db.exec(`insert into ${t}(bed, ${col}) values (-1, ${val})`), /check/, `${t} refuses bed -1`); checks++;
  }

  // ── the two functions: their text but for the range ──
  const [rewardNow, cloudNow, relayNow] = defsAfter;
  eq(rewardNow, rewardWas.replace("not between 0 and 23", "not between 0 and 47"), "public.town_reward but for the range");
  eq(cloudNow, cloudWas.replace("not between 0 and 23", "not between 0 and 47"), "town.reward_cloud but for the range");
  assert.notEqual(relayNow, relayWas); checks++;
  const spots = [];
  for (const [x0, y0, w, h] of [[0, 0, 64, 64], [FARM.x, FARM.y, FARM.w, FARM.h], [144, 112, 96, 80]]) for (const [x, y] of [[x0, y0], [x0 - 1, y0], [x0 + w - 1, y0 + h - 1], [x0 + w, y0 + h - 1], [x0 + w - 1, y0 + h], [x0 + 5, y0 + 43], [x0 + 5, y0 + 44], [x0 + 5, y0 + 85], [x0 + 5, y0 + 86]]) spots.push([x, y]);
  const places = await rows("select town.reward_relay_place(t) p from jsonb_array_elements($1::jsonb) t", [JSON.stringify(spots)]);
  eq(places.map((r) => r.p), spots.map((s) => relayPlace(s)), "town.reward_relay_place is relayPlace");

  // ── the rule of two beds, through public.town_tend, in a bed of the new half ──
  const me = (await one("select p.id from public.profiles p order by p.id limit 1"))?.id;
  const seed = Object.keys(code.farming.seeds)[0];
  const as = async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [me]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0]; } finally { await db.exec("reset role"); } };
  const now = Number((await one("select town.now_ms() t")).t);
  const purse = (await one("select town.purse_of($1,true) p", [me])).p;
  await one("select town.keep_purse($1,$2::jsonb)", [me, JSON.stringify({ ...purse, bag: put(Array(purse.bag.length).fill(null), seed, 5), hand: seed, stamina: { day: purse.stamina?.day ?? 0, left: 100 } })]);
  await db.exec("delete from public.town_beds where true");
  for (const b of [0, 1]) await db.query("insert into public.town_beds(bed, member_id, tended, empty) values ($1, $2, $3, 0)", [b, me, now]);
  const [nx, ny] = bedCorner(30), tile = [nx + 3, ny + 3];
  await db.exec("delete from public.town_plots where bed = 30");
  await db.query("insert into public.town_plots(x, y, bed, soil, plant, changed) values ($1, $2, 30, 'tilled', null, $3)", [tile[0], tile[1], now]);
  const game = JSON.stringify({ hits: 3, misses: 0, secs: 2 });
  const third = (await as("select public.town_tend($1, $2, $3::jsonb, false) r", [...tile, game])).r;
  eq([third.ok, third.why], [false, "beds"], "holding two beds, a member is refused a third in the new half");
  eq((await one("select count(*)::int n from public.town_beds where bed = 30")).n, 0, "and the bed stays nobody's");
  await db.exec("delete from public.town_beds where bed = 1");
  const second = (await as("select public.town_tend($1, $2, $3::jsonb, false) r", [...tile, game])).r;
  eq([second.ok, second.deed, second.plot?.plant?.crop], [true, "sow", code.farming.seeds[seed]], "holding one, they sow in the new half");
  eq((await one("select member_id from public.town_beds where bed = 30")).member_id, me, "and bed 30 is theirs");

  console.log(`v284: ${checks} checks passed`);
} finally { await db.close(); }
