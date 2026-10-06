// What v143 changes in a function that v142 wrote: one line of `town.shop_open`. build-v143.mjs writes the function
// into the file from v142's own text with this in place, and v143's dry run holds the file to the same.

/** town.shop_open: the most a price is, is the stall's own (by what the relatives pay, whether the uncle sells the thing or not), no longer the notice board's. */
export const SHOP_OPEN = [[
  "    if price_ > town.notice_cap(item_, p_k) then return town.no('dear'); end if;\n",
  "    if price_ > town.shop_cap(item_, p_k) then return town.no('dear'); end if;\n",
]];
