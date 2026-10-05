/*
 * v134 — a box to keep things in: dry run in PGlite.
 *
 * v134 gives each member a storage box at the chest in the plaza: a closed table (`town_boxes`), the catalog row
 * `box`, the rules of lib/town/box.ts written again (`town.by_box`, `box_roomy`, `box_move`, `stow`, `unstow`), and
 * three functions a member calls (`town_box`, `town_box_put`, `town_box_take`). It writes no function of the game's
 * again but `town.deed_th`, which is given two words more from its own text; and one line adds what is put away to
 * what the notice board's village has met (v128's `seen`). Every migration of the town's that has run is replayed
 * as it ran, then:
 *
 *   · the file is run twice; its closing block;
 *   · nothing else changed: every function there was is its own text (the tally's words but for two), every other
 *     catalog row as it was, and every row what the site's code gives now (the insects' haunts and the places to
 *     fish from among them: the chest closes a tile of the plaza, and they are laid out from where one may walk);
 *   · every rule case made from the code is put to the SQL (lib/town/db-vectors-box.test.ts);
 *   · its stories: a member's bag and a run of deeds at the box through the functions a member calls, each answer,
 *     the bag and the box after it as the code has them; what is kept, the deeds written down, nothing made or lost;
 *   · each thing said plainly: a box is its owner's alone, reading makes no row, a refusal changes nothing, what is
 *     put away is met by the board, a bigger box, the free slots raised for everybody;
 *   · who may read and call what; the game shut; a member who goes; the file a third time.
 *
 *   node v134.test.mjs            (STORIES=<n> takes the first n stories, RULES=<n> every n-th rule case)
 *   node mutate.mjs <the file, with plain line ends> v134.test.mjs v134.mutations.mjs   (check-anchors.mjs first)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v134_"));
const HERE = new URL("./v134_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(134);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const BOX = need("vectors-v134.json", "lib/town/db-vectors-box.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const STORIES = process.env.STORIES ? BOX.stories.slice(0, Number(process.env.STORIES)) : BOX.stories;
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
// (in the order they ran: v126 after v127 to v129, v131 after it, v135 before v130, then v132 and v133. v130 writes the
// catalog's `items` over whole, as v131 does, so it must come after it here too)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 126, 131, 135, 130, 132, 133];
// 09:00 in Bangkok on a Tuesday
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
/** A member's purse: so many coins, these slots as its bag (ten of them), and whatever else. */
const purse = (who, coins, bag, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $4::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const boxRow = async (who) => (await t.sql(`select things, more from public.town_boxes where member_id = $1`, [who])).rows[0] ?? null;
const deeds = async (who) => (await t.sql(`select what, thing, n::int as n, coins::int as coins, doc from public.town_deeds where member_id = $1 and what like 'box\\_%' order by id`, [who])).rows;
const count = (slots, item) => slots.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
/** How many of each thing some slots hold, all told. */
const tally = (...lists) => { const all = {}; for (const s of lists.flat()) if (s) all[s.item] = (all[s.item] ?? 0) + s.n; return all; };
const EMPTY = Array(10).fill(null);
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

// a member with things in their bag, and what the village has met as the board last saw it
await purse(U.m1, 12, [{ item: "minnow", n: 9 }, { item: "rod", n: 1 }]);
await t.sql(`update public.town_things set doc = jsonb_build_object('at', ${MORNING - 60000}, 'ids', jsonb_build_object('minnow', true, 'rod', true)), updated_at = now() - interval '1 hour' where key = 'seen'`);
const textsWas = await texts(), deedsWas = (await one(`select count(*)::int as n from public.town_deeds`)).n;
const tablesWas = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((r) => r.relname);

await t.runTwice(FILE, "v134");
const textsNow = await texts();
let v, r;
const BY = [35, 35], FAR = [38, 34];

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select town.cat('box') as box`);
t.check("the catalog has the box: ten slots, two steps, its tile", same(v.box, { at: [34, 34], reach: 2, slots: 10 }), v);
v = await one(`select town.by_box(35, 35) as beside, town.by_box(34, 34) as on_it, town.by_box(37, 34) as too_far`);
t.check("who stands by the chest: beside it, not on it, not three steps off", same(v, { beside: true, on_it: false, too_far: false }), v);
v = await one(`select c.relrowsecurity as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'town_boxes' and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.oid = 'public.town_boxes'::regclass`);
t.check("the boxes are a closed book: row security on, nothing granted to a browser", same(v, { closed: true, grants: 0 }), v);
v = await one(`select has_function_privilege('authenticated', 'public.town_box()', 'execute') as box, has_function_privilege('anon', 'public.town_box()', 'execute') as box_anon,
       has_function_privilege('authenticated', 'public.town_box_put(integer, integer, integer, integer)', 'execute') as put,
       has_function_privilege('anon', 'public.town_box_put(integer, integer, integer, integer)', 'execute') as put_anon,
       has_function_privilege('authenticated', 'public.town_box_take(integer, integer, integer, integer)', 'execute') as take,
       has_function_privilege('anon', 'public.town_box_take(integer, integer, integer, integer)', 'execute') as take_anon,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the three functions are a member's to call, and nobody's signed out", v.box === true && v.put === true && v.take === true, v);
t.check("…none of them somebody signed out's", v.box_anon === false && v.put_anon === false && v.take_anon === false, v);
t.check("the rules are nobody's in a browser", v.open === 0 && (await one(`select has_schema_privilege('authenticated', 'town', 'usage') as u`)).u === false, v);
v = await one(`select town.deed_th('box_put') as put, town.deed_th('box_take') as take, town.deed_th('thank') as thank, town.deed_th('pour') as pour, town.deed_th('nothing_known') as other`);
t.check("the tally has its two words more, and the ones it had", same(v, { put: "เก็บของเข้ากล่อง", take: "หยิบของออกจากกล่อง", thank: "ขอบคุณคนที่ช่วยดูแลผัก", pour: "เทน้ำลงบ่อ", other: "nothing_known" }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.by_box(integer,integer)", "town.box_roomy(jsonb)", "town.box_move(jsonb,integer,numeric,jsonb,text)", "town.stow(jsonb,jsonb,integer,numeric,integer,integer)",
    "town.unstow(jsonb,jsonb,integer,numeric,integer,integer)", "town.box_of(uuid)", "town.keep_box(uuid,jsonb)", "town_box()", "town_box_put(integer,integer,integer,integer)", "town_box_take(integer,integer,integer,integer)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("ten functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== "town.deed_th(text)" && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter", others.length === 0 && Object.keys(textsWas).length > 200, others);
  const d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are as they stood with two more: one line written otherwise", d.gone.length === 1 && d.more.length === 1
    && d.more[0] === d.gone[0].replace("else p_what end", "when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' else p_what end"), d);
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds one row and writes none over", same(written, ["box"]) && after.length === before.length + 1 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  // (every row the database has: the code may have rows of later files, which are not this one's to seed)
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now: nothing laid out from where one may walk moved for the chest", odd.length === 0 && after.length === before.length + 1, odd);
  t.check("…the insects' haunts and the places to fish from among them", same(was.insects.data.haunts, CODE.insects.haunts) && same(was.fishing.data.places, CODE.fishing.places) && same(was.forest.data.spots, CODE.forest.spots));
  const tables = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
  t.check("one table is new", same(tables.filter((x) => !tablesWas.includes(x)), ["town_boxes"]) && tables.length === tablesWas.length + 1, tables.filter((x) => !tablesWas.includes(x)));
  v = { purse: await kept(U.m1), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n, boxes: (await one(`select count(*)::int as n from public.town_boxes`)).n };
  t.check("what a member had is as it was, no deed is written, and nobody has a box yet", count(v.purse.bag, "minnow") === 9 && count(v.purse.bag, "rod") === 1 && v.purse.coins === 12 && v.deeds === deedsWas && v.boxes === 0, v);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

{
  const CAST = {
    by_box: "select town.by_box($1::int, $2::int) as r",
    box_roomy: "select town.box_roomy($1::jsonb) as r",
    stow: "select town.stow($1::jsonb, $2::jsonb, $3::int, $4::numeric, $5::int, $6::int) as r",
    unstow: "select town.unstow($1::jsonb, $2::jsonb, $3::int, $4::numeric, $5::int, $6::int) as r",
  };
  const cases = BOX.rules.filter((_, i) => i % THIN === 0);
  t.section(`the box's rules: ${cases.length} cases made from the site's code`);
  const bad = {}, n = {};
  for (const c of cases) {
    const got = await t.as("super", CAST[c.fn], c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
    n[c.fn] = (n[c.fn] ?? 0) + 1;
    if (got.error || !same(got.rows[0].r, c.want)) (bad[c.fn] ??= []).push({ args: c.args.slice(2), want: c.fn === "by_box" || !c.want.ok ? c.want : { ok: true, item: c.want.item, n: c.want.n }, got: got.error ?? (got.rows[0].r?.ok ? { ok: true, item: got.rows[0].r.item, n: got.rows[0].r.n } : got.rows[0].r) });
  }
  for (const fn of Object.keys(CAST)) t.check(`town.${fn} answers every case as the code does (${n[fn] ?? 0})`, (n[fn] ?? 0) > 0 && !bad[fn], bad[fn]?.slice(0, 3));
}

/* ── the stories ─────────────────────────────────────────────────────────── */

{
  t.section(`${STORIES.length} stories of things put away and taken out, through the functions a member calls`);
  let badAnswer = null, badBag = null, badBox = null, badKept = null, badDeeds = null, badSum = null, steps = 0;
  for (const [k, s] of STORIES.entries()) {
    await t.sql(`delete from public.town_boxes where member_id = $1; `, [U.m1]);
    await t.sql(`delete from public.town_deeds where member_id = $1`, [U.m1]);
    await purse(U.m1, 7, s.bag);
    let had = tally(s.bag), done = [], last = { bag: s.bag, things: EMPTY };
    for (const [i, step] of s.steps.entries()) {
      if (step.deed === "fill") {
        // (as if they had been out: the bag is filled afresh, and what was in it is no longer theirs to count)
        const inBox = (await boxRow(U.m1))?.things ?? [];
        await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('bag', $2::jsonb) where member_id = $1`, [U.m1, JSON.stringify(step.bag)]);
        had = tally(step.bag, inBox);
        last = { ...last, bag: step.bag };
        continue;
      }
      steps++;
      const got = await call(U.m1, step.deed === "put" ? "town_box_put" : "town_box_take", step.slot, step.n, step.at[0], step.at[1]);
      const told = got.ok ? { ok: true, item: got.item, n: got.n } : { ok: false, why: got.why };
      if (!badAnswer && !same(told, step.want)) badAnswer = { story: k, step: i, deed: step.deed, want: step.want, got: got.error ?? told };
      if (!badBag && !same(got.purse?.bag, step.bag)) badBag = { story: k, step: i, deed: step.deed, want: step.bag, got: got.purse?.bag ?? got };
      if (!badBox && !same(got.box?.things, step.things)) badBox = { story: k, step: i, deed: step.deed, want: step.things, got: got.box?.things ?? got };
      if (step.want.ok) done.push({ what: step.deed === "put" ? "box_put" : "box_take", thing: step.want.item, n: step.want.n, coins: 0, doc: { tile: step.at } });
      last = { bag: step.bag, things: step.things };
    }
    // at its end: what is kept is what was last told, every deed that came off is written down once, and nothing was made or lost
    const p = await kept(U.m1), b = await boxRow(U.m1);
    if (!badKept && !(same(p.bag, last.bag) && same(b?.things ?? EMPTY, last.things) && p.coins === 7)) badKept = { story: k, bag: p.bag, things: b?.things };
    if (!badDeeds && !same(await deeds(U.m1), done)) badDeeds = { story: k, want: done.length, got: (await deeds(U.m1)).length };
    if (!badSum && !same(tally(p.bag, b?.things ?? []), had)) badSum = { story: k, had, has: tally(p.bag, b?.things ?? []) };
  }
  t.check(`every answer is the code's (${steps} deeds)`, steps > 1000 / (process.env.STORIES ? 24 / STORIES.length : 1) && !badAnswer, badAnswer);
  t.check("after every deed the bag is as the code has it", !badBag, badBag);
  t.check("…and so is the box", !badBox, badBox);
  t.check("what is kept at a story's end is what was last told, and no coin moved", !badKept, badKept);
  t.check("every deed that came off is written down once, with its thing, how many and the tile; a refusal writes none", !badDeeds, badDeeds);
  t.check("nothing is made and nothing is lost: bag and box together hold what the bag was given", !badSum, badSum);
}

/* ── each thing, said plainly ────────────────────────────────────────────── */

t.section("a box is its owner's alone");
await t.sql(`delete from public.town_boxes; delete from public.town_deeds where what like 'box\\_%'`);
await purse(U.m1, 12, [{ item: "minnow", n: 9 }, { item: "rod", n: 1 }, { item: "can", n: 1, water: 5 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }], { hand: "rod" });
await purse(U.m2, 3, [{ item: "kangkong", n: 4 }]);
r = await call(U.m1, "town_box");
t.check("my box, before anything is in it: ten empty slots, no more; and reading it makes no row", same(r.box, { things: EMPTY, more: 0 }) && typeof r.now === "number" && (await boxRow(U.m1)) === null, r);
r = await call(U.m1, "town_box_put", 0, 5, ...BY);
t.check("five of nine minnows put away: the answer says so, with my purse and my box as they now stand", r.ok === true && r.item === "minnow" && r.n === 5 && count(r.purse.bag, "minnow") === 4 && same(r.box.things[0], { item: "minnow", n: 5 }) && r.purse.coins === 12 && typeof r.now === "number", r);
v = { purse: await kept(U.m1), box: await boxRow(U.m1), deeds: await deeds(U.m1) };
t.check("…kept so, and written down as one deed", count(v.purse.bag, "minnow") === 4 && same(v.box, { things: [{ item: "minnow", n: 5 }, ...EMPTY.slice(1)], more: 0 })
  && same(v.deeds, [{ what: "box_put", thing: "minnow", n: 5, coins: 0, doc: { tile: BY } }]), v);
r = await call(U.m1, "town_box");
t.check("read again, it is the same box", same(r.box.things[0], { item: "minnow", n: 5 }) && r.box.things.length === 10, r.box);
r = await call(U.m2, "town_box");
t.check("somebody else's box is their own: empty, and nothing of mine told", same(r.box, { things: EMPTY, more: 0 }) && !JSON.stringify(r).includes("minnow") && (await boxRow(U.m2)) === null, r);
r = await call(U.m2, "town_box_take", 0, 1, ...BY);
t.check("…and there is nothing of mine for them to take: slot 0 of their box is empty", same({ ok: r.ok, why: r.why }, { ok: false, why: "none" }) && same((await boxRow(U.m1)).things[0], { item: "minnow", n: 5 }) && count((await kept(U.m2)).bag, "minnow") === 0, r);
t.check("a refusal makes no row and writes no deed", (await boxRow(U.m2)) === null && (await deeds(U.m2)).length === 0);
r = await call(U.m2, "town_box_put", 0, 4, ...BY);
t.check("they put their own away, into their own", r.ok === true && same((await boxRow(U.m2)).things[0], { item: "kangkong", n: 4 }) && same((await boxRow(U.m1)).things[0], { item: "minnow", n: 5 }), r);

t.section("what holds something, and the hand");
r = await call(U.m1, "town_box_put", 2, 1, ...BY);
const r2 = await call(U.m1, "town_box_put", 3, 1, ...BY);
t.check("a can with water and a pot with food go in as they are", r.ok === true && r2.ok === true && same(r2.box.things.slice(0, 3), [{ item: "minnow", n: 5 }, { item: "can", n: 1, water: 5 }, { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }]), r2.box);
r = await call(U.m1, "town_box_take", 2, 1, ...BY);
t.check("…and the pot comes out with its food", r.ok === true && same(r.purse.bag.find((s) => s?.item === "potFull"), { item: "potFull", n: 1, of: { dish: "tomYum", left: 3 } }), r.purse?.bag);
v = await one(`select town.hand_of(town.purse_of($1, false)) as hand`, [U.m1]);
r = await call(U.m1, "town_box_put", 1, 1, ...BY);
const v2 = await one(`select town.hand_of(town.purse_of($1, false)) as hand`, [U.m1]);
t.check("the rod in my hand, put away, is in my hand no more", v.hand === "rod" && r.ok === true && v2.hand === null, [v, r.ok, v2]);

t.section("refusals change nothing");
{
  const was = { purse: await kept(U.m1), box: await boxRow(U.m1), deeds: (await deeds(U.m1)).length };
  const tries = [["town_box_put", [0, 4, ...FAR], "far"], ["town_box_take", [0, 1, ...FAR], "far"], ["town_box_put", [0, 4, 34, 34], "far"], ["town_box_put", [9, 1, ...BY], "none"], ["town_box_put", [-1, 1, ...BY], "none"],
    ["town_box_put", [44, 1, ...BY], "none"], ["town_box_put", [0, 0, ...BY], "amount"], ["town_box_put", [0, 5, ...BY], "amount"], ["town_box_put", [0, -2, ...BY], "amount"], ["town_box_put", [0, null, ...BY], "amount"],
    ["town_box_put", [null, 1, ...BY], "none"], ["town_box_put", [0, 1, null, null], "far"], ["town_box_take", [7, 1, ...BY], "none"], ["town_box_take", [0, 6, ...BY], "amount"], ["town_box_take", [0, 0, ...BY], "amount"]];
  const said = [];
  for (const [fn, args, why] of tries) { r = await call(U.m1, fn, ...args); said.push(r.ok === false && r.why === why ? null : { fn, args, why, got: r.error ?? { ok: r.ok, why: r.why } }); }
  t.check("from too far, from the chest's own tile, a slot that is none, a number that is none: each refused by its own word", said.every((x) => x === null), said.filter(Boolean));
  t.check("…and my purse, my box and my deeds are as they were", same({ purse: await kept(U.m1), box: await boxRow(U.m1), deeds: (await deeds(U.m1)).length }, was));
  // a full box, and a full bag
  await purse(U.guest, 0, ["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron", "bucket"].map((item) => ({ item, n: 1 })));
  for (let i = 0; i < 10; i++) await call(U.guest, "town_box_put", i, 1, ...BY);
  await purse(U.guest, 0, [{ item: "worm", n: 5 }, ...["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron"].map((item) => ({ item, n: 1 }))]);
  r = await call(U.guest, "town_box_put", 0, 5, ...BY);
  const full = await call(U.guest, "town_box_take", 3, 1, ...BY);
  t.check("a box with every slot taken is packed, and a bag with every slot taken is full", same({ ok: r.ok, why: r.why }, { ok: false, why: "packed" }) && same({ ok: full.ok, why: full.why }, { ok: false, why: "full" })
    && (await boxRow(U.guest)).things.every(Boolean) && count((await kept(U.guest)).bag, "worm") === 5, [r, full]);
}

t.section("what is put away has been met by the village");
{
  // (its last writing to the microsecond: read as a date it is told to the second, and two writings in one second look like one)
  const seenIs = async () => one(`select doc, updated_at::text as updated_at from public.town_things where key = 'seen'`);
  const was = await seenIs();
  // (a pearl: nothing before this had one)
  await purse(U.m2, 3, [{ item: "pearl", n: 1 }, { item: "minnow", n: 2 }]);
  r = await call(U.m2, "town_box_put", 1, 2, ...BY);
  const still = await seenIs();
  t.check("a thing the village had met is not written again", r.ok === true && same(still.doc, was.doc) && String(still.updated_at) === String(was.updated_at), still);
  r = await call(U.m2, "town_box_put", 0, 1, ...BY);
  const now = await seenIs();
  // (the board's own last look is where it was set before the file: nothing here has put it back, or on)
  t.check("a thing nobody had met, put straight away, is met: the board may be asked for it", r.ok === true && was.doc.ids.pearl === undefined && now.doc.ids.pearl === true && now.doc.ids.minnow === true && now.doc.ids.rod === true && now.doc.at === MORNING - 60000 && was.doc.at === MORNING - 60000
    && Object.keys(now.doc.ids).length === Object.keys(was.doc.ids).length + 1, now.doc);
  r = await call(U.m2, "town_box_take", 2, 1, ...BY);
  t.check("taking it out again meets nothing new", r.ok === true && same((await seenIs()).doc, now.doc), r.ok);
  v = (await one(`select count(*)::int as n from jsonb_object_keys((select doc->'ids' from public.town_things where key = 'seen')) k where not town.cat('items') ? k`)).n;
  t.check("everything it has met is a thing the catalog has", v === 0, v);
}

t.section("a bigger box");
{
  await t.sql(`insert into public.town_boxes (member_id, more) values ($1, 3) on conflict (member_id) do update set more = excluded.more`, [U.m1]);
  r = await call(U.m1, "town_box");
  t.check("a box given three more slots has thirteen, with what was in it where it was", r.box.things.length === 13 && r.box.more === 3 && same(r.box.things[0], { item: "minnow", n: 5 }), r.box);
  await purse(U.m1, 12, ["rod", "hoe", "can", "pot", "pan", "grill", "bowl", "bugNet", "apron", "bucket"].map((item) => ({ item, n: 1 })));
  for (let i = 0; i < 10; i++) r = await call(U.m1, "town_box_put", i, 1, ...BY);
  v = await boxRow(U.m1);
  t.check("its new slots take things (three were in it, ten more go in), and a deed leaves its `more` alone", r.ok === true && v.things.length === 13 && v.more === 3 && v.things.every(Boolean), v);
  await t.sql(`update public.town_boxes set more = 0 where member_id = $1`, [U.m1]);
  r = await call(U.m1, "town_box");
  t.check("a box is never made smaller: what was put in its further slots is still there", r.box.things.length === 13 && r.box.more === 0 && r.box.things.every(Boolean), r.box);
  // the free slots, raised for everybody
  await t.sql(`update public.town_catalog set data = jsonb_set(data, '{slots}', '12'::jsonb) where key = 'box'`);
  r = await call(U.m2, "town_box");
  t.check("the free slots raised to twelve in the catalog: a box read after that has twelve", r.box.things.length === 12 && r.box.more === 0, r.box);
  v = await t.as("service", `update public.town_boxes set more = -1 where member_id = '${U.m1}'`);
  const arr = await t.as("service", `update public.town_boxes set things = '{}'::jsonb where member_id = '${U.m1}'`);
  t.check("no box has fewer than no more slots, and what is in one is a list, whoever writes the line", !!v.error && /check/.test(v.error) && !!arr.error && /check/.test(arr.error), [v, arr]);
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
for (const [fn, args] of [["town_box", []], ["town_box_put", [0, 1, ...BY]], ["town_box_take", [0, 1, ...BY]]]) {
  r = await call("anon", fn, ...args);
  const u = await call(U.unver, fn, ...args), n = await call(U.nochar, fn, ...args);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
}
v = (await one(`select count(*)::int as n from public.town_boxes where member_id in ($1, $2)`, [U.unver, U.nochar])).n;
t.check("…and nothing is made for them", v === 0, v);
{
  const a = await t.as("anon", `select * from public.town_boxes`), m = await t.as(U.m2, `select * from public.town_boxes`);
  const w = await t.as(U.m2, `update public.town_boxes set more = 50`), d = await t.as(U.m2, `delete from public.town_boxes`), i = await t.as(U.m2, `insert into public.town_boxes (member_id, more) values ('${U.m2}', 50) on conflict (member_id) do update set more = 50`);
  t.check("town_boxes: nobody in a browser reads it or writes it", a.code === "42501" && m.code === "42501" && w.code === "42501" && d.code === "42501" && i.code === "42501", [a, m, w, d, i]);
  t.check("…m1's box and m2's are still there, as they were", (await boxRow(U.m1)).things.filter(Boolean).length === 13 && (await boxRow(U.m2)).more === 0);
  r = await t.as(U.m2, `select town.stow('{}'::jsonb, '{}'::jsonb, 0, 1, 35, 35)`);
  const k = await t.as(U.m2, `select town.keep_box('${U.m2}'::uuid, '{"things": [{"item": "koi", "n": 1}]}'::jsonb)`), o = await t.as(U.m2, `select town.box_of('${U.m1}'::uuid)`);
  t.check("the rules are not a member's to call: nothing put away by hand, nothing kept by hand, nobody else's box read", r.code === "42501" && k.code === "42501" && o.code === "42501", [r, k, o]);
}
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m1, "town_box"), p = await call(U.m1, "town_box_take", 0, 1, ...BY), a = await call(U.admin, "town_box");
  t.check("while the game is shut the box is an admin's only", m.code === "42501" && p.code === "42501" && Array.isArray(a.box?.things), [m, p, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── a member who goes ───────────────────────────────────────────────────── */

t.section("a member who goes");
{
  v = (await one(`select count(*)::int as n from public.town_boxes where member_id = $1`, [U.m2])).n;
  // (asked so that a refusal is an answer, not a fall: a box that held its member back would refuse this)
  const gone = await t.as("super", `delete from public.profiles where id = $1`, [U.m2]);
  const after = (await one(`select count(*)::int as n from public.town_boxes where member_id = $1`, [U.m2])).n;
  t.check("their box goes with them, and nobody else's", !gone.error && v === 1 && after === 0 && (await boxRow(U.m1)) !== null && (await boxRow(U.guest)) !== null, [v, after, gone.error]);
}

/* ── a third time ────────────────────────────────────────────────────────── */

t.section("run a third time");
{
  const was = { boxes: (await t.sql(`select member_id, things, more from public.town_boxes order by 1`)).rows, cat: (await one(`select town.cat('box') as c`)).c, seen: (await one(`select doc from public.town_things where key = 'seen'`)).doc,
    deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  await t.run(FILE, "v134 a third time");
  const is = { boxes: (await t.sql(`select member_id, things, more from public.town_boxes order by 1`)).rows, cat: (await one(`select town.cat('box') as c`)).c, seen: (await one(`select doc from public.town_things where key = 'seen'`)).doc,
    deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  t.check("every box is as it was, and so is what the village has met", same(is.boxes, was.boxes) && was.boxes.length === 2 && same(is.seen, was.seen) && is.deeds === was.deeds, is.boxes);
  t.check("…a number an admin turned in the catalog stays turned", is.cat.slots === 12, is.cat);
  t.check("…every function its own text still", same(await texts(), textsNow));
  r = await call(U.guest, "town_box_take", 0, 1, ...BY);
  t.check("…and the box works as before (a full bag is still refused)", same({ ok: r.ok, why: r.why }, { ok: false, why: "full" }), r);
}

await t.done();
