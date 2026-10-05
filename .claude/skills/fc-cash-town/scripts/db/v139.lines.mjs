// What v139 changes in two rules it writes again, a line (or a block) at a time: each pair is the text as it stands
// and the text v139 has in its place. `town.bug_at` is v125's; `town.comeback` is v131's. build-v139.mjs writes both
// from them, and v139.test.mjs holds the file to the same.
const THIN = (at) => `  -- hunted, it is ${at === "at_" ? "out" : "back"} less often (lib/town/insects.ts's plentyOf): where the number fell within the insect's own
  -- share of the weights, against how much of itself its kind is ${at === "at_" ? "as the turn begins" : "at the catch"}. Nothing takes its place.
  w := (ins->'bugs'->pick->>'weight')::double precision;
  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, ${at}, ins) then return null; end if;
`;
export const BUG_AT = [
  [`  hi integer;
begin`,
   `  hi integer;
  w double precision;
begin`],
  [`  if pick is null then return null; end if;
`,
   `  if pick is null then return null; end if;
${THIN("at_")}`],
];
export const COMEBACK = [
  [`  hi integer;
begin`,
   `  hi integer;
  w double precision;
begin`],
  [`  lo := (ins->'bugs'->pick->'n'->>0)::int;`,
   `${THIN("p_now")}  lo := (ins->'bugs'->pick->'n'->>0)::int;`],
];
