/*
 * v143 — a stall may ask more than the uncle does: dry run in PGlite.
 *
 * v142 held a stall's prices to the notice board's most, which for what the uncle sells is his own price. v143 gives
 * a stall a most of its own (`town.shop_cap`: by what the relatives pay, whether the uncle sells the thing or not)
 * and writes `town.shop_open` again, v142's word for word but for the one line that asks it. Every migration of the
 * town's before it is replayed, v142 among them, then:
 *
 *   · before the file a worm cannot be asked more for than the uncle asks; the file is run twice; its closing block;
 *   · nothing else changed: one function new, one written again and differing from v142's by one line (and the file's
 *     text of it is v142's own with that line: build-v143.mjs), every other function its own text (the notice board's
 *     most among them), no table, no knob, no row; no function writes to a table with no WHERE;
 *   · every rule case made from the code as it stands now is put to the SQL (lib/town/db-vectors-shop.test.ts: the
 *     most of every thing there is, stalls of what the uncle sells priced about what he asks, and all v142's);
 *   · v142's stories again, through the functions a member calls;
 *   · each thing said plainly: dearer than the uncle both ways, up to the stall's most and no further, a thing the
 *     relatives do not take, the notice board as it was, the one knob both go by, who may, the file a third time.
 *
 *   node v143.test.mjs            (STORIES=<n> takes the first n stories, RULES=<n> every n-th rule case)
 *   node mutate.mjs <the file, with plain line ends> v143.test.mjs v143.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { again } from "./build-v143.mjs";
import { SHOP_OPEN } from "./v143.lines.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const lf = (s) => s.split("\r\n").join("\n");
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v143_"));
const HERE_FILE = new URL("./v143_draft.sql", import.meta.url);
const FILE = lf(process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE_FILE) ? readFileSync(HERE_FILE, "utf8") : migration(143));
const DIR = process.env.VECTORS ?? "now";
const at = new URL(`./${DIR}/vectors-shop.json`, import.meta.url);
if (!existsSync(at)) { console.log(`no ${DIR}/vectors-shop.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors-shop.test.ts\` in the repo first`); process.exit(2); }
const SHOP = JSON.parse(readFileSync(at, "utf8"));
const STORIES = process.env.STORIES ? SHOP.stories.slice(0, Number(process.env.STORIES)) : SHOP.stories;
const THIN = Number(process.env.RULES) > 1 ? Number(process.env.RULES) : 1;

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
// (in the order they ran; v136 is the party's, not the town's)
const RAN = [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137, 139, 140, 141, 142];
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));
const V142 = lf(migration(142));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
// (what the village has met, in the stories: said here, and not looked for again while they run)
await t.sql(`update public.town_things set doc = jsonb_build_object('at', $1::bigint, 'ids', $2::jsonb) where key = 'seen'`, [MORNING + 10 * 365 * 86_400_000, JSON.stringify(Object.fromEntries(SHOP.met.map((id) => [id, true])))]);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
let clockIs = MORNING;
const clock = async (ms) => { clockIs = ms; await t.sql(`update town.test_clock set ms = ${ms}`); };
/** A member's purse: so many coins, and these slots as its bag. */
const purse = (who, coins, bag) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb))
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify(bag.length >= 10 ? bag : [...bag, ...Array(10).fill(null)].slice(0, 10))]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const rows = async () => (await t.sql(`select member_id, x, y, lines, since::text as since, beat::text as beat, took::int as took, paid::int as paid from public.town_shops order by member_id`)).rows;
const deeds = async () => (await t.sql(`select member_id, what, thing, n::int as n, coins::int as coins, doc from public.town_deeds where what like 'shop\\_%' order by id`)).rows;
const count = (slots, item) => slots.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const wipe = () => t.sql(`delete from public.town_shops where true; delete from public.town_deeds where what like 'shop\\_%'; delete from public.town_notices where true`);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
const told = (r) => ({ ok: r.ok, why: r.why });
const HERE = [30, 40];
const OPEN_SIG = "town.shop_open(jsonb,text,jsonb,integer,integer,bigint,jsonb,jsonb)";
let v, r;

/* ── before the file ─────────────────────────────────────────────────────── */

t.section("before the file");
await purse(U.m1, 100, [{ item: "worm", n: 12 }, { item: "scrollPestCure", n: 1 }]);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 5 }], ...HERE);
t.check("a worm, which the uncle sells for two, cannot be asked five for at a stall", same(told(r), { ok: false, why: "dear" }) && (await rows()).length === 0, r);
const textsWas = await texts();
const tablesWas = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
const knobsWas = (await t.sql(`select key, value from public.town_knobs order by key`)).rows;

await t.runTwice(FILE, "v143");
const textsNow = await texts();

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select town.shop_cap('worm', town.shop_knobs()) as worm_at_a_stall, (town.cat('goods')->'worm'->>'price')::int as the_uncle_asks,
       town.notice_cap('worm', town.notice_knobs()) as worm_on_the_board, town.shop_cap('kangkong', town.shop_knobs()) as kangkong,
       town.shop_cap('scrollPestCure', town.shop_knobs()) as what_the_relatives_do_not_take`);
t.check("a worm may be asked ten for at a stall where the uncle asks two, and the notice board still says two; what he does not sell is as it was; what his relatives do not take has the flat most",
  same(v, { worm_at_a_stall: 10, the_uncle_asks: 2, worm_on_the_board: 2, kangkong: 30, what_the_relatives_do_not_take: 500 }), v);
v = await one(`select count(*)::int as on_his_list, (count(*) filter (where town.shop_cap(g.key, town.shop_knobs()) > (g.value->>'price')::numeric))::int as dearer_at_a_stall
  from jsonb_each(town.cat('goods')) g`);
t.check("every thing the uncle sells may be asked more for at a stall than he asks: none is left behind", v.on_his_list === 103 && v.dearer_at_a_stall === 103, v);
v = await one(`select position('town.shop_cap(item_, p_k)' in pg_get_functiondef('${OPEN_SIG.replace("town.shop_open", "town.shop_open").replace(/,/g, ", ")}'::regprocedure)) > 0 as stall_asks_its_own,
       position('notice_cap' in pg_get_functiondef('${OPEN_SIG.replace(/,/g, ", ")}'::regprocedure)) = 0 as not_the_boards`);
t.check("the rule that opens a stall asks the stall's own most, not the board's", same(v, { stall_asks_its_own: true, not_the_boards: true }), v);
v = await one(`select count(*)::int as open from pg_proc p where p.pronamespace = 'town'::regnamespace
   and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("the rules are nobody's in a browser", v.open === 0 && (await one(`select has_schema_privilege('authenticated', 'town', 'usage') as u`)).u === false, v);
v = await one(`select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member,
       count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as signed_out
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_shop%'`);
t.check("the stall's seven functions are a member's still, and none somebody signed out's", same(v, { member: 7, signed_out: 0 }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("one function is new, none is gone", same(added, ["town.shop_cap(text,jsonb)"]) && gone.length === 0, { added, gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== OPEN_SIG && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: the notice board's most among them", others.length === 0 && Object.keys(textsWas).length > 200 && "town.notice_cap(text,jsonb)" in textsNow, others);
  const A = textsWas[OPEN_SIG].split("\n"), B = textsNow[OPEN_SIG].split("\n"), odd = A.map((line, i) => [line, B[i]]).filter(([a, b]) => a !== b);
  t.check("the rule that opens a stall is v142's with one line written otherwise", A.length === B.length && odd.length === 1
    && odd[0][0].trim() === SHOP_OPEN[0][0].trim() && odd[0][1].trim() === SHOP_OPEN[0][1].trim(), odd);
  t.check("…and the file's text of it is v142's own with that line, word for word", FILE.includes(again(V142, "town.shop_open", SHOP_OPEN)) && FILE.split("create or replace function town.shop_open(").length === 2);
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("it writes no row of the catalog", after.length === before.length && after.every((row, i) => row.key === before[i].key && same(row.data, before[i].data) && String(row.updated_at) === String(before[i].updated_at)));
  const knobs = (await t.sql(`select key, value from public.town_knobs order by key`)).rows;
  t.check("…adds and turns no knob", same(knobs, knobsWas));
  const tables = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
  t.check("…and makes no table", same(tables, tablesWas));
  v = { purse: await kept(U.m1), stalls: (await rows()).length };
  t.check("what a member had is as it was, and there is no stall", count(v.purse.bag, "worm") === 12 && v.purse.coins === 100 && v.stalls === 0, v);
  v = await bareWrites((q) => t.sql(q).then((x) => x.rows));
  t.check("no function writes to a table with no WHERE (the live database refuses those to a member)", v.length === 0, v);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

{
  const CAST = {
    shop_cap: "select town.shop_cap($1::text, $2::jsonb) as r",
    shop_open: "select town.shop_open($1::jsonb, $2::text, $3::jsonb, $4::int, $5::int, $6::bigint, $7::jsonb, $8::jsonb) as r",
    shop_buy: "select town.shop_buy($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::int, $7::int, $8::int, $9::bigint, $10::jsonb) as r",
    shop_sell: "select town.shop_sell($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::int, $7::int, $8::int, $9::bigint, $10::jsonb) as r",
    shop_can: "select town.shop_can($1::jsonb, $2::jsonb) as r",
    shop_told_of: "select town.shop_told_of($1::jsonb, $2::jsonb, $3::bigint, $4::jsonb) as r",
    shop_mine: "select town.shop_mine($1::jsonb, $2::bigint, $3::jsonb) as r",
  };
  const cases = SHOP.rules.filter((_, i) => i % THIN === 0);
  t.section(`the stall's rules: ${cases.length} cases made from the site's code as it stands`);
  const bad = {}, n = {};
  for (const c of cases) {
    const got = await t.as("super", CAST[c.fn], c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
    n[c.fn] = (n[c.fn] ?? 0) + 1;
    const brief = (x) => (x && typeof x === "object" && x.ok ? { ok: true, coins: x.coins, shop: x.shop, mine: x.mine?.coins, theirs: x.theirs?.coins } : x);
    if (got.error || !same(got.rows[0].r, c.want)) (bad[c.fn] ??= []).push({ args: c.fn === "shop_cap" ? c.args : c.fn === "shop_open" ? c.args.slice(2, 5) : c.args.slice(2, 9), want: brief(c.want), got: got.error ?? brief(got.rows[0].r) });
  }
  for (const fn of Object.keys(CAST)) t.check(`town.${fn} answers every case as the code does (${n[fn] ?? 0})`, (n[fn] ?? 0) > 0 && !bad[fn], bad[fn]?.slice(0, 2));
}

/* ── the stories ─────────────────────────────────────────────────────────── */

{
  t.section(`${STORIES.length} stories of two who keep stalls and come to each other's, through the functions a member calls`);
  const WHO = [U.m1, U.m2];
  let badAnswer = null, badPurse = null, badMine = null, badSeen = null, steps = 0, sales = 0;
  for (const [k, s] of STORIES.entries()) {
    await wipe();
    await clock(MORNING);
    await purse(U.m1, s.coins[0], s.bags[0]);
    await purse(U.m2, s.coins[1], s.bags[1]);
    for (const [i, step] of s.steps.entries()) {
      await clock(clockIs + step.wait);
      const me = WHO[step.who], other = WHO[1 - step.who];
      let got = null, said = null;
      if (step.deed === "fill") await purse(me, step.give, step.bag);
      else if (step.deed === "open") { got = await call(me, "town_shop_open", step.ask, ...step.at); said = got.ok ? { ok: true } : { ok: false, why: got.why }; }
      else if (step.deed === "beat") { got = await call(me, "town_shop_beat"); said = { ok: got.ok }; }
      else if (step.deed === "close") got = await call(me, "town_shop_close");
      else {
        got = await call(me, step.deed === "buy" ? "town_shop_buy" : "town_shop_sell", other, step.item, step.n, ...step.at);
        said = got.ok ? { ok: true, coins: got.coins } : { ok: false, why: got.why };
        if (got.ok) sales++;
      }
      steps++;
      if (!badAnswer && (got?.error || (step.want && !same(said, step.want)))) badAnswer = { story: k, step: i, deed: step.deed, want: step.want, got: got?.error ?? said };
      const a = await kept(U.m1), b = await kept(U.m2);
      if (!badPurse && !(same(a.bag, step.bags[0]) && same(b.bag, step.bags[1]) && a.coins === step.coins[0] && b.coins === step.coins[1])) badPurse = { story: k, step: i, deed: step.deed, want: step.coins, got: [a.coins, b.coins] };
      if (i % 4 === 0 || (got?.ok && (step.deed === "buy" || step.deed === "sell"))) {
        const mine = [(await call(U.m1, "town_shop")).shops.mine, (await call(U.m2, "town_shop")).shops.mine];
        if (!badMine && !same(mine, step.mine)) badMine = { story: k, step: i, deed: step.deed, want: step.mine, got: mine };
        const seen = [(await call(U.m2, "town_shop_look", U.m1)).shopTold?.lines ?? null, (await call(U.m1, "town_shop_look", U.m2)).shopTold?.lines ?? null];
        if (!badSeen && !same(seen, step.seenBy)) badSeen = { story: k, step: i, deed: step.deed, want: step.seenBy, got: seen };
      }
    }
  }
  const part = process.env.STORIES ? SHOP.stories.length / STORIES.length : 1;
  t.check(`every answer is the code's (${steps} deeds, ${sales} sales)`, steps > 1500 / part && sales > 60 / part && !badAnswer, badAnswer);
  t.check("after every deed both purses are as the code has them: the coins and every slot", !badPurse, badPurse);
  t.check("each one's own stall is told as the code has it, and each stall as the other is told it", !badMine && !badSeen, badMine ?? badSeen);
}

/* ── each thing, said plainly ────────────────────────────────────────────── */

t.section("dearer than the uncle, and no dearer than a stall's most");
await wipe();
await clock(MORNING);
await purse(U.m1, 100, [{ item: "worm", n: 12 }, { item: "scrollPestCure", n: 1 }, { item: "kangkong", n: 4 }]);
await purse(U.m2, 60, []);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 5 }, { kind: "buy", item: "salt", n: 2, price: 4 }], ...HERE);
t.check("a stall opens selling worms at five where the uncle asks two, and wanting salt at four where he asks two", r.ok === true
  && same(r.shops.mine.lines, [{ kind: "sell", item: "worm", n: 5, left: 5, price: 5 }, { kind: "buy", item: "salt", n: 2, left: 2, price: 4 }]), r);
r = await call(U.m2, "town_shop_buy", U.m1, "worm", 3, ...HERE);
v = { a: await kept(U.m1), b: await kept(U.m2) };
t.check("three bought at five each: fifteen coins from one purse to the other, all of them", r.ok === true && r.coins === 15 && v.b.coins === 45 && v.a.coins === 115 && count(v.b.bag, "worm") === 3 && count(v.a.bag, "worm") === 9, [r.coins, v.a.coins, v.b.coins]);
v = (await deeds()).filter((d) => d.what === "shop_buy" || d.what === "shop_sold").map((d) => [d.what, d.thing, d.n, d.coins, d.doc.price]);
t.check("…written down with the price each", same(v, [["shop_buy", "worm", 3, -15, 5], ["shop_sold", "worm", 3, 15, 5]]), v);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 10 }], ...HERE);
t.check("ten a worm is the most: ten times what the uncle's relatives pay", r.ok === true, told(r));
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 5, price: 11 }], ...HERE);
t.check("…and eleven is too dear, with the stall that was open left as it stood", same(told(r), { ok: false, why: "dear" }) && (await rows())[0].lines[0].price === 10, r);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "scrollPestCure", n: 1, price: 500 }], ...HERE);
v = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "scrollPestCure", n: 1, price: 501 }], ...HERE);
t.check("a scroll the relatives do not take, which he sells for forty, may be asked five hundred for and no more", r.ok === true && same(told(v), { ok: false, why: "dear" }), [told(r), told(v)]);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 1, price: 30 }], ...HERE);
v = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 1, price: 31 }], ...HERE);
t.check("what he does not sell has the most it had", r.ok === true && same(told(v), { ok: false, why: "dear" }), [told(r), told(v)]);

t.section("the notice board is as it was");
r = await call(U.m1, "town_notice_post", "sell", "worm", 1, 3);
v = await call(U.m1, "town_notice_post", "sell", "worm", 1, 2);
t.check("a notice of worms is still held to what the uncle asks", same(told(r), { ok: false, why: "dear" }) && v.ok === true, [told(r), told(v)]);

t.section("the one number both go by");
await t.sql(`update public.town_knobs set value = 3 where key = 'notice_cap'`);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 1, price: 4 }], ...HERE);
v = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 1, price: 3 }], ...HERE);
t.check("the knob the board's most goes by is the stall's too: turned to three, a worm's most is three", same(told(r), { ok: false, why: "dear" }) && v.ok === true && v.shops.cap === 3, [told(r), told(v)]);
await t.sql(`update public.town_knobs set value = 10 where key = 'notice_cap'`);

t.section("who may");
r = await t.as(U.m2, `select town.shop_cap('worm', '{"cap": 10, "capless": 500}'::jsonb)`);
v = await t.as("anon", `select town.shop_cap('worm', '{"cap": 10, "capless": 500}'::jsonb)`);
t.check("the new rule is not a member's to call, nor somebody signed out's", r.code === "42501" && v.code === "42501", [r, v]);
r = await call("anon", "town_shop_open", [{ kind: "sell", item: "worm", n: 1, price: 5 }], ...HERE);
v = await call(U.unver, "town_shop_open", [{ kind: "sell", item: "worm", n: 1, price: 5 }], ...HERE);
t.check("opening a stall is still not somebody signed out's, nor somebody's with no proved character", r.code === "42501" && v.code === "42501", [r, v]);

t.section("run a third time");
{
  const was = { rows: await rows(), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  await t.run(FILE, "v143 a third time");
  const is = { rows: await rows(), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  t.check("the stalls are as they were, and no deed is written", same(is.rows, was.rows) && was.rows.length === 1 && is.deeds === was.deeds, is.rows);
  t.check("…every function its own text still", same(await texts(), textsNow));
  r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "worm", n: 2, price: 7 }], ...HERE);
  t.check("…and a stall asks more than the uncle as before", r.ok === true && r.shops.mine.lines[0].price === 7, told(r));
}

await t.done();
