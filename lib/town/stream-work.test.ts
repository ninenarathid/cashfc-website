import {describe,it,expect} from "vitest";
import {STREAM_ITEMS,STREAM_MAKES} from "./stream-items";
import {STREAM_WORK,propertyDuration,streamWork,streamRouteAt} from "./stream-work";
import {newPurse,held,type Purse} from "./trade";
import type {ItemId} from "./items";
import {dayOf} from "./stamina";
import {WELL,walkable} from "./world";
const NOW=Date.UTC(2026,9,10,5),upper=[21,252] as const,lower=[42,254] as const,atWell=[WELL.x+1,WELL.y] as const;
const p=(things:Array<[ItemId,number]>=[]):Purse=>({...newPurse(),coins:1000,bag:[...things.map(([item,n])=>({item,n})),...Array(8).fill(null)],stamina:{day:dayOf(NOW),left:100}});
describe("mountain channels and prepared water",()=>{
 it("adds 25 useful water items and keeps each bank reachable",()=>{
  expect(Object.keys(STREAM_ITEMS)).toHaveLength(25);
  for(const s of STREAM_WORK.sites)expect([-2,-1,0,1,2].some(dx=>[-2,-1,0,1,2].some(dy=>walkable(s.x+dx,s.y+dy)))).toBe(true);
 });
 it("samples only at the right bank and route, once per personal turn",()=>{
  expect(streamWork(p(),"sample","springSample",upper,null,"A",NOW)).toEqual({ok:false,why:"tool"});
  const before=p([["bucket",1]]),d=streamWork(before,"sample","springSample",upper,null,"A",NOW);
  expect(d.ok).toBe(true);if(!d.ok)return;
  expect(d.got).toEqual([["springSample",1]]);expect(before.streamTaken).toBeUndefined();
  expect(streamWork(d.purse,"sample","springSample",upper,null,"A",NOW)).toEqual({ok:false,why:"spent"});
  expect(streamWork(d.purse,"sample","springSample",upper,null,"A",NOW+STREAM_WORK.every).ok).toBe(true);
  expect(streamWork(before,"sample","rushingSample",lower,null,"A",NOW)).toEqual({ok:false,why:"none"});
  expect(streamWork(before,"sample","springSample",[0,0],null,"A",NOW)).toEqual({ok:false,why:"far"});
 });
 it("opens a shared route with a tool, allows friends' samples and limits gate flipping",()=>{
  const a=p([["sluiceKey",1]]),d=streamWork(a,"gate","reed",upper,null,"A",NOW);
  expect(d.ok).toBe(true);if(!d.ok)return;
  expect(streamRouteAt(d.gate,NOW)).toBe("reed");expect(streamRouteAt(d.gate,d.gate!.until)).toBe("pool");
  expect(streamWork(a,"gate","pool",upper,d.gate!,"A",NOW+1)).toEqual({ok:false,why:"spent"});
  expect(streamWork(p([["waterSampler",1]]),"sample","rushingSample",lower,d.gate!,"B",NOW).ok).toBe(true);
  expect(streamWork(p(),"gate","pool",upper,null,"A",NOW)).toEqual({ok:false,why:"tool"});
 });
 it("uses exact recipe inputs, including the spaces emptied by preparation",()=>{
  for(const[id,r]of Object.entries(STREAM_MAKES)){
   const before=p([...r.needs,[id.endsWith("Blend")?"mixingJug":"filterFrame",1]]),d=streamWork(before,"prepare",id,upper,null,"A",NOW);
   expect(d.ok,id).toBe(true);if(!d.ok)continue;
   expect(held(d.purse.bag,id as ItemId)).toBe(r.gives);
   for(const[part]of r.needs)expect(held(d.purse.bag,part)).toBe(0);
   expect(streamWork(p(),"prepare",id,upper,null,"A",NOW)).toEqual({ok:false,why:"tool"});
   expect(streamWork(p([[id.endsWith("Blend")?"mixingJug":"filterFrame",1]]),"prepare",id,upper,null,"A",NOW)).toEqual({ok:false,why:"none"});
  }
 });
 it("does not mutate a full bag or accept invented choices",()=>{
  const full={...p(),bag:Array(8).fill({item:"boot" as const,n:1})},copy=structuredClone(full);
  expect(streamWork(full,"sample","riverGrit",upper,null,"A",NOW)).toEqual({ok:false,why:"full"});expect(full).toEqual(copy);
  expect(streamWork(p(),"sample","oreGold",upper,null,"A",NOW)).toEqual({ok:false,why:"none"});
 });
 it("preserves a single nature at the well, using the strongest flask or meal duration",()=>{
  const before={...p([["moonBlend",1],["sealedFlask",1]]),buffs:[{id:"waterProperty" as const,level:4,until:NOW+60000}]};
  expect(propertyDuration(before,NOW)).toBe(2);
  const d=streamWork(before,"pour","moonBlend",atWell,null,"A",NOW);
  expect(d.ok&&d.nature).toBe("moon");expect(d.ok&&d.times).toBe(2);expect(d.ok&&held(d.purse.bag,"moonBlend")).toBe(0);expect(d.ok&&d.purse.coins).toBe(before.coins);
  expect(streamWork(before,"pour","moonBlend",upper,null,"A",NOW)).toEqual({ok:false,why:"far"});
 });
});
