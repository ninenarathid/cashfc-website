// v317, a plant that fills its ground, dry-run: the file runs twice (as checked out on Windows, CR at its line ends, and as
// written) and a second run changes no function and no animal; the steps, the square, the sale, the gold, a swelling plant's
// deeds and an animal's rearing and size are the page's twins on made-up plants and animals; a keeper grows a plant as a
// member, and a stranger, another member, too few seeds, ground not ready, a plant not good enough and the same call twice
// are refused; the bed is kept while it swells, against other deeds, and let go when it is dug; it is pulled by as many
// hands as its size asks, sold once at the pick with the coins on the deed, and dug alone for no sale; a rank-7 giant grows
// on; gold is told only of a ripe plant, by its grower, once a round; the grown animals of today have their size from
// their hearts; and a function whose text has moved stops the file with nothing done.
//   cd <the tree> && FC_REPO=<the tree> V317_BENCH=<a scratch file> node .claude/skills/fc-cash-town/scripts/db/v317.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { rewardDB } from "./reward-db.mjs";
import { CHAIN } from "./build-v275.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const GS = await import("@/lib/town/giant-sizes");
const GP = await import("@/lib/town/giant-pull");
const QP = await import("@/lib/town/quality-plant");
const F = await import("@/lib/town/farm");
const AN = await import("@/lib/town/animals");
const { CROPS } = await import("@/lib/town/items");

const FILE = process.env.MIGRATION_FILE ?? "supabase/v317_a_plant_that_fills_its_ground.sql", BASE = "5568ab2b";
const ran = (f) => execFileSync("git", ["show", `${BASE}:supabase/${f}`], { encoding: "utf8", maxBuffer: 1 << 28 });
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 400)}`); } };
const REALTIME = `
 create schema if not exists realtime;
 grant usage on schema realtime to anon, authenticated;
 create table if not exists realtime.messages (id bigint generated always as identity primary key, extension text not null);
 alter table realtime.messages enable row level security;
 grant select, insert on realtime.messages to anon, authenticated;
 create or replace function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;`;
const CACHE = process.env.V317_BENCH;
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
  for (let n = 275; n <= 316; n++) for (const f of readdirSync("supabase").filter((x) => x.startsWith(`v${n}_`)).sort()) {
    try { await db.exec(readFileSync(`supabase/${f}`, "utf8")); } catch (e) { console.log(`  (v${n} did not replay here: ${e.message.slice(0, 120)})`); await db.exec("rollback"); }
  }
  if (CACHE) writeFileSync(CACHE, Buffer.from(await (await db.dumpDataDir("none")).arrayBuffer()));
}
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const asOf = (who, role = "authenticated") => async (q, a = []) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { ok: false, why: `error ${e.code}` }; } finally { await db.exec("reset role"); }
};
const why = (r) => (r?.ok ? "ok" : r?.why);
const fns = async () => (await rows("select p.proname, md5(pg_get_functiondef(p.oid)) d from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') order by 1, 2")).map((r) => r.proname + r.d).join();

try {
  await db.exec("update public.town_knobs set value = 1 where key = 'game_open'");
  const ids = (await rows("select p.id from public.profiles p order by p.id")).map((r) => r.id);
  const members = [];
  for (const id of ids) if ((await asOf(id)("select public.town_giant_pull('look', 0, 0) r"))?.why !== "error 42501") members.push(id);
  console.log(`  ${members.length} of ${ids.length} profiles are let into the town`);
  assert.ok(members.length >= 4, "four members"); checks++;
  const stranger = ids.find((id) => !members.includes(id));
  const [m1, m2, m3, m4] = members;

  // ── grown animals of today, before the file: a loved cow, a plain hen; one growing; one in the pen ──
  const nowMs = Number((await one("select town.now_ms() n")).n), H = 3_600_000;
  const animal = (id, species, more = {}) => ({ id, owner: m1, species, breed: `${species}A`, name: "x", born: nowMs - 900 * H, bought: true, home: "barn", sex: "f", stats: { thrift: 2, gentle: 2, vigor: 2 }, streak: 0, at: nowMs, food: 10, grown: 0, made: 0, banked: 0, hearts: 0, today: { day: 0 }, speedUntil: 0, windUntil: 0, narrow: 0, rest: 0, lent: null, outside: [], outBands: 0, ...more });
  const A = { cow: "00000000-0000-4000-8000-000000000001", hen: "00000000-0000-4000-8000-000000000002", calf: "00000000-0000-4000-8000-000000000003", penned: "00000000-0000-4000-8000-000000000004" };
  const putAnimal = (a) => db.query("insert into public.town_animals (id, owner, a, changed) values ($1, $2, $3, $4) on conflict (id) do update set a = excluded.a", [a.id, a.owner, JSON.stringify(a), nowMs]);
  await putAnimal(animal(A.cow, "cow", { grown: 200, hearts: 200, narrow: 15 }));
  await putAnimal(animal(A.hen, "chicken", { grown: 60, hearts: 0 }));
  await putAnimal(animal(A.calf, "cow", { grown: 10 }));
  await putAnimal(animal(A.penned, "duck", { grown: 80, hearts: 100, home: "pen" }));

  // (what v309 and v311 made, which do not replay on this bench: the column, and a reader for the older reader to ask)
  await db.exec(`alter table public.town_announcements add column if not exists toward jsonb;
    create or replace function public.town_announcements_v309(p_after bigint default null, p_look text default null) returns jsonb language sql as $$ select '{"events":[]}'::jsonb $$;`);
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  const after = await fns(), animalsAfter = await rows("select id, a from public.town_animals order by id");
  await db.exec(sql);
  eq(await fns(), after, "a second run changes no function");
  eq(await rows("select id, a from public.town_animals order by id"), animalsAfter, "a second run changes no animal");

  // ── what it should say afterwards ──
  eq(await one(`select position('size' in pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure)) > 0 as swelling,
         position('sold_whole' in pg_get_functiondef('town.pick(text,jsonb,jsonb,boolean,text,bigint,text)'::regprocedure)) > 0 as sold,
         position('''alone''' in pg_get_functiondef('public.town_giant_pull(text,integer,integer,jsonb)'::regprocedure)) > 0 as dug,
         position('animal_body' in pg_get_functiondef('town.animal_settle(jsonb,double precision,jsonb,boolean,jsonb)'::regprocedure)) > 0 as bodies,
         has_function_privilege('anon', 'public.town_grow(integer,integer,integer)', 'EXECUTE') as anon_grow,
         has_function_privilege('anon', 'public.town_plant_gold(integer,integer)', 'EXECUTE') as anon_gold`),
    { swelling: true, sold: true, dug: true, bodies: true, anon_grow: false, anon_gold: false }, "what it should say afterwards");
  eq(await one("select town.deed_th('plant_grow') a, town.deed_th('plant_gold') b"), { a: "ปล่อยผักให้โตเต็มพื้นที่", b: "ผักกลายพันธุ์เป็นทองคำ" }, "the deeds' words");
  eq((await one(`select count(*)::int c from public.town_animals x, (select town.cat('animals') k) c
     where x.a->'body' is null and (x.a->>'grown')::double precision >= (c.k->'species'->(x.a->>'species')->'grow'->>0)::double precision + (c.k->'species'->(x.a->>'species')->'grow'->>1)::double precision`)).c, 0, "no grown animal has no size");

  eq((await bareWrites((q) => rows(q))).filter((w) => /town_grow|town_plant_gold|town_giant_pull|bed_kept|sold_whole|sale_now|grow_frame|animal_body|animal_rear/.test(JSON.stringify(w))), [], "none of its functions writes with no WHERE");

  // ── animals of today ──
  const kept = Object.fromEntries(animalsAfter.map((r) => [r.id, r.a]));
  // (the salt is empty here, as the page's draw has it: a test of the twins)
  await db.exec("update town.quality_salt set salt = '' where one");
  eq(kept[A.cow].body >= 1.9, true, "a cow of ten hearts and good feed is at one of its top two sizes");
  eq(kept[A.hen].body >= 1 && kept[A.hen].body < 1.6, true, "a plain hen is not under its first step nor at its second");
  eq(kept[A.calf].body, undefined, "one growing has no size yet");
  eq(kept[A.penned].body >= 1, true, "one in the pen has its size too");

  // ── the twins: the steps ──
  for (const s of GS.SIZES) {
    const d = (await one("select town.giant_size($1) r", [s.n])).r, needs = GP.needsOf({ size: { n: s.n } });
    eq({ from: d.from, hands: d.hands, wait: d.wait, crew: d.crew, together: d.together, grip: d.grip }, { from: s.from, hands: s.hands, wait: s.wait, crew: needs.crew, together: needs.together, grip: needs.grip }, `the step of ${s.n}`);
  }
  eq((await one("select town.giant_size(8) r")).r, null, "no step of 8");
  eq((await one("select town.giant_size(1) r")).r, null, "no step of 1");

  // ── the twins: a plant's fields ──
  const at = [134, 6], bed = (await one("select town.bed_of($1, $2) b", at)).b;
  const farm = (await one("select town.cat('farming') f")).f, side = farm.side, [cx, cy] = farm.bedsAt[bed];
  const k = (dx, dy) => `${cx + dx},${cy + dy}`, ROOT = k(3, 3), [rx, ry] = [cx + 3, cy + 3], allKeys = [];
  for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) allKeys.push(k(x, y));
  const round = (c, nar = 0) => ({ at: nowMs + 9000 * H, span: 100, area: [c, c, c, c], nar: [nar * 5, nar * 5, 0] });
  const ripe = (more = {}, by = m1) => ({ by, crop: "pumpkin", sown: nowMs - (CROPS.pumpkin.hours + 2) * H, boost: 0, watered: 0, fed: 0, guard: nowMs + 900 * H, cured: 0, picked: 0, pickedAt: 0, q: round(100), ...more });
  let compared = 0, golds = 0;
  for (let i = 0; i < 240; i++) {
    const crop = ["pumpkin", "carrot", "daikon", "cabbage", "taro"][i % 5], n = 2 + (i % 6), c = 70 + (i % 31), nar = (i * 7) % 21;
    const p = { ...ripe({ crop, sown: nowMs - (CROPS[crop].hours + 3) * H - i * 137, q: round(c, nar) }), giant: true, root: ROOT, footprint: [ROOT], size: { n, at: nowMs - H, until: nowMs - 1000, plain: i % 3 > 0 }, ...(i % 11 === 0 ? { pull: { alone: true } } : {}) };
    const js = JSON.stringify(p);
    const d = await one("select town.sale_now($1, $2::jsonb, $3::bigint, '') s, town.quality_harvest($1, $2::jsonb, 6, $3::bigint, '', 0, false) h", [ROOT, js, nowMs]);
    eq(d.s, GS.saleNow(ROOT, p, nowMs), `the sale, ${crop} ${n} at ${c}/${nar}`);
    const h = QP.harvestOf(ROOT, p, 6, nowMs);
    eq([d.h.values, d.h.range, d.h.gold], [h.values, h.range, QP.goldOf(ROOT, p, nowMs)], `the fruits and the gold, ${crop} ${n} at ${c}/${nar}`);
    if (d.h.gold) golds++;
    compared++;
  }
  console.log(`  ${compared} plants compared with the page's, ${golds} gold`);

  const seen = async (p, t) => (await one("select town.see($1, $2::jsonb, $3::bigint) r", [ROOT, JSON.stringify({ soil: "tilled", plant: p }), t])).r;
  const swelling = { ...ripe(), giant: true, root: ROOT, footprint: [ROOT], size: { n: 3, at: nowMs - H, until: nowMs + 100 * H, plain: true } };
  for (const t of [nowMs, nowMs + 99 * H, nowMs + 101 * H]) {
    const d = await seen(swelling, t), page = F.see(ROOT, { soil: "tilled", plant: swelling }, t);
    eq([d.ripe, d.stage, d.pest, d.dead], [page.ripe, page.stage, page.pest, page.dead], `what a swelling plant shows, +${(t - nowMs) / H} h`);
    for (const hand of ["can", "hoe", "compost", "pollenBrush", null]) {
      const dd = (await one("select town.deed_for($1, $2::jsonb, $3, $4, $5::bigint, $4) r", [ROOT, JSON.stringify({ soil: "tilled", plant: swelling }), hand, m1, t])).r;
      eq(dd, F.deedFor(ROOT, { soil: "tilled", plant: swelling }, hand, m1, t, m1), `the deed it offers to ${hand}, +${(t - nowMs) / H} h`);
    }
  }
  eq((await one("select town.twice_wanted($1, $2::jsonb, $3::bigint) r", [ROOT, JSON.stringify({ soil: "tilled", plant: { ...swelling, watered: nowMs - 60_000 } }), nowMs])).r, false, "nor a second watering from a can that waters twice");

  // ── the twins: the square ──
  let seed = 4242; const rnd = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 60; i++) {
    const plots = {};
    for (const key of allKeys) { const r = rnd(); if (r < 0.75) plots[key] = { soil: "tilled", plant: null }; else if (r < 0.88) plots[key] = { soil: "cleared", plant: null }; else plots[key] = { soil: "tilled", plant: ripe({ sown: nowMs - i * 1000 }) }; }
    const rootKey = allKeys[Math.floor(rnd() * 49)], giant = i % 4 === 0 && rootKey.split(",").map(Number)[0] < cx + 6 && rootKey.split(",").map(Number)[1] < cy + 6;
    const [x0, y0] = rootKey.split(",").map(Number), fp = giant ? [rootKey, `${x0 + 1},${y0}`, `${x0},${y0 + 1}`, `${x0 + 1},${y0 + 1}`] : undefined;
    plots[rootKey] = { soil: "tilled", plant: { ...ripe(), ...(fp ? { giant: true, root: rootKey, footprint: fp } : {}) } };
    const n = 2 + (i % 6), page = GS.growFrame(rootKey, n, plots), d = (await one("select town.grow_frame($1, $2, $3::jsonb) r", [rootKey, n, JSON.stringify(plots)])).r;
    eq(d && { cells: [...d.cells].sort(), blocked: d.blocked }, page && { cells: [...page.cells].sort(), blocked: page.blocked.size }, `the square of ${n} for ${rootKey}`);
  }

  // ── the twins: an animal ──
  for (const sp of ["cow", "sheep", "chicken", "duck"]) for (const v of [0, 20, 39, 40, 55, 69, 70, 80, 94, 95, 97, 100]) eq((await one("select town.animal_body_of($1, $2) r", [sp, v])).r, AN.bodyOf(sp, v), `the body of a ${sp} at ${v}`);
  const k_ = (await one("select town.cat('animals') k")).k;
  const draw = (a, i) => F.roll(`quality||animal|${a.id}`, Math.floor(a.born), 0, i);
  const D = 24 * H, day0 = AN.dayStart(AN.dayOf(nowMs) - 12);
  for (let i = 0; i < 80; i++) {
    const species = AN.SPECIES_IDS[i % 4], born = day0 + i * 7 * H % (20 * H), id = `00000000-0000-4000-9000-${String(100000000000 + i)}`;
    const young = { ...animal(id, species), born, at: born, food: 24, grown: 0, today: { day: AN.dayOf(born), ...(i % 2 ? { pet: true } : {}), ...(i % 3 ? { treat: true } : {}) }, narrow: [0, 5, 10, 15][i % 4] };
    const door = i % 5 ? [[born, null]] : [];
    let db_ = young, page = young;
    for (const step of Array.from({ length: 22 }, (_, j) => Math.round(D * 0.9 * (j + 1)))) {
      const t = born + step, feed = (a) => ({ ...a, food: i % 7 === 3 && step < 3 * D ? a.food : Math.min(24, a.food + 24), today: i % 2 ? { ...a.today, pet: true } : a.today });
      db_ = (await one("select town.animal_settle($1::jsonb, $2::double precision, $3::jsonb, false, $4::jsonb) r", [JSON.stringify(db_), t, JSON.stringify(door), JSON.stringify(k_)])).r;
      page = AN.settle(page, t, { door, bottle: false, draw });
      const pick = (a) => ({ grown: Math.round(a.grown * 1e6), food: Math.round(a.food * 1e6), body: a.body, gold: a.gold, rearing: a.rearing && { ...a.rearing, was: Math.round(a.rearing.was * 1e6) } });
      eq(pick(db_), pick(page), `the rearing of a ${species} #${i} at +${step / H} h`);
      db_ = feed(db_); page = feed(page);
    }
    eq(typeof page.body === "number", true, `a ${species} grown has its size`);
    eq(page.rearing, undefined, "and keeps no rearing");
    // (once rolled it stays)
    const later = AN.settle({ ...page, hearts: 200 }, born + D * 30, { door, bottle: false, draw });
    eq(later.body, page.body, "its size is frozen");
  }

  // ── a keeper grows a plant, as a member ──
  const tilledAll = async () => {
    await db.query("insert into public.town_beds (bed, member_id, tended, empty) values ($1, $2, $3, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0", [bed, m1, nowMs]);
    await db.query("delete from public.town_plots where bed = $1", [bed]);
    for (const key of allKeys) { const [x, y] = key.split(",").map(Number); await db.query("insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1, $2, $3, 'tilled', null, $4)", [x, y, bed, nowMs]); }
  };
  const set = async (x, y, p, soil = "tilled") => db.query("update public.town_plots set soil = $3, plant = $4, changed = $5 where x = $1 and y = $2", [x, y, soil, p ? JSON.stringify(p) : null, nowMs]);
  const seeds = async (m, n, more = {}) => {
    const d = (await one("select town.purse_of($1, true) p", [m])).p;
    const bag = [{ item: "seedPumpkin", n }, ...d.bag.slice(1).map(() => null)];
    await db.query("select town.keep_purse($1, $2::jsonb)", [m, JSON.stringify({ ...d, bag, ...more })]);
  };
  const purseOf = async (m) => (await one("select town.purse_of($1, false) p", [m])).p;
  const grow = (who, n, x = rx, y = ry) => asOf(who)("select public.town_grow($1, $2, $3) r", [x, y, n]);
  const plotAt = async (x, y) => one("select soil, plant from public.town_plots where x = $1 and y = $2", [x, y]);
  const keepingOf = async () => one("select member_id, tended, empty from public.town_beds where bed = $1", [bed]);
  const pull = (who, action, hits = []) => asOf(who)("select public.town_giant_pull($1, $2, $3, $4::jsonb) r", [action, rx, ry, JSON.stringify(hits)]);
  const tend = (who, x = rx, y = ry) => asOf(who)("select public.town_tend($1, $2) r", [x, y]);
  const plotNow = async () => plotAt(rx, ry), plotNow0 = plotNow;

  await tilledAll(); await seeds(m1, 9); await set(rx, ry, ripe());
  eq(why(await asOf(null, "anon")("select public.town_grow(1, 1, 2) r")), "error 42501", "anon refused");
  eq(why(await asOf(null, "anon")("select public.town_plant_gold(1, 1) r")), "error 42501", "anon refused the gold");
  if (stranger) eq(why(await grow(stranger, 2)), "error 42501", "a stranger to the town refused");
  eq(why(await grow(m2, 2)), "theirs", "another member, in my bed");
  eq(why(await grow(m1, null)), "none", "no size");
  eq(why(await grow(m1, 1)), "none", "a step that is no step");
  eq(why(await grow(m1, 9)), "none", "nor one too large");
  eq(why(await grow(m1, 2, rx + 1, ry)), "none", "bare ground");
  eq(why(await asOf(m1)("select public.town_grow(null, 1, 2) r")), "none", "a broken place");
  await set(rx, ry, ripe({ q: round(69) }));
  eq(why(await grow(m1, 2)), "quality", "a ceiling short of the first step");
  await set(rx, ry, ripe({ q: round(95) }));
  eq(why(await grow(m1, 7)), "quality", "and of the last");
  await set(rx, ry, ripe({ sown: nowMs - H }));
  eq(why(await grow(m1, 2)), "unripe", "not ripe");
  await set(rx, ry, ripe({ crop: "kangkong" }));
  eq(why(await grow(m1, 2)), "none", "a crop that does not grow so");
  await set(rx, ry, ripe());
  await set(cx, cy, null, "cleared");
  eq(why(await grow(m1, 7)), "room", "ground not ready");
  await set(cx, cy, ripe({ sown: nowMs - H }));
  eq(why(await grow(m1, 7)), "room", "a plant on it");
  await set(cx, cy, null);
  await seeds(m1, 3);
  eq(why(await grow(m1, 7)), "seeds", "too few seeds");
  await seeds(m1, 9);
  const coins0 = (await purseOf(m1)).coins;
  let r = await grow(m1, 3);
  eq(why(r), "ok", "the keeper grows it to 3x3");
  eq(Object.keys(r.plots).sort(), GS.growFrame(ROOT, 3, Object.fromEntries(allKeys.map((c) => [c, { soil: "tilled", plant: null }])))?.cells.sort(), "its square comes back");
  const until = nowMs + CROPS.pumpkin.hours * H;
  const rootNow = await plotAt(rx, ry);
  eq([rootNow.plant.giant, rootNow.plant.root, rootNow.plant.size.n, rootNow.plant.size.plain, rootNow.plant.footprint.length], [true, ROOT, 3, true, 9], "the root's fields");
  eq(Math.abs(rootNow.plant.size.until - rootNow.plant.size.at - CROPS.pumpkin.hours * H), 0, "its wait, once its crop's hours");
  const sat = await plotAt(rx + 1, ry);
  eq([sat.soil, sat.plant.root, sat.plant.size.n], ["tilled", ROOT, 3], "the rest of its square, by the farm's own trigger");
  eq((await purseOf(m1)).bag[0], { item: "seedPumpkin", n: 7 }, "a seed a row");
  eq((await purseOf(m1)).coins, coins0, "no coins yet");
    eq(Number((await keepingOf()).tended) >= rootNow.plant.size.until, true, "the bed is kept till it has swollen");
  eq((await rows("select thing, n, doc->'seeds' s from public.town_deeds where what = 'plant_grow' order by at desc limit 1"))[0], { thing: "pumpkin", n: "3", s: 2 }, "written down");
  eq(why(await grow(m1, 3)), "unripe", "the same call twice: not while it swells");
  eq(why(await grow(m1, 4)), "unripe", "nor a further step");
  // (the bed while it swells: another deed of its keeper's does not bring it back to now)
  const tendedAhead = Number((await keepingOf()).tended);
  await set(cx, cy, ripe({ sown: nowMs - H, by: m1, guard: nowMs + 900 * H }));
  await db.query("update public.town_beds set tended = $2 where bed = $1", [bed, nowMs]);
  eq(Number((await keepingOf()).tended), tendedAhead, "any other deed's now leaves the bed kept ahead");
  eq(why(await pull(m1, "open")), "none", "not called while it swells");
  eq(why(await pull(m1, "dig")), "none", "nor dug");
  // (dug out with the hoe, the keeping falls back with the next deed)
  await db.query("update public.town_plots set plant = null, soil = 'cleared' where bed = $1 and plant is not null and plant->>'root' = $2", [bed, ROOT]);
  await db.query("update public.town_beds set tended = $2 where bed = $1", [bed, nowMs]);
  eq(Number((await keepingOf()).tended), nowMs, "with nothing swelling the bed is kept as any other");

  // ── swollen: pulled by as many hands as it asks, sold once ──
  await tilledAll(); await seeds(m1, 9);
  const big = (n, more = {}) => ({ ...ripe(more), giant: true, root: ROOT, footprint: GS.growFrame(ROOT, n, Object.fromEntries(allKeys.map((c) => [c, { soil: "tilled", plant: null }]))).cells, size: { n, at: nowMs - H, until: nowMs - 1000, plain: true } });
  await db.query("update public.town_plots set plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(big(4)), nowMs, rx, ry]);
  eq(why(await pull(m2, "open")), "theirs", "called by its keeper");
  eq(why(await tend(m1)), "soil", "not picked before it is out");
  r = await pull(m1, "open");
  eq(why(r), "ok", "called");
  eq(why(await pull(m1, "go")), "hands", "not started short of hands");
  const news = await rows("select kind, subject, toward, event_key from public.town_announcements where kind = 'pull' order by id");
  eq([news.length, news[0]?.subject, news[0]?.toward], [1, "ฟักทองยักษ์ 4×4", { hook: ROOT, x: rx, y: ry }], "the call is the town's news, with its way there");
  eq(typeof (await plotNow0()).plant.called, "number", "and the plant remembers when");
  eq(why(await pull(m2, "join")), "ok", "a helper"); eq(why(await pull(m1, "go")), "hands", "still short");
  eq(why(await pull(m3, "join")), "ok", "the third");
  eq(why(await pull(m2, "go")), "theirs", "started by the caller only");
  eq(why(await pull(m1, "go")), "ok", "three hands start a 4x4");
  // (a go's reports write nothing but its root)
  const satBefore = await one("select changed, plant from public.town_plots where x = $1 and y = $2", [rx + 1, ry]);
  const goBack = async (ms) => { const p = (await plotNow()).plant; p.pull.go = Date.now() - ms; await db.query("update public.town_plots set plant = $3 where x = $1 and y = $2", [rx, ry, JSON.stringify(p)]); };
  await goBack(GP.PULL.count + 30 * GP.PULL.swing);
  await pull(m1, "hits", [0]);
  const satAfter = await one("select changed, plant from public.town_plots where x = $1 and y = $2", [rx + 1, ry]);
  eq([satAfter.changed, satAfter.plant.pull], [satBefore.changed, satBefore.plant.pull], "a report writes no other plot of its square");
  const swings = Array.from({ length: 11 }, (_, i) => i);
  r = await pull(m1, "hits", swings); eq(r.plots[ROOT].plant.pull.out, 0, "one pair of hands is not enough: 11 of 32");
  r = await pull(m2, "hits", swings); eq(r.plots[ROOT].plant.pull.out > 0, true, "two together on 11 half-swings: 33 of 32");
  eq(why(await pull(m1, "hits", [12])), "done", "nothing after it is out");
  const twin = GP.gripOf({ a: swings, b: swings }, GP.needsOf({ size: { n: 4 } }));
  eq(twin, { done: 33, left: 0 }, "the page says the same");
  const purseBefore = await purseOf(m1), plantOut = (await plotNow()).plant, saleSaid = GS.saleNow(ROOT, plantOut, Date.now());
  r = await tend(m1);
  eq(why(r), "ok", "its keeper picks it");
  const purseAfter = await purseOf(m1);
  eq(purseAfter.coins - purseBefore.coins, saleSaid, "the relatives pay on the spot, as the page says");
  eq(saleSaid > 0, true, "and something");
  eq(r.got[0][1], F.yieldOf(ROOT, plantOut), "its own fruits and the helper's one");
  const dd = (await rows("select thing, coins from public.town_deeds where what = 'pick' order by at desc limit 1"))[0];
  eq([dd.thing, Number(dd.coins)], ["pumpkin", saleSaid], "the coins on its pick's deed");
  const gone = await plotNow();
  eq([gone.soil, gone.plant], ["cleared", null], "the root cleared");
  eq((await rows("select count(*)::int c from public.town_plots where bed = $1 and plant is not null", [bed]))[0].c, 0, "and all its square");
  eq(why(await tend(m1)), "soil", "the same call twice: nothing more to pick");
  eq((await purseOf(m1)).coins, purseAfter.coins, "and nothing more paid");
  eq(GP.pullOf({ plant: plantOut })?.helped, [m2], "the helper who pulled credited, not the one who only stood there");
  // (stamina once a go, for the helpers' report; the helpers' deed as before)
  eq((await rows("select count(*)::int c from public.town_deeds where what = 'giant_help' and thing = 'pumpkin'"))[0].c >= 1, true, "a helper's deed");

  // ── a stranger's hand on another's sale; a pull too strong for one ──
  await tilledAll();
  await db.query("update public.town_plots set plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(big(7)), nowMs, rx, ry]);
  await pull(m1, "open");
  eq((await rows("select count(*)::int c from public.town_announcements where kind = 'pull'"))[0].c, 2, "another plant's call is told too");
  await pull(m1, "leave"); await pull(m1, "open");
  eq((await rows("select count(*)::int c from public.town_announcements where kind = 'pull'"))[0].c, 2, "but the same plant's not again within ten minutes");
  const crew7 = (await plotNow()).plant.pull.crew;
  eq(crew7, [m1], "called");
  eq(why(await pull(m1, "go")), "hands", "a whole bed will not start with one");
  eq(why(await pull(m1, "dig")), "busy", "not dug while a call stands");
  eq(why(await pull(m1, "leave")), "ok", "the call given up");
  eq(why(await pull(m2, "dig")), "theirs", "dug by its keeper only");
  r = await pull(m1, "dig");
  eq([why(r), r.plots[ROOT].plant.pull.alone, r.plots[ROOT].plant.pull.out > 0], ["ok", true, true], "dug alone");
  const coinsDug = (await purseOf(m1)).coins;
  r = await tend(m1);
  eq(why(r), "ok", "and picked");
  eq(r.got[0][1], F.yieldOf(ROOT, { ...big(7) }), "its own fruits");
  eq((await purseOf(m1)).coins, coinsDug, "no sale");

  // ── a rank-7 giant ──
  await tilledAll(); await seeds(m1, 9);
  const fp2 = [ROOT, k(4, 3), k(3, 4), k(4, 4)];
  const seven = { ...ripe(), giant: true, root: ROOT, footprint: fp2 };
  await db.query("update public.town_plots set plant = $1, changed = $2 where x = $3 and y = $4", [JSON.stringify(seven), nowMs, rx, ry]);
  await db.query("select 1");
  r = await pull(m1, "open"); eq(why(r), "ok", "a rank-7 giant is called");
  eq(why(await grow(m1, 4)), "busy", "not grown while a call stands");
  await pull(m1, "leave");
  r = await grow(m1, 4);
  eq(why(r), "ok", "it grows on, as a 2x2");
  eq([(await plotNow()).plant.size.n, (await plotNow()).plant.size.plain], [4, false], "not plain");
  eq((await purseOf(m1)).bag[0], { item: "seedPumpkin", n: 7 }, "two rows, two seeds");
  const on = (await plotNow()).plant;
  await db.query("update public.town_plots set plant = $1 where x = $2 and y = $3", [JSON.stringify({ ...on, size: { ...on.size, until: nowMs - 1000 }, pull: { by: m1, at: nowMs, crew: [m1, m2, m3], go: 0, hits: {}, paid: [], out: nowMs, bonus: 0, helped: [] } }), rx, ry]);
  const coinsSeven = (await purseOf(m1)).coins;
  r = await tend(m1);
  eq(r.got[0][1], 2 * 6, "six times its fruits still");
  eq((await purseOf(m1)).coins > coinsSeven, true, "and the sale besides");

  // ── gold: told of a ripe plant, by its grower, once a round ──
  await tilledAll();
  let goldSown = null, plainSown = null;
  for (let i = 0; i < 4000 && (goldSown === null || plainSown === null); i++) {
    const s = nowMs - (CROPS.pumpkin.hours + 3) * H - i * 500, yes = QP.goldOf(ROOT, ripe({ sown: s, q: round(100, 20) }), nowMs);
    if (yes && goldSown === null) goldSown = s; if (!yes && plainSown === null) plainSown = s;
  }
  const gold = (who, x = rx, y = ry) => asOf(who)("select public.town_plant_gold($1, $2) r", [x, y]);
  await set(rx, ry, ripe({ sown: goldSown, q: round(100, 20) }));
  eq(why(await gold(m2)), "none", "not by another member");
  eq(why(await gold(m1, rx + 1)), "none", "nor of bare ground");
  r = await gold(m1);
  eq([why(r), r.plots[ROOT].plant.gold, r.plots[ROOT].plant.sealed], ["ok", 0, 0], "a gold plant told");
  const changedOnce = (await one("select changed from public.town_plots where x = $1 and y = $2", [rx, ry])).changed;
  await db.query("update public.town_plots set changed = 1 where x = $1 and y = $2", [rx, ry]);
  eq(why(await gold(m1)), "ok", "asked again");
  eq(Number((await one("select changed from public.town_plots where x = $1 and y = $2", [rx, ry])).changed), 1, "with nothing written");
  eq(Boolean(changedOnce), true, "it was written the first time");
  eq((await rows("select thing from public.town_deeds where what = 'plant_gold' order by at desc limit 1"))[0], { thing: "pumpkin" }, "written down");
  await set(rx, ry, ripe({ sown: plainSown, q: round(100, 20) }));
  r = await gold(m1);
  eq([why(r), r.plots[ROOT].plant.gold, r.plots[ROOT].plant.sealed], ["ok", undefined, 0], "one that is not, told too: no gold");
  await set(rx, ry, ripe({ sown: nowMs - H, q: round(100, 20) }));
  eq(why(await gold(m1)), "none", "nothing told of one not ripe, so that nobody may sow again for it");
  await set(rx, ry, ripe({ sown: goldSown, q: round(100, 20) }));
  const fruits = (await one("select town.quality_harvest($1, $2::jsonb, 6, $3::bigint, '', 0, false) h", [ROOT, JSON.stringify(ripe({ sown: goldSown, q: round(100, 20) })), nowMs])).h;
  eq(fruits.values.every((v) => v >= 95), true, "a gold plant's fruits a grade up");
  // (with the real salt the draw is not the page's: nobody can work it out from the sowing)
  await db.exec("update town.quality_salt set salt = 'a real secret' where one");
  let differ = 0;
  for (let i = 0; i < 400; i++) {
    const s = nowMs - (CROPS.pumpkin.hours + 3) * H - i * 500, p = ripe({ sown: s, q: round(100, 20) });
    const d = (await one("select town.quality_harvest($1, $2::jsonb, 0, $3::bigint, (select s.salt from town.quality_salt s where s.one), 0, false)->'gold' g", [ROOT, JSON.stringify(p), nowMs])).g;
    if (d !== QP.goldOf(ROOT, p, nowMs)) differ++;
  }
  eq(differ > 0, true, "the salt changes the draw");

  // ── a sickle's row passes one grown by ──
  await tilledAll();
  await db.exec("update town.quality_salt set salt = '' where one");
  const pOut = { ...big(2), pull: { by: m1, at: nowMs, crew: [m1, m2], go: nowMs, hits: {}, paid: [], out: nowMs, bonus: 0, helped: [] } };
  const rowPlots = Object.fromEntries(allKeys.filter((c) => c.endsWith(`,${ry}`)).map((c) => [c, { soil: "tilled", plant: null }]));
  rowPlots[ROOT] = { soil: "tilled", plant: pOut };
  rowPlots[k(1, 3)] = { soil: "tilled", plant: ripe({ sown: nowMs - (CROPS.pumpkin.hours + 3) * H }) };
  rowPlots[k(5, 3)] = { soil: "tilled", plant: ripe({ sown: nowMs - (CROPS.pumpkin.hours + 4) * H }) };
  rowPlots[k(6, 3)] = { soil: "tilled", plant: ripe({ sown: nowMs - (CROPS.pumpkin.hours + 5) * H }) };
  const rowKeys = Object.keys(rowPlots), wearer = { ...(await purseOf(m1)), hand: null, gifts: { had: ["charmSickle"], charms: ["charmSickle"] } };
  const rowAt = async (at_) => (await one("select town.row_for($1, $2::jsonb, $3::jsonb, $4::jsonb, $5, $6::bigint, $5) r", [at_, JSON.stringify(rowKeys), JSON.stringify(rowPlots), JSON.stringify(wearer), m1, nowMs])).r;
  eq(await rowAt(ROOT), null, "not begun at one grown");
  const fromNext = await rowAt(k(1, 3));
  eq(fromNext?.deed, "pick", "a sickle still takes ordinary plants along a row");
  eq(fromNext?.plots.includes(k(5, 3)) && fromNext?.plots.includes(k(6, 3)), true, "all of them");
  eq(fromNext?.plots.includes(ROOT), false, "and passes by the one grown");
  const page = F.rowFor(k(1, 3), rowKeys, rowPlots, wearer, m1, nowMs, m1);
  eq(page && { deed: page.deed, plots: [...page.plots].sort() }, fromNext && { deed: fromNext.deed, plots: [...fromNext.plots].sort() }, "as the page says");

  // ── a function whose text has moved stops the file, with nothing done ──
  const was = (await one("select pg_get_functiondef('town.twice_wanted(text,jsonb,bigint)'::regprocedure) d")).d;
  await db.exec(was.replace("if p = 'null'::jsonb or coalesce((p->'size'->>'until')::bigint, 0) > p_now then return false; end if;", "if p is null then return false; end if;"));
  const moved = await fns();
  let stopped = "";
  try { await db.exec(sql); } catch (e) { stopped = e.message; await db.exec("rollback"); }
  eq(/v317: town\.twice_wanted/.test(stopped), true, `it says which: ${stopped.slice(0, 60)}`);
  eq(await fns(), moved, "and nothing is changed");
  await db.exec(was);

  console.log(`v317: ${checks} checks passed${failed ? `, ${failed} FAILED` : ""}.`);
  if (failed) process.exitCode = 1;
} catch (e) { console.error(e.message, e.detail ?? "", e.where ?? "", e.stack?.split("\n").slice(1, 4).join(" | ")); process.exitCode = 1; } finally { await db.close(); }
