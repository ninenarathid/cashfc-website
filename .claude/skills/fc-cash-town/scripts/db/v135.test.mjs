/*
 * v135 — the uncle's hints come by chance: dry run in PGlite.
 *
 * v135 writes v106's two rules again with a number of chance as their fourth word (`town.next_hint`,
 * `town.buy_hint`: one of the hints the buyer has neither heard nor found, of the earliest tier there is one of),
 * drops the three-word ones, and writes v121's `town_hint` again to hand the rule `random()`.
 *
 * v105 to v120 are replayed as they ran, the file is shown to stop there, then v121 to v131 in the order they ran
 * (and v130, v132, v133 and v134 after them, where this tree has them), then v135 twice. Then: every case of the two
 * rules made from the code as it is; the cases of v106 asked with a fourth word of nothing, which are what the rules
 * answered before the file; the draw seen to be even; the three functions held to the text they replace but for the
 * lines meant; and the keeping: members who buy as many do not hear the same, every hint is heard once, a tier at a
 * time at its tier's price, the deeds, who may.
 *
 *   node v135.test.mjs            (RULES=0 skips the cases; RULES=few puts one in four, for the breaks)
 *   node mutate.mjs v135_draft.sql v135.test.mjs v135.mutations.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const here = (name) => new URL(`./${name}`, import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : existsSync(here("v135_draft.sql")) ? readFileSync(here("v135_draft.sql"), "utf8") : migration(135);
// (one in four of each rule's own cases: the two rules' cases come in turn, so one in four of the list would be one rule's alone)
const pick = (list) => { const seen = {}; return process.env.RULES === "0" ? [] : process.env.RULES === "few" ? list.filter((c) => (seen[c.fn] = (seen[c.fn] ?? -1) + 1) % 4 === 0 || c.want === null) : list; };
const cases = pick(JSON.parse(readFileSync(here("now/vectors-v135.json"), "utf8")));
// (v106's own cases of the two rules: what the code answers with no chance in it)
const plain = pick(JSON.parse(readFileSync(here("now/vectors-v106.json"), "utf8")).filter((c) => c.fn === "next_hint" || c.fn === "buy_hint"));

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

const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const param = (v) => (v === null ? null : typeof v === "object" ? JSON.stringify(v) : v);
const lf = (s) => s.split("\r\n").join("\n");
const words = (sql0, name) => { const sql = lf(sql0); const at = sql.lastIndexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("$$;", sql.indexOf("as $$", at) + 5) + 3); };

const t = await supabaseLike({ extra });
for (let n = 105; n <= 120; n++) await t.run(migration(n), `v${n}`);
const V106 = migration(106);

t.section("it will not run before v121");
{
  let stopped = null;
  try { await t.db.exec(FILE); } catch (e) { stopped = e.message; }
  t.check("run before v121, it stops at its first line and says why", !!stopped && /v121 has not run/.test(stopped), stopped);
  const v = await t.sql(`select to_regprocedure('town.next_hint(jsonb, jsonb, integer)') is not null as old_rule, to_regprocedure('town.next_hint(jsonb, jsonb, integer, double precision)') is null as no_new_rule`);
  t.check("…having done nothing", v.rows[0].old_rule && v.rows[0].no_new_rule, v.rows);
}
const V121 = migration(121);
await t.run(V121, "v121");
// (in the order they ran: the well's v127 to v129 before the insects' v126 and v131; then what was written after, where this tree has it)
for (const n of [122, 123, 124, 125, 127, 128, 129, 126, 131, 130, 132, 133, 134]) {
  let sql = null;
  try { sql = migration(n); } catch { /* not written yet, or not this tree's */ }
  if (sql) await t.run(sql, `v${n}`);
}
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);

/* ── before the file: the rules as v106 wrote them ───────────────────────── */

const CALL3 = { next_hint: "town.next_hint($1::jsonb, $2::jsonb, $3::int)", buy_hint: "town.buy_hint($1::jsonb, $2::jsonb, $3::int)" };
const CALL4 = { next_hint: "town.next_hint($1::jsonb, $2::jsonb, $3::int, $4::float8)", buy_hint: "town.buy_hint($1::jsonb, $2::jsonb, $3::int, $4::float8)" };
const ask = async (sql, args) => { try { return { got: (await t.db.query(`select ${sql} as r`, args.map(param))).rows[0].r ?? null }; } catch (e) { return { error: e.message }; } };
const tallied = async (list, call, more = []) => {
  const tally = new Map();
  for (const v of list) {
    const { got, error } = await ask(call[v.fn], [...v.args, ...more]);
    const row = tally.get(v.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (error || !same(got, v.want)) { row.bad++; row.first ??= { stage: v.args[2], r: v.args[3], want: v.want?.hint ?? v.want?.why ?? v.want, got: error ?? got?.hint ?? got?.why ?? got }; }
    tally.set(v.fn, row);
  }
  return tally;
};
t.section(`before the file: v106's own cases of the two rules (${plain.length}), which the code now answers with no chance in it`);
{
  const tally = await tallied(plain, CALL3);
  for (const [fn, row] of tally) t.check(`v106's ${fn} answers them as the code does with nothing for chance: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 600)}` : "");
  if (plain.length) t.check("both of v106's rules were asked", tally.has("next_hint") && tally.has("buy_hint"), [...tally.keys()]);
}
const cat = (await t.sql(`select town.cat('hints') as hints, town.cat('items') as items`)).rows[0];
const tierOf = (id) => cat.items[id]?.tier, priceOf = (id) => cat.hints.price[tierOf(id)];
/** Those the uncle has for somebody who knows nothing, with so many orders filled: all of them, and the early game's. */
const hasAt = (stage) => cat.hints.ids.filter(([, at]) => at >= 0 && at <= stage).map(([id]) => id);
const earlyAt = (stage) => hasAt(stage).filter((id) => tierOf(id) === Math.min(...hasAt(stage).map(tierOf)));

await t.runTwice(FILE, "v135");

/* ── the rules, case by case ─────────────────────────────────────────────── */

t.section(`a hint drawn by chance: ${cases.length} cases, each as the site's own code answers it`);
{
  const tally = await tallied(cases, CALL4);
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 600)}` : "");
  if (cases.length) t.check("both rules were asked", tally.has("next_hint") && tally.has("buy_hint"), [...tally.keys()]);
  // v106's own cases, with a fourth word that is nothing: the answers of before the file
  for (const [label, more] of [["0", [0]], ["no number", [null]]]) {
    const again = await tallied(plain, CALL4, more);
    t.check(`with ${label} for chance, both rules answer v106's cases as v106's own did: the first he has`, [...again.values()].every((row) => row.bad === 0) && (!plain.length || again.size === 2),
      [...again].filter(([, row]) => row.bad).map(([fn, row]) => [fn, row.bad, row.first]));
  }
}

/* ── which of them, and how evenly ───────────────────────────────────────── */

t.section("which of them a number of chance draws");
{
  const early = earlyAt(0), n = early.length;
  const byTier = (stage) => [1, 2, 3].map((tier) => hasAt(stage).filter((id) => tierOf(id) === tier).length);
  console.log(`  (hints he has for somebody who knows nothing, by tier: ${byTier(0).join(" / ")} with nothing open yet, ${byTier(999).join(" / ")} with everything open)`);
  t.check("with nothing open yet he has a good many of the early game's for somebody who knows nothing", n >= 20 && hasAt(999).length > hasAt(0).length, { n, at0: byTier(0), all: byTier(999) });
  // a thousand numbers evenly over 0 up to 1
  const drawn = (await t.sql(`select town.next_hint('{}'::jsonb, '[]'::jsonb, 0, (g + 0.5) / 1000.0) as hint, count(*)::int as times from generate_series(0, 999) g group by 1`)).rows;
  const times = drawn.map((r) => r.times);
  t.check("every one of them is drawn, and no other", same(drawn.map((r) => r.hint).sort(), [...early].sort()), { drawn: drawn.length, n });
  t.check("each as often as any other", Math.max(...times) - Math.min(...times) <= 1 && Math.min(...times) >= Math.floor(1000 / n), { most: Math.max(...times), least: Math.min(...times), n });
  // (each asked by itself and never thrown: a rule that falls over at one of these is a FAIL here, not a dry run that stops)
  const ends = {};
  for (const [name, r] of [["zero", "0"], ["nan", "'NaN'::float8"], ["below", "'-Infinity'::float8"], ["one", "1"], ["above", "'Infinity'::float8"], ["huge", "1e300"], ["nearly", "0.999999999"]]) {
    const a = await ask(`town.next_hint('{}'::jsonb, '[]'::jsonb, 0, ${r})`, []);
    ends[name] = a.error ?? a.got;
  }
  t.check("nothing, what is no number and what is under nothing draw the first; 1, nearly 1 and what is over draw the last", ends.zero === early[0] && ends.nan === early[0] && ends.below === early[0]
    && ends.one === early[n - 1] && ends.above === early[n - 1] && ends.huge === early[n - 1] && ends.nearly === early[n - 1], { ends, first: early[0], last: early[n - 1] });
  // somebody who has heard all the early game's but two, with everything open: those two only, though the next tier has many
  const all = hasAt(999), tier1 = all.filter((id) => tierOf(id) === 1), two = [tier1[3], tier1[tier1.length - 2]];
  const heard = JSON.stringify({ hints: tier1.filter((id) => !two.includes(id)) });
  const few = (await t.sql(`select town.next_hint($1::jsonb, '[]'::jsonb, 999, (g + 0.5) / 200.0) as hint, count(*)::int as times from generate_series(0, 199) g group by 1`, [heard])).rows;
  t.check("of an early tier nearly heard out, only what is left of it is drawn, half and half, though the next tier has many", same(few.map((r) => r.hint).sort(), [...two].sort()) && few.every((r) => r.times === 100)
    && all.filter((id) => tierOf(id) === 2).length > 10, few);
  const next = (await t.sql(`select town.next_hint($1::jsonb, $2::jsonb, 999, (g + 0.5) / 300.0) as hint from generate_series(0, 299) g`, [JSON.stringify({ hints: tier1.slice(0, 20), recipes: tier1.slice(20) }), "[]"])).rows.map((r) => r.hint);
  t.check("heard out (some bought, the rest read), the next tier's are drawn, and many of them", next.every((id) => tierOf(id) === 2) && new Set(next).size === all.filter((id) => tierOf(id) === 2).length, { different: new Set(next).size });
  const none = (await t.sql(`select town.next_hint('{}'::jsonb, $1::jsonb, 999, 0.5) as hint, town.buy_hint('{"coins": 1000}'::jsonb, $1::jsonb, 999, 0.5) as bought`, [JSON.stringify(all)])).rows[0];
  t.check("everything found by the village already, nothing is drawn and nothing sold", none.hint === null && same(none.bought, { ok: false, why: "none" }), none);
  // handed random(), as a buying hands it
  const by = (await t.sql(`select town.next_hint('{}'::jsonb, '[]'::jsonb, 0, random()) as hint from generate_series(1, 400)`)).rows.map((r) => r.hint);
  t.check("handed random() four hundred times, it draws most of them, and only them", new Set(by).size > n * 0.8 && by.every((id) => early.includes(id)), { different: new Set(by).size, n });
}

/* ── what is written again ───────────────────────────────────────────────── */

t.section("the functions written again are the ones they replace, word for word but for the lines meant");
{
  const held = (name, from, whose, lines) => {
    const old = words(from, name), now = words(FILE, name);
    let made = old, once = true;
    for (const [a, b] of lines) { if (!made || made.split(a).length !== 2) once = false; else made = made.replace(a, () => b); }
    t.check(`${name} is ${whose}'s, but for ${lines.length === 1 ? "the one line" : `the ${lines.length} lines`} meant`, !!old && !!now && once && old !== now && made === now,
      !old ? `not found in ${whose}` : !now ? "not in the file" : !once ? `a line meant is not in ${whose}'s once` : "it differs elsewhere");
  };
  held("public.town_hint", V121, "v121", [
    ["(town.thing('village', false)->>'unlocked')::int);", "(town.thing('village', false)->>'unlocked')::int, random());"],
  ]);
  held("town.buy_hint", V106, "v106", [
    ["create or replace function town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer)", "create or replace function town.buy_hint(p_purse jsonb, p_found jsonb, p_stage integer, p_r double precision)"],
    ["  hint text := town.next_hint(p_purse, p_found, p_stage);", "  hint text := town.next_hint(p_purse, p_found, p_stage, p_r);"],
  ]);
  // (the rule that draws is written anew; what it leaves out is v106's, to the word)
  const was = words(V106, "town.next_hint"), is = words(FILE, "town.next_hint");
  const left = ["     where (e->>1)::int between 0 and p_stage", "       and not coalesce(p_purse->'hints', '[]'::jsonb) ? (e->>0)", "       and not coalesce(p_purse->'recipes', '[]'::jsonb) ? (e->>0)", "       and not coalesce(p_found, '[]'::jsonb) ? (e->>0)"];
  t.check("the rule that draws leaves out what v106's left out, to the word: what is not open yet, what was heard, read, or found by the village",
    !!was && !!is && left.every((line) => is.includes(line) && was.includes(line.trim())), left.filter((line) => !is?.includes(line) || !was?.includes(line.trim())));
  const made = [...lf(FILE).matchAll(/create or replace function ((?:town|public)\.[a-z_]+)\(/g)].map((m) => m[1]);
  t.check("the file makes three functions: the two rules, and the one a member calls", same(made.sort(), ["public.town_hint", "town.buy_hint", "town.next_hint"]), made);
  const bare = lf(FILE).replace(/--.*$/gm, "");
  t.check("and writes no table, no row of the catalog and no knob", !/\b(create table|alter table|insert into|update |delete from)\b/i.test(bare), bare.match(/\b(create table|alter table|insert into|update |delete from)\b/gi));
}

/* ── the closing block ───────────────────────────────────────────────────── */

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select to_regprocedure('town.next_hint(jsonb, jsonb, integer, double precision)') is not null as by_chance,
  to_regprocedure('town.buy_hint(jsonb, jsonb, integer, double precision)') is not null as bought_by_chance,
  to_regprocedure('town.next_hint(jsonb, jsonb, integer)') is null and to_regprocedure('town.buy_hint(jsonb, jsonb, integer)') is null as old_gone`);
t.check("the two rules take a number of chance", v.rows[0].by_chance === true && v.rows[0].bought_by_chance === true, v.rows);
t.check("and the three-word ones are gone", v.rows[0].old_gone === true, v.rows);
v = await t.sql(`select count(distinct x.hint)::int as different, count(*)::int as draws,
    min((town.cat('items')->x.hint->>'tier')::int) as tier_from, max((town.cat('items')->x.hint->>'tier')::int) as tier_to
  from (select town.next_hint('{}'::jsonb, '[]'::jsonb, (town.thing('village', false)->>'unlocked')::int, random()) as hint from generate_series(1, 200)) x`);
t.check("two hundred draws for somebody who has heard nothing: twenty or more different hints, every one the early game's", v.rows[0].different >= 20 && v.rows[0].draws === 200 && v.rows[0].tier_from === 1 && v.rows[0].tier_to === 1, v.rows);
v = await t.sql(`select has_function_privilege('authenticated', 'public.town_hint()', 'execute') as hint, has_function_privilege('anon', 'public.town_hint()', 'execute') as hint_anon,
  (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("buying a hint is a member's and nobody's signed out, and the rules are no browser's", same(v.rows[0], { hint: true, hint_anon: false, open: 0 }), v.rows);

/* ── the keeping ─────────────────────────────────────────────────────────── */

const rpc = async (who, fn) => { const r = await t.as(who, `select public.${fn}() as r`); return r.error ? { error: r.error } : r.rows[0].r; };
const purse = (who, coins, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || $3::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify(more)]);
const kept = async (who) => (await t.sql(`select coins, doc->'hints' as hints from public.town_purses where member_id = $1`, [who])).rows[0];
const deeds = async (who) => (await t.sql(`select thing, n::float8 as n, coins::float8 as coins from public.town_deeds where member_id = $1 and what = 'hint' order by id`, [who])).rows;
const village = (unlocked) => t.sql(`update public.town_things set doc = doc || jsonb_build_object('unlocked', $1::int) where key = 'village'`, [unlocked]);
const found = (list) => t.sql(`update public.town_things set doc = $1::jsonb where key = 'found'`, [JSON.stringify(list)]);
const buyers = [U.m1, U.m2, U.admin];

t.section("hints bought, by three members");
{
  const stage = (await t.sql(`select (town.thing('village', false)->>'unlocked')::int as n, town.thing('found', false) as found`)).rows[0];
  const early = earlyAt(stage.n), price = priceOf(early[0]);
  const lists = [];
  for (const who of buyers) {
    await purse(who, 6 * price + 3);
    const got = [];
    let fine = true;
    for (let i = 0; i < 6; i++) {
      const did = await rpc(who, "town_hint");
      if (did.ok !== true || typeof did.hint !== "string" || did.purse?.coins !== 6 * price + 3 - (i + 1) * price || !did.purse.hints.includes(did.hint)) fine = false;
      got.push(did.hint ?? did.why ?? did.error);
    }
    lists.push(got);
    const row = await kept(who), lines = await deeds(who);
    t.check(`${who === U.admin ? "an admin" : who === U.m1 ? "a member" : "another"} buys six: each named in the answer, each ${price} coins, all six kept in the purse in the order they came`,
      fine && row.coins === 3 && same(row.hints, got), { got, coins: row.coins, hints: row.hints });
    t.check("…six different hints, every one the early game's, none found by the village already", new Set(got).size === 6 && got.every((id) => early.includes(id) && !(stage.found ?? []).includes(id)), got);
    t.check("…and six deeds written down: the hint, one of it, the coins it cost", lines.length === 6 && same(lines.map((l) => l.thing), got) && lines.every((l) => l.n === 1 && l.coins === -price), lines);
  }
  t.check("the three do not hear the same six in the same order", new Set(lists.map((l) => l.join())).size === 3, lists);
  t.check("nor is any of the three the first six he has, as they are listed", lists.every((l) => l.join() !== early.slice(0, 6).join()), { lists, listed: early.slice(0, 6) });
  // only of what can be made with what his shelf has open: heard out at this stage, nothing is sold, though he would have more with more open
  await purse(U.m2, 100000, { hints: hasAt(stage.n) });
  const out = await rpc(U.m2, "town_hint");
  t.check("somebody who has heard all he has with what is open now is sold nothing, though more would be open later", out.ok === false && out.why === "none" && (await kept(U.m2)).coins === 100000 && hasAt(999).length > hasAt(stage.n).length, out);
  // no coins
  await purse(U.m1, price - 1);
  const poor = await rpc(U.m1, "town_hint"), row = await kept(U.m1);
  t.check("with a coin too few nothing is sold: coins, and nothing kept or written down", poor.ok === false && poor.why === "coins" && row.coins === price - 1 && (row.hints ?? []).length === 0 && (await deeds(U.m1)).length === 6, { poor, row });
}

t.section("bought to the end");
{
  await village(999);
  const all = hasAt(999), hidden = [all[0], all[5], all[all.length - 1]];
  await found(hidden);
  await purse(U.m2, 100000, { recipes: [all[1]] });
  const got = [];
  let last = null, paid = true;
  for (let i = 0; i < all.length + 5; i++) {
    const before = (await kept(U.m2)).coins, did = await rpc(U.m2, "town_hint");
    if (did.ok !== true) { last = did; break; }
    if (before - did.purse.coins !== priceOf(did.hint)) paid = false;
    got.push(did.hint);
  }
  const want = all.filter((id) => !hidden.includes(id) && id !== all[1]);
  t.check(`with everything open, every hint is heard once (${want.length}), but what the village has found and what was read from a scroll; then he has none`,
    same([...got].sort(), [...want].sort()) && new Set(got).size === got.length && last?.ok === false && last?.why === "none", { n: got.length, want: want.length, last });
  t.check("each at its tier's price", paid && [1, 2, 3].every((tier) => got.some((id) => tierOf(id) === tier)), { paid });
  const tiers = got.map(tierOf);
  t.check("a tier at a time, the early game's first", same([...tiers].sort((a, b) => a - b), tiers), tiers.join(""));
  t.check("and within a tier not as they are listed", [1, 2, 3].every((tier) => got.filter((id) => tierOf(id) === tier).join() !== want.filter((id) => tierOf(id) === tier).join()));
  await village(0);
  await found([]);
}

t.section("what no browser may");
for (const [who, label] of [["anon", "somebody signed out"], [U.unver, "somebody whose character was never proved"], [U.nochar, "somebody with no character"]]) {
  if (who !== "anon") await purse(who, 500);
  const r = await rpc(who, "town_hint");
  const row = who === "anon" ? null : await kept(who);
  t.check(`${label} is sold no hint`, !!r.error && (!row || (row.coins === 500 && (row.hints ?? []).length === 0)), { r, row });
}
for (const who of ["anon", U.m1]) {
  const label = who === "anon" ? "somebody signed out" : "a member";
  let r = await t.as(who, `select town.next_hint('{}'::jsonb, '[]'::jsonb, 99, 0.5)`);
  t.check(`${label} cannot ask the rule which hint a number would draw`, !!r.error, r);
  r = await t.as(who, `select town.buy_hint('{"coins": 100000}'::jsonb, '[]'::jsonb, 99, 0.5)`);
  t.check(`${label} cannot ask the rule to sell one`, !!r.error, r);
  r = await t.as(who, `select town.next_hint('{}'::jsonb, '[]'::jsonb, 99)`);
  t.check(`${label} finds no three-word rule either`, !!r.error, r);
}

t.section("how long it takes");
{
  await purse(U.m1, 100000);
  const began = Date.now();
  for (let i = 0; i < 5; i++) await rpc(U.m1, "town_hint");
  const one = (Date.now() - began) / 5;
  console.log(`  (a hint bought: ${one.toFixed(0)} ms here)`);
  t.check("a buying can wait for it", one < 1500, { one });
}

t.done();
