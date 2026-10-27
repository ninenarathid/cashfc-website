-- v301 — a giant root is counted when it takes
-- Run this once in the Supabase SQL editor, after v238 (either side of v300). Running it again is safe.
--
-- Members told the owner (2026-10-27) that the farming line's rank-7 gift, the giant vegetable seeds, cost them the
-- day's one planting for a beat pressed a little off, or for a Cancel pressed to go and eat. v238 counted the day's
-- use the moment a crop was chosen (giantBegin), so a cancel, a run left to run out (two minutes) and a miss all
-- spent it. Now the day is counted only when the giant takes: giantBegin asks only that one is left, and a passed
-- giantEnd spends it. A miss still costs its 2 stamina and keeps the seeds, as before, so failing stays possible
-- (the owner's rule for gifts) and each try has a price; the day still holds one giant.
-- Only town.reward_garden changes, in those two places. Its inputs and replies keep their shape, so the page live
-- now works with it, and the page that says so works with or without it. lib/town/reward-garden.ts is its twin.
begin;
set local statement_timeout='30s';set local lock_timeout='5s';
do $guard$ begin
if md5(replace(pg_get_functiondef('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure),chr(13),'')) not in ('01c1bf52662177ff8f67e0cab5ec7410','90309bed4053e61db554d29c7abfeab1') then raise exception 'Definition moved: rebuild v301 (town.reward_garden)';end if;
end $guard$;
create or replace function town.reward_garden(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,me uuid)
returns jsonb language plpgsql volatile set search_path='' as $$
declare a text:=c->>'action';x_ integer:=(c->'at'->>0)::integer;y_ integer:=(c->'at'->>1)::integer;key_ text:=x_::text||','||y_::text;bed_ integer:=town.bed_of(x_,y_);plots_ jsonb;plot_ jsonb;root_ jsonb;state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'giant';samples_ jsonb;sample_ jsonb;cells_ jsonb;crop_ text:=c->>'crop';child_ text:=c->>'child';seed_item text;used_ jsonb;after_ jsonb;updated_ jsonb:='{}'::jsonb;cell_ text;plant_ jsonb;z bigint;mark_ numeric;pass_ boolean:=true;i integer;owner_ text;keeping_ jsonb;n_ integer;item_ text;identity_ text;pair_ jsonb;adjacent_ boolean;
begin
 if a='giantCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null)),'giant',null);end if;
 if bed_<0 then return town.no('far');end if;
 -- Match ordinary tend/row: purse first, then one bed. No second member's purse is touched.
 perform pg_advisory_xact_lock(hashtext('town.bed'),bed_);plots_:=town.garden_plots(key_);plot_:=plots_->key_;root_:=plot_->'plant';
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;
 owner_:=town.owner_of(keeping_,exists(select 1 from public.town_plots q where q.bed=bed_ and q.plant is not null),t);
 select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) into samples_ from jsonb_array_elements(coalesce(state_->'pollen','[]'::jsonb)) with ordinality q(s,ord) where (s->>'until')::bigint>t;
 if a in ('giantBegin','giantEnd') then
  cells_:=jsonb_build_array(key_,(x_+1)::text||','||y_::text,x_::text||','||(y_+1)::text,(x_+1)::text||','||(y_+1)::text);
  if a='giantEnd' then crop_:=r->>'crop';end if;seed_item:=town.cat('crops')->crop_->>'seed';
  if not town.gift_works(p,'thingGiantSeeds') or owner_ is distinct from me::text or crop_ is null or crop_ not in ('pumpkin','cabbage','carrot','daikon','taro') or town.held(p->'bag',seed_item)<4 or exists(select 1 from jsonb_array_elements_text(cells_) q(k) where town.bed_of(split_part(k,',',1)::integer,split_part(k,',',2)::integer)<>bed_ or plots_->k->>'soil' is distinct from 'tilled' or coalesce(plots_->k->'plant','null'::jsonb)<>'null'::jsonb) then return town.no('none');end if;
  if a='giantBegin' then
   if (r->>'until')::bigint>t or seed_ not between 0 and 4294967295 then return town.no('none');end if;if town.used_of(p,'thingGiantSeeds',t)>=coalesce((town.cat('gifts')->'uses'->'thingGiantSeeds'->>'n')::integer,0) then return town.no('spent');end if;
   r:=jsonb_build_object('id',request_,'key',key_,'crop',crop_,'seed',seed_,'began',t,'until',t+120000);return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',r)),'giant',r);
  end if;
  if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->>'key' is distinct from key_ or (r->>'until')::bigint<t or t<(r->>'began')::bigint+2400 then return town.no('far');end if;
  if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
  z:=(r->>'seed')::bigint;for i in 0..2 loop z:=(z*1664525+1013904223)%4294967296;mark_:=.2+(z%61)::numeric/100;if abs(mark_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
  after_:=town.spend(p,2::double precision,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('giant',null));if not pass_ then return jsonb_build_object('ok',true,'purse',after_,'giant',null,'gardenPassed',false);end if;
  used_:=town.gift_use(after_,'thingGiantSeeds',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=used_->'purse';
  plant_:=jsonb_build_object('by',me,'crop',crop_,'sown',t,'boost',0,'watered',case when plot_->'damp'='true'::jsonb then t else 0 end,'fed',0,'guard',0,'cured',0,'picked',0,'pickedAt',0,'root',key_,'footprint',cells_,'giant',true)||case when plot_->'damp'='true'::jsonb then '{"moist":true}'::jsonb else '{}'::jsonb end;
  for cell_ in select jsonb_array_elements_text(cells_) loop updated_:=updated_||jsonb_build_object(cell_,jsonb_build_object('soil','tilled','plant',plant_));end loop;
  after_:=after_||jsonb_build_object('bag',town.take(after_->'bag',seed_item,4));
 else
  if root_ is null or root_='null'::jsonb or root_->>'by' is distinct from me::text or (root_->>'root' is not null and root_->>'root'<>key_) or coalesce((root_->>'crossed')::boolean,false) or not (town.see(key_,plot_,t)->>'ripe')::boolean then return town.no('none');end if;
  if a='gardenBrush' then
   if not town.gift_works(p,'thingCrossBrush') or child_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or root_->>'crossChoice' is not null or town.garden_cross(key_,plots_||jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_))),me::text,t) is distinct from child_ then return town.no('none');end if;
   used_:=town.gift_use(p,'thingCrossBrush',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;after_:=used_->'purse';updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossChoice}',to_jsonb(child_)));
  elsif a='pollenCollect' then
   if not town.gift_works(p,'thingPollenSeal') or jsonb_array_length(samples_)>=3 then return town.no('none');end if;used_:=town.gift_use(p,'thingPollenSeal',t);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
   identity_:=key_||':'||(root_->>'by')||':'||(root_->>'crop')||':'||(root_->>'sown');sample_:=jsonb_build_object('id',request_,'key',key_,'crop',root_->'crop','cells',coalesce(root_->'footprint',jsonb_build_array(key_)),'bed',bed_,'identity',identity_,'until',t+86400000);
   after_:=used_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('pollen',samples_||jsonb_build_array(sample_)));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  elsif a='pollenApply' then
   select s into sample_ from jsonb_array_elements(samples_) q(s) where s->>'id'=c->>'sample';
   select v into pair_ from jsonb_array_elements(town.cat('gardening')->'crosses') q(v) where v->>2=child_ and (v->>0=root_->>'crop' and v->>1=sample_->>'crop' or v->>1=root_->>'crop' and v->>0=sample_->>'crop') limit 1;
   select exists(select 1 from jsonb_array_elements_text(sample_->'cells') a(k) cross join jsonb_array_elements_text(coalesce(root_->'footprint',jsonb_build_array(key_))) b(k) where greatest(abs(split_part(a.k,',',1)::integer-split_part(b.k,',',1)::integer),abs(split_part(a.k,',',2)::integer-split_part(b.k,',',2)::integer))=1) into adjacent_;
   if not town.gift_works(p,'thingPollenSeal') or sample_ is null or pair_ is null or not coalesce(p->'gardenBook','[]'::jsonb)?child_ or (sample_->>'bed')::integer<>bed_ or not adjacent_ or exists(select 1 from jsonb_array_elements_text(sample_->'cells') q(k) where coalesce(root_->'footprint',jsonb_build_array(key_))?k) then return town.no('none');end if;
   n_:=case when town.held(town.carried_bag(p),'graftKnife')>0 or root_->'insectCrossRound'=root_->'picked' then 2 else 1 end;item_:=town.cat('crops')->child_->>'seed';if town.room(p->'bag',item_)<n_ then return town.no('full');end if;
   after_:=p||jsonb_build_object('bag',town.put(p->'bag',item_,n_),'professionRewards',state_||jsonb_build_object('pollen',(select coalesce(jsonb_agg(s order by ord),'[]'::jsonb) from jsonb_array_elements(samples_) with ordinality q(s,ord) where s->>'id'<>sample_->>'id')));updated_:=jsonb_build_object(key_,jsonb_set(plot_,'{plant,crossed}','true'::jsonb));
  else return town.no('none');end if;
 end if;
 for cell_ in select jsonb_object_keys(updated_) loop insert into public.town_plots(x,y,bed,soil,plant,changed) values(split_part(cell_,',',1)::integer,split_part(cell_,',',2)::integer,bed_,updated_->cell_->>'soil',updated_->cell_->'plant',t) on conflict(x,y) do update set soil=excluded.soil,plant=excluded.plant,changed=excluded.changed;end loop;
 if a='giantEnd' then update public.town_beds b set tended=t,empty=0 where b.bed=bed_ and b.member_id=me;end if;
 return jsonb_build_object('ok',true,'purse',after_,'plots',updated_)||case when a='giantEnd' then jsonb_build_object('giant',null,'gardenPassed',true) when a='pollenApply' then jsonb_build_object('got',jsonb_build_array(jsonb_build_array(item_,n_))) else '{}'::jsonb end;
end $$;
revoke all on function town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid) from public,anon,authenticated;
notify pgrst,'reload schema';commit;

-- What it should say afterwards (read only):
-- select md5(replace(pg_get_functiondef('town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)'::regprocedure),chr(13),''));
--   → 90309bed4053e61db554d29c7abfeab1
-- select has_function_privilege('authenticated','town.reward_garden(jsonb,jsonb,uuid,bigint,bigint,uuid)','EXECUTE');
--   → false (members reach it only through public.town_reward, as before)
