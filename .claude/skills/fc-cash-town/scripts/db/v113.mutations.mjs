// The breaks v113.test.mjs must notice, one rule at a time.
// Run: node mutate.mjs <the file> v113.test.mjs v113.mutations.mjs   (each run replays v105 to v112 and every case: minutes apiece)
export default ({ cut, swap }) => [
  /* ── the number ── */
  ["a bag still begins with five",
    swap('    "slots": 10,', '    "slots": 5,'),
    ["a bag begins with ten slots; the uncle's hours and the dawn are as they were"]],
  ["the row that is there is left as it is",
    swap("  on conflict (key) do update set data = excluded.data, updated_at = now();", "  on conflict (key) do nothing;"),
    ["a bag begins with ten slots; the uncle's hours and the dawn are as they were"]],
  ["the uncle's rounds are moved while it is at it",
    swap('    "rounds": [7,19],', '    "rounds": [8,19],'),
    ["a bag begins with ten slots; the uncle's hours and the dawn are as they were"]],

  /* ── the rule ── */
  ["what is worn carries nothing",
    swap("from (select (town.cat('rules')->>'slots')::int + coalesce((", "from (select (town.cat('rules')->>'slots')::int + 0 * coalesce(("),
    ["an old bag with a basket worn comes to fifteen"]],
  ["the new slots go in at the front",
    swap("then p_purse || jsonb_build_object('bag', (p_purse->'bag')\n      || (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_purse->'bag'))))",
         "then p_purse || jsonb_build_object('bag', (select jsonb_agg('null'::jsonb) from generate_series(1, w.want - jsonb_array_length(p_purse->'bag')))\n      || (p_purse->'bag'))"),
    ["a bag kept from when it began with five is given the five it lacks, at its end: what is in it stays where it is"]],
  ["a bag is given one slot too few",
    swap("from generate_series(1, w.want - jsonb_array_length(p_purse->'bag'))))", "from generate_series(1, w.want - jsonb_array_length(p_purse->'bag') - 1)))"),
    ["roomy:"]],
  ["a bag bigger than it need be is cut down",
    swap("    else p_purse end", "    else p_purse || jsonb_build_object('bag', (select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_purse->'bag') with ordinality e(v, ord) where e.ord <= w.want)) end"),
    ["a bag bigger than it need be is left alone: nothing here ever makes one smaller"]],

  /* ── the keeping ── */
  ["a purse kept from before is not given its slots",
    swap("  return town.roomy(coalesce(doc, town.fresh())) || jsonb_build_object(", "  return coalesce(doc, town.fresh()) || jsonb_build_object("),
    ["a bag kept from when it began with five is given the five it lacks, at its end: what is in it stays where it is"]],
  ["the purse no longer says what popoto are left to change",
    swap("    'popoto', jsonb_build_object('profile', coalesce(left_.profile_left, 0), 'gallery', coalesce(left_.gallery_left, 0)),\n", ""),
    ["purse_kept is v107's word for word, but for the bag made roomy"]],
  ["a purse is read without being held",
    swap("    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member for update;", "    select p.coins, p.doc into coins, doc from public.town_purses p where p.member_id = p_member;"),
    ["purse_kept is v107's word for word, but for the bag made roomy"]],

  /* ── who may ── */
  ["the rule can be called from a browser",
    cut("revoke execute on all functions in schema town from public, anon, authenticated;", "notify pgrst, 'reload schema';"),
    ["the rules are still nobody's in a browser"]],
];
