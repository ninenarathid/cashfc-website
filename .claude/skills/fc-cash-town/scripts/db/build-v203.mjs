// Run beside the local PGlite harness with FC_REPO set. No live database access.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { standIn } from './stand-in.mjs';
import { migration } from './pglite-harness.mjs';
await import('./repo-ts-town.mjs');
const { PASSIVE_EQUIPMENT } = await import('@/lib/town/passive-equipment');
const ids = Object.keys(PASSIVE_EQUIPMENT);
const hash = s => createHash('md5').update(s.replaceAll('\r','')).digest('hex');
const t = await standIn();
const get = async sig => (await t.sql('select pg_get_functiondef($1::regprocedure) d',[sig])).rows[0].d;
const once = (s, from, to) => {
 if (s.split(from).length !== 2) throw new Error('Expected one match: '+from);
 return s.replace(from,to);
};
try {
 for (const n of [180,181,182,183,184,185,186,187,188,194,195,196,197,198]) await t.sql(migration(n));
 const helpers = `create or replace function town.passive_equipment()
returns jsonb language sql immutable set search_path = '' as $$
 select '${JSON.stringify(ids)}'::jsonb
$$;
create or replace function town.carried_bag(p_purse jsonb)
returns jsonb language sql immutable set search_path = '' as $$
 select coalesce(p_purse->'bag','[]'::jsonb) || coalesce((
   select jsonb_agg(jsonb_build_object('item',id,'n',1) order by ord)
   from (select id,min(ord) ord from jsonb_array_elements_text(coalesce(p_purse->'wears','[]'::jsonb)) with ordinality w(id,ord)
     where town.passive_equipment() ? id group by id) worn), '[]'::jsonb)
$$;
revoke all on function town.passive_equipment(), town.carried_bag(jsonb) from public, anon, authenticated;
`;
 await t.sql(helpers);
 const rows = (await t.sql("select p.oid::regprocedure::text sig, pg_get_functiondef(p.oid) d from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('town','public') and p.prokind='f'")).rows;
 const patches=[];
 for (const {sig,d} of rows) {
  const source=d.replaceAll('\r','');
  let next=source;
  // Literal possession checks only; never quantities paid, capacity or slot reads.
  next=next.replace(new RegExp("town\\.held\\((p_[a-z_]+)->'bag',\\s*'("+ids.join('|')+")'\\)",'g'),"town.held(town.carried_bag($1),'$2')");
  for (const id of ['sealedFlask','tastingSpoon','provisionChest']) {
   if (next.includes("town.held(bag,'"+id+"')")) next=once(next,"town.held(bag,'"+id+"')","town.held(town.carried_bag(p_purse),'"+id+"')");
  }
  if(sig==='town.fit_hook(jsonb,text)') next=once(next,"town.held(p_purse->'bag', p_item)","town.held(town.carried_bag(p_purse), p_item)");
  if(sig==='town.strike_window(jsonb,bigint)') next=once(next,"jsonb_array_elements(p_purse->'bag')","jsonb_array_elements(town.carried_bag(p_purse))");
  if(sig==='town.cook(jsonb,jsonb,jsonb,double precision,bigint)') next=once(next,"town.helpings(dish, p_crew, p_misses, p_purse->'bag')","town.helpings(dish, p_crew, p_misses, town.carried_bag(p_purse))");
  if(sig==='town.wear(jsonb,integer)') {
   next=once(next,"  if more is null then return town.no('none'); end if;",`  if more is null and town.passive_equipment() ? (s->>'item') then
    if (s - 'item' - 'n') <> '{}'::jsonb then return town.no('none'); end if;
    more := 0;
  end if;
  if more is null or jsonb_typeof(s->'n') is distinct from 'number' then return town.no('none'); end if;
  if (s->>'n')::numeric < 1 or (s->>'n')::numeric <> floor((s->>'n')::numeric) then return town.no('none'); end if;`);
  }
  if(sig==='town.take_off(jsonb,text)') {
   next=once(next,"  if more is null or not wears ? p_item then return town.no('none'); end if;",`  if more is null and town.passive_equipment() ? p_item then more := 0; end if;
  if more is null or not wears ? p_item then return town.no('none'); end if;
  if more = 0 then
    if town.room(p_purse->'bag',p_item) < 1 then return town.no('full'); end if;
    return jsonb_build_object('ok',true,'purse',p_purse || jsonb_build_object(
      'bag',town.put(p_purse->'bag',p_item,1),'wears',(select coalesce(jsonb_agg(w order by ord),'[]'::jsonb)
        from jsonb_array_elements(wears) with ordinality y(w,ord) where w <> to_jsonb(p_item))));
  end if;`);
  }
  if(next!==source) {
   next=once(next,'AS $function$\n','AS $function$\n-- v203: passive equipment, outside the physical bag.\n');
   await t.sql(next);
   patches.push({sig,old:hash(d),after:hash(await get(sig)),definition:next});
  }
 }
 if(patches.length!==18) throw new Error('Unexpected patch count '+patches.length+': '+patches.map(p=>p.sig));
 const guard=patches.map(p=>`  if md5(replace(pg_get_functiondef('${p.sig}'::regprocedure),chr(13),'')) not in ('${p.old}','${p.after}') then raise exception 'Definition changed: ${p.sig}; rebuild v203 on current text'; end if;`).join('\n');
 const sql=`-- v203: passive equipment frees its inventory slot and keeps its existing effects.
-- Run after v198 and the matching site deploy. Safe to run twice.
-- Players choose Equip in the bag. No automatic inventory moves, fees or stat increases.
-- Active tools and ingredients remain in the physical bag. Unequipping requires room.
begin;
do $guard$ begin
${guard}
end $guard$;
${helpers}
${patches.map(p=>'-- <'+p.sig+'>\n'+p.definition+';\n-- </'+p.sig+'>').join('\n\n')}
notify pgrst, 'reload schema';
commit;
select jsonb_build_object(
 'equipment_count',jsonb_array_length(town.passive_equipment()),
 'helper_private',not has_function_privilege('authenticated','town.carried_bag(jsonb)','EXECUTE'),
 'wear_ready',position('town.passive_equipment()' in pg_get_functiondef('town.wear(jsonb,integer)'::regprocedure))>0,
 'cook_ready',position('town.carried_bag(p_purse)' in pg_get_functiondef('town.cook(jsonb,jsonb,jsonb,double precision,bigint)'::regprocedure))>0
) as v203_verified;
`;
 writeFileSync(join(process.env.FC_REPO,'supabase/v203_passive_equipment_outside_the_bag.sql'),sql);
 console.log('Built v203: '+ids.length+' items, '+patches.length+' guarded definitions');
} finally { await t.db.close(); }
