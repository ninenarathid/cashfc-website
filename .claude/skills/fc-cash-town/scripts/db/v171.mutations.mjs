// The breaks v171.test.mjs must notice, one rule at a time.
// Run: FC_REPO=<tree> node mutate.mjs <tree>/supabase/v171_a_torch_can_be_made.sql v171.test.mjs v171.mutations.mjs
const ALSO = ` and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0))`;
const NEVER = `       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)\n`;
const KIND = `ck->'never' ? (items->(x->>0)->>'kind')`;
/** The n-th place a text stands (the pot's rule is the first, the spoon's the second), swapped; it throws when there is no such place. */
const nth = (a, b, n) => (sql) => {
  let at = -1;
  for (let i = 0; i < n; i++) { at = sql.indexOf(a, at + 1); if (at < 0) throw new Error(`no ${n}. place of: ${a.slice(0, 60)}`); }
  return sql.slice(0, at) + b + sql.slice(at + a.length);
};
export default () => [
  ["the pot does not ask what goes in whatever its kind", nth(ALSO, "", 1),
    ["the pot refuses exactly what does not go in", "one fine timber and one resin by hand are two torches"]],
  ["the pot does not ask what never goes in", nth(NEVER, "", 1),
    ["the pot refuses exactly what does not go in", "a torch put in is refused, and stays in the bag"]],
  ["the pot takes a thing of any kind", nth(KIND, "false", 1),
    ["the pot refuses exactly what does not go in", "a plain log is no fine timber"]],
  ["the spoon does not ask what goes in whatever its kind", nth(ALSO, "", 2),
    ["the spoon refuses exactly what does not go in", "the spoon, asked of fine timber alone, has a recipe to tell of"]],
  ["the spoon does not ask what never goes in", nth(NEVER, "", 2),
    ["the spoon refuses exactly what does not go in"]],
];
