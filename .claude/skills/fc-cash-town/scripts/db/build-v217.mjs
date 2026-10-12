import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog');
const db=await tier10DB(),signature='town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209,210,211,212,213,214,216])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[signature])).rows[0].d,alias=original.replace('FUNCTION town.gather_part(', 'FUNCTION town.gather_part_v217(');
 const rpcSignature='public.town_gather(integer,integer,integer,jsonb)',rpc=(await db.query('select pg_get_functiondef($1::regprocedure) d',[rpcSignature])).rows[0].d;writeFileSync('.codex/tier10/gather-before-v217.sql',rpc);
 const marker="  if went->>'part' is not null and went->>'part'<>'whole' then";
 if(!rpc.includes(marker))throw Error('Public gather moved; review paired validation');
 const patchedRPC=rpc.replace(marker,`  -- Paired mastery uses raw mistakes, before the normal game rounds them down.
  if went->>'part'='paired' then
    if jsonb_typeof(went->'misses') is distinct from 'number' or jsonb_typeof(went->'wrong') is distinct from 'number' or (went->>'misses')::numeric<0 or (went->>'wrong')::numeric<0 then return town.answer(me,town.no('none'));end if;
    misses:=least((went->>'misses')::numeric,(f->>'misses')::integer);
    wrong:=least((went->>'wrong')::numeric,(f->>'misses')::integer);
  end if;
${marker}`);
 const helper=`create or replace function town.gather_part(p_purse jsonb,p_spot integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_wrong double precision,p_now bigint,p_part text,p_with text,p_lost boolean)
 returns jsonb language plpgsql stable set search_path='' as $$
 declare f jsonb:=town.cat('forest');k jsonb:=town.cat('forest_parts');spot jsonb:=town.wild_place(f,p_spot);a jsonb;b jsonb;used_ jsonb;
 begin
  if p_part is distinct from 'paired' then return town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,p_part,p_with,p_lost);end if;
  if not town.gift_works(p_purse,'famForestGuardian') or spot is null or k->'parts'->(spot->>0)->>'leaf' is null or k->'parts'->(spot->>0)->>'root' is null or not coalesce(p_misses>=0 and p_wrong>=0,false) or p_misses='Infinity'::double precision or p_wrong='Infinity'::double precision or p_misses='NaN'::double precision or p_wrong='NaN'::double precision then return town.no('none');end if;
  used_:=town.gift_use(p_purse,'famForestGuardian',p_now);if not coalesce((used_->>'ok')::boolean,false) then return town.no('none');end if;
  if town.held(town.carried_bag(p_purse),'rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool');end if;
  a:=town.gather_part_v217(p_purse,p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,p_misses,p_wrong,p_now,'leaf',p_with,p_lost);
  if not coalesce((a->>'ok')::boolean,false) or p_misses+p_wrong<>0 then return a;end if;
  b:=town.gather_part_v217(a->'purse',p_spot,p_has,p_taken,p_mine,p_hand,p_x,p_y,0,0,p_now,'root',p_with,p_lost);
  if not coalesce((b->>'ok')::boolean,false) then return b;end if;
  used_:=town.gift_use(b->'purse','famForestGuardian',p_now);
  return b || jsonb_build_object('purse',used_->'purse','got',(a->'got')||(b->'got'));
 end $$;`;
 const g=REWARD_GIFTS.find(g=>g.id==='famForestGuardian'),gift={[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}},uses={[g.id]:REWARD_USES[g.id]},catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify(gift)}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify(uses)}'::jsonb) where key='gifts';`;
 await db.exec(catalog);await db.exec(alias);await db.exec(helper);await db.exec(patchedRPC);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[signature])).rows[0].d;
 writeFileSync('supabase/v217_the_guardian_reads_leaves_and_roots.sql',`-- v217: the forest guardian reads two parts through two manual games.
-- Run after v214 and v216 with the matching site. Running it again is safe.
-- Five perfect plants/day, two ordinary stamina costs, one shared gathering claim.
-- Misses keep the ordinary leaf result; full bags never pay a partial result.
begin;
do $guard$ begin if md5(replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Gathering changed: rebuild v217 on current definitions';end if;
if md5(replace(pg_get_functiondef('${rpcSignature}'::regprocedure),chr(13),'')) not in ('${digest(rpc)}','${digest(patchedRPC)}') then raise exception 'Public gathering changed: rebuild v217 on current definitions';end if;end $guard$;
${catalog}
do $$ begin if to_regprocedure('${signature.replace('(', '_v217(')}') is null then execute $copy$${alias}$copy$;end if;end $$;
${helper}
${patchedRPC};
revoke all on function ${signature},${signature.replace('(', '_v217(')} from public,anon,authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('helper_private',not has_function_privilege('authenticated','${signature}','EXECUTE'),'guardian_ready',town.cat('gifts')->'gifts' ? 'famForestGuardian') as v217_verified;
`);console.log('Generated v217; public gathering definition retained.');
}finally{await db.close();}
