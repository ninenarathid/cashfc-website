// The breaks v291.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench cached:
//   V291_BENCH=<scratch>/bench-v290.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v291_a_farm_of_animals.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v291.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v291.mutations.mjs
export default ({ swap }) => [
  ["anon may call it", swap("revoke all on function public.town_animals(jsonb, text) from public, anon;", "grant execute on function public.town_animals(jsonb, text) to anon;"), ["anon has no grant to it"]],
  ["anybody's animal is collected", swap("select * into row_ from public.town_animals x where x.id = id_ and x.owner = me for update;", "select * into row_ from public.town_animals x where x.id = id_ for update;"), ["only the owner collects"]],
  ["a stranger cares", swap("if helper and not town.animal_may_care(row_.owner, me) then return town.answer(me, town.no('theirs')); end if;", ""), ["a stranger may not care"]],
  ["a retried call does it again", swap("if past is not null then return town.answer(me, past); end if;", ""), ["a retried buy is the first one"]],
  ["a baby for no coins", swap("if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;\n    home_ := town.animal_free_home(me, herd, k);", "    home_ := town.animal_free_home(me, herd, k);"), ["a chick dearer than the purse"]],
  ["the tables open to members", swap("revoke all on public.town_animals, public.town_herds, public.town_pasture, public.town_animal_asks from public, anon, authenticated;", "grant select on public.town_animals, public.town_herds, public.town_pasture, public.town_animal_asks to authenticated;"), ["town_animals closed to members"]],
  ["no cap on friend care", swap("pts := least((kn->'care'->>'cap')::integer - care_n, floor(hours / (kn->'care'->>'foodHours')::double precision)::integer);", "pts := floor(hours / (kn->'care'->>'foodHours')::double precision)::integer;"), ["thirty a day at most"]],
  ["parents never rest", swap("if (an->>'rest')::double precision > now_ or (bn->>'rest')::double precision > now_ then return town.answer(me, town.no('rest')); end if;", ""), ["the parents rest"]],
  ["anybody writes a breed out", swap("if pas.found->item->>'by' is distinct from me::text then return town.answer(me, town.no('theirs')); end if;", ""), ["only the first breeder writes it out"]],
  // (the barns, sexes, the pen, handing on, stats: the owner's answers of 2026-10-20)
  ["a second barn", swap("if herd->>'barn' is not null then return town.answer(me, town.no('had')); end if;", ""), ["one barn a member"]],
  ["another's barn taken", swap("if found then\n      id2 := row_.owner; hold_h := row_.h;", "if false then\n      id2 := row_.owner; hold_h := row_.h;"), ["a barn nobody else's"]],
  ["no index on the barn", swap("create unique index if not exists town_herds_barn on public.town_herds ((h->>'barn'));", ""), ["no barn two members', past the function too"]],
  ["a barn for nothing", swap("if town.held(purse->'bag', 'log') < (r->>'logs')::integer or town.held(purse->'bag', 'stoneTile') < (r->>'stone')::integer then", "if false then"), ["a barn wants logs and stone tiles"]],
  ["cream of the uncle's milk", swap("coalesce(town.cat('animals')->'farmFamily'->>(x->>0), x->>0)", "case when x->>0 = 'milk' then 'farmMilk' else coalesce(town.cat('animals')->'farmFamily'->>(x->>0), x->>0) end"), ["cream and cheese of farm milk alone"]],
  ["eggs left in the forest", swap("where f->>'item' <> 'egg')), updated_at = now()", "where true)), updated_at = now()"), ["crashed"]], // (the migration's own last check refuses it: 'v291: an egg in the forest')
  ["enlarged for nothing", swap("if r is null then return town.answer(me, town.no('full')); end if;\n    price := (r->>'coins')::integer;", "if r is null then return town.answer(me, town.no('full')); end if;\n    price := 0;"), ["enlarged to four for 1,000, 40 logs and 12 tiles"]],
  ["animals without a barn", swap("if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;\n    price := (sp->>'price')::integer;", "    price := (sp->>'price')::integer;"), ["no barn, no animals"]],
  ["taken back while one is free", swap("or (select count(*) from public.town_herds x where x.h->>'barn' is not null) < (kn->'barns'->>'count')::integer then", "then"), ["none taken back while a barn is free"]],
  ["a cross of one sex", swap("if an->>'sex' = bn->>'sex' then return town.answer(me, town.no('sex')); end if;\n    if (an->>'hearts')", "    if (an->>'hearts')"), ["a cross is one of each sex"]],
  ["a rooster lays", swap("select coalesce(p_a->>'sex', 'f') <> 'm' or p_a->>'species' = 'sheep'", "select true"), ["a rooster lays nothing"]],
  ["fed in the pen", swap("if coalesce(row_.a->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;", ""), ["nothing done in the pen"]],
  ["an offer taken by anybody", swap("if of_ is null or of_->>'to' <> me::text then return town.answer(me, town.no('none')); end if;\n    offers_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, i) where x->>'id' <> of_->>'id');\n    if coalesce", "if of_ is null then return town.answer(me, town.no('none')); end if;\n    offers_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, i) where x->>'id' <> of_->>'id');\n    if coalesce"), ["a third may not take it"]],
  ["a friend's animal unasked", swap("if helper and not (town.animal_lent(bn, now_) and", "if false and not (town.animal_lent(bn, now_) and"), ["a friend's animal unasked"]],
  ["stats not by care", swap("elsif r < two + (i->>'upBase')::double precision + (i->>'upCare')::double precision * care then v := v + 1;", "elsif r < two + (i->>'upBase')::double precision + (i->>'upCare')::double precision then v := v + 1;"), ["child stats #0"]],
  ["thrift eats nothing less", swap("rate := (case when out_ then rate_out else 1 end) * (1 - thrift_);", "rate := (case when out_ then rate_out else 1 end);"), ["a thrifty animal eats less"]],
];
