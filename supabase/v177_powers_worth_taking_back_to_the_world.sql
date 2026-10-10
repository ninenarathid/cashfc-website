-- v177: stronger milestones and powers worth taking back into the world.
-- Run after v176 and the matching site deploy. Safe to run twice. No inventories or coins are reset.
-- Guards ignore only Windows CR line endings. Each existing function is its own definition with marked edits.
begin;
do $guard$ begin
  if not coalesce((town.cat('forge')->'fire'->>'daily')::boolean, false) then raise exception 'Run v175 first'; end if;
  if md5(replace(pg_get_functiondef('town.tool_mods(jsonb)'::regprocedure), chr(13), '')) not in ('2552f7340eef02d0e8e1dd6f71327561','4d524230a1db0c780e0504066ed70870') then raise exception 'Definition changed: town.tool_mods(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.fx_n(jsonb,jsonb,text,text,double precision)'::regprocedure), chr(13), '')) not in ('2fc016ceea135c8d5de508a80eaaff84','bab09b8818125015f4a6d020ea8823f3') then raise exception 'Definition changed: town.fx_n(jsonb,jsonb,text,text,double precision); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.use_power(jsonb,jsonb,text,bigint)'::regprocedure), chr(13), '')) not in ('e69150e807ffb613c37a8637efe0857b','b1b3eb5380a5ef492ab3293167bc6a08') then raise exception 'Definition changed: town.use_power(jsonb,jsonb,text,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.may_power(jsonb,jsonb,text,bigint)'::regprocedure), chr(13), '')) not in ('b1382bc705ceb47ea0fc5b790a4d5e22','7551b7c82074930a1b03defeb09e22ca') then raise exception 'Definition changed: town.may_power(jsonb,jsonb,text,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'::regprocedure), chr(13), '')) not in ('62f1ee92d537febc4870612dae75fd76','93d960c38fe65e521b6d174e3bca06b2') then raise exception 'Definition changed: town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.mine_swings(jsonb,integer,boolean,boolean,double precision)'::regprocedure), chr(13), '')) not in ('2dbde1439d6eeaf3714898fff920321f','2919a1313a63693182fb2ee4f647bb99') then raise exception 'Definition changed: town.mine_swings(jsonb,integer,boolean,boolean,double precision); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.vein_mods(jsonb,boolean)'::regprocedure), chr(13), '')) not in ('163f104a586c59f33c68483b6d7f5d75','ac475f002eedef6805d60e03008f80fa') then raise exception 'Definition changed: town.vein_mods(jsonb,boolean); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.axe_chops(jsonb,double precision)'::regprocedure), chr(13), '')) not in ('88eda47858ddb942959a565ea3051e05','9cc30665d3f439d5ec8f70792949c5e6') then raise exception 'Definition changed: town.axe_chops(jsonb,double precision); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.axe_ahead(jsonb)'::regprocedure), chr(13), '')) not in ('8e93b8a63ad11f4b3de6611643493f1a','cfd61f3bd1b98666baa3fff2019bac36') then raise exception 'Definition changed: town.axe_ahead(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.fell_most(jsonb,jsonb)'::regprocedure), chr(13), '')) not in ('343b0c870df43679ad02c7b0bed44035','0a0edb61d3eaf82be3c8d9a79ab0b5b2') then raise exception 'Definition changed: town.fell_most(jsonb,jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'::regprocedure), chr(13), '')) not in ('070e52a0aee06a85da6f605e526ecb1a','437e9721b0731a89faca53af0ca7c179') then raise exception 'Definition changed: town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.can_holds(jsonb)'::regprocedure), chr(13), '')) not in ('42f9df558ca36a56dfcc4ff76e39d47a','bcd26d52ff6fb9b9db35db210b1cd8d1') then raise exception 'Definition changed: town.can_holds(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.rod_fx(jsonb)'::regprocedure), chr(13), '')) not in ('d7c3613c85dde3a19796faae51e9868e','531532d52a36b69770707e021399703c') then raise exception 'Definition changed: town.rod_fx(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.hoe_fx(jsonb)'::regprocedure), chr(13), '')) not in ('e9435642222413791b51e9175e119713','25b4314973c8544c21b15f295361fe11') then raise exception 'Definition changed: town.hoe_fx(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.can_fx(jsonb)'::regprocedure), chr(13), '')) not in ('713548e74cea8e9b65b8720a83b4128c','cb968197d0ff0bf094ad213fee973d12') then raise exception 'Definition changed: town.can_fx(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.smith_dry(jsonb)'::regprocedure), chr(13), '')) not in ('19cd9aea3518583025e635f1f095e89c','75a5650ea257b4dbf1e7d8e27dd4c39d') then raise exception 'Definition changed: town.smith_dry(jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text)'::regprocedure), chr(13), '')) not in ('e42bdaab8dca5da6bf8bf3d8fd21c1f4','30c97869e73f3d7991db272664e96a3e') then raise exception 'Definition changed: town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.vein_end(jsonb,jsonb,bigint)'::regprocedure), chr(13), '')) not in ('49a15bf4ce9c270a8d6114ef1aef40f4','30b5185af22470749daba4ba3803910f') then raise exception 'Definition changed: town.vein_end(jsonb,jsonb,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.fell_root(jsonb,jsonb,text,integer,bigint)'::regprocedure), chr(13), '')) not in ('f5b544bdd2974a4213f423cada65b109','5115401f35dc97cc24953a17b03dfbbb') then raise exception 'Definition changed: town.fell_root(jsonb,jsonb,text,integer,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.grown(jsonb,bigint)'::regprocedure), chr(13), '')) not in ('3e101f6a6bbe074d43e8c3a65dcaf000','34553dd788a9219297362f5bcc17ce58') then raise exception 'Definition changed: town.grown(jsonb,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.sow_damp(jsonb,bigint)'::regprocedure), chr(13), '')) not in ('8b1aed092eb6db1b1a158bc3b2deb9dd','f8f71b5b1ee9bd96f7122f8b628998ce') then raise exception 'Definition changed: town.sow_damp(jsonb,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.see(text,jsonb,bigint)'::regprocedure), chr(13), '')) not in ('388f7794157fb9db97bda1f629045cd0','dae24c962734ed800c31020602ed32ff') then raise exception 'Definition changed: town.see(text,jsonb,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.water_with(text,jsonb,jsonb,text,bigint,jsonb)'::regprocedure), chr(13), '')) not in ('e7dbe48d42125bc9d47b31f13719d9ab','787533d1dc23fce7bb718cf1488237d6') then raise exception 'Definition changed: town.water_with(text,jsonb,jsonb,text,bigint,jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.beside(text,jsonb,jsonb,text,jsonb,jsonb,text,bigint,text,double precision)'::regprocedure), chr(13), '')) not in ('1a82df183d78110ebbef1d588f7776ab','b646f56532477a00892e18b56965568d') then raise exception 'Definition changed: town.beside(text,jsonb,jsonb,text,jsonb,jsonb,text,bigint,text,double precision); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town_tend(integer,integer,jsonb,boolean)'::regprocedure), chr(13), '')) not in ('b9c5753b7d9f9fc6ade2397bce8953d7','b3d4d539b916716ca3dc502f0fed5e19') then raise exception 'Definition changed: town_tend(integer,integer,jsonb,boolean); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)'::regprocedure), chr(13), '')) not in ('3b6099fc1f58bbb01f446ed301e67a81','a40ecc0d74c70e720ab1881dae5a5563') then raise exception 'Definition changed: town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure), chr(13), '')) not in ('6e02bd0b788d483596b726bcb2d3b15d','434b2a06a06be811fc65d6d3c173aac6') then raise exception 'Definition changed: town.cook(jsonb,jsonb,jsonb,double precision,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure), chr(13), '')) not in ('872ee5414f18fefd71802baa06c66532','151e1206ec15cf3d4e8c414962f9e6d5') then raise exception 'Definition changed: town.work_counts_of(jsonb,text); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.cave_told_of(jsonb,jsonb,text,integer,integer,integer,bigint,text,jsonb,jsonb)'::regprocedure), chr(13), '')) not in ('57e77056e87384be337924ae2daa17b7','fcc8dc5b94de06eccfa62a8a5d2e5395') then raise exception 'Definition changed: town.cave_told_of(jsonb,jsonb,text,integer,integer,integer,bigint,text,jsonb,jsonb); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text)'::regprocedure), chr(13), '')) not in ('c97a095d6530b5c75c24d23bd03f87d6','476d92c8eae422025616b36e8f8525e5') then raise exception 'Definition changed: town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)'::regprocedure), chr(13), '')) not in ('7e36be1fad1c61cccec789b50b40e4a0','75fb8a22c5f9761e47b902c338408fca') then raise exception 'Definition changed: town.net_mine(jsonb,text,text,integer,integer,double precision,bigint); rebuild v177 on current text'; end if;
  if md5(replace(pg_get_functiondef('town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)'::regprocedure), chr(13), '')) not in ('71eae64ec5599d52e7e6852a88fae61d','b2e1b5536be3f45e4fba776ac08f43b0') then raise exception 'Definition changed: town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint); rebuild v177 on current text'; end if;
end $guard$;
create or replace function town.opt_n(p_id text, p_key text, p_tool jsonb)
returns double precision language sql stable set search_path = '' as $$
  select coalesce(case when m->>'strong' = p_id then (f->'options'->'of'->p_id->'six'->'n'->>p_key)::double precision end,
    (f->'options'->'of'->p_id->'n'->>p_key)::double precision, 0)
    from (select town.cat('forge') f, town.tool_mods(p_tool) m) q
$$;
create or replace function town.net_more_far(p_purse jsonb, p_now bigint)
returns double precision language sql stable set search_path = '' as $$
  select (fx->>'reach')::double precision + case when (fx->>'wide')::double precision > 0 and coalesce((p_purse->'netSweep'->>'until')::numeric > p_now and (p_purse->'netSweep'->>'left')::numeric > 0, false) then (fx->>'wide')::double precision else 0 end
    from (select town.net_fx(town.hand_stack(p_purse)) fx) s
$$;
create or replace function town.sweep_caught(p_purse jsonb, p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
  select case when (town.net_fx(town.hand_stack(p_purse))->>'wide')::double precision > 0 and coalesce((p_purse->'netSweep'->>'until')::numeric > p_now and (p_purse->'netSweep'->>'left')::numeric > 0, false)
    then jsonb_set(p_purse, '{netSweep,left}', to_jsonb((p_purse->'netSweep'->>'left')::numeric - 1)) else p_purse end
$$;
revoke all on function town.net_more_far(jsonb,bigint), town.sweep_caught(jsonb,bigint) from public, anon, authenticated;
create or replace function town.power_rule(p_id text, p_tool jsonb)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(case when m->>'strong' = p_id then f->'options'->'of'->p_id->'six'->'use' end,
    f->'options'->'of'->p_id->'use') from (select town.cat('forge') f, town.tool_mods(p_tool) m) q
$$;
create or replace function town.power_left(p_purse jsonb, p_id text, p_now bigint, p_tool jsonb)
returns integer language sql stable set search_path = '' as $$
  select greatest(0, coalesce((town.power_rule(p_id, p_tool)->>'n')::integer, 0) - town.power_used(p_purse, p_id, p_now))
$$;
create or replace function town.bed_keys(p_x integer, p_y integer)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce((select jsonb_agg(((b.at->>0)::int + i)::text || ',' || ((b.at->>1)::int + j)::text order by j,i)
    from (select town.cat('farming') f) c, jsonb_array_elements(c.f->'bedsAt') with ordinality b(at, ord),
      generate_series(0, (c.f->>'side')::int - 1) i, generate_series(0, (c.f->>'side')::int - 1) j
    where b.ord - 1 = town.bed_of(p_x, p_y)), '[]'::jsonb)
$$;
revoke all on function town.opt_n(text,text,jsonb), town.power_rule(text,jsonb), town.power_left(jsonb,text,bigint,jsonb), town.bed_keys(integer,integer) from public, anon, authenticated;

update public.town_catalog set data = jsonb_set(data, '{options,of}', $town${"pkPeek":{"pool":1,"tools":["pick"],"n":{},"six":{"n":{"strikes":2}}},"pkCrumb":{"pool":1,"tools":["pick"],"n":{"every":5,"more":1},"six":{"n":{"every":3,"more":2}}},"pkSteady":{"pool":1,"tools":["pick"],"n":{"strikes":2},"six":{"n":{"strikes":4}}},"pkLoose":{"pool":1,"tools":["pick"],"n":{"fewer":1},"six":{"n":{"fewer":2}}},"pkFresh":{"pool":1,"tools":["pick"],"n":{},"use":{"n":10,"per":"meal"},"six":{"use":{"n":20,"per":"meal"}}},"pkCutter":{"pool":1,"tools":["pick"],"n":{"more":1},"six":{"n":{"more":2}}},"axGrain":{"pool":1,"tools":["axe"],"n":{"ahead":2},"six":{"n":{"ahead":4}}},"axDust":{"pool":1,"tools":["axe"],"n":{"every":5,"more":1},"six":{"n":{"every":3,"more":2}}},"axKeen":{"pool":1,"tools":["axe"],"n":{"chops":2},"six":{"n":{"chops":4}}},"axResin":{"pool":1,"tools":["axe"],"n":{"in":4},"six":{"n":{"in":2}}},"axFresh":{"pool":1,"tools":["axe"],"n":{},"use":{"n":5,"per":"meal"},"six":{"use":{"n":10,"per":"meal"}}},"axDry":{"pool":1,"tools":["axe"],"n":{"pieces":2},"six":{"n":{"pieces":3}}},"rdBait":{"pool":1,"tools":["rod"],"n":{},"six":{"n":{"strike":0.5}}},"rdCalm":{"pool":1,"tools":["rod"],"n":{"secs":2},"six":{"n":{"secs":4}}},"rdFresh":{"pool":1,"tools":["rod"],"n":{},"use":{"n":5,"per":"meal"},"six":{"use":{"n":10,"per":"meal"}}},"rdQuick":{"pool":1,"tools":["rod"],"n":{"shorter":0.15},"six":{"n":{"shorter":0.35}}},"hoClear":{"pool":1,"tools":["hoe"],"n":{"stones":2},"six":{"n":{"stones":4}}},"hoFirst":{"pool":1,"tools":["hoe"],"n":{"misses":1},"six":{"n":{"misses":2}}},"hoFresh":{"pool":1,"tools":["hoe"],"n":{},"use":{"n":10,"per":"meal"},"six":{"use":{"n":20,"per":"meal"}}},"hoLight":{"pool":1,"tools":["hoe"],"n":{},"six":{"n":{"band":1.3}}},"cnDrop":{"pool":1,"tools":["can"],"n":{"more":3},"six":{"n":{"more":6}}},"cnThrift":{"pool":1,"tools":["can"],"n":{"takes":1},"six":{"n":{"takes":1,"more":6}}},"cnFresh":{"pool":1,"tools":["can"],"n":{},"use":{"n":10,"per":"meal"},"six":{"use":{"n":20,"per":"meal"}}},"cnKind":{"pool":1,"tools":["can"],"n":{"points":1},"six":{"n":{"points":2}}},"ntAgain":{"pool":1,"tools":["bugNet"],"n":{"by":0.5},"six":{"n":{"by":0.25}}},"ntMesh":{"pool":1,"tools":["bugNet"],"n":{"misses":2},"six":{"n":{"misses":4}}},"ntFresh":{"pool":1,"tools":["bugNet"],"n":{},"use":{"n":10,"per":"meal"},"six":{"use":{"n":20,"per":"meal"}}},"ntLong":{"pool":1,"tools":["bugNet"],"n":{"reach":1},"six":{"n":{"reach":2}}},"ckFire":{"pool":1,"tools":["pot","pan","grill"],"n":{"steady":2},"six":{"n":{"steady":4}}},"ckBase":{"pool":1,"tools":["pot","pan","grill"],"n":{"misses":1},"six":{"n":{"misses":2}}},"ckFresh":{"pool":1,"tools":["pot","pan","grill"],"n":{},"use":{"n":3,"per":"meal"},"six":{"use":{"n":6,"per":"meal"}}},"ckBrisk":{"pool":1,"tools":["pot","pan","grill"],"n":{"shorter":0.25},"six":{"n":{"shorter":0.4}}},"pkQuake":{"pool":2,"tools":["pick"],"n":{"reach":2},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"tools":["pick"],"n":{"times":2},"use":{"n":10,"per":"day"}},"pkDrill":{"pool":2,"tools":["pick"],"n":{},"use":{"n":10,"per":"day"}},"pkGleam":{"pool":2,"tools":["pick"],"n":{"by":1.5}},"axOne":{"pool":2,"tools":["axe"],"n":{},"use":{"n":30,"per":"day"}},"axDouble":{"pool":2,"tools":["axe"],"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"tools":["axe"],"n":{"reach":3,"trees":5},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"tools":["axe"],"n":{"by":1.5}},"rdGold":{"pool":2,"tools":["rod"],"n":{"secs":5},"use":{"n":30,"per":"day"}},"rdStill":{"pool":2,"tools":["rod"],"n":{"by":0.35,"mins":30},"use":{"n":2,"per":"day"}},"rdCall":{"pool":2,"tools":["rod"],"n":{},"use":{"n":500,"per":"day"}},"hoBoth":{"pool":2,"tools":["hoe"],"n":{"plots":5},"use":{"n":10,"per":"day"}},"hoGrip":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":20,"per":"day"}},"hoWet":{"pool":2,"tools":["hoe"],"n":{},"use":{"n":10,"per":"day"}},"cnRain":{"pool":2,"tools":["can"],"n":{},"use":{"n":3,"per":"day"}},"cnFull":{"pool":2,"tools":["can"],"n":{"mins":360},"use":{"n":1,"per":"day"}},"cnTwice":{"pool":2,"tools":["can"],"n":{},"use":{"n":10,"per":"day"}},"ntWide":{"pool":2,"tools":["bugNet"],"n":{"reach":5,"catches":5},"use":{"n":20,"per":"day"}},"ntFreeze":{"pool":2,"tools":["bugNet"],"n":{"secs":10},"use":{"n":20,"per":"day"}},"ntNest":{"pool":2,"tools":["bugNet"],"n":{}},"ckBig":{"pool":2,"tools":["pot","pan","grill"],"n":{"more":6,"batches":3},"use":{"n":3,"per":"day"}},"ckWarm":{"pool":2,"tools":["pot","pan","grill"],"n":{"hours":6},"use":{"n":3,"per":"day"}},"ckScent":{"pool":2,"tools":["pot","pan","grill"],"n":{"stamina":100},"use":{"n":3,"per":"day"}}}$town$::jsonb), updated_at = now() where key = 'forge';
update public.town_catalog set data = jsonb_set(data, '{axe,opts}', $town${"axGrain":{"pool":1,"n":{"ahead":2},"six":{"n":{"ahead":4}}},"axDust":{"pool":1,"n":{"every":5,"more":1},"six":{"n":{"every":3,"more":2}}},"axKeen":{"pool":1,"n":{"chops":2},"six":{"n":{"chops":4}}},"axResin":{"pool":1,"n":{"in":4},"six":{"n":{"in":2}}},"axFresh":{"pool":1,"n":{},"use":{"n":5,"per":"meal"},"six":{"use":{"n":10,"per":"meal"}}},"axDry":{"pool":1,"n":{"pieces":2},"six":{"n":{"pieces":3}}},"axOne":{"pool":2,"n":{},"use":{"n":30,"per":"day"}},"axDouble":{"pool":2,"n":{"by":2},"use":{"n":10,"per":"day"}},"axRoot":{"pool":2,"n":{"reach":3,"trees":5},"use":{"n":3,"per":"day"}},"axElder":{"pool":2,"n":{"by":1.5}}}$town$::jsonb), updated_at = now() where key = 'trees';
update public.town_catalog set data = jsonb_set(data, '{pick,opts}', $town${"pkPeek":{"pool":1,"n":{},"six":{"n":{"strikes":2}}},"pkCrumb":{"pool":1,"n":{"every":5,"more":1},"six":{"n":{"every":3,"more":2}}},"pkSteady":{"pool":1,"n":{"strikes":2},"six":{"n":{"strikes":4}}},"pkLoose":{"pool":1,"n":{"fewer":1},"six":{"n":{"fewer":2}}},"pkFresh":{"pool":1,"n":{},"use":{"n":10,"per":"meal"},"six":{"use":{"n":20,"per":"meal"}}},"pkCutter":{"pool":1,"n":{"more":1},"six":{"n":{"more":2}}},"pkQuake":{"pool":2,"n":{"reach":2},"use":{"n":10,"per":"day"}},"pkTwin":{"pool":2,"n":{"times":2},"use":{"n":10,"per":"day"}},"pkDrill":{"pool":2,"n":{},"use":{"n":10,"per":"day"}},"pkGleam":{"pool":2,"n":{"by":1.5}}}$town$::jsonb), updated_at = now() where key = 'mining';
-- <town.tool_mods(jsonb)>
create or replace function town.tool_mods(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('forge');
  kind_ text := town.tool_kind(p_stack->>'item');
  level_ integer;
  carried jsonb;
  drawn jsonb;
  away_ boolean;
  works integer;
  gems_ jsonb := '{}'::jsonb;
  e text;
begin
  if p_stack is null or kind_ is null then
    return jsonb_build_object('kind', null, 'level', 0, 'opts', '[]'::jsonb, 'asleep', '[]'::jsonb, 'strong', null, 'gems', '{}'::jsonb, 'glow', 0);
  end if;
  level_ := town.tool_level(p_stack);
  carried := town.tool_carried(p_stack);
  drawn := coalesce((select jsonb_agg(o.v order by o.ord) from jsonb_array_elements(carried->'opts') with ordinality o(v, ord) where o.v <> 'null'::jsonb), '[]'::jsonb);
  away_ := not town.same_pool(carried->>'origin', kind_);
  works := least((k->>'gemLevels')::integer, 1 + case when level_ >= (k->'forge'->>'top')::integer then (k->'forge'->>'gemAtTop')::integer else 0 end);
  for e in select g.id from jsonb_array_elements_text(town.tool_gems(p_stack)) g(id) loop
    gems_ := gems_ || jsonb_build_object(e, works);
  end loop;
  return jsonb_build_object('kind', kind_, 'level', level_,
    'opts', case when away_ then '[]'::jsonb else drawn end, 'asleep', case when away_ then drawn else '[]'::jsonb end, 'strong', case when not away_ then carried->'opts'->1 else 'null'::jsonb end, 'gems', gems_,
    'glow', case when level_ >= (k->'forge'->'glow'->>'full')::integer then 2 when level_ >= (k->'forge'->'glow'->>'from')::integer then 1 else 0 end);
end;
$$;
-- </town.tool_mods(jsonb)>

-- <town.fx_n(jsonb,jsonb,text,text,double precision)>
create or replace function town.fx_n(p_forge jsonb, p_mods jsonb, p_opt text, p_key text, p_else double precision DEFAULT 0)
 RETURNS double precision
 LANGUAGE sql
 IMMUTABLE
AS $$
-- v177: stronger milestones and distinct powers.
 select case when p_mods->'opts' ? p_opt then coalesce(case when p_mods->>'strong' = p_opt then (p_forge->'options'->'of'->p_opt->'six'->'n'->>p_key)::double precision end, (p_forge->'options'->'of'->p_opt->'n'->>p_key)::double precision, 0) else p_else end $$;
-- </town.fx_n(jsonb,jsonb,text,text,double precision)>

-- <town.use_power(jsonb,jsonb,text,bigint)>
create or replace function town.use_power(p_purse jsonb, p_tool jsonb, p_id text, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  rule jsonb := town.power_rule(p_id, p_tool);
  kept jsonb := case when jsonb_typeof(p_purse->'powers') = 'object' then p_purse->'powers' else '{}'::jsonb end;
  used_ integer;
begin
  if rule is null or not town.tool_has(p_tool, p_id) then return town.no('none'); end if;
  used_ := town.power_used(p_purse, p_id, p_now);
  if used_ >= (rule->>'n')::integer then return town.no('spent'); end if;
  return jsonb_build_object('ok', true, 'left', (rule->>'n')::integer - used_ - 1,
    'purse', p_purse || jsonb_build_object('powers', kept || jsonb_build_object(p_id, jsonb_build_object('k', town.stretch_at(rule, p_now), 'n', used_ + 1))) || case when p_id = 'ntWide' then jsonb_build_object('netSweep', jsonb_build_object('until', p_now + 10000, 'left', town.opt_n('ntWide', 'catches', p_tool))) else '{}'::jsonb end);
end;
$$;
-- </town.use_power(jsonb,jsonb,text,bigint)>

-- <town.may_power(jsonb,jsonb,text,bigint)>
create or replace function town.may_power(p_purse jsonb, p_tool jsonb, p_id text, p_now bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.
 select town.tool_has(p_tool, p_id) and town.power_left(p_purse, p_id, p_now, p_tool) > 0 $$;
-- </town.may_power(jsonb,jsonb,text,bigint)>

-- <town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>
create or replace function town.mine_pay(p_purse jsonb, p_go jsonb, p_rock jsonb, p_struck jsonb, p_quake boolean, p_own boolean, p_word text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
$$;
-- </town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)>

-- <town.mine_swings(jsonb,integer,boolean,boolean,double precision)>
create or replace function town.mine_swings(p_pick jsonb, p_floor integer, p_spent boolean, p_loose boolean, p_points double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select greatest(1::double precision, town.mine_pick_swings(p_pick, town.mine_hardness(p_floor, p_points)) * case when p_spent then (town.cat('mining')->>'tired')::double precision else 1 end
    - case when p_loose then town.opt_n('pkLoose', 'fewer', p_pick) else 0 end)::integer
$$;
-- </town.mine_swings(jsonb,integer,boolean,boolean,double precision)>

-- <town.vein_mods(jsonb,boolean)>
create or replace function town.vein_mods(p_pick jsonb, p_spent boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select jsonb_build_object(
    'strikes', greatest(1::double precision, (k.m->'pick'->'strikes'->>town.tool_level(p_pick))::double precision
      + case when town.tool_has(p_pick, 'pkSteady') then town.opt_n('pkSteady', 'strikes', p_pick) else 0 end
      + case when town.tool_has(p_pick, 'pkPeek') then town.opt_n('pkPeek', 'strikes', p_pick) else 0 end
      - case when p_spent then (k.m->'vein'->'tired'->>'fewer')::double precision else 0 end),
    'back', town.gem_by(p_pick, 'water', k.m->'pick'->'gems'->'water'->'back'),
    'cross', town.gem_by(p_pick, 'ice', k.m->'pick'->'gems'->'ice'->'cross'), 'spent', coalesce(p_spent, false))
    from (select town.cat('mining') as m) k
$$;
-- </town.vein_mods(jsonb,boolean)>

-- <town.axe_chops(jsonb,double precision)>
create or replace function town.axe_chops(p_axe jsonb, p_base double precision)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select greatest(1::double precision, ceil(ceil(
      ((c.a->'chops'->>town.tool_level(p_axe))::double precision * p_base) / (c.a->'chops'->>0)::double precision
      - case when town.tool_has(p_axe, 'axKeen') then town.opt_n('axKeen', 'chops', p_axe) else 0 end)
    * (1::double precision - town.gem_by(p_axe, 'fire', c.a->'gems'->'fire'->'fewer'))))::integer
    from (select town.cat('trees')->'axe' as a) c
$$;
-- </town.axe_chops(jsonb,double precision)>

-- <town.axe_ahead(jsonb)>
create or replace function town.axe_ahead(p_axe jsonb)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select (town.cat('trees')->'axe'->'ahead'->>town.tool_level(p_axe))::double precision
    + case when town.tool_has(p_axe, 'axGrain') then town.opt_n('axGrain', 'ahead', p_axe) else 0 end
$$;
-- </town.axe_ahead(jsonb)>

-- <town.fell_most(jsonb,jsonb)>
create or replace function town.fell_most(p_axe jsonb, p_trees jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
    timber := timber + town.tree_most(t) * twice;
    if scented then scent := scent + 1; end if;
  end loop;
  out_ := jsonb_build_array(jsonb_build_array('log', logs), jsonb_build_array('timber', timber))
    || coalesce((select jsonb_agg(jsonb_build_array(s.id, scent + case when s.id = 'resin' then resin else 0 end) order by s.ord) from jsonb_array_elements_text(k->'scent') with ordinality s(id, ord)), '[]'::jsonb)
    || case when k->'scent' ? 'resin' then '[]'::jsonb else jsonb_build_array(jsonb_build_array('resin', resin)) end;
  return coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(out_) with ordinality e(v, ord) where (e.v->>1)::double precision > 0), '[]'::jsonb);
end;
$$;
-- </town.fell_most(jsonb,jsonb)>

-- <town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>
create or replace function town.fell(p_purse jsonb, p_grove jsonb, p_me text, p_went jsonb, p_x integer, p_y integer, p_now bigint, p_luck jsonb, p_who text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
begin
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
    felled := felled || jsonb_build_array(jsonb_build_object('id', id_, 'kind', town.tree_kind(t), 'girth', town.tree_girth(t), 'misses', misses, 'got', got_,
      'timber', timber, 'most', town.tree_most(t), 'chained', chained, 'free', free_, 'twice', twice_)
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
$$;
-- </town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)>

-- <town.can_holds(jsonb)>
create or replace function town.can_holds(p_stack jsonb)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select case when coalesce(c.cans ? (p_stack->>'item'), false) then (c.cans->>(p_stack->>'item'))::double precision
      + case when town.tool_kind(p_stack->>'item') = 'can' then
          (f.k->'levels'->'can'->'waterings'->>town.tool_level(p_stack))::double precision - (f.k->'levels'->'can'->'waterings'->>0)::double precision
          + town.gem_by(p_stack, 'fire', f.k->'old'->'fire'->'can'->'more')
          + case when town.tool_has(p_stack, 'cnDrop') then town.opt_n('cnDrop', 'more', p_stack) else 0 end
          + case when town.tool_has(p_stack, 'cnThrift') then town.opt_n('cnThrift', 'more', p_stack) else 0 end
        else 0 end
    else 0 end
    from (select town.cat('forge') as k) f, (select town.cat('farming')->'cans' as cans) c
$$;
-- </town.can_holds(jsonb)>

-- <town.rod_fx(jsonb)>
create or replace function town.rod_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
    'band', (lv->'band'->>l)::double precision,
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
$$;
-- </town.rod_fx(jsonb)>

-- <town.hoe_fx(jsonb)>
create or replace function town.hoe_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
    'stones', town.fx_n(k, m, 'hoClear', 'stones'),
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
$$;
-- </town.hoe_fx(jsonb)>

-- <town.can_fx(jsonb)>
create or replace function town.can_fx(p_stack jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
    'marks', (lv->'marks'->>l)::double precision,
    'pace', 1::double precision - town.fx_gem(m, 'ice', o->'ice'->'slow'),
    'spared', town.fx_gem(m, 'water', o->'water'->'spared'),
    'takes', case when m->'opts' ? 'cnThrift' then to_jsonb(town.fx_n(k, m, 'cnThrift', 'takes')) else 'null'::jsonb end,
    'stamina', town.fx_gem(m, 'earth', o->'earth'->'stamina'),
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
$$;
-- </town.can_fx(jsonb)>

-- <town.smith_dry(jsonb)>
create or replace function town.smith_dry(p_bag jsonb)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select greatest(1, coalesce((select max(town.opt_n('axDry', 'pieces', s))::integer from jsonb_array_elements(p_bag) s where town.tool_has(s, 'axDry')), 1))
$$;
-- </town.smith_dry(jsonb)>

-- <town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text)>
create or replace function town.fell_begin(p_purse jsonb, p_grove jsonb, p_tree integer, p_x integer, p_y integer, p_now bigint, p_seed bigint, p_me text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  axe jsonb := town.axe_of(p_purse);
  refused text;
  grp jsonb;
  trunk jsonb;
  knobs jsonb;
  spent_ boolean;
begin
  if t is null then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if coalesce(town.tree_far(t, p_x, p_y) > (k->>'reach')::integer, true) then return town.no('far'); end if;
  refused := town.axe_bites(axe, t);
  if refused is not null then return town.no(refused); end if;
  if town.tree_held(p_grove, p_tree, p_now, p_me) then return town.no('held'); end if;
  if not town.tree_grown(p_grove, t, p_now) then return town.no('stump'); end if;
  grp := town.fell_group(p_purse, p_grove, t, axe, p_now, p_me);
  if town.stow_all(p_purse, town.fell_most(axe, grp)) is null then return town.no('full'); end if;
  trunk := town.fell_trunk(axe, p_grove, grp);
  knobs := town.tree_knobs(trunk->'t');
  spent_ := town.stamina_of(p_purse, p_now) <= 0;
  return jsonb_build_object('ok', true,
    'trees', (select jsonb_agg((g.v->>0)::integer order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
    'elder', town.tree_elder(t),
    'ask', jsonb_build_object(
      'trees', (select jsonb_agg(jsonb_build_object('id', (g.v->>0)::integer, 'girth', town.tree_girth(g.v), 'timber', town.tree_bears(g.v)) order by g.ord) from jsonb_array_elements(grp) with ordinality g(v, ord)),
      'chops', (trunk->>'chops')::integer, 'seed', town.fell_seed(p_seed, p_tree), 'girth', town.tree_girth(trunk->'t'), 'family', knobs->'family',
      'ahead', case when town.tree_elder(t) and town.tool_has(axe, 'axElder') then (town.cat('mining')->>'all')::double precision else town.axe_ahead(axe) end,
      'pace', town.axe_pace(axe) * case when spent_ then (knobs->>'spent')::double precision else (knobs->>'pace')::double precision end,
      'spared', town.gem_by(axe, 'water', k->'axe'->'gems'->'water'->'spared') + case when town.gift_works(p_purse, 'famWoodpecker') then (k->>'pecks')::double precision else 0 end,
      'spent', spent_));
end;
$$;
-- </town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text)>

-- <town.vein_end(jsonb,jsonb,bigint)>
create or replace function town.vein_end(p_purse jsonb, p_go jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  v jsonb := town.cat('mining')->'vein';
  kept jsonb := town.mine_of(p_purse);
  vein_ jsonb := kept->'vein';
  twice boolean;
  how text;
  chip text;
  ore numeric;
  shards numeric;
  cut numeric;
  chips numeric;
  got_ jsonb := '[]'::jsonb;
  stowed jsonb;
  pick jsonb;
  twin jsonb;
  after_ jsonb;
begin
  if vein_ = 'null'::jsonb then return town.no('none'); end if;
  twice := coalesce((vein_->>'again')::boolean, false);
  -- (an account of another vein than the one that is open, or of its other go: nothing is done with it)
  if p_go is null or jsonb_typeof(p_go) <> 'object' or jsonb_typeof(p_go->'seed') is distinct from 'number' then return town.no('none'); end if;
  if (p_go->>'seed')::numeric <> (vein_->>'seed')::numeric or town.mine_yes(p_go->'again') <> twice then return town.no('none'); end if;
  how := town.vein_odd(vein_, p_go);
  if how is not null then
    return jsonb_build_object('ok', false, 'why', 'odd', 'how', how, 'purse', p_purse || jsonb_build_object('mine', kept || jsonb_build_object('vein', null)));
  end if;
  chip := case when vein_->'gem' <> 'null'::jsonb then town.cat('forge')->'gems'->(vein_->>'gem')->>'chip' end;
  ore := (p_go->>'ore')::numeric;
  shards := ore * (v->>'ore')::numeric;
  cut := coalesce((select sum(g.n::numeric) from jsonb_array_elements_text(p_go->'gems') g(n)), 0);
  chips := case when cut > 0 then cut + greatest(0, (vein_->>'more')::numeric) else 0 end;
  if shards > 0 then got_ := got_ || jsonb_build_array(jsonb_build_array(town.mine_ore((vein_->>'f')::integer), shards)); end if;
  if chips > 0 and chip is not null then got_ := got_ || jsonb_build_array(jsonb_build_array(chip, chips)); end if;
  pick := town.mine_pick(p_purse);
  twin := case when jsonb_array_length(got_) > 0 and not twice and pick is not null then town.use_power(p_purse, pick, 'pkTwin', p_now) end;
  if coalesce((twin->>'ok')::boolean, false) then
    select jsonb_agg(jsonb_build_array(g.v->>0, (g.v->>1)::numeric * town.opt_n('pkTwin', 'times', pick)) order by g.ord) into got_
      from jsonb_array_elements(got_) with ordinality g(v, ord);
  end if;
  stowed := town.stow_all(case when coalesce((twin->>'ok')::boolean, false) then twin->'purse' else p_purse end, got_);
  if stowed is null then return town.no('full'); end if;
  after_ := stowed;
  return jsonb_build_object('ok', true, 'got', got_, 'passed', ore + jsonb_array_length(p_go->'gems'), 'of', p_go->'of', 'struck', p_go->'struck',
    'again', false, 'vein', vein_,
    'purse', after_ || jsonb_build_object('mine', town.mine_of(after_) || jsonb_build_object('vein',
      'null'::jsonb)));
end;
$$;
-- </town.vein_end(jsonb,jsonb,bigint)>

-- <town.fell_root(jsonb,jsonb,text,integer,bigint)>
create or replace function town.fell_root(p_purse jsonb, p_grove jsonb, p_me text, p_tree integer, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  k jsonb := town.cat('trees');
  t jsonb := town.tree_of(p_tree);
  f jsonb := p_grove->'down'->(p_tree::text);
  axe jsonb := town.axe_of(p_purse);
  used jsonb;
  ids text[];
begin
  if t is null or town.tree_elder(t) then return town.no('none'); end if;
  if axe is null then return town.no('tool'); end if;
  if f is null or f->>'by' is distinct from p_me or p_now - (f->>'at')::numeric::bigint > (k->'root'->>'within')::bigint * 1000
     or p_now >= town.tree_until(false, (f->>'at')::numeric::bigint) then return town.no('none'); end if;
  used := town.use_power(p_purse, axe, 'axRoot', p_now);
  if not (used->>'ok')::boolean then return town.no(used->>'why'); end if;
  select array_agg(q.id) into ids from (
    select e.key id from jsonb_each(p_grove->'down') e
      join lateral (select town.tree_of(e.key::integer) as tr) r on r.tr is not null
     where not town.tree_elder(r.tr) and e.value->>'by' = p_me
       and p_now - (e.value->>'at')::numeric <= (k->'root'->>'within')::numeric * 1000
       and p_now < town.tree_until(false, (e.value->>'at')::numeric::bigint)
       and greatest(abs((r.tr->>1)::integer - (t->>1)::integer), abs((r.tr->>2)::integer - (t->>2)::integer)) <= town.opt_n('axRoot', 'reach', axe)
     order by case when e.key = p_tree::text then 0 else 1 end,
       abs((r.tr->>1)::integer - (t->>1)::integer) + abs((r.tr->>2)::integer - (t->>2)::integer), e.key::integer
     limit town.opt_n('axRoot', 'trees', axe)::integer
  ) q;
  return jsonb_build_object('ok', true, 'purse', used->'purse', 'left', (used->>'left')::integer,
    'grove', p_grove || jsonb_build_object('down', (p_grove->'down') - coalesce(ids, array[p_tree::text])));
end;
$$;
-- </town.fell_root(jsonb,jsonb,text,integer,bigint)>

-- <town.grown(jsonb,bigint)>
create or replace function town.grown(p_plant jsonb, p_now bigint)
 RETURNS double precision
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select ((greatest(0, p_now - p.sown))::double precision
      + (case when p.fed <> 0
           then (greatest(0, p_now - greatest(p.fed, p.sown)))::double precision * ((town.cat('farming')->>'feed')::double precision - 1::double precision)
           else 0::double precision end)
      + p.boost
      + (case when p_plant->'moist' = 'true'::jsonb then greatest(0, p_now - p.sown)::double precision else town.wet_ms(p.sown, p_now)::double precision end) * (w.f->>'adds')::double precision / (w.f->>'every')::double precision
      + town.quick_ms(p_plant, p.sown, p_now)) / 3600000::double precision
    from (select (p_plant->>'sown')::bigint as sown, (p_plant->>'fed')::bigint as fed, (p_plant->>'boost')::double precision as boost) p,
         (select town.cat('farming')->'water' as f) w
$$;
-- </town.grown(jsonb,bigint)>

-- <town.sow_damp(jsonb,bigint)>
create or replace function town.sow_damp(p_plant jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

  select p_plant || jsonb_build_object('boost', (p_plant->>'boost')::double precision + (town.cat('farming')->'water'->>'adds')::double precision * 60000::double precision, 'watered', p_now, 'moist', true)
$$;
-- </town.sow_damp(jsonb,bigint)>

-- <town.see(text,jsonb,bigint)>
create or replace function town.see(p_key text, p_plot jsonb, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  p jsonb := coalesce(p_plot->'plant', 'null'::jsonb);
  f jsonb;
  struck bigint;
  kills bigint;
  ends bigint;
  dead boolean;
  g jsonb;
begin
  if p = 'null'::jsonb then
    return jsonb_build_object('soil', p_plot->'soil', 'crop', null, 'by', null, 'stage', 0, 'ripe', false, 'pest', false, 'dead', false, 'wet', false);
  end if;
  f := town.cat('farming');
  struck := town.pest_at(p_key, p, p_now);
  kills := (f->'pests'->>'kills')::bigint * 3600000;
  -- (the moment it dies of its pest: so long after it struck, not counting the time fae dust lay on it)
  ends := town.dies_at(p, struck, kills);
  dead := struck is not null and p_now > ends;
  -- (a dead plant stays as it was when it died)
  g := town.growing(p, case when dead then ends else p_now end);
  return jsonb_build_object('soil', p_plot->'soil', 'crop', p->'crop', 'by', p->'by', 'stage', g->'stage',
    'ripe', (g->>'ripe')::boolean and not dead, 'pest', struck is not null and not dead, 'dead', dead,
    'wet', coalesce(p->'moist' = 'true'::jsonb, false) or p_now - (p->>'watered')::bigint < (f->'water'->>'every')::bigint * 60000 or town.raining(p_now));
end;
$$;
-- </town.see(text,jsonb,bigint)>

-- <town.water_with(text,jsonb,jsonb,text,bigint,jsonb)>
create or replace function town.water_with(p_key text, p_purse jsonb, p_plot jsonb, p_hand text, p_now bigint, p_seen jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  f jsonb := town.cat('farming');
  p jsonb := p_plot->'plant';
  bag jsonb := p_purse->'bag';
  mine jsonb := town.hand_stack(p_purse);
  again boolean;
  wet_ integer;
  runs boolean := town.can_full_now(p_purse, p_now);
  mins double precision;
  begun jsonb;
  slot integer;
  can jsonb;
  from_ jsonb := p_purse;
  fx jsonb;
  free boolean;
  paid jsonb;
  twice jsonb;
begin
  again := (p_seen->>'wet')::boolean and coalesce(mine->>'item' = p_hand, false) and town.wet_once(p, p_now)
    and coalesce(mine->>'item' = 'can', false) and town.may_power(p_purse, mine, 'cnTwice', p_now);
  if (p_seen->>'wet')::boolean and not again then return town.no('wet'); end if;
  wet_ := town.can_slot(p_purse, p_hand, false);
  if wet_ < 0 and not runs and coalesce(mine->>'item' = p_hand, false) then
    mins := (town.can_fx(mine)->>'full')::double precision;
    if mins > 0 then begun := town.use_power(p_purse, mine, 'cnFull', p_now); end if;
  end if;
  slot := case when wet_ >= 0 then wet_ when runs or coalesce((begun->>'ok')::boolean, false) then town.hand_at(p_purse) else -1 end;
  if slot < 0 or bag->slot->>'item' is distinct from p_hand then return town.no('dry'); end if;
  can := bag->slot;
  if coalesce((begun->>'ok')::boolean, false) then from_ := (begun->'purse') || jsonb_build_object('canFull', p_now + (mins * 60000)::bigint); end if;
  fx := town.can_fx(can);
  free := town.has_buff(p_purse, p_now, 'spring') or runs or coalesce((begun->>'ok')::boolean, false);
  paid := town.spend(from_, (f->'costs'->>'water')::double precision, p_now)
    || jsonb_build_object('bag', jsonb_set(bag, array[slot::text], can || jsonb_build_object('water',
         coalesce((can->>'water')::numeric, 0) - case when free then 0 else least((can->>'water')::numeric, (fx->>'uses')::numeric) end)));
  if again or not (p_seen->>'wet')::boolean then twice := town.use_power(paid, mine, 'cnTwice', p_now); end if;
  return jsonb_build_object('ok', true,
    'plot', p_plot || jsonb_build_object('plant', p || jsonb_build_object('watered', p_now,
      'boost', (p->>'boost')::double precision + town.watering_of(p_purse, p_hand, p_now, fx) * case when coalesce((twice->>'ok')::boolean, false) and not again then 2::double precision else 1::double precision end) || case when again or coalesce((twice->>'ok')::boolean, false) then jsonb_build_object('twice', p_now) else '{}'::jsonb end),
    'purse', case when coalesce((twice->>'ok')::boolean, false) then twice->'purse' else paid end);
end;
$$;
-- </town.water_with(text,jsonb,jsonb,text,bigint,jsonb)>

-- <town.beside(text,jsonb,jsonb,text,jsonb,jsonb,text,bigint,text,double precision)>
create or replace function town.beside(p_key text, p_keys jsonb, p_plots jsonb, p_deed text, p_before jsonb, p_after jsonb, p_me text, p_now bigint, p_owner text, p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  wild jsonb := '{"soil": "wild", "plant": null}'::jsonb;
  nothing jsonb := jsonb_build_object('purse', p_after, 'plots', '{}'::jsonb);
  hoes boolean := coalesce(p_deed in ('clear', 'till'), false);
  hand_ text;
  tool jsonb;
  fx jsonb;
  x0 integer;
  chance double precision;
  rains boolean;
  both_ boolean;
  want jsonb;
  struck boolean;
  did jsonb;
  more double precision;
  rained jsonb;
  out_ jsonb := '{}'::jsonb;
  k text;
begin
  if (not hoes and p_deed is distinct from 'water') or jsonb_typeof(p_keys) is distinct from 'array' or not (p_keys ? p_key) then return nothing; end if;
  hand_ := town.hand_of(p_before);
  tool := town.hand_stack(p_before);
  if not town.forged(tool) then return nothing; end if;
  fx := case when hoes then town.hoe_fx(tool) else town.can_fx(tool) end;
  chance := (fx->>'next')::double precision;
  rains := not hoes and (fx->>'rain')::boolean and coalesce(p_owner = p_me, false) and town.may_power(p_after, tool, 'cnRain', p_now);
  both_ := hoes and coalesce(p_owner = p_me, false) and town.power_used(p_after, 'hoBoth', p_now) > town.power_used(p_before, 'hoBoth', p_now);
  if not chance > 0 and not rains and not both_ then return nothing; end if;
  x0 := split_part(p_key, ',', 1)::integer;
  select jsonb_agg(q.key_ order by q.far, q.x) into want
    from (select w.key_, abs(split_part(w.key_, ',', 1)::integer - x0) as far, split_part(w.key_, ',', 1)::integer as x
            from jsonb_array_elements_text(p_keys) as w(key_)
           where w.key_ <> p_key and (rains or split_part(w.key_, ',', 2) = split_part(p_key, ',', 2)) and town.deed_for(w.key_, coalesce(p_plots->w.key_, wild), hand_, p_me, p_now, p_owner) = p_deed) q;
  if want is null then return nothing; end if;
  struck := coalesce(p_luck, town.luck_of('next|' || p_key, p_now)) < chance;
  if hoes then
    if both_ then
      for k in select q.key_ from jsonb_array_elements_text(want) with ordinality q(key_, ord) order by q.ord limit greatest(0, town.opt_n('hoBoth', 'plots', tool)::integer - 1) loop
        out_ := out_ || jsonb_build_object(k, '{"soil":"tilled","plant":null}'::jsonb);
      end loop;
      return jsonb_build_object('purse', p_after, 'plots', out_);
    end if;
    if not struck then return nothing; end if;
    did := town.hoe(want->>0, p_before, coalesce(p_plots->(want->>0), wild), hand_, p_now);
    return case when (did->>'ok')::boolean then jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(want->>0, did->'plot')) else nothing end;
  end if;
  more := town.watering_of(p_before, hand_, p_now, fx);
  if rains then rained := town.use_power(p_after, tool, 'cnRain', p_now); end if;
  if coalesce((rained->>'ok')::boolean, false) then
    for k in select t.key_ from jsonb_array_elements_text(want) with ordinality as t(key_, ord) order by t.ord loop
      out_ := out_ || jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
        || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more)));
    end loop;
    return jsonb_build_object('purse', rained->'purse', 'plots', out_);
  end if;
  if not struck then return nothing; end if;
  k := want->>0;
  return jsonb_build_object('purse', p_after, 'plots', jsonb_build_object(k, (p_plots->k) || jsonb_build_object('plant', (p_plots->k->'plant')
    || jsonb_build_object('watered', p_now, 'boost', (p_plots->k->'plant'->>'boost')::double precision + more))));
end;
$$;
-- </town.beside(text,jsonb,jsonb,text,jsonb,jsonb,text,bigint,text,double precision)>

-- <town_tend(integer,integer,jsonb,boolean)>
create or replace function public.town_tend(p_x integer, p_y integer, p_timing jsonb DEFAULT NULL::jsonb, p_sure boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
-- v177: stronger milestones and distinct powers.

declare
  me uuid := town.member();
  purse jsonb;
  now_ bigint := town.now_ms();
  f jsonb := town.cat('farming');
  bed_n integer := town.bed_of(coalesce(p_x, -1), coalesce(p_y, -1));
  key text := p_x::text || ',' || p_y::text;
  plot jsonb;
  keeping jsonb;
  others integer;
  holds integer;
  did jsonb;
  after jsonb;
  said jsonb := town.claims(p_timing);
  claims jsonb;
  misses integer := 0;
  pals uuid[] := town.bell_pals(bed_n, me, now_);
  held uuid;
  wears boolean;
  rang jsonb;
  -- ── the older tools (v174): the plots of the row as they stood, what the deed did beside its own plot, those plots as they are kept, and one of them ──
  row_ jsonb;
  more_ jsonb;
  also_ jsonb;
  k_ text;
  beside_ jsonb;
begin
  -- (my purse, and those of whoever watered in this bed a moment ago, whom a bell may ring with: held in the order of their ids)
  for held in select pp.member_id from public.town_purses pp where pp.member_id = me or pp.member_id = any(pals) order by pp.member_id for update loop null; end loop;
  purse := town.purse_of(me, true);
  if bed_n < 0 then return town.answer(me, town.no('none')); end if;
  -- one at a time in a bed: of two who sow in a free one at once, only the first owns it
  perform pg_advisory_xact_lock(hashtext('town.bed'), bed_n);
  -- ── the older tools (v174): the plot with its `damp`, where it has one ──
  select jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end into plot from public.town_plots p where p.x = p_x and p.y = p_y;
  plot := coalesce(plot, '{"soil": "wild", "plant": null}'::jsonb);
  select jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty) into keeping from public.town_beds b where b.bed = bed_n;
  select count(*)::int into others from public.town_plots p where p.bed = bed_n and p.plant is not null and not (p.x = p_x and p.y = p_y);
  select count(*)::int into holds from public.town_beds b
   where b.member_id = me and b.bed <> bed_n
     and town.owner_of(jsonb_build_object('by', b.member_id, 'tended', b.tended, 'empty', b.empty),
           exists (select 1 from public.town_plots p where p.bed = b.bed and p.plant is not null), now_) is not null;
  did := town.tend(key, plot, keeping, others, holds, purse, me::text, now_, coalesce(p_sure, false));
  if not (did->>'ok')::boolean then
    return town.answer(me, did) || jsonb_build_object('key', key, 'plot', plot, 'bed', town.bed_told(bed_n));
  end if;
  after := did->'purse';
  if did->>'deed' in ('clear', 'till') then
    -- what the browser says of its game is kept as three numbers and no more
    claims := jsonb_build_object(
      'hits', case when jsonb_typeof(said->'hits') = 'number' then least(greatest((said->>'hits')::numeric, 0), 1000) end,
      'misses', case when jsonb_typeof(said->'misses') = 'number' then least(greatest((said->>'misses')::numeric, 0), 1000) end,
      'secs', case when jsonb_typeof(said->'secs') = 'number' then least(greatest((said->>'secs')::numeric, 0), 3600) end);
    -- every miss of the hoe is a little more stamina gone
    misses := least(floor(coalesce((claims->>'misses')::numeric, 0))::int, (f->>'misses')::int);
    if misses > 0 then after := town.spend(after, misses, now_); end if;
    perform town.record(me, 'farming', true, coalesce((claims->>'secs')::double precision, 0), town.stamina_of(purse, now_) <= 0, town.buff_of(purse, now_),
      jsonb_build_object('what', did->>'deed', 'tile', jsonb_build_array(p_x, p_y), 'need', (f->'swings'->>(did->>'deed'))::int, 'misses', misses, 'claims', claims));
  else
    -- (clearing and tilling are written down with their game, above; everything else here: the plant it was
    -- done to, how many were picked, the tile, the thing in the hand, and whose plant it was when not one's own)
    perform town.note(me, did->>'deed', coalesce(plot->'plant'->>'crop', did->'plot'->'plant'->>'crop'),
      case when did->>'deed' = 'pick' then (did->'got'->0->>1)::numeric else 1 end, 0,
      jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))
        || case when plot->'plant'->>'by' <> me::text then jsonb_build_object('whose', plot->'plant'->>'by') else '{}'::jsonb end
        -- ── the older tools (v174): what the lines of work read of a forged can (nothing, of any other) ──
        || town.kind_doc(purse, did->>'deed', plot, me::text)
        -- (an insect that eats pests, let go on a plant that had one: whether it ate it, or was off with the pest still there)
        || case when did->>'deed' = 'feed' and f->'rids'->>town.hand_of(purse) is not null and (town.see(key, plot, now_)->>'pest')::boolean
             then jsonb_build_object('rid', (did->'plot'->'plant'->>'cured')::bigint > (plot->'plant'->>'cured')::bigint) else '{}'::jsonb end);
  end if;
  -- (a watering with a can: kept with what the gifts of whoever watered, the heat and the well's water make of it)
  if did->>'deed' = 'water' then
    wears := town.wearing(purse, 'charmBell') and town.owner_of(keeping, true, now_) is distinct from me::text;
    did := did || jsonb_build_object('plot', town.poured_as(plot, did->'plot', now_, town.hot(now_), town.well_kind(now_), me::text, coalesce((did->>'times')::double precision, 1), wears));
    -- (and rung with a friend's, if one watered in this bed a moment ago and one of us wears the bell)
    rang := town.bell_rung(me, bed_n, jsonb_build_object(key, did->'plot'), after, wears, pals, now_);
    if rang is not null then
      after := rang->'purse';
      did := did || jsonb_build_object('plot', rang->'plots'->key, 'bell', rang->'bell');
    end if;
  end if;
  -- ── the older tools (v174): what a deed done with a forged hoe or can does to the plots beside its own: plots of this row of this bed, which is held whole above; each is kept as the deed's own was, and none is a deed of its own ──
  if did->>'deed' in ('clear', 'till', 'water') and purse->>'hand' in ('hoe', 'can') and town.bag_forged(purse->'bag', purse->>'hand') and town.forged(town.hand_stack(purse)) then
    select coalesce(jsonb_object_agg(p.x::text || ',' || p.y::text, jsonb_build_object('soil', p.soil, 'plant', coalesce(p.plant, 'null'::jsonb)) || case when p.damp then '{"damp": true}'::jsonb else '{}'::jsonb end), '{}'::jsonb) into row_
      from public.town_plots p where p.bed = bed_n and (p.y = p_y or town.tool_has(town.hand_stack(purse), 'cnRain'));
    more_ := town.beside(key, case when town.tool_has(town.hand_stack(purse), 'cnRain') then town.bed_keys(p_x, p_y) else town.row_keys(p_x, p_y) end, row_ || jsonb_build_object(key, plot), did->>'deed', purse, after, me::text, now_,
      town.owner_of(keeping, others > 0 or coalesce(plot->'plant', 'null'::jsonb) <> 'null'::jsonb, now_));
    after := more_->'purse';
    for k_ in select o.key from jsonb_each(more_->'plots') o order by split_part(o.key, ',', 1)::integer loop
      beside_ := more_->'plots'->k_;
      if did->>'deed' = 'water' and row_ ? k_ then
        beside_ := town.poured_as(row_->k_, beside_, now_, town.hot(now_), town.well_kind(now_), me::text, 1, wears);
      end if;
      insert into public.town_plots (x, y, bed, soil, plant, changed)
        values (split_part(k_, ',', 1)::integer, split_part(k_, ',', 2)::integer, bed_n, beside_->>'soil', nullif(beside_->'plant', 'null'::jsonb), now_)
        on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
      also_ := coalesce(also_, '{}'::jsonb) || jsonb_build_object(k_, beside_);
    end loop;
  end if;
  -- ── the older tools (v174): its end ──
  perform town.keep_purse(me, after);
  insert into public.town_plots (x, y, bed, soil, plant, changed)
    values (p_x, p_y, bed_n, did->'plot'->>'soil', nullif(did->'plot'->'plant', 'null'::jsonb), now_)
    on conflict (x, y) do update set soil = excluded.soil, plant = excluded.plant, changed = excluded.changed;
  -- ── the older tools (v174): and its `damp`, where the plot has one or had one ──
  if did->'plot'->'damp' = 'true'::jsonb or plot->'damp' = 'true'::jsonb then
    update public.town_plots set damp = coalesce(did->'plot'->'damp' = 'true'::jsonb, false) where x = p_x and y = p_y;
  end if;
  -- ── the older tools (v174): its end ──
  if did ? 'bed' then
    insert into public.town_beds (bed, member_id, tended, empty)
      values (bed_n, (did->'bed'->>'by')::uuid, (did->'bed'->>'tended')::bigint, (did->'bed'->>'empty')::bigint)
      on conflict (bed) do update set member_id = excluded.member_id, tended = excluded.tended, empty = excluded.empty;
  else
    delete from public.town_beds b where b.bed = bed_n;
  end if;
  return town.answer(me, did - 'plot' - 'bed') || jsonb_build_object('key', key, 'plot', did->'plot', 'bed', town.bed_told(bed_n), 'misses', misses)
    -- ── the older tools (v174): the plots beside it that the deed changed, by their keys and as they are kept ──
    || case when also_ is not null then jsonb_build_object('also', (select jsonb_agg(o.key order by split_part(o.key, ',', 1)::integer) from jsonb_each(also_) o), 'plots', also_) else '{}'::jsonb end;
end;
$$;
-- </town_tend(integer,integer,jsonb,boolean)>

-- <town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)>
create or replace function town.cook_more(p_spent jsonb, p_tool jsonb, p_fx jsonb, p_made boolean, p_luck double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
$$;
-- </town.cook_more(jsonb,jsonb,jsonb,boolean,double precision,bigint)>

-- <town.cook(jsonb,jsonb,jsonb,double precision,bigint)>
create or replace function town.cook(p_purse jsonb, p_things jsonb, p_crew jsonb, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
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
    left_ := (case when made is not null then town.helpings(dish, p_crew, p_misses, p_purse->'bag') * batch_ else town.odd_helpings(alls, p_misses) end)
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
$$;
-- </town.cook(jsonb,jsonb,jsonb,double precision,bigint)>

-- <town.work_counts_of(jsonb,text)>
create or replace function town.work_counts_of(p_done jsonb, p_doer text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  l jsonb := town.cat('work');
  what text := p_done->>'what';
  thing text := coalesce(p_done->>'thing', '');
  doc jsonb := coalesce(p_done->'doc', '{}'::jsonb);
  other text := coalesce(doc->>'whose', doc->>'owner');
  raw double precision;
begin
  if p_done->>'from' = 'play' then
    if not coalesce((p_done->>'won')::boolean, false) then return '[]'::jsonb; end if;
    if what = 'fishing' and l->'fishing' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'fishing', 'raw', l->'fishing'->thing, 'first', 'fishing:' || thing));
    end if;
    if what = 'cooking' and l->'kitchen'->'pot' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'kitchen', 'raw', l->'kitchen'->'pot'->thing, 'first', 'kitchen:' || thing,
        'held', jsonb_build_object('key', 'pot:' || thing, 'most', l->'kitchen'->'pots')));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'ladle' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', doc->>'whose', 'line', 'kitchen', 'raw', l->'kitchen'->'ladled',
        'held', jsonb_build_object('key', 'ladle:' || p_doer, 'most', l->'kitchen'->'ladling')));
    end if;
    return '[]'::jsonb;
  end if;
  if what in ('water', 'clear', 'till', 'feed', 'cure', 'dust') then
    if other is not null and other <> '' and other <> p_doer then
      -- ── the older tools (v174): what a watering's deed says of a forged can, never more than the option's own number ──
      if what = 'water' and jsonb_typeof(doc->'kind') = 'number' and (doc->>'kind')::numeric > 0 then
        return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw',
          (l->'helpers'->>what)::numeric + least(coalesce((town.cat('forge')->'options'->'of'->'cnKind'->'six'->'n'->>'points')::numeric, town.opt_n('cnKind', 'points')::numeric), floor((doc->>'kind')::numeric))));
      end if;
      -- ── the older tools (v174): its end ──
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->what));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'bell' then
    if coalesce((p_done->>'n')::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', (l->'helpers'->>'water')::double precision * floor((p_done->>'n')::double precision)));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'thank' then
    return coalesce((select jsonb_agg(jsonb_build_object('to', t.id #>> '{}', 'line', 'helpers', 'raw', l->'helpers'->'thanked') order by t.ord)
      from jsonb_array_elements(case when jsonb_typeof(doc->'to') = 'array' then doc->'to' else '[]'::jsonb end) with ordinality as t(id, ord)
     where jsonb_typeof(t.id) = 'string' and t.id #>> '{}' <> p_doer), '[]'::jsonb);
  end if;
  if what = 'gather' then
    if l->'forest'->'how' ? coalesce(doc->>'how', '') then
      raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case when l->'forest'->'rares' ? thing then (l->'forest'->>'rare')::double precision else 0 end;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'forest', 'raw', raw, 'first', 'forest:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): a tree felled, by its kind; and a point of the helpers' to whoever braced its trunk ──
  if what = 'fell' then
    if coalesce((l->'felling'->>thing)::double precision, 0) > 0 then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'felling', 'raw', l->'felling'->thing, 'first', 'felling:' || thing))
        || case when jsonb_typeof(doc->'braced') = 'string' and doc->>'braced' <> '' and doc->>'braced' <> p_doer
             then jsonb_build_array(jsonb_build_object('to', doc->>'braced', 'line', 'helpers', 'raw', l->'braced')) else '[]'::jsonb end;
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the mountain's trees (v164): its end ──
  -- ── the mountain's rocks (v164): a rock broken, a vein played out, a way down found, the day's crystal rock, and a hand lent to somebody else's rock ──
  if what = 'mine' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining',
        'raw', (l->'mining'->>'rock')::double precision * greatest(1::double precision, floor(coalesce((p_done->>'n')::double precision, 1))))
      || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end);
  end if;
  if what = 'vein' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', case when town.mine_yes(doc->'again') then '0'::jsonb else l->'mining'->'vein' end)
        || case when thing <> '' then jsonb_build_object('first', 'mining:' || thing) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  if what = 'delve' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'way'));
  end if;
  if what = 'hew' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'lent'), jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'mining'->'lending'));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'crystal' then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', l->'mining'->'crystal')
        || case when jsonb_typeof(doc->'got') = 'string' then jsonb_build_object('first', 'mining:' || (doc->>'got')) else '{}'::jsonb end)
      || case when jsonb_typeof(doc->'chip') = 'string' then jsonb_build_array(jsonb_build_object('to', null, 'line', 'mining', 'raw', 0, 'first', 'mining:' || (doc->>'chip'))) else '[]'::jsonb end;
  end if;
  -- ── the mountain's rocks (v164): its end ──
  -- ── the blacksmith (v174): the bellows worked at the smith for somebody else's piece ──
  if what = 'bellows' then
    if jsonb_typeof(doc->'whose') = 'string' and doc->>'whose' <> p_doer then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', l->'helpers'->'bellows'));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the blacksmith (v174): its end ──
  if what = 'net' then
    if l->'insects' ? thing then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'insects', 'raw', l->'insects'->thing, 'first', 'insects:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  if what = 'pick' then
    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));
    end if;
    return '[]'::jsonb;
  end if;
  -- ── the bridge built by hand (v160): a stone laid is a point on the helpers' line to whoever laid it and to each of the others it came by ──
  if what in ('stone_lay', 'stone_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('bridge')->'point'));
  end if;
  -- ── the bridge built by hand (v160): its end ──
  -- ── the lamp relay at dusk (v163): a post lit is three points on the helpers' line to whoever lit it and to each of the others its flame came by ──
  if what in ('lamp_light', 'lamp_hand') then
    return jsonb_build_array(jsonb_build_object('to', null, 'line', 'helpers', 'raw', town.cat('lamps')->'point'));
  end if;
  -- ── the lamp relay at dusk (v163): its end ──
  return '[]'::jsonb;
end;
$$;
-- </town.work_counts_of(jsonb,text)>

-- <town.cave_told_of(jsonb,jsonb,text,integer,integer,integer,bigint,text,jsonb,jsonb)>
create or replace function town.cave_told_of(p_caves jsonb, p_purse jsonb, p_me text, p_floor integer, p_x integer, p_y integer, p_now bigint, p_word text, p_rocks jsonb, p_crystal jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  m jsonb := town.cat('mining');
  turn_ bigint := town.mine_turn(p_now);
  day_ integer := town.day_of(p_now);
  pick jsonb := town.mine_pick(p_purse);
  here jsonb := coalesce(p_caves->(p_floor::text), town.cave_at(null, p_now));
  cfloor integer := (p_crystal->>'floor')::integer;
  crock integer := (p_crystal->>'rock')::integer;
  -- (the crystal's breaker is written in the document of the floor it stood on)
  shattered boolean := cfloor is not null and coalesce(p_caves->(cfloor::text)->'crystal', 'null'::jsonb) <> 'null'::jsonb;
  gone jsonb := '{}'::jsonb;
  ways jsonb := '{}'::jsonb;
  deepest jsonb := 'null'::jsonb;
  glints jsonb := '[]'::jsonb;
  torches jsonb;
  moss jsonb;
  f integer;
  c jsonb;
  ids jsonb;
  reach double precision;
  veins double precision;
  today_ jsonb;
  r jsonb;
  again_ numeric;
begin
  for f in 0..(m->>'floors')::integer loop
    c := p_caves->(f::text);
    continue when c is null;
    ids := town.cave_gone(c, p_now);
    if shattered and cfloor = f and not exists (select 1 from jsonb_array_elements(ids) i(v) where (i.v #>> '{}')::numeric = crock) then ids := ids || jsonb_build_array(crock); end if;
    if jsonb_array_length(ids) > 0 then gone := gone || jsonb_build_object(f::text, ids); end if;
    if coalesce(c->'way', 'null'::jsonb) <> 'null'::jsonb then
      ways := ways || jsonb_build_object(f::text, jsonb_build_object('x', c->'way'->'x', 'y', c->'way'->'y', 'rock', c->'way'->'rock', 'name', c->'way'->'name'));
      -- (the board: the floor under the deepest way that is open today, and who opened it; the floors are gone through from the top)
      deepest := jsonb_build_object('floor', f + 1, 'by', c->'way'->'by', 'name', c->'way'->'name', 'at', c->'way'->'at');
    end if;
  end loop;
  -- the rocks that glint for the pick in the hand (the catalog's `pick.gems.light.glint`), by where the member stands
  reach := case when town.tool_has(pick, 'pkGleam') then (m->>'all')::double precision else town.gem_by(pick, 'light', m->'pick'->'gems'->'light'->'glint') end;
  if reach > 0 and p_floor > 0 and p_x is not null and p_y is not null then
    today_ := town.mine_today(p_word, p_floor, day_, p_rocks, here, case when cfloor = p_floor then crock end);
    veins := town.mine_veins(pick);
    for r in select x.v from jsonb_array_elements(p_rocks) with ordinality x(v, ord) order by x.ord loop
      continue when exists (select 1 from jsonb_array_elements(coalesce(gone->(p_floor::text), '[]'::jsonb)) i(v) where (i.v #>> '{}')::numeric = (r->>0)::numeric);
      continue when reach < (m->>'all')::double precision
        and (((r->>1)::integer - p_x) * ((r->>1)::integer - p_x) + ((r->>2)::integer - p_y) * ((r->>2)::integer - p_y))::double precision > reach * reach;
      if town.mine_holds_by(p_word, p_floor, (r->>0)::integer, turn_, today_, veins)->>'kind' = 'vein' then glints := glints || jsonb_build_array((r->>0)::integer); end if;
    end loop;
  end if;
  -- (the lights of every place, the first to go out first)
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into torches
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'torches') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  select coalesce(jsonb_agg(t.v order by (t.v->>'until')::numeric, pl.key::integer, t.ord), '[]'::jsonb) into moss
    from jsonb_each(p_caves) pl, jsonb_array_elements(pl.value->'moss') with ordinality t(v, ord) where (t.v->>'until')::numeric > p_now;
  -- changesAt: when this next changes by itself: the rocks' next turn, the first torch to burn out, the first moss to stop glowing
  select least((turn_ + 1) * (m->>'turn')::numeric, min((t.v->>'until')::numeric)) into again_ from jsonb_array_elements(torches || moss) t(v);
  return jsonb_build_object('day', day_, 'turn', turn_, 'again', again_, 'gone', gone, 'ways', ways, 'torches', torches, 'moss', moss, 'deepest', deepest,
    'glints', glints, 'place', p_floor, 'struck', town.cave_struck_told(here, p_me, p_now),
    'crystal', case when p_crystal is null or p_crystal = 'null'::jsonb or shattered then 'null'::jsonb
      when p_floor = cfloor then jsonb_build_object('floor', cfloor, 'rock', crock)
      when pick is not null and town.tool_has(pick, 'pkGleam') then jsonb_build_object('floor', cfloor, 'rock', null) else 'null'::jsonb end)
    || town.cave_own(p_purse, p_now);
end;
$$;
-- </town.cave_told_of(jsonb,jsonb,text,integer,integer,integer,bigint,text,jsonb,jsonb)>

-- <town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text)>
create or replace function town.net(p_purse jsonb, p_haunt integer, p_has jsonb, p_taken integer, p_mine boolean, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint, p_lure text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  h jsonb := ins->'haunts'->p_haunt;
  kind jsonb := ins->'kinds'->(h->>0);
  id text := p_has->>'bug';
  bug jsonb := ins->'bugs'->id;
  n integer := (p_has->>'n')::int;
  cost double precision;
  -- ── the older tools (v174): the forged net in the hand, the catch's end with it, and what its reader adds to the bound a catch is told far by ──
  tool_ jsonb;
  more_ jsonb;
  far_ double precision := town.net_more_far(p_purse, p_now);
begin
  if p_has is null or p_has = 'null'::jsonb or h is null or bug is null then return town.no('none'); end if;
  if coalesce(p_mine, false) then return town.no('had'); end if;
  if coalesce(p_taken, 0) >= (kind->>'shares')::int then return town.no('bare'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or not exists (
    select 1 from jsonb_array_elements(h->3) p
     where sqrt(power((p->>0)::double precision - p_x - 0.5, 2) + power((p->>1)::double precision - p_y - 0.5, 2))
           -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
           <= (ins->'net'->>'reach')::double precision + far_ + (ins->'net'->>'far')::double precision) then
    return town.no('far');
  end if;
  if bug->>'habit' = 'lure' and (p_lure is null or not ins->'lures' ? p_lure) then return town.no('lure'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (bug->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', p_haunt, (p_has->>'turn')::bigint, p_now), p_now);
    return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, more_->'purse', id, n, p_x, p_y, p_now),
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  return jsonb_build_object('ok', true, 'purse', town.followed(p_purse, town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n)), id, n, p_x, p_y, p_now),
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;
-- </town.net(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,bigint,text)>

-- <town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)>
create or replace function town.net_mine(p_purse jsonb, p_which text, p_hand text, p_x integer, p_y integer, p_misses double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  ins jsonb := town.cat('insects');
  l jsonb := p_purse->'lured';
  f jsonb := p_purse->'follower';
  -- ── the older tools (v174): with what the reader says of the net in the hand, its reach and its wide (nothing, with a net as it was bought) ──
  reach double precision := (ins->'net'->>'reach')::double precision + town.net_more_far(p_purse, p_now) + (ins->'net'->>'far')::double precision;
  id text := null;
  n integer;
  ax integer;
  ay integer;
  cost double precision;
  after_ jsonb;
  -- ── the older tools (v174): the forged net in the hand, and the catch's end with it ──
  tool_ jsonb;
  more_ jsonb;
begin
  if p_which = 'lured' and jsonb_typeof(l) = 'object' and ins->'bugs' ? (l->>'bug') and jsonb_typeof(l->'from') = 'number' and jsonb_typeof(l->'until') = 'number'
     and (l->>'from')::numeric <= p_now and p_now < (l->>'until')::numeric then
    id := l->>'bug'; n := (l->>'n')::int; ax := (l->>'x')::int; ay := (l->>'y')::int;
  elsif p_which = 'pair' and jsonb_typeof(f) = 'object' and ins->'bugs' ? (f->>'bug') and jsonb_typeof(f->'until') = 'number' and jsonb_typeof(f->'at') = 'array'
     and p_now <= (f->>'until')::numeric + (ins->'pair'->>'slack')::numeric then
    id := f->>'bug'; n := (f->>'n')::int; ax := (f->'at'->>0)::int; ay := (f->'at'->>1)::int;
  end if;
  if id is null then return town.no('none'); end if;
  if p_hand is null or not ins->'nets' ? p_hand then return town.no('tool'); end if;
  if p_x is null or p_y is null or ((ax - p_x) * (ax - p_x) + (ay - p_y) * (ay - p_y))::double precision > reach * reach then return town.no('far'); end if;
  if town.room(p_purse->'bag', id) < n then return town.no('full'); end if;
  cost := (ins->'bugs'->id->>'cost')::double precision + least((ins->'net'->>'misses')::int, greatest(0, floor(coalesce(p_misses, 0)))::int);
  -- ── the older tools (v174): with a forged net in the hand, what it pays and how many come ──
  if p_purse->>'hand' = 'bugNet' and town.bag_forged(p_purse->'bag', 'bugNet') then tool_ := town.hand_stack(p_purse); end if;
  if town.forged(tool_) then
    more_ := town.net_more(p_purse, tool_, id, n, cost, town.luck_of('twin', ax, ay, p_now), p_now);
    after_ := more_->'purse';
    return jsonb_build_object('ok', true,
      'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
        else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
      'got', jsonb_build_array(jsonb_build_array(id, more_->'n')));
  end if;
  -- ── the older tools (v174): its end ──
  after_ := town.spend(p_purse, cost, p_now) || jsonb_build_object('bag', town.put(p_purse->'bag', id, n));
  return jsonb_build_object('ok', true,
    'purse', case when p_which = 'pair' then after_ || jsonb_build_object('follower', null)
      else town.followed(p_purse, after_ || jsonb_build_object('lured', null), id, n, p_x, p_y, p_now) end,
    'got', jsonb_build_array(jsonb_build_array(id, n)));
end;
$$;
-- </town.net_mine(jsonb,text,text,integer,integer,double precision,bigint)>

-- <town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)>
create or replace function town.net_more(p_purse jsonb, p_tool jsonb, p_id text, p_n integer, p_cost double precision, p_luck double precision, p_now bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
AS $$
-- v177: stronger milestones and distinct powers.

declare
  fx jsonb := town.net_fx(p_tool);
  n integer := p_n + case when p_luck < (fx->>'twin')::double precision and town.room(p_purse->'bag', p_id) > p_n then 1 else 0 end;
begin
  return jsonb_build_object('n', n,
    'purse', town.sweep_caught(town.tool_paid(p_purse, town.spend(p_purse, p_cost, p_now), p_now, p_tool, fx, 'ntFresh') || jsonb_build_object('bag', town.put(p_purse->'bag', p_id, n)), p_now));
end;
$$;
-- </town.net_more(jsonb,jsonb,text,integer,double precision,double precision,bigint)>
notify pgrst, 'reload schema';
commit;
-- Expected: strong milestone numbers; a top's daily counts; all other catalog entries unchanged.
select data->'options'->'of'->'pkSteady'->'six' from public.town_catalog where key = 'forge';
select data->'options'->'of'->'cnFull'->'n' from public.town_catalog where key = 'forge';
