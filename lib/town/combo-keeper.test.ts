import { describe,expect,it } from "vitest";
import { DbKeeper } from "./keeper";
import { newPurse } from "./trade";

describe("optional equipment-bond RPC",()=>{
 it("retries a lost otter response with the same operation ID",async()=>{
  const sent:Record<string,unknown>[]=[],purse=newPurse();
  const k=new DbKeeper("me",async(fn,args)=>{
   if(fn==="town_is_open")return true;
   if(fn==="town_me")return {now:Date.now(),purse};
   if(fn!=="town_land")return null;
   sent.push(args!);
   if(sent.length===1)return null;
   return {ok:true,now:Date.now(),purse,how:"snapped",kept:false,record:false,again:true};
  });
  try{
   expect(await k.land("snapped",{secs:10})).toMatchObject({again:true});
   expect(sent).toHaveLength(2);expect(sent[1]).toEqual(sent[0]);
   expect((sent[0].p_fight as {request:string}).request).toMatch(/^[0-9a-f-]{36}$/);
  }finally{k.close();}
 });
 it("an older database can refuse the optional RPC without shutting the game",async()=>{
  const k=new DbKeeper("me",async(fn)=>fn==="town_is_open"?true:fn==="town_me"?{now:Date.now(),purse:newPurse()}:null);
  const result=await k.comboPrepare("wear");
  expect(result.ok).toBe(false);expect(k.open()).toBe(true);
  k.close();
 });
 it("keeps confirmed discovery and the rescue effect returned by the database",async()=>{
  const combo={cue:"water" as const,fresh:true,resume:.35};
  const purse={...newPurse(),combos:{found:[],used:{rescue:{day:1,n:1}}}};
  const k=new DbKeeper("me",async(fn,args)=>fn==="town_is_open"?true:fn==="town_me"?{now:Date.now(),purse}:fn==="town_combo"?{ok:true,now:Date.now(),purse,cue:"water"}:fn==="town_land"?{ok:true,now:Date.now(),purse,how:args?.p_how,kept:false,record:false,again:true,combo}:null);
  expect(await k.comboPrepare("wear")).toMatchObject({ok:true,cue:"water"});
  expect(await k.land("snapped",null)).toMatchObject({again:true,combo});
  expect(k.purse().combos?.used.rescue.n).toBe(1);k.close();
 });
});
