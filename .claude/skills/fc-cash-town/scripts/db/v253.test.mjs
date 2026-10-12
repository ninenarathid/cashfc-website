import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { rewardDB } from './reward-db.mjs';
await import('./repo-ts-town.mjs');
const { countsOf, count, newLine, linesRow, harvestWork } = await import('@/lib/town/line-points');
const { CROP_IDS, FISH_IDS } = await import('@/lib/town/items');
const { BUG_IDS } = await import('@/lib/town/insects');
const { newPurse } = await import('@/lib/town/trade');
const db = await rewardDB(251), sql = readFileSync('supabase/v253_experience_that_respects_the_work.sql', 'utf8');
let checks = 0;
const eq = (got, want, label) => { assert.deepEqual(got, want, label); checks++; };
const one = async (query, args = []) => (await db.query(query, args)).rows[0];
const j = JSON.stringify;
const deed = (what, thing, doc = {}, n = 1) => ({ from: 'deed', what, thing, doc, n });
const checkCounts = async done => eq((await one('select town.work_counts_of($1::jsonb,$2::text) v', [j(done), 'me'])).v, countsOf(done, 'me'), j(done));
const checkCount = async (k, c, d) => eq((await one('select town.work_count($1::jsonb,$2::jsonb,$3::integer) v', [j(k), j(c), d])).v, count(k, c, d), j({k,c,d}));
const work = async (id, line) => (await one('select kept from public.town_work where member_id=$1::uuid and line=$2', [id, line])).kept;
try {
  const ids = (await db.query("select id from public.profiles where character_name in ('Member One','Member Two','Aqua Admin') order by character_name")).rows.map(r => r.id);
  const [admin, me, pal] = ids;
  const now = Number((await one('select town.now_ms() t')).t), day = (await one('select town.day_of($1::bigint) d', [now])).d;
  const beforePrices = (await one("select data from public.town_catalog where key='items'")).data;
  await db.query('insert into public.town_carriers(member_id,buckets) values($1::uuid,700) on conflict(member_id) do update set buckets=700', [me]);
  const legacy = { ...newLine(), points: 4321, day: day-3, today: 400, firsts: ['farming:tomato','farming:corn','farming:blueCorn'], held: { old: 1 } };
  await db.query("insert into public.town_work(member_id,line,kept) values($1::uuid,'farming',$2::jsonb) on conflict(member_id,line) do update set kept=excluded.kept", [me,j(legacy)]);
  await db.query("insert into public.town_work(member_id,line,kept) values($1::uuid,'helpers',$2::jsonb) on conflict(member_id,line) do update set kept=excluded.kept", [me,j({...newLine(),points:1000,day,today:500})]);
  await db.exec(sql);
  eq((await one("select town.cat('work') v")).v, linesRow(), 'complete 9-line catalog matches the shipping TS');
  eq((await one("select data from public.town_catalog where key='items'")).data, beforePrices, 'prices untouched');
  eq((await work(me,'well')).points, 700, 'all old water progression preserved');
  eq((await work(me,'farming')).points, 4321, 'old farm XP preserved');
  eq((await work(me,'farming')).firsts, legacy.firsts, 'discovery history preserved');
  eq((await work(me,'farming')).reserve, 450, 'old spent allowance refills only elapsed days');
  eq((await work(me,'helpers')).earned,275,'midday upgrade preserves old-cap credited XP');
  const beforeRerun = (await db.query('select member_id,line,kept from public.town_work order by member_id,line')).rows;
  await db.exec(sql);
  eq((await db.query('select member_id,line,kept from public.town_work order by member_id,line')).rows, beforeRerun, 'second installation changes no XP/allowance');
  await db.query("select town.work_counted($1::uuid,$2::jsonb,$3::bigint)",[me,j(deed('water','tomato',{whose:pal})),now]);
  eq((await work(me,'helpers')).points,1000.25,'helper balance preserves old XP plus only the new deed');
  eq((await work(me,'helpers')).earned,275.25,'helper today reports the real credited amount across both policies');

  const fn = { counts_of: 'town.work_counts_of($1::jsonb,$2::text)', line_count: 'town.work_count($1::jsonb,$2::jsonb,$3::integer)',
    counted_on: 'town.work_counted_on($1::text,$2::double precision,$3::double precision)', line_rank: 'town.work_rank($1::text,$2::double precision)' };
  for (const v of JSON.parse(readFileSync('.codex/experience-balance/vectors-lines.json','utf8'))) {
    const args = v.args.map(a => typeof a === 'object' && a !== null ? j(a) : a);
    eq((await one(`select ${fn[v.fn]} v`,args)).v,v.want,v.fn+' '+j(v.args));
  }
  for (const crop of CROP_IDS) for (const picked of [0,1,9]) for (const giant of [false,true]) for (const care of [0,2,999]) await checkCounts(deed('pick',crop,{picked,giant,care,started:100},99));
  for (const bug of BUG_IDS) await checkCounts(deed('net',bug));
  for (const fish of FISH_IDS) await checkCounts({from:'play',what:'fishing',thing:fish,n:1,won:true,doc:{}});
  for (const floor of [0,1,10,11,20,21,30]) {
    for (const n of [0,1,3]) for (const again of [false,true]) await checkCounts(deed('vein','oreIron',{floor,passed:n,of:3,again},n));
    await checkCounts(deed('mine','stone',{floor},3));
    await checkCounts(deed('crystal','stone',{floor}));
  }
  for (const tree of ['pine','ironwood','moonwood','elder']) for (const girth of [0,1,2]) for (const misses of [0,2]) await checkCounts(deed('fell',tree,{girth,misses},20));
  for (const done of [deed('gather','truffle',{how:'choose',kind:'ring'}),deed('gather','fragrantPetal',{how:'pick',kind:'flowers'}),deed('carry',null,{},400),deed('prepare','dicedRoot')]) await checkCounts(done);
  for (const oldDay of [-1,100,99,80]) for (const today of [0,150,600]) for (const reserve of [undefined,0,100,1050]) for (const raw of [0,12,360,1200]) {
    await checkCount({...newLine(),day:oldDay,today,...(reserve===undefined?{}:{reserve})},{to:null,line:'farming',raw,started:94},100);
  }

  // A carrier delta counts once; installing again must never restore raw-water totals over reduced XP.
  await db.query('update public.town_carriers set buckets=buckets+400 where member_id=$1::uuid',[me]);
  eq((await work(me,'well')).points,1081.25,'375 full, excess 25%, legacy 700 intact');
  await db.exec(sql);
  eq((await work(me,'well')).points,1081.25,'no re-backfill on rerun after capped work');
  await db.query('update public.town_carriers set buckets=buckets+100 where member_id=$1::uuid',[me]);
  eq((await work(me,'well')).points,1106.25,'further real work earns quarter XP');
  eq(Number((await one('select buckets from public.town_carriers where member_id=$1::uuid',[me])).buckets),1200,'real water statistic stays raw');
  await db.query("insert into public.town_line_water(member_id,item,hands) values($1::uuid,'bucket',array[$1::uuid,$2::uuid,$3::uuid]) on conflict(member_id,item) do update set hands=excluded.hands",[me,pal,admin]);
  const beforeRelay = await work(me,'well');
  await db.query("select town.well_seen($1::uuid,$2::bigint,'pour','bucket',2,'{\"can\":\"bucket\"}'::jsonb)",[me,now]);
  eq((await work(me,'well')).points,beforeRelay.points+0.5,'pourer gets one credited delta');
  eq((await work(pal,'well')).points,2,'first relay participant gets actual carried credit');
  eq((await work(admin,'well')).points,2,'second relay participant gets actual carried credit');

  // Drive the real RPCs with fabricated game metadata: only the locked pre-harvest plant is counted.
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[me]);
  const purse = {...newPurse(),hand:null,bag:Array(30).fill(null),stamina:{day,left:100}};
  await db.query('select town.keep_purse($1::uuid,$2::jsonb)',[me,j(purse)]);
  const plant = {by:me,crop:'tomato',sown:now-8*86400000,boost:0,watered:0,fed:0,guard:now+86400000,cured:0,picked:1,pickedAt:now-2*86400000};
  await db.query('insert into public.town_beds(bed,member_id,tended,empty) values(0,$1::uuid,$2::bigint,0) on conflict(bed) do update set member_id=excluded.member_id,tended=excluded.tended,empty=0',[me,now]);
  await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values(132,4,0,'tilled',$1::jsonb,$2::bigint) on conflict(x,y) do update set soil='tilled',plant=excluded.plant,changed=excluded.changed",[j(plant),now]);
  const beforeHand = await work(me,'farming');
  const hand = (await one('select public.town_tend(132,4,$1::jsonb,false) v',[j({picked:999,giant:true,care:999,started:1})])).v;
  eq(hand.ok,true,'real hand-harvest RPC succeeds');
  eq((await work(me,'farming')).points,beforeHand.points+4,'actual regrowth XP, untrusted claims ignored');
  const logged = (await one("select doc from public.town_deeds where member_id=$1::uuid and what='pick' order by id desc limit 1",[me])).doc;
  for (const [key,value] of Object.entries(harvestWork(plant))) eq(logged[key],value,'authoritative harvest '+key);

  await db.query('select town.keep_purse($1::uuid,$2::jsonb)',[me,j({...purse,hand:'sickle',bag:[{item:'sickle',n:1},...Array(29).fill(null)],gifts:{had:['charmSickle'],charms:['charmSickle']}})]);
  const blue = {...plant,crop:'blueCorn',picked:0,pickedAt:0,root:'132,6',footprint:['132,6','133,6','134,6']}, corn={...plant,crop:'corn',picked:0,pickedAt:0};
  for (const [x,p] of [[132,blue],[133,blue],[134,blue],[135,corn]]) await db.query("insert into public.town_plots(x,y,bed,soil,plant,changed) values($1,6,0,'tilled',$2::jsonb,$3::bigint) on conflict(x,y) do update set soil='tilled',plant=excluded.plant,changed=excluded.changed",[x,j(p),now]);
  const beforeRow = await work(me,'farming');
  const row = (await one('select public.town_row(132,6,$1::jsonb,$2::jsonb) v',[j({'132,6':true,'133,6':true,'134,6':true,'135,6':true}),j({secs:4})])).v;
  eq(row.ok,true,'real row-harvest RPC succeeds');
  eq((await work(me,'farming')).points,beforeRow.points+34,'one 30-XP hybrid root plus one 4-XP corn, satellites pay nothing');

  const status = (await one('select town.work_told($1::uuid,$2::bigint) v',[me,now])).v;
  eq(status.well.earned,406.75,'well UI reports credited XP instead of 502 raw bucketfuls');
  eq(status.farming.full,(await work(me,'farming')).reserve,'farm UI reports saved allowance');
  for (const signature of ['town.harvest_work(jsonb)','town.work_reserve(jsonb,integer,integer)','town.work_earned(text,jsonb,integer)','town.work_depth(jsonb)','town.work_carried()','town.work_counts_of(jsonb,text)']) {
    for (const role of ['anon','authenticated']) eq((await one('select has_function_privilege($1,$2,\'EXECUTE\') v',[role,signature])).v,false,'private '+signature);
  }
  eq((await one("select has_function_privilege('authenticated','public.town_tend(integer,integer,jsonb,boolean)','EXECUTE') v")).v,true,'existing member RPC ACL preserved');
  const def=(await one("select pg_get_functiondef('town.work_counts_of(jsonb,text)'::regprocedure) v")).v;
  await db.exec(def.replace('-- v177:','-- source changed:'));
  await assert.rejects(()=>db.exec(sql),/Definition changed/);checks++;
  await db.exec('rollback');
  eq((await work(me,'farming')).points,beforeRow.points+34,'failed installation is atomic');
  mkdirSync('.codex/experience-balance',{recursive:true});
  writeFileSync('.codex/experience-balance/validation.json',j({checks,localOnly:true,allNineLines:true,rerunSafe:true,earnedXpPreserved:true,handAndRowRpc:true,relayCredit:true}));
  console.log(`v253: ${checks} catalog, JS/SQL parity, harvest bank, real RPC, relay, preservation, rerun and access checks passed.`);
} catch (error) {
  console.error('Check',checks,error.message,error.where??'');
  if(error.actual!==undefined)console.error(j({actual:error.actual,expected:error.expected}));
  process.exitCode=1;
} finally {await db.close();}
