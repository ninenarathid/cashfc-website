import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog');
const {FIELD_RECIPES}=await import('@/lib/town/reward-field');
const db=await tier10DB(),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 await db.exec(readFileSync('supabase/v207_the_minerals_and_parts_we_earned.sql','utf8'));
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 let patched=original.replace("not in ('scan','extractBegin','extractEnd')","not in ('scan','extractBegin','extractEnd','process')");
 patched=patched.replace("p:=town.purse_of(me,true);",`if p_input->>'action'='process' and p_input->>'kind'='mineral' then
  if jsonb_typeof(p_input->'floor') is distinct from 'number' or (p_input->>'floor')::numeric<>floor((p_input->>'floor')::numeric) or (p_input->>'floor')::numeric not between 1 and (town.cat('mining')->>'floors')::integer then return town.answer(me,town.no('far'));end if;
  f:=(p_input->>'floor')::integer;if not town.cave_is_laid(town.day_of(t)) then return town.answer(me,town.no('none'));end if;c:=town.cave_at(town.cave_kept(f,true),t);
 end if;
 p:=town.purse_of(me,true);`);
 patched=patched.replace("else did:=town.reward_extract(p,p_request,p_input,t);end if;",`elsif p_input->>'action'='process' then
  if p_input->>'kind'='mineral' then g:=town.mine_go(me,f,null,x,y,null,false,c,t);if coalesce(g->'at','null'::jsonb)='null'::jsonb then return town.answer(me,town.no('far'));end if;end if;
  did:=town.reward_process(p,p_input,t);
 else did:=town.reward_extract(p,p_request,p_input,t);end if;`);
 if(patched===original||!patched.includes('did:=town.reward_process'))throw Error('Reward RPC moved');
 const gifts=Object.fromEntries(REWARD_GIFTS.filter(g=>['thingPocketSawmill','famDwarf'].includes(g.id)).map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}]));
 const uses=Object.fromEntries(Object.entries(REWARD_USES).filter(([id])=>id in gifts));
 const recipes=Object.fromEntries(Object.entries(FIELD_RECIPES).map(([kind,rs])=>[kind,Object.fromEntries(Object.entries(rs).map(([id,r])=>[id,r]))]));
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gifts)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';
update public.town_catalog set data=data||jsonb_build_object('processRecipes','${JSON.stringify(recipes)}'::jsonb) where key='rewards';`;
 const helper=`create or replace function town.reward_process(p jsonb,input jsonb,t bigint) returns jsonb language plpgsql stable set search_path='' as $$
declare kind_ text:=input->>'kind';id_ text:=input->>'recipe';r jsonb;gift_ text;tool_ text;did jsonb;used jsonb;
begin
 if kind_ is null or kind_ not in ('wood','mineral') then return town.no('none');end if;
 gift_:=case when kind_='wood' then 'thingPocketSawmill' else 'famDwarf' end;
 r:=town.cat('rewards')->'processRecipes'->kind_->id_;
 if not town.gift_works(p,gift_) or r is null or not coalesce(p->'made','[]'::jsonb) ? id_ then return town.no('none');end if;
 for tool_ in select jsonb_array_elements_text(r->'in') loop if town.held(town.carried_bag(p),tool_)<1 then return town.no('tool');end if;end loop;
 did:=town.cook(p,r->'needs',case when jsonb_array_length(r->'in')=0 then '[null]'::jsonb else r->'in' end,0,t);
 if did->'ok' is distinct from 'true'::jsonb then return did;end if;
 if did->>'made' is distinct from id_ then return town.no('none');end if;
 used:=town.gift_use(did->'purse',gift_,t);if used->'ok' is distinct from 'true'::jsonb then return used;end if;
 return jsonb_build_object('ok',true,'purse',used->'purse','got',jsonb_build_array(jsonb_build_array(id_,did->'n')),'left',used->'left');
end $$;
revoke all on function town.reward_process(jsonb,jsonb,bigint) from public,anon,authenticated;`;
 await db.exec(catalogs);await db.exec(helper);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 writeFileSync('supabase/v208_working_with_wood_and_minerals_on_the_road.sql',`-- v208: two travelling rewards keep the original recipe costs and required implements.
-- Run after v207 with the matching site. Safe to run twice; no automatic gift claims or inventory moves.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'town_reward changed: rebuild v208 on current text';end if;end $guard$;
${catalogs}
${helper}
${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_process(jsonb,jsonb,bigint)','EXECUTE'),'rewards_ready',town.cat('gifts')->'gifts' ?& array['thingPocketSawmill','famDwarf']) as v208_verified;
`);
 console.log('Generated v208: discovered wood/mineral recipes on the road, with current v205 cooking preserved.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
