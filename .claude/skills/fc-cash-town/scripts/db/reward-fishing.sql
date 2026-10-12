create or replace function town.reward_school_start(p jsonb,fish_ text,odds_ jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare active_ jsonb:=p->'professionRewards'->'school';used jsonb;school_ jsonb;
begin
 if not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->fish_ is null or town.cat('fish')->fish_->>'tier'='legend'
  or coalesce((p->'best'->>fish_)::numeric,0)<=0 or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=fish_ and (o->>'p')::numeric>0) then return town.no('none');end if;
 if coalesce(active_,'null'::jsonb)<>'null'::jsonb and (active_->>'left')::integer>0 and (active_->>'until')::bigint>t then return town.no('none');end if;
 used:=town.gift_use(p,'thingSchoolBell',t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 school_:=jsonb_build_object('fish',fish_,'left',3,'until',t+1800000);
 return jsonb_build_object('ok',true,'school',school_,'left',used->'left','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_)));
end $$;
create or replace function town.reward_school_weights(p jsonb,odds_ jsonb,star_ boolean,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare school_ jsonb:=p->'professionRewards'->'school';weighted_ jsonb;total_ double precision;
begin
 if coalesce(star_,false) or coalesce(school_,'null'::jsonb)='null'::jsonb or (school_->>'left')::integer<1 or t>=(school_->>'until')::bigint or not town.gift_works(p,'thingSchoolBell') or town.cat('fish')->(school_->>'fish') is null or town.cat('fish')->(school_->>'fish')->>'tier'='legend'
  or not exists(select 1 from jsonb_array_elements(odds_) o where o->>'what'=school_->>'fish' and (o->>'p')::numeric>0) then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision*case when o->>'what'=school_->>'fish' then 3 else 1 end) order by ord) into weighted_ from jsonb_array_elements(odds_) with ordinality a(o,ord);
 select sum((o->>'p')::double precision) into total_ from jsonb_array_elements(weighted_) o;
 if total_ is null or total_<=0 then return jsonb_build_object('purse',p,'odds',odds_);end if;
 select jsonb_agg(o||jsonb_build_object('p',(o->>'p')::double precision/total_) order by ord) into weighted_ from jsonb_array_elements(weighted_) with ordinality a(o,ord);
 return jsonb_build_object('purse',p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('school',school_||jsonb_build_object('left',(school_->>'left')::integer-1))),'odds',weighted_);
end $$;
-- Identical regular-cast habitat/sky/sign/pattern/wariness/forged-rod filters; no full pool is returned to the player.
create or replace function town.reward_school_pool(p jsonb,me uuid,input jsonb,t bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare x integer:=(input->'at'->>0)::integer;y integer:=(input->'at'->>1)::integer;deep_ jsonb:=town.cat('fishing')->'places'->(x::text||','||y::text);water_ jsonb:=town.cat('fishing')->'waters'->(x::text||','||y::text);
 habitat_ text:=coalesce(water_->>'habitat','town');current_ text:=coalesce(input->>'current',water_->>'current','eddy');bait_ text:=input->>'bait';sg jsonb:=town.cat('fishing')->'signs';signs_ text[];under_ jsonb;odds_ jsonb;pattern_ jsonb;rod_ jsonb;
begin
 if deep_ is null or current_ not in ('eddy','run','shelter') or (habitat_='town' and current_<>'eddy') or (habitat_='pool' and current_='run') or town.hook_bait(p,bait_)->'ok' is distinct from 'true'::jsonb then return '[]'::jsonb;end if;
 signs_:=town.signs_of(t,town.stamina_of(p,t)<=0,(select count(*)::integer from public.town_lines l where l.member_id<>me and (l.doc->>'cast_at')::bigint>t-(sg->>'lately')::bigint*1000),town.wet_ms(t-(sg->>'after')::bigint*60000,t),town.raining(t));
 under_:=town.under_orb(town.orb_of(p,t),extract(hour from to_timestamp(t/1000.0) at time zone 'Asia/Bangkok')::integer,town.raining(t),signs_);
 odds_:=town.river_odds(bait_,(under_->>'hour')::integer,(under_->>'rain')::boolean,town.has_buff(p,t,'lucky'),not deep_::boolean,array(select jsonb_array_elements_text(under_->'signs')),town.buff_by(p,t,'lucky'),habitat_,current_);
 pattern_:=town.river_pattern(p,bait_,x,y,current_,t);if habitat_<>'town' then odds_:=town.river_pattern_odds(odds_,(pattern_->>'n')::integer);end if;
 if town.is_wary(p,t) then odds_:=town.sift(odds_,array(select jsonb_array_elements_text(town.cat('fishing')->'wary'->'tiers')));end if;
 rod_:=town.rod_held(p);if rod_ is not null then odds_:=town.rarer(odds_,(town.rod_fx(rod_)->>'rare')::double precision);end if;
 return odds_;
end $$;
revoke all on function town.reward_school_start(jsonb,text,jsonb,bigint),town.reward_school_weights(jsonb,jsonb,boolean,bigint),town.reward_school_pool(jsonb,uuid,jsonb,bigint) from public,anon,authenticated;
