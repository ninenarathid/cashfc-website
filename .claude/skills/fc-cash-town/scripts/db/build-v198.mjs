// Additive catalog patch: never rebuild already-installed gameplay functions.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
await import('./repo-ts-town.mjs');
const { catalogOf } = await import('@/lib/town/catalog');
const { REGIONAL_FISH, REGIONAL_DISHES, REGIONAL_ITEMS, REGIONAL_SCROLL_ITEMS, REGIONAL_SCROLLS } = await import('@/lib/town/regional-fish');
const root=process.env.FC_REPO??process.cwd(),cat=catalogOf(),fish=Object.keys(REGIONAL_FISH),dishes=Object.keys(REGIONAL_DISHES);
const j=v=>`$regional$${JSON.stringify(v)}$regional$::jsonb`,pick=(row,ids)=>Object.fromEntries(ids.map(id=>[id,row[id]]));
const merge=(key,value)=>`update public.town_catalog set data=data||${j(value)},updated_at=now() where key='${key}';`;
const nested=(key,route,value)=>`update public.town_catalog set data=jsonb_set(data,'{${route}}',coalesce(data#>'{${route}}','{}'::jsonb)||${j(value)}),updated_at=now() where key='${key}';`;
const append=(key,route,values)=>`update public.town_catalog set data=jsonb_set(data,'{${route}}',coalesce(data#>'{${route}}','[]'::jsonb)||coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${j(values)}) with ordinality q(v,ord) where not (coalesce(data#>'{${route}}','[]'::jsonb) @> jsonb_build_array(v))),'[]'::jsonb)),updated_at=now() where key='${key}';`;
const sql=`-- v198: twenty exclusive species in each regional habitat, and six meals each.
-- Run after v197 and the matching site deploy. Safe to run twice.
-- Adds 51 fish, 18 dishes and their companion scrolls. Existing purses and functions are preserved.
begin;
do $guard$ begin
 if to_regprocedure('town.river_odds(text,integer,boolean,boolean,boolean,text[],double precision,text,text)') is null
    or not coalesce(town.cat('fish') ? 'creekDace',false) then raise exception 'Run v182 first';end if;
 if not coalesce(town.cat('items') ? 'prepBoard',false) or town.cat('camps') is null then raise exception 'Run v197 first';end if;
 if (select count(*) from public.town_catalog where key in ('items','fish','dishes','fishing','cooking','hints','work','scrolls'))<>8 then raise exception 'Required catalogs missing';end if;
end $guard$;
${[
 merge('items',pick(cat.items,Object.keys({...REGIONAL_ITEMS,...REGIONAL_SCROLL_ITEMS}))),merge('fish',pick(cat.fish,fish)),merge('dishes',pick(cat.dishes,dishes)),merge('scrolls',REGIONAL_SCROLLS),
 append('fishing','fish',fish),append('cooking','recipes',dishes),append('cooking','bowled',dishes),nested('cooking','needs',pick(cat.cooking.needs,dishes)),
 append('hints','ids',cat.hints.ids.filter(([id])=>dishes.includes(id))),nested('work','fishing',pick(cat.work.fishing,fish)),nested('work','kitchen,pot',pick(cat.work.kitchen.pot,dishes)),
].join('\n')}
notify pgrst,'reload schema';
commit;
-- Expected: creek 20, headwater 20, pool 20 (shared species are additional).
select f.value->'habitat'->>0 habitat,count(*) exclusive_species
from public.town_catalog c,jsonb_each(c.data) f
where c.key='fish' and jsonb_array_length(coalesce(f.value->'habitat','[]'::jsonb))=1
 and f.value->'habitat'->>0 in ('creek','headwater','pool')
group by 1 order by 1;
`;
writeFileSync(join(root,'supabase/v198_twenty_fish_for_each_water.sql'),sql);
console.log(JSON.stringify({fish:fish.length,dishes:dishes.length,sqlBytes:Buffer.byteLength(sql)}));
