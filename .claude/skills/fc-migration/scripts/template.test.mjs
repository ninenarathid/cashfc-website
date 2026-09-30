/*
 * Keeps references/template.sql honest: it must run twice and refuse what it
 * says it refuses. Run after editing the template:
 *   node template.test.mjs            (from the scratchpad copy, see SKILL.md)
 */
import { readFileSync } from "node:fs";
import { supabaseLike, refused, U } from "./pglite-harness.mjs";

const repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext";
// MIGRATION_FILE lets mutate.mjs hand in a deliberately broken copy.
const TEMPLATE = readFileSync(process.env.MIGRATION_FILE ?? `${repo}/.claude/skills/fc-migration/references/template.sql`, "utf8");

const t = await supabaseLike();
await t.runTwice(TEMPLATE, "template");

t.section("what it should say afterwards (the file's closing block)");
let v = await t.sql(`select relrowsecurity from pg_class where oid = 'public.fc_things'::regclass`);
t.check("row-level security is on", v.rows[0]?.relrowsecurity === true, v.rows);
v = await t.sql(`select policyname, cmd, permissive from pg_policies where tablename = 'fc_things' order by policyname`);
t.check("seven policies, the named trio restrictive",
  v.rows.map((p) => `${p.policyname} ${p.cmd} ${p.permissive}`).join(", ") ===
  "fc_things_add INSERT PERMISSIVE, fc_things_drop DELETE PERMISSIVE, fc_things_edit UPDATE PERMISSIVE, "
  + "fc_things_named_drop DELETE RESTRICTIVE, fc_things_named_edit UPDATE RESTRICTIVE, "
  + "fc_things_named_write INSERT RESTRICTIVE, fc_things_read SELECT PERMISSIVE", v.rows);
v = await t.sql(`select grantee, privilege_type from information_schema.role_table_grants
                  where table_name = 'fc_things' and grantee in ('anon', 'authenticated') order by grantee, privilege_type`);
t.check("table grants: anon SELECT; authenticated DELETE, SELECT",
  v.rows.map((g) => `${g.grantee} ${g.privilege_type}`).join(", ") === "anon SELECT, authenticated DELETE, authenticated SELECT", v.rows);
v = await t.sql(`select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fc-things'`);
t.check("the bucket row", v.rows.length === 1 && v.rows[0].public === true && v.rows[0].file_size_limit === 5242880, v.rows);

t.section("writing");
let r = await t.as(U.m1, `insert into fc_things (author_id, body) values ($1, 'hello') returning id, approved_at`, [U.m1]);
t.check("a verified member adds a row", !r.error && r.rows?.length === 1, r);
const mine = r.rows?.[0]?.id;
r = await t.as(U.m1, `insert into fc_things (author_id, body, approved_at) values ($1, 'x', now())`, [U.m1]);
t.check("but may not send approved_at (no column grant)", r.code === "42501", r);
r = await t.as(U.m1, `insert into fc_things (author_id, body) values ($1, 'in your name')`, [U.m2]);
t.check("nobody writes in somebody else's name", refused(r), r);
r = await t.as(U.unver, `insert into fc_things (author_id, body) values ($1, 'x')`, [U.unver]);
t.check("an unproved character is refused", refused(r), r);
r = await t.as(U.nochar, `insert into fc_things (author_id, body) values ($1, 'x')`, [U.nochar]);
t.check("an account with no character is refused", refused(r), r);
r = await t.as("anon", `insert into fc_things (author_id, body) values ($1, 'x')`, [U.m1]);
t.check("anon is refused", refused(r), r);
r = await t.as(U.m1, `insert into fc_things (author_id, body) values ($1, $2)`, [U.m1, "ก".repeat(301)]);
t.check("a body over 300 characters is refused by the check", r.code === "23514", r);

t.section("editing");
r = await t.as(U.m2, `update fc_things set body = 'mine now' where id = $1`, [mine]);
t.check("another member cannot edit it", refused(r), r);
r = await t.as(U.m1, `update fc_things set approved_at = now(), body = 'edited' where id = $1 returning approved_at, body`, [mine]);
t.check("the author edits the body, but approved_at stays the database's",
  !r.error && r.rows?.[0]?.body === "edited" && r.rows?.[0]?.approved_at === null, r);
r = await t.as(U.admin, `update fc_things set approved_at = now() where id = $1 returning approved_at`, [mine]);
t.check("an admin can approve", !r.error && r.rows?.[0]?.approved_at != null, r);
r = await t.as(U.m1, `update fc_things set hidden = true where id = $1`, [mine]);
t.check("the author hides their own row", !r.error && r.affected === 1, r);

t.section("reading");
r = await t.as("anon", `select count(*)::int as n from fc_things`);
t.check("anon does not see a hidden row", r.rows?.[0]?.n === 0, r);
r = await t.as(U.m1, `select count(*)::int as n from fc_things`);
t.check("its author still does", r.rows?.[0]?.n === 1, r);

t.section("the RPC");
r = await t.as("anon", `select public.fc_things_mine_count() as n`);
t.check("anon may not call it", r.code === "42501", r);
r = await t.as(U.m1, `select public.fc_things_mine_count() as n`);
t.check("a member gets their own count", r.rows?.[0]?.n === 1, r);

t.section("the bucket");
r = await t.as("super", `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'fc-things'`);
t.check("limits are on the bucket, no SVG", r.rows?.[0]?.file_size_limit === 5242880
  && !r.rows?.[0]?.allowed_mime_types.includes("image/svg+xml"), r);
r = await t.as(U.m1, `insert into storage.objects (bucket_id, name) values ('fc-things', $1)`, [`${U.m1}/a.webp`]);
t.check("a member uploads into their own folder", !r.error, r);
r = await t.as(U.m1, `insert into storage.objects (bucket_id, name) values ('fc-things', $1)`, [`${U.m2}/a.webp`]);
t.check("not into somebody else's", refused(r), r);
r = await t.as(U.unver, `insert into storage.objects (bucket_id, name) values ('fc-things', $1)`, [`${U.unver}/a.webp`]);
t.check("an unproved character cannot upload", refused(r), r);
r = await t.as(U.m2, `select count(*)::int as n from storage.objects where bucket_id = 'fc-things'`);
t.check("nobody lists another member's files", r.rows?.[0]?.n === 0, r);

t.section("the service key");
r = await t.as("service", `insert into fc_things (author_id, body, approved_at) values ($1, 'by script', now()) returning approved_at`, [U.m2]);
t.check("the service role still writes anything", !r.error && r.rows?.[0]?.approved_at != null, r);

t.section("the harness itself");
await t.as(U.admin, `select 1`);
await t.run(`create table public.harness_probe as select auth.uid() as uid, public.is_admin() as admin`, "a migration after a check");
const who = await t.sql(`select uid, admin from public.harness_probe`);
t.check("a migration runs as the SQL editor, not as the last person checked",
  who.rows[0]?.uid === null && who.rows[0]?.admin === false, who.rows);
const one = await t.sql(`select count(*)::int as n from fc_things where author_id = $1`, [U.m2]);
t.check("t.sql() takes parameters", one.rows[0]?.n === 1, one.rows);

t.done();
