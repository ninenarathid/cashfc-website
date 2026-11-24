// v336, the festival calendar and Loy Krathong, dry-run: the file runs twice (CRLF as checked out on Windows, then LF);
// the first edition and its catalog are the code's; a krathong is paid once from the bag (refused short, unknown,
// out of place, unnamed, out of its windows; a retry pays nothing twice; a second one refused); made while the float
// is open it is not entered; three popoto each, never one's own, given and taken back only while the vote is open;
// a float once, the wish kept to its maker; the river shows what floats; names and counts hidden until the results,
// then the places (equal popoto share one) and the judge's pick, settled once; last year's wish comes back; the
// database's cost and checks agree with lib/town/krathong's case for case; anon refused; no bare writes.
//   cd <the tree> && FC_REPO=<the tree> V336_BENCH=<a PGlite dump with town.take (v260+)> node .claude/skills/fc-cash-town/scripts/db/v336.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
await import("./repo-ts-town.mjs");
const K = await import("@/lib/town/krathong");
const F = await import("@/lib/town/festivals");

const REPO = process.env.FC_REPO ?? process.cwd();
const FILE = process.env.MIGRATION_FILE ?? resolve(REPO, "supabase/v336_the_festival_calendar_and_loy_krathong.sql");
let checks = 0, failed = 0;
const eq = (a, b, what) => { try { assert.deepEqual(a, b, what); checks++; } catch { failed++; console.log(`  FAIL ${what}: ${JSON.stringify(a)?.slice(0, 400)} against ${JSON.stringify(b)?.slice(0, 300)}`); } };
const { PGlite } = await import(pathToFileURL(createRequire(join(process.env.FC_DB_BENCH ?? "E:/NinenineProject/fcnext-codex-bench", "package.json")).resolve("@electric-sql/pglite")).href);
if (!process.env.V336_BENCH) throw new Error("V336_BENCH: a PGlite dump with town.take (v260 or later)");
const db = new PGlite({ loadDataDir: new Blob([readFileSync(process.env.V336_BENCH)]) });
const rows = async (q, a = []) => (await db.query(q, a)).rows;
const one = async (q, a = []) => (await rows(q, a))[0];
const asOf = (who, role = "authenticated") => async (q, a = []) => {
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who ?? ""]);
  await db.query("select set_config('request.jwt.claim.role',$1,false)", [role]);
  await db.exec(`set role ${role}`);
  try { return (await db.query(q, a)).rows[0]?.r; } catch (e) { return { ok: false, why: `error ${e.code}` }; } finally { await db.exec("reset role"); }
};
const uuid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const H = 3600;
// the edition's windows, relative to now: [kind, from, until] in seconds
const setWindows = (list) => db.query("update public.town_festivals set windows = $1::jsonb where id = 1",
  [JSON.stringify(list.map(([kind, from, until]) => ({ kind, from: new Date(Date.now() + from * 1000).toISOString(), until: until == null ? null : new Date(Date.now() + until * 1000).toISOString(), th: kind, en: kind })))]);
const bagOf = async (m) => (await one("select town.purse_of($1, false)->'bag' b", [m])).b;
const held = (bag, id) => bag.reduce((n, s) => n + (s && s.item === id ? s.n : 0), 0);
const fill = async (m, stacks) => {
  await db.query("select town.purse_of($1, true)", [m]);
  const bag = [...stacks.map(([item, n]) => ({ item, n })), ...Array(Math.max(0, 24 - stacks.length)).fill(null)];
  await db.query("update public.town_purses set doc = jsonb_set(coalesce(doc, town.fresh()), '{bag}', $2::jsonb) where member_id = $1", [m, JSON.stringify(bag)]);
};
const D = (base, ring, light, centre, trims = []) => ({ base, ring, light, centre, trims });

try {
  const sql = readFileSync(FILE, "utf8").replace(/\r\n/g, "\n");
  await db.exec(sql.replace(/\n/g, "\r\n"));
  await db.exec(sql);
  // (v339, the materials made easy to come by: run after it, as live, twice)
  const easy = resolve(REPO, "supabase/v339_loy_krathong_materials_easy_to_come_by.sql");
  let easySql = null;
  try { easySql = readFileSync(easy, "utf8").replace(/\r\n/g, "\n"); } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (easySql) { await db.exec(easySql.replace(/\n/g, "\r\n")); await db.exec(easySql); }
  // (v341, an entry changed three times: after v339, as live, twice)
  let editSql = null;
  try { editSql = readFileSync(resolve(REPO, "supabase/v341_a_krathong_entry_changed_three_times.sql"), "utf8").replace(/\r\n/g, "\n"); } catch (e) { if (e.code !== "ENOENT") throw e; }
  if (editSql) { await db.exec(editSql.replace(/\n/g, "\r\n")); await db.exec(editSql); }

  // ── afterwards ──
  eq(await one("select id, slug, year, jsonb_array_length(windows) w, (select count(*)::int from jsonb_object_keys(rules->'parts')) parts from public.town_festivals"),
    { id: 1, slug: "loykrathong", year: 2026, w: 6, parts: easySql ? K.PARTS.length : 28 }, "the first edition, six windows, its parts (v339: the code's, more of them)");
  eq((await one("select rules->'parts' p from public.town_festivals where id = 1")).p, K.catalogJson(), "the catalog is lib/town/krathong's");
  if (easySql) {
    // (v339: the windows are lib/town/festivals' — entries to midnight, the vote after them — and the draw's cutoff is set)
    eq((await one("select windows w, rules->>'draw_until' u from public.town_festivals where id = 1")), { w: F.LOY_KRATHONG_2026.windows, u: "2026-11-24T17:00:00Z" }, "v339: the windows are lib/town/festivals', the draw's cutoff");
    eq(await one("select has_function_privilege('anon', 'public.town_festival_draw(integer)', 'execute') a"), { a: false }, "v339: anon may not ask for the draw's list");
  }
  eq((await one("select windows w from public.town_festivals where id = 1")).w, F.LOY_KRATHONG_2026.windows, "the windows are lib/town/festivals'");
  eq(await one(`select has_table_privilege('anon', 'public.town_krathongs', 'select') a, has_table_privilege('authenticated', 'public.town_krathongs', 'select') b,
    has_table_privilege('authenticated', 'public.town_krathong_votes', 'insert') c, has_function_privilege('anon', 'public.town_krathong(integer)', 'execute') d,
    has_function_privilege('authenticated', 'public.town_krathong_make(integer, jsonb, text, uuid)', 'execute') e,
    has_function_privilege('authenticated', 'town.krathong_settle(integer)', 'execute') f`), { a: false, b: false, c: false, d: false, e: true, f: false }, "grants");
  const { bareWrites } = await import("./bare-writes.mjs");
  eq((await bareWrites((q) => rows(q))).filter((f) => /krathong|festival/.test(JSON.stringify(f))), [], "no UPDATE or DELETE without a WHERE");
  eq(await asOf(null, "anon")("select public.town_festivals_list() r"), { ok: false, why: "error 42501" }, "anon cannot read the calendar");

  // ── the twins: the database's checks and cost against the code's, case for case ──
  {
    const ids = (slot) => K.partsOf(slot).map((p) => p.id);
    let seed = 7; const rnd = (n) => (seed = (seed * 1103515245 + 12345) % 2147483648) % n;
    const pick = (slot) => { const id = ids(slot)[rnd(ids(slot).length)]; return [id, rnd(K.PART[id].pay.length + (rnd(9) === 0 ? 2 : 0))]; };
    let same = 0;
    for (let i = 0; i < 400; i++) {
      const d = D(pick(rnd(15) === 0 ? "ring" : "base"), pick("ring"), pick("light"), pick(rnd(15) === 0 ? "trim" : "centre"), Array.from({ length: rnd(5) }, () => pick("trim")));
      const ok = K.check(d) === null;
      const r = await one("select town.krathong_design(rules->'parts', $1::jsonb, 3) d from public.town_festivals where id = 1", [JSON.stringify(d)]);
      if ((r.d !== null) !== ok) { eq([d, r.d], [d, ok], "check twin"); continue; }
      if (ok) {
        const c = await one("select town.krathong_cost(rules->'parts', $1::jsonb) c from public.town_festivals where id = 1", [JSON.stringify(d)]);
        if (JSON.stringify(Object.entries(c.c).sort()) !== JSON.stringify([...K.costOf(d)].sort())) { eq(c.c, Object.fromEntries(K.costOf(d)), "cost twin"); continue; }
      }
      same++;
    }
    eq(same, 400, "400 designs judged and costed alike");
    for (const bad of [null, {}, { ...K.START, trims: "x" }, { ...K.START, base: ["b_wood", "0"] }, { ...K.START, base: ["b_wood", 0.5] }, { ...K.START, base: ["b_wood", -1] }, { ...K.START, base: [1, 0] }])
      eq((await one("select town.krathong_design(rules->'parts', $1::jsonb, 3) d from public.town_festivals where id = 1", [JSON.stringify(bad)])).d, null, `refused: ${JSON.stringify(bad)}`);
  }

  // ── members ──
  const players = [];
  // (members before admins: an admin sees what a member may not, the popoto counts since v339)
  for (const { id } of await rows("select p.id from public.profiles p order by p.is_admin, p.id")) {
    const b = await asOf(id)("select public.town_festivals_list() r");
    if (Array.isArray(b?.festivals)) players.push(id);
  }
  eq(players.length >= 4, true, "four members may play");
  const [m1, m2, m3, m4] = players;
  // (the bench has three members who may play and an admin: m4 is the admin, who sees the popoto counts since v339)
  const m4Admin = (await asOf(m4)("select public.is_admin() r")) === true;
  const call = (who, q, a) => asOf(who)(q, a);
  const make = (who, design, name, req) => call(who, "select public.town_krathong_make(1, $1::jsonb, $2, $3) r", [JSON.stringify(design), name, req]);
  const state = (who) => call(who, "select public.town_krathong(1) r");
  const vote = (who, entry) => call(who, "select public.town_krathong_vote($1) r", [entry]);
  const float = (who, wish) => call(who, "select public.town_krathong_float(1, $1) r", [wish]);
  await db.query("update public.profiles set character_id = 1000 + rn from (select id, row_number() over (order by id) rn from public.profiles) x where x.id = profiles.id and profiles.character_id is null");

  // before anything opens
  await setWindows([["make", H, 2 * H], ["float", 2 * H, 4 * H], ["vote", 2 * H, 3 * H], ["results", 5 * H, null]]);
  const d1 = D(["b_wood", 1], ["r_marigold", 0], ["l_candle", 0], ["c_flower", 0], [["t_flower", 0], ["t_shell", 0]]);
  await fill(m1, [["carvingBlank", 2], ["marigold", 20], ["beeswax", 1], ["snail", 3]]);
  eq((await make(m1, d1, "กระทงแรก", uuid(1)))?.why, "closed", "not yet open: closed");

  // ── the contest's making ──
  await setWindows([["make", -H, H], ["float", H, 3 * H], ["vote", H, 2 * H], ["results", 4 * H, null]]);
  await fill(m1, [["carvingBlank", 2], ["marigold", 7], ["beeswax", 1], ["snail", 3]]);
  let r = await make(m1, d1, "กระทงแรก", uuid(1));
  eq([r?.ok, r?.why, r?.item, r?.need], [false, "short", "marigold", 8], "a marigold short");
  eq(held(await bagOf(m1), "marigold"), 7, "nothing taken when short");
  await fill(m1, [["carvingBlank", 2], ["marigold", 15], ["beeswax", 1], ["snail", 3], ["pearl", 1]]);
  eq((await make(m1, d1, "   ", uuid(1)))?.why, "name", "no name");
  eq((await make(m1, { ...d1, base: ["c_flower", 0] }, "x", uuid(1)))?.why, "design", "a centrepiece as base");
  eq((await make(m1, { ...d1, trims: [["t_flower", 0], ["t_flower", 0], ["t_flower", 0], ["t_flower", 0]] }, "x", uuid(1)))?.why, "design", "four trims");
  r = await make(m1, d1, "  กระทง   แรก  ", uuid(1));
  eq([r?.ok, r?.krathong?.name, r?.krathong?.entered, typeof r?.purse], [true, "กระทง แรก", true, "object"], "made and entered, the purse with it");
  const bag1 = await bagOf(m1);
  eq([held(bag1, "carvingBlank"), held(bag1, "marigold"), held(bag1, "beeswax"), held(bag1, "snail"), held(bag1, "pearl")], [1, 7, 0, 2, 1], "took exactly the design's cost");
  r = await make(m1, d1, "กระทงแรก", uuid(1));
  eq([r?.ok, r?.repeated], [true, true], "the same send again: repeated");
  eq(held(await bagOf(m1), "marigold"), 7, "and nothing taken twice");
  eq((await make(m1, d1, "อีกใบ", uuid(2)))?.why, "made", "one krathong a member");
  eq(await one("select count(*)::int n from public.town_deeds where member_id = $1 and what = 'krathong'", [m1]), { n: 1 }, "one deed");
  const e1 = r.krathong.id;

  const d2 = D(["b_leaf", 0], ["r_leaf", 0], ["l_firefly", 0], ["c_crystal", 1], [["t_crystal", 1]]);
  await fill(m2, [["bananaLeaf", 3], ["firefly", 3], ["gemRuby", 1], ["chipAmber", 2]]);
  r = await make(m2, d2, "ผลึกจันทร์", uuid(3));
  eq([r?.ok, held(await bagOf(m2), "bananaLeaf")], [true, 0], "a second maker");
  const e2 = r.krathong.id;
  const d3 = D(["b_bread", 0], ["r_lotus", 1], ["l_candle", 0], ["c_sweets", 0]);
  await fill(m3, [["flour", 3], ["wildflower", 6], ["beeswax", 1], ["sugar", 4]]);
  r = await make(m3, d3, "ขนมปังลอย", uuid(4));
  const e3 = r.krathong.id;
  eq(r?.ok, true, "a third");

  // the gallery, while names are hidden
  let s = await state(m4);
  const seesCounts = !!easySql && m4Admin;
  const seesMakers = !!easySql;
  eq(s.entries.map((e) => [e.id, e.mine, "maker" in e, "votes" in e]), [[e1, false, seesMakers, seesCounts], [e2, false, seesMakers, seesCounts], [e3, false, seesMakers, seesCounts]],
    "entries without makers until v339 (which shows them at any time), counts to an admin only since v339");
  eq(s.mine, null, "m4 has none");
  eq((await state(m1)).mine?.id, e1, "m1 sees its own");
  eq((await vote(m4, e1))?.why, "closed", "no popoto before the vote opens");

  // ── the float nights and the vote ──
  await setWindows([["make", -2 * H, -H], ["float", -H, 2 * H], ["vote", -H, H], ["results", 3 * H, null]]);
  eq((await make(m2, d2, "x", uuid(5)))?.why, "made", "still one");
  await fill(m4, [["fernTip", 4], ["fernTip", 5], ["beeswax", 1], ["glowMushroom", 2]]);
  r = await make(m4, D(["b_leaf", 1], ["r_leaf", 1], ["l_candle", 0], ["c_mushroom", 0]), "ลอยเฉยๆ", uuid(6));
  eq([r?.ok, r?.krathong?.entered], [true, false], "made on a float night: not entered");
  const e4 = r.krathong.id;
  eq((await state(m1)).entries.map((e) => e.id), [e1, e2, e3], "and not in the gallery");
  eq((await vote(m4, e4))?.why, "none", "no popoto on a krathong not entered");
  eq((await vote(m1, e1))?.why, "own", "never one's own");
  r = await vote(m1, e2); eq(r?.voted, [e2], "a popoto");
  r = await vote(m1, e3); eq(r?.voted, [e2, e3], "a second");
  r = await vote(m1, e2); eq(r?.voted, [e3], "taken back");
  await vote(m1, e2);
  await vote(m4, e1); await vote(m4, e2); await vote(m4, e3);
  r = await vote(m2, e1); r = await vote(m2, e3);
  r = await vote(m3, e1); r = await vote(m3, e2);
  // m1: e2 e3 · m2: e1 e3 · m3: e1 e2 · m4: e1 e2 e3   -> e1 3, e2 3, e3 3: all first
  r = await vote(m3, e2); // taken back: e2 2
  eq((await one("select count(*)::int n from public.town_krathong_votes")).n, 8, "eight popoto");
  const m5 = players[4];
  if (m5) {
    await vote(m5, e1); await vote(m5, e2); await vote(m5, e3);
    eq((await vote(m5, e4))?.why, "none", "a fourth refused (not entered)");
    await db.query("delete from public.town_krathong_votes where voter = $1", [m5]);
  }
  // a fourth popoto
  {
    const id = (await one("insert into public.town_krathongs (festival, member_id, name, design, paid, entered, made_at, request) values (1, $1, 'x', $2, '{}', true, now(), $3) returning id", [uuid(900), JSON.stringify(d3), uuid(901)])).id;
    eq((await vote(m4, id))?.why, "spent", "three popoto each");
    await db.query("delete from public.town_krathongs where id = $1", [id]);
  }
  eq((await float(m4, "อยากให้ปีหน้า"))?.ok, true, "floated");
  eq((await float(m4, "อีกครั้ง"))?.repeated, true, "a second float: repeated");
  eq((await one("select wish from public.town_krathongs where id = $1", [e4])).wish, "อยากให้ปีหน้า", "the wish kept, not overwritten");
  eq((await float(players[5] ?? uuid(77), "x"))?.ok, false, "no krathong, no float");
  r = await call(m1, "select public.town_krathong_river(1) r");
  eq(r.river.map((x) => [x.id, x.mine, x.wish ?? null]), [[e4, false, easySql ? "อยากให้ปีหน้า" : null]], "the river shows it, and since v339 its wish to everybody");
  eq((await state(m1)).entries.some((e) => "wish" in e), false, "no wish in the gallery");
  eq((await state(m4)).mine?.wish, "อยากให้ปีหน้า", "the maker reads their own");
  eq((await call(m1, "select public.town_krathong_rename(1, 'ชื่อใหม่') r"))?.krathong?.name, "ชื่อใหม่", "renamed");

  // ── the judge ──
  eq((await call(m1, "select public.town_festival_judge(1, $1) r", [e3]))?.why, "denied", "a member is no judge");
  const admin = (await one("select id from public.profiles where is_admin order by id limit 1"))?.id;
  eq(!!admin, true, "an admin in the bench");
  eq((await call(admin, "select public.town_festival_judge(1, $1) r", [e4]))?.why, "none", "the judge picks an entered krathong only");
  eq((await call(admin, "select public.town_festival_judge(1, $1) r", [e3]))?.ok, true, "the judge's pick");
  if (easySql) {
    eq((await call(admin, "select public.town_krathong(1) r")).entries.every((e) => typeof e.votes === "number"), true, "v339: before the results, the admin sees the counts");
    eq((await state(m2)).entries.some((e) => "votes" in e), false, "v339: a member none");
  }

  // ── the results ──
  await setWindows([["make", -3 * H, -2 * H], ["float", -2 * H, H], ["vote", -2 * H, -H], ["results", -60, null]]);
  eq((await vote(m2, e2))?.why, "closed", "the vote is closed");
  s = await state(m4);
  // (v339: the counts are an admin's only; a member is told the places)
  const told = (n) => (easySql && !m4Admin ? null : n);
  eq(s.awards?.map((a) => [a.entry, a.kind, a.place, a.votes]), [[e1, "popular", 1, told(3)], [e3, "popular", 1, told(3)], [e2, "popular", 3, told(2)], [e3, "judge", 1, told(3)]], "places 1, 1, 3 and the judge's pick");
  if (easySql) eq((await state(m2)).awards?.map((a) => [a.entry, a.place, a.votes]), [[e1, 1, null], [e3, 1, null], [e2, 3, null], [e3, 1, null]], "v339: a member is told the places, not the counts");
  if (easySql) {
    const sa = await call(admin, "select public.town_krathong(1) r");
    eq(sa.awards?.map((a) => a.votes), [3, 3, 2, 3], "v339: the admin sees the counts");
    eq(sa.entries.every((e) => typeof e.votes === "number"), true, "v339: and every entry's");
  }
  eq(s.awards?.[0]?.title?.th, "ช่างกระทงแห่งปี 2026", "the first place's title");
  eq(s.awards?.[2]?.title?.th, "ช่างกระทงดีเด่น 2026", "the third's");
  if (easySql) eq((await state(m2)).entries.every((e) => !("votes" in e) && e.maker && "name" in e.maker), true, "v339: makers shown, counts never to a member");
  else eq(s.entries.every((e) => typeof e.votes === "number" && e.maker && "name" in e.maker), true, "makers and counts shown");
  eq(K.awardsOf([{ id: e1, votes: 3, made: 1 }, { id: e2, votes: 2, made: 2 }, { id: e3, votes: 3, made: 3 }], e3).map((a) => [a.entry, a.kind, a.place]).sort(),
    s.awards.map((a) => [a.entry, a.kind, a.place]).sort(), "lib/town/krathong's awardsOf agrees");
  const settled = (await one("select settled_at::text t from public.town_festivals where id = 1")).t;
  await vote(m1, e1); await state(m2);
  eq([(await one("select settled_at::text t from public.town_festivals where id = 1")).t, (await one("select count(*)::int n from public.town_festival_awards")).n], [settled, 4], "settled once");
  eq((await call(admin, "select public.town_festival_judge(1, $1) r", [e1]))?.why, "closed", "no new pick after the results");
  eq((await call(m1, "select public.town_krathong_rename(1, 'x') r"))?.why, "closed", "no renaming after the results");

  // ── next year: last year's wish comes back ──
  await db.query(`insert into public.town_festivals (id, slug, year, name_th, name_en, starts_at, ends_at, windows, rules)
    select 2, slug, 2027, name_th, name_en, now(), now() + interval '30 days', '[]'::jsonb, rules from public.town_festivals where id = 1`);
  r = await call(m4, "select public.town_krathong(2) r");
  eq(r.capsule?.map((c) => [c.year, c.wish]), [[2026, "อยากให้ปีหน้า"]], "the wish capsule");
  eq((await call(m1, "select public.town_krathong(2) r")).capsule, [], "m1 floated no wish");
  r = await call(m1, "select public.town_festivals_list() r");
  eq(r.festivals.map((f) => [f.id, f.year]), [[1, 2026], [2, 2027]], "the calendar lists both, by start");
  await db.query("update public.town_festivals set published = false where id = 2");
  eq((await call(m1, "select public.town_festivals_list() r")).festivals.length, 1, "an unpublished edition is hidden");
  eq((await call(m1, "select public.town_krathong(2) r"))?.why, "none", "and its stall shut");

  // ── v339: Aqua's evening — entries and the float open together; a krathong from the shop alone; the draw's list ──
  if (easySql) {
    await db.query("update public.town_festivals set published = true where id = 2");
    await db.query("update public.town_festivals set windows = $1::jsonb where id = 2", [JSON.stringify([
      ["make", -H, H], ["float", -H, 3 * H], ["vote", H, 2 * H], ["results", 4 * H, null],
    ].map(([kind, from, until]) => ({ kind, from: new Date(Date.now() + from * 1000).toISOString(), until: until == null ? null : new Date(Date.now() + until * 1000).toISOString(), th: kind, en: kind })))]);
    // dough 2 (base), a banana leaf (ring), oil (candle), two eggs (feather fan): all on the town shop's shelf
    const shop = D(["b_bread", 2], ["r_leaf", 0], ["l_candle", 1], ["c_feather", 3]);
    eq(Object.fromEntries(K.costOf(shop)), { dough: 2, bananaLeaf: 1, oil: 1, egg: 2 }, "v339: the shop's krathong costs what the code says");
    await fill(m2, [["dough", 2], ["bananaLeaf", 1], ["oil", 1], ["egg", 2]]);
    r = await call(m2, "select public.town_krathong_make(2, $1::jsonb, 'กระทงร้านค้า', $2) r", [JSON.stringify(shop), uuid(950)]);
    eq([r?.ok, r?.krathong?.entered], [true, true], "v339: made in the evening's overlap, it is entered");
    const left = await bagOf(m2);
    eq([held(left, "dough"), held(left, "bananaLeaf"), held(left, "oil"), held(left, "egg")], [0, 0, 0, 0], "v339: paid from the shop's things");
    r = await call(m2, "select public.town_krathong_float(2, 'ลอยตอนหัวค่ำ', 28.5, 72.5) r");
    eq(r?.ok, true, "v339: and floated at once, where its maker stands by the water");
    eq((await call(m1, "select public.town_festival_draw(2) r"))?.why, "denied", "v339: a member may not see the draw's list");
    r = await call(admin, "select public.town_festival_draw(2) r");
    const row = r?.list?.find((x) => x.name === "กระทงร้านค้า");
    eq([r?.ok, r?.list?.length, !!row, row?.entered, typeof row?.floated, row?.inTime, typeof row?.fc, row?.verified],
      [true, 1, true, true, "number", Date.now() < Date.parse("2026-11-24T17:00:00Z"), "boolean", true], "v339: the admin's list: who floated, in time or not");
    // the river says whose: its name and its maker's
    const river2 = await call(m1, "select public.town_krathong_river(2) r");
    const mine2 = river2?.river?.find((x) => x.name === "กระทงร้านค้า");
    eq([!!mine2, mine2?.mine, typeof mine2?.maker === "string" || mine2?.maker === null], [true, false, true], "v339: a tap on the river: its name and its maker's");
    eq([mine2?.x, mine2?.y], [28.5, 72.5], "v339: it floats about where it was set down");
    // a colour on any part costs nothing more and is kept; a colour past the slots is refused, as lib/town/krathong's check
    const dyedD = { base: ["b_bread", 2, 3], ring: ["r_leaf", 0, 8], light: ["l_candle", 1, 6], centre: ["c_feather", 3, 10], trims: [["t_feather", 2, 1]] };
    eq(K.check(dyedD), null, "v339: lib/town/krathong keeps a dyed design");
    eq(Object.fromEntries(K.costOf(dyedD)), { dough: 2, bananaLeaf: 1, oil: 1, egg: 3 }, "v339: colour costs nothing");
    await fill(m3, [["dough", 2], ["bananaLeaf", 1], ["oil", 1], ["egg", 3]]);
    r = await call(m3, "select public.town_krathong_make(2, $1::jsonb, 'กระทงหลากสี', $2) r", [JSON.stringify(dyedD), uuid(960)]);
    eq([r?.ok, r?.krathong?.design], [true, dyedD], "v339: a dyed krathong made, its colours kept");
    // a spot off the map is not kept: it floats down the festival's river as before
    r = await call(m3, "select public.town_krathong_float(2, 'ไกลเกิน', 9999, 72) r");
    const far3 = (await call(m1, "select public.town_krathong_river(2) r"))?.river?.find((x) => x.name === "กระทงหลากสี");
    eq([r?.ok, far3?.x ?? null, far3?.y ?? null], [true, null, null], "v339: a spot off the map is not kept");
    const badD = { ...dyedD, base: ["b_bread", 2, 16] };
    eq([K.check(badD), (await call(m4, "select public.town_krathong_make(2, $1::jsonb, 'x', $2) r", [JSON.stringify(badD), uuid(961)]))?.why], ["color", "design"], "v339: a colour past the slots refused by both");
    const fourD = { ...dyedD, centre: ["c_feather", 3, 1, 2] };
    eq((await call(m4, "select public.town_krathong_make(2, $1::jsonb, 'x', $2) r", [JSON.stringify(fourD), uuid(962)]))?.why, "design", "v339: a pick of four refused");

    // ── v341: an entry changed three times, paid with only what goes beyond what it has had ──
    if (editSql) {
      const editK = (who, d, name, req) => call(who, "select public.town_krathong_edit(2, $1::jsonb, $2, $3) r", [JSON.stringify(d), name, uuid(req)]);
      eq(await one("select rules->>'edits_max' m from public.town_festivals where id = 2"), { m: "3" }, "v341: three changes, a row");
      eq(await one("select has_function_privilege('anon', 'public.town_krathong_edit(integer, jsonb, text, uuid)', 'execute') a"), { a: false }, "v341: anon may not change one");
      eq((await editK(m1, shop, "ของคนอื่น", 970))?.why, "none", "v341: no krathong, nothing to change");
      const before = await bagOf(m2);
      // 1: colours and the name only: nothing to pay
      const recoloured = { ...shop, base: ["b_bread", 2, 5], ring: ["r_leaf", 0, 9] };
      r = await editK(m2, recoloured, "กระทงสีใหม่", 971);
      eq([r?.ok, r?.krathong?.name, r?.krathong?.design, r?.krathong?.edits, r?.krathong?.paid], [true, "กระทงสีใหม่", recoloured, 1, { dough: 2, bananaLeaf: 1, oil: 1, egg: 2 }], "v341: recoloured and renamed, nothing paid");
      eq(JSON.stringify(await bagOf(m2)), JSON.stringify(before), "v341: the bag as it was");
      // 2: a feather trim paid with an egg: only that egg
      const trimmed = { ...recoloured, trims: [["t_feather", 2]] };
      eq((await editK(m2, trimmed, "กระทงขนนก", 972))?.why, "short", "v341: an egg short, refused");
      await fill(m2, [["egg", 1]]);
      r = await editK(m2, trimmed, "กระทงขนนก", 973);
      eq([r?.ok, r?.krathong?.edits, r?.krathong?.paid?.egg, held(await bagOf(m2), "egg")], [true, 2, 3, 0], "v341: the trim paid with one egg, the rest from what it had");
      // 3: back to the shop's krathong: what it had pays for it
      r = await editK(m2, shop, "กระทงร้านค้า", 974);
      eq([r?.ok, r?.krathong?.edits, r?.krathong?.design, r?.krathong?.paid?.egg], [true, 3, shop, 3], "v341: changed back for nothing, nothing given back");
      eq((await editK(m2, shop, "กระทงร้านค้า", 974))?.repeated, true, "v341: the same send twice is one change");
      eq((await editK(m2, recoloured, "อีกครั้ง", 975))?.why, "edits", "v341: a fourth change refused");
      eq(await one("select edits, name from public.town_krathongs where festival = 2 and member_id = $1", [m2]), { edits: 3, name: "กระทงร้านค้า" }, "v341: kept as the third change left it");
      eq((await call(m1, "select public.town_krathong_river(2) r"))?.river?.find((x) => x.name === "กระทงร้านค้า")?.design, shop, "v341: the river shows it as changed");
      // once entries close, no change
      await db.query("update public.town_festivals set windows = (select jsonb_agg(case when w->>'kind' = 'make' then jsonb_set(w, '{until}', to_jsonb((now() - interval '1 minute')::text)) else w end) from jsonb_array_elements(windows) w) where id = 2");
      eq((await editK(m3, dyedD, "หลังปิดส่ง", 976))?.why, "closed", "v341: entries closed, no change");
    }
  }
} catch (e) {
  failed++;
  console.log("  THREW", e);
}
console.log(`v336: ${checks} checks, ${failed} failed`);
process.exit(failed ? 1 : 0);
