import {readFileSync,readdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tier10DB} from './tier10-db.mjs';
await import('./repo-ts-town.mjs');
const {SECRET_RULES}=await import('@/lib/town/private/combos'),db=await tier10DB(),digest=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
try{
 for(const n of [207,208,209,210])await db.exec(readFileSync('supabase/'+readdirSync('supabase').find(f=>f.startsWith(`v${n}_`)),'utf8'));
 const rulesSig='town.combo_rules()',helperSig='town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)';
 const originalRules=(await db.query('select pg_get_functiondef($1::regprocedure) d',[rulesSig])).rows[0].d,original=(await db.query('select pg_get_functiondef($1::regprocedure) d',[helperSig])).rows[0].d;
 const current=(await db.query('select town.combo_rules() r')).rows[0].r,newRules=[...current.filter(r=>r.key!=='SC15'),SECRET_RULES.find(r=>r.key==='SC15')];
 const registry=`create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$ select '${JSON.stringify(newRules).replaceAll("'","''")}'::jsonb $rules$;`;
 const correction=`
 if not won and kind_='color' and not coalesce((run_->>'correctionUsed')::boolean,false) and run_->>'loadout'=town.combo_loadout(p)
  and town.used_of(p,gift_,t)<(town.cat('gifts')->'uses'->gift_->>'n')::integer then
  used:=town.combo_grant(p,'SC15','color:'||(run_->>'id'),t,'{}'::jsonb);
  if used->'ok'='true'::jsonb then
   run_:=run_||jsonb_build_object('began',t,'correctionUsed',true);
   return jsonb_build_object('ok',true,'resource',run_,'correction',true,'combo',used->'effect','purse',used->'purse'||jsonb_build_object('professionRewards',coalesce(used->'purse'->'professionRewards','{}'::jsonb)||jsonb_build_object('resource',run_)));
  end if;
 end if;
`;
 const marker=' if won then for need in select value from jsonb_array_elements(r->\'needs\') loop',patched=original.replace(marker,correction+marker);
 if(patched===original)throw Error('Resource activity moved');
 await db.exec(registry);await db.exec(patched);
 const normalizedRules=(await db.query('select pg_get_functiondef($1::regprocedure) d',[rulesSig])).rows[0].d,normalized=(await db.query('select pg_get_functiondef($1::regprocedure) d',[helperSig])).rows[0].d;
 writeFileSync('supabase/v211_a_light_that_remembers_the_colours.sql',`-- v211: a private equipment bond can offer one correction within the same gem-colour batch.
-- Run after v210 with the matching site. Safe to run twice; no automatic discoveries or rewards.
begin;
do $guard$ begin
 if md5(replace(pg_get_functiondef('${rulesSig}'::regprocedure),chr(13),'')) not in ('${digest(originalRules)}','${digest(normalizedRules)}') then raise exception 'Private rules changed: rebuild v211 on current text';end if;
 if md5(replace(pg_get_functiondef('${helperSig}'::regprocedure),chr(13),'')) not in ('${digest(original)}','${digest(normalized)}') then raise exception 'Resource activity changed: rebuild v211 on current text';end if;
end $guard$;
${registry}
${patched};
revoke all on function town.combo_rules(),town.reward_resource(jsonb,uuid,jsonb,bigint,bigint) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
select jsonb_build_object('rules_private',not has_function_privilege('authenticated','town.combo_rules()','EXECUTE'),'helper_private',not has_function_privilege('authenticated','town.reward_resource(jsonb,uuid,jsonb,bigint,bigint)','EXECUTE')) as v211_verified;
`);console.log('Generated v211: one action-bound correction, private registry, original resource/output limits.');
}catch(e){console.error(e.message);process.exitCode=1;}finally{await db.close();}
