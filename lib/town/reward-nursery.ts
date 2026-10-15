import {works,useGift} from './gifts';
import {axeOf,TREES} from './trees';
import {held,take,type Purse} from './trade';
import {spend} from './stamina';
import {stowAll} from './pouches';
import {relayPlace} from './reward-relay';
import {MOUNTAIN} from './world';
import {trailAnswer} from './reward-trails';
import type {NurseryRun,RewardInput,RewardReply,TrailNode} from './reward-types';
import type {WoodPart} from './wood-grain';
export const NURSERY_KINDS=[...TREES.kinds,TREES.elderKind];
export const nurseryKnown=(p:Purse,proof:readonly string[]=[])=>NURSERY_KINDS.filter(k=>(p.professionRewards?.treeKinds??[]).includes(k)||proof.includes(k)||k==='pine'&&held(p.bag,'pineNut')>0);
export const nurseryNode=(r:NurseryRun):TrailNode=>({at:r.at,game:(['memory','order','timing'] as const)[r.next],seed:(r.seed+r.next*7919)%4294967296});
export const nurseryLoot=(kind:string,part:WoodPart):["cedarSliver"|"heartwood"|"pinePitch"|"pineBark"|"pineNut"|"rootFiber",number]=>[part==='wood'?(kind==='elder'?'cedarSliver':'heartwood'):part==='sap'?'pinePitch':part==='bark'?'pineBark':part==='seed'?'pineNut':'rootFiber',kind==='elder'&&part==='wood'?1:2];
export const nurseryPlace=(at:readonly number[])=>at.length===2&&at.every(Number.isSafeInteger)&&(!!relayPlace(at)||at[0]>=MOUNTAIN.x&&at[1]>=MOUNTAIN.y&&at[0]<MOUNTAIN.x+MOUNTAIN.w&&at[1]<MOUNTAIN.y+MOUNTAIN.h);
type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:'none'|'far'|'full'|'spent'};
export function nursery(p:Purse,input:RewardInput,id:string,now:number,seed:number,proof:readonly string[]=[]):Result {
 const state=p.professionRewards??{},run=state.nursery;
 if(input.action==='nurseryLook'){if(!works(p,'thingTinyForest'))return {ok:false,why:'none'};return {ok:true,purse:{...p,professionRewards:{...state,treeKinds:nurseryKnown(p,proof)}}};}
 if(input.action==='nurseryCancel'){
  if(!run||input.nursery!==run.id)return {ok:false,why:'none'};
  return {ok:true,purse:{...p,professionRewards:{...state,nursery:null}},nursery:null};
 }
 if(!works(p,'thingTinyForest')||!axeOf(p))return {ok:false,why:'none'};
 if(!nurseryPlace(input.at))return {ok:false,why:'far'};
 if(input.action==='nurseryBegin'){
  const known=nurseryKnown(p,proof);
  if(run||!Array.isArray(input.kinds)||input.kinds.length!==3||!input.kinds.every(k=>known.includes(k))||held(p.bag,'pineNut')<3||p.bag.some(s=>s?.item==='pineNut'&&Object.keys(s).some(k=>k!=='item'&&k!=='n'))||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:'none'};
  const used=useGift(p,'thingTinyForest',now);if(!used.ok)return {ok:false,why:used.why==='spent'?'spent':'none'};
  const next:NurseryRun={id,at:input.at,kinds:input.kinds,seed,next:0,began:now,part:null,challenge:null};
  return {ok:true,purse:{...used.purse,bag:take(p.bag,'pineNut',3),professionRewards:{...state,nursery:next}},nursery:next,left:used.left};
 }
 if(!('nursery' in input)||!run||input.nursery!==run.id)return {ok:false,why:'none'};
 if(Math.max(...input.at.map((n,i)=>Math.abs(n-run.at[i])))>2)return {ok:false,why:'far'};
 if(input.action==='nurseryStage'){
  if(!['wood','bark','sap','seed','root'].includes(input.part)||run.part&&input.part!==run.part)return {ok:false,why:'none'};
  const next={...run,part:input.part,challenge:run.challenge&&now<=run.challenge.until?run.challenge:{id,began:now,until:now+90000}};
  return {ok:true,purse:{...p,professionRewards:{...state,nursery:next}},nursery:next};
 }
 if(input.action!=='nurseryEnd'||!run.part||!run.challenge||input.challenge!==run.challenge.id||now<run.challenge.began+2400||now>run.challenge.until)return {ok:false,why:'none'};
 const node=nurseryNode(run),expected=trailAnswer(node),timing=node.game==='timing';
 if(!Array.isArray(input.answers)||input.answers.length!==expected.length||!input.answers.every(n=>Number.isFinite(n)&&n>=0&&n<=(timing?1:2)))return {ok:false,why:'none'};
 const won=expected.every((n,i)=>timing?Math.abs(n-input.answers[i])<=.09:n===input.answers[i]),got=won?[nurseryLoot(run.kinds[run.next],run.part)]:[],after=stowAll(p,got);if(!after)return {ok:false,why:'full'};
 // Each tree gets one played attempt; a miss forfeits its harvest.
 const completed=run.next===2,next=completed?null:{...run,next:run.next+1,part:null,challenge:null};
 return {ok:true,purse:{...spend(after,2,now),professionRewards:{...state,nursery:next}},nursery:next,got,completed,passed:won?expected.length:0};
}
