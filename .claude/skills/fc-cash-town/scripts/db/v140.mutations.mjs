// The breaks v140.test.mjs must notice, one at a time.
// Run: RULES=few node mutate.mjs v140_draft.sql v140.test.mjs v140.mutations.mjs      (FROM=0 TO=4 takes a slice: three side by side)
//
// Not on the list, because nothing can tell: the `revoke` at the file's foot taken away (a function written again
// keeps who may call it, so nothing opens).
const CLOSING = "a pumpkin of long ago with a pest on it: a ladybird does not go on and is not offered, a cure goes on; the moment before the pest, the ladybird went on";
const FEED_IS = "town.feed is v110's, but for the lines of v140.lines.mjs", DEED_IS = "town.deed_for is v119's, but for the lines of v140.lines.mjs";
const BEFORE = "before the file a cover went on a plant with a pest on it, and it was covered a day: it does not now";
const THEN = "then a ladybird goes on: the plant is covered for a day from that moment, and one ladybird is gone from the bag";
const HEALTHY = "ladybird: on a plant with no pest it goes on at once, for a day";
const GROW = "what makes a plant grow goes on it with its pest there, as ever, and leaves the pest";
const FEED_LINE = "  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;\n";
const DEED_LINE = "    if kind = 'guard' and (p->>'guard')::bigint <= p_now and not (seen->>'pest')::boolean then return 'feed'; end if;";
export default (tools) => all(tools).slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? 1e9));
const all = ({ cut, swap }) => [
  // a cover on a plant
  ["a cover goes on a plant with a pest, as it did",
    cut(FEED_LINE, "  return jsonb_build_object('ok', true,"),
    [FEED_IS, CLOSING, "feed:", BEFORE]],
  ["no cover goes on any plant",
    swap(FEED_LINE, "  if kind = 'guard' then return town.no('soil'); end if;\n"),
    [FEED_IS, CLOSING, "feed:", THEN, HEALTHY]],
  ["a cover goes only on a plant that has a pest",
    swap(FEED_LINE, FEED_LINE.replace("and (town.see", "and not (town.see")),
    [FEED_IS, CLOSING, "feed:", THEN, HEALTHY]],
  ["what makes a plant grow is kept off a plant with a pest too",
    swap(FEED_LINE, FEED_LINE.replace("if kind = 'guard' and", "if kind in ('feed', 'guard') and")),
    [FEED_IS, "feed:", GROW]],
  ["it is the hand that is said to be wrong, not the plot",
    swap(FEED_LINE, FEED_LINE.replace("town.no('soil')", "town.no('hand')")),
    [FEED_IS, "feed:"]],
  ["a cover is kept off a plant dead of its pest, and not off one that has it",
    swap(FEED_LINE, FEED_LINE.replace("->>'pest'", "->>'dead'")),
    [FEED_IS, CLOSING, "feed:", BEFORE]],
  ["a cover lasts two and a half minutes for every hour while it is at it",
    swap("jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 3600000)", "jsonb_build_object('guard', p_now + (f->>'guard')::bigint * 150000)"),
    [FEED_IS, "feed:", THEN, HEALTHY]],
  ["putting a thing on a plant costs no stamina while it is at it",
    swap("'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));", "'purse', p_purse || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));"),
    [FEED_IS, "feed:"]],
  // what the hand is offered
  ["the map offers a cover for a plant with a pest, as it did",
    swap(DEED_LINE, DEED_LINE.replace(" and not (seen->>'pest')::boolean", "")),
    [DEED_IS, CLOSING, "deed_for:", "tend:"]],
  ["a cover is offered only for a plant with a pest",
    swap(DEED_LINE, DEED_LINE.replace("and not (seen", "and (seen")),
    [DEED_IS, CLOSING, "deed_for:", "tend:", THEN, HEALTHY]],
  ["a cover is never offered",
    swap(DEED_LINE, DEED_LINE.replace("and not (seen->>'pest')::boolean", "and false")),
    [DEED_IS, "deed_for:", "tend:", THEN, HEALTHY]],
  ["a cover is offered again while the plant is covered",
    swap(DEED_LINE, DEED_LINE.replace("(p->>'guard')::bigint <= p_now and ", "")),
    [DEED_IS, "deed_for:"]],
  // the file
  ["it runs whatever has run before it",
    cut("  if to_regprocedure('town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)') is null then", "end $$;"),
    ["run before v119, it stops at its first line and says why"]],
];
