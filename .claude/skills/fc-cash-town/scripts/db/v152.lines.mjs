// What v152 changes in functions that earlier files wrote: the familiars (lib/town/gifts).
// build-v152.mjs writes each function into the file from its own last text with these lines changed, and v152's dry
// run holds the file to the same: nothing else in them moves.

/** town.gifts_of (v151's): a purse's gifts say which familiar follows, if it is one that was taken and is a familiar; and keep what was used of the gifts that are counted. */
export const GIFTS_OF = [
  ["  owed double precision := 0;\n", "  owed double precision := 0;\n  fam text;\n"],
  [
    "  return jsonb_build_object('had', had, 'charms', charms, 'owed', owed);\n",
    "  if jsonb_typeof(kept->'familiar') = 'string' and had ? (kept->>'familiar') and g->'gifts'->(kept->>'familiar')->>'kind' = 'familiar' then fam := kept->>'familiar'; end if;\n" +
    "  return jsonb_build_object('had', had, 'charms', charms, 'owed', owed, 'familiar', fam,\n" +
    "    'used', case when jsonb_typeof(kept->'used') = 'object' then kept->'used' else '{}'::jsonb end);\n",
  ],
];

/** town.work_answer (v151's): it says which gifts are given, so that the page offers those and no other. */
export const WORK_ANSWER = [[
  "  select jsonb_build_object('now', town.now_ms(), 'gifting', true,\n",
  "  select jsonb_build_object('now', town.now_ms(), 'gifting', true,\n" +
  "    'gives', (select coalesce(jsonb_agg(k.id order by k.id), '[]'::jsonb) from jsonb_object_keys(town.cat('gifts')->'gifts') as k(id)),\n",
]];
