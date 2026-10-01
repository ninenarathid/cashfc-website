# Mini-games and town systems

Design each with the fc-game-design skill (loops, economy, ethics); build
each with fc-migration (tables and RPCs) and fc-security (server
authority). These are starting designs, to be decided in planning.

## The popoto farm (the owner's example, and the best first mini-game)

**The fantasy:** "My little potato patch, which my friends help me grow."

**The loop:**
1. **Plant** a seed in a plot. Seeds cost coins, or a free daily seed.
2. **Wait** in real time, 4–24 hours by crop.
3. **Friends water it.** One watering per friend per day, which shortens the
   time or improves the yield. This is the social heart: a reason to visit
   each other's farms, the way popoto is a reason to visit pages.
4. **Harvest:** coins, a cosmetic, sometimes a rare seed.
5. **Plant again.**

**The rules that keep it healthy:**
- **Nothing dies.** A crop waits, ripe, until harvested: no punishment for
  having a life. Ripe plants can glow, inviting without nagging.
- **Growth is computed** from `planted_at` and the server's time. The browser
  never says "it's ready". Watering is an RPC that checks one per friend per
  day and that the plot is a friend's.
- **A few plots,** for example three, with more as horizontal progression.
  This caps the coin faucet per day (economy.md).
- **Crops can echo the rare popoto flavours** (pizza potato, chocolate
  potato), which reuses the art and the lines, and they can unlock
  seasonally.
- **No notifications** except one optional "your crops are ready",
  respecting the bell's mute groups.

**The data:** `farm_plots (owner_id, slot, crop, planted_at, watered_by,
harvested_at)`. A crop catalogue holds the grow time, yield, art and season.

## Housing (from the member's proposal)

- **Apartment buildings** list the homes inside them. Entering a home leads
  to the owner's room scene, and the door shows their profile link.
- **Templates:** pick a room shape, then place catalogue items on the grid.
  The layout is stored as JSON and validated by an RPC (known items only, a
  count cap, inside the bounds).
- **Visiting:** open, friends only, or closed. A guestbook gets one line per
  visitor per day (moderated like comments). "Leave a popoto" uses the
  existing popoto, not a new one.
- **Expression is the reward:** featured homes in a weekly showcase,
  opt-in.

## Pets (from the member's proposal)

- **A rare popoto the member owns can come out as a pet** that follows their
  avatar. The rare popoto is not consumed and stays in the showcase (economy
  rule one).
- **Cosmetic care only:** accessories, tricks, a name. No hunger meter that
  punishes absence, and no pet that gets sad or runs away.
- **The pet shop** sells accessories and toys for coins (a sink).

## Pet fights (from the member's proposal, handle gently)

- **Opt-in and friendly:**
  - a challenge must be accepted;
  - nothing is lost, ever: no pets, coins or rank taken;
  - a win gives a small cosmetic or bragging rights.
- **Turn-based or auto-battle** keeps the netcode simple. The Durable Object
  runs the fight deterministically from a seed, and both sides replay it.
- **Fairness:** stats come from things that are fair to everyone (training
  through play, not rarity tier), or tiers are matched. A UR pet must not
  make an SR owner's pet worthless.
- **Consider whether a cooperative version** (pets team up against an NPC
  boss) fits the FC better. It is positive-sum.

## The fashion mall (from the member's proposal)

- **Cosmetics** for avatars and homes, bought with **coins**. Never with
  popoto received, which is gratitude; see the economy rule.
- **Seasonal lines,** with the restaurant and FFXIV festival themes. Rotate
  them, but don't make them "gone forever" fear-of-missing-out; they return
  in later years.
- **Gifting** an item to a friend is social, and a nice sink.

## The mini-game zone

**Short, skill-light and replayable,** a minute or two a round:
- catch the falling potatoes;
- a quiz from the site's own data (which duty is this map);
- a fishing pond;
- a rhythm tap.

**The rules:**
- **Rewards:** coins with a **daily cap**, so playing a lot is fine but
  grinding doesn't pay.
- **Scores are checked on the server** for plausibility. A round sends its
  inputs or its duration, not just a score.
- **Boards:** a weekly friendly board per game, reset every week, and
  opt-in. Celebrate the personal best more than the rank.

## The buildings as the site's pages

| Building | Leads to |
|---|---|
| The Kitchen (the FC board) | `/members` |
| The Notice Board | announcements, `/events/[id]` |
| Photo Studio | `/gallery`, and the contest hall during festivals |
| Party Square | `/party` |
| Hall of Fame | `/leaderboards`, the popoto rankings |
| Aqua's Bank | the wallet and prizes (`/profile`) |
| Post Office | feedback to the admins |

The town makes the site's map a place. It replaces nothing.
