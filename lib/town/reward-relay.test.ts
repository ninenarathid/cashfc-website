import {describe,it,expect} from "vitest";
import {waterRelay} from "./reward-relay";
import {newPurse,type Purse} from "./trade";
import {staminaOf,dayOf} from "./stamina";
const now=Date.parse('2026-10-11T12:00:00+07:00'),p=():Purse=>({...newPurse(),bag:[{item:'waterCart',n:1},{item:'waterCart',n:1,water:6},null],hand:'waterCart',handAt:1,gifts:{had:['famWaterRelay'],charms:[],familiar:'famWaterRelay'}});
describe('real water relay',()=>{
 it('conserves container and water with source provenance, a single paid send and free unequipped retrieval',()=>{
  const placed=waterRelay(p(),{action:'relayPlace',slot:0,at:[20,20]},now);if(!placed.ok)throw Error(placed.why);
  const sent=waterRelay(placed.purse,{action:'relaySend',at:[60,20]},now,{kind:'moon',hands:['friend']});if(!sent.ok)throw Error(sent.why);
  expect(sent.moved).toBe(6);expect(sent.purse.bag[1]).toEqual({item:'waterCart',n:1});expect(sent.relay?.kind).toBe('moon');expect(sent.relay?.hands).toEqual(['friend']);expect(staminaOf(sent.purse,now)).toBe(staminaOf(p(),now)-3);expect(sent.purse.gifts?.used?.famWaterRelay?.n).toBe(1);
  expect(waterRelay(sent.purse,{action:'relaySend',at:[30,20]},now).ok).toBe(false);
  const taken=waterRelay({...sent.purse,gifts:{...sent.purse.gifts!,familiar:null}},{action:'relayTake',at:[20,21]},now);if(!taken.ok)throw Error(taken.why);expect(taken.purse.bag[0]).toEqual({item:'waterCart',n:1,water:6});expect(taken.relay).toBe(null);
 });
 it('rejects cross-map, excess range, full bag, ambiguous provenance and exhausted quota without moving anything',()=>{
  const placed=waterRelay(p(),{action:'relayPlace',slot:0,at:[20,20]},now);if(!placed.ok)throw Error(placed.why);
  for(const at of [[61,20],[128,20],[-1,0]] as [number,number][])expect(waterRelay(placed.purse,{action:'relaySend',at},now)).toEqual({ok:false,why:'far'});
  expect(waterRelay({...placed.purse,gifts:{...placed.purse.gifts!,used:{famWaterRelay:{k:dayOf(now),n:3}}}},{action:'relaySend',at:[30,20]},now)).toEqual({ok:false,why:'spent'});
  const full={...placed.purse,bag:[{item:'waterCart' as const,n:1,water:6}]};expect(waterRelay(full,{action:'relayTake',at:[20,20]},now)).toEqual({ok:false,why:'full'});
  const bad=p();bad.bag[0]={item:'waterCart',n:1,water:1};expect(waterRelay(bad,{action:'relayPlace',slot:0,at:[20,20]},now).ok).toBe(false);
 });
});
