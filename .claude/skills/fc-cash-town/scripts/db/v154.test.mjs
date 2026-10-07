/*
 * v154 (the squirrel fetches twenty times to a meal's hours) tried against the stand-in database as it is after v153
 * (stand-in.mjs's snapshot, loaded in a second, in memory: nothing is written anywhere).
 *
 *   node v154.test.mjs <the worktree's root>          (MIGRATION_FILE=<a file> tries that one)
 *
 * It reads the draft beside this file while supabase/ has no v154 (then supabase/'s, then history once it has run),
 * v153.forest.calls.json (the forest's rule cases' calls; the three the file gives a third word are named here), and,
 * in ./lines/v154/ beside this file (write them first, in the worktree:
 *   TOWN_VECTORS=<this folder>/lines/v154 npx vitest run lib/town/db-vectors-gifts-forest.test.ts ):
 *   catalog.json                the catalog as the worktree's code has it
 *   vectors-gifts-forest.json   the forest's rule cases, every one (the squirrel's count among them)
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { standIn } from "./stand-in.mjs";
import { U, migration } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const [root] = process.argv.slice(2);
if (!root) { console.log("node v154.test.mjs <the worktree's root>"); process.exit(2); }
const db = (name) => join(root, ".claude/skills/fc-cash-town/scripts/db", name);
const here = (name) => new URL(`./lines/v154/${name}`, import.meta.url);
const lf = (s) => s.split("\r\n").join("\n");
if (!existsSync(here("catalog.json"))) { console.log("no lines/v154/catalog.json: run the forest's rule cases with TOWN_VECTORS first (see this file's head)"); process.exit(2); }
const inRepo = existsSync(join(root, "supabase")) ? readdirSync(join(root, "supabase")).find((f) => f.startsWith("v154_")) : null;
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8")
  : inRepo ? readFileSync(join(root, "supabase", inRepo), "utf8") : existsSync(db("v154_draft.sql")) ? readFileSync(db("v154_draft.sql"), "utf8") : migration(154));
const CODE = JSON.parse(readFileSync(here("catalog.json"), "utf8"));
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);

const t0 = Date.now();
const t = await standIn();
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map(param));
  return r.error ? r : r.rows[0].r;
};
const purseOf = async (who) => (await one(`select doc from public.town_purses where member_id = $1`, [who]))?.doc;
const deeds = async (what) => (await t.sql(`select member_id, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what = $1 order by id`, [what])).rows;
const give = async (who, gifts) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = jsonb_set(coalesce(doc, '{}'::jsonb), '{gifts}', $2::jsonb) where member_id = $1`, [who, JSON.stringify({ had: [], charms: [], owed: 0, familiar: null, used: {}, ...gifts })]);
};
const patch = async (who, fields) => {
  await t.sql(`insert into public.town_purses (member_id) values ($1) on conflict (member_id) do nothing`, [who]);
  await t.sql(`update public.town_purses set doc = coalesce(doc, '{}'::jsonb) || $2::jsonb where member_id = $1`, [who, JSON.stringify(fields)]);
};

t.section("v154, twice over");
const was = (await one(`select data from public.town_catalog where key = 'gifts'`)).data;
t.check("before it the squirrel is not counted", !("famSquirrel" in was.uses), was.uses);
await t.runTwice(FILE, "v154");
const row = (await one(`select data from public.town_catalog where key = 'gifts'`)).data;
t.check("the catalog's gifts row is the code's: the squirrel twenty to a meal's hours, every other number as it was",
  same(row, CODE.gifts) && same(row.uses.famSquirrel, { n: 20, per: "meal" }) && same({ ...row, uses: { ...row.uses, famSquirrel: undefined } }, { ...was, uses: { ...was.uses, famSquirrel: undefined } }), row.uses);
const others = (await t.sql(`select key, data from public.town_catalog where key <> 'gifts'`)).rows.filter((r) => CODE[r.key] !== undefined && !same(r.data, CODE[r.key])).map((r) => r.key);
t.check("every other row of the catalog is the code's still", others.length === 0, others);
const bare = await bareWrites((q) => t.sql(q).then((r) => r.rows));
t.check("no function writes to a table with no WHERE", bare.length === 0, bare);
const g = await one(`select has_function_privilege('authenticated', p.oid, 'execute') as member, has_function_privilege('anon', p.oid, 'execute') as anon, p.prosecdef as definer
  from pg_proc p where p.oid = 'public.town_gather(integer, integer, integer, jsonb)'::regprocedure`);
t.check("public.town_gather: for the signed in, not for the signed out, security definer", g?.member === true && g.anon === false && g.definer === true, g);
const open = (await t.sql(`select n.nspname || '.' || p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'town' and (has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute'))`)).rows.map((r) => r.name);
t.check("no rule of schema town is for anybody to call", open.length === 0, open);
const forms = await one(`select to_regprocedure('town.wild_fetches(jsonb, text)') is null and to_regprocedure('town.wild_reach(jsonb, text)') is null and to_regprocedure('town.wild_cost(jsonb, jsonb)') is null as gone,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and p.proname in ('wild_fetches', 'wild_reach', 'wild_cost', 'gather')) as n`);
t.check("the forms of two words are gone, and there is one of each rule", forms.gone === true && forms.n === 4, forms);

if (process.env.RULES !== "0") {
  const vectors = JSON.parse(readFileSync(here("vectors-gifts-forest.json"), "utf8"));
  const CALL = { ...JSON.parse(readFileSync(db("v153.forest.calls.json"), "utf8")),
    wild_fetches: "to_jsonb(town.wild_fetches($1::jsonb, $2::text, $3::bigint))", wild_reach: "to_jsonb(town.wild_reach($1::jsonb, $2::text, $3::bigint))",
    wild_cost: "to_jsonb(town.wild_cost($1::jsonb, $2::jsonb, $3::bigint))" };
  t.section(`the forest's rule cases: ${vectors.length}, each as the code answers it`);
  const tally = new Map();
  for (const v of vectors) {
    const r = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    tally.set(v.fn, r);
    r.n++;
    const sql = CALL[v.fn];
    if (!sql) { r.bad++; r.first ??= `no SQL for ${v.fn}`; continue; }
    let got, error = null;
    try { got = (await t.db.query(`select ${sql} as r`, v.args.map(param))).rows[0].r; } catch (e) { error = e.message; }
    if (typeof got === "bigint") got = Number(got);
    if (error || !same(got ?? null, v.want)) { r.bad++; r.first ??= { args: v.args, want: v.want, got: error ?? got }; }
  }
  for (const [fn, r] of tally) t.check(`${fn}: ${r.n} cases`, r.bad === 0, r.bad ? `${r.bad} differ; the first: ${JSON.stringify(r.first).slice(0, 2400)}` : "");
}

// ── through what a member calls ──
const F = CODE.forest, MOST = CODE.gifts.uses.famSquirrel.n;
const day = (await one(`select town.day_of(town.now_ms()) as d`)).d;
const stamina = async (who) => { const p = await purseOf(who); return p?.stamina?.day === day ? p.stamina.left : 100; };
const used = async (who) => (await one(`select town.used_of(doc, 'famSquirrel', town.now_ms()) as n from public.town_purses where member_id = $1`, [who])).n;
const emptyBag = (who) => patch(who, { bag: Array(10).fill(null), hand: null });
const places = (await t.sql(`select i, town.wild_holds(i, town.now_ms()) as has from generate_series(0, $1::int - 1) as i`, [F.spots.length])).rows
  .filter((r) => r.has).map((r) => ({ id: r.i, kind: F.spots[r.i][0], x: F.spots[r.i][1], y: F.spots[r.i][2], how: F.kinds[F.spots[r.i][0]].how, ...r.has }));
const picks = places.filter((p) => p.how === "pick");
t.section(`the squirrel through a member's own calls: ${picks.length} places with something on the ground now`);
t.check("the stand-in's forest has more places to pick up from than the squirrel's count and three", picks.length >= MOST + 3, picks.length);
await give(U.m2, { had: ["famSquirrel"], familiar: "famSquirrel" });
let did, deed, last = null;
for (let i = 0; i < MOST; i++) {
  const p = picks[i];
  await emptyBag(U.m2);
  did = await call(U.m2, "town_gather", p.id, p.x + 2, p.y, { misses: 0, wrong: 0 });
  if (!did?.ok || (await used(U.m2)) !== i + 1) { last = { i, did, used: await used(U.m2) }; break; }
  if (i === 0 || i === MOST - 1) {
    deed = (await deeds("gather")).at(-1);
    t.check(`fetch ${i + 1}: from two tiles off, for no stamina, counted, and written down as the squirrel's with ${MOST - i - 1} left`,
      (await stamina(U.m2)) === 100 && deed?.member_id === U.m2 && deed.doc.by === "famSquirrel" && deed.doc.left === MOST - i - 1 && deed.thing === p.item && deed.coins === 0, { deed, left: await stamina(U.m2) });
  }
}
t.check(`${MOST} fetches in these hours, each counted once`, last === null && (await used(U.m2)) === MOST, last);
const [x, y, z] = picks.slice(MOST);
await emptyBag(U.m2);
did = await call(U.m2, "town_gather", x.id, x.x + 2, x.y, { misses: 0, wrong: 0 });
t.check("past the count, two tiles off is too far, and nothing is taken or counted", did?.ok === false && did.why === "far" && (await used(U.m2)) === MOST && (await stamina(U.m2)) === 100, did);
did = await call(U.m2, "town_gather", x.id, x.x + 1, x.y, { misses: 0, wrong: 0 });
deed = (await deeds("gather")).at(-1);
t.check("…and from beside it the thing is picked up by hand: for its stamina, not the squirrel's in the deed, nothing more counted",
  did?.ok === true && (await stamina(U.m2)) === 100 - F.kinds[x.kind].cost && deed?.member_id === U.m2 && deed.thing === x.item && !("by" in deed.doc) && !("left" in deed.doc) && (await used(U.m2)) === MOST, { did: did?.got ?? did, deed });
// (the count is of these hours: one kept from the hours before is no count)
const kept = (await purseOf(U.m2)).gifts.used.famSquirrel;
await give(U.m2, { had: ["famSquirrel"], familiar: "famSquirrel", used: { famSquirrel: { k: kept.k - 1, n: MOST } } });
await emptyBag(U.m2);
did = await call(U.m2, "town_gather", y.id, y.x + 2, y.y, { misses: 0, wrong: 0 });
t.check("a count of the hours before is no count: it fetches again, and that is the first of these", did?.ok === true && (await used(U.m2)) === 1 && same((await purseOf(U.m2)).gifts.used.famSquirrel, { k: kept.k, n: 1 }), did?.got ?? did);
// (a fetch refused counts nothing)
await patch(U.m2, { bag: Array(10).fill({ item: "rod", n: 1 }), hand: null });
did = await call(U.m2, "town_gather", z.id, z.x + 2, z.y, { misses: 0, wrong: 0 });
t.check("a fetch with no room in the bag is refused and counts nothing", did?.ok === false && did.why === "full" && (await used(U.m2)) === 1, did);
// (somebody with no squirrel: as ever)
await give(U.m1, {}); await emptyBag(U.m1);
did = await call(U.m1, "town_gather", z.id, z.x + 2, z.y, { misses: 0, wrong: 0 });
t.check("without a squirrel, two tiles off is too far", did?.ok === false && did.why === "far", did);
did = await call(U.m1, "town_gather", z.id, z.x, z.y, { misses: 0, wrong: 0 });
deed = (await deeds("gather")).at(-1);
t.check("…and at the place it is picked up by hand for its stamina, with nothing counted", did?.ok === true && (await stamina(U.m1)) === 100 - F.kinds[z.kind].cost && !("by" in deed.doc) && !((await purseOf(U.m1)).gifts?.used?.famSquirrel), { did: did?.got ?? did, deed });
// (what is not picked up with no game is its member's own, and counts nothing)
const shake = places.find((p) => p.how === "shake" || p.how === "choose");
if (shake) {
  await give(U.m2, { had: ["famSquirrel"], familiar: "famSquirrel" }); await emptyBag(U.m2);
  did = await call(U.m2, "town_gather", shake.id, shake.x + 1, shake.y, { misses: 0, wrong: 0 });
  t.check("what grows or hangs is still its member's to gather, and counts none of the squirrel's fetches", did?.ok === true && (await used(U.m2)) === 0, did?.got ?? did);
}

t.done();
console.log(`${((Date.now() - t0) / 1000).toFixed(1)} s`);
const code = process.exitCode ?? 0;
try { await t.db.close(); } catch { /* closed */ }
process.exit(code);
