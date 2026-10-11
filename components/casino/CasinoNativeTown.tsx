"use client";
import dynamic from 'next/dynamic';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useMyFace} from '@/lib/avatars';
import {CASINO_SPAWN,casinoPath,casinoWalkable} from '@/lib/town/casino-map';
import type {TownMapAddon,TownMapControls} from '@/lib/town/map-addon';
import type {casinoMemoryKeeper} from '@/lib/town/keeper-trial';
import CasinoRoom from './CasinoRoom';
import {useCasino} from './useCasino';
import {TownEphemeral} from '@/lib/town/ephemeral';
import {TownMapBag} from '@/lib/town/map-bag';
import CasinoEventBag from './CasinoEventBag';
const Town=dynamic(()=>import('@/components/town/Town'),{ssr:false});
/** Uses the real Town session, inventory, wardrobe, chat, frame loop and HUD. */
export default function CasinoNativeTown(){
  const {state,live,error}=useCasino();
  const face=useMyFace(),camera=useRef<TownMapControls|null>(null);
  const [memory,setMemory]=useState<ReturnType<typeof casinoMemoryKeeper>|null>(null);
  const uid=state?.user_id;
  useEffect(()=>{if(!uid||live)return;let gone=false;void import('@/lib/town/keeper-trial').then(m=>{if(!gone)setMemory(m.casinoMemoryKeeper(uid));});return()=>{gone=true;};},[uid,live]);
  useEffect(()=>{if(memory&&state)memory.coins(state.account.coins);},[memory,state]);
  const addon=useMemo<TownMapAddon>(()=>({mode:live?'live':'test',keeper:live?undefined:memory?.keeper,terrain:{spawn:{...CASINO_SPAWN,x:uid==='6805ef04-9a57-408e-a982-e5ea471c8bfc'?7.5:CASINO_SPAWN.x},path:(from,to)=>casinoWalkable(to)?casinoPath(from,to):null},camera,render:runtime=><CasinoRoom native={runtime}/>}),[memory,live,uid]);
  if(!uid||!face.ready||(!live&&!memory))return <p role="status">{error||'กำลังเข้าห้อง Casino ใน Cash Town…'}</p>;
  return <TownEphemeral.Provider value={!live}><TownMapBag.Provider value={<CasinoEventBag/>}><Town me={{id:uid,name:face.name??'Admin',face:face.avatar,color:'#4fb8a8'}} testTopic={live?'casino-live':'casino-lab'} mapAddon={addon}/></TownMapBag.Provider></TownEphemeral.Provider>;
}
