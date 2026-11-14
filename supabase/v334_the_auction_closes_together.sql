-- v334 — the auction's rounds close together: a late bid moves every round still open, not its own alone
--
-- Run this once in the Supabase SQL editor, after v333. Running it again is safe: it only replaces public.town_bid.
-- Run it before Sunday 15 November 2026, 20:00 Bangkok, when the moon-lantern and maple rounds (3 and 4) close. The
-- page needs nothing new: it reads each round's close from the board as it always has.
--
-- Why. The owner, 2026-10-26: "ต้องเลือกประมูลได้แค่ทีละชิ้น 1 ผู้เล่นต่อ 1 ชุดเท่านั้น". v297 keeps a member's bid on
-- one round still open, but a bid in a round's last five minutes moved that round's close alone. So two rounds that
-- close at the same minute come apart as soon as one has a late bid: the quiet one closes and is settled, and v297's
-- one-round rule no longer sees a bid that stands on a SETTLED round. Its winner may then bid on the round still running
-- and win a second set. Halloween came close (2026-10-31: the pumpkin settled at 18:00:03 while the count ran on to
-- 18:12:04; nobody did it). Rounds 3 and 4 both close at 20:00 with a hard close at 20:30.
--
-- What changes, and only this:
--   * A bid in the last five minutes of its round (or a bid that moves away from a round in ITS last five minutes)
--     moves the close of every round open at that moment to five minutes on, as before never shortening a close and
--     never past each round's own hard close. Rounds closing at the same minute therefore stay together to the end and
--     are settled in the same look; a round whose close is days away is left as it is (the greater of the two).
--   * So that two bids on different rounds never wait on each other in opposite orders (each may now write every open
--     round), a bid first holds every round not yet settled, in the order of their ids, where v297 held only the round
--     bid on and the one the bid came from. The settling (town.auctions_due, run first) already goes in id order.
--   * Everything else is v297's text as it ran: the one-round rule and a bid moving, the step, the pay-back, receipts.
--
-- lib/town/auction's `closeTogether` is the page's twin (the browser's trial in the test room uses it).

create or replace function public.town_bid(p_auction bigint, p_amount integer, p_request uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  a public.town_auctions%rowtype;
  other public.town_auctions%rowtype;
  carried integer := 0;
  receipt town.auction_receipts%rowtype;
  mine integer;
  others integer;
  cut integer;
  least_ integer;
  pay integer;
  out_ uuid;
  who uuid;
  purse jsonb;
  late boolean;
begin
  if p_auction is null or p_amount is null or p_request is null or p_amount <= 0 or p_amount > 100000000 then return town.answer(me, town.no('none')); end if;
  perform town.auctions_due();
  -- (v334) every round not yet settled, and this one, in the order of their ids: a late bid writes the close of every
  -- open round, so any two bids take the same rows in the same order and never wait on each other; the purses below
  -- are held after the rounds, in one order only
  perform 1 from public.town_auctions x
   where x.id = p_auction or x.settled_at is null
   order by x.id for update;
  select * into a from public.town_auctions x where x.id = p_auction;
  if not found then return town.answer(me, town.no('none')); end if;
  select * into receipt from town.auction_receipts r where r.member_id = me and r.request = p_request;
  if found then
    if receipt.auction_id is distinct from p_auction or receipt.amount is distinct from p_amount then return town.answer(me, town.no('none')); end if;
    -- (the same bid asked again, its answer lost on the way: nothing more is taken, and it says so: Codex's check)
    return town.answer(me, jsonb_build_object('ok', true, 'repeated', true, 'pay', 0, 'auction', town.auction_board(me, p_auction)));
  end if;
  if a.settled_at is not null or now() < a.opens_at or now() >= a.closes_at then
    return town.answer(me, town.no('closed') || jsonb_build_object('auction', town.auction_board(me, p_auction)));
  end if;
  if exists (select 1 from public.town_dressed d where d.member_id = me and d.wearable = a.wearables[1]) then return town.answer(me, town.no('known')); end if;
  select b.amount into mine from public.town_bids b where b.auction_id = a.id and b.member_id = me;
  mine := coalesce(mine, 0);
  -- (my bid on another round still open, read again under the lock. Only when I have none here: a raise here moves
  -- nothing)
  select y.* into other from public.town_bids b join public.town_auctions y on y.id = b.auction_id
   where b.member_id = me and y.settled_at is null and b.auction_id <> a.id order by b.auction_id limit 1;
  if found and mine = 0 then
    select b.amount into carried from public.town_bids b where b.auction_id = other.id and b.member_id = me;
    carried := coalesce(carried, 0);
  end if;
  select count(*) into others from public.town_bids b where b.auction_id = a.id and b.member_id <> me;
  if others < a.copies then
    least_ := a.start_price;
  else
    select b.amount, b.member_id into cut, out_ from public.town_bids b where b.auction_id = a.id and b.member_id <> me
      order by b.amount desc, b.at asc offset a.copies - 1 limit 1;
    least_ := cut + town.auction_step(cut, a.step_pct, a.step_min);
  end if;
  least_ := case when mine > 0 then greatest(least_, mine + 1) else greatest(least_, carried) end;
  if p_amount < least_ then
    return town.answer(me, town.no('low') || jsonb_build_object('least', least_, 'auction', town.auction_board(me, p_auction)));
  end if;
  pay := p_amount - case when mine > 0 then mine else carried end;
  -- the purses this bid touches (the bidder's, and the one it pushes out of the copies), held in the order of their ids
  for who in select x.m from (select me as m union select out_ where out_ is not null) x order by x.m loop
    perform town.purse_of(who, true);
    perform 1 from public.town_purses p where p.member_id = who for update;
  end loop;
  purse := town.purse_of(me, true);
  if (purse->>'coins')::numeric < pay then return town.answer(me, town.no('coins')); end if;
  perform town.keep_purse(me, purse || jsonb_build_object('coins', (purse->>'coins')::numeric - pay));
  insert into public.town_bids (auction_id, member_id, amount, at) values (a.id, me, p_amount, now())
    on conflict (auction_id, member_id) do update set amount = excluded.amount, at = excluded.at;
  if out_ is not null then perform town.auction_pay_back(a, out_); end if;
  -- the round my bid came from has me no more (what it held is in this bid)
  if carried > 0 then
    delete from public.town_bids b where b.auction_id = other.id and b.member_id = me;
    perform town.note(me, 'bid_moved', other.design, 1, 0, jsonb_build_object('from', other.id, 'to', a.id, 'amount', carried));
  end if;
  -- (v334) a bid in the last five minutes of its round, or one leaving a round in its last five minutes, moves the close
  -- of every round open now to five minutes after it: never earlier than it was, never past each one's hard close
  late := now() >= a.closes_at - interval '5 minutes' or (carried > 0 and now() >= other.closes_at - interval '5 minutes');
  if late then
    update public.town_auctions x set closes_at = least(x.hard_close, greatest(x.closes_at, now() + interval '5 minutes'))
     where x.settled_at is null and x.opens_at <= now() and x.closes_at > now();
  end if;
  insert into town.auction_receipts (member_id, request, auction_id, amount) values (me, p_request, a.id, p_amount);
  perform town.note(me, 'bid', a.design, 1, -pay, jsonb_build_object('auction', a.id, 'run', a.run, 'amount', p_amount));
  return town.answer(me, jsonb_build_object('ok', true, 'pay', pay, 'auction', town.auction_board(me, p_auction))
    || case when carried > 0 then jsonb_build_object('from', town.auction_board(me, other.id)) else '{}'::jsonb end);
end;
$$;
revoke all on function public.town_bid(bigint, integer, uuid) from public, anon;
grant execute on function public.town_bid(bigint, integer, uuid) to authenticated;

notify pgrst, 'reload schema';

-- What it should say afterwards (read only):
--
--   select position('x.closes_at > now()' in prosrc) > 0 as together from pg_proc where proname = 'town_bid';
--     together: true
--   select has_function_privilege('anon', 'public.town_bid(bigint, integer, uuid)', 'execute') as anon,
--          has_function_privilege('authenticated', 'public.town_bid(bigint, integer, uuid)', 'execute') as members;
--     anon: false, members: true
--   select id, design, closes_at at time zone 'Asia/Bangkok' as closes, hard_close at time zone 'Asia/Bangkok' as hard
--     from public.town_auctions where settled_at is null order by id;
--     3 moonkeeper 2026-11-15 20:00 / 20:30, 4 mapleregent 2026-11-15 20:00 / 20:30 (this file changes no row)
