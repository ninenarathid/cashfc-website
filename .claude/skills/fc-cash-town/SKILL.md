---
name: fc-cash-town
description: Plan, prototype and build Cash Town, the FC's future virtual town in the browser. It is an isometric world like the Thai Flash-era Zheza, where avatars walk, chat in bubbles, visit homes and pets, and talk by microphone when close (like Gather), with mini-games such as a popoto farm. Covers the vision, the architecture (2D isometric with PixiJS or Phaser, click-to-move netcode, a Cloudflare Durable Object per zone, Supabase persistence), proximity voice (WebRTC mesh or the Cloudflare SFU), mini-game and housing design, costs with a calculator, safety and phasing. Use whenever Cash Town, a virtual town or world, avatars, proximity voice, a Gather-like space, multiplayer presence, a farm, pets, housing or a mall comes up, including Thai requests like "Cash Town", "เมือง", "อวาตาร์", "เดินในเว็บ", "คุยด้วยไมค์", "แบบ Gather", "แบบ Zheza", "ปลูก popoto", "สัตว์เลี้ยง", "บ้าน".
---

# Cash Town

The FC's future virtual town: an isometric town where every member's avatar
walks, chats and visits, with homes, pets, a popoto farm and mini-games, and
where walking close to someone lets you talk by microphone.

**Status (2026-10-01): a beta is live at `/town` for every member with a
verified character** (v102; admins since v101). It has:
- one isometric district drawn with plain Canvas 2D;
- tap to walk, with the A\* path computed the same way on every client;
- **one room where everybody in voice hears everybody**, at full volume
  wherever they stand (the owner's call). Distance-based hearing is kept
  behind `PROXIMITY` in `world.ts`, with `pickLines` (nearest first, at most
  `MAX_LINES`) and its tests, for when the town grows;
- a peer-to-peer voice mesh, STUN only, no TURN relay yet;
- at most `ROOM_CAP` (30) people; the 31st is told the room is full and gets
  in by themselves when somebody leaves;
- a 📊 panel with each voice line's RTT, jitter, loss, kbit/s and path;
- **a stay that outlives the page** (`lib/town/session.ts`): another page of
  the site keeps you in town and talking, with the dock (`TownBar`) at the
  foot of every page, and others see you as "on another page" (`away`). A
  reload, or a link that loads a whole page, resumes it by itself, microphone
  included, if the tab was in town within `RESUME_MS` (a minute; sessionStorage,
  `lib/town/active.ts`), so reopened tabs never walk anybody in. Leaving is
  the town's button or the dock's ✕, or closing the tab;
- **typed chat** (`lib/town/chat.ts`): a bubble over the speaker's head for a
  few seconds, a short log over the map, and the dock's chat with an unread
  count on other pages. Never stored, cleaned on the way in and out, paced by
  room size (`chatEvery`, like `moveEvery`);
- **the page as a game screen** (redesign, 2026-10-01): the map fills the
  window under the header and runs under the phone's tab bar, with a
  fullscreen button; small controls in the corners, so chat (a slim bar, a 💬
  button on a phone) and the microphone never cover the town; wheel, pinch
  and button zoom, drag to look around (`lib/town/camera.ts`, pure and tested);
- **avatars are Lalafell paper dolls** (`lib/town/doll.ts`, `lib/town/look.ts`):
  chosen in the wardrobe (`Wardrobe.tsx`; free, change any time), drawn from
  one picture (`public/town/doll-<hash>.webp` and `doll.json`, built by
  `scripts/art/build-town-atlas.mjs`), facing the way they walk, blinking, and
  talking when their microphone hears them. A look is eleven characters in
  `Doing.look`, told to the room once the wardrobe settles (`LOOK_SETTLE_MS`)
  and kept on the device (localStorage); somebody who never chose gets a look
  of their own from their id. Profile pictures are only in the card a tap on
  somebody opens; names are on the map.

The code is in `components/town/` (`Town.tsx` the map, `TownGate.tsx`,
`TownBar.tsx` the dock, `TownDock.tsx` the few lines in the root layout that
load the dock only for a tab in town, `Wardrobe.tsx`) and `lib/town/`
(`world.ts`, `chat.ts`, `active.ts`, `look.ts` and `camera.ts` are pure and
tested; `session.ts`, `voice.ts`, `room.ts`, `doll.ts`). In `next dev`,
`window.__townView.screenOf(id)` says where somebody stands on the screen, for
scripts that tap them.
The account menu links to it. In `next dev`, `/town?townTest=A` opens a public
test room with no sign-in, and `&townCap=N` makes it full at N (production
compiles both away).

**How the room talks** (`room.ts`). Written around the Supabase plan's
limits, because breaking them is what made people drop:
- presence may be updated 5 times per 30s per person, with at most 10 fields;
- every delivered message counts towards 500 a second for the whole project,
  shared with the party board and the bell.

So:
- **presence** carries who you are (name, face, colour), once per join;
- **room broadcasts** carry what you do: `hi` on arriving (with where you are,
  your microphone, and whether you are on another page), `mv` for a
  destination (every 300ms at most, less often as the room fills), `st` for a
  change, `bye` on leaving, and `chat` for a typed line;
- **letterboxes** carry what is for one person: a private channel per member
  (`<room>:u:<id>`; anybody in the town may post, only the owner may read)
  for the replies to `hi` and the two messages that connect two microphones
  (non-trickle ICE: an offer and an answer, no candidate stream). It is
  plumbing, not a room anybody can be in.

The prototype uses Supabase Realtime instead of the Durable Object
recommended below, because the site is not on Cloudflare yet. Fine for a beta
of one room. Move to a Durable Object, which checks the session itself
(rule 4), before the town is more than that.

**Proving it still works after a change.** The scripts are in `scripts/`.
They print PASS or FAIL lines, and none prints a key, token or the room
name.

| Script | What it does | What it touches |
|---|---|---|
| `node town-e2e.mjs http://localhost:3100 <out> [two\|crowd\|all]` | Headless Chromes with fake microphones on the `next dev` test room. Two: enter, see each other, walk, voice both ways, still full volume from opposite corners, the 📊 panel, **a tab frozen 75s and a network cut 40s, recovered without a reload**. Then six: everybody hears everybody (15 lines), a seventh is turned away by a full room and gets in later, and leaving is timed: closing the tab, a killed browser, walking off to another page. 28 checks. | nothing |
| `node town-stay.mjs http://localhost:3100 <out>` | Two Chromes on the dev test room: typing both ways; another page in the same tab keeps the same stay (the dock shows, others see "on another page", voice keeps flowing); a line arriving there is counted and read from the dock, which replies; back to the map with nothing reconnected; a reload on the map and on another page each resume with the microphone; leaving from the dock is gone in 0.1s and stays gone after a reload. 24 checks. | nothing |
| `node town-live.mjs full <out> [--freeze] [--crowd N]` | Production with **throwaway verified members (not admins)**: enter the private room, talk, opposite corners, one closes the tab. `--freeze` sleeps a tab 75s; `--crowd N` fills the room to N in voice. **Refuses to run while real members are in the room** (the probes' fake microphones beep into everyone's ears); `--even-if-busy` overrides. | creates the accounts and deletes them in `finally` |
| `node town-who.mjs` | Production. How many are in the room now, and whether any are test probes. Listens without being listed, prints counts only. | nothing |
| `node town-isolation.mjs` | Production. Unverified: told no name, refused even with it, cannot post. Verified: told the name, let in, refused somebody else's letterbox but can post into it. A public channel with the same name hears nothing. | three throwaway accounts, deleted |

**Leaving, timed** (dev, 2026-10-01): closing the tab or going to another
page, gone from everybody else's town in about 0.2s, voice on or off; a
killed browser, about 5s (the room notices the dropped connection, then
`GONE_MS`), which is also what headless Chrome's `Browser.close` gives,
because it does not run the page's handlers; a frozen tab or a sleeping
laptop, about a minute, because only the server's own timeout notices
those.

**Lessons, all kept in the code:**
- **A hidden tab's keep-alive** (fixed in `df9aead`). Browsers slow a hidden
  tab's timers to about once a minute, the keep-alive misses its turn, and the
  server hangs up. The town has its own client (`townClient`) with `realtime:
  { worker: true }` and an `accessToken` callback; a watchdog rejoins if the
  room isn't back within 10s, and at once on `visibilitychange` or `online`;
  every voice line carries a `pc` id, so an offer from a new one replaces the
  old line, and a line down for 15s is replaced.
- **A goodbye has to beat the realtime client's own `pagehide`.** Phoenix,
  underneath realtime-js, hangs up the socket on `pagehide`. A goodbye sent
  after that falls back to HTTP, which the browser cancels on a closing page.
  Listeners on `window` run in the order they were added, capture or not
  (tried in Chrome), so `TownSession` adds its listener before it creates the
  town's client. `cast` never sends while the socket is down, so nothing
  falls back to HTTP quietly.
- **A goodbye hides, the room removes.** `bye` hides somebody at once; they are
  removed when presence agrees, and shown again if presence still lists them
  after `BYE_TRUST_MS` (another tab of theirs).
- **A resumed microphone may play nothing at first.** After a reload the
  microphone comes back without a tap where the browser remembers the
  permission, but playing what arrives can still need one (autoplay):
  `VoiceMesh.audioBlocked`, a "tap to hear" button, and any tap on the page
  resumes it.
- **Hello only when the letterbox is open.** The replies to `hi` go there; one
  sent before it opens is lost, and a newcomer who missed who has a
  microphone on would hang up on every line the others opened.

The tests run on one machine, so they prove signalling and media but not NAT
traversal. The owner and Aqua talked across their own networks, so P2P worked
for them; some mobile networks will need TURN.

The planning sections below still apply to everything beyond the prototype.

Read [references/vision.md](references/vision.md) first: where the idea comes
from (a member's proposal in feedback #12, and the owner's direction), what
Zheza and Gather do well, the proposed pillars, and the open questions.

## Rules that hold from day one

1. **The site stays fast.** The town lives at its own route with a
   lazy-loaded bundle. Nothing about it ships to other pages (fc-perf).
2. **The town is a front door, not a second site.** Buildings link to the
   pages that exist, and the plain site keeps working for whoever prefers it.
3. **Reputation is never currency.** Popoto received is gratitude and is
   never spent. The mall, seeds and decorations use a separate earned
   currency. Rare popoto become pets without being consumed (fc-game-design
   economy.md).
4. **Server authority.** The room server decides movement and chat. The
   database decides growth, harvests, rewards and caps, from server time.
   The browser is never trusted with a number.
5. **Safety by default:**
   - Only a verified character can enter, talk or build (v85).
   - The microphone starts off, and joining voice is a choice.
   - Mute, block and report are always one tap away.
   - Nothing is recorded.
   - Private areas really are private.
6. **Kind game design.** Nothing dies or decays while you're away. No
   streaks to lose. Competition is opt-in, and pet fights never cost a pet
   (fc-game-design).
7. **The cost is checked before shipping anything realtime.** Run
   `node .claude/skills/fc-cash-town/scripts/town-cost.mjs` with the
   expected numbers. Click-to-move, a Durable Object per zone and the
   Cloudflare SFU keep it near the 5 US dollars a month the Cloudflare move already
   pays. Streaming positions over Supabase Realtime does not work at all
   ([references/costs.md](references/costs.md)).

## Recommended defaults (decided in the spike, not here)

| Decision | Default | Why |
|---|---|---|
| 2D or 3D | **2D isometric** | the Zheza feel, phone-friendly, light; the admin's lag worry |
| Renderer | **PixiJS v8 or Phaser 4**, picked by a one-evening spike | Pixi is lean (WebGPU first); Phaser is a full framework (stable since 4.0, April 2026) |
| Map editing | **Tiled** (isometric) → JSON | non-programmers can build districts |
| Movement | **Click or tap to move, deterministic A\*** | one message per click instead of a stream |
| Room server | **A Cloudflare Durable Object per zone**, with WebSocket Hibernation | it fits the Cloudflare move; outgoing messages free; idle costs nothing |
| Lasting state | **Supabase tables + RPCs** (fc-migration) | RLS, the verified rule, auditable |
| Voice | **Mesh P2P with proximity for the spike and phase 1 → Cloudflare Realtime SFU** when groups grow | free to start; scales without changing the proximity logic |
| Sign-in | **The Supabase JWT verified in the Worker,** plus a verified-character check | one identity across the site and the town |

The details: [references/architecture.md](references/architecture.md) (the
shape, iso maths, netcode, a Durable Object sketch, auth, tables, budgets) and
[references/voice.md](references/voice.md) (mesh or SFU, who hears whom, Web
Audio distance, phone quirks, safety).

## Workflows

### A. When the owner says "let's plan Cash Town"

1. **Answer the open questions** in vision.md together: who enters, the peak
   number of people, whether voice is in v1, the avatar style, the art
   pipeline, phone or desktop first, moderation, the currency, pets and
   fights, and the budget. Ask in one batch, and propose defaults.
2. **Fix the pillars** (three or four) and the MVP. The MVP is the smallest
   thing that's fun: one district, avatars walking, name tags, chat bubbles,
   and buildings that link to pages.
3. **Run the cost model** with their numbers, and show the table.
4. **Write the plan** with the GDD template below.
5. **Shape each system** with fc-game-design: the farm, homes, pets, the
   mall. Use [references/minigames.md](references/minigames.md) as the
   starting designs.

### B. A tech spike (the first code)

Its goal is to answer "is it smooth on a mid-range phone, and what does an
hour cost?" before building features.

1. Build a throwaway route or a separate worktree, never shipping by
   accident. Use one Tiled district, with 20 fake avatars wandering by
   click-to-move.
2. Run a Durable Object zone on `wrangler dev`. Open two browsers; then 20
   fake clients from a script.
3. Measure:
   - fps on a phone (Chrome remote debugging), and memory after 15 minutes;
   - the size of the first-load bundle;
   - the messages per minute;
   - for voice: mesh between two phones, with delay, echo and battery.
4. Report a table of numbers against the targets (60 fps with 30 avatars,
   about 1.5 MB on first load, no audio dropouts), and a recommendation:
   Pixi or Phaser, mesh or SFU.

### C. Building a phase

**The phases:**

| Phase | What it adds |
|---|---|
| 0 | the spike |
| 1 | one district, presence, chat, links |
| 2 | proximity voice and private areas |
| 3 | homes and decoration |
| 4 | the farm, pets, the mall, and the coins economy |
| 5 | mini-games and seasonal districts |

**Each phase:**
- ships admin-only first, then to volunteers (fc-game-design's playtest
  guide);
- runs through fc-security (voice, uploads and chat are new attack surface);
- goes through fc-migration for tables;
- gets the fc-perf budget checks.

## Output: the plan (GDD-lite), in Thai when the user writes Thai

```
# Cash Town — แผน <phase>
**เสาหลัก:** 1… 2… 3…
**MVP ของเฟสนี้:** … (what a member can do, in one paragraph)
**ประสบการณ์ 2 นาที / 30 นาที:** what a quick visit feels like, and what a long one does
**ระบบ:** each system with its loop, its economy and its knobs (via fc-game-design)
**เทคนิค:** renderer · room server · voice · tables · auth (decisions + why)
**ตัวเลขเป้าหมาย:** fps / first-load MB / people per zone / monthly cost (from town-cost.mjs)
**ความปลอดภัย & ความเป็นส่วนตัว:** who enters, mic defaults, block/report, moderation
**งานศิลป์:** list of sprites/tiles/UI with the pipeline
**ความเสี่ยง:** top 3 and what we do if they happen
**แผนทดสอบ:** admin → volunteers → everyone; the signal after 2 weeks
```
