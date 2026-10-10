import { describe, expect, it } from "vitest";
import { REGIONAL_FISH, REGIONAL_DISHES, REGIONAL_ITEMS, REGIONAL_SPECIES } from "./regional-fish";
import { FISH, ITEMS, type BaitId, type ItemId, potIconOf } from "./items";
import { oddsOf, starOdds, startFight, stepFight } from "./fishing";
import { cook } from "./cooking";
import { newPurse } from "./trade";
import { dayOf } from "./stamina";
import { sources } from "./uses";
import { HINT_IDS } from "./hints";
import { catalogOf } from "./catalog";
import atlas from "./icon-atlas.json";

describe("twenty exclusive fish per regional water", () => {
  it("keeps shared fish while providing twenty single-habitat fish in each water", () => {
    expect(Object.keys(REGIONAL_FISH)).toHaveLength(51);
    expect(Object.values(REGIONAL_FISH).filter(f=>f.tier==="legend")).toHaveLength(6);
    for (const habitat of ["creek", "headwater", "pool"] as const) {
      expect(Object.values(FISH).filter(f => f.habitat?.length === 1 && f.habitat[0] === habitat)).toHaveLength(20);
      for (const row of REGIONAL_SPECIES[habitat]) expect(REGIONAL_FISH[row[0]].habitat).toEqual([habitat]);
    }
    expect(FISH.torrentBarb.habitat).toEqual(["creek", "headwater"]);
    expect(FISH.springShrimp.habitat).toEqual(["pool", "headwater"]);
  });

  it("lets every fish be caught, blocks it outside its water, and exposes its actual recipe use", () => {
    const found=sources();
    for (const [id,f] of Object.entries(REGIONAL_FISH)) {
      const bait=Object.keys(f.baits)[0] as BaitId,habitat=f.habitat![0],current=f.current![0],hour=f.hours[0][0];
      const odds=oddsOf(bait,hour,true,false,false,f.needs??[],habitat,current);
      expect(odds.find(o=>o.what===id)?.p,id).toBeGreaterThan(0);
      expect(odds.reduce((n,o)=>n+o.p,0)).toBeCloseTo(1);
      for(const other of ["town","creek","headwater","pool"] as const) if(other!==habitat) {
        expect(oddsOf(bait,hour,true,true,false,["after"],other,current).some(o=>o.what===id),id).toBe(false);
        expect(starOdds(true,false,["after"],3,other,current).some(o=>o.what===id),id).toBe(false);
      }
      if(f.needs)expect(oddsOf(bait,hour,true,false,false,[],habitat,current).some(o=>o.what===id)).toBe(false);
      expect(found.has(id as ItemId),id).toBe(true);
      expect(Object.values(REGIONAL_DISHES).some(d=>d.recipe!.needs.some(([ingredient])=>ingredient===id)),id).toBe(true);
      const fight=startFight(id as keyof typeof FISH,"good",{},19),next=stepFight(fight,true,0.016);
      expect(Number.isFinite(next.t),id).toBe(true);
    }
  });

  it("cooks all eighteen meals, teaches discoverable recipes, and refuses missing/full inventories", () => {
    const now=Date.UTC(2026,9,10,6);
    expect(Object.keys(REGIONAL_DISHES)).toHaveLength(18);
    for(const[id,d]of Object.entries(REGIONAL_DISHES)){
      const r=d.recipe!,p={...newPurse(),bag:[...r.needs.map(([item,n])=>({item,n})),null],stamina:{day:dayOf(now),left:100}};
      const result=cook(p,r.needs,r.in,0,now);
      expect(result.ok,id).toBe(true);
      if(result.ok)expect(result.made,id).toBe(id);
      expect(HINT_IDS,id).toContain(id);
      expect(cook({...p,bag:[null]},r.needs,r.in,0,now).ok,id).toBe(false);
      expect(cook({...p,bag:r.needs.map(([item,n])=>({item,n:n+1}))},r.needs,r.in,0,now).ok,id).toBe(false);
      expect(r.needs.length).toBeLessThanOrEqual(5);
      expect(atlas.icons).toHaveProperty(potIconOf(id as keyof typeof REGIONAL_DISHES));
    }
    for(const id of Object.keys(REGIONAL_ITEMS)){expect(ITEMS).toHaveProperty(id);expect(atlas.icons).toHaveProperty(id);}
  });

  it("rewards harder catches at higher base prices without changing daily profession caps", () => {
    const ranges=new Map<string,number[]>();
    for(const[id,f]of Object.entries(REGIONAL_FISH)){const values=ranges.get(f.tier)??[];values.push(ITEMS[id as ItemId].pays);ranges.set(f.tier,values);}
    const tiers=["common","uncommon","rare","legend"];
    for(let i=1;i<tiers.length;i++)expect(Math.min(...ranges.get(tiers[i])!)).toBeGreaterThan(Math.max(...ranges.get(tiers[i-1])!));
    const cat=catalogOf();
    for(const id of Object.keys(REGIONAL_FISH)){expect(cat.fish).toHaveProperty(id);expect(cat.fishing.fish).toContain(id);expect(cat.work.fishing[id]).toBeGreaterThan(0);}
    for(const id of Object.keys(REGIONAL_DISHES)){expect(cat.cooking.recipes).toContain(id);expect(cat.work.kitchen.pot[id]).toBeGreaterThan(0);}
  });
});
