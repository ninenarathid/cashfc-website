// v313, water counts after a picking too, dry-run: the file runs twice (as checked out on Windows, CR at its line ends, and
// as written) and a second run changes no function and no plot; the forge row is the code's; town.growing, town.quality_progress,
// town.regrow_ms and town.pest_at are the page's twins on made-up plants under rain, moisture and a cloud; a watering with
// each dark can is the page's; a picking keeps boostAt and a giant's gate stands; town.hoe_fx is hoeFx with fire and lightning;
// plants already in a later round begin from now, rain and all, their Quality round untouched; anon may not call it; and a
// function whose text has moved stops the file with nothing done.
//   cd <the tree> && FC_REPO=<the tree> V313_BENCH=<a scratch file> node .claude/skills/fc-cash-town/scripts/db/v313.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
await import("./repo-ts-town.mjs");
const { growing, pestAt, regrowMs, water, pick } = await import("@/lib/town/farm");
const { progressOf } = await import("@/lib/town/quality-plant");
const { OLD_FX, canFx, hoeFx } = await import("@/lib/town/forged");
const { catalogOf } = await import("@/lib/town/catalog");
const { dayOf } = await import("@/lib/town/stamina");
const { hold, newPurse } = await import("@/lib/town/trade");
const { rainsOf } = await import("@/lib/town/weather");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v313_water_counts_after_a_picking_too.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); } };
const near = (a, b, what) => { if (Math.abs(a - b) < 1e-6) checks++; else { failed++; console.log(`  FAIL ${what}: ${a} against ${b}`); } };
const REALTIME = `
 create schema if not exists realtime;
 grant usage on schema realtime to anon, authenticated;
 create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`;
const CACHE = process.env.V313_BENCH;
const BENCH = process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(createRequire(join(BENCH, "package.json")).resolve("@electric-sql/pglite")).href);
let db;
if (CACHE && existsSync(CACHE)) db = new PGlite({ loadDataDir: new Blob([readFileSync(CACHE)]) });
else {
  db = await rewardDB(252);
  for (const f of CHAIN) await db.exec(ran(`${f}.sql`));
  await db.exec(REALTIME);
  const { migration } = await import(pathToFileURL(join(BENCH, "pglite-harness.mjs")).href);
  for (const n of [101, 102]) try { await db.exec(migration(n, { repo: process.env.FC_REPO ?? process.cwd() })); } catch (e) { console.log(`  (v${n}: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  for (let n = 275; n <= 312; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const fns = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'town' order by 1, 2")).map((r) => r.proname + r.d).join();
const H = 3_600_000, SLOT = 900_000;

try {
  // ── plants already in a later round, before the file: rain since their picking must not carry them forward ──
  const nowDb = Number((await one("select town.now_ms() n")).n), T = Math.floor(nowDb / H) * H;
  const me = (await one("select id from public.profiles limit 1")).id;
  await db.exec("delete from public.town_weather where true");
  const pastWet = []; for (let s = Math.floor((T - 8 * H) / SLOT); s < Math.floor((T - 4 * H) / SLOT); s++) pastWet.push(s);
  for (const s of pastWet) await db.query("insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 10, 2)", [s]);
  const before = { by: me, crop: "kangkong", sown: T - 30 * H, boost: 2 * H, watered: 0, fed: 0, guard: 0, cured: 0, picked: 1, pickedAt: T - 10 * H };
  const q0 = { at: T - 2 * H, span: 0.2, area: [0, 0, 0, 0], nar: [0, 0, 0] };
  await db.query("delete from public.town_plots where x = 900 and y in (900, 901, 902)");
  await db.query("insert into public.town_plots (x, y, bed, soil, plant, changed) values (900, 900, 0, 'tilled', $1, $2)", [JSON.stringify({ ...before, q: q0 }), T - 2 * H]);
  await db.query("insert into public.town_plots (x, y, bed, soil, plant, changed) values (900, 901, 0, 'tilled', $1, $2)", [JSON.stringify({ ...before, picked: 0, pickedAt: 0, q: q0 }), T - 2 * H]);
  const seenBefore = (await one("select town.growing(plant, $1::bigint) g from public.town_plots where x = 900 and y = 900", [T])).g;

  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  const after = await fns();
  const plotsAfter = await rows("select x, y, plant from public.town_plots where x = 900 order by y");
  await db.exec(sql);
  eq(await fns(), after, "a second run changes no function");
  eq(await rows("select x, y, plant from public.town_plots where x = 900 order by y"), plotsAfter, "a second run changes no plot");

  // ── what it should say afterwards ──
  eq(await one(`select position('regrow_ms' in pg_get_functiondef('town.growing(jsonb,bigint)'::regprocedure)) > 0 as wait,
         position('regrow_ms' in pg_get_functiondef('town.quality_progress(jsonb,bigint)'::regprocedure)) > 0 as round,
         position('regrow_ms' in pg_get_functiondef('town.pest_at(text,jsonb,bigint)'::regprocedure)) > 0 as pests,
         position('boostAt' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as pick,
         position('spread' in pg_get_functiondef('town.hoe_fx(jsonb)'::regprocedure)) > 0 as hoe,
         has_function_privilege('anon', 'town.regrow_ms(jsonb,bigint)', 'EXECUTE') as anon_may`),
    { wait: true, round: true, pests: true, pick: true, hoe: true, anon_may: false }, "what it should say afterwards");
  eq(await one("select data#>'{old,dark,can,more}' as dark, data#>'{old,fire,hoe,spread}' as spread from public.town_catalog where key = 'forge'"), { dark: [1.5, 1.75, 2, 2], spread: [0, 0.15, 0.25, 0.35] }, "the numbers");
  eq((await one("select count(*)::int c from public.town_plots where plant is not null and plant <> 'null'::jsonb and coalesce((plant->>'picked')::integer, 0) > 0 and not plant ? 'boostAt'")).c, 0, "no plant in a later round is without boostAt");
  const forge = (await one("select data from public.town_catalog where key = 'forge'")).data;
  eq(forge.old, JSON.parse(JSON.stringify(OLD_FX)), "the forge row's table is the code's");
  eq(forge.old, catalogOf().forge.old, "and the code's catalog");

  // ── plants already in a later round begin from now ──
  const old = plotsAfter[0].plant;
  near(old.boostAt, 2 * H + 4 * H * 0.5, "its boostAt holds its boost and the rain since its picking");
  near(Number((await one("select town.regrow_ms(plant, town.now_ms()) r from public.town_plots where x = 900 and y = 900")).r), 0, "so it has gained nothing");
  eq((await one("select town.growing(plant, $1::bigint) g from public.town_plots where x = 900 and y = 900", [T])).g, seenBefore, "it stands where it stood");
  eq(old.q.at, q0.at, "its Quality round is not moved on");
  eq(old.q.span, q0.span, "nor its span");
  eq(plotsAfter[1].plant.boostAt, undefined, "a plant in its first round is left alone");
  const bumped = { ...old, boost: old.boost + H };
  near(Number((await one("select town.regrow_ms($1::jsonb, town.now_ms()) r", [JSON.stringify(bumped)])).r), H, "a watering from now on counts");
  await db.query("delete from public.town_plots where x = 900 and y in (900, 901, 902)");

  // ── the page's twins, on made-up plants ──
  await db.exec("delete from public.town_weather where true");
  const wet = []; for (let i = 0; i < 200; i++) if ((i * 7) % 11 < 3) wet.push(Math.floor((T - 60 * H) / SLOT) + i * 3);
  for (const s of wet) await db.query("insert into public.town_weather (slot, sky, wind, gust, rain) values ($1, 'rain', 5, 10, 2)", [s]);
  const rains = rainsOf(wet);
  const cases = [];
  let seed = 12345; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 160; i++) {
    const crop = ["kangkong", "scallion", "garlic", "cabbage", "bottleGourd", "trellisBerry"][i % 6];
    const pickedAt = T - Math.floor(rnd() * 40) * H, picked = i % 5 === 0 ? 0 : 1 + (i % 2);
    const boost = Math.floor(rnd() * 30) * 15 * 60_000;
    const p = { by: me, crop, sown: pickedAt - 70 * H, boost, watered: 0, fed: 0, guard: 0, cured: 0, picked, pickedAt: picked ? pickedAt : 0 };
    if (i % 7) p.boostAt = Math.floor(boost * rnd());
    if (i % 11 === 0) p.moist = true;
    if (i % 13 === 0) p.localRain = { from: pickedAt - H, until: pickedAt + 3 * H };
    if (i % 17 === 0) p.fast = [pickedAt + H];
    cases.push(p);
  }
  const offs = [0, 0.5, 3, 11, 25, 48];
  let compared = 0;
  for (const p of cases) for (const off of offs) {
    const t = p.picked ? p.pickedAt + Math.round(off * H) : p.sown + Math.round(off * H);
    const d = await one("select town.growing($1::jsonb, $2::bigint) g, town.regrow_ms($1::jsonb, $2::bigint) r, town.quality_progress($1::jsonb, $2::bigint) q", [JSON.stringify(p), t]);
    eq({ stage: d.g.stage, ripe: d.g.ripe, spent: d.g.spent }, (({ stage, ripe, spent }) => ({ stage, ripe, spent }))(growing(p, t, rains)), `growing ${p.crop} picked ${p.picked} +${off}`);
    near(Number(d.r), regrowMs(p, t, rains), `regrow ${p.crop} picked ${p.picked} +${off}`);
    near(Number(d.q), progressOf(p, rains)(t), `progress ${p.crop} picked ${p.picked} +${off}`);
    compared++;
  }
  // (the pests: a later-round plant, by the plot's own rolls, against the page's)
  for (const p of cases.slice(0, 60)) for (const off of [6, 30]) {
    if (p.moist || p.localRain) continue;   // (town.pest_at's first-round sum has never counted these: not this file's)
    const t = (p.picked ? p.pickedAt : p.sown) + off * H, q = { ...p, q: undefined };
    const d = await one("select town.pest_at('41,41', $1::jsonb, $2::bigint) a", [JSON.stringify(q), t]);
    eq(d.a === null ? null : Number(d.a), pestAt("41,41", q, t, rains), `pest ${p.crop} picked ${p.picked} +${off}`);
    compared++;
  }
  console.log(`  (${compared} comparisons of the page and the database)`);

  // ── a watering with each dark can, and a picking ──
  const now = T + 5 * H, plot = (extra = {}) => ({ soil: "tilled", plant: { by: me, crop: "garlic", sown: now - 20 * H, boost: 0, watered: 0, fed: 0, guard: 0, cured: 0, picked: 0, pickedAt: 0, ...extra } });
  await db.exec("delete from public.town_weather where true");
  const purseWith = (s) => { const h = hold({ ...newPurse(), bag: [{ ...s, water: 5 }, ...Array(19).fill(null)], stamina: { day: dayOf(now), left: 100 } }, 0); if (!h.ok) throw new Error("hold"); return h.purse; };
  for (const [plus, gems, mins] of [[7, ["dark"], 75], [10, ["dark"], 82.5], [10, ["dark", "dark"], 90], [10, [], 30]]) {
    const s = { item: "can", n: 1, plus, gems }, purse = purseWith(s);
    const d = (await one("select town.water('41,41', $1::jsonb, $2::jsonb, 'can', $3::bigint) r", [JSON.stringify(purse), JSON.stringify(plot()), now])).r;
    const page = water("41,41", purse, plot(), "can", now);
    eq(d.ok, true, `the database waters with +${plus} ${gems}`);
    near(d.plot.plant.boost, mins * 60_000, `+${plus} ${gems} adds ${mins} minutes`);
    near(page.plot.plant.boost, d.plot.plant.boost, `the page's +${plus} ${gems} is the same`);
    near(Number((await one("select (town.can_fx($1::jsonb)->>'rich')::double precision r", [JSON.stringify(s)])).r), canFx(s).rich, `can_fx +${plus} ${gems}`);
  }
  const rp = plot({ crop: "kangkong", sown: now - 7 * H, boost: 5 * H, boostAt: 0 }), bare = { ...newPurse(), stamina: { day: dayOf(now), left: 100 } };
  const dp = (await one("select town.pick('41,41', $1::jsonb, $2::jsonb, true, null, $3::bigint, $4) r", [JSON.stringify(bare), JSON.stringify(rp), now, me])).r;
  const pp = pick("41,41", bare, rp, true, null, now);
  eq(dp.ok, true, "the database picks");
  eq(dp.plot.plant.boostAt, 5 * H, "a picking keeps the boost");
  eq(dp.plot.plant.boostAt, pp.plot.plant.boostAt, "as the page does");
  eq(dp.plot.plant.pickedAt, now, "and the rest of the picking stands");
  eq(dp.plot.plant.watered, 0, "its watering is over");
  eq((await one("select town.pick('41,41', $1::jsonb, $2::jsonb, true, null, $3::bigint, $4) r", [JSON.stringify(bare), JSON.stringify(plot({ crop: "pumpkin", sown: now - 500 * H, guard: now + 100 * H, giant: true, root: "41,41" })), now, me])).r, { ok: false, why: "unripe" }, "a giant not pulled out is still refused (v307)");

  // ── the hoe ──
  for (const [plus, gems] of [[7, ["fire"]], [10, ["fire"]], [10, ["fire", "fire"]], [10, ["fire", "lightning"]], [10, ["lightning"]], [7, ["lightning"]], [10, []]]) {
    const s = { item: "hoe", n: 1, plus, gems };
    near(Number((await one("select (town.hoe_fx($1::jsonb)->>'next')::double precision r", [JSON.stringify(s)])).r), hoeFx(s).next, `hoe_fx +${plus} ${gems}`);
  }

  // ── nobody from outside, and a function that moved ──
  await db.exec("set role anon");
  await assert.rejects(db.query("select town.regrow_ms('{}'::jsonb, 0)"), /permission denied/); checks++;
  await db.exec("reset role");
  await db.exec("create or replace function town.hoe_fx(p_stack jsonb) returns jsonb language sql as $$ select '{}'::jsonb $$");
  const was = await one("select data#>'{old,fire,hoe,spread}' s from public.town_catalog where key = 'forge'");
  await db.exec("update public.town_catalog set data = jsonb_set(data, '{old,fire,hoe,spread}', '[9,9,9,9]'::jsonb) where key = 'forge'");
  await assert.rejects(db.exec(sql), /v313: town\.hoe_fx/); checks++;
  await db.exec("rollback");
  eq((await one("select data#>'{old,fire,hoe,spread}' s from public.town_catalog where key = 'forge'")).s, [9, 9, 9, 9], "a file stopped by a moved text changes nothing");
  void was;
  console.log(failed ? `v313: ${failed} FAILED, ${checks} passed` : `v313: ${checks} checks passed.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.where ?? ""); process.exitCode = 1; } finally { await db.close(); }
