// A dry run of supabase/v323_the_editors_farm.sql (the editor's farm and its switch) on a stand-in in PGlite: only what
// the file touches is made (the catalog's farm rows as the code makes them for the old farm, the plots, purses, pots,
// animals, springs, and the live triggers' names), seeded with members' things on the old farm; the file run twice; the
// farm switched to the editor's and back. Nothing of production is touched.
//
//   cd <the tree> && FC_REPO=<the tree> PGLITE=<a folder with node_modules/@electric-sql/pglite> node .claude/skills/fc-cash-town/scripts/db/v323.test.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// (the tree, with forward slashes: the loader of its TypeScript compares paths so)
const REPO = (process.env.FC_REPO ?? process.cwd()).split(String.fromCharCode(92)).join("/");
const PG = process.env.PGLITE ?? "E:/NinenineProject/fcnext-codex-bench";
const { PGlite } = await import(pathToFileURL(`${PG}/node_modules/@electric-sql/pglite/dist/index.js`).href);
let pass = 0, fail = 0;
const ok = (n, c, d = "") => { c ? pass++ : fail++; if (!c || process.env.ALL) console.log(`  ${c ? "PASS" : "FAIL"} ${n}${c ? "" : "  " + (typeof d === "string" ? d : JSON.stringify(d)).slice(0, 600)}`); };

// the catalog's rows as the code makes them for the old farm (the town the editor's, as live), and both farms' parts
const run = (args, env) => execFileSync(process.execPath, args, { cwd: REPO, env: { ...process.env, FC_REPO: REPO, TOWN_MAP: "town2", ...env }, encoding: "utf8", maxBuffer: 1 << 28 });
const catalog = JSON.parse(run(["-e", `await import("./.claude/skills/fc-cash-town/scripts/db/repo-ts-town.mjs"); const { catalogOf } = await import("@/lib/town/catalog"); process.stdout.write(JSON.stringify(catalogOf()));`, "--input-type=module"], { FARM_MAP: "classic" }));
const C = JSON.parse(run([".claude/skills/fc-cash-town/scripts/db/farm2-parts.mjs"], { FARM_MAP: "classic" }));
const F = JSON.parse(run([".claude/skills/fc-cash-town/scripts/db/farm2-parts.mjs"], { FARM_MAP: "farm2" }));
const V323 = readFileSync(`${REPO}/supabase/v323_the_editors_farm.sql`, "utf8");

const db = new PGlite();
/** A thing as JSON with its keys in order (the database keeps no order of an object's keys). */
const J = (v) => JSON.stringify(v, (k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
// (a file of many statements is run as a script; one statement as a query)
const tryQ = async (sql, params) => { try { if (params === undefined && /;\s*\S/.test(sql)) await db.exec(sql); else await db.query(sql, params); return null; } catch (e) { try { await db.exec("rollback"); } catch { /* none open */ } return e.message; } };

await db.exec(`
create role anon; create role authenticated;
create schema town;
create table public.profiles (id uuid primary key, is_admin boolean not null default false);
create table public.town_catalog (key text primary key, data jsonb not null, updated_at timestamptz not null default now());
create function town.cat(k text) returns jsonb language sql stable as $$ select data from public.town_catalog where key = k $$;
create function town.swap_in(list jsonb, keep jsonb, by text) returns jsonb language sql immutable as $$ select list $$;
create table public.town_garden_book (crop text primary key);
create function town.well_by(p_x integer, p_y integer) returns integer language sql stable as $$ select null::integer $$;
create function town.at_well(p_x integer, p_y integer) returns boolean language sql stable as $$ select false $$;
create function town.bed_of(p_x integer, p_y integer) returns integer language sql stable as $$
  select (b.o - 1)::integer from jsonb_array_elements(town.cat('farming')->'bedsAt') with ordinality b(c, o)
   where p_x >= (b.c->>0)::integer and p_x < (b.c->>0)::integer + (town.cat('farming')->>'side')::integer
     and p_y >= (b.c->>1)::integer and p_y < (b.c->>1)::integer + (town.cat('farming')->>'side')::integer limit 1 $$;
-- (a plot's x and y are smallints, as v110 made them)
create table public.town_plots (x smallint not null, y smallint not null, bed integer, soil text, plant jsonb, damp boolean, house jsonb, changed bigint, primary key (x, y));
create table public.town_purses (member_id uuid primary key, doc jsonb not null);
create table public.town_pots (id bigint primary key, x integer not null, y integer not null, feast boolean not null default false);
create table public.town_ground (id bigint primary key, x integer not null, y integer not null);
create table public.town_animals (id uuid primary key, owner uuid not null, a jsonb not null, changed bigint not null default 0);
create table town.reward_springs (site integer primary key, doc jsonb not null);
-- the live triggers, by their names: each writes a line when it fires, so that the switch can be seen to keep them quiet
create table public.fired (tg text, at timestamptz default clock_timestamp());
create function public.note_fired() returns trigger language plpgsql as $$ begin insert into public.fired (tg) values (tg_name); return coalesce(new, old); end $$;
create trigger town_garden_spread after insert or update of plant, soil, damp on public.town_plots for each row execute function public.note_fired();
create trigger town_quality_keep before insert or update of plant, house on public.town_plots for each row execute function public.note_fired();
create trigger town_announce_garden_book after insert or update of doc on public.town_purses for each row execute function public.note_fired();
`);
for (const key of ["farming", "cooking", "insects", "ground", "box", "lamps", "animals"]) await db.query("insert into public.town_catalog (key, data) values ($1, $2)", [key, catalog[key]]);
// (the rewards row is the database's own: v224 to v291's numbers, the farm's of the old farm)
await db.query("insert into public.town_catalog (key, data) values ('rewards', $1)", [{ cloudCorners: C.bedsAt, nurseryBoxes: [[0, 0, 80, 80], [128, 0, 112, 86], [144, 112, 96, 80]], springSites: [[39, 32], [159, 24], [189, 162], [11, 216], [58, 230]] }]);

// ── members' things on the old farm ──
const M = ["00000000-0000-0000-0000-00000000000a", "00000000-0000-0000-0000-00000000000b", "00000000-0000-0000-0000-00000000000c"];
for (const m of M) await db.query("insert into public.profiles (id) values ($1)", [m]);
const plots = [];
const bedOfC = (x, y) => C.bedsAt.findIndex(([bx, by]) => x >= bx && x < bx + 7 && y >= by && y < by + 7);
for (const bed of [0, 5, 6, 23, 24, 47]) {
  const [bx, by] = C.bedsAt[bed];
  for (const [i, j] of [[0, 0], [3, 2], [6, 6], [2, 5]]) plots.push({ x: bx + i, y: by + j, bed, soil: "tilled", plant: { crop: "popoto", sown: 1000 + bed }, damp: (i + j) % 2 === 0, house: j === 5 ? { kind: "bee" } : null });
}
// a plant moved once by the hoe (its home kept), and a giant of 2 x 2 in bed 6
const [g6x, g6y] = C.bedsAt[6];
plots.find((p) => p.bed === 5 && p.x === C.bedsAt[5][0]).plant.home = `${C.bedsAt[5][0] + 1},${C.bedsAt[5][1] + 1}`;
const root = `${g6x + 4},${g6y + 1}`, foot = [root, `${g6x + 5},${g6y + 1}`, `${g6x + 4},${g6y + 2}`, `${g6x + 5},${g6y + 2}`];
for (const k of foot) { const [x, y] = k.split(",").map(Number); plots.push({ x, y, bed: 6, soil: "tilled", plant: k === root ? { crop: "giantpopoto", sown: 5, root, footprint: foot } : { part: true, root }, damp: false, house: null }); }
for (const p of plots) await db.query("insert into public.town_plots (x, y, bed, soil, plant, damp, house, changed) values ($1, $2, $3, $4, $5, $6, $7, 1)", [p.x, p.y, p.bed, p.soil, p.plant, p.damp, p.house]);
const pk = (bed, i, j) => `${C.bedsAt[bed][0] + i},${C.bedsAt[bed][1] + j}`;
const purses = {
  [M[0]]: { coins: 5, professionRewards: { pollen: [{ key: pk(0, 1, 1), cells: [pk(0, 1, 1), pk(0, 2, 1)], identity: `pollen:${pk(0, 1, 1)}:1700000000000`, until: 99 }], giant: { key: root, root: `giant:${root}` },
    relay: { at: [C.wellAt[0] + 2, C.wellAt[1] + 1], from: [C.wellAt[0] + 2, C.wellAt[1] + 1] }, rowStart: { key: pk(23, 0, 3) } }, aided: [{ key: pk(47, 6, 6), at: 7 }] },
  [M[1]]: { coins: 9, professionRewards: { nursery: { at: [C.barns[3][0] + 2, C.barns[3][1] + 5] }, bean: { at: [C.bedsAt[24][0] + 3, C.bedsAt[24][1] + 3] },
    // (a banquet begun at a farm tile, and the rescue ticket that holds copies of it: lib/town/reward-rescue)
    kitchen: { kind: "banquet", at: C.bedsAt[0], stage: 2, serves: 5 },
    rescueTicket: { id: "t1", kind: "kitchen", at: C.bedsAt[0], stage: 2, until: 9, ask: false, snapshot: { kind: "banquet", at: C.bedsAt[0], stage: 2, serves: 5 }, live: { kind: "banquet", at: C.bedsAt[0], stage: 2, serves: 5 } } }, lured: { x: C.bedsAt[6][0] + 2.4, y: C.bedsAt[6][1] + 3.7, bug: "ant" }, toast: { at: [999, 999] } },
  [M[2]]: { coins: 1, gardenBook: ["x"] },
};
for (const [m, doc] of Object.entries(purses)) await db.query("insert into public.town_purses (member_id, doc) values ($1, $2)", [m, doc]);
await db.query("insert into public.town_pots (id, x, y, feast) values (1, $1, $2, false), (2, 40, 40, false), (3, $3, $4, false)", [C.arrive[0] + 3, C.arrive[1], C.barns[10][0] + 3, C.barns[10][1] + 2]);
await db.query("insert into public.town_animals (id, owner, a) values ('00000000-0000-0000-0000-0000000000f1', $1, $2)", [M[0], { id: "f1", outside: [{ at: C.eggSpots[3], n: 2 }, { at: C.eggSpots[20], n: 1 }] }]);
await db.query("insert into town.reward_springs (site, doc) values (1, $1), (0, $2)", [{ site: 1, left: 5, until: 9, at: C.springFarm }, { site: 0, left: 0, until: 0, at: [39, 32] }]);
await db.query("delete from public.fired");

const before = { plots: await q("select x, y, bed, soil, plant, damp, house from public.town_plots order by x, y"), purses: await q("select member_id, doc from public.town_purses order by member_id") };

// ── the file, twice ──
for (let n = 1; n <= 2; n++) {
  const e = await tryQ(V323);
  ok(`v323 runs (time ${n})`, e === null, e);
}
ok("the farm is the old one, epoch 0", JSON.stringify(await one("select catalog, epoch::integer from public.town_farm_switch")) === JSON.stringify({ catalog: "classic", epoch: 0 }));
ok("both farms' parts are kept, as the code made them", (await q("select map, taken from town.farm_parts order by map")).map((r) => `${r.map}:${r.taken}`).join() === "classic:code,farm2:code");
ok("nothing of the catalog changed by running it", JSON.stringify((await one("select data from public.town_catalog where key = 'farming'")).data.bedsAt) === JSON.stringify(C.bedsAt));
ok("the old farm's first well: beside it, not on it", (await one("select town.at_well($1, $2) a, town.at_well($3, $4) b", [C.wells[0][0] + 1, C.wells[0][1], C.wells[0][0], C.wells[0][1]])).a === true);
ok("a member reads which farm it is", (await one("select public.town_farm_map() m")).m === "classic");

// ── the switch to the editor's farm ──
const moved = await one("select town.apply_farm('farm2') r");
ok("switched to the editor's farm", moved.r.ok === true && moved.r.map === "farm2" && moved.r.epoch === 1, moved.r);
ok("what was moved, counted", moved.r.moved.plots === plots.length && moved.r.moved.purses === 2 && moved.r.moved.animals === 1 && moved.r.moved.springs === 1, moved.r.moved);
ok("the triggers kept quiet while it moved", (await q("select tg from public.fired")).length === 0, await q("select tg from public.fired"));
const cat = async (k) => (await one("select data from public.town_catalog where key = $1", [k])).data;
const farming = await cat("farming");
ok("the catalog's beds and wells are the editor's", JSON.stringify(farming.bedsAt) === JSON.stringify(F.bedsAt) && JSON.stringify(farming.wells) === JSON.stringify(F.wells) && farming.wellSize === 2);
ok("bed 0's corner is bed 0, bed 47's far corner bed 47", JSON.stringify(await one("select town.bed_of($1, $2) a, town.bed_of($3, $4) b", [F.bedsAt[0][0], F.bedsAt[0][1], F.bedsAt[47][0] + 6, F.bedsAt[47][1] + 6])) === JSON.stringify({ a: 0, b: 47 }));
ok("beside the 2 x 2 well, on all its sides; not on its stones", (await one(`select bool_and(town.at_well(x, y)) a from (values ($1::int, $2::int), ($3, $2), ($1, $4), ($5, $6)) v(x, y)`,
  [F.wells[0][0] - 1, F.wells[0][1], F.wells[0][0] + 2, F.wells[0][1] + 2, F.wells[0][0] + 1, F.wells[0][1] - 1])).a === true
  && (await one("select town.at_well($1, $2) a, town.at_well($3, $4) b", [F.wells[0][0], F.wells[0][1], F.wells[0][0] + 1, F.wells[0][1] + 1])).a === false);
ok("the second well is the second", (await one("select town.well_by($1, $2) w", [F.wells[1][0] + 2, F.wells[1][1]])).w === 1);
ok("the lamps, the chests, eggs, the wagon, cloud corners, nursery, spring are the editor's",
  JSON.stringify((await cat("lamps")).maps.farm) === JSON.stringify(F.lampsFarm) && JSON.stringify((await cat("box")).more.filter(([x]) => x >= 128)) === JSON.stringify(F.boxFarm)
  && JSON.stringify((await cat("animals")).eggSpots) === JSON.stringify(F.eggSpots) && JSON.stringify((await cat("animals")).wagonStops.farm) === JSON.stringify(F.wagonFarm)
  && JSON.stringify((await cat("rewards")).cloudCorners) === JSON.stringify(F.bedsAt) && JSON.stringify((await cat("rewards")).nurseryBoxes[1]) === JSON.stringify(F.nurseryFarm)
  && JSON.stringify((await cat("rewards")).springSites[1]) === JSON.stringify(F.springFarm));
ok("the town's and the forest's parts are as they were", JSON.stringify((await cat("rewards")).nurseryBoxes[0]) === "[0,0,80,80]" && JSON.stringify((await cat("rewards")).springSites[0]) === "[39,32]"
  && JSON.stringify((await cat("ground")).maps.filter((m) => m[0] !== 128)) === JSON.stringify(catalog.ground.maps.filter((m) => m[0] !== 128)) && JSON.stringify((await cat("lamps")).maps.forest) === JSON.stringify(catalog.lamps.maps.forest));
const haunts = (await cat("insects")).haunts;
ok("the farm's haunts are the editor's, every other as it was", Object.entries(F.haunts).every(([i, h]) => JSON.stringify(haunts[i]) === JSON.stringify(h)) && haunts.every((h, i) => h[1] === "farm" || JSON.stringify(h) === JSON.stringify(catalog.insects.haunts[i])));
// every plot with its bed, the same plot of it, all it held
const now = await q("select x, y, bed, soil, plant, damp, house from public.town_plots order by bed, x, y");
const want = before.plots.map((p) => { const b = bedOfC(p.x, p.y), [cx, cy] = C.bedsAt[b], [nx, ny] = F.bedsAt[b]; return { ...p, x: p.x - cx + nx, y: p.y - cy + ny }; });
const key = (p) => `${p.x},${p.y}`;
ok("every plot is the same plot of its bed in the editor's farm", want.every((w) => now.some((p) => key(p) === key(w) && p.bed === w.bed && p.soil === w.soil && p.damp === w.damp && JSON.stringify(p.house) === JSON.stringify(w.house))), { want: want.slice(0, 3), now: now.slice(0, 3) });
const rootN = (() => { const [x, y] = root.split(",").map(Number), [cx, cy] = C.bedsAt[6], [nx, ny] = F.bedsAt[6]; return `${x - cx + nx},${y - cy + ny}`; })();
const giant = now.find((p) => key(p) === rootN);
ok("the giant's root and footprint moved with it", giant?.plant.root === rootN && giant.plant.footprint.length === 4 && giant.plant.footprint.every((k) => now.some((p) => key(p) === k && p.plant.root === rootN)), giant);
ok("a plant not moved before keeps its old plot's key as home; a moved one keeps its own", (() => {
  const p0 = now.find((p) => p.bed === 0 && p.x === F.bedsAt[0][0] && p.y === F.bedsAt[0][1]), p5 = now.find((p) => p.bed === 5 && p.x === F.bedsAt[5][0] && p.y === F.bedsAt[5][1]);
  return p0?.plant.home === pk(0, 0, 0) && p5?.plant.home === `${C.bedsAt[5][0] + 1},${C.bedsAt[5][1] + 1}` && giant.plant.home === root && !now.find((p) => p.plant.part && p.plant.home);
})(), now.filter((p) => p.bed === 0).slice(0, 2));
const purse = async (m) => (await one("select doc from public.town_purses where member_id = $1", [m])).doc;
const mv = (bed, i, j) => `${F.bedsAt[bed][0] + i},${F.bedsAt[bed][1] + j}`;
const pa = await purse(M[0]), pb = await purse(M[1]);
ok("pollen, a growing giant, a row begun and what was aided moved with their beds", pa.professionRewards.pollen[0].key === mv(0, 1, 1) && pa.professionRewards.pollen[0].cells.join() === [mv(0, 1, 1), mv(0, 2, 1)].join()
  && pa.professionRewards.pollen[0].identity === `pollen:${mv(0, 1, 1)}:1700000000000` && pa.professionRewards.giant.key === rootN && pa.professionRewards.giant.root === `giant:${rootN}`
  && pa.professionRewards.rowStart.key === mv(23, 0, 3) && pa.aided[0].key === mv(47, 6, 6) && pa.coins === 5 && pa.professionRewards.pollen[0].until === 99, pa);
const open = (p, x, y) => x >= p.rect[0] && y >= p.rect[1] && x < p.rect[0] + p.rect[2] && y < p.rect[1] + p.rect[3] && p.walk[y - p.rect[1]][x - p.rect[0]] === ".";
ok("a relay and a nursery at farm tiles moved onto tiles one may stand on", open(F, ...pa.professionRewards.relay.at) && open(F, ...pb.professionRewards.nursery.at), [pa.professionRewards.relay, pb.professionRewards.nursery]);
ok("the nursery by a barn is by the same barn", Math.abs(pb.professionRewards.nursery.at[0] - (F.barns[3][0] + 2)) <= 2 && Math.abs(pb.professionRewards.nursery.at[1] - (F.barns[3][1] + 5)) <= 2, pb.professionRewards.nursery);
ok("a bean on a plot moved with its bed; a lured insect kept its place in its tile; a tile of no farm untouched", JSON.stringify(pb.professionRewards.bean.at) === JSON.stringify([F.bedsAt[24][0] + 3, F.bedsAt[24][1] + 3])
  && Math.abs(pb.lured.x - (F.bedsAt[6][0] + 2.4)) < 1e-9 && Math.abs(pb.lured.y - (F.bedsAt[6][1] + 3.7)) < 1e-9 && pb.lured.bug === "ant" && JSON.stringify(pb.toast.at) === "[999,999]", pb);
ok("a banquet and its rescue ticket moved together: the ticket still matches it", J(pb.professionRewards.kitchen) === J(pb.professionRewards.rescueTicket.live)
  && J(pb.professionRewards.kitchen.at) === J(F.bedsAt[0]) && J(pb.professionRewards.rescueTicket.at) === J(F.bedsAt[0]) && J(pb.professionRewards.rescueTicket.snapshot.at) === J(F.bedsAt[0]), pb.professionRewards);
ok("a purse with nothing on the farm is not written", J(await purse(M[2])) === J(purses[M[2]]));
const eggs = (await one("select a from public.town_animals")).a.outside;
ok("eggs laid out are at the same egg spots", JSON.stringify(eggs.map((e) => e.at)) === JSON.stringify([F.eggSpots[3], F.eggSpots[20]]) && eggs[0].n === 2, eggs);
const pots = await q("select id, x, y from public.town_pots order by id");
ok("pots on the farm on tiles one may stand on; the town's where it was", open(F, pots[0].x, pots[0].y) && open(F, pots[2].x, pots[2].y) && pots[1].x === 40 && pots[1].y === 40, pots);
ok("the spring by the well is by the editor's", JSON.stringify((await one("select doc from town.reward_springs where site = 1")).doc.at) === JSON.stringify(F.springFarm));
ok("the triggers are back on after it", (await tryQ("update public.town_plots set plant = plant where bed = 0")) === null && (await q("select tg from public.fired")).length > 0);
await db.query("delete from public.fired");

// ── a page left on the old farm is refused; one on the new is not; a request with no farm is not held to it ──
// (a request as PostgREST hands it on: its headers, and who asks; \`farm\` undefined: no request at all)
const asPage = async (farm, sql, role = "authenticated") => {
  await db.query("select set_config('request.headers', $1, false), set_config('request.jwt.claims', $2, false)", [farm === undefined ? "" : JSON.stringify(farm === null ? { "user-agent": "x" } : { "x-town-farm": farm }), JSON.stringify({ role })]);
  const e = await tryQ(sql);
  await db.query("select set_config('request.headers', '', false), set_config('request.jwt.claims', '', false)");
  return e;
};
ok("a page with the old farm cannot write a plot", /farm-moved/.test((await asPage("classic", "update public.town_plots set damp = not damp where bed = 0")) ?? ""));
ok("nor a purse, nor a pot", /farm-moved/.test((await asPage("classic", `update public.town_purses set doc = doc where member_id = '${M[2]}'`)) ?? "") && /farm-moved/.test((await asPage("classic", "update public.town_pots set x = x where id = 2")) ?? ""));
ok("a page with the editor's farm can", (await asPage("farm2", "update public.town_plots set soil = soil where bed = 0")) === null);
ok("a member's page from before the deploy, which says no farm, cannot write a plot, a pot or a thing on the ground", /farm-moved/.test((await asPage(null, "update public.town_plots set damp = not damp where bed = 0")) ?? "")
  && /farm-moved/.test((await asPage(null, "update public.town_pots set x = x where id = 2")) ?? ""));
ok("but writes a purse, as a page without the town does", (await asPage(null, `update public.town_purses set doc = jsonb_set(doc, '{coins}', '2') where member_id = '${M[2]}'`)) === null);
ok("not what of a purse holds a farm tile: a banquet begun from a page from before the deploy is refused", /farm-moved/.test((await asPage(null,
  `update public.town_purses set doc = jsonb_set(doc, '{professionRewards}', '{"kitchen": {"kind": "banquet", "at": [132, 4], "stage": 0}}') where member_id = '${M[2]}'`)) ?? ""));
ok("the site's server, saying no farm, writes a plot", (await asPage(null, "update public.town_plots set soil = soil where bed = 0", "service_role")) === null);
ok("so does what is no request (the SQL editor, a job of the database's)", (await asPage(undefined, "update public.town_plots set soil = soil where bed = 0")) === null);

// ── a switch back, at once ──
const back = await one("select town.apply_farm('classic') r");
ok("switched back to the old farm", back.r.ok === true && back.r.map === "classic" && back.r.epoch === 2, back.r);
ok("the catalog is the old farm's again, exactly", JSON.stringify((await cat("farming")).bedsAt) === JSON.stringify(C.bedsAt) && (await cat("farming")).wellSize === 1
  && JSON.stringify((await cat("lamps")).maps.farm) === JSON.stringify(catalog.lamps.maps.farm) && JSON.stringify((await cat("insects")).haunts) === JSON.stringify(catalog.insects.haunts)
  && JSON.stringify((await cat("box")).more) === JSON.stringify(catalog.box.more) && JSON.stringify((await cat("animals")).eggSpots) === JSON.stringify(catalog.animals.eggSpots)
  && JSON.stringify((await cat("rewards")).nurseryBoxes) === JSON.stringify([[0, 0, 80, 80], [128, 0, 112, 86], [144, 112, 96, 80]]) && JSON.stringify((await cat("rewards")).springSites[1]) === "[159,24]");
const after = await q("select x, y, bed, soil, plant, damp, house from public.town_plots order by x, y");
// (bed 0's damp was turned twice on the way: back as it was; a plant's home stays, the key of the plot it is on)
const same = (a, b) => J({ ...a, plant: { ...a.plant, home: undefined } }) === J({ ...b, plant: { ...b.plant, home: undefined } });
ok("every plot is back on its tile, all it held as it was", before.plots.length === after.length && before.plots.every((p, i) => same(p, after[i]) && (!after[i].plant.home || after[i].plant.home === (p.plant.home ?? `${p.x},${p.y}`) || after[i].plant.part)), { before: before.plots.slice(0, 2), after: after.slice(0, 2) });
const pa2 = await purse(M[0]);
ok("what was waiting on a plot is back on it, exactly", J(pa2.professionRewards.pollen) === J(purses[M[0]].professionRewards.pollen) && J(pa2.professionRewards.giant) === J(purses[M[0]].professionRewards.giant)
  && J(pa2.aided) === J(purses[M[0]].aided) && J(pa2.professionRewards.rowStart) === J(purses[M[0]].professionRewards.rowStart), pa2);
ok("what was elsewhere on the farm is on a tile one may stand on of the old farm", open(C, ...pa2.professionRewards.relay.at) && open(C, ...(await purse(M[1])).professionRewards.nursery.at));
ok("eggs at their old spots again", JSON.stringify((await one("select a from public.town_animals")).a.outside.map((e) => e.at)) === JSON.stringify([C.eggSpots[3], C.eggSpots[20]]));
ok("a switch to the farm it is already changes nothing", (await one("select town.apply_farm('classic') r")).r.epoch === 2 && (await one("select epoch::integer e from public.town_farm_switch")).e === 2);
ok("a farm of no name is refused", (await one("select town.apply_farm('nowhere') r")).r.ok === false);
ok("nobody but the database calls the switch", /permission denied/.test((await (async () => { await db.query("set role authenticated"); const e = await tryQ("select town.apply_farm('farm2')"); await db.query("reset role"); return e; })()) ?? ""));
ok("a member may read which farm it is", (await (async () => { await db.query("set role authenticated"); const e = await tryQ("select public.town_farm_map()"); await db.query("reset role"); return e; })()) === null);
// the file again, after a switch away and back: it keeps the live parts of the old farm, it writes the editor's again
ok("run again after switching, it runs", (await tryQ(V323)) === null);
ok("the old farm's parts kept are the catalog's, not written over", (await one("select taken from town.farm_parts where map = 'classic'")).taken === "live");
console.log(`v323: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
