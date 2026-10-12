import {it,expect} from 'vitest';
import {treePact,pactNode} from './reward-pact';
import {trailAnswer} from './reward-trails';
import {newPurse,type Purse,held} from './trade';
import {WOOD,treeOf,fell,newGrove} from './trees';
import {grainOf} from './wood-grain';
import {partReady,restPart} from './tree-parts';
const t=WOOD.find(t=>t.tier===1)!,at:[number,number]=[t.x-1,t.y],now=Date.parse('2026-10-11T12:00:00+07:00');
const purse=():Purse=>({...newPurse(),hand:'waterCart',handAt:0,bag:[{item:'waterCart',n:1,water:6},{item:'compost',n:5},...Array(6).fill(null)],gifts:{had:['charmTreePact'],charms:['charmTreePact']}});
it('care spends real supplies, leaves the world tree standing and shares each part with felling',()=>{
 const p=purse(),b=treePact(p,newGrove(),{action:'pactBegin',tree:t.id,part:'sap',at},'run','me',now,123);if(!b.ok||!b.pact)throw Error('No care');
 const d=treePact(b.purse,newGrove(),{action:'pactEnd',run:'run',answers:trailAnswer(pactNode(b.pact)),at},'end','me',now+3000,0);if(!d.ok||!d.grove)throw Error('No parts');
 expect(d.got).toEqual([['pinePitch',2]]);expect(d.grove.down).toEqual({});expect(d.purse.bag[0]?.water).toBe(5);expect(held(d.purse.bag,'compost')).toBe(4);
 expect(partReady(d.grove.parts,t.id,'sap',now+3000)).toBe(false);expect(partReady(d.grove.parts,t.id,'bark',now+3000)).toBe(true);
 const axe:Purse={...newPurse(),hand:'axe',handAt:0,bag:[{item:'axe',n:1},...Array(8).fill(null)]},grain={...grainOf(t.id),direction:grainOf(t.id).lean,part:'sap' as const};
 const cut=fell(axe,d.grove,'me',{tree:t.id,through:true,misses:0,secs:25,grain},at,now+4000,[]);if(!cut.ok)throw Error('No felling');
 expect(held(cut.purse.bag,'log')).toBeGreaterThan(0);expect(held(cut.purse.bag,'pinePitch')).toBe(0);expect(cut.grove.parts).toEqual(d.grove.parts);
 expect(partReady(d.grove.parts,t.id,'sap',now+603000)).toBe(true);
});
it('rechecks the same standing unoccupied tree; no quota or resource loss when another collector wins',()=>{
 const p=purse(),b=treePact(p,newGrove(),{action:'pactBegin',tree:t.id,part:'seed',at},'run','me',now,0);if(!b.ok||!b.pact)throw Error('No run');
 const end={action:'pactEnd' as const,run:'run',answers:trailAnswer(pactNode(b.pact)),at};
 expect(treePact(b.purse,{...newGrove(),parts:restPart({},t.id,'seed',now)},end,'end','me',now+3000,0)).toEqual({ok:false,why:'spent'});
 expect(treePact(b.purse,{...newGrove(),down:{[t.id]:{by:'friend',at:now}}},end,'end','me',now+3000,0).ok).toBe(false);
 expect(treePact(b.purse,{...newGrove(),goes:{friend:{at:now,trees:[t.id]}}},end,'end','me',now+3000,0).ok).toBe(false);
 const missed=treePact(b.purse,newGrove(),{...end,answers:end.answers.map(n=>(n+1)%3)},'end','me',now+3000,0);if(!missed.ok)throw Error('Miss rejected');expect(missed.grove).toBeUndefined();expect(missed.got).toEqual([]);expect(missed.purse.bag[0]?.water).toBe(5);
 expect(treePact({...b.purse,bag:[{item:'waterCart',n:1,water:6},{item:'compost',n:5},{item:'log',n:30}]},newGrove(),end,'end','me',now+3000,0)).toEqual({ok:false,why:'full'});
 expect(treeOf(900)?.elder).toBe(true);
});
