// The breaks v299.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench kept after v296:
//   V299_BENCH=<scratch>/after-v296.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v299_the_casino_in_the_town.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v299.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v299.mutations.mjs
export default ({ swap }) => [
  ["a member spins in the admins' trial", swap("    if not admin_ then raise exception 'Casino paused or outside event hours'; end if;", "    null;"), ["while the admins try it a member may not spin"]],
  ["closed lets everybody spin", swap("elsif s.access <> 'everyone' or (s.starts_at", "elsif (s.starts_at"), ["closed: a member may not spin", "closed: nor an admin"]],
  ["a forced result once everybody is in", swap("  if p_force is not null and not test_ then raise exception 'Forced results are only for the admins'' trial'; end if;\n", ""), ["no forced result once everybody is in"]],
  ["the trial's wins announced", swap("  if won.id is not null and won.announce and not test_ then", "  if won.id is not null and won.announce then"), ["a test win is never announced"]],
  ["no prize row for a thing won", swap("  if won.kind = 'physical' then", "  if won.kind = 'nothing' then"), ["it is a prize row of the winner's, from the casino"]],
  ["Gil not paid into the wallet", swap("    perform public.credit_wallet(me, won.amount::integer, null, won.name, '#d9a441', tier_, 'tier', null);", "    perform 1;"), ["the gold, forced"]],
  ["the pair's reels a miss's", swap("  elsif won.id = 'pair' then reels_ := jsonb_build_array(first_, first_, casino.reel(first_), casino.reel(first_));", "  elsif won.id = 'pair' then reels_ := jsonb_build_array(first_, casino.reel(first_), casino.reel(), casino.reel());"), ["the pair: the first two alike"]],
  ["a miss with its first two alike", swap("  else reels_ := jsonb_build_array(first_, casino.reel(first_), casino.reel(), casino.reel());", "  else reels_ := jsonb_build_array(first_, first_, casino.reel(), casino.reel());"), ["twelve misses, none with its first two reels alike"]],
  ["the wipe keeps the coins", swap("    perform town.keep_purse(x.user_id, jsonb_set(purse_, '{coins}', to_jsonb(greatest(0, (purse_ ->> 'coins')::numeric + x.spent - x.paid))));", "    perform 1;"), ["the first admin's coins as they were", "the second admin's coins as they were"]],
  ["the wipe keeps the prize rows", swap("  delete from public.prize_wins where id = any (wins_);", ""), ["the prize row gone"]],
  ["the wipe keeps the wallet", swap("    update public.wallets set balance = greatest(0, balance - x.amount), earned = greatest(0, earned - x.amount), updated_at = now() where profile_id = x.profile_id;", "    null;"), ["the wallet as it was"]],
  ["the wipe takes real spins", swap("  delete from public.casino_live_spins where test;", "  delete from public.casino_live_spins where true;"), ["real spins are never wiped"]],
  ["coins back over the price kept", swap("  if back_ >= (p_doc ->> 'price')::integer then raise exception 'Coins paid back must average under the price'; end if;", ""), ["coins back over the price are refused", "coins back equal to the price are refused"]],
  ["the pair as Gil", swap("(x ->> 'chance')::numeric not between 0 and 100 or (x ->> 'id' = 'pair' and x ->> 'kind' <> 'coin')", "(x ->> 'chance')::numeric not between 0 and 100"), ["the pair as Gil is refused"]],
  ["a member opens it", swap("declare me uuid := casino.require_live_admin(); s public.casino_live_settings;\nbegin\n  if p_access is null", "declare me uuid := auth.uid(); s public.casino_live_settings;\nbegin\n  if p_access is null"), ["a member may not open it"]],
  ["the spin not told", swap("  perform casino.hint('spin', to_jsonb(old) - 'trail');\n", ""), ["the spin is told, once, and nothing else"]],
  ["the casino's zone left out", swap("        from unnest(array['town','farm','forest','mountain','cave','shop','casino']) as zones(zone)\n    )\n  );\n\ndrop policy if exists town_maps_send", "        from unnest(array['town','farm','forest','mountain','cave','shop']) as zones(zone)\n    )\n  );\n\ndrop policy if exists town_maps_send"), ["both map policies name the casino"]],
];
