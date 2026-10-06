/*
 * v152 — the familiars: one follows its member, for everybody to see: dry run in PGlite.
 *
 * Every file of the town's is replayed as it ran (v104 to v151), then v152 twice. Then:
 *   - the catalog's row is the code's (nine gifts, three of them familiars); no other row is touched;
 *   - the two functions written again (town.gifts_of, town.work_answer) are each their last text but for the lines
 *     meant (v152.lines.mjs), and nothing else of the gifts', the farm's, the deck's or the lines' has moved;
 *   - a purse from before the file keeps what it had and wore, and has no familiar;
 *   - the rules: every case made from the code as it is now (what a purse keeps of gifts, a familiar called and sent
 *     to rest, a counted gift used, a gift taken, charms worn, the gloves, the strike's moment, the farm's tending), put to the SQL and
 *     held to what the code answers. What a familiar's number is (`fam_by`) is the page's own to read: no rule of the
 *     database reads it yet, so those cases are not asked;
 *   - through the functions a member calls: a familiar taken as a charm is, called, changed, sent to rest, each
 *     written down; one not had, a charm and what is no gift refused; charms worn and a gift taken leave it following;
 *     the gnome's weeding used ten times in a meal's hours and no more, each written down, and all of them again in the next;
 *   - who may run what, no write without its rows named.
 *
 *   TOWN_VECTORS=<this folder>/now npx vitest run lib/town/db-vectors-gifts.test.ts lib/town/db-vectors-swarm.test.ts      (in the repo, first)
 *   node v152.test.mjs            (RULES=0 skips the cases; MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the file> v152.test.mjs v152.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { AGAIN, MADE } from "./build-v152.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const here = (name) => new URL(`./${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
// (MIGRATION_FILE; or a draft beside this file while there is one and supabase/ has none; then supabase/, or history once it has run)
const inRepo = existsSync(`${repo}/supabase`) && readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v152_"));
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(here("v152_draft.sql")) ? readFileSync(here("v152_draft.sql"), "utf8") : migration(152));
const DIR = process.env.VECTORS ?? "now";
const need = ["vectors-gifts.json", "vectors-v147.json", "catalog.json"];
if (process.env.RULES !== "0" && !need.every((f) => existsSync(here(`${DIR}/${f}`)))) {
  console.log(`no ${DIR}/${need.find((f) => !existsSync(here(`${DIR}/${f}`)))}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors-gifts.test.ts lib/town/db-vectors-swarm.test.ts\` in the repo first`);
  process.exit(2);
}
const read = (name) => JSON.parse(readFileSync(here(`${DIR}/${name}`), "utf8"));
// (`fam_by`: what a familiar's number is. The three familiars' games are the page's own, and no rule here reads it.)
const vectors = process.env.RULES === "0" ? [] : read("vectors-gifts.json").filter((v) => v.fn !== "fam_by");
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
// (as town-bench.mjs replays them: by number, but v130 after v131, as it ran; v136 is the party finder's; v148 was never written)
const numbers = Array.from({ length: 151 - 103 }, (_, i) => 104 + i).filter((n) => n !== 130 && n !== 136);
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
const UNTOUCHED = ["town.wearing", "town.charm_by", "town.gift_take", "town.charms_wear", "town.eased", "town.gloved", "public.town_gift_take", "public.town_charms_wear",
  "town.strike_window", "town.tend", "town.see", "town.deed_for", "town.water", "town.hoe", "town.owner_of", "town.spend", "town.stamina_of", "town.purse_of", "town.answer", "town.keep_purse", "town.note",
  "public.town_tend", "public.town_cast", "public.town_strike", "town.work_told", "town.work_rank", "public.town_work", "public.town_title_wear"];
const beforeText = Object.fromEntries(await Promise.all(UNTOUCHED.map(async (name) => [name, await textOf(name)])));
// a member at the forest's second rank and the insects' first, and nothing of the farm's; a purse each, as the game makes one
for (const who of [U.m1, U.m2]) await t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh()) on conflict (member_id) do nothing`, [who]);
await t.sql(`insert into public.town_work (member_id, line, kept) values ($1, 'forest', town.work_new() || '{"points": 160}'::jsonb), ($1, 'insects', town.work_new() || '{"points": 60}'::jsonb),
  ($1, 'farming', town.work_new() || '{"points": 60}'::jsonb) on conflict (member_id, line) do update set kept = excluded.kept`, [U.m1]);
// (and one who took and wore gifts before the file)
await t.sql(`update public.town_purses set doc = doc || '{"gifts": {"had": ["charmFloat", "charmGloves"], "charms": ["charmGloves", "charmFloat"], "owed": 0.5}}'::jsonb where member_id = $1`, [U.m2]);
const was = {
  answer: await one(`select town.work_answer($1) as a`, [U.m1]).then((r) => r.a),
  row: (await one(`select data from public.town_catalog where key = 'gifts'`)).data,
  kept: (await one(`select town.gifts_of(doc) as g from public.town_purses where member_id = $1`, [U.m2])).g,
  early: await call(U.m1, "town_gift_take", "forest", 2),
};

await t.runTwice(FILE, "v152");

/* ── the catalog ── */
t.section("the catalog's row");
const row = (await one(`select data, updated_at > now() - interval '1 hour' as fresh from public.town_catalog where key = 'gifts'`));
const kinds = Object.values(row.data.gifts).map((g) => g.kind);
t.check("the gifts row is written over as the code has it: nine gifts, three of them familiars, each with the rank that gives it and its number, and what is counted",
  same(row.data, CODE.gifts) && same(row.data.uses, { famGnome: { n: 10, per: "meal" } }) && row.fresh === true && kinds.length === 9 && kinds.filter((k) => k === "familiar").length === 3 && row.data.gifts.famGnome.by === 10 && row.data.gifts.famSquirrel.rank === 2, row);
t.check("the six charms in it are as they were, and the places for them", same(Object.fromEntries(Object.entries(row.data.gifts).filter(([, g]) => g.kind === "charm")), was.row.gifts) && row.data.slots === was.row.slots && Object.keys(was.row.gifts).length === 6, was.row);
const others = await one(`select count(*)::int as n from public.town_catalog where key <> 'gifts' and updated_at > now() - interval '1 hour'`);
t.check("no other row of the catalog is touched", others.n === 0, others);

/* ── written again, and nothing else moved ── */
t.section("two functions written again, each as it last ran but for the lines meant");
for (const [mark, [n, name]] of Object.entries(AGAIN)) {
  const built = MADE[mark](), inFile = words(FILE, name);
  t.check(`${name} is v${n}'s but for the lines meant`, inFile === built, inFile === null ? "not in the file" : "the file's text is not the built one");
}
const moved = [];
for (const name of UNTOUCHED) if ((await textOf(name)) !== beforeText[name] || !beforeText[name]) moved.push(name);
t.check(`nothing else of the gifts', the farm's, the deck's or the lines' has moved (${UNTOUCHED.length} functions)`, moved.length === 0, moved);
const now = await one(`select town.work_answer($1) as a`, [U.m1]).then((r) => r.a);
t.check("the lines' answer says which gifts are given, the nine by name, and is otherwise as it was",
  !("gives" in was.answer) && same(now.gives, Object.keys(CODE.gifts.gifts).sort()) && now.gives.length === 9 && now.gifting === true && same({ ...now, gives: undefined, now: 0 }, { ...was.answer, now: 0 }), { was: Object.keys(was.answer), now });
const kept = (await one(`select town.gifts_of(doc) as g, doc->'gifts' as raw from public.town_purses where member_id = $1`, [U.m2]));
t.check("a purse from before the file keeps what it had, wore and owed, and no familiar follows it", same(kept.g, { ...was.kept, familiar: null, used: {} }) && same(was.kept, { had: ["charmFloat", "charmGloves"], charms: ["charmGloves", "charmFloat"], owed: 0.5 })
  && !("familiar" in kept.raw), kept);
t.check("(before the file the forest's second rank gave nothing)", was.early?.ok === false && was.early.why === "none", was.early);

/* ── the rules ── */
const CALL = {
  gifts_of: "town.gifts_of($1::jsonb)", wearing: "to_jsonb(town.wearing($1::jsonb, $2::text))", charm_by: "to_jsonb(town.charm_by($1::jsonb, $2::text, $3::float8))",
  familiar_wear: "town.familiar_wear($1::jsonb, $2::text)",
  gift_works: "to_jsonb(town.gift_works($1::jsonb, $2::text))", used_of: "to_jsonb(town.used_of($1::jsonb, $2::text, $3::bigint))", gift_use: "town.gift_use($1::jsonb, $2::text, $3::bigint)",
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
  t.check("every rule was asked", ["gifts_of", "wearing", "charm_by", "familiar_wear", "gift_works", "used_of", "gift_use", "gift_take", "charms_wear", "eased", "gloved", "strike_window", "tend"].every((fn) => tally.has(fn)), [...tally.keys()]);
  // (no hour counted and no rain: the sky the farm's cases under it were made with)
  if ((await one(`select to_regclass('public.town_swarms') is not null as there`)).there) await t.sql(`delete from public.town_swarms where true`);
  await ask(FARM, "the farm's own cases under a clear sky, with no gift in any purse: as they were", "the farm's, ");
}

/* ── through the functions a member calls ── */
t.section("a familiar taken, called, changed and sent to rest");
const gifts = async (who) => (await purseOf(who)).gifts;
let did = await call(U.m1, "town_gift_take", "farming", 2);
t.check("a familiar of a rank not reached is refused, and nothing is kept or written down", did?.ok === false && did.why === "rank" && !("gifts" in (await purseOf(U.m1))) && (await deeds("gift")).length === 0, did);
did = await call(U.m1, "town_gift_take", "forest", 2);
t.check("a familiar of a rank reached is taken as a charm is: named, kept in the purse, in no slot of the bag, and following nobody yet", did?.ok === true && did.gift === "famSquirrel"
  && same(did.purse?.gifts, { had: ["famSquirrel"], charms: [], owed: 0, familiar: null, used: {} }) && same(await gifts(U.m1), { had: ["famSquirrel"], charms: [], owed: 0, familiar: null, used: {} }) && (await purseOf(U.m1)).bag.every((s) => s === null), did);
t.check("…and written down: which, of which line and rank", same((await deeds("gift")).map((d) => [d.member_id, d.thing, d.doc]), [[U.m1, "famSquirrel", { line: "forest", rank: 2 }]]), await deeds("gift"));
did = await call(U.m1, "town_familiar_wear", "famSquirrel");
t.check("a familiar had is called: it follows, kept and told back, and written down", did?.ok === true && did.purse?.gifts?.familiar === "famSquirrel" && (await gifts(U.m1)).familiar === "famSquirrel"
  && same((await deeds("familiar")).map((d) => [d.member_id, d.thing, d.n]), [[U.m1, "famSquirrel", 1]]), did);
// (the lamp and the net, to try a charm as a familiar, and that taking and wearing leave the familiar where it is)
await call(U.m1, "town_gift_take", "forest", 1);
await call(U.m1, "town_gift_take", "insects", 1);
for (const [id, about] of [["famGnome", "one not had"], ["charmLamp", "a charm"], ["noSuchGift", "what is no gift"], ["", "an empty name"]]) {
  did = await call(U.m1, "town_familiar_wear", id);
  t.check(`${about} is refused as a familiar, and the one that follows stays`, did?.ok === false && did.why === "none" && (await gifts(U.m1)).familiar === "famSquirrel" && (await deeds("familiar")).length === 1, did);
}
did = await call(U.m1, "town_charms_wear", ["charmLamp", "charmNet"]);
t.check("charms put on, and gifts taken, leave the familiar following", did?.ok === true && same(await gifts(U.m1), { had: ["famSquirrel", "charmLamp", "charmNet"], charms: ["charmLamp", "charmNet"], owed: 0, familiar: "famSquirrel", used: {} }), await gifts(U.m1));
did = await call(U.m1, "town_charms_wear", ["famSquirrel"]);
t.check("a familiar is no charm: it takes no place of theirs", did?.ok === false && did.why === "none" && same((await gifts(U.m1)).charms, ["charmLamp", "charmNet"]), did);
// (the insects' second rank reached: another familiar, called in the first one's place)
await t.sql(`update public.town_work set kept = kept || '{"points": 160}'::jsonb where member_id = $1 and line = 'insects'`, [U.m1]);
await call(U.m1, "town_gift_take", "insects", 2);
did = await call(U.m1, "town_familiar_wear", "famButterfly");
t.check("another is called in its place: one follows at a time", did?.ok === true && (await gifts(U.m1)).familiar === "famButterfly" && same((await deeds("familiar")).map((d) => d.thing), ["famSquirrel", "famButterfly"]), await gifts(U.m1));
did = await call(U.m1, "town_familiar_wear", null);
t.check("and it is sent to rest: none follows, and that is written down too", did?.ok === true && did.purse?.gifts?.familiar === null && (await gifts(U.m1)).familiar === null
  && same((await deeds("familiar")).map((d) => [d.thing, d.n]), [["famSquirrel", 1], ["famButterfly", 1], [null, 0]]) && same((await gifts(U.m1)).had, ["famSquirrel", "charmLamp", "charmNet", "famButterfly"]), did);
const told = await call(U.m1, "town_work");
t.check("a member is told which gifts are given", told?.gifting === true && Array.isArray(told.gives) && told.gives.length === 9 && told.gives.includes("famGnome"), told?.gives);
const out = await call(U.unver, "town_familiar_wear", "famSquirrel"), out2 = await call(U.unver, "town_familiar_wear", null);
t.check("a familiar is a member's: nobody without a proved character calls one or sends one off", !!out?.error && !!out2?.error, { out, out2 });

t.section("a counted gift used: the gnome's weeding, ten plots to a meal's hours");
// (the farm's second rank reached: the gnome taken; it does nothing until it follows)
await t.sql(`update public.town_work set kept = kept || '{"points": 160}'::jsonb where member_id = $1 and line = 'farming'`, [U.m1]);
await call(U.m1, "town_gift_take", "farming", 2);
did = await call(U.m1, "town_gift_use", "famGnome");
t.check("a familiar that does not follow has nothing to use, and nothing is counted or written down", did?.ok === false && did.why === "none" && same((await gifts(U.m1)).used, {}) && (await deeds("gift_use")).length === 0, did);
await call(U.m1, "town_familiar_wear", "famGnome");
const lefts = [];
for (let i = 0; i < 10; i++) { did = await call(U.m1, "town_gift_use", "famGnome"); lefts.push(did?.ok ? did.left : did?.why); }
const stretch = (await one(`select town.stretch_of('meal', town.now_ms())::int as k, town.stretch_of('day', town.now_ms())::int as d, town.day_of(town.now_ms()) as day, town.meal_of(town.now_ms()) as meal`));
t.check("the gnome's weeding is used ten times in a meal's hours, each time told how many are left, and counted in the purse by those hours", same(lefts, [9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
  && same((await gifts(U.m1)).used, { famGnome: { k: stretch.k, n: 10 } }) && stretch.k === stretch.day * 3 + stretch.meal && stretch.d === stretch.day, { lefts, used: (await gifts(U.m1)).used, stretch });
t.check("…each written down, with how many were left", same((await deeds("gift_use")).map((d) => [d.member_id, d.thing, d.doc.left]), lefts.map((l) => [U.m1, "famGnome", l])), await deeds("gift_use"));
did = await call(U.m1, "town_gift_use", "famGnome");
t.check("an eleventh is refused: none is left to these hours, and nothing more is counted or written down", did?.ok === false && did.why === "spent" && (await gifts(U.m1)).used.famGnome.n === 10 && (await deeds("gift_use")).length === 10, did);
for (const [id, about] of [["famSquirrel", "a familiar that is not counted"], ["charmLamp", "a charm that is not counted"], ["noSuchGift", "what is no gift"]]) {
  did = await call(U.m1, "town_gift_use", id);
  t.check(`${about} has nothing to use`, did?.ok === false && did.why === "none" && (await deeds("gift_use")).length === 10, did);
}
// (the count is of these hours: the same purse asked in the next meal's hours and on the next day has all ten again)
const later = await one(`select town.used_of(p.doc, 'famGnome', town.now_ms()) as now, town.used_of(p.doc, 'famGnome', town.now_ms() + 12 * 3600000) as next, town.used_of(p.doc, 'famGnome', town.now_ms() + 24 * 3600000) as tomorrow,
  town.gift_use(p.doc, 'famGnome', town.now_ms() + 24 * 3600000)->>'left' as left from public.town_purses p where p.member_id = $1`, [U.m1]);
t.check("in the next meal's hours and on the next day all ten are there again", later.now === 10 && later.next === 0 && later.tomorrow === 0 && later.left === "9", later);
t.check("what is worn, what follows and what was taken are as they were through the counting", same({ ...(await gifts(U.m1)), used: 0 }, { had: ["famSquirrel", "charmLamp", "charmNet", "famButterfly", "famGnome"], charms: ["charmLamp", "charmNet"], owed: 0, familiar: "famGnome", used: 0 }), await gifts(U.m1));
const out3 = await call(U.unver, "town_gift_use", "famGnome");
t.check("a count is a member's: nobody without a proved character uses one", !!out3?.error, out3);

t.section("the farm's work with the gloves on leaves a familiar following");
await t.sql(`update public.town_purses set doc = doc || '{"gifts": {"had": ["charmGloves", "famGnome"], "charms": ["charmGloves"], "familiar": "famGnome"}}'::jsonb where member_id = $1`, [U.m2]);
const bed = await one(`select (data->'bedsAt'->0->>0)::int as x, (data->'bedsAt'->0->>1)::int as y from public.town_catalog where key = 'farming'`);
const plant = (x, y, by) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled',
  jsonb_build_object('by', $3::text, 'crop', 'cabbage', 'sown', town.now_ms() - 600000, 'boost', 0, 'watered', 0, 'fed', 0, 'guard', town.now_ms() + 365::bigint * 86400000, 'cured', 0, 'picked', 0, 'pickedAt', 0), town.now_ms())
  on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed`, [x, y, by]);
await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of($1::int, $2::int), $3, town.now_ms() - 3600000, 0) on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = 0`, [bed.x, bed.y, U.m1]);
for (const dx of [0, 1]) await plant(bed.x + dx, bed.y, U.m1);
await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('hand', 'can', 'bag', jsonb_build_array(jsonb_build_object('item', 'can', 'n', 1, 'water', 8)) || '[null, null, null, null, null, null, null, null, null]'::jsonb,
  'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 50)) where member_id = $1`, [U.m2]);
const left = async (who) => (await one(`select town.stamina_of(doc, town.now_ms()) as s from public.town_purses where member_id = $1`, [who])).s;
const paid = [];
for (const dx of [0, 1]) {
  const before = await left(U.m2);
  did = await call(U.m2, "town_tend", bed.x + dx, bed.y);
  if (!did?.ok) { t.check(`(the watering of plant ${dx + 1} is done)`, false, did); break; }
  paid.push(before - (await left(U.m2)));
}
t.check("two of somebody else's plants watered with the gloves on cost a point as before, and the gnome follows still", same(paid, [0, 1]) && same(await gifts(U.m2), { had: ["charmGloves", "famGnome"], charms: ["charmGloves"], owed: 0, familiar: "famGnome", used: {} }), { paid, gifts: await gifts(U.m2) });

/* ── closed, and who may run what ── */
t.section("closed, and who may run what");
const open = await one(`select count(*)::int as n, coalesce(string_agg(p.proname, ', '), '') as names from pg_proc p where p.pronamespace = 'town'::regnamespace
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("no rule of the town's can be run by a browser", open.n === 0, open);
const may = await one(`select has_function_privilege('authenticated', 'public.town_familiar_wear(text)', 'execute') as member, has_function_privilege('anon', 'public.town_familiar_wear(text)', 'execute') as anon,
  has_function_privilege('authenticated', 'public.town_gift_use(text)', 'execute') as use, has_function_privilege('anon', 'public.town_gift_use(text)', 'execute') as anon_use`);
t.check("a member may call a familiar, and nobody else", may.member === true && may.anon === false, may);
t.check("a member may use a counted gift, and nobody else", may.use === true && may.anon_use === false, may);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes without naming its rows", bare.length === 0, bare);

t.done();
