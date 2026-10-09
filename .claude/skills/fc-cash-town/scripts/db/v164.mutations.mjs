// The breaks that only the WHOLE of v164 can have, each with the check of v164.test.mjs that has to notice it (every
// part has its own list for its own rules: v164.<part>.mutations.mjs):
//   FC_REPO=<the worktree's root> node mutate.mjs <the draft> v164.test.mjs v164.mutations.mjs
// A run is a few seconds. The first two are what the assembler is for: a statement of the miners' part built from
// the text that was there before the woodcutters' part ran would undo the woodcutters' block.
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
  const plain = (list) => list.map(([name, mutate, mustFail]) => [name, (sql) => mutate(sql.split("\r\n").join("\n")), mustFail]);
  return plain([
    // ── two parts, one function ──
    ["the miners' statement of town.work_counts_of is built from the text before the woodcutters' part: their block is undone",
      lastCut("  -- ── the mountain's trees (v164): a tree felled", "  -- ── the mountain's trees (v164): its end ──\n"),
      ["town.work_counts_of is the one it replaces", "`town.work_counts_of` and `town.deed_th` carry BOTH blocks", "the far side's deeds count as lib/town/line-points counts them", "a tree felled counts on the woodcutters' line", "…and it counts on the woodcutters' line"]],
    ["the miners' statement of town.deed_th undoes the woodcutters' words",
      lastCut("    -- ── the mountain's trees (v164) ──\n", "    -- ── the mountain's trees (v164): its end ──\n"),
      ["town.deed_th is the one it replaces", "`town.work_counts_of` and `town.deed_th` carry BOTH blocks", "…and each deed of the far side has a word of its own"]],
    // ── an earlier file's function that no part names ──
    ["a function of an earlier file is written again that no part says it writes",
      swap("notify pgrst, 'reload schema';", "create or replace function town.now_ms() returns bigint language sql stable as $$ select (extract(epoch from clock_timestamp()) * 1000)::bigint + 0 $$;\nnotify pgrst, 'reload schema';"),
      ["NO OTHER FUNCTION THAT WAS THERE IS CHANGED"]],
    // ── closed, and for whom ──
    ["it is built open", swap("  ('far_open', 0),", "  ('far_open', 1),"),
      ["three knobs more", "the far side is built closed", "a proved member who is no admin, while it is closed"]],
    ["opened, it is shut again by the next run of the file",
      swap("  ('notice_chip', 10000)    -- and a gem's fragment\n  on conflict (key) do nothing;", "  ('notice_chip', 10000)    -- and a gem's fragment\n  on conflict (key) do update set value = excluded.value;"),
      ["…opened, it stays open"]],
    // (somebody signed out is refused by the gate all the same, 42501: it is the grant itself that the check reads)
    ["what is told of the trees is for somebody signed out",
      swap("revoke execute on function public.town_trees() from public, anon;", "grant execute on function public.town_trees() to anon;"),
      ["the seventeen: each security definer"]],
    ["the last revoke on the schema `town` is left out",
      lastSwap("revoke execute on all functions in schema town from public, anon, authenticated;", "-- (left out)"),
      ["the schema `town` is taken from every browser once more"]],
    // ── the tables ──
    ["the site's key may change a floor that was laid",
      swap("grant select, insert on table public.town_cave_days to service_role;", "grant select, insert, update on table public.town_cave_days to service_role;"),
      ["…the site's key may read and insert the cave's days, and no more"]],
    ["a place of the cave is left for a browser to read",
      swap("revoke all on table public.town_cave from anon, authenticated;", "revoke insert, update, delete on table public.town_cave from anon, authenticated;"),
      ["…each closed: row security on", "the site's key lays the day's thirty floors"]],
    ["a place of the cave is written with no WHERE",
      swap("as $$ update public.town_cave set doc = p_doc, updated_at = now() where place = p_place $$;", "as $$ update public.town_cave set doc = p_doc, updated_at = now() $$;"),
      ["no function writes to a table with no WHERE"]],
    // ── run twice ──
    ["a row the file seeds is written over at every run",
      swap("  on conflict (key) do nothing;\ninsert into public.town_catalog (key, data) values", "  on conflict (key) do update set data = excluded.data, updated_at = now();\ninsert into public.town_catalog (key, data) values"),
      ["…the four rows it seeds are left as they are by a second run"]],
    ["the rocks' word is drawn anew at every run",
      swap("values ('mine', md5(random()::text || clock_timestamp()::text) || md5(random()::text || txid_current()::text))\non conflict (key) do nothing;", "values ('mine', md5(random()::text || clock_timestamp()::text) || md5(random()::text || txid_current()::text))\non conflict (key) do update set word = excluded.word;"),
      ["…and the second run changes nothing"]],
    // ── the file's own shape ──
    ["the API is not told of it", swap("notify pgrst, 'reload schema';\n", ""), ["it begins by saying what it is"]],
    ["the foot says something the file does not do", swap("--   -- 0 | 17\n", "--   -- 0 | 18\n"), ["the queries at its foot say what the file says they say"]],
  ]);
};
