import {describe,it,expect} from "vitest";
import {newPurse,type Purse} from "./trade";
import {dayOf} from "./stamina";
import {startSchool,schoolWeights} from "./reward-fishing";
import {FISH,FISH_IDS,type FishId} from "./items";
const now=Date.parse("2026-10-11T12:00:00+07:00"),fish=FISH_IDS.find(id=>FISH[id].tier!=="legend")!,legend=FISH_IDS.find(id=>FISH[id].tier==="legend")!,other=FISH_IDS.find(id=>id!==fish)!;
const pool=[{what:fish,p:.2},{what:other,p:.8}],p=():Purse=>({...newPurse(),stamina:{day:dayOf(now),left:40},best:{[fish]:30},gifts:{had:["thingSchoolBell" as const],charms:[],familiar:null}});
describe("a shoal call weighs only eligible catches",()=>{
 it("requires prior catch, ownership and eligible regular pool; legends do not spend uses",()=>{
  expect(startSchool({...p(),best:{}},fish,pool,now).ok).toBe(false);expect(startSchool({...p(),gifts:{had:[],charms:[],familiar:null}},fish,pool,now).ok).toBe(false);
  expect(startSchool(p(),fish,[],now).ok).toBe(false);expect(startSchool({...p(),best:{[legend]:30}},legend,[{what:legend,p:1}],now).ok).toBe(false);
  const b=startSchool(p(),fish,pool,now);if(!b.ok)throw Error(b.why);expect(b.school.left).toBe(3);expect(b.purse.stamina).toEqual(p().stamina);
 });
 it("triples draw weight, keeps the same pool, and uses one charge per cast",()=>{
  const b=startSchool(p(),fish,pool,now);if(!b.ok)throw Error(b.why);let q:Purse=b.purse;
  for(let i=0;i<3;i++){const d=schoolWeights(q,pool,false,now);expect(d.odds[0].p).toBeCloseTo(.6/1.4);expect(d.odds.map(x=>x.what)).toEqual(pool.map(x=>x.what));expect(d.purse.professionRewards?.school?.left).toBe(2-i);q=d.purse;}
  expect(schoolWeights(q,pool,false,now).odds).toEqual(pool);expect(q.gifts?.used?.thingSchoolBell.n).toBe(1);
 });
 it("star, absent targets and expired calls preserve charges and ordinary odds",()=>{
  const b=startSchool(p(),fish,pool,now);if(!b.ok)throw Error(b.why);
  for(const [odds,star,t]of [[pool,true,now],[pool,false,now+1800000],[[{what:other,p:1}],false,now]] as const){const d=schoolWeights(b.purse,odds,star,t);expect(d.purse).toBe(b.purse);expect(d.odds).toEqual(odds);}
 });
 it("cannot replace an active call and allows two calls per day after charges are used",()=>{
  let q=p();for(let n=0;n<2;n++){const b=startSchool(q,fish,pool,now);if(!b.ok)throw Error(b.why);expect(startSchool(b.purse,fish,pool,now).ok).toBe(false);q=b.purse;for(let i=0;i<3;i++)q=schoolWeights(q,pool,false,now).purse;}
  expect(startSchool(q,fish,pool,now)).toEqual({ok:false,why:"spent"});expect(startSchool(q,fish,pool,now+86400000).ok).toBe(true);
 });
});
