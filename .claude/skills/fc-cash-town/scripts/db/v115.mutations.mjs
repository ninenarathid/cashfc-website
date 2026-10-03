// The breaks v115.test.mjs must notice, one rule at a time.
// Run: node mutate.mjs <the file> v115.test.mjs v115.mutations.mjs
export default ({ cut, swap }) => [
  /* ── shut means shut ── */
  ["a proved character is let in whatever the knob says",
    cut("  if not public.is_admin() and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) <= 0 then", "  return me;"),
    ["a proved character is refused by every function of the game's"]],
  ["the knob is read the wrong way round",
    swap("where k.key = 'game_open'), 0) <= 0 then", "where k.key = 'game_open'), 0) > 0 then"),
    ["a proved character is refused by every function of the game's"]],
  ["an admin is shut out with everybody else",
    swap("  if not public.is_admin() and coalesce((select k.value", "  if coalesce((select k.value"),
    ["an admin is refused by none"]],
  ["the refusal is not the one a page takes for \"not for you\"",
    swap("    raise exception 'the town''s game is not open yet' using errcode = '42501';", "    raise exception 'the town''s game is not open yet' using errcode = 'P0001';"),
    ["a proved character is refused by every function of the game's"]],
  ["the bank's counter is told while the game is shut",
    swap("  perform town.member();\n  return query", "  return query"),
    ["a proved character is refused by every function of the game's", "town_bank is v105's word for word, but for asking whether the game is open"]],
  ["popoto can be changed while the game is shut",
    swap("  perform town.member();\n  if p_kind is null", "  if p_kind is null"),
    ["a proved character is refused by every function of the game's", "town_exchange is v114's word for word, but for the same"]],
  ["the bank forgets the week's cap while it is at it",
    swap("  elsif used + p_popoto > weekly then\n    refusal := 'cap';\n", ""),
    ["town_exchange is v114's word for word, but for the same"]],

  /* ── the yes or no ── */
  ["town_is_open says yes to whoever is signed in",
    swap("     and (public.is_admin()\n          or (public.verified_character()\n              and coalesce((select k.value from public.town_knobs k where k.key = 'game_open'), 0) > 0));", "     and true;"),
    ["whether it is open, as a yes or no: an admin yes, a proved character no"]],
  ["town_is_open says yes to an unproved character once the game is open",
    swap("          or (public.verified_character()\n              and coalesce(", "          or (true\n              and coalesce("),
    ["…an unproved character and somebody with none: still no"]],
  ["town_is_open says no to an admin while the game is shut",
    swap("     and (public.is_admin()\n          or (", "     and (false\n          or ("),
    ["whether it is open, as a yes or no: an admin yes, a proved character no"]],
  ["somebody signed out may ask whether it is open",
    swap("revoke execute on function public.town_is_open() from public, anon;\ngrant execute on function public.town_is_open() to authenticated;", "grant execute on function public.town_is_open() to anon, authenticated;"),
    ["…and somebody signed out may not ask"]],

  /* ── the knob ── */
  ["the game is open from the moment the file runs",
    swap("  ('game_open', 0)    -- whether", "  ('game_open', 1)    -- whether"),
    ["the knobs: the game shut, the bank's as they were"]],
  ["running it again shuts a game the owner opened",
    swap("  ('game_open', 0)    -- whether the game is open to every proved character: until it is, to admins only\n  on conflict (key) do nothing;",
         "  ('game_open', 0)\n  on conflict (key) do update set value = 0;"),
    ["a game the owner opened is not shut by the file being run again"]],
];
