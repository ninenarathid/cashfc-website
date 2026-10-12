import {describe,it,expect} from "vitest";
import {newPurse,held} from "./trade";
import {dayOf} from "./stamina";
import {beginResource,resourceAction} from "./reward-resources";
import {resourceCorrection} from "./private/combos";
import {trailAnswer} from "./reward-trails";
const now=Date.parse("2026-10-11T12:00:00+07:00"),at:[number,number]=[50,24];
function opened(){const p={...newPurse(),bag:[{item:"gemRuby" as const,n:5},{item:"gemSapphire" as const,n:5},{item:"sparkPowder" as const,n:5},null,null],stamina:{day:dayOf(now),left:40},gifts:{had:["charmGemColor" as const,"famSprite" as const],charms:["charmGemColor" as const],familiar:"famSprite" as const}};const d=beginResource(p,"color","gemRuby:gemSapphire:gemRuby","run",at,now,123);if(!d.ok)throw Error(d.why);return d;}
describe("a discovered colour correction inside one batch",()=>{
 it("discovers only after a real miss, preserves ingredients, and offers just one correction",()=>{
  const b=opened(),miss={action:"resourceEnd" as const,run:"run",answers:[0,0,0],at};expect(b.purse.combos).toBeUndefined();
  const retry=resourceAction(b.purse,miss,now+3000,resourceCorrection);if(!retry.ok)throw Error(retry.why);
  expect(retry.correction).toBe(true);expect(retry.purse.bag).toEqual(b.purse.bag);expect(retry.purse.gifts?.used?.charmGemColor).toBeUndefined();expect(retry.purse.combos?.found.map(x=>x.key)).toEqual(["SC15"]);expect(retry.purse.combos?.used.gemCorrection.n).toBe(1);
  expect(resourceAction(retry.purse,miss,now+4000,resourceCorrection).ok).toBe(false);
  const failed=resourceAction(retry.purse,miss,now+6000,resourceCorrection);if(!failed.ok)throw Error(failed.why);expect(failed.correction).toBeUndefined();expect(failed.resource).toBeNull();expect(failed.purse.gifts?.used?.charmGemColor?.n).toBe(1);expect(failed.purse.combos?.used.gemCorrection.n).toBe(1);
 });
 it("a corrected success produces one gem from the original inputs and charges one batch",()=>{
  const b=opened(),miss={action:"resourceEnd" as const,run:"run",answers:[0,0,0],at},retry=resourceAction(b.purse,miss,now+3000,resourceCorrection);if(!retry.ok||!retry.resource)throw Error('No correction');
  const d=resourceAction(retry.purse,{...miss,answers:trailAnswer(retry.resource.node)},now+6000,resourceCorrection);if(!d.ok)throw Error(d.why);
  expect(d.got).toEqual([["gemRuby",1]]);expect(held(d.purse.bag,"gemSapphire")).toBe(4);expect(held(d.purse.bag,"sparkPowder")).toBe(4);expect(d.purse.gifts?.used?.charmGemColor?.n).toBe(1);
 });
 it("rejects retrospective equipment changes and does not repeat the correction in another batch today",()=>{
  const b=opened(),miss={action:"resourceEnd" as const,run:"run",answers:[0,0,0],at};
  const removed=resourceAction({...b.purse,gifts:{...b.purse.gifts!,familiar:null}},miss,now+3000,resourceCorrection);expect(removed.ok&&removed.correction).toBeUndefined();
  const retry=resourceAction(b.purse,miss,now+3000,resourceCorrection);if(!retry.ok)throw Error(retry.why);
  const p={...b.purse,combos:retry.purse.combos,professionRewards:{...b.purse.professionRewards,resource:{...b.resource!,id:"next"}}},d=resourceAction(p,{...miss,run:"next"},now+3000,resourceCorrection);expect(d.ok&&d.correction).toBeUndefined();
 });
});
