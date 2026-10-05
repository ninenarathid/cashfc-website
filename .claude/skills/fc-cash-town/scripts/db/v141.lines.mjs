// The lines v141 changes, each as it was in v129 and as it is: the jar's one row is written by its key.
// (build-v141.mjs writes the two functions from v129's own text with these; v141's dry run holds the file to the same.)
export const JAR_NOW = [[
  "  update public.town_jar j set round = (jar->>'round')::integer, coins = (jar->>'coins')::integer, things = jar->'things';",
  "  update public.town_jar j set round = (jar->>'round')::integer, coins = (jar->>'coins')::integer, things = jar->'things' where j.one;",
]];
export const JAR_DROP = [[
  "    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things';",
  "    update public.town_jar j set coins = (did->'jar'->>'coins')::integer, things = did->'jar'->'things' where j.one;",
]];
