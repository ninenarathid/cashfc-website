import {describe,it,expect} from "vitest";
import {PREP_ITEMS,PREP_MAKES,PREP_DISHES} from "./preparation-items";
import {CAMP_ITEMS,CAMP_CRAFTS,CAMP_DISHES} from "./camp-items";
import {PREPARATION,prepare,preparationTargets,preparationReady,type PrepRun} from "./preparation";
import {CAMPS,makeCamp,campBenefit} from "./camps";
import {ITEMS,type ItemId} from "./items";
import {newPurse,type Purse} from "./trade";
import {dayOf} from "./stamina";
import {walkable} from "./world";
import {sources,usesOf} from "./uses";
import {clueOf} from "./clues";
const NOW=Date.UTC(2026,9,10,6),at=PREPARATION.stations[0] as [number,number];
const purse=(things:readonly (readonly [ItemId,number])[]):Purse=>({...newPurse(),bag:[...things.map(([item,n])=>({item,n})),...Array(12).fill(null)],stamina:{day:dayOf(NOW),left:100}});
describe("food preparation and a finite shared camp",()=>{
 it("adds 25 usable items to each line with valid existing inputs and walking space",()=>{
  expect(Object.keys(PREP_ITEMS)).toHaveLength(25);expect(Object.keys(CAMP_ITEMS)).toHaveLength(25);
  const found=sources();
  for(const id of Object.keys({...PREP_ITEMS,...CAMP_ITEMS}) as ItemId[]){
   expect(found.has(id),`${id} source`).toBe(true);
   const ingredient=Object.values(PREP_MAKES).some(r=>r.needs.some(([part])=>part===id))||Object.values({...PREP_DISHES,...CAMP_DISHES}).some(d=>d.recipe.needs.some(([part])=>part===id))||Object.values(CAMP_CRAFTS).some(needs=>needs.some(([part])=>part===id));
   expect(usesOf(id).length>0||ingredient||id in PREP_DISHES||id in CAMP_DISHES,`${id} use`).toBe(true);
   if(id in CAMP_CRAFTS)expect(clueOf(id).from,`${id} clue`).not.toBeNull();
  }
  for(const recipes of [PREP_MAKES,CAMP_CRAFTS,PREP_DISHES,CAMP_DISHES])for(const[id,row]of Object.entries(recipes)){
   expect(ITEMS[id as ItemId],id).toBeDefined();
   const needs=Array.isArray(row)?row:"needs"in row?row.needs:row.recipe.needs;
   for(const[part]of needs)expect(ITEMS[part as ItemId],`${id}: ${part}`).toBeDefined();
  }
  for(const[x,y]of CAMPS.sites)expect(walkable(x,y),`${x},${y}`).toBe(true);
 });
 it("prepares every ingredient only with its supplies, tools, completed decisions and active run",()=>{
  for(const[id,r]of Object.entries(PREP_MAKES)){
   const run:PrepRun={id:"run",recipe:id as PrepRun["recipe"],seed:3,at:NOW,until:NOW+180000,tile:at};
   const before=purse([...r.needs,...r.in.map(t=>[t,1] as const),["prepBoard",1]]);
   expect(preparationReady(before,id,at)).toBeNull();
   const d=prepare(before,run,"run",preparationTargets(run),at,NOW+2000);expect(d.ok,id).toBe(true);
   if(d.ok){expect(d.made).toBe(id);expect(d.n).toBe(2);expect(d.purse.prepBook).toContain(id);expect(d.purse.coins).toBe(before.coins);}
   expect(prepare(before,run,"wrong",preparationTargets(run),at,NOW+2000).ok).toBe(false);
   expect(prepare(before,run,"run",preparationTargets(run),at,NOW+1999).ok).toBe(false);
   expect(prepare(purse([]),run,"run",preparationTargets(run),at,NOW+2000).ok).toBe(false);
  }
 });
 it("one correction never erases two mistakes or stacks a spoon with a meal",()=>{
  const run:PrepRun={id:"run",recipe:"dicedRoot",seed:3,at:NOW,until:NOW+180000,tile:at};
  const p=purse([["carrot",2],["daikon",1],["cleaver",1],["prepBoard",1],["tastingSpoon",1]]);
  const target=preparationTargets(run),a={...target,method:1,heat:2,correction:true};
  const d=prepare({...p,buffs:[{id:"seasoning",level:4,until:NOW+20000}]},run,"run",a,at,NOW+2000);
  expect(d.ok).toBe(true);if(d.ok){expect(d.made).toBe("compost");expect(d.mistakes).toBe(1);}
  expect(prepare(p,run,"run",{...target,method:99},at,NOW+2000).ok).toBe(false);
 });
 it("camp creation pays the capacity in rations and refuses occupied sites",()=>{
  const p=purse([["campKit",1],["campCanvas",1],["dryTinder",1],["trailRation",5],["provisionChest",1],["weatherAwning",1]]),at=CAMPS.sites[0];
  const d=makeCamp(p,0,at,null,"A",NOW);expect(d.ok).toBe(true);if(!d.ok)return;
  expect(d.camp.left).toBe(5);expect(d.camp.until).toBe(NOW+45*60000);
  expect(makeCamp(p,0,at,d.camp,"B",NOW).ok).toBe(false);
  expect(makeCamp(p,0,[0,0],null,"A",NOW).ok).toBe(false);
  expect(makeCamp(purse([["campKit",1]]),0,at,null,"A",NOW).ok).toBe(false);
 });
 it("friends consume one shared place, one supply and a global daily allowance; strongest effects survive",()=>{
  const camp={site:0,x:CAMPS.sites[0][0],y:CAMPS.sites[0][1],by:"friend",until:NOW+30000,left:3,wide:false,lit:false};
  const p={...purse([["trailRation",4]]),buffs:[{id:"calm" as const,level:4,until:NOW+3600000}]};
  let nowP=p;
  for(let i=0;i<3;i++){const d=campBenefit(nowP,camp,"trailRation",CAMPS.sites[0],NOW);expect(d.ok).toBe(true);if(!d.ok)return;expect(d.camp.left).toBe(2);expect(d.purse.buffs[0].level).toBe(4);expect(d.purse.buffs[0].until).toBe(NOW+3600000);nowP=d.purse as typeof p;}
  expect(campBenefit(nowP,{...camp,by:"another"},"trailRation",CAMPS.sites[0],NOW)).toEqual({ok:false,why:"spent"});
  expect(campBenefit(p,{...camp,left:0},"trailRation",CAMPS.sites[0],NOW).ok).toBe(false);
  expect(campBenefit(p,camp,"trailRation",[0,0],NOW).ok).toBe(false);
  for(const supply of Object.keys(CAMPS.supplies)){const d=campBenefit(purse([[supply as ItemId,1],["fieldKettle",1]]),camp,supply,CAMPS.sites[0],NOW);expect(d.ok,supply).toBe(true);}
 });
});
