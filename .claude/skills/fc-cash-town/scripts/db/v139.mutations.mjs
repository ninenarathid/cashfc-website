// The breaks v139.test.mjs must notice, one at a time.
// Run: RULES=few node mutate.mjs v139_draft.sql v139.test.mjs v139.mutations.mjs      (FROM=0 TO=7 takes a slice: four side by side)
const CLOSING = "a catch counts for a day, twenty counting halve a kind; a ladybird weighs 6 still; twenty-four insects";
const DIFF = "of the whole catalog two entries differ: the day a catch counts for, and how many halve a kind";
const ROWS = "it writes one row over, the insects', and leaves every other as it was";
const INDEX = "the catches have an index of their own: by insect and moment, the catches alone";
const CLOSED = "the new rule is no browser's, like every rule";
const DURING = "what is caught during a turn changes nothing of that turn: both members are told the same haunts, the same insects";
const HOUR_ON = "an hour on, of the haunts that would have had one of those kinds hardly any has";
const SIXTEENTH = "three hundred caught an hour ago: the kind is a sixteenth of itself";
const DAY_ON = "a day on, everything is as it would have been with nothing caught";
const NEARLY = "half an hour short of a day on, most of them are back and not all: what is left of three hundred catches still counts a little";
const OWN = "its kind is whole at the moment of the catch, a twenty-first less the moment after, and whole again a day on to the millisecond";
const ONLY = "only a catch counts: dragonflies left with the uncle or held by the hundred change nothing";
const BACK = "what comes back is a dragonfly or nothing: never one of the kinds hunted out";
const FEWER = "…and most catches bring nothing back, where every one brought something before";
const THICK = "in the thick of it a dragonfly is under a third of itself; a kind nobody caught is whole; a day after the last catch, and before the first, so is a dragonfly";
const AT = "town.bug_at is v125's, but for the lines of v139.lines.mjs", CB = "town.comeback is v131's, but for the lines of v139.lines.mjs";
const SUM = "  select coalesce(sum(d.n * (day - (p_at - m.ms))), 0) into against";
const THIN_AT = "  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, at_, ins) then return null; end if;\n";
const THIN_BACK = "  if (case when left_ < 0 then (left_ + w) / w else 0 end) >= town.plenty(pick, p_now, ins) then return null; end if;\n";
export default (tools) => all(tools).slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? 1e9));
const all = ({ cut, swap }) => [
  // how plentiful a kind is
  ["nothing ever counts against a kind",
    swap("  return (half * day)::double precision / (half * day + against)::double precision;", "  return 1;"),
    ["hunted, plenty", "hunted, bug_at", HOUR_ON, OWN, THICK]],
  ["a catch counts whole for all of its day, and then not at all",
    swap(SUM, "  select coalesce(sum(d.n * day), 0) into against"),
    ["hunted, plenty", NEARLY, SIXTEENTH]],
  ["a catch of two counts as one",
    swap(SUM, "  select coalesce(sum(1 * (day - (p_at - m.ms))), 0) into against"),
    ["hunted, plenty"]],
  ["whatever is caught counts against every kind",
    swap("   where d.what = 'net' and d.thing = p_bug", "   where d.what = 'net'"),
    ["hunted, plenty", "…and a kind nobody caught is at every haunt it would have been at", THICK]],
  ["whatever is done with an insect counts as catching it",
    swap("   where d.what = 'net' and d.thing = p_bug", "   where d.thing = p_bug"),
    [ONLY]],
  ["a catch counts at its own moment",
    swap("     and m.ms < p_at and m.ms > p_at - day;", "     and m.ms <= p_at and m.ms > p_at - day;"),
    ["hunted, plenty", DURING, OWN]],
  ["a catch counts for two days",
    swap("  day := ((sc->>'day')::numeric * 3600000)::bigint;", "  day := ((sc->>'day')::numeric * 7200000)::bigint;"),
    ["hunted, plenty", DAY_ON, OWN]],
  ["forty halve a kind, whatever the catalog says",
    swap("  half := (sc->>'half')::numeric;", "  half := 2 * (sc->>'half')::numeric;"),
    ["hunted, plenty", SIXTEENTH, OWN]],
  ["with no numbers in the catalog nothing is ever out",
    swap("  if sc is null or p_bug is null or p_at is null then return 1; end if;", "  if sc is null or p_bug is null or p_at is null then return 0; end if;"),
    ["with nothing caught a member is told what the haunts roll, as before the file", "…none has another insect instead, and none has one where there would have been none"]],
  // what a haunt has
  ["a haunt's insect is out however much it is hunted",
    cut(THIN_AT, "  lo := (ins->'bugs'->pick->'n'->>0)::int;"),
    [AT, "hunted, bug_at", HOUR_ON]],
  ["a haunt's insect is judged by the moment of asking, not by its turn's beginning",
    swap(THIN_AT, THIN_AT.replace("town.plenty(pick, at_, ins)", "town.plenty(pick, p_now, ins)")),
    [AT, "hunted, bug_at", DURING]],
  ["a hunted insect is out more often, a plentiful one never",
    swap(THIN_AT, THIN_AT.replace(">= town.plenty", "< town.plenty")),
    [AT, "hunted, bug_at", "unhunted, bug_at", "with nothing caught a member is told what the haunts roll, as before the file"]],
  ["a haunt's insect is thinned by a number that is always nothing",
    swap(THIN_AT, THIN_AT.replace("(left_ + w) / w else 0 end", "0 else 0 end")),
    [AT, "hunted, bug_at", HOUR_ON]],
  ["a haunt's insect is thinned by the roll itself, so the first of the weights goes first",
    swap(THIN_AT, THIN_AT.replace("(left_ + w) / w else 0 end", "(left_ + total) / total else 0 end")),
    [AT, "hunted, bug_at"]],
  // what comes back
  ["a hunted kind comes back as ever",
    cut(THIN_BACK, "  lo := (ins->'bugs'->pick->'n'->>0)::int;\n  hi := (ins->'bugs'->pick->'n'->>1)::int;\n  return jsonb_build_object('haunt', i,"),
    [CB, "hunted, comeback", BACK]],
  ["what comes back is judged by the moment it comes, not by the catch",
    swap(THIN_BACK, THIN_BACK.replace("town.plenty(pick, p_now, ins)", "town.plenty(pick, at_, ins)")),
    [CB]],
  ["only a hunted kind comes back",
    swap(THIN_BACK, THIN_BACK.replace(">= town.plenty", "< town.plenty")),
    [CB, "hunted, comeback", "unhunted, comeback"]],
  // the numbers
  ["forty halve a kind",
    swap('"scarce": {"day":24,"half":20}', '"scarce": {"day":24,"half":40}'),
    [CLOSING, DIFF, "hunted, plenty", SIXTEENTH]],
  ["a catch counts for two days, by the catalog",
    swap('"scarce": {"day":24,"half":20}', '"scarce": {"day":48,"half":20}'),
    [CLOSING, DIFF, "hunted, plenty", DAY_ON]],
  ["the catalog is not told of it at all",
    swap(',\n    "scarce": {"day":24,"half":20}', ""),
    [CLOSING, DIFF, "hunted, plenty", "hunted, bug_at", HOUR_ON]],
  ["a ladybird weighs sixty again while it is at it",
    swap('"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":6,', '"ladybird":{"habit":"crawl","at":["field","blooms"],"weight":60,'),
    [CLOSING, DIFF, "unhunted, bug_at"]],
  ["the row that is there is left as it is",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    [ROWS, CLOSING, DIFF, "hunted, plenty"]],
  // the keeping
  ["the index is of every deed",
    swap("create index if not exists town_deeds_net on public.town_deeds (thing, at) where what = 'net';", "create index if not exists town_deeds_net on public.town_deeds (thing, at);"),
    [INDEX]],
  ["there is no index",
    swap("create index if not exists town_deeds_net on public.town_deeds (thing, at) where what = 'net';", ""),
    [INDEX, "a kind's day of catches is found by the index, not by reading every deed"]],
  ["the rules are left open to whoever is signed in",
    swap("revoke execute on all functions in schema town from public, anon, authenticated;", ""),
    [CLOSED]],
  ["it runs whatever has run before it",
    cut("  if to_regprocedure('town.comeback(integer, bigint, jsonb, double precision, double precision, double precision, jsonb, text)') is null then", "  if to_regclass('public.town_deeds') is null then"),
    ["run before v131, it stops at its first line and says why"]],
];
