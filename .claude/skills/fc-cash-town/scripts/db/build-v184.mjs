// Full definitions are exported from the consecutive baseline. Pending fishing files do not change these functions.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
await import('./repo-ts-town.mjs');
const { catalogOf } = await import('@/lib/town/catalog');
const { WOOD_ITEMS, WOOD_SCROLL_ITEMS, WOOD_SCROLLS, WOOD_MAKES, WOOD_DISHES, WOOD_CRAFTS } = await import('@/lib/town/wood-items');
const { standIn } = await import('./stand-in.mjs');
const t = await standIn({ upTo: 179 });
const signatures = ['town.fell_begin(jsonb,jsonb,integer,integer,integer,bigint,bigint,text)', 'town.fell(jsonb,jsonb,text,jsonb,integer,integer,bigint,jsonb,text)', 'public.town_fell(jsonb,integer,integer)'];
const defs = await Promise.all(signatures.map(async sig => (await t.sql('select pg_get_functiondef($1::regprocedure) def', [sig])).rows[0].def.replaceAll('\r', '')));
const replace = (s, from, to) => { if (!s.includes(from)) throw new Error(`Definition moved: ${from}`); return s.replace(from, to); };
let begun = replace(defs[0], "      'spent', spent_));", "      'grain', town.wood_mods(p_purse, p_now) || jsonb_build_object('tree',p_tree),\n      'spent', spent_));");
let fell = replace(defs[1], '  key_ text;\nbegin', `  key_ text;
  quality_ text;
begin
  if p_went ? 'grain' and (not town.wood_choice(p_went->'grain') or jsonb_typeof(p_went->'misses') is distinct from 'number') then return town.no('none'); end if;
  if p_went ? 'grain' and ((p_went->>'misses')::numeric <> floor((p_went->>'misses')::numeric) or (p_went->>'misses')::numeric not between 0 and 1000) then return town.no('none'); end if;`);
fell = replace(fell, '  kept := town.felling_of(mine);', "  if board_ and p_went ? 'grain' then quality_ := town.wood_quality((first_->>0)::integer,p_went->'grain',misses,p_purse,p_now); end if;\n  kept := town.felling_of(mine);");
fell = replace(fell, '    felled := felled ||', `    if quality_ is not null then got_ := got_ || town.wood_yield(town.tree_elder(t),p_went->'grain'->>'part',quality_,p_purse); end if;
    felled := felled ||`);
fell = replace(fell, "      || case when ks is not null then", "      || case when quality_ is not null then jsonb_build_object('quality',quality_) else '{}'::jsonb end\n      || case when ks is not null then");
let rpc = replace(defs[2], '  -- the village\'s row first', `  -- Grain is judged by the private rule, before any village or purse write.
  if said ? 'grain' then
    if not town.wood_choice(said->'grain') or jsonb_typeof(said->'misses') is distinct from 'number' then return town.answer(me,town.no('none')); end if;
    if (said->>'misses')::numeric <> floor((said->>'misses')::numeric) or (said->>'misses')::numeric not between 0 and 1000 then return town.answer(me,town.no('none')); end if;
    went := went || jsonb_build_object('grain',said->'grain');
  end if;
  -- the village's row first`);
rpc = replace(rpc, "'girth', f->'girth', 'timber', f->'timber')", "'girth', f->'girth', 'timber', f->'timber') || case when f ? 'quality' then jsonb_build_object('quality',f->'quality','part',went->'grain'->'part') else '{}'::jsonb end");
const helpers = `create or replace function town.wood_choice(p_choice jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
 if jsonb_typeof(p_choice) is distinct from 'object' or jsonb_typeof(p_choice->'notches') is distinct from 'array' then return false; end if;
 return coalesce(jsonb_array_length(p_choice->'notches') = 3
   and p_choice->'notches'->0 in ('-1'::jsonb,'1'::jsonb) and p_choice->'notches'->1 in ('-1'::jsonb,'1'::jsonb) and p_choice->'notches'->2 in ('-1'::jsonb,'1'::jsonb)
   and p_choice->'direction' in ('-1'::jsonb,'1'::jsonb) and p_choice->>'part' in ('wood','bark','sap','seed','root'),false);
end $$;
create or replace function town.wood_mods(p_purse jsonb,p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_object('hints',greatest(case when town.has_buff(p_purse,p_now,'grain') then 3 else 0 end,
   case when town.held(p_purse->'bag','grainLens') > 0 then (k->'hints'->>'grainLens')::integer when town.held(p_purse->'bag','notchGauge') > 0 then (k->'hints'->>'notchGauge')::integer else 0 end),
   'direction',town.held(p_purse->'bag','fellingWedge') > 0,'buffered',town.held(p_purse->'bag','braceStake') > 0) from (select town.cat('woodcutting') k) q
$$;
create or replace function town.wood_quality(p_tree integer,p_choice jsonb,p_misses numeric,p_purse jsonb,p_now bigint)
returns text language sql stable set search_path = '' as $$
 select case when hits = 4 and misses = 0 then 'heart' when hits >= 3 and misses <= 1 then 'clear' else 'rough' end from (
   select (select count(*) from generate_series(0,3) i where (case when i=3 then p_choice->>'direction' else p_choice->'notches'->>i end)::integer = case when ((abs(p_tree)::bigint % 16) >> i) & 1 = 1 then 1 else -1 end) hits,
     greatest(0,p_misses-case when town.held(p_purse->'bag','braceStake') > 0 then (town.cat('woodcutting')->>'brace')::integer else 0 end) misses
 ) q
$$;
create or replace function town.wood_yield(p_elder boolean,p_part text,p_quality text,p_purse jsonb)
returns jsonb language sql stable set search_path = '' as $$
 select jsonb_build_array(jsonb_build_array(
   case p_part when 'wood' then case when p_elder then 'cedarSliver' when p_quality='heart' then 'heartwood' when p_quality='clear' then 'straightWood' else 'knottedWood' end when 'bark' then 'pineBark' when 'sap' then 'pinePitch' when 'seed' then 'pineNut' else 'rootFiber' end,
   case p_part when 'wood' then case when p_elder then 1 else (k->'quality'->>p_quality)::integer end when 'bark' then case when town.held(p_purse->'bag','barkKnife') > 0 then (k->'parts'->>'barkKnife')::integer else 1 end when 'sap' then case when town.held(p_purse->'bag','sapTap') > 0 then (k->'parts'->>'sapTap')::integer else 1 end else case when p_quality='rough' then 1 else 2 end end)) from (select town.cat('woodcutting') k) q
$$;
revoke all on function town.wood_choice(jsonb),town.wood_mods(jsonb,bigint),town.wood_quality(integer,jsonb,numeric,jsonb,bigint),town.wood_yield(boolean,text,text,jsonb) from public,anon,authenticated;
`;
const cat = catalogOf(), pick = (row, ids) => Object.fromEntries(ids.map(id => [id,row[id]]));
const json = v => `$wood$${JSON.stringify(v)}$wood$::jsonb`;
const root = (key,value) => `update public.town_catalog set data=data || ${json(value)},updated_at=now() where key='${key}';`;
const merge = (key,route,value) => `update public.town_catalog set data=jsonb_set(data,'{${route}}',coalesce(data #> '{${route}}','{}'::jsonb) || ${json(value)}),updated_at=now() where key='${key}';`;
const append = (key,route,ids) => `update public.town_catalog set data=jsonb_set(data,'{${route}}',coalesce(data #> '{${route}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${route}}' @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const made = [...Object.keys(WOOD_MAKES),...Object.keys(WOOD_DISHES)];
const patches = [root('items',pick(cat.items,[...Object.keys(WOOD_ITEMS),...Object.keys(WOOD_SCROLL_ITEMS)])),root('scrolls',WOOD_SCROLLS),root('makes',pick(cat.makes,Object.keys(WOOD_MAKES))),root('dishes',pick(cat.dishes,Object.keys(WOOD_DISHES))),merge('stamina','buffs',{grain:cat.stamina.buffs.grain}),merge('stamina','steps',{grain:cat.stamina.steps.grain}),append('cooking','recipes',made),merge('cooking','needs',pick(cat.cooking.needs,made)),append('cooking','bowled',Object.keys(WOOD_DISHES)),append('cooking','putIn,also',cat.cooking.putIn.also.filter(id=>id in WOOD_ITEMS)),append('hints','ids',cat.hints.ids.filter(([id])=>made.includes(id))),merge('work','kitchen,pot',pick(cat.work.kitchen.pot,made)),`insert into public.town_catalog(key,data) values('woodcutting',${json(cat.woodcutting)}) on conflict(key) do update set data=excluded.data,updated_at=now();`];
patches.push(merge('workshop','recipes',pick(cat.workshop.recipes,Object.keys(WOOD_CRAFTS))));
const newer = [begun,fell,rpc], md5=s=>createHash('md5').update(s.replaceAll('\r','')).digest('hex');
// Ask Postgres for its canonical rendering of the changed declarations, rather than hashing handwritten headers.
await t.run(patches.join('\n')+'\n'+helpers+'\n'+newer.join(';\n')+';', 'derive v184 hashes');
const after = await Promise.all(signatures.map(async sig=>(await t.sql('select pg_get_functiondef($1::regprocedure) def',[sig])).rows[0].def));
const guard = `do $guard$ begin
 if town.cat('fishing')->'waters' is null or town.cat('workshop') is null then raise exception 'Run v180 through v182 first'; end if;
 ${signatures.map((sig,i)=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(defs[i])}','${md5(after[i])}') then raise exception 'Definition changed: ${sig}; rebuild v184'; end if;`).join('\n ')}
end $guard$;`;
writeFileSync(join(process.env.FC_REPO,'supabase/v184_reading_the_grain_before_the_axe.sql'),`-- v184: reading the grain, selecting a trunk's parts, and 25 useful woodcutting items.
-- Run after v180-v182 and the matching site deploy. v183 may already have run. Safe to run twice.
-- Full definitions preserve tree ownership, echo groups, lost games, stamina and atomic bag capacity.
begin;
${guard}
${patches.join('\n')}
${helpers}
${newer.join(';\n')};
notify pgrst,'reload schema';
commit;
-- Expected: 25 new woodcutting items; the helper is private. No existing purse is changed by installation.
select data from public.town_catalog where key='woodcutting';
select has_function_privilege('authenticated','town.wood_yield(boolean,text,text,jsonb)','EXECUTE') as helper; -- false
`);
await t.db.close();
console.log('Wrote guarded v184 woodcutting migration.');
