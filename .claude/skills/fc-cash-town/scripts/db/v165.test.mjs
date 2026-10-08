/*
 * v165 (a bag put in order: a thing moved from one slot to another, the whole bag sorted) tried against the stand-in
 * database as it is after the last file that ran (stand-in.mjs's snapshot, in memory: nothing is written anywhere).
 *
 *   FC_REPO=<the tree whose code is meant> node v165.test.mjs [that tree's root]     (MIGRATION_FILE=<a file> tries that one)
 *   node mutate.mjs <the draft> v165.test.mjs v165.mutations.mjs
 *
 * It reads the draft beside this file (`v165_draft.sql`) while there is one, then supabase/'s in the root given, then
 * history once it has run. What is held:
 *   · it adds six functions and nothing else: no function of the town's that was there is another, nor anybody's to
 *     call who could not; no table, policy, trigger, knob or row of the catalog is other than it was;
 *   · the rules are the site's own (lib/town/bag is loaded here, repo-ts-town.mjs): bags drawn by lot, each sorted,
 *     and each with every slot moved onto every slot, and onto slots it has not;
 *   · by the functions a member calls: what is answered, what is kept, what is not touched (coins, the hand, the
 *     rest of the purse, anybody else's, the deeds), and who may.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
await import("./repo-ts-town.mjs");
const B = await import("@/lib/town/bag");
const { ITEMS } = await import("@/lib/town/items");
const { newPurse, handOf } = await import("@/lib/town/trade");

const [root] = process.argv.slice(2);
const beside = new URL("./v165_draft.sql", import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
const inRepo = root && existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v165_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : existsSync(beside) ? readFileSync(beside, "utf8") : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : migration(165));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
/** As the database would have it: what is not said is not there. */
const plain = (v) => JSON.parse(JSON.stringify(v));

const t0 = Date.now();
const t = await standIn();
const rows = async (sql, params) => (await t.sql(sql, params)).rows;
const one = async (sql, params) => (await rows(sql, params))[0];
/** As PostgREST calls it: by the names of the words sent, and only those. */
const call = async (who, fn, words = {}) => {
  const names = Object.keys(words);
  const r = await t.as(who, `select public.${fn}(${names.map((k, i) => `${k} => $${i + 1}`).join(", ")}) as r`, names.map((k) => words[k]));
  return r.error ? { error: r.error, code: r.code } : r.rows[0].r;
};
/** A member's purse laid anew: this bag, a full gauge today, and whatever else. */
const lay = (who, bag, more = {}, coins = 0) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $4, town.fresh() || jsonb_build_object('bag', $2::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', 100)) || $3::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, JSON.stringify(bag), JSON.stringify(more), coins]);
const kept = async (who) => one(`select p.coins, p.doc from public.town_purses p where p.member_id = $1`, [who]);
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as n from public.town_deeds`)).n);

const NEW = ["town.bag_joins(jsonb)", "town.bag_move(jsonb, integer, integer)", "town.bag_sort(jsonb)", "public.town_bag()", "public.town_bag_move(integer, integer)", "public.town_bag_sort()"];
const NAMES = NEW.map((s) => s.slice(0, s.indexOf("(")));
/** Every function of the town's but those the file adds: its text, and who may call it. */
const texts = async () => rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, md5(pg_get_functiondef(p.oid)) as body,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('town', 'public') and p.prokind = 'f' and (n.nspname = 'town' or p.proname like 'town\\_%') and not (n.nspname || '.' || p.proname = any($1)) order by 1`, [NAMES]);
const about = async () => one(`select (select md5(string_agg(c.key || c.data::text, '|' order by c.key)) from public.town_catalog c) as catalog,
  (select md5(string_agg(k.key || k.value::text, '|' order by k.key)) from public.town_knobs k) as knobs,
  (select count(*)::int from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r') as tables,
  (select count(*)::int from pg_policies) as policies, (select count(*)::int from pg_trigger g where not g.tgisinternal) as triggers,
  (select count(*)::int from public.town_deeds) as deeds`);

t.section("before it: a bag is put in order by nobody");
const textsWas = await texts(), aboutWas = await about();
const none = await call(U.m1, "town_bag");
t.check("a page that asks whether a bag can be put in order is told there is no such thing", !!none.error && none.ok === undefined, none);

t.section("v165, twice over");
await t.runTwice(FILE, "v165");
t.check("no function of the town's that was there is another, nor anybody's to call who could not", same(await texts(), textsWas),
  (await texts()).filter((f) => !textsWas.some((w) => same(w, f))).map((f) => f.name));
t.check("no table, policy, trigger, knob, deed or row of the catalog is other than it was", same(await about(), aboutWas), [await about(), aboutWas]);
const added = await rows(`select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as name, p.prosecdef as definer, p.provolatile as vol,
    has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member, array_to_string(p.proconfig, ',') as cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname || '.' || p.proname = any($1) order by 1`, [NAMES]);
const sig = (s) => s.replace(/p_\w+ /g, "");
t.check("it adds six functions: three rules and three a page calls", same(added.map((f) => sig(f.name)).sort(), [...NEW].sort()), added.map((f) => f.name));
t.check("the rules are nobody's in a browser", added.filter((f) => f.name.startsWith("town.")).every((f) => !f.anon && !f.member && !f.definer), added);
t.check("the three functions are a member's to call", added.filter((f) => f.name.startsWith("public.")).every((f) => f.member), added);
t.check("…none of them somebody signed out's", added.filter((f) => f.name.startsWith("public.")).every((f) => !f.anon), added);
t.check("…each with its search path set, and the rules write nothing (stable)", added.every((f) => /search_path=public/.test(f.cfg ?? "")) && added.filter((f) => f.name.startsWith("town.")).every((f) => f.vol === "s"), added);
t.check("no function writes to a table with no WHERE", (await bareWrites((q) => t.sql(q).then((r) => r.rows))).length === 0, await bareWrites((q) => t.sql(q).then((r) => r.rows)));

t.section("what it should say afterwards");
const says = await rows(`select p.proname from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_bag%' order by 1`);
t.check("the three names", same(says.map((r) => r.proname), ["town_bag", "town_bag_move", "town_bag_sort"]), says);
const may = await one(`select has_function_privilege('anon', 'public.town_bag_sort()', 'execute') as anon,
  has_function_privilege('authenticated', 'public.town_bag_sort()', 'execute') as member, has_function_privilege('authenticated', 'town.bag_sort(jsonb)', 'execute') as the_rule`);
t.check("anon f, member t, the rule f", same(may, { anon: false, member: true, the_rule: false }), may);
const said1 = (await one(`select (town.bag_sort('{"bag":[{"item":"kangkong","n":5},null,{"item":"hoe","n":1},{"item":"kangkong","n":18},{"item":"worm","n":2}]}'::jsonb)->'bag')::text as r`)).r;
const STACK = ITEMS.kangkong.stack;
t.check("the bag sorted reads as the file says it does", STACK === 20 && said1 === `[{"n": 1, "item": "hoe"}, {"n": 2, "item": "worm"}, {"n": 20, "item": "kangkong"}, {"n": 3, "item": "kangkong"}, null]`, said1);
const said2 = (await one(`select (town.bag_move('{"bag":[{"item":"hoe","n":1},null]}'::jsonb, 0, 1)->'purse'->'bag')::text as r`)).r;
t.check("the thing moved reads as the file says it does", said2 === `[null, {"n": 1, "item": "hoe"}]`, said2);

t.section("the rules are the code's");
const CAT = (await one(`select town.cat('items') as c`)).c;
const ids = Object.keys(ITEMS);
const unlike = ids.filter((id) => !CAT[id] || CAT[id].kind !== ITEMS[id].kind || Number(CAT[id].tier) !== ITEMS[id].tier || Number(CAT[id].stack) !== ITEMS[id].stack);
t.check("the catalog has every thing's kind, tier and stack as the code has them", unlike.length === 0 && Object.keys(CAT).every((id) => ITEMS[id]), unlike.slice(0, 8));
// (a lot that is the same every run)
let seed = 165;
const lot = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (list) => list[Math.floor(lot() * list.length)];
const byKind = (k) => ids.filter((id) => ITEMS[id].kind === k);
const dishes = byKind("dish");
// (a few things of every kind, so that two of one thing meet often; and of what stacks, some that stack high)
const POOL = B.KIND_ORDER.flatMap((k) => { const of = byKind(k); return [of[0], of[of.length - 1], pick(of), pick(of)].filter((id) => id); });
const stackOf = (id) => {
  const most = ITEMS[id].stack, r = lot();
  if (id === "potFull") return { item: id, n: 1, of: { dish: pick(dishes.slice(0, 3)), left: 1 + Math.floor(lot() * 4) } };
  if (id === "can" || id === "bucket") return r < 0.4 ? { item: id, n: 1 } : { item: id, n: 1, water: r < 0.5 ? 0 : 1 + Math.floor(lot() * 6) };
  if (most === 1) return { item: id, n: 1 };
  // (something hung on a stack that the file has never heard of keeps it whole)
  if (r < 0.06) return { item: id, n: 1 + Math.floor(lot() * most), mark: pick(["a", "b"]) };
  return { item: id, n: r < 0.3 ? most : r < 0.4 ? most - 1 : 1 + Math.floor(lot() * most) };
};
const HOLDS = ["potFull", "can", "bucket"].filter((id) => ITEMS[id]);
// (a handful of things that stack, drawn often: two stacks of one thing must meet in many a bag)
const STACKY = POOL.filter((id) => ITEMS[id].stack > 1).filter((id, i, all) => all.indexOf(id) === i).filter((_, i) => i % 5 === 0).slice(0, 6);
const bagBy = (slots, full) => Array.from({ length: slots }, () => (lot() < full ? stackOf(lot() < 0.15 ? pick(HOLDS) : lot() < 0.55 ? pick(STACKY) : pick(POOL)) : null));
// (and what a lot seldom draws, laid by hand and laid again the other way round: pots of one dish with more food and
// less, cans with more water and less, and what no thing of today's is and a later round may make: something hung
// on a thing that stacks, and something with nothing in it hung on one)
const [D0, D1] = dishes, S0 = STACKY[0];
const potOf = (dish, left) => ({ item: "potFull", n: 1, of: { dish, left } });
const SURE = [
  [potOf(D0, 1), potOf(D1, 2), potOf(D0, 3), null, potOf(D0, 3), potOf(D1, 4)],
  [{ item: "can", n: 1 }, { item: "can", n: 1, water: 2 }, null, { item: "can", n: 1, water: 6 }, { item: "can", n: 1, water: 0 }, { item: "can", n: 1, water: 2 }],
  [{ item: S0, n: 3, water: 2 }, { item: S0, n: 4 }, { item: S0, n: 2, of: { dish: D0, left: 1 } }, { item: S0, n: 5, water: 0 }, { item: S0, n: 1, mark: "" }, { item: S0, n: 2, mark: "a" }, { item: S0, n: 2, of: null }, null, { item: S0, n: 2, mark: false }],
];
const BAGS = [[], [null], ...SURE, ...SURE.map((b) => [...b].reverse()), ...Array.from({ length: 260 }, (_, i) => bagBy(1 + (i % 14), 0.35 + (i % 5) * 0.15))];
const kindsMet = new Set(BAGS.flat().filter(Boolean).map((s) => ITEMS[s.item].kind));
t.check("the cases have every kind of thing in them, things that hold something, and stacks with something unknown hung on them",
  B.KIND_ORDER.every((k) => kindsMet.has(k)) && BAGS.flat().some((s) => s?.of) && BAGS.flat().some((s) => s?.water) && BAGS.flat().some((s) => s?.mark) && ITEMS[S0].stack > 5 && D0 !== D1, [...kindsMet]);
let sortedWrong = [], movedWrong = [], joinsWrong = [], moves = 0, joined = 0, swapped = 0, refusedN = 0, gathered = 0;
for (const bag of BAGS) {
  const purse = { ...newPurse(), coins: 7, hand: "hoe", bag };
  const n = bag.length;
  const got = await one(`select town.bag_sort($1::jsonb) as sorted,
    (select jsonb_agg(jsonb_build_array(f, g, town.bag_move($1::jsonb, f, g)) order by f, g) from generate_series(-1, $2::int) f, generate_series(-1, $2::int) g) as moved,
    (select jsonb_agg(town.bag_joins(s.v) order by s.i) from jsonb_array_elements($1::jsonb->'bag') with ordinality s(v, i) where s.v <> 'null'::jsonb) as joins`, [JSON.stringify(purse), n]);
  const want = plain(B.sortBag(purse));
  if (!same(got.sorted, want)) sortedWrong.push({ bag, got: got.sorted?.bag, want: want.bag });
  // (stacks brought together: the bag's stacks are not the ones it had, whatever their order)
  const sizes = (list) => list.filter(Boolean).map((s) => `${s.item}×${s.n}`).sort().join(" ");
  if (sizes(want.bag) !== sizes(bag)) gathered++;
  // (what joins, by the code: a thing moved onto another of itself with room joins it exactly when both do)
  for (const [f, g, did] of got.moved) {
    moves++;
    const code = plain(B.moveSlot(purse, f, g));
    if (!same(did, code)) movedWrong.push({ bag, f, g, got: did, want: code });
    if (!code.ok) refusedN++;
    else if (bag[g] && code.purse.bag[g].n !== bag[f].n) joined++;
    else if (bag[g]) swapped++;
  }
  const things = bag.filter(Boolean);
  // (said again here in today's words, and not by the code's own rule: a pot's food, a can's water, and the mark that stands for whatever comes)
  const codeJoins = things.map((s) => ITEMS[s.item].stack > 1 && !s.of && !s.water && !s.mark);
  if (!same(got.joins ?? [], codeJoins)) joinsWrong.push({ bag, got: got.joins, want: codeJoins });
}
t.check(`town.bag_sort answers every case as the code does (${BAGS.length} bags, ${gathered} of them with stacks brought together)`, sortedWrong.length === 0 && gathered > 40, sortedWrong[0]);
t.check(`town.bag_move answers every case as the code does (${moves} moves: ${joined} joined, ${swapped} changed places, ${refusedN} refused)`,
  movedWrong.length === 0 && joined > 100 && swapped > 1000 && refusedN > 1000, movedWrong[0]);
t.check("town.bag_joins says of every stack what the code's rule says", joinsWrong.length === 0, joinsWrong[0]);
const nulls = await one(`select town.bag_move($1::jsonb, null, 0) as a, town.bag_move($1::jsonb, 0, null) as b, town.bag_move('{}'::jsonb, 0, 1) as c, town.bag_sort('{"coins": 3}'::jsonb) as d`, [JSON.stringify({ bag: [{ item: "hoe", n: 1 }, null] })]);
t.check("no slot at all, and a purse with no bag, are refused and not a crash; sorted, such a purse has an empty bag and what it had",
  same(nulls.a, { ok: false, why: "none" }) && same(nulls.b, { ok: false, why: "none" }) && same(nulls.c, { ok: false, why: "none" }) && same(nulls.d, { coins: 3, bag: [] }), nulls);

t.section("by the functions a member calls");
const pot = (dish, left) => ({ item: "potFull", n: 1, of: { dish, left } });
const MINE = [{ item: "kangkong", n: 5 }, null, { item: "hoe", n: 1 }, { item: "kangkong", n: STACK - 2 }, pot(dishes[0], 3), null, { item: "worm", n: 2 }, pot(dishes[0], 1), { item: "can", n: 1, water: 4 }, null, null, { item: "kangkong", n: 4 }];
const THEIRS = [{ item: "worm", n: 3 }, null, { item: "hoe", n: 1 }, null, null, null, null, null, null, null];
await lay(U.m1, MINE, { hand: "hoe" }, 321);
await lay(U.m2, THEIRS, {}, 55);
const theirsWas = await kept(U.m2), deedsWas = await lastDeed();
const view = async (who) => (await one(`select town.purse_of($1, false) as p`, [who])).p;
const rest = (p) => { const { bag: _bag, ...r } = p; return r; };
const viewWas = await view(U.m1);
const can = await call(U.m1, "town_bag");
t.check("a page is told a bag can be put in order here, and nothing of anybody's", can?.ok === true && can.tidy === true && typeof can.now === "number" && same(Object.keys(can).sort(), ["now", "ok", "tidy"]), can);

let did = await call(U.m1, "town_bag_move", { p_from: 0, p_to: 1 });
let code = B.moveSlot({ ...newPurse(), bag: MINE }, 0, 1).purse.bag;
t.check("a thing moved into an empty slot: answered with the bag as the code leaves it", did?.ok === true && same(did.purse?.bag, plain(code)) && did.purse.bag[0] === null && did.purse.bag[1].item === "kangkong", did?.purse?.bag ?? did);
t.check("…and kept so", same((await kept(U.m1)).doc.bag, plain(code)), (await kept(U.m1)).doc.bag);
did = await call(U.m1, "town_bag_move", { p_from: 1, p_to: 3 });
code = B.moveSlot({ ...newPurse(), bag: code }, 1, 3).purse.bag;
t.check("onto more of itself it joins as far as a slot holds, what does not fit staying where it was", did?.ok === true && same(did.purse.bag, plain(code)) && did.purse.bag[3].n === STACK && did.purse.bag[1].n === 3, did?.purse?.bag ?? did);
did = await call(U.m1, "town_bag_move", { p_from: 4, p_to: 7 });
code = B.moveSlot({ ...newPurse(), bag: code }, 4, 7).purse.bag;
t.check("two pots of one dish change places, each with its own food", did?.ok === true && same(did.purse.bag, plain(code)) && did.purse.bag[4].of.left === 1 && did.purse.bag[7].of.left === 3, did?.purse?.bag ?? did);
did = await call(U.m1, "town_bag_move", { p_from: 2, p_to: 8 });
code = B.moveSlot({ ...newPurse(), bag: code }, 2, 8).purse.bag;
t.check("a thing changes places with another, which keeps what it holds", did?.ok === true && same(did.purse.bag, plain(code)) && did.purse.bag[2].water === 4 && did.purse.bag[8].item === "hoe", did?.purse?.bag ?? did);
const afterMoves = await kept(U.m1);
for (const [from, to, what] of [[5, 0, "an empty slot to move from"], [3, 3, "the same slot twice"], [0, 12, "a slot the bag has not"], [-1, 0, "a slot before the first"], [null, 0, "no slot at all"]]) {
  const r = await call(U.m1, "town_bag_move", { p_from: from, p_to: to });
  t.check(`${what}: refused (none), and nothing is written`, r?.ok === false && r.why === "none" && same(r.purse?.bag, afterMoves.doc.bag) && same(await kept(U.m1), afterMoves), r?.purse?.bag ?? r);
}
did = await call(U.m1, "town_bag_sort");
code = B.sortBag({ ...newPurse(), bag: code }).bag;
t.check("the bag sorted: answered with the bag as the code leaves it, split stacks brought together", did?.ok === true && same(did.purse?.bag, plain(code))
  && same(did.purse.bag.map((s) => (s ? `${s.item}×${s.n}` : null)), ["can×1", "hoe×1", "potFull×1", "potFull×1", "worm×2", `kangkong×${STACK}`, "kangkong×7", null, null, null, null, null])
  && same(did.purse.bag.slice(2, 4).map((s) => s.of.left), [3, 1]), did?.purse?.bag ?? did);
t.check("…and kept so", same((await kept(U.m1)).doc.bag, plain(code)), (await kept(U.m1)).doc.bag);
const again = await call(U.m1, "town_bag_sort");
t.check("sorted again it is as it was", again?.ok === true && same(again.purse.bag, plain(code)), again?.purse?.bag ?? again);
const viewNow = await view(U.m1);
const count = (bag) => { const all = {}; for (const s of bag) if (s) all[s.item] = (all[s.item] ?? 0) + s.n; return all; };
t.check("nothing was made and nothing lost, and the bag has the slots it had", same(count(viewNow.bag), count(MINE)) && viewNow.bag.length === MINE.length, count(viewNow.bag));
t.check("the coins, the hand and all the rest of the purse are as they were", viewNow.coins === 321 && handOf(viewNow) === "hoe" && same(rest(viewNow), rest(viewWas)), [rest(viewNow), rest(viewWas)]);
t.check("nobody else's purse was touched", same(await kept(U.m2), theirsWas), await kept(U.m2));
t.check("neither is written down among the deeds", (await lastDeed()) === deedsWas, await lastDeed());
t.check("the answer is a deed's: the purse and the moment, and no more", same(Object.keys(did).sort(), ["now", "ok", "purse"]) && typeof did.now === "number", Object.keys(did));

t.section("who may");
const before = await kept(U.m1);
for (const [fn, words] of [["town_bag", {}], ["town_bag_move", { p_from: 0, p_to: 1 }], ["town_bag_sort", {}]]) {
  const out = await call("anon", fn, words);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, /permission denied/.test(out.error ?? "") && await (async () => {
    for (const who of ["unver", "nochar"]) {
      await lay(U[who], [{ item: "worm", n: 2 }, null, { item: "hoe", n: 1 }, { item: "worm", n: 5 }]);
      const was = await kept(U[who]);
      const r = await call(U[who], fn, words);
      if (r?.ok === true || r?.code !== "42501" || !same(await kept(U[who]), was)) return false;
    }
    return true;
  })(), out);
}
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
await lay(U.m1, [{ item: "worm", n: 2 }, null, { item: "hoe", n: 1 }], {}, 9);
const shut = await kept(U.m1);
const closed = [await call(U.m1, "town_bag_move", { p_from: 0, p_to: 1 }), await call(U.m1, "town_bag_sort"), await call(U.m1, "town_bag")];
t.check("with the game not open a member puts nothing in order", closed.every((r) => r?.code === "42501") && same(await kept(U.m1), shut), closed);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
for (const [name, sql] of [["town.bag_move", `select town.bag_move('{"bag":[{"item":"hoe","n":1},null]}'::jsonb, 0, 1)`], ["town.bag_sort", `select town.bag_sort('{"bag":[]}'::jsonb)`], ["town.bag_joins", `select town.bag_joins('{"item":"hoe","n":1}'::jsonb)`]]) {
  const r = await t.as(U.m1, sql);
  t.check(`${name} is no member's to call`, r.code === "42501", r);
}
t.check("…and what was m1's before all that is not what is asked about: a purse is only ever the asker's", !same(before, shut) && same(await kept(U.m2), theirsWas), null);

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const exit = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(exit);
