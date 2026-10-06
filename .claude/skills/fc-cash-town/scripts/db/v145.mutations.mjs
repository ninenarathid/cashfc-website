// The breaks v145.test.mjs must notice, one at a time.
// Run: RULES=few node mutate.mjs v145_draft.sql v145.test.mjs v145.mutations.mjs      (FROM=0 TO=10 takes a slice: four side by side)
//      node check-anchors.mjs v145_draft.sql v145.mutations.mjs <a log of the dry run>     first: every anchor and every check's name
//
// Not on the list, because nothing can tell: the `revoke` of the rules at the file's foot taken away (a function written
// again keeps who may call it, so nothing opens).
const WRITES = "it writes two rows over, the farm's and the insects', and leaves every other as it was";
const NUMBERS = "a ladybird eats a pest half the time and a mantis seven times in ten; the pest cure keeps a plant 24 hours";
const CLOSING = "a pumpkin of long ago with a pest on it, at a moment whose number is 0.68";
const PRIV = "the rules are no browser's, written again or not; tending is a member's and nobody else's";
const FIVE = "of the whole catalog five entries differ";
const FEED_IS = "town.feed is v140's, but for the lines of v145.lines.mjs", DEED_IS = "town.deed_for is v140's, but for the lines of v145.lines.mjs";
const CURE_IS = "town.cure is v110's, but for the lines of v145.lines.mjs", TEND_IS = "public.town_tend is v121's, but for the lines of v145.lines.mjs";
const BEFORE_EAT = "before the file an insect did not go on a plant with a pest on it: now it does";
const BEFORE_CURE = "…and the cure rid a plant and covered nothing: now it covers it";
const TWICE_L = "after it about twice as many ladybirds in the day", TWICE_M = "and about twice as many mantises, on the farm alone still";
const SCARCE = "…so the afternoon has well under two thirds of the ladybirds and of the mantises";
const LET = "a ladybird is let go on it: the deed is done", OFF = "…and it is off: the plant is as it was to the letter";
const GONE = "…the ladybird gone from the bag all the same, and a point of stamina with it";
const EATS = "the second, a minute on, eats the pest", NOCOVER = "…and is covered by nothing";
const WRITTEN = "both are written down as what was put on the plant, with what came of each";
const CLEAN = "a mantis let go on the plant now, which has no pest, covers it for a day", NOWORD = "…written down with no word of a pest: none was there";
const SHARE = "over two thousand moments of that pest a ladybird eats it about half the time";
const HEALTHY = "ladybird: on a plant with no pest it goes on at once, for a day";
const FIVE_PLAIN = "…none of those five written down with a word of a pest", GROW_WORD = "…written down with no word of a pest either";
const CURE_OFF = "the pest cure, anybody's, takes the pest off, as ever", KEEPS = "…and keeps pests off the plant for 24 hours from that moment";
const FISH = "an archerfish takes the pest off and covers nothing, as ever";

const RIDS_NULL = "    if f->'rids'->>p_hand is null then return town.no('soil'); end if;\n";
const ROLLS = "case when town.roll('rid|' || p_key, p_now, (p->>'sown')::bigint) < (f->'rids'->>p_hand)::double precision";
const EATEN = "then p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)) else p_plot end,";
const EATER_PURSE = "else p_plot end,\n      'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));";
const ON_PEST = "  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then\n    if f->'rids'";
const OFFERED = "(not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null)";
const KEEPING = "case when coalesce((f->'cures'->>p_hand)::bigint, 0) > 0 then";
const RID_LINE = "             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);";
export default (tools) => all(tools).slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? 1e9));
const all = ({ cut, swap }) => [
  // an insect let go on a plant with a pest
  ["an insect that eats pests does not go on a plant with a pest, as since v140",
    swap(RIDS_NULL, "    return town.no('soil');\n"),
    [FEED_IS, CLOSING, "feed:", BEFORE_EAT, LET]],
  // (through the function a member calls nothing changes for this one: what the hand is offered keeps a plain cover
  // off such a plant before the rule is asked. The rule's own cases and the closing block see it.)
  ["every cover goes on a plant with a pest, and is used up for nothing",
    swap(RIDS_NULL, ""),
    [FEED_IS, CLOSING, "feed:", "the farm's, feed:"]],
  ["an insect always eats the pest",
    swap(ROLLS, "case when true"),
    [FEED_IS, CLOSING, "feed:", OFF, SHARE]],
  ["an insect never eats the pest",
    swap(ROLLS, "case when false"),
    [FEED_IS, CLOSING, "feed:", EATS, SHARE, BEFORE_EAT]],
  ["it eats when the moment's number is over how often it does, not under",
    swap(ROLLS, ROLLS.replace(" < (f->'rids'", " >= (f->'rids'")),
    [FEED_IS, CLOSING, "feed:", OFF, EATS]],
  ["the number is of the plot and the moment alone, not of its plant",
    swap(ROLLS, ROLLS.replace("p_now, (p->>'sown')::bigint)", "p_now)")),
    [FEED_IS, "feed:"]],
  ["the number is the pests' own roll, with no word of its own",
    swap(ROLLS, ROLLS.replace("'rid|' || p_key", "p_key")),
    [FEED_IS, "feed:"]],
  ["the number is by the hour, not the millisecond: a whole hour eats or does not",
    swap(ROLLS, ROLLS.replace("p_key, p_now, ", "p_key, p_now / 3600000, ")),
    [FEED_IS, "feed:", SHARE]],
  ["an insect that eats the pest covers the plant for a day too",
    swap(EATEN, EATEN.replace("jsonb_build_object('cured', p_now)", "jsonb_build_object('cured', p_now, 'guard', p_now + (f->>'guard')::bigint * 3600000)")),
    [FEED_IS, CLOSING, "feed:", NOCOVER]],
  ["an insect that eats the pest covers the plant as before v140, and leaves no mark of a cure",
    swap(EATEN, EATEN.replace("jsonb_build_object('cured', p_now)", "jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000)")),
    [FEED_IS, CLOSING, "feed:", EATS, NOCOVER]],
  ["an insect let go on a pest is not used up",
    swap(EATER_PURSE, EATER_PURSE.replace(" || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));", ");")),
    [FEED_IS, CLOSING, "feed:", GONE]],
  ["letting an insect go on a pest costs no stamina",
    swap(EATER_PURSE, EATER_PURSE.replace("town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) ||", "p_purse ||")),
    [FEED_IS, "feed:", GONE]],
  ["an insect that eats pests is tried on a plant with no pest too, and covers none",
    swap(ON_PEST, "  if kind = 'guard' and ((town.see(p_key, p_plot, p_now)->>'pest')::boolean or f->'rids'->>p_hand is not null) then\n    if f->'rids'"),
    [FEED_IS, "feed:", CLEAN, HEALTHY]],
  // what the hand is offered
  ["the map offers no cover for a plant with a pest, the insects neither, as since v140",
    swap(OFFERED, "not (seen->>'pest')::boolean"),
    [DEED_IS, CLOSING, "deed_for:", "tend:", LET]],
  ["every cover is offered for a plant with a pest",
    swap(OFFERED, "true"),
    [DEED_IS, "deed_for:"]],
  ["an insect that eats pests is offered only for a plant with a pest",
    swap(OFFERED, "((seen->>'pest')::boolean and town.cat('farming')->'rids'->>p_hand is not null)"),
    [DEED_IS, "deed_for:", "tend:", CLEAN, HEALTHY]],
  ["a cover is offered again while the plant is covered",
    swap("    if kind = 'guard' and (p->>'guard')::bigint <= p_now\n       and ", "    if kind = 'guard'\n       and "),
    [DEED_IS, "deed_for:"]],
  // a cure
  ["the pest cure covers nothing, as before",
    swap(KEEPING, "case when false then"),
    [CURE_IS, CLOSING, "cure:", KEEPS, BEFORE_CURE]],
  ["every cure is said to cover, the fish too",
    swap(KEEPING, "case when true then"),
    [CURE_IS, CLOSING, "cure:", FISH]],
  ["the cure keeps a plant an hour where it should a day",
    swap("jsonb_build_object('guard', p_now + (f->'cures'->>p_hand)::bigint * 3600000) else", "jsonb_build_object('guard', p_now + (f->'cures'->>p_hand)::bigint * 150000) else"),
    [CURE_IS, CLOSING, "cure:", KEEPS]],
  ["the cure covers the plant and no longer rids it",
    swap("jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)\n      || case", "jsonb_build_object('plant', p\n      || case"),
    [CURE_IS, "cure:", CURE_OFF]],
  // what is written down
  ["what came of an insect is not written down",
    swap(RID_LINE, "             then '{}'::jsonb else '{}'::jsonb end);"),
    [TEND_IS, WRITTEN]],
  ["an insect is written down as having eaten the pest whatever came of it",
    swap(RID_LINE, "             then jsonb_build_object('rid', true) else '{}'::jsonb end);"),
    [TEND_IS, WRITTEN]],
  ["a word of a pest is written for whatever is put on a plant that has one",
    swap("f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)", "(town.see(key, plot, now_)"),
    [TEND_IS, GROW_WORD]],
  ["a word of a pest is written for an insect let go on a plant that has none",
    swap(" and (town.see(key, plot, now_)->>'pest')::boolean\n             then", "\n             then"),
    [TEND_IS, NOWORD, FIVE_PLAIN]],
  // the numbers
  ["a ladybird eats a pest seven times in ten, as the mantis does",
    swap(`"rids": {"ladybird":0.5,"mantis":0.7}`, `"rids": {"ladybird":0.7,"mantis":0.7}`),
    [NUMBERS, CLOSING, FIVE, "feed:", OFF, SHARE]],
  ["no insect is said to eat pests",
    swap(`    "rids": {"ladybird":0.5,"mantis":0.7},\n`, ""),
    [NUMBERS, FIVE, "feed:", LET]],
  ["the cure keeps a plant twelve hours",
    swap(`"cures": {"pestCure":24}`, `"cures": {"pestCure":12}`),
    [NUMBERS, CLOSING, FIVE, "cure:", KEEPS]],
  ["no cure is said to keep a plant",
    swap(`    "cures": {"pestCure":24},\n`, ""),
    [NUMBERS, CLOSING, FIVE, "cure:", KEEPS]],
  ["a ladybird weighs what it did",
    swap(`"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13`, `"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":6`),
    [NUMBERS, FIVE, TWICE_L, "unhunted, bug_at:"]],
  ["a mantis weighs what it did",
    swap(`"mantis":{"habit":"behind","at":["field"],"weight":50`, `"mantis":{"habit":"behind","at":["field"],"weight":22`),
    [NUMBERS, FIVE, TWICE_M, "unhunted, bug_at:"]],
  ["a ladybird is on the farm and in the town alone, as before v138",
    swap(`"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,`, `"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":13,"n":[1,1],"cost":1,"places":["farm","town"],`),
    [FIVE, "…on every map", "unhunted, bug_at:"]],
  ["a kind is hunted scarce a hundred times more slowly",
    swap(`"scarce": {"day":24,"half":20}`, `"scarce": {"day":24,"half":2000}`),
    [NUMBERS, FIVE, SCARCE, "hunted, plenty:"]],
  ["the rows are seeded only where there are none: nothing is written over",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    [WRITES, NUMBERS, FIVE, "feed:", TWICE_L, "run again, it writes its two rows over again"]],
  // the file
  ["it runs whatever has run before it",
    cut("  if to_regprocedure('town.plenty(text, bigint, jsonb)') is null then", "  if to_regprocedure('town.tend("),
    ["run before v139, it stops at its first line and says why"]],
  ["tending is taken from the members",
    swap("grant execute on function public.town_tend(integer, integer, jsonb, boolean) to authenticated;", "revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from authenticated;"),
    [PRIV, LET]],
  ["tending is given to whoever is signed out",
    swap("revoke execute on function public.town_tend(integer, integer, jsonb, boolean) from public, anon;", "grant execute on function public.town_tend(integer, integer, jsonb, boolean) to anon;"),
    [PRIV]],
  ["the rules are given to the browser",
    swap("revoke execute on all functions in schema town from public, anon, authenticated;", "grant execute on all functions in schema town to authenticated;"),
    // (a member's call is refused all the same, by the schema itself, which no browser may use: only the count of what is open tells)
    [PRIV]],
];
