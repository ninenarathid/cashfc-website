---
name: fc-ideas
description: Brainstorm and shape new features and events that make the Cafe And SHabu FC's members have fun and feel happy. It builds on what the site already has (popoto and rare popoto, prizes and Aqua's gil, the gallery and glamour contest, the party finder, birthdays, the activity feed, the bell, the Discord bot) and on FFXIV's and Thailand's calendar. Use whenever the user asks for feature ideas, what to build next, events, mini-games or seasonal and festival ideas, ways to get members more active, welcome newcomers or bring back members "on vacation", or wants a rough idea (theirs or Aqua's) turned into a plan. Covers Thai requests like "คิดไอเดีย", "ฟีเจอร์ใหม่", "ทำอะไรให้คนสนุก", "กิจกรรม FC", "อยากให้คนเข้าเว็บบ่อยขึ้น", "มีอะไรน่าทำต่อ", "อีเวนต์".
---

# Ideas that make the FC happier

The site is the FC's second home. It started on 2026-08-24 and ships almost
daily, so what exists changes weekly. Always look at what is there now
before suggesting anything.

## What "fun and happy" means here

People are happiest on this site when they:

- **Belong:** they are seen and greeted by name (birthdays, tags, a
  welcome).
- **Are recognised:** friends celebrate their progress and effort (a clear,
  a glamour, help given).
- **Play together:** they do things in the game together, and remember
  them.
- **Express themselves:** glamours, houses, screenshots, taste.
- **Are surprised:** small, fair, frequent delight (a popoto, a rare
  flavour).
- **Have rituals:** a weekly or seasonal rhythm to look forward to.
- **Give:** kindness has a currency here, the popoto, and giving should feel
  as good as getting.

**Everyone counts:**
- raiders and casuals, crafters and collectors, lurkers;
- new sprouts;
- the roughly 345 of 509 on the roster marked "On vacation";
- guests;
- the two admins (Aqua runs the gil and the contests), whose time is the
  scarcest thing the FC has.

## Guardrails

An idea that breaks one of these needs a very good reason, stated.

- **No shame.** Never rank people downward: no "least active", no public
  failure counts. Celebrate in many dimensions, the way the eight playstyle
  leaderboards let everyone be good at something.
- **No anxiety loops.**
  - Streaks forgive a missed day.
  - Nothing important sits behind a countdown.
  - No notification exists for its own sake.
  - Mute groups exist; respect them.
- **A fair economy.**
  - Outcomes are decided in the database, and odds are visible.
  - No pay-to-win.
  - Nothing that feels like gambling with money.
  - Gil stays in the game and is handed over in person, as it is today.
- **Privacy.**
  - Nothing that tells strangers where or when someone is.
  - Opt-in for anything that puts a person in the spotlight.
  - Read the fc-security skill's privacy rules
    ([privacy.md](../fc-security/references/privacy.md)) for anything touching
    personal data.
- **Admin time.** Best is an idea that runs itself, or gives admins a
  one-click tool. If it needs weekly manual work, say so, and get the
  admin's yes.
- **Cost.**
  - Prefer static and cached pages, and work batched in the pipeline.
  - Use realtime only when being live is the point.
  - The site is over Vercel's free limits and moving to Cloudflare.
- **Moderation.** Anything members write or upload needs hide and report,
  and the verified-character rule (v85).
- **The game's rules.** No real-money trade, no automating the game client,
  no scraping beyond the pipeline's polite schedule, and credit to community
  data sources.

## Workflow

1. **Get the current state.**
   - `git log --since="45 days ago" --oneline | grep -v " data:"` shows what
     shipped lately. Before proposing any seed, grep the whole history and
     the code for its keyword (`git log --all --oneline -i --grep=<word>`).
     The live changelog is the `site_updates` table (admin-edited);
     `lib/changelog.ts` is only a fallback.
   - [references/whats-here.md](references/whats-here.md) maps the systems
     and their quirks. Check anything important against the code, because it
     dates.
   - **Parked on purpose:** the `/events` index, `/games` and `/compare`
     return 404. `/events/[id]` is live: it is the permalink of each
     announcement, with an OG card, so keep those URLs working. The market is
     an admin-only work in progress; guides are an admin-only draft.
   - **Open items:** if your memory directory has notes on a feature (for
     example `glamour-contest`, with its "not built yet" list), read them.
   - **Dates:** check today's date against
     [references/calendar.md](references/calendar.md) for what is coming in
     FFXIV and Thailand. For this year's FFXIV dates, read the Lodestone
     topics list itself (https://na.finalfantasyxiv.com/lodestone/topics/).
     Search summaries mix up years, because the notices' titles carry none.
     Until the event is announced, plan around last year's window from
     calendar.md.
2. **Understand the ask.** It may be:
   - an open brainstorm;
   - a goal ("more parties", "welcome sprouts", "the gallery is quiet",
     "bring vacationers back");
   - a season ("Halloween");
   - somebody's rough idea to shape.

   If the goal is unclear, ask one question, or offer two or three framings
   and pick the likeliest.
3. **Diverge.** List 12–20 raw ideas across the lenses in
   [references/idea-lenses.md](references/idea-lenses.md), from tiny joys to
   big features. No judging yet. The seed ideas there are a starting point.
   Check each against what has shipped since.
4. **Converge.** Score each with the rubric below. Keep the top three to
   five, and prefer those that reuse existing systems. Show the runners-up
   too, one line each with its score, and say why any idea was set aside
   (for example, decided against in the code).
5. **Shape each keeper** as an idea card (below).
   For an idea with rewards, odds, a currency, competition or a mini-game,
   shape its mechanics with **fc-game-design** before the card is final.
   Anything about the virtual town (avatars, voice, farm, homes) belongs to
   **fc-cash-town**.
6. **Offer a next step:**
   - ask the members (a poll in the gallery's PollCard, which has no admin UI
     yet, or Discord);
   - check with Aqua or the admins where it touches their work;
   - write an MVP plan;
   - or build it, with fc-ui, fc-migration, fc-security and fc-perf.

## Scoring

| | 1 | 3 | 5 |
|---|---|---|---|
| **Joy** | mildly nice | people smile | people talk about it in Discord |
| **Reach** | a few members | one group (raiders, crafters…) | nearly everyone, including lurkers and vacationers |
| **Reuse** | all new | some reuse | built mostly on existing systems |
| **Effort** (inverse) | weeks | days | an evening |
| **Upkeep** (inverse) | weekly admin work | occasional | runs itself |
| **Risk** (inverse) | privacy, abuse or cost worries | manageable | none |

**Score = Joy×2 + Reach×2 + Reuse + Effort + Upkeep + Risk** (out of 40). A
1 on Risk blocks an idea until the risk is solved.

Reach is counted against the whole roster. An idea aimed only at the members
on vacation can still reach far: they are two thirds of it.

## The idea card

Write the cards in Thai when the user writes Thai; code names stay in
English.

```
### <ชื่อไอเดีย> — <pitch ในประโยคเดียว>
**ทำไมสนุก:** which need it meets (belong / recognised / together / express / surprise / ritual / give) and who smiles
**ต่อยอดจาก:** the existing systems and files it builds on
**MVP:** the smallest version worth shipping
**ต่อไป:** what V2 adds
**ข้อมูล:** tables / columns / RPCs in a sketch; who may write (verified character); what stays hidden until when
**ต้นทุน & ความเร็ว:** static or dynamic, realtime or not, storage, pipeline
**ความเสี่ยง & วิธีกัน:** privacy, spam, fairness, moderation
**งานแอดมิน:** what Aqua or the admins must do (ideally nothing)
**วัดผล:** a signal readable after two weeks (the share of active members who used it, popoto given, entries)
**คะแนน:** Joy · Reach · Reuse · Effort · Upkeep · Risk = xx/40
```

## What not to build

- **Things Discord already does well** (chat, voice). The site should do
  what Discord can't: persistent, visual, structured and celebratory.
- **Engagement bait:** login rewards that punish a missed day, notifications
  for their own sake, dark patterns.
- **Joy only the top raiders can reach.**
- **A big launch with no MVP,** or a feature that needs content nobody will
  keep writing.
- **A second copy of an existing system.** Extend it instead: the contest
  engine, the party finder as an event engine, the popoto as the reward.
