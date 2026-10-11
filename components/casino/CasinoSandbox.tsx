"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { CASINO_TESTERS, casinoTrialLeader, newCasinoTrial, trialCommand, trialState, type CasinoTrial } from '@/lib/town/casino-trial';
import {casinoTestFrom} from '@/lib/town/casino-test-access';
type Reply = {data: unknown; error: {code:string;message:string}|null};
type Handler = {type:string;event:string;run:(payload:unknown)=>void};
type Peer = {id:string;name:string;look:string;x:number;y:number;seat:number|null};
const Context = createContext<SupabaseClient | null>(null);
const Mode = createContext(false);
export const useCasinoClient = () => useContext(Context);
export const useCasinoLive = () => useContext(Mode);

/** Persistent play uses server commands; it never accepts a client-generated result. */
export function CasinoLive({children}:{children:ReactNode}) {
  const [client]=useState(()=>{
    const real=createClient();if(!real)return null;
    return {
      from:real.from.bind(real),channel:real.channel.bind(real),removeChannel:real.removeChannel.bind(real),realtime:real.realtime,
      rpc:(name:string,args:Record<string,unknown>={})=>{
        const clean={...args};delete clean.player_name;
        return real.rpc(name.replace('casino_lab_','casino_live_'),clean);
      },
    } as unknown as SupabaseClient;
  });
  return <Mode.Provider value={true}><Context.Provider value={client}>{children}</Context.Provider></Mode.Provider>;
}

/** A private, volatile room. Auth/profile reads use Supabase; game RPCs below never do. */
class Sandbox {
  readonly client: SupabaseClient;
  private channel: RealtimeChannel | null = null;
  private members = new Map<string,string>();
  private readyMembers = new Set<string>();
  private hosts = new Set<string>();
  private host: string | undefined;
  private trackedHost: string | undefined;
  private peers = new Map<string,Peer>();
  private data: CasinoTrial | null = null;
  private subscribers = new Set<LocalChannel>();
  private pending = new Map<string,{resolve:(r:Reply)=>void;timer:ReturnType<typeof setTimeout>;reply?:Reply;version?:number}>();
  private chunks = new Map<string,{parts:string[];count:number;sender:string;at:number}>();
  private instance = crypto.randomUUID();
  private key: string;
  private connected = false;
  private initialized = false;
  private stopped = false;
  private offset = 0;
  private initializeTimer: ReturnType<typeof setTimeout> | undefined;
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
  constructor(private real: SupabaseClient, private uid: string) {
    this.key = `${uid}:${this.instance}`;
    this.client = {
      rpc:(name:string,args:Record<string,unknown>={})=>this.rpc(name,args),
      from:(table:string)=>casinoTestFrom(real,table),
      channel:(name:string)=>new LocalChannel(this,name),
      removeChannel:async(ch:LocalChannel)=>ch.close(),
      realtime:{setAuth:async()=>{}},
    } as unknown as SupabaseClient;
  }
  private leader() { return casinoTrialLeader(this.members.keys(),this.readyMembers,this.hosts); }
  private emit(type:string,event:string,payload:unknown={}) { for(const sub of this.subscribers)sub.emit(type,event,payload); }
  register(sub:LocalChannel) { this.subscribers.add(sub); if(this.connected&&this.initialized){sub.status('SUBSCRIBED');sub.emit('presence','sync',{});} }
  unregister(sub:LocalChannel) { this.subscribers.delete(sub); }
  presence() { return Object.fromEntries([...this.peers].filter(([id])=>this.members.has(id)).map(([id,p])=>[p.id,[p]])); }
  async track(peer:Peer) { this.peers.set(this.key,{...peer,id:this.uid});this.emit('presence','sync');await this.send('avatar',{peer:{...peer,id:this.uid}}); }
  async cheer(payload:unknown) { await this.send('cheer',{payload}); }
  private async send(kind:string,more:Record<string,unknown>) {
    if(!this.channel || !this.connected)return;
    await this.channel.send({type:'broadcast',event:'sandbox',payload:{kind,sender:this.key,...more}});
  }
  private async snapshot() {
    if(!this.data || this.leader()!==this.key || !this.connected)return;
    const doc=JSON.stringify({trial:this.data,now:Date.now()}), id=crypto.randomUUID(), count=Math.ceil(doc.length/24000);
    for(let index=0;index<count;index++)await this.send('snapshot',{id,index,count,part:doc.slice(index*24000,(index+1)*24000)});
  }
  private ready() { const first=!this.initialized;this.initialized=true;if(first||this.trackedHost!==this.host){this.trackedHost=this.host;void this.channel?.track({uid:this.uid,state:true,host:this.host});}for(const sub of this.subscribers)sub.status('SUBSCRIBED');this.emit('postgres_changes','*'); }
  private settleReplies(){for(const [id,w] of this.pending)if(w.reply&&this.data&&this.data.version>=(w.version??0)){clearTimeout(w.timer);this.pending.delete(id);w.resolve(w.reply);}}
  async open() {
    await this.real.realtime.setAuth(); if(this.stopped)return;
    const ch=this.real.channel('casino-lab',{config:{private:true,presence:{key:this.key},broadcast:{self:false,ack:true}}});this.channel=ch;
    ch.on('presence',{event:'sync'},()=>{
      const oldLeader=this.leader();this.members.clear();this.readyMembers.clear();this.hosts.clear();
      for(const [key,rows] of Object.entries(ch.presenceState())){
        const p=rows[rows.length-1] as unknown as {uid?:string;state?:boolean;host?:string};
        if(p?.uid && CASINO_TESTERS.includes(p.uid as typeof CASINO_TESTERS[number])&&key.startsWith(p.uid+':')){this.members.set(key,p.uid);if(p.state)this.readyMembers.add(key);if(typeof p.host==='string')this.hosts.add(p.host);}
      }
      this.emit('presence','sync');
      const own=this.peers.get(this.key);if(own)void this.send('avatar',{peer:own});
      if(this.leader()===this.key){
        if(this.data){this.host=this.key;this.ready();void this.snapshot();}
        else if(!this.initializeTimer)this.initializeTimer=setTimeout(()=>{
          this.initializeTimer=undefined;if(this.leader()===this.key&&!this.data){this.host=this.key;this.data=newCasinoTrial();this.ready();void this.snapshot();}
        },900);
      }else if(oldLeader!==this.leader()||!this.initialized)void this.send('hello',{});
    });
    ch.on('broadcast',{event:'sandbox'},({payload})=>this.receive(payload));
    ch.subscribe(status=>{
      if(this.stopped)return;
      this.connected=status==='SUBSCRIBED';
      if(this.connected){void ch.track({uid:this.uid});void this.send('hello',{});}
      else {this.initialized=false;for(const sub of this.subscribers)sub.status(status);}
    });
    this.heartbeatTimer=setInterval(()=>{if(!this.connected)return;if(this.data&&this.leader()===this.key)void this.send('heartbeat',{epoch:this.data.epoch,version:this.data.version});else if(!this.initialized)void this.send('hello',{});},3000);
  }
  private receive(p:Record<string,unknown>) {
    if(!p||typeof p.sender!=='string'||!this.members.has(p.sender))return;
    const kind=p.kind,sender=p.sender;
    if(kind==='heartbeat'&&sender===this.leader()){
      if(!this.data||this.data.epoch!==p.epoch||this.data.version!==p.version)void this.send('hello',{});return;
    }
    if(kind==='hello'){
      if(this.data && this.leader()===this.key)void this.snapshot();
      const own=this.peers.get(this.key);if(own)void this.send('avatar',{peer:own});return;
    }
    if(kind==='avatar'){
      const peer=p.peer as Peer;if(!peer||peer.id!==this.members.get(sender)||typeof peer.name!=='string'||typeof peer.look!=='string'||!Number.isFinite(peer.x)||!Number.isFinite(peer.y))return;
      this.peers.set(sender,{...peer,name:peer.name.slice(0,40),look:peer.look.slice(0,12)});this.emit('presence','sync');return;
    }
    if(kind==='cheer'){this.emit('broadcast','cheer',{payload:p.payload});return;}
    if(kind==='command'&&this.leader()===this.key&&this.data&&this.initialized){
      const uid=this.members.get(sender)!;
      if(typeof p.id!=='string'||typeof p.name!=='string'||!p.args||typeof p.args!=='object')return;
      const reply=this.apply(uid,p.name,p.args as Record<string,unknown>);
      void this.send('reply',{id:p.id,reply,version:this.data.version});return;
    }
    if(kind==='reply'&&sender===this.leader()&&typeof p.id==='string'){
      const waiting=this.pending.get(p.id);if(waiting){waiting.reply=p.reply as Reply;waiting.version=Number(p.version);this.settleReplies();}return;
    }
    if(kind==='snapshot'&&sender===this.leader()&&typeof p.id==='string'&&typeof p.part==='string'&&p.part.length<=24000&&
      Number.isInteger(p.index)&&Number.isInteger(p.count)&&Number(p.count)>0&&Number(p.count)<=512&&Number(p.index)>=0&&Number(p.index)<Number(p.count)){
      for(const [id,c] of this.chunks)if(Date.now()-c.at>15000)this.chunks.delete(id);
      let c=this.chunks.get(p.id);if(!c){if(this.chunks.size>=8)return;c={parts:[],count:Number(p.count),sender,at:Date.now()};this.chunks.set(p.id,c);}
      if(c.count!==p.count||c.sender!==sender)return;c.parts[Number(p.index)]=p.part;
      if(c.parts.filter(x=>typeof x==='string').length!==c.count)return;
      this.chunks.delete(p.id);
      try{
        const next=JSON.parse(c.parts.join('')) as {trial:CasinoTrial;now:number};
        if(!next.trial || !Number.isFinite(next.trial.version)||typeof next.trial.epoch!=='string')return;
        if(this.data&&this.data.epoch===next.trial.epoch&&this.data.version>next.trial.version)return;
        this.host=sender;this.data=next.trial;this.offset=next.now-Date.now();this.ready();this.settleReplies();
      }catch{/* incomplete or invalid room snapshot */}
    }
  }
  private apply(uid:string,name:string,args:Record<string,unknown>): Reply {
    try{const next=trialCommand(this.data!,uid,name,args,Date.now());this.data=next.trial;this.emit('postgres_changes','*');void this.snapshot();return {data:next.data,error:null};}
    catch(e){return {data:null,error:{code:'TRIAL',message:e instanceof Error?e.message:String(e)}};}
  }
  private async rpc(name:string,args:Record<string,unknown>): Promise<Reply> {
    if(!this.connected||!this.initialized||!this.data)return {data:null,error:{code:'TRIAL',message:'กำลังเชื่อมต่อห้องทดลอง รอสักครู่แล้วลองใหม่'}};
    if(name==='casino_lab_state')return {data:trialState(this.data,this.uid,Number(args.p_receipt_page??0),args.p_history===true,Date.now()+this.offset),error:null};
    if(this.leader()===this.key)return this.apply(this.uid,name,args);
    const id=crypto.randomUUID();
    return new Promise(resolve=>{
      const timer=setTimeout(()=>{this.pending.delete(id);resolve({data:null,error:{code:'',message:'Failed to fetch room result'}});},12000);
      this.pending.set(id,{resolve,timer});void this.send('command',{id,name,args});
    });
  }
  close() {
    this.stopped=true;this.connected=false;clearTimeout(this.initializeTimer);clearInterval(this.heartbeatTimer);
    for(const w of this.pending.values()){clearTimeout(w.timer);w.resolve({data:null,error:{code:'',message:'Failed to fetch room result'}});}this.pending.clear();
    if(this.channel)void this.real.removeChannel(this.channel);
  }
}
class LocalChannel {
  state='closed';private handlers:Handler[]=[];private callback:((s:string)=>void)|undefined;
  constructor(private room:Sandbox,private name:string){}
  on(type:string,filter:{event:string},run:(payload:unknown)=>void){this.handlers.push({type,event:filter.event,run});return this;}
  subscribe(callback:(s:string)=>void){this.callback=callback;this.state='joined';this.room.register(this);return this;}
  status(status:string){this.callback?.(status);}
  emit(type:string,event:string,payload:unknown){if(this.name.startsWith('casino-state:')&&type!=='postgres_changes')return;if(this.name==='casino-lab'&&type==='postgres_changes')return;
    for(const h of this.handlers)if(h.type===type&&(h.event==='*'||h.event===event||event==='*'))h.run(payload);}
  presenceState(){return this.room.presence();}
  track(peer:Peer){return this.room.track(peer);}
  send(data:{payload:unknown}){return this.room.cheer(data.payload);}
  close(){this.room.unregister(this);this.state='closed';}
}
export default function CasinoSandbox({children}:{children:ReactNode}) {
  const [client,setClient]=useState<SupabaseClient|null>(null),[error,setError]=useState('');
  useEffect(()=>{
    const real=createClient();if(!real)return;let room:Sandbox|undefined,gone=false;
    void real.auth.getUser().then(async({data})=>{
      if(gone||!data.user)return;
      room=new Sandbox(real,data.user.id);setClient(room.client);try{await room.open();}catch{if(!gone)setError('เปิดห้อง Realtime ทดลองไม่สำเร็จ');}
    });return()=>{gone=true;room?.close();};
  },[]);
  if(error)return <p role="alert">{error}</p>;
  if(!client)return <p className="py-12">กำลังเข้าห้อง Cash Town TEST…</p>;
  return <Context.Provider value={client}>{children}</Context.Provider>;
}
