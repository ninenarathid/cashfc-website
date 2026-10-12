create or replace function town.combo_seed(p jsonb,plot_ jsonb,key_ text,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare plant_ jsonb:=plot_->'plant';bond_ jsonb;begin
 if plant_ is null or plant_='null'::jsonb or plant_->>'root' is not null and plant_->>'root'<>key_ or (plant_->>'guard')::bigint>=t+7200000 or plant_?'wingGuard' then return jsonb_build_object('purse',p,'plot',plot_);end if;
 bond_:=town.combo_grant(p,'SC06','seed:'||key_||':'||(plant_->>'sown'),t,'{}'::jsonb);
 if bond_->'ok'='true'::jsonb then return jsonb_build_object('purse',bond_->'purse','plot',jsonb_set(plot_,'{plant,wingGuard}',to_jsonb(t+7200000)));end if;return jsonb_build_object('purse',p,'plot',plot_);
end $$;
create or replace function town.combo_shared_meal(mine_ jsonb,theirs_ jsonb,me_ text,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare meal_ jsonb:=theirs_->'lastMeal';buffs_ jsonb;bond_ jsonb;begin
 select coalesce(jsonb_agg(v order by ord),'[]'::jsonb) into buffs_ from jsonb_array_elements(coalesce(theirs_->'buffs','[]'::jsonb)) with ordinality q(v,ord) where (v->>'until')::bigint>t;
 if meal_ is null or meal_->>'cookedBy' is distinct from me_ or meal_->'extended'='true'::jsonb or t-(meal_->>'at')::bigint not between 0 and 600000 or not exists(select 1 from jsonb_array_elements(buffs_) v where coalesce(meal_->'buffs','[]'::jsonb)?(v->>'id')) then return jsonb_build_object('mine',mine_,'theirs',theirs_);end if;
 bond_:=town.combo_grant(mine_,'SC08','meal:'||(meal_->>'cookId')||':'||(meal_->>'at')||':'||town.day_of(t)::text||':'||town.used_of(mine_,'charmRing',t)::text,t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return jsonb_build_object('mine',mine_,'theirs',theirs_);end if;
 select jsonb_agg(case when meal_->'buffs'?(v->>'id') then v||jsonb_build_object('until',(v->>'until')::bigint+900000) else v end order by ord) into buffs_ from jsonb_array_elements(buffs_) with ordinality q(v,ord);
 return jsonb_build_object('mine',bond_->'purse','theirs',theirs_||jsonb_build_object('buffs',buffs_,'lastMeal',meal_||jsonb_build_object('extended',true)));
end $$;
revoke all on function town.combo_seed(jsonb,jsonb,text,bigint),town.combo_shared_meal(jsonb,jsonb,text,bigint) from public,anon,authenticated;
