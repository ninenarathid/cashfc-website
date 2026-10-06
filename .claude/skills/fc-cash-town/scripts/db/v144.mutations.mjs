// The breaks v144.test.mjs must notice, one rule at a time.
// Run: FC_REPO=<the tree whose code is meant> node mutate.mjs <the file, plain line ends> v144.test.mjs v144.mutations.mjs
//
// Not on the list: the guard at the file's head (v128 and v143 have run); and the rules left to everybody (the
// file's `revoke` taken out): the function is written again and keeps who may call it, so nothing opens and no check
// can see it. The line stays in the file as in every file of the town's.
const all = ({ swap }) => [
  ["what the uncle sells is still held to what he asks",
    swap("  select case\n    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0", "  select case\n    when town.cat('goods') ? p_item then (town.cat('goods')->p_item->>'price')::numeric::int\n    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0"),
    ["a worm may be asked ten for on the board", "every thing there is has the same most on the board as at a stall", "the board's most asks nothing of the uncle's shelf", "the most of every thing there is, by the board's own numbers", "a notice is pinned up or refused as the code has it", "a notice of five worms at three each goes up"]],
  ["what the relatives do not take may be asked nothing for",
    swap("    else (p_k->>'capless')::int end", "    else 0 end"),
    ["the most of every thing there is, by the board's own numbers", "a scroll the relatives do not take"]],
  ["the board's most goes by a number of its own, not its knob",
    swap("then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int", "then ((town.cat('items')->p_item->>'pays')::numeric * 10)::int"),
    ["the most of every thing there is, by two other numbers"]],
  ["a price has no most on the board",
    swap("then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int", "then 1000000"),
    ["the most of every thing there is, by the board's own numbers", "a notice is pinned up or refused as the code has it", "ten a worm is the most, and eleven too dear"]],
];
const list = (tools) => all(tools).slice(Number(process.env.FROM ?? 0), process.env.TO ? Number(process.env.TO) : undefined);
export default list;
