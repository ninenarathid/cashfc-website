import {describe,it,expect} from "vitest";
import {gather,SPOTS,turnStart,turnOf,type Place} from "./forest";
import {FORAGE_PARTS,gatherPart,restingAt,seesTraces,type ForestPart} from "./foraging-parts";
import {FORAGE_ITEMS,FORAGE_RAW,FORAGE_TOOLS} from "./foraging-items";
import {held,newPurse,type Purse,type Stack} from "./trade";
import {dayOf} from "./stamina";
const NOW=Date.UTC(2026,9,10,5),spot=SPOTS.find(s=>s.kind==='flowers')!,turn=turnOf(spot,NOW),has={turn,item:'chamomile' as const,n:3},next=turnStart(spot,turn+1);
const p=(tools:string[]=[])=>({...newPurse(),bag:[...tools.map(item=>({item,n:1})),...Array(8).fill(null)],stamina:{day:dayOf(NOW),left:100}} as Purse);
describe('forest parts and shared recovery',()=>{
 it('has 25 distinct useful additions, with roots worth more than gentle parts',()=>{
  expect(Object.keys(FORAGE_ITEMS)).toHaveLength(25);expect(FORAGE_RAW).toHaveLength(8);expect(FORAGE_TOOLS).toHaveLength(6);
  expect(FORAGE_ITEMS.flowerBulb.pays).toBeGreaterThan(FORAGE_ITEMS.fragrantPetal.pays);
  expect(FORAGE_ITEMS.wildMedicRoot.pays).toBeGreaterThan(FORAGE_ITEMS.fernTip.pays);
 });
 it('gentle gathering changes the material without resting the patch or giving a second original reward',()=>{
  const d=gather(p(),spot,has,0,false,null,[spot.x,spot.y],{part:'leaf',misses:0,wrong:0},NOW);
  expect(d.ok).toBe(true);if(!d.ok)return;expect(d.got).toEqual([['fragrantPetal',2]]);expect(held(d.purse.bag,'chamomile')).toBe(0);expect(d.rest).toBeUndefined();
  expect(d.purse.forestPartsBook).toEqual(['flowers:leaf:fragrantPetal']);
  expect(gather(d.purse,spot,has,1,true,null,[spot.x,spot.y],{part:'leaf',misses:0,wrong:0},NOW)).toEqual({ok:false,why:'had'});
 });
 it('roots require a tool and leave current shares intact; recovery starts exactly at the next turn',()=>{
  expect(gatherPart(p(),spot,has,'root',null,0,2,next,NOW)).toEqual({ok:false,why:'tool'});
  const a=gatherPart(p(),spot,has,'root','hoe',0,2,next,NOW),b=gatherPart(p(['rootSpade']),spot,has,'root',null,0,2,next,NOW);
  expect(a.ok&&b.ok).toBe(true);if(!a.ok||!b.ok)return;
  expect(a.rest).toEqual({from:next,until:next+30*60000});expect(b.rest).toEqual({from:next,until:next+15*60000});
  expect(restingAt(a.rest,next-1)).toBe(false);expect(restingAt(a.rest,next)).toBe(true);expect(restingAt(a.rest,a.rest!.until)).toBe(false);
 });
 it('overlapping yield bonuses use the strongest, while a padded basket protects misses separately',()=>{
  const leaf=SPOTS.find(s=>s.kind==='leaves')!;
  const a=gatherPart(p(['pruningKnife']),leaf,has,'leaf',null,0,1,next,NOW),b=gatherPart(p(['pruningKnife','specimenPress']),leaf,has,'leaf',null,0,1,next,NOW);
  expect(a.ok&&b.ok).toBe(true);if(!a.ok||!b.ok)return;expect(a.got).toEqual(b.got);expect(a.got[0][1]).toBe(3);
  const c=gatherPart(p(['pruningKnife','forageBasket']),leaf,has,'leaf',null,1,1,next,NOW);expect(c.ok&&c.got[0][1]).toBe(3);
 });
 it('full inventory, invalid choices and distance preserve everything',()=>{
  const full={...p(),bag:Array<Stack>(8).fill({item:'boot',n:1})},before=structuredClone(full);
  expect(gatherPart(full,spot,has,'leaf',null,0,2,next,NOW)).toEqual({ok:false,why:'full'});expect(full).toEqual(before);
  expect(gatherPart(p(),spot,has,'fake' as ForestPart,null,0,2,next,NOW)).toEqual({ok:false,why:'none'});
  expect(gather(p(),spot,has,0,false,null,[0,0],{part:'leaf',misses:0,wrong:0},NOW)).toEqual({ok:false,why:'far'});
  expect(gather(p(),{...spot,kind:'fruit'} as Place,has,0,false,null,[spot.x,spot.y],{part:'leaf',misses:0,wrong:0},NOW)).toEqual({ok:false,why:'none'});
 });
 it('a trace lens and the meal buff reveal the same trail; neither gives automatic rewards',()=>{
  expect(seesTraces(p(),NOW)).toBe(false);expect(seesTraces(p(['traceLens']),NOW)).toBe(true);
  const fed={...p(),buffs:[{id:'traces' as const,level:4,until:NOW+60000}]};expect(seesTraces(fed,NOW)).toBe(true);expect(seesTraces(fed,NOW+60000)).toBe(false);
  expect(FORAGE_PARTS.leaf).toBe(2);
 });
});
