// What v173 changes in the one function it writes again, a line at a time: the pair is the text as it stands and the
// text v173 has in its place. `town.fell` is v164's with v172's block. v173.test.mjs holds the file to this pair: the
// function is its earlier text with the pair, and nothing else.
// (the answer that was the ancient tree's alone, of a go that was lost, is every tree's: the purse as it came, the
// grove with the go closed, nothing felled)
export const TOWN_FELL = [[`  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  if town.tree_elder(first_) and not through_ then
`, `  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  -- ── v173: and so does every other tree: a go that is lost fells nothing, gives nothing and costs no stamina ──
  if not through_ then
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
