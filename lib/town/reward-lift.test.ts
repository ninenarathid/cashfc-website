import {describe,it,expect} from "vitest";
import {newPurse,type Purse} from "./trade";
import {dayOf} from "./stamina";
import {floorSpots,floorTile} from "./cave-state";
import {portableLift,visitedFloors,LIFT_MOUTH,usableJourney} from "./reward-lift";
import {learnFloor} from "./reward-knowledge";
const now=Date.parse("2026-10-11T12:00:00+07:00"),day=dayOf(now),id="00000000-0000-4000-8000-000000000888";
const p=():Purse=>({...newPurse(),stamina:{day,left:40},gifts:{had:["thingPocketLift"],charms:[],familiar:null}});
describe("a folding lift remembers work rather than new depths",()=>{
 it("anchors only an exact worked or resting floor, with no inferred intermediate floors",()=>{
  const q={...p(),mine:{rests:[10,20]}} as Purse;
  expect(visitedFloors(q,[3,3,0,31,NaN])).toEqual([3,10,20]);
  const input={action:"liftAnchor" as const,floor:3,at:floorSpots(3,day).arrive};
  expect(portableLift(q,input,id,now)).toEqual({ok:false,why:"none"});
  const b=portableLift(q,input,id,now,[3]);if(!b.ok)throw Error(b.why);
  expect(b.purse.professionRewards?.lift).toEqual({floor:3});expect(b.purse.professionRewards?.visited).toEqual([3]);
  expect(b.purse.gifts).toEqual(q.gifts);expect(b.purse.stamina).toEqual(q.stamina);
 });
 it("requires a real current floor, ownership, the mouth and the anchor",()=>{
  const q={...learnFloor(p(),3,30),professionRewards:{visited:[3],lift:{floor:3}}};
  expect(portableLift(q,{action:"liftRide",floor:0,to:3,at:[0,0]},id,now).ok).toBe(false);
  expect(portableLift(q,{action:"liftRide",floor:0,to:3,at:floorSpots(3,day).arrive},id,now)).toEqual({ok:false,why:"far"});
  expect(portableLift(q,{action:"liftRide",floor:3,to:4,at:floorSpots(3,day).arrive},id,now).ok).toBe(false);
  expect(portableLift({...q,gifts:{had:[],charms:[],familiar:null}},{action:"liftRide",floor:0,to:3,at:LIFT_MOUTH},id,now).ok).toBe(false);
 });
 it("charges six single legs, without restoring stamina or changing the anchor",()=>{
  let q:Purse={...p(),professionRewards:{visited:[3],lift:{floor:3}}};
  for(let i=0;i<6;i++){
   const f=i%2?3:0,to=i%2?0:3,b=portableLift(q,{action:"liftRide",floor:f,to,at:f?floorSpots(f,day).arrive:LIFT_MOUTH},id,now);
   if(!b.ok)throw Error(b.why);q=b.purse;expect(b.left).toBe(5-i);expect(b.ride?.floor).toBe(to);expect(b.ride?.day).toBe(day);expect(q.stamina).toEqual(p().stamina);
  }
  expect(portableLift(q,{action:"liftRide",floor:0,to:3,at:LIFT_MOUTH},id,now)).toEqual({ok:false,why:"spent"});
 });
 it("resolves arrival from the new day's layout, never a stored old coordinate",()=>{
  const t=now+86400000,q={...p(),professionRewards:{visited:[3],lift:{floor:3}}},b=portableLift(q,{action:"liftRide",floor:0,to:3,at:LIFT_MOUTH},id,t);
  if(!b.ok)throw Error(b.why);expect(b.ride?.at).toEqual(floorSpots(3,dayOf(t)).arrive);expect(floorTile(3,dayOf(t),...b.ride!.at)).toBe(true);
  expect(usableJourney(b.ride!,t)).toBe(true);expect(usableJourney(b.ride!,t+90001)).toBe(false);expect(usableJourney(b.ride!,t-1)).toBe(false);expect(usableJourney(b.ride!,t+86400000)).toBe(false);
 });
});
