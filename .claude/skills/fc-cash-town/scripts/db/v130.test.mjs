/*
 * v130 — a hot afternoon, a bucket over a bed, and the yard's water jar: dry run in PGlite.
 *
 * v130 stands on v129 (the well's book, thanks, the jar at the well). A trigger on `town_plots` adds once more what a
 * watering added when it is hot; `town_ditch` pours a bucket over a bed; `town_yard_pour` fills the cooking yard's
 * jar and a trigger on `town_plays` gives a pot cooked with its water a helping more; and the well's book follows all
 * of it (its reader, its book and the jar's count of work written again). v105 to v131 are replayed as they ran (v126
 * and v131 are the insects', which ran before it), then:
 *
 *   · a morning of water and a soup before the file, and the file run twice;
 *   · its closing block; that nothing else changed: every function its own text, the six written again the lines meant;
 *   · the rules, case by case; the heat, case by case, by rows written under a sky; v127's stories of water again,
 *     and thirty stories with the three new lines among them, step by step;
 *   · the heat through the functions a member calls; a bucket over a bed; the yard's jar and a soup;
 *   · that neither trigger can undo a deed; who may read and call what; a member who goes; the file a third time.
 *
 *   node v130.test.mjs            (STORIES=<n> takes the first n of each kind; RULES=0 leaves the rule cases out)
 *   node mutate.mjs <the file> v130.test.mjs v130.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
/** The file: a draft beside this test while there is one and supabase/ has none; then supabase/; then history, once it has run. */
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v130_")), HERE = new URL("./v130_draft.sql", import.meta.url);
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(130);
const DIR = process.env.VECTORS ?? "now";
const need = (name, how) => {
  const at = new URL(`./${DIR}/${name}`, import.meta.url);
  if (!existsSync(at)) { console.log(`no ${DIR}/${name}: run \`TOWN_VECTORS=<this folder>/${DIR} npx vitest run ${how}\` in the repo first`); process.exit(2); }
  return JSON.parse(readFileSync(at, "utf8"));
};
const WELL = need("vectors-v127.json", "lib/town/db-vectors-well.test.ts"), CARRY = need("vectors-v130.json", "lib/town/db-vectors-carry.test.ts");
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
// (everything of the town's that has run, in the order it ran)
const RAN = [105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 127, 128, 129, 126, 131];
const MIN = 60_000, HOUR = 3_600_000;
// 09:00 in Bangkok on a Tuesday; one in the afternoon of the same day, and five
const MORNING = Date.parse("2026-10-06T09:00:00+07:00"), ONE = Date.parse("2026-10-06T13:00:00+07:00"), FIVE = Date.parse("2026-10-06T17:00:00+07:00");
const settle = (v) => (Array.isArray(v) ? v.map(settle) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, settle(v[k])])) : v);
const same = (a, b) => JSON.stringify(settle(a)) === JSON.stringify(settle(b));

const t = await supabaseLike({ extra });
for (const n of RAN) await t.run(migration(n), `v${n}`);
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
/** Cook some things as somebody, alone, with a stirring that missed so many times. */
const cook = async (who, things, misses = 0) => {
  const r = await t.as(who, `select public.town_cook($1::jsonb, '{}'::uuid[], $2::jsonb) as r`, [JSON.stringify(things), JSON.stringify({ hits: 4, misses, secs: 6 })]);
  return r.error ? r : r.rows[0].r;
};
const kept = async (who) => { const r = await one(`select coins, doc from public.town_purses where member_id = $1`, [who]); return { coins: r.coins, ...r.doc }; };
const staminaOf = async (who) => (await kept(who)).stamina.left;
const plant = (x, y, doc) => t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values ($1::int, $2::int, town.bed_of($1::int, $2::int), 'tilled', $3::jsonb, 0)
  on conflict (x, y) do update set soil = 'tilled', plant = excluded.plant, changed = 0`, [x, y, JSON.stringify(doc)]);
const growing = (by, over = {}) => ({ by, crop: "pumpkin", sown: MORNING - HOUR, boost: 0, watered: 0, fed: 0, guard: MORNING + 96 * HOUR, cured: 0, picked: 0, pickedAt: 0, ...over });
const plotNow = async (x, y) => (await one(`select soil, plant, changed from public.town_plots where x = $1 and y = $2`, [x, y])) ?? null;
/** The sky of the quarter hour a moment is in, as the database has it (none: that quarter hour is not written). */
const sky = async (ms, word) => {
  await t.sql(`delete from public.town_weather where slot = floor(${ms}::numeric / 900000)::bigint`);
  if (word) await t.sql(`insert into public.town_weather (slot, sky, wind, gust, rain) values (floor(${ms}::numeric / 900000)::bigint, $1, 5, 10, $2)`, [word, ["drizzle", "rain", "storm"].includes(word) ? 1 : 0]);
};
/** What the well's book keeps (v127's four), the yard's water and whose pots were cooked with whose. */
const book = async () => ({
  water: (await t.sql(`select member_id as by, buckets as left from public.town_well_water order by id`)).rows,
  cans: Object.fromEntries((await t.sql(`select member_id, item, carrier, waterings from public.town_well_cans order by 1, 2`)).rows.map((r) => [`${r.member_id}/${r.item}`, { by: r.carrier, left: r.waterings }])),
  carriers: Object.fromEntries((await t.sql(`select member_id, buckets, taken from public.town_carriers order by 1`)).rows.map((r) => [r.member_id, { buckets: r.buckets, taken: r.taken }])),
  reach: (await t.sql(`select day, carrier, x, y, owner, n from public.town_well_reach order by 1, 2, 3, 4`)).rows.reduce((all, r) => {
    (all[`${r.day}/${r.carrier}`] ??= {})[`${r.x},${r.y}`] = { owner: r.owner, n: r.n };
    return all;
  }, {}),
});
const yardNow = async () => ({
  yard: (await t.sql(`select member_id as by, buckets as left from public.town_yard_water order by id`)).rows,
  pots: (await t.sql(`select day, carrier, cook, n from public.town_yard_reach order by 1, 2, 3`)).rows.reduce((all, r) => { (all[`${r.day}/${r.carrier}`] ??= {})[r.cook] = r.n; return all; }, {}),
});
const helpNow = async () => (await t.sql(`select x, y, helper, owner, water, carry from public.town_plot_help order by 1, 2, 3`)).rows.reduce((all, r) => {
  const plot = (all[`${r.x},${r.y}`] ??= { owner: r.owner, by: {} });
  plot.by[r.helper] = { water: r.water, carry: r.carry };
  return all;
}, {});
const jarIs = async () => Number((await one(`select doc from public.town_things where key = 'yard'`))?.doc ?? NaN);
const wellIs = async () => Number((await one(`select doc from public.town_things where key = 'well'`)).doc);
const deedsSince = async (id) => (await t.sql(`select id, member_id, what, thing, n, doc from public.town_deeds where id > $1 order by id`, [id])).rows.map((d) => ({ ...d, n: Number(d.n) }));
const lastDeed = async () => Number((await one(`select coalesce(max(id), 0) as id from public.town_deeds`)).id);
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

/* ── a morning of water and a soup, before the file ──────────────────────── */

const RIVER = [16, 38], SOUP = [["pumpkin", 1], ["scallion", 1], ["salt", 1]];
const wellAt = (await one(`select town.cat('farming')->'wellAt' as at`)).at, AT_WELL = [wellAt[0] + 1, wellAt[1]];
const cookPurse = (who, more = []) => purse(who, 0, [{ item: "pot", n: 1 }, { item: "pumpkin", n: 3 }, { item: "scallion", n: 3 }, { item: "salt", n: 3 }, ...more], 100, { hand: "pot" });
await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'well'; truncate public.town_well_water restart identity`);
await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
await purse(U.m2, 0, [{ item: "can", n: 1 }], 100, { hand: "can" });
await plant(133, 5, growing(U.admin));
await plant(134, 5, growing(U.admin));
await sky(MORNING, "clear");
let soupBefore;
{
  const said = [];
  for (let i = 0; i < 2; i++) { said.push(await call(U.m1, "town_chore", ...RIVER)); said.push(await call(U.m1, "town_chore", ...AT_WELL)); }
  said.push(await call(U.m2, "town_chore", ...AT_WELL));
  said.push(await call(U.m2, "town_tend", 133, 5));
  t.check("before the file: two bucketfuls carried, a can filled from them, a plant of somebody else's watered", said.every((r) => r.ok === true) && (await wellIs()) === 1, said.map((r) => r.ok ?? r));
  await cookPurse(U.guest);
  soupBefore = await cook(U.guest, SOUP);
  t.check("…and a soup cooked: five helpings", soupBefore.ok === true && soupBefore.made === "pumpkinSoup" && soupBefore.n === 5 && (await kept(U.guest)).bag.find((s) => s?.item === "potFull").of.left === 5, soupBefore);
}
{
  const due = await one(`select town.well_due(200, '{1}') as second, town.well_due(600, '{1}') as third, town.cat('farming')->'buckets' as buckets, town.cat('items') ? 'waterCart' as thing`);
  t.check("before the file: the well has nothing for the second rank, and there is no cart", due.second === null && same(due.third, [3, "waterYokeGreat"]) && !("waterCart" in due.buckets) && due.thing === false, due);
}
const bookWas = await book(), helpWas = await helpNow(), textsWas = await texts(), plotWas = await plotNow(133, 5), deedsWas = await lastDeed();

await t.runTwice(FILE, "v130");
const textsNow = await texts();
let v, r;

/* ── what it should say afterwards ───────────────────────────────────────── */

t.section("what it should say afterwards");
const TWO = ["town_yard_water", "town_yard_reach"];
v = await one(`select count(*) filter (where c.relrowsecurity)::int as closed,
       (select count(*)::int from information_schema.role_table_grants g
         where g.table_schema = 'public' and g.table_name = any($1) and g.grantee in ('anon', 'authenticated')) as grants
  from pg_class c where c.relname = any($1) and c.relnamespace = 'public'::regnamespace`, [TWO]);
t.check("the two tables are closed: row security on, nothing granted to a browser", same(v, { closed: 2, grants: 0 }), v);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
  from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_ditch', 'town_yard', 'town_yard_pour', 'town_well', 'town_well_ranks') order by 1`);
t.check("the five functions are a member's to call, and nobody's signed out", same(v.rows, ["town_ditch", "town_well", "town_well_ranks", "town_yard", "town_yard_pour"].map((proname) => ({ proname, anon: false, member: true }))), v.rows);
v = await t.sql(`select c.relname, tg.tgname, tg.tgenabled::text as on from pg_trigger tg join pg_class c on c.oid = tg.tgrelid where tg.tgname in ('town_plots_heat', 'town_plays_yard', 'town_deeds_well') order by 1`);
t.check("the three triggers are there: on the plots, on the plays, on the deeds", same(v.rows, [{ relname: "town_deeds", tgname: "town_deeds_well", on: "O" }, { relname: "town_plays", tgname: "town_plays_yard", on: "O" }, { relname: "town_plots", tgname: "town_plots_heat", on: "O" }]), v.rows);
v = await one(`select pg_get_triggerdef(oid) as def from pg_trigger where tgname = 'town_deeds_well'`);
t.check("the deeds' trigger reads the three new lines with the four it read", ["pour", "fill", "water", "sow", "ditch", "yard", "fresh"].every((w) => v.def.includes(`'${w}'`)), v.def);
v = await one(`select town.cat('heat') as heat, town.cat('ditch') as ditch, town.cat('yard') as yard`);
t.check("the catalog has the heat's hours, the ditch's numbers and the jar's", same(v.heat, { from: 12, to: 16, skies: ["clear"], by: 1 }) && same(v.ditch, { plants: 8, cost: 3 })
  && same({ ...v.yard, at: v.yard.at.length }, { holds: 10, gives: 1, cost: 1, dry: ["skewer"], at: 7 }), v);
const JAR_AT = v.yard.at[0];
v = await one(`select town.deed_th('ditch') as ditch, town.deed_th('yard') as yard, town.deed_th('fresh') as fresh, town.deed_th('thank') as thank, town.deed_th('pour') as pour`);
t.check("the tally has its three words more, and the ones it had", same(v, { ditch: "เทน้ำรดทั้งแปลง", yard: "เทน้ำใส่โอ่งที่ลานครัว", fresh: "หม้อได้น้ำจากโอ่ง", thank: "ขอบคุณคนที่ช่วยดูแลผัก", pour: "เทน้ำลงบ่อ" }), v);
v = await one(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
       (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace
         and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the rules are nobody's in a browser", same(v, { member_has_rules: false, open: 0 }), v);
t.check("the yard's jar is there, empty", (await jarIs()) === 0);

/* ── nothing else changed ────────────────────────────────────────────────── */

t.section("nothing else changed");
{
  const NEW = ["town.hot(bigint)", "town.plot_heat()", "town.ditch(jsonb,jsonb,integer,integer,bigint)", "town.yard_pour(jsonb,integer,bigint)", "town.takes_water(text)", "town.yard_freshen(jsonb,text,integer)", "town.yard_fresh()",
    "town_ditch(integer,integer)", "town_yard()", "town_yard_pour(integer,integer)"];
  const AGAIN = ["town.well_seen(uuid,bigint,text,text,numeric,jsonb)", "town.well_book(uuid,bigint)", "town.jar_work(integer,integer)", "town_well()", "town_well_ranks()", "town.deed_th(text)"];
  const added = Object.keys(textsNow).filter((sig) => !(sig in textsWas)), gone = Object.keys(textsWas).filter((sig) => !(sig in textsNow));
  t.check("ten functions are new, none is gone", same([...added].sort(), [...NEW].sort()) && gone.length === 0, { added: added.filter((s) => !NEW.includes(s)), missing: NEW.filter((s) => !added.includes(s)), gone });
  const others = Object.keys(textsWas).filter((sig) => !AGAIN.includes(sig) && textsWas[sig] !== textsNow[sig]);
  t.check("every other function there was is its text from before to the letter: the farm's, the kitchen's, the thanks', the jar's", others.length === 0 && Object.keys(textsWas).length > 180
    && ["town_tend(integer,integer,jsonb,boolean)", "town.water(text,jsonb,jsonb,text,bigint)", "town_cook(jsonb,uuid[],jsonb)", "town.cook(jsonb,jsonb,jsonb,double precision,bigint)", "town_chore(integer,integer)", "town.note(uuid,text,text,numeric,numeric,jsonb)", "town.record(uuid,text,boolean,double precision,boolean,text,jsonb)"].every((sig) => sig in textsWas), others);
  let d = differ(textsWas["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"], textsNow["town.well_seen(uuid,bigint,text,text,numeric,jsonb)"]);
  t.check("the well's reader is v129's with twenty lines added and none taken away", d.gone.length === 0 && d.more.length === 20 && d.more.filter((line) => /^  elsif p_what /.test(line)).length === 2, d);
  d = differ(textsWas["town.well_book(uuid,bigint)"], textsNow["town.well_book(uuid,bigint)"]);
  t.check("the book is v127's but for what counts as carried, and the pots told when there are any: three lines written otherwise", d.gone.length === 3 && d.more.length === 10
    && d.gone.every((line) => /d\.what = 'pour'|'helped', v_helped\),/.test(line)), d);
  d = differ(textsWas["town.jar_work(integer,integer)"], textsNow["town.jar_work(integer,integer)"]);
  t.check("the jar's count of work is v129's with the yard's bucketfuls beside the well's: two lines written otherwise", d.gone.length === 2 && d.more.length === 2
    && same(d.more, d.gone.map((line) => line.replace("d.what = 'pour'", "d.what in ('pour', 'yard')"))), d);
  d = differ(textsWas["town_well()"], textsNow["town_well()"]);
  t.check("the book's own function is v129's with one line more", d.gone.length === 0 && same(d.more, ["  delete from public.town_yard_reach r where r.day < town.day_of(now_) - 7;"]), d);
  d = differ(textsWas["town_well_ranks()"], textsNow["town_well_ranks()"]);
  t.check("everybody's rank is v129's with the yard's jar told beside it", same(d.gone, ["    'thanked', town.thanks_board(me, town.now_ms())->'today');"]) && d.more.length === 2 && d.more[0] === "    'thanked', town.thanks_board(me, town.now_ms())->'today'," && /'yard', jsonb_build_object\('jar'/.test(d.more[1]), d);
  d = differ(textsWas["town.deed_th(text)"], textsNow["town.deed_th(text)"]);
  t.check("the tally's words are as they stood with three more: one line written otherwise", d.gone.length === 1 && d.more.length === 1
    && d.more[0] === d.gone[0].replace("else p_what end", "when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' else p_what end"), d);

  const after = (await t.sql(`select key, data, updated_at from public.town_catalog order by key`)).rows;
  const was = Object.fromEntries(before.map((row) => [row.key, row])), written = after.filter((row) => !was[row.key] || String(row.updated_at) !== String(was[row.key].updated_at)).map((row) => row.key);
  t.check("it seeds three rows and writes three over", same(written, ["ditch", "farming", "heat", "items", "well", "yard"]) && after.length === before.length + 3 && after.every((row) => written.includes(row.key) || same(row.data, was[row.key].data)), written);
  {
    // (whole rows are written over: each is what it was, but for the cart)
    const now = Object.fromEntries(after.map((row) => [row.key, row.data]));
    const { waterCart, ...things } = now.items, { waterCart: holds, ...buckets } = now.farming.buckets;
    t.check("…and the three written over are as they were but for the cart: the thing, what it carries, the rank it is given at",
      same(things, was.items.data) && same(waterCart, { kind: "tool", tier: 1, stack: 1, pays: 0 })
      && same({ ...now.farming, buckets }, was.farming.data) && holds === 6
      && same({ ...now.well, gifts: was.well.data.gifts }, was.well.data) && same(now.well.gifts, [[1, "waterYoke"], [2, "waterCart"], [3, "waterYokeGreat"]]),
      { waterCart, holds, gifts: now.well.gifts });
  }
  const odd = after.filter((row) => !same(row.data, CODE[row.key])).map((row) => row.key);
  t.check("every row of the catalog is what the site's code gives now", odd.length === 0 && after.length === before.length + 3, odd);
  t.check("what the book kept before the file is as it was, who helped whom too, and the plot watered that morning", same(await book(), bookWas) && same(await helpNow(), helpWas) && same(await plotNow(133, 5), plotWas) && (await lastDeed()) === deedsWas, await book());
  t.check("the pot cooked before the file has its five helpings still", (await kept(U.guest)).bag.find((s) => s?.item === "potFull").of.left === 5);
}

/* ── the rules ───────────────────────────────────────────────────────────── */

if (process.env.RULES !== "0") {
  t.section(`the rules: ${CARRY.rules.length} cases, each as the site's own code answers it`);
  await t.sql(`delete from public.town_weather`);
  const CALL = {
    ditch: "town.ditch($1::jsonb, $2::jsonb, $3::int, $4::int, $5::bigint)", yard_pour: "town.yard_pour($1::jsonb, $2::int, $3::bigint)", yard_freshen: "town.yard_freshen($1::jsonb, $2::text, $3::int)",
  };
  const tally = new Map();
  for (const c of CARRY.rules) {
    let got, error = null;
    try { got = (await t.db.query(`select ${CALL[c.fn]} as r`, c.args.map((a) => (a !== null && typeof a === "object" ? JSON.stringify(a) : a)))).rows[0].r; } catch (e) { error = e.message; }
    const ok = !error && same(got ?? null, c.want);
    const row = tally.get(c.fn) ?? { n: 0, bad: 0, first: null };
    row.n++;
    if (!ok) { row.bad++; row.first ??= { args: c.args, want: c.want, got: error ?? got }; }
    tally.set(c.fn, row);
  }
  for (const [fn, row] of tally) t.check(`${fn}: ${row.n} cases`, row.bad === 0, row.bad ? `${row.bad} differ; the first: ${JSON.stringify(row.first).slice(0, 1800)}` : "");
  t.check("every one of the three rules has its cases", same([...tally.keys()].sort(), ["ditch", "yard_freshen", "yard_pour"]), [...tally.keys()]);

  // the heat: a row as it was, written again under a sky at a moment, and what is kept
  let bad = null, hot = 0;
  for (const [i, c] of CARRY.heat.entries()) {
    await t.sql(`delete from public.town_weather; delete from public.town_plots where x = 136 and y = 9`);
    await sky(c.now, c.sky);
    await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (136, 9, town.bed_of(136, 9), $1, $2::jsonb, 0)`, [c.was.soil, JSON.stringify(c.was.plant)]);
    await t.sql(`update public.town_plots set soil = $1, plant = $2::jsonb, changed = $3::bigint where x = 136 and y = 9`, [c.next.soil, JSON.stringify(c.next.plant), c.now]);
    const got = await plotNow(136, 9);
    if (!same({ soil: got.soil, plant: got.plant }, c.want)) bad ??= { case: i, sky: c.sky, now: c.now, want: c.want.plant, got: got.plant, next: c.next.plant };
    if (c.want.plant.boost !== c.next.plant.boost) hot++;
  }
  t.check(`the heat: ${CARRY.heat.length} rows written under a sky at an hour are kept as the code keeps them, ${hot} of them a watering in the heat`, !bad && hot > 20, bad ? JSON.stringify(bad).slice(0, 1500) : hot);
  await t.sql(`delete from public.town_weather; delete from public.town_plots where x = 136 and y = 9`);
}

/* ── the well's book, as v127's dry run tells it; and with the new lines ── */

const wipe = () => t.sql(`truncate public.town_deeds, public.town_well_water, public.town_well_cans, public.town_carriers, public.town_well_reach, public.town_plot_help, public.town_thanks, public.town_yard_water, public.town_yard_reach restart identity`);
/** A line written into the deeds as the game's functions write it: the trigger reads it. */
const write = (d) => t.sql(`insert into public.town_deeds (member_id, at, what, thing, n, doc) values ($1, to_timestamp($2::bigint / 1000.0), $3, $4, $5::numeric, $6::jsonb)`, [
  d.by, d.at, d.what,
  d.what === "pour" || d.what === "yard" ? "bucket" : d.what === "fill" ? d.can : d.what === "ditch" ? d.can ?? null : d.what === "sow" ? "seedKangkong" : d.what === "fresh" ? "pumpkinSoup" : "kangkong",
  d.what === "pour" || d.what === "yard" || d.what === "ditch" ? d.n : 1,
  JSON.stringify(d.what === "water" ? { tile: d.tile, with: d.can, ...(d.whose ? { whose: d.whose } : {}) } : d.what === "sow" ? { tile: d.tile, with: "seedKangkong" }
    : d.what === "ditch" ? { tile: [133, 5], bed: 0, plants: d.plants } : d.what === "pour" ? { well: 0 } : { jar: 0 }),
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
    if (!same(await helpNow(), s.end.help)) badEnd ??= { story: n, differs: ["help"] };
    if (!same(await yardNow(), { yard: [], pots: {} })) badEnd ??= { story: n, differs: ["yard"] };
  }
  t.check(`the book reads as it did: ${books} readings`, !badBook && books > 100, badBook ? JSON.stringify(badBook).slice(0, 1500) : "");
  t.check("at each story's end the well's water, the cans, the carriers, what was reached and who helped are what they were, and the yard has nothing", !badEnd, badEnd ?? "");
}
{
  const stories = take(CARRY.stories);
  t.section(`${stories.length} stories with a bucket over a bed, the yard's jar and pots cooked with its water among the lines: ${stories.reduce((n, s) => n + s.steps.length, 0)} steps`);
  const bad = {}, done = {};
  for (const [n, s] of stories.entries()) {
    await wipe();
    for (const [i, step] of s.steps.entries()) {
      let kind, got, want = step.want;
      if (step.deed) { await write(step.deed); continue; }
      if (step.book) {
        kind = "book";
        got = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [step.book.me, step.book.now])).r;
        want = { ...want, carriers: want.carriers.map((c) => ({ ...c, name: NAME[c.id] })) };
      } else if (step.helpers) {
        kind = "helpers";
        const [x, y] = step.helpers.plot.split(",").map(Number);
        got = (await one(`select town.helpers_of($1::int, $2::int, $3::uuid) as r`, [x, y, step.helpers.me])).r;
      } else {
        kind = "work";
        got = (await one(`select town.jar_work($1::int, $2::int) as r`, [step.work.from, step.work.to])).r;
      }
      done[kind] = (done[kind] ?? 0) + 1;
      if (!same(got, want)) bad[kind] ??= { story: n, step: i, ask: step[kind], want, got };
    }
    const end = { ...(await book()), help: await helpNow(), ...(await yardNow()) };
    const differs = Object.keys(s.end).filter((k) => !same(end[k], s.end[k]));
    if (differs.length) bad.end ??= { story: n, differs, want: JSON.stringify(s.end[differs[0]]).slice(0, 500), got: JSON.stringify(end[differs[0]]).slice(0, 500) };
  }
  for (const [kind, words] of [["book", "the book reads as the code's does, the pots cooked with a carrier's water among it"], ["helpers", "who helped a plant is who the code says, a bucket's pourer among them"],
    ["work", "what each did for the others between two rounds, the yard's bucketfuls counted and a bed's by its waterings"]]) {
    t.check(`${words}: ${done[kind] ?? 0} times`, !bad[kind] && (done[kind] ?? 0) > 20, bad[kind] ? JSON.stringify(bad[kind]).slice(0, 1500) : done[kind]);
  }
  t.check("at each story's end what is kept is what the code keeps: the well's water, the cans and the buckets, the carriers, what was reached, who helped, the yard's water, whose pots", !bad.end, bad.end ?? "");
  await wipe();
}

/* ── the heat, through the functions a member calls ──────────────────────── */

t.section("a hot afternoon: by the functions a member calls");
const HALF = 30 * MIN;
{
  await t.sql(`delete from public.town_weather; truncate public.town_plots, public.town_beds`);
  const can = (water = 8) => purse(U.m2, 0, [{ item: "can", n: 1, water }], 100, { hand: "can" });
  // one in the afternoon, a clear sky
  await clock(ONE);
  await sky(ONE, "clear");
  await can();
  await plant(133, 5, growing(U.admin));
  r = await call(U.m2, "town_tend", 133, 5);
  v = await plotNow(133, 5);
  t.check("at one under a clear sky a watering is kept as twice what it added: an hour of growth with a plain can", r.ok === true && r.deed === "water" && v.plant.boost === 2 * HALF && v.plant.watered === ONE, { answer: r.plot?.plant?.boost, kept: v.plant.boost });
  t.check("…the answer has the plot as the rule made it, and the farm read again has it as it is kept", r.plot.plant.boost === HALF && (await call(U.m2, "town_farm", ONE - 1000)).plots["133,5"].plant.boost === 2 * HALF, r.plot.plant);
  t.check("…for the stamina and the water of one watering", (await staminaOf(U.m2)) === 99 && (await kept(U.m2)).bag[0].water === 7);
  r = await call(U.m2, "town_tend", 133, 5);
  t.check("it is watered once an hour, hot or not", r.ok === false && (await plotNow(133, 5)).plant.boost === 2 * HALF && (await kept(U.m2)).bag[0].water === 7, r);
  // a better can: what it added, once more
  await purse(U.m2, 0, [{ item: "canBrass", n: 1, water: 5 }], 100, { hand: "canBrass" });
  await plant(134, 5, growing(U.admin));
  r = await call(U.m2, "town_tend", 134, 5);
  v = await plotNow(134, 5);
  t.check("a brass can's watering too: twice what it added", r.ok === true && Math.abs(v.plant.boost - 2 * r.plot.plant.boost) < 1e-6 && r.plot.plant.boost > HALF, { answer: r.plot.plant.boost, kept: v.plant.boost });
  // what is not a watering is kept as written
  await purse(U.m2, 0, [{ item: "growFert", n: 2 }], 100, { hand: "growFert" });
  r = await call(U.m2, "town_tend", 133, 5);
  t.check("feeding a plant in the heat adds nothing to it", r.ok === true && r.deed === "feed" && (await plotNow(133, 5)).plant.boost === 2 * HALF, r);
  // other skies, other hours, a sky nobody wrote
  for (const [name, at, word] of [["under cloud at one", ONE + 15 * MIN, "cloudy"], ["in fog at half past one", ONE + 30 * MIN, "fog"], ["at one with no weather written", ONE + 45 * MIN, null],
    ["at five under a clear sky", FIVE, "clear"], ["a minute before noon under a clear sky", ONE - HOUR - MIN, "clear"], ["at four exactly", ONE + 3 * HOUR, "clear"]]) {
    await clock(at);
    await sky(at, word);
    await can();
    await plant(135, 5, growing(U.admin));
    r = await call(U.m2, "town_tend", 135, 5);
    t.check(`${name}: a watering adds what it always added`, r.ok === true && (await plotNow(135, 5)).plant.boost === HALF, { r: r.ok ?? r, kept: (await plotNow(135, 5)).plant.boost });
  }
  for (const [name, at] of [["at noon exactly", ONE - HOUR], ["a minute before four", ONE + 3 * HOUR - MIN]]) {
    await clock(at);
    await sky(at, "clear");
    await can();
    await plant(135, 5, growing(U.admin));
    r = await call(U.m2, "town_tend", 135, 5);
    t.check(`${name}, under a clear sky: twice`, r.ok === true && (await plotNow(135, 5)).plant.boost === 2 * HALF, (await plotNow(135, 5)).plant.boost);
  }
  // sowing, hoeing, picking in the heat: as ever
  await clock(ONE);
  await sky(ONE, "clear");
  await purse(U.m1, 0, [{ item: "seedKangkong", n: 2 }], 100, { hand: "seedKangkong" });
  await t.sql(`insert into public.town_plots (x, y, bed, soil, plant, changed) values (140, 5, town.bed_of(140, 5), 'tilled', null, 0)`);
  r = await call(U.m1, "town_tend", 140, 5);
  t.check("a seed sown in the heat begins with nothing added", r.ok === true && r.deed === "sow" && (await plotNow(140, 5)).plant.boost === 0, r);
  // the trigger never undoes a watering
  await t.sql(`create or replace function town.hot(p_now bigint) returns boolean language plpgsql stable as $$ begin raise exception 'the sky fell'; end $$`);
  await can();
  await plant(136, 5, growing(U.admin));
  r = await call(U.m2, "town_tend", 136, 5);
  t.check("should the heat's own rule break, the watering is kept as it was written, and nothing fails", r.ok === true && (await plotNow(136, 5)).plant.boost === HALF && (await plotNow(136, 5)).plant.watered === ONE, r);
  await t.run(FILE, "v130 again, to put the rule right");
}

/* ── a bucket over a bed ─────────────────────────────────────────────────── */

t.section("a bucket poured over a bed: by the functions a member calls");
{
  await t.sql(`delete from public.town_weather; truncate public.town_plots, public.town_beds`);
  await wipe();
  await clock(MORNING);
  // the admin's bed (the first: 132..138, 4..10): seven plants along a row and three under them, and one of the pourer's own beside those
  const THEIRS = [[132, 5], [133, 5], [134, 5], [135, 5], [136, 5], [137, 5], [138, 5], [132, 6], [133, 6], [134, 6]];
  for (const [x, y] of THEIRS) await plant(x, y, growing(U.admin));
  await plant(135, 6, growing(U.m1));
  await t.sql(`insert into public.town_beds (bed, member_id, tended, empty) values (town.bed_of(132, 5), $1, $2, 0)`, [U.admin, MORNING - 3 * HOUR]);
  await purse(U.m1, 0, [{ item: "bucket", n: 1 }], 100, { hand: "bucket" });
  r = await call(U.m1, "town_ditch", 132, 5);
  t.check("an empty bucket pours nothing", r.ok === false && r.why === "hand", r);
  await call(U.m1, "town_chore", ...RIVER);
  const from = await lastDeed(), wellWas = await wellIs();
  r = await call(U.m1, "town_ditch", 132, 5);
  const NEAR = ["132,5", "133,5", "132,6", "133,6", "134,5", "134,6", "135,5", "135,6"];
  t.check("a bucketful poured from a plot of the bed waters the nearest eight, the pourer's own plant among them", r.ok === true && r.used === 1 && same(r.watered, NEAR), r);
  t.check("…and the answer has each of those plots as it is kept, and the purse", same(Object.keys(r.plots).sort(), [...NEAR].sort()) && Object.values(r.plots).every((p) => p.plant.watered === MORNING && p.plant.boost === HALF)
    && r.purse.bag[0].item === "bucket" && !("water" in r.purse.bag[0]) && r.purse.stamina.left === 100 - 2 - 3, r.purse?.stamina);
  v = (await t.sql(`select x, y, plant->>'watered' as watered, plant->>'boost' as boost, changed from public.town_plots where bed = town.bed_of(132, 5) order by x, y`)).rows;
  t.check("eight rows are written, each watered now with half an hour added; the three furthest are as they were", v.filter((p) => Number(p.watered) === MORNING && Number(p.boost) === HALF && Number(p.changed) === MORNING).length === 8
    && ["136,5", "137,5", "138,5"].every((k) => { const p = v.find((q) => `${q.x},${q.y}` === k); return Number(p.watered) === 0 && Number(p.boost) === 0; }), v);
  v = await deedsSince(from);
  t.check("it is written down as one line of the bucketful and a watering a plant, whose plant each was when not the pourer's own", v.length === 9 && v[0].what === "ditch" && v[0].thing === "bucket" && v[0].n === 1 && v[0].doc.plants === 8 && same(v[0].doc.tile, [132, 5])
    && v.slice(1).every((d) => d.what === "water" && d.member_id === U.m1 && d.thing === "pumpkin" && d.doc.with === "bucket" && d.doc.ditch === true)
    && same(v.slice(1).map((d) => d.doc.tile.join(",")), NEAR) && v.slice(1).filter((d) => d.doc.whose === U.admin).length === 7 && !("whose" in v.find((d) => d.doc.tile?.join(",") === "135,6").doc), v.map((d) => [d.what, d.doc]));
  v = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [U.m1, MORNING + MIN])).r;
  t.check("the well's book counts it: a bucketful carried; the pourer's water on seven of the admin's plants, by their own hand; among the day's carriers",
    v.buckets === 1 && same(v.today, { buckets: 1, waterings: 7, plants: 7, people: 1, watered: 7, helped: 1 }) && same(v.carriers, [{ id: U.m1, name: NAME[U.m1], buckets: 1, rank: 0 }]), v);
  v = await helpNow();
  t.check("each of the seven plots remembers the pourer: who watered it, and whose water it was; their own plant remembers nobody", Object.keys(v).length === 7 && !("135,6" in v)
    && Object.values(v).every((p) => p.owner === U.admin && same(p.by, { [U.m1]: { water: 1, carry: 1 } })), v);
  v = (await one(`select town.jar_work(town.round_of($1::bigint), town.round_of($1::bigint) + 1) as r`, [MORNING])).r;
  t.check("at the jar by the well it is seven waterings' work, not a bucketful besides", same(v, [[U.m1, 7]]), v);
  t.check("nothing went into the well, and the bed's owner is not said to have tended it", (await wellIs()) === wellWas && same((await book()).water, []) && Number((await one(`select tended from public.town_beds where bed = town.bed_of(132, 5)`)).tended) === MORNING - 3 * HOUR);
  r = await call(U.admin, "town_to_thank");
  t.check("the bed's owner has the pourer to thank for all seven", Object.keys(r.toThank).length === 7 && Object.values(r.toThank).every((list) => list.length === 1 && list[0].id === U.m1), r.toThank);

  // again at once: the eight are wet, the three furthest are not
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_ditch", 132, 5);
  t.check("poured again at once, the bucketful goes to the three that had none, and is all poured out", r.ok === true && r.used === 1 && same(r.watered, ["136,5", "137,5", "138,5"]) && !("water" in r.purse.bag[0]), r);
  await call(U.m1, "town_chore", ...RIVER);
  const quiet = await lastDeed();
  r = await call(U.m1, "town_ditch", 132, 5);
  t.check("with every plant watered there is nothing to pour it on: refused, the bucket still full, nothing written", r.ok === false && r.why === "wet" && (await kept(U.m1)).bag[0].water === 1 && (await lastDeed()) === quiet, r);
  r = await call(U.m1, "town_ditch", 131, 5);
  const off = await call(U.m1, "town_ditch", 10, 10), nul = await call(U.m1, "town_ditch", null, null);
  t.check("off the beds there is nothing to pour over", [r, off, nul].every((x) => x.ok === false && x.why === "none"), [r, off, nul]);
  // a can is no bucket
  await purse(U.m2, 0, [{ item: "can", n: 1, water: 8 }], 100, { hand: "can" });
  await clock(MORNING + 2 * HOUR);
  r = await call(U.m2, "town_ditch", 132, 5);
  t.check("a can pours over no bed", r.ok === false && r.why === "hand", r);
  // a great yoke: as many bucketfuls as the bed has plants for
  await purse(U.m2, 0, [{ item: "waterYokeGreat", n: 1, water: 4 }], 2, { hand: "waterYokeGreat" });
  r = await call(U.m2, "town_ditch", 138, 5);
  t.check("a great yoke pours two bucketfuls over eleven thirsty plants and keeps two; with two stamina left it is done all the same", r.ok === true && r.used === 2 && r.watered.length === 11 && r.purse.bag[0].water === 2 && r.purse.stamina.left === 0, r);
  // in the rain
  await clock(MORNING + 4 * HOUR);
  await sky(MORNING + 4 * HOUR, "rain");
  r = await call(U.m2, "town_ditch", 138, 5);
  t.check("while it rains every plant is wet, and nothing is poured", r.ok === false && r.why === "wet" && (await kept(U.m2)).bag[0].water === 2, r);
  // in the heat: the plain water of a bucket, as much again
  await sky(MORNING + 4 * HOUR, "clear");
  const was = Number((await plotNow(138, 5)).plant.boost);
  r = await call(U.m2, "town_ditch", 138, 5);
  t.check("in the heat a bucket's water does as much again, and the answer says so of each plot", r.ok === true && r.used === 2 && r.plots["138,5"].plant.boost === was + 2 * HALF && Number((await plotNow(138, 5)).plant.boost) === was + 2 * HALF, { was, got: r.plots?.["138,5"]?.plant?.boost });
  // the owner over their own bed
  await clock(MORNING + 6 * HOUR);
  await sky(MORNING + 6 * HOUR, "cloudy");
  await purse(U.admin, 0, [{ item: "bucketIron", n: 1, water: 2 }], 100, { hand: "bucketIron" });
  r = await call(U.admin, "town_ditch", 133, 5);
  v = await one(`select tended from public.town_beds where bed = town.bed_of(132, 5)`);
  t.check("its owner pouring over their own bed has tended it; nobody is helped by that but the pourer's plant of before", r.ok === true && r.used === 2 && Number(v.tended) === MORNING + 6 * HOUR
    && (await deedsSince(await lastDeed() - 11)).filter((d) => d.what === "water" && d.doc.whose).length === 1, r.watered);
}

/* ── the yard's jar ──────────────────────────────────────────────────────── */

t.section("the cooking yard's water jar: by the functions a member calls");
{
  await t.sql(`delete from public.town_weather`);
  await wipe();
  await clock(MORNING);
  r = await call(U.m1, "town_yard");
  t.check("the jar is told: empty", same(r.yard, { jar: 0 }) && r.now === MORNING, r);
  r = await call(U.m1, "town_well_ranks");
  t.check("…and with everybody's rank, which is how a page comes to know of it", same(r.yard, { jar: 0 }) && "ranks" in r && "thanked" in r, r);
  await purse(U.m1, 0, [{ item: "bucketIron", n: 1, water: 2 }], 100, { hand: "bucketIron" });
  r = await call(U.m1, "town_yard_pour", JAR_AT[0] + 5, JAR_AT[1] - 9);
  const nul = await call(U.m1, "town_yard_pour", null, null);
  t.check("away from the jar nothing is poured into it", r.ok === false && r.why === "none" && nul.ok === false && (await jarIs()) === 0 && (await kept(U.m1)).bag[0].water === 2, [r, nul]);
  const from = await lastDeed();
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("standing by it, an iron bucket's two bucketfuls go in: for one stamina", r.ok === true && r.poured === 2 && same(r.yard, { jar: 2 }) && (await jarIs()) === 2 && !("water" in r.purse.bag[0]) && r.purse.stamina.left === 99, r);
  v = await deedsSince(from);
  t.check("it is written down, and is a lot of the jar's water, the pourer's", v.length === 1 && v[0].what === "yard" && v[0].thing === "bucketIron" && v[0].n === 2 && same((await yardNow()).yard, [{ by: U.m1, left: 2 }]), v);
  v = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [U.m1, MORNING + MIN])).r;
  t.check("the book counts two bucketfuls carried, and says nothing of pots yet", v.buckets === 2 && same(v.today, { buckets: 2, waterings: 0, plants: 0, people: 0, watered: 0, helped: 0 }) && v.carriers.length === 1, v.today);
  v = (await one(`select town.jar_work(town.round_of($1::bigint), town.round_of($1::bigint) + 1) as r`, [MORNING])).r;
  t.check("at the jar by the well it is two bucketfuls' work", same(v, [[U.m1, 16]]), v);
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("an empty bucket pours nothing", r.ok === false && r.why === "none", r);

  // a soup, cooked by somebody else while the jar has water
  await cookPurse(U.m2);
  const plays = Number((await one(`select count(*)::int as n from public.town_plays`)).n), mark = await lastDeed();
  r = await cook(U.m2, SOUP);
  v = await kept(U.m2);
  t.check("a soup cooked while the jar has water: the rule answers five as ever, and the pot in the purse has six", r.ok === true && r.made === "pumpkinSoup" && r.n === 5 && r.purse.bag.find((s) => s?.item === "potFull").of.left === 6
    && v.bag.find((s) => s?.item === "potFull").of.left === 6, r);
  t.check("…the jar is a bucketful the less, and the play is written down like any", (await jarIs()) === 1 && Number((await one(`select count(*)::int as n from public.town_plays`)).n) === plays + 1);
  v = await deedsSince(mark);
  t.check("…and a line says the pot had water from the jar", v.length === 1 && v[0].what === "fresh" && v[0].member_id === U.m2 && v[0].thing === "pumpkinSoup" && v[0].doc.jar === 1, v);
  v = await yardNow();
  const today = (await one(`select town.day_of($1::bigint) as d`, [MORNING])).d;
  t.check("the jar's oldest water was the carrier's: a line of what came of it, to the cook", same(v, { yard: [{ by: U.m1, left: 1 }], pots: { [`${today}/${U.m1}`]: { [U.m2]: 1 } } }), v);
  v = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [U.m1, MORNING + MIN])).r;
  t.check("the carrier's book says so: one pot, of one cook", v.today.pots === 1 && v.today.cooks === 1, v.today);
  v = (await one(`select town.well_book($1::uuid, $2::bigint) as r`, [U.m2, MORNING + MIN])).r;
  t.check("…and the cook's says nothing of pots", !("pots" in v.today), v.today);

  // the carrier's own soup: nobody's doing
  await cookPurse(U.m1);
  r = await cook(U.m1, SOUP);
  t.check("the carrier's own soup takes the last bucketful and has its helping, and is no line of what came of their water", r.ok === true && r.purse.bag.find((s) => s?.item === "potFull").of.left === 6 && (await jarIs()) === 0
    && same(await yardNow(), { yard: [], pots: { [`${today}/${U.m1}`]: { [U.m2]: 1 } } }), await yardNow());
  // the jar empty: as ever
  await cookPurse(U.m2);
  const none = await lastDeed();
  r = await cook(U.m2, SOUP);
  t.check("with the jar empty a soup is cooked as it always was: five, and no line", r.ok === true && r.n === 5 && r.purse.bag.find((s) => s?.item === "potFull").of.left === 5 && (await lastDeed()) === none && (await jarIs()) === 0, r);

  // what takes no water
  await t.sql(`update public.town_things set doc = '3'::jsonb where key = 'yard'`);
  await cookPurse(U.m2);
  r = await cook(U.m2, [["pumpkin", 1], ["salt", 1]]);
  t.check("the odd dish takes none of the jar's water", r.ok === true && r.made === "oddDish" && r.purse.bag.find((s) => s?.item === "potFull").of.left === r.n && (await jarIs()) === 3, r);
  await purse(U.m2, 0, [{ item: "skewer", n: 1 }, { item: "salt", n: 2 }, { item: "shiitake", n: 4 }], 100, { hand: "skewer" });
  r = await cook(U.m2, [["salt", 1], ["shiitake", 2]]);
  t.check("what is roasted on a skewer takes none", r.ok === true && r.made === "mushroomSkewer" && r.purse.bag.find((s) => s?.item === "potFull").of.left === r.n && (await jarIs()) === 3, r);
  // a soup stirred badly: the helping is one more than whatever the stirring left
  await cookPurse(U.m2);
  r = await cook(U.m2, SOUP, 2);
  t.check("a soup that lost two helpings in the stirring has one more than the three it was left with", r.ok === true && r.n === 3 && r.purse.bag.find((s) => s?.item === "potFull").of.left === 4 && (await jarIs()) === 2, r);
  // water from before the book (nobody's): a helping, and no line of whose it was
  await cookPurse(U.guest);
  r = await cook(U.guest, SOUP);
  t.check("water nobody is known to have carried gives its helping all the same", r.ok === true && r.purse.bag.find((s) => s?.item === "potFull").of.left === 6 && (await jarIs()) === 1 && Object.keys((await yardNow()).pots).length === 1, await yardNow());

  // the jar holds ten
  await t.sql(`update public.town_things set doc = '9'::jsonb where key = 'yard'`);
  await purse(U.m1, 0, [{ item: "waterYokeGreat", n: 1, water: 4 }], 100, { hand: "waterYokeGreat" });
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("nearly full, the jar takes what it has room for and the rest stays in the yoke", r.ok === true && r.poured === 1 && same(r.yard, { jar: 10 }) && r.purse.bag[0].water === 3, r);
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("full, it takes none", r.ok === false && r.why === "none" && same(r.yard, { jar: 10 }) && (await kept(U.m1)).bag[0].water === 3, r);

  // the trigger never undoes a dish
  await t.sql(`create or replace function town.yard_freshen(p_purse jsonb, p_made text, p_jar integer) returns jsonb language plpgsql stable as $$ begin raise exception 'the jar cracked'; end $$`);
  await cookPurse(U.m2);
  r = await cook(U.m2, SOUP);
  t.check("should the jar's own rule break, the soup is cooked as the rule of cooking made it, and nothing fails", r.ok === true && r.n === 5 && r.purse.bag.find((s) => s?.item === "potFull").of.left === 5 && (await jarIs()) === 10, r);
  await t.run(FILE, "v130 again, to put the rule right");
  t.check("the file run again leaves the jar's water as it was", (await jarIs()) === 10);
}

/* ── who may ─────────────────────────────────────────────────────────────── */

t.section("the water cart: by the functions a member calls");
{
  // (nothing is written for it: the game's functions read what a thing is, what it carries and what the well gives from the catalog)
  await t.sql(`delete from public.town_weather`);
  await wipe();
  await clock(MORNING);
  await t.sql(`update public.town_things set doc = '0'::jsonb where key in ('well', 'yard')`);
  await t.sql(`insert into public.town_carriers (member_id, buckets, taken) values ($1, 199, '{1}')`, [U.m1]);
  await purse(U.m1, 3, [{ item: "waterYoke", n: 1 }], 100, { hand: "waterYoke" });
  r = await call(U.m1, "town_well");
  t.check("one short of the second rank, with the yoke taken: nothing waits", r.wellBook.rank === 1 && r.wellBook.gift === false, r.wellBook);
  await t.sql(`update public.town_carriers set buckets = 200 where member_id = $1`, [U.m1]);
  r = await call(U.m1, "town_well");
  t.check("at the second rank something waits at the well", r.wellBook.rank === 2 && r.wellBook.gift === true, r.wellBook);
  r = await call(U.m1, "town_well_take");
  v = await book();
  const carts = (bag) => bag.filter((s) => s?.item === "waterCart").length;
  t.check("it is the cart: in the bag beside the yoke, marked as taken", r.ok === true && r.gift === "waterCart" && r.rank === 2 && carts(r.purse.bag) === 1 && r.purse.bag[0].item === "waterYoke" && r.purse.coins === 3
    && same(v.carriers[U.m1], { buckets: 200, taken: [1, 2] }) && carts((await kept(U.m1)).bag) === 1, r);
  r = await call(U.m1, "town_well_take");
  t.check("once: asked again, there is nothing", r.ok === false && r.why === "none" && carts((await kept(U.m1)).bag) === 1, r);
  v = await one(`select town.well_due(600, '{1,3}') as late, town.well_due(600, '{1,2}') as great, town.well_due(600, '{1,2,3}') as none, town.well_due(600, '{}') as first`);
  t.check("whoever had the great yoke before there was a cart finds the cart waiting; the lowest rank not taken comes first", same(v, { late: [2, "waterCart"], great: [3, "waterYokeGreat"], none: null, first: [1, "waterYoke"] }), v);

  // six bucketfuls at the river, for what one bucket costs
  await purse(U.m1, 0, [{ item: "waterCart", n: 1 }], 100, { hand: "waterCart" });
  r = await call(U.m1, "town_chore", ...RIVER);
  t.check("it draws six bucketfuls at the river, for the stamina of one bucket", r.ok === true && r.purse.bag[0].water === 6 && r.purse.stamina.left === 98, r);
  const from = await lastDeed();
  r = await call(U.m1, "town_chore", ...AT_WELL);
  v = await book();
  t.check("…and pours the six into the well: six of the well's water its carrier's, six towards their rank", r.ok === true && (await wellIs()) === 6 && !("water" in r.purse.bag[0])
    && same(v.water, [{ by: U.m1, left: 6 }]) && v.carriers[U.m1].buckets === 206, { r, v });
  v = await deedsSince(from);
  t.check("…written down as one pouring of six, with the cart", v.length === 1 && v[0].what === "pour" && v[0].thing === "waterCart" && v[0].n === 6, v);

  // over a bed, and into the yard's jar
  await t.sql(`truncate public.town_plots, public.town_beds`);
  for (const [x, y] of [[132, 5], [133, 5], [134, 5]]) await plant(x, y, growing(U.admin));
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_ditch", 132, 5);
  t.check("over a bed it pours no more than the bed's plants take, and keeps the rest", r.ok === true && r.used === 1 && r.watered.length === 3 && r.purse.bag[0].water === 5, r);
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("into the yard's jar go the five it has left", r.ok === true && r.poured === 5 && same(r.yard, { jar: 5 }) && !("water" in r.purse.bag[0]), r);
  await call(U.m1, "town_chore", ...RIVER);
  r = await call(U.m1, "town_yard_pour", ...JAR_AT);
  t.check("…and of the next six as many as the jar has room for", r.ok === true && r.poured === 5 && same(r.yard, { jar: 10 }) && r.purse.bag[0].water === 1, r);
}

t.section("who may read and call what");
for (const [fn, args] of [["town_ditch", [132, 5]], ["town_yard", []], ["town_yard_pour", JAR_AT]]) {
  r = await call("anon", fn, ...args);
  const u = await call(U.unver, fn, ...args), n = await call(U.nochar, fn, ...args);
  t.check(`${fn}: not somebody signed out's, nor somebody's with no proved character`, r.code === "42501" && u.code === "42501" && n.code === "42501", [r, u, n]);
}
for (const table of TWO) {
  const a = await t.as("anon", `select * from public.${table}`), m = await t.as(U.m1, `select * from public.${table}`), w = await t.as(U.m1, `delete from public.${table}`);
  t.check(`${table}: nobody in a browser reads it or writes it`, a.code === "42501" && m.code === "42501" && w.code === "42501", [a, m, w]);
}
for (const [what, sql] of [["the rule of the ditch", `select town.ditch('{}'::jsonb, '{}'::jsonb, 1, 1, 0)`], ["the rule of the jar's helping", `select town.yard_freshen('{}'::jsonb, 'pumpkinSoup', 5)`], ["whether it is hot", `select town.hot(0)`]]) {
  r = await t.as(U.m1, sql);
  t.check(`${what} is not a member's to ask`, r.code === "42501", r);
}
r = await t.as(U.m1, `update public.town_things set doc = '10'::jsonb where key = 'yard'`);
t.check("a member cannot fill the jar by writing its number", !!r.code || r.affected === 0, r);
{
  await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
  const m = await call(U.m1, "town_yard"), a = await call(U.admin, "town_yard");
  t.check("while the game is shut these are an admin's only", m.code === "42501" && "yard" in a, [m, a]);
  await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
}

/* ── a member who goes ───────────────────────────────────────────────────── */

t.section("a member who goes");
{
  await wipe();
  await t.sql(`update public.town_things set doc = '0'::jsonb where key = 'yard'`);
  await clock(MORNING);
  await purse(U.guest, 0, [{ item: "bucketIron", n: 1, water: 2 }], 100, { hand: "bucketIron" });
  await call(U.guest, "town_yard_pour", ...JAR_AT);
  await cookPurse(U.m2);
  await cook(U.m2, SOUP);
  v = await yardNow();
  t.check("a carrier's water in the jar, and a pot cooked with it", v.yard.length === 1 && v.yard[0].by === U.guest && Object.keys(v.pots).length === 1, v);
  r = await t.as("super", `delete from public.profiles where id = '${U.guest}'`);
  v = await yardNow();
  t.check("when they go, the water stays as nobody's and their lines go with them", !r.error && same(v, { yard: [{ by: null, left: 1 }], pots: {} }) && (await jarIs()) === 1, { r, v });
  await cookPurse(U.m2);
  r = await cook(U.m2, SOUP);
  t.check("…and it still gives a soup its helping", r.ok === true && r.purse.bag.find((s) => s?.item === "potFull").of.left === 6 && (await jarIs()) === 0, r);
}

/* ── again ───────────────────────────────────────────────────────────────── */

t.section("the file a third time");
{
  const was = { jar: await jarIs(), yard: await yardNow(), book: await book(), texts: await texts(), rows: (await t.sql(`select key, data from public.town_catalog order by key`)).rows };
  await t.run(FILE, "v130 once more");
  t.check("run again, it changes nothing: the jar, the book, every function, every row of the catalog", (await jarIs()) === was.jar && same(await yardNow(), was.yard) && same(await book(), was.book) && same(await texts(), was.texts)
    && same((await t.sql(`select key, data from public.town_catalog order by key`)).rows, was.rows));
}

t.done();
