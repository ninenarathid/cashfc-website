/*
 * v116 — a bigger harvest, and a lighter hoe: dry run in PGlite.
 *
 * v116 writes two rows of the catalog over: every crop's yield, doubled, and the hoe's two costs, halved. The rules
 * read both, so the proof is the whole of the town's rules again: v105 to v115 are replayed as they ran, v116 is run
 * twice, and every case made from the code as it is now is put to the SQL and must come back as the code answers it.
 * Then the farm itself: what a clearing and a tilling cost, and what a plant sown before the file ran gives when it
 * is picked after.
 *
 *   node v116.test.mjs            (RULES=0 skips the cases; VECTORS=next reads them from ./next instead of ./now)
 *   node mutate.mjs <the file> v116.test.mjs v116.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v116_"));
const HERE = new URL("./v116_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(116);
const DIR = process.env.VECTORS ?? "now";
const WHICH = process.env.RULES === "0" ? [] : process.env.RULES ? process.env.RULES.split(",").map(Number) : [106, 107, 108, 110, 111, 112, 113];
const vectors = [];
for (const n of WHICH) {
  const at = new URL(`./${DIR}/vectors-v${n}.json`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/vectors-v${n}.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors.test.ts\` in the repo first`); process.exit(2); }
  vectors.push(...JSON.parse(readFileSync(at, "utf8")));
}

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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
const before = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;

// What stands on the farm before the file runs: a cabbage and a morning glory of one member's, both ripe (and kept
// from pests, so that the clock alone decides), in a bed that is theirs.
const never = "(town.now_ms() + 365::bigint * 86400000)";
const plantOf = (crop, hoursAgo) => `jsonb_build_object('by', '${U.m2}', 'crop', '${crop}', 'sown', town.now_ms() - ${hoursAgo}::bigint * 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', ${never}, 'cured', 0, 'picked', 0, 'pickedAt', 0)`;
await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values
  (134, 5, town.bed_of(134, 5), 'tilled', ${plantOf("cabbage", 30)}, town.now_ms()),
  (135, 5, town.bed_of(135, 5), 'tilled', ${plantOf("kangkong", 7)}, town.now_ms())`);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of(134, 5), '${U.m2}', town.now_ms(), 0)`);
const purse = (who, bag, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb)
  on conflict (member_id) do update set doc = excluded.doc`, [who, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const stamina = async (who) => Number((await t.sql(`select doc->'stamina'->>'left' as left from public.town_purses where member_id = $1`, [who])).rows[0].left);

// as it stands before the file: a clearing costs four
await purse(U.m1, [{ item: "hoe", n: 1 }], { hand: "hoe" });
let r = await call(U.m1, "town_tend", 140, 5, null);
const was = { deed: r.deed, left: await stamina(U.m1) };

await t.runTwice(FILE, "v116");

const RND = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($6::jsonb) with ordinality as e(x, ord))";
const ROLLS = "(select array_agg(x::float8 order by ord) from jsonb_array_elements_text($3::jsonb) with ordinality as e(x, ord))";
const CALL = {
  roll: "town.roll($1, variadic $2::bigint[])",
  round_of: "town.round_of($1::bigint)", week_of: "town.week_of($1::bigint)", day_of: "town.day_of($1::bigint)",
  held: "town.held($1::jsonb, $2)", room: "town.room($1::jsonb, $2)", put: "town.put($1::jsonb, $2, $3::int)", take: "town.take($1::jsonb, $2, $3::int)",
  hold: "town.hold($1::jsonb, $2::int)", wear: "town.wear($1::jsonb, $2::int)", take_off: "town.take_off($1::jsonb, $2)",
  buy: "town.buy($1::jsonb, $2::jsonb, $3, $4::int, $5::bigint, $6::jsonb)",
  leave: "town.leave($1::jsonb, $2::int, $3::int, $4::bigint)", take_back: "town.take_back($1::jsonb, $2::int, $3::bigint)", collect: "town.collect($1::jsonb, $2::bigint)",
  shelf_of: "town.shelf_of($1::int)", asks: "to_jsonb(town.asks($1, $2::int))", wants: "town.wants($1::int, $2::int)",
  order_of: "town.order_of($1::jsonb, $2::bigint)", give: "town.give($1::jsonb, $2::jsonb, $3::int, $4::int, $5::bigint)",
  next_hint: "town.next_hint($1::jsonb, $2::jsonb, $3::int)", buy_hint: "town.buy_hint($1::jsonb, $2::jsonb, $3::int)",
  fresh: "town.fresh()",
  meal_of: "town.meal_of($1::bigint)", stamina_of: "town.stamina_of($1::jsonb, $2::bigint)", buff_of: "town.buff_of($1::jsonb, $2::bigint)",
  eaten_today: "town.eaten_today($1::jsonb, $2::bigint)", cost_of: "town.cost_of($1::jsonb, $2::float8, $3::bigint)", spend: "town.spend($1::jsonb, $2::float8, $3::bigint)",
  sit_down: "town.sit_down($1::jsonb, $2::int, $3::boolean, $4::bigint)", chew: "town.chew($1::jsonb, $2::float8, $3::bigint)", get_up: "town.get_up($1::jsonb, $2::float8, $3::bigint)",
  settle: "town.settle($1::jsonb, $2::bigint)", read_scroll: "town.read_scroll($1::jsonb, $2::int)", bowls_back: "town.bowls_back($1::jsonb, $2::int)",
  odds: "town.odds($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean)",
  cast_line: `town.cast_line($1::text, $2::int, $3::boolean, $4::boolean, $5::boolean, ${RND})`,
  hook_bait: "town.hook_bait($1::jsonb, $2::text)", lose_bait: "town.lose_bait($1::jsonb, $2::text)",
  land_catch: "town.land_catch($1::jsonb, $2::text, $3::float8)", strike_window: "town.strike_window($1::jsonb, $2::bigint)",
  tool_of: "town.tool_of($1::text)", bed_of: "town.bed_of($1::int, $2::int)",
  growth: "town.growth($1::text, $2::float8, $3::int, $4::float8)", grown: "town.grown($1::jsonb, $2::bigint)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  yield_of: "town.yield_of($1::text, $2::jsonb, $3::text)", owner_of: "town.owner_of($1::jsonb, $2::boolean, $3::bigint)",
  hoe: "town.hoe($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", sow: "town.sow($1::jsonb, $2::jsonb, $3::text, $4::text, $5::bigint)",
  water: "town.water($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", pick: "town.pick($1::text, $2::jsonb, $3::jsonb, $4::boolean, $5::text, $6::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  chore_for: "town.chore_for($1::jsonb, $2::text, $3::int)", chore: "town.chore($1::jsonb, $2::text, $3::int, $4::bigint)",
  tidy: "town.tidy($1::jsonb)", made_of: "town.made_of($1::jsonb)", takes: "town.takes($1::text)", in_hands: "town.in_hands($1::jsonb, $2::jsonb)",
  helpings: "town.helpings($1::text, $2::jsonb, $3::float8, $4::jsonb)", odd_helpings: "town.odd_helpings($1::jsonb, $2::float8)",
  taste_of: "town.taste_of($1::jsonb, $2::jsonb)", cook: "town.cook($1::jsonb, $2::jsonb, $3::jsonb, $4::float8, $5::bigint)",
  set_down: "town.set_down($1::jsonb, $2::int, $3::text, $4::jsonb, $5::text)", ladle: "town.ladle($1::jsonb, $2::jsonb)",
  may_take: "town.may_take($1::jsonb, $2::text)", take_up: "town.take_up($1::jsonb, $2::jsonb, $3::text)", serve: "town.serve($1::jsonb, $2::int)",
  open: `town.open($1::jsonb, $2::int, ${ROLLS})`,
  tidy_give: "town.tidy_give($1::jsonb)", has_all: "town.has_all($1::jsonb, $2::jsonb)", side_of: "town.side_of($1::jsonb, $2::text)",
  lay: "town.lay($1::jsonb, $2::text, $3::jsonb, $4::jsonb, $5::numeric)", agree: "town.agree($1::jsonb, $2::text, $3::boolean)",
  pull: "town.pull($1::jsonb, $2::jsonb)", push: "town.push($1::jsonb, $2::jsonb)", swap: "town.swap($1::jsonb, $2::jsonb, $3::jsonb)",
  roomy: "town.roomy($1::jsonb)",
};
const param = (fn, i, v) => (v === null ? null : fn === "roll" && i === 1 ? `{${v.join(",")}}` : typeof v === "object" ? JSON.stringify(v) : v);
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

t.section(`the rules, all of them: ${vectors.length} cases, each as the site's own code answers it now`);
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
for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1600)}` : "");


t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, updated_at > now() - interval '1 hour' as written from public.town_catalog order by key`);
t.check("it writes two rows over, crops and farming, and leaves the rest as they were", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === "crops, farming" && v.rows.length === before.length, v.rows.filter((x) => x.written).map((x) => x.key));
v = await t.sql(`select data->'kangkong'->'yield' as k, data->'cabbage'->'yield' as c, data->'chili'->'yield' as ch, data->'pumpkin'->'yield' as p, (select count(*)::int from jsonb_object_keys(data)) as n from public.town_catalog where key = 'crops'`);
t.check("morning glory four to six, a cabbage two, chili six to ten, a pumpkin two; twenty-six crops", same(v.rows[0], { k: [4, 6], c: [2, 2], ch: [6, 10], p: [2, 2], n: 26 }), v.rows);
v = await t.sql(`select data->'costs' as costs from public.town_catalog where key = 'farming'`);
t.check("the hoe's two costs are two each; every other cost as it was", same(v.rows[0].costs, { clear: 2, till: 2, pull: 2, sow: 1, water: 1, feed: 1, cure: 1, pick: 2 }), v.rows);

t.section("nothing else moved");
const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const moved = [];
for (const row of after) {
  const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}: ${a[k]} -> ${b[k]}`);
}
const yields = moved.filter((m) => /^crops\.[A-Za-z]+\.yield: /.test(m));
t.check("of the whole catalog, twenty-eight entries differ: twenty-six yields and two costs", moved.length === 28 && yields.length === 26 && moved.includes("farming.costs.clear: 4 -> 2") && moved.includes("farming.costs.till: 4 -> 2"), moved.filter((m) => !/\.yield: /.test(m)));
const cropsWas = before.find((b) => b.key === "crops").data, cropsIs = after.find((b) => b.key === "crops").data;
t.check("every yield is twice what it was, least and most", Object.keys(cropsWas).length === 26 && Object.keys(cropsWas).every((id) => same(cropsIs[id].yield, cropsWas[id].yield.map((n) => n * 2))),
  Object.keys(cropsWas).filter((id) => !same(cropsIs[id].yield, cropsWas[id].yield.map((n) => n * 2))));
v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'flotsam'`);
t.check("what an admin changed in a row it leaves is still theirs", v.rows[0].note === "an admin was here", v.rows);

t.section("the hoe");
t.check("before the file, a clearing cost four", was.deed === "clear" && was.left === 96, was);
await purse(U.m1, [{ item: "hoe", n: 1 }], { hand: "hoe" });
r = await call(U.m1, "town_tend", 141, 5, null);
t.check("after it, weeds are cleared for two", r.ok === true && r.deed === "clear" && (await stamina(U.m1)) === 98, { r: r.ok ? r.deed : r, left: await stamina(U.m1) });
r = await call(U.m1, "town_tend", 141, 5, null);
t.check("…and the ground tilled for two", r.ok === true && r.deed === "till" && (await stamina(U.m1)) === 96, { r: r.ok ? r.deed : r, left: await stamina(U.m1) });
r = await call(U.m1, "town_tend", 142, 5, JSON.stringify({ hits: 3, misses: 2, secs: 4 }));
t.check("a miss of the hoe is still a point more each", r.ok === true && r.misses === 2 && (await stamina(U.m1)) === 92, { misses: r.misses, left: await stamina(U.m1) });

t.section("what is growing");
await purse(U.m2, []);
r = await call(U.m2, "town_tend", 134, 5, null);
t.check("a cabbage sown before the file ran gives two heads when it is picked after", r.ok === true && r.deed === "pick" && same(r.got, [["cabbage", 2]]), r.ok ? r.got : r);
t.check("…picking still costs two", (await stamina(U.m2)) === 98, await stamina(U.m2));
r = await call(U.m2, "town_tend", 135, 5, null);
t.check("a morning glory gives four to six at a picking", r.ok === true && r.deed === "pick" && r.got[0][0] === "kangkong" && r.got[0][1] >= 4 && r.got[0][1] <= 6, r.ok ? r.got : r);
v = await t.sql(`select doc->'bag' as bag from public.town_purses where member_id = $1`, [U.m2]);
t.check("…all of it in the bag", v.rows[0].bag.filter(Boolean).reduce((n, s) => n + s.n, 0) === 2 + r.got[0][1], v.rows[0].bag.filter(Boolean));

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{costs,clear}', '3') where key = 'farming'`);
await t.run(FILE, "v116 a third time");
v = await t.sql(`select (data->'costs'->>'clear')::int as clear, (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written from public.town_catalog where key = 'farming'`);
t.check("run again, it writes its two rows over again, as its head says: a number changed by hand in them is put back", v.rows[0].clear === 2 && v.rows[0].written === "crops, farming", v.rows);

await t.done();
