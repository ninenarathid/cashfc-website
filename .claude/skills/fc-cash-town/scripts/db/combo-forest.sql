create or replace function town.combo_forest_listen(p jsonb,c jsonb,t bigint,me_ uuid)
returns jsonb language plpgsql stable set search_path='' as $$
declare id_ integer;f jsonb:=town.cat('forest');spot_ jsonb;has_ jsonb;rule_ jsonb;traces_ boolean;part_ jsonb;bond_ jsonb;taken_ jsonb;item_ text;
begin
 if jsonb_typeof(c->'spot') is distinct from 'number' or jsonb_typeof(c->'at') is distinct from 'array' or jsonb_array_length(c->'at')<>2 then return town.no('none');end if;id_:=(c->>'spot')::integer;spot_:=town.wild_place(f,id_);
 if spot_ is null or not town.wild_secret(f,id_) or not coalesce(p->'forest'->'secrets','[]'::jsonb)@>jsonb_build_array(id_) or not town.wearing(p,'charmFirefly') or greatest(abs((spot_->>1)::numeric-(c->'at'->>0)::numeric),abs((spot_->>2)::numeric-(c->'at'->>1)::numeric))>town.wild_reach(p,town.wild_rule(f,spot_->>0)->>'how',t) then return town.no('none');end if;
 has_:=town.wild_holds(id_,t);if has_ is null then return town.no('none');end if;taken_:=town.taken('spot',id_,(has_->>'turn')::bigint,me_);if coalesce((taken_->>'mine')::boolean,false) or coalesce((taken_->>'n')::integer,0)>=(town.wild_rule(f,spot_->>0)->>'shares')::integer then return town.no('none');end if;
 traces_:=town.held(town.carried_bag(p),'traceLens')>0 or town.has_buff(p,t,'traces');select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC09';if not traces_ and not town.combo_match(p,rule_) then return town.no('none');end if;
 item_:=case when spot_->>0='bough' then 'forestLichen' else 'mushroomSpores' end;part_:=jsonb_build_object('spot',id_,'turn',has_->'turn','item',item_,'until',least((has_->>'until')::bigint,t+180000),'loadout',town.combo_loadout(p));
 if traces_ then bond_:=jsonb_build_object('ok',true,'purse',p);else bond_:=town.combo_grant(p,'SC09','forest:'||id_||':'||(has_->>'turn'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;end if;
 return bond_||jsonb_build_object('purse',bond_->'purse'||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('secretPart',part_)),'part',jsonb_build_object('item',item_,'n',1));
end $$;
create or replace function town.gather_secret_part(p jsonb,id_ integer,has_ jsonb,taken_ integer,mine_ boolean,hand_ text,x_ integer,y_ integer,misses_ double precision,wrong_ double precision,t bigint,with_ text,lost_ boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare r jsonb:=p->'professionRewards'->'secretPart';after_ jsonb;d jsonb;
begin
 if r is null or r='null'::jsonb or has_ is null or (r->>'spot')::integer<>id_ or r->'turn' is distinct from has_->'turn' or (r->>'until')::bigint<t or r->>'loadout' is distinct from town.combo_loadout(p) or with_ is not null or not coalesce(p->'forest'->'secrets','[]'::jsonb)@>jsonb_build_array(id_) or r->>'item' not in('forestLichen','mushroomSpores') then return town.no('none');end if;
 after_:=jsonb_set(p,'{professionRewards,secretPart}','null'::jsonb);d:=town.gather(after_,id_,has_||jsonb_build_object('item',r->>'item','n',1),taken_,mine_,hand_,x_,y_,misses_,wrong_,t,null,lost_);return d;
end $$;
revoke all on function town.combo_forest_listen(jsonb,jsonb,bigint,uuid),town.gather_secret_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,boolean) from public,anon,authenticated;
