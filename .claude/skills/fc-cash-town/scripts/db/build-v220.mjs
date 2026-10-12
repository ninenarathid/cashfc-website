import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {rewardDB} from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(219),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const sigs=['town.fell_group(jsonb,jsonb,jsonb,jsonb,bigint,text)','town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)','public.town_fell_begin(integer,integer,integer)'];
 const originals=await Promise.all(sigs.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 const aliases=originals.slice(0,2).map((d,i)=>d.replace(`FUNCTION town.${i?'fell':'fell_group'}(`,`FUNCTION town.${i?'fell':'fell_group'}_v220(`));
 const rpc=originals[2].replace('FUNCTION public.town_fell_begin(p_tree integer, p_x integer, p_y integer)','FUNCTION public.town_fell_domino_begin(p_tree integer, p_x integer, p_y integer, p_direction jsonb)').replace('did := town.fell_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text);','did := town.fell_domino_begin(purse, grove, p_tree, p_x, p_y, now_, floor(random() * 2147483648)::bigint, me::text,p_direction);').replace("grove := town.fell_opened(grove, me::text, did->'trees', now_);","grove := town.fell_opened(grove, me::text, did->'trees', now_);\n    grove:=jsonb_set(grove,array['goes',me::text,'domino'],p_direction);");
 if(!rpc.includes('did := town.fell_domino_begin')||!rpc.includes("'domino'],p_direction"))throw Error('Felling begin moved');
 const g=REWARD_GIFTS.find(g=>g.id==='charmDomino'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-domino.sql',import.meta.url),'utf8');
 await db.exec(catalog);for(const alias of aliases)await db.exec(alias);await db.exec(helper);await db.exec(rpc);
 const normalized=await Promise.all(sigs.slice(0,2).map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v220_three_trunks_in_a_chosen_direction.sql',`-- v220: directional domino, up to three real eligible trees, three chains/day.
-- Run after v219 with the matching site. Rerunnable; grove lock remains before purse access.
-- Hardest trunk's game, original per-tree costs, held targets, ordinary failure/full-bag semantics.
begin;
do $guard$ begin
${sigs.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}'${i<2?`, '${digest(normalized[i])}'`:''}) then raise exception 'Felling changed: rebuild v220 on current definitions';end if;`).join('\n')}
end $guard$;
${catalog}
${aliases.map((alias,i)=>`do $$ begin if to_regprocedure('${sigs[i].replace('(','_v220(')}') is null then execute $copy$${alias}$copy$;end if;end $$;`).join('\n')}
${helper}
${rpc};
revoke all on function ${sigs.slice(0,2).map(s=>s.replace('(','_v220(')).join(',')} from public,anon,authenticated;
revoke all on function public.town_fell_domino_begin(integer,integer,integer,jsonb) from public,anon,authenticated;
grant execute on function public.town_fell_domino_begin(integer,integer,integer,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','town.reward_domino_group(jsonb,jsonb,jsonb,jsonb,bigint,text,jsonb)','EXECUTE'),'domino_ready',town.cat('gifts')->'gifts' ? 'charmDomino') as v220_verified;
`);console.log('Generated v220: directional tree grouping with a shared three-target limit.');
}catch(e){console.error(e.message,e.where??'',e.position??'');process.exitCode=1;}finally{await db.close();}
