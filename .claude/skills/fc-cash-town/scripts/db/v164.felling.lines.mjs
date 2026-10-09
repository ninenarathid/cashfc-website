// What v164's felling part changes in functions that earlier files wrote. Nothing of those functions is pasted into
// v164.felling.sql: each change is one small marked block (`-- ── the mountain's trees (v164) … ──`), given here as
// [the anchor: a line of the function as it stands, what stands in its place], and built into the function's own text
// as the database has it (build-v164.mjs; try-v164.mjs does it against the snapshot, and holds each function to the
// one it replaces but for these lines).
//
// The anchors (both K: the anchor line is kept, and the block goes BEFORE it):
//   town.work_counts_of   its `  if what = 'net' then` line
//   town.deed_th          its `    else p_what end` line
// A line meant that is not in the function exactly once stops the build and says so. Another part of v164 that hangs
// a block of its own on the same line leaves the line there once, so the two are built in turn, in either order.

/**
 * town.work_counts_of (v163's text): a tree felled is its kind's points on the woodcutters' line to whoever felled it,
 * the first of a kind the line's own first; and where somebody braced the trunk (the deed's `braced`), a point on the
 * helpers' line to them (lib/town/line-points' countsOf, the `fell` deed).
 */
export const WORK_COUNTS_OF = [[
  "  if what = 'net' then\n",
  "  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──\n"
  + "  if what = 'fell' then\n"
  + "    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))\n"
  + "        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer\n"
  + "             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  -- ── the mountain's trees (v164): its end ──\n"
  + "  if what = 'net' then\n",
]];

/** town.deed_th (v163's text): a word for each deed of the woodcutters'. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- ── the mountain's trees (v164) ──\n"
  + "    when 'fell' then 'ตัดต้นไม้' when 'brace' then 'ช่วยค้ำต้นไม้ให้เพื่อน' when 'root' then 'ปลุกตอไม้ให้โตคืนทันที'\n"
  + "    -- ── the mountain's trees (v164): its end ──\n"
  + "    else p_what end\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", WORK_COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
