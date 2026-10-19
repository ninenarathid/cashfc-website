// v288, a bed handed on or given up, dry-run: the file runs as checked out on Windows (CR at its line ends) and again
// as written; a member hands their bed to another who holds one, and its plants (Quality kept) and insect house become
// theirs, the help on its plants theirs to thank, the bed theirs from now, as lib/town/bed-hand's giveBed has it; one
// who holds two is refused another, a bed not mine cannot be handed on, nor to me, nor to somebody of no character;
// giving a bed up with a full bag is refused while its house stands, and with room every plant is gone, the house in
// the bag, the help forgotten and the bed nobody's, as leaveBed has it; and a bed not mine cannot be given up.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v288.test.mjs
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { bedCorner } = await import("@/lib/town/world");
const { giveBed, leaveBed } = await import("@/lib/town/bed-hand");
const { put } = await import("@/lib/town/trade");

const FILE = process.env.V288_FILE ?? "supabase/v288_a_bed_handed_on_or_given_up.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, what); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
try {
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  for (let n = 276; n <= 287; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch { await db.exec("rollback"); }
  }
  eq((await one("select to_regprocedure('town.well_by(integer,integer)') is not null a")).a, true, "the bench has v287");
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);

  const [me, pal, third] = (await rows("select p.id from public.profiles p order by p.id limit 3")).map((r) => r.id);
  const asOf = (who) => async (q, a = []) => { await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]); await db.query("select set_config('request.jwt.claim.role','authenticated',false)"); await db.exec("set role authenticated"); try { return (await db.query(q, a)).rows[0].r; } finally { await db.exec("reset role"); } };
  const as = asOf(me);
  const t = Number((await one("select town.now_ms() t")).t), H = 3_600_000;
  const plant = (by, crop, extra = {}) => ({ by, crop, sown: t - 2 * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...extra });
  /** Lay a bed: its owner, and its plots (key → plot), with the triggers quiet, as a page would have found it. */
  const lay = async (bed, by, plots) => {
    await db.exec("alter table public.town_plots disable trigger user");
    await db.query("delete from public.town_plots where bed = $1", [bed]);
    for (const [key, p] of Object.entries(plots)) {
      const [x, y] = key.split(",").map(Number);
      await db.query("insert into public.town_plots(x, y, bed, soil, plant, house, changed) values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)", [x, y, bed, p.soil, p.plant ? JSON.stringify(p.plant) : null, p.house ? JSON.stringify(p.house) : null, t - H]);
    }
    await db.exec("alter table public.town_plots enable trigger user");
    if (by) await db.query("insert into public.town_beds(bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0", [bed, by, t - H]);
    else await db.query("delete from public.town_beds where bed = $1", [bed]);
  };
  const plotsOf = async (bed) => Object.fromEntries((await rows("select x, y, soil, plant, house from public.town_plots where bed = $1", [bed])).map((r) => [`${r.x},${r.y}`, { soil: r.soil, plant: r.plant ?? null, ...(r.house ? { house: r.house } : {}) }]));
  const keyOf = (bed, dx, dy) => { const [x, y] = bedCorner(bed); return `${x + dx},${y + dy}`; };
  const house = { by: me, at: t - H, rooms: [null, null] };
  await db.exec("delete from public.town_beds where true");

  // ── handing a bed on ──
  const A = 30, B = 5, C = 31;
  const before = { [keyOf(A, 0, 0)]: { soil: "tilled", plant: plant(me, "kangkong", { q: { at: t - 2 * H, span: 0.4, area: [0.1, 0.2, 0.3, 0.4], nar: [0, 0, 0] } }) }, [keyOf(A, 1, 0)]: { soil: "tilled", plant: plant(me, "chili") }, [keyOf(A, 3, 3)]: { soil: "house", plant: null, house }, [keyOf(A, 5, 5)]: { soil: "tilled", plant: null } };
  await lay(A, me, before);
  await lay(B, pal, { [keyOf(B, 0, 0)]: { soil: "tilled", plant: plant(pal, "kangkong") } });
  await db.query("insert into public.town_plot_help(x, y, helper, owner, water, carry) select x, y, $2, $1, 1, 0 from public.town_plots where bed = $3 and plant is not null", [me, third, A]);
  const fresh = await plotsOf(A), want = giveBed(A, { by: me, tended: t - H, empty: 0 }, fresh, me, pal, 1, t);
  const gave = await as("select public.town_bed_give($1, $2) r", [A, pal]);
  eq([gave.ok, gave.plants, gave.beds[String(A)]?.by], [true, 2, pal], "my bed handed to somebody who holds one: theirs, with its two plants");
  const after = await plotsOf(A);
  assert.ok(want.ok); checks++;
  for (const [key, p] of Object.entries(want.plots)) {
    // (what the Quality trigger keeps of a plant when its bed changes is its own: q, and the house's keep, hg and hs)
    const own = (x) => (x ? { ...x, q: undefined, hg: undefined, hs: undefined } : null);
    eq(own(after[key].plant), own(p.plant), `${key}: the plant is as giveBed makes it (by the taker)`);
    eq(after[key].house ?? null, p.house ?? null, `${key}: its house too`);
  }
  // (its Quality goes with it: the round so far kept, settled to the change, never begun again)
  const qWas = fresh[keyOf(A, 0, 0)].plant.q, qNow = after[keyOf(A, 0, 0)].plant.q;
  eq([qNow.span >= qWas.span, qNow.area.every((v, i) => v >= qWas.area[i])], [true, true], "and its Quality's round is kept, not begun again");
  eq((await one("select member_id from public.town_beds where bed = $1", [A])).member_id, pal, "the bed is the taker's");
  const tended = Number((await one("select tended from public.town_beds where bed = $1", [A])).tended);
  eq(tended >= t && tended - t < 60_000, true, "tended from this moment");
  eq((await rows("select distinct owner from public.town_plot_help h where exists (select 1 from public.town_plots p where p.bed = $1 and p.x = h.x and p.y = h.y)", [A])).map((r) => r.owner), [pal], "the help on its plants is the taker's to thank");
  eq(Object.keys(gave.plots).length >= 3 && gave.plots[keyOf(A, 3, 3)].house.by === pal, true, "the page is told the bed's plots");

  // ── refused: they hold as many as one may; not mine; to myself; to somebody of no character ──
  await lay(C, me, { [keyOf(C, 0, 0)]: { soil: "tilled", plant: plant(me, "kangkong") } });
  eq([(await as("select public.town_bed_give($1, $2) r", [C, pal])).why], ["beds"], "who holds two is handed no third");
  eq([(await as("select public.town_bed_give($1, $2) r", [A, third])).why], ["theirs"], "a bed I no longer hold is not mine to hand on");
  eq([(await as("select public.town_bed_give($1, $2) r", [C, me])).why], ["none"], "nor to myself");
  eq([(await as("select public.town_bed_give($1, $2) r", [C, "00000000-0000-0000-0000-000000000001"])).why], ["none"], "nor to nobody of the town");
  eq([(await as("select public.town_bed_give($1, $2) r", [99, pal])).why], ["none"], "nor a bed that is not");
  eq((await one("select member_id from public.town_beds where bed = $1", [C])).member_id, me, "and the bed is mine still");

  // ── giving a bed up ──
  await lay(C, me, { [keyOf(C, 0, 0)]: { soil: "tilled", plant: plant(me, "kangkong") }, [keyOf(C, 2, 2)]: { soil: "tilled", plant: plant(me, "chili") }, [keyOf(C, 4, 4)]: { soil: "house", plant: null, house } });
  await db.query("insert into public.town_plot_help(x, y, helper, owner, water, carry) select x, y, $2, $1, 1, 0 from public.town_plots where bed = $3 and plant is not null", [me, third, C]);
  const p0 = (await one("select town.purse_of($1, true) p", [me])).p;
  const full = { ...p0, bag: Array(p0.bag.length).fill(null).map(() => ({ item: "stone", n: 99 })) };
  await one("select town.keep_purse($1, $2::jsonb)", [me, JSON.stringify(full)]);
  eq([(await as("select public.town_bed_leave($1) r", [C])).why], ["full"], "with no room in the bag for its house, the bed is not given up");
  eq((await rows("select count(*)::int n from public.town_plots where bed = $1 and plant is not null", [C]))[0].n, 2, "and its plants stand");
  const roomy = { ...p0, bag: put(Array(p0.bag.length).fill(null), "stone", 3) };
  await one("select town.keep_purse($1, $2::jsonb)", [me, JSON.stringify(roomy)]);
  const plotsC = await plotsOf(C), wantLeave = leaveBed(C, { by: me, tended: t - H, empty: 0 }, plotsC, roomy, me, t);
  const left = await as("select public.town_bed_leave($1) r", [C]);
  eq([left.ok, left.plants, String(C) in left.beds], [true, 2, false], "with room: the bed given up, its two plants gone, nobody's");
  assert.ok(wantLeave.ok); checks++;
  const leftPlots = await plotsOf(C);
  for (const [key, p] of Object.entries(wantLeave.plots)) eq({ soil: leftPlots[key].soil, plant: leftPlots[key].plant, house: leftPlots[key].house ?? null }, { soil: p.soil, plant: p.plant, house: p.house ?? null }, `${key}: as leaveBed leaves it`);
  eq(left.purse.bag.filter((s) => s?.item === "insectHouse").reduce((n, s) => n + s.n, 0), 1, "the house in my bag");
  eq(wantLeave.purse.bag.filter((s) => s?.item === "insectHouse").length, 1, "as leaveBed puts it");
  eq((await rows("select count(*)::int n from public.town_plot_help h where exists (select 1 from public.town_plots p where p.bed = $1 and p.x = h.x and p.y = h.y)", [C]))[0].n, 0, "the help on its plants forgotten");
  eq((await rows("select count(*)::int n from public.town_beds where bed = $1", [C]))[0].n, 0, "the bed row gone");
  eq([(await as("select public.town_bed_leave($1) r", [A])).why], ["theirs"], "a bed not mine cannot be given up");
  eq([(await as("select public.town_bed_leave($1) r", [-1])).why], ["none"], "nor a bed that is not");
  // ── partners side by side (Codex's check, 2026-10-19): the Quality trigger writes each one's neighbour as it changes;
  // laid with the triggers on, as a member's sowing lays them, both hand-on and give-up go through ──
  const D = 33, E = 34, F = 35, sown = (bed, by) => {
    const [x, y] = bedCorner(bed);
    return [[x + 1, y + 1, "carrot"], [x + 2, y + 1, "scallion"], [x + 1, y + 2, "scallion"], [x + 2, y + 2, "carrot"]].map(([px, py, crop]) => [px, py, plant(by, crop)]);
  };
  for (const bed of [D, E, F]) {
    await db.query("delete from public.town_plots where bed = $1", [bed]);
    for (const [x, y, p] of sown(bed, me)) await db.query("insert into public.town_plots(x, y, bed, soil, plant, changed) values ($1::int, $2::int, $3, 'tilled', $4::jsonb, $5)", [x, y, bed, JSON.stringify(p), t - H]);
  }
  await db.exec("delete from public.town_beds where member_id in (select id from public.profiles)");
  for (const bed of [D, E]) await db.query("insert into public.town_beds(bed, member_id, tended, empty) values ($1, $2, $3, 0)", [bed, me, t - H]);
  const partnered = (await rows("select count(*)::int n from public.town_plots where bed = $1 and plant->'q'->'bed'->>'p' is not null", [D]))[0].n;
  eq(partnered > 0, true, "the trigger gave the partners their gift as they were sown");
  const gaveD = await as("select public.town_bed_give($1, $2) r", [D, pal]);
  eq([gaveD.ok, gaveD.plants], [true, 4], "a bed of partners handed on");
  eq((await rows("select count(*)::int n from public.town_plots where bed = $1 and plant->>'by' = $2", [D, pal]))[0].n, 4, "every partner the taker's");
  const leftE = await as("select public.town_bed_leave($1) r", [E]);
  eq([leftE.ok, leftE.plants], [true, 4], "a bed of partners given up");
  eq((await rows("select count(*)::int n from public.town_plots where bed = $1 and plant is not null", [E]))[0].n, 0, "every partner gone");
  // (a taker with no purse yet is made one and held: given a bed all the same)
  await db.query("delete from public.town_purses where member_id = $1", [third]);
  await db.query("insert into public.town_beds(bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id", [F, me, t - H]);
  const toNew = await as("select public.town_bed_give($1, $2) r", [F, third]);
  eq([toNew.ok, (await one("select count(*)::int n from public.town_purses where member_id = $1", [third])).n], [true, 1], "to one with no purse yet: made, held and given");
  // (and the deeds are written for the town's record)
  eq((await rows("select what from public.town_deeds where member_id = $1 and what in ('bed_give', 'bed_leave') order by id", [me])).map((r) => r.what), ["bed_give", "bed_leave", "bed_give", "bed_leave", "bed_give"], "each is written as a deed");

  console.log(`v288: ${checks} checks passed`);
} finally { await db.close(); }
