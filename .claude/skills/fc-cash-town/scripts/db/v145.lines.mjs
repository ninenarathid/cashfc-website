// What v145 changes in four functions it writes again, a line at a time: each pair is the text as it stands and the
// text v145 has in its place. `town.feed` and `town.deed_for` are v140's (which wrote the one from v110's and the other
// from v119's); `town.cure` is v110's; `public.town_tend` is v121's. build-v145.mjs writes all four from them, and
// v145.test.mjs holds the file to the same.
export const FEED = [
  [`  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed)
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then return town.no('soil'); end if;
`,
   `  -- what keeps pests off does not take one off: it does not go on a plant that has a pest on it, which is the
  -- cure's to rid first (lib/town/farm.ts's feed). But an insect that eats pests (\`farming.rids\`: how often) is let
  -- go on it: so often it eats the pest, and the plant is rid of it as a cure rids it and covered by nothing; the
  -- other times it is off, and the plant is as it was. Either way the insect and the stamina are gone. Which, by a
  -- number made of the plot, its plant and this very moment (lib/town/farm.ts's ridLuck).
  if kind = 'guard' and (town.see(p_key, p_plot, p_now)->>'pest')::boolean then
    if f->'rids'->>p_hand is null then return town.no('soil'); end if;
    return jsonb_build_object('ok', true,
      'plot', case when town.roll('rid|' || p_key, p_now, (p->>'sown')::bigint) < (f->'rids'->>p_hand)::double precision
                then p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)) else p_plot end,
      'purse', town.spend(p_purse, (f->'costs'->>'feed')::double precision, p_now) || jsonb_build_object('bag', town.take(p_purse->'bag', p_hand, 1)));
  end if;
`],
];
export const DEED_FOR = [
  [`    if kind = 'guard' and (p->>'guard')::bigint <= p_now and not (seen->>'pest')::boolean then return 'feed'; end if;`,
   `    if kind = 'guard' and (p->>'guard')::bigint <= p_now
       and (not (seen->>'pest')::boolean or town.cat('farming')->'rids'->>p_hand is not null) then return 'feed'; end if;`],
];
export const CURE = [
  [`  return jsonb_build_object('ok', true, 'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)),
`,
   `  -- (a cure that keeps pests off afterwards, \`farming.cures\`: the plant is covered for so many hours from this
  -- moment, as by a cover; another only rids it)
  return jsonb_build_object('ok', true, 'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('cured', p_now)
      || case when coalesce((f->'cures'->>p_hand)::bigint, 0) > 0 then jsonb_build_object('guard', p_now + (f->'cures'->>p_hand)::bigint * 3600000) else '{}'::jsonb end),
`],
];
export const TOWN_TEND = [
  [`        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end);
`,
   `        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
`],
];
