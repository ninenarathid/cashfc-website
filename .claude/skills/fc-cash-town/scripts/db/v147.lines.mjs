// What v147 changes in two functions it writes again, a line at a time: each pair is the text as it stands and the
// text v147 has in its place. `town.pest_at` is v118's; `public.town_farm` is v110's. build-v147.mjs writes both from
// them, and v147.test.mjs holds the file to the same.
export const PEST_AT = [
  [`  hour integer;
  ripe boolean;
begin
  loop
`,
   `  hour integer;
  ripe boolean;
  -- what the farm's own insects add to the chance (\`farming.pests.swarm\`), and the hours the farm was counted with
  -- some, from this plant's first hour on (lib/town/farm.ts's Swarms: an hour with no word had none)
  swarm jsonb := f->'pests'->'swarm';
  counted jsonb;
  bugs integer;
begin
  select coalesce(jsonb_object_agg(s.hour::text, s.bugs), '{}'::jsonb) into counted
    from public.town_swarms s where s.hour >= h and s.hour * 3600000 <= p_now and s.bugs > 0;
  loop
`],
  // (the pest that comes at the very moment a plant is rid of one is the one it was rid of)
  [`    if hour >= from_ and hour < to_ and t >= guard then
`,
   `    if hour >= from_ and hour < to_ and t >= guard and t > (p_plant->>'cured')::bigint then
`],
  [`      if town.roll(p_key, h, sown) < chance then return t; end if;
`,
   `      -- (the sum in brackets: an IF's condition ends at the first THEN that is not inside any)
      bugs := coalesce((counted->>(h::text))::int, 0);
      if town.roll(p_key, h, sown) < (chance + case when bugs >= (swarm->>'many')::int then (swarm->'adds'->>1)::double precision
                                                  when bugs >= (swarm->>'some')::int then (swarm->'adds'->>0)::double precision
                                                  else 0::double precision end) then return t; end if;
`],
];
export const TOWN_FARM = [
  [`begin
  return jsonb_build_object(
    'now', town.now_ms(),
`,
   `begin
  -- (somebody is looking at the farm: this hour of the pests' is counted, if it has not been)
  perform town.swarm_note(town.now_ms());
  return jsonb_build_object(
    'now', town.now_ms(),
    'swarms', town.swarms_told(since),
`],
];
