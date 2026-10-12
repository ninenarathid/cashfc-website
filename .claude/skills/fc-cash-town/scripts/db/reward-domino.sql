create or replace function town.reward_domino_group(p jsonb,g jsonb,first_ jsonb,axe_ jsonb,t bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb:=jsonb_build_array(first_);from_ jsonb:=first_;next_ jsonb;dx integer;dy integer;i integer;
begin
 if jsonb_typeof(dir_) is distinct from 'array' or jsonb_array_length(dir_)<>2 or exists(select 1 from jsonb_array_elements(dir_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between -1 and 1) then return '[]'::jsonb;end if;
 dx:=(dir_->>0)::integer;dy:=(dir_->>1)::integer;
 if dx=0 and dy=0 or town.tree_elder(first_) or not town.gift_works(p,'charmDomino') or town.used_of(p,'charmDomino',t)>=3 then return '[]'::jsonb;end if;
 for i in 1..2 loop
  select w.v into next_ from jsonb_array_elements(town.cat('trees')->'wood') w(v)
   cross join lateral (select town.tree_apart(w.v,from_) n) d
   where not exists(select 1 from jsonb_array_elements(grp) a where a->0=w.v->0)
    and town.tree_grown(g,w.v,t) and d.n between 1 and 4
    and (w.v->>1)::integer-(from_->>1)::integer=dx*d.n and (w.v->>2)::integer-(from_->>2)::integer=dy*d.n
   order by d.n,(w.v->>0)::integer limit 1;
  if next_ is null or town.tree_elder(next_) or town.axe_bites(axe_,next_) is not null or town.tree_held(g,(next_->>0)::integer,t,me) then exit;end if;
  grp:=grp||jsonb_build_array(next_);from_:=next_;
 end loop;
 return grp;
end $$;
create or replace function town.fell_group(p_purse jsonb,p_grove jsonb,p_first jsonb,p_axe jsonb,p_now bigint,p_me text default null)
returns jsonb language plpgsql stable set search_path='' as $$ begin
 if p_purse ? 'dominoDirection' then return town.reward_domino_group(p_purse,p_grove,p_first,p_axe,p_now,p_me,p_purse->'dominoDirection');end if;
 return town.fell_group_v220(p_purse,p_grove,p_first,p_axe,p_now,p_me);
end $$;
create or replace function town.fell_domino_begin(p jsonb,g jsonb,tree_ integer,x integer,y integer,t bigint,seed_ bigint,me text,dir_ jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare grp jsonb;
begin
 if town.tree_of(tree_) is null or town.axe_of(p) is null then return town.no('none');end if;
 grp:=town.reward_domino_group(p,g,town.tree_of(tree_),town.axe_of(p),t,me,dir_);
 if jsonb_array_length(grp)<2 then return town.no(case when town.used_of(p,'charmDomino',t)>=3 then 'spent' else 'none' end);end if;
 return town.fell_begin(p||jsonb_build_object('dominoDirection',dir_),g,tree_,x,y,t,seed_,me);
end $$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare go_ jsonb:=p_grove->'goes'->p_me;domino_ boolean;did jsonb;used_ jsonb;
begin
 domino_:=coalesce(go_ ? 'domino' and town.go_holds(go_,p_now) and go_->'trees'->0=p_went->'tree',false);
 if domino_ and (coalesce((p_went->>'one')::boolean,false) or not town.gift_works(p_purse,'charmDomino') or town.used_of(p_purse,'charmDomino',p_now)>=3) then return town.no('none');end if;
 did:=town.fell_v220(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if domino_ and did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>=2 then
  used_:=town.gift_use(did->'purse','charmDomino',p_now);if used_->'ok' is distinct from 'true'::jsonb then return used_;end if;
  did:=jsonb_set(did,'{purse}',used_->'purse');
 end if;
 return did;
end $$;
revoke all on function town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb),town.fell_domino_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text,jsonb),town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text),town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;
