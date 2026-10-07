// The breaks v155.test.mjs must notice, one at a time.
// Run: FC_REPO=<the worktree's root> node mutate.mjs <the draft> v155.test.mjs v155.mutations.mjs
//
// The file is seven lines and a first block, so the breaks are: a line left out, a line that no longer asks what the
// number was, a number that is not the code's, a knob touched that is not one of the seven, and the first block gone.
const LINES = [
  ["crop", "update public.town_knobs set value = 15 where key = 'market_crop'  and value = 30;", "update public.town_knobs set value = 15 where key = 'market_crop';"],
  ["fish", "update public.town_knobs set value = 8  where key = 'market_fish'  and value = 15;", "update public.town_knobs set value = 8  where key = 'market_fish';"],
  ["catch", "update public.town_knobs set value = 5  where key = 'market_catch' and value = 10;", "update public.town_knobs set value = 5  where key = 'market_catch';"],
  ["dish", "update public.town_knobs set value = 8  where key = 'market_dish'  and value = 15;", "update public.town_knobs set value = 8  where key = 'market_dish';"],
  ["goods", "update public.town_knobs set value = 8  where key = 'market_goods' and value = 15;", "update public.town_knobs set value = 8  where key = 'market_goods';"],
  ["wild", "update public.town_knobs set value = 8  where key = 'market_wild'  and value = 15;", "update public.town_knobs set value = 8  where key = 'market_wild';"],
  ["bug", "update public.town_knobs set value = 4  where key = 'market_bug'   and value = 7;", "update public.town_knobs set value = 4  where key = 'market_bug';"],
];
const all = ({ swap, cut }) => [
  ...LINES.map(([kind, line]) => [`the usual amount of a ${kind} is left as it was`, swap(line, ""),
    ["the seven usual amounts are halved", "which are the numbers the site's own code has"]]),
  ...LINES.map(([kind, line, bare]) => [`a ${kind}'s number somebody turned is turned back`, swap(line, bare),
    ["a number somebody has turned since stays turned"]]),
  ["a vegetable's usual amount is not the code's",
    swap("set value = 15 where key = 'market_crop'", "set value = 16 where key = 'market_crop'"),
    ["the seven usual amounts are halved", "which are the numbers the site's own code has", "every thing whose price moves"]],
  ["the least a price is, is turned with them",
    swap("-- ─── Checking it", "update public.town_knobs set value = 20 where key = 'market_floor';\n-- ─── Checking it"),
    ["every other knob of the town's is as it was", "the least and the most each price is are as they were"]],
  ["how fast a price falls is turned with them",
    swap("-- ─── Checking it", "update public.town_knobs set value = 50 where key = 'market_fall';\n-- ─── Checking it"),
    ["every other knob of the town's is as it was", "which are the numbers the site's own code has"]],
  ["it does not look for the seven before it begins",
    cut("do $$ begin", "-- ─── The usual amounts"),
    ["where one of the seven is not there, it stops at its first line and says why"]],
];
export default (h) => all(h).slice(Number(process.env.FROM ?? 0), process.env.TO ? Number(process.env.TO) : undefined);
