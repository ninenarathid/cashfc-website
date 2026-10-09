// What v174's older tools' part changes in functions that earlier files wrote. Nothing of those functions is pasted
// into v174.tools.sql: each change is a small marked block (`-- ── the older tools (v174) … ──`), given here as [a
// piece of the function as it stands, what stands in its place], and built into the function's own text as the
// database has it (build-v164.mjs; try-v164.mjs does it against the snapshot with the smith's part run first, and
// holds each function to the one it replaces but for these lines).
//
// THE RULE: with a tool as it was bought in the hand, every line here does nothing. Each block begins with one look
// through the bag for a forged thing of the kind the deed is done with (`town.bag_forged`, which `town.rod_held`,
// `town.cook_held` and `town.net_cat` begin with too), takes the stack in the hand and reads the catalog's `forge`
// row only when there is one, and draws no number of chance otherwise. Where a line of the function had to be written again rather than kept (K below: kept, a block
// before or after it), what it answers for a plain tool is the same number: a product has `* 1`, a document `|| {}`.
//
// The functions, by the game, with what last wrote each (as of RAN = 173) and the pieces meant:
//
//   fishing   town.strike_window        v151   its last factor, a factor more after it
//             public.town_cast          v153   declare; K the wary line (after); K the first line drawn (after); K the orb's line (after)
//             public.town_strike        v153   declare; K `end;` + `if how is not null then` (between); K the fight's stamina (after)
//             town.strike_two           v153   declare + begin; K a fight's stamina (now the else of an if)
//             public.town_land          v153   declare; K the least's second line (a factor after); K the landing kept (after); the answer's last line
//             town.land_one             v153   K the least's line (a factor after)
//   the farm  town.tend                 v153   declare + begin; K the answer's first line (before)
//             town.water                v146   K the wet line (before)
//             town.sow                  v123   K the answer's first line (before)
//             town.chore                v153   K the dry line (after)
//             town.chore_for            v141   K the can's line (before)
//             town.pour_for             v153   the reach's first line
//             public.town_tend          v153   declare; the plot's line; K the deed's `whose` line (after); K the purse kept (before);
//                                              K the plot kept (after); the answer's line
//             public.town_row           v153   the plots' line; K the plot kept (after)
//             public.town_farm          v147   the plots' line
//             town.work_counts_of       v174's smith's (v163's with v164's two blocks and the smith's one)   K the helpers' line (before)
//   insects   town.net                  v153   declare; the far check's second line; K the cost's line (after)
//             town.net_mine             v153   declare; its `reach` line; K the cost's line (after)
//             town.comeback             v139   declare; three lines that read a weight
//             public.town_net           v153   the line that asks what comes back
//   kitchen   town.cook                 v171   declare; K the stamina's line (after); K the helpings' last line (after); the pot's line
//             town.set_down             v159?  the pot's last line          (whichever file wrote it last: the text is the database's)
//             town.take_up              v124?  the stack's line
//             town.feast_eat            v159   the answer's last line
//             town.chew                 v159   the gain's first line; K the buff's line (after)
//             town.pot_doc              v159   K its last line (after)
//             public.town_pot_down      v159   K the `taken` line (after)
//
// `town.cook` keeps v171's condition (what goes in whatever its kind): no line of it is among these. `town.spoon` is
// not written again.

const OPEN = "-- ── the older tools (v174)";
const END = `${OPEN}: its end ──`;

/* ── fishing ───────────────────────────────────────────────────────────── */

/** town.strike_window: a forged rod's own part of the moment, taken with the rest of what lengthens it. */
export const STRIKE_WINDOW = [[
  "    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision)))\n",
  "    * greatest(1::double precision, town.charm_by(p_purse, 'charmFloat', 1::double precision))\n"
  + `    ${OPEN}: a forged rod's own part, taken with the rest and never past the cap (1 for any other rod) ──\n`
  + "    * town.rod_strike(p_purse, p_now, c.f))\n",
]];

/** public.town_cast: what may take the bait, how soon, and what the line remembers of its rod. */
export const CAST = [
  [
    "  old jsonb;\nbegin\n",
    "  old jsonb;\n"
    + `  ${OPEN}: the forged rod the line is dropped with, what it carries, the wait as it was drawn, and the line as the rod leaves it ──\n`
    + "  rod_ jsonb;\n  fx_ jsonb;\n  drawn_ double precision;\n  cast_ jsonb;\n"
    + "begin\n",
  ],
  [
    "  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;\n",
    "  if town.is_wary(purse, now_) then odds := town.sift(odds, array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers'))); end if;\n"
    + `  ${OPEN}: the forged rod, read once; and lib/town/fishing's rarer ──\n`
    + "  rod_ := town.rod_held(purse);\n"
    + "  if rod_ is not null then\n"
    + "    fx_ := town.rod_fx(rod_);\n"
    + "    odds := town.rarer(odds, (fx_->>'rare')::double precision);\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
  [
    "  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);\n",
    "  line := town.cast_from(odds, array[random(), random(), random(), random(), random(), random()]);\n"
    + `  ${OPEN} ──\n`
    + "  if rod_ is not null then drawn_ := (line->>'wait')::double precision; end if;\n",
  ],
  [
    "  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;\n",
    "  if sky is not null then line := town.hastened(line, 1 - 1 / (town.cat('gifts')->'gifts'->'thingOrb'->>'by')::double precision) || jsonb_build_object('orb', sky); end if;\n"
    + `  ${OPEN}: the line as the forged rod leaves it, the purse with what was counted, and what the line remembers of its rod for the least a landing can take ──\n`
    + "  if rod_ is not null then\n"
    + "    cast_ := town.rod_cast(did->'purse', rod_, fx_, line, drawn_, now_);\n"
    + "    line := cast_->'line';\n"
    + "    did := did || jsonb_build_object('purse', cast_->'purse');\n"
    + "    if (fx_->>'line')::double precision <> 1 then line := line || jsonb_build_object('rod', town.rod_line(purse, fx_)); end if;\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
];

/** public.town_strike: lib/town/fishing's goldStrike, fightPaid and lulled. */
export const STRIKE = [
  [
    "  play jsonb;\nbegin\n",
    "  play jsonb;\n"
    + `  ${OPEN}: the forged rod, what it carries, and the purse a late strike leaves ──\n`
    + "  rod_ jsonb;\n  fx_ jsonb;\n  gold_ jsonb;\n"
    + "begin\n",
  ],
  [
    "    end;\n  if how is not null then\n",
    "    end;\n"
    + `  ${OPEN}: the forged rod, read once; and lib/town/fishing's goldStrike, asked only of a strike that was struck (a bite let go by says no reaction) ──\n`
    + "  rod_ := town.rod_held(purse);\n"
    + "  if rod_ is not null then\n"
    + "    fx_ := town.rod_fx(rod_);\n"
    + "    if how = 'missed' and p_reaction is not null then\n"
    + "      gold_ := town.gold_strike(purse, rod_, fx_, now_ - (line->>'bites_at')::bigint - (cat->'slack'->>'late')::bigint, now_);\n"
    + "      if gold_ is not null then purse := gold_; how := null; end if;\n"
    + "    end if;\n"
    + "  end if;\n"
    + `  ${END}\n`
    + "  if how is not null then\n",
  ],
  [
    "  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));\n",
    "  perform town.keep_purse(me, town.spend(purse, (fish->>'effort')::double precision, now_));\n"
    + `  ${OPEN}: the same with a forged rod ──\n`
    + "  if rod_ is not null then perform town.keep_purse(me, town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, now_), rod_, fx_, line->>'what', now_)); end if;\n",
  ],
];

/** town.strike_two: each fish's fight, paid for with a forged rod. */
export const STRIKE_TWO = [
  [
    "  i integer;\nbegin\n",
    "  i integer;\n"
    + `  ${OPEN}: the forged rod, read once, and what it carries ──\n`
    + "  rod_ jsonb := town.rod_held(p_purse);\n  fx_ jsonb;\n"
    + "begin\n"
    + "  if rod_ is not null then fx_ := town.rod_fx(rod_); end if;\n",
  ],
  [
    "      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);\n",
    `      ${OPEN}: a fight's stamina with a forged rod; with any other, the line as it was ──\n`
    + "      if rod_ is not null then\n"
    + "        purse := town.rod_fought(purse, town.spend(purse, (fish->>'effort')::double precision, p_now), rod_, fx_, thing->>'what', p_now);\n"
    + "      else\n"
    + "      purse := town.spend(purse, (fish->>'effort')::double precision, p_now);\n"
    + "      end if;\n",
  ],
];

/** public.town_land: the least a landing can have taken, by what the line remembers of its rod; and lib/town/fishing's baitKept. */
export const LAND = [
  [
    "  drove jsonb;\nbegin\n",
    "  drove jsonb;\n"
    + `  ${OPEN}: the forged rod, the purse with a bait left in it, and whether one was ──\n`
    + "  rod_ jsonb;\n  baited_ jsonb;\n  kept_ boolean := false;\n"
    + "begin\n",
  ],
  [
    "          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)\n",
    "          case when coalesce((line->>'again')::boolean, false) then 1 else town.bouts_of(line->>'what') end)\n"
    + `          ${OPEN}: so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──\n`
    + "          * coalesce((line->>'rod')::double precision, 1::double precision)\n",
  ],
  [
    "      perform town.keep_purse(me, landed->'purse');\n    elsif how in ('snapped', 'slipped') and not suspect then\n",
    "      perform town.keep_purse(me, landed->'purse');\n"
    + `      ${OPEN}: lib/town/fishing's baitKept; the number of chance is drawn only with a forged rod ──\n`
    + "      if fish is not null and cat->'baits' ? (line->>'bait') then\n"
    + "        rod_ := town.rod_held(purse);\n"
    + "        if rod_ is not null then\n"
    + "          if random() < (town.rod_fx(rod_)->>'keeps')::double precision then\n"
    + "            baited_ := town.back_bait(landed->'purse', line->>'bait');\n"
    + "            kept_ := town.held(baited_->'bag', line->>'bait') > town.held(landed->'purse'->'bag', line->>'bait');\n"
    + "            perform town.keep_purse(me, baited_);\n"
    + "          end if;\n"
    + "        end if;\n"
    + "      end if;\n"
    + `      ${END}\n`
    + "    elsif how in ('snapped', 'slipped') and not suspect then\n",
  ],
  [
    "    'back', back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')));\n",
    `    ${OPEN}: or lib/town/fishing's baitKept said so ──\n`
    + "    'back', (back is not null and town.held(back->'bag', line->>'bait') > town.held(purse->'bag', line->>'bait')) or kept_));\n",
  ],
];

/** town.land_one: the least a landing can have taken, by what the line remembers of its rod. */
export const LAND_ONE = [[
  "  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))\n",
  "  if how = 'landed' and (took < town.least_ms(mine->>'what', coalesce((p_line->>'harder')::double precision, 1), town.bouts_of(mine->>'what'))\n"
  + `      ${OPEN}: so much of it, by what the line remembers of the rod it was dropped with (nothing: all of it) ──\n`
  + "      * coalesce((p_line->>'rod')::double precision, 1::double precision)\n",
]];

/* ── the farm ──────────────────────────────────────────────────────────── */

/** town.tend: the forged hoe or can in the hand: the deed it is offered, and the deed's end with it. */
export const TEND = [
  [
    "  rung jsonb;\nbegin\n",
    "  rung jsonb;\n"
    + `  ${OPEN}: the forged hoe or can in the hand, and the deed's end with it ──\n`
    + "  tool_ jsonb;\n  more_ jsonb;\n"
    + "begin\n"
    + `  ${OPEN}: the forged hoe or can in the hand, read once (no other thing held is looked at); and lib/town/farm's mayTwice, where deedFor is told of it ──\n`
    + "  if (hand = 'hoe' or hand = 'can') and town.bag_forged(p_purse->'bag', hand) then\n"
    + "    tool_ := town.hand_stack(p_purse);\n"
    + "    if not town.forged(tool_) then tool_ := null; end if;\n"
    + "  end if;\n"
    + "  if tool_ is not null and hand = 'can' and town.may_power(p_purse, tool_, 'cnTwice', p_now) and town.twice_wanted(p_key, p_plot, p_now) then deed := 'water'; end if;\n"
    + `  ${END}\n`,
  ],
  [
    "  return jsonb_build_object('ok', true, 'deed', deed,\n",
    `  ${OPEN}: what the forged tool pays and counts, the plot as it leaves it, and what came of it ──\n`
    + "  if tool_ is not null and deed in ('clear', 'till', 'water') then\n"
    + "    more_ := town.tend_with(p_key, deed, p_purse, rung->'purse', did->'plot', coalesce(did->'got', '[]'::jsonb), tool_, p_now);\n"
    + "    rung := rung || jsonb_build_object('purse', more_->'purse');\n"
    + "    did := did || jsonb_build_object('plot', more_->'plot', 'got', more_->'got');\n"
    + "  end if;\n"
    + `  ${END}\n`
    + "  return jsonb_build_object('ok', true, 'deed', deed,\n",
  ],
];

/** town.water: with a forged can of the kind in the bag, or under canFullNow, the rest of the rule is the code's as it reads them. */
export const WATER = [[
  "  if (seen->>'wet')::boolean then return town.no('wet'); end if;\n",
  `  ${OPEN}: with a forged can of this kind in the bag, or under lib/town/farm's canFullNow, the rest is lib/town/farm's water as it reads them ──\n`
  + "  if town.can_full_now(p_purse, p_now) or town.bag_forged(p_purse->'bag', p_hand) then return town.water_with(p_key, p_purse, p_plot, p_hand, p_now, seen); end if;\n"
  + "  if (seen->>'wet')::boolean then return town.no('wet'); end if;\n",
]];

/** town.sow: a plot with `damp` on it. */
export const SOW = [[
  "  return jsonb_build_object('ok', true,\n",
  `  ${OPEN}: a plot with \`damp\` on it: sown as any other, then the plant as lib/town/farm's sow has it there ──\n`
  + "  if p_plot->'damp' = 'true'::jsonb then\n"
  + "    return (select d.v || jsonb_build_object('plot', (d.v->'plot') || jsonb_build_object('plant', town.sow_damp(d.v->'plot'->'plant', p_now)))\n"
  + "              from (select town.sow(p_purse, p_plot - 'damp', p_hand, p_me, p_now) as v) d);\n"
  + "  end if;\n"
  + `  ${END}\n`
  + "  return jsonb_build_object('ok', true,\n",
]];

/** town.chore: a forged can is filled as the stack it is. */
export const CHORE = [[
  "  if p_well < 1 then return town.no('dry'); end if;\n",
  "  if p_well < 1 then return town.no('dry'); end if;\n"
  + `  ${OPEN}: with a forged can of this kind in the bag, the filling is lib/town/farm's as it reads it ──\n`
  + "  if town.bag_forged(bag, hand) then return town.fill_with(p_purse, hand, p_well, p_now); end if;\n",
]];

/** town.chore_for: whether a can is to be filled, by what it holds as the stack it is. */
export const CHORE_FOR = [[
  "  if p_where = 'well' and f->'cans' ? hand\n",
  `  ${OPEN}: with a forged can of this kind in the bag, a can is full at what it holds as the stack it is ──\n`
  + "  if p_where = 'well' and f->'cans' ? hand and town.bag_forged(bag, hand) then\n"
  + "    return case when exists (select 1 from jsonb_array_elements(bag) s where s->>'item' = hand and coalesce((s->>'water')::numeric, 0) < town.can_holds(s)) then 'fill' end;\n"
  + "  end if;\n"
  + `  ${END}\n`
  + "  if p_where = 'well' and f->'cans' ? hand\n",
]];

/** town.pour_for: lib/town/farm's canFullNow, where pourFor reads it. */
export const POUR_FOR = [[
  "  reach := case when town.has_buff(p_purse, p_now, 'spring') then jsonb_array_length(p_keys)\n",
  "  reach := case when town.has_buff(p_purse, p_now, 'spring')\n"
  + `      ${OPEN}: or under lib/town/farm's canFullNow ──\n`
  + "      or town.can_full_now(p_purse, p_now) then jsonb_array_length(p_keys)\n",
]];

const DAMP = "|| case when p.damp then '{\"damp\": true}'::jsonb else '{}'::jsonb end";
const PLOT_AS = "jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb))";

/** public.town_tend: a plot is read and kept with its `damp`; a watering's deed says what the lines of work read of the can; and the plots beside the deed's. */
export const TOWN_TEND = [
  [
    "  rang jsonb;\nbegin\n",
    "  rang jsonb;\n"
    + `  ${OPEN}: the plots of the row as they stood, what the deed did beside its own plot, those plots as they are kept, and one of them ──\n`
    + "  row_ jsonb;\n  more_ jsonb;\n  also_ jsonb;\n  k_ text;\n  beside_ jsonb;\n"
    + "begin\n",
  ],
  [
    `  select ${PLOT_AS} into plot from public.town_plots p where p.x = p_x and p.y = p_y;\n`,
    `  ${OPEN}: the plot with its \`damp\`, where it has one ──\n`
    + `  select ${PLOT_AS} ${DAMP} into plot from public.town_plots p where p.x = p_x and p.y = p_y;\n`,
  ],
  [
    "        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end\n",
    "        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end\n"
    + `        ${OPEN}: what the lines of work read of a forged can (nothing, of any other) ──\n`
    + "        || town.kind_doc(purse, did->>'deed', plot, me::text)\n",
  ],
  [
    "  perform town.keep_purse(me, after);\n",
    `  ${OPEN}: what a deed done with a forged hoe or can does to the plots beside its own: plots of this row of this bed, which is held whole above; each is kept as the deed's own was, and none is a deed of its own ──\n`
    + "  if did->>'deed' in ('clear', 'till', 'water') and purse->>'hand' in ('hoe', 'can') and town.bag_forged(purse->'bag', purse->>'hand') and town.forged(town.hand_stack(purse)) then\n"
    + `    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS} ${DAMP}), '{}'::jsonb) into row_\n`
    + "      from public.town_plots p where p.bed = bed_n and p.y = p_y;\n"
    + "    more_ := town.beside(key, town.row_keys(p_x, p_y), row_ || jsonb_build_object(key, plot), did->>'deed', purse, after, me::text, now_,\n"
    + "      town.owner_of(keeping, others > 0 or coalesce(plot->'plant', 'null'::jsonb) <> 'null'::jsonb, now_));\n"
    + "    after := more_->'purse';\n"
    + "    for k_ in select o.key from jsonb_each(more_->'plots') o order by split_part(o.key, ',', 1)::integer loop\n"
    + "      beside_ := more_->'plots'->k_;\n"
    + "      if did->>'deed' = 'water' and row_ ? k_ then\n"
    + "        beside_ := town.poured_as(row_->k_, beside_, now_, town.hot(now_), town.well_kind(now_), me::text, 1, wears);\n"
    + "      end if;\n"
    + "      insert into public.town_plots (x, y, bed, soil, plant, changed)\n"
    + "        values (split_part(k_, ',', 1)::integer, split_part(k_, ',', 2)::integer, bed_n, beside_->>'soil', nullif(beside_->'plant', 'null'::jsonb), now_)\n"
    + "        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;\n"
    + "      also_ := coalesce(also_, '{}'::jsonb) || jsonb_build_object(k_, beside_);\n"
    + "    end loop;\n"
    + "  end if;\n"
    + `  ${END}\n`
    + "  perform town.keep_purse(me, after);\n",
  ],
  [
    "    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)\n    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;\n",
    "    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)\n    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;\n"
    + `  ${OPEN}: and its \`damp\`, where the plot has one or had one ──\n`
    + "  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then\n"
    + "    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
  [
    "  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses);\n",
    "  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses)\n"
    + `    ${OPEN}: the plots beside it that the deed changed, by their keys and as they are kept ──\n`
    + "    || case when also_ is not null then jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_) else '{}'::jsonb end;\n",
  ],
];

/** public.town_row: the row's plots are read and kept with their `damp`. */
export const TOWN_ROW = [
  [
    `  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS}), '{}'::jsonb) into plots\n`,
    `  ${OPEN}: each plot with its \`damp\`, where it has one ──\n`
    + `  select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS} ${DAMP}), '{}'::jsonb) into plots\n`,
  ],
  [
    "      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;\n",
    "      on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;\n"
    + `    ${OPEN}: and its \`damp\`, where the plot has one or had one ──\n`
    + "    if did->'plots'->(e->>'key')->'damp' = 'true'::jsonb or plots->(e->>'key')->'damp' = 'true'::jsonb then\n"
    + "      update public.town_plots set damp = coalesce(did->'plots'->(e->>'key')->'damp' = 'true'::jsonb, false) where x = v_x and y = v_y;\n"
    + "    end if;\n"
    + `    ${END}\n`,
  ],
];

/** public.town_farm: a plot is told with its `damp`, where it has one. */
export const TOWN_FARM = [[
  `    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS}), '{}'::jsonb)\n`,
  `    ${OPEN}: each plot with its \`damp\`, where it has one ──\n`
  + `    'plots', (select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, ${PLOT_AS} ${DAMP}), '{}'::jsonb)\n`,
]];

/** town.work_counts_of (the text as the smith's part of this file leaves it): what a watering's deed says of a forged can (lib/town/line-points' countsOf). */
export const WORK_COUNTS_OF = [[
  "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));\n",
  `      ${OPEN}: what a watering's deed says of a forged can, never more than the option's own number ──\n`
  + "      if what = 'water' and jsonb_typeof(doc->'kind') = 'number' and (doc->>'kind')::numeric > 0 then\n"
  + "        return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw',\n"
  + "          (l->'helpers'->>what)::numeric + least(town.opt_n('cnKind', 'points')::numeric, floor((doc->>'kind')::numeric))));\n"
  + "      end if;\n"
  + `      ${END}\n`
  + "      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));\n",
]];

/* ── the insects ───────────────────────────────────────────────────────── */

const NET_HELD = "  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;\n";

/** town.net: a catch with a forged net in the hand. */
export const NET = [
  [
    "  cost double precision;\nbegin\n",
    "  cost double precision;\n"
    + `  ${OPEN}: the forged net in the hand, the catch's end with it, and what its reader adds to the bound a catch is told far by ──\n`
    + "  tool_ jsonb;\n  more_ jsonb;\n  far_ double precision := town.net_more_far(p_purse);\n"
    + "begin\n",
  ],
  [
    "           <= (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision) then\n",
    `           ${OPEN}: with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──\n`
    + "           <= (ins->'net'->>'reach')::double precision + far_ + (ins->'net'->>'far')::double precision) then\n",
  ],
  [
    "  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);\n",
    "  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);\n"
    + `  ${OPEN}: with a forged net in the hand, what it pays and how many come ──\n`
    + NET_HELD
    + "  if town.forged(tool_) then\n"
    + "    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', p_haunt, (p_has->>'turn')::bigint, p_now), p_now);\n"
    + "    return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, more_->'purse', id, n, p_x, p_y, p_now),\n"
    + "      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
];

/** town.net_mine: the same for an insect that is one member's alone. */
export const NET_MINE = [
  [
    "  after_ jsonb;\nbegin\n",
    "  after_ jsonb;\n"
    + `  ${OPEN}: the forged net in the hand, and the catch's end with it ──\n`
    + "  tool_ jsonb;\n  more_ jsonb;\n"
    + "begin\n",
  ],
  [
    "  reach double precision := (ins->'net'->>'reach')::double precision + (ins->'net'->>'far')::double precision;\n",
    `  ${OPEN}: with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──\n`
    + "  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse) + (ins->'net'->>'far')::double precision;\n",
  ],
  [
    "  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);\n",
    "  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);\n"
    + `  ${OPEN}: with a forged net in the hand, what it pays and how many come ──\n`
    + NET_HELD
    + "  if town.forged(tool_) then\n"
    + "    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);\n"
    + "    after_ := more_->'purse';\n"
    + "    return jsonb_build_object('ok', true,\n"
    + "      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)\n"
    + "        else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,\n"
    + "      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
];

const RARER = "case when rarer_ is not null and coalesce(ins->'rare' ? %, false) then rarer_ else 1::double precision end";

/** town.comeback: the weights as the row it is handed says them (`rarer`, of a catch made with some forged nets: public.town_net hands it). */
export const COMEBACK = [
  [
    "  w double precision;\nbegin\n",
    "  w double precision;\n"
    + `  ${OPEN}: what the row it is handed says of the kinds it names as rare (nothing: every weight as it is) ──\n`
    + "  rarer_ double precision := (ins->>'rarer')::double precision;\n"
    + "begin\n",
  ],
  [
    "    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision; end if;\n",
    `    ${OPEN}: a weight, as the row handed says it ──\n`
    + `    if bug->'at' ? (h->>0) and town.wild_fits(bug, ids->>j, h->>1, h->>2, begins[nth], word) then total := total + (bug->>'weight')::double precision * ${RARER.replace("%", "(ids->>j)")}; end if;\n`,
  ],
  [
    "      left_ := left_ - (bug->>'weight')::double precision;\n",
    `      ${OPEN}: the same weight ──\n`
    + `      left_ := left_ - (bug->>'weight')::double precision * ${RARER.replace("%", "(ids->>j)")};\n`,
  ],
  [
    "  w := (ins->'bugs'->pick->>'weight')::double precision;\n",
    `  ${OPEN}: the same weight ──\n`
    + `  w := (ins->'bugs'->pick->>'weight')::double precision * ${RARER.replace("%", "pick")};\n`,
  ],
];

/** public.town_net: what comes back after a catch is asked with the row as the net in the hand has it. */
export const TOWN_NET = [[
  "      back := town.comeback(p_haunt, now_, backs, random(), random(), random());\n",
  "      back := town.comeback(p_haunt, now_, backs, random(), random(), random(),\n"
  + `        ${OPEN}: the row as the forged net in the hand has it (null, the row as it is, with any other) ──\n`
  + "        town.net_cat(purse, ins));\n",
]];

/* ── the kitchen ───────────────────────────────────────────────────────── */

/** town.cook: a pot begun with forged cookware in the hand. */
export const COOK = [
  [
    "  n integer;\nbegin\n",
    "  n integer;\n"
    + `  ${OPEN}: the forged cookware the pot is begun with, what it carries, and what the pot has of it ──\n`
    + "  mine_ jsonb;\n  fx_ jsonb;\n  more_ jsonb;\n"
    + "begin\n",
  ],
  [
    "  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);\n",
    "  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);\n"
    + `  ${OPEN}: forged cookware in the hand of whoever begins the pot, read once; and what it pays ──\n`
    + "  mine_ := town.cook_held(p_purse, p_crew);\n"
    + "  if mine_ is not null then\n"
    + "    fx_ := town.cook_fx(mine_);\n"
    + "    spent := town.tool_paid(p_purse, spent, p_now, mine_, fx_, 'ckFresh');\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
  [
    "      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);\n",
    "      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);\n"
    + `    ${OPEN}: what the pot has of forged cookware, and what that counts ──\n`
    + "    if mine_ is not null then\n"
    + "      more_ := town.cook_more(spent, mine_, fx_, made is not null, town.luck_of('helping', p_now, kinds), p_now);\n"
    + "      spent := more_->'purse';\n"
    + "      left_ := left_ + (more_->>'more')::integer;\n"
    + "    end if;\n"
    + `    ${END}\n`,
  ],
  [
    "        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_)))))\n",
    "        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_))\n"
    + `          ${OPEN}: with what it carries from its cookware (nothing, of any other) ──\n`
    + "          || coalesce(more_->'marks', '{}'::jsonb))))\n",
  ],
];

/** town.set_down: a pot set down carries what its slot of the bag carried. */
export const SET_DOWN = [[
  "      || case when town.held(p_purse->'bag', 'tok') > 0 then '{\"tok\": true}'::jsonb else '{}'::jsonb end,\n",
  "      || case when town.held(p_purse->'bag', 'tok') > 0 then '{\"tok\": true}'::jsonb else '{}'::jsonb end\n"
  + `      ${OPEN}: with what the pot carries from its cookware ──\n`
  + "      || town.pot_marks(s),\n",
]];

/** town.take_up: a pot taken up carries it back into the bag. */
export const TAKE_UP = [[
  "    jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', p_pot->'dish', 'left', p_pot->'left')))));\n",
  "    jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', p_pot->'dish', 'left', p_pot->'left'))\n"
  + `      ${OPEN}: with what the pot carries from its cookware ──\n`
  + "      || town.pot_marks(p_pot))));\n",
]];

/** town.feast_eat: a helping out of a pot on the table goes with what the pot carries. */
export const FEAST_EAT = [[
  "    'purse', p_purse || meal || jsonb_build_object('eating', (meal->'eating') || '{\"lent\": true}'::jsonb));\n",
  "    'purse', p_purse || meal || jsonb_build_object('eating', (meal->'eating') || '{\"lent\": true}'::jsonb\n"
  + `      ${OPEN}: with what the pot carries from its cookware ──\n`
  + "      || town.pot_marks(p_pot)));\n",
]];

/** town.chew: a helping that carries something from its pot's cookware. */
export const CHEW = [
  [
    "  gain := (dish->>'stamina')::double precision\n",
    `  ${OPEN}: with what the helping carries from its pot (nothing, of any other) ──\n`
    + "  gain := ((dish->>'stamina')::double precision\n"
    + "      + case when jsonb_typeof(e->'scent') = 'number' and (e->>'scent')::double precision > 0 then (e->>'scent')::double precision else 0::double precision end)\n",
  ],
  [
    "    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;\n",
    "    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised_to(p_purse, dish->>'buff', p_now, town.spice_of(p_purse)) else '{}'::jsonb end;\n"
    + `  ${OPEN}: and what it carries for the buff its dish leaves ──\n`
    + "  if done and jsonb_typeof(e->'warm') = 'number' and (e->>'warm')::numeric > 0 and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then\n"
    + "    after := after || town.warmed(jsonb_build_object('buffs', after->'buffs', 'buff', after->'buff'), dish->>'buff', (e->>'warm')::double precision, p_now, p_purse->'buff');\n"
    + "  end if;\n"
    + `  ${END}\n`,
  ],
];

/** town.pot_doc: a pot is told with what it carries. */
export const POT_DOC = [[
  "           || case when o.feast then '{\"feast\": true}'::jsonb else '{}'::jsonb end\n",
  "           || case when o.feast then '{\"feast\": true}'::jsonb else '{}'::jsonb end\n"
  + `           ${OPEN}: with what it carries from its cookware ──\n`
  + "           || coalesce(o.marks, '{}'::jsonb)\n",
]];

/** public.town_pot_down: what a pot carries is kept on its row. */
export const POT_DOWN = [[
  "  if new_id is null then return town.answer(me, town.no('taken')); end if;\n",
  "  if new_id is null then return town.answer(me, town.no('taken')); end if;\n"
  + `  ${OPEN}: what the pot carries from its cookware is kept on its row ──\n`
  + "  if town.pot_marks(did->'pot') <> '{}'::jsonb then update public.town_pots set marks = town.pot_marks(did->'pot') where id = new_id; end if;\n",
]];

/** The functions written again: the place in the part's file, the function as Postgres names it, and its lines. */
export const AGAIN = [
  ["town.strike_window", "town.strike_window(jsonb, bigint)", STRIKE_WINDOW],
  ["public.town_cast", "public.town_cast(text, integer, integer, boolean, text)", CAST],
  ["public.town_strike", "public.town_strike(integer)", STRIKE],
  ["town.strike_two", "town.strike_two(uuid, jsonb, jsonb, integer, boolean, jsonb, bigint)", STRIKE_TWO],
  ["public.town_land", "public.town_land(text, jsonb)", LAND],
  ["town.land_one", "town.land_one(uuid, jsonb, jsonb, text, jsonb, bigint)", LAND_ONE],
  ["town.tend", "town.tend(text, jsonb, jsonb, integer, integer, jsonb, text, bigint, boolean)", TEND],
  ["town.water", "town.water(text, jsonb, jsonb, text, bigint)", WATER],
  ["town.sow", "town.sow(jsonb, jsonb, text, text, bigint)", SOW],
  ["town.chore", "town.chore(jsonb, text, integer, bigint)", CHORE],
  ["town.chore_for", "town.chore_for(jsonb, text, integer)", CHORE_FOR],
  ["town.pour_for", "town.pour_for(text, jsonb, jsonb, jsonb, text, bigint, text)", POUR_FOR],
  ["public.town_tend", "public.town_tend(integer, integer, jsonb, boolean)", TOWN_TEND],
  ["public.town_row", "public.town_row(integer, integer, jsonb, jsonb)", TOWN_ROW],
  ["public.town_farm", "public.town_farm(bigint)", TOWN_FARM],
  ["town.work_counts_of", "town.work_counts_of(jsonb, text)", WORK_COUNTS_OF],
  ["town.net", "town.net(jsonb, integer, jsonb, integer, boolean, text, integer, integer, double precision, bigint, text)", NET],
  ["town.net_mine", "town.net_mine(jsonb, text, text, integer, integer, double precision, bigint)", NET_MINE],
  ["town.comeback", "town.comeback(integer, bigint, jsonb, double precision, double precision, double precision, jsonb, text)", COMEBACK],
  ["public.town_net", "public.town_net(integer, integer, integer, numeric, uuid)", TOWN_NET],
  ["town.cook", "town.cook(jsonb, jsonb, jsonb, double precision, bigint)", COOK],
  ["town.set_down", "town.set_down(jsonb, integer, text, jsonb, text)", SET_DOWN],
  ["town.take_up", "town.take_up(jsonb, jsonb, text)", TAKE_UP],
  ["town.feast_eat", "town.feast_eat(jsonb, jsonb, boolean, bigint)", FEAST_EAT],
  ["town.chew", "town.chew(jsonb, double precision, bigint)", CHEW],
  ["town.pot_doc", "town.pot_doc(bigint)", POT_DOC],
  ["public.town_pot_down", "public.town_pot_down(integer, integer, integer)", POT_DOWN],
];
