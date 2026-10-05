/*
 * v132 — a bucket line: dry run in PGlite.
 *
 * v132 stands on v130 (a hot afternoon, a bucket over a bed, the yard's jar). `town_pass` hands the water in the
 * bucket one holds on into the empty bucket somebody else holds; `town_line_water` has whose hands the water in a
 * bucket has been through; and the well's reader, its book and the jar's count of work are written again, so that
 * everybody whose hands a bucketful went through is counted it when it is poured. v105 to v129 are replayed as they
 * ran, then v130 (its draft, its file, or history), then:
 *
 *   · a morning of water before the file, and the file run twice;
 *   · its closing block; that nothing else changed: every function its own text, the five written again the lines meant;
 *   · the rule, case by case; v127's and v130's stories of water again, and thirty with buckets drawn, handed on and
 *     poured among the lines, step by step;
 *   · a line of three by the functions a member calls: from the river to the well; what is refused; a great yoke
 *     into a plain bucket; a bucket drawn anew;
 *   · who may read and call what; somebody of the line who goes; the file a third time.
 *
 *   node v132.test.mjs            (STORIES=<n> takes the first n of each kind; RULES=0 leaves the rule cases out)
 *   node mutate.mjs <the file> v132.test.mjs v132.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
/** A migration of the town's: a draft beside this test while there is one and supabase/ has none; then supabase/; then history, once it has run. */
const fileOf = (n) => {
  const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith(`v${n}_`)), here = new URL(`./v${n}_draft.sql`, import.meta.url);
  return !inRepo && existsSync(here) ? readFileSync(here, "utf8") : migration(n);
};
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : fileOf(132);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const WELL = need("vectors-v127.json", "lib/town/db-vectors-well.test.ts"), CARRY = need("vectors-v130.json", "lib/town/db-vectors-carry.test.ts"), LINE = need("vectors-v132.json", "lib/town/db-vectors-line.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const take = (list) => (process.env.STORIES ? list.slice(0, Number(process.env.STORIES)) : list);

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
// (everything of the town's that has run, in the order it ran; then v130, which this one stands on)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 127, 128, 129];
const MIN = 60_000, HOUR = 3_600_000;
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.run(fileOf(130), "v130");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);
const NAME = Object.fromEntries((await t.sql(`select id, coalesce(character_name, display_name, discord_username, '') as name from public.profiles`)).rows.map((r) => [r.id, r.name]));
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const pass = async (who, to) => { const r = await t.as(who, `select public.town_pass($1::uuid) as r`, [to]); return r.error ? r : r.rows[0].r; };
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return r ? { coins: r.coins, ...r.doc } : null; };
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 0`, [x, y, JSON.stringify(doc)]);
const growing = (by, over = {}) => ({ by, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 96 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
/** What the well's book keeps (v127's four), who helped whom, the yard's water and whose pots, and whose hands each bucket's water came by. */
const book = async () => ({
  water: (await t.sql(`select member_id as by, buckets as left from public.town_well_water order by id`)).rows,
  cans: Object.fromEntries((await t.sql(`select member_id, item, carrier, waterings from public.town_well_cans order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, { by: r.carrier, left: r.waterings }])),
  carriers: Object.fromEntries((await t.sql(`select member_id, buckets, taken from public.town_carriers order by 1`)).rows.map((r) => [r.member_id, { buckets: r.buckets, taken: r.taken }])),
  reach: (await t.sql(`select day, carrier, x, y, owner, n from public.town_well_reach order by 1, 2, 3, 4`)).rows.reduce((all, r) => {
    (all[`${r.day}/${r.carrier}`] ??= {})[`${r.x},${r.y}`] = { owner: r.owner, n: r.n };
    return all;
  }, {}),
});
const yardNow = async () => ({
  yard: (await t.sql(`select member_id as by, buckets as left from public.town_yard_water order by id`)).rows,
  pots: (await t.sql(`select day, carrier, cook, n from public.town_yard_reach order by 1, 2, 3`)).rows.reduce((all, r) => { (all[`${r.day}/${r.carrier}`] ??= {})[r.cook] = r.n; return all; }, {}),
});
const helpNow = async () => (await t.sql(`select x, y, helper, owner, water, carry from public.town_plot_help order by 1, 2, 3`)).rows.reduce((all, r) => {
  const plot = (all[`${r.x},${r.y}`] ??= { owner: r.owner, by: {} });
  plot.by[r.helper] = { water: r.water, carry: r.carry };
  return all;
}, {});
const lineNow = async () => Object.fromEntries((await t.sql(`select member_id, item, hands from public.town_line_water order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, r.hands]));
const wellIs = async () => Number((await one(`select doc from public.town_things where key = 'well'`)).doc);
const deedsSince = async (id) => (await t.sql(`select id, member_id, what, thing, n, doc from public.town_deeds where id > $1 order by id`, [id])).rows.map((d) => ({ ...d, n: Number(d.n) }));
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as id from public.town_deeds`)).id);
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

/* ── a morning of water, before the file ─────────────────────────────────── */

const RIVER = [16, 38];
const wellAt = (await one(`select town.cat('farming')->'wellAt' as at`)).at, AT_WELL = [wellAt[0] + 1, wellAt[1]];
const holding = (who, item, water = 0, left = 100) => purse(who, 0, [{ item, n: 1, ...(water ? { water } : {}) }], left, { hand: item });
await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_well_water restart identity`);
await holding(U.m1, "bucket");
await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
await plant(133, 5, growing(U.admin));
{
  const said = [];
  for (let i = 0; i < 2; i++) { said.push(await call(U.m1, "town_chore", ...RIVER)); said.push(await call(U.m1, "town_chore", ...AT_WELL)); }
  said.push(await call(U.m2, "town_chore", ...AT_WELL));
  said.push(await call(U.m2, "town_tend", 133, 5));
  t.check("before the file: two bucketfuls carried, a can filled from them, a plant of somebody else's watered", said.every((r) => r.ok === true) && (await wellIs()) === 1, said.map((r) => r.ok ?? r));
}
const bookWas = await book(), helpWas = await helpNow(), textsWas = await texts(), deedsWas = await lastDeed();

await t.runTwice(FILE, "v132");
const textsNow = await texts();
let v, r;

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select c.relrowsecurity as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'town_line_water' and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.relname = 'town_line_water' and c.relnamespace = 'public'::regnamespace`);
t.check("the table is closed: row security on, nothing granted to a browser", same(v, { closed: true, grants: 0 }), v);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_pass', 'town_well_ranks') order by 1`);
t.check("the two functions are a member's to call, and nobody's signed out", same(v.rows, ["town_pass", "town_well_ranks"].map((proname) => ({ proname, anon: false, member: true }))), v.rows);
v = await one(`select pg_get_triggerdef(oid) as def from pg_trigger where tgname = 'town_deeds_well'`);
t.check("the deeds' trigger reads a bucket drawn, one handed on and a line counted, with the seven it read", ["pour", "fill", "water", "sow", "ditch", "yard", "fresh", "draw", "pass", "line"].every((w) => v.def.includes(`'${w}'`)), v.def);
v = await one(`select town.cat('line') as line`);
t.check("the catalog has the line's numbers", same(v.line, { reach: 40, cost: 1, hands: 8 }), v);
v = await one(`select town.deed_th('pass') as pass, town.deed_th('line') as line, town.deed_th('ditch') as ditch, town.deed_th('pour') as pour`);
t.check("the tally has its two words more, and the ones it had", same(v, { pass: "ส่งถังน้ำต่อให้คนถัดไป", line: "น้ำที่ช่วยกันส่งต่อมาถึงที่", ditch: "เทน้ำรดทั้งแปลง", pour: "เทน้ำลงบ่อ" }), v);
v = await one(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are nobody's in a browser", same(v, { member_has_rules: false, open: 0 }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.pass(jsonb,jsonb,bigint)", "town.line_counted(uuid,text,integer,bigint,text)", "town_pass(uuid)"];
  const AGAIN = ["town.well_seen(uuid,bigint,text,text,numeric,jsonb)", "town.well_book(uuid,bigint)", "town.jar_work(integer,integer)", "town_well_ranks()", "town.deed_th(text)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("three functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => !AGAIN.includes(sig) && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: the farm's, the purse's, v130's own", others.length === 0 && Object.keys(textsWas).length > 185
    && ["town_chore(integer,integer)", "town.chore(jsonb,text,integer,bigint)", "town_ditch(integer,integer)", "town_yard_pour(integer,integer)", "town.keep_purse(uuid,jsonb)", "town.note(uuid,text,text,numeric,numeric,jsonb)", "town_well()"].every((sig) => sig in textsWas), others);
  let d = differ(textsWas["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"], textsNow["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"]);
  t.check("the well's reader is v130's with twenty-two lines added and none taken away", d.gone.length === 0 && d.more.length === 22 && d.more.filter((line) => /perform town\.line_counted\(/.test(line)).length === 2
    && d.more.filter((line) => /^  elsif p_what /.test(line)).length === 3, d);
  d = differ(textsWas["town.well_book(uuid,bigint)"], textsNow["town.well_book(uuid,bigint)"]);
  t.check("the book is v130's but for what counts as carried: two lines written otherwise", d.gone.length === 2 && same(d.more, d.gone.map((line) => line.replace("d.what in ('pour', 'yard')", "d.what in ('pour', 'yard', 'line')"))), d);
  d = differ(textsWas["town.jar_work(integer,integer)"], textsNow["town.jar_work(integer,integer)"]);
  t.check("the jar's count of work is v130's with a line's bucketfuls beside the others: two lines written otherwise", d.gone.length === 2 && same(d.more, d.gone.map((line) => line.replace("d.what in ('pour', 'yard')", "d.what in ('pour', 'yard', 'line')"))), d);
  d = differ(textsWas["town_well_ranks()"], textsNow["town_well_ranks()"]);
  t.check("everybody's rank is v130's with a word that there is a line", d.gone.length === 1 && d.more.length === 2 && d.more[0] === d.gone[0].replace(/\)\);$/, "),") && d.more[1] === "    'line', true);", d);
  d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are as they stood with two more: one line written otherwise", d.gone.length === 1 && d.more.length === 1
    && d.more[0] === d.gone[0].replace("else p_what end", "when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' else p_what end"), d);

  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds one row and writes none over", same(written, ["line"]) && after.length === before.length + 1 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now", odd.length === 0 && after.length === before.length + 1, odd);
  t.check("what the book kept before the file is as it was, who helped whom too, and no line is made up for the buckets drawn before", same(await book(), bookWas) && same(await helpNow(), helpWas) && same(await lineNow(), {}) && (await lastDeed()) === deedsWas, await lineNow());
}

/* ── the rule ────────────────────────────────────────────────────────────── */

if (process.env.RULES !== "0") {
  t.section(`the rule: ${LINE.rules.length} cases, each as the site's own code answers it`);
  let bad = 0, first = null;
  for (const c of LINE.rules) {
    let got, error = null;
    try { got = (await t.db.query(`select town.pass($1::jsonb, $2::jsonb, $3::bigint) as r`, c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
    if (error || !same(got ?? null, c.want)) { bad++; first ??= { args: c.args, want: c.want, got: error ?? got }; }
  }
  t.check(`pass: ${LINE.rules.length} cases`, bad === 0 && LINE.rules.length > 400, bad ? `${bad} differ; the first: ${JSON.stringify(first).slice(0, 1800)}` : "");
}

/* ── the well's book: the stories of before, and with the line among them ── */

const wipe = () => t.sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach, public.town_line_water restart identity`);
/** A line written into the deeds as the game's functions write it: the trigger reads it. */
const write = (d) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5::numeric, $6::jsonb)`, [
  d.by, d.at, d.what,
  // (a bucket poured, drawn or handed on is named only when the story names it: a bucketful from before there were lines names none)
  ["pour", "yard", "ditch", "draw", "pass"].includes(d.what) ? d.can ?? null : d.what === "fill" ? d.can : d.what === "sow" ? "seedKangkong" : d.what === "fresh" ? "pumpkinSoup" : "kangkong",
  ["pour", "yard", "ditch", "pass"].includes(d.what) ? d.n : 1,
  JSON.stringify(d.what === "water" ? { tile: d.tile, with: d.can, ...(d.whose ? { whose: d.whose } : {}) } : d.what === "sow" ? { tile: d.tile, with: "seedKangkong" }
    : d.what === "ditch" ? { tile: [133, 5], bed: 0, plants: d.plants } : d.what === "pour" ? { well: 0 } : d.what === "pass" ? { to: d.to, into: d.into } : d.what === "draw" ? {} : { jar: 0 }),
]);
{
  const stories = take(WELL.stories);
  t.section(`the well's book again: v127's ${stories.length} stories of water, read by the reader as it is now`);
  let badBook = null, badEnd = null, books = 0;
  for (const [n, s] of stories.entries()) {
    await wipe();
    let asked = 0;
    for (let i = 0; i <= s.deeds.length; i++) {
      for (; asked < s.asks.length && s.asks[asked].after === i; asked++) {
        const a = s.asks[asked], got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [a.me, a.now])).r;
        books++;
        if (!same(got, { ...a.want, carriers: a.want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) })) badBook ??= { story: n, after: i, me: a.me, want: a.want, got };
      }
      if (i < s.deeds.length) await write(s.deeds[i]);
    }
    const end = await book(), want = { water: s.end.water, cans: s.end.cans, carriers: s.end.carriers, reach: s.end.reach };
    if (!same(end, want)) badEnd ??= { story: n, differs: Object.keys(want).filter((k) => !same(end[k], want[k])) };
    if (!same(await helpNow(), s.end.help)) badEnd ??= { story: n, differs: ["help"] };
    if (!same(await lineNow(), {})) badEnd ??= { story: n, differs: ["line"] };
  }
  t.check(`the book reads as it did: ${books} readings`, !badBook && books > 100, badBook ? JSON.stringify(badBook).slice(0, 1500) : "");
  t.check("at each story's end the well's water, the cans, the carriers, what was reached and who helped are what they were, and no bucket has a line", !badEnd, badEnd ?? "");
}
for (const [label, set, lined] of [["v130's stories again, with a bucket over a bed and the yard's jar among the lines", CARRY.stories, false], ["stories with buckets drawn, handed on and poured out of the bucket they were handed into", LINE.stories, true]]) {
  const stories = take(set);
  t.section(`${stories.length} ${label}: ${stories.reduce((n, s) => n + s.steps.length, 0)} steps`);
  const bad = {}, done = {};
  for (const [n, s] of stories.entries()) {
    await wipe();
    for (const [i, step] of s.steps.entries()) {
      let kind, got, want = step.want;
      if (step.deed) { await write(step.deed); continue; }
      if (step.book) {
        kind = "book";
        got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [step.book.me, step.book.now])).r;
        want = { ...want, carriers: want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) };
      } else if (step.helpers) {
        kind = "helpers";
        const [x, y] = step.helpers.plot.split(",").map(Number);
        got = (await one(`select town.helpers_of($1::int, $2::int, $3::uuid) as r`, [x, y, step.helpers.me])).r;
      } else {
        kind = "work";
        got = (await one(`select town.jar_work($1::int, $2::int) as r`, [step.work.from, step.work.to])).r;
      }
      done[kind] = (done[kind] ?? 0) + 1;
      if (!same(got, want)) bad[kind] ??= { story: n, step: i, ask: step[kind], want, got };
    }
    const end = { ...(await book()), help: await helpNow(), ...(await yardNow()), line: await lineNow() };
    const differs = Object.keys(s.end).filter((k) => !same(end[k], s.end[k]));
    if (differs.length) bad.end ??= { story: n, differs, want: JSON.stringify(s.end[differs[0]]).slice(0, 600), got: JSON.stringify(end[differs[0]]).slice(0, 600) };
  }
  t.check(`${lined ? "with the line" : "as before"}: the book reads as the code's does: ${done.book ?? 0} times`, !bad.book && (done.book ?? 0) > 100, bad.book ? JSON.stringify(bad.book).slice(0, 1500) : done.book);
  t.check(`${lined ? "with the line" : "as before"}: what each did for the others between two rounds: ${done.work ?? 0} times`, !bad.work && (done.work ?? 0) > 20, bad.work ? JSON.stringify(bad.work).slice(0, 1500) : done.work);
  t.check(`${lined ? "with the line" : "as before"}: at each story's end what is kept is what the code keeps${lined ? ", whose hands each bucket's water came by among it" : ""}`, !bad.end, bad.end ?? "");
  await wipe();
}

/* ── a line of three, through the functions a member calls ───────────────── */

t.section("a line of three: by the functions a member calls");
{
  await wipe();
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'`);
  await clock(MORNING);
  await holding(U.m1, "bucket");
  await holding(U.m2, "bucket");
  await holding(U.admin, "bucketIron");
  r = await pass(U.m1, U.m2);
  t.check("an empty bucket has nothing to hand on", r.ok === false && r.why === "hand", r);
  await call(U.m1, "town_chore", ...RIVER);
  const from = await lastDeed();
  r = await pass(U.m1, U.m2);
  t.check("the one at the river hands the bucketful on: it is told how much went, and has their purse back", r.ok === true && r.n === 1 && r.can === "bucket" && r.into === "bucket" && !("water" in r.purse.bag[0]) && !("from" in r) && !("to" in r), r);
  t.check("…for one stamina, on top of the two it cost to draw", r.purse.stamina.left === 100 - 2 - 1, r.purse.stamina);
  v = await kept(U.m2);
  t.check("the water is in the other's bucket at once, and has cost them nothing", v.bag[0].water === 1 && v.stamina.left === 100, v.bag[0]);
  v = await deedsSince(from);
  t.check("it is written down: who to, and into which bucket", v.length === 1 && v[0].what === "pass" && v[0].member_id === U.m1 && v[0].thing === "bucket" && v[0].n === 1 && v[0].doc.to === U.m2 && v[0].doc.into === "bucket", v);
  t.check("the bucket remembers whose hands its water came by: the one who drew it, then its holder", same(await lineNow(), { [`${U.m2}/bucket`]: [U.m1, U.m2] }), await lineNow());
  r = await pass(U.m2, U.admin);
  t.check("the second hands it on to the third, into an iron bucket: one bucketful, though it carries two", r.ok === true && r.n === 1 && r.into === "bucketIron" && (await kept(U.admin)).bag[0].water === 1, r);
  t.check("…and the third's bucket remembers all three", same((await lineNow())[`${U.admin}/bucketIron`], [U.m1, U.m2, U.admin]), await lineNow());
  const mark = await lastDeed();
  r = await call(U.admin, "town_chore", ...AT_WELL);
  t.check("the third pours it into the well", r.ok === true && r.chore === "pour" && (await wellIs()) === 1, r);
  v = await deedsSince(mark);
  t.check("as it is poured, a line is written for each of the two it came by, at the same moment", v.length === 3 && v[0].what === "pour" && v[0].member_id === U.admin
    && same(v.slice(1).map((d) => [d.what, d.member_id, d.thing, d.n, d.doc.by, d.doc.into]), [["line", U.m1, "bucketIron", 1, U.admin, "pour"], ["line", U.m2, "bucketIron", 1, U.admin, "pour"]]), v);
  v = await book();
  t.check("each of the three has carried a bucketful, towards their rank; the water in the well is the pourer's", same(v.carriers, { [U.m1]: { buckets: 1, taken: [] }, [U.m2]: { buckets: 1, taken: [] }, [U.admin]: { buckets: 1, taken: [] } }) && same(v.water, [{ by: U.admin, left: 1 }]), v);
  v = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [U.m2, MORNING + MIN])).r;
  t.check("the book of the one in the middle: a bucketful carried today, and all three among the day's carriers", v.buckets === 1 && v.today.buckets === 1 && same(v.carriers.map((c) => [c.id, c.buckets]).sort(), [[U.admin, 1], [U.m1, 1], [U.m2, 1]].sort()), v);
  v = (await one(`select town.jar_work(town.round_of($1::bigint), town.round_of($1::bigint) + 1) as r`, [MORNING])).r;
  t.check("at the jar by the well each of the three did a bucketful's work", same(v, [[U.admin, 8], [U.m1, 8], [U.m2, 8]].sort((a, b) => (a[0] < b[0] ? -1 : 1))), v);
  r = await call(U.m1, "town_well_ranks");
  t.check("everybody's rank says that there is a line", r.line === true && "yard" in r && "ranks" in r, r);

  // a bucket drawn anew has nobody's hands on it but the drawer's
  await holding(U.admin, "bucketIron");
  await call(U.admin, "town_chore", ...RIVER);
  t.check("a bucket drawn anew forgets the hands of the water it had", !(`${U.admin}/bucketIron` in await lineNow()), await lineNow());
  const again = await lastDeed();
  await call(U.admin, "town_chore", ...AT_WELL);
  v = await deedsSince(again);
  t.check("…and poured, counts for its drawer alone", v.length === 1 && v[0].what === "pour" && (await book()).carriers[U.admin].buckets === 3 && (await book()).carriers[U.m1].buckets === 1, v);

  // what is refused, with nothing changed
  await holding(U.m1, "bucket", 1);
  await holding(U.m2, "bucket", 1);
  const quiet = await lastDeed();
  const full = await pass(U.m1, U.m2);
  await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
  const can = await pass(U.m1, U.m2);
  await purse(U.m2, 0, [{ item: "bucket", n: 1 }], 100, {});
  const bag = await pass(U.m1, U.m2);
  const self = await pass(U.m1, U.m1), nobody = await pass(U.m1, "00000000-0000-0000-0000-0000000000ff"), nul = await pass(U.m1, null);
  t.check("refused: into a bucket that has water (full); to somebody holding a can, or with their bucket in the bag (none); to oneself, to nobody, to nobody at all (none)",
    full.ok === false && full.why === "full" && [can, bag, self, nobody, nul].every((x) => x.ok === false && x.why === "none"), [full, can, bag, self, nobody, nul]);
  t.check("…and nothing changed: the water still in the giver's bucket, their stamina whole, nothing written", (await kept(U.m1)).bag[0].water === 1 && (await kept(U.m1)).stamina.left === 100 && (await lastDeed()) === quiet);
  await t.sql(`delete from public.town_purses where member_id = $1`, [U.guest]);
  r = await pass(U.m1, U.guest);
  t.check("somebody who has never been in the town is nobody to hand to, and is given no purse by it", r.ok === false && r.why === "none" && (await kept(U.guest)) === null, r);
  // (somebody whose character is not proved, with a purse and an empty bucket in their hand all the same)
  await holding(U.unver, "bucket");
  r = await pass(U.m1, U.unver);
  t.check("…nor is somebody whose character is not proved, whatever they hold", r.ok === false && r.why === "none" && !("water" in (await kept(U.unver)).bag[0]) && (await kept(U.m1)).bag[0].water === 1, r);

  // a great yoke into a plain bucket; with no stamina
  await holding(U.m1, "waterYokeGreat", 4, 0);
  await holding(U.m2, "bucket");
  r = await pass(U.m1, U.m2);
  t.check("a great yoke's four into a plain bucket: one goes, three stay; with no stamina left it is done all the same", r.ok === true && r.n === 1 && r.purse.bag[0].water === 3 && r.purse.stamina.left === 0 && (await kept(U.m2)).bag[0].water === 1, r);
  // over a bed, by the one it was handed to
  await plant(133, 5, growing(U.admin));
  await plant(134, 5, growing(U.admin));
  const bed = await lastDeed();
  r = await call(U.m2, "town_ditch", 133, 5);
  v = await deedsSince(bed);
  t.check("handed water poured over a bed counts for the one who handed it on too: a line for them, beside the bucketful and its waterings", r.ok === true && r.used === 1
    && same(v.map((d) => d.what), ["ditch", "line", "water", "water"]) && v[1].member_id === U.m1 && v[1].n === 1 && v[1].doc.into === "ditch", v.map((d) => [d.what, d.member_id]));
  v = await helpNow();
  t.check("…the plants' owner has the pourer to thank, not the one who handed it on", Object.values(v).every((p) => same(Object.keys(p.by), [U.m2])), v);
}

/* ── a long line ─────────────────────────────────────────────────────────── */

t.section("a line of ten");
{
  await wipe();
  // ten made-up members of the town, each with a bucket: the water goes down the line by the deeds' own lines
  const TEN = Array.from({ length: 10 }, (_, i) => `00000000-0000-0000-0000-0000000001${String(i).padStart(2, "0")}`);
  for (const [i, id] of TEN.entries()) {
    await t.sql(`insert into auth.users (id, email) values ($1, $2) on conflict do nothing`, [id, `line${i}@example.com`]);
    await t.sql(`insert into public.profiles (id, character_id, character_name, character_verified_at) values ($1, $2, $3, now()) on conflict (id) do nothing`, [id, 880000 + i, `Line ${i}`]);
  }
  for (let i = 0; i + 1 < TEN.length; i++) await write({ by: TEN[i], at: MORNING + i * 1000, what: "pass", n: 1, can: "bucket", to: TEN[i + 1], into: "bucket" });
  v = await lineNow();
  t.check("a bucket handed down a line of ten remembers the last eight hands it came by, its holder last", same(v[`${TEN[9]}/bucket`], TEN.slice(2)) && same(v[`${TEN[8]}/bucket`], TEN.slice(1, 9)) && same(v[`${TEN[7]}/bucket`], TEN.slice(0, 8)), v[`${TEN[9]}/bucket`]);
  await write({ by: TEN[9], at: MORNING + 60000, what: "pour", n: 1, can: "bucket" });
  v = (await book()).carriers;
  t.check("…and poured, counts for those eight and no others", same(Object.keys(v).sort(), TEN.slice(2)) && Object.values(v).every((c) => c.buckets === 1), Object.keys(v));
  await t.sql(`delete from public.profiles where id = any($1::uuid[])`, [TEN]);
  await wipe();
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
{
  r = await pass("anon", U.m2);
  const u = await pass(U.unver, U.m2), n = await pass(U.nochar, U.m2);
  t.check("town_pass: not somebody signed out's, nor somebody's with no proved character", r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
  const a = await t.as("anon", `select * from public.town_line_water`), m = await t.as(U.m1, `select * from public.town_line_water`), w = await t.as(U.m1, `delete from public.town_line_water`);
  t.check("town_line_water: nobody in a browser reads it or writes it", a.code === "42501" && m.code === "42501" && w.code === "42501", [a, m, w]);
  r = await t.as(U.m1, `select town.pass('{}'::jsonb, '{}'::jsonb, 0)`);
  t.check("the rule of handing on is not a member's to ask", r.code === "42501", r);
  r = await t.as(U.m1, `select town.line_counted('${U.m1}'::uuid, 'bucket', 5, 0, 'pour')`);
  t.check("…nor the counting of a line", r.code === "42501", r);
  r = await t.as(U.m1, `insert into public.town_deeds (member_id, at, what, thing, n, doc) values ('${U.m1}', now(), 'line', 'bucket', 600, '{}')`);
  t.check("a member cannot write themselves a line of the deeds", !!r.code, r);
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  await holding(U.m1, "bucket", 1);
  await holding(U.admin, "bucket", 1);
  await holding(U.m2, "bucket");
  const shut = await pass(U.m1, U.m2), boss = await pass(U.admin, U.m2);
  t.check("while the game is shut handing on is an admin's only", shut.code === "42501" && boss.ok === true, [shut, boss]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── somebody of the line who goes ───────────────────────────────────────── */

t.section("somebody of the line who goes");
{
  await wipe();
  await clock(MORNING);
  await purse(U.guest, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  await holding(U.m1, "bucket", 1);
  await holding(U.m2, "bucketIron");
  r = await pass(U.m1, U.guest);
  const second = await pass(U.guest, U.m2);
  t.check("water handed from one to a second to a third", r.ok === true && second.ok === true && same((await lineNow())[`${U.m2}/bucketIron`], [U.m1, U.guest, U.m2]), [r, second]);
  r = await t.as("super", `delete from public.profiles where id = '${U.guest}'`);
  t.check("the second goes: their own bucket's line goes with them", !r.error && !(`${U.guest}/bucket` in await lineNow()), r);
  const mark = await lastDeed();
  r = await call(U.m2, "town_chore", ...AT_WELL);
  v = await deedsSince(mark);
  t.check("the third pours all the same: it counts for them and for the first, and nothing fails for want of the second", r.ok === true && same(v.map((d) => [d.what, d.member_id]), [["pour", U.m2], ["line", U.m1]])
    && same((await book()).carriers, { [U.m1]: { buckets: 1, taken: [] }, [U.m2]: { buckets: 1, taken: [] } }), v);
}

/* ── again ───────────────────────────────────────────────────────────────── */

t.section("the file a third time");
{
  const was = { line: await lineNow(), book: await book(), texts: await texts(), rows: (await t.sql(`select key, data from public.town_catalog order by key`)).rows };
  await t.run(FILE, "v132 once more");
  t.check("run again, it changes nothing: the lines, the book, every function, every row of the catalog", same(await lineNow(), was.line) && same(await book(), was.book) && same(await texts(), was.texts)
    && same((await t.sql(`select key, data from public.town_catalog order by key`)).rows, was.rows));
}

t.done();
