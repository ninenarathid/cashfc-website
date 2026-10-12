import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { rewardDB } from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const { linesRow } = await import('@/lib/town/line-points');
const db = await rewardDB(251), changed = [], old = new Map();
const signatureOf = async signature => (await db.query('select pg_get_functiondef($1::regprocedure) definition', [signature])).rows[0].definition.replace(/\r/g, '');
const replace = (body, before, after) => {
  if (body.split(before).length !== 2) throw Error('Expected one source anchor: ' + before);
  return body.replace(before, after);
};
const edit = async (signature, transform) => {
  const body = await signatureOf(signature); old.set(signature, body);
  const next = transform(body); await db.exec(next); changed.push({ signature, body: await signatureOf(signature) });
};
const helpers = `
-- Read only trusted pre-harvest root state; callers cannot supply these fields.
create or replace function town.harvest_work(p jsonb) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('picked',coalesce((p->>'picked')::integer,0),'giant',coalesce(p->'giant'='true'::jsonb,false),
  'started',town.day_of((p->>'sown')::bigint),'care',case when coalesce((p->>'watered')::bigint,0)>coalesce((p->>'pickedAt')::bigint,0) then 1 else 0 end + case when coalesce((p->>'fed')::bigint,0)>coalesce((p->>'pickedAt')::bigint,0) then 1 else 0 end)
$$;
create or replace function town.work_depth(doc jsonb) returns integer language sql immutable set search_path='' as $$
 select case when jsonb_typeof(doc->'floor')='number' and (doc->>'floor')::numeric=floor((doc->>'floor')::numeric)
  then case when (doc->>'floor')::numeric>=21 then 3 when (doc->>'floor')::numeric>=11 then 2 else 1 end else 1 end
$$;
create or replace function town.work_reserve(k jsonb,d integer,started integer default null) returns double precision language sql stable set search_path='' as $$
 select least(daily*days,case when coalesce((k->>'day')::integer,-1)<0 then daily*case when started is null then 1 else greatest(1,d-started+1) end
  else case when jsonb_typeof(k->'reserve')='number' then greatest(0,(k->>'reserve')::double precision) else greatest(0,daily-coalesce((k->>'today')::double precision,0)) end
   + greatest(0,d-(k->>'day')::integer)*daily end)
 from (select (town.cat('work')->'day'->>'farming')::double precision daily,(town.cat('work')->>'harvestBankDays')::integer days) c
$$;
create or replace function town.work_earned(line_ text,k jsonb,d integer) returns double precision language sql stable set search_path='' as $$
 select case when (k->>'day')::integer is distinct from d then 0 when k ? 'earned' then (k->>'earned')::double precision
  when line_='well' then (k->>'today')::double precision
  when line_='helpers' then least(200,greatest(0,(k->>'today')::double precision))+greatest(0,(k->>'today')::double precision-200)*(town.cat('work')->>'past')::double precision
  else town.work_counted_on(line_,0,(k->>'today')::double precision) end
$$;
revoke all on function town.harvest_work(jsonb),town.work_depth(jsonb),town.work_reserve(jsonb,integer,integer),town.work_earned(text,jsonb,integer) from public,anon,authenticated;
`;
const count = `create or replace function town.work_count(p_kept jsonb,p_c jsonb,p_day integer) returns jsonb language plpgsql stable set search_path='' as $$
declare
 first_ double precision:=(town.cat('work')->>'first')::double precision;
 on_ jsonb:=case when (p_kept->>'day')::integer=p_day then p_kept else p_kept||jsonb_build_object('day',p_day,'today',0,'held','{}'::jsonb)||case when p_kept ? 'earned' then '{"earned":0}'::jsonb else '{}'::jsonb end end;
 raw double precision:=greatest(0,(p_c->>'raw')::double precision);
 held jsonb:=on_->'held'; firsts jsonb:=on_->'firsts'; key_ text; had integer; reserve_ double precision; full_ double precision; gain double precision;
begin
 if jsonb_typeof(p_c->'held')='object' then
  key_:=p_c->'held'->>'key';had:=coalesce((held->>key_)::integer,0);
  if had>=(p_c->'held'->>'most')::integer then raw:=0;else held:=held||jsonb_build_object(key_,had+1);end if;
 end if;
 if jsonb_typeof(p_c->'first')='string' and not firsts ? (p_c->>'first') then raw:=raw+first_;firsts:=firsts||jsonb_build_array(p_c->>'first');end if;
 if p_c->>'line'='farming' then
  reserve_:=town.work_reserve(p_kept,p_day,(p_c->>'started')::integer);full_:=least(raw,reserve_);gain:=full_+(raw-full_)*(town.cat('work')->>'past')::double precision;
  return jsonb_build_object('points',(on_->>'points')::double precision+gain,'day',p_day,'today',(on_->>'today')::double precision+raw,'held',held,'firsts',firsts,
   'reserve',reserve_-full_,'earned',case when (p_kept->>'day')::integer=p_day then coalesce((p_kept->>'earned')::double precision,town.work_counted_on('farming',0,(p_kept->>'today')::double precision)) else 0 end+gain);
 end if;
 if raw<=0 then return on_||jsonb_build_object('held',held,'firsts',firsts);end if;
 gain:=town.work_counted_on(p_c->>'line',(on_->>'today')::double precision,raw);
 return jsonb_build_object('points',(on_->>'points')::double precision+gain,
  'day',p_day,'today',(on_->>'today')::double precision+raw,'held',held,'firsts',firsts)
  ||case when p_c->>'line' in ('helpers','well') then jsonb_build_object('earned',town.work_earned(p_c->>'line',p_kept,p_day)+gain) else '{}'::jsonb end;
end $$;`;
const told = `create or replace function town.work_told(p_member uuid,p_now bigint) returns jsonb language sql stable set search_path='' as $$
 select jsonb_object_agg(i.id,jsonb_build_object('points',coalesce((k.kept->>'points')::double precision,case when i.id='well' then (select c.buckets from public.town_carriers c where c.member_id=p_member) else 0 end,0),
  'today',daily.raw,'earned',town.work_earned(i.id,coalesce(k.kept,town.work_new()),town.day_of(p_now)),
  'bound',(town.cat('work')->'day'->>i.id)::double precision,
  'full',case when i.id='farming' then town.work_reserve(coalesce(k.kept,town.work_new()),town.day_of(p_now),null) else greatest(0,(town.cat('work')->'day'->>i.id)::double precision-daily.raw) end))
 from jsonb_array_elements_text(town.cat('work')->'ids') i(id)
 left join public.town_work k on k.member_id=p_member and k.line=i.id
 cross join lateral (select case when (k.kept->>'day')::integer=town.day_of(p_now) then coalesce((k.kept->>'today')::double precision,0) else 0 end raw) daily
$$;`;
const water = `
-- One actual carrier increment, including each distinct relay participant, is credited once.
create or replace function town.work_carried() returns trigger language plpgsql set search_path='' as $$
declare delta_ numeric;
begin
 delta_:=new.buckets-case when tg_op='INSERT' then 0 else old.buckets end;
 if delta_>0 then perform town.work_counted(new.member_id,jsonb_build_object('from','deed','what','carry','thing',null,'n',delta_,'doc','{}'::jsonb),town.now_ms());end if;
 return new;
end $$;
revoke all on function town.work_carried() from public,anon,authenticated;
drop trigger if exists town_carriers_experience on public.town_carriers;
create trigger town_carriers_experience after insert or update of buckets on public.town_carriers for each row execute function town.work_carried();
`;
try {
  // Catalog generation and guarded function editing are deliberately local.
  await db.exec(helpers);
  await edit('town.work_count(jsonb,jsonb,integer)', () => count);
  await edit('town.work_told(uuid,bigint)', () => told);
  await edit('town.work_counts_of(jsonb,text)', body => {
    body=body.replace(' STABLE\nAS', " STABLE\n SET search_path TO ''\nAS");
    body=replace(body,"  if what = 'ladle' then",`  if what = 'sow' then
    return case when other is null or other='' or other=p_doer then jsonb_build_array(jsonb_build_object('to',null,'line','farming','raw',0)) else '[]'::jsonb end;
  end if;
  if what = 'carry' then
    return case when coalesce((p_done->>'n')::numeric,0)>0 then jsonb_build_array(jsonb_build_object('to',null,'line','well','raw',floor((p_done->>'n')::numeric))) else '[]'::jsonb end;
  end if;
  if what = 'ladle' then`);
    body=replace(body,"raw := (l->'forest'->'how'->>(doc->>'how'))::double precision + case", "raw := coalesce((l->'forest'->'kinds'->>(doc->>'kind'))::double precision,(l->'forest'->'how'->>(doc->>'how'))::double precision) + case when l->'forest'->'parts' ? thing then (l->'forest'->>'part')::double precision else 0 end + case");
    body=replace(body,"'raw', l->'felling'->thing,",`'raw', to_jsonb((l->'felling'->>thing)::numeric + case when jsonb_typeof(doc->'girth')='number' and (doc->>'girth')::numeric=floor((doc->>'girth')::numeric) then greatest(0,least(2,(doc->>'girth')::numeric)) else 0 end + case when doc->'misses'='0'::jsonb then (l->>'fellingPerfect')::numeric else 0 end),`);
    body=replace(body,"(l->'mining'->>'rock')::double precision *", 'town.work_depth(doc)::double precision *');
    body=replace(body,"else l->'mining'->'vein' end", `else to_jsonb((l->'mining'->>'vein')::numeric+town.work_depth(doc)-1 + case when jsonb_typeof(doc->'of')='number' and (doc->>'of')::numeric>0 and doc->'passed'=doc->'of' then (l->>'miningPerfect')::numeric else 0 end) end`);
    body=replace(body,"case when town.mine_yes(doc->'again') then '0'::jsonb", "case when town.mine_yes(doc->'again') or coalesce((p_done->>'n')::numeric,1)<=0 then '0'::jsonb");
    body=replace(body,"'raw', l->'mining'->'crystal')", "'raw', to_jsonb((l->'mining'->>'crystal')::numeric+town.work_depth(doc)-1))");
    body=replace(body,`    if l->'farming' ? thing and (other is null or other = '') then
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', l->'farming'->thing, 'first', 'farming:' || thing));`, `    if l->'farming' ? thing and (other is null or other = '' or other=p_doer) then
      raw:=case when jsonb_typeof(doc->'picked')='number' and (doc->>'picked')::numeric>0 then (l->'farmingAgain'->>thing)::double precision else (l->'farming'->>thing)::double precision end;
      if doc->'giant'='true'::jsonb then raw:=raw/(l->'farmingCells'->>thing)::double precision*(l->>'farmingGiantCells')::double precision;end if;
      if jsonb_typeof(doc->'care')='number' then raw:=raw+least((l->>'farmingCare')::double precision,greatest(0,floor((doc->>'care')::double precision)));end if;
      return jsonb_build_array(jsonb_build_object('to', null, 'line', 'farming', 'raw', raw, 'first', 'farming:' || thing)
        || case when jsonb_typeof(doc->'started')='number' and (doc->>'started')::numeric=floor((doc->>'started')::numeric) then jsonb_build_object('started',doc->'started') else '{}'::jsonb end);`);
    return body;
  });
  await edit('public.town_tend(integer,integer,jsonb,boolean)', body => replace(body,
    "jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))",
    "jsonb_build_object('tile', jsonb_build_array(p_x, p_y), 'with', town.hand_of(purse))\n        || case when did->>'deed'='pick' then town.harvest_work(plot->'plant') else '{}'::jsonb end"));
  await edit('public.town_row(integer,integer,jsonb,jsonb)', body => replace(body,
    "jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)",
    "jsonb_build_object('tile', jsonb_build_array(v_x, v_y), 'with', town.hand_of(purse), 'row', true)\n          || case when did->>'deed'='pick' then town.harvest_work(plots->(e->>'key')->'plant') else '{}'::jsonb end"));
  const hash = body => createHash('md5').update(body).digest('hex');
  const guards = changed.map(({ signature, body }) => ` if md5(replace(pg_get_functiondef('${signature}'::regprocedure),chr(13),'')) not in ('${hash(old.get(signature))}','${hash(body)}') then raise exception 'Definition changed: ${signature}; rebuild v253 on current text';end if;`).join('\n');
  const catalog = JSON.stringify(linesRow());
  const initialise = `
-- Exactly once: carry forward earned XP and real-water ranks, never replay old deeds.
do $initialise$ declare d integer:=town.day_of(town.now_ms());begin
 if coalesce((town.cat('work')->>'experienceVersion')::integer,1)<2 then
  insert into public.town_work(member_id,line,kept)
   select c.member_id,'well',town.work_new()||jsonb_build_object('points',c.buckets,'day',d,'earned',0) from public.town_carriers c
   on conflict(member_id,line) do update set kept=public.town_work.kept||jsonb_build_object('points',greatest((public.town_work.kept->>'points')::numeric,(excluded.kept->>'points')::numeric),'day',d,'today',0,'held','{}'::jsonb,'earned',0);
  update public.town_work set kept=kept||jsonb_build_object('earned',case when (kept->>'day')::integer=d then town.work_counted_on('helpers',0,(kept->>'today')::double precision) else 0 end) where line='helpers';
  insert into public.town_work(member_id,line,kept)
   select b.member_id,'farming',town.work_new()||jsonb_build_object('day',d,'reserve',least(1050,150*greatest(1,d-town.day_of(min((p.plant->>'sown')::bigint))+1)),'earned',0)
   from public.town_beds b join public.town_plots p on p.bed=b.bed and p.plant->>'by'=b.member_id::text
   where p.plant is not null group by b.member_id on conflict(member_id,line) do nothing;
  -- Use the old last-action day once when converting a previously earned harvest allowance.
  update public.town_work set kept=kept||jsonb_build_object('reserve',case when (kept->>'day')::integer<0 then 150 else least(1050,greatest(0,150-(kept->>'today')::double precision)+greatest(0,d-(kept->>'day')::integer)*150) end,'day',d,
   'today',case when (kept->>'day')::integer=d then (kept->>'today')::double precision else 0 end,
   'held',case when (kept->>'day')::integer=d then kept->'held' else '{}'::jsonb end,
   'earned',case when (kept->>'day')::integer=d then town.work_counted_on('farming',0,(kept->>'today')::double precision) else 0 end)
   where line='farming' and not kept ? 'reserve';
 end if;
end $initialise$;
`;
  const sql=`-- v253: profession XP pays for occupied space, real harvest cycles and harder work.
-- Run AFTER v251 and the matching site deploy. v252 prices are independent.
-- Safe to run twice. Existing earned XP, rank thresholds, gifts, prices and real-water statistics are preserved.
-- Harvest full-XP allowance: 150/day, saved up to 7 days. Helpers/well: 375/day then 25%.
-- Root metadata comes from locked server plots. Only actual carrier increments award well XP.
begin;
set local statement_timeout='30s';
set local lock_timeout='5s';
do $guard$ begin
 perform 1 from public.town_catalog where key='work' for update;
 if town.cat('work') is null or town.cat('work')->'ids' is distinct from '${JSON.stringify(linesRow().ids)}'::jsonb then raise exception 'Unexpected profession catalog: review v253';end if;
${guards}
end $guard$;
-- Freeze carrier deltas and XP writes during the one-time conversion; no earned action can fall in a backfill gap.
lock table public.town_carriers,public.town_work in share row exclusive mode;
${initialise}
update public.town_catalog set data=data||$experience$${catalog}$experience$::jsonb,updated_at=now() where key='work';
${helpers}
${changed.map(f=>f.body+';').join('\n')}
${water}
revoke all on function town.work_count(jsonb,jsonb,integer),town.work_told(uuid,bigint),town.work_counts_of(jsonb,text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
-- Expected: version 2, 9 professions, 7 harvest-bank days and 375 for both community lines.
select data->>'experienceVersion' as experience_version,jsonb_array_length(data->'ids') as professions,
 data->>'harvestBankDays' as harvest_bank_days,data#>>'{day,helpers}' as helper_full_xp,data#>>'{day,well}' as well_full_xp
from public.town_catalog where key='work';
`;
  writeFileSync('supabase/v253_experience_that_respects_the_work.sql',sql);
  console.log('Built guarded v253: '+changed.length+' definitions, 9 lines, legacy XP preserved.');
} finally { await db.close(); }
