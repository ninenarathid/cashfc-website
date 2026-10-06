// What v146 changes in functions that earlier files wrote: three helpings to a meal's hours, and a meal's buffs held
// together, each at a level (lib/town/stamina). build-v146.mjs writes each function into the file from its own last
// text with these lines changed, and v146's dry run holds the file to the same: nothing else in them moves.

/** town.sit_down (v107's): a meal's hours take so many helpings (the catalog's `bowls`), and each is counted. */
export const SIT_DOWN = [
  ["  eaten jsonb := town.eaten_today(p_purse, p_now);\n", "  bowls jsonb := town.bowls_today(p_purse, p_now);\n"],
  ["or (eaten->>meal)::boolean then return town.no('meal'); end if;", "or (bowls->>meal)::int >= (town.cat('stamina')->>'bowls')::int then return town.no('meal'); end if;"],
  ["    'meals', jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_set(eaten, array[meal::text], 'true'::jsonb)),\n",
   "    'meals', (select jsonb_build_object('day', town.day_of(p_now), 'eaten', jsonb_agg(b.n > 0 order by b.ord), 'bowls', jsonb_agg(b.n order by b.ord))\n" +
   "                from (select case when x.ord - 1 = meal then x.e::int + 1 else x.e::int end as n, x.ord from jsonb_array_elements_text(bowls) with ordinality as x(e, ord)) b),\n"],
];

/** town.chew (v111's): a helping eaten up raises the buff it leaves (town.raised), where it wrote the one buff over. */
export const CHEW = [[
  "    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end,\n" +
  "    'buff', case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb\n" +
  "      then jsonb_build_object('id', dish->>'buff', 'until', p_now + (st->>'hours')::bigint * 3600000)\n" +
  "      else coalesce(p_purse->'buff', 'null'::jsonb) end);\n",
  "    'eating', case when done then 'null'::jsonb else e || jsonb_build_object('till', till, 'got', (e->>'got')::double precision + gain) end)\n" +
  "    || case when done and coalesce(dish->'buff', 'null'::jsonb) <> 'null'::jsonb then town.raised(p_purse, dish->>'buff', p_now) else '{}'::jsonb end;\n",
]];

/** town.has_buff (v123's): having a buff is having it at some level, from a meal or from the fountain. */
export const HAS_BUFF = [[
  "  select coalesce(town.buff_of(p_purse, p_now) = p_id, false)\n" +
  "      or exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_purse->'blessed') = 'array' then p_purse->'blessed' else '[]'::jsonb end) b\n" +
  "                  where b->>'id' = p_id and (b->>'until')::bigint > p_now)\n",
  "  select town.level_of(p_purse, p_now, p_id) > 0\n",
]];

/** town.cost_of (v123's): a hearty meal takes off the cost by its level. */
export const COST_OF = [[
  "  select floor(p_n * (case when town.has_buff(p_purse, p_now, 'hearty')\n" +
  "    then 1::double precision - (town.cat('stamina')->'buffs'->>'hearty')::double precision else 1::double precision end) + 0.5::double precision)::integer\n",
  "  select floor(p_n * (1::double precision - town.buff_by(p_purse, p_now, 'hearty')) + 0.5::double precision)::integer\n",
]];

/** town.strike_window (v123's): a keen eye lengthens the moment by its level. */
export const STRIKE_WINDOW = [[
  "    (case when town.has_buff(p_purse, p_now, 'keen') then 1::double precision + (town.cat('stamina')->'buffs'->>'keen')::double precision else 1::double precision end)\n",
  "    (1::double precision + town.buff_by(p_purse, p_now, 'keen'))\n",
]];

/** town.water (v123's): green fingers add to a watering by their level. */
export const WATER = [[
  "          * (case when town.has_buff(p_purse, p_now, 'green') then 1::double precision + (town.cat('stamina')->'buffs'->>'green')::double precision\n" +
  "                  else 1::double precision end))),\n",
  "          * (1::double precision + town.buff_by(p_purse, p_now, 'green')))),\n",
]];

/** town.odds (v122's): how much luck does may be told (a lucky meal's level); untold, it is what it always was. */
export const ODDS = [
  ["create or replace function town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[])\n",
   "create or replace function town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_luck double precision default null)\n"],
  ["  lucky_by double precision := (town.cat('stamina')->'buffs'->>'lucky')::double precision;\n",
   "  lucky_by double precision := coalesce(p_luck, (town.cat('stamina')->'buffs'->>'lucky')::double precision);\n"],
];

/** town.cast_line (v122's): the same, handed on to the odds. */
export const CAST_LINE = [
  ["create or replace function town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[])\n",
   "create or replace function town.cast_line(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_rnd double precision[], p_luck double precision default null)\n"],
  ["  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs);\n",
   "  odds jsonb := town.odds(p_bait, p_hour, p_rain, p_lucky, p_shallow, p_signs, p_luck);\n"],
];

/** public.town_cast (v123's): the cast is told how lucky the meal was. */
export const TOWN_CAST = [[
  "    array[random(), random(), random(), random(), random(), random()]);\n",
  "    array[random(), random(), random(), random(), random(), random()], town.buff_by(purse, now_, 'lucky'));\n",
]];

/** town.purse_of (v123's): every purse told says how many helpings each of the day's meals has had (town.helped). */
export const PURSE_OF = [[
  "select town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms())",
  "select town.helped(town.blessed(town.settle(town.purse_kept(p_member, p_hold), town.now_ms()), town.thing('fountain', false), p_member::text, town.now_ms()), town.now_ms())",
]];
