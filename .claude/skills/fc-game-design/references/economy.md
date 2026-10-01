# The economy: what moves, and how to keep it healthy

Read the live rows before quoting any number. Odds and prizes are tuned in
the admin panel and live in the database: `popoto_rare_switch` and the prize
tables.

## The currencies here today

| Thing | What it really is | Faucet (how it is made) | Sink (how it goes) | Transferable? |
|---|---|---|---|---|
| **Popoto received** | **Reputation**: gratitude from friends | One per sender, per receiver, per day (07:00 Thai reset) | None, and none should exist | No |
| Gallery popoto | Appreciation for a picture, split with tagged members | One per picture per person, can be taken back | Taken back | No |
| Contest popoto | Votes in a contest (a separate book) | Per contest, limited per member | The contest ends | No |
| Rare popoto | Collectibles with members' lines | A chance on a popoto send, by tier | None (shown, not spent) | No |
| Prizes | Items, or gil handed over in game by Aqua | Draws on give, receive or daily | Claimed and delivered | No |
| Wallet gil | Gil that adds up toward a cash-out | Gil prizes | Cash-out at the threshold (250k by default) | No |
| Evercold tickets | Entries in a monthly draw | One per day of giving popoto | The draw | No |

## Rule one: reputation is never currency

**Popoto received** is the record of how many times friends thought of you.
If it can be spent (in a shop, or Cash Town's fashion mall), three things
happen:

1. Spending erases the record of being cared for.
2. People start asking for popoto to buy things, which turns gratitude into
   begging.
3. Giving becomes economic, and the overjustification effect kicks in.

So any spendable currency, in Cash Town or elsewhere, is a **separate**
earned currency, for example "coins" from mini-games and farming. It may be
*inspired* by the popoto (it can be called something potato-shaped), but it
never decrements the gratitude count. Ownership of rare popoto (the
collectibles) can unlock things, such as a rare popoto becoming a pet; it is
never consumed to do so.

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
