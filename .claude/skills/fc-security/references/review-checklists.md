# Review checklists, by kind of change

Find the kinds your change touches and go through those. Each line is a
question with a known-good answer.

## Database: table, column, RPC, trigger, bucket

Follow the **fc-migration** skill. It has the rules, the template and the
PGlite harness. The questions it answers:

- Is RLS on, with a policy per command and `to anon` or `to authenticated`
  spelled out?
- Were anon and authenticated revoked outright, then granted exactly what
  they need, including column lists?
- If members write here, does it have the v85 restrictive trio?
- Do security definer functions `set search_path`, check `auth.uid()`,
  validate arguments, and revoke EXECUTE from `public, anon` where anon has
  no business calling them?
- Are server-only columns pinned by a trigger?
- Is hidden data hidden in the database, not just on the page?
- Does the bucket have a size limit, an image-only type list, and
  folder-scoped policies with no broad listing?
- Are there caps (length checks, unique keys per day or per thing)?

## A route handler (`app/api/**/route.ts`) or server code

- **Who is calling?**
  - For a member: `const { data: { user } } = await supabase.auth.getUser()`
    through the cookie client (`lib/supabase/server.ts`). Never a user id
    sent by the client.
  - For Discord: the signature.
  - For the database cron: the shared secret, compared with
    `timingSafeEqual`.
- **Is the input checked?**
  - Ids match `^\d+$` and fit their type.
  - Strings have a maximum length.
  - Enums come from a fixed list.
  - A value is never pasted into a PostgREST URL unchecked, because
    `eq.${id}` with `id = "1&select=..."` rewrites the query. Validate it, or
    use the client's builder.
- **Is the service key used only after authorisation,** and only for the
  one write that needs it?
- **Does the module read secrets?** Then `import "server-only";` at the top,
  so a client import fails the build instead of shipping the secret.
- **Errors:** a generic message to the caller; the details go to the server
  log. No `error.message` or env names in the response.
- **Can it be called in a loop?**
  - Anything that fetches the outside world (Lodestone) or costs money
    needs a limit: per user per minute (a table or a unique key), or a
    cheap check before the expensive one.
- **Does a state-changing POST depend on cookies?** Route handlers get no
  automatic CSRF check (Server Actions do). Compare
  `request.headers.get("origin")` with the site's origin (`lib/site.ts`),
  or require a JSON content type.
- **Does it read the session on the server?** Then its path goes in
  `proxy.ts`'s matcher, or members get signed out.

## The server fetching a URL that came from data (OG cards, verification, imports)

- An allowlist of hosts:
  - the project's Supabase storage origin (`NEXT_PUBLIC_SUPABASE_URL`);
  - `img2.finalfantasyxiv.com` and `lds-img.finalfantasyxiv.com`;
  - `cdn.discordapp.com`;
  - `v2.xivapi.com`.

  Anything else is skipped, never fetched.
- `https:` only; no userinfo; no IP-literal hosts; no ports.
- `redirect: "manual"` (or re-check the final URL against the allowlist).
- A timeout (`AbortSignal.timeout`), a size cap (check `content-length`,
  and stop reading past the cap), and a content-type check (`image/*`).
- Prefer the smallest version (a thumbnail) over the original.

## Showing something a member wrote

- Render it as React text. Never `dangerouslySetInnerHTML` for user
  content, not even "sanitised".
- Links go through `Linkify`: `http(s)` only, with
  `rel="noopener noreferrer"` (add `nofollow ugc` for member-written
  links). React 19 blocks `javascript:` URLs, but don't rely on it for
  other schemes.
- YouTube only through `lib/youtube.ts`: an id regex, a host allowlist, and
  `youtube-nocookie` embeds with `loading="lazy"`.
- Picture URLs only from our storage, or hosts we know. A free-form URL in
  an `<img>` is a tracking pixel that reports every viewer's IP to a
  stranger. Store the storage path, not a URL (v98 does), or check the URL
  in the database.
- Display names are chosen by members. Wherever impersonation would matter
  (admin replies, prize threads), show the verified character name, or a
  badge.

## Uploads

- The bucket enforces the limits (size, image types without SVG). The
  client's checks are only a courtesy.
- Re-encode in the browser (canvas to WebP), which also strips EXIF
  location. Don't keep the original unless there is a reason. `party-photos`
  keeps originals with the uploader's content type.
- Paths come from the uploader's own folder (`<uid>/…`, or v98's hashed
  folder), never from a client-chosen path elsewhere.
- Deleting the row that owns a file deletes the file too. A public file
  outlives its row.

## Notifications, mentions and anything that reaches another member

- Which kinds may a member insert themselves? Keep that list short, and pin
  the columns only the server may set (v100's pattern).
- Bodies are capped (`left(body, 140)` in triggers).
- Honour the mute groups (v96). No member-authored links in notices.
- Mentions resolve against the roster, and `@everyone` reaches only the
  party.

## The economy (popoto, rare popoto, prizes, wallets, contest votes)

- Outcomes are decided in the database (RPCs), never by a number the
  browser sends.
- Odds live in rows, changed through the admin panel.
- Once-per-day and once-per-thing limits are unique keys. Claims are
  idempotent.
- Every movement of value is written by a trigger or an RPC into something
  auditable (`audit_log`).
- Tests for the pure parts: `lib/prizes.test.ts`, `lib/wallet.test.ts`.

## Admin features

- Enforced by `is_admin()` in RLS and RPCs. Hiding a button is only a
  courtesy.
- Destructive actions go through ConfirmDialog, and are logged.
- The popoto keeper stays secret, even from other admins. Don't expose
  `popoto_keepers` through a view, a join or an error.

## Secrets, env and scripts

- Secrets never take a `NEXT_PUBLIC_` prefix. `.env*` is gitignored; keep
  it that way.
- Scripts read `.env.local`, never print a key, and keep their output free
  of tokens.
- Never deploy a local OpenNext build (it bakes `.env.local` into
  `.open-next`). Delete `.open-next`, `.wrangler` and `.next` after local
  tests.
- Never write a secret into a memory file, a commit, an issue or a skill.

## Dependencies and CI

- `npm audit --omit=dev`. Check the GitHub advisories for `next`,
  `@supabase/*` and `react` when bumping.
- `next`, `react` and `react-dom` are pinned exactly. Keep them that way,
  and read the changelog when bumping.
- Workflows: actions pinned by SHA, the least `permissions`, no
  `pull_request_target`, no `${{ github.event.* }}` inside `run:`.
  Pin pip versions in jobs that hold secrets. Use the
  `github-actions-hardening` skill for any workflow change.

## The Discord bot

- Check the signature, and also the timestamp's age (reject anything over 5
  minutes old). Fail closed when the key is missing.
- Re-check everything in the database (verified character, party rules),
  because a button is just a request.
- Ephemeral replies never contain raw errors.
