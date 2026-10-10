import {writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {standIn} from './stand-in.mjs';
await import('./repo-ts-town.mjs');
const {catalogOf}=await import('@/lib/town/catalog');
const {FORAGE_ITEMS,FORAGE_MAKES,FORAGE_DISHES,FORAGE_SCROLL_ITEMS,FORAGE_SCROLLS,FORAGE_CRAFTS}=await import('@/lib/town/foraging-items');
const cat=catalogOf(),pick=(r,ids)=>Object.fromEntries(ids.map(id=>[id,r[id]])),json=v=>`$forage$${JSON.stringify(v)}$forage$::jsonb`;
const root=(key,v)=>`update public.town_catalog set data=data || ${json(v)},updated_at=now() where key='${key}';`;
const merge=(key,path,v)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','{}'::jsonb) || ${json(v)}),updated_at=now() where key='${key}';`;
const append=(key,path,ids)=>`update public.town_catalog set data=jsonb_set(data,'{${path}}',coalesce(data #> '{${path}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${path}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const made=[...Object.keys(FORAGE_MAKES),...Object.keys(FORAGE_DISHES)];
const table=`create table if not exists public.town_forest_rest (
 spot integer primary key check(spot>=0),begins bigint not null,ends bigint not null check(ends>begins)
);
alter table public.town_forest_rest enable row level security;
revoke all on public.town_forest_rest from public,anon,authenticated;
-- Only the serialized gathering RPC writes this shared ecological state.
`;
const helper=`
create or replace function town.gather_part(p_purse jsonb,p_spot integer,p_has jsonb,p_taken integer,p_mine boolean,p_hand text,p_x integer,p_y integer,p_misses double precision,p_wrong double precision,p_now bigint,p_part text,p_with text,p_lost boolean)
returns jsonb language plpgsql stable set search_path='' as $$
declare
 f jsonb:=town.cat('forest'); k jsonb:=town.cat('forest_parts'); spot jsonb:=town.wild_place(f,p_spot);
 rule jsonb:=town.wild_rule(f,spot->>0); item text; protected boolean; forgiven integer;
 n integer; book jsonb:=coalesce(p_purse->'forestPartsBook','[]'::jsonb); entry text; next_ bigint;
 rest jsonb;
begin
 if p_has is null or p_has='null'::jsonb or spot is null then return town.no('none'); end if;
 if coalesce(p_mine,false) then return town.no('had'); end if;
 if coalesce(p_taken,0)>=(rule->>'shares')::integer then return town.no('bare'); end if;
 if p_x is null or p_y is null or greatest(abs(p_x-(spot->>1)::integer),abs(p_y-(spot->>2)::integer))>town.wild_reach(p_purse,rule->>'how',p_now) then return town.no('far'); end if;
 if p_part is null or p_part not in ('leaf','root') or town.wild_secret(f,p_spot) or p_with is not null or coalesce(p_lost,false) then return town.no('none'); end if;
 item:=k->'parts'->(spot->>0)->>p_part;
 if item is null then return town.no('none'); end if;
 if p_part='root' and town.held(p_purse->'bag','rootSpade')<1 and not coalesce(f->'hoes' ? p_hand,false) then return town.no('tool'); end if;
 protected:=p_part='leaf' and town.held(p_purse->'bag','pruningKnife')>0
   or item='forestLichen' and town.held(p_purse->'bag','specimenPress')>0
   or item in ('berryPip','mushroomSpores') and town.held(p_purse->'bag','seedSieve')>0;
 forgiven:=case when town.held(p_purse->'bag','forageBasket')>0 then 1 else 0 end;
 n:=greatest(1,(k->>p_part)::integer+case when protected then (k->>'bonus')::integer else 0 end-greatest(0,floor(coalesce(p_misses,0)+coalesce(p_wrong,0))::integer-forgiven));
 if town.room(p_purse->'bag',item)<n then return town.no('full'); end if;
 entry:=(spot->>0)||':'||p_part||':'||item;
 if not book ? entry then book:=book||to_jsonb(entry); end if;
 if p_part='root' then
  next_:=((p_has->>'turn')::bigint+1)*(rule->>'every')::bigint*60000-floor(town.roll('phase',p_spot)*(rule->>'every')::double precision)::bigint*60000;
  rest:=jsonb_build_object('from',next_,'until',next_+60000*case when town.held(p_purse->'bag','rootSpade')>0 then (k->>'spadeMinutes')::bigint else (k->>'restMinutes')::bigint end);
 end if;
 return jsonb_build_object('ok',true,'got',jsonb_build_array(jsonb_build_array(item,n)),
   'purse',town.spend(p_purse,(rule->>'cost')::double precision,p_now)||jsonb_build_object('bag',town.put(p_purse->'bag',item,n),'forestPartsBook',book))
   ||case when rest is not null then jsonb_build_object('rest',rest) else '{}'::jsonb end;
end $$;
revoke all on function town.gather_part(jsonb,integer,jsonb,integer,boolean,text,integer,integer,double precision,double precision,bigint,text,text,boolean) from public,anon,authenticated;
`;
const t=await standIn({upTo:179});
const signatures=['public.town_gather(integer,integer,integer,jsonb)','town.wild_holds(integer,bigint,jsonb,text)'];
const defs=await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def.replaceAll('\r','')));
const swap=(s,a,b)=>{if(!s.includes(a))throw new Error('Definition moved: '+a);return s.replace(a,b);};
let rpc=swap(defs[0],"begin\n  if town.wild_place", "begin\n  perform 1 from public.town_purses pp where pp.member_id=me for update;\n  purse:=town.purse_of(me,true);\n  if town.wild_place");
const old="  did := town.gather(purse, p_spot, has, (t->>'n')::int, (t->>'mine')::boolean, town.hand_of(purse), p_x, p_y, misses, wrong, now_, with_, lost_);";
rpc=swap(rpc,old,`  if went->>'part' is not null and went->>'part'<>'whole' then
    did:=town.gather_part(purse,p_spot,has,(t->>'n')::integer,(t->>'mine')::boolean,town.hand_of(purse),p_x,p_y,misses,wrong,now_,went->>'part',with_,lost_);
  else
${old}
  end if;`);
rpc=swap(rpc,"    perform town.keep_purse(me, did->'purse');",`    if did ? 'rest' then
      insert into public.town_forest_rest(spot,begins,ends) values(p_spot,(did->'rest'->>'from')::bigint,(did->'rest'->>'until')::bigint)
        on conflict on constraint town_forest_rest_pkey do update set begins=case when town_forest_rest.ends<=now_ then excluded.begins else least(town_forest_rest.begins,excluded.begins) end,ends=greatest(town_forest_rest.ends,excluded.ends);
    end if;
    perform town.keep_purse(me, did->'purse');`);
rpc=swap(rpc,"perform town.note(me, 'gather', has->>'item'", "perform town.note(me, 'gather', did->'got'->0->>0");
const holds=swap(defs[1],"begin\n  if p_spot",`begin
  if exists(select 1 from public.town_forest_rest r where r.spot=p_spot and r.begins<=p_now and p_now<r.ends) then return null; end if;
  if p_spot`);
await t.sql(table);await t.sql(helper);
const revised=[rpc,holds];
const canonical=await Promise.all(revised.map(async(s,i)=>{await t.sql(s);return (await t.sql('select pg_get_functiondef($1::regprocedure) def',[signatures[i]])).rows[0].def.replaceAll('\r','');}));
const md5=s=>createHash('md5').update(s).digest('hex');
const guards=signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(canonical[i])}') then raise exception 'Definition changed: ${sig}; rebuild v188 on current text'; end if;`).join('\n');
await t.db.close();
const patches=[root('items',pick(cat.items,[...Object.keys(FORAGE_ITEMS),...Object.keys(FORAGE_SCROLL_ITEMS)])),root('makes',pick(cat.makes,Object.keys(FORAGE_MAKES))),root('dishes',pick(cat.dishes,Object.keys(FORAGE_DISHES))),root('scrolls',FORAGE_SCROLLS),merge('stamina','buffs',{traces:cat.stamina.buffs.traces}),merge('stamina','steps',{traces:cat.stamina.steps.traces}),append('cooking','recipes',made),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(FORAGE_DISHES)),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys(FORAGE_CRAFTS))),`insert into public.town_catalog(key,data) values('forest_parts',${json(cat.forest_parts)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
writeFileSync(join(process.env.FC_REPO,'supabase/v188_the_parts_a_forest_can_spare.sql'),`-- v188: forest traces, selected plant parts and shared recovery after uprooting.
-- Run after v187 and the matching site. Safe to run twice; inventories and coins are preserved.
-- Roots rest a site from its NEXT turn so current shares remain available to friends.
begin;
do $guard$ begin if town.cat('insect_garden') is null then raise exception 'Run v187 first'; end if; ${guards} end $guard$;
${patches.join('\n')}
${table}
${helper}
${revised.map(s=>s+';').join('\n')}
notify pgrst,'reload schema';
commit;
-- Expected: shared recovery state has RLS and no member or anonymous write access.
select relrowsecurity from pg_class where oid='public.town_forest_rest'::regclass;
select has_table_privilege('authenticated','public.town_forest_rest','INSERT') as member_write;
select data from public.town_catalog where key='forest_parts';
`);
console.log('Wrote v188 forest parts and shared recovery.');
