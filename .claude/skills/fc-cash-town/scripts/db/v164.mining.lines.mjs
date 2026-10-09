// What v164's miners' part changes in functions that earlier files wrote. Nothing of those functions is pasted into
// v164.mining.sql: each change is one small marked block (`-- ── the mountain's rocks (v164) … ──`), given here as
// [the anchor: a line of the function as it stands, what stands in its place], and built into the function's own text
// as the database has it (build-v164.mjs; try-v164.mjs does it against the snapshot, and holds each function to the
// one it replaces but for these lines).
//
// The anchors (both K: the anchor line is kept, and the block goes BEFORE it):
//   town.work_counts_of   its `  if what = 'net' then` line
//   town.deed_th          its `    else p_what end` line
// A line meant that is not in the function exactly once stops the build and says so. The woodcutters' part hangs a
// block of its own on the same two lines: each leaves the line there once, so the two are built in turn, in either
// order.

/**
 * town.work_counts_of (v163's text): what a deed of the miners' counts for (lib/town/line-points' countsOf: `mine`,
 * `vein`, `delve`, `hew`, `crystal`). A rock broken is the rock's points, and the first of its fragments the line's
 * own first; a vein played out is the vein's (nothing, of the same face played once more) with the firsts of what it
 * gave; a way down found; the day's crystal rock with the firsts of what it gave; and a hand lent to a rock somebody
 * else struck first, a point on this line and one on the helpers'.
 */
export const WORK_COUNTS_OF = [[
  "  if what = 'net' then\n",
  "  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──\n"
  + "  if what = 'mine' then\n"
  + "    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',\n"
  + "        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))\n"
  + "      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);\n"
  + "  end if;\n"
  + "  if what = 'vein' then\n"
  + "    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)\n"
  + "        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)\n"
  + "      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;\n"
  + "  end if;\n"
  + "  if what = 'delve' then\n"
  + "    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));\n"
  + "  end if;\n"
  + "  if what = 'hew' then\n"
  + "    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  if what = 'crystal' then\n"
  + "    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')\n"
  + "        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)\n"
  + "      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;\n"
  + "  end if;\n"
  + "  -- ── the mountain's rocks (v164): its end ──\n"
  + "  if what = 'net' then\n",
]];

/** town.deed_th (v163's text): a word for each deed of the miners'. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- ── the mountain's rocks (v164) ──\n"
  + "    when 'mine' then 'ทุบหิน' when 'crystal' then 'ทุบหินคริสตัลประจำวัน' when 'delve' then 'เปิดทางลงชั้นถัดไป' when 'hew' then 'ช่วยทุบหินของเพื่อน'\n"
  + "    when 'vein' then 'ขุดสายแร่' when 'vein_odd' then 'สายแร่ที่เล่าผลมาไม่ตรงกติกา' when 'lift' then 'ขึ้นลิฟต์ในถ้ำ' when 'torch' then 'วางคบไฟในถ้ำ'\n"
  + "    -- ── the mountain's rocks (v164): its end ──\n"
  + "    else p_what end\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", WORK_COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
