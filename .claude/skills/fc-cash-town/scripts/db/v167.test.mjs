/*
 * v167 (a flame of three seconds, and more lamps: twenty-eight on the farm, forty in the forest) tried against the
 * stand-in database as it is after the last file that ran, the lamp relay's own (v163) among them: stand-in.mjs's
 * snapshot, loaded in a second, in memory: nothing is written anywhere.
 *
 *   TOWN_VECTORS=<here>/now npx vitest run lib/town/db-vectors-lamps.test.ts         (in the tree: writes the cases)
 *   FC_REPO=<the tree whose code is meant> node v167.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *
 * It reads the draft beside this file (`v167_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. What is held:
 *   · the file writes the catalog's `lamps` row over and nothing else: no function, no table, no other row; the row
 *     is the code's, and differs from what v163 seeded only in `life`, `more` and the posts after each map's twelfth;
 *   · a night that was on when it ran keeps what was lit on it;
 *   · the rules are the site's own, case by case, with the new numbers (lib/town/db-vectors-lamps.test.ts makes the
 *     cases from lib/town/lamps.ts as it stands), and so are the stories of four members through the functions a
 *     member calls;
 *   · said plainly once each: three seconds and the second of grace, a post of the new ones lit, no post past a
 *     map's last, a map whole at its last post and not at its twelfth.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const { catalogOf } = await import("@/lib/town/catalog");
const { LAMPS, nightOf } = await import("@/lib/town/lamps");

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const beside = new URL("./v167_draft.sql", import.meta.url);
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v167_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(167));
const CASES = JSON.parse(readFileSync(new URL("./now/vectors-v163.json", import.meta.url), "utf8"));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const NIGHT = Date.parse("2026-10-09T21:00:00+07:00");
const FARM = LAMPS.maps.farm, FOREST = LAMPS.maps.forest, LIFE = LAMPS.life * 1000;

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
// (what the town's rules are, before the test's own clock is put in the place of the database's)
const texts = async () => rows(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and p.proname <> 'now_ms' order by 1`);
const tablesOf = async () => rows(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname in ('town', 'public') and c.relkind = 'r' and c.relname <> 'test_clock' order by 1`);
// the test's clock in the place of the database's
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NIGHT});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);

/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const take = (who, map = "farm", at = LAMPS.maps[map]?.fire ?? FARM.fire) => call(who, "town_flame_take", { p_map: map, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const pass = (who, to) => call(who, "town_flame_pass", { p_to: to });
const light = (who, post, map = "farm", at = LAMPS.maps[map]?.posts[post] ?? FARM.posts[0]) => call(who, "town_lamp_light", { p_map: map, p_post: post, p_x: at?.[0] ?? null, p_y: at?.[1] ?? null });
const read = async (who) => (await call(who, "town_lamps_read"))?.lamps ?? null;
const bagOf = (...things) => [...things, ...Array(10).fill(null)].slice(0, 10);
const purse = (who, bag = bagOf(), left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::int)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), left, JSON.stringify(more)]);
const staminaOf = async (who) => (await one(`select town.stamina_of(town.purse_kept($1, false), town.now_ms()) as n`, [who])).n;
const helpersOf = async (who) => (await one(`select w.kept from public.town_work w where w.member_id = $1 and w.line = 'helpers'`, [who]))?.kept ?? null;
const litOf = async () => (await rows(`select l.night, l.map, l.post, round(extract(epoch from l.lit_at) * 1000)::float8 as at, l.hands from public.town_lamps_lit l order by l.night, l.map, l.post`))
  .map((r) => ({ night: r.night, map: r.map, post: r.post, at: r.at, hands: r.hands }));
const flamesOf = async () => Object.fromEntries((await rows(`select f.member_id as id, f.map, f.hands, f.until_ms::float8 as until from public.town_lamp_flames f`)).map((r) => [r.id, { from: r.map, until: r.until, hands: r.hands }]));
const fullOf = async () => rows(`select n.night, n.map, round(extract(epoch from n.full_at) * 1000)::float8 as at from public.town_lamp_nights n where n.full_at is not null order by n.night, n.map`);
const byKey = (list) => [...list].sort((a, b) => a.night - b.night || (a.map < b.map ? -1 : a.map > b.map ? 1 : 0) || (a.post ?? 0) - (b.post ?? 0));
const byIds = (lamps) => (lamps ? { ...lamps, maps: Object.fromEntries(Object.entries(lamps.maps).map(([map, m]) => [map, { ...m, lit: m.lit.map((l) => ({ ...l, hands: l.hands.map((h) => ({ id: h.id, name: h.id })) })), lighters: m.lighters.map((h) => ({ id: h.id, name: h.id })) }])) } : null);
const anew = () => t.sql(`delete from public.town_lamps_lit where true; delete from public.town_lamp_nights where true; delete from public.town_lamp_flames where true;
  delete from public.town_work_carried where true; delete from public.town_work where line = 'helpers';`);
/** So many of a map's posts lit tonight already (nobody's flame), the first so many by their numbers. */
const litSoFar = async (map, n, at = NIGHT) => {
  const night = nightOf(at);
  await t.sql(`insert into public.town_lamp_nights (night, map) values ($1, $2) on conflict do nothing`, [night, map]);
  for (let post = 0; post < n; post++) await t.sql(`insert into public.town_lamps_lit (night, map, post, lit_at) values ($1, $2, $3, to_timestamp($4 / 1000.0)) on conflict do nothing`, [night, map, post, at]);
};
const RODS = bagOf({ item: "rod", n: 1 });

t.section("before it: a flame of five seconds, twelve posts a map");
const was = (await one(`select data from public.town_catalog where key = 'lamps'`)).data;
const textsWas = await texts(), tablesWas = await tablesOf();
const othersWas = (await one(`select md5(string_agg(c.key || c.data::text, '|' order by c.key)) as h from public.town_catalog c where c.key <> 'lamps'`)).h;
t.check("the row is v163's: five seconds, more of the night at four and at eight, twelve posts a map", was.life === 5 && same(was.more, [4, 8]) && was.maps.farm.posts.length === 12 && was.maps.forest.posts.length === 12, { life: was.life, more: was.more });
// (a night that is on as the file runs: three of the farm's lit, a flame in somebody's hands)
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await litSoFar("farm", 3);
const heldBefore = await take(U.m1);
t.check("before it a flame taken lives five seconds", heldBefore?.ok === true && heldBefore.until === NIGHT + 5000, heldBefore);
const toldBefore = byIds(await read(U.m2));

t.section("v167, twice over");
await t.runTwice(FILE, "v167");
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);
const row = (await one(`select data from public.town_catalog where key = 'lamps'`)).data, CODE = catalogOf().lamps;
t.check("the catalog's lamps row is the code's", same(row, CODE), { life: row.life, more: row.more, farm: row.maps.farm.posts.length, forest: row.maps.forest.posts.length });
t.check("…three seconds, more of the night at four and at ten, twenty-eight posts on the farm and forty in the forest", row.life === 3 && same(row.more, [4, 10]) && row.maps.farm.posts.length === 28 && row.maps.forest.posts.length === 40, { life: row.life, more: row.more });
t.check("…each map's first twelve posts are the tiles they were, under the numbers they had; its fire too",
  same(row.maps.farm.posts.slice(0, 12), was.maps.farm.posts) && same(row.maps.forest.posts.slice(0, 12), was.maps.forest.posts) && same(row.maps.farm.fire, was.maps.farm.fire) && same(row.maps.forest.fire, was.maps.forest.fire));
t.check("…and nothing else of the row differs from what was there",
  same({ ...row, life: was.life, more: was.more, maps: { farm: { ...row.maps.farm, posts: row.maps.farm.posts.slice(0, 12) }, forest: { ...row.maps.forest, posts: row.maps.forest.posts.slice(0, 12) } } }, was));
t.check("every other row of the catalog is as it was", (await one(`select md5(string_agg(c.key || c.data::text, '|' order by c.key)) as h from public.town_catalog c where c.key <> 'lamps'`)).h === othersWas);
t.check("no function is written, dropped or added, and no table", same(await texts(), textsWas) && same(await tablesOf(), tablesWas), (await texts()).length);
const toldAfter = byIds(await read(U.m2));
t.check("the night that was on keeps what was lit on it, and the flame somebody bore", same(toldAfter, toldBefore) && same((await litOf()).map((l) => l.post), [0, 1, 2]) && (await flamesOf())[U.m1]?.until === NIGHT + 5000, { lit: (await litOf()).map((l) => l.post) });

t.section("the rules, case by case, as the code answers them");
const ASK = {
  night: "town.lamp_night($1::bigint)", by: "town.lamp_by($1::text, $2::int, $3::int, $4::int)",
  take: "town.flame_take($1::jsonb, $2::jsonb, $3::boolean, $4::int, $5::text, $6::int, $7::int, $8::text, $9::bigint)",
  pass: "town.flame_pass($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::boolean, $6::bigint)",
  light: "town.lamp_light($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::int, $6::int, $7::int, $8::bigint)", counts: "town.work_counts_of($1::jsonb, $2::text)",
};
const SAID = { night: "which night a moment is in", by: "who stands by a fire and by a post", take: "a flame taken", pass: "a flame handed on", light: "a post lit", counts: "what a deed of the lamps' counts for on the lines" };
for (const fn of Object.keys(ASK)) {
  const cases = CASES.rules.filter((v) => v.fn === fn);
  let wrong = 0, first = null;
  for (const v of cases) {
    const jsonb = ASK[fn].split(",").map((part) => /jsonb/.test(part));
    const r = await t.as("super", `select ${ASK[fn]} as r`, v.args.map((a, i) => (jsonb[i] ? JSON.stringify(a ?? null) : a)));
    const got = r.error ? { error: r.error } : r.rows[0].r;
    if (!same(got, v.want)) { wrong++; first ??= { args: v.args, want: v.want, got }; }
  }
  t.check(`${SAID[fn]}: ${cases.length} cases, each as the code answers it`, cases.length > 0 && wrong === 0, first ? JSON.stringify(first).slice(0, 900) : "");
}

t.section("stories: four members and the lamps, through the functions a member calls");
let played = 0, storyWrong = null, endWrong = null, lineWrong = null, fulls = 0;
for (const [i, s] of CASES.stories.entries()) {
  await clock(s.steps[0].now - 1000);
  await anew();
  for (const who of Object.keys(s.stamina)) await purse(who, RODS, s.stamina[who]);
  for (const [k, x] of s.steps.entries()) {
    await clock(x.now);
    const d = x.deed;
    const r = d.fn === "take" ? await take(x.by, d.map, d.at) : d.fn === "pass" ? await pass(x.by, d.to) : d.fn === "light" ? await light(x.by, d.post, d.map, d.at)
      : d.fn === "hold" ? await call(x.by, "town_hold", { p_slot: d.slot }) : d.fn === "put_away" ? await call(x.by, "town_hold", { p_slot: null }) : await call(x.by, "town_lamps_read");
    played++;
    if (storyWrong) continue;
    const got = d.fn === "read" ? {} : Object.fromEntries(["ok", "why", "until", "n", "of", "full"].filter((key) => r?.[key] !== undefined).map((key) => [key, r[key]]));
    const told = byIds(r?.lamps ?? (await read(x.by)));
    const left = d.fn === "read" ? await staminaOf(x.by) : r?.purse ? Number((await one(`select town.stamina_of($1::jsonb, town.now_ms()) as n`, [JSON.stringify(r.purse)])).n) : null;
    if (!same(got, x.want) || !same(told, x.told) || left !== x.stamina) storyWrong = { story: i, step: k, deed: d, by: x.by, now: x.now, got, want: x.want, left, stamina: x.stamina, told: same(told, x.told) ? "same" : told, wantTold: same(told, x.told) ? "same" : x.told };
  }
  const end = { lit: await litOf(), flames: await flamesOf(), full: await fullOf() };
  if (!endWrong && !same(end, { lit: byKey(s.end.lit), flames: s.end.flames, full: byKey(s.end.full) })) endWrong = { story: i, got: end, want: s.end };
  fulls += s.end.full.length;
  const lines = {};
  for (const who of Object.keys(s.stamina)) { const l = await helpersOf(who); if (l) lines[who] = { points: l.points, today: l.today, day: l.day }; }
  if (!lineWrong && !same(lines, s.end.helpers)) lineWrong = { story: i, got: lines, want: s.end.helpers };
}
t.check(`${CASES.stories.length} stories, ${played} deeds: every answer, the doer's stamina and what they are told of the lamps are the code's`, played > 400 && !storyWrong, storyWrong ? JSON.stringify(storyWrong).slice(0, 1600) : "");
t.check("…and at each end what is kept: every post lit with the hands its flame came by, who bears a flame, and the nights every lamp of a map was lit", !endWrong, endWrong ? JSON.stringify(endWrong).slice(0, 1400) : `${fulls} whole nights`);
t.check("…and where each stands on the helpers' line", !lineWrong, lineWrong ? JSON.stringify(lineWrong).slice(0, 900) : "");

t.section("three seconds, and the second of grace");
await clock(NIGHT);
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
const up = await take(U.m1);
t.check("a flame taken lives three seconds, for nothing", up?.ok === true && up.until === NIGHT + LIFE && LIFE === 3000 && (await staminaOf(U.m1)) === 100, up);
await clock(NIGHT + 2900);
const on = await pass(U.m1, U.m2);
t.check("handed on a moment before its end it is fresh again: three seconds from then", on?.ok === true && on.until === NIGHT + 2900 + LIFE, on);
await clock(NIGHT + 2900 + LIFE + 900);
const graced = await pass(U.m2, U.guest);
t.check("…and within the second after its time a handing on still counts", graced?.ok === true && graced.until === NIGHT + 2900 + LIFE + 900 + LIFE, graced);
await clock(NIGHT + 2900 + 2 * LIFE + 900 + 1001);
const late = await pass(U.guest, U.admin), lateLight = await light(U.guest, 0);
t.check("a second and a moment after its time it has gone out: not handed on, and no post lit with it", late?.ok === false && late.why === "out" && lateLight?.ok === false && lateLight.why === "out", { late, lateLight });

t.section("the posts after a map's twelfth, and a map's last");
await clock(NIGHT + 60_000);
await anew();
for (const who of [U.m1, U.m2, U.guest, U.admin]) await purse(who, RODS, 100);
await take(U.m1);
const rim = await light(U.m1, 12);
t.check("a post of the farm's rim is lit from a tile by it: one of twenty-eight, one stamina", rim?.ok === true && rim.n === 1 && rim.of === 28 && rim.full === false && (await staminaOf(U.m1)) === 99, rim);
await take(U.m1);
const none = await light(U.m1, 28, "farm", FARM.posts[27]);
t.check("the farm has no twenty-ninth post", none?.ok === false && none.why === "far", none);
await take(U.m2, "forest");
const deep = await light(U.m2, 39, "forest");
await take(U.m2, "forest");
const noneThere = await light(U.m2, 40, "forest", FOREST.posts[39]);
t.check("the forest's fortieth is lit, one of forty, and it has no forty-first", deep?.ok === true && deep.of === 40 && noneThere?.ok === false && noneThere.why === "far", { deep, noneThere });
// (the twelfth is no longer a map's last; the twenty-eighth is)
await anew();
await litSoFar("farm", 11, NIGHT + 60_000);
await take(U.guest);
const twelfth = await light(U.guest, 11);
t.check("the farm's twelfth post lit is not the night whole", twelfth?.ok === true && twelfth.n === 12 && twelfth.of === 28 && twelfth.full === false && (await fullOf()).length === 0, twelfth);
await litSoFar("farm", 27, NIGHT + 60_000);
await take(U.guest);
const last = await light(U.guest, 27);
const after = await take(U.admin);
t.check("its twenty-eighth is: the night is counted, and the fire gives no more flames there", last?.ok === true && last.n === 28 && last.full === true && (await fullOf()).length === 1 && after?.ok === false && after.why === "whole", { last, after });

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
