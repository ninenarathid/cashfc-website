create or replace function town.fishing_power_seed(me uuid,t bigint)
returns jsonb language plpgsql volatile set search_path='' as $$
declare p jsonb;l jsonb;n integer;keys_ jsonb:='[]';info jsonb:='{}';key_ text;bond jsonb;
begin
 select doc into l from public.town_lines where member_id=me for update;
 if l is null or l->'struck_at'='null'::jsonb then return '{}'::jsonb;end if;
 p:=town.purse_of(me,true);
 n:=1+jsonb_array_length(coalesce(l->'others','[]'));
 for i in 0..n-1 loop
  key_:=(l->>'cast_at')||':'||i;keys_:=keys_||to_jsonb(key_);
  bond:=town.no('none');
  if l->>'current'='run' and l->>'comboLoadout'=town.combo_loadout(p) then bond:=town.combo_grant(p,'SC18','quiet:'||key_,t,'{"quiet":1.5}'::jsonb);end if;
  if bond->'ok'='true'::jsonb then p:=bond->'purse';end if;
  info:=info||jsonb_build_object(key_,jsonb_build_object('key',key_,'quiet',coalesce((bond->'effect'->>'quiet')::numeric,0)));
 end loop;
 perform town.keep_purse(me,p);
 update public.town_lines set doc=l||jsonb_build_object('powerOrder',keys_,'powerInfo',info) where member_id=me;
 return jsonb_build_object('powers',(select jsonb_agg(info->v order by ord) from jsonb_array_elements_text(keys_) with ordinality x(v,ord)));
end $$;
revoke all on function town.fishing_power_seed(uuid,bigint) from public,anon,authenticated;

create or replace function public.town_fishing_power(p_key text,p_charge double precision)
returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.far_member();p jsonb;l jsonb;t bigint:=town.now_ms();bond jsonb;info jsonb;quiet_ numeric:=0;
begin
 select doc into l from public.town_lines where member_id=me for update;
 if l is null or p_key is null or not coalesce(l->'powerOrder' ? p_key,false) or l->'struck_at'='null'::jsonb then return town.answer(me,town.no('none'));end if;
 perform 1 from public.town_purses where member_id=me for update;p:=town.purse_of(me,true);
 if not town.gift_works(p,'charmLunarReel') or l->>'comboLoadout' is distinct from town.combo_loadout(p)
  or p_charge is null or p_charge not between 5 and 180 or p_charge>(t-(l->>'struck_at')::bigint)/1000.0+0.1
  or t-(l->>'struck_at')::bigint<5000 then return town.answer(me,town.no('none'));end if;
 info:=l->'powerInfo'->p_key;
 if info->'used'='true'::jsonb then return town.answer(me,jsonb_build_object('ok',true,'quiet',coalesce(info->'lunarQuiet','0'::jsonb)));end if;
 bond:=town.no('none');
 -- The world's actual rain, never an orb or a local garden cloud.
 if town.raining(t) then bond:=town.combo_grant(p,'SC16','quiet:'||p_key,t,'{"quiet":2}'::jsonb);end if;
 if bond->'ok'='true'::jsonb then p:=bond->'purse';quiet_:=2;end if;
 perform town.keep_purse(me,p);
 update public.town_lines set doc=jsonb_set(l,array['powerInfo',p_key],info||jsonb_build_object('used',true,'lunarQuiet',quiet_)) where member_id=me;
 return town.answer(me,jsonb_build_object('ok',true,'quiet',quiet_)||case when bond->'ok'='true'::jsonb then jsonb_build_object('combo',bond->'effect') else '{}'::jsonb end);
end $$;
revoke all on function public.town_fishing_power(text,double precision) from public,anon,authenticated;
grant execute on function public.town_fishing_power(text,double precision) to authenticated;
