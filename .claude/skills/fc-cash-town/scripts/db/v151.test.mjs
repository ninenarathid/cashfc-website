/*
 * v151 — the gifts of the lines' ranks: a charm taken, and two worn: dry run in PGlite.
 *
 * Every file of the town's is replayed as it ran (v104 to v150, whichever of the last are files yet), then v151
 * twice. Then:
 *   - the catalog's row is the code's; no other row is touched;
 *   - the three functions written again (town.strike_window, town.tend, town.work_answer) are each their last text
 *     but for the lines meant (v151.lines.mjs), and nothing else of the farm's, the deck's or the lines' has moved;
 *   - the rules: every case made from the code as it is now (what a purse keeps of gifts, a gift taken, charms worn,
 *     a cost with a part of it left to pay, the gloves, the strike's moment with the float, the farm's own tending
 *     with the gloves on), put to the SQL and held to what the code answers; and the farm's own cases under a clear
 *     sky as they were, with no gift in any purse;
 *   - through the functions a member calls: a gift taken once, of a rank reached; charms worn, two at the most;
 *     somebody else's plant watered twice with the gloves on for one point of stamina; each written down;
 *   - who may run what, no write without its rows named.
 *
 *   TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors-gifts.test.ts lib/town/db-vectors-swarm.test.ts      (in the repo, first)
 *   node v151.test.mjs            (RULES=0 skips the cases; MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the file> v151.test.mjs v151.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { AGAIN, MADE } from "./build-v151.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const here = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
// (MIGRATION_FILE; or a draft beside this file while there is one and supabase/ has none; then supabase/, or history once it has run)
const inRepo = existsSync(`${repo}/supabase`) && readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v151_"));
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(here("v151_draft.sql")) ? readFileSync(here("v151_draft.sql"), "utf8") : migration(151));
const DIR = process.env.VECTORS ?? "now";
const need = ["vectors-gifts.json", "vectors-v147.json", "catalog.json"];
if (process.env.RULES !== "0" && !need.every((f) => existsSync(here(`${DIR}/${f}`)))) {
  console.log(`no ${DIR}/${need.find((f) => !existsSync(here(`${DIR}/${f}`)))}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors-gifts.test.ts lib/town/db-vectors-swarm.test.ts\` in the repo first`);
  process.exit(2);
}
const read = (name) => JSON.parse(readFileSync(here(`${DIR}/${name}`), "utf8"));
const vectors = process.env.RULES === "0" ? [] : read("vectors-gifts.json");
const FARM = process.env.RULES === "0" ? [] : read("vectors-v147.json").cases.filter((c) => c.sky === 0);
const CODE = JSON.parse(readFileSync(here(`${DIR}/catalog.json`), "utf8"));

const extra = `${KUDOS}
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;
const t = await supabaseLike({ extra });
// (as town-bench.mjs replays them: by number, but v130 after v131, as it ran; v136 is the party finder's; v148 was never
// written, and v150 is another session's and is replayed once it is a file)
const numbers = Array.from({ length: 150 - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136);
numbers.splice(numbers.indexOf(131) + 1, 0, 130);
for (const n of numbers) { let sql = null; try { sql = migration(n); } catch { /* a number that is no file yet, or never was */ } if (sql) await t.run(sql, `v${n}`); }
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const words = (sql, name) => { const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };
const textOf = async (name) => (await t.sql(`select pg_get_functiondef(p.oid) as def from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = $1 order by p.oid`, [name])).rows.map((r) => r.def).join("\n");
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const deeds = async (what) => (await t.sql(`select member_id, thing, n::int as n, doc from public.town_deeds where what = $1 order by id`, [what])).rows;

/* ── as things stand before the file ── */
const UNTOUCHED = ["town.see", "town.feed", "town.cure", "town.deed_for", "town.water", "town.sow", "town.pick", "town.hoe", "town.uproot", "town.pest_at", "town.owner_of", "town.spend", "town.cost_of", "town.stamina_of",
  "town.buff_by", "town.level_of", "town.purse_of", "town.answer", "town.keep_purse", "public.town_tend", "public.town_cast", "public.town_strike", "public.town_ditch",
  "town.work_told", "town.work_rank", "town.work_counts_of", "town.work_count", "town.work_counted", "public.town_work", "public.town_title_wear"];
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
// a member who has reached the kitchen's first rank, and nothing of the deck's; a purse each, as the game makes one
for (const who of [U.m1, U.m2]) await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh()) on conflict (member_id) do nothing`, [who]);
await t.sql(`insert into public.town_work (member_id, line, kept) values ($1, 'kitchen', town.work_new() || '{"points": 60}'::jsonb), ($1, 'fishing', town.work_new() || '{"points": 10}'::jsonb)
  on conflict (member_id, line) do update set kept = excluded.kept`, [U.m1]);
const was = { answer: await one(`select town.work_answer($1) as a`, [U.m1]).then((r) => r.a) };

await t.runTwice(FILE, "v151");

/* ── the catalog ── */
t.section("the catalog's row");
const row = (await one(`select data from public.town_catalog where key = 'gifts'`))?.data;
t.check("the gifts row is seeded as the code has it: two places, six charms, each with the rank that gives it and its number", same(row, CODE.gifts) && row.slots === 2 && Object.keys(row.gifts).length === 6 && row.gifts.charmGloves.by === 0.5, row);
const others = await one(`select count(*)::int as n from public.town_catalog where key <> 'gifts' and updated_at > now() - interval '1 hour'`);
t.check("no other row of the catalog is touched", others.n === 0, others);

/* ── written again, and nothing else moved ── */
t.section("three functions written again, each as it last ran but for the lines meant");
for (const [mark, [n, name]] of Object.entries(AGAIN)) {
  const built = MADE[mark](), inFile = words(FILE, name);
  t.check(`${name} is v${n}'s but for the lines meant`, inFile === built, inFile === null ? "not in the file" : "the file's text is not the built one");
}
const moved = [];
for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) moved.push(name);
t.check(`nothing else of the farm's, the deck's or the lines' has moved (${UNTOUCHED.length} functions)`, moved.length === 0, moved);
const now = await one(`select town.work_answer($1) as a`, [U.m1]).then((r) => r.a);
t.check("the lines' answer says that gifts are given, and is otherwise as it was", !("gifting" in was.answer) && now.gifting === true && same({ ...now, gifting: undefined, now: 0 }, { ...was.answer, gifting: undefined, now: 0 }), { was: Object.keys(was.answer), now: Object.keys(now) });

/* ── the rules ── */
const CALL = {
  gifts_of: "town.gifts_of($1::jsonb)", wearing: "to_jsonb(town.wearing($1::jsonb, $2::text))", charm_by: "to_jsonb(town.charm_by($1::jsonb, $2::text, $3::float8))",
  gift_take: "town.gift_take($1::jsonb, $2::jsonb, $3::text, $4::int)", charms_wear: "town.charms_wear($1::jsonb, $2::jsonb)",
  eased: "town.eased($1::jsonb, $2::jsonb, $3::bigint, $4::float8, $5::float8)", gloved: "town.gloved($1::jsonb, $2::jsonb, $3::bigint)",
  strike_window: "to_jsonb(town.strike_window($1::jsonb, $2::bigint))",
  tend: "town.tend($1::text, $2::jsonb, $3::jsonb, $4::int, $5::int, $6::jsonb, $7::text, $8::bigint)",
  pest_at: "town.pest_at($1::text, $2::jsonb, $3::bigint)", see: "town.see($1::text, $2::jsonb, $3::bigint)",
  feed: "town.feed($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)", cure: "town.cure($1::text, $2::jsonb, $3::jsonb, $4::text, $5::bigint)",
  deed_for: "town.deed_for($1::text, $2::jsonb, $3::text, $4::text, $5::bigint, $6::text)",
};
const ask = async (cases, title, tag = "") => {
  t.section(`${title}: ${cases.length} cases, each as the site's own code answers it now`);
  const tally = new Map();
  for (const v of cases) {
    const sql = CALL[v.fn];
    if (!sql) throw new Error(`no SQL for ${v.fn}`);
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    const ok = !error && same(got ?? null, v.want);
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    r.n++;
    if (!ok) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
    tally.set(v.fn, r);
  }
  for (const [fn, r] of tally) t.check(`${tag}${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 1800)}` : "");
  return tally;
};
if (vectors.length) {
  const tally = await ask(vectors, "the rules of the gifts");
  t.check("every rule was asked", ["gifts_of", "wearing", "charm_by", "gift_take", "charms_wear", "eased", "gloved", "strike_window", "tend"].every((fn) => tally.has(fn)), [...tally.keys()]);
  // (no hour counted and no rain: the sky the farm's cases under it were made with)
  if ((await one(`select to_regclass('public.town_swarms') is not null as there`)).there) await t.sql(`delete from public.town_swarms where true`);
  await ask(FARM, "the farm's own cases under a clear sky, with no gift in any purse: as they were", "the farm's, ");
}

/* ── through the functions a member calls ── */
t.section("a gift taken, and charms worn");
let did = await call(U.m1, "town_gift_take", "fishing", 1);
t.check("a gift of a rank not reached is refused, and nothing is kept or written down", did?.ok === false && did.why === "rank" && !("gifts" in (await purseOf(U.m1))) && (await deeds("gift")).length === 0, did);
did = await call(U.m1, "town_gift_take", "kitchen", 2);
t.check("a rank that gives nothing, the same", did?.ok === false && did.why === "none", did);
did = await call(U.m1, "town_gift_take", "well", 1);
t.check("the well's first rank is its own book's to give: nothing here", did?.ok === false && did.why === "none", did);
did = await call(U.m1, "town_gift_take", "kitchen", 1);
t.check("the gift of a rank reached is taken: named in the answer, kept in the purse, and in no slot of the bag", did?.ok === true && did.gift === "charmApron" && same(did.purse?.gifts, { had: ["charmApron"], charms: [], owed: 0 })
  && same((await purseOf(U.m1)).gifts, { had: ["charmApron"], charms: [], owed: 0 }) && (await purseOf(U.m1)).bag.every((s) => s === null), did);
t.check("…and written down: which, of which line and rank", same((await deeds("gift")).map((d) => [d.member_id, d.thing, d.doc]), [[U.m1, "charmApron", { line: "kitchen", rank: 1 }]]), await deeds("gift"));
did = await call(U.m1, "town_gift_take", "kitchen", 1);
t.check("it is taken once", did?.ok === false && did.why === "had" && (await deeds("gift")).length === 1, did);
did = await call(U.m1, "town_charms_wear", ["charmApron"]);
t.check("a charm had is worn: kept, told back, and written down", did?.ok === true && same(did.purse?.gifts?.charms, ["charmApron"]) && same((await purseOf(U.m1)).gifts.charms, ["charmApron"])
  && same((await deeds("charms")).map((d) => [d.n, d.doc]), [[1, { worn: ["charmApron"] }]]), did);
for (const [ids, why] of [[["charmHoe"], "none"], [["charmApron", "charmApron"], "slots"], [["charmApron", "charmHoe", "charmNet"], "slots"], [["noSuchGift"], "none"]]) {
  did = await call(U.m1, "town_charms_wear", ids);
  t.check(`not ${ids.join(" and ")}: ${why}`, did?.ok === false && did.why === why && same((await purseOf(U.m1)).gifts.charms, ["charmApron"]), did);
}
did = await call(U.m1, "town_charms_wear", []);
t.check("and all are taken off", did?.ok === true && same((await purseOf(U.m1)).gifts, { had: ["charmApron"], charms: [], owed: 0 }), did);
const told = await call(U.m1, "town_work");
t.check("a member is told that gifts are given", told?.gifting === true && typeof told.lines === "object", told);
const out = await call(U.unver, "town_gift_take", "kitchen", 1), out2 = await call(U.unver, "town_charms_wear", []);
t.check("a gift is a member's: nobody without a proved character takes one or wears one", !!out?.error && !!out2?.error, { out, out2 });

t.section("the float and the gloves, where the database judges");
// the float: the strike's moment as the deck's own function reads it, for the same purse with it worn and not
await t.sql(`update public.town_purses set doc = doc || '{"gifts": {"had": ["charmFloat", "charmGloves"], "charms": ["charmFloat", "charmGloves"]}}'::jsonb where member_id = $1`, [U.m2]);
const strike = await one(`select town.strike_window(p.doc, town.now_ms()) as worn, town.strike_window(p.doc - 'gifts', town.now_ms()) as bare, (town.cat('fishing')->>'strike')::float8 as base from public.town_purses p where p.member_id = $1`, [U.m2]);
t.check("with the float worn the strike's moment is half as long again", strike.bare === strike.base && Math.abs(strike.worn - strike.base * 1.5) < 1e-12, strike);
// the gloves: somebody else's plant watered twice costs one point, through the farm's own function
const bed = await one(`select (data->'bedsAt'->0->>0)::int as x, (data->'bedsAt'->0->>1)::int as y from public.town_catalog where key = 'farming'`);
const plant = (x, y, by) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled',
  jsonb_build_object('by', $3::text, 'crop', 'cabbage', 'sown', town.now_ms() - 600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 365::bigint * 86400000, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())
  on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [x, y, by]);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of($1::int, $2::int), $3, town.now_ms() - 3600000, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [bed.x, bed.y, U.m1]);
for (const dx of [0, 1, 2, 3]) await plant(bed.x + dx, bed.y, U.m1);
await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'can', 'bag', jsonb_build_array(jsonb_build_object('item', 'can', 'n', 1, 'water', 8)) || '[null, null, null, null, null, null, null, null, null]'::jsonb,
  'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 50)) where member_id = $1`, [U.m2]);
const left = async (who) => (await one(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [who])).s;
const paid = [], owing = [];
for (const dx of [0, 1, 2, 3]) {
  const before = await left(U.m2);
  did = await call(U.m2, "town_tend", bed.x + dx, bed.y);
  if (!did?.ok) { t.check(`(the watering of plant ${dx + 1} is done)`, false, did); break; }
  paid.push(before - (await left(U.m2)));
  owing.push((await purseOf(U.m2)).gifts.owed ?? 0);
}
t.check("with the gloves on, four of somebody else's plants are watered for two points of stamina: none, one, none, one", same(paid, [0, 1, 0, 1]) && same(owing, [0.5, 0, 0.5, 0]), { paid, owing });
t.check("…each watering written down as ever, with whose plant it was", (await deeds("water")).filter((d) => d.member_id === U.m2 && d.doc?.whose === U.m1).length === 4, await deeds("water"));
// (the same hand on its own plant, in a bed of its own, pays the whole)
const own = await one(`select (data->'bedsAt'->1->>0)::int as x, (data->'bedsAt'->1->>1)::int as y from public.town_catalog where key = 'farming'`);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of($1::int, $2::int), $3, town.now_ms() - 3600000, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [own.x, own.y, U.m2]);
await plant(own.x, own.y, U.m2);
let before = await left(U.m2);
did = await call(U.m2, "town_tend", own.x, own.y);
t.check("on one's own plant in one's own bed the gloves take nothing off", did?.ok === true && before - (await left(U.m2)) === 1 && ((await purseOf(U.m2)).gifts.owed ?? 0) === 0, { did: did?.ok, paid: before - (await left(U.m2)) });
// (and the gloves taken off: the whole again)
await call(U.m2, "town_charms_wear", ["charmFloat"]);
await plant(bed.x + 5, bed.y, U.m1);
before = await left(U.m2);
did = await call(U.m2, "town_tend", bed.x + 5, bed.y);
t.check("and with the gloves taken off, somebody else's plant costs the whole", did?.ok === true && before - (await left(U.m2)) === 1, { did: did?.ok, paid: before - (await left(U.m2)) });
t.check("a purse keeps its gifts through the farm's work", same((await purseOf(U.m2)).gifts.had, ["charmFloat", "charmGloves"]) && same((await purseOf(U.m2)).gifts.charms, ["charmFloat"]), (await purseOf(U.m2)).gifts);

/* ── closed, and who may run what ── */
t.section("closed, and who may run what");
const open = await one(`select count(*)::int as n, coalesce(string_agg(p.proname, ', '), '') as names from pg_proc p where p.pronamespace = 'town'::regnamespace
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("no rule of the town's can be run by a browser", open.n === 0, open);
const may = await one(`select has_function_privilege('authenticated', 'public.town_gift_take(text, integer)', 'execute') and has_function_privilege('authenticated', 'public.town_charms_wear(text[])', 'execute') as member,
  has_function_privilege('anon', 'public.town_gift_take(text, integer)', 'execute') or has_function_privilege('anon', 'public.town_charms_wear(text[])', 'execute') as anon`);
t.check("a member may take a gift and wear charms, and nobody else", may.member === true && may.anon === false, may);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes without naming its rows", bare.length === 0, bare);

t.done();
