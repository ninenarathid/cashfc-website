create or replace function town.combo_warm(p jsonb,context_ text,c jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare state_ jsonb:=coalesce(p->'professionRewards','{}'::jsonb);r jsonb:=state_->'warmJob';rule_ jsonb;made_ text;takes_ jsonb;x jsonb;bond_ jsonb;id_ uuid;
begin
 if context_='cookCancel' then return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',null)));end if;
 select v into rule_ from jsonb_array_elements(town.combo_rules()) q(v) where v->>'key'='SC04';if not town.raining(t) or not town.combo_match(p,rule_) then return town.no('none');end if;
 if context_='cookBegin' then
  if jsonb_typeof(c->'things') is distinct from 'array' or jsonb_array_length(c->'things')=0 or jsonb_typeof(c->'crew') is distinct from 'array' or jsonb_array_length(c->'crew')=0 or c->'crew'->>0 is distinct from town.hand_of(p) or exists(select 1 from jsonb_array_elements(c->'things') q(v) where jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)<>2 or jsonb_typeof(v->1) is distinct from 'number' or (v->>1)::numeric<>floor((v->>1)::numeric) or (v->>1)::numeric<1) then return town.no('none');end if;
  made_:=town.made_of(town.tidy(c->'things'));if made_ is null or not coalesce(p->'made','[]'::jsonb)?made_ and not coalesce(p->'recipes','[]'::jsonb)?made_ then return town.no('none');end if;takes_:=town.takes(made_);if jsonb_array_length(c->'crew')<(takes_->>'cooks')::integer or not town.in_hands(takes_->'in',c->'crew') then return town.no('none');end if;
  for x in select v from jsonb_array_elements(town.tidy(c->'things')) q(v) loop if town.held(p->'bag',x->>0)<(x->>1)::numeric then return town.no('none');end if;end loop;
  id_:=gen_random_uuid();r:=jsonb_build_object('id',id_,'things',c->'things','crew',c->'crew','began',t,'until',t+120000,'loadout',town.combo_loadout(p));return jsonb_build_object('ok',true,'job',id_,'purse',p||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',r)));
 end if;
 if r is null or r='null'::jsonb or r->>'id' is distinct from c->>'job' or coalesce((r->>'retried')::boolean,false) or t<(r->>'began')::bigint+2400 or t>(r->>'until')::bigint or r->>'loadout' is distinct from town.combo_loadout(p) or coalesce((c->>'hits')::numeric,0)<1 or coalesce((c->>'misses')::numeric,0)<1 or coalesce((c->>'secs')::numeric,0)<2.4 or r->'crew'->>0 is distinct from town.hand_of(p) then return town.no('none');end if;
 for x in select v from jsonb_array_elements(town.tidy(r->'things')) q(v) loop if town.held(p->'bag',x->>0)<(x->>1)::numeric then return town.no('none');end if;end loop;
 bond_:=town.combo_grant(p,'SC04','cook:'||(r->>'id'),t,'{}'::jsonb);if bond_->'ok' is distinct from 'true'::jsonb then return town.no('spent');end if;return bond_||jsonb_build_object('purse',bond_->'purse'||jsonb_build_object('professionRewards',state_||jsonb_build_object('warmJob',r||jsonb_build_object('retried',true))));
end $$;
revoke all on function town.combo_warm(jsonb,text,jsonb,bigint) from public,anon,authenticated;
