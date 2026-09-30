# Lenses for finding ideas, with seeds

Each lens is a way of looking at the site, followed by seed ideas that build
on what exists. The seeds date from 2026-10-01: check `git log` before
proposing one, because it may have shipped, or been decided against.

## 1. Celebrate what the pipeline already knows

The pipeline sees clears, parses, level 100s, new mounts and new members
every day, and the feed shows them in English to nobody in particular.

- **Cheer the feed.** Let members react to feed events with a popoto or an
  FC emote. The member gets one gentle notice ("12 people cheered your M12S
  clear"), batched, in the popoto mute group.
  - Builds on: the thread reactions and the bell.
  - Events have no ids of their own, and `feed.json` keeps about ten days.
    Key a cheer by `date:type:character_id`, knowing two events can share a
    key, or persist the feed in a table first.
- ~~The feed in Thai.~~ **Decided against:** the English is deliberate
  (ActivityFeed.tsx), because it names bosses, jobs and mounts.
- **Milestone cards.** A first ultimate, 500 mounts: an OG card, and the bot
  posts it to Discord with a "send popoto" link.
  - Builds on: the OG routes, the bot.
  - It needs a channel of its own, because the party channel's sweep deletes
    other bot posts.
  - Fix the `level_100` quirk (a job switch counts) before celebrating level
    100.
- **FC Wrapped ("ปีนี้ของเรา").**
  - Per member: popoto given and received; parties joined, and who they
    partied with most; clears; glamours entered; rare popoto opened.
  - FC-wide: the same totals for everyone.
  - As story-like share cards, at year end or on the FC's anniversary.
  - Computed in the pipeline or an RPC, so it's cheap to serve.
- **Anniversaries.** "Joined the FC a year ago today", drawn beside the
  birthday strip. No join date is stored today (`new_member` events roll off
  with the feed), so step one is the pipeline recording "first seen" from
  now on. The first anniversaries arrive a year later.

## 2. Make kindness mean more (popoto)

- **A popoto with a note.** An optional ≤80-character thank-you ("ขอบคุณที่แบก
  M11S นะ") that shows on a "thank-you wall" on the receiver's page, which
  they can hide.
- **Thank the whole party.** After a party is marked a success, one tap
  throws a popoto to everyone in it: the throw animation with several
  targets, then a group memory card.
- **An FC goal of the week.** For example, 300 popoto from 30 different
  givers unlocks a site-wide treat: a seasonal skin, a new flavour, or one of
  Aqua's bonus draws. Everyone pulls together, and the per-pair daily cap
  keeps farming out.
- **Secret Popoto** (a Secret Santa for the Starlight Celebration).
  - Sign up, get assigned someone at random (by an RPC), send popoto and
    notes all week, and a reveal day.
  - An in-game gift is optional.

## 3. Play together (parties)

- **Party memories.** A successful party becomes a memory card: who, what,
  when, and the group photos. It appears on each member's page and in a
  year-end reel. Success or fail, and group photos, already exist; only the
  card and the reel are new.
- **Sprout buddies.**
  - New players (the sprout flag) are paired with volunteers. The LFG option
    "Happy to teach" and the party kind "Find Mentor" already exist; the
    pairing and the checklist don't.
  - A first-week checklist: join a party, send a popoto, post a GPose.
  - A small badge at the end.
- **Roulette crews.** A light party template for daily roulettes at the times
  members' availability overlaps.
  - Builds on: the party finder, SeatSuggest, the availability grid.
- **Treasure map nights, and FC-wide hunts** ("the FC together found every
  map in 7.x"), from `lib/treasure.ts` and the playstyle data.

## 4. Express yourself

- **Lighter glamour moments** between festivals: a theme of the month, or a
  "glamour roulette" that picks a random theme to dress for. Reuse the
  contest engine with a lighter setting; Aqua decides whether it's hers or
  runs itself.
- **Gear lists on looks.** Aqua hasn't answered yet; ask before building.
- **Housing tours.** An opt-in "my house" pin (ward and plot from
  `lib/housing.ts`), a tour-night party kind, and gallery posts tagged with
  the house.
- **Photo prompts.** A weekly prompt ("sunset in Tural") that runs itself
  from a list written for the season, with a small bonus in Hot.
- **Profile frames and stickers** earned from events, shown on the member
  page. Builds on the badges and the accent theming.

## 5. Surprise and delight

- **Seasonal skins, switched on by date:**
  - All Saints' Wake: a pumpkin popoto pose and a spooky accent;
  - Starlight: snow on the header and gift-wrapped popoto;
  - Songkran: the throw splashes water;
  - Loy Krathong: a krathong popoto floating on the home page.

  Tiny assets, reduced-motion aware, no admin work once drawn. Cheap, and
  everyone sees them.
- **Hidden popoto.** Once a day a small popoto hides somewhere on the site,
  on a different page for each member. Find seven during an event for a
  rare flavour. It is client-side, plus one RPC to claim.
- **Flavours designed by members.** A flavour design contest on the contest
  engine; the keeper picks, and the winner's line ships with the flavour.
- **A kinder 404.** A lost popoto that throws you back home.

## 6. Rituals and seasons

- **An events calendar** (revives the parked `/events` index):
  - FC events (community parties), FFXIV seasonal events, patch days and
    birthdays, in one calendar;
  - an "I'm going" button, and the bell an hour before (`party_soon`
    already exists);
  - the party finder is the engine.
  - Keep `/events/[id]` working: those are the announcement permalinks
    shared in Discord.
- **Patch-day hype.** A countdown on the home page, a patch-night party
  board, and after the patch "who cleared the new fight first" in the feed.
- **A Monday card.** The bot posts a short weekly card to Discord: new
  members, clears, the week's top glamours, parties run, and a link. It
  reaches members who rarely open the site, with no admin work. It needs its
  own channel, as above. The glamour contest's announcement on Discord is
  still on its "not built yet" list, and would be the natural first post.

## 7. Welcome newcomers, bring back vacationers

- **The welcome wagon.** A `new_member` event pings the volunteers (mentors)
  with a one-tap popoto. The feed already says "joined the FC — welcome!",
  and a sprout badge exists; the pings and the volunteers are new.
- **"X is back!"** When someone "On vacation" shows signs of play again (a
  level, an achievement), the feed says so and friends can throw a popoto.
  Opt-out, and never show absence durations.
- **Slash commands** for Discord-only members: `/popoto @user`, `/party`,
  `/me`. The bot has none yet, and the Discord ↔ profile link already exists
  through sign-in.

## 8. Games (revives the parked `/games`)

- **A daily Eorzea quiz.** One question a day with three choices, generated
  from data the site already holds: which duty is this map from (the duty
  art in `public/duty`), which mount, whose glamour.
  - A popoto reward, and a forgiving weekly board.
  - No admin upkeep.
- **FC bingo.** A monthly 5×5 card of FC things: party with someone new,
  send five popoto, post a GPose, finish a roulette.
  - Squares are checked automatically wherever the data allows.
  - A line earns a draw ticket, the Evercold mechanic again. Its window is
    hard-coded in `lib/evercold.ts`, so generalise it first.
- **Live raffle night.** Aqua spins a live wheel during an FC event, and
  everyone watching sees it land at the same moment (a Supabase realtime
  broadcast, only for that hour).
- **FC trading cards** (a big one).
  - Every member has an auto-generated card: portrait, job, a title rarity
    for the card's rarity.
  - You collect a friend's card by partying with them, or trading popoto.
  - Your collection is a picture of your friendships.
  - Weeks of work; propose it as a season-long event.

## 9. Help and learning

- **Open the guides to everyone,** once the M9S draft is ready. Add
  collaborative prog notes per boss, with a popoto for helpful notes.
- **Ask the FC.** A small Q&A board where a helpful answer earns popoto.
  Keep it light; Discord handles quick questions.

## 10. The market (admin-only, parked)

It is planned in four phases, around HQ popoto and gil. Keep it in-game
gil only, with trades completed in the game. Never real money. Ask the user
before reviving it.
