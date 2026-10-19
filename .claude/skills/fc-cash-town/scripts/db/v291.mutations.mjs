// The breaks v291.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench cached:
//   V291_BENCH=<scratch>/bench-v290.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v291_a_farm_of_animals.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v291.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v291.mutations.mjs
export default ({ swap }) => [
  ["anon may call it", swap("revoke all on function public.town_animals(jsonb, text) from public, anon;", "grant execute on function public.town_animals(jsonb, text) to anon;"), ["anon has no grant to it"]],
  ["anybody's animal is collected", swap("select * into row_ from public.town_animals x where x.id = id_ and x.owner = me for update;", "select * into row_ from public.town_animals x where x.id = id_ for update;"), ["only the owner collects"]],
  ["a stranger cares", swap("if helper and not town.animal_may_care(row_.owner, me) then return town.answer(me, town.no('theirs')); end if;", ""), ["a stranger may not care"]],
  ["a retried call does it again", swap("if past is not null then return town.answer(me, past); end if;", ""), ["a retried buy is the first one"]],
  ["a baby for no coins", swap("if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;\n    place_ := town.animal_free_place(me, 'producing', k);", "    place_ := town.animal_free_place(me, 'producing', k);"), ["a chick dearer than the purse"]],
  ["the tables open to members", swap("revoke all on public.town_animals, public.town_herds, public.town_pasture, public.town_animal_asks from public, anon, authenticated;", "grant select on public.town_animals, public.town_herds, public.town_pasture, public.town_animal_asks to authenticated;"), ["town_animals closed to members"]],
  ["no cap on friend care", swap("pts := least((kn->'care'->>'cap')::integer - care_n, floor(hours / (kn->'care'->>'foodHours')::double precision)::integer);", "pts := floor(hours / (kn->'care'->>'foodHours')::double precision)::integer;"), ["thirty a day at most"]],
  ["parents never rest", swap("if (an->>'rest')::double precision > now_ or (bn->>'rest')::double precision > now_ then return town.answer(me, town.no('rest')); end if;", ""), ["the parents rest"]],
  ["anybody writes a breed out", swap("if pas.found->item->>'by' is distinct from me::text then return town.answer(me, town.no('theirs')); end if;", ""), ["only the first breeder writes it out"]],
];
