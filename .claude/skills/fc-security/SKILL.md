---
name: fc-security
description: Security and member-privacy guard for the Cafe And SHabu FC site (Next.js 16 + Supabase RLS + a Discord bot + a public GitHub repo). Use whenever a change touches sign-in or sessions, RLS, policies or grants, a new table, column, RPC or trigger, storage uploads, route handlers or server code, the Discord bot, scripts that use the service key, secrets or env vars, rendering what members wrote, personal data (names, Discord ids, birthdays, availability, online times, pictures), headers or CSP, dependencies, or GitHub Actions. Also use for audits and questions like "ตรวจความปลอดภัย", "กันแฮก", "มีช่องโหว่ไหม", "ข้อมูลส่วนตัวรั่วไหม", "RLS ถูกไหม", "ปลอดภัยพอไหม". Prefer it over generic security-review skills in this repo, because it knows where this site's walls are.
---

# Security and privacy for the FC site

The site's JavaScript carries the Supabase anon key, and the browser writes
straight to the database. So the database is the wall: RLS, grants,
self-checking functions and constraints. The code on the page is only a
courtesy. The repo is public, including its history and `data/*.json`. The
server holds the keys that matter: the service role key (past every rule)
and the Discord bot token. Real gil changes hands through prizes and
wallets, and members trust the bell and the bot as the FC's own voice.

Read [references/threat-model.md](references/threat-model.md) once per
session before security work: what we protect, from whom, where each wall
is, and which apparent holes are deliberate.

## Principles

1. **Enforce in the database.** Every rule that matters exists in RLS, a
   grant, an RPC's own checks, a trigger or a constraint. A check that lives
   only in a component is decoration.
2. **Deny by default, grant outright.** Supabase grants ALL to anon and
   authenticated on every new object. Revoke, then grant exactly.
3. **Verify identity on the server.** Use `auth.getUser()` on the server
   (or the signature, or the shared secret). Never trust a user id, amount or
   outcome sent by a client.
4. **Least privilege for keys.** The service key is used in three routes and
   in local scripts, only after authorisation, and never in CI or a client
   file. Modules that read secrets `import "server-only"`.
5. **Privacy by default.** Show strangers the minimum. Nothing
   account-linked goes into the public repo. Hidden stays hidden in the
   database. See [references/privacy.md](references/privacy.md).
6. **Assume it will be called in a loop.** Caps, unique keys and limits
   protect members and the bill.
7. **Verify, don't assume.** A fix is finished when a probe shows the
   attack refused, not when the code looks right.

## Workflows

### A. Review a change (the default, on any diff touching the areas above)

1. `git diff` (or the files in question), and classify what kinds of change
   it contains.
2. Go through the matching sections of
   [references/review-checklists.md](references/review-checklists.md).
3. Run the static scan:
   `node .claude/skills/fc-security/scripts/scan.mjs`. Every hit is a place
   to look, not a verdict.
4. For database changes, the **fc-migration** skill does the rest: the
   template, the rules, and the PGlite harness with attack checks.
5. Report as described below. Fix what is yours to fix in this change.

### B. Audit the whole site

1. **Static:** run `scan.mjs`, then read every route handler in `app/api/`,
   `app/auth/`, and the OG routes (`opengraph-image.tsx`, `lib/*-card*`).
2. **Database:** give the user
   [references/db-audit.sql](references/db-audit.sql) to run in the SQL
   editor, one section at a time, and ask them to paste back the results.
   It reads the catalog only. Also ask them for a screenshot of Supabase's
   Database → Advisors → Security Advisor.
3. **Live:** follow [references/live-probe.md](references/live-probe.md):
   anon and a throwaway member, using rows made for the probe, with
   guaranteed-fail writes and cleanup in `finally`.
4. **Headers:**
   `curl -sI https://cashfc-website.vercel.app/ | grep -iE "content-security|x-frame|x-content|referrer|permissions|strict-transport"`,
   then [references/headers-csp.md](references/headers-csp.md).
5. **Dependencies and CI:** `npm audit --omit=dev`, open Dependabot PRs, and
   the `github-actions-hardening` skill for `.github/workflows/`.
6. **Dashboard settings** the code can't show. Ask the user to confirm:
   - auth providers (Discord and Google only);
   - Site URL and Redirect URLs (only the production domain and localhost);
   - Discord 2FA on admin accounts;
   - secret scanning and push protection on the GitHub repo (free for public
     repos);
   - backups (Pro keeps daily ones);
   - who has access to the Vercel, Supabase and Cloudflare projects.

### C. Fix

- **Code fixes** stay minimal and separate from feature work, in their own
  worktree or branch, because sessions share this tree. Stage only your own
  hunks.
- **Database fixes** become a `supabase/vNN_*.sql` via fc-migration: a PGlite
  dry run with attack checks, then the user runs it, then a live probe, then
  a "vNN has run" commit.
- **Verify** with `npm test`, `npx tsc --noEmit`, a build, and exercising the
  affected feature. Then prove the attack is refused (a probe, a PGlite
  check, or a test in `lib/*.test.ts`).
- **Pushing:** genuine security fixes may go to `main` without asking first.
  Verify, push, then wait for Vercel:
  `gh api repos/ninenarathid/cashfc-website/commits/<sha>/status`. Report
  what was fixed and how it was checked. Everything else waits for the user
  to ask.
- **The repo is public.** A commit message says what the fix does
  ("OG cards fetch pictures only from the site's own storage"), not a recipe
  for the hole, until the fix is deployed. Advisory-driven bumps can name
  the advisory, as `827b5cf` did.

## Reporting findings

Rank the findings and write each one like this:

```
[severity] title
  where:     file:line (or table / policy / bucket)
  scenario:  who could do what, concretely (the kind of attacker from the threat model)
  evidence:  how it was confirmed (probe result, catalog row, code path); or "suspected, not verified"
  fix:       the smallest change that closes it, and where (code / migration / dashboard)
  verify:    how we will know it is closed
```

The severities:
- **critical:** a secret leaks, anyone can write or delete others' data, or
  the auth bypass is live.
- **high:** a member can take or change what isn't theirs, the economy is
  affected, or private data reaches the public.
- **medium:** it needs a verified account or special conditions, or it is
  SSRF or a missing wall with no known path yet.
- **low:** hardening, or information leaks.

Say plainly what was verified and what is only suspected.

Keep open findings out of the repo. It is public, and a list of unfixed
holes in it is a map. Tell the user in chat, and keep track of open items in
your private memory directory, never in committed files or skills.

## Deliberate choices (don't "fix" these without the user)

- Reading is open to everyone, and writing needs a verified character
  (v85). `profiles`, `feedback_*` and `notifications` are exempt on purpose.
- `/admin` pages are public static shells; the data is guarded in the
  database.
- `robots.txt` allows crawling, so crawlers can see the site-wide noindex.
- CI and the pipeline never get the service key.
- The CSP will allow `'unsafe-inline'` scripts rather than use nonces, which
  would make every page dynamic (see headers-csp.md).
