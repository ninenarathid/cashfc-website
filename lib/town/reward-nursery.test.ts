import {it,expect} from 'vitest';
import {nursery,nurseryNode} from './reward-nursery';
import {newPurse,type Purse} from './trade';
import {trailAnswer} from './reward-trails';
import type {WoodPart} from './wood-grain';
const now=Date.parse('2026-10-11T12:00:00+07:00'),at:[number,number]=[40,32];
const purse=():Purse=>({...newPurse(),bag:[{item:'axe',n:1},{item:'pineNut',n:3},...Array(6).fill(null)],hand:'axe',handAt:0,gifts:{had:['thingTinyForest'],charms:[]}});
it('creates three finite known trees, consumes real seeds, locks each choice and persists progress across days',()=>{
 let p=purse();const began=nursery(p,{action:'nurseryBegin',kinds:['pine','pine','elder'],at},'run',now,123,['elder']);if(!began.ok||!began.nursery)throw Error('No nursery');p=began.purse;
 expect(p.bag[1]).toBeNull();expect(p.gifts?.used?.thingTinyForest?.n).toBe(1);
 for(let i=0;i<3;i++){
  const part=(['seed','bark','wood'] as WoodPart[])[i],t=now+86400000+i*5000,id=`challenge-${i}`;
  const s=nursery(p,{action:'nurseryStage',nursery:'run',part,at},id,t,0);if(!s.ok||!s.nursery)throw Error('No stage');
  expect(nursery(s.purse,{action:'nurseryStage',nursery:'run',part:part==='sap'?'bark':'sap',at},'switch',t,0).ok).toBe(false);
  const done=nursery(s.purse,{action:'nurseryEnd',nursery:'run',challenge:id,answers:trailAnswer(nurseryNode(s.nursery)),at},'done',t+3000,0);if(!done.ok)throw Error('No loot');p=done.purse;
  expect(done.got).toEqual(i===2?[['cedarSliver',1]]:i===1?[['pineBark',2]]:[['pineNut',2]]);expect(done.completed).toBe(i===2);
 }
 expect(p.professionRewards?.nursery).toBeNull();
 expect(nursery(p,{action:'nurseryEnd',nursery:'run',challenge:'challenge-2',answers:[0,0,0],at},'repeat',now+86415000,0).ok).toBe(false);
});
it('rejects unknown kinds, keeps an unpaid full-bag result and does not refund the start on cancellation',()=>{
 expect(nursery(purse(),{action:'nurseryBegin',kinds:['pine','pine','moonwood'],at},'run',now,123).ok).toBe(false);
 const began=nursery(purse(),{action:'nurseryBegin',kinds:['pine','pine','pine'],at},'run',now,123);if(!began.ok)throw Error('No run');
 const staged=nursery(began.purse,{action:'nurseryStage',nursery:'run',part:'wood',at},'challenge',now,0);if(!staged.ok||!staged.nursery)throw Error('No game');
 const input={action:'nurseryEnd' as const,nursery:'run',challenge:'challenge',answers:trailAnswer(nurseryNode(staged.nursery)),at};
 expect(nursery({...staged.purse,bag:[{item:'axe',n:1},{item:'log',n:30}]},input,'full',now+3000,0)).toEqual({ok:false,why:'full'});
 const cancelled=nursery(staged.purse,{action:'nurseryCancel',nursery:'run',at},'cancel',now,0);if(!cancelled.ok)throw Error('No cancel');
 expect(cancelled.purse.gifts?.used?.thingTinyForest?.n).toBe(1);expect(cancelled.purse.bag[1]).toBeNull();
 expect(nursery(cancelled.purse,{action:'nurseryBegin',kinds:['pine','pine','pine'],at},'new',now,123).ok).toBe(false);
});
