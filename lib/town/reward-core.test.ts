import {describe,it,expect} from "vitest";
import {beginCore,coreAction} from "./reward-core";
import {trailAnswer} from "./reward-trails";
import {floorSpots} from "./cave-state";
import {newPurse,type Purse} from "./trade";
import {dayOf,staminaOf} from "./stamina";
import {oreOf} from "./mining";
import {usesLeft} from "./gifts";
const now=Date.parse("2026-10-11T12:00:00+07:00"),id="00000000-0000-4000-8000-000000000919",floor=3,at=floorSpots(floor,dayOf(now)).arrive;
const player=():Purse=>({...newPurse(),bag:[{item:"pick",n:1},...Array(16).fill(null)],hand:"pick",handAt:0,stamina:{day:dayOf(now),left:50},gifts:{had:["thingCoreSpade"],charms:[],familiar:null},professionRewards:{visited:[floor],minerals:[oreOf(floor),"chipRuby"]}});
function started(p=player()){const b=beginCore(p,floor,id,at,now,123);if(!b.ok)throw Error(b.why);return b.purse;}
describe("three private core rooms",()=>{
 it("requires an exact worked floor, current cave and real pick; charges one start",()=>{
  expect(beginCore({...player(),professionRewards:{}},floor,id,at,now,123).ok).toBe(false);
  expect(beginCore({...player(),hand:null},floor,id,at,now,123).ok).toBe(false);
  expect(beginCore(player(),floor,id,[0,0],now,123)).toEqual({ok:false,why:"far"});
  const p=started();expect(usesLeft(p,"thingCoreSpade",now)).toBe(0);expect(staminaOf(p,now)).toBe(50);expect(beginCore(p,floor,id,at,now,123).ok).toBe(false);
 });
 it("pays at most three selected rooms, keeps distinct costs and rejects replay",()=>{
  let p=started();const loot=[];
  for(const [i,route] of (["ore","crystal","safe"] as const).entries()){
   const s=coreAction(p,{action:"coreRoom",core:id,route,at},`s${i}`,now+i*6000);if(!s.ok||!s.core?.room)throw Error('room');
   const input={action:"coreEnd" as const,core:id,challenge:`s${i}`,answers:trailAnswer(s.core.room.node),at};
   expect(coreAction(s.purse,input,"e",now+i*6000+100).ok).toBe(false);
   const d=coreAction(s.purse,input,"e",now+i*6000+3000);if(!d.ok)throw Error(d.why);loot.push(...d.got!);p=d.purse;
   expect(coreAction(p,input,"replay",now+i*6000+4000).ok).toBe(false);
  }
  expect(loot).toEqual([[oreOf(floor),2],["chipRuby",1],["stone",2]]);expect(staminaOf(p,now+16000)).toBe(41);expect(p.professionRewards?.core).toBeNull();expect(beginCore(p,floor,id,at,now+16000,1)).toEqual({ok:false,why:"spent"});
 });
 it("locks a room through miss/expiry/day rollover; cannot reroll its route",()=>{
  const p=started(),s=coreAction(p,{action:"coreRoom",core:id,route:"crystal",at},"s",now);if(!s.ok||!s.core?.room)throw Error('room');
  expect(coreAction(s.purse,{action:"coreRoom",core:id,route:"ore",at},"x",now).ok).toBe(false);
  const a=trailAnswer(s.core.room.node).map(n=>(n+1)%3),d=coreAction(s.purse,{action:"coreEnd",core:id,challenge:"s",answers:a,at},"e",now+3000);if(!d.ok)throw Error(d.why);
  expect(d.got).toEqual([]);expect(d.core?.next).toBe(0);expect(staminaOf(d.purse,now+3000)).toBe(46);
  const t=now+86400000,next=coreAction(d.purse,{action:"coreRoom",core:id,route:"crystal",at:floorSpots(floor,dayOf(t)).arrive},"next",t);if(!next.ok)throw Error(next.why);
  expect(next.core?.room?.node.seed).toBe(s.core.room.node.seed);expect(next.core?.room?.mineral).toBe(s.core.room.mineral);expect(next.core?.next).toBe(0);
 });
 it("leaves a full-bag challenge intact and allows cancellation without the pick",()=>{
  const p=started({...player(),bag:[{item:"pick",n:1}]}),s=coreAction(p,{action:"coreRoom",core:id,route:"safe",at},"s",now);if(!s.ok||!s.core?.room)throw Error('room');
  expect(coreAction(s.purse,{action:"coreEnd",core:id,challenge:"s",answers:trailAnswer(s.core.room.node),at},"e",now+3000)).toEqual({ok:false,why:"full"});
  expect(staminaOf(s.purse,now)).toBe(50);const c=coreAction({...s.purse,hand:null},{action:"coreCancel",core:id,at},"c",now);if(!c.ok)throw Error(c.why);expect(c.core).toBeNull();expect(usesLeft(c.purse,"thingCoreSpade",now)).toBe(0);
 });
});
