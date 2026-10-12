import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const{REWARD_GIFTS}=await import('@/lib/town/reward-catalog'),{SECRET_RULES}=await import('@/lib/town/private/combos'),db=await rewardDB(228),hash=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const sigs=['public.town_strike(integer)','public.town_land(text,jsonb)','town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint)','town.combo_rules()'],old=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const discount=`* case when (p_line->'powerInfo'->(p_line->'powerOrder'->>which_)->>'used')::boolean then .8 else 1 end`,land=old[1].replace('* (1-coalesce((line->>\'comboResume\')::double precision,0))',`* (1-coalesce((line->>'comboResume')::double precision,0)) * case when (line->'powerInfo'->(line->'powerOrder'->>0)->>'used')::boolean then .8 else 1 end`),one=old[2].replace("* coalesce((p_line->>'rod')::double precision, 1::double precision)",`* coalesce((p_line->>'rod')::double precision, 1::double precision) ${discount}`).replace('  update public.town_lines set doc =',`  if p_line ? 'powerOrder' then p_line:=jsonb_set(p_line,'{powerOrder}',coalesce((select jsonb_agg(e.v order by e.ord) from jsonb_array_elements(p_line->'powerOrder') with ordinality e(v,ord) where e.ord-1<>which_),'[]'::jsonb));end if;
  update public.town_lines set doc =`);
 if(!land.includes("line->'powerInfo'")||!one.includes(discount))throw Error('Landing moved');
 const rules=`create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $r$select '${JSON.stringify(SECRET_RULES).replaceAll("'","''")}'::jsonb$r$;revoke all on function town.combo_rules() from public,anon,authenticated;`,g=REWARD_GIFTS.find(g=>g.id==='charmLunarReel'),cat=`update public.town_catalog set data=jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-reel.sql',import.meta.url),'utf8'),wrapper=`create or replace function public.town_strike(p_reaction integer) returns jsonb language plpgsql security definer set search_path='' as $$declare a jsonb;me uuid:=town.member();extra jsonb;begin a:=public.town_strike_v229(p_reaction);if a->'ok'='true'::jsonb and a->'hooked'='true'::jsonb and a->'landed'='false'::jsonb then extra:=town.fishing_power_seed(me,town.now_ms());return a||town.answer(me,extra);end if;return a;end $$;`;
 await db.exec(cat);await db.exec(rules);await db.exec(helper);await db.exec('alter function public.town_strike(integer) rename to town_strike_v229;');await db.exec(wrapper);await db.exec(land);await db.exec(one);
 const newDefs=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const baseDef=(await db.query("select pg_get_functiondef('public.town_strike_v229(integer)'::regprocedure) d")).rows[0].d;
 writeFileSync('supabase/v229_the_moon_reel_and_a_moment_of_quiet.sql',`-- v229: each hooked fish charges its lunar reel separately; shorten remaining line once.
-- Run after v228 with matching site. Real world rain and running currents can reveal secret bonds.
-- No fish, bait, stamina or XP is created. Server records one activation per stable fish key.
-- Gameplay charge is the existing client minigame account; server checks elapsed time and live line ownership.
begin;do $g$ begin
${sigs.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${hash(old[i])}','${hash(newDefs[i])}') then raise exception 'Definition moved: rebuild v229';end if;`).join('\n')}
if to_regprocedure('public.town_strike_v229(integer)') is null then alter function public.town_strike(integer) rename to town_strike_v229;elsif md5(replace(pg_get_functiondef('public.town_strike_v229(integer)'::regprocedure),chr(13),''))<>'${hash(baseDef)}' then raise exception 'Base strike moved: rebuild v229';end if;
end $g$;
${cat}\n${rules}\n${helper}\n${wrapper}\n${land};\n${one};
revoke all on function public.town_strike_v229(integer),town.land_one(uuid,jsonb,jsonb,text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.town_strike(integer),public.town_land(text,jsonb) from public,anon,authenticated;grant execute on function public.town_strike(integer),public.town_land(text,jsonb) to authenticated;
notify pgrst,'reload schema';commit;`);console.log('Generated lunar reel and two private fishing bonds v229.');
}catch(e){console.error(e.stack,e.where??'');process.exitCode=1;}finally{await db.close();}
