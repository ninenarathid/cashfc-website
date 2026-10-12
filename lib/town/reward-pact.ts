import {works,useGift,usesLeft} from './gifts';
import {treeOf,isGrown,farFrom,heldBy,WOOD,type Grove,type Standing} from './trees';
import {carried} from './line';
import {held,take,type Purse} from './trade';
import {spend} from './stamina';
import {stowAll} from './pouches';
import {partReady,restPart} from './tree-parts';
import {trailAnswer} from './reward-trails';
import type {PactRun,RewardInput,RewardReply} from './reward-types';
export const pactNode=(r:PactRun)=>({at:r.at,game:'order' as const,seed:r.seed});
export const pactLoot=(part:PactRun['part']):["pinePitch"|"pineBark"|"pineNut"|"rootFiber",number]=>[part==='bark'?'pineBark':part==='sap'?'pinePitch':part==='seed'?'pineNut':'rootFiber',2];
type Result=({ok:true;purse:Purse;grove?:Grove}&RewardReply)|{ok:false;why:'none'|'far'|'full'|'spent'};
export function treePact(p:Purse,grove:Grove,input:RewardInput,id:string,me:string,now:number,seed:number,wood:readonly Standing[]=WOOD):Result {
 const state=p.professionRewards??{},run=state.pact;
 if(input.action==='pactCancel')return {ok:true,purse:{...p,professionRewards:{...state,pact:null}},pact:null};
 const water=carried(p);if(!works(p,'charmTreePact')||!water||held(p.bag,'compost')<1)return {ok:false,why:'none'};
 const tree=treeOf(input.action==='pactBegin'?input.tree:run?.tree??-1,wood);
 if(!tree||tree.elder||!isGrown(grove,tree,now)||heldBy(grove,tree.id,now))return {ok:false,why:'none'};
 if(farFrom(tree,input.at)>1)return {ok:false,why:'far'};
 if(input.action==='pactBegin'){
  if(run&&now<=run.until||!['bark','sap','seed','root'].includes(input.part)||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:'none'};
  if(!partReady(grove.parts,tree.id,input.part,now)||usesLeft(p,'charmTreePact',now)<1)return {ok:false,why:'spent'};
  const next:PactRun={id,tree:tree.id,part:input.part,at:input.at,seed,began:now,until:now+90000};
  return {ok:true,purse:{...p,professionRewards:{...state,pact:next}},pact:next};
 }
 if(input.action!=='pactEnd'||!run||input.run!==run.id||now<run.began+2400||now>run.until||!Array.isArray(input.answers)||input.answers.length!==3||!input.answers.every(n=>Number.isInteger(n)&&n>=0&&n<=2))return {ok:false,why:'none'};
 if(input.at.some((n,i)=>n!==run.at[i]))return {ok:false,why:'far'};
 if(!partReady(grove.parts,tree.id,run.part,now))return {ok:false,why:'spent'};
 const passed=trailAnswer(pactNode(run)).filter((n,i)=>n===input.answers[i]).length,got=passed===3?[pactLoot(run.part)]:[],used=useGift(p,'charmTreePact',now);if(!used.ok)return {ok:false,why:used.why==='spent'?'spent':'none'};
 const bag=take(used.purse.bag,'compost',1),n=water.has-1;bag[water.slot]=n?{item:water.hand,n:1,water:n}:{item:water.hand,n:1};
 const home=stowAll({...used.purse,bag},got);if(!home)return {ok:false,why:'full'};
 return {ok:true,purse:{...spend(home,2,now),professionRewards:{...state,pact:null}},pact:null,got,passed,left:used.left,...(passed===3?{grove:{...grove,parts:restPart(grove.parts,tree.id,run.part,now)}}:{})};
}
