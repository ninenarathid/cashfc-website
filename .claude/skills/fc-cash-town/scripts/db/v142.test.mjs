/*
 * v142 — a stall of one's own, under a sign held up: dry run in PGlite.
 *
 * v142 lets a member who holds a sign up keep a stall under it: lines that sell out of their bag and lines that buy
 * out of their purse, nothing set aside, nothing kept back, open only while their page is heard from. One closed
 * table (`town_shops`), five knobs, the rules of lib/town/shop.ts written again, and seven functions a member calls.
 * It writes no function of the game's again but `town.deed_th`, which is given six words more from its own text.
 * Every migration of the town's before it is replayed, then:
 *
 *   · the file is run twice; its closing block;
 *   · nothing else changed: every function there was its own text (the tally's but for one line), every catalog row
 *     as it was, one table more; and no function writes to a table with no WHERE (bare-writes.mjs: the live database
 *     refuses those to a member, and PGlite cannot);
 *   · every rule case made from the code is put to the SQL (lib/town/db-vectors-shop.test.ts);
 *   · its stories: two members and a run of deeds through the functions a member calls, the town's clock put on
 *     between them so that stalls go quiet: each answer, both purses, each one's own stall and each stall as the
 *     other is told it, as the code has them; and the deeds written down;
 *   · each thing said plainly: a sale's two lines that name each other and not a coin made or lost, a stall heard
 *     from and one gone quiet, opened anew, shut, who may, the game shut, a keeper who goes, the file a third time.
 *
 *   node v142.test.mjs            (STORIES=<n> takes the first n stories, RULES=<n> every n-th rule case)
 *   node mutate.mjs <the file, with plain line ends> v142.test.mjs v142.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";
import { bareWrites } from "./bare-writes.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v142_"));
const HERE_FILE = new URL("./v142_draft.sql", import.meta.url);
const FILE = (process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE_FILE) ? readFileSync(HERE_FILE, "utf8") : migration(142)).replace(/\r\n/g, "\n");
const DIR = process.env.VECTORS ?? "now";
const at = new URL(`./${DIR}/vectors-v142.json`, import.meta.url);
if (!existsSync(at)) { console.log(`no ${DIR}/vectors-v142.json: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run lib/town/db-vectors-shop.test.ts\` in the repo first`); process.exit(2); }
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
const RAN = [...Array.from({ length: 21 }, (_, i) => 105 + i), 127, 128, 129, 126, 131, 130, 135, 132, 133, 134, 138, 137, 139, 140, 141];
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

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
const wipe = () => t.sql(`delete from public.town_shops where true; delete from public.town_deeds where what like 'shop\\_%'`);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));

/* ── before the file ─────────────────────────────────────────────────────── */

await purse(U.m1, 12, [{ item: "minnow", n: 9 }, { item: "boot", n: 2 }]);
const textsWas = await texts(), deedsWas = (await one(`select count(*)::int as n from public.town_deeds`)).n;
const tablesWas = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((r) => r.relname);
const knobsWas = (await t.sql(`select key, value from public.town_knobs order by key`)).rows;

await t.runTwice(FILE, "v142");
const textsNow = await texts();
let v, r;
const HERE = [30, 40], BY = [32, 42], FAR = [34, 40];

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
v = await one(`select count(*)::int as n from public.town_knobs where key like 'shop\\_%'`);
t.check("five knobs of the stall's", v.n === 5, v);
v = await one(`select town.shop_knobs() as k`);
t.check("…its numbers: six lines, a reach of three, two hundred a line, quiet after 150 seconds, heard from every 50; a price's most is the notice board's own",
  same(v.k, { lines: 6, reach: 3, most: 200, quiet: 150, every: 50, cap: 10, capless: 500 }) && same(v.k, SHOP.knobs), v);
v = await one(`select c.relrowsecurity as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = 'town_shops' and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.oid = 'public.town_shops'::regclass`);
t.check("the stalls are a closed book: row security on, nothing granted to a browser", same(v, { closed: true, grants: 0 }), v);
v = await one(`select count(*) filter (where has_function_privilege('authenticated', p.oid, 'execute'))::int as member,
       count(*) filter (where has_function_privilege('anon', p.oid, 'execute'))::int as signed_out
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_shop%'`);
t.check("the seven functions are a member's to call, and none somebody signed out's", same(v, { member: 7, signed_out: 0 }), v);
v = await one(`select count(*)::int as open from pg_proc p where p.pronamespace = 'town'::regnamespace
   and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))`);
t.check("the rules are nobody's in a browser", v.open === 0 && (await one(`select has_schema_privilege('authenticated', 'town', 'usage') as u`)).u === false, v);
v = await one(`select town.deed_th('shop_open') as opened, town.deed_th('shop_close') as shut, town.deed_th('shop_buy') as bought, town.deed_th('shop_sold') as sold,
  town.deed_th('shop_sell') as brought, town.deed_th('shop_bought') as took, town.deed_th('drop') as thrown, town.deed_th('ground_drop') as dropped, town.deed_th('nothing_known') as other`);
t.check("the tally has its six words more, and the ones it had", same(v, { opened: "ชูป้ายเปิดร้าน", shut: "เก็บป้ายปิดร้าน", bought: "ซื้อของจากร้านสมาชิก", sold: "ร้านขายของได้", brought: "ขายของให้ร้านสมาชิก", took: "ร้านรับซื้อของ", thrown: "ทิ้งของ", dropped: "ทิ้งของลงพื้น", other: "nothing_known" }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.shop_knobs()", "town.shop_alive(jsonb,bigint,jsonb)", "town.shop_can(jsonb,jsonb)", "town.shop_open(jsonb,text,jsonb,integer,integer,bigint,jsonb,jsonb)",
    "town.shop_line(jsonb,text,text,text,integer,integer,integer,bigint,jsonb)", "town.shop_spent(jsonb,integer,integer,numeric)",
    "town.shop_buy(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)", "town.shop_sell(jsonb,jsonb,jsonb,text,text,integer,integer,integer,bigint,jsonb)",
    "town.shop_told_of(jsonb,jsonb,bigint,jsonb)", "town.shop_mine(jsonb,bigint,jsonb)", "town.shop_of(uuid,boolean)", "town.shop_seen()", "town.shops_told(uuid)", "town.shopped(uuid,jsonb)",
    "town.shop_deal(uuid,uuid,text,text,integer,integer,integer)",
    "town_shop()", "town_shop_open(jsonb,integer,integer)", "town_shop_close()", "town_shop_beat()", "town_shop_look(uuid)",
    "town_shop_buy(uuid,text,integer,integer,integer)", "town_shop_sell(uuid,text,integer,integer,integer)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check(`${NEW.length} functions are new, none is gone`, same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => sig !== "town.deed_th(text)" && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter", others.length === 0 && Object.keys(textsWas).length > 200, others);
  const A = textsWas["town.deed_th(text)"].split("\n"), B = textsNow["town.deed_th(text)"].split("\n"), odd = A.map((line, i) => [line, B[i]]).filter(([a, b]) => a !== b);
  t.check("the tally's words are as they stood with six more: one line written otherwise", A.length === B.length && odd.length === 1
    && odd[0][1] === odd[0][0].replace("else p_what end", "when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ' else p_what end"), odd);
  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  t.check("it writes no row of the catalog", after.length === before.length && after.every((row, i) => row.key === before[i].key && same(row.data, before[i].data) && String(row.updated_at) === String(before[i].updated_at)));
  const knobs = (await t.sql(`select key, value from public.town_knobs order by key`)).rows;
  t.check("…and turns no knob there was", knobs.length === knobsWas.length + 5 && knobsWas.every((k) => knobs.some((x) => x.key === k.key && x.value === k.value)));
  const tables = (await t.sql(`select c.relname from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and c.relname like 'town\\_%' order by 1`)).rows.map((x) => x.relname);
  t.check("one table is new", same(tables.filter((x) => !tablesWas.includes(x)), ["town_shops"]) && tables.length === tablesWas.length + 1, tables.filter((x) => !tablesWas.includes(x)));
  v = { purse: await kept(U.m1), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n, stalls: (await rows()).length };
  t.check("what a member had is as it was, no deed is written, and there is no stall", count(v.purse.bag, "minnow") === 9 && v.purse.coins === 12 && v.deeds === deedsWas && v.stalls === 0, v);
  v = await bareWrites((q) => t.sql(q).then((x) => x.rows));
  t.check("no function writes to a table with no WHERE (the live database refuses those to a member)", v.length === 0, v);
}

/* ── the rules, case by case ─────────────────────────────────────────────── */

{
  const CAST = {
    shop_open: "select town.shop_open($1::jsonb, $2::text, $3::jsonb, $4::int, $5::int, $6::bigint, $7::jsonb, $8::jsonb) as r",
    shop_buy: "select town.shop_buy($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::int, $7::int, $8::int, $9::bigint, $10::jsonb) as r",
    shop_sell: "select town.shop_sell($1::jsonb, $2::jsonb, $3::jsonb, $4::text, $5::text, $6::int, $7::int, $8::int, $9::bigint, $10::jsonb) as r",
    shop_can: "select town.shop_can($1::jsonb, $2::jsonb) as r",
    shop_told_of: "select town.shop_told_of($1::jsonb, $2::jsonb, $3::bigint, $4::jsonb) as r",
    shop_mine: "select town.shop_mine($1::jsonb, $2::bigint, $3::jsonb) as r",
  };
  const cases = SHOP.rules.filter((_, i) => i % THIN === 0);
  t.section(`the stall's rules: ${cases.length} cases made from the site's code`);
  const bad = {}, n = {};
  for (const c of cases) {
    const got = await t.as("super", CAST[c.fn], c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)));
    n[c.fn] = (n[c.fn] ?? 0) + 1;
    const brief = (x) => (x && typeof x === "object" && x.ok ? { ok: true, coins: x.coins, shop: x.shop, mine: x.mine?.coins, theirs: x.theirs?.coins } : x);
    if (got.error || !same(got.rows[0].r, c.want)) (bad[c.fn] ??= []).push({ args: c.fn === "shop_open" ? c.args.slice(2, 5) : c.args.slice(2, 9), want: brief(c.want), got: got.error ?? brief(got.rows[0].r) });
  }
  for (const fn of Object.keys(CAST)) t.check(`town.${fn} answers every case as the code does (${n[fn] ?? 0})`, (n[fn] ?? 0) > 0 && !bad[fn], bad[fn]?.slice(0, 2));
}

/* ── the stories ─────────────────────────────────────────────────────────── */

{
  t.section(`${STORIES.length} stories of two who keep stalls and come to each other's, through the functions a member calls`);
  const WHO = [U.m1, U.m2];
  let badAnswer = null, badPurse = null, badMine = null, badSeen = null, badDeeds = null, steps = 0, sales = 0;
  for (const [k, s] of STORIES.entries()) {
    await wipe();
    await clock(MORNING);
    await purse(U.m1, s.coins[0], s.bags[0]);
    await purse(U.m2, s.coins[1], s.bags[1]);
    const done = { shop_open: 0, shop_buy: 0, shop_sold: 0, shop_sell: 0, shop_bought: 0 };
    for (const [i, step] of s.steps.entries()) {
      await clock(clockIs + step.wait);
      const me = WHO[step.who], other = WHO[1 - step.who];
      let got = null, told = null;
      if (step.deed === "fill") await purse(me, step.give, step.bag);
      else if (step.deed === "open") { got = await call(me, "town_shop_open", step.ask, ...step.at); told = got.ok ? { ok: true } : { ok: false, why: got.why }; if (got.ok) done.shop_open++; }
      else if (step.deed === "beat") { got = await call(me, "town_shop_beat"); told = { ok: got.ok }; }
      else if (step.deed === "close") got = await call(me, "town_shop_close");
      else {
        got = await call(me, step.deed === "buy" ? "town_shop_buy" : "town_shop_sell", other, step.item, step.n, ...step.at);
        told = got.ok ? { ok: true, coins: got.coins } : { ok: false, why: got.why };
        if (got.ok) { sales++; if (step.deed === "buy") { done.shop_buy++; done.shop_sold++; } else { done.shop_sell++; done.shop_bought++; } }
      }
      steps++;
      if (!badAnswer && (got?.error || (step.want && !same(told, step.want)))) badAnswer = { story: k, step: i, deed: step.deed, want: step.want, got: got?.error ?? told };
      const a = await kept(U.m1), b = await kept(U.m2);
      if (!badPurse && !(same(a.bag, step.bags[0]) && same(b.bag, step.bags[1]) && a.coins === step.coins[0] && b.coins === step.coins[1])) badPurse = { story: k, step: i, deed: step.deed, want: step.coins, got: [a.coins, b.coins], bags: [same(a.bag, step.bags[0]), same(b.bag, step.bags[1])] };
      // (each one's own stall as they are told it, and each stall as the other is told it; every fourth step, and after every sale)
      if (i % 4 === 0 || (got?.ok && (step.deed === "buy" || step.deed === "sell"))) {
        const mine = [(await call(U.m1, "town_shop")).shops.mine, (await call(U.m2, "town_shop")).shops.mine];
        if (!badMine && !same(mine, step.mine)) badMine = { story: k, step: i, deed: step.deed, want: step.mine, got: mine };
        const seen = [(await call(U.m2, "town_shop_look", U.m1)).shopTold?.lines ?? null, (await call(U.m1, "town_shop_look", U.m2)).shopTold?.lines ?? null];
        if (!badSeen && !same(seen, step.seenBy)) badSeen = { story: k, step: i, deed: step.deed, want: step.seenBy, got: seen };
      }
    }
    const written = await deeds(), by = (what) => written.filter((d) => d.what === what).length;
    const sum = written.reduce((n, d) => n + d.coins, 0);
    if (!badDeeds && !(Object.entries(done).every(([what, n]) => by(what) === n) && sum === 0)) badDeeds = { story: k, want: done, got: Object.fromEntries(Object.keys(done).map((w) => [w, by(w)])), sum };
  }
  const part = process.env.STORIES ? SHOP.stories.length / STORIES.length : 1;
  t.check(`every answer is the code's (${steps} deeds)`, steps > 1500 / part && !badAnswer, badAnswer);
  t.check("after every deed both purses are as the code has them: the coins and every slot", !badPurse, badPurse);
  t.check("each one's own stall is told as the code has it: its lines with what is left, what it took and paid; nothing once it has gone quiet", !badMine, badMine);
  t.check("…and each stall as the other is told it: the lines that have something to them, and how many can change hands", !badSeen, badSeen);
  t.check(`every stall opened and every sale is written down, a sale twice (${sales} sales); and all that the deeds say of coins comes to nothing`, sales > 80 / part && !badDeeds, badDeeds);
}

/* ── each thing, said plainly ────────────────────────────────────────────── */

t.section("a sale, either way");
await wipe();
await clock(MORNING);
await purse(U.m1, 7, [{ item: "kangkong", n: 12 }, { item: "can", n: 1, water: 5 }]);
await purse(U.m2, 50, [{ item: "minnow", n: 4 }]);
r = await call(U.m1, "town_shop");
t.check("a member with no stall is told so, with what may be wanted and the rules' numbers", r.shops.mine === null && r.shops.seen.includes("minnow") && r.shops.seen.includes("worm") && !r.shops.seen.includes("catfish")
  && same({ ...r.shops, mine: 0, seen: 0 }, { mine: 0, seen: 0, lines: 6, reach: 3, most: 200, cap: 10, capless: 500, every: 50 }) && r.purse.coins === 7, r.shops);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 10, price: 4 }, { kind: "buy", item: "minnow", n: 1, price: 6 }], ...HERE);
t.check("a stall that sells and buys at once is opened where its keeper stands", r.ok === true && same(r.shops.mine, { at: HERE, since: MORNING, took: 0, paid: 0,
  lines: [{ kind: "sell", item: "kangkong", n: 10, left: 10, price: 4 }, { kind: "buy", item: "minnow", n: 1, left: 1, price: 6 }] }), r);
t.check("…and nothing has left their bag or their purse for it", count(r.purse.bag, "kangkong") === 12 && r.purse.coins === 7, r.purse);
v = { rows: await rows(), deeds: await deeds() };
t.check("…kept so, and written down", same(v.rows, [{ member_id: U.m1, x: 30, y: 40, since: String(MORNING), beat: String(MORNING), took: 0, paid: 0,
  lines: [{ kind: "sell", item: "kangkong", n: 10, left: 10, price: 4 }, { kind: "buy", item: "minnow", n: 1, left: 1, price: 6 }] }])
  && v.deeds.length === 1 && v.deeds[0].what === "shop_open" && v.deeds[0].n === 2 && same(v.deeds[0].doc.tile, HERE), v);
r = await call(U.m2, "town_shop_look", U.m1);
t.check("somebody else is told what it sells and wants, and how many of each can change hands", same(r.shopTold, { by: U.m1, at: HERE, lines: [{ kind: "sell", item: "kangkong", price: 4, can: 10 }, { kind: "buy", item: "minnow", price: 6, can: 1 }] }) && r.shopWho === U.m1, r);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 3, ...FAR);
t.check("from four tiles off nothing is bought", same({ ok: r.ok, why: r.why }, { ok: false, why: "far" }) && r.purse.coins === 50, r);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 3, ...BY);
v = { a: await kept(U.m1), b: await kept(U.m2) };
t.check("standing by it, three are bought: mine at once, and twelve coins gone", r.ok === true && r.coins === 12 && count(r.purse.bag, "kangkong") === 3 && r.purse.coins === 38, r);
t.check("all twelve are the keeper's: not a coin is kept back, made or lost", v.a.coins === 19 && count(v.a.bag, "kangkong") === 9 && v.a.coins + v.b.coins === 57, v);
t.check("…and the comer is told the stall as it now stands", same(r.shopTold.lines, [{ kind: "sell", item: "kangkong", price: 4, can: 7 }, { kind: "buy", item: "minnow", price: 6, can: 1 }]), r.shopTold);
r = await call(U.m2, "town_shop_sell", U.m1, "minnow", 1, ...HERE);
t.check("a minnow brought: the keeper's at once, six coins the comer's out of the keeper's purse", r.ok === true && r.coins === 6 && r.purse.coins === 44 && count((await kept(U.m1)).bag, "minnow") === 1 && (await kept(U.m1)).coins === 13, r);
v = await deeds();
t.check("each sale is written down twice, the comer's line and the keeper's, each naming the other", same(v.slice(1), [
  { member_id: U.m2, what: "shop_buy", thing: "kangkong", n: 3, coins: -12, doc: { from: U.m1, price: 4, tile: BY } },
  { member_id: U.m1, what: "shop_sold", thing: "kangkong", n: 3, coins: 12, doc: { to: U.m2, price: 4 } },
  { member_id: U.m2, what: "shop_sell", thing: "minnow", n: 1, coins: 6, doc: { to: U.m1, price: 6, tile: HERE } },
  { member_id: U.m1, what: "shop_bought", thing: "minnow", n: 1, coins: -6, doc: { from: U.m2, price: 6 } }]), v.slice(1));
r = await call(U.m1, "town_shop");
t.check("the keeper is told what is left on each line, and what the stall took and paid", same(r.shops.mine.lines.map((l) => l.left), [7, 0]) && r.shops.mine.took === 12 && r.shops.mine.paid === 6 && r.purse.coins === 13, r.shops.mine);
r = await call(U.m1, "town_shop_buy", U.m1, "kangkong", 1, ...HERE);
t.check("nobody buys at their own stall", same({ ok: r.ok, why: r.why }, { ok: false, why: "own" }), r);
r = await call(U.m2, "town_shop_buy", U.m1, "can", 1, ...HERE);
t.check("what is not on a line is not sold: a can with water in it stays its keeper's", same({ ok: r.ok, why: r.why }, { ok: false, why: "gone" }), r);
// the keeper gives the kangkong away meanwhile: the line says seven, the bag has two
await purse(U.m1, 13, [{ item: "kangkong", n: 2 }]);
r = await call(U.m2, "town_shop_look", U.m1);
t.check("a line is told by what its keeper still holds", same(r.shopTold.lines, [{ kind: "sell", item: "kangkong", price: 4, can: 2 }]), r.shopTold);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 3, ...HERE);
t.check("…and more than that is not sold, with nothing changed", same({ ok: r.ok, why: r.why }, { ok: false, why: "gone" }) && (await kept(U.m1)).coins === 13 && r.purse.coins === 44, r);

t.section("heard from, gone quiet, opened anew, shut");
await clock(MORNING + 100_000);
r = await call(U.m1, "town_shop_beat");
t.check("its keeper's page says it is still there", r.ok === true && (await rows())[0].beat === String(MORNING + 100_000), r);
await clock(MORNING + 249_999);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 1, ...HERE);
t.check("a millisecond short of 150 seconds after that it is still open", r.ok === true, r);
await clock(MORNING + 250_000);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 1, ...HERE);
v = { look: await call(U.m2, "town_shop_look", U.m1), mine: (await call(U.m1, "town_shop")).shops.mine };
t.check("at 150 seconds unheard from it is shut: nothing is bought, nobody is told of it, its keeper neither", same({ ok: r.ok, why: r.why }, { ok: false, why: "shut" }) && v.look.shopTold === null && v.mine === null, [r, v]);
r = await call(U.m1, "town_shop_beat");
t.check("…and saying one is still there does not open it again", r.ok === false && (await rows())[0].beat === String(MORNING + 100_000), r);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 1, price: 2 }], 31, 41);
t.check("opened anew, a stall is the new one: its lines, its tile, nothing taken yet", r.ok === true && same(r.shops.mine, { at: [31, 41], since: MORNING + 250_000, took: 0, paid: 0, lines: [{ kind: "sell", item: "kangkong", n: 1, left: 1, price: 2 }] }) && (await rows()).length === 1, r.shops);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 1, price: 2 }], 100, 100);
t.check("no stall stands on a tile of no map, and the one there was stands on", same({ ok: r.ok, why: r.why }, { ok: false, why: "none" }) && (await rows())[0].x === 31, r);
r = await call(U.m1, "town_shop_open", JSON.stringify("nothing"), 31, 41);
v = await call(U.m1, "town_shop_open", [3], 31, 41);
t.check("what is no list of lines opens nothing", same({ ok: r.ok, why: r.why }, { ok: false, why: "lines" }) && same({ ok: v.ok, why: v.why }, { ok: false, why: "lines" }), [r, v]);
r = await call(U.m1, "town_shop_close");
v = await deeds();
t.check("shut by its keeper, it is gone, and that is written down with what it took and paid", r.ok === true && r.shops.mine === null && (await rows()).length === 0 && v[v.length - 1].what === "shop_close" && same({ took: v[v.length - 1].doc.took, paid: v[v.length - 1].doc.paid }, { took: 0, paid: 0 }), [r, v[v.length - 1]]);
r = await call(U.m1, "town_shop_close");
t.check("…and shutting what is not there writes nothing", r.ok === true && (await deeds()).length === v.length, r);
r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 1, ...HERE);
v = await call(U.m2, "town_shop_buy", "00000000-0000-0000-0000-0000000000ff", "kangkong", 1, ...HERE);
t.check("nothing is bought of somebody with no stall, nor of nobody", same({ ok: r.ok, why: r.why }, { ok: false, why: "shut" }) && same({ ok: v.ok, why: v.why }, { ok: false, why: "shut" })
  && (await one(`select count(*)::int as n from public.town_purses where member_id = '00000000-0000-0000-0000-0000000000ff'`)).n === 0, [r, v]);

t.section("who may read and call what");
await clock(MORNING + 300_000);
await purse(U.m1, 5, [{ item: "kangkong", n: 4 }]);
r = await call(U.m1, "town_shop_open", [{ kind: "sell", item: "kangkong", n: 4, price: 1 }], ...HERE);
for (const [fn, args] of [["town_shop", []], ["town_shop_open", [[{ kind: "sell", item: "kangkong", n: 1, price: 1 }], ...HERE]], ["town_shop_close", []], ["town_shop_beat", []],
  ["town_shop_look", [U.m1]], ["town_shop_buy", [U.m1, "kangkong", 1, ...HERE]], ["town_shop_sell", [U.m1, "kangkong", 1, ...HERE]]]) {
  r = await call("anon", fn, ...args);
  const u = await call(U.unver, fn, ...args), n = await call(U.nochar, fn, ...args);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
}
t.check("…and the stall they reached for stands as it was", same((await rows()).map((x) => [x.member_id, x.lines[0].left]), [[U.m1, 4]]));
{
  const a = await t.as("anon", `select * from public.town_shops`), m = await t.as(U.m2, `select * from public.town_shops`);
  const w = await t.as(U.m2, `update public.town_shops set beat = beat + 999999 where true`), d = await t.as(U.m2, `delete from public.town_shops where true`);
  const i = await t.as(U.m2, `insert into public.town_shops (member_id, x, y, lines, since, beat) values ('${U.m2}', 30, 40, '[]'::jsonb, 1, 99999999999999)`);
  t.check("town_shops: nobody in a browser reads it or writes it: no stall is opened or kept open by hand", a.code === "42501" && m.code === "42501" && w.code === "42501" && d.code === "42501" && i.code === "42501", [a, m, w, d, i]);
  r = await t.as(U.m2, `select town.shop_deal('${U.m2}'::uuid, '${U.m1}'::uuid, 'sell', 'kangkong', 1, 30, 40)`);
  const g = await t.as(U.m2, `select town.shop_of('${U.m1}'::uuid, false)`);
  t.check("the rules are not a member's to call", r.code === "42501" && g.code === "42501", [r, g]);
}
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m2, "town_shop"), p = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 1, ...HERE), b = await call(U.m1, "town_shop_beat"), a = await call(U.admin, "town_shop");
  t.check("while the game is shut the stalls are an admin's only", m.code === "42501" && p.code === "42501" && b.code === "42501" && a.shops?.mine === null, [m, p, b, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

t.section("a keeper who goes");
{
  const gone = await t.as("super", `delete from public.profiles where id = $1`, [U.m1]);
  t.check("their stall goes with them", !gone.error && (await rows()).length === 0, [gone.error, await rows()]);
  r = await call(U.m2, "town_shop_buy", U.m1, "kangkong", 1, ...HERE);
  t.check("…and nothing is bought at it", same({ ok: r.ok, why: r.why }, { ok: false, why: "shut" }), r);
}

t.section("run a third time");
{
  await purse(U.m2, 9, [{ item: "minnow", n: 2 }]);
  await call(U.m2, "town_shop_open", [{ kind: "sell", item: "minnow", n: 2, price: 3 }], ...HERE);
  await t.sql(`update public.town_knobs set value = 9 where key = 'shop_lines'`);
  const was = { rows: await rows(), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n };
  await t.run(FILE, "v142 a third time");
  const is = { rows: await rows(), deeds: (await one(`select count(*)::int as n from public.town_deeds`)).n, knob: (await one(`select value from public.town_knobs where key = 'shop_lines'`)).value };
  t.check("the stalls are as they were, and no deed is written", same(is.rows, was.rows) && was.rows.length === 1 && is.deeds === was.deeds, is.rows);
  t.check("…a knob an admin turned stays turned", is.knob === 9, is.knob);
  t.check("…every function its own text still", same(await texts(), textsNow));
  await purse(U.admin, 10, []);
  r = await call(U.admin, "town_shop_buy", U.m2, "minnow", 1, ...HERE);
  t.check("…and a stall works as before", r.ok === true && r.coins === 3 && (await kept(U.m2)).coins === 12, r);
}

await t.done();
