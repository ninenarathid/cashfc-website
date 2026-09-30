---
name: fc-perf
description: Make the Cafe And SHabu FC site fast for members and cheap to run. Covers page speed on phones (LCP, INP, CLS), JavaScript and RSC payload size, Next 16.3 rendering, caching and prefetch choices, Supabase query and realtime cost, images and fonts, and hosting usage (Vercel's limits now, Cloudflare Workers next). Use when a page feels slow or janky; before and after adding data fetching, a heavy component, charts, realtime, images or a new route; when a bill, quota or usage number comes up; and for Thai requests like "ช้า", "โหลดนาน", "กระตุก", "หน่วง", "ทำให้เร็วขึ้น", "performance", "ค่า Vercel", "เกินโควต้า", "bundle ใหญ่".
---

# Performance for the FC site

Performance means two things here, and both count:

1. **Speed for members.** They are mostly on phones in Thailand. A tap must
   answer at once, and a page must be readable fast.
2. **Cost for the owner,** who thinks in baht per month.
   - Vercel Hobby was over its limits in September 2026: 1.2M of 1M CDN
     requests, and 16.3 of 10 GB Fast Origin Transfer.
   - The site is moving to Cloudflare Workers through OpenNext (branch
     `cloudflare`).
   - Supabase is on Pro.

   Every request, function run, prefetch and byte of egress is on a bill.
   Before advising on plans or quotas, ask the user for current usage
   screenshots. Estimates from code were wrong once.

## How to work

- **Measure, fix the biggest thing, measure again.** Report numbers before
  and after. A change that "should be faster" and was never measured is not
  finished.
- **Measure production builds only:** `next start` or the live site, never
  `next dev`.
- **Keep the architecture's good shape.** Pages that are the same for
  everyone are static and served from the CDN, built on the server from
  `data/*.json`. The per-member parts load in the browser from Supabase,
  under RLS. Don't make a static page dynamic to personalise it; personalise
  in the browser.
- **What crosses into the browser is paid for on every view and every
  prefetch.** That covers client component props, the RSC payload and client
  imports of JSON. Trim it on the server.
- **The database does the counting.** Never download a table to compute a
  top 3.
- **Keep Cloudflare in mind.** No new `fs` reads or `sharp` at request time,
  no Node-only middleware, no hard-coded `vercel.app` URLs.

## Budgets

Measured on a production build. Today's numbers are in
[references/baseline-2026-10.md](references/baseline-2026-10.md).

| What | Target | Today (2026-10-01) |
|---|---|---|
| LCP, p75 mid phone | ≤ 2.5s (aim 2.0) | **30.9 s** on `/` (Lighthouse mobile, simulated) |
| Page weight | ≤ 1.5 MB on a first visit | **12.7 MB** on `/`, mostly pictures |
| INP (TBT as a lab proxy) | ≤ 200ms (aim 100) | TBT 140 ms on `/` |
| CLS | ≤ 0.1 (aim 0.05) | 0 on `/` |
| JS per page, gz, first visit | ≤ 300 KB | 479–581 KB |
| RSC per page, raw | ≤ 100 KB normal, ≤ 300 KB `/members` | 138–258 KB; `/members` 800 KB |
| One change adds | ≤ 10 KB gz JS to any page, or a stated reason | |
| Supabase | Every query on a growing table has `.limit()` or a bounded filter. A realtime event costs 2 queries or fewer per open tab. | Whole-table top-N reads; about 10 queries per party event |
| Fonts | no new weights (10 woff2 files, 139 KB preloaded) | |

## Tools ([references/measure.md](references/measure.md) has exact commands)

- **Payload per route:**
  `node .claude/skills/fc-perf/scripts/payload.mjs <base> / /members …`
  gives HTML, RSC, JS and CSS, raw and gzipped, plus what each page adds.
- **Route table:** `next build` prints ○ static, ● SSG, ƒ dynamic and the
  revalidate columns. Since v16 it prints no bundle sizes; use
  `npx next experimental-analyze` (Turbopack) for those.
- **Lighthouse (mobile):** run it three times against `next start` or
  production with the installed Chrome, and take the median.
- **Database:** [references/db-perf.sql](references/db-perf.sql) is read-only.
  The user pastes it into the SQL editor and sends back the result: top
  queries, unindexed foreign keys, sequential scans, unused indexes, RLS
  policies that call `auth.uid()` per row, and realtime tables.
- **Usage:** Vercel's Usage page, Supabase's Usage page, and the Cloudflare
  dashboard. Ask the user for them.

## Where the wins are ([references/playbook.md](references/playbook.md))

Ranked for this codebase, with the patterns to use:

0. Pictures first. The home page downloads 12.7 MB: announcement posters are
   2+ MB PNGs, and thumbnails are made at 1200px for strips that draw them
   small. Re-encode at upload, add a small size, and render only the visible
   slide.
1. Stop shipping the roster: trim client props on `/members`, the home page
   and `everyone()`.
2. Prefetch on purpose: the nav prefetches about 340 KB gz of other pages on
   every view.
3. Make member and party pages cacheable: move the `?v=` share stamp onto
   the OG image URL.
4. Split the i18n dictionary per language: 46 KB gz of both languages is in
   every page.
5. Lazy-load recharts (112 KB gz), the date picker, the command palette, and
   motion in Nav.
6. Serve top-N and counts from RPCs instead of whole-table reads.
7. Realtime and polling: refetch what changed, not everything, and use one
   shared session and profile instead of six `getUser()` and four profile
   reads per load.
8. Redeploy churn: a data commit every 4 hours redeploys the site and
   cold-starts every cache.
9. OG cards: thumbnails not originals, memoised seeds, no `sharp` at request
   time.
10. Images at the size they are shown; guide maps as WebP or AVIF; fonts
    trimmed.

## Next 16.3 facts that change the answer ([references/next16-caching.md](references/next16-caching.md))

- **The project uses the older caching model** (`cacheComponents` is not
  set). `export const revalidate = N` (a literal) makes ISR, and `fetch` is
  not cached unless asked.
- **Adopting `cacheComponents`** (`"use cache"`, `cacheLife`, `cacheTag`,
  partial prerendering) is a migration, not a flag. Route `dynamic` and
  `revalidate` exports then error, and edge runtime is unsupported. Check
  OpenNext Cloudflare support before proposing it.
- **`revalidateTag(tag, "max")` needs its second argument now.** `updateTag`
  and `refresh()` exist only in Server Actions, and this site has none.
- **`next/image`:** `priority` is now `preload`. The site uses plain `<img>`
  on purpose. Don't switch casually: Vercel bills optimization, and
  Cloudflare needs a loader.
- **The React Compiler:** `reactCompiler: true`, and with Turbopack the
  experimental `experimental.turbopackRustReactCompiler` (16.3) avoids the
  Babel plugin. It is worth measuring on the giant client components, since
  there is no `React.memo` anywhere today.

## Workflows

### Audit a page
1. Run `payload.mjs` on the page and its neighbours, and Lighthouse mobile
   three times.
2. Name the three biggest contributors (a chunk, an RSC field, an image, a
   query), each with a number.
3. Propose fixes, each with its expected saving and risk.
4. Implement them if asked.
5. Measure again and report before and after.

### Review a change for regressions
- Does it add client JS? Look for a new `"use client"`, a heavy import in a
  client file, or `data/*.json` imported into a client file.
- Does it send more data to the browser? Look for new props from a server
  page to a client component.
- Does it turn a static page dynamic? Look for `cookies()`, `headers()`,
  `searchParams` in `generateMetadata`, or a `no-store` fetch.
- If a server page now reads the session, is its path in `proxy.ts`'s
  matcher? Without it, members get signed out.
- Does it add a query per render, per row or per realtime event, or one
  without `.limit()`?
- Does it add images without a box, lazy loading, or a fitting size?
- Is it still compatible with Cloudflare (see above)?

### Cost check
Map the change to the meters:

| Service | Meters |
|---|---|
| Vercel | edge requests, Fast Origin Transfer, function invocations and duration, ISR reads and writes, image optimizations |
| Cloudflare Workers | requests, CPU ms (static assets are free) |
| Supabase | egress, cached (storage CDN) egress, realtime connections and messages, storage size, image transformations |

State which meter moves and roughly how much, for example "one more
function run per member page view".

## Deliver

Tell the user, in Thai when they write Thai:
- the before and after numbers, in a small table;
- what changed;
- what was verified;
- anything to do with Cloudflare compatibility.

Commit only when asked, staging only your own hunks: parallel sessions share
the working tree. The subject is a plain sentence about what got lighter or
faster, like `2453d07` ("Vercel is asked for less: a lighter front page, a
narrower proxy, pictures kept a week").
