import { describe, expect, it } from "vitest";
import { newPurse, type Purse } from "./trade";
import { beginExtraction, endExtraction, extractionMarks, extractionSource, scanMineral, learnMinerals, mineralKnowledge } from "./reward-actions";
import { stowAll, POUCHES } from "./pouches";
import { usesLeft } from "./gifts";
import { dayOf, staminaOf } from "./stamina";
import { Trial } from "./trial";

const now=Date.parse("2026-10-11T12:00:00+07:00"),request="00000000-0000-4000-8000-000000000111";
const player=():Purse=>({...newPurse(),bag:Array(10).fill(null),gifts:{had:["thingOreCompass","thingForesterKnife"],charms:[],familiar:null},stamina:{day:dayOf(now),left:50}});
const source=()=>extractionSource(player(),7,[10,10],"wood","heart",now);
const world={rocks:[{id:1,x:12,y:8,look:0},{id:2,x:10,y:9,look:0},{id:3,x:9,y:10,look:0}],ore:"shardCopper" as const,gem:"chipRuby" as const,stands:()=>true,fate:(id:number)=>id===1?{kind:"vein" as const,gem:false,seed:123}:id===2?{kind:"way" as const,shards:0}:{kind:"crystal" as const}};
describe("earned profession rewards",()=>{
  it("learns successful loot, preserves the knowledge after selling, and learns nothing from a failed haul",()=>{
    const p=player(),q=stowAll(p,[["shardCopper",1]])!;
    expect(mineralKnowledge({...q,bag:Array(10).fill(null)})).toEqual(["shardCopper"]);
    expect(stowAll({...p,bag:[]},[["shardCopper",1]])).toBeNull();
    expect(p.professionRewards).toBeUndefined();
  });
  it("scans known standing minerals with a coarse answer, excluding stairs and the daily crystal",()=>{
    const p=learnMinerals(player(),[["shardCopper",1]]),d=scanMineral(p,"shardCopper",[10,10],now,world);
    expect(d.ok).toBe(true);if(!d.ok)return;
    expect(d.direction).toBe("NE");expect(d.distance).toBe("near");expect(d.left).toBe(4);
    expect(Object.keys(d).sort()).toEqual(["direction","distance","left","ok","purse"]);
    expect(scanMineral(p,"chipRuby",[10,10],now,world)).toEqual({ok:false,why:"none"});
    const empty=scanMineral(p,"shardCopper",[10,10],now,{...world,stands:()=>false});expect(empty.ok).toBe(true);if(empty.ok){expect(empty.left).toBe(4);expect(empty.direction).toBeUndefined();expect(usesLeft(empty.purse,"thingOreCompass",now)).toBe(4);}
  });
  it("has a five-scan daily cap without spending stamina",()=>{
    let p=learnMinerals(player(),[["shardCopper",1]]);
    for(let i=0;i<5;i++){const d=scanMineral(p,"shardCopper",[10,10],now,world);expect(d.ok).toBe(true);if(d.ok)p=d.purse;}
    expect(scanMineral(p,"shardCopper",[10,10],now,world)).toEqual({ok:false,why:"spent"});
    expect(staminaOf(p,now)).toBe(50);expect(usesLeft(p,"thingOreCompass",now+86400000)).toBe(5);
  });
  it("requires a real trunk, distinct small part, valid reach, and one active extraction",()=>{
    expect(beginExtraction(player(),request,"bark",[10,10],now,123).ok).toBe(false);
    expect(beginExtraction(source(),request,"bark",[20,10],now,123)).toEqual({ok:false,why:"far"});
    const d=beginExtraction(source(),request,"bark",[10,10],now,123);expect(d.ok).toBe(true);if(!d.ok)return;
    expect(beginExtraction(d.purse,request,"sap",[10,10],now,123).ok).toBe(false);
    expect(endExtraction(d.purse,request,extractionMarks(123),[10,10],now+1000).ok).toBe(false);
    expect(endExtraction(d.purse,request,extractionMarks(123),[11,10],now+3000)).toEqual({ok:false,why:"far"});
  });
  it("consumes the trunk and one use on success, pays stamina and respects equipped tools",()=>{
    const b=beginExtraction({...source(),wears:["barkKnife"]},request,"bark",[10,10],now,123);if(!b.ok)throw Error("begin");
    const d=endExtraction(b.purse,request,extractionMarks(123),[10,10],now+3000);expect(d.ok).toBe(true);if(!d.ok)return;
    expect(d.got).toEqual([["pineBark",2]]);expect(d.purse.professionRewards?.extraction).toBeNull();
    expect(usesLeft(d.purse,"thingForesterKnife",now)).toBe(4);expect(staminaOf(d.purse,now+3000)).toBe(49);
    expect(endExtraction(d.purse,request,extractionMarks(123),[10,10],now+4000).ok).toBe(false);
  });
  it("leaves run, use, inventory, and stamina intact when the output cannot fit",()=>{
    const b=beginExtraction({...source(),bag:[]},request,"bark",[10,10],now,123);if(!b.ok)throw Error("begin");
    expect(endExtraction(b.purse,request,extractionMarks(123),[10,10],now+3000)).toEqual({ok:false,why:"full"});
    expect(usesLeft(b.purse,"thingForesterKnife",now)).toBe(5);expect(b.purse.professionRewards?.run?.id).toBe(request);
  });
  it("charges a missed extraction once without awarding an extra resource",()=>{
    const b=beginExtraction(source(),request,"seed",[10,10],now,123);if(!b.ok)throw Error("begin");
    const d=endExtraction(b.purse,request,[0,0,0],[10,10],now+3000);expect(d.ok).toBe(true);if(d.ok){expect(d.got).toEqual([]);expect(d.left).toBe(4);}
  });
  it("supports the new small materials in old pouches with unchanged capacities",()=>{
    expect(POUCHES.map(p=>[p.gift,p.slots])).toEqual([["thingCreel",5],["thingSack",5],["thingBundle",3]]);
    const p={...player(),gifts:{...player().gifts!,had:[...player().gifts!.had,"thingBundle" as const]}};
    const q=stowAll(p,[["pineBark",2]])!;expect(q.bag.every(s=>s===null)).toBe(true);expect(q.pouches?.thingBundle?.[0]).toEqual({item:"pineBark",n:2});
  });
  it("retries the same trial command without replacing newer purse data or opening a second run",()=>{
    const t=new Trial("reward-retry"),p=source();t.fished({...p,professionRewards:{...p.professionRewards,extraction:{...p.professionRewards!.extraction!,until:Date.now()+180000}}});
    const input={action:"extractBegin" as const,part:"bark" as const,at:[10,10] as [number,number]},d=t.rewardDo(input,request);expect(d.ok).toBe(true);
    t.fished({...t.purse(),coins:9876});expect(t.rewardDo(input,request)).toEqual(d);expect(t.purse().coins).toBe(9876);
    expect(t.rewardDo({...input,part:"sap"},request)).toEqual({ok:false,why:"none"});
  });
});
