import {works} from "./gifts";
import {dayOf} from "./stamina";
import {GEMS} from "./tools";
import type {Purse} from "./trade";
import type {ItemId} from "./items";
import type {PendingVein} from "./mining";
import type {RockChoice} from "./geology";
export const veinRewardKey=(v:PendingVein)=>`${v.f}:${v.rock}:${v.turn}:${v.seed}`;
export function rememberVeinSite(after:Purse,before:Purse,vein:PendingVein,at:readonly [number,number],day:number):Purse{
 if(!works(before,"charmBranchVein"))return after;
 return {...after,professionRewards:{...after.professionRewards,veinSite:{key:veinRewardKey(vein),floor:vein.f,at:[...at],day}}};
}
/** Only a paid, nonempty main go with the correctly read echo may expose a branch. */
export function rememberBranch(after:Purse,before:Purse,vein:PendingVein,oreHits:number,gemHits:number,ore:ItemId,choice:RockChoice|undefined,now:number):Purse{
 const site=before.professionRewards?.veinSite;
 if(!works(before,"charmBranchVein")||!site||site.key!==veinRewardKey(vein)||site.day!==dayOf(now)||!choice||choice.echo!==(Math.abs(Math.trunc(vein.seed))%2?1:-1)||oreHits+gemHits<=0||before.professionRewards?.resource?.kind==="branch")return after;
 const branch={...site,seed:(Math.abs(Math.trunc(vein.seed))>>>0),ore:oreHits>0?ore:null,crystal:gemHits>0&&vein.gem?GEMS[vein.gem].chip:null,until:now+180000};
 return {...after,professionRewards:{...after.professionRewards,branch}};
}
