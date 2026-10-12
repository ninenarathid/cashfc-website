import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog');
const {SCANNABLE}=await import('@/lib/town/reward-actions');
const {POUCHES}=await import('@/lib/town/pouches');
const db=await tier10DB();
const digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const signatures=['town.stow_all(jsonb,jsonb)','town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)'];
 const originals=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const copies=originals.map((d,i)=>d.replace(`FUNCTION town.${i?'fell':'stow_all'}(`,`FUNCTION town.${i?'fell':'stow_all'}_v207(`));
 if(copies.some((d,i)=>d===originals[i]))throw Error('Function header moved');
 const wrappers=`
create or replace function town.stow_all(p_purse jsonb,p_things jsonb) returns jsonb language sql stable set search_path='' as $$
 select town.reward_learn(town.stow_all_v207(p_purse,p_things),p_things)
$$;
create or replace function town.fell(p_purse jsonb,p_grove jsonb,p_me text,p_went jsonb,p_x integer,p_y integer,p_now bigint,p_luck jsonb,p_who text default null)
returns jsonb language plpgsql stable set search_path='' as $$
declare did jsonb;f jsonb;p jsonb;
begin
 did:=town.fell_v207(p_purse,p_grove,p_me,p_went,p_x,p_y,p_now,p_luck,p_who);
 if did->'ok'='true'::jsonb and jsonb_array_length(did->'felled')>0 and town.gift_works(p_purse,'thingForesterKnife') and p_went->'grain' is not null then
  f:=did->'felled'->0;
  if f->>'quality' in ('rough','clear','heart') then
   p:=did->'purse';p:=p||jsonb_build_object('professionRewards',coalesce(p->'professionRewards','{}'::jsonb)||jsonb_build_object('run',null,'extraction',jsonb_build_object('key','tree:'||(f->>'id')||':'||p_now,'tree',f->'id','at',jsonb_build_array(p_x,p_y),'excluded',p_went->'grain'->'part','quality',f->'quality','until',p_now+180000)));
   did:=jsonb_set(did,'{purse}',p);
  end if;
 end if;
 return did;
end $$;
revoke all on function town.stow_all_v207(jsonb,jsonb),town.fell_v207(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text),town.stow_all(jsonb,jsonb),town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text) from public,anon,authenticated;
`;
 const guards=signatures.map(()=> '');
 // Capture the database-normalized wrapper text for an idempotent rerun guard.
 const helpers=readFileSync(new URL('./reward-foundation.sql',import.meta.url),'utf8');
 const gifts=Object.fromEntries(REWARD_GIFTS.filter(g=>g.rank===4).map(g=>[g.id,{kind:g.kind,line:g.line,rank:g.rank,by:1}]));
 const uses=Object.fromEntries(Object.entries(REWARD_USES).filter(([id])=>id in gifts));
 const catalogs=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gifts)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';
insert into public.town_catalog(key,data) values('rewards','${JSON.stringify({version:1,minerals:SCANNABLE,actions:['scan','extractBegin','extractEnd']})}'::jsonb) on conflict(key) do update set data=public.town_catalog.data||excluded.data;
update public.town_catalog set data=(select jsonb_agg(e.value||jsonb_build_object('holds',(select jsonb_agg(v order by v) from (select distinct v from jsonb_array_elements_text(e.value->'holds'||coalesce((select n->'holds' from jsonb_array_elements('${JSON.stringify(POUCHES)}'::jsonb) n where n->>'gift'=e.value->>'gift'),'[]'::jsonb)) h(v)) u)) order by e.ord) from jsonb_array_elements(data) with ordinality e(value,ord)) where key='pouches';`;
 for(const c of copies)await db.exec(c);
 await db.exec(catalogs);await db.exec(helpers);await db.exec(wrappers);
 for(let i=0;i<signatures.length;i++)guards[i]=`if md5(replace(pg_get_functiondef('${signatures[i]}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest((await db.query('select pg_get_functiondef($1::regprocedure) d',[signatures[i]])).rows[0].d)}') then raise exception 'Definition changed: ${signatures[i]}; rebuild v207 on current text';end if;`;
 const sql=`-- v207: earned minerals guide a compass; a felled trunk offers one more small part.
-- Run after v203 and v205 with the matching site. Safe to run twice.
-- No automatic gift claims, inventory transfers, coins or power upgrades.
begin;
do $guard$ begin ${guards.join('\n')} end $guard$;
${catalogs}
${copies.join(';\n')};\n${helpers}\n${wrappers}
notify pgrst,'reload schema';
commit;
select jsonb_build_object('member_rpc',has_function_privilege('authenticated','public.town_reward(uuid,jsonb)','EXECUTE'),'anon_blocked',not has_function_privilege('anon','public.town_reward(uuid,jsonb)','EXECUTE'),'receipts_private',not has_table_privilege('authenticated','town.reward_receipts','SELECT'),'gifts_ready',town.cat('gifts')->'gifts' ?& array['thingOreCompass','thingForesterKnife']) as v207_verified;
`;
 writeFileSync('supabase/v207_the_minerals_and_parts_we_earned.sql',sql);
 console.log('Generated v207 with guarded current v203/v205 functions and two playable rewards.');
}finally{await db.close();}
