// The breaks v109.test.mjs must notice.
// Run: node mutate.mjs "E:/NinenineProject/fcnext/supabase/v109_the_uncle_stocks_up.sql" v109.test.mjs v109.mutations.mjs
export default ({ swap }) => [
  ["the rows that are there are left as they are",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    ["shelf_of:", "the catalog's thirteen rows, the seven it writes and the six it leaves", "eighty-eight hints to sell"]],
  ["a row written over keeps its old date",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do update set data = excluded.data;"),
    ["the catalog's thirteen rows, the seven it writes and the six it leaves"]],
  ["a clay pot still fetches coins",
    swap(`"pot": {"kind":"tool","tier":1,"stack":1,"pays":0}`, `"pot": {"kind":"tool","tier":1,"stack":1,"pays":40}`),
    ["a pot fetches nothing, flour is the second tier's, and the new things are there", "the uncle's relatives do not take a clay pot"]],
  ["seaweed is dearer in the database than in the code",
    swap(`"seaweed": {"price":8,`, `"seaweed": {"price":9,`),
    ["…and seaweed is bought, eight coins a sheet"]],
  ["flour is still the third tier's",
    swap(`"flour": {"kind":"staple","tier":2,`, `"flour": {"kind":"staple","tier":3,`),
    ["a pot fetches nothing, flour is the second tier's, and the new things are there"]],
];
