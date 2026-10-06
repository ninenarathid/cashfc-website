/*
 * v146 — three helpings to a meal's hours, and a meal's buffs at their levels: dry run in PGlite.
 *
 * Every file of the town's is replayed as it ran (v104 to v145, as town-bench.mjs replays them), then v146 twice.
 * Then:
 *   - the rules: every case of stamina and meals, of fishing and of the farm, made from the code as it is now (with
 *     purses that have buffs at levels and meals with helpings counted, and purses from before that have neither),
 *     put to the SQL and held to what the code answers;
 *   - each of the ten functions written again is, in the file, its last text but for the lines meant;
 *   - a member eats: three helpings in a meal's hours and no fourth, the buff a level higher with each and its hours
 *     the first helping's, the fourth level across a change of meals, another buff beside it, a purse from before;
 *   - what a purse is told with, the two functions dropped, who may run what, no write without its rows named.
 *
 *   TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors.test.ts      (in the repo, first)
 *   node v146.test.mjs            (RULES=0 skips the cases; MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the file> v146.test.mjs v146.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";
import { MADE } from "./build-v146.mjs";
import { bareWrites } from "./bare-writes.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v146_draft.sql")) ? readFileSync(here("v146_draft.sql"), "utf8") : migration(145));
const DIR = process.env.VECTORS ?? "now";
const vectors = [];
for (const n of process.env.RULES === "0" ? [] : [107, 108, 110]) {
  const at = here(`${DIR}/vectors-v${n}.json`);
  if (!existsSync(at)) { console.log(`no ${DIR}/vectors-v${n}.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors.test.ts\` in the repo first`); process.exit(2); }
  vectors.push(...JSON.parse(readFileSync(at, "utf8")));
}

const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;
const t = await supabaseLike({ extra });
// (as town-bench.mjs replays them: by number, but v130 after v131, as it ran; v136 is the party finder's)
// (v145 is another session's, of the farm: replayed too once it is a file, in supabase/ or in history; skipped while it is neither)
const numbers = Array.from({ length: 145 - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136);
numbers.splice(numbers.indexOf(131) + 1, 0, 130);
for (const n of numbers) { let sql = null; try { sql = migration(n); } catch { /* a number that was never a file */ } if (sql) await t.run(sql, `v${n}`); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const staminaWas = (await one(`select data from public.town_catalog where key = 'stamina'`)).data;
const luckyWas = (await one(`select town.odds('minnow', 21, false, true, false, '{}') as o`)).o;

await t.runTwice(FILE, "v146");

// (first of all: the odds and the cast as they were are gone. Left beside the new ones, a call that tells nothing of
// luck would have two to choose from, and nothing after this would say anything: the stand-in was seen to stop there)
const gone = await one(`select to_regprocedure('town.odds(text,integer,boolean,boolean,boolean,text[])') is null as odds, to_regprocedure('town.cast_line(text,integer,boolean,boolean,boolean,text[],double precision[])') is null as cast_`);
t.check("the two as they were, of six and of seven arguments, are dropped", gone.odds && gone.cast_, gone);
if (!gone.odds || !gone.cast_) { t.done(); process.exit(1); }

/* ── who may run what, as the file leaves it (before this run puts a clock of its own in the town's schema) ── */
t.section("who may run what");
const open = await one(`select count(*)::int as n, coalesce(string_agg(p.proname, ', '), '') as names from pg_proc p where p.pronamespace = 'town'::regnamespace
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("no rule of the town's can be run by a browser", open.n === 0, open);
const cast = await one(`select has_function_privilege('authenticated', 'public.town_cast(text, integer, integer, boolean)', 'execute') as member, has_function_privilege('anon', 'public.town_cast(text, integer, integer, boolean)', 'execute') as anon`);
t.check("a member may cast, and nobody else", cast.member === true && cast.anon === false, cast);

/* ── the catalog ── */
t.section("the catalog's row");
const stamina = (await one(`select data, updated_at > now() - interval '1 hour' as fresh from public.town_catalog where key = 'stamina'`));
t.check("the stamina row is written over: three helpings, four levels, and what each buff does at each",
  stamina.fresh && stamina.data.bowls === 3 && stamina.data.levels === 4 && same(stamina.data.steps.hearty, [0.3, 0.45, 0.55, 0.67]) && same(stamina.data.steps.calm, [0.2, 0.6, 1.2, 2]), stamina.data);
t.check("…and everything it had is as it was", same({ ...stamina.data, bowls: undefined, levels: undefined, steps: undefined }, staminaWas), { was: staminaWas, is: stamina.data });
t.check("…each buff's first level is what the buff always did", Object.entries(staminaWas.buffs).every(([id, by]) => stamina.data.steps[id][0] === by), stamina.data.steps);
const others = await one(`select count(*)::int as n from public.town_catalog where key <> 'stamina' and updated_at > now() - interval '1 hour'`);
t.check("no other row of the catalog is touched", others.n === 0, others);

/* ── the rules ── */
const TEXTS = (n) => `(select coalesce(array_agg(x order by ord), '{}'::text[]) from jsonb_array_elements_text($${n}::jsonb) with ordinality as e(x, ord))`;
const FLOATS = (n) => `(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($${n}::jsonb) with ordinality as e(x, ord))`;
// (how each rule is asked is v122's dry run's own list, which has every rule as its arguments stand; and v146's seven more)
const v122 = lf(readFileSync(here("v122.test.mjs"), "utf8")), from = v122.indexOf("const CALL = {"), to = v122.indexOf("\n};", from);
const CALL = new Function("TEXTS", "FLOATS", `${v122.slice(from, to + 3)}\nreturn CALL;`)(TEXTS, FLOATS);
Object.assign(CALL, {
  bowls_today: "town.bowls_today($1::jsonb, $2::bigint)", meal_buffs: "town.meal_buffs($1::jsonb, $2::bigint)",
  level_of: "town.level_of($1::jsonb, $2::bigint, $3::text)", buff_by: "town.buff_by($1::jsonb, $2::bigint, $3::text)",
  raised: "town.raised($1::jsonb, $2::text, $3::bigint)",
  odds_luck: `town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${TEXTS(6)}, $7::float8)`,
  cast_luck: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${TEXTS(6)}, ${FLOATS(7)}, $8::float8)`,
});
const param = (fn, i, v) => (v === null ? null : fn === "roll" && i === 1 ? `{${v.join(",")}}` : typeof v === "object" ? JSON.stringify(v) : v);
t.section(`the rules of meals, fishing and the farm: ${vectors.length} cases, each as the site's own code answers it now`);
const tally = new Map();
for (const v of vectors) {
  const sql = CALL[v.fn];
  if (!sql) throw new Error(`no SQL for ${v.fn}`);
  let got, error = null;
  try { got = (await t.db.query(`select ${sql} as r`, v.args.map((a, i) => param(v.fn, i, a)))).rows[0].r; } catch (e) { error = e.message; }
  if (typeof got === "bigint") got = Number(got);
  const ok = !error && same(got ?? null, v.want);
  const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
  row.n++;
  if (!ok) { row.bad++; row.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  tally.set(v.fn, row);
}
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");
if (vectors.length) {
  const NEW = ["bowls_today", "meal_buffs", "level_of", "buff_by", "raised", "odds_luck", "cast_luck"];
  t.check("every rule this file adds or writes again was asked", [...NEW, "sit_down", "chew", "get_up", "settle", "cost_of", "spend", "strike_window", "water", "odds", "cast_line"].every((fn) => tally.has(fn)),
    [...tally.keys()]);
  // (the cases are worth their name: buffs above the first level, and helpings counted, were among them)
  const leveled = vectors.filter((v) => v.fn === "level_of").map((v) => v.want), bowls = vectors.filter((v) => v.fn === "bowls_today").map((v) => v.want);
  t.check("…with buffs at every level, and meals of one, two and three helpings", [0, 1, 2, 3, 4].every((l) => leveled.includes(l)) && [1, 2, 3].every((n) => bowls.some((b) => b.includes(n))), { levels: [...new Set(leveled)] });
}

/* ── written again ── */
t.section("each function written again is its last text, but for the lines meant");
for (const [mark, make] of Object.entries(MADE)) {
  const open = `-- <${mark}>\n`, a = FILE.indexOf(open), b = FILE.indexOf(`-- </${mark}>`);
  t.check(`${mark}: the file has it as build-v146 makes it`, a >= 0 && b > a && FILE.slice(a + open.length, b) === make() + "\n", a < 0 ? "no marked lines" : "the text between its marks differs");
}
const luckyNow = await one(`select town.odds('minnow', 21, false, true, false, '{}') as untold, town.odds('minnow', 21, false, true, false, '{}', 0.5) as told, town.odds('minnow', 21, false, true, false, '{}', 2) as fourth,
  town.odds('minnow', 21, false, false, false, '{}', 2) as none, town.odds('minnow', 21, false, false, false, '{}') as plain`);
t.check("what called the odds with nothing told of luck is answered as before", same(luckyNow.untold, luckyWas) && same(luckyNow.told, luckyWas), luckyNow.untold);
t.check("…told more, the rare fish are oftener; and with no luck, what it would do counts for nothing", !same(luckyNow.fourth, luckyWas) && same(luckyNow.none, luckyNow.plain));

/* ── a member eats ── */
t.section("a member eats");
// the town's clock, to be put forward (as town-bench.mjs has it)
await t.sql(`
  create table public.bench_clock (id int primary key default 1, skew bigint not null default 0);
  insert into public.bench_clock default values;
  create or replace function town.now_ms() returns bigint language sql stable
  as $$ select floor(extract(epoch from now()) * 1000)::bigint + (select skew from public.bench_clock) $$;
  revoke execute on function town.now_ms() from public, anon, authenticated;
`);
const MIN = 60_000, HOUR = 3_600_000;
const nowMs = async () => Number((await one(`select town.now_ms() as n`)).n);
const clockTo = async (at) => { const real = Number((await one(`select floor(extract(epoch from now()) * 1000)::bigint as n`)).n); await t.sql(`update public.bench_clock set skew = $1 where id = 1`, [at - real]); };
const skip = async (ms) => { await t.sql(`update public.bench_clock set skew = skew + $1 where id = 1`, [ms]); };
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who])).doc;
const setDoc = (who, doc) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || $2::jsonb)
  on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify(doc)]);
const slotOf = (doc, item) => doc.bag.findIndex((s) => s?.item === item);
/** One helping eaten up: sat down to, five minutes and a second let go by, counted. Says what the sitting down came to. */
const eat = async (who, dish) => {
  const sat = await call(who, "town_sit", slotOf(await kept(who), dish), true);
  if (!sat?.ok) return sat;
  await skip(5 * MIN + 1000);
  await call(who, "town_chew", 0);
  return sat;
};
// twenty-four minutes to five in the afternoon, in Bangkok: lunch's hours, with dinner's not half an hour off
const T0 = Date.parse("2026-11-02T16:36:00+07:00");
await clockTo(T0);
const day = Number((await one(`select town.day_of($1::bigint) as d`, [T0])).d);
const bag = [{ item: "tomYum", n: 5 }, { item: "friedMinnow", n: 2 }, ...Array(8).fill(null)];
await setDoc(U.m1, { bag, stamina: { day, left: 10 } });
const told = await call(U.m1, "town_me");
t.check("a purse is told with how many helpings each meal has had, before any is eaten", same(told?.purse?.meals?.bowls, [0, 0, 0]), told?.purse?.meals ?? told);

let sat = await eat(U.m1, "tomYum");
let p = await kept(U.m1);
t.check("a first helping is eaten, and counted", sat?.ok === true && same(p.meals.bowls, [0, 1, 0]) && same(p.meals.eaten, [false, true, false]) && p.eating === null, { sat, meals: p.meals });
t.check("…it leaves its buff at the first level, for three hours; and the one buff a purse always kept, beside it", p.buffs?.length === 1 && p.buffs[0].id === "hearty" && p.buffs[0].level === 1
  && p.buffs[0].until === p.buff?.until && p.buff?.id === "hearty" && Math.abs(p.buffs[0].until - (T0 + 5 * MIN + 1000 + 3 * HOUR)) < 5000, { buffs: p.buffs, buff: p.buff });
const first = p.buffs?.[0]?.until;
sat = await eat(U.m1, "tomYum");
const third = await eat(U.m1, "tomYum");
p = await kept(U.m1);
t.check("a second and a third in the same hours raise it a level each, its hours still the first helping's", sat?.ok === true && third?.ok === true && same(p.meals.bowls, [0, 3, 0])
  && same(p.buffs, [{ id: "hearty", level: 3, until: first }]), { meals: p.meals, buffs: p.buffs });
const fourth = await call(U.m1, "town_sit", slotOf(p, "tomYum"), true);
t.check("a fourth in the same hours is refused, and nothing is lost", fourth?.ok === false && fourth.why === "meal" && (await kept(U.m1)).bag[0].n === 2, fourth);
t.check("the gauge is never over its hundred", p.stamina?.left <= 100 && p.stamina?.left > 10, p.stamina);
const at3 = await nowMs();
const costs = await one(`select town.cost_of($1::jsonb, 20, $2::bigint) as third, town.cost_of($1::jsonb, 20, $3::bigint) as run_out, town.level_of($1::jsonb, $2::bigint, 'hearty') as level`, [JSON.stringify(p), at3, first]);
t.check("hearty at the third level takes fifty-five in a hundred off; run out, nothing", costs.third === 9 && costs.run_out === 20 && costs.level === 3, costs);
// dinner's hours begin: a fourth helping of the same, while the buff still runs, is the fourth level
await clockTo(Date.parse("2026-11-02T17:01:00+07:00"));
sat = await eat(U.m1, "tomYum");
p = await kept(U.m1);
t.check("as the next meal's hours begin, a fourth helping is the fourth level, the last, with the first helping's hours", sat?.ok === true && same(p.buffs, [{ id: "hearty", level: 4, until: first }]) && same(p.meals.bowls, [0, 3, 1]), { buffs: p.buffs, meals: p.meals });
sat = await eat(U.m1, "tomYum");
p = await kept(U.m1);
t.check("a fifth is still the fourth level: there is none higher", sat?.ok === true && same(p.buffs, [{ id: "hearty", level: 4, until: first }]), p.buffs);
sat = await eat(U.m1, "friedMinnow");
p = await kept(U.m1);
t.check("a helping that leaves another buff is a buff of its own beside it, at the first level, with its own hours", sat?.ok === true && p.buffs?.length === 2 && same(p.buffs[0], { id: "hearty", level: 4, until: first })
  && p.buffs[1].id === "keen" && p.buffs[1].level === 1 && p.buffs[1].until > first && p.buff?.id === "keen" && p.buff?.until === p.buffs[1].until, { buffs: p.buffs, buff: p.buff });
const at6 = await nowMs();
const does = await one(`select town.cost_of($1::jsonb, 20, $2::bigint) as cost, town.strike_window($1::jsonb, $2::bigint) as strike, town.strike_window($3::jsonb, $2::bigint) as plain,
  town.has_buff($1::jsonb, $2::bigint, 'keen') as keen, town.has_buff($1::jsonb, $2::bigint, 'lucky') as lucky`, [JSON.stringify(p), at6, JSON.stringify({ ...p, buffs: [], buff: null })]);
t.check("hearty at the fourth takes two thirds off, and a keen eye at the first makes the strike's moment half as long again", does.cost === 7 && Math.abs(does.strike / does.plain - 1.5) < 1e-9 && does.keen === true && does.lucky === false, does);
t.check("…what is told of the purse says the same", same((await call(U.m1, "town_me"))?.purse?.buffs, p.buffs) && same((await call(U.m1, "town_me")).purse.meals.bowls, [0, 3, 3]));
const full = await call(U.m1, "town_sit", slotOf(p, "friedMinnow"), true);
t.check("dinner's three are eaten too: no more until breakfast", full?.ok === false && full.why === "meal", full);

// a purse from before this file: one buff, a meal marked eaten, nothing counted
await clockTo(Date.parse("2026-11-03T12:10:00+07:00"));
const day2 = Number((await one(`select town.day_of(town.now_ms()) as d`)).d), then = await nowMs();
await setDoc(U.m2, { bag: [{ item: "tomYum", n: 2 }, ...Array(9).fill(null)], stamina: { day: day2, left: 40 }, meals: { day: day2, eaten: [false, true, false] }, buff: { id: "hearty", until: then + HOUR } });
const before = await call(U.m2, "town_me");
t.check("a purse from before is told as having eaten one of lunch's three, with its buff as it was", same(before?.purse?.meals?.bowls, [0, 1, 0]) && same(before.purse.buff, { id: "hearty", until: then + HOUR }) && before.purse.buffs === undefined, before?.purse?.meals);
sat = await eat(U.m2, "tomYum");
p = await kept(U.m2);
t.check("its next helping of the same is the second level, with the hours its buff had", sat?.ok === true && same(p.buffs, [{ id: "hearty", level: 2, until: then + HOUR }]) && same(p.meals.bowls, [0, 2, 0])
  && same(p.buff, { id: "hearty", until: then + HOUR }), { buffs: p.buffs, meals: p.meals, buff: p.buff });
// a helping left early raises nothing, and is one of the meal's three all the same
await setDoc(U.m2, { ...p, bag: [{ item: "tomYum", n: 2 }, ...Array(9).fill(null)] });
sat = await call(U.m2, "town_sit", 0, true);
await skip(2 * MIN);
await call(U.m2, "town_get_up", 0);
p = await kept(U.m2);
t.check("a helping left early raises nothing, and is one of the meal's three all the same", sat?.ok === true && same(p.buffs, [{ id: "hearty", level: 2, until: then + HOUR }]) && same(p.meals.bowls, [0, 3, 0]) && p.eating === null, { buffs: p.buffs, meals: p.meals });

/* ── no write without its rows named ── */
t.section("what the functions write");
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes without naming its rows", bare.length === 0, bare);

t.done();
