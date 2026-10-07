/*
 * v158 (the pot set down is the pot that was meant: `town_pot_down` takes the slot of the bag the pot is in) tried
 * against the stand-in database as it is after the last file that ran (stand-in.mjs's snapshot, loaded in a second,
 * in memory: nothing is written anywhere).
 *
 *   node v158.test.mjs [the worktree's root]          (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v158.test.mjs v158.mutations.mjs
 *
 * It reads the draft beside this file (`v158_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. The file writes one function again and no rule, so what is held is: the function is the
 * one it replaces but for the lines meant, and nothing else is touched; a page from before is answered as ever; a
 * slot said is the pot set down, and a slot that is no pot's sets nothing down; and who may call it is who might.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const [root] = process.argv.slice(2);
const beside = new URL("./v158_draft.sql", import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v158_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(158));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
/** As PostgREST calls it: by the names of the words sent, and only those. */
const down = async (who, words) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.town_pot_down(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
const bagOf = async (who) => (await one(`select doc->'bag' as bag from public.town_purses where member_id = $1`, [who]))?.bag;
const potsOf = async (who) => rows(`select o.dish, o.helpings, o.x, o.y from public.town_pots o where o.member_id = $1 order by o.id`, [who]);
const deedsOf = async (who) => rows(`select d.thing, d.n::int as n, d.doc->'tile' as tile from public.town_deeds d where d.member_id = $1 and d.what = 'pot_down' order by d.id`, [who]);
const lay = async (who, bag) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || jsonb_build_object('bag', $2::jsonb, 'hand', 'potFull') where member_id = $1`, [who, JSON.stringify(bag)]);
};
const texts = async () => rows(`select p.oid::regprocedure::text as name, md5(pg_get_functiondef(p.oid)) as body, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and p.proname <> 'town_pot_down' order by 1`);
const kept = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers`);

// three dishes of the catalog's own, a thing that is no pot, and tiles of the town's map well apart
const DISHES = (await rows(`select k from jsonb_object_keys(town.cat('dishes')) k order by 1 limit 3`)).map((r) => r.k);
const [A, B, C] = DISHES;
const pot = (dish, left) => ({ item: "potFull", n: 1, of: { dish, left } });
const BAG = () => [pot(A, 4), { item: "salt", n: 2 }, pot(B, 3), null, null, pot(C, 2), null, null, null, null];
const MOST = (await one(`select (town.cat('cooking')->>'pots')::int as n`)).n;
const TILE = (i) => [6 + 4 * i, 8];

t.section("before it: the first pot of the bag, whichever was meant");
const OLD = (await one(`select pg_get_functiondef('public.town_pot_down(integer, integer)'::regprocedure) as d`)).d;
await lay(U.m2, BAG());
const before = await down(U.m2, { p_x: 6, p_y: 30 });
t.check("the first pot is set down, as it always was", before?.ok === true && before.pot?.dish === A && before.pot.left === 4 && same(await bagOf(U.m2), [null, ...BAG().slice(1)]), before?.pot ?? before);
const noSlot = await down(U.m2, { p_x: 10, p_y: 30, p_slot: 5 });
t.check("and no slot can be said: there is no such function", !!noSlot.error && /does not exist/.test(noSlot.error), noSlot);
const textsWas = await texts(), keptWas = await kept();

t.section("where v121's pot is not there, it stops at its first line and says why");
await t.sql(`alter function town.set_down(jsonb, integer, text, jsonb, text) rename to set_down_away`);
const early = await t.db.exec(FILE).then(() => null, (e) => e.message ?? String(e));
t.check("where the rule it stands on is not there, it stops at its first line and says why", !!early && /v158 needs v121/.test(early) && (await one(`select to_regprocedure('public.town_pot_down(integer, integer)') is not null as there`)).there, early);
await t.sql(`alter function town.set_down_away(jsonb, integer, text, jsonb, text) rename to set_down`);

t.section("v158, twice over");
await t.runTwice(FILE, "v158");
const forms = await rows(`select p.oid::regprocedure::text as fn, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member,
  p.prosecdef as definer, p.proconfig::text as config from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'town_pot_down'`);
t.check("there is one town_pot_down, of three words: the one of two is gone", forms.length === 1 && forms[0].fn === "town_pot_down(integer,integer,integer)", forms);
t.check("…a member's to call and nobody's who is signed out (what the file's foot says it should say)", forms.length === 1 && forms[0].anon === false && forms[0].member === true, forms);
t.check("…security definer with its search path set, as the one it replaces", forms.length === 1 && forms[0].definer === true && /search_path=public/.test(forms[0].config ?? ""), forms);
const NEW = forms.length === 1 ? (await one(`select pg_get_functiondef('public.town_pot_down(integer, integer, integer)'::regprocedure) as d`)).d : "";
const FIRST = "  select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1;";
const MEANT = OLD.replace("town_pot_down(p_x integer, p_y integer)", "town_pot_down(p_x integer, p_y integer, p_slot integer DEFAULT NULL::integer)")
  .replace(FIRST, `  -- (the pot in the slot that is said; with none said, the first pot of food the bag has, as it was before v158)\n  if p_slot is not null then slot := p_slot;\n  else ${FIRST.trim()} end if;`);
t.check("the function is the one it replaces, word for word, but for the third word and the lines that read it", OLD.includes(FIRST) && NEW === MEANT, NEW);
t.check("no other function of the town's is written, dropped, added or given to anybody else", same(await texts(), textsWas), (await texts()).length);
t.check("no table, no policy, no trigger, no catalog row and no knob is touched", same(await kept(), keptWas), await kept());
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0);

t.section("a page from before: no slot said");
await lay(U.m1, BAG());
let did = await down(U.m1, { p_x: TILE(0)[0], p_y: TILE(0)[1] });
t.check("with no slot said, the first pot of the bag is set down, as before", did?.ok === true && did.pot?.dish === A && did.pot.left === 4 && same(await bagOf(U.m1), [null, ...BAG().slice(1)]), did?.pot ?? did);
t.check("…answered in the same words as before the file: the purse as it stands, the pot, the clock", same(Object.keys(did ?? {}).sort(), Object.keys(before).sort()) && same(Object.keys(did?.pot ?? {}).sort(), Object.keys(before.pot).sort()) && same(did.purse.bag, await bagOf(U.m1)), Object.keys(did ?? {}));
await lay(U.m1, BAG());
did = await down(U.m1, { p_x: TILE(1)[0], p_y: TILE(1)[1], p_slot: null });
t.check("…and the same when the slot is said to be none", did?.ok === true && did.pot?.dish === A && did.pot.left === 4, did?.pot ?? did);

t.section("the slot said is the pot set down");
await lay(U.m1, BAG());
did = await down(U.m1, { p_x: TILE(2)[0], p_y: TILE(2)[1], p_slot: 5 });
t.check("the pot in the slot that is said is the one set down: the last of three, its dish and its helpings", did?.ok === true && did.pot?.dish === C && did.pot.left === 2 && same(did.pot.at, TILE(2)), did?.pot ?? did);
t.check("…and the other two are still in the bag, where they were, with what else it had", same(await bagOf(U.m1), BAG().map((s, i) => (i === 5 ? null : s))), await bagOf(U.m1));
did = await down(U.m1, { p_x: TILE(3)[0], p_y: TILE(3)[1], p_slot: 2 });
t.check("the pot in the slot that is said, again: the middle one, the first still in the bag", did?.ok === true && did.pot?.dish === B && did.pot.left === 3 && same(await bagOf(U.m1), BAG().map((s, i) => (i === 5 || i === 2 ? null : s))), did?.pot ?? did);
t.check("the pots stand where they were set, each with its own dish", same(await potsOf(U.m1), [[A, 4, 0], [A, 4, 1], [C, 2, 2], [B, 3, 3]].map(([dish, helpings, i]) => ({ dish, helpings, x: TILE(i)[0], y: TILE(i)[1] }))), await potsOf(U.m1));
t.check("…and each is written down as the deed it was (v121): the dish, its helpings, the tile", same(await deedsOf(U.m1), [[A, 4, 0], [A, 4, 1], [C, 2, 2], [B, 3, 3]].map(([thing, n, i]) => ({ thing, n, tile: TILE(i) }))), await deedsOf(U.m1));

t.section("a slot that is no pot's sets nothing down");
await lay(U.m1, BAG());
const refusals = [];
for (const slot of [1, 3, 10, 99, -1, -5, 2147483647]) refusals.push([slot, await down(U.m1, { p_x: TILE(4)[0], p_y: TILE(4)[1], p_slot: slot })]);
t.check("a slot that is no pot's (another thing, an empty one, past the bag's end, before its beginning) is refused: none", refusals.every(([, r]) => r?.ok === false && r.why === "none"), refusals.map(([s, r]) => [s, r?.why ?? r?.pot?.dish ?? r]));
t.check("…with nothing moved: the bag whole, no pot more, no deed more", same(await bagOf(U.m1), BAG()) && (await potsOf(U.m1)).length === 4 && (await deedsOf(U.m1)).length === 4, { bag: await bagOf(U.m1), pots: (await potsOf(U.m1)).length });
did = await down(U.m1, { p_x: TILE(3)[0] + 1, p_y: TILE(3)[1], p_slot: 5 });
t.check("beside a pot that stands there, a pot said by its slot is refused as any is: taken", did?.ok === false && did.why === "taken" && same(await bagOf(U.m1), BAG()), did);
did = await down(U.m1, { p_x: null, p_y: 8, p_slot: 5 });
t.check("with no tile, refused as ever: none", did?.ok === false && did.why === "none" && same(await bagOf(U.m1), BAG()), did);
// (as many about as one member may leave: the next is refused, slot or no slot)
for (let i = 4; i < MOST; i++) { await lay(U.m1, BAG()); await down(U.m1, { p_x: TILE(i)[0], p_y: TILE(i)[1], p_slot: 2 }); }
await lay(U.m1, BAG());
did = await down(U.m1, { p_x: TILE(MOST)[0], p_y: TILE(MOST)[1], p_slot: 5 });
t.check(`with ${MOST} pots of one member's about, one more is refused as ever: many`, (await potsOf(U.m1)).length === MOST && did?.ok === false && did.why === "many" && same(await bagOf(U.m1), BAG()), { did, pots: (await potsOf(U.m1)).length });

t.section("whose bag, and who may");
await lay(U.m2, [null, null, null, null, null, null, null, null, null, null]);
did = await down(U.m2, { p_x: 40, p_y: 30, p_slot: 5 });
t.check("the slot is of the caller's own bag: with nothing in theirs, none, and the other member's pot is where it was", did?.ok === false && did.why === "none" && same(await bagOf(U.m1), BAG()), did);
const out = await down("anon", { p_x: 40, p_y: 30, p_slot: 5 }), outOld = await down("anon", { p_x: 40, p_y: 30 });
t.check("somebody signed out is refused, with a slot and without", /permission denied/.test(out.error ?? "") && /permission denied/.test(outOld.error ?? ""), { out, outOld });
for (const who of ["unver", "nochar"]) {
  await lay(U[who], BAG());
  const r = await down(U[who], { p_x: 44, p_y: 30, p_slot: 5 });
  t.check(`${who === "unver" ? "a character never proved" : "an account with no character"} sets no pot down`, r?.ok !== true && (await potsOf(U[who])).length === 0 && same(await bagOf(U[who]), BAG()), r);
}

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
