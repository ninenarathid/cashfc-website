# Threat model: what we protect, from whom, and where the walls are

## What is worth protecting

| Asset | Why it matters | Where it lives |
|---|---|---|
| **The service role key** | Bypasses every RLS policy: all data, every write | `.env.local`; Vercel env (moving to Cloudflare secrets); three route handlers; local scripts. Never CI, by decision. |
| **The Discord bot token** | Posts and edits as the bot in the FC's server | Server env, `lib/discord/api.ts` |
| `VERIFY_SECRET`, `DISCORD_SYNC_SECRET`, `DISCORD_PUBLIC_KEY` | Forged character claims; board pokes; bot requests | Server env |
| **Members' personal data** | A Discord identity linked to a character, birthdays, a weekly availability grid (a routine), last online, pictures, private feedback threads, notifications | `profiles`, storage buckets, `feedback_*`, `notifications` |
| **Fairness of the economy** | Real gil changes hands: popoto, rare popoto, the prize draws, wallets, Evercold tickets, contest votes | DB functions, `popoto_rare_switch`, prizes, `wallet_*`, `contest_votes` |
| **Secrets the FC keeps** | Contest author names until results; who the popoto keeper is (even from other admins); drafts | v98 RPCs and column grants; `popoto_keepers` |
| **Admin power** | `is_admin` can edit most things | `profiles.is_admin`, enforced by `is_admin()` in RLS |
| **Trust in the bell and the bot** | Notifications and bot messages are read as coming from the FC | `notifications` (members may insert a few kinds), bot posts |
| **The bill** | Abuse that costs requests, function runs or egress is an attack on a person's wallet | Vercel, Cloudflare, Supabase meters |

## Who might try

1. **Anyone on the internet.**
   - The anon key and the Supabase URL are in the site's JavaScript.
   - The repo is public, including its history and `data/*.json`.
   - They can call every table and RPC that RLS and grants allow, from a
     script, at any rate.
2. **A signed-in account with no character.** Discord and Google sign-in is
   open to anyone, so this account can reach everything granted to
   `authenticated` that the v85 restrictive policies don't cover.
3. **A verified guest** (a proven character outside the FC). They pass the
   v85 gate, but not FC-only checks (`fc_roster`).
4. **A verified member acting in bad faith.** They might farm popoto, stuff a
   ballot, find out a hidden contest author, spam the bell, impersonate
   someone through their display name, stalk someone through availability or
   last-online data, or upload something nasty.
5. **A compromised account,** a member's or an admin's Discord. Admins
   should have Discord 2FA.
6. **Supply chain:** npm, pip, and GitHub Actions. Dependabot runs weekly,
   and actions are pinned by SHA.
7. **Our own tooling:**
   - A script that prints a key.
   - A local OpenNext build, which folds `.env.local` (service key included)
     into `.open-next/`. Never deploy one.
   - A secret pasted into a commit or a memory file.

## Trust boundaries, and what enforces each

| Boundary | Enforced by | Weak if |
|---|---|---|
| Browser → Supabase (REST, RPC, storage, realtime) | RLS, grants (revoked and granted outright), RPCs that check `auth.uid()`, triggers that pin server-only columns, constraints | A table is left with default grants; a `security definer` function trusts its arguments; a bucket has no size or type limits |
| Browser → Next route handlers (`app/api/*`) | `auth.getUser()` via the cookie client; input validation; secrets only after authorisation | Client-sent user ids are trusted; there is no origin check on a state-changing POST; raw errors are echoed |
| Discord → `/api/discord/interactions` | Ed25519 signature over timestamp + raw body | The timestamp's age isn't checked (replay) |
| Database cron/trigger → `/api/discord/board` | `x-sync-secret` compared in constant time | The secret leaks (it is kept in `discord_config`, revoked from the API roles) |
| Server → the internet (OG renderers, Lodestone verify, Universalis) | Host allowlist, https, timeouts, size caps | A stored URL is fetched as-is (SSRF, bandwidth) |
| Storage → browser | Public buckets serve files from `*.supabase.co`, another origin, so an uploaded SVG or HTML cannot reach the site's session | Types aren't limited (a phishing page hosted under the project's URL) |
| GitHub Actions → repo | Pinned actions, `permissions`, no untrusted interpolation, no service key | A floating pip version runs in a job holding secrets and a write token |
| Admin UI → data | `is_admin()` in RLS and RPCs (the `/admin` pages themselves are public static shells) | A check exists only in the page |

## Deliberate choices (not findings)

- **Reading is open; writing needs a verified character** (v85). Four
  exceptions keep a way out for someone stuck:
  - `profiles` (where the claim happens);
  - `feedback_threads` and `feedback_messages` (to reach the admins);
  - `notifications` (marking your own as read).
- **The site is noindex, but `robots.txt` allows crawling** so crawlers can
  see the noindex (app/robots.ts explains).
- **`/admin` pages are static and public.** Only the data behind them is
  guarded, in the database.
- **The pipeline and CI never get the service key.**
- **Security fixes may be pushed to main without asking** (verify first,
  report after). Other pushes need the user.
