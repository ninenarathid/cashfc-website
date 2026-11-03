/** Fixed local water routes. Boats carry avatars at ordinary speed; they never change walkability. */
export const BOAT_ROUTES=[
 {dock:[180,133] as const,anchor:[180,137] as const,float:[180.5,136.5] as const,habitat:'creek' as const},
 {dock:[216,138] as const,anchor:[216,140] as const,float:[216.5,140.5] as const,habitat:'headwater' as const}
] as const;
export interface LotusBoat {owner:string;name?:string;guest:string|null;site:number;open:boolean;until:number;station:0|1;trip?:{from:0|1;to:0|1;at:number;arrives:number}|null}
let boats:LotusBoat[]=[],clock=()=>Date.now(),viewer='';
export function setLotusBoats(rows:LotusBoat[],me:string,now:()=>number=()=>Date.now()){boats=rows;viewer=me;clock=now;}
export function boatPosition(b:LotusBoat,t:number){const s=BOAT_ROUTES[b.site],station=(n:number)=>n===0?s.dock:s.anchor,trip=b.trip,a=station(trip?.from??b.station),z=station(trip?.to??b.station),f=trip?Math.max(0,Math.min(1,(t-trip.at)/Math.max(1,trip.arrives-trip.at))):1;return {x:a[0]+.5+(z[0]-a[0])*f,y:a[1]+.5+(z[1]-a[1])*f};}
/**
 * Where a boat is drawn (the owner, 2026-11-04: it sat on the bank at its dock and against the far bank at its anchor):
 * its route's point pulled out into the stream, so far out from the dock and so far short of the anchor, gliding from
 * one to the other as it sails. The rule's own points, which the database checks, are unchanged.
 */
export const BOAT_OUT=.8,BOAT_BACK=.55;
export function boatDrawn(b:LotusBoat,t:number){const s=BOAT_ROUTES[b.site],p=boatPosition(b,t),dx=s.anchor[0]-s.dock[0],dy=s.anchor[1]-s.dock[1],len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,f=Math.max(0,Math.min(1,((p.x-s.dock[0]-.5)*ux+(p.y-s.dock[1]-.5)*uy)/len)),k=BOAT_OUT*(1-f)-BOAT_BACK*f;return {x:p.x+ux*k,y:p.y+uy*k};}
/** How far from where they are somebody aboard is drawn: as far as their boat is (null when they are not aboard). */
export function boatDrawShift(id:string){const b=ridingBoat(id);if(!b)return null;const t=clock(),p=boatPosition(b,t),q=boatDrawn(b,t);return {x:q.x-p.x,y:q.y-p.y};}
export function ridingBoat(id:string,t=clock()){return boats.find(b=>b.until>t&&(b.owner===id||b.guest===id))??null;}
export function boatMoving(b:LotusBoat){return !!b.trip&&b.trip.arrives>clock();}
export function boatMotion(id:string){const b=ridingBoat(id);if(!b)return null;const p=boatPosition(b,clock()),offset=b.guest?(id===b.owner ? .23 : -.23):0;return {...p,x:p.x+offset,y:p.y-offset};}
export function boatFishing(x:number,y:number){const t=clock(),b=ridingBoat(viewer,t);if(!b||b.station!==1||(b.trip&&t<b.trip.arrives))return null;const r=BOAT_ROUTES[b.site];if(x!==r.anchor[0]||y!==r.anchor[1])return null;return {float:{x:r.float[0],y:r.float[1]},deep:true,habitat:r.habitat,current:'run' as const};}
/** Whether a tile is where the boat I am aboard lies (its dock or its anchor): from there I fish only as the boat lets me, never from the bank. */
export function boatHolds(x:number,y:number){const b=ridingBoat(viewer);if(!b)return false;const r=BOAT_ROUTES[b.site];return !!r&&(x===r.dock[0]&&y===r.dock[1]||x===r.anchor[0]&&y===r.anchor[1]);}
/** A missing/expired lease must not leave a traveller on a route's water. */
export function boatRecovery(pos:{x:number;y:number}){for(const r of BOAT_ROUTES){if(Math.floor(pos.x)!==r.dock[0]||pos.y<Math.min(r.dock[1],r.anchor[1])||pos.y>Math.max(r.dock[1],r.anchor[1])+1)continue;const y=Math.floor(pos.y);if(y===r.dock[1])return null;return {x:r.dock[0]+.5,y:r.dock[1]+.5};}return null;}
