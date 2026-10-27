// The breaks v300.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench kept after v296:
//   V300_BENCH=<scratch>/after-v296.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v300_ninenine_can_add_coins.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v300.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v300.mutations.mjs
export default ({ swap }) => [
  ["any admin may add", swap("if me is distinct from '9c0e6904-df00-452d-b005-dac3fa6cd1d7'::uuid or not exists", "if not exists"), ["another admin is refused"]],
  ["Ninenine without his admin flag", swap("or not exists (select 1 from public.profiles p where p.id = me and p.is_admin) then\n    return jsonb_build_object('ok', false, 'why', 'forbidden');", "then\n    return jsonb_build_object('ok', false, 'why', 'forbidden');"), ["Ninenine without his admin flag is refused"]],
  ["no ceiling", swap("p_amount not between 1 and 1000000 then", "p_amount < 1 then"), ["over a million is refused"]],
  ["a retry adds again", swap("  if found then\n    if prior_.amount", "  if false then\n    if prior_.amount"), ["the same request again adds nothing"]],
  ["another amount on the same request", swap("    if prior_.amount <> p_amount or prior_.member_id <> me then return jsonb_build_object('ok', false, 'why', 'amount'); end if;\n", ""), ["the same request for another amount is refused"]],
  ["the coins not kept", swap("  perform town.keep_purse(me, jsonb_set(purse_, '{coins}', to_jsonb(after_)));\n", ""), ["the purse holds them"]],
  ["the grant not kept", swap("  insert into public.town_admin_coin_grants (request, member_id, amount, coins_after) values (p_request, me, p_amount, after_);\n", ""), ["each grant kept, once"]],
  ["anon may call it", swap("revoke all on function public.town_admin_coins(integer, uuid) from public, anon, authenticated;", "grant execute on function public.town_admin_coins(integer, uuid) to anon;"), ["anon may not call it"]],
];
