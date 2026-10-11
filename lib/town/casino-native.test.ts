import {afterEach,expect,it,vi} from 'vitest';
import {Trial} from './trial';
import {CASINO_MACHINE_X,CASINO_SPAWN,casinoPath,casinoWalkable} from './casino-map';
import {CASINO_FURNITURE} from './casino-scenery';
import {casinoTestFrom} from './casino-test-access';
import type {SupabaseClient} from '@supabase/supabase-js';
import {TownSession} from './session';
import {defaultLook,encodeLook} from './look';
import {casinoMemoryKeeper} from './keeper-trial';
import {STOREBOX} from './world';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
it('a TEST warehouse cannot read or overwrite the persistent shared warehouse',async()=>{
  const storage={getItem:vi.fn(()=>{throw Error('real warehouse read');}),setItem:vi.fn(()=>{throw Error('real warehouse write');})};
  vi.stubGlobal('window',{localStorage:storage});vi.stubGlobal('localStorage',storage);
  const {keeper}=casinoMemoryKeeper('nine');
  keeper.trial.fished({...keeper.purse(),coins:20000,bag:[...Array(5).fill({item:'log',n:20}),...Array(5).fill(null)]});
  const at:[number,number]=[STOREBOX.x,STOREBOX.y+1];
  const made=await keeper.warehouse({action:'create',at});
  expect(made.ok).toBe(true);expect((await keeper.warehouse({action:'look'})).warehouses).toHaveLength(1);
  expect((await casinoMemoryKeeper('nine').keeper.warehouse({action:'look'})).warehouses).toHaveLength(0);
  expect(storage.getItem).not.toHaveBeenCalled();expect(storage.setItem).not.toHaveBeenCalled();
});
it('native TEST purse stays isolated from persistent game storage',()=>{
  const storage={getItem:vi.fn(()=>{throw Error('persistent game access');}),setItem:vi.fn(),removeItem:vi.fn()};
  vi.stubGlobal('window',{localStorage:storage});
  const a=new Trial('nine',{memoryOnly:true}),b=new Trial('aqua',{memoryOnly:true});
  a.casinoCoins(20000);b.casinoCoins(30000);
  expect(a.purse().coins).toBe(20000);expect(b.purse().coins).toBe(30000);
  expect(storage.getItem).not.toHaveBeenCalled();expect(storage.setItem).not.toHaveBeenCalled();
});
it('native TEST inventory mutations cannot alter another keeper or persistent storage',()=>{
  const storage={getItem:vi.fn(()=>{throw Error('real inventory read');}),setItem:vi.fn(()=>{throw Error('real inventory write');}),removeItem:vi.fn()};
  vi.stubGlobal('window',{localStorage:storage});
  const a=new Trial('nine',{memoryOnly:true}),b=new Trial('nine',{memoryOnly:true});
  a.casinoCoins(20000);b.casinoCoins(30000);
  const before=structuredClone(b.purse());
  a.drop(0);a.casinoCoins(10);
  expect(a.purse().coins).toBe(10);expect(b.purse()).toEqual(before);
  expect(storage.getItem).not.toHaveBeenCalled();expect(storage.setItem).not.toHaveBeenCalled();expect(storage.removeItem).not.toHaveBeenCalled();
});
it('TEST client cannot mutate profiles or access real purses and prize tables',()=>{
  const select=vi.fn(()=>({eq:vi.fn()})),from=vi.fn(()=>({select}));
  const real={from} as unknown as SupabaseClient;
  const profile=casinoTestFrom(real,'profiles');profile.select();
  expect(Object.keys(profile)).toEqual(['select']);expect(select).toHaveBeenCalledWith('character_name,display_name,discord_username');
  for(const table of ['town_purses','casino_live_settings','casino_live_receipts','casino_lab_accounts'])expect(()=>casinoTestFrom(real,table)).toThrow('unavailable in TEST');
  expect(from).toHaveBeenCalledTimes(1);
});
it('trying a TEST look changes the avatar without saving over its real look',()=>{
  vi.useFakeTimers();const storage={setItem:vi.fn()};vi.stubGlobal('localStorage',storage);
  const look=defaultLook('nine');
  const make=(ephemeral:boolean)=>Object.assign(Object.create(TownSession.prototype),{closed:false,options:{ephemeral},me:{id:'nine'},self:{info:{look:''}},lookTimer:null,notify:vi.fn()}) as TownSession;
  const trial=make(true);trial.setLook(look);
  expect(trial.self.info.look).toBe(encodeLook(look));expect(storage.setItem).not.toHaveBeenCalled();
  const real=make(false);real.setLook(look);expect(storage.setItem).toHaveBeenCalledWith('cashTown:look:nine',encodeLook(look));
  vi.clearAllTimers();
});
it('all visible furniture blocks the same cells used by native pathfinding',()=>{
  for(const item of CASINO_FURNITURE){
    for(let x=item.x;x<item.x+item.w;x++)for(let y=item.y;y<item.y+item.h;y++)expect(casinoWalkable({x:x+.5,y:y+.5})).toBe(false);
  }
});
it('all five seats are reachable through the native map collision grid',()=>{
  for(const x of CASINO_MACHINE_X){const path=casinoPath(CASINO_SPAWN,{x,y:3.5});expect(path.length).toBeGreaterThan(0);expect(path.every(casinoWalkable)).toBe(true);expect(path.at(-1)).toEqual({x,y:3.5});}
  expect(casinoPath(CASINO_SPAWN,{x:2.5,y:2.5})).toEqual([]);
});
