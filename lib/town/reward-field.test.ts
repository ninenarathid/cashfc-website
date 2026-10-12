import {describe,it,expect} from "vitest";
import {newPurse,put,type Purse} from "./trade";
import {fieldProcess,FIELD_RECIPES} from "./reward-field";
import {dayOf,staminaOf} from "./stamina";
import {usesLeft} from "./gifts";
import type {Make} from "./items";
const now=Date.parse('2026-10-11T12:00:00+07:00');
function player(kind:"wood"|"mineral",id:string,r:Make):Purse{
  const gift=kind==="wood"?"thingPocketSawmill":"famDwarf";
  let bag:Array<Purse["bag"][number]>=Array(20).fill(null);
  for(const [item,n] of r.needs)bag=put(bag,item,n*4);
  for(const item of r.in)bag=put(bag,item,1);
  return {...newPurse(),bag,made:[id as keyof typeof FIELD_RECIPES.wood],gifts:{had:[gift],charms:[],familiar:kind==="mineral"?"famDwarf":null},stamina:{day:dayOf(now),left:50}};
}
describe("processing on the road",()=>{
  for(const kind of ["wood","mineral"] as const)for(const [id,r] of Object.entries(FIELD_RECIPES[kind]))it(`uses the real ${id} recipe without changing its output`,()=>{
    const p=player(kind,id,r),d=fieldProcess(p,kind,id,now);expect(d.ok).toBe(true);if(!d.ok)return;
    expect(d.got).toEqual([[id,r.gives]]);expect(staminaOf(d.purse,now)).toBe(46);expect(d.purse.coins).toBe(p.coins);expect(d.left).toBe(2);
    const absent=fieldProcess({...p,made:[]},kind,id,now);expect(absent).toEqual({ok:false,why:"none"});
  });
  it("does not let an owned dwarf work while another familiar follows",()=>{
    const p=player("mineral","stoneTile",FIELD_RECIPES.mineral.stoneTile);
    expect(fieldProcess({...p,gifts:{...p.gifts!,familiar:null}},"mineral","stoneTile",now)).toEqual({ok:false,why:"none"});
  });
  it("requires original implements and limits total processing to three batches",()=>{
    const p=player("wood","splitPlank",FIELD_RECIPES.wood.splitPlank);
    expect(fieldProcess({...p,bag:p.bag.map(s=>s?.item==="cleaver"?null:s)},"wood","splitPlank",now)).toEqual({ok:false,why:"tool"});
    let q=p;for(let i=0;i<3;i++){const d=fieldProcess(q,"wood","splitPlank",now);if(!d.ok)throw Error(d.why);q=d.purse;}
    expect(usesLeft(q,"thingPocketSawmill",now)).toBe(0);const d=fieldProcess(q,"wood","splitPlank",now);expect(d.ok).toBe(false);expect(p.bag[0]?.n).toBe(4);
  });
});
