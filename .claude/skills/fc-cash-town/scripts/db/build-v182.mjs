// Build against canonical definitions exported after v181. SQL remains a draft until its dry run passes.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
await import('./repo-ts-town.mjs');
const { catalogOf } = await import('@/lib/town/catalog');
const { RIVER_ITEMS, RIVER_FISH, RIVER_MAKES, RIVER_DISHES, RIVER_SCROLL_ITEMS, RIVER_SCROLLS } = await import('@/lib/town/river-items');
const path = join(process.env.FC_REPO, '.claude/skills/fc-cash-town/scripts/db/v182_river_draft.sql');
const { standIn } = await import('./stand-in.mjs');
const baseline = await standIn({upTo:179});
await baseline.run(readFileSync(join(process.env.FC_REPO,'.claude/skills/fc-cash-town/scripts/db/v181_fishing_draft.sql'),'utf8'),'v181 baseline');
const defs = [];
for (const signature of ['town.odds(text,integer,boolean,boolean,boolean,text[],double precision)','town.star_odds(boolean,boolean,text[],integer)','town_cast(text,integer,integer,boolean,text)']) {
 const row = (await baseline.sql('select pg_get_functiondef($1::regprocedure) def',[signature])).rows[0];
 defs.push({signature,def:row.def});
}
await baseline.db.close();
const get = sig => defs.find(d => d.signature === sig).def.replaceAll('\r', '');
const md5 = s => createHash('md5').update(s.replaceAll('\r', '')).digest('hex');
const cat = catalogOf();
const select = (row, ids) => Object.fromEntries(ids.map(id => [id, row[id]]));
const json = v => `$river$${JSON.stringify(v)}$river$::jsonb`;
const merge = (key, route, value) => `update public.town_catalog set data = jsonb_set(data, '{${route}}', coalesce(data #> '{${route}}', '{}'::jsonb) || ${json(value)}), updated_at = now() where key = '${key}';`;
const root = (key, value) => `update public.town_catalog set data = data || ${json(value)}, updated_at = now() where key = '${key}';`;
const append = (key, route, ids) => `update public.town_catalog set data = jsonb_set(data, '{${route}}', coalesce(data #> '{${route}}','[]'::jsonb) || coalesce((select jsonb_agg(v order by ord) from jsonb_array_elements(${json(ids)}) with ordinality a(v,ord) where not (data #> '{${route}}' @> jsonb_build_array(v))), '[]'::jsonb)), updated_at = now() where key = '${key}';`;
const fishIds = Object.keys(RIVER_FISH), madeIds = Object.keys(RIVER_MAKES), dishIds = Object.keys(RIVER_DISHES);
const patches = [root('items', select(cat.items,[...Object.keys(RIVER_ITEMS),...Object.keys(RIVER_SCROLL_ITEMS)])),root('scrolls',RIVER_SCROLLS),root('fish',select(cat.fish,fishIds)),root('makes',select(cat.makes,madeIds)),root('dishes',select(cat.dishes,dishIds)),
  merge('stamina','buffs',{current:cat.stamina.buffs.current}),merge('stamina','steps',{current:cat.stamina.steps.current}),
  append('fishing','fish',fishIds),append('fishing','baits',['shadeLure']),append('fishing','kept',['shadeLure']),merge('fishing','floats',{flowFloat:cat.fishing.floats.flowFloat}),merge('fishing','nets',{torrentNet:cat.fishing.nets.torrentNet}),
  merge('fishing','places',Object.fromEntries(Object.keys(cat.fishing.waters).map(key=>[key,cat.fishing.places[key]]))),
  merge('fishing','waters',cat.fishing.waters),append('cooking','recipes',[...madeIds,...dishIds]),merge('cooking','needs',select(cat.cooking.needs,[...madeIds,...dishIds])),append('cooking','bowled',dishIds), append('hints','ids',cat.hints.ids.filter(([id])=>madeIds.includes(id)||dishIds.includes(id))),
  merge('work','fishing',select(cat.work.fishing,fishIds)),merge('work','kitchen,pot',select(cat.work.kitchen.pot,[...madeIds,...dishIds]))];
const oldOdds = get('town.odds(text,integer,boolean,boolean,boolean,text[],double precision)');
const oldStar = get('town.star_odds(boolean,boolean,text[],integer)');
const oldCast = get('town_cast(text,integer,integer,boolean,text)');
const habitat = `    continue when not (coalesce(f->'habitat', '["town"]'::jsonb) ? p_habitat) or (f ? 'current' and not (f->'current' ? p_current));\n`;
const riverOdds = oldOdds.replace('town.odds(', 'town.river_odds(')
  .replace('p_luck double precision DEFAULT NULL::double precision)', 'p_luck double precision, p_habitat text, p_current text)')
  .replace(' STABLE\n',' STABLE\n SET search_path TO \'\'\n').replace('    f := fish->id;\n','    f := fish->id;\n' + habitat);
const riverStar = oldStar.replace('town.star_odds(', 'town.river_star_odds(')
  .replace('p_top integer)', 'p_top integer, p_habitat text, p_current text)')
  .replace(' STABLE\n',' STABLE\n SET search_path TO \'\'\n').replace('    f := fish->id;\n','    f := fish->id;\n' + habitat);
const oddsWrapper = `CREATE OR REPLACE FUNCTION town.odds(p_bait text, p_hour integer, p_rain boolean, p_lucky boolean, p_shallow boolean, p_signs text[], p_luck double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select town.river_odds(p_bait,p_hour,p_rain,p_lucky,p_shallow,p_signs,p_luck,'town','eddy')
$function$
`;
const starWrapper = `CREATE OR REPLACE FUNCTION town.star_odds(p_rain boolean, p_shallow boolean, p_signs text[], p_top integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select town.river_star_odds(p_rain,p_shallow,p_signs,p_top,'town','eddy')
$function$
`;
let cast = oldCast.replace('p_how text DEFAULT NULL::text)', 'p_how text DEFAULT NULL::text, p_current text DEFAULT NULL::text)')
 .replace("SET search_path TO 'public'", "SET search_path TO ''")
 .replace('  hour integer :=',`  water jsonb := town.cat('fishing')->'waters'->(p_x::text || ',' || p_y::text);
  habitat text := coalesce(water->>'habitat', 'town');
  current_ text := coalesce(p_current, water->>'current', 'eddy');
  pattern jsonb;
  hour integer :=`)
 .replace("  count_ := case when pair",`  if current_ not in ('eddy','run','shelter') or (habitat = 'town' and current_ <> 'eddy') or (habitat = 'pool' and current_ = 'run') then return town.answer(me,town.no('none')); end if;
  pattern := town.river_pattern(purse,p_bait,p_x,p_y,current_,now_);
  count_ := case when pair`)
 .replace('then town.star_odds(', 'then town.river_star_odds(').replace('town.shelf_top())','town.shelf_top(), habitat, current_)')
 .replace('else town.odds(', 'else town.river_odds(').replace("town.buff_by(purse, now_, 'lucky')) end;","town.buff_by(purse, now_, 'lucky'), habitat, current_) end;\n  if habitat <> 'town' then odds := town.river_pattern_odds(odds,(pattern->>'n')::integer); end if;")
 .replace("  perform town.keep_purse(me, did->'purse');",`  perform town.keep_purse(me, did->'purse' || case when habitat <> 'town' then jsonb_build_object('fishingPattern',pattern) else '{}'::jsonb end);`)
 .replace("'bait', bait, 'x', p_x, 'y', p_y, 'deep', deep", "'bait', bait, 'x', p_x, 'y', p_y, 'habitat', habitat, 'current', current_, 'deep', deep");
const helpers = `create or replace function town.river_pattern(p_purse jsonb,p_bait text,p_x integer,p_y integer,p_current text,p_now bigint)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('key',key_,'n',case when p_purse->'fishingPattern'->>'key' = key_ and p_now >= (p_purse->'fishingPattern'->>'at')::numeric and p_now - (p_purse->'fishingPattern'->>'at')::numeric < 900000 then least(6,(p_purse->'fishingPattern'->>'n')::integer+1) else 1 end,'at',p_now)
  from (select p_x::text || ',' || p_y::text || ':' || p_current || ':' || p_bait key_) q
$$;
create or replace function town.river_pattern_odds(p_odds jsonb,p_n integer)
returns jsonb language sql stable set search_path = '' as $$
  select case when p_n < 4 then p_odds else coalesce((select jsonb_agg(jsonb_build_object('what',what_,'p',weight_ / total_) order by ord) from (
    select *,sum(weight_) over () total_ from (select v->>'what' what_,ord,(v->>'p')::double precision * case when town.cat('fish')->(v->>'what')->>'tier' in ('rare','legend') then 0.5 else 1 end weight_ from jsonb_array_elements(p_odds) with ordinality a(v,ord)) w
  ) s where total_ > 0),'[]'::jsonb) end
$$;
revoke all on function town.river_pattern(jsonb,text,integer,integer,text,bigint), town.river_pattern_odds(jsonb,integer), town.river_odds(text,integer,boolean,boolean,boolean,text[],double precision,text,text), town.river_star_odds(boolean,boolean,text[],integer,text,text) from public,anon,authenticated;
`;
const beforeSig='public.town_cast(text,integer,integer,boolean,text)', afterSig='public.town_cast(text,integer,integer,boolean,text,text)';
const guard = `do $guard$ begin
 if to_regprocedure('${afterSig}') is null then
  if md5(replace(pg_get_functiondef('${beforeSig}'::regprocedure),chr(13),'')) <> '${md5(oldCast)}' then raise exception 'Definition changed: town_cast; rebuild v182'; end if;
 elsif md5(replace(pg_get_functiondef('${afterSig}'::regprocedure),chr(13),'')) <> '${md5(cast)}' then raise exception 'Definition changed: town_cast; rebuild v182'; end if;
 ${[['town.odds(text,integer,boolean,boolean,boolean,text[],double precision)',oldOdds,oddsWrapper],['town.star_odds(boolean,boolean,text[],integer)',oldStar,starWrapper]].map(([sig,before,after])=>`if md5(replace(pg_get_functiondef('${sig}'::regprocedure),chr(13),'')) not in ('${md5(before)}','${md5(after)}') then raise exception 'Definition changed: ${sig}; rebuild v182'; end if;`).join('\n ')}
end $guard$;
`;
writeFileSync(path,`-- DRAFT v182: regional fishing, 25 items and reading the current. Run after v181 and matching site.
-- Existing catalog entries, bags, coins and achievements remain. Run twice is safe.
begin;
${guard}
-- New entries are merged without replacing existing rules.
${patches.join('\n')}
${riverOdds};
${riverStar};
${helpers}
${oddsWrapper};
${starWrapper};
${cast};
drop function if exists public.town_cast(text,integer,integer,boolean,text);
revoke all on function public.town_cast(text,integer,integer,boolean,text,text) from public,anon;
grant execute on function public.town_cast(text,integer,integer,boolean,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
`);
console.log('Wrote v182 river draft');
