// What v172 changes in the one function it writes again, a line at a time: the pair is the text as it stands and the
// text v172 has in its place. `town.fell` is v164's. v172.test.mjs holds the file to this pair: the function is its
// earlier text with the pair, and nothing else.
// (a go that asks for the plain way is refused where it used to be told apart from the board: after every refusal
// there was before it, so that what was refused for another reason is refused for that reason still)
export const TOWN_FELL = [[`  board_ := not one_ and not plain_;
`, `  board_ := not one_ and not plain_;
  -- ── v172: there is no plain way any more: a tree is felled at its board ──
  if plain_ then return town.no('board'); end if;
`]];

/** A function's text with its pairs: each earlier text must stand in it exactly once. */
export function withPairs(text, pairs) {
  let out = text;
  for (const [was, now] of pairs) {
    if (out.split(was).length !== 2) throw new Error(`a pair's earlier text stands ${out.split(was).length - 1} times, not once: ${was.slice(0, 80)}`);
    out = out.replace(was, () => now);
  }
  return out;
}
