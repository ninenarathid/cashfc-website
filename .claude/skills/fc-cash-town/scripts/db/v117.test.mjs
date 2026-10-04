/*
 * v117 — tired hands, and a cure: dry run in PGlite.
 *
 * v117 writes nine rows of the catalog over: a scroll of how the cure for pests is made, on the uncle's shelf from the
 * first day; the cure made of what that shelf grows; and a shorter moment to strike in with no stamina left. The
 * rules read all nine, so the proof is the whole of the town's rules again: v105 to v116 are replayed as they ran,
 * v117 is run twice, and every case made from the code as it is now is put to the SQL and must come back as the code
 * answers it. Then the things themselves: the scroll bought, read and kept in the book; the cure cooked; the strike.
 *
 *   node v117.test.mjs            (RULES=0 skips the cases; VECTORS=next reads them from ./next instead of ./now)
 *   node mutate.mjs <the file> v117.test.mjs v117.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v117_"));
const HERE = new URL("./v117_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(117);
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
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116]) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{note}', '"an admin was here"') where key = 'flotsam'`);
const before = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;

const NINE = "cooking, fishing, goods, hints, items, makes, order, scrolls, shelf";
const OLD = [["chili", 2], ["garlic", 2], ["basil", 1]], NEW = [["chili", 2], ["scallion", 2], ["salt", 1]];
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const count = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const windowOf = async (who) => Number((await one(`select town.strike_window(doc, town.now_ms()) as w from public.town_purses where member_id = $1`, [who])).w);
const madeOf = async (things) => (await one(`select town.made_of($1::jsonb) as made`, [JSON.stringify(things)])).made;

// as it stands before the file: no such scroll, the cure of garlic and basil, and a tired strike of 0.96 s
await purse(U.m1, 100, [{ item: "pot", n: 1 }, { item: "chili", n: 4 }, { item: "scallion", n: 2 }, { item: "salt", n: 1 }, { item: "garlic", n: 2 }, { item: "basil", n: 1 }], 100, { hand: "pot" });
await purse(U.m2, 100, [], 0);
const was = {
  buy: await call(U.m1, "town_buy", "scrollPestCure", 1),
  old: await madeOf(OLD), next: await madeOf(NEW),
  tired: await windowOf(U.m2), fed: await windowOf(U.m1),
  hint: (await one(`select (e->>1)::int as stage from jsonb_array_elements(town.cat('hints')->'ids') e where e->>0 = 'pestCure'`)).stage,
};

await t.runTwice(FILE, "v117");

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
t.check("it writes nine rows over, and leaves the other nine as they were", v.rows.filter((x) => x.written).map((x) => x.key).join(", ") === NINE && v.rows.length === before.length && v.rows.length === 18, v.rows.filter((x) => x.written).map((x) => x.key));
v = await t.sql(`select (select data->'scrollPestCure' from public.town_catalog where key = 'items') as thing,
         (select data->'scrollPestCure' from public.town_catalog where key = 'goods') as good,
         (select data->>'scrollPestCure' from public.town_catalog where key = 'scrolls') as tells,
         (select data->'basic' ? 'scrollPestCure' from public.town_catalog where key = 'shelf') as on_the_shelf,
         (select jsonb_array_length(data->'basic') from public.town_catalog where key = 'shelf') as basic`);
t.check("the scroll is a thing, a good of forty coins, six a round and one each, tells of the cure, and is on the first day's shelf of twenty-two",
  same(v.rows[0], { thing: { kind: "scroll", pays: 0, tier: 1, stack: 1 }, good: { each: 1, price: 40, stock: 6 }, tells: "pestCure", on_the_shelf: true, basic: 22 }), v.rows);
v = await t.sql(`select (select data->'pestCure'->'needs' from public.town_catalog where key = 'makes') as made_of,
         (select data->'needs'->'pestCure' from public.town_catalog where key = 'cooking') as tidied,
         (select data->'asks'->'made' @> '[["pestCure", 0]]' from public.town_catalog where key = 'order') as asked_for,
         (select data->'ids' @> '[["pestCure", 0]]' from public.town_catalog where key = 'hints') as hinted_at`);
t.check("the cure is of two chilies, two scallions and salt, the same in both rows; asked for and hinted at from the first day",
  same(v.rows[0], { made_of: NEW, tidied: { salt: 1, chili: 2, scallion: 2 }, asked_for: true, hinted_at: true }), v.rows);
v = await t.sql(`select data->'spent' as spent, data->'strike' as strike from public.town_catalog where key = 'fishing'`);
t.check("with no stamina 0.3 of the strike's moment is left, of 1.6 s", same(v.rows[0], { spent: 0.3, strike: 1.6 }), v.rows);

t.section("nothing else moved");
const after = (await t.sql(`select key, data from public.town_catalog order by key`)).rows;
const flat = (x, at = "", out = {}) => { if (x && typeof x === "object" && !Array.isArray(x)) for (const [k, y] of Object.entries(x)) flat(y, at ? `${at}.${k}` : k, out); else out[at] = JSON.stringify(x); return out; };
const moved = [];
for (const row of after) {
  const a = flat(before.find((b) => b.key === row.key).data), b = flat(row.data);
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) moved.push(`${row.key}.${k}`);
}
const WANT = [
  "cooking.needs.pestCure.basil", "cooking.needs.pestCure.garlic", "cooking.needs.pestCure.salt", "cooking.needs.pestCure.scallion",
  "fishing.spent", "goods.scrollPestCure.each", "goods.scrollPestCure.price", "goods.scrollPestCure.stock", "hints.ids",
  "items.scrollPestCure.kind", "items.scrollPestCure.pays", "items.scrollPestCure.stack", "items.scrollPestCure.tier",
  "makes.pestCure.needs", "order.asks.made", "scrolls.scrollPestCure", "shelf.basic",
];
t.check("of the whole catalog, seventeen entries differ: the scroll's, the cure's makings, and the tired strike", same([...moved].sort(), WANT), [...moved].sort());
const list = (key, path) => { const of = (rows) => path.reduce((x, k) => x[k], rows.find((r) => r.key === key).data); return [of(before), of(after)]; };
const [asksWas, asksNow] = list("order", ["asks", "made"]), [hintsWas, hintsNow] = list("hints", ["ids"]), [shelfWas, shelfNow] = list("shelf", ["basic"]);
t.check("the uncle's asking gains the cure, from the first day, and nothing else of it moves", same(asksNow.filter(([id]) => id !== "pestCure"), asksWas) && same(asksNow.find(([id]) => id === "pestCure"), ["pestCure", 0]) && !asksWas.some(([id]) => id === "pestCure"), asksNow.filter(([id], i) => !same(asksWas[i], [id, asksNow[i][1]])).slice(0, 4));
t.check("his hints are the same hints in the same order, the cure's from the first day where it was from the second order", same(hintsNow.map(([id, s]) => (id === "pestCure" ? [id, 2] : [id, s])), hintsWas) && was.hint === 2, { was: was.hint });
t.check("the first day's shelf is what it was, with the scroll beside the other two", same(shelfNow.filter((id) => id !== "scrollPestCure"), shelfWas) && shelfNow.indexOf("scrollPestCure") === shelfNow.indexOf("scrollGrilledFish") + 1, shelfNow);
v = await t.sql(`select data->>'note' as note from public.town_catalog where key = 'flotsam'`);
t.check("what an admin changed in a row it leaves is still theirs", v.rows[0].note === "an admin was here", v.rows);

t.section("the scroll, at the stall");
t.check("before the file, there was no such thing to buy", was.buy.ok === false && was.buy.why === "none", was.buy);
let r = await call(U.m1, "town_stall");
t.check("with none of his orders filled, the uncle has it on his shelf", r.unlocked === 0 && r.shelf.includes("scrollPestCure") && r.shelf.length === 22, { unlocked: r.unlocked, shelf: r.shelf?.length });
r = await call(U.m1, "town_buy", "scrollPestCure", 1);
let p = await kept(U.m1);
t.check("it costs forty coins", r.ok === true && p.coins === 60 && count(p.bag, "scrollPestCure") === 1, { r: r.ok ?? r, coins: p.coins });
r = await call(U.m1, "town_buy", "scrollPestCure", 1);
t.check("one to a person a round", r.ok === false && r.why === "each" && (await kept(U.m1)).coins === 60, r);
await purse(U.unver, 100, []);
r = await t.as(U.unver, `select public.town_buy('scrollPestCure', 1) as r`);
t.check("nobody without a proved character buys it", r.code === "42501" && (await kept(U.unver)).coins === 100, r);
for (const who of [U.m2, U.admin, U.guest]) { await purse(who, 100, [], who === U.m2 ? 0 : 100); }
const bought = [];
for (const who of [U.m2, U.admin, U.guest]) bought.push((await call(who, "town_buy", "scrollPestCure", 1)).ok === true);
v = await t.sql(`select doc->'sold'->>'scrollPestCure' as sold from public.town_things where key = 'stall'`);
t.check("six a round for the whole village: four have gone, and the stall counts them", bought.every(Boolean) && v.rows[0].sold === "4", { bought, sold: v.rows[0].sold });
r = await one(`select town.buy(jsonb_build_object('coins', 100, 'bag', '[null]'::jsonb), jsonb_build_object('round', town.round_of(town.now_ms()), 'sold', '{"scrollPestCure": 6}'::jsonb), 'scrollPestCure', 1, town.now_ms(), null) as r`);
t.check("…and the seventh of a round is refused: sold out", r.r.ok === false && r.r.why === "sold", r.r);

t.section("the scroll, read");
p = await kept(U.m1);
const slot = p.bag.findIndex((s) => s?.item === "scrollPestCure");
r = await call(U.m1, "town_read", slot);
p = await kept(U.m1);
t.check("read, it tells of the cure and is used up", r.ok === true && r.dish === "pestCure" && count(p.bag, "scrollPestCure") === 0, r.ok ? r.dish : r);
t.check("…and the cure is in the reader's recipes", same(p.recipes, ["pestCure"]), p.recipes);
await t.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,9}', '{"item": "scrollPestCure", "n": 1}') where member_id = $1`, [U.m1]);
r = await call(U.m1, "town_read", 9);
t.check("a second is not read: it is known, and the scroll is kept", r.ok === false && r.why === "known" && count((await kept(U.m1)).bag, "scrollPestCure") === 1, r);
await t.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,9}', 'null') where member_id = $1`, [U.m1]);
const EARLIER = `(select coalesce(jsonb_agg(e->>0), '[]'::jsonb) from jsonb_array_elements(town.cat('hints')->'ids') with ordinality x(e, ord)
  where ord < (select ord from jsonb_array_elements(town.cat('hints')->'ids') with ordinality y(e, ord) where e->>0 = 'pestCure'))`;
v = await t.sql(`select town.next_hint(jsonb_build_object('hints', ${EARLIER}, 'recipes', '[]'::jsonb), '[]'::jsonb, 0) as unread,
  town.next_hint(jsonb_build_object('hints', ${EARLIER}, 'recipes', '["pestCure"]'::jsonb), '[]'::jsonb, 0) as read`);
t.check("the uncle sells a hint of the cure with no order filled, to whoever has not read of it", v.rows[0].unread === "pestCure", v.rows);
t.check("…and not to whoever has: the next is the basket's", v.rows[0].read === "basket", v.rows);

t.section("the cure, made");
t.check("before the file, garlic and basil made it, and scallions and salt did not", was.old === "pestCure" && was.next === null, was);
t.check("after it, the other way about", (await madeOf(NEW)) === "pestCure" && (await madeOf(OLD)) === null, { new: await madeOf(NEW), old: await madeOf(OLD) });
r = await call(U.m1, "town_cook", JSON.stringify(NEW), [], null);
p = await kept(U.m1);
t.check("two chilies, two scallions and salt, with a pot in the hand: two of the cure", r.ok === true && r.made === "pestCure" && r.n === 2 && count(p.bag, "pestCure") === 2, r.ok ? { made: r.made, n: r.n } : r);
t.check("…the things are gone from the bag, and it cost what a dish costs to begin", count(p.bag, "chili") === 2 && count(p.bag, "scallion") === 0 && count(p.bag, "salt") === 0 && p.stamina.left === 96, { bag: p.bag.filter(Boolean), stamina: p.stamina });
v = await t.sql(`select doc from public.town_things where key = 'found'`);
t.check("…it is a recipe found: the first of the village to make it, and it is in what they have made", r.first === true && p.made.includes("pestCure") && v.rows[0].doc.includes("pestCure"), { first: r.first, made: p.made, found: v.rows[0].doc });
r = await call(U.m1, "town_cook", JSON.stringify(OLD), [], null);
p = await kept(U.m1);
t.check("garlic and basil in the pot are an odd dish now, and no cure", r.ok === true && r.made === "oddDish" && count(p.bag, "pestCure") === 2 && count(p.bag, "garlic") === 0, r.ok ? { made: r.made, taste: r.taste } : r);
await purse(U.m2, 0, [{ item: "pot", n: 1 }, { item: "chili", n: 2 }, { item: "scallion", n: 2 }, { item: "salt", n: 1 }], 0, { hand: "pot" });
r = await call(U.m2, "town_cook", JSON.stringify(NEW), [], JSON.stringify({ hits: 5, misses: 9, secs: 20 }));
t.check("a stirring missed again and again still leaves one: a miss is one fewer, never none", r.ok === true && r.made === "pestCure" && r.n === 1 && r.first === false, r.ok ? { made: r.made, n: r.n, first: r.first } : r);
r = await one(`select town.cook(town.fresh() || jsonb_build_object('bag', '[{"item": "scrollPestCure", "n": 1}, {"item": "pot", "n": 1}, null]'::jsonb), '[["scrollPestCure", 1]]'::jsonb, '["pot"]'::jsonb, 0, town.now_ms()) as r`);
t.check("a scroll is not a thing that goes in a pot", r.r.ok === false && r.r.why === "none", r.r);
v = await t.sql(`select 'pestCure' = any(town.asks('made', 0)) as asked, 'guardFert' = any(town.asks('made', 0)) as other`);
t.check("the uncle may ask for the cure in an order from the first day", v.rows[0].asked === true, v.rows);

t.section("the cure, used");
const never = "(town.now_ms() + 365::bigint * 86400000)";
await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (134, 5, town.bed_of(134, 5), 'tilled',
  jsonb_build_object('by', '${U.m2}', 'crop', 'cabbage', 'sown', town.now_ms() - 3600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', ${never}, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())`);
p = await kept(U.m1);
await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'pestCure') where member_id = $1`, [U.m1]);
r = await call(U.m1, "town_tend", 134, 5, null);
t.check("on a plant no pest is on, it is not wasted", r.ok === false && count((await kept(U.m1)).bag, "pestCure") === 2, r.ok ? r.deed : r.why);

t.section("tired hands at the line");
t.check("before the file, a strike with no stamina had 0.96 s; with stamina 1.6", Math.abs(was.tired - 0.96) < 1e-9 && Math.abs(was.fed - 1.6) < 1e-9, was);
await purse(U.guest, 0, [], 0);
await purse(U.admin, 0, [], 100);
const tired = await windowOf(U.guest), fed = await windowOf(U.admin);
t.check("after it, 0.48 s with none", Math.abs(tired - 0.48) < 1e-9, tired);
t.check("…and 1.6 s as ever with some", Math.abs(fed - 1.6) < 1e-9, fed);

t.section("running it again");
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
await t.sql(`update public.town_catalog set data = jsonb_set(data, '{spent}', '0.9') where key = 'fishing'`);
await t.run(FILE, "v117 a third time");
v = await t.sql(`select (data->>'spent')::float8 as spent, (select string_agg(key, ', ' order by key) from public.town_catalog where updated_at > now() - interval '1 hour') as written from public.town_catalog where key = 'fishing'`);
t.check("run again, it writes its nine rows over again, as its head says: a number changed by hand in them is put back", v.rows[0].spent === 0.3 && v.rows[0].written === NINE, v.rows);
p = await kept(U.m1);
t.check("…and what members have is as it was: the cure made, the recipe read", count(p.bag, "pestCure") === 2 && same(p.recipes, ["pestCure"]), { bag: p.bag.filter(Boolean), recipes: p.recipes });

await t.done();
