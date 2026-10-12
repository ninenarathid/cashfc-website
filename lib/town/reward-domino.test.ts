import {describe,it,expect} from "vitest";
import {dominoGroup} from "./reward-domino";
import {begin,opened,fell,newGrove,type Standing} from "./trees";
import {newPurse,type Purse} from "./trade";
import {dayOf,staminaOf} from "./stamina";
import {grainOf} from "./wood-grain";
const now=Date.parse("2026-10-11T12:00:00+07:00"),wood:Standing[]=[{id:0,x:0,y:0,tier:1},{id:1,x:2,y:0,tier:1},{id:2,x:4,y:0,tier:1},{id:3,x:6,y:0,tier:1}],at:[number,number]=[0,1],axe={item:"axe" as const,n:1};
const player=():Purse=>({...newPurse(),bag:[axe,...Array(15).fill(null)],hand:"axe",handAt:0,stamina:{day:dayOf(now),left:50},gifts:{had:["charmDomino","charmEchoAxe"],charms:["charmDomino","charmEchoAxe"],familiar:null}});
describe("directional domino chains",()=>{
 it("selects only three real trunks on the chosen ray, with no echo multiplication",()=>{
  const p=player(),g=newGrove();expect(dominoGroup(p,g,wood[0],axe,now,[1,0],wood,"me").map(t=>t.id)).toEqual([0,1,2]);
  expect(dominoGroup(p,g,wood[0],axe,now,[-1,0],wood,"me").map(t=>t.id)).toEqual([0]);
  const blocked=[wood[0],{...wood[1],tier:2 as const},...wood.slice(2)];expect(dominoGroup(p,g,blocked[0],axe,now,[1,0],blocked,"me").map(t=>t.id)).toEqual([0]);
  const held={...g,goes:{other:{trees:[1],at:now}}};expect(dominoGroup(p,held,wood[0],axe,now,[1,0],wood,"me").map(t=>t.id)).toEqual([0]);
 });
 it("plays the hardest eligible tree and pays each actual trunk with one quota",()=>{
  const p=player(),g=newGrove(),b=begin(p,g,0,at,now,123,wood,"me",[1,0]);if(!b.ok)throw Error(b.why);expect(b.trees).toEqual([0,1,2]);
  const single=wood.slice(0,3).map(t=>begin({...p,gifts:{...p.gifts!,charms:[]}},g,t.id,[t.x,t.y+1],now,123,wood,"me"));expect(b.ask.chops).toBe(Math.max(...single.map(s=>s.ok?s.ask.chops:0)));
  const grove=opened(g,"me",b.trees,now,[1,0]),plan=grainOf(0),went={tree:0,through:true,misses:0,secs:60,grain:{notches:plan.notches,direction:plan.lean,part:"wood" as const}};
  const d=fell(p,grove,"me",went,at,now+2000,[],wood);if(!d.ok)throw Error(d.why);expect(d.felled.map(f=>f.id)).toEqual([0,1,2]);expect(d.purse.gifts?.used?.charmDomino?.n).toBe(1);expect(staminaOf(d.purse,now+2000)).toBe(44);
  expect(fell({...p,gifts:{...p.gifts!,charms:["charmEchoAxe"]}},grove,"me",went,at,now+2000,[],wood).ok).toBe(false);
  expect(fell(p,grove,"me",{...went,one:true},at,now+2000,[],wood).ok).toBe(false);
  const lost=fell(p,grove,"me",{...went,through:false},at,now+2000,[],wood);if(!lost.ok)throw Error(lost.why);expect(lost.felled).toEqual([]);expect(lost.purse).toEqual(p);
 });
});
