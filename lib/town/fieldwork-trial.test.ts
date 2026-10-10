import {afterEach,beforeEach,describe,it,expect,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {Trial} from "./trial";
import {PREPARATION,preparationTargets} from "./preparation";
import {CAMPS} from "./camps";
import {held} from "./trade";
import type {ItemId} from "./items";

beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(Date.UTC(2026,9,10,6));
 const kept=new Map<string,string>();
 vi.stubGlobal("window",Object.assign(new EventTarget(),{localStorage:{getItem:(k:string)=>kept.get(k)??null,setItem:(k:string,v:string)=>kept.set(k,v),removeItem:(k:string)=>kept.delete(k)}}));
});
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const supply=(t:Trial,things:readonly (readonly [ItemId,number])[])=>{t.resize(45);for(const[id,n]of things)t.grant(id,n);};
describe("trial preparation and shared camps",()=>{
 it("remembers completed experiments across reload and rejects replayed requests across actions",()=>{
  const t=new Trial("A"),at=[...PREPARATION.stations[0]] as [number,number],id=randomUUID();
  supply(t,[["prepBoard",1],["cleaver",1],["carrot",4],["daikon",2]]);
  const begun=t.preparationBegin("dicedRoot",at,id);expect(begun.ok).toBe(true);if(!begun.ok)return;
  expect(t.preparationEnd(id,preparationTargets(begun.run),at)).toEqual({ok:false,why:"none"});
  vi.advanceTimersByTime(2000);expect(t.preparationEnd(id,preparationTargets(begun.run),at).ok).toBe(true);
  const before=structuredClone(t.purse()),reloaded=new Trial("A");
  expect(reloaded.purse().prepBook).toContain("dicedRoot");
  expect(reloaded.preparationEnd(id,preparationTargets(begun.run),at)).toEqual({ok:false,why:"had"});
  expect(reloaded.preparationBegin("dicedRoot",at,id)).toEqual({ok:false,why:"had"});
  expect(reloaded.campDo("place",0,null,CAMPS.sites[0],id)).toEqual({ok:false,why:"had"});
  expect(reloaded.purse()).toEqual(before);
 });
 it("friends see the same finite camp and a retry consumes no second ration",()=>{
  const a=new Trial("A"),b=new Trial("B"),at=CAMPS.sites[0];
  supply(a,[["campKit",1],["campCanvas",1],["dryTinder",1],["trailRation",5],["provisionChest",1]]);supply(b,[["trailRation",4]]);
  expect(a.campDo("place",0,null,at,randomUUID()).ok).toBe(true);expect(b.camps()[0].by).toBe("A");
  const id=randomUUID();expect(b.campDo("benefit",0,"trailRation",at,id).ok).toBe(true);const before=structuredClone(b.purse());
  expect(b.campDo("benefit",0,"trailRation",at,id)).toEqual({ok:false,why:"had"});expect(b.purse()).toEqual(before);expect(a.camps()[0].left).toBe(4);
  for(let i=0;i<2;i++)expect(b.campDo("benefit",0,"trailRation",at,randomUUID()).ok).toBe(true);
  expect(b.campDo("benefit",0,"trailRation",at,randomUUID())).toEqual({ok:false,why:"spent"});expect(held(b.purse().bag,"trailRation")).toBe(1);expect(a.camps()[0].left).toBe(2);
 });
});
