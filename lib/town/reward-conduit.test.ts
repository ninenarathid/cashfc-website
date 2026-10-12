import {describe,it,expect} from "vitest";
import {conduit,conduitAnswer} from "./reward-conduit";
import {newPurse,type Purse} from "./trade";
import type {Plot} from "./farm";
import {staminaOf} from "./stamina";
const now=Date.parse('2026-10-11T12:00:00+07:00'),at:[number,number]=[132,4];
const p=():Purse=>({...newPurse(),bag:[{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:0,gifts:{had:['thingRiverHorn'],charms:[]}});
const bed=():Record<string,Plot>=>Object.fromEntries(Array.from({length:24},(_,i)=>[`${132+i%6},${4+Math.floor(i/6)}`,{soil:'tilled',plant:{by:'friend',crop:'kangkong',sown:now-60000,watered:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0,boost:0}}]));
describe('conduit branches',()=>{
 it('waters only correct branches with the original volume and a shared bed cooldown',()=>{
  const plots=bed(),began=conduit(p(),{action:'conduitBegin',at},'run',plots,0,now,123);if(!began.ok||!began.conduit)throw Error('No run');
  const answers=conduitAnswer(123);answers[1]=(answers[1]+1)%3;
  const d=conduit(began.purse,{action:'conduitEnd',run:'run',answers,at},'end',plots,0,now+3000,0);if(!d.ok)throw Error(d.why);
  expect(d.watered).toHaveLength(16);expect(d.used).toBe(2);expect(d.purse.bag[0]?.water).toBe(4);expect(d.cooldown).toBe(now+3000+5400000);expect(staminaOf(d.purse,now+3000)).toBe(staminaOf(p(),now+3000)-3);
  expect(conduit(d.purse,{action:'conduitBegin',at},'other',plots,d.cooldown!,now+60000,1)).toEqual({ok:false,why:'spent'});
  expect(conduit(d.purse,{action:'conduitEnd',run:'run',answers,at},'repeat',plots,0,now+60000,1).ok).toBe(false);
 });
 it('never waters a replanted identity and rejects early, moved or unequipped results',()=>{
  const plots=bed(),began=conduit(p(),{action:'conduitBegin',at},'run',plots,0,now,123);if(!began.ok||!began.conduit)throw Error('No run');
  const key=began.conduit.roots[0].key;plots[key]={...plots[key],plant:{...plots[key].plant!,sown:now+1}};
  const input={action:'conduitEnd' as const,run:'run',answers:conduitAnswer(123),at};
  expect(conduit(began.purse,input,'end',plots,0,now+100,0).ok).toBe(false);
  expect(conduit(began.purse,{...input,at:[133,4]},'end',plots,0,now+3000,0)).toEqual({ok:false,why:'far'});
  const d=conduit(began.purse,input,'end',plots,0,now+3000,0);if(!d.ok)throw Error(d.why);expect(d.watered).not.toContain(key);expect(d.watered).toHaveLength(23);
  expect(conduit({...began.purse,gifts:{had:[],charms:[]}},input,'end',plots,0,now+3000,0).ok).toBe(false);
 });
});
