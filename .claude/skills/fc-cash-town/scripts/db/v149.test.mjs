/*
 * v149 — lines of work: points, ranks and a title to wear: dry run in PGlite.
 *
 * Every file of the town's is replayed as it ran (v104 to v148, whichever of the last are files yet), some things
 * are done and written down as they were before there were lines, then v149 twice. Then:
 *   - the past is counted once, for whoever it counts for, and not again by the second run;
 *   - the rules: every case made from the code as it is now (what counts, a line counted, the day's bound, the
 *     marks), put to the SQL and held to what the code answers;
 *   - what is done from now on counts as it is written down (a deed, a go), and nothing that goes wrong in the
 *     counting stands in a deed's way;
 *   - a member is told their lines, the well's among them from the well's own book; wears a title they have and not
 *     one they have not; and is told everybody's worn title;
 *   - the tables are closed, who may run what, no write without its rows named.
 *
 *   TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors-lines.test.ts      (in the repo, first)
 *   node v149.test.mjs            (RULES=0 skips the cases; MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the file> v149.test.mjs v149.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";
import { bareWrites } from "./bare-writes.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
// (MIGRATION_FILE, or a draft beside this file while there is one; else supabase/ of the tree FC_REPO names, or history once it has run)
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v149_draft.sql")) ? readFileSync(here("v149_draft.sql"), "utf8") : migration(149));
const DIR = process.env.VECTORS ?? "now";
const at = here(`${DIR}/vectors-lines.json`);
if (process.env.RULES !== "0" && !existsSync(at)) { console.log(`no ${DIR}/vectors-lines.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors-lines.test.ts\` in the repo first`); process.exit(2); }
const vectors = process.env.RULES === "0" ? [] : JSON.parse(readFileSync(at, "utf8"));
const CODE = JSON.parse(readFileSync(here(`${DIR}/catalog.json`), "utf8"));

const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;
const t = await supabaseLike({ extra });
// (as town-bench.mjs replays them: by number, but v130 after v131, as it ran; v136 is the party finder's; v145, v147
// and v148 are other sessions' and are replayed once they are files)
const numbers = Array.from({ length: 148 - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136);
numbers.splice(numbers.indexOf(131) + 1, 0, 130);
for (const n of numbers) { let sql = null; try { sql = migration(n); } catch { /* a number that is no file yet, or never was */ } if (sql) await t.run(sql, `v${n}`); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const points = async (who) => Object.fromEntries((await t.sql(`select line, (kept->>'points')::float8 as p from public.town_work where member_id = $1 order by 1`, [who])).rows.map((r) => [r.line, r.p]));
const note = (who, what, thing, n = 1, doc = {}) => t.sql(`select town.note($1, $2, $3, $4, 0, $5::jsonb)`, [who, what, thing, n, JSON.stringify(doc)]);
const went = (who, game, what, won) => t.sql(`select town.record($1, $2, $3, 4, false, null, $4::jsonb)`, [who, game, won, JSON.stringify({ what })]);
const deeds = async () => (await one(`select count(*)::int as n from public.town_deeds`)).n;

/* ── what was done before there were lines ── */
await went(U.m1, "fishing", "minnow", true);
await went(U.m1, "fishing", "minnow", false);
await went(U.m1, "cooking", "tomYum", true);
await went(U.m1, "cooking", "tomYum", true);
await went(U.m1, "cooking", "oddDish", false);
await note(U.m1, "pick", "tomato", 3);
await note(U.m2, "water", "tomato", 1, { whose: U.m1 });
await note(U.m1, "thank", null, 1, { to: [U.m2] });
await note(U.m2, "ladle", "tomYum", 1, { pot: "p1", whose: U.m1 });
await note(U.m2, "gather", "truffle", 1, { how: "dig", kind: "mound" });
await note(U.m2, "net", "moth", 1, { haunt: 3 });
await note(U.m2, "buy", "worm", 5);
// (a line of nobody's, as a member who has left leaves behind)
await t.sql(`insert into public.town_deeds (member_id, what, thing, n) values (null, 'net', 'moth', 1)`);
const before = await deeds();

await t.runTwice(FILE, "v149");

/* ── the catalog ── */
t.section("the catalog's row");
const row = (await one(`select data from public.town_catalog where key = 'work'`))?.data;
t.check("the work row is seeded as the code has it: seven lines, ten marks each, a day's bound, what each thing is worth", same(row, CODE.work) && row.ids.length === 7 && row.marks.kitchen.length === 10 && row.day.well === 200, row?.ids);
const others = await one(`select count(*)::int as n from public.town_catalog where key <> 'work' and updated_at > now() - interval '1 hour'`);
t.check("no other row of the catalog is touched", others.n === 0, others);

/* ── the past ── */
t.section("the past, counted once");
const m1 = await points(U.m1), m2 = await points(U.m2);
t.check("what was done before counts for whoever did it: a fish and its first, two pots and a first, a picking and its first; and a helping ladled by another",
  same(m1, { farming: 6 + 10, fishing: 1 + 10, kitchen: 4 + 10 + 4 + 1 }), m1);
t.check("…help on another's plant and thanks for it, a truffle dug on a day of its own, a moth by its lamp", same(m2, { forest: 3 + 10 + 10, helpers: 1 + 3, insects: 3 + 10 }), m2);
t.check("the file run twice counted it once, and wrote nothing down itself", (await deeds()) === before && !!(await one(`select 1 as x from public.town_things where key = 'work_counted'`)));
const firsts = (await one(`select kept->'firsts' as f, kept->'held' as h from public.town_work where member_id = $1 and line = 'kitchen'`, [U.m1]));
t.check("…with the firsts had, and what a day holds to so many", same(firsts.f, ["kitchen:tomYum"]) && firsts.h["pot:tomYum"] === 2 && firsts.h[`ladle:${U.m2}`] === 1, firsts);

/* ── the rules ── */
const CALL = {
  counts_of: "town.work_counts_of($1::jsonb, $2::text)", line_count: "town.work_count($1::jsonb, $2::jsonb, $3::int)",
  counted_on: "to_jsonb(town.work_counted_on($1::text, $2::float8, $3::float8))", line_rank: "town.work_rank($1::text, $2::float8)",
};
t.section(`the rules of the lines: ${vectors.length} cases, each as the site's own code answers it now`);
const tally = new Map();
for (const v of vectors) {
  const sql = CALL[v.fn];
  if (!sql) throw new Error(`no SQL for ${v.fn}`);
  let got, error = null;
  try { got = (await t.db.query(`select ${sql} as r`, v.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  r.n++;
  if (!ok) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, r);
}
for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 1800)}` : "");
if (vectors.length) t.check("every rule was asked", Object.keys(CALL).every((fn) => tally.has(fn)), [...tally.keys()]);

/* ── counted as it is written down ── */
t.section("counted as it is written down");
await note(U.m1, "net", "moth", 1, { haunt: 3 });
t.check("a deed written down counts at once: a moth, and ten for the first", (await points(U.m1)).insects === 13, await points(U.m1));
await note(U.m1, "net", "moth", 1, { haunt: 3 });
t.check("…and the next one without the ten", (await points(U.m1)).insects === 16);
await went(U.m1, "fishing", "minnow", true);
t.check("a go written down counts at once: a minnow landed, its first long had", (await points(U.m1)).fishing === 12, await points(U.m1));
await went(U.m1, "fishing", "minnow", false);
await note(U.m1, "buy", "worm", 5);
t.check("a line lost, and a deed of no line's, count nothing", (await points(U.m1)).fishing === 12 && Object.keys(await points(U.m1)).length === 4);
await note(U.m2, "ladle", "tomYum", 1, { pot: "p2", whose: U.m1 });
t.check("a helping ladled counts for whoever set the pot down", (await points(U.m1)).kitchen === 20, await points(U.m1));
// a hoe's work in a bed that is somebody else's: the bed's owner is looked up from the tile
const bed = await one(`select (data->'bedsAt'->0->>0)::int as x, (data->'bedsAt'->0->>1)::int as y from public.town_catalog where key = 'farming'`);
await t.sql(`insert into public.town_beds (bed, member_id, tended) values (town.bed_of($1, $2), $3, town.now_ms()) on conflict (bed) do update set member_id = excluded.member_id`, [bed.x, bed.y, U.m1]);
await note(U.m2, "till", null, 1, { tile: [bed.x, bed.y] });
t.check("a hoe's work in somebody else's bed is help: the bed's owner is looked up from the tile", (await points(U.m2)).helpers === 4 + 2, await points(U.m2));
await note(U.m1, "till", null, 1, { tile: [bed.x, bed.y] });
t.check("…and in one's own bed it is not", (await points(U.m1)).helpers === undefined, await points(U.m1));
// nothing that goes wrong in the counting stands in a deed's way
let n0 = await deeds();
await note(U.m2, "ladle", "tomYum", 1, { pot: "p3", whose: "00000000-0000-0000-0000-0000000000ff" });
await note(U.m2, "ladle", "tomYum", 1, { pot: "p4", whose: "nobody at all" });
await note(U.m2, "thank", null, 1, { to: ["not a member", U.m1, "00000000-0000-0000-0000-0000000000ff"] });
t.check("a count for somebody who is no member is let go: the deed is written all the same, and the rest of it counts", (await deeds()) === n0 + 3 && (await points(U.m1)).helpers === 3, { deeds: await deeds(), m1: await points(U.m1) });
await t.sql(`update public.town_catalog set data = data - 'insects' where key = 'work'`);
n0 = await deeds();
await note(U.m1, "net", "moth", 1, {});
t.check("with the catalog's row broken a deed is still written, and counts nothing", (await deeds()) === n0 + 1 && (await points(U.m1)).insects === 16);
await t.sql(`update public.town_catalog set data = $1::jsonb where key = 'work'`, [JSON.stringify(row)]);
// a day's bound, through the trigger: sixty stag beetles in a day
for (let i = 0; i < 60; i++) await note(U.guest, "net", "stagBeetle", 1, {});
const beetles = await one(`select (kept->>'points')::float8 as p, (kept->>'today')::float8 as today from public.town_work where member_id = $1 and line = 'insects'`, [U.guest]);
t.check("a day's points count in full up to the line's bound, and a quarter past it", beetles.today === 60 * 8 + 10 && beetles.p === 150 + (60 * 8 + 10 - 150) * 0.25, beetles);

/* ── what a member is told, and the title they wear ── */
t.section("what a member is told, and the title they wear");
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
await t.sql(`insert into public.town_carriers (member_id, buckets) values ($1, 60) on conflict (member_id) do update set buckets = 60`, [U.m1]);
await note(U.m1, "pour", "bucket", 2);
let told = await call(U.m1, "town_work");
t.check("a member is told all seven lines: the points on each, and what today has been worth", Object.keys(told?.lines ?? {}).sort().join() === [...row.ids].sort().join()
  && told.lines.kitchen.points === 20 && told.lines.fishing.points === 12 && told.lines.forest.points === 0 && told.lines.insects.today >= 3, told?.lines);
// (sixty in the book, and the two just poured, which the well's own trigger of v127 counted as they were written down)
t.check("…the well's from the well's own book: the bucketfuls poured, and today's", told.lines.well.points === 62 && told.lines.well.today === 2, told.lines.well);
t.check("…and no title, until one is chosen", told.worn === null && same(told.titles, {}), told);
let wore = await call(U.m1, "town_title_wear", "kitchen", 1);
t.check("a title of a rank not had is refused", wore?.ok === false && wore.why === "none", wore);
await t.sql(`update public.town_work set kept = kept || '{"points": 160}'::jsonb where member_id = $1 and line = 'kitchen'`, [U.m1]);
wore = await call(U.m1, "town_title_wear", "kitchen", 2);
t.check("a title of a rank had is worn, and told back with the lines", wore?.ok === true && same(wore.worn, { line: "kitchen", rank: 2 }) && same(wore.titles, { [U.m1]: { line: "kitchen", rank: 2 } }) && wore.lines.kitchen.points === 160, wore);
for (const [line, rank] of [["kitchen", 3], ["kitchen", 0], ["kitchen", 11], ["cooking", 1], ["kitchen", null], ["forest", 1]]) {
  const no = await call(U.m1, "town_title_wear", line, rank);
  t.check(`not ${line} ${rank}: none`, no?.ok === false && no.why === "none", no);
}
wore = await call(U.m1, "town_title_wear", "well", 1);
t.check("the well's first title is worn for sixty-two bucketfuls, in the other's place", wore?.ok === true && same(wore.worn, { line: "well", rank: 1 }) && (await one(`select count(*)::int as n from public.town_titles`)).n === 1, wore);
told = await call(U.m2, "town_work");
t.check("everybody is told everybody's worn title, and their own lines", same(told?.titles, { [U.m1]: { line: "well", rank: 1 } }) && told.worn === null && told.lines.helpers.points === 6, told);
wore = await call(U.m1, "town_title_wear", null, null);
t.check("and a title is taken off", wore?.ok === true && wore.worn === null && same(wore.titles, {}), wore);
const titled = await t.sql(`select what, thing, n::int as n from public.town_deeds where what = 'title' order by id`);
t.check("each wearing is written down", same(titled.rows, [{ what: "title", thing: "kitchen", n: 2 }, { what: "title", thing: "well", n: 1 }, { what: "title", thing: null, n: 0 }]), titled.rows);
const out = await call(U.unver, "town_work");
t.check("the lines are a member's: nobody without a proved character is told any", !!out?.error, out);

/* ── closed, and who may run what ── */
t.section("closed, and who may run what");
const shut = await one(`select has_table_privilege('authenticated', 'public.town_work', 'select') or has_table_privilege('anon', 'public.town_work', 'select')
  or has_table_privilege('authenticated', 'public.town_titles', 'select') or has_table_privilege('authenticated', 'public.town_titles', 'insert') as open,
  (select relrowsecurity from pg_class where oid = 'public.town_work'::regclass) and (select relrowsecurity from pg_class where oid = 'public.town_titles'::regclass) as rls`);
t.check("the two tables are closed to every browser", shut.open === false && shut.rls === true, shut);
const open = await one(`select count(*)::int as n, coalesce(string_agg(p.proname, ', '), '') as names from pg_proc p where p.pronamespace = 'town'::regnamespace
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("no rule of the town's can be run by a browser", open.n === 0, open);
const may = await one(`select has_function_privilege('authenticated', 'public.town_work()', 'execute') and has_function_privilege('authenticated', 'public.town_title_wear(text, integer)', 'execute') as member,
  has_function_privilege('anon', 'public.town_work()', 'execute') or has_function_privilege('anon', 'public.town_title_wear(text, integer)', 'execute') as anon`);
t.check("a member may ask for their lines and wear a title, and nobody else", may.member === true && may.anon === false, may);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes without naming its rows", bare.length === 0, bare);

t.done();
