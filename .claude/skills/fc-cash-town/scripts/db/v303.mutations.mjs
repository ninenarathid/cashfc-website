// The breaks v303.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench kept after v296:
//   V303_BENCH=<scratch>/after-v296.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v303_casino_coins_of_its_own.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v303.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v303.mutations.mjs
export default ({ swap }) => [
  ["a spin without Casino Coins", swap("  if a.chips < s.price then raise exception 'Not enough Casino coins'; end if;\n", ""), ["a spin with Popoto coins only is refused"]],
  ["a spin pays no Casino Coins", swap("chips = chips - s.price + case", "chips = chips - 0 + case"), ["a miss takes 100 Casino Coins"]],
  ["the pair back in nothing", swap("- s.price + case when won.kind = 'coin' then won.amount else 0 end where user_id = me;", "- s.price where user_id = me;"), ["its 100 back in Casino Coins, the purse untouched"]],
  ["a spin's trail without chips", swap("  trail_ := trail_ || '{\"chips\": true}';\n", ""), ["the spin's trail says Casino Coins"]],
  ["members change coins in the trial", swap("select s.access = 'everyone' or (s.access = 'admins' and casino.live_admin_allowed())", "select s.access <> 'closed'"), ["a member may not change coins in the admins' trial"]],
  ["a retry changes again", swap("  select * into old from public.casino_live_chip_moves where request = p_request;\n  if found then", "  select * into old from public.casino_live_chip_moves where request = p_request;\n  if false then"), ["the same request again changes nothing"]],
  ["another amount on the same request", swap("    if old.user_id <> me or old.kind <> 'buy' or old.chips <> p_chips then return jsonb_build_object('ok', false, 'why', 'amount'); end if;\n", ""), ["the same request for another amount is refused"]],
  ["the rate not asked", swap("  cost_ := p_chips::bigint * s.chip_rate;", "  cost_ := p_chips::bigint;"), ["at 3 a coin, 10 cost 30"]],
  ["more than the purse", swap("  if coins_ < cost_ then return", "  if false then return"), ["more than the purse holds is refused"]],
  ["the change not paid", swap("  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb(coins_ - cost_)));\n", ""), ["both held"]],
  ["free coins twice", swap("  if exists (select 1 from public.casino_live_chip_moves where user_id = me and kind = 'free' and day = day_) then", "  if false then"), ["once a day"]],
  ["free coins never off", swap("  if s.free_chips < 1 then return jsonb_build_object('ok', false, 'why', 'off'); end if;\n", ""), ["free coins turned off"]],
  ["the desk drops the rate", swap("ends_at = nullif(p_doc ->> 'ends_at', '')::timestamptz, chip_rate = rate_, free_chips = free_,", "ends_at = nullif(p_doc ->> 'ends_at', '')::timestamptz,"), ["kept"]],
  ["any rate", swap("    rate_ not between 1 and 10000 or free_ not between 0 and 100000 or\n", ""), ["a rate of nothing is refused"]],
  ["the wipe leaves the trial's coins", swap("      select user_id, coins::numeric, -chips::numeric, 0 from public.casino_live_chip_moves where test) t", "      select user_id, 0::numeric, 0::numeric, 0 from public.casino_live_chip_moves where false) t"), ["every Popoto coin back: the spin before v303 and the coins changed"]],
  ["the wipe gives an old spin back in Casino Coins", swap("          case when trail ? 'chips' then 0 else price - case when prize ->> 'kind' = 'coin' then (prize ->> 'amount')::numeric else 0 end end coins,", "          0::numeric coins,"), ["every Popoto coin back: the spin before v303 and the coins changed"]],
  ["the wipe keeps the moves", swap("  delete from public.casino_live_chip_moves where test;\n", ""), ["the moves gone"]],
  ["anon may change coins", swap("public.casino_live_buy(uuid, integer), public.casino_live_free() from public, anon;", "public.casino_live_free() from public, anon;"), ["anon may not call casino_live_buy(uuid,integer)"]],
  ["the trial's coins not counted", swap(" + (select count(*) from public.casino_live_chip_moves where admin_ and test),", ","), ["the desk counts coins taken in the trial as something to wipe"]],
];
