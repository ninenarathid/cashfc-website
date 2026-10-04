# The town's migrations, dry-run

The game's rules are pure TypeScript in `lib/town/` and are kept, for now, by the browser's trial. Before it opens
they become database functions (fc-cash-town rule 4, and the fc-migration skill, which says how a migration is written
and tried). Each migration's dry run lives here, beside the others, so that the next one can build on them.

Run one as the fc-migration skill says (a scratch folder with PGlite and its harness, these files copied in):

```bash
SP="<scratchpad>/pgtest"; mkdir -p "$SP" && cd "$SP" && npm init -y >/dev/null && npm i @electric-sql/pglite@0.5 \
  && cp E:/NinenineProject/fcnext/.claude/skills/fc-migration/scripts/*.mjs E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/db/*.mjs . \
  && node v105.test.mjs && node v110.test.mjs && node v111.test.mjs && node v112.test.mjs && node v113.test.mjs && node v114.test.mjs \
  && node mutate.mjs "E:/NinenineProject/fcnext/supabase/v105_the_banker_opens_his_ledger.sql" v105.test.mjs v105.mutations.mjs
```

| Migration | What it keeps | Dry run |
|---|---|---|
| `v105_the_banker_opens_his_ledger.sql` (ran 2026-10-03) | Popoto coins (`town_purses`), the popoto changed into them (`town_exchanges`), the rate and the week's limit (`town_knobs`); `town_bank()`, `town_exchange(kind, n)`. Adds only; opens nothing. | 47 checks; 18 of 18 breaks caught |
| `v106_the_uncle_keeps_his_books.sql` (ran 2026-10-03) | The catalog (`town_catalog`), a purse's document, the village's things (`town_things`: stall, village, found); the schema `town` with the rules of the bag, the stall, the uncle's order and his hints; twelve functions a browser calls. | 80 checks (6,540 rule cases); 23 of 23 |
| `v107_a_meal_takes_five_minutes.sql` (ran 2026-10-03) | Stamina, meals and their buffs, a scroll read; a meal left running is finished when the purse is next read. | 37 checks (5,052 cases); 16 of 16 |
| `v108_a_line_in_the_water.sql` (ran 2026-10-03) | A line that is out (`town_lines`) and the record of every go (`town_plays`): what bites is decided here and told only at the strike; the strike is judged by this clock; a landing is believed only after half the quickest fight there could be. | 80 checks (3,668 cases); 25 of 25 |
| `v109_the_uncle_stocks_up.sql` (ran 2026-10-04) | No function: seven catalog rows written over what was seeded, for what the code gained after v106–v108 ran (the dishes of other countries, a scroll for every dish, a pot that fetches nothing). | 73 checks (every case of v106–v108, made again from the code as it is now); 5 of 5 |
| `v110_a_seed_in_the_ground.sql` (ran 2026-10-04) | Every plot that is no longer weeds (`town_plots`), whose each bed is (`town_beds`), the well (a row of `town_things`); the farm's rules (a plant's five stages by this clock, pests worked out and never kept, a bed the first sower's, water from the river to the well to the can); `town_farm(since)`, `town_tend(x, y, timing)`, `town_chore(x, y)`. The tile stood on and the hoe's misses are the browser's word, the misses bounded. | 128 checks (16,008 rule cases); 48 of 48 |
| `v111_a_pot_on_the_fire.sql` (ran 2026-10-04) | The kitchen: the pots that stand about (`town_pots`), who found each recipe first (a row of `town_things`), what a member has made and how often they missed a recipe by its last thing (their purse). Cooking with its taste, a pot set down, ladled from (a bowl to a helping) and gone with its last, a helping from one's own pot, what the river's finds hold. v107's `chew`, `get_up` and `settle` written again for the bowls; five catalog rows written over (no dirty pot, nothing to wash one with). `town_kitchen`, `town_cook(things, crew, timing)`, `town_pot_down / ladle / take`, `town_serve`, `town_open`. | 178 checks (42,935 cases: every rule there is, made again from the code); 48 of 48 |
| `v112_a_deal_between_two.sql` (ran 2026-10-04) | Deals (`town_deals`): open while the two lay out and give their words, kept for good once done, things and coins. The swap is done here in one go, both purses held in id order. `town_deal`, `town_deal_open(other)`, `town_deal_lay(give, coins)`, `town_deal_agree(word)`, `town_deal_cancel`. One left untouched ten minutes is off. | 85 checks (5,300 cases); 34 of 34 |
| `v113_a_bigger_bag.sql` (ran 2026-10-04) | No new table: the catalog's `rules` row written over (a bag begins with ten slots, the owner's word), `town.roomy` (a bag kept from when bags began smaller is given the slots it lacks as it is read, at its end; none is ever made smaller), and v107's `purse_kept` again, word for word but for that. | 112 checks (48,635 cases: every rule again); 11 of 11 |
| `v114_what_was_changed_no_longer_counts.sql` (ran 2026-10-04) | The popoto board counting less what was changed. `town_changed`: for each character who has changed popoto, how many and a mark, the id of the newest of their popoto that no longer counts. `town_exchange` moves the mark on by what was changed (`town.mark_changed`: the oldest that still count), never working it out again from the whole ledger. `popoto_totals` (the same columns, now security definer) and the new `popoto_count(character)` leave out what is at or below the mark. No row of `kudos` is touched, so the givers' lists, the admin's charts, rare popoto, Evercold and the draws read as they did. The bank's picture side is shut behind the knob `bank_gallery` (0: the owner's word, until the picture board is settled). | 78 checks (the board held to v104's own counting on 3,400 made-up popoto, seven periods); 19 of 19 |
| `v115_the_game_opens_when_its_owner_says.sql` (ran 2026-10-04) | The knob `game_open` (0). `town.member()`, which every function of the game's begins with, answers an admin always and a proved character only while the knob is above nothing; the bank's two functions (which made their own check before `town.member()` was) ask it too; `town_is_open()` says the same as a yes or no, which the page asks first so that nobody is refused anything. (Not `town_open`: that is v111's, what a boot or a chest holds.) | 49 checks (all 37 functions a member may call, asked by everybody, shut and open); 13 of 13 |
| `v116_a_bigger_harvest_and_a_lighter_hoe.sql` (ran 2026-10-04) | No function: two catalog rows written over, the morning after the game opened. Every crop gives twice as many at a picking (`crops`: each `yield`), at the price it had, so that no dish's worth moves; clearing and tilling cost 2 stamina each where they cost 4 (`farming.costs`). The owner's choice of four ways shown him, after asking whether a vegetable waited hours for fetches more than a fish caught at once: it did not. What is growing gains too: a yield is worked out at the picking. Compared entry by entry with the live rows before it was written: twenty-eight entries differ, and no other. | 111 checks (48,635 cases: every rule again, from the code as it is now); 10 of 10 |
| `v117_tired_hands_and_a_cure.sql` (ran 2026-10-04) | No function: nine catalog rows written over, for two things he asked for on the game's first day. A scroll of how the cure for pests is made (`items`, `scrolls`), on the shelf from the first day at 40 coins, six a round, one each (`shelf.basic`, `goods`); the cure made of what that shelf grows, chili 2, scallion 2 and salt 1 in a pot, where it took garlic and basil that nobody could have (`makes`, `cooking.needs`), so that it is asked for and hinted at from the first day (`order.asks.made`, `hints.ids`); and 0.3 of the strike's moment left with no stamina, where it was 0.6 (`fishing.spent`). v107's `town_read` takes the scroll as it is. Compared entry by entry with the live rows: seventeen entries differ, and no other. **The code went out first and the file after the deploy**: a page built before the scroll cannot draw a shelf with it. After it ran, a read-only look (`probe-v117.mjs`, with the file's block kept as `v117.seed.sql`): the nine rows are the file's to the entry, written in one go, and no other row then or since; 15 of 15. | 133 checks (48,644 cases: every rule again); 16 of 16 |

**The rule cases.** `TOWN_VECTORS=<folder> npx vitest run lib/town/db-vectors.test.ts` writes `vectors-v106.json`, `-v107` and `-v108` from the site's own rules as they are at that moment. v106–v108's dry runs read them from the scratch folder itself (and are held to the catalog their own files seeded, so they only pass with cases made when those files were written); v109's and every later one's read them from `now/`, made from the code as it is. v114's needs no cases: it has `kudos-stub.mjs` (the table as it stands live) and `v104.sample.mjs` (made-up popoto) beside it.

**A number that changes after it was seeded.** A seed adds a catalog row only where there is none (`on conflict do nothing`), so that a number an admin changed outlives the file being run twice; and a file that has run is never rewritten. So when the code changes something a seeded row says, the next migration writes that row over: `CATALOG_KEYS` in `lib/town/catalog.ts` names the pending file's rows with `over: true`, `TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts` writes its block, and the ordinary test fails while the block and the code differ. Its dry run then proves the whole of the rules again, as v109's does.

**A live probe after a run** follows the fc-security skill's `live-probe.md`: a throwaway member with nothing in its purse, so that every call is one the rules refuse; v106–v108's was 34 of 34. After v109 a read-only look was enough (it changes no function): all thirteen catalog rows were what the files say. v110's probe was 21 of 21, and counted the farm's own rows before and after: unchanged; v111's and v112's together, 30 of 30. The probes are kept here (`probe-v110.mjs`, `probe-v111-112.mjs`; `ONLY=111` while v112 has not run; `probe-v113.mjs`, 9 of 9; `probe-v114.mjs`, 21 of 21; `probe-v116.mjs`, 6 of 6, read only: the two live rows are the file's block (`v116.seed.sql`, kept beside it) to the entry, and no other row was written; `probe-v115.mjs`, 10 of 10: a throwaway member who is no admin refused by all 37 of the game's functions while it is shut, and never an admin made): `node` runs them from anywhere, they read `.env.local` and print no key. **A probe never writes to `kudos`**: a popoto given there is a real one (a rare roll, the bell, the admin's log). So v114's change itself (popoto into coins, the mark moving) is the dry run's to prove, and its probe has two halves: `node probe-v114.mjs before`, read only, before the owner runs the file, keeps the board beside the script; afterwards the board is held to the rows, line for line in four periods, and to what was kept (53,988 popoto to 524 characters that day, four more given in between).

**A function written again is held to the one it replaces.** v113's `purse_kept` and v114's `town_exchange` and `town_popoto_left` are whole functions written over earlier ones; each dry run has a check that the new text is the old one word for word but for the lines meant, so that nothing else changed with it (`diff` of the two bodies says the same before handing over).

**A draft stays out of `supabase/` until it is proved.** The owner runs a file as soon as he sees it there (v110 and v113 before they were handed over). v114 was written in the scratch folder as `v114_draft.sql` (its test reads that when the repo has no v114) and moved in only when its dry run and its breaks had passed.

**What a dry run cannot show.** PGlite is one connection, so nothing in it waits on anything: that two members buying the last worm are served one after the other (the purse's row, then the stall's), and that of two who sow in the same free bed at the same moment only the first owns it (v110 holds the bed with `pg_advisory_xact_lock` after the member's own purse), is reasoned from the order the rows are taken in, not seen.

Once a migration has run (the owner runs it; `vNN has run` deletes its file), `migration(n)` in the harness reads it
back from history, so a later dry run replays it instead of stubbing its tables. v105 to v115 went into history on
2026-10-04 (`fef0458` holds them as they ran, `9e7fb0b` "v105 to v115 have run" takes them out): every test here
reads its file with `migration(n)`, from `supabase/` while it is there and from history afterwards (a draft beside the
test, `vNNN_draft.sql`, comes first while there is one; `MIGRATION_FILE` still hands in a broken copy for `mutate.mjs`).

A mutation run of v111 is long: `RULES=107,111` puts only the cases its own functions answer (about 45 minutes for its 48
breaks; all the cases, three times that). v113's with `RULES=113` is a few minutes.

## The keeper: how the page calls all this

`lib/town/keeper.ts` is what the game's six panels ask (TownTrade, TownFish, TownFarm, TownCook, TownDeal,
TownScroll): one interface, two keepers. `DbKeeper` is a member's, asking the database; `lib/town/keeper-trial.ts`
wraps the browser's trial for `next dev`'s test room, and sits with the test window in a branch a production build
drops. The map (Town.tsx) makes the keeper and shows the game only when it says the game is open to whoever is here.

- **Reading is at once, doing waits.** Every function answers with the purse as it now stands (and the stall, the
  plot, the pot, the deal it touched): the keeper holds a copy of each, so `purse()`, `farm()`, `pots()` answer
  at once. Only a deed waits: `await keeper.buy(...)`, which answers what the rule answered, or `{ ok: false,
  why: "away" }` when the town could not be reached.
- **One thing at a time.** What is asked is asked in order and answered in order (one line of promises), so a
  look that began before a deed never paints over what the deed did.
- **The clock is the database's.** Every answer has `now`; `keeper.now()` is the browser's clock put right by
  the difference, read off the middle of the asking. Growth, pests, a meal so far and the uncle's rounds are
  worked out by the page's own rules from the copies, with that clock.
- **What others change is asked for, never pushed.** `keeper.look("stall" | "farm" | "kitchen" | "deal")` while a
  panel is open (the stall), while the member is on the farm's map, or always (the kitchen, a deal), on a slow
  timer (30 to 90 s; 2.5 s while a deal is open). The room says when to ask at once: a new broadcast, `nd`
  (lib/town/room, session), carries only the word for what changed, to everybody (at most one of a kind every
  four seconds from one person) or, for a deal, into the other's letterbox.
- **A meal is not asked every second.** The page counts it on each second; the keeper asks the database when the
  company changes, every twenty seconds, and by itself when the five minutes are up. The purse read meanwhile
  shows what the meal has given so far by the rule's own count.
- **Fishing is dropped, struck and landed with the keeper.** `cast` answers how long until the bite and when the
  float twitches (and how much of that has gone by, getting here), never what is on its way; `strike` what was
  hooked, by the database's clock, which gives a moment's grace either way (the hand's own judgement decides only
  how good a strike it was, and the sound); `missed` gives the line up once the database counts the bite gone
  too (1.8 s later, waited in the line); `land` tells how the fight ended with the hand's account, and the
  database has the last word. The trial's keeper plays the same part with the browser's own draw.
- **The other cooks are told both ways:** what each holds (the room's word, for the trial and for trying a recipe
  before asking) and who they are (the database reads each one's hand from their own purse).
- **Whether the game is open is asked first** (`town_is_open`, v115), then the purse. A member it is not open to
  is told so without being refused anything, and nothing more is asked but the same question every five minutes,
  so that the game opens on their page when the owner opens it, with nothing loaded again.
- **The deck and the cooking yard are finished for whoever the game is open to**, and building sites for everybody
  else (`setBuilt` in lib/town/world.ts, called by the map when its keeper says the game is open). They were
  finished in `next dev` only, by the owner's word while the game was a trial ("เฉพาะใน dev"); pushed like that, an
  admin on the real site could neither cook nor fish from the deck. So while the game is the admins', an admin on
  the deck stands, for a member, on the site: each page works out where one may walk for itself. `&townSites=1`
  (dev only) begins with the sites, as production does.

**Trying it without touching production** (there is one Supabase project):

```bash
cd "<scratchpad>/pgtest"     # set up as above, with scripts/db/*.mjs copied in
node keeper.test.mjs         # 86 checks: DbKeeper driven as the page drives it, against a stand-in of its own
node town-bench.mjs 3199     # the stand-in, left running: every migration in PGlite, answered like PostgREST
node E:/NinenineProject/fcnext/.claude/skills/fc-cash-town/scripts/town-db.mjs http://localhost:3100 <out> http://127.0.0.1:3199
```

`town-bench.mjs` replays v104 to v117 from history, then whatever of the town's is in `supabase/` after them (and a
draft, with `BENCH_EXTRA=<file>`; when more have run, raise `RAN` in it),
makes a member of each tester at first sight (a proved character, thirty popoto, no admin), opens the game to them,
and takes `/bench/sql` (anything, as the SQL editor) and `/bench/skip` (the town's clock put forward) for a check
to set things up. The dev test room is pointed at it with `&townDb=http://127.0.0.1:3199` (dev only, a local
address only): the same page then plays by the database's rules instead of the trial's. `town-db.mjs` does that
in a real browser: first the game shut and then opened, beginning from the building sites as production does (no
bag and no deck; then the bag, and the deck finished); then two testers: the bank and the stall through their
panels, a fish hooked by the database's clock and fought, a plot sown that the other sees when the room says so, a
pot ladled from by the other, a deal (35 checks). `repo-ts-town.mjs` lets plain node import the repo's TypeScript (so no class there takes
`constructor(private x)`: node strips types and does no more).

**Before pushing, look at a production build's chunks** (`npx next build`, then search `.next/static`): none of
`cashtown.trial`, `townTest`, `showGarden`, `skipRound`, `โหมดลอง`, `townDb`, `x-town-as` (the trial, the test
window, the trial's own buttons, the stand-in mode), and `town_is_open` in one (the keeper). So it was on
2026-10-04.

**On production, while it is shut,** `node town-live.mjs game <out>` walks one throwaway verified member who is no
admin into the real town (only when nobody real is there): the town is theirs as before, their page asks
`town_is_open` and nothing else of the game's, and no bag shows. An admin's side is never tried: no throwaway is
made an admin.

**Opening it.** Pushed on 2026-10-04 (`fef0458`), the game is shut to everybody but admins (v115's knob at 0): the shopkeepers say they are
not open yet, and none of the game's code is loaded for whoever it is shut to. The owner opens it from the SQL
editor, with no deploy: `update public.town_knobs set value = 1 where key = 'game_open';`
