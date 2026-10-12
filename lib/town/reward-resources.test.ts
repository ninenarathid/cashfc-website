import {describe,it,expect} from "vitest";
import {newPurse,held,type Purse} from "./trade";
import {GEMS,ELEMENTS} from "./tools";
import {SPOTS} from "./forest";
import {dayOf} from "./stamina";
import {RESOURCE_GIFTS,resourceRecipe,beginResource,resourceAction} from "./reward-resources";
import {trailAnswer} from "./reward-trails";
import type {ResourceKind} from "./reward-types";

const now=Date.parse("2026-10-11T12:00:00+07:00"),smith:[number,number]=[50,24],forest:[number,number]=[SPOTS[10].x,SPOTS[10].y];
function player(kind:ResourceKind,key:string):Purse{const r=resourceRecipe(kind,key)!;return {...newPurse(),bag:[...r.needs.map(([item,n])=>({item,n:n*4})),...Array(15).fill(null)],stamina:{day:dayOf(now),left:40},gifts:{had:[RESOURCE_GIFTS[kind]],charms:kind==="color"?["charmGemColor"]:[],familiar:null},professionRewards:{minerals:ELEMENTS.map(e=>GEMS[e].chip)}};}
function complete(p:Purse,kind:ResourceKind,key:string){const at=kind==="hive"?forest:smith,b=beginResource(p,kind,key,"run",at,now,123);if(!b.ok)throw Error(b.why);return resourceAction(b.purse,{action:"resourceEnd",run:"run",answers:trailAnswer(b.resource!.node),at},now+3000);}
describe("real-resource profession activities",()=>{
  for(const [kind,key]of [["hive","honey"],["hive","wax"],["repair","chipRuby"],["color","gemRuby:gemSapphire:gemAmber"]] as const)it(`${kind}/${key} consumes physical ingredients once and yields one choice`,()=>{
    const p=player(kind,key),r=resourceRecipe(kind,key)!,d=complete(p,kind,key);expect(d.ok).toBe(true);if(!d.ok)return;
    for(const [id,n]of r.needs)expect(held(d.purse.bag,id)).toBe(held(p.bag,id)-n+(r.got.find(x=>x[0]===id)?.[1]??0));
    expect(d.got).toEqual(r.got);expect(d.purse.gifts?.used?.[RESOURCE_GIFTS[kind]]?.n).toBe(1);expect(d.purse.stamina?.left).toBe(37);
    expect(resourceAction(d.purse,{action:"resourceEnd",run:"run",answers:[0,0,0],at:smith},now+3000).ok).toBe(false);
  });
  it("requires equipped charm, known target, two different loose gems and original resources",()=>{
    const p=player("color","gemRuby:gemSapphire:gemAmber"),args=["color","gemRuby:gemSapphire:gemAmber","run",smith,now,123] as const;
    expect(beginResource({...p,gifts:{...p.gifts!,charms:[]}},...args).ok).toBe(false);
    expect(beginResource({...p,professionRewards:{minerals:[]}},...args).ok).toBe(false);
    expect(resourceRecipe("color","gemRuby:gemRuby:gemAmber")).toBeNull();
    expect(beginResource({...p,bag:p.bag.map(s=>s?.item==="gemRuby"?{...s,plus:7}:s)},...args).ok).toBe(false);
    expect(beginResource({...p,bag:[]},...args).ok).toBe(false);
  });
  it("rejects early, remote and stale results; a valid miss spends one attempt and keeps ingredients",()=>{
    const p=player("repair","chipRuby"),b=beginResource(p,"repair","chipRuby","run",smith,now,123);if(!b.ok)throw Error(b.why);
    const end={action:"resourceEnd" as const,run:"run",answers:trailAnswer(b.resource!.node),at:smith};
    for(const time of [now+500,now+90001])expect(resourceAction(b.purse,end,time).ok).toBe(false);
    expect(resourceAction(b.purse,{...end,at:[51,24]},now+3000).ok).toBe(false);
    const miss=resourceAction(b.purse,{...end,answers:[0,0,0]},now+3000);expect(miss.ok).toBe(true);if(miss.ok){expect(miss.got).toEqual([]);expect(miss.purse.bag).toEqual(p.bag);expect(miss.purse.gifts?.used?.thingCrystalRepair?.n).toBe(1);}
  });
  it("checks output room before starting or paying, and enforces daily limits",()=>{
    const p=player("hive","honey"),full={...p,bag:[{item:"fragrantPetal" as const,n:20}]};
    expect(beginResource(full,"hive","honey","run",forest,now,123)).toEqual({ok:false,why:"full"});
    const d=complete(p,"hive","honey");if(!d.ok)throw Error(d.why);
    expect(beginResource(d.purse,"hive","wax","next",forest,now,123)).toEqual({ok:false,why:"spent"});
    expect(beginResource(d.purse,"hive","wax","next",forest,now+86400000,123).ok).toBe(true);
  });
  it("can cancel without moving ingredients or charging an unplayed attempt",()=>{
    const p=player("repair","chipRuby"),b=beginResource(p,"repair","chipRuby","run",smith,now,123);if(!b.ok)throw Error(b.why);
    const d=resourceAction(b.purse,{action:"resourceCancel",run:"run",at:[0,0]},now+100);if(!d.ok)throw Error(d.why);
    expect(d.purse.bag).toEqual(p.bag);expect(d.purse.gifts?.used).toEqual(p.gifts?.used);expect(d.resource).toBeNull();
  });
});
