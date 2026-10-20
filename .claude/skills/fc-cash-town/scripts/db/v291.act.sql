-- ── 4. Every step a keeper takes: lib/town/animal-act's animalAction, case for case ───────────────────────────────────
-- One call, one step. Only an animal's owner collects, breeds, sells, names, moves or hands it on; somebody the owner
-- allows may pet it, give a treat and fill its trough from their own bag, for helpers points (30 a day). Nothing makes
-- an animal grow at once. Every refusal comes before anything is written. A retried call with the same request answers
-- the first answer.
create or replace function public.town_animals(p_input jsonb, p_request text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me uuid := town.member();
  now_ double precision := town.now_ms();
  k jsonb := town.cat('animals');
  kn jsonb;
  act text := coalesce(p_input->>'action', '');
  purse jsonb;
  past jsonb;
  pas record;
  herd jsonb; herd0 jsonb; hold_h jsonb;
  an jsonb; bn jsonb; cn jsonb;
  row_ record;
  sp jsonb;
  id_ uuid; id2 uuid; to_ uuid;
  touched jsonb := '[]'::jsonb;   -- animals written by this step, as they are after it
  removed jsonb := '[]'::jsonb;
  others jsonb := '[]'::jsonb;    -- other members' herds this step changed, as they are told
  got jsonb;
  notes jsonb := '[]'::jsonb;     -- [what, n, line, pts, doc, coins]
  offers_ jsonb; asks_ jsonb; of_ jsonb;
  item text; grade_ integer; n_ integer; price integer; hours double precision; grow double precision;
  home_ text; sex_ text; stage_ text; helper boolean; pts integer; care_day integer; care_n integer;
  used_ jsonb; r jsonb; units integer; whole_ boolean; grades jsonb; q integer; byg integer[]; bag jsonb;
  find text; out_n integer; outside jsonb; banked integer; breed jsonb; collar boolean; tool text; play jsonb;
  offering text; dawn text; kind_ text; step jsonb; target text; right_ boolean; odds integer; fee integer; hit boolean;
  child text; born double precision; twin boolean := false; first_ boolean := false; clue boolean := false; misses integer;
  book jsonb; stepkey text; spell jsonb; mins integer; run jsonb; rider jsonb; leg_ms double precision; stops jsonb;
  day_ integer; band_ integer; key_ integer; spots jsonb; spot_ integer; door_ jsonb; open_ boolean; last_ jsonb;
  dawns text[]; reals text[]; coins_ integer; credit_ integer; in_barn integer; in_pen integer;
  ans jsonb;
begin
  if k is null then return town.answer(me, town.no('none')); end if;
  kn := k->'knobs';
  if p_request is not null and char_length(p_request) not between 8 and 80 then return town.answer(me, town.no('none')); end if;
  -- (the pasture's lock first: a second call of the same request waits for the first, and then finds its answer)
  select * into pas from public.town_pasture where one for update;
  -- (a retried call: the answer it had, the purse as it is now)
  if p_request is not null then
    select x.answer into past from public.town_animal_asks x where x.member = me and x.request = p_request;
    if past is not null then return town.answer(me, past); end if;
  end if;
  purse := town.purse_of(me, true);
  herd := town.animal_herd(me); herd0 := herd;
  -- (the warm bottle counts from my first step after it is had: my animals brought to now without it, its moment written)
  if jsonb_typeof(herd->'bottleAt') is distinct from 'number' and exists (select 1 from public.town_herds x where x.owner = me)
     and coalesce(town.gifts_of(purse)->'had' ? (k->'gifts'->>'bottle'), false) then
    with s as (update public.town_animals x set a = town.animal_settle(x.a, now_, herd->'door', false, k), changed = now_::bigint where x.owner = me returning x.a)
    select touched || coalesce(jsonb_agg(s.a), '[]'::jsonb) into touched from s;
    herd := herd || jsonb_build_object('bottleAt', now_);
    update public.town_herds x set h = herd, changed = now_::bigint where x.owner = me;
    herd0 := herd;
  end if;
  offers_ := town.animal_live(pas.offers, now_, (kn->>'offerHours')::double precision);
  asks_ := town.animal_live(pas.asks, now_, (kn->>'askHours')::double precision);

  if act = 'look' then
    return town.answer(me, jsonb_build_object('ok', true, 'world', town.animal_world(me)));

  elsif act = 'barn' then
    -- a barn of the 24 bought of Uncle Popoto, one a member, its first stage; one left untended `untended.reclaim` days goes
    -- to one who waits for a barn, only when none stands free: its animals to its owner's pen, the coins of its stages kept
    -- towards their next
    n_ := floor(coalesce((p_input->>'index')::double precision, -1))::integer;
    if n_ < 0 or n_ >= (kn->'barns'->>'count')::integer then return town.answer(me, town.no('none')); end if;
    if herd->>'barn' is not null then return town.answer(me, town.no('had')); end if;
    id2 := null;
    select x.owner, x.h into row_ from public.town_herds x where x.h->>'barn' = n_::text for update;
    if found then
      id2 := row_.owner; hold_h := row_.h;
      if floor((now_ - coalesce((hold_h->>'lastCare')::double precision, 0)) / 86400000) < (kn->'untended'->>'reclaim')::integer
        or (select count(*) from public.town_herds x where x.h->>'barn' is not null) < (kn->'barns'->>'count')::integer then
        return town.answer(me, town.no('taken')); end if;
    end if;
    r := kn->'barns'->'stages'->0;
    price := (r->>'coins')::integer;
    credit_ := coalesce((herd->>'credit')::integer, 0);
    coins_ := greatest(0, price - credit_);
    if (purse->>'coins')::integer < coins_ then return town.answer(me, town.no('coins')); end if;
    if town.held(purse->'bag', 'log') < (r->>'logs')::integer or town.held(purse->'bag', 'stoneTile') < (r->>'stone')::integer then
      return town.answer(me, town.no('nothing')); end if;
    if id2 is not null then
      with moved as (
        update public.town_animals x set a = town.animal_settle(x.a, now_, hold_h->'door', town.animal_bottle(x.owner), k) || '{"home": "pen", "lent": null}'::jsonb, changed = now_::bigint
         where x.owner = id2 and coalesce(x.a->>'home', 'barn') <> 'pen' returning x.a)
      select touched || coalesce(jsonb_agg(m.a), '[]'::jsonb) into touched from moved m;
      door_ := coalesce(hold_h->'door', '[]'::jsonb);
      last_ := door_->(jsonb_array_length(door_) - 1);
      hold_h := hold_h || jsonb_build_object('barn', null, 'credit', coalesce((hold_h->>'credit')::integer, 0) + town.animal_stages_paid(coalesce((hold_h->>'room')::integer, 0), k),
        'door', case when last_ is not null and last_->1 = 'null'::jsonb then jsonb_set(door_, array[(jsonb_array_length(door_) - 1)::text, '1'], to_jsonb(now_)) else door_ end);
      update public.town_herds x set h = hold_h, changed = now_::bigint where x.owner = id2;
      others := others || jsonb_build_array(town.animal_herd_told(hold_h, id2, me));
      notes := notes || jsonb_build_array(jsonb_build_array('animal_reclaim', 1, null, 0, jsonb_build_object('barn', n_, 'from', id2), 0));
    end if;
    herd := herd || jsonb_build_object('barn', n_, 'room', (r->>'room')::integer, 'credit', credit_ - (price - coins_), 'lastCare', now_, 'door', '[]'::jsonb);
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - coins_,
      'bag', town.take(town.take(purse->'bag', 'log', (r->>'logs')::integer), 'stoneTile', (r->>'stone')::integer));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_barn', 1, null, 0,
      jsonb_build_object('barn', n_, 'logs', (r->>'logs')::integer, 'stone', (r->>'stone')::integer), -coins_));

  elsif act = 'enlarge' then
    -- my barn's next stage: room for more ("ลงทุนเพิ่มเพื่อขยาย"), of coins (less any credit), logs and stone tiles
    if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;
    r := town.animal_next_stage(coalesce((herd->>'room')::integer, 0), k);
    if r is null then return town.answer(me, town.no('full')); end if;
    price := (r->>'coins')::integer;
    credit_ := coalesce((herd->>'credit')::integer, 0);
    coins_ := greatest(0, price - credit_);
    if (purse->>'coins')::integer < coins_ then return town.answer(me, town.no('coins')); end if;
    if town.held(purse->'bag', 'log') < (r->>'logs')::integer or town.held(purse->'bag', 'stoneTile') < (r->>'stone')::integer then
      return town.answer(me, town.no('nothing')); end if;
    herd := herd || jsonb_build_object('room', (r->>'room')::integer, 'credit', credit_ - (price - coins_));
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - coins_,
      'bag', town.take(town.take(purse->'bag', 'log', (r->>'logs')::integer), 'stoneTile', (r->>'stone')::integer));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_enlarge', (r->>'room')::integer, null, 0,
      jsonb_build_object('barn', (herd->>'barn')::integer, 'logs', (r->>'logs')::integer, 'stone', (r->>'stone')::integer), -coins_));

  elsif act = 'buy' then
    sp := k->'species'->(p_input->>'species');
    sex_ := p_input->>'sex';
    if sp is null or coalesce(sex_, '') not in ('m', 'f') then return town.answer(me, town.no('none')); end if;
    if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;
    price := (sp->>'price')::integer;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    home_ := town.animal_free_home(me, herd, k);
    if home_ is null then return town.answer(me, town.no('places')); end if;
    id_ := gen_random_uuid();
    an := town.animal_new(id_, me, p_input->>'species', k->'starters'->>(p_input->>'species'), now_, true, home_, sex_, town.animal_bought_stats(k));
    insert into public.town_animals (id, owner, a, changed) values (id_, me, an, now_::bigint);
    herd := herd || jsonb_build_object('lastCare', now_);
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price);
    touched := touched || jsonb_build_array(an);
    got := jsonb_build_object('child', an->>'breed');
    notes := notes || jsonb_build_array(jsonb_build_array('animal_buy', 1, null, 0, jsonb_build_object('species', p_input->>'species', 'sex', sex_), -price));

  elsif act = 'shop' then
    item := p_input->>'item'; n_ := floor(coalesce((p_input->>'n')::double precision, 0))::integer;
    price := (k->'shop'->>item)::integer;
    if price is null or price <= 0 or n_ < 1 or n_ > 99 then return town.answer(me, town.no('none')); end if;
    if (purse->>'coins')::integer < price * n_ then return town.answer(me, town.no('coins')); end if;
    if town.room_g(purse->'bag', item, 0) < n_ then return town.answer(me, town.no('room')); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price * n_, 'bag', town.put_g(purse->'bag', item, n_, 0));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_shop', n_, null, 0, jsonb_build_object('item', item), -price * n_));

  elsif act = 'facade' then
    price := (kn->'facades'->>((herd->>'facade')::integer))::integer;
    if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;
    if price is null then return town.answer(me, town.no('full')); end if;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    herd := herd || jsonb_build_object('facade', (herd->>'facade')::integer + 1);
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_facade', (herd->>'facade')::integer, null, 0, '{}'::jsonb, -price));

  elsif act in ('sell', 'name', 'move', 'collect', 'pick', 'cradle', 'offer') then
    begin id_ := (p_input->>'id')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    select * into row_ from public.town_animals x where x.id = id_ and x.owner = me for update;
    if not found then return town.answer(me, town.no('theirs')); end if;
    an := town.animal_settle(row_.a, now_, herd->'door', town.animal_bottle(me), k);
    stage_ := town.animal_stage(an, now_, k);
    sp := k->'species'->(an->>'species');

    if act = 'sell' then
      if stage_ = 'coming' then return town.answer(me, town.no('stage')); end if;
      if town.animal_lent(an, now_) then return town.answer(me, town.no('lent')); end if;
      price := case when (an->>'bought')::boolean then floor((sp->>'price')::double precision * (kn->'sellBack'->>'bought')::double precision)::integer else (sp->>'bredBack')::integer end;
      delete from public.town_animals x where x.id = id_ and x.owner = me;
      removed := removed || to_jsonb(id_::text);
      offers_ := (select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, o) where x->>'animal' <> id_::text);
      asks_ := (select coalesce(jsonb_agg(x order by o), '[]'::jsonb) from jsonb_array_elements(asks_) with ordinality e(x, o) where x->>'mine' <> id_::text and x->>'theirs' <> id_::text);
      purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer + price);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_sell', 1, null, 0, jsonb_build_object('species', an->>'species', 'breed', an->>'breed'), price));
      an := null;

    elsif act = 'name' then
      item := left(btrim(coalesce(p_input->>'name', '')), 16);
      if item ~ '[<>]' then return town.answer(me, town.no('name')); end if;
      an := an || jsonb_build_object('name', item);

    elsif act = 'move' then
      -- between my barn and Uncle Popoto's pen (where it waits, frozen)
      home_ := p_input->>'home';
      if coalesce(home_, '') not in ('barn', 'pen') then return town.answer(me, town.no('none')); end if;
      if coalesce(an->>'home', 'barn') <> home_ then
        if town.animal_lent(an, now_) then return town.answer(me, town.no('lent')); end if;
        select count(*) filter (where coalesce(x.a->>'home', 'barn') <> 'pen'), count(*) filter (where x.a->>'home' = 'pen') into in_barn, in_pen
          from public.town_animals x where x.owner = me;
        if home_ = 'barn' then
          if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;
          if in_barn >= (herd->>'room')::integer then return town.answer(me, town.no('places')); end if;
        elsif in_pen >= (kn->>'pen')::integer then return town.answer(me, town.no('places'));
        end if;
        an := an || jsonb_build_object('home', home_, 'at', now_);
      end if;

    elsif act = 'collect' then
      if coalesce(an->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
      if stage_ <> 'adult' then return town.answer(me, town.no('stage')); end if;
      if (an->>'banked')::integer < 1 then return town.answer(me, town.no('nothing')); end if;
      tool := k->'tools'->>(sp->>'game');
      if town.held(purse->'bag', tool) < 1 then return town.answer(me, town.no('nothing')); end if;
      play := case when jsonb_typeof(p_input->'play') = 'object' then p_input->'play' end;
      if sp->>'game' <> 'eggs' and (play is null or coalesce((play->>'secs')::double precision, 0) < (k->'leastSecs'->>(sp->>'game'))::double precision) then
        return town.answer(me, town.no('soon')); end if;
      banked := (an->>'banked')::integer; outside := coalesce(an->'outside', '[]'::jsonb);
      if sp->>'game' = 'eggs' and coalesce((an->>'outBands')::integer, 0) <> 0 then
        out_n := least(banked - 1, floor(banked * (kn->>'outsideShare')::double precision + random())::integer);
        if out_n > 0 then
          banked := banked - out_n;
          outside := outside || jsonb_build_array(jsonb_build_object('at', k->'eggSpots'->(floor(random() * jsonb_array_length(k->'eggSpots')))::integer, 'n', out_n));
          if jsonb_array_length(outside) > 6 then outside := (select jsonb_agg(x order by o) from jsonb_array_elements(outside) with ordinality e(x, o) where o > jsonb_array_length(outside) - 6); end if;
        end if;
      end if;
      r := town.animal_units(sp->>'game', banked, play, coalesce((p_input->>'cracked')::integer, 0));
      units := (r->>'units')::integer; whole_ := (r->>'whole')::boolean;
      breed := k->'breeds'->(an->>'breed');
      collar := town.gift_works(purse, k->'gifts'->>'collar');
      r := town.animal_range(an, k);
      grades := '[]'::jsonb; byg := array[0, 0, 0, 0];
      for i in 1..units loop q := town.animal_roll(r, collar); grades := grades || to_jsonb(q); byg[town.animal_grade(q) + 1] := byg[town.animal_grade(q) + 1] + 1; end loop;
      purse := town.spend(purse, (kn->'stamina'->>(sp->>'game'))::double precision, now_::bigint);
      bag := purse->'bag';
      for i in 0..3 loop
        if byg[i + 1] > 0 and town.room_g(bag, breed->>'produce', i) < byg[i + 1] then return town.answer(me, town.no('room')); end if;
        if byg[i + 1] > 0 then bag := town.put_g(bag, breed->>'produce', byg[i + 1], i); end if;
      end loop;
      if not coalesce((an->'today'->>'manure')::boolean, false) and town.room_g(bag, 'manure', 0) > 0 then bag := town.put_g(bag, 'manure', 1, 0); end if;
      find := town.animal_find(an->>'species', coalesce((an->>'outBands')::integer, 0), k);
      if find is not null and town.room_g(bag, find, 0) > 0 then bag := town.put_g(bag, find, 1, 0); end if;
      purse := purse || jsonb_build_object('bag', bag);
      an := an || jsonb_build_object('banked', 0, 'narrow', 0, 'outside', outside, 'outBands', 0, 'today', (an->'today') || '{"manure": true}'::jsonb);
      herd := herd || jsonb_build_object('lastCare', now_);
      got := jsonb_build_object('item', breed->>'produce', 'n', units, 'grades', grades, 'whole', whole_, 'find', find);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_collect', units, 'animals', units * (kn->'points'->>'unit')::integer,
        jsonb_build_object('id', id_, 'breed', an->>'breed', 'item', breed->>'produce', 'grades', to_jsonb(byg), 'whole', whole_), 0));

    elsif act = 'pick' then
      spot_ := coalesce((p_input->>'spot')::integer, -1);
      outside := coalesce(an->'outside', '[]'::jsonb);
      if spot_ < 0 or spot_ >= jsonb_array_length(outside) then return town.answer(me, town.no('nothing')); end if;
      n_ := (outside->spot_->>'n')::integer;
      breed := k->'breeds'->(an->>'breed');
      collar := town.gift_works(purse, k->'gifts'->>'collar');
      r := town.animal_range(an, k); bag := purse->'bag'; grades := '[]'::jsonb;
      for i in 1..n_ loop
        q := town.animal_roll(r, collar); grades := grades || to_jsonb(q);
        if town.room_g(bag, breed->>'produce', town.animal_grade(q)) < 1 then return town.answer(me, town.no('room')); end if;
        bag := town.put_g(bag, breed->>'produce', 1, town.animal_grade(q));
      end loop;
      purse := purse || jsonb_build_object('bag', bag);
      herd := herd || jsonb_build_object('lastCare', now_);
      got := jsonb_build_object('item', breed->>'produce', 'n', n_, 'grades', grades, 'spot', outside->spot_->'at');
      an := an || jsonb_build_object('outside', outside - spot_);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_pick', n_, 'animals', n_ * (kn->'points'->>'unit')::integer, jsonb_build_object('id', id_, 'item', breed->>'produce'), 0));

    elsif act = 'cradle' then
      -- grandma's warm cradle (rank 5): a baby of its breed (one in five a real breed), its stats its parent's moved by its care
      if coalesce(an->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
      if stage_ <> 'adult' then return town.answer(me, town.no('stage')); end if;
      home_ := town.animal_free_home(me, herd, k);
      if home_ is null then return town.answer(me, town.no('places')); end if;
      used_ := town.gift_use(purse, k->'gifts'->>'cradle', now_::bigint);
      if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
      purse := used_->'purse';
      select array_agg(x.key order by x.value->>'letter') into reals from jsonb_each(k->'breeds') x where x.value->>'species' = an->>'species' and x.value->>'tier' = 'real';
      child := case when random() < (kn->>'cradleRare')::double precision then reals[1 + floor(random() * array_length(reals, 1))::integer] else an->>'breed' end;
      id2 := gen_random_uuid();
      cn := town.animal_new(id2, me, an->>'species', child, now_, false, home_, case when random() < 0.5 then 'm' else 'f' end, town.animal_child_stats(an, an, k));
      insert into public.town_animals (id, owner, a, changed) values (id2, me, cn, now_::bigint);
      herd := herd || jsonb_build_object('lastCare', now_);
      touched := touched || jsonb_build_array(cn);
      got := jsonb_build_object('child', child, 'sex', cn->>'sex', 'stats', cn->'stats');
      notes := notes || jsonb_build_array(jsonb_build_array('animal_cradle', 1, 'animals', (kn->'points'->>'cradle')::integer, jsonb_build_object('id', id_, 'child', child), 0));

    elsif act = 'offer' then
      -- to hand an animal on: it stays mine until the other says yes (into their pen), for a day
      begin to_ := (p_input->>'to')::uuid; exception when others then to_ := null; end;
      if to_ is null or to_ = me or not town.is_member(to_) then return town.answer(me, town.no('none')); end if;
      if stage_ = 'coming' then return town.answer(me, town.no('stage')); end if;
      if town.animal_lent(an, now_) then return town.answer(me, town.no('lent')); end if;
      if exists (select 1 from jsonb_array_elements(offers_) x where x->>'animal' = id_::text) then return town.answer(me, town.no('used')); end if;
      if (select count(*) from jsonb_array_elements(offers_) x where x->>'from' = me::text) >= (kn->>'pen')::integer then return town.answer(me, town.no('full')); end if;
      offers_ := offers_ || jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'from', me::text, 'to', to_::text, 'animal', id_::text, 'at', now_));
      notes := notes || jsonb_build_array(jsonb_build_array('animal_offer', 1, null, 0, jsonb_build_object('id', id_, 'to', to_), 0));
      an := null;
    end if;

    if an is not null then
      update public.town_animals x set a = an, changed = now_::bigint where x.id = id_;
      touched := touched || jsonb_build_array(an);
    end if;

  elsif act = 'unoffer' then
    select x into of_ from jsonb_array_elements(offers_) x where x->>'id' = p_input->>'offer' limit 1;
    if of_ is null or of_->>'from' <> me::text then return town.answer(me, town.no('none')); end if;
    offers_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, i) where x->>'id' <> of_->>'id');

  elsif act = 'take' then
    select x into of_ from jsonb_array_elements(offers_) x where x->>'id' = p_input->>'offer' limit 1;
    if of_ is null or of_->>'to' <> me::text then return town.answer(me, town.no('none')); end if;
    offers_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, i) where x->>'id' <> of_->>'id');
    if coalesce((p_input->>'yes')::boolean, false) then
      id_ := (of_->>'animal')::uuid;
      select * into row_ from public.town_animals x where x.id = id_ for update;
      if not found or row_.owner::text <> of_->>'from' then return town.answer(me, town.no('none')); end if;
      if town.animal_lent(row_.a, now_) then return town.answer(me, town.no('lent')); end if;
      if (select count(*) from public.town_animals x where x.owner = me and x.a->>'home' = 'pen') >= (kn->>'pen')::integer then return town.answer(me, town.no('places')); end if;
      -- its hearts, stats and breed go with it; it waits in my pen
      an := town.animal_settle(row_.a, now_, town.animal_herd(row_.owner)->'door', town.animal_bottle(row_.owner), k)
        || jsonb_build_object('owner', me::text, 'home', 'pen', 'lent', null);
      update public.town_animals x set owner = me, a = an, changed = now_::bigint where x.id = id_;
      touched := touched || jsonb_build_array(an);
      offers_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(offers_) with ordinality e(x, i) where x->>'animal' <> id_::text);
      asks_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(asks_) with ordinality e(x, i) where x->>'mine' <> id_::text and x->>'theirs' <> id_::text);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_take', 1, null, 0, jsonb_build_object('id', id_, 'from', of_->>'from', 'species', an->>'species', 'breed', an->>'breed'), 0));
    end if;

  elsif act = 'ask' then
    -- a host asks a friend for their animal, for a cross with one of the host's: one of each sex, one species, both grown
    begin id_ := (p_input->>'mine')::uuid; id2 := (p_input->>'theirs')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    select x.a into an from public.town_animals x where x.id = id_ and x.owner = me;
    select x.a, x.owner into bn, to_ from public.town_animals x where x.id = id2;
    if an is null or bn is null or to_ = me then return town.answer(me, town.no('none')); end if;
    an := town.animal_settle(an, now_, herd->'door', town.animal_bottle(me), k);
    bn := town.animal_settle(bn, now_, town.animal_herd(to_)->'door', town.animal_bottle(to_), k);
    if coalesce(an->>'home', 'barn') = 'pen' or coalesce(bn->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
    if an->>'species' <> bn->>'species' then return town.answer(me, town.no('species')); end if;
    if an->>'sex' = bn->>'sex' then return town.answer(me, town.no('sex')); end if;
    if town.animal_stage(an, now_, k) <> 'adult' or town.animal_stage(bn, now_, k) <> 'adult' then return town.answer(me, town.no('stage')); end if;
    if exists (select 1 from jsonb_array_elements(asks_) x where x->>'from' = me::text and x->>'theirs' = id2::text) then return town.answer(me, town.no('used')); end if;
    if (select count(*) from jsonb_array_elements(asks_) x where x->>'from' = me::text) >= (kn->>'asksOpen')::integer then return town.answer(me, town.no('full')); end if;
    asks_ := asks_ || jsonb_build_array(jsonb_build_object('id', gen_random_uuid()::text, 'from', me::text, 'to', to_::text, 'mine', id_::text, 'theirs', id2::text, 'at', now_));
    notes := notes || jsonb_build_array(jsonb_build_array('animal_ask', 1, null, 0, jsonb_build_object('mine', id_, 'theirs', id2, 'to', to_), 0));

  elsif act = 'answer' then
    -- the friend says yes: the animal is lent to the host for an hour, for that cross; the child is the host's
    select x into of_ from jsonb_array_elements(asks_) x where x->>'id' = p_input->>'ask' limit 1;
    if of_ is null or of_->>'to' <> me::text then return town.answer(me, town.no('none')); end if;
    asks_ := (select coalesce(jsonb_agg(x order by i), '[]'::jsonb) from jsonb_array_elements(asks_) with ordinality e(x, i) where x->>'id' <> of_->>'id');
    if coalesce((p_input->>'yes')::boolean, false) then
      select * into row_ from public.town_animals x where x.id = (of_->>'theirs')::uuid and x.owner = me for update;
      if not found then return town.answer(me, town.no('none')); end if;
      an := town.animal_settle(row_.a, now_, herd->'door', town.animal_bottle(me), k);
      if coalesce(an->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
      if town.animal_lent(an, now_) then return town.answer(me, town.no('lent')); end if;
      an := an || jsonb_build_object('lent', jsonb_build_object('to', of_->>'from', 'until', now_ + (kn->>'lendHours')::double precision * 3600000, 'with', of_->>'mine'));
      update public.town_animals x set a = an, changed = now_::bigint where x.id = row_.id;
      touched := touched || jsonb_build_array(an);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_lend', 1, null, 0, jsonb_build_object('id', row_.id, 'to', of_->>'from', 'with', of_->>'mine'), 0));
    end if;

  elsif act in ('feed', 'pet', 'treat') then
    begin id_ := (p_input->>'id')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    select * into row_ from public.town_animals x where x.id = id_ for update;
    if not found then return town.answer(me, town.no('none')); end if;
    helper := row_.owner <> me;
    if helper and not town.animal_may_care(row_.owner, me) then return town.answer(me, town.no('theirs')); end if;
    if coalesce(row_.a->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
    an := town.animal_settle(row_.a, now_, case when helper then town.animal_herd(row_.owner)->'door' else herd->'door' end, town.animal_bottle(row_.owner), k);
    if town.animal_stage(an, now_, k) = 'coming' then return town.answer(me, town.no('stage')); end if;
    sp := k->'species'->(an->>'species');
    care_day := town.day_of(now_::bigint);
    care_n := case when (purse->'animalCare'->>'day')::integer = care_day then coalesce((purse->'animalCare'->>'n')::integer, 0) else 0 end;

    if act = 'feed' then
      item := p_input->>'item'; grade_ := greatest(0, least(3, coalesce((p_input->>'grade')::integer, 0)));
      hours := coalesce((sp->'feeds'->>item)::double precision, case when sp->>'sack' = item then 24 end, (k->'anyFeed'->>item)::double precision, 0);
      grow := case when sp->>'growItem' = item then (kn->>'growFeed')::double precision when item = k->>'dewGrow' then (kn->>'dewFeed')::double precision else 0 end;
      if hours = 0 and grow = 0 then return town.answer(me, town.no('species')); end if;
      if (case when grow > 0 then town.held(purse->'bag', item) else town.held_g(purse->'bag', item, grade_) end) < 1 then return town.answer(me, town.no('nothing')); end if;
      if grow > 0 then
        if town.animal_stage(an, now_, k) = 'adult' then return town.answer(me, town.no('stage')); end if;
        an := an || jsonb_build_object('speedUntil', greatest(coalesce((an->>'speedUntil')::double precision, 0), now_) + grow);
        purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1));
      else
        grow := case when item = 'packedRation' then (kn->>'packed')::double precision else (kn->>'trough')::double precision end;  -- (the trough's room: a packed ration's three days)
        if (an->>'food')::double precision >= grow - 0.01 then return town.answer(me, town.no('full')); end if;
        hours := least(hours, grow - (an->>'food')::double precision);
        an := an || jsonb_build_object('food', (an->>'food')::double precision + hours,
          'narrow', greatest(coalesce((an->>'narrow')::integer, 0), coalesce((kn->'quality'->'narrowBy'->>grade_)::integer, 0)));
        purse := purse || jsonb_build_object('bag', town.animal_take_g(purse->'bag', item, 1, grade_));
        if helper then
          pts := least((kn->'care'->>'cap')::integer - care_n, floor(hours / (kn->'care'->>'foodHours')::double precision)::integer);
          if pts > 0 then
            purse := purse || jsonb_build_object('animalCare', jsonb_build_object('day', care_day, 'n', care_n + pts));
            notes := notes || jsonb_build_array(jsonb_build_array('animal_care', 1, 'helpers', pts, jsonb_build_object('id', id_, 'owner', row_.owner, 'food', hours), 0));
          end if;
        elsif not coalesce((an->'today'->'points'->>'feed')::boolean, false) then
          an := jsonb_set(an, '{today,points}', coalesce(an->'today'->'points', '{}'::jsonb) || '{"feed": true}'::jsonb);
          notes := notes || jsonb_build_array(jsonb_build_array('animal_feed', 1, 'animals', (kn->'points'->>'feed')::integer, jsonb_build_object('id', id_), 0));
        end if;
      end if;
    else
      if coalesce((an->'today'->>act)::boolean, false) then return town.answer(me, town.no('used')); end if;
      if act = 'treat' then
        item := p_input->>'item';
        if not (sp->'treats' ? item) then return town.answer(me, town.no('species')); end if;
        if town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('nothing')); end if;
        purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1));
      end if;
      -- (a gentle animal takes it more to heart)
      an := an || jsonb_build_object('hearts', town.animal_hearts_plus(an, (kn->'heart'->>act)::double precision, k), 'today', (an->'today') || jsonb_build_object(act, true));
      if helper then
        pts := least((kn->'care'->>'cap')::integer - care_n, (kn->'care'->>act)::integer);
        if pts > 0 then
          purse := purse || jsonb_build_object('animalCare', jsonb_build_object('day', care_day, 'n', care_n + pts));
          notes := notes || jsonb_build_array(jsonb_build_array('animal_care', 1, 'helpers', pts, jsonb_build_object('id', id_, 'owner', row_.owner, act, true), 0));
        end if;
      elsif not coalesce((an->'today'->'points'->>act)::boolean, false) then
        an := jsonb_set(an, '{today,points}', coalesce(an->'today'->'points', '{}'::jsonb) || jsonb_build_object(act, true));
        notes := notes || jsonb_build_array(jsonb_build_array('animal_' || act, 1, 'animals', (kn->'points'->>act)::integer, jsonb_build_object('id', id_), 0));
      end if;
    end if;
    -- (the owner's care is written down: the untended rule reads it; a friend's is not the owner's)
    if not helper then herd := herd || jsonb_build_object('lastCare', now_); end if;
    update public.town_animals x set a = an, changed = now_::bigint where x.id = id_;
    touched := touched || jsonb_build_array(an);

  elsif act = 'breed' then
    -- one of each sex, one species, both grown and in a barn: both mine, or the other a friend's lent to me for this one
    begin id_ := (p_input->>'a')::uuid; id2 := (p_input->>'b')::uuid; exception when others then return town.answer(me, town.no('none')); end;
    if id_ = id2 then return town.answer(me, town.no('none')); end if;
    -- (both rows held, the lesser id first)
    perform 1 from public.town_animals x where x.id in (id_, id2) order by x.id for update;
    select x.a into an from public.town_animals x where x.id = id_ and x.owner = me;
    select x.a, x.owner into bn, id2 from public.town_animals x where x.id = (p_input->>'b')::uuid;
    if an is null or bn is null then return town.answer(me, town.no('none')); end if;
    helper := id2 <> me;  -- (the second is borrowed)
    if helper and not (town.animal_lent(bn, now_) and bn->'lent'->>'to' = me::text and (bn->'lent'->>'with' is null or bn->'lent'->>'with' = id_::text)) then
      return town.answer(me, town.no('lent')); end if;
    an := town.animal_settle(an, now_, herd->'door', town.animal_bottle(me), k);
    bn := town.animal_settle(bn, now_, town.animal_herd(id2)->'door', town.animal_bottle(id2), k);
    if coalesce(an->>'home', 'barn') = 'pen' or coalesce(bn->>'home', 'barn') = 'pen' then return town.answer(me, town.no('pen')); end if;
    if town.animal_stage(an, now_, k) <> 'adult' or town.animal_stage(bn, now_, k) <> 'adult' then return town.answer(me, town.no('stage')); end if;
    if an->>'species' <> bn->>'species' then return town.answer(me, town.no('species')); end if;
    if an->>'sex' = bn->>'sex' then return town.answer(me, town.no('sex')); end if;
    if (an->>'hearts')::double precision < (kn->>'breedHearts')::double precision or (bn->>'hearts')::double precision < (kn->>'breedHearts')::double precision then return town.answer(me, town.no('hearts')); end if;
    if (an->>'rest')::double precision > now_ or (bn->>'rest')::double precision > now_ then return town.answer(me, town.no('rest')); end if;
    offering := nullif(p_input->>'offering', '');
    select array_agg(x) into dawns from jsonb_array_elements_text(k->'dawn') x;
    dawn := case when p_input->>'dawn' = any(dawns) then p_input->>'dawn' end;
    if offering is not null and town.held(purse->'bag', offering) < 1 then return town.answer(me, town.no('offering')); end if;
    if dawn is not null and town.held(purse->'bag', dawn) < (case when dawn = offering then 2 else 1 end) then return town.answer(me, town.no('offering')); end if;
    -- (crossOf: the step two parents' letters take with this kind of offering, and whether the offering is the one)
    kind_ := case when offering like 'seed%' then 'seed' when k->'kinds'->'mineral' ? offering then 'mineral' when k->'kinds'->'flower' ? offering then 'flower'
      when offering = 'prism' then 'prism' end;
    select g into step from jsonb_array_elements(k->'graph') g
     where g->>'kind' = kind_ and ((g->'parents'->>0 = k->'breeds'->(an->>'breed')->>'letter' and g->'parents'->>1 = k->'breeds'->(bn->>'breed')->>'letter')
       or (g->'parents'->>0 = k->'breeds'->(bn->>'breed')->>'letter' and g->'parents'->>1 = k->'breeds'->(an->>'breed')->>'letter')) limit 1;
    target := case when step is not null then (select x.key from jsonb_each(k->'breeds') x where x.value->>'species' = an->>'species' and x.value->>'letter' = step->>'child') end;
    right_ := step is not null and offering is not null and k->'offerings'->(an->>'species')->>(step->>'child') = offering;
    odds := case when right_ then least((kn->>'oddsCap')::integer, (kn->'odds'->>(k->'breeds'->target->>'tier'))::integer + case when dawn is not null then (kn->>'dawnBoost')::integer else 0 end) else 0 end;
    fee := (kn->'fees'->>coalesce(nullif(k->'breeds'->target->>'tier', 'starter'),
      case when 'legend' in (k->'breeds'->(an->>'breed')->>'tier', k->'breeds'->(bn->>'breed')->>'tier') then 'legend'
        when 'fantasy' in (k->'breeds'->(an->>'breed')->>'tier', k->'breeds'->(bn->>'breed')->>'tier') then 'fantasy' else 'real' end))::integer;
    if (purse->>'coins')::integer < fee then return town.answer(me, town.no('coins')); end if;
    home_ := town.animal_free_home(me, herd, k);
    if home_ is null then return town.answer(me, town.no('places')); end if;
    hit := right_ and random() * 100 < odds;
    child := case when hit then target when random() < 0.5 then an->>'breed' else bn->>'breed' end;
    born := now_ + (kn->'hatch'->>(k->'species'->(an->>'species')->>'kind'))::double precision;
    -- (its sex at random; its stats the parents', moved by how well both were cared for)
    cn := town.animal_new(gen_random_uuid(), me, an->>'species', child, born, false, home_, case when random() < 0.5 then 'm' else 'f' end, town.animal_child_stats(an, bn, k));
    insert into public.town_animals (id, owner, a, changed) values ((cn->>'id')::uuid, me, cn, now_::bigint);
    touched := touched || jsonb_build_array(cn);
    got := jsonb_build_object('sex', cn->>'sex', 'stats', cn->'stats');
    -- (the twin cradle: a cross with a friend's animal gives its owner a baby too, once a day, if they have room)
    if helper and town.gift_works(purse, k->'gifts'->>'twin') then
      used_ := town.gift_use(purse, k->'gifts'->>'twin', now_::bigint);
      home_ := case when coalesce((used_->>'ok')::boolean, false) then town.animal_free_home(id2, town.animal_herd(id2), k) end;
      if home_ is not null then
        purse := used_->'purse';
        cn := town.animal_new(gen_random_uuid(), id2, an->>'species', child, born, false, home_, case when random() < 0.5 then 'm' else 'f' end, town.animal_child_stats(an, bn, k));
        insert into public.town_animals (id, owner, a, changed) values ((cn->>'id')::uuid, id2, cn, now_::bigint);
        touched := touched || jsonb_build_array(cn);
        twin := true;
      end if;
    end if;
    an := an || jsonb_build_object('rest', now_ + (kn->>'rest')::double precision);
    bn := bn || jsonb_build_object('rest', now_ + (kn->>'rest')::double precision) || case when helper then jsonb_build_object('lent', null) else '{}'::jsonb end;
    update public.town_animals x set a = an, changed = now_::bigint where x.id = (an->>'id')::uuid;
    update public.town_animals x set a = bn, changed = now_::bigint where x.id = (bn->>'id')::uuid;
    touched := touched || jsonb_build_array(an, bn);
    bag := purse->'bag';
    if offering is not null then bag := town.take(bag, offering, 1); end if;
    if dawn is not null then bag := town.take(bag, dawn, 1); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - fee, 'bag', bag);
    herd := herd || jsonb_build_object('lastCare', now_);
    if step is not null and not hit then
      stepkey := (an->>'species') || '.' || (step->>'child');
      book := coalesce(purse->'animalBook', '{"misses": {}}'::jsonb);
      misses := coalesce((book->'misses'->>stepkey)::integer, 0) + 1;
      purse := purse || jsonb_build_object('animalBook', jsonb_set(book, array['misses', stepkey], to_jsonb(misses)));
      clue := misses >= (kn->>'clueAfter')::integer;
    end if;
    if hit and not (pas.found ? child) then
      first_ := true;
      update public.town_pasture p set found = p.found || jsonb_build_object(child, jsonb_build_object('by', me::text, 'at', now_)), changed = now_::bigint where p.one;
    end if;
    got := got || jsonb_build_object('child', child, 'first', first_, 'right', right_, 'clue', clue);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_breed', 1, 'animals', (kn->'points'->>'breed')::integer + case when first_ then (kn->'points'->>'found')::integer else 0 end,
      jsonb_build_object('a', an->>'breed', 'b', bn->>'breed', 'offering', offering, 'dawn', dawn, 'child', child, 'hit', hit, 'twin', twin, 'fee', fee), -fee));

  elsif act = 'care' then
    if coalesce(p_input->>'care', '') not in ('none', 'named', 'anybody') then return town.answer(me, town.no('none')); end if;
    select coalesce(jsonb_agg(distinct x), '[]'::jsonb) into spots from (
      select x from jsonb_array_elements_text(case when jsonb_typeof(p_input->'carers') = 'array' then p_input->'carers' else '[]'::jsonb end) x
       where x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and x <> me::text limit 20) y;
    herd := herd || jsonb_build_object('care', p_input->>'care', 'carers', spots);

  elsif act = 'door' then
    -- my barn's door: open, my animals are out on the meadow (and eat half as fast)
    if herd->>'barn' is null then return town.answer(me, town.no('barn')); end if;
    door_ := coalesce(herd->'door', '[]'::jsonb);
    last_ := door_->(jsonb_array_length(door_) - 1);
    open_ := last_ is not null and last_->1 = 'null'::jsonb;
    if open_ is distinct from coalesce((p_input->>'open')::boolean, false) then
      -- (my animals settled to this moment first: the door changes how fast their troughs go)
      with s as (update public.town_animals x set a = town.animal_settle(x.a, now_, door_, town.animal_bottle(me), k), changed = now_::bigint where x.owner = me returning x.a)
      select touched || coalesce(jsonb_agg(s.a), '[]'::jsonb) into touched from s;
      door_ := case when (p_input->>'open')::boolean
        then (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from (select e, o from jsonb_array_elements(door_ || jsonb_build_array(jsonb_build_array(now_, null))) with ordinality g(e, o)) z
               where o > jsonb_array_length(door_) + 1 - 64)
        else jsonb_set(door_, array[(jsonb_array_length(door_) - 1)::text, '1'], to_jsonb(now_)) end;
      herd := herd || jsonb_build_object('door', door_, 'lastCare', now_);
      notes := notes || jsonb_build_array(jsonb_build_array('animal_door', case when (p_input->>'open')::boolean then 1 else 0 end, null, 0, '{}'::jsonb, 0));
    end if;

  elsif act = 'enter' then
    -- the barn cat's pets (rank 2), and spring wind's gifts while one blows (rank 9's, anybody's); not in the pen
    used_ := case when town.gift_works(purse, k->'gifts'->>'cat') then town.gift_use(purse, k->'gifts'->>'cat', now_::bigint) end;
    if coalesce((used_->>'ok')::boolean, false) then purse := used_->'purse'; end if;
    select s into spell from jsonb_array_elements(pas.spells) s where s->>'kind' = 'wind' and (s->>'from')::double precision <= now_ and now_ < (s->>'until')::double precision limit 1;
    for row_ in select x.id, x.a from public.town_animals x where x.owner = me and coalesce(x.a->>'home', 'barn') <> 'pen' order by x.id for update loop
      an := town.animal_settle(row_.a, now_, herd->'door', town.animal_bottle(me), k);
      stage_ := town.animal_stage(an, now_, k);
      continue when stage_ = 'coming';
      bn := an;
      if coalesce((used_->>'ok')::boolean, false) and not coalesce((an->'today'->>'pet')::boolean, false) then
        an := an || jsonb_build_object('hearts', town.animal_hearts_plus(an, (kn->'heart'->>'pet')::double precision, k), 'today', (an->'today') || '{"pet": true}'::jsonb);
      end if;
      if spell is not null and not coalesce((an->'today'->>'wind')::boolean, false) then
        an := an || jsonb_build_object('today', (an->'today') || '{"wind": true}'::jsonb);
        if stage_ = 'adult' then
          if town.animal_gives(an) and (an->>'made')::double precision > 0 and (an->>'banked')::integer < (k->'species'->(an->>'species')->>'bank')::integer then
            an := an || jsonb_build_object('made', 0, 'banked', (an->>'banked')::integer + 1);
          end if;
        else an := an || jsonb_build_object('windUntil', (spell->>'until')::double precision);
        end if;
      end if;
      if an is distinct from bn then
        update public.town_animals x set a = an, changed = now_::bigint where x.id = row_.id;
        touched := touched || jsonb_build_array(an);
      end if;
    end loop;

  elsif act in ('wind', 'harp') then
    used_ := town.gift_use(purse, k->'gifts'->>act, now_::bigint);
    if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
    purse := used_->'purse';
    mins := (kn->act->>'mins')::integer;
    spell := jsonb_build_object('kind', act, 'by', me::text, 'from', now_, 'until', now_ + mins * 60000)
      || case when act = 'harp' then jsonb_build_object('who', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from (
           select x from jsonb_array_elements_text(jsonb_build_array(me::text) || case when jsonb_typeof(p_input->'near') = 'array' then p_input->'near' else '[]'::jsonb end) x
            where x ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' limit 30) y)) else '{}'::jsonb end;
    update public.town_pasture p set spells = (select coalesce(jsonb_agg(s), '[]'::jsonb) from jsonb_array_elements(p.spells) s where (s->>'until')::double precision > now_ - 6 * 3600000)
      || jsonb_build_array(spell), changed = now_::bigint where p.one;
    notes := notes || jsonb_build_array(jsonb_build_array('animal_' || act, 1, null, 0, '{}'::jsonb, 0));

  elsif act = 'wagon' then
    used_ := town.gift_use(purse, k->'gifts'->>'wagon', now_::bigint);
    if not coalesce((used_->>'ok')::boolean, false) then return town.answer(me, town.no(case when used_->>'why' = 'spent' then 'spent' else 'gift' end)); end if;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into stops from (select x from jsonb_array_elements_text(case when jsonb_typeof(p_input->'stops') = 'array' then p_input->'stops' else '[]'::jsonb end) x
      where k->'wagonStops' ? x limit 3) y;
    if not (stops ? 'farm') or jsonb_array_length(stops) < 2 then return town.answer(me, town.no('none')); end if;
    purse := used_->'purse';
    run := jsonb_build_object('id', gen_random_uuid()::text, 'by', me::text, 'from', now_, 'stops', stops, 'riders', '[]'::jsonb);
    update public.town_pasture p set wagons = (select coalesce(jsonb_agg(w), '[]'::jsonb) from jsonb_array_elements(p.wagons) w where (w->>'from')::double precision > now_ - 86400000)
      || jsonb_build_array(run), changed = now_::bigint where p.one;
    notes := notes || jsonb_build_array(jsonb_build_array('animal_wagon', 1, null, 0, jsonb_build_object('stops', stops), 0));

  elsif act in ('ride', 'rode') then
    select w into run from jsonb_array_elements(pas.wagons) w where w->>'id' = p_input->>'run' limit 1;
    if run is null then return town.answer(me, town.no('none')); end if;
    if act = 'ride' then
      if now_ > (run->>'from')::double precision + (kn->'wagon'->>'mins')::double precision * 60000 then return town.answer(me, town.no('none')); end if;
      if not exists (select 1 from jsonb_array_elements(run->'riders') x where x->>'who' = me::text) then
        update public.town_pasture p set wagons = (select jsonb_agg(case when w->>'id' = run->>'id'
            then w || jsonb_build_object('riders', (w->'riders') || jsonb_build_array(jsonb_build_object('who', me::text, 'on', now_, 'leg', greatest(0, floor(coalesce((p_input->>'leg')::double precision, 0))::integer))))
            else w end) from jsonb_array_elements(p.wagons) w), changed = now_::bigint where p.one;
      end if;
    else
      select x into rider from jsonb_array_elements(run->'riders') x where x->>'who' = me::text limit 1;
      if rider is null then return town.answer(me, town.no('none')); end if;
      if coalesce((rider->>'claimed')::boolean, false) then return town.answer(me, town.no('used')); end if;
      if now_ > (run->>'from')::double precision + (kn->'wagon'->>'mins')::double precision * 60000 + (kn->'wagon'->>'claimMins')::double precision * 60000 then
        return town.answer(me, town.no('none')); end if;
      leg_ms := ((kn->'wagon'->>'mins')::double precision * 60000) / greatest(1, jsonb_array_length(run->'stops'));
      if now_ < (rider->>'on')::double precision + (kn->'wagon'->>'legs')::double precision * leg_ms - 1000 then return town.answer(me, town.no('soon')); end if;
      if purse->>'animalRode' = 'wagon:' || town.day_of(now_::bigint) then return town.answer(me, town.no('used')); end if;
      for row_ in select x.id, x.a from public.town_animals x where x.owner = me and coalesce(x.a->>'home', 'barn') <> 'pen' order by x.id for update loop
        an := town.animal_settle(row_.a, now_, herd->'door', town.animal_bottle(me), k);
        continue when town.animal_stage(an, now_, k) = 'coming';
        an := an || jsonb_build_object('hearts', least((kn->>'hearts')::double precision * (kn->>'perHeart')::double precision, (an->>'hearts')::double precision + (kn->>'wagonHeart')::double precision));
        update public.town_animals x set a = an, changed = now_::bigint where x.id = row_.id;
        touched := touched || jsonb_build_array(an);
      end loop;
      update public.town_pasture p set wagons = (select jsonb_agg(case when w->>'id' = run->>'id'
          then w || jsonb_build_object('riders', (select jsonb_agg(case when x->>'who' = me::text then x || '{"claimed": true}'::jsonb else x end order by o) from jsonb_array_elements(w->'riders') with ordinality y(x, o)))
          else w end) from jsonb_array_elements(p.wagons) w), changed = now_::bigint where p.one;
      purse := purse || jsonb_build_object('animalRode', 'wagon:' || town.day_of(now_::bigint));
      notes := notes || jsonb_build_array(jsonb_build_array('animal_rode', 1, null, 0, jsonb_build_object('run', run->>'id'), 0));
    end if;

  elsif act = 'scroll' then
    -- whoever first bred a breed may write its recipe out, for a little ink and paper
    item := p_input->>'breed';
    breed := k->'breeds'->item;
    if breed is null or breed->>'letter' = 'A' then return town.answer(me, town.no('none')); end if;
    if pas.found->item->>'by' is distinct from me::text then return town.answer(me, town.no('theirs')); end if;
    price := (kn->>'scrollFee')::integer;
    if (purse->>'coins')::integer < price then return town.answer(me, town.no('coins')); end if;
    tool := 'scrollBreed' || initcap(breed->>'species') || (breed->>'letter');
    if town.room_g(purse->'bag', tool, 0) < 1 then return town.answer(me, town.no('room')); end if;
    purse := purse || jsonb_build_object('coins', (purse->>'coins')::integer - price, 'bag', town.put_g(purse->'bag', tool, 1, 0));
    got := jsonb_build_object('item', tool, 'n', 1);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_scroll', 1, null, 0, jsonb_build_object('breed', item), -price));

  elsif act = 'read' then
    -- a breed's scroll read: its step's offering known from now on
    item := p_input->>'item';
    if coalesce(item, '') not like 'scrollBreed%' or town.held(purse->'bag', item) < 1 then return town.answer(me, town.no('nothing')); end if;
    purse := purse || jsonb_build_object('bag', town.take(purse->'bag', item, 1),
      'recipes', case when coalesce(purse->'recipes', '[]'::jsonb) ? item then purse->'recipes' else coalesce(purse->'recipes', '[]'::jsonb) || to_jsonb(item) end);

  elsif act = 'forage' then
    spot_ := floor(coalesce((p_input->>'spot')::double precision, -1))::integer;
    if spot_ < 0 or spot_ >= (k->'meadow'->>'spots')::integer then return town.answer(me, town.no('none')); end if;
    day_ := town.day_of(now_::bigint); band_ := town.animal_band(now_); key_ := day_ * 8 + band_;
    spots := case when (purse->'meadow'->>'k')::integer = key_ then coalesce(purse->'meadow'->'spots', '[]'::jsonb) else '[]'::jsonb end;
    if spots @> to_jsonb(spot_) then return town.answer(me, town.no('used')); end if;
    item := town.animal_forage(day_, band_, spot_, k);
    if item is null then return town.answer(me, town.no('nothing')); end if;
    if town.room_g(purse->'bag', item, 0) < 1 then return town.answer(me, town.no('room')); end if;
    purse := town.spend(purse, (k->'meadow'->>'stamina')::double precision, now_::bigint);
    purse := purse || jsonb_build_object('bag', town.put_g(purse->'bag', item, 1, 0), 'meadow', jsonb_build_object('k', key_, 'spots', spots || to_jsonb(spot_)));
    got := jsonb_build_object('item', item, 'n', 1);
    notes := notes || jsonb_build_array(jsonb_build_array('animal_forage', 1, 'animals', (k->'meadow'->>'points')::integer, jsonb_build_object('item', item, 'spot', spot_, 'band', band_), 0));

  else
    return town.answer(me, town.no('none'));
  end if;

  -- what is kept: my purse, my herd (when it changed), the offers and asks, what was written down
  perform town.keep_purse(me, purse);
  if herd is distinct from herd0 then
    insert into public.town_herds (owner, h, changed) values (me, herd, now_::bigint) on conflict (owner) do update set h = excluded.h, changed = excluded.changed;
  end if;
  if offers_ is distinct from pas.offers or asks_ is distinct from pas.asks then
    update public.town_pasture p set offers = offers_, asks = asks_, changed = now_::bigint where p.one;
  end if;
  for r in select x from jsonb_array_elements(notes) x loop
    perform town.note(me, r->>0, null, (r->>1)::numeric, (r->>5)::numeric,
      coalesce(r->4, '{}'::jsonb) || case when r->>2 is not null and (r->>3)::integer > 0 then jsonb_build_object('line', r->>2, 'pts', (r->>3)::integer) else '{}'::jsonb end);
  end loop;
  select * into pas from public.town_pasture where one;
  ans := jsonb_build_object('ok', true, 'got', got,
    'world', jsonb_build_object('animals', touched, 'removed', removed, 'herds', jsonb_build_array(town.animal_herd_told(herd, me, me)) || others,
      'found', pas.found, 'spells', pas.spells, 'wagons', pas.wagons,
      'offers', town.animal_mine(pas.offers, me, now_, (kn->>'offerHours')::double precision), 'asks', town.animal_mine(pas.asks, me, now_, (kn->>'askHours')::double precision)));
  if p_request is not null then
    delete from public.town_animal_asks x where x.member = me and x.at < now_::bigint - 86400000;
    insert into public.town_animal_asks (member, request, answer, at) values (me, p_request, ans, now_::bigint) on conflict (member, request) do nothing;
  end if;
  return town.answer(me, ans);
end $$;
revoke all on function public.town_animals(jsonb, text) from public, anon;
grant execute on function public.town_animals(jsonb, text) to authenticated;
