import{readFileSync,writeFileSync}from'node:fs';import{createHash}from'node:crypto';import{rewardDB}from'./reward-db.mjs';await import('./repo-ts-town.mjs');
const {REWARD_GIFTS,REWARD_USES}=await import('@/lib/town/reward-catalog'),{bedCorner}=await import('@/lib/town/world'),db=await rewardDB(224),sig='public.town_reward(uuid,jsonb)',digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 const original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const branch=`if p_input->>'action' in ('cloudBegin','cloudEnd','cloudCancel','cloudConsent') then
  cloudbeds_:='[]'::jsonb;
  if p_input->>'action'='cloudBegin' then cloudbeds_:=p_input->'beds';
  elsif p_input->>'action'='cloudEnd' then cloudbeds_:=p->'professionRewards'->'cloud'->'beds';
  elsif p_input->>'action'='cloudConsent' then cloudbeds_:=jsonb_build_array(town.bed_of(x,y));end if;
  if p_input->>'action'<>'cloudCancel' then
   if jsonb_typeof(cloudbeds_) is distinct from 'array' or jsonb_array_length(cloudbeds_) not between 1 and 3 then return town.answer(me,town.no('far'));end if;
   if exists(select 1 from jsonb_array_elements(cloudbeds_) v where jsonb_typeof(v)<>'number' or (v::text)::numeric<>floor((v::text)::numeric) or (v::text)::numeric not between 0 and 23) then return town.answer(me,town.no('far'));end if;
   for bedn_ in select distinct value::text::integer from jsonb_array_elements(cloudbeds_) order by 1 loop perform pg_advisory_xact_lock(hashtext('town.bed'),bedn_);end loop;
  end if;
  select coalesce(jsonb_object_agg(q.x::text||','||q.y::text,jsonb_build_object('soil',q.soil,'plant',coalesce(q.plant,'null'::jsonb))),'{}'::jsonb) into bed_ from public.town_plots q where cloudbeds_ @> to_jsonb(q.bed);
  select coalesce(jsonb_object_agg(b.bed::text,town.owner_of(jsonb_build_object('by',b.member_id,'tended',b.tended,'empty',b.empty),exists(select 1 from public.town_plots q where q.bed=b.bed and q.plant is not null),t)),'{}'::jsonb) into cloudowners_ from public.town_beds b where cloudbeds_ @> to_jsonb(b.bed);
  select coalesce(jsonb_object_agg(c.bed::text,c.doc),'{}'::jsonb) into cloudconsents_ from town.reward_cloud_consents c where cloudbeds_ @> to_jsonb(c.bed);
  select l.kind into cloudkind_ from public.town_line_water l where l.member_id=me and l.item=town.hand_of(p);
  did:=town.reward_cloud(p,p_input,p_request,me,bed_,cloudowners_,cloudconsents_,cloudkind_,t);
  if did->'ok'='true'::jsonb then
   if p_input->>'action'='cloudConsent' then
    bedn_:=town.bed_of(x,y);if did->'consent'='null'::jsonb then delete from town.reward_cloud_consents where bed=bedn_;else insert into town.reward_cloud_consents values(bedn_,did->'consent') on conflict(bed) do update set doc=excluded.doc;end if;
   elsif p_input->>'action'='cloudEnd' then
    for key_ in select jsonb_array_elements_text(did->'watered') loop update public.town_plots q set plant=did->'plots'->key_->'plant',changed=t where q.x=split_part(key_,',',1)::integer and q.y=split_part(key_,',',2)::integer;end loop;
    if not exists(select 1 from jsonb_array_elements(did->'purse'->'bag') b where b->>'item'=town.hand_of(p) and coalesce((b->>'water')::numeric,0)>0) then delete from public.town_line_water where member_id=me and item=town.hand_of(p);end if;
    perform town.note(me,'cloud',null,1,0,jsonb_build_object('beds',cloudbeds_,'plants',jsonb_array_length(did->'watered'),'kind',cloudkind_));
   end if;
  end if;
  did:=did-'plots'-'consent';
 elsif p_input->>'action' in ('springPlace','springDraw') then`;
 const patched=original.replace('spring_ jsonb;','spring_ jsonb;cloudbeds_ jsonb;cloudowners_ jsonb;cloudconsents_ jsonb;cloudkind_ text;').replace("'conduitCancel','springPlace','springDraw')","'conduitCancel','springPlace','springDraw','cloudBegin','cloudEnd','cloudCancel','cloudConsent')").replace("if p_input->>'action' in ('springPlace','springDraw') then\n  did:=",branch+'\n  did:=');
 if(!patched.includes('did:=town.reward_cloud'))throw Error('Dispatcher moved');
 const g=REWARD_GIFTS.find(g=>g.id==='thingCloudJar'),catalog=`update public.town_catalog set data=jsonb_set(jsonb_set(data,'{gifts}',data->'gifts'||'${JSON.stringify({[g.id]:{kind:g.kind,line:g.line,rank:g.rank,by:1}})}'::jsonb),'{uses}',data->'uses'||'${JSON.stringify({[g.id]:REWARD_USES[g.id]})}'::jsonb) where key='gifts';
 update public.town_catalog set data=data||jsonb_build_object('cloudCorners','${JSON.stringify(Array.from({length:24},(_,i)=>bedCorner(i)))}'::jsonb) where key='rewards';`,helper=readFileSync(new URL('./reward-cloud.sql',import.meta.url),'utf8');
 const defs=[];for(const signature of ['town.grown(jsonb,bigint)','town.see(text,jsonb,bigint)']){
  const before=(await db.query('select pg_get_functiondef($1::regprocedure) d',[signature])).rows[0].d;
  const after=signature.includes('grown')?before.replace('else town.wet_ms(p.sown, p_now)::double precision end)','else (town.wet_ms(p.sown, p_now)+town.local_rain_ms(p_plant,p_now))::double precision end)'):before.replace('or town.raining(p_now));',"or town.raining(p_now) or coalesce((p->'localRain'->>'from')::bigint<=p_now and p_now<(p->'localRain'->>'until')::bigint,false));");
  if(after===before)throw Error('Growth/seeing definition moved');defs.push({signature,before,after});
 }
 await db.exec(catalog);await db.exec(helper);for(const d of defs)await db.exec(d.after);await db.exec(patched);
 const normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
 const guards=[{signature:sig,before:original,after:normalized},...defs].map(d=>`if md5(replace(pg_get_functiondef('${d.signature}'::regprocedure),chr(13),'')) not in ('${digest(d.before)}','${digest(d.after)}') then raise exception 'Definition moved: ${d.signature}; rebuild v225';end if;`).join('\n');
 writeFileSync('supabase/v225_a_cloud_over_consenting_gardens.sql',`-- v225: ten-minute local clouds for up to three consenting beds, one real special bucketful.
-- Run after v224 with the matching site. One finished rhythm attempt/day, six stamina, even on a miss.
-- Consent lasts ten minutes and can be revoked. Rechecked after locking the actual beds.
-- Existing roots only, each root once/day. Water nature applies once; no world weather, XP, or rain-trigger writes.
-- Elapsed local rain excludes natural rain and moist soil. Plant identity and shared bed locks prevent duplicate effects.
-- Rerunnable. Installation moves no player resources.
begin;do $guard$ begin ${guards} end $guard$;
${catalog}\n${helper}\n${defs.map(d=>d.after+';').join('\n')}\n${patched};
revoke all on function public.town_reward(uuid,jsonb) from public,anon,authenticated;grant execute on function public.town_reward(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';commit;
select jsonb_build_object('private',not has_table_privilege('authenticated','town.reward_cloud_consents','SELECT'),'bounded',(select count(*)<=24 from town.reward_cloud_consents)) as v225_verified;
`);console.log('Generated root-specific consenting local clouds v225.');
}catch(e){console.error(e.stack,e.where??'');process.exitCode=1;}finally{await db.close();}
