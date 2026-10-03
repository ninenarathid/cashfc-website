/*
 * v105 — the banker opens his ledger: dry run in PGlite.
 *   node v105.test.mjs
 *   node mutate.mjs "E:/NinenineProject/fcnext/supabase/v105_the_banker_opens_his_ledger.sql" v105.test.mjs v105.mutations.mjs
 */
import { readFileSync } from "node:fs";
import { supabaseLike, refused, U, CHAR, migration } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
const FILE = process.env.MIGRATION_FILE ? readFileSync(process.env.MIGRATION_FILE, "utf8") : migration(105);   // (from supabase/, or from history once it has run)

// The tables this builds on, as they stand live (v2, the gallery's migration): readable by everybody.
const extra = `
create table public.kudos (
  id                    bigint generated always as identity primary key,
  sender_id             uuid not null references public.profiles (id) on delete cascade,
  receiver_character_id bigint not null,
  day                   date not null default current_date,
  created_at            timestamptz not null default now(),
  unique (sender_id, receiver_character_id, day)
);
alter table public.kudos enable row level security;
create policy "kudos: read for everyone" on public.kudos for select using (true);
create policy "kudos: send as yourself" on public.kudos for insert with check (auth.uid() = sender_id);
create table public.gallery_posts (
  id         bigint generated always as identity primary key,
  author_id  uuid not null references public.profiles (id) on delete cascade,
  caption    text,
  created_at timestamptz not null default now()
);
alter table public.gallery_posts enable row level security;
create policy "gallery: read posts" on public.gallery_posts for select using (true);
create table public.gallery_likes (
  post_id    bigint not null references public.gallery_posts (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);
alter table public.gallery_likes enable row level security;
create policy "gallery: read likes" on public.gallery_likes for select using (true);
create policy "gallery: unlike your own" on public.gallery_likes for delete using (auth.uid() = profile_id);
`;

const t = await supabaseLike({ extra });
await t.runTwice(FILE, "v105");

// m1 has been sent 30 popoto by friends (25 by m2, 5 by the admin) and 4 by themselves; their two pictures have 4
// from friends and 1 of their own.
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) select $1, $2, current_date - g from generate_series(1, 25) g`, [U.m2, CHAR.m1]);
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) select $1, $2, current_date - g from generate_series(1, 5) g`, [U.admin, CHAR.m1]);
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) select $1, $2, current_date - g from generate_series(1, 4) g`, [U.m1, CHAR.m1]);
const posts = (await t.sql(`insert into gallery_posts (author_id, caption) values ($1, 'one'), ($1, 'two') returning id`, [U.m1])).rows.map((r) => r.id);
await t.sql(`insert into gallery_likes (post_id, profile_id) values ($1, $3), ($1, $4), ($1, $5), ($2, $3), ($1, $6)`, [posts[0], posts[1], U.m2, U.admin, U.guest, U.m1]);

const bank = async (who) => (await t.as(who, `select * from public.town_bank()`));
const change = async (who, kind, n) => (await t.as(who, `select * from public.town_exchange($1, $2)`, [kind, n]));
const row = (r) => r.rows?.[0];
const is = (r, want) => !r.error && Object.entries(want).every(([k, v]) => row(r)?.[k] === v);

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select key, value from public.town_knobs order by key`);
t.check("the two knobs: five coins a popoto, twenty a week", v.rows.map((k) => `${k.key} ${k.value}`).join(", ") === "bank_rate 5, bank_weekly 20", v.rows);
v = await t.sql(`select c.relname, c.relrowsecurity from pg_class c
                  where c.oid in ('public.town_knobs'::regclass, 'public.town_purses'::regclass, 'public.town_exchanges'::regclass) order by 1`);
t.check("row-level security is on, on all three", v.rows.length === 3 && v.rows.every((c) => c.relrowsecurity === true), v.rows);
v = await t.sql(`select count(*)::int as n from information_schema.role_table_grants
                  where table_schema = 'public' and table_name in ('town_knobs', 'town_purses', 'town_exchanges') and grantee in ('anon', 'authenticated')`);
t.check("nothing is granted to a browser on any of them", v.rows[0].n === 0, v.rows);
v = await t.sql(`select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon, has_function_privilege('authenticated', p.oid, 'execute') as member
                   from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('town_bank', 'town_exchange', 'town_popoto_left') order by 1`);
t.check("the functions: the two for members only, the counting for nobody in a browser",
  v.rows.map((f) => `${f.proname} ${f.anon} ${f.member}`).join(", ") === "town_bank false true, town_exchange false true, town_popoto_left false false", v.rows);
v = await t.sql(`select (select count(*) from public.town_purses)::int as purses, (select count(*) from public.town_exchanges)::int as lines`);
t.check("no purse and no line until the bank opens", v.rows[0].purses === 0 && v.rows[0].lines === 0, v.rows);

t.section("who may come to the counter");
let r = await t.as("anon", `select * from public.town_bank()`);
t.check("anon may not ask the bank", r.code === "42501", r);
r = await t.as("anon", `select * from public.town_exchange('profile', 1)`);
t.check("anon may not change popoto", r.code === "42501", r);
r = await change(U.unver, "profile", 1);
t.check("an unproved character is refused", r.code === "42501", r);
r = await change(U.nochar, "profile", 1);
t.check("an account with no character is refused", r.code === "42501", r);
r = await bank(U.unver);
t.check("…and is not told a balance either", r.code === "42501", r);
r = await bank(U.guest);
t.check("a proved character outside the FC has a counter, with nothing to change", is(r, { coins: 0, profile_left: 0, gallery_left: 0, changed: 0 }), r);

t.section("the tables are closed");
r = await t.as(U.m1, `select * from public.town_purses`);
t.check("a member cannot read the purses", r.code === "42501", r);
r = await t.as(U.m1, `select * from public.town_exchanges`);
t.check("…nor the ledger", r.code === "42501", r);
r = await t.as(U.m1, `select * from public.town_knobs`);
t.check("…nor the knobs", r.code === "42501", r);
r = await t.as(U.m1, `select * from public.town_popoto_left($1)`, [U.m2]);
t.check("a member cannot count somebody else's popoto", r.code === "42501", r);

t.section("the counter");
r = await bank(U.m1);
t.check("what friends sent is there to change; what one sent oneself is not", is(r, { coins: 0, rate: 5, weekly: 20, changed: 0, profile_left: 30, gallery_left: 4 }), r);

t.section("changing popoto");
r = await change(U.m1, "profile", 7);
t.check("seven popoto are thirty-five coins", is(r, { ok: true, why: null, coins: 35, changed: 7, profile_left: 23, gallery_left: 4 }), r);
v = await t.sql(`select member_id, kind, character_id, popoto, coins, week = date_trunc('week', now() at time zone 'Asia/Bangkok')::date as this_week from public.town_exchanges`);
t.check("the ledger has the line: who, whose character, how many, for how much, in this week of Bangkok's",
  v.rows.length === 1 && v.rows[0].member_id === U.m1 && Number(v.rows[0].character_id) === CHAR.m1 && v.rows[0].popoto === 7 && v.rows[0].coins === 35 && v.rows[0].this_week === true, v.rows);
v = await t.sql(`select count(*)::int as n from public.kudos where receiver_character_id = $1`, [CHAR.m1]);
t.check("no popoto was deleted: every send is still there", v.rows[0].n === 34, v.rows);
r = await change(U.m1, "gallery", 5);
t.check("more than is left of a kind is refused, and says so", is(r, { ok: false, why: "popoto", coins: 35, changed: 7, gallery_left: 4 }), r);
r = await change(U.m1, "gallery", 4);
t.check("the pictures' popoto change too", is(r, { ok: true, coins: 55, changed: 11, gallery_left: 0, profile_left: 23 }), r);
r = await change(U.m1, "profile", 10);
t.check("more than is left of the week's twenty is refused, and says so", is(r, { ok: false, why: "cap", coins: 55, changed: 11 }), r);
r = await change(U.m1, "profile", 9);
t.check("up to the twentieth is changed", is(r, { ok: true, coins: 100, changed: 20, profile_left: 14 }), r);
r = await change(U.m1, "profile", 1);
t.check("the twenty-first is refused", is(r, { ok: false, why: "cap", coins: 100, changed: 20 }), r);
for (const n of [0, -3, null]) {
  r = await change(U.m1, "profile", n);
  t.check(`${n} popoto is no amount`, is(r, { ok: false, why: "amount", coins: 100 }), r);
}
r = await change(U.m1, "coins", 1);
t.check("there is no third kind of popoto", r.code === "22023", r);
v = await t.sql(`select coins from public.town_purses where member_id = $1`, [U.m1]);
t.check("the purse holds what the counter said", v.rows[0]?.coins === 100, v.rows);

t.section("nobody mints");
r = await t.as(U.m1, `update public.town_purses set coins = 999 where member_id = $1`, [U.m1]);
t.check("a member cannot write their own purse", r.code === "42501", r);
r = await t.as(U.m1, `insert into public.town_purses (member_id, coins) values ($1, 999)`, [U.m2]);
t.check("…nor make one for somebody", r.code === "42501", r);
r = await t.as(U.m1, `insert into public.town_exchanges (member_id, kind, character_id, popoto, coins, week) values ($1, 'profile', $2, 1, 5000, current_date)`, [U.m1, CHAR.m1]);
t.check("…nor write a line in the ledger", r.code === "42501", r);
r = await t.as(U.m1, `update public.town_knobs set value = 1000 where key = 'bank_rate'`);
t.check("…nor turn a knob", r.code === "42501", r);
r = await t.as(U.admin, `update public.town_knobs set value = 1000 where key = 'bank_rate'`);
t.check("an admin in a browser turns no knob either", r.code === "42501", r);
v = await t.sql(`select (select coins from public.town_purses where member_id = $1) as coins, (select count(*) from public.town_purses)::int as purses,
                        (select value from public.town_knobs where key = 'bank_rate') as rate, (select count(*) from public.town_exchanges)::int as lines`, [U.m1]);
t.check("everything is as it was", v.rows[0].coins === 100 && v.rows[0].purses === 1 && v.rows[0].rate === 5 && v.rows[0].lines === 3, v.rows);

t.section("a new week");
await t.sql(`update public.town_exchanges set week = week - 7`);
r = await bank(U.m1);
t.check("on Monday the twenty are there again; what was changed stays changed", is(r, { coins: 100, changed: 0, profile_left: 14, gallery_left: 0 }), r);
r = await change(U.m1, "profile", 14);
t.check("the last fourteen are changed", is(r, { ok: true, coins: 170, changed: 14, profile_left: 0 }), r);
r = await change(U.m1, "profile", 1);
t.check("and then there are none left to change", is(r, { ok: false, why: "popoto", coins: 170 }), r);

t.section("what could go wrong later");
await t.sql(`delete from public.gallery_likes where post_id = $1`, [posts[0]]);
r = await bank(U.m1);
t.check("popoto taken back off a picture after they were changed leave nothing, never less than nothing", is(r, { gallery_left: 0, coins: 170 }), r);
await t.sql(`update public.town_knobs set value = 6 where key = 'bank_rate'`);
await t.sql(`insert into kudos (sender_id, receiver_character_id, day) values ($1, $2, current_date)`, [U.guest, CHAR.m1]);
r = await change(U.m1, "profile", 1);
t.check("the rate is the knob's: turned to six, a popoto is six coins", is(r, { ok: true, coins: 176, profile_left: 0 }), r);
await t.sql(`update public.town_knobs set value = 5 where key = 'bank_rate'`);
// the character is proved by another account: what was changed for it stays changed
await t.sql(`update public.profiles set character_id = null, character_verified_at = null where id = $1`, [U.m1]);
await t.sql(`update public.profiles set character_id = $2, character_verified_at = now() where id = $1`, [U.nochar, CHAR.m1]);
r = await bank(U.nochar);
// (35 sends to that character, none of them by the new account, less the 31 changed for it)
t.check("a character proved by another account brings no changed popoto back", is(r, { coins: 0, profile_left: 4 }), r);
r = await bank(U.m1);
t.check("…and its old account, with no character now, has no counter", r.code === "42501", r);
const before = (await t.sql(`select count(*)::int as n, sum(popoto)::int as popoto from public.town_exchanges`)).rows[0];
await t.sql(`delete from public.profiles where id = $1`, [U.m1]);
v = await t.sql(`select count(*)::int as n, sum(popoto)::int as popoto, count(member_id)::int as named from public.town_exchanges`);
t.check("an account deleted leaves its lines in the ledger, with no name", v.rows[0].n === before.n && v.rows[0].popoto === before.popoto && v.rows[0].named === 0, v.rows);
r = await bank(U.nochar);
t.check("…so its character's popoto are still changed", is(r, { profile_left: 0, coins: 0 }), r);
// a friend who sent most of them deletes their account, and their sends go with it: fewer were sent than were changed
await t.sql(`delete from public.profiles where id = $1`, [U.m2]);
r = await bank(U.nochar);
t.check("sends that go with a deleted friend leave nothing to change, never less than nothing", is(r, { profile_left: 0, gallery_left: 0 }), r);
void refused;

await t.done();
