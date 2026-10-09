// The breaks v172.test.mjs must notice, one rule at a time.
// Run: FC_REPO=<tree> TOWN_VECTORS=<the folder with vectors-felling.json> node mutate.mjs <tree>/supabase/v172_a_tree_is_felled_at_its_board.sql v172.test.mjs v172.mutations.mjs
const LINE = `  if plain_ then return town.no('board'); end if;\n`;
/** A text that stands once, swapped; it throws when it does not stand once. */
const swap = (a, b) => (sql) => {
  if (sql.split(a).length !== 2) throw new Error(`stands ${sql.split(a).length - 1} times, not once: ${a.slice(0, 60)}`);
  return sql.replace(a, () => b);
};
export default () => [
  ["the plain way is not refused", swap(LINE, ""),
    ["the rule is its earlier text with its pair", "every case of a go at felling is answered as the code answers it", "the plain way is refused, as the board's", "the plain press is refused, as the board's", "the file's own look says the board's refusal"]],
  ["the plain way is refused with another word", swap(LINE, LINE.replace("'board'", "'none'")),
    ["every case of a go at felling is answered as the code answers it", "the plain way is refused, as the board's", "the plain press is refused, as the board's"]],
  ["the board is refused with it", swap(LINE, LINE.replace("if plain_ then", "if plain_ or board_ then")),
    ["every case of a go at felling is answered as the code answers it", "a go lost on the board still fells its tree for its logs", "a board put up and played is a tree felled"]],
  ["an axe's own chop is refused with it", swap(LINE, LINE.replace("if plain_ then", "if not board_ then")),
    ["every case of a go at felling is answered as the code answers it"]],
  ["the plain way is refused before an axe is asked for",
    (sql) => swap("  if first_ is null then return town.no('none'); end if;\n", `  if first_ is null then return town.no('none'); end if;\n  if coalesce(p_went->'plain' = 'true'::jsonb, false) and not one_ then return town.no('board'); end if;\n`)(swap(LINE, "")(sql)),
    ["the rule is its earlier text with its pair", "what was refused before the plain way was looked at is refused for its own reason still"]],
];
