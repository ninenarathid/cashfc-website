import {describe,it,expect} from 'vitest';
import {CASINO_TESTERS,casinoTrialLeader,newCasinoTrial,trialCommand,trialSetup,trialState} from './casino-trial';
import {casinoPath,casinoWalkable,CASINO_MACHINE_X,CASINO_SPAWN} from './casino-map';
import {draftOf} from '@/lib/casino';
const [nine,aqua]=CASINO_TESTERS;
const spinArgs=(force:string|null='miss',id=crypto.randomUUID())=>({p_request:id,p_machine:1,p_force:force,p_revision:1});
describe('volatile casino room',()=>{
 it('converges after simultaneous room starts and admits newcomers only after copying the room',()=>{
  const members=['nine:existing','aqua:joining'];
  expect(casinoTrialLeader(members,['nine:existing'])).toBe('nine:existing');
  expect(casinoTrialLeader(members,members,['nine:existing','nine:existing'])).toBe('nine:existing');
  expect(casinoTrialLeader(members,['nine:existing','aqua:joining'])).toBe(casinoTrialLeader([...members].reverse(),['aqua:joining','nine:existing']));
  expect(casinoTrialLeader(['aqua:joining'],['aqua:joining'],['nine:existing'])).toBe('aqua:joining');
  expect(casinoTrialLeader(['nine:existing'],['nine:existing'])).toBe('nine:existing');
 });
 it('rejects outsiders and preserves the original state on a rejected spin',()=>{
  const t=newCasinoTrial(10000);expect(()=>trialState(t,'outsider')).toThrow();
  expect(()=>trialCommand(t,nine,'casino_lab_spin',{...spinArgs(),p_revision:0},10000)).toThrow();expect(t.spins).toEqual([]);expect(t.accounts).toEqual({});
 });
 it('replays a committed spin after a timeout without charging or issuing again',()=>{
  const args=spinArgs('seven');const first=trialCommand(newCasinoTrial(10000),nine,'casino_lab_spin',args,10000);
  const replay=trialCommand(first.trial,nine,'casino_lab_spin',{...args,p_machine:5,p_force:'gold',p_revision:0},10100);
  expect(replay.data).toEqual(first.data);expect(replay.trial.accounts[nine].coins).toBe(19900);expect(replay.trial.receipts).toHaveLength(1);
  expect(()=>trialCommand(first.trial,aqua,'casino_lab_spin',args,20000)).toThrow();
 });
 it('orders shared stock and occupied machines across the two players',()=>{
  const t=trialCommand(newCasinoTrial(10000),nine,'casino_lab_spin',spinArgs('seven'),10000).trial;
  expect(()=>trialCommand(t,aqua,'casino_lab_spin',spinArgs('miss'),10100)).toThrow();
  expect(()=>trialCommand(t,aqua,'casino_lab_spin',spinArgs('seven'),14000)).toThrow();expect(t.prizes[0].issued).toBe(1);
 });
 it('reserves Gil once and does not allow settings to spend committed funds',()=>{
  const t=trialCommand(newCasinoTrial(10000),nine,'casino_lab_spin',spinArgs('gold'),10000).trial;
  expect(t.settings.reserved).toBe(1000000);const draft=draftOf(trialState(t,nine));draft.budget=999999;
  expect(()=>trialCommand(t,nine,'casino_lab_save',{p_revision:1,p_doc:draft},14000)).toThrow();expect(t.settings.budget).toBe(100000000);
 });
 it('keeps fulfilled prize receipts in history and excludes a second administrator',()=>{
  let t=trialCommand(newCasinoTrial(10000),nine,'casino_lab_spin',spinArgs('seven'),10000).trial;const id=t.receipts[0].id;
  t=trialCommand(t,aqua,'casino_lab_receipt',{p_id:id,p_action:'take'},14000).trial;
  expect(()=>trialCommand(t,nine,'casino_lab_receipt',{p_id:id,p_action:'fulfill'},14000)).toThrow();
  t=trialCommand(t,aqua,'casino_lab_receipt',{p_id:id,p_action:'fulfill',p_note:'delivered'},14000).trial;
  expect(trialState(t,nine).receipts).toHaveLength(0);expect(trialState(t,nine,0,true).receipts[0].status).toBe('fulfilled');
 });
 it('always draws the entire configured finite pool when every ticket is consumed',()=>{
  let t=newCasinoTrial(10000);const doc=draftOf(trialState(t,nine));doc.mode='pool';doc.pool_size=3;doc.prizes.forEach(p=>p.stock=0);doc.prizes[3].stock=2;
  t=trialCommand(t,nine,'casino_lab_save',{p_revision:1,p_doc:doc},10000).trial;
  for(let i=0;i<3;i++)t=trialCommand(t,nine,'casino_lab_spin',{...spinArgs(null),p_revision:2},10000+i*4000,()=>.5).trial;
  expect(t.receipts).toHaveLength(2);expect(t.settings.pool_draws).toBe(3);
  expect(()=>trialCommand(t,nine,'casino_lab_spin',{...spinArgs(null),p_revision:2},24000)).toThrow();
 });
 it('starts a new room from the last saved setup, with nothing issued, and drops a damaged one',()=>{
  let t=newCasinoTrial(10000);const doc=draftOf(trialState(t,nine));doc.price=250;doc.prizes[3]={...doc.prizes[3],name:'500,000 Gil',amount:500000};
  t=trialCommand(t,nine,'casino_lab_save',{p_revision:1,p_doc:doc},10000).trial;
  t=trialCommand(t,nine,'casino_lab_spin',{...spinArgs('popoto'),p_revision:2},10000).trial;
  const kept=JSON.parse(JSON.stringify(trialSetup(t))),next=newCasinoTrial(20000,kept);
  expect(next.settings.price).toBe(250);expect(next.prizes[3]).toMatchObject({name:'500,000 Gil',amount:500000,issued:0});
  expect(next.settings.reserved).toBe(0);expect(next.receipts).toEqual([]);
  expect(newCasinoTrial(20000,{...kept,prizes:kept.prizes.slice(1)}).prizes[3].amount).toBe(250000);
  expect(newCasinoTrial(20000,'junk').settings.price).toBe(100);
 });
 it('never animates a miss as four matching winning symbols',()=>{
  const r=trialCommand(newCasinoTrial(10000),nine,'casino_lab_spin',spinArgs('miss'),10000,()=>0).trial.spins[0];
  expect(r.prize).toBeNull();expect(new Set(r.reels).size).toBeGreaterThan(1);
 });
});
describe('casino interior navigation',()=>{
 it('reaches all five seats through walkable floor tiles and rejects furniture',()=>{
  for(const x of CASINO_MACHINE_X){const path=casinoPath(CASINO_SPAWN,{x,y:3.5});expect(path.length).toBeGreaterThan(0);expect(path.every(casinoWalkable)).toBe(true);expect(path.at(-1)).toEqual({x,y:3.5});}
  expect(casinoPath(CASINO_SPAWN,{x:2.5,y:9.5})).toEqual([]);expect(casinoWalkable({x:-.5,y:5})).toBe(false);
 });
});
