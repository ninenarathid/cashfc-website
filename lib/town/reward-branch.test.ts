import {describe,it,expect} from "vitest";
import {newPurse,held,type Purse} from "./trade";
import {dayOf} from "./stamina";
import {floorSpots} from "./cave-state";
import {rememberVeinSite,rememberBranch} from "./reward-branch";
import {beginResource,resourceAction} from "./reward-resources";
import {trailAnswer} from "./reward-trails";
import type {PendingVein} from "./mining";
const now=Date.parse("2026-10-11T12:00:00+07:00"),day=dayOf(now),at=floorSpots(3,day).arrive,v:PendingVein={f:3,rock:0,turn:123,seed:13,gem:"fire",mods:{strikes:4,back:0,cross:0,spent:false},more:0};
const p=():Purse=>({...newPurse(),stamina:{day,left:40},gifts:{had:["charmBranchVein"],charms:["charmBranchVein"],familiar:null}});
const source=()=>{const q=rememberVeinSite(p(),p(),v,at,day);return rememberBranch(q,q,v,2,1,"shardCopper",{echo:1,focus:"ore"},now);};
describe("a branch belongs to a real paid main vein",()=>{
 it("requires the charm at opening and result, correct echo, same job/day and positive main hits",()=>{
  const q=rememberVeinSite(p(),p(),v,at,day);
  for(const [before,vein,ore,gems,echo,t]of [[p(),v,2,1,1,now],[q,{...v,seed:14},2,1,1,now],[q,v,0,0,1,now],[q,v,2,1,-1,now],[q,v,2,1,1,now+86400000]] as const)expect(rememberBranch(q,before,vein,ore,gems,"shardCopper",{echo,focus:"ore"},t)).toBe(q);
  expect(source().professionRewards?.branch).toMatchObject({ore:"shardCopper",crystal:"chipRuby",until:now+180000});
 });
 it("uses only mineral families actually reached, with a deterministic cancel/retry game",()=>{
  const q=source(),b=beginResource(q,"branch","crystal","run",at,now,123);if(!b.ok)throw Error(b.why);
  const c=resourceAction(b.purse,{action:"resourceCancel",run:"run",at},now+100);if(!c.ok)throw Error(c.why);
  const next=beginResource(c.purse,"branch","ore","another",at,now+200,999);if(!next.ok)throw Error(next.why);
  expect(next.resource?.node.seed).toBe(b.resource?.node.seed);
  expect(beginResource({...q,professionRewards:{...q.professionRewards,branch:{...q.professionRewards!.branch!,crystal:null}}},"branch","crystal","bad",at,now,1).ok).toBe(false);
 });
 it("finishes one choice once with three stamina; twin powers cannot multiply the branch",()=>{
  for(const [recipe,item,n]of [["ore","shardCopper",4],["crystal","chipRuby",3]] as const){
   const b=beginResource(source(),"branch",recipe,"run",at,now,123);if(!b.ok)throw Error(b.why);
   const end={action:"resourceEnd" as const,run:"run",at,answers:trailAnswer(b.resource!.node)},d=resourceAction(b.purse,end,now+3000);if(!d.ok)throw Error(d.why);
   expect(d.got).toEqual([[item,n]]);expect(held(d.purse.bag,item)).toBe(n);expect(d.purse.stamina?.left).toBe(37);expect(d.purse.gifts?.used?.charmBranchVein.n).toBe(1);expect(d.purse.professionRewards?.branch).toBeNull();expect(resourceAction(d.purse,end,now+4000).ok).toBe(false);
  }
 });
 it("charges a valid missed branch, preserves full-bag attempts and enforces three/day",()=>{
  const b=beginResource(source(),"branch","ore","run",at,now,1);if(!b.ok)throw Error(b.why);
  const miss=resourceAction(b.purse,{action:"resourceEnd",run:"run",at,answers:[0,0,0]},now+3000);if(!miss.ok)throw Error(miss.why);expect(miss.got).toEqual([]);expect(miss.purse.professionRewards?.branch).toBeNull();
  expect(beginResource({...source(),bag:[]},"branch","ore","run",at,now,1)).toEqual({ok:false,why:"full"});
  const exhausted={...source(),gifts:{...p().gifts!,used:{charmBranchVein:{k:day,n:3}}}};expect(beginResource(exhausted,"branch","ore","run",at,now,1)).toEqual({ok:false,why:"spent"});
 });
});
