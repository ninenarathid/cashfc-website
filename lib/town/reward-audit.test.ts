import {it,expect} from 'vitest';
import {newPurse,type Purse} from './trade';
import {dayOf} from './stamina';
import {usesLeft} from './gifts';
import {scanMineral,learnMinerals} from './reward-actions';
import {startSchool,schoolWeights} from './reward-fishing';
import {nursery,nurseryNode} from './reward-nursery';
import {trailAnswer} from './reward-trails';
import {resourceRecipe} from './reward-resources';
import {arenaAction,arenaTargets} from './reward-arena';
import {begin,opened,fell,newGrove,type Standing} from './trees';
import {comboWearKey} from './combo-types';

const t=Date.parse('2026-10-15T12:00:00+07:00'),at:[number,number]=[40,32];
const p:Purse={...newPurse(),bag:[{item:'axe',n:1},{item:'pineNut',n:3},{item:'scarab',n:1},...Array(15).fill(null)],hand:'axe',handAt:0,coins:100,stamina:{day:dayOf(t),left:100},best:{catfish:40},gifts:{had:['thingOreCompass','thingSchoolBell','thingTinyForest','thingBeetleRing','charmEchoAxe','charmListening'],charms:['charmEchoAxe']}};
it('empty floors spend all five scans, and exhausted scans never inspect hidden fates',()=>{
 let q=learnMinerals(p,[['chipRuby',1]]),calls=0;
 const world={ore:'shardCopper' as const,gem:'chipRuby' as const,rocks:[{id:1,x:41,y:32,look:0}],stands:()=>true,fate:()=>{calls++;return {kind:'way' as const,shards:0};}};
 for(let i=0;i<5;i++){const d=scanMineral(q,'chipRuby',at,t,world);expect(d.ok).toBe(true);if(!d.ok)throw Error('scan');q=d.purse;expect(d.left).toBe(4-i);expect(d.direction).toBeUndefined();}
 const before=calls;
 expect(scanMineral(q,'chipRuby',at,t,world)).toEqual({ok:false,why:'spent'});
 expect(scanMineral(q,'chipRuby',at,t,{...world,fate:()=>{throw Error('A spent scan read the secret');}})).toEqual({ok:false,why:'spent'});
 expect(calls).toBe(before);
});
it('extra lines neither boost the school nor spend a charge',()=>{
 const pool=[{what:'catfish' as const,p:.1},{what:'loach' as const,p:.9}],b=startSchool(p,'catfish',pool,t);if(!b.ok)throw Error('bell');
 for(let i=0;i<6;i++){const d=schoolWeights(b.purse,pool,false,t,true);expect(d.odds).toEqual(pool);expect(d.purse).toBe(b.purse);}
 expect(schoolWeights(b.purse,pool,false,t).purse.professionRewards?.school?.left).toBe(2);
});
it('three missed nursery trees end the run without any loot or answer retries',()=>{
 const b=nursery(p,{action:'nurseryBegin',kinds:['pine','pine','pine'],at},'run',t,123);if(!b.ok)throw Error('nursery');let q=b.purse;
 for(let i=0;i<3;i++){
  const stage=nursery(q,{action:'nurseryStage',nursery:'run',part:'wood',at},`s${i}`,t+i*6000,0);if(!stage.ok||!stage.nursery)throw Error('stage');
  const answers=trailAnswer(nurseryNode(stage.nursery)).map(n=>n<1?(n+.5)%1:(n+1)%3);
  const input={action:'nurseryEnd' as const,nursery:'run',challenge:`s${i}`,answers,at};
  const d=nursery(stage.purse,input,'end',t+i*6000+3000,0);if(!d.ok)throw Error('end');q=d.purse;
  expect(d.got).toEqual([]);expect(d.completed).toBe(i===2);expect(nursery(q,input,'retry',t+i*6000+4000,0).ok).toBe(false);
 }
 expect(q.professionRewards?.nursery).toBeNull();expect(usesLeft(q,'thingTinyForest',t)).toBe(0);
});
it('gem colours cannot manufacture light or dark; repair needs two loose fragments',()=>{
 for(const target of ['gemDiamond','gemOnyx'])expect(resourceRecipe('color',`gemRuby:gemSapphire:${target}`)).toBeNull();
 expect(resourceRecipe('repair','chipRuby')?.needs).toEqual([['chipRuby',2],['quartzCore',1],['rootTwine',1]]);
});
it('perfect beetle matches pay at most five prizes; all beetles survive',()=>{
 let q=p;
 for(let i=0;i<7;i++){
  const b=arenaAction(q,{action:'arenaBegin',bug:'scarab',at},`a${i}`,t+i*10000,123,['scarab']);if(!b.ok)throw Error('arena');
  const d=arenaAction(b.purse,{action:'arenaEnd',run:`a${i}`,at,answers:arenaTargets(123).map(x=>({stance:(x.attack+1)%3,mark:x.mark}))},'end',t+i*10000+6000,0,[]);if(!d.ok)throw Error('end');q=d.purse;
 }
 expect(q.coins).toBe(p.coins+60);expect(q.bag).toEqual(p.bag);expect(usesLeft(q,'thingBeetleRing',t)).toBe(0);
});
it('Echo is finite and swapping to Listening invalidates a held felling game',()=>{
 const wood:Standing[]=[{id:0,x:0,y:0,tier:1},{id:1,x:2,y:0,tier:1}],pos:[number,number]=[0,1],g=newGrove();
 const b=begin(p,g,0,pos,t,1,wood,'me');expect(b.ok).toBe(true);if(!b.ok)throw Error('begin');expect(b.trees).toEqual([0,1]);
 const held=opened(g,'me',b.trees,t);held.goes!.me.comboLoadout=comboWearKey(p);
 const swapped={...p,gifts:{...p.gifts!,charms:['charmListening' as const]}},went={tree:0,through:true,misses:0,secs:100};
 expect(fell(swapped,held,'me',went,pos,t+1000,[],wood)).toEqual({ok:false,why:'none'});
 const exhausted={...p,gifts:{...p.gifts!,used:{charmEchoAxe:{k:dayOf(t),n:5}}}};
 const single=begin(exhausted,g,0,pos,t,1,wood,'me');expect(single.ok&&single.trees).toEqual([0]);
});
