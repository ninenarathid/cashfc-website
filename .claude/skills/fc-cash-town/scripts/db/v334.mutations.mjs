// The breaks v334.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts):
//   V334_BENCH=<dump> FC_REPO=<tree> node mutate.mjs <tree>/supabase/v334_the_auction_closes_together.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v334.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v334.mutations.mjs
export default ({ swap }) => [
  ["each round its own close again (v297)", swap("where x.settled_at is null and x.opens_at <= now() and x.closes_at > now();", "where x.id = a.id;"), ["a late bid on B moves A's close and B's alike", "C's close went with D's"]],
  ["past the hard close", swap("least(x.hard_close, greatest(x.closes_at, now() + interval '5 minutes'))", "greatest(x.closes_at, now() + interval '5 minutes')"), ["A stops at its hard close, B goes on to five minutes"]],
  ["a later close shortened", swap("least(x.hard_close, greatest(x.closes_at, now() + interval '5 minutes'))", "least(x.hard_close, now() + interval '5 minutes')"), ["B's later close kept", "a round days off, one not open yet and one settled are not moved"]],
  ["leaving late moves nothing", swap(" or (carried > 0 and now() >= other.closes_at - interval '5 minutes')", ""), ["leaving A late moves A's close; B's later one kept"]],
  ["a round not open yet moved", swap("x.settled_at is null and x.opens_at <= now() and x.closes_at > now()", "x.settled_at is null and x.closes_at > now()"), ["a round days off, one not open yet and one settled are not moved"]],
  ["anon may bid", swap("revoke all on function public.town_bid(bigint, integer, uuid) from public, anon;", "grant execute on function public.town_bid(bigint, integer, uuid) to anon;"), ["anon may not bid, members may"]],
];
