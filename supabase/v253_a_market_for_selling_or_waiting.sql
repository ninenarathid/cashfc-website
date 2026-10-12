-- v253: stronger market swings, buyer-interest cycles and truthful price history.
-- Run after v252 and the matching site deploy. Safe to run twice.
-- Keeps crop cash-cost/base floors and the 100% floor for made products.
-- Does not reprice existing consignment lots, alter purses, or reset market history.
-- Finish old overdue rounds before installing the new rules; the first new price
-- is posted on the next 07:00/19:00 Bangkok round. No exact future-price forecast.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.market_knobs()'::regprocedure),chr(13),'')) not in ('303087018726a8b09133716fcae630e2','99b0827c30221c5ec4659cbd02932bfc') then raise exception 'Definition changed: town.market_knobs(); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.market_next(jsonb,double precision,double precision,double precision,double precision,jsonb)'::regprocedure),chr(13),'')) not in ('2edb17b016de67e65ab976254a1f8f37','375af6ad7f6d7d118d222d7732183f82') then raise exception 'Definition changed: town.market_next(jsonb,double precision,double precision,double precision,double precision,jsonb); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.market_rolled(jsonb,integer,integer,jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('547f00bf8b57668a8187c7707363c1e0','8ace1bec550e42c90f36f4ca4eb40b42') then raise exception 'Definition changed: town.market_rolled(jsonb,integer,integer,jsonb,jsonb); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.market_things(jsonb)'::regprocedure),chr(13),'')) not in ('1a380929e2dfa78441ca9fc5a490b687','f9dd3249571fa90388d274e4d1e9dc22') then raise exception 'Definition changed: town.market_things(jsonb); rebuild v253 on current text';end if;
 if md5(replace(pg_get_functiondef('town.prices_told(uuid)'::regprocedure),chr(13),'')) not in ('a9b5a64a4b6033df7fce14835ee968c9','98b9655f53c6bb59f44a336e68f417c7') then raise exception 'Definition changed: town.prices_told(uuid); rebuild v253 on current text';end if;
 if to_regprocedure('town.market_demand(text,integer)') is not null and md5(replace(pg_get_functiondef(to_regprocedure('town.market_demand(text,integer)')),chr(13),''))<>'d29f80d2bd7e693d81fb3de4530fb12f' then raise exception 'Definition changed: town.market_demand; rebuild v253';end if;
 if to_regprocedure('public.town_leave_quote(integer,integer,text,integer,integer,numeric)') is not null and md5(replace(pg_get_functiondef(to_regprocedure('public.town_leave_quote(integer,integer,text,integer,integer,numeric)')),chr(13),''))<>'d49fbd9ec89d95393c2f18670c6b2d73' then raise exception 'Definition changed: town_leave_quote; rebuild v253';end if;
end $guard$;
do $knobs$ declare e record; actual_ integer; changes_ constant jsonb := '{"market_ceil_a":[150,220],"market_ceil_b":[130,200],"market_ceil_c":[115,180],"market_fall":[25,40],"market_rise":[10,35],"market_memory":[50,65],"market_bend":[70,100],"market_min_volume":[null,5],"market_staple":[null,8]}'::jsonb;begin
 for e in select key,value from jsonb_each(changes_) loop
 select value into actual_ from public.town_knobs where key=e.key for update;
 if found and actual_ is distinct from (e.value->>0)::int and actual_ is distinct from (e.value->>1)::int then raise exception 'Market knob changed: % (%); review v253',e.key,actual_;end if;
 end loop;
end $knobs$;

-- Serialize with ordinary market writers, and advance any old overdue round under old rules.
select town.market_now();
insert into public.town_knobs(key,value) values
 ('market_ceil_a',220),
 ('market_ceil_b',200),
 ('market_ceil_c',180),
 ('market_fall',40),
 ('market_rise',35),
 ('market_memory',65),
 ('market_bend',100),
 ('market_min_volume',5),
 ('market_staple',8)
on conflict(key) do update set value=excluded.value where public.town_knobs.value is distinct from excluded.value;

create or replace function town.market_demand(p_item text,p_round integer)
returns integer language plpgsql immutable set search_path='' as $function$
-- v253: public buyer interest; all catalog item ids are ASCII.
declare
 hash_ bigint:=0;
 period_ integer;
 phase_ integer;
 turn_ integer;
 wave_ integer[]:=array[100,115,135,155,135,110,85,65,45,65,85,100];
begin
 for i in 1..length(p_item) loop hash_:=(hash_*33+ascii(substr(p_item,i,1)))%2147483647;end loop;
 period_:=10+(hash_%5)::integer;
 phase_:=(hash_/5%period_)::integer;
 turn_:=((p_round+phase_)%period_+period_)%period_;
 return wave_[floor(turn_::numeric*12/period_)::integer+1];
end;
$function$;

CREATE OR REPLACE FUNCTION town.market_knobs()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
  with k as (select coalesce(jsonb_object_agg(substr(n.key, 8), n.value), '{}'::jsonb) as v from public.town_knobs n where n.key like 'market\_%')
  select jsonb_build_object(
    'floor', coalesce((k.v->>'floor')::int, 40), 'made', coalesce((k.v->>'made')::int, 100), 'margin', coalesce((k.v->>'margin')::int, 150),
    'ceil', jsonb_build_array(coalesce((k.v->>'ceil_a')::int, 220), coalesce((k.v->>'ceil_b')::int, 200), coalesce((k.v->>'ceil_c')::int, 180)),
    'fall', coalesce((k.v->>'fall')::int, 40), 'rise', coalesce((k.v->>'rise')::int, 35), 'memory', coalesce((k.v->>'memory')::int, 65),
    'bend', coalesce((k.v->>'bend')::int, 100), 'heads', coalesce((k.v->>'heads')::int, 10), 'lately', coalesce((k.v->>'lately')::int, 14),
    'minVolume', coalesce((k.v->>'min_volume')::int, 5),
    'usual', jsonb_build_object('staple', coalesce((k.v->>'staple')::int, 8), 'crop', coalesce((k.v->>'crop')::int, 15), 'fish', coalesce((k.v->>'fish')::int, 8), 'catch', coalesce((k.v->>'catch')::int, 5),
      'dish', coalesce((k.v->>'dish')::int, 8), 'goods', coalesce((k.v->>'goods')::int, 8), 'wild', coalesce((k.v->>'wild')::int, 8), 'bug', coalesce((k.v->>'bug')::int, 4)))
    from k
$function$;
CREATE OR REPLACE FUNCTION town.market_next(p_st jsonb, p_sold double precision, p_usual double precision, p_floor double precision, p_ceil double precision, p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
  select jsonb_build_object(
      'f', floor(case when w.want < s.f then greatest(w.want, s.f * (1 - (p_k->>'fall')::double precision / 100))
                      else least(w.want, s.f * (1 + (p_k->>'rise')::double precision / 100)) end + 0.5::double precision)::int,
      'm', m.m)
    from (select (p_st->>'f')::double precision as f) s,
         (select (1 - (p_k->>'memory')::double precision / 100) * (p_st->>'m')::double precision + (p_k->>'memory')::double precision / 100 * p_sold as m) m,
         lateral (select least(p_ceil, greatest(p_floor,
           100 * power((2 * p_usual * coalesce((p_k->>'demand')::double precision, 100) / 100) / (m.m + p_usual), (p_k->>'bend')::double precision / 100))) as want) w
$function$;
create or replace function town.market_rolled(p_market jsonb,p_round integer,p_heads integer,p_things jsonb,p_k jsonb)
returns jsonb language plpgsql immutable as $function$
-- v253: buyer cycles, batch buffers and per-round base history.
declare
 was_round integer := (p_market->>'round')::integer;
 at_ jsonb := coalesce(p_market->'at','{}'::jsonb);
 log_ jsonb := '[]'::jsonb;
 steps_ integer;
 start_ integer;
 skipped_ integer;
 retention_ double precision := 1-(p_k->>'memory')::double precision/100;
 now_at_ jsonb;
 things_ jsonb;
begin
 if p_round<=was_round then return jsonb_build_object('market',p_market,'log',log_);end if;
 steps_:=least(p_round-was_round,2*(p_k->>'lately')::integer);
 start_:=p_round-steps_;
 skipped_:=start_-was_round;
 if skipped_>0 then
   select coalesce(jsonb_object_agg(e.key,jsonb_build_object('f',st.v->'f','m',
       case when skipped_>2*(p_k->>'lately')::integer then 0 else
         (retention_*(st.v->>'m')::double precision+(1-retention_)*coalesce((p_market->'sold'->>e.key)::double precision,0))*power(retention_,skipped_-1) end)),'{}'::jsonb)
     into now_at_
     from jsonb_each(p_things) e
     cross join lateral(select greatest((e.value->>0)::double precision*p_heads,coalesce((e.value->>3)::double precision,(p_k->>'minVolume')::double precision,5)) as usual) u
     cross join lateral(select coalesce(at_->e.key,jsonb_build_object('f',100,'m',u.usual)) as v) st;
   at_:=now_at_;
 end if;
 for i in 0..steps_-1 loop
   select coalesce(jsonb_object_agg(x.id,x.nx),'{}'::jsonb),
          coalesce(jsonb_object_agg(x.id,jsonb_build_array(x.f,x.sold,x.base)),'{}'::jsonb)
     into now_at_,things_
     from (select e.key as id,(st.v->>'f')::integer as f,s.sold,e.value->4 as base,
       town.market_next(st.v,s.sold,u.usual,(e.value->>1)::double precision,(e.value->>2)::double precision,
         p_k||jsonb_build_object('demand',town.market_demand(e.key,start_+i+1))) as nx
       from jsonb_each(p_things) e
       cross join lateral(select greatest((e.value->>0)::double precision*p_heads,coalesce((e.value->>3)::double precision,(p_k->>'minVolume')::double precision,5)) as usual) u
       cross join lateral(select coalesce(at_->e.key,jsonb_build_object('f',100,'m',u.usual)) as v) st
       cross join lateral(select case when i=0 and start_=was_round then coalesce((p_market->'sold'->>e.key)::double precision,0) else 0 end as sold) s) x;
   log_:=log_||jsonb_build_array(jsonb_build_array(start_+i,things_));
   at_:=now_at_;
 end loop;
 return jsonb_build_object('market',jsonb_build_object('round',p_round,'at',at_,'sold','{}'::jsonb),'log',log_);
end;
$function$;
CREATE OR REPLACE FUNCTION town.market_things(p_k jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
  with c as (select town.cat('items') as items, town.cat('goods') as goods, town.cat('fish') as fish, town.cat('flotsam') as flotsam,
                    town.cat('crops') as crops, town.cat('fishing') as fishing),
       bait as (
         select b.id, case when c.goods ? b.id then (c.goods->b.id->>'price')::double precision else coalesce((c.items->b.id->>'pays')::double precision, 0) end as cost
           from c, jsonb_array_elements_text(c.fishing->'baits') b(id)
          where not c.fishing->'kept' ? b.id),
       thing as (
         select i.key as id, i.value->>'kind' as kind, (i.value->>'tier')::int as tier, (i.value->>'pays')::double precision as pays,
                case i.value->>'kind'
                  when 'crop' then coalesce((c.goods->(c.crops->i.key->>'seed')->>'price')::double precision, 0)
                                   / (coalesce((c.crops->i.key->>'picks')::double precision, 1)
                                      * ((c.crops->i.key->'yield'->>0)::double precision + (c.crops->i.key->'yield'->>1)::double precision) / 2)
                  when 'fish' then (select min(bait.cost) from bait where c.fish->i.key->'baits' ? bait.id)
                  when 'catch' then (select min(bait.cost) from bait where coalesce(c.flotsam->i.key->'on', 'null'::jsonb) = 'null'::jsonb or c.flotsam->i.key->'on' ? bait.id)
                  else 0 end as cost
           from c, jsonb_each(c.items) i
          where (i.value->>'pays')::double precision > 0 and not c.goods ? i.key and p_k->'usual' ? (i.value->>'kind'))
  select coalesce(jsonb_object_agg(t.id, jsonb_build_array(
      (p_k->'usual'->>t.kind)::double precision / t.pays,
      case when t.kind in ('dish', 'goods', 'staple') then (p_k->>'made')::int
           else least(100, greatest((p_k->>'floor')::int, ceil(coalesce(t.cost, 0) * (p_k->>'margin')::double precision / t.pays)::int)) end,
      coalesce((p_k->'ceil'->>(t.tier - 1))::int, (p_k->'ceil'->>-1)::int),
      greatest(coalesce((p_k->>'minVolume')::double precision, 5), coalesce(((town.cat('crops')->t.id->'yield'->>0)::double precision + (town.cat('crops')->t.id->'yield'->>1)::double precision) / 2, 1)),
      t.pays)), '{}'::jsonb)
    from thing t
$function$;
CREATE OR REPLACE FUNCTION town.prices_told(p_me uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
-- v253: selling or holding with buyer interest and truthful history.
declare
  market jsonb := town.market_now();
  cur integer := (market->>'round')::int;
  k jsonb := town.market_knobs();
  things jsonb := town.market_things(k);
  purse jsonb := town.purse_kept(p_me, false);
  told jsonb;
begin
  select coalesce(jsonb_object_agg(h.id, jsonb_build_object(
      'f', town.factor_of(market, h.id), 'floor', (things->h.id->>1)::int, 'ceil', (things->h.id->>2)::int,
      'base', (things->h.id->>4)::numeric, 'demand', town.market_demand(h.id, cur),
      'demandTrend', sign(town.market_demand(h.id, cur)-town.market_demand(h.id, cur-1))::int,
      'was', coalesce((select jsonb_agg(jsonb_build_array(l.round, coalesce((l.doc->h.id->>0)::int, 100), coalesce((l.doc->h.id->>1)::numeric, 0), l.doc->h.id->2) order by l.round)
                         from public.town_market_log l where l.round >= cur - (k->>'lately')::int and l.round < cur), '[]'::jsonb))), '{}'::jsonb)
    into told
    from (select distinct x.id from (
            select s.v->>'item' as id from jsonb_array_elements(coalesce(purse->'bag', '[]'::jsonb)) s(v) where s.v <> 'null'::jsonb
            union all
            select l.v->>'item' from jsonb_array_elements(coalesce(purse->'left', '[]'::jsonb)) l(v)) x
           where things ? x.id) h;
  return jsonb_build_object('round', cur, 'things', told);
end;
$function$;
revoke all on function town.market_demand(text,integer) from public,anon,authenticated;
create or replace function public.town_leave_quote(p_slot integer,p_n integer,
 p_item text,p_round integer,p_f integer,p_base numeric)
returns jsonb language plpgsql security definer set search_path='' as $function$
-- v253: deposit only at the offer the player actually reviewed.
declare
 me uuid:=town.member();
 purse jsonb:=town.purse_of(me,true);
 market jsonb;
 now_ bigint;
 item_ text;
 f_ integer;
 base_ numeric;
 did jsonb;
 lot_ jsonb;
begin
 perform town.market_now();
 select t.doc into market from public.town_things t where t.key='market' for update;
 now_:=town.now_ms();
 item_:=case when p_slot is null or p_slot<0 then null else purse->'bag'->p_slot->>'item' end;
 f_:=town.factor_of(market,item_);
 base_:=(town.cat('items')->item_->>'pays')::numeric;
 if item_ is null or item_ is distinct from p_item
  or (market->>'round')::integer is distinct from p_round
  or town.round_of(now_) is distinct from p_round
  or f_ is distinct from p_f or base_ is distinct from p_base then
  return town.answer(me,town.no('quote'))||jsonb_build_object('prices',town.prices_told(me));
 end if;
 did:=town.leave(purse,p_slot,p_n,now_,f_);
 if did->'ok'='true'::jsonb then
  -- A catalog edit between statements must not change the accepted offer.
  select l.v into lot_ from jsonb_array_elements(did->'purse'->'left') with ordinality l(v,ord)
   where l.v is distinct from purse->'left'->(l.ord::integer-1) order by l.ord limit 1;
  if lot_ is null or lot_->>'item' is distinct from p_item
   or (lot_->>'round')::integer is distinct from p_round
   or (lot_->>'pays')::numeric is distinct from p_base
   or coalesce((lot_->>'f')::integer,100) is distinct from p_f then
   return town.answer(me,town.no('quote'))||jsonb_build_object('prices',town.prices_told(me));
  end if;
  perform town.keep_purse(me,did->'purse');
  perform town.note(me,'leave',item_,p_n,0,
   case when f_=100 then '{}'::jsonb else jsonb_build_object('f',f_) end);
  -- Count into the same locked round as the lot, even if the clock turns now.
  perform town.keep_thing('market',market||jsonb_build_object('sold',
   coalesce(market->'sold','{}'::jsonb)||jsonb_build_object(item_,
    greatest(0,coalesce((market->'sold'->>item_)::integer,0)+p_n))));
 end if;
 return town.answer(me,did)||jsonb_build_object('prices',town.prices_told(me));
end;
$function$;
revoke all on function public.town_leave_quote(integer,integer,text,integer,integer,numeric) from public,anon,authenticated;
grant execute on function public.town_leave_quote(integer,integer,text,integer,integer,numeric) to authenticated;

notify pgrst,'reload schema';
commit;
select jsonb_build_object('ceil',town.market_knobs()->'ceil','rise',town.market_knobs()->'rise','fall',town.market_knobs()->'fall','memory',town.market_knobs()->'memory','min_volume',town.market_knobs()->'minVolume','quote_member_only',has_function_privilege('authenticated','public.town_leave_quote(integer,integer,text,integer,integer,numeric)','EXECUTE') and not has_function_privilege('anon','public.town_leave_quote(integer,integer,text,integer,integer,numeric)','EXECUTE'),'crafted_staples',town.market_knobs()->'usual' ? 'staple','helper_private',not has_function_privilege('authenticated','town.market_demand(text,integer)','EXECUTE')) as v253_verified;
