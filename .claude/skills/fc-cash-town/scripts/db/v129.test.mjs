/*
 * v129 — thanks at the picking, and a jar at the well: dry run in PGlite.
 *
 * v129 stands on v127 (the well's book). Each plot remembers who has helped the plant in it since it was sown
 * (`town_plot_help`, kept by v127's trigger, whose reader is written again); its owner thanks them, one a day from
 * one person to another (`town_thanks`), counted on a board; and a jar by the well takes coins and things, shared
 * out at the uncle's next round among those who worked for the others (`town_jar`, `town_jar_owed`, `town_jar_log`).
 * v105 to v125 are replayed as they ran, then v127, then:
 *
 *   · a morning of water before the file, and the file run twice;
 *   · its closing block; that nothing else changed: every function its own text, v127's reader and its two
 *     functions the lines meant, the tally's words three more;
 *   · the well's book as v127's dry run tells it: its stories again, to the same book and the same four tables;
 *   · the jar's rules, case by case; thirty stories of plants helped and thanks given, step by step;
 *   · thanks through the functions a member calls; the jar dropped into, shared when the round turns, taken from;
 *   · who may read and call what; a member who goes; the file a third time.
 *
 *   node v129.test.mjs            (STORIES=<n> takes the first n of each kind)
 *   node mutate.mjs <the file> v129.test.mjs v129.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
/** A migration of the town's: a draft beside this file while there is one and supabase/ has none; then supabase/; then history, once it has run. */
const fileOf = (n) => {
  const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith(`v${n}_`)), here = new URL(`./v${n}_draft.sql`, import.meta.url);
  return !inRepo && existsSync(here) ? readFileSync(here, "utf8") : migration(n);
};
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : fileOf(129);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const WELL = need("vectors-v127.json", "lib/town/db-vectors-well.test.ts"), KIND = need("vectors-v129.json", "lib/town/db-vectors-kind.test.ts");
const CODE = need("catalog.json", "lib/town/db-vectors.test.ts");
const take = (list) => (process.env.STORIES ? list.slice(0, Number(process.env.STORIES)) : list);

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
// (v123 to v125 are the fountain, the moving price, the forest and the insects: they run before this one)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125];
const MIN = 60_000, HOUR = 3_600_000;
// 09:00 in Bangkok on a Tuesday: the round that began at seven
const MORNING = Date.parse("2026-10-06T09:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
await t.run(fileOf(127), "v127");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.sql(`create table town.test_clock (ms bigint not null); insert into town.test_clock values (${MORNING});
  create or replace function town.now_ms() returns bigint language sql stable as $$ select ms from town.test_clock $$;`);
await t.sql(`update public.town_catalog set updated_at = now() - interval '3 hours'`);
const before = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
const one = async (sql, params) => (await t.sql(sql, params)).rows[0];
const clock = (ms) => t.sql(`update town.test_clock set ms = ${ms}`);
const NAME = Object.fromEntries((await t.sql(`select id, coalesce(character_name, display_name, discord_username, '') as name from public.profiles`)).rows.map((r) => [r.id, r.name]));
/** A member's purse: so many coins, these things first in a bag of ten, so much stamina, and whatever else. */
const purse = (who, coins, bag, left = 100, more = {}) => t.sql(`insert into public.town_purses (member_id, coins, doc) values ($1, $2, town.fresh() || jsonb_build_object('bag', $3::jsonb, 'stamina', jsonb_build_object('day', town.day_of(town.now_ms()), 'left', $4::int)) || $5::jsonb)
  on conflict (member_id) do update set coins = excluded.coins, doc = excluded.doc`, [who, coins, JSON.stringify([...bag, ...Array(10).fill(null)].slice(0, 10)), left, JSON.stringify(more)]);
const call = async (who, fn, ...args) => {
  const r = await t.as(who, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(", ")}) as r`, args);
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const count = (bag, item) => bag.reduce((n, s) => n + (s?.item === item ? s.n : 0), 0);
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant`, [x, y, JSON.stringify(doc)]);
const growing = (by, crop = "pumpkin") => ({ by, crop, sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 48 * HOUR, cured: 0, picked: 0, pickedAt: 0 });
/** What the well's book keeps (v127's four), and who helped which plant. */
const book = async () => ({
  water: (await t.sql(`select member_id as by, buckets as left from public.town_well_water order by id`)).rows,
  cans: Object.fromEntries((await t.sql(`select member_id, item, carrier, waterings from public.town_well_cans order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, { by: r.carrier, left: r.waterings }])),
  carriers: Object.fromEntries((await t.sql(`select member_id, buckets, taken from public.town_carriers order by 1`)).rows.map((r) => [r.member_id, { buckets: r.buckets, taken: r.taken }])),
  reach: (await t.sql(`select day, carrier, x, y, owner, n from public.town_well_reach order by 1, 2, 3, 4`)).rows.reduce((all, r) => {
    (all[`${r.day}/${r.carrier}`] ??= {})[`${r.x},${r.y}`] = { owner: r.owner, n: r.n };
    return all;
  }, {}),
});
const helpNow = async () => (await t.sql(`select x, y, helper, owner, water, carry from public.town_plot_help order by 1, 2, 3`)).rows.reduce((all, r) => {
  const plot = (all[`${r.x},${r.y}`] ??= { owner: r.owner, by: {} });
  plot.by[r.helper] = { water: r.water, carry: r.carry };
  return all;
}, {});
const jarNow = async () => one(`select round, coins, things from public.town_jar`);
const owedNow = async () => Object.fromEntries((await t.sql(`select member_id, coins, things from public.town_jar_owed order by 1`)).rows.map((r) => [r.member_id, { coins: r.coins, things: r.things }]));
const wellIs = async () => Number((await one(`select doc from public.town_things where key = 'well'`)).doc);
/** Every function of the town's and of public's, by its signature: its text as the database has it. */
const texts = async () => Object.fromEntries((await t.sql(`select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def
  from pg_proc p where p.pronamespace in ('public'::regnamespace, 'town'::regnamespace) and p.prokind = 'f' order by 1`)).rows.map((r) => [r.sig, r.def]));
/** The lines of one text that are not in the other, in order (the longest run they share is left out). */
function differ(a, b) {
  const A = a.split("\n"), B = b.split("\n"), n = A.length, m = B.length;
  const L = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const gone = [], more = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) { i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) gone.push(A[i++]); else more.push(B[j++]);
  }
  while (i < n) gone.push(A[i++]);
  while (j < m) more.push(B[j++]);
  return { gone, more };
}

/* ── a morning of water, before the file ─────────────────────────────────── */

const RIVER = [16, 38];
const wellAt = (await one(`select town.cat('farming')->'wellAt' as at`)).at, AT_WELL = [wellAt[0] + 1, wellAt[1]];
await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_well_water restart identity`);
await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
await plant(133, 5, growing(U.admin));
await plant(134, 5, growing(U.admin));
{
  const said = [];
  for (let i = 0; i < 2; i++) { said.push(await call(U.m1, "town_chore", ...RIVER)); said.push(await call(U.m1, "town_chore", ...AT_WELL)); }
  said.push(await call(U.m2, "town_chore", ...AT_WELL));
  said.push(await call(U.m2, "town_tend", 133, 5));
  t.check("before the file: two bucketfuls carried, a can filled from them, a plant of somebody else's watered", said.every((r) => r.ok === true) && (await wellIs()) === 1, said.map((r) => r.ok ?? r));
}
const bookWas = await book(), textsWas = await texts();

await t.runTwice(FILE, "v129");
const textsNow = await texts();
let v, r;

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
const FIVE = ["town_plot_help", "town_thanks", "town_jar", "town_jar_owed", "town_jar_log"];
v = await one(`select count(*) filter (where c.relrowsecurity)::int as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = any($1) and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.relname = any($1) and c.relnamespace = 'public'::regnamespace`, [FIVE]);
t.check("the five tables are closed: row security on, nothing granted to a browser", same(v, { closed: 5, grants: 0 }), v);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_to_thank', 'town_thank', 'town_jar_drop', 'town_jar_take', 'town_well', 'town_well_ranks') order by 1`);
t.check("the six functions are a member's to call, and nobody's signed out", same(v.rows, ["town_jar_drop", "town_jar_take", "town_thank", "town_to_thank", "town_well", "town_well_ranks"].map((proname) => ({ proname, anon: false, member: true }))), v.rows);
v = await t.sql(`select tgname, pg_get_triggerdef(oid) like '%''sow''%' as reads_a_sowing from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal`);
t.check("the deeds have the one trigger, and it reads a sowing too", same(v.rows, [{ tgname: "town_deeds_well", reads_a_sowing: true }]), v.rows);
v = await one(`select town.cat('thanks') as thanks, town.cat('jar') as jar`);
t.check("the catalog has the board's length and the jar's numbers", same(v, { thanks: { listed: 10 }, jar: { bucket: 8, kinds: ["crop", "fish", "dish", "goods", "catch", "staple"] } }), v);
v = await one(`select town.deed_th('thank') as thank, town.deed_th('jar_drop') as dropped, town.deed_th('jar_take') as taken, town.deed_th('gift') as gift, town.deed_th('pour') as pour`);
t.check("the tally has its three words more, and the ones it had", same(v, { thank: "ขอบคุณคนที่ช่วยดูแลผัก", dropped: "หยอดกระปุกที่บ่อน้ำ", taken: "รับส่วนแบ่งจากกระปุก", gift: "รับของที่บ่อน้ำฝากไว้ให้", pour: "เทน้ำลงบ่อ" }), v);
v = await one(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are nobody's in a browser", same(v, { member_has_rules: false, open: 0 }), v);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.helpers_of(integer,integer,uuid)", "town.unthanked(integer,integer,uuid,integer)", "town.thank(integer,integer,uuid,bigint)", "town.to_thank(uuid,bigint)", "town.thanks_board(uuid,bigint)",
    "town.round_from(integer)", "town.jar_add(jsonb,text,integer)", "town.jar_drop(jsonb,jsonb,jsonb)", "town.jar_shares(integer,jsonb)", "town.jar_settle(jsonb,jsonb,jsonb,integer)", "town.jar_collect(jsonb,jsonb)",
    "town.jar_work(integer,integer)", "town.jar_now(bigint)", "town.jar_told(uuid,bigint)", "town_to_thank()", "town_thank(integer,integer)", "town_jar_drop(integer,integer,integer)", "town_jar_take()"];
  const AGAIN = ["town.well_seen(uuid,bigint,text,text,numeric,jsonb)", "town_well()", "town_well_ranks()", "town.deed_th(text)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("eighteen functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => !AGAIN.includes(sig) && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was, v127's among them, is its text from before to the letter", others.length === 0 && Object.keys(textsWas).length > 160, others);
  let d = differ(textsWas["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"], textsNow["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"]);
  t.check("the well's reader is v127's: of the old text three lines are written otherwise (whose plant it was is worked out first, and the plot with it)", same(d.gone, [
    "    v_owner := coalesce((p_doc->>'whose')::uuid, p_member);",
    "    if v_carrier is null or v_carrier = v_owner or jsonb_typeof(p_doc->'tile') is distinct from 'array' then return; end if;",
    "      values (town.day_of(p_at), v_carrier, (p_doc->'tile'->>0)::integer, (p_doc->'tile'->>1)::integer, v_owner, 1)",
  ]) && d.more.length === 22, d);
  d = differ(textsWas["town_well()"], textsNow["town_well()"]);
  t.check("the book is v127's with the jar settled first and two things more told", same(d.gone, ["  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_);"]) && same(d.more, [
    "  perform town.jar_now(now_);",
    "  return jsonb_build_object('wellBook', town.well_book(me, now_), 'now', now_, 'thanks', town.thanks_board(me, now_), 'jar', town.jar_told(me, now_));",
  ]), d);
  d = differ(textsWas["town_well_ranks()"], textsNow["town_well_ranks()"]);
  t.check("everybody's rank is v127's with who thanked me today told beside it", same(d.gone, ["                from public.town_carriers c where town.well_rank(c.buckets) > 0));"]) && same(d.more, [
    "                from public.town_carriers c where town.well_rank(c.buckets) > 0),",
    "    'thanked', town.thanks_board(me, town.now_ms())->'today');",
  ]), d);
  d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are as they stood with three more: one line written otherwise", d.gone.length === 1 && d.more.length === 1 && d.more[0] === d.gone[0].replace("else p_what end", "when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' else p_what end"), d);

  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds two rows and writes none over", same(written, ["jar", "thanks"]) && after.length === before.length + 2 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now", odd.length === 0 && after.length === before.length + 2, odd);
  t.check("what the book kept before the file is as it was, and no helper is made up for the lines written before", same(await book(), bookWas) && same(await helpNow(), {}), await helpNow());
}

/* ── the well's book, as v127's dry run tells it ─────────────────────────── */

const wipe = () => t.sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks restart identity`);
/** A line written into the deeds as the game's functions write it (v121): the trigger reads it. */
const write = (d) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5::numeric, $6::jsonb)`, [
  d.by, d.at, d.what, d.what === "pour" ? "bucket" : d.what === "fill" ? d.can : d.what === "sow" ? "seedKangkong" : "kangkong", d.what === "pour" ? d.n : 1,
  JSON.stringify(d.what === "water" ? { tile: d.tile, with: d.can, ...(d.whose ? { whose: d.whose } : {}) } : d.what === "sow" ? { tile: d.tile, with: "seedKangkong" } : { well: 0 }),
]);
{
  const stories = take(WELL.stories);
  t.section(`the well's book again: v127's ${stories.length} stories of water, read by the reader as it is now`);
  let badBook = null, badEnd = null, books = 0;
  for (const [n, s] of stories.entries()) {
    await wipe();
    let asked = 0;
    for (let i = 0; i <= s.deeds.length; i++) {
      for (; asked < s.asks.length && s.asks[asked].after === i; asked++) {
        const a = s.asks[asked], got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [a.me, a.now])).r;
        books++;
        if (!same(got, { ...a.want, carriers: a.want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) })) badBook ??= { story: n, after: i, me: a.me, want: a.want, got };
      }
      if (i < s.deeds.length) await write(s.deeds[i]);
    }
    const end = await book(), want = { water: s.end.water, cans: s.end.cans, carriers: s.end.carriers, reach: s.end.reach };
    if (!same(end, want)) badEnd ??= { story: n, differs: Object.keys(want).filter((k) => !same(end[k], want[k])) };
    if (!same(await helpNow(), s.end.help)) badEnd ??= { story: n, differs: ["help"], want: JSON.stringify(s.end.help).slice(0, 400), got: JSON.stringify(await helpNow()).slice(0, 400) };
  }
  t.check(`the book reads as it did: ${books} readings`, !badBook && books > 100, badBook ? JSON.stringify(badBook).slice(0, 1500) : "");
  t.check("at each story's end the well's water, the cans, the carriers and what was reached are what they were, and who helped which plant is what the code keeps", !badEnd, badEnd ?? "");
}

/* ── the jar's rules ─────────────────────────────────────────────────────── */

t.section(`the jar's rules: ${KIND.rules.length} cases, each as the site's own code answers it`);
{
  const CALL = {
    jar_shares: "town.jar_shares($1::int, $2::jsonb)", jar_settle: "town.jar_settle($1::jsonb, $2::jsonb, $3::jsonb, $4::int)",
    jar_drop: "town.jar_drop($1::jsonb, $2::jsonb, $3::jsonb)", jar_collect: "town.jar_collect($1::jsonb, $2::jsonb)",
  };
  const tally = new Map();
  for (const c of KIND.rules) {
    let got, error = null;
    try { got = (await t.db.query(`select ${CALL[c.fn]} as r`, c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
    // (what is left waiting is told as nothing when there is nothing, here as there)
    if (c.fn === "jar_collect" && got?.ok && !("mine" in got)) got = { ...got, mine: null };
    const ok = !error && same(got ?? null, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args, want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1400)}` : "");
  t.check("every one of the four rules has its cases", same([...tally.keys()].sort(), ["jar_collect", "jar_drop", "jar_settle", "jar_shares"]), [...tally.keys()]);
  v = await t.sql(`select r, town.round_from(r) as at, town.round_of(town.round_from(r)) as back, town.round_of(town.round_from(r) - 1) as just_before from generate_series(59000, 59005) r`);
  t.check("a round begins where the rounds' own rule says it does", v.rows.every((x) => x.back === x.r && x.just_before === x.r - 1), v.rows);
}

/* ── stories of plants helped and thanks given ───────────────────────────── */

{
  const stories = take(KIND.stories);
  t.section(`${stories.length} stories of plants helped and thanks given: ${stories.reduce((n, s) => n + s.steps.length, 0)} steps`);
  const bad = {}, done = {};
  const named = (list) => list.map((h) => ({ ...h, name: NAME[h.id] }));
  for (const [n, s] of stories.entries()) {
    await wipe();
    for (const [i, step] of s.steps.entries()) {
      let kind, got, want = step.want;
      if (step.deed) { await write(step.deed); continue; }
      if (step.thank) {
        kind = "thank";
        const [x, y] = step.thank.plot.split(",").map(Number);
        got = (await one(`select town.thank($1::int, $2::int, $3::uuid, $4::bigint) as r`, [x, y, step.thank.me, step.thank.now])).r;
      } else if (step.helpers) {
        kind = "helpers";
        const [x, y] = step.helpers.plot.split(",").map(Number);
        got = (await one(`select town.helpers_of($1::int, $2::int, $3::uuid) as r`, [x, y, step.helpers.me])).r;
      } else if (step.toThank) {
        kind = "toThank";
        got = (await one(`select town.to_thank($1::uuid, $2::bigint) as r`, [step.toThank.me, step.toThank.now])).r;
        want = Object.fromEntries(Object.entries(want).map(([plot, list]) => [plot, named(list)]));
      } else if (step.board) {
        kind = "board";
        got = (await one(`select town.thanks_board($1::uuid, $2::bigint) as r`, [step.board.me, step.board.now])).r;
        want = { ...want, today: named(want.today), top: named(want.top), ever: named(want.ever) };
      } else {
        kind = "work";
        got = (await one(`select town.jar_work($1::int, $2::int) as r`, [step.work.from, step.work.to])).r;
      }
      done[kind] = (done[kind] ?? 0) + 1;
      if (!same(got, want)) bad[kind] ??= { story: n, step: i, ask: step[kind], want, got };
    }
    if (!same(await helpNow(), s.end)) bad.end ??= { story: n, want: JSON.stringify(s.end).slice(0, 500), got: JSON.stringify(await helpNow()).slice(0, 500) };
  }
  for (const [kind, words] of [["thank", "a thanks is given to whom the code gives it, or refused as it refuses"], ["helpers", "who helped a plant is who the code says"],
    ["toThank", "whom somebody has still to thank today, plot by plot"], ["board", "the board reads as the code's does"], ["work", "what each did for the others between two rounds, read off the deeds"]]) {
    t.check(`${words}: ${done[kind] ?? 0} times`, !bad[kind] && (done[kind] ?? 0) > 20, bad[kind] ? JSON.stringify(bad[kind]).slice(0, 1500) : done[kind]);
  }
  t.check("at each story's end, who helped which plant is what the code keeps", !bad.end, bad.end ?? "");
  await wipe();
}

/* ── thanks, through the functions a member calls ────────────────────────── */

t.section("thanks: by the functions a member calls");
await clock(MORNING + 2 * HOUR);
const today = (await one(`select town.day_of(town.now_ms()) as d`)).d;
{
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'`);
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
  await purse(U.guest, 0, [{ item: "canCopper", n: 1 }], 100, { hand: "canCopper" });
  await plant(133, 5, growing(U.admin));
  await plant(134, 5, growing(U.admin));
  await plant(135, 5, growing(U.m2));
  await call(U.m1, "town_chore", ...RIVER);
  await call(U.m1, "town_chore", ...AT_WELL);
  await call(U.m2, "town_chore", ...AT_WELL);
  // m2 waters two of the admin's plants with m1's water, and a plant of their own; the guest waters one with a can the book never saw filled
  const said = [await call(U.m2, "town_tend", 133, 5), await call(U.m2, "town_tend", 134, 5), await call(U.m2, "town_tend", 135, 5)];
  await t.sql(`update public.town_purses set doc = jsonb_set(doc, '{bag,0}', '{"item": "canCopper", "n": 1, "water": 5}') where member_id = $1`, [U.guest]);
  await clock(MORNING + 3 * HOUR + MIN);
  said.push(await call(U.guest, "town_tend", 133, 5));
  t.check("three plants watered by one, one again by another", said.every((x) => x.ok === true && x.deed === "water"), said.map((x) => x.ok ?? x));
  v = await helpNow();
  t.check("each plot remembers who helped: the waterer, and whose water it was; a plant of the waterer's own has only the carrier", same(v, {
    "133,5": { owner: U.admin, by: { [U.m1]: { water: 0, carry: 1 }, [U.m2]: { water: 1, carry: 0 }, [U.guest]: { water: 1, carry: 0 } } },
    "134,5": { owner: U.admin, by: { [U.m1]: { water: 0, carry: 1 }, [U.m2]: { water: 1, carry: 0 } } },
    "135,5": { owner: U.m2, by: { [U.m1]: { water: 0, carry: 1 } } },
  }), v);
  r = await call(U.admin, "town_to_thank");
  t.check("the owner is told whom to thank, plot by plot, each by name", same(Object.keys(r.toThank).sort(), ["133,5", "134,5"]) && same((r.toThank["133,5"] ?? []).map((h) => [h.id, h.name, h.water, h.carry]).sort(),
    [[U.guest, NAME[U.guest], 1, 0], [U.m1, NAME[U.m1], 0, 1], [U.m2, NAME[U.m2], 1, 0]].sort()) && typeof r.now === "number", r);
  r = await call(U.m1, "town_to_thank");
  t.check("somebody with no plant has nobody to thank", same(r.toThank, {}), r);
  r = await call(U.m2, "town_thank", 133, 5);
  t.check("it is not somebody else's to thank for my plant", r.ok === false && r.why === "none" && (await one(`select count(*)::int as n from public.town_thanks`)).n === 0, r);
  const deeds = (await one(`select count(*)::int as n from public.town_deeds`)).n;
  r = await call(U.admin, "town_thank", 133, 5);
  v = (await t.sql(`select from_id, to_id, day from public.town_thanks order by id`)).rows;
  const line = await one(`select member_id, what, thing, n, coins, doc from public.town_deeds order by id desc limit 1`);
  t.check("one tap thanks all three, a line to each, today's", r.ok === true && same([...r.thanked].sort(), [U.guest, U.m1, U.m2].sort()) && v.length === 3 && v.every((x) => x.from_id === U.admin && x.day === today), { r, v });
  t.check("…it is written down as one deed, and the answer says nobody is left to thank today", (await one(`select count(*)::int as n from public.town_deeds`)).n === deeds + 1 && line.what === "thank" && Number(line.n) === 3 && same(line.doc.tile, [133, 5])
    && same([...line.doc.to].sort(), [U.guest, U.m1, U.m2].sort()) && same(r.toThank, {}), { line, toThank: r.toThank });
  r = await call(U.admin, "town_thank", 134, 5);
  t.check("the other plot's helpers were thanked already today: nothing more", r.ok === false && r.why === "none" && (await one(`select count(*)::int as n from public.town_thanks`)).n === 3, r);
  await clock(MORNING + 3 * HOUR + 2 * MIN);
  r = await call(U.m2, "town_thank", 135, 5);
  t.check("the waterer thanks the carrier for their own plant", r.ok === true && same(r.thanked, [U.m1]), r);
  r = await call(U.m1, "town_well_ranks");
  t.check("the carrier's page is told who thanked them today, by name, in the order they did", same(r.thanked, [{ id: U.admin, name: NAME[U.admin] }, { id: U.m2, name: NAME[U.m2] }]) && "ranks" in r, r);
  r = await call(U.m1, "town_well");
  t.check("the book has the board: two thanks today, this week and all told, and the most thanked", same(r.thanks?.today.map((x) => x.id), [U.admin, U.m2]) && r.thanks?.week === 2 && r.thanks?.all === 2
    && same(r.thanks?.top, [{ id: U.m1, name: NAME[U.m1], n: 2 }, { id: U.m2, name: NAME[U.m2], n: 1 }, { id: U.guest, name: NAME[U.guest], n: 1 }]) && same(r.thanks?.ever, r.thanks?.top) && !!r.wellBook && !!r.jar, r.thanks ?? r);
  // tomorrow they can be thanked again; a plot sown anew has nobody
  await clock(MORNING + 26 * HOUR);
  r = await call(U.admin, "town_to_thank");
  t.check("the next day there is somebody to thank again", same(Object.keys(r.toThank).sort(), ["133,5", "134,5"]), r);
  await t.sql(`insert into public.town_deeds (member_id, what, thing, n, doc) values ($1, 'sow', 'seedKangkong', 1, '{"tile": [133, 5], "with": "seedKangkong"}')`, [U.admin]);
  r = await call(U.admin, "town_to_thank");
  t.check("a plot sown anew has forgotten who helped the plant that was there", same(Object.keys(r.toThank), ["134,5"]) && !("133,5" in await helpNow()), r);
  r = await call(U.admin, "town_thank", 134, 5);
  t.check("…and thanks given a second day are a second line each", r.ok === true && r.thanked.length === 2 && (await one(`select count(*)::int as n from public.town_thanks where from_id = $1`, [U.admin])).n === 5, r);
  // a plot whose plant has come to be somebody else's, with no sowing told of: the helpers of the one before are forgotten
  const at = (await one(`select town.now_ms() as n`)).n;
  await write({ by: U.guest, at, what: "water", can: "canCopper", tile: [135, 5], whose: U.admin });
  t.check("watered as somebody else's plant now: the helpers of the plant that was there are forgotten", same((await helpNow())["135,5"], { owner: U.admin, by: { [U.guest]: { water: 1, carry: 0 } } }), (await helpNow())["135,5"]);
  await write({ by: U.m2, at: at + 1, what: "water", can: "can", tile: [135, 5] });
  t.check("…and watered by its owner with a carrier's water, when it is somebody else's again: only that carrier", same((await helpNow())["135,5"], { owner: U.m2, by: { [U.m1]: { water: 0, carry: 1 } } }), (await helpNow())["135,5"]);
  r = await call(U.admin, "town_thank", null, 5);
  t.check("no plot said, nobody thanked", r.ok === false && r.why === "none", r);
}

/* ── the jar, through the functions a member calls ───────────────────────── */

t.section("the jar: dropped into, shared when the round turns, taken from");
{
  await wipe();
  await t.sql(`truncate public.town_jar, public.town_jar_owed, public.town_jar_log restart identity`);
  // Tuesday 09:00: the round that began at seven. m1 pours three bucketfuls (24), m2 waters one plant of somebody else's (1).
  await clock(MORNING);
  const round = (await one(`select town.round_of(town.now_ms()) as r`)).r;
  await write({ by: U.m1, at: MORNING - 10 * MIN, what: "pour", n: 3 });
  await write({ by: U.m2, at: MORNING - 5 * MIN, what: "water", can: "can", tile: [133, 5], whose: U.admin });
  await write({ by: U.guest, at: MORNING - 3 * HOUR, what: "pour", n: 9 });   // (the round before: not this one's work)
  await purse(U.admin, 60, [{ item: "kangkong", n: 6 }, { item: "hoe", n: 1 }, { item: "tilapia", n: 1 }], 100);
  r = await call(U.admin, "town_well");
  t.check("the jar is there, empty, and says when it is next shared: seven in the evening", same({ coins: r.jar?.coins, things: r.jar?.things, round: r.jar?.round, mine: r.jar?.mine }, { coins: 0, things: [], round, mine: null })
    && r.jar?.next === Date.parse("2026-10-06T19:00:00+07:00"), r.jar);
  r = await call(U.admin, "town_jar_drop", null, null, 50);
  t.check("fifty coins dropped: out of the purse, into the jar", r.ok === true && r.purse.coins === 10 && r.jar?.coins === 50 && (await jarNow()).coins === 50, r);
  r = await call(U.admin, "town_jar_drop", 0, 4);
  t.check("four of something grown dropped: out of the bag, into the jar", r.ok === true && count(r.purse.bag, "kangkong") === 2 && same(r.jar?.things, [["kangkong", 4]]), r);
  r = await call(U.admin, "town_jar_drop", 2, 1);
  t.check("a fish too, after it", r.ok === true && same(r.jar?.things, [["kangkong", 4], ["tilapia", 1]]) && r.purse.bag[2] === null, r.jar);
  const was = await jarNow();
  const refusals = [[await call(U.admin, "town_jar_drop", 1, 1), "unwanted"], [await call(U.admin, "town_jar_drop", 5, 1), "none"], [await call(U.admin, "town_jar_drop", 0, 3), "amount"],
    [await call(U.admin, "town_jar_drop", null, null, 11), "coins"], [await call(U.admin, "town_jar_drop", null, null, 0), "amount"], [await call(U.admin, "town_jar_drop", null, null, -5), "amount"]];
  t.check("a tool, an empty slot, more than there is, more coins than one has, no coins: each refused, and the jar as it was", refusals.every(([x, why]) => x.ok === false && x.why === why) && same(await jarNow(), was) && (await kept(U.admin)).coins === 10, refusals.map(([x]) => x.why ?? x));
  v = (await t.sql(`select member_id, round, what, coins, things from public.town_jar_log order by id`)).rows;
  t.check("every drop is written down: who, in which round, what", same(v, [{ member_id: U.admin, round, what: "drop", coins: 50, things: [] }, { member_id: U.admin, round, what: "drop", coins: 0, things: [["kangkong", 4]] },
    { member_id: U.admin, round, what: "drop", coins: 0, things: [["tilapia", 1]] }]), v);
  v = (await t.sql(`select what, thing, n, coins from public.town_deeds where what = 'jar_drop' order by id`)).rows.map((x) => ({ ...x, n: Number(x.n), coins: Number(x.coins) }));
  t.check("…and as deeds: the coins paid are below nothing", same(v, [{ what: "jar_drop", thing: null, n: 1, coins: -50 }, { what: "jar_drop", thing: "kangkong", n: 4, coins: 0 }, { what: "jar_drop", thing: "tilapia", n: 1, coins: 0 }]), v);
  r = await call(U.m1, "town_jar_take");
  t.check("in the same round nothing waits for anybody", r.ok === false && r.why === "nothing" && same(await owedNow(), {}), r);

  // the round turns: seven in the evening
  await clock(Date.parse("2026-10-06T19:00:30+07:00"));
  r = await call(U.m2, "town_well");
  v = await owedNow();
  t.check("when the round has turned, the jar is shared as it is next looked at: twenty-four parts to one", same(v, { [U.m1]: { coins: 48, things: [["kangkong", 4], ["tilapia", 1]] }, [U.m2]: { coins: 2, things: [] } }), v);
  t.check("…the jar is empty, in the new round, and the one who looked is told what waits for them", same({ coins: r.jar?.coins, things: r.jar?.things, round: r.jar?.round }, { coins: 0, things: [], round: round + 1 }) && same(r.jar?.mine, { coins: 2, things: [] })
    && r.jar?.next === Date.parse("2026-10-07T07:00:00+07:00"), r.jar);
  v = await one(`select member_id, round, what, coins, things from public.town_jar_log order by id desc limit 1`);
  t.check("the sharing is written down: what there was, and by whose work", v.member_id === null && v.round === round && v.what === "share" && v.coins === 50 && same(v.things, { things: [["kangkong", 4], ["tilapia", 1]], work: [[U.m1, 24], [U.m2, 1]] }), v);
  await purse(U.m1, 3, [{ item: "kangkong", n: 1 }], 100);
  r = await call(U.m1, "town_jar_take");
  t.check("the carrier takes theirs: the coins and the things, into the purse", r.ok === true && r.coins === 48 && same(r.things, [["kangkong", 4], ["tilapia", 1]]) && r.purse?.coins === 51 && count(r.purse.bag, "kangkong") === 5 && count(r.purse.bag, "tilapia") === 1 && r.jar?.mine === null, r);
  v = await one(`select what, coins, doc from public.town_deeds order by id desc limit 1`);
  t.check("…written down, the coins above nothing", v.what === "jar_take" && Number(v.coins) === 48 && same(v.doc.things, [["kangkong", 4], ["tilapia", 1]]) && same(await owedNow(), { [U.m2]: { coins: 2, things: [] } }), v);
  r = await call(U.m1, "town_jar_take");
  t.check("once: nothing waits any more", r.ok === false && r.why === "nothing" && (await kept(U.m1)).coins === 51, r);
  // a full bag: the things wait on
  await t.sql(`insert into public.town_jar_owed (member_id, coins, things) values ($1, 5, '[["carp", 2]]') on conflict (member_id) do update set coins = 5, things = '[["carp", 2]]'`, [U.guest]);
  await purse(U.guest, 0, Array.from({ length: 10 }, () => ({ item: "rod", n: 1 })), 100);
  r = await call(U.guest, "town_jar_take");
  t.check("a full bag takes the coins and leaves the things waiting", r.ok === true && r.coins === 5 && same(r.things, []) && r.purse?.coins === 5 && same(r.jar?.mine, { coins: 0, things: [["carp", 2]] }), r);
  r = await call(U.guest, "town_jar_take");
  t.check("…and with only things waiting and no room, nothing is taken", r.ok === false && r.why === "full" && same((await owedNow())[U.guest], { coins: 0, things: [["carp", 2]] }), r);

  // nobody worked: the jar keeps what it has; then somebody does
  await purse(U.admin, 30, [], 100);
  await call(U.admin, "town_jar_drop", null, null, 30);
  await clock(Date.parse("2026-10-07T07:00:10+07:00"));
  r = await call(U.admin, "town_well");
  t.check("a round in which nobody worked for the others: the jar keeps what it has", r.jar?.coins === 30 && r.jar?.round === round + 2 && !(U.admin in await owedNow()), r.jar);
  await write({ by: U.guest, at: Date.parse("2026-10-07T09:00:00+07:00"), what: "pour", n: 1 });
  await clock(Date.parse("2026-10-08T07:30:00+07:00"));   // (two rounds on: nobody looked in between)
  r = await call(U.admin, "town_well");
  t.check("looked at two rounds later, it is shared by the work of all the time since", r.jar?.coins === 0 && r.jar?.round === round + 4 && (await owedNow())[U.guest]?.coins === 30, { jar: r.jar, owed: await owedNow() });
  v = await one(`select (select coalesce(sum(coins), 0)::int from public.town_jar_log where what = 'drop') as dropped, (select coalesce(sum(coins), 0)::int from public.town_jar_log where what = 'take') as taken,
    (select coins from public.town_jar) as jar, (select coalesce(sum(coins), 0)::int from public.town_jar_owed) as waiting`);
  t.check("no coin is made or lost: what was dropped is what was taken, what waits and what is in the jar", v.dropped === 80 && v.dropped === v.taken + v.jar + v.waiting - 5, v);
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("who may read and call what");
for (const [fn, args] of [["town_to_thank", []], ["town_thank", [133, 5]], ["town_jar_drop", [null, null, 1]], ["town_jar_take", []]]) {
  r = await call("anon", fn, ...args);
  const u = await call(U.unver, fn, ...args), n = await call(U.nochar, fn, ...args);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
}
for (const table of FIVE) {
  const a = await t.as("anon", `select * from public.${table}`), m = await t.as(U.m1, `select * from public.${table}`), w = await t.as(U.m1, `delete from public.${table}`);
  t.check(`${table}: nobody in a browser reads it or writes it`, a.code === "42501" && m.code === "42501" && w.code === "42501", [a, m, w]);
}
r = await t.as(U.m1, `insert into public.town_thanks (from_id, to_id, day) values ('${U.m2}', '${U.m1}', 1)`);
t.check("a member cannot write a thanks to themselves in somebody's name", r.code === "42501", r);
r = await t.as(U.m1, `select town.thank(133, 5, '${U.admin}'::uuid, 0)`);
t.check("…nor call the rule in somebody's name", r.code === "42501", r);
r = await t.as("service", `insert into public.town_thanks (from_id, to_id, day) values ('${U.m1}', '${U.m1}', 1)`);
t.check("nobody is thanked by themselves, whoever writes the line", !!r.error && /check/.test(r.error), r);
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m1, "town_jar_take"), a = await call(U.admin, "town_to_thank");
  t.check("while the game is shut these are an admin's only", m.code === "42501" && "toThank" in a, [m, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── a member who goes ───────────────────────────────────────────────────── */

t.section("a member who goes");
{
  await wipe();
  await t.sql(`truncate public.town_jar_owed, public.town_jar_log restart identity`);
  const at = (await one(`select town.now_ms() as n`)).n;
  for (const d of [{ by: U.m2, at: at - 9, what: "pour", n: 1 }, { by: U.m2, at: at - 8, what: "fill", can: "can" }, { by: U.m2, at: at - 7, what: "water", can: "can", tile: [133, 5], whose: U.m1 },
    { by: U.m1, at: at - 6, what: "fill", can: "can" }, { by: U.m1, at: at - 5, what: "water", can: "can", tile: [134, 5], whose: U.m2 }]) await write(d);
  await call(U.m1, "town_thank", 133, 5);
  await call(U.m2, "town_thank", 134, 5);
  await t.sql(`insert into public.town_jar_owed (member_id, coins) values ($1, 4), ($2, 6)`, [U.m1, U.m2]);
  await t.sql(`insert into public.town_jar_log (member_id, round, what, coins) values ($1, 1, 'drop', 4), ($2, 1, 'drop', 6)`, [U.m1, U.m2]);
  v = { help: Object.keys(await helpNow()).length, thanks: (await one(`select count(*)::int as n from public.town_thanks`)).n };
  t.check("before: each helped a plant of the other's, and each thanked the other", v.help === 2 && v.thanks === 2, v);
  await t.sql(`delete from public.profiles where id = $1`, [U.m2]);
  v = { help: await helpNow(), thanks: (await one(`select count(*)::int as n from public.town_thanks`)).n, owed: await owedNow(), log: (await t.sql(`select member_id, coins from public.town_jar_log order by id`)).rows };
  t.check("their help, their plants' helpers, the thanks they gave and had, and what waited for them are gone with them", same(v.help, {}) && v.thanks === 0 && same(v.owed, { [U.m1]: { coins: 4, things: [] } }), v);
  t.check("what they dropped stays written down, as nobody's", same(v.log, [{ member_id: U.m1, coins: 4 }, { member_id: null, coins: 6 }]), v.log);
}

/* ── a third time ────────────────────────────────────────────────────────── */

t.section("run a third time");
{
  const was = { book: await book(), help: await helpNow(), jar: await jarNow(), owed: await owedNow(), thanks: (await one(`select count(*)::int as n from public.town_thanks`)).n };
  await t.run(FILE, "v129 a third time");
  const is = { book: await book(), help: await helpNow(), jar: await jarNow(), owed: await owedNow(), thanks: (await one(`select count(*)::int as n from public.town_thanks`)).n };
  t.check("what is kept is as it was", same(is, was), is);
  t.check("…every function its own text still, and one trigger", same(await texts(), textsNow) && (await one(`select count(*)::int as n from pg_trigger where tgrelid = 'public.town_deeds'::regclass and not tgisinternal`)).n === 1);
  await plant(136, 5, growing(U.admin));
  await purse(U.m1, 0, [{ item: "can", n: 1, water: 3 }], 100, { hand: "can" });
  r = await call(U.m1, "town_tend", 136, 5);
  t.check("…and the next plant of somebody else's watered is remembered", r.ok === true && same((await helpNow())["136,5"], { owner: U.admin, by: { [U.m1]: { water: 1, carry: 0 } } }), await helpNow());
}

await t.done();
