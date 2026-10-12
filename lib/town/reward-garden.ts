import{works,useGift}from'./gifts';import{held,take,put,roomFor,type Purse}from'./trade';import{CROPS,type CropId}from'./items';import{GARDEN_CROPS,type GardenCropId}from'./garden-items';import{GARDEN,syncGarden,gardenCross}from'./gardening';import{bedOf}from'./world';import{see,type Plot,type FarmSky}from'./farm';import{spend}from'./stamina';import{extractionMarks}from'./reward-actions';
export const GIANT_CROPS=['pumpkin','cabbage','carrot','daikon','taro']as const;
export interface GiantRun{id:string;key:string;crop:typeof GIANT_CROPS[number];seed:number;began:number;until:number}
export interface PollenSample{id:string;key:string;crop:CropId;cells:string[];bed:number;identity:string;until:number}
export type GardenInput={action:'giantBegin'|'giantEnd'|'giantCancel'|'gardenBrush'|'pollenCollect'|'pollenApply';crop?:GiantRun['crop'];child?:GardenCropId;sample?:string;run?:string;marks?:number[];at:[number,number]};
export const rootIdentity=(key:string,p:NonNullable<Plot['plant']>)=>`${key}:${p.by}:${p.crop}:${p.sown}`;
const no=(why:'none'|'far'|'full'|'spent')=>({ok:false as const,why});
export function giantCells(key:string){const[x,y]=key.split(',').map(Number),b=bedOf(x,y),cells=[[x,y],[x+1,y],[x,y+1],[x+1,y+1]].map(([u,v])=>`${u},${v}`);return b>=0&&cells.every(k=>{const[u,v]=k.split(',').map(Number);return bedOf(u,v)===b;})?cells:null;}
export function gardenAction(p:Purse,c:GardenInput,id:string,t:number,seed:number,me:string,plots:Readonly<Record<string,Plot>>,owner:string|null,sky:FarmSky){
 const key=c.at.join(','),plot=plots[key],root=plot?.plant,state=p.professionRewards??{},samples=(state.pollen??[]).filter(s=>s.until>t),r=state.giant;
 if(c.action==='giantCancel')return{ok:true as const,purse:{...p,professionRewards:{...state,giant:null}},giant:null};
 if(c.action==='giantBegin'){
  const cells=giantCells(key);if(!works(p,'thingGiantSeeds')||!c.crop||!GIANT_CROPS.includes(c.crop)||owner!==me||!cells||cells.some(k=>plots[k]?.soil!=='tilled'||plots[k]?.plant)||held(p.bag,CROPS[c.crop].seed)<4||r&&r.until>t||!Number.isInteger(seed)||seed<0||seed>4294967295)return no('none');
  const u=useGift(p,'thingGiantSeeds',t);if(!u.ok)return no('spent');const giant:GiantRun={id,key,crop:c.crop,seed,began:t,until:t+120000};return{ok:true as const,purse:{...u.purse,professionRewards:{...state,giant}},giant};
 }
 if(c.action==='giantEnd'){
  if(!r||r.id!==c.run||r.key!==key||r.until<t||t<r.began+2400||!works(p,'thingGiantSeeds')||owner!==me)return no('far');if(!c.marks||c.marks.length!==3||c.marks.some(n=>!Number.isFinite(n)||n<0||n>1))return no('none');const cells=giantCells(key);if(!cells||cells.some(k=>plots[k]?.soil!=='tilled'||plots[k]?.plant)||held(p.bag,CROPS[r.crop].seed)<4)return no('none');const pass=extractionMarks(r.seed).every((n,i)=>Math.abs(n-c.marks![i])<=.09),after={...spend(p,2,t),professionRewards:{...state,giant:null}};
  if(!pass)return{ok:true as const,purse:after,giant:null,gardenPassed:false};
  const plant:NonNullable<Plot['plant']>={by:me,crop:r.crop,sown:t,boost:0,watered:plots[key].damp?t:0,fed:0,guard:0,cured:0,picked:0,pickedAt:0,root:key,footprint:cells,giant:true,...(plots[key].damp?{moist:true}:{})},updated=Object.fromEntries(cells.map(k=>[k,{soil:'tilled' as const,plant:{...plant}}]));
  return{ok:true as const,purse:{...after,bag:take(after.bag,CROPS[r.crop].seed,4)},giant:null,plots:updated,gardenPassed:true};
 }
 if(!root||root.by!==me||root.root&&root.root!==key||!see(key,plot,t,sky).ripe||root.crossed)return no('none');
 if(c.action==='gardenBrush'){
  if(!works(p,'thingCrossBrush')||!c.child||(p.gardenBook??[]).indexOf(c.child)<0||root.crossChoice||gardenCross(key,{...plots,[key]:{...plot,plant:{...root,crossChoice:c.child}}},me,t,sky)!==c.child)return no('none');const u=useGift(p,'thingCrossBrush',t);if(!u.ok)return no('spent');return{ok:true as const,purse:u.purse,plots:{[key]:{...plot,plant:{...root,crossChoice:c.child}}}};
 }
 if(c.action==='pollenCollect'){
  if(!works(p,'thingPollenSeal')||samples.length>=3)return no('none');const u=useGift(p,'thingPollenSeal',t);if(!u.ok)return no('spent');const sample:PollenSample={id,key,crop:root.crop,cells:root.footprint??[key],bed:bedOf(...c.at),identity:rootIdentity(key,root),until:t+86400000};return{ok:true as const,purse:{...u.purse,professionRewards:{...state,pollen:[...samples,sample]}},plots:{[key]:{...plot,plant:{...root,crossed:true}}}};
 }
 const s=samples.find(s=>s.id===c.sample),child=s&&GARDEN.crosses.find(([a,b,child])=>child===c.child&&((a===root.crop&&b===s.crop)||(b===root.crop&&a===s.crop)))?.[2];
 if(!works(p,'thingPollenSeal')||!s||!child||!(p.gardenBook??[]).includes(child)||s.bed!==bedOf(...c.at)||s.cells.some(k=>(root.footprint??[key]).includes(k))||!s.cells.some(k=>{const[x,y]=k.split(',').map(Number);return(root.footprint??[key]).some(k=>{const[u,v]=k.split(',').map(Number);return Math.max(Math.abs(x-u),Math.abs(y-v))===1;});}))return no('none');
 const n=held(p.bag,'graftKnife')>0||(p.wears??[]).includes('graftKnife')||root.insectCrossRound===root.picked?2:1,item=GARDEN_CROPS[child].seed;if(roomFor(p.bag,item)<n)return no('full');
 return{ok:true as const,purse:{...p,bag:put(p.bag,item,n),professionRewards:{...state,pollen:samples.filter(v=>v.id!==s.id)}},plots:{[key]:{...plot,plant:{...root,crossed:true}}},got:[[item,n]]as Array<[typeof item,number]>};
}
