/*
 * A worked example: v100 (told about your look) on top of v98 and v99,
 * replayed from git history, exactly as a new vNN test should be shaped.
 *
 * Copy next to pglite-harness.mjs in the scratchpad and run: node example.test.mjs
 * Rename and rewrite for your migration; keep the shape:
 *   1. the stubs, plus the live tables your file leans on (worst case first)
 *   2. the earlier migrations it needs, replayed from history
 *   3. your file, twice
 *   4. checks as anon, a member, the owner, an unverified account, an admin
 *   5. the attacks: forged columns, other people's rows, drafts, hidden names
 */
import { supabaseLike, migration, refused, U, CHAR } from "./pglite-harness.mjs";

// notifications as it stands live — v19's table plus the columns added since.
// Worst case for the file under test: a member may insert any row at all.
const NOTIFICATIONS = `
create table public.notifications (
  id bigint generated always as identity primary key,
  recipient uuid not null references public.profiles(id) on delete cascade,
  kind text not null, actor uuid, actor_name text, post_id bigint, body text,
  created_at timestamptz not null default now(), read_at timestamptz,
  answered_at timestamptz, cleared_at timestamptz, party_id bigint, announcement_id bigint);
alter table public.notifications enable row level security;
create policy "notifications: read own" on public.notifications for select using (recipient = auth.uid());
create policy "notifications: mark own read" on public.notifications for update
  using (recipient = auth.uid()) with check (recipient = auth.uid());
create policy "notifications: anything" on public.notifications for insert to authenticated with check (true);
`;

const t = await supabaseLike({ extra: NOTIFICATIONS });
await t.run(migration(98), "v98");
await t.run(migration(99), "v99");
await t.runTwice(migration(100), "v100");

await t.sql(`
  insert into contests (id, title, submit_opens_at, submit_closes_at, vote_opens_at, vote_closes_at, published_at)
  values (1, 'Live', now()-interval '1 day', now()+interval '5 days', now()-interval '1 day', now()+interval '6 days', now());
  insert into contest_entries (id, contest_id, author_id, character_id, number, approved_at) values
   (11, 1, '${U.m1}', ${CHAR.m1}, 1, now()), (12, 1, '${U.m2}', ${CHAR.m2}, 2, now());`);

const told = async (who) =>
  (await t.as(who, `select actor, contest_entry_id, body from notifications where kind = 'contest_talk' order by id`)).rows ?? [];

t.section("the owner is told, and nobody else");
let r = await t.as(U.m2, `insert into contest_comments (entry_id, author_id, body) values (11, $1, 'สวยมาก') returning id`, [U.m2]);
t.check("a verified member comments on somebody's look", !r.error, r);
let n = await told(U.m1);
t.check("its owner gets one notice, naming the look", n.length === 1 && Number(n[0].contest_entry_id) === 11, n);
t.check("the speaker is not told", (await told(U.m2)).length === 0);

t.section("who may not write");
r = await t.as("anon", `insert into contest_comments (entry_id, author_id, body) values (11, $1, 'x')`, [U.m2]);
t.check("anon is refused", refused(r), r);
r = await t.as(U.unver, `insert into contest_comments (entry_id, author_id, body) values (11, $1, 'x')`, [U.unver]);
t.check("an unproved character is refused", refused(r), r);
r = await t.as(U.m1, `insert into contest_comments (entry_id, author_id, body) values (12, $1, 'x')`, [U.m2]);
t.check("nobody writes in somebody else's name", refused(r), r);

t.section("the column is the database's");
r = await t.as(U.m1, `insert into notifications (recipient, kind, contest_entry_id, body) values ($1, 'contest_talk', 12, 'forged')`, [U.m2]);
const forged = await t.as("super", `select contest_entry_id from notifications where body = 'forged'`);
t.check("a row from a browser cannot name a look", !r.error && forged.rows?.[0]?.contest_entry_id === null, { r, forged });
r = await t.as("service", `insert into notifications (recipient, kind, contest_entry_id) values ($1, 'contest_talk', 12) returning contest_entry_id`, [U.m2]);
t.check("the service role still can", Number(r.rows?.[0]?.contest_entry_id) === 12, r);

t.done();
