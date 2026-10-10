import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {standIn} from './stand-in.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {PREP_ITEMS,PREP_MAKES,PREP_DISHES,PREP_CRAFTS,PREP_SCROLLS,PREP_SCROLL_ITEMS}=await import('@/lib/town/preparation-items');
const {CAMP_ITEMS,CAMP_DISHES,CAMP_CRAFTS,CAMP_SCROLLS,CAMP_SCROLL_ITEMS}=await import('@/lib/town/camp-items');
const rootDir=process.env.FC_REPO,cat=catalogOf(),pick=(r,ids)=>Object.fromEntries(ids.map(id=>[id,r[id]])),j=v=>`$field$${JSON.stringify(v)}$field$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data||${j(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data#>'{${path}}','{}'::jsonb)||${j(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data#>'{${path}}','[]'::jsonb)||coalesce((select jsonb_agg(x.v order by x.ord) from jsonb_array_elements(${j(v)}) with ordinality x(v,ord) where not coalesce(data#>'{${path}}','[]'::jsonb)@>jsonb_build_array(x.v)),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const ids=Object.keys({...PREP_ITEMS,...CAMP_ITEMS,...PREP_SCROLL_ITEMS,...CAMP_SCROLL_ITEMS}),made=Object.keys({...PREP_MAKES,...PREP_DISHES,...CAMP_DISHES});
const patches=[root('items',pick(cat.items,ids)),root('makes',pick(cat.makes,Object.keys(PREP_MAKES))),root('dishes',pick(cat.dishes,Object.keys({...PREP_DISHES,...CAMP_DISHES}))),root('scrolls',{...PREP_SCROLLS,...CAMP_SCROLLS}),merge('stamina','buffs',pick(cat.stamina.buffs,['seasoning','campPreparation'])),merge('stamina','steps',pick(cat.stamina.steps,['seasoning','campPreparation'])),append('cooking','recipes',made),append('cooking','cookware',['fermentCrock','fieldKettle']),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys({...PREP_DISHES,...CAMP_DISHES})),append('cooking','putIn,also',['charcoal']),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys({...PREP_CRAFTS,...CAMP_CRAFTS}))),...['preparation','camps'].map(key=>`insert into public.town_catalog(key,data) values('${key}',${j(cat[key])}) on conflict(key) do update set data=excluded.data,updated_at=now();`)];
const t=await standIn({upTo:179});
for(const file of ['v180_a_workshop_for_the_tools.sql','v181_more_lines_on_the_water.sql','v182_fishing_the_streams_and_pools.sql','v184_reading_the_grain_before_the_axe.sql','v185_listening_to_the_layers_of_rock.sql','v186_a_garden_that_spreads_and_crosses.sql','v187_visitors_that_tend_the_garden.sql','v188_the_parts_a_forest_can_spare.sql','v196_the_channels_and_properties_of_water.sql'])await t.run(readFileSync(join(rootDir,'supabase',file),'utf8'),file);
const signature='town.work_counts_of(jsonb,text)',old=(await t.sql('select pg_get_functiondef($1::regprocedure) def',[signature])).rows[0].def.replace(/\r/g,'');
const needle="  if what = 'ladle' then";
if(!old.includes(needle))throw new Error('Work counter definition must be rebuilt on current text');
const added=`  -- v197: an experiment counts like a cooked preparation; a camp only credits help to another member.
  if what = 'prepare' and l->'kitchen'->'pot' ? thing then
    return jsonb_build_array(jsonb_build_object('to',null,'line','kitchen','raw',l->'kitchen'->'pot'->thing,'first','kitchen:'||thing,'held',jsonb_build_object('key','pot:'||thing,'most',l->'kitchen'->'pots')));
  end if;
  if what = 'camp_prepare' then
    if jsonb_typeof(doc->'owner')='string' and doc->>'owner'<>p_doer then
      return jsonb_build_array(jsonb_build_object('to',doc->>'owner','line','helpers','raw',l->'helpers'->'water','held',jsonb_build_object('key','camp:'||p_doer,'most',3)));
    end if;
    return '[]'::jsonb;
  end if;
`;
const changed=old.replace(needle,added+needle);
await t.run(changed);
const after=(await t.sql('select pg_get_functiondef($1::regprocedure) def',[signature])).rows[0].def.replace(/\r/g,''),hash=s=>createHash('md5').update(s).digest('hex');
const sql=`-- v197: preparation decisions, 25 kitchen items, 25 helper items and finite shared camps.
-- Run after v196 and the matching site. v194/v195 are independent.
-- Safe to run twice. Existing inventories, coins, meals, gifts and camp scenery are preserved.
begin;
do $guard$ begin
 if town.cat('stream_work') is null then raise exception 'Run v196 first';end if;
 if md5(replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'')) not in ('${hash(old)}','${hash(after)}') then raise exception 'Definition changed: ${signature}; rebuild v197 on current text';end if;
end $guard$;
${patches.join('\n')}
create table if not exists public.town_preparation_run(member_id uuid primary key references public.profiles(id) on delete cascade,run jsonb not null);
create table if not exists public.town_field_camps(site integer primary key,camp jsonb not null);
create table if not exists public.town_field_receipts(member_id uuid not null references public.profiles(id) on delete cascade,request_id uuid not null,kind text not null,at_ms bigint not null,primary key(member_id,request_id));
create index if not exists town_field_receipts_member_time on public.town_field_receipts(member_id,at_ms);
alter table public.town_preparation_run enable row level security;
alter table public.town_field_camps enable row level security;
alter table public.town_field_receipts enable row level security;
revoke all on public.town_preparation_run,public.town_field_camps,public.town_field_receipts from public,anon,authenticated;

create or replace function town.preparation_ready(p_purse jsonb,p_recipe text,p_x integer,p_y integer)
returns text language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('preparation');r jsonb:=k->'recipes'->p_recipe;n jsonb;
begin
 if p_x is null or p_y is null or not exists(select 1 from jsonb_array_elements(k->'stations') s(v) where greatest(abs((s.v->>0)::numeric-p_x),abs((s.v->>1)::numeric-p_y))<=(k->>'reach')::numeric) then return 'far';end if;
 if r is null then return 'none';end if;
 if town.held(p_purse->'bag','prepBoard')<1 then return 'tool';end if;
 for n in select v from jsonb_array_elements(r->'in') a(v) loop if town.held(p_purse->'bag',n#>>'{}')<1 then return 'tool';end if;end loop;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop if town.held(p_purse->'bag',n->>0)<(n->>1)::numeric then return 'none';end if;end loop;
 return null;
end $$;
create or replace function town.prepare(p_purse jsonb,p_run jsonb,p_id uuid,p_answers jsonb,p_x integer,p_y integer,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('preparation');id_ text:=p_run->>'recipe';r jsonb:=k->'recipes'->id_;refused text;mistakes integer:=0;key_ text;n jsonb;bag jsonb:=p_purse->'bag';item_ text;count_ integer;out_ jsonb;can_adjust boolean;book jsonb;made_ jsonb;
begin
 if p_run is null or p_run->>'id' is distinct from p_id::text or p_now<(p_run->>'at')::bigint+(k->>'minMs')::bigint or p_now>(p_run->>'until')::bigint then return town.no('none');end if;
 if p_x is null or p_y is null or (p_run->'tile'->>0)::integer<>p_x or (p_run->'tile'->>1)::integer<>p_y then return town.no('far');end if;
 refused:=town.preparation_ready(p_purse,id_,p_x,p_y);if refused is not null then return town.no(refused);end if;
 if jsonb_typeof(p_answers) is distinct from 'object' then return town.no('none');end if;
 if p_answers ? 'correction' and jsonb_typeof(p_answers->'correction')<>'boolean' then return town.no('none');end if;
 foreach key_ in array array['method','heat','finish'] loop
   if jsonb_typeof(p_answers->key_) is distinct from 'number' then return town.no('none');end if;
   if (p_answers->>key_)::numeric<>floor((p_answers->>key_)::numeric) or (p_answers->>key_)::numeric not between 0 and 2 then return town.no('none');end if;
   if (p_answers->>key_)::integer<>(k->case when key_='method' then 'methods' else key_ end->>id_)::integer then mistakes:=mistakes+1;end if;
 end loop;
 can_adjust:=greatest(case when town.held(bag,'tastingSpoon')>0 then 1 else 0 end,town.buff_by(p_purse,p_now,'seasoning'))>0;
 if p_answers->'correction'='true'::jsonb then if not can_adjust then return town.no('tool');end if;mistakes:=greatest(0,mistakes-1);end if;
 for n in select v from jsonb_array_elements(r->'needs') a(v) loop bag:=town.take(bag,n->>0,(n->>1)::integer);end loop;
 item_:=case when mistakes=0 then id_ else 'compost' end;count_:=case when mistakes=0 then (r->>'gives')::integer else 1 end;
 if town.room(bag,item_)<count_ then return town.no('full');end if;
 book:=coalesce(p_purse->'prepBook','[]'::jsonb);made_:=coalesce(p_purse->'made','[]'::jsonb);
 if mistakes=0 then if not book ? id_ then book:=book||jsonb_build_array(id_);end if;if not made_ ? id_ then made_:=made_||jsonb_build_array(id_);end if;end if;
 out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(bag,item_,count_),'prepBook',book,'made',made_);
 return jsonb_build_object('ok',true,'made',item_,'n',count_,'mistakes',mistakes,'purse',out_);
end $$;

create or replace function town.camp_work(p_purse jsonb,p_action text,p_site integer,p_supply text,p_x integer,p_y integer,p_old jsonb,p_me text,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('camps');spot jsonb:=k->'sites'->p_site;bag jsonb:=p_purse->'bag';n integer;day_ integer:=town.day_of(p_now);used_ integer;effect text;out_ jsonb;camp_ jsonb;buffs jsonb;had jsonb;until_ numeric;book jsonb;
begin
 if p_site is null or p_site<0 or spot is null or p_x is null or p_y is null or greatest(abs((spot->>0)::numeric-p_x),abs((spot->>1)::numeric-p_y))>(k->>'reach')::numeric then return town.no('far');end if;
 if p_action='place' then
   if town.held(bag,'campKit')<1 then return town.no('tool');end if;
   if (p_old->>'until')::numeric>p_now then return town.no('spent');end if;
   n:=case when town.held(bag,'provisionChest')>0 then (k->>'chestCharges')::integer else (k->>'charges')::integer end;
   if town.held(bag,'campCanvas')<1 or town.held(bag,'dryTinder')<1 or town.held(bag,'trailRation')<n then return town.no('none');end if;
   bag:=town.take(town.take(town.take(bag,'campCanvas',1),'dryTinder',1),'trailRation',n);
   camp_:=jsonb_build_object('site',p_site,'x',spot->0,'y',spot->1,'by',p_me,'until',p_now+case when town.held(p_purse->'bag','weatherAwning')>0 then (k->>'awningMinutes')::bigint else (k->>'minutes')::bigint end*60000,'left',n,'wide',town.held(p_purse->'bag','signalPennant')>0,'lit',town.held(p_purse->'bag','campLantern')>0);
   out_:=town.spend(p_purse,(k->>'cost')::double precision,p_now)||jsonb_build_object('bag',bag);
   return jsonb_build_object('ok',true,'camp',camp_,'purse',out_);
 end if;
 if p_action<>'benefit' or p_action is null then return town.no('none');end if;
 if p_old is null or (p_old->>'until')::numeric<=p_now or (p_old->>'left')::numeric<=0 then return town.no('none');end if;
 effect:=k->'supplies'->>p_supply;if effect is null then return town.no('none');end if;
 used_:=case when (p_purse->'campUses'->>'day')::integer=day_ then (p_purse->'campUses'->>'n')::integer else 0 end;
 if used_>=(k->>'daily')::integer then return town.no('spent');end if;
 if town.held(bag,p_supply)<1 then return town.no('none');end if;
 if p_supply='sharedTea' and town.held(bag,'fieldKettle')<1 then return town.no('tool');end if;
 until_:=p_now+(k->>'benefitMinutes')::numeric*60000*greatest(1,town.buff_by(p_purse,p_now,'campPreparation'));
 buffs:=coalesce((select jsonb_agg(b.v order by b.ord) from jsonb_array_elements(coalesce(p_purse->'buffs',case when p_purse->'buff' is not null and p_purse->'buff'<>'null'::jsonb then jsonb_build_array(p_purse->'buff'||jsonb_build_object('level',1)) else '[]'::jsonb end)) with ordinality b(v,ord) where (b.v->>'until')::numeric>p_now),'[]'::jsonb);
 select b.v into had from jsonb_array_elements(buffs) b(v) where b.v->>'id'=effect limit 1;
 if had is null then buffs:=buffs||jsonb_build_array(jsonb_build_object('id',effect,'level',1,'until',until_));
 else select jsonb_agg(case when b.v->>'id'=effect then b.v||jsonb_build_object('until',greatest((b.v->>'until')::numeric,until_)) else b.v end order by b.ord) into buffs from jsonb_array_elements(buffs) with ordinality b(v,ord);end if;
 book:=coalesce(p_purse->'campBook','[]'::jsonb);if not book ? p_supply then book:=book||jsonb_build_array(p_supply);end if;
 out_:=town.spend(p_purse,1,p_now)||jsonb_build_object('bag',town.take(bag,p_supply,1),'buffs',buffs,'campUses',jsonb_build_object('day',day_,'n',coalesce(used_,0)+1),'campBook',book);
 return jsonb_build_object('ok',true,'effect',effect,'camp',p_old||jsonb_build_object('left',(p_old->>'left')::integer-1),'purse',out_);
end $$;

create or replace function public.town_preparation(p_action text,p_recipe text default null,p_x integer default null,p_y integer default null,p_request uuid default null,p_answers jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.member();now_ bigint:=town.now_ms();purse jsonb;run_ jsonb;did jsonb;why_ text;
begin
 perform 1 from public.town_purses p where p.member_id=me for update;purse:=town.purse_of(me,true);
 if p_request is null then return town.answer(me,town.no('none'));end if;
 if p_x is not null and p_y is not null and exists(select 1 from jsonb_array_elements(town.cat('preparation')->'farStations') s(v) where greatest(abs((s.v->>0)::numeric-p_x),abs((s.v->>1)::numeric-p_y))<=(town.cat('preparation')->>'reach')::numeric) then perform town.far_member();end if;
 if p_action='begin' then
   delete from public.town_field_receipts r where r.member_id=me and r.at_ms<now_-604800000;
   if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request) then return town.answer(me,town.no('had'));end if;
   if (select count(*) from public.town_field_receipts r where r.member_id=me)>=1000 then return town.answer(me,town.no('spent'));end if;
   why_:=town.preparation_ready(purse,p_recipe,p_x,p_y);if why_ is not null then return town.answer(me,town.no(why_));end if;
   run_:=jsonb_build_object('id',p_request,'recipe',p_recipe,'seed',mod(now_,2147483647),'at',now_,'until',now_+(town.cat('preparation')->>'minutes')::bigint*60000,'tile',jsonb_build_array(p_x,p_y));
   insert into public.town_preparation_run(member_id,run) values(me,run_) on conflict(member_id) do update set run=excluded.run;
   insert into public.town_field_receipts(member_id,request_id,kind,at_ms) values(me,p_request,'prep-begin',now_);
   return town.answer(me,jsonb_build_object('ok',true,'run',run_));
 end if;
 if p_action<>'end' or p_action is null then return town.answer(me,town.no('none'));end if;
 if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request and r.kind='prep-end') then return town.answer(me,town.no('had'));end if;
 select r.run into run_ from public.town_preparation_run r where r.member_id=me;
 did:=town.prepare(purse,run_,p_request,p_answers,p_x,p_y,now_);if not coalesce((did->>'ok')::boolean,false) then return town.answer(me,did);end if;
 perform town.keep_purse(me,did->'purse');delete from public.town_preparation_run r where r.member_id=me;
 update public.town_field_receipts r set kind='prep-end' where r.member_id=me and r.request_id=p_request;
 if (did->>'mistakes')::integer=0 then perform town.note(me,'prepare',did->>'made',(did->>'n')::integer);end if;
 return town.answer(me,did-'purse');
end $$;
create or replace function public.town_camp(p_action text default 'look',p_site integer default null,p_supply text default null,p_x integer default null,p_y integer default null,p_request uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.far_member();now_ bigint:=town.now_ms();purse jsonb;old_ jsonb;did jsonb;camps_ jsonb;
begin
 if p_action='look' then
   select coalesce(jsonb_agg(c.camp order by c.site),'[]'::jsonb) into camps_ from public.town_field_camps c where (c.camp->>'until')::numeric>now_;
   return town.answer(me,jsonb_build_object('ok',true,'camps',camps_));
 end if;
 perform 1 from public.town_purses p where p.member_id=me for update;purse:=town.purse_of(me,true);
 if p_request is null then return town.answer(me,town.no('none'));end if;
 delete from public.town_field_receipts r where r.member_id=me and r.at_ms<now_-604800000;
 if exists(select 1 from public.town_field_receipts r where r.member_id=me and r.request_id=p_request) then return town.answer(me,town.no('had'));end if;
 if (select count(*) from public.town_field_receipts r where r.member_id=me)>=1000 then return town.answer(me,town.no('spent'));end if;
 if p_site is null or p_site<0 or p_site>=jsonb_array_length(town.cat('camps')->'sites') then return town.answer(me,town.no('far'));end if;
 perform pg_advisory_xact_lock(hashtext('town.camp'),p_site);
 select c.camp into old_ from public.town_field_camps c where c.site=p_site;
 did:=town.camp_work(purse,p_action,p_site,p_supply,p_x,p_y,old_,me::text,now_);if not coalesce((did->>'ok')::boolean,false) then return town.answer(me,did);end if;
 insert into public.town_field_camps(site,camp) values(p_site,did->'camp') on conflict(site) do update set camp=excluded.camp;
 perform town.keep_purse(me,did->'purse');
 insert into public.town_field_receipts(member_id,request_id,kind,at_ms) values(me,p_request,p_action,now_);
 if p_action='benefit' then perform town.note(me,'camp_prepare',p_supply,1,0,jsonb_build_object('owner',old_->>'by'));end if;
 select coalesce(jsonb_agg(c.camp order by c.site),'[]'::jsonb) into camps_ from public.town_field_camps c where (c.camp->>'until')::numeric>now_;
 return town.answer(me,(did-'purse'-'camp')||jsonb_build_object('camps',camps_));
end $$;
${after};
revoke all on function town.preparation_ready(jsonb,text,integer,integer),town.prepare(jsonb,jsonb,uuid,jsonb,integer,integer,bigint),town.camp_work(jsonb,text,integer,text,integer,integer,jsonb,text,bigint) from public,anon,authenticated;
revoke all on function public.town_preparation(text,text,integer,integer,uuid,jsonb),public.town_camp(text,integer,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.town_preparation(text,text,integer,integer,uuid,jsonb),public.town_camp(text,integer,text,integer,integer,uuid) to authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: private state, member-only actions, 50 new usable items; counters only credit real successful work.
select relname,relrowsecurity from pg_class where oid in ('public.town_preparation_run'::regclass,'public.town_field_camps'::regclass,'public.town_field_receipts'::regclass);
select has_function_privilege('anon','public.town_camp(text,integer,text,integer,integer,uuid)','EXECUTE') as anon_camp;
`;
writeFileSync(join(rootDir,'supabase/v197_preparing_food_and_a_camp_for_friends.sql'),sql);await t.db.close();console.log('Wrote v197 with guarded work counters.');
