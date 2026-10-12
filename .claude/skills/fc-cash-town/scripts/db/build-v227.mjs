import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const{REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),db=await rewardDB(226),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
const signatures=['public.town_reward(uuid,jsonb)','town.fell_v205(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)','town.reward_listening(jsonb,jsonb,jsonb,bigint)','town.grove_tidied(jsonb,bigint)','town.trees_told(jsonb,jsonb,bigint)'];
try{
 const originals=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d)),patched=originals.slice();
 patched[0]=patched[0].replace("'nurseryEnd','nurseryCancel')","'nurseryEnd','nurseryCancel','pactBegin','pactEnd','pactCancel')")
  .replace("if p_input->>'action'='dominoPreview' then grove_", "if p_input->>'action' in ('dominoPreview','pactBegin','pactEnd','extractBegin','extractEnd') then grove_")
  .replace('else did:=town.reward_extract(p,p_request,p_input,t);end if;',`elsif p_input->>'action' in ('pactBegin','pactEnd','pactCancel') then
  did:=town.reward_pact(p,grove_,p_input,p_request,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='pactEnd' then
   if did ? 'grove' then perform town.keep_thing('grove',did->'grove');end if;
   if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') s where s->>'item'=town.hand_of(p) and coalesce((s->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
  end if;did:=did-'grove';
 else
  if not town.tree_part_ready(grove_,(p->'professionRewards'->'extraction'->>'tree')::integer,case when p_input->>'action'='extractBegin' then p_input->>'part' else p->'professionRewards'->'run'->>'part' end,t) then return town.answer(me,town.no('spent'));end if;
  did:=town.reward_extract(p,p_request,p_input,t);
  if did->'ok'='true'::jsonb and p_input->>'action'='extractEnd' and jsonb_array_length(did->'got')>0 then perform town.keep_thing('grove',town.tree_part_rest(grove_,(p->'professionRewards'->'run'->>'tree')::integer,p->'professionRewards'->'run'->>'part',t));end if;
 end if;`);
 patched[1]=patched[1].replace("if quality_ is not null then got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse); end if;",`if quality_ is not null and town.tree_part_ready(closed_,id_,p_went->'grain'->>'part',p_now) then
     got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse);
     closed_ := town.tree_part_rest(closed_,id_,p_went->'grain'->>'part',p_now);
    end if;`);
 patched[2]=patched[2].replace("used_:=town.gift_use(did->'purse'", "if not town.tree_part_ready(did->'grove',(f->>'id')::integer,second_,t) then return did;end if;\n  used_:=town.gift_use(did->'purse'")
  .replace("return jsonb_set(did,'{felled,0}'", "did:=jsonb_set(did,'{grove}',town.tree_part_rest(did->'grove',(f->>'id')::integer,second_,t));\n  return jsonb_set(did,'{felled,0}'");
 patched[3]=patched[3].replace('begin\n',"begin\n  if p_grove ? 'parts' then p_grove:=p_grove||jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now));end if;\n");
 patched[4]=patched[4].replace('select jsonb_build_object(',"select (case when p_grove ? 'parts' then jsonb_build_object('parts',town.tree_parts(p_grove->'parts',p_now)) else '{}'::jsonb end) || jsonb_build_object(");
 for(let i=0;i<patched.length;i++)if(patched[i]===originals[i])throw Error('Moved function: '+signatures[i]);
 const g=REWARD_GIFTS.find(g=>g.id==='charmTreePact'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';`,helper=readFileSync(new URL('./reward-pact.sql',import.meta.url),'utf8');
 await db.exec(catalog);await db.exec(helper);for(const d of patched)await db.exec(d);const normalized=await Promise.all(signatures.map(async sig=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d));
 writeFileSync('supabase/v227_small_parts_belong_to_living_trees.sql',`-- v227: three daily living-tree care attempts; no logs, timber or tree reset.
-- Run after v226 with the matching site. One actual water + compost + two stamina/attempt.
-- A perfect care sequence gives two small parts. Every small part rests ten minutes per tree,
-- shared by ordinary grain collection, listener, parting knife and care. Felling/logs remain available.
-- The existing grove lock orders every writer before purse locks. Full bags preserve all inputs.
begin;do $guard$ begin
${signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${digest(originals[i])}','${digest(normalized[i])}') then raise exception 'Definition moved: rebuild v227 (${sig})';end if;`).join('\n')}
end $guard$;
${catalog}\n${helper}\n${patched.join(';\n')};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select not has_function_privilege('authenticated','town.reward_pact(jsonb,jsonb,jsonb,uuid,bigint,bigint)','EXECUTE') as pact_private;
`);console.log('Generated v227: shared per-tree parts, real water and nondestructive care.');
}catch(e){console.error(e.stack,e.where??'');process.exitCode=1;}finally{await db.close();}
