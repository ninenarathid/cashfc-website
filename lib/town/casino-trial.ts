import { draftProblem, SYMBOLS, type CasinoDraft, type CasinoReceipt, type CasinoSpin, type CasinoState, type PrizeSnapshot } from '@/lib/casino';
export const CASINO_TESTERS = ['9c0e6904-df00-452d-b005-dac3fa6cd1d7', '6805ef04-9a57-408e-a982-e5ea471c8bfc'] as const;
/** All peers elect the same host; a newcomer needs a replica before it can lead an existing room. */
export function casinoTrialLeader(members:Iterable<string>,ready:Iterable<string>,hosts:Iterable<string>=[]){const present=[...members],established=[...hosts].filter(h=>present.includes(h));if(established.length)return established.sort()[0];const candidates=[...ready];return (candidates.length?candidates:present).sort()[0];}
type Account = { coins: number; spins: number; available: number };
export type CasinoTrial = { epoch: string; version: number; settings: CasinoState['settings']; prizes: CasinoState['prizes']; accounts: Record<string, Account>; spins: CasinoSpin[]; receipts: CasinoReceipt[]; audit: Array<{at:number;user:string;action:string}> };
export function newCasinoTrial(now = Date.now()): CasinoTrial {
  return { epoch: crypto.randomUUID(), version: 0,
    settings: { id:1,revision:1,title:'Halloween rehearsal',open:true,mode:'weighted',price:100,per_player:100,budget:100000000,reserved:0,spins:0,pool_size:1800,pool_draws:0,starts_at:null,ends_at:null,updated_at:new Date(now).toISOString(),updated_by:null },
    prizes: [
      {id:'seven',name:'ทองคำ 96.5% 0.1 กรัม',kind:'physical',amount:0,chance:.02,stock:1,issued:0,announce:true,active:true},
      {id:'cherry',name:'FFXIV key chain',kind:'physical',amount:0,chance:.04,stock:2,issued:0,announce:true,active:true},
      {id:'gold',name:'1,000,000 Gil',kind:'gil',amount:1000000,chance:.4,stock:20,issued:0,announce:false,active:true},
      {id:'popoto',name:'250,000 Gil',kind:'gil',amount:250000,chance:6.4,stock:320,issued:0,announce:false,active:true},
    ], accounts:{},spins:[],receipts:[],audit:[] };
}
export function trialState(t: CasinoTrial, user: string, page=0, history=false, now=Date.now()): CasinoState {
  if (!CASINO_TESTERS.includes(user as typeof CASINO_TESTERS[number])) throw Error('ไม่มีสิทธิ์เข้าห้องทดลอง');
  return structuredClone({ room_epoch:t.epoch,user_id:user,settings:t.settings,prizes:t.prizes,account:t.accounts[user]??{coins:20000,spins:0},
    spins:t.spins.slice(-30).reverse(), receipts:t.receipts.filter(r=>r.user_id===user && (history ? ['fulfilled','cancelled'] : ['pending','processing']).includes(r.status)).reverse().slice(page*20,page*20+21),
    queue:t.receipts.filter(r=>['pending','processing'].includes(r.status)).slice(0,100), server_now:new Date(now).toISOString(),
    paid_gil:t.receipts.reduce((n,r)=>n+(r.status==='fulfilled' && r.prize.kind==='gil'?r.prize.amount:0),0), });
}
/** One elected room host applies commands serially; replicas only display snapshots. Nothing is written to a database. */
export function trialCommand(original: CasinoTrial,user:string,name:string,args:Record<string,unknown>,now=Date.now(),random=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296): { trial:CasinoTrial; data:unknown } {
  trialState(original,user);
  const t=structuredClone(original), s=t.settings, a=t.accounts[user]??={coins:20000,spins:0,available:0};
  let data:unknown;
  if(name==='casino_lab_spin') {
    const id=args.p_request as string, machine=Number(args.p_machine), force=args.p_force as string|null;
    if(typeof id!=='string'|| !/^[0-9a-f-]{36}$/i.test(id)||!Number.isInteger(machine)||machine<1||machine>5||force && !['miss',...SYMBOLS].includes(force))throw Error('ข้อมูลการหมุนไม่ถูกต้อง');
    const old=t.spins.find(x=>x.id===id);
    if(old){if(old.user_id!==user)throw Error('รอบนี้เป็นของอีกผู้เล่น');return {trial:original,data:structuredClone(old)};}
    if(Number(args.p_revision)!==s.revision)throw Error('ตั้งค่าเปลี่ยนแล้ว กรุณาอ่านค่าใหม่ก่อนหมุน');
    if(!s.open || s.starts_at && now<Date.parse(s.starts_at) || s.ends_at && now>=Date.parse(s.ends_at))throw Error('Casino พักอยู่หรือยังไม่ถึงเวลากิจกรรม');
    if(t.spins.some(x=>x.machine===machine&&Date.parse(x.reveal_at)>now))throw Error('มีคนกำลังใช้เครื่องนี้');
    if(a.available>now)throw Error('รอให้รอบของคุณจบก่อน');
    if(a.spins>=s.per_player)throw Error('ใช้สิทธิ์หมุนครบแล้ว');if(a.coins<s.price)throw Error('Coin ทดลองไม่พอ');
    let won:typeof t.prizes[number]|undefined;
    if(s.mode==='pool') {
      if(force)throw Error('กำหนดผลได้เฉพาะโหมดสุ่ม %');
      const left=s.pool_size-s.pool_draws;if(left<=0)throw Error('กองรางวัลหมดแล้ว');
      let n=Math.floor(random()*left);for(const p of t.prizes.filter(p=>p.active)){n-=p.stock-p.issued;if(n<0){won=p;break;}}
    }else{
      let n=random()*100;for(const p of t.prizes.filter(p=>p.active&&p.issued<p.stock&&(p.kind!=='gil'||p.amount<=s.budget-s.reserved))){n-=p.chance;if(n<0){won=p;break;}}
    }
    if(force)won=force==='miss'?undefined:t.prizes.find(p=>p.id===force&&p.active);
    if(won && won.issued>=won.stock)throw Error('รางวัลนี้หมดแล้ว');if(won?.kind==='gil'&&won.amount>s.budget-s.reserved)throw Error('งบ Gil ที่เหลือไม่พอ');
    const prize:PrizeSnapshot|null=won?{id:won.id,name:won.name,kind:won.kind,amount:won.amount,announce:won.announce,test:true}:null;
    const reels=won?Array(4).fill(won.id):Array.from({length:4},()=>SYMBOLS[Math.floor(random()*4)]);
    if(!won && new Set(reels).size===1)reels[3]=SYMBOLS[(SYMBOLS.indexOf(reels[0])+1)%4];
    const spin:CasinoSpin={id,user_id:user,player_name:typeof args.player_name==='string'?args.player_name.slice(0,40):user===CASINO_TESTERS[0]?'Nine':'Aqua',machine,revision:s.revision,price:s.price,reels,prize,forced:!!force,created_at:new Date(now).toISOString(),reveal_at:new Date(now+3600).toISOString()};
    a.coins-=s.price;a.spins++;a.available=now+3600;s.spins++;if(s.mode==='pool')s.pool_draws++;
    if(won){won.issued++;if(won.kind==='gil')s.reserved+=won.amount;else if(won.kind==='coin')a.coins+=won.amount;}
    t.spins.push(spin);
    if(prize&&prize.kind!=='coin')t.receipts.push({id:crypto.randomUUID(),spin_id:id,user_id:user,player_name:spin.player_name,prize,status:'pending',created_at:spin.created_at,requested_at:null,handled_by:null,fulfilled_at:null,note:''});
    data=spin;
  }else if(name==='casino_lab_save'){
    if(Number(args.p_revision)!==s.revision)throw Error('อีกบัญชีเปลี่ยนค่าแล้ว โหลดค่าปัจจุบันก่อนบันทึก');
    const d=structuredClone(args.p_doc) as CasinoDraft;
    if(!d || !['pool','weighted'].includes(d.mode) || typeof d.open!=='boolean'||!Array.isArray(d.prizes)||d.prizes.length!==4||new Set(d.prizes.map(p=>p.id)).size!==4)throw Error('ตั้งค่าไม่ครบ');
    for(const p of d.prizes){const current=t.prizes.find(x=>x.id===p.id);if(!current||!['gil','coin','physical'].includes(p.kind)||typeof p.active!=='boolean'||typeof p.announce!=='boolean')throw Error('รางวัลไม่ถูกต้อง');p.issued=current.issued;p.chance=Math.round(Number(p.chance)*1e6)/1e6;}
    const issue=draftProblem(d,s);if(issue)throw Error(issue);
    if([d.starts_at,d.ends_at].some(v=>v!==null&&!Number.isFinite(Date.parse(v))))throw Error('เวลาไม่ถูกต้อง');
    const {prizes,...values}=d;Object.assign(s,values,{revision:s.revision+1,updated_at:new Date(now).toISOString(),updated_by:user});t.prizes=prizes;data=trialState(t,user,0,false,now);
  }else if(name==='casino_lab_credit'){
    if(a.available>now)throw Error('รอให้รอบปัจจุบันจบก่อน');
    a.coins=args.p_reset?20000:Math.min(a.coins+20000,1e12);if(args.p_reset)a.spins=0;data=trialState(t,user,0,false,now);
  }else if(name==='casino_lab_receipt'){
    const r=t.receipts.find(r=>r.id===args.p_id),action=args.p_action,note=String(args.p_note??'');if(!r)throw Error('ไม่พบสิทธิ์รับรางวัล');if(note.length>1000)throw Error('บันทึกยาวเกินไป');
    if(action==='request'){if(r.user_id!==user)throw Error('สิทธิ์นี้เป็นของอีกผู้เล่น');if(r.status==='pending')r.requested_at??=new Date(now).toISOString();}
    else if(action==='take'){if(r.status==='processing'&&r.handled_by===user)return {trial:original,data:r};if(r.status!=='pending')throw Error('มีแอดมินรับรายการแล้ว');r.status='processing';r.handled_by=user;}
    else if(action==='fulfill'){if(r.status==='fulfilled'&&r.handled_by===user)return {trial:original,data:r};if(r.status!=='processing'||r.handled_by!==user)throw Error('อีกแอดมินกำลังดูแลสิทธิ์นี้');r.status='fulfilled';r.fulfilled_at=new Date(now).toISOString();r.note=note;}
    else if(action==='release'||action==='cancel'){if(r.status!=='processing'||r.handled_by!==user||!note.trim())throw Error('รับรายการและกรอกเหตุผลก่อน');r.status=action==='release'?'pending':'cancelled';if(action==='release')r.handled_by=null;r.note=note;}
    else throw Error('คำสั่งไม่ถูกต้อง');data=r;
  }else throw Error('คำสั่งไม่ถูกต้อง');
  t.version++;t.audit.push({at:now,user,action:name});return {trial:t,data:structuredClone(data)};
}
