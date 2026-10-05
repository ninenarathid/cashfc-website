// The breaks v141.test.mjs must notice, one at a time.
// Run: node mutate.mjs v141_draft.sql v141.test.mjs v141.mutations.mjs
//
// Not on the list, because nothing can tell: the `revoke` and the `grant` at the file's foot taken away (a function
// written again keeps who may call it, so nothing opens).
const NONE_LEFT = "after the file, no function of the site's writes a table with no WHERE";
const NOW_IS = "town.jar_now is v129's, but for the line of v141.lines.mjs", DROP_IS = "public.town_jar_drop is v129's, but for the line of v141.lines.mjs";
const SAYS = "both say which row", LOOKED = "the file looks at the jar once itself";
const NOW_LINE = "things = jar->'things' where j.one;", DROP_LINE = "things = did->'jar'->'things' where j.one;";
export default ({ cut, swap }) => [
  ["the jar's row is written with no WHERE at a round's turn, as it was",
    swap(NOW_LINE, "things = jar->'things';"),
    [NONE_LEFT, NOW_IS, SAYS]],
  ["the jar's row is written with no WHERE at a drop, as it was",
    swap(DROP_LINE, "things = did->'jar'->'things';"),
    [NONE_LEFT, DROP_IS, SAYS]],
  ["at a round's turn the jar's row is not written at all",
    swap(NOW_LINE, "things = jar->'things' where not j.one;"),
    [NOW_IS, LOOKED, "…the jar is empty, in the new round", "a turn with an empty jar"]],
  ["a drop does not reach the jar",
    swap(DROP_LINE, "things = did->'jar'->'things' where not j.one;"),
    [DROP_IS, "fifty coins dropped", "four of something grown dropped"]],
  ["a drop writes the jar's coins but not its things",
    swap("    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things' where j.one;", "    update public.town_jar j set coins = (did->'jar'->>'coins')::integer where j.one;"),
    [DROP_IS, "four of something grown dropped"]],
  ["the file does not look at the jar itself",
    cut("select town.jar_now(town.now_ms());", "notify pgrst"),
    [LOOKED]],
  ["the file runs whether or not there is a jar",
    cut("do $$\nbegin\n  if to_regprocedure('town.jar_now(bigint)') is null", "/* ── the jar as it stands"),
    ["run before v129, it stops at its first line and says why"]],
];
