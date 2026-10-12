import {describe,it,expect} from "vitest";
import {beginTrail,trailAction,trailAnswer} from "./reward-trails";
import {newPurse,type Purse} from "./trade";
import {SPOTS} from "./forest";
import {dayOf,staminaOf} from "./stamina";
import {usesLeft} from "./gifts";
const now=Date.parse("2026-10-11T12:00:00+07:00"),id="00000000-0000-4000-8000-000000000222",at:[number,number]=[SPOTS[10].x,SPOTS[10].y];
const player=():Purse=>({...newPurse(),bag:Array(20).fill(null),stamina:{day:dayOf(now),left:50},gifts:{had:["thingForestRing","thingStarBottle"],charms:[],familiar:null}});
describe("personal forest traces",()=>{
 it("opens distinct ordinary sites with three different games and charges one trail start",()=>{
  const d=beginTrail(player(),"forest",id,at,now,123);expect(d.ok).toBe(true);if(!d.ok)return;
  expect(d.trail?.nodes.map(n=>n.game)).toEqual(["memory","order","timing"]);expect(new Set(d.trail?.nodes.map(n=>n.at.join(','))).size).toBe(3);
  expect(d.left).toBe(1);expect(staminaOf(d.purse,now)).toBe(50);expect(beginTrail(d.purse,"star",id,at,now,123).ok).toBe(false);
 });
 for(const kind of ["forest","star"] as const)it(`finishes the ${kind} route with a finite budget and no repeatable final step`,()=>{
  const b=beginTrail(player(),kind,id,at,now,123);if(!b.ok||!b.trail)throw Error('begin');let p=b.purse;const loot=[];
  for(let i=0;i<3;i++){
   const node=p.professionRewards!.trail!.nodes[i],s=trailAction(p,{action:"trailStage",trail:id,at:node.at},`stage${i}`,now+i*6000);if(!s.ok)throw Error('stage');
   const input={action:"trailEnd" as const,trail:id,challenge:`stage${i}`,answers:trailAnswer(node),at:node.at};
   expect(trailAction(s.purse,input,'end',now+i*6000+100).ok).toBe(false);
   const d=trailAction(s.purse,input,'end',now+i*6000+3000);if(!d.ok)throw Error(d.why);loot.push(...d.got!);p=d.purse;
   expect(trailAction(p,input,'end2',now+i*6000+4000).ok).toBe(false);
  }
  expect(p.professionRewards?.trail).toBeNull();expect(staminaOf(p,now+16000)).toBe(44);
  expect(loot).toEqual(kind==="star"?[["starShard",1]]:[["forestLichen",1],["mushroomSpores",1],["wildMedicRoot",1]]);
 });
 it("keeps the checkpoint after a miss but spends its actual attempt stamina",()=>{
  const b=beginTrail(player(),"forest",id,at,now,123);if(!b.ok||!b.trail)throw Error('begin');const node=b.trail.nodes[0],s=trailAction(b.purse,{action:'trailStage',trail:id,at:node.at},'stage',now);if(!s.ok)throw Error('stage');
  const d=trailAction(s.purse,{action:'trailEnd',trail:id,challenge:'stage',answers:[(trailAnswer(node)[0]+1)%3],at:node.at},'end',now+3000);if(!d.ok)throw Error('end');
  expect(d.trail?.next).toBe(0);expect(d.trail?.challenge).toBeNull();expect(d.got).toEqual([]);expect(staminaOf(d.purse,now+3000)).toBe(48);
 });
 it("leaves a successful challenge pending if its reward cannot fit",()=>{
  const b=beginTrail({...player(),bag:[]},"forest",id,at,now,123);if(!b.ok||!b.trail)throw Error('begin');const node=b.trail.nodes[0],s=trailAction(b.purse,{action:'trailStage',trail:id,at:node.at},'stage',now);if(!s.ok)throw Error('stage');
  expect(trailAction(s.purse,{action:'trailEnd',trail:id,challenge:'stage',answers:trailAnswer(node),at:node.at},'end',now+3000)).toEqual({ok:false,why:'full'});
  expect(s.purse.professionRewards?.trail?.next).toBe(0);expect(staminaOf(s.purse,now+3000)).toBe(50);
 });
 it("rejects remote stages, expired challenges and abandoned route replays without restoring the start quota",()=>{
  const b=beginTrail(player(),"forest",id,at,now,123);if(!b.ok||!b.trail)throw Error('begin');const node=b.trail.nodes[0];
  expect(trailAction(b.purse,{action:'trailStage',trail:id,at:[0,0]},'s',now)).toEqual({ok:false,why:'far'});
  const s=trailAction(b.purse,{action:'trailStage',trail:id,at:node.at},'s',now);if(!s.ok)throw Error('stage');
  expect(trailAction(s.purse,{action:'trailEnd',trail:id,challenge:'s',answers:trailAnswer(node),at:node.at},'e',now+100000).ok).toBe(false);
  const c=trailAction(s.purse,{action:'trailCancel',trail:id,at},'c',now);if(!c.ok)throw Error('cancel');expect(c.trail).toBeNull();expect(usesLeft(c.purse,'thingForestRing',now)).toBe(1);
 });
});
