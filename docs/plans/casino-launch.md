# Popoto Casino

**Since 2026-10-27 (v299) the LIVE casino is a room of the town**, walked into by the kura's door in the editor's town
(lib/town/casino-room, drawn by lib/town/casino-room-art, its sheet components/casino/CasinoInTown): no other address.
`/town?map=casino` is the town. The TEST room keeps `/town?map=casino-test` (Nine and Aqua) for rehearsing settings.
Admin desks: `/admin/aqua/casino` (TEST), `/admin/aqua/casino-live` (LIVE); the Aqua page has the casino's switch.

- **Who may spin** (`casino_live_settings.access`): `closed` (the kura is a storehouse like any other), `admins` (the
  admins walk in at any hour, may force any result, every spin is marked a test and never announced; the Aqua page's
  "ล้างผลทดสอบ" undoes them: coins, stock, Gil set aside, counts, prize rows with their threads and bells, wallet
  payments), `everyone` (members with a proved character, within the event's hours). `open` is kept equal to
  `access = 'everyone'`. The door is read by each page as the town opens, every minute it is in sight, and at a tap
  on the door. A tester who withdrew trial Gil from the wallet: the wipe takes back only what came after the
  withdrawal and says how much was withdrawn (that 'เงินสะสม' row is the admins' to settle).
- **Told to the town** (the owner, 2026-10-27: "ถ้ามีคนได้ รางวัลใหญ่ ให้ประกาศทั้งเมืองเลย แต่ตอน admin test ยังไม่ต้องประกาศก็ได้"):
  a win of a prize ticked "ประกาศ" at the desk is the town's banner and a line in its chat, as the reels stop; a test
  win never is.
- **Where a win goes:** a thing to hand over (physical) is a row of `prize_wins` (draw `casino`) with the winner's
  `prize_win` bell: they claim it and talk with the admins in the site's 1-1 prize thread (claim_prize, prize_messages,
  deliver_prize), and the admins see it on the Aqua page's list of winners and in /admin's prizes. Gil goes into the
  winner's wallet (credit_wallet), as every Gil prize of the site does. Coins go into the town purse. No casino receipt
  (Event bag) is written any more.
- **Six prizes:** the four symbols, the `evercold` (a fifth symbol, an ice crystal: `icons-casino-a`, cut into the
  casino's own small picture `public/town/casino/icons-*.png` + `lib/town/casino-reels.json`), and the `pair` (the
  first two reels alike and neither of the others: coins back, a coin prize always). A miss never shows its first two
  reels alike. Coins paid back must average under the price (the save refuses otherwise: the town must not inflate).
- **Load:** a spin is told to the private channel `casino-live` as it is written (`casino.hint`), with what a page draws
  of it; a page reads the whole state again only for its own spin, somebody's win, or a change of settings, spread over
  a moment. The casino's tables left the change feed. Measured before: every spin made every page in the room read
  everything again, some fifty reads a second at forty players and five machines.
- **Tried:** `scripts/db/v299.test.mjs` (81 checks; 17 of 17 breaks), `scripts/town-casino-db.mjs` against the stand-in
  started from the bench kept after v296 (`town-bench.mjs` with `BENCH_FROM`), at 1280x860, 384x730 and 360x640.

What follows is the casino as it was built on 2026-10-11, as a map of its own; where it differs from the above, the
above is now.

Entry routes (until v299): `/town?map=casino-test` (Nine and Aqua only), `/town?map=casino` (LIVE).

TEST shares a volatile ledger through the private `casino-lab` Realtime room. Authentication and profile checks read Supabase; gameplay, settings, credits, spins and receipts never call database mutation RPCs. Keep at least one TEST tab open to retain the rehearsal. Closing every tab starts a new room with 20,000 test coins per tester, from the last saved settings and prizes that browser saw (`casino-test-setup` in local storage; prizes unissued). TEST announcements are confined to the room.

LIVE uses server-authoritative commands and the existing Cash Town purse locking contract. The five machines share one short database lock for stock, budget, settings revision and idempotent requests. Prize snapshots retain the configured announcement flag even if settings later change. External items and FFXIV Gil create unique Event bag receipts; fulfilled/cancelled receipts stay in history. Coins pay directly into the town purse. LIVE never accepts forced results or grants test credits.

Install SQL v204 followed by v206; both can be rerun without deleting records. If v204 is rerun later, rerun v206 afterwards to restore the LIVE schema grants. v206 starts closed. The initial 100m Gil budget is an award ceiling, not a transfer of money into player wallets. Keep LIVE closed until the organiser approves the settings. When ready, change **เปิดรับการหมุน** at the LIVE desk. The town entrance then appears without another deployment. After the event, deactivate external prizes, configure coin prizes and the per-player allowance for ordinary play.

Weighted odds cap each prize by stock and available Gil budget; depleted probability becomes a miss. A finite pool samples remaining tickets without replacement and requires sufficient budget for its entire active stock. Finishing the pool awards all configured active stock; an incomplete event does not guarantee every prize will be drawn. Rates and stock are visible to players.

Admins can open **จำลอง** beside the spin button directly in the game. Desktop shows the simulator beside the playable slots; phones keep both in the same scrolling game window with **กลับไปเล่น** to return. The count defaults to 100 with an editable range of 1–10,000. It forecasts aggregate event play from the room's current settings, remaining stock, committed Gil and pool draws. Each run starts from those values, stops when a finite pool ends, and reports wins/misses, Coin spent/awarded, Gil awarded/remaining and per-prize stock. Player balances, quotas and opening hours do not constrain this event forecast. It runs locally without issuing spins, receipts, announcements or wallet changes. Results are marked outdated when configuration or committed stock changes.

The interior is assembled from native isometric ground geometry, collision footprints and separately sorted sprites. Walls, cabinets, stools, sofa, counter and plants share one generated atlas with native pixel dimensions; there is no room JPEG. Static geometry is cached at world scale. Lamp light and award confetti originate at their fixtures and cabinet windows. Reel symbols have native 8-pixel and 16-pixel representations so they remain legible in the cabinet and UI.

Final assets are the six PNG sprites under `public/town/casino/v2`. Source atlases and retired concepts remain in the local art audit, outside the shipped public folder. Generation briefs and reference are recorded in `casino-art-prompts.json`.

The original inventory has an Event compartment; pending vouchers and historical fulfilled/cancelled vouchers use that compartment. Reception contains Aqua settings, sound and TEST tools. The ordinary town HUD remains unchanged, apart from the map label and room result button. On mobile the play sheet leaves the seated avatar and neighbouring machines visible, with a smaller layout on short phones. Floor taps leave the stool, and the entry steps return to the village.

TEST does not persist wardrobe, notes, pins, music, SFX, UI preferences, game purses or the local shared warehouse. Missing memory keepers fail closed. Two local admin QA logins are isolated from the owner's browser session.

Validation: Vitest covers volatile stock, requests, claims, finite pools and paths; PGlite exercises the SQL permission and award boundaries. Browser QA uses isolated login sessions for the existing two testers and private production Realtime, with all gameplay kept in TEST memory. No real wallet is credited or debited during browser QA.

The Casino map mounts the actual `Town` component with a scenery adapter. `TownSession` owns movement, sitting, avatars, chat, voice and the complete original HUD, inventory, wardrobe and menu. The map renderer uses Town's frame loop and avatar painter. TEST supplies a memory-only native keeper; its coin display follows the volatile casino ledger. The Event compartment uses the original inventory window without consuming normal item slots. Native addressed messages share the authorised `casino-lab` channel, so no extra database policy or gameplay migration is needed. Admins see the Casino entrance even while LIVE stays closed; returning explicitly to `?map=town` opens the village session.

Polish validation (2026-10-11): 36 tests passed across casino contracts, native memory isolation, warehouse, camera and walking. The production build passed after integrating the latest equipment changes. Two separate admin browser sessions verified shared chat, native walking/seating, same-stool reopening, win and miss visibility, the Event inventory tab, voucher request/fulfilment/history, per-prize announcement settings, and layouts at 390×844 and 320×568. A controlled TEST round left all 46 inspected game tables unchanged; real town purses and local game preferences also remained unchanged. LIVE stayed closed with no issued spins, reservations or announcements.
