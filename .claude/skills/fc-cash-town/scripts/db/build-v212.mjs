import {writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await tier10DB(),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209,210,211])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const signatures=['public.town_reward(uuid,jsonb)','public.town_cast(text,integer,integer,boolean,text,text)'],originals=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const patched=[originals[0].replace("'resourceCancel')","'resourceCancel','schoolStart')").replace("else did:=town.reward_extract(p,p_request,p_input,t);end if;","elsif p_input->>'action'='schoolStart' then did:=town.reward_school_start(p,p_input->>'fish',town.reward_school_pool(p,me,p_input,t),t);else did:=town.reward_extract(p,p_request,p_input,t);end if;"),
  originals[1].replace('  cast_ jsonb;','  cast_ jsonb;\n  school_ jsonb;').replace('  line := town.cast_from(odds, array[',`  school_ := town.reward_school_weights(did->'purse', odds, star, now_);
  odds := school_->'odds';
  did := did || jsonb_build_object('purse',school_->'purse');
  line := town.cast_from(odds, array[`)];
 if(!patched[0].includes('did:=town.reward_school_start')||!patched[1].includes('school_ := town.reward_school_weights'))throw Error('Fishing action moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingSchoolBell'),gift={[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}},uses={[g.id]:REWARD_USES[g.id]};
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gift)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-fishing.sql',import.meta.url),'utf8');
 await db.exec(catalogs);await db.exec(helper);for(const def of patched)await db.exec(def);
 const normalized=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v212_a_bell_for_fish_we_have_met.sql',`-- v212: target a known nonlegendary fish within the unchanged eligible cast pool.
-- Run after v211 with the matching site. Rerunnable; no free bait or automatic claims.
-- Two calls/day, three eligible casts/call, thirty-minute expiry. Stardust preserves charges.
begin;
do $guard$ begin
${signatures.map((sig,i)=>` if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest(normalized[i])}') then raise exception 'Action changed: rebuild v212 on current text';end if;`).join('\n')}
end $guard$;
${catalogs}
${helper}
${patched.join(';\n')};
revoke all on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.town_reward(uuid,jsonb),public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_school_weights(jsonb,jsonb,boolean,bigint)','EXECUTE'),'reward_ready',town.cat('gifts')->'gifts' ? 'thingSchoolBell') as v212_verified;
`);console.log('Generated v212: known targets, same cast eligibility, bounded charges.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
