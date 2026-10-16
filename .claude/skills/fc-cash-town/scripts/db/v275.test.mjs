// v275, the old wide hybrids on one plot, dry-run on the live farm as it is (read from production with GET only, laid
// on the bench with the triggers off): the file runs twice; afterwards no plant but a giant stands on several plots;
// each one made one-plot stands on its root alone with `oldPlots`, its other plots free tilled soil; what each picking
// gives is what it gave (town.yield_of before and after, and lib/town/farm's yieldOf); every plant with a round in
// those beds has the gift of the new layout (town.quality_bed_gift); everything else of every plant is as it was, and
// the beds not touched are as they were. No bare write.
//   cd <the tree> && FC_REPO=<the tree> node .claude/skills/fc-cash-town/scripts/db/v275.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { yieldOf } = await import("@/lib/town/farm");

const TREE = process.env.FC_REPO ?? process.cwd();
const env = Object.fromEntries(readFileSync(`${TREE}/.env.local`, "utf8").split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^["']|["']$/g, "")]; }));
const get = async (p) => { const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${p}`, { headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` } }); if (!r.ok) throw Error(p + " " + r.status); return r.json(); };
let live = []; for (let off = 0; ; off += 1000) { const page = await get(`town_plots?select=x,y,bed,soil,plant,house,changed&order=x,y&limit=1000&offset=${off}`); live = live.concat(page); if (page.length < 1000) break; }

let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)?.slice(0, 300)} against ${JSON.stringify(b)?.slice(0, 300)}`); checks++; };
const db = await rewardDB(252);
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
try {
  for (const f of CHAIN) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  await db.exec("delete from public.town_plots");
  await db.exec("alter table public.town_plots disable trigger user");
  for (const q of live) await db.query("insert into public.town_plots(x,y,bed,soil,plant,house,changed) values($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7) on conflict (x,y) do nothing", [q.x, q.y, q.bed, q.soil, q.plant ? JSON.stringify(q.plant) : null, q.house ? JSON.stringify(q.house) : null, q.changed]);
  await db.exec("alter table public.town_plots enable trigger user");
  const wide = (p, k) => p && typeof p === "object" && p.giant !== true && Array.isArray(p.footprint) && p.footprint.length > 1 && p.root === k;
  const before = Object.fromEntries((await rows("select x||','||y k, bed, soil, plant, house from public.town_plots")).map((r) => [r.k, r]));
  const roots = Object.entries(before).filter(([k, r]) => wide(r.plant, k));
  const beds = new Set(roots.map(([, r]) => r.bed));
  console.log(`live: ${live.length} plots, ${roots.length} wide hybrids in ${beds.size} beds`);
  // what each picking gave, before
  const gave = {};
  for (const [k, r] of roots) for (const picked of [0, 1, 2, 3]) gave[`${k}|${picked}`] = (await one("select town.yield_of($1, $2::jsonb, null) n", [k, JSON.stringify({ ...r.plant, picked })])).n;

  const sql = readFileSync("supabase/v275_the_old_wide_hybrids_on_one_plot.sql", "utf8");
  await db.exec(sql);
  const once = await rows("select x||','||y k, plant from public.town_plots order by x, y");
  await db.exec(sql);
  eq(await rows("select x||','||y k, plant from public.town_plots order by x, y"), once, "the second run changes nothing");

  const after = Object.fromEntries((await rows("select x||','||y k, bed, soil, plant, house from public.town_plots")).map((r) => [r.k, r]));
  eq(Object.entries(after).filter(([k, r]) => wide(r.plant, k)).length, 0, "no wide plant but a giant is left");
  for (const [k, r] of roots) {
    const now = after[k].plant;
    eq(now.footprint, [k], `${k} stands on its root alone`);
    eq(now.oldPlots, r.plant.footprint.length, `${k} keeps how many plots it stood on`);
    for (const c of r.plant.footprint.filter((c) => c !== k)) { eq(after[c].plant, null, `${c} of ${k} is free`); eq(after[c].soil, "tilled", `${c} of ${k} is tilled`); }
    for (const picked of [0, 1, 2, 3]) {
      const n = (await one("select town.yield_of($1, $2::jsonb, null) n", [k, JSON.stringify({ ...now, picked })])).n;
      eq(n, gave[`${k}|${picked}`], `${k} gives at its picking ${picked} what it gave`);
      eq(yieldOf(k, { ...now, picked }, null), n, `${k}: the code's yieldOf as the database's`);
    }
  }
  // the gifts of the new layout, and nothing else changed
  const plotsOf = (bed) => Object.fromEntries(Object.entries(after).filter(([, r]) => r.bed === bed).map(([k, r]) => [k, { soil: r.soil, plant: r.plant, ...(r.house ? { house: r.house } : {}) }]));
  for (const [k, r] of Object.entries(after)) {
    const was = before[k];
    if (!beds.has(r.bed)) { eq(r.plant, was.plant, `${k} in a bed not touched is as it was`); continue; }
    if (!r.plant || (r.plant.root && r.plant.root !== k)) continue;
    if (r.plant.q && typeof r.plant.q === "object") {
      const gift = (await one("select town.quality_bed_gift($1, $2::jsonb) g", [k, JSON.stringify(plotsOf(r.bed))])).g;
      eq(r.plant.q.bed ?? null, gift ?? null, `${k}: its gift is the new layout's`);
    }
    const strip = (p) => { if (!p) return p; const { q, footprint, oldPlots, ...rest } = p; return rest; };
    if (was.plant && !(was.plant.root && was.plant.root !== k)) eq(strip(r.plant), strip(was.plant), `${k}: all but its round and its plots as it was`);
  }
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v275: ${checks} checks passed`);
} finally { await db.close(); }
