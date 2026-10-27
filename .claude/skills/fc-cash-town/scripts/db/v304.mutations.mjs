// The breaks v304.test.mjs must notice, one rule at a time (each named check must fail, by the start of its words).
// Run from the migration harness's folder (fc-migration/scripts), the bench kept after v296:
//   V304_BENCH=<scratch>/after-v296.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v304_the_coin_back_as_a_paytable.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v304.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v304.mutations.mjs
export default ({ swap }) => [
  ["the shares not asked", swap("    if x < edge then exit; end if;", "    exit;"), ["cherry about 50 in 100", "the rows all come up"]],
  ["all of the price back", swap("'amount', floor(p_price * (e ->> 'pct')::numeric / 100)::bigint);", "'amount', p_price::bigint);"), ["every pair pays its row"]],
  ["the reels not the row's symbol", swap("  first_ := coalesce(back_ ->> 'sym', casino.reel());", "  first_ := casino.reel();"), ["every pair pays its row"]],
  ["the settings take any table", swap("alter table public.casino_live_settings add constraint casino_live_settings_back_table_check check (casino.back_table_ok(back_table));\n", ""), ["the settings refuse a table with a part over 1,000%"]],
  ["a part over 1,000 allowed", swap("(e ->> 'pct')::numeric between 1 and 1000", "(e ->> 'pct')::numeric between 1 and 100000"), ["the settings refuse a table with a part over 1,000%", "a part over 1,000% is refused at the desk"]],
  ["the desk drops the table", swap("chip_rate = rate_, free_chips = free_, back_table = table_,", "chip_rate = rate_, free_chips = free_,"), ["kept"]],
  ["a row worth nothing allowed", swap("  if exists (select 1 from jsonb_array_elements(table_) e where floor((p_doc ->> 'price')::integer * (e ->> 'pct')::numeric / 100) < 1)\n    then raise exception 'Every coin back must be at least 1 Casino Coin at this price'; end if;\n", ""), ["a price where a row pays nothing is refused"]],
  ["the pair's amount left behind", swap("  update public.casino_live_prizes set amount = greatest(1, round(casino.back_average(table_, (p_doc ->> 'price')::integer))) where id = 'pair';\n", ""), ["the pair's own amount is the table's average"]],
  ["the paytable's row not said", swap("    if back_ is not null then prize_ := prize_ || jsonb_build_object('sym', back_ -> 'sym', 'pct', back_ -> 'pct'); end if;\n", ""), ["every pair pays its row"]],
  ["anybody draws a row", swap("revoke all on function casino.back_of(jsonb, integer), casino.back_average(jsonb, integer) from public, anon, authenticated;", "grant execute on function casino.back_of(jsonb, integer) to authenticated;"), ["nobody calls casino.back_of"]],
  ["a low price let through", swap("    then raise exception 'At this spin price a row of the coin back pays nothing: set the price to 5 or more in the desk first'; end if;", "    then null; end if;"), ["at a price of 4 it stops"]],
  ["the coins back read rounded", swap("    select coalesce(sum(chance / 100 * case when id = 'pair' then casino.back_average(table_, (p_doc ->> 'price')::integer) else amount end), 0) into back_", "    select coalesce(sum(chance / 100 * amount), 0) into back_"), ["coins back of 100.004 a spin at a price of 100 are refused"]],
  ["the table tips the coins back over", swap("  if back_ >= s.price then raise exception 'With this paytable", "  if false then raise exception 'With this paytable"), ["with coin prizes it would tip over the price, it stops"]],
];
