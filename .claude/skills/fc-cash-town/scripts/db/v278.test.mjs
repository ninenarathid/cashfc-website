// v278, the one model in the announcements, dry-run: on the chain through v277, with v256 laid as well where its
// admin account can be made on the bench; the file runs twice; the faces take a look in the new form and still in the
// old, and nothing else; no function keeps the old form's test; a member's face is kept in the new form by
// town_announcements, and Ninenine's by town_admin_announce; their grants as they were; no bare write.
//   cd <the tree> && node .claude/skills/fc-cash-town/scripts/db/v278.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rewardDB } from "./reward-db.mjs";
import { bareWrites } from "./bare-writes.mjs";
import { CHAIN as THROUGH_V276 } from "./build-v277.mjs";
process.env.FC_REPO ??= process.cwd().replace(/\\/g, "/");
await import("./repo-ts-town.mjs");
const { encodeLook, defaultLook } = await import("@/lib/town/look");

const FILE = "supabase/v278_the_one_model_in_the_announcements.sql", NINENINE = "9c0e6904-df00-452d-b005-dac3fa6cd1d7";
let checks = 0;
const eq = (a, b, what) => { assert.deepEqual(a, b, `${what}: ${JSON.stringify(a)} against ${JSON.stringify(b)}`); checks++; };
const ok = (c, what) => { assert.ok(c, what); checks++; };
const db = await rewardDB(252);
const one = async (q, a = []) => (await db.query(q, a)).rows[0];
try {
  for (const f of [...THROUGH_V276, "v276_things_to_wear_had_from_the_game", "v277_forty_six_things_to_wear"]) await db.exec(readFileSync(`supabase/${f}.sql`, "utf8"));
  // v256, where its admin account can stand on the bench
  let v256 = "not laid";
  try {
    await db.query("insert into auth.users (id) values ($1) on conflict do nothing", [NINENINE]);
    await db.query("insert into public.profiles (id, is_admin) values ($1, true) on conflict (id) do update set is_admin = true", [NINENINE]);
    await db.exec(readFileSync("supabase/v256_ninenine_can_announce_in_town.sql", "utf8"));
    v256 = "laid";
  } catch (e) { v256 = `not laid (${String(e.message).slice(0, 80)})`; }
  const old = (await db.query("select p.oid::regprocedure::text s from pg_proc p where p.prosrc like '%^5[0-9a-z]{7}$%'")).rows.map((r) => r.s);
  ok(old.length >= 1, `the old form is tested in ${old.join(", ")} before`);
  const sql = readFileSync(FILE, "utf8");
  await db.exec(sql);
  await db.exec(sql);
  eq((await one("select pg_get_constraintdef(oid) d from pg_constraint where conname = 'town_announcement_faces_look_check'")).d, "CHECK ((look ~ '^(5[0-9a-z]{7}|6[0-9a-z]{12})$'::text))", "the faces' check");
  eq((await one("select count(*)::int n from pg_proc where prosrc like '%''^5[0-9a-z]{7}$''%'")).n, 0, "no function tests the old form alone");

  const member = (await one("select id from public.profiles where id <> $1 order by id limit 1", [NINENINE])).id;
  const v6 = encodeLook({ ...defaultLook(member), outfit: 9, hat: 9 }), v5 = "5" + v6.slice(1, 8);
  ok(/^6[0-9a-z]{12}$/.test(v6), `a look of the new form (${v6})`);
  const as = async (who, text, args = []) => {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [who]);
    await db.query("select set_config('request.jwt.claim.role','authenticated',false)");
    await db.exec("set role authenticated");
    try { return { row: (await db.query(text, args)).rows[0] }; } catch (e) { return { err: String(e.message ?? e) }; } finally { await db.exec("reset role"); }
  };
  const face = async (who) => (await one("select look from public.town_announcement_faces where member_id = $1", [who]))?.look ?? null;
  const feed = (await one("select p.oid::regprocedure::text s from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'town_announcements_v256'")) ? "town_announcements_v256" : "town_announcements";
  for (const [look, what] of [[v5, "the old form"], [v6, "the new form"]]) {
    const r = await as(member, `select public.${feed}(null, $1) r`, [look]);
    ok(!r.err, `${feed} answers (${r.err ?? ""})`);
    eq(await face(member), look, `${feed} keeps a face of ${what}`);
  }
  for (const junk of ["7" + v6.slice(1), v6 + "0", "6ABC", "' or 1=1"]) {
    await as(member, `select public.${feed}(null, $1) r`, [junk]);
    eq(await face(member), v6, `…and not ${JSON.stringify(junk)}`);
  }
  let caught = null;
  try { await db.query("insert into public.town_announcement_faces (member_id, look) values ($1, 'x')", [member]); } catch (e) { caught = e.code; }
  eq(caught, "23514", "the check refuses a look of neither form");
  if (v256 === "laid") {
    const r = await as(NINENINE, "select public.town_admin_announce($1, $2::uuid, $3) r", ["v278 trial", "00000000-0000-0000-0000-0000000278a1", v6]);
    ok(!r.err && r.row.r.ok, `Ninenine announces (${r.err ?? JSON.stringify(r.row?.r)})`);
    eq(await face(NINENINE), v6, "…and his face is kept in the new form");
  }
  for (const sig of ["public.town_announcements(bigint,text)", ...(v256 === "laid" ? ["public.town_announcements_v256(bigint,text)", "public.town_admin_announce(text,uuid,text)"] : [])]) {
    eq((await one("select has_function_privilege('anon',$1,'EXECUTE') a, has_function_privilege('authenticated',$1,'EXECUTE') b", [sig])), { a: false, b: true }, `${sig}: its grants as they were`);
  }
  eq((await bareWrites((q) => db.query(q).then((r) => r.rows))).length, 0, "no bare write");
  console.log(`v278: ${checks} checks passed (v256 ${v256}; the old form was tested in ${old.length} function(s)).`);
} finally { await db.close(); }
