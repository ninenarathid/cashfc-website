/*
 * v126 — a ladybird takes a pest with it: dry run in PGlite.
 *
 * v126 adds one rule (`town.rid_pick`, lib/town/insects.ts's pestToRid), writes the `insects` catalog row over (a
 * ladybird's `rids` and its hours) and writes v125's `public.town_net` again with a block more: a ladybird caught has
 * a chance of ridding one plot of the farm of its pest.
 *
 * v105 to v125 are replayed as they ran, then v127 to v129 (the well's and the board's, which ran before this one:
 * nothing of v126 stands on them), then v126 twice. Then: every case of the rule made from the code as it is, put to
 * the SQL under a clear sky; the function written again held to v125's text but for the lines of v126.lines.mjs; and
 * the keeping, with the chance turned to always and to never: which plot, what is written of it and what is not, the
 * deed, the answer, the catch itself as it was, who may.
 *
 *   node build-v126.mjs && node v126.test.mjs            (RULES=0 skips the cases; RULES=few puts one in five, for the breaks)
 *   node mutate.mjs v126_draft.sql v126.test.mjs v126.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { TOWN_NET } from "./v126.lines.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v126_draft.sql")) ? readFileSync(here("v126_draft.sql"), "utf8") : migration(126);
const told = JSON.parse(readFileSync(here("now/vectors-v126.json"), "utf8"));
const cases = process.env.RULES === "0" ? [] : process.env.RULES === "few" ? told.cases.filter((c, i) => i % 5 === 0 || c.want === null) : told.cases;

const extra = `
create table public.kudos (id bigint generated always as identity primary key, sender_id uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null, day date not null default current_date, created_at timestamptz not null default now(), unique (sender_id, receiver_character_id, day));
alter table public.kudos enable row level security;
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

const t = await supabaseLike({ extra });
for (let n = 105; n <= 124; n++) await t.run(migration(n), `v${n}`);

t.section("it will not run before v125");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v125, it stops at its first line and says why", !!stopped && /v125 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regprocedure('town.rid_pick(jsonb, bigint, double precision)') is null as no_rule, (select count(*)::int from public.town_catalog where key = 'insects') as rows`);
  t.check("…having done nothing", v.rows[0].no_rule && v.rows[0].rows === 0, v.rows);
}
const V125 = migration(125);
await t.run(V125, "v125");
// (what ran after v125 and before this one, in the order it ran; v129 while it is there)
for (const n of [127, 128, 129]) { let sql = null; try { sql = migration(n); } catch { /* not written yet, or not this tree's */ } if (sql) await t.run(sql, `v${n}`); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
const NOON = Date.parse("2026-10-05T12:00:00+07:00"), HOUR = 3_600_000;
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = $1`, [ms]);
const insectsBefore = (await t.sql(`select data from public.town_catalog where key = 'insects'`)).rows[0].data;
await t.runTwice(FILE, "v126");

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);

/* ── the catalog row ─────────────────────────────────────────────────────── */

t.section("the insects' row");
{
  const now = (await t.sql(`select data from public.town_catalog where key = 'insects'`)).rows[0].data;
  t.check("a ladybird has one chance in ten of taking a pest with it, and no other insect has any", now.bugs.ladybird.rids === 0.1 && Object.keys(now.bugs).filter((b) => "rids" in now.bugs[b]).join() === "ladybird",
    Object.keys(now.bugs).filter((b) => "rids" in now.bugs[b]));
  t.check("and is out from 05:00 to 18:00", same(now.bugs.ladybird.hours, [[5, 18]]), now.bugs.ladybird.hours);
  const but = (row) => ({ ...row, bugs: { ...row.bugs, ladybird: { ...row.bugs.ladybird, hours: null, rids: null } } });
  t.check("nothing else of the row is other than v125 wrote it: every haunt, every other insect, the net", same(but(now), but(insectsBefore)),
    Object.keys(now).filter((k) => !same(but(now)[k], but(insectsBefore)[k])));
  t.check("v125 had it out till 11:00, with no such chance", same(insectsBefore.bugs.ladybird.hours, [[5, 11]]) && !("rids" in insectsBefore.bugs.ladybird), insectsBefore.bugs.ladybird);
}

/* ── the rule, case by case ──────────────────────────────────────────────── */

t.section(`which plant: ${cases.length} cases, each as the site's own code answers it`);
{
  const sky = await t.sql(`select count(*)::int as n from public.town_weather`);
  t.check("the sky is clear, as the cases were made", sky.rows[0].n === 0, sky.rows);
  let bad = 0, first = null, found = 0;
  for (const v of cases) {
    let got, error = null;
    try { got = (await t.db.query(`select town.rid_pick($1::jsonb, $2::bigint, $3::float8) as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (v.want !== null) found++;
    if (error || (got ?? null) !== v.want) { bad++; first ??= { now: v.args[1], pick: v.args[2], plots: Object.keys(v.args[0]).length, want: v.want, got: error ?? got }; }
  }
  t.check(`rid_pick: ${cases.length} cases`, bad === 0, bad ? `${bad} differ; the first: ${JSON.stringify(first)}` : "");
  if (cases.length) t.check("among them plots with a pest, and none", found > 10 && cases.length - found > 5, { found, none: cases.length - found });
  const odd = await t.sql(`select town.rid_pick(null, 0, 0.5) as nothing, town.rid_pick('{}'::jsonb, 0, null) as empty, town.rid_pick('{"1,1": {"soil": "tilled", "plant": null}}'::jsonb, ${NOON}, 0.5) as bare`);
  t.check("no plots, or a plot with no plant: none, and no error", same(odd.rows[0], { nothing: null, empty: null, bare: null }), odd.rows);
}

/* ── what is written again ───────────────────────────────────────────────── */

t.section("the function written again is v125's, word for word but for the lines meant");
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };
{
  const old = words(V125, "public.town_net"), now = words(FILE, "public.town_net");
  let made = old, once = true;
  for (const [from, to] of TOWN_NET) { if (!made || made.split(from).length !== 2) once = false; else made = made.replace(from, () => to); }
  t.check("public.town_net is v125's, but for the lines of v126.lines.mjs", !!old && !!now && once && old !== now && made === now,
    !old ? "not found in v125" : !now ? "not in the file" : !once ? "a line meant is not in v125's once" : "it differs elsewhere: run build-v126.mjs");
  const madeHere = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes two functions: the rule, and the catch", same(madeHere.sort(), ["public.town_net", "town.rid_pick"]), madeHere);
  // (the plot is written as the farm writes one: under its bed's lock, taken the same way)
  const tend = words(migration(121), "public.town_tend");
  t.check("the plot is written under its bed's lock, taken as town_tend takes it",
    !!tend && tend.includes("perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);") && tend.includes("town.bed_of(") && !!now
      && now.includes("perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));")
      && now.indexOf("pg_advisory_xact_lock(hashtext('town.bed')") < now.indexOf("for update;") && now.indexOf("for update;") < now.indexOf("update public.town_plots set"),
    "the lock, the row, then the writing");
  t.check("and what it writes of the plot is its plant and the moment: never the water", !!now && now.includes("update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;") && !/watered/.test(now));
}

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select town.cat('insects')->'bugs'->'ladybird'->>'rids' as chance, town.cat('insects')->'bugs'->'ladybird'->'hours' as hours,
  (select count(*)::int from jsonb_each(town.cat('insects')->'bugs') b where b.value ? 'rids') as kinds`);
t.check("the chance, the hours, one kind", same(v.rows[0], { chance: "0.1", hours: [[5, 18]], kinds: 1 }), v.rows);
v = await t.sql(`select has_function_privilege('authenticated', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as member,
  has_function_privilege('anon', 'public.town_net(integer, integer, integer, numeric, uuid)', 'execute') as anon,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("a catch is a member's, nobody's signed out, and the rules are no browser's", same(v.rows[0], { member: true, anon: false, open: 0 }), v.rows);
v = await t.sql(`select town.rid_pick('{}'::jsonb, town.now_ms(), 0.5) as none`);
t.check("no plots, none", v.rows[0].none === null, v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const rpc = async (who, fn, args = {}) => {
  const keys = Object.keys(args);
  const r = await t.as(who, `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, keys.map((k) => param(args[k])));
  return r.error ? { error: r.error } : r.rows[0].r;
};
const grant = async (who, item, n = 1) => { await t.sql(`insert into public.town_purses (member_id, doc) values ($1, town.fresh()) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', town.put(doc->'bag', $2, $3::int)) where member_id = $1`, [who, item, n]); };
const holdItem = (who, item) => t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', $2::text) where member_id = $1`, [who, item]);
const heldOf = async (who, item) => (await t.sql(`select town.held(doc->'bag', $2) as n from public.town_purses where member_id = $1`, [who, item])).rows[0]?.n ?? 0;
const staminaOf = async (who) => (await t.sql(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [who])).rows[0].s;
const haunts = (await t.sql(`select town.cat('insects')->'haunts' as h, town.cat('insects')->'kinds' as k, town.cat('insects')->'bugs' as b`)).rows[0];
const tileBy = (id) => { const [x, y] = haunts.h[id][3][0]; return [Math.floor(x), Math.floor(y)]; };
const chance = (n) => t.sql(`update public.town_catalog set data = jsonb_set(data, '{bugs,ladybird,rids}', $1::jsonb) where key = 'insects'`, [String(n)]);
// (whoever sowed is never whoever catches here, so that a deed that named the catcher for the sower would show)
const SOWERS = { a: U.guest, b: U.unver, c: U.nochar };
/** The farm made to stand as some plots: each sown by somebody. */
const plant = async (plots) => {
  await t.sql(`delete from public.town_plots`);
  for (const [key, p] of Object.entries(plots)) {
    const [x, y] = key.split(",").map(Number);
    await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), $3, $4::jsonb, 1)`,
      [x, y, p.soil, p.plant ? JSON.stringify({ ...p.plant, by: SOWERS[p.plant.by] }) : null]);
  }
};
const farm = async () => Object.fromEntries((await t.sql(`select x, y, bed, soil, plant, changed from public.town_plots order by x, y`)).rows.map((r) => [`${r.x},${r.y}`, r]));
/** The plots with a pest on them now, as the database sees them: in the order of their tiles. */
const struck = async () => (await t.sql(`select p.x::text || ',' || p.y::text as key from public.town_plots p
  where p.plant is not null and (town.see(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant), town.now_ms())->>'pest')::boolean order by p.x, p.y`)).rows.map((r) => r.key);
const ladybirds = async (now) => (await t.sql(`select i from generate_series(0, $2::int - 1) i where town.bug_at(i, $1::bigint)->>'bug' = 'ladybird' order by i`, [now, haunts.h.length])).rows.map((r) => r.i);

// a moment of the cases with several pests on the farm and ladybirds out: the more of both the better
const WHEN = (() => {
  const hour = (ms) => new Date(ms + 7 * HOUR).getUTCHours();
  return told.cases.filter((c) => c.want !== null && hour(c.args[1]) >= 6 && hour(c.args[1]) < 17).map((c) => ({ plots: c.args[0], now: c.args[1] }));
})();
let scene = null;
for (const c of WHEN) {
  await clock(c.now);
  await plant(c.plots);
  const pests = await struck(), out = await ladybirds(c.now);
  const turns = out.reduce((n, id) => n + Math.min(3, haunts.k[haunts.h[id][0]].shares), 0);
  if (pests.length >= 3 && turns >= 6 && (!scene || pests.length > scene.pests.length)) scene = { ...c, pests, out };
  if (scene && scene.pests.length >= 5) break;
}
t.section("a ladybird caught, by a member");
t.check("(a moment with pests on several plots and ladybirds out, to try it at)", !!scene, { tried: WHEN.length });
if (scene) {
  const EVERYBODY = [U.m1, U.m2, U.admin];
  for (const who of EVERYBODY) { await grant(who, "bugNet"); await holdItem(who, "bugNet"); }
  /** The catches there are to make: a haunt with a ladybird, and a member who has not caught it. */
  const turns = scene.out.flatMap((id) => EVERYBODY.slice(0, haunts.k[haunts.h[id][0]].shares).map((who) => ({ id, who })));
  const catchOne = async () => { const { id, who } = turns.shift(), [x, y] = tileBy(id); return { id, who, tile: [x, y], did: await rpc(who, "town_net", { p_haunt: id, p_x: x, p_y: y, p_misses: 0 }) }; };
  const set = async () => { await clock(scene.now); await plant(scene.plots); };
  await set();
  t.check("the farm stands with a pest on several plants, and the rule says the same of them", scene.pests.length >= 3 && same(await struck(), scene.pests)
    && scene.pests.includes((await t.sql(`select town.rid_pick((select jsonb_object_agg(x::text || ',' || y::text, jsonb_build_object('soil', soil, 'plant', plant)) from public.town_plots), town.now_ms(), 0.5) as r`)).rows[0].r), scene.pests);

  // never: the chance turned to nothing
  await chance(0);
  {
    const before = await farm(), c = await catchOne();
    t.check("with no chance: the ladybird is caught as ever", c.did.ok === true && c.did.got[0][0] === "ladybird" && c.did.haunt === c.id, c.did);
    t.check("…and no pest goes: nothing is said of one, and the farm is as it was", !("rid" in c.did) && !("ridPlot" in c.did) && same(await farm(), before) && same(await struck(), scene.pests), c.did);
    const d = await t.sql(`select doc from public.town_deeds where member_id = $1 and what = 'net' order by id desc limit 1`, [c.who]);
    t.check("…nor is one in the deed", d.rows.length === 1 && !("rid" in d.rows[0].doc) && !("whose" in d.rows[0].doc) && d.rows[0].doc.haunt === c.id, d.rows);
  }
  // always: the chance turned to certain
  await chance(1);
  const gone = [];
  {
    const before = await farm(), c = await catchOne(), stamina = await staminaOf(c.who);
    const rid = c.did.rid, after = await farm();
    t.check("with the chance certain: caught as ever, for a ladybird's stamina, into the bag", c.did.ok === true && c.did.got[0][0] === "ladybird" && (await heldOf(c.who, "ladybird")) >= 1 && stamina === 100 - haunts.b.ladybird.cost, { did: c.did, stamina });
    t.check("…and one of the plots with a pest is named", typeof rid === "string" && scene.pests.includes(rid), { rid, pests: scene.pests });
    const was = before[rid] ?? {}, is = after[rid] ?? {};
    t.check("its plant is cured at this moment, and nothing else of the plant is touched", !!is.plant && is.plant.cured === scene.now && same({ ...is.plant, cured: 0 }, { ...was.plant, cured: 0 }) && is.plant.watered === was.plant.watered, { was: was.plant, is: is.plant });
    t.check("its soil and its bed are as they were, and the moment it changed is now", is.soil === was.soil && is.bed === was.bed && Number(is.changed) === scene.now && Number(was.changed) === 1, { was, is });
    t.check("no other plot is touched", same(Object.fromEntries(Object.entries(after).filter(([k]) => k !== rid)), Object.fromEntries(Object.entries(before).filter(([k]) => k !== rid))));
    t.check("the plant has no pest on it now, and the others still have theirs", same(await struck(), scene.pests.filter((k) => k !== rid)), await struck());
    t.check("the page is told the plot as it now stands", same(c.did.ridPlot, { soil: is.soil, plant: is.plant }), c.did.ridPlot);
    const d = await t.sql(`select thing, n::int as n, doc from public.town_deeds where member_id = $1 and what = 'net' order by id desc limit 1`, [c.who]);
    t.check("the deed says which plot and whose plant, with all it said before", d.rows[0].thing === "ladybird" && d.rows[0].doc.rid === rid && d.rows[0].doc.whose === was.plant.by && d.rows[0].doc.whose !== c.who && d.rows[0].doc.haunt === c.id
      && d.rows[0].doc.map === haunts.h[c.id][1] && same(d.rows[0].doc.tile, c.tile) && d.rows[0].doc.misses === 0 && d.rows[0].doc.spent === false && typeof d.rows[0].doc.first === "boolean", d.rows);
    gone.push(rid);
    const again = await rpc(c.who, "town_net", { p_haunt: c.id, p_x: c.tile[0], p_y: c.tile[1] });
    t.check("the same ladybird a second time is refused, and takes no second pest", again.ok === false && again.why === "had" && !("rid" in again) && same(await farm(), after), again);
  }
  {
    // the next catches take the next pests, one each, never a plot twice; whoever sowed them
    while (gone.length < scene.pests.length && turns.length > 1) { const c = await catchOne(); if (c.did.ok !== true || typeof c.did.rid !== "string") { gone.push(`(none: ${JSON.stringify(c.did).slice(0, 120)})`); break; } gone.push(c.did.rid); }
    t.check("each ladybird after takes another plant's pest, never one twice", new Set(gone).size === gone.length && gone.every((k) => scene.pests.includes(k)) && gone.length >= Math.min(3, scene.pests.length), gone);
    t.check("and those that are left are the ones not taken", same(await struck(), scene.pests.filter((k) => !gone.includes(k))), await struck());
  }
  {
    // none left: the catch is a catch, and no more
    await t.sql(`update public.town_plots set plant = plant || jsonb_build_object('cured', $1::bigint) where plant is not null`, [scene.now]);
    const before = await farm(), c = await catchOne();
    t.check("with no pest anywhere, the chance certain: caught as ever, and nothing said of a pest", (await struck()).length === 0 && c.did.ok === true && c.did.got[0][0] === "ladybird" && !("rid" in c.did) && !("ridPlot" in c.did) && same(await farm(), before), c.did);
  }
  {
    // a plant already dead of its pest has none to take
    await set();
    await clock(scene.now + 30 * HOUR);
    const dead = (await t.sql(`select count(*)::int as n from public.town_plots p where p.plant is not null
      and (town.see(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant), town.now_ms())->>'dead')::boolean`)).rows[0].n;
    const pests = await struck(), pick = (await t.sql(`select town.rid_pick((select jsonb_object_agg(x::text || ',' || y::text, jsonb_build_object('soil', soil, 'plant', plant)) from public.town_plots), town.now_ms(), 0) as r`)).rows[0].r;
    t.check("a day and more later some have died of their pest, and the rule picks none of the dead", dead >= 1 && (pick === null ? pests.length === 0 : pests.includes(pick)), { dead, pests, pick });
    await clock(scene.now);
  }
  {
    // another insect, the chance certain for a ladybird: nothing of the farm
    await set();
    const other = (await t.sql(`select i, town.bug_at(i, $1::bigint)->>'bug' as bug from generate_series(0, $2::int - 1) i`, [scene.now, haunts.h.length])).rows.find((r) => r.bug && r.bug !== "ladybird" && haunts.b[r.bug].habit !== "lure");
    if (other) {
      const [x, y] = tileBy(other.i), before = await farm();
      const did = await rpc(U.m1, "town_net", { p_haunt: other.i, p_x: x, p_y: y });
      t.check("another insect takes no pest with it", did.ok === true && did.got[0][0] === other.bug && !("rid" in did) && same(await farm(), before), did);
    } else t.check("(no other insect out at that moment to try)", false);
  }
  await chance(0.1);
  {
    const r = await rpc("anon", "town_net", { p_haunt: scene.out[0], p_x: 0, p_y: 0 });
    t.check("nobody signed out catches anything", !!r.error, r);
    for (const who of ["anon", U.m1]) {
      const q = await t.as(who, `select town.rid_pick('{}'::jsonb, 0, 0.5)`);
      t.check(`${who === "anon" ? "somebody signed out" : "a member"} cannot ask the rule which plant`, !!q.error, q);
      const w = await t.as(who, `update public.town_plots set plant = plant || '{"cured": 1}'::jsonb`);
      t.check(`${who === "anon" ? "somebody signed out" : "a member"} cannot cure a plot by writing to it`, !!w.error || w.affected === 0, w);
    }
  }
}

/* ── how long the look over the whole farm takes ─────────────────────────── */

t.section("a farm with every plot sown");
{
  // every plot of the farm sown two days before: the most the rule ever has to look over
  await clock(NOON);
  await t.sql(`delete from public.town_plots`);
  const f = (await t.sql(`select town.cat('farming') as f`)).rows[0].f;
  await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed)
    select b.x + i, b.y + j, town.bed_of(b.x + i, b.y + j), 'tilled',
           jsonb_build_object('by', $1::text, 'crop', 'pumpkin', 'sown', $2::bigint + ((b.x + i) % 7) * 60000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0), 1
      from (select (a.at->>0)::int as x, (a.at->>1)::int as y from jsonb_array_elements(town.cat('farming')->'bedsAt') a(at)) b,
           generate_series(0, (town.cat('farming')->>'side')::int - 1) i, generate_series(0, (town.cat('farming')->>'side')::int - 1) j`, [U.m1, NOON - 50 * HOUR]);
  const n = (await t.sql(`select count(*)::int as n from public.town_plots`)).rows[0].n;
  const began = Date.now();
  const pick = (await t.sql(`select town.rid_pick((select jsonb_object_agg(x::text || ',' || y::text, jsonb_build_object('soil', soil, 'plant', plant)) from public.town_plots), town.now_ms(), 0.5) as r`)).rows[0].r;
  const ms = Date.now() - began;
  console.log(`  (${n} plots looked over in ${ms} ms here; pests kill after ${f.pests.kills} h)`);
  t.check("every plot of the farm sown: the rule answers, in a time a catch can wait", n > 1000 && (pick === null || typeof pick === "string") && ms < 8000, { n, ms, pick });
}

t.done();
