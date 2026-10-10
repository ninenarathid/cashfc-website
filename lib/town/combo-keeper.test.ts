import { describe,expect,it } from "vitest";
import { DbKeeper } from "./keeper";
import { newPurse } from "./trade";

describe("optional equipment-bond RPC",()=>{
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
