// What v159 changes in functions that earlier files wrote: the lines of each, as [what was there, what is there now].
// build-v159.mjs writes each function into the file from its own text as the stand-in database has it (which is the
// text it last ran with) with these in place, and v159's dry run holds the file to the same.

/** town.chew (v153's): a helping eaten out of one of the feast table's own bowls gives no bowl back when it is eaten up. */
export const CHEW = [[
  "    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') then 1 else 0 end));\n",
  "    -- (a helping out of one of the feast table's own bowls gives none back: the bowl was never the eater's)\n"
  + "    town.bowls_back(after, case when town.cat('cooking')->'bowled' ? (e->>'dish') and not coalesce((e->>'lent')::boolean, false) then 1 else 0 end));\n",
]];

/** town.get_up (v111's): nor when it is left half eaten. */
export const GET_UP = [[
  "  if counted->'eating' <> 'null'::jsonb and town.cat('cooking')->'bowled' ? (p_purse->'eating'->>'dish') then return town.bowls_back(up, 1); end if;\n",
  "  if counted->'eating' <> 'null'::jsonb and town.cat('cooking')->'bowled' ? (p_purse->'eating'->>'dish')\n"
  + "     and not coalesce((p_purse->'eating'->>'lent')::boolean, false) then return town.bowls_back(up, 1); end if;\n",
]];

/** public.town_kitchen (v111's): the pots are tidied before they are told, and the feast table is told with them (which is how a page knows there is one). */
export const KITCHEN = [[
  "begin\n  return jsonb_build_object(\n",
  "begin\n  -- (an hour on the ground is up, the table is cleared: before anybody is told what stands where)\n  perform town.pots_tidy(town.now_ms());\n  return jsonb_build_object(\n",
], [
  "    'pots', (select coalesce(jsonb_agg(town.pot_doc(o.id) order by o.id), '[]'::jsonb) from public.town_pots o),\n",
  "    'pots', (select coalesce(jsonb_agg(town.pot_doc(o.id) order by o.id), '[]'::jsonb) from public.town_pots o),\n"
  + "    'feast', (town.cat('cooking')->'feast') - 'floor',\n",
]];

/** public.town_pot_ladle and public.town_pot_take (v121's): the pots are tidied before the pot is looked for, so one whose time is up is gone and one whose hour is up is reached as a pot of the table is. */
export const TIDY_FIRST = [[
  "begin\n  perform 1 from public.town_pots o where o.id = p_id for update;\n",
  "begin\n  perform town.pots_tidy(town.now_ms());\n  perform 1 from public.town_pots o where o.id = p_id for update;\n",
]];

/**
 * public.town_pot_down (v158's): a dish set down on the cooking yard's floor is on the feast table; anything else is
 * on the ground as before, of which one member now leaves two. What stands in the way and how many one has left are
 * asked once the rule has said which pot it is (the odd dish stays on the ground even in the yard), each of its own
 * kind: pots on the ground are in each other's way, pots on the table in nobody's.
 */
export const POT_DOWN = [[
  "  new_id bigint;\nbegin\n",
  "  new_id bigint;\n  feast_ boolean;\nbegin\n",
], [
  "    return town.answer(me, town.no('none'));\n  end if;\n"
  + "  if exists (select 1 from public.town_pots o where abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;\n"
  + "  if (select count(*) from public.town_pots o where o.member_id = me) >= (ck->>'pots')::int then return town.answer(me, town.no('many')); end if;\n",
  "    return town.answer(me, town.no('none'));\n  end if;\n"
  + "  perform town.pots_tidy(town.now_ms());\n",
], [
  "  if not (did->>'ok')::boolean then return town.answer(me, did); end if;\n"
  + "  -- (one to a tile: of two set down on the same tile at once, the second finds it taken)\n"
  + "  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at)\n"
  + "    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int, p_x, p_y, coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms())\n"
  + "    on conflict (x, y) do nothing returning id into new_id;\n",
  "  if not (did->>'ok')::boolean then return town.answer(me, did); end if;\n"
  + "  -- (a dish set down in the cooking yard is on the feast table; the odd dish, and anything set down elsewhere, on the ground)\n"
  + "  feast_ := town.on_yard(p_x, p_y) and did->'pot'->>'dish' <> ck->>'oddDish';\n"
  + "  if not feast_ and exists (select 1 from public.town_pots o where not o.feast and abs(o.x - p_x) <= 1 and abs(o.y - p_y) <= 1) then return town.answer(me, town.no('taken')); end if;\n"
  + "  if (select count(*) from public.town_pots o where o.member_id = me and o.feast = feast_)\n"
  + "     >= (case when feast_ then ck->'feast'->>'pots' else ck->>'pots' end)::int then return town.answer(me, town.no('many')); end if;\n"
  + "  -- (on the ground, one to a tile: of two set down on the same tile at once, the second finds it taken)\n"
  + "  insert into public.town_pots (member_id, dish, helpings, x, y, tok, set_at, feast)\n"
  + "    values (me, did->'pot'->>'dish', (did->'pot'->>'left')::int,\n"
  + "            case when feast_ then (ck->'feast'->'tile'->>0)::int else p_x end, case when feast_ then (ck->'feast'->'tile'->>1)::int else p_y end,\n"
  + "            not feast_ and coalesce((did->'pot'->>'tok')::boolean, false), town.now_ms(), feast_)\n"
  + "    on conflict (x, y) where not feast do nothing returning id into new_id;\n",
], [
  "    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id));\n",
  "    jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'pot', new_id) || case when feast_ then '{\"feast\": true}'::jsonb else '{}'::jsonb end);\n",
]];
