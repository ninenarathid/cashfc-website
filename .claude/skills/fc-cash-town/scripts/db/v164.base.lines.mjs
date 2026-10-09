// What v164's base part changes in functions that earlier files wrote. Nothing of those functions is pasted into
// v164.base.sql: each change is one small marked block (`-- ── v164: … ──`), given here as [the anchor: a line of the
// function as it stands, what stands in its place], and built into the function's own text as the database has it
// (build-v164.mjs; try-v164.mjs does it against the snapshot, and holds each function to the one it replaces but for
// these lines).
//
// Three things:
//
//   * the chests beyond the plaza's open a member's storage box as the plaza's does (lib/town/box's `nearBox`: the
//     mountain's foot has one), from the tiles the catalog's `box.more` now lists;
//   * a tool that carries something of its own (a plus, an option, a gem) is no plain thing (lib/town/trade's
//     `plainStack` and `wholeStack`), and the slot a thing is taken up from is kept with the hand (`handAt`). Carried
//     from the "plain" part of branch smith-sql, whose six anchors are in the functions as they stand after v167;
//   * a gem and a gem's fragment have a most of their own at a stall and on the board (lib/town/notices' `dearOf`,
//     which lib/town/shop's `capOf` asks too).
//
// The anchors (K: the anchor line is kept and the block goes beside it; R: the anchor line itself is replaced):
//   town.plain        K  its `where s->>'item' = p_id and …` line: the block goes AFTER (one condition more)
//   town.take_plain   K  its `if s->>'item' = p_id and … then` line: the block goes BEFORE (a `continue when`)
//   town.push         R  its `if coalesce(s->'of', …) <> 'null'::jsonb or s ? 'water' then` line (one condition more)
//   town.jar_drop     K  its `if not (town.cat('jar')->'kinds' ? …) … then return town.no('unwanted'); end if;` line: BEFORE
//   town.leave        K  its `if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;` line: AFTER
//   town.hold         R  its `return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item'));` line (a key more)
//   town.shop_cap     K  its `  select case` line: the block goes AFTER (one `when` before the others)
//   town.notice_cap   K  the same line, the same block
//   town.by_box       K  its `  select coalesce(greatest(…) between 1 and (b.k->>'reach')::int, false)` line: the block goes AFTER (one `or exists` more)
// A line meant that is not in the function exactly once stops the build and says so.

/** town.plain (v142's; the notice board and the stalls count by it): a forged tool is not counted among the plain ones of its kind. */
export const PLAIN = [[
  "   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0\n",
  "   where s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0\n"
  + "     -- ── v164: a tool that carries something of its own is no plain thing ──\n"
  + "     and not town.forged(s)\n",
]];

/** town.take_plain (v142's): nor is it taken as one of them. */
export const TAKE_PLAIN = [[
  "    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then\n",
  "    -- ── v164: a tool that carries something of its own is no plain thing, and is passed over ──\n"
  + "    continue when town.forged(s);\n"
  + "    if s->>'item' = p_id and coalesce(s->'of', 'null'::jsonb) = 'null'::jsonb and coalesce((s->>'water')::numeric, 0) = 0 then\n",
]];

/** town.push (v112's; a deal, the storage box and what is picked up off the ground move things by it): a forged tool goes into a slot of its own, as the stack it is, as a pot of food does. */
export const PUSH = [[
  "    if coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' then\n",
  "    -- ── v164: a tool that carries something of its own is moved whole too, into a slot of its own ──\n"
  + "    if coalesce(s->'of', 'null'::jsonb) <> 'null'::jsonb or s ? 'water' or town.forged(s) then\n",
]];

/** town.jar_drop (v129's, the jar at the well): what carries something of its own is not dropped in. */
export const JAR_DROP = [[
  "  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;\n",
  "  -- ── v164: what carries something of its own is no plain thing ──\n"
  + "  if town.forged(s) then return town.no('unwanted'); end if;\n"
  + "  if not (town.cat('jar')->'kinds' ? (town.cat('items')->(s->>'item')->>'kind')) or s ? 'of' or coalesce((s->>'water')::numeric, 0) > 0 then return town.no('unwanted'); end if;\n",
]];

/** town.leave (v155's, the uncle's): a forged tool is not left to be sold as one of its kind: what it carries would be lost with it. */
export const LEAVE = [[
  "  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;\n",
  "  if coalesce(pays, 0) = 0 then return town.no('unwanted'); end if;\n"
  + "  -- ── v164: a tool that carries something of its own is not left to be sold as one of its kind ──\n"
  + "  if town.forged(s) then return town.no('unwanted'); end if;\n",
]];

/** town.hold (v106's): the slot is kept with the hand, so that of two tools of a kind the one taken up is the one that works. */
export const HOLD = [[
  "  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item'));\n",
  "  -- ── v164: the slot it was taken up from is kept too (of two tools of a kind, which is held) ──\n"
  + "  return jsonb_build_object('ok', true, 'purse', p_purse || jsonb_build_object('hand', s->>'item', 'handAt', p_slot));\n",
]];

/** town.shop_cap (v143's) and town.notice_cap (v144's), which are worded alike: a gem and a gem's fragment have a most of their own, whatever the relatives pay for them. */
export const CAP = [[
  "  select case\n",
  "  select case\n"
  + "    -- ── v164: a gem and a gem's fragment have a most of their own, whatever the relatives pay ──\n"
  + "    when town.dear_of(p_item) is not null then town.dear_of(p_item)\n",
]];

/**
 * town.by_box (v134's; `town.stow` and `town.unstow` ask it of the tile a member says they stand on): by the plaza's
 * chest, OR by one of the chests beyond it, each from as near and never from its own tile (lib/town/box's `nearBox`:
 * `byStorebox || byMoreChest`). A row with no `more` (the catalog before this file) has none, and answers as before.
 */
export const BY_BOX = [[
  "  select coalesce(greatest(abs(p_x - (b.k->'at'->>0)::int), abs(p_y - (b.k->'at'->>1)::int)) between 1 and (b.k->>'reach')::int, false)\n",
  "  select coalesce(greatest(abs(p_x - (b.k->'at'->>0)::int), abs(p_y - (b.k->'at'->>1)::int)) between 1 and (b.k->>'reach')::int, false)\n"
  + "    -- ── v164: a chest beyond the plaza's opens the same box, from as near (the mountain's foot has one) ──\n"
  + "    or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(b.k->'more') = 'array' then b.k->'more' else '[]'::jsonb end) c(v)\n"
  + "                where greatest(abs(p_x - (c.v->>0)::int), abs(p_y - (c.v->>1)::int)) between 1 and (b.k->>'reach')::int)\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.plain", "town.plain(jsonb, text)", PLAIN],
  ["town.take_plain", "town.take_plain(jsonb, text, integer)", TAKE_PLAIN],
  ["town.push", "town.push(jsonb, jsonb)", PUSH],
  ["town.jar_drop", "town.jar_drop(jsonb, jsonb, jsonb)", JAR_DROP],
  ["town.leave", "town.leave(jsonb, integer, integer, bigint, integer)", LEAVE],
  ["town.hold", "town.hold(jsonb, integer)", HOLD],
  ["town.shop_cap", "town.shop_cap(text, jsonb)", CAP],
  ["town.notice_cap", "town.notice_cap(text, jsonb)", CAP],
  ["town.by_box", "town.by_box(integer, integer)", BY_BOX],
];
