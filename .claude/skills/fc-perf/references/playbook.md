# The playbook: ranked levers for this codebase

Each lever gives the problem, the pattern, and what to watch out for. Check
[baseline-2026-10.md](baseline-2026-10.md) for current numbers, and measure
before and after.

## 0. Pictures first

**Problem** (Lighthouse mobile, 2026-10-01):
- `/` weighs 12.7 MB, with LCP 30.9 s.
- The hero logo arrives early, but its render is starved while three
  announcement posters download. They are PNGs of 2.2–2.6 MB in
  `post-images`, uploaded as-is by the admin ImagePicker.
- The HotGallery strip pulls 1200px thumbnails at 130–394 KB each.

**Pattern.**
- **Re-encode every upload in the browser before it leaves.** Use canvas to
  WebP at quality about 0.82: a longest side of about 1600px for posters and
  pictures, and about 480px for the thumbnail. `lib/gallery.ts` already does
  this for the gallery (its `makeFull`); reuse it in ImagePicker and in
  party-photos.
- **Convert the pictures already stored.** Write a scratchpad script with
  the service key. Upload the WebP beside the original, update the row's URL,
  and delete the original only after checking. Show the user before and
  after.
- **The slider** renders the current slide's picture and the next one's, not
  all of them.
- **The logo:** WebP or AVIF, and `fetchPriority="high"` because it is the
  LCP.

**Watch.** The OG cards and the lightbox may want the large size, so keep it
and add the small one. Don't rely on Supabase image transformations, which
are billed per origin image.

## 1. Stop shipping the roster to the browser

**Problem.**
- `/members` passes the whole of `data.members` into the client components
  `MemberBoard` and `FcCharts` (app/members/page.tsx:18-23). The page's RSC
  is about 800 KB raw, dominated by `job_scores` (112 KB), `portrait` (66 KB)
  and `avatar` (65 KB).
- `everyone()` (89 KB raw) goes to `/party`, `/gallery`, `/profile`,
  `/admin` and `/contest`.
- The home page repeats names four times over (the layout index, `everyone()`,
  Birthdays, TopThree).

**Pattern.** Shape the data on the server, into exactly what the component
draws:
```ts
// app/members/page.tsx (server)
const rows = data.members.map((m) => ({ id: m.id, name: m.name, rank: m.rank, tags: m.tags,
  parse: m.parse, avatar: m.avatar /* not portrait: the list draws 32px faces */ }));
return <MemberBoard rows={rows} />;
```
- Charts get pre-aggregated numbers, not rows.
- Anything needed only on expand (job scores) is fetched when expanded, from
  a small JSON route or a static file.
- One shared "people" list per page, not four copies of it.

**Watch.** URL filters in MemberBoard read fields. Keep every field a filter
or sort uses, or move that filter to precomputed flags.

## 2. Prefetch on purpose

**Problem.**
- In production every `<Link>` in the viewport prefetches. Static pages are
  prefetched in full, so each page view downloads the nav targets' RSC:
  about 340 KB gz, of which 106 KB is `/members`.
- The logo prefetches `/`.

**Pattern.**
- `prefetch={false}` on heavy targets, or hover-only prefetch:
  `prefetch={hovered ? null : false}`. See
  `node_modules/next/dist/docs/01-app/02-guides/prefetching.md`.
- Trim the target first (lever 1), which is the better fix.
- Before making member pages static (lever 3), set `prefetch={false}` on the
  long lists of member links: MemberBoard's ~509 rows, LeaderRow, TopThree,
  Birthdays, ActivityFeed. Otherwise a list prefetches hundreds of pages.

## 3. Make member and party pages cacheable

**Problem.**
- `/member/[id]` is dynamic only because `generateMetadata` awaits
  `searchParams.v`, the stamp that busts Discord's OG cache
  (app/member/[id]/page.tsx:72).
- `/party/[id]` reads `searchParams` and fetches `no-store`.
- Every view is therefore an uncached function run with about 140 KB of RSC.

**Pattern.**
- Put the stamp only on the OG image URL (`opengraph-image?v=…`), so the page
  itself can be static, with ISR revalidate or `generateStaticParams` plus
  revalidate.
- Personal bits (popoto sent today, own profile controls) already load in the
  browser; keep them there.

**Watch.** Lever 2's prefetch guard first. The OG card must still refresh
when shared again: test with Discord's embed debugger, or ask the user.

## 4. Split the i18n dictionary per language

**Problem.** `DICT` in `lib/i18n.tsx` carries both languages, about 1,590
keys, into the shared chunk: 181 KB raw, 46 KB gz on every page.

**Pattern.**
- Split it into `lib/i18n/th.ts` and `en.ts`, typed with
  `type Key = keyof typeof th`.
- The provider imports the active language, statically for the default
  (Thai) and dynamically for the other.
- Keep `t()`'s signature, so no call sites change.
- A missing key must fail the typecheck: add a test that both files have the
  same keys.

**Watch.** A flash of keys while the second language loads. Keep the English
fallback behaviour.

## 5. Load heavy libraries when they are needed

| Library | Weight | Where | Pattern |
|---|---|---|---|
| recharts | 112 KB gz | FcCharts, AdminPopotoChart, AquaView | `const FcCharts = dynamic(() => import("./FcCharts"), { ssr: false, loading: () => <ChartSkeleton/> })` inside a client component (`ssr:false` errors in server components) |
| react-day-picker | in `/party`'s chunk | ui/DateTime, via PartyCreate | Import the picker when the popover opens |
| cmdk + palette | 19 KB gz, every page | CommandPalette in the layout | A tiny listener for `/` and Ctrl+K, and `import()` on first use |
| motion | 42 KB gz, every page | Nav's `layoutId` caret, MemberBoard, ProfilePictures | Replace Nav's caret with CSS (a `view-transition-name` on the caret morphs with the page transition), then motion only loads where it is used |

**Watch.** Layout shift while loading: give each lazy component a skeleton
of the same size.

## 6. Let the database count

**Problem.** TopThree (TopThree.tsx:91-101) and PopotoBoard
(PopotoBoard.tsx:64-104) page through all of `kudos`, `gallery_posts` and
`gallery_tags` to find a top 3 or top 10. The cost grows every day.

**Pattern.** A `stable` RPC with an index behind it, via the fc-migration
skill:
```sql
create or replace function public.popoto_top(p_limit int default 10)
returns table (character_id bigint, n bigint)
language sql stable set search_path = public as $$
  select receiver_character_id, count(*) from public.kudos
   group by 1 order by 2 desc limit least(p_limit, 50)
$$;
create index if not exists kudos_receiver on public.kudos (receiver_character_id);
```
Cache the result on the server where it is public: an ISR page, or an OG
route with revalidate.

## 7. Realtime, polling and session reads

**Problems.**
- **Party board:** `lib/party-live.ts:48-54` listens to all changes on four
  tables, unfiltered. Each event calls `refresh`, which is two `loadParties`,
  each five queries in four waves. That is about ten queries per open tab
  per change by anyone.
- **The bell:** a 90s poll of six to ten requests, and a realtime INSERT
  that reruns the whole load.
- **Every page load, signed in:** six `auth.getUser()` network calls and four
  reads of the same profile row.

**Patterns.**
- Use the realtime payload (`payload.new` / `payload.old`) to patch the one
  party that changed, or refetch only that party by id. Filter the
  subscription where possible (`filter: "party_id=eq.123"`) and debounce.
- The bell: let realtime drive it, poll only as a slow fallback, and fetch
  only rows newer than the newest one held.
- One client context for the session and the member's profile. In the
  browser, `supabase.auth.getSession()` reads local storage with no network,
  which is fine for deciding what to show, because RLS is the real guard.
  Use `getUser()` or `getClaims()` on the server, where identity must be
  verified.

**Watch.** Realtime messages are billed. Unsubscribe when the tab is hidden
if the board doesn't need to be live then.

## 8. Redeploy churn

**Problem.** The data workflow commits every 4 hours, plus daily sweeps.
Each commit redeploys the site, and a new deploy starts every static page
and cache cold (the build ID is part of every cache key).

**Options,** for the user to choose from:
- (a) Commit only when data changed materially.
- (b) Batch to fewer deploys a day.
- (c) Move `data/*.json` out of the build, into Supabase Storage or a table,
  and read it with ISR revalidation. The pages then refresh without a deploy.

Option (c) is the structural fix, and it also helps Cloudflare's bundle size.

## 9. OG cards

- The gallery OG inlines up to four **original** images, up to 6 MB each.
  Use `thumb_url`.
- `/party/[id]` builds `partySeeds()` at least twice per request, and its OG
  route a third time, each walking `public/duty`. Memoise at module level.
- `sharp` and `fs` reads at request time block Cloudflare. The `cloudflare`
  branch moved to prebuilt images and `lib/public-file.ts`; follow that.
- `outputFileTracingIncludes` traces `./public/duty/**/*`: 368 files, 18 MB.
  Trace only what the card uses.
- Add `revalidate` to OG routes whose card only changes slowly.

## 10. Images and fonts

- **Pictures larger than they are shown:**
  - The bell draws 1200px WebP thumbnails at 48px. Make a small variant at
    upload (the upload code already makes WebP in the browser), or store a
    tiny avatar.
  - Supabase image transformations are billed per origin image; prefer
    sizes made at upload.
- **Guide maps:** JPGs of 500–830 KB in `public/guides/raidplan`. Convert
  them to WebP or AVIF at build time (a script) and serve them lazily.
- **A box for every `<img>`** (width/height or aspect-ratio), so nothing
  shifts. `fetchPriority="high"` on the LCP picture only.
- **Fonts:** three families, seven weights, Thai and Latin, 139 KB preloaded.
  Before adding a weight, drop one. Check how often Mitr 600 and Bai Jamjuree
  600 are used.

## Also worth measuring

- **The React Compiler** (`reactCompiler: true`, plus
  `experimental.turbopackRustReactCompiler`) on the 1,000–2,000-line client
  components. Compare INP and TBT before and after on `/party` and
  `/members`.
- **Long lists:** MemberBoard draws about 509 rows with no memoised row
  component. Use `content-visibility: auto` per group, a memoised row, and
  `useDeferredValue` for the search box. Use windowing only if measurements
  still say so.
