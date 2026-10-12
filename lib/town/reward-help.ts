import { works,useGift } from './gifts';
import { held,take,type Purse } from './trade';
import { see,grown,tend,ownerOf,type Plot,type Bed,type FarmSky } from './farm';
import { CROPS } from './items';
import { spend } from './stamina';
import { extractionMarks } from './reward-actions';
import { helpFingerprint } from './help-checkpoints';
export interface ReviveRun {id:string;key:string;identity:string;seed:number;began:number;until:number}
export type HelpInput={action:'helpMend'|'reviveBegin'|'reviveEnd'|'reviveCancel';job?:string;run?:string;marks?:number[];at:[number,number]};
const no=(why:'none'|'far'|'spent')=>({ok:false as const,why});
export function helpGarden(p:Purse,c:HelpInput,id:string,t:number,seed:number,me:string,plots:Readonly<Record<string,Plot>>,bed:Bed|undefined,sky:FarmSky){
 const key=c.at.join(','),plot=plots[key],plant=plot?.plant,state=p.professionRewards??{},r=state.revive;
 if(c.action==='reviveCancel')return{ok:true as const,purse:{...p,professionRewards:{...state,revive:null}},revive:null};
 if(c.action==='helpMend'){
  const job=state.failedGarden?.find(j=>j.id===c.job&&j.key===key&&j.until>t);if(!works(p,'famGardenMender')||!job||job.owner===me||(!plant&&ownerOf(bed,false,t)!==job.owner)||helpFingerprint(plot,job.owner)!==job.fingerprint)return no('none');
  const u=useGift(p,'famGardenMender',t);if(!u.ok)return no('spent');const d=tend(key,plot??{soil:'wild',plant:null},bed,Object.values(plots).filter(v=>!!v.plant).length-Number(!!plant),0,u.purse,me,t,sky);if(!d.ok||d.deed!==job.deed)return no('none');
  return{ok:true as const,purse:{...d.purse,professionRewards:{...state,failedGarden:(state.failedGarden??[]).filter(j=>j.id!==job.id)}},plots:{[key]:d.plot},helpDone:job.deed,got:d.got,...(d.times?{times:d.times}:{})};
 }
 if(!works(p,'thingReviveSeed')||!plant||plant.by===me||plant.root&&plant.root!==key||plant.giant||plant.revived||plant.picked>0||!see(key,plot,t,sky).dead||held(p.bag,CROPS[plant.crop].seed)<1||held(p.bag,'pestCure')<1||ownerOf(bed,true,t)===null)return no('none');
 const identity=`${key}:${plant.by}:${plant.crop}:${plant.sown}`;
 if(c.action==='reviveBegin'){
  if(r&&r.until>t||!Number.isInteger(seed)||seed<0||seed>4294967295)return no('none');const u=useGift(p,'thingReviveSeed',t);if(!u.ok)return no('spent');const revive:ReviveRun={id,key,identity,seed,began:t,until:t+120000};return{ok:true as const,purse:{...u.purse,professionRewards:{...state,revive}},revive};
 }
 if(!r||r.id!==c.run||r.key!==key||r.identity!==identity||r.until<t||t<r.began+2400)return no('far');if(!c.marks||c.marks.length!==3||c.marks.some(n=>!Number.isFinite(n)||n<0||n>1))return no('none');
 const pass=extractionMarks(r.seed).every((n,i)=>Math.abs(n-c.marks![i])<=.07),after={...spend(p,3,t),professionRewards:{...state,revive:null}};if(!pass)return{ok:true as const,purse:after,revive:null,helpPassed:false};
 const revived={...plant,revived:true,cured:t,watered:t,guard:Math.max(plant.guard,t+7200000)};revived.boost+=(CROPS[plant.crop].hours*.5-grown(revived,t,sky))*3600000;
 return{ok:true as const,purse:{...after,bag:take(take(after.bag,CROPS[plant.crop].seed,1),'pestCure',1)},plots:{[key]:{...plot,plant:revived}},revive:null,helpPassed:true};
}
