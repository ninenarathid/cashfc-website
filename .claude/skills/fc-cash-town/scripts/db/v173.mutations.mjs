// The breaks v173.test.mjs must notice, one rule at a time.
// Run: FC_REPO=<tree> TOWN_VECTORS=<the folder with vectors-felling.json> node mutate.mjs <tree>/supabase/v173_a_go_that_is_lost_fells_nothing.sql v173.test.mjs v173.mutations.mjs
const IF = `  if not through_ then\n`;
const STOOD = `    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,`;
const PLAIN = `  if plain_ then return town.no('board'); end if;\n`;
/** A text that stands once, swapped; it throws when it does not stand once. */
const swap = (a, b) => (sql) => {
  if (sql.split(a).length !== 2) throw new Error(`stands ${sql.split(a).length - 1} times, not once: ${a.slice(0, 60)}`);
  return sql.replace(a, () => b);
};
export default () => [
  ["a go that is lost still fells its tree (the ancient tree alone stands)", swap(IF, `  if town.tree_elder(first_) and not through_ then\n`),
    ["the rule is its earlier text with its pair", "every case of a go at felling is answered as the code answers it", "a go lost on the board fells nothing", "the go lost: answered that the tree stands",
      "…the purse is as it was", "…no stump, nothing written down", "with no stamina left, a go that was lost is the same", "the file's own look says the tree stands"]],
  ["a go that is lost costs its stamina", swap(STOOD, STOOD.replace(`'purse', p_purse,`, `'purse', town.spend(p_purse, (k->>'cost')::double precision, p_now),`)),
    ["every case of a go at felling is answered as the code answers it", "a go lost on the board fells nothing", "…the purse is as it was"]],
  ["a go that is lost keeps its hold on the tree", swap(STOOD, STOOD.replace(`'grove', closed_,`, `'grove', p_grove,`)),
    ["every case of a go at felling is answered as the code answers it", "…and the go is over: the tree is anybody's at once"]],
  ["a trunk cut through stands too", swap(IF, `  if true then\n`),
    ["every case of a go at felling is answered as the code answers it", "a trunk cut through fells its tree", "a trunk cut through is a tree felled"]],
  ["the plain way is let through again", swap(PLAIN, ""),
    ["the rule is its earlier text with its pair", "every case of a go at felling is answered as the code answers it", "the plain way is refused still", "the plain press is refused still"]],
];
