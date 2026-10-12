import type { WoodPart } from './wood-grain';
/** Each living tree owns one finite supply of each small part, across all collection paths. */
export type TreeParts = Record<string,Partial<Record<WoodPart,number>>>;
export const PART_REST=600000;
export const partReady=(parts:TreeParts|undefined,tree:number,part:WoodPart,now:number)=>part==='wood'||(parts?.[tree]?.[part]??0)<=now;
export function restPart(parts:TreeParts|undefined,tree:number,part:WoodPart,now:number):TreeParts {
 const kept=Object.fromEntries(Object.entries(parts??{}).map(([id,p])=>[id,Object.fromEntries(Object.entries(p).filter(([,t])=>typeof t==='number'&&t>now))]).filter(([,p])=>Object.keys(p).length)) as TreeParts;
 return part==='wood'?kept:{...kept,[tree]:{...kept[tree],[part]:now+PART_REST}};
}
