# The economy: what moves, and how to keep it healthy

Read the live rows before quoting any number. Odds and prizes are tuned in
the admin panel and live in the database: `popoto_rare_switch` and the prize
tables.

## The currencies here today

| Thing | What it really is | Faucet (how it is made) | Sink (how it goes) | Transferable? |
|---|---|---|---|---|
| **Popoto received** | **Reputation**, and since 2026-10-02 **spendable** (the owner's call) | One per sender, per receiver, per day (07:00 Thai reset) | Spending in Cash Town (the shop), from a balance; the lifetime count never goes down | No |
| Gallery popoto | Appreciation for a picture, split with tagged members | One per picture per person, can be taken back | Taken back | No |
| Contest popoto | Votes in a contest (a separate book) | Per contest, limited per member | The contest ends | No |
| Rare popoto | Collectibles with members' lines | A chance on a popoto send, by tier | None (shown, not spent) | No |
| Prizes | Items, or gil handed over in game by Aqua | Draws on give, receive or daily | Claimed and delivered | No |
| Wallet gil | Gil that adds up toward a cash-out | Gil prizes | Cash-out at the threshold (250k by default) | No |
| Evercold tickets | Entries in a monthly draw | One per day of giving popoto | The draw | No |

## Rule one: popoto can be spent, and the record stays

The owner changed this rule on 2026-10-02: "เปลี่ยนกฎ project เป็น popoto
สามารถใช้จ่ายได้". Popoto received may be spent, in Cash Town's shop and
mall, on seeds and decorations. Before then the rule was that reputation is
never currency, for three reasons that are now things to design against:

1. **Spending would erase the record of being cared for.** So keep two
   numbers: the **lifetime count received**, which is what profiles and
   leaderboards show and never goes down, and a **spendable balance**,
   which spending takes from. Spending never touches the lifetime count.
2. **People may start asking for popoto to buy things,** turning gratitude
   into begging. The existing cap (one per sender, per receiver, per day)
   keeps any one friend's help small; keep it, and don't add ways to send
   more or to transfer a balance.
3. **Giving may become economic** (the overjustification effect). Keep
   prices modest and cosmetic, and keep celebrating the giving itself, not
   the balance.

Every price, balance and deduction lives in the database and is changed
only by a server-side function from server time (fc-migration): the browser
never says how much anything costs or how much somebody has. Ownership of
rare popoto (the collectibles) can unlock things, such as a rare popoto
becoming a pet; it is never consumed to do so.

## Faucets and sinks (for any spendable currency)

- **A faucet** creates currency: mini-game rewards, a harvest, daily visits.
  **A sink** removes it: cosmetics, decorations, seeds, pet care that is
  cosmetic only.
- **Without sinks, prices inflate** and a newcomer can never catch up. With
  sinks too harsh, people feel taxed.
- **Prefer cosmetic sinks:** a hat, a wallpaper, a farm plot style.
  Cosmetics never create pay-to-win, and they feed expression.
- **Cap the faucets per person per day,** or the most-online people run away
  with the economy and newcomers despair. A daily cap also limits the damage
  of any exploit.
- **Watch the money supply:** the total held, the total created and
  destroyed per week, and the median holding. If the median keeps rising
  with no new sinks, add sinks or new things to want.

## Drop rates and how they feel

Use `node .claude/skills/fc-game-design/scripts/odds.mjs --chance <pct>
--tiers R:x,SR:y,UR:z --per-day <tries>`. The script turns a percentage into
what a member experiences:

- **Per try, and "1 in N".** People can't feel 0.24%. They can feel "about
  one in 400 sends".
- **The median wait,** in tries and days at a real member's pace. Measure
  the pace; don't guess it.
- **The unlucky 10%.** This is the experience to design for, because it
  generates the complaints.
- **The chance of seeing it at least once in a month or an event.** If most
  members will never see a tier during an event, it is a rumour, not a
  reward. Either raise it, add pity, or present it honestly as legendary.

**Pity (bad-luck protection).** Guarantee the top tier after N misses, or
raise the odds a little after each miss. It caps the worst experience
without changing the median much. Count it per member, in the database.

**Show the odds** (PrizeOdds already does). Hidden odds feel like being
cheated the day someone works them out.

**Tune in the panel, not in code.** Every chance, cap and threshold is a row
the admins can change, as `popoto_rare_switch` is.

## Anti-farming and collusion

- **Identity:** one verified character per account (v85). Guests and alts
  are visible.
- **Pair limits:** a reward per sender→receiver per day stops two friends
  pumping each other. Reciprocal swapping is fine *socially*, so make sure
  it isn't *profitable*.
- **Diminishing returns:** the third harvest of the day is worth less than
  the first, so playing a lot is fine but grinding doesn't pay.
- **Server authority:** the database decides outcomes, timers come from
  server time, and growth is computed from timestamps (`planted_at`), never
  from what the browser says.
- **Watch for anomalies:** in the weekly read-back, look for one account far
  above the next, or for pairs that only ever trade with each other.

## Budgeting the real gil

Aqua's desk forecasts the daily gil cost. Any new gil faucet goes through
her:
- the expected gil per day (chance × amount × eligible actions);
- the worst plausible day;
- the stock limits.

Gil is real effort in the game. It is a thank-you, not a salary.
