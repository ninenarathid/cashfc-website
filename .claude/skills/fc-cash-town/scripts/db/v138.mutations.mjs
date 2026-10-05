// The breaks v138.test.mjs must notice, one at a time.
// Run: RULES=few node mutate.mjs <the file> v138.test.mjs v138.mutations.mjs      (FROM=0 TO=5 takes a slice: four side by side)
const LADYBIRD = "a ladybird weighs 6, keeps to no map, is out from six to six under a dry sky, and has its chance in ten still";
const DIFF = "of the whole catalog four entries differ, all the ladybird's: its weight, its maps, its hours, its sky";
const ROWS = "it writes one row over, the insects', and leaves every other as it was";
const SUM = "there are twenty-four insects still, and their weights come to 1,560";
const FEW = "…a few on each, where the farm and the town had scores: under thirty on a map in the day, and not a third of what there were in all";
const EVERY_MAP = "after it there are some on every map: the farm, the town and the forest";
const HOURS = "none before six in the morning, none from six in the evening";
const DAWN = "after it, of none at that hour, though the look itself is answered";
const RAIN = "…and after it none: not in the rain, nor in the half hour after it";
const FOREST = "a member in the town is told of one in the forest, at its haunt, in its turn";
const IS = '"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":6,"n":[1,1],"cost":1,"hours":[[6,18]],"dry":true,"rids":0.1}';
const but = (a, b) => IS.replace(a, b);
export default (tools) => all(tools).slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? 1e9));
const all = ({ swap }) => [
  // few
  ["a ladybird weighs what it did",
    swap(IS, but('"weight":6,', '"weight":60,')),
    [LADYBIRD, SUM, DIFF, FEW, "bug_at"]],
  ["a ladybird weighs as much as a butterfly",
    swap(IS, but('"weight":6,', '"weight":100,')),
    [LADYBIRD, SUM, DIFF, FEW, "bug_at"]],
  ["there are no ladybirds at all",
    swap(IS, but('"weight":6,', '"weight":0,')),
    [LADYBIRD, SUM, DIFF, EVERY_MAP, "bug_at"]],
  // anywhere
  ["it keeps to the farm and the town still",
    swap(IS, but('"cost":1,', '"cost":1,"places":["farm","town"],')),
    [LADYBIRD, DIFF, EVERY_MAP, FOREST, "bug_at"]],
  ["it keeps to the forest alone",
    swap(IS, but('"cost":1,', '"cost":1,"places":["forest"],')),
    [LADYBIRD, DIFF, EVERY_MAP, "bug_at"]],
  ["it is out at the water too",
    swap(IS, but('"at":["field","blooms"]', '"at":["field","blooms","water"]')),
    [LADYBIRD, DIFF, "bug_at"]],
  // never the only one
  ["it is out from five, when nothing else of its haunts is",
    swap(IS, but('"hours":[[6,18]]', '"hours":[[5,18]]')),
    [LADYBIRD, DIFF, HOURS, DAWN, "bug_at"]],
  ["it is out all night",
    swap(IS, but('"hours":[[6,18]],', "")),
    [LADYBIRD, DIFF, HOURS, DAWN]],
  ["it is out in the rain, when the butterfly is not",
    swap(IS, but('"dry":true,', "")),
    [LADYBIRD, DIFF, RAIN, "bug_at"]],
  // what was to stay
  ["a ladybird caught takes no pest with it any more",
    swap(IS, but(',"rids":0.1', "")),
    [LADYBIRD, DIFF]],
  ["…or takes one every time",
    swap(IS, but('"rids":0.1', '"rids":1')),
    [LADYBIRD, DIFF]],
  ["a catch of one costs three points of stamina while it is at it",
    swap(IS, but('"cost":1,', '"cost":3,')),
    [LADYBIRD, DIFF, "net"]],
  ["a grasshopper is rarer while it is at it",
    swap('"grasshopper":{"habit":"behind","at":["field"],"weight":100,', '"grasshopper":{"habit":"behind","at":["field"],"weight":50,'),
    [SUM, DIFF, "bug_at"]],
  ["a haunt of grass has an insect less often",
    swap('"field":{"every":10,"chance":0.55,"shares":1}', '"field":{"every":10,"chance":0.3,"shares":1}'),
    [DIFF, "bug_at"]],
  ["a haunt of flowers turns every half hour",
    swap('"blooms":{"every":10,"chance":0.55,"shares":1}', '"blooms":{"every":30,"chance":0.55,"shares":1}'),
    [DIFF, "bug_at"]],
  ["an insect is three members' again",
    swap('"field":{"every":10,"chance":0.55,"shares":1}', '"field":{"every":10,"chance":0.55,"shares":3}'),
    [DIFF]],
  ["an insect comes back five minutes later",
    swap('"comeback": {"after":30,"least":120}', '"comeback": {"after":300,"least":120}'),
    [DIFF, "comeback"]],
  // the writing itself
  ["the row that is there is left as it is",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    [ROWS, LADYBIRD, DIFF, FEW]],
  ["the row is written, and not said to have been",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do update set data = excluded.data;"),
    [ROWS]],
  ["the insects are written into another row",
    swap("  ('insects', $town${", "  ('carries', $town${"),
    [ROWS, "a number an admin changed by hand in a row it does not write is as it was"]],
];
