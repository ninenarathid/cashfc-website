// What v164's felling part changes in functions that earlier files wrote: the lines of each, as [what was there, what
// is there now]. build-v164.mjs writes each function into v164.felling.sql from its own text as the stand-in database
// has it (the text it last ran with, whichever file wrote it) with these in place; try-v164.mjs holds the part to the
// same. Each is one small block put before a line that is there already: whoever puts the parts of the file together
// applies it to the function's text as it then stands.

/** town.work_counts_of (v153's): a tree felled counts for the woodcutters' line, by its kind; the first of a kind is the line's own first. */
export const WORK_COUNTS_OF = [[
  "  if what = 'net' then\n",
  "  -- (woodcutting: a tree felled, by its kind)\n"
  + "  if what = 'fell' then\n"
  + "    if l->'felling' ? thing then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing));\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  if what = 'net' then\n",
]];

/** town.deed_th (v153's): a word for each deed of the woodcutters'. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- woodcutting\n"
  + "    when 'fell' then 'ตัดต้นไม้' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'\n"
  + "    else p_what end\n",
]];

/** The functions written again: the mark in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", WORK_COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
