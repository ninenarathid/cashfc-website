/*
 * v159 (a table for the village's pots: an hour on the ground, then the cooking yard's feast table, then cleared
 * away; the table's own bowls) tried against the stand-in database as it is after the last file that ran
 * (stand-in.mjs's snapshot, loaded in a second, in memory: nothing is written anywhere).
 *
 *   FC_REPO=<the tree whose code is meant> node v159.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v159.test.mjs v159.mutations.mjs
 *
 * It reads the draft beside this file (`v159_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. What is held:
 *   · the six functions written again are the ones they replace, word for word, but for the lines of v159.lines.mjs;
 *     nothing else of the town's is written, dropped or given to anybody; the catalog's `cooking` row differs from
 *     what it was by `pots` and `feast` and is the code's;
 *   · the rules are the site's own (lib/town/cooking and lib/town/stamina are loaded here, repo-ts-town.mjs): the
 *     meals' clock, where a pot is at a moment, the yard's floor tile by tile, who reaches a pot, the table's bowl,
 *     and no bowl back from it;
 *   · the pots that stood about before it are tidied once and never again by running it again;
 *   · and by the functions a member calls, with the test's clock: the yard and the ground, how many, the hour, the
 *     table cleared, the table's bowl from sitting down to the last mouthful, a page from before, and who may.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { AGAIN, changed } from "./build-v159.mjs";
await import("./repo-ts-town.mjs");
const C = await import("@/lib/town/cooking");
const S = await import("@/lib/town/stamina");
const W = await import("@/lib/town/world");
const { catalogOf } = await import("@/lib/town/catalog");
const { newPurse, held, put, roomFor } = await import("@/lib/town/trade");

const [root] = process.argv.slice(2);
const beside = new URL("./v159_draft.sql", import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v159_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(159));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const MIN = 60_000, HOUR = 60 * MIN;
/** Noon in Bangkok: lunch's hours, so what comes to the table now is cleared at five the next morning. */
const NOON = Date.parse("2026-10-08T12:00:00+07:00");

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
// the test's clock in the place of the database's (before anything is compared: its text is not the file's to touch)
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${NOON});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
let clockIs = NOON;
const clock = async (ms) => { clockIs = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };

/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const pot = (dish, left) => ({ item: "potFull", n: 1, of: { dish, left } });
const bagOf = (...things) => [...things, ...Array(10).fill(null)].slice(0, 10);
/** A member's purse laid anew: this bag, a full gauge today, and whatever else. */
const lay = (who, bag, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), JSON.stringify(more)]);
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const potRows = async (where = "true") => rows(`select o.id::text as id, o.member_id as by, o.dish, o.helpings, o.x, o.y, o.tok, o.feast, o.set_at::float8 as set from public.town_pots o where ${where} order by o.id`);
const deeds = async (what, since = 0) => rows(`select d.id, d.member_id as by, d.what, d.thing, d.n::int as n, d.doc from public.town_deeds d where d.what = any($1) and d.id > $2 order by d.id`, [[].concat(what), since]);
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);
const holds = (bag, item) => (bag ?? []).filter((s) => s?.item === item).reduce((n, s) => n + s.n, 0);
/** (what a broken file does not answer is nothing, never a crash: the checks that follow then say FAIL) */
const potOf = (r) => r?.pot ?? { id: "0" };
const kitchen = async (who) => { const r = await call(who, "town_kitchen"); return Array.isArray(r?.pots) ? r : { pots: [], feast: null, error: r }; };

const WRITTEN = [...AGAIN.map(([, sig]) => sig), "town.pot_doc(bigint)", "town.reaches(jsonb, integer, integer)"];
const NEW = ["town.next_meal_at(bigint)", "town.feast_ends(bigint)", "town.pot_now(boolean, text, bigint, bigint)", "town.on_yard(integer, integer)", "town.pots_tidy(bigint)",
  "town.feast_eat(jsonb, jsonb, boolean, bigint)", "public.town_feast_eat(bigint, integer, integer, boolean)"];
const NAMES = [...WRITTEN, ...NEW].map((s) => s.slice(0, s.indexOf("(")));
/** Every function of the town's but those the file writes: its text, and who may call it. */
const texts = async () => rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and not (n.nspname || '.' || p.proname = any($1)) order by 1`, [NAMES]);
const defOf = async (sig) => (await one(`select pg_get_functiondef(to_regprocedure($1)) as d`, [sig]))?.d ?? null;
const kept = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c where c.key not in ('cooking', 'items')) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers`);

// two dishes eaten out of a bowl, the odd dish, and tiles: of the yard's floor, and of the town's ground well apart
const CK = (await one(`select town.cat('cooking') as c`)).c;
const ODD = CK.oddDish, [A, B] = CK.bowled.filter((d) => d !== ODD);
const TILE = W.KITCHEN.feast.tile, FLOOR = W.KITCHEN.floor;
const YARD = (i) => FLOOR.filter(([x, y]) => !(x === TILE[0] && y === TILE[1]))[i * 7 % (FLOOR.length - 1)];
const GROUND = (i) => [6 + 4 * (i % 12), 8 + 4 * Math.floor(i / 12)];
const MOST = { ground: C.COOKING.pots, table: C.COOKING.feast.pots }, HOUR_ON_GROUND = C.COOKING.feast.ground * MIN;

t.section("before it: pots stand where they were set, for good");
const OLD = Object.fromEntries(await Promise.all(WRITTEN.map(async (sig) => [sig, await defOf(sig)])));
const cookingWas = CK, itemsWas = (await one(`select town.cat('items') as c`)).c;
// (what stands about as the file runs: three dishes of one member's, one on a rattan table; two pots of the odd dish and a dish of another's; set down days ago)
const LONG_AGO = NOON - 3 * 24 * HOUR;
await t.sql(`insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at) values
  ($1, $3, 4, 10, 30, false, $6), ($1, $4, 2, 14, 30, true, $6), ($1, $3, 1, 18, 30, false, $6),
  ($2, $5, 3, 10, 40, false, $6), ($2, $5, 1, 14, 40, false, $6), ($2, $4, 5, 18, 40, false, $6)`, [U.m1, U.m2, A, B, ODD, LONG_AGO]);
const stoodBefore = await rows(`select o.id::text as id, o.member_id as by, o.dish, o.helpings from public.town_pots o order by o.id`);
await lay(U.guest, bagOf(pot(A, 3)));
const beforeDown = await call(U.m1, "town_kitchen");
t.check("a page is told the pots with no word of a table", Array.isArray(beforeDown?.pots) && beforeDown.pots.length === 6 && beforeDown.feast === undefined && beforeDown.pots.every((o) => o.set === undefined && o.feast === undefined), beforeDown?.pots?.[0]);
const textsWas = await texts(), keptWas = await kept(), deedsWas = await lastDeed();

t.section("where v158's pot is not there, it stops at its first line and says why");
await t.sql(`alter function town.begun(jsonb, text, bigint) rename to begun_away`);
const early = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where what it stands on is not there, it stops at its first line and says why", !!early && /v159 needs v158/.test(early)
  && (await one(`select count(*)::int as n from information_schema.columns c where c.table_name = 'town_pots' and c.column_name = 'feast'`)).n === 0, early);
await t.sql(`alter function town.begun_away(jsonb, text, bigint) rename to begun`);

t.section("v159, twice over");
await t.runTwice(FILE, "v159");
const cols = await rows(`select c.column_name as name, c.data_type as type, c.is_nullable as nullable, c.column_default as dflt from information_schema.columns c where c.table_schema = 'public' and c.table_name = 'town_pots' order by c.ordinal_position`);
t.check("the pots' table has one column more, `feast`, never null and false unless said", cols.length === 9 && same(cols.find((c) => c.name === "feast"), { name: "feast", type: "boolean", nullable: "NO", dflt: "false" }), cols.map((c) => c.name));
const idx = await rows(`select i.indexname as name, i.indexdef as def from pg_indexes i where i.schemaname = 'public' and i.tablename = 'town_pots' order by 1`);
t.check("one pot to a tile is the rule of pots on the ground alone: the old rule for every pot is gone", !idx.some((i) => i.name === "town_pots_x_y_key")
  && /UNIQUE INDEX town_pots_ground ON public\.town_pots USING btree \(x, y\) WHERE \(NOT feast\)/.test(idx.find((i) => i.name === "town_pots_ground")?.def ?? ""), idx);

t.section("the pots that stood about as it ran");
let stood = await potRows();
t.check("every pot of the odd dish that stood about is gone", !stood.some((o) => o.dish === ODD) && stood.length === 4, stood.map((o) => o.dish));
t.check("every dish that stood about is on the table: said to stand on the table's tile, on no rattan table, with the table's whole time before it",
  stood.every((o) => o.feast && o.x === TILE[0] && o.y === TILE[1] && o.tok === false && o.set === NOON), stood);
t.check("…each with its cook, its dish and its helpings as they were", same(stood.map(({ id, by, dish, helpings }) => ({ id, by, dish, helpings })), stoodBefore.filter((o) => o.dish !== ODD)), stood);
let gone = await deeds("pot_gone", deedsWas);
t.check("the odd pots are written down as gone, each once, in their cook's name, with what was left in them", gone.length === 2 && gone.every((d) => d.by === U.m2 && d.thing === ODD && d.doc.from === "ground")
  && same(gone.map((d) => d.n).sort(), [1, 3]), gone);

t.section("what the file wrote, and what it left alone");
const forms = await rows(`select p.oid::regprocedure::text as fn, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member,
  p.prosecdef as definer, p.proconfig::text as config from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_feast_eat', 'town_pot_down', 'town_pot_ladle', 'town_pot_take', 'town_kitchen') order by 1`);
t.check("the table's bowl is one function of four words, a member's to call and nobody's who is signed out, security definer with its search path set",
  same(forms.find((f) => f.fn.startsWith("town_feast_eat")), { fn: "town_feast_eat(bigint,integer,integer,boolean)", anon: false, member: true, definer: true, config: "{search_path=public}" }), forms);
t.check("the four of the pots are as many as they were, each a member's still and nobody's who is signed out", forms.length === 5 && forms.every((f) => f.anon === false && f.member === true && f.definer), forms.map((f) => f.fn));
for (const [mark, sig, lines] of AGAIN) {
  const now = await defOf(sig);
  t.check(`${mark} is the one it replaces, word for word, but for the lines meant`, !!OLD[sig] && now === changed(OLD[sig], mark, lines) && now !== OLD[sig], now?.slice(0, 200));
}
t.check("town.pot_doc and town.reaches are written anew", (await defOf("town.pot_doc(bigint)")) !== OLD["town.pot_doc(bigint)"] && (await defOf("town.reaches(jsonb, integer, integer)")) !== OLD["town.reaches(jsonb, integer, integer)"]);
const fresh = await Promise.all(NEW.map(async (sig) => [sig, await defOf(sig)]));
t.check("the seven new functions are there", fresh.every(([, d]) => !!d), fresh.filter(([, d]) => !d).map(([s]) => s));
t.check("no rule of the schema `town` is anybody's to call from a browser", (await one(`select count(*)::int as n from pg_proc p where p.pronamespace = 'town'::regnamespace
  and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`)).n === 0);
t.check("no other function of the town's is written, dropped, added or given to anybody else", same(await texts(), textsWas), (await texts()).length);
t.check("no table more, no policy, no trigger, no knob, and no catalog row but `cooking` and `items` is touched", same(await kept(), keptWas), await kept());
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0, await bareWrites((q) => t.sql(q).then((r) => r.rows)));
const cooking = (await one(`select town.cat('cooking') as c`)).c;
const differs = [...new Set([...Object.keys(cooking), ...Object.keys(cookingWas)])].filter((k) => !same(cooking[k], cookingWas[k])).sort();
t.check("the catalog's `cooking` row differs from what it was by `pots` and `feast`, and by nothing else", same(differs, ["feast", "pots"]), differs);
t.check("…and is the code's row, to the entry", same(cooking, JSON.parse(JSON.stringify(catalogOf().cooking))), differs);
t.check("…two on the ground, six on the table, sixty minutes, the tile between the tables, the yard's floor", cooking.pots === 2 && same(cooking.feast, { pots: 6, ground: 60, tile: TILE, floor: FLOOR }), { pots: cooking.pots, feast: { ...cooking.feast, floor: cooking.feast?.floor?.length } });

const items = (await one(`select town.cat('items') as c`)).c;
const itemsDiffer = Object.keys({ ...items, ...itemsWas }).filter((k) => !same(items[k], itemsWas[k]));
t.check("the catalog's `items` row differs from what it was by the bowl's stack alone: three to a slot where it was one", same(itemsDiffer, [CK.bowl]) && same(items[CK.bowl], { ...itemsWas[CK.bowl], stack: 3 }) && itemsWas[CK.bowl].stack === 1, itemsDiffer.slice(0, 5));
t.check("…and is the code's row, to the entry", same(items, JSON.parse(JSON.stringify(catalogOf().items))), Object.keys(items).length);

t.section("the rules are the site's own");
{
  // bowls three to a slot: what the bag's own rules answer, which no file wrote again, held to the code's with the row as it now is
  const empty = newPurse().bag, boots = (n) => Array.from({ length: n }, () => ({ item: "boot", n: 5 })), table = { id: "1", by: U.m1, dish: A, left: 9, at: TILE, feast: true, set: NOON };
  const bags = { "three in an empty bag": [empty, 3], "four": [empty, 4], "one onto two": [put(empty, CK.bowl, 2), 1], "two onto two": [put(empty, CK.bowl, 2), 2] };
  const offPut = [];
  for (const [name, [bag, n]] of Object.entries(bags)) {
    const got = (await one(`select town.put($1::jsonb, $2, $3) as b, town.room($1::jsonb, $2) as r`, [JSON.stringify(bag), CK.bowl, n]));
    if (!same(got.b, put(bag, CK.bowl, n)) || got.r !== roomFor(bag, CK.bowl)) offPut.push({ name, got, want: put(bag, CK.bowl, n) });
  }
  t.check("town.put and town.room lay bowls three to a slot, as the code does: three in one slot, a fourth in another, onto a slot that has room", offPut.length === 0
    && same(put(empty, CK.bowl, 4).filter(Boolean), [{ item: CK.bowl, n: 3 }, { item: CK.bowl, n: 1 }]), offPut[0]);
  const purses = {
    "three bowls, room": { ...newPurse(), bag: put(empty, CK.bowl, 3) },
    "two bowls, no slot to spare": { ...newPurse(), bag: [{ item: CK.bowl, n: 2 }, ...boots(empty.length - 1)] },
    "its last bowl, no slot to spare": { ...newPurse(), bag: [{ item: CK.bowl, n: 1 }, ...boots(empty.length - 1)] },
    "two bowls and a helping of it, no slot to spare": { ...newPurse(), bag: [{ item: CK.bowl, n: 2 }, { item: A, n: 1 }, ...boots(empty.length - 2)] },
  };
  const offLadle = [], whys = [];
  for (const [name, purse] of Object.entries(purses)) {
    const want = JSON.parse(JSON.stringify(C.ladle(purse, table))), got = (await one(`select town.ladle($1::jsonb, $2::jsonb) as r`, [JSON.stringify(purse), JSON.stringify(table)])).r;
    whys.push(got.ok ? "ok" : got.why);
    if (!same(want, got)) offLadle.push({ name, want, got });
  }
  t.check("town.ladle takes a bowl out of a slot of several as the code does: with room the helping lies elsewhere, with none the bag is full, and a slot's last bowl gives the helping its place", offLadle.length === 0
    && same(whys, ["ok", "full", "ok", "ok"]), offLadle[0] ?? whys);
  const owing = { ...newPurse(), bag: [null, ...boots(empty.length - 1)], owed: 3 };
  const back = (await one(`select town.bowls_back($1::jsonb, 1) as r`, [JSON.stringify(owing)])).r, wantBack = JSON.parse(JSON.stringify(S.bowlsBack(owing, 1)));
  t.check("town.bowls_back gives three bowls back into one free slot and owes the fourth, as the code does", same(back, wantBack) && same(back.bag[0], { item: CK.bowl, n: 3 }) && back.owed === 1, back);
}
{
  // the meals' clock, over three days, at odd minutes and on the stroke
  const moments = Array.from({ length: 73 }, (_, h) => [NOON - 30 * HOUR + h * HOUR, NOON - 30 * HOUR + h * HOUR + 7 * MIN + 13, NOON - 30 * HOUR + h * HOUR - 1]).flat();
  const got = await rows(`select m::float8 as at, town.next_meal_at(m)::float8 as next, town.feast_ends(m)::float8 as ends from unnest($1::bigint[]) m`, [moments]);
  const off = got.filter((r) => r.next !== S.nextMealAt(r.at) || r.ends !== C.feastEnds(r.at));
  t.check(`town.next_meal_at and town.feast_ends answer every moment as the code does (${got.length} moments, on the stroke of each meal among them)`, got.length === moments.length && off.length === 0, off.slice(0, 3));
}
{
  // where a pot is: on the table or not, a dish or the odd one, set at several hours of the day, asked from before its hour's end to past the table's
  const cases = [];
  for (const feast of [true, false]) for (const dish of [A, ODD]) for (const set of [NOON, NOON + 7 * HOUR + 3 * MIN, NOON + 16 * HOUR, NOON - 5 * HOUR]) {
    const ends = C.feastEnds(feast ? set : set + HOUR_ON_GROUND);
    for (const now of [set, set + 59 * MIN, set + HOUR_ON_GROUND - 1, set + HOUR_ON_GROUND, set + HOUR_ON_GROUND + 1, set + 5 * HOUR, ends - 1, ends, ends + HOUR, set + 40 * HOUR]) cases.push({ feast, dish, set, now });
  }
  const got = await rows(`select c.ord::int as i, town.pot_now((c.v->>'feast')::boolean, c.v->>'dish', (c.v->>'set')::bigint, (c.v->>'now')::bigint) as is_ from jsonb_array_elements($1::jsonb) with ordinality c(v, ord) order by c.ord`, [JSON.stringify(cases)]);
  const off = cases.map((c, i) => ({ c, want: C.potNow({ id: "", by: "", dish: c.dish, left: 1, at: [0, 0], set: c.set, ...(c.feast ? { feast: true } : {}) }, c.now), got: got[i].is_ })).filter((x) => !same(x.want, x.got));
  t.check(`town.pot_now says where a pot is, and until when, as the code does (${cases.length} cases)`, off.length === 0, off.slice(0, 3));
  const kinds = { ground: got.filter((g) => g.is_ && !g.is_.feast).length, table: got.filter((g) => g.is_?.feast).length, gone: got.filter((g) => !g.is_).length };
  t.check("…cases of each kind among them: on the ground, on the table, gone", kinds.ground > 10 && kinds.table > 10 && kinds.gone > 10, kinds);
}
{
  const got = await rows(`select x, y from generate_series(-2, 70) x, generate_series(-2, 70) y where town.on_yard(x, y)`);
  const want = new Set(FLOOR.map(([x, y]) => `${x},${y}`));
  t.check(`town.on_yard is the yard's floor tile by tile (${FLOOR.length} tiles of 5,329 asked), and no tile's mirror`, got.length === want.size && got.every((r) => want.has(`${r.x},${r.y}`))
    && got.every((r) => W.yardFloor(r.x, r.y)) && (await one(`select town.on_yard(null, 3) as a, town.on_yard(3, null) as b`)).a === false, got.length);
  const mirror = FLOOR.find(([x, y]) => !want.has(`${y},${x}`));
  t.check("…a tile that is a floor tile turned about, and is not of the floor, is not of it", !!mirror && (await one(`select town.on_yard($1, $2) as on_`, [mirror[1], mirror[0]])).on_ === false, mirror);
}
{
  const ground = { id: "1", by: U.m1, dish: A, left: 2, at: [20, 20] }, tok = { ...ground, tok: true }, table = { ...ground, at: TILE, feast: true };
  const tiles = [[20, 20], [21, 21], [22, 21], [23, 20], [20, 24], TILE, FLOOR[0], FLOOR.at(-1), [TILE[0] + 30, TILE[1]], [0, 0]];
  const cases = [ground, tok, table].flatMap((p) => tiles.map((at) => ({ p, at })));
  const got = await rows(`select town.reaches(c.v->'p', (c.v->'at'->>0)::int, (c.v->'at'->>1)::int) as r from jsonb_array_elements($1::jsonb) with ordinality c(v, ord) order by c.ord`, [JSON.stringify(cases)]);
  const off = cases.map((c, i) => ({ c, want: C.reaches(c.p, c.at, W.yardFloor(c.at[0], c.at[1])), got: got[i].r })).filter((x) => x.want !== x.got);
  t.check(`town.reaches is the code's: a pot on the ground from beside it, further from a rattan table, one on the table from the yard's floor (${cases.length} cases)`, off.length === 0
    && got.some((g) => g.r) && got.some((g) => !g.r), off.slice(0, 3));
  t.check("…and nobody who says no tile reaches any", (await one(`select town.reaches($1::jsonb, null, 3) as a, town.reaches($2::jsonb, null, null) as b`, [JSON.stringify(ground), JSON.stringify(table)])).a === false);
}
{
  // the table's bowl: purses that may and may not, pots that feed and do not
  const base = { ...newPurse(), stamina: { day: S.dayOf(NOON), left: 10 } };
  const onTable = { id: "7", by: U.m1, dish: A, left: 3, at: TILE, feast: true, set: NOON };
  const eating = C.feastEat(base, onTable, true, NOON).purse;
  let full = base;
  for (let i = 0; i < S.STAMINA.bowls; i++) full = S.chew(C.feastEat(full, onTable, true, NOON + i * 6 * MIN).purse, 0, NOON + i * 6 * MIN + S.STAMINA.minutes * MIN).purse;
  const cases = [
    { name: "sitting, hungry", purse: base, pot: onTable, seated: true, now: NOON },
    { name: "its last helping", purse: base, pot: { ...onTable, left: 1 }, seated: true, now: NOON },
    { name: "standing", purse: base, pot: onTable, seated: false, now: NOON },
    { name: "nothing said of sitting", purse: base, pot: onTable, seated: null, now: NOON },
    { name: "at a meal already", purse: eating, pot: onTable, seated: true, now: NOON + MIN },
    { name: "this meal's helpings had", purse: full, pot: onTable, seated: true, now: NOON + 30 * MIN },
    { name: "…and the next meal's hours", purse: full, pot: onTable, seated: true, now: NOON + 6 * HOUR },
    { name: "a pot on the ground", purse: base, pot: { ...onTable, feast: undefined, at: [20, 20] }, seated: true, now: NOON },
    { name: "an empty pot", purse: base, pot: { ...onTable, left: 0 }, seated: true, now: NOON },
    { name: "the other dish", purse: base, pot: { ...onTable, dish: B }, seated: true, now: NOON + 9 * HOUR },
  ];
  const off = [];
  for (const c of cases) {
    const want = JSON.parse(JSON.stringify(C.feastEat(c.purse, c.pot, !!c.seated, c.now)));
    const got = (await one(`select town.feast_eat($1::jsonb, $2::jsonb, $3::boolean, $4::bigint) as r`, [JSON.stringify(c.purse), JSON.stringify(c.pot), c.seated, c.now])).r;
    if (!same(want, got)) off.push({ name: c.name, want, got });
  }
  t.check(`town.feast_eat is the code's, answer for answer (${cases.length} cases: fed, its last helping, standing, at a meal, three had, the next meal, a pot on the ground, an empty one)`, off.length === 0, off[0]);
  // and no bowl back: the same helping out of the table's bowl and out of one's own, eaten up and left half eaten
  const own = { ...eating, eating: { ...eating.eating, lent: undefined } }, END = NOON + S.STAMINA.minutes * MIN, bad = [];
  for (const [name, purse] of [["the table's bowl", eating], ["a bowl of one's own", JSON.parse(JSON.stringify(own))]]) {
    const ate = (await one(`select town.chew($1::jsonb, 0, $2::bigint) as r`, [JSON.stringify(purse), END])).r, wantAte = S.chew(purse, 0, END);
    const up = (await one(`select town.get_up($1::jsonb, 2, $2::bigint) as r`, [JSON.stringify(purse), NOON + 2 * MIN])).r, wantUp = S.getUp(purse, 2, NOON + 2 * MIN);
    const mid = (await one(`select town.chew($1::jsonb, 1, $2::bigint) as r`, [JSON.stringify(purse), NOON + 2 * MIN])).r, wantMid = S.chew(purse, 1, NOON + 2 * MIN);
    for (const [what, got, want] of [["eaten up", ate.purse, wantAte.purse], ["left half eaten", up, wantUp], ["at its second minute", mid.purse, wantMid.purse]]) {
      if (holds(got.bag, CK.bowl) !== held(want.bag, CK.bowl) || (got.owed ?? 0) !== (want.owed ?? 0) || Math.abs(got.stamina.left - want.stamina.left) > 1e-9 || (got.eating === null) !== (want.eating === null)) bad.push({ name, what, got: [holds(got.bag, CK.bowl), got.owed, got.stamina.left], want: [held(want.bag, CK.bowl), want.owed, want.stamina.left] });
    }
    const bowls = [holds(ate.purse.bag, CK.bowl), holds(up.bag, CK.bowl), holds(mid.purse.bag, CK.bowl)];
    if (!same(bowls, name === "the table's bowl" ? [0, 0, 0] : [1, 1, 0])) bad.push({ name, bowls });
  }
  t.check("town.chew and town.get_up give no bowl back for a helping out of the table's bowl, and one for a helping out of one's own, as the code does: eaten up, left half eaten, and none while it is still being eaten", bad.length === 0, bad[0]);
}

t.section("running it again changes nothing that stands");
await clock(NOON + 10 * MIN);
await lay(U.guest, bagOf(pot(A, 3), pot(ODD, 2)));
const g0 = GROUND(0), g1 = GROUND(1);
let did = await call(U.guest, "town_pot_down", { p_x: g0[0], p_y: g0[1], p_slot: 0 });
t.check("a dish set down on the ground stands there, with the moment it was set and what its cook is called", did?.ok === true && same(did.pot, { id: did.pot?.id, by: U.guest, dish: A, left: 3, at: g0, set: NOON + 10 * MIN, name: did.pot?.name }) && typeof did.pot.name === "string", did?.pot ?? did);
did = await call(U.guest, "town_pot_down", { p_x: g1[0], p_y: g1[1], p_slot: 1 });
t.check("…and so does the odd dish", did?.ok === true && did.pot.dish === ODD && did.pot.feast === undefined && same(did.pot.at, g1), did?.pot ?? did);
const stoodThen = await potRows(), deedsThen = await lastDeed();
await clock(NOON + 20 * MIN);
await t.db.exec(FILE);
t.check("run a third time, ten minutes on: every pot is where it was, with the moment it had (nothing is tidied twice)", same(await potRows(), stoodThen) && (await deeds("pot_gone", deedsThen)).length === 0, await potRows());

t.section("the yard and the ground");
const y0 = YARD(0), y1 = YARD(1), y2 = YARD(2);
await lay(U.m1, bagOf(pot(A, 4), { item: "tok", n: 1 }, pot(ODD, 2), pot(B, 5)));
let mark = await lastDeed();
did = await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 0 });
t.check("a dish set down on the yard's floor is on the table: said to stand on the table's tile, with the moment, and on no rattan table though one is carried",
  did?.ok === true && same(did.pot, { id: did.pot?.id, by: U.m1, dish: A, left: 4, at: TILE, set: clockIs, feast: true, name: "Member One" }), did?.pot ?? did);
t.check("…out of the bag, and written down with the tile stood on and that it went onto the table", (await purseOf(U.m1)).bag[0] === null
  && same((await deeds("pot_down", mark)).map((d) => [d.by, d.thing, d.n, d.doc.tile, d.doc.feast]), [[U.m1, A, 4, y0, true]]), await deeds("pot_down", mark));
did = await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 2 });
t.check("the odd dish set down in the yard stands on the ground where it was set, never on the table", did?.ok === true && did.pot.dish === ODD && did.pot.feast === undefined && same(did.pot.at, y0) && did.pot.tok === true
  && (await potRows(`o.id = ${did.pot.id}`))[0]?.feast === false, did?.pot ?? did);
did = await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 3 });
t.check("a dish goes onto the table from the very tile a pot stands on: what is on the table is in nobody's way", did?.ok === true && did.pot.feast === true && did.pot.dish === B, did);
await lay(U.m2, bagOf(pot(ODD, 1), pot(A, 2)));
did = await call(U.m2, "town_pot_down", { p_x: y0[0] + (W.yardFloor(y0[0] + 1, y0[1]) ? 1 : -1), p_y: y0[1], p_slot: 0 });
t.check("but a pot for the ground is refused beside one that stands on the ground, in the yard as anywhere: taken", did?.ok === false && did.why === "taken" && (await purseOf(U.m2)).bag[0]?.item === "potFull", did);
did = await call(U.m2, "town_pot_down", { p_x: TILE[0], p_y: TILE[1], p_slot: 0 });
t.check("…and not on the tile the table's pots are said to stand on: they are not on the ground", did?.ok === true && did.pot.dish === ODD && same(did.pot.at, TILE) && did.pot.feast === undefined, did);
did = await call(U.m2, "town_pot_down", { p_x: 500, p_y: 8, p_slot: 1 });
t.check("off the map, refused as ever: none", did?.ok === false && did.why === "none", did);
did = await call(U.m2, "town_pot_down", { p_x: y1[0], p_y: y1[1], p_slot: 7 });
t.check("a slot that is no pot's, refused as ever: none", did?.ok === false && did.why === "none", did);

t.section("how many one member leaves");
await t.sql(`delete from public.town_pots o where o.member_id = $1`, [U.admin]);
await lay(U.admin, bagOf(...Array.from({ length: 10 }, () => pot(A, 2))));
const downs = [];
for (let i = 0; i < MOST.ground + 1; i++) downs.push(await call(U.admin, "town_pot_down", { p_x: GROUND(4 + i)[0], p_y: GROUND(4 + i)[1] }));
t.check(`${MOST.ground} on the ground, and the next is refused: many`, downs.slice(0, MOST.ground).every((d) => d?.ok === true && d.pot.feast === undefined) && downs[MOST.ground]?.ok === false && downs[MOST.ground].why === "many", downs.map((d) => d?.why ?? "ok"));
const ups = [];
for (let i = 0; i < MOST.table + 1; i++) ups.push(await call(U.admin, "town_pot_down", { p_x: y2[0], p_y: y2[1] }));
t.check(`…and ${MOST.table} on the table beside them, counted by themselves, and the next refused: many`, ups.slice(0, MOST.table).every((d) => d?.ok === true && d.pot.feast === true) && ups[MOST.table]?.ok === false && ups[MOST.table].why === "many", ups.map((d) => d?.why ?? "ok"));
t.check("…nothing set down that was refused: the bag has the two pots left", holds((await purseOf(U.admin)).bag, "potFull") === 10 - MOST.ground - MOST.table
  && (await potRows(`o.member_id = '${U.admin}'`)).length === MOST.ground + MOST.table, holds((await purseOf(U.admin)).bag, "potFull"));
await lay(U.guest, bagOf(pot(B, 1)));
did = await call(U.guest, "town_pot_down", { p_x: y2[0], p_y: y2[1] });
t.check("somebody else's are no count of mine", did?.ok === true && did.pot.feast === true, did);

t.section("a page from before");
await t.sql(`delete from public.town_pots o where o.member_id = $1`, [U.m2]);
await lay(U.m2, bagOf({ item: "salt", n: 1 }, pot(B, 2), pot(A, 4)));
did = await call(U.m2, "town_pot_down", { p_x: GROUND(8)[0], p_y: GROUND(8)[1] });
t.check("asked with two words, the first pot of the bag is set down where its member stands, as before the file", did?.ok === true && did.pot.dish === B && same(did.pot.at, GROUND(8)) && same((await purseOf(U.m2)).bag.slice(0, 3), [{ item: "salt", n: 1 }, null, pot(A, 4)]), did?.pot ?? did);
const told = await call(U.m2, "town_kitchen");
t.check("every pot is told with a tile to draw it on, as a page from before draws them: those on the table on the table's tile", Array.isArray(told?.pots) && told.pots.length === (await potRows()).length
  && told.pots.every((o) => Array.isArray(o.at) && o.at.length === 2 && o.at.every(Number.isInteger) && (!o.feast || same(o.at, TILE))), told?.pots?.find((o) => !Array.isArray(o.at)));
t.check("…and the table is told with them: how many, how long on the ground, its tile (not the floor's every tile)", same(told.feast, { pots: 6, ground: 60, tile: TILE }), told?.feast);

t.section("ladling into a bowl of one's own");
await t.sql(`delete from public.town_pots`);
await lay(U.m1, bagOf(pot(A, 3), pot(B, 2)));
const onTable = potOf(await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 0 })), onGround = potOf(await call(U.m1, "town_pot_down", { p_x: g0[0], p_y: g0[1], p_slot: 1 }));
await lay(U.m2, bagOf({ item: CK.bowl, n: 2 }));
mark = await lastDeed();
did = await call(U.m2, "town_pot_ladle", { p_id: onTable.id, p_x: GROUND(3)[0], p_y: GROUND(3)[1] });
t.check("a pot on the table is not reached from outside the yard: none", did?.ok === false && did.why === "none", did);
did = await call(U.m2, "town_pot_ladle", { p_id: onTable.id, p_x: TILE[0], p_y: TILE[1] + 30 });
t.check("…nor from far off though the tile said is in a line with the table's", did?.ok === false && did.why === "none", did);
did = await call(U.m2, "town_pot_ladle", { p_id: onTable.id, p_x: y2[0], p_y: y2[1] });
t.check("from anywhere on the yard's floor it is: a bowl of one's own for a helping, as from any pot", did?.ok === true && did.pot.left === 2 && did.pot.feast === true && holds((await purseOf(U.m2)).bag, A) === 1 && holds((await purseOf(U.m2)).bag, CK.bowl) === 1, did?.pot ?? did);
t.check("…written down as ladled from its cook's pot, out of no bowl of the table's", same((await deeds("ladle", mark)).map((d) => [d.by, d.thing, d.doc.whose, d.doc.bowl ?? null]), [[U.m2, A, U.m1, null]]), await deeds("ladle", mark));
did = await call(U.m2, "town_pot_ladle", { p_id: onGround.id, p_x: g0[0] + 1, p_y: g0[1] });
t.check("a pot on the ground is ladled from beside it, as ever", did?.ok === true && did.pot.left === 1 && did.pot.feast === undefined, did?.pot ?? did);
did = await call(U.m2, "town_pot_ladle", { p_id: onGround.id, p_x: y2[0], p_y: y2[1] });
t.check("…and not from the yard", did?.ok === false && did.why === "none", did);

t.section("the table's own bowl");
await lay(U.guest, bagOf({ item: "salt", n: 1 }), { stamina: { day: 0, left: 0 } });
await t.sql(`update public.town_purses set doc = doc || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 10)) where member_id = $1`, [U.guest]);
mark = await lastDeed();
did = await call(U.guest, "town_feast_eat", { p_id: onTable.id, p_x: y1[0], p_y: y1[1], p_seated: false });
t.check("standing, nobody is fed: stand", did?.ok === false && did.why === "stand", did);
did = await call(U.guest, "town_feast_eat", { p_id: onTable.id, p_x: GROUND(3)[0], p_y: GROUND(3)[1], p_seated: true });
t.check("outside the yard, nobody is fed: none", did?.ok === false && did.why === "none", did);
did = await call(U.guest, "town_feast_eat", { p_id: onGround.id, p_x: g0[0], p_y: g0[1], p_seated: true });
t.check("a pot on the ground has no bowls of its own: none", did?.ok === false && did.why === "none", did);
did = await call(U.guest, "town_feast_eat", { p_id: "999999", p_x: y1[0], p_y: y1[1], p_seated: true });
t.check("a pot that is not there: gone", did?.ok === false && did.why === "gone", did);
t.check("…and nothing came of any of the four: no deed, the purse as it was, the pots as they were", (await deeds(["ladle", "eat"], mark)).length === 0 && (await purseOf(U.guest)).eating == null
  && same((await potRows()).map((o) => o.helpings), [2, 1]), await potRows());
const startedAt = clockIs;
did = await call(U.guest, "town_feast_eat", { p_id: onTable.id, p_x: y1[0], p_y: y1[1], p_seated: true });
let mine = await purseOf(U.guest);
t.check("sitting down in the yard with no bowl at all, a helping of a pot on the table is begun at once", did?.ok === true && did.dish === A && did.pot.left === 1
  && same(mine.eating, { dish: A, meal: 1, from: startedAt, till: startedAt, got: 0, lent: true }) && same(mine.meals?.bowls, [0, 1, 0]), did?.pot ?? did);
t.check("…nothing of it is in the bag, and the answer has the purse as it stands", same(mine.bag, bagOf({ item: "salt", n: 1 })) && !!did?.purse?.eating && same(did.purse.eating, mine.eating) && (await potRows(`o.id = ${onTable.id}`))[0]?.helpings === 1, mine.bag);
t.check("…written down as the two deeds it is: ladled from its cook's pot out of the table's bowl, and eaten",
  same((await deeds(["ladle", "eat"], mark)).map((d) => [d.by, d.what, d.thing, d.doc.whose ?? null, d.doc.bowl]), [[U.guest, "ladle", A, U.m1, "table"], [U.guest, "eat", A, null, "table"]]), await deeds(["ladle", "eat"], mark));
did = await call(U.guest, "town_feast_eat", { p_id: onTable.id, p_x: y1[0], p_y: y1[1], p_seated: true });
t.check("at a meal already, nobody begins another: meal", did?.ok === false && did.why === "meal" && (await potRows(`o.id = ${onTable.id}`))[0]?.helpings === 1, did);
await clock(startedAt + S.STAMINA.minutes * MIN);
did = await call(U.guest, "town_chew", { p_company: 0 });
mine = await purseOf(U.guest);
t.check("five minutes on it is eaten up: its stamina had, and no bowl in the bag nor owed", did?.ok === true && did.done === true && mine.eating === null && holds(mine.bag, CK.bowl) === 0 && mine.owed === undefined
  && Math.abs((mine.stamina?.left ?? -1) - Math.min(100, 10 + catalogOf().dishes[A].stamina)) < 1e-9, { done: did?.done, stamina: mine.stamina, owed: mine.owed });
did = await call(U.guest, "town_feast_eat", { p_id: onTable.id, p_x: y1[0], p_y: y1[1], p_seated: true });
t.check("the pot's last helping out, the pot is gone from the table", did?.ok === true && did.pot === null && (await potRows(`o.id = ${onTable.id}`)).length === 0, did?.pot);
await clock(clockIs + 2 * MIN);
did = await call(U.guest, "town_get_up", { p_company: 0 });
mine = await purseOf(U.guest);
t.check("left half eaten, no bowl either", mine.eating === null && holds(mine.bag, CK.bowl) === 0 && mine.owed === undefined && same(mine.meals?.bowls, [0, 2, 0]), { eating: mine.eating, owed: mine.owed, bowls: mine.meals?.bowls });
// (the same dish out of a bowl of one's own, eaten up: the bowl is back, as it always was)
await call(U.m2, "town_sit", { p_slot: (await purseOf(U.m2)).bag.findIndex((s) => s?.item === A), p_seated: true });
await clock(clockIs + S.STAMINA.minutes * MIN);
await call(U.m2, "town_chew", { p_company: 0 });
// (two bowls took two helpings, one off the table and one off the ground: the one eaten gives its bowl back, the other still holds its helping)
t.check("…while a helping ladled into a bowl of one's own gives its bowl back when it is eaten, as it always did", (await purseOf(U.m2)).eating === null && holds((await purseOf(U.m2)).bag, CK.bowl) === 1
  && holds((await purseOf(U.m2)).bag, A) === 0 && holds((await purseOf(U.m2)).bag, B) === 1, (await purseOf(U.m2)).bag);
// three helpings to a meal's hours, the table's among them
await lay(U.m1, bagOf(...Array.from({ length: 4 }, () => pot(A, 9))));
const big = potOf(await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 0 }));
await lay(U.guest, bagOf());
const had = [];
for (let i = 0; i < S.STAMINA.bowls + 1; i++) {
  had.push(await call(U.guest, "town_feast_eat", { p_id: big.id, p_x: y1[0], p_y: y1[1], p_seated: true }));
  await clock(clockIs + S.STAMINA.minutes * MIN + 1000);
  await call(U.guest, "town_chew", { p_company: 0 });
}
t.check(`${S.STAMINA.bowls} helpings in a meal's hours out of the table's bowls, and the next refused: meal`, had.slice(0, S.STAMINA.bowls).every((d) => d?.ok === true) && had[S.STAMINA.bowls]?.ok === false && had[S.STAMINA.bowls].why === "meal"
  && (await potRows(`o.id = ${big.id}`))[0]?.helpings === 9 - S.STAMINA.bowls, had.map((d) => d?.why ?? "ok"));

t.section("its cook takes a pot back");
await lay(U.m2, bagOf());
did = await call(U.m2, "town_pot_take", { p_id: big.id, p_x: y1[0], p_y: y1[1] });
t.check("nobody else's to take", did?.ok === false && did.why === "none", did);
await lay(U.m1, bagOf());
did = await call(U.m1, "town_pot_take", { p_id: big.id, p_x: GROUND(3)[0], p_y: GROUND(3)[1] });
t.check("not from outside the yard", did?.ok === false && did.why === "none", did);
did = await call(U.m1, "town_pot_take", { p_id: big.id, p_x: y1[0], p_y: y1[1] });
t.check("its cook, on the yard's floor, has it back in the bag with what is left in it", did?.ok === true && same((await purseOf(U.m1)).bag[0], pot(A, 9 - S.STAMINA.bowls)) && (await potRows(`o.id = ${big.id}`)).length === 0, did);

t.section("an hour on the ground, then the table, then cleared away");
await t.sql(`delete from public.town_pots`);
const T0 = NOON + 24 * HOUR;   // (noon the next day: a new day's meals)
await clock(T0);
await lay(U.m1, bagOf(pot(A, 3), pot(ODD, 2), { item: "tok", n: 1 }));
const picnic = potOf(await call(U.m1, "town_pot_down", { p_x: g0[0], p_y: g0[1], p_slot: 0 })), junk = potOf(await call(U.m1, "town_pot_down", { p_x: g1[0], p_y: g1[1], p_slot: 1 }));
await clock(T0 + 5 * MIN);
await lay(U.m2, bagOf(pot(B, 6), { item: CK.bowl, n: 3 }));
const direct = potOf(await call(U.m2, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 0 }));
mark = await lastDeed();
await clock(T0 + HOUR_ON_GROUND - 1);
let k = await kitchen(U.guest);
t.check("a millisecond short of its hour, a pot on the ground is told where it was set, on its rattan table", same(k.pots.map((o) => [o.id, o.at, !!o.feast, !!o.tok, o.set]), [[picnic.id, g0, false, true, T0], [junk.id, g1, false, true, T0], [direct.id, TILE, true, false, T0 + 5 * MIN]]), k.pots);
await clock(T0 + HOUR_ON_GROUND);
k = await kitchen(U.guest);
t.check("as its hour ends a dish is on the table: told on the table's tile, off its rattan table, as if set there at that moment", same(k.pots.map((o) => [o.id, o.at, !!o.feast, !!o.tok, o.set]), [[picnic.id, TILE, true, false, T0 + HOUR_ON_GROUND], [direct.id, TILE, true, false, T0 + 5 * MIN]]), k.pots);
t.check("…its helpings and its cook as they were", same(k.pots[0], { id: picnic.id, by: U.m1, dish: A, left: 3, at: TILE, feast: true, set: T0 + HOUR_ON_GROUND, name: "Member One" }), k.pots[0]);
gone = await deeds("pot_gone", mark);
t.check("…and the odd dish is gone with its hour: written down once, in its cook's name, with what was left, off the ground", same(gone.map((d) => [d.by, d.thing, d.n, d.doc.from, String(d.doc.pot)]), [[U.m1, ODD, 2, "ground", junk.id]]), gone);
await call(U.m1, "town_kitchen"); await call(U.m2, "town_kitchen");
t.check("asked again and again, nothing more is tidied or written down", (await deeds("pot_gone", mark)).length === 1 && same((await potRows()).map((o) => [o.id, o.feast, o.set]), [[picnic.id, true, T0 + HOUR_ON_GROUND], [direct.id, true, T0 + 5 * MIN]]), await potRows());
did = await call(U.m2, "town_pot_ladle", { p_id: picnic.id, p_x: g0[0] + 1, p_y: g0[1] });
t.check("it is no longer reached from beside where it stood", did?.ok === false && did.why === "none", did);
did = await call(U.m2, "town_pot_ladle", { p_id: picnic.id, p_x: y2[0], p_y: y2[1] });
t.check("…and is from the yard's floor", did?.ok === true && did.pot.left === 2 && did.pot.feast === true, did?.pot ?? did);
did = await call(U.m2, "town_pot_ladle", { p_id: junk.id, p_x: g1[0], p_y: g1[1] });
t.check("the odd pot is gone for whoever comes with a bowl", did?.ok === false && did.why === "gone", did);
await lay(U.m1, bagOf(pot(ODD, 1)));
did = await call(U.m1, "town_pot_down", { p_x: g0[0], p_y: g0[1] });
t.check("the tile it stood on is free for another pot", did?.ok === true && same(did.pot.at, g0), did);
// a pot whose hour ends is tidied by whoever next does anything with a pot, not only by a look: ladling, taking, setting down, the table's bowl
await t.sql(`delete from public.town_pots`);
const T1 = T0 + 3 * HOUR;
await clock(T1);
for (const [i, fn] of ["town_pot_ladle", "town_pot_take", "town_feast_eat", "town_pot_down"].entries()) {
  await lay(U.m1, bagOf(pot(A, 3), pot(B, 2)));
  await t.sql(`delete from public.town_pots`);
  await clock(T1 + i * 2 * HOUR);
  const p = potOf(await call(U.m1, "town_pot_down", { p_x: g0[0], p_y: g0[1], p_slot: 0 }));
  await clock(clockIs + HOUR_ON_GROUND + MIN);
  await lay(U.guest, bagOf({ item: CK.bowl, n: 1 }));
  const r = fn === "town_pot_ladle" ? await call(U.guest, fn, { p_id: p.id, p_x: y1[0], p_y: y1[1] })
    : fn === "town_pot_take" ? await call(U.m1, fn, { p_id: p.id, p_x: y1[0], p_y: y1[1] })
    : fn === "town_feast_eat" ? await call(U.guest, fn, { p_id: p.id, p_x: y1[0], p_y: y1[1], p_seated: true })
    : await call(U.m1, fn, { p_x: g0[0], p_y: g0[1], p_slot: 1 });
  t.check(`${fn}, the first thing asked after a pot's hour ended, finds the pot on the table (and its tile free)`, r?.ok === true, r);
}
// the table cleared
await t.sql(`delete from public.town_pots`);
const T2 = NOON + 72 * HOUR + 4 * HOUR + 30 * MIN, ENDS = C.feastEnds(T2);
await clock(T2);
await lay(U.m1, bagOf(pot(A, 3), pot(B, 2)));
const early1 = potOf(await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1], p_slot: 0 }));
const late = potOf(await call(U.m1, "town_pot_down", { p_x: g0[0], p_y: g0[1], p_slot: 1 }));   // (on the ground: it comes to the table an hour on, when dinner's hours have begun)
mark = await lastDeed();
await clock(ENDS - 1);
k = await kitchen(U.guest);
t.check("a millisecond before the meal's hours after the ones it came in are over, what is on the table is there still", same(k.pots.map((o) => o.id), [early1.id, late.id]) && k.pots.every((o) => o.feast), k.pots.map((o) => [o.id, o.feast]));
await clock(ENDS);
k = await kitchen(U.guest);
const lateEnds = C.feastEnds(T2 + HOUR_ON_GROUND);
t.check("as they end the table is cleared of it, whatever was left, and not of what came to it in the next meal's hours", lateEnds - ENDS === 6 * HOUR && same(k.pots.map((o) => [o.id, o.feast]), [[late.id, true]]), k.pots);
gone = await deeds("pot_gone", mark);
t.check("…written down in its cook's name with what was left, off the table", same(gone.map((d) => [d.by, d.thing, d.n, d.doc.from, String(d.doc.pot)]), [[U.m1, A, 3, "table", early1.id]]), gone);
await clock(lateEnds);
k = await kitchen(U.guest);
t.check("…and a pot that came to the table from the ground is cleared by the meal it came to the table in, not the one it was set down in", k.pots.length === 0 && (await deeds("pot_gone", mark)).length === 2, k.pots);
did = await call(U.guest, "town_feast_eat", { p_id: early1.id, p_x: y1[0], p_y: y1[1], p_seated: true });
t.check("nobody eats of what was cleared away: gone", did?.ok === false && did.why === "gone", did);

t.section("who may");
await clock(T2 + 48 * HOUR);
await lay(U.m1, bagOf(pot(A, 5)));
const last = potOf(await call(U.m1, "town_pot_down", { p_x: y0[0], p_y: y0[1] }));
const out = await call("anon", "town_feast_eat", { p_id: last.id, p_x: y1[0], p_y: y1[1], p_seated: true });
t.check("somebody signed out is refused the table's bowl", /permission denied/.test(out.error ?? ""), out);
for (const who of ["unver", "nochar"]) {
  await lay(U[who], bagOf());
  const r = await call(U[who], "town_feast_eat", { p_id: last.id, p_x: y1[0], p_y: y1[1], p_seated: true });
  t.check(`${who === "unver" ? "a character never proved" : "an account with no character"} eats nothing of the table's`, r?.ok !== true && (await purseOf(U[who])).eating == null && (await potRows(`o.id = ${last.id}`))[0]?.helpings === 5, r);
}
const direct_ = await t.as(U.m1, `select town.pots_tidy(1) as r`);
t.check("the tidying is no member's to ask for", !!direct_.error, direct_);

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
