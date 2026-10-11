-- v216: meaningful gameplay for all eight gems, including matching sockets.
-- Run after v205 with the matching site. Independent of casino and v207-v215.
-- Safe to rerun. Preserves inventory, training, socket limits and profession wrappers.
-- Water and earth share the 3x saving cap; dark soil grants at most 20 compost/member/game day.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('town.rod_fx(jsonb)'::regprocedure),chr(13),'')) not in ('26cefcc43157f61e40158f1004ca8211','0c1be9acb09d83797cafc06dfef53adb') then raise exception 'Definition changed: town.rod_fx(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.hoe_fx(jsonb)'::regprocedure),chr(13),'')) not in ('a0fd10e2b130c2dc946c28def50cb71f','14492a63f2d59cb24310cdd598697801') then raise exception 'Definition changed: town.hoe_fx(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.can_fx(jsonb)'::regprocedure),chr(13),'')) not in ('cb968197d0ff0bf094ad213fee973d12','b504acc9a4b41f8b6a1ff7f23affa60d') then raise exception 'Definition changed: town.can_fx(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.net_fx(jsonb)'::regprocedure),chr(13),'')) not in ('9d6db1700627764f6fe95b9e69ec62df','72a9930a36b78a3995da6dafa286aa54') then raise exception 'Definition changed: town.net_fx(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.cook_fx(jsonb)'::regprocedure),chr(13),'')) not in ('1299d62bdbd80002cf6b04b95c716a89','3c329b0d7b3f6fbe79a11f74b737849d') then raise exception 'Definition changed: town.cook_fx(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.vein_mods(jsonb,boolean)'::regprocedure),chr(13),'')) not in ('ac475f002eedef6805d60e03008f80fa','5815168d0a891a5e653e5ae548895fad') then raise exception 'Definition changed: town.vein_mods(jsonb,boolean); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.axe_ahead(jsonb)'::regprocedure),chr(13),'')) not in ('cfd61f3bd1b98666baa3fff2019bac36','3c7518c7f39b6e5a6b0b1975114b22cf') then raise exception 'Definition changed: town.axe_ahead(jsonb); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure),chr(13),'')) not in ('0ad16320e49a083211da10d3f33586ba','79c8d7cca084d40dda95d50718ed1985') then raise exception 'Definition changed: town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure),chr(13),'')) not in ('b085df90160fc6446d92d9b7ddb7215e','c660e34893867d668773db983352c643') then raise exception 'Definition changed: town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.tend_with(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,bigint)'::regprocedure),chr(13),'')) not in ('3f750a5b83d04da8d681c65490555f58','c676a5fd25814fee54fee2ea7e9101c0') then raise exception 'Definition changed: town.tend_with(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,bigint); rebuild v216 on current text';end if;
 if md5(replace(pg_get_functiondef('town.fell_most(jsonb,jsonb)'::regprocedure),chr(13),'')) not in ('0a0edb61d3eaf82be3c8d9a79ab0b5b2','e40daac75409fa2c025cd11f836113f0') then raise exception 'Definition changed: town.fell_most(jsonb,jsonb); rebuild v216 on current text';end if;
 if to_regprocedure('town.gem_stamina(jsonb)') is not null and md5(replace(pg_get_functiondef(to_regprocedure('town.gem_stamina(jsonb)')),chr(13),''))<>'49983fb80200fe1f8e7daca9eb1828c1' then raise exception 'Definition changed: town.gem_stamina(jsonb); rebuild v216 on current text';end if;
 if to_regprocedure('town.dark_soil(jsonb,jsonb,bigint)') is not null and md5(replace(pg_get_functiondef(to_regprocedure('town.dark_soil(jsonb,jsonb,bigint)')),chr(13),''))<>'e91bede91a3671f7ebfe96fd73baafa9' then raise exception 'Definition changed: town.dark_soil(jsonb,jsonb,bigint); rebuild v216 on current text';end if;
end $guard$;
update public.town_catalog set data=jsonb_set(data,'{old}','{"fire":{"rod":{"tires":[0.25,0.4,0.55,0.65]},"hoe":{"fewer":[2,3,4,5]},"can":{"more":[3,6,9,12]},"bugNet":{"sooner":[0.25,0.4,0.55,0.65]},"cook":{"shorter":[0.25,0.4,0.55,0.65]}},"water":{"spared":[1,2,3,4],"stamina":[0.2,0.35,0.45,0.5]},"ice":{"slow":[0.25,0.4,0.5,0.6]},"earth":{"stamina":[0.3,0.5,0.6,0.65]},"lightning":{"chance":[0.2,0.35,0.5,0.6]},"wind":{"quick":[0.2,0.35,0.5,0.6],"reach":[1,2,3,4]},"light":{"band":[0.2,0.35,0.5,0.6],"rod":{"early":[1,2,3,4]},"hoe":{"stones":[1,2,3,4]},"cook":{"band":[0.2,0.35,0.5,0.6]},"can":{"glint":[7,10,14,999]},"bugNet":{"seen":[5,8,12,16]}},"dark":{"rod":{"rare":[1.5,2,2.5,3],"fiercer":0.1},"hoe":{"worm":[0.35,0.5,0.65,0.8],"faster":0.1,"soil":[1,1,2,2],"daily":20},"can":{"more":[0.35,0.55,0.75,0.85],"uses":1},"bugNet":{"rare":[1.5,2,2.5,3],"smaller":0.1},"cook":{"helping":[0.25,0.4,0.55,0.65],"harder":0.1}}}'::jsonb,true) where key='forge';
update public.town_catalog set data=jsonb_set(data,'{pick,gems}','{"fire":{"fewer":[0.25,0.4,0.55,0.65],"tempo":[0.1,0.2,0.35,0.4]},"water":{"back":[1,2,3,4],"stamina":[0.2,0.35,0.45,0.5]},"ice":{"cross":[2,3,4,5]},"earth":{"stamina":[0.3,0.5,0.6,0.65]},"lightning":{"chain":[0.2,0.35,0.5,0.6]},"wind":{"walk":[0.25,0.45,0.65,0.75]},"light":{"glint":[7,10,14,999],"strikes":[2,4,6,8]},"dark":{"veins":[1.6,2.2,2.8,3.2],"swings":[1,1,1,1]}}'::jsonb,true) where key='mining';
update public.town_catalog set data=jsonb_set(data,'{axe,gems}','{"fire":{"fewer":[0.25,0.4,0.55,0.65]},"water":{"spared":[1,2,3,4],"stamina":[0.2,0.35,0.45,0.5]},"ice":{"slow":[0.25,0.4,0.5,0.6]},"earth":{"stamina":[0.3,0.5,0.6,0.65]},"lightning":{"chain":[0.2,0.35,0.5,0.6]},"wind":{"walk":[0.25,0.45,0.65,0.75]},"light":{"glint":[15,25,35,999],"ahead":[2,4,6,8]},"dark":{"log":[0.25,0.4,0.55,0.65],"timber":[0.25,0.4,0.55,0.65],"faster":[0.15,0.15,0.15,0.15]}}'::jsonb,true) where key='trees';
create or replace function town.gem_stamina(p_stack jsonb)
returns double precision language sql stable set search_path='' as $$
 select 1-greatest(1/(town.cat('forge')->'forge'->>'cap')::double precision,
 (1-town.gem_by(p_stack,'earth',town.cat('forge')->'old'->'earth'->'stamina'))*
 (1-town.gem_by(p_stack,'water',town.cat('forge')->'old'->'water'->'stamina')))
$$;
create or replace function town.dark_soil(p_purse jsonb,p_tool jsonb,p_now bigint)
returns jsonb language plpgsql stable set search_path='' as $$
declare k jsonb:=town.cat('forge')->'old'->'dark'->'hoe';
 wanted integer:=town.gem_by(p_tool,'dark',k->'soil')::integer;
 day_ bigint:=town.day_of(p_now); used_ integer:=0; n integer;
begin
 if wanted=0 then return jsonb_build_object('purse',p_purse,'n',0);end if;
 if p_purse->'darkSoil'->'day'=to_jsonb(day_) and jsonb_typeof(p_purse->'darkSoil'->'n')='number'
 and (p_purse->'darkSoil'->>'n')::numeric=floor((p_purse->'darkSoil'->>'n')::numeric) then
  used_:=greatest(0,least((k->>'daily')::numeric,(p_purse->'darkSoil'->>'n')::numeric))::integer;
 end if;
 n:=least(wanted,(k->>'daily')::integer-used_,town.room(p_purse->'bag','compost'))::integer;
 if n<=0 then return jsonb_build_object('purse',p_purse,'n',0);end if;
 return jsonb_build_object('n',n,'purse',p_purse||jsonb_build_object('bag',town.put(p_purse->'bag','compost',n),'darkSoil',jsonb_build_object('day',day_,'n',used_+n)));
end $$;
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
    'band', (lv->'band'->>l)::double precision * (1+town.fx_gem(m,'lightning',o->'lightning'->'chance')) * (1+town.fx_gem(m,'light',o->'light'->'band')),
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'strike', ((case when l > 0 then (lv->'strike'->>l)::double precision / (lv->'strike'->>0)::double precision else 1::double precision end) + town.fx_n(k, m, 'rdBait', 'strike')) * (1+town.fx_gem(m,'light',o->'light'->'band')),
    'line', 1::double precision - town.fx_gem(m, 'fire', o->'fire'->'rod'->'tires'),
    'fierce', case when dark_ then 1::double precision + (o->'dark'->'rod'->>'fiercer')::double precision else 1::double precision end,
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + case when m->'opts' ? 'rdBait' then 1 else 0 end,
    'still', town.fx_n(k, m, 'rdCalm', 'secs'),
    'shimmer', town.fx_gem(m, 'light', o->'light'->'rod'->'early'),
    'stamina', town.gem_stamina(p_stack),
    'fresh', m->'opts' ? 'rdFresh',
    'quick', 1-(1-town.fx_n(k,m,'rdQuick','shorter'))*(1-town.fx_gem(m,'wind',o->'wind'->'quick')),
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
    'band', (lv->'band'->>l)::double precision * greatest(1::double precision, town.fx_n(k, m, 'hoLight', 'band', 1)) * (1+town.fx_gem(m,'light',o->'light'->'band')),
    'pace', (1::double precision - (lv->'slow'->>l)::double precision) * (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'))
      * case when worm_ > 0 then 1::double precision + (o->'dark'->'hoe'->>'faster')::double precision else 1::double precision end,
    'fewer', town.fx_gem(m, 'fire', o->'fire'->'hoe'->'fewer'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'hoFirst', 'misses'),
    'stones', town.fx_n(k, m, 'hoClear', 'stones')+town.fx_gem(m,'light',o->'light'->'hoe'->'stones'),
    'even', m->'opts' ? 'hoLight',
    'glow', coalesce((m->'gems'->>'light')::integer, 0) >= 1,
    'stamina', town.gem_stamina(p_stack),
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

-- <town.can_fx(jsonb)>
CREATE OR REPLACE FUNCTION town.can_fx(p_stack jsonb)
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
  rich_ double precision;
begin
  if not town.fx_of(p_stack, 'can') then
    return '{"more": 0, "marks": 1, "pace": 1, "spared": 0, "takes": null, "stamina": 0, "fresh": false, "kind": 0, "next": 0, "rich": 0, "uses": 1, "glint": 0, "full": 0, "rain": false, "twice": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'can';
  rich_ := town.fx_gem(m, 'dark', o->'dark'->'can'->'more');
  return jsonb_build_object(
    'more', (lv->'waterings'->>l)::double precision - (lv->'waterings'->>0)::double precision + town.fx_gem(m, 'fire', o->'fire'->'can'->'more') + town.fx_n(k, m, 'cnDrop', 'more') + town.fx_n(k, m, 'cnThrift', 'more'),
    'marks', (lv->'marks'->>l)::double precision * (1+town.fx_gem(m,'light',o->'light'->'band')),
    'pace', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'takes', case when m->'opts' ? 'cnThrift' then to_jsonb(town.fx_n(k, m, 'cnThrift', 'takes')) else 'null'::jsonb end,
    'stamina', town.gem_stamina(p_stack),
    'fresh', m->'opts' ? 'cnFresh',
    'kind', town.fx_n(k, m, 'cnKind', 'points'),
    'next', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'rich', rich_,
    'uses', case when rich_ > 0 then (o->'dark'->'can'->>'uses')::double precision else 1::double precision end,
    'glint', town.fx_gem(m, 'light', o->'light'->'can'->'glint'),
    'full', town.fx_n(k, m, 'cnFull', 'mins'),
    'rain', m->'opts' ? 'cnRain',
    'twice', m->'opts' ? 'cnTwice');
end;
$function$
;
-- </town.can_fx(jsonb)>

-- <town.net_fx(jsonb)>
CREATE OR REPLACE FUNCTION town.net_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  k jsonb;
  m jsonb;
  o jsonb;
  l integer;
  lv jsonb;
begin
  if not town.fx_of(p_stack, 'bugNet') then
    return '{"ring": 1, "lands": 1, "again": 1, "reach": 0, "spared": 0, "bears": 0, "flight": 1, "stamina": 0, "fresh": false, "twin": 0, "seen": 0, "rare": 1, "wide": 0, "freeze": 0, "nest": false}'::jsonb;
  end if;
  k := town.cat('forge');
  m := town.tool_mods(p_stack);
  o := k->'old';
  l := (m->>'level')::integer;
  lv := k->'levels'->'bugNet';
  return jsonb_build_object(
    'ring', case when l > 0 then (lv->'ring'->>l)::double precision / (lv->'ring'->>0)::double precision else 1::double precision end
      * case when town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare') > 0 then 1::double precision - (o->'dark'->'bugNet'->>'smaller')::double precision else 1::double precision end * (1+town.fx_gem(m,'light',o->'light'->'band')),
    'lands', case when l > 0 then (lv->'lands'->>l)::double precision / (lv->'lands'->>0)::double precision else 1::double precision end
      * (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'bugNet'->'sooner')),
    'again', town.slowed_by(town.fx_n(k,m,'ntAgain','by',1),1-town.fx_gem(m,'wind',o->'wind'->'quick')),
    'reach', town.fx_n(k,m,'ntLong','reach')+town.fx_gem(m,'wind',o->'wind'->'reach'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'bears', town.fx_n(k, m, 'ntMesh', 'misses'),
    'flight', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'stamina', town.gem_stamina(p_stack),
    'fresh', m->'opts' ? 'ntFresh',
    'twin', town.fx_gem(m, 'lightning', o->'lightning'->'chance'),
    'seen', town.fx_gem(m, 'light', o->'light'->'bugNet'->'seen'),
    'rare', town.fx_gem(m, 'dark', o->'dark'->'bugNet'->'rare', 1),
    'wide', town.fx_n(k, m, 'ntWide', 'reach'),
    'freeze', town.fx_n(k, m, 'ntFreeze', 'secs'),
    'nest', m->'opts' ? 'ntNest');
end;
$function$
;
-- </town.net_fx(jsonb)>

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
    'shorter', least(1-1/(k->'forge'->>'cap')::double precision,1::double precision - (1::double precision - town.fx_gem(m, 'fire', o->'fire'->'cook'->'shorter')) * (1::double precision - town.fx_n(k, m, 'ckBrisk', 'shorter')) * (1-town.fx_gem(m,'wind',o->'wind'->'quick'))),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared') + town.fx_n(k, m, 'ckBase', 'misses'),
    'grace', 1::double precision / (1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow')),
    'stamina', town.gem_stamina(p_stack),
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

-- <town.vein_mods(jsonb,boolean)>
CREATE OR REPLACE FUNCTION town.vein_mods(p_pick jsonb, p_spent boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

  select jsonb_build_object(
    'strikes', greatest(1::double precision, (k.m->'pick'->'strikes'->>town.tool_level(p_pick))::double precision
      + case when town.tool_has(p_pick, 'pkSteady') then town.opt_n('pkSteady', 'strikes', p_pick) else 0 end
      + case when town.tool_has(p_pick, 'pkPeek') then town.opt_n('pkPeek', 'strikes', p_pick) else 0 end
      + town.gem_by(p_pick,'light',k.m->'pick'->'gems'->'light'->'strikes')
      - case when p_spent then (k.m->'vein'->'tired'->>'fewer')::double precision else 0 end),
    'back', town.gem_by(p_pick, 'water', k.m->'pick'->'gems'->'water'->'back'),
    'cross', town.gem_by(p_pick, 'ice', k.m->'pick'->'gems'->'ice'->'cross'), 'spent', coalesce(p_spent, false))
    from (select town.cat('mining') as m) k
$function$
;
-- </town.vein_mods(jsonb,boolean)>

-- <town.axe_ahead(jsonb)>
CREATE OR REPLACE FUNCTION town.axe_ahead(p_axe jsonb)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

  select (town.cat('trees')->'axe'->'ahead'->>town.tool_level(p_axe))::double precision
    + case when town.tool_has(p_axe, 'axGrain') then town.opt_n('axGrain', 'ahead', p_axe) else 0 end
    + town.gem_by(p_axe,'light',town.cat('trees')->'axe'->'gems'->'light'->'ahead')
$function$
;
-- </town.axe_ahead(jsonb)>

-- <town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>
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
      1::double precision - town.gem_stamina(pick), owed);
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
    eased_ := town.eased(after_,town.spend(after_,(m->'vein'->>'stamina')::double precision,now_),now_,1-town.gem_stamina(pick),owed);
    after_:=eased_->'purse';owed:=(eased_->>'owed')::double precision;
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
-- </town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>

-- <town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>
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
      if board_ and through_ and misses=0 and coalesce((l->>'dark')::double precision,1)<town.gem_by(axe,'dark',k->'axe'->'gems'->'dark'->'timber') then timber:=timber+1;end if;
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
      paid := town.eased(mine, town.spend(mine, (k->>'cost')::double precision, p_now), p_now, 1::double precision - town.gem_stamina(axe), owed);
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
-- </town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>

-- <town.tend_with(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,bigint)>
CREATE OR REPLACE FUNCTION town.tend_with(p_key text, p_deed text, p_before jsonb, p_after jsonb, p_plot jsonb, p_got jsonb, p_tool jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
  fx jsonb;
  paid jsonb;
  used jsonb;
  both_ boolean := false;
  damp_ boolean := false;
  tilled boolean;
  left_ jsonb := p_plot;
  got_ jsonb := p_got;
begin
  if p_deed = 'water' then
    return jsonb_build_object('purse', town.tool_paid(p_before, p_after, p_now, p_tool, town.can_fx(p_tool), 'cnFresh'), 'plot', p_plot, 'got', p_got);
  end if;
  fx := town.hoe_fx(p_tool);
  paid := town.tool_paid(p_before, p_after, p_now, p_tool, fx, 'hoFresh');
  if town.stamina_of(p_before, p_now) <= 0 and (fx->>'grip')::boolean then
    used := town.use_power(paid, p_tool, 'hoGrip', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; end if;
  end if;
  if p_deed = 'clear' and p_plot->>'soil' = 'cleared' and (fx->>'both')::boolean then
    used := town.use_power(paid, p_tool, 'hoBoth', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; both_ := true; end if;
  end if;
  tilled := p_deed = 'till' or both_;
  if tilled and (fx->>'wet')::boolean then
    used := town.use_power(paid, p_tool, 'hoWet', p_now);
    if (used->>'ok')::boolean then paid := used->'purse'; damp_ := true; end if;
  end if;
  if both_ or damp_ then
    left_ := '{"soil": "tilled", "plant": null}'::jsonb || case when damp_ then '{"damp": true}'::jsonb else '{}'::jsonb end;
  end if;
  if tilled and (fx->>'worm')::double precision > 0 and town.luck_of('worm|' || p_key, p_now) < (fx->>'worm')::double precision and town.room(paid->'bag', 'worm') > 0 then
    paid := paid || jsonb_build_object('bag', town.put(paid->'bag', 'worm', 1));
    got_ := got_ || '[["worm", 1]]'::jsonb;
  end if;
  if tilled then
    used:=town.dark_soil(paid,p_tool,p_now);paid:=used->'purse';
    if (used->>'n')::integer>0 then got_:=got_||jsonb_build_array(jsonb_build_array('compost',(used->>'n')::integer));end if;
  end if;
  return jsonb_build_object('purse', paid, 'plot', left_, 'got', got_);
end;
$function$
;
-- </town.tend_with(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,bigint)>

-- <town.fell_most(jsonb,jsonb)>
CREATE OR REPLACE FUNCTION town.fell_most(p_axe jsonb, p_trees jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $function$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  twice double precision := case when town.tool_has(p_axe, 'axDouble') then town.opt_n('axDouble', 'by', p_axe) else 1 end;
  elder double precision := case when town.tool_has(p_axe, 'axElder') then town.opt_n('axElder', 'by', p_axe) else 1 end;
  more double precision := case when town.gem_by(p_axe, 'dark', k->'axe'->'gems'->'dark'->'log') > 0 then 1 else 0 end
    + case when town.tool_has(p_axe, 'axDust') then town.opt_n('axDust', 'more', p_axe) else 0 end;
  scented boolean := town.tool_has(p_axe, 'axResin');
  logs double precision := 0;
  timber double precision := 0;
  resin double precision := 0;
  scent integer := 0;
  t jsonb;
  out_ jsonb;
begin
  for t in select e.v from jsonb_array_elements(p_trees) with ordinality e(v, ord) order by e.ord loop
    if town.tree_elder(t) then
      timber := timber + ceil((k->'elder'->>'timber')::double precision * elder);
      resin := resin + ceil((k->'elder'->>'resin')::double precision * elder);
      continue;
    end if;
    logs := logs + ((k->>'logs')::double precision + more) * twice;
    timber := timber + (town.tree_most(t)+case when town.gem_by(p_axe,'dark',k->'axe'->'gems'->'dark'->'timber')>0 then 1 else 0 end) * twice;
    if scented then scent := scent + 1; end if;
  end loop;
  out_ := jsonb_build_array(jsonb_build_array('log', logs), jsonb_build_array('timber', timber))
    || coalesce((select jsonb_agg(jsonb_build_array(s.id, scent + case when s.id = 'resin' then resin else 0 end) order by s.ord) from jsonb_array_elements_text(k->'scent') with ordinality s(id, ord)), '[]'::jsonb)
    || case when k->'scent' ? 'resin' then '[]'::jsonb else jsonb_build_array(jsonb_build_array('resin', resin)) end;
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(out_) with ordinality e(v, ord) where (e.v->>1)::double precision > 0), '[]'::jsonb);
end;
$function$
;
-- </town.fell_most(jsonb,jsonb)>
revoke all on function town.gem_stamina(jsonb),town.dark_soil(jsonb,jsonb,bigint),town.rod_fx(jsonb),town.hoe_fx(jsonb),town.can_fx(jsonb),town.net_fx(jsonb),town.cook_fx(jsonb),town.vein_mods(jsonb,boolean),town.axe_ahead(jsonb),town.mine_pay_v205(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text),town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.tend_with(text,text,jsonb,jsonb,jsonb,jsonb,jsonb,bigint),town.fell_most(jsonb,jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('water_saving',town.cat('forge')->'old'->'water'->'stamina'->1='0.35'::jsonb,
 'earth_saving',town.cat('forge')->'old'->'earth'->'stamina'->1='0.5'::jsonb,
 'soil_private',not has_function_privilege('authenticated','town.dark_soil(jsonb,jsonb,bigint)','EXECUTE'),
 'saving_private',not has_function_privilege('authenticated','town.gem_stamina(jsonb)','EXECUTE')) as v216_verified;
