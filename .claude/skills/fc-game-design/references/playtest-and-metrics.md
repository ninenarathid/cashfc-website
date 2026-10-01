# Playtesting and reading the players

With about 160 active members, statistics are thin and A/B tests mean
little. Watching, asking and a few honest numbers beat dashboards.

## Playtesting in a small community

1. **Admins first.** Ship behind admin-only visibility, as drafts are for
   contests, or use AdminSwitch to see the member view. The glamour contest
   shipped admin-only with sample data. Copy that.
2. **Then a few volunteers.** Invite 5–8 members of different kinds: a
   raider, a collector, a decorator, a newcomer, a returner. Give them a
   task, not a tour ("plant something and come back tomorrow").
3. **Watch, don't explain.** Where do they hesitate? What do they say out
   loud? What do they screenshot to Discord? A screenshot is the strongest
   signal of delight there is.
4. **Ask three questions afterwards:**
   - What was the best moment?
   - What was confusing?
   - Would you come back tomorrow, and why?
5. **Ship small and announce honestly.** Tell the FC it's new, may change,
   and ask for feedback: the feedback threads exist for that.

## The few numbers worth watching

These are read-only. Show **counts and rates, never names**, unless the user
asks about a specific member.

| Signal | Why | How |
|---|---|---|
| **Breadth:** the share of active members who used X in 14 days | Fun for everyone, or for a few? | distinct users of X ÷ active members (164 on 2026-09-30, in `data/history.json`) |
| **Return:** used X again in the following week | Novelty, or a habit? | distinct users in week 2 who also used it in week 1 |
| **Newcomer path:** verified → first popoto sent → first party, within 7 days | Is onboarding working? | `profiles.character_verified_at` against the first `kudos.created_at` per `sender_id` |
| **Giving breadth:** distinct givers per week, and the median given | Is kindness spread out, or concentrated? | `count(distinct sender_id)` over `kudos` by week |
| **Concentration:** what share of popoto went to the top 10% of receivers | A warm FC, or a popularity contest? | sorted receiver counts |
| **Returners:** "On vacation" back to an active rank | Is the welcome working? | the pipeline's rank changes |
| **Delight:** screenshots and mentions in Discord, feedback threads | The qualitative peak | ask the user |
| **Complaints:** "I never get X", "this feels unfair" | Tuning and pity | feedback threads, Discord |

**Example (giving breadth, read-only, for the SQL editor or a
service-key script that prints aggregates only):**

```sql
select date_trunc('week', created_at)::date as week,
       count(*) as popoto,
       count(distinct sender_id) as givers,
       count(distinct receiver_character_id) as receivers
  from public.kudos
 where created_at > now() - interval '8 weeks'
 group by 1 order by 1;
```

## Reading the numbers without fooling ourselves

- **Novelty spikes.** Anything new gets a week of curiosity, so judge it in
  weeks 2–4.
- **Seasons and patches.** A new raid tier or a festival moves everything.
  Note what else happened that week.
- **Small numbers.** "Up 40%" might be 5 people becoming 7. Say the counts.
- **Don't optimise the metric.** If time-on-site or clicks become the goal,
  dark patterns follow. The goal is members who are happier and closer.
  The numbers are only a way to notice when we've drifted.
