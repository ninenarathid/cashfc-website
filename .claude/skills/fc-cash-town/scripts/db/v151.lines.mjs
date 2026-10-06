// What v151 changes in functions that earlier files wrote: the gifts of the lines' ranks (lib/town/gifts).
// build-v151.mjs writes each function into the file from its own last text with these lines changed, and v151's dry
// run holds the file to the same: nothing else in them moves.

/** town.strike_window (v146's): the whispering float worn as a charm lengthens the strike's moment (never shortens it). */
export const STRIKE_WINDOW = [[
  "where c.f->'floats' ? (s->>'item')), 1::double precision)))\n",
  "where c.f->'floats' ? (s->>'item')), 1::double precision))\n" +
  "    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)))\n",
]];

/**
 * town.tend (v119's): work on somebody else's plant, or in somebody else's bed, with the gardener's gloves on, takes
 * half its stamina (town.gloved keeps the half exact from one piece of work to the next).
 */
export const TEND = [[
  "  return jsonb_build_object('ok', true, 'deed', deed, 'purse', did->'purse', 'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))\n",
  "  return jsonb_build_object('ok', true, 'deed', deed,\n" +
  "      'purse', case when (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me)\n" +
  "        then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end,\n" +
  "      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))\n",
]];

/** town.work_answer (v149's): it says that gifts are given, so that the page offers them. */
export const WORK_ANSWER = [[
  "  select jsonb_build_object('now', town.now_ms(),\n",
  "  select jsonb_build_object('now', town.now_ms(), 'gifting', true,\n",
]];
