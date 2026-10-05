// What v140 changes in two rules it writes again, a line at a time: each pair is the text as it stands and the text
// v140 has in its place. `town.feed` is v110's; `town.deed_for` is v119's. build-v140.mjs writes both from them, and
// v140.test.mjs holds the file to the same.
export const FEED = [
  [`     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
`,
   `     or (kind = 'feed' and (p->>'fed')::bigint <> 0) or (kind = 'guard' and (p->>'guard')::bigint > p_now) then return town.no('soil'); end if;
  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed)
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
`],
];
export const DEED_FOR = [
  [`    if kind = 'guard' and (p->>'guard')::bigint <= p_now then return 'feed'; end if;`,
   `    if kind = 'guard' and (p->>'guard')::bigint <= p_now and not (seen->>'pest')::boolean then return 'feed'; end if;`],
];
