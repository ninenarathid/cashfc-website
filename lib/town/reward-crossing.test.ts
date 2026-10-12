import {it,expect,afterEach} from 'vitest';
import {CROSSINGS,crossingExit,setTemporaryCrossings,temporaryFloor} from './temporary-crossings';
import {buildCrossing} from './reward-crossing';
import {newPurse,type Purse,held} from './trade';
import {walkable,thingAt,findPath,gateAt} from './world';
import {dayOf} from './stamina';
const now=Date.parse('2026-10-11T12:00:00+07:00'),p:Purse={...newPurse(),bag:[{item:'log',n:8},{item:'rootFiber',n:2}],gifts:{had:['famBeaver'],charms:[],familiar:'famBeaver'}};
afterEach(()=>setTemporaryCrossings([]));
it('uses existing water and dry banks, creates a real route without opening a map gate, then expires safely',()=>{
 for(let site=0;site<CROSSINGS.length;site++){
  const s=CROSSINGS[site];expect(walkable(...s.a)).toBe(true);expect(walkable(...s.b)).toBe(true);for(const tile of s.tiles){expect(thingAt(...tile)).toBe('water');expect(walkable(...tile)).toBe(false);expect(gateAt(...tile)).toBeNull();}
  const d=buildCrossing(p,{action:'bridgeBuild',site,at:s.a},'bridge','me',null,now);if(!d.ok)throw Error('No bridge');expect(held(d.purse.bag,'log')).toBe(8-s.logs);expect(held(d.purse.bag,'rootFiber')).toBe(0);
  let clock=now;setTemporaryCrossings([d.bridge],()=>clock);for(const tile of s.tiles)expect(walkable(...tile)).toBe(true);
  const path=findPath({x:s.a[0]+.5,y:s.a[1]+.5},{x:s.b[0],y:s.b[1]});expect(path?.some(v=>temporaryFloor(Math.floor(v.x),Math.floor(v.y)))).toBe(true);
  const first={x:s.tiles[0][0]+.5,y:s.tiles[0][1]+.5},last={x:s.tiles.at(-1)![0]+.5,y:s.tiles.at(-1)![1]+.5};expect(crossingExit(first)).toBeNull();clock=d.bridge.until;
  expect(crossingExit(first)).toEqual({x:s.a[0]+.5,y:s.a[1]+.5});expect(crossingExit(last)).toEqual({x:s.b[0]+.5,y:s.b[1]+.5});for(const tile of s.tiles)expect(walkable(...tile)).toBe(false);
  expect(buildCrossing(d.purse,{action:'bridgeBuild',site,at:s.a},'another','me',null,now+1800000)).toEqual({ok:false,why:'none'});setTemporaryCrossings([]);
 }
});
it('requires the following owned beaver, real plain ingredients, exact bank, and one actual daily placement',()=>{
 const cmd={action:'bridgeBuild' as const,site:1,at:CROSSINGS[1].a};
 expect(buildCrossing({...p,gifts:{...p.gifts!,familiar:null}},cmd,'b','me',null,now)).toEqual({ok:false,why:'none'});
 expect(buildCrossing(p,{...cmd,at:[CROSSINGS[1].a[0]+1,CROSSINGS[1].a[1]]},'b','me',null,now)).toEqual({ok:false,why:'far'});
 expect(buildCrossing(p,cmd,'b','me',{site:1,id:'active',by:'friend',until:now+1},now)).toEqual({ok:false,why:'spent'});
 expect(buildCrossing({...p,gifts:{...p.gifts!,used:{famBeaver:{k:dayOf(now),n:1}}}},cmd,'b','me',null,now)).toEqual({ok:false,why:'spent'});
 expect(buildCrossing({...p,bag:[{item:'log',n:8,water:1},{item:'rootFiber',n:2}]},cmd,'b','me',null,now)).toEqual({ok:false,why:'none'});
});
