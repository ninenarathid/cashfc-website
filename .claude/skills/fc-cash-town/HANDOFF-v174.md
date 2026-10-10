# Handoff: v174 (the blacksmith) — from Claude to Codex, 2026-10-10 morning

Claude's weekly limit ran out mid-work. The owner asked for the context to be written down so that Codex can carry
on by itself, the deploy included. This file is that. Read it whole before doing anything. Delete it in the
"v174 has run" commit.

The owner writes Thai; answer him in Thai, plainly, the outcome first. He gives the word for every push and runs
every SQL file himself in the Supabase SQL editor. Nobody but him writes to the live database.

## 1. Where everything is

| What | Where |
|---|---|
| The branch to push | `smith-ship`, in the worktree `E:/NinenineProject/fcnext-wt-build` (real node_modules: `next build` runs here) |
| The branch the work was done on | `smith-db`, in `E:/NinenineProject/fcnext-wt-mineall` (node_modules is a junction: `next dev --webpack` only) |
| The file's parts | `.claude/skills/fc-cash-town/scripts/db/v174.head.sql`, `v174.smith.sql` (+ `.lines.mjs`), `v174.tools.sql` (+ `.lines.mjs`), `v174.foot.sql` |
| The assembler, the tests | `scripts/db/assemble-v174.mjs`, `v174.test.mjs`, `v174.mutations.mjs`, `older-cases-both.mjs`, `keeper.test.mjs`, `try-v164.mjs`, `fill-catalog.mjs` |
| The play in a browser | `scripts/town-smith-db.mjs`; a dev for the owner: `scripts/town-try.mjs` |
| The PGlite bench | `C:/Users/narat/AppData/Local/Temp/claude/e--NinenineProject-fcnext/a5a74da4-224a-4795-8934-f07554cb70c3/scratchpad/pgtest174-whole/` (called SP/… below; Codex's own bench `E:/NinenineProject/fcnext-codex-bench` has `snap-v173.tar` too) |
| The agents' logs (exact commands that worked) | `SP/v173-smith-progress.md`, `SP/v174-tools-progress.md`, `SP/v174-whole-progress.md`, `SP/v174-play-progress.md`, `SP/dev-try.txt` |
| The owner's rulings and the long story | `C:/Users/narat/.claude/projects/e--NinenineProject-fcnext/memory/cash-town-mining-and-woodcutting.md` (first block), `cash-town-harder-overall.md`, `cash-town-players-measured.md`, `cash-town-database.md`, `cash-town-database-load.md`, `shared-working-tree.md`, `cashfc-deploy-identifiers.md` |

## 2. What is on `smith-ship` and what was proved of it

`smith-ship` = the proved code (`a1d8d5a3`) with main's two data commits merged, then this file, then the SQL file
as `supabase/v174_the_blacksmith_his_great_fire_and_the_older_tools.sql` (the proved draft byte for byte: the same
git blob as `scripts/db/v174_draft.sql`, sha256 `e41dc166ed070410e6e55c8c62f8bec65701d83cac65e3f38ae0371592c6dbac`).

Proved on that draft (by Claude's agents; Codex checked both parts and the whole and found nothing left open):
`v174.test.mjs` 363 of 363 (the guard, run twice, grants, no bare write, the 30 live functions word for word but for
the marked lines, both parts' rule cases and stories); 330,470 older rule cases the same before the file and after
(a tool as it was bought changes nothing); `keeper.test.mjs` 402 with the draft, 388 without; the play in a real
browser through the database's keeper 74 of 74; `npx next build` (Turbopack) passed at `a1d8d5a3` in this worktree.

NOT proved by anything: two real connections at once (PGlite has one); Supabase's own behaviour (safeupdate was read
for, not run); that the live text of the 30 functions is what the file was built on (the head's look-first query
tells him: `true | 30`); a real phone.

**The table of tries in what ships: the smelted pieces of +5 to +9 tripled (3, 5, 6, 9, 12; fine timber 12, 12, 15,
15, 18), the ODDS AS THEY WERE (taken 100 to +4, then 90, 80, 70, 60, 50, 40).** The owner has since asked for
harder odds (section 4). The smith is built CLOSED (`smith_open` 0): members see nothing until he opens the knob, so
the odds can follow in a small file before opening.

## 3. The deploy, step by step (each on the owner's word)

He said on 2026-10-10: "ก่อนจะหมด limit push ขึ้นไปเลยแลย และส่ง SQL ทั้งหมดให้ผมได้เลย". Claude's push was refused by
Claude Code's permission guard (it counts as a production deploy), so the pushes are his to run, or Codex's with
network if he allows it. In PowerShell, from `E:\NinenineProject\fcnext-wt-build`:

1. **The code first.** `git log --oneline -4` shows, newest first: the SQL file's commit, this handoff's commit, the
   merge. Push everything BUT the SQL file's commit:
   `git push origin smith-ship~1:main`
   Then wait for Vercel: `gh api repos/ninenarathid/cashfc-website/commits/<sha of smith-ship~1>/status | ConvertFrom-Json`
   until `state` is `success` (a failure there is a line Turbopack refuses: read the deploy log, mend, build here
   with `npx next build`, push again). Production: https://cashfc-website.vercel.app
2. **Then the file.** `git push origin smith-ship:main`. He runs a file the moment it is in `supabase/`. Before he
   runs it, the look-first query in the file's head must answer `true | 30`. It stops by itself if v173 has not run;
   running it twice is safe. The foot has nine read-only queries with what each should say.
3. **After his "รันแล้ว":** (a) `node probe-v174.mjs` in a bench (READ ONLY; it needs the site's keys from the shared
   tree's `.env.local`, which Codex's sandbox refuses: he runs it, or it is skipped and said so); (b) the "v174 has
   run" commit, as the README's rows for v164 and v169 to v173 show: `git rm` the supabase file and this handoff,
   `RAN = 174` in `scripts/db/stand-in.mjs` and `town-bench.mjs`, `NEXT = []` in `keeper.test.mjs`, `CATALOG_KEYS`
   emptied in `lib/town/catalog.ts`, the README's row, a new snapshot (`node stand-in.mjs` in a bench with `FC_REPO`
   at the tree: `snap-v174.tar` beside the scripts in the shared tree and in the Codex bench), `keeper.test.mjs`
   run once; push on his word; (c) in the shared tree `E:/NinenineProject/fcnext`: `git merge --ff-only origin/main`
   (never `git add -A` there, never check out over a path another session touched).
4. **He tries it live as an admin while it is closed** (reload /town; the smith stands in town; two admins for the
   bellows). Then, before opening, the great fire back to new:
   `update public.town_great_fire set doc = '{}'::jsonb, updated_at = now() where one;`
   and open: `update public.town_knobs set value = 1 where key = 'smith_open';` (0 shuts it again).
5. **Within the hour of opening** ask him to run the pg_stat_statements query in `cash-town-database-load.md`: the
   evening the mountain opened the database could not keep up, and nothing measures load but that.
6. **Tell the other sessions** (he has other Claude sessions open; Codex cannot message them): fcnext-f9's stopped
   "omens" draft lays one block on `public.town_cast` on v174's text; the next free migration number is v175.
   Write it in `cash-town-database.md`'s first line and tell him to pass it on.

## 4. What the owner asked for after trying it in dev, in his words, and where each stands

1. **"ไม่ต้องมีกระดานช่างคนแรกหรอก"** — DONE (`a1d8d5a3`, the page only): the smith's board no longer lists who first
   forged each kind to +10, and the village's book of options names nobody. The database still writes `tops`,
   `found` and the `forge_first` deed, unseen. Keeping the book without names is Claude's reading; ask if unsure.
2. **"ตีบวกง่ายไปปรับ % ให้ยากขึ้นกว่านี้"**, then of the next table **"ยังง่ายไปอยู่ปรับให้ยากกว่านี้ขอ fail ได้ตั้งแต่ +4 เลย"**
   — NOT IN WHAT SHIPS. On `smith-db` the commit `7e357023` (labelled WIP) has the last table he was given to try
   in `lib/town/forge.ts`: taken 90, 70, 55, 40, 30, 20, 15 for +4 to +10; what was taken off went to "stays"; a
   level lost a try as before (0, 0, 5, 10, 15, 25, 30). **He has not said whether that table is hard enough: ask
   him before building.** Note for him: his dev bag was seeded full, so a try cost him nothing; live, one try to +9
   is 120 silver fragments and 2 h 12 min of furnace. With +10 at 15 in 100 and the great fire about every 24 days
   his own target (one new +10 member every two months) becomes one in about five months, unless the fire's wait
   (`GREAT_FIRE` in `lib/town/great-fire.ts`, the catalog's `forge.fire`) is shortened: his to choose.
   **How to ship it once he has picked: a small file v175** (name the number in `cash-town-database.md` first) that
   writes ONLY the numbers that change in the catalog's `forge` row, each by itself with `jsonb_set` (pattern:
   `git show a4a4bae0:supabase/v169_more_picks_and_axes_on_the_shelf.sql`), with the code (`TRIES` in forge.ts, its
   comment, `forge.test.ts`, the smith's stories and `scripts/town-smith-db.mjs`, which both assume a try to +1…+4
   always takes) pushed with it. The page reads a try's odds from the code and the database from the catalog: they
   must go out together, and while they differ the smith must stay closed. A dry run on the stand-in with v174
   replayed, `keeper.test.mjs`, the build.
3. **"เอฟเฟคการตี + ขอเอฟเฟคอลังการณ์กว่านี้หน่อยตอนนี้จืดไป"** — NOT BEGUN. The try's show is `components/town/TownSmith.tsx`
   (about line 158: three knocks, then the outcome) and, for everybody near, `components/town/TownForged.ts` with
   `lib/town/forge-show.ts` (the room's word "fg"); sounds are `lib/town/sfx.ts`. What Claude offered him (not
   answered): a build-up (three hammer blows, each with more sparks and a shake, then a held beat), then taken = a
   burst of light with the +N struck in and a shower of sparks, greater the higher the level and greatest at +10;
   stays = a dull ring, smoke, grey; a level lost = a crack, a red flash, the number dropping. Rules: every piece a
   small picture laid with `drawImage`, never a gradient or a path a frame (the town's CPU rule; see
   `held.ts`'s caps); still lights only when the town's motion is off; one look at 1440x900 and 390x844 for each
   outcome. Page only: no SQL.
4. **"buff ใน pull ขั้นท้ายๆขอ OP กว่านี้"** — NOT BEGUN, and to be DESIGNED BEFORE BUILT. He means the options a tool
   draws late: pool 2 (at +10), perhaps the +6 draw too (`lib/town/tools.ts`: `FORGE.pools`, `OPTIONS`, `BUILT`;
   `lib/town/forged.ts` `OLD_FX`). Codex's own first answer was asked for and is, or will be, in
   `SP/codex-pool2.txt` (brief `SP/brief-pool2.md`, which has his rules for strong things: the forest lamp is the
   model, a strong thing takes the most tedious part of its line away whole, a bigger number is not felt, NO POWER
   TAKES FAILING AWAY, a power that skips a game is counted). Lay the list before him and build what he takes. A
   number of an option is the catalog's (`town.opt_n`, `forge.old`): a numbers file. A new behaviour is a rule in
   the code AND in the SQL part with its cases: a migration of its own, tried like v174's parts.
5. **"ทำให้เกมยากขึ้นโดยรวม เพราะคนเล่นกันเยอะมาก"** — NOT BEGUN; a file of its own after these. `cash-town-harder-overall.md`
   has both AIs' two rounds and what is agreed (one trial: the steady hand's ring 0.34 to 0.28 in
   `lib/town/steady.ts`; measure a board's YIELD, not that it ended done, before more). Two answers are owed by him:
   whether a tired go should be worth about three quarters of a fed one, and whether coins are slowed now or after
   the disasters. `cash-town-players-measured.md` has what a member does in a day: he wants every new feature sized
   by those figures.
6. Small things told to him and not answered: the fine timber's tripling (Claude's; undone by `TRIES`,
   `fill-catalog.mjs`, a numbers file); a try to +6 takes 5 pieces, not 6; the far check of a forged net also takes
   the sweep's width and holds for the insect that follows a catch (an agent's call); the smith's screen does not
   read the great fire again by itself while a member waits for a turn.

## 5. How a change to the parts is rebuilt and proved (only if the SQL itself must change)

In the bench (`SP/pgtest174-whole/`, or a copy; copy the tree's `scripts/db/*` and
`.claude/skills/fc-migration/scripts/*.mjs` over it first), always with forward slashes:
`FC_REPO=<tree>` then `node fill-catalog.mjs v174 <tree>/.claude/skills/fc-cash-town/scripts/db/v174.smith.sql`
(after a change to a catalogued number); in the tree `TOWN_VECTORS=<bench>/now npx vitest run
lib/town/db-vectors-smith.test.ts lib/town/db-vectors-tools.test.ts` (the cases); `node try-v164.mjs <tree> v174
smith` (199 checks), `… v174 tools` (155); `node assemble-v174.mjs <tree>` (the draft and its sha256);
`node v174.test.mjs` (363); `node older-cases-both.mjs <tree> v174 --each 3`; `node keeper.test.mjs`; `npx tsc
--noEmit`; `npx vitest run` (two files time out under load and pass alone: `fishing.test.ts`,
`insects-gifts.test.ts`); `npx next build` in `fcnext-wt-build` AFTER the last code change. The logs in section 1
have each command as it was really run. **Once v174 has run, never change its file: a mend is a new number.**

## 6. Rules that bind

- A push and a file into `supabase/` each need his word, each time. Code goes out before the file that needs it.
- Nothing writes to the live database but him. A read of production is his to ask for.
- An UPDATE or DELETE inside a function needs a WHERE (Supabase's safeupdate refuses it at run time; PGlite lets
  it by): `bare-writes.mjs`. A plpgsql variable named like a column or an SQL word breaks at run time.
- A live function is written again only by marked lines on its own text (`*.lines.mjs`, `build-v164.mjs`), never
  pasted; `town.work_counts_of` and `town.deed_th` only by marked blocks.
- What an option, a gem or an element DOES is a secret of the game: ids and file names only in comments, commit
  messages, READMEs and this file.
- The shared tree `E:/NinenineProject/fcnext` is worked in by several sessions: a worktree of one's own for any
  work, stage only one's own files, never `git add -A`, never a stash.
- Check only as much as the change needs: a new feature thoroughly and once before its push; a mend gets the type
  check, the tests it touches and one look.
- New things are built whole: what he is given to try in dev already has its SQL (`scripts/town-try.mjs` stands a
  seeded stand-in; `SP/dev-try.txt` has the addresses that were running: page 3200, stand-in 3199).

## 7. Loose ends on disk

- `smith-db` (fcnext-wt-mineall) is one commit ahead of what ships: the WIP odds (`7e357023`). Its `.env.local` is
  there for the dev server; delete it when the dev is stopped (`SP/dev-try.txt` has the stop lines).
- The dev stand-in on 3199 had its odds changed in place (`SP/odds-live.mjs`) to the WIP table; it forgets
  everything when its process ends.
- Worktrees that can go once this is closed (unlink a `node_modules` junction with `cmd /c rmdir` from PowerShell
  before `git worktree remove`): fcnext-wt-far, fcnext-wt-torch, fcnext-wt-build (real node_modules: plain delete).
