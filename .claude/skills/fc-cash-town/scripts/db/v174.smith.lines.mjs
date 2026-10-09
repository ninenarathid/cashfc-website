// What v174's smith part changes in functions that earlier files wrote. Nothing of those functions is pasted into
// v174.smith.sql: each change is a small marked block (`-- ── the forge's great fire (v174) … ──`,
// `-- ── the blacksmith (v174) … ──`), given here as [the anchor: a line of the function as it stands, what stands in
// its place], and built into the function's own text as the database has it (build-v164.mjs; try-v164.mjs does it
// against the snapshot, and holds each function to the one it replaces but for these lines).
//
// The anchors (K: the anchor line is kept; a line meant that is not in the function exactly once stops the build):
//   public.town_fell      `  paid jsonb;` + `begin`                        K, a variable declared between the two
//                         `  go_ := grove->'goes'->(me::text);`            K, the block BEFORE it: the grove is held by
//                                                                          then and no purse is yet
//                         `  perform town.keep_thing('grove', did->'grove');`   K, the block AFTER it
//   public.town_mine      `  ore_ text;` + `begin`                         K, two variables declared between the two
//                         `  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;`
//                                                                          K, the block BEFORE it: the place is held by
//                                                                          then and no purse is yet
//                         `  perform town.keep_cave(place_, next_);`       K, the block AFTER it
//                         `    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));`
//                                                                          K, one line BEFORE it (the answer's last)
//   town.work_counts_of   its `  if what = 'net' then` line                K, the block BEFORE it (as v164's two)
//   town.deed_th          its `    else p_what end` line                   K, the block BEFORE it (as v164's two)
//
// `town.fell`, the woodcutters' rule, is NOT written again: a file that runs before v174 and writes it (v172 and
// v173 do) touches no line of these. v173 may also write `public.town_fell` where the deed is written down: the three
// anchors there are the declare's last line, the line that reads my go off the grove, and the line that keeps the
// grove, none of them a line of the deed's.

const OPEN = "-- ── the forge's great fire (v174)";

/**
 * public.town_fell (v164's text): a call that felled a tree may have found the village's tinder. The fire's row is the
 * village's: held after the grove and before any purse, and only while its tinder can be found by whoever fells
 * (`town.fire_wants` reads it without holding). Found, it is told in the feller's own answer (`fire`: the half, and
 * whether that lit the fire), which is `did`'s, passed on as it is.
 */
export const FELL = [
  [
    "  paid jsonb;\nbegin\n",
    "  paid jsonb;\n"
    + `  ${OPEN}: its row, where this call holds it ──\n`
    + "  fire_ jsonb;\n"
    + "begin\n",
  ],
  [
    "  go_ := grove->'goes'->(me::text);\n",
    `  ${OPEN}: the village's row, held after the grove and before any purse, and only while its tinder can be found by me ──\n`
    + "  if town.fire_wants('tinder', me, now_) then fire_ := town.fire_kept(true); end if;\n"
    + `  ${OPEN}: its end ──\n`
    + "  go_ := grove->'goes'->(me::text);\n",
  ],
  [
    "  perform town.keep_thing('grove', did->'grove');\n",
    "  perform town.keep_thing('grove', did->'grove');\n"
    + `  ${OPEN}: a tree felled may be the village's tinder, kept under the name of whoever felled it ──\n`
    + "  if fire_ is not null and jsonb_array_length(did->'felled') > 0 then\n"
    + "    did := did || town.fire_find(fire_, 'tinder', me, now_);\n"
    + "  end if;\n"
    + `  ${OPEN}: its end ──\n`,
  ],
];

/**
 * public.town_mine (v164's text): a rock that broke, and is not the day's crystal rock, may be the village's flint,
 * under the name of whoever is PAID for it: whoever struck it first, who may be another than the one whose swing broke
 * it. The fire's row is held after the cave's place and before any purse, and only while its flint can be found by one
 * of the two. The finder is told in their own answer; a helper's answer says nothing of it.
 */
export const MINE = [
  [
    "  ore_ text;\nbegin\n",
    "  ore_ text;\n"
    + `  ${OPEN}: its row, where this call holds it; and what its finder is told ──\n`
    + "  fire_ jsonb;\n"
    + "  lit_ jsonb := '{}'::jsonb;\n"
    + "begin\n",
  ],
  [
    "  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;\n",
    `  ${OPEN}: the village's row, held after the cave's place and before any purse, and only while its flint can be found by me or by whoever struck the rock first ──\n`
    + "  if town.fire_wants('flint', me, now_) or town.fire_wants('flint', first_, now_) then fire_ := town.fire_kept(true); end if;\n"
    + `  ${OPEN}: its end ──\n`
    + "  if first_ is not null and first_ < me then theirs := town.purse_of(first_, true); end if;\n",
  ],
  [
    "  perform town.keep_cave(place_, next_);\n",
    "  perform town.keep_cave(place_, next_);\n"
    + `  ${OPEN}: a rock broken that is not the day's crystal rock may be the village's flint, kept under the name of whoever is paid for it ──\n`
    + "  if fire_ is not null and exists (select 1 from jsonb_array_elements(paid->'each') x(v) where x.v->>'kind' is distinct from 'crystal') then\n"
    + "    lit_ := town.fire_find(fire_, 'flint', first_, now_);\n"
    + "  end if;\n"
    + `  ${OPEN}: its end ──\n`,
  ],
  [
    "    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));\n",
    `    ${OPEN}: its finder is told, in the answer of the call that found it ──\n`
    + "    || case when first_ = me then lit_ else '{}'::jsonb end\n"
    + "    || jsonb_build_object('cave', town.cave_told(me, did->'purse', place_, p_x, p_y, now_)));\n",
  ],
];

/**
 * town.work_counts_of (v163's text with v164's two blocks): a press of the bellows for somebody else's piece is the
 * helpers' points to whoever pressed (lib/town/line-points' countsOf, the `bellows` deed).
 */
export const WORK_COUNTS_OF = [[
  "  if what = 'net' then\n",
  "  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──\n"
  + "  if what = 'bellows' then\n"
  + "    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then\n"
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));\n"
  + "    end if;\n"
  + "    return '[]'::jsonb;\n"
  + "  end if;\n"
  + "  -- ── the blacksmith (v174): its end ──\n"
  + "  if what = 'net' then\n",
]];

/** town.deed_th (v163's text with v164's two blocks): a word for each deed of the smith's and of the great fire's. */
export const DEED_TH = [[
  "    else p_what end\n",
  "    -- ── the blacksmith (v174) ──\n"
  + "    when 'smelt' then 'ฝากช่างตีเหล็กหลอม' when 'smelted' then 'รับของที่หลอมเสร็จ' when 'smith_wider' then 'ขยายเตาหลอม' when 'bellows' then 'สูบลมช่วยเพื่อนหลอม'\n"
  + "    when 'forge' then 'ตีบวกเครื่องมือ' when 'forge_draw' then 'ช่างเปิดออปชันให้เลือก' when 'forge_choose' then 'เลือกออปชันของเครื่องมือ' when 'forge_redraw' then 'สุ่มออปชันใหม่'\n"
  + "    when 'gem_set' then 'ฝังพลอยลงเครื่องมือ' when 'forge_move' then 'ย้ายของที่ตีไว้ไปเครื่องมืออีกชิ้น' when 'forge_first' then 'ขึ้นป้ายคนแรกของช่างตีเหล็ก' when 'power' then 'ใช้พลังของเครื่องมือ'\n"
  + "    when 'fire_found' then 'พบส่วนหนึ่งของไฟใหญ่ของเตา' when 'fire_join' then 'ลงชื่อในคิวไฟใหญ่' when 'fire_leave' then 'ถอนชื่อจากคิวไฟใหญ่'\n"
  + "    -- ── the blacksmith (v174): its end ──\n"
  + "    else p_what end\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["public.town_fell", "public.town_fell(jsonb, integer, integer)", FELL],
  ["public.town_mine", "public.town_mine(integer, integer, integer, integer, double precision, text)", MINE],
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", WORK_COUNTS_OF],
  ["town.deed_th", "town.deed_th(text)", DEED_TH],
];
