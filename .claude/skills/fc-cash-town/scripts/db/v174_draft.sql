-- v174 — the blacksmith, the forge's great fire, and the seven older tools in the games that are live
--
-- Run it once in the Supabase SQL editor, after v173 (it stops at its first statement where v173 has not run: the
-- rule of felling without v173's block). Running it again is safe. **THE SITE'S CODE FOR IT GOES OUT FIRST** (see
-- "The page", below).
--
-- What it is. Round two of the far side (the owner, 2026-10-09: "ทำต่อได้เลยนะครับ รอบสอง"). v164 opened the mountain
-- with mining and felling only and said of the blacksmith that he would come "with a migration of his own, later":
-- this is it. He stands in the town. He smelts fragments into pieces, forges a tool a level at a time by the table's
-- chances, lays out the options a tool is owed at its milestones, sets a gem, and moves what he put into a tool to
-- another of its line; and the village keeps the forge's great fire, which a try for the top is made at. With him,
-- in the same file (the owner's ruling of 2026-10-09: one opening with every tool), the seven older tools (the rod,
-- the hoe, the watering can, the insect net, the pot, the pan and the grill) are read by the games that are live as
-- what they carry says: fishing, the farm and the well, the insects, the kitchen. The rules are lib/town's written
-- again (forge, great-fire, powers, forged, forged-keep, and the lines of fishing, farm, insects, cooking and stamina
-- that read a tool), each held to the code case by case.
--
-- **A TOOL AS IT WAS BOUGHT PLAYS AS IT ALWAYS DID, TO THE LETTER.** Twenty-seven rules of the live games are written
-- again here, each its own text with a few marked lines (`-- ── the older tools (v174) … ──`) that do nothing unless
-- the deed is done with a forged tool. Before this file was made, every rule case of the older files was asked of
-- the database before it and after it, and a day in the town with tools as they were bought was played on both,
-- call for call: no answer and no row kept differed.
--
-- **THE FORGING TABLE ASKS MORE THAN THE ONE THE PAGE SHOWED UNTIL NOW.** The owner, 2026-10-10: "ช่วยเพิ่มให้การตีบวก
-- ยากขึ้นด้วยครับ แต่ยังแฟร์อยู่", and then "x3 ไปเลย เพราะคนเล่นเกมนี้ เล่นกันเยอะมาก มีคนฟาร์มสายได้วันละ 1000 ด้วย". So a try
-- for +5, +6, +7, +8 and +9 takes 3, 5, 6, 9 and 12 smelted pieces, where it took 1, 2, 2, 3 and 4: his. The fine
-- timber of those five levels is tripled with them (12, 12, 15, 15 and 18, where it was 4, 4, 5, 5 and 6): that
-- tripling is Claude's, told to him, and is undone on his word (lib/town/forge.ts's `TRIES`, and a file that writes
-- the `forge` row again). The odds, the fees, +1 to +4 and +10 are as they were. Every number of the table, of
-- smelting and of the great fire is the catalog's `forge` row, which this file writes: no rule has one of its own.
--
-- **IT IS BUILT CLOSED.** The knob `smith_open` is made at 0. While it is, every function of the smith's answers an
-- admin and refuses everybody else (42501, as the far side refuses whoever it is shut to), and `town_smith_open()`,
-- which a page asks first, says no: a member's page shows nothing of the smith and asks nothing more of him. Nobody
-- but an admin can have a tool forged while he is closed, so a member's tools stay as they were bought (unless an
-- admin hands one over in a deal). Its owner opens it with one line, with no deploy, when he has tried it:
--
--   update public.town_knobs set value = 1 where key = 'smith_open';
--
-- (and shuts it again with `value = 0`). The game's knob (v115's) and the far side's (v164's `far_open`) are asked
-- before the smith's: he is open to a member only while all three are.
--
-- **AN ADMIN CAN TRY EVERYTHING WHILE IT IS CLOSED**: smelting, the bellows (two admins, one at the other's fire), a
-- try, a draw, a gem, a move, a forged tool in each of the live games, and the great fire: an admin who fells a tree
-- or is paid for a rock may find one of its halves, and may light it and spend it. What is tried STAYS: an admin's
-- tools, pieces and coins are their own, the village's board keeps the firsts it was given, and the great fire is
-- where the trying left it. BEFORE OPENING, this one line puts the great fire back to new, so that the village finds
-- its first one itself:
--
--   update public.town_great_fire set doc = '{}'::jsonb, updated_at = now() where one;
--
-- And, should the board's firsts be the village's to make and not the testers', this empties the board:
--
--   update public.town_things set doc = '{"tops": {}, "found": {}}'::jsonb, updated_at = now() where key = 'smith';
--
-- What it makes:
--
--   · one knob: `smith_open` (0);
--   · three catalog rows written over as the code has them: `forge` (the table of tries with its new numbers, the
--     great fire's knobs, the forge's place, the older tools' steps), `fishing` and `insects` (a key more each);
--   · two tables, closed (row level security on, no policy, nothing granted to a browser): `town_smiths` (what a
--     member has at the smith: a row a member, made when they first put something in) and `town_great_fire` (the
--     village's one row; the moment its halves can next be found is in it and is told to no page, ever);
--   · the village's board at the smith as a row of `town_things` (`smith`), made once;
--   · two columns, each added in a moment with no row written: `town_plots.damp` (false) and `town_pots.marks`
--     (null), both empty for everything there is today;
--   · 111 rules in the schema `town`, no browser's to call;
--   · sixteen functions a member calls, each for the signed in: `town_smith_open`, `town_smith`, `town_smith_smelt`,
--     `town_smith_take`, `town_smith_widen`, `town_smith_near`, `town_smith_bellows`, `town_smith_try`,
--     `town_smith_draw`, `town_smith_choose`, `town_smith_redraw`, `town_smith_gem`, `town_smith_move`,
--     `town_fire_join`, `town_fire_leave`, each beginning with the smith's gate, and `town_tool_power`, which begins
--     with the game's own (a counted option is used wherever its tool's game is played);
--   · and thirty functions that were there, each with marked lines more and nothing else of it touched:
--     `public.town_fell` and `public.town_mine` (a tree felled, a rock paid for: the great fire's halves),
--     `town.work_counts_of` and `town.deed_th` (what the smith's deeds count for, and a Thai word for each), and the
--     twenty-seven of the live games (`town.work_counts_of` among them once more): `town.strike_window`,
--     `public.town_cast`, `public.town_strike`, `town.strike_two`, `public.town_land`, `town.land_one`; `town.tend`,
--     `town.water`, `town.sow`, `town.chore`, `town.chore_for`, `town.pour_for`, `public.town_tend`,
--     `public.town_row`, `public.town_farm`; `town.net`, `town.net_mine`, `town.comeback`, `public.town_net`;
--     `town.cook`, `town.set_down`, `town.take_up`, `town.feast_eat`, `town.chew`, `town.pot_doc`,
--     `public.town_pot_down`. **A file after this one that writes any of the thirty again carries this file's lines
--     with its own.** `town.fell` and `town.spoon` are not written, and `town.cook` keeps v171's question of what
--     goes into a pot.
--
-- Coins paid to the smith leave the game: they go to nobody. No coin is made by this file, and nobody's purse, tool,
-- plot or pot is touched by running it.
--
-- The page. **The site's code for the smith has to be live before this file runs** (branch `smith-db`: the page's
-- keeper asks `town_smith_open()` once the far side says yes, takes "no such function" for no, and shuts the smith
-- on the page, not the game, when a function of his is refused; and the forging table with its new numbers, which
-- the page reads from the code and the database from the `forge` row this file writes). With that code live and
-- this file not run, nothing of the smith shows to anybody. With this file run and the older code live, nothing of
-- him shows either, to an admin as little as to a member, and nothing of him can be tried: so the code goes first,
-- and this file once its deploy has succeeded. A page left open since before that deploy has to be loaded again.
--
-- Safe to run twice. The knob, once there, is left as it is (the smith, once opened, stays open); the three catalog
-- rows are written over with the same; the two tables, the board's row, the great fire's row, every member's smithy
-- and every purse are not touched; the two columns are added only where they are not there; every function is
-- written again as the first run left it.
--
-- How it was put together. Two parts, each written and proved alone (v174.smith.sql and v174.tools.sql in the
-- fc-cash-town skill's scripts/db), run in that order: the older tools' part stands on the smith's. Each part's own
-- head is kept below as the head of its section. Where one says that nothing of an earlier file's function is
-- pasted and that its place is left empty, the place is FILLED in this file: by assemble-v174.mjs, from the
-- function's own text as the stand-in database had it after v173 and after the part above, with the part's lines
-- in place. So the second statement of `town.work_counts_of` (the older tools') has the smith's block in it too.
--
-- What to see afterwards is at the file's foot.
--
-- BEFORE RUNNING IT, if any file of the town's has run since v173: the 30 functions this file writes again were
-- built from their text as it stood after v173. This says whether they are that text still (in the SQL editor; it
-- reads and changes nothing). `true | 30` before the file has ever run; if it says false then, put the file together
-- again from a stand-in that has the later file (assemble-v174.mjs) and do not run this one. (Once this file has
-- run it says false, rightly: the 30 have their lines.)
--
--   select coalesce(bool_and(md5(replace(p.prosrc, chr(13), '')) = w.was), false) as as_they_were, count(p.oid) as found
--     from (values
--       ('public.town_fell(jsonb, integer, integer)', '224b3d51400a2e5a99ef17ee4d7ba31a'),
--       ('public.town_mine(integer, integer, integer, integer, double precision, text)', 'b7adbf18f9348ed6cda030284ba70cc8'),
--       ('town.work_counts_of(jsonb, text)', 'a602caed0f6e7ea7c982bbb7bbe02bf8'),
--       ('town.deed_th(text)', '01024d8008da8f1abc8d299af8cd0da0'),
--       ('town.strike_window(jsonb, bigint)', 'e5ed93479a7a0c06cf1509e6aa31b42f'),
--       ('public.town_cast(text, integer, integer, boolean, text)', '82fdec06f494ed1fbcdeca82a3805ae3'),
--       ('public.town_strike(integer)', 'a0d098a1329e1cb3aab814c3415b1941'),
--       ('town.strike_two(uuid, jsonb, jsonb, integer, boolean, jsonb, bigint)', '9a2beafddf5f211a0fe42f6a205f0295'),
--       ('public.town_land(text, jsonb)', 'e355ee6fd8c574322b8c6e638d3adc09'),
--       ('town.land_one(uuid, jsonb, jsonb, text, jsonb, bigint)', 'b35bddef22344e2efcc7733485dfeadd'),
--       ('town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)', 'f93b6c67fcbee859601c1fa88c124b6f'),
--       ('town.water(text, jsonb, jsonb, text, bigint)', 'cd2dfc3fcb96a93746080164f248696d'),
--       ('town.sow(jsonb, jsonb, text, text, bigint)', '10d8e230437303a0cb267a6773c652bb'),
--       ('town.chore(jsonb, text, integer, bigint)', 'ef9849dd5378e078701cac171132a873'),
--       ('town.chore_for(jsonb, text, integer)', '68f7c5fb6ccaf1d31f81f165b6dc6eea'),
--       ('town.pour_for(text, jsonb, jsonb, jsonb, text, bigint, text)', '979fc0a334a092da21817dc8f5f3d741'),
--       ('public.town_tend(integer, integer, jsonb, boolean)', '279a263ea9318f6230c965184d31d9f4'),
--       ('public.town_row(integer, integer, jsonb, jsonb)', '256d2b1a71b681c73537ff68ec37a5b0'),
--       ('public.town_farm(bigint)', '68e87a3b0b67e7b39ec37ebe09c2a1fb'),
--       ('town.net(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, bigint, text)', '14059c30e7a4fdcc4d555b5f61afd55a'),
--       ('town.net_mine(jsonb, text, text, integer, integer, double precision, bigint)', '385ba31f815c2080221d666c4e1e5219'),
--       ('town.comeback(integer, bigint, jsonb, double precision, double precision, double precision, jsonb, text)', 'ffe0f337a9e7a579ec60b2fdeba58902'),
--       ('public.town_net(integer, integer, integer, numeric, uuid)', '25c492554ef7196a06667ede29a93cef'),
--       ('town.cook(jsonb, jsonb, jsonb, double precision, bigint)', 'e365845864949e58ac3494977e33b1da'),
--       ('town.set_down(jsonb, integer, text, jsonb, text)', '8fe39cb7b9dc23abb0ddef7e43ea1319'),
--       ('town.take_up(jsonb, jsonb, text)', 'd7469a54b7df0738941ab00541b4c8b7'),
--       ('town.feast_eat(jsonb, jsonb, boolean, bigint)', 'a047c8c04d5f0a0b2823f88918510a2f'),
--       ('town.chew(jsonb, double precision, bigint)', '5f168a5ae3154d14b5deb99fc433e696'),
--       ('town.pot_doc(bigint)', '387184a462e648657b7597098816c965'),
--       ('public.town_pot_down(integer, integer, integer)', 'a80b3ea0447d89649207afebc1130931')
--     ) w(fn, was) left join pg_proc p on p.oid = to_regprocedure(w.fn);
--   -- true | 30

do $$ begin
  if to_regprocedure('town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)') is null
     or coalesce(position('v173:' in (select p.prosrc from pg_proc p where p.oid = to_regprocedure('town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)'))), 0) = 0 then
    raise exception 'v174 needs v173: the rule of felling has not had v173''s block yet (v172 and v173 run before this file)';
  end if;
end $$;

-- ═══ Part 1 of 2: the blacksmith, and the forge's great fire ═══════════════════════════════════════════════════════

-- v174, the smith's part: the blacksmith who stands in the town, and the forge's great fire (lib/town/forge,
-- lib/town/great-fire and lib/town/powers' `running`, written again). Tried on the stand-in's snapshot, as it is
-- after the last file that ran: `node try-v164.mjs <the worktree's root> v174 smith`. Safe to run twice.
--
-- It stands on what v164 gave and is live (v164.base.sql's head is the contract): the catalog's `forge` row, the far
-- side's gate, the readers of a tool (`town.tool_kind`, `tool_level`, `tool_drawn`, `tool_origin`, `tool_away`,
-- `tool_gems`, `tool_makers`, `tool_has`, `gem_by`, `opt_n`, `gem_element`, `hand_stack`, `same_pool`, `line_kinds`),
-- the powers (`town.use_power`) and the pouches (`town.held_in`, `room_in`, `take_out`, `stow_away`). Nothing of
-- those is written again here.
--
-- WHAT IS HERE, in the order of the file:
--
--   1. THE CATALOG. One row written over, `forge`: what the smith himself reads beyond what a pick and an axe were
--      read by from the first day (`fire`, `timed`, `stand`, `old`). The block is written from lib/town/catalog.ts
--      (fill-catalog.mjs v174 <this file>); whoever adds a row to CATALOG_KEYS.v174 writes it again.
--   2. THE GATE. The knob `smith_open` (0: built closed). `town.smith_member()` is what every function of the smith's
--      that a member calls begins with:
--          me uuid := town.smith_member();
--      It answers an admin always, and a proved character only while the game is open (v115's knob), the far side is
--      open (v164's) AND `smith_open` is above nothing; everybody else is refused (42501), as `town.far_member()`
--      refuses. `public.town_smith_open()` says the same as a yes or no: the page asks it once, so that nobody is
--      refused anything. Opened from the SQL editor:
--          update public.town_knobs set value = 1 where key = 'smith_open';
--      (`public.town_tool_power` alone begins with the game's gate, `town.member()`: a counted option is used wherever
--      its tool's game is played, and a member has such a tool only by the smith.)
--   3. WHAT IS KEPT.
--      · `town_smiths`, a row a member: lib/town/forge's `Smithy` (the queue of pieces smelting by this clock, how
--        often it was widened, the timber still burning, the draw that waits). A member who has put nothing in has
--        no row. `town.smithy_read(member)`, `town.smithy_held(member)` (held until the transaction ends),
--        `town.keep_smithy(member, doc)`.
--      · `smith`, a row of `town_things`: the village's board (lib/town/forge's `SmithBoard`: who first forged each
--        kind of tool to the top, who first found each option).
--      · `town_great_fire`, ONE row: lib/town/great-fire's `GreatFire` (`due`, `flint`, `tinder`, `row`, `topped`).
--        `town.fire_kept(<hold>)`, `town.keep_fire(doc)`.
--        ITS `due` IS TOLD TO NO PAGE, EVER: the moment the halves of the next fire can be found is drawn here by
--        chance (`random()`, in `public.town_smith_try`, when a fire is spent), kept in this row, and read by the
--        rules alone. What leaves the database of the fire is `town.fire_told` and nothing else: the halves found and
--        by whom, whether it is lit, the row, how many of its first may use it, where the asker stands and whether
--        they have taken the top. No deed's document has `due`, the number it was drawn by, or the fire's document.
--        A fresh village's fire: update public.town_great_fire set doc = '{}'::jsonb, updated_at = now() where one;
--      All three closed: row level security on, no policy, nothing granted to a browser.
--   4. THE RULES, each answering what the code answers, case by case (lib/town/db-vectors-smith.test.ts makes the
--      cases): the table of tries, smelting, the bellows, a try, the options, a gem, a move, the board, the great fire.
--   5. THE FUNCTIONS OF EARLIER FILES WITH A BLOCK MORE, and WHAT A MEMBER CALLS.
--
-- WHAT THE BROWSER IS BELIEVED ABOUT, and nothing else: which slot, which piece and how many, which option of those
-- laid out, which gem; whose bellows (that the two stand by the forge is the page's to hold to: the database knows
-- where nobody stands); and, of a move, the tile stood on (held to the forge's own place) and whether a game's board
-- is open on the page.
--
-- CHANCE IS DRAWN HERE and never sent: how a try goes, which options a draw lays out, and the while before the next
-- fire's halves can be found. Each rule takes its number of chance as an argument, so that it can be held to the
-- code's cases; the function a member calls draws the number and has no argument for one.
--
-- THE ORDER ROWS ARE HELD IN. The base's, with the smith's rows in their places (the base's head: "for every part of
-- this file and of the smith's after it"):
--
--   (1) the village's rows first: `grove`, or a place of `town_cave` (never both in one call);
--       THEN THE GREAT FIRE'S ROW (`town.fire_kept(true)`); THEN THE SMITH'S BOARD (`town.thing('smith', true)`);
--   (2) then members' purses, by their ids, the lesser first (`town.purse_of(<id>, true)`);
--   (3) then a member's smithy (`town.smithy_held(<id>)`): never two in one call.
--
-- Which call holds what, in that order and in no other:
--   public.town_fell          grove; the great fire (only while its tinder can be found by the feller); the purses
--   public.town_mine          a place of the cave; the great fire (only while its flint can be found); the purses
--   public.town_smith_try     the great fire; the board; my purse          (every try: a try may be the top's)
--   public.town_smith_choose  the board; my purse; my smithy
--   public.town_fire_join, public.town_fire_leave      the great fire (my purse is read, not held)
--   town_smith_smelt, _take, _widen, _draw, _redraw    my purse; my smithy
--   town_smith_gem, _move, public.town_tool_power      my purse (a move reads my smithy without holding it: only a
--                                                      deed of my own writes its waiting draw, and those wait on my purse)
--   public.town_smith_bellows                          the other member's smithy, and nothing else
-- No rule of schema `town` takes a hold but the readers named `…_held` / `…_kept(true)`, and those are called by the
-- functions above and by nothing else (the try script reads every function's text for it).
--
-- Every number is the catalog's (`forge`; `work` for what the bellows are worth; `farming.cans` and `items` for a
-- move): no rule here has one of its own. Coins paid to the smith leave the game: they go nowhere.
--
-- Four functions that were there have a small marked block more each: `public.town_fell` and `public.town_mine` (a
-- tree felled may be the village's tinder, a rock paid for its flint), `town.work_counts_of` (the bellows count for
-- the helpers' line) and `town.deed_th` (a word for each deed here). NOTHING OF THEM IS PASTED HERE:
-- v174.smith.lines.mjs says the lines, and build-v164.mjs builds each statement from the function's own text as the
-- database then has it (a file that runs before v174 may have written it again), into the empty places marked below.
-- `town.fell` itself, the woodcutters' rule, is not touched (v172 and v173, which run before this file, write it).

-- (what of earlier files the smith stands on: the file stops here where one of them has not run)
do $$
begin
  if to_regprocedure('town.far_member()') is null or to_regprocedure('town.tool_carried(jsonb)') is null or to_regprocedure('town.take_out(jsonb, text, integer)') is null
     or to_regprocedure('town.use_power(jsonb, jsonb, text, bigint)') is null or to_regprocedure('town.hand_stack(jsonb)') is null then
    raise exception 'v164 has not run yet: the smith stands on its gate, its readers of a tool, its powers and its pouches';
  end if;
  if to_regprocedure('public.town_fell(jsonb, integer, integer)') is null or to_regprocedure('public.town_mine(integer, integer, integer, integer, double precision, text)') is null then
    raise exception 'v164 has not run yet: the great fire''s halves are found where a tree is felled and a rock is paid for';
  end if;
  if to_regprocedure('town.work_counts_of(jsonb, text)') is null or to_regprocedure('town.deed_th(text)') is null or to_regprocedure('town.note(uuid, text, text, numeric, numeric, jsonb)') is null then
    raise exception 'v121 and v149 have not run yet: the smith writes his deeds down, and the bellows count for a line';
  end if;
  if not coalesce(town.cat('work')->'helpers' ? 'bellows', false) then raise exception 'the catalog''s `work` row does not say what the bellows are worth'; end if;
end $$;

-- ─── 1. The catalog ──────────────────────────────────────────────────────

-- <catalog:v174> written from lib/town/catalog.ts (npm test checks it; TOWN_WRITE=1 npx vitest run lib/town/catalog.test.ts writes it)
insert into public.town_catalog (key, data) values
  ('forge', $town${
    "kinds": ["pick","axe","rod","hoe","can","bugNet","pot","pan","grill"],
    "wooden": ["axe","rod","bugNet"],
    "lines": {"kitchen":["pot","pan","grill"],"farming":["hoe","can"],"fishing":["rod"],"insects":["bugNet"],"mining":["pick"],"felling":["axe"]},
    "forge": {"top":10,"floor":4,"milestones":[3,6,10],"pools":[1,1,2],"sockets":1,"glow":{"from":7,"full":10},"gemAtTop":1,"cap":3,"maker":24},
    "gemLevels": 4,
    "levels": {"pick":{"power":[3,3.45,3.65,3.7,4,4.5,5,6,7,8.5,12],"strikes":[6,6,6,7,7,7,7,8,9,9,10]},"axe":{"chops":[12,11,11,10,10,9,8,7,7,6,4],"ahead":[3,3,3,3,3,3,4,4,4,4,5],"slow":[0,0,0.05,0.05,0.1,0.15,0.2,0.25,0.3,0.35,0.5]},"rod":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3],"strike":[1.6,1.625,1.65,1.675,1.7,1.767,1.833,1.9,2,2.1,2.2]},"hoe":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5],"slow":[0,0.013,0.025,0.038,0.05,0.083,0.117,0.15,0.2,0.25,0.3]},"can":{"waterings":[8,9,9,10,10,11,11,12,13,14,16],"marks":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"bugNet":{"ring":[0.6,0.615,0.63,0.645,0.66,0.69,0.72,0.75,0.8,0.85,0.9],"lands":[300,293,285,278,270,255,240,225,200,175,150]},"pot":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"pan":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]},"grill":{"band":[1,1.025,1.05,1.075,1.1,1.15,1.2,1.25,1.333,1.417,1.5]}},
    "tries": [{"to":1,"take":100,"stay":0,"down":0,"fee":10,"ore":"shardCopper","n":5,"timber":2},{"to":2,"take":100,"stay":0,"down":0,"fee":20,"ore":"shardCopper","n":8,"timber":2},{"to":3,"take":100,"stay":0,"down":0,"fee":40,"ore":"shardCopper","n":12,"timber":3},{"to":4,"take":100,"stay":0,"down":0,"fee":80,"ore":"shardIron","n":16,"timber":3},{"to":5,"take":90,"stay":10,"down":0,"fee":150,"ore":"oreIron","n":3,"timber":12},{"to":6,"take":80,"stay":15,"down":5,"fee":250,"ore":"oreIron","n":5,"timber":12},{"to":7,"take":70,"stay":20,"down":10,"fee":400,"ore":"oreSilver","n":6,"timber":15},{"to":8,"take":60,"stay":25,"down":15,"fee":600,"ore":"oreSilver","n":9,"timber":15},{"to":9,"take":50,"stay":25,"down":25,"fee":900,"ore":"oreSilver","n":12,"timber":18},{"to":10,"take":40,"stay":30,"down":30,"fee":1500,"ore":"oreSilver","n":5,"timber":6}],
    "smith": {"places":3,"wider":3,"more":[{"timber":20,"coins":200},{"timber":40,"coins":500}],"bellows":{"share":0.1,"each":3,"points":2},"gem":{"mount":"timber","mounts":5,"fee":50},"redraw":{"gems":1,"fee":100},"offer":2,"move":{"share":30,"least":50}},
    "options": {"order":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","axGrain","axDust","axKeen","axResin","axFresh","axDry","rdBait","rdCalm","rdFresh","rdQuick","hoClear","hoFirst","hoFresh","hoLight","cnDrop","cnThrift","cnFresh","cnKind","ntAgain","ntMesh","ntFresh","ntLong","ckFire","ckBase","ckFresh","ckBrisk","pkQuake","pkTwin","pkDrill","pkGleam","axOne","axDouble","axRoot","axElder","rdGold","rdStill","rdCall","hoBoth","hoGrip","hoWet","cnRain","cnFull","cnTwice","ntWide","ntFreeze","ntNest","ckBig","ckWarm","ckScent"],"of":{"pkPeek":{"pool":1,"tools":["pick"],"n":{}},"pkCrumb":{"pool":1,"tools":["pick"],"n":{"every":5,"more":1}},"pkSteady":{"pool":1,"tools":["pick"],"n":{"strikes":2}},"pkLoose":{"pool":1,"tools":["pick"],"n":{"fewer":1}},"pkFresh":{"pool":1,"tools":["pick"],"n":{},"use":{"n":10,"per":"meal"}},"pkCutter":{"pool":1,"tools":["pick"],"n":{"more":1}},"axGrain":{"pool":1,"tools":["axe"],"n":{"ahead":2}},"axDust":{"pool":1,"tools":["axe"],"n":{"every":5,"more":1}},"axKeen":{"pool":1,"tools":["axe"],"n":{"chops":2}},"axResin":{"pool":1,"tools":["axe"],"n":{"in":4}},"axFresh":{"pool":1,"tools":["axe"],"n":{},"use":{"n":5,"per":"meal"}},"axDry":{"pool":1,"tools":["axe"],"n":{"pieces":2}},"rdBait":{"pool":1,"tools":["rod"],"n":{}},"rdCalm":{"pool":1,"tools":["rod"],"n":{"secs":2}},"rdFresh":{"pool":1,"tools":["rod"],"n":{},"use":{"n":5,"per":"meal"}},"rdQuick":{"pool":1,"tools":["rod"],"n":{"shorter":0.15}},"hoClear":{"pool":1,"tools":["hoe"],"n":{"stones":2}},"hoFirst":{"pool":1,"tools":["hoe"],"n":{"misses":1}},"hoFresh":{"pool":1,"tools":["hoe"],"n":{},"use":{"n":10,"per":"meal"}},"hoLight":{"pool":1,"tools":["hoe"],"n":{}},"cnDrop":{"pool":1,"tools":["can"],"n":{"more":3}},"cnThrift":{"pool":1,"tools":["can"],"n":{"takes":1}},"cnFresh":{"pool":1,"tools":["can"],"n":{},"use":{"n":10,"per":"meal"}},"cnKind":{"pool":1,"tools":["can"],"n":{"points":1}},"ntAgain":{"pool":1,"tools":["bugNet"],"n":{"by":0.5}},"ntMesh":{"pool":1,"tools":["bugNet"],"n":{"misses":2}},"ntFresh":{"pool":1,"tools":["bugNet"],"n":{},"use":{"n":10,"per":"meal"}},"ntLong":{"pool":1,"tools":["bugNet"],"n":{"reach":1}},"ckFire":{"pool":1,"tools":["pot","pan","grill"],"n":{"steady":2}},"ckBase":{"pool":1,"tools":["pot","pan","grill"],"n":{"misses":1}},"ckFresh":{"pool":1,"tools":["pot","pan","grill"],"n":{},"use":{"n":3,"per":"meal"}},"ckBrisk":{"pool":1,"tools":["pot","pan","grill"],"n":{"shorter":0.25}},"pkQuake":{"pool":2,"tools":["pick"],"n":{"reach":1},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"tools":["pick"],"n":{"times":2},"use":{"n":5,"per":"day"}},"pkDrill":{"pool":2,"tools":["pick"],"n":{},"use":{"n":3,"per":"day"}},"pkGleam":{"pool":2,"tools":["pick"],"n":{"by":1.5}},"axOne":{"pool":2,"tools":["axe"],"n":{},"use":{"n":10,"per":"day"}},"axDouble":{"pool":2,"tools":["axe"],"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"tools":["axe"],"n":{},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"tools":["axe"],"n":{"by":1.5}},"rdGold":{"pool":2,"tools":["rod"],"n":{"secs":3},"use":{"n":10,"per":"day"}},"rdStill":{"pool":2,"tools":["rod"],"n":{"by":0.5,"mins":5},"use":{"n":2,"per":"day"}},"rdCall":{"pool":2,"tools":["rod"],"n":{},"use":{"n":10,"per":"day"}},"hoBoth":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"hoGrip":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":20,"per":"day"}},"hoWet":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"cnRain":{"pool":2,"tools":["can"],"n":{},"use":{"n":3,"per":"day"}},"cnFull":{"pool":2,"tools":["can"],"n":{"mins":30},"use":{"n":1,"per":"day"}},"cnTwice":{"pool":2,"tools":["can"],"n":{},"use":{"n":10,"per":"day"}},"ntWide":{"pool":2,"tools":["bugNet"],"n":{"reach":3},"use":{"n":10,"per":"day"}},"ntFreeze":{"pool":2,"tools":["bugNet"],"n":{"secs":2},"use":{"n":10,"per":"day"}},"ntNest":{"pool":2,"tools":["bugNet"],"n":{}},"ckBig":{"pool":2,"tools":["pot","pan","grill"],"n":{"more":2},"use":{"n":3,"per":"day"}},"ckWarm":{"pool":2,"tools":["pot","pan","grill"],"n":{"hours":2},"use":{"n":3,"per":"day"}},"ckScent":{"pool":2,"tools":["pot","pan","grill"],"n":{"stamina":10},"use":{"n":3,"per":"day"}}}},
    "built": {"pick":{"opts":["pkPeek","pkCrumb","pkSteady","pkLoose","pkFresh","pkCutter","pkQuake","pkTwin","pkDrill","pkGleam"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"axe":{"opts":["axGrain","axDust","axKeen","axResin","axFresh","axDry","axOne","axDouble","axRoot","axElder"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"rod":{"opts":["rdBait","rdCalm","rdFresh","rdQuick","rdGold","rdStill","rdCall"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"hoe":{"opts":["hoClear","hoFirst","hoFresh","hoLight","hoBoth","hoGrip","hoWet"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"can":{"opts":["cnDrop","cnThrift","cnFresh","cnKind","cnRain","cnFull","cnTwice"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"bugNet":{"opts":["ntAgain","ntMesh","ntFresh","ntLong","ntWide","ntFreeze","ntNest"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pot":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"pan":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]},"grill":{"opts":["ckFire","ckBase","ckFresh","ckBrisk","ckBig","ckWarm","ckScent"],"gems":["fire","water","ice","earth","lightning","wind","light","dark"]}},
    "elements": ["fire","water","ice","earth","lightning","wind","light","dark"],
    "gems": {"fire":{"gem":"gemRuby","chip":"chipRuby"},"water":{"gem":"gemSapphire","chip":"chipSapphire"},"ice":{"gem":"gemAquamarine","chip":"chipAquamarine"},"earth":{"gem":"gemAmber","chip":"chipAmber"},"lightning":{"gem":"gemTopaz","chip":"chipTopaz"},"wind":{"gem":"gemEmerald","chip":"chipEmerald"},"light":{"gem":"gemDiamond","chip":"chipDiamond"},"dark":{"gem":"gemOnyx","chip":"chipOnyx"}},
    "smelting": {"fragments":10,"timber":1},
    "smelts": {"order":["oreCopper","oreIron","oreSilver","gemRuby","gemSapphire","gemAquamarine","gemAmber","gemTopaz","gemEmerald","gemDiamond","gemOnyx"],"of":{"oreCopper":{"of":"shardCopper","mins":5,"fee":5},"oreIron":{"of":"shardIron","mins":8,"fee":10},"oreSilver":{"of":"shardSilver","mins":11,"fee":15},"gemRuby":{"of":"chipRuby","mins":10,"fee":20},"gemSapphire":{"of":"chipSapphire","mins":10,"fee":20},"gemAquamarine":{"of":"chipAquamarine","mins":10,"fee":20},"gemAmber":{"of":"chipAmber","mins":10,"fee":20},"gemTopaz":{"of":"chipTopaz","mins":10,"fee":20},"gemEmerald":{"of":"chipEmerald","mins":10,"fee":20},"gemDiamond":{"of":"chipDiamond","mins":10,"fee":20},"gemOnyx":{"of":"chipOnyx","mins":10,"fee":20}}},
    "fire": {"wait":{"least":1209600000,"most":2937600000},"turn":86400000,"row":60},
    "timed": {"cnFull":"canFull","rdStill":"rodStill"},
    "stand": {"at":[50.2,24.1],"reach":6},
    "old": {"fire":{"rod":{"tires":[0.15,0.25,0.35,0.45]},"hoe":{"fewer":[1,1,2,2]},"can":{"more":[1,2,3,4]},"bugNet":{"sooner":[0.15,0.25,0.35,0.45]},"cook":{"shorter":[0.15,0.25,0.35,0.45]}},"water":{"spared":[1,2,3,4]},"ice":{"slow":[0.15,0.25,0.35,0.45]},"earth":{"stamina":[0.15,0.25,0.35,0.45]},"lightning":{"chance":[0.1,0.2,0.3,0.4]},"light":{"rod":{"early":[0.2,0.3,0.4,0.5]},"can":{"glint":[4,7,10,999]},"bugNet":{"seen":[3,5,7,9]}},"dark":{"rod":{"rare":[1.2,1.4,1.6,1.8],"fiercer":0.1},"hoe":{"worm":[0.05,0.1,0.15,0.2],"faster":0.1},"can":{"more":[0.1,0.15,0.2,0.25],"uses":2},"bugNet":{"rare":[1.2,1.4,1.6,1.8],"smaller":0.1},"cook":{"helping":[0.1,0.2,0.3,0.4],"harder":0.1}}}
  }$town$::jsonb),
  ('fishing', $town${
    "fish": ["minnow","barb","tilapia","perch","catfish","pangasius","snakehead","eel","prawn","featherback","goby","gourami","crab","snail","hampala","sheatfish","bagrid","giantGourami","frog","tigerfish","wallago","croaker","blackEar","spinyEel","puffer","goldenCarp","giantSnakehead","royalFeatherback","arowana","stingray","megaCatfish","koi","loach","mosquitofish","mussel","crayfish","goldfish","carp","piranha","herring","archerfish","pacu","pike","nilePerch","salmon","wels","gar","arapaima","dozyFish","popotoFish","rainbowFish","moonFish"],
    "flotsam": ["hyacinth","boot","driftwood","bottle","pearl","chest"],
    "tiers": {"common":100,"uncommon":26,"rare":7,"legend":2.5},
    "baits": ["worm","dough","minnow","corn","loach","cricket","branBait","shrimpLive","antEggs","lure","fermentedBait","caterpillar","moth","dragonfly","grasshopper"],
    "kept": ["lure"],
    "rods": ["rod","rodTeak","rodMaster"],
    "floats": {"floatFeather":1.1,"floatGlow":1.15,"floatQuill":1.25,"floatBell":1.5},
    "nets": {"netSmall":0.88,"netLong":0.76},
    "strike": 1.6,
    "spent": 0.6,
    "apart": 3,
    "reel": 0.14,
    "slack": {"early":300,"late":1500},
    "least": 0.5,
    "longest": 900,
    "signs": {"crowd":2,"lately":300,"after":30,"moon":1.5,"weekend":[0,6]},
    "pair": {"never":["legend"]},
    "orb": {"minutes":30,"night":23,"skies":["night","rain","moon"]},
    "star": {"tiers":["rare","legend"]},
    "wary": {"ups":3,"within":300,"gone":600,"tiers":["rare","legend"]},
    "bouts": {"legend":2},
    "places": {"0,23":false,"1,24":false,"2,25":false,"3,26":false,"4,26":false,"5,27":false,"6,27":false,"7,27":false,"7,28":false,"8,28":false,"9,28":false,"10,29":false,"11,29":false,"12,30":false,"13,31":false,"13,32":false,"14,32":false,"14,33":false,"15,34":false,"15,35":false,"15,36":false,"16,38":true,"12,39":true,"13,39":true,"14,39":true,"15,39":true,"16,39":true,"17,39":true,"18,39":true,"17,40":true,"18,40":true,"17,41":true,"18,41":true,"17,42":true,"18,42":true,"19,42":true,"18,43":true,"19,43":true,"20,43":true,"22,43":true,"19,44":true,"19,45":true,"19,46":true,"23,46":false,"24,46":false,"24,47":false,"25,48":false,"26,49":false,"26,50":false,"27,50":false,"27,51":false,"28,51":false,"28,52":false,"29,52":false,"29,53":false,"30,53":false,"31,54":false,"32,54":false,"33,55":false,"34,55":false,"35,55":false,"36,56":false,"37,56":false,"38,56":false,"38,57":false,"39,57":false,"40,58":false,"41,59":false,"41,60":false,"42,61":false,"42,62":false,"43,63":false}
  }$town$::jsonb),
  ('insects', $town${
    "order": ["butterflyWhite","monarch","morpho","dragonfly","damselfly","glassDragonfly","grasshopper","mantis","cricket","cicada","stickInsect","leafInsect","firefly","orchidMantis","moth","lunaMoth","hawkMoth","rhinoBeetle","stagBeetle","jewelBeetle","herculesBeetle","ladybird","scarab","caterpillar"],
    "bugs": {"butterflyWhite":{"habit":"path","at":["blooms","field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true},"monarch":{"habit":"path","at":["blooms"],"weight":160,"n":[1,1],"cost":1,"places":["town"],"hours":[[6,18]],"dry":true,"day":0.25},"morpho":{"habit":"path","at":["glade"],"weight":100,"n":[1,1],"cost":3,"hours":[[6,18]],"dry":true,"day":0.3},"dragonfly":{"habit":"spot","at":["water"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,19]]},"damselfly":{"habit":"spot","at":["water"],"weight":55,"n":[1,1],"cost":2,"places":["forest"],"hours":[[6,19]]},"glassDragonfly":{"habit":"spot","at":["falls"],"weight":100,"n":[1,1],"cost":3,"hours":[[5,10]],"day":0.25},"grasshopper":{"habit":"behind","at":["field"],"weight":100,"n":[1,1],"cost":1,"hours":[[6,18]]},"mantis":{"habit":"behind","at":["field"],"weight":50,"n":[1,1],"cost":3,"places":["farm"],"hours":[[6,18]]},"cricket":{"habit":"sound","at":["field"],"weight":100,"n":[1,2],"cost":1,"hours":[[19,24],[0,5]]},"cicada":{"habit":"sound","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[8,18]],"dry":true},"stickInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["woods","bamboo","rise"]},"leafInsect":{"habit":"look","at":["litter"],"weight":100,"n":[1,1],"cost":2,"zones":["deep"]},"firefly":{"habit":"look","at":["water"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]],"dry":true},"orchidMantis":{"habit":"look","at":["blooms"],"weight":2,"n":[1,1],"cost":3,"places":["forest"],"hours":[[6,18]]},"moth":{"habit":"lamp","at":["lamp"],"weight":100,"n":[1,1],"cost":1,"hours":[[19,24],[0,5]],"dry":true},"lunaMoth":{"habit":"lamp","at":["lamp"],"weight":15,"n":[1,1],"cost":3,"places":["forest"],"hours":[[19,24],[0,5]],"dry":true,"moon":true},"hawkMoth":{"habit":"lamp","at":["lamp"],"weight":4,"n":[1,1],"cost":3,"hours":[[19,24],[0,5]],"dry":true,"day":0.25},"rhinoBeetle":{"habit":"lure","at":["tree"],"weight":100,"n":[1,1],"cost":2,"hours":[[19,24],[0,5]]},"stagBeetle":{"habit":"lure","at":["tree"],"weight":12,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]]},"jewelBeetle":{"habit":"lure","at":["tree"],"weight":6,"n":[1,1],"cost":3,"hours":[[10,16]],"day":0.25},"herculesBeetle":{"habit":"lure","at":["tree"],"weight":3,"n":[1,1],"cost":3,"zones":["deep"],"hours":[[19,24],[0,5]],"day":0.1},"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1},"scarab":{"habit":"crawl","at":["field"],"weight":30,"n":[1,1],"cost":1,"places":["farm"],"hours":[[6,18]]},"caterpillar":{"habit":"crawl","at":["litter","blooms"],"weight":45,"n":[1,1],"cost":1,"places":["forest"],"hours":[[6,18]]}},
    "kinds": {"blooms":{"every":7,"chance":0.77,"shares":1},"water":{"every":7,"chance":0.7,"shares":1},"field":{"every":7,"chance":0.77,"shares":1},"lamp":{"every":7,"chance":0.84,"shares":1},"tree":{"every":14,"chance":0.7,"shares":1},"litter":{"every":14,"chance":0.7,"shares":1},"glade":{"every":30,"chance":0.25,"shares":1},"falls":{"every":15,"chance":0.3,"shares":1}},
    "haunts": [["blooms","town",null,[[15.51,57.79],[16.81,57.68],[18.07,58.29],[16.67,59.67],[15.71,58.9]]],["blooms","town",null,[[54.43,7.38],[55.69,10.77],[54.63,9.8],[53.64,9.1],[54.71,8.67]]],["blooms","town",null,[[53.86,27.1],[54.83,29.15],[53.62,29.48],[53.36,30.72],[52.41,28.71]]],["blooms","town",null,[[60.04,61.22],[59.94,60.11],[61.14,60.17],[63.2,60.11],[61.94,63.07]]],["blooms","town",null,[[11.07,27.53],[13.47,27.64],[14.2,28.92],[12.6,29.59],[10.79,29.34]]],["blooms","town",null,[[17.43,1.65],[19.28,3.36],[17.88,4.72],[18.14,3.4],[16.77,3.5]]],["blooms","town",null,[[30.38,44.26],[33.57,44.85],[32.3,45.78],[30.43,46.26],[29.61,44.93]]],["blooms","town",null,[[4.64,17.44],[5.66,16.9],[6.97,16.95],[5.66,20.48],[4.42,19.85]]],["lamp","town",null,[[26.5,26.5]]],["lamp","town",null,[[37.5,26.5]]],["lamp","town",null,[[26.5,37.5]]],["lamp","town",null,[[37.5,37.5]]],["lamp","town",null,[[30.5,20.5]]],["lamp","town",null,[[20.5,32.5]]],["lamp","town",null,[[47.5,35.5]]],["water","town",null,[[21.65,53.05],[22.57,53.77],[23.6,52.95],[23.81,56.27],[23.02,55.26]]],["water","town",null,[[34.9,53.05],[35.73,52.42],[36.82,54.02],[35.99,55.4],[34.66,55.81]]],["water","town",null,[[18.51,41.6],[19.22,42.65],[21.13,43.51],[20.8,45.07],[19.62,45.1]]],["water","town",null,[[41.47,59.03],[41.41,57.97],[43.21,58.73],[43.4,60.58],[41.59,60.14]]],["water","town",null,[[8.57,37.75],[10.92,37.63],[11.18,39.21],[11.21,40.26],[9.33,39.11]]],["field","farm",null,[[175.6,27.04],[176.84,27.05],[177.66,27.86],[176.8,30.39],[174.42,29.32]]],["field","farm",null,[[158.48,33.35],[158.88,31.85],[161.74,33.99],[160.69,35.76],[159.29,34.99]]],["field","farm",null,[[157.36,40.36],[158.07,39.06],[159.25,40.07],[159.31,42.07],[158.03,41.68]]],["field","farm",null,[[184.9,40.85],[186.38,40.04],[187.3,42.37],[185.56,42.52],[184.42,41.88]]],["field","farm",null,[[182.77,1.02],[183.71,0.46],[184.85,0],[186.41,0.81],[183.55,3.02]]],["field","farm",null,[[148.12,21.73],[149.72,21.05],[150.46,22.78],[149.07,23.5],[147.3,22.87]]],["field","farm",null,[[176.55,18.91],[177.76,18.68],[178.82,17.7],[178.82,19.7],[176.58,20.21]]],["field","farm",null,[[147.92,11.26],[148.97,9.27],[149.53,10.46],[151.15,12.53],[149.41,13.3]]],["field","farm",null,[[139.12,8.41],[139.42,9.58],[140.42,10.53],[139.94,12.64],[137.21,10.55]]],["field","farm",null,[[185.76,33.51],[186.64,34.52],[186.8,36.25],[186.97,37.28],[185.63,36.24]]],["field","farm",null,[[155.36,1.47],[158.46,0.88],[157.94,2.27],[157.16,3.65],[156.44,2.37]]],["field","farm",null,[[165.75,22.04],[167.12,20.73],[168.47,22.29],[168.25,23.46],[166.32,23.4]]],["field","farm",null,[[130.08,9.83],[133.17,10.11],[131.44,12.26],[130.4,12.08],[129.19,10.97]]],["field","farm",null,[[128.84,34.71],[130.33,34.8],[131.61,35.61],[129.54,36.71],[128.71,36.05]]],["water","farm",null,[[155.72,21.86],[157.46,22.53],[157.23,24.18],[156.31,25.16],[154.92,24.71]]],["blooms","forest","edge",[[213.55,180.83],[215.36,180.51],[216.8,183.06],[215.23,182.45],[213.25,182.16]]],["blooms","forest","edge",[[235.42,177.61],[237.2,177.14],[238.26,177.02],[238.81,179.54],[236.76,179.96]]],["blooms","forest","edge",[[205.32,179.32],[206.13,178.72],[207.84,178.76],[209.45,178.9],[209.39,180.17]]],["blooms","forest","edge",[[156.45,177.32],[156.51,176.31],[157.91,175.38],[158.62,177.45],[156.84,178.71]]],["blooms","forest","edge",[[225.96,179.19],[227.13,179.41],[228.15,181.44],[226.99,181.51],[225.63,180.54]]],["blooms","forest","edge",[[172,180.5],[172.86,179.55],[174.34,180.3],[174.43,182.03],[171.86,182.53]]],["blooms","forest","edge",[[213.89,172.22],[214.94,173.17],[216.02,173.84],[214.2,175.28],[212.28,175.41]]],["blooms","forest","edge",[[170.59,174.33],[170.38,172.82],[172.23,173.99],[173.68,174.34],[172.26,175.38]]],["blooms","forest","edge",[[162.85,180.53],[163.12,181.86],[164.14,183.79],[162.26,184.41],[162.06,183.24]]],["field","forest","edge",[[193.54,176.31],[195.28,176.27],[195.19,175.24],[196.42,177.89],[194.29,178.56]]],["field","forest","edge",[[146.17,185.34],[146.44,184.3],[149.69,184.82],[148.52,186.91],[145.34,185.92]]],["field","forest","edge",[[180.07,184.23],[180.88,184.91],[182.53,184.86],[182.58,186.85],[180.74,186.44]]],["field","forest","edge",[[184.62,176.14],[184.61,174.46],[187.56,175.3],[186.53,177.62],[184.73,177.97]]],["field","forest","edge",[[223.59,172],[225.98,171.95],[226.71,174],[224.78,175.13],[222.92,173.66]]],["water","forest","stream",[[214.51,137.49],[215.6,137.75],[217.35,137.55],[218.71,137.7],[218.3,139.89]]],["water","forest","stream",[[152.58,142.05],[153.61,141.47],[156.14,141.09],[155.25,141.98],[155.76,142.9]]],["water","forest","stream",[[169.26,136.85],[171,136.44],[171.17,135.44],[172.82,137.85],[170.27,138.09]]],["water","forest","stream",[[194.27,134.12],[195.99,135.32],[194.85,138.47],[193.58,138.31],[192.72,137.14]]],["water","forest","stream",[[182.64,137.71],[184.26,138.66],[183.11,139.92],[181.68,138.82],[180.35,139.08]]],["water","forest","stream",[[200.66,136.32],[204.69,135.8],[203.75,136.97],[202.54,137.63],[201.57,137.12]]],["water","forest","stream",[[164.15,141.34],[165.27,141.48],[165.47,142.83],[163.84,144],[162.22,144.45]]],["water","forest","stream",[[227.76,147.3],[228.92,146.56],[230.48,147.11],[230.07,149.2],[228.57,149.41]]],["water","forest","stream",[[144.55,139.14],[145.56,139.79],[145.63,138.71],[147.35,139.45],[148.68,140.03]]],["falls","forest","stream",[[226.51,139.22],[228.31,139.24],[227.59,140.5],[225.52,141.24],[224.56,141.88]]],["litter","forest","bamboo",[[146.83,169.78],[147.76,168.83],[149.67,169.55],[149.9,171.24],[148.94,171.97]]],["litter","forest","woods",[[201.59,161.55],[203.36,160.14],[203.59,164.46],[202.55,163.02],[201.35,162.84]]],["litter","forest","deep",[[177.68,126.64],[178.95,126.48],[180.56,126.97],[179.21,127.93],[177.78,128.35]]],["litter","forest","deep",[[146.45,133.8],[147.58,133.43],[148.87,133.98],[148.24,136.24],[146.19,135.14]]],["litter","forest","rise",[[230.67,166.35],[232.09,166],[232.95,166.66],[231.14,169.47],[229.96,167.94]]],["litter","forest","deep",[[182.69,113.41],[186.68,113.19],[185.36,113.93],[184.28,114.63],[182.81,114.52]]],["litter","forest","deep",[[223.89,113.4],[224.89,112.62],[226.33,113.99],[226.19,115.05],[225.26,115.79]]],["litter","forest","deep",[[158.38,130.85],[160.39,129.98],[160.82,132.37],[160.15,133.59],[159.11,132.33]]],["litter","forest","deep",[[148.31,113.97],[149.34,114.4],[149.57,115.69],[149.81,116.88],[148.37,117.34]]],["litter","forest","woods",[[196.59,171.2],[197.52,169.86],[199.83,169.96],[199.88,171.64],[199.54,172.73]]],["litter","forest","deep",[[214.64,114.84],[216.69,114.01],[216.96,115.84],[215.48,116.91],[214.7,116.28]]],["litter","forest","bamboo",[[164.06,164.52],[164.72,163.68],[166.92,164.49],[165.02,166.78],[164.33,165.85]]],["litter","forest","rise",[[212.69,161.46],[213.6,160.86],[214.86,160.29],[215.58,162.16],[214.19,162.88]]],["litter","forest","rise",[[231.54,158.29],[233.32,157.44],[234.28,158.36],[232.45,159.66],[230.76,159.42]]],["glade","forest","deep",[[191.63,121],[192.43,119.32],[192.63,120.67],[193.99,121.38],[192.51,122.43]]],["glade","forest","deep",[[217.89,120.6],[220.49,120.81],[221.76,121.53],[220.92,123.02],[217.65,121.71]]],["glade","forest","deep",[[189.67,114.07],[188.96,113.21],[191.19,113.82],[191.68,115.81],[188.65,115.52]]],["glade","forest","deep",[[161.26,122.63],[161.66,121.45],[163.41,125.33],[161.93,124.15],[160.5,124.13]]],["tree","forest","deep",[[211.5,134.78],[209.5,134.78],[210.5,132.78],[207.5,133.78]]],["tree","forest","deep",[[199.5,129.78],[199.5,127.78],[196.5,131.78],[202.5,127.78]]],["tree","forest","bamboo",[[145.5,157.78],[145.5,153.78],[144.5,150.78]]],["tree","forest","deep",[[168.5,116.78],[165.5,115.78],[166.5,119.78],[169.5,120.78]]],["tree","forest","deep",[[178.5,112.78],[181.5,113.78],[181.5,115.78],[176.5,116.78]]],["tree","forest","woods",[[198.5,152.78],[197.5,154.78],[199.5,150.78],[199.5,148.78]]],["tree","forest","deep",[[226.5,122.78],[229.5,120.78],[229.5,125.78],[223.5,126.78]]],["tree","forest","deep",[[206.5,112.78],[207.5,115.78],[210.5,112.78],[209.5,116.78]]],["tree","forest","woods",[[185.5,145.78],[184.5,147.78],[187.5,141.78],[181.5,142.78]]],["tree","forest","woods",[[180.5,171.78],[182.5,172.78],[175.5,172.78]]],["tree","forest","rise",[[239.5,155.78],[239.5,157.78],[239.5,151.78],[239.5,149.78]]],["tree","forest","bamboo",[[144.5,146.78],[144.5,150.78],[145.5,153.78]]],["tree","forest","deep",[[236.5,112.78],[236.5,115.78],[238.5,116.78],[236.5,117.78]]],["tree","forest","deep",[[204.5,121.78],[202.5,123.78],[204.5,124.78],[207.5,122.78]]],["tree","forest","deep",[[171.5,122.78],[173.5,122.78],[169.5,120.78],[174.5,125.78]]],["tree","forest","rise",[[238.5,172.78],[239.5,169.78],[238.5,166.78]]],["lamp","forest","camp",[[193.5,159.5]]]],
    "net": {"reach":2.4,"far":4,"misses":2},
    "nets": ["bugNet"],
    "lures": ["resin","wildApple"],
    "rare": ["morpho","glassDragonfly","orchidMantis","lunaMoth","hawkMoth","stagBeetle","jewelBeetle","herculesBeetle"],
    "comeback": {"after":30,"least":120},
    "scarce": {"day":24,"half":20},
    "nectar": {"within":10,"soon":3,"stays":120,"at":["blooms","water","field","lamp","litter"],"maps":[["town",0,0,64,64],["farm",128,0,60,44],["forest",144,112,96,80]]},
    "pair": {"slack":2500}
  }$town$::jsonb)
  on conflict (key) do update set data = excluded.data, updated_at = now();
-- </catalog:v174>

do $$
begin
  if town.cat('forge')->'fire' is null or town.cat('forge')->'stand' is null or town.cat('forge')->'timed' is null or town.cat('forge')->'old' is null then
    raise exception 'the catalog''s `forge` row has not the great fire''s knobs, the forge''s place, the timed options and the older tools'' steps in it: its block was not written from the code';
  end if;
end $$;

-- ─── 2. The gate ─────────────────────────────────────────────────────────

insert into public.town_knobs (key, value) values
  ('smith_open', 0)         -- whether the blacksmith is open to every proved character: until it is, to admins only
  on conflict (key) do nothing;

-- Who is asking, of the smith: `town.far_member()`'s answer, with one thing more: the smith is open to them.
create or replace function town.smith_member()
returns uuid language plpgsql stable set search_path = public
as $$
declare
  me uuid := town.far_member();
begin
  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) <= 0 then
    raise exception 'the blacksmith is not open yet' using errcode = '42501';
  end if;
  return me;
end;
$$;

-- Whether the smith is open to whoever asks: the same rule, as a yes or no.
create or replace function public.town_smith_open()
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
     and (public.is_admin()
          or (public.verified_character()
              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0
              and coalesce((select k.value from public.town_knobs k where k.key = 'far_open'), 0) > 0
              and coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) > 0));
$$;

comment on function public.town_smith_open() is
  'Whether Cash Town''s blacksmith is open to whoever asks: an admin always, a proved character while '
  'town_knobs.game_open, town_knobs.far_open and town_knobs.smith_open are all above nothing.';

-- Whether the smith is open to a member, by their id: for whoever is not the asker (a rock is paid to whoever struck
-- it first, who may be another than the one who broke it).
create or replace function town.smith_for(p_who uuid)
returns boolean language sql stable set search_path = public
as $$
  select coalesce((select pr.is_admin from public.profiles pr where pr.id = p_who), false)
      or (coalesce((select k.value from public.town_knobs k where k.key = 'smith_open'), 0) > 0 and town.is_member(p_who))
$$;

-- ─── 3. What is kept ─────────────────────────────────────────────────────

-- What a member has at the smith. Gone with the member. No browser reads or writes it: the functions below do.
create table if not exists public.town_smiths (
  member_id  uuid primary key references public.profiles (id) on delete cascade,
  doc        jsonb not null default '{}'::jsonb check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.town_smiths enable row level security;
revoke all on table public.town_smiths from anon, authenticated;

-- The village's board at the smith: lib/town/forge's newBoard().
insert into public.town_things (key, doc) values ('smith', '{"tops": {}, "found": {}}'::jsonb) on conflict (key) do nothing;

-- The forge's great fire, the village's one: a table of one row. (Its document is read by the rules alone: see the head.)
create table if not exists public.town_great_fire (
  one        boolean primary key default true check (one),
  doc        jsonb not null default '{}'::jsonb check (jsonb_typeof(doc) = 'object'),
  updated_at timestamptz not null default now()
);

alter table public.town_great_fire enable row level security;
revoke all on table public.town_great_fire from anon, authenticated;

insert into public.town_great_fire (one) values (true) on conflict (one) do nothing;

-- ─── 4a. The table (lib/town/forge) ──────────────────────────────────────

-- tryCost: what a try for a level takes of a kind of tool. Null past the top.
create or replace function town.try_cost(p_kind text, p_to integer)
returns jsonb language sql stable
as $$
  select case when f.k->'wooden' ? p_kind
      then jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', ceil((t.v->>'n')::numeric / 2), 'timber', (t.v->>'timber')::numeric * 2)
      else jsonb_build_object('fee', t.v->'fee', 'ore', t.v->'ore', 'n', t.v->'n', 'timber', t.v->'timber') end
    from (select town.cat('forge') as k) f, jsonb_array_elements(f.k->'tries') t(v)
   where (t.v->>'to')::numeric = p_to limit 1
$$;

-- tryOdds: how a try for a level may go, in hundredths: null past the top.
create or replace function town.try_odds(p_to integer)
returns jsonb language sql stable
as $$
  select jsonb_build_object('take', t.v->'take', 'stay', t.v->'stay', 'down', t.v->'down')
    from jsonb_array_elements(town.cat('forge')->'tries') t(v) where (t.v->>'to')::numeric = p_to limit 1
$$;

-- outcomeOf: how a try for a level goes, from a number of chance (nothing up to one).
create or replace function town.outcome_of(p_to integer, p_r double precision)
returns text language sql stable
as $$
  select coalesce((
    select case when x.x < (t.o->>'take')::double precision then 'taken'
                when x.x < (t.o->>'take')::double precision + (t.o->>'stay')::double precision then 'stays' else 'down' end
      from (select town.try_odds(p_to) as o) t, (select greatest(0::double precision, least(0.999999::double precision, p_r)) * 100 as x) x
     where t.o is not null), 'stays')
$$;

-- ─── 4b. What a member has at the smith, made sound ──────────────────────

-- newSmithy.
create or replace function town.smithy_new()
returns jsonb language sql immutable
as $$ select '{"queue": [], "more": 0, "ember": 0, "pending": null}'::jsonb $$;

-- soundSmithy: a smithy made sound, whatever was kept: only pieces that are smelted, in order of their ends, each
-- with the presses it has had within their bound; a draw only if it is one; counts within their bounds.
create or replace function town.smithy_sound(p_kept jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  p jsonb := k->'pending';
  each_ numeric := (f->'smith'->'bellows'->>'each')::numeric;
  queue jsonb;
  pending jsonb := 'null'::jsonb;
begin
  queue := coalesce((select jsonb_agg(jsonb_build_object('piece', q.v->'piece', 'from', q.v->'from', 'till', q.v->'till')
        || case when jsonb_typeof(q.v->'blown') = 'number' and greatest(0, least(each_, floor((q.v->>'blown')::numeric))) > 0
                then jsonb_build_object('blown', greatest(0, least(each_, floor((q.v->>'blown')::numeric)))) else '{}'::jsonb end
        order by (q.v->>'till')::numeric, q.ord)
    from jsonb_array_elements(case when jsonb_typeof(k->'queue') = 'array' then k->'queue' else '[]'::jsonb end) with ordinality q(v, ord)
   where case when jsonb_typeof(q.v) = 'object' and jsonb_typeof(q.v->'piece') = 'string' and jsonb_typeof(q.v->'from') = 'number' and jsonb_typeof(q.v->'till') = 'number'
              then f->'smelts'->'of' ? (q.v->>'piece') and (q.v->>'till')::numeric >= (q.v->>'from')::numeric else false end), '[]'::jsonb);
  if jsonb_typeof(p) = 'object' and jsonb_typeof(p->'item') = 'string' and town.tool_kind(p->>'item') is not null and jsonb_typeof(p->'at') = 'number' and jsonb_typeof(p->'offer') = 'array' then
    if (p->>'at')::numeric = floor((p->>'at')::numeric) and (p->>'at')::numeric >= 0 and (p->>'at')::numeric < jsonb_array_length(f->'forge'->'milestones')
       and not exists (select 1 from jsonb_array_elements(p->'offer') o where jsonb_typeof(o) <> 'string') then
      pending := jsonb_build_object('item', p->'item', 'at', p->'at', 'offer', p->'offer')
        || case when jsonb_typeof(p->'old') = 'string' then jsonb_build_object('old', p->'old') else '{}'::jsonb end;
    end if;
  end if;
  return jsonb_build_object('queue', queue, 'pending', pending,
    'more', case when jsonb_typeof(k->'more') = 'number' then greatest(0, least(jsonb_array_length(f->'smith'->'more'), floor((k->>'more')::numeric))) else 0 end,
    'ember', case when jsonb_typeof(k->'ember') = 'number' then greatest(0, floor((k->>'ember')::numeric)) else 0 end);
end;
$$;

-- ─── 4c. Smelting ────────────────────────────────────────────────────────

-- placesOf: how many places a member's queue has.
create or replace function town.smith_places(p_smithy jsonb)
returns integer language sql stable
as $$
  select ((k.s->>'places')::numeric + (k.s->>'wider')::numeric * greatest(0, least(jsonb_array_length(k.s->'more'), coalesce((p_smithy->>'more')::numeric, 0))))::integer
    from (select town.cat('forge')->'smith' as s) k
$$;

-- smithView: the queue at a moment: the pieces that are done and wait to be taken, the one smelting, those waiting
-- their turn; and how many places are free (a piece that is done takes none).
create or replace function town.smith_view(p_smithy jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  with q as (select e.v, e.ord, (e.v->>'till')::numeric <= p_now as done from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)),
       cur as (select min(q.ord) as ord from q where not q.done and (q.v->>'from')::numeric <= p_now),
       places as (select town.smith_places(p_smithy) as n)
  select jsonb_build_object(
    'done', coalesce((select jsonb_agg(q.v order by q.ord) from q where q.done), '[]'::jsonb),
    'now', coalesce((select q.v from q, cur where q.ord = cur.ord), 'null'::jsonb),
    'waiting', coalesce((select jsonb_agg(q.v order by q.ord) from q, cur where not q.done and q.ord is distinct from cur.ord), '[]'::jsonb),
    'places', (select n from places),
    'free', greatest(0, (select n from places) - (select count(*) from q where not q.done)))
$$;

-- dryOf (the number is the option's own, read off the registry).
create or replace function town.smith_dry(p_bag jsonb)
returns integer language sql stable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_bag) s where town.tool_has(s, 'axDry'))
    then (town.cat('forge')->'options'->'of'->'axDry'->'n'->>'pieces')::integer else 1 end
$$;

-- timberFor: how much fine timber so many pieces take now: so much a piece, less what a timber already burned still smelts.
create or replace function town.smith_timber(p_smithy jsonb, p_n integer, p_dry integer)
returns jsonb language plpgsql stable
as $$
declare
  each_ numeric := (town.cat('forge')->'smelting'->>'timber')::numeric;
  ember numeric := (p_smithy->>'ember')::numeric;
  timber numeric := 0;
  i integer;
begin
  for i in 1..p_n loop
    if ember > 0 then ember := ember - 1; continue; end if;
    timber := timber + each_;
    ember := greatest(0, p_dry - 1);
  end loop;
  return jsonb_build_object('timber', timber, 'ember', ember);
end;
$$;

-- smelt: so many pieces of one kind put in to smelt: they are paid for now (from the bag, then a pouch) and join the
-- end of the queue.
create or replace function town.smelt(p_purse jsonb, p_smithy jsonb, p_piece text, p_n numeric, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  rule jsonb := f->'smelts'->'of'->p_piece;
  queue jsonb := p_smithy->'queue';
  fragments numeric;
  burn jsonb;
  fee_ numeric;
  spent jsonb;
  from_ numeric;
  till_ numeric;
  i integer;
begin
  if rule is null then return town.no('none'); end if;
  if p_n is null or p_n <> floor(p_n) or p_n <= 0 then return town.no('amount'); end if;
  if (town.smith_view(p_smithy, p_now)->>'free')::numeric < p_n then return town.no('places'); end if;
  fragments := (f->'smelting'->>'fragments')::numeric * p_n;
  if town.held_in(p_purse, rule->>'of') < fragments then return town.no('ore'); end if;
  burn := town.smith_timber(p_smithy, p_n::integer, town.smith_dry(p_purse->'bag'));
  if town.held_in(p_purse, 'timber') < (burn->>'timber')::numeric then return town.no('timber'); end if;
  fee_ := (rule->>'fee')::numeric * p_n;
  if (p_purse->>'coins')::numeric < fee_ then return town.no('coins'); end if;
  spent := town.take_out(p_purse, rule->>'of', fragments::integer);
  if (burn->>'timber')::numeric > 0 then spent := town.take_out(spent, 'timber', (burn->>'timber')::integer); end if;
  from_ := greatest(p_now::numeric, coalesce((select max((q->>'till')::numeric) from jsonb_array_elements(queue) q), p_now::numeric));
  for i in 1..p_n::integer loop
    till_ := from_ + (rule->>'mins')::numeric * 60000;
    queue := queue || jsonb_build_array(jsonb_build_object('piece', p_piece, 'from', from_, 'till', till_));
    from_ := till_;
  end loop;
  return jsonb_build_object('ok', true, 'timber', burn->'timber', 'fee', fee_,
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - fee_),
    'smithy', p_smithy || jsonb_build_object('queue', queue, 'ember', burn->'ember'));
end;
$$;

-- collect: what is done taken: as much of it as there is room for (in a pouch that holds it, then the bag); the rest
-- goes on waiting.
create or replace function town.smith_collect(p_purse jsonb, p_smithy jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  mine jsonb := p_purse;
  got jsonb := '[]'::jsonb;
  left_ jsonb := '[]'::jsonb;
  q jsonb;
  piece text;
  done_ integer := 0;
begin
  for q in select e.v from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric <= p_now order by e.ord loop
    done_ := done_ + 1;
    piece := q->>'piece';
    if town.room_in(mine, piece) < 1 then left_ := left_ || jsonb_build_array(q); continue; end if;
    mine := town.stow_away(mine, piece, 1);
    if exists (select 1 from jsonb_array_elements(got) g where g->>0 = piece) then
      got := (select jsonb_agg(case when g.v->>0 = piece then jsonb_build_array(piece, (g.v->>1)::integer + 1) else g.v end order by g.ord) from jsonb_array_elements(got) with ordinality g(v, ord));
    else
      got := got || jsonb_build_array(jsonb_build_array(piece, 1));
    end if;
  end loop;
  if done_ = 0 then return town.no('none'); end if;
  if jsonb_array_length(got) = 0 then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'got', got, 'purse', mine,
    'smithy', p_smithy || jsonb_build_object('queue', left_
      || coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord) where (e.v->>'till')::numeric > p_now), '[]'::jsonb)));
end;
$$;

-- bellowsLeft: how many presses of the bellows the piece smelting now may still take, whoever presses: none, with
-- nothing smelting.
create or replace function town.bellows_left(p_smithy jsonb, p_now bigint)
returns integer language sql stable
as $$
  select case when v.cur = 'null'::jsonb then 0
    else greatest(0, (town.cat('forge')->'smith'->'bellows'->>'each')::numeric - coalesce((v.cur->>'blown')::numeric, 0))::integer end
    from (select town.smith_view(p_smithy, p_now)->'now' as cur) v
$$;

-- bellowsOff: what one press takes off a piece, in milliseconds: its share of the time a piece of its kind smelts
-- (rounded as the code rounds: a half goes up).
create or replace function town.bellows_off(p_piece text)
returns numeric language sql stable
as $$
  select floor(coalesce((f.k->'smelts'->'of'->p_piece->>'mins')::double precision, 0) * 60000 * (f.k->'smith'->'bellows'->>'share')::double precision + 0.5)::numeric
    from (select town.cat('forge') as k) f
$$;

-- bellows: a press of the bellows of somebody's queue: its share off the piece smelting now (never past its end), as
-- much off everything behind it, and the press counted on the piece. Never one's own.
create or replace function town.bellows(p_smithy jsonb, p_owner text, p_by text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  each_ integer := (town.cat('forge')->'smith'->'bellows'->>'each')::integer;
  cur integer;
  piece jsonb;
  off_ numeric;
begin
  if p_by = p_owner then return town.no('self'); end if;
  select min(e.ord)::integer into cur from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord)
   where (e.v->>'till')::numeric > p_now and (e.v->>'from')::numeric <= p_now;
  if cur is null then return town.no('idle'); end if;
  piece := p_smithy->'queue'->(cur - 1);
  if coalesce((piece->>'blown')::numeric, 0) >= each_ then return town.no('tired'); end if;
  off_ := least(town.bellows_off(piece->>'piece'), (piece->>'till')::numeric - p_now);
  -- (the piece smelting ends sooner; whatever waits behind it begins and ends as much sooner)
  return jsonb_build_object('ok', true, 'off', off_, 'smithy', p_smithy || jsonb_build_object(
    'queue', (select jsonb_agg(case when (e.v->>'till')::numeric <= p_now then e.v
                                    when e.ord = cur then e.v || jsonb_build_object('till', (e.v->>'till')::numeric - off_, 'blown', coalesce((e.v->>'blown')::numeric, 0) + 1)
                                    else e.v || jsonb_build_object('from', (e.v->>'from')::numeric - off_, 'till', (e.v->>'till')::numeric - off_) end order by e.ord)
                from jsonb_array_elements(p_smithy->'queue') with ordinality e(v, ord))));
end;
$$;

-- widen: the queue made wider: so many places more, for fine timber and coins. As wide as it gets after the last.
create or replace function town.smith_widen(p_purse jsonb, p_smithy jsonb)
returns jsonb language plpgsql stable
as $$
declare
  more_ integer := (p_smithy->>'more')::integer;
  cost_ jsonb := case when more_ >= 0 then town.cat('forge')->'smith'->'more'->more_ end;
begin
  if cost_ is null then return town.no('top'); end if;
  if town.held_in(p_purse, 'timber') < (cost_->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost_->>'coins')::numeric then return town.no('coins'); end if;
  return jsonb_build_object('ok', true,
    'purse', town.take_out(p_purse, 'timber', (cost_->>'timber')::integer) || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost_->>'coins')::numeric),
    'smithy', p_smithy || jsonb_build_object('more', more_ + 1));
end;
$$;

-- ─── 4d. A forging try ───────────────────────────────────────────────────

-- drawable: the options of a pool that may be drawn for a kind of tool now: in the registry's order, those of the
-- pool, for the kind, that are built.
create or replace function town.forge_drawable(p_kind text, p_pool integer)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(o.id order by o.ord), '[]'::jsonb)
    from (select town.cat('forge') as k) f, jsonb_array_elements_text(f.k->'options'->'order') with ordinality o(id, ord)
   where (f.k->'options'->'of'->o.id->>'pool')::integer = p_pool and f.k->'options'->'of'->o.id->'tools' ? p_kind and f.k->'built'->p_kind->'opts' ? o.id
$$;

-- settable: whether a gem of an element may be set in a kind of tool now.
create or replace function town.forge_settable(p_kind text, p_element text)
returns boolean language sql stable
as $$ select coalesce(town.cat('forge')->'built'->p_kind->'gems' ? p_element, false) $$;

-- withState: a stack with its own state written as it is kept: nothing kept that says nothing. The options to the
-- last there is, a milestone with none before it as an empty word.
create or replace function town.tool_with(p_stack jsonb, p_plus integer, p_opts jsonb, p_gems jsonb)
returns jsonb language plpgsql immutable
as $$
declare
  last_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.v <> 'null'::jsonb);
  s jsonb := p_stack - 'plus' - 'opts' - 'gems';
begin
  if p_plus > 0 then s := s || jsonb_build_object('plus', p_plus); end if;
  if last_ is not null then
    s := s || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_opts) with ordinality o(v, ord) where o.ord <= last_));
  end if;
  if jsonb_array_length(p_gems) > 0 then s := s || jsonb_build_object('gems', p_gems); end if;
  return s;
end;
$$;

-- withMaker: a tool with its maker written at a milestone: only where nobody is written there yet, and only a name
-- that is one.
create or replace function town.tool_with_maker(p_stack jsonb, p_at integer, p_by text)
returns jsonb language plpgsql stable
as $$
declare
  name_ text := town.maker_name(to_jsonb(p_by));
  had jsonb := town.tool_makers(p_stack);
  makers jsonb;
  last_ integer;
begin
  if coalesce(name_, '') = '' or p_at is null or p_at < 0 or p_at >= jsonb_array_length(had) or coalesce(had->p_at, 'null'::jsonb) <> 'null'::jsonb then return p_stack; end if;
  makers := (select jsonb_agg(case when m.ord - 1 = p_at then to_jsonb(name_) when m.v = 'null'::jsonb then '""'::jsonb else m.v end order by m.ord)
               from jsonb_array_elements(had) with ordinality m(v, ord));
  last_ := (select max(m.ord)::integer from jsonb_array_elements(makers) with ordinality m(v, ord) where m.v <> '""'::jsonb);
  return p_stack || jsonb_build_object('makers', (select jsonb_agg(m.v order by m.ord) from jsonb_array_elements(makers) with ordinality m(v, ord) where m.ord <= last_));
end;
$$;

-- candidates: the options a draw for a milestone may lay out for a tool: those of the milestone's pool that are
-- built, less every one the tool has. None, for a forging that is away from home.
create or replace function town.forge_candidates(p_stack jsonb, p_at integer)
returns jsonb language sql stable
as $$
  select case when k.kind is null or k.pool is null or town.tool_away(p_stack) then '[]'::jsonb
    else coalesce((select jsonb_agg(d.id order by d.ord) from jsonb_array_elements_text(town.forge_drawable(k.kind, k.pool)) with ordinality d(id, ord)
                    where not town.tool_drawn(p_stack) ? d.id), '[]'::jsonb) end
    from (select town.tool_kind(p_stack->>'item') as kind, case when p_at >= 0 then (town.cat('forge')->'forge'->'pools'->>p_at)::integer end as pool) k
$$;

-- owedOf: the milestone a tool is owed a draw at: the first its level has reached that has no option yet and
-- something to draw. -1 when it is owed none, and for a forging that is away from home.
create or replace function town.forge_owed(p_stack jsonb)
returns integer language sql stable
as $$
  select case when town.tool_away(p_stack) then -1 else
    coalesce((select (m.ord - 1)::integer from jsonb_array_elements(town.cat('forge')->'forge'->'milestones') with ordinality m(v, ord)
      where town.tool_level(p_stack) >= (m.v #>> '{}')::integer and town.tool_drawn(p_stack)->((m.ord - 1)::integer) = 'null'::jsonb
        and jsonb_array_length(town.forge_candidates(p_stack, (m.ord - 1)::integer)) > 0
      order by m.ord limit 1), -1) end
$$;

-- forgeTry: a try at the tool in a slot of the bag. Its materials (from the bag, then a pouch) and its fee are spent,
-- taken or not. `p_r` is the number of chance whoever keeps the game drew (the function a member calls draws it: no
-- browser sends one). A failure leaves the level or lowers it by one, as the table says, and never under the floor;
-- the tool is never lost. `p_by`: what whoever forges is called: written on the tool at a milestone it is taken to,
-- where nobody is written yet.
create or replace function town.forge_try(p_purse jsonb, p_slot integer, p_r double precision, p_by text default '')
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge')->'forge';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  from_ integer;
  cost_ jsonb;
  out_ text;
  level_ integer;
  spent jsonb;
  raised jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  -- (a forging that sits in a kind of tool of another pool is moved back first)
  if town.tool_away(stack) then return town.no('foreign'); end if;
  from_ := town.tool_level(stack);
  if from_ >= (f->>'top')::integer then return town.no('top'); end if;
  -- (a draw the tool is owed is chosen before it is forged further)
  if town.forge_owed(stack) >= 0 then return town.no('owed'); end if;
  cost_ := town.try_cost(kind_, from_ + 1);
  if town.held_in(p_purse, cost_->>'ore') < (cost_->>'n')::numeric then return town.no('ore'); end if;
  if town.held_in(p_purse, 'timber') < (cost_->>'timber')::numeric then return town.no('timber'); end if;
  if (p_purse->>'coins')::numeric < (cost_->>'fee')::numeric then return town.no('coins'); end if;
  out_ := town.outcome_of(from_ + 1, p_r);
  level_ := case out_ when 'taken' then from_ + 1 when 'down' then greatest(least(from_, (f->>'floor')::integer), from_ - 1) else from_ end;
  spent := town.take_out(town.take_out(p_purse, cost_->>'ore', (cost_->>'n')::integer), 'timber', (cost_->>'timber')::integer);
  -- (the tool stays in its slot: taking its materials never moves it, for a tool is no ore and no timber)
  raised := town.tool_with(coalesce(nullif(spent->'bag'->p_slot, 'null'::jsonb), stack), level_, town.tool_drawn(stack), town.tool_gems(stack));
  if out_ = 'taken' then
    raised := town.tool_with_maker(raised,
      coalesce((select (m.ord - 1)::integer from jsonb_array_elements(f->'milestones') with ordinality m(v, ord) where (m.v #>> '{}')::integer = level_ order by m.ord limit 1), -1), p_by);
  end if;
  return jsonb_build_object('ok', true, 'out', out_, 'from', from_, 'level', level_, 'item', kind_, 'owed', town.forge_owed(raised),
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (cost_->>'fee')::numeric, 'bag', jsonb_set(spent->'bag', array[p_slot::text], raised)));
end;
$$;

-- ─── 4e. The options ─────────────────────────────────────────────────────

-- pickOffer: two (or as many as there are) of some options, by two numbers of chance: never the same one twice.
create or replace function town.pick_offer(p_from jsonb, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  n integer := (town.cat('forge')->'smith'->>'offer')::integer;
  left_ jsonb := p_from;
  out_ jsonb := '[]'::jsonb;
  r double precision;
  i integer;
  k integer := 0;
begin
  foreach r in array array[p_r1, p_r2] loop
    k := k + 1;
    exit when k > n or jsonb_array_length(left_) = 0;
    i := least(jsonb_array_length(left_) - 1, floor(greatest(0::double precision, least(0.999999::double precision, r)) * jsonb_array_length(left_))::integer);
    out_ := out_ || jsonb_build_array(left_->i);
    left_ := left_ - i;
  end loop;
  return out_;
end;
$$;

-- Whether a stack is the tool a waiting draw is for: of its kind, not away from home, and (of a draw made again) with
-- the option the draw was made over, whatever its level; or (of a draw that is owed) at its milestone or past it with
-- no option there.
create or replace function town.pending_fits(p_stack jsonb, p_pending jsonb)
returns boolean language sql stable
as $$
  select coalesce(p_stack is not null and p_stack <> 'null'::jsonb and town.tool_kind(p_stack->>'item') = p_pending->>'item' and not town.tool_away(p_stack)
    and case when coalesce(p_pending->>'old', '') <> '' then town.tool_drawn(p_stack)->>((p_pending->>'at')::integer) = p_pending->>'old'
             else town.tool_level(p_stack) >= (town.cat('forge')->'forge'->'milestones'->>((p_pending->>'at')::integer))::integer
                  and town.tool_drawn(p_stack)->((p_pending->>'at')::integer) = 'null'::jsonb end, false)
$$;

-- pendingSlot: the slot of the tool a waiting draw is for: the one said, if it fits; or else the first in the bag
-- that does. -1 when no tool in the bag fits it.
create or replace function town.pending_slot(p_purse jsonb, p_pending jsonb, p_slot integer)
returns integer language sql stable
as $$
  select case when p_pending is null or p_pending = 'null'::jsonb then -1
    when p_slot >= 0 and town.pending_fits(p_purse->'bag'->p_slot, p_pending) then p_slot
    else coalesce((select (b.ord - 1)::integer from jsonb_array_elements(p_purse->'bag') with ordinality b(v, ord) where town.pending_fits(b.v, p_pending) order by b.ord limit 1), -1) end
$$;

-- draw: the draw a tool is owed laid out: two options of its milestone's pool. One draw waits at a time, and a draw
-- that waits is the one laid out again, whatever chance is given: it is not drawn anew by going away and coming back.
create or replace function town.forge_draw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  waits integer := town.pending_slot(p_purse, waiting, p_slot);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  at_ integer;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and waits >= 0 then
    if waits is not distinct from p_slot then return jsonb_build_object('ok', true, 'smithy', p_smithy, 'pending', waiting, 'slot', p_slot, 'fresh', false); end if;
    return town.no('owed');
  end if;
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if town.tool_away(stack) then return town.no('foreign'); end if;
  at_ := town.forge_owed(stack);
  if at_ < 0 then return town.no('none'); end if;
  pending := jsonb_build_object('item', kind_, 'at', at_, 'offer', town.pick_offer(town.forge_candidates(stack, at_), p_r1, p_r2));
  return jsonb_build_object('ok', true, 'smithy', p_smithy || jsonb_build_object('pending', pending), 'pending', pending, 'slot', p_slot, 'fresh', true);
end;
$$;

-- redraw: the option of a milestone drawn again, for a gem of any element (from the bag, then a pouch) and a fee: two
-- are laid out, and the old one may be kept. Of any option the tool has, whatever its level has fallen to.
create or replace function town.forge_redraw(p_purse jsonb, p_smithy jsonb, p_slot integer, p_at integer, p_gem text, p_r1 double precision, p_r2 double precision)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('forge');
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  old_ text;
  from_ jsonb;
  pending jsonb;
begin
  if waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_slot) >= 0 then return town.no('owed'); end if;
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if town.tool_away(stack) then return town.no('foreign'); end if;
  old_ := case when p_at >= 0 then town.tool_drawn(stack)->>p_at end;
  if old_ is null then return town.no('none'); end if;
  if town.gem_element(p_gem) is null or town.held_in(p_purse, p_gem) < (f->'smith'->'redraw'->>'gems')::numeric then return town.no('gem'); end if;
  if (p_purse->>'coins')::numeric < (f->'smith'->'redraw'->>'fee')::numeric then return town.no('coins'); end if;
  from_ := town.forge_candidates(stack, p_at);
  if jsonb_array_length(from_) = 0 then return town.no('unbuilt'); end if;
  pending := jsonb_build_object('item', kind_, 'at', p_at, 'offer', town.pick_offer(from_, p_r1, p_r2), 'old', old_);
  return jsonb_build_object('ok', true, 'pending', pending, 'smithy', p_smithy || jsonb_build_object('pending', pending),
    'purse', town.take_out(p_purse, p_gem, (f->'smith'->'redraw'->>'gems')::integer) || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (f->'smith'->'redraw'->>'fee')::numeric));
end;
$$;

-- choose: one of the options laid out chosen (or, of a draw made again, the old one kept): it is the tool's from
-- then on. (A slot that is none is no tool's: the code has no answer there, lib/town/db-vectors-smith.test.ts says where.)
create or replace function town.forge_choose(p_purse jsonb, p_smithy jsonb, p_slot integer, p_pick text)
returns jsonb language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
  stack jsonb;
  kept boolean;
  opts jsonb;
begin
  if p = 'null'::jsonb then return town.no('none'); end if;
  if p_slot is null or p_slot < 0 or town.pending_slot(p_purse, p, p_slot) <> p_slot then return town.no('tool'); end if;
  kept := coalesce(p->>'old', '') <> '' and p_pick is not distinct from p->>'old';
  if not kept and not coalesce(p->'offer' ? p_pick, false) then return town.no('none'); end if;
  stack := p_purse->'bag'->p_slot;
  opts := jsonb_set(town.tool_drawn(stack), array[p->>'at'], to_jsonb(p_pick));
  return jsonb_build_object('ok', true, 'item', p->'item', 'at', p->'at', 'opt', p_pick, 'kept', kept,
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], town.tool_with(stack, town.tool_level(stack), opts, town.tool_gems(stack)))),
    'smithy', p_smithy || '{"pending": null}'::jsonb);
end;
$$;

-- ─── 4f. A gem ───────────────────────────────────────────────────────────

-- setGem: a gem set into the tool in a slot: a gem, its mount (bag and pouches together) and a fee. It always takes;
-- a gem already there is gone. Too little of the mount is said by the mount's own word (fine timber's, or the ore's).
create or replace function town.gem_set(p_purse jsonb, p_slot integer, p_gem text)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := town.cat('forge')->'smith'->'gem';
  stack jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
  kind_ text := town.tool_kind(stack->>'item');
  element_ text := town.gem_element(p_gem);
  over_ text;
  spent jsonb;
begin
  if stack is null or stack = 'null'::jsonb or kind_ is null then return town.no('tool'); end if;
  if element_ is null or town.held_in(p_purse, p_gem) < 1 then return town.no('gem'); end if;
  if not town.forge_settable(kind_, element_) then return town.no('unbuilt'); end if;
  over_ := town.tool_gems(stack)->>0;
  if over_ = element_ then return town.no('same'); end if;
  if town.held_in(p_purse, k->>'mount') < (k->>'mounts')::numeric then return town.no(case when k->>'mount' = 'timber' then 'timber' else 'ore' end); end if;
  if (p_purse->>'coins')::numeric < (k->>'fee')::numeric then return town.no('coins'); end if;
  spent := town.take_out(town.take_out(p_purse, p_gem, 1), k->>'mount', (k->>'mounts')::integer);
  return jsonb_build_object('ok', true, 'item', kind_, 'element', element_, 'over', over_,
    'purse', spent || jsonb_build_object('coins', (p_purse->>'coins')::numeric - (k->>'fee')::numeric,
      'bag', jsonb_set(spent->'bag', array[p_slot::text], town.tool_with(coalesce(nullif(spent->'bag'->p_slot, 'null'::jsonb), stack), town.tool_level(stack), town.tool_drawn(stack), jsonb_build_array(element_)))));
end;
$$;

-- ─── 4g. A move ──────────────────────────────────────────────────────────

-- canHolds (lib/town/farm): how many waterings a can holds when full, as the stack it is: its kind's, and what its
-- own forging adds. None, of what is no can. (Read here because a move cuts a can's water down to it; the farm's own
-- rules read a can by whatever the older tools' part gives them.)
create or replace function town.can_holds(p_stack jsonb)
returns double precision language sql stable
as $$
  select case when coalesce(c.cans ? (p_stack->>'item'), false) then (c.cans->>(p_stack->>'item'))::double precision
      + case when town.tool_kind(p_stack->>'item') = 'can' then
          (f.k->'levels'->'can'->'waterings'->>town.tool_level(p_stack))::double precision - (f.k->'levels'->'can'->'waterings'->>0)::double precision
          + town.gem_by(p_stack, 'fire', f.k->'old'->'fire'->'can'->'more')
          + case when town.tool_has(p_stack, 'cnDrop') then town.opt_n('cnDrop', 'more') else 0 end
        else 0 end
    else 0 end
    from (select town.cat('forge') as k) f, (select town.cat('farming')->'cans' as cans) c
$$;

-- forgingOf: what the smith put into a tool, all of it: its plus, the options it carries by their milestones, every
-- gem kept that is one, its makers' names, and the kind of tool those options were drawn for (null with no option).
create or replace function town.forging_of(p_stack jsonb)
returns jsonb language sql stable
as $$
  select jsonb_build_object('plus', town.tool_level(p_stack), 'opts', d.opts,
    'gems', case when p_stack is not null and town.tool_kind(p_stack->>'item') is not null and jsonb_typeof(p_stack->'gems') = 'array'
      then coalesce((select jsonb_agg(g.v order by g.ord) from jsonb_array_elements(p_stack->'gems') with ordinality g(v, ord)
                      where jsonb_typeof(g.v) = 'string' and town.cat('forge')->'elements' ? (g.v #>> '{}')), '[]'::jsonb) else '[]'::jsonb end,
    'makers', town.tool_makers(p_stack),
    'origin', case when exists (select 1 from jsonb_array_elements(d.opts) o(v) where o.v <> 'null'::jsonb) then town.tool_origin(p_stack) end)
    from (select town.tool_drawn(p_stack) as opts) d
$$;

-- withForging: a tool with a forging in place of whatever it carried, written as it is kept. `origin` is kept only
-- where it says something. What the tool holds of its own stays, but a watering can's water is cut down to what the
-- can holds now: nobody gains water by a move.
create or replace function town.tool_with_forging(p_tool jsonb, p_f jsonb)
returns jsonb language plpgsql stable
as $$
declare
  kind_ text := town.tool_kind(p_tool->>'item');
  opt_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.v <> 'null'::jsonb and o.v <> '""'::jsonb);
  maker_ integer := (select max(m.ord)::integer from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.v <> 'null'::jsonb and m.v <> '""'::jsonb);
  next_ jsonb := p_tool - 'plus' - 'opts' - 'gems' - 'makers' - 'origin';
  holds double precision;
begin
  if (p_f->>'plus')::numeric > 0 then next_ := next_ || jsonb_build_object('plus', p_f->'plus'); end if;
  if opt_ is not null then
    next_ := next_ || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.ord <= opt_));
  end if;
  if jsonb_array_length(p_f->'gems') > 0 then next_ := next_ || jsonb_build_object('gems', p_f->'gems'); end if;
  if maker_ is not null then
    next_ := next_ || jsonb_build_object('makers', (select jsonb_agg(case when m.v = 'null'::jsonb then '""'::jsonb else m.v end order by m.ord)
      from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.ord <= maker_));
  end if;
  if kind_ is not null and p_f->>'origin' is not null and opt_ is not null and not town.same_pool(p_f->>'origin', kind_) then
    next_ := next_ || jsonb_build_object('origin', p_f->'origin');
  end if;
  if jsonb_typeof(next_->'water') = 'number' then
    holds := town.can_holds(next_);
    if holds > 0 then next_ := next_ || jsonb_build_object('water', greatest(0, least((next_->>'water')::numeric, holds::numeric))); end if;
  end if;
  return next_;
end;
$$;

-- stickerOf: what the tries up to a level ask in coins, all told (read from the owner's table, never written again).
create or replace function town.sticker_of(p_level numeric)
returns numeric language sql stable
as $$ select coalesce(sum((t.v->>'fee')::numeric) filter (where (t.v->>'to')::numeric <= p_level), 0) from jsonb_array_elements(town.cat('forge')->'tries') t(v) $$;

-- moveFeeAt: what a move costs in a line of so many kinds of tool, at the higher of the two tools' levels: its share
-- of that level's sticker price, shared by the kinds, rounded up; never less than the least.
create or replace function town.move_fee_at(p_kinds integer, p_level numeric)
returns integer language sql stable
as $$
  select greatest((m.v->>'least')::numeric,
      ceil(((m.v->>'share')::double precision * town.sticker_of(greatest(0, least((f.k->'forge'->>'top')::numeric, floor(p_level))))::double precision)
           / (100 * greatest(1, p_kinds))::double precision)::numeric)::integer
    from (select town.cat('forge') as k) f, lateral (select f.k->'smith'->'move' as v) m
$$;

-- moveFee: what moving between two tools costs: null of what are not two tools that are forged.
create or replace function town.move_fee(p_a jsonb, p_b jsonb)
returns integer language sql stable
as $$
  select case when k.a is not null and k.b is not null then town.move_fee_at(jsonb_array_length(town.line_kinds(k.a)), greatest(town.tool_level(p_a), town.tool_level(p_b))) end
    from (select town.tool_kind(p_a->>'item') as a, town.tool_kind(p_b->>'item') as b) k
$$;

-- running (lib/town/powers): the options a tool carries whose doing is going on now: begun, and not yet over.
create or replace function town.power_running(p_purse jsonb, p_tool jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select coalesce(jsonb_agg(d.v order by d.ord), '[]'::jsonb)
    from (select town.cat('forge')->'timed' as timed) t, jsonb_array_elements(town.tool_drawn(p_tool)) with ordinality d(v, ord)
   where d.v <> 'null'::jsonb and t.timed ? (d.v #>> '{}')
     and case when jsonb_typeof(p_purse->(t.timed->>(d.v #>> '{}'))) = 'number' then (p_purse->>(t.timed->>(d.v #>> '{}')))::numeric > p_now else false end
$$;

-- bySmith (lib/town/world): whether somebody on a tile is by the forge: its middle within the forge's reach.
create or replace function town.by_smith(p_x integer, p_y integer)
returns boolean language sql stable
as $$
  select coalesce(sqrt(d.dx * d.dx + d.dy * d.dy) <= (s.v->>'reach')::double precision, false)
    from (select town.cat('forge')->'stand' as v) s,
         lateral (select p_x + 0.5::double precision - (s.v->'at'->>0)::double precision as dx, p_y + 0.5::double precision - (s.v->'at'->>1)::double precision as dy) d
$$;

-- moveWhy: why two tools of a bag cannot trade what the smith put into them now, or null when they can. In the code's
-- order, and every one of them before a coin is taken.
create or replace function town.move_why(p_purse jsonb, p_smithy jsonb, p_from integer, p_to integer, p_near boolean, p_playing boolean, p_now bigint)
returns text language plpgsql stable
as $$
declare
  a jsonb := case when p_from is null or p_from < 0 then null else nullif(p_purse->'bag'->p_from, 'null'::jsonb) end;
  b jsonb := case when p_to is null or p_to < 0 then null else nullif(p_purse->'bag'->p_to, 'null'::jsonb) end;
  ka text := town.tool_kind(a->>'item');
  kb text := town.tool_kind(b->>'item');
  waiting jsonb := coalesce(p_smithy->'pending', 'null'::jsonb);
begin
  if not coalesce(p_near, false) then return 'far'; end if;
  if p_from is not distinct from p_to then return 'twice'; end if;
  if a is null or b is null or ka is null or kb is null then return 'tool'; end if;
  if jsonb_array_length(town.line_kinds(ka)) < 2 then return 'alone'; end if;
  if town.line_kinds(ka) <> town.line_kinds(kb) or (town.cat('items')->(a->>'item')->'tier') is distinct from (town.cat('items')->(b->>'item')->'tier') then return 'line'; end if;
  if town.forging_of(a) = town.forging_of(b) then return 'nothing'; end if;
  if town.forge_owed(a) >= 0 or (waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_from) = p_from) then return 'owed'; end if;
  if town.forge_owed(b) >= 0 or (waiting <> 'null'::jsonb and town.pending_slot(p_purse, waiting, p_to) = p_to) then return 'owed'; end if;
  if coalesce(p_playing, false) then return 'playing'; end if;
  if jsonb_array_length(town.power_running(p_purse, a, p_now)) > 0 or jsonb_array_length(town.power_running(p_purse, b, p_now)) > 0 then return 'running'; end if;
  if (p_purse->>'coins')::numeric < town.move_fee(a, b) then return 'coins'; end if;
  return null;
end;
$$;

-- moveForging: two tools of one line and one tier trade the whole of what the smith put into them. It always takes,
-- for coins only. The tools stay in their slots; no maker's name is written and nothing goes on the board.
create or replace function town.move_forging(p_purse jsonb, p_smithy jsonb, p_from integer, p_to integer, p_near boolean, p_playing boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  why_ text := town.move_why(p_purse, p_smithy, p_from, p_to, p_near, p_playing, p_now);
  a jsonb;
  b jsonb;
  na jsonb;
  nb jsonb;
  fee_ integer;
  water_ numeric[];
begin
  if why_ is not null then return town.no(why_); end if;
  a := p_purse->'bag'->p_from;
  b := p_purse->'bag'->p_to;
  fee_ := town.move_fee(a, b);
  na := town.tool_with_forging(a, town.forging_of(b));
  nb := town.tool_with_forging(b, town.forging_of(a));
  water_ := array[case when jsonb_typeof(a->'water') = 'number' then (a->>'water')::numeric else 0 end, case when jsonb_typeof(na->'water') = 'number' then (na->>'water')::numeric else 0 end,
                  case when jsonb_typeof(b->'water') = 'number' then (b->>'water')::numeric else 0 end, case when jsonb_typeof(nb->'water') = 'number' then (nb->>'water')::numeric else 0 end];
  return jsonb_build_object('ok', true, 'fee', fee_, 'a', town.tool_kind(a->>'item'), 'b', town.tool_kind(b->>'item'),
    'level', greatest(town.tool_level(a), town.tool_level(b)), 'spilt', greatest(0, water_[1] - water_[2]) + greatest(0, water_[3] - water_[4]),
    'purse', p_purse || jsonb_build_object('coins', (p_purse->>'coins')::numeric - fee_,
      'bag', jsonb_set(jsonb_set(p_purse->'bag', array[p_from::text], na), array[p_to::text], nb)));
end;
$$;

-- ─── 4h. The board ───────────────────────────────────────────────────────

-- markTop: the board with a tool at the top written on it: only the first of its kind is.
create or replace function town.board_top(p_board jsonb, p_kind text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'tops'->p_kind, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('tops', coalesce(p_board->'tops', '{}'::jsonb) || jsonb_build_object(p_kind, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- markFound: the board with an option found written on it: only its first finder is.
create or replace function town.board_found(p_board jsonb, p_opt text, p_by text, p_name text, p_now bigint)
returns jsonb language sql immutable
as $$
  select case when coalesce(p_board->'found'->p_opt, 'null'::jsonb) <> 'null'::jsonb then p_board
    else p_board || jsonb_build_object('found', coalesce(p_board->'found', '{}'::jsonb) || jsonb_build_object(p_opt, jsonb_build_object('by', p_by, 'name', p_name, 'at', p_now))) end
$$;

-- The board as a document of the two lists, whatever is kept.
create or replace function town.board_sound(p_kept jsonb)
returns jsonb language sql immutable
as $$
  select jsonb_build_object('tops', case when jsonb_typeof(p_kept->'tops') = 'object' then p_kept->'tops' else '{}'::jsonb end,
                            'found', case when jsonb_typeof(p_kept->'found') = 'object' then p_kept->'found' else '{}'::jsonb end)
$$;

-- ─── 4i. The great fire (lib/town/great-fire) ────────────────────────────

-- newGreatFire: a village's first fire can be found at once.
create or replace function town.fire_new()
returns jsonb language sql immutable
as $$ select '{"due": 0, "flint": null, "tinder": null, "row": [], "topped": []}'::jsonb $$;

-- A finder as it is kept, made sound: somebody (an id), a name of forty characters at the most, and a moment.
create or replace function town.fire_finder(p_v jsonb, p_at jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_v) = 'object' and jsonb_typeof(p_v->'id') = 'string' and p_v->>'id' <> '' and jsonb_typeof(p_at) = 'number'
    then jsonb_build_object('id', p_v->'id', 'name', case when jsonb_typeof(p_v->'name') = 'string' then left(p_v->>'name', 40) else '' end, 'at', p_at)
    else 'null'::jsonb end
$$;

-- soundGreatFire: what was kept, made sound: nobody twice in the row, nobody in it who has taken the top, no more
-- names than the row holds. (A walk down the row, as the code walks it. It was timed on the stand-in beside one
-- statement over the row, in the language of SQL and inside this one, with rows of none, three, ten and sixty names:
-- the walk was the lightest of the three at every length. Every telling of the smith reads this.)
create or replace function town.fire_sound(p_kept jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb := case when jsonb_typeof(p_kept) = 'object' then p_kept else '{}'::jsonb end;
  most_ integer := (town.cat('forge')->'fire'->>'row')::integer;
  topped jsonb := '[]'::jsonb;
  row_ jsonb := '[]'::jsonb;
  seen jsonb;
  w jsonb;
  f jsonb;
  t text;
begin
  for t in select e.v #>> '{}' from jsonb_array_elements(case when jsonb_typeof(k->'topped') = 'array' then k->'topped' else '[]'::jsonb end) with ordinality e(v, ord)
            where jsonb_typeof(e.v) = 'string' and e.v #>> '{}' <> '' order by e.ord loop
    if not topped ? t then topped := topped || jsonb_build_array(t); end if;
  end loop;
  seen := topped;
  for w in select e.v from jsonb_array_elements(case when jsonb_typeof(k->'row') = 'array' then k->'row' else '[]'::jsonb end) with ordinality e(v, ord) order by e.ord loop
    f := town.fire_finder(w, case when jsonb_typeof(w) = 'object' then w->'since' end);
    continue when f = 'null'::jsonb or seen ? (f->>'id') or jsonb_array_length(row_) >= most_;
    seen := seen || jsonb_build_array(f->'id');
    row_ := row_ || jsonb_build_array(jsonb_build_object('id', f->'id', 'name', f->'name', 'since', f->'at'));
  end loop;
  return jsonb_build_object('due', case when jsonb_typeof(k->'due') = 'number' then greatest(0, (k->>'due')::numeric) else 0 end,
    'flint', town.fire_finder(k->'flint', case when jsonb_typeof(k->'flint') = 'object' then k->'flint'->'at' end),
    'tinder', town.fire_finder(k->'tinder', case when jsonb_typeof(k->'tinder') = 'object' then k->'tinder'->'at' end),
    'row', row_, 'topped', topped);
end;
$$;

-- litAt: since when the fire is lit: both halves are in the village's keeping. Null while it is not.
create or replace function town.fire_lit_at(p_fire jsonb)
returns numeric language sql immutable
as $$
  select case when coalesce(p_fire->'flint', 'null'::jsonb) <> 'null'::jsonb and coalesce(p_fire->'tinder', 'null'::jsonb) <> 'null'::jsonb
    then greatest((p_fire->'flint'->>'at')::numeric, (p_fire->'tinder'->>'at')::numeric) end
$$;

-- openTo: how many of the row's first may use the fire at a moment: none while it is not lit, then one, and one more
-- with every turn's while that has gone by.
create or replace function town.fire_open_to(p_fire jsonb, p_now bigint)
returns integer language sql stable
as $$
  select case when l.lit is null or p_now < l.lit then 0
    else least(jsonb_array_length(p_fire->'row'), 1 + floor((p_now - l.lit) / (town.cat('forge')->'fire'->>'turn')::numeric))::integer end
    from (select town.fire_lit_at(p_fire) as lit) l
$$;

-- halfFound: if the fire's time has come and that half is not yet found, this is its finding, into the village's
-- keeping under the finder's name. `found` says whether it was; `lit`, whether that lit the fire.
create or replace function town.fire_half_found(p_fire jsonb, p_half text, p_id text, p_name text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  next_ jsonb;
begin
  if p_half not in ('flint', 'tinder') or p_now < (p_fire->>'due')::numeric or coalesce(p_fire->p_half, 'null'::jsonb) <> 'null'::jsonb then
    return jsonb_build_object('fire', p_fire, 'found', false, 'lit', false);
  end if;
  next_ := p_fire || jsonb_build_object(p_half, jsonb_build_object('id', p_id, 'name', p_name, 'at', p_now));
  return jsonb_build_object('fire', next_, 'found', true, 'lit', town.fire_lit_at(next_) is not null);
end;
$$;

-- joinRow: a name put in the row: somebody who has never taken the top, and has a tool one level under it now.
create or replace function town.fire_join(p_fire jsonb, p_id text, p_name text, p_ready boolean, p_now bigint)
returns jsonb language plpgsql stable
as $$
begin
  if p_fire->'topped' ? p_id then return town.no('topped'); end if;
  if exists (select 1 from jsonb_array_elements(p_fire->'row') w(v) where w.v->>'id' = p_id) then return town.no('twice'); end if;
  if not coalesce(p_ready, false) then return town.no('level'); end if;
  if jsonb_array_length(p_fire->'row') >= (town.cat('forge')->'fire'->>'row')::integer then return town.no('places'); end if;
  return jsonb_build_object('ok', true, 'fire', p_fire || jsonb_build_object('row', p_fire->'row' || jsonb_build_array(jsonb_build_object('id', p_id, 'name', p_name, 'since', p_now))));
end;
$$;

-- leaveRow: one's name taken out of the row.
create or replace function town.fire_leave(p_fire jsonb, p_id text)
returns jsonb language sql stable
as $$
  select case when exists (select 1 from jsonb_array_elements(p_fire->'row') w(v) where w.v->>'id' = p_id)
    then jsonb_build_object('ok', true, 'fire', p_fire || jsonb_build_object('row',
      coalesce((select jsonb_agg(w.v order by w.ord) from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' <> p_id), '[]'::jsonb)))
    else town.no('none') end
$$;

-- fireWhy: why a member may not try for the top now; null when they may.
create or replace function town.fire_why(p_fire jsonb, p_id text, p_now bigint)
returns text language plpgsql stable
as $$
declare
  at_ integer;
begin
  if town.fire_lit_at(p_fire) is null then return 'fire'; end if;
  at_ := (select (w.ord - 1)::integer from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' = p_id order by w.ord limit 1);
  if at_ is null then return case when p_fire->'topped' ? p_id then 'topped' else 'row' end; end if;
  return case when at_ < town.fire_open_to(p_fire, p_now) then null else 'turn' end;
end;
$$;

-- fireSpent: a try at the top was made with the fire: it is spent whatever came of it, and the halves of the next
-- can be found after a while drawn by `p_chance` (nothing to one; rounded as the code rounds). Taken: the member is
-- counted for good and leaves the row. Failed: to the row's end.
create or replace function town.fire_spent(p_fire jsonb, p_id text, p_name text, p_out text, p_now bigint, p_chance double precision)
returns jsonb language plpgsql stable
as $$
declare
  w jsonb := town.cat('forge')->'fire'->'wait';
  drawn numeric := floor((w->>'least')::double precision
    + greatest(0::double precision, least(1::double precision, p_chance)) * ((w->>'most')::double precision - (w->>'least')::double precision) + 0.5)::numeric;
  rest jsonb := coalesce((select jsonb_agg(r.v order by r.ord) from jsonb_array_elements(p_fire->'row') with ordinality r(v, ord) where r.v->>'id' <> p_id), '[]'::jsonb);
begin
  return jsonb_build_object('due', p_now + drawn, 'flint', null, 'tinder', null,
    'row', case when p_out = 'taken' then rest else rest || jsonb_build_array(jsonb_build_object('id', p_id, 'name', p_name, 'since', p_now)) end,
    'topped', case when p_out = 'taken' and not (p_fire->'topped' ? p_id) then p_fire->'topped' || jsonb_build_array(p_id) else p_fire->'topped' end);
end;
$$;

-- fireTold: what a page is told of the fire, AND ALL IT IS TOLD: the halves found and by whom, whether it is lit, the
-- row with how many of its first may use it now, where I stand in it and whether I have taken the top. Never when the
-- next one comes.
create or replace function town.fire_told(p_fire jsonb, p_me text, p_now bigint)
returns jsonb language sql stable
as $$
  select jsonb_build_object(
    'flint', case when coalesce(p_fire->'flint', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('name', p_fire->'flint'->'name') end,
    'tinder', case when coalesce(p_fire->'tinder', 'null'::jsonb) <> 'null'::jsonb then jsonb_build_object('name', p_fire->'tinder'->'name') end,
    'lit', town.fire_lit_at(p_fire) is not null,
    'row', coalesce((select jsonb_agg(jsonb_build_object('id', w.v->'id', 'name', w.v->'name') order by w.ord) from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord)), '[]'::jsonb),
    'open', town.fire_open_to(p_fire, p_now),
    'mine', coalesce((select (w.ord - 1)::integer from jsonb_array_elements(p_fire->'row') with ordinality w(v, ord) where w.v->>'id' = p_me order by w.ord limit 1), -1),
    'topped', p_fire->'topped' ? p_me)
$$;

-- Whether a bag holds a tool that stands one level under the top: the row is for those who have one.
create or replace function town.forge_under_top(p_purse jsonb)
returns boolean language sql stable
as $$
  select exists (select 1 from jsonb_array_elements(p_purse->'bag') s(v)
                  where s.v <> 'null'::jsonb and town.tool_kind(s.v->>'item') is not null and town.tool_level(s.v) = (town.cat('forge')->'forge'->>'top')::integer - 1)
$$;

-- A try, with the great fire where the try is for the top (as whoever keeps the game does it: lib/town/trial's
-- `smithTry`). A tool one level under the top is tried only with the fire, asked before anything is taken; and a try
-- made with it spends it, whatever came of it. `p_chance`: the number the while before the next fire is drawn by.
-- Answers the try's own answer, with `spent` (whether the fire was) and `fire` (the fire as it is afterwards: FOR
-- WHOEVER KEEPS IT ALONE: no function a member calls passes it on).
create or replace function town.forge_try_fired(p_purse jsonb, p_fire jsonb, p_slot integer, p_r double precision, p_id text, p_name text, p_now bigint, p_chance double precision)
returns jsonb language plpgsql stable
as $$
declare
  held_ jsonb := case when p_slot is null or p_slot < 0 then null else nullif(p_purse->'bag'->p_slot, 'null'::jsonb) end;
  needs boolean := coalesce(town.tool_kind(held_->>'item') is not null and town.tool_level(held_) = (town.cat('forge')->'forge'->>'top')::integer - 1, false);
  why_ text;
  did jsonb;
begin
  if needs then
    why_ := town.fire_why(p_fire, p_id, p_now);
    if why_ is not null then return town.no(why_); end if;
  end if;
  did := town.forge_try(p_purse, p_slot, p_r, p_name);
  if not (did->>'ok')::boolean then return did; end if;
  return did || jsonb_build_object('spent', needs, 'fire', case when needs then town.fire_spent(p_fire, p_id, p_name, did->>'out', p_now, p_chance) else p_fire end);
end;
$$;

-- ─── What is kept, read and written ──────────────────────────────────────

-- A member's smithy as it is kept, made sound: a new one for whoever has nothing there (reading makes no row).
create or replace function town.smithy_read(p_member uuid)
returns jsonb language sql stable set search_path = public
as $$ select town.smithy_sound((select s.doc from public.town_smiths s where s.member_id = p_member)) $$;

-- …and held, for a deed that is to write it: its row waits for whoever else is writing it. (A member's own deeds wait
-- for each other on the purse's row already; this is for the one deed that writes somebody else's smithy, the
-- bellows. Whoever has no row yet has nothing a friend could press: nothing is held, and nothing need be.)
create or replace function town.smithy_held(p_member uuid)
returns jsonb language plpgsql set search_path = public
as $$
declare
  kept jsonb;
begin
  select s.doc into kept from public.town_smiths s where s.member_id = p_member for update;
  return town.smithy_sound(kept);
end;
$$;

create or replace function town.keep_smithy(p_member uuid, p_smithy jsonb)
returns void language sql set search_path = public
as $$
  insert into public.town_smiths (member_id, doc, updated_at) values (p_member, p_smithy, now())
  on conflict (member_id) do update set doc = excluded.doc, updated_at = now()
$$;

-- The great fire as it is kept, made sound; with `p_hold` its row is held until the transaction ends.
create or replace function town.fire_kept(p_hold boolean)
returns jsonb language plpgsql set search_path = public
as $$
declare
  kept jsonb;
begin
  if p_hold then select f.doc into kept from public.town_great_fire f where f.one for update;
  else select f.doc into kept from public.town_great_fire f where f.one; end if;
  return town.fire_sound(kept);
end;
$$;

create or replace function town.keep_fire(p_doc jsonb)
returns void language sql set search_path = public
as $$ update public.town_great_fire set doc = p_doc, updated_at = now() where one $$;

-- Whether a half of the great fire could be found at a moment by a member, or by another (the one a rock would be
-- paid to), as things stand, read without holding: its time has come, that half is not found yet, and the smith is
-- open to one of the two. What `public.town_fell` and `public.town_mine` ask before they take the fire's row, so that
-- the row is held only then: for a fortnight and more after a fire is spent no felling and no mining touches it.
-- ONE read of the one row, whoever asks (read off it as `town.fire_sound` reads these two, the row of names left
-- alone): this is asked by every felling and every mining call there is.
create or replace function town.fire_wants(p_half text, p_who uuid, p_now bigint, p_other uuid default null)
returns boolean language plpgsql stable set search_path = public
as $$
declare
  kept jsonb;
begin
  if (p_who is null and p_other is null) or p_half not in ('flint', 'tinder') then return false; end if;
  select f.doc into kept from public.town_great_fire f where f.one;
  if kept is null then return false; end if;
  if jsonb_typeof(kept->'due') = 'number' and p_now < (kept->>'due')::numeric then return false; end if;
  if town.fire_finder(kept->p_half, case when jsonb_typeof(kept->p_half) = 'object' then kept->p_half->'at' end) <> 'null'::jsonb then return false; end if;
  return coalesce(town.smith_for(p_who), false) or coalesce(town.smith_for(p_other), false);
end;
$$;

-- What a member is called, for a name on a tool, on the board and in the fire's keeping: as the site calls them that
-- day (never what a page says).
create or replace function town.smith_called(p_member uuid)
returns text language sql stable set search_path = public
as $$
  select coalesce((select nullif(coalesce(pr.character_name, pr.display_name, pr.discord_username, ''), '') from public.profiles pr where pr.id = p_member), p_member::text)
$$;

-- A half found, on the fire's row AS IT IS HELD (`p_fire`: what `town.fire_kept(true)` gave this call): kept under
-- the finder's name and written down, if its time has come, nobody has found it and the smith is open to the finder.
-- Answers `{"fire": {"half", "lit"}}` for the finder's own answer, or nothing.
create or replace function town.fire_find(p_fire jsonb, p_half text, p_finder uuid, p_now bigint)
returns jsonb language plpgsql set search_path = public
as $$
declare
  did jsonb;
begin
  if p_fire is null or p_finder is null or not town.smith_for(p_finder) then return '{}'::jsonb; end if;
  did := town.fire_half_found(p_fire, p_half, p_finder::text, town.smith_called(p_finder), p_now);
  if not (did->>'found')::boolean then return '{}'::jsonb; end if;
  perform town.keep_fire(did->'fire');
  perform town.note(p_finder, 'fire_found', p_half, 1, 0, jsonb_build_object('lit', did->'lit'));
  return jsonb_build_object('fire', jsonb_build_object('half', p_half, 'lit', did->'lit'));
end;
$$;

-- What a member is told of the smith: what they have there, the village's board, and the great fire as a page may
-- know it (`town.fire_told`: never the fire's own document).
create or replace function town.smith_told(p_member uuid)
returns jsonb language sql set search_path = public
as $$
  select jsonb_build_object('smithy', town.smithy_read(p_member), 'board', town.board_sound(town.thing('smith', false)),
    'fire', town.fire_told(town.fire_kept(false), p_member::text, town.now_ms()))
$$;

-- A deed's answer at the smith: the rule's own, with the member's purse, this clock, and the smith as he now stands.
-- (A smithy the rule gave back is not sent as it is: what is told is what was kept. And the fire's own document is
-- never sent, whatever a rule gave back.)
create or replace function town.smith_answer(p_member uuid, p_did jsonb)
returns jsonb language sql set search_path = public
as $$ select town.answer(p_member, p_did - 'smithy' - 'fire') || jsonb_build_object('smith', town.smith_told(p_member)) $$;

-- ─── 5a. Functions of earlier files, each with a block more ──────────────
-- (each function below is the database's own text as it stood after v173, with the lines of
-- v174.smith.lines.mjs in place: built by assemble-v174.mjs, never typed. If a file that writes one of them has
-- run since v173, its change is undone here: this file's head says how to look first.)

-- <public.town_fell>
create or replace function public.town_fell(p_went jsonb, p_x integer, p_y integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  k jsonb := town.cat('trees');
  said jsonb := case when jsonb_typeof(p_went) = 'object' then p_went else '{}'::jsonb end;
  -- (no trunk has more segments than the stoutest takes with a plain axe, so no go has more misses)
  most integer := greatest((k->>'elderChops')::integer, (select max((g.v->>'chops')::integer) from jsonb_array_elements(k->'girths') g(v)));
  went jsonb;
  grove jsonb;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  bracer uuid;
  luck jsonb := '[]'::jsonb;
  r1 double precision;
  r2 double precision;
  r3 double precision;
  r4 double precision;
  r5 double precision;
  r6 double precision;
  i integer;
  spent_ boolean;
  did jsonb;
  f jsonb;
  paid jsonb;
  -- ── the forge's great fire (v174): its row, where this call holds it ──
  fire_ jsonb;
begin
  if jsonb_typeof(said->'tree') is distinct from 'number' or p_x is null or p_y is null then return town.answer(me, town.no('none')); end if;
  if (said->>'tree')::numeric <> floor((said->>'tree')::numeric) or abs((said->>'tree')::numeric) > 100000 then return town.answer(me, town.no('none')); end if;
  -- what the browser says of its go is kept as this and no more: the tree, three yeses, the misses and the seconds
  went := jsonb_build_object('tree', (said->>'tree')::numeric::integer,
      'through', coalesce(said->'through' = 'true'::jsonb, false), 'plain', coalesce(said->'plain' = 'true'::jsonb, false),
      'one', coalesce(said->'one' = 'true'::jsonb, false), 'twice', coalesce(said->'twice' = 'true'::jsonb, false),
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest(floor((said->>'misses')::numeric), 0), most) else 0 end)
    || case when jsonb_typeof(said->'secs') = 'number' then jsonb_build_object('secs', least(greatest((said->>'secs')::double precision, 0), 3600)) else '{}'::jsonb end;
  -- the village's row first
  grove := town.grove_tidied(coalesce(town.thing('grove', true), '{"down": {}, "half": []}'::jsonb), now_);
  -- whoever braces the trunk of my go has a purse to be paid into: it is held with mine, the lesser id first
  -- ── the forge's great fire (v174): the village's row, held after the grove and before any purse, and only while its tinder can be found by me ──
  if town.fire_wants('tinder', me, now_) then fire_ := town.fire_kept(true); end if;
  -- ── the forge's great fire (v174): its end ──
  go_ := grove->'goes'->(me::text);
  if jsonb_typeof(go_->'braced') = 'string' then
    if go_->>'braced' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      if go_->>'braced' <> me::text then
        if town.is_member((go_->>'braced')::uuid) then bracer := (go_->>'braced')::uuid; end if;
      end if;
    end if;
  end if;
  if bracer is not null and bracer < me then theirs := town.purse_of(bracer, true); end if;
  purse := town.purse_of(me, true);
  if bracer is not null and bracer > me then theirs := town.purse_of(bracer, true); end if;
  spent_ := town.stamina_of(purse, now_) <= 0;
  -- a set of numbers of chance for each tree a go may fell, drawn here and never sent: in the order the code draws them
  for i in 1..(k->'echo'->>'trees')::integer loop
    r1 := random(); r2 := random(); r3 := random(); r4 := random(); r5 := random(); r6 := random();
    luck := luck || jsonb_build_array(jsonb_build_object('dark', r1, 'scent', r2, 'which', r3, 'chain', r4, 'keep', r5, 'kind', r6));
  end loop;
  did := town.fell(purse, grove, me::text, went, p_x, p_y, now_, luck,
    (select coalesce(nullif(coalesce(p.character_name, p.display_name, p.discord_username, ''), ''), me::text) from public.profiles p where p.id = me));
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('trees', town.trees_told(grove, purse, now_)));
  end if;
  perform town.keep_purse(me, did->'purse');
  perform town.keep_thing('grove', did->'grove');
  -- ── the forge's great fire (v174): a tree felled may be the village's tinder, kept under the name of whoever felled it ──
  if fire_ is not null and jsonb_array_length(did->'felled') > 0 then
    did := did || town.fire_find(fire_, 'tinder', me, now_);
  end if;
  -- ── the forge's great fire (v174): its end ──
  -- the friend at the trunk: a log into their own purse, where there is room for one
  if did->>'braced' is not null and theirs is not null and (did->>'braced') = bracer::text then
    paid := town.brace_pay(theirs);
    perform town.keep_purse(bracer, paid->'purse');
    perform town.note(bracer, 'brace', did->'felled'->0->>'kind', coalesce((paid->'got'->0->>1)::numeric, 0), 0,
      jsonb_build_object('tree', did->'felled'->0->'id', 'feller', me));
  end if;
  for f, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(did->'felled') with ordinality e(v, ord) order by e.ord loop
    perform town.note(me, 'fell', f->>'kind', 1, 0,
      jsonb_build_object('tree', f->'id', 'misses', f->'misses', 'girth', f->'girth', 'timber', f->'timber')
      || case when (did->>'plain')::boolean then '{"how": "plain"}'::jsonb when (did->>'one')::boolean then '{"how": "one"}'::jsonb else '{}'::jsonb end
      || case when f ? 'keepsake' then jsonb_build_object('keepsake', f->'keepsake') else '{}'::jsonb end
      || case when i = 0 and did->>'braced' is not null then jsonb_build_object('braced', did->>'braced') else '{}'::jsonb end
      -- (and what only this record can say of it: the tile stood on, what the tree gave, how long the hand says it
      -- played, whether it was played with no stamina, and what the axe's own did)
      || jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'got', f->'got', 'secs', coalesce(went->'secs', '0'::jsonb), 'spent', spent_)
      || case when (f->>'twice')::boolean then '{"twice": true}'::jsonb else '{}'::jsonb end
      || case when (f->>'free')::boolean then '{"free": true}'::jsonb else '{}'::jsonb end
      || case when f->'chained' <> 'null'::jsonb then jsonb_build_object('chained', f->'chained') else '{}'::jsonb end);
  end loop;
  -- (the keepsakes found are told as `keeps`: `found`, in an answer of the game's, is the list of what the village has
  -- found, which a page keeps whole from whatever answer brings it)
  return town.answer(me, (did - 'grove' - 'found') || jsonb_build_object('keeps', did->'found', 'trees', town.trees_told(did->'grove', did->'purse', now_)));
end;
$$;
-- </public.town_fell>

-- <public.town_mine>
create or replace function public.town_mine(p_floor integer, p_rock integer, p_x integer, p_y integer, p_swings double precision, p_how text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.far_member();
  now_ bigint := town.now_ms();
  m jsonb := town.cat('mining');
  word_ text := town.mine_word();
  place_ integer := case when p_floor between 0 and (m->>'floors')::integer then p_floor end;
  quake boolean := coalesce(p_how = 'quake', false);
  -- (the swings as the page said them, for the record: what the rule counted of them is the rule's own)
  said numeric := case when p_swings is null or p_swings = 'NaN'::double precision then 0 else least(greatest(floor(p_swings::numeric), 0), 1000) end;
  cave_ jsonb;
  had jsonb;
  first_ uuid;
  first_id text;
  purse jsonb;
  theirs jsonb;
  go_ jsonb;
  did jsonb;
  paid jsonb;
  next_ jsonb;
  whose jsonb;
  nothing jsonb := jsonb_build_object('ok', true, 'got', '[]'::jsonb, 'broke', '[]'::jsonb, 'way', false, 'vein', null, 'crystal', false, 'chained', null, 'cost', 0);
  helpers jsonb;
  r jsonb;
  e jsonb;
  id_ text;
  doc_ jsonb;
  ore_ text;
  -- ── the forge's great fire (v174): its row, where this call holds it; and what its finder is told ──
  fire_ jsonb;
  lit_ jsonb := '{}'::jsonb;
begin
  if not town.cave_is_laid(town.day_of(now_)) then return town.no('unlaid') || jsonb_build_object('now', now_); end if;
  -- the village's row first, then the purses by their ids
  cave_ := town.cave_at(case when place_ is not null then town.cave_kept(place_, true) end, now_);
  had := case when p_rock is not null then town.cave_struck_at(cave_, p_rock, now_) end;
  first_ := case when had->>'first' <> me::text then town.mine_member(had->>'first') end;
  -- ── the forge's great fire (v174): the village's row, held after the cave's place and before any purse, and only while its flint can be found by me or by whoever struck the rock first ──
  if town.fire_wants('flint', me, now_, first_) then fire_ := town.fire_kept(true); end if;
  -- ── the forge's great fire (v174): its end ──
  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;
  purse := town.purse_of(me, true);
  if first_ is not null and first_ > me then theirs := town.purse_of(first_, true); end if;

  go_ := town.mine_go(me, place_, p_rock, p_x, p_y, p_swings, quake, cave_, now_);
  did := town.mine(purse, go_, word_);
  if not (did->>'ok')::boolean then
    return town.answer(me, did || jsonb_build_object('cave', town.cave_told(me, purse, place_, p_x, p_y, now_)));
  end if;
  first_id := did->'struck'->>'first';
  whose := case when first_id = me::text then 'null'::jsonb else to_jsonb(coalesce(nullif(did->'struck'->>'name', ''), first_id)) end;

  if did->'done' = 'false'::jsonb then
    -- my swings went into it, and it still stands
    perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
    perform town.keep_purse(me, did->'purse');
    return town.answer(me, nothing || jsonb_build_object('part', did->'part', 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
  end if;
  if did->>'done' = 'theirs' then
    -- somebody else struck it first: it is they who are paid, as if they had broken it
    paid := case when theirs is not null then town.mine_pay_first(theirs, go_, did->'struck', word_) end;
    if paid is null or not (paid->>'ok')::boolean then
      -- (they cannot take what it leaves just now: it waits for them, struck whole away, with my swings in it)
      perform town.keep_cave(place_, town.cave_strike(cave_, p_rock, did->'struck', now_));
      perform town.keep_purse(me, did->'purse');
      return town.answer(me, nothing || jsonb_build_object('part', 1, 'waits', true, 'whose', whose, 'cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
    end if;
    perform town.keep_purse(first_, paid->'purse');
  else
    paid := did;
    first_ := me;
  end if;

  -- what the village shares of the place, after it: the rocks gone, the way down open, the crystal broken, moss let out
  next_ := town.cave_break(cave_, paid->'broke', now_);
  if paid->'way' <> 'null'::jsonb then
    r := town.mine_rock(go_->'rocks', (paid->>'way')::integer);
    next_ := town.cave_open_way(next_, place_, jsonb_build_object('rock', r->0, 'x', r->1, 'y', r->2, 'by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  if (paid->>'crystal')::boolean then
    next_ := town.cave_crystal_broken(next_, jsonb_build_object('by', first_id, 'name', coalesce(nullif(did->'struck'->>'name', ''), first_id), 'at', now_));
  end if;
  for id_ in select i.v from jsonb_array_elements_text(paid->'moss') with ordinality i(v, ord) order by i.ord loop
    r := town.mine_rock(go_->'rocks', id_::integer);
    if r is not null and place_ > 0 then next_ := town.cave_set_moss(next_, place_, (r->>1)::integer, (r->>2)::integer, first_id, now_); end if;
  end loop;
  perform town.keep_cave(place_, next_);
  -- ── the forge's great fire (v174): a rock broken that is not the day's crystal rock may be the village's flint, kept under the name of whoever is paid for it ──
  if fire_ is not null and exists (select 1 from jsonb_array_elements(paid->'each') x(v) where x.v->>'kind' is distinct from 'crystal') then
    lit_ := town.fire_find(fire_, 'flint', first_, now_);
  end if;
  -- ── the forge's great fire (v174): its end ──
  perform town.keep_purse(me, did->'purse');

  -- written down: each rock that broke, in the name of whoever it was paid to; the way down found; and a hand lent,
  -- in the name of each who lent one
  helpers := town.mine_helpers(did->'struck');
  ore_ := town.mine_ore(place_);
  for e in select x.v from jsonb_array_elements(paid->'each') with ordinality x(v, ord) order by x.ord loop
    doc_ := jsonb_build_object('floor', place_, 'rock', e->'rock', 'swings', said, 'hand', 'pick', 'tile', jsonb_build_array(p_x, p_y))
      || case when (paid->>'spent')::boolean then '{"spent": true}'::jsonb else '{}'::jsonb end
      || case when e->'rock' = paid->'chained' then '{"chained": true}'::jsonb else '{}'::jsonb end
      || case when quake then '{"how": "quake"}'::jsonb else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and first_ <> me then jsonb_build_object('by', me) else '{}'::jsonb end
      || case when (e->>'rock')::integer = p_rock and jsonb_array_length(helpers) > 0 then jsonb_build_object('with', helpers) else '{}'::jsonb end;
    if e->>'kind' = 'crystal' then
      perform town.note(first_, 'crystal', 'stone', 1, 0, doc_ || jsonb_build_object('got', m->'ores'->-1->'shard', 'chip', town.cat('forge')->'gems'->(go_->>'element')->'chip'));
    else
      perform town.note(first_, 'mine', 'stone', 1, 0, doc_
        || case when (e->>'shards')::numeric > 0 then jsonb_build_object('got', ore_, 'shards', e->'shards') else '{}'::jsonb end
        || case when e->>'kind' = 'vein' then '{"vein": true}'::jsonb else '{}'::jsonb end
        || case when paid->'moss' @> jsonb_build_array(e->'rock') then '{"moss": true}'::jsonb else '{}'::jsonb end);
    end if;
  end loop;
  if paid->'way' <> 'null'::jsonb then perform town.note(first_, 'delve', null, 1, 0, jsonb_build_object('floor', place_, 'rock', paid->'way')); end if;
  for id_ in select h.v from jsonb_array_elements_text(helpers) with ordinality h(v, ord) order by h.ord loop
    if town.mine_member(id_) is not null then
      perform town.note(id_::uuid, 'hew', 'stone', 1, 0, jsonb_build_object('floor', place_, 'rock', p_rock, 'whose', first_));
    end if;
  end loop;

  return town.answer(me, case when first_ = me
      then jsonb_build_object('ok', true, 'got', paid->'got', 'broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'vein', paid->'vein', 'crystal', paid->'crystal',
        'chained', paid->'chained', 'cost', paid->'cost', 'part', 1, 'moss', jsonb_array_length(paid->'moss') > 0)
      else nothing || jsonb_build_object('broke', paid->'broke', 'way', paid->'way' <> 'null'::jsonb, 'crystal', paid->'crystal', 'chained', paid->'chained',
        'part', 1, 'helped', true, 'whose', whose, 'paid', first_, 'moss', jsonb_array_length(paid->'moss') > 0) end
    -- ── the forge's great fire (v174): its finder is told, in the answer of the call that found it ──
    || case when first_ = me then lit_ else '{}'::jsonb end
    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));
end;
$$;
-- </public.town_mine>

-- <town.work_counts_of>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──
  if what = 'bellows' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the blacksmith (v174): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;
-- </town.work_counts_of>

-- <town.deed_th>
create or replace function town.deed_th(p_what text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $$
  select case p_what
    when 'buy' then 'ซื้อของจากลุง' when 'leave' then 'ฝากลุงขาย' when 'take_back' then 'เอาของที่ฝากคืน'
    when 'collect' then 'รับเงินค่าของที่ฝากขาย' when 'give' then 'ส่งของตามออเดอร์ลุง' when 'hint' then 'ซื้อคำใบ้'
    when 'hold' then 'หยิบของมาถือ' when 'put_away' then 'เก็บของที่ถือ' when 'wear' then 'สวมตะกร้า' when 'take_off' then 'ถอดตะกร้า'
    when 'drop' then 'ทิ้งของ' when 'eat' then 'นั่งกินข้าว' when 'get_up' then 'ลุกจากมื้ออาหาร' when 'read' then 'อ่านคัมภีร์'
    when 'cast' then 'หย่อนเบ็ด' when 'fish_landed' then 'ตกได้' when 'fish_early' then 'ดึงเบ็ดเร็วไป' when 'fish_missed' then 'ดึงเบ็ดไม่ทัน'
    when 'fish_slipped' then 'ปลาหลุด' when 'fish_snapped' then 'สายขาด' when 'fish_left' then 'เก็บเบ็ด'
    when 'draw' then 'ตักน้ำจากแม่น้ำ' when 'pour' then 'เทน้ำลงบ่อ' when 'fill' then 'เติมบัวรดน้ำที่บ่อ'
    when 'clear' then 'ถางหญ้า' when 'till' then 'พรวนดิน' when 'sow' then 'หว่านเมล็ด' when 'water' then 'รดน้ำ' when 'feed' then 'ใส่ปุ๋ย'
    when 'cure' then 'ไล่แมลง' when 'pick' then 'เก็บเกี่ยว' when 'pull' then 'ขุดต้นที่ตายออก' when 'uproot' then 'ขุดต้นที่ยังเป็นออก'
    when 'cook' then 'ทำอาหาร' when 'pot_down' then 'วางหม้อ' when 'ladle' then 'ตักจากหม้อที่วางไว้' when 'pot_take' then 'เก็บหม้อคืน'
    when 'serve' then 'ตักจากหม้อในกระเป๋า' when 'open' then 'เปิดของที่ตกได้'
    when 'toss' then 'โยนเหรียญลงน้ำพุ' when 'report' then 'รายงานคำอธิษฐาน'
    when 'gather' then 'เก็บของป่า' when 'net' then 'จับแมลง'
    when 'exchange' then 'แลก popoto เป็นเหรียญ' when 'deal' then 'แลกของกับสมาชิก'
    when 'gift' then 'รับของที่บ่อน้ำฝากไว้ให้' when 'thank' then 'ขอบคุณคนที่ช่วยดูแลผัก' when 'jar_drop' then 'หยอดกระปุกที่บ่อน้ำ' when 'jar_take' then 'รับส่วนแบ่งจากกระปุก' when 'ditch' then 'เทน้ำรดทั้งแปลง' when 'yard' then 'เทน้ำใส่โอ่งที่ลานครัว' when 'fresh' then 'หม้อได้น้ำจากโอ่ง' when 'pass' then 'ส่งถังน้ำต่อให้คนถัดไป' when 'line' then 'น้ำที่ช่วยกันส่งต่อมาถึงที่' when 'box_put' then 'เก็บของเข้ากล่อง' when 'box_take' then 'หยิบของออกจากกล่อง' when 'ground_drop' then 'ทิ้งของลงพื้น' when 'ground_take' then 'เก็บของจากพื้น' when 'shop_open' then 'ชูป้ายเปิดร้าน' when 'shop_close' then 'เก็บป้ายปิดร้าน' when 'shop_buy' then 'ซื้อของจากร้านสมาชิก' when 'shop_sold' then 'ร้านขายของได้' when 'shop_sell' then 'ขายของให้ร้านสมาชิก' when 'shop_bought' then 'ร้านรับซื้อของ'
    -- the gifts of the lines' ranks, the titles and the notice board (written down since v144 to v152, with no word until now)
    when 'charms' then 'เปลี่ยนเครื่องรางที่ใส่' when 'familiar' then 'เรียกสัตว์คู่ใจ' when 'gift_use' then 'ใช้พลังของวิเศษ' when 'title' then 'เลือกฉายา' when 'notice_post' then 'ติดประกาศที่ป้าย' when 'notice_buy' then 'ซื้อของจากประกาศ' when 'notice_fill' then 'ขายของให้ประกาศรับซื้อ' when 'notice_collect' then 'รับเงินจากป้ายประกาศ' when 'notice_down' then 'ปลดประกาศ' when 'notice_fetch' then 'รับของจากป้ายประกาศ' when 'notice_slot' then 'เพิ่มช่องประกาศ'
    -- the kitchen's gifts
    when 'basket_put' then 'เก็บอาหารใส่ตะกร้ามิติ' when 'basket_take' then 'หยิบอาหารออกจากตะกร้ามิติ'
    -- the farm's gifts
    when 'row' then 'ทำงานทั้งแถวในครั้งเดียว' when 'gnome' then 'โนมรดน้ำทั้งแปลง' when 'hourglass' then 'พลิกนาฬิกาทรายแห่งฤดู'
    -- the well's gifts
    when 'drink_offer' then 'ยื่นน้ำพุแห่งชีวิตให้เพื่อน' when 'drink' then 'ดื่มน้ำพุแห่งชีวิตที่เพื่อนยื่นให้' when 'drink_gave' then 'เพื่อนดื่มน้ำพุแห่งชีวิตที่ยื่นให้' when 'rain_fill' then 'กบเรียกฝนเติมถังให้' when 'moon_keep' then 'เก็บน้ำใส่ขวดแก้วจันทรา' when 'moon_pour' then 'เทน้ำจากขวดแก้วจันทราลงบ่อ'
    -- the forest's gifts
    when 'slip' then 'พลาดที่จุดลับในป่า' when 'map_use' then 'คลี่ลายแทงของภูตป่า' when 'map_dig' then 'ขุดหาหีบของภูต' when 'chest' then 'ขุดเจอหีบของภูต'
    -- the insects' gifts
    when 'nectar' then 'หยดน้ำหวานล่อแมลง'
    -- the helpers' gifts
    when 'longpour' then 'รดน้ำทั้งแถวให้เพื่อนในรวดเดียว' when 'bell' then 'ระฆังคู่หูดังกับเพื่อน' when 'ring' then 'แบ่งแรงให้เพื่อนด้วยแหวน' when 'ring_had' then 'ได้แรงจากแหวนของเพื่อน' when 'dust' then 'โรยผงภูตสวนให้ต้นของเพื่อน'
    -- ── the bridge built by hand (v160), and the village's works ──
    when 'stone_lift' then 'ยกหินจากกองหิน' when 'stone_pass' then 'ส่งหินต่อให้คนถัดไป' when 'stone_lay' then 'วางหินที่เชิงสะพาน' when 'stone_hand' then 'หินที่ช่วยกันส่งต่อมาถึงเชิงสะพาน' when 'stone_drop' then 'ปล่อยหินทิ้ง' when 'work_give' then 'มอบของให้งานของหมู่บ้าน'
    -- ── the bridge built by hand (v160): its end ──
    -- ── the lamp relay at dusk (v163) ──
    when 'flame_take' then 'รับไฟจากกองไฟ' when 'flame_pass' then 'ส่งไฟต่อให้คนถัดไป' when 'lamp_light' then 'จุดโคม' when 'lamp_hand' then 'ไฟที่ช่วยกันส่งต่อมาจุดโคม'
    -- ── the lamp relay at dusk (v163): its end ──
    -- ── the mountain's trees (v164) ──
    when 'fell' then 'ตัดต้นไม้' when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'
    -- ── the mountain's trees (v164): its end ──
    -- ── the mountain's rocks (v164) ──
    when 'mine' then 'ทุบหิน' when 'crystal' then 'ทุบหินคริสตัลประจำวัน' when 'delve' then 'เปิดทางลงชั้นถัดไป' when 'hew' then 'ช่วยทุบหินของเพื่อน'
    when 'vein' then 'ขุดสายแร่' when 'vein_odd' then 'สายแร่ที่เล่าผลมาไม่ตรงกติกา' when 'lift' then 'ขึ้นลิฟต์ในถ้ำ' when 'torch' then 'วางคบไฟในถ้ำ'
    -- ── the mountain's rocks (v164): its end ──
    -- ── the blacksmith (v174) ──
    when 'smelt' then 'ฝากช่างตีเหล็กหลอม' when 'smelted' then 'รับของที่หลอมเสร็จ' when 'smith_wider' then 'ขยายเตาหลอม' when 'bellows' then 'สูบลมช่วยเพื่อนหลอม'
    when 'forge' then 'ตีบวกเครื่องมือ' when 'forge_draw' then 'ช่างเปิดออปชันให้เลือก' when 'forge_choose' then 'เลือกออปชันของเครื่องมือ' when 'forge_redraw' then 'สุ่มออปชันใหม่'
    when 'gem_set' then 'ฝังพลอยลงเครื่องมือ' when 'forge_move' then 'ย้ายของที่ตีไว้ไปเครื่องมืออีกชิ้น' when 'forge_first' then 'ขึ้นป้ายคนแรกของช่างตีเหล็ก' when 'power' then 'ใช้พลังของเครื่องมือ'
    when 'fire_found' then 'พบส่วนหนึ่งของไฟใหญ่ของเตา' when 'fire_join' then 'ลงชื่อในคิวไฟใหญ่' when 'fire_leave' then 'ถอนชื่อจากคิวไฟใหญ่'
    -- ── the blacksmith (v174): its end ──
    else p_what end
$$;
-- </town.deed_th>

-- ─── 5b. What a member calls ─────────────────────────────────────────────

-- The smith looked at: my purse, this clock, what I have there, the board, and the great fire as a page may know it.
create or replace function public.town_smith()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
begin
  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms(), 'smith', town.smith_told(me));
end;
$$;

-- So many pieces of a kind put in to smelt.
create or replace function public.town_smith_smelt(p_piece text, p_n integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  -- (my purse's row is held first, as by every deed of mine; then my smithy's, which a friend at the bellows writes too)
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_piece is null or p_piece !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.smelt(purse, town.smithy_held(me), p_piece, p_n, now_);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smelt', p_piece, p_n, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', did->'timber', 'till', did->'smithy'->'queue'->-1->'till'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- What is done taken: as much of it as there is room for.
create or replace function public.town_smith_take()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_collect(purse, town.smithy_held(me), now_);
  g jsonb;
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    for g in select e.v from jsonb_array_elements(did->'got') with ordinality e(v, ord) order by e.ord loop
      perform town.note(me, 'smelted', g->>0, (g->>1)::numeric, 0, jsonb_build_object('waits', jsonb_array_length(town.smith_view(did->'smithy', now_)->'done')));
    end loop;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- The queue widened.
create or replace function public.town_smith_widen()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.smith_widen(purse, town.smithy_held(me));
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'smith_wider', null, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('timber', town.held_in(purse, 'timber') - town.held_in(did->'purse', 'timber'), 'places', town.smith_places(did->'smithy')));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- Who of these members has a piece smelting now, each with how many presses of the bellows that piece may still take.
-- (A look, asked every few seconds while the smelting's leaf is open and somebody stands by: it brings no purse and
-- holds nothing.)
create or replace function public.town_smith_near(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  each_ numeric := (town.cat('forge')->'smith'->'bellows'->>'each')::numeric;
begin
  -- (`cardinality`, not the first dimension's length: a list of lists counts by all it holds)
  if p_ids is null or coalesce(cardinality(p_ids), 0) > 64 then return jsonb_build_object('now', now_, 'near', '[]'::jsonb); end if;
  -- (each queue is looked at once, and only a queue that has something in it; what a piece may still take is
  -- `town.bellows_left`'s own sum, of the piece already in hand)
  return jsonb_build_object('now', now_, 'near', coalesce((
    select jsonb_agg(jsonb_build_object('id', x.id, 'piece', x.cur, 'left', greatest(0, each_ - coalesce((x.cur->>'blown')::numeric, 0))::integer) order by x.ord)
      from (select i.id, i.ord, town.smith_view(town.smithy_sound(k.doc), now_)->'now' as cur
              from (select distinct on (u.id) u.id, u.ord from unnest(p_ids) with ordinality u(id, ord) where u.id is not null and u.id <> me order by u.id, u.ord) i
              join public.town_smiths k on k.member_id = i.id
             where jsonb_typeof(k.doc->'queue') = 'array' and jsonb_array_length(k.doc->'queue') > 0
            offset 0) x
     where x.cur <> 'null'::jsonb), '[]'::jsonb));
end;
$$;

-- A press of the bellows of somebody else's queue. Only their smithy's row is held.
create or replace function public.town_smith_bellows(p_whose uuid)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  theirs jsonb;
  did jsonb;
begin
  if p_whose is null then return town.smith_answer(me, town.no('idle')); end if;
  if p_whose = me then return town.smith_answer(me, town.no('self')); end if;
  -- (their smithy's row is held: they, or another friend, may be writing it at this moment)
  theirs := town.smithy_held(p_whose);
  did := town.bellows(theirs, p_whose::text, me::text, now_);
  if (did->>'ok')::boolean then
    perform town.keep_smithy(p_whose, did->'smithy');
    perform town.note(me, 'bellows', town.smith_view(theirs, now_)->'now'->>'piece', 1, 0,
      jsonb_build_object('whose', p_whose::text, 'off', did->'off', 'left', town.bellows_left(did->'smithy', now_)));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A try at the tool in a slot of my bag. Both numbers of chance are drawn here: how the try goes, and (of a try for
-- the top, which spends the great fire) the while before the halves of the next can be found. The second is written
-- nowhere but into the fire's own row.
create or replace function public.town_smith_try(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  called text := town.smith_called(me);
  -- (the village's rows first: the great fire's, then the board's; then my purse)
  fire_ jsonb := town.fire_kept(true);
  board jsonb := town.board_sound(town.thing('smith', true));
  purse jsonb := town.purse_of(me, true);
  r double precision := random();
  did jsonb := town.forge_try_fired(purse, fire_, p_slot, r, me::text, called, now_, random());
  cost_ jsonb;
  marked jsonb;
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_purse(me, did->'purse');
  if (did->>'spent')::boolean then perform town.keep_fire(did->'fire'); end if;
  cost_ := town.try_cost(did->>'item', (did->>'from')::integer + 1);
  -- (every try is written down, whatever came of it: what was tried for, how it went, the number it went by, what it took)
  perform town.note(me, 'forge', did->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
    jsonb_build_object('slot', p_slot, 'from', did->'from', 'to', (did->>'from')::integer + 1, 'out', did->'out', 'level', did->'level', 'r', r,
      'ore', cost_->'ore', 'ores', cost_->'n', 'timber', cost_->'timber')
    || case when (did->>'spent')::boolean then '{"fire": true}'::jsonb else '{}'::jsonb end);
  -- (and the first of a kind at the top goes on the board)
  if (did->>'level')::integer >= (town.cat('forge')->'forge'->>'top')::integer then
    marked := town.board_top(board, did->>'item', me::text, called, now_);
    if marked <> board then
      perform town.keep_thing('smith', marked);
      perform town.note(me, 'forge_first', did->>'item', 1, 0, '{"which": "tops"}'::jsonb);
    end if;
  end if;
  return town.smith_answer(me, jsonb_build_object('ok', true, 'out', did->'out', 'from', did->'from', 'level', did->'level', 'item', did->'item', 'owed', did->'owed', 'spent', did->'spent'));
end;
$$;

-- The draw a tool is owed, laid out: the two numbers of chance are drawn here, and count only for a draw that is new.
create or replace function public.town_smith_draw(p_slot integer)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.forge_draw(purse, town.smithy_held(me), p_slot, random(), random());
begin
  if (did->>'ok')::boolean and (did->>'fresh')::boolean then
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_draw', did->'pending'->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'pending'->'at', 'offer', did->'pending'->'offer'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- One of the options laid out chosen, or the old one kept. The board's row is held first: an option chosen may be
-- the first of its kind found.
create or replace function public.town_smith_choose(p_slot integer, p_pick text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  board jsonb := town.board_sound(town.thing('smith', true));
  purse jsonb := town.purse_of(me, true);
  did jsonb;
  marked jsonb;
begin
  if p_pick is null or p_pick !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('none')); end if;
  did := town.forge_choose(purse, town.smithy_held(me), p_slot, p_pick);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_choose', did->>'item', 1, 0, jsonb_build_object('slot', p_slot, 'at', did->'at', 'opt', did->'opt', 'kept', did->'kept'));
    marked := town.board_found(board, did->>'opt', me::text, town.smith_called(me), now_);
    if marked <> board then
      perform town.keep_thing('smith', marked);
      perform town.note(me, 'forge_first', did->>'opt', 1, 0, '{"which": "found"}'::jsonb);
    end if;
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A milestone's option drawn again, for a gem and a fee.
create or replace function public.town_smith_redraw(p_slot integer, p_at integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.forge_redraw(purse, town.smithy_held(me), p_slot, p_at, p_gem, random(), random());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.keep_smithy(me, did->'smithy');
    perform town.note(me, 'forge_redraw', did->'pending'->>'item', 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'at', p_at, 'old', did->'pending'->'old', 'offer', did->'pending'->'offer', 'gem', p_gem));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- A gem set in the tool in a slot of my bag.
create or replace function public.town_smith_gem(p_slot integer, p_gem text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is null or p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.gem_set(purse, p_slot, p_gem);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'gem_set', p_gem, 1, (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'item', did->'item', 'element', did->'element', 'over', did->'over'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- Two tools of my bag trade what the smith put into them. The tile is the one the page says I stand on, held to the
-- forge's place; whether a game's board is open is the page's word. (My smithy is read, not held: see the head.)
create or replace function public.town_smith_move(p_from integer, p_to integer, p_x integer, p_y integer, p_playing boolean)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  purse jsonb := town.purse_of(me, true);
  did jsonb := town.move_forging(purse, town.smithy_read(me), p_from, p_to, coalesce(town.by_smith(p_x, p_y), false), coalesce(p_playing, false), now_);
begin
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'forge_move', did->>'a', 1, -(did->>'fee')::numeric,
      jsonb_build_object('from', p_from, 'to', p_to, 'a', did->'a', 'b', did->'b', 'level', did->'level', 'spilt', did->'spilt'));
  end if;
  return town.smith_answer(me, did);
end;
$$;

-- My name put in the row for the great fire. (Whether I have a tool one level under the top is read off my purse as
-- it stands: the purse is not held, for nothing of it is written.)
create or replace function public.town_fire_join()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  now_ bigint := town.now_ms();
  fire_ jsonb := town.fire_kept(true);
  did jsonb := town.fire_join(fire_, me::text, town.smith_called(me), town.forge_under_top(town.purse_of(me, false)), now_);
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_fire(did->'fire');
  perform town.note(me, 'fire_join', null, 1, 0, jsonb_build_object('place', jsonb_array_length(did->'fire'->'row')));
  return town.smith_answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- My name taken out of the row.
create or replace function public.town_fire_leave()
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.smith_member();
  fire_ jsonb := town.fire_kept(true);
  did jsonb := town.fire_leave(fire_, me::text);
begin
  if not (did->>'ok')::boolean then return town.smith_answer(me, town.no(did->>'why')); end if;
  perform town.keep_fire(did->'fire');
  perform town.note(me, 'fire_leave', null, 1, 0, '{}'::jsonb);
  return town.smith_answer(me, '{"ok": true}'::jsonb);
end;
$$;

-- A counted option of the tool in my hand used once (lib/town/powers' `usePower`), where its game is played on the
-- page and the page has to ask for the count. By the game's gate: see the head.
create or replace function public.town_tool_power(p_id text)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_id is null or p_id !~ '^[A-Za-z]{1,24}$' then return town.answer(me, town.no('none')); end if;
  did := town.use_power(purse, town.hand_stack(purse), p_id, town.now_ms());
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, 'power', p_id, 1, 0, jsonb_build_object('left', did->'left'));
  end if;
  return town.answer(me, did);
end;
$$;

-- ─── Who may ─────────────────────────────────────────────────────────────

-- The rules are no browser's to call; what a member calls is for the signed in.
revoke execute on all functions in schema town from public, anon, authenticated;

revoke execute on function public.town_smith_open() from public, anon;
grant execute on function public.town_smith_open() to authenticated;
revoke execute on function public.town_smith() from public, anon;
grant execute on function public.town_smith() to authenticated;
revoke execute on function public.town_smith_smelt(text, integer) from public, anon;
grant execute on function public.town_smith_smelt(text, integer) to authenticated;
revoke execute on function public.town_smith_take() from public, anon;
grant execute on function public.town_smith_take() to authenticated;
revoke execute on function public.town_smith_widen() from public, anon;
grant execute on function public.town_smith_widen() to authenticated;
revoke execute on function public.town_smith_near(uuid[]) from public, anon;
grant execute on function public.town_smith_near(uuid[]) to authenticated;
revoke execute on function public.town_smith_bellows(uuid) from public, anon;
grant execute on function public.town_smith_bellows(uuid) to authenticated;
revoke execute on function public.town_smith_try(integer) from public, anon;
grant execute on function public.town_smith_try(integer) to authenticated;
revoke execute on function public.town_smith_draw(integer) from public, anon;
grant execute on function public.town_smith_draw(integer) to authenticated;
revoke execute on function public.town_smith_choose(integer, text) from public, anon;
grant execute on function public.town_smith_choose(integer, text) to authenticated;
revoke execute on function public.town_smith_redraw(integer, integer, text) from public, anon;
grant execute on function public.town_smith_redraw(integer, integer, text) to authenticated;
revoke execute on function public.town_smith_gem(integer, text) from public, anon;
grant execute on function public.town_smith_gem(integer, text) to authenticated;
revoke execute on function public.town_smith_move(integer, integer, integer, integer, boolean) from public, anon;
grant execute on function public.town_smith_move(integer, integer, integer, integer, boolean) to authenticated;
revoke execute on function public.town_fire_join() from public, anon;
grant execute on function public.town_fire_join() to authenticated;
revoke execute on function public.town_fire_leave() from public, anon;
grant execute on function public.town_fire_leave() to authenticated;
revoke execute on function public.town_tool_power(text) from public, anon;
grant execute on function public.town_tool_power(text) to authenticated;

-- ═══ Part 2 of 2: the seven older tools in the games that are live ═════════════════════════════════════════════════

-- v174, the older tools' part: the rod, the hoe, the watering can, the insect net, the pot, the pan and the grill
-- read what they carry in the games that are live (lib/town/forged, lib/town/forged-keep, and the lines of
-- lib/town/fishing, farm, insects, cooking and stamina that read them, written again). Tried on the stand-in's
-- snapshot as it is after the last file that ran: `node try-v164.mjs <the worktree's root> v174 tools`. Safe to run
-- twice.
-- stands on: smith
--
-- It stands on v164's readers of a tool and its powers (v164.base.sql's head is the contract: `town.tool_mods`,
-- `tool_has`, `hand_stack`, `forged`, `use_power`, `power_left`) and on the smith's part of this file (the catalog's
-- `forge` row with the older tools' steps in it as `old`, and `town.can_holds`). Nothing of those is written again.
--
-- THE RULE OF THIS PART: A TOOL AS IT WAS BOUGHT PLAYS AS IT ALWAYS DID, TO THE LETTER. Every function of an earlier
-- file that is written again here is its own text as the database has it, with a few marked lines
-- (`-- ── the older tools (v174) … ──`), each of which does nothing unless a forged tool of the first tier is the one
-- the deed is done with: v174.tools.lines.mjs says the lines, build-v164.mjs builds each statement, and nothing of
-- those functions is pasted here. A plain tool's deed looks through the bag once for a forged thing of its kind
-- (`town.bag_forged`), and never reads the `forge` row.
--
-- WHAT IS HERE, in the order of the file:
--
--   1. WHAT IS KEPT. Two columns more, each empty for everything there is today:
--      · `town_plots.damp` (false): lib/town/farm's `Plot.damp`, of a bare tilled plot, until it is sown. Only
--        `town_tend` and `town_row` write a plot's soil, and both write this with it.
--      · `town_pots.marks` (null): what a pot of food carries from its cookware while it stands in the world
--        (lib/town/cooking's `potMarks`: the same two fields it has on its slot of the bag).
--      A purse keeps what the code keeps, in its document as ever: `powers` (v164's), `toolOwed`, `canFull`,
--      `rodStill`. A line in the water remembers its rod's part of the least a landing can take (`rod`), and a plant
--      the moment of a second watering (`twice`).
--   2. THE CAP (lib/town/forged's `easedBy`, `slowedBy`, `partOf`, `slowPartOf`) and a number of chance from a word
--      and a few numbers (`luckOf`).
--   3. THE READERS, one a family: `town.rod_fx`, `hoe_fx`, `can_fx`, `net_fx`, `cook_fx`. Each answers the code's
--      object of plain numbers and flags; FOR A STACK WITH NO PLUS, NO OPTION AND NO GEM THE PLAIN OBJECT, WITHOUT
--      READING THE CATALOG.
--   4. WHAT A TOOL PAYS (lib/town/forged-keep's `toolOwed`, `toolPaid`).
--   5. THE RULES OF EACH GAME THAT A FORGED TOOL CHANGES, as functions of their own that the marked lines call.
--   6. THE FUNCTIONS OF EARLIER FILES, each with its marked lines (empty places here).
--
-- THE ORDER ROWS ARE HELD IN is as it was: no function of this part holds a row that its text did not hold before.
-- The plots beside a deed's (a deed done with some forged hoes and cans changes them) are plots of the same row of
-- the same bed, and a bed is held whole by `town_tend` before any of its plots is read (`pg_advisory_xact_lock`,
-- after the purses, as ever): no second bed is ever held.
--
-- NUMBERS WITH A FRACTION ARE `double precision`, worked out in the order the code works them out.

-- ─── 1. What is kept ─────────────────────────────────────────────────────

alter table public.town_plots add column if not exists damp boolean not null default false;
alter table public.town_pots add column if not exists marks jsonb;

-- ─── 2. The cap, and chance ──────────────────────────────────────────────

-- easedBy: ease with a tool's own part in it, never past the cap, never less than the rest came to by itself.
create or replace function town.eased_by(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$
  select case when p_mine = 1 then p_rest when p_mine < 1 then p_rest * p_mine
    else greatest(p_rest, least((select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end
$$;

-- slowedBy: the same for what is easier the smaller it is.
create or replace function town.slowed_by(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$
  select case when p_mine = 1 then p_rest when p_mine > 1 then p_rest * p_mine
    else least(p_rest, greatest(1::double precision / (select (town.cat('forge')->'forge'->>'cap')::double precision), p_rest * p_mine)) end
$$;

-- partOf, slowPartOf: what a tool's own part multiplies a thing by once the rest is known. EXACTLY 1 FOR A PLAIN TOOL.
create or replace function town.part_of(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$ select case when p_mine = 1 then 1::double precision else town.eased_by(p_rest, p_mine) / p_rest end $$;

create or replace function town.slow_part_of(p_rest double precision, p_mine double precision)
returns double precision language sql stable
as $$ select case when p_mine = 1 then 1::double precision else town.slowed_by(p_rest, p_mine) / p_rest end $$;

-- luckOf: a number of chance in [0, 1) from a word and a few whole numbers, the same for whoever asks with the same.
create or replace function town.luck_of(p_word text, variadic p_nums bigint[] default '{}'::bigint[])
returns double precision language plpgsql immutable
as $$
declare
  s text := p_word || '|' || array_to_string(p_nums, '|');
  h bigint := 2166136261;
  i integer;
begin
  for i in 1..char_length(s) loop
    h := h # ascii(substr(s, i, 1));
    h := ((h::numeric * 16777619) % 4294967296)::bigint;
  end loop;
  return h::double precision / 4294967296;
end;
$$;

-- ─── 3. The readers (lib/town/forged) ────────────────────────────────────

-- The tool, if it is of one of some kinds and carries something of its own: what each reader begins with.
create or replace function town.fx_of(p_stack jsonb, variadic p_kinds text[])
returns boolean language sql immutable
as $$ select coalesce(p_stack->>'item' = any(p_kinds), false) and town.forged(p_stack) $$;

-- gemBy, of a tool whose `tool_mods` are in hand: what an element gives it, from the steps of its levels.
create or replace function town.fx_gem(p_mods jsonb, p_element text, p_steps jsonb, p_else double precision default 0)
returns double precision language sql immutable
as $$
  select case when l.v >= 1 then (p_steps->>(least(jsonb_array_length(p_steps), l.v) - 1))::double precision else p_else end
    from (select coalesce((p_mods->'gems'->>p_element)::integer, 0) as v) l
$$;

-- optN, of the catalog's row in hand; and has.
create or replace function town.fx_n(p_forge jsonb, p_mods jsonb, p_opt text, p_key text, p_else double precision default 0)
returns double precision language sql immutable
as $$ select case when p_mods->'opts' ? p_opt then coalesce((p_forge->'options'->'of'->p_opt->'n'->>p_key)::double precision, 0) else p_else end $$;

-- rodFx.
create or replace function town.rod_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  dark_ boolean;
begin
  if not town.fx_of(p_stack, 'rod') then
    return '{"band": 1, "pace": 1, "strike": 1, "line": 1, "fierce": 1, "spared": 0, "still": 0, "shimmer": 0, "stamina": 0, "fresh": false, "quick": 0, "keeps": 0, "rare": 1, "call": false, "gold": 0, "lull": 1, "lullMins": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'rod';
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 0) > 0;
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision,
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'strike', case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end,
    'line', 1::double precision - town.fx_gem(m, 'fire', o->'fire'->'rod'->'tires'),
    'fierce', case when dark_ then 1::double precision + (o->'dark'->'rod'->>'fiercer')::double precision else 1::double precision end,
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + case when m->'opts' ? 'rdBait' then 1 else 0 end,
    'still', town.fx_n(k, m, 'rdCalm', 'secs'),
    'shimmer', town.fx_gem(m, 'light', o->'light'->'rod'->'early'),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'rdFresh',
    'quick', town.fx_n(k, m, 'rdQuick', 'shorter'),
    'keeps', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 1),
    'call', m->'opts' ? 'rdCall',
    'gold', town.fx_n(k, m, 'rdGold', 'secs'),
    'lull', town.fx_n(k, m, 'rdStill', 'by', 1),
    'lullMins', town.fx_n(k, m, 'rdStill', 'mins'));
end;
$$;

-- hoeFx.
create or replace function town.hoe_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  worm_ double precision;
begin
  if not town.fx_of(p_stack, 'hoe') then
    return '{"band": 1, "pace": 1, "fewer": 0, "spared": 0, "stones": 0, "even": false, "glow": false, "stamina": 0, "fresh": false, "next": 0, "worm": 0, "grip": false, "both": false, "wet": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'hoe';
  worm_ := town.fx_gem(m, 'dark', o->'dark'->'hoe'->'worm');
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision,
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'))
      * case when worm_ > 0 then 1::double precision + (o->'dark'->'hoe'->>'faster')::double precision else 1::double precision end,
    'fewer', town.fx_gem(m, 'fire', o->'fire'->'hoe'->'fewer'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'hoFirst', 'misses'),
    'stones', town.fx_n(k, m, 'hoClear', 'stones'),
    'even', m->'opts' ? 'hoLight',
    'glow', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'hoFresh',
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'worm', worm_,
    'grip', m->'opts' ? 'hoGrip',
    'both', m->'opts' ? 'hoBoth',
    'wet', m->'opts' ? 'hoWet');
end;
$$;

-- canFx.
create or replace function town.can_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  rich_ double precision;
begin
  if not town.fx_of(p_stack, 'can') then
    return '{"more": 0, "marks": 1, "pace": 1, "spared": 0, "takes": null, "stamina": 0, "fresh": false, "kind": 0, "next": 0, "rich": 0, "uses": 1, "glint": 0, "full": 0, "rain": false, "twice": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'can';
  rich_ := town.fx_gem(m, 'dark', o->'dark'->'can'->'more');
  return jsonb_build_object(
    'more', (lv->'waterings'->>l)::double precision - (lv->'waterings'->>0)::double precision + town.fx_gem(m, 'fire', o->'fire'->'can'->'more') + town.fx_n(k, m, 'cnDrop', 'more'),
    'marks', (lv->'marks'->>l)::double precision,
    'pace', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'takes', case when m->'opts' ? 'cnThrift' then to_jsonb(town.fx_n(k, m, 'cnThrift', 'takes')) else 'null'::jsonb end,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'cnFresh',
    'kind', town.fx_n(k, m, 'cnKind', 'points'),
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rich', rich_,
    'uses', case when rich_ > 0 then (o->'dark'->'can'->>'uses')::double precision else 1::double precision end,
    'glint', town.fx_gem(m, 'light', o->'light'->'can'->'glint'),
    'full', town.fx_n(k, m, 'cnFull', 'mins'),
    'rain', m->'opts' ? 'cnRain',
    'twice', m->'opts' ? 'cnTwice');
end;
$$;

-- netFx.
create or replace function town.net_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
begin
  if not town.fx_of(p_stack, 'bugNet') then
    return '{"ring": 1, "lands": 1, "again": 1, "reach": 0, "spared": 0, "bears": 0, "flight": 1, "stamina": 0, "fresh": false, "twin": 0, "seen": 0, "rare": 1, "wide": 0, "freeze": 0, "nest": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'bugNet';
  return jsonb_build_object(
    'ring', case when l > 0 then (lv->'ring'->>l)::double precision / (lv->'ring'->>0)::double precision else 1::double precision end
      * case when town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare') > 0 then 1::double precision - (o->'dark'->'bugNet'->>'smaller')::double precision else 1::double precision end,
    'lands', case when l > 0 then (lv->'lands'->>l)::double precision / (lv->'lands'->>0)::double precision else 1::double precision end
      * (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'bugNet'->'sooner')),
    'again', town.fx_n(k, m, 'ntAgain', 'by', 1),
    'reach', town.fx_n(k, m, 'ntLong', 'reach'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'bears', town.fx_n(k, m, 'ntMesh', 'misses'),
    'flight', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'ntFresh',
    'twin', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'seen', town.fx_gem(m, 'light', o->'light'->'bugNet'->'seen'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare', 1),
    'wide', town.fx_n(k, m, 'ntWide', 'reach'),
    'freeze', town.fx_n(k, m, 'ntFreeze', 'secs'),
    'nest', m->'opts' ? 'ntNest');
end;
$$;

-- cookFx: the pot, the pan and the grill alike.
create or replace function town.cook_fx(p_stack jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  dark_ double precision;
begin
  if not town.fx_of(p_stack, 'pot', 'pan', 'grill') then
    return '{"band": 1, "shorter": 0, "spared": 0, "grace": 1, "stamina": 0, "fresh": false, "helping": 0, "big": 0, "steady": 1, "guide": false, "warm": 0, "scent": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'cook'->'helping');
  return jsonb_build_object(
    'band', (k->'levels'->(p_stack->>'item')->'band'->>l)::double precision
      * case when dark_ > 0 then 1::double precision / (1::double precision + (o->'dark'->'cook'->>'harder')::double precision) else 1::double precision end,
    'shorter', 1::double precision - (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'cook'->'shorter')) * (1::double precision - town.fx_n(k, m, 'ckBrisk', 'shorter')),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'ckBase', 'misses'),
    'grace', 1::double precision / (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'ckFresh',
    'helping', greatest(town.fx_gem(m, 'lightning', o->'lightning'->'chance'), dark_),
    'big', town.fx_n(k, m, 'ckBig', 'more'),
    'steady', town.fx_n(k, m, 'ckFire', 'steady', 1),
    'guide', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'warm', town.fx_n(k, m, 'ckWarm', 'hours'),
    'scent', town.fx_n(k, m, 'ckScent', 'stamina'));
end;
$$;

-- ─── 4. What a tool pays (lib/town/forged-keep) ──────────────────────────

-- toolOwed: what part of a point a tool's share has left owing (nothing, of what is kept wrongly).
create or replace function town.tool_owed(p_purse jsonb)
returns double precision language sql immutable
as $$
  select case when jsonb_typeof(p_purse->'toolOwed') = 'number' and (p_purse->>'toolOwed')::double precision > 0 and (p_purse->>'toolOwed')::double precision < 1
    then (p_purse->>'toolOwed')::double precision else 0::double precision end
$$;

-- toolPaid: a purse after a deed done with a tool, with what the tool's forging takes off its stamina given back.
-- `p_fx` is the tool's reader's answer, `p_fresh` the option that counts its free deeds.
create or replace function town.tool_paid(p_before jsonb, p_after jsonb, p_now bigint, p_tool jsonb, p_fx jsonb, p_fresh text)
returns jsonb language plpgsql stable
as $$
declare
  cost double precision := town.stamina_of(p_before, p_now) - town.stamina_of(p_after, p_now);
  share double precision := (p_fx->>'stamina')::double precision;
  used jsonb;
  did jsonb;
begin
  if not coalesce(cost > 0, false) or (not (p_fx->>'fresh')::boolean and not share > 0) then return p_after; end if;
  if (p_fx->>'fresh')::boolean then
    used := town.use_power(p_after, p_tool, p_fresh, p_now);
    if (used->>'ok')::boolean then
      return (used->'purse') || jsonb_build_object('stamina', jsonb_build_object('day', town.day_of(p_now), 'left', town.stamina_of(p_before, p_now)));
    end if;
  end if;
  if not share > 0 then return p_after; end if;
  did := town.eased(p_before, p_after, p_now,
    town.slow_part_of(1::double precision - town.buff_by(p_before, p_now, 'hearty'), 1::double precision - share), town.tool_owed(p_after));
  return (did->'purse') || jsonb_build_object('toolOwed', did->'owed');
end;
$$;

-- ─── 5a. Fishing (lib/town/fishing, lib/town/gear) ───────────────────────

-- rodOf: the rod somebody fishes with now, as the stack it is: the one in the hand, or the best in the bag (of that
-- kind the one forged furthest, the first of them).
create or replace function town.rod_of(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  rods jsonb := town.cat('fishing')->'rods';
  bag jsonb := p_purse->'bag';
  hand_ text := town.hand_of(p_purse);
  rod_ text;
begin
  if hand_ is not null and rods ? hand_ then return town.hand_stack(p_purse); end if;
  select r.id into rod_ from jsonb_array_elements_text(rods) with ordinality r(id, ord)
   where exists (select 1 from jsonb_array_elements(bag) b(v) where b.v->>'item' = r.id) order by r.ord desc limit 1;
  if rod_ is null then return null; end if;
  return (select s.v from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v->>'item' = rod_
           order by case when jsonb_typeof(s.v->'plus') = 'number' then (s.v->>'plus')::numeric else 0 end desc, s.ord limit 1);
end;
$$;

-- The forged rod somebody fishes with, or null: what every marked line of the deck's functions begins with. A bag
-- with no forged rod in it is answered at one look, with no catalog read.
create or replace function town.rod_held(p_purse jsonb)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb;
begin
  if not exists (select 1 from jsonb_array_elements(p_purse->'bag') b(v) where b.v->>'item' = 'rod' and town.forged(b.v)) then return null; end if;
  s := town.rod_of(p_purse);
  return case when town.fx_of(s, 'rod') then s end;
end;
$$;

-- rarer: what may take a bait, with the fish of some tiers so many times as often: each share of the whole again.
create or replace function town.rarer(p_odds jsonb, p_k double precision)
returns jsonb language plpgsql stable
as $$
declare
  fish jsonb;
  o jsonb;
  raised jsonb := '[]'::jsonb;
  total double precision := 0;
  p double precision;
  out_ jsonb := '[]'::jsonb;
begin
  if not coalesce(p_k > 1, false) then return p_odds; end if;
  fish := town.cat('fish');
  for o in select t.e from jsonb_array_elements(p_odds) with ordinality as t(e, ord) order by t.ord loop
    p := case when fish->(o->>'what')->>'tier' in ('rare', 'legend') then (o->>'p')::double precision * p_k else (o->>'p')::double precision end;
    raised := raised || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', p));
    total := total + p;
  end loop;
  for o in select t.e from jsonb_array_elements(raised) with ordinality as t(e, ord) order by t.ord loop
    out_ := out_ || jsonb_build_array(jsonb_build_object('what', o->>'what', 'p', (o->>'p')::double precision / total));
  end loop;
  return out_;
end;
$$;

-- rodHaste: the share of a wait a rod takes off, with what everything else has left of it already.
create or replace function town.rod_haste(p_rest double precision, p_quick double precision)
returns double precision language sql stable
as $$
  select case when p_quick > 0 then 1::double precision - town.slow_part_of(least(1::double precision, greatest(0.01::double precision, p_rest)), 1::double precision - p_quick)
    else 0::double precision end
$$;

-- The rod's own part of the line to be won, taken with the best net's in the bag (lib/town/gear's `gearOf`): what
-- the least a landing can have taken is multiplied by.
create or replace function town.rod_line(p_purse jsonb, p_fx jsonb)
returns double precision language sql stable
as $$
  select town.slow_part_of(least(1::double precision, coalesce((
      select min((c.nets->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.nets ? (s->>'item')), 1::double precision)),
    (p_fx->>'line')::double precision)
    from (select coalesce(town.cat('fishing')->'nets', '{}'::jsonb) as nets) c
$$;

-- called, calledCast, and the wait a rod shortens: a line as it is dropped with a forged rod. `p_line` is the line
-- as everything else has left it, `p_drawn` its wait as it was drawn; `p_purse` the purse as the hook left it.
-- Gives the line and the purse as they are afterwards.
create or replace function town.rod_cast(p_purse jsonb, p_rod jsonb, p_fx jsonb, p_line jsonb, p_drawn double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  haste double precision := town.rod_haste((p_line->>'wait')::double precision / greatest(1::double precision, p_drawn), (p_fx->>'quick')::double precision);
  used jsonb := town.use_power(p_purse, p_rod, 'rdCall', p_now);
begin
  if (used->>'ok')::boolean then
    return jsonb_build_object('purse', used->'purse', 'line', p_line || '{"wait": 1, "nibbles": []}'::jsonb);
  end if;
  return jsonb_build_object('purse', p_purse, 'line', case when haste > 0 then town.hastened(p_line, haste) else p_line end);
end;
$$;

-- goldStrike: a strike that came after the moment had passed (`p_late`: so many milliseconds after the bite, by the
-- keeper's clock and less its grace). The purse with one more counted, or null.
create or replace function town.gold_strike(p_purse jsonb, p_rod jsonb, p_fx jsonb, p_late bigint, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  secs double precision := (p_fx->>'gold')::double precision;
  used jsonb;
begin
  if not secs > 0 or not coalesce(p_late >= 0, false) or p_late > secs * 1000 then return null; end if;
  used := town.use_power(p_purse, p_rod, 'rdGold', p_now);
  return case when (used->>'ok')::boolean then used->'purse' end;
end;
$$;

-- fightPaid, then lulled: a purse after a fight's stamina is paid with a forged rod.
create or replace function town.rod_fought(p_before jsonb, p_after jsonb, p_rod jsonb, p_fx jsonb, p_what text, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  paid jsonb := town.tool_paid(p_before, p_after, p_now, p_rod, p_fx, 'rdFresh');
  mins double precision := (p_fx->>'lullMins')::double precision;
  used jsonb;
begin
  if not (p_fx->>'lull')::double precision < 1 or not mins > 0
     or (jsonb_typeof(paid->'rodStill') = 'number' and (paid->>'rodStill')::numeric > p_now)
     or coalesce(town.cat('fish')->p_what->>'tier', '') not in ('uncommon', 'rare', 'legend') then return paid; end if;
  used := town.use_power(paid, p_rod, 'rdStill', p_now);
  return case when (used->>'ok')::boolean then (used->'purse') || jsonb_build_object('rodStill', p_now + (mins * 60000)::bigint) else paid end;
end;
$$;

-- strikeScale's last factor: a forged rod's own part of the strike's moment, taken with the rest of what lengthens it
-- (a keen eye, the best float in the bag, a charm) and never past the cap. 1 for any other rod. `p_f`: the catalog's
-- `fishing` row, which whoever asks has in hand.
create or replace function town.rod_strike(p_purse jsonb, p_now bigint, p_f jsonb)
returns double precision language sql stable
as $$
  select case when r.rod is null then 1::double precision else town.part_of(
      (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
      * greatest(1::double precision, coalesce((
          select max((p_f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where p_f->'floats' ? (s->>'item')), 1::double precision))
      * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)),
      (town.rod_fx(r.rod)->>'strike')::double precision) end
    from (select town.rod_held(p_purse) as rod) r
$$;

-- ─── 5b. The farm (lib/town/farm) ────────────────────────────────────────

-- canFullNow.
create or replace function town.can_full_now(p_purse jsonb, p_now bigint)
returns boolean language sql immutable
as $$ select coalesce(jsonb_typeof(p_purse->'canFull') = 'number' and (p_purse->>'canFull')::numeric > p_now, false) $$;

-- Whether a bag has a thing of some kind that carries something of its own.
create or replace function town.bag_forged(p_bag jsonb, p_item text)
returns boolean language sql immutable
as $$ select exists (select 1 from jsonb_array_elements(p_bag) b(v) where b.v->>'item' = p_item and town.forged(b.v)) $$;

-- The slot of the bag the thing in the hand is in, as the purse remembers it (lib/town/trade's handSlot with `handAt`): -1 with nothing held.
create or replace function town.hand_at(p_purse jsonb)
returns integer language plpgsql stable
as $$
declare
  at_ numeric := case when jsonb_typeof(p_purse->'handAt') = 'number' then (p_purse->>'handAt')::numeric end;
begin
  return town.hand_slot(p_purse, case when at_ is not null and at_ = floor(at_) and abs(at_) < 2000000000 then at_::integer end);
end;
$$;

-- canSlot: the slot of the can a deed is done with: the one in the hand, when that carries something of its own and
-- will do; or the first of its kind that will (`p_room`: one that is not full; else one with water in it). -1: none.
create or replace function town.can_slot(p_purse jsonb, p_hand text, p_room boolean)
returns integer language plpgsql stable
as $$
declare
  bag jsonb := p_purse->'bag';
  at_ integer := town.hand_at(p_purse);
  mine jsonb := case when at_ >= 0 then bag->at_ end;
begin
  if mine is not null and mine->>'item' = p_hand and town.forged(mine)
     and (case when p_room then coalesce((mine->>'water')::numeric, 0) < town.can_holds(mine) else coalesce((mine->>'water')::numeric, 0) > 0 end) then return at_; end if;
  return coalesce((select (x.ord - 1)::integer from jsonb_array_elements(bag) with ordinality x(s, ord)
    where x.s->>'item' = p_hand and case when p_room then coalesce((x.s->>'water')::numeric, 0) < town.can_holds(x.s) else coalesce((x.s->>'water')::numeric, 0) > 0 end
    order by x.ord limit 1), -1);
end;
$$;

-- wetOnce.
create or replace function town.wet_once(p_plant jsonb, p_now bigint)
returns boolean language sql stable
as $$
  select p_now - (p_plant->>'watered')::bigint < (town.cat('farming')->'water'->>'every')::bigint * 60000 and not town.raining(p_now)
    and (p_plant->'twice') is distinct from (p_plant->'watered')
$$;

-- What deedFor answers otherwise when it is told `twice`: whether a plot's plant is the can's once more.
create or replace function town.twice_wanted(p_key text, p_plot jsonb, p_now bigint)
returns boolean language plpgsql stable
as $$
declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
begin
  if p = 'null'::jsonb then return false; end if;
  seen := town.see(p_key, p_plot, p_now);
  return not (seen->>'dead')::boolean and (seen->>'wet')::boolean and town.wet_once(p, p_now) and not (town.growing(p, p_now)->>'spent')::boolean
    and not ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null);
end;
$$;

-- wateringOf: what a watering adds to a plant, in milliseconds of growth.
create or replace function town.watering_of(p_purse jsonb, p_hand text, p_now bigint, p_fx jsonb)
returns double precision language sql stable
as $$
  select ((f.k->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f.k->'field'->>p_hand)::double precision, 1::double precision)
    * (1::double precision + town.buff_by(p_purse, p_now, 'green')) * (1::double precision + (p_fx->>'rich')::double precision)
    from (select town.cat('farming') as k) f
$$;

-- water, from where it asks whether the plant is wet, for a bag with a forged can of the kind held in it, or while a
-- can's minutes run. `p_seen`: the plot as the function saw it.
create or replace function town.water_with(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint, p_seen jsonb)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  p jsonb := p_plot->'plant';
  bag jsonb := p_purse->'bag';
  mine jsonb := town.hand_stack(p_purse);
  again boolean;
  wet_ integer;
  runs boolean := town.can_full_now(p_purse, p_now);
  mins double precision;
  begun jsonb;
  slot integer;
  can jsonb;
  from_ jsonb := p_purse;
  fx jsonb;
  free boolean;
  paid jsonb;
  twice jsonb;
begin
  again := (p_seen->>'wet')::boolean and coalesce(mine->>'item' = p_hand, false) and town.wet_once(p, p_now)
    and coalesce(mine->>'item' = 'can', false) and town.may_power(p_purse, mine, 'cnTwice', p_now);
  if (p_seen->>'wet')::boolean and not again then return town.no('wet'); end if;
  wet_ := town.can_slot(p_purse, p_hand, false);
  if wet_ < 0 and not runs and coalesce(mine->>'item' = p_hand, false) then
    mins := (town.can_fx(mine)->>'full')::double precision;
    if mins > 0 then begun := town.use_power(p_purse, mine, 'cnFull', p_now); end if;
  end if;
  slot := case when wet_ >= 0 then wet_ when runs or coalesce((begun->>'ok')::boolean, false) then town.hand_at(p_purse) else -1 end;
  if slot < 0 or bag->slot->>'item' is distinct from p_hand then return town.no('dry'); end if;
  can := bag->slot;
  if coalesce((begun->>'ok')::boolean, false) then from_ := (begun->'purse') || jsonb_build_object('canFull', p_now + (mins * 60000)::bigint); end if;
  fx := town.can_fx(can);
  free := town.has_buff(p_purse, p_now, 'spring') or runs or coalesce((begun->>'ok')::boolean, false);
  paid := town.spend(from_, (f->'costs'->>'water')::double precision, p_now)
    || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], can || jsonb_build_object('water',
         coalesce((can->>'water')::numeric, 0) - case when free then 0 else least((can->>'water')::numeric, (fx->>'uses')::numeric) end)));
  if again then twice := town.use_power(paid, mine, 'cnTwice', p_now); end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + town.watering_of(p_purse, p_hand, p_now, fx)) || case when again then jsonb_build_object('twice', p_now) else '{}'::jsonb end),
    'purse', case when coalesce((twice->>'ok')::boolean, false) then twice->'purse' else paid end);
end;
$$;

-- chore, a can's filling, for a bag with a forged can of the kind held in it: the can is filled as the stack it is.
create or replace function town.fill_with(p_purse jsonb, p_hand text, p_well integer, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  f jsonb := town.cat('farming');
  bag jsonb := p_purse->'bag';
  slot integer := town.can_slot(p_purse, p_hand, true);
  can jsonb := bag->slot;
  needs numeric := greatest(1, coalesce((town.can_fx(can)->>'takes')::numeric, (f->>'fill')::numeric, 1));
  holds double precision := town.can_holds(can);
  pours numeric := least(needs, p_well);
  had numeric := coalesce((can->>'water')::numeric, 0);
begin
  return jsonb_build_object('ok', true, 'chore', 'fill', 'well', p_well - pours,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], can || jsonb_build_object('item', p_hand, 'n', 1, 'water',
           case when pours >= needs then holds else least(holds, (had + floor(holds::numeric * pours / needs))::double precision) end))));
end;
$$;

-- tend, its end, for a deed of the hoe's or a watering done with a forged tool in the hand: what the tool pays, what
-- it counts, the plot as it is left and what came of it. `p_after`: the purse as the rest of the deed left it.
create or replace function town.tend_with(p_key text, p_deed text, p_before jsonb, p_after jsonb, p_plot jsonb, p_got jsonb, p_tool jsonb, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  fx jsonb;
  paid jsonb;
  used jsonb;
  both_ boolean := false;
  damp_ boolean := false;
  tilled boolean;
  left_ jsonb := p_plot;
  got_ jsonb := p_got;
begin
  if p_deed = 'water' then
    return jsonb_build_object('purse', town.tool_paid(p_before, p_after, p_now, p_tool, town.can_fx(p_tool), 'cnFresh'), 'plot', p_plot, 'got', p_got);
  end if;
  fx := town.hoe_fx(p_tool);
  paid := town.tool_paid(p_before, p_after, p_now, p_tool, fx, 'hoFresh');
  if town.stamina_of(p_before, p_now) <= 0 and (fx->>'grip')::boolean then
    used := town.use_power(paid, p_tool, 'hoGrip', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; end if;
  end if;
  if p_deed = 'clear' and p_plot->>'soil' = 'cleared' and (fx->>'both')::boolean then
    used := town.use_power(paid, p_tool, 'hoBoth', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; both_ := true; end if;
  end if;
  tilled := p_deed = 'till' or both_;
  if tilled and (fx->>'wet')::boolean then
    used := town.use_power(paid, p_tool, 'hoWet', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; damp_ := true; end if;
  end if;
  if both_ or damp_ then
    left_ := '{"soil": "tilled", "plant": null}'::jsonb || case when damp_ then '{"damp": true}'::jsonb else '{}'::jsonb end;
  end if;
  if tilled and (fx->>'worm')::double precision > 0 and town.luck_of('worm|' || p_key, p_now) < (fx->>'worm')::double precision and town.room(paid->'bag', 'worm') > 0 then
    paid := paid || jsonb_build_object('bag', town.put(paid->'bag', 'worm', 1));
    got_ := got_ || '[["worm", 1]]'::jsonb;
  end if;
  return jsonb_build_object('purse', paid, 'plot', left_, 'got', got_);
end;
$$;

-- sow, of a plot with `damp` on it: the plant as it is sown there.
create or replace function town.sow_damp(p_plant jsonb, p_now bigint)
returns jsonb language sql stable
as $$
  select p_plant || jsonb_build_object('boost', (p_plant->>'boost')::double precision + (town.cat('farming')->'water'->>'adds')::double precision * 60000::double precision, 'watered', p_now)
$$;

-- beside: what a deed done with a forged hoe or can does to the plots beside the one it was done to. `p_keys` the
-- plots of its row, `p_plots` those of them that are kept as they stood before the deed, `p_before` and `p_after`
-- the purse as the deed found it and as it left it, `p_owner` whose the bed is. Gives the purse with whatever was
-- counted, and the plots it changed by their keys.
create or replace function town.beside(p_key text, p_keys jsonb, p_plots jsonb, p_deed text, p_before jsonb, p_after jsonb, p_me text, p_now bigint, p_owner text, p_luck double precision default null)
returns jsonb language plpgsql stable
as $$
declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  nothing jsonb := jsonb_build_object('purse', p_after, 'plots', '{}'::jsonb);
  hoes boolean := coalesce(p_deed in ('clear', 'till'), false);
  hand_ text;
  tool jsonb;
  fx jsonb;
  x0 integer;
  chance double precision;
  rains boolean;
  want jsonb;
  struck boolean;
  did jsonb;
  more double precision;
  rained jsonb;
  out_ jsonb := '{}'::jsonb;
  k text;
begin
  if (not hoes and p_deed is distinct from 'water') or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_key) then return nothing; end if;
  hand_ := town.hand_of(p_before);
  tool := town.hand_stack(p_before);
  if not town.forged(tool) then return nothing; end if;
  fx := case when hoes then town.hoe_fx(tool) else town.can_fx(tool) end;
  chance := (fx->>'next')::double precision;
  rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false);
  if not chance > 0 and not rains then return nothing; end if;
  x0 := split_part(p_key, ',', 1)::integer;
  select jsonb_agg(q.key_ order by q.far, q.x) into want
    from (select w.key_, abs(split_part(w.key_, ',', 1)::integer - x0) as far, split_part(w.key_, ',', 1)::integer as x
            from jsonb_array_elements_text(p_keys) as w(key_)
           where w.key_ <> p_key and town.deed_for(w.key_, coalesce(p_plots->w.key_, wild), hand_, p_me, p_now, p_owner) = p_deed) q;
  if want is null then return nothing; end if;
  struck := coalesce(p_luck, town.luck_of('next|' || p_key, p_now)) < chance;
  if hoes then
    if not struck then return nothing; end if;
    did := town.hoe(want->>0, p_before, coalesce(p_plots->(want->>0), wild), hand_, p_now);
    return case when (did->>'ok')::boolean then jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(want->>0, did->'plot')) else nothing end;
  end if;
  more := town.watering_of(p_before, hand_, p_now, fx);
  if rains then rained := town.use_power(p_after, tool, 'cnRain', p_now); end if;
  if coalesce((rained->>'ok')::boolean, false) then
    for k in select t.key_ from jsonb_array_elements_text(want) with ordinality as t(key_, ord) order by t.ord loop
      out_ := out_ || jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
        || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more)));
    end loop;
    return jsonb_build_object('purse', rained->'purse', 'plots', out_);
  end if;
  if not struck then return nothing; end if;
  k := want->>0;
  return jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
    || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more))));
end;
$$;

-- What a watering's deed says more for the lines of work (lib/town/trial's farmDo, lib/town/line-points' countsOf).
create or replace function town.kind_doc(p_purse jsonb, p_deed text, p_plot jsonb, p_me text)
returns jsonb language plpgsql stable
as $$
declare
  n double precision;
begin
  if p_deed is distinct from 'water' or coalesce(p_plot->'plant'->>'by', p_me) = p_me or p_purse->>'hand' is distinct from 'can' or not town.bag_forged(p_purse->'bag', 'can') then return '{}'::jsonb; end if;
  n := (town.can_fx(town.hand_stack(p_purse))->>'kind')::double precision;
  return case when n > 0 then jsonb_build_object('kind', n) else '{}'::jsonb end;
end;
$$;

-- ─── 5c. The insects (lib/town/insects) ──────────────────────────────────

-- net and netMine, their end, with a forged net in the hand: the purse after the catch is paid for and in the bag,
-- and how many came.
create or replace function town.net_more(p_purse jsonb, p_tool jsonb, p_id text, p_n integer, p_cost double precision, p_luck double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  fx jsonb := town.net_fx(p_tool);
  n integer := p_n + case when p_luck < (fx->>'twin')::double precision and town.room(p_purse->'bag', p_id) > p_n then 1 else 0 end;
begin
  return jsonb_build_object('n', n,
    'purse', town.tool_paid(p_purse, town.spend(p_purse, p_cost, p_now), p_now, p_tool, fx, 'ntFresh') || jsonb_build_object('bag', town.put(p_purse->'bag', p_id, n)));
end;
$$;

-- The catalog's row of the insects as `town.comeback` is handed it after a catch made with the net in a hand: with
-- what that net's reader says of the kinds that come back (`rarer`), where it says anything; else null (the row as it is).
create or replace function town.net_cat(p_purse jsonb, p_ins jsonb)
returns jsonb language plpgsql stable
as $$
declare
  k double precision;
begin
  if p_purse->>'hand' is distinct from 'bugNet' or not town.bag_forged(p_purse->'bag', 'bugNet') then return null; end if;
  k := (town.net_fx(town.hand_stack(p_purse))->>'rare')::double precision;
  return case when k > 1 then p_ins || jsonb_build_object('rarer', k) end;
end;
$$;

-- netMore: what the reader says of the net in a member's hand, its `reach` and its `wide` together; nothing, with
-- a net as it was bought and with anything else in the hand. `town.net` and `town.net_mine` add it to the bound
-- their `far` is told by.
create or replace function town.net_more_far(p_purse jsonb)
returns double precision language plpgsql stable
as $$
declare
  fx jsonb;
begin
  if p_purse->>'hand' is distinct from 'bugNet' or not town.bag_forged(p_purse->'bag', 'bugNet') then return 0; end if;
  fx := town.net_fx(town.hand_stack(p_purse));
  return (fx->>'reach')::double precision + (fx->>'wide')::double precision;
end;
$$;

-- ─── 5d. The kitchen (lib/town/cooking, lib/town/stamina) ────────────────

-- potMarks: what a pot of food carries from its cookware, as it is kept on a pot and on a slot of the bag alike.
create or replace function town.pot_marks(p_from jsonb)
returns jsonb language sql immutable
as $$
  select case when jsonb_typeof(p_from->'warm') = 'number' and (p_from->>'warm')::numeric > 0 then jsonb_build_object('warm', p_from->'warm') else '{}'::jsonb end
      || case when jsonb_typeof(p_from->'scent') = 'number' and (p_from->>'scent')::numeric > 0 then jsonb_build_object('scent', p_from->'scent') else '{}'::jsonb end
$$;

-- The forged cookware a pot is begun with: the stack in the hand, where it is the thing the first of the cooks holds.
create or replace function town.cook_held(p_purse jsonb, p_crew jsonb)
returns jsonb language plpgsql stable
as $$
declare
  s jsonb;
begin
  if jsonb_typeof(p_crew->0) is distinct from 'string' or p_crew->>0 not in ('pot', 'pan', 'grill') or not town.bag_forged(p_purse->'bag', p_crew->>0) then return null; end if;
  s := town.hand_stack(p_purse);
  return case when s->>'item' = p_crew->>0 and town.forged(s) then s end;
end;
$$;

-- cook, of a dish, with forged cookware: the options it counts, and what the pot has more. `p_made`: whether the
-- dish is a recipe's. Gives the purse, how many helpings more, and the pot's marks.
create or replace function town.cook_more(p_spent jsonb, p_tool jsonb, p_fx jsonb, p_made boolean, p_luck double precision, p_now bigint)
returns jsonb language plpgsql stable
as $$
declare
  spent jsonb := p_spent;
  used jsonb;
  more integer := 0;
  warm_ double precision := 0;
  scent_ double precision := 0;
begin
  if p_made and (p_fx->>'big')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckBig', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; more := more + (p_fx->>'big')::integer; end if;
  end if;
  if p_luck < (p_fx->>'helping')::double precision then more := more + 1; end if;
  if p_made and (p_fx->>'warm')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckWarm', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; warm_ := (p_fx->>'warm')::double precision; end if;
  end if;
  if p_made and (p_fx->>'scent')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckScent', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; scent_ := (p_fx->>'scent')::double precision; end if;
  end if;
  return jsonb_build_object('purse', spent, 'more', more, 'marks', town.pot_marks(jsonb_build_object('warm', warm_, 'scent', scent_)));
end;
$$;

-- warmed: a meal's buffs with one of them lasting so many hours more.
create or replace function town.warmed(p_up jsonb, p_id text, p_hours double precision, p_now bigint, p_was jsonb)
returns jsonb language plpgsql stable
as $$
declare
  st jsonb := town.cat('stamina');
  most double precision;
  buffs jsonb;
  mine jsonb;
begin
  if not coalesce(p_hours > 0, false) then return p_up; end if;
  most := p_now + ((st->>'hours')::double precision + p_hours) * 3600000::double precision;
  select coalesce(jsonb_agg(case when b.v->>'id' = p_id then b.v || jsonb_build_object('until', least(most, (b.v->>'until')::double precision + p_hours * 3600000::double precision)) else b.v end order by b.ord), '[]'::jsonb)
    into buffs from jsonb_array_elements(coalesce(p_up->'buffs', '[]'::jsonb)) with ordinality b(v, ord);
  select b.v into mine from jsonb_array_elements(buffs) with ordinality b(v, ord) where b.v->>'id' = p_id order by b.ord limit 1;
  return jsonb_build_object('buffs', buffs,
    'buff', case when mine is not null and st->'buffs' ? p_id then jsonb_build_object('id', p_id, 'until', mine->'until') else coalesce(p_up->'buff', p_was, 'null'::jsonb) end);
end;
$$;

-- ─── 6. Functions of earlier files, each with its marked lines ───────────
--
-- (each function below is the database's own text as it stood after v173 and the part above, with the lines of
-- v174.tools.lines.mjs in place: built by assemble-v174.mjs, never typed. If a file that writes one of them has
-- run since v173, its change is undone here: this file's head says how to look first. `town.work_counts_of` is
-- built on the text the smith's part above left: it carries his block too.)

-- fishing
-- <town.strike_window>
create or replace function town.strike_window(p_purse jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $$
  select (c.f->>'strike')::double precision * (
    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))
    * (case when town.stamina_of(p_purse, p_now) <= 0 then (c.f->>'spent')::double precision else 1::double precision end)
    * greatest(1::double precision, coalesce((
        select max((c.f->'floats'->>(s->>'item'))::double precision) from jsonb_array_elements(p_purse->'bag') s where c.f->'floats' ? (s->>'item')), 1::double precision))
    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision))
    -- ── the older tools (v174): a forged rod's own part, taken with the rest and never past the cap (1 for any other rod) ──
    * town.rod_strike(p_purse, p_now, c.f))
    from (select town.cat('fishing') as f) c
$$;
-- </town.strike_window>

-- <public.town_cast>
create or replace function public.town_cast(p_bait text, p_x integer, p_y integer, p_rain boolean DEFAULT false, p_how text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  deep jsonb := town.cat('fishing')->'places'->(p_x::text || ',' || p_y::text);
  hour integer := extract(hour from to_timestamp(now_ / 1000.0) at time zone 'Asia/Bangkok')::int;
  sg jsonb := town.cat('fishing')->'signs';
  signs text[];
  did jsonb;
  line jsonb;
  pair boolean := coalesce(p_how = 'pair', false);
  star boolean := coalesce(p_how = 'star', false);
  bait text := case when coalesce(p_how = 'star', false) then 'thingBait' else p_bait end;
  odds jsonb;
  two jsonb;
  sky text := town.orb_of(purse, now_);
  under jsonb;
  k double precision := town.harder_for(me, 'fishing');
  old jsonb;
  -- ── the older tools (v174): the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──
  rod_ jsonb;
  fx_ jsonb;
  drawn_ double precision;
  cast_ jsonb;
begin
  if p_bait is null or p_bait !~ '^[A-Za-z]{1,24}$' or deep is null then return town.answer(me, town.no('none')); end if;
  -- (a rod of two lines is its owner's to drop, and a stardust bait its owner's)
  if p_how is not null and not ((pair and town.gift_works(purse, 'thingRod')) or (star and town.gift_works(purse, 'thingBait'))) then return town.answer(me, town.no('none')); end if;
  -- (a line still out with nothing hooked, dropped over: that is a line taken up, and counted so)
  select l.doc into old from public.town_lines l where l.member_id = me;
  if old is not null and old->'struck_at' = 'null'::jsonb then purse := town.took_up(purse, now_); end if;
  did := case when star then town.hook_star(purse, now_) when pair then town.hook_baits(purse, p_bait, 2) else town.hook_bait(purse, p_bait) end;
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- what some fish wait for: whether I have any stamina left, how many others have dropped a line in the last few
  -- minutes (a line still out, or a fish still fought), the rain of the minutes before, and the clock
  signs := town.signs_of(now_, town.stamina_of(purse, now_) <= 0,
    (select count(*)::int from public.town_lines l where l.member_id <> me and (l.doc->>'cast_at')::bigint > now_ - (sg->>'lately')::bigint * 1000),
    town.wet_ms(now_ - (sg->>'after')::bigint * 60000, now_), town.raining(now_));
  -- (under a sky orb the water answers its owner as if under that sky: the hour, the rain and the signs are the orb's)
  under := town.under_orb(sky, hour, town.raining(now_), signs);
  odds := case when star then town.star_odds((under->>'rain')::boolean, not deep::boolean, array(select jsonb_array_elements_text(under->'signs')), town.shelf_top())
    else town.odds(p_bait, (under->>'hour')::integer, (under->>'rain')::boolean, town.has_buff(purse, now_, 'lucky'), not deep::boolean,
      array(select jsonb_array_elements_text(under->'signs')), town.buff_by(purse, now_, 'lucky')) end;
  -- (a legend never comes as one of a pair)
  if pair then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'pair'->'never'))); end if;
  -- (for a hand that takes lines up again and again the rare fish and better are gone a while)
  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's rarer ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    odds := town.rarer(odds, (fx_->>'rare')::double precision);
  end if;
  -- ── the older tools (v174): its end ──
  -- (nothing is there to take a stardust bait: the line is not dropped, and the bait is not spent)
  if jsonb_array_length(odds) = 0 then return town.answer(me, town.no('calm')); end if;
  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
  -- ── the older tools (v174) ──
  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;
  -- (from the fourth rank of the deck what is uncommon or better is bigger, and fights harder: the line remembers by how much)
  if k > 1 then line := line || jsonb_build_object('harder', k, 'size', town.bigger((line->>'size')::double precision, town.harder_of(line->>'what', k))); end if;
  -- (the second line's: what takes it and how long it is; both are hooked by the one strike, at the first's bite)
  if pair then
    two := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);
    line := line || jsonb_build_object('two', jsonb_build_object('what', two->'what', 'size',
      case when k > 1 then town.bigger((two->>'size')::double precision, town.harder_of(two->>'what', k)) else (two->>'size')::double precision end));
  end if;
  -- (under the fountain's swift blessing the bite comes sooner)
  if town.has_buff(purse, now_, 'swift') then line := town.hastened(line, (town.wishing()->>'swift')::double precision); end if;
  -- (and under an orb sooner still: by the gift's number)
  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;
  -- ── the older tools (v174): the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──
  if rod_ is not null then
    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);
    line := cast_->'line';
    did := did || jsonb_build_object('purse', cast_->'purse');
    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;
  end if;
  -- ── the older tools (v174): its end ──
  -- (a line that was still out is given up: its bait went with it when it was dropped)
  insert into public.town_lines (member_id, doc) values (me, line || jsonb_build_object(
      'bait', bait, 'x', p_x, 'y', p_y, 'deep', deep, 'hour', hour, 'rain', town.raining(now_),
      'cast_at', now_, 'bites_at', now_ + (line->>'wait')::bigint * 1000, 'struck_at', null, 'told', town.wearing(purse, 'charmFloat')))
    on conflict (member_id) do update set doc = excluded.doc, updated_at = now();
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'cast', bait, case when pair then 2 else 1 end, 0, jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'signs', to_jsonb(signs))
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end);
  -- (and under its clear water the shade of what is on its way is told: how rare a fish it is, or that it is no fish; never which)
  return town.answer(me, jsonb_build_object('ok', true, 'line', jsonb_build_object('wait', line->'wait', 'nibbles', line->'nibbles')
    || case when town.has_buff(purse, now_, 'clear') then jsonb_build_object('shade', coalesce(town.cat('fish')->(line->>'what')->>'tier', 'other')) else '{}'::jsonb end
    || case when town.wearing(purse, 'charmFloat') then jsonb_build_object('coming', line->>'what') else '{}'::jsonb end
    || case when pair then jsonb_build_object('pair', true) else '{}'::jsonb end
    || case when pair and town.wearing(purse, 'charmFloat') then jsonb_build_object('coming2', line->'two'->>'what') else '{}'::jsonb end));
end;
$$;
-- </public.town_cast>

-- <public.town_strike>
create or replace function public.town_strike(p_reaction integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text;
  landed jsonb;
  spent boolean := town.stamina_of(purse, now_) <= 0;
  play jsonb;
  -- ── the older tools (v174): the forged rod, what it carries, and the purse a late strike leaves ──
  rod_ jsonb;
  fx_ jsonb;
  gold_ jsonb;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or line->'struck_at' <> 'null'::jsonb then return town.answer(me, town.no('none')); end if;
  play := jsonb_build_object('place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'claims', jsonb_build_object('rain', line->'rain', 'reaction', p_reaction));
  how := case
    when now_ < (line->>'bites_at')::bigint - (cat->'slack'->>'early')::bigint then 'early'
    when now_ > (line->>'bites_at')::bigint + floor(town.strike_window(purse, now_) * 1000)::bigint + (cat->'slack'->>'late')::bigint then 'missed'
    end;
  -- ── the older tools (v174): the forged rod, read once; and lib/town/fishing's goldStrike, asked only of a strike that was struck (a bite let go by says no reaction) ──
  rod_ := town.rod_held(purse);
  if rod_ is not null then
    fx_ := town.rod_fx(rod_);
    if how = 'missed' and p_reaction is not null then
      gold_ := town.gold_strike(purse, rod_, fx_, now_ - (line->>'bites_at')::bigint - (cat->'slack'->>'late')::bigint, now_);
      if gold_ is not null then purse := gold_; how := null; end if;
    end if;
  end if;
  -- ── the older tools (v174): its end ──
  if how is not null then
    delete from public.town_lines where member_id = me;
    -- (of a line that told what was on its way, a strike too soon and a bite let go by are a line taken up)
    if coalesce((line->>'told')::boolean, false) then perform town.keep_purse(me, town.took_up(purse, now_)); end if;
    perform town.record(me, 'fishing', false, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', how, 'kept', false, 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', false, 'how', how));
  end if;
  -- (a rod of two lines: both are hooked by the one strike)
  if line ? 'two' then return town.answer(me, town.strike_two(me, purse, line, p_reaction, spent, play, now_)); end if;
  fish := town.cat('fish')->(line->>'what');
  if fish is null then
    landed := town.land_catch(purse, line->>'what', 0);
    perform town.keep_purse(me, landed->'purse');
    delete from public.town_lines where member_id = me;
    perform town.record(me, 'fishing', true, 0, spent, town.buff_of(purse, now_), play || jsonb_build_object('how', 'landed', 'kept', landed->'kept', 'record', false));
    return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
  end if;
  -- a fight costs its stamina whatever comes of it
  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));
  -- ── the older tools (v174): the same with a forged rod ──
  if rod_ is not null then perform town.keep_purse(me, town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, now_), rod_, fx_, line->>'what', now_)); end if;
  update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'reaction', p_reaction, 'spent', spent), updated_at = now() where member_id = me;
  return town.answer(me, jsonb_build_object('ok', true, 'hooked', true, 'what', line->'what', 'size', line->'size', 'landed', false)
    || case when line ? 'harder' then jsonb_build_object('harder', line->'harder') else '{}'::jsonb end);
end;
$$;
-- </public.town_strike>

-- <town.strike_two>
create or replace function town.strike_two(p_member uuid, p_purse jsonb, p_line jsonb, p_reaction integer, p_spent boolean, p_play jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
declare
  purse jsonb := p_purse;
  things jsonb := jsonb_build_array(jsonb_build_object('what', p_line->'what', 'size', p_line->'size'), p_line->'two');
  thing jsonb;
  fish jsonb;
  landed jsonb;
  told jsonb := '[]'::jsonb;
  onhook jsonb := '[]'::jsonb;
  i integer;
  -- ── the older tools (v174): the forged rod, read once, and what it carries ──
  rod_ jsonb := town.rod_held(p_purse);
  fx_ jsonb;
begin
  if rod_ is not null then fx_ := town.rod_fx(rod_); end if;
  for i in 0..1 loop
    thing := things->i;
    fish := town.cat('fish')->(thing->>'what');
    if fish is null then
      landed := town.land_catch(purse, thing->>'what', 0);
      purse := landed->'purse';
      perform town.record(p_member, 'fishing', true, 0, p_spent, town.buff_of(p_purse, p_now),
        p_play || jsonb_build_object('what', thing->'what', 'size', 0, 'how', 'landed', 'kept', landed->'kept', 'record', false, 'pair', i));
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', 0, 'landed', true, 'kept', landed->'kept'));
    else
      -- ── the older tools (v174): a fight's stamina with a forged rod; with any other, the line as it was ──
      if rod_ is not null then
        purse := town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, p_now), rod_, fx_, thing->>'what', p_now);
      else
      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);
      end if;
      onhook := onhook || jsonb_build_array(thing);
      told := told || jsonb_build_array(jsonb_build_object('what', thing->'what', 'size', thing->'size', 'landed', false));
    end if;
  end loop;
  perform town.keep_purse(p_member, purse);
  if jsonb_array_length(onhook) = 0 then
    delete from public.town_lines where member_id = p_member;
  else
    update public.town_lines set doc = (p_line - 'two')
        || jsonb_build_object('what', onhook->0->'what', 'size', onhook->0->'size', 'struck_at', p_now, 'reaction', p_reaction, 'spent', p_spent, 'paired', true)
        || case when jsonb_array_length(onhook) = 2 then jsonb_build_object('two', onhook->1) else '{}'::jsonb end, updated_at = now()
     where member_id = p_member;
  end if;
  return jsonb_build_object('ok', true, 'hooked', true, 'what', told->0->'what', 'size', told->0->'size',
    'landed', jsonb_array_length(onhook) = 0, 'kept', told->0->'kept', 'pair', told)
    || case when p_line ? 'harder' then jsonb_build_object('harder', p_line->'harder') else '{}'::jsonb end;
end;
$$;
-- </town.strike_two>

-- <public.town_land>
create or replace function public.town_land(p_how text, p_fight jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  cat jsonb := town.cat('fishing');
  line jsonb;
  fish jsonb;
  how text := p_how;
  took bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
  drove jsonb;
  -- ── the older tools (v174): the forged rod, the purse with a bait left in it, and whether one was ──
  rod_ jsonb;
  baited_ jsonb;
  kept_ boolean := false;
begin
  select l.doc into line from public.town_lines l where l.member_id = me for update;
  if line is null or how is null or how not in ('landed', 'snapped', 'slipped', 'left') then return town.answer(me, town.no('none')); end if;
  -- (two fish still on a rod of two lines: one of them has ended, and the other is on still)
  if line ? 'two' and line->'struck_at' <> 'null'::jsonb and how <> 'left' then return town.answer(me, town.land_one(me, purse, line, how, p_fight, now_)); end if;
  if line->'struck_at' = 'null'::jsonb then
    -- nothing was hooked yet: the line can only be pulled up
    how := 'left';
    took := 0;
    perform town.keep_purse(me, town.took_up(purse, now_));
  else
    fish := town.cat('fish')->(line->>'what');
    took := now_ - (line->>'struck_at')::bigint;
    -- sooner than half the quickest fight there could be with it, it was not landed; nor long after any fight would be over
    -- (by how much harder the fish was for this member; and a legend takes its bouts, but for one the otter drove back, which is fought once more)
    if how = 'landed' and (took < town.least_ms(line->>'what', coalesce((line->>'harder')::double precision, 1),
          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)
          -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
          * coalesce((line->>'rod')::double precision, 1::double precision)
        or took > (cat->>'longest')::bigint * 1000) then
      how := 'slipped';
      suspect := true;
    end if;
    if how = 'landed' then
      landed := town.land_catch(purse, line->>'what', (line->>'size')::double precision);
      perform town.keep_purse(me, landed->'purse');
      -- ── the older tools (v174): lib/town/fishing's baitKept; the number of chance is drawn only with a forged rod ──
      if fish is not null and cat->'baits' ? (line->>'bait') then
        rod_ := town.rod_held(purse);
        if rod_ is not null then
          if random() < (town.rod_fx(rod_)->>'keeps')::double precision then
            baited_ := town.back_bait(landed->'purse', line->>'bait');
            kept_ := town.held(baited_->'bag', line->>'bait') > town.held(landed->'purse'->'bag', line->>'bait');
            perform town.keep_purse(me, baited_);
          end if;
        end if;
      end if;
      -- ── the older tools (v174): its end ──
    elsif how in ('snapped', 'slipped') and not suspect then
      -- (the otter drives it back, once to a line: the line stays out with its fish on, to be fought again from now,
      -- and nothing is lost or written down of the go yet)
      drove := town.drive_back(purse, how, coalesce((line->>'again')::boolean, false), now_);
      if (drove->>'ok')::boolean then
        perform town.keep_purse(me, drove->'purse');
        update public.town_lines set doc = line || jsonb_build_object('struck_at', now_, 'again', true), updated_at = now() where member_id = me;
        perform town.note(me, 'gift_use', 'famOtter', 1, 0, jsonb_build_object('left', drove->'left', 'what', line->'what', 'how', how));
        return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', line->'what', 'kept', false, 'record', false, 'back', false, 'again', true));
      end if;
      back := town.back_bait(case when how = 'snapped' then town.lose_bait(purse, line->>'bait') else purse end, line->>'bait');
      perform town.keep_purse(me, back);
    end if;
  end if;
  delete from public.town_lines where member_id = me;
  perform town.record(me, 'fishing', how = 'landed', took / 1000.0, coalesce((line->>'spent')::boolean, false), town.buff_of(purse, now_), jsonb_build_object(
    'how', how, 'place', case when (line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(line->'x', line->'y'),
    'bait', line->'bait', 'hour', line->'hour', 'what', line->'what', 'size', line->'size', 'wait', line->'wait',
    'nibbles', jsonb_array_length(line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect,
    'claims', jsonb_build_object('rain', line->'rain', 'reaction', line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return town.answer(me, jsonb_build_object('ok', true, 'how', how, 'what', case when line->'struck_at' = 'null'::jsonb then null else line->'what' end,
    'kept', landed->'kept', 'record', landed->'record',
    -- ── the older tools (v174): or lib/town/fishing's baitKept said so ──
    'back', (back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')) or kept_));
end;
$$;
-- </public.town_land>

-- <town.land_one>
create or replace function town.land_one(p_member uuid, p_purse jsonb, p_line jsonb, p_how text, p_fight jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $$
declare
  cat jsonb := town.cat('fishing');
  second boolean := coalesce(p_fight->>'which', '0') = '1';
  first jsonb := jsonb_build_object('what', p_line->'what', 'size', p_line->'size');
  mine jsonb := case when second then p_line->'two' else first end;
  other jsonb := case when second then first else p_line->'two' end;
  fish jsonb := town.cat('fish')->(mine->>'what');
  how text := p_how;
  took bigint := p_now - (p_line->>'struck_at')::bigint;
  suspect boolean := false;
  landed jsonb := jsonb_build_object('kept', false, 'record', false);
  back jsonb;
begin
  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))
      -- ── the older tools (v174): so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──
      * coalesce((p_line->>'rod')::double precision, 1::double precision)
      or took > (cat->>'longest')::bigint * 1000) then
    how := 'slipped';
    suspect := true;
  end if;
  if how = 'landed' then
    landed := town.land_catch(p_purse, mine->>'what', (mine->>'size')::double precision);
    perform town.keep_purse(p_member, landed->'purse');
  elsif not suspect then
    back := town.back_bait(case when how = 'snapped' then town.lose_bait(p_purse, p_line->>'bait') else p_purse end, p_line->>'bait');
    perform town.keep_purse(p_member, back);
  end if;
  update public.town_lines set doc = (p_line - 'two') || jsonb_build_object('what', other->'what', 'size', other->'size'), updated_at = now() where member_id = p_member;
  perform town.record(p_member, 'fishing', how = 'landed', took / 1000.0, coalesce((p_line->>'spent')::boolean, false), town.buff_of(p_purse, p_now), jsonb_build_object(
    'how', how, 'place', case when (p_line->>'deep')::boolean then 'deck' else 'bank' end, 'tile', jsonb_build_array(p_line->'x', p_line->'y'),
    'bait', p_line->'bait', 'hour', p_line->'hour', 'what', mine->'what', 'size', mine->'size', 'wait', p_line->'wait',
    'nibbles', jsonb_array_length(p_line->'nibbles'), 'kept', landed->'kept', 'record', landed->'record', 'suspect', suspect, 'pair', case when second then 1 else 0 end,
    'claims', jsonb_build_object('rain', p_line->'rain', 'reaction', p_line->'reaction', 'how', p_how, 'fight', town.claims(p_fight))));
  return jsonb_build_object('ok', true, 'how', how, 'what', mine->'what', 'kept', landed->'kept', 'record', landed->'record',
    'back', back is not null and town.held(back->'bag', p_line->>'bait') > town.held(p_purse->'bag', p_line->>'bait'), 'more', true);
end;
$$;
-- </town.land_one>

-- the farm
-- <town.tend>
create or replace function town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
  theirs boolean;
  rung jsonb;
  -- ── the older tools (v174): the forged hoe or can in the hand, and the deed's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  -- ── the older tools (v174): the forged hoe or can in the hand, read once (no other thing held is looked at); and lib/town/farm's mayTwice, where deedFor is told of it ──
  if (hand = 'hoe' or hand = 'can') and town.bag_forged(p_purse->'bag', hand) then
    tool_ := town.hand_stack(p_purse);
    if not town.forged(tool_) then tool_ := null; end if;
  end if;
  if tool_ is not null and hand = 'can' and town.may_power(p_purse, tool_, 'cnTwice', p_now) and town.twice_wanted(p_key, p_plot, p_now) then deed := 'water'; end if;
  -- ── the older tools (v174): its end ──
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  theirs := (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me);
  -- (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the watering so many times over)
  rung := jsonb_build_object('purse', case when theirs then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end, 'times', 1);
  if deed = 'water' and theirs then rung := town.chime(rung->'purse', p_now); end if;
  -- ── the older tools (v174): what the forged tool pays and counts, the plot as it leaves it, and what came of it ──
  if tool_ is not null and deed in ('clear', 'till', 'water') then
    more_ := town.tend_with(p_key, deed, p_purse, rung->'purse', did->'plot', coalesce(did->'got', '[]'::jsonb), tool_, p_now);
    rung := rung || jsonb_build_object('purse', more_->'purse');
    did := did || jsonb_build_object('plot', more_->'plot', 'got', more_->'got');
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', rung->'purse',
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end
    || case when (rung->>'times')::numeric > 1 then jsonb_build_object('times', rung->'times') else '{}'::jsonb end;
end;
$$;
-- </town.tend>

-- <town.water>
create or replace function town.water(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  f jsonb := town.cat('farming');
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  seen jsonb;
  slot integer;
  can jsonb;
begin
  if coalesce(town.tool_of(p_hand), '') <> 'can' or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p = 'null'::jsonb then return town.no('soil'); end if;
  seen := town.see(p_key, p_plot, p_now);
  if (seen->>'dead')::boolean or ((seen->>'ripe')::boolean and town.cat('crops')->(p->>'crop')->>'again' is null)
     or (town.growing(p, p_now)->>'spent')::boolean then return town.no('soil'); end if;
  -- ── the older tools (v174): with a forged can of this kind in the bag, or under lib/town/farm's canFullNow, the rest is lib/town/farm's water as it reads them ──
  if town.can_full_now(p_purse, p_now) or town.bag_forged(p_purse->'bag', p_hand) then return town.water_with(p_key, p_purse, p_plot, p_hand, p_now, seen); end if;
  if (seen->>'wet')::boolean then return town.no('wet'); end if;
  select (x.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality x(s, ord)
   where x.s->>'item' = p_hand and coalesce((x.s->>'water')::numeric, 0) > 0 order by x.ord limit 1;
  if slot is null then return town.no('dry'); end if;
  can := p_purse->'bag'->slot;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision
        + ((f->'water'->>'adds')::double precision * 60000::double precision) * coalesce((f->'field'->>p_hand)::double precision, 1::double precision)
          * (1::double precision + town.buff_by(p_purse, p_now, 'green')))),
    'purse', town.spend(p_purse, (f->'costs'->>'water')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text], can || jsonb_build_object('water', (can->>'water')::numeric - (case when town.has_buff(p_purse, p_now, 'spring') then 0 else 1 end)))));
end;
$$;
-- </town.water>

-- <town.sow>
create or replace function town.sow(p_purse jsonb, p_plot jsonb, p_hand text, p_me text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  f jsonb := town.cat('farming');
  crop text := f->'seeds'->>p_hand;
begin
  if crop is null or town.held(p_purse->'bag', p_hand) = 0 then return town.no('hand'); end if;
  if p_plot->>'soil' <> 'tilled' or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb then return town.no('soil'); end if;
  -- ── the older tools (v174): a plot with `damp` on it: sown as any other, then the plant as lib/town/farm's sow has it there ──
  if p_plot->'damp' = 'true'::jsonb then
    return (select d.v || jsonb_build_object('plot', (d.v->'plot') || jsonb_build_object('plant', town.sow_damp(d.v->'plot'->'plant', p_now)))
              from (select town.sow(p_purse, p_plot - 'damp', p_hand, p_me, p_now) as v) d);
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true,
    'plot', jsonb_build_object('soil', 'tilled', 'plant', jsonb_build_object('by', p_me, 'crop', crop, 'sown', p_now,
      'boost', case when town.has_buff(p_purse, p_now, 'sprout')
        then (town.wishing()->>'sprout')::double precision * (town.cat('crops')->crop->>'hours')::double precision * 3600000 else 0 end, 'watered', 0, 'fed', 0, 'guard', 0, 'cured', 0, 'picked', 0, 'pickedAt', 0)),
    'purse', town.spend(p_purse, (f->'costs'->>'sow')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
end;
$$;
-- </town.sow>

-- <town.chore>
create or replace function town.chore(p_purse jsonb, p_where text, p_well integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  f jsonb := town.cat('farming');
  what text := town.chore_for(p_purse, p_where, p_well);
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
  slot integer;
  has integer;
  pours integer;
  needs integer;
begin
  if what is null or hand is null then return town.no('none'); end if;
  if what = 'draw' then
    select (x.ord - 1)::int into slot from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) = 0 order by x.ord limit 1;
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well,
      'purse', town.spend(p_purse, (f->'chores'->>'draw')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water', (f->'buckets'->>hand)::int
          + (case when town.has_buff(p_purse, p_now, 'carry') then (town.wishing()->>'carry')::int else 0 end)))));
  end if;
  if what = 'pour' then
    -- as much of it as the well has room for; the rest stays in the bucket
    select (x.ord - 1)::int, (x.s->>'water')::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
     where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) <> 0 order by x.ord limit 1;
    pours := least(has, (f->>'well')::int - p_well);
    return jsonb_build_object('ok', true, 'chore', what, 'well', p_well + pours,
      'purse', town.spend(p_purse, (f->'chores'->>'pour')::double precision, p_now)
        || jsonb_build_object('bag', jsonb_set(bag, array[slot::text],
             case when has > pours then jsonb_build_object('item', hand, 'n', 1, 'water', has - pours) else jsonb_build_object('item', hand, 'n', 1) end)));
  end if;
  -- a can's filling takes so many bucketfuls of the well's water (the catalog's `fill`; one where it says none), however
  -- much was left in the can. A well that has fewer gives what it has, and the can so much of a filling more
  if p_well < 1 then return town.no('dry'); end if;
  -- ── the older tools (v174): with a forged can of this kind in the bag, the filling is lib/town/farm's as it reads it ──
  if town.bag_forged(bag, hand) then return town.fill_with(p_purse, hand, p_well, p_now); end if;
  select (x.ord - 1)::int, coalesce((x.s->>'water')::numeric, 0)::int into slot, has from jsonb_array_elements(bag) with ordinality x(s, ord)
   where x.s->>'item' = hand and coalesce((x.s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric order by x.ord limit 1;
  needs := greatest(1, coalesce((f->>'fill')::int, 1));
  pours := least(needs, p_well);
  return jsonb_build_object('ok', true, 'chore', what, 'well', p_well - pours,
    'purse', town.spend(p_purse, (f->'chores'->>'fill')::double precision, p_now)
      || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], jsonb_build_object('item', hand, 'n', 1, 'water',
           case when pours >= needs then (f->'cans'->>hand)::int
                else least((f->'cans'->>hand)::int, has + floor((f->'cans'->>hand)::numeric * pours / needs)::int) end))));
end;
$$;
-- </town.chore>

-- <town.chore_for>
create or replace function town.chore_for(p_purse jsonb, p_where text, p_well integer)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bag jsonb := p_purse->'bag';
begin
  if hand is null then return null; end if;
  if f->'buckets' ? hand then
    if p_where = 'river' and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) = 0) then return 'draw'; end if;
    if p_where = 'well' and p_well < (f->>'well')::int
       and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) <> 0) then return 'pour'; end if;
  end if;
  -- ── the older tools (v174): with a forged can of this kind in the bag, a can is full at what it holds as the stack it is ──
  if p_where = 'well' and f->'cans' ? hand and town.bag_forged(bag, hand) then
    return case when exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) < town.can_holds(s)) then 'fill' end;
  end if;
  -- ── the older tools (v174): its end ──
  if p_where = 'well' and f->'cans' ? hand
     and exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) < (f->'cans'->>hand)::numeric) then return 'fill'; end if;
  return null;
end;
$$;
-- </town.chore_for>

-- <town.pour_for>
create or replace function town.pour_for(p_at text, p_keys jsonb, p_plots jsonb, p_purse jsonb, p_me text, p_now bigint, p_owner text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  hand text := town.hand_of(p_purse);
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  reach integer;
  row_ jsonb;
begin
  if p_at is null or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_at) or not town.wearing(p_purse, 'charmGloves') then return '[]'::jsonb; end if;
  if not town.theirs_at(p_plots->p_at, p_owner, p_me)
     or town.deed_for(p_at, coalesce(p_plots->p_at, wild), hand, p_me, p_now, p_owner) is distinct from 'water' then return '[]'::jsonb; end if;
  -- (each plant takes a watering out of the can, as ever: but under the fountain's blessing, which spares the can)
  reach := case when town.has_buff(p_purse, p_now, 'spring')
      -- ── the older tools (v174): or under lib/town/farm's canFullNow ──
      or town.can_full_now(p_purse, p_now) then jsonb_array_length(p_keys)
    else floor((select coalesce(sum(coalesce((s.v->>'water')::numeric, 0)), 0) from jsonb_array_elements(p_purse->'bag') as s(v) where s.v->>'item' = hand))::integer end;
  select jsonb_agg(q.key_ order by q.x) into row_
    from (
      select k.key_, split_part(k.key_, ',', 1)::integer as x
        from jsonb_array_elements_text(p_keys) as k(key_)
       where town.theirs_at(p_plots->k.key_, p_owner, p_me)
         and town.deed_for(k.key_, coalesce(p_plots->k.key_, wild), hand, p_me, p_now, p_owner) = 'water'
       order by x
       limit greatest(0, reach)
    ) q;
  if row_ is null or jsonb_array_length(row_) < 2 then return '[]'::jsonb; end if;
  return row_;
end;
$$;
-- </town.pour_for>

-- <public.town_tend>
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb DEFAULT NULL::jsonb, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
  -- ── the older tools (v174): the plots of the row as they stood, what the deed did beside its own plot, those plots as they are kept, and one of them ──
  row_ jsonb;
  more_ jsonb;
  also_ jsonb;
  k_ text;
  beside_ jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): the plot with its `damp`, where it has one ──
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- ── the older tools (v174): what the lines of work read of a forged can (nothing, of any other) ──
        || town.kind_doc(purse, did->>'deed', plot, me::text)
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
  end if;
  -- ── the older tools (v174): what a deed done with a forged hoe or can does to the plots beside its own: plots of this row of this bed, which is held whole above; each is kept as the deed's own was, and none is a deed of its own ──
  if did->>'deed' in ('clear', 'till', 'water') and purse->>'hand' in ('hoe', 'can') and town.bag_forged(purse->'bag', purse->>'hand') and town.forged(town.hand_stack(purse)) then
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into row_
      from public.town_plots p where p.bed = bed_n and p.y = p_y;
    more_ := town.beside(key, town.row_keys(p_x, p_y), row_ || jsonb_build_object(key, plot), did->>'deed', purse, after, me::text, now_,
      town.owner_of(keeping, others > 0 or coalesce(plot->'plant', 'null'::jsonb) <> 'null'::jsonb, now_));
    after := more_->'purse';
    for k_ in select o.key from jsonb_each(more_->'plots') o order by split_part(o.key, ',', 1)::integer loop
      beside_ := more_->'plots'->k_;
      if did->>'deed' = 'water' and row_ ? k_ then
        beside_ := town.poured_as(row_->k_, beside_, now_, town.hot(now_), town.well_kind(now_), me::text, 1, wears);
      end if;
      insert into public.town_plots (x, y, bed, soil, plant, changed)
        values (split_part(k_, ',', 1)::integer, split_part(k_, ',', 2)::integer, bed_n, beside_->>'soil', nullif(beside_->'plant', 'null'::jsonb), now_)
        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
      also_ := coalesce(also_, '{}'::jsonb) || jsonb_build_object(k_, beside_);
    end loop;
  end if;
  -- ── the older tools (v174): its end ──
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then
    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;
  end if;
  -- ── the older tools (v174): its end ──
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses)
    -- ── the older tools (v174): the plots beside it that the deed changed, by their keys and as they are kept ──
    || case when also_ is not null then jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_) else '{}'::jsonb end;
end;
$$;
-- </public.town_tend>

-- <public.town_row>
create or replace function public.town_row(p_x integer, p_y integer, p_marks jsonb DEFAULT NULL::jsonb, p_timing jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  -- what the browser says of its game: how each plot's beat went, and three numbers of the whole
  marks jsonb := coalesce(town.claims(p_marks), '{}'::jsonb);
  claims jsonb := town.timing_said(p_timing);
  plots jsonb;
  keeping jsonb;
  rest integer;
  holds integer;
  did jsonb;
  n integer;
  e jsonb;
  v_x integer;
  v_y integer;
begin
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): each plot with its `damp`, where it has one ──
  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into plots
    from public.town_plots p where p.bed = bed_n and p.y = p_y;
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into rest from public.town_plots p where p.bed = bed_n and p.plant is not null and p.y <> p_y;
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.row_tend(key, town.row_keys(p_x, p_y), plots, keeping, rest, holds, purse, me::text, now_, marks);
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  n := jsonb_array_length(did->'each');
  -- the row, whole: which work, how many plots of it were done, and how the browser said its game went
  perform town.note(me, 'row', town.hand_of(purse), n, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'deed', did->>'deed', 'marks', marks, 'claims', claims));
  -- and each plot done, its own deed: written down as town_tend writes it, so that each earns its points
  for e in select t.x from jsonb_array_elements(did->'each') with ordinality as t(x, ord) order by t.ord loop
    v_x := split_part(e->>'key', ',', 1)::integer;
    v_y := split_part(e->>'key', ',', 2)::integer;
    if did->>'deed' in ('clear', 'till') then
      perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0) / n, town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
        jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(v_x, v_y), 'need', 1, 'misses', 0, 'row', true));
    else
      -- (everything else is a deed of its own, as town_tend writes it: the plant, how many, the tile, the thing in the hand)
      perform town.note(me, did->>'deed', e->>'crop', (e->>'n')::numeric, 0,
        jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)
          || case when e ? 'well' then jsonb_build_object('well', e->'well') else '{}'::jsonb end);
    end if;
    insert into public.town_plots (x, y, bed, soil, plant, changed)
      values (v_x, v_y, bed_n, did->'plots'->(e->>'key')->>'soil', nullif(did->'plots'->(e->>'key')->'plant', 'null'::jsonb), now_)
      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
    -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then
      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;
    end if;
    -- ── the older tools (v174): its end ──
  end loop;
  if n > 0 then
    perform town.keep_purse(me, did->'purse');
    if did ? 'bed' then
      insert into public.town_beds (bed, member_id, tended, empty)
        values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
        on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
    else
      delete from public.town_beds b where b.bed = bed_n;
    end if;
  end if;
  return town.answer(me, did - 'plots' - 'bed' - 'each')
    || jsonb_build_object('key', key, 'plots', did->'plots', 'bed', town.bed_told(bed_n),
         'done', (select coalesce(jsonb_agg(t.x->'key' order by t.ord), '[]'::jsonb) from jsonb_array_elements(did->'each') with ordinality as t(x, ord)));
end;
$$;
-- </public.town_row>

-- <public.town_farm>
create or replace function public.town_farm(p_since bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  since bigint := greatest(coalesce(p_since, 0), 0) - 10000;
begin
  -- (somebody is looking at the farm: this hour of the pests' is counted, if it has not been)
  perform town.swarm_note(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'swarms', town.swarms_told(since),
    'well', town.thing('well', false),
    -- ── the older tools (v174): each plot with its `damp`, where it has one ──
    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb)
                from public.town_plots p where p.changed > since),
    'beds', (select coalesce(jsonb_object_agg(b.bed::text, town.bed_told(b.bed)), '{}'::jsonb) from public.town_beds b));
end;
$$;
-- </public.town_farm>

-- <town.work_counts_of>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      -- ── the older tools (v174): what a watering's deed says of a forged can, never more than the option's own number ──
      if what = 'water' and jsonb_typeof(doc->'kind') = 'number' and (doc->>'kind')::numeric > 0 then
        return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw',
          (l->'helpers'->>what)::numeric + least(town.opt_n('cnKind', 'points')::numeric, floor((doc->>'kind')::numeric))));
      end if;
      -- ── the older tools (v174): its end ──
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──
  if what = 'bellows' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the blacksmith (v174): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;
-- </town.work_counts_of>

-- the insects
-- <town.net>
create or replace function town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
  -- ── the older tools (v174): the forged net in the hand, the catch's end with it, and what its reader adds to the bound a catch is told far by ──
  tool_ jsonb;
  more_ jsonb;
  far_ double precision := town.net_more_far(p_purse);
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
           <= (ins->'net'->>'reach')::double precision + far_ + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', p_haunt, (p_has->>'turn')::bigint, p_now), p_now);
    return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, more_->'purse', id, n, p_x, p_y, p_now),
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)), id, n, p_x, p_y, p_now),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;
-- </town.net>

-- <town.net_mine>
create or replace function town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse) + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
  -- ── the older tools (v174): the forged net in the hand, and the catch's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);
    after_ := more_->'purse';
    return jsonb_build_object('ok', true,
      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
        else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;
-- </town.net_mine>

-- <town.comeback>
create or replace function town.comeback(p_haunt integer, p_now bigint, p_backs jsonb, p_r1 double precision, p_r2 double precision, p_r3 double precision, p_cat jsonb DEFAULT NULL::jsonb, p_word text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  ins jsonb := coalesce(p_cat, town.cat('insects'));
  word text := coalesce(p_word, town.word());
  whence jsonb := ins->'haunts'->p_haunt;
  at_ bigint := p_now + (ins->'comeback'->>'after')::bigint * 1000;
  least_ bigint := (ins->'comeback'->>'least')::bigint * 1000;
  ids jsonb := ins->'order';
  backs jsonb := coalesce(p_backs, '[]'::jsonb);
  free integer[] := '{}';
  turns bigint[] := '{}';
  begins bigint[] := '{}';
  h jsonb;
  kind jsonb;
  bug jsonb;
  every bigint;
  phase bigint;
  turn bigint;
  began bigint;
  some_ boolean;
  n integer;
  nth integer;
  i integer;
  j integer;
  total double precision := 0;
  left_ double precision;
  pick text := null;
  lo integer;
  hi integer;
  w double precision;
  -- ── the older tools (v174): what the row it is handed says of the kinds it names as rare (nothing: every weight as it is) ──
  rarer_ double precision := (ins->>'rarer')::double precision;
begin
  if p_haunt is null or p_haunt < 0 or whence is null then return null; end if;
  for i in 0..jsonb_array_length(ins->'haunts') - 1 loop
    h := ins->'haunts'->i;
    continue when i = p_haunt or h->>1 <> whence->>1;
    kind := ins->'kinds'->(h->>0);
    every := (kind->>'every')::bigint * 60000;
    phase := floor(town.roll('bugphase', i) * (kind->>'every')::double precision)::bigint * 60000;
    turn := floor((at_ + phase)::numeric / every)::bigint;
    began := turn * every - phase;
    continue when began + every - at_ < least_;
    continue when town.bug_at(i, at_, ins, word) is not null;
    continue when exists (select 1 from jsonb_array_elements(backs) x where (x->>'haunt')::int = i and (x->>'turn')::bigint = turn);
    some_ := false;
    for j in 0..jsonb_array_length(ids) - 1 loop
      bug := ins->'bugs'->(ids->>j);
      if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, began, word) then some_ := true; exit; end if;
    end loop;
    continue when not some_;
    free := free || i;
    turns := turns || turn;
    begins := begins || began;
  end loop;
  n := coalesce(array_length(free, 1), 0);
  if n = 0 then return null; end if;
  nth := least(n - 1, greatest(0, floor(coalesce(p_r1, 0) * n)::int)) + 1;
  i := free[nth];
  h := ins->'haunts'->i;
  -- the insect: by that haunt's own weights, as its own turn would roll it
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    -- ── the older tools (v174): a weight, as the row handed says it ──
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? (ids->>j), false) then rarer_ else 1::double precision end; end if;
  end loop;
  left_ := least(0.999999::double precision, greatest(0::double precision, coalesce(p_r2, 0))) * total;
  for j in 0..jsonb_array_length(ids) - 1 loop
    bug := ins->'bugs'->(ids->>j);
    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then
      pick := ids->>j;
      -- ── the older tools (v174): the same weight ──
      left_ := left_ - (bug->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? (ids->>j), false) then rarer_ else 1::double precision end;
      exit when left_ < 0;
    end if;
  end loop;
  -- hunted, it is back less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is at the catch. Nothing takes its place.
  -- ── the older tools (v174): the same weight ──
  w := (ins->'bugs'->pick->>'weight')::double precision * case when rarer_ is not null and coalesce(ins->'rare' ? pick, false) then rarer_ else 1::double precision end;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, p_now, ins) then return null; end if;
  lo := (ins->'bugs'->pick->'n'->>0)::int;
  hi := (ins->'bugs'->pick->'n'->>1)::int;
  return jsonb_build_object('haunt', i, 'turn', turns[nth], 'bug', pick,
    'n', lo + least(hi - lo, greatest(0, floor(coalesce(p_r3, 0) * (hi - lo + 1))::int)), 'from', at_);
end;
$$;
-- </town.comeback>

-- <public.town_net>
create or replace function public.town_net(p_haunt integer, p_x integer, p_y integer, p_misses numeric DEFAULT 0, p_by uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  now_ bigint := town.now_ms();
  ins jsonb := town.cat('insects');
  misses double precision := least(greatest(0, floor(coalesce(p_misses, 0))), 30);
  h jsonb;
  has jsonb;
  t jsonb;
  lure text := null;
  did jsonb;
  book jsonb;
  bug text;
  is_first boolean := false;
  rid text := null;
  rid_x integer;
  rid_y integer;
  rid_soil text;
  rid_plant jsonb;
  backs jsonb;
  back jsonb := null;
begin
  if p_haunt is null or p_haunt < 0 or p_haunt >= jsonb_array_length(ins->'haunts') then return town.answer(me, town.no('none')); end if;
  h := ins->'haunts'->p_haunt;
  perform pg_advisory_xact_lock(hashtext('town:haunt:' || p_haunt::text));
  backs := town.backs_now(now_);
  has := town.bug_for(town.wearing(purse, 'charmCloak'), p_haunt, now_, backs);
  t := town.taken('haunt', p_haunt, coalesce((has->>'turn')::bigint, 0), me);
  if p_by is not null and p_by <> me and town.is_member(p_by) then
    select town.hand_of(pp.doc) into lure from public.town_purses pp where pp.member_id = p_by;
  end if;
  did := town.net(purse, p_haunt, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, now_, lure);
  if (did->>'ok')::boolean then
    bug := has->>'bug';
    perform town.keep_purse(me, did->'purse');
    insert into public.town_takes (what, place, turn, member_id, at) values ('haunt', p_haunt, (has->>'turn')::bigint, me, to_timestamp(now_ / 1000.0));
    -- caught, it is gone for everybody (a haunt's insect is one member's: its kind's `shares`). One that was the
    -- haunt's own comes back at another haunt of that map a little later (lib/town/insects.ts's comeback); one that
    -- had come back brings nothing back, so a map gives at most twice what its haunts roll
    if not coalesce((has->>'back')::boolean, false) then
      back := town.comeback(p_haunt, now_, backs, random(), random(), random(),
        -- ── the older tools (v174): the row as the forged net in the hand has it (null, the row as it is, with any other) ──
        town.net_cat(purse, ins));
      if back is not null then
        insert into public.town_comebacks (haunt, turn, bug, n, from_ms, by)
          values ((back->>'haunt')::int, (back->>'turn')::bigint, back->>'bug', (back->>'n')::int, (back->>'from')::bigint, me)
          on conflict (haunt, turn) do nothing;
        -- (somebody's catch at the same moment put one there first: this one brings none)
        if not found then back := null; end if;
      end if;
    end if;
    delete from public.town_comebacks c where c.from_ms < now_ - 6 * 3600000::bigint;
    -- the first of its kind caught in the village: written in the book, with who
    book := town.thing('bugs', true);
    if not book ? bug then
      is_first := true;
      perform town.keep_thing('bugs', book || jsonb_build_object(bug, jsonb_build_object('by', me, 'at', now_, 'name',
        (select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = me))));
    end if;
    -- a ladybird, now and then: some plant of the farm is rid of its pest, as a cure in the hand rids it
    -- (lib/town/insects.ts's pestToRid: one of the plots with a pest on them at this moment, whoever sowed it)
    if coalesce((ins->'bugs'->bug->>'rids')::double precision, 0) > 0 and random() < (ins->'bugs'->bug->>'rids')::double precision then
      rid := town.rid_pick((select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', p.plant)), '{}'::jsonb)
                              from public.town_plots p where p.plant is not null), now_, random());
      if rid is not null then
        rid_x := split_part(rid, ',', 1)::int;
        rid_y := split_part(rid, ',', 2)::int;
        -- (its bed held as a deed of the farm's holds it, so that a watering at the same moment is not lost; then the
        -- plot as it stands now: somebody may have cured it meanwhile)
        perform pg_advisory_xact_lock(hashtext('town.bed'), town.bed_of(rid_x, rid_y));
        select p.soil, p.plant into rid_soil, rid_plant from public.town_plots p where p.x = rid_x and p.y = rid_y for update;
        if rid_plant is not null and town.rid_pick(jsonb_build_object(rid, jsonb_build_object('soil', rid_soil, 'plant', rid_plant)), now_, 0) is not null then
          rid_plant := rid_plant || jsonb_build_object('cured', now_);
          update public.town_plots set plant = rid_plant, changed = now_ where x = rid_x and y = rid_y;
        else
          rid := null;
        end if;
      end if;
    end if;
    perform town.note(me, 'net', bug, (has->>'n')::numeric, 0, jsonb_build_object(
      'haunt', p_haunt, 'kind', h->>0, 'map', h->>1, 'tile', jsonb_build_array(p_x, p_y), 'misses', misses, 'spent', town.stamina_of(purse, now_) <= 0, 'first', is_first)
      || case when lure is not null then jsonb_build_object('lure', lure, 'by', p_by) else '{}'::jsonb end
      || case when rid is not null then jsonb_build_object('rid', rid, 'whose', rid_plant->>'by') else '{}'::jsonb end
      || case when coalesce((has->>'back')::boolean, false) then jsonb_build_object('back', true) else '{}'::jsonb end
      || case when coalesce((has->>'cloak')::boolean, false) then jsonb_build_object('cloak', true) else '{}'::jsonb end
      || case when back is not null then jsonb_build_object('next', (back->>'haunt')::int) else '{}'::jsonb end);
  end if;
  return town.answer(me, did) || jsonb_build_object('haunt', p_haunt, 'first', is_first)
    || case when rid is not null then jsonb_build_object('rid', rid, 'ridPlot', jsonb_build_object('soil', rid_soil, 'plant', rid_plant)) else '{}'::jsonb end
    || case when back is not null then jsonb_build_object('bugsAgain', (back->>'from')::bigint) else '{}'::jsonb end;
end;
$$;
-- </public.town_net>

-- the kitchen
-- <town.cook>
create or replace function town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb := town.tidy(p_things);
  kinds integer := jsonb_array_length(alls);
  crew_n integer := jsonb_array_length(p_crew);
  x jsonb;
  made text;
  t jsonb;
  short boolean;
  dish text;
  bag jsonb := p_purse->'bag';
  pot integer;
  spent jsonb;
  near jsonb;
  left_ integer;
  n integer;
  -- ── the older tools (v174): the forged cookware the pot is begun with, what it carries, and what the pot has of it ──
  mine_ jsonb;
  fx_ jsonb;
  more_ jsonb;
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  made := town.made_of(alls);
  if made is not null then
    t := town.takes(made);
    short := crew_n < (t->>'cooks')::int;
    if short or not town.in_hands(t->'in', p_crew) then
      -- somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if coalesce(p_purse->'made', '[]'::jsonb) ? made then
        return town.no(case when short or crew_n > 1 or jsonb_array_length(t->'in') > 1 then 'crew' else 'tool' end);
      end if;
      made := null;
    end if;
  end if;
  -- what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  dish := case when made is not null then (case when town.cat('dishes') ? made then made end)
               when jsonb_typeof(p_crew->0) = 'string' and ck->'cookware' ? (p_crew->>0) then ck->>'oddDish' end;
  for x in select v from jsonb_array_elements(alls) e(v) loop bag := town.take(bag, x->>0, (x->>1)::int); end loop;
  -- (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  if dish is not null then
    select (s.ord - 1)::int into pot from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
    if pot is null then return town.no('full'); end if;
  end if;
  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);
  -- ── the older tools (v174): forged cookware in the hand of whoever begins the pot, read once; and what it pays ──
  mine_ := town.cook_held(p_purse, p_crew);
  if mine_ is not null then
    fx_ := town.cook_fx(mine_);
    spent := town.tool_paid(p_purse, spent, p_now, mine_, fx_, 'ckFresh');
  end if;
  -- ── the older tools (v174): its end ──
  -- what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  if made is null then
    near := town.taste_of(alls, p_crew);
    if near->>'of' is not null and near->>'lacks' is not null and near->>'taste' in ('swap', 'less')
       and near->>'lacks' = (town.needs_of(near->>'of')->-1)->>0 then
      spent := spent || jsonb_build_object('tries', coalesce(spent->'tries', '{}'::jsonb)
        || jsonb_build_object(near->>'of', coalesce((spent->'tries'->>(near->>'of'))::int, 0) + 1));
    end if;
  end if;
  if dish is not null then
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    -- ── the older tools (v174): what the pot has of forged cookware, and what that counts ──
    if mine_ is not null then
      more_ := town.cook_more(spent, mine_, fx_, made is not null, town.luck_of('helping', p_now, kinds), p_now);
      spent := more_->'purse';
      left_ := left_ + (more_->>'more')::integer;
    end if;
    -- ── the older tools (v174): its end ──
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_))
          -- ── the older tools (v174): with what it carries from its cookware (nothing, of any other) ──
          || coalesce(more_->'marks', '{}'::jsonb))))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  if town.room(bag, made) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put(bag, made, n)));
end;
$$;
-- </town.cook>

-- <town.set_down>
create or replace function town.set_down(p_purse jsonb, p_slot integer, p_me text, p_at jsonb, p_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $$
declare
  s jsonb := case when p_slot is null or p_slot < 0 then null else p_purse->'bag'->p_slot end;
begin
  if s is null or s = 'null'::jsonb or s->>'item' <> 'potFull' or coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb then return town.no('none'); end if;
  return jsonb_build_object('ok', true,
    'pot', jsonb_build_object('id', p_id, 'by', p_me, 'dish', s->'of'->'dish', 'left', s->'of'->'left', 'at', p_at)
      || case when town.held(p_purse->'bag', 'tok') > 0 then '{"tok": true}'::jsonb else '{}'::jsonb end
      -- ── the older tools (v174): with what the pot carries from its cookware ──
      || town.pot_marks(s),
    'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[p_slot::text], 'null'::jsonb)));
end;
$$;
-- </town.set_down>

-- <town.take_up>
create or replace function town.take_up(p_purse jsonb, p_pot jsonb, p_me text)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $$
declare
  slot integer;
begin
  if not coalesce(town.may_take(p_pot, p_me), false) or (p_pot->>'left')::numeric < 1 then return town.no('none'); end if;
  select (s.ord - 1)::int into slot from jsonb_array_elements(p_purse->'bag') with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
  if slot is null then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('bag', jsonb_set(p_purse->'bag', array[slot::text],
    jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', p_pot->'dish', 'left', p_pot->'left'))
      -- ── the older tools (v174): with what the pot carries from its cookware ──
      || town.pot_marks(p_pot))));
end;
$$;
-- </town.take_up>

-- <town.feast_eat>
create or replace function town.feast_eat(p_purse jsonb, p_pot jsonb, p_seated boolean, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  left_ numeric := (p_pot->>'left')::numeric;
  meal jsonb;
begin
  if not coalesce((p_pot->>'feast')::boolean, false) or left_ < 1 then return town.no('none'); end if;
  if not coalesce(p_seated, false) then return town.no('stand'); end if;
  if coalesce(p_purse->'eating', 'null'::jsonb) <> 'null'::jsonb
     or (town.bowls_today(p_purse, p_now)->>town.meal_of(p_now))::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;
  meal := town.begun(p_purse, p_pot->>'dish', p_now);
  return jsonb_build_object('ok', true, 'dish', p_pot->'dish',
    'pot', case when left_ > 1 then p_pot || jsonb_build_object('left', left_ - 1) else 'null'::jsonb end,
    'purse', p_purse || meal || jsonb_build_object('eating', (meal->'eating') || '{"lent": true}'::jsonb
      -- ── the older tools (v174): with what the pot carries from its cookware ──
      || town.pot_marks(p_pot)));
end;
$$;
-- </town.feast_eat>

-- <town.chew>
create or replace function town.chew(p_purse jsonb, p_company double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
declare
  e jsonb := coalesce(p_purse->'eating', 'null'::jsonb);
  st jsonb := town.cat('stamina');
  whole bigint;
  ends bigint;
  till bigint;
  dish jsonb;
  gain double precision;
  done boolean;
  after jsonb;
begin
  if e = 'null'::jsonb then return jsonb_build_object('purse', p_purse, 'done', false); end if;
  whole := (st->>'minutes')::bigint * 60000;
  ends := (e->>'from')::bigint + whole;
  till := least(p_now, ends);
  dish := town.cat('dishes')->(e->>'dish');
  -- ── the older tools (v174): with what the helping carries from its pot (nothing, of any other) ──
  gain := ((dish->>'stamina')::double precision
      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)
    * (greatest(0, till - (e->>'till')::bigint)::double precision / whole::double precision)
    * (1::double precision + (st->>'together')::double precision * least((st->>'company')::int, greatest(0, floor(p_company)::int)));
  done := p_now >= ends;
  after := p_purse || jsonb_build_object(
    'stamina', jsonb_build_object('day', town.day_of(p_now), 'left', least((st->>'max')::double precision, town.stamina_of(p_purse, p_now) + gain)),
    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)
    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;
  -- ── the older tools (v174): and what it carries for the buff its dish leaves ──
  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then
    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');
  end if;
  -- ── the older tools (v174): its end ──
  if not done then return jsonb_build_object('done', false, 'purse', after); end if;
  return jsonb_build_object('done', true, 'purse',
    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)
    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));
end;
$$;
-- </town.chew>

-- <town.pot_doc>
create or replace function town.pot_doc(p_id bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$
  select jsonb_build_object('id', o.id::text, 'by', o.member_id, 'dish', o.dish, 'left', o.helpings, 'at', jsonb_build_array(o.x, o.y), 'set', o.set_at,
             'name', coalesce((select coalesce(p.character_name, p.display_name, p.discord_username, '') from public.profiles p where p.id = o.member_id), ''))
           || case when o.tok then '{"tok": true}'::jsonb else '{}'::jsonb end
           || case when o.feast then '{"feast": true}'::jsonb else '{}'::jsonb end
           -- ── the older tools (v174): with what it carries from its cookware ──
           || coalesce(o.marks, '{}'::jsonb)
    from public.town_pots o where o.id = p_id
$$;
-- </town.pot_doc>

-- <public.town_pot_down>
create or replace function public.town_pot_down(p_x integer, p_y integer, p_slot integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
declare
  me uuid := town.member();
  purse jsonb := town.purse_of(me, true);
  ck jsonb := town.cat('cooking');
  map jsonb := ck->'map';
  slot integer;
  did jsonb;
  new_id bigint;
  feast_ boolean;
begin
  if p_x is null or p_y is null or not (
       (p_x >= 0 and p_y >= 0 and p_x < (map->'town'->>0)::int and p_y < (map->'town'->>1)::int)
    or (p_x >= (map->'farm'->>0)::int and p_y >= (map->'farm'->>1)::int
        and p_x < (map->'farm'->>0)::int + (map->'farm'->>2)::int and p_y < (map->'farm'->>1)::int + (map->'farm'->>3)::int)) then
    return town.answer(me, town.no('none'));
  end if;
  perform town.pots_tidy(town.now_ms());
  -- (the pot in the slot that is said; with none said, the first pot of food the bag has, as it was before v158)
  if p_slot is not null then slot := p_slot;
  else select (s.ord - 1)::int into slot from jsonb_array_elements(purse->'bag') with ordinality s(v, ord) where s.v->>'item' = 'potFull' order by s.ord limit 1; end if;
  did := town.set_down(purse, coalesce(slot, -1), me::text, jsonb_build_array(p_x, p_y), '');
  if not (did->>'ok')::boolean then return town.answer(me, did); end if;
  -- (a dish set down in the cooking yard is on the feast table; the odd dish, and anything set down elsewhere, on the ground)
  feast_ := town.on_yard(p_x, p_y) and did->'pot'->>'dish' <> ck->>'oddDish';
  if not feast_ and exists (select 1 from public.town_pots o where not o.feast and abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;
  if (select count(*) from public.town_pots o where o.member_id = me and o.feast = feast_)
     >= (case when feast_ then ck->'feast'->>'pots' else ck->>'pots' end)::int then return town.answer(me, town.no('many')); end if;
  -- (on the ground, one to a tile: of two set down on the same tile at once, the second finds it taken)
  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at, feast)
    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int,
            case when feast_ then (ck->'feast'->'tile'->>0)::int else p_x end, case when feast_ then (ck->'feast'->'tile'->>1)::int else p_y end,
            not feast_ and coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms(), feast_)
    on conflict (x, y) where not feast do nothing returning id into new_id;
  if new_id is null then return town.answer(me, town.no('taken')); end if;
  -- ── the older tools (v174): what the pot carries from its cookware is kept on its row ──
  if town.pot_marks(did->'pot') <> '{}'::jsonb then update public.town_pots set marks = town.pot_marks(did->'pot') where id = new_id; end if;
  perform town.keep_purse(me, did->'purse');
  perform town.note(me, 'pot_down', did->'pot'->>'dish', (did->'pot'->>'left')::numeric, 0,
    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id) || case when feast_ then '{"feast": true}'::jsonb else '{}'::jsonb end);
  return town.answer(me, did - 'pot') || jsonb_build_object('pot', town.pot_doc(new_id));
end;
$$;
-- </public.town_pot_down>

-- ─── Who may ─────────────────────────────────────────────────────────────
-- (No function a member calls is new here: each of those written again keeps who may call it, as `create or replace`
-- keeps it. The rules of schema `town` are nobody's to call.)

revoke execute on all functions in schema town from public, anon, authenticated;

-- ─── Nobody calls a rule of schema town ────────────────────────────────────────────────────────────────────────────

-- (each part says it of its own functions; once more here, after the last function the file makes)
revoke execute on all functions in schema town from public, anon, authenticated;

notify pgrst, 'reload schema';

-- ─── What it should say afterwards ─────────────────────────────────────────────────────────────────────────────────
--
--   ── the whole file ──
--
--   -- (built closed)
--   select value from public.town_knobs where key = 'smith_open';
--   -- 0   (1 once its owner has opened it)
--
--   -- (nothing of the schema `town` is anybody's to call; the sixteen functions a member calls are there, each for the signed in and for nobody signed out)
--   select (select count(*) from pg_proc p where p.pronamespace = 'town'::regnamespace
--            and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))) as rules_a_browser_calls,
--          (select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prosecdef
--            and has_function_privilege('authenticated', p.oid, 'execute') and not has_function_privilege('anon', p.oid, 'execute')
--            and p.proname in ('town_smith_open', 'town_smith', 'town_smith_smelt', 'town_smith_take', 'town_smith_widen', 'town_smith_near', 'town_smith_bellows', 'town_smith_try',
--                              'town_smith_draw', 'town_smith_choose', 'town_smith_redraw', 'town_smith_gem', 'town_smith_move', 'town_fire_join', 'town_fire_leave', 'town_tool_power')) as a_members;
--   -- 0 | 16
--
--   -- (the two tables are closed: row level security on, no policy, nothing granted to a browser)
--   select c.relname, c.relrowsecurity as closed,
--          (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as policies,
--          (select count(*) from information_schema.role_table_grants g where g.table_schema = 'public' and g.table_name = c.relname and g.grantee in ('anon', 'authenticated')) as a_browsers
--     from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname in ('town_smiths', 'town_great_fire') order by 1;
--   -- town_great_fire | true | 0 | 0
--   -- town_smiths | true | 0 | 0
--
--   -- (the great fire has its one row and the village its board; the two columns are there)
--   select (select count(*) from public.town_great_fire) as fires, (select count(*) from public.town_things where key = 'smith') as boards,
--          (select count(*) from information_schema.columns where table_schema = 'public' and (table_name, column_name) in (('town_plots', 'damp'), ('town_pots', 'marks'))) as columns;
--   -- 1 | 1 | 2
--
--   -- (the catalog's three rows are the file's: the table asks the new pieces and timber of +5 to +9, and the rows have their new keys)
--   select (select string_agg((t->>'n') || '/' || (t->>'timber'), ' ' order by (t->>'to')::int) from jsonb_array_elements(c.data->'tries') t where (t->>'to')::int between 5 and 9) as pieces_and_timber,
--          c.data ? 'fire' and c.data ? 'timed' and c.data ? 'stand' and c.data ? 'old' as the_smiths_keys,
--          (select f.data ? 'nets' from public.town_catalog f where f.key = 'fishing') as fishing_nets, (select i.data ? 'rare' from public.town_catalog i where i.key = 'insects') as insects_rare
--     from public.town_catalog c where c.key = 'forge';
--   -- 3/12 5/12 6/15 9/15 12/18 | true | true | true
--
--   -- (the thirty functions that were there have their lines: thirty carry a mark of this file's, and `town.work_counts_of` carries both parts')
--   select count(*) as marked,
--          bool_or(p.oid = 'town.work_counts_of(jsonb, text)'::regprocedure and p.prosrc like '%the blacksmith (v174)%' and p.prosrc like '%the older tools (v174)%') as counted_by_both
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname in ('town', 'public')
--      and (p.prosrc like '%the forge''s great fire (v174)%' or p.prosrc like '%the blacksmith (v174)%' or p.prosrc like '%the older tools (v174)%');
--   -- 30 | true
--
--   -- (what earlier files put into those functions is still there: the woodcutters' and the miners' blocks, the words of the bridge, the lamps and the mountain; and the smith's deeds have words)
--   select position('the mountain''s trees (v164)' in w.def) > 0 and position('the mountain''s rocks (v164)' in w.def) > 0 as the_mountain_counted,
--          town.deed_th('stone_lay') <> 'stone_lay' and town.deed_th('lamp_light') <> 'lamp_light' and town.deed_th('fell') <> 'fell' and town.deed_th('mine') <> 'mine' as the_words_before,
--          town.deed_th('forge') <> 'forge' and town.deed_th('fire_found') <> 'fire_found' as the_smiths_words
--     from (select pg_get_functiondef('town.work_counts_of(jsonb, text)'::regprocedure) as def) w;
--   -- true | true | true
--
--   -- (the rule of felling, which this file does not write, has v172's and v173's blocks still; and the pot's rule asks v171's question still)
--   select position('v172:' in f.src) > 0 and position('v173:' in f.src) > 0 as felling_as_it_was, position('putIn' in k.src) > 0 as the_pots_question
--     from (select p.prosrc as src from pg_proc p where p.oid = 'town.fell(jsonb, jsonb, text, jsonb, integer, integer, bigint, jsonb, text)'::regprocedure) f,
--          (select p.prosrc as src from pg_proc p where p.oid = 'town.cook(jsonb, jsonb, jsonb, double precision, bigint)'::regprocedure) k;
--   -- true | true
--
--   -- (a net as it was bought is read as nothing more; and nothing has been done at the smith yet)
--   select town.net_more_far('{"hand": "bugNet", "handAt": 0, "bag": [{"item": "bugNet", "n": 1}]}'::jsonb) as a_bought_nets_more,
--          (select count(*) from public.town_smiths) as smithies,
--          (select count(*) from public.town_deeds d where d.what in ('smelt', 'smelted', 'smith_wider', 'bellows', 'forge', 'forge_draw', 'forge_choose', 'forge_redraw',
--                                                                   'forge_first', 'gem_set', 'forge_move', 'fire_found', 'fire_join', 'fire_leave')) as the_smiths_deeds;
--   -- 0 | 0 | 0   (the last two until an admin has tried him)
--
-- ─── Reading it ──────────────────────────────────────────────────────────────────────────────────────────────────
--
--   -- whether the smith is open, and since when his knob has stood as it does
--   select value, updated_at from public.town_knobs where key = 'smith_open';
--
--   -- the smith's deeds and the great fire's, a day at a time
--   select (d.at at time zone 'Asia/Bangkok')::date as day, d.what, count(*), -sum(d.coins) as coins_gone, count(distinct d.member_id) as members
--     from public.town_deeds d
--    where d.what in ('smelt', 'smelted', 'smith_wider', 'bellows', 'forge', 'forge_draw', 'forge_choose', 'forge_redraw', 'forge_first', 'gem_set', 'forge_move', 'fire_found', 'fire_join', 'fire_leave', 'power')
--    group by 1, 2 order by 1 desc, 2 limit 120;
--
--   -- the great fire's own row (its owner's to read: no page is told when its halves can next be found)
--   select doc, updated_at from public.town_great_fire;
--
--   -- the forged tools in members' bags, by kind and level
--   select s.v->>'item' as tool, (s.v->>'plus')::numeric as plus, count(*) as tools
--     from public.town_purses p, jsonb_array_elements(p.doc->'bag') s(v)
--    where jsonb_typeof(s.v) = 'object' and jsonb_typeof(s.v->'plus') = 'number' and (s.v->>'plus')::numeric > 0 group by 1, 2 order by 1, 2;
--
--   -- the plots that are damp and the pots that carry something (the two columns this file adds)
--   select (select count(*) from public.town_plots where damp) as damp_plots, (select count(*) from public.town_pots where marks is not null) as marked_pots;
--
--   ── the blacksmith, and the forge's great fire ──
--
--   -- every try of the last day, by the level tried for: how many, and how they went beside the table's shares
--   select (d.doc->>'to')::int as tried_for, count(*) as tries,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'taken') / count(*), 1) as taken,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'stays') / count(*), 1) as stays,
--          round(100.0 * count(*) filter (where d.doc->>'out' = 'down') / count(*), 1) as down,
--          min((t.v->>'take') || ' / ' || (t.v->>'stay') || ' / ' || (t.v->>'down')) as the_table,
--          -sum(d.coins) as coins_paid
--     from public.town_deeds d left join lateral jsonb_array_elements(town.cat('forge')->'tries') t(v) on t.v->>'to' = d.doc->>'to'
--    where d.what = 'forge' and d.at > now() - interval '1 day' group by d.doc->>'to' order by 1;
--
--   -- who has what at the smith: pieces done and waiting, smelting, how wide the queue is, a draw waiting
--   select p.character_name, jsonb_array_length(v.view->'done') as done, (v.view->'now'->>'piece') as smelting, jsonb_array_length(v.view->'waiting') as waiting,
--          v.view->>'places' as places, s.doc->'pending' as draw_waiting, s.updated_at
--     from public.town_smiths s join public.profiles p on p.id = s.member_id, lateral (select town.smith_view(town.smithy_sound(s.doc), town.now_ms()) as view) v
--    order by s.updated_at desc;
--
--   -- the board, and the great fire as a page is told it (its own row is the owner's to read: select doc from public.town_great_fire)
--   select town.board_sound(town.thing('smith', false)), town.fire_told(town.fire_kept(false), '', town.now_ms());
--
--   -- what the smith's deeds took out of the game, by the day and the deed
--   select date_trunc('day', d.at at time zone 'Asia/Bangkok') as day, d.what, count(*) as deeds, -sum(d.coins) as coins_gone
--     from public.town_deeds d where d.what in ('smelt', 'smith_wider', 'forge', 'forge_redraw', 'gem_set', 'forge_move') group by 1, 2 order by 1 desc, 2;
