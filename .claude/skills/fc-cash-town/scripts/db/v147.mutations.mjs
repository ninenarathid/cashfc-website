// The breaks v147.test.mjs must notice, one at a time.
// Run: RULES=few node mutate.mjs v147_draft.sql v147.test.mjs v147.mutations.mjs      (FROM=0 TO=5 takes a slice: eight side by side)
//      node check-anchors.mjs v147_draft.sql v147.mutations.mjs <a log of the dry run>     first: every anchor and every check's name
//
// Not on the list, because nothing can tell: the `revoke` of the rules at the file's foot taken away (a new function in
// a schema no browser may use is refused all the same, and one written again keeps who may call it).
const STOP = "run before v145, it stops at its first lines and says why";
const WRITES = "it writes one row over, the farm's, and leaves every other as it was";
const NUMBERS = "the pests' numbers: three in a hundred";
const CLOSED = "the table is there and closed, and the farm's insects can be counted";
const PRIV = "the rules are no browser's, new or written again; the farm is a member's to look at and nobody else's";
const THREE = "of the whole catalog three entries differ";
const PEST_IS = "town.pest_at is v118's, but for the lines of v147.lines.mjs", FARM_IS = "public.town_farm is v110's, but for the lines of v147.lines.mjs";
const LONE = "before the file no pest came to a plant that one comes to now";
const COUNT = "at every moment of a day, a quarter hour or so apart, it is what a member who has caught nothing is told";
const CAUGHT = "one of them caught by somebody: one fewer is counted", OTHER_TURN = "…a catch in another turn of a haunt's takes nothing off";
const BACK = "an insect come back to it after a catch is counted like any; a ladybird come back is not";
const LOOK = "a member looks at the farm at seven past ten: the hour is counted", TELLS = "…and the answer tells it, beside the plots, the beds and the well as ever";
const ALL_CAUGHT = "(five minutes on every insect on the farm is caught: none is counted now)";
const ONCE = "another look in the same hour counts nothing again", NOT_AGAIN = "a page that has asked since is told no hour again";
const SLACK = "…but one that asked as the hour was being counted is told it once more", NEXT = "the next hour, looked at with every insect on the farm caught: counted with none";
const SEVEN = "a look at seven in the morning counts no hour", SIX = "a look at six in the evening counts no hour", EDGE = "a look on the stroke of eight is the day's first hour counted";
const FORTNIGHT = "a fortnight on, a page that asks for the first time is told the hours", MONTH = "thirty-three days on, it is told none of those hours";
const SOME = "with some insects counted for nine o'clock it has none still", MANY = "with many counted for nine o'clock it has had a pest since the stroke of nine";
const STROKE = "a plant rid of its pest on the very stroke of the hour it came is rid of it";
const READ = "the hours are not read from outside by a member";

const ADD_MANY = "then (swarm->'adds'->>1)::double precision", ADD_SOME = "then (swarm->'adds'->>0)::double precision";
const NOTE = "  insert into public.town_swarms (hour, bugs, noted) values (h, town.farm_bugs(p_now), p_now) on conflict (hour) do nothing;";
const then = (...steps) => (s) => steps.reduce((sql, step) => step(sql), s);
export default (tools) => all(tools).slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? 1e9));
const all = ({ cut, swap }) => [
  // when a pest struck
  ["an hour with many insects adds nothing",
    swap(ADD_MANY, "then 0::double precision"),
    [PEST_IS, "many, pest_at:", LONE, MANY]],
  ["an hour with some insects adds nothing",
    swap(ADD_SOME, "then 0::double precision"),
    [PEST_IS, "some, pest_at:"]],
  ["some insects add what many add",
    swap(ADD_SOME, "then (swarm->'adds'->>1)::double precision"),
    [PEST_IS, "some, pest_at:", SOME]],
  ["many insects add only what some add",
    swap(ADD_MANY, "then (swarm->'adds'->>0)::double precision"),
    [PEST_IS, "many, pest_at:", MANY]],
  ["four insects are not yet many: it takes one more",
    swap("when bugs >= (swarm->>'many')::int", "when bugs > (swarm->>'many')::int"),
    [PEST_IS, "uneven, pest_at:"]],
  ["one insect is not yet some: it takes one more",
    swap("when bugs >= (swarm->>'some')::int", "when bugs > (swarm->>'some')::int"),
    [PEST_IS, "uneven, pest_at:"]],
  ["an hour is read by the count of the hour before it",
    swap("bugs := coalesce((counted->>(h::text))::int, 0);", "bugs := coalesce((counted->>((h - 1)::text))::int, 0);"),
    [PEST_IS, "uneven, pest_at:", MANY]],
  ["the plant's first hour is left out of the hours read",
    swap("from public.town_swarms s where s.hour >= h and", "from public.town_swarms s where s.hour > h and"),
    [PEST_IS, "some, pest_at:", "many, pest_at:"]],
  ["an hour that begins at the very moment asked about is left out of the hours read",
    swap("s.hour * 3600000 <= p_now and s.bugs > 0;", "s.hour * 3600000 < p_now and s.bugs > 0;"),
    [PEST_IS, "some, pest_at:", "many, pest_at:"]],
  ["a plant cured on the stroke of an hour has that hour's pest still, as it had",
    swap(" and t > (p_plant->>'cured')::bigint then", " then"),
    [PEST_IS, STROKE, "none, pest_at:"]],
  ["no pest comes for an hour after a cure",
    swap(" and t > (p_plant->>'cured')::bigint then", " and t > (p_plant->>'cured')::bigint + 3600000 then"),
    [PEST_IS, "none, pest_at:"]],
  // the farm as everybody sees it
  ["looking at the farm counts no hour",
    cut("  perform town.swarm_note(town.now_ms());\n", "  return jsonb_build_object(\n    'now', town.now_ms(),\n    'swarms'"),
    [FARM_IS, LOOK]],
  ["the page is told no hours",
    swap("    'swarms', town.swarms_told(since),\n", ""),
    [FARM_IS, TELLS]],
  ["the page is told every hour at every look",
    swap("'swarms', town.swarms_told(since),", "'swarms', town.swarms_told(0),"),
    [FARM_IS, NOT_AGAIN]],
  // an hour counted
  ["an hour is counted again at every look",
    then(swap("  if exists (select 1 from public.town_swarms s where s.hour = h) then return; end if;\n", ""), swap(NOTE, NOTE.replace("do nothing;", "do update set bugs = excluded.bugs, noted = excluded.noted;"))),
    [ONCE]],
  ["every hour is counted, the pests' or not",
    swap("  if of_day < (f->'pests'->>'from')::int or of_day >= (f->'pests'->>'to')::int then return; end if;\n", ""),
    [SEVEN, SIX]],
  ["six in the evening is counted as one of the pests' hours",
    swap("or of_day >= (f->'pests'->>'to')::int then return;", "or of_day > (f->'pests'->>'to')::int then return;"),
    [SIX]],
  ["eight in the morning is not counted",
    swap("if of_day < (f->'pests'->>'from')::int or", "if of_day <= (f->'pests'->>'from')::int or"),
    [EDGE]],
  ["the hour counted is the one before",
    swap("  h bigint := floor(p_now::numeric / 3600000)::bigint;\n  -- (the hour of the day", "  h bigint := floor(p_now::numeric / 3600000)::bigint - 1;\n  -- (the hour of the day"),
    [LOOK]],
  ["an hour is counted with none, whatever is on the farm",
    swap(NOTE, NOTE.replace("town.farm_bugs(p_now)", "0")),
    [LOOK, TELLS]],
  ["an hour is noted as counted at midnight of the first day",
    swap(NOTE, NOTE.replace("town.farm_bugs(p_now), p_now)", "town.farm_bugs(p_now), 0)")),
    // (a page that asks for the first time is told it all the same; one that has asked since never is)
    [LOOK, SLACK]],
  // the count
  ["the insects that eat pests are counted with the rest",
    swap("    continue when has is null or rids ? (has->>'bug');", "    continue when has is null;"),
    [COUNT, BACK]],
  ["what somebody has caught is counted still",
    swap("    continue when taken >= (ins->'kinds'->(ins->'haunts'->i->>0)->>'shares')::int;\n", ""),
    [CAUGHT, ALL_CAUGHT]],
  ["every map's insects are counted",
    swap("    continue when ins->'haunts'->i->>1 <> 'farm';\n", ""),
    [COUNT]],
  ["a catch in any turn of a haunt's takes its insect off the count",
    swap(" and tk.turn = (has->>'turn')::bigint;", ";"),
    [OTHER_TURN]],
  ["what came back after a catch is not counted",
    swap("  backs jsonb := town.backs_now(p_now);\n  rids jsonb", "  backs jsonb := '[]'::jsonb;\n  rids jsonb"),
    [BACK]],
  // what the page is told
  ["hours with no insect are told too",
    swap("   where s.bugs > 0 and s.noted > p_since", "   where s.noted > p_since"),
    [NEXT]],
  ["the hours are told for ever",
    swap(" and s.hour > floor(town.now_ms()::numeric / 3600000)::bigint - 30 * 24", ""),
    [MONTH]],
  ["only a week of hours is told",
    swap("::bigint - 30 * 24", "::bigint - 7 * 24"),
    [FORTNIGHT]],
  ["an hour counted at the moment a page last asked is never told to it",
    swap("s.noted > p_since and", "s.noted > p_since + 10000 and"),
    [SLACK]],
  // who may
  ["the hours are a member's to read",
    swap("revoke all on public.town_swarms from anon, authenticated;", "grant select on public.town_swarms to authenticated;"),
    [CLOSED, READ]],
  ["the hours have no row-level security",
    swap("alter table public.town_swarms enable row level security;\n", ""),
    [CLOSED]],
  ["the farm is given to whoever is signed out",
    swap("revoke execute on function public.town_farm(bigint) from public, anon;", "grant execute on function public.town_farm(bigint) to anon;"),
    [PRIV]],
  ["the farm is taken from the members",
    swap("grant execute on function public.town_farm(bigint) to authenticated;", "revoke execute on function public.town_farm(bigint) from authenticated;"),
    [PRIV, LOOK]],
  ["the rules are given to the browser",
    swap("revoke execute on all functions in schema town from public, anon, authenticated;", "grant execute on all functions in schema town to authenticated;"),
    [PRIV]],
  // the numbers
  ["many insects add no more than some do",
    swap(`"adds":[0.01,0.02]`, `"adds":[0.01,0.01]`),
    [NUMBERS, THREE, "many, pest_at:", MANY]],
  ["it takes seven insects to be many",
    swap(`"many":4`, `"many":7`),
    [NUMBERS, THREE, "many, pest_at:", MANY]],
  ["the row is seeded only where there is none: nothing is written over",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    [WRITES, NUMBERS, THREE, "some, pest_at:", "run again, it writes its row over again"]],
  // the file
  ["it runs whatever has run before it",
    cut("  if (select c.data->'rids' from public.town_catalog c where c.key = 'farming') is null then", "end $$;"),
    [STOP]],
];
