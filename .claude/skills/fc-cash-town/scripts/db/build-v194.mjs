// Offline, guarded migration generator. Recipes are private functions, never catalog data.
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { comboDB } from './combo-db.mjs';
await import('./repo-ts-town.mjs');
const { SECRET_RULES } = await import('@/lib/town/private/combos');
const db = await comboDB();
const signatures = ['public.town_fell_begin(integer,integer,integer)','public.town_cast(text,integer,integer,boolean,text,text)','public.town_land(text,jsonb)','town.mine_pay(jsonb,jsonb,jsonb,jsonb,boolean,boolean,text)'];
const defs = await Promise.all(signatures.map(async s => (await db.query('select pg_get_functiondef($1::regprocedure) d',[s])).rows[0].d.replaceAll('\r','')));
const replace = (s,a,b) => { if(!s.includes(a)) throw Error('Definition moved: '+a); return s.replace(a,b); };
const helpers = `
create or replace function town.combo_rules() returns jsonb language sql immutable set search_path='' as $rules$
 select $json$${JSON.stringify(SECRET_RULES)}$json$::jsonb
$rules$;
create or replace function town.combo_loadout(p jsonb) returns text language sql stable set search_path='' as $$
 select replace(jsonb_build_array(coalesce((select jsonb_agg(v order by v) from jsonb_array_elements(g->'charms') v),'[]'::jsonb),g->'familiar')::text,', ', ',') from (select town.gifts_of(p) g) q
$$;
create or replace function town.combo_match(p jsonb,r jsonb) returns boolean language sql stable set search_path='' as $$
 select jsonb_array_length(r->'requires') between 2 and 3
 and jsonb_array_length(r->'requires')=(select count(distinct id) from jsonb_array_elements_text(r->'requires') id)
 and not exists(select 1 from jsonb_array_elements_text(r->'requires') id where not town.gift_works(p,id) or coalesce(town.cat('gifts')->'gifts'->id->>'kind','') not in ('charm','familiar'))
$$;
create or replace function town.combo_cue(p jsonb,c text) returns text language sql stable set search_path='' as $$
 select r->>'cue' from jsonb_array_elements(town.combo_rules()) r where town.combo_match(p,r) and
 (c='wear' or c='wood' and r->>'key'='SC02' or c='cavity' and r->>'key'='SC03' or c='echo' and r->>'key'='SC11') limit 1
$$;
create or replace function town.combo_grant(p jsonb,k text,a text,t bigint,e jsonb) returns jsonb language plpgsql stable set search_path='' as $$
declare r jsonb; s jsonb:=coalesce(p->'combos','{}'::jsonb); found jsonb:=coalesce(s->'found','[]'::jsonb); used jsonb:=coalesce(s->'used','{}'::jsonb); acts jsonb:=coalesce(s->'actions','{}'::jsonb); old jsonb:=acts->a; fresh boolean; d bigint:=floor((t+7200000)::numeric/86400000); n integer; pool text;
begin
 select v into r from jsonb_array_elements(town.combo_rules()) v where v->>'key'=k;
 if r is null or a is null or length(a)<1 or length(a)>180 or not town.combo_match(p,r) then return town.no('none'); end if;
 if old is not null then return case when old->>'key'=k then jsonb_build_object('ok',true,'purse',p,'effect',(old-'key'-'at')||jsonb_build_object('fresh',false)) else town.no('none') end; end if;
 pool:=r->>'pool'; n:=case when (used->pool->>'day')::bigint=d then coalesce((used->pool->>'n')::integer,0) else 0 end;
 if r ? 'cap' and n >= (r->>'cap')::integer then return town.no('none'); end if;
 fresh:=not exists(select 1 from jsonb_array_elements(found) v where v->>'key'=k);
 if fresh then found:=found||jsonb_build_array((r-'pool'-'cap')||jsonb_build_object('at',t)); end if;
 if r ? 'cap' then used:=used||jsonb_build_object(pool,jsonb_build_object('day',d,'n',n+1)); end if;
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into acts from (select key,value from jsonb_each(acts) where t-(value->>'at')::bigint<86400000 order by (value->>'at')::bigint desc,key limit 63) q;
 acts:=acts||jsonb_build_object(a,e||jsonb_build_object('key',k,'cue',r->>'cue','at',t));
 s:=jsonb_build_object('found',found,'used',used,'actions',acts,'last',jsonb_build_object('key',k,'cue',r->>'cue','action',a,'at',t,'fresh',fresh));
 return jsonb_build_object('ok',true,'purse',p||jsonb_build_object('combos',s),'effect',e||jsonb_build_object('cue',r->>'cue','fresh',fresh));
end $$;
create or replace function town.combo_rescue(p jsonb,a text,t bigint,l text) returns jsonb language plpgsql stable set search_path='' as $$
declare k text;
begin
 if l is distinct from town.combo_loadout(p) then return town.no('none'); end if;
 k:=case when town.gift_works(p,'charmLine') then 'SC13' else 'SC01' end;
 return town.combo_grant(p,k,a,t,jsonb_build_object('resume',case when k='SC13' then 0.35 else 0.20 end));
end $$;
revoke all on function town.combo_rules(),town.combo_loadout(jsonb),town.combo_match(jsonb,jsonb),town.combo_cue(jsonb,text),town.combo_grant(jsonb,text,text,bigint,jsonb),town.combo_rescue(jsonb,text,bigint,text) from public,anon,authenticated;

create or replace function public.town_combo(p_context text,p_input jsonb default '{}'::jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=town.member(); t bigint:=town.now_ms(); p jsonb; grove jsonb; target jsonb; a text; k text; e jsonb; did jsonb; tree integer; i integer; side integer; hints integer;
begin
 if p_context not in ('wear','wood','cavity','echo') or p_context is null then return town.answer(me,town.no('none')); end if;
 -- Grove before purse, matching the felling deeds' lock order.
 if p_context='wood' then grove:=town.thing('grove',true); end if;
 p:=town.purse_of(me,true);
 if p_context='wear' then return town.answer(me,jsonb_build_object('ok',true,'cue',town.combo_cue(p,'wear'))); end if;
 if p_context='wood' then
  target:=grove->'goes'->(me::text);
  if target is null or t<(target->>'at')::bigint or t-(target->>'at')::bigint>45000 then return town.answer(me,town.no('none')); end if;
  if jsonb_typeof(p_input->'notches') is distinct from 'array' then return town.answer(me,town.no('none')); end if;
  if jsonb_array_length(p_input->'notches')<>3 or exists(select 1 from jsonb_array_elements(p_input->'notches') v where v not in ('-1'::jsonb,'1'::jsonb)) then return town.answer(me,town.no('none')); end if;
  tree:=(target->>'comboTree')::integer; hints:=coalesce((target->>'comboHints')::integer,0); k:='SC02';
  a:='wood:'||(target->>'at')||':'||tree;
  if p->'combos'->'actions' ? a then e:=(p->'combos'->'actions'->a)-'key'-'cue'-'at';
  else
   for i in 0..2 loop
    side:=case when ((abs(tree)::bigint % 16)>>i)&1=1 then 1 else -1 end;
    if i>=hints and (p_input->'notches'->>i)::integer<>side then e:=jsonb_build_object('index',i,'side',side); exit; end if;
   end loop;
  end if;
 else
  target:=p->'mine'->'vein';
  if jsonb_typeof(target) is distinct from 'object' or not (target ? 'geology') then return town.answer(me,town.no('none')); end if;
  a:='vein:'||(target->>'f')||':'||(target->>'rock')||':'||(target->>'turn')||':'||(target->>'seed')||':'||coalesce(target->>'again','false');
  if p_context='cavity' and not coalesce((target->'geology'->>'cavities')::boolean,false) then k:='SC03'; e:=jsonb_build_object('cavities',true);
  elsif p_context='echo' and not coalesce((target->'geology'->>'hint')::boolean,false) then k:='SC11'; e:=jsonb_build_object('echo',case when abs((target->>'seed')::bigint)%2=1 then 1 else -1 end); end if;
 end if;
 if e is null or target->>'comboLoadout' is distinct from town.combo_loadout(p) then return town.answer(me,town.no('none')); end if;
 did:=town.combo_grant(p,k,a,t,e);
 if coalesce((did->>'ok')::boolean,false) then perform town.keep_purse(me,did->'purse'); end if;
 return town.answer(me,did-'purse');
end $$;
revoke all on function public.town_combo(text,jsonb) from public,anon,authenticated;
grant execute on function public.town_combo(text,jsonb) to authenticated;
`;
let fell=replace(defs[0],"    perform town.keep_thing('grove', grove);",`    grove:=jsonb_set(grove,array['goes',me::text],(grove->'goes'->(me::text))||jsonb_build_object('comboLoadout',town.combo_loadout(purse),'comboTree',p_tree,'comboHints',did->'ask'->'grain'->'hints'));
    perform town.keep_thing('grove', grove);`);
let cast=replace(defs[1],"      'cast_at', now_,", "      'comboLoadout',town.combo_loadout(purse),'cast_at', now_,");
let land=replace(defs[2],'  drove jsonb;','  drove jsonb;\n  bond jsonb;');
land=replace(land,"* coalesce((line->>'rod')::double precision, 1::double precision)","* coalesce((line->>'rod')::double precision, 1::double precision) * (1-coalesce((line->>'comboResume')::double precision,0))");
land=replace(land,"        perform town.keep_purse(me, drove->'purse');",`        bond:=town.combo_rescue(drove->'purse','fish:'||(line->>'cast_at'),now_,line->>'comboLoadout');
        if coalesce((bond->>'ok')::boolean,false) then
          drove:=drove||jsonb_build_object('purse',bond->'purse');
          line:=line||jsonb_build_object('comboResume',bond->'effect'->'resume');
        end if;
        perform town.keep_purse(me, drove->'purse');`);
land=replace(land,"'back', false, 'again', true));","'back', false, 'again', true) || case when coalesce((bond->>'ok')::boolean,false) then jsonb_build_object('combo',bond->'effect') else '{}'::jsonb end);");
let mine=replace(defs[3],"      'geology', town.geology_mods(p_purse,now_),","      'comboLoadout',town.combo_loadout(p_purse),'geology', town.geology_mods(p_purse,now_),");
const changed=[fell,cast,land,mine];
await db.exec(helpers+'\n'+changed.join(';\n')+';');
const after=await Promise.all(signatures.map(async s=>(await db.query('select pg_get_functiondef($1::regprocedure) d',[s])).rows[0].d));
const md5=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
const guard=`do $guard$ begin\n${signatures.map((s,i)=>` if md5(replace(pg_get_functiondef('${s}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(after[i])}') then raise exception 'Definition changed: ${s}; rebuild v194'; end if;`).join('\n')}\nend $guard$;`;
writeFileSync('supabase/v194_secret_equipment_bonds.sql',`-- v194: five private equipment bonds, discovered through play.
-- Requires v180-v182 and v184-v185; preserves their gameplay and catalog. Safe to run twice.
-- Run with the matching site. No purse, inventory, progression or catalog is reset.
begin;
${guard}
${helpers}
${changed.join(';\n')};
notify pgrst,'reload schema';
commit;
select has_function_privilege('anon','public.town_combo(text,jsonb)','EXECUTE') as anon_combo,
has_function_privilege('authenticated','public.town_combo(text,jsonb)','EXECUTE') as member_combo,
has_function_privilege('authenticated','town.combo_rules()','EXECUTE') as private_recipes;
`);
await db.close();
console.log('Built v194 with checked baseline and resulting function hashes.');
