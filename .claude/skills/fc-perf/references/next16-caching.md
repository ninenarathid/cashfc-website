# Next 16.3 caching, rendering and prefetch: what this version actually does

Digest of the bundled docs, `node_modules/next/dist/docs/01-app/` (the paths
below are relative to it). When in doubt, read the file; this version differs
from older Next.

## Which model the project is on

`next.config.ts` does **not** set `cacheComponents`. The site runs the
previous model (`02-guides/caching-without-cache-components.md`):

- **`fetch` is not cached by default.** Opt in with `{ cache: "force-cache" }`
  or `next: { revalidate, tags }`.
- **Route segment config:** `export const dynamic = "auto" | "force-dynamic"
  | "error" | "force-static"`, and `export const revalidate = false | 0 | N`.
  - `N` must be a literal: `60 * 10` is invalid.
  - The lowest `revalidate` in a route wins.
- **`unstable_cache(fn, keys, { tags, revalidate })`** caches work that
  isn't a fetch. `React.cache` dedupes within a request.
- **Dynamic triggers:** a page is dynamic if it (or its `generateMetadata`)
  reads `cookies()`, `headers()` or `searchParams`, or uses a `no-store`
  fetch.
- **Route symbols in `next build`** (`02-guides/building.md`): ○ Static,
  ● SSG, ƒ Dynamic, ◐ partial prerender (cacheComponents only).
- **`next build` no longer prints JS sizes** (removed in v16). Use
  `next experimental-analyze` (v16.1+, Turbopack).

## Revalidation APIs (both models)

- **`revalidateTag(tag, "max")`:** the second argument is now required (the
  one-argument form is deprecated). `"max"` gives stale-while-revalidate;
  `{ expire: 0 }` expires immediately, for webhooks and route handlers.
  (`03-api-reference/04-functions/revalidateTag.md`)
- **`updateTag(tag)`:** Server Actions only; read-your-own-writes. **`refresh()`**
  from `next/cache`: Server Actions only. The site has no Server Actions (it
  writes to Supabase from the browser), so these need a Server Action first.
- **`revalidatePath(path)`** exists too. None of them purge an external CDN
  (`02-guides/cdn-caching.md`).
- **The Discord board poke** (`app/api/discord/board`) is a route handler: the
  right place to call `revalidateTag` if a page ever caches board data.

## Cache Components (`cacheComponents: true`): a migration, not a flag

The docs are `03-api-reference/05-config/01-next-config-js/cacheComponents.md`,
`01-getting-started/08-caching.md` and
`02-guides/migrating-to-cache-components.md`.

**What it does.**
- Everything is dynamic by default. `"use cache"` (file, component or
  function) plus `cacheLife(profile)` and `cacheTag(...)` opt in to caching.
- Partial prerendering is on: a static shell with dynamic holes behind
  `<Suspense>`.
- Built-in `cacheLife` profiles: `seconds`, `minutes`, `hours`, `days`,
  `weeks`, `max` and `default` (5m stale / 15m revalidate / never expire).
- `"use cache: private"` caches per user in the browser; `"use cache: remote"`
  is durable and shared via `cacheHandlers`.
- `import { io } from "next/cache"` (new in 16.3) keeps what follows out of
  the static shell but still cacheable. `connection()` (from `next/server`)
  waits for a real request.

**What breaks when turning it on.**
- Exporting `dynamic`, `revalidate` or `fetchCache` from a route errors.
- `runtime = "edge"` is unsupported.
- `useSearchParams` needs `<Suspense>`.
- `generateStaticParams` returning `[]` errors.
- `generateMetadata` doing uncached reads errors.
- `cookies()`/`headers()` inside `"use cache"` throws.
- Incremental adoption: `export const instant = false` per route, or the
  codemod `npx @next/codemod@canary cache-components-instant-false ./app`.

**For this site.** It would be a large change, and this site is mostly
static pages with client-side personal data, which the previous model
already serves well. Consider it only after levers 1–3 of the playbook, and
only once OpenNext for Cloudflare is confirmed to support it.

## Prefetching (`02-guides/prefetching.md`, `optimizing-prefetching.md`)

- Prefetching happens in production only, as `<Link>`s enter the viewport,
  then on hover.
- Previous model:
  - Static routes are prefetched **in full**.
  - Dynamic routes are prefetched only down to `loading.js`. The site has
    none, so dynamic routes are not prefetched at all.
- `prefetch={false}` turns it off. `prefetch={active ? null : false}` makes it
  hover-only. `router.prefetch(href)` prefetches by hand.
- Don't use `prefetch={true}` on large grids of cards.
- `experimental.prefetchInlining` is on by default since 16.3.
  `partialPrefetching` needs cacheComponents.

## Streaming and loading (`02-guides/streaming.md`, `03-api-reference/03-file-conventions/loading.md`)

- `loading.js` is prefetched as an instant fallback. `<Suspense>` boundaries
  are not prefetched by default.
- Keep the LCP element outside Suspense. Size fallbacks like the final
  content (CLS). Each boundary is its own hydration unit, which helps INP.
- Call `notFound()` before any await or Suspense. Once streaming starts the
  status is 200.

## Images (`03-api-reference/02-components/image.md`)

- `priority` is deprecated; use `preload`. Usually `loading="eager"` or
  `fetchPriority="high"` is the better choice.
- Without `sizes`, the browser assumes 100vw.
- Defaults: `qualities: [75]` (required since 16), `formats: ["image/webp"]`.
- The site uses plain `<img>`. Adding `next/image` means Vercel optimization
  billing, or a custom `loaderFile` on Cloudflare.

## Bundling (`02-guides/lazy-loading.md`, `package-bundling.md`)

- `next/dynamic(() => import(...), { ssr: false })` works only inside Client
  Components, and errors in Server Components. A Server Component that
  dynamically imports a Client Component is not code-split.
- `optimizePackageImports` already covers recharts, lucide, date-fns and
  similar by default.
- `experimental.inlineCss` inlines global CSS for first visits (production
  only). It is rarely worth it for a site with returning members.

## React Compiler (`03-api-reference/05-config/01-next-config-js/reactCompiler.md`)

- `reactCompiler: true` (stable) needs `babel-plugin-react-compiler`.
- Or, with Turbopack, `experimental.turbopackRustReactCompiler: true` (new in
  16.3), which needs no Babel plugin.
- Opt a file in with `compilationMode: "annotation"` plus `"use memo"`, or out
  with `"use no memo"`.

## Proxy (the old middleware) (`01-getting-started/16-proxy.md`)

- `proxy.ts` runs on Node by default, and setting a runtime throws.
- It runs on every request its matcher allows, prefetches included. Keep the
  matcher narrow. This site's list is the pages that read the session on the
  server.
- On the Cloudflare branch it is back to an edge `middleware.ts`, because
  OpenNext cannot run Node middleware yet.
