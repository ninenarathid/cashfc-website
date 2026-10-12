create or replace function town.combo_approach(p jsonb,context_ text,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'bugApproach';rule_ jsonb;id_ integer;turn_ bigint;h jsonb;has_ jsonb;taken_ integer;mine_ boolean;soft_ numeric;bond_ jsonb;at_ jsonb:=c->'at';
begin
 if context_='bugCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',null)));end if;
 if jsonb_typeof(c->'id') is distinct from 'number' or jsonb_typeof(c->'turn') is distinct from 'number' or jsonb_typeof(at_) is distinct from 'array' or jsonb_array_length(at_)<>2 or exists(select 1 from jsonb_array_elements(at_) q(v) where jsonb_typeof(v)<>'number' or v::text::numeric<>floor(v::text::numeric)) then return town.no('none');end if;
 id_:=(c->>'id')::integer;turn_:=(c->>'turn')::bigint;h:=town.cat('insects')->'haunts'->id_;select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC05';
 soft_:=1/(1+greatest(0,town.buff_by(p,t,'net')))*least(case when town.held(town.carried_bag(p),'scentSatchel')>0 then .85 else 1 end,1-town.buff_by(p,t,'scent'));
 if not town.combo_match(p,rule_) or not coalesce(town.cat('insects')->'nets'?town.hand_of(p),false) or soft_<=.5 or h is null or (select min(greatest(abs((v->>0)::numeric-(at_->>0)::numeric),abs((v->>1)::numeric-(at_->>1)::numeric))) from jsonb_array_elements(h->3) q(v))>8 then return town.no('none');end if;
 has_:=coalesce(case when town.wearing(p,'charmCloak') then town.cloak_at(id_,t,town.cat('insects'),town.word()) end,town.bug_here(id_,t,town.backs_now(t),town.cat('insects'),town.word()));if has_ is null or (has_->>'turn')::bigint<>turn_ then return town.no('none');end if;
 select count(*)::integer,coalesce(bool_or(member_id=me_),false) into taken_,mine_ from public.town_takes where what='haunt' and place=id_ and turn=turn_;if mine_ or taken_>=(town.cat('insects')->'kinds'->(h->>0)->>'shares')::integer then return town.no('none');end if;
 if context_='bugBegin' then r:=jsonb_build_object('id',id_,'turn',turn_,'at',at_,'began',t,'until',t+15000,'loadout',town.combo_loadout(p));return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',r)));end if;
 if r is null or r='null'::jsonb or coalesce((r->>'ready')::boolean,false) or (r->>'id')::integer<>id_ or (r->>'turn')::bigint<>turn_ or r->>'loadout' is distinct from town.combo_loadout(p) or r->'at' is distinct from at_ or t<(r->>'began')::bigint+1000 or t>(r->>'until')::bigint then return town.no('none');end if;
 if p->'combos'->'actions'?('approach:'||id_||':'||turn_||':'||(r->>'began')) then return town.no('none');end if;bond_:=town.combo_grant(p,'SC05','approach:'||id_||':'||turn_||':'||(r->>'began'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;
 return jsonb_build_object('ok',true,'purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('bugApproach',r||jsonb_build_object('ready',true,'until',t+10000))));
end $$;
create or replace function town.combo_row_begin(p jsonb,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare key_ text:=c->>'key';x_ integer;y_ integer;bed_ integer;keeping_ jsonb;owner_ text;row_ jsonb;rule_ jsonb;
begin
 if key_ is null or key_!~'^[0-9]+,[0-9]+$' then return town.no('none');end if;x_:=split_part(key_,',',1)::integer;y_:=split_part(key_,',',2)::integer;bed_:=town.bed_of(x_,y_);if bed_<0 then return town.no('none');end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC17';if not town.combo_match(p,rule_) then return town.no('none');end if;
 select jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty) into keeping_ from public.town_beds b where b.bed=bed_;owner_:=town.owner_of(keeping_,false,t);if owner_ is null or owner_=me_::text then return town.no('none');end if;row_:=town.row_for(key_,town.row_keys(x_,y_),town.garden_plots(key_),p,me_::text,t,owner_);if row_ is null or row_->>'deed' not in('clear','till') then return town.no('none');end if;
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('rowStart',jsonb_build_object('key',key_,'until',t+90000,'loadout',town.combo_loadout(p)))));
end $$;
revoke all on function town.combo_approach(jsonb,text,jsonb,bigint,uuid),town.combo_row_begin(jsonb,jsonb,bigint,uuid) from public,anon,authenticated;
