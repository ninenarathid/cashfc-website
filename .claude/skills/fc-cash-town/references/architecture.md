# Architecture: how a town in the browser works

These are recommendations with their reasons, written before any spike. A
tech spike decides; this page frames the choices. Versions and prices are as
checked on 2026-10-01; re-check them before committing.

## Contents
1. The shape of it
2. Rendering: 2D isometric, PixiJS or Phaser
3. Isometric maths, depth, picking
4. Movement and netcode: click to move
5. The room server: a Cloudflare Durable Object per zone
6. Signing in to the town
7. Persistence: what goes in Supabase
8. Living inside the site: route, bundle, performance
9. Phones, input, accessibility

## 1. The shape of it

```
browser (/town, lazy bundle)
  ├─ renderer (PixiJS or Phaser): map, avatars, bubbles, UI
  ├─ WebSocket ──► Durable Object "zone:<name>"  (who is here, moves, chat, signalling)
  ├─ WebRTC ─────► other players, P2P (mesh), or the Cloudflare Realtime SFU (voice)
  └─ Supabase (anon key + RLS) ── homes, farm plots, pets, wallet: things that persist
```

- **Fast and fleeting** state (positions, who is here, chat bubbles) lives in
  the Durable Object's memory.
- **Slow and lasting** state (a home's layout, what is planted, owned pets)
  lives in Supabase tables with RLS, written through RPCs (fc-migration).

## 2. Rendering

- **Stay 2D isometric, not 3D.** It matches the Zheza memory, reads well on
  a phone, is cheap to draw, and avoids the lag the admin worried about.
  Three.js 3D would bring heavier assets, more GPU work and more art.
- **PixiJS v8** is a fast 2D renderer: WebGL, and WebGPU first. You bring
  your own scene logic, which is lighter and gives more control. It is a good
  fit for a town of sprites and UI.
- **Phaser 4** has been stable since April 2026 (v4.0 "Caladan"; later point
  releases followed). It is a full framework: scenes, input, tweens, audio,
  tilemaps. Note that its GPU-accelerated tilemap layer is orthographic-only,
  so an isometric map uses the regular tilemap or sprites.
- **Tiled** (mapeditor.org) edits isometric maps and exports JSON. Members of
  the team can build districts without code.
- **Decide in the spike.** Build the same small district in both for an
  evening, and keep whichever feels better on a mid-range phone.

## 3. Isometric maths (2:1 diamonds, tile size W×H with H = W/2)

```
screenX = (tx - ty) * (W / 2)            tx = (sx / (W/2) + sy / (H/2)) / 2
screenY = (tx + ty) * (H / 2)            ty = (sy / (H/2) - sx / (W/2)) / 2
```

- **Depth:** draw in order of `tx + ty`, then by y. For tall objects, sort by
  their foot (base) position. Re-sort only moving things each frame.
- **Picking:** convert the pointer to tile coordinates for walking. For
  sprites (an avatar, a door), hit-test topmost-first using the depth order.
- **Walkability:** a grid of walkable tiles from the Tiled collision layer.

## 4. Movement and netcode: click to move

The Zheza way is also the cheap way. The player taps a destination, and the
client sends **one message**, `{to: [tx, ty]}`.

1. The server checks that the destination is walkable and the request isn't
   too frequent (no more than 2–3 per second). It stamps the start time and
   broadcasts `{id, from, to, t0}`.
2. Every client runs the **same deterministic A\*** on the same map, and
   animates the avatar along the path at a fixed speed from `t0`.
3. A late joiner receives the current `{from, to, t0}` per avatar, and
   computes where each one is by now.
4. There is no position streaming. `scripts/town-cost.mjs` shows the
   difference: click mode is about 0.76M messages a month for 20 people,
   against hundreds of millions when streaming at 10 Hz.

If continuous control is ever needed (a mini-game):
- send at 10 Hz;
- render remote players about 100 ms in the past, interpolating between
  snapshots;
- send only to the players nearby (area of interest).

## 5. The room server: a Durable Object per zone

**Why a Durable Object:**
- The site is moving to Cloudflare Workers anyway.
- One object per zone is a single place where the zone's state lives.
- WebSockets with **Hibernation** stop billing for duration when idle.
- Incoming WebSocket messages are billed at 20:1 as requests, and outgoing
  ones are free.

**Why not Supabase Realtime for movement:**
- Broadcast is billed 1 + N per message.
- Pro allows 500 messages a second **for the whole project**. Streaming
  positions breaks both.
- Supabase Realtime stays fine for low-rate things: notifications, and maybe
  chat outside the town.

**Alternatives:**
- Colyseus on a VPS: a game-server framework, but a server to run.
- PartyKit, now part of Cloudflare and built on Durable Objects.

```ts
// worker: route /town/zone/:name → env.ZONE.idFromName(name)
export class Zone extends DurableObject {
  async fetch(req: Request) {
    const who = await verifyMember(req);              // §6, before accepting
    if (!who) return new Response("no", { status: 401 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);                  // the hibernation API
    server.serializeAttachment(who);                   // survives hibernation (≤16 KB)
    this.broadcast({ t: "join", who: publicView(who) }, server);
    server.send(JSON.stringify({ t: "state", avatars: this.snapshot() }));
    return new Response(null, { status: 101, webSocket: client });
  }
  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    const who = ws.deserializeAttachment();
    const msg = parse(raw);                            // validate shape and size; drop bad messages
    if (msg.t === "move" && this.allowMove(who, msg.to)) this.broadcast({ t: "move", id: who.id, ...this.path(who, msg.to) });
    if (msg.t === "say" && this.allowSay(who, msg.text)) this.broadcast({ t: "say", id: who.id, text: clean(msg.text) });
    if (msg.t === "rtc") this.relayTo(msg.to, { t: "rtc", from: who.id, data: msg.data }); // voice signalling
  }
  async webSocketClose(ws: WebSocket) { /* broadcast leave */ }
}
```

**Notes:**
- In-memory state resets when the object hibernates, so rebuild the avatar
  list from `this.ctx.getWebSockets()` and their attachments.
- Rate-limit per connection. Cap chat length (for example 140 characters).
- One zone per district; plan for at most about 50 people in a zone.
- Read the current docs:
  https://developers.cloudflare.com/durable-objects/best-practices/websockets/

## 6. Signing in to the town

- The browser already has a Supabase session. It opens the socket with its
  access token, as the subprotocol or in the first message, never in a
  logged URL.
- **The Worker verifies the JWT:**
  - If the project uses Supabase's asymmetric JWT signing keys, use the JWKS
    at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` with `jose`.
  - With the legacy shared secret, verify against it, stored as a Worker
    secret.
  - Check which applies in the Supabase dashboard (JWT keys).
- **Then confirm a verified character.** One read of `profiles` with the
  service key, cached in the attachment. Only `id`, `character_name`,
  `accent_color` and an avatar look cross to other players.
- **Block lists** are read on join. A blocked person's avatar, chat and voice
  are hidden for the blocker. The blocked person is not told.

## 7. Persistence (via fc-migration: RLS, verified-to-write, RPCs)

A sketch, to be decided in planning:
- `town_homes (owner_id pk, template, layout jsonb, visitors_allowed, updated_at)`.
  The layout is validated by an RPC (a catalogue of known items, a size cap).
- `town_items (id, kind, name_th, name_en, price, art_path)`: the catalogue,
  admin-managed.
- `town_inventory (owner_id, item_id, qty)`.
- `town_wallet (owner_id pk, coins)` and an append-only `town_ledger`, so
  every faucet and sink is auditable. Coins are **not** popoto (economy.md).
- `farm_plots (owner_id, slot, crop, planted_at, watered_by uuid[], harvested_at)`.
  Growth is computed from server timestamps.
- `pets (owner_id, rare_popoto_id, name, mood …)`. Rare popoto stay owned;
  a pet is a view of one.

Every write goes through an RPC that checks the rules (caps, server time,
ownership). Nothing trusts the browser's clock or numbers.

## 8. Living inside the site

- **A route of its own** (`/town`), with the renderer loaded only there
  (`next/dynamic` with `ssr:false` from a client component). Nothing about
  the town ships to other pages (fc-perf budgets).
- **Buildings are links** to the existing pages: the Board building goes to
  `/members`, the Gallery to `/gallery`, and so on. Members can still use
  the plain site, so the town is a front door, never the only door.
- **Assets:** texture atlases (sprite sheets) in WebP, loaded per district.
  Keep the first district under about 1.5 MB in total.
- **Frame budget:** 60 fps on a mid-range phone with 30 avatars. Pause
  rendering while the tab is hidden, and drop to 30 fps on low battery or
  `prefers-reduced-motion`.

## 9. Phones, input and accessibility

- Tap to walk, tap an avatar for its radial menu, long-press for info.
  Large touch targets for UI over the canvas.
- **A text alternative for everything:**
  - a list of who is in the zone;
  - the chat log as HTML, which screen readers can reach;
  - the building links as a normal menu.
- **Respect reduced motion:** no camera shake, and simpler animation.
- **Voice is never required:** text chat does everything voice does.
