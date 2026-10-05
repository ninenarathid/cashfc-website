# What the site has: a map for building on it

Surveyed 2026-10-01. The site ships almost daily; check the code and
`git log` before relying on a line here.

## People

- **The roster** (`data/history.json`): 509 characters, about 164 active,
  345 with the in-game rank "On vacation", and 15 guests.
- **Tags:**
  - private 226
  - veteran 155
  - extreme 143
  - ultimate 119
  - tier-clear 42
  - prog 23
- **Roles:**
  - **Admins:** two, via `profiles.is_admin`. AdminSwitch previews the
    member view.
  - **Aqua (Aqua Eleison):** runs the gil and the prize events and hands
    prizes over in game. She runs the festival contests. She is drawn on the
    prize cards: coin shower, purse, black card.
  - **The popoto keeper:** writes the rare flavours and sets the odds. Kept
    secret even from other admins.
  - **Verified members:** proven with a Lodestone code. Only they may give
    popoto, post, vote, enter or join parties.
  - **Guests:** verified characters outside the FC.
  - **Pending:** claimed, but not yet picked up by the pipeline.
- **In-game ranks, restaurant themed:** Dishwasher, Sous Chef, Chef de
  Cuisine, Chief de popoto, Food Raider, Chef Toumant, Taster, Table Cat,
  On vacation.

## Pages

- **`/`:**
  - the hero with counts, and the domain vote;
  - an EventSlider of FC announcements, with comments;
  - the Discord widget, Birthdays (today plus 7 days), a HotGallery strip,
    TopThree;
  - the latest update, the ActivityFeed (30 events), and a Timeline (news
    and FC posts).
- **`/members`:**
  - charts: a tag donut, parse buckets, a prog board, history;
  - a filterable board, with the list or a "kitchen" view by rank;
  - a popoto button on each row.
- **`/member/[id]`:**
  - the header in the member's own colour, portrait, cover, bio, LFG,
    birthday and nameday;
  - popoto (the throw), who gave, share and tell buttons;
  - badge plaques, the rare-popoto showcase;
  - raid cards, jobs, the MSQ, the sprout badge for new players;
  - RareShelf (FC percentile), the availability grid, and their pictures.
- **`/gallery`:**
  - a GPose wall with Hot, Newest and Most popoto;
  - multi-picture posts, popoto, comments, photo tags (the tagged person
    agrees), one open poll;
  - the glamour contest as a second view.
- **`/party`:**
  - the party finder: 17 content kinds, a seat grid with roles, job rules,
    invites and requests; the lead moves people;
  - a progress track and a loot plan; map, roulette and place pickers;
  - chat with mentions; SeatSuggest; weekly reposts; statics;
    success/fail with group photos;
  - polls: the lead asks the party a question with 2 to 10 choices (one
    answer or several), any verified member answers under their name, and
    everybody in the party is told (v136);
  - the Japanese PF text helper; realtime.
- **`/leaderboards`:** two popoto boards and eight playstyle boards
  (crafter, gatherer, relic, explorer, treasure, Gold Saucer, seasonal,
  PvP), graded Legendary, Master and Expert.
- **`/profile`:**
  - settings: nickname, birthday, bio, colour, LFG, the availability grid,
    pictures;
  - the rare-popoto inventory and unwrapping, the wallet, prizes, tags to
    confirm.
- **`/events/[id]` is live:** it is each announcement's permalink, with an
  OG card. Anything new at `/events` must keep these URLs working.
- **Parked (404 on purpose):**
  - the `/events` index (planned: a calendar, sign-ups, recaps);
  - `/games` (planned: a live raffle, an FFXIV quiz or bingo, an event
    leaderboard);
  - `/compare`.
- **Admin-only works in progress:**
  - `/guides` (one draft, M9S);
  - `/market` (a price preview; four phases planned: an HQ ledger,
    listings, rare-popoto trading, an FC shop).
- **Admin:** `/admin` (the inbox, prizes, claims, Evercold reports, badges,
  rare switch, the log), `/admin/aqua` (her desk), `/admin/contest`.

## Systems to build on

- **Popoto:**
  - one per sender→receiver per day, resetting at 07:00 Thai time;
  - the throw animation lands as a hug;
  - five poses: popoto, heart, sleep, fly, hug.
  - Gallery popoto are a separate book, split between the poster and the
    tagged members.
- **Rare popoto:**
  - a small chance on a send (`popoto_rare_switch`);
  - R, SR and UR tiers;
  - flavours carry lines written by members, credited;
  - it arrives wrapped and is opened with a full-screen reveal;
  - up to 10 can be shown on a member's page.
- **Prizes and the wallet:**
  - the cupboard of prizes has chances, triggers (give, receive, daily),
    audiences, stock, and costumes and effects;
  - gil adds up in a wallet with a 250k cash-out;
  - Aqua hands prizes over in game through a claim thread.
- **Evercold** (09-09 → 10-09): one ticket per day of giving popoto, and a
  draw at the end.
- **Badges:** made by admins, drawn as foil plaques in four metals.
- **Glamour contest** (shipped 2026-09-30):
  - per-festival settings, one look per person, voting by popoto;
  - hidden names until the result;
  - comments on looks, a podium and awards;
  - an OG card, and a desk on Aqua's page.
  - **Contests 1 and 3 are admin-only sample drafts** full of fake looks from
    eight sample accounts. A real festival contest is created fresh, or
    after clearing the samples. Never publish a sample.
- **Activity feed** (from the pipeline): new member, parse up, boss, ult or
  ex clear, grade up, job up, mounts, minions, rare achievements, level 100.
  Nobody can react to it.
  - **English on purpose:** it names bosses, jobs and mounts
    (`components/home/ActivityFeed.tsx`). Don't propose translating it.
  - **No event ids:** `FeedEvent.id` is the member's character id.
    `data/feed.json` keeps only the newest 200 events (about ten days). A
    reaction needs a synthetic key such as `date:type:id`, which is not
    unique (one member, two jobs to 100 on the same day), or a feed that is
    persisted.
  - **A quirk:** `level_100` also fires when someone switches to a job that
    is already at 100, because the roster shows the worn job's level. About
    77 of the 200 current events are `level_100`. It is a pipeline bug worth
    fixing before celebrating level 100.
- **Pipeline facts that matter for ideas:**
  - Rank, level and the worn job come from the FC roster pages, for every
    member, every run.
  - `last_change` is computed but never shown.
  - The snapshot has no `rank`, so "X is back from vacation" needs that one
    field added.
  - **No join date is stored anywhere.** `new_member` events roll off with
    the feed. Anniversaries need the pipeline to start recording "first
    seen".
- **Birthdays** deliberately leaves out members on vacation (the component
  explains why).
- **Evercold's window is hard-coded** in `lib/evercold.ts`. Prizes have an
  `active` switch but no date window. Generalise both before reusing them
  for a seasonal event.
- **Notifications:** about 30 kinds, mute groups (popoto, wallet, party,
  comments), a poll every 90s, toasts, and a count in the tab title.
- **Wants:** a "looking for a party" card that matches you against parties,
  using your availability.
- **Threads:** one message model for posts, announcements and looks.
  Reactions, FC emotes and stickers, YouTube.
- **Discord bot:**
  - one self-updating party board, with a pick menu that gives join and
    leave buttons;
  - "wants" matches.
  - **No slash commands.** The interactions route handles only PING and
    component clicks.
  - **Its own channel for anything new.** On every 5-minute tick, `sweep()`
    in `app/api/discord/board/route.ts` deletes every bot message in the
    party channel except the board. Any new kind of bot post (news, milestone
    cards, a weekly card) needs its own channel and an env var for it. Its
    links must come from the site's canonical URL (`lib/site.ts`), because
    the domain is moving.
- **The pipeline:** Lodestone, FF Logs, FFXIV Collect, Lalachievements,
  every 4 hours plus daily extras. Each member has many fields (see
  `lib/types.ts`).

## The voice

Thai is warm and casual (นะ, หน่อย); English is plain. 🥔 is the currency
and the running joke; the restaurant is the theme. Game terms stay English.
