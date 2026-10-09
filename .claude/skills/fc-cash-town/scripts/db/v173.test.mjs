/*
 * v173 (a go that is lost fells nothing: the tree stands, nothing is given, no stamina is paid) tried against the
 * stand-in database as it was BEFORE it ran (`standIn({ upTo: 172 })`: built from history the first time, then a
 * snapshot): loaded in a second, in memory: nothing is written anywhere.
 *
 *   FC_REPO=<the tree whose code is meant> node v173.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *   TOWN_VECTORS=<a folder> npx vitest run lib/town/db-vectors-felling.test.ts        (first, in that tree: it writes the rule's cases there)
 *
 * It reads supabase/'s file in the root given, then history once it has run. What is held:
 *   · before it, a go lost on the board fells its tree all the same (what it takes away);
 *   · the file writes one function again and nothing else: no table, no catalog row, no knob, no other function,
 *     and nobody may call anything they could not;
 *   · that function is its earlier text with v173.lines.mjs's pair, and nothing else;
 *   · every case of the rule the code has (TOWN_VECTORS' vectors-felling.json, where there is one) is answered by
 *     the database as the code answers it;
 *   · a member's lost go, through the function a page calls: the tree stands, the purse is as it was (bag, stamina),
 *     nothing is written down, whoever braced the trunk has nothing, the go is over and the tree is anybody's at
 *     once; with no stamina the same; and a trunk cut through is a tree felled as before;
 *   · the file's own "what it should say afterwards".
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { migration, U } from "./pglite-harness.mjs";
import { TOWN_FELL, withPairs } from "./v173.lines.mjs";

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v173_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(173));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 900))}`); };

const t = await standIn({ upTo: 172 });
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
/** A member's purse laid anew: an axe in the hand, and so much stamina today. */
const lay = (who, left = 100) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'hand', 'axe', 'handAt', 0,
    'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $3::numeric)))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify([{ item: "axe", n: 1 }, ...Array(9).fill(null)]), left]);
const kept = async (who) => (await one(`select p.doc from public.town_purses p where p.member_id = $1`, [who])).doc;
/** What of a purse a go at felling could change: the bag, the stamina, what the line keeps, the pouches, the powers counted; and the coins. (A purse kept again is written in the keeper's own shape: its other words are not compared.) */
const mine = async (who) => { const d = await kept(who), c = (await one(`select p.coins from public.town_purses p where p.member_id = $1`, [who])).coins;
  return { bag: d.bag, stamina: d.stamina, hand: d.hand, handAt: d.handAt, felling: d.felling ?? null, pouches: d.pouches ?? null, powers: d.powers ?? null, coins: Number(c) }; };
const heldIn = (bag, id) => bag.reduce((n, s) => n + (s?.item === id ? s.n : 0), 0);
const grove = async () => (await one(`select town.thing('grove', false) as g`)).g ?? { down: {}, half: [] };
const deeds = async () => (await one(`select count(*)::int as n from public.town_deeds where what in ('fell', 'brace')`)).n;

const FELL = "town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)";
const texts = async () => rows(`select p.oid::regprocedure::text as name, p.prosrc as src, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') order by 1`);
const about = async () => one(`select (select md5(string_agg(c.key || c.data::text || c.updated_at::text, '|' order by c.key)) from public.town_catalog c) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers`);

// the far side open to members, as it is live; four pines of the first kind, each with the tile to its left
await t.sql(`update public.town_knobs set value = 1 where key = 'far_open'`);
const pines = (await rows(`select w.v as tree from jsonb_array_elements(town.cat('trees')->'wood') w(v) where (w.v->>3)::integer = 1 order by (w.v->>0)::integer limit 4`)).map((r) => r.tree);
const beside = (p) => ({ p_x: p[1] - 1, p_y: p[2] });
const go = (p, went) => ({ p_went: JSON.stringify({ tree: p[0], ...went }), ...beside(p) });
/** The rule's own answer to a made-up purse with an axe, at a tree: nobody's purse, no tree's row. */
const ruleSays = async (went, p = pines[0]) => (await one(`select town.fell(town.fresh() || jsonb_build_object('bag', '[{"item":"axe","n":1},null,null,null]'::jsonb, 'hand', 'axe', 'handAt', 0,
    'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)), '{"down": {}, "half": []}'::jsonb, 'somebody', $1::jsonb, $2::integer, $3::integer, town.now_ms(), '[]'::jsonb) as says`,
  [JSON.stringify(went), p[1] - 1, p[2]])).says;

console.log("before it");
const was = { texts: await texts(), about: await about() };
await lay(U.m1);
await call(U.m1, "town_fell_begin", { p_tree: pines[0][0], ...beside(pines[0]) });
const wasDid = await call(U.m1, "town_fell", go(pines[0], { through: false, misses: 1, secs: 2 }));
const wasPurse = await kept(U.m1);
ok("a member's go lost on the board fells its pine all the same: its logs in the bag, its stamina paid, the tree a stump (what this takes away)",
  wasDid?.ok === true && wasDid.stood === false && wasDid.felled?.[0]?.id === pines[0][0] && heldIn(wasPurse.bag, "log") > 0 && wasPurse.stamina.left < 100 && !!(await grove()).down?.[pines[0][0]], wasDid);
ok("the plain way is refused already (v172 is there)", same(await ruleSays({ tree: pines[1][0], secs: 0, plain: true }, pines[1]), { ok: false, why: "board" }));

console.log("v173, twice over");
await t.sql(FILE);
const now = { texts: await texts(), about: await about() };
await t.sql(FILE);
ok("run again, it changes nothing", same(await texts(), now.texts) && same(await about(), now.about));
ok("no table, no policy, no trigger, no knob, no catalog row", same(now.about, was.about), { was: was.about, now: now.about });
const by = (list) => Object.fromEntries(list.map((f) => [f.name, f]));
const a = by(was.texts), b = by(now.texts);
ok("it makes no function, and takes none away", same(Object.keys(a), Object.keys(b)), Object.keys(b).filter((k) => !a[k]));
ok("of the functions there are, only the rule of a go at felling differs", same(Object.keys(b).filter((k) => a[k]?.body !== b[k].body), [FELL]), Object.keys(b).filter((k) => a[k]?.body !== b[k].body));
ok("nobody may call anything they could not before (the rule is still no browser's)", Object.keys(b).every((k) => a[k]?.anon === b[k].anon && a[k]?.member === b[k].member) && !b[FELL].anon && !b[FELL].member);
ok("the rule is its earlier text with its pair, and nothing else", b[FELL].src === withPairs(a[FELL].src, TOWN_FELL));
ok("no UPDATE or DELETE in it (so none without a WHERE)", !/^\s*(update|delete)\s/im.test(FILE.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n")));

console.log("the rule, as the code has it");
const dir = process.env.TOWN_VECTORS;
if (dir && existsSync(join(dir, "vectors-felling.json"))) {
  const cases = JSON.parse(readFileSync(join(dir, "vectors-felling.json"), "utf8")).filter((v) => v.fn === "fell");
  const param = (v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v);
  let bad = 0, first = null, lost = 0, stood = 0;
  for (const v of cases) {
    let got, error = null;
    try { got = (await t.db.query(`select town.fell($1::jsonb, $2::jsonb, $3::text, $4::jsonb, $5::integer, $6::integer, $7::bigint, $8::jsonb, $9::text) as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (error || !same(got ?? null, v.want)) { bad++; first ??= { args: v.args.slice(3), want: v.want, got: error ?? got }; }
    if (got?.ok === true && got.through === false) { lost++; if (got.stood === true && got.felled.length === 0 && same(got.purse, v.args[0])) stood++; }
  }
  ok(`every case of a go at felling is answered as the code answers it (${cases.length})`, cases.length > 500 && bad === 0, bad ? `${bad} differ; the first: ${JSON.stringify(first).slice(0, 1600)}` : cases.length);
  ok(`of them, ${lost} goes were lost: in every one the trees stand and the purse is as it came`, lost > 50 && stood === lost, { lost, stood });
} else console.log("  (no TOWN_VECTORS with vectors-felling.json: the rule's cases are not asked)");
const lostSays = await ruleSays({ tree: pines[1][0], through: false, misses: 2, secs: 1.5 }, pines[1]);
ok("a go lost on the board fells nothing: the tree stands, nothing given, nobody to pay", lostSays?.ok === true && lostSays.stood === true && lostSays.through === false && lostSays.felled.length === 0 && lostSays.got.length === 0
  && lostSays.found.length === 0 && lostSays.braced === null && !lostSays.grove.down?.[pines[1][0]] && lostSays.purse.stamina.left === 100, lostSays);
ok("…and a go that says nothing of how it ended is a go that was lost", (await ruleSays({ tree: pines[1][0], misses: 0, secs: 9 }, pines[1]))?.stood === true);
const won = await ruleSays({ tree: pines[1][0], through: true, misses: 0, secs: 9 }, pines[1]);
ok("a trunk cut through fells its tree, for its logs and its fine timber, and its stamina, as before", won?.ok === true && won.stood === false && won.felled?.[0]?.timber > 0 && won.purse.stamina.left < 100 && !!won.grove.down?.[pines[1][0]], won);
ok("the plain way is refused still", same(await ruleSays({ tree: pines[1][0], secs: 0, plain: true }, pines[1]), { ok: false, why: "board" }));

console.log("a member at a tree");
await lay(U.m2); await lay(U.m1);
const before = { purse: await mine(U.m2), friend: await mine(U.m1), deeds: await deeds() };
const board = await call(U.m2, "town_fell_begin", { p_tree: pines[1][0], ...beside(pines[1]) });
const brace = await call(U.m1, "town_fell_brace", { p_feller: U.m2, p_x: pines[1][1] + 1, p_y: pines[1][2] });
const held = await call(U.m1, "town_fell_begin", { p_tree: pines[1][0], p_x: pines[1][1] + 1, p_y: pines[1][2] });
ok("(a board put up, a friend at the trunk, and the tree held for its member meanwhile)", board?.ok === true && brace?.ok === true && held?.ok === false && held.why === "held", { board, brace, held });
const did = await call(U.m2, "town_fell", go(pines[1], { through: false, misses: 1, secs: 2 }));
ok("the go lost: answered that the tree stands, with nothing felled and nothing got", did?.ok === true && did.stood === true && did.felled.length === 0 && did.got.length === 0, did);
ok("…the purse is as it was: the bag, and all its stamina", same(await mine(U.m2), before.purse) && (await kept(U.m2)).stamina.left === 100, { was: before.purse, now: await mine(U.m2) });
ok("…no stump, nothing written down, and the friend who braced has nothing for it", !(await grove()).down?.[pines[1][0]] && (await deeds()) === before.deeds && same(await mine(U.m1), before.friend), { grove: await grove() });
const next = await call(U.m1, "town_fell_begin", { p_tree: pines[1][0], p_x: pines[1][1] + 1, p_y: pines[1][2] });
ok("…and the go is over: the tree is anybody's at once", !(await grove()).goes?.[U.m2] && next?.ok === true, { goes: (await grove()).goes ?? null, next });
const theirs = await call(U.m1, "town_fell", { p_went: JSON.stringify({ tree: pines[1][0], through: true, misses: 0, secs: 12 }), p_x: pines[1][1] + 1, p_y: pines[1][2] });
ok("a trunk cut through is a tree felled, as before: its logs and its fine timber, its stamina, the stump, and the deed", theirs?.ok === true && theirs.stood === false && theirs.felled?.[0]?.id === pines[1][0]
  && heldIn((await kept(U.m1)).bag, "log") > 0 && heldIn((await kept(U.m1)).bag, "timber") > 0 && (await kept(U.m1)).stamina.left < 100 && !!(await grove()).down?.[pines[1][0]] && (await deeds()) === before.deeds + 1, theirs);
await lay(U.m2, 0);
const tiredWas = await mine(U.m2);
await call(U.m2, "town_fell_begin", { p_tree: pines[2][0], ...beside(pines[2]) });
const tired = await call(U.m2, "town_fell", go(pines[2], { through: false, misses: 3, secs: 1 }));
ok("with no stamina left, a go that was lost is the same: the tree stands, and nothing is owed for it", tired?.ok === true && tired.stood === true && same(await mine(U.m2), tiredWas) && (await kept(U.m2)).stamina.left === 0 && !(await grove()).down?.[pines[2][0]], { was: tiredWas, now: await mine(U.m2) });
const plain = await call(U.m2, "town_fell", go(pines[2], { secs: 0, plain: true }));
ok("the plain press is refused still", plain?.ok === false && plain.why === "board", plain);
const anon = await call("anon", "town_fell", go(pines[3], { through: false, misses: 0, secs: 2 }));
ok("the signed out are refused as ever", anon.code === "42501", anon);

console.log("what it should say afterwards");
const says = await one(`select s.says, s.says::text as text from (select town.fell(town.fresh() || jsonb_build_object('bag', '[{"item":"axe","n":1},null,null,null]'::jsonb, 'hand', 'axe', 'handAt', 0,
                                                     'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)),
                 '{"down": {}, "half": []}'::jsonb, 'somebody', '{"tree": 0, "through": false, "misses": 1, "secs": 2}'::jsonb,
                 (town.tree_of(0)->>1)::integer - 1, (town.tree_of(0)->>2)::integer, town.now_ms(), '[]'::jsonb) - 'purse' - 'grove' as says) s`);
ok("the file's own look says the tree stands, as the file has it word for word", says.says?.stood === true && says.says.felled.length === 0 && FILE.includes(`-- ${says.text}`), says.text);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
