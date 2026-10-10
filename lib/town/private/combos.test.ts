import { describe, expect, it } from "vitest";
import { comboCue, comboLoadout, matchesCombo, prepareCombo, rescueCombo } from "./combos";
import { foundCombos } from "../combo-types";
import { giftsOf, type CharmId, type FamiliarId } from "../gifts";
import { newPurse, type Purse } from "../trade";
import { grainOf } from "../wood-grain";
const NOW=Date.UTC(2026,9,10,5);
function purse(charms: CharmId[], familiar: FamiliarId): Purse { const p=newPurse(); return {...p,gifts:{...giftsOf(p),had:[...charms,familiar],charms,familiar}}; }
const otter=()=>purse(["charmFloat"],"famOtter");
const wood=()=>purse(["charmEchoAxe"],"famWoodpecker");
const target=(p:Purse)=>({tree:5,notches:grainOf(5).notches.map(x=>-x),loadout:comboLoadout(p)});
describe("secret equipment bonds",()=>{
 it("the matcher supports two charms, charm–pet and trio, but never two pets",()=>{
  const p=purse(["charmFloat","charmLine"],"famOtter");
  expect(matchesCombo(p,["charmFloat","charmLine"])).toBe(true);
  expect(matchesCombo(p,["charmFloat","famOtter"])).toBe(true);
  expect(matchesCombo(p,["charmFloat","charmLine","famOtter"])).toBe(true);
  expect(matchesCombo({...p,gifts:{...p.gifts!,had:[...p.gifts!.had,"famBat"]}},["famOtter","famBat"])).toBe(false);
  expect(matchesCombo(p,[])).toBe(false);
  expect(matchesCombo(p,["charmFloat","charmFloat"])).toBe(false);
  expect(matchesCombo({...p,gifts:{...p.gifts!,had:[...p.gifts!.had,"thingBait"]}},["charmFloat","thingBait"])).toBe(false);
 });
 it("ownership and actual slots decide activation; the bag does not",()=>{
  const p=otter(); expect(comboCue(p,"wear")).toBe("water");
  expect(comboCue({...p,gifts:{...p.gifts!,had:["famOtter"]}},"wear")).toBeUndefined();
  expect(comboCue({...p,gifts:{...p.gifts!,charms:[]}},"wear")).toBeUndefined();
  expect(comboCue({...p,gifts:{...p.gifts!,familiar:null}},"wear")).toBeUndefined();
  expect(foundCombos(p)).toEqual([]);
 });
 it("loadout order is stable but changing equipment mid-action cannot claim",()=>{
  const p=purse(["charmFloat","charmLine"],"famOtter");
  expect(comboLoadout({...p,gifts:{...p.gifts!,charms:["charmLine","charmFloat"]}})).toBe(comboLoadout(p));
  expect(rescueCombo(p,"fish:1",NOW,comboLoadout(otter()))).toBeNull();
 });
 it("the wood bird corrects exactly one unread error and does not duplicate tool hints",()=>{
  const p=wood(),t=target(p),a=prepareCombo(p,"wood","wood:1",NOW,{...t,hints:1})!;
  expect(a.effect).toMatchObject({index:1,side:grainOf(5).notches[1],fresh:true});
  expect(prepareCombo(p,"wood","wood:2",NOW,{...t,hints:3})).toBeNull();
  expect(prepareCombo(p,"wood","wood:2",NOW,{...t,notches:grainOf(5).notches})).toBeNull();
  const repeat=prepareCombo(a.purse,"wood","wood:1",NOW+1,{...t,notches:[-1,-1,-1]})!;
  expect(repeat.effect).toMatchObject({index:1,fresh:false}); expect(repeat.purse).toBe(a.purse);
  expect(a.purse.bag).toEqual(p.bag); expect(a.purse.coins).toBe(p.coins);
 });
 it("rejects malformed choices, missing action snapshots and wrong contexts",()=>{
  const p=wood();
  for(const notches of [null,[],[0,1,-1],["-1",1,-1],[1,1,1,1]]) expect(prepareCombo(p,"wood","wood:1",NOW,{...target(p),notches})).toBeNull();
  expect(prepareCombo(p,"wood","wood:1",NOW,{...target(p),loadout:undefined})).toBeNull();
  expect(prepareCombo(otter(),"wood","wood:1",NOW,{...target(otter())})).toBeNull();
 });
 it("mining reactions give information once and respect stronger effects",()=>{
  const p=purse(["charmMinerLamp"],"famBat"),t={seed:13,loadout:comboLoadout(p)};
  expect(prepareCombo(p,"cavity","vein:1",NOW,{...t,cavities:true})).toBeNull();
  const a=prepareCombo(p,"cavity","vein:1",NOW,t)!;
  expect(a.effect).toMatchObject({cavities:true,fresh:true});
  expect(prepareCombo(a.purse,"cavity","vein:1",NOW+1,t)?.effect.fresh).toBe(false);
  const bird=purse(["charmMinerLamp"],"famWoodpecker"),u={seed:14,loadout:comboLoadout(bird)};
  expect(prepareCombo(bird,"echo","vein:2",NOW,{...u,hint:true})).toBeNull();
  expect(prepareCombo(bird,"echo","vein:2",NOW,u)?.effect.echo).toBe(-1);
 });
 it("two water recipes share three daily uses; duplicates and day rollover are safe",()=>{
  let p=otter();
  const a=rescueCombo(p,"fish:1",NOW,comboLoadout(p))!; expect(a.effect.resume).toBe(.2); p=a.purse;
  p={...p,gifts:{...p.gifts!,had:[...p.gifts!.had,"charmLine"],charms:["charmFloat","charmLine"]}};
  const b=rescueCombo(p,"fish:2",NOW,comboLoadout(p))!;expect(b.effect.resume).toBe(.35);p=b.purse;
  p=rescueCombo(p,"fish:3",NOW,comboLoadout(p))!.purse;
  expect(rescueCombo(p,"fish:4",NOW,comboLoadout(p))).toBeNull();
  expect(rescueCombo(p,"fish:3",NOW,comboLoadout(p))?.purse).toBe(p);
  expect(foundCombos(p).map(f=>f.key)).toEqual(["SC01","SC13"]);
  expect(rescueCombo(p,"fish:4",NOW+86400000,comboLoadout(p))?.purse.combos?.used.rescue.n).toBe(1);
 });
 it("discovery projections tolerate old purses and never show unknown slots",()=>{
  expect(foundCombos({combos:{found:[null,{key:"bad"}]}})).toEqual([]);
  const p=otter(),a=rescueCombo(p,"fish:1",NOW,comboLoadout(p))!;
  expect(foundCombos(a.purse)).toHaveLength(1);
  expect(a.purse.combos?.used.rescue.n).toBe(1);
 });
});
