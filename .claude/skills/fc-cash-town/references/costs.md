# Costs: prices checked on 2026-10-01

Re-check every price before a decision. They change, and the owner budgets in
baht a month. `scripts/town-cost.mjs` turns these into monthly estimates
from your assumptions.

## Prices

**Supabase Realtime (Pro)**
(https://supabase.com/docs/guides/realtime/pricing, `/limits`, and
`/platform/manage-your-usage/realtime-messages`)
- 5M messages a month included, then $2.50 per million.
- 500 peak connections included, then $10 per 1,000.
- **Broadcast counts 1 + N:** one sent, plus one per subscriber who receives
  it.
- **Limits:** 500 messages a second, 500 concurrent connections, 100 channels
  per connection, 50 presence messages a second (configurable per project,
  and a spend cap applies).
- **The site already uses Realtime** (the party board, the bell). Peak
  connections were about 152 in September 2026, so the included amounts are
  shared.

**Cloudflare Durable Objects (Workers Paid)**
(https://developers.cloudflare.com/durable-objects/platform/pricing/)
- **Included:** 1M requests and 400,000 GB-s a month. Beyond that, $0.15 per
  million requests and $12.50 per million GB-s.
- **How it is measured:**
  - Duration is billed at 128 MB per awake object.
  - Incoming WebSocket messages count 20:1 as requests.
  - **Outgoing WebSocket messages and pings are free.**
  - With the Hibernation API, an idle object accrues no duration.
- The Workers Paid minimum ($5 a month) is already part of the planned move
  to Cloudflare.

**Cloudflare Realtime: SFU and TURN**
(https://developers.cloudflare.com/realtime/sfu/pricing/)
- **The first 1,000 GB of egress each month is free,** shared by SFU and
  TURN. Then $0.05 per GB.
- Ingress is free. Traffic between TURN and the SFU isn't charged twice.

**LiveKit Cloud** (https://livekit.com/pricing)
- **Build (free):** 5,000 WebRTC participant-minutes, 100 concurrent, 50 GB.
- **Ship ($50 a month):** 150,000 minutes (then $0.0005 a minute), 1,000
  concurrent, 250 GB (then $0.12 per GB).

## Worked examples (`town-cost.mjs`, 2026-10-01)

**20 people at once, 3 hours a day, click-to-move, half the time in voice**
with about 4 nearby:

| Option | Load | Cost |
|---|---|---|
| Supabase Broadcast | 15.1M messages, 47 messages a second | about $25 a month over the included (and it eats the site's shared quota) |
| A Durable Object room | 0.04M billed requests, 41k GB-s | $0 over the included |
| Cloudflare SFU voice | 78 GB | $0 (within 1,000 GB) |
| LiveKit | 54,000 minutes | beyond the free plan, so Ship at $50 a month |

**40 people, 4 hours a day, positions streamed at 10 Hz:**
- **Supabase:** about 16,000 messages a second, which is **32× the Pro
  ceiling** and about $17,000 a month. It is not an option.
- **A Durable Object:** about $1.15 a month over the included.

**The conclusion so far:** click-to-move, a Durable Object per zone, and
Cloudflare Realtime for voice keep Cash Town at roughly the $5 a month the
Cloudflare move already pays. Spend the money on art, not servers. Re-run
the script with the real expected numbers when planning.

## What else costs money

- **Art:** sprites, tiles, the UI. This is the real budget item. Generated
  art (the way the popoto flavours are made) keeps it low.
- **Assets on the CDN:** static files on Cloudflare are free. Keep them in
  `public/` or R2, not in Supabase Storage, which bills egress.
- **Supabase rows** (homes, farms, the ledger): small, and well within Pro.
