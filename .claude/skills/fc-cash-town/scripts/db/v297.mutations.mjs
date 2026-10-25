// The breaks v297.test.mjs must notice, one rule at a time.
// Run from the migration harness's folder (fc-migration/scripts), the bench cached:
//   V297_BENCH=<scratch>/v297-bench.tar FC_REPO=<tree> node mutate.mjs <tree>/supabase/v297_granny_twillas_shop_and_its_auction.sql <tree>/.claude/skills/fc-cash-town/scripts/db/v297.test.mjs <tree>/.claude/skills/fc-cash-town/scripts/db/v297.mutations.mjs
export default ({ swap }) => [
  ["anon may bid", swap("revoke all on function public.town_bid(bigint, integer, uuid) from public, anon;", "grant execute on function public.town_bid(bigint, integer, uuid) to anon;"), ["anon may call none of it"]],
  ["the bids open to members", swap("revoke all on public.town_bids from anon, authenticated;", "grant select on public.town_bids to authenticated;"), ["the tables are closed", "a member reads no bid table"]],
  ["a thing for nothing", swap("perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - price));", ""), ["bought: coins out"]],
  ["a retried buy charged again", swap("    return town.answer(me, jsonb_build_object('ok', true, 'wearable', receipt.wearable, 'price', receipt.price, 'repeated', true, 'dressed', town.dressed_of(me)));", ""), ["a request retried is answered once"]],
  ["a thing bought twice", swap("if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = p_wearable) then return town.answer(me, town.no('known')); end if;\n  purse", "purse"), ["had already"]],
  ["no season", swap("if (from_ <= to_ and (at_ < from_ or at_ > to_)) or (from_ > to_ and at_ < from_ and at_ > to_) then return null; end if;", ""), ["ghostcap on", "batpendant on"]],
  ["a bid for nothing", swap("perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - pay));", ""), ["a free copy at the start", "coins out of purses"]],
  ["the one pushed out is never paid back", swap("if out_ is not null then perform town.auction_pay_back(a, out_); end if;", ""), ["the later of the two at 1000 pushed out", "m3 pushed out"]],
  ["no step over the lowest held", swap("least_ := cut + town.auction_step(cut, a.step_pct, a.step_min);", "least_ := cut + 1;"), ["both held: the lowest and a step"]],
  ["a raise pays it all again", swap("pay := p_amount - mine;", "pay := p_amount;"), ["a raise pays only the difference"]],
  ["whoever has it bids again", swap("if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = a.wearables[1]) then return town.answer(me, town.no('known')); end if;\n  select b.amount into mine", "select b.amount into mine"), ["whoever has the design"]],
  ["the close never moves", swap("update public.town_auctions x set closes_at = least(a.hard_close, greatest(a.closes_at, now() + interval '5 minutes')) where x.id = a.id;", "null;"), ["a bid in the last five minutes"]],
  ["the close moves past the hard close", swap("closes_at = least(a.hard_close, greatest(a.closes_at, now() + interval '5 minutes'))", "closes_at = greatest(a.closes_at, now() + interval '5 minutes')"), ["a bid in the last five minutes"]],
  ["a closed round takes bids", swap("if a.settled_at is not null or now() < a.opens_at or now() >= a.closes_at then", "if false then"), ["a closed round takes nothing"]],
  ["copies numbered worst first", swap("for b in select x.member_id, x.amount from public.town_bids x where x.auction_id = p_id order by x.amount desc, x.at asc loop", "for b in select x.member_id, x.amount from public.town_bids x where x.auction_id = p_id order by x.amount asc, x.at asc loop"), ["copies numbered best first", "the wardrobe says the round"]],
  ["never settled by the wardrobe", swap("  perform town.auctions_due();\n  return jsonb_build_object('dressed'", "  return jsonb_build_object('dressed'"), ["the wardrobe settles a round nobody looked at"]],
  ["bidders' ids on the board", swap("'bids', coalesce((select jsonb_agg(jsonb_build_object('name', town.auction_name(b.member_id),", "'bids', coalesce((select jsonb_agg(jsonb_build_object('member', b.member_id, 'name', town.auction_name(b.member_id),"), ["no bidder's id on the board"]],
  ["the shop's zone left out", swap("unnest(array['town','farm','forest','mountain','cave','shop']) as zones(zone)\n    )\n  );\n\ndrop policy if exists town_maps_send", "unnest(array['town','farm','forest','mountain','cave']) as zones(zone)\n    )\n  );\n\ndrop policy if exists town_maps_send"), ["both map policies name the shop"]],
];
