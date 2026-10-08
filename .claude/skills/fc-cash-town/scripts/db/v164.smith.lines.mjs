// What v164's smith part changes in functions that earlier files wrote: the lines of each, as [what was there, what is
// there now]. build-v164.mjs writes each function into v164.smith.sql from its own text as the stand-in database has
// it (which is the text it last ran with) with these in place, and try-v164.mjs holds the part to the same.
//
// Whoever puts v164 together: another part (the lines of mining and of felling count their deeds too) may change
// `town.work_counts_of` and `town.deed_th` as well, and so may a file that runs before v164 (v162's draft writes both
// again). These lines name only what they need to find: the first line of the block they go before. Run every
// part's lines over the same text in turn, from the database as it then is.

/**
 * public.town_me (v106's): what the member has at the smith is told with the purse, which is how a page learns that
 * there is a smith at all (lib/town/keeper reads `smith` off every answer; without it the page never offers him).
 * His board is not told here: it is told when he is looked at (`town_smith`) and with every deed at his forge.
 */
export const ME = [[
  "  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms());\n",
  "  -- (forging: what I have at the smith is told with my purse, which is how a page knows there is a smith at all;\n"
  + "  -- his board is told when he is looked at, and with every deed at his forge)\n"
  + "  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms(), 'smith', jsonb_build_object('smithy', town.smithy_read(me)));\n",
]];

/** town.work_counts_of (v153's): the bellows worked for somebody else's piece count for the helpers' line (lib/town/line-points' countsOf). */
export const COUNTS_OF = [[
  "  if what = 'thank' then\n",
  "  -- (forging: the bellows worked at the smith for somebody else's piece)\n"
  + "  if what = 'bellows' then\n"
  + "    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  if what = 'thank' then\n",
]];

/** town.deed_th (v153's): a Thai word for each deed at the smith, for town.tally. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- the smith's\n"
  + "    when 'smelt' then 'ฝากช่างตีเหล็กหลอม' when 'smelted' then 'รับของที่หลอมเสร็จ' when 'smith_wider' then 'ขยายเตาหลอม' when 'bellows' then 'สูบลมช่วยเพื่อนหลอม'\n"
  + "    when 'forge' then 'ตีบวกเครื่องมือ' when 'forge_draw' then 'ช่างเปิดออปชันให้เลือก' when 'forge_choose' then 'เลือกออปชันของเครื่องมือ' when 'forge_redraw' then 'สุ่มออปชันใหม่' when 'gem_set' then 'ฝังพลอยลงเครื่องมือ'\n"
  + "    else p_what end\n",
]];

/** The functions written again: the mark in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["public.town_me", "public.town_me()", ME],
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
