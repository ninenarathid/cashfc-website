import type {Fight,Pair} from './fishing';
/** A manual reward never charges a neighbouring line. The keeper remembers use across rescue and bouts. */
export function pullReel(f:Fight,quiet=0):Fight{
 if(f.over||!f.lunar||f.lunar.used||f.lunar.charge<5)return f;
 return {...f,line:f.line*.8,lunar:{...f.lunar,used:true},surge:{from:f.t,to:f.t+2},
  ...(quiet>0?{quiet:{from:f.t,to:f.t+Math.min(2,quiet)}}:{quiet:undefined})};
}
export function pullPairReel(p:Pair,which:number,quiet=0):Pair{
 if(p.ended[which]||!p.fights[which])return p;
 const f=pullReel(p.fights[which],quiet);if(f===p.fights[which])return p;
 return {...p,fights:p.fights.map((old,i)=>i===which?f:old)};
}
