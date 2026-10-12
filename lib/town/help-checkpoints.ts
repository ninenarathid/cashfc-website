import type { Plot } from './farm';
import type { Purse } from './trade';
export interface FailedGardenJob {id:string;key:string;deed:'water'|'clear'|'till';owner:string;fingerprint:string;until:number}
export function helpFingerprint(plot:Plot|undefined,owner:string){const p=plot?.plant;return p?`${p.by}:${p.crop}:${p.sown}:${p.watered}:${p.cured}:${p.picked}`:`${plot?.soil??'wild'}:${owner}`;}
/** Only explicitly missed beats from an eligible offered row create a short-lived recovery checkpoint. */
export function rememberGardenMisses(p:Purse,offered:readonly string[],deed:string,plots:Readonly<Record<string,Plot>>,owner:string|null,marks:Readonly<Record<string,boolean>>,done:readonly string[],me:string,now:number):Purse{
 if(!['water','clear','till'].includes(deed))return p;
 const previous=(p.professionRewards?.failedGarden??[]).filter(r=>r.until>now&&!done.includes(r.key)),fresh=offered.filter(key=>marks[key]===false&&!done.includes(key)).map(key=>{const by=plots[key]?.plant?.by??owner??me;return{id:`${now}:${key}:${deed}`,key,deed:deed as FailedGardenJob['deed'],owner:by,fingerprint:helpFingerprint(plots[key],by),until:now+600000};});
 if(!fresh.length&&previous.length===(p.professionRewards?.failedGarden??[]).length)return p;
 return{...p,professionRewards:{...p.professionRewards,failedGarden:[...previous.filter(r=>!fresh.some(n=>n.key===r.key)),...fresh].slice(-10)}};
}
