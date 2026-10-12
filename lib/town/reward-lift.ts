import {works,useGift} from "./gifts";
import {MINING,mineOf} from "./mining";
import {floorSpots,floorTile,floorAtTile} from "./cave-state";
import {MOUNTAIN_AT} from "./world";
import {dayOf} from "./stamina";
import {learnFloor} from "./reward-knowledge";
import type {Purse} from "./trade";
import type {RewardInput,RewardReply,LiftJourney} from "./reward-types";
export const LIFT_MOUTH:[number,number]=[MOUNTAIN_AT.mouth.x+3,MOUNTAIN_AT.mouth.y];
/** A replay may acknowledge a recent journey, but never restore an old day's position. */
export function usableJourney(ride:LiftJourney,now:number):boolean{
  return ride.day===dayOf(now)&&ride.issued<=now&&now-ride.issued<=90000&&Number.isInteger(ride.floor)&&ride.floor>=0&&ride.floor<=MINING.floors
    && (ride.floor===0?ride.at[0]===LIFT_MOUTH[0]&&ride.at[1]===LIFT_MOUTH[1]:floorTile(ride.floor,ride.day,...ride.at)&&ride.at.every((n,i)=>n===floorSpots(ride.floor,ride.day).arrive[i]));
}
export function visitedFloors(p:Purse,proof:readonly number[]=[]){return Array.from(new Set([...(p.professionRewards?.visited??[]),...mineOf(p).rests,...proof].filter(f=>Number.isInteger(f)&&f>0&&f<=MINING.floors))).sort((a,b)=>a-b);}
type Result=({ok:true;purse:Purse}&RewardReply)|{ok:false;why:"none"|"far"|"spent"};
export function portableLift(p:Purse,input:Extract<RewardInput,{action:"liftAnchor"|"liftRide"}>,request:string,now:number,proof:readonly number[]=[]):Result{
  if(!works(p,"thingPocketLift")||!Number.isInteger(input.floor)||input.floor<0||input.floor>MINING.floors)return {ok:false,why:"none"};
  const day=dayOf(now),f=input.floor;
  if(f!==floorAtTile(...input.at)||(f>0&&!floorTile(f,day,...input.at)))return {ok:false,why:"far"};
  if(input.action==="liftAnchor"){
    if(f<1||!visitedFloors(p,proof).includes(f))return {ok:false,why:"none"};
    const learned=learnFloor(p,f,MINING.floors);
    return {ok:true,purse:{...learned,professionRewards:{...learned.professionRewards,lift:{floor:f}}}};
  }
  const anchor=p.professionRewards?.lift?.floor,to=input.to;
  if(!anchor||!visitedFloors(p).includes(anchor)||!Number.isInteger(to)||!((f===0&&to===anchor)||(f===anchor&&to===0)))return {ok:false,why:"none"};
  if(f===0&&Math.max(Math.abs(input.at[0]-LIFT_MOUTH[0]),Math.abs(input.at[1]-LIFT_MOUTH[1]))>3)return {ok:false,why:"far"};
  const used=useGift(p,"thingPocketLift",now);if(!used.ok)return {ok:false,why:used.why==="spent"?"spent":"none"};
  return {ok:true,purse:used.purse,left:used.left,ride:{id:request,floor:to,at:to===0?LIFT_MOUTH:floorSpots(to,day).arrive,day,issued:now}};
}
