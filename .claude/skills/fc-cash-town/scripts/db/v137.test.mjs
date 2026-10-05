/*
 * v137 — things dropped on the ground: dry run in PGlite.
 *
 * v137 lets a member drop what is in a slot of their bag where they stand, for anybody to pick up while it lies there
 * (ten seconds): a closed table (`town_ground`), the catalog row `ground`, the rules of lib/town/ground.ts written
 * again (`town.on_ground`, `ground_drop`, `ground_pick`), and three functions a member calls (`town_ground`,
 * `town_ground_drop`, `town_ground_take`). It writes no function of the game's again but `town.deed_th`, which is
 * given two words more from its own text. Every migration of the town's before it is replayed, then:
 *
 *   · the file is run twice; its closing block;
 *   · nothing else changed: every function there was its own text (the tally's but for two words; v121's `town_drop`
 *     among them, which still throws a thing away), every other catalog row as it was and what the site's code gives;
 *   · every rule case made from the code is put to the SQL (lib/town/db-vectors-ground.test.ts);
 *   · its stories: two members and a run of deeds through the functions a member calls, the town's clock put on
 *     between them so that things are lost: each answer, both bags and what lies about as the code has them, and
 *     the deeds written down;
 *   · each thing said plainly: lying for everybody, picked up by the first, gone at ten seconds to the millisecond,
 *     a full bag, what holds something, who may, the game shut, a dropper who goes, the file a third time.
 *
 *   node v137.test.mjs            (STORIES=<n> takes the first n stories, RULES=<n> every n-th rule case)
 *   node mutate.mjs <the file, with plain line ends> v137.test.mjs v137.mutations.mjs   (check-anchors.mjs first)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v137_"));
const HERE_FILE = new URL("./v137_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE_FILE) ? readFileSync(HERE_FILE, "utf8") : migration(137);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const GROUND = need("vectors-v137.json", "lib/town/db-vectors-ground.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const STORIES = process.env.STORIES ? GROUND.stories.slice(0, Number(process.env.STORIES)) : GROUND.stories;
const THIN = Number(process.env.RULES) > 1 ? Number(process.env.RULES) : 1;

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
// (in the order they ran, and then v134, the storage box, which goes in before this one: see v134.test.mjs)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 126, 131, 135, 130, 132, 133, 134];
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
let clockIs = MORNING;
const clock = async (ms) => { clockIs = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
/** A member's purse: so many coins, these slots as its bag (ten of them), and whatever else. */
const purse = (who, coins, bag, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const rows = async () => (await t.sql(`select id::int as id, member_id, stack, x, y, until_ms::text as until from public.town_ground order by id`)).rows;
const deeds = async () => (await t.sql(`select member_id, what, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what like 'ground\\_%' order by id`)).rows;
const count = (slots, item) => slots.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const wipe = () => t.sql(`truncate public.town_ground restart identity; delete from public.town_deeds where what like 'ground\\_%'`);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
/** The lines of one text that are not in the other, in order (the longest run they share is left out). */
function differ(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const gone = [], more = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gone.push(A[i++]); else more.push(B[j++]);
  }
  while (i < n) gone.push(A[i++]);
  while (j < m) more.push(B[j++]);
  return { gone, more };
}

/* ── before the file ─────────────────────────────────────────────────────── */

await purse(U.m1, 12, [{ item: "minnow", n: 9 }, { item: "boot", n: 2 }]);
const textsWas = await texts(), deedsWas = (await one(`select count(*)::int as n from public.town_deeds`)).n;
const tablesWas = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((r) => r.relname);

await t.runTwice(FILE, "v137");
const textsNow = await texts();
let v, r;
const HERE = [30, 40], BY = [31, 41], FAR = [32, 40];

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select town.cat('ground')->>'lasts' as seconds, town.cat('ground')->>'reach' as reach, jsonb_array_length(town.cat('ground')->'maps') as maps`);
t.check("the catalog has the ground: ten seconds, a reach of one, three maps", same(v, { seconds: "10", reach: "1", maps: 3 }), v);
v = await one(`select town.on_ground(30, 40) as town, town.on_ground(133, 5) as farm, town.on_ground(190, 180) as forest, town.on_ground(100, 100) as nowhere`);
t.check("a tile of the town, of the farm and of the forest is on a map, and one between them is on none", same(v, { town: true, farm: true, forest: true, nowhere: false }), v);
v = await one(`select c.relrowsecurity as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'town_ground' and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.oid = 'public.town_ground'::regclass`);
t.check("what lies about is a closed book: row security on, nothing granted to a browser", same(v, { closed: true, grants: 0 }), v);
v = await one(`select has_function_privilege('authenticated', 'public.town_ground()', 'execute') as ground, has_function_privilege('anon', 'public.town_ground()', 'execute') as ground_anon,
       has_function_privilege('authenticated', 'public.town_ground_drop(integer, integer, integer)', 'execute') as drop_,
       has_function_privilege('anon', 'public.town_ground_drop(integer, integer, integer)', 'execute') as drop_anon,
       has_function_privilege('authenticated', 'public.town_ground_take(bigint, integer, integer)', 'execute') as take,
       has_function_privilege('anon', 'public.town_ground_take(bigint, integer, integer)', 'execute') as take_anon,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the three functions are a member's to call", v.ground === true && v.drop_ === true && v.take === true, v);
t.check("…none of them somebody signed out's", v.ground_anon === false && v.drop_anon === false && v.take_anon === false, v);
t.check("the rules are nobody's in a browser", v.open === 0 && (await one(`select has_schema_privilege('authenticated', 'town', 'usage') as u`)).u === false, v);
v = await one(`select town.deed_th('ground_drop') as dropped, town.deed_th('ground_take') as picked, town.deed_th('drop') as thrown, town.deed_th('box_put') as box, town.deed_th('nothing_known') as other`);
t.check("the tally has its two words more, and the ones it had", same(v, { dropped: "ทิ้งของลงพื้น", picked: "เก็บของจากพื้น", thrown: "ทิ้งของ", box: "เก็บของเข้ากล่อง", other: "nothing_known" }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.on_ground(integer,integer)", "town.ground_drop(jsonb,integer,text,integer,integer,bigint,bigint)", "town.ground_pick(jsonb,jsonb,integer,integer,bigint)", "town.ground_now(bigint)",
    "town_ground()", "town_ground_drop(integer,integer,integer)", "town_ground_take(bigint,integer,integer)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("seven functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== "town.deed_th(text)" && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: throwing a thing away among them", others.length === 0 && Object.keys(textsWas).length > 200 && "town_drop(integer)" in textsNow, others);
  const d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are as they stood with two more: one line written otherwise", d.gone.length === 1 && d.more.length === 1
    && d.more[0] === d.gone[0].replace("else p_what end", "when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' else p_what end"), d);
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds one row and writes none over", same(written, ["ground"]) && after.length === before.length + 1 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  // (every row the database has: the code may have rows of later files, which are not this one's to seed)
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now", odd.length === 0 && after.length === before.length + 1, odd);
  const tables = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
  t.check("one table is new", same(tables.filter((x) => !tablesWas.includes(x)), ["town_ground"]) && tables.length === tablesWas.length + 1, tables.filter((x) => !tablesWas.includes(x)));
  v = { purse: await kept(U.m1), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n, lying: (await rows()).length };
  t.check("what a member had is as it was, no deed is written, and nothing lies anywhere", count(v.purse.bag, "minnow") === 9 && v.purse.coins === 12 && v.deeds === deedsWas && v.lying === 0, v);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

{
  const CAST = {
    on_ground: "select town.on_ground($1::int, $2::int) as r",
    ground_drop: "select town.ground_drop($1::jsonb, $2::int, $3::text, $4::int, $5::int, $6::bigint, $7::bigint) as r",
    ground_pick: "select town.ground_pick($1::jsonb, $2::jsonb, $3::int, $4::int, $5::bigint) as r",
  };
  const cases = GROUND.rules.filter((_, i) => i % THIN === 0);
  t.section(`the ground's rules: ${cases.length} cases made from the site's code`);
  const bad = {}, n = {};
  for (const c of cases) {
    const got = await t.as("super", CAST[c.fn], c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
    n[c.fn] = (n[c.fn] ?? 0) + 1;
    const brief = (x) => (x && typeof x === "object" ? (x.ok ? { ok: true, item: x.item, n: x.n, dropped: x.dropped } : x) : x);
    if (got.error || !same(got.rows[0].r, c.want)) (bad[c.fn] ??= []).push({ args: c.fn === "on_ground" ? c.args : c.args.slice(1), want: brief(c.want), got: got.error ?? brief(got.rows[0].r) });
  }
  for (const fn of Object.keys(CAST)) t.check(`town.${fn} answers every case as the code does (${n[fn] ?? 0})`, (n[fn] ?? 0) > 0 && !bad[fn], bad[fn]?.slice(0, 3));
}

/* ── the stories ─────────────────────────────────────────────────────────── */

{
  t.section(`${STORIES.length} stories of two who drop things and pick them up, through the functions a member calls`);
  const WHO = [U.m1, U.m2];
  let badAnswer = null, badBag = null, badLying = null, badKept = null, badDeeds = null, steps = 0, lost = 0;
  for (const [k, s] of STORIES.entries()) {
    await wipe();
    await clock(MORNING);
    await purse(U.m1, 7, s.bags[0]);
    await purse(U.m2, 3, s.bags[1]);
    const done = [], by = [];
    let last = s.bags;
    for (const [i, step] of s.steps.entries()) {
      if (step.deed === "fill") {
        await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', $2::jsonb) where member_id = $1`, [WHO[step.who], JSON.stringify(step.bag)]);
        last = step.who ? [last[0], step.bag] : [step.bag, last[1]];
        continue;
      }
      steps++;
      await clock(clockIs + step.wait);
      const me = WHO[step.who];
      const got = step.deed === "drop" ? await call(me, "town_ground_drop", step.slot, step.at[0], step.at[1]) : await call(me, "town_ground_take", step.nth + 1, step.at[0], step.at[1]);
      const told = got.ok ? (step.deed === "drop" ? { ok: true } : { ok: true, item: got.item, n: got.n }) : { ok: false, why: got.why };
      if (!badAnswer && !same(told, step.want)) badAnswer = { story: k, step: i, deed: step.deed, want: step.want, got: got.error ?? told };
      if (!badBag && !same(got.purse?.bag, step.bags[step.who])) badBag = { story: k, step: i, deed: step.deed, want: step.bags[step.who], got: got.purse?.bag ?? got };
      const lying = (got.ground ?? []).map((d) => [d.id, d.stack.item, d.stack.n]);
      if (!badLying && !same(lying, step.lying)) badLying = { story: k, step: i, deed: step.deed, want: step.lying, got: got.ground ? lying : got };
      if (step.want.ok && step.deed === "drop") {
        by.push(me);
        if (!badAnswer && got.id !== by.length) badAnswer = { story: k, step: i, deed: "drop", want: `the thing's number, ${by.length}`, got: got.id };
        const dropped = last[step.who][step.slot];
        done.push({ member_id: me, what: "ground_drop", thing: dropped.item, n: dropped.n, coins: 0, doc: { id: by.length, tile: step.at } });
      }
      if (step.want.ok && step.deed === "take") done.push({ member_id: me, what: "ground_take", thing: step.want.item, n: step.want.n, coins: 0, doc: { id: step.nth + 1, tile: step.at, ...(by[step.nth] !== me ? { whose: by[step.nth] } : {}) } });
      last = step.bags;
    }
    const a = await kept(U.m1), b = await kept(U.m2);
    if (!badKept && !(same(a.bag, last[0]) && same(b.bag, last[1]) && a.coins === 7 && b.coins === 3)) badKept = { story: k, a: a.bag, b: b.bag };
    if (!badDeeds && !same(await deeds(), done)) badDeeds = { story: k, want: done.length, got: (await deeds()).length };
    lost += by.length - done.filter((d) => d.what === "ground_take").length;
  }
  t.check(`every answer is the code's (${steps} deeds)`, steps > 1000 / (process.env.STORIES ? 24 / STORIES.length : 1) && !badAnswer, badAnswer);
  t.check("after every deed the bag of whoever did it is as the code has it", !badBag, badBag);
  t.check("…and what lies about is told as the code has it: each thing by its number, with what it is and how many", !badLying, badLying);
  t.check("what both keep at a story's end is what the code has, and no coin moved", !badKept, badKept);
  t.check("every deed that came off is written down once: the thing, how many, its number, the tile, and whose it was when somebody else picked it up; a refusal writes none", !badDeeds, badDeeds);
  t.check("(things were lost in the stories: dropped, and picked up by nobody)", lost > 20, lost);
}

/* ── each thing, said plainly ────────────────────────────────────────────── */

t.section("lying for everybody, picked up by the first");
await wipe();
await clock(MORNING);
await purse(U.m1, 12, [{ item: "minnow", n: 9 }, { item: "rod", n: 1 }, { item: "can", n: 1, water: 5 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }], { hand: "rod" });
await purse(U.m2, 3, [{ item: "minnow", n: 15 }]);
r = await call(U.m1, "town_ground");
t.check("nothing lies about to begin with, and asking makes no line", same(r.ground, []) && r.now === MORNING && (await rows()).length === 0, r);
r = await call(U.m1, "town_ground_drop", 0, ...HERE);
t.check("nine minnows dropped: out of my bag, lying where I stand for ten seconds, told with its number", r.ok === true && r.id === 1 && count(r.purse.bag, "minnow") === 0 && r.purse.coins === 12
  && same(r.ground, [{ id: 1, by: U.m1, stack: { item: "minnow", n: 9 }, at: HERE, until: MORNING + 10000 }]), r);
v = { rows: await rows(), deeds: await deeds(), purse: await kept(U.m1) };
t.check("…kept so, and written down", same(v.rows, [{ id: 1, member_id: U.m1, stack: { item: "minnow", n: 9 }, x: 30, y: 40, until: String(MORNING + 10000) }])
  && same(v.deeds, [{ member_id: U.m1, what: "ground_drop", thing: "minnow", n: 9, coins: 0, doc: { id: 1, tile: HERE } }]) && count(v.purse.bag, "minnow") === 0, v);
r = await call(U.m2, "town_ground");
t.check("somebody else is told it lies there", same(r.ground, [{ id: 1, by: U.m1, stack: { item: "minnow", n: 9 }, at: HERE, until: MORNING + 10000 }]), r);
r = await call(U.m2, "town_ground_take", 1, ...FAR);
t.check("from two tiles off they do not pick it up, and it lies on", same({ ok: r.ok, why: r.why }, { ok: false, why: "far" }) && r.ground.length === 1 && (await rows()).length === 1 && count((await kept(U.m2)).bag, "minnow") === 15, r);
await clock(MORNING + 4000);
r = await call(U.m2, "town_ground_take", 1, ...BY);
t.check("standing by it they pick it up: all nine, onto their own, and it lies there no longer", r.ok === true && r.item === "minnow" && r.n === 9 && count(r.purse.bag, "minnow") === 24 && same(r.ground, []) && (await rows()).length === 0, r);
v = await deeds();
t.check("…written down with whose it was", same(v[1], { member_id: U.m2, what: "ground_take", thing: "minnow", n: 9, coins: 0, doc: { id: 1, tile: BY, whose: U.m1 } }) && v.length === 2, v);
r = await call(U.m1, "town_ground_take", 1, ...HERE);
t.check("whoever comes second finds it gone, the one who dropped it too", same({ ok: r.ok, why: r.why }, { ok: false, why: "lost" }) && count((await kept(U.m1)).bag, "minnow") === 0 && (await deeds()).length === 2, r);

t.section("gone after ten seconds");
{
  await clock(MORNING + 20000);
  // (the whole of a slot: twenty of their twenty-four minnows, the other four stay in the next)
  r = await call(U.m2, "town_ground_drop", 0, ...HERE);
  const id = r.id;
  await clock(MORNING + 20000 + 9999);
  const still = await call(U.m1, "town_ground");
  await clock(MORNING + 20000 + 10000);
  const gone = await call(U.m1, "town_ground"), late = await call(U.m1, "town_ground_take", id, ...HERE);
  t.check("a millisecond short of ten seconds it lies there; at ten seconds it is told to nobody, and nobody picks it up", r.ok === true && still.ground.length === 1 && same(gone.ground, [])
    && same({ ok: late.ok, why: late.why }, { ok: false, why: "lost" }) && count((await kept(U.m1)).bag, "minnow") === 0 && count((await kept(U.m2)).bag, "minnow") === 4, [still.ground, gone.ground, late]);
  t.check("…its line is still kept, until the next thing is dropped", (await rows()).length === 1);
  r = await call(U.m1, "town_ground_drop", 1, ...HERE);
  v = await rows();
  t.check("the next drop throws away what has lain its time: only the rod lies", r.ok === true && v.length === 1 && v[0].stack.item === "rod" && r.ground.length === 1, v);
  const hand = await one(`select town.hand_of(town.purse_of($1, false)) as hand`, [U.m1]);
  t.check("…and the rod that was in my hand is in my hand no more", hand.hand === null, hand);
  // picked up again by whoever dropped it, a millisecond before its time
  await clock(clockIs + 9999);
  const back = await call(U.m1, "town_ground_take", r.id, ...HERE);
  v = await deeds();
  t.check("picked back up by whoever dropped it, a millisecond before its time: no `whose` is written", back.ok === true && count(back.purse.bag, "rod") === 1 && !("whose" in v[v.length - 1].doc) && v[v.length - 1].what === "ground_take", v[v.length - 1]);
  // the seconds are the catalog's
  await t.sql(`update public.town_catalog set data = jsonb_set(data, '{lasts}', '20'::jsonb) where key = 'ground'`);
  // (the rod, which came back into the first empty slot)
  r = await call(U.m1, "town_ground_drop", 0, ...HERE);
  t.check("the seconds a thing lies are the catalog's: turned to twenty, the next thing lies twenty", r.ok === true && r.ground[0].until === clockIs + 20000, r.ground);
  await call(U.m1, "town_ground_take", r.id, ...HERE);
}

t.section("what holds something, a full bag, and what is refused");
{
  await clock(clockIs + 1000);
  const can = await call(U.m1, "town_ground_drop", 2, ...HERE), pot = await call(U.m1, "town_ground_drop", 3, ...HERE);
  t.check("a can with water and a pot with food lie there as they are", can.ok && pot.ok && same(pot.ground.map((d) => d.stack), [{ item: "can", n: 1, water: 5 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }]), pot.ground);
  await purse(U.m2, 3, ["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron", "bucket"].map((item) => ({ item, n: 1 })));
  r = await call(U.m2, "town_ground_take", pot.id, ...HERE);
  t.check("a bag with no room picks nothing up, and the thing lies on", same({ ok: r.ok, why: r.why }, { ok: false, why: "full" }) && r.ground.length === 2 && (await rows()).length === 2, r);
  await purse(U.m2, 3, []);
  r = await call(U.m2, "town_ground_take", pot.id, ...HERE);
  const r2 = await call(U.m2, "town_ground_take", can.id, ...HERE);
  t.check("…with room, the pot comes with its food and the can with its water", r.ok && r2.ok && same(r2.purse.bag.slice(0, 2), [{ item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }, { item: "can", n: 1, water: 5 }]), r2.purse?.bag);
  const was = { a: await kept(U.m1), b: await kept(U.m2), rows: await rows(), deeds: (await deeds()).length };
  const tries = [["town_ground_drop", [9, ...HERE], "none"], ["town_ground_drop", [-1, ...HERE], "none"], ["town_ground_drop", [44, ...HERE], "none"], ["town_ground_drop", [null, ...HERE], "none"],
    ["town_ground_drop", [1, 100, 100], "none"], ["town_ground_drop", [1, -1, 5], "none"], ["town_ground_drop", [1, null, null], "none"],
    ["town_ground_take", [9999, ...HERE], "lost"], ["town_ground_take", [null, ...HERE], "lost"], ["town_ground_take", [-3, ...HERE], "lost"]];
  const said = [];
  for (const [fn, args, why] of tries) { r = await call(U.m1, fn, ...args); said.push(r.ok === false && r.why === why ? null : { fn, args, why, got: r.error ?? { ok: r.ok, why: r.why } }); }
  t.check("an empty slot, a slot that is none, a tile on no map, a thing that is not there: each refused by its own word", said.every((x) => x === null), said.filter(Boolean));
  t.check("…and both bags, the ground and the deeds are as they were", same({ a: await kept(U.m1), b: await kept(U.m2), rows: await rows(), deeds: (await deeds()).length }, was));
  // throwing away is as it was
  await purse(U.guest, 0, [{ item: "boot", n: 2 }]);
  r = await call(U.guest, "town_drop", 0);
  t.check("v121's throwing away still throws away: the thing is nobody's, and nothing lies for it", r.ok === true && count(r.purse.bag, "boot") === 0 && (await rows()).length === was.rows.length, r);
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
await purse(U.m1, 0, [{ item: "kangkong", n: 4 }, { item: "worm", n: 2 }]);
r = await call(U.m1, "town_ground_drop", 0, ...HERE);
const lies = r.id;
for (const [fn, args] of [["town_ground", []], ["town_ground_drop", [0, ...HERE]], ["town_ground_take", [lies, ...HERE]]]) {
  r = await call("anon", fn, ...args);
  const u = await call(U.unver, fn, ...args), n = await call(U.nochar, fn, ...args);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
}
t.check("…and the thing they reached for lies on", (await rows()).some((x) => x.id === lies));
{
  const a = await t.as("anon", `select * from public.town_ground`), m = await t.as(U.m2, `select * from public.town_ground`);
  const w = await t.as(U.m2, `update public.town_ground set until_ms = until_ms + 999999`), d = await t.as(U.m2, `delete from public.town_ground`);
  const i = await t.as(U.m2, `insert into public.town_ground (member_id, stack, x, y, until_ms) values ('${U.m2}', '{"item": "koi", "n": 1}'::jsonb, 30, 40, 99999999999999)`);
  t.check("town_ground: nobody in a browser reads it or writes it: nothing is laid on the ground by hand", a.code === "42501" && m.code === "42501" && w.code === "42501" && d.code === "42501" && i.code === "42501", [a, m, w, d, i]);
  r = await t.as(U.m2, `select town.ground_pick('{"bag": [null]}'::jsonb, '{"id": 1, "stack": {"item": "koi", "n": 1}, "at": [30, 40], "until": 99999999999999}'::jsonb, 30, 40, 0)`);
  const g = await t.as(U.m2, `select town.ground_now(0)`);
  t.check("the rules are not a member's to call", r.code === "42501" && g.code === "42501", [r, g]);
  const bad = await t.as("service", `insert into public.town_ground (member_id, stack, x, y, until_ms) values ('${U.m2}', '{"n": 0, "item": "koi"}'::jsonb, 30, 40, 1)`);
  const worse = await t.as("service", `insert into public.town_ground (member_id, stack, x, y, until_ms) values ('${U.m2}', '[1]'::jsonb, 30, 40, 1)`);
  t.check("a line is a stack of something, whoever writes it", !!bad.error && /check/.test(bad.error) && !!worse.error, [bad, worse]);
}
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m1, "town_ground"), p = await call(U.m1, "town_ground_take", lies, ...HERE), a = await call(U.admin, "town_ground");
  t.check("while the game is shut the ground is an admin's only", m.code === "42501" && p.code === "42501" && Array.isArray(a.ground), [m, p, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── a dropper who goes ──────────────────────────────────────────────────── */

t.section("a dropper who goes");
{
  await purse(U.m2, 0, []);
  // (asked so that a refusal is an answer, not a fall)
  const gone = await t.as("super", `delete from public.profiles where id = $1`, [U.m1]);
  v = await rows();
  t.check("what they dropped lies on, as nobody's", !gone.error && v.some((x) => x.id === lies && x.member_id === null), [gone.error, v]);
  r = await call(U.m2, "town_ground_take", lies, ...HERE);
  t.check("…and whoever stands by it still picks it up", r.ok === true && count(r.purse.bag, "kangkong") === 4 && !(await rows()).some((x) => x.id === lies), r);
}

/* ── a third time ────────────────────────────────────────────────────────── */

t.section("run a third time");
{
  await purse(U.m2, 0, [{ item: "worm", n: 3 }]);
  r = await call(U.m2, "town_ground_drop", 0, ...HERE);
  const was = { rows: await rows(), cat: (await one(`select town.cat('ground') as c`)).c, deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  await t.run(FILE, "v137 a third time");
  const is = { rows: await rows(), cat: (await one(`select town.cat('ground') as c`)).c, deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  t.check("what lies about is as it was", same(is.rows, was.rows) && was.rows.length >= 1 && is.deeds === was.deeds, is.rows);
  t.check("…a number an admin turned in the catalog stays turned", is.cat.lasts === 20, is.cat);
  t.check("…every function its own text still", same(await texts(), textsNow));
  const back = await call(U.m2, "town_ground_take", r.id, ...HERE);
  t.check("…and the ground works as before", back.ok === true && count(back.purse.bag, "worm") === 3, back);
}

await t.done();
