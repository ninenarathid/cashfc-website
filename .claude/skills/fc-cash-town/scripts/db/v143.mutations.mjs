// The breaks v143.test.mjs must notice, one rule at a time.
// Run: node mutate.mjs <the file> v143.test.mjs v143.mutations.mjs   (the file with plain line ends).
//
// Not on the list: the guard at the file's head (v142 has run), and a rule left to everybody, which cannot be shown:
// `town.shop_cap` is new, but the file's last `revoke … in schema town` is the same line that keeps every rule shut,
// and taking it out is the break below.
const OPEN = "town.shop_open answers every case", CAP = "town.shop_cap answers every case";
const all = ({ swap }) => [
  ["the rules are left as they are made: a member's to call",
    swap("revoke execute on all functions in schema town from public, anon, authenticated;\n", ""),
    // (a member is refused the rule all the same, having no way into the schema: the grant is what this check reads)
    ["the rules are nobody's in a browser"]],
  ["a stall is still held to the notice board's most: what the uncle sells, to his price",
    swap("    if price_ > town.shop_cap(item_, p_k) then return town.no('dear'); end if;\n", "    if price_ > town.notice_cap(item_, p_k) then return town.no('dear'); end if;\n"),
    [OPEN, "the rule that opens a stall asks the stall's own most", "a stall opens selling worms at five"]],
  ["a price has no most at a stall",
    swap("    if price_ > town.shop_cap(item_, p_k) then return town.no('dear'); end if;\n", ""),
    [OPEN, "…and eleven is too dear"]],
  ["a stall's most is what the uncle asks, where he sells the thing",
    swap("  select case\n    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0", "  select case\n    when town.cat('goods') ? p_item then (town.cat('goods')->p_item->>'price')::numeric::int\n    when coalesce((town.cat('items')->p_item->>'pays')::numeric, 0) > 0"),
    [CAP, "every thing the uncle sells may be asked more for"]],
  ["what the relatives do not take has no most to speak of: nothing may be asked for it",
    swap("    else (p_k->>'capless')::int end", "    else 0 end"),
    [CAP, "a scroll the relatives do not take"]],
  ["a stall's most goes by a number of its own, not the knob the board's goes by",
    swap("then ((town.cat('items')->p_item->>'pays')::numeric * (p_k->>'cap')::int)::int", "then ((town.cat('items')->p_item->>'pays')::numeric * 10)::int"),
    [CAP, "the knob the board's most goes by is the stall's too"]],
];
const list = (tools) => all(tools).slice(Number(process.env.FROM ?? 0), process.env.TO ? Number(process.env.TO) : undefined);
export default list;
