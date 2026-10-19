import {works,useGift} from "./gifts";
import {carried} from "./line";
import {FARMING,localRainMs,see,type Plot,type FarmSky} from "./farm";
import {WATERS,type Nature} from "./waters";
import {spend,dayOf} from "./stamina";
import {BEDS_IN_FARM,bedOf,bedCorner} from "./world";
import type {Purse} from "./trade";
import type {RewardInput,RewardReply,CloudRun} from "./reward-types";
import {plantIdentity} from "./reward-conduit";
import {extractionMarks} from "./reward-actions";
export interface CloudConsent {by:string;giver:string;until:number}
export interface CloudWorld {plots:Record<string,Plot>;owners:Record<string,string>;consents:Record<string,CloudConsent>;kind:Nature|null;rains:FarmSky;local?:boolean}
type Result=({ok:true;purse:Purse;plots?:Record<string,Plot>;consent?:CloudConsent|null}&RewardReply)|{ok:false;why:"none"|"far"|"spent"|"theirs"};
const permitted=(bed:number,me:string,w:CloudWorld,now:number)=>w.owners[bed]===me || (w.owners[bed]===w.consents[bed]?.by && w.consents[bed]?.giver===me && w.consents[bed]?.until>now);
export function callCloud(p:Purse,input:RewardInput,id:string,me:string,w:CloudWorld,now:number,seed:number):Result {
 const state=p.professionRewards??{},run=state.cloud,bed=bedOf(...input.at);
 if(input.action==='cloudConsent'){
  if(bed<0)return {ok:false,why:'far'};
  if(w.owners[bed]!==me)return {ok:false,why:'theirs'};
  if(input.giver!==null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.giver)&&!(w.local&&/^[A-Za-z0-9._-]{1,64}$/.test(input.giver)))return {ok:false,why:'none'};
  return {ok:true,purse:p,consented:!!input.giver,consent:input.giver?{by:me,giver:input.giver,until:now+600000}:null};
 }
 if(input.action==='cloudCancel')return {ok:true,purse:{...p,professionRewards:{...state,cloud:null}},cloud:null};
 const water=carried(p);
 if(!works(p,'thingCloudJar')||!water||!w.kind)return {ok:false,why:'none'};
 if(input.action==='cloudBegin'){
  if(run&&run.until>=now)return {ok:false,why:'none'};
  if(bed<0||input.beds.length<1||input.beds.length>3||new Set(input.beds).size!==input.beds.length||!input.beds.every(n=>Number.isSafeInteger(n)&&n>=0&&n<BEDS_IN_FARM))return {ok:false,why:'far'};
  if(!input.beds.every(n=>permitted(n,me,w,now)))return {ok:false,why:'theirs'};
  if(!input.beds.every(n=>{const c=bedCorner(n);return Math.max(Math.abs(c[0]+4-input.at[0]),Math.abs(c[1]+4-input.at[1]))<=20;}))return {ok:false,why:'far'};
  const roots=Object.entries(w.plots).sort(([a],[b])=>a<b?-1:a>b?1:0).filter(([key,plot])=>{const [x,y]=key.split(',').map(Number),q=plot.plant,s=see(key,plot,now,w.rains);return input.beds.includes(bedOf(x,y))&&q&&(!q.root||q.root===key)&&!s.dead&&!s.wet&&!s.ripe&&q.localRain?.day!==dayOf(now);}).map(([key,plot])=>({key,identity:plantIdentity(key,plot)!}));
  if(!roots.length||roots.length>192||!Number.isSafeInteger(seed)||seed<0||seed>4294967295)return {ok:false,why:'none'};
  const next:CloudRun={id,at:input.at,beds:input.beds,roots,seed,kind:w.kind,began:now,until:now+90000};
  return {ok:true,purse:{...p,professionRewards:{...state,cloud:next}},cloud:next};
 }
 if(input.action!=='cloudEnd'||!run||input.run!==run.id||now<run.began+2400||now>run.until||input.marks.length!==3||!input.marks.every(n=>Number.isFinite(n)&&n>=0&&n<=1)||w.kind!==run.kind)return {ok:false,why:'none'};
 if(input.at.some((n,i)=>n!==run.at[i]))return {ok:false,why:'far'};
 if(!run.beds.every(n=>permitted(n,me,w,now)))return {ok:false,why:'theirs'};
 const expected=extractionMarks(run.seed),passed=input.marks.filter((n,i)=>Math.abs(n-expected[i])<=.09).length;
 const plots:Record<string,Plot>={};
 if(passed===3)for(const r of run.roots){const plot=w.plots[r.key],q=plot?.plant;if(!q||plantIdentity(r.key,plot)!==r.identity||q.localRain?.day===dayOf(now)||see(r.key,plot,now,w.rains).dead)continue;
  const base=FARMING.water.adds*60000;
  plots[r.key]={...plot,plant:{...q,boost:q.boost+localRainMs(q,now,w.rains)*FARMING.water.adds/FARMING.water.every+base*WATERS.adds[run.kind],guard:Math.max(q.guard,now+WATERS.guards[run.kind]*3600000),localRain:{id:run.id,by:me,from:now,until:now+600000,day:dayOf(now)}}};
 }
 if(passed===3&&!Object.keys(plots).length)return {ok:false,why:'none'};
 const used=useGift(p,'thingCloudJar',now);if(!used.ok)return {ok:false,why:used.why==='spent'?'spent':'none'};
 const bag=p.bag.slice(),n=water.has-1;bag[water.slot]=n?{item:water.hand,n:1,water:n}:{item:water.hand,n:1};
 return {ok:true,purse:{...spend(used.purse,6,now),bag,professionRewards:{...state,cloud:null}},cloud:null,plots,watered:Object.keys(plots),used:1,passed,left:used.left};
}
