# Security headers and a Content-Security-Policy for this site

As of 2026-10-01, production sends only Vercel's HSTS. There is no CSP,
frame protection, `nosniff`, Referrer-Policy or Permissions-Policy. The docs
for this Next version are in
`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
and `03-api-reference/05-config/01-next-config-js/headers.md`.

## Why no nonces

A nonce-based CSP makes **every page dynamic**: nonces need a fresh value per
request, which the docs say is incompatible with static pages, ISR and CDN
caching. On this site that would undo the static pages and multiply the
Vercel bill. So we use a CSP without nonces, set in `next.config.ts`
`headers()`. `script-src` then has to allow `'unsafe-inline'` for Next's
inline RSC scripts, and it still:

- blocks scripts from any other origin;
- stops the site being framed (`frame-ancestors`);
- stops `<object>`/`<embed>` and `<base>` tricks;
- keeps images, connections and frames to a known list, which also blocks
  tracking pixels from member-supplied URLs.

`experimental.sri` (hash-based, keeps pages static) is experimental. Revisit
it when it is stable.

## The header set

The origins below come from the code (2026-10-01). Re-derive them before
shipping:
`grep -rhoE "https?://[a-zA-Z0-9.-]+\.[a-z]{2,}" app components lib data | sort | uniq -c`.

```ts
// next.config.ts
const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";            // https://<ref>.supabase.co
const realtime = supabase.replace(/^https:/, "wss:");
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",                                  // Next's inline RSC scripts
  "style-src 'self' 'unsafe-inline'",                                   // inline styles from React, Radix, motion
  `img-src 'self' data: blob: ${supabase} https://img2.finalfantasyxiv.com https://lds-img.finalfantasyxiv.com`
    + " https://v2.xivapi.com https://ffxivcollect.com https://cdn.discordapp.com https://*.googleusercontent.com https://i.ytimg.com",
  "font-src 'self'",                                                    // next/font self-hosts
  `connect-src 'self' ${supabase} ${realtime} https://universalis.app`,
  "frame-src https://discord.com https://www.youtube-nocookie.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const security = [
  { key: "Content-Security-Policy-Report-Only", value: csp },          // step 1; becomes Content-Security-Policy in step 3
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },                            // for old browsers; frame-ancestors is the real one
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
];

// in nextConfig:
poweredByHeader: false,
async headers() {
  return [
    { source: "/:path*", headers: security },
    // ...the existing week-long Cache-Control rules stay as they are
  ];
},
```

Notes:
- `connect-src` covers the REST, auth, storage and realtime (`wss:`) calls
  to Supabase.
- If the sign-in flow ever opens a popup, keep `same-origin-allow-popups`.
  Supabase OAuth redirects rather than using a popup today.
- `https://*.googleusercontent.com` is there for Google sign-in avatars.
  `i.ytimg.com` is for YouTube thumbnails, if any are shown outside the
  iframe. Drop whatever the report-only step shows is unused.
- OG image and API routes can also send `X-Robots-Tag: noindex`, matching
  the site's noindex. Check that Discord still unfurls afterwards.

## Rolling it out

1. **Report-only first.** Ship `Content-Security-Policy-Report-Only`.
   Violations then appear in the browser console without breaking anything.
2. **Walk the site.** Run the fc-ui screenshot script across the main pages
   at a phone and a desktop size, signed out and signed in (`--cookies`). It
   prints each violation it sees ("security … violates the following
   Content Security Policy …"):
   ```bash
   node .claude/skills/fc-ui/scripts/shoot.mjs <base>/ <base>/members <base>/gallery <base>/party <base>/profile <base>/contest --sizes 390x844,1280x800
   ```
   Also open a gallery post, a party with a YouTube link, the Discord card,
   and the market tab (it calls Universalis). Add what is legitimate; decide
   about the rest. A member-supplied image URL from an unknown host is
   exactly what the policy is meant to stop, so fix the data or the upload
   path rather than widening `img-src` to `https:`.
3. **Enforce.** After a clean walk, and a few days with no reports from
   members, rename the header to `Content-Security-Policy`.
4. **Verify in production:**
   `curl -sI https://<site>/ | grep -iE "content-security|x-frame|x-content|referrer|permissions"`.

A `report-to` endpoint is possible (a route handler that logs), but each
report is a function run on the bill. The console walk is enough at this
size.

## On Cloudflare (OpenNext)

`next.config.ts` headers apply to what the Worker renders. Static files
served from the ASSETS binding may skip them, so mirror the security headers
in `public/_headers`. The `cloudflare` branch already has one, for
Cache-Control. Verify with `curl -sI` against the `workers.dev` URL for a
page, a `_next/static` file and an image in `public/`.
