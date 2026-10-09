// The breaks that only the WHOLE of v174 can have, each with the check of v174.test.mjs that has to notice it (each
// part has its own list for its own rules: v174.smith.mutations.mjs, v174.tools.mutations.mjs):
//   CASES=0 FC_REPO=<the worktree's root> node mutate.mjs <the draft> v174.test.mjs v174.mutations.mjs
// (FROM=<n> TO=<m> takes a slice of the list, for running it in parts side by side. A run is some twenty seconds with
// CASES=0, which leaves the rule cases out: no break here is a rule's.)
//
// What each is here for: the guard; a part dropped; the parts in the wrong order, and a statement built from the text
// before the part above it (what the assembler is for); the catalog block stale; who may; the gate left open, and
// shut again by a second run; a table left open; a write with no WHERE; the file's own shape.
export default ({ swap }) => {
  /** From the LAST place `from` is in the file, to the end of the `to` that follows it: taken out. */
  const lastCut = (from, to) => (s) => {
    const a = s.lastIndexOf(from), b = a < 0 ? -1 : s.indexOf(to, a);
    if (a < 0 || b < 0 || s.indexOf(from) === a) throw new Error(`mutation anchor missing, or there only once: ${from}`);
    return s.slice(0, a) + s.slice(b + to.length);
  };
  const lastSwap = (from, to) => (s) => {
    const a = s.lastIndexOf(from);
    if (a < 0 || s.indexOf(from) === a) throw new Error(`mutation anchor missing, or there only once: ${from}`);
    return s.slice(0, a) + to + s.slice(a + from.length);
  };
  /** From the first `from` up to (not with) the first `to` after it: taken out. */
  const cutTo = (from, to) => (s) => {
    const a = s.indexOf(from), b = a < 0 ? -1 : s.indexOf(to, a + from.length);
    if (a < 0 || b < 0) throw new Error(`mutation anchor missing: ${a < 0 ? from : to}`);
    return s.slice(0, a) + s.slice(b);
  };
  const P1 = "-- ═══ Part 1 of 2:", P2 = "-- ═══ Part 2 of 2:", END = "-- ─── Nobody calls a rule of schema town";
  /** The two parts, the second before the first. */
  const partsSwapped = (s) => {
    const a = s.indexOf(P1), b = s.indexOf(P2), c = s.indexOf(END);
    if (a < 0 || b < a || c < b) throw new Error("mutation anchor missing: the parts' titles");
    return s.slice(0, a) + s.slice(b, c) + s.slice(a, b) + s.slice(c);
  };
  const plain = (list) => list.map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
  const all = plain([
    // ── the guard ──
    ["the guard is left out: the file runs on a database that has not had v173",
      cutTo("do $$ begin\n  if to_regprocedure('town.fell(", "-- ═══ Part 1 of 2:"),
      ["its first statement is the guard", "on the database as it was after v172 the file stops", "…and nothing of it is made there"]],
    ["the guard looks for v172's block, which a database without v173 has",
      swap("     or coalesce(position('v173:' in (select p.prosrc", "     or coalesce(position('v172:' in (select p.prosrc"),
      ["its first statement is the guard", "on the database as it was after v172 the file stops"]],
    // ── the parts ──
    ["the older tools' part is dropped", cutTo(P2, END),
      ["no place of a part is left empty", "127 functions more and none gone", "town.net is the one it replaces", "two tables more; two columns more"]],
    ["the parts are in the wrong order: the smith's statement of town.work_counts_of comes last and undoes the older tools' lines", partsSwapped,
      ["the smith's part comes first and the older tools' after it", "town.work_counts_of is the one it replaces", "`town.work_counts_of` carries the smith's block AND the older tools' lines"]],
    ["the older tools' statement of town.work_counts_of is built from the text before the smith's part: his block is undone",
      lastCut("  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──\n", "  -- ── the blacksmith (v174): its end ──\n"),
      ["the smith's part comes first and the older tools' after it", "town.work_counts_of is the one it replaces", "`town.work_counts_of` carries the smith's block AND the older tools' lines", "…the bellows worked for somebody else count on the helpers' line now"]],
    ["a function of an earlier file is written again that no part says it writes",
      swap("notify pgrst, 'reload schema';", "create or replace function town.now_ms() returns bigint language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint + 0 $$;\nnotify pgrst, 'reload schema';"),
      ["NO OTHER FUNCTION THAT WAS THERE IS CHANGED"]],
    // ── the catalog ──
    ["the catalog block is stale: the table's numbers of the try for +5 are the ones before the owner's ruling",
      swap('{"to":5,"take":90,"stay":10,"down":0,"fee":150,"ore":"oreIron","n":3,"timber":12}', '{"to":5,"take":90,"stay":10,"down":0,"fee":150,"ore":"oreIron","n":1,"timber":4}'),
      ["the catalog is the code's now", "the queries at its foot say what the file says they say"]],
    // ── who may, and the gate ──
    ["a try at the smith is for somebody signed out",
      swap("revoke execute on function public.town_smith_try(integer) from public, anon;", "grant execute on function public.town_smith_try(integer) to anon;"),
      ["the sixteen: each security definer"]],
    // (the older tools' part ends with the same revoke, after its last function: the file's last one left out alone is
    // no break, and was not noticed. Both left out, the part's rules are anybody's to call after the first run, and
    // only a second run, which reaches the smith's revoke again, would take them back.)
    ["the revoke on the schema `town` is left out after the older tools' part, and at the file's end",
      (s) => lastSwap("revoke execute on all functions in schema town from public, anon, authenticated;", "-- (left out)")(lastSwap("revoke execute on all functions in schema town from public, anon, authenticated;", "-- (left out)")(s)),
      ["the schema `town` is taken from every browser once more", "…and the second run changes nothing", "nothing of the schema `town` is anybody's to call"]],
    ["the smith is built open", swap("  ('smith_open', 0) ", "  ('smith_open', 1) "),
      ["one knob more, the smith's, at 0", "the queries at its foot say what the file says they say"]],
    ["opened, the smith is shut again by the next run of the file",
      swap("-- whether the blacksmith is open to every proved character: until it is, to admins only\n  on conflict (key) do nothing;", "-- whether the blacksmith is open to every proved character: until it is, to admins only\n  on conflict (key) do update set value = excluded.value;"),
      ["every smithy, the fire, the board, the knob"]],
    // ── what is kept ──
    ["the great fire's row is left for a browser to read",
      swap("revoke all on table public.town_great_fire from anon, authenticated;", "revoke insert, update, delete on table public.town_great_fire from anon, authenticated;"),
      ["…the two tables closed: row security on"]],
    ["the great fire is written with no WHERE",
      swap("as $$ update public.town_great_fire set doc = p_doc, updated_at = now() where one $$;", "as $$ update public.town_great_fire set doc = p_doc, updated_at = now() $$;"),
      ["no function writes to a table with no WHERE"]],
    // ── the file's own shape ──
    ["the API is not told of it", swap("notify pgrst, 'reload schema';\n", ""), ["it begins by saying what it is"]],
    ["the foot says something the file does not do", swap("--   -- 0 | 16\n", "--   -- 0 | 17\n"), ["the queries at its foot say what the file says they say"]],
  ]);
  return all.slice(Number(process.env.FROM ?? 0), Number(process.env.TO ?? all.length));
};
