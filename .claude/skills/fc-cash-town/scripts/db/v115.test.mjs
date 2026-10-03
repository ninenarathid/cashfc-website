/*
 * v115 — the town's game opens when its owner says: dry run in PGlite.
 *
 * Every function of the game's that a browser may call is asked, by everybody, with the knob shut and with it open:
 * shut, an admin is answered and a proved character is refused (and told so by `town_is_open` without being refused
 * anything); open, a proved character is answered and nobody else is. The three functions written again are held to
 * what they replace, word for word but for the lines meant.
 *
 *   node v115.test.mjs
 *   node mutate.mjs <the file> v115.test.mjs v115.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U, CHAR } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (the file is kept out of supabase/ until it is proved: the owner runs what he finds there)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v115_"));
const HERE = new URL("./v115_draft.sql", import.meta.url);
// (a draft beside this file while there is one; then supabase/; then history, once it has run)
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(115);

const GALLERY = `
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;
const t = await supabaseLike({ extra: KUDOS + GALLERY });
for (const n of [104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114]) await t.run(migration(n), `v${n}`);
// popoto for a member to change, from somebody else, a day apart
await t.sql(`insert into public.kudos (sender_id, receiver_character_id, day, created_at)
             select '${U.admin}', ${CHAR.m1}, current_date - n, now() - (n || ' days')::interval from generate_series(1, 12) n`);
// a purse from before, to see that shutting the game keeps it
await t.sql(`insert into public.town_purses (member_id, coins) values ('${U.guest}', 33)`);
const privsBefore = (await t.sql(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as m, has_function_privilege('anon', p.oid, 'execute') as a
                                    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%' order by 1`)).rows;
await t.runTwice(FILE, "v115");

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** Every function of the game's a member may call, with how many arguments it takes. */
const fns = (await t.sql(`select p.proname as name, p.pronargs::int as n from pg_proc p
                           where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%' and p.proname <> 'town_is_open'
                             and has_function_privilege('authenticated', p.oid, 'execute') order by 1`)).rows;
/** Ask one of them with nothing for every argument: who may is decided before any argument is looked at. */
const tryOne = async (who, fn) => t.as(who, `select * from public.${fn.name}(${Array(fn.n).fill("null").join(", ")})`);
const askAll = async (who) => {
  const out = { refused: [], answered: [], why: new Set() };
  for (const fn of fns) {
    const r = await tryOne(who, fn);
    if (r.code === "42501") { out.refused.push(fn.name); out.why.add(r.error); } else out.answered.push(fn.name);
  }
  return out;
};
const open = async (who) => { const r = await t.as(who, `select public.town_is_open() as open`); return r.error ? `${r.code}` : r.rows[0].open; };

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, value from public.town_knobs order by key`);
t.check("the knobs: the game shut, the bank's as they were", same(v.rows, [{ key: "bank_gallery", value: 0 }, { key: "bank_rate", value: 5 }, { key: "bank_weekly", value: 20 }, { key: "game_open", value: 0 }]), v.rows);
v = await t.sql(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_is_open', 'town_bank', 'town_exchange') order by 1`);
t.check("who may call what: the three, members only, nobody signed out", same(v.rows, [
  { proname: "town_bank", definer: true, anon: false, member: true }, { proname: "town_exchange", definer: true, anon: false, member: true }, { proname: "town_is_open", definer: true, anon: false, member: true }]), v.rows);
v = await t.sql(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                        (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the town's own functions are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);
v = await t.sql(`select public.town_is_open() as open`);
t.check("in the SQL editor, where nobody is signed in, it says no", v.rows[0].open === false, v.rows);
const privsAfter = (await t.sql(`select p.proname, has_function_privilege('authenticated', p.oid, 'execute') as m, has_function_privilege('anon', p.oid, 'execute') as a
                                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'town\\_%' and p.proname <> 'town_is_open' order by 1`)).rows;
t.check("who may call every other function of the town's is as it was", same(privsAfter, privsBefore), { before: privsBefore.length, after: privsAfter.length });

t.section("shut: admins only");
t.check(`the game has ${fns.length} functions a member may call, each of them asked`, fns.length === 37 && fns.some((f) => f.name === "town_me") && fns.some((f) => f.name === "town_exchange") && fns.some((f) => f.name === "town_deal_agree"), fns.map((f) => f.name));
t.check("whether it is open, as a yes or no: an admin yes, a proved character no", (await open(U.admin)) === true && (await open(U.m1)) === false && (await open(U.guest)) === false);
t.check("…an unproved character and somebody with none: no", (await open(U.unver)) === false && (await open(U.nochar)) === false);
t.check("…and somebody signed out may not ask", (await open("anon")) === "42501", await open("anon"));
let got = await askAll(U.m1);
t.check("a proved character is refused by every function of the game's", got.answered.length === 0, got.answered);
t.check("…and told why: the game is not open yet", got.why.size === 1 && [...got.why][0].includes("not open yet"), [...got.why]);
got = await askAll(U.admin);
t.check("an admin is refused by none", got.refused.length === 0, got.refused);
got = await askAll(U.unver);
t.check("an unproved character is refused by every one, as before", got.answered.length === 0 && [...got.why].every((w) => w.includes("proved character")), { answered: got.answered, why: [...got.why] });
got = await askAll("anon");
t.check("somebody signed out is refused by every one, as before", got.answered.length === 0, got.answered);
v = await t.as(U.m1, `select public.town_me() as r`);
t.check("the refusal is the one a page takes for \"not for you\": 42501", v.code === "42501", v);
v = await t.sql(`select count(*)::int as n from public.town_purses where member_id = '${U.m1}'`);
t.check("nothing was made for whoever was refused: no purse", v.rows[0].n === 0, v.rows);
v = await t.as("anon", `select (select count(*)::int from public.popoto_totals()) as lines, public.popoto_count(${CHAR.m1})::int as n`);
t.check("the popoto board's two counts are not the game's: anybody is answered", !v.error && v.rows[0].lines === 1 && v.rows[0].n === 12, v);
v = await t.as(U.m1, `select public.popoto_count(${CHAR.m1})::int as n`);
t.check("…a member too", !v.error && v.rows[0].n === 12, v);

t.section("open: every proved character");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
t.check("whether it is open: a proved character yes now, in the FC or not; an admin still", (await open(U.m1)) === true && (await open(U.guest)) === true && (await open(U.admin)) === true);
t.check("…an unproved character and somebody with none: still no", (await open(U.unver)) === false && (await open(U.nochar)) === false);
got = await askAll(U.m1);
t.check("a proved character is refused by none", got.refused.length === 0, got.refused);
got = await askAll(U.unver);
t.check("an unproved character is still refused by every one", got.answered.length === 0, got.answered);
got = await askAll(U.nochar);
t.check("…and somebody with no character", got.answered.length === 0, got.answered);
got = await askAll("anon");
t.check("…and somebody signed out", got.answered.length === 0, got.answered);
v = await t.as(U.m1, `select public.town_me() as r`);
t.check("the purse is told", !v.error && v.rows[0].r.purse.bag.length === 10 && v.rows[0].r.purse.popoto.profile === 12, v);
v = await t.as(U.m1, `select * from public.town_exchange('profile', 2)`);
t.check("the bank changes popoto as it did: two for ten coins, ten left", !v.error && v.rows[0].ok === true && v.rows[0].coins === 10 && v.rows[0].changed === 2 && v.rows[0].profile_left === 10, v);
v = await t.as(U.m1, `select * from public.town_bank()`);
t.check("…and says how things stand as it did", !v.error && same(v.rows[0], { coins: 10, rate: 5, weekly: 20, changed: 2, profile_left: 10, gallery_left: 0 }), v);
v = await t.as(U.m1, `select public.town_buy('worm', 1) as r`);
t.check("the stall sells", !v.error && v.rows[0].r.ok === true && v.rows[0].r.purse.coins === 8, v);

t.section("shut again");
await t.sql(`update public.town_knobs set value = 0 where key = 'game_open'`);
got = await askAll(U.m1);
t.check("a proved character is refused by every function again", got.answered.length === 0, got.answered);
v = await t.sql(`select p.coins, (p.doc->'bag'->0->>'item') as first, (select coins from public.town_purses where member_id = '${U.guest}') as guest from public.town_purses p where p.member_id = '${U.m1}'`);
t.check("what they had is kept for when it opens: the coins, the worm, a purse from before", v.rows[0]?.coins === 8 && v.rows[0].first === "worm" && v.rows[0].guest === 33, v.rows);
got = await askAll(U.admin);
t.check("an admin plays on", got.refused.length === 0, got.refused);

t.section("the three written again are what they were, with one thing more");
const words = (sql, name) => { const at = sql.indexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("\n$$;", at)); };
{
  let was = words(migration(106), "town.member"), is = words(FILE, "town.member");
  t.check("town.member is v106's word for word, but for the knob", !!was && was !== is && was.replace("  return me;",
    "  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) <= 0 then\n    raise exception 'the town''s game is not open yet' using errcode = '42501';\n  end if;\n  return me;") === is);
  const one = "    raise exception 'the bank is for a proved character' using errcode = '42501';\n  end if;\n";
  was = words(migration(105), "public.town_bank"); is = words(FILE, "public.town_bank");
  t.check("town_bank is v105's word for word, but for asking whether the game is open", !!was && was !== is && was.replace(one, one + "  perform town.member();\n") === is);
  was = words(migration(114), "public.town_exchange"); is = words(FILE, "public.town_exchange");
  t.check("town_exchange is v114's word for word, but for the same", !!was && was !== is && was.replace(one, one + "  perform town.member();\n") === is);
}

t.section("running it again");
await t.sql(`update public.town_knobs set value = 1 where key = 'game_open'`);
await t.run(FILE, "v115 a third time");
v = await t.sql(`select value from public.town_knobs where key = 'game_open'`);
t.check("a game the owner opened is not shut by the file being run again", v.rows[0].value === 1 && (await open(U.m1)) === true, v.rows);

await t.done();
