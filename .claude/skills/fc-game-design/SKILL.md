---
name: fc-game-design
description: Game design and player psychology for turning the Cafe And SHabu FC site into a game where every member is a player, and for Cash Town later. Covers core loops, motivation (self-determination, the kinds of fun, player types, flow), rewards and their ethics, progression, onboarding and returning players, social and cooperative mechanics, the popoto and gil economy (faucets, sinks, drop rates, pity), game feel, playtesting and reading the players. Use whenever a feature has rewards, points, levels, streaks, collections, quests, badges, odds, a currency, competition, events or mini-games; when tuning numbers like drop rates or prize chances; when asking why members do or don't use something; and for Thai requests like "ทำให้เหมือนเกม", "เกมมิฟิเคชัน", "จิตวิทยาผู้เล่น", "ระบบรางวัล", "อัตราดรอป", "ทำให้ติด", "ให้คนอยากกลับมา", "เศรษฐกิจในเกม", "มินิเกม".
---

# Game design for the FC site

The members already play a game together, FFXIV. They know good game design
when they feel it, and they recognise a cheap trick at once. This site is the
FC's second home, and the goal is for it to feel like a game: every member a
player, every visit a small adventure, and the FC the party. The game should
be one that leaves people **happier and closer**, not merely hooked.

Two things make this site different from a commercial game, and they shape
every decision:

- **The players are friends, and the designers know them.** There are about
  500 characters, 160 of them active. Designing for engagement metrics at the
  cost of wellbeing would be designing against people the FC eats dinner
  with in Eorzea.
- **Real value moves.** Gil prizes are handed over in person by Aqua, and
  popoto are gratitude between real people. Anything that turns gratitude
  into farming, or a draw into gambling, damages the thing it was built on.

## How to use this skill

- **Shaping a mechanic** (a reward, a quest, a collection, an event, a
  mini-game): follow "Design a mechanic" below, and return the one-pager.
- **Reviewing a feature** that has points, odds, streaks or competition: go
  through "The review" below.
- **Tuning numbers** (drop rates, prize chances, caps, pacing): use the
  `scripts/odds.mjs` calculator and [references/economy.md](references/economy.md).
- **Asking why** members do or don't do something: see
  [references/playtest-and-metrics.md](references/playtest-and-metrics.md).

Read the references as needed:

- [references/frameworks.md](references/frameworks.md): MDA, the kinds of
  fun, self-determination, player motivations, flow, loops, progression.
- [references/psychology.md](references/psychology.md): about 25 principles,
  each with "use it here" and "don't abuse it", and the dark patterns we
  refuse.
- [references/economy.md](references/economy.md): the currencies here,
  faucets and sinks, why reputation must never be spendable, drop-rate maths,
  pity, anti-farming.
- [references/site-as-game.md](references/site-as-game.md): the site mapped
  into game terms, what a game would have that the site lacks, and how to
  add it without breaking what works.
- [references/playtest-and-metrics.md](references/playtest-and-metrics.md):
  testing with a small community, the few numbers worth watching, and the
  read-only queries for them.

Related skills: **fc-ideas** finds and scores ideas; this skill shapes the
mechanics inside them. **fc-ui** makes them feel good (the "juice").
**fc-migration** puts the tuning knobs in the database. **fc-security**
keeps the economy fair. **fc-cash-town** is the future virtual town.

## Design a mechanic

1. **Name the player fantasy and the feeling.**
   - The fantasy: "I'm the chef whose kitchen everyone visits."
   - The target feelings: pick one or two of the kinds of fun
     (frameworks.md), such as fellowship and expression.
2. **Name the need it feeds.** Which of autonomy, competence or relatedness?
   If none, it is decoration.
3. **Draw the loop:** the action, then the feedback, then the reward, then
   the reason to come back. Mark it micro (seconds), meso (a session or a
   day) or macro (weeks or a season). Connect it to an existing loop (the
   daily popoto, the party finder, the festival contests) rather than
   starting a separate one nobody visits.
4. **Choose the rewards on purpose.**
   - Prefer the intrinsic ones: mastery, expression, being seen by friends.
   - Use extrinsic rewards (gil, draws, badges) to celebrate, not to bribe.
   - Before attaching a prize to a social act, check the overjustification
     risk (psychology.md).
5. **Check the economy.** What does it add (a faucet) and what removes it (a
   sink)? Could it inflate, or be farmed by two friends swapping? Separate
   reputation from currency (economy.md).
6. **Pace it.** Run `node .claude/skills/fc-game-design/scripts/odds.mjs`
   on any chance-based reward, and say when the median member and the
   unlucky tenth meet each outcome.
7. **Stress-test it against the players:**
   - a newcomer on day 1;
   - a casual who visits twice a week;
   - a member on vacation coming back;
   - the most competitive member;
   - someone who wants to cheat;
   - someone having a bad week.

   Nobody should feel shamed, left behind, or punished for having a life.
8. **Put the knobs in the database** (like `popoto_rare_switch`), so admins
   tune it without a deploy.
9. **Plan the playtest and the signal** (playtest-and-metrics.md): what we
   will look at after two weeks, and what result would make us change it.

## The review

**Motivation**
- [ ] Does it serve autonomy, competence or relatedness, and can you say
      which?
- [ ] Is it fun without the reward? Would people still do it if the prize
      disappeared?
- [ ] Are there several ways to be good (the eight playstyle boards are the
      model)?

**Fairness and the economy**
- [ ] The odds are visible, outcomes are decided by the database, and the
      same rules apply to everyone.
- [ ] There is a cap or diminishing returns per person per day. Collusion
      (two alts, two friends) is unprofitable.
- [ ] Reputation (popoto received, gratitude) cannot be spent, sold or
      transferred.

**Wellbeing and ethics**
- [ ] No punishing streaks, no artificial countdowns on important things,
      and no notification sent only to pull people back.
- [ ] No near-miss theatrics, no sunk-cost traps, no pay or real money
      anywhere.
- [ ] Losing feels okay: there is no permanent loss to a rival, and a
      comeback is possible.
- [ ] It can be enjoyed in 2 minutes on a phone, and also in an hour.

**Social health**
- [ ] It is positive-sum by default. Competition is opt-in, friendly, and
      never zero-sum over things people care about (a pet, a home,
      reputation).
- [ ] It celebrates other people (cheer, thank, tag) at least as much as it
      celebrates oneself.
- [ ] There is a block, hide or report path, and quiet players aren't
      exposed.

**Admin load:** Aqua and the admins can run it in minutes a week, or it runs
itself.

## Hard lines

These are never crossed, because the players are our friends and real gil
moves:

- No real money in or out of anything chance-based or competitive.
- No mechanic that rewards giving popoto with something worth more than the
  gesture. (The prize and Evercold draws already sit close to this line;
  read economy.md before adding more.)
- No public ranking of who gives least, logs in least, or loses most.
- No dark patterns: confirmshaming, fake scarcity, hidden odds, loss-framed
  nagging.

## Output: the one-pager

Write it in Thai when the user writes Thai:

```
## <ชื่อกลไก>
**ฝันของผู้เล่น:** … (one sentence, in the player's voice)
**ความสนุกเป้าหมาย:** … (1–2 of the kinds of fun) · **ความต้องการ:** autonomy / competence / relatedness
**ลูป:** action → feedback → reward → reason to return  (micro / meso / macro; which existing loop it joins)
**รางวัล:** intrinsic … / extrinsic …, and why this one doesn't crowd out the other
**เศรษฐกิจ:** faucet … / sink … / cap … / farming risk …
**จังหวะ (ตัวเลข):** median member … days / unlucky 10% … days (from odds.mjs)
**ผู้เล่น 6 แบบ:** newcomer · casual · returner · competitor · cheater · bad week: one line each
**ปุ่มปรับ (DB):** the knobs admins can turn
**จริยธรรม:** which hard lines it comes near, and how it stays clear
**ทดสอบ & วัดผล:** the playtest, the signal after 2 weeks, and the result that would change it
```
