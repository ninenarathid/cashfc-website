# Measuring

Measure production builds only. `next dev` is unminified and compiles on
demand, so its numbers mean nothing.

## A production server to measure

```bash
# Is one already up? Another session may own port 3000.
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/

npx next build            # prints the route table: ○ static, ● SSG, ƒ dynamic, revalidate columns
npx next start --port 3100   # run in the background; stop it afterwards
```

`next build` and `next dev` rewrite `next-env.d.ts`. If
`git status` shows it afterwards, restore it with
`git checkout next-env.d.ts`. The build reads the main tree's `.env.local`;
never delete that file. For a build in a separate worktree, follow the
shared-working-tree notes: put it on E:, use `next build --webpack`, copy in
`.env.local` only for `next start`, and delete it afterwards.

The live site is also fair to measure read-only:
`https://cashfc-website.vercel.app`. That is the production URL until the
domain moves, and `lib/site.ts` holds the canonical one.

## Payload per route

```bash
node .claude/skills/fc-perf/scripts/payload.mjs http://localhost:3100 / /members /party /gallery
node .claude/skills/fc-perf/scripts/payload.mjs https://cashfc-website.vercel.app / /members --json
```

It gives HTML gz, RSC raw and gz (what a prefetch or soft navigation
downloads), JS gz and CSS gz for everything the HTML asks for, and "new gz",
which is what this page adds over the ones listed before it. It works from
Git Bash and PowerShell alike.

To see which fields make an RSC payload heavy:

```bash
curl -s -H "RSC: 1" "http://localhost:3100/members?_rsc=x" -o members.rsc
node -e "const s=require('fs').readFileSync('members.rsc','utf8');for(const k of ['job_scores','portrait','avatar','progress','achv'])console.log(k,(s.split('\"'+k+'\"').length-1))"
```

## Bundle composition

```bash
npx next experimental-analyze --output   # Turbopack analyzer (v16.1+), writes .next/diagnostics/analyze
```

Without it, read `.next/static/chunks/*.js` sizes after a build, and search
chunk text for a library's name to see where it landed.

## Lighthouse (mobile), with the installed Chrome

Tested on 2026-10-01 against production `/`.

```bash
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" \
npx -y lighthouse@12 https://cashfc-website.vercel.app/ --only-categories=performance \
  --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate \
  --output=json --output-path=<scratchpad>/lh-home.json --quiet --chrome-flags="--headless=new"

# the scores
node -e "const r=require(process.argv[1]);const a=r.audits;console.log('score',Math.round(r.categories.performance.score*100),'LCP',a['largest-contentful-paint'].displayValue,'FCP',a['first-contentful-paint'].displayValue,'TBT',a['total-blocking-time'].displayValue,'CLS',a['cumulative-layout-shift'].displayValue,'SI',a['speed-index'].displayValue)" <scratchpad>/lh-home.json

# what the LCP element is, its phases, the page weight and the heaviest requests
node -e "const r=require(process.argv[1]);const a=r.audits;const el=a['largest-contentful-paint-element'];const n=el.details?.items?.[0]?.items?.[0]?.node;console.log('LCP:',n?.snippet);for(const p of el.details?.items?.[1]?.items??[])console.log(' ',p.phase,Math.round(p.timing)+'ms');console.log('bytes:',Math.round(a['total-byte-weight'].numericValue/1024)+' KB');for(const q of a['network-requests'].details.items.sort((x,y)=>y.transferSize-x.transferSize).slice(0,10))console.log(String(Math.round(q.transferSize/1024)).padStart(6)+' KB',q.resourceType,q.url.slice(0,100))" <scratchpad>/lh-home.json
```

Git Bash needs `cygpath -m` for the Windows path passed to `node -e`.

Run it three times and report the median. Lighthouse cannot measure INP (it
needs real interaction), so total blocking time stands in for it.

For a real interaction, record a trace in Chrome DevTools, or ask the user
to. On the site itself, `useReportWebVitals` from `next/web-vitals` could log
real members' INP. That is a feature to propose, not something to add
quietly, because it would need somewhere to send the numbers.

## Database

Hand the user [db-perf.sql](db-perf.sql) to run in the Supabase SQL editor.
It is read-only, and each section says what to look for. Ask them to paste
the result tables back.

To see one query's plan, the user can run `explain (analyze, buffers)
<query>` in the editor. Postgres needs RLS context for a realistic plan, so
include `set local role authenticated; set local request.jwt.claim.sub =
'<a uuid>';` in the same transaction (`begin; … rollback;`).

## Requests from the browser

To count what a page does to Supabase on load, run `shoot.mjs` from the
fc-ui skill against the page and watch the network, or open DevTools →
Network → filter `supabase.co`. Count the requests on a hard load, and again
on a realtime event or a poll tick.

## Usage and bills

Ask the user for current screenshots of:
- **Vercel:** Usage (edge requests, Fast Origin Transfer, function
  invocations, ISR).
- **Supabase:** Usage (egress, cached egress, realtime peak connections and
  messages).
- **Cloudflare:** Workers & Pages analytics, once live.

Compare with the dated baseline in memory and in
[baseline-2026-10.md](baseline-2026-10.md). Don't estimate a bill from code.
