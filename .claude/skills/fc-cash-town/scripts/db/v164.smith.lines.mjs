// What v164's smith part changes in functions that earlier files wrote. Nothing of those functions is pasted into
// v164.smith.sql: each change is one small marked block (`-- ── v164, forging: … ──`), given here as
// [the anchor: a line of the function as it stands, what stands in its place], and built into the function's own text
// as the database has it (build-v164.mjs; try-v164.mjs does it against the snapshot, and holds each function to the
// one it replaces but for these lines).
//
// The anchors, chosen to be lines that whoever writes these functions again in between is least likely to touch:
//   public.town_me          its one `return jsonb_build_object('purse', …, 'now', …);` line: REPLACED (a key more)
//   town.work_counts_of     its last two lines, `  return '[]'::jsonb;` + `end;`: the block goes BEFORE them
//   town.deed_th            its last line, `    else p_what end`: the block goes BEFORE it
// A line meant that is not in the function exactly once stops the build and says so.

/**
 * public.town_me (v106's): what the member has at the smith is told with the purse, which is how a page learns that
 * there is a smith at all (lib/town/keeper reads `smith` off every answer; without it the page never offers him).
 * His board is not told here: it is told when he is looked at (`town_smith`) and with every deed at his forge.
 */
export const ME = [[
  "  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms());\n",
  "  -- ── v164, forging: what I have at the smith is told with my purse (how a page knows there is a smith at all); his board is told when he is looked at ──\n"
  + "  return jsonb_build_object('purse', town.purse_of(me, false), 'now', town.now_ms(), 'smith', jsonb_build_object('smithy', town.smithy_read(me)));\n",
]];

/** town.work_counts_of (v153's): the bellows worked for somebody else's piece count for the helpers' line (lib/town/line-points' countsOf). */
export const COUNTS_OF = [[
  "  return '[]'::jsonb;\nend;\n",
  "  -- ── v164, forging: the bellows worked at the smith for somebody else's piece ──\n"
  + "  if what = 'bellows' then\n"
  + "    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  -- ── (v164, forging) ──\n"
  + "  return '[]'::jsonb;\nend;\n",
]];

/** town.deed_th (v153's): a Thai word for each deed at the smith, for town.tally. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- ── v164, forging: the smith's ──\n"
  + "    when 'smelt' then 'ฝากช่างตีเหล็กหลอม' when 'smelted' then 'รับของที่หลอมเสร็จ' when 'smith_wider' then 'ขยายเตาหลอม' when 'bellows' then 'สูบลมช่วยเพื่อนหลอม'\n"
  + "    when 'forge' then 'ตีบวกเครื่องมือ' when 'forge_draw' then 'ช่างเปิดออปชันให้เลือก' when 'forge_choose' then 'เลือกออปชันของเครื่องมือ' when 'forge_redraw' then 'สุ่มออปชันใหม่' when 'gem_set' then 'ฝังพลอยลงเครื่องมือ'\n"
  + "    else p_what end\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["public.town_me", "public.town_me()", ME],
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
