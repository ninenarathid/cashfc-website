import{BOAT_ROUTES,boatPosition,type LotusBoat}from'./lotus-boats';import{works}from'./gifts';import{spend}from'./stamina';import type{Purse}from'./trade';
export type BoatInput={action:'launch'|'open'|'join'|'depart'|'return'|'leave';owner?:string;site?:number;open?:boolean;at:[number,number]};
export function boatAction(p:Purse,input:BoatInput,me:string,old:LotusBoat|null,t:number,alreadyAboard=false,fishBusy=false):{ok:true;purse:Purse;boat:LotusBoat}|{ok:false;why:'none'|'far'|'spent'}{
 const before=p.professionRewards??{},membership=(boat:LotusBoat|null)=>({...p,professionRewards:{...before,boat:boat?{owner:boat.owner,until:boat.until}:null}}),same=(a:readonly number[],b:readonly number[])=>a.every((n,i)=>n===b[i]);
 if(input.action==='launch'){
  const route=BOAT_ROUTES[input.site??-1];if(!route||!same(route.dock,input.at))return {ok:false,why:'far'};
  if(!works(p,'thingLotusBoat')||input.owner&&input.owner!==me)return {ok:false,why:'none'};
  if(alreadyAboard||old&&old.until>t||fishBusy)return {ok:false,why:'spent'};
  const boat:LotusBoat={owner:me,guest:null,site:input.site!,station:0,open:false,until:t+1800000,trip:null};return {ok:true,purse:spend(membership(boat),2,t),boat};
 }
 if(!old||old.until<=t||!BOAT_ROUTES[old.site])return {ok:false,why:'none'};
 const moving=old.trip&&old.trip.arrives>t,route=BOAT_ROUTES[old.site],pos=boatPosition(old,t);if(!same(input.at,[Math.floor(pos.x),Math.floor(pos.y)]))return {ok:false,why:'far'};
 if(moving)return {ok:false,why:'spent'};
 if(input.action==='join'){
  if(old.owner===me||old.station!==0||!old.open||old.guest||alreadyAboard||fishBusy)return {ok:false,why:'none'};const boat={...old,guest:me,open:false};return {ok:true,purse:membership(boat),boat};
 }
 if(old.owner!==me&&old.guest!==me)return {ok:false,why:'none'};
 if(input.action==='open'){if(old.owner!==me||old.station!==0||typeof input.open!=='boolean')return {ok:false,why:'none'};return {ok:true,purse:p,boat:{...old,open:input.open}};}
 if(input.action==='leave'){if(old.station!==0)return {ok:false,why:'far'};return {ok:true,purse:membership(null),boat:old.owner===me?{...old,until:t,open:false}:{...old,guest:null}};}
 if(input.action==='depart'||input.action==='return'){
  const to=input.action==='depart'?1:0;if(old.station===to||input.action==='depart'&&old.owner!==me||fishBusy)return {ok:false,why:'spent'};
  const duration=Math.ceil(Math.hypot(route.dock[0]-route.anchor[0],route.dock[1]-route.anchor[1])/3.5*1000),trip={from:old.station,to:to as 0|1,at:t,arrives:t+duration},boat={...old,station:to as 0|1,open:false,trip,...(to===0?{until:t+duration}:{})};return {ok:true,purse:membership(boat),boat};
 }
 return {ok:false,why:'none'};
}
