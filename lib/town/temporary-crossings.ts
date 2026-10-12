/** Only these water tiles can become a temporary path. No gates or permanent paths are replaced. */
export const CROSSINGS=[
 {a:[174,135],b:[174,143],tiles:Array.from({length:7},(_,i)=>[174,136+i]),logs:8},
 {a:[206,137],b:[206,141],tiles:Array.from({length:3},(_,i)=>[206,138+i]),logs:4},
] as {a:[number,number];b:[number,number];tiles:[number,number][];logs:number}[];
export interface TemporaryCrossing {site:number;id:string;by:string;until:number}
let bridges:TemporaryCrossing[]=[],clock:()=>number=Date.now;
export function setTemporaryCrossings(rows:readonly TemporaryCrossing[],now:()=>number=Date.now){bridges=rows.filter(r=>Number.isInteger(r.site)&&!!CROSSINGS[r.site]&&typeof r.id==='string'&&Number.isFinite(r.until)).slice(0,2);clock=now;}
export const crossingOpen=(site:number)=>bridges.some(r=>r.site===site&&r.until>clock());
export const temporaryFloor=(x:number,y:number)=>CROSSINGS.some((s,i)=>crossingOpen(i)&&s.tiles.some(t=>t[0]===x&&t[1]===y));
/** A sleeping tab, stale route or lost reader always has a deterministic dry-bank exit. */
export function crossingExit(pos:{x:number;y:number}):{x:number;y:number}|null {
 const x=Math.floor(pos.x),y=Math.floor(pos.y),s=CROSSINGS.find((s,i)=>!crossingOpen(i)&&s.tiles.some(t=>t[0]===x&&t[1]===y));if(!s)return null;
 const bank=[s.a,s.b].sort((a,b)=>Math.hypot(pos.x-a[0]-.5,pos.y-a[1]-.5)-Math.hypot(pos.x-b[0]-.5,pos.y-b[1]-.5))[0];return {x:bank[0]+.5,y:bank[1]+.5};
}
