# Probing the live database safely

PGlite shows what a migration's SQL does. Only the live project shows what
PostgREST, the storage API, the real grants and the tables as they stand
actually allow. Probe after every migration that touches access, and when
auditing.

## The ground rules

- **Touch only rows you create for the probe.** Make them with the service
  key, and delete them in a `finally`. Never read, change or delete a real
  member's rows to prove a point.
- **Don't read personal data to check exposure.** Whether anon can read a
  column is a catalog question: `db-audit.sql` section 5 answers it without
  selecting anybody's value.
- **Never print a key or a token.** Scripts read `.env.local`
  (`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Keep them in the scratchpad, not the
  repo.
- **Tell the user** what was created and what was deleted.

## Proving a write is refused without writing anything

Postgres checks grants, then RLS `WITH CHECK`, **before** NOT NULL and CHECK
constraints. Foreign keys are checked after all of those. (Verified on
Postgres 18 via PGlite, 2026-10-01: a refused user got 42501 even for a row
that also broke NOT NULL; an allowed user got 23502 for the same row.)

So send a row that is certain to break a constraint:

| Answer | Meaning | Written? |
|---|---|---|
| `42501` (permission denied, or "violates row-level security policy") | Refused. This is what you want. | No |
| `23502` (not null), `23514` (check), `23503` (foreign key) | **RLS let it through.** Only the constraint stopped it. | No |
| `201` / `204` | It was written. Clean it up at once. | Yes |

Choose the constraint that will fail: an explicit `null` in a NOT NULL
column, a body over its length check, or a foreign key to an id that cannot
exist (`-1`, or a random uuid). **BEFORE triggers run before RLS,** so read
the table's triggers first (in migration history, or ask the user): a
trigger with side effects would still fire.

For UPDATE and DELETE, point at a row you created for the probe. A refused
update touches 0 rows with a 200 and `[]`; an allowed one returns the row.

## As anon

```js
const h = { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" };
const r = await fetch(`${URL}/rest/v1/party_comments`, { method: "POST", headers: h,
  body: JSON.stringify({ party_id: -1, author_id: crypto.randomUUID(), body: null }) });
console.log(r.status, (await r.json().catch(() => ({}))).code);   // want 401/403 with 42501
```

RPCs: `POST /rest/v1/rpc/<fn>` with `{}` or harmless arguments. The answer
should be 401 or 42501, or the function's own "not signed in" exception.

## As a throwaway member

Email and password sign-in is disabled on this project, so a probe user
signs in through a magic link minted with the service key:

1. `POST /auth/v1/admin/users` `{ email: "probe-<random>@example.com",
   email_confirm: true }` (service key). Keep the returned `id`.
2. `POST /auth/v1/admin/generate_link` `{ type: "magiclink", email }`
   (service key). On this project's GoTrue the token is at the **top level**:
   `link.properties?.hashed_token ?? link.hashed_token`. Reading only
   `properties` silently yields no session, and every check then runs as
   "Bearer undefined".
3. `POST /auth/v1/verify` `{ type: "magiclink", token_hash }` (anon key)
   returns a real `access_token`. Use it as `Authorization: Bearer`, with
   `apikey: ANON`.
4. **To be a verified member,** set the throwaway's profile with the service
   key: `character_id` from 900000100 upwards (fake; 900000001–8 are the
   contest sample accounts), `character_name`, `character_verified_at =
   now()`. **For FC-only paths,** a `fc_roster` row with that id, deleted
   afterwards.
5. **`finally`,** in reverse order: the rows the probe created, its storage
   objects, any `notifications` for or from it, the `fc_roster` row, and
   last `DELETE /auth/v1/admin/users/<id>`, which cascades the profile.

Check every step's HTTP status and stop on an unexpected one: a probe that
silently ran as the wrong person proves nothing.

**What to cover for a new table or RPC,** as the throwaway:
- own rows;
- another member's rows (a second throwaway, or a service-key fixture row
  with some other author);
- the unverified state (clear `character_verified_at`);
- hidden or draft data;
- forged server-only columns;
- storage paths outside your own folder.

## Driving the signed-in UI (screenshots)

Set the session as the `@supabase/ssr` cookie before loading the page:

- **name:** `sb-<project-ref>-auth-token`, where the ref is the subdomain of
  `NEXT_PUBLIC_SUPABASE_URL`.
- **value:** `"base64-" + base64url(JSON.stringify(verifyResponse))`.
- **chunking:** split with `createChunks` from
  `node_modules/@supabase/ssr/dist/main/utils/chunker.js` when it is long.
  One chunk has been enough so far.

Write `[{ "name": …, "value": …, "url": "http://localhost:3100" }]` to a
scratchpad JSON file, then:
```bash
node .claude/skills/fc-ui/scripts/shoot.mjs http://localhost:3100/profile --cookies <scratchpad>/cookies.json
```
Delete the cookie file and the throwaway user afterwards. The same cookie
works against production, but prefer localhost.
