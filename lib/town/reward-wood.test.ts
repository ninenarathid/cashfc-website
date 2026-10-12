import {describe,it,expect} from "vitest";
import {fell,newGrove,woodOf,type FellLuck} from "./trees";
import {grainOf} from "./wood-grain";
import {newPurse,held,type Purse} from "./trade";
import {dayOf} from "./stamina";
const now=Date.UTC(2026,9,11,5),day=dayOf(now),wood=woodOf([{id:0,x:10,y:10,tier:1}],{x:30,y:30,w:3}),plan=grainOf(0);
const player=():Purse=>({...newPurse(),bag:[{item:"axe",n:1},...Array(12).fill(null)],hand:"axe",handAt:0,gifts:{had:["charmListening","thingForesterKnife"],charms:["charmListening"],familiar:null},stamina:{day,left:40}});
const luck:FellLuck={dark:1,scent:1,which:1,chain:1,keep:1,kind:1};
const cut=(p=player(),misses=0,notches=plan.notches)=>fell(p,newGrove(),"me",{tree:0,through:true,misses,secs:30,grain:{notches,direction:plan.lean,part:"wood",second:"bark"}},[10,11],now,[luck],wood);
describe("heartwood listener",()=>{
 it("adds the chosen part once and closes the shared knife source",()=>{
  const d=cut();expect(d.ok).toBe(true);if(!d.ok)return;
  expect(held(d.purse.bag,"pineBark")).toBe(1);expect(d.felled[0].got).toContainEqual(["pineBark",1]);
  expect(d.purse.gifts?.used?.charmListening).toEqual({k:day,n:1});expect(d.purse.professionRewards?.extraction).toBeNull();
 });
 it("cannot turn a buffered mistake, wrong reading, inactive or capped charm into a second part",()=>{
  const p=player();p.wears=["braceStake"];
  for(const d of [cut(p,1),cut(p,0,[1,1,1]),cut({...p,gifts:{...p.gifts!,charms:[]}}),cut({...p,gifts:{...p.gifts!,used:{charmListening:{k:day,n:5}}}})]){
   expect(d.ok).toBe(true);if(!d.ok)continue;expect(held(d.purse.bag,"pineBark")).toBe(0);expect(d.purse.professionRewards?.extraction).toBeTruthy();
  }
 });
 it("preserves the whole shared deed when only the main harvest fits",()=>{
  const p=player();p.bag=[{item:"axe",n:1},{item:"log",n:1},{item:"timber",n:1},null];const before=structuredClone(p);
  expect(cut(p)).toEqual({ok:false,why:"full"});expect(p).toEqual(before);
 });
});
