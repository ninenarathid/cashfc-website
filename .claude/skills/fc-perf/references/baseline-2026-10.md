# Performance baseline: 2026-10-01

Measured on production (`payload.mjs`) and in a read-only code survey. Use
it as the "before" in reports, and replace it after a round of fixes.
**Re-check any line before acting on it.**

## Payload per page (production, `payload.mjs`)

| Page | HTML gz | RSC raw | RSC gz | JS gz | CSS gz | New gz vs pages before it |
|---|---|---|---|---|---|---|
| `/` | 68 KB | 247 KB | 60 KB | 479 KB | 24 KB | 503 KB |
| `/members` | 139 KB | 800 KB | 99 KB | 581 KB | 24 KB | 156 KB |
| `/gallery` | 37 KB | 138 KB | 34 KB | 483 KB | 24 KB | 29 KB |
| `/party` | 54 KB | 258 KB | 50 KB | 545 KB | 24 KB | 91 KB |

Where the shared JS goes (from the build, gz):
- i18n `DICT`, both languages: 46 KB
- `motion`, for Nav's caret: 42 KB
- cmdk + vaul + the palette: 19 KB
- recharts, on `/members` and the admin pages: 112 KB
- a near-empty page: about 419 KB

## Lighthouse, mobile (simulated slow 4G), production `/`

**Score 62 · LCP 30.9 s · FCP 1.9 s · TBT 140 ms · CLS 0 · Speed Index
13.8 s.** The page weighs **12.7 MB** in total.

- **The LCP element** is the hero `/logo.png` (1000×722, 125 KB). Its
  phases: TTFB 631 ms, load delay 1.7 s, load 0.9 s, **render delay 27.7 s**.
  The logo arrives early; the page is starved by everything else
  downloading.
- **The heaviest requests:**
  - Three announcement posters in the `post-images` bucket, PNGs of **2.2,
    2.5 and 2.6 MB**. The EventSlider shows one slide at a time, yet all are
    fetched (lazy loading doesn't help in a horizontal strip near the
    viewport).
  - Gallery thumbnails from the HotGallery strip at 130–394 KB each. They are
    made 1200px wide, for a strip that draws them small.
- **The fixes, in order:**
  1. Re-encode announcement pictures at upload (the admin ImagePicker
     uploads originals) to WebP around 1600px, and convert the existing
     ones.
  2. Render only the visible slide's picture, plus the next one.
  3. Add a small thumbnail size (about 480px) for strips and icons.
  4. Serve the logo as WebP or AVIF with `fetchPriority="high"`.

  Then measure again.

## Rendering

- **Static:** `/`, `/members`, `/leaderboards`, `/party`, `/gallery`,
  `/profile`, `/admin*`, `/market`, `/feedback`, `/guides`, `/contest`.
- **ISR:** only `/contest` OG (600s).
- **Dynamic:**
  - `/member/[id]`: `generateMetadata` reads `searchParams.v`.
  - `/party/[id]`: `searchParams`, plus a `no-store` card fetch.
  - `/events/[id]`, `/gallery/[id]`, `/contest/[id]`: the cookie client.
  - All the `[id]` OG routes, and the API routes.
- **Not used at all:** `cacheComponents`, `"use cache"`, `unstable_cache`,
  `revalidateTag`/`revalidatePath`, `React.cache`, `loading.tsx`,
  `next/dynamic`, `React.memo`, `next/image`.
- **Proxy matcher:** `/events/:id`, `/gallery/:id`, `/api/verify-character`
  and `/auth/:path*`. `/contest/:id` is missing even though that page reads
  the session, which risks signing members out.

## Top issues, ranked

1. **`/members` ships the roster,** 800 KB of RSC, and the nav prefetches it
   from every page (Nav.tsx:247).
2. **Redeploy churn:** data commits every 4 hours plus daily sweeps, each
   one a redeploy and a cold cache.
3. **Member and party pages are dynamic** only because of the `?v` share
   stamp.
4. **About 420–580 KB gz of JS per page:** the dictionary in both languages,
   motion in Nav, the eager palette, and eager recharts.
5. **Top-N computed from whole tables:** TopThree.tsx:91, PopotoBoard.tsx:64.
6. **Realtime triggers full reloads:** party-live.ts:48 → PartyBoard.tsx:1091
   (about 10 queries per event per tab), and the bell's full reload.
7. **Six `getUser()` and four profile reads** per signed-in page load.
8. **Cloudflare blockers:**
   - `sharp` at request time: the party OG and contest card.
   - `fs` reads: duty-server.ts:35, the fonts and the popoto file.
   - 18 MB of duty art traced into the OG and page functions.
   - Hard-coded `vercel.app` URLs.
9. **`partySeeds()` is rebuilt two or three times** per party request.
10. **The roster is repeated in the home page's RSC** (four copies of each
    name).
11. **The gallery OG inlines original images** (up to 6 MB each).
12. **Pictures bigger than they are shown:** the bell draws 1200px thumbs at
    48px, and guide maps are 500–830 KB JPGs.
13. **MemberBoard renders about 509 rows** with no memoised row and no
    `content-visibility`.

## Fonts

Mitr 500/600, Noto Sans Thai Looped 400/600/700 and Bai Jamjuree 500/600,
each with Thai and Latin subsets: 10 preloaded woff2 files, 139 KB. Kanit
(345 KB) is read from disk only by the contest OG cards.

## Usage (dated, from the user's dashboards)

- **Vercel Hobby, 30 days to Sep 29:** CDN requests 1.2M / 1M, Fast Origin
  Transfer 16.3 / 10 GB. Usage jumped on Sep 21, when the popoto prizes
  shipped.
- **Supabase Pro:** egress 8.8 GB, cached egress 27.6 GB, realtime peak 152.

Ask for fresh screenshots before quoting any of these.
