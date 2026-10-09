/*
 * v171 (a torch can be made: what goes into a pot, or a pair of hands, is asked of the catalog's `cooking.putIn` too)
 * tried against the stand-in database as it was BEFORE it ran (v164, v169 and v170 among the files there:
 * `standIn({ upTo: 170 })`, snap-v170-with-164.tar): stand-in.mjs's
 * snapshot, loaded in a second, in memory: nothing is written anywhere.
 *
 *   FC_REPO=<the tree whose code is meant> node v171.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *
 * It reads supabase/'s file in the root given, then history once it has run. What is held:
 *   · before it, the database refuses fine timber and resin by hand (the fault it mends);
 *   · the file writes two functions again and nothing else: no table, no catalog row, no knob, no other function,
 *     and nobody may call anything they could not;
 *   · each of the two is its earlier text with v171.lines.mjs's pair, and nothing else;
 *   · what goes in is what the code says (lib/town/cooking's `goesIn`), for every thing there is, at the pot and
 *     at the spoon;
 *   · a member makes two torches of one fine timber and one resin, through the function a page calls;
 *   · the file's own "what it should say afterwards".
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { migration, U } from "./pglite-harness.mjs";
import { TOWN_COOK, TOWN_SPOON, withPairs } from "./v171.lines.mjs";
await import("./repo-ts-town.mjs");
const { goesIn } = await import("@/lib/town/cooking");
const { ITEM_IDS } = await import("@/lib/town/items");

const [root] = process.argv.slice(2);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v171_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(171));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { cond ? pass++ : fail++; console.log(`  ${cond ? "PASS" : "FAIL"} ${name}${cond ? "" : "  " + (typeof detail === "string" ? detail : JSON.stringify(detail).slice(0, 600))}`); };

const t = await standIn({ upTo: 170 });
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
/** A member's purse laid anew: this bag, a full gauge today, and whatever else. */
const lay = (who, bag, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, 0, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), JSON.stringify(more)]);
const kept = async (who) => (await one(`select p.doc from public.town_purses p where p.member_id = $1`, [who])).doc;
const bagOf = (...things) => [...things.map(([item, n]) => ({ item, n })), ...Array(10 - things.length).fill(null)];
const heldIn = (bag, id) => bag.reduce((n, s) => n + (s?.item === id ? s.n : 0), 0);

const COOK = "town.cook(jsonb,jsonb,jsonb,double precision,bigint)", SPOON = "town.spoon(jsonb,jsonb,bigint)";
const texts = async () => rows(`select p.oid::regprocedure::text as name, p.prosrc as src, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') order by 1`);
const about = async () => one(`select (select md5(string_agg(c.key || c.data::text || c.updated_at::text, '|' order by c.key)) from public.town_catalog c) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers`);
/** What the pot says of one of each thing there is, put in by hand from a bag that has it. */
const potOfEach = async () => Object.fromEntries((await rows(`select k.id, town.cook(town.fresh() || jsonb_build_object('bag', jsonb_build_array(jsonb_build_object('item', k.id, 'n', 1), null, null, null),
      'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)), jsonb_build_array(jsonb_build_array(k.id, 1)), '[null]'::jsonb, 0, town.now_ms()) as did
  from jsonb_object_keys(town.cat('items')) k(id)`)).map((r) => [r.id, r.did]));
/** And the spoon, in the bag of somebody who has it. */
const spoonOfEach = async () => Object.fromEntries((await rows(`select k.id, town.spoon(town.fresh() || jsonb_build_object('bag', jsonb_build_array(jsonb_build_object('item', k.id, 'n', 1), null, null, null),
      'gifts', '{"had":["thingSpoon"]}'::jsonb), jsonb_build_array(jsonb_build_array(k.id, 1)), town.now_ms()) as did
  from jsonb_object_keys(town.cat('items')) k(id)`)).map((r) => [r.id, r.did]));
const refused = (did) => did?.ok === false && did.why === "none";

console.log("before it");
const was = { texts: await texts(), about: await about(), pot: await potOfEach() };
await lay(U.m1, bagOf(["timber", 1], ["resin", 1]));
const wasDid = await call(U.m1, "town_cook", { p_things: JSON.stringify([["timber", 1], ["resin", 1]]) });
ok("a member with one fine timber and one resin is refused a torch, as if the bag had neither (the fault)", refused(wasDid) && heldIn((await kept(U.m1)).bag, "timber") === 1, wasDid);
ok("the catalog says fine timber goes in and a torch never does, and nothing reads it", refused(was.pot.timber) && !refused(was.pot.torch), { timber: was.pot.timber, torch: was.pot.torch?.ok });

console.log("v171, twice over");
await t.sql(FILE);
const now = { texts: await texts(), about: await about() };
await t.sql(FILE);
ok("run again, it changes nothing", same(await texts(), now.texts) && same(await about(), now.about));
ok("no table, no policy, no trigger, no knob, no catalog row (not even when a row was written)", same(now.about, was.about), { was: was.about, now: now.about });
const by = (list) => Object.fromEntries(list.map((f) => [f.name, f]));
const a = by(was.texts), b = by(now.texts);
ok("it makes no function, and takes none away", same(Object.keys(a), Object.keys(b)), Object.keys(b).filter((k) => !a[k]));
ok("of the functions there are, only the pot's and the spoon's differ", same(Object.keys(b).filter((k) => a[k]?.body !== b[k].body).sort(), [COOK, SPOON].sort()), Object.keys(b).filter((k) => a[k]?.body !== b[k].body));
ok("nobody may call anything they could not before (the two are still no browser's)", Object.keys(b).every((k) => a[k]?.anon === b[k].anon && a[k]?.member === b[k].member) && !b[COOK].anon && !b[COOK].member && !b[SPOON].anon && !b[SPOON].member);
ok("the pot's rule is its earlier text with its pair, and nothing else", b[COOK].src === withPairs(a[COOK].src, TOWN_COOK));
ok("the spoon's rule is its earlier text with its pair, and nothing else", b[SPOON].src === withPairs(a[SPOON].src, TOWN_SPOON));
ok("no UPDATE or DELETE in it (so none without a WHERE)", !/^\s*(update|delete)\s/im.test(FILE.split("\n").filter((l) => !l.trimStart().startsWith("--")).join("\n")));

console.log("what goes in is what the code says");
const pot = await potOfEach(), spoon = await spoonOfEach();
ok("the catalog's things are the code's", same(Object.keys(pot).sort(), [...ITEM_IDS].sort()), { db: Object.keys(pot).length, code: ITEM_IDS.length });
const potOff = ITEM_IDS.filter((id) => refused(pot[id]) !== !goesIn(id)), spoonOff = ITEM_IDS.filter((id) => refused(spoon[id]) !== !goesIn(id));
ok(`the pot refuses exactly what does not go in, of every thing there is (${ITEM_IDS.length})`, potOff.length === 0, potOff);
ok("the spoon refuses exactly what does not go in, of every thing there is", spoonOff.length === 0, spoonOff);
ok("but for fine timber and a torch, the pot says of each thing what it said before", same(Object.keys(pot).filter((id) => !same({ ...pot[id], purse: 0 }, { ...was.pot[id], purse: 0 })).sort(), ["timber", "torch"]),
  Object.keys(pot).filter((id) => !same({ ...pot[id], purse: 0 }, { ...was.pot[id], purse: 0 })));
ok("fine timber goes in; a torch, a log, a stone and a pick do not", !refused(pot.timber) && refused(pot.torch) && refused(pot.log) && refused(pot.stone) && refused(pot.pick), { timber: pot.timber, torch: pot.torch, log: pot.log, stone: pot.stone });
ok("the spoon, asked of fine timber alone, has a recipe to tell of", spoon.timber?.ok === true && spoon.timber.of === "torch", spoon.timber);

console.log("a member at the worktable");
const did = await call(U.m1, "town_cook", { p_things: JSON.stringify([["timber", 1], ["resin", 1]]) });
const after = await kept(U.m1);
ok("one fine timber and one resin by hand are two torches", did?.ok === true && did.made === "torch" && did.n === 2, did);
ok("the two torches are in the bag, the timber and the resin gone, and the recipe is the member's own", heldIn(after.bag, "torch") === 2 && heldIn(after.bag, "timber") === 0 && heldIn(after.bag, "resin") === 0 && (after.made ?? []).includes("torch"), after.bag);
ok("the village knows who made its first torch", ((await one(`select town.thing('finders', true) as f`)).f?.torch?.by) === U.m1);
const again = await call(U.m1, "town_cook", { p_things: JSON.stringify([["torch", 1]]) });
ok("a torch put in is refused, and stays in the bag", refused(again) && heldIn((await kept(U.m1)).bag, "torch") === 2, again);
await lay(U.m2, bagOf(["log", 2], ["resin", 1]));
const logs = await call(U.m2, "town_cook", { p_things: JSON.stringify([["log", 1], ["resin", 1]]) });
ok("a plain log is no fine timber: refused, and nothing is lost", refused(logs) && heldIn((await kept(U.m2)).bag, "log") === 2 && heldIn((await kept(U.m2)).bag, "resin") === 1, logs);
const anon = await call("anon", "town_cook", { p_things: JSON.stringify([["timber", 1], ["resin", 1]]) });
ok("the signed out are refused as ever", anon.code === "42501", anon);

console.log("what it should say afterwards");
const says = (await one(`select town.cook(town.fresh() || jsonb_build_object('bag', '[{"item":"timber","n":1},{"item":"resin","n":1},null,null]'::jsonb,
    'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)), '[["timber",1],["resin",1]]'::jsonb, '[null]'::jsonb, 0, town.now_ms()) - 'purse' as says`)).says;
ok("the file's own look says a torch, two of them", same(says, { n: 2, ok: true, made: "torch" }) && FILE.includes(`-- {"n": 2, "ok": true, "made": "torch"}`), says);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
