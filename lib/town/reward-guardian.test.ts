import {describe,it,expect} from "vitest";
import {gather,SPOTS,turnStart,turnOf,ruleOf} from "./forest";
import {gatherPart} from "./foraging-parts";
import {newPurse,held,type Purse} from "./trade";
import {dayOf,staminaOf} from "./stamina";
import {usesLeft} from "./gifts";
const now=Date.UTC(2026,9,11,5),day=dayOf(now),spot=SPOTS.find(s=>s.kind==="flowers")!,has={turn:turnOf(spot,now),item:"chamomile" as const,n:3};
const purse=():Purse=>({...newPurse(),bag:[{item:"rootSpade",n:1},...Array(8).fill(null)],stamina:{day,left:40},gifts:{had:["famForestGuardian"],charms:[],familiar:"famForestGuardian",owed:0,used:{}}});
const call=(p:Purse,misses=0)=>gather(p,spot,has,0,false,null,[spot.x,spot.y],{part:"paired",misses,wrong:0},now);
describe("forest guardian paired gathering",()=>{
 it("pays both original costs, one quota and the ordinary shared recovery",()=>{
  const before=purse(),d=call(before);expect(d.ok).toBe(true);if(!d.ok)return;
  expect(d.got).toEqual([["fragrantPetal",2],["flowerBulb",1]]);expect(held(d.purse.bag,"chamomile")).toBe(0);
  expect(staminaOf(d.purse,now)).toBe(40-ruleOf(spot).cost*2);expect(usesLeft(d.purse,"famForestGuardian",now)).toBe(4);
  expect(d.rest).toEqual({from:turnStart(spot,has.turn+1),until:turnStart(spot,has.turn+1)+900000});
  expect(d.purse.forestPartsBook).toEqual(["flowers:leaf:fragrantPetal","flowers:root:flowerBulb"]);
  expect(gather(d.purse,spot,has,1,true,null,[spot.x,spot.y],{part:"paired",misses:0,wrong:0},now)).toEqual({ok:false,why:"had"});
 });
 it("raw mistakes cannot be forgiven into a root reward or consume a guardian use",()=>{
  const p=purse();p.bag[1]={item:"forageBasket",n:1};const d=call(p,0.1);expect(d.ok).toBe(true);if(!d.ok)return;
  expect(d.got).toEqual([["fragrantPetal",2]]);expect(d.rest).toBeUndefined();expect(usesLeft(d.purse,"famForestGuardian",now)).toBe(5);
  expect(staminaOf(d.purse,now)).toBe(40-ruleOf(spot).cost);
 });
 it("refuses inactive, capped, unsupported, remote and incompatible assistance",()=>{
  const p=purse();expect(call({...p,gifts:{...p.gifts!,familiar:null}})).toEqual({ok:false,why:"none"});
  expect(call({...p,gifts:{...p.gifts!,used:{famForestGuardian:{k:day,n:5}}}})).toEqual({ok:false,why:"none"});
  const leaf=SPOTS.find(s=>s.kind==="leaves")!;expect(gatherPart(p,leaf,has,"paired",null,0,2,now+10000,now)).toEqual({ok:false,why:"none"});
  expect(gather(p,spot,has,0,false,null,[0,0],{part:"paired",misses:0,wrong:0},now)).toEqual({ok:false,why:"far"});
  expect(gather(p,spot,has,0,false,null,[spot.x,spot.y],{part:"paired",misses:0,wrong:0,with:"famPiglet"},now)).toEqual({ok:false,why:"none"});
 });
 it("never partially pays leaves when the root will not fit",()=>{
  const p=purse();p.bag=[{item:"rootSpade",n:1},null];const saved=structuredClone(p);
  expect(call(p)).toEqual({ok:false,why:"full"});expect(p).toEqual(saved);
  p.bag=[...Array(8).fill(null)];expect(call(p)).toEqual({ok:false,why:"tool"});
  expect(gather(p,spot,has,0,false,"hoe",[spot.x,spot.y],{part:"paired",misses:0,wrong:0},now).ok).toBe(true);
 });
});
