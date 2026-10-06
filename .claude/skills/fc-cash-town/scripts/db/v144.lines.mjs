// What v144 changes in a function that v128 wrote: one line of `town.notice_cap` goes. build-v144.mjs writes the
// function into the file from v128's own text without it, and v144's dry run holds the file to the same.

/** town.notice_cap: what the uncle sells is no longer held to what he asks; it has the most every other thing has. */
export const NOTICE_CAP = [[
  "    when town.cat('goods') ? p_item then (town.cat('goods')->p_item->>'price')::numeric::int\n",
  "",
]];
