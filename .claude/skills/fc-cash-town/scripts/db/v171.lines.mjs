// What v171 changes in the two functions it writes again, a line at a time: each pair is the text as it stands and the
// text v171 has in its place. `town.cook` is v123's and `town.spoon` v153's; both ask the same thing of whatever is
// put in, and v164 left both asking it by a thing's kind alone. v171.test.mjs holds the file to these pairs: each
// function is its earlier text with its pair, and nothing else.
const WAS = `or items->(x->>0) is null or ck->'never' ? (items->(x->>0)->>'kind')`;
// (what goes in is lib/town/cooking's goesIn: never what the catalog's \`putIn.never\` names, always what its
// \`putIn.also\` names, and anything else by its kind)
const NOW = `or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))`;

export const TOWN_COOK = [[`    if (x->>1)::numeric <> floor((x->>1)::numeric) ${WAS}
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;`,
  `    if (x->>1)::numeric <> floor((x->>1)::numeric) ${NOW}
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;`]];

export const TOWN_SPOON = [[`    if (x->>1)::numeric <> floor((x->>1)::numeric) ${WAS}
       or town.held(p_purse->'bag', x->>0) < (x->>1)::numeric then return town.no('none'); end if;`,
  `    if (x->>1)::numeric <> floor((x->>1)::numeric) ${NOW}
       or town.held(p_purse->'bag', x->>0) < (x->>1)::numeric then return town.no('none'); end if;`]];

/** A function's text with its pairs: each earlier text must stand in it exactly once. */
export function withPairs(text, pairs) {
  let out = text;
  for (const [was, now] of pairs) {
    if (out.split(was).length !== 2) throw new Error(`a pair's earlier text stands ${out.split(was).length - 1} times, not once: ${was.slice(0, 80)}`);
    out = out.replace(was, () => now);
  }
  return out;
}
