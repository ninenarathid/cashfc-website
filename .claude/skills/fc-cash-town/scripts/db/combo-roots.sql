create or replace function town.combo_root_source(before_ jsonb,did_ jsonb,went_ jsonb,at_ jsonb,t bigint,grove_ jsonb,me_ text)
returns jsonb language plpgsql stable set search_path='' as $$
declare f jsonb:=did_->'felled'->0;rule_ jsonb;source_ jsonb;
begin
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC10';
 if did_->'ok' is distinct from 'true'::jsonb or not town.combo_match(before_,rule_) or grove_->'goes'->me_->>'comboLoadout' is distinct from town.combo_loadout(before_) or f is null or went_->'grain' is null or went_->'grain'->>'part'='root' or f->>'quality' is null or coalesce((did_->>'one')::boolean,false) or not coalesce((did_->>'through')::boolean,false) or town.tree_elder(town.tree_of((f->>'id')::integer)) or town.used_of(did_->'purse','charmListening',t)>town.used_of(before_,'charmListening',t) then return did_;end if;
 source_:=jsonb_build_object('key','tree:'||(f->>'id')||':'||t,'tree',f->'id','at',at_,'quality',f->'quality','until',t+180000,'loadout',town.combo_loadout(before_));
 return jsonb_set(did_,'{purse}',did_->'purse'||jsonb_build_object('professionRewards',coalesce(did_->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('rootRun',null,'rootSource',source_)));
end $$;
create or replace function town.reward_root_extract(p jsonb,c jsonb,request_ uuid,t bigint,seed_ bigint,grove_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);source_ jsonb:=state_->'rootSource';r jsonb:=state_->'rootRun';a text:=c->>'action';rule_ jsonb;bond_ jsonb;got_ jsonb:='[]'::jsonb;after_ jsonb;used_ jsonb;pass_ boolean:=true;s_ bigint;target_ numeric;i integer;
begin
 if a='rootExtractCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootRun',null,'rootSource',null)),'rootRun',null);end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC10';
 if not town.combo_match(p,rule_) or source_ is null or source_='null'::jsonb or (source_->>'until')::bigint<t or source_->>'loadout' is distinct from town.combo_loadout(p) or not town.tree_part_ready(grove_,(source_->>'tree')::integer,'root',t) then return town.no('none');end if;
 if greatest(abs((source_->'at'->>0)::integer-(c->'at'->>0)::integer),abs((source_->'at'->>1)::integer-(c->'at'->>1)::integer))>2 then return town.no('far');end if;
 if town.used_of(p,'famPiglet',t)>=(town.cat('gifts')->'uses'->'famPiglet'->>'n')::integer then return town.no('spent');end if;
 if a='rootExtractBegin' then
  if r is not null and r<>'null'::jsonb and (r->>'until')::bigint>t or p->'combos'->'actions'?('root:'||(source_->>'key')) then return town.no('none');end if;
  bond_:=town.combo_grant(p,'SC10','root:'||(source_->>'key'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
  r:=jsonb_build_object('id',request_,'source',source_->'key','seed',seed_,'at',c->'at','began',t,'until',least((source_->>'until')::bigint,t+90000),'loadout',town.combo_loadout(p));
  return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootRun',r,'extraction',null,'run',null)),'rootRun',r);
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'run' or r->'source' is distinct from source_->'key' or r->>'loadout' is distinct from town.combo_loadout(p) or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint then return town.no('none');end if;
 if r->'at' is distinct from c->'at' then return town.no('far');end if;
 if jsonb_typeof(c->'marks') is distinct from 'array' or jsonb_array_length(c->'marks')<>3 or exists(select 1 from jsonb_array_elements(c->'marks') q(v) where jsonb_typeof(v)<>'number' or (v::text)::numeric not between 0 and 1) then return town.no('none');end if;
 s_:=(r->>'seed')::bigint;for i in 0..2 loop s_:=(s_*1664525+1013904223)%4294967296;target_:=.2+(s_%61)::numeric/100;if abs(target_-(c->'marks'->>i)::numeric)>.09 then pass_:=false;end if;end loop;
 if pass_ then got_:=town.wood_yield(false,'root',source_->>'quality',p);end if;after_:=town.stow_all(p,got_);if after_ is null then return town.no('full');end if;used_:=town.gift_use(after_,'famPiglet',t);if used_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
 return jsonb_build_object('ok',true,'purse',town.spend(used_->'purse',1,t)||jsonb_build_object('professionRewards',state_||jsonb_build_object('rootSource',null,'rootRun',null,'extraction',null,'run',null)),'rootRun',null,'got',got_,'rootPassed',pass_);
end $$;
revoke all on function town.combo_root_source(jsonb,jsonb,jsonb,jsonb,bigint,jsonb,text),town.reward_root_extract(jsonb,jsonb,uuid,bigint,bigint,jsonb) from public,anon,authenticated;
