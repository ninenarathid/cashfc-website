/*
 * A Supabase-shaped Postgres in memory, for dry-running a supabase/vNN
 * migration and its row-level security before the user pastes it into the
 * SQL editor.
 *
 * This machine has no Docker, psql or Supabase CLI. PGlite is real Postgres
 * (0.5.x = Postgres 18) with real roles, grants and RLS, so what a policy
 * lets through here is what it lets through there — with one trap the stubs
 * below exist to close: Supabase grants ALL on every new table, sequence and
 * function to anon and authenticated by default. Without reproducing that, a
 * column-level `grant update (caption)` looks like protection here and is
 * none on Supabase.
 *
 * It is still not Supabase. PostgREST, the storage API (upsert, owner
 * columns), realtime and whatever the live tables have gained since the stubs
 * were written all need a live probe afterwards (fc-security skill,
 * references/live-probe.md).
 *
 * Usage — copy this file next to your test, in the scratchpad, not the repo:
 *
 *   npm init -y && npm i @electric-sql/pglite@0.5
 *   import { supabaseLike, migration, U } from "./pglite-harness.mjs";
 *   const t = await supabaseLike();
 *   await t.runTwice(migration(101));           // the new file, run twice
 *   let r = await t.as(U.m1, "insert into ...");
 *   t.check("a member can write their own row", !r.error, r);
 *   t.done();                                    // prints the tally, sets exit code
 */

import { PGlite } from "@electric-sql/pglite";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Fixed ids, so a failing check names somebody recognisable. */
export const U = {
  admin: "00000000-0000-0000-0000-00000000000a", // is_admin, verified, in the FC
  m1: "00000000-0000-0000-0000-000000000001",    // verified member, in the FC
  m2: "00000000-0000-0000-0000-000000000002",    // verified member, in the FC
  guest: "00000000-0000-0000-0000-000000000003", // verified, NOT in fc_roster
  unver: "00000000-0000-0000-0000-000000000004", // claimed a character, never proved it
  nochar: "00000000-0000-0000-0000-000000000005", // signed in, no character at all
};

/** Character ids that go with the people above. */
export const CHAR = { admin: 1001, m1: 2001, m2: 2002, guest: 3001, unver: 4001 };

const STUBS = `
-- ── roles, and the grants Supabase hands every new object ────────────────
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- ── auth ──────────────────────────────────────────────────────────────────
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  ), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
  )
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

-- ── profiles, the way the live table reads for the rules that matter ─────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  discord_username text,
  discord_avatar text,
  display_name text,
  character_id bigint unique,
  character_name text,
  character_verified_at timestamptz,
  bio text,
  favorite_job text,
  accent_color text,
  is_admin boolean not null default false,
  updated_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- v24: a claimed character. v85: a proved one — the bar for writing anything.
create or replace function public.has_character() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = (select auth.uid()) and character_id is not null)
$$;
create or replace function public.verified_character() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = (select auth.uid())
                    and character_id is not null
                    and character_verified_at is not null)
$$;

alter table public.profiles enable row level security;
create policy "profiles: read for everyone" on public.profiles for select using (true);
create policy "profiles: owner update" on public.profiles for update using (auth.uid() = id);
create policy "profiles: admin update" on public.profiles for update using (public.is_admin());
revoke insert, update on table public.profiles from anon, authenticated;
grant update (character_id, character_name, bio, favorite_job, accent_color,
              discord_username, discord_avatar, updated_at)
  on table public.profiles to authenticated;

-- Who is in the FC today (the pipeline keeps it).
create table public.fc_roster (
  character_id bigint primary key,
  synced_at timestamptz not null default now()
);
alter table public.fc_roster enable row level security;

-- ── storage, enough for bucket rows and object policies ──────────────────
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;
create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);
create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated, service_role;
grant select on storage.buckets to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1:array_length(_parts, 1) - 1];
end $$;
create function storage.filename(name text) returns text language plpgsql immutable as $$
declare _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[array_length(_parts, 1)];
end $$;
create function storage.extension(name text) returns text language plpgsql immutable as $$
declare _parts text[]; _filename text;
begin
  select string_to_array(name, '/') into _parts;
  select _parts[array_length(_parts, 1)] into _filename;
  return reverse(split_part(reverse(_filename), '.', 1));
end $$;
`;

const SEED = `
insert into auth.users (id, email) values
  ('${U.admin}', 'admin@example.com'), ('${U.m1}', 'm1@example.com'),
  ('${U.m2}', 'm2@example.com'), ('${U.guest}', 'guest@example.com'),
  ('${U.unver}', 'unver@example.com'), ('${U.nochar}', 'nochar@example.com');
insert into public.profiles (id, character_id, character_name, character_verified_at, is_admin) values
  ('${U.admin}', ${CHAR.admin}, 'Aqua Admin', now(), true),
  ('${U.m1}', ${CHAR.m1}, 'Member One', now(), false),
  ('${U.m2}', ${CHAR.m2}, 'Member Two', now(), false),
  ('${U.guest}', ${CHAR.guest}, 'Guest Three', now(), false),
  ('${U.unver}', ${CHAR.unver}, 'Unproved Four', null, false),
  ('${U.nochar}', null, null, null, false);
insert into public.fc_roster (character_id) values (${CHAR.admin}), (${CHAR.m1}), (${CHAR.m2});
`;

/**
 * A fresh database with the stubs (and, unless seed:false, the six people in U).
 * `extra` is SQL for tables "as they stand live" that the migration leans on
 * and no replayable file creates — write them by hand, worst case first.
 */
/**
 * `load`: a data directory dumped earlier (`await t.db.dumpDataDir("none")`, as a Blob), loaded in the place of an empty
 * database with the stubs, the seed and `extra` run into it: whatever was in it is there, and nothing is run. For a
 * stand-in that takes long to build (a hundred files replayed): build it once, dump it, and begin every check from it.
 */
export async function supabaseLike({ seed = true, extra = "", load = null } = {}) {
  const db = load ? new PGlite({ loadDataDir: load }) : new PGlite();
  // One line per failure: an uncaught PGlite error prints its minified source.
  const setUp = async (sql, label) => {
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`${label} failed: ${e.message} (${e.code ?? "no code"})`);
    }
  };
  if (!load) {
    await setUp(STUBS, "the stubs");
    if (seed) await setUp(SEED, "the seed");
    if (extra) await setUp(extra, "extra");
  }

  let pass = 0;
  let fail = 0;

  /**
   * Back to the SQL editor: superuser, nobody signed in. The JWT settings are
   * session-wide, so without this a migration run after a check would see
   * the last checked person as auth.uid() and is_admin() — which the SQL
   * editor never does.
   */
  async function asEditor() {
    await db.exec(`reset role;
      select set_config('request.jwt.claim.sub', '', false);
      select set_config('request.jwt.claim.role', '', false);
      select set_config('request.jwt.claims', '', false);`);
  }

  /**
   * Run sql as somebody: "super" (the SQL editor), "service" (the service
   * key: bypasses RLS, still needs grants), "anon", or a user id from U.
   * Never throws: returns { rows, affected } or { error, code }.
   */
  async function as(who, sql, params = []) {
    const sub = who === "super" || who === "service" || who === "anon" ? "" : who;
    const role = who === "anon" ? "anon" : who === "service" ? "service_role" : sub ? "authenticated" : "";
    const claims = JSON.stringify(sub ? { sub, role: "authenticated" } : role ? { role } : {});
    try {
      await asEditor();
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [sub]);
      await db.query("select set_config('request.jwt.claim.role', $1, false)", [role]);
      await db.query("select set_config('request.jwt.claims', $1, false)", [claims]);
      if (role) await db.exec(`set role ${role}`);
      if (params.length) {
        const r = await db.query(sql, params);
        return { rows: r.rows, affected: r.affectedRows ?? 0 };
      }
      // No parameters: exec, which takes several statements where query takes
      // one. The rows are the last statement's; the count is all of them.
      const all = await db.exec(sql);
      const last = all[all.length - 1] ?? { rows: [] };
      return { rows: last.rows, affected: all.reduce((n, r) => n + (r.affectedRows ?? 0), 0) };
    } catch (e) {
      return { error: e.message, code: e.code };
    } finally {
      await asEditor();
    }
  }

  /**
   * Set-up rows, or a read-back, as the SQL editor (superuser). Several
   * statements are allowed when there are no params. Throws, because a check
   * that runs over missing rows passes or fails for the wrong reason — an
   * insert refused by RLS looks the same as one whose parent row was never
   * there.
   */
  async function sql(text, params = []) {
    const r = await as("super", text, params);
    if (r.error) throw new Error(`set-up failed: ${r.error} (${r.code})`);
    return r;
  }

  /** Run a migration's text once, as the SQL editor would. Throws on failure. */
  async function run(sql, label = "migration") {
    try {
      await asEditor();
      await db.exec(sql);
      check(`${label} runs`, true);
    } catch (e) {
      check(`${label} runs`, false, `${e.message} (${e.code ?? "no code"})`);
      // Nothing after this can mean anything; stop with one readable line.
      throw new Error(`${label} did not run: ${e.message}`);
    }
  }

  /** Twice, because the SQL editor gets re-run and every file claims it is safe to. */
  async function runTwice(sql, label = "migration") {
    await run(sql, label);
    try {
      await asEditor();
      await db.exec(sql);
      check(`${label} runs a second time`, true);
    } catch (e) {
      check(`${label} runs a second time`, false, e.message);
    }
  }

  function check(name, cond, detail = "") {
    if (cond) {
      pass++;
      console.log("  PASS", name);
    } else {
      fail++;
      const why = typeof detail === "string" ? detail : JSON.stringify(detail);
      console.log("  FAIL", name, why);
    }
  }

  function section(title) {
    console.log(`── ${title}`);
  }

  function done() {
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
    return { pass, fail };
  }

  return { db, as, sql, run, runTwice, check, section, done };
}

/**
 * Was a write refused? Postgres answers a refused INSERT with 42501 (no grant,
 * or a row RLS will not accept) and a refused UPDATE/DELETE by touching no
 * rows at all, so both count.
 *
 * Zero rows also happens when the WHERE matched nothing because the row was
 * never there, so pair an UPDATE/DELETE refusal with a read-back through
 * t.sql() showing the row is still there and unchanged.
 */
export const refused = (r) => r.code === "42501" || (!r.error && r.affected === 0);

/** Did the write get past the grants and RLS, whatever happened after? */
export const reachedConstraints = (r) =>
  !r.error || ["23502", "23503", "23505", "23514", "P0001"].includes(r.code);

/**
 * The text of a migration by number: the working tree if it is still there
 * (not run yet), otherwise from git — the "vNN has run" commit deleted it, so
 * it is read back from that commit's parent.
 *
 *   migration(101)                     supabase/v101_*.sql in the working tree
 *   migration(98, { repo: "E:/..." })  from history
 *
 * A draft that is not in supabase/ yet is just a file:
 *   readFileSync("<scratchpad>/v101_draft.sql", "utf8")   (as template.test.mjs does)
 */
export function migration(n, { repo = process.env.FC_REPO ?? "E:/NinenineProject/fcnext" } = {}) {
  const prefix = `v${n}_`;
  const dir = join(repo, "supabase");
  const here = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".sql"));
  // Sessions share the working tree: two files with one number means two
  // people claimed it. Say so rather than test whichever sorts first.
  if (here.length > 1) throw new Error(`more than one v${n} in supabase/: ${here.join(", ")}`);
  if (here.length) return readFileSync(join(dir, here[0]), "utf8");

  const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" });
  const log = git("log", "--all", "--diff-filter=D", "--name-only", "--format=%H", "--", `supabase/${prefix}*.sql`)
    .split("\n").map((s) => s.trim()).filter(Boolean);
  const commit = log.find((s) => /^[0-9a-f]{40}$/.test(s));
  const path = log.find((s) => s.startsWith("supabase/"));
  if (!commit || !path) throw new Error(`no v${n} in supabase/ or in its history`);
  return git("show", `${commit}^:${path}`);
}
