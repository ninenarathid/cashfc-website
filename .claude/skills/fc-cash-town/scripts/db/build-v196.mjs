import {writeFileSync,existsSync} from 'node:fs';
import {join} from 'node:path';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {STREAM_ITEMS,STREAM_MAKES,STREAM_DISHES,STREAM_SCROLLS,STREAM_SCROLL_ITEMS,STREAM_CRAFTS}=await import('@/lib/town/stream-items');
const cat=catalogOf(),pick=(r,ids)=>Object.fromEntries(ids.map(id=>[id,r[id]])),json=v=>`$stream$${JSON.stringify(v)}$stream$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data || ${json(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','{}'::jsonb) || ${json(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,ids)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${path}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const made=[...Object.keys(STREAM_MAKES),...Object.keys(STREAM_DISHES)];
const patches=[root('items',pick(cat.items,[...Object.keys(STREAM_ITEMS),...Object.keys(STREAM_SCROLL_ITEMS)])),root('makes',pick(cat.makes,Object.keys(STREAM_MAKES))),root('dishes',pick(cat.dishes,Object.keys(STREAM_DISHES))),root('scrolls',STREAM_SCROLLS),merge('stamina','buffs',{waterProperty:cat.stamina.buffs.waterProperty}),merge('stamina','steps',{waterProperty:cat.stamina.steps.waterProperty}),append('cooking','recipes',made),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(STREAM_DISHES)),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys(STREAM_CRAFTS))),`insert into public.town_catalog(key,data) values('stream_work',${json(cat.stream_work)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
const sql=`-- v196: shared mountain channels, water samples, filtering and property mixtures.
-- Run after v188 and the matching site. v194/v195 are independent; this file does not replace their functions.
-- Safe to run twice. Existing water lots, carriers, inventories and coins are preserved.
begin;
do $guard$ begin if town.cat('forest_parts') is null then raise exception 'Run v188 first'; end if; end $guard$;
${patches.join('\n')}
${append('cooking','putIn,also',['mineralSand'])}
create table if not exists public.town_stream_gate (
 id smallint primary key default 1 check(id=1),route text not null check(route in ('pool','reed')),
 until_ms bigint not null,member_id uuid not null references public.profiles(id) on delete cascade
);
create table if not exists public.town_stream_receipts (
 member_id uuid not null references public.profiles(id) on delete cascade,request_id uuid not null,
 action text not null,choice text not null,primary key(member_id,request_id)
);
alter table public.town_stream_gate enable row level security;
alter table public.town_stream_receipts enable row level security;
revoke all on public.town_stream_gate,public.town_stream_receipts from public,anon,authenticated;

create or replace function town.stream_work(p_purse jsonb,p_action text,p_choice text,p_x integer,p_y integer,p_gate jsonb,p_me text,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 k jsonb:=town.cat('stream_work');site jsonb;route_ text:=case when (p_gate->>'until')::numeric>p_now then p_gate->>'route' else 'pool' end;
 turn_ bigint;key_ text;recipe jsonb;bag jsonb:=p_purse->'bag';need jsonb;got jsonb;out_ jsonb;book jsonb;
 nature_ text;times_ double precision;well_ jsonb:=town.cat('farming')->'wellAt';
begin
 select s.v into site from jsonb_array_elements(k->'sites') s(v) where p_x is not null and p_y is not null
   and greatest(abs((s.v->>'x')::numeric-p_x),abs((s.v->>'y')::numeric-p_y))<=(k->>'reach')::numeric limit 1;
 if p_action='pour' then
   if p_x is null or p_y is null or greatest(abs(p_x-(well_->>0)::integer),abs(p_y-(well_->>1)::integer))<>1 then return town.no('far');end if;
 elsif site is null then return town.no('far');end if;
 if p_action='gate' then
   if p_choice not in ('pool','reed') or p_choice is null then return town.no('none');end if;
   if town.held(bag,'sluiceKey')<1 then return town.no('tool');end if;
   if (p_gate->>'until')::numeric>p_now and (p_gate->>'route'=p_choice or (p_gate->>'until')::numeric-(k->>'gateMinutes')::numeric*60000+(k->>'gateCooldown')::numeric>p_now) then return town.no('spent');end if;
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,(k->>'cost')::double precision,p_now),'gate',jsonb_build_object('route',p_choice,'until',p_now+(k->>'gateMinutes')::bigint*60000,'by',p_me));
 elsif p_action='sample' then
   if p_choice is null or not (site->'items' ? p_choice) then return town.no('none');end if;
   if p_choice='springSample' and route_<>'pool' or p_choice='rushingSample' and route_<>'reed' then return town.no('none');end if;
   if p_choice in ('springSample','rushingSample') and town.held(bag,'waterSampler')<1
     and not exists(select 1 from jsonb_array_elements(bag) s where town.cat('farming')->'buckets' ? (s->>'item') and (s->>'n')::numeric>0) then return town.no('tool');end if;
   turn_:=floor(p_now::numeric/(k->>'every')::numeric)::bigint;key_:=site->>'id'||':'||p_choice;
   if p_purse->'streamTaken'->>key_=turn_::text then return town.no('spent');end if;
   if town.room(bag,p_choice)<1 then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,1));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,1),'streamTaken',coalesce(p_purse->'streamTaken','{}'::jsonb)||jsonb_build_object(key_,turn_));
 elsif p_action='prepare' then
   recipe:=k->'recipes'->p_choice;if recipe is null then return town.no('none');end if;
   if town.held(bag,case when p_choice like '%Blend' then 'mixingJug' else 'filterFrame' end)<1 then return town.no('tool');end if;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop
     if town.held(bag,need->>0)<(need->>1)::numeric then return town.no('none');end if;
   end loop;
   for need in select v from jsonb_array_elements(recipe->'needs') a(v) loop bag:=town.take(bag,need->>0,(need->>1)::integer);end loop;
   if town.room(bag,p_choice)<(recipe->>'gives')::numeric then return town.no('full');end if;
   got:=jsonb_build_array(jsonb_build_array(p_choice,(recipe->>'gives')::integer));
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,p_choice,(recipe->>'gives')::integer));
 elsif p_action='pour' then
   nature_:=k->'nature'->>p_choice;if nature_ is null or town.held(bag,p_choice)<1 then return town.no('none');end if;
   times_:=greatest(1::double precision,case when town.held(bag,'sealedFlask')>0 then 2::double precision else 1::double precision end,town.buff_by(p_purse,p_now,'waterProperty'));
   return jsonb_build_object('ok',true,'purse',town.spend(p_purse,1::double precision,p_now)||jsonb_build_object('bag',town.take(bag,p_choice,1)),'nature',nature_,'times',times_);
 else return town.no('none');end if;
 book:=coalesce(p_purse->'streamBook','[]'::jsonb);if not book ? p_choice then book:=book||jsonb_build_array(p_choice);end if;
 return jsonb_build_object('ok',true,'got',got,'purse',out_||jsonb_build_object('streamBook',book));
end $$;
revoke all on function town.stream_work(jsonb,text,text,integer,integer,jsonb,text,bigint) from public,anon,authenticated;

create or replace function public.town_stream(p_action text default 'look',p_choice text default null,p_x integer default null,p_y integer default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 me uuid:=town.member();purse jsonb;now_ bigint:=town.now_ms();gate_ jsonb;did jsonb;
 well_ integer;was jsonb;until_ numeric;times_ numeric;from_ numeric;cap_ numeric;kind_ text;
begin
 perform 1 from public.town_purses p where p.member_id=me for update;purse:=town.purse_of(me,true);
 perform pg_advisory_xact_lock(hashtext('town.stream'));
 select jsonb_build_object('route',s.route,'until',s.until_ms,'by',s.member_id) into gate_ from public.town_stream_gate s where s.id=1;
 if p_action='look' then return town.answer(me,jsonb_build_object('ok',true,'stream',gate_));end if;
 if p_request is null then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from public.town_stream_receipts r where r.member_id=me and r.request_id=p_request) then return town.answer(me,town.no('had'));end if;
 if p_action<>'pour' then perform town.far_member();end if;
 if p_action='pour' then
   well_:=(town.thing('well',true)#>>'{}')::integer;
   if well_>=(town.cat('farming')->>'well')::integer then return town.answer(me,town.no('full'));end if;
 end if;
 did:=town.stream_work(purse,p_action,p_choice,p_x,p_y,gate_,me::text,now_);
 if not coalesce((did->>'ok')::boolean,false) then return town.answer(me,did);end if;
 if did ? 'gate' then
   gate_:=did->'gate';insert into public.town_stream_gate(id,route,until_ms,member_id) values(1,gate_->>'route',(gate_->>'until')::bigint,me)
     on conflict(id) do update set route=excluded.route,until_ms=excluded.until_ms,member_id=excluded.member_id;
 end if;
 if did ? 'nature' then
   perform town.keep_thing('well',to_jsonb(well_+1));
   -- The ordinary pour deed appends a water lot and credits the carrier. It pays no coins.
   perform town.note(me,'pour',null,1,0,jsonb_build_object('prepared',p_choice));
   was:=town.thing('well_water',true);kind_:=did->>'nature';times_:=(did->>'times')::numeric;
   from_:=case when was->>'kind'=kind_ and (was->>'until')::numeric>now_ then (was->>'until')::numeric else now_ end;
   cap_:=now_+(town.cat('waters')->>'most')::numeric*60000*times_;
   until_:=greatest(from_,least(cap_,from_+(town.cat('waters')->>'lasts')::numeric*60000*times_));
   perform town.keep_thing('well_water',jsonb_build_object('kind',kind_,'until',until_,'by',me));
 end if;
 insert into public.town_stream_receipts(member_id,request_id,action,choice) values(me,p_request,p_action,p_choice);
 perform town.keep_purse(me,did->'purse');
 return town.answer(me,(did-'purse'-'gate')||jsonb_build_object('stream',gate_,'wellWater',town.well_water_told(now_)));
end $$;
revoke all on function public.town_stream(text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.town_stream(text,text,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: private state tables and helper, member-only RPC, 25 mountain-water additions.
select relname,relrowsecurity from pg_class where oid in ('public.town_stream_gate'::regclass,'public.town_stream_receipts'::regclass);
select has_function_privilege('anon','public.town_stream(text,text,integer,integer,uuid)','EXECUTE') as anon_stream;
select data from public.town_catalog where key='stream_work';
`;
const file=join(process.env.FC_REPO,'supabase/v196_the_channels_and_properties_of_water.sql');
writeFileSync(file,sql);console.log('Wrote v196 mountain stream work.');
