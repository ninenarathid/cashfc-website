import {describe,it,expect} from "vitest";
import {springAction,SPRINGS} from "./reward-springs";
import {newPurse,type Purse} from "./trade";
import {dayOf} from "./stamina";
const now=Date.parse('2026-10-11T12:00:00+07:00'),p=():Purse=>({...newPurse(),bag:[{item:'waterCart',n:1},null],hand:'waterCart',handAt:0,gifts:{had:['thingSpringStone'],charms:[]}});
describe('one shared finite spring',()=>{
 it('shares twelve bucketfuls among all visitors and preserves the creator use after depletion',()=>{
  const create=springAction(p(),{action:'springPlace',site:0,at:SPRINGS.sites[0]},'spring','creator',null,now);if(!create.ok)throw Error(create.why);
  expect(create.purse.gifts?.used?.thingSpringStone?.n).toBe(1);
  const visitor={...p(),gifts:{had:[],charms:[]}},input={action:'springDraw' as const,site:0,at:SPRINGS.sites[0]};
  const a=springAction(visitor,input,'a','A',create.spring,now),b=a.ok?springAction(visitor,input,'b','B',a.spring,now):a;if(!a.ok||!b.ok)throw Error('Cannot draw');
  expect(a.moved).toBe(6);expect(b.moved).toBe(6);expect(b.spring.left).toBe(0);expect(a.purse.bag[0]?.water).toBe(6);
  expect(springAction(visitor,input,'c','C',b.spring,now)).toEqual({ok:false,why:'none'});
  expect(springAction(create.purse,{action:'springPlace',site:1,at:SPRINGS.sites[1]},'new','creator',null,now)).toEqual({ok:false,why:'spent'});
 });
 it('rejects filled/stacked containers, foreign sites and expired sources',()=>{
  const source={site:0,id:'source',by:'other',at:SPRINGS.sites[0],until:now+60000,left:12},input={action:'springDraw' as const,site:0,at:SPRINGS.sites[0]};
  expect(springAction({...p(),bag:[{item:'waterCart',n:1,water:1},{item:'waterCart',n:1}]},input,'a','me',source,now).ok).toBe(false);
  expect(springAction({...p(),bag:[{item:'waterCart',n:2},null]},input,'a','me',source,now).ok).toBe(false);
  expect(springAction(p(),input,'a','me',source,now+60000)).toEqual({ok:false,why:'none'});
  expect(springAction(p(),{...input,at:[0,0]},'a','me',source,now)).toEqual({ok:false,why:'far'});
  expect(springAction({...p(),gifts:{...p().gifts!,used:{thingSpringStone:{k:dayOf(now),n:1}}}},{action:'springPlace',site:0,at:SPRINGS.sites[0]},'new','me',null,now).ok).toBe(false);
 });
});
