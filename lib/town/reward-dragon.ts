import{FISH,type FishId,type BaitId}from'./items';import{works,useGift}from'./gifts';import type{Purse}from'./trade';import type{RewardTrail}from'./reward-types';import type{FishPool}from'./reward-fishing';import type{Current}from'./river-items';
/** Only dry, reachable local banks and clues. No gates or new water geography. */
export const DRAGON_BANKS=[
 {at:[0,23],clues:[[0,17],[5,17],[3,22]]},
 {at:[12,39],clues:[[6,33],[14,33],[6,38]]},
 {at:[174,135],clues:[[169,129],[174,129],[179,129]]},
 {at:[216,138],clues:[[211,132],[216,132],[221,132]]},
 {at:[18,252],clues:[[12,246],[17,246],[22,246]]}
] as const;
export interface DragonCall {fish:FishId;bait:BaitId;current:Current;at:[number,number];until:number}
export function beginDragon(p:Purse,fish:FishId,bait:BaitId,current:Current,at:[number,number],id:string,t:number,seed:number,pool:FishPool){
 const bank=DRAGON_BANKS.find(b=>b.at.every((n,i)=>n===at[i]));if(!bank)return {ok:false as const,why:'far' as const};
 if(!Number.isSafeInteger(seed)||seed<0||seed>4294967295||!works(p,'famRiverDragon')||p.professionRewards?.trail||p.professionRewards?.dragon&&p.professionRewards.dragon.until>t||FISH[fish]?.tier!=='legend'||!((p.best[fish]??0)>0)||!pool.some(x=>x.what===fish&&x.p>0))return {ok:false as const,why:'none' as const};
 const used=useGift(p,'famRiverDragon',t);if(!used.ok)return used;
 const trail:RewardTrail={id,kind:'dragon',next:0,began:t,challenge:null,dragon:{fish,bait,current,at},nodes:(['memory','order','timing']as const).map((game,i)=>({at:[...bank.clues[(i+seed%3)%3]],game,seed:(seed+i*7919)%4294967296}))};
 return {ok:true as const,purse:{...used.purse,professionRewards:{...used.purse.professionRewards,trail}},trail,left:used.left};
}
/** Exactly one eligible ordinary cast; changed conditions preserve the pending call until expiry. */
export function dragonDraw(p:Purse,pool:FishPool,bait:BaitId,current:Current,at:[number,number],pair:boolean,star:boolean,t:number){
 const call=p.professionRewards?.dragon;
 if(!call||call.until<=t||!works(p,'famRiverDragon')||pair||star||call.bait!==bait||call.current!==current||!call.at.every((n,i)=>n===at[i])||FISH[call.fish]?.tier!=='legend'||!((p.best[call.fish]??0)>0)||!pool.some(x=>x.what===call.fish&&x.p>0))return {purse:p,odds:pool};
 const weighted=pool.map(x=>({...x,p:x.p*(x.what===call.fish?5:1)})),total=weighted.reduce((n,x)=>n+x.p,0);
 return {purse:{...p,professionRewards:{...p.professionRewards,dragon:null}},odds:weighted.map(x=>({...x,p:x.p/total}))};
}
