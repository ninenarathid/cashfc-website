import {partReady,restPart} from "./tree-parts";
import {grainQuality,type WoodSelection} from "./wood-grain";
import {useGift} from "./gifts";
import {stowAll} from "./pouches";
import {woodYield} from "./woodcutting";
import type {Purse} from "./trade";
import type {Fell} from "./trees";
/** Only the first manually read trunk earns a second part; knife extraction shares the two-part budget. */
export function listeningHarvest(before:Purse,did:{ok:true}&Fell,grain:WoodSelection|undefined,misses:number|undefined,now:number,elder:boolean):({ok:true}&Fell)|{ok:false;why:"full"}{
 if(!grain?.second||elder||did.one||!did.through||!did.felled.length||misses!==0||grainQuality(did.felled[0].id,grain,misses)!=="heart")return did;
 if(!partReady(did.grove.parts,did.felled[0].id,grain.second,now))return did;
 const used=useGift(did.purse,"charmListening",now);if(!used.ok)return did;
 const got=woodYield(did.felled[0].id,false,{...grain,part:grain.second},"heart",before),home=stowAll(used.purse,got);if(!home)return {ok:false,why:"full"};
 const first=did.felled[0],state=home.professionRewards;
 return {...did,grove:{...did.grove,parts:restPart(did.grove.parts,did.felled[0].id,grain.second,now)},purse:{...home,...(state?{professionRewards:{...state,extraction:null,run:null}}:{})},felled:[{...first,got:[...first.got,...got]},...did.felled.slice(1)],got:[...did.got,...got]};
}
