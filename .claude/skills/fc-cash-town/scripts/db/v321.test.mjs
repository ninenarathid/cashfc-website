// v321, a giant helped whole and an easier cross-pairing brush, dry-run: the file runs twice (CR at its line ends, and as
// written) and the second run changes no function; town.quality_share and town.quality_bed_gift are lib/town/quality's
// coveredShare and the house's cover case by case; a giant set down before the file with half-bar helpers comes out of it
// with whole ones, its round settled and its `changed` moved; town.brush_choices and town.garden_cross are lib/town/
// gardening's brushChoices and gardenCross case by case; town.reward_garden's gardenBrush takes a young root, an unfound
// child, refuses one pair alone and the same child again without spending, and spends a use to change; anon and a member
// may not call town.brush_choices.
//   cd <the tree> && FC_REPO=<the tree> V321_BENCH=<a bench through v317, as the scratch bench320.mjs keeps it> node .claude/skills/fc-cash-town/scripts/db/v321.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
await import("./repo-ts-town.mjs");
const { coveredShare, coverOffsets } = await import("@/lib/town/quality");
const { brushChoices, gardenCross } = await import("@/lib/town/gardening");
const { bedCorner } = await import("@/lib/town/world");
const { CROPS } = await import("@/lib/town/items");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v321_a_giant_helped_whole_and_an_easier_brush.sql";
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V321_BENCH)]) });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(replace(pg_get_functiondef(p.oid),chr(13),'')) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'town' order by 1, 2")).map((r) => r.proname + r.d).join();
const as = async (who, q, a = []) => {
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [who === "anon" ? "" : who]);
    await db.query("select set_config('request.jwt.claims', $1, false)", [JSON.stringify(who === "anon" ? { role: "anon" } : { sub: who, role: "authenticated" })]);
    await db.exec(`set role ${who === "anon" ? "anon" : "authenticated"}`);
    return { row: (await db.query(q, a)).rows[0] };
  } catch (e) { return { error: e.message }; } finally { await db.exec("reset role"); }
};

const ME = "11111111-1111-4111-8111-111111111111", YOU = "22222222-2222-4222-8222-222222222222";
const [bx, by] = bedCorner(0), K = (x, y) => `${bx + x},${by + y}`, now = Number((await one("select town.now_ms() t")).t);
const plant = (crop, o = {}) => ({ by: ME, crop, sown: now - CROPS[crop].hours * 3600000 - 60000, boost: 0, watered: 0, fed: 0, guard: now + 86400000, cured: 0, picked: 0, pickedAt: 0, ...o });
// (guarded, as the repo's own tests have them: an unguarded plant may meet a pest by the hour's roll, and die)
const young = (crop, o = {}) => plant(crop, { sown: now - 60000, ...o });
const put = async (plots) => { for (const [k, p] of Object.entries(plots)) { const [x, y] = k.split(",").map(Number); await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,$2,0,'tilled',$3,$4) on conflict(x,y) do update set soil='tilled',plant=excluded.plant,changed=excluded.changed", [x, y, p ? JSON.stringify(p) : null, now]); } };
const clear = () => db.query("delete from public.town_plots where bed = 0");

try {
  // ── a giant set down before v321, with a runner bean (plus, soil) and a marigold (ring, guard) beside it
  await clear();
  const cells = [K(2, 2), K(3, 2), K(2, 3), K(3, 3)], giant = plant("pumpkin", { root: K(2, 2), footprint: cells, giant: true, sown: now - 3600000 });
  await put({ [K(1, 2)]: plant("runnerBean"), [K(4, 3)]: plant("marigold"), ...Object.fromEntries(cells.map((k) => [k, giant])) });
  const before = await one("select plant->'q' q, changed from public.town_plots where x=$1 and y=$2", [bx + 2, by + 2]);
  eq(before.q?.bed?.c, { soil: 0.25, guard: 0.5 }, "before v321 the giant's helpers count by their share of its plots");

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  // (what v321 leaves, for its guards: build-v321's NEW_MD5)
  const md5s = {};
  for (const n of ["quality_share", "quality_bed_gift", "garden_cross", "reward_garden"]) md5s[n] = (await one(`select md5(replace(pg_get_functiondef(p.oid),chr(13),'')) m from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='town' and p.proname=$1`, [n])).m;
  console.log(`  NEW_MD5=${JSON.stringify(md5s)}`);
  const after =await one("select plant->'q' q, changed from public.town_plots where x=$1 and y=$2", [bx + 2, by + 2]);
  eq(after.q?.bed?.c, { soil: 1, guard: 1 }, "after v321 the giant's helpers count whole");
  eq(Number(after.q.at) >= now && Number(after.changed) > Number(before.changed), true, "its round settled to the run and its plot marked changed");
  eq(after.q.area.map((a, i) => a >= before.q.area[i] - 1e-12), [true, true, true, true], "what it had gathered is kept");
  await db.exec(sql);
  const first = await fns();
  await db.exec(sql);
  eq(await fns(), first, "a run again changes no function");
  const third = await one("select plant->'q' q from public.town_plots where x=$1 and y=$2", [bx + 2, by + 2]);
  eq(third.q.at, after.q.at, "a run again leaves the giant's round as it was (its gift already the new one)");

  // ── town.quality_share against coveredShare
  const shapes = ["plus", "x", "ring", "line", "fig"], mines = [[K(2, 2)], cells, [K(3, 3), K(4, 3)]];
  for (const shape of shapes) for (const rot of [0, 1]) for (const mine of mines) for (const [hx, hy] of [[1, 2], [4, 4], [0, 0], [2, 5], [5, 2], [3, 1]]) {
    const at = K(hx, hy), sqlShare = Number((await one("select town.quality_share($1,$2,$3,$4,$5) s", [JSON.stringify(mine), at, shape, rot, JSON.stringify([at])])).s);
    eq(sqlShare, coveredShare(mine, at, shape, rot, [at]), `quality_share ${shape}/${rot} at ${hx},${hy} over ${mine.length}`);
  }
  eq(coverOffsets("plus").length > 0, true, "the shapes are read");

  // ── the house: whole for a plant it reaches any plot of
  await clear();
  await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,0,'house',null,$3,$4)", [bx + 1, by + 1, JSON.stringify({ by: ME, at: now, rooms: [{ bug: "honeyBee", from: now, until: now + 48 * 3600000 }, null] }), now]);
  const plotsH = { [K(1, 1)]: { soil: "house", plant: null, house: { by: ME, at: now, rooms: [{ bug: "honeyBee", from: now, until: now + 48 * 3600000 }, null] } }, ...Object.fromEntries(cells.map((k) => [k, { soil: "tilled", plant: giant }])) };
  const gH = (await one("select town.quality_bed_gift($1,$2) g", [K(2, 2), JSON.stringify(plotsH)])).g;
  eq(gH?.h?.map((e) => e.s), [1], "the house's room counts whole for the giant it reaches");

  // ── town.brush_choices and town.garden_cross against the page's rules
  const cases = {
    youngBoth: { [K(2, 2)]: young("basil"), [K(3, 2)]: young("lemongrass"), [K(2, 3)]: young("longBean") },
    onePair: { [K(2, 2)]: young("basil"), [K(3, 2)]: young("lemongrass") },
    none: { [K(2, 2)]: young("basil") },
    theirs: { [K(2, 2)]: young("basil"), [K(3, 2)]: young("lemongrass", { by: YOU }), [K(2, 3)]: young("longBean") },
    corn: { [K(2, 2)]: plant("corn"), [K(3, 2)]: plant("sunflowerPatch"), [K(1, 2)]: plant("basil") },
    cornBrushed: { [K(2, 2)]: plant("corn", { crossChoice: "sunflowerPatch" }), [K(3, 2)]: plant("sunflowerPatch"), [K(1, 2)]: plant("basil") },
    cornBrushedBasilGone: { [K(2, 2)]: plant("corn", { crossChoice: "sunflowerPatch" }), [K(3, 2)]: plant("sunflowerPatch") },
    crossed: { [K(2, 2)]: young("basil", { crossed: true }), [K(3, 2)]: young("lemongrass"), [K(2, 3)]: young("longBean") },
    corner: { [K(2, 2)]: young("longBean"), [K(3, 3)]: young("basil"), [K(1, 1)]: young("chili") },
  };
  const asPlots = (c) => Object.fromEntries(Object.entries(c).map(([k, p]) => [k, { soil: "tilled", plant: p }]));
  for (const [name, c] of Object.entries(cases)) {
    const plots = asPlots(c);
    eq((await one("select town.brush_choices($1,$2,$3,$4) c", [K(2, 2), JSON.stringify(plots), ME, now])).c, brushChoices(K(2, 2), plots, ME, now, []), `brush_choices: ${name}`);
    eq((await one("select town.garden_cross($1,$2,$3,$4) c", [K(2, 2), JSON.stringify(plots), ME, now])).c, gardenCross(K(2, 2), plots, ME, now, []), `garden_cross: ${name}`);
  }
  eq(brushChoices(K(2, 2), asPlots(cases.youngBoth), ME, now, []), ["rowBean", "teaBush"], "the young basil may be brushed either way");
  eq(gardenCross(K(2, 2), asPlots(cases.cornBrushedBasilGone), ME, now, []), "blueCorn", "a pair gone leaves the usual cross");

  // ── town.reward_garden's gardenBrush, as town_reward calls it
  await clear();
  await put(cases.youngBoth);
  const purse = { bag: [], gifts: { had: ["thingCrossBrush"], charms: [], used: {} }, gardenBook: [] };
  const brush = async (p, child, req) => (await one("select town.reward_garden($1,$2,$3,$4,0,$5) r", [JSON.stringify(p), JSON.stringify({ action: "gardenBrush", child, at: [bx + 2, by + 2] }), req, now, ME])).r;
  const r1 = await brush(purse, "teaBush", "00000000-0000-4000-8000-000000000001");
  eq([r1.ok, r1.plots?.[K(2, 2)]?.plant?.crossChoice, r1.purse?.gifts?.used?.thingCrossBrush?.n], [true, "teaBush", 1], "a young root, a child not found yet: taken, one use");
  eq((await one("select plant->>'crossChoice' c from public.town_plots where x=$1 and y=$2", [bx + 2, by + 2])).c, "teaBush", "the choice is kept on the root");
  const r2 = await brush(r1.purse, "teaBush", "00000000-0000-4000-8000-000000000002");
  eq([r2.ok, r2.why], [false, "none"], "the same child again is refused");
  const r3 = await brush(r1.purse, "rowBean", "00000000-0000-4000-8000-000000000003");
  eq([r3.ok, r3.plots?.[K(2, 2)]?.plant?.crossChoice, r3.purse?.gifts?.used?.thingCrossBrush?.n], [true, "rowBean", 2], "another child: taken, a second use");
  eq((await brush(r3.purse, "blueCorn", "00000000-0000-4000-8000-000000000004")).ok, false, "a child of no pair beside it is refused");
  eq((await brush({ ...purse, gifts: { had: [], charms: [], used: {} } }, "teaBush", "00000000-0000-4000-8000-000000000005")).ok, false, "without the gift, refused");
  await clear();
  await put(cases.onePair);
  eq((await brush(purse, "teaBush", "00000000-0000-4000-8000-000000000006")).ok, false, "one pair alone: nothing to choose, refused");
  let spent = r3.purse;
  await clear();
  await put(cases.youngBoth);
  spent = (await brush(spent, "teaBush", "00000000-0000-4000-8000-000000000007")).purse;
  eq((await brush(spent, "rowBean", "00000000-0000-4000-8000-000000000008")).why, "spent", "a fourth use in a day is refused");

  // ── who may call it
  for (const who of ["anon", ME]) eq(!!(await as(who, "select town.brush_choices('1,1','{}'::jsonb,'x',0) c")).error, true, `${who === "anon" ? "anon" : "a member"} may not call town.brush_choices`);
} catch (e) { failed++; console.log("  THREW", e.message); }
console.log(`v321: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
