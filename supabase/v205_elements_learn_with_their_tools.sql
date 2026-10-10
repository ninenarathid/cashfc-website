-- v205: elemental training, evolving equipment skins, kinder gem changes and gem balance.
-- Run after v202 and v203, with the matching site. Independent of casino v204.
-- Safe to rerun. Existing training is preserved; nothing is retroactively awarded.
-- Private helpers award one point per distinct active element on a successful job.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.forged(jsonb)'::regprocedure),chr(13),'')) not in ('d91daa29c1bf802cd1e6b40d92ccc69f','6788d8906b86c29ed217ea2402680fba') then raise exception 'Definition changed: town.forged(jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.forging_of(jsonb)'::regprocedure),chr(13),'')) not in ('b7226ec8ef497632714934669d58d77e','6dc2642b26b1245deef966f0648b3019') then raise exception 'Definition changed: town.forging_of(jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.tool_with_forging(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('6060cf0b69aae5657a670fcb7e86cbd6','196fe4c46a26c7444e66084e1d969a04') then raise exception 'Definition changed: town.tool_with_forging(jsonb,jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.mine_pick_swings(jsonb,double precision)'::regprocedure),chr(13),'')) not in ('070891ec03086fc1b6d0c6b61a0f706c','f0fccc430e825fcf5eb5fff89c2871e1') then raise exception 'Definition changed: town.mine_pick_swings(jsonb,double precision); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.rod_fx(jsonb)'::regprocedure),chr(13),'')) not in ('531532d52a36b69770707e021399703c','26cefcc43157f61e40158f1004ca8211') then raise exception 'Definition changed: town.rod_fx(jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.hoe_fx(jsonb)'::regprocedure),chr(13),'')) not in ('25b4314973c8544c21b15f295361fe11','a0fd10e2b130c2dc946c28def50cb71f') then raise exception 'Definition changed: town.hoe_fx(jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.cook_fx(jsonb)'::regprocedure),chr(13),'')) not in ('031b0abee81c21f03e86283432030ae6','1299d62bdbd80002cf6b04b95c716a89') then raise exception 'Definition changed: town.cook_fx(jsonb); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)'::regprocedure),chr(13),'')) not in ('a40ecc0d74c70e720ab1881dae5a5563','92c3ae94694a6d2edd316b1f99757272') then raise exception 'Definition changed: town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('262943f3a771355a561ca2c58c368e8b','1e2081fb6c299cdba5ffe4752f95c526') then raise exception 'Definition changed: town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('8a0bccd51542b30a8a3eb60828244f8a','cd6ff5e6aecea3d04afc83644911159c') then raise exception 'Definition changed: town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)'::regprocedure),chr(13),'')) not in ('4cb66d395703429c08b958e50f589bf6','9d927a47b19558005e720c4578e1b518') then raise exception 'Definition changed: town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)'::regprocedure),chr(13),'')) not in ('b2e1b5536be3f45e4fba776ac08f43b0','77f0c9a58542c47cc3d60d4b831efe5d') then raise exception 'Definition changed: town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure),chr(13),'')) not in ('4e26d31a8670e883764d62ac0215242f','e4640721ff835305b125511463427148') then raise exception 'Definition changed: town.cook(jsonb,jsonb,jsonb,double precision,bigint); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.land_catch(jsonb,text,double precision)'::regprocedure),chr(13),'')) not in ('1a8f57780a9b403a3a21c70198d2b5f5','112fab72c6fcee17373320ca20271c6f') then raise exception 'Definition changed: town.land_catch(jsonb,text,double precision); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('town.gem_set_slot(jsonb,integer,text,integer)'::regprocedure),chr(13),'')) not in ('a23d7288f9b68ee363b597406c5a16bb','812c88f44901ee564efd4b2fd3764e07') then raise exception 'Definition changed: town.gem_set_slot(jsonb,integer,text,integer); rebuild v205 on current text';end if;
 if md5(replace(pg_get_functiondef('public.town_smith_gem_slot(integer,text,integer)'::regprocedure),chr(13),'')) not in ('68c6763cc2d7cea62e81fab674b1bad3','37f9847e3404431c950675ec4f6d4b0b') then raise exception 'Definition changed: public.town_smith_gem_slot(integer,text,integer); rebuild v205 on current text';end if;
 if to_regprocedure('town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)')),chr(13),''))<>'0ad16320e49a083211da10d3f33586ba' then raise exception 'Definition changed: town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v205 on current text';end if;
 end if;
 if to_regprocedure('town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)')),chr(13),''))<>'b085df90160fc6446d92d9b7ddb7215e' then raise exception 'Definition changed: town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v205 on current text';end if;
 end if;
 if to_regprocedure('town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)')),chr(13),''))<>'ca0684b7c9bd9566a9f4bf7cc3ca250c' then raise exception 'Definition changed: town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean); rebuild v205 on current text';end if;
 end if;
 if to_regprocedure('town.net_more_v205(jsonb,jsonb,text,integer,double precision,double precision,bigint)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.net_more_v205(jsonb,jsonb,text,integer,double precision,double precision,bigint)')),chr(13),''))<>'2e512f6a2a47a76f2719407c299c40ea' then raise exception 'Definition changed: town.net_more_v205(jsonb,jsonb,text,integer,double precision,double precision,bigint); rebuild v205 on current text';end if;
 end if;
 if to_regprocedure('town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint)')),chr(13),''))<>'2acad19c1a2fc59df7b18317ebb2ecc1' then raise exception 'Definition changed: town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint); rebuild v205 on current text';end if;
 end if;
 if to_regprocedure('town.land_catch_v205(jsonb,text,double precision)') is not null then
  if md5(replace(pg_get_functiondef(to_regprocedure('town.land_catch_v205(jsonb,text,double precision)')),chr(13),''))<>'717ac1db55b0da8056f6964cc6b21b85' then raise exception 'Definition changed: town.land_catch_v205(jsonb,text,double precision); rebuild v205 on current text';end if;
 end if;
end $guard$;
update public.town_catalog set data=jsonb_set(data,'{training}','[0,20,100,300]'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,fire,hoe,fewer}','[1,2,3,3]'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,light,rod,early}','[0.5,1,1.5,2]'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,light,hoe}','{"stones":[1,2,3,4]}'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,light,cook}','{"band":[0.05,0.1,0.15,0.2]}'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,dark,hoe,worm}','[0.2,0.35,0.5,0.65]'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,dark,can,more}','[0.25,0.4,0.55,0.7]'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{old,dark,can,uses}','1'::jsonb,true) where key='forge';
create or replace function town.mastery_of(p_stack jsonb)
returns jsonb language sql stable set search_path='' as $$
 select coalesce(jsonb_object_agg(e,least((town.cat('forge')->'training'->>3)::numeric,floor((p_stack->'mastery'->>e)::numeric))),'{}'::jsonb)
 from jsonb_array_elements_text(town.cat('forge')->'elements') e
 where jsonb_typeof(p_stack->'mastery'->e)='number' and (p_stack->'mastery'->>e)::numeric>0
$$;
create or replace function town.train_element(p_before jsonb,p_after jsonb,p_tool jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare slot_ integer; kept jsonb; mastery jsonb; e text; gems jsonb:=town.tool_gems(p_tool);
begin
 if jsonb_array_length(gems)=0 then return p_after;end if;
 select (s.ord-1)::integer into slot_ from jsonb_array_elements(p_before->'bag') with ordinality s(v,ord)
 where s.v=p_tool order by case when s.ord-1=coalesce((p_before->>'handAt')::integer,-1) then 0 else 1 end,s.ord limit 1;
 kept:=p_after->'bag'->slot_;
 if kept is null or kept='null'::jsonb or kept->>'item' is distinct from p_tool->>'item' or town.tool_gems(kept)<>gems then return p_after;end if;
 mastery:=town.mastery_of(kept);
 for e in select distinct value from jsonb_array_elements_text(gems) loop
  mastery:=mastery||jsonb_build_object(e,least((town.cat('forge')->'training'->>3)::integer,coalesce((mastery->>e)::integer,0)+1));
 end loop;
 return jsonb_set(p_after,array['bag',slot_::text],kept||jsonb_build_object('mastery',mastery));
end $$;
revoke all on function town.mastery_of(jsonb),town.train_element(jsonb,jsonb,jsonb) from public,anon,authenticated;
-- <town.forged(jsonb)>
CREATE OR REPLACE FUNCTION town.forged(p_stack jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(
    case when jsonb_typeof(p_stack->'plus') = 'number' then (p_stack->>'plus')::numeric > 0 else false end
    or case when jsonb_typeof(p_stack->'opts') = 'array' then jsonb_array_length(p_stack->'opts') > 0 else false end
    or case when jsonb_typeof(p_stack->'gems') = 'array' then jsonb_array_length(p_stack->'gems') > 0 else false end or case when jsonb_typeof(p_stack->'mastery')='object' then p_stack->'mastery'<>'{}'::jsonb else false end, false)
$function$
;
-- </town.forged(jsonb)>

-- <town.forging_of(jsonb)>
CREATE OR REPLACE FUNCTION town.forging_of(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select jsonb_build_object('plus', town.tool_level(p_stack), 'opts', d.opts,
    'gems', case when p_stack is not null and town.tool_kind(p_stack->>'item') is not null and jsonb_typeof(p_stack->'gems') = 'array'
      then coalesce((select jsonb_agg(g.v order by g.ord) from jsonb_array_elements(p_stack->'gems') with ordinality g(v, ord)
                      where jsonb_typeof(g.v) = 'string' and town.cat('forge')->'elements' ? (g.v #>> '{}')), '[]'::jsonb) else '[]'::jsonb end,
    'makers', town.tool_makers(p_stack),
    'origin', case when exists (select 1 from jsonb_array_elements(d.opts) o(v) where o.v <> 'null'::jsonb) then town.tool_origin(p_stack) end)
    || case when town.mastery_of(p_stack)<>'{}'::jsonb then jsonb_build_object('mastery',town.mastery_of(p_stack)) else '{}'::jsonb end
    from (select town.tool_drawn(p_stack) as opts) d
$function$
;
-- </town.forging_of(jsonb)>

-- <town.tool_with_forging(jsonb,jsonb)>
CREATE OR REPLACE FUNCTION town.tool_with_forging(p_tool jsonb, p_f jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kind_ text := town.tool_kind(p_tool->>'item');
  opt_ integer := (select max(o.ord)::integer from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.v <> 'null'::jsonb and o.v <> '""'::jsonb);
  maker_ integer := (select max(m.ord)::integer from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.v <> 'null'::jsonb and m.v <> '""'::jsonb);
  next_ jsonb := p_tool - 'plus' - 'opts' - 'gems' - 'makers' - 'origin' - 'mastery';
  holds double precision;
begin
  if town.mastery_of(p_f)<>'{}'::jsonb then next_:=next_||jsonb_build_object('mastery',town.mastery_of(p_f));end if;
  if (p_f->>'plus')::numeric > 0 then next_ := next_ || jsonb_build_object('plus', p_f->'plus'); end if;
  if opt_ is not null then
    next_ := next_ || jsonb_build_object('opts', (select jsonb_agg(case when o.v = 'null'::jsonb then '""'::jsonb else o.v end order by o.ord)
      from jsonb_array_elements(p_f->'opts') with ordinality o(v, ord) where o.ord <= opt_));
  end if;
  if jsonb_array_length(p_f->'gems') > 0 then next_ := next_ || jsonb_build_object('gems', p_f->'gems'); end if;
  if maker_ is not null then
    next_ := next_ || jsonb_build_object('makers', (select jsonb_agg(case when m.v = 'null'::jsonb then '""'::jsonb else m.v end order by m.ord)
      from jsonb_array_elements(p_f->'makers') with ordinality m(v, ord) where m.ord <= maker_));
  end if;
  if kind_ is not null and p_f->>'origin' is not null and opt_ is not null and not town.same_pool(p_f->>'origin', kind_) then
    next_ := next_ || jsonb_build_object('origin', p_f->'origin');
  end if;
  if jsonb_typeof(next_->'water') = 'number' then
    holds := town.can_holds(next_);
    if holds > 0 then next_ := next_ || jsonb_build_object('water', greatest(0, least((next_->>'water')::numeric, holds::numeric))); end if;
  end if;
  return next_;
end;
$function$
;
-- </town.tool_with_forging(jsonb,jsonb)>

-- <town.mine_pick_swings(jsonb,double precision)>
CREATE OR REPLACE FUNCTION town.mine_pick_swings(p_pick jsonb, p_hardness double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
 select greatest(1,case when fire>0 then floor(plain*(1-fire)) else plain end+case when plain>2 then dark_ else 0 end)::integer
 from (select ceil(p_hardness/(k.p->'power'->>town.tool_level(p_pick))::double precision) plain,
 town.gem_by(p_pick,'fire',k.p->'gems'->'fire'->'fewer') fire,town.gem_by(p_pick,'dark',k.p->'gems'->'dark'->'swings') dark_
 from (select town.cat('mining')->'pick' p) k) q
$function$;
-- </town.mine_pick_swings(jsonb,double precision)>

-- <town.rod_fx(jsonb)>
CREATE OR REPLACE FUNCTION town.rod_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  dark_ boolean;
begin
  if not town.fx_of(p_stack, 'rod') then
    return '{"band": 1, "pace": 1, "strike": 1, "line": 1, "fierce": 1, "spared": 0, "still": 0, "shimmer": 0, "stamina": 0, "fresh": false, "quick": 0, "keeps": 0, "rare": 1, "call": false, "gold": 0, "lull": 1, "lullMins": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'rod';
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 0) > 0;
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision * (1+town.fx_gem(m,'lightning',o->'lightning'->'chance')),
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'strike', (case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end) + town.fx_n(k, m, 'rdBait', 'strike'),
    'line', 1::double precision - town.fx_gem(m, 'fire', o->'fire'->'rod'->'tires'),
    'fierce', case when dark_ then 1::double precision + (o->'dark'->'rod'->>'fiercer')::double precision else 1::double precision end,
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + case when m->'opts' ? 'rdBait' then 1 else 0 end,
    'still', town.fx_n(k, m, 'rdCalm', 'secs'),
    'shimmer', town.fx_gem(m, 'light', o->'light'->'rod'->'early'),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'rdFresh',
    'quick', town.fx_n(k, m, 'rdQuick', 'shorter'),
    'keeps', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'rod'->'rare', 1),
    'call', m->'opts' ? 'rdCall',
    'gold', town.fx_n(k, m, 'rdGold', 'secs'),
    'lull', town.fx_n(k, m, 'rdStill', 'by', 1),
    'lullMins', town.fx_n(k, m, 'rdStill', 'mins'));
end;
$function$
;
-- </town.rod_fx(jsonb)>

-- <town.hoe_fx(jsonb)>
CREATE OR REPLACE FUNCTION town.hoe_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
  worm_ double precision;
begin
  if not town.fx_of(p_stack, 'hoe') then
    return '{"band": 1, "pace": 1, "fewer": 0, "spared": 0, "stones": 0, "even": false, "glow": false, "stamina": 0, "fresh": false, "next": 0, "worm": 0, "grip": false, "both": false, "wet": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'hoe';
  worm_ := town.fx_gem(m, 'dark', o->'dark'->'hoe'->'worm');
  return jsonb_build_object(
    'band', (lv->'band'->>l)::double precision * greatest(1::double precision, town.fx_n(k, m, 'hoLight', 'band', 1)),
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'))
      * case when worm_ > 0 then 1::double precision + (o->'dark'->'hoe'->>'faster')::double precision else 1::double precision end,
    'fewer', town.fx_gem(m, 'fire', o->'fire'->'hoe'->'fewer'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'hoFirst', 'misses'),
    'stones', town.fx_n(k, m, 'hoClear', 'stones')+town.fx_gem(m,'light',o->'light'->'hoe'->'stones'),
    'even', m->'opts' ? 'hoLight',
    'glow', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'hoFresh',
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'worm', worm_,
    'grip', m->'opts' ? 'hoGrip',
    'both', m->'opts' ? 'hoBoth',
    'wet', m->'opts' ? 'hoWet');
end;
$function$
;
-- </town.hoe_fx(jsonb)>

-- <town.cook_fx(jsonb)>
CREATE OR REPLACE FUNCTION town.cook_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  dark_ double precision;
begin
  if not town.fx_of(p_stack, 'pot', 'pan', 'grill') then
    return '{"band": 1, "shorter": 0, "spared": 0, "grace": 1, "stamina": 0, "fresh": false, "helping": 0, "big": 0, "steady": 1, "guide": false, "warm": 0, "scent": 0}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  dark_ := town.fx_gem(m, 'dark', o->'dark'->'cook'->'helping');
  return jsonb_build_object(
    'band', (k->'levels'->(p_stack->>'item')->'band'->>l)::double precision
      * case when dark_ > 0 then 1::double precision / (1::double precision + (o->'dark'->'cook'->>'harder')::double precision) else 1::double precision end * (1+town.fx_gem(m,'light',o->'light'->'cook'->'band')),
    'shorter', 1::double precision - (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'cook'->'shorter')) * (1::double precision - town.fx_n(k, m, 'ckBrisk', 'shorter')),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'ckBase', 'misses'),
    'grace', 1::double precision / (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
    'fresh', m->'opts' ? 'ckFresh',
    'helping', town.fx_gem(m, 'lightning', o->'lightning'->'chance'), 'darkHelping', dark_,
    'big', town.fx_n(k, m, 'ckBig', 'more'),
    'steady', town.fx_n(k, m, 'ckFire', 'steady', 1),
    'guide', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'warm', town.fx_n(k, m, 'ckWarm', 'hours'),
    'scent', town.fx_n(k, m, 'ckScent', 'stamina'));
end;
$function$
;
-- </town.cook_fx(jsonb)>

-- <town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)>
CREATE OR REPLACE FUNCTION town.cook_more(p_spent jsonb, p_tool jsonb, p_fx jsonb, p_made boolean, p_luck double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  spent jsonb := p_spent;
  used jsonb;
  more integer := 0;
  warm_ double precision := 0;
  scent_ double precision := 0;
begin
  -- v177: paid batches are counted by town.cook, before its extras.
  if p_luck < (p_fx->>'helping')::double precision then more := more + 1; end if;
  if town.luck_of('darkhelping',p_now,town.tool_level(p_tool)::bigint)<coalesce((p_fx->>'darkHelping')::double precision,0) then more:=more+2;end if;
  if p_made and (p_fx->>'warm')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckWarm', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; warm_ := (p_fx->>'warm')::double precision; end if;
  end if;
  if p_made and (p_fx->>'scent')::double precision > 0 then
    used := town.use_power(spent, p_tool, 'ckScent', p_now);
    if (used->>'ok')::boolean then spent := used->'purse'; scent_ := (p_fx->>'scent')::double precision; end if;
  end if;
  return jsonb_build_object('purse', spent, 'more', more, 'marks', town.pot_marks(jsonb_build_object('warm', warm_, 'scent', scent_)));
end;
$function$
;
-- </town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)>

CREATE OR REPLACE FUNCTION town.mine_pay_v205(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  m jsonb := town.cat('mining');
  now_ bigint := (p_go->>'now')::bigint;
  floor_ integer := (p_go->>'floor')::integer;
  rock_ integer := (p_rock->>0)::integer;
  here integer := (p_go->>'crystal')::integer;
  touch double precision := (m->>'touch')::double precision;
  pick jsonb := case when p_own then town.mine_pick(p_purse) else town.mine_any_pick(p_purse) end;
  opts jsonb := town.tool_mods(pick)->'opts';
  kept jsonb := town.mine_of(p_purse);
  turn_ bigint := town.mine_turn(now_);
  spent boolean := town.stamina_of(p_purse, now_) <= 0;
  veins double precision := town.mine_veins(pick);
  holds jsonb := town.mine_holds_by(p_word, floor_, rock_, turn_, p_go->'today', veins);
  breaks jsonb;                 -- [{rock: [id, x, y, look], holds}, …]: the rock struck first
  r jsonb;
  b jsonb;
  h jsonb;
  chance double precision;
  chained integer;
  got_ jsonb := '[]'::jsonb;
  each_ jsonb := '[]'::jsonb;
  moss jsonb := '[]'::jsonb;
  gone jsonb;
  loose jsonb;
  ore_ text := town.mine_ore(floor_);
  crumb integer := (kept->>'crumb')::integer;
  shards double precision;
  by_ double precision;
  way_ integer;
  shattered boolean := false;
  vein_ jsonb := 'null'::jsonb;
  stowed jsonb;
  after_ jsonb;
  cost double precision := 0;
  owed double precision := (kept->>'owed')::double precision;
  fresh_ jsonb;
  eased_ jsonb;
  used jsonb;
  had_ double precision;
  key_ text := floor_::text || ':' || turn_::text;
  paid jsonb;
begin
  if holds->>'kind' = 'vein' and kept->'vein' <> 'null'::jsonb then return town.no('vein'); end if;

  -- which rocks break: the one struck; by `pkQuake`, plain rocks about the member; and by the roll of `:chain`, now and
  -- then a neighbour. (Never a rock somebody else has begun: that one is theirs.)
  breaks := jsonb_build_array(jsonb_build_object('rock', p_rock, 'holds', holds));
  if p_quake then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when (r->>0)::integer = rock_ or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not town.mine_near((p_go->'at'->>0)::numeric, (p_go->'at'->>1)::numeric, (r->>1)::integer, (r->>2)::integer, town.opt_n('pkQuake', 'reach', pick));
      h := town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word);
      if h is not null then breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', h)); end if;
    end loop;
  end if;
  chance := town.gem_by(pick, 'lightning', m->'pick'->'gems'->'lightning'->'chain');
  if chance > 0 and town.roll(p_word || ':chain', floor_, rock_, turn_) < chance then
    -- (the nearest plain rock that touches it and still stands; of two as near, the lesser number)
    r := (select x.v from jsonb_array_elements(p_go->'rocks') x(v)
           where town.cave_stands(p_go->'cave', (x.v->>0)::integer, now_, here)
             and not exists (select 1 from jsonb_array_elements(breaks) q(v) where q.v->'rock'->>0 = x.v->>0)
             and town.mine_near((p_rock->>1)::numeric, (p_rock->>2)::numeric, (x.v->>1)::integer, (x.v->>2)::integer, touch)
             and town.mine_plain_at(p_go, (x.v->>0)::integer, p_struck->>'first', veins, p_word) is not null
           order by ((x.v->>1)::integer - (p_rock->>1)::integer) * ((x.v->>1)::integer - (p_rock->>1)::integer) + ((x.v->>2)::integer - (p_rock->>2)::integer) * ((x.v->>2)::integer - (p_rock->>2)::integer), (x.v->>0)::integer
           limit 1);
    if r is not null then
      breaks := breaks || jsonb_build_array(jsonb_build_object('rock', r, 'holds', town.mine_plain_at(p_go, (r->>0)::integer, p_struck->>'first', veins, p_word)));
      chained := (r->>0)::integer;
    end if;
  end if;

  -- what they leave
  for b in select x.v from jsonb_array_elements(breaks) with ordinality x(v, ord) order by x.ord loop
    got_ := town.mine_add(got_, 'stone', (m->>'stone')::double precision);
    h := b->'holds';
    shards := 0;
    if h->>'kind' in ('stone', 'way') then
      shards := (h->>'shards')::double precision;
      if h->>'kind' = 'way' then
        way_ := (b->'rock'->>0)::integer;
      elsif opts ? 'pkCrumb' then
        crumb := crumb + 1;
        if crumb >= town.opt_n('pkCrumb', 'every', pick) then crumb := 0; shards := shards + town.opt_n('pkCrumb', 'more', pick); end if;
      end if;
      if h->>'kind' = 'stone' and coalesce((h->>'moss')::boolean, false) then moss := moss || jsonb_build_array((b->'rock'->>0)::integer); end if;
      got_ := town.mine_add(got_, ore_, shards);
    elsif h->>'kind' = 'crystal' then
      shattered := true;
      by_ := case when opts ? 'pkGleam' then town.opt_n('pkGleam', 'by', pick) else 1 end;
      shards := ceil((m->'crystal'->>'shards')::double precision * by_);
      got_ := town.mine_add(got_, m->'ores'->-1->>'shard', shards);
      got_ := town.mine_add(got_, town.cat('forge')->'gems'->(p_go->>'element')->>'chip', ceil((m->'crystal'->>'chips')::double precision * by_));
    end if;
    each_ := each_ || jsonb_build_array(jsonb_build_object('rock', (b->'rock'->>0)::integer, 'kind', h->>'kind', 'shards', shards));
  end loop;
  stowed := town.stow_all(p_purse, got_);
  if stowed is null then return town.no('full'); end if;

  -- what it costs: a point a go, by `pkFresh`'s count and `pick.gems.earth.stamina` (a share kept exact over time)
  after_ := stowed;
  fresh_ := case when opts ? 'pkFresh' then town.use_power(after_, pick, 'pkFresh', now_) end;
  if fresh_ is not null and (fresh_->>'ok')::boolean then
    after_ := fresh_->'purse';
  else
    had_ := town.stamina_of(after_, now_);
    eased_ := town.eased(after_, town.spend(after_, (m->>'stamina')::double precision, now_), now_,
      1::double precision - town.gem_by(pick, 'earth', m->'pick'->'gems'->'earth'->'stamina'), owed);
    cost := had_ - town.stamina_of(eased_->'purse', now_);
    after_ := eased_->'purse';
    owed := (eased_->>'owed')::double precision;
  end if;
  if p_quake then
    used := town.use_power(after_, pick, 'pkQuake', now_);
    if (used->>'ok')::boolean then after_ := used->'purse'; end if;
  end if;
  if holds->>'kind' = 'vein' then
    -- the vein is the member's from here: played with the pick as it is now, and with the stamina left after the rock
    vein_ := jsonb_build_object('f', floor_, 'rock', rock_, 'turn', turn_, 'seed', holds->'seed',
      'gem', case when (holds->>'gem')::boolean then p_go->'element' else 'null'::jsonb end,
      'comboLoadout',town.combo_loadout(p_purse),'geology', town.geology_mods(p_purse,now_),
      'mods', town.vein_mods(pick, town.stamina_of(after_, now_) <= 0),
      'more', case when (holds->>'gem')::boolean and opts ? 'pkCutter' then town.opt_n('pkCutter', 'more', pick) else 0 end);
    had_ := town.stamina_of(after_, now_);
    after_ := town.spend(after_, (m->'vein'->>'stamina')::double precision, now_);
    cost := cost + (had_ - town.stamina_of(after_, now_));
  end if;

  -- what is loosened: the rocks that touch one that broke, and still stand
  gone := (select jsonb_agg((x.v->'rock'->>0)::integer order by x.ord) from jsonb_array_elements(breaks) with ordinality x(v, ord));
  loose := coalesce((select jsonb_agg(i.v order by i.ord) from jsonb_array_elements(case when kept->'loose'->>'k' = key_ then kept->'loose'->'ids' else '[]'::jsonb end) with ordinality i(v, ord)
                      where not exists (select 1 from jsonb_array_elements(gone) g(v) where g.v = i.v)), '[]'::jsonb);
  if opts ? 'pkLoose' then
    for r in select x.v from jsonb_array_elements(p_go->'rocks') with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(gone || loose) g(v) where (g.v #>> '{}')::numeric = (r->>0)::numeric)
        or not town.cave_stands(p_go->'cave', (r->>0)::integer, now_, here)
        or not exists (select 1 from jsonb_array_elements(breaks) q(v)
                        where town.mine_near((q.v->'rock'->>1)::numeric, (q.v->'rock'->>2)::numeric, (r->>1)::integer, (r->>2)::integer, touch));
      loose := loose || jsonb_build_array((r->>0)::integer);
    end loop;
    loose := coalesce((select jsonb_agg(i.v order by (i.v #>> '{}')::numeric) from jsonb_array_elements(loose) i(v)), '[]'::jsonb);
  end if;
  -- (broken for them by somebody else: their page is to say so once, with what it left and who it was)
  paid := case when p_own then kept->'paid' else jsonb_build_object('at', now_, 'f', floor_, 'rock', rock_, 'got', got_, 'way', way_ is not null, 'crystal', shattered,
    'vein', vein_ <> 'null'::jsonb, 'by', coalesce(p_go->>'name', '')) end;
  -- (a rock that opens no vein leaves the vein that is open as it is: whoever struck a rock first and has opened a
  -- vein elsewhere since is paid for the rock when somebody else breaks it, and their vein is theirs to play still.
  -- A rock that does open one never comes here with one open: it is refused at the top, and waits)
  after_ := after_ || jsonb_build_object('mine', kept || jsonb_build_object('owed', owed, 'crumb', crumb, 'loose', jsonb_build_object('k', key_, 'ids', loose),
    'vein', case when vein_ <> 'null'::jsonb then vein_ else kept->'vein' end,
    'last', case when p_own then to_jsonb(now_) else kept->'last' end, 'paid', paid));
  return jsonb_build_object('ok', true, 'done', true, 'purse', after_, 'struck', p_struck, 'broke', gone, 'chained', chained, 'got', got_, 'way', way_, 'vein', vein_,
    'crystal', shattered, 'loose', loose, 'cost', cost, 'spent', spent, 'each', each_, 'moss', moss);
end;
$function$
;
revoke all on function town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text) from public,anon,authenticated;

-- <town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>
CREATE OR REPLACE FUNCTION town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.mine_pay_v205(p_purse,p_go,p_rock,p_struck,p_quake,p_own,p_word);
 if p_own and did->'ok'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.mine_pick(p_purse)));end if;
 return did;end;
$function$;
-- </town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>

CREATE OR REPLACE FUNCTION town.fell_v205(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  first_ jsonb := case when jsonb_typeof(p_went->'tree') = 'number' and (p_went->>'tree')::numeric = floor((p_went->>'tree')::numeric) and abs((p_went->>'tree')::numeric) < 2000000000
    then town.tree_of((p_went->>'tree')::numeric::integer) end;
  axe jsonb := town.axe_of(p_purse);
  who_ text := coalesce(p_who, p_me);
  refused text;
  mine jsonb := p_purse;
  one_ boolean := coalesce(p_went->'one' = 'true'::jsonb, false);
  plain_ boolean;
  board_ boolean;
  through_ boolean;
  misses numeric := 0;
  secs_ double precision := case when jsonb_typeof(p_went->'secs') = 'number' then (p_went->>'secs')::double precision end;
  used jsonb;
  goes_ jsonb := case when jsonb_typeof(p_grove->'goes') = 'object' then p_grove->'goes' else '{}'::jsonb end;
  go_ jsonb;
  held_ jsonb;
  trees_ jsonb;
  closed_ jsonb;
  down_ jsonb := case when jsonb_typeof(p_grove->'down') = 'object' then p_grove->'down' else '{}'::jsonb end;
  half_ jsonb := case when jsonb_typeof(p_grove->'half') = 'array' then p_grove->'half' else '[]'::jsonb end;
  book_ jsonb := case when jsonb_typeof(p_grove->'book') = 'object' then p_grove->'book' else '{}'::jsonb end;
  kept jsonb;
  owed double precision;
  dust numeric;
  keeps jsonb;
  finds jsonb := '[]'::jsonb;
  felled jsonb := '[]'::jsonb;
  all_ jsonb := '[]'::jsonb;
  t jsonb;
  l jsonb;
  got_ jsonb;
  n jsonb;
  i integer;
  j integer;
  id_ integer;
  logs double precision;
  timber double precision;
  by_ double precision;
  twice_ boolean;
  free_ boolean;
  chained integer;
  ks text;
  paid jsonb;
  home jsonb;
  key_ text;
  quality_ text;
begin
  if p_went ? 'grain' and (not town.wood_choice(p_went->'grain') or jsonb_typeof(p_went->'misses') is distinct from 'number') then return town.no('none'); end if;
  if p_went ? 'grain' and ((p_went->>'misses')::numeric <> floor((p_went->>'misses')::numeric) or (p_went->>'misses')::numeric not between 0 and 1000) then return town.no('none'); end if;
  if first_ is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(first_, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, first_);
  if refused is not null then return town.no(refused); end if;
  -- (somebody else is at it: their go holds the tree)
  if town.tree_held(p_grove, (first_->>0)::integer, p_now, p_me) then return town.no('held'); end if;
  plain_ := not one_ and coalesce(p_went->'plain' = 'true'::jsonb, false);
  board_ := not one_ and not plain_;
  -- ── v172: there is no plain way any more: a tree is felled at its board ──
  if plain_ then return town.no('board'); end if;
  -- the axe's one chop, and the plain way: the tree walked up to and nothing else, there and then (never the ancient tree)
  if not board_ then
    if town.tree_elder(first_) then return town.no('none'); end if;
    if not town.tree_grown(p_grove, first_, p_now) then return town.no('stump'); end if;
  end if;
  if one_ then
    used := town.use_power(mine, axe, 'axOne', p_now);
    if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
    mine := used->'purse';
  end if;
  -- the trees of the go: those its board was opened for while it holds, or worked out afresh; only those still standing
  go_ := goes_->p_me;
  held_ := case when board_ and town.go_holds(go_, p_now) and jsonb_typeof(go_->'trees'->0) = 'number' and (go_->'trees'->>0)::numeric = (first_->>0)::numeric then go_ end;
  select coalesce(jsonb_agg(s.v order by s.ord), '[]'::jsonb) into trees_
    from jsonb_array_elements(
      case when not board_ then jsonb_build_array(first_)
           when held_ is not null then coalesce((
             select jsonb_agg(x.t order by x.ord)
               from (select case when jsonb_typeof(e.v) = 'number' and abs((e.v #>> '{}')::numeric) < 2000000000 then town.tree_of((e.v #>> '{}')::numeric::integer) end as t, e.ord
                       from jsonb_array_elements(held_->'trees') with ordinality e(v, ord)) x
              where x.t is not null and town.axe_bites(axe, x.t) is null), '[]'::jsonb)
           else town.fell_group(p_purse, p_grove, first_, axe, p_now, p_me) end) with ordinality s(v, ord)
   where town.tree_grown(p_grove, s.v, p_now);
  if jsonb_array_length(trees_) = 0 then return town.no('stump'); end if;
  through_ := not board_ or coalesce(p_went->'through' = 'true'::jsonb, false);
  if board_ and jsonb_typeof(p_went->'misses') = 'number' then misses := greatest(0, floor((p_went->>'misses')::numeric)); end if;
  -- (no hand chops oftener than the catalog's quickest: the first chop of a trunk takes no time)
  if board_ and through_ and not coalesce(secs_ + 0.05::double precision
       >= greatest(0, (town.fell_trunk(axe, p_grove, trees_)->>'chops')::integer - 1) * (k->>'quickest')::double precision, false) then
    return town.no('none');
  end if;
  if board_ then goes_ := goes_ - coalesce(p_me, ''); end if;
  closed_ := (p_grove - 'goes') || case when goes_ <> '{}'::jsonb then jsonb_build_object('goes', goes_) else '{}'::jsonb end;
  -- the ancient tree, of a go that was lost: it stands, and nothing is changed but that the go is over
  -- ── v173: and so does every other tree: a go that is lost fells nothing, gives nothing and costs no stamina ──
  if not through_ then
    return jsonb_build_object('ok', true, 'purse', p_purse, 'grove', closed_, 'felled', '[]'::jsonb, 'got', '[]'::jsonb,
      'one', one_, 'plain', plain_, 'through', through_, 'stood', true, 'found', '[]'::jsonb, 'braced', null);
  end if;

  if board_ and p_went ? 'grain' then quality_ := town.wood_quality((first_->>0)::integer,p_went->'grain',misses,p_purse,p_now); end if;
  kept := town.felling_of(mine);
  owed := (kept->>'owed')::double precision;
  dust := (kept->>'dust')::numeric;
  keeps := kept->'keeps';
  for t, i in select e.v, (e.ord - 1)::integer from jsonb_array_elements(trees_) with ordinality e(v, ord) order by e.ord loop
    id_ := (t->>0)::integer;
    l := case when jsonb_typeof(p_luck->i) = 'object' then p_luck->i else '{}'::jsonb end;
    twice_ := false; free_ := false; chained := null;
    if town.tree_elder(t) then
      by_ := case when town.tool_has(axe, 'axElder') then town.opt_n('axElder', 'by', axe) else 1 end;
      timber := ceil((k->'elder'->>'timber')::double precision * by_);
      got_ := jsonb_build_array(jsonb_build_array('timber', timber), jsonb_build_array('resin', ceil((k->'elder'->>'resin')::double precision * by_)));
    else
      logs := (k->>'logs')::double precision;
      -- the fine timber: the board's, by the misses; all of it at the axe's one chop; none the plain way
      timber := case when one_ then town.tree_most(t) when plain_ or not through_ then 0 else town.timber_of(town.tree_bears(t), misses) end;
      if coalesce((l->>'dark')::double precision, 1) < town.gem_by(axe, 'dark', k->'axe'->'gems'->'dark'->'log') then logs := logs + 1; end if;
      if town.tool_has(axe, 'axDust') then
        dust := dust + 1;
        if dust >= town.opt_n('axDust', 'every', axe) then logs := logs + town.opt_n('axDust', 'more', axe); dust := 0; end if;
      end if;
      -- twice the wood, where it was asked for and the axe has a time left for it
      if coalesce(p_went->'twice' = 'true'::jsonb, false) then
        used := town.use_power(mine, axe, 'axDouble', p_now);
        if (used->>'ok')::boolean then
          mine := used->'purse'; twice_ := true;
          logs := logs * town.opt_n('axDouble', 'by', axe); timber := timber * town.opt_n('axDouble', 'by', axe);
        end if;
      end if;
      got_ := jsonb_build_array(jsonb_build_array('log', logs));
      if timber > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array('timber', timber)); end if;
      if town.tool_has(axe, 'axResin') and coalesce((l->>'scent')::double precision, 1) < 1::double precision / town.opt_n('axResin', 'in', axe) then
        got_ := got_ || jsonb_build_array(jsonb_build_array(
          k->'scent'->>least(jsonb_array_length(k->'scent') - 1, floor(coalesce((l->>'which')::double precision, 1) * jsonb_array_length(k->'scent'))::integer), 1));
      end if;
    end if;
    -- the stamina: none for the first few trees of a meal's hours with an axe that has that wind; else a tree's, less
    -- the axe's earth (what is left of a point is owed on)
    used := town.use_power(mine, axe, 'axFresh', p_now);
    if (used->>'ok')::boolean then
      mine := used->'purse'; free_ := true;
    else
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_by(axe, 'earth', k->'axe'->'gems'->'earth'->'stamina'), owed);
      mine := paid->'purse';
      owed := (paid->>'owed')::double precision;
    end if;
    down_ := down_ || jsonb_build_object(id_::text, jsonb_build_object('at', p_now, 'by', p_me));
    half_ := coalesce((select jsonb_agg(h.v order by h.ord) from jsonb_array_elements(half_) with ordinality h(v, ord) where h.v <> to_jsonb(id_)), '[]'::jsonb);
    -- the axe's lightning: the nearest grown tree that is not falling in this go is left half cut
    if not town.tree_elder(t) and coalesce((l->>'chain')::double precision, 1) < town.gem_by(axe, 'lightning', k->'axe'->'gems'->'lightning'->'chain') then
      select (o.v->>0)::integer into chained from jsonb_array_elements(k->'wood') o(v)
       where not town.tree_elder(o.v) and (o.v->>0)::integer <> id_ and town.tree_apart(o.v, t) <= (k->'chain'->>'reach')::integer
         and town.axe_bites(axe, o.v) is null and not half_ @> to_jsonb((o.v->>0)::integer) and not down_ ? (o.v->>0)
         and not exists (select 1 from jsonb_array_elements(trees_) x(v) where (x.v->>0)::integer = (o.v->>0)::integer)
       order by town.tree_apart(o.v, t), (o.v->>0)::integer limit 1;
      if chained is not null then half_ := half_ || to_jsonb(chained); end if;
    end if;
    -- what the tree lets fall besides: kept by whoever felled it, and written in the village's book the first time
    ks := town.keepsake_for(t, coalesce((l->>'keep')::double precision, 1), coalesce((l->>'kind')::double precision, 1));
    if ks is not null then
      keeps := keeps || jsonb_build_object(ks, coalesce((keeps->>ks)::numeric, 0) + 1);
      finds := finds || jsonb_build_array(jsonb_build_object('id', ks, 'first', not (book_ ? ks)));
      if not (book_ ? ks) then book_ := book_ || jsonb_build_object(ks, jsonb_build_object('by', who_, 'at', p_now)); end if;
    end if;
    if quality_ is not null then got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse); end if;
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
      || case when quality_ is not null then jsonb_build_object('quality',quality_) else '{}'::jsonb end
      || case when ks is not null then jsonb_build_object('keepsake', ks) else '{}'::jsonb end);
    -- (summed: each kind of thing once, in the order it first came)
    for n in select e.v from jsonb_array_elements(got_) with ordinality e(v, ord) order by e.ord loop
      j := null;
      select (a.ord - 1)::integer into j from jsonb_array_elements(all_) with ordinality a(v, ord) where a.v->>0 = n->>0 limit 1;
      if j is null then all_ := all_ || jsonb_build_array(n);
      else all_ := jsonb_set(all_, array[j::text, '1'], to_jsonb((all_->j->>1)::double precision + (n->>1)::double precision)); end if;
    end loop;
  end loop;
  home := town.stow_all(mine, all_);
  if home is null then return town.no('full'); end if;
  -- (what has grown again is forgotten as the grove is written)
  for key_ in select jsonb_object_keys(down_) loop
    t := case when key_ ~ '^-?[0-9]{1,9}$' then town.tree_of(key_::integer) end;
    if t is null or p_now >= town.tree_until(town.tree_elder(t), (down_->key_->>'at')::numeric::bigint) then down_ := down_ - key_; end if;
  end loop;
  return jsonb_build_object('ok', true,
    'purse', home || jsonb_build_object('felling', jsonb_build_object('owed', owed, 'dust', dust) || case when keeps <> '{}'::jsonb then jsonb_build_object('keeps', keeps) else '{}'::jsonb end),
    'grove', closed_ || jsonb_build_object('down', down_, 'half', half_) || case when book_ <> '{}'::jsonb then jsonb_build_object('book', book_) else '{}'::jsonb end,
    'felled', felled, 'got', all_, 'one', one_, 'plain', plain_, 'through', through_, 'stood', false, 'found', finds,
    'braced', case when board_ and held_ is not null and jsonb_typeof(held_->'braced') = 'string' and held_->>'braced' <> '' and held_->>'braced' is distinct from p_me then held_->>'braced' end);
end;
$function$
;
revoke all on function town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;

-- <town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>
CREATE OR REPLACE FUNCTION town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.fell_v205(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.axe_of(p_purse)));end if;
 return did;end;
$function$;
-- </town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>

CREATE OR REPLACE FUNCTION town.tend_v205(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  f jsonb := town.cat('farming');
  hand text := town.hand_of(p_purse);
  bed jsonb := case when p_bed is null or p_bed = 'null'::jsonb then null else p_bed end;
  owner text := town.owner_of(bed, p_others > 0 or coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb, p_now);
  deed text := town.deed_for(p_key, p_plot, hand, p_me, p_now, owner);
  did jsonb;
  planted boolean;
  next jsonb;
  theirs boolean;
  rung jsonb;
  -- ── the older tools (v174): the forged hoe or can in the hand, and the deed's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  -- ── the older tools (v174): the forged hoe or can in the hand, read once (no other thing held is looked at); and lib/town/farm's mayTwice, where deedFor is told of it ──
  if (hand = 'hoe' or hand = 'can') and town.bag_forged(p_purse->'bag', hand) then
    tool_ := town.hand_stack(p_purse);
    if not town.forged(tool_) then tool_ := null; end if;
  end if;
  if tool_ is not null and hand = 'can' and town.may_power(p_purse, tool_, 'cnTwice', p_now) and town.twice_wanted(p_key, p_plot, p_now) then deed := 'water'; end if;
  -- ── the older tools (v174): its end ──
  if deed is null then return town.no(case when owner is not null and owner <> p_me then 'theirs' else 'soil' end); end if;
  if deed = 'sow' and owner is null and p_holds >= (f->'beds'->>'each')::int then return town.no('beds'); end if;
  did := case
    when deed in ('clear', 'till') then town.hoe(p_key, p_purse, p_plot, hand, p_now)
    when deed in ('pull', 'uproot') then town.uproot(p_key, p_purse, p_plot, true, coalesce(p_sure, false), hand, p_now)
    when deed = 'sow' then town.sow(p_purse, p_plot, hand, p_me, p_now)
    when deed = 'water' then town.water(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'feed' then town.feed(p_key, p_purse, p_plot, hand, p_now)
    when deed = 'cure' then town.cure(p_key, p_purse, p_plot, hand, p_now)
    else town.pick(p_key, p_purse, p_plot, true, hand, p_now) end;
  if not (did->>'ok')::boolean then return did; end if;
  planted := p_others > 0 or coalesce(did->'plot'->'plant', 'null'::jsonb) <> 'null'::jsonb;
  next := case when owner is null then null else bed end;
  if deed = 'sow' and owner is null then
    next := jsonb_build_object('by', p_me, 'tended', p_now, 'empty', 0);
  elsif next is not null and owner = p_me then
    next := next || jsonb_build_object('tended', p_now, 'empty',
      case when planted then 0 when (next->>'empty')::bigint <> 0 then (next->>'empty')::bigint else p_now end);
  end if;
  theirs := (owner is not null and owner <> p_me) or (coalesce(p_plot->'plant', 'null'::jsonb) <> 'null'::jsonb and p_plot->'plant'->>'by' <> p_me);
  -- (somebody else's plant watered by whoever wears the anklet: the run is one longer, and the watering so many times over)
  rung := jsonb_build_object('purse', case when theirs then town.gloved(p_purse, did->'purse', p_now) else did->'purse' end, 'times', 1);
  if deed = 'water' and theirs then rung := town.chime(rung->'purse', p_now); end if;
  -- ── the older tools (v174): what the forged tool pays and counts, the plot as it leaves it, and what came of it ──
  if tool_ is not null and deed in ('clear', 'till', 'water') then
    more_ := town.tend_with(p_key, deed, p_purse, rung->'purse', did->'plot', coalesce(did->'got', '[]'::jsonb), tool_, p_now);
    rung := rung || jsonb_build_object('purse', more_->'purse');
    did := did || jsonb_build_object('plot', more_->'plot', 'got', more_->'got');
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'deed', deed,
      'purse', rung->'purse',
      'plot', did->'plot', 'got', coalesce(did->'got', '[]'::jsonb))
    || case when next is null then '{}'::jsonb else jsonb_build_object('bed', next) end
    || case when (rung->>'times')::numeric > 1 then jsonb_build_object('times', rung->'times') else '{}'::jsonb end;
end;
$function$
;
revoke all on function town.tend_v205(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean) from public,anon,authenticated;

-- <town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)>
CREATE OR REPLACE FUNCTION town.tend(p_key text, p_plot jsonb, p_bed jsonb, p_others integer, p_holds integer, p_purse jsonb, p_me text, p_now bigint, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.tend_v205(p_key,p_plot,p_bed,p_others,p_holds,p_purse,p_me,p_now,p_sure);
 if did->'ok'='true'::jsonb and did->>'deed' in ('clear','till','water') then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.hand_stack(p_purse)));end if;
 return did;end;
$function$;
-- </town.tend(text,jsonb,jsonb,integer,integer,jsonb,text,bigint,boolean)>

CREATE OR REPLACE FUNCTION town.net_more_v205(p_purse jsonb, p_tool jsonb, p_id text, p_n integer, p_cost double precision, p_luck double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  fx jsonb := town.net_fx(p_tool);
  n integer := p_n + case when p_luck < (fx->>'twin')::double precision and town.room(p_purse->'bag', p_id) > p_n then 1 else 0 end;
begin
  return jsonb_build_object('n', n,
    'purse', town.sweep_caught(town.tool_paid(p_purse, town.spend(p_purse, p_cost, p_now), p_now, p_tool, fx, 'ntFresh') || jsonb_build_object('bag', town.put(p_purse->'bag', p_id, n)), p_now));
end;
$function$
;
revoke all on function town.net_more_v205(jsonb,jsonb,text,integer,double precision,double precision,bigint) from public,anon,authenticated;

-- <town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)>
CREATE OR REPLACE FUNCTION town.net_more(p_purse jsonb, p_tool jsonb, p_id text, p_n integer, p_cost double precision, p_luck double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.net_more_v205(p_purse,p_tool,p_id,p_n,p_cost,p_luck,p_now);
 if true then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',p_tool));end if;
 return did;end;
$function$;
-- </town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)>

CREATE OR REPLACE FUNCTION town.cook_v205(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v203: passive equipment, outside the physical bag.
-- v177: stronger milestones and distinct powers.

declare
  ck jsonb := town.cat('cooking');
  items jsonb := town.cat('items');
  alls jsonb := town.tidy(p_things);
  kinds integer := jsonb_array_length(alls);
  crew_n integer := jsonb_array_length(p_crew);
  x jsonb;
  made text;
  t jsonb;
  short boolean;
  dish text;
  bag jsonb := p_purse->'bag';
  pot integer;
  spent jsonb;
  near jsonb;
  left_ integer;
  n integer;
  -- ── the older tools (v174): the forged cookware the pot is begun with, what it carries, and what the pot has of it ──
  mine_ jsonb;
  fx_ jsonb;
  more_ jsonb;
  batch_ integer := 1;
  used_big jsonb;
begin
  if kinds = 0 or kinds > (ck->>'kinds')::int then return town.no('amount'); end if;
  for x in select v from jsonb_array_elements(alls) e(v) loop
    if (x->>1)::numeric <> floor((x->>1)::numeric) or items->(x->>0) is null
       or coalesce(ck->'putIn'->'never', '[]'::jsonb) ? (x->>0)
       or (ck->'never' ? (items->(x->>0)->>'kind') and not (coalesce(ck->'putIn'->'also', '[]'::jsonb) ? (x->>0)))
       or town.held(bag, x->>0) < (x->>1)::numeric then return town.no('none'); end if;
  end loop;
  made := town.made_of(alls);
  if made is not null then
    t := town.takes(made);
    short := crew_n < (t->>'cooks')::int;
    if short or not town.in_hands(t->'in', p_crew) then
      -- somebody who has made it before is told what is missing, and wastes nothing; anybody else finds out by what comes of it
      if coalesce(p_purse->'made', '[]'::jsonb) ? made then
        return town.no(case when short or crew_n > 1 or jsonb_array_length(t->'in') > 1 then 'crew' else 'tool' end);
      end if;
      made := null;
    end if;
  end if;
  -- what is cooked comes as a pot of it: a dish, or the odd dish that things which make nothing come to in the cookware of whoever begins it
  dish := case when made is not null then (case when town.cat('dishes') ? made then made end)
               when jsonb_typeof(p_crew->0) = 'string' and ck->'cookware' ? (p_crew->>0) then ck->>'oddDish' end;
  for x in select v from jsonb_array_elements(alls) e(v) loop bag := town.take(bag, x->>0, (x->>1)::int); end loop;
  -- (the pot it comes in is the yard's: it takes a slot of the bag, and nothing else of the cook's)
  if dish is not null then
    select (s.ord - 1)::int into pot from jsonb_array_elements(bag) with ordinality s(v, ord) where s.v = 'null'::jsonb order by s.ord limit 1;
    if pot is null then return town.no('full'); end if;
  end if;
  spent := town.spend(p_purse, (ck->>'cost')::double precision, p_now);
  -- ── the older tools (v174): forged cookware in the hand of whoever begins the pot, read once; and what it pays ──
  mine_ := town.cook_held(p_purse, p_crew);
  if mine_ is not null then
    fx_ := town.cook_fx(mine_);
    spent := town.tool_paid(p_purse, spent, p_now, mine_, fx_, 'ckFresh');
  end if;
  -- ── the older tools (v174): its end ──
  -- what is no recipe's has a taste; and a miss by a recipe's last thing alone is one more try at that recipe
  if made is null then
    near := town.taste_of(alls, p_crew);
    if near->>'of' is not null and near->>'lacks' is not null and near->>'taste' in ('swap', 'less')
       and near->>'lacks' = (town.needs_of(near->>'of')->-1)->>0 then
      spent := spent || jsonb_build_object('tries', coalesce(spent->'tries', '{}'::jsonb)
        || jsonb_build_object(near->>'of', coalesce((spent->'tries'->>(near->>'of'))::int, 0) + 1));
    end if;
  end if;
  if dish is not null then
    if made is not null and mine_ is not null and (fx_->>'big')::double precision > 0
       and not exists (select 1 from jsonb_array_elements(alls) a(v) where town.held(p_purse->'bag', a.v->>0) < (a.v->>1)::numeric * town.opt_n('ckBig', 'batches', mine_)) then
      used_big := town.use_power(spent, mine_, 'ckBig', p_now);
      if (used_big->>'ok')::boolean then
        spent := used_big->'purse'; batch_ := town.opt_n('ckBig', 'batches', mine_)::integer;
        for x in select v from jsonb_array_elements(alls) a(v) loop bag := town.take(bag, x->>0, (x->>1)::numeric * (batch_ - 1)); end loop;
      end if;
    end if;
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, town.carried_bag(p_purse)) * batch_ else town.odd_helpings(alls, p_misses) end)
      + (case when town.has_buff(p_purse, p_now, 'feast') then (town.wishing()->>'feast')::int else 0 end);
    -- ── the older tools (v174): what the pot has of forged cookware, and what that counts ──
    if mine_ is not null then
      more_ := town.cook_more(spent, mine_, fx_, made is not null, town.luck_of('helping', p_now, kinds), p_now);
      spent := more_->'purse';
      left_ := left_ + (more_->>'more')::integer;
    end if;
    -- ── the older tools (v174): its end ──
    return jsonb_build_object('ok', true, 'made', dish, 'n', left_, 'purse', spent || jsonb_build_object('bag',
        jsonb_set(bag, array[pot::text], jsonb_build_object('item', 'potFull', 'n', 1, 'of', jsonb_build_object('dish', dish, 'left', left_))
          -- ── the older tools (v174): with what it carries from its cookware (nothing, of any other) ──
          || coalesce(more_->'marks', '{}'::jsonb))))
      || case when near is not null then jsonb_build_object('taste', near->'taste') else '{}'::jsonb end;
  end if;
  -- put together with bare hands, things that make nothing are lost
  if made is null then
    return jsonb_build_object('ok', true, 'made', null, 'n', 0, 'taste', near->'taste',
      'purse', spent || jsonb_build_object('bag', case when town.room(bag, 'compost') > 0 then town.put(bag, 'compost', 1) else bag end));
  end if;
  -- what is made otherwise: every miss is one fewer, never under one
  n := greatest(1, (town.cat('makes')->made->>'gives')::int - greatest(0::double precision, floor(p_misses))::int);
  if town.room(bag, made) < n then return town.no('full'); end if;
  return jsonb_build_object('ok', true, 'made', made, 'n', n, 'purse', spent || jsonb_build_object('bag', town.put(bag, made, n)));
end;
$function$
;
revoke all on function town.cook_v205(jsonb,jsonb,jsonb,double precision,bigint) from public,anon,authenticated;

-- <town.cook(jsonb,jsonb,jsonb,double precision,bigint)>
CREATE OR REPLACE FUNCTION town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.cook_v205(p_purse,p_things,p_crew,p_misses,p_now);
 if did->'ok'='true'::jsonb and town.made_of(town.tidy(p_things)) is not null and did->>'made' is not null then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.cook_held(p_purse,p_crew)));end if;
 return did;end;
$function$;
-- </town.cook(jsonb,jsonb,jsonb,double precision,bigint)>

CREATE OR REPLACE FUNCTION town.land_catch_v205(p_purse jsonb, p_what text, p_size double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  kept boolean := town.room(p_purse->'bag', p_what) > 0;
  fish boolean := town.cat('fish') ? p_what;
  record boolean := fish and p_size > coalesce((p_purse->'best'->>p_what)::double precision, 0);
begin
  return jsonb_build_object('kept', kept, 'record', record, 'purse', p_purse || jsonb_build_object(
    'bag', case when kept then town.put(p_purse->'bag', p_what, 1) else p_purse->'bag' end,
    'best', case when record then (p_purse->'best') || jsonb_build_object(p_what, p_size) else p_purse->'best' end));
end;
$function$
;
revoke all on function town.land_catch_v205(jsonb,text,double precision) from public,anon,authenticated;

-- <town.land_catch(jsonb,text,double precision)>
CREATE OR REPLACE FUNCTION town.land_catch(p_purse jsonb, p_what text, p_size double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare did jsonb;begin
 did:=town.land_catch_v205(p_purse,p_what,p_size);
 if did->'kept'='true'::jsonb then did:=jsonb_set(did,'{purse}',town.train_element(p_purse,did->'purse',town.rod_of(p_purse)));end if;
 return did;end;
$function$;
-- </town.land_catch(jsonb,text,double precision)>

-- <town.gem_set_slot(jsonb,integer,text,integer)>
CREATE OR REPLACE FUNCTION town.gem_set_slot(p_purse jsonb, p_slot integer, p_gem text, p_socket integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare k jsonb:=town.cat('forge')->'smith'->'gem';stack jsonb:=p_purse->'bag'->p_slot;kind_ text:=town.tool_kind(stack->>'item');
 e text:=town.gem_element(p_gem);gems jsonb;over_ text;old_gem text;spent jsonb;fee numeric:=(k->>'fee')::numeric;
begin
 if p_slot is null or p_slot<0 or stack is null or stack='null'::jsonb or kind_ is null then return town.no('tool');end if;
 gems:=town.tool_gems(stack);
 if p_gem is null then
  select coalesce(jsonb_agg(g.v order by g.ord),'[]'::jsonb) into gems
  from jsonb_array_elements(case when jsonb_typeof(stack->'gems')='array' then stack->'gems' else '[]'::jsonb end) with ordinality g(v,ord)
  where town.cat('forge')->'elements' ? (g.v #>> '{}');
  if p_socket>=2 then fee:=0;end if;
 end if;
 if p_gem is not null then
  if e is null or town.held_in(p_purse,p_gem)<1 then return town.no('gem');end if;
  if not town.forge_settable(kind_,e) then return town.no('unbuilt');end if;
 end if;
 if p_socket is null or p_socket<0 or (p_gem is not null and p_socket>=2) or p_socket>jsonb_array_length(gems) then return town.no('socket');end if;
 over_:=gems->>p_socket;
 if p_gem is null then
  if over_ is null then return town.no('socket');end if;
 else
  if not town.socket_open(stack,p_socket) then return town.no('socket');end if;
  if over_=e then return town.no('same');end if;
  if town.held_in(p_purse,k->>'mount')<(k->>'mounts')::numeric then return town.no(case when k->>'mount'='timber' then 'timber' else 'ore' end);end if;
 end if;
 if (p_purse->>'coins')::numeric<fee then return town.no('coins');end if;
 spent:=case when p_gem is null then p_purse else town.take_out(town.take_out(p_purse,p_gem,1),k->>'mount',(k->>'mounts')::integer) end;
 if over_ is not null then
  old_gem:=town.cat('forge')->'gems'->over_->>'gem';
  if town.room_in(spent,old_gem)<1 then return town.no('full');end if;
  spent:=town.stow_all(spent,jsonb_build_array(jsonb_build_array(old_gem,1)));
 end if;
 gems:=case when p_gem is null then gems-p_socket else jsonb_set(gems,array[p_socket::text],to_jsonb(e),true) end;
 return jsonb_build_object('ok',true,'item',kind_,'element',e,'over',over_,'purse',spent||jsonb_build_object('coins',(p_purse->>'coins')::numeric-fee,
 'bag',jsonb_set(spent->'bag',array[p_slot::text],case when p_gem is null then (coalesce(nullif(spent->'bag'->p_slot,'null'::jsonb),stack)-'gems')||case when jsonb_array_length(gems)>0 then jsonb_build_object('gems',gems) else '{}'::jsonb end
 else town.tool_with(coalesce(nullif(spent->'bag'->p_slot,'null'::jsonb),stack),town.tool_level(stack),town.tool_drawn(stack),gems) end)));
end;$function$;
-- </town.gem_set_slot(jsonb,integer,text,integer)>

-- <public.town_smith_gem_slot(integer,text,integer)>
CREATE OR REPLACE FUNCTION public.town_smith_gem_slot(p_slot integer, p_gem text, p_socket integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  me uuid := town.smith_member();
  purse jsonb := town.purse_of(me, true);
  did jsonb;
begin
  if p_gem is not null and p_gem !~ '^[A-Za-z]{1,24}$' then return town.smith_answer(me, town.no('gem')); end if;
  did := town.gem_set_slot(purse, p_slot, p_gem, p_socket);
  if (did->>'ok')::boolean then
    perform town.keep_purse(me, did->'purse');
    perform town.note(me, case when p_gem is null then 'gem_remove' else 'gem_set' end, coalesce(p_gem,town.cat('forge')->'gems'->(did->>'over')->>'gem'), 1,
      (did->'purse'->>'coins')::numeric - (purse->>'coins')::numeric,
      jsonb_build_object('slot', p_slot, 'socket', p_socket, 'item', did->'item', 'element', did->'element', 'over', did->'over'));
  end if;
  return town.smith_answer(me, did);
end;
$function$
;
-- </public.town_smith_gem_slot(integer,text,integer)>
notify pgrst,'reload schema';
commit;
select jsonb_build_object('training_private',not has_function_privilege('authenticated','town.train_element(jsonb,jsonb,jsonb)','EXECUTE'),
'thresholds',town.cat('forge')->'training'='[0,20,100,300]'::jsonb,
'two_slots',town.cat('forge')->'forge'->'sockets'='2'::jsonb,
'mastery_travels',position('mastery' in pg_get_functiondef('town.tool_with_forging(jsonb,jsonb)'::regprocedure))>0) as v205_verified;
