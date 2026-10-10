import { describe, expect, it } from "vitest";
import { PASSIVE_EQUIPMENT, carriedBag, equipmentEffect, isPassiveEquipment } from "./passive-equipment";
import { ITEMS, type ItemId } from "./items";
import { held, newPurse, put, roomy, takeOff, wear, type Purse } from "./trade";
import { gearOf } from "./gear";
import { fitHook, hookOf } from "./rod-hook";
import { easeOf, helpings } from "./cooking";
import { woodMods, woodYield } from "./woodcutting";
import { geologyMods } from "./geology";
import { gardenMods } from "./gardening";
import { scentMods } from "./insect-garden";
import { seesTraces } from "./foraging-parts";
import { propertyDuration } from "./stream-work";
const NOW=Date.UTC(2026,9,10,5);
const ids=Object.keys(PASSIVE_EQUIPMENT) as ItemId[];
const pack=(items:ItemId[]):Purse=>({...newPurse(),bag:items.reduce((bag,id)=>put(bag,id,1),Array(60).fill(null))});
const equip=(p:Purse,id:ItemId):Purse=>{
 const did=wear(p,p.bag.findIndex(s=>s?.item===id));
 if(!did.ok)throw new Error(did.why);
 return did.purse;
};
describe("passive equipment outside the bag",()=>{
 it.each(ids)("owns one %s outside the bag and restores it on removal",id=>{
  expect(ITEMS[id]).toBeDefined();
  expect(equipmentEffect(id,true)).toBeTruthy();expect(equipmentEffect(id,false)).toBeTruthy();
  const before=pack([id]),copy=structuredClone(before),p=equip(before,id);
  expect(before).toEqual(copy);expect(p.bag.length).toBe(before.bag.length);
  expect(held(p.bag,id)).toBe(0);expect(held(carriedBag(p),id)).toBe(1);
  expect(roomy(p).bag.length).toBe(p.bag.length);
  const removed=takeOff(p,id);expect(removed.ok).toBe(true);
  if(removed.ok){expect(held(removed.purse.bag,id)).toBe(1);expect(removed.purse.wears).toEqual([]);}
 });
 it("rejects extra metadata, empty stacks, active tools and consumable materials",()=>{
  for(const stack of [{item:"apron",n:1,plus:3},{item:"apron",n:1,of:{dish:"fishGrill",left:2}},{item:"apron",n:0},{item:"apron",n:.5},{item:"oven",n:1},{item:"rod",n:1},{item:"campCanvas",n:1}] as Purse["bag"]){
   expect(wear({...newPurse(),bag:[stack]},0)).toEqual({ok:false,why:"none"});
  }
 });
 it("keeps ownership intact when the bag is full or the same item is equipped twice",()=>{
  const p=equip(pack(["apron"]),"apron"),full={...p,bag:Array(10).fill({item:"boot" as const,n:1})},copy=structuredClone(full);
  expect(takeOff(full,"apron")).toEqual({ok:false,why:"full"});expect(full).toEqual(copy);
  const duplicate={...p,bag:put(p.bag,"apron",1)};
  expect(wear(duplicate,duplicate.bag.findIndex(s=>s?.item==="apron"))).toEqual({ok:false,why:"worn"});
  expect(carriedBag({...p,wears:["apron","apron","rod"]}).filter(s=>s?.item==="apron")).toHaveLength(1);
 });
 it("retains carrying-basket capacity and other bag slot positions",()=>{
  const p=equip(equip(pack(["basket","apron","worm"]),"basket"),"apron");
  expect(p.bag.length).toBe(65);
  const worm=p.bag.findIndex(s=>s?.item==="worm"),d=takeOff(p,"apron");
  expect(d.ok&&d.purse.bag.length).toBe(65);expect(d.ok&&d.purse.bag[worm]?.item).toBe("worm");
 });
 it("preserves each profession's existing effects when gear leaves inventory",()=>{
  const before=pack(ids),equipped=ids.reduce(equip,before);
  for(const read of [woodMods,geologyMods,gardenMods,scentMods])expect(read(equipped,NOW)).toEqual(read(before,NOW));
  expect(seesTraces(equipped,NOW)).toBe(true);
  expect(propertyDuration(equipped,NOW)).toBe(2);
  expect(easeOf(carriedBag(equipped))).toBe(easeOf(before.bag));
  expect(helpings("friedMinnow",["pan"],0,carriedBag(equipped))).toBe(helpings("friedMinnow",["pan"],0,before.bag));
  expect(woodYield(1,false,{part:"bark",direction:1,notches:[1,1,1]},"clear",equipped)).toEqual([["pineBark",2]]);
 });
 it("uses strongest tackle once and keeps the removable hook selection",()=>{
  const before=pack(["rod","floatFeather","floatBell","lineSpun","lineSilk","hookScale","hookTwin","netLong"]);
  const p=["floatFeather","floatBell","lineSpun","lineSilk","hookScale","hookTwin","netLong"].reduce((p,id)=>equip(p,id as ItemId),before);
  expect(gearOf(carriedBag(p),"rod").slip).toBe(1);
  const fitted=fitHook(p,"hookTwin");expect(fitted.ok).toBe(true);if(!fitted.ok)return;
  expect(hookOf(fitted.purse)).toBe("hookTwin");
  const gear=gearOf(carriedBag(fitted.purse),"rod",null,fitted.purse.fishingHook);
  expect(gear.strike).toBe(1.5);expect(gear.snap).toBe(1.6);expect(gear.slip).toBe(1.6);expect(gear.line).toBe(.76);
  expect(isPassiveEquipment("oven")).toBe(false);
 });
});
