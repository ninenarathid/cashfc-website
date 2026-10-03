/*
 * v114 — what was changed no longer counts: dry run in PGlite.
 *
 * The popoto board is live, and this file writes its function again. So first: with nothing changed at the bank, the
 * new counting must answer exactly what v104's does (kept beside it under another name), row for row and in the same
 * order, for every period the pages ask for, over the 3,400 sample popoto v104's own dry run counts. Then: popoto are
 * changed, and the board must leave out each character's oldest, as worked out here in JavaScript from the sample
 * itself. Then what must not move: every row of `kudos`, its policies and grants, the picture side of the bank
 * (shut behind its knob), and everything v105's exchange answered before.
 *
 *   node v114.test.mjs
 *   node mutate.mjs <the file> v114.test.mjs v114.mutations.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { supabaseLike, migration, U, CHAR } from "./pglite-harness.mjs";
import { KUDOS } from "./kudos-stub.mjs";
import { ROWS, fill } from "./v104.sample.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// (the file is kept out of supabase/ until it is proved: the owner runs what he finds there)
const inRepo = readdirSync(`${repo}/supabase`).find((f) => f.startsWith("v114_"));
const HERE = new URL("./v114_draft.sql", import.meta.url);
// (a draft beside this file while there is one; then supabase/; then history, once it has run)
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : !inRepo && existsSync(HERE) ? readFileSync(HERE, "utf8") : migration(114);

const GALLERY = `
create table public.gallery_posts (id bigint generated always as identity primary key, author_id uuid not null references public.profiles (id) on delete cascade, caption text, created_at timestamptz not null default now());
alter table public.gallery_posts enable row level security;
create table public.gallery_likes (post_id bigint not null references public.gallery_posts (id) on delete cascade, profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(), primary key (post_id, profile_id));
alter table public.gallery_likes enable row level security;
`;

const t = await fill(await supabaseLike({ extra: KUDOS + GALLERY }));
const ask = (sql, params) => t.as("super", sql, params);
const v104 = migration(104);
await t.run(v104, "v104");
for (const n of [105, 106, 107, 108, 109, 110, 111, 112, 113]) await t.run(migration(n), `v${n}`);
// v104's own counting, under another name, to hold the new one to
const body = /create or replace function public\.popoto_totals\([\s\S]*?\$\$;/.exec(v104)?.[0];
if (!body) throw new Error("v104's function was not found in its file");
await t.sql(body.replace("public.popoto_totals(", "public.popoto_totals_v104("));
await t.sql(`grant execute on function public.popoto_totals_v104(timestamptz) to anon, authenticated`);

/** Policies and grants on kudos, and every row of it: to show the file leaves the table alone. */
const tableState = async () => JSON.stringify([
  (await ask(`select policyname, cmd, permissive, roles::text, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'kudos' order by policyname`)).rows,
  (await ask(`select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'kudos' order by grantee, privilege_type`)).rows,
  (await ask(`select relrowsecurity, relforcerowsecurity from pg_class where oid = 'public.kudos'::regclass`)).rows,
  (await ask(`select count(*)::int as n, md5(string_agg(k::text, '|' order by k.id)) as sum from public.kudos k`)).rows,
  (await ask(`select indexname from pg_indexes where schemaname = 'public' and tablename = 'kudos' order by 1`)).rows,
]);
const kudosBefore = await tableState();
await t.runTwice(FILE, "v114");

const PERIODS = [null, "2026-10-01T00:00:00+07:00", "2026-09-21T12:34:56.789+07:00", "2026-10-03T21:00:00+00:00", "2026-10-04T09:00:00+00:00", "2026-10-05T00:00:00+07:00", "2026-01-01T00:00:00+07:00"];
const board = async (who, fn, since) => {
  const r = await t.as(who, `select coalesce(json_agg(x), '[]'::json)::text as body from (select * from public.${fn}($1::timestamptz)) x`, [since]);
  return r.error ? `${r.code}: ${r.error}` : JSON.parse(r.rows[0].body);
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
/** The board as it should be, worked out from the sample: every popoto since a moment, less each character's oldest so many (by id). */
const kept = ROWS.map((r, i) => ({ ...r, id: i + 1 }));
function expected(since, gone = {}, without = new Set()) {
  const seen = new Map();   // how many of each receiver's popoto have gone by
  const by = new Map();
  for (const k of kept) {
    if (without.has(k.id)) continue;
    const nth = (seen.get(k.receiver) ?? 0) + 1;
    seen.set(k.receiver, nth);
    if (nth <= (gone[k.receiver] ?? 0)) continue;
    if (since && Date.parse(k.at) < Date.parse(since)) continue;
    const at = by.get(k.receiver) ?? { receiver_character_id: k.receiver, score: 0, senders: new Set(), first_id: k.id };
    at.score++;
    at.senders.add(k.sender);
    by.set(k.receiver, at);
  }
  return [...by.values()].sort((a, b) => a.first_id - b.first_id).map((x) => ({ receiver_character_id: x.receiver_character_id, score: x.score, n: x.senders.size, first_id: x.first_id }));
}

t.section("with nothing changed, the board is what it was");
t.check("the file leaves kudos alone: every row, its policies, its grants and its indexes", (await tableState()) === kudosBefore);
for (const since of PERIODS) {
  const [was, is, mine] = [await board("anon", "popoto_totals_v104", since), await board("anon", "popoto_totals", since), await board(U.m1, "popoto_totals", since)];
  t.check(`since ${since ?? "ever"}: the same ${Array.isArray(was) ? was.length : "?"} lines as v104 counted, in the same order, for a visitor and for a member`,
    Array.isArray(was) && same(was, is) && same(was, mine) && same(was, expected(since)), { was: String(JSON.stringify(was)).slice(0, 200), is: String(JSON.stringify(is)).slice(0, 200) });
}
let v = await ask(`select (select coalesce(sum(score), 0)::int from public.popoto_totals()) as board, (select count(*)::int from public.kudos) as popoto, (select count(*)::int from public.town_changed) as marks`);
t.check("every popoto there is, on the board; and no mark yet", v.rows[0].board === v.rows[0].popoto && v.rows[0].popoto === ROWS.length && v.rows[0].marks === 0, v.rows);

t.section("what it should say afterwards (the file's closing block)");
v = await ask(`select key, value from public.town_knobs order by key`);
t.check("the three knobs: the picture side shut, five coins a popoto, twenty a week", same(v.rows, [{ key: "bank_gallery", value: 0 }, { key: "bank_rate", value: 5 }, { key: "bank_weekly", value: 20 }]), v.rows);
v = await ask(`select c.relrowsecurity, (select count(*)::int from information_schema.role_table_grants where table_schema = 'public' and table_name = 'town_changed' and grantee in ('anon', 'authenticated')) as grants
                 from pg_class c where c.oid = 'public.town_changed'::regclass`);
t.check("the marks' table has row security on, and nothing granted to a browser", v.rows[0].relrowsecurity === true && v.rows[0].grants === 0, v.rows);
v = await ask(`select p.proname, p.prosecdef as definer, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
                 from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('popoto_totals', 'popoto_count', 'town_exchange', 'town_popoto_left') order by 1`);
t.check("who may call what: the two counts anybody, the exchange members, what is left nobody in a browser", same(v.rows, [
  { proname: "popoto_count", definer: true, anon: true, member: true }, { proname: "popoto_totals", definer: true, anon: true, member: true },
  { proname: "town_exchange", definer: true, anon: false, member: true }, { proname: "town_popoto_left", definer: true, anon: false, member: false }]), v.rows);
v = await ask(`select has_schema_privilege('authenticated', 'town', 'usage') as member_has_rules,
                      (select count(*)::int from pg_proc p where p.pronamespace = 'town'::regnamespace and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as open`);
t.check("the town's own functions are still nobody's in a browser", v.rows[0].member_has_rules === false && v.rows[0].open === 0, v.rows);
for (const [who, name] of [["anon", "anon"], [U.m1, "a member"]]) {
  const r = await t.as(who, `select * from public.town_changed limit 1`);
  t.check(`${name} cannot read the marks`, r.code === "42501", r);
}
let r = await t.as(U.m1, `insert into public.town_changed (character_id, popoto, cut_id) values (${CHAR.m2}, 500, 999999)`);
t.check("a member cannot wipe somebody off the board by hand", r.code === "42501" && (await ask(`select count(*)::int as n from public.town_changed`)).rows[0].n === 0, r);
r = await t.as(U.m1, `select town.mark_changed(${CHAR.m2}, 500)`);
t.check("…nor call the function that moves a mark", r.code === "42501", r);

/* ── changing popoto ─────────────────────────────────────────────────────── */

const exchange = async (who, kind, n) => { const x = await t.as(who, `select * from public.town_exchange($1, $2)`, [kind, n]); return x.error ? x : x.rows[0]; };
const count = async (who, character) => { const x = await t.as(who, `select public.popoto_count($1) as n`, [character]); return x.error ? x : Number(x.rows[0].n); };
const mine = kept.filter((k) => k.receiver === CHAR.m1), fromFriends = mine.filter((k) => k.sender !== U.m1).length;
const gone = {};

t.section("popoto changed at the bank");
t.check("the sample has what this needs: the first member has popoto, a few of them from themselves", mine.length > 30 && fromFriends < mine.length && fromFriends > 20, { all: mine.length, fromFriends });
t.check("before, the member page's count is every popoto they were given", (await count("anon", CHAR.m1)) === mine.length && (await count(U.m2, CHAR.m1)) === mine.length);
r = await exchange(U.m1, "profile", 5);
gone[CHAR.m1] = 5;
t.check("five popoto are changed into twenty-five coins, as v105 had it", r.ok === true && r.why === null && r.coins === 25 && r.changed === 5 && r.profile_left === fromFriends - 5 && r.gallery_left === 0, r);
v = await ask(`select character_id, popoto, cut_id from public.town_changed`);
t.check("the character's mark is their fifth oldest popoto", v.rows.length === 1 && Number(v.rows[0].character_id) === CHAR.m1 && v.rows[0].popoto === 5 && Number(v.rows[0].cut_id) === mine[4].id, v.rows);
for (const since of PERIODS) {
  const is = await board("anon", "popoto_totals", since);
  t.check(`since ${since ?? "ever"}: the board leaves out their five oldest, and nothing else`, same(is, expected(since, gone)), { is: String(JSON.stringify(is)).slice(0, 300) });
}
const all = await board("anon", "popoto_totals", null), was = await board("anon", "popoto_totals_v104", null);
const line = (list, id) => list.find((x) => x.receiver_character_id === id);
t.check("all time, they have five fewer; everybody else has what they had", line(all, CHAR.m1).score === line(was, CHAR.m1).score - 5
  && was.every((w) => w.receiver_character_id === CHAR.m1 || same(w, line(all, w.receiver_character_id))), { was: line(was, CHAR.m1), is: line(all, CHAR.m1) });
const october = "2026-10-01T00:00:00+07:00";
t.check("this month's board does not move: their oldest are older than the month", same(line(await board("anon", "popoto_totals", october), CHAR.m1), line(await board("anon", "popoto_totals_v104", october), CHAR.m1)));
t.check("the member page's count is five fewer, for whoever asks", (await count("anon", CHAR.m1)) === mine.length - 5 && (await count(U.guest, CHAR.m1)) === mine.length - 5);
t.check("…and somebody else's is what it was", (await count("anon", CHAR.m2)) === kept.filter((k) => k.receiver === CHAR.m2).length);
t.check("not a row of kudos has changed", (await tableState()) === kudosBefore);
r = await exchange(U.m1, "profile", 3);
gone[CHAR.m1] = 8;
t.check("three more: the mark moves on to their eighth oldest", r.ok === true && r.changed === 8 && Number((await ask(`select cut_id from public.town_changed where character_id = ${CHAR.m1}`)).rows[0].cut_id) === mine[7].id, r);
t.check("…and the board and the count with it", same(await board("anon", "popoto_totals", null), expected(null, gone)) && (await count("anon", CHAR.m1)) === mine.length - 8);

t.section("a month's board, when the oldest reach into it");
// somebody whose only two popoto are this month's (the sample's 7101: given one by each of two members, on 4 October)
const NEW = "30000000-0000-0000-0000-000000000001";
await t.sql(`insert into auth.users (id) values ('${NEW}'); insert into public.profiles (id, character_id, character_name, character_verified_at) values ('${NEW}', 7101, 'Late Comer', now());`);
const theirs = kept.filter((k) => k.receiver === 7101);
r = await exchange(NEW, "profile", 1);
gone[7101] = 1;
t.check("they change one of their two", theirs.length === 2 && r.ok === true && r.profile_left === 1, r);
const month = await board("anon", "popoto_totals", october);
t.check("this month's board has them on one popoto from one person, counted from the one that is left", same(line(month, 7101), { receiver_character_id: 7101, score: 1, n: 1, first_id: theirs[1].id }) && same(month, expected(october, gone)), line(month, 7101));
r = await exchange(NEW, "profile", 1);
gone[7101] = 2;
t.check("both changed, they are off the board, not on it with nothing", r.ok === true && r.profile_left === 0 && !line(await board("anon", "popoto_totals", null), 7101) && (await count("anon", 7101)) === 0, r);
r = await exchange(NEW, "profile", 1);
t.check("…and have none left to change", r.ok === false && r.why === "popoto" && r.coins === 10, r);

t.section("the bank is v105's, with two things more");
{
  const words = (sql, name) => { const at = sql.indexOf(`create or replace function ${name}(`); return at < 0 ? null : sql.slice(at, sql.indexOf("\n$$;", at)); };
  const v105 = migration(105);
  let was = words(v105, "public.town_exchange"), is = words(FILE, "public.town_exchange");
  t.check("town_exchange is v105's word for word, but for the mark it moves", !!was && was !== is
    && was.replace("     where p.member_id = me;\n    used := used + p_popoto;",
                   "     where p.member_id = me;\n    -- the board counts them no longer: the character's oldest first\n    if p_kind = 'profile' then perform town.mark_changed(mine, p_popoto); end if;\n    used := used + p_popoto;") === is);
  was = words(v105, "public.town_popoto_left"); is = words(FILE, "public.town_popoto_left");
  const picture = `         greatest(0,
           (select count(*) from public.gallery_likes l
              join public.gallery_posts g on g.id = l.post_id
             where g.author_id = w.id and l.profile_id <> w.id)
           - coalesce((select sum(e.popoto) from public.town_exchanges e
                        where e.kind = 'gallery' and e.member_id = w.id), 0)
         )::integer`;
  t.check("town_popoto_left is v105's word for word, but for the picture side behind its knob", !!was && was !== is && was.includes(picture)
    && was.replace(picture, () => "         case when coalesce((select k.value from public.town_knobs k where k.key = 'bank_gallery'), 0) > 0 then\n"
      + picture.split("\n").map((l) => "  " + l).join("\n") + "\n         else 0 end") === is);
}

t.section("the bank answers as it did");
r = await exchange(U.m1, "profile", 0);
t.check("nothing is no amount", r.ok === false && r.why === "amount" && r.coins === 40, r);
r = await exchange(U.m1, "profile", 13);
t.check("the week's twenty are the week's twenty", r.ok === false && r.why === "cap" && r.changed === 8, r);
const m2s = kept.filter((k) => k.receiver === CHAR.m2 && k.sender !== U.m2).length;
r = await exchange(U.m2, "profile", 20);
gone[CHAR.m2] = 20;
t.check("a whole week's twenty at once, by somebody who was given more than that", m2s > 20 && r.ok === true && r.coins === 100 && r.changed === 20 && r.profile_left === m2s - 20, { m2s, r });
t.check("…and the board leaves out their twenty oldest", same(await board("anon", "popoto_totals", null), expected(null, gone)) && same(await board("anon", "popoto_totals", october), expected(october, gone)));
r = await exchange(U.m2, "profile", 1);
t.check("…and the twenty-first is next week's", r.ok === false && r.why === "cap", r);
r = await t.as(U.m1, `select * from public.town_exchange('gil', 1)`);
t.check("a kind there is none of is an error, as it was", r.code === "22023", r);
for (const [who, name] of [["anon", "anon"], [U.unver, "an unproved character"]]) {
  const x = await t.as(who, `select * from public.town_exchange('profile', 1)`);
  t.check(`${name} changes nothing`, x.code === "42501", x);
}

t.section("popoto on pictures: shut, and the picture side untouched");
await t.sql(`insert into public.gallery_posts (author_id, caption) values ('${U.guest}', 'a view'); insert into public.gallery_likes (post_id, profile_id) values (1, '${U.m1}'), (1, '${U.m2}'), (1, '${U.admin}');`);
r = await t.as(U.guest, `select * from public.town_bank()`);
t.check("the bank tells a member with three popoto on a picture that there is none to change", r.rows?.[0]?.gallery_left === 0 && typeof r.rows[0].profile_left === "number", r.rows);
r = await exchange(U.guest, "gallery", 1);
t.check("…and changing one is refused", r.ok === false && r.why === "popoto" && (await ask(`select count(*)::int as n from public.town_exchanges where kind = 'gallery'`)).rows[0].n === 0, r);
r = await t.as(U.guest, `select public.town_me() as r`);
t.check("…and their purse says the same", r.rows?.[0]?.r?.purse?.popoto?.gallery === 0, r.rows?.[0]?.r?.purse?.popoto);
await t.sql(`update public.town_knobs set value = 1 where key = 'bank_gallery'`);
r = await t.as(U.guest, `select * from public.town_bank()`);
t.check("with the knob turned, there are three", r.rows?.[0]?.gallery_left === 3, r.rows);
const beforeGallery = await board("anon", "popoto_totals", null);
r = await exchange(U.guest, "gallery", 2);
t.check("…two are changed, as v105 had it", r.ok === true && r.gallery_left === 1 && r.coins === 10, r);
t.check("…and the profile board, the marks and the pictures' own popoto are what they were", same(await board("anon", "popoto_totals", null), beforeGallery)
  && (await ask(`select count(*)::int as n from public.town_changed where character_id = ${CHAR.guest}`)).rows[0].n === 0 && (await ask(`select count(*)::int as n from public.gallery_likes`)).rows[0].n === 3);

t.section("what was changed stays changed");
// two of the first member's gone popoto are taken away altogether (an account closed, say): the mark does not move back
await t.sql(`delete from public.kudos where id in (${mine[0].id}, ${mine[2].id})`);
const without = new Set([mine[0].id, mine[2].id]);
t.check("rows below the mark going changes nothing on the board", (await count("anon", CHAR.m1)) === mine.length - 8 && same(line(await board("anon", "popoto_totals", null), CHAR.m1), line(expected(null, gone), CHAR.m1)));
void without;
v = await ask(`select popoto, cut_id from public.town_changed where character_id = ${CHAR.m1}`);
t.check("…and their mark has not moved: a popoto taken away below it costs them nothing more", v.rows[0].popoto === 8 && Number(v.rows[0].cut_id) === mine[7].id, v.rows);
// a line of the ledger struck out by hand (it never is: the ledger outlives its member), and the file run again
await t.sql(`delete from public.town_exchanges where id = (select max(id) from public.town_exchanges where kind = 'profile' and character_id = ${CHAR.m1})`);

t.section("running it again");
// popoto that were changed before any mark was kept (there are none today: the bank has never opened; if there were, the file counts them)
const admins = kept.filter((k) => k.receiver === CHAR.admin);
await t.sql(`insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week) values ('${U.admin}', 'profile', ${CHAR.admin}, 4, 20, '2026-09-28')`);
await t.run(FILE, "v114 a third time");
v = await ask(`select popoto, cut_id from public.town_changed where character_id = ${CHAR.admin}`);
t.check("popoto the ledger had before any mark are marked by the file: the character's four oldest", admins.length > 10 && v.rows[0]?.popoto === 4 && Number(v.rows[0].cut_id) === admins[3].id
  && same(line(await board("anon", "popoto_totals", null), CHAR.admin), { receiver_character_id: CHAR.admin, score: admins.length - 4, n: new Set(admins.slice(4).map((k) => k.sender)).size, first_id: admins[4].id }), v.rows);
await t.run(FILE, "v114 a fourth time");
v = await ask(`select popoto, cut_id from public.town_changed where character_id = ${CHAR.admin}`);
t.check("…once: run again, the file counts nothing a second time", v.rows[0]?.popoto === 4 && Number(v.rows[0].cut_id) === admins[3].id && (await count("anon", CHAR.admin)) === admins.length - 4, v.rows);
// and a ledger that is ahead of a mark by three: the mark moves on by three, not by the whole ledger again
await t.sql(`insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week) values ('${U.admin}', 'profile', ${CHAR.admin}, 3, 15, '2026-09-28')`);
await t.run(FILE, "v114 a fifth time");
v = await ask(`select popoto, cut_id from public.town_changed where character_id = ${CHAR.admin}`);
t.check("a ledger ahead of its mark moves it on by the difference only", v.rows[0]?.popoto === 7 && Number(v.rows[0].cut_id) === admins[6].id && (await count("anon", CHAR.admin)) === admins.length - 7, v.rows);
v = await ask(`select (select value from public.town_knobs where key = 'bank_gallery') as gallery, (select count(*)::int from public.town_changed) as marks,
                      (select popoto from public.town_changed where character_id = ${CHAR.m1}) as m1`);
t.check("a knob an admin turned is not turned back, and no mark is lost", v.rows[0].gallery === 1 && v.rows[0].marks === 4 && v.rows[0].m1 === 8, v.rows);
v = await ask(`select cut_id from public.town_changed where character_id = ${CHAR.m1}`);
t.check("a line struck from the ledger brings no popoto back onto the board, and run again the file moves no mark", Number(v.rows[0].cut_id) === mine[7].id && (await count("anon", CHAR.m1)) === mine.length - 8
  && same(line(await board("anon", "popoto_totals", null), CHAR.m2), line(expected(null, gone), CHAR.m2)), v.rows);
t.check("…and kudos is still its own: its policies, grants and indexes as they were", JSON.stringify(JSON.parse(await tableState()).filter((_, i) => i !== 3)) === JSON.stringify(JSON.parse(kudosBefore).filter((_, i) => i !== 3)));

await t.done();
