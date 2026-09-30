---
name: fc-migration
description: Write, dry-run and ship a Supabase database change for the Cafe And SHabu FC site the way this repo does it — a numbered supabase/vNN_<phrase>.sql that the user pastes into the SQL editor, tested first against an in-memory Supabase-shaped Postgres (PGlite) with row-level-security checks as anon, members, an unverified account and an admin, then probed live and closed with a "vNN has run" commit. Use for ANY schema, RLS, grant, RPC, trigger, index or storage-bucket change, including when a feature plan only implies one ("members can now save X", "admins should be able to…", "count how many…"), and for Thai requests like "เพิ่มตาราง", "เพิ่มคอลัมน์", "แก้ policy", "เขียน migration", "RLS", "ฐานข้อมูล".
---

# Database changes for the FC site

The browser writes to Supabase directly with the anon key, which ships in the
site's JavaScript. So the database is the only wall there is: a rule that lives
in a component is a rule anybody with the browser console may ignore. Every
migration here is a security change first and a schema change second.

Three facts shape the workflow:

- **The user runs the SQL, by hand, in the Supabase SQL editor.** There is no
  Supabase CLI, psql or Docker on this machine, and the app never holds the
  database password. Never ask for it.
- **A file in `supabase/` is a migration that has not run yet.** Once the user
  runs it, a commit titled `vNN has run` deletes it (see `supabase/README.md`).
  So the live database, not the repo, is the description of what exists; old
  migrations are read back from git history.
- **Supabase grants ALL on every new table, sequence and function to `anon` and
  `authenticated` by default.** Protection comes from revoking and granting
  outright, never from assuming a fresh table is closed.

## 1. Before writing

1. **Pick the number:** one more than the highest that ever existed, not than
   what is in the folder:
   ```bash
   git log --all --name-only --format= -- supabase/ | sed -nE 's#^supabase/v([0-9]+)_.*#\1#p' | sort -n | tail -1
   ls supabase/   # an uncommitted file from another session may already hold the next number
   ```
2. **Check what is still pending.** Any `vNN_*.sql` besides `schema.sql` in
   `supabase/` has not been run. Do not build on its objects without asking the
   user whether they have run it since.
3. **Read the current definition of whatever you touch.** Find the migrations
   that created or changed it, and read them from history:
   ```bash
   git log --all --format='%h %s' -S 'contest_entries' -- supabase/   # which migrations mention it
   git log --all --diff-filter=D --format=%h -- 'supabase/v98_*'       # the "v98 has run" commit that deleted it
   git show <that>^:supabase/v98_dressed_for_the_season.sql            # the file as it was when it ran
   ```
   (The harness's `migration(98)` does the same lookup.) A few early files
   (v26–38, v40–44, v62–72) were never committed. What they did exists only
   in the live database, so ask the user rather than guess.
   Also grep `components/` and `lib/` for `.from("<table>")` and `.rpc("<fn>")`
   to see how the site reads and writes it today.
4. **Decide what the page does before the file has run.** Where practical, code
   ships first and degrades quietly (for example, the bell asks for its extra
   column separately, so it works whether or not v100 has run). Say in the
   commit message what needs the migration.

## 2. Writing the file

Start from [references/template.sql](references/template.sql). The house style:

- Name it `supabase/vNN_<short_plain_phrase>.sql`, a phrase about what changes
  for people: `v96_a_quieter_bell.sql`, `v99_a_word_about_a_look.sql`.
- Open with `-- vNN — <phrase>`, then "Run this once in the Supabase SQL editor,
  after vMM. Running it again is safe.", then prose that explains why: who asked,
  what goes wrong without it, and why each unusual choice was made. The repo's
  comments explain reasons rather than restating code; match that.
- **Make it re-runnable**, because the SQL editor gets re-run: `create table if
  not exists`, `add column if not exists`, `create index if not exists`,
  `drop policy if exists` before `create policy`, `drop trigger if exists`
  before `create trigger`, `create or replace function`, `on conflict do
  nothing` for seed rows.
- Finish with `notify pgrst, 'reload schema';` and a **"What it should say
  afterwards"** comment block: read-only queries plus the output to expect, so
  the user can confirm it ran.

### The rules that keep members safe

Each rule exists because breaking it was possible here, not in theory:

1. **RLS on every table.** `alter table public.t enable row level security;`
   Then a policy per command: `for select`, `for insert`, `for update`,
   `for delete`, each with an explicit `to anon` or `to authenticated`.
2. **Grant outright.** `revoke all on public.t from anon, authenticated;` then
   grant exactly what each role needs. A column-level `grant update (caption)`
   only protects the other columns *after* that table-level revoke. Grant
   `usage` on the id sequence only if members insert.
3. **Verified character to write.** Every table members write to also gets the
   v85 restrictive trio `<t>_named_write`, `<t>_named_edit` and `<t>_named_drop`,
   requiring `(select public.verified_character()) or (select public.is_admin())`.
   They are restrictive (ANDed with the ownership policies) and per command:
   a restrictive `for all` would also hide the table from readers. Add all
   three even when there is no UPDATE grant today. A later grant then can't
   open a hole, and db-audit.sql checks for all three. The template has the
   exact SQL.
4. **Functions:**
   - Use `security definer` only when the function must read past RLS, and
     then always `set search_path = public`.
   - In a function only members may call, check `auth.uid()` and raise if it
     is null. A function anon is meant to call (a public count, like v98's
     `contest_tally`) must return nothing private: counts, never who.
   - Validate every argument (lengths, array sizes, ids), because the
     function is callable straight from the browser.
   - Postgres grants EXECUTE to PUBLIC, and Supabase adds anon on top. For
     anything anon must not run: `revoke execute on function public.f(args)
     from public, anon;` then `grant execute ... to authenticated;`.
   - Mark read-only helpers `stable`.
5. **Columns only the server may set** (a verified timestamp, an approval,
   which look a notice is about, a tally) have two ways in:
   - Nobody in a browser may set it: leave it out of the column grant, and a
     browser value is refused with 42501.
   - Some browser users (admins) may set it: grant it, and add a trigger that
     throws away everybody else's value. That means `new.col := null` on
     insert and `new.col := old.col` on update when
     `current_user in ('anon','authenticated') and not is_admin()` (v100's
     `notification_look_kept`, and the template's `fc_things_kept`). Keep such
     a trigger `security invoker`, or `current_user` is always the owner.
6. **Hidden means hidden in the database.** If something is secret until a
   moment (contest author names, a draft), withhold the columns from
   anon/authenticated and serve them through a `security definer` RPC that
   blanks them until the moment (v98's `contest_looks`). Leaving them off the
   page is not hiding them.
7. **Views** bypass RLS unless created `with (security_invoker = true)`.
8. **Storage buckets:**
   - Decide `public` on purpose.
   - Set `file_size_limit` and `allowed_mime_types` to the image types the
     page makes: webp, jpeg, png, avif. Never `image/svg+xml` for member
     uploads, because an SVG can carry script.
   - Scope object policies to the bucket and to the uploader's own folder:
     `(storage.foldername(name))[1] = ...`.
   - Add no list/select policy the page does not need, since listing leaks
     pending files.
9. **Abuse caps live in the schema:**
   - Text length checks, such as `char_length(body) <= 300`.
   - Unique keys for once-per-day or once-per-thing actions.
   - Counts enforced inside the RPC.

   A client-side limit is a suggestion.
10. **Toggles (a like, a cheer, a vote) are taken back by their owner only.**
    The template's "admins may delete anything" is right for posts and wrong
    here. A take-back sent as `.delete().eq("thing_id", id)` by an admin would
    remove everybody's rows for that thing. Make the delete policy own-only,
    or go through an RPC as v98's `contest_vote` does. Admins clean up with
    the service key.

### The rules that keep it fast

- Index every foreign-key column and every column a policy, filter or
  `order by` uses. Use partial indexes (`where col is not null`) for sparse
  columns.
- Wrap per-row calls as `(select auth.uid())` and `(select public.is_admin())`,
  so Postgres evaluates them once per statement, not once per row.
- Serve counts and leaderboards from an RPC or a maintained counter, not by
  shipping rows to the browser to count.
- Add a table to the `supabase_realtime` publication only if a page subscribes
  to it. Realtime connections are billed, and RLS applies to them too.

## 3. Dry-run it with PGlite

Do this before handing the file over, every time.

```bash
SP="<scratchpad>/pgtest"; mkdir -p "$SP" && cd "$SP" \
  && npm init -y >/dev/null && npm i @electric-sql/pglite@0.5 \
  && cp E:/NinenineProject/fcnext/.claude/skills/fc-migration/scripts/*.mjs . \
  && node example.test.mjs    # should print 12 passed: v98–v100 replayed from git
```

The shell tool resets the working directory between calls, so start each
later command with `cd "$SP" &&`.

Then write `vNN.test.mjs` beside it. Shape it like `example.test.mjs`
(replaying history), or like `template.test.mjs` (a draft read with
`readFileSync`, plus `MIGRATION_FILE` so mutate.mjs can swap it). What the
harness gives you:

- **`supabaseLike({ extra })`:** roles, Supabase's default grants,
  `auth.uid()`, `profiles`, `is_admin()`, `verified_character()`,
  `fc_roster`, a storage schema, and six people in `U` (character ids in
  `CHAR`):
  - `admin`, `m1`, `m2`;
  - `guest`: verified, but not in the FC;
  - `unver`: a claimed character that was never proved;
  - `nochar`: signed in, no character.
- **`migration(n)`** reads `supabase/vN_*.sql`, or reads it back from history
  when it has already run. Replay the earlier migrations your file builds on.
  It refuses to guess if two files share a number.
- **`extra`** holds older tables that no replayable file creates, written by
  hand "as they stand live". Write the **worst case**, such as a policy that
  lets a member insert anything, so your file is shown to protect itself.
- **The helpers:**
  - `t.runTwice(sql)` runs the file twice, always as the SQL editor.
  - `t.as(who, sql, params)` runs as `"anon"`, `"service"`, `"super"` or a
    `U` id, and never throws.
  - `t.sql(text, params)` sets up rows or reads back as the editor, and
    throws, because a check over missing rows lies.
  - `refused(r)`: a 42501, or an update or delete that touched 0 rows.
  - `reachedConstraints(r)`: got past grants and RLS, and was stopped only by
    a constraint.

**The minimum set of checks:**
- The file runs twice.
- Its **"What it should say afterwards" queries,** run through `t.sql()`, give
  what the comment promises. Expectations written from memory are often
  wrong; for example, `role_table_grants` doesn't list column-level grants.
- Anon can read what it should, and nothing else.
- Anon cannot write.
- A member writes their own rows, and cannot write someone else's or write in
  someone else's name.
- `unver` and `nochar` are refused every write.
- An admin can do the admin things.
- Server-only columns are refused or ignored when a browser sends them.
- Hidden data stays hidden through every path: table, RPC and storage listing.
- Functions refuse anon where they should.
- Length and uniqueness caps hold.
- Every zero-row "refused" update or delete is paired with a `t.sql()`
  read-back showing the target row is still there and unchanged. Zero rows
  also happens when the row never existed.

**For anything security-critical, prove the checks bite.** List breaks in a
`vNN.mutations.mjs` (see `template.mutations.mjs`), then run
`node mutate.mjs <file.sql> vNN.test.mjs vNN.mutations.mjs`. Every break
must make a named check FAIL. The template's list catches 10 of 10.

Report the tally, and paste any FAIL lines with what you changed.

PGlite is real Postgres but not Supabase. PostgREST, the storage API (upsert,
owner columns), realtime and anything the live tables gained since your stubs
still need the live probe in step 5.

## 4. Hand it to the user

Tell them, in Thai when they write Thai:
- The file path, and what it changes, in two or three lines.
- Which migration it must follow.
- Whether the deployed code needs it yet.
- The "what it should say afterwards" queries to run.
- The dry-run tally.

Then wait: they run it themselves. Do not put SQL for panel-owned values in a
migration. Rare popoto odds, prizes and switches are changed in the admin
panel, or directly with the service key when the user asks.

## 5. After they say it ran

1. **Probe it live** as anon and as a throwaway member. The procedure, with its
   cleanup, is in the fc-security skill:
   [live-probe.md](../fc-security/references/live-probe.md).
2. **Commit `vNN has run`**, deleting only that file. Other sessions share this
   working tree, so stage just the deletion: `git rm supabase/vNN_<phrase>.sql`
   (which deletes and stages that one path), then check that
   `git diff --cached --stat` shows nothing else. Never `git add -A`.
3. Pushing follows the usual rule: only when the user asks, except genuine
   security fixes (verify, push, then report).
